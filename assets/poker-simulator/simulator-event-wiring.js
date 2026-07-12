(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function assignFn(target, key, candidate) {
    if (typeof target[key] === "function" || typeof candidate !== "function") return;
    target[key] = candidate;
  }

  function assignValue(target, key, candidate) {
    if (target[key] !== undefined || candidate === undefined || candidate === null) return;
    target[key] = candidate;
  }

  // Fail-LOUD boundary for REQUIRED loose-bag deps (the batch form of the
  // foundation roadmap's requireFn). assignFn() above is intentionally
  // fail-OPEN for genuinely-optional deps; requireFns asserts that a dep this
  // hub actually CALLS unguarded resolved to a function, so a renamed/unloaded
  // producer surfaces at boot naming THIS hub, instead of a silent no-op or a
  // generic "x is not a function" deep in an event handler. Only meaningful in
  // a real DOM runtime — headless source-contract harnesses load these hubs
  // with intentionally-partial mocks, so skip when there is no document.
  const reportedMissingDeps = new Set();

  function requireFns(target, keys, source) {
    if (!root.document) return;
    const missing = (Array.isArray(keys) ? keys : []).filter((key) => typeof target[key] !== "function");
    if (!missing.length) return;
    const signature = `${source}|${missing.join(",")}`;
    if (reportedMissingDeps.has(signature)) return;
    reportedMissingDeps.add(signature);
    const message = `[poker-simulator] ${source}: missing required runtime dependencies: ${missing.join(", ")} — a producer was renamed or failed to load (silent loose-bag wiring).`;
    if (root.console && typeof root.console.error === "function") root.console.error(message);
  }

  function model(options = {}) {
    const runtimeBridge = options.runtimeBridge || {};
    const visualRuntime = options.visualRuntime || {};
    const actionBridge = options.actionBridge || {};
    const actionRuntime = options.actionRuntime || {};
    const sessionBridge = options.sessionBridge || {};
    const historyBridge = options.historyBridge || {};
    const renderLoop = options.renderLoop || {};
    const startModel = options.startModel || {};
    const domHelpers = options.domHelpers || options.domPatch || {};
    const opponentNotesUi = options.opponentNotesUi || {};

    assignValue(options, "startPanelRuntime", actionRuntime.startPanelRuntime);
    assignFn(options, "dealNextAllTables", runtimeBridge.dealNextAllTables);
    assignFn(options, "setPaused", visualRuntime.setPaused);
    assignFn(options, "getTable", runtimeBridge.getTable);
    assignFn(options, "setActiveTable", renderLoop.setActiveTable);
    assignFn(options, "openOpponentNoteDialog", runtimeBridge.openOpponentNoteDialog);
    assignFn(options, "render", renderLoop.render);
    assignFn(options, "setFoldAnyQueue", runtimeBridge.setFoldAnyQueue);
    assignFn(options, "updateBetSliderByStep", actionBridge.updateBetSliderByStep);
    assignFn(options, "updateBetSlider", actionBridge.updateBetSlider);
    assignFn(options, "isAmountModeToggleTarget", visualRuntime.isAmountModeToggleTarget);
    assignFn(options, "toggleAmountMode", visualRuntime.toggleAmountMode);
    assignFn(options, "togglePause", visualRuntime.togglePause);
    assignFn(options, "replaceTable", runtimeBridge.replaceTable);
    assignFn(options, "restartTournament", runtimeBridge.restartTournament);
    assignFn(options, "showReplay", runtimeBridge.showReplay);
    assignFn(options, "historyEntryForTable", historyBridge.historyEntryForTable);
    assignFn(options, "needsBetAmount", actionBridge.needsBetAmount);
    assignFn(options, "readBetAmount", actionBridge.readBetAmount);
    assignFn(options, "handleHeroAction", runtimeBridge.handleHeroAction);
    assignFn(options, "syncTableCount", runtimeBridge.syncTableCount);
    assignFn(options, "pendingTableCountForfeit", runtimeBridge.pendingTableCountForfeit);
    assignFn(options, "switchSimulationMode", runtimeBridge.switchSimulationMode);
    assignFn(options, "switchStatsScope", runtimeBridge.switchStatsScope);
    assignFn(options, "syncStatsScopeButtons", runtimeBridge.syncStatsScopeButtons);
    assignFn(options, "renderBotLabOutput", runtimeBridge.renderBotLabOutput);
    assignFn(options, "renderImportStatus", runtimeBridge.renderImportStatus);
    assignFn(options, "showAnalytics", runtimeBridge.showAnalytics);
    assignFn(options, "showLeaderboard", runtimeBridge.showLeaderboard);
    assignFn(options, "saveLeaderboardProfileName", runtimeBridge.saveLeaderboardProfileName);
    assignFn(options, "startLeaderboardSignIn", runtimeBridge.startLeaderboardSignIn);
    assignFn(options, "deleteCurrentLeaderboardEntry", runtimeBridge.deleteCurrentLeaderboardEntry);
    assignFn(options, "replayEntries", historyBridge.replayEntries);
    assignFn(options, "setReplayIndex", runtimeBridge.setReplayIndex);
    assignFn(options, "toggleReplayAutoplay", runtimeBridge.toggleReplayAutoplay);
    assignFn(options, "handleReplayKeydown", runtimeBridge.handleReplayKeydown);
    assignFn(options, "stopReplayAutoplay", runtimeBridge.stopReplayAutoplay);
    assignFn(options, "refreshCurrentLeaderboardEntry", sessionBridge.refreshCurrentLeaderboardEntry);
    assignFn(options, "sanitizeLeaderboardFilters", sessionBridge.sanitizeLeaderboardFilters);
    assignFn(options, "renderLeaderboardBody", runtimeBridge.renderLeaderboardBody);
    assignFn(options, "runBotLabSample", runtimeBridge.runBotLabSample);
    assignFn(options, "saveOpponentNoteFromDialog", runtimeBridge.saveOpponentNoteFromDialog);
    assignFn(options, "clearOpponentNoteFromDialog", runtimeBridge.clearOpponentNoteFromDialog);
    assignFn(options, "resetEditingOpponentNote", opponentNotesUi.resetEditingOpponentNote);
    assignFn(options, "exportSessionHistory", runtimeBridge.exportSessionHistory);
    assignFn(options, "exportHandLogJsonl", runtimeBridge.exportHandLogJsonl);
    assignFn(options, "exportSessionArchive", sessionBridge.exportSessionArchive);
    assignFn(options, "importSessionHistoryFile", runtimeBridge.importSessionHistoryFile);
    assignFn(options, "shouldIgnoreHotkey", runtimeBridge.shouldIgnoreHotkey);
    assignFn(options, "triggerHotkey", runtimeBridge.triggerHotkey);
    assignFn(options, "resetCurrentSession", runtimeBridge.resetCurrentSession);
    assignFn(options, "sanitizePlayerCount", startModel.sanitizePlayerCount);
    assignFn(options, "simulationSettingsFromGroup", runtimeBridge.simulationSettingsFromGroup);
    assignFn(options, "simulationControlGroups", runtimeBridge.simulationControlGroups);
    assignFn(options, "sanitizePresetConfig", startModel.sanitizePresetConfig);
    assignFn(options, "sanitizePostflopBetPercents", startModel.sanitizePostflopBetPercents);
    assignFn(options, "saveSettings", sessionBridge.saveSettings);
    assignFn(options, "resetAllTables", runtimeBridge.resetAllTables);
    assignFn(options, "clearAutoDealQueue", actionRuntime.clearAutoDealQueue);
    assignFn(options, "queueNextHandIfNeeded", actionRuntime.queueNextHandIfNeeded);
    assignFn(options, "saveSessionData", sessionBridge.saveSessionData);
    assignFn(options, "markAllTablesDirty", renderLoop.markAllTablesDirty);
    assignFn(options, "isBlindLevelsInput", startModel.isBlindLevelsInput);
    assignFn(options, "normalizeBlindLevelsInput", startModel.normalizeBlindLevelsInput);
    assignFn(options, "shouldNormalizeBlindLevelsOnInput", startModel.shouldNormalizeBlindLevelsOnInput);
    assignFn(options, "updateSimulationModePanels", runtimeBridge.updateSimulationModePanels);
    assignFn(options, "setValueIfChanged", domHelpers.setValueIfChanged);
    assignFn(options, "sanitizeSimulationMode", startModel.sanitizeSimulationMode);
    assignFn(options, "applySimulationSettings", runtimeBridge.applySimulationSettings);

    // Every function below is invoked unguarded by attach()/applySettingsFromControls();
    // a missing one is a real defect, not an optional capability. (Optional deps kept
    // fail-open: sanitizeLeaderboardFilters [typeof-guarded], resetEditingOpponentNote
    // [|| noop]; startPanelRuntime is a value dep wired via assignValue.)
    requireFns(options, [
      "dealNextAllTables", "setPaused", "getTable", "setActiveTable", "openOpponentNoteDialog",
      "render", "setFoldAnyQueue", "updateBetSliderByStep", "updateBetSlider", "isAmountModeToggleTarget",
      "togglePause", "replaceTable", "restartTournament", "showReplay", "historyEntryForTable",
      "needsBetAmount", "readBetAmount", "handleHeroAction", "syncTableCount", "switchSimulationMode",
      "switchStatsScope", "syncStatsScopeButtons", "renderBotLabOutput", "renderImportStatus", "showAnalytics",
      "showLeaderboard", "saveLeaderboardProfileName", "startLeaderboardSignIn", "deleteCurrentLeaderboardEntry",
      "replayEntries", "setReplayIndex", "toggleReplayAutoplay", "handleReplayKeydown", "stopReplayAutoplay",
      "refreshCurrentLeaderboardEntry", "renderLeaderboardBody", "runBotLabSample", "saveOpponentNoteFromDialog",
      "clearOpponentNoteFromDialog", "exportSessionHistory", "exportHandLogJsonl", "exportSessionArchive",
      "importSessionHistoryFile", "shouldIgnoreHotkey", "triggerHotkey", "resetCurrentSession", "sanitizePlayerCount",
      "simulationSettingsFromGroup", "simulationControlGroups", "sanitizePresetConfig", "sanitizePostflopBetPercents",
      "saveSettings", "resetAllTables", "clearAutoDealQueue", "queueNextHandIfNeeded", "saveSessionData",
      "markAllTablesDirty", "isBlindLevelsInput", "normalizeBlindLevelsInput",
      "shouldNormalizeBlindLevelsOnInput", "updateSimulationModePanels", "setValueIfChanged"
    ], "event-wiring");

    const windowRef = options.windowRef || root;
    const documentRef = options.documentRef || windowRef.document;
    const getState = typeof options.getState === "function" ? options.getState : () => ({ settings: {}, tables: [] });
    const engine = options.engine || {};
    const controls = options.controls || {};
    const uiScaleValues = new Set(["auto", "compact", "standard", "large", "xl"]);

    function sanitizeUiScale(value) {
      const normalized = String(value || "auto").trim().toLowerCase();
      return uiScaleValues.has(normalized) ? normalized : "auto";
    }

    function syncSettingsSelectButtons(selectId = "") {
      (Array.isArray(controls.settingsSelectButtons) ? controls.settingsSelectButtons : []).forEach((button) => {
        const buttonSelectId = String(button.dataset.settingsSelectButton || "");
        if (selectId && buttonSelectId !== selectId) return;
        const select = buttonSelectId ? documentRef?.getElementById?.(buttonSelectId) : null;
        const selected = Boolean(select && String(select.value) === String(button.dataset.settingsSelectValue || ""));
        button.setAttribute("aria-pressed", String(selected));
      });
    }

    // Stakes level drives composition; we also keep difficulty/lineup/pool in a
    // coherent fallback state so any legacy reader sees a sensible table.
    function stakesDerivedComposition(level) {
      if (level === "micro") return { difficulty: "easy", botLineup: "soft", botStrategyPool: "auto" };
      if (level === "high") return { difficulty: "pro", botLineup: "tough", botStrategyPool: "auto" };
      return { difficulty: "standard", botLineup: "mixed", botStrategyPool: "auto" };
    }

    function state() {
      return getState() || {};
    }

    function isServerMode() {
      const current = state();
      return Boolean(current.serverMode || current.settings?.serverMode);
    }

    function suppressServerModeLocalControl(event) {
      if (!isServerMode()) return false;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      return true;
    }

    function serverModeLocalOnly(fn) {
      return function localOnlyInServerMode(...args) {
        if (isServerMode()) return undefined;
        return fn.apply(this, args);
      };
    }

    // Table-count reduction with a live hand in progress. Reducing the count drops
    // the extra tables; if a dropped table still has a live hand, forfeiting it is
    // the anti-cheat contract (a losing hand cannot be wiped by closing its table).
    // So we confirm first, then reduce with { forfeitLiveHands: true }. A reduction
    // that keeps every live hand (forfeitCount 0) switches straight through.
    let pendingTableCountTarget = null;

    function requestTableCount(rawCount) {
      if (isServerMode()) {
        options.syncTableCount(rawCount, true);
        return;
      }
      const forfeitCount = Number(
        typeof options.pendingTableCountForfeit === "function" ? options.pendingTableCountForfeit(rawCount) : 0
      ) || 0;
      const confirmDialog = controls.tableCountConfirmDialog;
      if (forfeitCount > 0 && confirmDialog && typeof confirmDialog.showModal === "function") {
        const message = controls.tableCountConfirmMessage;
        if (message) {
          message.textContent = forfeitCount === 1
            ? "1 недоигранная раздача будет зафиксирована как проигранная. Продолжить?"
            : `${forfeitCount} недоигранные раздачи будут зафиксированы как проигранные. Продолжить?`;
        }
        pendingTableCountTarget = rawCount;
        confirmDialog.showModal();
        return;
      }
      options.syncTableCount(rawCount, true);
    }

    [
      "dealNextAllTables",
      "setPaused",
      "togglePause",
      "replaceTable",
      "restartTournament",
      "showReplay",
      "setFoldAnyQueue",
      "syncTableCount",
      "switchSimulationMode",
      "switchStatsScope",
      "showAnalytics",
      "showLeaderboard",
      "saveLeaderboardProfileName",
      "startLeaderboardSignIn",
      "deleteCurrentLeaderboardEntry",
      "runBotLabSample",
      "exportSessionHistory",
      "exportHandLogJsonl",
      "exportSessionArchive",
      "importSessionHistoryFile",
      "resetCurrentSession"
    ].forEach((key) => {
      if (typeof options[key] === "function") options[key] = serverModeLocalOnly(options[key]);
    });

    function applySettingsFromControls() {
      if (isServerMode()) return;
      const current = state();
      const previousPlayerCount = current.settings.playerCount;
      const previousStakes = current.settings.stakesLevel;
      const previousLineup = current.settings.botLineup;
      const previousDifficulty = current.settings.difficulty;
      const previousStrategyPool = current.settings.botStrategyPool;
      const previousBotPack = current.settings.botPack;
      const previousSimulation = {
        simulationMode: current.settings.simulationMode,
        randomStackMinBb: current.settings.randomStackMinBb,
        randomStackMaxBb: current.settings.randomStackMaxBb,
        tournamentStartingStackBb: current.settings.tournamentStartingStackBb,
        tournamentLevelHands: current.settings.tournamentLevelHands,
        tournamentBlindLevels: current.settings.tournamentBlindLevels
      };
      current.settings.pack = controls.packSelect.value;
      const stakesLevel = engine.normalizeStakesLevel?.(controls.stakesSelect?.value) || "";
      current.settings.stakesLevel = stakesLevel || current.settings.stakesLevel || "mid";
      const stakesDerived = stakesLevel ? stakesDerivedComposition(stakesLevel) : null;
      current.settings.difficulty = engine.normalizeDifficulty(stakesDerived?.difficulty ?? controls.difficultySelect.value);
      current.settings.botLineup = engine.normalizeBotLineup(stakesDerived?.botLineup ?? controls.lineupSelect.value);
      current.settings.botStrategyPool = engine.normalizeBotStrategyPool?.(stakesDerived?.botStrategyPool ?? controls.botStrategyPoolSelect.value) || "auto";
      current.settings.botPack = engine.normalizeBotPack?.(controls.botPackSelect?.value) || "hidden-archetypes";
      current.settings.playerCount = options.sanitizePlayerCount(controls.playerCountSelect.value);
      Object.assign(current.settings, options.simulationSettingsFromGroup(options.simulationControlGroups()[0]));
      current.settings.deck = controls.deckSelect.value;
      current.settings.chips = "black";
      syncSettingsSelectButtons();
      current.settings.uiScale = sanitizeUiScale(controls.uiScaleSelect?.value || current.settings.uiScale);
      current.settings.amountMode = controls.amountModeToggle.checked ? "chips" : "bb";
      current.settings.seatAvatars = controls.seatAvatarsToggle?.checked !== false;
      current.settings.sliderPresets = options.sanitizePresetConfig(controls.sliderPresetsInput.value);
      current.settings.postflopBetPercents = options.sanitizePostflopBetPercents(controls.postflopBetPercentsInput.value);
      current.settings.sound = controls.soundToggle.checked;
      current.settings.trainingMode = controls.trainingModeToggle.checked;
      current.settings.revealOpponentCardsOnFinish = controls.revealCardsToggle.checked;
      current.settings.lobbyEvents = controls.lobbyEventsToggle.checked;
      options.saveSettings();
      const simulationStructureChanged = Object.keys(previousSimulation).some((key) => String(previousSimulation[key]) !== String(current.settings[key]));
      if (previousPlayerCount !== current.settings.playerCount || previousStakes !== current.settings.stakesLevel || previousLineup !== current.settings.botLineup || previousDifficulty !== current.settings.difficulty || previousStrategyPool !== current.settings.botStrategyPool || previousBotPack !== current.settings.botPack || simulationStructureChanged) {
        options.resetAllTables({ start: current.started });
        return;
      }
      current.tables.forEach((table) => {
        if (current.settings.trainingMode) options.clearAutoDealQueue(table);
        else options.queueNextHandIfNeeded(table, { force: true });
      });
      options.saveSessionData();
      options.markAllTablesDirty();
      options.render("settings");
    }

    function replayEntryForButton(button) {
      return options.replayEntries().find((item) =>
        Number(item.no) === Number(button.dataset.replayHand)
        && Number(item.tableId) === Number(button.dataset.replayTable)
      );
    }

    function applySettingsSelectButton(button) {
      const selectId = String(button?.dataset?.settingsSelectButton || "");
      const select = selectId ? documentRef?.getElementById?.(selectId) : null;
      const value = String(button?.dataset?.settingsSelectValue || "");
      if (!select || !Array.from(select.options || []).some((option) => option.value === value)) return;
      options.setValueIfChanged(select, value);
      select.dispatchEvent(new windowRef.Event("change", { bubbles: true }));
      syncSettingsSelectButtons(selectId);
    }

    let activeSettingsTab = "main";
    const serverModeLocalTableActions = new Set(["new-table-hand", "restart-tournament", "replay-table-hand"]);

    function activateSettingsTab(tabKey, focus = false) {
      const buttons = Array.isArray(controls.settingsTabButtons) ? controls.settingsTabButtons : [];
      const panels = Array.isArray(controls.settingsTabPanels) ? controls.settingsTabPanels : [];
      const nextKey = buttons.some((button) => button.dataset.settingsTab === tabKey) ? tabKey : "main";
      activeSettingsTab = nextKey;
      buttons.forEach((button) => {
        const selected = button.dataset.settingsTab === nextKey;
        button.setAttribute("aria-selected", selected ? "true" : "false");
        button.tabIndex = selected ? 0 : -1;
        if (selected && focus) button.focus();
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.settingsTabPanel !== nextKey;
      });
    }

    function moveSettingsTab(currentButton, direction) {
      const buttons = Array.isArray(controls.settingsTabButtons) ? controls.settingsTabButtons : [];
      const index = buttons.indexOf(currentButton);
      if (index < 0 || !buttons.length) return;
      const nextIndex = (index + direction + buttons.length) % buttons.length;
      activateSettingsTab(buttons[nextIndex].dataset.settingsTab, true);
    }

    function handleSettingsTabKeydown(event) {
      const key = event.key;
      if (key === "ArrowDown" || key === "ArrowRight") {
        event.preventDefault();
        moveSettingsTab(event.currentTarget, 1);
      } else if (key === "ArrowUp" || key === "ArrowLeft") {
        event.preventDefault();
        moveSettingsTab(event.currentTarget, -1);
      } else if (key === "Home") {
        event.preventDefault();
        const first = controls.settingsTabButtons?.[0];
        if (first) activateSettingsTab(first.dataset.settingsTab, true);
      } else if (key === "End") {
        event.preventDefault();
        const buttons = controls.settingsTabButtons || [];
        const last = buttons[buttons.length - 1];
        if (last) activateSettingsTab(last.dataset.settingsTab, true);
      }
    }

    function attach() {
      controls.tableGrid.addEventListener("click", (event) => {
        const stepButton = event.target.closest("[data-bet-step]");
        const preset = event.target.closest("[data-bet-preset]");
        const noteButton = event.target.closest("[data-opponent-note-key]");
        const button = event.target.closest("[data-action]");
        if (isServerMode() && event.target.closest("[data-start-panel]")) {
          suppressServerModeLocalControl(event);
          return;
        }
        if (options.startPanelRuntime.handleClick(event)) return;
        if (button?.dataset.action === "start-simulator" && suppressServerModeLocalControl(event)) return;
        if (button?.dataset.action === "start-simulator") {
          options.dealNextAllTables();
          return;
        }
        if (button?.dataset.action === "resume-simulator" && suppressServerModeLocalControl(event)) return;
        if (button?.dataset.action === "resume-simulator") {
          options.setPaused(false);
          return;
        }
        const shell = event.target.closest("[data-table-id]");
        if (!shell) return;
        options.setActiveTable(shell.dataset.tableId);

        if (noteButton) {
          event.preventDefault();
          const table = options.getTable(shell.dataset.tableId);
          const seat = table?.seats?.find((candidate) => Number(candidate.id) === Number(noteButton.dataset.opponentNoteSeat));
          options.openOpponentNoteDialog(table, seat);
          options.render("opponent-note-open");
          return;
        }

        if (event.target.closest("[data-fold-any-control]")) {
          event.preventDefault();
          if (isServerMode()) return;
          const table = options.getTable(shell.dataset.tableId);
          options.setFoldAnyQueue(table, !table?.foldAnyQueued);
          return;
        }

        if (stepButton) {
          options.updateBetSliderByStep(shell, stepButton.dataset.betStep);
          return;
        }

        if (preset) {
          options.updateBetSlider(shell, preset.dataset.betPreset);
          return;
        }

        if (!button) {
          if (event.target.closest("[data-bet-widget]")) return;
          if (options.isAmountModeToggleTarget(event.target)) return;
          options.render("select-table");
          return;
        }

        const current = state();
        const table = options.getTable(shell.dataset.tableId);
        const action = button.dataset.action;
        if (serverModeLocalTableActions.has(action) && suppressServerModeLocalControl(event)) return;
        if (action === "new-table-hand") {
          options.replaceTable(table?.id ?? current.activeTableId);
          return;
        }
        if (action === "restart-tournament") {
          options.restartTournament(table?.id || current.activeTableId);
          return;
        }
        if (action === "replay-table-hand") {
          // Per-table replay: scope the dialog to THIS table before opening;
          // without a snapshot for the current hand fall back to the table's
          // latest finished hand (showReplay resolves it from the scope).
          current.replayScopeTableId = Number(table?.id ?? current.activeTableId ?? 1);
          const tableEntry = options.historyEntryForTable(table);
          if (tableEntry) {
            options.showReplay(tableEntry);
          } else {
            options.showReplay();
          }
          return;
        }
        const amount = options.needsBetAmount(action) ? options.readBetAmount(shell, table) : undefined;
        options.handleHeroAction(table, action, amount);
      });

      controls.tableGrid.addEventListener("change", (event) => {
        if (isServerMode() && event.target.closest("[data-start-panel]")) {
          suppressServerModeLocalControl(event);
          return;
        }
        if (options.startPanelRuntime.handleChange(event)) return;
        if (!event.target.matches("[data-fold-any]")) return;
        if (suppressServerModeLocalControl(event)) return;
        const shell = event.target.closest("[data-table-id]");
        if (!shell) return;
        const table = options.getTable(shell.dataset.tableId);
        options.setActiveTable(shell.dataset.tableId);
        options.setFoldAnyQueue(table, event.target.checked);
      });

      controls.tableGrid.addEventListener("input", (event) => {
        if (isServerMode() && event.target.closest("[data-start-panel]")) {
          suppressServerModeLocalControl(event);
          return;
        }
        if (options.startPanelRuntime.handleInput(event)) return;
        if (!event.target.matches("[data-bet-slider]")) return;
        const shell = event.target.closest("[data-table-id]");
        if (!shell) return;
        // A slider drag must make its table the active one (mirrors the click and
        // fold-any change handlers) — otherwise a held/repeated drag mutates a
        // table that is not the focused/active one.
        options.setActiveTable(shell.dataset.tableId);
        options.updateBetSlider(shell, event.target.value);
      });

      controls.tableGrid.addEventListener("focusout", (event) => {
        if (isServerMode() && event.target.closest("[data-start-panel]")) return;
        options.startPanelRuntime.handleFocusout(event);
      });

      controls.countButtons.forEach((button) => {
        button.addEventListener("click", () => requestTableCount(button.dataset.tableCount));
      });
      if (controls.tableCountConfirmDialog && typeof controls.tableCountConfirmDialog.addEventListener === "function") {
        controls.tableCountConfirmDialog.addEventListener("close", () => {
          const dialog = controls.tableCountConfirmDialog;
          const accepted = dialog?.returnValue === "confirm";
          const target = pendingTableCountTarget;
          pendingTableCountTarget = null;
          // Reset so a later ESC-close (empty returnValue) can't replay a stale confirm.
          if (dialog) dialog.returnValue = "";
          if (accepted && target != null) {
            options.syncTableCount(target, true, { forfeitLiveHands: true });
          }
        });
      }
      (Array.isArray(controls.settingsSelectButtons) ? controls.settingsSelectButtons : []).forEach((button) => {
        button.addEventListener("click", () => applySettingsSelectButton(button));
      });
      (Array.isArray(controls.settingsTabButtons) ? controls.settingsTabButtons : []).forEach((button) => {
        button.addEventListener("click", () => activateSettingsTab(button.dataset.settingsTab));
        button.addEventListener("keydown", handleSettingsTabKeydown);
      });
      activateSettingsTab(activeSettingsTab);
      controls.simulationModeButtons.forEach((button) => {
        button.addEventListener("click", () => options.switchSimulationMode(button.dataset.simulationModeButton));
      });
      controls.statsScopeButtons.forEach((button) => {
        button.addEventListener("click", () => options.switchStatsScope(button.dataset.statsScopeButton));
      });
      options.syncStatsScopeButtons();

      controls.settingsButton.addEventListener("click", (event) => {
        if (suppressServerModeLocalControl(event)) return;
        options.renderBotLabOutput();
        options.renderImportStatus();
        activateSettingsTab(activeSettingsTab);
        controls.settingsDialog.showModal();
      });
      controls.analyticsButton.addEventListener("click", options.showAnalytics);
      controls.leaderboardButton.addEventListener("click", options.showLeaderboard);
      controls.leaderboardBody.addEventListener("click", (event) => {
        if (event.target.closest("[data-leaderboard-save-name]")) {
          options.saveLeaderboardProfileName();
          return;
        }
        if (event.target.closest("[data-leaderboard-auth-start]")) {
          options.startLeaderboardSignIn();
          return;
        }
        if (event.target.closest("[data-leaderboard-delete-current]")) {
          options.deleteCurrentLeaderboardEntry();
          return;
        }
        const filterChip = event.target.closest("[data-lb-filter]");
        if (filterChip) {
          const current = state();
          const group = String(filterChip.dataset.lbFilter || "");
          const next = {
            ...(current.leaderboardFilters && typeof current.leaderboardFilters === "object" ? current.leaderboardFilters : {}),
            [group]: String(filterChip.dataset.lbValue || "all")
          };
          current.leaderboardFilters = typeof options.sanitizeLeaderboardFilters === "function"
            ? options.sanitizeLeaderboardFilters(next)
            : next;
          options.renderLeaderboardBody();
        }
      });
      controls.leaderboardBody.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && event.target.closest("[data-leaderboard-name-input]")) {
          event.preventDefault();
          options.saveLeaderboardProfileName();
        }
        if (event.key === "Enter" && event.target.closest("[data-lb-search]")) {
          event.preventDefault();
          event.target.blur();
        }
      });
      // Live search: commit the query as the user types (debounced) so the
      // list filters immediately; renderLeaderboardBody preserves the focused
      // input's value/caret across the rebuild. The change handler below stays
      // as the blur-time commit for browsers that skip input events (autofill).
      let leaderboardSearchDebounce = 0;
      const commitLeaderboardSearch = (value) => {
        const current = state();
        const next = {
          ...(current.leaderboardFilters && typeof current.leaderboardFilters === "object" ? current.leaderboardFilters : {}),
          query: String(value || "")
        };
        current.leaderboardFilters = typeof options.sanitizeLeaderboardFilters === "function"
          ? options.sanitizeLeaderboardFilters(next)
          : next;
        options.renderLeaderboardBody();
      };
      controls.leaderboardBody.addEventListener("input", (event) => {
        const searchInput = event.target.closest("[data-lb-search]");
        if (!searchInput) return;
        const value = String(searchInput.value || "");
        windowRef.clearTimeout(leaderboardSearchDebounce);
        leaderboardSearchDebounce = windowRef.setTimeout(() => commitLeaderboardSearch(value), 180);
      });
      controls.leaderboardBody.addEventListener("change", (event) => {
        const graphPeriodSelect = event.target.closest("[data-lb-graph-period]");
        if (graphPeriodSelect) {
          const current = state();
          const value = String(graphPeriodSelect.value || "");
          current.leaderboardGraphPeriod = ["today", "7d", "30d", "season", "all"].includes(value) ? value : "season";
          options.renderLeaderboardBody();
          return;
        }
        const searchInput = event.target.closest("[data-lb-search]");
        if (!searchInput) return;
        windowRef.clearTimeout(leaderboardSearchDebounce);
        commitLeaderboardSearch(searchInput.value);
      });
      controls.replayDialog.addEventListener("click", (event) => {
        const handButton = event.target.closest("[data-replay-hand]");
        if (handButton) {
          const entry = replayEntryForButton(handButton);
          if (entry) options.showReplay(entry);
          return;
        }
        const navButton = event.target.closest("[data-replay-nav]");
        const current = state();
        if (!current.replayHand || !navButton) return;
        if (navButton.dataset.replayNav === "prev") {
          options.setReplayIndex(current.replayIndex - 1);
        } else if (navButton.dataset.replayNav === "play") {
          options.toggleReplayAutoplay();
        } else if (navButton.dataset.replayNav === "next") {
          options.setReplayIndex(current.replayIndex + 1);
        }
      });
      controls.replayDialog.addEventListener("keydown", options.handleReplayKeydown);
      controls.replayDialog.addEventListener("close", () => options.stopReplayAutoplay(false));
      windowRef.addEventListener("ff-player-progress:profile", () => {
        options.refreshCurrentLeaderboardEntry();
        if (controls.leaderboardDialog.open) options.renderLeaderboardBody();
      });
      controls.historyStrip.addEventListener("click", (event) => {
        const button = event.target.closest("[data-replay-hand]");
        if (!button) return;
        // Only open the replay when the button's hand is still in the entries; a
        // stale/not-found button must not silently fall back to the FIRST hand
        // (showReplay() with no entry resolves to the default).
        const entry = replayEntryForButton(button);
        if (!entry) return;
        options.showReplay(entry);
      });
      controls.dealAllButton.addEventListener("click", options.dealNextAllTables);
      controls.pauseButton.addEventListener("click", options.togglePause);
      controls.settingsNewHandButton.addEventListener("click", options.dealNextAllTables);
      controls.botLabButton.addEventListener("click", options.runBotLabSample);
      controls.opponentNoteSaveButton?.addEventListener("click", options.saveOpponentNoteFromDialog);
      controls.opponentNoteClearButton?.addEventListener("click", options.clearOpponentNoteFromDialog);
      controls.opponentNoteDialog?.addEventListener("close", options.resetEditingOpponentNote || noop);
      controls.exportHistoryButton.addEventListener("click", options.exportSessionHistory);
      controls.exportHandLogButton.addEventListener("click", options.exportHandLogJsonl);
      controls.exportSessionArchiveButton.addEventListener("click", options.exportSessionArchive);
      controls.importHistoryButton.addEventListener("click", () => controls.importHistoryInput.click());
      controls.importHistoryInput.addEventListener("change", () => options.importSessionHistoryFile(controls.importHistoryInput.files?.[0]));
      documentRef.addEventListener("keydown", (event) => {
        if (options.shouldIgnoreHotkey(event)) return;
        const action = options.triggerHotkey(event.key);
        if (!action) return;
        event.preventDefault();
      });
      controls.resetSessionButton.addEventListener("click", options.resetCurrentSession);

      const settingsControls = [
        controls.packSelect,
        controls.stakesSelect,
        controls.botPackSelect,
        controls.difficultySelect,
        controls.lineupSelect,
        controls.botStrategyPoolSelect,
        controls.playerCountSelect,
        controls.simulationModeSelect,
        controls.randomStackMinInput,
        controls.randomStackMaxInput,
        controls.tournamentStartingStackInput,
        controls.tournamentLevelHandsInput,
        controls.tournamentBlindLevelsInput,
        controls.actionTimerSecondsInput,
        controls.deckSelect,
        controls.uiScaleSelect,
        controls.amountModeToggle,
        controls.seatAvatarsToggle,
        controls.sliderPresetsInput,
        controls.postflopBetPercentsInput,
        controls.soundToggle,
        controls.trainingModeToggle,
        controls.revealCardsToggle,
        controls.lobbyEventsToggle
      ];
      settingsControls.forEach((control) => {
        if (control) control.addEventListener("change", applySettingsFromControls);
      });
      controls.settingsDialog.addEventListener("focusout", (event) => {
        if (!options.isBlindLevelsInput(event.target)) return;
        options.normalizeBlindLevelsInput(event.target, state().settings.tournamentBlindLevels);
        if (event.target === controls.tournamentBlindLevelsInput) applySettingsFromControls();
      });
      controls.settingsDialog.addEventListener("input", (event) => {
        if (!options.isBlindLevelsInput(event.target) || !options.shouldNormalizeBlindLevelsOnInput(event.target)) return;
        options.normalizeBlindLevelsInput(event.target, state().settings.tournamentBlindLevels);
      });
      controls.simulationModeSelect.addEventListener("change", () => options.updateSimulationModePanels(options.simulationControlGroups()[0]));
      controls.settingsDialog.addEventListener("close", applySettingsFromControls);
    }

    return { attach, applySettingsFromControls };
  }

  root.PokerSimulatorEventWiring = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorEventWiring;
})();
