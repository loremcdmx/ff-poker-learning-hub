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
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const warn = typeof options.warn === "function" ? options.warn : noop;
    const runtimeRegistry = options.runtimeRegistry || { set: noop };
    const leaderboardKit = options.leaderboardKit || {};

    requireModel(options.sessionStoreKit, "PokerSimulatorSessionStore");
    requireModel(options.sessionBridgeKit, "PokerSimulatorSessionBridge");

    let sessionBridge = null;
    const sessionStore = options.sessionStoreKit.model({
      storage: options.storageBackend,
      keys: options.sessionStoreKeys,
      limits: options.limits,
      leaderboardKit,
      handLogKit: options.handLogKit,
      windowRef,
      defaultSessionArchiveEndpoint: options.defaultSessionArchiveEndpoint,
      renderLeaderboard: () => {
        const leaderboardDialog = options.getLeaderboardDialog?.();
        if (leaderboardDialog?.open) options.renderLeaderboardBody?.();
        // HUD "Всё время" merges remote-only sessions into its totals, so a
        // refreshed board must also refresh the stats panel (late-binding:
        // the HUD model is registered after this composition runs).
        runtimeRegistry.get?.("sessionHudModel")?.renderSessionStats?.();
      },
      sessionId: options.sessionId,
      getState,
      normalizeSessionPayload: options.normalizeSessionPayload,
      sessionMetrics: options.sessionMetrics,
      currentSessionPayload: options.currentSessionPayload,
      activeSimulatorProfile: () => (
        sessionBridge?.activeSimulatorProfile?.()
        || leaderboardKit.sanitizeProfileSnapshot?.(null)
        || {}
      ),
      cachedPokerStats: options.cachedPokerStats,
      cachedDecisionStats: options.cachedDecisionStats,
      signedBb: options.signedBb,
      warn
    });

    sessionBridge = options.sessionBridgeKit.model({
      settingsModel: options.settingsModel,
      opponentsKit: options.opponentsKit,
      leaderboardKit,
      sessionStore,
      getSessionExport: options.getSessionExport,
      storage: options.storageBackend,
      keys: options.sessionBridgeKeys,
      windowRef,
      getState,
      signedBb: options.signedBb,
      warn
    });
    runtimeRegistry.set({ sessionBridge });

    return {
      sessionStore,
      sessionBridge,
      loadSettings: sessionBridge.loadSettings,
      saveSettings: sessionBridge.saveSettings,
      loadOpponentNotes: sessionBridge.loadOpponentNotes,
      saveOpponentNotes: sessionBridge.saveOpponentNotes,
      loadOpponentModel: sessionBridge.loadOpponentModel,
      saveOpponentModel: sessionBridge.saveOpponentModel,
      loadSessionData: sessionBridge.loadSessionData,
      saveSessionData: sessionBridge.saveSessionData,
      acquireSessionLock: sessionBridge.acquireSessionLock,
      requestSessionTakeover: sessionBridge.requestSessionTakeover,
      releaseSessionLock: sessionBridge.releaseSessionLock,
      sessionLockState: sessionBridge.sessionLockState,
      loadHandLogData: sessionBridge.loadHandLogData,
      saveHandLogData: sessionBridge.saveHandLogData,
      handLogJsonl: sessionBridge.handLogJsonl,
      activeSimulatorProfile: sessionBridge.activeSimulatorProfile,
      compactSessionMetrics: sessionBridge.compactSessionMetrics,
      archiveCurrentSession: sessionBridge.archiveCurrentSession,
      archiveExportPayload: sessionBridge.archiveExportPayload,
      loadLeaderboardData: sessionBridge.loadLeaderboardData,
      leaderboardRatingFromMetrics: sessionBridge.leaderboardRatingFromMetrics,
      leaderboardPlayerKey: sessionBridge.leaderboardPlayerKey,
      migrateCurrentGuestLeaderboardToProfile: sessionBridge.migrateCurrentGuestLeaderboardToProfile,
      refreshCurrentLeaderboardEntry: sessionBridge.refreshCurrentLeaderboardEntry,
      leaderboardEntries: sessionBridge.leaderboardEntries,
      currentLeaderboardPlayerEntry: sessionBridge.currentLeaderboardPlayerEntry,
      leaderboardRankFor: sessionBridge.leaderboardRankFor,
      syncCurrentLeaderboardSnapshot: sessionBridge.syncCurrentLeaderboardSnapshot,
      refreshRemoteLeaderboard: sessionBridge.refreshRemoteLeaderboard,
      deleteCurrentLeaderboardEntry: sessionBridge.deleteCurrentLeaderboardEntry,
      leaderboardDeleteTokenForEntry: sessionBridge.leaderboardDeleteTokenForEntry
    };
  }

  root.PokerSimulatorAppSessionComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppSessionComposition;
})();
