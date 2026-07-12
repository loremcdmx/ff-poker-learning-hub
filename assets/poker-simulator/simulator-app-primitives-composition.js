(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function requireFn(owner, key, name) {
    if (!owner || typeof owner[key] !== "function") {
      throw new Error(`${name} is not loaded - check <script> order in poker-simulator.html`);
    }
  }

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const documentRef = options.documentRef || windowRef.document;
    const getState = typeof options.getState === "function" ? options.getState : () => options.state || {};
    const runtimeRegistry = options.runtimeRegistry || { set: noop };
    const state = options.state || getState() || {};

    requireFn(options.formatKit, "amountFormatter", "PokerSimulatorFormat");
    requireFn(options.audioKit, "model", "PokerSimulatorAudio");
    requireFn(options.bettingKit, "model", "PokerSimulatorBetting");
    requireFn(options.heroActionsKit, "model", "PokerSimulatorHeroActions");
    requireFn(options.replayKit, "model", "PokerSimulatorReplay");
    requireFn(options.replayHistoryKit, "model", "PokerSimulatorReplayHistory");
    requireFn(options.cardsKit, "model", "PokerSimulatorCards");
    requireFn(options.replayUiKit, "model", "PokerSimulatorReplayUi");

    const amountFormat = options.formatKit.amountFormatter({
      engine: options.engine,
      chipKit: options.chipKit,
      getAmountMode: () => getState()?.settings?.amountMode
    });
    runtimeRegistry.set({ formatAmount: amountFormat.formatAmount });

    const formatBb = amountFormat.formatBb;
    const formatCompactAmount = amountFormat.formatCompactAmount;
    const formatBlindMultiplier = amountFormat.formatBlindMultiplier;
    const formatInlineAmounts = amountFormat.formatInlineAmounts;
    const chipBreakdown = amountFormat.chipBreakdown;

    const audio = options.audioKit.model({
      windowRef,
      getEnabled: () => Boolean(getState()?.settings?.sound),
      getAudio: () => getState()?.audio,
      setAudio: (context) => {
        getState().audio = context;
      },
      onDisabled: () => {
        getState().settings.sound = false;
      }
    });
    runtimeRegistry.set({ audio });

    const betModel = options.bettingKit.model({
      startModel: options.startModel,
      getSliderPresets: () => getState()?.settings?.sliderPresets,
      getPostflopBetPercents: () => getState()?.settings?.postflopBetPercents,
      heroMaxContribution: options.actionBridge?.heroMaxContribution,
      formatAmount: options.formatAmount,
      formatCompactAmount
    });
    runtimeRegistry.set({ betBounds: betModel.betBounds });

    const heroActions = options.heroActionsKit.model({
      roundBb: options.roundBb,
      betBounds: betModel.betBounds,
      heroSeat: options.heroSeat,
      canHeroAct: options.canHeroAct
    });
    runtimeRegistry.set({ heroActions });

    const replayModel = options.replayKit.model({
      streetLabel: options.streetLabel,
      formatInlineAmounts
    });
    const replayHistory = options.replayHistoryKit.model({
      getState,
      escapeHtml: options.escapeHtml
    });
    runtimeRegistry.set({ replayHistory });

    const cardModel = options.cardsKit.model({
      deckKit: options.deckKit,
      engine: options.engine,
      getDeckTheme: () => getState()?.settings?.deck,
      escapeHtml: options.escapeHtml,
      visibleBoardLength: options.visibleBoardLength
    });
    const renderReplayCard = (card, cardOptions = {}) => cardModel.renderCard(card, { ...cardOptions, theme: "color-block" });
    const replayUi = options.replayUiKit.model({
      windowRef,
      documentRef,
      cardModel,
      renderCard: renderReplayCard,
      replayModel,
      formatAmount: options.formatAmount,
      formatInlineAmounts,
      escapeHtml: options.escapeHtml
    });

    return {
      amountFormat,
      formatBb,
      formatCompactAmount,
      formatBlindMultiplier,
      formatInlineAmounts,
      chipBreakdown,
      audio,
      betModel,
      heroActions,
      replayModel,
      replayHistory,
      cardModel,
      replayUi
    };
  }

  root.PokerSimulatorAppPrimitivesComposition = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorAppPrimitivesComposition;
})();
