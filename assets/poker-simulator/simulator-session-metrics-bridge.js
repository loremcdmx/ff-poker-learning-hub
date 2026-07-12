(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const metricsModel = options.metricsModel || {};
    const getRoundBbMetric = typeof options.getRoundBbMetric === "function"
      ? options.getRoundBbMetric
      : () => options.roundBbMetric;

    function callMetric(name, fallback, ...args) {
      const fn = metricsModel && metricsModel[name];
      return typeof fn === "function" ? fn(...args) : fallback(...args);
    }

    function normalizeSessionPayload(payload, normalizeOptions = {}) {
      return callMetric("normalizeSessionPayload", () => null, payload, normalizeOptions);
    }

    function normalizePayloadHandLog(payload) {
      return callMetric("normalizePayloadHandLog", () => [], payload);
    }

    function cloneSessionPayloadValue(value, fallback) {
      return callMetric("cloneSessionPayloadValue", cloneSessionPayloadFallback, value, fallback);
    }

    function currentSessionPayload() {
      return callMetric("currentSessionPayload", () => ({}));
    }

    function sessionMetrics(source) {
      return callMetric("sessionMetrics", () => ({}), source);
    }

    function ratio(part, total) {
      return callMetric("ratio", ratioFallback, part, total);
    }

    function countBy(values) {
      return callMetric("countBy", countByFallback, values);
    }

    function percent(value) {
      return `${Math.round(Number(value || 0) * 100)}%`;
    }

    function signed(value) {
      const number = Number(value || 0);
      return `${number > 0 ? "+" : ""}${number}`;
    }

    function signedBb(value) {
      const roundBbMetric = getRoundBbMetric();
      const rounded = typeof roundBbMetric === "function" ? roundBbMetric(value) : Number(value || 0);
      return `${signed(rounded)} BB`;
    }

    return {
      normalizeSessionPayload,
      normalizePayloadHandLog,
      cloneSessionPayloadValue,
      currentSessionPayload,
      sessionMetrics,
      ratio,
      countBy,
      percent,
      signed,
      signedBb
    };
  }

  function cloneSessionPayloadFallback(value, fallback) {
    if (value == null) return fallback;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }

  function ratioFallback(part, total) {
    return total ? Number(part || 0) / Number(total || 0) : 0;
  }

  function countByFallback(values) {
    return (Array.isArray(values) ? values : []).reduce((acc, value) => {
      const key = String(value || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  root.PokerSimulatorSessionMetricsBridge = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
