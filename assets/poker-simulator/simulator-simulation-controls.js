(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const documentRef = options.documentRef || root.document || null;
    const getSettings = typeof options.getSettings === "function" ? options.getSettings : () => ({});
    const startModel = options.startModel || {};
    const domPatch = options.domPatch || {};
    const setValueIfChanged = typeof options.setValueIfChanged === "function"
      ? options.setValueIfChanged
      : typeof domPatch.setValueIfChanged === "function"
        ? domPatch.setValueIfChanged
      : (node, value) => { if (node && node.value !== value) node.value = value; };
    const sanitizeSimulationMode = typeof options.sanitizeSimulationMode === "function"
      ? options.sanitizeSimulationMode
      : typeof startModel.sanitizeSimulationMode === "function"
        ? startModel.sanitizeSimulationMode
        : (value) => String(value || "random");
    const sanitizeRandomStackRange = typeof options.sanitizeRandomStackRange === "function"
      ? options.sanitizeRandomStackRange
      : typeof startModel.sanitizeRandomStackRange === "function"
        ? startModel.sanitizeRandomStackRange
        : (min, max) => ({ min: Number(min || 0), max: Number(max || 0) });
    const sanitizeBbNumber = typeof options.sanitizeBbNumber === "function"
      ? options.sanitizeBbNumber
      : typeof startModel.sanitizeBbNumber === "function"
        ? startModel.sanitizeBbNumber
        : (value, _min, _max, fallback) => Number(value || fallback || 0);
    const sanitizeInteger = typeof options.sanitizeInteger === "function"
      ? options.sanitizeInteger
      : typeof startModel.sanitizeInteger === "function"
        ? startModel.sanitizeInteger
        : (value, _min, _max, fallback) => Number(value || fallback || 0);
    const normalizeBlindLevelsInput = typeof options.normalizeBlindLevelsInput === "function"
      ? options.normalizeBlindLevelsInput
      : typeof startModel.normalizeBlindLevelsInput === "function"
        ? startModel.normalizeBlindLevelsInput
        : (value, fallback) => value?.value || fallback || "";
    const applySettingsFromControls = typeof options.applySettingsFromControls === "function" ? options.applySettingsFromControls : null;
    const controls = options.controls || {};

    const simulationModeButtons = Array.isArray(controls.simulationModeButtons) ? controls.simulationModeButtons : [];

    function settings() {
      return getSettings() || {};
    }

    // Settings loaded from older builds may still carry timer values that the
    // current preset-only select no longer exposes (notably 15s and 60s). A
    // direct `select.value = "15"` clears the control, so resolve the nearest
    // numeric option for display and let the normal close/change path persist
    // that canonical value. Ties intentionally choose the lower option:
    // legacy 15s -> 10s, while 60s -> the current 45s ceiling.
    function actionTimerControlValue(control, value) {
      const desired = String(value ?? "");
      const options = Array.from(control?.options || []);
      if (!options.length || options.some((option) => String(option.value) === desired)) return desired;
      const desiredNumber = Number(desired);
      if (!Number.isFinite(desiredNumber)) return String(options[0]?.value ?? "");
      let best = null;
      options.forEach((option, index) => {
        const numeric = Number(option.value);
        if (!Number.isFinite(numeric)) return;
        const candidate = {
          value: String(option.value),
          numeric,
          distance: Math.abs(numeric - desiredNumber),
          index
        };
        if (
          !best
          || candidate.distance < best.distance
          || (candidate.distance === best.distance && candidate.numeric < best.numeric)
          || (candidate.distance === best.distance && candidate.numeric === best.numeric && candidate.index < best.index)
        ) {
          best = candidate;
        }
      });
      return best?.value ?? String(options[0]?.value ?? "");
    }

    function simulationControlGroups() {
      return [{
        mode: controls.simulationModeSelect,
        randomMin: controls.randomStackMinInput,
        randomMax: controls.randomStackMaxInput,
        tournamentStack: controls.tournamentStartingStackInput,
        tournamentHands: controls.tournamentLevelHandsInput,
        tournamentLevels: controls.tournamentBlindLevelsInput,
        actionTimer: controls.actionTimerSecondsInput,
        panelSelector: "[data-settings-mode-panel]"
      }];
    }

    function updateSimulationModePanels(group) {
      if (!group) return;
      const activeMode = sanitizeSimulationMode(group?.mode?.value || settings().simulationMode);
      documentRef?.querySelectorAll?.(group.panelSelector)?.forEach((panel) => {
        const targetMode = panel.dataset.settingsModePanel;
        panel.hidden = Boolean(targetMode && targetMode !== activeMode);
      });
    }

    function syncSimulationModeButtons(mode = settings().simulationMode) {
      const activeMode = sanitizeSimulationMode(mode);
      simulationModeButtons.forEach((button) => {
        const selected = sanitizeSimulationMode(button.dataset.simulationModeButton) === activeMode;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      return activeMode;
    }

    function syncSimulationControls() {
      const current = settings();
      simulationControlGroups().forEach((group) => {
        setValueIfChanged(group.mode, current.simulationMode);
        setValueIfChanged(group.randomMin, String(current.randomStackMinBb));
        setValueIfChanged(group.randomMax, String(current.randomStackMaxBb));
        setValueIfChanged(group.tournamentStack, String(current.tournamentStartingStackBb));
        setValueIfChanged(group.tournamentHands, String(current.tournamentLevelHands));
        setValueIfChanged(group.tournamentLevels, current.tournamentBlindLevels);
        setValueIfChanged(group.actionTimer, actionTimerControlValue(group.actionTimer, current.actionTimerSeconds));
        updateSimulationModePanels(group);
      });
      syncSimulationModeButtons(current.simulationMode);
    }

    function switchSimulationMode(mode) {
      const activeMode = sanitizeSimulationMode(mode);
      const [settingsGroup] = simulationControlGroups();
      setValueIfChanged(controls.simulationModeSelect, activeMode);
      updateSimulationModePanels(settingsGroup);
      syncSimulationModeButtons(activeMode);
      if (applySettingsFromControls) applySettingsFromControls();
      return activeMode;
    }

    function simulationSettingsFromGroup(group, base = settings()) {
      const current = base || {};
      const randomRange = sanitizeRandomStackRange(group?.randomMin?.value, group?.randomMax?.value);
      return {
        simulationMode: sanitizeSimulationMode(group?.mode?.value || current.simulationMode),
        randomStackMinBb: randomRange.min,
        randomStackMaxBb: randomRange.max,
        tournamentStartingStackBb: sanitizeBbNumber(group?.tournamentStack?.value, 5, 500, current.tournamentStartingStackBb),
        tournamentLevelHands: sanitizeInteger(group?.tournamentHands?.value, 1, 200, current.tournamentLevelHands),
        tournamentBlindLevels: normalizeBlindLevelsInput(group?.tournamentLevels, current.tournamentBlindLevels),
        actionTimerSeconds: sanitizeInteger(group?.actionTimer?.value, 0, 300, current.actionTimerSeconds)
      };
    }

    return {
      simulationControlGroups,
      syncSimulationControls,
      updateSimulationModePanels,
      syncSimulationModeButtons,
      switchSimulationMode,
      simulationSettingsFromGroup,
      actionTimerControlValue
    };
  }

  root.PokerSimulatorSimulationControls = { model };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { model };
  }
}());
