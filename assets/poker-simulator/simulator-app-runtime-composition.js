(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const documentRef = options.documentRef || windowRef.document;
    const dependencies = options.dependencies || {};
    const refs = options.refs || {};
    const warn = typeof options.warn === "function" ? options.warn : noop;
    const {
      appFoundationCompositionKit,
      actionBridgeKit,
      visualRuntimeCompositionKit,
      runtimeBridgeCompositionKit,
      appSessionCompositionKit,
      timingConfigKit,
      tableViewModelKit,
      renderLoopKit
    } = dependencies;
    const timings = dependencies.timings;
    let saveSettingsFn = noop;
    let saveOpponentModel = noop;
    let state = null;

    const appFoundation = appFoundationCompositionKit.model({
      windowRef,
      documentRef,
      engine: dependencies.engine,
      stateKit: dependencies.stateKit,
      formatKit: dependencies.formatKit,
      randomKit: dependencies.randomKit,
      bettingKit: dependencies.bettingKit,
      startKit: dependencies.startKit,
      settingsKit: dependencies.settingsKit,
      bootKit: dependencies.bootKit,
      runtimeRegistryKit: dependencies.runtimeRegistryKit,
      sessionCompositionKit: dependencies.sessionCompositionKit,
      sessionMetricsKit: dependencies.sessionMetricsKit,
      sessionMetricsBridgeKit: dependencies.sessionMetricsBridgeKit,
      sessionHudBridgeKit: dependencies.sessionHudBridgeKit,
      handLogKit: dependencies.handLogKit,
      leaderboardKit: dependencies.leaderboardKit,
      perfKit: dependencies.perfKit,
      domKit: dependencies.domKit,
      getPackSelect: () => refs.packSelect,
      getTableGrid: () => refs.tableGrid,
      saveSettings: () => saveSettingsFn(),
      warn
    });

    const runtimeRegistry = appFoundation.runtimeRegistry;
    const actionBridge = actionBridgeKit.model({
      getHeroActions: runtimeRegistry.getter("heroActions"),
      getActionControls: runtimeRegistry.getter("actionControls")
    });
    const visualRuntime = visualRuntimeCompositionKit.model({
      visualBridgeKit: dependencies.visualBridgeKit,
      visualStateBridgeKit: dependencies.visualStateBridgeKit,
      tableEffectsBridgeKit: dependencies.tableEffectsBridgeKit,
      visualRuntimeFacadeKit: dependencies.visualRuntimeFacadeKit,
      visualCoreCompositionKit: dependencies.visualCoreCompositionKit,
      visualRenderCompositionKit: dependencies.visualRenderCompositionKit,
      getShellControls: runtimeRegistry.getter("shellControls")
    });
    const runtimeBridge = runtimeBridgeCompositionKit.model({
      runtimeBridgeKit: dependencies.runtimeBridgeKit,
      runtimeRegistry,
      engine: dependencies.engine,
      opponentsKit: dependencies.opponentsKit,
      botLabKit: dependencies.botLabKit,
      saveOpponentModel: () => saveOpponentModel(),
      domPatch: appFoundation.domPatch,
      escapeHtml: appFoundation.escapeHtml,
      getState: () => state,
      getBotLabOutput: () => refs.botLabOutput
    });

    const appSessionComposition = appSessionCompositionKit.model({
      windowRef,
      sessionStoreKit: dependencies.sessionStoreKit,
      sessionBridgeKit: dependencies.sessionBridgeKit,
      settingsModel: appFoundation.settingsModel,
      opponentsKit: dependencies.opponentsKit,
      leaderboardKit: dependencies.leaderboardKit,
      handLogKit: dependencies.handLogKit,
      runtimeRegistry,
      storageBackend: appFoundation.storageBackend,
      sessionStoreKeys: {
        session: appFoundation.sessionStorageKey,
        handLog: appFoundation.handLogStorageKey,
        legacySession: appFoundation.legacySessionStorageKey,
        legacyHandLog: appFoundation.legacyHandLogStorageKey,
        sessionArchive: appFoundation.sessionArchiveStorageKey,
        leaderboard: appFoundation.leaderboardStorageKey
      },
      sessionBridgeKeys: {
        opponentNotes: appFoundation.opponentNotesStorageKey,
        opponentModel: appFoundation.opponentModelStorageKey
      },
      limits: {
        sessionHistory: appFoundation.sessionHistoryLimit,
        sessionDecision: appFoundation.sessionDecisionLimit,
        foldAnyEvent: appFoundation.foldAnyEventLimit,
        handLog: appFoundation.handLogLimit,
        sessionArchive: appFoundation.sessionArchiveLimit,
        leaderboard: appFoundation.leaderboardLimit,
        leaderboardSnapshotMinHandsStep: appFoundation.leaderboardSnapshotMinHandsStep,
        leaderboardSnapshotMinIntervalMs: appFoundation.leaderboardSnapshotMinIntervalMs
      },
      defaultSessionArchiveEndpoint: appFoundation.defaultSessionArchiveEndpoint,
      getLeaderboardDialog: () => refs.leaderboardDialog,
      renderLeaderboardBody: runtimeBridge.renderLeaderboardBody,
      sessionId: appFoundation.bootSessionId,
      getState: () => state,
      normalizeSessionPayload: appFoundation.normalizeSessionPayload,
      sessionMetrics: appFoundation.sessionMetrics,
      currentSessionPayload: appFoundation.currentSessionPayload,
      cachedPokerStats: appFoundation.cachedPokerStats,
      cachedDecisionStats: appFoundation.cachedDecisionStats,
      signedBb: appFoundation.signedBb,
      getSessionExport: runtimeRegistry.getter("sessionExport"),
      warn
    });
    saveSettingsFn = appSessionComposition.saveSettings;
    saveOpponentModel = appSessionComposition.saveOpponentModel;

    const timingConfig = timingConfigKit.model(timings);
    state = appFoundation.createInitialState({
      loadSettings: appSessionComposition.loadSettings,
      loadSessionData: appSessionComposition.loadSessionData,
      loadHandLogData: appSessionComposition.loadHandLogData,
      loadLeaderboardData: appSessionComposition.loadLeaderboardData,
      loadOpponentNotes: appSessionComposition.loadOpponentNotes,
      loadOpponentModel: appSessionComposition.loadOpponentModel
    });

    const formatAmount = appFoundation.formatAmount;
    const tableViewModel = tableViewModelKit.model({
      getState: () => state,
      actionRevealText: visualRuntime.actionRevealText,
      visualRuntime,
      runtimeBridge,
      actionBridge,
      runtimeRegistry,
      formatHelpers: { formatAmount }
    });
    const renderLoop = renderLoopKit.model({
      windowRef,
      state,
      perfModel: appFoundation.perfModel,
      renderNow: runtimeBridge.renderNow
    });

    return {
      windowRef,
      documentRef,
      dependencies,
      refs,
      appFoundation,
      actionBridge,
      visualRuntime,
      runtimeBridge,
      appSessionComposition,
      timingConfig,
      state,
      tableViewModel,
      renderLoop,
      runtimeRegistry
    };
  }

  root.PokerSimulatorAppRuntimeComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppRuntimeComposition;
})();
