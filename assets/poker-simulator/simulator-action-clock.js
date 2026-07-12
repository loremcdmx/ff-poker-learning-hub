(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => null;
    const getTableGrid = typeof options.getTableGrid === "function" ? options.getTableGrid : () => null;
    const getTable = typeof options.getTable === "function" ? options.getTable : () => null;
    const canHeroAct = typeof options.canHeroAct === "function" ? options.canHeroAct : () => false;
    const isPaused = typeof options.isPaused === "function" ? options.isPaused : () => false;
    const sanitizeInteger = typeof options.sanitizeInteger === "function" ? options.sanitizeInteger : fallbackSanitizeInteger;
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : fallbackEscapeHtml;
    const handleHeroAction = typeof options.handleHeroAction === "function" ? options.handleHeroAction : () => {};
    const addPerfCount = typeof options.addPerfCount === "function" ? options.addPerfCount : () => {};
    const windowRef = options.windowRef || root;

    // Visual urgency thresholds as fractions of the remaining timebank.
    const CLOCK_DANGER_THRESHOLD = 0.18; // <=18% remaining -> red/danger
    const CLOCK_WARNING_THRESHOLD = 0.4; // <=40% remaining -> amber/warning

    function currentState() {
      return getState() || null;
    }

    // Server-driven multiplayer (?room): the authoritative server owns the
    // action clock, so the LOCAL timebank timer must be inert. Without this
    // guard a render-armed timer expiring between server views calls
    // handleHeroAction(fold|check), which in server mode POSTs an authoritative
    // fold/check — auto-folding the human on top of the server's own timeout.
    // Inert (false) in normal single-player play, so timer behavior there is
    // byte-for-byte unchanged.
    function isServerMode() {
      return Boolean(currentState()?.serverMode);
    }

    function isServerTable(table) {
      return Boolean(table?.serverMode || isServerMode());
    }

    function decisionTimebankSeconds() {
      const state = currentState();
      return sanitizeInteger(state?.settings?.actionTimerSeconds, 0, 300, 20);
    }

    function decisionTimingKey(table) {
      if (!table) return "";
      return [
        table.handNo,
        table.street,
        table.board?.length || 0,
        table.currentBet || 0,
        table.toCall || 0,
        table.actionSeq || 0,
        table.heroTurn ? 1 : 0
      ].join(":");
    }

    function prepareDecisionTimer(table) {
      if (!table || !canHeroAct(table)) return;
      const key = decisionTimingKey(table);
      if (table.decisionTimingKey === key && Number(table.decisionStartedAt || 0) > 0) return;
      table.decisionTimingKey = key;
      table.decisionStartedAt = Date.now();
    }

    function clearDecisionTimer(tableOrId) {
      const tableId = Number(typeof tableOrId === "object" ? tableOrId?.id : tableOrId);
      if (!Number.isFinite(tableId)) return;
      const table = getTable(tableId);
      if (!table) return;
      table.decisionTimingKey = "";
      table.decisionStartedAt = 0;
    }

    function captureDecisionTiming(table, endedAt = Date.now()) {
      if (!table) return null;
      const startedAt = Number(table.decisionStartedAt || table.actionClockStartedAt || 0);
      const safeEndedAt = Number.isFinite(Number(endedAt)) ? Number(endedAt) : Date.now();
      const safeStartedAt = Number.isFinite(startedAt) && startedAt > 0 ? startedAt : safeEndedAt;
      return {
        key: table.decisionTimingKey || decisionTimingKey(table),
        startedAt: safeStartedAt,
        endedAt: safeEndedAt,
        elapsedMs: Math.max(0, Math.round(safeEndedAt - safeStartedAt))
      };
    }

    function actionClockKey(table, seconds = decisionTimebankSeconds()) {
      if (!table) return "";
      return [
        table.handNo,
        table.street,
        table.board?.length || 0,
        table.currentBet || 0,
        table.toCall || 0,
        table.actionSeq || 0,
        table.heroTurn ? 1 : 0,
        seconds
      ].join(":");
    }

    function clearActionClock(tableOrId) {
      const state = currentState();
      if (!state) return;
      const tableId = Number(typeof tableOrId === "object" ? tableOrId?.id : tableOrId);
      if (!Number.isFinite(tableId)) return;
      const timer = state.actionClockTimers.get(tableId);
      if (timer) windowRef.clearTimeout(timer);
      state.actionClockTimers.delete(tableId);
      const table = getTable(tableId);
      if (table) {
        table.actionClockKey = "";
        table.actionClockStartedAt = 0;
        table.actionClockDueAt = 0;
        table.actionClockSeconds = 0;
        delete table.actionClockPausedRemainingMs;
      }
    }

    function clearAllActionClocks(tables = currentState()?.tables) {
      (tables || []).forEach((table) => clearActionClock(table?.id ?? table));
    }

    function pauseActionClocks(now = Date.now()) {
      const state = currentState();
      if (!state) return;
      state.tables.forEach((table) => {
        if (!table || !table.actionClockKey) return;
        table.actionClockPausedRemainingMs = Math.max(0, Number(table.actionClockDueAt || 0) - now);
        const timer = state.actionClockTimers.get(Number(table.id));
        if (timer) windowRef.clearTimeout(timer);
        state.actionClockTimers.delete(Number(table.id));
      });
    }

    function resumeActionClocks(now = Date.now(), pausedForMs = 0) {
      const state = currentState();
      if (!state) return;
      // Server mode owns the clock: never re-arm local timers on resume.
      if (isServerMode()) return;
      state.tables.forEach((table) => {
        if (table && Number(table.decisionStartedAt || 0) > 0 && pausedForMs > 0) {
          table.decisionStartedAt += pausedForMs;
        }
        if (!table || !table.actionClockKey) return;
        const remaining = Math.max(0, Number(table.actionClockPausedRemainingMs ?? actionClockRemainingMs(table)));
        delete table.actionClockPausedRemainingMs;
        if (!canHeroAct(table) || !decisionTimebankSeconds()) {
          clearActionClock(table.id);
          return;
        }
        const key = table.actionClockKey;
        const total = Math.max(1, Number(table.actionClockSeconds || decisionTimebankSeconds() || 1) * 1000);
        table.actionClockStartedAt = now - Math.max(0, total - remaining);
        table.actionClockDueAt = now + remaining;
        const timer = windowRef.setTimeout(() => expireActionClock(table.id, key), remaining);
        state.actionClockTimers.set(Number(table.id), timer);
      });
    }

    function prepareActionClock(table) {
      const state = currentState();
      if (!state || isPaused()) return;
      // In server mode never arm a local timer; clear any clock a prior local
      // render left behind so it can't fire against the authoritative server.
      if (isServerMode()) {
        clearActionClock(table?.id);
        return;
      }
      if (!table || !canHeroAct(table)) {
        clearDecisionTimer(table?.id);
        clearActionClock(table?.id);
        return;
      }
      prepareDecisionTimer(table);
      const seconds = decisionTimebankSeconds();
      if (!seconds) {
        clearActionClock(table.id);
        return;
      }
      const key = actionClockKey(table, seconds);
      if (table.actionClockKey === key && Number(table.actionClockDueAt || 0) > Date.now()) return;
      clearActionClock(table.id);
      const now = Date.now();
      table.actionClockKey = key;
      table.actionClockStartedAt = now;
      table.actionClockDueAt = now + seconds * 1000;
      table.actionClockSeconds = seconds;
      const timer = windowRef.setTimeout(() => expireActionClock(table.id, key), seconds * 1000);
      state.actionClockTimers.set(Number(table.id), timer);
    }

    function prepareActionClocks() {
      const state = currentState();
      if (!state) return;
      state.tables.forEach(prepareActionClock);
      const liveIds = new Set(state.tables.map((table) => Number(table.id)));
      Array.from(state.actionClockTimers.keys())
        .filter((tableId) => !liveIds.has(Number(tableId)))
        .forEach(clearActionClock);
    }

    function expireActionClock(tableId, key) {
      // Defense in depth: even if a timer was somehow armed before serverMode
      // flipped on, never drive a hero action against the authoritative server.
      if (isServerMode()) return;
      const table = getTable(tableId);
      if (isPaused() || !table || table.actionClockKey !== key || !canHeroAct(table) || !decisionTimebankSeconds()) return;
      handleHeroAction(table, actionClockTimeoutAction(table), undefined, { source: "action-timer" });
    }

    function actionClockTimeoutAction(table) {
      if (Number(table.toCall || 0) <= 0 && (String(table.street || "preflop") !== "preflop" || table.canCheck)) return "check";
      return "fold";
    }

    function postflopCheckIsAvailable(table) {
      if (!table || String(table.street || "preflop") === "preflop") return false;
      return Number(table.toCall || 0) <= 0;
    }

    function serverActionClockRemainingMs(table) {
      if (!table) return 0;
      const remaining = Number(table.serverActionRemainingMs);
      if (!Number.isFinite(remaining)) return 0;
      const anchor = Number(table.serverActionClockAnchorMs);
      const elapsed = Number.isFinite(anchor) && anchor > 0 ? Date.now() - anchor : 0;
      return Math.max(0, remaining - Math.max(0, elapsed));
    }

    function serverActionClockTotalMs(table) {
      const timeout = Number(table?.serverActionTimeoutMs);
      if (Number.isFinite(timeout)) return Math.max(0, timeout);
      const remaining = Number(table?.serverActionRemainingMs);
      if (Number.isFinite(remaining) && remaining > 0) return Math.max(1, remaining);
      return 0;
    }

    function actionClockRenderable(table) {
      if (!table || !canHeroAct(table)) return false;
      if (isServerTable(table)) {
        return Number.isFinite(Number(table.serverActionRemainingMs)) && serverActionClockTotalMs(table) > 0;
      }
      return Boolean(decisionTimebankSeconds());
    }

    function actionClockRemainingMs(table) {
      if (isServerTable(table)) return serverActionClockRemainingMs(table);
      if (isPaused() && Number.isFinite(Number(table?.actionClockPausedRemainingMs))) {
        return Math.max(0, Number(table.actionClockPausedRemainingMs || 0));
      }
      if (!table || !table.actionClockDueAt) return decisionTimebankSeconds() * 1000;
      return Math.max(0, Number(table.actionClockDueAt || 0) - Date.now());
    }

    function actionClockLiveSeconds(table) {
      return Math.max(0, Math.ceil(actionClockRemainingMs(table) / 1000));
    }

    function actionClockProgress(table) {
      return Math.max(0, Math.min(1, actionClockRemainingMs(table) / actionClockTotalMs(table)));
    }

    function actionClockTotalMs(table) {
      if (isServerTable(table)) return serverActionClockTotalMs(table);
      return Math.max(1, Number(table?.actionClockSeconds || decisionTimebankSeconds() || 1) * 1000);
    }

    function actionClockStyle(table) {
      const totalMs = actionClockTotalMs(table);
      const remainingMs = Math.max(0, Math.round(actionClockRemainingMs(table)));
      const elapsedMs = Math.max(0, totalMs - remainingMs);
      return `--clock-duration:${totalMs}ms; --clock-delay:-${elapsedMs}ms;`;
    }

    function actionClockLabel(table) {
      if (isPaused()) return "Пауза";
      const seconds = actionClockLiveSeconds(table);
      return `TB ${seconds}s`;
    }

    function actionClockStateClass(table) {
      const progress = actionClockProgress(table);
      if (progress <= CLOCK_DANGER_THRESHOLD) return "is-danger";
      if (progress <= CLOCK_WARNING_THRESHOLD) return "is-warning";
      return "is-live";
    }

    function renderActionClock(table, className = "action-clock") {
      if (!actionClockRenderable(table)) return "";
      const stateClass = actionClockStateClass(table);
      return `
        <span class="${escapeHtml(`${className} ${stateClass}`)}" data-action-clock data-action-clock-table-id="${table.id}" role="timer" aria-label="${escapeHtml(actionClockLabel(table))}" style="${actionClockStyle(table)}">
          <span data-action-clock-label>${escapeHtml(actionClockLabel(table))}</span>
        </span>
      `;
    }

    function renderHeroTimebank(table) {
      if (!actionClockRenderable(table)) return "";
      const stateClass = actionClockStateClass(table);
      return `
        <div class="hero-timebank ${escapeHtml(stateClass)}" data-action-clock data-action-clock-table-id="${table.id}" role="timer" aria-label="${escapeHtml(actionClockLabel(table))}" style="${actionClockStyle(table)}">
          <span class="hero-timebank-copy">TIMEBANK</span>
          <span class="hero-timebank-track" aria-hidden="true"><i></i></span>
          <strong data-action-clock-label>${escapeHtml(actionClockLabel(table))}</strong>
        </div>
      `;
    }

    function startActionClockTicker() {
      const state = currentState();
      if (!state || state.actionClockTicker) return;
      state.actionClockTicker = windowRef.setInterval(updateActionClocks, 1000);
    }

    function stopActionClockTicker() {
      const state = currentState();
      if (!state?.actionClockTicker) return;
      windowRef.clearInterval(state.actionClockTicker);
      state.actionClockTicker = null;
    }

    function updateActionClocks(source = "ticker") {
      if (source === "sync") addPerfCount("actionClockSyncPasses");
      else addPerfCount("actionClockTicks");
      if (isPaused()) {
        stopActionClockTicker();
        return;
      }
      const tableGrid = getTableGrid();
      if (!tableGrid) {
        stopActionClockTicker();
        return;
      }
      const nodes = tableGrid.querySelectorAll("[data-action-clock]");
      addPerfCount("actionClockScannedNodes", nodes.length);
      if (!nodes.length) {
        stopActionClockTicker();
        return;
      }
      nodes.forEach((node) => {
        const tableId = Number(node.dataset.actionClockTableId || node.closest("[data-table-id]")?.dataset.tableId || 0);
        const table = getTable(tableId);
        if (!actionClockRenderable(table)) return;
        const label = actionClockLabel(table);
        const progress = actionClockProgress(table);
        const labelNode = node.querySelector("[data-action-clock-label]") || node;
        if (labelNode.textContent !== label) {
          addPerfCount("actionClockLabelUpdates");
          labelNode.textContent = label;
        }
        if (node.getAttribute("aria-label") !== label) node.setAttribute("aria-label", label);
        node.classList.toggle("is-live", progress > CLOCK_WARNING_THRESHOLD);
        node.classList.toggle("is-warning", progress <= CLOCK_WARNING_THRESHOLD && progress > CLOCK_DANGER_THRESHOLD);
        node.classList.toggle("is-danger", progress <= CLOCK_DANGER_THRESHOLD);
      });
    }

    function syncActionClockTicker() {
      if (isPaused()) {
        stopActionClockTicker();
        return;
      }
      const tableGrid = getTableGrid();
      const hasClock = Boolean(tableGrid?.querySelector("[data-action-clock]"));
      if (hasClock) startActionClockTicker();
      else stopActionClockTicker();
    }

    return {
      decisionTimebankSeconds,
      decisionTimingKey,
      prepareDecisionTimer,
      clearDecisionTimer,
      captureDecisionTiming,
      actionClockKey,
      clearActionClock,
      clearAllActionClocks,
      pauseActionClocks,
      resumeActionClocks,
      prepareActionClock,
      prepareActionClocks,
      expireActionClock,
      actionClockTimeoutAction,
      postflopCheckIsAvailable,
      actionClockRemainingMs,
      actionClockLiveSeconds,
      actionClockProgress,
      actionClockTotalMs,
      actionClockStyle,
      actionClockLabel,
      actionClockStateClass,
      renderActionClock,
      renderHeroTimebank,
      startActionClockTicker,
      stopActionClockTicker,
      updateActionClocks,
      syncActionClockTicker
    };
  }

  function fallbackSanitizeInteger(value, min, max, fallback) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function fallbackEscapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  root.PokerSimulatorActionClock = { model };
})();
