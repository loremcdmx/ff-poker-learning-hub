(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function requireModel(kit, name) {
    if (!kit || typeof kit.model !== "function") {
      throw new Error(`${name} is not loaded - check <script> order in poker-simulator.html`);
    }
  }

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const documentRef = options.documentRef || windowRef.document;
    const getState = typeof options.getState === "function" ? options.getState : () => options.state || {};
    const runtimeRegistry = options.runtimeRegistry || { set: noop, getter: () => noop };
    const limits = options.limits || {};

    requireModel(options.historyBridgeKit, "PokerSimulatorHistoryBridge");
    requireModel(options.telemetryKit, "PokerSimulatorTelemetry");
    requireModel(options.handCompletionKit, "PokerSimulatorHandCompletion");
    requireModel(options.sessionExportKit, "PokerSimulatorSessionExport");
    requireModel(options.botLabRuntimeKit, "PokerSimulatorBotLabRuntime");
    requireModel(options.analyticsUiKit, "PokerSimulatorAnalyticsUi");
    requireModel(options.foldAnyKit, "PokerSimulatorFoldAny");

    const historyBridge = options.historyBridgeKit.model({
      getState,
      handLogKit: options.handLogKit,
      bootSessionId: options.sessionId,
      getHandCompletion: runtimeRegistry.getter("handCompletion"),
      getReplayHistory: runtimeRegistry.getter("replayHistory")
    });
    const {
      renderHistoryEntry,
      renderDecisionEntry,
      sanitizeHistoryEntry,
      sanitizeFoldAnyEvent,
      settingsLogSnapshot,
      aggregatePokerStats,
      emptyRateStat,
      roundBbMetric,
      trainerFeedbackForTable: historyTrainerFeedbackForTable,
      replayEntries
    } = historyBridge;
    runtimeRegistry.set({ trainerFeedbackForTable: historyTrainerFeedbackForTable });

    const telemetryModel = options.telemetryKit.model({
      windowRef,
      getState,
      aggregatePokerStats,
      currentSessionPayload: options.currentSessionPayload,
      sessionMetrics: options.sessionMetrics,
      compactSessionMetrics: options.compactSessionMetrics,
      sanitizeHistoryEntry,
      startModel: options.startModel
    });
    runtimeRegistry.set({ telemetryModel });

    const handCompletion = options.handCompletionKit.model({
      windowRef,
      getState,
      engine: options.engine,
      handLogKit: options.handLogKit,
      bootSessionId: options.sessionId,
      limits: {
        sessionHistory: limits.sessionHistory,
        handLog: limits.handLog
      },
      heroBusted: options.heroBusted,
      saveSessionData: options.saveSessionData,
      saveHandLogData: options.saveHandLogData,
      refreshCurrentLeaderboardEntry: options.refreshCurrentLeaderboardEntry,
      leaderboardDialogOpen: options.leaderboardDialogOpen,
      renderLeaderboardBody: options.renderLeaderboardBody,
      recordOpponentLearning: options.recordOpponentLearning,
      simulatorProgressResult: options.simulatorProgressResult,
      sendSimulatorSessionTelemetry: options.sendSimulatorSessionTelemetry,
      activeSimulatorProfile: options.activeSimulatorProfile,
      handLogEndpoint: options.handLogEndpoint
    });
    const sessionExport = options.sessionExportKit.model({
      windowRef,
      documentRef,
      getState,
      currentSessionPayload: options.currentSessionPayload,
      archiveExportPayload: options.archiveExportPayload,
      handLogJsonl: options.handLogJsonl,
      cachedDecisionStats: options.cachedDecisionStats,
      aggregatePokerStats,
      currentLeaderboardPlayerEntry: options.currentLeaderboardPlayerEntry,
      leaderboardEntries: options.leaderboardEntries,
      leaderboardDeleteTokenForEntry: options.leaderboardDeleteTokenForEntry,
      replayEntries,
      isPaused: options.isPaused
    });
    runtimeRegistry.set({ handCompletion, sessionExport });

    const botLabRuntime = options.botLabRuntimeKit.model({
      engine: options.engine,
      botLabKit: options.botLabKit,
      getState,
      saveSessionData: options.saveSessionData,
      render: options.render,
      randomChance: options.randomChance,
      heroMaxContribution: options.actionBridge?.heroMaxContribution,
      clampBetValue: options.clampBetValue
    });
    runtimeRegistry.set({ botLabRuntime });

    const analyticsUi = options.analyticsUiKit.model({
      getState,
      currentSessionPayload: options.currentSessionPayload,
      sessionMetrics: options.sessionMetrics,
      activeSimulatorProfile: options.activeSimulatorProfile,
      leaderboardEntries: options.leaderboardEntries,
      currentLeaderboardPlayerEntry: options.currentLeaderboardPlayerEntry,
      leaderboardRankFor: options.leaderboardRankFor,
      leaderboardPlayerKey: options.leaderboardPlayerKey,
      leaderboardRatingFromMetrics: options.leaderboardRatingFromMetrics,
      leaderboardDeleteTokenForEntry: options.leaderboardDeleteTokenForEntry,
      cachedPokerStats: options.cachedPokerStats,
      sessionGraphKit: options.sessionGraphKit,
      roundBbMetric,
      emptyRateStat,
      trackedCbetStreets: options.trackedCbetStreets,
      trackedPositions: options.trackedPositions,
      botLabKit: options.botLabKit,
      botLabBandSettings: options.botLabBandSettings,
      startModel: options.startModel,
      streetLabel: options.streetLabel,
      escapeHtml: options.escapeHtml,
      formatDecisionDuration: options.formatDecisionDuration
    });
    runtimeRegistry.set({ analyticsUi });

    const foldAnyModel = options.foldAnyKit.model({
      getState,
      sessionId: options.sessionId,
      foldAnyEventLimit: limits.foldAnyEvent,
      heroSeat: options.heroSeat,
      sanitizeFoldAnyEvent,
      settingsLogSnapshot,
      isActionRevealLocked: options.isActionRevealLocked,
      actionRevealText: options.actionRevealText,
      saveSessionData: options.saveSessionData,
      markTableDirty: options.markTableDirty,
      render: options.render,
      dealAnimationActive: options.dealAnimationActive,
      canHeroAct: options.canHeroAct,
      handleHeroAction: options.handleHeroAction
    });
    runtimeRegistry.set({ foldAnyModel });

    return {
      historyBridge,
      renderHistoryEntry,
      renderDecisionEntry,
      sanitizeHistoryEntry,
      sanitizeFoldAnyEvent,
      settingsLogSnapshot,
      aggregatePokerStats,
      emptyRateStat,
      roundBbMetric,
      replayEntries,
      telemetryModel,
      handCompletion,
      sessionExport,
      botLabRuntime,
      analyticsUi,
      foldAnyModel
    };
  }

  root.PokerSimulatorAppServicesComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppServicesComposition;
})();
