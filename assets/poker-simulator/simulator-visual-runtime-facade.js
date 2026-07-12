(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  const BRIDGE_KEYS = Object.freeze([
    "reducedTableMotion",
    "usesDecorativeMotionLayer",
    "prefersReducedMotion",
    "compactTimingMs",
    "riverResolutionKind",
    "actionRiverResolution",
    "isRiverResolutionAction",
    "riverResolutionCueMs",
    "riverResolutionCueDelayMs",
    "riverResolutionMotionMs",
    "actionRevealMs",
    "actionSettleMs",
    "chipFlightMs",
    "chipAnnouncementDelayForAction",
    "chipRevealMs",
    "betMarkerLandingMs",
    "boardRevealMs",
    "boardSettleMs",
    "actionRevealDuration",
    "actionVisualLeadMs",
    "actionSequenceElapsedMs",
    "actionTimingAtIndex",
    "actionControlReadyMs",
    "actionControlSettleMs",
    "actionControlUnlockDuration",
    "pendingBoardReveal",
    "shouldRevealBoardBeforeAction",
    "actionSequenceBoardRevealStages",
    "actionSequenceBoardRevealState",
    "boardRevealStartDelay",
    "boardRevealDelayRemaining",
    "showdownCompactTimingMs",
    "showdownRevealStepDuration",
    "showdownCardSettleDuration",
    "showdownWinnerSettleDuration",
    "showdownPotSettleDuration",
    "showdownPotAwardMotionDuration",
    "showdownDoneHoldDuration",
    "allInHandRevealHoldDuration",
    "allInRunoutStageDuration",
    "showdownAnimationStartAt",
    "showdownElapsedMs",
    "showdownRevealDuration",
    "allInRunoutDuration",
    "allInBoardRunoutStartMs",
    "showdownPhaseTiming",
    "showdownWinnerVisible",
    "showdownAwardVisible",
    "showdownHasSinglePotAward",
    "showdownPotAwardSettled",
    "showdownVisualSequenceActive",
    "showdownSeatVisibilityLockActive",
    "showdownTerminalControlsLocked",
    "showdownAutoDealHoldMs",
    "primeShowdownAnimation",
    "primeActionReveal",
    "primeDealReveal",
    "blindLevelAnnouncementDuration",
    "primeBlindLevelAnnouncement",
    "dealRevealDurationForTable",
    "primeBoardReveal",
    "scheduleActionRevealUnlock",
    "scheduleActionControlUnlock",
    "clearActionRevealTimer",
    "clearAllActionRevealTimers",
    "isActionRevealLocked",
    "isActionSequenceActive",
    "isVisualActive",
    "scheduleVisualUnlock",
    "scheduleShowdownRender",
    "schedulePotFlightSettle",
    "scheduleBetMarkerLandingRenders",
    "scheduleBetMarkerLandingRender",
    "scheduleActionBoardRevealRenders",
    "scheduleFoldMuckRenders",
    "scheduleFoldMuckRender",
    "scheduleFoldMuckCleanupRender",
    "clearVisualTimersForTable",
    "clearAllVisualTimers",
    "renderDenominationChipStack",
    "toggleAmountMode",
    "isAmountModeToggleTarget",
    "isPaused",
    "isLifecycleFrozen",
    "visualTimersFrozen",
    "syncPauseButton",
    "syncDealButton",
    "togglePause",
    "shiftTableVisualDeadlines",
    "rescheduleVisualDeadline",
    "rescheduleTableVisualTimersAfterPause",
    "collapseExpiredDealReveal",
    "setPaused",
    "handlePageHide",
    "handlePageShow"
  ]);

  const STATE_KEYS = Object.freeze([
    "captureHeroActionAnimation",
    "captureVisualSeatState",
    "annotateActionAnimationMotion",
    "actionAnimationIsAllIn",
    "actionHasChipFlight",
    "pendingPotFlightItems",
    "pendingBetMarkerLandingItems",
    "potAnimationState",
    "actionIndexForBetAnimation",
    "actionAnimationIndexForSeat",
    "actionAnimationHasStarted",
    "actionAnimationHasCompleted",
    "actionAnimationIsInMotion",
    "actionThinkMs",
    "allInRunoutStages",
    "allInRunoutStageState",
    "allInRunoutVisibleBoardLength",
    "allInRunoutShowsEquity",
    "allInEquityDisplayReady",
    "allInRunoutHasEquityStage",
    "allInEquityLayoutReady",
    "allInEquityForSeat",
    "outsLabel",
    "allInOutsForSeat",
    "showdownWinnerLabel",
    "showdownWinnerStatusText",
    "showdownHandSummary",
    "showdownPotAwardStatusText",
    "showdownParticipants",
    "showdownParticipantName",
    "showdownWinnerParticipants",
    "showdownPrimaryWinnerParticipant",
    "showdownWinningCards",
    "showdownRevealOrder",
    "revealDelayForSeat",
    "showdownWinningCardRoleMap",
    "showdownWinningCardRole",
    "isWinningCard",
    "seatMuckOutState",
    "seatVisuallyFolded",
    "seatOutsideContestedPot",
    "shouldRevealFoldedOpponentAfterFinish",
    "streetRank",
    "seatFoldedBeforeCurrentStreet",
    "seatActionStreet",
    "seatActionVisibleOnCurrentStreet",
    "visibleSeatAction",
    "visualSeatStateLockActive",
    "visualBaseSeatState",
    "showdownParticipantSeatIds",
    "eliminatedShowdownSeatStillVisible",
    "visibleSeatLobbyState",
    "visibleSeatStack",
    "winnerSeat",
    "seatIsWinner",
    "seatCardState",
    "revealStreetForSeat",
    "renderSimulationBadge",
    "renderPauseOverlay",
    "renderBlindLevelAnnouncement",
    "renderResultBanner",
    "renderActionStatus",
    "actionBarClass",
    "renderTournamentFinishScreen",
    "tournamentFinishScreenVisible",
    "tournamentWon",
    "tournamentFinishSummary",
    "formatTournamentPlace",
    "formatTournamentHands",
    "tournamentHandsLabel",
    "russianPlural",
    "resultTitle",
    "actionAnimationLabel",
    "renderMiniChipStack",
    "renderChipStack",
    "renderPotChipStack",
    "compactActionText",
    "actionRevealText"
  ]);

  const EFFECT_KEYS = Object.freeze([
    "isBetLanded",
    "retainBetAnimationsForActionSequence",
    "clearActionBubbleLatch",
    "renderSeatBets",
    "renderHeroFeltBet",
    "visibleSeatBetAmount",
    "renderBetFlights",
    "betFlightClass",
    "renderFoldedCardMucks",
    "renderFoldMuckForAction",
    "foldMuckCardStartPoint",
    "renderActionBubbles",
    "actionBubbleClasses",
    "riverResolutionCueEvent",
    "renderRiverResolutionCue",
    "actionBubbleLabel",
    "renderPotStacks",
    "renderPotAward"
  ]);

  function pick(source, keys) {
    const result = {};
    const model = source || {};
    keys.forEach((key) => {
      result[key] = model[key];
    });
    return result;
  }

  function copyPublic(target, source, keys) {
    keys.forEach((key) => {
      target[key] = source[key];
    });
  }

  function model(options = {}) {
    const visualBridge = options.visualBridge || {};
    const visualStateBridge = options.visualStateBridge || {};
    const tableEffectsBridge = options.tableEffectsBridge || {};
    const bridge = pick(visualBridge, BRIDGE_KEYS);
    const state = pick(visualStateBridge, STATE_KEYS);
    const effects = pick(tableEffectsBridge, EFFECT_KEYS);

    function publicApi(apiOptions = {}) {
      const facade = {
        visualBridge,
        visualStateBridge,
        tableEffectsBridge,
        composeCore: apiOptions.composeCore,
        composeRuntime: apiOptions.composeRuntime
      };
      copyPublic(facade, bridge, BRIDGE_KEYS);
      copyPublic(facade, state, STATE_KEYS);
      copyPublic(facade, effects, EFFECT_KEYS);
      return facade;
    }

    return {
      bridge,
      state,
      effects,
      publicApi
    };
  }

  root.PokerSimulatorVisualRuntimeFacade = {
    model,
    keys: {
      bridge: BRIDGE_KEYS,
      state: STATE_KEYS,
      effects: EFFECT_KEYS
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorVisualRuntimeFacade;
})();
