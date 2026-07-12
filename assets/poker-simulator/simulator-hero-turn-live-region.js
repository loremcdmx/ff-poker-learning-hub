(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model({
    documentRef = root.document,
    getActiveTable,
    canHeroAct,
    getTableCount
  } = {}) {
    let liveRegion = null;
    let lastHeroTurnAnnounceKey = "";

    function ensureLiveRegion() {
      if (!documentRef?.body) return null;
      if (liveRegion) return liveRegion;
      liveRegion = documentRef.createElement("div");
      liveRegion.className = "visually-hidden";
      liveRegion.setAttribute("role", "status");
      liveRegion.setAttribute("aria-live", "polite");
      documentRef.body.appendChild(liveRegion);
      return liveRegion;
    }

    function announceHeroTurnForActiveTable() {
      const region = ensureLiveRegion();
      if (!region) return;
      const table = typeof getActiveTable === "function" ? getActiveTable() : null;
      const isHeroTurn = Boolean(table && (typeof canHeroAct === "function" ? canHeroAct(table) : false));
      const key = isHeroTurn ? `${table.id}:${table.handNo}:${table.street}` : "";
      if (!isHeroTurn) {
        region.textContent = "";
      } else if (key !== lastHeroTurnAnnounceKey) {
        const tableCount = Number(typeof getTableCount === "function" ? getTableCount() : 1);
        region.textContent = tableCount > 1 ? `Ваш ход, стол ${table.id}` : "Ваш ход";
      }
      lastHeroTurnAnnounceKey = key;
    }

    return {
      announceHeroTurnForActiveTable,
      liveRegion: () => liveRegion
    };
  }

  root.PokerSimulatorHeroTurnLiveRegion = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
