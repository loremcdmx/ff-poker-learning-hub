(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  // Default cap on retained in-memory fold-any audit-trail events when the host
  // does not override foldAnyEventLimit.
  const DEFAULT_FOLD_ANY_EVENT_LIMIT = 2000;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => null;
    const heroSeat = typeof options.heroSeat === "function" ? options.heroSeat : () => null;
    const sanitizeFoldAnyEvent = typeof options.sanitizeFoldAnyEvent === "function" ? options.sanitizeFoldAnyEvent : (event) => event;
    const settingsLogSnapshot = typeof options.settingsLogSnapshot === "function" ? options.settingsLogSnapshot : () => ({});
    const isActionRevealLocked = typeof options.isActionRevealLocked === "function" ? options.isActionRevealLocked : () => false;
    const actionRevealText = typeof options.actionRevealText === "function" ? options.actionRevealText : () => "";
    const saveSessionData = typeof options.saveSessionData === "function" ? options.saveSessionData : () => {};
    const markTableDirty = typeof options.markTableDirty === "function" ? options.markTableDirty : () => {};
    const render = typeof options.render === "function" ? options.render : () => {};
    const dealAnimationActive = typeof options.dealAnimationActive === "function" ? options.dealAnimationActive : () => false;
    const canHeroAct = typeof options.canHeroAct === "function" ? options.canHeroAct : () => false;
    const handleHeroAction = typeof options.handleHeroAction === "function" ? options.handleHeroAction : () => {};
    const foldAnyEventLimit = Math.max(1, Number(options.foldAnyEventLimit || DEFAULT_FOLD_ANY_EVENT_LIMIT));

    // Monotonic per-model counter so two re-arms in the same millisecond produce
    // distinct event ids. Without it, identical Date.now() values collide and the
    // dedup filter drops the earlier event from the audit trail.
    let eventSeq = 0;

    function currentState() {
      return getState() || {};
    }

    // Server-driven multiplayer (?room): the authoritative server owns the
    // hand, so an armed "fold to any" must NOT auto-fire locally — that would
    // POST an authoritative fold for the human. Inert (false) in single-player.
    function isServerMode() {
      return Boolean(currentState().serverMode);
    }

    function sessionId() {
      return String(currentState().sessionId || options.sessionId || "");
    }

    function eventId(table, phase) {
      // now-contract allowlist: this Date.now() is a PERSISTENCE/audit timestamp,
      // not a decorative-timeline anchor. It stamps a unique id for the fold-any
      // audit trail (paired with the new Date().toISOString() `at` field) and
      // never feeds an animation deadline/elapsed computation, so it must read
      // real wall-clock. See simulator-visual-now-contract-smoke.mjs allowlist.
      return `${sessionId()}:${table?.handNo || 0}:${table?.id || 0}:fold-any:${phase}:${Date.now()}:${++eventSeq}`;
    }

    function foldAnyWaitingState(table) {
      if (!table) return "";
      if (table.busy) return "bot-thinking";
      if (isActionRevealLocked(table)) return "action-reveal";
      if (table.heroTurn) return "hero-locked";
      return "before-hero-turn";
    }

    function foldAnySituation(table, phase = "queued") {
      const hero = heroSeat(table);
      return sanitizeFoldAnyEvent({
        id: eventId(table, phase),
        sessionId: sessionId(),
        phase,
        at: new Date().toISOString(),
        handNo: table?.handNo || 0,
        tableId: table?.id || 0,
        street: table?.street || "",
        heroPosition: hero?.position || table?.spot?.heroPosition || "",
        combo: table?.combo || "",
        heroHand: Array.isArray(hero?.cards) ? hero.cards.slice(0, 2) : [],
        board: Array.isArray(table?.board) ? table.board.slice(0, 5) : [],
        pot: table?.pot,
        toCall: table?.toCall,
        stack: hero?.stack,
        canCheck: table?.canCheck,
        minRaiseTo: table?.minRaiseTo,
        lastAction: table?.lastAction || "",
        waitingState: foldAnyWaitingState(table),
        actionTrail: actionRevealText(table),
        settings: settingsLogSnapshot()
      });
    }

    function recordFoldAnyEvent(table, phase = "queued", context = null) {
      const state = currentState();
      const base = context || foldAnySituation(table, phase);
      const event = sanitizeFoldAnyEvent({ ...base, id: eventId(table, phase), phase, at: new Date().toISOString() });
      if (!event) return null;
      const currentEvents = Array.isArray(state.foldAnyEvents) ? state.foldAnyEvents : [];
      state.foldAnyEvents = [
        event,
        ...currentEvents.filter((item) => item.id !== event.id)
      ].slice(0, foldAnyEventLimit);
      saveSessionData();
      return event;
    }

    function clearFoldAnyQueue(table) {
      if (!table) return;
      table.foldAnyQueued = false;
      table.foldAnyContext = null;
      table.heroBetDraft = null;
    }

    function canQueueFoldAny(table) {
      const hero = heroSeat(table);
      return Boolean(
        table
        && table.status === "playing"
        && !table.busy
        && !dealAnimationActive(table)
        && !canHeroAct(table)
        && hero
        && !hero.folded
        && Number(hero.stack || 0) > 0
      );
    }

    function setFoldAnyQueue(table, checked) {
      if (!table || table.status !== "playing") return false;
      if (!checked) {
        if (table.foldAnyQueued) recordFoldAnyEvent(table, "canceled", table.foldAnyContext || foldAnySituation(table, "canceled"));
        clearFoldAnyQueue(table);
        markTableDirty(table.id);
        render("fold-any-canceled");
        return false;
      }
      const context = foldAnySituation(table, "queued");
      table.foldAnyQueued = true;
      table.foldAnyContext = context;
      recordFoldAnyEvent(table, "queued", context);
      if (applyFoldAnyIfReady(table)) return true;
      markTableDirty(table.id);
      render("fold-any-queued");
      return true;
    }

    function applyFoldAnyIfReady(table) {
      if (!table?.foldAnyQueued || !canHeroAct(table)) return false;
      // Never auto-fire the queued fold in server mode (server owns the hand).
      if (isServerMode()) return false;
      // Capture the situation at COMMIT time: when the fold actually fires the
      // live table carries the board/pot/toCall/street the player is folding
      // INTO, which can differ from the queued snapshot (the bot acted, the
      // street advanced). Reusing table.foldAnyContext recorded the stale
      // queued-time state for the audit event and per-decision record. The
      // original queued snapshot is still preserved as the "queued" event;
      // carry over the queued metadata so the trigger links back to its arm.
      const queued = table.foldAnyContext || null;
      const context = {
        ...foldAnySituation(table, "triggered"),
        phase: "triggered",
        queuedAt: queued?.at || "",
        queuedStreet: queued?.street || "",
        queuedId: queued?.id || ""
      };
      recordFoldAnyEvent(table, "triggered", context);
      clearFoldAnyQueue(table);
      handleHeroAction(table, "fold", undefined, { source: "fold-any", foldAnyContext: context });
      return true;
    }

    return {
      foldAnyWaitingState,
      foldAnySituation,
      recordFoldAnyEvent,
      clearFoldAnyQueue,
      canQueueFoldAny,
      setFoldAnyQueue,
      applyFoldAnyIfReady
    };
  }

  root.PokerSimulatorFoldAny = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
