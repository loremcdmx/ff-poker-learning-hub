(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function assignFn(target, key, candidate) {
    if (typeof target[key] === "function" || typeof candidate !== "function") return;
    target[key] = candidate;
  }

  // Fail-LOUD boundary for REQUIRED loose-bag deps (the batch form of the
  // foundation roadmap's requireFn). assignFn() above is intentionally
  // fail-OPEN; requireFns asserts that the deps this hub forwards UNGUARDED into
  // the public-API runtime / server-mode runtime resolved to functions, so a
  // renamed/unloaded producer surfaces at boot naming THIS hub. Deps that this
  // hub deliberately tolerates as absent keep their typeof-fallbacks below and
  // are NOT asserted. Only meaningful in a real DOM runtime — headless
  // source-contract harnesses load this hub with intentionally-partial mocks.
  const reportedMissingDeps = new Set();

  function requireFns(target, keys, source) {
    if (!root.document) return;
    const missing = (Array.isArray(keys) ? keys : []).filter((key) => typeof target[key] !== "function");
    if (!missing.length) return;
    const signature = `${source}|${missing.join(",")}`;
    if (reportedMissingDeps.has(signature)) return;
    reportedMissingDeps.add(signature);
    const message = `[poker-simulator] ${source}: missing required runtime dependencies: ${missing.join(", ")} — a producer was renamed or failed to load (silent loose-bag wiring).`;
    if (root.console && typeof root.console.error === "function") root.console.error(message);
  }

  function model(options = {}) {
    const runtimeBridge = options.runtimeBridge || {};
    const visualRuntime = options.visualRuntime || {};
    const actionRuntime = options.actionRuntime || {};
    const sessionBridge = options.sessionBridge || {};
    const historyBridge = options.historyBridge || {};
    const sessionComposition = options.sessionComposition || {};
    const renderLoop = options.renderLoop || {};
    const startModel = options.startModel || {};
    const tableLifecycle = options.tableLifecycle || {};

    assignFn(options, "sessionSnapshot", runtimeBridge.sessionSnapshot);
    assignFn(options, "replayEntries", historyBridge.replayEntries);
    assignFn(options, "showReplay", runtimeBridge.showReplay);
    assignFn(options, "triggerHotkey", runtimeBridge.triggerHotkey);
    assignFn(options, "runBotLabSample", runtimeBridge.runBotLabSample);
    assignFn(options, "currentSessionPayload", sessionComposition.currentSessionPayload);
    assignFn(options, "archiveExportPayload", sessionBridge.archiveExportPayload);
    assignFn(options, "exportSessionArchive", sessionBridge.exportSessionArchive);
    assignFn(options, "resetCurrentSession", runtimeBridge.resetCurrentSession);
    assignFn(options, "syncPendingSessionArchives", sessionBridge.syncPendingSessionArchives);
    assignFn(options, "acquireSessionLock", sessionBridge.acquireSessionLock);
    assignFn(options, "releaseSessionLock", sessionBridge.releaseSessionLock);
    assignFn(options, "handLogJsonl", sessionBridge.handLogJsonl);
    assignFn(options, "aggregatePokerStats", historyBridge.aggregatePokerStats);
    assignFn(options, "leaderboardRatingFromMetrics", sessionBridge.leaderboardRatingFromMetrics);
    assignFn(options, "leaderboardEntries", sessionBridge.leaderboardEntries);
    assignFn(options, "currentLeaderboardEntry", sessionBridge.currentLeaderboardEntry);
    assignFn(options, "currentLeaderboardPlayerEntry", sessionBridge.currentLeaderboardPlayerEntry);
    assignFn(options, "setPaused", visualRuntime.setPaused);
    assignFn(options, "togglePause", visualRuntime.togglePause);
    assignFn(options, "syncTableCount", runtimeBridge.syncTableCount);
    assignFn(options, "dealNextAllTables", runtimeBridge.dealNextAllTables);
    assignFn(options, "restartTournament", runtimeBridge.restartTournament);
    assignFn(options, "flushRender", renderLoop.flushRender);
    assignFn(options, "clearAllActionRevealTimers", visualRuntime.clearAllActionRevealTimers);
    assignFn(options, "clearAllVisualTimers", visualRuntime.clearAllVisualTimers);
    assignFn(options, "clearAllAutoDealQueues", actionRuntime.clearAllAutoDealQueues);
    assignFn(options, "clearAllActionClocks", actionRuntime.clearAllActionClocks);
    assignFn(options, "clearAllBotResponseTimers", actionRuntime.clearAllBotResponseTimers);
    assignFn(options, "sanitizeTableCount", startModel.sanitizeTableCount);
    assignFn(options, "createTable", tableLifecycle.createTable || runtimeBridge.createTable);
    assignFn(options, "visibleSeatBetAmount", visualRuntime.visibleSeatBetAmount);
    assignFn(options, "applyOpponentLearningToTable", runtimeBridge.applyOpponentLearningToTable);
    assignFn(options, "annotateActionAnimationMotion", visualRuntime.annotateActionAnimationMotion);
    assignFn(options, "primeActionReveal", visualRuntime.primeActionReveal);
    assignFn(options, "primeShowdownAnimation", visualRuntime.primeShowdownAnimation);
    assignFn(options, "primeDealReveal", visualRuntime.primeDealReveal);
    assignFn(options, "markAllTablesDirty", renderLoop.markAllTablesDirty);
    assignFn(options, "setActiveTable", renderLoop.setActiveTable);
    assignFn(options, "syncSimulationControls", runtimeBridge.syncSimulationControls);
    assignFn(options, "syncAutoDealCountdownTicker", actionRuntime.syncAutoDealCountdownTicker);
    assignFn(options, "syncActionClockTicker", actionRuntime.syncActionClockTicker);
    assignFn(options, "updateAutoDealCountdowns", actionRuntime.updateAutoDealCountdowns);
    assignFn(options, "updateActionClocks", actionRuntime.updateActionClocks);
    assignFn(options, "handlePageHide", visualRuntime.handlePageHide);
    assignFn(options, "handlePageShow", visualRuntime.handlePageShow);
    assignFn(options, "handleForeignSessionStorageWrite", sessionBridge.handleForeignSessionStorageWrite);

    // Forwarded UNGUARDED into the public-API / server-mode runtimes. The deps
    // this hub tolerates as absent (syncTableCount, flushRender, the page/lock
    // lifecycle hooks, …) keep their typeof-fallbacks below and are excluded.
    requireFns(options, [
      "sessionSnapshot", "replayEntries", "showReplay", "triggerHotkey", "runBotLabSample",
      "currentSessionPayload", "archiveExportPayload", "exportSessionArchive", "resetCurrentSession",
      "handLogJsonl", "aggregatePokerStats", "leaderboardRatingFromMetrics", "leaderboardEntries",
      "currentLeaderboardEntry", "currentLeaderboardPlayerEntry", "setPaused", "togglePause",
      "dealNextAllTables", "restartTournament", "clearAllActionRevealTimers", "clearAllVisualTimers",
      "clearAllAutoDealQueues", "clearAllActionClocks", "clearAllBotResponseTimers", "sanitizeTableCount",
      "createTable", "visibleSeatBetAmount", "applyOpponentLearningToTable", "annotateActionAnimationMotion",
      "primeActionReveal", "primeShowdownAnimation", "primeDealReveal", "markAllTablesDirty"
    ], "app-launch");

    const windowRef = options.windowRef || root;
    const publicApiKit = options.publicApiKit || windowRef.PokerSimulatorPublicApi || {};
    const smokeScenariosKit = options.smokeScenariosKit || windowRef.PokerSimulatorSmokeScenarios || {};
    const embeddedMode = Boolean(options.embeddedMode);
    const getState = typeof options.getState === "function" ? options.getState : () => ({ settings: {} });
    const hydrateExternalPacks = typeof options.hydrateExternalPacks === "function" ? options.hydrateExternalPacks : noop;
    const hydratePackOptions = typeof options.hydratePackOptions === "function" ? options.hydratePackOptions : noop;
    const syncTableCount = typeof options.syncTableCount === "function" ? options.syncTableCount : noop;
    const syncPendingSessionArchives = typeof options.syncPendingSessionArchives === "function" ? options.syncPendingSessionArchives : noop;
    const acquireSessionLock = typeof options.acquireSessionLock === "function" ? options.acquireSessionLock : () => Promise.resolve(true);
    const releaseSessionLock = typeof options.releaseSessionLock === "function" ? options.releaseSessionLock : null;
    const flushRender = typeof options.flushRender === "function" ? options.flushRender : noop;
    const syncSimulationControls = typeof options.syncSimulationControls === "function" ? options.syncSimulationControls : noop;
    const syncAutoDealCountdownTicker = typeof options.syncAutoDealCountdownTicker === "function" ? options.syncAutoDealCountdownTicker : noop;
    const syncActionClockTicker = typeof options.syncActionClockTicker === "function" ? options.syncActionClockTicker : noop;
    const updateAutoDealCountdowns = typeof options.updateAutoDealCountdowns === "function" ? options.updateAutoDealCountdowns : noop;
    const updateActionClocks = typeof options.updateActionClocks === "function" ? options.updateActionClocks : noop;
    const handlePageHide = typeof options.handlePageHide === "function" ? options.handlePageHide : null;
    const handlePageShow = typeof options.handlePageShow === "function" ? options.handlePageShow : null;
    const handleForeignSessionStorageWrite = typeof options.handleForeignSessionStorageWrite === "function"
      ? options.handleForeignSessionStorageWrite
      : null;
    let publicApiRuntime = null;
    let embedApi = null;
    let simulatorPublicApi = null;

    function createPublicApiRuntime() {
      publicApiRuntime = publicApiKit.model({
        windowRef,
        embedKit: options.embedKit,
        smokeScenariosKit,
        embeddedMode,
        getState,
        replayDialog: options.replayDialog,
        sessionSnapshot: options.sessionSnapshot,
        replayEntries: options.replayEntries,
        showReplay: options.showReplay,
        triggerHotkey: options.triggerHotkey,
        runBotLabSample: options.runBotLabSample,
        currentSessionPayload: options.currentSessionPayload,
        archiveExportPayload: options.archiveExportPayload,
        exportSessionArchive: options.exportSessionArchive,
        resetCurrentSession: options.resetCurrentSession,
        syncPendingSessionArchives,
        handLogJsonl: options.handLogJsonl,
        aggregatePokerStats: options.aggregatePokerStats,
        leaderboardRatingFromMetrics: options.leaderboardRatingFromMetrics,
        leaderboardEntries: options.leaderboardEntries,
        currentLeaderboardEntry: options.currentLeaderboardEntry,
        currentLeaderboardPlayerEntry: options.currentLeaderboardPlayerEntry,
        setPaused: options.setPaused,
        togglePause: options.togglePause,
        syncTableCount,
        dealNextAllTables: options.dealNextAllTables,
        restartTournament: options.restartTournament,
        flushRender,
        isLayoutSmokeLocalhost: options.isLayoutSmokeLocalhost,
        clearAllActionRevealTimers: options.clearAllActionRevealTimers,
        clearAllVisualTimers: options.clearAllVisualTimers,
        clearAllAutoDealQueues: options.clearAllAutoDealQueues,
        clearAllActionClocks: options.clearAllActionClocks,
        clearAllBotResponseTimers: options.clearAllBotResponseTimers,
        sanitizeTableCount: options.sanitizeTableCount,
        createTable: options.createTable,
        visibleSeatBetAmount: options.visibleSeatBetAmount,
        formatAmount: options.formatAmount,
        applyOpponentLearningToTable: options.applyOpponentLearningToTable,
        engine: options.engine,
        annotateActionAnimationMotion: options.annotateActionAnimationMotion,
        primeActionReveal: options.primeActionReveal,
        primeShowdownAnimation: options.primeShowdownAnimation,
        markAllTablesDirty: options.markAllTablesDirty
      });
      embedApi = publicApiRuntime?.embedApi || null;
      simulatorPublicApi = publicApiRuntime?.publicApi || {};
      return publicApiRuntime;
    }

    async function launch() {
      if (!publicApiRuntime) createPublicApiRuntime();
      const state = getState() || {};
      const perfApi = typeof options.perfApi === "function" ? options.perfApi() : options.perfApi;
      windowRef.PokerSimulatorPerf = perfApi || {};
      await hydrateExternalPacks();
      hydratePackOptions();
      syncTableCount(state.settings?.tableCount, false);
      await acquireSessionLock();
      if (state.settings?.autoStart && !state.started) options.dealNextAllTables?.();
      if (!state.settings?.demoMode) syncPendingSessionArchives();
      flushRender("boot");
      syncSimulationControls();
      syncAutoDealCountdownTicker();
      syncActionClockTicker();
      updateAutoDealCountdowns();
      updateActionClocks("sync");
      // Warm the remote leaderboard cache in the background so the first
      // "Топ" open renders instantly instead of gating the dialog on the
      // network. Best-effort: on failure the dialog keeps its fetch-on-open path.
      const prefetchRemoteLeaderboard = () => {
        if (state.settings?.demoMode) return;
        try {
          Promise.resolve(sessionBridge.refreshRemoteLeaderboard?.({ renderOnStart: false, prefetch: true }))
            .catch(() => {});
        } catch (error) {
          /* prefetch is best-effort */
        }
      };
      if (typeof windowRef.requestIdleCallback === "function") {
        windowRef.requestIdleCallback(prefetchRemoteLeaderboard, { timeout: 5000 });
      } else if (typeof windowRef.setTimeout === "function") {
        windowRef.setTimeout(prefetchRemoteLeaderboard, 1200);
      }
      if (handlePageHide) windowRef.addEventListener("pagehide", handlePageHide);
      // Only release the session Web Lock on a REAL teardown. A bfcache freeze
      // (pagehide event.persisted === true) keeps the page alive — handlePageHide
      // just pauses timers and returns without tearing down — so releasing the
      // lock there split-brained the session (another tab could acquire it while
      // this frozen page still held its in-memory state). On bfcache restore
      // (pageshow event.persisted === true) re-acquire and re-render the lock UI.
      if (releaseSessionLock) {
        windowRef.addEventListener("pagehide", (event) => {
          if (!event || !event.persisted) releaseSessionLock();
        });
      }
      windowRef.addEventListener("pageshow", (event) => {
        if (handlePageShow) handlePageShow(event);
        if (event && event.persisted && typeof acquireSessionLock === "function") {
          Promise.resolve(acquireSessionLock()).then(() => flushRender("bfcache-restore")).catch(() => {});
        }
      });
      if (handleForeignSessionStorageWrite) {
        windowRef.addEventListener("storage", (event) => {
          if (handleForeignSessionStorageWrite(event)) flushRender("foreign-tab-session");
        });
      }
      windowRef.PokerSimulatorApp = simulatorPublicApi;
      if (embeddedMode && typeof embedApi?.handleMessage === "function") {
        windowRef.addEventListener("message", embedApi.handleMessage);
      }
      if (typeof embedApi?.notifyReady === "function") embedApi.notifyReady();
      // Server-driven multiplayer mode: inert unless poker-simulator.html is
      // opened with ?room=ID / ?rooms=ID1,ID2 AND the controller asset is loaded. Hands the
      // controller the primitives it needs to drive state.tables from the
      // authoritative server and reroute hero actions. Best-effort: any failure
      // must never break normal single-player boot.
      try {
        const search = windowRef.location?.search || "";
        const serverModeRuntime = windowRef.PokerSimulatorMultiplayerRuntime;
        if (serverModeRuntime && /[?&]rooms?=/.test(search)) {
          serverModeRuntime.start({
            windowRef,
            getState,
            flushRender,
            markAllTablesDirty: options.markAllTablesDirty,
            setActiveTable: options.setActiveTable,
            clearAllActionClocks: options.clearAllActionClocks,
            clearAllBotResponseTimers: options.clearAllBotResponseTimers,
            clearAllAutoDealQueues: options.clearAllAutoDealQueues,
            showReplay: options.showReplay,
            engine: options.engine,
            // Animation primers (each guarded in the controller) so server-driven
            // updates play the same deal / action / board / showdown animations
            // as local play instead of snapping.
            annotateActionAnimationMotion: options.annotateActionAnimationMotion,
            primeActionReveal: options.primeActionReveal,
            primeShowdownAnimation: options.primeShowdownAnimation,
            primeDealReveal: options.primeDealReveal
          });
        }
      } catch (error) {
        windowRef.console?.warn?.("[mp] server mode failed to start", error?.message || error);
      }
      return { publicApiRuntime, embedApi, simulatorPublicApi };
    }

    return {
      createPublicApiRuntime,
      launch,
      get publicApiRuntime() {
        return publicApiRuntime;
      },
      get embedApi() {
        return embedApi;
      },
      get simulatorPublicApi() {
        return simulatorPublicApi;
      }
    };
  }

  root.PokerSimulatorAppLaunch = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppLaunch;
})();
