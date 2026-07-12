(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function clampIndex(index, length) {
    if (!length) return 0;
    return Math.max(0, Math.min(length - 1, Number(index) || 0));
  }

  function replaySnapshot(hand, event) {
    const snapshot = event?.state && typeof event.state === "object" ? event.state : {};
    return {
      ...snapshot,
      street: event?.street || snapshot.street || hand?.status || "",
      pot: snapshot.pot ?? event?.pot ?? hand?.pot ?? 0,
      toCall: snapshot.toCall ?? 0,
      board: Array.isArray(snapshot.board) ? snapshot.board : Array.isArray(event?.board) ? event.board : [],
      seats: Array.isArray(snapshot.seats) && snapshot.seats.length ? snapshot.seats : hand?.seats || []
    };
  }

  function isRedundantReplayChipEvent(event, nextEvent) {
    return event?.phase === "chips"
      && nextEvent?.phase === "action"
      && event.seatId != null
      && Number(event.seatId) === Number(nextEvent.seatId)
      && String(event.street || "") === String(nextEvent.street || "");
  }

  function isRedundantAllInActionEvent(event, allInSeats) {
    return event?.phase === "action" && event.seatId != null && allInSeats.has(Number(event.seatId));
  }

  function markReplayAllInSeats(event, allInSeats) {
    if (event?.phase !== "action" || event.seatId == null) return;
    const seats = Array.isArray(event?.state?.seats) ? event.state.seats : [];
    const actor = seats.find((seat) => Number(seat?.id) === Number(event.seatId));
    if (actor && !actor.folded && Number(actor.stack) === 0) allInSeats.add(Number(event.seatId));
  }

  function isReplayRunoutEvent(event) {
    return event?.phase === "street" && /runout to showdown/i.test(String(event?.label || ""));
  }

  function replaySeatOrder(seats) {
    const list = Array.isArray(seats) ? seats.filter(Boolean) : [];
    const hero = list.find((seat) => seat.isHero);
    const others = list.filter((seat) => !seat.isHero);
    return hero ? [...others, hero] : list;
  }

  const REPLAY_CLOCKWISE_SLOT_BY_SEAT_ID = [0, 6, 5, 4, 3, 2, 1, 7, 8];

  function replaySeatSlot(seat, fallbackIndex = 0) {
    const seatId = Number(seat?.id);
    if (!Number.isFinite(seatId)) return fallbackIndex;
    return REPLAY_CLOCKWISE_SLOT_BY_SEAT_ID[seatId] ?? seatId;
  }

  function replayActorSeat(event, snapshot) {
    if (!event || event.seatId == null) return null;
    const seats = Array.isArray(snapshot?.seats) ? snapshot.seats : [];
    return seats.find((seat) => Number(seat.id) === Number(event.seatId)) || null;
  }

  function replayActorLabel(event, snapshot) {
    const seat = replayActorSeat(event, snapshot);
    if (!seat) return "";
    if (seat.isHero) return "Hero";
    return seat.position || seat.name || `Seat ${event.seatId}`;
  }

  function replayReachedShowdown(hand) {
    return Boolean(hand?.showdown) || String(hand?.status) === "showdown" || Boolean(hand?.allInRunout);
  }

  function replayIsRevealStep(hand, event) {
    if (!replayReachedShowdown(hand)) return false;
    return event?.phase === "result"
      || String(event?.street || "") === "showdown"
      || event?.allInRunoutStage === true
      || /runout to showdown/i.test(String(event?.label || ""));
  }

  function replayIsFinalRevealStep(hand, event) {
    return event?.phase === "result" || String(event?.street || "") === "showdown";
  }

  function replayRevealMap(hand) {
    const map = new Map();
    const sources = [hand?.showdown?.participants, hand?.allInRunout?.participants];
    for (const list of sources) {
      if (!Array.isArray(list)) continue;
      for (const participant of list) {
        const seatId = Number(participant?.seatId);
        if (!Number.isFinite(seatId)) continue;
        const cards = Array.isArray(participant?.cards) ? participant.cards.filter(Boolean) : [];
        if (!cards.length) continue;
        const existing = map.get(seatId);
        map.set(seatId, {
          cards,
          handName: participant?.handName || existing?.handName || ""
        });
      }
    }
    return map;
  }

  function replayWinnerSet(hand) {
    const potWinners = Array.isArray(hand?.showdown?.potWinners) ? hand.showdown.potWinners : [];
    const winners = potWinners.length
      ? potWinners
      : Array.isArray(hand?.showdown?.winners)
      ? hand.showdown.winners
      : [];
    return new Set(winners.map((winner) => Number(winner?.seatId)).filter(Number.isFinite));
  }

  function replayWinningCardSet(hand) {
    // Union of both sources: the top-level `winningCards` and the showdown
    // payload's own `winningCards`. The standalone replayer read both; the
    // in-simulator core only read the top-level one, so delegating without this
    // union would silently drop winner-card highlighting on hands that carry the
    // set only under `showdown`.
    const direct = Array.isArray(hand?.winningCards) ? hand.winningCards : [];
    const showdown = Array.isArray(hand?.showdown?.winningCards) ? hand.showdown.winningCards : [];
    return new Set([...direct, ...showdown].map((card) => String(card)));
  }

  function roundReplayBb(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
  }

  function replaySeatInState(state, seatId) {
    const seats = Array.isArray(state?.seats) ? state.seats : [];
    return seats.find((seat) => Number(seat?.id) === Number(seatId)) || null;
  }

  // The chips event the engine writes immediately before this action for the same
  // seat/street (the pair filtered by isRedundantReplayChipEvent). Only the
  // ADJACENT chip counts — a far-away blind chip must not bind to a later check.
  // Locate the action by its stable key (seq+phase+seatId), NOT by object
  // identity: callers may pass a cloned/derived visible event, and a reference
  // lookup would miss it and silently drop the chip (→ amount/type lost). The
  // engine stamps every event with a monotonic `seq`; identity stays a fast path.
  function replayAdjacentChip(hand, actionEvent) {
    const raw = Array.isArray(hand?.actions) ? hand.actions : [];
    const idx = raw.findIndex((event) => {
      if (event === actionEvent) return true;
      if (actionEvent?.seq == null) return false;
      return event
        && event.seq === actionEvent.seq
        && event.phase === actionEvent.phase
        && Number(event.seatId) === Number(actionEvent.seatId);
    });
    if (idx <= 0) return null;
    const prev = raw[idx - 1];
    return isRedundantReplayChipEvent(prev, actionEvent) ? prev : null;
  }

  // Positional prefix: new board cards are those past the previous VISIBLE event's
  // board length (visible-based, so synthetic all-in runout stages work too).
  function replayBoardDelta(visibleEvents, index) {
    const cur = Array.isArray(visibleEvents?.[index]?.board) ? visibleEvents[index].board : [];
    const prev = index > 0 && Array.isArray(visibleEvents?.[index - 1]?.board) ? visibleEvents[index - 1].board : [];
    return cur.slice(prev.length);
  }

  // Normalized, language-independent view of one replay step: who/position, what
  // (actionType derived from STATE, not label text), how much (amountPaid/raiseTo),
  // pot before→after and toCall. Numbers are roundBb'd. Missing structured data
  // yields null (never a fabricated number) — see null-policy branches below.
  function replayStepView(hand, visibleEvents, index) {
    const ev = visibleEvents?.[index];
    if (!ev) return null;
    const view = {
      phase: ev.phase || "",
      street: ev.street || ev.state?.street || hand?.status || "",
      potAfter: roundReplayBb(ev.pot ?? ev.state?.pot ?? hand?.pot ?? 0),
      boardDelta: replayBoardDelta(visibleEvents, index),
      actor: null,
      position: null,
      isHero: false,
      actionType: null,
      amountPaid: null,
      raiseTo: null,
      potBefore: null,
      toCall: null
    };
    // Blind / ante posts: chips moved without a decision. Show poster + amount.
    if (ev.phase === "chips" && ev.seatId != null) {
      const poster = replaySeatInState(ev.state, ev.seatId);
      view.actor = poster ? (poster.isHero ? "Hero" : poster.position || poster.name || `Seat ${ev.seatId}`) : null;
      view.position = poster?.position ?? null;
      view.isHero = Boolean(poster?.isHero);
      view.actionType = "post";
      view.amountPaid = roundReplayBb(ev.amount ?? 0);
      view.potBefore = roundReplayBb(Number(ev.pot || 0) - Number(ev.amount || 0));
      return view;
    }
    // Street-reveal / result steps carry no actor economics.
    if (ev.phase !== "action" || ev.seatId == null) {
      view.potBefore = view.potAfter;
      return view;
    }
    const afterSeat = replaySeatInState(ev.state, ev.seatId);
    view.actor = afterSeat ? (afterSeat.isHero ? "Hero" : afterSeat.position || afterSeat.name || `Seat ${ev.seatId}`) : null;
    view.position = afterSeat?.position ?? null;
    view.isHero = Boolean(afterSeat?.isHero);

    const pairChip = replayAdjacentChip(hand, ev);
    const folded = Boolean(afterSeat?.folded);
    const tone = String(ev.tone || "");
    const afterCurrentBet = roundReplayBb(ev.state?.currentBet ?? 0);

    // before-state: the chips snapshot still holds the PRE-raise currentBet
    // (engine writes chips before `table.currentBet =`); for unpaid actions the
    // action state itself is the before-state (fold/check change nothing).
    const beforeCB = roundReplayBb(pairChip ? (pairChip.state?.currentBet ?? 0) : (ev.state?.currentBet ?? 0));
    const beforeContr = pairChip
      ? roundReplayBb(Number(pairChip.contribution || 0) - Number(pairChip.amount || 0))
      : roundReplayBb(Number(afterSeat?.contribution || 0));
    view.toCall = Math.max(0, roundReplayBb(beforeCB - beforeContr));
    view.potBefore = pairChip ? roundReplayBb(Number(pairChip.pot || 0) - Number(pairChip.amount || 0)) : view.potAfter;

    // A missing actor seat (afterSeat=null) means the stack is UNKNOWN — it must
    // not collapse to 0 and read as all-in. Require the seat before claiming all-in.
    const allIn = Boolean(afterSeat) && Number(afterSeat.stack || 0) === 0 && !folded;
    let type;
    if (folded || tone === "fold") {
      type = "fold";
      view.amountPaid = 0;
    } else if (pairChip) {
      view.amountPaid = roundReplayBb(pairChip.amount);
      if (afterCurrentBet > beforeCB) {
        type = (view.street === "preflop" || beforeCB > 0) ? "raise" : "bet";
      } else {
        type = "call";
      }
      if (allIn) type = type === "call" ? "allInCall" : type === "bet" ? "allInBet" : "allInRaise";
    } else if (tone === "aggressive") {
      // Aggression must move chips; a missing adjacent chip means lost data.
      type = "unknown";
      view.amountPaid = null;
    } else if (view.toCall === 0) {
      type = "check";
      view.amountPaid = 0;
    } else {
      // passive/neutral with a debt but no chip → lost call data; do not fabricate.
      type = "unknown";
      view.amountPaid = null;
    }
    view.actionType = type;
    view.raiseTo = (type === "bet" || type === "raise" || type === "allInBet" || type === "allInRaise")
      ? afterCurrentBet
      : null;
    return view;
  }

  function replayWinnerLabel(winner) {
    if (!winner || typeof winner !== "object") return "";
    if (winner.isHero || Number(winner.seatId) === 0) return "Hero";
    return String(winner.position || winner.name || `Seat ${winner.seatId}`);
  }

  function replayPotAwardLabel(pot, index) {
    const kind = String(pot?.kind || "").toLowerCase();
    if (kind === "main" || Number(pot?.potIndex ?? index) === 0) return "Main";
    return `Side ${Number(pot?.potIndex ?? index)}`;
  }

  // Honest hand summary: use potWinners when the engine supplies side-pot
  // amounts; otherwise expose labels only and never fabricate "won X" values.
  function replayHandSummary(hand) {
    const showdown = hand?.showdown || null;
    const potAwardLedger = Array.isArray(showdown?.potAwardLedger) ? showdown.potAwardLedger : [];
    const potWinners = Array.isArray(showdown?.potWinners) ? showdown.potWinners : [];
    const winners = potWinners.length ? potWinners : Array.isArray(showdown?.winners) ? showdown.winners : [];
    const winnerLabels = winners.map(replayWinnerLabel).filter(Boolean);
    const winnerAmounts = potWinners
      .map((winner) => ({
        seatId: Number(winner?.seatId),
        label: replayWinnerLabel(winner),
        amount: roundReplayBb(winner?.amount)
      }))
      .filter((winner) => Number.isFinite(winner.seatId) && winner.label && winner.amount > 0);
    const potBreakdown = potAwardLedger
      .map((pot, index) => {
        const parts = (Array.isArray(pot?.winners) ? pot.winners : [])
          .map((winner) => {
            const label = replayWinnerLabel(winner);
            const amount = roundReplayBb(winner?.amount);
            return label && amount > 0 ? `${label} ${amount}` : "";
          })
          .filter(Boolean);
        return parts.length ? `${replayPotAwardLabel(pot, index)}: ${parts.join(" / ")}` : "";
      })
      .filter(Boolean);
    return {
      totalPot: roundReplayBb(showdown?.pot ?? hand?.pot ?? 0),
      winnerLabels,
      winnerAmounts,
      potBreakdown,
      isSplit: winnerLabels.length > 1,
      winningHandName: String(showdown?.winningHandName || ""),
      board: Array.isArray(hand?.board) ? hand.board.slice() : [],
      resultText: String(hand?.result || ""),
      hasPerWinnerAmounts: winnerAmounts.length > 0,
      hasPotBreakdown: potBreakdown.length > 0
    };
  }

  function model(options = {}) {
    const streetLabel = typeof options.streetLabel === "function" ? options.streetLabel : (street) => String(street || "");
    const formatInlineAmounts = typeof options.formatInlineAmounts === "function" ? options.formatInlineAmounts : (value) => String(value || "");

    function replayStreetLabel(street) {
      const raw = String(street || "").trim();
      if (!raw) return "hand";
      return streetLabel(raw);
    }

    function expandReplayAllInRunout(hand, events) {
      const runout = hand?.allInRunout;
      const stages = Array.isArray(runout?.stages) ? runout.stages : [];
      if (stages.length < 2) return events;
      const index = events.findIndex(isReplayRunoutEvent);
      if (index < 0) return events;
      const base = events[index];
      const startLen = Array.isArray(runout.startBoard) ? runout.startBoard.length : 0;
      const dealt = stages.filter((stage) => Array.isArray(stage.board) && stage.board.length > startLen);
      if (!dealt.length) return events;
      const synthetic = dealt.map((stage) => ({
        ...base,
        phase: "street",
        street: stage.street,
        label: `${replayStreetLabel(stage.street)} · олл-ин ран-аут`,
        board: stage.board.slice(),
        allInRunoutStage: true,
        state: base.state
          ? { ...base.state, board: stage.board.slice(), street: stage.street }
          : { board: stage.board.slice(), street: stage.street }
      }));
      return [...events.slice(0, index), ...synthetic, ...events.slice(index + 1)];
    }

    function replayVisibleEvents(hand) {
      const events = Array.isArray(hand?.actions) ? hand.actions : [];
      const allInSeats = new Set();
      const filtered = [];
      events.forEach((event, index) => {
        const redundant = isRedundantReplayChipEvent(event, events[index + 1])
          || isRedundantAllInActionEvent(event, allInSeats);
        markReplayAllInSeats(event, allInSeats);
        if (!redundant) filtered.push(event);
      });
      return expandReplayAllInRunout(hand, filtered);
    }

    function replayDisplayActionLabel(event, snapshot, fallback = "Раздача") {
      const actionI18n = root.PokerSimulatorActionI18n || {};
      const localizeActionLabel = typeof actionI18n.localizeActionLabel === "function" ? actionI18n.localizeActionLabel : (value) => value;
      let label = String(event?.label || fallback || "");
      const actor = replayActorLabel(event, snapshot);
      if (actor) {
        const prefix = `${actor} `;
        if (label.toLowerCase().startsWith(prefix.toLowerCase())) {
          label = label.slice(prefix.length);
        }
      }
      return localizeActionLabel(formatInlineAmounts(label));
    }

    function replayRevealContext(hand, event) {
      if (!replayIsRevealStep(hand, event)) return null;
      const final = replayIsFinalRevealStep(hand, event);
      return {
        map: replayRevealMap(hand),
        winners: final ? replayWinnerSet(hand) : new Set(),
        winningCards: final ? replayWinningCardSet(hand) : new Set()
      };
    }

    return {
      clampIndex,
      replaySnapshot,
      replayVisibleEvents,
      isRedundantReplayChipEvent,
      isRedundantAllInActionEvent,
      markReplayAllInSeats,
      isReplayRunoutEvent,
      expandReplayAllInRunout,
      replaySeatOrder,
      replaySeatSlot,
      replayActorSeat,
      replayActorLabel,
      replayDisplayActionLabel,
      replayStreetLabel,
      replayReachedShowdown,
      replayIsRevealStep,
      replayIsFinalRevealStep,
      replayRevealMap,
      replayWinnerSet,
      replayWinningCardSet,
      replayRevealContext,
      replayStepView,
      replayHandSummary
    };
  }

  root.PokerSimulatorReplay = {
    clampIndex,
    replaySnapshot,
    isRedundantReplayChipEvent,
    isRedundantAllInActionEvent,
    markReplayAllInSeats,
    isReplayRunoutEvent,
    replaySeatOrder,
    replaySeatSlot,
    replayActorSeat,
    replayActorLabel,
    replayReachedShowdown,
    replayIsRevealStep,
    replayIsFinalRevealStep,
    replayRevealMap,
    replayWinnerSet,
    replayWinningCardSet,
    replayStepView,
    replayHandSummary,
    model
  };
})();
