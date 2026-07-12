(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

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
  // fail-OPEN; requireFns asserts that the deps this hub forwards UNGUARDED into
  // its child models resolved to functions, so a renamed/unloaded producer
  // surfaces at boot naming THIS hub instead of feeding a child an undefined and
  // dying silently later. Only meaningful in a real DOM runtime — headless
  // source-contract harnesses load this hub with intentionally-partial mocks,
  // so skip when there is no document.
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
    const autoDealKit = options.autoDealKit || root.PokerSimulatorAutoDeal;
    const actionClockKit = options.actionClockKit || root.PokerSimulatorActionClock;
    const simulationRuntimeKit = options.simulationRuntimeKit || root.PokerSimulatorSimulationRuntime;
    const startKit = options.startKit || root.PokerSimulatorStart;
    const startRuntimeKit = options.startRuntimeKit || root.PokerSimulatorStartRuntime;
    const decisionLogKit = options.decisionLogKit || root.PokerSimulatorDecisionLog;
    const actionControlsKit = options.actionControlsKit || root.PokerSimulatorActionControls;
    const heroTurnLiveRegionKit = options.heroTurnLiveRegionKit || root.PokerSimulatorHeroTurnLiveRegion;
    const botResponseKit = options.botResponseKit || root.PokerSimulatorBotResponse;
    const botResponseRuntimeKit = options.botResponseRuntimeKit || root.PokerSimulatorBotResponseRuntime;
    const heroActionRuntimeKit = options.heroActionRuntimeKit || root.PokerSimulatorHeroActionRuntime;
    const hotkeysKit = options.hotkeysKit || root.PokerSimulatorHotkeys;
    const bettingKit = options.bettingKit || root.PokerSimulatorBetting || {};
    const runtimeBridge = options.runtimeBridge || {};
    const visualRuntime = options.visualRuntime || {};
    const actionBridge = options.actionBridge || {};
    const betModel = options.betModel || {};
    const historyBridge = options.historyBridge || {};
    const sessionBridge = options.sessionBridge || {};
    const renderLoop = options.renderLoop || {};
    const tableViewModel = options.tableViewModel || {};
    const timingConfig = options.timingConfig || {};
    const perfModel = options.perfModel || {};
    const domControls = options.domControls || {};
    const domHelpers = options.domHelpers || options.domPatch || {};
    const formatHelpers = options.formatHelpers || {};
    const runtimeRegistry = options.runtimeRegistry || {};
    const getState = typeof options.getState === "function" ? options.getState : () => ({ settings: {}, tables: [] });
    const registryDealAnimationActive = typeof runtimeRegistry.call === "function"
      ? runtimeRegistry.call("dealAnimationActive", () => false)
      : null;

    assignFn(options, "getTable", runtimeBridge.getTable);
    assignFn(options, "replaceTable", runtimeBridge.replaceTable);
    assignFn(options, "tableUsesTournamentMode", runtimeBridge.tableUsesTournamentMode);
    assignFn(options, "resetAllTables", runtimeBridge.resetAllTables);
    assignFn(options, "syncSimulationControls", runtimeBridge.syncSimulationControls);
    assignFn(options, "dealNextAllTables", runtimeBridge.dealNextAllTables);
    assignFn(options, "handleHeroAction", runtimeBridge.handleHeroAction);
    assignFn(options, "runBotResponse", runtimeBridge.runBotResponse);
    assignFn(options, "clearFoldAnyQueue", runtimeBridge.clearFoldAnyQueue);
    assignFn(options, "canQueueFoldAny", runtimeBridge.canQueueFoldAny);
    assignFn(options, "heroBustedRestartAction", runtimeBridge.heroBustedRestartAction);
    assignFn(options, "heroBustedRestartLabel", runtimeBridge.heroBustedRestartLabel);
    assignFn(options, "sendSimulatorDecisionTelemetry", runtimeBridge.sendSimulatorDecisionTelemetry);
    assignFn(options, "playTone", runtimeBridge.playTone);
    assignFn(options, "getActiveTable", () => runtimeBridge.getTable?.((getState() || {}).activeTableId));
    assignFn(options, "getTableCount", () => (getState() || {}).settings?.tableCount);

    assignFn(options, "isPaused", visualRuntime.isPaused);
    assignFn(options, "isActionSequenceActive", visualRuntime.isActionSequenceActive);
    assignFn(options, "actionRevealDuration", visualRuntime.actionRevealDuration);
    assignFn(options, "showdownAutoDealHoldMs", visualRuntime.showdownAutoDealHoldMs);
    assignFn(options, "dealAnimationActive", visualRuntime.dealAnimationActive || registryDealAnimationActive);
    assignFn(options, "isActionRevealLocked", visualRuntime.isActionRevealLocked);
    assignFn(options, "showdownTerminalControlsLocked", visualRuntime.showdownTerminalControlsLocked);
    assignFn(options, "tournamentFinishScreenVisible", visualRuntime.tournamentFinishScreenVisible);
    assignFn(options, "annotateActionAnimationMotion", visualRuntime.annotateActionAnimationMotion);
    assignFn(options, "primeActionReveal", visualRuntime.primeActionReveal);
    assignFn(options, "primeShowdownAnimation", visualRuntime.primeShowdownAnimation);
    assignFn(options, "captureVisualSeatState", visualRuntime.captureVisualSeatState);
    assignFn(options, "captureHeroActionAnimation", visualRuntime.captureHeroActionAnimation);
    assignFn(options, "retainBetAnimationsForActionSequence", visualRuntime.retainBetAnimationsForActionSequence);
    assignFn(options, "clearActionBubbleLatch", visualRuntime.clearActionBubbleLatch);

    assignFn(options, "canHeroAct", tableViewModel.canHeroAct);
    assignFn(options, "heroBusted", tableViewModel.heroBusted);
    assignFn(options, "heroIsAllIn", tableViewModel.heroIsAllIn);
    assignFn(options, "actionHint", tableViewModel.actionHint);

    assignFn(options, "needsBetAmount", actionBridge.needsBetAmount);
    assignFn(options, "effectiveHeroCallAmount", actionBridge.effectiveHeroCallAmount);
    assignFn(options, "heroFacesLoneOpponentAllIn", actionBridge.heroFacesLoneOpponentAllIn);
    assignFn(options, "heroFacingCallOnlyRaise", actionBridge.heroFacingCallOnlyRaise);
    assignFn(options, "heroCanShortAllIn", actionBridge.heroCanShortAllIn);
    assignFn(options, "isAggressiveHeroAction", actionBridge.isAggressiveHeroAction);
    assignFn(options, "readBetAmount", actionBridge.readBetAmount);

    assignFn(options, "betBounds", betModel.betBounds);
    assignFn(options, "betSliderModel", betModel.betSliderModel);
    assignFn(options, "betSliderFillPercent", betModel.betSliderFillPercent);
    assignFn(options, "betPresets", betModel.betPresets);
    assignFn(options, "amountFromBetSliderValue", betModel.amountFromBetSliderValue);
    assignFn(options, "sliderValuesMatch", betModel.sliderValuesMatch);
    assignFn(options, "preflopBetNudgeStep", betModel.preflopBetNudgeStep);
    assignFn(options, "formatPostflopSizing", betModel.formatPostflopSizing);
    assignFn(options, "formatBetSliderValue", betModel.formatBetSliderValue);
    assignFn(options, "formatBetActionAmount", betModel.formatBetActionAmount);
    assignFn(options, "clampPercentValue", bettingKit.clampPercentValue);
    assignFn(options, "clampBetValue", bettingKit.clampBetValue);

    assignFn(options, "finiteNumber", historyBridge.finiteNumber);
    assignFn(options, "sanitizeFoldAnyEvent", historyBridge.sanitizeFoldAnyEvent);
    assignFn(options, "maybeRecordHand", historyBridge.maybeRecordHand);
    assignFn(options, "saveSettings", sessionBridge.saveSettings);
    assignFn(options, "saveSessionData", sessionBridge.saveSessionData);
    assignFn(options, "markAllTablesDirty", renderLoop.markAllTablesDirty);
    assignFn(options, "render", renderLoop.render);
    assignFn(options, "markTableDirty", renderLoop.markTableDirty);
    assignFn(options, "setActiveTable", renderLoop.setActiveTable);
    assignFn(options, "addPerfCount", perfModel.addPerfCount);
    assignFn(options, "setAttributeIfChanged", domHelpers.setAttributeIfChanged);
    assignFn(options, "sanitizeInteger", options.startModel?.sanitizeInteger);

    assignValue(options, "countButtons", domControls.countButtons);
    assignValue(options, "hotkeyDialogs", domControls.hotkeyDialogs);
    assignValue(options, "defaultAutoDealDelayMs", timingConfig.defaultAutoDealDelayMs);
    assignValue(options, "turboAutoDealDelayMs", timingConfig.turboAutoDealDelayMs);
    assignValue(options, "escapeHtml", formatHelpers.escapeHtml);
    assignValue(options, "formatBb", formatHelpers.formatBb);
    assignValue(options, "formatAmount", formatHelpers.formatAmount);
    assignValue(options, "formatCompactAmount", formatHelpers.formatCompactAmount);

    // Every function below is forwarded UNGUARDED into a child model() call;
    // a missing one silently degrades that child. (getState is the only
    // optional dep — kept fail-open with a typeof-fallback above.)
    requireFns(options, [
      "getTable", "replaceTable", "tableUsesTournamentMode", "resetAllTables", "syncSimulationControls",
      "dealNextAllTables", "handleHeroAction", "runBotResponse", "clearFoldAnyQueue", "canQueueFoldAny",
      "heroBustedRestartAction", "heroBustedRestartLabel", "sendSimulatorDecisionTelemetry", "playTone",
      "getActiveTable", "getTableCount", "isPaused", "isActionSequenceActive", "actionRevealDuration",
      "showdownAutoDealHoldMs", "dealAnimationActive", "isActionRevealLocked", "showdownTerminalControlsLocked",
      "tournamentFinishScreenVisible", "annotateActionAnimationMotion", "primeActionReveal", "primeShowdownAnimation",
      "captureVisualSeatState", "captureHeroActionAnimation", "retainBetAnimationsForActionSequence", "clearActionBubbleLatch",
      "canHeroAct", "heroBusted", "heroIsAllIn", "actionHint",
      "needsBetAmount", "effectiveHeroCallAmount", "heroFacesLoneOpponentAllIn", "heroFacingCallOnlyRaise",
      "heroCanShortAllIn", "isAggressiveHeroAction", "readBetAmount", "betBounds", "betSliderModel",
      "betSliderFillPercent", "betPresets", "amountFromBetSliderValue", "sliderValuesMatch", "preflopBetNudgeStep",
      "formatPostflopSizing", "formatBetSliderValue", "formatBetActionAmount", "clampPercentValue", "clampBetValue",
      "finiteNumber", "sanitizeFoldAnyEvent", "maybeRecordHand", "saveSettings", "saveSessionData",
      "markAllTablesDirty", "render", "markTableDirty", "setActiveTable", "addPerfCount", "setAttributeIfChanged",
      "sanitizeInteger"
    ], "action-runtime-composition");

    const autoDealModel = autoDealKit.model({
      getState: options.getState,
      getTableGrid: options.getTableGrid,
      getTable: options.getTable,
      replaceTable: options.replaceTable,
      heroBusted: options.heroBusted,
      tableUsesTournamentMode: options.tableUsesTournamentMode,
      isPaused: options.isPaused,
      isActionSequenceActive: options.isActionSequenceActive,
      actionRevealDuration: options.actionRevealDuration,
      showdownAutoDealHoldMs: options.showdownAutoDealHoldMs,
      escapeHtml: options.escapeHtml,
      addPerfCount: options.addPerfCount,
      defaultAutoDealDelayMs: options.defaultAutoDealDelayMs,
      turboAutoDealDelayMs: options.turboAutoDealDelayMs
    });

    const actionClockModel = actionClockKit.model({
      getState: options.getState,
      getTableGrid: options.getTableGrid,
      getTable: options.getTable,
      canHeroAct: options.canHeroAct,
      isPaused: options.isPaused,
      sanitizeInteger: options.sanitizeInteger,
      escapeHtml: options.escapeHtml,
      handleHeroAction: options.handleHeroAction,
      addPerfCount: options.addPerfCount
    });

    const simulationRuntime = simulationRuntimeKit.model({
      getState: options.getState,
      saveSettings: options.saveSettings,
      syncSimulationControls: options.syncSimulationControls,
      saveSessionData: options.saveSessionData,
      resetAllTables: options.resetAllTables,
      prepareActionClocks: actionClockModel.prepareActionClocks,
      markAllTablesDirty: options.markAllTablesDirty,
      render: options.render
    });

    const startPanelRuntime = startRuntimeKit.model({
      startKit,
      startModel: options.startModel,
      getState: options.getState,
      saveSettings: options.saveSettings,
      syncSimulationControls: options.syncSimulationControls,
      countButtons: options.countButtons,
      decisionTimebankSeconds: actionClockModel.decisionTimebankSeconds,
      formatBb: options.formatBb,
      escapeHtml: options.escapeHtml,
      setAttributeIfChanged: options.setAttributeIfChanged,
      dealNextAllTables: options.dealNextAllTables
    });

    const decisionLog = decisionLogKit.model({
      engine: options.engine,
      getState: options.getState,
      saveSessionData: options.saveSessionData,
      captureDecisionTiming: actionClockModel.captureDecisionTiming,
      needsBetAmount: options.needsBetAmount,
      finiteNumber: options.finiteNumber,
      sanitizeFoldAnyEvent: options.sanitizeFoldAnyEvent,
      effectiveHeroCallAmount: options.effectiveHeroCallAmount,
      betBounds: options.betBounds,
      formatPostflopSizing: options.formatPostflopSizing,
      formatAmount: options.formatAmount,
      decisionTimebankSeconds: actionClockModel.decisionTimebankSeconds
    });

    const actionControls = actionControlsKit.model({
      windowRef: options.windowRef,
      getState: options.getState,
      getTable: options.getTable,
      escapeHtml: options.escapeHtml,
      isPaused: options.isPaused,
      renderHeroTimebank: actionClockModel.renderHeroTimebank,
      renderAutoDealCountdown: autoDealModel.renderAutoDealCountdown,
      dealAnimationActive: options.dealAnimationActive,
      canQueueFoldAny: options.canQueueFoldAny,
      canHeroAct: options.canHeroAct,
      isActionRevealLocked: options.isActionRevealLocked,
      isActionSequenceActive: options.isActionSequenceActive,
      showdownTerminalControlsLocked: options.showdownTerminalControlsLocked,
      tournamentFinishScreenVisible: options.tournamentFinishScreenVisible,
      heroBusted: options.heroBusted,
      heroBustedRestartAction: options.heroBustedRestartAction,
      heroBustedRestartLabel: options.heroBustedRestartLabel,
      heroIsAllIn: options.heroIsAllIn,
      heroFacesLoneOpponentAllIn: options.heroFacesLoneOpponentAllIn,
      heroFacingCallOnlyRaise: options.heroFacingCallOnlyRaise,
      heroCanShortAllIn: options.heroCanShortAllIn,
      effectiveHeroCallAmount: options.effectiveHeroCallAmount,
      betBounds: options.betBounds,
      betSliderModel: options.betSliderModel,
      betSliderFillPercent: options.betSliderFillPercent,
      betPresets: options.betPresets,
      amountFromBetSliderValue: options.amountFromBetSliderValue,
      sliderValuesMatch: options.sliderValuesMatch,
      preflopBetNudgeStep: options.preflopBetNudgeStep,
      clampPercentValue: options.clampPercentValue,
      clampBetValue: options.clampBetValue,
      formatAmount: options.formatAmount,
      formatCompactAmount: options.formatCompactAmount,
      formatBetSliderValue: options.formatBetSliderValue,
      formatBetActionAmount: options.formatBetActionAmount,
      actionHint: options.actionHint
    });

    const heroTurnAnnouncements = heroTurnLiveRegionKit.model({
      documentRef: options.documentRef,
      getActiveTable: options.getActiveTable,
      canHeroAct: options.canHeroAct,
      getTableCount: options.getTableCount
    });

    const botResponseModel = botResponseKit.model({
      getState: options.getState,
      getTable: options.getTable,
      isPaused: options.isPaused,
      heroIsAllIn: options.heroIsAllIn,
      runBotResponse: options.runBotResponse
    });

    const botResponseRuntime = botResponseRuntimeKit.model({
      getState: options.getState,
      getTable: options.getTable,
      engine: options.engine,
      captureVisualSeatState: options.captureVisualSeatState,
      retainBetAnimationsForActionSequence: options.retainBetAnimationsForActionSequence,
      clearActionBubbleLatch: options.clearActionBubbleLatch,
      isPaused: options.isPaused,
      scheduleBotResponse: botResponseModel.scheduleBotResponse,
      canRunScheduledBotResponse: botResponseModel.canRunScheduledBotResponse,
      recoverPendingBotResponse: botResponseModel.recoverPendingBotResponse,
      botResponseGuardMatches: botResponseModel.botResponseGuardMatches,
      pendingBotResponseStillCurrent: botResponseModel.pendingBotResponseStillCurrent,
      annotateActionAnimationMotion: options.annotateActionAnimationMotion,
      primeActionReveal: options.primeActionReveal,
      primeShowdownAnimation: options.primeShowdownAnimation,
      playTone: options.playTone,
      maybeRecordHand: options.maybeRecordHand,
      queueNextHandIfNeeded: autoDealModel.queueNextHandIfNeeded,
      markTableDirty: options.markTableDirty,
      render: options.render
    });

    const heroActionRuntime = heroActionRuntimeKit.model({
      windowRef: options.windowRef,
      getState: options.getState,
      engine: options.engine,
      decisionLog,
      saveSessionData: options.saveSessionData,
      isPaused: options.isPaused,
      canHeroAct: options.canHeroAct,
      heroFacingCallOnlyRaise: options.heroFacingCallOnlyRaise,
      isAggressiveHeroAction: options.isAggressiveHeroAction,
      heroCanShortAllIn: options.heroCanShortAllIn,
      setActiveTable: options.setActiveTable,
      captureDecisionTiming: actionClockModel.captureDecisionTiming,
      clearActionClock: actionClockModel.clearActionClock,
      needsBetAmount: options.needsBetAmount,
      captureVisualSeatState: options.captureVisualSeatState,
      retainBetAnimationsForActionSequence: options.retainBetAnimationsForActionSequence,
      clearActionBubbleLatch: options.clearActionBubbleLatch,
      sendSimulatorDecisionTelemetry: options.sendSimulatorDecisionTelemetry,
      pendingBotResponseForOutcome: botResponseModel.pendingBotResponseForOutcome,
      clearDecisionTimer: actionClockModel.clearDecisionTimer,
      clearFoldAnyQueue: options.clearFoldAnyQueue,
      captureHeroActionAnimation: options.captureHeroActionAnimation,
      playTone: options.playTone,
      maybeRecordHand: options.maybeRecordHand,
      queueNextHandIfNeeded: autoDealModel.queueNextHandIfNeeded,
      markTableDirty: options.markTableDirty,
      render: options.render,
      scheduleBotResponse: botResponseModel.scheduleBotResponse,
      actionRevealDuration: options.actionRevealDuration,
      annotateActionAnimationMotion: options.annotateActionAnimationMotion,
      primeActionReveal: options.primeActionReveal,
      primeShowdownAnimation: options.primeShowdownAnimation
    });

    const hotkeysRuntime = hotkeysKit.model({
      getState: options.getState,
      getTable: options.getTable,
      heroActions: options.heroActions,
      tableGrid: options.tableGrid,
      dialogs: options.hotkeyDialogs,
      isPaused: options.isPaused,
      needsBetAmount: options.needsBetAmount,
      readBetAmount: options.readBetAmount,
      handleHeroAction: options.handleHeroAction
    });

    return {
      autoDealModel,
      clearAutoDealQueue: autoDealModel.clearAutoDealQueue,
      clearAllAutoDealQueues: autoDealModel.clearAllAutoDealQueues,
      pauseAutoDealQueues: autoDealModel.pauseAutoDealQueues,
      resumeAutoDealQueues: autoDealModel.resumeAutoDealQueues,
      queueNextHandIfNeeded: autoDealModel.queueNextHandIfNeeded,
      autoDealLabel: autoDealModel.autoDealLabel,
      renderAutoDealCountdown: autoDealModel.renderAutoDealCountdown,
      stopAutoDealCountdownTicker: autoDealModel.stopAutoDealCountdownTicker,
      updateAutoDealCountdowns: autoDealModel.updateAutoDealCountdowns,
      syncAutoDealCountdownTicker: autoDealModel.syncAutoDealCountdownTicker,
      actionClockModel,
      decisionTimebankSeconds: actionClockModel.decisionTimebankSeconds,
      decisionTimingKey: actionClockModel.decisionTimingKey,
      prepareDecisionTimer: actionClockModel.prepareDecisionTimer,
      clearDecisionTimer: actionClockModel.clearDecisionTimer,
      captureDecisionTiming: actionClockModel.captureDecisionTiming,
      clearActionClock: actionClockModel.clearActionClock,
      clearAllActionClocks: actionClockModel.clearAllActionClocks,
      pauseActionClocks: actionClockModel.pauseActionClocks,
      resumeActionClocks: actionClockModel.resumeActionClocks,
      prepareActionClocks: actionClockModel.prepareActionClocks,
      renderActionClock: actionClockModel.renderActionClock,
      renderHeroTimebank: actionClockModel.renderHeroTimebank,
      stopActionClockTicker: actionClockModel.stopActionClockTicker,
      updateActionClocks: actionClockModel.updateActionClocks,
      syncActionClockTicker: actionClockModel.syncActionClockTicker,
      simulationRuntime,
      startPanelRuntime,
      decisionLog,
      actionControls,
      heroTurnAnnouncements,
      botResponseModel,
      clearBotResponseTimer: botResponseModel.clearBotResponseTimer,
      clearAllBotResponseTimers: botResponseModel.clearAllBotResponseTimers,
      botResponseGuardForTable: botResponseModel.botResponseGuardForTable,
      botResponseGuardMatches: botResponseModel.botResponseGuardMatches,
      pendingBotResponseForOutcome: botResponseModel.pendingBotResponseForOutcome,
      pendingBotResponseStillCurrent: botResponseModel.pendingBotResponseStillCurrent,
      recoverPendingBotResponse: botResponseModel.recoverPendingBotResponse,
      repairPendingBotResponses: botResponseModel.repairPendingBotResponses,
      canRunScheduledBotResponse: botResponseModel.canRunScheduledBotResponse,
      scheduleBotResponse: botResponseModel.scheduleBotResponse,
      pauseBotResponseTimers: botResponseModel.pauseBotResponseTimers,
      resumeBotResponseTimers: botResponseModel.resumeBotResponseTimers,
      botResponseRuntime,
      heroActionRuntime,
      hotkeysRuntime
    };
  }

  root.PokerSimulatorActionRuntimeComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorActionRuntimeComposition;
})();
