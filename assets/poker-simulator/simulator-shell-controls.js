(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const documentRef = options.documentRef || root.document || null;
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const saveSettings = typeof options.saveSettings === "function" ? options.saveSettings : () => {};
    const markAllTablesDirty = typeof options.markAllTablesDirty === "function" ? options.markAllTablesDirty : () => {};
    const render = typeof options.render === "function" ? options.render : () => {};
    const renderSessionStats = typeof options.renderSessionStats === "function" ? options.renderSessionStats : () => {};
    const sanitizeStatsScope = typeof options.sanitizeStatsScope === "function" ? options.sanitizeStatsScope : (value) => String(value || "allTime");
    const isPaused = typeof options.isPaused === "function" ? options.isPaused : () => false;
    const pauseButton = options.pauseButton || null;
    const dealAllButton = options.dealAllButton || null;
    const statsScopeButtons = Array.isArray(options.statsScopeButtons) ? options.statsScopeButtons : [];

    function state() {
      return getState() || {};
    }

    function settings() {
      const current = state();
      if (!current.settings) current.settings = {};
      return current.settings;
    }

    function toggleAmountMode() {
      const currentSettings = settings();
      currentSettings.amountMode = currentSettings.amountMode === "chips" ? "bb" : "chips";
      saveSettings();
      markAllTablesDirty();
      render("amount-mode");
      return currentSettings.amountMode;
    }

    function isAmountModeToggleTarget(target) {
      if (!target) return false;
      if (target.closest("button, input, select, textarea, [data-bet-widget], .action-bar")) return false;
      return Boolean(target.closest(".seat-panel, .bet-marker, .pot, .pot-total"));
    }

    function syncPauseButton() {
      const paused = isPaused();
      documentRef?.documentElement?.classList?.toggle("is-simulator-paused", paused);
      if (!pauseButton) return;
      const label = paused ? "Продолжить" : "Пауза";
      if (pauseButton.textContent !== label) pauseButton.textContent = label;
      pauseButton.dataset.short = paused ? "Старт" : "Пауза";
      pauseButton.classList.toggle("is-paused", paused);
      pauseButton.setAttribute("aria-pressed", paused ? "true" : "false");
      pauseButton.setAttribute("title", label);
    }

    function syncDealButton() {
      if (!dealAllButton) return;
      const started = Boolean(state().started);
      const label = started ? "Новая" : "Старт";
      const ariaLabel = started ? "Новая раздача" : "Старт симуляции";
      if (dealAllButton.textContent !== label) dealAllButton.textContent = label;
      dealAllButton.dataset.short = label;
      dealAllButton.setAttribute("aria-label", ariaLabel);
      dealAllButton.setAttribute("title", ariaLabel);
    }

    function syncStatsScopeButtons(scope = settings().statsScope) {
      const activeScope = sanitizeStatsScope(scope);
      statsScopeButtons.forEach((button) => {
        const selected = sanitizeStatsScope(button.dataset.statsScopeButton) === activeScope;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    }

    function switchStatsScope(scope) {
      const currentSettings = settings();
      const activeScope = sanitizeStatsScope(scope);
      if (sanitizeStatsScope(currentSettings.statsScope) === activeScope) {
        syncStatsScopeButtons(activeScope);
        return false;
      }
      currentSettings.statsScope = activeScope;
      saveSettings();
      syncStatsScopeButtons(activeScope);
      renderSessionStats();
      return true;
    }

    return {
      toggleAmountMode,
      isAmountModeToggleTarget,
      syncPauseButton,
      syncDealButton,
      syncStatsScopeButtons,
      switchStatsScope
    };
  }

  root.PokerSimulatorShellControls = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
