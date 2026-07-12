(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function attachLayoutSmokeHooks(publicApi, options = {}) {
    const state = typeof options.state === "function" ? options.state : () => ({ settings: {}, tables: [] });
    const sessionSnapshot = typeof options.sessionSnapshot === "function" ? options.sessionSnapshot : () => ({});
    const flushRender = typeof options.flushRender === "function" ? options.flushRender : noop;
    const markAllTablesDirty = typeof options.markAllTablesDirty === "function" ? options.markAllTablesDirty : noop;
    const sanitizeTableCount = typeof options.sanitizeTableCount === "function" ? options.sanitizeTableCount : (count) => Math.max(1, Math.min(4, Number(count) || 1));
    const sanitizePlayerCount = typeof options.sanitizePlayerCount === "function" ? options.sanitizePlayerCount : (count) => Math.max(2, Math.min(9, Math.floor(Number(count) || 8)));
    const createTable = typeof options.createTable === "function" ? options.createTable : null;
    const engine = options.engine || {};
    const applyOpponentLearningToTable = typeof options.applyOpponentLearningToTable === "function" ? options.applyOpponentLearningToTable : (table) => table;
    const visibleSeatBetAmount = typeof options.visibleSeatBetAmount === "function" ? options.visibleSeatBetAmount : (_table, _seatId, amount) => amount;
    const formatAmount = typeof options.formatAmount === "function" ? options.formatAmount : (value) => String(value ?? "");
    const primeShowdownAnimation = typeof options.primeShowdownAnimation === "function" ? options.primeShowdownAnimation : noop;
    if (typeof options.annotateActionAnimationMotion !== "function") options.annotateActionAnimationMotion = noop;
    if (typeof options.primeActionReveal !== "function") options.primeActionReveal = noop;
    const setPaused = typeof options.setPaused === "function" ? options.setPaused : noop;

    function currentState() {
      const current = state() || {};
      if (!current.settings) current.settings = {};
      if (!Array.isArray(current.tables)) current.tables = [];
      return current;
    }

    function clearSmokeRuntimeQueues() {
      options.clearAllActionRevealTimers?.();
      options.clearAllVisualTimers?.();
      options.clearAllAutoDealQueues?.();
      options.clearAllActionClocks?.();
      options.clearAllBotResponseTimers?.();
    }

    function requireCreateTable() {
      if (typeof createTable !== "function") throw new Error("PokerSimulatorSmokeScenarios requires createTable");
      return createTable;
    }

    function requireEngineTableFactory() {
      if (typeof engine.createTable !== "function") throw new Error("PokerSimulatorSmokeScenarios requires engine.createTable");
      return engine.createTable.bind(engine);
    }

    publicApi.__tableStateSmoke = () => {
      const current = currentState();
      const nowMs = Date.now();
      // Mirror isActionSequenceActive (visual-timers): the action-reveal timeline
      // is still playing while actionRevealUntil is in the future. Read the visual
      // view first, falling back to the table field, exactly like visualNumber.
      const actionSequenceActive = (table) => {
        const view = table && table.view && typeof table.view === "object" ? table.view : null;
        const until = Number(
          view && Object.prototype.hasOwnProperty.call(view, "actionRevealUntil")
            ? view.actionRevealUntil
            : table?.actionRevealUntil
        ) || 0;
        return until > nowMs;
      };
      return {
        started: Boolean(current.started),
        activeTableId: Number(current.activeTableId || 0),
        settings: { ...(current.settings || {}) },
        tables: current.tables.map((table) => {
          const hero = Array.isArray(table?.seats) ? table.seats.find((seat) => seat?.isHero) : null;
          return {
            id: table?.id,
            handNo: table?.handNo,
            tournamentHandNo: table?.tournamentHandNo,
            status: table?.status,
            street: table?.street,
            heroTurn: Boolean(table?.heroTurn),
            busy: Boolean(table?.busy),
            autoQueued: Boolean(table?.autoQueued),
            autoDealDelayMs: Number(table?.autoDealDelayMs || 0),
            tournamentComplete: Boolean(table?.tournamentComplete),
            heroBusted: Boolean(table?.heroBusted),
            heroStack: Number(hero?.stack || 0),
            heroFolded: Boolean(hero?.folded),
            // A live action-reveal sequence (bot fold cascade, etc.) keeps
            // re-emitting decorative muck nodes; a settle check that ignores it
            // can break on a momentary gap between two turbo fold animations.
            actionSequenceActive: actionSequenceActive(table)
          };
        })
      };
    };

    publicApi.__dealHeroAt = (position, count) => {
      const current = currentState();
      const n = sanitizeTableCount(count == null ? current.settings?.tableCount : count);
      current.settings.tableCount = n;
      current.settings.autoDeal = false;
      current.settings.turboMode = true;
      current.started = true;
      clearSmokeRuntimeQueues();
      current.tables = Array.from({ length: n }, (_, index) =>
        requireCreateTable()(index + 1, null, { testHeroPosition: String(position || ""), persistSession: false }));
      current.activeTableId = 1;
      markAllTablesDirty();
      flushRender("api-deal-hero-at");
      return {
        ...sessionSnapshot(),
        smokeTables: current.tables.map((table) => {
          const hero = table.seats.find((seat) => seat.isHero) || null;
          const amount = visibleSeatBetAmount(table, 0, Number(table.seatBets?.[0] || 0));
          return {
            id: table.id,
            pos: hero?.position || "",
            amount: Number(amount) > 0 ? formatAmount(amount) : ""
          };
        })
      };
    };

    publicApi.__showPostflopHeroBetSmoke = (position, count, playerCount, options = {}) => {
      // `options.heroTurn` (default false) flips the hero to-act so the full bet
      // widget renders (presets + slider + stepper + action row) instead of the
      // short "Ожидание" box. Layout gates that only need the dock anchor leave
      // it off; the bet-box-vs-seat overlap gate turns it on to measure the real
      // (tall) control surface.
      const heroTurn = Boolean(options && options.heroTurn);
      // `options.street` ("preflop") and `options.facingRaise` let the overlap
      // gate exercise the other tall dock variants (preflop open pad, facing a
      // raise Fold/Call/Raise) — they share the count=1 dock footprint.
      const preflop = options && options.street === "preflop";
      const facingRaise = Boolean(options && options.facingRaise);
      const current = currentState();
      const n = sanitizeTableCount(count == null ? current.settings?.tableCount : count);
      current.settings.tableCount = n;
      if (playerCount != null) {
        current.settings.playerCount = sanitizePlayerCount(playerCount);
      }
      current.started = true;
      clearSmokeRuntimeQueues();
      current.tables = Array.from({ length: n }, (_, index) => {
        const table = requireCreateTable()(index + 1, null, { testHeroPosition: String(position || "BB"), persistSession: false });
        table.status = "playing";
        table.street = preflop ? "preflop" : "turn";
        table.board = preflop ? [] : ["Ks", "8d", "Qh", "Js"];
        table.pot = preflop ? 1.5 : 5;
        table.currentBet = facingRaise ? 4 : 1.5;
        table.toCall = facingRaise ? 2.5 : 0;
        table.result = "";
        table.busy = false;
        table.activeVillain = null;
        table.actionAnimations = [];
        table.betAnimations = [];
        table.seatBets = {};
        if (heroTurn) {
          // canHeroAct() also requires a live, unfolded hero with chips behind —
          // all set in the per-seat loop below; toCall 0 + canCheck renders the
          // bet (not facing-raise) variant of the widget. Clear the deal/action
          // reveal locks the fresh createTable() leaves in table.view so
          // dealAnimationActive()/isActionRevealLocked() don't suppress the dock.
          table.heroTurn = true;
          table.canCheck = !facingRaise;
          table.minRaiseTo = Math.max(1, Number(table.currentBet || 0) + Number(table.toCall || 0));
          table.lastRaiseSize = facingRaise ? 2.5 : 0;
          ["dealRevealUntil", "actionRevealUntil", "actionControlUnlockAt"].forEach((key) => {
            if (table.view && typeof table.view === "object") table.view[key] = 0;
            table[key] = 0;
          });
        }
        table.seats.forEach((seat) => {
          if (!seat) return;
          seat.folded = false;
          seat.foldedAt = "";
          seat.revealed = Boolean(seat.isHero);
          seat.stack = Math.max(10, Number(seat.stack || 0));
          if (!Array.isArray(seat.cards) || seat.cards.length < 2) {
            seat.cards = seat.isHero ? ["5s", "Qd"] : ["Ah", "Ac"];
          }
          table.seatBets[seat.id] = seat.isHero ? 1.5 : (Number(seat.id) % 2 ? 2 : 0.5);
        });
        return table;
      });
      current.activeTableId = 1;
      markAllTablesDirty();
      flushRender("api-postflop-hero-bet-smoke");
      return {
        ...sessionSnapshot(),
        smokeTables: current.tables.map((table) => {
          const hero = table.seats.find((seat) => seat.isHero) || null;
          return {
            id: table.id,
            pos: hero?.position || "",
            board: table.board.slice(),
            amount: formatAmount(table.seatBets?.[0] || 0)
          };
        })
      };
    };

    publicApi.__showPreflopAllInSeatBoxSmoke = () => {
      const current = currentState();
      const smokeSettings = {
        ...current.settings,
        tableCount: 1,
        playerCount: 6,
        simulationMode: "tournament",
        tournamentStartingStackBb: 20,
        actionTimerSeconds: 0,
        turboMode: false,
        trainingMode: false,
        setupCompleted: true
      };
      current.started = true;
      current.settings = smokeSettings;
      current.handSeq += 1;
      setPaused(false);
      clearSmokeRuntimeQueues();

      const heroCards = ["As", "Ad"];
      const board = ["2c", "7d", "9h"];
      const table = applyOpponentLearningToTable(requireEngineTableFactory()({
        id: 1,
        settings: smokeSettings,
        handNo: current.handSeq,
        previousTable: null,
        tournamentHandNo: 1
      }));
      const hero = table.seats.find((seat) => seat?.isHero) || table.seats[0];
      const villain = table.seats.find((seat) => seat && !seat.isHero) || table.seats[1];
      table.seats.forEach((seat) => {
        if (!seat) return;
        const live = seat.id === hero?.id || seat.id === villain?.id;
        seat.folded = !live;
        seat.foldedAt = live ? "" : "preflop";
        seat.revealed = seat.id === hero?.id;
        seat.lobbyState = "active";
        seat.stack = seat.id === hero?.id ? 0 : live ? 20 : 0;
        seat.cards = seat.id === hero?.id ? heroCards.slice() : live ? ["Kc", "Qs"] : [];
      });
      table.heroHand = heroCards.slice();
      table.board = board.slice();
      table.street = "flop";
      table.status = "playing";
      table.simulationMode = "tournament";
      table.tournamentHandNo = 1;
      table.result = "";
      table.resultKind = "";
      table.heroBusted = false;
      table.busy = true;
      table.heroTurn = false;
      table.currentBet = 0;
      table.lastRaiseSize = 0;
      table.minRaiseTo = 1;
      table.toCall = 0;
      table.canCheck = false;
      table.pot = 40;
      table.seatBets = {};
      table.contributions = { [hero?.id ?? 0]: 20, [villain?.id ?? 1]: 20 };
      table.contestingSeatIds = [hero?.id ?? 0, villain?.id ?? 1];
      table.activeSeatIds = table.contestingSeatIds.slice();
      table.potAwards = [];
      table.showdown = null;
      table.allInRunout = null;
      table.actionAnimations = [];
      table.actionTimeline = [{
        phase: "flop",
        street: "flop",
        label: "Hero all-in, flop action pending",
        pot: 40,
        board: board.slice(),
        state: {
          street: "flop",
          pot: 40,
          currentBet: 0,
          toCall: 0,
          canCheck: false,
          heroTurn: false,
          activeVillain: table.activeVillain,
          board: board.slice()
        }
      }];
      current.tables = [table];
      current.activeTableId = 1;
      markAllTablesDirty();
      flushRender("api-preflop-all-in-seat-box-smoke");
      return sessionSnapshot();
    };

    publicApi.__showAllInRunoutTimingSmoke = (smokeOptions = {}) => {
      const current = currentState();
      const tableCount = Math.max(1, Math.min(4, Math.floor(Number(smokeOptions?.tableCount || 1))));
      const pendingCall = Boolean(smokeOptions?.pendingCall);
      const startedAtStreet = String(smokeOptions?.startedAtStreet || "preflop").toLowerCase() === "river"
        ? "river"
        : "preflop";
      const smokeSettings = {
        ...current.settings,
        tableCount,
        playerCount: 8,
        simulationMode: "tournament",
        tournamentStartingStackBb: 5,
        tournamentLevelHands: 8,
        tournamentBlindLevels: "1,2,3,5,8,12,20",
        actionTimerSeconds: 0,
        turboMode: true,
        trainingMode: false,
        setupCompleted: true
      };
      current.started = true;
      current.settings = smokeSettings;
      current.handSeq += tableCount;
      const firstHandNo = current.handSeq - tableCount + 1;
      setPaused(false);
      clearSmokeRuntimeQueues();

      const board = ["2c", "7d", "9h", "Jc", "Qd"];
      const heroCards = ["As", "Kd"];
      const villainCards = ["Qh", "Qs"];

      const makeRunoutTable = (id, index) => {
        const table = applyOpponentLearningToTable(requireEngineTableFactory()({
          id,
          settings: smokeSettings,
          handNo: firstHandNo + index,
          previousTable: null,
          tournamentHandNo: index + 1
        }));
        const hero = table.seats.find((seat) => seat.isHero) || table.seats[0];
        const villain = table.seats.find((seat) => seat && !seat.isHero) || table.seats[1];
        table.seats.forEach((seat) => {
          if (!seat) return;
          const live = seat.id === hero?.id || seat.id === villain?.id;
          seat.folded = !live;
          seat.foldedAt = live ? "" : "preflop";
          seat.revealed = live;
          seat.stack = live && seat.id === villain?.id ? 10 : 0;
          if (!live) seat.cards = [];
        });
        if (hero) {
          hero.cards = heroCards.slice();
          hero.stack = 0;
          hero.folded = false;
          hero.foldedAt = "";
          hero.revealed = true;
        }
        if (villain) {
          villain.cards = villainCards.slice();
          villain.stack = 10;
          villain.folded = false;
          villain.foldedAt = "";
          villain.revealed = true;
        }
        table.heroHand = heroCards.slice();
        table.board = board.slice();
        table.street = "showdown";
        table.status = "showdown";
        table.simulationMode = "tournament";
        table.tournamentHandNo = index + 1;
        table.result = "CO wins 10 BB";
        table.resultKind = "lost";
        table.heroBusted = true;
        table.busy = false;
        table.heroTurn = false;
        table.currentBet = 0;
        table.lastRaiseSize = 0;
        table.minRaiseTo = 1;
        table.toCall = 0;
        table.canCheck = false;
        table.pot = 10;
        table.seatBets = {};
        table.contributions = {};
        table.contestingSeatIds = [hero?.id ?? 0, villain?.id ?? 1];
        table.activeSeatIds = table.contestingSeatIds.slice();
        table.potAwards = [{ seatId: villain?.id ?? 1, amount: 10, reason: "timing-smoke" }];
        table.winningCards = ["Qh", "Qs", "Qd", "Jc", "9h"];
        table.showdown = {
          schema: "poker-simulator-showdown-v1",
          allIn: true,
          pot: 10,
          result: table.result,
          winningHandName: "Three of a kind",
          winningCards: table.winningCards.slice(),
          winners: [{
            seatId: villain?.id ?? 1,
            position: villain?.position || "CO",
            name: villain?.name || "CO",
            isHero: false
          }],
          participants: [
            {
              seatId: hero?.id ?? 0,
              position: hero?.position || "Hero",
              name: hero?.name || "Hero",
              isHero: true,
              cards: heroCards.slice(),
              handName: "High card",
              score: [0, 14, 13, 12, 11, 9]
            },
            {
              seatId: villain?.id ?? 1,
              position: villain?.position || "CO",
              name: villain?.name || "CO",
              isHero: false,
              cards: villainCards.slice(),
              handName: "Three of a kind",
              score: [3, 12, 11, 9]
            }
          ]
        };
        table.allInRunout = {
          startedAtStreet,
          startBoard: startedAtStreet === "river" ? board.slice() : [],
          finalBoard: board.slice(),
          pot: 10,
          participants: table.showdown.participants.map((participant) => ({
            seatId: participant.seatId,
            cards: participant.cards.slice()
          })),
          stages: [
            { street: "preflop", board: [], equities: [{ seatId: hero?.id ?? 0, equity: 0.32 }, { seatId: villain?.id ?? 1, equity: 0.68 }] },
            { street: "flop", board: board.slice(0, 3), equities: [{ seatId: hero?.id ?? 0, equity: 0.18 }, { seatId: villain?.id ?? 1, equity: 0.82 }] },
            { street: "turn", board: board.slice(0, 4), equities: [{ seatId: hero?.id ?? 0, equity: 0.09 }, { seatId: villain?.id ?? 1, equity: 0.91 }] },
            { street: "river", board: board.slice(0, 5), equities: [{ seatId: hero?.id ?? 0, equity: 0 }, { seatId: villain?.id ?? 1, equity: 1 }] }
          ]
        };
        table.actionAnimations = pendingCall ? [{
          key: `${table.handNo}-pending-all-in-call`,
          seatId: villain?.id ?? 1,
          label: "Call 5 BB",
          tone: "passive",
          street: startedAtStreet,
          boardLength: startedAtStreet === "river" ? 5 : 0,
          seq: 1,
          allInResponse: true
        }] : [];
        table.seatActions = pendingCall ? {
          [villain?.id ?? 1]: {
            type: "call",
            label: "Call 5 BB",
            tone: "passive",
            street: startedAtStreet,
            seq: 1
          }
        } : {};
        table.actionTimeline = [{
          phase: "result",
          street: "showdown",
          label: table.result,
          pot: 10,
          board: board.slice(),
          state: {
            street: "showdown",
            pot: 10,
            currentBet: 0,
            toCall: 0,
            canCheck: false,
            heroTurn: false,
            activeVillain: table.activeVillain,
            board: board.slice()
          }
        }];
        if (pendingCall) {
          table.visualActionBaseState = {
            handNo: Number(table.handNo || 0),
            street: startedAtStreet,
            contestingSeatIds: table.contestingSeatIds.slice(),
            seats: table.seats.map((seat) => ({
              id: Number(seat.id),
              stack: Number(seat.stack || 0),
              lobbyState: String(seat.lobbyState || "active"),
              folded: Boolean(seat.folded)
            }))
          };
          options.annotateActionAnimationMotion(table);
          options.primeActionReveal(table, {
            previousBoardLength: startedAtStreet === "river" ? 5 : 0,
            forceFreshSequence: true
          });
        }
        primeShowdownAnimation(table);
        return table;
      };

      current.tables = Array.from({ length: tableCount }, (_, index) => makeRunoutTable(index + 1, index));
      current.activeTableId = 1;
      markAllTablesDirty();
      flushRender("api-all-in-runout-timing-smoke");
      return sessionSnapshot();
    };

    publicApi.__showBotOnlySidePotCascadeSmoke = () => {
      const current = currentState();
      const smokeSettings = {
        ...current.settings,
        tableCount: 1,
        playerCount: 6,
        simulationMode: "tournament",
        tournamentStartingStackBb: 20,
        actionTimerSeconds: 0,
        turboMode: true,
        trainingMode: false,
        setupCompleted: true
      };
      current.started = true;
      current.settings = smokeSettings;
      current.handSeq += 1;
      setPaused(false);
      clearSmokeRuntimeQueues();

      const handNo = current.handSeq;
      const board = ["Ah", "Kd", "7c", "2s", "Qd"];
      const table = applyOpponentLearningToTable(requireEngineTableFactory()({
        id: 1,
        settings: smokeSettings,
        handNo,
        previousTable: null
      }));
      const hero = table.seats.find((seat) => seat?.isHero) || table.seats[0];
      const villains = table.seats.filter((seat) => seat && !seat.isHero);
      const bettor = villains[0] || table.seats[1];
      const caller = villains[1] || table.seats[2] || bettor;
      table.seats.forEach((seat) => {
        if (!seat) return;
        const live = seat.id === hero?.id || seat.id === bettor?.id || seat.id === caller?.id;
        seat.folded = !live;
        seat.foldedAt = live ? "" : "preflop";
        seat.lobbyState = "active";
        seat.cards = seat.id === hero?.id
          ? ["As", "Ks"]
          : seat.id === bettor?.id
          ? ["Qh", "Qs"]
          : seat.id === caller?.id
          ? ["Jc", "Tc"]
          : [];
        seat.revealed = seat.id === hero?.id;
        seat.stack = seat.id === hero?.id ? 0 : live ? 12 : 0;
      });
      table.heroHand = ["As", "Ks"];
      table.board = board.slice();
      table.street = "showdown";
      table.status = "showdown";
      table.result = "CO wins 38 BB";
      table.resultKind = "lost";
      table.heroBusted = true;
      table.busy = false;
      table.heroTurn = false;
      table.currentBet = 0;
      table.lastRaiseSize = 0;
      table.minRaiseTo = 1;
      table.toCall = 0;
      table.canCheck = false;
      table.pot = 38;
      table.seatBets = {};
      table.contributions = {};
      table.contestingSeatIds = [hero?.id ?? 0, bettor?.id ?? 1, caller?.id ?? 2];
      table.activeSeatIds = table.contestingSeatIds.slice();
      table.potAwards = [{ seatId: bettor?.id ?? 1, amount: 38, reason: "bot-only-sidepot-cascade-smoke" }];
      table.winningCards = ["Qh", "Qs", "Qd", "Ah", "Kd"];
      table.showdown = {
        schema: "poker-simulator-showdown-v1",
        allIn: false,
        pot: 38,
        result: table.result,
        winningHandName: "Three of a kind",
        winningCards: table.winningCards.slice(),
        winners: [{
          seatId: bettor?.id ?? 1,
          position: bettor?.position || "CO",
          name: bettor?.name || "CO",
          isHero: false
        }],
        participants: table.contestingSeatIds.map((seatId) => {
          const seat = table.seats.find((candidate) => Number(candidate?.id) === Number(seatId));
          return {
            seatId,
            position: seat?.position || "",
            name: seat?.name || "",
            isHero: Boolean(seat?.isHero),
            cards: Array.isArray(seat?.cards) ? seat.cards.slice() : [],
            handName: seat?.id === bettor?.id ? "Three of a kind" : "Pair",
            score: seat?.id === bettor?.id ? [3, 12, 14, 13] : [1, 14, 13, 12]
          };
        })
      };
      table.actionAnimations = [
        {
          key: `${handNo}-sidepot-flop-bet`,
          seatId: bettor?.id ?? 1,
          label: "Bet 4 BB",
          tone: "aggressive",
          street: "flop",
          boardLength: 3,
          seq: 1
        },
        {
          key: `${handNo}-sidepot-flop-call`,
          seatId: caller?.id ?? 2,
          label: "Call 4 BB",
          tone: "passive",
          street: "flop",
          boardLength: 3,
          seq: 2
        },
        {
          key: `${handNo}-sidepot-turn-check`,
          seatId: bettor?.id ?? 1,
          label: "Check",
          tone: "passive",
          street: "turn",
          boardLength: 4,
          seq: 3
        },
        {
          key: `${handNo}-sidepot-river-bet`,
          seatId: caller?.id ?? 2,
          label: "Bet 8 BB",
          tone: "aggressive",
          street: "river",
          boardLength: 5,
          seq: 4
        }
      ];
      table.betAnimations = [
        {
          key: `${handNo}-sidepot-flop-bet-chip`,
          actionKey: `${handNo}-sidepot-flop-bet`,
          actionSeq: 1,
          seatId: bettor?.id ?? 1,
          amount: 4,
          street: "flop",
          boardLength: 3
        },
        {
          key: `${handNo}-sidepot-flop-call-chip`,
          actionKey: `${handNo}-sidepot-flop-call`,
          actionSeq: 2,
          seatId: caller?.id ?? 2,
          amount: 4,
          street: "flop",
          boardLength: 3
        },
        {
          key: `${handNo}-sidepot-river-bet-chip`,
          actionKey: `${handNo}-sidepot-river-bet`,
          actionSeq: 4,
          seatId: caller?.id ?? 2,
          amount: 8,
          street: "river",
          boardLength: 5
        }
      ];
      table.actionTimeline = table.actionAnimations.map((action) => ({
        phase: "action",
        street: action.street,
        label: action.label,
        seatId: action.seatId,
        board: board.slice(0, action.boardLength),
        pot: table.pot
      }));
      options.annotateActionAnimationMotion(table);
      options.primeActionReveal(table, { previousBoardLength: 0 });
      current.tables = [table];
      current.activeTableId = 1;
      markAllTablesDirty();
      flushRender("api-bot-only-sidepot-cascade-smoke");
      return sessionSnapshot();
    };

    const showFinishedRevealSmoke = (requestedTableCount = 4, requestedPlayerCount = 8) => {
      const current = currentState();
      const smokeTableCount = [1, 2, 4].includes(Number(requestedTableCount))
        ? Number(requestedTableCount)
        : 4;
      const smokePlayerCount = sanitizePlayerCount(requestedPlayerCount);
      const smokeSettings = {
        ...current.settings,
        tableCount: smokeTableCount,
        playerCount: smokePlayerCount,
        simulationMode: "tournament",
        tournamentStartingStackBb: 30,
        tournamentLevelHands: 8,
        tournamentBlindLevels: "1,2,3,5,8,12,20",
        difficulty: "standard",
        autoDeal: false,
        turboMode: true,
        trainingMode: false,
        revealOpponentCardsOnFinish: true,
        setupCompleted: true
      };
      current.started = true;
      current.settings = smokeSettings;
      current.handSeq += 1;
      setPaused(false);
      clearSmokeRuntimeQueues();

      const boards = [
        ["Ah", "Kd", "7c", "2s", "Jd"],
        ["Qh", "Qs", "9c", "4d", "2h"],
        ["Tc", "9d", "8s", "7h", "2c"],
        ["Ac", "Ad", "5h", "5s", "Kh"]
      ];
      current.tables = Array.from({ length: smokeTableCount }, (_, index) => {
        const handNo = current.handSeq + index;
        const table = applyOpponentLearningToTable(requireEngineTableFactory()({
          id: index + 1,
          settings: smokeSettings,
          handNo,
          previousTable: null,
          tournamentHandNo: index + 1
        }));
        const board = boards[index % boards.length].slice();
        const hero = table.seats.find((seat) => seat?.isHero) || table.seats[0];
        const villains = table.seats.filter((seat) => seat && !seat.isHero);
        const winner = villains[0] || table.seats[1] || hero;
        const caller = villains[1] || winner;
        table.handNo = handNo;
        table.status = "showdown";
        table.street = "showdown";
        table.board = board.slice();
        table.heroHand = ["As", "Qd"];
        table.pot = 14 + index;
        table.result = `${winner?.position || "BB"} wins ${formatAmount(table.pot)}`;
        table.resultKind = "lost";
        table.busy = false;
        table.heroTurn = false;
        table.currentBet = 0;
        table.lastRaiseSize = 0;
        table.minRaiseTo = 1;
        table.toCall = 0;
        table.canCheck = false;
        table.seatBets = {
          0: 3,
          [winner?.id ?? 1]: 5,
          [caller?.id ?? 2]: 2
        };
        table.contributions = { ...table.seatBets };
        table.activeSeatIds = [0, winner?.id ?? 1, caller?.id ?? 2];
        table.contestingSeatIds = table.activeSeatIds.slice();
        table.potAwards = [{ seatId: winner?.id ?? 1, amount: table.pot, reason: "finished-reveal-smoke" }];
        table.winningCards = [winner?.cards?.[0] || "Kh", winner?.cards?.[1] || "Kc", ...board.slice(0, 3)];
        table.seats.forEach((seat) => {
          if (!seat) return;
          seat.lobbyState = "active";
          seat.stack = Math.max(8, Number(seat.stack || 0));
          seat.folded = ![0, winner?.id ?? 1, caller?.id ?? 2].includes(Number(seat.id));
          // Use a postflop fold marker so the optional finished-hand learning
          // reveal intentionally exposes every folded villain in this dense QA.
          seat.foldedAt = seat.folded ? "flop" : "";
          // Stress the optional "reveal opponents after finish" learning view:
          // every villain hand is face-up, including folded seats. This is the
          // exact dense P8 state that exposed detached/overlapping ownership.
          seat.revealed = !seat.isHero;
          if (seat.isHero) {
            seat.cards = ["As", "Qd"];
          } else if (Number(seat.id) === Number(winner?.id ?? 1)) {
            seat.cards = ["Kh", "Kc"];
          } else if (Number(seat.id) === Number(caller?.id ?? 2)) {
            seat.cards = ["Jc", "Jh"];
          } else {
            seat.cards = ["6c", "6d"];
          }
        });
        table.showdown = {
          schema: "poker-simulator-showdown-v1",
          allIn: false,
          pot: table.pot,
          result: table.result,
          winningHandName: "Pair",
          winningCards: table.winningCards.slice(),
          winners: [{
            seatId: winner?.id ?? 1,
            position: winner?.position || "BB",
            name: winner?.name || "BB",
            isHero: Boolean(winner?.isHero)
          }],
          participants: [hero, winner, caller].filter(Boolean).map((seat) => ({
            seatId: seat.id,
            position: seat.position || "",
            name: seat.name || "",
            isHero: Boolean(seat.isHero),
            cards: Array.isArray(seat.cards) ? seat.cards.slice(0, 2) : [],
            handName: "Pair",
            score: [1, 13, 12, 11]
          }))
        };
        table.actionAnimations = [];
        table.betAnimations = [];
        // createTable() can seed a real preflop action badge. Finished-reveal
        // geometry must measure the terminal fixture, not a random stale badge
        // that adds a panel grid row and detaches the owner hand visually.
        table.seatActions = {};
        table.actionTimeline = [{
          phase: "result",
          street: "showdown",
          label: table.result,
          pot: table.pot,
          board: board.slice(),
          state: {
            street: "showdown",
            pot: table.pot,
            currentBet: 0,
            toCall: 0,
            canCheck: false,
            heroTurn: false,
            activeVillain: winner?.id ?? 1,
            board: board.slice()
          }
        }];
        primeShowdownAnimation(table);
        return table;
      });
      current.activeTableId = 1;
      markAllTablesDirty();
      flushRender("api-finished-reveal-smoke");
      return sessionSnapshot();
    };

    publicApi.__showFinishedRevealSmoke = showFinishedRevealSmoke;
    publicApi.__showFourTableFinishedRevealSmoke = () => showFinishedRevealSmoke(4);

    publicApi.__showTerminalHeroFoldSmoke = () => {
      const current = currentState();
      const smokeSettings = {
        ...current.settings,
        tableCount: 1,
        playerCount: 2,
        simulationMode: "cash",
        difficulty: "easy",
        autoDeal: false,
        turboMode: false,
        trainingMode: false,
        setupCompleted: true
      };
      current.started = true;
      current.handSeq += 1;
      setPaused(false);
      clearSmokeRuntimeQueues();

      const table = applyOpponentLearningToTable(requireEngineTableFactory()({
        id: 1,
        settings: smokeSettings,
        handNo: current.handSeq,
        previousTable: null
      }));
      const hero = table.seats.find((seat) => seat?.isHero) || table.seats[0];
      const villain = table.seats.find((seat) => seat && !seat.isHero) || table.seats[1];
      table.seats = [hero, villain].filter(Boolean);
      if (hero) {
        hero.id = 0;
        hero.isHero = true;
        hero.name = "Hero";
        hero.position = hero.position || "SB";
        hero.cards = ["As", "Kd"];
        hero.folded = true;
        hero.foldedAt = "preflop";
        hero.revealed = false;
        hero.stack = 98;
        hero.lobbyState = "active";
      }
      if (villain) {
        villain.id = villain.id === 0 ? 1 : villain.id;
        villain.isHero = false;
        villain.name = villain.name || "BB";
        villain.position = villain.position || "BB";
        villain.cards = ["Qh", "Qs"];
        villain.folded = false;
        villain.foldedAt = "";
        villain.revealed = false;
        villain.stack = 101;
        villain.lobbyState = "active";
      }
      table.heroHand = hero?.cards?.slice() || ["As", "Kd"];
      table.board = [];
      table.street = "preflop";
      table.status = "folded";
      table.result = "Hero fold";
      table.resultKind = "lost";
      table.busy = false;
      table.heroTurn = false;
      table.currentBet = 0;
      table.lastRaiseSize = 0;
      table.minRaiseTo = 1;
      table.toCall = 0;
      table.canCheck = false;
      table.pot = 3;
      table.seatBets = {};
      table.contributions = {};
      table.activeVillain = villain?.id ?? 1;
      table.activeSeatIds = villain ? [villain.id] : [];
      table.contestingSeatIds = villain ? [villain.id] : [];
      table.potAwards = villain ? [{ seatId: villain.id, amount: 3, reason: "terminal-hero-fold-smoke" }] : [];
      table.seatActions = {
        0: {
          type: "fold",
          label: "Fold",
          tone: "fold",
          street: "preflop",
          seq: 1
        }
      };
      table.visualActionBaseState = {
        handNo: Number(table.handNo || 0),
        seats: table.seats.map((seat) => ({
          id: Number(seat.id),
          stack: Number(seat.stack || 0),
          lobbyState: String(seat.lobbyState || "active")
        }))
      };
      table.visualActionConfirmedState = {
        handNo: Number(table.handNo || 0),
        seats: table.visualActionBaseState.seats.map((seat) => ({ ...seat }))
      };
      table.actionAnimations = [{
        key: `${table.handNo}-terminal-hero-fold-smoke`,
        seatId: 0,
        label: "Fold",
        tone: "fold",
        street: "preflop",
        boardLength: 0,
        seq: 1,
        isHeroAction: true
      }];
      table.betAnimations = [];
      table.actionTimeline = [{
        phase: "result",
        street: "preflop",
        label: "Hero fold",
        pot: table.pot,
        board: [],
        state: {
          street: "preflop",
          pot: table.pot,
          currentBet: 0,
          toCall: 0,
          canCheck: false,
          heroTurn: false,
          activeVillain: table.activeVillain,
          board: []
        }
      }];
      options.annotateActionAnimationMotion(table);
      options.primeActionReveal(table, { previousBoardLength: 0 });
      current.tables = [table];
      current.activeTableId = 1;
      markAllTablesDirty();
      flushRender("api-terminal-hero-fold-smoke");
      return sessionSnapshot();
    };

    // Mirror of __showTerminalHeroFoldSmoke, reversed: HERO raises preflop and
    // the villain folds, so the hand ends by everyone folding TO the hero and
    // the hero wins uncontested. This is the terminal state engine-showdown's
    // closeTerminalBettingState() leaves: table.seatBets is wiped and the hero's
    // committed chips live only in table.visualClosedStreetBets. It reproduces
    // the "hero felt bet vanishes instantly with no motion while folds still
    // play" regression that the pendingPotFlightItems hero-sweep fix addresses:
    // with the fix, schedulePotFlightSettle stamps table.potFlightUntil, whose
    // >now() leg (in the byte-identical closingStreetTransitionStillReadable
    // twin) holds the hero felt bet for the whole sweep. The hero has a LANDED
    // bet-animation (as engine-core.addSeatContribution emits for every seat,
    // hero included) so closingStreetBetStillReadable reaches the twin's hold
    // leg rather than short-circuiting on an empty matchingBets set.
    publicApi.__showTerminalHeroWinSmoke = () => {
      const current = currentState();
      const smokeSettings = {
        ...current.settings,
        tableCount: 1,
        playerCount: 2,
        simulationMode: "cash",
        difficulty: "easy",
        autoDeal: false,
        turboMode: false,
        trainingMode: false,
        setupCompleted: true
      };
      current.started = true;
      current.settings = smokeSettings;
      current.handSeq += 1;
      setPaused(false);
      clearSmokeRuntimeQueues();

      const table = applyOpponentLearningToTable(requireEngineTableFactory()({
        id: 1,
        settings: smokeSettings,
        handNo: current.handSeq,
        previousTable: null
      }));
      const hero = table.seats.find((seat) => seat?.isHero) || table.seats[0];
      const villain = table.seats.find((seat) => seat && !seat.isHero) || table.seats[1];
      table.seats = [hero, villain].filter(Boolean);
      const heroCommitted = 6;
      if (hero) {
        hero.id = 0;
        hero.isHero = true;
        hero.name = "Hero";
        hero.position = hero.position || "BTN";
        hero.cards = ["As", "Kd"];
        hero.folded = false;
        hero.foldedAt = "";
        hero.revealed = false;
        hero.stack = 100 - heroCommitted;
        hero.lobbyState = "active";
      }
      if (villain) {
        villain.id = villain.id === 0 ? 1 : villain.id;
        villain.isHero = false;
        villain.name = villain.name || "BB";
        villain.position = villain.position || "BB";
        villain.cards = ["Qh", "Qs"];
        villain.folded = true;
        villain.foldedAt = "preflop";
        villain.revealed = false;
        villain.stack = 99;
        villain.lobbyState = "active";
      }
      table.heroHand = hero?.cards?.slice() || ["As", "Kd"];
      table.board = [];
      table.street = "preflop";
      table.status = "won";
      table.result = `Hero win ${heroCommitted + 1} BB`;
      table.resultKind = "won";
      table.busy = false;
      table.heroTurn = false;
      table.currentBet = 0;
      table.lastRaiseSize = 0;
      table.minRaiseTo = 1;
      table.toCall = 0;
      table.canCheck = false;
      table.pot = heroCommitted + 1;
      // Terminal engine state: closeTerminalBettingState() has already wiped the
      // live per-seat bets; the hero's committed chips survive only here.
      table.seatBets = {};
      table.contributions = {};
      table.visualClosedStreetBets = {
        handNo: Number(table.handNo || 0),
        street: "preflop",
        boardLength: 0,
        closingSeq: 1,
        openingSeq: 1,
        seatBets: { 0: heroCommitted }
      };
      table.activeVillain = villain?.id ?? 1;
      table.activeSeatIds = [hero?.id ?? 0];
      table.contestingSeatIds = [hero?.id ?? 0];
      table.potAwards = hero ? [{ seatId: hero.id, amount: table.pot, reason: "terminal-hero-win-smoke" }] : [];
      table.seatActions = {
        1: { type: "fold", label: "Fold", tone: "fold", street: "preflop", seq: 2 }
      };
      table.visualActionBaseState = {
        handNo: Number(table.handNo || 0),
        seats: table.seats.map((seat) => ({
          id: Number(seat.id),
          stack: Number(seat.stack || 0),
          lobbyState: String(seat.lobbyState || "active")
        }))
      };
      table.visualActionConfirmedState = {
        handNo: Number(table.handNo || 0),
        seats: table.visualActionBaseState.seats.map((seat) => ({ ...seat }))
      };
      table.actionAnimations = [
        {
          key: `${table.handNo}-terminal-hero-win-raise`,
          seatId: 0,
          label: `Raise to ${heroCommitted} BB`,
          tone: "aggressive",
          street: "preflop",
          boardLength: 0,
          seq: 1,
          isHeroAction: true
        },
        {
          key: `${table.handNo}-terminal-hero-win-fold`,
          seatId: villain?.id ?? 1,
          label: "Fold",
          tone: "fold",
          street: "preflop",
          boardLength: 0,
          seq: 2
        }
      ];
      // The hero's raise emits a bet-animation exactly as
      // engine-core.addSeatContribution(...true) does for a live raise.
      table.betAnimations = [
        {
          key: `${table.handNo}-terminal-hero-win-raise-chip`,
          actionKey: `${table.handNo}-terminal-hero-win-raise`,
          actionSeq: 1,
          seatId: 0,
          amount: heroCommitted,
          contribution: heroCommitted,
          street: "preflop",
          boardLength: 0
        }
      ];
      table.actionTimeline = table.actionAnimations.map((action) => ({
        phase: "action",
        street: "preflop",
        label: action.label,
        seatId: action.seatId,
        board: [],
        pot: table.pot
      }));
      options.annotateActionAnimationMotion(table);
      options.primeActionReveal(table, { previousBoardLength: 0 });
      current.tables = [table];
      current.activeTableId = 1;
      markAllTablesDirty();
      flushRender("api-terminal-hero-win-smoke");
      return sessionSnapshot();
    };

    publicApi.__showFourTableStreetStormSmoke = () => {
      const current = currentState();
      const smokeSettings = {
        ...current.settings,
        tableCount: 4,
        playerCount: Math.max(6, Number(current.settings?.playerCount || 6)),
        simulationMode: "cash",
        difficulty: "standard",
        autoDeal: false,
        turboMode: true,
        trainingMode: false,
        setupCompleted: true
      };
      current.started = true;
      current.settings = smokeSettings;
      current.handSeq += 1;
      setPaused(false);
      clearSmokeRuntimeQueues();

      current.tables = Array.from({ length: 4 }, (_, index) => {
        const handNo = current.handSeq + index;
        const table = applyOpponentLearningToTable(requireEngineTableFactory()({
          id: index + 1,
          settings: smokeSettings,
          handNo,
          previousTable: null
        }));
        const hero = table.seats.find((seat) => seat?.isHero) || table.seats[0];
        const villains = table.seats.filter((seat) => seat && !seat.isHero);
        const caller = villains[0] || table.seats[1] || hero;
        const checker = villains[1] || caller;
        table.handNo = handNo;
        table.status = "playing";
        table.street = "turn";
        table.board = ["Ah", "Kd", "7c", "2s"];
        table.pot = 9;
        table.currentBet = 0;
        table.lastRaiseSize = 0;
        table.minRaiseTo = 1;
        table.toCall = 0;
        table.canCheck = true;
        table.heroTurn = false;
        table.busy = false;
        table.activeVillain = checker?.id ?? caller?.id ?? 1;
        table.seatBets = {};
        table.contributions = {};
        table.visualClosedStreetBets = {
          handNo,
          street: "flop",
          boardLength: 3,
          seatBets: { [caller?.id ?? 1]: 2 }
        };
        table.seatActions = {
          [caller?.id ?? 1]: {
            type: "call",
            label: "Call 2 BB",
            tone: "passive",
            street: "flop",
            seq: 1
          },
          [checker?.id ?? caller?.id ?? 1]: {
            type: "check",
            label: "Check",
            tone: "passive",
            street: "turn",
            seq: 2
          }
        };
        table.actionAnimations = [
          {
            key: `${handNo}-street-storm-call`,
            seatId: caller?.id ?? 1,
            label: "Call 2 BB",
            tone: "passive",
            street: "flop",
            boardLength: 3,
            seq: 1
          },
          {
            key: `${handNo}-street-storm-turn-check`,
            seatId: checker?.id ?? caller?.id ?? 1,
            label: "Check",
            tone: "passive",
            street: "turn",
            boardLength: 4,
            seq: 2
          }
        ];
        table.betAnimations = [{
          key: `${handNo}-street-storm-call-bet`,
          seatId: caller?.id ?? 1,
          amount: 2
        }];
        table.actionTimeline = table.actionAnimations.map((action) => ({
          phase: "action",
          street: action.street,
          label: action.label,
          pot: table.pot,
          board: action.boardLength >= 4 ? table.board.slice() : table.board.slice(0, 3),
          seatId: action.seatId,
          amount: action.label.startsWith("Call") ? 2 : 0
        }));
        if (hero) {
          hero.cards = ["As", "Qd"];
          hero.revealed = true;
          hero.folded = false;
          hero.foldedAt = "";
        }
        table.seats.forEach((seat) => {
          if (!seat) return;
          seat.lobbyState = "active";
          if (!Array.isArray(seat.cards) || seat.cards.length < 2) seat.cards = seat.isHero ? ["As", "Qd"] : ["9c", "8c"];
          seat.folded = false;
          seat.foldedAt = "";
          seat.stack = Math.max(10, Number(seat.stack || 0));
        });
        options.annotateActionAnimationMotion(table);
        options.primeActionReveal(table, { previousBoardLength: 3 });
        return table;
      });
      current.activeTableId = 1;
      markAllTablesDirty();
      flushRender("api-four-table-street-storm-smoke");
      return sessionSnapshot();
    };
  }

  root.PokerSimulatorSmokeScenarios = { attachLayoutSmokeHooks };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSmokeScenarios;
})();
