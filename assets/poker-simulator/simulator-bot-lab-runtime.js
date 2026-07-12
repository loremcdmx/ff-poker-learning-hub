(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const engine = options.engine || {};
    const botLabKit = options.botLabKit || root.PokerSimulatorBotLab || {};
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const saveSessionData = typeof options.saveSessionData === "function" ? options.saveSessionData : () => {};
    const render = typeof options.render === "function" ? options.render : () => {};
    const randomChance = typeof options.randomChance === "function" ? options.randomChance : () => false;
    const heroMaxContribution = typeof options.heroMaxContribution === "function" ? options.heroMaxContribution : () => 0;
    const clampBetValue = typeof options.clampBetValue === "function" ? options.clampBetValue : (value) => Number(value || 0);
    const sampleSize = Math.max(1, Number(options.sampleSize || 240));
    const targetedProbeSize = Math.max(0, Number(options.targetedProbeSize || 80));
    const probeAttempts = Math.max(1, Number(options.probeAttempts || 80));

    function state() {
      return getState() || {};
    }

    function settings() {
      return state().settings || {};
    }

    function runBotLabSample() {
      const current = state();
      let targetedProbeActual = 0;
      const lab = botLabKit.createAccumulator?.() || { counts: {}, byPosition: {}, byProfile: {}, byStreet: {}, bySpot: {} };
      const profiles = {};
      for (let index = 0; index < sampleSize; index += 1) {
        const table = engine.createTable?.({ id: 99, settings: settings(), handNo: 100000 + index });
        if (!table) continue;
        botLabKit.recordProfiles?.(profiles, table.seats);
        simulateBotLabHand(table);
        botLabKit.recordTimeline?.(lab, table);
      }
      for (let index = 0; index < targetedProbeSize; index += 1) {
        const targetStreet = index % 2 === 0 ? "turn" : "river";
        const table = createBotLabProbeTable(200000 + index, targetStreet);
        if (!table) continue;
        targetedProbeActual += 1;
        botLabKit.recordProfiles?.(profiles, (table.seats || []).filter((seat) => Number(seat.id) === Number(table.activeVillain)));
        const startSeq = table.timelineSeq || 0;
        engine.resolveBotAction?.(table, "check", 0, settings());
        botLabKit.recordTimeline?.(lab, table, startSeq);
      }
      current.botLab = {
        sampleSize: sampleSize + targetedProbeActual,
        baseSampleSize: sampleSize,
        targetedProbeSize: targetedProbeActual,
        counts: lab.counts,
        profiles,
        byPosition: lab.byPosition,
        byProfile: lab.byProfile,
        byStreet: lab.byStreet,
        bySpot: lab.bySpot,
        settings: {
          difficulty: settings().difficulty,
          botLineup: settings().botLineup
        },
        warnings: botLabKit.warnings?.(lab, botLabBandSettings(settings())) || [],
        createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      };
      saveSessionData();
      render("bot-lab");
      return current.botLab;
    }

    function createBotLabProbeTable(handNo, targetStreet = "turn") {
      const playerCount = Math.max(3, Number(settings().playerCount || 8));
      const targetSettings = { ...settings(), pack: "basic-vpip", playerCount };
      let table = null;
      for (let attempt = 0; attempt < probeAttempts; attempt += 1) {
        const candidate = engine.createTable?.({ id: 98, settings: targetSettings, handNo: handNo + attempt * 1000 });
        if (candidate?.heroPosition === "BTN" && (candidate.seats || []).some((seat) => seat.position === "BB" && !seat.isHero)) {
          table = candidate;
          break;
        }
      }
      if (!table) return null;

      const villain = (table.seats || []).find((seat) => seat.position === "BB" && !seat.isHero);
      if (!villain) return null;
      // F042 fix (2026-07-01): stage the probe ON the TARGET street, not one street
      // early. A probe spot is the OOP villain betting the target street after the
      // prior street checked through (engine isOpponentProbeSpot); the bot-lab
      // classifier records probeTurn/probeRiver by the street the villain ACTS on
      // (simulator-bot-lab.js detailedSpots: event.street === "turn"/"river"). The
      // old mapping (river→turn, turn→flop) made the villain act one street early,
      // so a "river" target recorded probeTurn and a "turn" target recorded a
      // flop bet — probeRiver was never filled and probeTurn was mislabeled.
      const street = targetStreet === "river" ? "river" : "turn";
      const boardCount = street === "river" ? 5 : 4;

      (table.seats || []).forEach((seat) => {
        seat.folded = !(seat.isHero || seat.id === villain.id);
        seat.foldedAt = seat.folded ? "preflop" : "";
      });
      table.activeVillain = villain.id;
      table.contestingSeatIds = [0, villain.id];
      table.street = street;
      table.board = botLabBoardCards(table, boardCount);
      table.status = "playing";
      table.pot = street === "river" ? 7.4 : 5.2;
      table.currentBet = 0;
      table.lastRaiseSize = 0;
      table.minRaiseTo = 1;
      table.toCall = 0;
      table.canCheck = true;
      table.heroTurn = false;
      table.busy = true;
      table.villainActedThisStreet = true;
      table.streetAggressorSeatId = null;
      table.previousStreetAggressorSeatId = null;
      // F043 fix (2026-07-01): a probe scenario REQUIRES the previous street to have
      // checked through — that is the definitional precondition of a probe spot for
      // BOTH turn and river (engine isOpponentProbeSpot returns false otherwise).
      // The old `street === "turn"` only set it for the turn-staged case, so once
      // F042 stages the river target correctly, the river probe would fail the
      // checked-through gate and be classified as a barrel, never a probe. Both
      // staged streets are probe streets by construction here, so pin it true.
      table.previousStreetCheckedThrough = true;
      table.preflopAggressorSeatId = 0;
      table.initiativeSeatId = 0;
      table.villainTurnRiverBets = 0;
      table.contributions = {};
      table.seatBets = {};
      table.seatActions = {};
      table.lastAction = `${engine.streetLabel?.(street) || street} checked through target`;
      return table;
    }

    function botLabBoardCards(table, count) {
      const deck = Array.isArray(table?.deck) ? table.deck : [];
      const board = [];
      while (board.length < count && deck.length) {
        const card = deck.shift();
        if (card) board.push(card);
      }
      return board;
    }

    function simulateBotLabHand(table) {
      let guard = 0;
      while (table?.status === "playing" && guard < 12) {
        guard += 1;
        if (!table.heroTurn || table.busy) break;
        const action = botLabHeroAction(table);
        const outcome = engine.startHeroAction?.(table, action, settings(), botLabHeroOptions(table, action));
        if (!outcome?.accepted) break;
        if (outcome.needsBot) {
          engine.resolveBotAction?.(table, outcome.heroAction, outcome.heroAmount, settings());
        }
      }
    }

    function botLabHeroAction(table) {
      if (Number(table?.toCall || 0) > 0) {
        if (table.street === "preflop" && Number(table.toCall || 0) <= 1 && randomChance(0.42)) return "raise-custom";
        return "call";
      }
      if (table?.street === "preflop") {
        if (table.canCheck && randomChance(0.72)) return "check";
        return "raise-custom";
      }
      return "check";
    }

    function botLabHeroOptions(table, action) {
      if (action !== "raise-custom" && action !== "bet-custom") return {};
      const max = heroMaxContribution(table);
      const min = Number(table?.toCall || 0) > 0
        ? Number(table.minRaiseTo || Math.max(2, Number(table.currentBet || 1) * 2))
        : Number(table?.minRaiseTo || 2);
      return { amount: clampBetValue(min, { min: Math.min(min, max), max }) };
    }

    function botLabBandSettings(input = settings()) {
      return {
        difficulty: engine.normalizeDifficulty?.(input?.difficulty) || String(input?.difficulty || "standard"),
        lineup: engine.normalizeBotLineup?.(input?.botLineup) || String(input?.botLineup || "single")
      };
    }

    return {
      runBotLabSample,
      createBotLabProbeTable,
      botLabBoardCards,
      simulateBotLabHand,
      botLabHeroAction,
      botLabHeroOptions,
      botLabBandSettings
    };
  }

  root.PokerSimulatorBotLabRuntime = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
