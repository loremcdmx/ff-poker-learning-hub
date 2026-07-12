(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function requireModel(kit, name) {
    if (!kit || typeof kit.model !== "function") {
      throw new Error(`${name} is not loaded - check <script> order in poker-simulator.html`);
    }
  }

  function model(options = {}) {
    const runtime = options.runtime || {};
    const dependencies = runtime.dependencies || {};
    const featureBaseCompositionKit = dependencies.appFeatureBaseCompositionKit;
    const actionVisualCompositionKit = dependencies.appActionVisualCompositionKit;
    requireModel(featureBaseCompositionKit, "PokerSimulatorAppFeatureBaseComposition");
    requireModel(actionVisualCompositionKit, "PokerSimulatorAppActionVisualComposition");

    const base = featureBaseCompositionKit.model({ runtime });
    const actionVisual = actionVisualCompositionKit.model({ runtime, base });

    return {
      appServices: base.appServices,
      appPrimitives: base.appPrimitives,
      appUiComposition: base.appUiComposition,
      actionRuntime: actionVisual.actionRuntime,
      composedVisualRuntime: actionVisual.composedVisualRuntime
    };
  }

  root.PokerSimulatorAppFeaturesComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppFeaturesComposition;
})();
