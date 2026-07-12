(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => null;
    const getTable = typeof options.getTable === "function" ? options.getTable : () => null;
    const isPaused = typeof options.isPaused === "function" ? options.isPaused : () => false;
    const heroIsAllIn = typeof options.heroIsAllIn === "function" ? options.heroIsAllIn : () => false;
    const runBotResponse = typeof options.runBotResponse === "function" ? options.runBotResponse : () => {};
    const windowRef = options.windowRef || root;

    function currentState() {
      return getState() || null;
    }

    function botResponseTimers() {
      const timers = currentState()?.botResponseTimers;
      return timers instanceof Map ? timers : null;
    }

    function clearBotResponseTimer(tableId) {
      const id = Number(tableId);
      if (!Number.isFinite(id)) return;
      const timers = botResponseTimers();
      if (!timers) return;
      const entry = timers.get(id);
      if (entry?.timer) windowRef.clearTimeout(entry.timer);
      timers.delete(id);
    }

    function clearAllBotResponseTimers() {
      const timers = botResponseTimers();
      if (!timers) return;
      Array.from(timers.keys()).forEach(clearBotResponseTimer);
    }

    function botResponseGuardForTable(table) {
      if (!table) return null;
      return {
        handNo: table.handNo,
        actionSeq: table.actionSeq || 0,
        street: table.street || "",
        boardLength: Array.isArray(table.board) ? table.board.length : 0,
        heroTurn: Boolean(table.heroTurn),
        busy: Boolean(table.busy),
        currentBet: Number(table.currentBet || 0),
        toCall: Number(table.toCall || 0)
      };
    }

    function botResponseGuardMatches(table, guard) {
      if (!guard) return true;
      return Boolean(
        table
        && table.handNo === guard.handNo
        && Number(table.actionSeq || 0) === Number(guard.actionSeq || 0)
        && String(table.street || "") === String(guard.street || "")
        && (Array.isArray(table.board) ? table.board.length : 0) === Number(guard.boardLength || 0)
        && Boolean(table.heroTurn) === Boolean(guard.heroTurn)
        && Boolean(table.busy) === Boolean(guard.busy)
        && Number(table.currentBet || 0) === Number(guard.currentBet || 0)
        && Number(table.toCall || 0) === Number(guard.toCall || 0)
      );
    }

    function pendingBotResponseForOutcome(table, outcome) {
      if (!table || !outcome?.needsBot) return null;
      const delay = Math.max(0, Math.round(Number(outcome.delay || 0)));
      const createdAt = Date.now();
      return {
        handNo: Number(table.handNo || 0),
        actionSeq: Number(table.actionSeq || 0),
        street: String(table.street || ""),
        heroAction: outcome.heroAction,
        heroAmount: Number(outcome.heroAmount || 0),
        createdAt,
        dueAt: createdAt + delay
      };
    }

    function pendingBotResponseStillCurrent(table, pending = table?.pendingBotResponse) {
      return Boolean(
        table
        && pending
        && table.status === "playing"
        && Number(table.handNo || 0) === Number(pending.handNo || 0)
        && Number(table.actionSeq || 0) === Number(pending.actionSeq || 0)
        && String(table.street || "") === String(pending.street || "")
        && !table.heroTurn
      );
    }

    function recoverPendingBotResponse(table) {
      const pending = table?.pendingBotResponse;
      if (!pendingBotResponseStillCurrent(table, pending)) return null;
      if (!table.busy && !heroIsAllIn(table)) return null;
      table.busy = true;
      return pending;
    }

    function botResponseTimerHasLiveCallback(tableId) {
      const entry = botResponseTimers()?.get(Number(tableId));
      if (!entry) return false;
      if (entry.timer) return true;
      return isPaused();
    }

    function pendingBotResponseDue(pending, now = Date.now()) {
      const dueAt = Number(pending?.dueAt || 0);
      if (dueAt > 0) return now >= dueAt;
      const createdAt = Number(pending?.createdAt || 0);
      return !createdAt || now - createdAt >= 250;
    }

    function repairPendingBotResponses() {
      if (isPaused()) return;
      const now = Date.now();
      currentState()?.tables?.forEach((table) => {
        if (!table?.pendingBotResponse) return;
        if (!pendingBotResponseStillCurrent(table)) {
          delete table.pendingBotResponse;
          return;
        }
        if (botResponseTimerHasLiveCallback(table.id)) return;
        if (!pendingBotResponseDue(table.pendingBotResponse, now)) return;
        const pending = recoverPendingBotResponse(table);
        if (!pending) return;
        scheduleBotResponse(table.id, pending.heroAction, pending.heroAmount, 0, botResponseGuardForTable(table));
      });
    }

    function canRunScheduledBotResponse(table) {
      return Boolean(table && table.status === "playing" && table.busy && !table.heroTurn);
    }

    function scheduleBotResponse(tableId, heroAction, heroAmount, delay = 0, guard = null) {
      const id = Number(tableId);
      if (!Number.isFinite(id)) return;
      const timers = botResponseTimers();
      if (!timers) return;
      clearBotResponseTimer(id);
      const safeDelay = Math.max(0, Math.round(Number(delay || 0)));
      const table = getTable(id);
      const entry = {
        tableId: id,
        heroAction,
        heroAmount,
        guard: guard || botResponseGuardForTable(table),
        dueAt: Date.now() + safeDelay,
        remainingMs: safeDelay,
        timer: null
      };
      entry.timer = windowRef.setTimeout(() => {
        timers.delete(id);
        if (isPaused()) {
          entry.timer = null;
          entry.remainingMs = 0;
          timers.set(id, entry);
          return;
        }
        runBotResponse(id, heroAction, heroAmount, entry.guard);
      }, safeDelay);
      timers.set(id, entry);
    }

    function pauseBotResponseTimers(now = Date.now()) {
      botResponseTimers()?.forEach((entry) => {
        if (entry.timer) windowRef.clearTimeout(entry.timer);
        entry.remainingMs = Math.max(0, Number(entry.dueAt || now) - now);
        entry.timer = null;
      });
    }

    function resumeBotResponseTimers(now = Date.now()) {
      const entries = Array.from(botResponseTimers()?.values() || []);
      entries.forEach((entry) => {
        const delay = Math.max(0, Number(entry.remainingMs || 0));
        scheduleBotResponse(entry.tableId, entry.heroAction, entry.heroAmount, delay, entry.guard);
      });
    }

    return {
      clearBotResponseTimer,
      clearAllBotResponseTimers,
      botResponseGuardForTable,
      botResponseGuardMatches,
      pendingBotResponseForOutcome,
      pendingBotResponseStillCurrent,
      recoverPendingBotResponse,
      botResponseTimerHasLiveCallback,
      pendingBotResponseDue,
      repairPendingBotResponses,
      canRunScheduledBotResponse,
      scheduleBotResponse,
      pauseBotResponseTimers,
      resumeBotResponseTimers
    };
  }

  root.PokerSimulatorBotResponse = {
    model
  };
})();
