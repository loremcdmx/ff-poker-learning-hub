(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getActionVisualModel = getter(options.getActionVisualModel);
    const getShowdownTimingModel = getter(options.getShowdownTimingModel);
    const getActionRevealModel = getter(options.getActionRevealModel);
    const getVisualTimerModel = getter(options.getVisualTimerModel);
    const getVisualPrimer = getter(options.getVisualPrimer);
    const getRenderSupport = getter(options.getRenderSupport);
    const getShellControls = getter(options.getShellControls);

    function getter(candidate) {
      return typeof candidate === "function" ? candidate : () => null;
    }

    function target(getTarget) {
      try {
        return getTarget() || {};
      } catch {
        return {};
      }
    }

    function invoke(getTarget, method, fallback, args) {
      const modelRef = target(getTarget);
      const fn = modelRef && modelRef[method];
      if (typeof fn === "function") return fn.apply(modelRef, Array.prototype.slice.call(args || []));
      return typeof fallback === "function" ? fallback.apply(null, Array.prototype.slice.call(args || [])) : fallback;
    }

    function bind(getTarget, method, fallback) {
      return function boundVisualBridgeMethod() {
        return invoke(getTarget, method, fallback, arguments);
      };
    }

    return {
      reducedTableMotion: bind(getActionVisualModel, "reducedTableMotion", false),
      usesDecorativeMotionLayer: bind(getActionVisualModel, "usesDecorativeMotionLayer", true),
      prefersReducedMotion: bind(getActionVisualModel, "prefersReducedMotion", false),
      compactTimingMs: bind(getActionVisualModel, "compactTimingMs", 0),
      riverResolutionKind: bind(getActionVisualModel, "riverResolutionKind", ""),
      actionRiverResolution: bind(getActionVisualModel, "actionRiverResolution", ""),
      isRiverResolutionAction: bind(getActionVisualModel, "isRiverResolutionAction", false),
      riverResolutionCueMs: bind(getActionVisualModel, "riverResolutionCueMs", 0),
      riverResolutionCueDelayMs: bind(getActionVisualModel, "riverResolutionCueDelayMs", 0),
      riverResolutionMotionMs: bind(getActionVisualModel, "riverResolutionMotionMs", 0),
      actionRevealMs: bind(getActionVisualModel, "actionRevealMs", 0),
      actionSettleMs: bind(getActionVisualModel, "actionSettleMs", 0),
      chipFlightMs: bind(getActionVisualModel, "chipFlightMs", 0),
      chipAnnouncementDelayForAction: bind(getActionVisualModel, "chipAnnouncementDelayForAction", 0),
      chipRevealMs: bind(getActionVisualModel, "chipRevealMs", 0),
      betMarkerLandingMs: bind(getActionVisualModel, "betMarkerLandingMs", 0),
      boardRevealMs: bind(getActionVisualModel, "boardRevealMs", 0),
      boardSettleMs: bind(getActionVisualModel, "boardSettleMs", 0),
      actionRevealDuration: bind(getActionVisualModel, "actionRevealDuration", 0),
      actionVisualLeadMs: bind(getActionVisualModel, "actionVisualLeadMs", 0),
      actionSequenceElapsedMs: bind(getActionVisualModel, "actionSequenceElapsedMs", 0),
      actionTimingAtIndex: bind(getActionVisualModel, "actionTimingAtIndex", () => ({ actionDelayMs: 0, thinkingDelayMs: 0, thinkMs: 0 })),
      actionControlReadyMs: bind(getActionVisualModel, "actionControlReadyMs", 0),
      actionControlSettleMs: bind(getActionVisualModel, "actionControlSettleMs", 0),
      actionControlUnlockDuration: bind(getActionVisualModel, "actionControlUnlockDuration", 0),
      pendingBoardReveal: bind(getActionVisualModel, "pendingBoardReveal", false),
      shouldRevealBoardBeforeAction: bind(getActionVisualModel, "shouldRevealBoardBeforeAction", false),
      actionSequenceBoardRevealStages: bind(getActionVisualModel, "actionSequenceBoardRevealStages", () => []),
      actionSequenceBoardRevealState: bind(getActionVisualModel, "actionSequenceBoardRevealState", () => null),
      boardRevealStartDelay: bind(getActionVisualModel, "boardRevealStartDelay", 0),
      boardRevealDelayRemaining: bind(getActionVisualModel, "boardRevealDelayRemaining", 0),

      showdownCompactTimingMs: bind(getShowdownTimingModel, "showdownCompactTimingMs", 0),
      showdownRevealStepDuration: bind(getShowdownTimingModel, "showdownRevealStepDuration", 0),
      showdownCardSettleDuration: bind(getShowdownTimingModel, "showdownCardSettleDuration", 0),
      showdownWinnerSettleDuration: bind(getShowdownTimingModel, "showdownWinnerSettleDuration", 0),
      showdownPotSettleDuration: bind(getShowdownTimingModel, "showdownPotSettleDuration", 0),
      showdownPotAwardMotionDuration: bind(getShowdownTimingModel, "showdownPotAwardMotionDuration", 0),
      showdownDoneHoldDuration: bind(getShowdownTimingModel, "showdownDoneHoldDuration", 0),
      allInHandRevealHoldDuration: bind(getShowdownTimingModel, "allInHandRevealHoldDuration", 0),
      allInRunoutStageDuration: bind(getShowdownTimingModel, "allInRunoutStageDuration", 0),
      showdownAnimationStartAt: bind(getShowdownTimingModel, "showdownAnimationStartAt", 0),
      showdownElapsedMs: bind(getShowdownTimingModel, "showdownElapsedMs", 0),
      showdownRevealDuration: bind(getShowdownTimingModel, "showdownRevealDuration", 0),
      allInRunoutDuration: bind(getShowdownTimingModel, "allInRunoutDuration", 0),
      allInBoardRunoutStartMs: bind(getShowdownTimingModel, "allInBoardRunoutStartMs", 0),
      showdownPhaseTiming: bind(getShowdownTimingModel, "showdownPhaseTiming", () => ({ revealMs: 0, allInMs: 0, winnerAt: 0, awardAt: 0, potSettledAt: 0, doneAt: 0 })),
      showdownWinnerVisible: bind(getShowdownTimingModel, "showdownWinnerVisible", true),
      showdownAwardVisible: bind(getShowdownTimingModel, "showdownAwardVisible", true),
      showdownHasSinglePotAward: bind(getShowdownTimingModel, "showdownHasSinglePotAward", false),
      showdownPotAwardSettled: bind(getShowdownTimingModel, "showdownPotAwardSettled", true),
      showdownVisualSequenceActive: bind(getShowdownTimingModel, "showdownVisualSequenceActive", false),
      showdownSeatVisibilityLockActive: bind(getShowdownTimingModel, "showdownSeatVisibilityLockActive", false),
      showdownTerminalControlsLocked: bind(getShowdownTimingModel, "showdownTerminalControlsLocked", false),
      showdownAutoDealHoldMs: bind(getShowdownTimingModel, "showdownAutoDealHoldMs", 0),
      primeShowdownAnimation: bind(getShowdownTimingModel, "primeShowdownAnimation", undefined),

      primeActionReveal: bind(getActionRevealModel, "primeActionReveal", undefined),

      scheduleActionRevealUnlock: bind(getVisualTimerModel, "scheduleActionRevealUnlock", undefined),
      scheduleActionControlUnlock: bind(getVisualTimerModel, "scheduleActionControlUnlock", undefined),
      clearActionRevealTimer: bind(getVisualTimerModel, "clearActionRevealTimer", undefined),
      clearAllActionRevealTimers: bind(getVisualTimerModel, "clearAllActionRevealTimers", undefined),
      isActionRevealLocked: bind(getVisualTimerModel, "isActionRevealLocked", false),
      isActionSequenceActive: bind(getVisualTimerModel, "isActionSequenceActive", false),
      isVisualActive: bind(getVisualTimerModel, "isVisualActive", false),
      scheduleVisualUnlock: bind(getVisualTimerModel, "scheduleVisualUnlock", undefined),
      scheduleShowdownRender: bind(getVisualTimerModel, "scheduleShowdownRender", undefined),
      schedulePotFlightSettle: bind(getVisualTimerModel, "schedulePotFlightSettle", undefined),
      scheduleBetMarkerLandingRenders: bind(getVisualTimerModel, "scheduleBetMarkerLandingRenders", undefined),
      scheduleBetMarkerLandingRender: bind(getVisualTimerModel, "scheduleBetMarkerLandingRender", undefined),
      scheduleActionBoardRevealRenders: bind(getVisualTimerModel, "scheduleActionBoardRevealRenders", undefined),
      scheduleFoldMuckRenders: bind(getVisualTimerModel, "scheduleFoldMuckRenders", undefined),
      scheduleFoldMuckRender: bind(getVisualTimerModel, "scheduleFoldMuckRender", undefined),
      scheduleFoldMuckCleanupRender: bind(getVisualTimerModel, "scheduleFoldMuckCleanupRender", undefined),
      clearVisualTimersForTable: bind(getVisualTimerModel, "clearVisualTimersForTable", undefined),
      clearAllVisualTimers: bind(getVisualTimerModel, "clearAllVisualTimers", undefined),
      isPaused: bind(getVisualTimerModel, "isPaused", false),
      isLifecycleFrozen: bind(getVisualTimerModel, "isLifecycleFrozen", false),
      visualTimersFrozen: bind(getVisualTimerModel, "visualTimersFrozen", false),
      togglePause: bind(getVisualTimerModel, "togglePause", undefined),
      shiftTableVisualDeadlines: bind(getVisualTimerModel, "shiftTableVisualDeadlines", undefined),
      rescheduleVisualDeadline: bind(getVisualTimerModel, "rescheduleVisualDeadline", undefined),
      rescheduleTableVisualTimersAfterPause: bind(getVisualTimerModel, "rescheduleTableVisualTimersAfterPause", undefined),
      collapseExpiredDealReveal: bind(getVisualTimerModel, "collapseExpiredDealReveal", false),
      setPaused: bind(getVisualTimerModel, "setPaused", undefined),
      handlePageHide: bind(getVisualTimerModel, "handlePageHide", undefined),
      handlePageShow: bind(getVisualTimerModel, "handlePageShow", undefined),

      primeDealReveal: bind(getVisualPrimer, "primeDealReveal", undefined),
      blindLevelAnnouncementDuration: bind(getVisualPrimer, "blindLevelAnnouncementDuration", 0),
      primeBlindLevelAnnouncement: bind(getVisualPrimer, "primeBlindLevelAnnouncement", undefined),
      dealRevealDurationForTable: bind(getVisualPrimer, "dealRevealDurationForTable", 0),
      primeBoardReveal: bind(getVisualPrimer, "primeBoardReveal", undefined),

      renderDenominationChipStack: bind(getRenderSupport, "renderDenominationChipStack", ""),

      toggleAmountMode: bind(getShellControls, "toggleAmountMode", undefined),
      isAmountModeToggleTarget: bind(getShellControls, "isAmountModeToggleTarget", false),
      syncPauseButton: bind(getShellControls, "syncPauseButton", undefined),
      syncDealButton: bind(getShellControls, "syncDealButton", undefined)
    };
  }

  root.PokerSimulatorVisualBridge = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorVisualBridge;
})();
