(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  // Delay before revoking a generated blob object URL after triggering a download.
  const BLOB_URL_REVOKE_DELAY_MS = 1000;

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const documentRef = options.documentRef || windowRef.document || root.document || null;
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const currentSessionPayload = typeof options.currentSessionPayload === "function"
      ? options.currentSessionPayload
      : () => ({});
    const archiveExportPayload = typeof options.archiveExportPayload === "function"
      ? options.archiveExportPayload
      : () => ({});
    const handLogJsonl = typeof options.handLogJsonl === "function" ? options.handLogJsonl : () => "";
    const cachedDecisionStats = typeof options.cachedDecisionStats === "function"
      ? options.cachedDecisionStats
      : () => ({});
    const aggregatePokerStats = typeof options.aggregatePokerStats === "function"
      ? options.aggregatePokerStats
      : () => ({ hands: 0 });
    const currentLeaderboardPlayerEntry = typeof options.currentLeaderboardPlayerEntry === "function"
      ? options.currentLeaderboardPlayerEntry
      : () => null;
    const leaderboardEntries = typeof options.leaderboardEntries === "function" ? options.leaderboardEntries : () => [];
    const replayEntries = typeof options.replayEntries === "function" ? options.replayEntries : () => [];
    const isPaused = typeof options.isPaused === "function" ? options.isPaused : () => false;
    const nowDate = typeof options.nowDate === "function" ? options.nowDate : () => new Date();

    function state() {
      return getState() || {};
    }

    function dateStamp() {
      return nowDate().toISOString().slice(0, 10);
    }

    function downloadText(filename, content, type = "application/octet-stream") {
      const BlobCtor = windowRef.Blob || root.Blob;
      const urlApi = windowRef.URL || root.URL;
      if (!BlobCtor || !urlApi || !documentRef?.createElement || !documentRef?.body) return false;
      const blob = new BlobCtor([content], { type });
      const url = urlApi.createObjectURL(blob);
      const link = documentRef.createElement("a");
      link.href = url;
      link.download = filename;
      documentRef.body.appendChild(link);
      link.click();
      link.remove();
      windowRef.setTimeout?.(() => urlApi.revokeObjectURL(url), BLOB_URL_REVOKE_DELAY_MS);
      return true;
    }

    function downloadJson(filename, payload) {
      return downloadText(filename, JSON.stringify(payload, null, 2), "application/json");
    }

    function exportSessionArchive() {
      return downloadJson(`poker-simulator-session-archive-${dateStamp()}.json`, archiveExportPayload());
    }

    function exportSessionHistory() {
      return downloadJson(`poker-simulator-session-${dateStamp()}.json`, currentSessionPayload());
    }

    function exportHandLogJsonl() {
      const current = state();
      return downloadText(
        `poker-simulator-hands-${dateStamp()}.jsonl`,
        handLogJsonl(Array.isArray(current.handLog) ? current.handLog : []),
        "application/x-ndjson"
      );
    }

    function sessionSnapshot() {
      const current = state();
      const decisions = Array.isArray(current.decisions) ? current.decisions : [];
      const handLog = Array.isArray(current.handLog) ? current.handLog : [];
      const history = Array.isArray(current.history) ? current.history : [];
      const good = decisions.filter((entry) => entry?.feedback?.grade === "good").length;
      const leaks = decisions.filter((entry) => entry?.feedback?.grade === "leak").length;
      const score = decisions.reduce((sum, entry) => sum + Number(entry?.feedback?.score || 0), 0);
      const decisionStats = cachedDecisionStats();
      const pokerStats = aggregatePokerStats(handLog.length ? handLog : history);
      return {
        hands: pokerStats.hands,
        handLogHands: handLog.length,
        decisions: decisions.length,
        good,
        leaks,
        score,
        averageDecisionMs: decisionStats.averageDecisionMs,
        timedDecisionCount: decisionStats.timedDecisionCount,
        pokerStats,
        leaderboard: {
          current: currentLeaderboardPlayerEntry(),
          entries: leaderboardEntries().slice(0, 12)
        },
        activeTableId: current.activeTableId,
        started: Boolean(current.started),
        latestDecision: decisions[0] || null,
        latestHand: replayEntries()[0] || null,
        botLab: current.botLab,
        compareSession: current.compareSession,
        restorePendingTables: Array.isArray(current.restoreTableSnapshots) ? current.restoreTableSnapshots.length : 0,
        restoreInterruptedHands: Array.isArray(current.restoreInterruptedHands) ? current.restoreInterruptedHands.slice(0, 20) : [],
        paused: isPaused()
      };
    }

    return {
      downloadText,
      downloadJson,
      exportSessionArchive,
      exportSessionHistory,
      exportHandLogJsonl,
      sessionSnapshot
    };
  }

  root.PokerSimulatorSessionExport = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
