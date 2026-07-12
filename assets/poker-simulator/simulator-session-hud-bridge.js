(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const metricsModel = options.metricsModel || {};
    const getHudModel = typeof options.getHudModel === "function" ? options.getHudModel : () => options.hudModel || null;
    const now = typeof options.now === "function" ? options.now : () => Date.now();

    function targetFor(method) {
      const hudModel = getHudModel();
      if (hudModel && typeof hudModel[method] === "function") return hudModel;
      return metricsModel;
    }

    function invoke(method, args, fallback) {
      const callArgs = Array.prototype.slice.call(args || []);
      const target = targetFor(method);
      const fn = target && target[method];
      if (typeof fn === "function") return fn.apply(target, callArgs);
      return typeof fallback === "function" ? fallback(...callArgs) : fallback;
    }

    function cachedPokerStats() {
      return invoke("cachedPokerStats", arguments, {});
    }

    function sanitizeStatsScope(value) {
      return invoke("sanitizeStatsScope", arguments, String(value || "").toLowerCase() === "session" ? "session" : "allTime");
    }

    function statsScopeSetting() {
      return invoke("statsScopeSetting", arguments, "allTime");
    }

    function cachedDisplayPokerStats() {
      // NOTE (A2): the real scope-aware cachedDisplayPokerStats always lives on
      // the metrics/HUD model, so `invoke` resolves there. A truly scope-aware
      // fallback would need state.history plus an aggregatePokerStats primitive —
      // neither is in scope in this thin delegation bridge. Rather than silently
      // returning scope-unaware all-time cachedPokerStats (wrong when the active
      // scope is 'session'), assert the dependency is present so a missing
      // scope-aware source fails loudly instead of leaking all-time numbers.
      return invoke("cachedDisplayPokerStats", arguments, () => {
        throw new Error("sessionHudBridge: cachedDisplayPokerStats requires a scope-aware metrics/HUD model");
      });
    }

    function cachedDecisionStats() {
      return invoke("cachedDecisionStats", arguments, {});
    }

    function aggregateDecisionStats(entries) {
      return invoke("aggregateDecisionStats", arguments, {});
    }

    function decisionDurationMs(entry) {
      return invoke("decisionDurationMs", arguments, null);
    }

    function averageDurationMs(values) {
      return invoke("averageDurationMs", arguments, null);
    }

    function formatDecisionDuration(ms) {
      return invoke("formatDecisionDuration", arguments, "\u2014");
    }

    function combineRateStats(...stats) {
      return invoke("combineRateStats", stats, { made: 0, opportunities: 0, rate: 0 });
    }

    function sessionHudRate(stat) {
      return invoke("sessionHudRate", arguments, Number(stat?.opportunities || 0) ? `${Math.round(Number(stat.rate || 0) * 100)}%` : "\u2014");
    }

    function startTempoCounter(nowValue = now()) {
      return invoke("startTempoCounter", [nowValue], undefined);
    }

    function resetTempoCounter(nowValue = now()) {
      return invoke("resetTempoCounter", [nowValue], undefined);
    }

    function currentTempoElapsedMs(nowValue = now()) {
      return invoke("currentTempoElapsedMs", [nowValue], 0);
    }

    function currentHandsPerHour(hands, nowValue = now()) {
      return invoke("currentHandsPerHour", [hands, nowValue], null);
    }

    function formatHandsPerHour(value) {
      return invoke("formatHandsPerHour", arguments, "\u2014");
    }

    function updateSessionHudMeter(bb100, netBb) {
      return invoke("updateSessionHudMeter", arguments, undefined);
    }

    function renderSessionStats() {
      return invoke("renderSessionStats", arguments, undefined);
    }

    return {
      cachedPokerStats,
      sanitizeStatsScope,
      statsScopeSetting,
      cachedDisplayPokerStats,
      cachedDecisionStats,
      aggregateDecisionStats,
      decisionDurationMs,
      averageDurationMs,
      formatDecisionDuration,
      combineRateStats,
      sessionHudRate,
      startTempoCounter,
      resetTempoCounter,
      currentTempoElapsedMs,
      currentHandsPerHour,
      formatHandsPerHour,
      updateSessionHudMeter,
      renderSessionStats
    };
  }

  root.PokerSimulatorSessionHudBridge = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSessionHudBridge;
}());
