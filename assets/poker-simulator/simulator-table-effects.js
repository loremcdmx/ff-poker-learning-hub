(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  // Base delay (ms) before a folded seat's muck cards begin flying away.
  const FOLD_MUCK_BASE_DELAY_MS = 80;
  // Per-card muck animation offsets. Each card preserves its original literal
  // values exactly: pixel nudge (x/y), and start/end rotation (deg), plus an
  // additional stagger delay (ms) layered on top of FOLD_MUCK_BASE_DELAY_MS.
  const FOLD_MUCK_CARDS = [
    { x: -8, y: -2, start: -14, end: -22, delay: 0 },
    { x: 10, y: 4, start: 12, end: 18, delay: 90 }
  ];
  // Vertical zone adjustments (in % units) applied to a muck card's start
  // point so it lifts off from just inside the seat box edge.
  const FOLD_MUCK_START_TOP_Y_ADJUST = 1.6;
  const FOLD_MUCK_START_BOTTOM_Y_ADJUST = 1.8;
  // Hero pot-award flight lands slightly above the hero seat: clamp the target
  // Y to a minimum and nudge it upward by a fixed amount.
  const HERO_POT_AWARD_MIN_Y = 74;
  const HERO_POT_AWARD_Y_NUDGE = 8;
  const BET_FLIGHT_MARKER_LAND_RATIO = 0.76;
  // Non-hero pot-award flight must settle JUST IN FRONT of the winner's box
  // (a step toward the felt centre / pot) rather than dead-centre on the seat
  // anchor, where it would smear across the name + stack plate. The seat->centre
  // vector points "down" for top seats and "inward" for the side seats, so one
  // fraction clears the box in every zone. Tuned (verified in-browser, heads-up
  // top seat) to clear the box by ~15-25px of felt with the badge still reading
  // as the winner's; the hero keeps its own dedicated upward lift above.
  const POT_AWARD_INWARD_NUDGE = 0.26;

  function model(options = {}) {
    const usesDecorativeMotionLayer = typeof options.usesDecorativeMotionLayer === "function" ? options.usesDecorativeMotionLayer : () => true;
    const prefersReducedMotion = typeof options.prefersReducedMotion === "function" ? options.prefersReducedMotion : () => false;
    const isActionSequenceActive = typeof options.isActionSequenceActive === "function" ? options.isActionSequenceActive : () => false;
    const actionSequenceBoardRevealState = typeof options.actionSequenceBoardRevealState === "function" ? options.actionSequenceBoardRevealState : () => null;
    const visibleBoardLength = typeof options.visibleBoardLength === "function" ? options.visibleBoardLength : (table) => table?.board?.length || 0;
    const actionTimingAtIndex = typeof options.actionTimingAtIndex === "function" ? options.actionTimingAtIndex : () => ({ actionDelayMs: 0, thinkingDelayMs: 0, thinkMs: 0 });
    const chipAnnouncementDelayForAction = typeof options.chipAnnouncementDelayForAction === "function" ? options.chipAnnouncementDelayForAction : () => 0;
    const chipFlightMs = typeof options.chipFlightMs === "function" ? options.chipFlightMs : () => 0;
    const actionIndexForBetAnimation = typeof options.actionIndexForBetAnimation === "function" ? options.actionIndexForBetAnimation : (_table, _item, index = 0) => index;
    const actionAnimationIsInMotion = typeof options.actionAnimationIsInMotion === "function" ? options.actionAnimationIsInMotion : () => false;
    const actionAnimationHasCompleted = typeof options.actionAnimationHasCompleted === "function" ? options.actionAnimationHasCompleted : () => true;
    const actionAnimationIsAllIn = typeof options.actionAnimationIsAllIn === "function" ? options.actionAnimationIsAllIn : () => false;
    const actionRevealMs = typeof options.actionRevealMs === "function" ? options.actionRevealMs : () => 0;
    const actionRiverResolution = typeof options.actionRiverResolution === "function" ? options.actionRiverResolution : (item) => String(item?.riverResolution || "");
    const isRiverResolutionAction = typeof options.isRiverResolutionAction === "function" ? options.isRiverResolutionAction : (item) => Boolean(actionRiverResolution(item));
    const riverResolutionCueMs = typeof options.riverResolutionCueMs === "function" ? options.riverResolutionCueMs : () => 0;
    const riverResolutionCueDelayMs = typeof options.riverResolutionCueDelayMs === "function" ? options.riverResolutionCueDelayMs : () => 0;
    const compactTimingMs = typeof options.compactTimingMs === "function" ? options.compactTimingMs : (fullMs, compactMs) => Number(fullMs || compactMs || 0);
    const seatPoint = typeof options.seatPoint === "function" ? options.seatPoint : () => ({ x: 50, y: 50 });
    const betPoint = typeof options.betPoint === "function" ? options.betPoint : seatPoint;
    const actionPoint = typeof options.actionPoint === "function" ? options.actionPoint : seatPoint;
    const dealCardTarget = typeof options.dealCardTarget === "function" ? options.dealCardTarget : seatPoint;
    const seatZone = typeof options.seatZone === "function" ? options.seatZone : () => "";
    const winnerSeat = typeof options.winnerSeat === "function" ? options.winnerSeat : () => null;
    const showdownAwardVisible = typeof options.showdownAwardVisible === "function" ? options.showdownAwardVisible : () => true;
    const roundBb = typeof options.roundBb === "function" ? options.roundBb : (value) => Math.round(Number(value || 0) * 100) / 100;
    const formatAmount = typeof options.formatAmount === "function" ? options.formatAmount : (value) => `${value}`;
    const formatInlineAmounts = typeof options.formatInlineAmounts === "function" ? options.formatInlineAmounts : (value) => String(value || "");
    const escapeHtml = typeof options.escapeHtml === "function"
      ? options.escapeHtml
      : (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
    const renderMiniChipStack = typeof options.renderMiniChipStack === "function" ? options.renderMiniChipStack : () => "";
    const renderChipStack = typeof options.renderChipStack === "function" ? options.renderChipStack : () => "";
    const renderPotChipStack = typeof options.renderPotChipStack === "function" ? options.renderPotChipStack : renderChipStack;
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    // Canonical timing helpers on the visual bridge (BRIDGE_KEYS). When injected
    // (production path via visual-render-composition -> tableRenderAdapter ->
    // tableEffectsKit.model), the marker-arrival / flight-end offsets are derived
    // from the SAME closed-form the scheduler uses (pendingBetMarkerLandingItems:
    // arrivalMs = actionDelayMs + betMarkerLandingMs, flightEndMs = actionDelayMs +
    // chipRevealMs), instead of re-rolling actionDelay + announce + round(flight*
    // RATIO) by hand and risking drift. Headless source-contract harnesses that
    // only inject the primitives (chipAnnouncementDelayForAction / chipFlightMs)
    // fall back to the hand-rolled arithmetic, which is byte-for-byte identical.
    const injectedBetMarkerLandingMs = typeof options.betMarkerLandingMs === "function" ? options.betMarkerLandingMs : null;
    const injectedChipRevealMs = typeof options.chipRevealMs === "function" ? options.chipRevealMs : null;
    const actionI18n = options.actionI18n || root.PokerSimulatorActionI18n || {};
    const sessionIdentity = typeof options.sessionIdentity === "function" ? options.sessionIdentity : () => "";
    const localizeActionLabel = typeof actionI18n.localizeActionLabel === "function" ? actionI18n.localizeActionLabel : (value) => value;
    const localizeActionText = typeof actionI18n.localizeActionText === "function" ? actionI18n.localizeActionText : (value) => value;
    const localizeThinkingLabel = typeof actionI18n.thinkingLabel === "function" ? actionI18n.thinkingLabel : (actor) => `${actor} думает`;
    const durations = options.durations || {};

    function duration(name) {
      const value = Number(durations[name]);
      return Number.isFinite(value) ? value : 0;
    }

    function betAnimationTiming(table, item, index) {
      const leadMs = Number(table?.actionSequenceLeadMs || 0);
      const actionIndex = actionIndexForBetAnimation(table, item, index);
      // ORIGIN-RELATIVE offsets: pass elapsedMs:0 so actionDelayMs is measured
      // from the sequence origin, exactly as the scheduler
      // (pendingBetMarkerLandingItems -> scheduleBetMarkerLandingRender) does.
      // ensureBetAnimationDeadlines then anchors these offsets to
      // table.actionRevealStartedAt, so the render-time fallback stamps the SAME
      // markerUntil/flyUntil the pre-stamp would have. Using a now()-relative
      // remainder here (elapsedMs:actionSequenceElapsedMs) would only match while
      // startedAt is live; on a reuse prime with a stale/zeroed elapsed it drifts
      // the chip-flight `elapsed` ms behind the settled bet (obs 13537/13539).
      const timing = actionTimingAtIndex(table, actionIndex, { leadMs, elapsedMs: 0 });
      const action = table.actionAnimations?.[actionIndex] || null;
      return { actionIndex, timing, action };
    }

    // Canonical marker-arrival offset for an action: prefer the injected
    // betMarkerLandingMs (the scheduler's own helper), else re-derive it from the
    // primitives exactly as betMarkerLandingMs does (announce + round(flight*RATIO)
    // when there is a flight, 0 otherwise). Both branches are numerically equal.
    function betMarkerLandingOffsetMs(action) {
      if (injectedBetMarkerLandingMs) return Number(injectedBetMarkerLandingMs(action) || 0);
      const flightMs = Math.max(0, Number(chipFlightMs(action) || 0));
      if (!(flightMs > 0)) return 0;
      return Number(chipAnnouncementDelayForAction(action) || 0) + Math.max(0, Math.round(flightMs * BET_FLIGHT_MARKER_LAND_RATIO));
    }

    // Canonical flight-end offset for an action: prefer the injected chipRevealMs
    // (the scheduler's own helper), else re-derive it (announce + flight when there
    // is a flight, 0 otherwise). Both branches are numerically equal.
    function chipRevealOffsetMs(action) {
      if (injectedChipRevealMs) return Number(injectedChipRevealMs(action) || 0);
      const flightMs = Math.max(0, Number(chipFlightMs(action) || 0));
      if (!(flightMs > 0)) return 0;
      return Number(chipAnnouncementDelayForAction(action) || 0) + flightMs;
    }

    function betMarkerArrivalDelayMs(table, item, index) {
      const { timing, action } = betAnimationTiming(table, item, index);
      return Math.max(0, Math.round(Number(timing.actionDelayMs || 0) + betMarkerLandingOffsetMs(action)));
    }

    function betFlightEndDelayMs(table, item, index) {
      const { timing, action } = betAnimationTiming(table, item, index);
      return Math.max(0, Math.round(Number(timing.actionDelayMs || 0) + chipRevealOffsetMs(action)));
    }

    function ensureBetAnimationDeadlines(table, item, index) {
      if (!item || Number(item.seatId) === 0) return;
      // Anchor deadlines to the (possibly reused) sequence origin, mirroring
      // scheduleBetMarkerLandingRender in simulator-visual-timers.js and
      // primeActionReveal's actionRevealUntil anchoring. On a turn/river
      // back-to-back prime startedAt is already `elapsed` ms in the past, and the
      // marker/flight offsets are origin-relative (betAnimationTiming asks for
      // elapsedMs:0). This fallback fires when the pre-stamp never happened (a
      // render raced the prime, or a path skipped priming); stamping off raw
      // now()+offset would push the whole chip-flight `elapsed` ms behind the
      // action so the settled bet appears first and the fly-in plays late
      // (the bc9cfce2 bug class, obs 13537/13539).
      const originAt = Number(table.actionRevealStartedAt) || now();
      if (!Number.isFinite(Number(item.markerUntil))) {
        const markerDelayMs = betMarkerArrivalDelayMs(table, item, index);
        item.markerUntil = originAt + markerDelayMs;
        if (!Number.isFinite(Number(item.markerDelayMs))) item.markerDelayMs = markerDelayMs;
      }
      if (!Number.isFinite(Number(item.flyUntil))) {
        item.flyUntil = originAt + betFlightEndDelayMs(table, item, index);
      }
    }

    function markerDelayRemainingMs(item) {
      const markerUntil = Number(item?.markerUntil);
      return Number.isFinite(markerUntil) ? Math.max(0, Math.round(markerUntil - now())) : 0;
    }

    // PURE READ. isBetLanded and isBetFlightComplete no longer stamp
    // item.landed / item.flightComplete — those visibility flags have exactly one
    // writer, reconcileBetAnimations, called at the entry of every render-path
    // reader below. These predicates still MEMOIZE the origin-anchored deadlines
    // (markerUntil / flyUntil via ensureBetAnimationDeadlines) so a direct caller
    // that never went through a render — the bet-flight-anchor smoke, markerDelay
    // ForSeat — computes the same truth; deadline stamping is idempotent (only
    // fills unset fields) and is NOT a visibility side effect.
    function isBetLanded(table, item, index) {
      if (!item || Number(item.seatId) === 0) return true;
      if (!usesDecorativeMotionLayer()) return true;
      if (item.landed) return true;
      if (!isActionSequenceActive(table)) return true;
      ensureBetAnimationDeadlines(table, item, index);
      return now() >= Number(item.markerUntil);
    }

    function isBetFlightComplete(table, item, index) {
      if (!item || Number(item.seatId) === 0) return true;
      if (!usesDecorativeMotionLayer()) return true;
      if (item.flightComplete) return true;
      if (!isActionSequenceActive(table)) return true;
      ensureBetAnimationDeadlines(table, item, index);
      return now() >= Number(item.flyUntil);
    }

    // SINGLE MUTATOR for the bet-animation visibility flags. Idempotent and cheap:
    // early-exits when nothing is left to stamp. Every render-path reader
    // (renderSeatBets / renderBetFlights / visibleSeatBetAmount / ...) calls this
    // at entry so the flags a downstream timer reads (scheduleBetMarkerLandingRender
    // reads currentItem.landed on fire) are persisted, while the read predicates
    // themselves stay pure. Mirrors the MP-resilience property: the multiplayer
    // adapter rebuilds betAnimations WITHOUT .landed every poll, so restamping at
    // render entry is what keeps a passed-deadline chip landed between polls.
    function reconcileBetAnimations(table) {
      const items = Array.isArray(table?.betAnimations) ? table.betAnimations : null;
      if (!items || !items.length) return;
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item || (item.landed && item.flightComplete)) continue;
        // isBetFlightComplete implies isBetLanded (flyUntil >= markerUntil), so a
        // completed flight also settles the marker; compute both, stamp both.
        const flightComplete = isBetFlightComplete(table, item, index);
        if (flightComplete) {
          item.flightComplete = true;
          item.landed = true;
          continue;
        }
        if (!item.landed && isBetLanded(table, item, index)) item.landed = true;
      }
    }

    // SINGLE CLEARING implementation for betAnimations. table-effects owns the
    // array's lifecycle; simulator-visual-timers.js (action-unlock teardown) and
    // clearExpiredRenderedAnimations in the render adapter route their clears here
    // instead of assigning `table.betAnimations = []` themselves, so ownership is
    // in one place. The engine slice-cap (addSeatContribution) and the MP adapter
    // rebuild stay untouched — those are legitimate PRODUCERS, not clearers.
    function clearBetAnimations(table, _reason) {
      if (!table) return;
      table.betAnimations = [];
    }

    // SINGLE FILTERING implementation for betAnimations. Action runtimes may
    // choose a fresh visible action chapter, but they do not own this array's
    // lifecycle. Keep only flights that belong after the chapter boundary (or
    // to an explicitly retained action key) here, beside reconcile/clear.
    function retainBetAnimationsForActionSequence(table, options = {}) {
      if (!table || !Array.isArray(table.betAnimations)) return;
      const afterSeq = Number(options.afterSeq);
      const actionKeys = new Set(
        (Array.isArray(options.actionKeys) ? options.actionKeys : [])
          .map((key) => String(key || ""))
          .filter(Boolean)
      );
      table.betAnimations = table.betAnimations.filter((item) => {
        const actionSeq = Number(item?.actionSeq);
        if (Number.isFinite(afterSeq) && Number.isFinite(actionSeq)) return actionSeq > afterSeq;
        return actionKeys.has(String(item?.actionKey || ""));
      });
    }

    function actionBoardRenderableLength(table) {
      const state = actionSequenceBoardRevealState(table);
      const candidates = [
        Number(state?.renderableLength),
        Number(state?.visibleLength),
        Number(visibleBoardLength(table))
      ].filter((value) => Number.isFinite(value));
      return candidates.length ? Math.max(...candidates) : 0;
    }

    function betAnimationBoardLength(table, item, index) {
      const explicit = Number(item?.boardLength);
      if (Number.isFinite(explicit)) return explicit;
      const actionIndex = actionIndexForBetAnimation(table, item, index);
      const action = table?.actionAnimations?.[actionIndex] || null;
      const actionLength = Number(action?.boardLength);
      return Number.isFinite(actionLength) ? actionLength : NaN;
    }

    function completedPastStreetBet(table, item, index) {
      if (!isActionSequenceActive(table)) return false;
      const boardLength = betAnimationBoardLength(table, item, index);
      if (!Number.isFinite(boardLength)) return false;
      if (actionBoardRenderableLength(table) <= boardLength) return false;
      return isBetFlightComplete(table, item, index);
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

    function closingStreetBetStillReadable(table, seatId, snapshot) {
      if (!snapshot) return false;
      const matchingBets = (table?.betAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => Number(item?.seatId) === Number(seatId))
        .filter(({ item, index }) => actionMatchesClosingStreet(table, item, index, snapshot));
      // Hero intentionally has no betAnimation (its wager is already resting on
      // the felt), and a settled action chapter may clear the per-action array.
      // In both cases the immutable closing-street snapshot remains the canonical
      // owner until the SAME transition gate moves the amount into the pot. This
      // keeps Hero and villains on one lifecycle across flop/turn/river.
      if (!matchingBets.length) {
        return Number(snapshot.seatBets?.[seatId] || 0) > 0
          && closingStreetTransitionStillReadable(table, snapshot);
      }
      return matchingBets.some(({ item, index }) => !actionAnimationHasCompleted(table, actionIndexForBetAnimation(table, item, index)))
        || closingStreetTransitionStillReadable(table, snapshot);
    }

    function markerDelayForSeat(table, seatId, snapshot = null) {
      let delay = 0;
      if (Array.isArray(table?.betAnimations)) {
        table.betAnimations.forEach((item, index) => {
          if (Number(item.seatId) !== Number(seatId)) return;
          if (snapshot && !actionMatchesClosingStreet(table, item, index, snapshot)) return;
          if (isBetLanded(table, item, index)) return;
          delay = Math.max(delay, markerDelayRemainingMs(item));
        });
      }
      return delay;
    }

    // A live effect key owns its first felt coordinates for its visual chapter. The
    // slot resolver deliberately uses different obstacle sets for betting,
    // all-in and reveal phases; asking it again mid-animation can therefore move
    // the same marker/flight by double-digit felt percentages. The DOM patcher
    // preserves a keyed transient's first inline style, so keeping the render
    // model on that same immutable anchor prevents a later teardown/remount from
    // snapping to a different phase's coordinates. One bounded entry per table
    // is replaced automatically when handNo advances.
    const effectAnchorLatch = new Map();

    function visualHandKey(table) {
      const handNo = Number(table?.handNo);
      if (!Number.isFinite(handNo)) return "";
      // Multiplayer reuses local table ids (the primary table is commonly 1)
      // and server hand counters may restart in a different room. Room identity
      // therefore belongs to every per-hand visual latch key.
      const roomId = String(table?.serverRoomId || "").trim();
      // Local hand counters restart at 1 after a manual session reset. Include
      // the live session id as well so table 1 / hand 1 can never inherit a
      // previous session's coordinates or latched action markup.
      const sessionId = String(sessionIdentity(table) || table?.sessionId || "").trim();
      const scope = [roomId ? `room:${roomId}` : "", sessionId ? `session:${sessionId}` : "local"]
        .filter(Boolean)
        .join(":");
      return `${scope}:hand:${handNo}`;
    }

    function effectAnchorLatchFor(table) {
      const tableId = Number(table?.id);
      const handKey = visualHandKey(table);
      if (!Number.isFinite(tableId) || !handKey) return null;
      const current = effectAnchorLatch.get(tableId);
      if (current?.handKey === handKey) return current;
      const next = { handKey, points: new Map() };
      effectAnchorLatch.set(tableId, next);
      return next;
    }

    function immutableEffectPoint(table, key, resolvePoint) {
      const latch = effectAnchorLatchFor(table);
      const pointKey = String(key || "");
      if (latch && pointKey && latch.points.has(pointKey)) return latch.points.get(pointKey);
      const point = typeof resolvePoint === "function" ? resolvePoint() : null;
      if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) return point;
      if (!latch || !pointKey) return point;
      if (!latch.points.has(pointKey)) {
        latch.points.set(pointKey, { x: Number(point.x), y: Number(point.y) });
      }
      return latch.points.get(pointKey);
    }

    function markerChapterKey(table, snapshot = null, item = null, index = 0, matchClosingSnapshot = false) {
      const actionIndex = item ? actionIndexForBetAnimation(table, item, index) : -1;
      const action = item?.street
        ? item
        : actionIndex >= 0
          ? table?.actionAnimations?.[actionIndex] || null
          : null;
      // The engine can publish the first board before the closing preflop flight
      // is built. In that boundary shape the matched action legitimately reads
      // {preflop, boardLength:3}, while visualClosedStreetBets still owns the
      // visible marker as {preflop, boardLength:0}. Seq-band ownership is the
      // canonical bridge: a closing flight must target the already-latched
      // closing marker chapter, not create a second point from the grown board.
      const closingSnapshot = snapshot || (matchClosingSnapshot && item ? closingStreetBetSnapshot(table) : null);
      const snapshotOwnsItem = Boolean(
        closingSnapshot && (!item || actionMatchesClosingStreet(table, item, index, closingSnapshot))
      );
      const chapterSnapshot = snapshotOwnsItem ? closingSnapshot : null;
      const street = String(chapterSnapshot?.street || action?.street || table?.street || "live");
      const rawBoardLength = chapterSnapshot?.boardLength ?? action?.boardLength ?? visibleBoardLength(table);
      const boardLength = Number.isFinite(Number(rawBoardLength)) ? Number(rawBoardLength) : 0;
      return `${street}:${boardLength}`;
    }

    function markerEffectPoint(table, seatId, chapterKey = markerChapterKey(table)) {
      const id = Number(seatId);
      // The same transient (including a closing-street hold) must never jump
      // when the table's resolver changes phase. A genuinely new street is a
      // new marker, however, and must be allowed to resolve against that
      // street's board/keep-out geometry instead of inheriting preflop space.
      return immutableEffectPoint(table, `marker:${id}:${chapterKey}`, () => betPoint(table, id));
    }

    function renderBetMarker(table, seatId, amount, snapshot = null, options = {}) {
      const point = markerEffectPoint(table, seatId, markerChapterKey(table, snapshot));
      const seat = table.seats?.find((item) => Number(item.id) === Number(seatId));
      const explicitDelay = Number(options.delayMs);
      const delay = Number.isFinite(explicitDelay) ? explicitDelay : markerDelayForSeat(table, seatId, snapshot);
      // WEBKIT HARDENING (cross-browser). The .bet-marker's betMarkerPop entrance
      // is `animation: betMarkerPop <dur> <ease> var(--marker-delay) both` — the
      // delay lives in the SHORTHAND's delay slot as a custom property. Playwright
      // WebKit 26.4 resolves that correctly, but the trainer's live Safari reports
      // the amount leaking onto the felt before its chip has flown in (marker not
      // held opacity:0 for its --marker-delay window). Older/other WebKit builds
      // are known to mishandle var() in animation-* shorthand delay slots. Emit the
      // SAME delay ALSO as an explicit inline `animation-delay` LONGHAND: an inline
      // longhand outranks the stylesheet shorthand's delay in every engine and
      // needs no var resolution, so betMarkerPop's opacity:0 hold cannot be dropped
      // by a shorthand-parsing quirk. --marker-delay is still emitted so the child
      // chip-settle / amount ticks (which read the custom property) stay anchored,
      // and every pin that matches the `--marker-delay:<n>ms` substring is intact.
      const delayed = delay > 0;
      const delayStyle = delayed
        ? `; --marker-delay:${delay}ms; --bet-marker-value-start-opacity:0; animation-delay:${delay}ms`
        : "";
      const amountDelayStyle = delayed ? ` style="animation-delay:${delay}ms"` : "";
      const closingClass = snapshot ? " is-closing-street" : "";
      const handKey = Number.isFinite(Number(table?.handNo)) ? Number(table.handNo) : "live";
      return `
            <div class="bet-marker bet-marker--${Number(seatId)}${closingClass}" style="left:${point.x}%; top:${point.y}%${delayStyle}" data-animation-key="bet-marker--${handKey}--${Number(seatId)}" aria-label="ставка ${formatAmount(amount)}">
              ${renderMiniChipStack(amount, `ставка ${formatAmount(amount)}`, { table, seat })}
              <span class="bet-marker-amount" data-bet-marker-amount data-animation-key="bet-amount--${Number(seatId)}--${String(amount).replace(".", "_")}"${amountDelayStyle}>${formatAmount(amount)}</span>
            </div>
          `;
    }

    function renderPendingBetMarkerAnchor(table, seatId, delayMs, snapshot = null) {
      const point = markerEffectPoint(table, seatId, markerChapterKey(table, snapshot));
      const delay = Math.max(0, Math.round(Number(delayMs) || 0));
      const closingClass = snapshot ? " is-closing-street" : "";
      const handKey = Number.isFinite(Number(table?.handNo)) ? Number(table.handNo) : "live";
      // This anchor is intentionally empty. Earlier builds pre-rendered the full
      // amount marker hidden behind CSS animation-delay; if that mask glitched,
      // the bare "5 BB" text was already sitting at the landing point. The
      // pre-land DOM now keeps only a coordinate/key target, with no amount text
      // or chip label that can leak before the flight arrives.
      return `
            <div class="bet-marker bet-marker--${Number(seatId)} is-pending-anchor${closingClass}" style="left:${point.x}%; top:${point.y}%; opacity:0; width:0; height:0; min-width:0; min-height:0; padding:0; border:0; background:transparent; box-shadow:none; animation:none; pointer-events:none;" data-animation-key="bet-marker-anchor--${handKey}--${Number(seatId)}" data-bet-marker-anchor data-marker-delay-ms="${delay}" aria-hidden="true"></div>
          `;
    }

    function pendingBetAnimationsForSeat(table, seatId, snapshot = null) {
      if (!Array.isArray(table?.betAnimations)) return [];
      return table.betAnimations
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => Number(item?.seatId) === Number(seatId) && Number(item?.seatId) !== 0)
        .filter(({ item }) => Number(item?.amount || 0) > 0)
        .filter(({ item, index }) => !snapshot || actionMatchesClosingStreet(table, item, index, snapshot))
        .filter(({ item, index }) => snapshot || !completedPastStreetBet(table, item, index))
        .filter(({ item, index }) => !isBetLanded(table, item, index))
        .sort((left, right) => Number(left.item.markerUntil || 0) - Number(right.item.markerUntil || 0));
    }

    function pendingSeatBetMarker(table, seatId, rawAmount, snapshot = null) {
      if (!isActionSequenceActive(table)) return null;
      const pendingItems = pendingBetAnimationsForSeat(table, seatId, snapshot);
      if (!pendingItems.length) return null;
      const hiddenAmount = pendingItems.reduce((total, { item }) => total + Number(item.amount || 0), 0);
      const nextItem = pendingItems[0]?.item || null;
      const nextAmount = Number(nextItem?.amount || 0);
      const amount = roundBb(Math.min(roundBb(rawAmount), Math.max(0, roundBb(rawAmount) - hiddenAmount + nextAmount)));
      if (!(amount > 0)) return null;
      return {
        amount,
        delayMs: markerDelayRemainingMs(nextItem)
      };
    }

    function animatedSeatBetAmount(table, seatId, snapshot = null) {
      if (!isActionSequenceActive(table) || !Array.isArray(table?.betAnimations)) return 0;
      const amount = table.betAnimations
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => Number(item?.seatId) === Number(seatId) && Number(item?.seatId) !== 0)
        .filter(({ item }) => Number(item?.amount || 0) > 0)
        .filter(({ item, index }) => !snapshot || actionMatchesClosingStreet(table, item, index, snapshot))
        .filter(({ item, index }) => snapshot || !completedPastStreetBet(table, item, index))
        .reduce((total, { item }) => total + Number(item.amount || 0), 0);
      return roundBb(amount);
    }

    function setSeatBetMarker(markers, table, seatId, rawAmount, snapshot = null) {
      if (Number(seatId) === 0) return;
      const raw = roundBb(rawAmount);
      if (!(raw > 0)) return;
      const visible = visibleSeatBetAmount(table, seatId, raw, snapshot);
      if (Number(visible) > 0) {
        markers.set(Number(seatId), renderBetMarker(table, seatId, visible, snapshot, { delayMs: 0 }));
        return;
      }
      const pending = pendingSeatBetMarker(table, seatId, raw, snapshot);
      // The closing-street snapshot is rendered first. If the same seat already
      // has a readable marker there and its first action on the new street is
      // still in flight, keep that real marker until the new chips land. A
      // zero-size pending anchor must not overwrite it and create a visible
      // blackout between streets; the landed current-street marker will still
      // replace it through the visible>0 branch above.
      if (pending && !markers.has(Number(seatId))) {
        markers.set(Number(seatId), renderPendingBetMarkerAnchor(table, seatId, pending.delayMs, snapshot));
      }
    }

    function renderSeatBets(table) {
      // Exactly ONE marker node per seat, in stable seatId order. The morph
      // keys markers by `bet-marker--N`, so (a) a closing-street and a
      // current-street marker for the same seat would fight over one DOM node
      // (remove+add thrash), and (b) any order change moves nodes via
      // insertBefore, which RESTARTS the betMarkerPop animation (0% =
      // opacity: 0) — live markers visibly blink out for up to seconds during
      // action cascades. A per-seat map with the current street superseding
      // the closing snapshot plus a sorted join removes both restart sources.
      reconcileBetAnimations(table);
      const markers = new Map();
      const snapshot = closingStreetBetSnapshot(table);
      const snapshotSeatIds = new Set(Object.keys(snapshot?.seatBets || {}).map((seatId) => Number(seatId)));
      if (snapshot) {
        Object.entries(snapshot.seatBets || {})
          .map(([seatId, amount]) => [Number(seatId), amount])
          .filter(([seatId]) => seatId !== 0)
          .filter(([seatId]) => closingStreetBetStillReadable(table, seatId, snapshot))
          .forEach(([seatId, amount]) => {
            setSeatBetMarker(markers, table, seatId, amount, snapshot);
          });
      }
      Object.entries(table?.seatBets || {})
        .map(([seatId, amount]) => [Number(seatId), amount])
        .filter(([seatId]) => seatId !== 0)
        .forEach(([seatId, amount]) => {
          setSeatBetMarker(markers, table, seatId, amount);
        });
      if (isActionSequenceActive(table) && Array.isArray(table?.betAnimations)) {
        const explicitCurrentSeats = new Set(Object.keys(table?.seatBets || {}).map((seatId) => Number(seatId)));
        [...new Set(table.betAnimations.map((item) => Number(item?.seatId)).filter((seatId) => Number.isFinite(seatId) && seatId !== 0))]
          .filter((seatId) => !explicitCurrentSeats.has(seatId))
          .filter((seatId) => !snapshotSeatIds.has(seatId))
          .filter((seatId) => !markers.has(seatId))
          .forEach((seatId) => {
            setSeatBetMarker(markers, table, seatId, animatedSeatBetAmount(table, seatId));
          });
      }
      return [...markers.entries()]
        .sort((left, right) => left[0] - right[0])
        .map(([, html]) => html)
        .join("");
    }

    function renderHeroFeltBet(table) {
      const snapshot = closingStreetBetSnapshot(table);
      const snapshotAmount = snapshot && closingStreetBetStillReadable(table, 0, snapshot)
        ? Number(snapshot.seatBets?.[0] || 0)
        : 0;
      const amount = visibleSeatBetAmount(table, 0, Number(table?.seatBets?.[0] || snapshotAmount || 0), snapshotAmount > 0 ? snapshot : null);
      if (!(Number(amount) > 0)) return "";
      const seat = table.seats?.find((item) => Number(item.id) === 0);
      const handKey = Number.isFinite(Number(table?.handNo)) ? Number(table.handNo) : "live";
      return `
            <div class="hero-felt-bet" data-animation-key="hero-felt-bet--${handKey}" aria-label="ваша ставка ${formatAmount(amount)}">
              ${renderMiniChipStack(amount, `ваша ставка ${formatAmount(amount)}`, { table, seat })}
              <span class="bet-marker-amount" data-bet-marker-amount data-animation-key="bet-amount--0--${String(amount).replace(".", "_")}">${formatAmount(amount)}</span>
            </div>`;
    }

    function visibleSeatBetAmount(table, seatId, amount, snapshot = null) {
      const rawAmount = roundBb(amount);
      if (!isActionSequenceActive(table) || !(rawAmount > 0)) return rawAmount;
      reconcileBetAnimations(table);

      const hiddenAmount = (table?.betAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => Number(item.seatId) === Number(seatId) && Number(item.seatId) !== 0)
        .filter(({ item, index }) => !snapshot || actionMatchesClosingStreet(table, item, index, snapshot))
        .filter(({ item, index }) => snapshot || !completedPastStreetBet(table, item, index))
        .reduce((total, { item, index }) => {
          return isBetLanded(table, item, index) ? total : total + Number(item.amount || 0);
        }, 0);

      return roundBb(Math.max(0, rawAmount - hiddenAmount));
    }

    function betFlightTiming(table, item, index) {
      const actionIndex = actionIndexForBetAnimation(table, item, index);
      const timing = actionTimingAtIndex(table, actionIndex);
      const action = table.actionAnimations?.[actionIndex] || null;
      const chipDuration = Math.max(0, Math.round(Number(chipFlightMs(action) || 0)));
      const rawDelay = Math.max(0, Number(timing.actionDelayMs || 0) + Number(chipAnnouncementDelayForAction(action) || 0));
      let chipDelay = Math.round(rawDelay);
      const flyUntil = Number(item?.flyUntil);
      if (Number.isFinite(flyUntil) && chipDuration > 0) {
        const flightStartAt = flyUntil - chipDuration;
        chipDelay = Math.max(-chipDuration, Math.round(flightStartAt - now()));
      }
      return { action, chipDelay, chipDuration };
    }

    function renderBetFlights(table) {
      if (!usesDecorativeMotionLayer()) return "";
      if (!isActionSequenceActive(table)) return "";
      reconcileBetAnimations(table);
      return (table?.betAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => Number(item.seatId) !== 0)
        .filter(({ item, index }) => !isBetFlightComplete(table, item, index))
        .map(({ item, index }) => {
          const seatId = Number(item.seatId);
          const point = immutableEffectPoint(table, `flight:${item.key}:from`, () => seatPoint(table, seatId));
          const target = markerEffectPoint(table, seatId, markerChapterKey(table, null, item, index, true));
          const { action, chipDelay, chipDuration } = betFlightTiming(table, item, index);
          const flightClass = betFlightClass(table, item, action);
          const displayAmount = Number.isFinite(Number(item.contribution)) ? Number(item.contribution) : Number(item.amount);
          return `
            <div class="bet-flight bet-flight--${seatId} ${flightClass}" style="--from-x:${point.x}%; --from-y:${point.y}%; --to-x:${target.x}%; --to-y:${target.y}%; --chip-delay:${chipDelay}ms; --chip-flight-duration:${chipDuration}ms;" data-animation-key="${escapeHtml(item.key)}" aria-hidden="true">
              ${renderMiniChipStack(item.amount, `ставка ${formatAmount(item.amount)}`)}
              <span class="bet-flight-label">${escapeHtml(formatAmount(displayAmount))}</span>
            </div>
          `;
        })
        .join("");
    }

    function betFlightClass(table, item, action) {
      const label = String(action?.label || "");
      const tone = String(action?.tone || "");
      const seat = table?.seats?.find((candidate) => Number(candidate.id) === Number(item?.seatId));
      const classes = [];
      const riverResolution = actionRiverResolution(action);
      if (riverResolution) classes.push("is-river-resolution", `is-${riverResolution}`);
      if (seat && Number(seat.stack || 0) <= 0) classes.push("is-push");
      else if (/^call\b/i.test(label) || tone === "passive") classes.push("is-call");
      else if (/^(bet|raise|all-in)\b/i.test(label) || tone === "aggressive") classes.push("is-bet");
      return classes.join(" ");
    }

    function renderFoldedCardMucks(table) {
      if (!usesDecorativeMotionLayer()) return "";
      if (!isActionSequenceActive(table)) return "";
      return (table?.actionAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.tone === "fold" && Number(item.seatId) !== 0)
        .filter(({ index }) => actionAnimationIsInMotion(table, index))
        .map(({ item }) => renderFoldMuckForAction(table, item))
        .join("");
    }

    function renderFoldMuckForAction(table, item) {
      const seatId = Number(item.seatId);
      const seat = table.seats?.find((candidate) => Number(candidate.id) === seatId);
      const target = markerEffectPoint(table, seatId, markerChapterKey(table, null, item));
      const delay = FOLD_MUCK_BASE_DELAY_MS;
      const riverResolution = actionRiverResolution(item);
      const muckClass = riverResolution ? ` is-river-resolution is-${riverResolution}` : "";
      const muckDuration = riverResolution
        ? compactTimingMs(duration("riverMuckDurationMs"), duration("compactRiverMuckDurationMs"))
        : compactTimingMs(duration("muckDurationMs"), duration("compactMuckDurationMs"));
      const cards = FOLD_MUCK_CARDS;
      return cards.map((card, cardIndex) => {
        const from = immutableEffectPoint(table, `muck:${item.key}:${cardIndex}:from`, () => foldMuckCardStartPoint(table, seat, cardIndex));
        return `
          <span class="muck-card${muckClass}" style="--muck-duration:${muckDuration}ms; --from-x:${from.x}%; --from-y:${from.y}%; --to-x:${target.x}%; --to-y:${target.y}%; --muck-x:${card.x}px; --muck-y:${card.y}px; --start-rot:${card.start}deg; --end-rot:${card.end}deg; --fold-delay:${delay + card.delay}ms;" data-animation-key="${escapeHtml(item.key)}-muck-${cardIndex}" aria-hidden="true"></span>
        `;
      }).join("");
    }

    function foldMuckCardStartPoint(table, seat, cardIndex) {
      if (!seat) return seatPoint(table, 0);
      const point = dealCardTarget(table, seat, cardIndex);
      const zone = seatZone(seatPoint(table, seat.id));
      if (zone === "top") return { x: point.x, y: point.y + FOLD_MUCK_START_TOP_Y_ADJUST };
      if (zone === "bottom") return { x: point.x, y: point.y - FOLD_MUCK_START_BOTTOM_Y_ADJUST };
      return point;
    }

    // Keep every emitted action-key mounted for the rest of the hand's visual
    // chapter. Runtime views can legitimately oscillate between a full action
    // history and a next-street subset; replacing one whole-set snapshot with
    // the other removes shared keyed nodes and remounts/restarts them when the
    // full set returns. Cache the FIRST markup/style per key and render the
    // union for the whole hand. New handNo replaces the bounded table entry.
    const actionBubbleItemLatch = new Map();

    function renderActionBubbleItem(table, item, index) {
      const point = immutableEffectPoint(table, `action:${item.key}`, () => actionPoint(table, Number(item.seatId)));
      const timing = actionTimingAtIndex(table, index);
      const label = actionAnnouncementLabel(table, item);
      const classes = actionBubbleClasses(item);
      return `
              ${item.isHeroAction ? "" : `<div class="action-bubble is-thinking" style="--action-x:${point.x}%; --action-y:${point.y}%; --action-delay:${timing.thinkingDelayMs}ms; --thinking-duration:${timing.thinkMs}ms;" data-animation-key="${escapeHtml(item.key)}-thinking" aria-hidden="true">
                ${escapeHtml(thinkingLabel(table, item))}
              </div>`}
              <div class="${escapeHtml(classes)}" style="--action-x:${point.x}%; --action-y:${point.y}%; --action-delay:${timing.actionDelayMs}ms; --action-duration:${actionRevealMs(item)}ms;" data-animation-key="${escapeHtml(item.key)}" aria-hidden="true">
                ${escapeHtml(label)}
              </div>
            `;
    }

    function actionBubbleLatchFor(tableId, handNo) {
      const current = actionBubbleItemLatch.get(tableId);
      if (current?.handNo === handNo && current.resetPending !== true) return current;
      const next = { handNo, nextOrder: 0, items: new Map(), resetPending: false };
      actionBubbleItemLatch.set(tableId, next);
      return next;
    }

    function clearActionBubbleLatch(table, _reason) {
      const tableId = Number(table?.id);
      if (!Number.isFinite(tableId)) return;
      const current = actionBubbleItemLatch.get(tableId);
      // A fresh chapter is prepared synchronously, but its replacement action
      // queue can be painted one render later. Keep the old keyed markup through
      // that gap and replace the latch atomically when the first new action is
      // rendered. Reduced motion / explicit teardown still clears immediately.
      if (/fresh-sequence/.test(String(_reason || "")) && current?.handNo === visualHandKey(table)) {
        current.resetPending = true;
        return;
      }
      actionBubbleItemLatch.delete(tableId);
    }

    function latchedActionBubbleHtml(latch) {
      if (!latch?.items?.size) return "";
      return Array.from(latch.items.values())
        .sort((first, second) => {
          if (Number.isFinite(first.seq) && Number.isFinite(second.seq) && first.seq !== second.seq) {
            return first.seq - second.seq;
          }
          return first.order - second.order;
        })
        .map((entry) => entry.html)
        .join("");
    }

    function renderActionBubbles(table) {
      const tableId = Number(table?.id);
      const handNo = visualHandKey(table);
      const actions = Array.isArray(table?.actionAnimations) ? table.actionAnimations : [];
      const latchable = Number.isFinite(tableId) && Boolean(handNo);
      if (prefersReducedMotion()) {
        if (latchable) clearActionBubbleLatch(table, "reduced-motion");
        return "";
      }
      if (!actions.length) {
        // `actionAnimations=[]` is not a teardown signal by itself. The Hero
        // reveal unlock and the deferred bot-response callback deliberately
        // share a deadline, so the unlock can empty the array for one render
        // immediately before the response repopulates it. Keep the keyed nodes
        // mounted through that gap and every later bot chapter. A new hand
        // number replaces the bounded per-table latch; reduced-motion clears it.
        const latched = latchable ? actionBubbleItemLatch.get(tableId) : null;
        if (latched?.handNo === handNo) return latchedActionBubbleHtml(latched);
        return "";
      }
      if (!isActionSequenceActive(table)) {
        const latched = latchable ? actionBubbleItemLatch.get(tableId) : null;
        if (latched?.handNo === handNo) return latchedActionBubbleHtml(latched);
        return "";
      }
      if (!latchable) return actions.map((item, index) => renderActionBubbleItem(table, item, index)).join("");
      const latch = actionBubbleLatchFor(tableId, handNo);
      actions.forEach((item, index) => {
        const key = String(item?.key || "");
        if (!key || latch.items.has(key)) return;
        const rawSeq = Number(item?.seq);
        latch.items.set(key, {
          key,
          seq: Number.isFinite(rawSeq) ? rawSeq : null,
          order: latch.nextOrder,
          html: renderActionBubbleItem(table, item, index)
        });
        latch.nextOrder += 1;
      });
      return latchedActionBubbleHtml(latch);
    }

    function actionBubbleClasses(item) {
      const classes = ["action-bubble", `is-${item?.tone || "neutral"}`];
      const riverResolution = actionRiverResolution(item);
      if (riverResolution) classes.push("is-river-resolution", `is-${riverResolution}`);
      return classes.join(" ");
    }

    function riverResolutionCueEvent(table) {
      const actions = Array.isArray(table?.actionAnimations) ? table.actionAnimations : [];
      const indexed = actions
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => isRiverResolutionAction(item));
      return indexed.length ? indexed[indexed.length - 1] : null;
    }

    function renderRiverResolutionCue(table) {
      if (prefersReducedMotion()) return "";
      if (!isActionSequenceActive(table)) return "";
      const event = riverResolutionCueEvent(table);
      if (!event) return "";
      const { item, index } = event;
      const riverResolution = actionRiverResolution(item);
      const cueDuration = riverResolutionCueMs(item);
      if (!cueDuration) return "";
      const timing = actionTimingAtIndex(table, index);
      const cueDelay = timing.actionDelayMs + riverResolutionCueDelayMs(item);
      const label = riverResolution === "call-to-showdown" ? "Шоудаун" : "Фолд";
      return `
          <div class="river-resolution-cue is-${escapeHtml(riverResolution)}" style="--cue-delay:${cueDelay}ms; --cue-duration:${cueDuration}ms;" data-animation-key="${escapeHtml(item.key)}-river-cue" aria-hidden="true">
            <span>${escapeHtml(label)}</span>
          </div>
        `;
    }

    function actionBubbleLabel(table, item) {
      const label = String(item?.label || "");
      if (!label) return "";
      if (!actionAnimationIsAllIn(table, item)) return localizeActionLabel(formatInlineAmounts(label));
      if (/^call\b/i.test(label)) return localizeActionLabel(formatInlineAmounts(label.replace(/^Call\b/i, "Call all-in")));
      if (/^(bet|raise to)\b/i.test(label)) return localizeActionLabel(formatInlineAmounts(label.replace(/^(Bet|Raise to)\b/i, "All-in")));
      return localizeActionLabel(formatInlineAmounts(label));
    }

    function actionAnnouncementLabel(table, item) {
      const compact = compactActionAnnouncementLabel(table, item);
      return compact || actionBubbleLabel(table, item);
    }

    function compactActionAnnouncementLabel(table, item) {
      const label = String(item?.label || "").trim();
      if (!label) return "";
      if (actionAnimationIsAllIn(table, item) || /(?:^|\s)all[-\s]?in\b/i.test(label)) return "Олл-ин";
      if (/(?:^|\s)raise(?:\s+to)?\b/i.test(label)) return "Рейз";
      if (/(?:^|\s)bet\b/i.test(label)) return "Бет";
      if (/(?:^|\s)call\b/i.test(label)) return "Колл";
      if (/(?:^|\s)fold$/i.test(label)) return "Фолд";
      if (/(?:^|\s)check$/i.test(label)) return "Чек";
      return "";
    }

    function thinkingLabel(table, item) {
      const seat = table?.seats?.find((candidate) => Number(candidate.id) === Number(item.seatId));
      const actor = seat?.isHero ? "Hero" : seat?.position || seat?.name || "Bot";
      return localizeThinkingLabel(actor);
    }

    function renderPotStacks(potState) {
      // The chip pile sits beside the CARRIED readout, so its height should track
      // the settled pile (pot minus the current street's bets) rather than the
      // grand total — live bets stay visible as markers in front of players.
      return renderPotChipStack(potState?.carriedAmount ?? potState?.visibleAmount ?? 0);
    }

    // Landing point for a pot-award flight. The hero keeps its dedicated
    // upward lift (clamped); every other winner settles a step toward the felt
    // centre so the badge sits in front of the box instead of on top of the
    // name + stack plate. Returns rounded %-of-felt coords for the CSS vars.
    function potAwardTarget(point, isHero) {
      if (isHero) {
        return { x: point.x, y: Math.max(HERO_POT_AWARD_MIN_Y, point.y - HERO_POT_AWARD_Y_NUDGE) };
      }
      const round = (value) => Math.round(value * 10) / 10;
      return {
        x: round(point.x + (50 - point.x) * POT_AWARD_INWARD_NUDGE),
        y: round(point.y + (50 - point.y) * POT_AWARD_INWARD_NUDGE)
      };
    }

    function computePotAwardFlight(table) {
      if (prefersReducedMotion()) return "";
      if (isActionSequenceActive(table)) return "";
      if (table?.status === "showdown" && !showdownAwardVisible(table)) return "";
      // Multiple pot winners (side pots): render one award flight per winner
      // carrying THAT winner's share, instead of a single seat collecting the
      // whole pot — which renders the wrong seat (or nothing when winnerSeat is
      // ambiguous across split side pots).
      const potWinners = Array.isArray(table?.showdown?.potWinners)
        ? table.showdown.potWinners.filter((entry) => Number(entry?.amount) > 0)
        : [];
      if (potWinners.length > 1) {
        return potWinners.map((entry) => {
          const target = potAwardTarget(seatPoint(table, entry.seatId), entry.isHero);
          return `
          <div class="pot-award" style="--winner-x:${target.x}%; --winner-y:${target.y}%;" aria-hidden="true">
            ${renderChipStack(entry.amount)}
            <span class="pot-label">${escapeHtml(localizeActionText("Win"))}</span>
            <span>${formatAmount(entry.amount)}</span>
          </div>
        `;
        }).join("");
      }
      const winner = winnerSeat(table);
      if (!winner || !(Number(table.pot) > 0)) return "";
      const target = potAwardTarget(seatPoint(table, winner.id), winner.isHero);
      return `
          <div class="pot-award" style="--winner-x:${target.x}%; --winner-y:${target.y}%;" aria-hidden="true">
            ${renderChipStack(table.pot)}
            <span class="pot-label">${escapeHtml(localizeActionText("Win"))}</span>
            <span>${formatAmount(table.pot)}</span>
          </div>
        `;
    }

    // Latch the pot-award flight per hand so it mounts EXACTLY once. The flight is
    // a one-shot CSS animation (`potAward ... forwards`) that only replays if its
    // DOM node is removed and re-inserted. Any single render that momentarily
    // blanks the flight mid-award — a timing-deadline wobble re-arming
    // isActionSequenceActive or flipping showdownAwardVisible, a pause/resume, an
    // auto-deal boundary — would let pruneStaleTransientNodes drop the node and a
    // later render re-add it: a second "pot flies to the winner" flight (the
    // reported "банк дважды ко мне уехал"). Once the flight has been emitted for a
    // hand, keep emitting the SAME markup until the hand is torn down (handNo
    // advances or the table returns to active play), so the node is morphed in
    // place and never re-mounted. The happy path is byte-identical: while the live
    // award is non-empty it always wins, so the latch only fills the gaps.
    const potAwardFlightLatch = new Map();

    function renderPotAward(table) {
      const tableId = table?.id;
      const live = computePotAwardFlight(table);
      if (live) {
        if (tableId != null) potAwardFlightLatch.set(tableId, { handNo: table?.handNo, html: live });
        return live;
      }
      // No live award this frame. If the flight already started for THIS hand and
      // the table has not returned to active play, re-emit the latched markup so
      // the running animation is preserved (morphed in place) rather than pruned
      // and re-mounted.
      if (tableId != null && table?.status !== "playing") {
        const latched = potAwardFlightLatch.get(tableId);
        if (latched && latched.handNo === table?.handNo && latched.html) return latched.html;
      }
      return "";
    }

    return {
      isBetLanded,
      reconcileBetAnimations,
      clearBetAnimations,
      retainBetAnimationsForActionSequence,
      clearActionBubbleLatch,
      renderSeatBets,
      renderHeroFeltBet,
      visibleSeatBetAmount,
      renderBetFlights,
      betFlightClass,
      renderFoldedCardMucks,
      renderFoldMuckForAction,
      foldMuckCardStartPoint,
      renderActionBubbles,
      actionBubbleClasses,
      riverResolutionCueEvent,
      renderRiverResolutionCue,
      actionBubbleLabel,
      thinkingLabel,
      renderPotStacks,
      renderPotAward
    };
  }

  root.PokerSimulatorTableEffects = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
