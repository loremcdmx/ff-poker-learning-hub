// Multiplayer step interpolation — reconstruct the intermediate hand-views a
// burst of server actions passed through, so the client can REPLAY them one
// beat at a time instead of snapping to the final snapshot in a single jump.
//
// Why this exists: the server resolves a whole bot cascade synchronously (no
// per-action delay — serverless has no background loop), so one authoritative
// `getRoom` snapshot can be several actions ahead of what is on screen. The
// per-event SSE channel (hand-action / street) already carries the PUBLIC delta
// of each step, so we rebuild each intermediate hand-view purely from those
// events applied to the last rendered view — no engine math, no strategy, no
// hole cards invented.
//
// Correctness is self-healing: the caller renders these intermediates ONLY when
// the final reconstructed state matches the authoritative target (reachedTarget)
// and then lands on the real snapshot as the final beat. Any missing /
// out-of-order / unexpected event makes the replay miss the target -> the caller
// snaps. Secrecy is preserved: a non-viewer seat's `hole` (null) is never
// touched; we only mutate public fields (committed chips, pot, board, fold/all-in).
//
// Pure + window-free so it is node-testable (scripts/mp-step-interp-smoke.mjs
// replays the SAME events through the real api/_hand.js engine and asserts each
// reconstructed public field matches).

