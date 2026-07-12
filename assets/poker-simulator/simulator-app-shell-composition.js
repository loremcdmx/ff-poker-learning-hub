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
    const features = requireObject(options.features, "features");
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
    const appUiComposition = requireObject(features.appUiComposition, "features.appUiComposition");
    const appPrimitives = requireObject(features.appPrimitives, "features.appPrimitives");
    const appServices = requireObject(features.appServices, "features.appServices");
    const actionRuntime = requireObject(features.actionRuntime, "features.actionRuntime");
    const sessionBridge = appSessionComposition.sessionBridge;
    const historyBridge = appServices.historyBridge;
    const domControls = appUiComposition.domControls || {};
    const opponentNotesUi = appUiComposition.opponentNotesUi;
    const startModel = appFoundation.startModel;
    const sessionComposition = appFoundation.sessionComposition;
    const perfModel = appFoundation.perfModel;
    const domPatch = appFoundation.domPatch;
    const formatAmount = appFoundation.formatAmount;
    const tableGrid = refs.tableGrid;
    const setActiveTable = renderLoop.setActiveTable;
    const replayDialog = appUiComposition.replayDialog;
    const startPanelRuntime = actionRuntime.startPanelRuntime;
    const {
      renderRuntimeKit,
      tableLifecycleKit,
      eventWiringKit,
      appLaunchKit
    } = dependencies;
    requireModel(renderRuntimeKit, "PokerSimulatorRenderRuntime");
    requireModel(tableLifecycleKit, "PokerSimulatorTableLifecycle");
    requireModel(eventWiringKit, "PokerSimulatorEventWiring");
    requireModel(appLaunchKit, "PokerSimulatorAppLaunch");

    async function launch() {
      const renderRuntime = renderRuntimeKit.model({
        documentRef,
        state,
        engine: dependencies.engine,
        cssEscape: appFoundation.cssEscape,
        perfModel,
        runtimeBridge,
        visualRuntime,
        composedVisualRuntime: features.composedVisualRuntime,
        actionRuntime,
        sessionComposition,
        historyBridge,
        domControls,
        domPatch,
        startPanelRuntime,
      });
      runtimeRegistry.set({ renderRuntime });

      const tableLifecycle = tableLifecycleKit.model({
        engine: dependencies.engine,
        state,
        defaultPackKey: "basic-vpip",
        startModel,
        sessionBridge,
        tableViewModel,
        runtimeBridge,
        visualRuntime,
        sessionComposition,
        audio: appPrimitives.audio,
        renderLoop,
        actionRuntime,
        historyBridge
      });
      runtimeRegistry.set({ tableLifecycle });

      const eventWiring = eventWiringKit.model({
        windowRef,
        documentRef,
        getState: () => state,
        engine: dependencies.engine,
        runtimeBridge,
        visualRuntime,
        actionBridge,
        actionRuntime,
        sessionBridge,
        historyBridge,
        renderLoop,
        startModel,
        domPatch,
        opponentNotesUi,
        controls: domControls.eventWiring
      });
      refs.eventWiring = eventWiring;
      eventWiring.attach();

      const botInspectorKit = dependencies.botInspectorKit;
      if (botInspectorKit && typeof botInspectorKit.model === "function") {
        const botInspector = botInspectorKit.model({
          documentRef,
          getTable: runtimeBridge.getTable,
          getState: () => state,
          formatAmount,
          controls: domControls.botInspector
        });
        botInspector.attach(tableGrid);
        runtimeRegistry.set({ botInspector });
      }

      const appLaunch = appLaunchKit.model({
        windowRef,
        publicApiKit: dependencies.publicApiKit,
        embedKit: dependencies.embedKit,
        smokeScenariosKit: dependencies.smokeScenariosKit,
        embeddedMode: appFoundation.embeddedMode,
        getState: () => state,
        replayDialog,
        isLayoutSmokeLocalhost: appFoundation.isLayoutSmokeLocalhost,
        runtimeBridge,
        visualRuntime,
        actionRuntime,
        sessionBridge,
        historyBridge,
        sessionComposition,
        renderLoop,
        startModel,
        tableLifecycle,
        formatAmount,
        engine: dependencies.engine,
        perfApi: () => perfModel.publicApi(),
        hydrateExternalPacks: appFoundation.hydrateExternalPacks,
        hydratePackOptions: appFoundation.hydratePackOptions
      });
      await appLaunch.launch();
      return { renderRuntime, tableLifecycle, eventWiring, appLaunch };
    }

    return { launch };
  }

  root.PokerSimulatorAppShellComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppShellComposition;
})();
