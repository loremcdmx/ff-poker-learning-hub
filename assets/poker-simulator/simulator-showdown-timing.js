(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getSettings = typeof options.getSettings === "function" ? options.getSettings : () => ({});
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const prefersReducedMotion = typeof options.prefersReducedMotion === "function" ? options.prefersReducedMotion : () => false;
    const reducedTableMotion = typeof options.reducedTableMotion === "function" ? options.reducedTableMotion : () => false;
    const boardRevealMs = typeof options.boardRevealMs === "function" ? options.boardRevealMs : () => 0;
    const allInRunoutStages = typeof options.allInRunoutStages === "function" ? options.allInRunoutStages : () => [];
    const showdownRevealOrder = typeof options.showdownRevealOrder === "function" ? options.showdownRevealOrder : () => [];
    const scheduleShowdownRender = typeof options.scheduleShowdownRender === "function" ? options.scheduleShowdownRender : () => {};
    const durations = options.durations || {};

    const showdownRevealStepMs = numberOr(durations.showdownRevealStepMs, 0);
    const showdownCardSettleMs = numberOr(durations.showdownCardSettleMs, 0);
    const showdownWinnerSettleMs = numberOr(durations.showdownWinnerSettleMs, 0);
    const showdownPotSettleMs = numberOr(durations.showdownPotSettleMs, 0);
    const showdownPotAwardMotionMs = numberOr(durations.showdownPotAwardMotionMs, 0);
    const showdownDoneHoldMs = numberOr(durations.showdownDoneHoldMs, 0);
    const allInHandRevealHoldMs = numberOr(durations.allInHandRevealHoldMs, 0);
    const allInRunoutStageMs = numberOr(durations.allInRunoutStageMs, 1);
    const compactShowdownRevealStepMs = numberOr(durations.compactShowdownRevealStepMs, showdownRevealStepMs);
    const compactShowdownCardSettleMs = numberOr(durations.compactShowdownCardSettleMs, showdownCardSettleMs);
    const compactShowdownWinnerSettleMs = numberOr(durations.compactShowdownWinnerSettleMs, showdownWinnerSettleMs);
    const compactShowdownPotSettleMs = numberOr(durations.compactShowdownPotSettleMs, showdownPotSettleMs);
    const compactShowdownPotAwardMotionMs = numberOr(durations.compactShowdownPotAwardMotionMs, showdownPotAwardMotionMs);
    const compactShowdownDoneHoldMs = numberOr(durations.compactShowdownDoneHoldMs, showdownDoneHoldMs);
    const compactAllInHandRevealHoldMs = numberOr(durations.compactAllInHandRevealHoldMs, allInHandRevealHoldMs);
    const compactAllInRunoutStageMs = numberOr(durations.compactAllInRunoutStageMs, allInRunoutStageMs);

    function numberOr(value, fallback) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function compactMs(compactMsValue) {
      return Math.max(0, Math.round(Number(compactMsValue || 0)));
    }

    function showdownCompactTimingMs(fullMs, compactMsValue, table = null) {
      if (table && table.allInRunout) return fullMs;
      if (prefersReducedMotion()) return 0;
      return reducedTableMotion() ? compactMs(compactMsValue) : fullMs;
    }

    function showdownRevealStepDuration(table = null) {
      return showdownCompactTimingMs(showdownRevealStepMs, compactShowdownRevealStepMs, table);
    }

    function showdownCardSettleDuration(table = null) {
      return showdownCompactTimingMs(showdownCardSettleMs, compactShowdownCardSettleMs, table);
    }

    function showdownWinnerSettleDuration(table = null) {
      return showdownCompactTimingMs(showdownWinnerSettleMs, compactShowdownWinnerSettleMs, table);
    }

    function showdownPotSettleDuration(table = null) {
      return showdownCompactTimingMs(showdownPotSettleMs, compactShowdownPotSettleMs, table);
    }

    function showdownPotAwardMotionDuration(table = null) {
      if (prefersReducedMotion()) return 0;
      if (table && table.allInRunout) return showdownPotAwardMotionMs;
      return reducedTableMotion() ? compactMs(compactShowdownPotAwardMotionMs) : showdownPotAwardMotionMs;
    }

    function showdownDoneHoldDuration(table = null) {
      const settings = getSettings() || {};
      const compactHold = settings.turboMode ? Math.round(compactShowdownDoneHoldMs * 0.75) : compactShowdownDoneHoldMs;
      return showdownCompactTimingMs(showdownDoneHoldMs, compactHold, table);
    }

    function allInHandRevealHoldDuration(table = null) {
      return showdownCompactTimingMs(allInHandRevealHoldMs, compactAllInHandRevealHoldMs, table);
    }

    function allInRunoutStageDuration(table = null) {
      return showdownCompactTimingMs(allInRunoutStageMs, compactAllInRunoutStageMs, table);
    }

    function showdownAnimationStartAt(table) {
      if (!table || table.status !== "showdown") return 0;
      const startedAt = Number(table.showdownAnimationStartedAt || 0) || now();
      return Math.max(
        startedAt,
        Number(table.actionRevealUntil || 0),
        Number(table.boardRevealUntil || 0),
        Number(table.potFlightUntil || 0)
      );
    }

    function showdownElapsedMs(table) {
      const startAt = showdownAnimationStartAt(table);
      return startAt ? now() - startAt : 0;
    }

    function showdownRevealDuration(table) {
      const order = showdownRevealOrder(table) || [];
      const step = showdownRevealStepDuration(table);
      const maxRevealDelay = order.reduce((max, seatId, index) => {
        return Number(seatId) === 0 ? max : Math.max(max, index * step);
      }, 0);
      return maxRevealDelay + showdownCardSettleDuration(table) + 400;
    }

    function allInBoardRunoutStartMs(table) {
      return Math.max(allInHandRevealHoldDuration(table), showdownRevealDuration(table));
    }

    function allInRunoutDuration(table) {
      const stages = allInRunoutStages(table);
      if (!stages.length) return 0;
      const boardSteps = Math.max(0, stages.length - 1);
      return allInBoardRunoutStartMs(table) + (boardSteps * allInRunoutStageDuration(table)) + boardRevealMs();
    }

    function showdownPhaseTiming(table) {
      const revealMs = showdownRevealDuration(table);
      const allInMs = table?.allInRunout ? allInRunoutDuration(table) : 0;
      const winnerAt = Math.max(revealMs, allInMs) + showdownWinnerSettleDuration(table);
      const awardAt = winnerAt + showdownPotSettleDuration(table);
      const potSettledAt = showdownHasSinglePotAward(table)
        ? awardAt + showdownPotAwardMotionDuration(table)
        : awardAt;
      const doneAt = Math.max(potSettledAt, awardAt + showdownDoneHoldDuration(table));
      return { revealMs, allInMs, winnerAt, awardAt, potSettledAt, doneAt };
    }

    function immediateShowdown(table) {
      if (!table || table.status !== "showdown") return true;
      if (!table.showdownAnimationStartedAt) return true;
      return prefersReducedMotion() && !table.allInRunout;
    }

    function showdownWinnerVisible(table) {
      if (immediateShowdown(table)) return true;
      return showdownElapsedMs(table) >= showdownPhaseTiming(table).winnerAt;
    }

    function showdownAwardVisible(table) {
      if (immediateShowdown(table)) return true;
      return showdownElapsedMs(table) >= showdownPhaseTiming(table).awardAt;
    }

    function showdownHasSinglePotAward(table) {
      if (!table || table.status !== "showdown" || !(Number(table.pot) > 0)) return false;
      const awardSeatIds = showdownAwardRecipientSeatIds(table);
      const winnerSeatIds = showdownWinnerSeatIds(table);
      if (awardSeatIds.size || winnerSeatIds.size) {
        const visualWinnerSeatIds = new Set([...awardSeatIds, ...winnerSeatIds]);
        return visualWinnerSeatIds.size === 1;
      }
      const winners = Array.isArray(table?.showdown?.winners) ? table.showdown.winners : [];
      if (winners.length) return winners.length === 1;
      return !String(table.result || "").startsWith("Split");
    }

    function showdownAwardRecipientSeatIds(table) {
      const seatIds = new Set();
      collectAwardSeatIds(seatIds, table?.potAwards);
      collectAwardSeatIds(seatIds, table?.showdown?.potAwards);
      collectAwardSeatIds(seatIds, table?.showdown?.potWinners);
      return seatIds;
    }

    function collectAwardSeatIds(seatIds, awards) {
      if (Array.isArray(awards)) {
        awards.forEach((award) => {
          if (!award || typeof award !== "object") return;
          addPositiveAwardSeatId(seatIds, award.seatId ?? award.id, award.amount ?? award.chips ?? award.value);
        });
        return;
      }
      if (!awards || typeof awards !== "object") return;
      Object.entries(awards).forEach(([seatId, amount]) => addPositiveAwardSeatId(seatIds, seatId, amount));
    }

    function addPositiveAwardSeatId(seatIds, seatId, amount) {
      const normalizedSeatId = normalizeSeatId(seatId);
      if (normalizedSeatId === null) return;
      if (!(Number(amount) > 0)) return;
      seatIds.add(normalizedSeatId);
    }

    function showdownWinnerSeatIds(table) {
      const seatIds = new Set();
      const winners = Array.isArray(table?.showdown?.winners) ? table.showdown.winners : [];
      winners.forEach((winner) => {
        const seatId = normalizeSeatId(winner?.seatId ?? winner?.id);
        if (seatId !== null) seatIds.add(seatId);
      });
      return seatIds;
    }

    function normalizeSeatId(seatId) {
      const normalizedSeatId = Number(seatId);
      return Number.isFinite(normalizedSeatId) ? normalizedSeatId : null;
    }

    function showdownPotAwardSettled(table) {
      if (!table || table.status !== "showdown") return true;
      if (!showdownHasSinglePotAward(table)) return true;
      if (immediateShowdown(table)) return true;
      return showdownElapsedMs(table) >= showdownPhaseTiming(table).potSettledAt;
    }

    function showdownVisualSequenceActive(table) {
      if (!table || table.status !== "showdown") return false;
      if (!table.showdownAnimationStartedAt) return false;
      if (prefersReducedMotion() && !table.allInRunout) return false;
      return showdownElapsedMs(table) < showdownPhaseTiming(table).doneAt;
    }

    function showdownSeatVisibilityLockActive(table) {
      if (!table || table.status !== "showdown") return false;
      return showdownVisualSequenceActive(table) || !showdownPotAwardSettled(table);
    }

    function showdownTerminalControlsLocked(table) {
      if (!table || table.status !== "showdown") return false;
      return showdownVisualSequenceActive(table) || !showdownPotAwardSettled(table);
    }

    function showdownAutoDealHoldMs(table) {
      if (!table || table.status !== "showdown") return 0;
      if (!table.showdownAnimationStartedAt) return 0;
      if (prefersReducedMotion() && !table.allInRunout) return 0;
      const dueAt = showdownAnimationStartAt(table) + showdownPhaseTiming(table).doneAt;
      return Math.max(0, dueAt - now());
    }

    function primeShowdownAnimation(table) {
      if (!table || table.status !== "showdown") return;
      if (!table.showdownAnimationStartedAt) table.showdownAnimationStartedAt = now();
      const startAt = showdownAnimationStartAt(table);
      // Freeze the showdown origin. showdownAnimationStartAt() is
      // max(showdownAnimationStartedAt, actionRevealUntil, ...) — it leans on
      // actionRevealUntil to hold every showdown (ordinary or all-in) past the
      // closing action cascade. But scheduleActionRevealUnlock clears that
      // barrier when the cascade ends. Without a persisted origin, ordinary
      // showdowns jump directly to the winner/award phase and all-in runouts can
      // skip board stages. (No-op when there is no cascade to outlast.)
      if (startAt > Number(table.showdownAnimationStartedAt || 0)) {
        table.showdownAnimationStartedAt = startAt;
      }
      const timing = showdownPhaseTiming(table);
      const offsets = new Set([0, timing.winnerAt, timing.awardAt, timing.potSettledAt, timing.doneAt]);
      if (table.allInRunout) {
        const stages = allInRunoutStages(table);
        const boardStart = allInBoardRunoutStartMs(table);
        stages.forEach((stage, index) => {
          const offset = index <= 0
            ? 0
            : boardStart + ((index - 1) * allInRunoutStageDuration(table));
          offsets.add(offset);
          offsets.add(offset + boardRevealMs() + 40);
        });
      } else {
        const order = showdownRevealOrder(table) || [];
        order.forEach((seatId, index) => {
          if (Number(seatId) === 0) return;
          offsets.add(index * showdownRevealStepDuration(table));
        });
      }
      table.showdownAnimationUntil = startAt + timing.doneAt;
      Array.from(offsets)
        .filter((offset) => Number.isFinite(Number(offset)) && Number(offset) >= 0)
        .forEach((offset) => scheduleShowdownRender(table, `phase-${Math.round(offset)}`, startAt + offset - now()));
    }

    return {
      showdownCompactTimingMs,
      showdownRevealStepDuration,
      showdownCardSettleDuration,
      showdownWinnerSettleDuration,
      showdownPotSettleDuration,
      showdownPotAwardMotionDuration,
      showdownDoneHoldDuration,
      allInHandRevealHoldDuration,
      allInRunoutStageDuration,
      showdownAnimationStartAt,
      showdownElapsedMs,
      showdownRevealDuration,
      allInRunoutDuration,
      allInBoardRunoutStartMs,
      showdownPhaseTiming,
      showdownWinnerVisible,
      showdownAwardVisible,
      showdownHasSinglePotAward,
      showdownPotAwardSettled,
      showdownVisualSequenceActive,
      showdownSeatVisibilityLockActive,
      showdownTerminalControlsLocked,
      showdownAutoDealHoldMs,
      primeShowdownAnimation
    };
  }

  root.PokerSimulatorShowdownTiming = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
