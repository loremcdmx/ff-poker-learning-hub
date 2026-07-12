(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function model(options = {}) {
    const engine = options.engine || {};
    const opponentsKit = options.opponentsKit || {};
    const botLabKit = options.botLabKit || {};
    const saveOpponentModel = typeof options.saveOpponentModel === "function" ? options.saveOpponentModel : noop;
    const setHtmlIfChanged = typeof options.setHtmlIfChanged === "function" ? options.setHtmlIfChanged : noop;
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : (value) => String(value ?? "");
    const getState = getter(options.getState);
    const getBotLabOutput = getter(options.getBotLabOutput);
    const getTableLifecycle = getter(options.getTableLifecycle);
    const getSimulationControls = getter(options.getSimulationControls);
    const getShellControls = getter(options.getShellControls);
    const getSimulationRuntime = getter(options.getSimulationRuntime);
    const getRenderRuntime = getter(options.getRenderRuntime);
    const getFoldAnyModel = getter(options.getFoldAnyModel);
    const getTelemetryModel = getter(options.getTelemetryModel);
    const getReplayController = getter(options.getReplayController);
    const getBotLabRuntime = getter(options.getBotLabRuntime);
    const getAnalyticsDialogs = getter(options.getAnalyticsDialogs);
    const getAnalyticsUi = getter(options.getAnalyticsUi);
    const getOpponentNotesUi = getter(options.getOpponentNotesUi);
    const getHeroActionRuntime = getter(options.getHeroActionRuntime);
    const getBotResponseRuntime = getter(options.getBotResponseRuntime);
    const getHotkeysRuntime = getter(options.getHotkeysRuntime);
    const getSessionExport = getter(options.getSessionExport);
    const getSessionRuntime = getter(options.getSessionRuntime);
    const getHeroTurnAnnouncements = getter(options.getHeroTurnAnnouncements);
    const getAudio = getter(options.getAudio);

    function getter(candidate) {
      return typeof candidate === "function" ? candidate : () => null;
    }

    function state() {
      try {
        return getState() || {};
      } catch {
        return {};
      }
    }

    function target(getTarget) {
      try {
        return getTarget() || {};
      } catch {
        return {};
      }
    }

    function nullableTarget(getTarget) {
      try {
        return getTarget() || null;
      } catch {
        return null;
      }
    }

    function invoke(getTarget, method, fallback, args) {
      const modelRef = target(getTarget);
      const fn = modelRef && modelRef[method];
      if (typeof fn === "function") return fn.apply(modelRef, Array.prototype.slice.call(args || []));
      return typeof fallback === "function" ? fallback.apply(null, Array.prototype.slice.call(args || [])) : fallback;
    }

    function bind(getTarget, method, fallback) {
      return function boundRuntimeBridgeMethod() {
        return invoke(getTarget, method, fallback, arguments);
      };
    }

    function getTableFallback(tableId) {
      return (Array.isArray(state().tables) ? state().tables : [])
        .find((table) => Number(table?.id) === Number(tableId)) || null;
    }

    function tableUsesTournamentFallback(table = null) {
      const current = state();
      return String(table?.simulationMode || current.settings?.simulationMode || "").toLowerCase() === "tournament";
    }

    function addSimulatorErrorCountFallback(counts, tag, count = 1) {
      const key = String(tag || "").trim();
      const amount = Math.max(0, Number(count || 0));
      if (!counts || !key || !amount) return counts;
      counts[key] = (counts[key] || 0) + amount;
      return counts;
    }

    function applyOpponentLearningToTable(table) {
      return typeof opponentsKit.applyOpponentLearningToTable === "function"
        ? opponentsKit.applyOpponentLearningToTable(table, state().opponentModel)
        : table;
    }

    function recordOpponentLearning(entry) {
      if (typeof opponentsKit.recordOpponentLearning !== "function") return;
      const current = state();
      const nextModel = opponentsKit.recordOpponentLearning(current.opponentModel, entry);
      if (nextModel === current.opponentModel) return;
      current.opponentModel = nextModel;
      saveOpponentModel();
    }

    function renderBotLabOutput() {
      if (typeof botLabKit.renderOutputHtml !== "function") return;
      setHtmlIfChanged(nullableTarget(getBotLabOutput), botLabKit.renderOutputHtml(state().botLab, { escapeHtml }));
    }

    return {
      packUsesScriptedStreet: bind(getTableLifecycle, "packUsesScriptedStreet", false),
      tableUsesTournamentMode: bind(getTableLifecycle, "tableUsesTournamentMode", tableUsesTournamentFallback),
      heroBustedRestartLabel: bind(getTableLifecycle, "heroBustedRestartLabel", "Restart"),
      heroBustedRestartAction: bind(getTableLifecycle, "heroBustedRestartAction", "restart-tournament"),
      createTable: bind(getTableLifecycle, "createTable", null),
      syncTableCount: bind(getTableLifecycle, "syncTableCount", noop),
      pendingTableCountForfeit: bind(getTableLifecycle, "pendingTableCountForfeit", 0),
      resetAllTables: bind(getTableLifecycle, "resetAllTables", noop),
      dealNextAllTables: bind(getTableLifecycle, "dealNextAllTables", noop),
      restartTournament: bind(getTableLifecycle, "restartTournament", noop),
      replaceTable: bind(getTableLifecycle, "replaceTable", noop),
      queueAutoDealForBornTerminalTables: bind(getTableLifecycle, "queueAutoDealForBornTerminalTables", noop),
      getTable: bind(getTableLifecycle, "getTable", getTableFallback),

      simulationControlGroups: bind(getSimulationControls, "simulationControlGroups", () => []),
      syncSimulationControls: bind(getSimulationControls, "syncSimulationControls", noop),
      updateSimulationModePanels: bind(getSimulationControls, "updateSimulationModePanels", noop),
      switchSimulationMode: bind(getSimulationControls, "switchSimulationMode", noop),
      simulationSettingsFromGroup: bind(getSimulationControls, "simulationSettingsFromGroup", () => ({})),
      syncStatsScopeButtons: bind(getShellControls, "syncStatsScopeButtons", noop),
      switchStatsScope: bind(getShellControls, "switchStatsScope", noop),
      applySimulationSettings: bind(getSimulationRuntime, "applySimulationSettings", noop),
      renderNow: bind(getRenderRuntime, "renderNow", noop),
      renderTables: bind(getRenderRuntime, "renderTables", noop),
      renderStartPanel: bind(getRenderRuntime, "renderStartPanel", noop),
      syncPauseOverlay: bind(getRenderRuntime, "syncPauseOverlay", noop),

      foldAnyWaitingState: bind(getFoldAnyModel, "foldAnyWaitingState", null),
      foldAnySituation: bind(getFoldAnyModel, "foldAnySituation", null),
      recordFoldAnyEvent: bind(getFoldAnyModel, "recordFoldAnyEvent", noop),
      clearFoldAnyQueue: bind(getFoldAnyModel, "clearFoldAnyQueue", noop),
      canQueueFoldAny: bind(getFoldAnyModel, "canQueueFoldAny", false),
      setFoldAnyQueue: bind(getFoldAnyModel, "setFoldAnyQueue", noop),
      applyFoldAnyIfReady: bind(getFoldAnyModel, "applyFoldAnyIfReady", false),

      simulatorTrainerMeta: bind(getTelemetryModel, "simulatorTrainerMeta", () => ({ key: "simulator" })),
      sendSimulatorTelemetry: bind(getTelemetryModel, "sendSimulatorTelemetry", null),
      feedbackCorrectness: bind(getTelemetryModel, "feedbackCorrectness", null),
      normalizeSimulatorErrorTag: bind(getTelemetryModel, "normalizeSimulatorErrorTag", (value) => String(value || "strategy")),
      addSimulatorErrorCount: bind(getTelemetryModel, "addSimulatorErrorCount", addSimulatorErrorCountFallback),
      simulatorErrorCounts: bind(getTelemetryModel, "simulatorErrorCounts", () => ({})),
      simulatorWeakErrorTags: bind(getTelemetryModel, "simulatorWeakErrorTags", () => []),
      simulatorRepeatHref: bind(getTelemetryModel, "simulatorRepeatHref", "poker-simulator.html"),
      buildSimulatorReviewRoutes: bind(getTelemetryModel, "buildSimulatorReviewRoutes", () => []),
      sendSimulatorDecisionTelemetry: bind(getTelemetryModel, "sendSimulatorDecisionTelemetry", null),
      simulatorProgressResult: bind(getTelemetryModel, "simulatorProgressResult", () => ({ status: "in_progress" })),
      sendSimulatorSessionTelemetry: bind(getTelemetryModel, "sendSimulatorSessionTelemetry", null),

      showReplay: bind(getReplayController, "showReplay", noop),
      renderReplayDialog: bind(getReplayController, "renderReplayDialog", noop),
      startReplayAutoplay: bind(getReplayController, "startReplayAutoplay", noop),
      stopReplayAutoplay: bind(getReplayController, "stopReplayAutoplay", noop),
      setReplayIndex: bind(getReplayController, "setReplayIndex", noop),
      toggleReplayAutoplay: bind(getReplayController, "toggleReplayAutoplay", noop),
      handleReplayKeydown: bind(getReplayController, "handleReplayKeydown", noop),

      runBotLabSample: bind(getBotLabRuntime, "runBotLabSample", noop),
      botLabBandSettings: bind(getBotLabRuntime, "botLabBandSettings", () => ({})),
      renderBotLabOutput,
      renderImportStatus: bind(getAnalyticsDialogs, "renderImportStatus", noop),
      showAnalytics: bind(getAnalyticsDialogs, "showAnalytics", noop),
      showLeaderboard: bind(getAnalyticsDialogs, "showLeaderboard", noop),
      saveLeaderboardProfileName: bind(getAnalyticsDialogs, "saveLeaderboardProfileName", noop),
      startLeaderboardSignIn: bind(getAnalyticsDialogs, "startLeaderboardSignIn", noop),
      deleteCurrentLeaderboardEntry: bind(getAnalyticsDialogs, "deleteCurrentLeaderboardEntry", noop),
      renderLeaderboardBody: bind(getAnalyticsDialogs, "renderLeaderboardBody", noop),
      renderLeaderboard: bind(getAnalyticsDialogs, "renderLeaderboard", noop),
      renderAnalytics: bind(getAnalyticsUi, "renderAnalytics", noop),

      opponentNoteForSeat: bind(getOpponentNotesUi, "opponentNoteForSeat", null),
      renderOpponentNoteButton: bind(getOpponentNotesUi, "renderOpponentNoteButton", ""),
      openOpponentNoteDialog: bind(getOpponentNotesUi, "openOpponentNoteDialog", noop),
      saveOpponentNoteFromDialog: bind(getOpponentNotesUi, "saveOpponentNoteFromDialog", noop),
      clearOpponentNoteFromDialog: bind(getOpponentNotesUi, "clearOpponentNoteFromDialog", noop),

      handleHeroAction: bind(getHeroActionRuntime, "handleHeroAction", noop),
      runBotResponse: bind(getBotResponseRuntime, "runBotResponse", noop),
      hotkeyActionForTable: bind(getHotkeysRuntime, "hotkeyActionForTable", null),
      shouldIgnoreHotkey: bind(getHotkeysRuntime, "shouldIgnoreHotkey", false),
      triggerHotkey: bind(getHotkeysRuntime, "triggerHotkey", null),

      sessionSnapshot: bind(getSessionExport, "sessionSnapshot", () => ({})),
      exportSessionHistory: bind(getSessionExport, "exportSessionHistory", noop),
      exportHandLogJsonl: bind(getSessionExport, "exportHandLogJsonl", noop),
      resetCurrentSession: bind(getSessionRuntime, "resetCurrentSession", noop),
      importSessionHistoryFile: bind(getSessionRuntime, "importSessionHistoryFile", noop),
      applyOpponentLearningToTable,
      recordOpponentLearning,
      difficultyLabel: (value) => typeof engine.difficultyLabel === "function" ? engine.difficultyLabel(value) : String(value || ""),
      streetLabel: (street) => typeof engine.streetLabel === "function" ? engine.streetLabel(street) : String(street || ""),
      announceHeroTurnForActiveTable: bind(getHeroTurnAnnouncements, "announceHeroTurnForActiveTable", noop),
      playTone: bind(getAudio, "playTone", noop)
    };
  }

  root.PokerSimulatorRuntimeBridge = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorRuntimeBridge;
})();
