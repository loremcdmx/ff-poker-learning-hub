(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const storage = options.storage || null;
    const keys = options.keys || {};
    const limits = options.limits || {};
    const leaderboardKit = options.leaderboardKit || root.PokerSimulatorLeaderboard || {};
    const handLogKit = options.handLogKit || root.PokerSimulatorHandLog || {};
    const windowRef = options.windowRef || root;
    const defaultSessionArchiveEndpoint = String(options.defaultSessionArchiveEndpoint || "/api/simulator-sessions");
    const renderLeaderboard = typeof options.renderLeaderboard === "function" ? options.renderLeaderboard : () => {};
    const getState = typeof options.getState === "function" ? options.getState : () => null;
    const normalizeSessionPayload = typeof options.normalizeSessionPayload === "function" ? options.normalizeSessionPayload : () => null;
    const sessionMetrics = typeof options.sessionMetrics === "function" ? options.sessionMetrics : () => ({});
    const currentSessionPayload = typeof options.currentSessionPayload === "function" ? options.currentSessionPayload : () => null;
    const activeSimulatorProfile = typeof options.activeSimulatorProfile === "function" ? options.activeSimulatorProfile : () => sanitizeProfileSnapshot(null);
    const cachedPokerStats = typeof options.cachedPokerStats === "function" ? options.cachedPokerStats : () => ({});
    const cachedDecisionStats = typeof options.cachedDecisionStats === "function" ? options.cachedDecisionStats : () => ({});
    const signedBb = typeof options.signedBb === "function" ? options.signedBb : (value) => `${roundBbMetric(value)} BB`;
    const warn = typeof options.warn === "function" ? options.warn : () => {};
    const sessionArchiveLimit = Math.max(1, Number(limits.sessionArchive || 60));
    const leaderboardLimit = Math.max(1, Number(limits.leaderboard || 100));
    const sessionHistoryLimit = Math.max(0, Number(limits.sessionHistory || 500));
    const sessionDecisionLimit = Math.max(0, Number(limits.sessionDecision || 2000));
    const foldAnyEventLimit = Math.max(0, Number(limits.foldAnyEvent || 2000));
    const handLogLimit = Math.max(0, Number(limits.handLog || 5000));
    const leaderboardSnapshotMinHandsStep = Math.max(1, Number(limits.leaderboardSnapshotMinHandsStep || 5));
    const leaderboardSnapshotMinIntervalMs = Math.max(0, Number(limits.leaderboardSnapshotMinIntervalMs || 30000));
    const sessionId = String(options.sessionId || "");
    const sessionLockName = String(options.sessionLockName || "ff.sim.session");
    const deleteTokensKey = String(keys.deleteTokens || options.deleteTokensKey || "ff.poker.table-simulator.leaderboard-delete-tokens.v1");

    function currentState() {
      return getState() || null;
    }

    function nowIso() {
      return new Date().toISOString();
    }

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

    // SES-2/SES-3: a swallowed quota failure used to leave only a console
    // warning. Record the degradation on state so the UI (import status /
    // future toast) can tell the player their progress is not being saved.
    function markPersistenceDegraded(state, message, reason = "storage", owner = "") {
      if (!state) return;
      state.persistenceDegradedAt = Date.now();
      state.persistenceWarning = message;
      state.persistenceWarningReason = reason;
      state.persistenceWarningOwner = String(owner || "");
      if (!state.importStatus || String(state.importStatus).startsWith("Память браузера") || String(state.importStatus).startsWith("Не удалось сохранить")) {
        state.importStatus = message;
      }
    }

    function clearPersistenceWarningAfterCleanSave(state, owner = "") {
      if (!state || isSessionReadOnly()) return;
      if (!state.persistenceWarning) return;
      if (["read-only", "foreign-tab"].includes(String(state.persistenceWarningReason || ""))) return;
      const requestedOwner = String(owner || "");
      const warningOwner = String(state.persistenceWarningOwner || "");
      if (requestedOwner ? warningOwner !== requestedOwner : Boolean(warningOwner)) return;
      const previousWarning = String(state.persistenceWarning || "");
      state.persistenceWarning = "";
      state.persistenceWarningReason = "";
      state.persistenceWarningOwner = "";
      state.persistenceRestoredAt = Date.now();
      if (String(state.importStatus || "") === previousWarning) state.importStatus = "";
    }

    function clearSessionOwnershipWarning(state) {
      if (!state || !state.persistenceWarning) return;
      if (!["read-only", "foreign-tab"].includes(String(state.persistenceWarningReason || ""))) return;
      const previousWarning = String(state.persistenceWarning || "");
      state.persistenceWarning = "";
      state.persistenceWarningReason = "";
      state.persistenceWarningOwner = "";
      state.persistenceRestoredAt = Date.now();
      if (String(state.importStatus || "") === previousWarning) state.importStatus = "";
    }

    // Shared all-time-totals counter, owned by the composer: the archive module
    // bumps it (via ctx.bumpArchiveRevision) on each saveSessionArchive write, and
    // the totals module reads it (via ctx.getArchiveRevision) as its HUD-render
    // cache key — so an archive write invalidates the "Всё время" memo.
    let archiveRevision = 0;
    function bumpArchiveRevision() {
      archiveRevision += 1;
    }
    function getArchiveRevision() {
      return archiveRevision;
    }

    // Shared composition context. Every carved-out sibling module receives this
    // one object and reaches helpers / option passthroughs / sibling methods
    // through it, late-bound, so circular concerns (archive <-> leaderboard) and
    // shared state (archiveRevision) resolve at call time, not construction time.
    // Function declarations below are hoisted, so referencing them here is safe;
    // sibling methods are folded in with Object.assign as each module composes.
    const ctx = {
      storage,
      keys,
      sessionId,
      sessionLockName,
      deleteTokensKey,
      sessionArchiveLimit,
      leaderboardLimit,
      leaderboardSnapshotMinHandsStep,
      leaderboardSnapshotMinIntervalMs,
      sessionHistoryLimit,
      sessionDecisionLimit,
      foldAnyEventLimit,
      handLogLimit,
      windowRef,
      defaultSessionArchiveEndpoint,
      renderLeaderboard,
      getState,
      currentState,
      normalizeSessionPayload,
      sessionMetrics,
      currentSessionPayload,
      activeSimulatorProfile,
      cachedPokerStats,
      cachedDecisionStats,
      signedBb,
      warn,
      leaderboardKit,
      handLogKit,
      nowIso,
      finiteNumber,
      roundBbMetric,
      ratio,
      markPersistenceDegraded,
      clearPersistenceWarningAfterCleanSave,
      clearSessionOwnershipWarning,
      bumpArchiveRevision,
      getArchiveRevision
    };

    // Tab-scoped live-session status + legacy foreign-write detection -> simulator-session-lock.js.
    const lockKit = options.lockKit || root.PokerSimulatorSessionLock || {};
    const lock = typeof lockKit.model === "function" ? lockKit.model(ctx) : {};
    Object.assign(ctx, lock);
    const sessionLockState = typeof lock.sessionLockState === "function"
      ? lock.sessionLockState
      : () => ({ supported: false, owner: true, readOnly: false, takeoverPending: false, message: "", updatedAt: 0 });
    const isSessionReadOnly = typeof lock.isSessionReadOnly === "function" ? lock.isSessionReadOnly : () => false;
    const markSessionReadOnly = typeof lock.markSessionReadOnly === "function" ? lock.markSessionReadOnly : () => {};
    const acquireSessionLock = typeof lock.acquireSessionLock === "function" ? lock.acquireSessionLock : () => Promise.resolve(true);
    const requestSessionTakeover = typeof lock.requestSessionTakeover === "function" ? lock.requestSessionTakeover : () => Promise.resolve(true);
    const releaseSessionLock = typeof lock.releaseSessionLock === "function" ? lock.releaseSessionLock : () => {};
    const handleForeignSessionStorageWrite = typeof lock.handleForeignSessionStorageWrite === "function" ? lock.handleForeignSessionStorageWrite : () => false;

    // Leaderboard aggregation -> simulator-session-leaderboard.js. Composed BEFORE
    // archive so the archive<->leaderboard cycle resolves: the leaderboard module
    // reads the three archive helpers it needs lazily from ctx, while the archive
    // module (next) reads leaderboard helpers off ctx at construction.
    const leaderboardKitModel = options.leaderboardModelKit || root.PokerSimulatorSessionLeaderboard || {};
    const leaderboard = typeof leaderboardKitModel.model === "function" ? leaderboardKitModel.model(ctx) : {};
    Object.assign(ctx, leaderboard);
    const compactSessionMetrics = typeof leaderboard.compactSessionMetrics === "function" ? leaderboard.compactSessionMetrics : (metrics) => (metrics && typeof metrics === "object" ? { ...metrics } : {});
    const sanitizeProfileSnapshot = typeof leaderboard.sanitizeProfileSnapshot === "function" ? leaderboard.sanitizeProfileSnapshot : (profile) => profile || {};
    const isPublicLeaderboardProfile = typeof leaderboard.isPublicLeaderboardProfile === "function" ? leaderboard.isPublicLeaderboardProfile : () => false;
    const normalizeLeaderboardEntry = typeof leaderboard.normalizeLeaderboardEntry === "function" ? leaderboard.normalizeLeaderboardEntry : () => null;
    const leaderboardPlayerKey = typeof leaderboard.leaderboardPlayerKey === "function" ? leaderboard.leaderboardPlayerKey : () => "";
    const aggregateLeaderboardEntriesByPlayer = typeof leaderboard.aggregateLeaderboardEntriesByPlayer === "function" ? leaderboard.aggregateLeaderboardEntriesByPlayer : (entries) => entries;
    const sortLeaderboardEntries = typeof leaderboard.sortLeaderboardEntries === "function" ? leaderboard.sortLeaderboardEntries : (entries) => (Array.isArray(entries) ? entries : []);
    const leaderboardRatingFromMetrics = typeof leaderboard.leaderboardRatingFromMetrics === "function" ? leaderboard.leaderboardRatingFromMetrics : () => ({});
    const loadLeaderboardData = typeof leaderboard.loadLeaderboardData === "function" ? leaderboard.loadLeaderboardData : () => [];
    const saveLeaderboardData = typeof leaderboard.saveLeaderboardData === "function" ? leaderboard.saveLeaderboardData : () => [];
    const loadLeaderboardDeleteTokens = typeof leaderboard.loadLeaderboardDeleteTokens === "function" ? leaderboard.loadLeaderboardDeleteTokens : () => ({});
    const saveLeaderboardDeleteTokens = typeof leaderboard.saveLeaderboardDeleteTokens === "function" ? leaderboard.saveLeaderboardDeleteTokens : () => ({});
    const leaderboardDeleteTokenForEntry = typeof leaderboard.leaderboardDeleteTokenForEntry === "function" ? leaderboard.leaderboardDeleteTokenForEntry : () => "";
    const mergeLeaderboardEntries = typeof leaderboard.mergeLeaderboardEntries === "function" ? leaderboard.mergeLeaderboardEntries : () => [];
    const leaderboardEntryFromArchive = typeof leaderboard.leaderboardEntryFromArchive === "function" ? leaderboard.leaderboardEntryFromArchive : () => null;
    const currentLeaderboardEntry = typeof leaderboard.currentLeaderboardEntry === "function" ? leaderboard.currentLeaderboardEntry : () => null;
    const migrateCurrentGuestLeaderboardToProfile = typeof leaderboard.migrateCurrentGuestLeaderboardToProfile === "function" ? leaderboard.migrateCurrentGuestLeaderboardToProfile : () => false;
    const refreshCurrentLeaderboardEntry = typeof leaderboard.refreshCurrentLeaderboardEntry === "function" ? leaderboard.refreshCurrentLeaderboardEntry : () => null;
    const remoteLeaderboardUsable = typeof leaderboard.remoteLeaderboardUsable === "function" ? leaderboard.remoteLeaderboardUsable : () => false;
    const remoteCoversCurrentEntry = typeof leaderboard.remoteCoversCurrentEntry === "function" ? leaderboard.remoteCoversCurrentEntry : () => false;
    const sanitizeLeaderboardFilters = typeof leaderboard.sanitizeLeaderboardFilters === "function" ? leaderboard.sanitizeLeaderboardFilters : () => ({ period: "season", players: "all", difficulty: "all", query: "", sort: "score" });
    const leaderboardEntries = typeof leaderboard.leaderboardEntries === "function" ? leaderboard.leaderboardEntries : () => [];
    const currentLeaderboardPlayerEntry = typeof leaderboard.currentLeaderboardPlayerEntry === "function" ? leaderboard.currentLeaderboardPlayerEntry : () => null;
    const leaderboardRankFor = typeof leaderboard.leaderboardRankFor === "function" ? leaderboard.leaderboardRankFor : () => 0;
    const simulatorArchiveEndpoint = typeof leaderboard.simulatorArchiveEndpoint === "function" ? leaderboard.simulatorArchiveEndpoint : () => "";
    const simulatorLeaderboardEndpoint = typeof leaderboard.simulatorLeaderboardEndpoint === "function" ? leaderboard.simulatorLeaderboardEndpoint : () => "";
    const simulatorPlayerStatsEndpoint = typeof leaderboard.simulatorPlayerStatsEndpoint === "function" ? leaderboard.simulatorPlayerStatsEndpoint : () => "";
    const canSyncLeaderboardProfile = typeof leaderboard.canSyncLeaderboardProfile === "function" ? leaderboard.canSyncLeaderboardProfile : () => false;
    const shouldSyncCurrentLeaderboardSnapshot = typeof leaderboard.shouldSyncCurrentLeaderboardSnapshot === "function" ? leaderboard.shouldSyncCurrentLeaderboardSnapshot : () => false;
    const isLeaderboardEndpointNotConfigured = typeof leaderboard.isLeaderboardEndpointNotConfigured === "function" ? leaderboard.isLeaderboardEndpointNotConfigured : () => false;
    const syncCurrentLeaderboardSnapshot = typeof leaderboard.syncCurrentLeaderboardSnapshot === "function" ? leaderboard.syncCurrentLeaderboardSnapshot : () => Promise.resolve(false);
    const refreshRemoteLeaderboard = typeof leaderboard.refreshRemoteLeaderboard === "function" ? leaderboard.refreshRemoteLeaderboard : () => Promise.resolve(false);
    const refreshRemotePlayerStats = typeof leaderboard.refreshRemotePlayerStats === "function" ? leaderboard.refreshRemotePlayerStats : () => Promise.resolve(false);
    const refreshRemoteGraphHands = typeof leaderboard.refreshRemoteGraphHands === "function" ? leaderboard.refreshRemoteGraphHands : () => Promise.resolve(false);
    const deleteCurrentLeaderboardEntry = typeof leaderboard.deleteCurrentLeaderboardEntry === "function" ? leaderboard.deleteCurrentLeaderboardEntry : () => Promise.resolve(false);

    // Cross-session all-time totals -> simulator-session-totals.js. Composed after
    // leaderboard (whose helpers it reads) and BEFORE archive (so archive captures
    // ctx.aggregateArchiveTotals); it reads loadSessionArchive lazily from ctx.
    const totalsKit = options.totalsKit || root.PokerSimulatorSessionTotals || {};
    const totals = typeof totalsKit.model === "function" ? totalsKit.model(ctx) : {};
    Object.assign(ctx, totals);
    const aggregateArchiveTotals = typeof totals.aggregateArchiveTotals === "function" ? totals.aggregateArchiveTotals : () => ({});
    const allTimeExtraSessionTotals = typeof totals.allTimeExtraSessionTotals === "function" ? totals.allTimeExtraSessionTotals : () => null;

    // Session archive (local snapshots + backend sync) -> simulator-session-archive.js.
    // archiveRevision is bumped there (via ctx.bumpArchiveRevision) and read by the
    // all-time totals below; loadSessionArchive/etc. are bound as locals so the
    // leaderboard/metrics code that calls them stays unchanged.
    const archiveKit = options.archiveKit || root.PokerSimulatorSessionArchive || {};
    const archive = typeof archiveKit.model === "function" ? archiveKit.model(ctx) : {};
    Object.assign(ctx, archive);
    const sanitizeArchiveBackendState = typeof archive.sanitizeArchiveBackendState === "function" ? archive.sanitizeArchiveBackendState : (backend) => (backend && typeof backend === "object" ? { status: "local", ...backend } : { status: "local" });
    const normalizeSessionArchiveRecord = typeof archive.normalizeSessionArchiveRecord === "function" ? archive.normalizeSessionArchiveRecord : () => null;
    const loadSessionArchive = typeof archive.loadSessionArchive === "function" ? archive.loadSessionArchive : () => [];
    const saveSessionArchive = typeof archive.saveSessionArchive === "function" ? archive.saveSessionArchive : () => [];
    const hasArchivableSession = typeof archive.hasArchivableSession === "function" ? archive.hasArchivableSession : () => false;
    const buildArchivedSession = typeof archive.buildArchivedSession === "function" ? archive.buildArchivedSession : () => null;
    const archiveCurrentSession = typeof archive.archiveCurrentSession === "function" ? archive.archiveCurrentSession : () => null;
    const archiveExportPayload = typeof archive.archiveExportPayload === "function" ? archive.archiveExportPayload : () => null;
    const syncSessionArchiveToBackend = typeof archive.syncSessionArchiveToBackend === "function" ? archive.syncSessionArchiveToBackend : () => Promise.resolve(false);
    const saveArchiveSyncStatus = typeof archive.saveArchiveSyncStatus === "function" ? archive.saveArchiveSyncStatus : () => {};
    const syncPendingSessionArchives = typeof archive.syncPendingSessionArchives === "function" ? archive.syncPendingSessionArchives : () => {};

    // Session + hand-log persistence (localStorage retries + table-restore
    // sanitizers) -> simulator-session-persistence.js. A leaf concern; its public
    // surface is bound as locals so the return shape stays unchanged.
    const persistenceKit = options.persistenceKit || root.PokerSimulatorSessionPersistence || {};
    const persistence = typeof persistenceKit.model === "function" ? persistenceKit.model(ctx) : {};
    Object.assign(ctx, persistence);
    const loadSessionData = typeof persistence.loadSessionData === "function" ? persistence.loadSessionData : () => ({ sessionId, handSeq: 0, history: [], decisions: [], foldAnyEvents: [], botLab: null, compareSession: null, tableSnapshots: [], restoreInterruptedHands: [] });
    const saveSessionData = typeof persistence.saveSessionData === "function" ? persistence.saveSessionData : () => false;
    const loadHandLogData = typeof persistence.loadHandLogData === "function" ? persistence.loadHandLogData : () => [];
    const saveHandLogData = typeof persistence.saveHandLogData === "function" ? persistence.saveHandLogData : () => false;
    const parseHandLogJsonl = typeof persistence.parseHandLogJsonl === "function" ? persistence.parseHandLogJsonl : () => [];
    const handLogJsonl = typeof persistence.handLogJsonl === "function" ? persistence.handLogJsonl : () => "";

    return {
      loadSessionData,
      saveSessionData,
      acquireSessionLock,
      requestSessionTakeover,
      releaseSessionLock,
      sessionLockState,
      loadHandLogData,
      saveHandLogData,
      handleForeignSessionStorageWrite,
      parseHandLogJsonl,
      handLogJsonl,
      compactSessionMetrics,
      sanitizeProfileSnapshot,
      isPublicLeaderboardProfile,
      normalizeLeaderboardEntry,
      leaderboardPlayerKey,
      aggregateLeaderboardEntriesByPlayer,
      sortLeaderboardEntries,
      leaderboardRatingFromMetrics,
      sanitizeArchiveBackendState,
      normalizeSessionArchiveRecord,
      loadSessionArchive,
      saveSessionArchive,
      hasArchivableSession,
      buildArchivedSession,
      archiveCurrentSession,
      archiveExportPayload,
      aggregateArchiveTotals,
      loadLeaderboardData,
      saveLeaderboardData,
      loadLeaderboardDeleteTokens,
      saveLeaderboardDeleteTokens,
      leaderboardDeleteTokenForEntry,
      mergeLeaderboardEntries,
      leaderboardEntryFromArchive,
      currentLeaderboardEntry,
      migrateCurrentGuestLeaderboardToProfile,
      refreshCurrentLeaderboardEntry,
      remoteLeaderboardUsable,
      remoteCoversCurrentEntry,
      sanitizeLeaderboardFilters,
      leaderboardEntries,
      allTimeExtraSessionTotals,
      currentLeaderboardPlayerEntry,
      leaderboardRankFor,
      simulatorArchiveEndpoint,
      simulatorLeaderboardEndpoint,
      simulatorPlayerStatsEndpoint,
      canSyncLeaderboardProfile,
      shouldSyncCurrentLeaderboardSnapshot,
      isLeaderboardEndpointNotConfigured,
      syncCurrentLeaderboardSnapshot,
      refreshRemoteLeaderboard,
      refreshRemotePlayerStats,
      refreshRemoteGraphHands,
      syncSessionArchiveToBackend,
      deleteCurrentLeaderboardEntry,
      saveArchiveSyncStatus,
      syncPendingSessionArchives
    };
  }

  root.PokerSimulatorSessionStore = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
