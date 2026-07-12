(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`${name} is required`);
    }
    return value;
  }

  function requireModel(kit, name) {
    if (!kit || typeof kit.model !== "function") {
      throw new Error(`${name} is not loaded - check <script> order in poker-simulator.html`);
    }
    return kit;
  }

  function model(options = {}) {
    const runtime = requireObject(options.runtime, "runtime");
    const base = requireObject(options.base, "base");
    const dependencies = requireObject(runtime.dependencies, "runtime.dependencies");
    const refs = requireObject(runtime.refs, "runtime.refs");
    const windowRef = runtime.windowRef || root;
    const documentRef = runtime.documentRef || windowRef.document;
    const state = requireObject(runtime.state, "runtime.state");
    const appFoundation = requireObject(runtime.appFoundation, "runtime.appFoundation");
    const appSessionComposition = requireObject(runtime.appSessionComposition, "runtime.appSessionComposition");
    const runtimeBridge = requireObject(runtime.runtimeBridge, "runtime.runtimeBridge");
    const runtimeRegistry = requireObject(runtime.runtimeRegistry, "runtime.runtimeRegistry");
    if (typeof runtimeRegistry.set !== "function") throw new Error("runtime.runtimeRegistry.set is required");
    const renderLoop = requireObject(runtime.renderLoop, "runtime.renderLoop");
    const tableViewModel = requireObject(runtime.tableViewModel, "runtime.tableViewModel");
    const visualRuntime = requireObject(runtime.visualRuntime, "runtime.visualRuntime");
    const actionBridge = requireObject(runtime.actionBridge, "runtime.actionBridge");
    const timingConfig = requireObject(runtime.timingConfig, "runtime.timingConfig");
    const appServices = requireObject(base.appServices, "base.appServices");
    const appPrimitives = requireObject(base.appPrimitives, "base.appPrimitives");
    const domControls = requireObject(base.domControls, "base.domControls");
    const {
      actionRuntimeCompositionKit,
      startRuntimeKit,
      opponentsKit
    } = dependencies;
    requireModel(actionRuntimeCompositionKit, "PokerSimulatorActionRuntimeComposition");
    requireModel(startRuntimeKit, "PokerSimulatorStartRuntime");
    requireObject(opponentsKit, "PokerSimulatorOpponents");
    const historyBridge = appServices.historyBridge;
    const sessionBridge = appSessionComposition.sessionBridge;
    const sessionComposition = appFoundation.sessionComposition;

    visualRuntime.composeCore({
      renderSupportKit: dependencies.renderSupportKit,
      tournamentFinishKit: dependencies.tournamentFinishKit,
      actionVisualsKit: dependencies.actionVisualsKit,
      showdownTimingKit: dependencies.showdownTimingKit,
      chipKit: dependencies.chipKit,
      chipBreakdown: appPrimitives.chipBreakdown,
      formatAmount: appFoundation.formatAmount,
      formatInlineAmounts: appPrimitives.formatInlineAmounts,
      escapeHtml: appFoundation.escapeHtml,
      tableUsesTournamentMode: runtimeBridge.tableUsesTournamentMode,
      heroBusted: tableViewModel.heroBusted,
      formatBlindMultiplier: appPrimitives.formatBlindMultiplier,
      windowRef,
      getSettings: () => state.settings,
      timingConfig,
      now: () => Date.now(),
      roundBb: appFoundation.roundBb
    });

    const actionRuntime = actionRuntimeCompositionKit.model({
      windowRef,
      documentRef,
      engine: dependencies.engine,
      autoDealKit: dependencies.autoDealKit,
      actionClockKit: dependencies.actionClockKit,
      simulationRuntimeKit: dependencies.simulationRuntimeKit,
      startModel: appFoundation.startModel,
      startRuntimeKit,
      decisionLogKit: dependencies.decisionLogKit,
      actionControlsKit: dependencies.actionControlsKit,
      heroTurnLiveRegionKit: dependencies.heroTurnLiveRegionKit,
      botResponseKit: dependencies.botResponseKit,
      botResponseRuntimeKit: dependencies.botResponseRuntimeKit,
      heroActionRuntimeKit: dependencies.heroActionRuntimeKit,
      hotkeysKit: dependencies.hotkeysKit,
      getState: () => state,
      getTableGrid: () => refs.tableGrid,
      tableGrid: refs.tableGrid,
      runtimeBridge,
      visualRuntime,
      actionBridge,
      betModel: appPrimitives.betModel,
      bettingKit: dependencies.bettingKit,
      historyBridge,
      sessionBridge,
      renderLoop,
      tableViewModel,
      timingConfig,
      perfModel: appFoundation.perfModel,
      domControls,
      domPatch: appFoundation.domPatch,
      formatHelpers: {
        escapeHtml: appFoundation.escapeHtml,
        formatBb: appPrimitives.formatBb,
        formatAmount: appFoundation.formatAmount,
        formatCompactAmount: appPrimitives.formatCompactAmount
      },
      runtimeRegistry,
      heroActions: appPrimitives.heroActions
    });
    if (typeof base.setActionRuntime === "function") base.setActionRuntime(actionRuntime);
    runtimeRegistry.set({
      autoDealLabel: actionRuntime.autoDealLabel,
      simulationRuntime: actionRuntime.simulationRuntime,
      actionControls: actionRuntime.actionControls,
      heroTurnAnnouncements: actionRuntime.heroTurnAnnouncements,
      botResponseRuntime: actionRuntime.botResponseRuntime,
      heroActionRuntime: actionRuntime.heroActionRuntime,
      hotkeysRuntime: actionRuntime.hotkeysRuntime
    });

    const composedVisualRuntime = visualRuntime.composeRuntime({
      windowRef,
      getState: () => state,
      visualTimersKit: dependencies.visualTimersKit,
      visualPrimerKit: dependencies.visualPrimerKit,
      actionRevealKit: dependencies.actionRevealKit,
      showdownVisualsKit: dependencies.showdownVisualsKit,
      seatVisualsKit: dependencies.seatVisualsKit,
      tableRenderAdapterKit: dependencies.tableRenderAdapterKit,
      tableStatusKit: dependencies.tableStatusKit,
      runtimeBridge,
      actionRuntime,
      actionBridge,
      historyBridge,
      renderLoop,
      tableViewModel,
      timingConfig,
      sessionComposition,
      perfModel: appFoundation.perfModel,
      saveSessionData: appSessionComposition.saveSessionData,
      cardModel: appPrimitives.cardModel,
      bettingKit: dependencies.bettingKit,
      opponentsKit,
      formatHelpers: {
        formatAmount: appFoundation.formatAmount,
        formatInlineAmounts: appPrimitives.formatInlineAmounts,
        escapeHtml: appFoundation.escapeHtml,
        formatBlindMultiplier: appPrimitives.formatBlindMultiplier
      },
      renderKits: {
        seatSlotsKit: dependencies.seatSlotsKit,
        geometryKit: dependencies.geometryKit,
        dealAnimationsKit: dependencies.dealAnimationsKit,
        boardRenderKit: dependencies.boardRenderKit,
        tableEffectsKit: dependencies.tableEffectsKit,
        seatRendererKit: dependencies.seatRendererKit,
        tableRendererKit: dependencies.tableRendererKit
      }
    });
    runtimeRegistry.set({
      renderTable: composedVisualRuntime.renderTable,
      dealAnimationActive: composedVisualRuntime.dealAnimationActive,
      seatPoint: composedVisualRuntime.seatPoint,
      seatZone: composedVisualRuntime.seatZone,
      clearExpiredRenderedAnimations: composedVisualRuntime.clearExpiredRenderedAnimations
    });

    return { actionRuntime, composedVisualRuntime };
  }

  root.PokerSimulatorAppActionVisualComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppActionVisualComposition;
})();
