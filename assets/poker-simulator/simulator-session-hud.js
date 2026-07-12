(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const metricsModel = options.metricsModel || {};
    const controls = options.controls || {};
    const domPatch = options.domPatch || {};
    const setTextIfChanged = typeof options.setTextIfChanged === "function" ? options.setTextIfChanged : (node, value) => {
      if (typeof domPatch.setTextIfChanged === "function") return domPatch.setTextIfChanged(node, value);
      if (!node) return;
      const next = String(value);
      if (node.textContent !== next) node.textContent = next;
    };
    const setHtmlIfChanged = typeof options.setHtmlIfChanged === "function" ? options.setHtmlIfChanged : (node, html) => {
      if (typeof domPatch.setHtmlIfChanged === "function") return domPatch.setHtmlIfChanged(node, html);
      if (!node) return;
      const next = String(html || "");
      if (node.innerHTML !== next) node.innerHTML = next;
    };
    const setAttributeIfChanged = typeof options.setAttributeIfChanged === "function" ? options.setAttributeIfChanged : (node, name, value) => {
      if (typeof domPatch.setAttributeIfChanged === "function") return domPatch.setAttributeIfChanged(node, name, value);
      if (!node) return;
      const next = String(value);
      if (node.getAttribute(name) !== next) node.setAttribute(name, next);
    };
    const signed = typeof options.signed === "function" ? options.signed : (value) => {
      const number = Number(value || 0);
      return `${number > 0 ? "+" : ""}${number}`;
    };
    const signedBb = typeof options.signedBb === "function" ? options.signedBb : (value) => `${signed(value)} BB`;
    const roundBbMetric = typeof options.roundBbMetric === "function" ? options.roundBbMetric : (value) => Math.round(Number(value || 0) * 10) / 10;
    const isPaused = typeof options.isPaused === "function" ? options.isPaused : () => false;
    const replayEntries = typeof options.replayEntries === "function" ? options.replayEntries : () => [];
    const renderHistoryEntry = typeof options.renderHistoryEntry === "function" ? options.renderHistoryEntry : () => "";
    const renderDecisionEntry = typeof options.renderDecisionEntry === "function" ? options.renderDecisionEntry : () => "";
    const now = typeof options.now === "function" ? options.now : () => Date.now();

    function state() {
      return getState() || {};
    }

    function cachedPokerStats() {
      return typeof metricsModel.cachedPokerStats === "function" ? metricsModel.cachedPokerStats() : {};
    }

    function sanitizeStatsScope(value) {
      return typeof metricsModel.sanitizeStatsScope === "function"
        ? metricsModel.sanitizeStatsScope(value)
        : (String(value || "").toLowerCase() === "session" ? "session" : "allTime");
    }

    function statsScopeSetting() {
      return typeof metricsModel.statsScopeSetting === "function" ? metricsModel.statsScopeSetting() : "allTime";
    }

    function cachedDisplayPokerStats() {
      return typeof metricsModel.cachedDisplayPokerStats === "function" ? metricsModel.cachedDisplayPokerStats() : cachedPokerStats();
    }

    function cachedDecisionStats() {
      return typeof metricsModel.cachedDecisionStats === "function" ? metricsModel.cachedDecisionStats() : {};
    }

    function aggregateDecisionStats(entries) {
      return typeof metricsModel.aggregateDecisionStats === "function" ? metricsModel.aggregateDecisionStats(entries) : {};
    }

    function decisionDurationMs(entry) {
      return typeof metricsModel.decisionDurationMs === "function" ? metricsModel.decisionDurationMs(entry) : null;
    }

    function averageDurationMs(values) {
      return typeof metricsModel.averageDurationMs === "function" ? metricsModel.averageDurationMs(values) : null;
    }

    function formatDecisionDuration(ms) {
      return typeof metricsModel.formatDecisionDuration === "function" ? metricsModel.formatDecisionDuration(ms) : "\u2014";
    }

    function combineRateStats(...stats) {
      return typeof metricsModel.combineRateStats === "function" ? metricsModel.combineRateStats(...stats) : { made: 0, opportunities: 0, rate: 0 };
    }

    function sessionHudRate(stat) {
      return typeof metricsModel.sessionHudRate === "function"
        ? metricsModel.sessionHudRate(stat)
        : (Number(stat?.opportunities || 0) ? `${Math.round(Number(stat.rate || 0) * 100)}%` : "\u2014");
    }

    function startTempoCounter(nowValue = now()) {
      const current = state();
      if (current.tempoStartedAt > 0) return;
      current.tempoStartedAt = nowValue;
      current.tempoBaseHands = cachedPokerStats().hands;
      current.tempoPausedMs = 0;
    }

    function resetTempoCounter(nowValue = now()) {
      const current = state();
      current.tempoStartedAt = current.started ? nowValue : 0;
      current.tempoBaseHands = cachedPokerStats().hands;
      current.tempoPausedMs = 0;
    }

    function currentTempoElapsedMs(nowValue = now()) {
      const current = state();
      if (!(current.tempoStartedAt > 0)) return 0;
      const activePauseMs = isPaused() && current.pauseStartedAt ? Math.max(0, nowValue - Number(current.pauseStartedAt || nowValue)) : 0;
      return Math.max(0, nowValue - current.tempoStartedAt - Number(current.tempoPausedMs || 0) - activePauseMs);
    }

    function currentHandsPerHour(hands, nowValue = now()) {
      const current = state();
      const completedSinceStart = Math.max(0, Number(hands || 0) - Number(current.tempoBaseHands || 0));
      const elapsedMs = currentTempoElapsedMs(nowValue);
      if (!completedSinceStart || elapsedMs <= 0) return null;
      return (completedSinceStart * 3600000) / elapsedMs;
    }

    function formatHandsPerHour(value) {
      if (!Number.isFinite(Number(value))) return "\u2014";
      const rounded = Number(value) >= 100 ? Math.round(Number(value)) : Math.round(Number(value) * 10) / 10;
      return String(rounded);
    }

    function updateSessionHudMeter(bb100, netBb) {
      const meter = controls.sessionHudMeterFill;
      if (!meter) return;
      const value = Number(bb100 || 0);
      const width = Math.min(50, Math.round(Math.abs(value) * 5) / 10);
      const widthText = `${width}%`;
      if (meter.style.width !== widthText) {
        meter.style.width = widthText;
      }
      meter.classList.toggle("is-negative", value < 0 || (value === 0 && Number(netBb || 0) < 0));
    }

    function persistenceStatus() {
      const current = state();
      const lock = current.sessionStorageLock && typeof current.sessionStorageLock === "object" ? current.sessionStorageLock : {};
      if (current.persistenceWarning) {
        const tableCountBlocked = String(current.persistenceWarningReason || "") === "table-count-live-hands";
        return {
          tone: "warning",
          label: tableCountBlocked ? "Доиграйте руки" : "Память",
          title: current.persistenceWarning
        };
      }
      const scopedLockMessage = lock.mode === "tab-scoped" ? lock.message : "";
      return {
        tone: "ok",
        label: "Сохранено",
        title: scopedLockMessage || "Руки сохраняются отдельно для этой вкладки."
      };
    }

    function renderPersistenceStatus() {
      const status = persistenceStatus();
      const badge = controls.sessionHudPersistence;
      if (badge) {
        setTextIfChanged(badge, status.label);
        setAttributeIfChanged(badge, "data-persistence-tone", status.tone);
        setAttributeIfChanged(badge, "title", status.title);
      }
    }

    function renderSessionStats() {
      const pokerStats = cachedDisplayPokerStats();
      const decisionStats = cachedDecisionStats();
      const hands = pokerStats.hands;
      const wins = pokerStats.wins;
      const folds = pokerStats.folds;
      const showdowns = pokerStats.showdowns;
      const decisions = decisionStats.decisions;
      const handsPerHour = currentHandsPerHour(cachedPokerStats().hands);

      setTextIfChanged(controls.statHands, hands);
      setTextIfChanged(controls.statWins, hands ? `${wins} \u00b7 ${Math.round((wins / hands) * 100)}%` : "0");
      setTextIfChanged(controls.statFolds, folds);
      setTextIfChanged(controls.statShowdowns, showdowns);
      setTextIfChanged(controls.statDecisions, decisions);
      setTextIfChanged(controls.statAvgDecision, formatDecisionDuration(decisionStats.averageDecisionMs));
      setTextIfChanged(controls.statHandsHour, formatHandsPerHour(handsPerHour));
      setTextIfChanged(controls.statGood, decisions ? `${decisionStats.good} \u00b7 ${Math.round((decisionStats.good / decisions) * 100)}%` : "0");
      setTextIfChanged(controls.statAggression, decisions ? `${Math.round((decisionStats.aggressive / decisions) * 100)}%` : "0");
      setHtmlIfChanged(controls.historyStrip, replayEntries().slice(0, 4).map(renderHistoryEntry).join(""));
      setHtmlIfChanged(controls.decisionStrip, state().decisions.slice(0, 5).map(renderDecisionEntry).join(""));
      setHtmlIfChanged(controls.reviewStrip, decisionStats.reviewHtml);

      const netBb = roundBbMetric(pokerStats.evNetBb);
      const bb100 = roundBbMetric(pokerStats.evBb100);
      const winTone = netBb > 0 ? "up" : netBb < 0 ? "down" : "even";
      setAttributeIfChanged(controls.sessionHud, "data-tone", winTone);
      setTextIfChanged(controls.sessionHudHands, hands);
      setTextIfChanged(controls.sessionHudNetBb, signedBb(netBb));
      setTextIfChanged(controls.sessionHudBb100, signed(bb100));
      setTextIfChanged(controls.sessionHudVpip, sessionHudRate(pokerStats.preflop?.vpip));
      setTextIfChanged(controls.sessionHudPfr, sessionHudRate(pokerStats.preflop?.pfr));
      setTextIfChanged(controls.sessionHudThreeBet, sessionHudRate(pokerStats.preflop?.threeBet));
      setTextIfChanged(controls.sessionHudAvgDecision, formatDecisionDuration(decisionStats.averageDecisionMs));
      setTextIfChanged(controls.sessionHudHandsHour, formatHandsPerHour(handsPerHour));
      updateSessionHudMeter(bb100, netBb);
      renderPersistenceStatus();
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
      persistenceStatus,
      renderPersistenceStatus,
      renderSessionStats
    };
  }

  root.PokerSimulatorSessionHud = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
