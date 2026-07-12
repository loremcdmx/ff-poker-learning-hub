(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const engine = options.engine || {};
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const saveSessionData = typeof options.saveSessionData === "function" ? options.saveSessionData : () => {};
    const captureDecisionTiming = typeof options.captureDecisionTiming === "function"
      ? options.captureDecisionTiming
      : () => null;
    const needsBetAmount = typeof options.needsBetAmount === "function" ? options.needsBetAmount : () => false;
    const finiteNumber = typeof options.finiteNumber === "function"
      ? options.finiteNumber
      : (value, fallback = 0) => {
          const number = Number(value);
          return Number.isFinite(number) ? number : fallback;
        };
    const sanitizeFoldAnyEvent = typeof options.sanitizeFoldAnyEvent === "function"
      ? options.sanitizeFoldAnyEvent
      : () => null;
    const effectiveHeroCallAmount = typeof options.effectiveHeroCallAmount === "function"
      ? options.effectiveHeroCallAmount
      : () => 0;
    const betBounds = typeof options.betBounds === "function" ? options.betBounds : () => ({ value: 0, min: 0 });
    const formatPostflopSizing = typeof options.formatPostflopSizing === "function"
      ? options.formatPostflopSizing
      : (_table, amount) => String(amount);
    const formatAmount = typeof options.formatAmount === "function" ? options.formatAmount : (amount) => String(amount);
    const decisionTimebankSeconds = typeof options.decisionTimebankSeconds === "function"
      ? options.decisionTimebankSeconds
      : () => 0;
    // Keep the live decisions array in step with the persistence/restore cap
    // (LIMITS.sessionDecision, plumbed via app-foundation sessionDecisionLimit).
    // Without this the array was hard-capped at 120, so restored sessions
    // silently dropped decisions 121+ on the first hero action.
    const sessionDecisionLimit = Math.max(1, Number(options.sessionDecisionLimit) || 2000);

    function state() {
      return getState() || {};
    }

    function actionIntent(action) {
      if (action === "fold") return "fold";
      if (action === "call" || action === "check") return "passive";
      return "aggressive";
    }

    function actionLabel(action, table, amount) {
      const bounds = betBounds(table) || {};
      const sizedAmount = Number.isFinite(Number(amount)) ? Number(amount) : bounds.value;
      const sizedLabel = table?.street !== "preflop"
        ? formatPostflopSizing(table, sizedAmount)
        : formatAmount(sizedAmount);
      const labels = {
        fold: "Fold",
        call: `Call ${formatAmount(effectiveHeroCallAmount(table))}`,
        check: "Check",
        open: `Raise to ${formatAmount(2.2)}`,
        "raise-half": table?.street === "preflop" ? `Raise to ${formatAmount(3)}` : "Raise 1/2",
        "raise-custom": `Raise to ${sizedLabel}`,
        "bet-third": "Bet 1/3",
        "bet-half": "Bet 1/2",
        "bet-pot": "Pot",
        "bet-custom": `Bet ${sizedLabel}`,
        allin: "All-in"
      };
      return labels[action] || action;
    }

    function feedbackForDecision(table, action, amount) {
      const current = state();
      return typeof engine.gradeHeroDecision === "function"
        ? engine.gradeHeroDecision(table, action, amount, current.settings)
        : { grade: "neutral", label: "", detail: "" };
    }

    function buildHeroDecisionEntry(table, action, amount, meta = {}) {
      const current = state();
      if (!table || table.status !== "playing") return null;
      const decisionTiming = meta.decisionTiming || captureDecisionTiming(table);
      const feedback = meta.deferFeedback
        ? { grade: "pending", label: "", detail: "", score: 0, category: "" }
        : feedbackForDecision(table, action, amount);
      return {
        no: table.handNo,
        tableId: table.id,
        pack: current.settings?.pack,
        spot: table.spot.title,
        street: typeof engine.streetLabel === "function" ? engine.streetLabel(table.street) : String(table.street || ""),
        combo: table.combo,
        action,
        amount: needsBetAmount(action) ? finiteNumber(amount, 0) : null,
        label: actionLabel(action, table, amount),
        intent: actionIntent(action),
        source: meta.source || "manual",
        decisionMs: decisionTiming?.elapsedMs ?? 0,
        decisionStartedAt: decisionTiming?.startedAt ? new Date(decisionTiming.startedAt).toISOString() : "",
        decisionEndedAt: decisionTiming?.endedAt ? new Date(decisionTiming.endedAt).toISOString() : "",
        timebankSeconds: Number(table.actionClockSeconds || decisionTimebankSeconds() || 0),
        foldAny: meta.foldAnyContext ? sanitizeFoldAnyEvent(meta.foldAnyContext) : null,
        feedback,
        deferredFeedback: Boolean(meta.deferFeedback),
        pot: table.pot,
        toCall: table.toCall,
        board: [...table.board]
      };
    }

    function resolveHeroDecisionFeedback(entry, table, action = entry?.action, amount = entry?.amount) {
      if (!entry) return null;
      entry.feedback = feedbackForDecision(table, action, amount);
      entry.deferredFeedback = false;
      return entry;
    }

    function recordHeroDecisionEntry(entry, options = {}) {
      const current = state();
      if (!entry) return null;
      const decisions = Array.isArray(current.decisions) ? current.decisions : [];
      current.decisions = [entry, ...decisions].slice(0, sessionDecisionLimit);
      if (current.sessionStatsCache && typeof current.sessionStatsCache === "object") {
        current.sessionStatsCache.decisionKey = "";
      }
      if (options.persist !== false) saveSessionData();
      return entry;
    }

    return {
      actionIntent,
      actionLabel,
      buildHeroDecisionEntry,
      resolveHeroDecisionFeedback,
      recordHeroDecisionEntry
    };
  }

  root.PokerSimulatorDecisionLog = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
