(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const actionVisualLeadMs = typeof options.actionVisualLeadMs === "function" ? options.actionVisualLeadMs : () => 0;
    const boardRevealStartDelay = typeof options.boardRevealStartDelay === "function" ? options.boardRevealStartDelay : () => 0;
    const primeBoardReveal = typeof options.primeBoardReveal === "function" ? options.primeBoardReveal : () => {};
    const actionRevealDuration = typeof options.actionRevealDuration === "function" ? options.actionRevealDuration : () => 0;
    const actionControlUnlockDuration = typeof options.actionControlUnlockDuration === "function" ? options.actionControlUnlockDuration : () => 0;
    const schedulePotFlightSettle = typeof options.schedulePotFlightSettle === "function" ? options.schedulePotFlightSettle : () => {};
    const scheduleBetMarkerLandingRenders = typeof options.scheduleBetMarkerLandingRenders === "function" ? options.scheduleBetMarkerLandingRenders : () => {};
    const scheduleActionBoardRevealRenders = typeof options.scheduleActionBoardRevealRenders === "function" ? options.scheduleActionBoardRevealRenders : () => {};
    const scheduleFoldMuckRenders = typeof options.scheduleFoldMuckRenders === "function" ? options.scheduleFoldMuckRenders : () => {};
    const scheduleActionControlUnlock = typeof options.scheduleActionControlUnlock === "function" ? options.scheduleActionControlUnlock : () => {};
    const scheduleActionRevealUnlock = typeof options.scheduleActionRevealUnlock === "function" ? options.scheduleActionRevealUnlock : () => {};
    const applyFoldAnyIfReady = typeof options.applyFoldAnyIfReady === "function" ? options.applyFoldAnyIfReady : () => false;

    function visualState(table) {
      return table && table.view && typeof table.view === "object" ? table.view : null;
    }

    function setVisualValue(table, key, value) {
      if (!table || !key) return;
      const view = visualState(table);
      if (view) view[key] = value;
      table[key] = value;
    }

    function primeActionReveal(table, options = {}) {
      if (!table) return;
      const nowTime = now();
      // Reuse the live virtual-clock anchor for the SAME hand so back-to-back
      // primes (consecutive bot responses, a deferred hero-feedback render)
      // EXTEND the existing timeline instead of rebasing it to now(). Rebasing
      // reset elapsedMs to ~0, which replayed already-shown actions and drove
      // the index-0 thinkingDelayMs negative — clamping the "думает" beat out
      // and painting the result before its own deliberation.
      const existingStartedAt = Number(table.actionRevealStartedAt) || 0;
      const existingUntil = Number(table.actionRevealUntil) || 0;
      const sameHand = Number(table.actionRevealHandNo) === Number(table.handNo);
      // A Hero fold can synchronously resolve every remaining bot action and
      // street before the next paint. That is a NEW visual window even though it
      // belongs to the same hand; reusing the old anchor would make its elapsed
      // time include already-played actions and can reveal the board immediately.
      const forceFreshSequence = options.forceFreshSequence === true;
      const sequenceLive = !forceFreshSequence && existingStartedAt > 0 && existingUntil > nowTime && sameHand;
      const startedAt = sequenceLive ? existingStartedAt : nowTime;
      setVisualValue(table, "actionRevealStartedAt", startedAt);
      setVisualValue(table, "actionRevealHandNo", Number(table.handNo));
      const leadMs = sequenceLive
        ? (Number(table.actionSequenceLeadMs) || 0)
        : actionVisualLeadMs(table, startedAt);
      setVisualValue(table, "actionSequenceLeadMs", leadMs);
      const previousBoardLength = Number(options.previousBoardLength);
      const useAllInRunoutReveal = Boolean(table.allInRunout && table.status === "showdown");
      if (!useAllInRunoutReveal && Number.isFinite(previousBoardLength) && table.board.length > previousBoardLength) {
        const boardDelay = boardRevealStartDelay(table, {
          elapsedMs: 0,
          leadMs,
          revealFrom: previousBoardLength
        });
        // Anchor the board reveal to the SAME sequence origin as the actions
        // (startedAt) so the new card un-hides exactly when its revealing action
        // plays, rather than on primeBoardReveal's own now() stamp which drifts
        // a frame later than the (possibly reused) action clock (obs 13539).
        primeBoardReveal(table, previousBoardLength, boardDelay, startedAt);
      }
      const duration = actionRevealDuration(table);
      if (!duration) {
        if (forceFreshSequence) {
          setVisualValue(table, "actionRevealUntil", 0);
          setVisualValue(table, "actionControlUnlockAt", 0);
        }
        applyFoldAnyIfReady(table);
        return;
      }
      const controlUnlockDuration = Math.min(duration, actionControlUnlockDuration(table));
      // Anchor deadlines to the (possibly reused) sequence origin and extend —
      // never shorten — them, so an appended action pushes the timeline out.
      const untilCandidate = startedAt + duration;
      setVisualValue(table, "actionRevealUntil", sequenceLive ? Math.max(existingUntil, untilCandidate) : untilCandidate);
      setVisualValue(table, "actionControlUnlockAt", startedAt + controlUnlockDuration);
      schedulePotFlightSettle(table);
      scheduleBetMarkerLandingRenders(table);
      scheduleActionBoardRevealRenders(table);
      scheduleFoldMuckRenders(table);
      scheduleActionControlUnlock(table, controlUnlockDuration);
      scheduleActionRevealUnlock(table);
    }

    return { primeActionReveal };
  }

  root.PokerSimulatorActionReveal = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
