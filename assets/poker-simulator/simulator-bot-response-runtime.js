(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => ({ settings: {} });
    const getTable = typeof options.getTable === "function" ? options.getTable : () => null;
    const engine = options.engine || {};
    const captureVisualSeatState = typeof options.captureVisualSeatState === "function"
      ? options.captureVisualSeatState
      : () => null;
    const retainBetAnimationsForActionSequence = typeof options.retainBetAnimationsForActionSequence === "function"
      ? options.retainBetAnimationsForActionSequence
      : () => {};
    const clearActionBubbleLatch = typeof options.clearActionBubbleLatch === "function"
      ? options.clearActionBubbleLatch
      : () => {};

    function state() {
      return getState() || {};
    }

    function restartHeroActionAnimationSequence(table, heroActionAnimation, sequenceOptions = {}) {
      if (!table || !heroActionAnimation) return;
      // This is an explicit fresh visual chapter. The data queue below drops
      // pre-Hero / previous-street actions, so drop their keyed DOM bubbles too.
      // Generic action-unlock must keep the latch: it can be the one-frame gap
      // between two responses in the SAME chapter.
      clearActionBubbleLatch(table, "bot-response-fresh-sequence");
      const includeHero = sequenceOptions.includeHero !== false;
      const heroSeq = Number(heroActionAnimation.seq);
      const laterActions = (Array.isArray(table.actionAnimations) ? table.actionAnimations : [])
        .filter((item) => {
          if (!item || item.key === heroActionAnimation.key) return false;
          const itemSeq = Number(item.seq);
          return Number.isFinite(heroSeq) && Number.isFinite(itemSeq) && itemSeq > heroSeq;
        })
        .sort((first, second) => Number(first.seq) - Number(second.seq));
      const seenKeys = new Set();
      table.actionAnimations = [
        ...(includeHero ? [heroActionAnimation] : []),
        ...laterActions
      ].filter((item) => {
        const key = String(item?.key || "");
        if (!key || seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      if (Array.isArray(table.betAnimations) && Number.isFinite(heroSeq)) {
        const visibleActionKeys = new Set(table.actionAnimations.map((item) => String(item?.key || "")));
        retainBetAnimationsForActionSequence(table, {
          afterSeq: heroSeq,
          actionKeys: [...visibleActionKeys]
        });
      }
    }

    function runBotResponse(tableId, heroAction, heroAmount, guard = null) {
      if (options.isPaused()) {
        options.scheduleBotResponse(tableId, heroAction, heroAmount, 0, guard);
        return;
      }
      const table = getTable(tableId);
      let pending = table?.pendingBotResponse || null;
      if (!options.canRunScheduledBotResponse(table)) {
        pending = options.recoverPendingBotResponse(table);
        if (!pending) return;
      }
      if (!options.botResponseGuardMatches(table, guard)) {
        pending = options.pendingBotResponseStillCurrent(table, pending)
          ? pending
          : options.recoverPendingBotResponse(table);
        if (!pending) return;
      }
      pending = options.pendingBotResponseStillCurrent(table, pending) ? pending : null;
      const resolvedHeroAction = pending?.heroAction || heroAction;
      const resolvedHeroAmount = Number.isFinite(Number(pending?.heroAmount)) ? Number(pending.heroAmount) : heroAmount;
      const previousBoardLength = table.board.length;
      const heroActionAnimation = table.pendingHeroActionAnimation;
      const heroRevealAlreadyPrimed = Boolean(heroActionAnimation?.revealPrimed);
      const heroFoldContinuation = String(resolvedHeroAction || "").toLowerCase() === "fold"
        || String(heroActionAnimation?.tone || "").toLowerCase() === "fold";
      table.pendingHeroActionAnimation = null;
      delete table.pendingBotResponse;
      // Snapshot every seat's stack BEFORE the engine debits the villain so the
      // villain stack holds its pre-action value on the felt until the bet chips
      // have visibly flown — mirroring the hero path. Without this base snapshot
      // the villain stack dropped instantly the moment the engine resolved,
      // because the seat-stack lock had nothing to read (obs 13538).
      const visualActionBaseState = captureVisualSeatState(table);
      const outcome = engine.resolveBotAction(table, resolvedHeroAction, resolvedHeroAmount, state().settings);
      const boardAdvanced = table.board.length > previousBoardLength;
      const restartVisualSequence = heroRevealAlreadyPrimed || heroFoldContinuation || boardAdvanced;
      if (heroActionAnimation) {
        if (heroRevealAlreadyPrimed) {
          // Hero was painted as its own chapter before the deferred engine
          // response. Start the response from the first strictly later action;
          // including Hero here would replay the click and can make a later
          // bot's thinking bubble appear to overtake it on a rebased clock.
          restartHeroActionAnimationSequence(table, heroActionAnimation, { includeHero: false });
        } else if (restartVisualSequence) {
          // A bot-only continuation after Hero folds, or one that advances the
          // board, is a new visible chapter of the hand. The engine history still
          // contains already-played actions; replaying it either repeats old
          // "думает"/fold beats or lets the new street outrun its own action.
          restartHeroActionAnimationSequence(table, heroActionAnimation);
        } else {
          table.actionAnimations = [
            heroActionAnimation,
            ...(table.actionAnimations || []).filter((item) => item.key !== heroActionAnimation.key)
          ];
        }
      }
      if (visualActionBaseState) table.visualActionBaseState = visualActionBaseState;
      options.annotateActionAnimationMotion(table);
      options.primeActionReveal(table, {
        previousBoardLength,
        forceFreshSequence: restartVisualSequence
      });
      options.primeShowdownAnimation(table);
      if (outcome.tone) options.playTone(outcome.tone);
      options.maybeRecordHand(table, { deferPersistence: true });
      options.queueNextHandIfNeeded(table);
      options.markTableDirty(table.id);
      options.render("bot-response");
    }

    return { runBotResponse };
  }

  root.PokerSimulatorBotResponseRuntime = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorBotResponseRuntime;
})();
