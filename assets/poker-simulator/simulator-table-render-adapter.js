(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function noop() {}

  function fn(candidate, fallback) {
    return typeof candidate === "function" ? candidate : fallback;
  }

  function model(options = {}) {
    const getState = fn(options.getState, () => ({ settings: {}, tables: [] }));
    const markTableDirty = fn(options.markTableDirty, noop);
    const seatSlotsKit = options.seatSlotsKit || root.PokerSimulatorSeatSlots || {};
    const geometryKit = options.geometryKit || {};
    const dealAnimationsKit = options.dealAnimationsKit || {};
    const boardRenderKit = options.boardRenderKit || {};
    const tableEffectsKit = options.tableEffectsKit || {};
    const seatRendererKit = options.seatRendererKit || {};
    const tableRendererKit = options.tableRendererKit || {};

    const usesBoardLayout = fn(options.usesBoardLayout, () => false);
    const visibleBoardLength = fn(options.visibleBoardLength, (table) => table?.board?.length || 0);
    const isBlindBetMarker = fn(options.isBlindBetMarker, () => false);
    const usesDecorativeMotionLayer = fn(options.usesDecorativeMotionLayer, () => false);
    const prefersReducedMotion = fn(options.prefersReducedMotion, () => false);
    const compactTimingMs = fn(options.compactTimingMs, (_table, value) => value);
    const isVisualActive = fn(options.isVisualActive, () => false);
    const dealRevealDurationForTable = fn(options.dealRevealDurationForTable, () => 0);
    const boardRevealDelayRemaining = fn(options.boardRevealDelayRemaining, () => 0);
    const allInRunoutStageState = fn(options.allInRunoutStageState, () => ({ index: -1, cardCount: 0, complete: true }));
    const actionSequenceBoardRevealState = fn(options.actionSequenceBoardRevealState, () => null);
    const showdownWinningCardRole = fn(options.showdownWinningCardRole, () => "");
    const renderCard = fn(options.renderCard, () => "");
    const isActionSequenceActive = fn(options.isActionSequenceActive, () => false);
    const visualSeatStateLockActive = fn(options.visualSeatStateLockActive, () => false);
    const actionTimingAtIndex = fn(options.actionTimingAtIndex, () => ({ startMs: 0, activeMs: 0, settleMs: 0 }));
    const actionIndexForBetAnimation = fn(options.actionIndexForBetAnimation, (_table, _item, fallbackIndex = 0) => fallbackIndex);
    const actionAnimationIsInMotion = fn(options.actionAnimationIsInMotion, () => false);
    const actionAnimationHasCompleted = fn(options.actionAnimationHasCompleted, () => true);
    const actionAnimationIsAllIn = fn(options.actionAnimationIsAllIn, () => false);
    const actionRiverResolution = fn(options.actionRiverResolution, () => null);
    const isRiverResolutionAction = fn(options.isRiverResolutionAction, () => false);
    const roundBb = fn(options.roundBb, (value) => Number(value || 0));
    const winnerSeat = fn(options.winnerSeat, () => null);
    const showdownAwardVisible = fn(options.showdownAwardVisible, () => false);
    const renderMiniChipStack = fn(options.renderMiniChipStack, () => "");
    const renderChipStack = fn(options.renderChipStack, () => "");
    const renderPotChipStack = fn(options.renderPotChipStack, () => "");
    const formatAmount = fn(options.formatAmount, (value) => String(value ?? 0));
    const formatInlineAmounts = fn(options.formatInlineAmounts, (value) => String(value ?? 0));
    const escapeHtml = fn(options.escapeHtml, (value) => String(value ?? ""));

    const visibleSeatLobbyState = fn(options.visibleSeatLobbyState, () => "");
    const canHeroAct = fn(options.canHeroAct, () => false);
    const seatVisuallyFolded = fn(options.seatVisuallyFolded, () => false);
    const visibleSeatStack = fn(options.visibleSeatStack, (_table, seat) => Number(seat?.stack || 0));
    const seatIsWinner = fn(options.seatIsWinner, () => false);
    const visibleSeatAction = fn(options.visibleSeatAction, () => "");
    const seatCardState = fn(options.seatCardState, () => ({ empty: true, reveal: false }));
    const allInEquityLayoutReady = fn(options.allInEquityLayoutReady, () => false);
    const allInEquityForSeat = fn(options.allInEquityForSeat, () => null);
    const allInOutsForSeat = fn(options.allInOutsForSeat, () => null);
    const opponentNoteForSeat = fn(options.opponentNoteForSeat, () => null);
    const renderOpponentNoteButton = fn(options.renderOpponentNoteButton, () => "");
    const actionBubbleLabel = fn(options.actionBubbleLabel, () => "");
    const revealDelayForSeat = fn(options.revealDelayForSeat, () => 0);
    const heroHandLabel = fn(options.heroHandLabel, () => "");
    const opponentNoteHasContent = fn(options.opponentNoteHasContent, () => false);

    const potAnimationState = fn(options.potAnimationState, () => ({ visibleAmount: 0, totalAmount: 0, pendingAmount: 0, inFlight: false, hasPending: false }));
    const tournamentFinishScreenVisible = fn(options.tournamentFinishScreenVisible, () => false);
    const showdownWinnerVisible = fn(options.showdownWinnerVisible, () => false);
    const renderSimulationBadge = fn(options.renderSimulationBadge, () => "");
    const renderBlindLevelAnnouncement = fn(options.renderBlindLevelAnnouncement, () => "");
    const renderResultBanner = fn(options.renderResultBanner, () => "");
    const renderTournamentFinishScreen = fn(options.renderTournamentFinishScreen, () => "");
    const actionBarClass = fn(options.actionBarClass, () => "");
    const renderActionStatus = fn(options.renderActionStatus, () => "");
    const renderActions = fn(options.renderActions, () => "");
    const renderHeroTimebank = fn(options.renderHeroTimebank, () => "");

    const tableGeometry = geometryKit.geometry({
      getPlayerCount: () => state().settings?.playerCount,
      getTableCount: () => state().settings?.tableCount,
      usesBoardLayout
    });
    const legacySeatPoint = tableGeometry.seatPoint;
    const usesDenseTableGeometry = tableGeometry.usesDenseTableGeometry;
    const usesWideTableGeometry = tableGeometry.usesWideTableGeometry;
    const legacyCompactSeatBetPoint = tableGeometry.compactSeatBetPoint;
    const legacyActiveSeatBetPoint = tableGeometry.activeSeatBetPoint;
    const legacyBlindSeatBetPoint = tableGeometry.blindSeatBetPoint;
    const legacyClampBetPoint = tableGeometry.clampBetPoint;
    const legacyActionPoint = tableGeometry.actionPoint;
    const legacySeatZone = tableGeometry.seatZone;
    const legacyHeroBetTarget = tableGeometry.heroBetTarget;
    const SLOT_LAYOUT_CACHE_LIMIT = 64;
    const slotLayoutCache = new Map();
    const slotLayoutObjectCache = new WeakMap();

    const dealAnimations = dealAnimationsKit.model({
      usesDecorativeMotionLayer,
      isVisualActive,
      compactTimingMs,
      dealRevealDurationForTable,
      dealSeatGapMs: options.dealSeatGapMs,
      compactDealSeatGapMs: options.compactDealSeatGapMs,
      dealCardDurationMs: options.dealCardDurationMs,
      compactDealCardDurationMs: options.compactDealCardDurationMs,
      seatPoint,
      slotDealCardTarget,
      seatZone,
      now: () => Date.now()
    });
    const boardRenderer = boardRenderKit.model({
      allInRunoutStageState,
      actionSequenceBoardRevealState,
      visibleBoardLength,
      isVisualActive,
      boardRevealDelayRemaining,
      boardRevealMs: options.boardRevealMs,
      boardCardStaggerMs: options.boardCardStaggerMs,
      showdownWinningCardRole,
      renderCard
    });

    const tableEffects = tableEffectsKit.model({
      usesDecorativeMotionLayer,
      prefersReducedMotion,
      isActionSequenceActive,
      actionSequenceBoardRevealState,
      visibleBoardLength,
      actionTimingAtIndex,
      actionIndexForBetAnimation,
      chipAnnouncementDelayForAction: options.chipAnnouncementDelayForAction,
      chipFlightMs: options.chipFlightMs,
      // Canonical marker-arrival / flight-end offset helpers (visual bridge). When
      // present, table-effects derives betMarkerArrivalDelayMs / betFlightEndDelayMs
      // from these instead of re-rolling the flight arithmetic by hand.
      betMarkerLandingMs: options.betMarkerLandingMs,
      chipRevealMs: options.chipRevealMs,
      actionAnimationIsInMotion,
      actionAnimationHasCompleted,
      actionRevealMs: options.actionRevealMs,
      actionAnimationIsAllIn,
      actionRiverResolution,
      isRiverResolutionAction,
      riverResolutionCueMs: options.riverResolutionCueMs,
      riverResolutionCueDelayMs: options.riverResolutionCueDelayMs,
      compactTimingMs,
      roundBb,
      seatPoint,
      betPoint,
      actionPoint,
      dealCardTarget,
      seatZone,
      winnerSeat,
      showdownAwardVisible,
      renderMiniChipStack,
      renderChipStack,
      renderPotChipStack,
      formatAmount,
      formatInlineAmounts,
      escapeHtml,
      actionI18n: root.PokerSimulatorActionI18n,
      sessionIdentity: () => String(state().sessionId || ""),
      now: () => Date.now(),
      durations: options.tableEffectDurations
    });

    const seatRenderer = seatRendererKit.model({
      visibleSeatLobbyState,
      canHeroAct,
      seatVisuallyFolded,
      visibleSeatStack,
      seatIsWinner,
      seatPoint: (table, seatId) => seatPoint(table, seatId),
      visibleSeatAction,
      seatCardState,
      allInEquityLayoutReady,
      allInEquityForSeat,
      allInOutsForSeat,
      opponentNoteForSeat,
      renderOpponentNoteButton,
      isActionSequenceActive,
      escapeHtml,
      actionBubbleLabel,
      revealDelayForSeat,
      heroHandLabel,
      renderSeatCards,
      renderHeroFeltBet: (table, seat) => tableEffects.renderHeroFeltBet(table, seat),
      opponentNoteHasContent,
      seatZone: (point) => seatZone(point),
      seatSlotContext,
      formatAmount,
      showSeatAvatars: () => state().settings?.seatAvatars !== false,
      getLastDealerSeatId: (table) => state().renderScheduler?.lastDealerByTable?.get(Number(table?.id))
    });

    const tableRenderer = tableRendererKit.model({
      getActiveTableId: () => state().activeTableId,
      dealAnimationActive,
      isVisualActive,
      potAnimationState,
      tournamentFinishScreenVisible,
      showdownWinnerVisible,
      showdownAwardVisible,
      renderSimulationBadge,
      renderBlindLevelAnnouncement,
      usesBoardLayout,
      renderPotStacks: (table) => tableEffects.renderPotStacks(table),
      isActionSequenceActive,
      winnerSeat,
      formatAmount,
      renderDeckShoe,
      renderDealCards,
      renderBoard,
      renderSeat,
      renderSeatBets: (table) => tableEffects.renderSeatBets(table),
      renderFoldedCardMucks: (table) => tableEffects.renderFoldedCardMucks(table),
      renderBetFlights: (table) => tableEffects.renderBetFlights(table),
      renderActionBubbles: (table) => tableEffects.renderActionBubbles(table),
      renderRiverResolutionCue: (table) => tableEffects.renderRiverResolutionCue(table),
      renderPotAward: (table) => tableEffects.renderPotAward(table),
      renderResultBanner,
      renderTournamentFinishScreen,
      actionBarClass,
      renderActionStatus,
      renderActions,
      renderHeroTimebank
    });

    let getStateErrorLogged = false;
    let slotLayoutErrorLogged = false;

    function state() {
      try {
        return getState() || { settings: {}, tables: [] };
      } catch (error) {
        if (!getStateErrorLogged) {
          getStateErrorLogged = true;
          root.console?.warn?.("[simulator] render-adapter getState() threw; using empty state.", error);
        }
        return { settings: {}, tables: [] };
      }
    }

    function roundPercent(value) {
      return Math.round(Number(value || 0) * 1000) / 1000;
    }

    function slotKitReady() {
      return seatSlotsKit && typeof seatSlotsKit.layoutTable === "function";
    }

    function currentTableTier() {
      const count = Number(state().settings?.tableCount || 1);
      if (count >= 4) return "T4";
      if (count === 2) return "T2";
      return "T1";
    }

    // QHD-tier breakpoint: 2560x1440 and up gets denser felt/HUD metrics.
    const VIEWPORT_QHD_MIN_WIDTH = 2560;
    const VIEWPORT_QHD_MIN_HEIGHT = 1440;

    function currentViewportTier() {
      const width = Number(root?.innerWidth || 0);
      const height = Number(root?.innerHeight || 0);
      return width >= VIEWPORT_QHD_MIN_WIDTH || height >= VIEWPORT_QHD_MIN_HEIGHT ? "QHD" : "FHD";
    }

    function currentUiScale() {
      const datasetScale = root?.document?.documentElement?.dataset?.simulatorUiScale;
      const settingsScale = state().settings?.uiScale;
      return String(datasetScale || settingsScale || "standard").trim().toLowerCase();
    }

    function dealerSeatId(table) {
      const dealer = table?.seats?.find((seat) => seat?.dealer);
      return Number.isFinite(Number(dealer?.id)) ? Number(dealer.id) : 0;
    }

    function slotPhase(table) {
      const runout = allInRunoutStageState(table);
      if (runout && runout.complete === false) return "all-in";
      if (table?.street === "showdown" || table?.status === "showdown") return "finished-reveal";
      const seats = Array.isArray(table?.seats) ? table.seats : [];
      const hasRevealedSeat = seats.some((seat) => {
        if (seat?.isHero) return false;
        const cardState = seatCardState(table, seat) || {};
        return cardState.reveal === true || /is-revealed-(?:river|showdown|live)/.test(String(cardState.className || ""));
      });
      if (hasRevealedSeat) return "finished-reveal";
      if (usesBoardLayout(table) || Number(visibleBoardLength(table) || 0) > 0) return "postflop-bets";
      return "preflop-blinds";
    }

    function slotLayoutContext(table) {
      const playerCount = Array.isArray(table?.seats)
        ? table.seats.length
        : Number(state().settings?.playerCount || 8);
      const tier = currentTableTier();
      const viewport = currentViewportTier();
      const uiScale = currentUiScale();
      const phase = slotPhase(table);
      const dealerId = dealerSeatId(table);
      const key = [
        tier,
        viewport,
        uiScale,
        playerCount,
        phase,
        dealerId
      ].join(":");
      return { key, tier, viewport, uiScale, playerCount, phase, dealerSeatId: dealerId };
    }

    function cacheSlotLayout(key, layout) {
      const rectById = new Map();
      if (Array.isArray(layout?.rects)) {
        layout.rects.forEach((rect) => {
          if (rect?.id) rectById.set(String(rect.id), rect);
        });
      }
      const entry = { key, layout, rectById };
      if (slotLayoutCache.has(key)) slotLayoutCache.delete(key);
      slotLayoutCache.set(key, entry);
      while (slotLayoutCache.size > SLOT_LAYOUT_CACHE_LIMIT) {
        const oldestKey = slotLayoutCache.keys().next().value;
        slotLayoutCache.delete(oldestKey);
      }
      return entry;
    }

    function cachedSlotLayout(key) {
      const entry = slotLayoutCache.get(key);
      if (!entry) return null;
      slotLayoutCache.delete(key);
      slotLayoutCache.set(key, entry);
      return entry;
    }

    function slotLayoutEntry(table) {
      if (!slotKitReady() || !table) return null;
      const context = slotLayoutContext(table);
      const objectCached = slotLayoutObjectCache.get(table);
      if (objectCached?.key === context.key) return objectCached.entry;
      const cached = cachedSlotLayout(context.key);
      if (cached) {
        slotLayoutObjectCache.set(table, { key: context.key, entry: cached });
        return cached;
      }
      try {
        const layout = seatSlotsKit.layoutTable({
          tier: context.tier,
          viewport: context.viewport,
          uiScale: context.uiScale,
          playerCount: context.playerCount,
          phase: context.phase,
          dealerSeatId: context.dealerSeatId,
          tolerance: 0.3
        });
        const entry = cacheSlotLayout(context.key, layout);
        slotLayoutObjectCache.set(table, { key: context.key, entry });
        return entry;
      } catch (error) {
        if (!slotLayoutErrorLogged) {
          slotLayoutErrorLogged = true;
          root.console?.warn?.("[simulator] seatSlotsKit.layoutTable() threw; falling back to legacy geometry.", error);
        }
        return null;
      }
    }

    function slotLayout(table) {
      return slotLayoutEntry(table)?.layout || null;
    }

    function slotRectFromEntry(entry, seatId, kind) {
      if (!entry?.rectById) return null;
      const id = `seat-${Number(seatId)}-${kind}`;
      return entry.rectById.get(id) || null;
    }

    function slotPointFromEntry(entry, seatId, kind) {
      const rect = slotRectFromEntry(entry, seatId, kind);
      if (!rect?.center) return null;
      const x = Number(rect.center.x);
      const y = Number(rect.center.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x: roundPercent(x), y: roundPercent(y) };
    }

    function slotRect(table, seatId, kind) {
      return slotRectFromEntry(slotLayoutEntry(table), seatId, kind);
    }

    function slotPoint(table, seatId, kind) {
      return slotPointFromEntry(slotLayoutEntry(table), seatId, kind);
    }

    function pointDelta(from, to) {
      if (!from || !to) return { x: 0, y: 0 };
      return {
        x: roundPercent(Number(to.x) - Number(from.x)),
        y: roundPercent(Number(to.y) - Number(from.y))
      };
    }

    function legacyBetPoint(table, seatId) {
      const point = legacySeatPoint(table, seatId);
      const seat = table?.seats?.find((item) => Number(item.id) === Number(seatId));
      const isBlindMarker = isBlindBetMarker(table, seat, seatId);
      if (isBlindMarker) {
        return legacyBlindSeatBetPoint(table, seatId, point);
      }
      if (Number(seatId) === 0) {
        // Clamp the hero felt-bet chip to a safe zone: 12-88% width, 16-84% height,
        // keeping it off the table edges and away from UI elements.
        const HERO_BET_CLAMP = { xMin: 12, xMax: 88, yMin: 16, yMax: 84 };
        return legacyClampBetPoint(legacyHeroBetTarget(usesWideTableGeometry(table), table?.seats?.length === 2), HERO_BET_CLAMP);
      }
      if (usesDenseTableGeometry(table)) {
        return legacyCompactSeatBetPoint(table, seatId, point, isBlindMarker);
      }
      return legacyActiveSeatBetPoint(table, point);
    }

    function seatPoint(table, seatId) {
      return slotPoint(table, seatId, "box") || legacySeatPoint(table, seatId);
    }

    function betPoint(table, seatId) {
      return slotPoint(table, seatId, "marker") || legacyBetPoint(table, seatId);
    }

    function actionPoint(table, seatId) {
      return slotPoint(table, seatId, "cards") || slotPoint(table, seatId, "box") || legacyActionPoint(table, seatId);
    }

    function seatZone(point) {
      return legacySeatZone(point);
    }

    function slotDealCardTarget(table, seat, cardIndex) {
      const entry = slotLayoutEntry(table);
      const cards = slotPointFromEntry(entry, seat?.id, "cards");
      if (!cards) return null;
      // Opponent hole cards render CENTRED on the box (the CSS zeroes their
      // horizontal card delta — see simulator-polish.css), so deal to the box
      // centre instead of the resolver's inward-nudged card x. Otherwise the
      // dealt card lands off-centre then pops sideways to its resting spot.
      // Hero keeps the resolver's card x (its big cards are not re-centred).
      const box = slotPointFromEntry(entry, seat?.id, "box");
      const baseX = box && !seat?.isHero ? box.x : cards.x;
      // Dead-top opponents dock their cards below the box (cards.y > box.y); the
      // face-down backs render tucked ONTO the box (CSS), so deal to the box
      // centre too — otherwise the dealt card lands low then pops up to tuck.
      // Bottom-zone opponents mirror this: their hidden backs are CSS-pinned
      // just above the box (--seat-cards-ty override), so the resolver's card
      // dock is not where the back will rest either.
      const tuckTop = box && !seat?.isHero && Number(cards.y) > Number(box.y) + 0.5;
      const tuckBottom = box && !seat?.isHero && !tuckTop && seatZone(box) === "bottom";
      const baseY = tuckTop || tuckBottom ? box.y : cards.y;
      const cardSpread = Number(seat?.isHero) ? 1.4 : 0.95;
      const indexOffset = Number(cardIndex || 0) > 0 ? cardSpread : -cardSpread;
      return {
        x: roundPercent(baseX + indexOffset),
        y: roundPercent(baseY)
      };
    }

    // Authoritative face-up hand centre relative to its owner box. Unlike the
    // old global top/bottom lanes this already includes radial docking plus any
    // bounded tangential P8/P9 correction from simulator-seat-slots.
    function revealPlacement(entry, seatId, fallback) {
      const placements = entry?.layout?.revealCardSeparation?.placements;
      if (!Array.isArray(placements)) return fallback;
      const row = placements.find((placement) => Number(placement.seatId) === Number(seatId));
      if (!row) return fallback;
      return {
        tx: Number.isFinite(Number(row.tx)) ? Number(row.tx) : Number(fallback?.tx || 0),
        ty: Number.isFinite(Number(row.ty)) ? Number(row.ty) : Number(fallback?.ty || 0)
      };
    }

    function seatSlotContext(table, seatId) {
      const entry = slotLayoutEntry(table);
      const box = slotPointFromEntry(entry, seatId, "box");
      if (!box) return null;
      const cards = slotPointFromEntry(entry, seatId, "cards") || box;
      const marker = slotPointFromEntry(entry, seatId, "marker") || null;
      const dealer = slotPointFromEntry(entry, seatId, "dealer") || null;
      const cardsDelta = pointDelta(box, cards);
      const dealerDelta = pointDelta(box, dealer || box);
      const heroMarkerDelta = pointDelta(cards, marker || cards);
      const revealCardPlacement = revealPlacement(entry, seatId, { tx: cardsDelta.x, ty: cardsDelta.y });
      const styleVars = [
        `--seat-anchor-x:${box.x}`,
        `--seat-anchor-y:${box.y}`,
        `--seat-cards-dx:${cardsDelta.x}`,
        `--seat-cards-dy:${cardsDelta.y}`,
        `--seat-cards-tx:${cardsDelta.x}cqw`,
        `--seat-cards-ty:${cardsDelta.y}cqh`,
        `--reveal-card-tx:${revealCardPlacement.tx}cqw`,
        `--reveal-card-ty:${revealCardPlacement.ty}cqh`,
        `--dealer-dx:${dealerDelta.x}`,
        `--dealer-dy:${dealerDelta.y}`,
        `--dealer-tx:${dealerDelta.x}cqw`,
        `--dealer-ty:${dealerDelta.y}cqh`,
        `--hero-marker-dx:${heroMarkerDelta.x}`,
        `--hero-marker-dy:${heroMarkerDelta.y}`,
        `--hero-marker-tx:${heroMarkerDelta.x}cqw`,
        `--hero-marker-ty:${heroMarkerDelta.y}cqh`
      ].join("; ");
      return {
        mode: "slot-model",
        box,
        cards,
        marker,
        dealer,
        cardsDelta,
        dealerDelta,
        heroMarkerDelta,
        zone: seatZone(box),
        styleVars
      };
    }

    function renderTable(table) {
      return tableRenderer.renderTable(table);
    }

    function renderDeckShoe(table) {
      return dealAnimations ? dealAnimations.renderDeckShoe(table) : "";
    }

    function renderDealCards(table) {
      return dealAnimations ? dealAnimations.renderDealCards(table) : "";
    }

    function renderDealCard(table, seat, delayMs, cardIndex, orderIndex = 0) {
      return dealAnimations ? dealAnimations.renderDealCard(table, seat, delayMs, cardIndex, orderIndex) : "";
    }

    function dealAnimationActive(table) {
      return Boolean(dealAnimations?.dealAnimationActive(table));
    }

    function dealCardTarget(table, seat, cardIndex) {
      return dealAnimations
        ? dealAnimations.dealCardTarget(table, seat, cardIndex)
        : slotDealCardTarget(table, seat, cardIndex) || seatPoint(table, seat.id);
    }

    function renderBoard(table) {
      return boardRenderer.renderBoard(table);
    }

    function clearExpiredRenderedAnimations() {
      state().tables.forEach((table) => {
        if (isActionSequenceActive(table) || visualSeatStateLockActive(table)) return;
        if (table.visualActionBaseState || table.visualActionConfirmedState) {
          delete table.visualActionBaseState;
          delete table.visualActionConfirmedState;
          markTableDirty(table.id);
        }
        if (Array.isArray(table.betAnimations) && table.betAnimations.length) {
          // Route through the single owner (tableEffects.clearBetAnimations)
          // instead of assigning the array here; the guard condition is unchanged.
          tableEffects.clearBetAnimations(table, "clear-expired-rendered");
          markTableDirty(table.id);
        }
        if (Array.isArray(table.actionAnimations) && table.actionAnimations.length) {
          table.actionAnimations = [];
          markTableDirty(table.id);
        }
        if (table.visualClosedStreetBets) {
          delete table.visualClosedStreetBets;
          markTableDirty(table.id);
        }
        if (table.actionRevealStartedAt || table.actionSequenceLeadMs) {
          table.actionRevealStartedAt = 0;
          table.actionSequenceLeadMs = 0;
          markTableDirty(table.id);
        }
      });
    }

    function renderSeat(table, seat) {
      return seatRenderer.renderSeat(table, seat);
    }

    function renderSeatCards(table, seat, cardState = seatCardState(table, seat)) {
      if (cardState.empty) return "";
      if (cardState.reveal) {
        return seat.cards.map((card) => renderCard(card, {
          hero: seat.isHero,
          mini: !seat.isHero,
          silent: !seat.isHero,
          cardRole: showdownWinningCardRole(table, card)
        })).join("");
      }
      return seat.cards.map(() => `<span class="sim-card-back" aria-label="закрытая карта"></span>`).join("");
    }

    return {
      tableEffects,
      tableGeometry,
      seatPoint,
      seatZone,
      renderTable,
      renderDeckShoe,
      renderDealCards,
      renderDealCard,
      dealAnimationActive,
      dealCardTarget,
      renderBoard,
      betPoint,
      clearExpiredRenderedAnimations,
      renderSeat,
      renderSeatCards
    };
  }

  root.PokerSimulatorTableRenderAdapter = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorTableRenderAdapter;
})();
