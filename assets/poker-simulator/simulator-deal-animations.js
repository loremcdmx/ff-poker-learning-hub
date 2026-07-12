(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  // ANI-1: deal-card target geometry offsets (percent units). Values preserved
  // exactly from the original dealCardTarget() inline literals.
  const DEAL_TARGET_OFFSETS = {
    side: 2.2, // ± lateral nudge by card index (right card +, left card -)
    heroYMin: 70, // floor for hero card y (Math.max clamp)
    heroYUp: 18, // hero cards lifted upward from seat point
    topYDown: 16, // top-zone cards pushed down from seat point
    bottomYUp: 15, // bottom-zone cards lifted up from seat point
    sideZoneX: 10, // left/right-zone horizontal inset toward center
    sideZoneYUp: 7 // left/right-zone cards lifted up from seat point
  };

  // ANI-2: deal-card rotations in degrees, indexed by cardIndex (0, 1).
  // Start rotation per card; end rotation per card. Values preserved exactly.
  const DEAL_CARD_ROTATIONS = [-10, 7];
  const DEAL_CARD_END_ROTATIONS = [-7, 7];

  // ANI-3: deal-card stagger delay (ms). Identical expression to the original
  // inline formula in renderDealCards().
  function dealCardDelay(cardIndex, orderIndex, seatCount, seatGap) {
    return cardIndex * seatCount * seatGap + orderIndex * seatGap;
  }

  function model({
    usesDecorativeMotionLayer = () => true,
    isVisualActive = () => false,
    compactTimingMs = (regular) => regular,
    dealRevealDurationForTable = () => 0,
    dealSeatGapMs = 0,
    compactDealSeatGapMs = 0,
    dealCardDurationMs = 0,
    compactDealCardDurationMs = 0,
    seatPoint = () => ({ x: 50, y: 50 }),
    slotDealCardTarget = null,
    seatZone = () => "",
    now = () => Date.now()
  } = {}) {
    function dealAnimationActive(table) {
      if (!isVisualActive(table, "dealRevealUntil")) return false;
      const actionStartedAt = Number(table?.actionRevealStartedAt || 0);
      const actionLeadMs = Math.max(0, Number(table?.actionSequenceLeadMs || 0));
      if (!actionStartedAt || !actionLeadMs) return true;
      // Elapsed against the injected clock (the visual layer's single now source),
      // not raw wall-clock — see simulator-visual-now-contract-smoke.mjs.
      return now() - actionStartedAt < actionLeadMs;
    }

    function renderDeckShoe(table) {
      if (!usesDecorativeMotionLayer() || !dealAnimationActive(table)) return "";
      const shoeDuration = dealRevealDurationForTable(table);
      return `<div class="deck-shoe" data-animation-key="deck-shoe" style="--deal-shoe-duration:${shoeDuration}ms;" aria-hidden="true"></div>`;
    }

    function renderDealCards(table) {
      if (!usesDecorativeMotionLayer() || !dealAnimationActive(table)) return "";
      const seats = table?.seats || [];
      const sbIndex = seats.findIndex((seat) => seat.position === "SB");
      const dealOrder = sbIndex >= 0
        ? [...seats.slice(sbIndex), ...seats.slice(0, sbIndex)]
        : seats;
      const seatCount = dealOrder.length || 1;
      return dealOrder
        .flatMap((seat, orderIndex) => [0, 1].map((cardIndex) => {
          const seatGap = compactTimingMs(dealSeatGapMs, compactDealSeatGapMs);
          const delay = dealCardDelay(cardIndex, orderIndex, seatCount, seatGap);
          return renderDealCard(table, seat, delay, cardIndex, orderIndex);
        }))
        .join("");
    }

    function renderDealCard(table, seat, delayMs, cardIndex, orderIndex = 0) {
      const point = dealCardTarget(table, seat, cardIndex);
      const startRot = cardIndex ? DEAL_CARD_ROTATIONS[1] : DEAL_CARD_ROTATIONS[0];
      const endRot = cardIndex ? DEAL_CARD_END_ROTATIONS[1] : DEAL_CARD_END_ROTATIONS[0];
      const cardDuration = compactTimingMs(dealCardDurationMs, compactDealCardDurationMs);
      return `<span class="deal-card" data-animation-key="deal-card-${orderIndex}-${cardIndex}" style="--deal-x:${point.x}%; --deal-y:${point.y}%; --deal-delay:${delayMs}ms; --deal-card-duration:${cardDuration}ms; --start-rot:${startRot}deg; --end-rot:${endRot}deg;" aria-hidden="true"></span>`;
    }

    function dealCardTarget(table, seat, cardIndex) {
      if (typeof slotDealCardTarget === "function") {
        const target = slotDealCardTarget(table, seat, cardIndex);
        if (target && Number.isFinite(Number(target.x)) && Number.isFinite(Number(target.y))) {
          return target;
        }
      }
      const point = seatPoint(table, seat.id);
      const zone = seatZone(point);
      const sideOffset = cardIndex ? DEAL_TARGET_OFFSETS.side : -DEAL_TARGET_OFFSETS.side;
      if (seat.isHero) {
        return { x: point.x + sideOffset, y: Math.max(DEAL_TARGET_OFFSETS.heroYMin, point.y - DEAL_TARGET_OFFSETS.heroYUp) };
      }
      if (zone === "top") return { x: point.x + sideOffset, y: point.y + DEAL_TARGET_OFFSETS.topYDown };
      if (zone === "bottom") return { x: point.x + sideOffset, y: point.y - DEAL_TARGET_OFFSETS.bottomYUp };
      if (zone === "left") return { x: point.x + DEAL_TARGET_OFFSETS.sideZoneX + sideOffset, y: point.y - DEAL_TARGET_OFFSETS.sideZoneYUp };
      if (zone === "right") return { x: point.x - DEAL_TARGET_OFFSETS.sideZoneX + sideOffset, y: point.y - DEAL_TARGET_OFFSETS.sideZoneYUp };
      return { x: point.x + sideOffset, y: point.y };
    }

    return {
      dealAnimationActive,
      renderDeckShoe,
      renderDealCards,
      renderDealCard,
      dealCardTarget
    };
  }

  root.PokerSimulatorDealAnimations = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
