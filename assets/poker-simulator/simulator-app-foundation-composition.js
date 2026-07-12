(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function requireModel(kit, name) {
    if (!kit || typeof kit.model !== "function") {
      throw new Error(`${name} is not loaded - check <script> order in poker-simulator.html`);
    }
  }

  function requireFn(owner, key, name) {
    if (!owner || typeof owner[key] !== "function") {
      throw new Error(`${name} is not loaded - check <script> order in poker-simulator.html`);
    }
  }

  const LIVE_TAB_STORAGE_KEY = "ff.poker.table-simulator.live-tab.v1";

  function safeStoragePart(value) {
    return String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96);
  }

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const warn = typeof options.warn === "function" ? options.warn : noop;
    let state = null;
    const getState = () => state;

    requireFn(options.formatKit, "escapeHtml", "PokerSimulatorFormat");
    requireFn(options.formatKit, "cssEscape", "PokerSimulatorFormat");
    requireFn(options.randomKit, "randomChance", "PokerSimulatorRandom");
    requireFn(options.randomKit, "randomToken", "PokerSimulatorRandom");
    requireFn(options.bettingKit, "roundBb", "PokerSimulatorBetting");
    requireFn(options.bettingKit, "clampBetValue", "PokerSimulatorBetting");
    requireModel(options.startKit, "PokerSimulatorStart");
    requireModel(options.settingsKit, "PokerSimulatorSettings");
    requireModel(options.bootKit, "PokerSimulatorBoot");
    requireModel(options.runtimeRegistryKit, "PokerSimulatorRuntimeRegistry");
    requireModel(options.sessionCompositionKit, "PokerSimulatorSessionComposition");
    requireModel(options.perfKit, "PokerSimulatorPerfKit");
    requireFn(options.domKit, "domPatch", "PokerSimulatorDom");

    const escapeHtml = options.formatKit.escapeHtml;
    const cssEscape = (value) => options.formatKit.cssEscape(value, windowRef.CSS);
    const storageKeys = options.stateKit?.storageKeys || {};
    const limits = options.stateKit?.limits || {};
    const defaults = options.stateKit?.defaults || {};
    const browserRandomChance = options.randomKit.randomChance;
    const browserRandomToken = options.randomKit.randomToken;
    const roundBb = options.bettingKit.roundBb;
    const clampBetValue = options.bettingKit.clampBetValue;

    const startModel = options.startKit.model({ engine: options.engine });
    const settingsModel = options.settingsKit.model({
      windowRef,
      documentRef: options.documentRef || windowRef.document,
      engine: options.engine,
      startModel,
      storageKey: storageKeys.settings,
      warn
    });
    const bootParams = settingsModel.bootParams;
    const embeddedMode = settingsModel.embeddedMode;
    const storageBackend = settingsModel.storageBackend;
    const isLayoutSmokeLocalhost = bootParams.has("simulatorLayoutSmoke")
      && /^(127\.0\.0\.1|localhost|\[::1\]|::1)$/.test(String(windowRef.location?.hostname || ""));
    const visualQaPersistenceEnabled = bootParams.get("visualQaPersist") === "1";
    settingsModel.applyEmbeddedModeFlag();

    const bootRuntime = options.bootKit.model({
      windowRef,
      engine: options.engine,
      stateKit: options.stateKit,
      settingsModel,
      getState,
      getPackSelect: typeof options.getPackSelect === "function" ? options.getPackSelect : () => null,
      saveSettings: typeof options.saveSettings === "function" ? options.saveSettings : noop,
      escapeHtml,
      randomToken: browserRandomToken,
      warn
    });
    const bootSessionId = bootRuntime.createSessionId();
    const liveSessionScope = createLiveSessionScope(bootSessionId);
    const runtimeRegistry = options.runtimeRegistryKit.model();
    const sessionComposition = options.sessionCompositionKit.model({
      sessionMetricsKit: options.sessionMetricsKit,
      sessionMetricsBridgeKit: options.sessionMetricsBridgeKit,
      sessionHudBridgeKit: options.sessionHudBridgeKit,
      getState,
      handLogKit: options.handLogKit,
      leaderboardKit: options.leaderboardKit,
      sessionId: bootSessionId,
      limits: {
        sessionHistory: limits.sessionHistory,
        sessionDecision: limits.sessionDecision,
        foldAnyEvent: limits.foldAnyEvent,
        handLog: limits.handLog
      },
      escapeHtml,
      getSessionHudModel: runtimeRegistry.getter("sessionHudModel"),
      // Late-binding: the session store (behind sessionBridge) is composed
      // after the metrics model, so the HUD "Всё время" top-up resolves the
      // bridge through the registry at call time.
      allTimeExtraTotals: () => runtimeRegistry.get("sessionBridge")?.allTimeExtraSessionTotals?.() || null,
      now: () => Date.now()
    });
    const perfModel = options.perfKit.model({
      getState,
      getTableGrid: typeof options.getTableGrid === "function" ? options.getTableGrid : () => null
    });
    const domPatch = options.domKit.domPatch({
      perfModel,
      getCurrentRenderMetrics: () => getState()?.renderScheduler?.currentRenderMetrics
    });
    const formatAmount = runtimeRegistry.call("formatAmount", (value) => String(value ?? 0));

    function navigationType() {
      try {
        const entry = windowRef.performance?.getEntriesByType?.("navigation")?.[0];
        return String(entry?.type || "");
      } catch {
        return "";
      }
    }

    function readStoredLiveTab() {
      try {
        const parsed = JSON.parse(windowRef.sessionStorage?.getItem?.(LIVE_TAB_STORAGE_KEY) || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    }

    function writeStoredLiveTab(tabId) {
      try {
        windowRef.sessionStorage?.setItem?.(LIVE_TAB_STORAGE_KEY, JSON.stringify({
          tabId,
          updatedAt: new Date().toISOString()
        }));
      } catch {
        // Private/blocked sessionStorage: the generated boot id still gives this
        // page instance a non-shared localStorage key for the current run.
      }
    }

    function createLiveSessionScope(seed) {
      const stored = readStoredLiveTab();
      const storedTabId = safeStoragePart(stored.tabId);
      const navType = navigationType();
      const canReuseStoredTab = Boolean(storedTabId && (navType === "reload" || navType === "back_forward"));
      const tabId = canReuseStoredTab ? storedTabId : safeStoragePart(seed || bootRuntime.createSessionId());
      writeStoredLiveTab(tabId);
      return {
        tabId,
        session: `${storageKeys.session}.${tabId}`,
        handLog: `${storageKeys.handLog}.${tabId}`,
        legacySession: storageKeys.session,
        legacyHandLog: storageKeys.handLog
      };
    }

    function createInitialState(loaders = {}) {
      state = options.stateKit.createInitialState({
        settings: loaders.loadSettings?.(),
        savedSession: loaders.loadSessionData?.(),
        handLog: loaders.loadHandLogData?.(),
        leaderboard: loaders.loadLeaderboardData?.(),
        opponentNotes: loaders.loadOpponentNotes?.(),
        opponentModel: loaders.loadOpponentModel?.(),
        perf: perfModel.createPerfCounters(),
        suppressSessionPersistenceForSmoke: isLayoutSmokeLocalhost && !visualQaPersistenceEnabled
      });
      return state;
    }

    return {
      getState,
      createInitialState,
      escapeHtml,
      cssEscape,
      browserRandomChance,
      browserRandomToken,
      roundBb,
      clampBetValue,
      storageKey: storageKeys.settings,
      sessionStorageKey: liveSessionScope.session,
      handLogStorageKey: liveSessionScope.handLog,
      legacySessionStorageKey: liveSessionScope.legacySession,
      legacyHandLogStorageKey: liveSessionScope.legacyHandLog,
      liveSessionTabId: liveSessionScope.tabId,
      sessionArchiveStorageKey: storageKeys.sessionArchive,
      leaderboardStorageKey: storageKeys.leaderboard,
      opponentNotesStorageKey: storageKeys.opponentNotes,
      opponentModelStorageKey: storageKeys.opponentModel,
      sessionHistoryLimit: limits.sessionHistory,
      sessionDecisionLimit: limits.sessionDecision,
      foldAnyEventLimit: limits.foldAnyEvent,
      handLogLimit: limits.handLog,
      sessionArchiveLimit: limits.sessionArchive,
      leaderboardLimit: limits.leaderboard,
      leaderboardSnapshotMinHandsStep: limits.leaderboardSnapshotMinHandsStep,
      leaderboardSnapshotMinIntervalMs: limits.leaderboardSnapshotMinIntervalMs,
      defaultSessionArchiveEndpoint: defaults.sessionArchiveEndpoint,
      defaultHandLogEndpoint: defaults.handLogEndpoint,
      trackedCbetStreets: defaults.trackedCbetStreets,
      trackedPositions: defaults.trackedPositions,
      startModel,
      settingsModel,
      bootRuntime,
      createSessionId: bootRuntime.createSessionId,
      hydratePackOptions: bootRuntime.hydratePackOptions,
      hydrateExternalPacks: bootRuntime.hydrateExternalPacks,
      isSupportedPack: bootRuntime.isSupportedPack,
      applyPlayerPathBootParams: bootRuntime.applyPlayerPathBootParams,
      bootSessionId,
      runtimeRegistry,
      sessionComposition,
      sessionMetricsModel: sessionComposition.sessionMetricsModel,
      normalizeSessionPayload: sessionComposition.normalizeSessionPayload,
      currentSessionPayload: sessionComposition.currentSessionPayload,
      sessionMetrics: sessionComposition.sessionMetrics,
      signed: sessionComposition.signed,
      signedBb: sessionComposition.signedBb,
      cachedPokerStats: sessionComposition.cachedPokerStats,
      sanitizeStatsScope: sessionComposition.sanitizeStatsScope,
      cachedDecisionStats: sessionComposition.cachedDecisionStats,
      formatDecisionDuration: sessionComposition.formatDecisionDuration,
      startTempoCounter: sessionComposition.startTempoCounter,
      resetTempoCounter: sessionComposition.resetTempoCounter,
      renderSessionStats: sessionComposition.renderSessionStats,
      perfModel,
      domPatch,
      formatAmount,
      bootParams,
      embeddedMode,
      storageBackend,
      isLayoutSmokeLocalhost
    };
  }

  root.PokerSimulatorAppFoundationComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppFoundationComposition;
})();
