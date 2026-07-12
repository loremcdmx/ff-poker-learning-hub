(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  // Minimum settle grace (ms) applied when a mid-flight auto-deal countdown
  // elapsed while paused, so resuming doesn't snap straight into the next hand.
  const RESUME_SETTLE_GRACE_MS = 250;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => null;
    const getTableGrid = typeof options.getTableGrid === "function" ? options.getTableGrid : () => null;
    const getTable = typeof options.getTable === "function" ? options.getTable : () => null;
    const replaceTable = typeof options.replaceTable === "function" ? options.replaceTable : () => {};
    const heroBusted = typeof options.heroBusted === "function" ? options.heroBusted : () => false;
    const tableUsesTournamentMode = typeof options.tableUsesTournamentMode === "function" ? options.tableUsesTournamentMode : () => false;
    const isPaused = typeof options.isPaused === "function" ? options.isPaused : () => false;
    const isActionSequenceActive = typeof options.isActionSequenceActive === "function" ? options.isActionSequenceActive : () => false;
    const actionRevealDuration = typeof options.actionRevealDuration === "function" ? options.actionRevealDuration : () => 0;
    const showdownAutoDealHoldMs = typeof options.showdownAutoDealHoldMs === "function" ? options.showdownAutoDealHoldMs : () => 0;
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : fallbackEscapeHtml;
    const addPerfCount = typeof options.addPerfCount === "function" ? options.addPerfCount : () => {};
    const defaultDelayMs = Math.max(0, Number(options.defaultAutoDealDelayMs || 0));
    const turboDelayMs = Math.max(0, Number(options.turboAutoDealDelayMs || defaultDelayMs));
    const windowRef = options.windowRef || root;

    function currentState() {
      return getState() || null;
    }

    function settings() {
      return currentState()?.settings || {};
    }

    function bustStopsAutoDeal(table) {
      return heroBusted(table) && !settings().continueAfterBust;
    }

    // Server-driven multiplayer (?room): the authoritative server (host) owns
    // hand progression, so the local auto-deal must NOT deal a LOCAL hand via
    // replaceTable. Inert (false) in normal single-player play.
    function isServerMode() {
      return Boolean(currentState()?.serverMode);
    }

    function clearAutoDealQueue(table) {
      if (!table) return;
      if (table.autoDealTimer) windowRef.clearTimeout(table.autoDealTimer);
      table.autoQueued = false;
      table.autoDealTimer = null;
      table.autoDealDelayMs = 0;
      table.autoDealStartedAt = 0;
      table.autoDealDueAt = 0;
      delete table.autoDealPausedRemainingMs;
    }

    function clearAllAutoDealQueues(tables = currentState()?.tables) {
      (tables || []).forEach(clearAutoDealQueue);
    }

    function scheduleAutoDealForTable(table, delay) {
      if (!table) return;
      const safeDelay = Math.max(0, Math.round(Number(delay || 0)));
      if (table.autoDealTimer) windowRef.clearTimeout(table.autoDealTimer);
      table.autoDealTimer = windowRef.setTimeout(() => {
        const currentTable = getTable(table.id);
        if (
          !currentTable
          || currentTable.handNo !== table.handNo
          || currentTable.status === "playing"
          || settings().trainingMode
          || settings().manualNextHand
          || currentTable.tournamentComplete
          || bustStopsAutoDeal(currentTable)
          || isPaused()
          // Server owns dealing in ?room mode; never deal a local hand.
          || isServerMode()
        ) return;
        replaceTable(currentTable.id);
      }, safeDelay);
    }

    function pauseAutoDealQueues(now = Date.now(), tables = currentState()?.tables) {
      (tables || []).forEach((table) => {
        if (!table || !table.autoQueued) return;
        table.autoDealPausedRemainingMs = Math.max(0, Number(table.autoDealDueAt || 0) - now);
        if (table.autoDealTimer) windowRef.clearTimeout(table.autoDealTimer);
        table.autoDealTimer = null;
      });
    }

    function resumeAutoDealQueues(now = Date.now(), tables = currentState()?.tables) {
      (tables || []).forEach((table) => {
        if (!table || table.status === "playing" || settings().trainingMode || settings().manualNextHand || table.tournamentComplete || bustStopsAutoDeal(table)) {
          clearAutoDealQueue(table);
          return;
        }
        if (!table.autoQueued) {
          queueNextHandIfNeeded(table, { force: true });
          return;
        }
        // If the countdown deadline elapsed while paused, the remaining clamps to
        // 0 and the hand would deal instantly on resume. Floor a genuinely
        // mid-flight countdown at a small settle grace so the table doesn't snap
        // straight into the next hand the instant the user unpauses.
        const wasMidCountdown = Object.prototype.hasOwnProperty.call(table, "autoDealPausedRemainingMs");
        const rawRemaining = Math.max(0, Number(table.autoDealPausedRemainingMs || 0));
        const remaining = wasMidCountdown && rawRemaining <= 0
          ? RESUME_SETTLE_GRACE_MS
          : rawRemaining;
        const total = Math.max(remaining, Number(table.autoDealDelayMs || 0) || autoDealDelayMs());
        delete table.autoDealPausedRemainingMs;
        table.autoDealStartedAt = now - Math.max(0, total - remaining);
        table.autoDealDueAt = now + remaining;
        scheduleAutoDealForTable(table, remaining);
      });
    }

    function queueNextHandIfNeeded(table, options = {}) {
      if (!table || table.status === "playing" || settings().trainingMode || settings().manualNextHand) return;
      if (table.tournamentComplete) {
        clearAutoDealQueue(table);
        return;
      }
      if (bustStopsAutoDeal(table)) {
        clearAutoDealQueue(table);
        return;
      }
      if (table.autoQueued) {
        if (!options.force) return;
        clearAutoDealQueue(table);
      }
      if (isPaused()) return;
      const visualDelay = Math.max(
        isActionSequenceActive(table) ? actionRevealDuration(table) : 0,
        showdownAutoDealHoldMs(table)
      );
      const delay = visualDelay + autoDealDelayMs() + autoDealStaggerMs(table);
      const now = Date.now();
      table.autoQueued = true;
      table.autoDealDelayMs = delay;
      table.autoDealStartedAt = now;
      table.autoDealDueAt = now + delay;
      scheduleAutoDealForTable(table, delay);
    }

    function autoDealStaggerMs(table) {
      const tableCount = Number(settings().tableCount || 1);
      if (tableCount < 2) return 0;
      const index = Math.max(0, Number(table?.id || 1) - 1);
      const step = tableCount >= 4 ? 170 : 220;
      return index * step;
    }

    function autoDealDelayMs() {
      return settings().turboMode ? turboDelayMs : defaultDelayMs;
    }

    function autoDealRemainingMs(table) {
      if (!table || settings().trainingMode || settings().manualNextHand) return 0;
      if (isPaused() && Number.isFinite(Number(table.autoDealPausedRemainingMs))) {
        return Math.max(0, Number(table.autoDealPausedRemainingMs || 0));
      }
      const dueAt = Number(table.autoDealDueAt || 0);
      if (dueAt > 0) return Math.max(0, dueAt - Date.now());
      return autoDealDelayMs();
    }

    function autoDealModeLabel() {
      return settings().turboMode ? "Турбо" : "Авто";
    }

    function autoDealStableSeconds(table) {
      if (isPaused() && Number.isFinite(Number(table?.autoDealPausedRemainingMs))) {
        return Math.max(1, Math.ceil(Number(table.autoDealPausedRemainingMs || 0) / 1000));
      }
      const delay = Math.max(0, Number(table?.autoDealDelayMs || 0)) || autoDealDelayMs();
      return Math.max(1, Math.ceil(delay / 1000));
    }

    function autoDealLiveSeconds(table) {
      return Math.max(1, Math.ceil(autoDealRemainingMs(table) / 1000));
    }

    function autoDealLabel(table, options = {}) {
      if (bustStopsAutoDeal(table)) return tableUsesTournamentMode(table) ? "Турнир закончен" : "Стек закончился";
      if (isPaused()) return "Пауза";
      const seconds = options.live ? autoDealLiveSeconds(table) : autoDealStableSeconds(table);
      return `${autoDealModeLabel()}: новая через ${seconds}s`;
    }

    function renderAutoDealCountdown(table, className = "action-waiting") {
      return `<span class="${escapeHtml(className)}" data-auto-countdown data-auto-table-id="${table?.id || ""}"><span data-auto-countdown-label>${escapeHtml(autoDealLabel(table))}</span></span>`;
    }

    function startAutoDealCountdownTicker() {
      const state = currentState();
      if (!state || state.autoDealCountdownTimer) return;
      state.autoDealCountdownTimer = windowRef.setInterval(updateAutoDealCountdowns, 1000);
    }

    function stopAutoDealCountdownTicker() {
      const state = currentState();
      if (!state?.autoDealCountdownTimer) return;
      windowRef.clearInterval(state.autoDealCountdownTimer);
      state.autoDealCountdownTimer = null;
    }

    function updateAutoDealCountdowns() {
      addPerfCount("countdownTicks");
      if (isPaused()) {
        stopAutoDealCountdownTicker();
        return;
      }
      const tableGrid = getTableGrid();
      if (!tableGrid) {
        stopAutoDealCountdownTicker();
        return;
      }
      const countdownNodes = tableGrid.querySelectorAll("[data-auto-countdown]");
      addPerfCount("countdownScannedNodes", countdownNodes.length);
      if (!countdownNodes.length) {
        stopAutoDealCountdownTicker();
        return;
      }
      countdownNodes.forEach((node) => {
        const tableId = Number(node.dataset.autoTableId || node.closest("[data-table-id]")?.dataset.tableId || 0);
        const table = getTable(tableId);
        const labelNode = node.querySelector("[data-auto-countdown-label]") || node;
        if (!table || table.status === "playing" || settings().trainingMode || settings().manualNextHand) return;
        const label = autoDealLabel(table, { live: true });
        if (labelNode.textContent !== label) {
          addPerfCount("countdownLabelUpdates");
          labelNode.textContent = label;
        }
      });
    }

    function syncAutoDealCountdownTicker() {
      if (isPaused()) {
        stopAutoDealCountdownTicker();
        return;
      }
      const tableGrid = getTableGrid();
      const hasCountdown = Boolean(tableGrid?.querySelector("[data-auto-countdown]"));
      if (hasCountdown) startAutoDealCountdownTicker();
      else stopAutoDealCountdownTicker();
    }

    return {
      clearAutoDealQueue,
      clearAllAutoDealQueues,
      scheduleAutoDealForTable,
      pauseAutoDealQueues,
      resumeAutoDealQueues,
      queueNextHandIfNeeded,
      autoDealStaggerMs,
      autoDealDelayMs,
      autoDealRemainingMs,
      autoDealModeLabel,
      autoDealStableSeconds,
      autoDealLiveSeconds,
      autoDealLabel,
      renderAutoDealCountdown,
      startAutoDealCountdownTicker,
      stopAutoDealCountdownTicker,
      updateAutoDealCountdowns,
      syncAutoDealCountdownTicker
    };
  }

  function fallbackEscapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  root.PokerSimulatorAutoDeal = { model };
})();
