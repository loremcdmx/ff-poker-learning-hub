(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => ({ settings: {} });

    function state() {
      return getState() || {};
    }

    function simulationStructureSnapshot(settings = {}) {
      return {
        simulationMode: settings.simulationMode,
        randomStackMinBb: settings.randomStackMinBb,
        randomStackMaxBb: settings.randomStackMaxBb,
        tournamentStartingStackBb: settings.tournamentStartingStackBb,
        tournamentLevelHands: settings.tournamentLevelHands,
        tournamentBlindLevels: settings.tournamentBlindLevels
      };
    }

    function simulationStructureChanged(previous, next) {
      return Object.keys(previous || {}).some((key) => String(previous[key]) !== String(next?.[key]));
    }

    function applySimulationSettings(next, applyOptions = {}) {
      const current = state();
      if (!current.settings) current.settings = {};
      const previous = simulationStructureSnapshot(current.settings);

      Object.assign(current.settings, next || {});
      if (applyOptions.setupCompleted) current.settings.setupCompleted = true;

      options.saveSettings();
      options.syncSimulationControls();

      if (applyOptions.restartHandSeq) {
        current.handSeq = 0;
        options.saveSessionData();
      }

      if (applyOptions.resetTables || simulationStructureChanged(previous, current.settings)) {
        options.resetAllTables({
          start: applyOptions.startTables === true || (current.started && applyOptions.startTables !== false)
        });
        return;
      }

      options.prepareActionClocks();
      options.markAllTablesDirty();
      options.render("simulation-settings");
    }

    return {
      simulationStructureSnapshot,
      simulationStructureChanged,
      applySimulationSettings
    };
  }

  root.PokerSimulatorSimulationRuntime = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSimulationRuntime;
})();
