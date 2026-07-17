(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getSettings = typeof options.getSettings === "function" ? options.getSettings : () => ({});
    const canHeroAct = typeof options.canHeroAct === "function" ? options.canHeroAct : () => false;
    const isActionSequenceActive = typeof options.isActionSequenceActive === "function" ? options.isActionSequenceActive : () => false;
    const actionAnimationIndexForSeat = typeof options.actionAnimationIndexForSeat === "function"
      ? options.actionAnimationIndexForSeat
      : () => -1;
    const actionAnimationHasStarted = typeof options.actionAnimationHasStarted === "function"
      ? options.actionAnimationHasStarted
      : () => true;
    const actionAnimationHasCompleted = typeof options.actionAnimationHasCompleted === "function"
      ? options.actionAnimationHasCompleted
      : () => true;
    const reducedTableMotion = typeof options.reducedTableMotion === "function" ? options.reducedTableMotion : () => false;
    const showdownSeatVisibilityLockActive = typeof options.showdownSeatVisibilityLockActive === "function"
      ? options.showdownSeatVisibilityLockActive
      : () => false;
    const isBetLanded = typeof options.isBetLanded === "function" ? options.isBetLanded : () => true;
    const roundBb = typeof options.roundBb === "function"
      ? options.roundBb
      : (value) => Math.round(Number(value || 0) * 100) / 100;
    const showdownWinnerVisible = typeof options.showdownWinnerVisible === "function" ? options.showdownWinnerVisible : () => true;

    function settings() {
      return getSettings() || {};
    }

    function streetRank(street) {
      const ranks = { preflop: 0, flop: 1, turn: 2, river: 3, showdown: 4 };
      return ranks[String(street || "preflop")] ?? 0;
    }

    // While the action-reveal / showdown lock is active the engine has ALREADY
    // resolved the hand synchronously — an all-in prunes folders from
    // contestingSeatIds and jumps street to "showdown" in one tick. Prefer the
    // pre-resolution snapshot (captured before resolveBotAction) so fold-dimming
    // stays gated on each seat's own fold animation rather than the resolved end
    // state. Falls back to the live values whenever no snapshot is present
    // (post-hand, smoke fixtures with the legacy base shape) so non-all-in paths
    // are byte-for-byte unchanged.
    function lockedBaseState(table) {
      if (!table || !visualSeatStateLockActive(table)) return null;
      return table.visualActionBaseState || null;
    }

    function gateContestingSeatIds(table) {
      const base = lockedBaseState(table);
      if (base && Array.isArray(base.contestingSeatIds)) return base.contestingSeatIds;
      return table?.contestingSeatIds;
    }

    function gateStreet(table) {
      const base = lockedBaseState(table);
      if (base && base.street) return base.street;
      return table?.street;
    }

    function seatOutsideContestedPot(table, seat) {
      if (!table || !seat || seat.isHero || gateStreet(table) === "preflop") return false;
      const contesting = gateContestingSeatIds(table);
      if (!Array.isArray(contesting) || !contesting.length) return false;
      const contestingIds = new Set(contesting.map(Number).filter((seatId) => Number.isFinite(seatId)));
      return !contestingIds.has(Number(seat.id));
    }

    function seatFoldedBeforeCurrentStreet(table, seat) {
      if (!table || !seat?.folded || !seat.foldedAt) return false;
      return streetRank(seat.foldedAt) < streetRank(gateStreet(table));
    }

    // A seat that was ALREADY folded in the LOCKED pre-action snapshot folded
    // BEFORE the current resolution sequence began — its fold cascade already
    // played out in an earlier render cycle. The lock (captured by
    // captureVisualSeatState the instant Hero acts) freezes the gated street at
    // its pre-action value; the still-active reveal sequence (e.g. a Hero CALL
    // that advances preflop→flop) must not re-light such a seat by re-clocking
    // its stale actionAnimations entry against the rebased timeline.
    //
    // The discriminator is the snapshot's per-seat fold flag — NOT
    // contestingSeatIds, which sits empty through the whole preflop street and
    // would mis-classify EVERY preflop folder, including ones that fold in
    // RESPONSE to the Hero action (a seat behind Hero). Those still-live-at-
    // capture seats must keep gating on their own fold animation so their box
    // dims only after the fold plays — exactly what this predicate preserves by
    // returning false for them.
    function seatFoldedBeforeLockedSequence(table, seat) {
      if (!seat || seat.isHero || !seat.folded) return false;
      const base = lockedBaseState(table);
      if (!base || !Array.isArray(base.seats)) return false;
      const snapshot = base.seats.find((item) => Number(item.id) === Number(seat.id));
      return Boolean(snapshot && snapshot.folded);
    }

    function seatMuckOutState(table, seat) {
      if (!seat || !seat.folded || !isActionSequenceActive(table)) return null;
      // Already mucked in an earlier cycle — its stale fold entry lingering in
      // the bounded animation window must not replay a muck-out (cards would
      // flash back in and slide away again) during a later locked sequence.
      if (seatFoldedBeforeLockedSequence(table, seat)) return null;
      if (seat.isHero && !terminalHeroFoldActionActive(table, seat)) return null;
      const foldIndex = actionAnimationIndexForSeat(table, seat.id, "fold");
      if (!Number.isFinite(Number(foldIndex)) || Number(foldIndex) < 0) return null;
      if (!actionAnimationHasStarted(table, foldIndex)) return null;
      // Delay (ms) before a folded seat's cards muck out.
      const FOLD_MUCK_DELAY_MS = 80;
      return {
        delayMs: FOLD_MUCK_DELAY_MS
      };
    }

    function terminalHeroFoldActionActive(table, seat) {
      if (!seat?.isHero || table?.status !== "folded") return false;
      if (String(table?.result || "") !== "Hero fold") return false;
      return actionAnimationIndexForSeat(table, seat.id, "fold") >= 0;
    }

    // A fold whose cascade slot was pushed out of the bounded animation window
    // (engine-core recordSeatAction keeps a bounded actionAnimations window)
    // has DEFINITIONALLY already had its turn — newer actions evicted it. We
    // detect eviction by seq: table.seatActions[id] is authoritative and never
    // capped, so a fold whose seq is older than every entry still in
    // actionAnimations has already played. A fold that simply has not been
    // primed yet is NOT evicted: it is either already in the window (foldIndex
    // >= 0, handled before this is reached) or its seq is the newest, so it
    // stays >= the window minimum and keeps deferring to the completion gate.
    // Without this, in a full ring the first folders' entries are evicted long
    // before the betting round closes, leaving those seats lit until the next
    // coarse checkpoint (Hero's turn / street change) instead of dimming live.
    function foldActionEvictedFromAnimationWindow(table, action) {
      if (!action || !Number.isFinite(Number(action.seq))) return false;
      const anims = Array.isArray(table?.actionAnimations) ? table.actionAnimations : [];
      if (!anims.length) return false;
      let minSeq = Infinity;
      for (const item of anims) {
        const seq = Number(item?.seq);
        if (Number.isFinite(seq) && seq < minSeq) minSeq = seq;
      }
      if (!Number.isFinite(minSeq)) return false;
      return Number(action.seq) < minSeq;
    }

    function seatHasResolvedFoldAction(table, seat) {
      const action = table?.seatActions?.[seat?.id];
      if (!action || String(action.tone || "") !== "fold") return false;
      if (!seatActionVisibleOnCurrentStreet(table, seat, action)) return false;
      const foldIndex = actionAnimationIndexForSeat(table, seat.id, "fold", action.seq);
      if (Number.isFinite(Number(foldIndex)) && Number(foldIndex) >= 0) {
        return actionAnimationHasCompleted(table, foldIndex);
      }
      if (foldActionEvictedFromAnimationWindow(table, action)) return true;
      return !isActionSequenceActive(table) && !table?.pendingHeroActionAnimation;
    }

    function seatVisuallyFolded(table, seat) {
      if (seatOutsideContestedPot(table, seat)) return true;
      if (seatHasResolvedFoldAction(table, seat)) return true;
      if (!seat?.folded) return false;
      // Folded before the locked resolution sequence started → already out; do
      // not let an active reveal cascade re-light it (the call→flop window).
      if (seatFoldedBeforeLockedSequence(table, seat)) return true;
      if (canHeroAct(table) || seatFoldedBeforeCurrentStreet(table, seat)) return true;
      const foldIndex = actionAnimationIndexForSeat(table, seat.id, "fold");
      // Hero's local fold is recorded with animate=false (engine-tournament-lobby
      // recordSeatAction(table, 0, "Fold", "fold", false)), so seat 0 never gets
      // an indexed fold animation. When Hero folds and the hand plays on to a
      // bot-only SHOWDOWN, the street/contested checkpoints stay frozen on the
      // pre-fold snapshot, so without this Hero's box reads in-hand for the whole
      // reveal window and only dims at the end-of-cascade action-unlock. With no
      // Hero fold bubble to wait for (foldIndex < 0) and no pending Hero action
      // animation, dim now. The fold-to-win terminal instead re-pushes an
      // ANIMATED hero fold (foldIndex >= 0) and a continue-to-bots fold keeps
      // pendingHeroActionAnimation set — both fall through to the gates below and
      // keep their existing choreography.
      if (seat.isHero && foldIndex < 0 && !table.pendingHeroActionAnimation) return true;
      // Dim the box only once its fold step has fully played (bubble shown and
      // settled). Gating on "started" faded seats while their fold bubble was
      // still seconds away — the table read as already-folded mid-cascade.
      // A same-street fold without an indexed animation must not dim
      // instantly: either its cue sequence is still playing, or the fold just
      // landed in engine state and its cascade has not been primed yet (the
      // pendingHeroActionAnimation window right after a Hero bet resolves).
      if (foldIndex < 0 && (isActionSequenceActive(table) || table.pendingHeroActionAnimation)) return false;
      return actionAnimationHasCompleted(table, foldIndex);
    }

    function shouldRevealFoldedOpponentAfterFinish(table, seat, actionLocked = isActionSequenceActive(table)) {
      if (!settings().revealOpponentCardsOnFinish || !table || !seat || seat.isHero) return false;
      if (table.status === "playing" || actionLocked || showdownSeatVisibilityLockActive(table)) return false;
      if (!seat.folded || !seat.foldedAt) return false;
      if (
        streetRank(seat.foldedAt) <= streetRank("preflop")
        && !settings().revealPreflopFoldedCardsOnFinish
      ) return false;
      return Array.isArray(seat.cards) && seat.cards.length === 2;
    }

    function seatActionStreet(table, seat, action, actionIndex = null) {
      const actionStreet = String(action?.street || "");
      if (actionStreet) return actionStreet;
      const index = actionIndex == null
        ? actionAnimationIndexForSeat(table, seat?.id, action?.tone, action?.seq)
        : actionIndex;
      const animatedAction = Number.isFinite(Number(index)) && Number(index) >= 0
        ? table?.actionAnimations?.[index]
        : null;
      return String(animatedAction?.street || "");
    }

    function seatActionVisibleOnCurrentStreet(table, seat, action, actionIndex = null) {
      if (!action) return false;
      if (String(action.tone || "") !== "fold") return true;
      const actionStreet = seatActionStreet(table, seat, action, actionIndex);
      if (!actionStreet || !table?.street) return true;
      return streetRank(actionStreet) === streetRank(table.street);
    }

    function visibleSeatAction(table, seat) {
      const action = table?.seatActions?.[seat?.id];
      if (!action) return null;
      const index = actionAnimationIndexForSeat(table, seat.id, action.tone, action.seq);
      if (!seatActionVisibleOnCurrentStreet(table, seat, action, index)) return null;
      if (reducedTableMotion() && action.tone === "fold") {
        return actionAnimationHasStarted(table, index) ? action : null;
      }
      return actionAnimationHasCompleted(table, index) ? action : null;
    }

    function visualSeatStateLockActive(table) {
      if (!table?.visualActionBaseState) return false;
      if (table.pendingHeroActionAnimation) return true;
      if (isActionSequenceActive(table)) return true;
      return showdownSeatVisibilityLockActive(table);
    }

    function visualBaseSeatState(table, seat) {
      if (!visualSeatStateLockActive(table) || !seat) return null;
      const source = seat.isHero && table.visualActionConfirmedState
        ? table.visualActionConfirmedState
        : table.visualActionBaseState;
      return (source?.seats || []).find((item) => Number(item.id) === Number(seat.id)) || null;
    }

    function showdownParticipantSeatIds(table) {
      const ids = new Set();
      if (Array.isArray(table?.showdown?.participants)) {
        table.showdown.participants.forEach((participant) => {
          const id = Number(participant?.seatId);
          if (Number.isFinite(id)) ids.add(id);
        });
      }
      if (Array.isArray(table?.contestingSeatIds)) {
        table.contestingSeatIds.forEach((seatId) => {
          const id = Number(seatId);
          if (Number.isFinite(id)) ids.add(id);
        });
      }
      return ids;
    }

    function eliminatedShowdownSeatStillVisible(table, seat) {
      if (!table || !seat || seat.isHero) return false;
      if (String(seat.lobbyState || "active") !== "eliminated") return false;
      if (!showdownSeatVisibilityLockActive(table)) return false;
      return showdownParticipantSeatIds(table).has(Number(seat.id));
    }

    function visibleSeatLobbyState(table, seat) {
      const fallback = String(seat?.lobbyState || "active");
      const visualState = visualBaseSeatState(table, seat);
      if (!visualState) return eliminatedShowdownSeatStillVisible(table, seat) ? "active" : fallback;
      if (fallback === "eliminated") return String(visualState.lobbyState || "active");
      return fallback;
    }

    function allInPreAwardStack(table, seat) {
      if (!table?.allInRunout || !seat) return null;
      const stacks = table.allInRunout.preAwardStacks;
      if (!stacks || typeof stacks !== "object") return null;
      const value = stacks[seat.id] ?? stacks[String(seat.id)];
      const stack = Number(value);
      return Number.isFinite(stack) ? Math.max(0, roundBb(stack)) : null;
    }

    function seatActionStillRevealing(table, seat) {
      if (!table || !seat || !isActionSequenceActive(table)) return false;
      const action = table.seatActions?.[seat.id];
      if (!action) return false;
      const index = actionAnimationIndexForSeat(table, seat.id, action.tone, action.seq);
      return Number.isFinite(Number(index)) && Number(index) >= 0 && !actionAnimationHasCompleted(table, index);
    }

    function visibleSeatStack(table, seat) {
      if (!seat) return 0;
      if (!visualSeatStateLockActive(table)) return Number(seat.stack || 0);
      const visualState = visualBaseSeatState(table, seat);
      if (!visualState) return Number(seat.stack || 0);
      const usesConfirmedHeroState = Boolean(seat.isHero && table.visualActionConfirmedState);
      let stack = Number(visualState.stack || 0);
      let pendingStackDebit = false;
      (table.betAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => Number(item.seatId) === Number(seat.id) && Number(item.amount || 0) > 0)
        .forEach(({ item, index }) => {
          if (usesConfirmedHeroState && Number(item.seatId) === 0) return;
          if (Number(item.seatId) === 0 || isBetLanded(table, item, index) || !isActionSequenceActive(table)) {
            stack = roundBb(stack - Number(item.amount || 0));
          } else {
            pendingStackDebit = true;
          }
        });
      const preAwardStack = allInPreAwardStack(table, seat);
      if (preAwardStack !== null && !pendingStackDebit && !seatActionStillRevealing(table, seat)) {
        return preAwardStack;
      }
      return Math.max(0, roundBb(stack));
    }

    function revealStreetForSeat(table, seat) {
      if (seat.foldedAt) return seat.foldedAt;
      if (table.street === "showdown" || table.status === "showdown") return "showdown";
      if (["river", "turn", "flop"].includes(table.street)) return table.street;
      return "live";
    }

    function seatCardState(table, seat) {
      if (visibleSeatLobbyState(table, seat) === "eliminated") {
        return { className: "is-empty", reveal: false, empty: true };
      }
      const isOver = table.status !== "playing";
      const actionLocked = isActionSequenceActive(table);
      const showdownLocked = showdownSeatVisibilityLockActive(table);
      const revealFoldedAfterFinish = shouldRevealFoldedOpponentAfterFinish(table, seat, actionLocked);
      if (seatOutsideContestedPot(table, seat) && !revealFoldedAfterFinish) {
        return { className: "is-empty", reveal: false, empty: true };
      }
      const visuallyFolded = seatVisuallyFolded(table, seat);
      const revealAfterFinish = settings().revealOpponentCardsOnFinish && !seat.isHero && isOver && !actionLocked && !showdownLocked;
      const reveal = seat.isHero || revealFoldedAfterFinish || (!actionLocked && (seat.revealed || revealAfterFinish));
      const muckOut = seatMuckOutState(table, seat);
      const foldedDuringHand = visuallyFolded && !isOver && !seat.isHero;
      const hiddenFoldAfterHand = visuallyFolded && isOver && !reveal;
      const heroFolded = seat.isHero && visuallyFolded;

      if (muckOut) {
        return {
          className: "is-hidden is-mucking-out",
          reveal: false,
          empty: false,
          muckDelayMs: muckOut.delayMs
        };
      }

      if (foldedDuringHand || hiddenFoldAfterHand || heroFolded) {
        return { className: "is-empty", reveal: false, empty: true };
      }

      if (seat.isHero) {
        return { className: "hero-cards", reveal: true, empty: false };
      }

      if (reveal) {
        const street = revealStreetForSeat(table, seat);
        return {
          className: `is-revealed is-revealed-${street}`,
          reveal: true,
          empty: false
        };
      }

      return { className: "is-hidden", reveal: false, empty: false };
    }

    function seatIsWinner(table, seat) {
      if (!table || !seat || table.status === "playing") return false;
      if (table.status === "showdown" && !showdownWinnerVisible(table)) return false;
      // Fold-win terminals: the engine resolves the whole hand synchronously
      // (potAwards set the instant Hero raises), but the Winner badge must
      // wait for the fold cascade to finish playing — same clock as showdown.
      if (table.status !== "showdown" && isActionSequenceActive(table)) return false;
      const result = String(table.result || table.lastAction || "");
      const potAwards = table.potAwards && typeof table.potAwards === "object" ? table.potAwards : null;
      if (potAwards && Number(potAwards[seat.id] || 0) > 0) return true;
      const showdownWinners = Array.isArray(table.showdown?.winners) ? table.showdown.winners : [];
      if (showdownWinners.length) {
        return showdownWinners.some((winner) => Number(winner.seatId) === Number(seat.id));
      }
      if (result.startsWith("Split")) {
        const contestingIds = new Set(Array.isArray(table.contestingSeatIds) ? table.contestingSeatIds.map(Number) : []);
        return !seat.folded && (seat.isHero || contestingIds.has(Number(seat.id)));
      }
      if (seat.isHero) {
        return table.status === "won" || result.startsWith("Hero win");
      }
      // NOTE: do NOT use table.activeVillain as a winner proxy for status==="folded".
      // activeVillain is "the bot Hero last faced", not the awarded seat — in multiway
      // (tournament bot-only) fold-wins it is usually a now-folded seat, which lit up
      // the wrong seat AND nulled winnerSeat() (two winners), suppressing the real
      // winner's pot-award animation. The potAwards check above and the result-string
      // check below already identify the true winner. See BUGHUNT F025.
      return result.startsWith(`${seat.position} win`) || result.startsWith(`${seat.name} win`);
    }

    function winnerSeat(table) {
      const winners = (table?.seats || []).filter((seat) => seatIsWinner(table, seat));
      return winners.length === 1 ? winners[0] : null;
    }

    return {
      streetRank,
      seatOutsideContestedPot,
      seatFoldedBeforeCurrentStreet,
      seatFoldedBeforeLockedSequence,
      seatMuckOutState,
      terminalHeroFoldActionActive,
      foldActionEvictedFromAnimationWindow,
      seatHasResolvedFoldAction,
      seatVisuallyFolded,
      shouldRevealFoldedOpponentAfterFinish,
      seatActionStreet,
      seatActionVisibleOnCurrentStreet,
      visibleSeatAction,
      visualSeatStateLockActive,
      visualBaseSeatState,
      showdownParticipantSeatIds,
      eliminatedShowdownSeatStillVisible,
      visibleSeatLobbyState,
      allInPreAwardStack,
      visibleSeatStack,
      revealStreetForSeat,
      seatCardState,
      seatIsWinner,
      winnerSeat
    };
  }

  root.PokerSimulatorSeatVisuals = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
