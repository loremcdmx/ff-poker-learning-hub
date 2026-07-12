(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function query(documentRef = root.document) {
    const control = {
      tableGrid: one(documentRef, "#table-grid"),
      sessionSubtitle: one(documentRef, "#session-subtitle"),
      settingsDialog: one(documentRef, "#settings-dialog"),
      replayDialog: one(documentRef, "#replay-dialog"),
      analyticsDialog: one(documentRef, "#analytics-dialog"),
      leaderboardDialog: one(documentRef, "#leaderboard-dialog"),
      opponentNoteDialog: one(documentRef, "#opponent-note-dialog"),
      opponentNoteTitle: one(documentRef, "#opponent-note-title"),
      opponentNoteSubtitle: one(documentRef, "#opponent-note-subtitle"),
      opponentNoteTagSelect: one(documentRef, "#opponent-note-tag"),
      opponentNoteTextInput: one(documentRef, "#opponent-note-text"),
      opponentNoteSaveButton: one(documentRef, "#opponent-note-save-button"),
      opponentNoteClearButton: one(documentRef, "#opponent-note-clear-button"),
      botInspectorDialog: one(documentRef, "#bot-inspector-dialog"),
      botInspectorTitle: one(documentRef, "#bot-inspector-title"),
      botInspectorBody: one(documentRef, "#bot-inspector-body"),
      tableCountConfirmDialog: one(documentRef, "#table-count-confirm-dialog"),
      tableCountConfirmMessage: one(documentRef, "#table-count-confirm-message"),
      countButtons: all(documentRef, "[data-table-count]"),
      settingsButton: one(documentRef, "#settings-button"),
      settingsTabButtons: all(documentRef, "[data-settings-tab]"),
      settingsTabPanels: all(documentRef, "[data-settings-tab-panel]"),
      analyticsButton: one(documentRef, "#analytics-button"),
      leaderboardButton: one(documentRef, "#leaderboard-button"),
      dealAllButton: one(documentRef, "#deal-all-button"),
      pauseButton: one(documentRef, "#pause-button"),
      resetSessionButton: one(documentRef, "#reset-session-button"),
      settingsNewHandButton: one(documentRef, "#settings-new-hand-button"),
      botLabButton: one(documentRef, "#bot-lab-button"),
      exportHistoryButton: one(documentRef, "#export-history-button"),
      exportHandLogButton: one(documentRef, "#export-hand-log-button"),
      exportSessionArchiveButton: one(documentRef, "#export-session-archive-button"),
      importHistoryButton: one(documentRef, "#import-history-button"),
      importHistoryInput: one(documentRef, "#import-history-input"),
      importHistoryStatus: one(documentRef, "#import-history-status"),
      botLabOutput: one(documentRef, "#bot-lab-output"),
      replayBody: one(documentRef, "#replay-body"),
      analyticsBody: one(documentRef, "#analytics-body"),
      leaderboardBody: one(documentRef, "#leaderboard-body"),
      packSelect: one(documentRef, "#pack-select"),
      stakesSelect: one(documentRef, "#stakes-select"),
      botPackSelect: one(documentRef, "#bot-pack-select"),
      difficultySelect: one(documentRef, "#difficulty-select"),
      lineupSelect: one(documentRef, "#lineup-select"),
      botStrategyPoolSelect: one(documentRef, "#bot-strategy-pool-select"),
      settingsSelectButtons: all(documentRef, "[data-settings-select-button]"),
      playerCountSelect: one(documentRef, "#player-count-select"),
      simulationModeSelect: one(documentRef, "#simulation-mode-select"),
      simulationModeButtons: all(documentRef, "[data-simulation-mode-button]"),
      randomStackMinInput: one(documentRef, "#random-stack-min-input"),
      randomStackMaxInput: one(documentRef, "#random-stack-max-input"),
      tournamentStartingStackInput: one(documentRef, "#tournament-starting-stack-input"),
      tournamentLevelHandsInput: one(documentRef, "#tournament-level-hands-input"),
      tournamentBlindLevelsInput: one(documentRef, "#tournament-blind-levels-input"),
      actionTimerSecondsInput: one(documentRef, "#action-timer-seconds-input"),
      deckSelect: one(documentRef, "#deck-select"),
      uiScaleSelect: one(documentRef, "#ui-scale-select"),
      amountModeToggle: one(documentRef, "#amount-mode-toggle"),
      seatAvatarsToggle: one(documentRef, "#seat-avatars-toggle"),
      sliderPresetsInput: one(documentRef, "#slider-presets-input"),
      postflopBetPercentsInput: one(documentRef, "#postflop-bet-percents-input"),
      soundToggle: one(documentRef, "#sound-toggle"),
      trainingModeToggle: one(documentRef, "#training-mode-toggle"),
      revealCardsToggle: one(documentRef, "#reveal-cards-toggle"),
      lobbyEventsToggle: one(documentRef, "#lobby-events-toggle"),
      statHands: one(documentRef, "#stat-hands"),
      statWins: one(documentRef, "#stat-wins"),
      statFolds: one(documentRef, "#stat-folds"),
      statShowdowns: one(documentRef, "#stat-showdowns"),
      statDecisions: one(documentRef, "#stat-decisions"),
      statAvgDecision: one(documentRef, "#stat-avg-decision"),
      statHandsHour: one(documentRef, "#stat-hands-hour"),
      statGood: one(documentRef, "#stat-good"),
      statAggression: one(documentRef, "#stat-aggression"),
      sessionHud: one(documentRef, "#session-hud"),
      sessionHudHands: one(documentRef, "#session-hud-hands"),
      sessionHudNetBb: one(documentRef, "#session-hud-net-bb"),
      sessionHudBb100: one(documentRef, "#session-hud-bb100"),
      sessionHudPersistence: one(documentRef, "#session-hud-persistence"),
      sessionHudVpip: one(documentRef, "#session-hud-vpip"),
      sessionHudPfr: one(documentRef, "#session-hud-pfr"),
      sessionHudThreeBet: one(documentRef, "#session-hud-three-bet"),
      sessionHudAvgDecision: one(documentRef, "#session-hud-avg-decision"),
      sessionHudHandsHour: one(documentRef, "#session-hud-hands-hour"),
      sessionHudMeterFill: one(documentRef, "#session-hud-meter-fill"),
      statsScopeButtons: all(documentRef, "[data-stats-scope-button]"),
      historyStrip: one(documentRef, "#history-strip"),
      decisionStrip: one(documentRef, "#decision-strip"),
      reviewStrip: one(documentRef, "#review-strip")
    };

    control.sessionHudControls = pick(control, [
      "statHands", "statWins", "statFolds", "statShowdowns", "statDecisions", "statAvgDecision",
      "statHandsHour", "statGood", "statAggression", "sessionHud", "sessionHudHands",
      "sessionHudNetBb", "sessionHudBb100", "sessionHudVpip", "sessionHudPfr", "sessionHudThreeBet",
      "sessionHudAvgDecision", "sessionHudHandsHour",
      "sessionHudMeterFill", "sessionHudPersistence",
      "historyStrip", "decisionStrip", "reviewStrip"
    ]);
    control.analyticsDialogs = pick(control, [
      "analyticsDialog", "analyticsBody", "leaderboardDialog", "leaderboardBody", "importHistoryStatus"
    ]);
    control.shellControls = pick(control, ["pauseButton", "dealAllButton", "statsScopeButtons"]);
    control.simulationControls = pick(control, [
      "simulationModeSelect", "simulationModeButtons", "randomStackMinInput", "randomStackMaxInput",
      "tournamentStartingStackInput", "tournamentLevelHandsInput", "tournamentBlindLevelsInput",
      "actionTimerSecondsInput"
    ]);
    control.opponentNotes = {
      dialog: control.opponentNoteDialog,
      title: control.opponentNoteTitle,
      subtitle: control.opponentNoteSubtitle,
      tagSelect: control.opponentNoteTagSelect,
      textInput: control.opponentNoteTextInput
    };
    control.botInspector = {
      dialog: control.botInspectorDialog,
      title: control.botInspectorTitle,
      body: control.botInspectorBody
    };
    control.hotkeyDialogs = {
      settings: control.settingsDialog,
      replay: control.replayDialog,
      analytics: control.analyticsDialog,
      leaderboard: control.leaderboardDialog,
      opponentNote: control.opponentNoteDialog
    };
    control.renderRuntime = pick(control, [
      "tableGrid", "sessionSubtitle", "countButtons", "packSelect", "stakesSelect", "difficultySelect", "lineupSelect",
      "botStrategyPoolSelect", "settingsSelectButtons", "playerCountSelect", "deckSelect", "uiScaleSelect", "amountModeToggle", "sliderPresetsInput",
      "postflopBetPercentsInput", "soundToggle", "trainingModeToggle",
      "seatAvatarsToggle", "revealCardsToggle", "lobbyEventsToggle", "settingsDialog", "leaderboardDialog"
    ]);
    control.eventWiring = pick(control, [
      "tableGrid", "settingsDialog", "leaderboardDialog", "leaderboardBody",
      "settingsTabButtons", "settingsTabPanels",
      "replayDialog", "historyStrip", "countButtons", "simulationModeButtons", "statsScopeButtons",
      "tableCountConfirmDialog", "tableCountConfirmMessage",
      "settingsButton", "analyticsButton", "leaderboardButton", "dealAllButton",
      "pauseButton", "settingsNewHandButton", "botLabButton", "opponentNoteSaveButton",
      "opponentNoteClearButton", "opponentNoteDialog", "exportHistoryButton", "exportHandLogButton",
      "exportSessionArchiveButton", "importHistoryButton", "importHistoryInput", "resetSessionButton",
      "packSelect", "stakesSelect", "difficultySelect", "lineupSelect", "botStrategyPoolSelect", "settingsSelectButtons", "playerCountSelect", "simulationModeSelect",
      "randomStackMinInput", "randomStackMaxInput", "tournamentStartingStackInput",
      "tournamentLevelHandsInput", "tournamentBlindLevelsInput", "actionTimerSecondsInput",
      "deckSelect", "uiScaleSelect", "amountModeToggle", "seatAvatarsToggle", "sliderPresetsInput", "postflopBetPercentsInput", "soundToggle",
      "trainingModeToggle", "revealCardsToggle", "lobbyEventsToggle"
    ]);
    return control;
  }

  function one(documentRef, selector) {
    return documentRef?.querySelector?.(selector) || null;
  }

  function all(documentRef, selector) {
    return Array.from(documentRef?.querySelectorAll?.(selector) || []);
  }

  function pick(source, keys) {
    return keys.reduce((result, key) => {
      result[key] = source[key];
      return result;
    }, {});
  }

  root.PokerSimulatorDomControls = { query };
  if (typeof module !== "undefined" && module.exports) module.exports = { query };
})();
