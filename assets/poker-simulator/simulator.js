    (function () {
      "use strict";

      window.addEventListener("DOMContentLoaded", async () => {
        const appComposition = window.PokerSimulatorAppComposition;
        if (!appComposition?.launch) throw new Error("PokerSimulatorAppComposition is not loaded - check <script> order in poker-simulator.html");
        const featureLoader = window.PokerSimulatorFeatureLoader;
        if (featureLoader?.readyForBoot) await featureLoader.readyForBoot();
        await appComposition.launch();
      });
    })();
