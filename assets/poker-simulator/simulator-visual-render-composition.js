(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function assignFn(target, key, candidate) {
    if (typeof target[key] === "function" || typeof candidate !== "function") return;
    target[key] = candidate;
  }

  function assignValue(target, key, candidate) {
    if (target[key] !== undefined || candidate === undefined || candidate === null) return;
    target[key] = candidate;
  }

  function requireModel(kit, name) {
    if (!kit || typeof kit.model !== "function") {
      throw new Error(`${name} is not loaded - check <script> order in poker-simulator.html`);
    }
    return kit;
  }

  // Fail-LOUD boundary for REQUIRED loose-bag deps (the batch form of the
  // foundation roadmap's requireFn). assignFn() is intentionally fail-OPEN;
  // requireFns asserts that the deps composeRuntime() forwards UNGUARDED into its
  // child models resolved to functions, so a renamed/unloaded producer surfaces
  // at boot naming THIS hub instead of feeding a child an undefined and dying
  // silently later. Only meaningful in a real DOM runtime — headless
  // source-contract harnesses load this hub with intentionally-partial mocks.
  const reportedMissingDeps = new Set();

  function requireFns(target, keys, source) {
    if (!root.document) return;
    const missing = (Array.isArray(keys) ? keys : []).filter((key) => typeof target[key] !== "function");
    if (!missing.length) return;
    const signature = `${source}|${missing.join(",")}`;
    if (reportedMissingDeps.has(signature)) return;
    reportedMissingDeps.add(signature);
    const message = `[poker-simulator] ${source}: missing required runtime dependencies: ${missing.join(", ")} — a producer was renamed or failed to load (silent loose-bag wiring).`;
    if (root.console && typeof root.console.error === "function") root.console.error(message);
  }

  function model(options = {}) {
    const bridge = options.bridge || {};
    const state = options.state || {};
    const effects = options.effects || {};
    const models = options.models || {};

    function composeRuntime(runtimeOptions = {}) {
      const visualTimersKit = requireModel(runtimeOptions.visualTimersKit, "PokerSimulatorVisualTimers");
      const visualPrimerKit = requireModel(runtimeOptions.visualPrimerKit, "PokerSimulatorVisualPrimer");
      const actionRevealKit = requireModel(runtimeOptions.actionRevealKit, "PokerSimulatorActionReveal");
      const showdownVisualsKit = requireModel(runtimeOptions.showdownVisualsKit, "PokerSimulatorShowdownVisuals");
      const seatVisualsKit = requireModel(runtimeOptions.seatVisualsKit, "PokerSimulatorSeatVisuals");
      const tableRenderAdapterKit = requireModel(runtimeOptions.tableRenderAdapterKit, "PokerSimulatorTableRenderAdapter");
      const tableStatusKit = requireModel(runtimeOptions.tableStatusKit, "PokerSimulatorTableStatus");
      const now = typeof runtimeOptions.now === "function" ? runtimeOptions.now : () => Date.now();
      const getState = typeof runtimeOptions.getState === "function" ? runtimeOptions.getState : () => ({ settings: {}, tables: [] });
      const runtimeBridge = runtimeOptions.runtimeBridge || {};
      const actionRuntime = runtimeOptions.actionRuntime || {};
      const actionBridge = runtimeOptions.actionBridge || {};
      const historyBridge = runtimeOptions.historyBridge || {};
      const renderLoop = runtimeOptions.renderLoop || {};
      const tableViewModel = runtimeOptions.tableViewModel || {};
      const timingConfig = runtimeOptions.timingConfig || {};
      const sessionComposition = runtimeOptions.sessionComposition || {};
      const perfModel = runtimeOptions.perfModel || {};
      const cardModel = runtimeOptions.cardModel || {};
      const bettingKit = runtimeOptions.bettingKit || root.PokerSimulatorBetting || {};
      const opponentsKit = runtimeOptions.opponentsKit || {};
      const formatHelpers = runtimeOptions.formatHelpers || {};
      const renderKits = runtimeOptions.renderKits || {};

      function currentState() {
        return getState() || {};
      }

      // Forward reference to the table-effects model (created below, after the
      // visual timer model). simulator-table-effects.js owns the betAnimations
      // array clear; the action-unlock teardown in the timer model routes its
      // clear through this owner. The timer model is constructed FIRST, so we
      // hand it a lazy delegate that resolves the owner at teardown time (long
      // after composition), never at construction.
      let composedTableEffects = null;
      const clearBetAnimationsOwner = (table, reason) => {
        if (composedTableEffects && typeof composedTableEffects.clearBetAnimations === "function") {
          composedTableEffects.clearBetAnimations(table, reason);
          return;
        }
        if (table) table.betAnimations = [];
      };

      assignFn(runtimeOptions, "getTable", runtimeBridge.getTable);
      assignFn(runtimeOptions, "applyFoldAnyIfReady", runtimeBridge.applyFoldAnyIfReady);
      assignFn(runtimeOptions, "tableUsesTournamentMode", runtimeBridge.tableUsesTournamentMode);
      assignFn(runtimeOptions, "streetLabel", runtimeBridge.streetLabel);
      assignFn(runtimeOptions, "markTableDirty", renderLoop.markTableDirty);
      assignFn(runtimeOptions, "markAllTablesDirty", renderLoop.markAllTablesDirty);
      assignFn(runtimeOptions, "render", renderLoop.render);
      assignFn(runtimeOptions, "pauseAutoDealQueues", actionRuntime.pauseAutoDealQueues);
      assignFn(runtimeOptions, "resumeAutoDealQueues", actionRuntime.resumeAutoDealQueues);
      assignFn(runtimeOptions, "stopAutoDealCountdownTicker", actionRuntime.stopAutoDealCountdownTicker);
      assignFn(runtimeOptions, "syncAutoDealCountdownTicker", actionRuntime.syncAutoDealCountdownTicker);
      assignFn(runtimeOptions, "updateAutoDealCountdowns", actionRuntime.updateAutoDealCountdowns);
      assignFn(runtimeOptions, "pauseActionClocks", actionRuntime.pauseActionClocks);
      assignFn(runtimeOptions, "resumeActionClocks", actionRuntime.resumeActionClocks);
      assignFn(runtimeOptions, "stopActionClockTicker", actionRuntime.stopActionClockTicker);
      assignFn(runtimeOptions, "syncActionClockTicker", actionRuntime.syncActionClockTicker);
      assignFn(runtimeOptions, "updateActionClocks", actionRuntime.updateActionClocks);
      assignFn(runtimeOptions, "clearAllActionClocks", actionRuntime.clearAllActionClocks);
      assignFn(runtimeOptions, "pauseBotResponseTimers", actionRuntime.pauseBotResponseTimers);
      assignFn(runtimeOptions, "resumeBotResponseTimers", actionRuntime.resumeBotResponseTimers);
      assignFn(runtimeOptions, "clearAllBotResponseTimers", actionRuntime.clearAllBotResponseTimers);
      assignFn(runtimeOptions, "renderAutoDealCountdown", actionRuntime.renderAutoDealCountdown);
      assignFn(runtimeOptions, "renderActionClock", actionRuntime.renderActionClock);
      assignFn(runtimeOptions, "renderHeroTimebank", actionRuntime.renderHeroTimebank);
      assignFn(runtimeOptions, "autoDealLabel", actionRuntime.autoDealLabel);
      assignFn(runtimeOptions, "decisionTimebankSeconds", actionRuntime.decisionTimebankSeconds);
      assignFn(runtimeOptions, "stopPerfMutationObserver", perfModel.stopPerfMutationObserver);
      assignFn(runtimeOptions, "percent", sessionComposition.percent);
      assignFn(runtimeOptions, "canHeroAct", tableViewModel.canHeroAct);
      assignFn(runtimeOptions, "usesBoardLayout", tableViewModel.usesBoardLayout);
      assignFn(runtimeOptions, "visibleBoardLength", tableViewModel.visibleBoardLength);
      assignFn(runtimeOptions, "isBlindBetMarker", tableViewModel.isBlindBetMarker);
      assignFn(runtimeOptions, "visibleStreet", tableViewModel.visibleStreet);
      assignFn(runtimeOptions, "actionHint", tableViewModel.actionHint);
      assignFn(runtimeOptions, "heroBusted", tableViewModel.heroBusted);
      assignFn(runtimeOptions, "heroIsAllIn", tableViewModel.heroIsAllIn);
      assignFn(runtimeOptions, "formatMadeHandFromScore", cardModel.formatMadeHandFromScore);
      assignFn(runtimeOptions, "cardRankValue", cardModel.cardRankValue);
      assignFn(runtimeOptions, "renderCard", cardModel.renderCard);
      assignFn(runtimeOptions, "heroHandLabel", cardModel.heroHandLabel);
      assignFn(runtimeOptions, "opponentNoteForSeat", runtimeBridge.opponentNoteForSeat);
      assignFn(runtimeOptions, "renderOpponentNoteButton", runtimeBridge.renderOpponentNoteButton);
      assignFn(runtimeOptions, "renderActions", actionBridge.renderActions);
      assignFn(runtimeOptions, "trainerFeedbackForTable", historyBridge.trainerFeedbackForTable);
      assignFn(runtimeOptions, "opponentNoteHasContent", opponentsKit.opponentNoteHasContent);
      assignFn(runtimeOptions, "getSettings", () => currentState().settings);
      assignFn(runtimeOptions, "getTables", () => currentState().tables);
      assignFn(runtimeOptions, "getStarted", () => currentState().started);
      assignFn(runtimeOptions, "roundBb", bettingKit.roundBb);

      assignValue(runtimeOptions, "pauseDeferPollMs", timingConfig.pauseDeferPollMs);
      assignValue(runtimeOptions, "visualUnlockBufferMs", timingConfig.visualUnlockBufferMs);
      assignValue(runtimeOptions, "visualPrimerDurations", timingConfig.visualPrimerDurations);
      assignValue(runtimeOptions, "boardCardStaggerMs", timingConfig.boardCardStaggerMs);
      assignValue(runtimeOptions, "showdownDurations", timingConfig.showdownDurations);
      assignValue(runtimeOptions, "dealSeatGapMs", timingConfig.dealSeatGapMs);
      assignValue(runtimeOptions, "compactDealSeatGapMs", timingConfig.compactDealSeatGapMs);
      assignValue(runtimeOptions, "dealCardDurationMs", timingConfig.dealCardDurationMs);
      assignValue(runtimeOptions, "compactDealCardDurationMs", timingConfig.compactDealCardDurationMs);
      assignValue(runtimeOptions, "tableEffectDurations", timingConfig.tableEffectDurations);
      assignValue(runtimeOptions, "formatAmount", formatHelpers.formatAmount);
      assignValue(runtimeOptions, "formatInlineAmounts", formatHelpers.formatInlineAmounts);
      assignValue(runtimeOptions, "escapeHtml", formatHelpers.escapeHtml);
      assignValue(runtimeOptions, "formatBlindMultiplier", formatHelpers.formatBlindMultiplier);
      assignValue(runtimeOptions, "seatSlotsKit", renderKits.seatSlotsKit || root.PokerSimulatorSeatSlots);
      assignValue(runtimeOptions, "geometryKit", renderKits.geometryKit || root.PokerSimulatorGeometry);
      assignValue(runtimeOptions, "dealAnimationsKit", renderKits.dealAnimationsKit || root.PokerSimulatorDealAnimations);
      assignValue(runtimeOptions, "boardRenderKit", renderKits.boardRenderKit || root.PokerSimulatorBoardRender);
      assignValue(runtimeOptions, "tableEffectsKit", renderKits.tableEffectsKit || root.PokerSimulatorTableEffects);
      assignValue(runtimeOptions, "seatRendererKit", renderKits.seatRendererKit || root.PokerSimulatorSeatRenderer);
      assignValue(runtimeOptions, "tableRendererKit", renderKits.tableRendererKit || root.PokerSimulatorTableRenderer);

      // Every function below is forwarded UNGUARDED into one of the 7 child
      // model() calls; a missing one silently degrades that child. (getState/now
      // are optional — typeof-fallback above; assignValue timing/kit/format deps
      // are value deps, not asserted.)
      requireFns(runtimeOptions, [
        "getTable", "applyFoldAnyIfReady", "tableUsesTournamentMode", "streetLabel", "markTableDirty",
        "markAllTablesDirty", "render", "pauseAutoDealQueues", "resumeAutoDealQueues", "stopAutoDealCountdownTicker",
        "syncAutoDealCountdownTicker", "updateAutoDealCountdowns", "pauseActionClocks", "resumeActionClocks",
        "stopActionClockTicker", "syncActionClockTicker", "updateActionClocks", "clearAllActionClocks",
        "pauseBotResponseTimers", "resumeBotResponseTimers", "clearAllBotResponseTimers", "renderAutoDealCountdown",
        "renderActionClock", "renderHeroTimebank", "autoDealLabel", "decisionTimebankSeconds", "stopPerfMutationObserver", "saveSessionData", "percent",
        "canHeroAct", "usesBoardLayout", "visibleBoardLength", "isBlindBetMarker", "visibleStreet", "actionHint",
        "heroBusted", "heroIsAllIn", "formatMadeHandFromScore", "cardRankValue", "renderCard", "heroHandLabel",
        "opponentNoteForSeat", "renderOpponentNoteButton", "renderActions", "trainerFeedbackForTable",
        "opponentNoteHasContent", "getSettings", "getTables", "getStarted", "roundBb"
      ], "visual-render-composition");

      const visualTimerModel = visualTimersKit.model({
        windowRef: runtimeOptions.windowRef,
        documentRef: runtimeOptions.documentRef,
        getState: runtimeOptions.getState,
        getTable: runtimeOptions.getTable,
        markTableDirty: runtimeOptions.markTableDirty,
        markAllTablesDirty: runtimeOptions.markAllTablesDirty,
        render: runtimeOptions.render,
        applyFoldAnyIfReady: runtimeOptions.applyFoldAnyIfReady,
        pendingPotFlightItems: state.pendingPotFlightItems,
        pendingBetMarkerLandingItems: state.pendingBetMarkerLandingItems,
        actionSequenceBoardRevealStages: bridge.actionSequenceBoardRevealStages,
        actionTimingAtIndex: bridge.actionTimingAtIndex,
        actionAnimationIsInMotion: state.actionAnimationIsInMotion,
        prefersReducedMotion: bridge.prefersReducedMotion,
        compactTimingMs: bridge.compactTimingMs,
        primeShowdownAnimation: bridge.primeShowdownAnimation,
        syncPauseButton: bridge.syncPauseButton,
        pauseAutoDealQueues: runtimeOptions.pauseAutoDealQueues,
        resumeAutoDealQueues: runtimeOptions.resumeAutoDealQueues,
        stopAutoDealCountdownTicker: runtimeOptions.stopAutoDealCountdownTicker,
        syncAutoDealCountdownTicker: runtimeOptions.syncAutoDealCountdownTicker,
        updateAutoDealCountdowns: runtimeOptions.updateAutoDealCountdowns,
        pauseActionClocks: runtimeOptions.pauseActionClocks,
        resumeActionClocks: runtimeOptions.resumeActionClocks,
        stopActionClockTicker: runtimeOptions.stopActionClockTicker,
        syncActionClockTicker: runtimeOptions.syncActionClockTicker,
        updateActionClocks: runtimeOptions.updateActionClocks,
        clearAllActionClocks: runtimeOptions.clearAllActionClocks,
        pauseBotResponseTimers: runtimeOptions.pauseBotResponseTimers,
        resumeBotResponseTimers: runtimeOptions.resumeBotResponseTimers,
        clearAllBotResponseTimers: runtimeOptions.clearAllBotResponseTimers,
        stopPerfMutationObserver: runtimeOptions.stopPerfMutationObserver,
        saveSessionData: runtimeOptions.saveSessionData,
        clearBetAnimations: clearBetAnimationsOwner,
        pauseDeferPollMs: runtimeOptions.pauseDeferPollMs,
        visualUnlockBufferMs: runtimeOptions.visualUnlockBufferMs,
        tableEffectDurations: runtimeOptions.tableEffectDurations
      });

      const visualPrimer = visualPrimerKit.model({
        getState: runtimeOptions.getState,
        usesDecorativeMotionLayer: bridge.usesDecorativeMotionLayer,
        prefersReducedMotion: bridge.prefersReducedMotion,
        reducedTableMotion: bridge.reducedTableMotion,
        compactTimingMs: bridge.compactTimingMs,
        boardRevealMs: bridge.boardRevealMs,
        scheduleVisualUnlock: bridge.scheduleVisualUnlock,
        now,
        durations: runtimeOptions.visualPrimerDurations
      });

      const actionRevealModel = actionRevealKit.model({
        now,
        actionVisualLeadMs: bridge.actionVisualLeadMs,
        boardRevealStartDelay: bridge.boardRevealStartDelay,
        primeBoardReveal: bridge.primeBoardReveal,
        actionRevealDuration: bridge.actionRevealDuration,
        actionControlUnlockDuration: bridge.actionControlUnlockDuration,
        schedulePotFlightSettle: bridge.schedulePotFlightSettle,
        scheduleBetMarkerLandingRenders: bridge.scheduleBetMarkerLandingRenders,
        scheduleActionBoardRevealRenders: bridge.scheduleActionBoardRevealRenders,
        scheduleFoldMuckRenders: bridge.scheduleFoldMuckRenders,
        scheduleActionControlUnlock: bridge.scheduleActionControlUnlock,
        scheduleActionRevealUnlock: bridge.scheduleActionRevealUnlock,
        applyFoldAnyIfReady: runtimeOptions.applyFoldAnyIfReady
      });

      const showdownVisualModel = showdownVisualsKit.model({
        boardRevealMs: bridge.boardRevealMs,
        showdownWinnerVisible: bridge.showdownWinnerVisible,
        showdownElapsedMs: bridge.showdownElapsedMs,
        allInBoardRunoutStartMs: bridge.allInBoardRunoutStartMs,
        allInRunoutStageDuration: bridge.allInRunoutStageDuration,
        isActionSequenceActive: bridge.isActionSequenceActive,
        percent: runtimeOptions.percent,
        resultTitle: state.resultTitle,
        formatAmount: runtimeOptions.formatAmount,
        formatMadeHandFromScore: runtimeOptions.formatMadeHandFromScore,
        showdownRevealStepDuration: bridge.showdownRevealStepDuration,
        showdownAnimationStartAt: bridge.showdownAnimationStartAt,
        cardRankValue: runtimeOptions.cardRankValue,
        boardCardStaggerMs: runtimeOptions.boardCardStaggerMs,
        allInBoardDealGraceMs: runtimeOptions.showdownDurations?.allInBoardDealGraceMs
      });

      const seatVisualModel = seatVisualsKit.model({
        getSettings: runtimeOptions.getSettings,
        canHeroAct: runtimeOptions.canHeroAct,
        isActionSequenceActive: bridge.isActionSequenceActive,
        actionAnimationIndexForSeat: state.actionAnimationIndexForSeat,
        actionAnimationHasStarted: state.actionAnimationHasStarted,
        actionAnimationHasCompleted: state.actionAnimationHasCompleted,
        reducedTableMotion: bridge.reducedTableMotion,
        showdownSeatVisibilityLockActive: bridge.showdownSeatVisibilityLockActive,
        isBetLanded: effects.isBetLanded,
        roundBb: runtimeOptions.roundBb,
        showdownWinnerVisible: bridge.showdownWinnerVisible
      });

      const tableRenderAdapter = tableRenderAdapterKit.model({
        getState: runtimeOptions.getState,
        markTableDirty: runtimeOptions.markTableDirty,
        seatSlotsKit: runtimeOptions.seatSlotsKit,
        geometryKit: runtimeOptions.geometryKit,
        dealAnimationsKit: runtimeOptions.dealAnimationsKit,
        boardRenderKit: runtimeOptions.boardRenderKit,
        tableEffectsKit: runtimeOptions.tableEffectsKit,
        seatRendererKit: runtimeOptions.seatRendererKit,
        tableRendererKit: runtimeOptions.tableRendererKit,
        usesBoardLayout: runtimeOptions.usesBoardLayout,
        visibleBoardLength: runtimeOptions.visibleBoardLength,
        isBlindBetMarker: runtimeOptions.isBlindBetMarker,
        usesDecorativeMotionLayer: bridge.usesDecorativeMotionLayer,
        prefersReducedMotion: bridge.prefersReducedMotion,
        compactTimingMs: bridge.compactTimingMs,
        isVisualActive: bridge.isVisualActive,
        dealRevealDurationForTable: bridge.dealRevealDurationForTable,
        dealSeatGapMs: runtimeOptions.dealSeatGapMs,
        compactDealSeatGapMs: runtimeOptions.compactDealSeatGapMs,
        dealCardDurationMs: runtimeOptions.dealCardDurationMs,
        compactDealCardDurationMs: runtimeOptions.compactDealCardDurationMs,
        allInRunoutStageState: state.allInRunoutStageState,
        actionSequenceBoardRevealState: bridge.actionSequenceBoardRevealState,
        boardRevealDelayRemaining: bridge.boardRevealDelayRemaining,
        boardRevealMs: bridge.boardRevealMs,
        boardCardStaggerMs: runtimeOptions.boardCardStaggerMs,
        showdownWinningCardRole: state.showdownWinningCardRole,
        renderCard: runtimeOptions.renderCard,
        isActionSequenceActive: bridge.isActionSequenceActive,
        visualSeatStateLockActive: state.visualSeatStateLockActive,
        actionTimingAtIndex: bridge.actionTimingAtIndex,
        actionIndexForBetAnimation: state.actionIndexForBetAnimation,
        chipAnnouncementDelayForAction: bridge.chipAnnouncementDelayForAction,
        chipFlightMs: bridge.chipFlightMs,
        betMarkerLandingMs: bridge.betMarkerLandingMs,
        chipRevealMs: bridge.chipRevealMs,
        actionAnimationIsInMotion: state.actionAnimationIsInMotion,
        actionRevealMs: bridge.actionRevealMs,
        actionAnimationIsAllIn: state.actionAnimationIsAllIn,
        actionRiverResolution: bridge.actionRiverResolution,
        isRiverResolutionAction: bridge.isRiverResolutionAction,
        riverResolutionCueMs: bridge.riverResolutionCueMs,
        riverResolutionCueDelayMs: bridge.riverResolutionCueDelayMs,
        roundBb: runtimeOptions.roundBb,
        winnerSeat: state.winnerSeat,
        showdownAwardVisible: bridge.showdownAwardVisible,
        renderMiniChipStack: state.renderMiniChipStack,
        renderChipStack: state.renderChipStack,
        renderPotChipStack: state.renderPotChipStack,
        formatAmount: runtimeOptions.formatAmount,
        formatInlineAmounts: runtimeOptions.formatInlineAmounts,
        escapeHtml: runtimeOptions.escapeHtml,
        tableEffectDurations: runtimeOptions.tableEffectDurations,
        visibleSeatLobbyState: state.visibleSeatLobbyState,
        canHeroAct: runtimeOptions.canHeroAct,
        seatVisuallyFolded: state.seatVisuallyFolded,
        visibleSeatStack: state.visibleSeatStack,
        seatIsWinner: state.seatIsWinner,
        visibleSeatAction: state.visibleSeatAction,
        seatCardState: state.seatCardState,
        allInEquityLayoutReady: state.allInEquityLayoutReady,
        allInEquityForSeat: state.allInEquityForSeat,
        allInOutsForSeat: state.allInOutsForSeat,
        opponentNoteForSeat: runtimeOptions.opponentNoteForSeat,
        renderOpponentNoteButton: runtimeOptions.renderOpponentNoteButton,
        actionBubbleLabel: effects.actionBubbleLabel,
        revealDelayForSeat: state.revealDelayForSeat,
        heroHandLabel: runtimeOptions.heroHandLabel,
        opponentNoteHasContent: runtimeOptions.opponentNoteHasContent,
        potAnimationState: state.potAnimationState,
        tournamentFinishScreenVisible: state.tournamentFinishScreenVisible,
        showdownWinnerVisible: bridge.showdownWinnerVisible,
        renderSimulationBadge: state.renderSimulationBadge,
        renderBlindLevelAnnouncement: state.renderBlindLevelAnnouncement,
        renderResultBanner: state.renderResultBanner,
        renderTournamentFinishScreen: state.renderTournamentFinishScreen,
        actionBarClass: state.actionBarClass,
        renderActionStatus: state.renderActionStatus,
        renderActions: runtimeOptions.renderActions,
        renderHeroTimebank: runtimeOptions.renderHeroTimebank
      });

      const tableEffects = tableRenderAdapter.tableEffects;
      // Resolve the forward reference now that the owner exists; the timer model's
      // action-unlock teardown will route its betAnimations clear through it.
      composedTableEffects = tableEffects;

      const tableStatus = tableStatusKit.model({
        getSettings: runtimeOptions.getSettings,
        getTables: runtimeOptions.getTables,
        getStarted: runtimeOptions.getStarted,
        escapeHtml: runtimeOptions.escapeHtml,
        decisionTimebankSeconds: runtimeOptions.decisionTimebankSeconds,
        formatBlindMultiplier: runtimeOptions.formatBlindMultiplier,
        isPaused: bridge.isPaused,
        dealAnimationActive: tableRenderAdapter.dealAnimationActive,
        isActionSequenceActive: bridge.isActionSequenceActive,
        showdownVisualSequenceActive: bridge.showdownVisualSequenceActive,
        isVisualActive: bridge.isVisualActive,
        canHeroAct: runtimeOptions.canHeroAct,
        compactActionText: state.compactActionText,
        actionHint: runtimeOptions.actionHint,
        renderAutoDealCountdown: runtimeOptions.renderAutoDealCountdown,
        renderActionClock: runtimeOptions.renderActionClock,
        showdownWinnerVisible: bridge.showdownWinnerVisible,
        showdownAwardVisible: bridge.showdownAwardVisible,
        showdownPotAwardSettled: bridge.showdownPotAwardSettled,
        showdownWinnerStatusText: state.showdownWinnerStatusText,
        showdownPotAwardStatusText: state.showdownPotAwardStatusText,
        allInRunoutStageState: state.allInRunoutStageState,
        allInEquityDisplayReady: state.allInEquityDisplayReady,
        allInRunoutShowsEquity: state.allInRunoutShowsEquity,
        visibleStreet: runtimeOptions.visibleStreet,
        streetLabel: runtimeOptions.streetLabel,
        resultTitle: state.resultTitle,
        heroBusted: runtimeOptions.heroBusted,
        tableUsesTournamentMode: runtimeOptions.tableUsesTournamentMode,
        trainerFeedbackForTable: runtimeOptions.trainerFeedbackForTable,
        autoDealLabel: runtimeOptions.autoDealLabel,
        tournamentFinishScreenVisible: state.tournamentFinishScreenVisible,
        heroIsAllIn: runtimeOptions.heroIsAllIn,
        isActionRevealLocked: bridge.isActionRevealLocked,
        seatPoint: tableRenderAdapter.seatPoint,
        seatZone: tableRenderAdapter.seatZone,
        currentSessionPayload: sessionComposition.currentSessionPayload,
        sessionMetrics: sessionComposition.sessionMetrics,
        signed: sessionComposition.signed,
        signedBb: sessionComposition.signedBb,
        sessionHudRate: sessionComposition.sessionHudRate,
        formatDecisionDuration: sessionComposition.formatDecisionDuration,
        currentHandsPerHour: sessionComposition.currentHandsPerHour,
        formatHandsPerHour: sessionComposition.formatHandsPerHour,
        actionI18n: root.PokerSimulatorActionI18n
      });

      models.visualTimerModel = visualTimerModel;
      models.visualPrimer = visualPrimer;
      models.actionRevealModel = actionRevealModel;
      models.showdownVisualModel = showdownVisualModel;
      models.seatVisualModel = seatVisualModel;
      models.tableRenderAdapter = tableRenderAdapter;
      models.tableEffects = tableEffects;
      models.tableStatus = tableStatus;

      return {
        visualTimerModel,
        visualPrimer,
        actionRevealModel,
        showdownVisualModel,
        seatVisualModel,
        tableRenderAdapter,
        tableEffects,
        tableStatus,
        renderTable: tableRenderAdapter.renderTable,
        dealAnimationActive: tableRenderAdapter.dealAnimationActive,
        seatPoint: tableRenderAdapter.seatPoint,
        seatZone: tableRenderAdapter.seatZone,
        clearExpiredRenderedAnimations: tableRenderAdapter.clearExpiredRenderedAnimations
      };
    }

    return { composeRuntime };
  }

  root.PokerSimulatorVisualRenderComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorVisualRenderComposition;
})();
