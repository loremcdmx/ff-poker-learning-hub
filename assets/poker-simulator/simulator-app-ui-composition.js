(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const documentRef = options.documentRef || windowRef.document;
    const getState = typeof options.getState === "function" ? options.getState : () => options.state || {};
    const state = options.state || getState() || {};
    const runtimeRegistry = options.runtimeRegistry || { set: noop };
    const domControlsKit = options.domControlsKit || windowRef.PokerSimulatorDomControls || {};
    if (typeof domControlsKit.query !== "function") {
      throw new Error("PokerSimulatorDomControls is not loaded - check <script> order in poker-simulator.html");
    }

    const domControls = domControlsKit.query(documentRef);
    const {
      tableGrid,
      settingsDialog,
      replayDialog,
      analyticsDialog,
      leaderboardDialog,
      importHistoryInput,
      botLabOutput,
      replayBody,
      packSelect,
      analyticsBody,
      countButtons
    } = domControls;

    const sessionHudModel = options.sessionHudKit.model({
      getState,
      metricsModel: options.sessionMetricsModel,
      isPaused: options.isPaused,
      now: options.now,
      domPatch: options.domPatch,
      signed: options.signed,
      signedBb: options.signedBb,
      roundBbMetric: options.roundBbMetric,
      replayEntries: options.replayEntries,
      renderHistoryEntry: options.renderHistoryEntry,
      renderDecisionEntry: options.renderDecisionEntry,
      controls: domControls.sessionHudControls
    });
    runtimeRegistry.set({ sessionHudModel });

    const replayController = options.replayControllerKit.model({
      windowRef,
      state,
      replayDialog,
      replayBody,
      replayUi: options.replayUi,
      replayEntries: options.replayEntries,
      replayModel: options.replayModel
    });
    runtimeRegistry.set({ replayController });

    const analyticsDialogs = options.analyticsUiKit.dialogModel({
      analyticsUi: options.analyticsUi,
      windowRef,
      getState,
      sessionMetrics: options.sessionMetrics,
      activeSimulatorProfile: options.activeSimulatorProfile,
      migrateCurrentGuestLeaderboardToProfile: options.migrateCurrentGuestLeaderboardToProfile,
      refreshCurrentLeaderboardEntry: options.refreshCurrentLeaderboardEntry,
      syncCurrentLeaderboardSnapshot: options.syncCurrentLeaderboardSnapshot,
      refreshRemoteLeaderboard: options.refreshRemoteLeaderboard,
      deleteCurrentLeaderboardEntry: options.deleteCurrentLeaderboardEntry,
      leaderboardDeleteTokenForEntry: options.leaderboardDeleteTokenForEntry,
      setPaused: options.setPaused,
      domPatch: options.domPatch,
      ...domControls.analyticsDialogs
    });
    runtimeRegistry.set({ analyticsDialogs });

    const sessionRuntime = options.sessionRuntimeKit.model({
      getState,
      storageBackend: options.storageBackend,
      keys: options.sessionRuntimeKeys,
      sessionLockState: options.sessionLockState,
      isPaused: options.isPaused,
      setPaused: options.setPaused,
      archiveCurrentSession: options.archiveCurrentSession,
      clearAllActionClocks: options.clearAllActionClocks,
      clearAllBotResponseTimers: options.clearAllBotResponseTimers,
      createSessionId: options.createSessionId,
      resetTempoCounter: options.resetTempoCounter,
      stopReplayAutoplay: options.stopReplayAutoplay,
      saveSessionData: options.saveSessionData,
      saveHandLogData: options.saveHandLogData,
      syncTableCount: options.syncTableCount,
      normalizeSessionPayload: options.normalizeSessionPayload,
      sessionMetrics: options.sessionMetrics,
      render: options.render,
      renderImportStatus: options.renderImportStatus,
      analyticsDialog,
      analyticsBody,
      renderAnalytics: options.renderAnalytics,
      importHistoryInput
    });
    runtimeRegistry.set({ sessionRuntime });

    const shellControls = options.shellControlsKit.model({
      documentRef,
      getState,
      saveSettings: options.saveSettings,
      markAllTablesDirty: options.markAllTablesDirty,
      render: options.render,
      renderSessionStats: options.renderSessionStats,
      sanitizeStatsScope: options.sanitizeStatsScope,
      isPaused: options.isPaused,
      ...domControls.shellControls
    });
    runtimeRegistry.set({ shellControls });

    const simulationControls = options.simulationControlsKit.model({
      documentRef,
      getSettings: () => getState()?.settings || {},
      startModel: options.startModel,
      domPatch: options.domPatch,
      applySettingsFromControls: options.applySettingsFromControls,
      controls: domControls.simulationControls
    });
    runtimeRegistry.set({ simulationControls });

    const opponentNotesUi = options.opponentNotesKit.model({
      windowRef,
      getState,
      opponentNoteKeyForSeat: options.opponentNoteKeyForSeat,
      opponentNoteHasContent: options.opponentNoteHasContent,
      sanitizeOpponentNoteKey: options.sanitizeOpponentNoteKey,
      sanitizeOpponentNoteTag: options.sanitizeOpponentNoteTag,
      sanitizeOpponentNoteEntry: options.sanitizeOpponentNoteEntry,
      saveOpponentNotes: options.saveOpponentNotes,
      markAllTablesDirty: options.markAllTablesDirty,
      render: options.render,
      formatAmount: options.formatAmount,
      escapeHtml: options.escapeHtml,
      controls: domControls.opponentNotes
    });
    runtimeRegistry.set({ opponentNotesUi });

    return {
      domControls,
      tableGrid,
      settingsDialog,
      replayDialog,
      analyticsDialog,
      leaderboardDialog,
      importHistoryInput,
      botLabOutput,
      replayBody,
      packSelect,
      analyticsBody,
      countButtons,
      sessionHudModel,
      replayController,
      analyticsDialogs,
      sessionRuntime,
      shellControls,
      simulationControls,
      opponentNotesUi
    };
  }

  root.PokerSimulatorAppUiComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppUiComposition;
})();
