(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  const OPTIONAL_GLOBALS = [
    ["deckKit", "PokerDeckKit", "assets/poker-kit/decks/deck-library.js"],
    ["chipKit", "PokerChipKit", "assets/poker-kit/chips/chip-library.js"]
  ];

  const REQUIRED_GLOBALS = [
    ["enginePartsCore", "PokerSimulatorEngineParts", "assets/poker-kit/simulator/engine-core.js"],
    ["enginePartsPreflop", "PokerSimulatorEngineParts", "assets/poker-kit/simulator/engine-preflop-policy.js"],
    ["enginePartsRunout", "PokerSimulatorEngineParts", "assets/poker-kit/simulator/engine-runout.js"],
    ["enginePartsTournamentLobby", "PokerSimulatorEngineParts", "assets/poker-kit/simulator/engine-tournament-lobby.js"],
    ["enginePartsShowdown", "PokerSimulatorEngineParts", "assets/poker-kit/simulator/engine-showdown.js"],
    ["enginePartsPostflop", "PokerSimulatorEngineParts", "assets/poker-kit/simulator/engine-postflop-policy.js"],
    ["engine", "PokerSimulatorEngine", "assets/poker-kit/simulator/simulator-engine.js"],
    ["timings", "PokerSimulatorTimings", "assets/poker-simulator/simulator-timings.js"],
    ["timingConfigKit", "PokerSimulatorTimingConfig", "assets/poker-simulator/simulator-timing-config.js"],
    ["randomKit", "PokerSimulatorRandom", "assets/poker-simulator/simulator-random.js"],
    ["stateKit", "PokerSimulatorState", "assets/poker-simulator/simulator-state.js"],
    ["leaderboardKit", "PokerSimulatorLeaderboard", "assets/poker-simulator/simulator-leaderboard.js"],
    ["sessionLockKit", "PokerSimulatorSessionLock", "assets/poker-simulator/simulator-session-lock.js"],
    ["sessionLeaderboardKit", "PokerSimulatorSessionLeaderboard", "assets/poker-simulator/simulator-session-leaderboard.js"],
    ["sessionTotalsKit", "PokerSimulatorSessionTotals", "assets/poker-simulator/simulator-session-totals.js"],
    ["sessionArchiveKit", "PokerSimulatorSessionArchive", "assets/poker-simulator/simulator-session-archive.js"],
    ["sessionPersistenceKit", "PokerSimulatorSessionPersistence", "assets/poker-simulator/simulator-session-persistence.js"],
    ["sessionStoreKit", "PokerSimulatorSessionStore", "assets/poker-simulator/simulator-session-store.js"],
    ["sessionBridgeKit", "PokerSimulatorSessionBridge", "assets/poker-simulator/simulator-session-bridge.js"],
    ["sessionGraphKit", "PokerSimulatorSessionGraph", "assets/poker-simulator/simulator-session-graph.js"],
    ["handLogKit", "PokerSimulatorHandLog", "assets/poker-simulator/simulator-hand-log.js"],
    ["sessionMetricsKit", "PokerSimulatorSessionMetrics", "assets/poker-simulator/simulator-session-metrics.js"],
    ["sessionMetricsBridgeKit", "PokerSimulatorSessionMetricsBridge", "assets/poker-simulator/simulator-session-metrics-bridge.js"],
    ["sessionExportKit", "PokerSimulatorSessionExport", "assets/poker-simulator/simulator-session-export.js"],
    ["sessionRuntimeKit", "PokerSimulatorSessionRuntime", "assets/poker-simulator/simulator-session-runtime.js"],
    ["sessionHudKit", "PokerSimulatorSessionHud", "assets/poker-simulator/simulator-session-hud.js"],
    ["sessionHudBridgeKit", "PokerSimulatorSessionHudBridge", "assets/poker-simulator/simulator-session-hud-bridge.js"],
    ["sessionCompositionKit", "PokerSimulatorSessionComposition", "assets/poker-simulator/simulator-session-composition.js"],
    ["telemetryKit", "PokerSimulatorTelemetry", "assets/poker-simulator/simulator-telemetry.js"],
    ["foldAnyKit", "PokerSimulatorFoldAny", "assets/poker-simulator/simulator-fold-any.js"],
    ["shellControlsKit", "PokerSimulatorShellControls", "assets/poker-simulator/simulator-shell-controls.js"],
    ["simulationControlsKit", "PokerSimulatorSimulationControls", "assets/poker-simulator/simulator-simulation-controls.js"],
    ["simulationRuntimeKit", "PokerSimulatorSimulationRuntime", "assets/poker-simulator/simulator-simulation-runtime.js"],
    ["formatKit", "PokerSimulatorFormat", "assets/poker-simulator/simulator-format.js"],
    ["renderSupportKit", "PokerSimulatorRenderSupport", "assets/poker-simulator/simulator-render-support.js"],
    ["actionI18nKit", "PokerSimulatorActionI18n", "assets/poker-simulator/simulator-action-i18n.js"],
    ["stageKit", "PokerSimulatorStage", "assets/poker-simulator/simulator-stage.js"],
    ["audioKit", "PokerSimulatorAudio", "assets/poker-simulator/simulator-audio.js"],
    ["seatSlotsKit", "PokerSimulatorSeatSlots", "assets/poker-simulator/simulator-seat-slots.js"],
    ["geometryKit", "PokerSimulatorGeometry", "assets/poker-simulator/simulator-geometry.js"],
    ["bettingKit", "PokerSimulatorBetting", "assets/poker-simulator/simulator-betting.js"],
    ["heroActionsKit", "PokerSimulatorHeroActions", "assets/poker-simulator/simulator-hero-actions.js"],
    ["actionControlsKit", "PokerSimulatorActionControls", "assets/poker-simulator/simulator-action-controls.js"],
    ["actionBridgeKit", "PokerSimulatorActionBridge", "assets/poker-simulator/simulator-action-bridge.js"],
    ["decisionLogKit", "PokerSimulatorDecisionLog", "assets/poker-simulator/simulator-decision-log.js"],
    ["heroActionRuntimeKit", "PokerSimulatorHeroActionRuntime", "assets/poker-simulator/simulator-hero-action-runtime.js"],
    ["hotkeysKit", "PokerSimulatorHotkeys", "assets/poker-simulator/simulator-hotkeys.js"],
    ["startKit", "PokerSimulatorStart", "assets/poker-simulator/simulator-start.js"],
    ["startRuntimeKit", "PokerSimulatorStartRuntime", "assets/poker-simulator/simulator-start-runtime.js"],
    ["settingsKit", "PokerSimulatorSettings", "assets/poker-simulator/simulator-settings.js"],
    ["bootKit", "PokerSimulatorBoot", "assets/poker-simulator/simulator-boot.js"],
    ["tableLifecycleKit", "PokerSimulatorTableLifecycle", "assets/poker-simulator/simulator-table-lifecycle.js"],
    ["replayKit", "PokerSimulatorReplay", "assets/poker-simulator/simulator-replay.js"],
    ["replayHistoryKit", "PokerSimulatorReplayHistory", "assets/poker-simulator/simulator-replay-history.js"],
    ["historyBridgeKit", "PokerSimulatorHistoryBridge", "assets/poker-simulator/simulator-history-bridge.js"],
    ["handCompletionKit", "PokerSimulatorHandCompletion", "assets/poker-simulator/simulator-hand-completion.js"],
    ["domKit", "PokerSimulatorDom", "assets/poker-simulator/simulator-dom.js"],
    ["domControlsKit", "PokerSimulatorDomControls", "assets/poker-simulator/simulator-dom-controls.js"],
    ["cardsKit", "PokerSimulatorCards", "assets/poker-simulator/simulator-cards.js"],
    ["replayUiKit", "PokerSimulatorReplayUi", "assets/poker-simulator/simulator-replay-ui.js"],
    ["replayControllerKit", "PokerSimulatorReplayController", "assets/poker-simulator/simulator-replay-controller.js"],
    ["autoDealKit", "PokerSimulatorAutoDeal", "assets/poker-simulator/simulator-auto-deal.js"],
    ["actionClockKit", "PokerSimulatorActionClock", "assets/poker-simulator/simulator-action-clock.js"],
    ["heroTurnLiveRegionKit", "PokerSimulatorHeroTurnLiveRegion", "assets/poker-simulator/simulator-hero-turn-live-region.js"],
    ["dealAnimationsKit", "PokerSimulatorDealAnimations", "assets/poker-simulator/simulator-deal-animations.js"],
    ["boardRenderKit", "PokerSimulatorBoardRender", "assets/poker-simulator/simulator-board-render.js"],
    ["tournamentFinishKit", "PokerSimulatorTournamentFinish", "assets/poker-simulator/simulator-tournament-finish.js"],
    ["actionVisualsKit", "PokerSimulatorActionVisuals", "assets/poker-simulator/simulator-action-visuals.js"],
    ["tableEffectsKit", "PokerSimulatorTableEffects", "assets/poker-simulator/simulator-table-effects.js"],
    ["tableEffectsBridgeKit", "PokerSimulatorTableEffectsBridge", "assets/poker-simulator/simulator-table-effects-bridge.js"],
    ["botResponseKit", "PokerSimulatorBotResponse", "assets/poker-simulator/simulator-bot-response.js"],
    ["botResponseRuntimeKit", "PokerSimulatorBotResponseRuntime", "assets/poker-simulator/simulator-bot-response-runtime.js"],
    ["actionRuntimeCompositionKit", "PokerSimulatorActionRuntimeComposition", "assets/poker-simulator/simulator-action-runtime-composition.js"],
    ["botLabKit", "PokerSimulatorBotLab", "assets/poker-simulator/simulator-bot-lab.js"],
    ["botLabRuntimeKit", "PokerSimulatorBotLabRuntime", "assets/poker-simulator/simulator-bot-lab-runtime.js"],
    ["analyticsUiKit", "PokerSimulatorAnalyticsUi", "assets/poker-simulator/simulator-analytics-ui.js"],
    ["visualTimersKit", "PokerSimulatorVisualTimers", "assets/poker-simulator/simulator-visual-timers.js"],
    ["visualPrimerKit", "PokerSimulatorVisualPrimer", "assets/poker-simulator/simulator-visual-primer.js"],
    ["actionRevealKit", "PokerSimulatorActionReveal", "assets/poker-simulator/simulator-action-reveal.js"],
    ["visualBridgeKit", "PokerSimulatorVisualBridge", "assets/poker-simulator/simulator-visual-bridge.js"],
    ["showdownTimingKit", "PokerSimulatorShowdownTiming", "assets/poker-simulator/simulator-showdown-timing.js"],
    ["showdownVisualsKit", "PokerSimulatorShowdownVisuals", "assets/poker-simulator/simulator-showdown-visuals.js"],
    ["seatVisualsKit", "PokerSimulatorSeatVisuals", "assets/poker-simulator/simulator-seat-visuals.js"],
    ["seatRendererKit", "PokerSimulatorSeatRenderer", "assets/poker-simulator/simulator-seat-renderer.js"],
    ["tableRendererKit", "PokerSimulatorTableRenderer", "assets/poker-simulator/simulator-table-renderer.js"],
    ["tableStatusKit", "PokerSimulatorTableStatus", "assets/poker-simulator/simulator-table-status.js"],
    ["tableViewModelKit", "PokerSimulatorTableViewModel", "assets/poker-simulator/simulator-table-view-model.js"],
    ["tableRenderAdapterKit", "PokerSimulatorTableRenderAdapter", "assets/poker-simulator/simulator-table-render-adapter.js"],
    ["visualStateBridgeKit", "PokerSimulatorVisualStateBridge", "assets/poker-simulator/simulator-visual-state-bridge.js"],
    ["visualRuntimeFacadeKit", "PokerSimulatorVisualRuntimeFacade", "assets/poker-simulator/simulator-visual-runtime-facade.js"],
    ["visualCoreCompositionKit", "PokerSimulatorVisualCoreComposition", "assets/poker-simulator/simulator-visual-core-composition.js"],
    ["visualRenderCompositionKit", "PokerSimulatorVisualRenderComposition", "assets/poker-simulator/simulator-visual-render-composition.js"],
    ["visualRuntimeCompositionKit", "PokerSimulatorVisualRuntimeComposition", "assets/poker-simulator/simulator-visual-runtime-composition.js"],
    ["runtimeRegistryKit", "PokerSimulatorRuntimeRegistry", "assets/poker-simulator/simulator-runtime-registry.js"],
    ["runtimeBridgeKit", "PokerSimulatorRuntimeBridge", "assets/poker-simulator/simulator-runtime-bridge.js"],
    ["runtimeBridgeCompositionKit", "PokerSimulatorRuntimeBridgeComposition", "assets/poker-simulator/simulator-runtime-bridge-composition.js"],
    ["opponentsKit", "PokerSimulatorOpponents", "assets/poker-simulator/simulator-opponents.js"],
    ["opponentNotesKit", "PokerSimulatorOpponentNotes", "assets/poker-simulator/simulator-opponent-notes.js"],
    ["botInspectorKit", "PokerSimulatorBotInspector", "assets/poker-simulator/simulator-bot-inspector.js"],
    ["embedKit", "PokerSimulatorEmbedApi", "assets/poker-simulator/simulator-embed-api.js"],
    ["smokeScenariosKit", "PokerSimulatorSmokeScenarios", "assets/poker-simulator/simulator-smoke-scenarios.js"],
    ["publicApiKit", "PokerSimulatorPublicApi", "assets/poker-simulator/simulator-public-api.js"],
    ["appFoundationCompositionKit", "PokerSimulatorAppFoundationComposition", "assets/poker-simulator/simulator-app-foundation-composition.js"],
    ["appPrimitivesCompositionKit", "PokerSimulatorAppPrimitivesComposition", "assets/poker-simulator/simulator-app-primitives-composition.js"],
    ["appSessionCompositionKit", "PokerSimulatorAppSessionComposition", "assets/poker-simulator/simulator-app-session-composition.js"],
    ["appServicesCompositionKit", "PokerSimulatorAppServicesComposition", "assets/poker-simulator/simulator-app-services-composition.js"],
    ["appUiCompositionKit", "PokerSimulatorAppUiComposition", "assets/poker-simulator/simulator-app-ui-composition.js"],
    ["appRuntimeCompositionKit", "PokerSimulatorAppRuntimeComposition", "assets/poker-simulator/simulator-app-runtime-composition.js"],
    ["appFeatureBaseCompositionKit", "PokerSimulatorAppFeatureBaseComposition", "assets/poker-simulator/simulator-app-feature-base-composition.js"],
    ["appActionVisualCompositionKit", "PokerSimulatorAppActionVisualComposition", "assets/poker-simulator/simulator-app-action-visual-composition.js"],
    ["appFeaturesCompositionKit", "PokerSimulatorAppFeaturesComposition", "assets/poker-simulator/simulator-app-features-composition.js"],
    ["appShellCompositionKit", "PokerSimulatorAppShellComposition", "assets/poker-simulator/simulator-app-shell-composition.js"],
    ["appLaunchKit", "PokerSimulatorAppLaunch", "assets/poker-simulator/simulator-app-launch.js"],
    ["eventWiringKit", "PokerSimulatorEventWiring", "assets/poker-simulator/simulator-event-wiring.js"],
    ["perfKit", "PokerSimulatorPerfKit", "assets/poker-simulator/simulator-perf.js"],
    ["renderLoopKit", "PokerSimulatorRenderLoop", "assets/poker-simulator/simulator-render-loop.js"],
    ["renderRuntimeKit", "PokerSimulatorRenderRuntime", "assets/poker-simulator/simulator-render-runtime.js"],
    ["appCompositionKit", "PokerSimulatorAppComposition", "assets/poker-simulator/simulator-app-composition.js"]
  ];

  function missingMessage(globalName) {
    return `${globalName} is not loaded - check <script> order in poker-simulator.html`;
  }

  function copyGlobals(entries, source, output, required) {
    entries.forEach(([key, globalName]) => {
      const value = source?.[globalName];
      if (required && !value) throw new Error(missingMessage(globalName));
      output[key] = value;
    });
  }

  function resolve(windowRef = root) {
    const dependencies = {};
    copyGlobals(OPTIONAL_GLOBALS, windowRef, dependencies, false);
    copyGlobals(REQUIRED_GLOBALS, windowRef, dependencies, true);
    return dependencies;
  }

  function publicGlobals(entries) {
    return entries.map(([key, globalName]) => [key, globalName]);
  }

  function scriptEntries(entries) {
    return entries
      .filter((entry) => entry[2])
      .map(([key, globalName, script]) => ({ key, globalName, script }));
  }

  root.PokerSimulatorDependencies = {
    optionalGlobals: publicGlobals(OPTIONAL_GLOBALS),
    requiredGlobals: publicGlobals(REQUIRED_GLOBALS),
    optionalScripts: scriptEntries(OPTIONAL_GLOBALS),
    requiredScripts: scriptEntries(REQUIRED_GLOBALS),
    resolve
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorDependencies;
})();
