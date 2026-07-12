(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(timings = {}) {
    const chipRevealDurationMs = direct(timings, "chipRevealDurationMs");
    const chipAnnouncementDelayMs = direct(timings, "chipAnnouncementDelayMs");
    const chipFlightFallbackMs = Math.max(0, Number(chipRevealDurationMs || 0) - Number(chipAnnouncementDelayMs || 0));

    return freeze({
      defaultAutoDealDelayMs: direct(timings, "defaultAutoDealDelayMs"),
      turboAutoDealDelayMs: direct(timings, "turboAutoDealDelayMs"),
      pauseDeferPollMs: 200,
      visualUnlockBufferMs: direct(timings, "visualUnlockBufferMs"),
      dealSeatGapMs: duration(timings, "dealSeatGapMs", 64),
      compactDealSeatGapMs: duration(timings, "compactDealSeatGapMs", 38),
      dealCardDurationMs: duration(timings, "dealCardDurationMs", 820),
      compactDealCardDurationMs: duration(timings, "compactDealCardDurationMs", 420),
      boardCardStaggerMs: duration(timings, "boardCardStaggerMs", 135),
      actionVisualDurations: freeze({
        actionThinkDurationMs: direct(timings, "actionThinkDurationMs"),
        foldThinkDurationMs: duration(timings, "foldThinkDurationMs", 520),
        passiveThinkDurationMs: duration(timings, "passiveThinkDurationMs", 820),
        aggressiveThinkDurationMs: duration(timings, "aggressiveThinkDurationMs", 1020),
        allInThinkDurationMs: duration(timings, "allInThinkDurationMs", 1200),
        actionRevealDurationMs: direct(timings, "actionRevealDurationMs"),
        heroActionRevealDurationMs: duration(timings, "heroActionRevealDurationMs", 660),
        foldActionRevealDurationMs: duration(timings, "foldActionRevealDurationMs", 1120),
        passiveActionRevealDurationMs: duration(timings, "passiveActionRevealDurationMs", 1420),
        aggressiveActionRevealDurationMs: duration(timings, "aggressiveActionRevealDurationMs", 1600),
        allInActionRevealDurationMs: duration(timings, "allInActionRevealDurationMs", 1800),
        actionSettleDurationMs: direct(timings, "actionSettleDurationMs"),
        heroActionSettleDurationMs: duration(timings, "heroActionSettleDurationMs", 140),
        foldActionSettleDurationMs: duration(timings, "foldActionSettleDurationMs", 220),
        passiveActionSettleDurationMs: duration(timings, "passiveActionSettleDurationMs", 340),
        aggressiveActionSettleDurationMs: duration(timings, "aggressiveActionSettleDurationMs", 440),
        allInActionSettleDurationMs: duration(timings, "allInActionSettleDurationMs", 540),
        riverDecisionThinkDurationMs: duration(timings, "riverDecisionThinkDurationMs", 1220),
        riverCallActionRevealDurationMs: duration(timings, "riverCallActionRevealDurationMs", 1760),
        riverFoldActionRevealDurationMs: duration(timings, "riverFoldActionRevealDurationMs", 1460),
        riverDecisionSettleDurationMs: duration(timings, "riverDecisionSettleDurationMs", 1180),
        riverCallChipFlightDurationMs: duration(timings, "riverCallChipFlightDurationMs", 1840),
        riverResolutionCueDurationMs: duration(timings, "riverResolutionCueDurationMs", 1220),
        actionControlUnlockDurationMs: duration(timings, "actionControlUnlockDurationMs", 940),
        postflopActionControlUnlockDurationMs: duration(timings, "postflopActionControlUnlockDurationMs", 780),
        aggressiveActionControlUnlockDurationMs: duration(timings, "aggressiveActionControlUnlockDurationMs", 900),
        allInActionControlUnlockDurationMs: duration(timings, "allInActionControlUnlockDurationMs", 1120),
        actionControlSettleDurationMs: duration(timings, "actionControlSettleDurationMs", 120),
        compactActionThinkDurationMs: duration(timings, "compactActionThinkDurationMs", 540),
        compactFoldThinkDurationMs: duration(timings, "compactFoldThinkDurationMs", 390),
        compactPassiveThinkDurationMs: duration(timings, "compactPassiveThinkDurationMs", 585),
        compactAggressiveThinkDurationMs: duration(timings, "compactAggressiveThinkDurationMs", 750),
        compactAllInThinkDurationMs: duration(timings, "compactAllInThinkDurationMs", 960),
        compactActionRevealDurationMs: duration(timings, "compactActionRevealDurationMs", 840),
        compactHeroActionRevealDurationMs: duration(timings, "compactHeroActionRevealDurationMs", 180),
        compactFoldActionRevealDurationMs: duration(timings, "compactFoldActionRevealDurationMs", 645),
        compactPassiveActionRevealDurationMs: duration(timings, "compactPassiveActionRevealDurationMs", 840),
        compactAggressiveActionRevealDurationMs: duration(timings, "compactAggressiveActionRevealDurationMs", 1020),
        compactAllInActionRevealDurationMs: duration(timings, "compactAllInActionRevealDurationMs", 1230),
        compactActionSettleDurationMs: duration(timings, "compactActionSettleDurationMs", 195),
        compactHeroActionSettleDurationMs: duration(timings, "compactHeroActionSettleDurationMs", 40),
        compactFoldActionSettleDurationMs: duration(timings, "compactFoldActionSettleDurationMs", 150),
        compactPassiveActionSettleDurationMs: duration(timings, "compactPassiveActionSettleDurationMs", 210),
        compactAggressiveActionSettleDurationMs: duration(timings, "compactAggressiveActionSettleDurationMs", 270),
        compactAllInActionSettleDurationMs: duration(timings, "compactAllInActionSettleDurationMs", 360),
        compactRiverDecisionThinkDurationMs: duration(timings, "compactRiverDecisionThinkDurationMs", 930),
        compactRiverCallActionRevealDurationMs: duration(timings, "compactRiverCallActionRevealDurationMs", 1230),
        compactRiverFoldActionRevealDurationMs: duration(timings, "compactRiverFoldActionRevealDurationMs", 930),
        compactRiverDecisionSettleDurationMs: duration(timings, "compactRiverDecisionSettleDurationMs", 540),
        compactRiverCallChipFlightDurationMs: duration(timings, "compactRiverCallChipFlightDurationMs", 525),
        compactRiverResolutionCueDurationMs: duration(timings, "compactRiverResolutionCueDurationMs", 483),
        compactRiverFoldCueDelayMs: duration(timings, "compactRiverFoldCueDelayMs", 147),
        compactActionControlUnlockDurationMs: duration(timings, "compactActionControlUnlockDurationMs", 399),
        compactPostflopActionControlUnlockDurationMs: duration(timings, "compactPostflopActionControlUnlockDurationMs", 357),
        compactAggressiveActionControlUnlockDurationMs: duration(timings, "compactAggressiveActionControlUnlockDurationMs", 431),
        compactAllInActionControlUnlockDurationMs: duration(timings, "compactAllInActionControlUnlockDurationMs", 546),
        compactActionControlSettleDurationMs: duration(timings, "compactActionControlSettleDurationMs", 47),
        chipRevealDurationMs,
        chipAnnouncementDelayMs,
        passiveChipFlightDurationMs: duration(timings, "passiveChipFlightDurationMs", chipFlightFallbackMs),
        aggressiveChipFlightDurationMs: duration(timings, "aggressiveChipFlightDurationMs", chipFlightFallbackMs),
        allInChipFlightDurationMs: duration(timings, "allInChipFlightDurationMs", chipFlightFallbackMs),
        compactChipRevealDurationMs: duration(timings, "compactChipRevealDurationMs", 525),
        compactChipAnnouncementDelayMs: duration(timings, "compactChipAnnouncementDelayMs", 84),
        compactPassiveChipFlightDurationMs: duration(timings, "compactPassiveChipFlightDurationMs", 336),
        compactAggressiveChipFlightDurationMs: duration(timings, "compactAggressiveChipFlightDurationMs", 410),
        compactAllInChipFlightDurationMs: duration(timings, "compactAllInChipFlightDurationMs", 525),
        betMarkerSettleDurationMs: duration(timings, "betMarkerSettleDurationMs", 180),
        compactBetMarkerSettleDurationMs: duration(timings, "compactBetMarkerSettleDurationMs", 72),
        boardRevealDurationMs: direct(timings, "boardRevealDurationMs"),
        boardSettleDurationMs: direct(timings, "boardSettleDurationMs"),
        compactBoardRevealDurationMs: duration(timings, "compactBoardRevealDurationMs", 540),
        compactBoardSettleDurationMs: duration(timings, "compactBoardSettleDurationMs", 130),
        allInResponseThinkMs: duration(timings, "allInResponseThinkMs", 645),
        allInResponseRevealMs: duration(timings, "allInResponseRevealMs", 720),
        allInResponseSettleMs: duration(timings, "allInResponseSettleMs", 135)
      }),
      showdownDurations: freeze({
        showdownRevealStepMs: duration(timings, "showdownRevealStepMs", 780),
        showdownCardSettleMs: duration(timings, "showdownCardSettleMs", 720),
        showdownWinnerSettleMs: duration(timings, "showdownWinnerSettleMs", 980),
        showdownPotSettleMs: duration(timings, "showdownPotSettleMs", 930),
        showdownPotAwardMotionMs: duration(timings, "showdownPotAwardMotionMs", 2520),
        showdownDoneHoldMs: duration(timings, "showdownDoneHoldMs", 1900),
        allInHandRevealHoldMs: duration(timings, "allInHandRevealHoldMs", 1120),
        allInRunoutStageMs: duration(timings, "allInRunoutStageMs", 1400),
        allInBoardDealGraceMs: duration(timings, "allInBoardDealGraceMs", 140),
        compactShowdownRevealStepMs: duration(timings, "compactShowdownRevealStepMs", 360),
        compactShowdownCardSettleMs: duration(timings, "compactShowdownCardSettleMs", 280),
        compactShowdownWinnerSettleMs: duration(timings, "compactShowdownWinnerSettleMs", 430),
        compactShowdownPotSettleMs: duration(timings, "compactShowdownPotSettleMs", 380),
        compactShowdownPotAwardMotionMs: duration(timings, "compactShowdownPotAwardMotionMs", 2520),
        compactShowdownDoneHoldMs: duration(timings, "compactShowdownDoneHoldMs", 1020),
        compactAllInHandRevealHoldMs: duration(timings, "compactAllInHandRevealHoldMs", 560),
        compactAllInRunoutStageMs: duration(timings, "compactAllInRunoutStageMs", 720)
      }),
      visualPrimerDurations: freeze({
        dealRevealDurationMs: direct(timings, "dealRevealDurationMs"),
        dealCardDurationMs: duration(timings, "dealCardDurationMs", 820),
        dealSeatGapMs: duration(timings, "dealSeatGapMs", 64),
        dealRevealTailMs: duration(timings, "dealRevealTailMs", 120),
        compactDealCardDurationMs: duration(timings, "compactDealCardDurationMs", 420),
        compactDealSeatGapMs: duration(timings, "compactDealSeatGapMs", 38),
        compactDealRevealTailMs: duration(timings, "compactDealRevealTailMs", 70),
        visualUnlockBufferMs: direct(timings, "visualUnlockBufferMs"),
        blindLevelAnnouncementMs: duration(timings, "blindLevelAnnouncementMs", 3400),
        compactBlindLevelAnnouncementMs: duration(timings, "compactBlindLevelAnnouncementMs", 1800)
      }),
      tableEffectDurations: freeze({
        muckDurationMs: duration(timings, "muckDurationMs", 1850),
        compactMuckDurationMs: duration(timings, "compactMuckDurationMs", 300),
        riverMuckDurationMs: duration(timings, "riverMuckDurationMs", 2100),
        compactRiverMuckDurationMs: duration(timings, "compactRiverMuckDurationMs", 340)
      })
    });
  }

  function direct(timings, key) {
    return timings?.[key];
  }

  function duration(timings, key, fallback) {
    // Honor an explicit 0ms timing: `|| fallback` would coerce a valid 0 to the
    // fallback. Only fall back when the value is non-finite (missing/NaN).
    const value = timings?.[key];
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function freeze(value) {
    return Object.freeze(value);
  }

  root.PokerSimulatorTimingConfig = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
