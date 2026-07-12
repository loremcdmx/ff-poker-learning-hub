(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => ({ settings: {} });
    const visualRuntime = options.visualRuntime || {};
    const runtimeBridge = options.runtimeBridge || {};
    const actionBridge = options.actionBridge || {};
    const formatHelpers = options.formatHelpers || {};
    const runtimeRegistry = options.runtimeRegistry || {};
    const allInRunoutVisibleBoardLength = fn(options.allInRunoutVisibleBoardLength || visualRuntime.allInRunoutVisibleBoardLength, () => NaN);
    const actionSequenceBoardRevealState = fn(options.actionSequenceBoardRevealState || visualRuntime.actionSequenceBoardRevealState, () => null);
    const pendingBoardReveal = fn(options.pendingBoardReveal || visualRuntime.pendingBoardReveal, () => false);
    const boardRevealDelayRemaining = fn(options.boardRevealDelayRemaining || visualRuntime.boardRevealDelayRemaining, () => 0);
    const now = fn(options.now, () => Date.now());
    const isVisualActive = fn(options.isVisualActive || visualRuntime.isVisualActive, () => false);
    const tableUsesTournamentMode = fn(options.tableUsesTournamentMode || runtimeBridge.tableUsesTournamentMode, () => false);
    const heroBustedRestartLabel = fn(options.heroBustedRestartLabel || runtimeBridge.heroBustedRestartLabel, () => "Restart");
    const trainerFeedbackForTable = fn(options.trainerFeedbackForTable || registryCall("trainerFeedbackForTable", () => null), () => null);
    const autoDealLabel = fn(options.autoDealLabel || registryCall("autoDealLabel", () => ""), () => "");
    const isDealAnimationActive = fn(options.isDealAnimationActive || registryCall("dealAnimationActive", () => false), () => false);
    const isActionSequenceActive = fn(options.isActionSequenceActive || visualRuntime.isActionSequenceActive, () => false);
    const isActionRevealLocked = fn(options.isActionRevealLocked || visualRuntime.isActionRevealLocked, () => false);
    const actionRevealText = fn(options.actionRevealText, () => "Очередь действий");
    const heroCanShortAllIn = fn(options.heroCanShortAllIn || actionBridge.heroCanShortAllIn, () => false);
    const heroFacingCallOnlyRaise = fn(options.heroFacingCallOnlyRaise || actionBridge.heroFacingCallOnlyRaise, () => false);
    const effectiveHeroCallAmount = fn(options.effectiveHeroCallAmount || actionBridge.effectiveHeroCallAmount, () => 0);
    const betBounds = fn(options.betBounds || registryCall("betBounds", () => ({ min: 0 })), () => ({ min: 0 }));
    const formatAmount = fn(options.formatAmount || formatHelpers.formatAmount || registryCall("formatAmount", (value) => String(value ?? 0)), (value) => String(value ?? 0));

    function fn(candidate, fallback) {
      return typeof candidate === "function" ? candidate : fallback;
    }

    function registryCall(key, fallback) {
      return typeof runtimeRegistry.call === "function" ? runtimeRegistry.call(key, fallback) : fallback;
    }

    let getStateErrorLogged = false;

    function state() {
      try {
        return getState() || { settings: {} };
      } catch (error) {
        if (!getStateErrorLogged) {
          getStateErrorLogged = true;
          root.console?.warn?.("[simulator] table view-model getState() threw; using empty state.", error);
        }
        return { settings: {} };
      }
    }

    function visibleBoardLength(table) {
      const allInVisible = allInRunoutVisibleBoardLength(table);
      if (Number.isFinite(allInVisible)) return allInVisible;
      const actionBoardState = actionSequenceBoardRevealState(table);
      if (actionBoardState && Number.isFinite(Number(actionBoardState.visibleLength))) {
        return Math.max(0, Number(actionBoardState.visibleLength));
      }
      // Anti-spoiler: while a delayed street reveal is animating, the truly
      // visible board is still the previous street. Board DOM may render
      // ahead of this (CSS delay hides the new card) via its own
      // renderable-length override in simulator-board-render. The window covers
      // the pre-reveal delay AND the card slide-in (boardRevealUntil) — gating
      // only on boardRevealDelayRemaining un-hid the card in the JS model the
      // instant the slide-in began, letting hand-strength / street labels jump
      // ahead of the still-animating card (obs 13539).
      if (pendingBoardReveal(table) && boardRevealStillAnimating(table)) {
        return Math.max(0, Number(table?.boardRevealFrom || 0));
      }
      return table?.board?.length || 0;
    }

    function boardRevealStillAnimating(table) {
      const until = Number(table?.boardRevealUntil || 0);
      if (until > 0) return until - now() > 0;
      return boardRevealDelayRemaining(table) > 0;
    }

    function usesBoardLayout(table) {
      return Boolean(table && Array.isArray(table.board) && table.board.length);
    }

    function visibleStreet(table) {
      const actionBoardState = actionSequenceBoardRevealState(table);
      if (actionBoardState && Number.isFinite(Number(actionBoardState.visibleLength))) {
        return streetForBoardLength(Math.max(0, Number(actionBoardState.visibleLength)));
      }
      if (pendingBoardReveal(table) && boardRevealStillAnimating(table)) {
        return streetForBoardLength(Math.max(0, Number(table?.boardRevealFrom || 0)));
      }
      return table?.street || streetForBoardLength(visibleBoardLength(table));
    }

    function streetForBoardLength(boardLength) {
      if (boardLength >= 5) return "river";
      if (boardLength >= 4) return "turn";
      if (boardLength >= 3) return "flop";
      return "preflop";
    }

    function isBlindBetMarker(table, seat, seatId) {
      if (!table || table.street !== "preflop" || !seat?.blind) return false;
      const amount = Number(table.seatBets?.[seatId] || 0);
      if (!(amount > 0)) return false;
      if (seat.blind === "SB") return amount <= 0.5;
      if (seat.blind === "BB") return amount <= 1;
      return false;
    }

    function heroSeat(table) {
      return table?.seats?.find((seat) => seat.isHero) || null;
    }

    function heroBusted(table) {
      const hero = heroSeat(table);
      return Boolean(
        table
        && table.status !== "playing"
        && tableUsesTournamentMode(table)
        && (
          table.heroBusted
          || (hero && !hero.folded && Number(hero.stack || 0) <= 0 && table.status !== "won")
        )
      );
    }

    function heroIsAllIn(table) {
      const hero = heroSeat(table);
      return Boolean(table && table.status === "playing" && hero && !hero.folded && Number(hero.stack || 0) <= 0);
    }

    function canHeroAct(table) {
      const hero = heroSeat(table);
      return Boolean(
        table
        && table.status === "playing"
        && !table.busy
        && !isDealAnimationActive(table)
        && !isActionSequenceActive(table)
        && !isActionRevealLocked(table)
        && table.heroTurn
        && hero
        && !hero.folded
        && Number(hero.stack || 0) > 0
      );
    }

    function actionHint(table) {
      const current = state();
      if (table.status !== "playing") {
        if (heroBusted(table)) return `Стек закончился. Нажмите «${heroBustedRestartLabel(table)}», чтобы начать заново.`;
        const feedback = trainerFeedbackForTable(table)?.feedback;
        if (current.settings?.trainingMode && feedback?.detail) return `${feedback.label}: ${feedback.detail}`;
        if (current.settings?.trainingMode) return "Раздача завершена, можно сразу раздать новую.";
        return autoDealLabel(table);
      }
      if (heroIsAllIn(table)) return "Hero олл-ин: дальше борд доезжает до шоудауна без решений.";
      if (isActionRevealLocked(table)) return `${actionRevealText(table)}. Ваше слово появится после очереди.`;
      if (table.busy) return "Бот думает: очевидные решения быстро, пограничные около секунды.";
      if (heroCanShortAllIn(table)) return `Полный рейз недоступен: пас, колл ${formatAmount(effectiveHeroCallAmount(table))} или олл-ин.`;
      if (heroFacingCallOnlyRaise(table)) return `Только пас или колл ${formatAmount(effectiveHeroCallAmount(table))}.`;
      if (table.toCall > 0) return `До Hero ${formatAmount(effectiveHeroCallAmount(table))}. Мин. рейз ${formatAmount(table.minRaiseTo || betBounds(table).min)}.`;
      if (table.street === "preflop" && table.canCheck) return `Опция BB: чек или рейз от ${formatAmount(table.minRaiseTo || 2)}.`;
      if (table.street === "preflop") return `Первый вход: слайдер стоит на мин. рейз ${formatAmount(table.minRaiseTo || 2)}.`;
      return "Можно чекнуть или поставить сайз через слайдер.";
    }

    return {
      visibleBoardLength,
      usesBoardLayout,
      visibleStreet,
      streetForBoardLength,
      isBlindBetMarker,
      actionHint,
      heroSeat,
      heroBusted,
      heroIsAllIn,
      canHeroAct
    };
  }

  root.PokerSimulatorTableViewModel = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorTableViewModel;
})();
