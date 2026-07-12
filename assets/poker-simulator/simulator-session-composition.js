(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function model(options = {}) {
    const sessionMetricsKit = options.sessionMetricsKit || root.PokerSimulatorSessionMetrics;
    const sessionMetricsBridgeKit = options.sessionMetricsBridgeKit || root.PokerSimulatorSessionMetricsBridge;
    const sessionHudBridgeKit = options.sessionHudBridgeKit || root.PokerSimulatorSessionHudBridge;
    const handLogKit = options.handLogKit || root.PokerSimulatorHandLog || {};
    const leaderboardKit = options.leaderboardKit || root.PokerSimulatorLeaderboard || {};
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const getSessionHudModel = typeof options.getSessionHudModel === "function" ? options.getSessionHudModel : () => null;
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const limits = options.limits || {};
    const sessionId = String(options.sessionId || "");
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : (value) => String(value ?? "");

    const sessionMetricsModel = sessionMetricsKit.model({
      getState,
      handLogKit,
      leaderboardRatingFromMetrics: (metrics) => (
        typeof leaderboardKit.leaderboardRatingFromMetrics === "function"
          ? leaderboardKit.leaderboardRatingFromMetrics(metrics)
          : {}
      ),
      handLogOptions: { sessionId },
      limits,
      escapeHtml,
      allTimeExtraTotals: typeof options.allTimeExtraTotals === "function" ? options.allTimeExtraTotals : undefined
    });

    const sessionMetricsBridge = sessionMetricsBridgeKit.model({
      metricsModel: sessionMetricsModel,
      roundBbMetric: handLogKit.roundBbMetric || ((value) => value)
    });

    const sessionHudBridge = sessionHudBridgeKit.model({
      metricsModel: sessionMetricsModel,
      getHudModel: getSessionHudModel,
      now
    });

    return {
      sessionMetricsModel,
      sessionMetricsBridge,
      sessionHudBridge,
      normalizeSessionPayload: sessionMetricsBridge.normalizeSessionPayload,
      normalizePayloadHandLog: sessionMetricsBridge.normalizePayloadHandLog,
      cloneSessionPayloadValue: sessionMetricsBridge.cloneSessionPayloadValue,
      currentSessionPayload: sessionMetricsBridge.currentSessionPayload,
      sessionMetrics: sessionMetricsBridge.sessionMetrics,
      ratio: sessionMetricsBridge.ratio,
      countBy: sessionMetricsBridge.countBy,
      percent: sessionMetricsBridge.percent,
      signed: sessionMetricsBridge.signed,
      signedBb: sessionMetricsBridge.signedBb,
      cachedPokerStats: sessionHudBridge.cachedPokerStats,
      sanitizeStatsScope: sessionHudBridge.sanitizeStatsScope,
      statsScopeSetting: sessionHudBridge.statsScopeSetting,
      cachedDisplayPokerStats: sessionHudBridge.cachedDisplayPokerStats,
      cachedDecisionStats: sessionHudBridge.cachedDecisionStats,
      aggregateDecisionStats: sessionHudBridge.aggregateDecisionStats,
      decisionDurationMs: sessionHudBridge.decisionDurationMs,
      averageDurationMs: sessionHudBridge.averageDurationMs,
      formatDecisionDuration: sessionHudBridge.formatDecisionDuration,
      combineRateStats: sessionHudBridge.combineRateStats,
      sessionHudRate: sessionHudBridge.sessionHudRate,
      startTempoCounter: sessionHudBridge.startTempoCounter || noop,
      resetTempoCounter: sessionHudBridge.resetTempoCounter || noop,
      currentTempoElapsedMs: sessionHudBridge.currentTempoElapsedMs,
      currentHandsPerHour: sessionHudBridge.currentHandsPerHour,
      formatHandsPerHour: sessionHudBridge.formatHandsPerHour,
      updateSessionHudMeter: sessionHudBridge.updateSessionHudMeter || noop,
      renderSessionStats: sessionHudBridge.renderSessionStats || noop
    };
  }

  root.PokerSimulatorSessionComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSessionComposition;
})();
