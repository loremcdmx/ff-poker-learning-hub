(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const embedKit = options.embedKit || windowRef.PokerSimulatorEmbedApi;
    const smokeScenariosKit = options.smokeScenariosKit || windowRef.PokerSimulatorSmokeScenarios;
    const embeddedMode = Boolean(options.embeddedMode);
    const getState = typeof options.getState === "function" ? options.getState : () => ({ settings: {}, tables: [], handLog: [] });
    const sessionSnapshot = typeof options.sessionSnapshot === "function" ? options.sessionSnapshot : () => ({});
    const flushRender = typeof options.flushRender === "function" ? options.flushRender : noop;
    const replayEntries = typeof options.replayEntries === "function" ? options.replayEntries : () => [];
    const showReplay = typeof options.showReplay === "function" ? options.showReplay : () => {};
    const handLogJsonl = typeof options.handLogJsonl === "function" ? options.handLogJsonl : () => "";
    const leaderboardEntries = typeof options.leaderboardEntries === "function" ? options.leaderboardEntries : () => [];
    const currentLeaderboardPlayerEntry = typeof options.currentLeaderboardPlayerEntry === "function" ? options.currentLeaderboardPlayerEntry : () => null;

    function state() {
      return getState() || {};
    }

    function setTableCountForSmoke(count, keepExisting = true) {
      options.syncTableCount?.(count, keepExisting);
      flushRender("api-table-count");
      return sessionSnapshot();
    }

    function latestHistoryEntry() {
      return replayEntries().find((entry) => entry?.handHistory) || null;
    }

    function latestHandHistory() {
      return latestHistoryEntry()?.handHistory || null;
    }

    function openLatestReplay() {
      const entry = latestHistoryEntry();
      if (!entry) return false;
      showReplay(entry);
      return Boolean(options.replayDialog?.open);
    }

    const embedApi = embedKit?.model?.({
      windowRef,
      embeddedMode,
      commands: {
        snapshot: () => sessionSnapshot(),
        settings: () => ({ ...state().settings, embedded: embeddedMode }),
        exportSession: () => options.currentSessionPayload?.(),
        exportSessionArchive: () => options.archiveExportPayload?.(),
        handLogJsonl: () => handLogJsonl(state().handLog),
        leaderboard: () => ({ current: currentLeaderboardPlayerEntry(), entries: leaderboardEntries() }),
        latestHandHistory: () => latestHandHistory(),
        openReplay: () => ({ opened: openLatestReplay() }),
        setTableCount: (payload = {}) => setTableCountForSmoke(payload?.count, payload?.keepExisting !== false),
        newHand: () => {
          options.dealNextAllTables?.();
          flushRender("embed-new-hand");
          return sessionSnapshot();
        },
        restartTournament: (payload = {}) => {
          options.restartTournament?.(payload?.tableId || state().activeTableId);
          flushRender("embed-restart-tournament");
          return sessionSnapshot();
        },
        hotkey: (payload = {}) => {
          const action = options.triggerHotkey?.(payload?.key || "");
          flushRender("embed-hotkey");
          return { action, snapshot: sessionSnapshot() };
        }
      }
    }) || null;

    const publicApi = {
      triggerHotkey: options.triggerHotkey,
      sessionSnapshot,
      runBotLabSample: options.runBotLabSample,
      currentSessionPayload: options.currentSessionPayload,
      archiveExportPayload: options.archiveExportPayload,
      exportSessionArchive: options.exportSessionArchive,
      resetCurrentSession: options.resetCurrentSession,
      syncPendingSessionArchives: options.syncPendingSessionArchives,
      handLogJsonl,
      aggregatePokerStats: options.aggregatePokerStats,
      leaderboardRatingFromMetrics: options.leaderboardRatingFromMetrics,
      leaderboardEntries,
      currentLeaderboardEntry: options.currentLeaderboardEntry,
      currentLeaderboardPlayerEntry,
      pause: () => {
        options.setPaused?.(true);
        flushRender("api-pause");
        return sessionSnapshot();
      },
      resume: () => {
        options.setPaused?.(false);
        flushRender("api-resume");
        return sessionSnapshot();
      },
      togglePause: () => {
        options.togglePause?.();
        flushRender("api-toggle-pause");
        return sessionSnapshot();
      },
      setTableCount: setTableCountForSmoke,
      newHand: () => {
        options.dealNextAllTables?.();
        flushRender("api-new-hand");
        return sessionSnapshot();
      },
      restartTournament: (tableId = state().activeTableId) => {
        options.restartTournament?.(tableId);
        flushRender("api-restart-tournament");
        return sessionSnapshot();
      },
      latestHandHistory,
      openReplay: openLatestReplay,
      embedded: embeddedMode
    };

    if (options.isLayoutSmokeLocalhost) {
      smokeScenariosKit?.attachLayoutSmokeHooks?.(publicApi, {
        state,
        sessionSnapshot,
        flushRender,
        setPaused: options.setPaused || noop,
        clearAllActionRevealTimers: options.clearAllActionRevealTimers || noop,
        clearAllVisualTimers: options.clearAllVisualTimers || noop,
        clearAllAutoDealQueues: options.clearAllAutoDealQueues || noop,
        clearAllActionClocks: options.clearAllActionClocks || noop,
        clearAllBotResponseTimers: options.clearAllBotResponseTimers || noop,
        sanitizeTableCount: options.sanitizeTableCount,
        createTable: options.createTable,
        visibleSeatBetAmount: options.visibleSeatBetAmount,
        formatAmount: options.formatAmount,
        applyOpponentLearningToTable: options.applyOpponentLearningToTable,
        engine: options.engine,
        annotateActionAnimationMotion: options.annotateActionAnimationMotion || noop,
        primeActionReveal: options.primeActionReveal || noop,
        primeShowdownAnimation: options.primeShowdownAnimation || noop,
        markAllTablesDirty: options.markAllTablesDirty || noop
      });
    }

    return {
      embedApi,
      publicApi,
      setTableCountForSmoke,
      latestHandHistory,
      openLatestReplay
    };
  }

  root.PokerSimulatorPublicApi = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorPublicApi;
})();
