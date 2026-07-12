(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const settingsModel = options.settingsModel || {};
    const opponentsKit = options.opponentsKit || {};
    const leaderboardKit = options.leaderboardKit || {};
    const sessionStore = options.sessionStore || {};
    const getSessionExport = typeof options.getSessionExport === "function"
      ? options.getSessionExport
      : () => options.sessionExport || {};
    const storage = options.storage || null;
    const keys = options.keys || {};
    const windowRef = options.windowRef || root;
    const getState = typeof options.getState === "function" ? options.getState : () => null;
    const signedBb = typeof options.signedBb === "function" ? options.signedBb : (value) => `${value} BB`;
    const warn = typeof options.warn === "function" ? options.warn : () => {};

    function currentState() {
      return getState() || {};
    }

    function currentSessionExport() {
      return getSessionExport() || {};
    }

    function loadSettings() {
      return typeof settingsModel.loadSettings === "function" ? settingsModel.loadSettings() : {};
    }

    function saveSettings() {
      return typeof settingsModel.saveSettings === "function" ? settingsModel.saveSettings(currentState().settings) : false;
    }

    function loadOpponentNotes() {
      return typeof opponentsKit.loadOpponentNotes === "function" ? opponentsKit.loadOpponentNotes(storage, keys.opponentNotes) : {};
    }

    function saveOpponentNotes() {
      if (typeof opponentsKit.saveOpponentNotes !== "function") return;
      opponentsKit.saveOpponentNotes(storage, keys.opponentNotes, currentState().opponentNotes, {
        onError: (error) => warn("Opponent notes were not persisted.", error)
      });
    }

    function loadOpponentModel() {
      return typeof opponentsKit.loadOpponentModel === "function" ? opponentsKit.loadOpponentModel(storage, keys.opponentModel) : {};
    }

    function saveOpponentModel() {
      if (typeof opponentsKit.saveOpponentModel !== "function") return;
      opponentsKit.saveOpponentModel(storage, keys.opponentModel, currentState().opponentModel, {
        onError: (error) => warn("Opponent model was not persisted.", error)
      });
    }

    function loadSessionData() {
      return typeof sessionStore.loadSessionData === "function" ? sessionStore.loadSessionData() : {};
    }

    function saveSessionData() {
      const state = currentState();
      if (state.suppressSessionPersistenceForSmoke) return true;
      return typeof sessionStore.saveSessionData === "function" ? sessionStore.saveSessionData() : false;
    }

    function acquireSessionLock(options = {}) {
      return typeof sessionStore.acquireSessionLock === "function" ? sessionStore.acquireSessionLock(options) : Promise.resolve(true);
    }

    function requestSessionTakeover() {
      return typeof sessionStore.requestSessionTakeover === "function" ? sessionStore.requestSessionTakeover() : Promise.resolve(true);
    }

    function releaseSessionLock() {
      return typeof sessionStore.releaseSessionLock === "function" ? sessionStore.releaseSessionLock() : undefined;
    }

    function sessionLockState() {
      return typeof sessionStore.sessionLockState === "function" ? sessionStore.sessionLockState() : { owner: true, readOnly: false, supported: false };
    }

    function loadHandLogData() {
      return typeof sessionStore.loadHandLogData === "function" ? sessionStore.loadHandLogData() : [];
    }

    function saveHandLogData() {
      return typeof sessionStore.saveHandLogData === "function" ? sessionStore.saveHandLogData() : false;
    }

    function handleForeignSessionStorageWrite(event) {
      return typeof sessionStore.handleForeignSessionStorageWrite === "function"
        ? sessionStore.handleForeignSessionStorageWrite(event)
        : false;
    }

    function parseHandLogJsonl(text) {
      return typeof sessionStore.parseHandLogJsonl === "function" ? sessionStore.parseHandLogJsonl(text) : [];
    }

    function handLogJsonl(entries = currentState().handLog) {
      return typeof sessionStore.handLogJsonl === "function" ? sessionStore.handLogJsonl(entries) : "";
    }

    function loadSessionArchive() {
      return typeof sessionStore.loadSessionArchive === "function" ? sessionStore.loadSessionArchive() : [];
    }

    function saveSessionArchive(records) {
      return typeof sessionStore.saveSessionArchive === "function" ? sessionStore.saveSessionArchive(records) : false;
    }

    function normalizeSessionArchiveRecord(record) {
      return typeof sessionStore.normalizeSessionArchiveRecord === "function" ? sessionStore.normalizeSessionArchiveRecord(record) : null;
    }

    function sanitizeArchiveBackendState(backend) {
      return typeof sessionStore.sanitizeArchiveBackendState === "function" ? sessionStore.sanitizeArchiveBackendState(backend) : { status: "local" };
    }

    function activeSimulatorProfile() {
      let profile = null;
      try {
        profile = windowRef.FFPlayerProgress?.getActiveProfile?.() || null;
      } catch {
        profile = null;
      }
      return sanitizeProfileSnapshot(profile);
    }

    function sanitizeProfileSnapshot(profile) {
      return typeof sessionStore.sanitizeProfileSnapshot === "function" ? sessionStore.sanitizeProfileSnapshot(profile) : {};
    }

    function compactSessionMetrics(metrics) {
      return typeof sessionStore.compactSessionMetrics === "function" ? sessionStore.compactSessionMetrics(metrics) : {};
    }

    function hasArchivableSession(payload) {
      return typeof sessionStore.hasArchivableSession === "function" ? sessionStore.hasArchivableSession(payload) : false;
    }

    function buildArchivedSession(reason = "manual") {
      return typeof sessionStore.buildArchivedSession === "function" ? sessionStore.buildArchivedSession(reason) : null;
    }

    function archiveCurrentSession(reason = "manual-reset") {
      if (typeof sessionStore.archiveCurrentSession !== "function") return null;
      const state = currentState();
      const result = sessionStore.archiveCurrentSession(reason);
      if (!result) return null;
      const metrics = result.savedRecord.metrics || result.archive.metrics;
      state.importStatus = `Предыдущая сессия сохранена: ${metrics.hands} рук · ${signedBb(metrics.netBb)} · архивов ${result.saved.length}.`;
      if (result.leaderboardEntry) mergeLeaderboardEntries([result.leaderboardEntry]);
      syncSessionArchiveToBackend(result.savedRecord);
      return result.savedRecord;
    }

    function archiveExportPayload() {
      return typeof sessionStore.archiveExportPayload === "function" ? sessionStore.archiveExportPayload() : null;
    }

    function aggregateArchiveTotals(records) {
      return typeof sessionStore.aggregateArchiveTotals === "function" ? sessionStore.aggregateArchiveTotals(records) : {};
    }

    function loadLeaderboardData() {
      return typeof sessionStore.loadLeaderboardData === "function" ? sessionStore.loadLeaderboardData() : [];
    }

    function saveLeaderboardData() {
      return typeof sessionStore.saveLeaderboardData === "function" ? sessionStore.saveLeaderboardData() : false;
    }

    function loadLeaderboardDeleteTokens() {
      return typeof sessionStore.loadLeaderboardDeleteTokens === "function" ? sessionStore.loadLeaderboardDeleteTokens() : {};
    }

    function saveLeaderboardDeleteTokens(tokens) {
      return typeof sessionStore.saveLeaderboardDeleteTokens === "function" ? sessionStore.saveLeaderboardDeleteTokens(tokens) : {};
    }

    function leaderboardDeleteTokenForEntry(entry = currentLeaderboardEntry()) {
      return typeof sessionStore.leaderboardDeleteTokenForEntry === "function" ? sessionStore.leaderboardDeleteTokenForEntry(entry) : "";
    }

    function leaderboardRatingFromMetrics(metrics = {}) {
      return typeof sessionStore.leaderboardRatingFromMetrics === "function" ? sessionStore.leaderboardRatingFromMetrics(metrics) : {};
    }

    function normalizeLeaderboardEntry(entry) {
      return typeof sessionStore.normalizeLeaderboardEntry === "function" ? sessionStore.normalizeLeaderboardEntry(entry) : null;
    }

    function normalizeLeaderboardPlayerName(value) {
      return typeof leaderboardKit.normalizeLeaderboardPlayerName === "function" ? leaderboardKit.normalizeLeaderboardPlayerName(value) : String(value || "");
    }

    function isPublicLeaderboardProfile(profile) {
      return typeof sessionStore.isPublicLeaderboardProfile === "function" ? sessionStore.isPublicLeaderboardProfile(profile) : false;
    }

    function leaderboardPlayerKey(entry) {
      return typeof sessionStore.leaderboardPlayerKey === "function" ? sessionStore.leaderboardPlayerKey(entry) : "";
    }

    function aggregateLeaderboardMetrics(entries) {
      return typeof leaderboardKit.aggregateLeaderboardMetrics === "function" ? leaderboardKit.aggregateLeaderboardMetrics(entries) : {};
    }

    function aggregateLeaderboardEntriesByPlayer(entries) {
      return typeof sessionStore.aggregateLeaderboardEntriesByPlayer === "function" ? sessionStore.aggregateLeaderboardEntriesByPlayer(entries) : [];
    }

    function sortLeaderboardEntries(entries) {
      return typeof sessionStore.sortLeaderboardEntries === "function" ? sessionStore.sortLeaderboardEntries(entries) : [];
    }

    function mergeLeaderboardEntries(entries) {
      return typeof sessionStore.mergeLeaderboardEntries === "function" ? sessionStore.mergeLeaderboardEntries(entries) : [];
    }

    function leaderboardEntryFromArchive(record) {
      return typeof sessionStore.leaderboardEntryFromArchive === "function" ? sessionStore.leaderboardEntryFromArchive(record) : null;
    }

    function currentLeaderboardEntry() {
      return typeof sessionStore.currentLeaderboardEntry === "function" ? sessionStore.currentLeaderboardEntry() : null;
    }

    function migrateCurrentGuestLeaderboardToProfile(profile = activeSimulatorProfile()) {
      return typeof sessionStore.migrateCurrentGuestLeaderboardToProfile === "function" ? sessionStore.migrateCurrentGuestLeaderboardToProfile(profile) : null;
    }

    function refreshCurrentLeaderboardEntry() {
      return typeof sessionStore.refreshCurrentLeaderboardEntry === "function"
        ? sessionStore.refreshCurrentLeaderboardEntry({ syncCurrentLeaderboardSnapshot })
        : null;
    }

    function remoteLeaderboardUsable() {
      return typeof sessionStore.remoteLeaderboardUsable === "function" ? sessionStore.remoteLeaderboardUsable() : false;
    }

    function remoteCoversCurrentEntry(current) {
      return typeof sessionStore.remoteCoversCurrentEntry === "function" ? sessionStore.remoteCoversCurrentEntry(current) : false;
    }

    function leaderboardEntries(filters) {
      return typeof sessionStore.leaderboardEntries === "function" ? sessionStore.leaderboardEntries(filters) : [];
    }

    function allTimeExtraSessionTotals() {
      return typeof sessionStore.allTimeExtraSessionTotals === "function" ? sessionStore.allTimeExtraSessionTotals() : null;
    }

    function sanitizeLeaderboardFilters(filters) {
      return typeof sessionStore.sanitizeLeaderboardFilters === "function"
        ? sessionStore.sanitizeLeaderboardFilters(filters)
        : { period: "season", players: "all", difficulty: "all", query: "", sort: "score" };
    }

    function currentLeaderboardPlayerEntry(entries = leaderboardEntries()) {
      return typeof sessionStore.currentLeaderboardPlayerEntry === "function" ? sessionStore.currentLeaderboardPlayerEntry(entries) : null;
    }

    function leaderboardRankFor(entry, entries = leaderboardEntries()) {
      return typeof sessionStore.leaderboardRankFor === "function" ? sessionStore.leaderboardRankFor(entry, entries) : null;
    }

    function exportSessionArchive() {
      const sessionExport = currentSessionExport();
      return typeof sessionExport.exportSessionArchive === "function" ? sessionExport.exportSessionArchive() : null;
    }

    function downloadJson(filename, payload) {
      const sessionExport = currentSessionExport();
      return typeof sessionExport.downloadJson === "function" ? sessionExport.downloadJson(filename, payload) : null;
    }

    function simulatorArchiveEndpoint() {
      return typeof sessionStore.simulatorArchiveEndpoint === "function" ? sessionStore.simulatorArchiveEndpoint() : "";
    }

    function simulatorLeaderboardEndpoint() {
      return typeof sessionStore.simulatorLeaderboardEndpoint === "function" ? sessionStore.simulatorLeaderboardEndpoint() : "";
    }

    function canSyncLeaderboardProfile(profile = activeSimulatorProfile()) {
      return typeof sessionStore.canSyncLeaderboardProfile === "function" ? sessionStore.canSyncLeaderboardProfile(profile) : false;
    }

    function shouldSyncCurrentLeaderboardSnapshot(entry, options = {}) {
      return typeof sessionStore.shouldSyncCurrentLeaderboardSnapshot === "function" ? sessionStore.shouldSyncCurrentLeaderboardSnapshot(entry, options) : false;
    }

    function isLeaderboardEndpointNotConfigured(response, result) {
      return typeof sessionStore.isLeaderboardEndpointNotConfigured === "function"
        ? sessionStore.isLeaderboardEndpointNotConfigured(response, result)
        : false;
    }

    async function syncCurrentLeaderboardSnapshot(options = {}) {
      return typeof sessionStore.syncCurrentLeaderboardSnapshot === "function" ? sessionStore.syncCurrentLeaderboardSnapshot(options) : null;
    }

    async function refreshRemoteLeaderboard(options = {}) {
      return typeof sessionStore.refreshRemoteLeaderboard === "function" ? sessionStore.refreshRemoteLeaderboard(options) : null;
    }

    async function syncSessionArchiveToBackend(record) {
      return typeof sessionStore.syncSessionArchiveToBackend === "function" ? sessionStore.syncSessionArchiveToBackend(record) : null;
    }

    async function deleteCurrentLeaderboardEntry(options = {}) {
      return typeof sessionStore.deleteCurrentLeaderboardEntry === "function" ? sessionStore.deleteCurrentLeaderboardEntry(options) : false;
    }

    function saveArchiveSyncStatus(id, backendPatch) {
      return typeof sessionStore.saveArchiveSyncStatus === "function" ? sessionStore.saveArchiveSyncStatus(id, backendPatch) : false;
    }

    function syncPendingSessionArchives() {
      return typeof sessionStore.syncPendingSessionArchives === "function" ? sessionStore.syncPendingSessionArchives() : null;
    }

    return {
      loadSettings,
      saveSettings,
      loadOpponentNotes,
      saveOpponentNotes,
      loadOpponentModel,
      saveOpponentModel,
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
      loadSessionArchive,
      saveSessionArchive,
      normalizeSessionArchiveRecord,
      sanitizeArchiveBackendState,
      activeSimulatorProfile,
      sanitizeProfileSnapshot,
      compactSessionMetrics,
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
      leaderboardRatingFromMetrics,
      normalizeLeaderboardEntry,
      normalizeLeaderboardPlayerName,
      isPublicLeaderboardProfile,
      leaderboardPlayerKey,
      aggregateLeaderboardMetrics,
      aggregateLeaderboardEntriesByPlayer,
      sortLeaderboardEntries,
      mergeLeaderboardEntries,
      leaderboardEntryFromArchive,
      currentLeaderboardEntry,
      migrateCurrentGuestLeaderboardToProfile,
      refreshCurrentLeaderboardEntry,
      remoteLeaderboardUsable,
      remoteCoversCurrentEntry,
      leaderboardEntries,
      allTimeExtraSessionTotals,
      sanitizeLeaderboardFilters,
      currentLeaderboardPlayerEntry,
      leaderboardRankFor,
      exportSessionArchive,
      downloadJson,
      simulatorArchiveEndpoint,
      simulatorLeaderboardEndpoint,
      canSyncLeaderboardProfile,
      shouldSyncCurrentLeaderboardSnapshot,
      isLeaderboardEndpointNotConfigured,
      syncCurrentLeaderboardSnapshot,
      refreshRemoteLeaderboard,
      syncSessionArchiveToBackend,
      deleteCurrentLeaderboardEntry,
      saveArchiveSyncStatus,
      syncPendingSessionArchives
    };
  }

  root.PokerSimulatorSessionBridge = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSessionBridge;
})();
