(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const graphKit = root.PokerSimulatorSessionGraph;
  if (!graphKit) throw new Error("PokerSimulatorSessionGraph is not loaded before PokerSimulatorHandLog");

  const trackedCbetStreets = ["flop", "turn", "river"];
  const trackedPositions = ["ip", "oop"];

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function roundBbMetric(value) {
    return Math.round(finiteNumber(value, 0) * 10) / 10;
  }

  function ratio(part, total) {
    return total ? Number(part || 0) / Number(total || 0) : 0;
  }

  function clampRate(value) {
    return Math.max(0, Math.min(1, Number(value || 0)));
  }

  function formatBb(value) {
    return `${roundBbMetric(value)} BB`;
  }

  function parseHandLogJsonlLines(raw) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((entry) => entry && typeof entry === "object");
  }

  function parseHandLogJsonl(text) {
    const raw = String(text || "").trim();
    if (!raw) return [];
    if (raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
          ? parsed.filter((entry) => entry && typeof entry === "object")
          : [];
      } catch {
        // A single malformed character would discard the whole log. Fall back to
        // the tolerant line-by-line parse so one bad entry doesn't drop everything.
        return parseHandLogJsonlLines(raw);
      }
    }
    return parseHandLogJsonlLines(raw);
  }

  function handLogJsonl(entries = [], options = {}) {
    return (Array.isArray(entries) ? entries : [])
      .map((entry) => sanitizeHandLogEntry(entry, options))
      .filter(Boolean)
      .map((entry) => JSON.stringify(entry))
      .join("\n");
  }

  function revealOpponentCardsSetting(entry = {}, options = {}) {
    const settings = entry.settings && typeof entry.settings === "object" ? entry.settings : {};
    const optionSettings = options.settings && typeof options.settings === "object" ? options.settings : {};
    return options.revealOpponentCardsOnFinish ?? optionSettings.revealOpponentCardsOnFinish ?? settings.revealOpponentCardsOnFinish;
  }

  function shouldHideOpponentShowdownCards(entry = {}, options = {}) {
    const resultSource = entry.result && typeof entry.result === "object" ? entry.result : {};
    const outcome = String(resultSource.outcome || entry.outcome || "").toLowerCase();
    const resultFolded = Boolean(resultSource.folded || entry.fold || outcome === "fold");
    const resultShowdown = Boolean(resultSource.showdown || entry.showdown);
    return revealOpponentCardsSetting(entry, options) === false && resultFolded && !resultShowdown;
  }

  function sanitizeHistoryEntry(entry, options = {}) {
    if (!entry || typeof entry !== "object") return entry;
    return {
      ...entry,
      handHistory: sanitizeHandHistory(entry.handHistory, {
        ...options,
        hideOpponentShowdownCards: shouldHideOpponentShowdownCards(entry, options)
      })
    };
  }

  function sanitizeHandHistory(hand, options = {}) {
    if (!hand || typeof hand !== "object") return null;
    return {
      ...hand,
      winningCards: options.hideOpponentShowdownCards ? [] : (Array.isArray(hand.winningCards) ? hand.winningCards.slice(0, 5).map(String) : []),
      showdown: sanitizeShowdownPayload(hand.showdown, options),
      allInRunout: sanitizeAllInRunoutPayload(hand.allInRunout, options),
      seats: sanitizeSnapshotSeats(hand.seats, options),
      actions: Array.isArray(hand.actions)
        ? hand.actions.map((event) => sanitizeTimelineEvent(event, options))
        : []
    };
  }

  function sanitizeTimelineEvent(event, options = {}) {
    if (!event || typeof event !== "object") return event;
    const next = { ...event };
    if (next.state && typeof next.state === "object") {
      next.state = {
        ...next.state,
        seats: sanitizeSnapshotSeats(next.state.seats, options)
      };
    }
    return next;
  }

  function sanitizeSnapshotSeats(seats, options = {}) {
    if (!Array.isArray(seats)) return [];
    return seats.map((seat) => {
      if (!seat || typeof seat !== "object") return seat;
      return {
        ...seat,
        cards: seat.isHero && Array.isArray(seat.cards) ? seat.cards.slice() : []
      };
    });
  }

  function participantCards(participant, options = {}) {
    if (options.hideOpponentShowdownCards && !participant?.isHero) return [];
    return Array.isArray(participant?.cards) ? participant.cards.slice(0, 2).map(String) : [];
  }

  function sanitizeShowdownPayload(showdown, options = {}) {
    if (!showdown || typeof showdown !== "object") return null;
    return {
      schema: String(showdown.schema || "poker-simulator-showdown-v1"),
      allIn: Boolean(showdown.allIn),
      pot: roundBbMetric(showdown.pot),
      result: String(showdown.result || "").slice(0, 180),
      winningHandName: String(showdown.winningHandName || "").slice(0, 80),
      winningCards: options.hideOpponentShowdownCards ? [] : (Array.isArray(showdown.winningCards) ? showdown.winningCards.slice(0, 5).map(String) : []),
      winners: Array.isArray(showdown.winners)
        ? showdown.winners.map((winner) => ({
          seatId: Math.max(0, Number(winner?.seatId || 0)),
          position: String(winner?.position || "").slice(0, 20),
          name: String(winner?.name || "").slice(0, 60),
          isHero: Boolean(winner?.isHero)
        }))
        : [],
      potAwards: Array.isArray(showdown.potAwards)
        ? showdown.potAwards.map((award) => ({
          seatId: Math.max(0, Number(award?.seatId || 0)),
          amount: roundBbMetric(award?.amount)
        })).filter((award) => award.amount > 0)
        : [],
      potWinners: Array.isArray(showdown.potWinners)
        ? showdown.potWinners.map((winner) => ({
          seatId: Math.max(0, Number(winner?.seatId || 0)),
          position: String(winner?.position || "").slice(0, 20),
          name: String(winner?.name || "").slice(0, 60),
          isHero: Boolean(winner?.isHero),
          amount: roundBbMetric(winner?.amount)
        })).filter((winner) => winner.amount > 0)
        : [],
      participants: Array.isArray(showdown.participants)
        ? showdown.participants.map((participant) => ({
          seatId: Math.max(0, Number(participant?.seatId || 0)),
          position: String(participant?.position || "").slice(0, 20),
          name: String(participant?.name || "").slice(0, 60),
          isHero: Boolean(participant?.isHero),
          cards: participantCards(participant, options),
          handName: String(participant?.handName || "").slice(0, 80),
          score: Array.isArray(participant?.score) ? participant.score.slice(0, 8).map(Number) : []
        }))
        : []
    };
  }

  function sanitizeAllInRunoutPayload(runout, options = {}) {
    if (!runout || typeof runout !== "object") return null;
    return {
      schema: String(runout.schema || "poker-simulator-all-in-runout-v1"),
      equityMode: String(runout.equityMode || "").slice(0, 40),
      pot: roundBbMetric(runout.pot),
      startedAtStreet: String(runout.startedAtStreet || "").slice(0, 20),
      startBoard: Array.isArray(runout.startBoard) ? runout.startBoard.slice(0, 5).map(String) : [],
      finalBoard: Array.isArray(runout.finalBoard) ? runout.finalBoard.slice(0, 5).map(String) : [],
      participants: Array.isArray(runout.participants)
        ? runout.participants.map((participant) => ({
          seatId: Math.max(0, Number(participant?.seatId || 0)),
          position: String(participant?.position || "").slice(0, 20),
          name: String(participant?.name || "").slice(0, 60),
          isHero: Boolean(participant?.isHero),
          cards: participantCards(participant, options)
        }))
        : [],
      stages: Array.isArray(runout.stages)
        ? runout.stages.map((stage, index) => ({
          index: Math.max(0, Number(stage?.index ?? index)),
          street: String(stage?.street || "").slice(0, 20),
          board: Array.isArray(stage?.board) ? stage.board.slice(0, 5).map(String) : [],
          equities: Array.isArray(stage?.equities)
            ? stage.equities.map((equity) => ({
              seatId: Math.max(0, Number(equity?.seatId || 0)),
              position: String(equity?.position || "").slice(0, 20),
              name: String(equity?.name || "").slice(0, 60),
              isHero: Boolean(equity?.isHero),
              equity: clampRate(equity?.equity)
            }))
            : [],
          handEquities: Array.isArray(stage?.handEquities)
            ? stage.handEquities.map((equity) => ({
              seatId: Math.max(0, Number(equity?.seatId || 0)),
              position: String(equity?.position || "").slice(0, 20),
              name: String(equity?.name || "").slice(0, 60),
              isHero: Boolean(equity?.isHero),
              equity: clampRate(equity?.equity)
            }))
            : [],
          outs: Array.isArray(stage?.outs)
            ? stage.outs.map((row) => ({
              seatId: Math.max(0, Number(row?.seatId || 0)),
              position: String(row?.position || "").slice(0, 20),
              name: String(row?.name || "").slice(0, 60),
              isHero: Boolean(row?.isHero),
              ahead: Boolean(row?.ahead),
              outs: Math.max(0, Math.min(47, Number(row?.outs || 0)))
            }))
            : [],
          samples: Math.max(0, Number(stage?.samples || 0)),
          sampled: Boolean(stage?.sampled)
        }))
        : [],
      realizedShares: Array.isArray(runout.realizedShares)
        ? runout.realizedShares.map((share) => ({
          seatId: Math.max(0, Number(share?.seatId || 0)),
          position: String(share?.position || "").slice(0, 20),
          name: String(share?.name || "").slice(0, 60),
          isHero: Boolean(share?.isHero),
          amount: roundBbMetric(share?.amount),
          share: clampRate(share?.share)
        }))
        : []
    };
  }

  function fallbackSessionId(options = {}) {
    return String(options.sessionId || options.bootSessionId || "session").slice(0, 80);
  }

  function sanitizeFoldAnyEvent(event, options = {}) {
    if (!event || typeof event !== "object") return null;
    const settings = event.settings && typeof event.settings === "object" ? event.settings : {};
    const phase = ["queued", "triggered", "canceled"].includes(event.phase) ? event.phase : "queued";
    const sessionId = String(event.sessionId || fallbackSessionId(options)).slice(0, 80);
    return {
      id: String(event.id || `${sessionId}:fold-any:${event.handNo || 0}:${event.tableId || 0}:${phase}`).slice(0, 180),
      sessionId,
      phase,
      at: typeof event.at === "string" ? event.at : "",
      handNo: Math.max(0, Number(event.handNo || 0)),
      tableId: Math.max(0, Number(event.tableId || 0)),
      street: String(event.street || ""),
      heroPosition: String(event.heroPosition || ""),
      combo: String(event.combo || ""),
      heroHand: Array.isArray(event.heroHand) ? event.heroHand.slice(0, 2).map(String) : [],
      board: Array.isArray(event.board) ? event.board.slice(0, 5).map(String) : [],
      pot: roundBbMetric(event.pot),
      toCall: roundBbMetric(event.toCall),
      stack: roundBbMetric(event.stack),
      canCheck: Boolean(event.canCheck),
      minRaiseTo: roundBbMetric(event.minRaiseTo),
      lastAction: String(event.lastAction || "").slice(0, 160),
      waitingState: String(event.waitingState || "").slice(0, 80),
      actionTrail: String(event.actionTrail || "").slice(0, 240),
      settings: {
        pack: String(settings.pack || ""),
        playerCount: Math.max(0, Number(settings.playerCount || 0)),
        difficulty: String(settings.difficulty || ""),
        botLineup: String(settings.botLineup || ""),
        tableCount: Math.max(0, Number(settings.tableCount || 0))
      }
    };
  }

  function sanitizeHandLogEntry(entry, options = {}) {
    if (!entry || typeof entry !== "object") return null;
    const rawHandHistory = entry.handHistory && typeof entry.handHistory === "object" ? entry.handHistory : null;
    const resultSource = entry.result && typeof entry.result === "object" ? entry.result : {};
    const resultText = typeof entry.result === "string"
      ? entry.result
      : String(resultSource.text || rawHandHistory?.result || entry.outcome || "");
    const handNo = Math.max(0, Number(entry.handNo || entry.no || rawHandHistory?.handNo || 0));
    const tableId = Math.max(0, Number(entry.tableId || rawHandHistory?.tableId || 0));
    const sessionId = String(entry.sessionId || fallbackSessionId(options)).slice(0, 80);
    const settings = entry.settings && typeof entry.settings === "object" ? entry.settings : {};
    const outcome = String(resultSource.outcome || entry.outcome || (resultSource.won ? "win" : resultSource.folded ? "loss" : "") || "");
    const resultFolded = Boolean(resultSource.folded || entry.fold || outcome.toLowerCase() === "fold");
    const resultShowdown = Boolean(resultSource.showdown || entry.showdown);
    const revealSetting = revealOpponentCardsSetting(entry, options);
    const hideOpponentShowdownCards = shouldHideOpponentShowdownCards(entry, options);
    const handHistory = sanitizeHandHistory(rawHandHistory, { ...options, hideOpponentShowdownCards });
    const stats = statsForHandLogEntry({ stats: entry.stats, handHistory });
    const heroSource = entry.hero && typeof entry.hero === "object" ? entry.hero : {};
    const heroSeatSnapshot = handHistory?.seats?.find((seat) => seat?.isHero) || {};
    const heroHand = Array.isArray(heroSource.hand)
      ? heroSource.hand.slice(0, 2)
      : Array.isArray(handHistory?.heroHand)
      ? handHistory.heroHand.slice(0, 2)
      : [];
    const sanitized = {
      schema: "poker-simulator-hand-v1",
      id: String(entry.id || `${sessionId}:${handNo}:${tableId}`).slice(0, 160),
      sessionId,
      playedAt: typeof entry.playedAt === "string" ? entry.playedAt : "",
      tableId,
      handNo,
      settings: {
        pack: String(settings.pack || ""),
        playerCount: Math.max(0, Number(settings.playerCount || 0)),
        difficulty: String(settings.difficulty || ""),
        botLineup: String(settings.botLineup || ""),
        tableCount: Math.max(0, Number(settings.tableCount || 0)),
        revealOpponentCardsOnFinish: revealSetting !== false
      },
      hero: {
        position: String(heroSource.position || handHistory?.spot?.heroPosition || heroSeatSnapshot.position || ""),
        hand: heroHand,
        combo: String(heroSource.combo || handHistory?.combo || "")
      },
      result: {
        text: resultText,
        outcome,
        won: Boolean(resultSource.won || outcome === "win" || outcome === "split"),
        folded: resultFolded,
        showdown: resultShowdown,
        pot: roundBbMetric(resultSource.pot ?? handHistory?.pot ?? entry.pot),
        netBb: roundBbMetric(resultSource.netBb)
      },
      foldAny: sanitizeFoldAnyEvent(entry.foldAny, { sessionId }),
      stats,
      handHistory,
      text: String(entry.text || "").slice(0, 20000)
    };
    if (!sanitized.text) sanitized.text = renderHandLogText(sanitized, handHistory);
    return sanitized;
  }

  function renderHandLogText(entry, handHistory) {
    const board = Array.isArray(handHistory?.board) && handHistory.board.length
      ? handHistory.board.join(" ")
      : "preflop";
    const heroHand = Array.isArray(entry.hero?.hand) && entry.hero.hand.length
      ? entry.hero.hand.join(" ")
      : "unknown";
    const actions = (Array.isArray(handHistory?.actions) ? handHistory.actions : [])
      .filter((event) => event?.phase === "action")
      .map((event) => event.label)
      .filter(Boolean)
      .join(" | ");
    const net = entry.result?.netBb > 0 ? `+${formatBb(entry.result.netBb)}` : formatBb(entry.result?.netBb || 0);
    return [
      `Hand #${entry.handNo} T${entry.tableId}`,
      `Hero ${entry.hero?.position || "?"} ${heroHand}${entry.hero?.combo ? ` (${entry.hero.combo})` : ""}`,
      `Board ${board}`,
      `Result ${entry.result?.text || entry.result?.outcome || "unknown"}`,
      `Net ${net}`,
      entry.foldAny ? `FoldAny ${entry.foldAny.street || "?"} ${entry.foldAny.heroPosition || "?"} toCall ${formatBb(entry.foldAny.toCall || 0)}` : "",
      actions ? `Actions ${actions}` : ""
    ].filter(Boolean).join(" | ");
  }

  function extractHandStats(hand) {
    const stats = defaultHandStats();
    const actions = Array.isArray(hand?.actions)
      ? hand.actions.filter((event) => event?.phase === "action")
      : [];
    const preflopActions = actions.filter((event) => event.street === "preflop");
    const heroPreflopActions = preflopActions.filter(isHeroTimelineAction);
    stats.preflop.vpip = heroPreflopActions.some((event) => actionIsVpip(event, hand));
    stats.preflop.pfr = heroPreflopActions.some((event) => actionIsAggressive(event, hand));

    const threeBetDecision = heroThreeBetDecision(preflopActions, hand);
    stats.preflop.threeBetOpportunity = threeBetDecision.opportunity;
    stats.preflop.threeBet = threeBetDecision.made;

    const foldToThreeBetDecision = heroFoldToThreeBetDecision(preflopActions, hand);
    stats.preflop.foldToThreeBetOpportunity = foldToThreeBetDecision.opportunity;
    stats.preflop.foldToThreeBet = foldToThreeBetDecision.made;

    let previousAggressorSeatId = lastAggressiveSeatId(preflopActions, hand);
    trackedCbetStreets.forEach((street) => {
      const streetEvents = actions.filter((event) => event.street === street);
      const cbet = stats.cbet[street];
      const heroIndex = streetEvents.findIndex(isHeroTimelineAction);
      if (previousAggressorSeatId === 0 && heroIndex >= 0) {
        const beforeHero = streetEvents.slice(0, heroIndex);
        const facedStreetAggression = beforeHero.some((event) => !isHeroTimelineAction(event) && actionIsAggressive(event, hand));
        if (!facedStreetAggression) {
          cbet.opportunity = true;
          cbet.position = beforeHero.some((event) => !isHeroTimelineAction(event) && !actionIsFold(event)) ? "ip" : "oop";
          cbet.made = actionIsAggressive(streetEvents[heroIndex], hand);
        }
      }
      const streetAggressorSeatId = lastAggressiveSeatId(streetEvents, hand);
      previousAggressorSeatId = streetAggressorSeatId == null ? null : streetAggressorSeatId;
    });

    return stats;
  }

  function statsForHandLogEntry(entry) {
    const handHistory = entry?.handHistory;
    if (handHistory && typeof handHistory === "object") {
      return sanitizeHandStats(extractHandStats(handHistory));
    }
    return sanitizeHandStats(entry?.stats);
  }

  function defaultHandStats() {
    return {
      preflop: {
        vpip: false,
        pfr: false,
        threeBetOpportunity: false,
        threeBet: false,
        foldToThreeBetOpportunity: false,
        foldToThreeBet: false
      },
      cbet: trackedCbetStreets.reduce((acc, street) => {
        acc[street] = { opportunity: false, made: false, position: "" };
        return acc;
      }, {})
    };
  }

  function sanitizeHandStats(source) {
    const stats = defaultHandStats();
    const preflop = source?.preflop && typeof source.preflop === "object" ? source.preflop : {};
    stats.preflop.vpip = Boolean(preflop.vpip);
    stats.preflop.pfr = Boolean(preflop.pfr);
    stats.preflop.threeBetOpportunity = Boolean(preflop.threeBetOpportunity);
    stats.preflop.threeBet = Boolean(preflop.threeBet);
    stats.preflop.foldToThreeBetOpportunity = Boolean(preflop.foldToThreeBetOpportunity);
    stats.preflop.foldToThreeBet = Boolean(preflop.foldToThreeBet);
    trackedCbetStreets.forEach((street) => {
      const cbet = source?.cbet?.[street] && typeof source.cbet[street] === "object" ? source.cbet[street] : {};
      stats.cbet[street] = {
        opportunity: Boolean(cbet.opportunity),
        made: Boolean(cbet.made),
        position: trackedPositions.includes(cbet.position) ? cbet.position : ""
      };
    });
    return stats;
  }

  function aggregatePokerStats(entries) {
    const aggregate = {
      hands: 0,
      wins: 0,
      evWins: 0,
      folds: 0,
      showdowns: 0,
      netBb: 0,
      bb100: 0,
      evNetBb: 0,
      evBb100: 0,
      winRate: 0,
      evWinRate: 0,
      preflop: {
        vpip: emptyRateStat(),
        pfr: emptyRateStat(),
        threeBet: emptyRateStat(),
        foldToThreeBet: emptyRateStat()
      },
      cbet: trackedCbetStreets.reduce((acc, street) => {
        acc[street] = trackedPositions.reduce((positionAcc, position) => {
          positionAcc[position] = emptyRateStat();
          return positionAcc;
        }, {});
        return acc;
      }, {})
    };

    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const stats = statsForHandLogEntry(entry);
      const result = handResultForAggregate(entry);
      const evResult = handEvResultForAggregate(entry, result);
      aggregate.hands += 1;
      if (result.won) aggregate.wins += 1;
      if (result.folded) aggregate.folds += 1;
      if (result.showdown) aggregate.showdowns += 1;
      aggregate.netBb = roundBbMetric(aggregate.netBb + result.netBb);
      aggregate.evWins = Math.round((aggregate.evWins + evResult.winShare) * 1000) / 1000;
      aggregate.evNetBb = roundBbMetric(aggregate.evNetBb + evResult.netBb);

      addRateOpportunity(aggregate.preflop.vpip, stats.preflop.vpip, true);
      addRateOpportunity(aggregate.preflop.pfr, stats.preflop.pfr, true);
      addRateOpportunity(aggregate.preflop.threeBet, stats.preflop.threeBet, stats.preflop.threeBetOpportunity);
      addRateOpportunity(aggregate.preflop.foldToThreeBet, stats.preflop.foldToThreeBet, stats.preflop.foldToThreeBetOpportunity);

      trackedCbetStreets.forEach((street) => {
        const cbet = stats.cbet?.[street] || {};
        if (!cbet.opportunity || !trackedPositions.includes(cbet.position)) return;
        addRateOpportunity(aggregate.cbet[street][cbet.position], cbet.made, true);
      });
    });

    aggregate.winRate = ratio(aggregate.wins, aggregate.hands);
    aggregate.bb100 = aggregate.hands ? roundBbMetric((aggregate.netBb / aggregate.hands) * 100) : 0;
    aggregate.evWinRate = ratio(aggregate.evWins, aggregate.hands);
    aggregate.evBb100 = aggregate.hands ? roundBbMetric((aggregate.evNetBb / aggregate.hands) * 100) : 0;
    finalizeRateStats(aggregate.preflop);
    trackedCbetStreets.forEach((street) => finalizeRateStats(aggregate.cbet[street]));
    return aggregate;
  }

  function handEvResultForAggregate(entry, actualResult = handResultForAggregate(entry)) {
    return graphKit.handEvResultForAggregate(entry, actualResult);
  }

  function heroAllInRunoutEquityForAggregate(entry) {
    return graphKit.heroAllInRunoutEquityForAggregate(entry);
  }

  function allInRunoutForAggregate(entry) {
    return graphKit.allInRunoutForAggregate(entry);
  }

  function showdownForAggregate(entry) {
    return graphKit.showdownForAggregate(entry);
  }

  function heroRealizedShareForAggregate(entry, actualResult = handResultForAggregate(entry)) {
    return graphKit.heroRealizedShareForAggregate(entry, actualResult);
  }

  function allInRunoutPotForAggregate(entry, actualResult = handResultForAggregate(entry)) {
    return graphKit.allInRunoutPotForAggregate(entry, actualResult);
  }

  function handResultForAggregate(entry) {
    return graphKit.handResultForAggregate(entry);
  }

  function emptyRateStat() {
    return { made: 0, opportunities: 0, rate: 0 };
  }

  function addRateOpportunity(bucket, made, opportunity) {
    if (!opportunity) return;
    bucket.opportunities += 1;
    if (made) bucket.made += 1;
  }

  function finalizeRateStats(group) {
    Object.values(group || {}).forEach((stat) => {
      stat.rate = ratio(stat.made, stat.opportunities);
    });
  }

  function isHeroTimelineAction(event) {
    return Number(event?.seatId) === 0;
  }

  function actionIsAggressive(event, hand = null) {
    const label = String(event?.label || "");
    const aggressive = event?.tone === "aggressive" || /^(Raise|Bet|All-in)\b/i.test(label);
    if (!aggressive) return false;
    if (String(event?.street || "") !== "preflop") return true;
    return actionHasVoluntaryPreflopChips(event, hand);
  }

  function actionIsVpip(event, hand = null) {
    const label = String(event?.label || "");
    return actionIsAggressive(event, hand)
      || (/^(Call|Complete)\b/i.test(label) && actionHasVoluntaryPreflopChips(event, hand));
  }

  function actionIsFold(event) {
    return event?.tone === "fold" || /^Fold\b/i.test(String(event?.label || ""));
  }

  function heroThreeBetDecision(preflopActions, hand = null) {
    let preHeroRaiseCount = 0;
    let heroRaised = false;
    for (const event of Array.isArray(preflopActions) ? preflopActions : []) {
      if (isHeroTimelineAction(event)) {
        if (preHeroRaiseCount === 1 && !heroRaised) {
          return {
            opportunity: true,
            made: actionIsAggressive(event, hand)
          };
        }
        if (actionIsAggressive(event, hand)) heroRaised = true;
      } else if (actionIsAggressive(event, hand)) {
        preHeroRaiseCount += 1;
      }
    }
    return { opportunity: false, made: false };
  }

  function heroFoldToThreeBetDecision(preflopActions, hand = null) {
    const actions = Array.isArray(preflopActions) ? preflopActions : [];
    const heroOpenIndex = actions.findIndex((event, index) =>
      isHeroTimelineAction(event)
      && actionIsAggressive(event, hand)
      && !actions.slice(0, index).some((item) => !isHeroTimelineAction(item) && actionIsAggressive(item, hand))
    );
    if (heroOpenIndex < 0) return { opportunity: false, made: false };
    const villainThreeBetIndex = actions.findIndex((event, index) =>
      index > heroOpenIndex
      && !isHeroTimelineAction(event)
      && actionIsAggressive(event, hand)
    );
    if (villainThreeBetIndex < 0) return { opportunity: false, made: false };
    const heroResponse = actions.find((event, index) => index > villainThreeBetIndex && isHeroTimelineAction(event));
    return {
      opportunity: Boolean(heroResponse),
      made: actionIsFold(heroResponse)
    };
  }

  function lastAggressiveSeatId(events, hand = null) {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      if (actionIsAggressive(events[index], hand)) return Number(events[index].seatId);
    }
    return null;
  }

  function actionHasVoluntaryPreflopChips(event, hand = null) {
    const stateContribution = seatContributionFromEventState(event);
    if (Number.isFinite(stateContribution)) {
      return stateContribution > forcedBlindForAction(event, hand) + 0.001;
    }
    const amount = actionAmountFromLabel(event?.label);
    return amount === null ? true : amount > 0.001;
  }

  function seatContributionFromEventState(event) {
    const seatId = Number(event?.seatId);
    const seat = Array.isArray(event?.state?.seats)
      ? event.state.seats.find((item) => Number(item?.id) === seatId)
      : null;
    const contribution = Number(seat?.contribution);
    return Number.isFinite(contribution) ? contribution : NaN;
  }

  function forcedBlindForAction(event, hand = null) {
    const seatId = Number(event?.seatId);
    const stateSeat = Array.isArray(event?.state?.seats)
      ? event.state.seats.find((item) => Number(item?.id) === seatId)
      : null;
    const handSeat = Array.isArray(hand?.seats)
      ? hand.seats.find((item) => Number(item?.id) === seatId)
      : null;
    const position = String(
      stateSeat?.position
        || handSeat?.position
        || (seatId === 0 ? hand?.spot?.heroPosition : "")
        || ""
    ).toUpperCase();
    if (position === "SB") return 0.5;
    if (position === "BB") return 1;
    return 0;
  }

  function actionAmountFromLabel(label) {
    const match = String(label || "").match(/(?:Call|Complete|Raise to|Bet|All-in)\s+(-?\d+(?:\.\d+)?)/i);
    if (!match) return null;
    const amount = Number(match[1]);
    return Number.isFinite(amount) ? amount : null;
  }

  root.PokerSimulatorHandLog = {
    trackedCbetStreets,
    trackedPositions,
    finiteNumber,
    roundBbMetric,
    ratio,
    clampRate,
    parseHandLogJsonl,
    handLogJsonl,
    sanitizeHistoryEntry,
    sanitizeHandHistory,
    sanitizeTimelineEvent,
    sanitizeSnapshotSeats,
    sanitizeShowdownPayload,
    sanitizeAllInRunoutPayload,
    sanitizeFoldAnyEvent,
    sanitizeHandLogEntry,
    renderHandLogText,
    extractHandStats,
    statsForHandLogEntry,
    defaultHandStats,
    sanitizeHandStats,
    aggregatePokerStats,
    handEvResultForAggregate,
    heroAllInRunoutEquityForAggregate,
    allInRunoutForAggregate,
    showdownForAggregate,
    heroRealizedShareForAggregate,
    allInRunoutPotForAggregate,
    handResultForAggregate,
    emptyRateStat,
    addRateOpportunity,
    finalizeRateStats,
    isHeroTimelineAction,
    actionIsAggressive,
    actionIsVpip,
    actionIsFold,
    heroThreeBetDecision,
    heroFoldToThreeBetDecision,
    lastAggressiveSeatId,
    actionHasVoluntaryPreflopChips,
    actionAmountFromLabel
  };
})();
