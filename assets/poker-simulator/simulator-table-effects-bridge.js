(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getTableEffects = getter(options.getTableEffects);

    function getter(candidate) {
      return typeof candidate === "function" ? candidate : () => null;
    }

    function target(getTarget) {
      try {
        return getTarget() || {};
      } catch {
        return {};
      }
    }

    function invoke(method, fallback, args) {
      const modelRef = target(getTableEffects);
      const fn = modelRef && modelRef[method];
      if (typeof fn === "function") return fn.apply(modelRef, Array.prototype.slice.call(args || []));
      return typeof fallback === "function" ? fallback.apply(null, Array.prototype.slice.call(args || [])) : fallback;
    }

    function bind(method, fallback) {
      return function boundTableEffectsBridgeMethod() {
        return invoke(method, fallback, arguments);
      };
    }

    return {
      isBetLanded: bind("isBetLanded", true),
      retainBetAnimationsForActionSequence: bind("retainBetAnimationsForActionSequence", undefined),
      clearActionBubbleLatch: bind("clearActionBubbleLatch", undefined),
      renderSeatBets: bind("renderSeatBets", ""),
      renderHeroFeltBet: bind("renderHeroFeltBet", ""),
      visibleSeatBetAmount: bind("visibleSeatBetAmount", (_table, _seatId, amount) => amount),
      renderBetFlights: bind("renderBetFlights", ""),
      betFlightClass: bind("betFlightClass", ""),
      renderFoldedCardMucks: bind("renderFoldedCardMucks", ""),
      renderFoldMuckForAction: bind("renderFoldMuckForAction", ""),
      foldMuckCardStartPoint: bind("foldMuckCardStartPoint", () => ({ x: 50, y: 50 })),
      renderActionBubbles: bind("renderActionBubbles", ""),
      actionBubbleClasses: bind("actionBubbleClasses", ""),
      riverResolutionCueEvent: bind("riverResolutionCueEvent", null),
      renderRiverResolutionCue: bind("renderRiverResolutionCue", ""),
      actionBubbleLabel: bind("actionBubbleLabel", ""),
      renderPotStacks: bind("renderPotStacks", ""),
      renderPotAward: bind("renderPotAward", "")
    };
  }

  root.PokerSimulatorTableEffectsBridge = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorTableEffectsBridge;
})();
