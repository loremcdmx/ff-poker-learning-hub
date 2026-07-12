// Adapter: authoritative server hand/room view -> engine `Table` shape.
//
// The simulator's renderer is Hero-centric: seat array index 0 is the viewer
// ("hero"), drawn at the bottom, others clockwise. Each multiplayer viewer is
// the hero of their OWN view, so this adapter rotates the server seats so the
// viewer lands at index 0 and remaps engine seat ids to 0..n-1 (hero = 0),
// matching every convention the render pipeline assumes.
//
// Card secrecy is preserved upstream: serializeHandForViewer only ever gives a
// viewer their own hole cards (and revealed cards at showdown). Hidden
// opponents get two placeholder cards during live hands with revealed=false so
// the renderer draws card backs (the codes are never shown). Completed fold-win
// hands have no reveal, so hidden placeholders are mucked instead of looking
// like exposed 2/3 cards. The output is a plain engine `Table` the existing
// renderer can draw as-is — see simulator-engine.d.ts:Table.

(function (root) {
  // Position labels clockwise starting AT the button. Cosmetic — the dealer
  // button and SB/BB chips come from seat.dealer / seat.blind flags below.
  const POSITIONS_FROM_BUTTON = {
    2: ["SB", "BB"], // heads-up: the button posts the SB
    3: ["BTN", "SB", "BB"],
    4: ["BTN", "SB", "BB", "CO"],
    5: ["BTN", "SB", "BB", "UTG", "CO"],
    6: ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
    7: ["BTN", "SB", "BB", "UTG", "MP", "HJ", "CO"],
    8: ["BTN", "SB", "BB", "UTG", "UTG1", "MP", "HJ", "CO"],
    9: ["BTN", "SB", "BB", "UTG", "UTG1", "MP", "LJ", "HJ", "CO"]
  };
  const HIDDEN_CARDS = ["2c", "3d"]; // placeholders; rendered as backs (revealed=false)

  function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function positionsByOrigSeat(sortedSeats, buttonSeatIndex) {
    const n = sortedSeats.length;
    const names = POSITIONS_FROM_BUTTON[n] || POSITIONS_FROM_BUTTON[Math.min(9, Math.max(2, n))];
    const buttonPos = Math.max(0, sortedSeats.findIndex((seat) => seat.seatIndex === buttonSeatIndex));
    const map = {};
    for (let offset = 0; offset < n; offset += 1) {
      const seat = sortedSeats[(buttonPos + offset) % n];
      map[seat.seatIndex] = names[offset] || "";
    }
    return map;
  }

  function emptyTableShell(tableId) {
    return {
      id: tableId,
      handNo: 0,
      deck: [],
      board: [],
      heroHand: [],
      combo: "",
      street: "preflop",
      status: "playing",
      stackDepth: 0,
      simulationMode: "random",
      playerCount: 0,
      seatSlotCount: 0,
      positions: [],
      seatPositions: [],
      heroPosition: "BTN",
      spot: { title: "", prompt: "", heroPosition: "BTN", villainPosition: "" },
      activeVillain: -1,
      currentBet: 0,
      lastRaiseSize: 0,
      minRaiseTo: 0,
      pot: 0,
      toCall: 0,
      canCheck: false,
      heroTurn: false,
      busy: false,
      result: "",
      resultKind: "live",
      lastAction: "",
      contestingSeatIds: [],
      contributions: {},
      handContributions: {},
      seatBets: {},
      betAnimations: [],
      actionAnimations: [],
      animationSeq: 0,
      actionSeq: 0,
      timelineSeq: 0,
      actionTimeline: [],
      seatActions: {},
      seats: [],
      winningCards: [],
      allInRunout: null,
      showdown: null,
      potAwards: []
    };
  }

  function serverSeatCounts(room, fallbackCount) {
    const seats = Array.isArray(room?.seats) ? room.seats : [];
    const occupied = seats.filter((seat) => seat.occupied || seat.playerId || seat.isYou).length;
    const maxSeats = Math.max(
      Number(room?.maxSeats) || 0,
      Number(room?.settings?.maxSeats) || 0,
      seats.length,
      Number(fallbackCount || 0)
    );
    return { occupied, maxSeats };
  }

  function applyServerMeta(table, room, hand) {
    const counts = serverSeatCounts(room, table?.playerCount || table?.seatSlotCount || 0);
    const actionRemainingMs = Number(hand?.actionRemainingMs);
    const actionTimeoutMs = Number(hand?.actionTimeoutMs);
    const botFill = room?.settings?.botFill !== false;
    table.serverMode = true;
    table.serverRoomId = room?.id || "";
    table.serverRoomName = room?.name || "";
    table.serverRoomStatus = room?.status || (hand ? "playing" : "lobby");
    table.serverHandStatus = hand?.status || "";
    table.serverOccupiedCount = counts.occupied || table.playerCount || 0;
    table.serverMaxSeats = counts.maxSeats || table.seatSlotCount || table.playerCount || 0;
    table.smallBlind = round2(hand?.smallBlind ?? room?.settings?.smallBlind ?? 0.5);
    table.bigBlind = round2(hand?.bigBlind ?? room?.settings?.bigBlind ?? 1);
    table.serverActionRemainingMs = Number.isFinite(actionRemainingMs) ? Math.max(0, actionRemainingMs) : 0;
    table.serverActionTimeoutMs = Number.isFinite(actionTimeoutMs) ? Math.max(0, actionTimeoutMs) : 25000;
    table.serverActionClockAnchorMs = Date.now();
    table.serverActionToAct = Boolean(hand?.youToAct);
    table.serverBotFill = botFill;
    table.serverCanStart = !hand && table.serverOccupiedCount >= 1 && (
      table.serverOccupiedCount >= 2
      || (botFill && table.serverMaxSeats > table.serverOccupiedCount)
    );
    return table;
  }

  function cardsForSeat(seat, complete) {
    if (Array.isArray(seat.hole) && seat.hole.length) return seat.hole.slice(); // own cards or showdown reveal
    if (seat.folded) return [];
    if (complete) return [];
    if (seat.hasCards) return HIDDEN_CARDS.slice(); // drawn as backs (revealed=false)
    return [];
  }

  function cleanCards(value, max = 5) {
    return Array.isArray(value) ? value.filter(Boolean).slice(0, max).map(String) : [];
  }

  function potWinnerParticipant(participants, seatId) {
    return participants.find((participant) => Number(participant.seatId) === Number(seatId)) || null;
  }

  function mapServerPotAwardLedger(potAwards, participants, newIdByOrig) {
    return (Array.isArray(potAwards) ? potAwards : []).map((pot, index) => {
      const winners = (Array.isArray(pot?.winners) ? pot.winners : [])
        .map((winner) => {
          const seatId = newIdByOrig[Number(winner?.seatIndex)];
          if (seatId === undefined) return null;
          const participant = potWinnerParticipant(participants, seatId);
          return {
            seatId,
            position: participant?.position || "",
            name: participant?.name || `Seat ${Number(seatId) + 1}`,
            isHero: Boolean(participant?.isHero),
            amount: round2(winner?.amount)
          };
        })
        .filter((winner) => winner && winner.amount > 0);
      return {
        potIndex: Number(pot?.potIndex ?? index),
        kind: String(pot?.kind || (index === 0 ? "main" : "side")),
        amount: round2(pot?.amount),
        eligible: (Array.isArray(pot?.eligible) ? pot.eligible : [])
          .map((seatIndex) => newIdByOrig[Number(seatIndex)])
          .filter((seatId) => seatId !== undefined),
        winners
      };
    }).filter((pot) => pot.amount > 0 && pot.winners.length);
  }

  function aggregatePotWinnersFromLedger(potAwardLedger, fallbackAwards, participants) {
    if (!Array.isArray(potAwardLedger) || !potAwardLedger.length) {
      return (Array.isArray(fallbackAwards) ? fallbackAwards : [])
        .map((award) => {
          const participant = potWinnerParticipant(participants, award.seatId);
          return participant
            ? { seatId: participant.seatId, position: participant.position, name: participant.name, isHero: participant.isHero, amount: round2(award.amount) }
            : null;
        })
        .filter(Boolean);
    }
    const bySeat = new Map();
    for (const pot of potAwardLedger) {
      for (const winner of pot.winners || []) {
        const prev = bySeat.get(Number(winner.seatId));
        if (prev) prev.amount = round2(prev.amount + Number(winner.amount || 0));
        else bySeat.set(Number(winner.seatId), { ...winner, amount: round2(winner.amount) });
      }
    }
    return [...bySeat.values()]
      .filter((winner) => winner.amount > 0)
      .sort((left, right) => Number(right.amount || 0) - Number(left.amount || 0));
  }

  // Build an engine Table from the authoritative hand view, rotated so the
  // viewer is hero (seat index 0).
  function handToTable(room, hand, viewerId, tableId, prevHand) {
    const sorted = hand.seats.slice().sort((a, b) => a.seatIndex - b.seatIndex);
    const n = sorted.length;
    // A spectator / not-yet-seated viewer has NO seat with isYou. findIndex then
    // returns -1; clamping it to 0 used to make seat 0 the "hero" and surfaced
    // its HIDDEN_CARDS placeholders as the viewer's hole cards. Track that case
    // so we render an observer (no hero seat, no hero hand) instead.
    const heroSeatPos = sorted.findIndex((seat) => seat.isYou);
    const hasHero = heroSeatPos >= 0;
    const heroPos = hasHero ? heroSeatPos : 0;
    const ordered = sorted.map((_, i) => sorted[(heroPos + i) % n]);
    const posByOrig = positionsByOrigSeat(sorted, hand.buttonSeatIndex);
    const newIdByOrig = {};
    ordered.forEach((seat, i) => { newIdByOrig[seat.seatIndex] = i; });

    const complete = hand.status === "complete";
    const heroView = sorted.find((seat) => seat.isYou) || null;
    const table = emptyTableShell(tableId);

    table.handNo = hand.handNo || 1;
    table.board = (hand.board || []).slice();
    table.street = hand.street || "preflop";
    table.status = complete ? "showdown" : "playing";
    table.pot = round2(hand.pot);
    table.currentBet = round2(hand.currentBet);
    table.playerCount = n;
    table.seatSlotCount = n;
    table.heroTurn = Boolean(hand.youToAct);
    table.busy = !hand.youToAct && hand.status === "betting";
    table.toCall = heroView ? round2(Math.max(0, (hand.currentBet || 0) - (heroView.committedStreet || 0))) : 0;
    table.canCheck = table.toCall <= 0;
    // Min legal raise-to: prefer the server's authoritative legal floor (only
    // present when it is the viewer's turn). It accounts for the LAST RAISE SIZE
    // (hand.minRaise), so after a 3-bet / postflop reraise it is correctly above
    // currentBet+bigBlind. Fall back to hand.minRaise if exposed, then to
    // currentBet+bigBlind only when the server gave no floor (not the viewer's
    // turn, or an older view). Guessing currentBet+bigBlind seeded the slider
    // below the server minimum -> applyAction rejected the raise as too small.
    table.minRaiseTo = hand.legal && Number.isFinite(hand.legal.minRaiseTo)
      ? round2(hand.legal.minRaiseTo)
      : Number.isFinite(hand.minRaise)
        ? round2((hand.currentBet || 0) + hand.minRaise)
        : round2((hand.currentBet || 0) + (hand.bigBlind || 1));
    table.activeVillain = hand.toActSeatIndex >= 0 && newIdByOrig[hand.toActSeatIndex] !== undefined && !hand.seats.find((s) => s.seatIndex === hand.toActSeatIndex)?.isYou
      ? newIdByOrig[hand.toActSeatIndex]
      : -1;

    table.seats = ordered.map((seat, i) => {
      // A bot fills an empty MP chair (server playerId "bot:N", surfaced as
      // seat.isBot). The server owns its profile, so bot tier coloring comes
      // from the authoritative seat.botProfile instead of a local guess.
      // Hero + real humans keep botProfile null and stay uncolored.
      const seatIsBot = Boolean(seat.isBot) && !seat.isYou;
      const serverBotProfile = seat.botProfile && typeof seat.botProfile === "object"
        ? seat.botProfile
        : { difficulty: "standard" };
      return {
        id: i,
        roomSeatIndex: seat.seatIndex,
        name: seat.playerName || "Игрок",
        position: posByOrig[seat.seatIndex] || "",
        stack: round2(seat.stack),
        cards: cardsForSeat(seat, complete),
        isHero: Boolean(seat.isYou),
        isHuman: !seatIsBot,
        isBot: seatIsBot,
        folded: Boolean(seat.folded),
        // A REAL street name (not the literal "fold"): streetRank("fold") fell to 0
        // (preflop), so seatFoldedBeforeCurrentStreet dimmed a flop/turn/river
        // folder one street early. Use the server's foldedStreet; if absent (older
        // view), use the CURRENT hand street so the seat is NOT treated as folded
        // before its own street.
        foldedAt: seat.folded ? (seat.foldedStreet || hand.street || "preflop") : "",
        revealed: Boolean(seat.isYou) || (complete && Array.isArray(seat.hole) && seat.hole.length && !seat.folded),
        dealer: seat.seatIndex === hand.buttonSeatIndex,
        blind: seat.seatIndex === hand.smallBlindSeatIndex ? "SB"
          : seat.seatIndex === hand.bigBlindSeatIndex ? "BB" : "",
        allIn: Boolean(seat.allIn),
        botProfile: seatIsBot ? serverBotProfile : null,
        lobbyState: "active"
      };
    });

    ordered.forEach((seat, i) => {
      table.seatBets[i] = round2(seat.committedStreet);
      table.contributions[i] = round2(seat.committedStreet);
      table.handContributions[i] = round2(seat.committedTotal);
    });
    // CONTRACT (structural-hardening plan C13): the MP path DELIBERATELY does NOT
    // write visualActionBaseState / visualActionConfirmedState. The single-table
    // engine snapshots those once per action-sequence so fold-dimming reads a
    // frozen base; here the adapter instead REBUILDS the fold-visual inputs
    // (seat.folded / foldedAt above + contestingSeatIds below) from the server
    // view on EVERY poll. The authoritative server view is the source of truth
    // each poll, so a frozen base would go stale between polls — the rebuild is
    // intended, not a missing snapshot. Audit C13 confirmed the mechanism and
    // found harm unproven; the design is PINNED. Do not add
    // visualActionBaseState here to "match" single-table without re-opening C13.
    // See docs/simulator-structural-hardening-plan-2026-07.md (C13).
    table.contestingSeatIds = ordered.map((seat, i) => (seat.folded ? null : i)).filter((id) => id !== null);

    // Synthesize action/bet animations from the delta vs the previous view so
    // the existing renderer plays action bubbles + chip flights (the controller
    // then calls primeActionReveal). Only same-hand, same-street deltas — beats
    // from a prior street already animated in their own view.
    if (prevHand && prevHand.handNo === hand.handNo && prevHand.street === hand.street && !complete) {
      const prevBySeat = new Map((prevHand.seats || []).map((seat) => [seat.seatIndex, seat]));
      let seq = 0;
      for (const seat of ordered) {
        const prev = prevBySeat.get(seat.seatIndex);
        if (!prev) continue;
        const newId = newIdByOrig[seat.seatIndex];
        const actionSeq = seq;
        const actionKey = `${hand.handNo}-a-${newId}-${actionSeq}`;
        let label = "";
        let tone = "passive";
        if (seat.folded && !prev.folded) {
          label = "Фолд";
          tone = "fold";
        } else {
          const delta = round2((seat.committedStreet || 0) - (prev.committedStreet || 0));
          if (delta > 0.001) {
            const raised = (hand.currentBet || 0) > (prevHand.currentBet || 0) + 0.001;
            if (seat.allIn) { label = "Олл-ин"; tone = "aggressive"; }
            else if (raised) { label = (prevHand.currentBet || 0) > 0.001 ? "Рейз" : "Бет"; tone = "aggressive"; }
            else { label = "Колл"; tone = "passive"; }
            table.betAnimations.push({
              key: `${hand.handNo}-b-${newId}-${actionSeq}`,
              seatId: newId,
              amount: delta,
              contribution: round2(seat.committedStreet),
              street: hand.street,
              boardLength: table.board.length,
              actionSeq,
              actionKey
            });
          } else if (prev.seatIndex === prevHand.toActSeatIndex && hand.toActSeatIndex !== seat.seatIndex && !seat.folded) {
            label = "Чек";
            tone = "passive";
          }
        }
        if (label) {
          table.actionAnimations.push({ key: actionKey, seatId: newId, label, tone, street: hand.street, boardLength: table.board.length, seq: actionSeq, isHeroAction: newId === 0 });
          table.seatActions[newId] = { label, tone, seq: actionSeq };
          seq += 1;
        }
      }
    } else if (prevHand && prevHand.handNo === hand.handNo && prevHand.street !== hand.street && !complete && prevHand.toActSeatIndex >= 0) {
      // The action that CLOSES a betting street is applied ATOMICALLY with the
      // street advance on the server (committedStreet reset to 0, hand.street
      // bumped), so the very next viewer delta already shows the new street and
      // the same-street block above is skipped — the closing actor's chips
      // teleport into the pot with no flight and no "Колл"/"Чек" bubble while the
      // board grows. Synthesize that single closing action from the previous view
      // and tag it to the street/board that just closed so it plays BEFORE the
      // new card appears. (C4)
      const prevBySeat = new Map((prevHand.seats || []).map((seat) => [seat.seatIndex, seat]));
      const closingOrig = prevHand.toActSeatIndex;
      const newId = newIdByOrig[closingOrig];
      const prevClosing = prevBySeat.get(closingOrig);
      if (newId !== undefined && prevClosing && !prevClosing.folded) {
        const callAmount = round2((prevHand.currentBet || 0) - (prevClosing.committedStreet || 0));
        const closeLabel = callAmount > 0.001 ? "Колл" : "Чек";
        const closeActionKey = `${hand.handNo}-a-${newId}-close`;
        const closeBoardLength = (prevHand.board || []).length;
        if (callAmount > 0.001) {
          table.betAnimations.push({
            key: `${hand.handNo}-b-${newId}-close`,
            seatId: newId,
            amount: callAmount,
            contribution: round2(prevHand.currentBet),
            street: prevHand.street,
            boardLength: closeBoardLength,
            actionSeq: 0,
            actionKey: closeActionKey
          });
        }
        table.actionAnimations.push({ key: closeActionKey, seatId: newId, label: closeLabel, tone: "passive", street: prevHand.street, boardLength: closeBoardLength, seq: 0, isHeroAction: newId === 0 });
        table.seatActions[newId] = { label: closeLabel, tone: "passive", seq: 0 };
      }
    }

    // Only the genuine viewer seat (isYou) is the hero. For a spectator there is
    // no hero seat, so heroHand/heroPosition/stackDepth must NOT be borrowed from
    // seat 0 (an arbitrary opponent) — that surfaced seat 0's placeholder backs
    // as the spectator's own hole cards. Leave them empty/neutral for observers.
    const hero = hasHero ? table.seats[0] : null;
    table.heroHand = hero ? hero.cards.slice() : [];
    table.heroPosition = hero ? hero.position : "BTN";
    table.stackDepth = hero ? hero.stack : 0;
    table.positions = table.seats.map((seat) => seat.position);
    table.seatPositions = table.positions.slice();
    table.spot = { title: room?.name || "", prompt: "", heroPosition: table.heroPosition, villainPosition: "" };

    if (complete && hand.results) {
      table.result = describeResult(hand, ordered, newIdByOrig);
      table.resultKind = hand.results.foldWin ? "lost" : "showdown";
      table.lastAction = table.result;
      table.potAwards = Object.entries(hand.results.payouts || {})
        .filter(([, amount]) => amount > 0)
        .map(([origIndex, amount]) => ({ seatId: newIdByOrig[Number(origIndex)] ?? -1, amount: round2(amount) }))
        .filter((award) => award.seatId >= 0);
      table.winningCards = [];

      // C5: feed the showdown-visuals + showdown-timing models the same staging
      // the single-player engine produces, so multiway / all-in reveals don't
      // degrade (no street-by-street runout, no winner-emphasis, no made-hand
      // summary, no aggressor-first order). Built from the authoritative
      // server reveal (cards + handName + comparable score) — no re-evaluation.
      if (!hand.results.foldWin && Array.isArray(hand.results.reveal) && hand.results.reveal.length) {
        const revealByOrig = new Map(hand.results.reveal.map((entry) => [entry.seatIndex, entry]));
        const winnerIds = new Set(table.potAwards.map((award) => award.seatId));
        const participants = ordered
          .map((seat, i) => {
            const rev = revealByOrig.get(seat.seatIndex);
            if (!rev) return null;
            return {
              seatId: i,
              position: posByOrig[seat.seatIndex] || "",
              name: seat.playerName || "Игрок",
              isHero: Boolean(seat.isYou),
              cards: Array.isArray(rev.hole) ? rev.hole.slice(0, 2) : [],
              handName: rev.handName || "",
              score: Array.isArray(rev.score) ? rev.score.slice() : [],
              bestCards: cleanCards(rev.bestCards, 5)
            };
          })
          .filter(Boolean);
        const winners = participants
          .filter((participant) => winnerIds.has(participant.seatId))
          .map((participant) => ({ seatId: participant.seatId, position: participant.position, name: participant.name, isHero: participant.isHero }));
        const potAwardLedger = mapServerPotAwardLedger(hand.results.potAwards, participants, newIdByOrig);
        const potWinners = aggregatePotWinnersFromLedger(potAwardLedger, table.potAwards, participants);
        const primaryWinner = (potWinners[0] || winners[0] || null);
        const primaryParticipant = primaryWinner
          ? participants.find((participant) => Number(participant.seatId) === Number(primaryWinner.seatId))
          : null;
        table.winningCards = cleanCards(primaryParticipant?.bestCards, 5);
        const allIn = ordered.some((seat) => seat.allIn);
        table.showdown = {
          schema: "poker-simulator-showdown-v1",
          allIn,
          pot: round2(hand.pot),
          result: table.result,
          winningHandName: winners[0] ? (participants.find((p) => p.seatId === winners[0].seatId)?.handName || "") : "",
          winningCards: table.winningCards.slice(),
          winners,
          potWinners,
          potAwards: potWinners.map((winner) => ({ seatId: winner.seatId, amount: round2(winner.amount) })),
          potAwardLedger,
          participants
        };
        // All-in runout: stage ONLY the streets that were still to come when the
        // all-in closed, mirroring single-player engine-runout.js. stage[0] is the
        // board already on the felt at the lock (no deal-in); the unrevealed
        // streets animate in. The server's results.allInRunout carries the
        // authoritative locked street/board, so a turn/river all-in never re-deals
        // cards already showing. (Legacy server with no descriptor: fall back to
        // staging the whole board from the flop.)
        const serverRunout = hand.results ? hand.results.allInRunout : undefined;
        if (serverRunout !== undefined) {
          // Authoritative: null means it was NOT a runout (board came out through
          // normal betting) -> no runout animation.
          if (serverRunout && Array.isArray(serverRunout.startBoard)) {
            const finalBoard = table.board.slice();
            const startBoard = serverRunout.startBoard.slice(0, 5);
            const streetForLen = (n) => (n >= 5 ? "river" : n >= 4 ? "turn" : n >= 3 ? "flop" : "preflop");
            // allInRunoutStageLengths(start, final): [start, ...unrevealed streets].
            const lengths = [Math.max(0, Math.min(5, startBoard.length))];
            if (lengths[lengths.length - 1] < 3 && finalBoard.length >= 3) lengths.push(3);
            if (lengths[lengths.length - 1] < 4 && finalBoard.length >= 4) lengths.push(4);
            if (lengths[lengths.length - 1] < 5 && finalBoard.length >= 5) lengths.push(5);
            const stageLengths = [...new Set(lengths)];
            const stages = stageLengths.map((boardLength) => ({
              street: streetForLen(boardLength),
              board: finalBoard.slice(0, boardLength),
              equities: []
            }));
            table.allInRunout = {
              startedAtStreet: serverRunout.startedAtStreet || streetForLen(startBoard.length),
              startBoard,
              finalBoard,
              stages
            };
          }
        } else if (allIn) {
          // Legacy fallback: no locked-street info -> stage the whole board.
          const board = table.board.slice();
          const stages = [];
          if (board.length >= 3) stages.push({ street: "flop", board: board.slice(0, 3), equities: [] });
          if (board.length >= 4) stages.push({ street: "turn", board: board.slice(0, 4), equities: [] });
          if (board.length >= 5) stages.push({ street: "river", board: board.slice(0, 5), equities: [] });
          if (stages.length) table.allInRunout = { startedAtStreet: stages[0].street, finalBoard: board, stages };
        }
        // Aggressor-first reveal order: map the server's last raiser to the
        // rotated seat id; fall back to the primary winner so the reveal order
        // never silently collapses to raw seat order.
        const aggOrig = hand.lastAggressorSeatIndex;
        const aggId = (aggOrig != null && Number(aggOrig) >= 0) ? newIdByOrig[Number(aggOrig)] : undefined;
        const aggressorId = aggId !== undefined ? aggId : winners[0]?.seatId;
        if (aggressorId != null) {
          table.streetAggressorSeatId = aggressorId;
          table.preflopAggressorSeatId = aggressorId;
        }
      }
    }
    applyServerMeta(table, room, hand);
    return table;
  }

  function describeResult(hand, ordered, newIdByOrig) {
    const winners = Object.entries(hand.results.payouts || {})
      .filter(([, amount]) => amount > 0)
      .map(([origIndex]) => {
        const seat = ordered.find((candidate) => candidate.seatIndex === Number(origIndex));
        return seat ? seat.playerName : `место ${Number(origIndex) + 1}`;
      });
    return winners.length ? `${winners.join(", ")} забирает банк` : "Рука завершена";
  }

  // Pre-hand / between-hands lobby table: the full seat ring around the felt so
  // the player sees a real N-max table waiting for players, NOT one stray chair
  // (which read as a live preflop hand). Empty chairs render as dimmed
  // "Свободно" placeholders, or as a tier-colored "Бот" when bot-fill will seat
  // one at the deal. No cards — the explicit waiting status lives in the
  // server-mode chrome, not on the felt.
  function lobbyToTable(room, viewerId, tableId) {
    const allSeats = (room?.seats || []).slice();
    const occupied = allSeats.filter((seat) => seat.occupied);
    // The felt should show every chair up to the table size. Prefer the room's
    // authoritative maxSeats; fall back to the seat ring / occupancy so an older
    // or partial view never collapses to a single lone chair.
    const maxSeats = Math.max(
      Number(room?.maxSeats) || 0,
      Number(room?.settings?.maxSeats) || 0,
      allSeats.length,
      occupied.length,
      1
    );
    const table = emptyTableShell(tableId);

    // Work on a full-length ring (pad missing empties) and rotate it so the
    // viewer — or seat 0 for a spectator — lands at engine index 0 (felt bottom),
    // matching the renderer's hero-centric convention. Empty chairs keep their
    // real ring position so adjacency mirrors the physical table.
    const ring = allSeats.length ? allSeats : [];
    while (ring.length < maxSeats) ring.push({ index: ring.length, occupied: false });
    const heroPos = Math.max(0, ring.findIndex((seat) => seat.occupied && seat.isYou));
    const ordered = ring.map((_, i) => ring[(heroPos + i) % ring.length]);

    // Every empty chair renders as a dimmed "Свободно" placeholder pre-hand —
    // including bot-fill seats. A bot is not actually seated until the deal, so
    // previewing "Бот · 0 BB" here would be a lie; the bot tier coloring (#3)
    // belongs to the live hand (handToTable), where the skill matters. With
    // bot-fill ON the auto-deal fires almost immediately anyway, so this lobby is
    // really only lingered on by the bot-fill-OFF lone-human (stuck) case — the
    // exact case where "Свободно · waiting for players" is the honest message.
    table.seats = ordered.map((seat, i) => {
      const isVacant = !seat.occupied;
      return {
        id: i,
        roomSeatIndex: Number.isFinite(Number(seat.index)) ? Number(seat.index) : i,
        name: isVacant ? "Свободно" : (seat.playerName || "Игрок"),
        position: "",
        stack: isVacant ? 0 : round2(seat.stackBb),
        cards: [],
        isHero: Boolean(seat.occupied && seat.isYou),
        isHuman: Boolean(seat.occupied),
        isBot: false,
        // Open-chair marker the seat renderer dims and strips of stack/avatar.
        vacant: isVacant,
        folded: false,
        foldedAt: "",
        revealed: false,
        dealer: false,
        blind: "",
        allIn: false,
        botProfile: null,
        lobbyState: isVacant
          ? "vacant"
          : seat.state === "disconnected" ? "disconnected"
            : seat.state === "sitting-out" ? "sitting-out" : "active"
      };
    });
    table.playerCount = ordered.length;
    table.seatSlotCount = ordered.length;
    table.status = "playing";
    table.lastAction = "Ожидание раздачи";
    table.spot = { title: room?.name || "", prompt: "Ожидание раздачи", heroPosition: "", villainPosition: "" };
    table.positions = table.seats.map(() => "");
    table.seatPositions = table.positions.slice();
    applyServerMeta(table, room, null);
    return table;
  }

  function serverHandToTable({ room, hand, viewerId, tableId = 1, prevHand = null } = {}) {
    if (hand && Array.isArray(hand.seats) && hand.seats.length >= 2) {
      return handToTable(room, hand, viewerId, tableId, prevHand);
    }
    return lobbyToTable(room, viewerId, tableId);
  }

  const exported = { serverHandToTable };
  root.PokerSimulatorMultiplayerAdapter = exported;
  if (typeof module !== "undefined" && module.exports) module.exports = exported;
})(typeof window !== "undefined" ? window : globalThis);
