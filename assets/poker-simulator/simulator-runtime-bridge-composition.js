(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  const RUNTIME_HANDLE_GETTERS = {
    getTableLifecycle: "tableLifecycle",
    getSimulationControls: "simulationControls",
    getShellControls: "shellControls",
    getSimulationRuntime: "simulationRuntime",
    getRenderRuntime: "renderRuntime",
    getFoldAnyModel: "foldAnyModel",
    getTelemetryModel: "telemetryModel",
    getReplayController: "replayController",
    getBotLabRuntime: "botLabRuntime",
    getAnalyticsDialogs: "analyticsDialogs",
    getAnalyticsUi: "analyticsUi",
    getOpponentNotesUi: "opponentNotesUi",
    getHeroActionRuntime: "heroActionRuntime",
    getBotResponseRuntime: "botResponseRuntime",
    getHotkeysRuntime: "hotkeysRuntime",
    getSessionExport: "sessionExport",
    getSessionRuntime: "sessionRuntime",
    getHeroTurnAnnouncements: "heroTurnAnnouncements",
    getAudio: "audio"
  };

  function requireRuntimeRegistry(runtimeRegistry) {
    if (!runtimeRegistry || typeof runtimeRegistry.getter !== "function" || typeof runtimeRegistry.requireKnownKeys !== "function") {
      throw new Error("PokerSimulatorRuntimeRegistry is required before runtime bridge composition");
    }
    runtimeRegistry.requireKnownKeys(Object.values(RUNTIME_HANDLE_GETTERS), "runtime bridge composition");
    return runtimeRegistry;
  }

  function model(options = {}) {
    const runtimeBridgeKit = options.runtimeBridgeKit || root.PokerSimulatorRuntimeBridge;
    if (!runtimeBridgeKit || typeof runtimeBridgeKit.model !== "function") {
      throw new Error("PokerSimulatorRuntimeBridge is not loaded before runtime bridge composition");
    }

    const runtimeRegistry = requireRuntimeRegistry(options.runtimeRegistry);
    const domPatch = options.domPatch || {};
    const bridgeOptions = {
      engine: options.engine || {},
      opponentsKit: options.opponentsKit || {},
      botLabKit: options.botLabKit || {},
      saveOpponentModel: typeof options.saveOpponentModel === "function" ? options.saveOpponentModel : noop,
      setHtmlIfChanged: typeof options.setHtmlIfChanged === "function"
        ? options.setHtmlIfChanged
        : typeof domPatch.setHtmlIfChanged === "function"
          ? domPatch.setHtmlIfChanged
          : noop,
      escapeHtml: typeof options.escapeHtml === "function" ? options.escapeHtml : (value) => String(value ?? ""),
      getState: typeof options.getState === "function" ? options.getState : () => ({}),
      getBotLabOutput: typeof options.getBotLabOutput === "function" ? options.getBotLabOutput : () => null
    };

    Object.keys(RUNTIME_HANDLE_GETTERS).forEach((getterName) => {
      bridgeOptions[getterName] = runtimeRegistry.getter(RUNTIME_HANDLE_GETTERS[getterName]);
    });

    return runtimeBridgeKit.model(bridgeOptions);
  }

  root.PokerSimulatorRuntimeBridgeComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorRuntimeBridgeComposition;
})();
