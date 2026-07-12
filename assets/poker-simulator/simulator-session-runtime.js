(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const storageBackend = options.storageBackend || null;
    const keys = options.keys || {};
    const sessionLockState = typeof options.sessionLockState === "function"
      ? options.sessionLockState
      : () => ({ readOnly: false, message: "" });

    function state() {
      return getState() || {};
    }

    function resetLeaderboardSync(current) {
      current.leaderboardSync = {
        ...current.leaderboardSync,
        status: "idle",
        message: "",
        syncedAt: "",
        attemptedAt: "",
        lastHands: 0,
        lastAttemptAt: 0,
        lastEntryId: "",
        lastEntryUpdatedAt: ""
      };
    }

    function resetSessionCaches(current) {
      current.sessionStatsCache = {
        handKey: "",
        pokerStats: null,
        displayHandKey: "",
        displayPokerStats: null,
        decisionKey: "",
        decisionStats: null
      };
    }

    function resetCurrentSession() {
      const current = state();
      if (options.isPaused()) options.setPaused(false);
      resetLeaderboardSync(current);
      const archived = options.archiveCurrentSession("manual-reset");
      if (!archived) current.importStatus = "Сессия была пустой: сброшено без архивной записи.";
      options.clearAllActionClocks();
      options.clearAllBotResponseTimers();
      storageBackend?.removeItem?.(keys.session);
      storageBackend?.removeItem?.(keys.handLog);
      current.sessionId = options.createSessionId();
      current.history = [];
      current.handLog = [];
      current.restoreTableSnapshots = [];
      current.restoreInterruptedHands = [];
      current.decisions = [];
      current.foldAnyEvents = [];
      current.botLab = null;
      current.compareSession = null;
      current.handSeq = 0;
      resetSessionCaches(current);
      options.resetTempoCounter();
      options.stopReplayAutoplay(false);
      options.saveSessionData();
      options.saveHandLogData();
      options.syncTableCount(current.settings?.tableCount, false);
      return true;
    }

    async function importSessionHistoryFile(file) {
      if (!file) return;
      const current = state();
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const imported = options.normalizeSessionPayload(payload, { allowEmpty: false });
        if (!imported) throw new Error("Файл не похож на экспорт симулятора.");
        imported.label = file.name.replace(/\.json$/i, "") || imported.label;
        current.compareSession = imported;
        const metrics = options.sessionMetrics(imported);
        current.importStatus = `Загружено сравнение: ${imported.label} · ${metrics.hands} рук · ${metrics.decisions} решений.`;
        options.saveSessionData();
        options.render("import-session");
        // The import itself already succeeded and importStatus is committed.
        // Isolate the optional analytics re-render so a render failure can't
        // roll the success status back into "Импорт не удался".
        try {
          if (options.analyticsDialog?.open && options.analyticsBody) {
            options.analyticsBody.innerHTML = options.renderAnalytics();
          }
        } catch (renderError) {
          console.warn("import-session: analytics re-render failed", renderError);
        }
      } catch (error) {
        current.importStatus = `Импорт не удался: ${error.message || "проверь JSON"}.`;
        options.renderImportStatus();
      } finally {
        if (options.importHistoryInput) options.importHistoryInput.value = "";
      }
    }

    return {
      resetCurrentSession,
      importSessionHistoryFile
    };
  }

  root.PokerSimulatorSessionRuntime = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSessionRuntime;
})();
