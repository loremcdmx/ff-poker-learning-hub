(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getHeroActions = getter(options.getHeroActions);
    const getActionControls = getter(options.getActionControls);

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

    function invoke(getTarget, method, fallback, args) {
      const modelRef = target(getTarget);
      const fn = modelRef && modelRef[method];
      if (typeof fn === "function") return fn.apply(modelRef, Array.prototype.slice.call(args || []));
      return typeof fallback === "function" ? fallback.apply(null, Array.prototype.slice.call(args || [])) : fallback;
    }

    function bind(getTarget, method, fallback) {
      return function boundActionBridgeMethod() {
        return invoke(getTarget, method, fallback, arguments);
      };
    }

    return {
      effectiveHeroCallAmount: bind(getHeroActions, "effectiveHeroCallAmount", 0),
      heroMaxContribution: bind(getHeroActions, "heroMaxContribution", 0),
      tableSeatById: bind(getHeroActions, "tableSeatById", null),
      seatCanContestPot: bind(getHeroActions, "seatCanContestPot", false),
      activeContestantIds: bind(getHeroActions, "activeContestantIds", () => []),
      heroFacesLoneOpponentAllIn: bind(getHeroActions, "heroFacesLoneOpponentAllIn", false),
      fullMinRaiseTo: bind(getHeroActions, "fullMinRaiseTo", 0),
      heroCanMakeFullRaise: bind(getHeroActions, "heroCanMakeFullRaise", false),
      heroFacingCallOnlyRaise: bind(getHeroActions, "heroFacingCallOnlyRaise", false),
      heroCanShortAllIn: bind(getHeroActions, "heroCanShortAllIn", false),
      needsBetAmount: bind(getHeroActions, "needsBetAmount", false),
      isAggressiveHeroAction: bind(getHeroActions, "isAggressiveHeroAction", false),

      renderFoldAnyControl: bind(getActionControls, "renderFoldAnyControl", ""),
      renderActions: bind(getActionControls, "renderActions", ""),
      callButtonText: bind(getActionControls, "callButtonText", ""),
      renderBetWidget: bind(getActionControls, "renderBetWidget", ""),
      renderBetPresetButton: bind(getActionControls, "renderBetPresetButton", ""),
      compactBetPresetLabel: bind(getActionControls, "compactBetPresetLabel", ""),
      renderPreflopBetControls: bind(getActionControls, "renderPreflopBetControls", ""),
      readBetAmount: bind(getActionControls, "readBetAmount", null),
      updateBetSlider: bind(getActionControls, "updateBetSlider", undefined),
      updateBetSliderByStep: bind(getActionControls, "updateBetSliderByStep", undefined),
      syncBetControlState: bind(getActionControls, "syncBetControlState", undefined),
      actionButton: bind(getActionControls, "actionButton", "")
    };
  }

  root.PokerSimulatorActionBridge = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorActionBridge;
})();
