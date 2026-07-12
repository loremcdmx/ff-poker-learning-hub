(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const usesDecorativeMotionLayer = typeof options.usesDecorativeMotionLayer === "function"
      ? options.usesDecorativeMotionLayer
      : () => true;
    const prefersReducedMotion = typeof options.prefersReducedMotion === "function"
      ? options.prefersReducedMotion
      : () => false;
    const reducedTableMotion = typeof options.reducedTableMotion === "function"
      ? options.reducedTableMotion
      : () => false;
    const compactTimingMs = typeof options.compactTimingMs === "function"
      ? options.compactTimingMs
      : (fullMs, compactMs) => Number(fullMs || compactMs || 0);
    const boardRevealMs = typeof options.boardRevealMs === "function" ? options.boardRevealMs : () => 0;
    const scheduleVisualUnlock = typeof options.scheduleVisualUnlock === "function"
      ? options.scheduleVisualUnlock
      : () => {};
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const durations = options.durations || {};

    function state() {
      return getState() || {};
    }

    function settings() {
      return state().settings || {};
    }

    function duration(name, fallback = 0) {
      const value = Number(durations[name]);
      if (Number.isFinite(value)) return value;
      return Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    }

    function visualUnlockBufferMs() {
      return duration("visualUnlockBufferMs", 0);
    }

    function visualState(table) {
      return table && table.view && typeof table.view === "object" ? table.view : null;
    }

    function setVisualValue(table, key, value) {
      if (!table || !key) return;
      const view = visualState(table);
      if (view) view[key] = value;
      table[key] = value;
    }

    function clearBoardRevealState(table, revealFrom) {
      setVisualValue(table, "boardRevealFrom", revealFrom);
      setVisualValue(table, "boardRevealStartedAt", 0);
      setVisualValue(table, "boardRevealDelayMs", 0);
      setVisualValue(table, "boardRevealUntil", 0);
    }

    function primeDealReveal(table) {
      if (!table) return;
      if (!usesDecorativeMotionLayer()) {
        setVisualValue(table, "dealRevealUntil", 0);
        return;
      }
      const revealDuration = dealRevealDurationForTable(table);
      setVisualValue(table, "dealRevealUntil", now() + revealDuration);
      scheduleVisualUnlock(table, "dealRevealUntil", revealDuration + visualUnlockBufferMs());
    }

    function blindLevelAnnouncementDuration() {
      const compactDuration = duration("compactBlindLevelAnnouncementMs", 1800);
      if (prefersReducedMotion()) return compactDuration;
      return reducedTableMotion() ? compactDuration : duration("blindLevelAnnouncementMs", 3400);
    }

    function primeBlindLevelAnnouncement(table) {
      if (!table) return;
      if (!table.blindLevelAnnouncement) {
        setVisualValue(table, "blindLevelAnnouncementUntil", 0);
        return;
      }
      const announcementDuration = blindLevelAnnouncementDuration();
      setVisualValue(table, "blindLevelAnnouncementUntil", now() + announcementDuration);
      scheduleVisualUnlock(table, "blindLevelAnnouncementUntil", announcementDuration + visualUnlockBufferMs());
    }

    function dealRevealDurationForTable(table) {
      const seatCount = Math.max(1, Number(table?.seats?.length || settings().playerCount || 8));
      const cardDuration = compactTimingMs(duration("dealCardDurationMs", 820), duration("compactDealCardDurationMs", 420));
      const seatGap = compactTimingMs(duration("dealSeatGapMs", 64), duration("compactDealSeatGapMs", 38));
      const revealTail = compactTimingMs(duration("dealRevealTailMs", 120), duration("compactDealRevealTailMs", 70));
      const lastCardDelay = Math.max(0, (seatCount * 2 - 1) * seatGap);
      const dynamicDuration = cardDuration + lastCardDelay + revealTail;
      return dynamicDuration > 0 ? dynamicDuration : duration("dealRevealDurationMs", 0);
    }

    function primeBoardReveal(table, previousBoardLength = 0, delayMs = 0, anchorAt = 0) {
      if (!table || table.board.length <= previousBoardLength) return;
      if (prefersReducedMotion()) {
        clearBoardRevealState(table, table.board.length);
        return;
      }
      const delay = Math.max(0, Math.round(Number(delayMs) || 0));
      // Share the action sequence's origin (actionRevealStartedAt, passed as
      // anchorAt) so the board reveal is measured on the SAME clock as the
      // action bubbles instead of an independent now() stamp that drifts a frame
      // or two later (obs 13539). Falls back to now() when no anchor is given.
      const anchor = Number(anchorAt);
      const startedAt = Number.isFinite(anchor) && anchor > 0 ? anchor : now();
      const revealMs = boardRevealMs();
      setVisualValue(table, "boardRevealFrom", Math.max(0, previousBoardLength));
      setVisualValue(table, "boardRevealStartedAt", startedAt);
      setVisualValue(table, "boardRevealDelayMs", delay);
      setVisualValue(table, "boardRevealUntil", startedAt + delay + revealMs);
      scheduleVisualUnlock(table, "boardRevealUntil", Math.max(0, startedAt + delay + revealMs - now()) + visualUnlockBufferMs());
    }

    return {
      primeDealReveal,
      blindLevelAnnouncementDuration,
      primeBlindLevelAnnouncement,
      dealRevealDurationForTable,
      primeBoardReveal
    };
  }

  root.PokerSimulatorVisualPrimer = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
