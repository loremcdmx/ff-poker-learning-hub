(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const visualBridgeKit = options.visualBridgeKit || root.PokerSimulatorVisualBridge;
    const visualStateBridgeKit = options.visualStateBridgeKit || root.PokerSimulatorVisualStateBridge;
    const tableEffectsBridgeKit = options.tableEffectsBridgeKit || root.PokerSimulatorTableEffectsBridge;
    const visualRuntimeFacadeKit = options.visualRuntimeFacadeKit || root.PokerSimulatorVisualRuntimeFacade;
    const visualCoreCompositionKit = options.visualCoreCompositionKit || root.PokerSimulatorVisualCoreComposition;
    const visualRenderCompositionKit = options.visualRenderCompositionKit || root.PokerSimulatorVisualRenderComposition;
    const getShellControls = typeof options.getShellControls === "function" ? options.getShellControls : () => null;
    const models = {
      actionVisualModel: null,
      showdownTimingModel: null,
      showdownVisualModel: null,
      seatVisualModel: null,
      tableStatus: null,
      tournamentFinishUi: null,
      actionRevealModel: null,
      visualTimerModel: null,
      visualPrimer: null,
      renderSupport: null,
      tableEffects: null,
      tableRenderAdapter: null
    };

    const visualBridge = visualBridgeKit.model({
      getActionVisualModel: () => models.actionVisualModel,
      getShowdownTimingModel: () => models.showdownTimingModel,
      getActionRevealModel: () => models.actionRevealModel,
      getVisualTimerModel: () => models.visualTimerModel,
      getVisualPrimer: () => models.visualPrimer,
      getRenderSupport: () => models.renderSupport,
      getShellControls
    });

    const visualStateBridge = visualStateBridgeKit.model({
      getActionVisualModel: () => models.actionVisualModel,
      getShowdownVisualModel: () => models.showdownVisualModel,
      getSeatVisualModel: () => models.seatVisualModel,
      getTableStatus: () => models.tableStatus,
      getTournamentFinishUi: () => models.tournamentFinishUi,
      getRenderSupport: () => models.renderSupport
    });

    const tableEffectsBridge = tableEffectsBridgeKit.model({
      getTableEffects: () => models.tableEffects
    });

    const visualFacade = visualRuntimeFacadeKit.model({
      visualBridge,
      visualStateBridge,
      tableEffectsBridge
    });
    const coreComposition = visualCoreCompositionKit.model({
      bridge: visualFacade.bridge,
      state: visualFacade.state,
      models
    });
    const renderComposition = visualRenderCompositionKit.model({
      bridge: visualFacade.bridge,
      state: visualFacade.state,
      effects: visualFacade.effects,
      models
    });

    return visualFacade.publicApi({
      composeCore: coreComposition.composeCore,
      composeRuntime: renderComposition.composeRuntime
    });
  }

  root.PokerSimulatorVisualRuntimeComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorVisualRuntimeComposition;
})();