(function (root) {
  function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  // Deep clone a serialized hand-view (pure JSON: strings/numbers/arrays/null).
  function cloneHand(hand) {
    return JSON.parse(JSON.stringify(hand));
  }

  function seatByIndex(hand, seatIndex) {
    return (hand.seats || []).find((seat) => seat.seatIndex === seatIndex) || null;
  }

  // Apply one authoritative hand-action event to a mutable cloned hand-view.
  // Mirrors api/_hand.js applyAction's PUBLIC effects only (committed chips,
  // stack, pot, currentBet, fold/all-in). `amount` semantics differ by action:
  //   - call:  amount = chips paid this action (a DELTA), no `to`
  //   - raise/bet/all-in: `to` = the seat's new committedStreet (a TOTAL)
  // so a present `to` is authoritative; `amount` is only a delta for a plain call.
  function applyActionEvent(hand, ev) {
    const seat = seatByIndex(hand, ev.seatIndex);
    if (!seat) return;
    const action = String(ev.action || "");
    if (action === "fold") {
      seat.folded = true;
      seat.foldedStreet = hand.street;
      seat.hasCards = false; // folded seats render no card backs
      return;
    }
    if (action === "check") return; // no chips move
    let delta;
    if (Number.isFinite(Number(ev.to))) {
      const to = round2(ev.to);
      delta = round2(to - Number(seat.committedStreet || 0));
      seat.committedStreet = to;
    } else {
      delta = round2(Number(ev.amount) || 0);
      seat.committedStreet = round2(Number(seat.committedStreet || 0) + delta);
    }
    if (delta > 0) {
      seat.stack = round2(Number(seat.stack || 0) - delta);
      seat.committedTotal = round2(Number(seat.committedTotal || 0) + delta);
      hand.pot = round2(Number(hand.pot || 0) + delta);
    }
    hand.currentBet = round2(Math.max(Number(hand.currentBet || 0), Number(seat.committedStreet || 0)));
    if (action === "allin") seat.allIn = true;
  }

  // Apply a street advance: new board + street, committed-this-street reset to 0
  // (committedTotal is cumulative and stays), currentBet back to 0.
  function applyStreetEvent(hand, ev) {
    hand.street = ev.street || hand.street;
    if (Array.isArray(ev.board)) hand.board = ev.board.slice();
    for (const seat of hand.seats || []) seat.committedStreet = 0;
    hand.currentBet = 0;
  }

  // Pacing tone for one action event (drives the beat budget downstream).
  function toneForAction(ev) {
    const action = String(ev.action || "");
    if (action === "fold") return "fold";
    if (action === "allin") return "allin";
    if (action === "raise") return "aggressive";
    return "passive"; // call / bet-as-passive
  }

  // The seat that acts NEXT after position `idx` in the ordered event list — the
  // toActSeatIndex for the intermediate just produced. Falls back to the
  // authoritative target when no further action is buffered.
  function nextActorAfter(relevant, idx, target) {
    for (let j = idx + 1; j < relevant.length; j += 1) {
      if (relevant[j].type === "hand-action") return relevant[j].seatIndex;
    }
    return target.toActSeatIndex;
  }

  // Compare the PUBLIC, reconstructable fields of two hand-views. toActSeatIndex
  // is intentionally excluded (it is event-derived display state, not asserted).
  function publicEquals(a, b) {
    if (round2(a.pot) !== round2(b.pot)) return false;
    if (round2(a.currentBet) !== round2(b.currentBet)) return false;
    if (String(a.street) !== String(b.street)) return false;
    if ((a.board || []).join(",") !== (b.board || []).join(",")) return false;
    const aSeats = new Map((a.seats || []).map((seat) => [seat.seatIndex, seat]));
    for (const sb of b.seats || []) {
      const sa = aSeats.get(sb.seatIndex);
      if (!sa) return false;
      if (round2(sa.committedStreet) !== round2(sb.committedStreet)) return false;
      if (round2(sa.committedTotal) !== round2(sb.committedTotal)) return false;
      if (round2(sa.stack) !== round2(sb.stack)) return false;
      if (Boolean(sa.folded) !== Boolean(sb.folded)) return false;
      if (Boolean(sa.allIn) !== Boolean(sb.allIn)) return false;
    }
    return true;
  }

  // Reconstruct the ordered intermediate hand-views from `baseHand` through the
  // buffered `events` toward `finalView.hand`.
  //
  // Returns { steps, reachedTarget }:
  //   steps        — [{ hand, kind:"action"|"street", tone }] INCLUDING the final
  //                  state (== target); the caller paces steps[0..n-2] then lands
  //                  on the authoritative snapshot.
  //   reachedTarget — true iff the last reconstructed state's public fields equal
  //                  the target's. The caller paces ONLY when true (else snaps).
  function reconstructSteps(baseHand, events, finalView) {
    const target = finalView && finalView.hand;
    if (!baseHand || !target) return { steps: [], reachedTarget: false };
    if (baseHand.handNo !== target.handNo) return { steps: [], reachedTarget: false };

    // Only same-hand betting deltas, in seq order. Showdown events are NOT
    // replayed — a completed hand (runout / reveal) routes through the snapshot.
    const relevant = (events || [])
      .filter((ev) => ev && (ev.type === "hand-action" || ev.type === "street"))
      .slice()
      .sort((left, right) => Number(left.seq || 0) - Number(right.seq || 0));
    if (!relevant.length) return { steps: [], reachedTarget: false };

    const work = cloneHand(baseHand);
    const steps = [];
    for (let i = 0; i < relevant.length; i += 1) {
      const ev = relevant[i];
      if (ev.type === "hand-action") {
        const tone = toneForAction(ev);
        applyActionEvent(work, ev);
        let kind = "action";
        const next = relevant[i + 1];
        // Coalesce a street-closing action with its immediately-following street
        // advance into ONE beat: the renderer's adapter synthesizes the closing
        // call/check bubble from the street-boundary delta, so emitting them as
        // two beats would double the bubble (matches today's snapshot apply).
        if (next && next.type === "street") {
          applyStreetEvent(work, next);
          kind = "street";
          i += 1; // consume the street event
        }
        work.toActSeatIndex = nextActorAfter(relevant, i, target);
        steps.push({ hand: cloneHand(work), kind, tone });
      } else {
        // Lone street event (defensive: buffer started mid-stream). No preceding
        // action to attribute, so suppress the adapter's closing synth.
        applyStreetEvent(work, ev);
        work.toActSeatIndex = -1;
        steps.push({ hand: cloneHand(work), kind: "street", tone: "passive" });
      }
    }

    const last = steps[steps.length - 1];
    const reachedTarget = publicEquals(last.hand, target);
    // The final beat is rendered from the authoritative snapshot anyway; align
    // the reconstructed final's display-only fields so a smoke comparing it to
    // the snapshot sees the intended end state.
    last.hand.toActSeatIndex = target.toActSeatIndex;
    last.hand.status = target.status;
    return { steps, reachedTarget };
  }

  const exported = { reconstructSteps, publicEquals };
  root.PokerSimulatorMpStepInterp = exported;
  if (typeof module !== "undefined" && module.exports) module.exports = exported;
})(typeof window !== "undefined" ? window : globalThis);
