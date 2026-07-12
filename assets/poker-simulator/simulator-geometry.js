(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  const seatLayouts = {
    2: [[50, 95], [50, 0.8]],
    3: [[50, 95], [0.8, 51], [99.2, 51]],
    4: [[50, 95], [0.8, 66], [50, 0.8], [99.2, 66]],
    5: [[50, 95], [16, 94], [4.8, 19], [95.2, 19], [84, 94]],
    6: [[50, 95], [17, 90], [0.8, 51], [31, 0.8], [69, 0.8], [99.2, 51]],
    7: [[50, 95], [23, 90], [0.8, 58], [23, 3.5], [77, 3.5], [99.2, 58], [77, 90]],
    8: [[50, 95], [26, 90], [0.8, 61], [17, 6.5], [50, 0.8], [83, 6.5], [99.2, 61], [74, 90]],
    9: [[50, 95], [26, 90], [1, 64], [6, 30], [34, 3], [66, 3], [94, 30], [99, 64], [74, 90]]
  };

  const roomySeatLayouts = {
    6: [[50, 95], [14, 77], [0.8, 51], [31, 0.8], [69, 0.8], [99.2, 51]],
    7: [[50, 95], [18, 77], [0.8, 57], [23, 3.5], [77, 3.5], [99.2, 57], [82, 77]],
    8: [[50, 95], [18, 76], [0.8, 59], [17, 6.5], [50, 0.8], [83, 6.5], [99.2, 59], [82, 76]],
    9: [[50, 95], [19, 77], [0.8, 62], [6, 30], [34, 3], [66, 3], [94, 30], [99.2, 62], [81, 77]]
  };

  const denseSeatLayouts = {
    2: [[50, 92], [50, 1.8]],
    3: [[50, 92], [0.8, 51], [99.2, 51]],
    4: [[50, 92], [0.8, 64], [50, 1.8], [99.2, 64]],
    5: [[50, 92], [18, 82], [4.8, 19], [95.2, 19], [82, 82]],
    6: [[50, 92], [18, 82], [0.8, 51], [31, 1.8], [69, 1.8], [99.2, 51]],
    7: [[50, 92], [22, 82], [0.8, 58], [23, 3.5], [77, 3.5], [99.2, 58], [78, 82]],
    8: [[50, 92], [24, 82], [0.8, 61], [17, 6.5], [50, 1.8], [83, 6.5], [99.2, 61], [76, 82]],
    9: [[50, 92], [24, 82], [1, 64], [6, 30], [34, 3], [66, 3], [94, 30], [99, 64], [76, 82]]
  };

  function roundedPull(point, xPull, yPull) {
    return {
      x: Math.round((50 + (point.x - 50) * xPull) * 10) / 10,
      y: Math.round((50 + (point.y - 50) * yPull) * 10) / 10
    };
  }

  function clampBetPoint(target, bounds = {}) {
    const {
      xMin = 8.5,
      xMax = 91.5,
      yMin = 10,
      yMax = 88
    } = bounds;
    return {
      x: Math.min(xMax, Math.max(xMin, target.x)),
      y: Math.min(yMax, Math.max(yMin, target.y))
    };
  }

  // Push an opponent box outward from the felt centre toward the 3D table rim
  // (the shell border). Horizontal: every opponent slides toward the L/R rim.
  // Vertical: only the TOP half lifts toward the top rim — the bottom half stays
  // put (pinned by the action bar) and the hero box (seat 0) never moves. Factors
  // are tuned so the box outer edge rests just inside the shell across FHD/QHD/4K
  // (the side rim-gap is a near-constant ~5.3% of felt width on all three, so one
  // factor scales); verified by the geometry probe + the layout-smoke "no element
  // outside shell" gate. seatPoint is the single source, so the box, dealt-card
  // targets, note bubbles, chip-flight origins, pot awards and action bubbles all
  // follow the box to the rim, while opponent bet markers keep their fixed
  // per-zone targets (they sit between the moved box and the pot).
  function pushSeatToRim(seatId, x, y) {
    if (Number(seatId) === 0) return { x, y };
    const KX = 1.062;
    const KY = 1.04;
    const RIM_MIN = 2;
    const RIM_MAX = 98;
    const nx = 50 + (x - 50) * KX;
    const ny = y < 50 ? 50 + (y - 50) * KY : y;
    // A dense top seat can be pushed past the felt edge (e.g. y -> -0.1). Clamp
    // back inside the felt rim so the box never lands off the table.
    const clampedX = Math.min(RIM_MAX, Math.max(RIM_MIN, nx));
    const clampedY = Math.min(RIM_MAX, Math.max(RIM_MIN, ny));
    return { x: Math.round(clampedX * 10) / 10, y: Math.round(clampedY * 10) / 10 };
  }

  // Single source of truth for the hero (seat 0) bet-chip position. Heads-up
  // keeps the chip stack below the board lane; non-HU keeps it to the right of
  // the hero hole-cards (card span 43.2-59.2% of the felt) so the chip never
  // overlaps the cards. Consumed by blindSeatBetPoint and the table renderer.
  function heroBetTarget(wide, headsUp = false) {
    // Heads-up: keep the centred bet below the board reveal lane. The old 56%
    // target lived inside the lower edge of the board cards, so calls/blinds
    // could visually land on the board before the street finished animating.
    if (headsUp) return { x: 50, y: wide ? 63.2 : 62.4 };
    return { x: 66, y: wide ? 75 : 76 };
  }

  function seatZone(point) {
    if (point.y <= 14) return "top";
    if (point.y >= 86) return "bottom";
    if (point.x <= 12) return "left";
    if (point.x >= 88) return "right";
    if (point.y < 32) return "top";
    if (point.y > 72) return "bottom";
    return point.x < 50 ? "left" : "right";
  }

  function geometry(options = {}) {
    const getPlayerCount = typeof options.getPlayerCount === "function" ? options.getPlayerCount : () => 8;
    const getTableCount = typeof options.getTableCount === "function" ? options.getTableCount : () => 1;
    const usesBoardLayout = typeof options.usesBoardLayout === "function" ? options.usesBoardLayout : () => false;

    function usesDenseTableGeometry(table) {
      return Boolean(table) && Number(getTableCount() || 1) >= 4;
    }

    function seatLayoutFor(table, count) {
      if (usesDenseTableGeometry(table) && denseSeatLayouts[count]) return denseSeatLayouts[count];
      if (roomySeatLayouts[count]) return roomySeatLayouts[count];
      return seatLayouts[count] || seatLayouts[8];
    }

    function seatPoint(table, seatId) {
      const count = table?.seats?.length || Number(getPlayerCount()) || 8;
      const layout = seatLayoutFor(table, count);
      const point = layout[Number(seatId)] || [50, 50];
      return pushSeatToRim(seatId, point[0], point[1]);
    }

    function usesWideTableGeometry(table) {
      if (!usesDenseTableGeometry(table)) return false;
      if (typeof root?.innerWidth !== "number" || typeof root?.innerHeight !== "number") return false;
      return root.innerWidth >= 1800 && root.innerHeight >= 1100;
    }

    function hasBoardLayout(table) {
      if (usesBoardLayout(table)) return true;
      const street = String(table?.street || "").toLowerCase();
      if (street && street !== "preflop") return true;
      return Number(table?.boardRevealFrom || 0) > 0 || Number(table?.visibleBoardLength || 0) > 0;
    }

    function boardSafeBetPoint(table, seatPointValue, target) {
      if (!hasBoardLayout(table)) return target;
      const zone = seatZone(seatPointValue);
      const dense = usesDenseTableGeometry(table);
      if (zone === "left") {
        return { x: Math.min(target.x, dense ? 12.5 : 8.8), y: target.y };
      }
      if (zone === "right") {
        return { x: Math.max(target.x, dense ? 87.5 : 91.2), y: target.y };
      }
      return target;
    }

    function blindSeatBetPoint(table, seatId, seatPointValue) {
      const zone = seatZone(seatPointValue);
      const dense = usesDenseTableGeometry(table);
      const wide = usesWideTableGeometry(table);
      const boardLayout = hasBoardLayout(table);
      // Two-table grid: the felt is half-width (like the 4-table grid) but the
      // seat boxes keep their bigger mid-tier size, so the roomy single-table
      // %-offsets land the blind marker ON the box panel. Side/vertical
      // offsets need their own, larger tier here.
      const twoTableFelt = !dense && Boolean(table) && Number(getTableCount() || 1) === 2;
      const headsUp = table?.seats?.length === 2;
      const bottomSideSeat = zone === "bottom" && Math.abs(Number(seatPointValue.x || 50) - 50) >= 20;
      const centerNudge = wide ? 0.14 : (dense ? 0.08 : 0.1);
      const x = Math.round((seatPointValue.x + (50 - seatPointValue.x) * centerNudge) * 10) / 10;
      const y = Math.round((seatPointValue.y + (50 - seatPointValue.y) * centerNudge) * 10) / 10;
      const sideOffset = wide ? 10.8 : (dense ? 13.2 : twoTableFelt ? 23 : 15.5);
      const verticalOffset = wide ? 12.2 : (dense ? 14.4 : twoTableFelt ? 19 : 17);
      let target = { x, y };
      if (zone === "bottom") {
        if (Number(seatId) === 0) {
          target = heroBetTarget(wide, headsUp);
        } else if (bottomSideSeat) {
          const awayFromHero = seatPointValue.x >= 50 ? 1 : -1;
          // After the rim-push the bottom-side box sits at the corner; on the
          // tighter non-wide (FHD) felt the blind marker must pull further toward
          // centre and up to clear the box panel (matches compactSeatBetPoint).
          // The half-width two-table felt additionally lifts it away from the
          // hero felt-bet row (they collided at 9-max).
          const bottomSideX = wide
            ? (awayFromHero > 0 ? 70.8 : 29.2)
            : boardLayout
              ? (awayFromHero > 0 ? 57 : 43)
              : awayFromHero > 0
                ? (twoTableFelt ? 65 : 62)
                : (twoTableFelt ? 35 : 38);
          const bottomSideY = wide ? 72.8 : (boardLayout ? 64 : (twoTableFelt ? 69 : 71));
          target = {
            x: bottomSideX,
            y: bottomSideY
          };
        } else {
          target = { x, y: Math.round((seatPointValue.y - verticalOffset) * 10) / 10 };
        }
      } else if (zone === "top") {
        // Heads-up: the lone villain sits top-centre exactly above the centred
        // pot pill — a centred marker covers the POT text. Shift it beside the
        // pot (mirrors the hero HU bet living below the board lane).
        target = { x: headsUp ? 63 : x, y: Math.round((seatPointValue.y + verticalOffset) * 10) / 10 };
      } else if (zone === "left") {
        target = {
          x: boardLayout ? (dense ? 12.5 : 8.8) : (wide ? 30.8 : 29.6),
          y: boardLayout ? 44.5 : (Number(seatPointValue.y || 50) > 70 ? 64 : y)
        };
      } else if (zone === "right") {
        target = {
          x: boardLayout ? (dense ? 87.5 : 91.2) : (wide ? 69.2 : 70.4),
          y: boardLayout ? 44.5 : (Number(seatPointValue.y || 50) > 70 ? 64 : y)
        };
      }
      return clampBetPoint(boardSafeBetPoint(table, seatPointValue, target), {
        xMin: boardLayout ? 8.5 : (wide ? 12.5 : (dense ? 15.5 : 10.5)),
        xMax: boardLayout ? 91.5 : (wide ? 87.5 : (dense ? 84.5 : 89.5)),
        yMin: wide ? 12.5 : (dense ? 15 : 12.5),
        yMax: wide ? 86.5 : (dense ? 84 : 86)
      });
    }

    function compactSeatBetPoint(table, seatId, seatPointValue, isBlindMarker) {
      if (isBlindMarker) return blindSeatBetPoint(table, seatId, seatPointValue);
      const zone = seatZone(seatPointValue);
      const boardLayout = hasBoardLayout(table);
      const dense = usesDenseTableGeometry(table);
      const wide = usesWideTableGeometry(table);
      const sideDistance = Math.abs(Number(seatPointValue.x || 50) - 50);
      const isWideSideSeat = wide && sideDistance >= 22;
      const xPull = isWideSideSeat ? 0.88 : (wide ? 0.74 : 0.6);
      const yPull = wide ? 0.64 : 0.54;
      let target = roundedPull(seatPointValue, xPull, yPull);
      if (zone === "bottom") {
        // Bottom-side opponents: after the rim-push their boxes sit at the bottom
        // corners, so the bet must pull toward centre (clear of the corner box) and
        // sit a touch higher. Wide (QHD-tall/4K) had clearance already; the tighter
        // non-wide (FHD) dense layout pulls further in and up to clear the panel.
        target = {
          x: seatPointValue.x >= 50 ? 57 : 43,
          y: 64
        };
      } else if (zone === "left") {
        target = {
          x: boardLayout ? (dense ? 12.5 : 8.8) : (wide ? 30.8 : 29.6),
          y: boardLayout ? 44.5 : (Number(seatPointValue.y || 50) > 70 ? 64 : Math.round((50 + (seatPointValue.y - 50) * yPull) * 10) / 10)
        };
      } else if (zone === "right") {
        target = {
          x: boardLayout ? (dense ? 87.5 : 91.2) : (wide ? 69.2 : 70.4),
          y: boardLayout ? 44.5 : (Number(seatPointValue.y || 50) > 70 ? 64 : Math.round((50 + (seatPointValue.y - 50) * yPull) * 10) / 10)
        };
      } else if (zone === "top") {
        target = {
          // HU villain marker shifts beside the centred pot pill (see
          // blindSeatBetPoint top-zone note).
          x: table?.seats?.length === 2 ? 63 : target.x,
          y: Math.max(wide ? 23.5 : 19.5, target.y)
        };
      }
      return clampBetPoint(boardSafeBetPoint(table, seatPointValue, target), {
        xMin: boardLayout ? 8.5 : (wide ? 12.5 : 16),
        xMax: boardLayout ? 91.5 : (wide ? 87.5 : 84),
        yMin: wide ? 13.5 : 16,
        yMax: wide ? 86 : 82
      });
    }

    function activeSeatBetPoint(table, seatPointValue) {
      const zone = seatZone(seatPointValue);
      const boardLayout = hasBoardLayout(table);
      const sideDistance = Math.abs(Number(seatPointValue.x || 50) - 50);
      const isSideSeat = sideDistance >= 24;
      const xPull = isSideSeat ? 0.82 : 0.58;
      const yPull = 0.56;
      let target = {
        x: Math.round((50 + (seatPointValue.x - 50) * xPull) * 10) / 10,
        y: Math.round((50 + (seatPointValue.y - 50) * yPull) * 10) / 10
      };
      if (zone === "top") {
        target = {
          // HU villain marker shifts beside the centred pot pill (see
          // blindSeatBetPoint top-zone note).
          x: table?.seats?.length === 2 ? 63 : target.x,
          y: Math.max(isSideSeat ? 25.8 : 24.8, target.y)
        };
      } else if (zone === "bottom") {
        if (isSideSeat) {
          const awayFromHero = seatPointValue.x >= 50 ? 1 : -1;
          target = {
            x: awayFromHero > 0 ? 57 : 43,
            y: 64
          };
        } else {
          target = {
            x: 66,
            y: Math.min(69.8, target.y)
          };
        }
      } else if (zone === "left") {
        target = {
          x: boardLayout ? 8.8 : (isSideSeat ? 30.8 : target.x),
          y: boardLayout ? 44.5 : (Number(seatPointValue.y || 50) > 70 ? 64 : target.y)
        };
      } else if (zone === "right") {
        target = {
          x: boardLayout ? 91.2 : (isSideSeat ? 69.2 : target.x),
          y: boardLayout ? 44.5 : (Number(seatPointValue.y || 50) > 70 ? 64 : target.y)
        };
      }
      return clampBetPoint(boardSafeBetPoint(table, seatPointValue, target), {
        xMin: boardLayout ? 8.5 : 13,
        xMax: boardLayout ? 91.5 : 87,
        yMin: 17.5,
        yMax: 82
      });
    }

    function actionPoint(table, seatId) {
      const point = seatPoint(table, seatId);
      return roundedPull(point, 0.78, 0.78);
    }

    return {
      seatLayouts,
      seatPoint,
      usesDenseTableGeometry,
      usesWideTableGeometry,
      compactSeatBetPoint,
      activeSeatBetPoint,
      blindSeatBetPoint,
      heroBetTarget,
      clampBetPoint,
      boardSafeBetPoint,
      actionPoint,
      seatZone
    };
  }

  root.PokerSimulatorGeometry = {
    seatLayouts,
    clampBetPoint,
    seatZone,
    heroBetTarget,
    geometry
  };
})();
