(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const getTable = typeof options.getTable === "function" ? options.getTable : () => null;
    const heroActions = options.heroActions || {};
    const tableGrid = options.tableGrid || null;
    const dialogs = options.dialogs || {};

    function state() {
      return getState() || {};
    }

    function hotkeyActionForTable(table, key) {
      return typeof heroActions.hotkeyActionForTable === "function"
        ? heroActions.hotkeyActionForTable(table, key)
        : "";
    }

    function dialogOpen(name) {
      return Boolean(dialogs[name]?.open);
    }

    function shouldIgnoreHotkey(event = {}) {
      const target = event.target;
      const tag = target?.tagName;
      return event.metaKey
        || event.ctrlKey
        || event.altKey
        || event.repeat
        || dialogOpen("settings")
        || dialogOpen("replay")
        || dialogOpen("analytics")
        || dialogOpen("leaderboard")
        || dialogOpen("opponentNote")
        || tag === "INPUT"
        || tag === "SELECT"
        || tag === "TEXTAREA"
        || target?.isContentEditable;
    }

    function triggerHotkey(key) {
      if (options.isPaused()) return "";
      const table = getTable(state().activeTableId);
      const action = hotkeyActionForTable(table, key);
      if (!action) return "";

      const shell = tableGrid?.querySelector?.(`[data-table-id="${table.id}"]`);
      const amount = options.needsBetAmount(action) ? options.readBetAmount(shell, table) : undefined;
      options.handleHeroAction(table, action, amount);
      return action;
    }

    return {
      hotkeyActionForTable,
      shouldIgnoreHotkey,
      triggerHotkey
    };
  }

  root.PokerSimulatorHotkeys = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorHotkeys;
})();
