(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  // Max number of interrupted-hand restore markers retained in state.restoreInterruptedHands.
  const MAX_INTERRUPTED_HAND_HISTORY = 20;

  function assignFn(target, key, candidate) {
    if (typeof target[key] === "function" || typeof candidate !== "function") return;
    target[key] = candidate;
  }

  function model(options = {}) {
    const sessionBridge = options.sessionBridge || {};
    const startModel = options.startModel || {};
    const tableViewModel = options.tableViewModel || {};
    const runtimeBridge = options.runtimeBridge || {};
    const visualRuntime = options.visualRuntime || {};
    const sessionComposition = options.sessionComposition || {};
    const audio = options.audio || {};
    const renderLoop = options.renderLoop || {};
    const actionRuntime = options.actionRuntime || {};
    const historyBridge = options.historyBridge || {};

    assignFn(options, "saveSettings", sessionBridge.saveSettings);
    assignFn(options, "maybeRecordHand", historyBridge.maybeRecordHand);
    assignFn(options, "saveSessionData", sessionBridge.saveSessionData);
    assignFn(options, "sanitizeTableCount", startModel.sanitizeTableCount);
    assignFn(options, "isSupportedPack", runtimeBridge.isSupportedPack);
    assignFn(options, "heroBusted", tableViewModel.heroBusted);
    assignFn(options, "applyOpponentLearningToTable", runtimeBridge.applyOpponentLearningToTable);
    assignFn(options, "primeDealReveal", visualRuntime.primeDealReveal);
    assignFn(options, "primeBlindLevelAnnouncement", visualRuntime.primeBlindLevelAnnouncement);
    assignFn(options, "annotateActionAnimationMotion", visualRuntime.annotateActionAnimationMotion);
    assignFn(options, "primeActionReveal", visualRuntime.primeActionReveal);
    assignFn(options, "isPaused", visualRuntime.isPaused);
    assignFn(options, "setPaused", visualRuntime.setPaused);
    assignFn(options, "resetTempoCounter", sessionComposition.resetTempoCounter);
    assignFn(options, "startTempoCounter", sessionComposition.startTempoCounter);
    assignFn(options, "playTone", audio.playTone);
    assignFn(options, "render", renderLoop.render);
    assignFn(options, "markAllTablesDirty", renderLoop.markAllTablesDirty);
    assignFn(options, "markTableDirty", renderLoop.markTableDirty);
    assignFn(options, "setActiveTable", renderLoop.setActiveTable);
    assignFn(options, "clearAllActionRevealTimers", visualRuntime.clearAllActionRevealTimers);
    assignFn(options, "clearAllVisualTimers", visualRuntime.clearAllVisualTimers);
    assignFn(options, "clearAllAutoDealQueues", actionRuntime.clearAllAutoDealQueues);
    assignFn(options, "clearAllActionClocks", actionRuntime.clearAllActionClocks);
    assignFn(options, "clearAllBotResponseTimers", actionRuntime.clearAllBotResponseTimers);
    assignFn(options, "clearAutoDealQueue", actionRuntime.clearAutoDealQueue);
    assignFn(options, "clearActionClock", actionRuntime.clearActionClock);
    assignFn(options, "clearBotResponseTimer", actionRuntime.clearBotResponseTimer);
    assignFn(options, "clearActionRevealTimer", visualRuntime.clearActionRevealTimer);
    assignFn(options, "clearVisualTimersForTable", visualRuntime.clearVisualTimersForTable);
    assignFn(options, "queueNextHandIfNeeded", actionRuntime.queueNextHandIfNeeded);

    const engine = options.engine || {};
    const state = options.state || {};
    const defaultPackKey = String(options.defaultPackKey || "basic-vpip");
    const saveSettings = typeof options.saveSettings === "function" ? options.saveSettings : () => {};
    const maybeRecordHand = typeof options.maybeRecordHand === "function" ? options.maybeRecordHand : () => false;
    const saveSessionData = typeof options.saveSessionData === "function" ? options.saveSessionData : () => true;
    const sanitizeTableCount = typeof options.sanitizeTableCount === "function" ? options.sanitizeTableCount : defaultSanitizeTableCount;
    const isSupportedPack = typeof options.isSupportedPack === "function" ? options.isSupportedPack : defaultIsSupportedPack;
    const heroBusted = typeof options.heroBusted === "function" ? options.heroBusted : () => false;
    const applyOpponentLearningToTable = typeof options.applyOpponentLearningToTable === "function" ? options.applyOpponentLearningToTable : (table) => table;
    const primeDealReveal = typeof options.primeDealReveal === "function" ? options.primeDealReveal : () => {};
    const primeBlindLevelAnnouncement = typeof options.primeBlindLevelAnnouncement === "function" ? options.primeBlindLevelAnnouncement : () => {};
    const annotateActionAnimationMotion = typeof options.annotateActionAnimationMotion === "function" ? options.annotateActionAnimationMotion : () => {};
    const primeActionReveal = typeof options.primeActionReveal === "function" ? options.primeActionReveal : () => {};
    const isPaused = typeof options.isPaused === "function" ? options.isPaused : () => false;
    const setPaused = typeof options.setPaused === "function" ? options.setPaused : () => {};
    const resetTempoCounter = typeof options.resetTempoCounter === "function" ? options.resetTempoCounter : () => {};
    const startTempoCounter = typeof options.startTempoCounter === "function" ? options.startTempoCounter : () => {};
    const playTone = typeof options.playTone === "function" ? options.playTone : () => {};
    const render = typeof options.render === "function" ? options.render : () => {};
    const markAllTablesDirty = typeof options.markAllTablesDirty === "function" ? options.markAllTablesDirty : () => {};
    const markTableDirty = typeof options.markTableDirty === "function" ? options.markTableDirty : () => {};
    const setActiveTable = typeof options.setActiveTable === "function" ? options.setActiveTable : () => {};
    const clearAllActionRevealTimers = typeof options.clearAllActionRevealTimers === "function" ? options.clearAllActionRevealTimers : () => {};
    const clearAllVisualTimers = typeof options.clearAllVisualTimers === "function" ? options.clearAllVisualTimers : () => {};
    const clearAllAutoDealQueues = typeof options.clearAllAutoDealQueues === "function" ? options.clearAllAutoDealQueues : () => {};
    const clearAllActionClocks = typeof options.clearAllActionClocks === "function" ? options.clearAllActionClocks : () => {};
    const clearAllBotResponseTimers = typeof options.clearAllBotResponseTimers === "function" ? options.clearAllBotResponseTimers : () => {};
    const clearAutoDealQueue = typeof options.clearAutoDealQueue === "function" ? options.clearAutoDealQueue : () => {};
    const clearActionClock = typeof options.clearActionClock === "function" ? options.clearActionClock : () => {};
    const clearBotResponseTimer = typeof options.clearBotResponseTimer === "function" ? options.clearBotResponseTimer : () => {};
    const clearActionRevealTimer = typeof options.clearActionRevealTimer === "function" ? options.clearActionRevealTimer : () => {};
    const clearVisualTimersForTable = typeof options.clearVisualTimersForTable === "function" ? options.clearVisualTimersForTable : () => {};
    const queueNextHandIfNeeded = typeof options.queueNextHandIfNeeded === "function" ? options.queueNextHandIfNeeded : () => {};

    function settings() {
      if (!state.settings) state.settings = {};
      return state.settings;
    }

    function sessionHandLimitReached() {
      const sessionLimit = Math.max(0, Number(settings().sessionHandLimit || 0));
      const completedHands = Array.isArray(state.history) ? state.history.length : 0;
      return sessionLimit > 0 && completedHands >= sessionLimit;
    }

    function packs() {
      return engine.PACKS || {};
    }

    function ensureSupportedPack() {
      const current = settings().pack;
      if (!packs()[current] || !isSupportedPack(packs()[current])) {
        settings().pack = defaultPackKey;
        saveSettings();
      }
      return packs()[settings().pack] || packs()[defaultPackKey] || null;
    }

    function packUsesScriptedStreet(pack) {
      return Boolean(pack?.spots?.some((spot) => spot.startStreet && spot.startStreet !== "preflop"));
    }

    function tableUsesTournamentMode(table = null) {
      return String(table?.simulationMode || settings().simulationMode || "").toLowerCase() === "tournament";
    }

    function restoreSnapshots() {
      return Array.isArray(state.restoreTableSnapshots) ? state.restoreTableSnapshots : [];
    }

    function recordInterruptedRestoreHand(snapshot) {
      if (!snapshot || typeof snapshot !== "object") return;
      const marker = {
        schema: "poker-simulator-interrupted-hand-v1",
        tableId: Number(snapshot.tableId || snapshot.id || 0),
        handNo: Number(snapshot.handNo || 0),
        tournamentHandNo: Number(snapshot.tournamentHandNo || snapshot.handNo || 0),
        blindLevel: Number(snapshot.blindLevel || 1),
        blindMultiplier: Number(snapshot.blindMultiplier || 1),
        interruptedAt: snapshot.savedAt || "",
        resumedAt: new Date().toISOString(),
        reason: "page-restore",
        snapshot
      };
      state.restoreInterruptedHands = [marker, ...(Array.isArray(state.restoreInterruptedHands) ? state.restoreInterruptedHands : [])].slice(0, MAX_INTERRUPTED_HAND_HISTORY);
    }

    function takeSessionRestoreSnapshot(tableId, tableOptions = {}) {
      if (tableOptions.allowSessionRestore !== true) return null;
      const snapshots = restoreSnapshots();
      if (!snapshots.length) return null;
      const targetId = Number(tableId || 0);
      const index = snapshots.findIndex((snapshot) => Number(snapshot?.tableId || snapshot?.id || 0) === targetId);
      if (index < 0) return null;
      const [snapshot] = snapshots.splice(index, 1);
      state.restoreTableSnapshots = snapshots;
      recordInterruptedRestoreHand(snapshot);
      return snapshot;
    }

    function clearSessionRestoreSnapshots() {
      if (!restoreSnapshots().length) return;
      state.restoreTableSnapshots = [];
    }

    function heroBustedRestartLabel(table) {
      return tableUsesTournamentMode(table) ? "Новый турнир" : "Новый стек";
    }

    function heroBustedRestartAction(table) {
      return tableUsesTournamentMode(table) ? "restart-tournament" : "new-table-hand";
    }

    function createTable(id, previousTable = null, tableOptions = {}) {
      const activePack = ensureSupportedPack();
      state.handSeq = Number(state.handSeq || 0) + 1;
      if (tableOptions.persistSession !== false) saveSessionData();
      const carriesStacks = settings().simulationMode === "tournament";
      const activePackUsesScriptedStreet = packUsesScriptedStreet(activePack);
      const restoreTable = previousTable ? null : takeSessionRestoreSnapshot(id, tableOptions);
      const carrySourceTable = previousTable || restoreTable;
      const previousTournamentHandNo = Math.max(0, Number(carrySourceTable?.tournamentHandNo || carrySourceTable?.handNo || 0));
      const tournamentHandNo = carriesStacks
        ? carrySourceTable?.simulationMode === "tournament" && !tableOptions.restartTournament && !heroBusted(carrySourceTable)
          ? previousTournamentHandNo + 1
          : 1
        : 0;
      const carryoverTable = !carriesStacks || settings().trainingMode || heroBusted(carrySourceTable) || activePackUsesScriptedStreet ? null : carrySourceTable;
      if (carryoverTable && settings().lobbyEvents !== false && typeof engine.tickLobbyForHand === "function") {
        engine.tickLobbyForHand(carryoverTable);
      }
      const table = applyOpponentLearningToTable(engine.createTable({
        id,
        settings: settings(),
        handNo: state.handSeq,
        previousTable: carryoverTable,
        tournamentHandNo,
        testHeroPosition: tableOptions.testHeroPosition || ""
      }));
      table.createdWhilePausedAt = isPaused() ? Date.now() : 0;
      primeDealReveal(table);
      primeBlindLevelAnnouncement(table);
      annotateActionAnimationMotion(table);
      primeActionReveal(table);
      return table;
    }

    function isTerminalTournamentTable(table) {
      if (!table || !tableUsesTournamentMode(table)) return false;
      const resultKind = String(table.resultKind || "");
      const result = String(table.result || "");
      return Boolean(
        heroBusted(table)
        || table.tournamentComplete === true
        || resultKind === "tournament-won"
        || result === "Hero wins tournament"
      );
    }

    function liveTableEntries(tables) {
      return (Array.isArray(tables) ? tables : [])
        .map((table, index) => ({
          table,
          index,
          oldId: Number(table?.id || index + 1),
          terminal: isTerminalTournamentTable(table)
        }))
        .filter((entry) => entry.table && !entry.terminal);
    }

    function livePlayingTables(tables) {
      return liveTableEntries(tables).filter((entry) => String(entry.table?.status || "") === "playing");
    }

    function setTableCountBlockedWarning(targetCount, playingCount) {
      saveSessionData();
      const countText = playingCount === 1 ? "1 раздачу" : `${playingCount} раздачи`;
      const message = `Сначала доиграйте текущие ${countText}: уменьшить количество столов до ${targetCount} можно только после завершения живых рук.`;
      state.persistenceWarning = message;
      state.persistenceWarningReason = "table-count-live-hands";
      state.importStatus = message;
      markAllTablesDirty();
      render("table-count-blocked");
    }

    function clearTableCountBlockedWarning() {
      if (String(state.persistenceWarningReason || "") !== "table-count-live-hands") return;
      const warning = String(state.persistenceWarning || "");
      state.persistenceWarning = "";
      state.persistenceWarningReason = "";
      if (String(state.importStatus || "") === warning) state.importStatus = "";
    }

    // Live playing tables a reduction to `count` would DROP. The shrink keeps live
    // hands first, so only live hands BEYOND `count` are lost. Shared by the
    // confirm-count query and the actual shrink so the two can never disagree.
    function liveTablesDroppedByShrink(count) {
      const previousTables = Array.isArray(state.tables) ? state.tables : [];
      const liveEntries = liveTableEntries(previousTables);
      const selected = [];
      const activeId = Number(state.activeTableId || 0);
      const activeLive = liveEntries.find((entry) => Number(entry.oldId) === activeId);
      if (activeLive) selected.push(activeLive);
      liveEntries.forEach((entry) => {
        if (selected.length >= count) return;
        if (selected.some((selectedEntry) => selectedEntry.oldId === entry.oldId)) return;
        selected.push(entry);
      });
      const keptIds = new Set(selected.slice(0, count).map((entry) => entry.oldId));
      return liveEntries
        .filter((entry) => !keptIds.has(entry.oldId) && String(entry.table?.status || "") === "playing")
        .map((entry) => entry.table);
    }

    // How many in-progress hands a reduction to `nextCount` would forfeit. 0 when
    // not started, not shrinking, or every live hand is kept. The UI reads this to
    // decide whether to prompt "fix undecided hands as losses?" before switching.
    function pendingTableCountForfeit(nextCount) {
      const count = sanitizeTableCount(nextCount);
      const previousCount = sanitizeTableCount(settings().tableCount);
      if (!state.started || count >= previousCount) return 0;
      return liveTablesDroppedByShrink(count).length;
    }

    // Force-settle a still-live hand as a hero LOSS and record it, so a dropped
    // table cannot erase a losing hand from session stats (the anti-cheat intent).
    // The engine deducted every committed chip on the spot, so the recorded netBb
    // is exactly the forfeited amount — no extra penalty, and no way to escape it.
    function forfeitLiveHand(table) {
      if (!table || table.status !== "playing") return;
      if (typeof engine.forfeitHeroHand === "function") {
        engine.forfeitHeroHand(table);
      } else {
        table.status = "folded";
        table.resultKind = "lost";
        table.result = table.result || "Раздача засчитана как проигрыш";
      }
      maybeRecordHand(table);
    }

    function shrinkTablesKeepingLiveFirst(count, shrinkOptions = {}) {
      const previousTables = Array.isArray(state.tables) ? state.tables : [];
      const liveEntries = liveTableEntries(previousTables);
      const selected = [];
      const activeId = Number(state.activeTableId || 0);
      const activeLive = liveEntries.find((entry) => Number(entry.oldId) === activeId);
      if (activeLive) selected.push(activeLive);
      liveEntries.forEach((entry) => {
        if (selected.length >= count) return;
        if (selected.some((selectedEntry) => selectedEntry.oldId === entry.oldId)) return;
        selected.push(entry);
      });
      selected.sort((first, second) => first.index - second.index);
      const selectedIds = new Set(selected.map((entry) => entry.oldId));
      previousTables.forEach((table, index) => {
        const oldId = Number(table?.id || index + 1);
        if (selectedIds.has(oldId)) return;
        // A dropped table with a live hand is forfeited as a loss when the caller
        // confirmed it; terminal tables were already recorded when they finished.
        if (shrinkOptions.forfeitLiveHands && String(table?.status || "") === "playing") {
          forfeitLiveHand(table);
        }
        clearTableRuntime(oldId, table);
      });

      const nextTables = selected.slice(0, count).map((entry, index) => {
        const nextId = index + 1;
        if (Number(entry.oldId) !== nextId) clearTableRuntime(entry.oldId, entry.table);
        return { ...entry.table, id: nextId };
      });
      while (nextTables.length < count) {
        nextTables.push(createTable(nextTables.length + 1, null, { persistSession: false }));
      }
      const activeSelectedIndex = selected.findIndex((entry) => Number(entry.oldId) === activeId);
      state.tables = nextTables;
      state.activeTableId = activeSelectedIndex >= 0 ? activeSelectedIndex + 1 : 1;
      clearOrphanedTableTimers(count);
      queueAutoDealForBornTerminalTables(state.tables);
    }

    function syncTableCount(nextCount, keepExisting = true, syncOptions = {}) {
      const count = sanitizeTableCount(nextCount);
      const previousCount = sanitizeTableCount(settings().tableCount);
      const shrinkingStartedTables = state.started && keepExisting && count < previousCount;
      if (shrinkingStartedTables) {
        const forfeitCount = liveTablesDroppedByShrink(count).length;
        // Block only when the shrink would actually DROP a live hand AND the caller
        // has not confirmed forfeiting it. Reductions that keep every live hand
        // (live tables float to the front) now go through silently — the old guard
        // over-blocked those. When forfeiting is confirmed, fall through and let
        // shrinkTablesKeepingLiveFirst record the dropped hands as losses.
        if (forfeitCount > 0 && !syncOptions.forfeitLiveHands) {
          setTableCountBlockedWarning(count, forfeitCount);
          return false;
        }
      }

      settings().tableCount = count;
      saveSettings();
      clearTableCountBlockedWarning();

      if (!state.started) {
        clearAllTableRuntime();
        state.tables = [];
        state.activeTableId = 1;
        markAllTablesDirty();
        render("table-count-idle");
        return true;
      }

      if (shrinkingStartedTables) {
        shrinkTablesKeepingLiveFirst(count, { forfeitLiveHands: syncOptions.forfeitLiveHands });
      } else {
        (state.tables || []).forEach((table) => {
          if (!keepExisting || Number(table.id) > count) clearTableRuntime(table.id, table);
        });
        const existing = keepExisting ? (state.tables || []).slice(0, count) : [];
        while (existing.length < count) {
          existing.push(createTable(existing.length + 1));
        }

        state.tables = existing.map((table, index) => ({ ...table, id: index + 1 }));
        clearOrphanedTableTimers(count);
        state.activeTableId = Math.min(state.activeTableId, count) || 1;
      }

      markAllTablesDirty();
      saveSessionData();
      render("table-count");
      return true;
    }

    function resetAllTables(resetOptions = {}) {
      if (isPaused()) setPaused(false);
      clearAllTableRuntime();
      clearSessionRestoreSnapshots();
      state.started = resetOptions.start !== false;
      resetTempoCounter();
      if (!state.started) {
        state.tables = [];
        state.activeTableId = 1;
        markAllTablesDirty();
        render("reset-idle");
        return;
      }
      state.tables = Array.from({ length: settings().tableCount }, (_, index) => createTable(index + 1));
      queueAutoDealForBornTerminalTables(state.tables);
      state.activeTableId = 1;
      playTone("deal");
      markAllTablesDirty();
      saveSessionData();
      render("reset-all");
    }

    function dealNextAllTables() {
      if (sessionHandLimitReached()) {
        markAllTablesDirty();
        render("session-hand-limit");
        return false;
      }
      if (isPaused()) setPaused(false);
      const wasStarted = state.started;
      state.started = true;
      if (!settings().setupCompleted) {
        settings().setupCompleted = true;
        saveSettings();
      }
      if (!wasStarted) startTempoCounter();
      clearAllTableRuntime();
      state.tables = Array.from({ length: settings().tableCount }, (_, index) => {
        const tableId = index + 1;
        const previousTable = getTable(tableId);
        const canContinue = previousTable && previousTable.status !== "playing";
        return createTable(tableId, canContinue ? previousTable : null, { allowSessionRestore: !wasStarted });
      });
      clearSessionRestoreSnapshots();
      queueAutoDealForBornTerminalTables(state.tables);
      state.activeTableId = Math.min(state.activeTableId, settings().tableCount) || 1;
      playTone("deal");
      markAllTablesDirty();
      saveSessionData();
      render("deal-all");
      return true;
    }

    function restartTournament(tableId = state.activeTableId) {
      if (isPaused()) setPaused(false);
      clearSessionRestoreSnapshots();
      state.started = true;
      const count = sanitizeTableCount(settings().tableCount);
      settings().tableCount = count;
      const activeId = Number(tableId || state.activeTableId || 1);
      const targetId = Math.min(Math.max(1, Number.isFinite(activeId) ? activeId : 1), count) || 1;
      const previousTable = getTable(targetId);
      clearTableRuntime(targetId, previousTable);
      state.tables = (state.tables || []).map((table) => table.id === targetId ? createTable(targetId, null, { restartTournament: true }) : table);
      state.activeTableId = targetId;
      const next = getTable(targetId);
      queueAutoDealForBornTerminalTables(next);
      playTone("deal");
      markAllTablesDirty();
      saveSessionData();
      render("restart-tournament");
    }

    function replaceTable(tableId) {
      if (sessionHandLimitReached()) {
        markTableDirty(tableId);
        render("session-hand-limit");
        return false;
      }
      clearSessionRestoreSnapshots();
      const previousTable = getTable(tableId);
      clearTableRuntime(tableId, previousTable);
      state.tables = (state.tables || []).map((table) => table.id === tableId ? createTable(tableId, previousTable) : table);
      const next = getTable(tableId);
      queueAutoDealForBornTerminalTables(next);
      setActiveTable(tableId);
      playTone("deal");
      markTableDirty(tableId);
      saveSessionData();
      render("replace-table");
      return true;
    }

    function queueAutoDealForBornTerminalTables(tables) {
      const source = Array.isArray(tables) ? tables : [tables];
      source.forEach((table) => {
        if (table && table.status !== "playing") queueNextHandIfNeeded(table);
      });
    }

    function getTable(tableId) {
      return (state.tables || []).find((table) => table.id === Number(tableId));
    }

    function clearAllTableRuntime() {
      clearAllActionRevealTimers();
      clearAllVisualTimers();
      clearAllAutoDealQueues();
      clearAllActionClocks();
      clearAllBotResponseTimers();
    }

    function clearTableRuntime(tableId, table = getTable(tableId)) {
      clearAutoDealQueue(table);
      clearActionClock(tableId);
      clearBotResponseTimer(tableId);
      clearActionRevealTimer(tableId);
      clearVisualTimersForTable(tableId);
    }

    function clearOrphanedTableTimers(count) {
      Array.from(state.actionRevealTimers?.keys?.() || [])
        .filter((tableId) => Number(tableId) > count)
        .forEach(clearActionRevealTimer);
      Array.from(state.visualTimers?.keys?.() || [])
        .map((key) => Number(String(key).split(":")[0]))
        .filter((tableId) => tableId > count)
        .forEach(clearVisualTimersForTable);
    }

    return {
      packUsesScriptedStreet,
      tableUsesTournamentMode,
      heroBustedRestartLabel,
      heroBustedRestartAction,
      createTable,
      sessionHandLimitReached,
      syncTableCount,
      pendingTableCountForfeit,
      resetAllTables,
      dealNextAllTables,
      restartTournament,
      replaceTable,
      queueAutoDealForBornTerminalTables,
      getTable,
      clearAllTableRuntime,
      clearTableRuntime
    };
  }

  function defaultSanitizeTableCount(value) {
    const number = Math.round(Number(value || 1));
    return Math.min(4, Math.max(1, Number.isFinite(number) ? number : 1));
  }

  function defaultIsSupportedPack(pack) {
    return Boolean(pack?.spots?.length) && pack.spots.every((spot) => !spot.startStreet || ["preflop", "flop", "turn", "river"].includes(spot.startStreet));
  }

  root.PokerSimulatorTableLifecycle = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
