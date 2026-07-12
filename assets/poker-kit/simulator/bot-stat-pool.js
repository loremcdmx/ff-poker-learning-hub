/*
 * Diverse, stat-driven bot pool for training realism and explicit search stress fields.
 *
 * Each archetype is authored as a compact, recognizable STAT LINE (open% per
 * position, BB defend%/3bet% by opener bucket, shape). At load these are
 * realized — via bot-range-realizer.js — into `realizedRanges` maps and wrapped
 * as strategy models the engine seats (Phase A consumes realizedRanges directly).
 *
 * This is what makes "give the bots a stat set and they play it" usable in the
 * product: a coach can edit these numbers (or add a line, e.g. a Winamax-field
 * stat set) and the bots play accordingly.
 *
 * difficulty drives seat-box tier color (easy/standard/pro); style drives the
 * play-style nickname — kept on their own axes (see seat-box-tier-coloring /
 * bot-style-nicknames). SB limping is a known phase-2 gap (limp tree is
 * hero-gated), so every archetype here is raise-or-fold from the SB for now.
 */
(function () {
  "use strict";

  // archetype stat lines. bbDefend/bb3bet are % by opener bucket (btn/co/middle/early).
  const STAT_LINES = [
    {
      id: "stat-canon-reg", label: "Канон-рег (15-11)", difficulty: "pro", style: "reg",
      role: "Exploit-wide methodics 15-11 reg", tableTypes: ["nonHu"], minPlayers: 4, maxPlayers: 9,
      statLine: {
        rfi: { UTG: 19.5, HJ: 26, CO: 46, BTN: 72, SB: 50 },
        bbDefend: { btn: 80, co: 68, middle: 62, early: 50 },
        bb3bet: { btn: 9, co: 8, middle: 6.5, early: 5 }
      }
    },
    {
      id: "stat-nit", label: "Скала (нит)", difficulty: "standard", style: "nit",
      role: "Tight value nit", tableTypes: ["nonHu"], minPlayers: 4, maxPlayers: 9,
      statLine: {
        rfi: { UTG: 10, HJ: 14, CO: 22, BTN: 38, SB: 25 },
        bbDefend: { btn: 38, co: 30, middle: 25, early: 18 },
        bb3bet: { btn: 7, co: 6, middle: 5, early: 4 }
      }
    },
    {
      id: "stat-tag", label: "Солид (TAG)", difficulty: "standard", style: "reg",
      role: "Tight-aggressive reg", tableTypes: ["nonHu"], minPlayers: 4, maxPlayers: 9,
      statLine: {
        rfi: { UTG: 18, HJ: 24, CO: 38, BTN: 52, SB: 40 },
        bbDefend: { btn: 55, co: 45, middle: 38, early: 28 },
        bb3bet: { btn: 10, co: 9, middle: 7, early: 5 }
      }
    },
    {
      id: "stat-lag", label: "Ураган (LAG)", difficulty: "pro", style: "aggro",
      role: "Loose-aggressive", tableTypes: ["nonHu"], minPlayers: 4, maxPlayers: 9,
      statLine: {
        rfi: { UTG: 26, HJ: 34, CO: 54, BTN: 72, SB: 55 },
        bbDefend: { btn: 70, co: 60, middle: 50, early: 38 },
        bb3bet: { btn: 14, co: 12, middle: 9, early: 7 },
        shape: { connectorBonus: 16, suitedBonus: 20 }
      }
    },
    {
      id: "stat-fish", label: "Карась (фиш)", difficulty: "easy", style: "fish",
      role: "Loose-passive recreational", tableTypes: ["nonHu"], minPlayers: 4, maxPlayers: 9,
      statLine: {
        rfi: { UTG: 30, HJ: 38, CO: 52, BTN: 66, SB: 60 },
        bbDefend: { btn: 75, co: 65, middle: 58, early: 45 },
        bb3bet: { btn: 2, co: 2, middle: 1.5, early: 1 },
        shape: { aceOffsuitBonus: 16, offsuitBaseline: 2 }
      }
    },
    {
      id: "stat-station", label: "Колл-Центр (стейшн)", difficulty: "easy", style: "station",
      role: "Calling station", tableTypes: ["nonHu"], minPlayers: 4, maxPlayers: 9,
      statLine: {
        rfi: { UTG: 20, HJ: 26, CO: 40, BTN: 55, SB: 40 },
        bbDefend: { btn: 80, co: 72, middle: 65, early: 52 },
        bb3bet: { btn: 1, co: 1, middle: 1, early: 0.5 },
        shape: { offsuitBaseline: 2 }
      }
    },
    // Explicit future-field stressors. These are real engine models, not abstract arena
    // candidates: every one combines a native production policy with realized preflop ranges.
    // `opponentOnly` keeps them out of stat-line candidate seeding, while the stat-pool boundary
    // already keeps them out of mixed/auto seating. Search and gates opt in through mtt-reg-core.
    {
      id: "mtt-reg-steal-pressure", label: "MTT рег: стил-прессинг", difficulty: "pro", style: "aggro",
      role: "Wide late-position steal pressure", tableTypes: ["nonHu"], minPlayers: 3, maxPlayers: 9,
      stressFamily: "mtt-reg", poolRole: "future-reg-opponent", opponentOnly: true,
      statLine: {
        rfi: { UTG: 22, HJ: 31, CO: 52, BTN: 76, SB: 59 },
        bbDefend: { btn: 65, co: 55, middle: 46, early: 34 },
        bb3bet: { btn: 12, co: 10, middle: 8, early: 6 },
        shape: { connectorBonus: 8, suitedBonus: 12 }
      },
      production: {
        openFrequency: 0.05, sbOpenFrequency: 0.05, threeBetFrequency: 0.06,
        airBet: 0.05, floatChance: 0.04, smallBetFrequency: 0.08, sizeBias: -0.05
      }
    },
    {
      id: "mtt-reg-reshove-icm", label: "MTT рег: решов ICM", difficulty: "pro", style: "aggro",
      role: "Reshove and four-bet pressure", tableTypes: ["hu", "nonHu"], minPlayers: 2, maxPlayers: 9,
      stressFamily: "mtt-reg", poolRole: "future-reg-opponent", opponentOnly: true,
      statLine: {
        rfi: { UTG: 17, HJ: 23, CO: 38, BTN: 58, SB: 48 },
        bbDefend: { btn: 59, co: 49, middle: 39, early: 29 },
        bb3bet: { btn: 16, co: 14, middle: 11, early: 8.5 },
        shape: { aceOffsuitBonus: 10, suitedBonus: 6 }
      },
      production: {
        defenseFrequency: 0.02, threeBetFrequency: 0.14, fourBetFrequency: 0.1,
        jamFrequency: 0.22, topPairBet: 0.04, sizeBias: 0.08
      }
    },
    {
      id: "mtt-reg-bb-defend", label: "MTT рег: защита BB", difficulty: "pro", style: "reg",
      role: "Wide BB defend and counter-pressure", tableTypes: ["hu", "nonHu"], minPlayers: 2, maxPlayers: 9,
      stressFamily: "mtt-reg", poolRole: "future-reg-opponent", opponentOnly: true,
      statLine: {
        rfi: { UTG: 19, HJ: 27, CO: 43, BTN: 65, SB: 52 },
        bbDefend: { btn: 82, co: 73, middle: 62, early: 48 },
        bb3bet: { btn: 11, co: 9, middle: 7, early: 5.5 },
        shape: { connectorBonus: 14, suitedBonus: 18 }
      },
      production: {
        defenseFrequency: 0.16, threeBetFrequency: -0.02, floatChance: 0.06,
        heroCallChance: 0.05, checkRaiseFrequency: 0.06
      }
    },
    {
      id: "mtt-reg-polar-barrel", label: "MTT рег: полярные баррели", difficulty: "pro", style: "aggro",
      role: "Polar barrels and check-raises", tableTypes: ["hu", "nonHu"], minPlayers: 2, maxPlayers: 9,
      stressFamily: "mtt-reg", poolRole: "future-reg-opponent", opponentOnly: true,
      statLine: {
        rfi: { UTG: 21, HJ: 29, CO: 47, BTN: 69, SB: 54 },
        bbDefend: { btn: 68, co: 58, middle: 48, early: 37 },
        bb3bet: { btn: 13.5, co: 11.5, middle: 9, early: 7 },
        shape: { connectorBonus: 12, suitedBonus: 14 }
      },
      production: {
        threeBetFrequency: 0.07, fourBetFrequency: 0.06, drawBet: 0.08,
        overcardBet: 0.08, airBet: 0.15, checkRaiseFrequency: 0.16,
        overbetFrequency: 0.22, jamFrequency: 0.05, sizeBias: 0.14
      }
    },
    {
      id: "mtt-reg-smallball-float", label: "MTT рег: флоаты", difficulty: "pro", style: "reg",
      role: "Small sizing and float pressure", tableTypes: ["nonHu"], minPlayers: 3, maxPlayers: 9,
      stressFamily: "mtt-reg", poolRole: "future-reg-opponent", opponentOnly: true,
      statLine: {
        rfi: { UTG: 23, HJ: 32, CO: 50, BTN: 72, SB: 58 },
        bbDefend: { btn: 76, co: 66, middle: 55, early: 42 },
        bb3bet: { btn: 8, co: 7, middle: 5.5, early: 4 },
        shape: { connectorBonus: 16, suitedBonus: 18 }
      },
      production: {
        openFrequency: 0.03, defenseFrequency: 0.08, floatChance: 0.15,
        heroCallChance: 0.1, donkFrequency: 0.07, checkRaiseFrequency: 0.04,
        smallBetFrequency: 0.22, sizeBias: -0.13
      }
    },
    {
      id: "mtt-reg-thin-value", label: "MTT рег: тонкое вэлью", difficulty: "pro", style: "reg",
      role: "Thin value and bluff-catching", tableTypes: ["hu", "nonHu"], minPlayers: 2, maxPlayers: 9,
      stressFamily: "mtt-reg", poolRole: "future-reg-opponent", opponentOnly: true,
      statLine: {
        rfi: { UTG: 18, HJ: 25, CO: 41, BTN: 62, SB: 49 },
        bbDefend: { btn: 61, co: 51, middle: 42, early: 32 },
        bb3bet: { btn: 10, co: 8.5, middle: 6.5, early: 5 },
        shape: { suitedBonus: 10, aceOffsuitBonus: 6 }
      },
      production: {
        topPairBet: 0.12, weakPairBet: 0.14, airBet: -0.04,
        heroCallChance: 0.08, smallBetFrequency: 0.1, overbetFrequency: -0.06,
        checkRaiseFrequency: 0.03, sizeBias: -0.04
      }
    },
    // Frozen promotion holdout. These profiles are deliberately excluded from every
    // search/adversary panel and from default seating. Search may consume them only through
    // the dedicated confirm-time holdout resolver (explicit model-id diagnostics remain
    // possible); the committed manifest pins their exact realized model fingerprints so a
    // range-realizer or policy drift fails closed.
    {
      id: "mtt-holdout-small-raise", label: "MTT holdout: малые рейзы", difficulty: "pro", style: "reg",
      role: "Flat-call and minimum-raise pressure", tableTypes: ["nonHu"], minPlayers: 3, maxPlayers: 9,
      stressFamily: "mtt-reg", poolRole: "frozen-holdout", opponentOnly: true,
      holdoutOnly: true, holdoutVersion: "mtt-reg-holdout-2026-07-10-v1",
      statLine: {
        rfi: { UTG: 21, HJ: 30, CO: 49, BTN: 71, SB: 57 },
        bbDefend: { btn: 78, co: 69, middle: 58, early: 44 },
        bb3bet: { btn: 6.5, co: 5.5, middle: 4.5, early: 3.5 },
        shape: { connectorBonus: 18, suitedBonus: 19 }
      },
      production: {
        openFrequency: 0.04, defenseFrequency: 0.12, threeBetFrequency: -0.05,
        floatChance: 0.17, heroCallChance: 0.11, smallBetFrequency: 0.25,
        sizeBias: -0.18, checkRaiseFrequency: 0.07
      }
    },
    {
      id: "mtt-holdout-checkraise-chain", label: "MTT holdout: чек-рейз цепь", difficulty: "pro", style: "aggro",
      role: "Delayed aggression and repeated check-raises", tableTypes: ["hu", "nonHu"], minPlayers: 2, maxPlayers: 9,
      stressFamily: "mtt-reg", poolRole: "frozen-holdout", opponentOnly: true,
      holdoutOnly: true, holdoutVersion: "mtt-reg-holdout-2026-07-10-v1",
      statLine: {
        rfi: { UTG: 20, HJ: 28, CO: 45, BTN: 67, SB: 53 },
        bbDefend: { btn: 70, co: 60, middle: 50, early: 38 },
        bb3bet: { btn: 12.5, co: 10.5, middle: 8, early: 6 },
        shape: { connectorBonus: 15, suitedBonus: 16 }
      },
      production: {
        threeBetFrequency: 0.06, drawBet: 0.12, overcardBet: 0.09,
        airBet: 0.12, floatChance: 0.09, checkRaiseFrequency: 0.2,
        overbetFrequency: 0.14, sizeBias: 0.06
      }
    },
    {
      id: "mtt-holdout-icm-squeeze", label: "MTT holdout: ICM сквиз", difficulty: "pro", style: "aggro",
      role: "Squeeze, four-bet and reshove pressure", tableTypes: ["hu", "nonHu"], minPlayers: 2, maxPlayers: 9,
      stressFamily: "mtt-reg", poolRole: "frozen-holdout", opponentOnly: true,
      holdoutOnly: true, holdoutVersion: "mtt-reg-holdout-2026-07-10-v1",
      statLine: {
        rfi: { UTG: 16, HJ: 22, CO: 37, BTN: 57, SB: 47 },
        bbDefend: { btn: 57, co: 47, middle: 38, early: 28 },
        bb3bet: { btn: 17, co: 15, middle: 12, early: 9 },
        shape: { aceOffsuitBonus: 12, suitedBonus: 7 }
      },
      production: {
        defenseFrequency: 0.03, threeBetFrequency: 0.16, fourBetFrequency: 0.12,
        jamFrequency: 0.24, topPairBet: 0.05, sizeBias: 0.12
      }
    },
    {
      id: "mtt-holdout-thin-probe", label: "MTT holdout: тонкие пробы", difficulty: "pro", style: "reg",
      role: "Thin value, bluff-catching and small probes", tableTypes: ["hu", "nonHu"], minPlayers: 2, maxPlayers: 9,
      stressFamily: "mtt-reg", poolRole: "frozen-holdout", opponentOnly: true,
      holdoutOnly: true, holdoutVersion: "mtt-reg-holdout-2026-07-10-v1",
      statLine: {
        rfi: { UTG: 18, HJ: 25, CO: 42, BTN: 63, SB: 50 },
        bbDefend: { btn: 64, co: 54, middle: 44, early: 33 },
        bb3bet: { btn: 9.5, co: 8, middle: 6, early: 4.5 },
        shape: { suitedBonus: 12, aceOffsuitBonus: 7 }
      },
      production: {
        topPairBet: 0.15, weakPairBet: 0.17, airBet: -0.05,
        heroCallChance: 0.12, smallBetFrequency: 0.2, checkRaiseFrequency: 0.05,
        overbetFrequency: -0.07, sizeBias: -0.09
      }
    }
  ];

  function realizePoolModels(realizer) {
    if (!realizer || typeof realizer.realizeStatLine !== "function") return [];
    return STAT_LINES.map((entry) => {
      const realizedRanges = realizer.realizeStatLine(entry.statLine);
      return Object.assign({
        id: entry.id,
        label: entry.label,
        role: entry.role,
        difficulty: entry.difficulty,
        style: entry.style,
        archetype: entry.style,
        tableTypes: entry.tableTypes,
        minPlayers: entry.minPlayers,
        maxPlayers: entry.maxPlayers,
        statLine: entry.statLine,
        realizedRanges,
        useRealizedRanges: true,
        source: "bot-stat-pool"
      }, entry.production ? { production: Object.assign({}, entry.production) } : {},
      entry.stressFamily ? {
        stressFamily: entry.stressFamily,
        poolRole: entry.poolRole,
        opponentOnly: entry.opponentOnly === true,
        holdoutOnly: entry.holdoutOnly === true,
        holdoutVersion: entry.holdoutVersion || ""
      } : {});
    });
  }

  const root = typeof window !== "undefined" ? window : globalThis;
  const realizer = root.PokerSimulatorBotRangeRealizer || null;
  const api = {
    schema: "poker-simulator-bot-stat-pool-v1",
    STAT_LINES,
    realizePoolModels,
    // realized eagerly when the realizer is already loaded (engine load order),
    // else the consumer can call realizePoolModels(realizer) after it loads.
    models: realizer ? realizePoolModels(realizer) : []
  };
  root.PokerSimulatorBotStatPool = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
