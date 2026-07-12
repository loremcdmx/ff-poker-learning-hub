(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function assignValue(target, key, candidate) {
    if (target[key] !== undefined || candidate === undefined || candidate === null) return;
    target[key] = candidate;
  }

  function model(options = {}) {
    const bridge = options.bridge || {};
    const state = options.state || {};
    const models = options.models || {};

    function composeCore(coreOptions = {}) {
      const renderSupportKit = coreOptions.renderSupportKit || root.PokerSimulatorRenderSupport;
      const tournamentFinishKit = coreOptions.tournamentFinishKit || root.PokerSimulatorTournamentFinish;
      const actionVisualsKit = coreOptions.actionVisualsKit || root.PokerSimulatorActionVisuals;
      const showdownTimingKit = coreOptions.showdownTimingKit || root.PokerSimulatorShowdownTiming;
      const now = typeof coreOptions.now === "function" ? coreOptions.now : () => Date.now();
      const timingConfig = coreOptions.timingConfig || {};
      assignValue(coreOptions, "actionVisualDurations", timingConfig.actionVisualDurations);
      assignValue(coreOptions, "showdownDurations", timingConfig.showdownDurations);

      const renderSupport = renderSupportKit.model({
        chipKit: coreOptions.chipKit,
        chipBreakdown: coreOptions.chipBreakdown,
        formatAmount: coreOptions.formatAmount,
        formatInlineAmounts: coreOptions.formatInlineAmounts,
        escapeHtml: coreOptions.escapeHtml,
        actionI18n: root.PokerSimulatorActionI18n,
        actionAnimationHasStarted: state.actionAnimationHasStarted
      });

      const tournamentFinishUi = tournamentFinishKit.model({
        tableUsesTournamentMode: coreOptions.tableUsesTournamentMode,
        heroBusted: coreOptions.heroBusted,
        isActionSequenceActive: bridge.isActionSequenceActive,
        showdownTerminalControlsLocked: bridge.showdownTerminalControlsLocked,
        formatBlindMultiplier: coreOptions.formatBlindMultiplier,
        formatAmount: coreOptions.formatAmount,
        compactActionText: state.compactActionText,
        escapeHtml: coreOptions.escapeHtml
      });

      const actionVisualModel = actionVisualsKit.model({
        windowRef: coreOptions.windowRef,
        getSettings: coreOptions.getSettings,
        durations: coreOptions.actionVisualDurations,
        now,
        roundBb: coreOptions.roundBb,
        isActionSequenceActive: bridge.isActionSequenceActive,
        // Lazy bridge: showdownTimingModel is assigned immediately below, long
        // before this predicate is first evaluated during a render.
        showdownAwardVisible: bridge.showdownAwardVisible
      });

      const showdownTimingModel = showdownTimingKit.model({
        getSettings: coreOptions.getSettings,
        now,
        prefersReducedMotion: bridge.prefersReducedMotion,
        reducedTableMotion: bridge.reducedTableMotion,
        boardRevealMs: bridge.boardRevealMs,
        allInRunoutStages: state.allInRunoutStages,
        showdownRevealOrder: state.showdownRevealOrder,
        scheduleShowdownRender: bridge.scheduleShowdownRender,
        durations: coreOptions.showdownDurations
      });

      models.renderSupport = renderSupport;
      models.tournamentFinishUi = tournamentFinishUi;
      models.actionVisualModel = actionVisualModel;
      models.showdownTimingModel = showdownTimingModel;

      return { renderSupport, tournamentFinishUi, actionVisualModel, showdownTimingModel };
    }

    return { composeCore };
  }

  root.PokerSimulatorVisualCoreComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorVisualCoreComposition;
})();
