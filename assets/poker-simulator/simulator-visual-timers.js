(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const documentRef = options.documentRef || windowRef.document || root.document;
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const getTable = typeof options.getTable === "function" ? options.getTable : () => null;
    const markTableDirty = typeof options.markTableDirty === "function" ? options.markTableDirty : () => {};
    const markAllTablesDirty = typeof options.markAllTablesDirty === "function" ? options.markAllTablesDirty : () => {};
    const render = typeof options.render === "function" ? options.render : () => {};
    const applyFoldAnyIfReady = typeof options.applyFoldAnyIfReady === "function" ? options.applyFoldAnyIfReady : () => false;
    const pendingPotFlightItems = typeof options.pendingPotFlightItems === "function" ? options.pendingPotFlightItems : () => [];
    const pendingBetMarkerLandingItems = typeof options.pendingBetMarkerLandingItems === "function" ? options.pendingBetMarkerLandingItems : () => [];
    const actionSequenceBoardRevealStages = typeof options.actionSequenceBoardRevealStages === "function" ? options.actionSequenceBoardRevealStages : () => [];
    const actionTimingAtIndex = typeof options.actionTimingAtIndex === "function" ? options.actionTimingAtIndex : () => ({});
    const actionAnimationIsInMotion = typeof options.actionAnimationIsInMotion === "function" ? options.actionAnimationIsInMotion : () => false;
    const prefersReducedMotion = typeof options.prefersReducedMotion === "function" ? options.prefersReducedMotion : () => false;
    const compactTimingMs = typeof options.compactTimingMs === "function"
      ? options.compactTimingMs
      : (fullMs, compactMs) => Math.max(0, Math.round(Number(fullMs || compactMs || 0)));
    const primeShowdownAnimation = typeof options.primeShowdownAnimation === "function" ? options.primeShowdownAnimation : () => {};
    const syncPauseButton = typeof options.syncPauseButton === "function" ? options.syncPauseButton : () => {};
    const pauseAutoDealQueues = typeof options.pauseAutoDealQueues === "function" ? options.pauseAutoDealQueues : () => {};
    const resumeAutoDealQueues = typeof options.resumeAutoDealQueues === "function" ? options.resumeAutoDealQueues : () => {};
    const stopAutoDealCountdownTicker = typeof options.stopAutoDealCountdownTicker === "function" ? options.stopAutoDealCountdownTicker : () => {};
    const syncAutoDealCountdownTicker = typeof options.syncAutoDealCountdownTicker === "function" ? options.syncAutoDealCountdownTicker : () => {};
    const updateAutoDealCountdowns = typeof options.updateAutoDealCountdowns === "function" ? options.updateAutoDealCountdowns : () => {};
    const pauseActionClocks = typeof options.pauseActionClocks === "function" ? options.pauseActionClocks : () => {};
    const resumeActionClocks = typeof options.resumeActionClocks === "function" ? options.resumeActionClocks : () => {};
    const stopActionClockTicker = typeof options.stopActionClockTicker === "function" ? options.stopActionClockTicker : () => {};
    const syncActionClockTicker = typeof options.syncActionClockTicker === "function" ? options.syncActionClockTicker : () => {};
    const updateActionClocks = typeof options.updateActionClocks === "function" ? options.updateActionClocks : () => {};
    const clearAllActionClocks = typeof options.clearAllActionClocks === "function" ? options.clearAllActionClocks : () => {};
    const pauseBotResponseTimers = typeof options.pauseBotResponseTimers === "function" ? options.pauseBotResponseTimers : () => {};
    const resumeBotResponseTimers = typeof options.resumeBotResponseTimers === "function" ? options.resumeBotResponseTimers : () => {};
    const clearAllBotResponseTimers = typeof options.clearAllBotResponseTimers === "function" ? options.clearAllBotResponseTimers : () => {};
    const stopPerfMutationObserver = typeof options.stopPerfMutationObserver === "function" ? options.stopPerfMutationObserver : () => {};
    const saveSessionData = typeof options.saveSessionData === "function" ? options.saveSessionData : () => {};
    // SINGLE OWNER of the betAnimations array clear (simulator-table-effects.js,
    // clearBetAnimations). The action-unlock teardown below routes its clear
    // through this injected owner instead of assigning the array itself, so the
    // whole codebase has one betAnimations clearer. Production always injects the
    // owner (visual-render-composition). The fallback is a fail-open no-op: no
    // headless timer smoke drives the unlock teardown to the clear (they exercise
    // the paused re-arm / stale-lock paths), so leaving the array untouched when
    // unwired keeps ownership single (no stray assignment lives here).
    const clearBetAnimations = typeof options.clearBetAnimations === "function"
      ? options.clearBetAnimations
      : () => {};
    // One animation frame (~16ms at 60fps) used as a frame-budget/sentinel: a
    // visual deadline closer than this is treated as effectively reached.
    const FRAME_BUDGET_MS = 16;
    // Minimum (re)schedule delay (ms) floor for visual-unlock timers, so a
    // tight/zero remaining deadline still yields a real, non-busy setTimeout.
    const MIN_RESCHEDULE_DELAY_MS = 80;
    const pauseDeferPollMs = Math.max(FRAME_BUDGET_MS, Number(options.pauseDeferPollMs || 200));
    const visualUnlockBufferMs = Math.max(0, Number(options.visualUnlockBufferMs || 0));
    const tableEffectDurations = options.tableEffectDurations || {};
    const foldMuckBaseDelayMs = 80;
    const foldMuckCardGapMs = 90;

    // ---- Deadline registry (single source of truth for pause/bfcache shift) ----
    // Every table-level visual deadline (absolute-time timestamp in ms) MUST be
    // listed here so pause / bfcache resume shifts it forward by the frozen
    // duration. A NEW deadline field that is written by primeActionReveal /
    // primeShowdownAnimation / primeVisualCues but forgotten here would silently
    // fall out of shifting and fire at the wrong wall-clock time after a resume.
    // scripts/simulator-visual-deadline-shift-smoke.mjs statically scans the
    // *Until / *StartedAt / *UnlockAt writes across the visual sources and fails
    // if a field lands outside this registry (or its documented allowlist).
    // Per-item betAnimations[].markerUntil / .flyUntil are NOT here — they live
    // on array items and are shifted separately in shiftTableVisualDeadlines.
    const VISUAL_DEADLINE_FIELDS = [
      "showdownAnimationStartedAt",
      "showdownAnimationUntil",
      "actionRevealUntil",
      "actionControlUnlockAt",
      "actionRevealStartedAt",
      "boardRevealUntil",
      "boardRevealStartedAt",
      "potFlightUntil",
      "dealRevealUntil",
      "blindLevelAnnouncementUntil"
    ];

    // Subset of VISUAL_DEADLINE_FIELDS whose expiry drives a generic
    // scheduleVisualUnlock timer that must be re-armed after a pause/bfcache
    // resume via rescheduleVisualDeadline. Fields deliberately OMITTED and why:
    //   - actionRevealUntil: re-armed by its own scheduleActionRevealUnlock
    //     (custom fire that guards potFlightUntil + tears the closing street
    //     down), not the generic per-key unlock timer.
    //   - showdownAnimationStartedAt / showdownAnimationUntil: re-primed wholesale
    //     by primeShowdownAnimation(table) when status === "showdown"; they have
    //     no standalone per-key unlock timer to re-arm.
    //   - actionRevealStartedAt: pure sequence-origin anchor read by the
    //     bet-flight / board-reveal offset math; it never gates an unlock and has
    //     no timer of its own (shifting it keeps the anchor coherent).
    //   - boardRevealStartedAt: pure board-reveal origin anchor, same as above;
    //     the board-reveal unlock rides boardRevealUntil, not this anchor.
    const RESCHEDULED_FIELDS = [
      "actionControlUnlockAt",
      "boardRevealUntil",
      "potFlightUntil",
      "dealRevealUntil",
      "blindLevelAnnouncementUntil"
    ];

    function state() {
      return getState() || {};
    }

    function visualTimerMap() {
      const current = state();
      if (!(current.visualTimers instanceof Map)) current.visualTimers = new Map();
      return current.visualTimers;
    }

    function actionRevealTimerMap() {
      const current = state();
      if (!(current.actionRevealTimers instanceof Map)) current.actionRevealTimers = new Map();
      return current.actionRevealTimers;
    }

    function isPaused() {
      return Boolean(state().paused);
    }

    function isLifecycleFrozen() {
      return Boolean(state().pageHiddenAt);
    }

    function visualTimersFrozen() {
      return isPaused() || isLifecycleFrozen();
    }

    function visualState(table) {
      return table && table.view && typeof table.view === "object" ? table.view : null;
    }

    function hasVisualField(table, key) {
      const view = visualState(table);
      return Boolean(
        (view && Object.prototype.hasOwnProperty.call(view, key)) ||
        (table && Object.prototype.hasOwnProperty.call(table, key))
      );
    }

    function visualRaw(table, key) {
      const view = visualState(table);
      if (view && Object.prototype.hasOwnProperty.call(view, key)) return view[key];
      return table?.[key];
    }

    function visualNumber(table, key, fallback = 0) {
      const value = Number(visualRaw(table, key));
      return Number.isFinite(value) ? value : fallback;
    }

    function cssEscape(value) {
      const stringValue = String(value ?? "");
      if (windowRef.CSS && typeof windowRef.CSS.escape === "function") return windowRef.CSS.escape(stringValue);
      return stringValue.replace(/["\\]/g, "\\$&");
    }

    function tableShellFor(table) {
      if (!documentRef?.querySelector || !table?.id) return null;
      return documentRef.querySelector(`.table-shell[data-table-id="${cssEscape(table.id)}"]`);
    }

    function hasRenderedAnimationKey(table, key) {
      if (!key) return false;
      return Boolean(tableShellFor(table)?.querySelector(`[data-animation-key="${cssEscape(key)}"]`));
    }

    function currentBetMarkerItem(table, item) {
      const items = Array.isArray(table?.betAnimations) ? table.betAnimations : [];
      return items.find((candidate) => String(candidate?.key || "") === String(item?.key || "")) || null;
    }

    function currentFoldMuckAction(table, item) {
      const actions = Array.isArray(table?.actionAnimations) ? table.actionAnimations : [];
      const index = actions.findIndex((candidate) => String(candidate?.key || "") === String(item?.key || ""));
      return {
        item: index >= 0 ? actions[index] : null,
        index
      };
    }

    function hasRenderedFoldMuck(table, item) {
      if (!item?.key) return false;
      return hasRenderedAnimationKey(table, `${item.key}-muck-0`)
        || hasRenderedAnimationKey(table, `${item.key}-muck-1`);
    }

    function hasRenderedSeatMuckOut(table, item) {
      const seatId = Number(item?.seatId);
      if (!Number.isFinite(seatId)) return false;
      return Boolean(tableShellFor(table)?.querySelector(`.seat--${seatId} .seat-cards.is-mucking-out`));
    }

    function hasRenderedFoldActionBadge(table, item) {
      const seatId = Number(item?.seatId);
      if (!Number.isFinite(seatId)) return false;
      return Boolean(tableShellFor(table)?.querySelector(`.seat--${seatId} .seat-action-badge.is-fold`));
    }

    function hasRenderedPotFlightPending(table) {
      return Boolean(tableShellFor(table)?.querySelector(".pot.has-pending, .bet-flight"));
    }

    function duration(name, fallback = 0) {
      const value = Number(tableEffectDurations[name]);
      if (Number.isFinite(value)) return value;
      const fallbackValue = Number(fallback);
      return Number.isFinite(fallbackValue) ? fallbackValue : 0;
    }

    function setVisualValue(table, key, value) {
      if (!table || !key) return;
      const view = visualState(table);
      if (view) view[key] = value;
      table[key] = value;
    }

    function clearVisualValues(table, keys) {
      keys.forEach((key) => setVisualValue(table, key, 0));
    }

    function isVisualActive(table, key) {
      return Boolean(table && visualNumber(table, key) > Date.now());
    }

    function isActionSequenceActive(table) {
      return Boolean(table && visualNumber(table, "actionRevealUntil") > Date.now());
    }

    function isActionRevealLocked(table) {
      if (!table || table.status !== "playing") return false;
      if (hasVisualField(table, "actionControlUnlockAt")) {
        return visualNumber(table, "actionControlUnlockAt") > Date.now();
      }
      return isActionSequenceActive(table);
    }

    function scheduleActionRevealUnlock(table) {
      if (!table?.id || !visualNumber(table, "actionRevealUntil")) return;
      clearActionRevealTimer(table.id);
      const handNo = table.handNo;
      const delay = Math.max(MIN_RESCHEDULE_DELAY_MS, visualNumber(table, "actionRevealUntil") - Date.now());
      const fire = () => {
        if (visualTimersFrozen()) {
          actionRevealTimerMap().set(Number(table.id), windowRef.setTimeout(fire, pauseDeferPollMs));
          return;
        }
        actionRevealTimerMap().delete(Number(table.id));
        const currentTable = getTable(table.id);
        if (!currentTable || currentTable.handNo !== handNo) return;
        const remaining = visualNumber(currentTable, "actionRevealUntil") - Date.now();
        if (remaining > FRAME_BUDGET_MS) {
          actionRevealTimerMap().set(Number(table.id), windowRef.setTimeout(fire, Math.max(MIN_RESCHEDULE_DELAY_MS, remaining)));
          return;
        }
        // Do NOT tear down the closing-street felt bets / in-flight pot chips
        // until those chips have actually landed in the pot. Wiping at
        // actionRevealUntil alone yanked the bet off the felt mid-flight.
        const potFlightRemaining = visualNumber(currentTable, "potFlightUntil") - Date.now();
        if (potFlightRemaining > FRAME_BUDGET_MS) {
          actionRevealTimerMap().set(Number(table.id), windowRef.setTimeout(fire, Math.max(MIN_RESCHEDULE_DELAY_MS, potFlightRemaining)));
          return;
        }
        clearVisualValues(currentTable, [
          "actionRevealUntil",
          "actionControlUnlockAt",
          "actionRevealStartedAt",
          "actionSequenceLeadMs"
        ]);
        if (Array.isArray(currentTable.board)) {
          setVisualValue(currentTable, "boardRevealFrom", currentTable.board.length);
          setVisualValue(currentTable, "boardRevealStartedAt", 0);
          setVisualValue(currentTable, "boardRevealDelayMs", 0);
          setVisualValue(currentTable, "boardRevealUntil", 0);
        }
        // A showdown continues after the action chapter: reveal cards, announce
        // the winner, then start the pot award. Keep the immutable closing-street
        // snapshot across this unlock so landed river wagers remain on the felt
        // until that award barrier. The normal post-street path still clears here;
        // showdown cleanup is owned by clearExpiredRenderedAnimations once its
        // visual lock is over.
        if (currentTable.status !== "showdown") delete currentTable.visualClosedStreetBets;
        clearBetAnimations(currentTable, "action-unlock");
        // action-unlock is only a chapter boundary. A single bot response can
        // repopulate the same hand several times after this array is emptied, so
        // the per-key action-bubble latch must survive every unlock in the hand.
        currentTable.actionAnimations = [];
        setVisualValue(currentTable, "potFlightUntil", 0);
        if (applyFoldAnyIfReady(currentTable)) return;
        markTableDirty(currentTable.id);
        render("action-unlock");
      };
      const timer = windowRef.setTimeout(fire, delay);
      actionRevealTimerMap().set(Number(table.id), timer);
    }

    function scheduleActionControlUnlock(table, delayMs) {
      if (!table?.id || !(delayMs > 0)) return;
      scheduleVisualUnlock(table, "actionControlUnlockAt", Math.max(MIN_RESCHEDULE_DELAY_MS, delayMs));
    }

    function scheduleActionBoardRevealRenders(table) {
      if (!table?.id) return;
      const stages = actionSequenceBoardRevealStages(table, {
        elapsedMs: 0,
        leadMs: visualNumber(table, "actionSequenceLeadMs")
      });
      if (!Array.isArray(stages) || stages.length <= 1) return;
      stages.forEach((stage, index) => {
        scheduleActionBoardRevealRender(table, `start-${index}`, stage.startMs);
        scheduleActionBoardRevealRender(table, `reveal-end-${index}`, stage.revealEndMs);
        scheduleActionBoardRevealRender(table, `settle-${index}`, stage.endMs);
      });
    }

    function scheduleActionBoardRevealRender(table, phase, delayMs) {
      if (!table?.id || !phase) return;
      const delay = Math.max(0, Math.round(Number(delayMs || 0)));
      const timerKey = `${Number(table.id)}:actionBoard:${phase}`;
      const timers = visualTimerMap();
      if (timers.has(timerKey)) return;
      const handNo = table.handNo;
      const fire = () => {
        if (visualTimersFrozen()) {
          timers.set(timerKey, windowRef.setTimeout(fire, pauseDeferPollMs));
          return;
        }
        timers.delete(timerKey);
        const currentTable = getTable(table.id);
        if (!currentTable || currentTable.handNo !== handNo) return;
        if (!isActionSequenceActive(currentTable)) return;
        markTableDirty(currentTable.id);
        render(`action-board:${phase}`);
      };
      timers.set(timerKey, windowRef.setTimeout(fire, delay));
    }

    function clearActionRevealTimer(tableId) {
      const id = Number(tableId);
      const timer = actionRevealTimerMap().get(id);
      if (timer) windowRef.clearTimeout(timer);
      actionRevealTimerMap().delete(id);
    }

    function clearAllActionRevealTimers() {
      actionRevealTimerMap().forEach((timer) => windowRef.clearTimeout(timer));
      actionRevealTimerMap().clear();
    }

    function scheduleVisualUnlock(table, key, delay) {
      if (!table?.id || !key) return;
      const timerKey = `${Number(table.id)}:${key}`;
      const timers = visualTimerMap();
      const existing = timers.get(timerKey);
      if (existing) windowRef.clearTimeout(existing);
      const handNo = table.handNo;
      const fire = () => {
        if (visualTimersFrozen()) {
          timers.set(timerKey, windowRef.setTimeout(fire, pauseDeferPollMs));
          return;
        }
        timers.delete(timerKey);
        const currentTable = getTable(table.id);
        if (!currentTable || currentTable.handNo !== handNo) return;
        const remaining = visualNumber(currentTable, key) - Date.now();
        if (remaining > FRAME_BUDGET_MS) {
          timers.set(timerKey, windowRef.setTimeout(fire, Math.max(MIN_RESCHEDULE_DELAY_MS, remaining)));
          return;
        }
        if (!(visualNumber(currentTable, key) > 0)) return;
        const keepActionBoardCursor = key === "boardRevealUntil"
          && isActionSequenceActive(currentTable)
          && actionSequenceBoardRevealStages(currentTable, {
            elapsedMs: 0,
            leadMs: visualNumber(currentTable, "actionSequenceLeadMs")
          }).length > 1;
        setVisualValue(currentTable, key, 0);
        if (key === "boardRevealUntil") {
          if (!keepActionBoardCursor) {
            setVisualValue(currentTable, "boardRevealFrom", currentTable.board.length);
            setVisualValue(currentTable, "boardRevealStartedAt", 0);
            setVisualValue(currentTable, "boardRevealDelayMs", 0);
          }
        }
        if (key === "potFlightUntil" && !hasRenderedPotFlightPending(currentTable)) return;
        markTableDirty(currentTable.id);
        render(`visual-unlock:${key}`);
      };
      const timer = windowRef.setTimeout(fire, delay);
      timers.set(timerKey, timer);
    }

    function scheduleShowdownRender(table, phase, delayMs) {
      if (!table?.id || !phase) return;
      const delay = Math.max(0, Math.round(Number(delayMs) || 0));
      const timerKey = `${Number(table.id)}:showdown:${phase}`;
      const timers = visualTimerMap();
      const existing = timers.get(timerKey);
      if (existing) windowRef.clearTimeout(existing);
      const handNo = table.handNo;
      const fire = () => {
        if (visualTimersFrozen()) {
          timers.set(timerKey, windowRef.setTimeout(fire, pauseDeferPollMs));
          return;
        }
        timers.delete(timerKey);
        const currentTable = getTable(table.id);
        if (!currentTable || currentTable.handNo !== handNo) return;
        markTableDirty(currentTable.id);
        render(`showdown:${phase}`);
      };
      const timer = windowRef.setTimeout(fire, delay);
      timers.set(timerKey, timer);
    }

    function schedulePotFlightSettle(table) {
      if (!table?.id) return;
      if (prefersReducedMotion()) {
        // Reduced motion never schedules a flight, so a potFlightUntil left
        // over from a full-motion street/hand must not keep gating the pot
        // readout and the closing-street teardown — clear it instead of
        // returning around it.
        setVisualValue(table, "potFlightUntil", 0);
        return;
      }
      const pendingItems = pendingPotFlightItems(table, {
        elapsedMs: 0,
        leadMs: visualNumber(table, "actionSequenceLeadMs")
      });
      const latestArrivalMs = pendingItems.reduce((max, item) => Math.max(max, Number(item.arrivalMs || 0)), 0);
      if (!(latestArrivalMs > 0)) {
        setVisualValue(table, "potFlightUntil", 0);
        return;
      }
      // Anchor to the (possibly reused) sequence origin, NOT raw now(): on a
      // turn/river back-to-back prime startedAt is already `elapsed` ms in the
      // past, and pendingPotFlightItems computed arrivalMs from that origin
      // (elapsedMs:0). Stamping at Date.now()+arrival would push the pot flight
      // `elapsed` ms behind the action timeline it must track.
      const originAt = Number(table.actionRevealStartedAt) || Date.now();
      const elapsedMs = Math.max(0, Date.now() - originAt);
      setVisualValue(table, "potFlightUntil", originAt + latestArrivalMs);
      scheduleVisualUnlock(table, "potFlightUntil", Math.max(0, latestArrivalMs - elapsedMs) + visualUnlockBufferMs);
    }

    function scheduleBetMarkerLandingRenders(table) {
      if (!table?.id) return;
      pendingBetMarkerLandingItems(table, {
        elapsedMs: 0,
        leadMs: visualNumber(table, "actionSequenceLeadMs")
      }).forEach((item) => scheduleBetMarkerLandingRender(table, item));
    }

    function scheduleBetMarkerLandingRender(table, item) {
      if (!table?.id || !item?.key) return;
      const timerKey = `${Number(table.id)}:betMarker:${item.key}`;
      const timers = visualTimerMap();
      if (timers.has(timerKey)) return;
      const handNo = table.handNo;
      const arrivalMs = Math.max(0, Math.round(Number(item.arrivalMs || 0)));
      const flightEndMs = Math.max(arrivalMs, Math.round(Number(item.flightEndMs || item.arrivalMs || 0)));
      // Anchor deadlines to the (possibly reused) sequence origin, mirroring
      // primeActionReveal's board-reveal / actionRevealUntil anchoring. On a
      // turn/river back-to-back prime startedAt is `elapsed` ms in the past and
      // arrivalMs/flightEndMs are origin-relative (computed with elapsedMs:0);
      // stamping at Date.now()+offset would drift the chip flight `elapsed` ms
      // behind the action, so the settled bet surfaces before its fly-in plays.
      const originAt = Number(table.actionRevealStartedAt) || Date.now();
      const elapsedMs = Math.max(0, Date.now() - originAt);
      if (item.animation) {
        if (!Number.isFinite(Number(item.animation.markerUntil))) {
          item.animation.markerUntil = originAt + arrivalMs;
        }
        if (!Number.isFinite(Number(item.animation.markerDelayMs))) {
          item.animation.markerDelayMs = arrivalMs;
        }
        if (!Number.isFinite(Number(item.animation.flyUntil))) {
          item.animation.flyUntil = originAt + flightEndMs;
        }
      }
      const delay = Math.max(0, arrivalMs - elapsedMs) + 24;
      const fire = () => {
        if (visualTimersFrozen()) {
          timers.set(timerKey, windowRef.setTimeout(fire, pauseDeferPollMs));
          return;
        }
        timers.delete(timerKey);
        const currentTable = getTable(table.id);
        if (!currentTable || currentTable.handNo !== handNo) return;
        const currentItem = currentBetMarkerItem(currentTable, item);
        if (!currentItem) return;
        if (currentItem.landed && !hasRenderedAnimationKey(currentTable, currentItem.key)) return;
        markTableDirty(currentTable.id);
        render("bet-marker-landed");
      };
      timers.set(timerKey, windowRef.setTimeout(fire, delay));
    }

    function scheduleFoldMuckRenders(table) {
      if (!table?.id) return;
      // Under reduced motion the decorative muck/bet-marker/pot-flight render
      // timers are all suppressed, but the all-in RESPONSE cascade still keeps a
      // multi-second timeline (the allInResponse think/reveal/settle beats bypass
      // compactTimingMs). Without a per-fold repaint, every folder stays lit until
      // the single end-of-cascade action-unlock. Schedule a minimal completion
      // repaint at each villain fold's endMs so seatVisuallyFolded dims it live —
      // a plain re-render, no fly/muck animation, so it still honors reduced
      // motion. Full motion keeps the richer muck choreography below.
      if (prefersReducedMotion()) {
        scheduleFoldDimRenders(table);
        return;
      }
      const leadMs = visualNumber(table, "actionSequenceLeadMs");
      (table.actionAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item?.tone === "fold" && Number(item.seatId) !== 0)
        .forEach(({ item, index }) => {
          const timing = actionTimingAtIndex(table, index, { elapsedMs: 0, leadMs });
          const timedItem = { ...item, __foldMuckActionIndex: index };
          scheduleFoldMuckRender(table, timedItem, Math.max(0, Number(timing.actionDelayMs || 0)));
          scheduleFoldMuckCleanupRender(table, timedItem, foldMuckCleanupDelayMs(timedItem, timing));
        });
    }

    // Reduced-motion fold dimming: one render per villain fold at its completion
    // (endMs), so the box dims the moment seatVisuallyFolded flips. No decorative
    // animation — just a repaint. Mirrors scheduleFoldMuckRenders' fold filter.
    function scheduleFoldDimRenders(table) {
      if (!table?.id) return;
      const leadMs = visualNumber(table, "actionSequenceLeadMs");
      (table.actionAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item?.tone === "fold" && Number(item.seatId) !== 0)
        .forEach(({ item, index }) => {
          const timing = actionTimingAtIndex(table, index, { elapsedMs: 0, leadMs });
          scheduleFoldDimRender(table, { ...item, __foldDimActionIndex: index }, Math.max(0, Number(timing.endMs || 0)));
        });
    }

    function scheduleFoldDimRender(table, item, delayMs) {
      if (!table?.id || !item?.key) return;
      const timerKey = `${Number(table.id)}:foldDim:${item.key}`;
      const timers = visualTimerMap();
      if (timers.has(timerKey)) return;
      const handNo = table.handNo;
      const delay = Math.max(0, Math.round(Number(delayMs || 0))) + 1;
      const fire = () => {
        if (visualTimersFrozen()) {
          timers.set(timerKey, windowRef.setTimeout(fire, pauseDeferPollMs));
          return;
        }
        timers.delete(timerKey);
        const currentTable = getTable(table.id);
        if (!currentTable || currentTable.handNo !== handNo) return;
        markTableDirty(currentTable.id);
        render("fold-dim");
      };
      timers.set(timerKey, windowRef.setTimeout(fire, delay));
    }

    function foldMuckCleanupDelayMs(item, timing = {}) {
      const actionDelayMs = Math.max(0, Number(timing.actionDelayMs || 0));
      const actionEndMs = Math.max(0, Number(timing.endMs || 0));
      const riverResolution = String(item?.riverResolution || "");
      const muckDurationMs = riverResolution
        ? compactTimingMs(duration("riverMuckDurationMs", 1470), duration("compactRiverMuckDurationMs", 238))
        : compactTimingMs(duration("muckDurationMs", 1295), duration("compactMuckDurationMs", 210));
      const cssTailMs = actionDelayMs + foldMuckBaseDelayMs + foldMuckCardGapMs + Math.max(0, Number(muckDurationMs || 0));
      return Math.max(actionEndMs, cssTailMs) + visualUnlockBufferMs;
    }

    function scheduleFoldMuckRender(table, item, delayMs) {
      if (!table?.id || !item?.key) return;
      const timerKey = `${Number(table.id)}:foldMuck:${item.key}`;
      const timers = visualTimerMap();
      if (timers.has(timerKey)) return;
      const handNo = table.handNo;
      const delay = Math.max(0, Math.round(Number(delayMs || 0))) + 1;
      const fire = () => {
        if (visualTimersFrozen()) {
          timers.set(timerKey, windowRef.setTimeout(fire, pauseDeferPollMs));
          return;
        }
        timers.delete(timerKey);
        const currentTable = getTable(table.id);
        if (!currentTable || currentTable.handNo !== handNo) return;
        const currentAction = currentFoldMuckAction(currentTable, item);
        const actionIndex = currentAction.index >= 0 ? currentAction.index : Number(item.__foldMuckActionIndex);
        const currentItem = currentAction.item || item;
        if (!Number.isFinite(actionIndex) || actionIndex < 0) return;
        if (!actionAnimationIsInMotion(currentTable, actionIndex)) return;
        if (hasRenderedFoldMuck(currentTable, currentItem) && hasRenderedSeatMuckOut(currentTable, currentItem)) return;
        markTableDirty(currentTable.id);
        render("fold-muck-started");
      };
      timers.set(timerKey, windowRef.setTimeout(fire, delay));
    }

    function scheduleFoldMuckCleanupRender(table, item, delayMs) {
      if (!table?.id || !item?.key) return;
      const timerKey = `${Number(table.id)}:foldMuckCleanup:${item.key}`;
      const timers = visualTimerMap();
      if (timers.has(timerKey)) return;
      const handNo = table.handNo;
      const delay = Math.max(MIN_RESCHEDULE_DELAY_MS, Math.round(Number(delayMs || 0)));
      const fire = () => {
        if (visualTimersFrozen()) {
          timers.set(timerKey, windowRef.setTimeout(fire, pauseDeferPollMs));
          return;
        }
        timers.delete(timerKey);
        const currentTable = getTable(table.id);
        if (!currentTable || currentTable.handNo !== handNo) return;
        const currentAction = currentFoldMuckAction(currentTable, item);
        const actionIndex = currentAction.index >= 0 ? currentAction.index : Number(item.__foldMuckActionIndex);
        const currentItem = currentAction.item || item;
        if (!Number.isFinite(actionIndex) || actionIndex < 0) return;
        if (!hasRenderedFoldMuck(currentTable, currentItem) && hasRenderedFoldActionBadge(currentTable, currentItem)) return;
        markTableDirty(currentTable.id);
        render("fold-muck-ended");
      };
      timers.set(timerKey, windowRef.setTimeout(fire, delay));
    }

    function clearVisualTimersForTable(tableId) {
      const prefix = `${Number(tableId)}:`;
      Array.from(visualTimerMap().entries())
        .filter(([key]) => key.startsWith(prefix))
        .forEach(([key, timer]) => {
          windowRef.clearTimeout(timer);
          visualTimerMap().delete(key);
        });
    }

    function clearAllVisualTimers() {
      visualTimerMap().forEach((timer) => windowRef.clearTimeout(timer));
      visualTimerMap().clear();
    }

    function shiftTableVisualDeadlines(table, deltaMs) {
      if (!table || !(deltaMs > 0)) return;
      VISUAL_DEADLINE_FIELDS.forEach((key) => {
        const value = visualNumber(table, key);
        if (value > 0) setVisualValue(table, key, value + deltaMs);
      });
      if (Array.isArray(table.betAnimations)) {
        table.betAnimations.forEach((item) => {
          if (item && Number.isFinite(Number(item.markerUntil))) {
            item.markerUntil = Number(item.markerUntil) + deltaMs;
          }
          if (item && Number.isFinite(Number(item.flyUntil))) {
            item.flyUntil = Number(item.flyUntil) + deltaMs;
          }
        });
      }
    }

    function rescheduleVisualDeadline(table, key) {
      const dueAt = visualNumber(table, key);
      if (dueAt > Date.now()) scheduleVisualUnlock(table, key, dueAt - Date.now());
    }

    function rescheduleTableVisualTimersAfterPause(table) {
      if (!table) return;
      if (visualNumber(table, "actionRevealUntil") > Date.now()) scheduleActionRevealUnlock(table);
      RESCHEDULED_FIELDS.forEach((key) => rescheduleVisualDeadline(table, key));
      if (table.status === "showdown") primeShowdownAnimation(table);
    }

    function collapseExpiredDealReveal(table, now = Date.now()) {
      if (!table) return false;
      const dealRevealUntil = visualNumber(table, "dealRevealUntil");
      if (!(dealRevealUntil > 0) || dealRevealUntil > now) return false;
      setVisualValue(table, "dealRevealUntil", 0);
      return true;
    }

    function togglePause() {
      setPaused(!isPaused());
    }

    function setPaused(paused) {
      const current = state();
      const nextPaused = Boolean(paused);
      if (current.paused === nextPaused) {
        syncPauseButton();
        return;
      }

      const now = Date.now();
      if (nextPaused) {
        current.paused = true;
        current.pauseStartedAt = now;
        pauseAutoDealQueues(now);
        pauseActionClocks(now);
        pauseBotResponseTimers(now);
        stopAutoDealCountdownTicker();
        stopActionClockTicker();
      } else {
        const pauseStartedAt = Number(current.pauseStartedAt || now);
        const pausedForMs = Math.max(0, now - pauseStartedAt);
        current.paused = false;
        current.pauseStartedAt = 0;
        if (current.tempoStartedAt > 0) current.tempoPausedMs += pausedForMs;
        // Collapse any dealReveal that already expired DURING the pause before
        // shifting deadlines forward. Otherwise shiftTableVisualDeadlines pushes an
        // already-elapsed dealRevealUntil into the future and re-locks Hero input
        // for the whole pause duration (R2-FLOWS). Mirrors handlePageShow, which
        // collapses-then-shifts; the resume branch previously only shifted.
        (current.tables || []).forEach((table) => collapseExpiredDealReveal(table, now));
        (current.tables || []).forEach((table) => {
          const createdWhilePausedAt = Number(table?.createdWhilePausedAt || 0);
          const tablePauseStartedAt = createdWhilePausedAt > pauseStartedAt ? createdWhilePausedAt : pauseStartedAt;
          shiftTableVisualDeadlines(table, Math.max(0, now - tablePauseStartedAt));
          if (table) table.createdWhilePausedAt = 0;
        });
        (current.tables || []).forEach(rescheduleTableVisualTimersAfterPause);
        resumeAutoDealQueues(now);
        resumeActionClocks(now, pausedForMs);
        resumeBotResponseTimers(now);
      }

      syncPauseButton();
      markAllTablesDirty();
      render(nextPaused ? "pause" : "resume");
    }

    function handlePageHide(event) {
      const current = state();
      const now = Date.now();
      saveSessionData();
      stopAutoDealCountdownTicker();
      stopActionClockTicker();
      stopPerfMutationObserver();
      if (event?.persisted) {
        const alreadyFrozen = Boolean(current.paused || current.pageHiddenAt);
        if (!current.pageHiddenAt) current.pageHiddenAt = now;
        if (!alreadyFrozen) {
          pauseAutoDealQueues(now);
          pauseActionClocks(now);
          pauseBotResponseTimers(now);
        }
        return;
      }
      current.pageHiddenAt = 0;
      clearAllActionClocks();
      clearAllBotResponseTimers();
    }

    function handlePageShow(event) {
      if (!event?.persisted) return;
      const current = state();
      const now = Date.now();
      const hiddenAt = Number(current.pageHiddenAt || now);
      const hiddenForMs = Math.max(0, now - hiddenAt);
      current.pageHiddenAt = 0;
      if (!isPaused()) {
        (current.tables || []).forEach((table) => collapseExpiredDealReveal(table, now));
        (current.tables || []).forEach((table) => shiftTableVisualDeadlines(table, hiddenForMs));
        (current.tables || []).forEach(rescheduleTableVisualTimersAfterPause);
        resumeAutoDealQueues(now);
        resumeActionClocks(now, hiddenForMs);
        resumeBotResponseTimers(now);
      }
      markAllTablesDirty();
      render("pageshow");
      syncAutoDealCountdownTicker();
      syncActionClockTicker();
      updateAutoDealCountdowns();
      updateActionClocks("sync");
    }

    return {
      isPaused,
      isLifecycleFrozen,
      visualTimersFrozen,
      isVisualActive,
      isActionSequenceActive,
      isActionRevealLocked,
      scheduleActionRevealUnlock,
      scheduleActionControlUnlock,
      scheduleActionBoardRevealRenders,
      clearActionRevealTimer,
      clearAllActionRevealTimers,
      scheduleVisualUnlock,
      scheduleShowdownRender,
      schedulePotFlightSettle,
      scheduleBetMarkerLandingRenders,
      scheduleBetMarkerLandingRender,
      scheduleFoldMuckRenders,
      scheduleFoldMuckRender,
      scheduleFoldMuckCleanupRender,
      clearVisualTimersForTable,
      clearAllVisualTimers,
      shiftTableVisualDeadlines,
      collapseExpiredDealReveal,
      rescheduleVisualDeadline,
      rescheduleTableVisualTimersAfterPause,
      togglePause,
      setPaused,
      handlePageHide,
      handlePageShow
    };
  }

  root.PokerSimulatorVisualTimers = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
