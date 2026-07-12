// Timing constants for poker-simulator.html UI runtime, exposed as a
// global namespace `window.PokerSimulatorTimings`. Loaded BEFORE
// simulator.js (см. <script> порядок в poker-simulator.html), потому
// что simulator.js читает значения отсюда вместо локальных const'ов.
//
// Принцип: тайминги inter-related, тюньте ГРУППОЙ (A/B/C/D/E/F), не
// индивидуально. Они подобраны так, чтобы анимация фишек + объявление
// действия + следующая раздача выглядели плавно в концерте. Изменил
// одно — сверь группу.
//
// Все значения в миллисекундах.

(function () {
  const timings = {
    // Group A: between-hand auto-deal cadence
    defaultAutoDealDelayMs: 1750,   // dead wait AFTER the reveal/showdown visual completes, before the next hand
    turboAutoDealDelayMs: 1400,     // turbo override (snappier between-hand wait)

    // Group B: per-action animation (bot think + reveal + settle).
    // Hero actions are fast context; bot actions are paced by intent so
    // fold/call/bet/all-in do not feel like the same event.
    actionThinkDurationMs: 990,     // fallback "thinking" beat before bot acts
    foldThinkDurationMs: 560,
    passiveThinkDurationMs: 860,
    aggressiveThinkDurationMs: 1070,
    allInThinkDurationMs: 1260,
    actionRevealDurationMs: 2170,   // fallback action chip/text fly-in
    heroActionRevealDurationMs: 462,
    foldActionRevealDurationMs: 1568,
    passiveActionRevealDurationMs: 1988,
    aggressiveActionRevealDurationMs: 2240,
    allInActionRevealDurationMs: 2520,
    actionSettleDurationMs: 504,    // fallback post-action settle pause
    heroActionSettleDurationMs: 98,
    foldActionSettleDurationMs: 308,
    passiveActionSettleDurationMs: 476,
    aggressiveActionSettleDurationMs: 616,
    allInActionSettleDurationMs: 756,
    riverDecisionThinkDurationMs: 1280,
    riverCallActionRevealDurationMs: 2464,
    riverFoldActionRevealDurationMs: 2044,
    riverDecisionSettleDurationMs: 1200,
    riverCallChipFlightDurationMs: 1288,
    riverResolutionCueDurationMs: 854,
    actionControlUnlockDurationMs: 658,
    postflopActionControlUnlockDurationMs: 546,
    aggressiveActionControlUnlockDurationMs: 630,
    allInActionControlUnlockDurationMs: 784,
    actionControlSettleDurationMs: 84,

    // Compact mode is used for fast tempo. It stays quick, but bot decisions
    // need enough air to read as a deliberate action sequence.
    compactActionThinkDurationMs: 540,
    compactFoldThinkDurationMs: 390,
    compactPassiveThinkDurationMs: 585,
    compactAggressiveThinkDurationMs: 750,
    compactAllInThinkDurationMs: 960,
    compactActionRevealDurationMs: 840,
    compactHeroActionRevealDurationMs: 126,
    compactFoldActionRevealDurationMs: 645,
    compactPassiveActionRevealDurationMs: 840,
    compactAggressiveActionRevealDurationMs: 1020,
    compactAllInActionRevealDurationMs: 1230,
    compactActionSettleDurationMs: 195,
    compactHeroActionSettleDurationMs: 28,
    compactFoldActionSettleDurationMs: 150,
    compactPassiveActionSettleDurationMs: 210,
    compactAggressiveActionSettleDurationMs: 270,
    compactAllInActionSettleDurationMs: 360,
    compactRiverDecisionThinkDurationMs: 930,
    compactRiverCallActionRevealDurationMs: 1230,
    compactRiverFoldActionRevealDurationMs: 930,
    compactRiverDecisionSettleDurationMs: 540,
    compactRiverCallChipFlightDurationMs: 525,
    compactRiverResolutionCueDurationMs: 483,
    compactRiverFoldCueDelayMs: 147,
    compactActionControlUnlockDurationMs: 399,
    compactPostflopActionControlUnlockDurationMs: 357,
    compactAggressiveActionControlUnlockDurationMs: 431,
    compactAllInActionControlUnlockDurationMs: 546,
    compactActionControlSettleDurationMs: 47,

    // Group C: chip + deal animations on the felt
    chipRevealDurationMs: 1302,     // fallback chip presence (announcement + flight)
    chipAnnouncementDelayMs: 196,   // hold AFTER action text appears before bot chips fly
    passiveChipFlightDurationMs: 1022,
    aggressiveChipFlightDurationMs: 1162,
    allInChipFlightDurationMs: 1358,
    dealCardDurationMs: 574,        // one flying hole-card animation
    dealSeatGapMs: 45,              // round-robin cadence between seats
    dealRevealTailMs: 84,          // tiny tail after the last card lands
    dealRevealDurationMs: 1330,     // legacy fallback for hole-cards deal animation
    compactChipRevealDurationMs: 525,
    compactChipAnnouncementDelayMs: 84,
    compactPassiveChipFlightDurationMs: 336,
    compactAggressiveChipFlightDurationMs: 410,
    compactAllInChipFlightDurationMs: 525,
    betMarkerSettleDurationMs: 180,
    compactBetMarkerSettleDurationMs: 72,
    compactDealCardDurationMs: 294,
    compactDealSeatGapMs: 27,
    compactDealRevealTailMs: 49,
    // Fold-muck card slide-out. Full values match the single-table CSS so its
    // feel is unchanged; compact values are kept SHORT (online-client snappy,
    // ~0.3s) so the muck finishes inside the compact/turbo fold-reveal window
    // instead of being yanked mid-slide (see renderFoldMuckForAction).
    muckDurationMs: 1295,
    riverMuckDurationMs: 1470,
    compactMuckDurationMs: 210,
    compactRiverMuckDurationMs: 238,

    // Group D: board (flop/turn/river) reveal
    boardRevealDurationMs: 1015,    // street card slide-in
    boardCardStaggerMs: 135,        // per-card offset inside a street reveal
    boardSettleDurationMs: 238,     // brief pause before next street
    compactBoardRevealDurationMs: 378,
    compactBoardSettleDurationMs: 91,

    // Group E: visual-unlock buffers — small tails added past the
    // animation end so the unlock timer fires AFTER pixels finish moving.
    visualUnlockBufferMs: 112,      // generic post-animation tail

    // Group F: showdown / all-in reveal cadence
    showdownRevealStepMs: 546,      // one contesting seat flips per beat
    showdownCardSettleMs: 504,      // pause after the last hole-card reveal
    showdownWinnerSettleMs: 686,    // combo highlight after cards/equity settle
    showdownPotSettleMs: 651,       // delay before the pot flies to winner
    showdownPotAwardMotionMs: 2520, // CSS potAward duration + its start delay
    showdownDoneHoldMs: 910,       // keep result readable before auto-deal
    allInHandRevealHoldMs: 784,    // equity is visible before board runout starts
    allInRunoutStageMs: 1460,      // covers flop reveal + stagger + deal grace during all-in
    allInBoardDealGraceMs: 140,    // tail after the final staggered board card
    compactShowdownRevealStepMs: 252,
    compactShowdownCardSettleMs: 196,
    compactShowdownWinnerSettleMs: 301,
    compactShowdownPotSettleMs: 266,
    compactShowdownPotAwardMotionMs: 2520,
    compactShowdownDoneHoldMs: 714,
    compactAllInHandRevealHoldMs: 392,
    compactAllInRunoutStageMs: 720,

    // Group G2: all-in response beats — villains answering Hero's shove.
    // The all-in showdown is the climactic teaching moment, so these are
    // DELIBERATELY FIXED: they are applied unconditionally (never zeroed by
    // reduced-motion, never halved by turbo / 2-4 tables). One beat is
    // think -> fold/call -> settle (~1s); a typical fold+call before the
    // runout reveal lands at ~2s. Chip-flight motion (if any) still rides on
    // top in full single-table mode and is suppressed under reduced-motion.
    allInResponseThinkMs: 645,
    allInResponseRevealMs: 720,
    allInResponseSettleMs: 135
  };

  Object.freeze(timings);
  window.PokerSimulatorTimings = timings;
})();
