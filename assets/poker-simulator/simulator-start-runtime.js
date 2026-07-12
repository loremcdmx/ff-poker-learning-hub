(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function fallbackEscapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fallbackFormatBb(value) {
    return `${Math.round(Number(value || 0) * 10) / 10} BB`;
  }

  function fallbackSetAttributeIfChanged(node, name, value) {
    if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  function model(options = {}) {
    const startKit = options.startKit || root.PokerSimulatorStart || {};
    const startModel = options.startModel || (typeof startKit.model === "function" ? startKit.model(options) : null);
    if (!startModel) throw new Error("PokerSimulatorStartRuntime requires PokerSimulatorStart model");

    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const saveSettings = typeof options.saveSettings === "function" ? options.saveSettings : () => {};
    const syncSimulationControls = typeof options.syncSimulationControls === "function" ? options.syncSimulationControls : () => {};
    const decisionTimebankSeconds = typeof options.decisionTimebankSeconds === "function" ? options.decisionTimebankSeconds : () => undefined;
    const formatBb = typeof options.formatBb === "function" ? options.formatBb : fallbackFormatBb;
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : fallbackEscapeHtml;
    const setAttributeIfChanged = typeof options.setAttributeIfChanged === "function"
      ? options.setAttributeIfChanged
      : fallbackSetAttributeIfChanged;
    const countButtons = Array.isArray(options.countButtons) ? options.countButtons : [];
    const dealNextAllTables = typeof options.dealNextAllTables === "function" ? options.dealNextAllTables : () => {};

    function state() {
      return getState() || {};
    }

    function settings() {
      const current = state();
      if (!current.settings) current.settings = {};
      return current.settings;
    }

    function hasSessionRestoreSnapshot() {
      return Array.isArray(state().restoreTableSnapshots) && state().restoreTableSnapshots.length > 0;
    }

    function renderStartPanel() {
      return startModel.renderStartPanel(startPanelSettingsSnapshot(), { formatBb, escapeHtml, restoreAvailable: hasSessionRestoreSnapshot() });
    }

    function startPanelSettingsSnapshot() {
      const currentSettings = settings();
      return startModel.sanitizeStartSettings({
        tableCount: startModel.sanitizeTableCount(currentSettings.tableCount),
        playerCount: startModel.sanitizePlayerCount(currentSettings.playerCount),
        stakesLevel: typeof startModel.sanitizeStakesLevel === "function" ? startModel.sanitizeStakesLevel(currentSettings.stakesLevel) : currentSettings.stakesLevel,
        difficulty: typeof startModel.sanitizeDifficulty === "function" ? startModel.sanitizeDifficulty(currentSettings.difficulty) : currentSettings.difficulty,
        botLineup: typeof startModel.sanitizeBotLineup === "function" ? startModel.sanitizeBotLineup(currentSettings.botLineup) : currentSettings.botLineup,
        botStrategyPool: typeof startModel.sanitizeBotStrategyPool === "function" ? startModel.sanitizeBotStrategyPool(currentSettings.botStrategyPool) : currentSettings.botStrategyPool,
        botPack: typeof startModel.sanitizeBotPack === "function" ? startModel.sanitizeBotPack(currentSettings.botPack) : currentSettings.botPack,
        simulationMode: startModel.sanitizeSimulationMode(currentSettings.simulationMode),
        handTempo: typeof startModel.sanitizeHandTempo === "function" ? startModel.sanitizeHandTempo(currentSettings.handTempo) : currentSettings.handTempo,
        randomStackMinBb: currentSettings.randomStackMinBb,
        randomStackMaxBb: currentSettings.randomStackMaxBb,
        tournamentStartingStackBb: currentSettings.tournamentStartingStackBb,
        tournamentLevelHands: currentSettings.tournamentLevelHands,
        tournamentBlindLevels: currentSettings.tournamentBlindLevels,
        actionTimerSeconds: decisionTimebankSeconds()
      });
    }

    function startPanelSettingsFromElement(panel, options = {}) {
      return startModel.startPanelSettingsFromElement(panel, settings(), options);
    }

    // options.transient (per-keystroke draft) flows down to the random-stack
    // range derivation so the min/max are NOT reordered mid-edit; ordering is
    // enforced only on commit (change/focusout/launch/preset).
    function persistStartPanelDraft(panel, options = {}) {
      const next = startPanelSettingsFromElement(panel, options);
      Object.assign(settings(), next);
      saveSettings();
      syncSimulationControls();
      countButtons.forEach((button) => {
        setAttributeIfChanged(button, "aria-pressed", String(Number(button.dataset.tableCount) === next.tableCount));
      });
      updateStartPanelSummary(panel, options);
      return next;
    }

    function applyStartPanelSettings(panel) {
      Object.assign(settings(), startPanelSettingsFromElement(panel), { setupCompleted: true, trainingMode: false });
      saveSettings();
      syncSimulationControls();
    }

    function reconcileStartPanelInputs(panel) {
      startModel.reconcileStartPanelInputs(panel, settings());
    }

    function updateStartPanelMode(panel, mode) {
      const activeMode = startModel.sanitizeSimulationMode(mode);
      startModel.setStartPanelModeUi(panel, activeMode);
      persistStartPanelDraft(panel);
    }

    function updateStartPanelTableCount(panel, count) {
      const nextCount = startModel.sanitizeTableCount(count);
      startModel.setStartPanelTableCountUi(panel, nextCount);
      persistStartPanelDraft(panel);
    }

    function updateStartPanelHandTempo(panel, tempo) {
      const nextTempo = startModel.sanitizeHandTempo(tempo);
      startModel.setStartPanelHandTempoUi(panel, nextTempo);
      persistStartPanelDraft(panel);
    }

    function updateStartPanelPlayerCount(panel, count) {
      const nextCount = startModel.sanitizePlayerCount(count);
      startModel.setStartPanelPlayerCountUi(panel, nextCount);
      persistStartPanelDraft(panel);
    }

    function applyStartSessionTemplate(panel, button) {
      if (!panel || !button) return false;
      if (!startModel.applyStartSessionTemplate(panel, button.dataset.startSessionTemplate)) return false;
      persistStartPanelDraft(panel);
      return true;
    }

    function applyStartDifficultyPreset(panel, button) {
      if (!panel || !button) return false;
      if (!startModel.applyStartDifficultyPreset(panel, button.dataset.startDifficultyPreset)) return false;
      persistStartPanelDraft(panel);
      return true;
    }

    function applyStartBotPackPreset(panel, button) {
      if (!panel || !button) return false;
      if (!startModel.applyStartBotPackPreset(panel, button.dataset.startBotPackOption)) return false;
      persistStartPanelDraft(panel);
      return true;
    }

    function applyStartStackPreset(panel, button) {
      if (!panel || !button) return false;
      if (!startModel.applyStartStackPreset(panel, button.dataset)) return false;
      persistStartPanelDraft(panel);
      return true;
    }

    function applyStartTimerPreset(panel, button) {
      if (!panel || !button) return false;
      if (!startModel.applyStartTimerPreset(panel, button.dataset)) return false;
      persistStartPanelDraft(panel);
      return true;
    }

    function applyStartTournamentStackStep(panel, button) {
      if (!panel || !button) return false;
      if (!startModel.applyStartTournamentStackStep(panel, button.dataset)) return false;
      persistStartPanelDraft(panel);
      return true;
    }

    function applyStartTournamentHandsStep(panel, button) {
      if (!panel || !button) return false;
      if (!startModel.applyStartTournamentHandsStep(panel, button.dataset)) return false;
      persistStartPanelDraft(panel);
      return true;
    }

    function applyStartTournamentPreset(panel, button) {
      if (!panel || !button) return false;
      if (!startModel.applyStartTournamentPreset(panel, button.dataset)) return false;
      persistStartPanelDraft(panel);
      return true;
    }

    function updateStartPanelSummary(panel, options = {}) {
      startModel.updateStartPanelSummary(panel, startPanelSettingsFromElement(panel, options), { formatBb, transient: Boolean(options.transient) });
    }

    function handleClick(event) {
      const target = event?.target;
      const panel = target?.closest?.("[data-start-panel]");
      if (!panel) return false;
      const sessionTemplateButton = target.closest("[data-start-session-template]");
      const difficultyButton = target.closest("[data-start-difficulty-preset]");
      const botPackButton = target.closest("[data-start-bot-pack-option]");
      const modeButton = target.closest("[data-start-mode-value]");
      const tableCountButton = target.closest("[data-start-table-count]");
      const handTempoButton = target.closest("[data-start-hand-tempo]");
      const playerCountButton = target.closest("[data-start-player-count-option]");
      const stackPresetButton = target.closest("[data-start-stack-preset]");
      const timerPresetButton = target.closest("[data-start-timer-preset]");
      const tournamentStackStepButton = target.closest("[data-start-mtt-stack-step]");
      const tournamentHandsStepButton = target.closest("[data-start-mtt-hands-step]");
      const tournamentPresetButton = target.closest("[data-start-mtt-preset]");
      const actionButton = target.closest("[data-action]");
      if (sessionTemplateButton) return applyStartSessionTemplate(panel, sessionTemplateButton);
      if (difficultyButton) return applyStartDifficultyPreset(panel, difficultyButton);
      if (botPackButton) return applyStartBotPackPreset(panel, botPackButton);
      if (modeButton) {
        updateStartPanelMode(panel, modeButton.dataset.startModeValue);
        return true;
      }
      if (tableCountButton) {
        updateStartPanelTableCount(panel, tableCountButton.dataset.startTableCount);
        return true;
      }
      if (handTempoButton) {
        updateStartPanelHandTempo(panel, handTempoButton.dataset.startHandTempo);
        return true;
      }
      if (playerCountButton) {
        updateStartPanelPlayerCount(panel, playerCountButton.dataset.startPlayerCountOption);
        return true;
      }
      if (stackPresetButton) return applyStartStackPreset(panel, stackPresetButton);
      if (timerPresetButton) return applyStartTimerPreset(panel, timerPresetButton);
      if (tournamentStackStepButton) return applyStartTournamentStackStep(panel, tournamentStackStepButton);
      if (tournamentHandsStepButton) return applyStartTournamentHandsStep(panel, tournamentHandsStepButton);
      if (tournamentPresetButton) return applyStartTournamentPreset(panel, tournamentPresetButton);
      if (actionButton?.dataset.action === "start-simulator") {
        applyStartPanelSettings(panel);
        dealNextAllTables();
        return true;
      }
      return false;
    }

    function handleChange(event) {
      const target = event?.target;
      const panel = target?.closest?.("[data-start-panel]");
      if (!panel) return false;
      if (startModel.isBlindLevelsInput(target)) {
        startModel.normalizeBlindLevelsInput(target, settings().tournamentBlindLevels);
      }
      persistStartPanelDraft(panel);
      reconcileStartPanelInputs(panel);
      return true;
    }

    function handleInput(event) {
      const target = event?.target;
      const panel = target?.closest?.("[data-start-panel]");
      if (!panel) return false;
      if (startModel.isBlindLevelsInput(target) && startModel.shouldNormalizeBlindLevelsOnInput(target)) {
        startModel.normalizeBlindLevelsInput(target, settings().tournamentBlindLevels);
      }
      // Per-keystroke draft: keep random-stack min/max as typed (no swap); the
      // change/focusout commit below enforces ordering + write-back.
      persistStartPanelDraft(panel, { transient: true });
      return true;
    }

    function handleFocusout(event) {
      const target = event?.target;
      const panel = target?.closest?.("[data-start-panel]");
      if (!panel) return false;
      const isBlindLevels = startModel.isBlindLevelsInput(target);
      const isStartNumberInput = target.matches(
        "[data-start-random-stack-min], [data-start-random-stack-max], [data-start-tournament-stack], [data-start-tournament-hands]"
      );
      if (!isBlindLevels && !isStartNumberInput) return false;
      if (isBlindLevels) {
        startModel.normalizeBlindLevelsInput(target, settings().tournamentBlindLevels);
      }
      persistStartPanelDraft(panel);
      reconcileStartPanelInputs(panel);
      return true;
    }

    return {
      renderStartPanel,
      startPanelSettingsSnapshot,
      startPanelSettingsFromElement,
      persistStartPanelDraft,
      applyStartPanelSettings,
      reconcileStartPanelInputs,
      updateStartPanelMode,
      updateStartPanelTableCount,
      updateStartPanelHandTempo,
      applyStartSessionTemplate,
      applyStartDifficultyPreset,
      applyStartBotPackPreset,
      applyStartStackPreset,
      applyStartTimerPreset,
      applyStartTournamentStackStep,
      applyStartTournamentHandsStep,
      applyStartTournamentPreset,
      updateStartPanelSummary,
      hasSessionRestoreSnapshot,
      handleClick,
      handleChange,
      handleInput,
      handleFocusout
    };
  }

  root.PokerSimulatorStartRuntime = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorStartRuntime;
})();
