(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getActionVisualModel = getter(options.getActionVisualModel);
    const getShowdownVisualModel = getter(options.getShowdownVisualModel);
    const getSeatVisualModel = getter(options.getSeatVisualModel);
    const getTableStatus = getter(options.getTableStatus);
    const getTournamentFinishUi = getter(options.getTournamentFinishUi);
    const getRenderSupport = getter(options.getRenderSupport);

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
      return function boundVisualStateBridgeMethod() {
        return invoke(getTarget, method, fallback, arguments);
      };
    }

    return {
      captureHeroActionAnimation: bind(getActionVisualModel, "captureHeroActionAnimation", undefined),
      captureVisualSeatState: bind(getActionVisualModel, "captureVisualSeatState", undefined),
      annotateActionAnimationMotion: bind(getActionVisualModel, "annotateActionAnimationMotion", undefined),
      actionAnimationIsAllIn: bind(getActionVisualModel, "actionAnimationIsAllIn", false),
      actionHasChipFlight: bind(getActionVisualModel, "actionHasChipFlight", false),
      pendingPotFlightItems: bind(getActionVisualModel, "pendingPotFlightItems", () => []),
      pendingBetMarkerLandingItems: bind(getActionVisualModel, "pendingBetMarkerLandingItems", () => []),
      potAnimationState: bind(getActionVisualModel, "potAnimationState", () => ({ visibleAmount: 0, totalAmount: 0, pendingAmount: 0, inFlight: false })),
      actionIndexForBetAnimation: bind(getActionVisualModel, "actionIndexForBetAnimation", (_table, _item, fallbackIndex = 0) => fallbackIndex),
      actionAnimationIndexForSeat: bind(getActionVisualModel, "actionAnimationIndexForSeat", 0),
      actionAnimationHasStarted: bind(getActionVisualModel, "actionAnimationHasStarted", true),
      actionAnimationHasCompleted: bind(getActionVisualModel, "actionAnimationHasCompleted", true),
      actionAnimationIsInMotion: bind(getActionVisualModel, "actionAnimationIsInMotion", false),
      actionThinkMs: bind(getActionVisualModel, "actionThinkMs", 0),

      allInRunoutStages: bind(getShowdownVisualModel, "allInRunoutStages", () => []),
      allInRunoutStageState: bind(getShowdownVisualModel, "allInRunoutStageState", () => ({ index: -1, cardCount: 0, complete: true })),
      allInRunoutVisibleBoardLength: bind(getShowdownVisualModel, "allInRunoutVisibleBoardLength", 0),
      allInRunoutShowsEquity: bind(getShowdownVisualModel, "allInRunoutShowsEquity", false),
      allInEquityDisplayReady: bind(getShowdownVisualModel, "allInEquityDisplayReady", false),
      allInRunoutHasEquityStage: bind(getShowdownVisualModel, "allInRunoutHasEquityStage", false),
      allInEquityLayoutReady: bind(getShowdownVisualModel, "allInEquityLayoutReady", false),
      allInEquityForSeat: bind(getShowdownVisualModel, "allInEquityForSeat", null),
      outsLabel: bind(getShowdownVisualModel, "outsLabel", ""),
      allInOutsForSeat: bind(getShowdownVisualModel, "allInOutsForSeat", null),
      showdownWinnerLabel: bind(getShowdownVisualModel, "showdownWinnerLabel", ""),
      showdownWinnerStatusText: bind(getShowdownVisualModel, "showdownWinnerStatusText", ""),
      showdownHandSummary: bind(getShowdownVisualModel, "showdownHandSummary", ""),
      showdownPotAwardStatusText: bind(getShowdownVisualModel, "showdownPotAwardStatusText", ""),
      showdownParticipants: bind(getShowdownVisualModel, "showdownParticipants", () => []),
      showdownParticipantName: bind(getShowdownVisualModel, "showdownParticipantName", ""),
      showdownWinnerParticipants: bind(getShowdownVisualModel, "showdownWinnerParticipants", () => []),
      showdownPrimaryWinnerParticipant: bind(getShowdownVisualModel, "showdownPrimaryWinnerParticipant", null),
      showdownWinningCards: bind(getShowdownVisualModel, "showdownWinningCards", () => []),
      showdownRevealOrder: bind(getShowdownVisualModel, "showdownRevealOrder", () => new Map()),
      revealDelayForSeat: bind(getShowdownVisualModel, "revealDelayForSeat", 0),
      showdownWinningCardRoleMap: bind(getShowdownVisualModel, "showdownWinningCardRoleMap", () => new Map()),
      showdownWinningCardRole: bind(getShowdownVisualModel, "showdownWinningCardRole", ""),
      isWinningCard: bind(getShowdownVisualModel, "isWinningCard", false),

      seatMuckOutState: bind(getSeatVisualModel, "seatMuckOutState", null),
      seatVisuallyFolded: bind(getSeatVisualModel, "seatVisuallyFolded", false),
      seatOutsideContestedPot: bind(getSeatVisualModel, "seatOutsideContestedPot", false),
      shouldRevealFoldedOpponentAfterFinish: bind(getSeatVisualModel, "shouldRevealFoldedOpponentAfterFinish", false),
      streetRank: bind(getSeatVisualModel, "streetRank", 0),
      seatFoldedBeforeCurrentStreet: bind(getSeatVisualModel, "seatFoldedBeforeCurrentStreet", false),
      seatActionStreet: bind(getSeatVisualModel, "seatActionStreet", ""),
      seatActionVisibleOnCurrentStreet: bind(getSeatVisualModel, "seatActionVisibleOnCurrentStreet", false),
      visibleSeatAction: bind(getSeatVisualModel, "visibleSeatAction", ""),
      visualSeatStateLockActive: bind(getSeatVisualModel, "visualSeatStateLockActive", false),
      visualBaseSeatState: bind(getSeatVisualModel, "visualBaseSeatState", null),
      showdownParticipantSeatIds: bind(getSeatVisualModel, "showdownParticipantSeatIds", () => new Set()),
      eliminatedShowdownSeatStillVisible: bind(getSeatVisualModel, "eliminatedShowdownSeatStillVisible", false),
      visibleSeatLobbyState: bind(getSeatVisualModel, "visibleSeatLobbyState", ""),
      visibleSeatStack: bind(getSeatVisualModel, "visibleSeatStack", 0),
      winnerSeat: bind(getSeatVisualModel, "winnerSeat", null),
      seatIsWinner: bind(getSeatVisualModel, "seatIsWinner", false),
      seatCardState: bind(getSeatVisualModel, "seatCardState", () => ({ empty: true, reveal: false })),
      revealStreetForSeat: bind(getSeatVisualModel, "revealStreetForSeat", ""),

      renderSimulationBadge: bind(getTableStatus, "renderSimulationBadge", ""),
      renderPauseOverlay: bind(getTableStatus, "renderPauseOverlay", ""),
      renderBlindLevelAnnouncement: bind(getTableStatus, "renderBlindLevelAnnouncement", ""),
      renderResultBanner: bind(getTableStatus, "renderResultBanner", ""),
      renderActionStatus: bind(getTableStatus, "renderActionStatus", ""),
      actionBarClass: bind(getTableStatus, "actionBarClass", ""),

      renderTournamentFinishScreen: bind(getTournamentFinishUi, "renderTournamentFinishScreen", ""),
      tournamentFinishScreenVisible: bind(getTournamentFinishUi, "tournamentFinishScreenVisible", false),
      tournamentWon: bind(getTournamentFinishUi, "tournamentWon", false),
      tournamentFinishSummary: bind(getTournamentFinishUi, "tournamentFinishSummary", () => ({ place: 1, entrants: 1, handsPlayed: 1, level: 1, blindMultiplier: 1, reason: "" })),
      formatTournamentPlace: bind(getTournamentFinishUi, "formatTournamentPlace", ""),
      formatTournamentHands: bind(getTournamentFinishUi, "formatTournamentHands", ""),
      tournamentHandsLabel: bind(getTournamentFinishUi, "tournamentHandsLabel", ""),
      russianPlural: bind(getTournamentFinishUi, "russianPlural", (_value, _one, _few, many) => many),
      resultTitle: bind(getTournamentFinishUi, "resultTitle", (_table, fallback = "") => fallback),

      actionAnimationLabel: bind(getRenderSupport, "actionAnimationLabel", ""),
      renderMiniChipStack: bind(getRenderSupport, "renderMiniChipStack", ""),
      renderChipStack: bind(getRenderSupport, "renderChipStack", ""),
      renderPotChipStack: bind(getRenderSupport, "renderPotChipStack", ""),
      compactActionText: bind(getRenderSupport, "compactActionText", ""),
      actionRevealText: bind(getRenderSupport, "actionRevealText", "")
    };
  }

  root.PokerSimulatorVisualStateBridge = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorVisualStateBridge;
})();
