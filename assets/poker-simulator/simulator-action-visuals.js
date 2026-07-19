(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const BET_FLIGHT_MARKER_LAND_RATIO = 0.76;

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const getSettings = typeof options.getSettings === "function" ? options.getSettings : () => ({});
    const durations = options.durations || {};
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const roundBb = typeof options.roundBb === "function"
      ? options.roundBb
      : (value) => Math.round(Number(value || 0) * 100) / 100;
    const isActionSequenceActive = typeof options.isActionSequenceActive === "function"
      ? options.isActionSequenceActive
      : () => false;
    const showdownAwardVisible = typeof options.showdownAwardVisible === "function"
      ? options.showdownAwardVisible
      : () => true;
    // Pure-additive instrumentation hook (default no-op). Called once whenever
    // actionIndexForBetAnimation falls through to the ordinal (street,boardLength)
    // heuristic because a betAnimation carries no bound actionKey/actionSeq. In
    // healthy engine output every bet is retro-stamped by
    // bindPendingBetAnimationsToAction, so this must never fire; the real-engine
    // seq-agreement gate asserts a zero fallback count. No behavior change.
    const onOrdinalFallback = typeof options.onOrdinalFallback === "function"
      ? options.onOrdinalFallback
      : () => {};

    function duration(name, fallback = 0) {
      const value = Number(durations[name]);
      if (Number.isFinite(value)) return value;
      return Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    }

    function visualState(table) {
      return table && table.view && typeof table.view === "object" ? table.view : null;
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

    function reducedTableMotion() {
      const settings = getSettings() || {};
      // Hand tempo (start-screen "Темп раздач") is the single source of pacing
      // for ALL table counts: "fast" => compact motion, "calm" => full motion.
      // Table count no longer forces compact motion, so T1/T2/T4 share one pace
      // by default. prefers-reduced-motion still wins for accessibility.
      const tempo = String(settings.handTempo || "");
      if (tempo === "fast") return true;
      if (tempo === "calm") return prefersReducedMotion();
      // Legacy settings (no explicit tempo) fall back to the derived turbo flag.
      if (settings.turboMode) return true;
      return prefersReducedMotion();
    }

    let reducedMotionQuery;
    function prefersReducedMotion() {
      // Cache the MediaQueryList: matchMedia() is comparatively expensive and
      // prefersReducedMotion/reducedTableMotion/compactTimingMs run per-action
      // across every seat and table (hundreds of calls per render at 8-max
      // 4-table). MediaQueryList.matches stays live, so reduced-motion /
      // accessibility behaviour is byte-identical — only the redundant
      // matchMedia parsing is removed.
      if (!windowRef.matchMedia) return false;
      if (reducedMotionQuery === undefined) {
        reducedMotionQuery = windowRef.matchMedia("(prefers-reduced-motion: reduce)") || null;
      }
      return Boolean(reducedMotionQuery && reducedMotionQuery.matches);
    }

    function usesDecorativeMotionLayer() {
      return !prefersReducedMotion();
    }

    function compactTimingMs(fullMs, compactMs) {
      if (prefersReducedMotion()) return 0;
      return reducedTableMotion() ? Math.max(0, Math.round(Number(compactMs) || 0)) : Number(fullMs) || 0;
    }

    function actionAnimationIsAllIn(table, item) {
      if (!item) return false;
      if (item.isAllIn) return true;
      if (/all-?in/i.test(String(item.label || ""))) return true;
      if (!table) return false;
      if (Number(item.seatId) === 0 && !item.isHeroAction) return false;
      const seat = table.seats?.find((candidate) => Number(candidate.id) === Number(item.seatId));
      if (!seat || Number(seat.stack || 0) > 0) return false;
      const latestSeq = Number(table.seatActions?.[Number(item.seatId)]?.seq || 0);
      if (latestSeq && Number(item.seq || 0) !== latestSeq) return false;
      return /^(call|bet|raise to|all-in)\b/i.test(String(item.label || ""));
    }

    function riverResolutionKind(table, item) {
      if (!table || !item || item.isHeroAction) return "";
      if (String(item.street || "") !== "river") return "";
      if (table.status === "playing") return "";
      const tone = String(item.tone || "");
      const label = String(item.label || "");
      if (table.status === "won" && tone === "fold") return "fold-to-win";
      if (table.status === "showdown" && tone === "passive" && /^call\b/i.test(label)) return "call-to-showdown";
      return "";
    }

    function actionRiverResolution(item = null) {
      return String(item?.riverResolution || "");
    }

    function isRiverResolutionAction(item = null) {
      return Boolean(actionRiverResolution(item));
    }

    function riverResolutionCueMs(item = null) {
      return isRiverResolutionAction(item)
        ? compactTimingMs(duration("riverResolutionCueDurationMs"), duration("compactRiverResolutionCueDurationMs"))
        : 0;
    }

    function riverResolutionCueDelayMs(item = null) {
      const resolution = actionRiverResolution(item);
      if (resolution === "call-to-showdown") return chipRevealMs(item);
      if (resolution === "fold-to-win") {
        return compactTimingMs(455, duration("compactRiverFoldCueDelayMs"));
      }
      return 0;
    }

    function riverResolutionMotionMs(item = null) {
      const cueMs = riverResolutionCueMs(item);
      return cueMs ? riverResolutionCueDelayMs(item) + cueMs : 0;
    }

    function actionMotionMs(item = null) {
      return Math.max(actionRevealMs(item), chipRevealMs(item), riverResolutionMotionMs(item));
    }

    function actionRevealMs(item = null) {
      if (!item) return compactTimingMs(duration("actionRevealDurationMs"), duration("compactActionRevealDurationMs"));
      if (item.isHeroAction) return compactTimingMs(duration("heroActionRevealDurationMs"), duration("compactHeroActionRevealDurationMs"));
      if (item.allInResponse) return duration("allInResponseRevealMs");
      if (actionAnimationIsAllIn(null, item)) return compactTimingMs(duration("allInActionRevealDurationMs"), duration("compactAllInActionRevealDurationMs"));
      const riverResolution = actionRiverResolution(item);
      if (riverResolution === "call-to-showdown") return compactTimingMs(duration("riverCallActionRevealDurationMs"), duration("compactRiverCallActionRevealDurationMs"));
      if (riverResolution === "fold-to-win") return compactTimingMs(duration("riverFoldActionRevealDurationMs"), duration("compactRiverFoldActionRevealDurationMs"));
      const tone = String(item?.tone || "");
      if (tone === "fold") return compactTimingMs(duration("foldActionRevealDurationMs"), duration("compactFoldActionRevealDurationMs"));
      if (tone === "passive") return compactTimingMs(duration("passiveActionRevealDurationMs"), duration("compactPassiveActionRevealDurationMs"));
      if (tone === "aggressive") return compactTimingMs(duration("aggressiveActionRevealDurationMs"), duration("compactAggressiveActionRevealDurationMs"));
      return compactTimingMs(duration("actionRevealDurationMs"), duration("compactActionRevealDurationMs"));
    }

    function actionSettleMs(item = null) {
      if (!item) return compactTimingMs(duration("actionSettleDurationMs"), duration("compactActionSettleDurationMs"));
      if (item.isHeroAction) return compactTimingMs(duration("heroActionSettleDurationMs"), duration("compactHeroActionSettleDurationMs"));
      if (item.allInResponse) return duration("allInResponseSettleMs");
      if (actionAnimationIsAllIn(null, item)) return compactTimingMs(duration("allInActionSettleDurationMs"), duration("compactAllInActionSettleDurationMs"));
      if (isRiverResolutionAction(item)) return compactTimingMs(duration("riverDecisionSettleDurationMs"), duration("compactRiverDecisionSettleDurationMs"));
      const tone = String(item?.tone || "");
      if (tone === "fold") return compactTimingMs(duration("foldActionSettleDurationMs"), duration("compactFoldActionSettleDurationMs"));
      if (tone === "passive") return compactTimingMs(duration("passiveActionSettleDurationMs"), duration("compactPassiveActionSettleDurationMs"));
      if (tone === "aggressive") return compactTimingMs(duration("aggressiveActionSettleDurationMs"), duration("compactAggressiveActionSettleDurationMs"));
      return compactTimingMs(duration("actionSettleDurationMs"), duration("compactActionSettleDurationMs"));
    }

    function actionHasChipFlight(item) {
      if (!usesDecorativeMotionLayer()) return false;
      if (!item || item.isHeroAction || String(item.tone || "") === "fold") return false;
      const label = String(item.label || "");
      return /^(call|bet|raise to|all-in)\b/i.test(label) || /^(колл|бет|рейз|олл-ин)/i.test(label);
    }

    function chipFlightMs(action = null) {
      if (!action || !actionHasChipFlight(action)) return 0;
      if (actionAnimationIsAllIn(null, action)) return compactTimingMs(duration("allInChipFlightDurationMs"), duration("compactAllInChipFlightDurationMs"));
      if (actionRiverResolution(action) === "call-to-showdown") return compactTimingMs(duration("riverCallChipFlightDurationMs"), duration("compactRiverCallChipFlightDurationMs"));
      const tone = String(action?.tone || "");
      if (tone === "aggressive") return compactTimingMs(duration("aggressiveChipFlightDurationMs"), duration("compactAggressiveChipFlightDurationMs"));
      if (tone === "passive") return compactTimingMs(duration("passiveChipFlightDurationMs"), duration("compactPassiveChipFlightDurationMs"));
      return compactTimingMs(
        Math.max(0, duration("chipRevealDurationMs") - duration("chipAnnouncementDelayMs")),
        Math.max(0, duration("compactChipRevealDurationMs") - duration("compactChipAnnouncementDelayMs"))
      );
    }

    function chipAnnouncementDelayForAction(action = null) {
      return actionHasChipFlight(action)
        ? compactTimingMs(duration("chipAnnouncementDelayMs"), duration("compactChipAnnouncementDelayMs"))
        : 0;
    }

    function chipRevealMs(action = null) {
      if (!action) return compactTimingMs(duration("chipRevealDurationMs"), duration("compactChipRevealDurationMs"));
      const flightMs = chipFlightMs(action);
      return flightMs > 0 ? chipAnnouncementDelayForAction(action) + flightMs : 0;
    }

    function betMarkerLandingMs(action = null) {
      const flightMs = chipFlightMs(action);
      return flightMs > 0
        ? chipAnnouncementDelayForAction(action) + Math.max(0, Math.round(flightMs * BET_FLIGHT_MARKER_LAND_RATIO))
        : 0;
    }

    function betMarkerSettleMs() {
      return compactTimingMs(duration("betMarkerSettleDurationMs", 180), duration("compactBetMarkerSettleDurationMs", 72));
    }

    function actionStepMotionMs(item = null) {
      const textAndChipMs = actionMotionMs(item) + actionSettleMs(item);
      const betSettleMs = actionHasChipFlight(item) ? chipRevealMs(item) + betMarkerSettleMs() : 0;
      return Math.max(textAndChipMs, betSettleMs);
    }

    function actionStepMs(item = null) {
      return actionThinkMs(item) + actionStepMotionMs(item);
    }

    function boardRevealMs() {
      return compactTimingMs(duration("boardRevealDurationMs"), duration("compactBoardRevealDurationMs"));
    }

    function boardSettleMs() {
      return compactTimingMs(duration("boardSettleDurationMs"), duration("compactBoardSettleDurationMs"));
    }

    function actionThinkMs(item) {
      if (item?.isHeroAction) return 0;
      if (item?.allInResponse) return duration("allInResponseThinkMs");
      if (prefersReducedMotion()) return 0;
      if (actionAnimationIsAllIn(null, item)) return compactTimingMs(duration("allInThinkDurationMs"), duration("compactAllInThinkDurationMs"));
      if (isRiverResolutionAction(item)) return compactTimingMs(duration("riverDecisionThinkDurationMs"), duration("compactRiverDecisionThinkDurationMs"));
      const tone = String(item?.tone || "");
      if (tone === "fold") return compactTimingMs(duration("foldThinkDurationMs"), duration("compactFoldThinkDurationMs"));
      if (tone === "passive") return compactTimingMs(duration("passiveThinkDurationMs"), duration("compactPassiveThinkDurationMs"));
      if (tone === "aggressive") return compactTimingMs(duration("aggressiveThinkDurationMs"), duration("compactAggressiveThinkDurationMs"));
      return compactTimingMs(duration("actionThinkDurationMs"), duration("compactActionThinkDurationMs"));
    }

    function actionVisualLeadMs(table, fromTime = now()) {
      const visualUntil = visualNumber(table, "dealRevealUntil");
      return Math.max(0, visualUntil - fromTime);
    }

    function actionSequenceElapsedMs(table) {
      const startedAt = visualNumber(table, "actionRevealStartedAt");
      return startedAt ? Math.max(0, now() - startedAt) : 0;
    }

    function pendingBoardReveal(table, revealFromOverride = undefined) {
      const revealFrom = Number.isFinite(Number(revealFromOverride))
        ? Number(revealFromOverride)
        : visualNumber(table, "boardRevealFrom", table?.board?.length ?? 0);
      return Boolean(table && table.board.length > revealFrom);
    }

    function shouldRevealBoardBeforeAction(table, action, revealFromOverride = undefined) {
      const revealFrom = Number.isFinite(Number(revealFromOverride))
        ? Number(revealFromOverride)
        : visualNumber(table, "boardRevealFrom");
      if (!pendingBoardReveal(table, revealFrom) || !action) return false;
      return Number(action.boardLength || 0) > revealFrom
        && !boardRevealFollowsClosingAction(action, revealFrom);
    }

    function streetForBoardLength(length) {
      const safeLength = Math.max(0, Math.round(Number(length) || 0));
      if (safeLength <= 0) return "preflop";
      if (safeLength <= 3) return "flop";
      if (safeLength === 4) return "turn";
      return "river";
    }

    function boardRevealFollowsClosingAction(action, revealFrom) {
      const actionStreet = String(action?.street || "");
      return Boolean(actionStreet && actionStreet === streetForBoardLength(revealFrom));
    }

    function actionBoardRevealTarget(table, action, revealFrom) {
      const finalLength = Array.isArray(table?.board) ? table.board.length : 0;
      const actionLength = Number(action?.boardLength);
      if (!Number.isFinite(actionLength)) return revealFrom;
      return Math.max(revealFrom, Math.min(finalLength, Math.round(actionLength)));
    }

    function actionSequenceBoardRevealStages(table, options = {}) {
      const actions = Array.isArray(table?.actionAnimations) ? table.actionAnimations : [];
      const finalLength = Array.isArray(table?.board) ? table.board.length : 0;
      const startLength = Number.isFinite(Number(options.revealFrom))
        ? Math.max(0, Math.round(Number(options.revealFrom)))
        : Math.max(0, Math.round(visualNumber(table, "boardRevealFrom", finalLength)));
      if (!actions.length || finalLength <= startLength) return [];
      let cursor = Number.isFinite(Number(options.leadMs))
        ? Number(options.leadMs)
        : visualNumber(table, "actionSequenceLeadMs");
      let revealedLength = Math.min(startLength, finalLength);
      const stages = [];
      const appendStage = (target) => {
        const revealMs = boardRevealMs();
        const settleMs = boardSettleMs();
        stages.push({
          from: revealedLength,
          to: target,
          startMs: cursor,
          revealEndMs: cursor + revealMs,
          endMs: cursor + revealMs + settleMs
        });
        cursor += revealMs + settleMs;
        revealedLength = target;
      };
      actions.forEach((action) => {
        const target = actionBoardRevealTarget(table, action, revealedLength);
        const revealAfterAction = target > revealedLength
          && boardRevealFollowsClosingAction(action, revealedLength);
        if (target > revealedLength && !revealAfterAction) appendStage(target);
        cursor += actionStepMs(action);
        if (revealAfterAction) appendStage(target);
      });
      if (finalLength > revealedLength) {
        appendStage(finalLength);
      }
      return stages;
    }

    function actionSequenceBoardRevealState(table, options = {}) {
      if (!isActionSequenceActive(table)) return null;
      const stages = actionSequenceBoardRevealStages(table, options);
      // A single street transition still belongs to the shared action clock.
      // Falling back to the legacy CSS-delay path here mounted the flop early
      // and rewrote its *remaining* delay on every opponent-action render. CSS
      // keeps the original animation origin, so those decreasing delays made
      // the board become visible before the closing preflop action. Keep even
      // one reveal stage behind the canonical action-sequence barrier.
      if (!stages.length) return null;
      const finalLength = Array.isArray(table?.board) ? table.board.length : 0;
      const elapsedMs = Number.isFinite(Number(options.elapsedMs)) ? Number(options.elapsedMs) : actionSequenceElapsedMs(table);
      let visibleLength = Math.max(0, Math.round(visualNumber(table, "boardRevealFrom", finalLength)));
      let renderableLength = visibleLength;
      let currentStage = null;
      for (const stage of stages) {
        if (elapsedMs < stage.startMs) break;
        currentStage = stage;
        renderableLength = stage.to;
        if (elapsedMs < stage.revealEndMs) {
          return {
            stages,
            stage,
            visibleLength: stage.from,
            renderableLength: stage.to,
            revealFrom: stage.from,
            revealTo: stage.to,
            revealing: true,
            elapsedMs
          };
        }
        visibleLength = stage.to;
        renderableLength = stage.to;
      }
      return {
        stages,
        stage: currentStage,
        visibleLength: Math.min(finalLength, visibleLength),
        renderableLength: Math.min(finalLength, renderableLength),
        revealFrom: currentStage ? currentStage.to : visibleLength,
        revealTo: currentStage ? currentStage.to : renderableLength,
        revealing: false,
        elapsedMs
      };
    }

    function actionTimingAtIndex(table, index, options = {}) {
      const actions = Array.isArray(table?.actionAnimations) ? table.actionAnimations : [];
      const safeIndex = Math.max(0, Number(index) || 0);
      const elapsedMs = Number.isFinite(Number(options.elapsedMs)) ? Number(options.elapsedMs) : actionSequenceElapsedMs(table);
      let cursor = Number.isFinite(Number(options.leadMs))
        ? Number(options.leadMs)
        : visualNumber(table, "actionSequenceLeadMs");
      const finalBoardLength = Array.isArray(table?.board) ? table.board.length : 0;
      let revealedBoardLength = Math.max(0, Math.round(visualNumber(table, "boardRevealFrom", finalBoardLength)));
      for (let cursorIndex = 0; cursorIndex < safeIndex; cursorIndex += 1) {
        const previous = actions[cursorIndex] || null;
        const targetBoardLength = actionBoardRevealTarget(table, previous, revealedBoardLength);
        const revealAfterAction = targetBoardLength > revealedBoardLength
          && boardRevealFollowsClosingAction(previous, revealedBoardLength);
        if (targetBoardLength > revealedBoardLength && !revealAfterAction && pendingBoardReveal(table, revealedBoardLength)) {
          cursor += boardRevealMs() + boardSettleMs();
          revealedBoardLength = targetBoardLength;
        }
        cursor += actionStepMs(previous);
        if (revealAfterAction && pendingBoardReveal(table, revealedBoardLength)) {
          cursor += boardRevealMs() + boardSettleMs();
          revealedBoardLength = targetBoardLength;
        }
      }
      const item = actions[safeIndex] || null;
      const targetBoardLength = actionBoardRevealTarget(table, item, revealedBoardLength);
      if (
        targetBoardLength > revealedBoardLength
        && !boardRevealFollowsClosingAction(item, revealedBoardLength)
        && pendingBoardReveal(table, revealedBoardLength)
      ) {
        cursor += boardRevealMs() + boardSettleMs();
        revealedBoardLength = targetBoardLength;
      }
      const thinkMs = actionThinkMs(item);
      const actionStartMs = cursor + thinkMs;
      const endMs = actionStartMs + actionStepMotionMs(item);
      return {
        thinkMs,
        thinkingDelayMs: cursor - elapsedMs,
        actionDelayMs: actionStartMs - elapsedMs,
        actionStartMs,
        endMs,
        elapsedMs
      };
    }

    function actionControlReadyMs(item = null) {
      if (!item) return compactTimingMs(duration("actionControlUnlockDurationMs"), duration("compactActionControlUnlockDurationMs"));
      if (item.isHeroAction) return compactTimingMs(duration("heroActionRevealDurationMs"), duration("compactHeroActionRevealDurationMs"));
      const chipMs = chipRevealMs(item);
      let readableMs = duration("actionControlUnlockDurationMs");
      let compactReadableMs = duration("compactActionControlUnlockDurationMs");
      const tone = String(item?.tone || "");
      if (actionAnimationIsAllIn(null, item)) {
        readableMs = duration("allInActionControlUnlockDurationMs");
        compactReadableMs = duration("compactAllInActionControlUnlockDurationMs");
      } else if (tone === "aggressive") {
        readableMs = duration("aggressiveActionControlUnlockDurationMs");
        compactReadableMs = duration("compactAggressiveActionControlUnlockDurationMs");
      } else if (String(item.street || "") !== "preflop") {
        readableMs = duration("postflopActionControlUnlockDurationMs");
        compactReadableMs = duration("compactPostflopActionControlUnlockDurationMs");
      }
      return compactTimingMs(Math.max(readableMs, chipMs), Math.max(compactReadableMs, chipMs));
    }

    function actionControlSettleMs(item = null) {
      if (!item || item.isHeroAction) return compactTimingMs(0, 0);
      return compactTimingMs(duration("actionControlSettleDurationMs"), duration("compactActionControlSettleDurationMs"));
    }

    function actionControlUnlockDuration(table) {
      const actions = Array.isArray(table?.actionAnimations) ? table.actionAnimations : [];
      const leadMs = visualNumber(table, "actionSequenceLeadMs");
      const actionDuration = actions.reduce((max, item, index) => {
        const timing = actionTimingAtIndex(table, index, { elapsedMs: 0, leadMs });
        return Math.max(max, timing.actionStartMs + actionControlReadyMs(item) + actionControlSettleMs(item));
      }, leadMs);
      const boardStages = actionSequenceBoardRevealStages(table, { leadMs });
      const boardDuration = boardStages.reduce((max, stage) => Math.max(max, Number(stage.endMs || 0)), 0);
      return Math.max(actionDuration, boardDuration);
    }

    function boardRevealStartDelay(table, options = {}) {
      const revealFrom = Number.isFinite(Number(options.revealFrom))
        ? Number(options.revealFrom)
        : visualNumber(table, "boardRevealFrom", table?.board?.length ?? 0);
      if (!pendingBoardReveal(table, revealFrom)) return 0;
      const actions = Array.isArray(table?.actionAnimations) ? table.actionAnimations : [];
      const elapsedMs = Number.isFinite(Number(options.elapsedMs)) ? Number(options.elapsedMs) : actionSequenceElapsedMs(table);
      let cursor = Number.isFinite(Number(options.leadMs))
        ? Number(options.leadMs)
        : visualNumber(table, "actionSequenceLeadMs");
      let revealedLength = revealFrom;
      for (const action of actions) {
        const target = actionBoardRevealTarget(table, action, revealedLength);
        if (target > revealedLength) {
          if (boardRevealFollowsClosingAction(action, revealedLength)) {
            cursor += actionStepMs(action);
          }
          break;
        }
        cursor += actionStepMs(action);
        revealedLength = target;
      }
      return Math.max(0, cursor - elapsedMs);
    }

    function boardRevealDelayRemaining(table) {
      if (!pendingBoardReveal(table)) return 0;
      const startedAt = visualNumber(table, "boardRevealStartedAt");
      const delayMs = visualNumber(table, "boardRevealDelayMs");
      if (!startedAt) return Math.max(0, delayMs);
      return Math.max(0, startedAt + delayMs - now());
    }

    function actionIndexForBetAnimation(table, betAnimation, fallbackIndex = 0) {
      const seatId = Number(betAnimation?.seatId);
      const actionKey = String(betAnimation?.actionKey || "");
      if (actionKey) {
        const keyedIndex = (table.actionAnimations || [])
          .findIndex((item) => String(item?.key || "") === actionKey);
        if (keyedIndex >= 0) return keyedIndex;
      }
      const actionSeq = Number(betAnimation?.actionSeq);
      if (Number.isFinite(actionSeq)) {
        const seqIndex = (table.actionAnimations || [])
          .findIndex((item) => Number(item?.seatId) === seatId && Number(item?.seq) === actionSeq);
        if (seqIndex >= 0) return seqIndex;
      }
      onOrdinalFallback(betAnimation);
      const hasBetStreet = betAnimation && betAnimation.street !== undefined;
      const betStreet = hasBetStreet ? String(betAnimation.street || "") : "";
      const hasBetBoardLength = Number.isFinite(Number(betAnimation?.boardLength));
      const betBoardLength = Number(betAnimation?.boardLength);
      const betOrdinal = (table.betAnimations || [])
        .slice(0, fallbackIndex + 1)
        .filter((item) => Number(item.seatId) === seatId)
        .filter((item) => !hasBetStreet || String(item?.street || "") === betStreet)
        .filter((item) => !hasBetBoardLength || Number(item?.boardLength) === betBoardLength)
        .length - 1;
      const candidates = (table.actionAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => Number(item.seatId) === seatId && item.tone !== "fold")
        .filter(({ item }) => !hasBetStreet || String(item?.street || "") === betStreet)
        .filter(({ item }) => !hasBetBoardLength || Number(item?.boardLength) === betBoardLength);
      const candidate = candidates[Math.max(0, Math.min(betOrdinal, candidates.length - 1))];
      return candidate ? candidate.index : fallbackIndex;
    }

    function pendingBetMarkerLandingItems(table, timingOptions = {}) {
      if (!usesDecorativeMotionLayer()) return [];
      if (!isActionSequenceActive(table)) return [];
      return (table.betAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => Number(item.seatId) !== 0 && Number(item.amount || 0) > 0)
        .filter(({ item }) => !item.landed)
        .map(({ item, index }) => {
          const actionIndex = actionIndexForBetAnimation(table, item, index);
          const timing = actionTimingAtIndex(table, actionIndex, timingOptions);
          const action = table.actionAnimations?.[actionIndex] || null;
          const arrivalMs = timing.actionDelayMs + betMarkerLandingMs(action);
          const flightEndMs = timing.actionDelayMs + chipRevealMs(action);
          return {
            key: item.key,
            animation: item,
            seatId: Number(item.seatId),
            amount: Number(item.amount || 0),
            arrivalMs: Math.max(0, arrivalMs),
            flightEndMs: Math.max(0, flightEndMs)
          };
        });
    }

    // Terminal fold-to-win only: the hero (seatId 0) is normally EXCLUDED from
    // every pot-flight / bet-marker-landing computation (the `seatId !== 0`
    // filters below and in pendingBetMarkerLandingItems), because mid-hand the
    // hero's own felt bet is driven by renderHeroFeltBet off table.seatBets and
    // never flies. But when the hand ENDS by everyone folding to the hero,
    // engine-showdown.closeTerminalBettingState() wipes table.seatBets and moves
    // the hero's committed chips into the visualClosedStreetBets snapshot. With
    // no hero bet-animation in motion and no next-street action, the twin
    // closingStreetTransitionStillReadable() then evaluates to false and BOTH
    // consumers (the pot pill and renderHeroFeltBet) drop the hero bet instantly
    // — the felt chips blink out with zero motion while the fold animations are
    // still playing (obs: hero bet vanishes ~195ms after the first fold badge).
    // Including a hero sweep item here makes schedulePotFlightSettle stamp
    // table.potFlightUntil, whose >now() leg (already present in the byte-
    // identical twin) holds the hero felt bet for the whole flight so the chips
    // visibly sweep to the pot before the award flies back. Reduced-motion never
    // schedules a flight (schedulePotFlightSettle clears potFlightUntil), so the
    // hero bet releases instantly there as today — acceptable, no motion layer.
    function heroTerminalSweepAmount(table) {
      // Scope strictly to the FOLD-to-win terminals ("won" = opponents fold to a
      // hero raise / walk; "folded" = the busted-carryover close). Deliberately
      // NOT "showdown": a shown-cards resolution already routes the river felt
      // bet through the river-resolution flight choreography and the twin's
      // river->showdown seq-band hold, so touching potFlightUntil there would
      // perturb pot-readout math the closing-street twin gate pins. This path is
      // only about the uncontested win where nothing else holds the hero bet.
      const status = String(table?.status || "playing");
      if (status !== "won" && status !== "folded") return 0;
      const snapshot = closingStreetBetSnapshot(table);
      if (!snapshot) return 0;
      return Math.max(0, roundBb(Number(snapshot.seatBets?.[0] || 0)));
    }

    // Latest fold-action arrival (elapsed-relative, matching pendingPotFlightItems'
    // arrivalMs frame) so the terminal hero sweep leaves only once the table has
    // visibly folded to the hero. Returns 0 when no fold action is enqueued.
    function foldSequenceArrivalMs(table, timingOptions = {}) {
      const actions = Array.isArray(table?.actionAnimations) ? table.actionAnimations : [];
      let latest = 0;
      actions.forEach((item, index) => {
        if (!item || String(item.tone || "") !== "fold") return;
        const timing = actionTimingAtIndex(table, index, timingOptions);
        latest = Math.max(latest, Number(timing.endMs || 0) - Number(timing.elapsedMs || 0));
      });
      return Math.max(0, latest);
    }

    function pendingPotFlightItems(table, timingOptions = {}) {
      if (!usesDecorativeMotionLayer()) return [];
      if (!isActionSequenceActive(table)) return [];
      const settleMs = betMarkerSettleMs();
      const heroSweep = heroTerminalSweepAmount(table);
      const items = (table.betAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => Number(item.seatId) !== 0 && Number(item.amount || 0) > 0)
        .map(({ item, index }) => {
          const actionIndex = actionIndexForBetAnimation(table, item, index);
          const timing = actionTimingAtIndex(table, actionIndex, timingOptions);
          const action = table.actionAnimations?.[actionIndex] || null;
          const arrivalMs = timing.actionDelayMs + chipAnnouncementDelayForAction(action) + chipFlightMs(action);
          return {
            amount: Number(item.amount || 0),
            arrivalMs: Math.max(0, arrivalMs + settleMs)
          };
        });
      if (heroSweep > 0) {
        // The hero's own action carries NO chip flight (actionHasChipFlight is
        // false for isHeroAction — the hero bet is drawn statically by
        // renderHeroFeltBet, never flown), so it contributes zero flight time.
        // Anchoring the sweep to it would stamp an arrival of ~0 and the hold
        // would expire within a frame. The terminal sweep needs its own real
        // flight duration, sequenced AFTER the opponents' folds so the
        // choreography reads folds -> hero bet sweeps to pot -> award flies back.
        // Anchor at the latest fold/opponent arrival already computed above (so
        // the hero chips leave once the table has visibly folded to the hero),
        // then add a full aggressive-tone chip flight (the hero raised) plus the
        // marker settle. Fall back to the raw flight+settle when the hero is the
        // only committed seat (heads-up walk: no opponent chips in flight).
        const sweepFlightMs = compactTimingMs(
          duration("aggressiveChipFlightDurationMs"),
          duration("compactAggressiveChipFlightDurationMs")
        );
        const foldArrivalMs = foldSequenceArrivalMs(table, timingOptions);
        const priorArrivalMs = items.reduce((max, item) => Math.max(max, Number(item.arrivalMs || 0)), 0);
        const anchorMs = Math.max(foldArrivalMs, priorArrivalMs);
        const heroArrivalMs = anchorMs + Math.max(0, sweepFlightMs) + settleMs;
        items.push({ amount: heroSweep, arrivalMs: Math.max(0, heroArrivalMs) });
      }
      return items.filter((item) => item.arrivalMs > 0);
    }

    function terminalClosingStreetHoldActive(table) {
      return Boolean(table?.status === "showdown" && !showdownAwardVisible(table));
    }

    function closingStreetBetSnapshot(table) {
      const snapshot = table?.visualClosedStreetBets;
      if (!snapshot || (!isActionSequenceActive(table) && !terminalClosingStreetHoldActive(table))) return null;
      if (Number(snapshot.handNo) !== Number(table?.handNo)) return null;
      if (!snapshot.seatBets || typeof snapshot.seatBets !== "object") return null;
      return snapshot;
    }

    function actionMatchesClosingStreet(table, item, index, snapshot) {
      // TWIN CONTRACT: byte-identical in simulator-action-visuals.js and
      // simulator-table-effects.js — guarded by
      // scripts/simulator-closing-street-twin-smoke.mjs. Both consumers must read
      // the same "does this bet belong to the just-closed street?" truth.
      if (!snapshot || !item) return false;
      const actionIndex = actionIndexForBetAnimation(table, item, index);
      const action = table.actionAnimations?.[actionIndex] || null;
      if (!action) return false;
      // SEQ-BAND FIRST. table.actionSeq is a contiguous per-hand counter, so the
      // closing street's actions occupy exactly [openingSeq, closingSeq] and an
      // action belongs to the closed street iff its seq lands inside that band.
      // The band's lower edge is load-bearing: a `seq <= closingSeq` upper-bound-
      // only test false-matches earlier-street actions (the seq-agreement harness
      // measured 719 such cases). action.seq > 0 because recordSeatAction stamps
      // seq = ++actionSeq (>= 1) on EVERY engine action, hero included — verified
      // against the real engine by scripts/simulator-seq-agreement-engine-smoke.mjs;
      // so `> 0` here is the conservative "this is a real, seq-carrying engine
      // action" test, and its failure is what routes non-engine items to the tuple.
      const usable = Number.isFinite(snapshot.openingSeq)
        && Number.isFinite(snapshot.closingSeq)
        && Number.isFinite(action.seq)
        && action.seq > 0;
      if (usable) {
        return action.seq >= snapshot.openingSeq && action.seq <= snapshot.closingSeq;
      }
      // LEGACY TUPLE FALLBACK — (street,boardLength) equality. Reached only when
      // the band is not usable: MP synth snapshots and the multiplayer adapter path
      // (which does not stamp opening/closingSeq), replayed hand-history, sessions
      // recorded before the seq band shipped, and hero-authored items whose action
      // carries seq 0/undefined. On band-usable engine data the band and the tuple
      // agree on normal engine output. The band also remains backward-compatible
      // with older recorded terminal snapshots whose label was re-stamped as
      // {showdown,5}: their seq identity can still resolve the closing action even
      // when the tuple cannot. New live showdowns snapshot before publishing the
      // terminal street, so they carry the full real {river,5} band. This tuple leg
      // still serves the band-less inputs enumerated above.
      return String(action.street || "") === String(snapshot.street || "")
        && Number(action.boardLength || 0) === Number(snapshot.boardLength || 0);
    }

    function nextStreetActions(table, snapshot) {
      if (!snapshot) return [];
      const snapshotStreet = String(snapshot.street || "");
      const snapshotBoardLength = Number(snapshot.boardLength || 0);
      return (table?.actionAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
          const actionStreet = String(item?.street || "");
          const actionBoardLength = Number(item?.boardLength || 0);
          return actionBoardLength > snapshotBoardLength
            || (snapshotStreet && actionStreet && actionStreet !== snapshotStreet);
        });
    }

    function tableAdvancedPastSnapshot(table, snapshot) {
      if (!table || !snapshot) return false;
      const snapshotStreet = String(snapshot.street || "");
      const currentStreet = String(table.street || "");
      const snapshotBoardLength = Number(snapshot.boardLength || 0);
      const currentBoardLength = Array.isArray(table.board) ? table.board.length : snapshotBoardLength;
      return currentBoardLength > snapshotBoardLength
        || (snapshotStreet && currentStreet && currentStreet !== snapshotStreet)
        || (table.status && table.status !== "playing");
    }

    function closingStreetTransitionStillReadable(table, snapshot) {
      // TWIN CONTRACT: this function lives verbatim in BOTH
      // simulator-action-visuals.js (pot readout) and
      // simulator-table-effects.js (felt bet markers). The copies MUST stay
      // byte-identical — both consumers read the same truth, or the pot pill
      // withholds money whose marker is already cleared and the chips visually
      // vanish. Guarded by scripts/simulator-closing-street-twin-smoke.mjs.
      const actionSequenceActive = isActionSequenceActive(table);
      const terminalHoldActive = terminalClosingStreetHoldActive(table);
      if (!snapshot || (!actionSequenceActive && !terminalHoldActive)) return false;
      if (!tableAdvancedPastSnapshot(table, snapshot)) return false;
      // At terminal showdown the engine has already settled the hand, but the
      // product has not yet announced/moved the pot. Keep every river wager in
      // front of its owner until the canonical showdown award phase begins; an
      // expired action bubble is not a chip-settlement barrier.
      if (terminalHoldActive) return true;
      // potFlightUntil is the authoritative "chips are still flying to the pot"
      // deadline. Hold the just-closed street's bet on the felt for the WHOLE
      // flight, not merely until the next street's first action BEGINS — the old
      // actionDelayMs>0 cutoff blinked the readout out the instant the next
      // deliberation started (obs 13537), so a flop bet vanished before the
      // street had visibly resolved.
      if ((Number(table?.potFlightUntil) || 0) > now()) return true;
      const upcomingActions = nextStreetActions(table, snapshot);
      // Flight landed and nothing further is enqueued: the sweep is visually
      // complete — release the readout so the marker clears before the board
      // advances (60d3b058) instead of pinning a stale bet through the reveal.
      if (!upcomingActions.length) return false;
      return upcomingActions.some(({ index }) => Number(actionTimingAtIndex(table, index)?.actionDelayMs || 0) > 0);
    }

    function closedStreetReadablePotAmount(table) {
      const snapshot = closingStreetBetSnapshot(table);
      if (!closingStreetTransitionStillReadable(table, snapshot)) return 0;
      return roundBb(Object.values(snapshot.seatBets || {})
        .reduce((sum, amount) => sum + Math.max(0, Number(amount || 0)), 0));
    }

    function currentStreetBetsAmount(table) {
      // Chips wagered on the CURRENT (still-open) street, summed across seats.
      // table.contributions is incremented in lockstep with table.pot as each
      // bet is paid (engine-core payChips) and reset to {} when the street
      // closes (engine-showdown clearStreetBets), so it is the exact complement
      // of the pot: pot - streetBets = chips already settled from earlier streets
      // (antes / dead money included). This split feeds the two readouts — the
      // settled "carried" pile beside the chips, and the live "total" across the
      // board that folds the current street's bets back in.
      const contributions = table?.contributions || {};
      return roundBb(Object.values(contributions)
        .reduce((sum, amount) => sum + Math.max(0, Number(amount || 0)), 0));
    }

    function potAnimationState(table) {
      const finalAmount = roundBb(Number(table?.pot || 0));
      const pendingItems = pendingPotFlightItems(table);
      const inFlightAmount = roundBb(pendingItems.reduce((sum, item) => sum + Number(item.amount || 0), 0));
      const closedStreetAmount = closedStreetReadablePotAmount(table);
      const pendingAmount = roundBb(inFlightAmount + closedStreetAmount);
      const visibleAmount = roundBb(Math.max(0, finalAmount - pendingAmount));
      const streetBets = currentStreetBetsAmount(table);
      // Carried = the settled central pile beside the chips: the pot minus the
      // current street's chips that are ALREADY sitting in front of players,
      // while still WITHHOLDING any of those chips that are still in flight to a
      // seat. Flat during a street; it ticks up only once a street's bets land.
      //
      // The invariant: carried peels off only landedStreetBets =
      // max(0, streetBets - inFlight), i.e. the current street's contributions
      // minus whatever is still flying. This is consistent with the pill's
      // totalAmount = final - inFlight — both keep still-flying chips out of the
      // settled reading, so a chip is never shown as settled centre pile while
      // its flight is still animating to a seat.
      //
      // Relative to the old `final - streetBets - closedStreet`: the two are
      // identical on every frame where inFlight <= streetBets (the common case —
      // in-flight chips are a subset of the current street's contributions, so
      // subtracting inFlight from streetBets and anchoring on visible lands on
      // the same value). They differ ONLY when inFlight > streetBets — e.g. the
      // MP closing-street synth where contributions were already reset (streetBets
      // low) while the just-closed bet is still flying (inFlight high). There the
      // old formula reported chips that were still visibly in the air (carried >
      // visible); this form peels the in-flight chips off first so carried never
      // exceeds visible. It is a no-op everywhere else.
      const landedStreetBets = Math.max(0, streetBets - inFlightAmount);
      const carriedAmount = roundBb(Math.max(0, visibleAmount - landedStreetBets));
      // Total = the grand pot WITH the current street's bets. Ticks up as each
      // live bet's chips land in front of its player (in-flight chips held back);
      // unaffected by the street-close sweep, since that money is already counted.
      const totalAmount = roundBb(Math.max(0, finalAmount - inFlightAmount));
      const latestArrivalMs = pendingItems.reduce((max, item) => Math.max(max, Number(item.arrivalMs || 0)), 0);
      return {
        finalAmount,
        visibleAmount,
        carriedAmount,
        totalAmount,
        streetBetsAmount: streetBets,
        inFlightAmount,
        pendingAmount,
        closedStreetAmount,
        settleDelayMs: Math.max(0, Math.round(latestArrivalMs)),
        hasPending: pendingAmount > 0 && latestArrivalMs > 0
      };
    }

    function actionAnimationIndexForSeat(table, seatId, tone = "", seq = null) {
      return (table.actionAnimations || [])
        .findIndex((item) =>
          Number(item.seatId) === Number(seatId)
          && (!tone || String(item.tone || "") === tone)
          && (seq == null || Number(item.seq) === Number(seq))
        );
    }

    function actionAnimationHasStarted(table, actionIndex) {
      if (!isActionSequenceActive(table)) return true;
      if (!Number.isFinite(Number(actionIndex)) || Number(actionIndex) < 0) return true;
      return actionTimingAtIndex(table, actionIndex).actionDelayMs <= 0;
    }

    function actionAnimationHasCompleted(table, actionIndex) {
      if (!isActionSequenceActive(table)) return true;
      if (!Number.isFinite(Number(actionIndex)) || Number(actionIndex) < 0) return true;
      const timing = actionTimingAtIndex(table, actionIndex);
      return timing.endMs - timing.elapsedMs <= 0;
    }

    function actionAnimationIsInMotion(table, actionIndex) {
      if (!isActionSequenceActive(table)) return false;
      if (!Number.isFinite(Number(actionIndex)) || Number(actionIndex) < 0) return false;
      const timing = actionTimingAtIndex(table, actionIndex);
      return timing.actionDelayMs <= 0 && timing.endMs - timing.elapsedMs > 0;
    }

    function captureHeroActionAnimation(table) {
      const action = table?.seatActions?.[0];
      if (!table || !action?.label) return null;
      const actionBoardLength = Number(action.boardLength);
      return {
        key: `${table.handNo}-hero-action-${action.seq || now()}`,
        seatId: 0,
        label: action.label,
        tone: action.tone || "passive",
        // The local engine may synchronously run every remaining bot and open
        // later streets before control returns (notably tournament Hero-fold
        // continuations). Keep Hero on the street/board where Hero ACTED;
        // stamping the resolved table state here makes the board-reveal model
        // schedule the new board before Hero's own bubble.
        street: action.street || table.street,
        boardLength: Number.isFinite(actionBoardLength)
          ? Math.max(0, Math.round(actionBoardLength))
          : (Array.isArray(table.board) ? table.board.length : 0),
        seq: action.seq || 0,
        isHeroAction: true
      };
    }

    function captureVisualSeatState(table) {
      return {
        handNo: Number(table?.handNo || 0),
        // Freeze the pre-resolution contested set + street. An all-in resolves
        // the whole hand synchronously: foldSeat strips every folder from
        // contestingSeatIds and showdown() jumps table.street to "showdown"
        // before the renderer runs. seatOutsideContestedPot /
        // seatFoldedBeforeCurrentStreet read these so fold-dimming stays gated
        // on each seat's own fold animation instead of the resolved end state.
        street: String(table?.street || "preflop"),
        contestingSeatIds: Array.isArray(table?.contestingSeatIds)
          ? table.contestingSeatIds.map(Number).filter((seatId) => Number.isFinite(seatId))
          : [],
        seats: (table?.seats || []).map((seat) => ({
          id: Number(seat.id),
          stack: roundBb(Number(seat.stack || 0)),
          lobbyState: String(seat.lobbyState || "active"),
          // Freeze each seat's PRE-action fold flag. contestingSeatIds is empty
          // through the whole preflop street (it is only repopulated when a
          // street settles), so it cannot tell "folded before this Hero action"
          // from "folds in response to it". The fold flag can: a seat already
          // folded at capture time folded in an earlier cascade (dim it now); a
          // seat still live here folds in RESPONSE and must keep gating on its
          // own fold animation.
          folded: Boolean(seat.folded)
        }))
      };
    }

    function allInRunoutIncludesHero(table) {
      if (!table?.allInRunout) return false;
      const participants = Array.isArray(table.allInRunout.participants) ? table.allInRunout.participants : [];
      if (!participants.length) return true;
      return participants.some((participant) =>
        Boolean(participant?.isHero) || Number(participant?.seatId) === 0
      );
    }

    function annotateActionAnimationMotion(table) {
      if (!table || !Array.isArray(table.actionAnimations)) return;
      const allInResponse = allInRunoutIncludesHero(table);
      table.actionAnimations = table.actionAnimations.map((item) => ({
        ...item,
        isAllIn: actionAnimationIsAllIn(table, item),
        riverResolution: riverResolutionKind(table, item),
        // Villain answers in all-in pots involving Hero ride the always-on
        // cinematic cadence. Bot-only continuations after Hero folds keep the
        // normal tone cadence so the remaining table does not flash by.
        allInResponse: allInResponse && !item.isHeroAction && Number(item.seatId) !== 0
      }));
    }

    function actionRevealDuration(table) {
      const actions = Array.isArray(table?.actionAnimations) ? table.actionAnimations : [];
      const chips = Array.isArray(table?.betAnimations) ? table.betAnimations : [];
      const leadMs = visualNumber(table, "actionSequenceLeadMs");
      const actionDuration = actions.reduce((max, item, index) => {
        const timing = actionTimingAtIndex(table, index, { elapsedMs: 0, leadMs });
        return Math.max(max, timing.endMs);
      }, leadMs);
      const chipDuration = chips.reduce((max, item, index) => {
        if (Number(item.seatId) === 0) return max;
        const actionIndex = actionIndexForBetAnimation(table, item, index);
        const timing = actionTimingAtIndex(table, actionIndex, { elapsedMs: 0, leadMs });
        const action = table.actionAnimations?.[actionIndex] || null;
        return Math.max(max, timing.actionStartMs + chipRevealMs(action));
      }, 0);
      const boardStages = actionSequenceBoardRevealStages(table, { leadMs });
      const boardDuration = boardStages.reduce((max, stage) => Math.max(max, Number(stage.endMs || 0)), 0);
      return Math.max(actionDuration, chipDuration, boardDuration);
    }

    return {
      reducedTableMotion,
      usesDecorativeMotionLayer,
      prefersReducedMotion,
      compactTimingMs,
      riverResolutionKind,
      actionRiverResolution,
      isRiverResolutionAction,
      riverResolutionCueMs,
      riverResolutionCueDelayMs,
      riverResolutionMotionMs,
      actionRevealMs,
      actionSettleMs,
      chipFlightMs,
      chipAnnouncementDelayForAction,
      chipRevealMs,
      betMarkerLandingMs,
      betMarkerSettleMs,
      boardRevealMs,
      boardSettleMs,
      actionRevealDuration,
      actionVisualLeadMs,
      actionSequenceElapsedMs,
      actionTimingAtIndex,
      actionControlReadyMs,
      actionControlSettleMs,
      actionControlUnlockDuration,
      pendingBoardReveal,
      shouldRevealBoardBeforeAction,
      actionSequenceBoardRevealStages,
      actionSequenceBoardRevealState,
      boardRevealStartDelay,
      boardRevealDelayRemaining,
      actionAnimationIsAllIn,
      actionHasChipFlight,
      pendingPotFlightItems,
      pendingBetMarkerLandingItems,
      closedStreetReadablePotAmount,
      closingStreetTransitionStillReadable,
      potAnimationState,
      actionIndexForBetAnimation,
      actionAnimationIndexForSeat,
      actionAnimationHasStarted,
      actionAnimationHasCompleted,
      actionAnimationIsInMotion,
      captureHeroActionAnimation,
      captureVisualSeatState,
      annotateActionAnimationMotion,
      actionThinkMs
    };
  }

  root.PokerSimulatorActionVisuals = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
