(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function fn(candidate, fallback) {
    return typeof candidate === "function" ? candidate : fallback;
  }

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const engine = options.engine || {};
    const stateKit = options.stateKit || {};
    const settingsModel = options.settingsModel || {};
    const getState = fn(options.getState, () => ({ settings: {} }));
    const getPackSelect = fn(options.getPackSelect, () => null);
    const saveSettings = fn(options.saveSettings, () => false);
    const escapeHtml = fn(options.escapeHtml, (value) => String(value ?? ""));
    const randomToken = fn(options.randomToken, () => "");
    const warn = fn(options.warn, () => {});

    function state() {
      try {
        const current = getState() || {};
        if (!current.settings) current.settings = {};
        return current;
      } catch (error) {
        warn("Boot model getState() threw; falling back to empty settings.", error);
        return { settings: {} };
      }
    }

    function createSessionId() {
      return stateKit.createBootSessionId({
        now: () => Date.now(),
        randomToken,
        randomUUID: () => windowRef.crypto?.randomUUID?.()
      });
    }

    function isSupportedPack(pack) {
      return Boolean(pack?.spots?.length) && pack.spots.every((spot) => !spot.startStreet || ["preflop", "flop", "turn", "river"].includes(spot.startStreet));
    }

    function applyPlayerPathBootParams() {
      return settingsModel.applyPlayerPathBootParams(state().settings, {
        packs: engine.PACKS,
        isSupportedPack
      });
    }

    function hydratePackOptions() {
      const packSelect = getPackSelect();
      if (!packSelect) return;
      packSelect.innerHTML = Object.entries(engine.PACKS || {})
        .filter(([, pack]) => isSupportedPack(pack))
        .map(([key, pack]) => `<option value="${key}">${escapeHtml(pack.name)}</option>`)
        .join("");
    }

    async function hydrateExternalPacks() {
      const current = state();
      if (current.settings?.demoMode) return;
      if (typeof engine.loadPackManifest !== "function") return;
      if (typeof windowRef.fetch !== "function") return;
      try {
        await engine.loadPackManifest("assets/poker-kit/simulator/packs/manifest.json");
      } catch (error) {
        warn("External simulator packs are unavailable, using bundled packs.", error);
      }
      if (!engine.PACKS?.[current.settings?.pack] || !isSupportedPack(engine.PACKS[current.settings.pack])) {
        current.settings.pack = "basic-vpip";
        saveSettings();
      }
    }

    return {
      createSessionId,
      isSupportedPack,
      applyPlayerPathBootParams,
      hydratePackOptions,
      hydrateExternalPacks
    };
  }

  root.PokerSimulatorBoot = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorBoot;
})();
