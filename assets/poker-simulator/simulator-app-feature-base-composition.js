(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`${name} is required`);
    }
    return value;
  }

  function requireModel(kit, name) {
    if (!kit || typeof kit.model !== "function") {
      throw new Error(`${name} is not loaded - check <script> order in poker-simulator.html`);
    }
    return kit;
  }

  function model(options = {}) {
    const runtime = requireObject(options.runtime, "runtime");
    const dependencies = requireObject(runtime.dependencies, "runtime.dependencies");
    const refs = requireObject(runtime.refs, "runtime.refs");
    const windowRef = runtime.windowRef || root;
    const documentRef = runtime.documentRef || windowRef.document;
    const state = requireObject(runtime.state, "runtime.state");
    const appFoundation = requireObject(runtime.appFoundation, "runtime.appFoundation");
    const appSessionComposition = requireObject(runtime.appSessionComposition, "runtime.appSessionComposition");
    const runtimeBridge = requireObject(runtime.runtimeBridge, "runtime.runtimeBridge");
    const runtimeRegistry = requireObject(runtime.runtimeRegistry, "runtime.runtimeRegistry");
    if (typeof runtimeRegistry.call !== "function") throw new Error("runtime.runtimeRegistry.call is required");
    const renderLoop = requireObject(runtime.renderLoop, "runtime.renderLoop");
    const tableViewModel = requireObject(runtime.tableViewModel, "runtime.tableViewModel");
    const visualRuntime = requireObject(runtime.visualRuntime, "runtime.visualRuntime");
    const actionBridge = requireObject(runtime.actionBridge, "runtime.actionBridge");
    const {
      appServicesCompositionKit,
      appPrimitivesCompositionKit,
      appUiCompositionKit,
      opponentsKit
    } = dependencies;
    requireModel(appServicesCompositionKit, "PokerSimulatorAppServicesComposition");
    requireModel(appPrimitivesCompositionKit, "PokerSimulatorAppPrimitivesComposition");
    requireModel(appUiCompositionKit, "PokerSimulatorAppUiComposition");
    requireObject(opponentsKit, "PokerSimulatorOpponents");
    const {
      isActionRevealLocked,
      isPaused,
      setPaused,
      actionRevealText
    } = visualRuntime;
    const markTableDirty = renderLoop.markTableDirty;
    const markAllTablesDirty = renderLoop.markAllTablesDirty;
    const render = renderLoop.render;
    const opponentNoteKeyForSeat = opponentsKit.opponentNoteKeyForSeat;
    const opponentNoteHasContent = opponentsKit.opponentNoteHasContent;
    const sanitizeOpponentNoteKey = opponentsKit.sanitizeOpponentNoteKey;
    const sanitizeOpponentNoteTag = opponentsKit.sanitizeOpponentNoteTag;
    const sanitizeOpponentNoteEntry = opponentsKit.sanitizeOpponentNoteEntry;
    let actionRuntime = null;

    const dealAnimationActive = runtimeRegistry.call("dealAnimationActive", () => false);
    const appServices = appServicesCompositionKit.model({
      windowRef,
      documentRef,
      state,
      getState: () => state,
      runtimeRegistry,
      historyBridgeKit: dependencies.historyBridgeKit,
      telemetryKit: dependencies.telemetryKit,
      handCompletionKit: dependencies.handCompletionKit,
      sessionExportKit: dependencies.sessionExportKit,
      botLabRuntimeKit: dependencies.botLabRuntimeKit,
      analyticsUiKit: dependencies.analyticsUiKit,
      foldAnyKit: dependencies.foldAnyKit,
      engine: dependencies.engine,
      handLogKit: dependencies.handLogKit,
      sessionGraphKit: dependencies.sessionGraphKit,
      botLabKit: dependencies.botLabKit,
      sessionId: appFoundation.bootSessionId,
      limits: {
        sessionHistory: appFoundation.sessionHistoryLimit,
        handLog: appFoundation.handLogLimit,
        foldAnyEvent: appFoundation.foldAnyEventLimit
      },
      currentSessionPayload: appFoundation.currentSessionPayload,
      sessionMetrics: appFoundation.sessionMetrics,
      compactSessionMetrics: appSessionComposition.compactSessionMetrics,
      saveSessionData: appSessionComposition.saveSessionData,
      saveHandLogData: appSessionComposition.saveHandLogData,
      refreshCurrentLeaderboardEntry: appSessionComposition.refreshCurrentLeaderboardEntry,
      leaderboardDialogOpen: () => Boolean(refs.leaderboardDialog?.open),
      renderLeaderboardBody: runtimeBridge.renderLeaderboardBody,
      recordOpponentLearning: runtimeBridge.recordOpponentLearning,
      simulatorProgressResult: runtimeBridge.simulatorProgressResult,
      sendSimulatorSessionTelemetry: runtimeBridge.sendSimulatorSessionTelemetry,
      handLogEndpoint: appFoundation.defaultHandLogEndpoint,
      archiveExportPayload: appSessionComposition.archiveExportPayload,
      handLogJsonl: appSessionComposition.handLogJsonl,
      cachedDecisionStats: appFoundation.cachedDecisionStats,
      currentLeaderboardPlayerEntry: appSessionComposition.currentLeaderboardPlayerEntry,
      leaderboardEntries: appSessionComposition.leaderboardEntries,
      leaderboardDeleteTokenForEntry: appSessionComposition.leaderboardDeleteTokenForEntry,
      isPaused,
      render,
      randomChance: appFoundation.browserRandomChance,
      actionBridge,
      clampBetValue: appFoundation.clampBetValue,
      activeSimulatorProfile: appSessionComposition.activeSimulatorProfile,
      leaderboardRankFor: appSessionComposition.leaderboardRankFor,
      leaderboardPlayerKey: appSessionComposition.leaderboardPlayerKey,
      leaderboardRatingFromMetrics: appSessionComposition.leaderboardRatingFromMetrics,
      cachedPokerStats: appFoundation.cachedPokerStats,
      trackedCbetStreets: appFoundation.trackedCbetStreets,
      trackedPositions: appFoundation.trackedPositions,
      botLabBandSettings: runtimeBridge.botLabBandSettings,
      startModel: appFoundation.startModel,
      streetLabel: runtimeBridge.streetLabel,
      escapeHtml: appFoundation.escapeHtml,
      formatDecisionDuration: appFoundation.formatDecisionDuration,
      heroSeat: tableViewModel.heroSeat,
      isActionRevealLocked,
      actionRevealText,
      markTableDirty,
      dealAnimationActive: (table) => dealAnimationActive(table),
      canHeroAct: tableViewModel.canHeroAct,
      handleHeroAction: runtimeBridge.handleHeroAction,
      heroBusted: tableViewModel.heroBusted
    });

    const appPrimitives = appPrimitivesCompositionKit.model({
      windowRef,
      documentRef,
      state,
      getState: () => state,
      runtimeRegistry,
      formatKit: dependencies.formatKit,
      audioKit: dependencies.audioKit,
      bettingKit: dependencies.bettingKit,
      heroActionsKit: dependencies.heroActionsKit,
      replayKit: dependencies.replayKit,
      replayHistoryKit: dependencies.replayHistoryKit,
      cardsKit: dependencies.cardsKit,
      replayUiKit: dependencies.replayUiKit,
      engine: dependencies.engine,
      chipKit: dependencies.chipKit,
      deckKit: dependencies.deckKit,
      startModel: appFoundation.startModel,
      actionBridge,
      formatAmount: appFoundation.formatAmount,
      roundBb: appFoundation.roundBb,
      heroSeat: tableViewModel.heroSeat,
      canHeroAct: tableViewModel.canHeroAct,
      streetLabel: runtimeBridge.streetLabel,
      escapeHtml: appFoundation.escapeHtml,
      visibleBoardLength: tableViewModel.visibleBoardLength
    });

    const appUiComposition = appUiCompositionKit.model({
      windowRef,
      documentRef,
      state,
      getState: () => state,
      runtimeRegistry,
      domControlsKit: dependencies.domControlsKit,
      sessionHudKit: dependencies.sessionHudKit,
      replayControllerKit: dependencies.replayControllerKit,
      analyticsUiKit: dependencies.analyticsUiKit,
      sessionRuntimeKit: dependencies.sessionRuntimeKit,
      shellControlsKit: dependencies.shellControlsKit,
      simulationControlsKit: dependencies.simulationControlsKit,
      opponentNotesKit: dependencies.opponentNotesKit,
      sessionMetricsModel: appFoundation.sessionMetricsModel,
      isPaused,
      now: () => Date.now(),
      domPatch: appFoundation.domPatch,
      signed: appFoundation.signed,
      signedBb: appFoundation.signedBb,
      roundBbMetric: appServices.roundBbMetric,
      replayEntries: appServices.replayEntries,
      renderHistoryEntry: appServices.renderHistoryEntry,
      renderDecisionEntry: appServices.renderDecisionEntry,
      replayUi: appPrimitives.replayUi,
      replayModel: appPrimitives.replayModel,
      analyticsUi: appServices.analyticsUi,
      sessionMetrics: appFoundation.sessionMetrics,
      activeSimulatorProfile: appSessionComposition.activeSimulatorProfile,
      migrateCurrentGuestLeaderboardToProfile: appSessionComposition.migrateCurrentGuestLeaderboardToProfile,
      refreshCurrentLeaderboardEntry: appSessionComposition.refreshCurrentLeaderboardEntry,
      syncCurrentLeaderboardSnapshot: appSessionComposition.syncCurrentLeaderboardSnapshot,
      refreshRemoteLeaderboard: appSessionComposition.refreshRemoteLeaderboard,
      deleteCurrentLeaderboardEntry: appSessionComposition.deleteCurrentLeaderboardEntry,
      leaderboardDeleteTokenForEntry: appSessionComposition.leaderboardDeleteTokenForEntry,
      sessionLockState: appSessionComposition.sessionLockState,
      storageBackend: appFoundation.storageBackend,
      sessionRuntimeKeys: {
        session: appFoundation.sessionStorageKey,
        handLog: appFoundation.handLogStorageKey
      },
      setPaused,
      archiveCurrentSession: appSessionComposition.archiveCurrentSession,
      clearAllActionClocks: () => actionRuntime?.clearAllActionClocks?.(),
      clearAllBotResponseTimers: () => actionRuntime?.clearAllBotResponseTimers?.(),
      createSessionId: appFoundation.createSessionId,
      resetTempoCounter: appFoundation.resetTempoCounter,
      stopReplayAutoplay: runtimeBridge.stopReplayAutoplay,
      saveSessionData: appSessionComposition.saveSessionData,
      saveHandLogData: appSessionComposition.saveHandLogData,
      syncTableCount: runtimeBridge.syncTableCount,
      normalizeSessionPayload: appFoundation.normalizeSessionPayload,
      render,
      renderImportStatus: runtimeBridge.renderImportStatus,
      renderAnalytics: runtimeBridge.renderAnalytics,
      saveSettings: appSessionComposition.saveSettings,
      markAllTablesDirty,
      renderSessionStats: appFoundation.renderSessionStats,
      sanitizeStatsScope: appFoundation.sanitizeStatsScope,
      startModel: appFoundation.startModel,
      applySettingsFromControls: () => refs.eventWiring?.applySettingsFromControls?.(),
      sanitizeOpponentNoteKey,
      sanitizeOpponentNoteTag,
      sanitizeOpponentNoteEntry,
      opponentNoteKeyForSeat,
      opponentNoteHasContent,
      saveOpponentNotes: appSessionComposition.saveOpponentNotes,
      formatAmount: appFoundation.formatAmount,
      escapeHtml: appFoundation.escapeHtml
    });
    refs.leaderboardDialog = appUiComposition.leaderboardDialog;
    refs.tableGrid = appUiComposition.tableGrid;
    refs.botLabOutput = appUiComposition.botLabOutput;
    refs.packSelect = appUiComposition.packSelect;

    appFoundation.settingsModel.applyEmbeddedBootParams(state.settings);
    appFoundation.applyPlayerPathBootParams();

    return {
      appServices,
      appPrimitives,
      appUiComposition,
      domControls: appUiComposition.domControls,
      setActionRuntime: (nextActionRuntime) => {
        actionRuntime = nextActionRuntime || null;
      }
    };
  }

  root.PokerSimulatorAppFeatureBaseComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppFeatureBaseComposition;
})();
