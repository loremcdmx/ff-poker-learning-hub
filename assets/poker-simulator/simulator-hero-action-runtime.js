(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const getState = typeof options.getState === "function" ? options.getState : () => ({ settings: {} });
    const actionRevealDuration = typeof options.actionRevealDuration === "function"
      ? options.actionRevealDuration
      : () => 0;
    const retainBetAnimationsForActionSequence = typeof options.retainBetAnimationsForActionSequence === "function"
      ? options.retainBetAnimationsForActionSequence
      : () => {};
    const clearActionBubbleLatch = typeof options.clearActionBubbleLatch === "function"
      ? options.clearActionBubbleLatch
      : () => {};
    const deferredActionTasks = [];
    let deferredActionTaskId = 0;

    function state() {
      return getState() || {};
    }

    function clonePlainRecord(value) {
      if (!value || typeof value !== "object") return value;
      const skip = new Set([
        "actionAnimations",
        "visualActionBaseState",
        "visualActionConfirmedState",
        "pendingBotResponse",
        "pendingHeroActionAnimation",
        "logs",
        "showdown",
        "potAwards"
      ]);
      return Object.keys(value).reduce((copy, key) => {
        if (skip.has(key)) return copy;
        const item = value[key];
        if (typeof item === "function") return copy;
        if (Array.isArray(item)) copy[key] = item.slice(0, 24);
        else if (item && typeof item === "object") copy[key] = { ...item };
        else copy[key] = item;
        return copy;
      }, {});
    }

    function cloneDecisionSnapshot(table) {
      if (!table || typeof table !== "object") return table;
      const snapshot = clonePlainRecord(table);
      snapshot.board = Array.isArray(table.board) ? table.board.slice(0, 5) : [];
      snapshot.heroHand = Array.isArray(table.heroHand) ? table.heroHand.slice(0, 2) : [];
      snapshot.seats = Array.isArray(table.seats) ? table.seats.map((seat) => ({
        id: seat?.id,
        isHero: Boolean(seat?.isHero),
        position: seat?.position || "",
        cards: Array.isArray(seat?.cards) ? seat.cards.slice(0, 2) : [],
        stack: seat?.stack,
        contribution: seat?.contribution,
        folded: Boolean(seat?.folded),
        foldedAt: seat?.foldedAt || "",
        allIn: Boolean(seat?.allIn),
        dealer: Boolean(seat?.dealer),
        lobbyState: seat?.lobbyState || "active",
        botType: seat?.botType || seat?.type || ""
      })) : [];
      snapshot.actions = Array.isArray(table.actions) ? table.actions.slice(-24).map(clonePlainRecord) : [];
      snapshot.streetActions = Array.isArray(table.streetActions) ? table.streetActions.slice(-24).map(clonePlainRecord) : [];
      snapshot.seatActions = table.seatActions && typeof table.seatActions === "object"
        ? Object.fromEntries(Object.entries(table.seatActions).map(([key, value]) => [key, clonePlainRecord(value)]))
        : {};
      snapshot.spot = table.spot && typeof table.spot === "object" ? { ...table.spot } : table.spot;
      return snapshot;
    }

    function restartHeroActionAnimationSequence(table, heroActionAnimation) {
      if (!table || !heroActionAnimation) return;
      // A synchronous fold/bot-only resolution starts a fresh visual chapter.
      // Remove keyed bubbles from the previous street before the filtered queue
      // is rendered; otherwise the per-hand DOM latch can keep them alive.
      clearActionBubbleLatch(table, "hero-action-fresh-sequence");
      const heroSeq = Number(heroActionAnimation.seq);
      const laterActions = (Array.isArray(table.actionAnimations) ? table.actionAnimations : [])
        .filter((item) => {
          if (!item || item.key === heroActionAnimation.key) return false;
          const itemSeq = Number(item.seq);
          return Number.isFinite(heroSeq) && Number.isFinite(itemSeq) && itemSeq > heroSeq;
        })
        .sort((first, second) => Number(first.seq) - Number(second.seq));
      const seenKeys = new Set();
      table.actionAnimations = [heroActionAnimation, ...laterActions].filter((item) => {
        const key = String(item?.key || "");
        if (!key || seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      // The engine keeps a bounded visual history for the whole hand. A
      // synchronous bot-only continuation after Hero folds appends new flights to
      // that history, so trim flights that belong to actions before the fold as
      // well. Otherwise an old raise can fly again even when its bubble was
      // correctly removed from the restarted sequence.
      if (Array.isArray(table.betAnimations) && Number.isFinite(heroSeq)) {
        const visibleActionKeys = new Set(table.actionAnimations.map((item) => String(item?.key || "")));
        retainBetAnimationsForActionSequence(table, {
          afterSeq: heroSeq,
          actionKeys: [...visibleActionKeys]
        });
      }
    }

    function scheduleAfterActionPaint(callback) {
      if (typeof callback !== "function") return;
      deferredActionTasks.push(callback);
      if (deferredActionTaskId) return;
      const run = () => {
        deferredActionTaskId = 0;
        const tasks = deferredActionTasks.splice(0);
        tasks.forEach((task) => {
          try {
            task();
          } catch (error) {
            if (windowRef.console && typeof windowRef.console.warn === "function") {
              windowRef.console.warn("Deferred simulator action task failed.", error);
            }
          }
        });
      };
      const scheduleRun = () => {
        if (typeof windowRef.requestIdleCallback === "function") {
          deferredActionTaskId = windowRef.requestIdleCallback(run, { timeout: 700 });
        } else if (typeof windowRef.setTimeout === "function") {
          deferredActionTaskId = windowRef.setTimeout(run, 0);
        } else {
          run();
        }
      };
      if (typeof windowRef.requestAnimationFrame === "function") {
        deferredActionTaskId = windowRef.requestAnimationFrame(scheduleRun);
      } else {
        scheduleRun();
      }
    }

    function handleHeroAction(table, action, amount, meta = {}) {
      if (options.isPaused() || !options.canHeroAct(table)) return;
      if (
        options.heroFacingCallOnlyRaise(table)
        && options.isAggressiveHeroAction(action)
        && !(action === "allin" && options.heroCanShortAllIn(table))
      ) return;
      // Server-driven multiplayer: the authoritative server owns the hand, so
      // route the (already bet-sized) hero action to it instead of the local
      // engine. Inert unless the multiplayer controller set serverMode. `amount`
      // here is the runtime's computed raise-to (readBetAmount), so sizing is
      // exact — no recompute needed.
      const serverState = state();
      if (serverState?.serverMode && typeof serverState.serverActionHandler === "function") {
        try {
          serverState.serverActionHandler(table, action, options.needsBetAmount(action) ? amount : undefined, meta);
        } catch (error) {
          (options.windowRef || (typeof window !== "undefined" ? window : globalThis)).console?.warn?.("[mp] server action handler failed", error?.message || error);
        }
        return;
      }
      const autoInitiated = meta.source === "action-timer" || meta.source === "fold-any";
      if (!autoInitiated) options.setActiveTable(table.id);
      const heroRenderReason = autoInitiated ? "hero-action" : "hero-action-visual";
      const decisionTiming = options.captureDecisionTiming(table);
      options.clearActionClock(table.id);
      const engineOptions = options.needsBetAmount(action) ? { amount } : {};
      const visualActionBaseState = options.captureVisualSeatState(table);
      const previousBoardLength = table.board?.length;
      const deferDecisionFeedback = !autoInitiated;
      const decisionSnapshot = deferDecisionFeedback ? cloneDecisionSnapshot(table) : null;
      const decisionEntry = options.decisionLog.buildHeroDecisionEntry(table, action, engineOptions.amount, {
        ...meta,
        decisionTiming,
        deferFeedback: deferDecisionFeedback
      });
      const outcome = options.engine.startHeroAction(table, action, state().settings, engineOptions);
      if (!outcome.accepted) return;
      const recordDecision = () => {
        if (deferDecisionFeedback && typeof options.decisionLog.resolveHeroDecisionFeedback === "function") {
          options.decisionLog.resolveHeroDecisionFeedback(decisionEntry, decisionSnapshot, action, engineOptions.amount);
        }
        options.decisionLog.recordHeroDecisionEntry(decisionEntry, { persist: false });
        if (typeof options.saveSessionData === "function") options.saveSessionData();
        options.sendSimulatorDecisionTelemetry(decisionEntry, table);
        if (deferDecisionFeedback) {
          options.render("decision-feedback");
        }
      };
      if (deferDecisionFeedback) scheduleAfterActionPaint(recordDecision);
      else recordDecision();
      table.visualActionBaseState = visualActionBaseState;
      table.visualActionConfirmedState = options.captureVisualSeatState(table);
      options.clearDecisionTimer(table.id);
      options.clearFoldAnyQueue(table);
      table.heroBetDraft = null;
      const heroActionAnimation = options.captureHeroActionAnimation(table);
      table.pendingHeroActionAnimation = outcome.needsBot ? heroActionAnimation : null;
      options.playTone(outcome.tone);
      if (outcome.needsBot) {
        let botResponseDelay = Math.max(0, Number(outcome.delay || 0));
        if (heroActionAnimation) {
          // Hero and the bot response are two visible chapters. Prime and paint
          // Hero immediately instead of leaving the new action on the previous
          // action clock until the deferred bot callback runs. Otherwise a
          // keyed bot "thinking" node from the old/updated history can be the
          // first visible beat after the click.
          heroActionAnimation.revealPrimed = true;
          restartHeroActionAnimationSequence(table, heroActionAnimation);
          options.annotateActionAnimationMotion(table);
          options.primeActionReveal(table, {
            previousBoardLength,
            forceFreshSequence: true
          });
          // The engine response is allowed to resolve only after Hero's visual
          // beat has completed. This also prevents a synchronous street advance
          // from opening the board over Hero's raise animation.
          botResponseDelay = Math.max(botResponseDelay, actionRevealDuration(table));
        }
        // Recovery uses the persisted pending deadline when a live timer is
        // missing (background throttling, bfcache, interrupted callback). Stamp
        // it from the same extended Hero-chapter delay as the actual timer so a
        // repair pass cannot resolve the bot underneath Hero's animation.
        table.pendingBotResponse = options.pendingBotResponseForOutcome(table, {
          ...outcome,
          delay: botResponseDelay
        });
        options.maybeRecordHand(table, { deferPersistence: true });
        options.queueNextHandIfNeeded(table);
        options.markTableDirty(table.id);
        options.render(heroRenderReason);
        options.scheduleBotResponse(table.id, outcome.heroAction, outcome.heroAmount, botResponseDelay);
        return;
      }

      const resolvedToShowdown = table.status === "showdown"
        || (Number.isFinite(Number(previousBoardLength)) && table.board.length > Number(previousBoardLength));
      const terminalHeroFold = action === "fold" && table.status === "folded";
      const botOnlyHeroFoldShowdown = action === "fold" && resolvedToShowdown;
      if (terminalHeroFold && heroActionAnimation) {
        restartHeroActionAnimationSequence(table, heroActionAnimation);
      } else if (botOnlyHeroFoldShowdown && heroActionAnimation) {
        restartHeroActionAnimationSequence(table, heroActionAnimation);
      }
      if (resolvedToShowdown || terminalHeroFold) {
        options.annotateActionAnimationMotion(table);
        options.primeActionReveal(table, {
          previousBoardLength,
          forceFreshSequence: terminalHeroFold || botOnlyHeroFoldShowdown
        });
        if (resolvedToShowdown) options.primeShowdownAnimation(table);
      }
      options.maybeRecordHand(table, { deferPersistence: true });
      options.queueNextHandIfNeeded(table, resolvedToShowdown ? { force: true } : undefined);
      options.markTableDirty(table.id);
      options.render(heroRenderReason);
      delete table.pendingBotResponse;
    }

    return { handleHeroAction };
  }

  root.PokerSimulatorHeroActionRuntime = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorHeroActionRuntime;
})();
