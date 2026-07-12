(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function requireModel(kit, name) {
    if (!kit || typeof kit.model !== "function") {
      throw new Error(`${name} is not loaded - check <script> order in poker-simulator.html`);
    }
  }

  // Thin composition root: dependency resolution and phase order live here,
  // while each phase owns its own module boundary.
  async function launch() {
    const dependenciesKit = root.PokerSimulatorDependencies;
    if (!dependenciesKit) throw new Error("PokerSimulatorDependencies is not loaded - check <script> order in poker-simulator.html");
    const dependencies = dependenciesKit.resolve(root);
    requireModel(dependencies.appRuntimeCompositionKit, "PokerSimulatorAppRuntimeComposition");
    requireModel(dependencies.appFeaturesCompositionKit, "PokerSimulatorAppFeaturesComposition");
    requireModel(dependencies.appShellCompositionKit, "PokerSimulatorAppShellComposition");

    const refs = {
      packSelect: null,
      tableGrid: null,
      botLabOutput: null,
      leaderboardDialog: null,
      eventWiring: null
    };
    const runtime = dependencies.appRuntimeCompositionKit.model({
      windowRef: window,
      documentRef: document,
      dependencies,
      refs,
      warn: (...args) => console.warn(...args)
    });
    const features = dependencies.appFeaturesCompositionKit.model({ runtime });
    const shell = dependencies.appShellCompositionKit.model({ runtime, features });
    await shell.launch();
  }

  root.PokerSimulatorAppComposition = { launch };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppComposition;
})();
