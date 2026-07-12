// All-in runout, equity sampling, and side-pot share projection. Loaded before simulator-engine.js facade.
  function maybeRunoutAllIn(table) {
    if (!isAllInRunoutLocked(table)) return "";

    const startBoard = Array.isArray(table.board) ? table.board.slice() : [];
    const deckBeforeRunout = Array.isArray(table.deck) ? table.deck.slice() : [];
    const runoutOpponents = liveContestingOpponents(table);

    table.heroTurn = false;
    table.busy = false;
    table.toCall = 0;
    table.canCheck = false;
    table.currentBet = 0;
    table.lastRaiseSize = 0;
    table.minRaiseTo = 0;

    // Capture the closing-street bet snapshot HERE — while table.street is still
    // the contested street and table.seatBets still holds the calling chips — so
    // the felt-rest markers stamp {contested-street, contested-board}, which
    // matches the call/raise action animations. Filling the board to 5 and the
    // showdown() street jump below would otherwise re-stamp it {showdown, 5}, and
    // the exact street+boardLength gate in the renderer (actionMatchesClosingStreet)
    // would drop the resting chip — the call would visibly fly in and instantly
    // vanish instead of resting on the felt before the runout begins.
    snapshotClosingStreetBets(table);

    while (table.board.length < 5) {
      table.board.push(drawCard(table.deck));
    }

    table.allInRunout = buildAllInRunout(table, {
      startBoard,
      finalBoard: table.board.slice(),
      deckBeforeRunout,
      opponents: runoutOpponents
    });
    table.lastAction = "All-in runout";
    addLog(table, "All-in: board до showdown");
    recordTimeline(table, "street", "All-in runout to showdown", {
      board: table.board.slice(),
      allInRunout: table.allInRunout
    });
    return showdown(table);
  }

  function buildAllInRunout(table, context = {}) {
    const hero = heroSeat(table);
    const opponents = Array.isArray(context.opponents) ? context.opponents : liveContestingOpponents(table);
    const participants = [hero, ...opponents].filter((seat) => seat && !seat.folded && Array.isArray(seat.cards) && seat.cards.length >= 2);
    const startBoard = Array.isArray(context.startBoard) ? context.startBoard.slice(0, 5) : [];
    const finalBoard = Array.isArray(context.finalBoard) ? context.finalBoard.slice(0, 5) : (table.board || []).slice(0, 5);
    const deckBeforeRunout = Array.isArray(context.deckBeforeRunout) ? context.deckBeforeRunout.slice() : [];
    const stageLengths = allInRunoutStageLengths(startBoard.length, finalBoard.length);
    const potModel = allInRunoutPotModel(table, participants);
    const equitySamples = buildRunoutEquitySamples(participants, startBoard, finalBoard, deckBeforeRunout);

    return {
      schema: "poker-simulator-all-in-runout-v1",
      equityMode: potModel ? "pot-share" : "winner-share",
      pot: potModel?.total ?? roundBbValue(table?.pot || 0),
      // Uncalled over-shove refund (chips returned to the lone top contributor
      // before pots are awarded). Tracked here so the realized-share metric can
      // exclude a seat's own returned chips from its "winnings" (a refund is not
      // pot equity won).
      refund: potModel?.refund
        ? { seatId: Number(potModel.refund.seatId), amount: roundBbValue(potModel.refund.amount) }
        : null,
      startedAtStreet: streetForBoardLength(startBoard.length),
      startBoard,
      finalBoard,
      participants: participants.map((seat) => ({
        seatId: seat.id,
        position: seat.position,
        name: seat.name,
        isHero: Boolean(seat.isHero),
        cards: Array.isArray(seat.cards) ? seat.cards.slice(0, 2) : []
      })),
      stages: stageLengths.map((boardLength, index) => {
        const board = finalBoard.slice(0, boardLength);
        const { handEquity, equity } = estimateRunoutEquityPair(participants, board, deckBeforeRunout, potModel, equitySamples.get(boardLength));
        const outs = estimateRunoutOuts(participants, board, deckBeforeRunout);
        return {
          index,
          street: streetForBoardLength(boardLength),
          board,
          equities: equity.players,
          handEquities: handEquity.players,
          outs,
          samples: equity.samples,
          sampled: equity.sampled
        };
      })
    };
  }

  function buildRunoutEquitySamples(participants, startBoard, finalBoard, deckBeforeRunout) {
    const start = Array.isArray(startBoard) ? startBoard.slice(0, 5) : [];
    const final = Array.isArray(finalBoard) ? finalBoard.slice(0, 5) : [];
    const missingFromStart = Math.max(0, 5 - start.length);
    if (!missingFromStart) return new Map();
    const contenders = (Array.isArray(participants) ? participants : [])
      .filter((seat) => seat && Array.isArray(seat.cards) && seat.cards.length >= 2);
    const maxSamples = runoutEquitySampleCap(contenders.length, missingFromStart);
    const knownCards = new Set([
      ...start,
      ...contenders.flatMap((seat) => seat.cards.slice(0, 2))
    ]);
    const remainingDeck = (Array.isArray(deckBeforeRunout) ? deckBeforeRunout : [])
      .filter((card) => card && !knownCards.has(card));
    const fullSamples = sampledCombinations(remainingDeck, missingFromStart, maxSamples);
    const byLength = new Map();
    allInRunoutStageLengths(start.length, final.length).forEach((boardLength) => {
      const board = final.slice(0, boardLength);
      const missing = Math.max(0, 5 - board.length);
      if (!missing) return;
      const boardSet = new Set(board);
      const stageKnownCards = new Set([
        ...board,
        ...contenders.flatMap((seat) => seat.cards.slice(0, 2))
      ]);
      const stageDeck = (Array.isArray(deckBeforeRunout) ? deckBeforeRunout : [])
        .filter((card) => card && !stageKnownCards.has(card));
      const stageTotal = combinationCount(stageDeck.length, missing);
      const stageMaxSamples = runoutEquitySampleCap(contenders.length, missing);
      // BUGHUNT F005: gate exact enumeration on the STAGE's own `missing`, not the
      // start-street count. A preflop all-in's 1-card turn/river stage (missing<=2)
      // is trivially enumerable and must not inherit the 5-card start's sampling.
      if (missing <= 2 && stageTotal <= stageMaxSamples) {
        byLength.set(boardLength, { runouts: combinations(stageDeck, missing), sampled: false });
        return;
      }
      const runouts = [];
      const seen = new Set();
      fullSamples.forEach((sample) => {
        const suffix = (Array.isArray(sample) ? sample : [])
          .filter((card) => !boardSet.has(card))
          .slice(0, missing);
        if (suffix.length !== missing) return;
        const key = suffix.slice().sort().join("|");
        if (seen.has(key)) return;
        seen.add(key);
        runouts.push(suffix);
      });
      // BUGHUNT F005: the sampled flag is stage-local — whether we covered every
      // completion of THIS board, not the start board / start-street sample count.
      if (runouts.length) byLength.set(boardLength, { runouts, sampled: combinationCount(stageDeck.length, missing) > runouts.length });
    });
    return byLength;
  }

  function allInRunoutPotModel(table, participants) {
    const participantIds = (Array.isArray(participants) ? participants : [])
      .map((seat) => Number(seat?.id))
      .filter((seatId) => Number.isFinite(seatId));
    const pot = roundBbValue(Number(table?.pot || 0));
    if (!(pot > 0) || !participantIds.length) return null;

    const entries = handContributionEntries(table)
      .map((entry) => ({ seatId: Number(entry.seatId), amount: roundBbValue(entry.amount) }))
      .filter((entry) => Number.isFinite(entry.seatId) && entry.amount > 0);
    const contributedTotal = roundBbValue(entries.reduce((sum, entry) => sum + entry.amount, 0));

    if (!(contributedTotal > 0)) {
      return {
        total: pot,
        refund: null,
        layers: [{ amount: pot, eligible: participantIds.slice() }]
      };
    }

    const refund = computeTableUncalledRefund(table, entries);
    const deadMoney = Math.max(0, roundBbValue(pot - contributedTotal));
    const layers = buildPotLayers(entries)
      .map((layer) => ({
        amount: roundBbValue(layer.amount),
        eligible: (Array.isArray(layer.eligible) ? layer.eligible : [])
          .map(Number)
          .filter((seatId) => Number.isFinite(seatId))
      }))
      .filter((layer) => layer.amount > 0 && layer.eligible.length);

    if (deadMoney > 0) {
      if (layers.length) layers[0].amount = roundBbValue(layers[0].amount + deadMoney);
      else layers.push({ amount: deadMoney, eligible: participantIds.slice() });
    }

    return {
      // BUGHUNT F004: computeTableUncalledRefund() measures the unmatched amount
      // on betting contributions only, then removes those returned chips from the
      // full (bets + antes) entries used by `layers`. Their sum is therefore the
      // CONTESTED pot while BB ante remains represented. `total` must match —
      // subtract the refund, else per-runout pot-shares sum to
      // (contested/total) < 1, understating persisted hand-log equities and the
      // session-graph evWinRate metric.
      total: roundBbValue(contributedTotal - (refund?.amount || 0) + deadMoney),
      refund: refund ? { seatId: Number(refund.seatId), amount: roundBbValue(refund.amount) } : null,
      layers
    };
  }

  function allInRunoutStageLengths(startLength, finalLength) {
    const lengths = [Math.max(0, Math.min(5, Number(startLength) || 0))];
    if (lengths[0] < 3 && finalLength >= 3) lengths.push(3);
    if (lengths[lengths.length - 1] < 4 && finalLength >= 4) lengths.push(4);
    if (lengths[lengths.length - 1] < 5 && finalLength >= 5) lengths.push(5);
    return [...new Set(lengths)];
  }

  function streetForBoardLength(boardLength) {
    const length = Number(boardLength || 0);
    if (length >= 5) return "river";
    if (length >= 4) return "turn";
    if (length >= 3) return "flop";
    return "preflop";
  }

  // Single pass over the runout set. The per-(runout,seat) evaluateBest results
  // are the dominant all-in compute, so we accumulate BOTH the winner-share
  // distribution (used for handEquities) and — when a potModel is supplied — the
  // pot-share distribution (used for equities) from the same evaluated scores.
  // The pot accumulator mirrors the original fallback: a runout with no pot tier
  // split falls back to that runout's winner-share. Output is byte-identical to
  // running two independent estimateRunoutEquity passes; the runout set is
  // resolved exactly once so the sampled (no-plan) path consumes RNG only once.
  function computeRunoutEquity(participants, board, deckBeforeRunout, potModel, samplePlan, includePot) {
    const contenders = (Array.isArray(participants) ? participants : [])
      .filter((seat) => seat && Array.isArray(seat.cards) && seat.cards.length >= 2)
      .slice();
    const players = contenders
      .map((seat) => ({
        seatId: seat.id,
        position: seat.position,
        name: seat.name,
        isHero: Boolean(seat.isHero),
        equity: 0
      }));
    if (!players.length) return { players, winnerBySeat: new Map(), potBySeat: null, samples: 0, sampled: false };

    const knownCards = new Set([
      ...(Array.isArray(board) ? board : []),
      ...contenders.flatMap((seat) => Array.isArray(seat.cards) ? seat.cards.slice(0, 2) : [])
    ]);
    const remainingDeck = (Array.isArray(deckBeforeRunout) ? deckBeforeRunout : [])
      .filter((card) => card && !knownCards.has(card));
    const missing = Math.max(0, 5 - (Array.isArray(board) ? board.length : 0));
    const maxSamples = runoutEquitySampleCap(contenders.length, missing);
    const plannedRunouts = Array.isArray(samplePlan?.runouts) ? samplePlan.runouts : null;
    const runouts = missing > 0 ? (plannedRunouts || sampledCombinations(remainingDeck, missing, maxSamples)) : [[]];
    const winnerBySeat = new Map(players.map((player) => [Number(player.seatId), 0]));
    const potBySeat = includePot && potModel ? new Map(players.map((player) => [Number(player.seatId), 0])) : null;

    // BUGHUNT F001 (latent defensive guard): sampledCombinations returns [] only
    // when the deck is too small for `missing` or maxSamples is 0 — unreachable in
    // normal play, but if it ever happens do NOT ship all-zero equity (the forEach
    // below would never run, samples=1, and every seat reads 0% — summing to 0, not
    // 1.0). Fall back to an even split so the readout stays coherent.
    if (missing > 0 && !runouts.length) {
      const evenShare = players.length ? 1 / players.length : 0;
      players.forEach((player) => {
        winnerBySeat.set(Number(player.seatId), evenShare);
        if (potBySeat) potBySeat.set(Number(player.seatId), evenShare);
      });
      return { players, winnerBySeat, potBySeat, samples: 1, sampled: true };
    }

    runouts.forEach((runout) => {
      const fullBoard = [...(Array.isArray(board) ? board : []), ...runout];
      const results = contenders.map((seat) => ({
        seat,
        eval: evaluateBest([...seat.cards.slice(0, 2), ...fullBoard])
      }));
      // Winner-share distribution for this runout (also the pot-share fallback).
      const best = results
        .slice()
        .sort((first, second) => compareScores(second.eval.score, first.eval.score))[0];
      const winners = best
        ? results.filter((result) => compareScores(result.eval.score, best.eval.score) === 0)
        : [];
      const winnerShare = winners.length ? 1 / winners.length : 0;
      winners.forEach((winner) => {
        const seatId = Number(winner.seat.id);
        winnerBySeat.set(seatId, Number(winnerBySeat.get(seatId) || 0) + winnerShare);
      });
      if (potBySeat) {
        const tiers = rankTiersFromResults(results.map((result) => ({
          seatId: result.seat.id,
          score: result.eval.score
        })));
        const shares = potSharesForTiers(potModel, tiers, players.map((player) => player.seatId));
        if (shares) {
          shares.forEach((share, seatId) => {
            potBySeat.set(seatId, Number(potBySeat.get(seatId) || 0) + share);
          });
        } else {
          winners.forEach((winner) => {
            const seatId = Number(winner.seat.id);
            potBySeat.set(seatId, Number(potBySeat.get(seatId) || 0) + winnerShare);
          });
        }
      }
    });

    const samples = runouts.length || 1;
    const sampled = Boolean(samplePlan?.sampled) || combinationCount(remainingDeck.length, missing) > runouts.length;
    return { players, winnerBySeat, potBySeat, samples, sampled };
  }

  function roundRunoutPlayers(players, bySeat, samples) {
    const denom = samples > 0 ? samples : 1;
    const result = players.map((player) => ({
      ...player,
      equity: Math.round((Number(bySeat.get(Number(player.seatId)) || 0) / denom) * 1000) / 1000
    }));
    // BUGHUNT F002: each equity is rounded independently, so an even 3-way split
    // yields 0.333*3 = 0.999 (and pot-share arrays can drift a milli off 1.0 too).
    // Push the rounding remainder onto the strongest seat (first among equals in
    // player order = deterministic) so the array totals exactly 1.0. Skip when
    // there is nothing to normalize (F001 empty-sample guard leaves all-zero).
    const sum = result.reduce((total, player) => total + Number(player.equity || 0), 0);
    const remainder = Math.round((1 - sum) * 1000) / 1000;
    if (sum > 0 && remainder !== 0) {
      let targetIndex = 0;
      let bestRaw = -Infinity;
      result.forEach((player, index) => {
        const raw = Number(bySeat.get(Number(player.seatId)) || 0);
        if (raw > bestRaw) { bestRaw = raw; targetIndex = index; }
      });
      result[targetIndex].equity = Math.round((result[targetIndex].equity + remainder) * 1000) / 1000;
    }
    return result;
  }

  function estimateRunoutEquity(participants, board, deckBeforeRunout, potModel = null, samplePlan = null) {
    const core = computeRunoutEquity(participants, board, deckBeforeRunout, potModel, samplePlan, Boolean(potModel));
    if (!core.players.length) return { players: core.players, samples: 0, sampled: false };
    const bySeat = (potModel && core.potBySeat) ? core.potBySeat : core.winnerBySeat;
    return { players: roundRunoutPlayers(core.players, bySeat, core.samples), samples: core.samples, sampled: core.sampled };
  }

  // Returns both equity views from ONE runout pass (handEquity = winner-share,
  // equity = pot-share when a potModel exists, else the same object as handEquity).
  function estimateRunoutEquityPair(participants, board, deckBeforeRunout, potModel, samplePlan) {
    const core = computeRunoutEquity(participants, board, deckBeforeRunout, potModel, samplePlan, Boolean(potModel));
    if (!core.players.length) {
      const empty = { players: core.players, samples: 0, sampled: false };
      return { handEquity: empty, equity: empty };
    }
    const handEquity = {
      players: roundRunoutPlayers(core.players, core.winnerBySeat, core.samples),
      samples: core.samples,
      sampled: core.sampled
    };
    const equity = (potModel && core.potBySeat)
      ? { players: roundRunoutPlayers(core.players, core.potBySeat, core.samples), samples: core.samples, sampled: core.sampled }
      : handEquity;
    return { handEquity, equity };
  }

  // Per-seat one-card outs for an all-in stage. `ahead` flags the seat(s)
  // holding the best made hand on the visible (partial) board; `outs` counts
  // the single next cards that lift a currently-behind seat into the
  // (co-)lead. This is the classic "X outs" notion taught to players, so the
  // UI can surface it for the underdog while cards are still to come. On the
  // river (no card to come) every seat reports 0 outs.
  function estimateRunoutOuts(participants, board, deckBeforeRunout) {
    const contenders = (Array.isArray(participants) ? participants : [])
      .filter((seat) => seat && Array.isArray(seat.cards) && seat.cards.length >= 2);
    const boardCards = Array.isArray(board) ? board.slice() : [];
    const baseline = runoutOutsBaseline(contenders, boardCards);
    if (contenders.length < 2) return baseline;
    // Before the flop there is no 5-card hand to rank, so "who is ahead" and
    // "outs" are undefined. A pre-flop all-in runout snapshots a board-length-0
    // stage; ranking 2 hole cards + 0 board would feed evaluateBest <5 cards.
    // Return the neutral baseline instead of ranking an impossible hand.
    if (boardCards.length < 3) return baseline;
    // NOTE: previously an `if (contenders.length > 3) return baseline;` cap sat
    // here, which made every pre-river stage of any 4+way all-in report outs:0
    // for ALL seats (including genuinely drawing underdogs) — the "X аутов"
    // badge vanished for routine 4-9 way all-ins. The refinement loop below is
    // O(deck * contenders) (≤47 cards × ≤9 seats per stage) and is correct for
    // any contender count, so the cap is removed. The preflop guard above must
    // stay; the equity / pot-share paths are unaffected (separate code).

    const currentScores = contenders.map((seat) => ({
      seatId: Number(seat.id),
      score: evaluateBest([...seat.cards.slice(0, 2), ...boardCards]).score
    }));
    const currentBest = currentScores.reduce(
      (best, entry) => (compareScores(entry.score, best.score) > 0 ? entry : best),
      currentScores[0]
    );
    const leaders = new Set(
      currentScores
        .filter((entry) => compareScores(entry.score, currentBest.score) === 0)
        .map((entry) => Number(entry.seatId))
    );
    baseline.forEach((row) => { row.ahead = leaders.has(Number(row.seatId)); });

    if (boardCards.length >= 5) return baseline;

    const known = new Set([
      ...boardCards,
      ...contenders.flatMap((seat) => seat.cards.slice(0, 2))
    ]);
    const deck = (Array.isArray(deckBeforeRunout) ? deckBeforeRunout : [])
      .filter((card) => card && !known.has(card));
    const outsBySeat = new Map(baseline.map((row) => [Number(row.seatId), 0]));

    deck.forEach((card) => {
      const nextBoard = [...boardCards, card];
      const results = contenders.map((seat) => ({
        seatId: Number(seat.id),
        score: evaluateBest([...seat.cards.slice(0, 2), ...nextBoard]).score
      }));
      const top = results.reduce(
        (best, entry) => (compareScores(entry.score, best.score) > 0 ? entry : best),
        results[0]
      );
      const winners = results.filter((entry) => compareScores(entry.score, top.score) === 0);
      // An out only counts when the next card lifts a currently-behind seat
      // into the (co-)lead. Cards that merely keep the leader ahead are not
      // outs for anyone.
      winners.forEach((winner) => {
        if (leaders.has(Number(winner.seatId))) return;
        outsBySeat.set(Number(winner.seatId), Number(outsBySeat.get(Number(winner.seatId)) || 0) + 1);
      });
    });

    baseline.forEach((row) => { row.outs = Number(outsBySeat.get(Number(row.seatId)) || 0); });
    return baseline;
  }

  function runoutEquitySampleCap(contenderCount, missingCards) {
    const count = Math.max(0, Number(contenderCount) || 0);
    const missing = Math.max(0, Number(missingCards) || 0);
    if (missing <= 1) return 2000;
    if (missing <= 2) return 900;
    if (count >= 6) return 120;
    if (count >= 4) return missing >= 4 ? 220 : 320;
    return missing >= 4 ? 900 : 1600;
  }

  function runoutOutsBaseline(contenders, boardCards) {
    const seats = Array.isArray(contenders) ? contenders : [];
    const board = Array.isArray(boardCards) ? boardCards : [];
    const rows = seats.map((seat) => ({
      seatId: Number(seat.id),
      position: seat.position,
      name: seat.name,
      isHero: Boolean(seat.isHero),
      ahead: false,
      outs: 0
    }));
    if (seats.length < 2 || board.length < 3) return rows;

    const currentScores = seats.map((seat) => ({
      seatId: Number(seat.id),
      score: evaluateBest([...seat.cards.slice(0, 2), ...board]).score
    }));
    const currentBest = currentScores.reduce(
      (best, entry) => (compareScores(entry.score, best.score) > 0 ? entry : best),
      currentScores[0]
    );
    const leaders = new Set(
      currentScores
        .filter((entry) => compareScores(entry.score, currentBest.score) === 0)
        .map((entry) => Number(entry.seatId))
    );
    rows.forEach((row) => { row.ahead = leaders.has(Number(row.seatId)); });
    return rows;
  }

  function splitLayerAmounts(seatIds, amount) {
    const ids = (Array.isArray(seatIds) ? seatIds : [])
      .map(Number)
      .filter((seatId) => Number.isFinite(seatId))
      .sort((first, second) => first - second);
    const total = roundBbValue(amount);
    if (!ids.length || !(total > 0)) return new Map();
    const baseShare = Math.floor((total / ids.length) * 10) / 10;
    let paid = 0;
    const shares = new Map();
    // E5: this feeds the EQUITY display (estimateRunoutEquity) — an expectation,
    // not the realized payout. The odd-chip remainder goes to the lowest id for a
    // stable, hero-eligible display; the authoritative realized split is
    // splitChipsAmong, which rotates the odd chip by hand number. The two may
    // therefore differ by a single 0.1 BB odd chip, which sits below the
    // Monte-Carlo estimate's own noise.
    const remainder = roundBbValue(total - roundBbValue(baseShare * (ids.length - 1)));
    ids.forEach((seatId, index) => {
      const amountForSeat = index === 0 ? remainder : baseShare;
      shares.set(seatId, roundBbValue((shares.get(seatId) || 0) + amountForSeat));
      paid = roundBbValue(paid + amountForSeat);
    });
    return shares;
  }

  function potSharesForTiers(potModel, tiers, playerSeatIds) {
    const total = roundBbValue(Number(potModel?.total || 0));
    if (!(total > 0)) return null;

    const seatIds = (Array.isArray(playerSeatIds) ? playerSeatIds : [])
      .map(Number)
      .filter((seatId) => Number.isFinite(seatId));
    const chipShares = new Map(seatIds.map((seatId) => [seatId, 0]));
    const addShare = (seatId, amount) => {
      const id = Number(seatId);
      if (!chipShares.has(id)) return;
      chipShares.set(id, roundBbValue(Number(chipShares.get(id) || 0) + Number(amount || 0)));
    };

    // The uncalled over-shove refund is the lone top contributor's OWN chips
    // coming back, not pot equity contested by hand strength. Crediting it here
    // floored the refund seat's pot-share "equity" at refund/total on every
    // runout (even drawing dead), and — more importantly — made the per-runout
    // pot-share inconsistent with the realized-share metric (which excludes the
    // refund). Keep the refund out of the contested pot-share entirely so equity
    // and realized share are measured on the same basis.

    const liveTiers = (Array.isArray(tiers) ? tiers : [])
      .map((tier) => (Array.isArray(tier) ? tier : [tier]).map(Number).filter((seatId) => Number.isFinite(seatId)))
      .filter((tier) => tier.length);

    (Array.isArray(potModel.layers) ? potModel.layers : []).forEach((layer) => {
      const eligible = new Set((Array.isArray(layer.eligible) ? layer.eligible : [])
        .map(Number)
        .filter((seatId) => Number.isFinite(seatId)));
      let winners = [];
      for (const tier of liveTiers) {
        const hit = tier.filter((seatId) => eligible.has(seatId));
        if (hit.length) { winners = hit; break; }
      }
      const targets = winners.length ? winners : Array.from(eligible);
      splitLayerAmounts(targets, layer.amount).forEach((amount, seatId) => {
        addShare(seatId, amount);
      });
    });

    return new Map(Array.from(chipShares.entries()).map(([seatId, amount]) => [
      seatId,
      Math.max(0, Math.min(1, Number(amount || 0) / total))
    ]));
  }

  function snapshotAllInSettlementStacks(table) {
    if (!table?.allInRunout) return null;
    const pot = roundBbValue(Number(table.allInRunout.pot || table.pot || 0));
    if (!(pot > 0)) return null;
    const stacks = new Map();
    (Array.isArray(table.allInRunout.participants) ? table.allInRunout.participants : []).forEach((participant) => {
      const seatId = Number(participant?.seatId);
      const seat = seatById(table, seatId);
      if (seat && Number.isFinite(seatId)) stacks.set(seatId, roundBbValue(seat.stack));
    });
    return stacks.size ? { pot, stacks } : null;
  }

  function attachAllInRunoutRealizedShares(table, before) {
    if (!table?.allInRunout || !before) return;
    const pot = roundBbValue(Number(before.pot || table.allInRunout.pot || table.pot || 0));
    if (!(pot > 0)) return;
    const preAwardStacks = {};
    if (before.stacks instanceof Map) {
      before.stacks.forEach((stack, seatId) => {
        const id = Number(seatId);
        if (Number.isFinite(id)) preAwardStacks[id] = roundBbValue(stack);
      });
    }
    if (Object.keys(preAwardStacks).length) {
      table.allInRunout.preAwardStacks = preAwardStacks;
    }
    const participants = Array.isArray(table.allInRunout.participants) ? table.allInRunout.participants : [];
    const refund = table.allInRunout.refund;
    const refundSeatId = refund && refund.amount > 0 ? Number(refund.seatId) : null;
    const refundAmount = refundSeatId !== null ? roundBbValue(refund.amount) : 0;
    table.allInRunout.realizedShares = participants.map((participant) => {
      const seatId = Number(participant?.seatId);
      const seat = seatById(table, seatId);
      const beforeStack = roundBbValue(before.stacks.get(seatId) || 0);
      const afterStack = roundBbValue(seat?.stack || 0);
      // Exclude the seat's own uncalled-bet refund: those chips are the player's
      // returned over-shove, not pot equity won, so they must not inflate the
      // realized "share won".
      const refundForSeat = seatId === refundSeatId ? refundAmount : 0;
      const amount = Math.max(0, roundBbValue(afterStack - beforeStack - refundForSeat));
      return {
        seatId,
        position: participant.position,
        name: participant.name,
        isHero: Boolean(participant.isHero),
        amount,
        share: Math.round(Math.max(0, Math.min(1, amount / pot)) * 1000) / 1000
      };
    });
  }

  function sampledCombinations(items, size, maxSamples) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    const count = Math.max(0, Number(size) || 0);
    if (!count) return [[]];
    if (list.length < count) return [];
    const total = combinationCount(list.length, count);
    const sampleTarget = Math.min(total, Math.max(0, Math.floor(Number(maxSamples) || 0)));
    if (!sampleTarget) return [];
    if (total <= sampleTarget) return combinations(list, count);

    const runouts = [];
    const seen = new Set();
    const addByRank = (rank) => {
      const picked = combinationAtIndex(list, count, rank);
      const key = picked.slice().sort().join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      runouts.push(picked);
      return true;
    };

    for (let sampleIndex = 0; sampleIndex < sampleTarget; sampleIndex += 1) {
      const start = Math.floor((sampleIndex * total) / sampleTarget);
      const end = Math.floor(((sampleIndex + 1) * total) / sampleTarget);
      const width = Math.max(1, end - start);
      addByRank(start + randomInt(width));
    }

    if (runouts.length < sampleTarget) {
      const stride = Math.max(1, Math.floor(total / sampleTarget));
      let cursor = randomInt(Math.max(1, stride));
      let guard = 0;
      while (runouts.length < sampleTarget && guard < total + sampleTarget) {
        addByRank(cursor % total);
        cursor += stride;
        guard += 1;
      }
    }
    for (let rank = 0; runouts.length < sampleTarget && rank < total; rank += 1) {
      addByRank(rank);
    }
    return runouts;
  }

  function combinationAtIndex(items, size, rank) {
    const list = Array.isArray(items) ? items : [];
    const count = Math.max(0, Math.floor(Number(size) || 0));
    let cursor = Math.max(0, Math.floor(Number(rank) || 0));
    const picked = [];
    let start = 0;

    for (let remaining = count; remaining > 0; remaining -= 1) {
      for (let index = start; index <= list.length - remaining; index += 1) {
        const skip = combinationCount(list.length - index - 1, remaining - 1);
        if (cursor < skip) {
          picked.push(list[index]);
          start = index + 1;
          break;
        }
        cursor -= skip;
      }
    }

    return picked;
  }

  function combinationCount(total, size) {
    const n = Math.max(0, Number(total) || 0);
    const k = Math.max(0, Number(size) || 0);
    if (k > n) return 0;
    let result = 1;
    for (let index = 1; index <= k; index += 1) {
      result = (result * (n - k + index)) / index;
    }
    return Math.round(result);
  }


var __pokerSimulatorEngineParts = (typeof window !== "undefined" ? window : globalThis).PokerSimulatorEngineParts
  || ((typeof window !== "undefined" ? window : globalThis).PokerSimulatorEngineParts = {});
Object.assign(__pokerSimulatorEngineParts, {
  maybeRunoutAllIn,
  buildAllInRunout,
  buildRunoutEquitySamples,
  allInRunoutPotModel,
  allInRunoutStageLengths,
  streetForBoardLength,
  estimateRunoutEquity,
  estimateRunoutOuts,
  splitLayerAmounts,
  potSharesForTiers,
  snapshotAllInSettlementStacks,
  attachAllInRunoutRealizedShares,
  sampledCombinations,
  combinationCount
});
