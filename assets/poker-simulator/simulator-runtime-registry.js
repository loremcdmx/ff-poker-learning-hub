(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  const DEFAULTS = {
    sessionHudModel: null,
    sessionBridge: null,
    sessionExport: null,
    sessionRuntime: null,
    shellControls: null,
    simulationControls: null,
    simulationRuntime: null,
    renderRuntime: null,
    tableLifecycle: null,
    foldAnyModel: null,
    telemetryModel: null,
    replayController: null,
    botLabRuntime: null,
    botInspector: null,
    analyticsUi: null,
    analyticsDialogs: null,
    opponentNotesUi: null,
    heroActions: null,
    actionControls: null,
    heroActionRuntime: null,
    hotkeysRuntime: null,
    botResponseRuntime: null,
    audio: null,
    heroTurnAnnouncements: null,
    handCompletion: null,
    replayHistory: null,
    trainerFeedbackForTable: () => null,
    betBounds: () => ({ min: 0 }),
    autoDealLabel: () => "",
    formatAmount: (value) => String(value ?? 0),
    renderTable: () => "",
    dealAnimationActive: () => false,
    seatPoint: () => ({ x: 50, y: 50 }),
    seatZone: () => "",
    clearExpiredRenderedAnimations: noop
  };

  function model(overrides = {}) {
    const defaultKeys = new Set(Object.keys(DEFAULTS));
    const registry = { ...DEFAULTS };

    function hasKey(key) {
      return Object.prototype.hasOwnProperty.call(registry, key);
    }

    function unknownKeyMessage(key, context = "runtime registry") {
      return `${context}: unknown runtime handle "${String(key)}"`;
    }

    function requireKnownKey(key, context = "runtime registry") {
      if (!hasKey(key)) throw new Error(unknownKeyMessage(key, context));
      return key;
    }

    Object.keys(overrides || {}).forEach((key) => {
      if (!defaultKeys.has(key)) throw new Error(unknownKeyMessage(key, "runtime registry model"));
      registry[key] = overrides[key];
    });

    function requireKnownKeys(keys = [], context = "runtime registry") {
      const missing = (Array.isArray(keys) ? keys : [])
        .filter((key) => !hasKey(key))
        .map((key) => String(key));
      if (missing.length) {
        throw new Error(`${context}: unknown runtime handle(s): ${missing.join(", ")}`);
      }
      return api;
    }

    function knownKeys() {
      return Object.keys(registry);
    }

    function get(key) {
      requireKnownKey(key, "runtime registry get");
      return registry[key];
    }

    function set(values = {}) {
      Object.keys(values || {}).forEach((key) => {
        requireKnownKey(key, "runtime registry set");
        registry[key] = values[key];
      });
      return api;
    }

    function getter(key) {
      requireKnownKey(key, "runtime registry getter");
      return () => registry[key];
    }

    function call(key, fallback = noop) {
      requireKnownKey(key, "runtime registry call");
      const fallbackFn = typeof fallback === "function" ? fallback : () => fallback;
      return function runtimeRegistryDelegate() {
        const fn = registry[key];
        if (typeof fn === "function") return fn.apply(null, arguments);
        return fallbackFn.apply(null, arguments);
      };
    }

    const api = {
      get,
      set,
      getter,
      call,
      knownKeys,
      requireKnownKey,
      requireKnownKeys,
      state: registry
    };
    return api;
  }

  root.PokerSimulatorRuntimeRegistry = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorRuntimeRegistry;
})();
