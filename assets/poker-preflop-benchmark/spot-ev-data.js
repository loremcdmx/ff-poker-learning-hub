(function () {
  "use strict";

  window.PokerPreflopBenchmarkEvData = {
    schemaVersion: 1,
    source: {
      system: "MSP",
      windowStart: "2025-10-01T00:00:00Z",
      windowEndExclusive: "2026-07-22T00:00:00Z",
      rankSemantics: "rank_at_hand",
      metric: "all_in_adjusted_net_ev_bb_per_100_spot_opportunities",
    },
    spots: {
      "SB|BTN|2x|18-25": {
        league1: {
          opportunities: 25794,
          players: 238,
          spotEvBb100: 4.49,
          actions: { fold: 74.5, call: 3.5, raise: 2.3, jam: 19.8 },
        },
        r15_18: {
          opportunities: 33468,
          players: 1246,
          spotEvBb100: -5.35,
          actions: { fold: 73.6, call: 12.5, raise: 3.7, jam: 10.2 },
        },
        gapBb100: 9.84,
        jamToCallSwaps: {
          QJs: { league1: { call: 7, jam: 88 }, r15_18: { call: 62, jam: 26 } },
          QTs: { league1: { call: 22, jam: 72 }, r15_18: { call: 75, jam: 9 } },
          KTs: { league1: { call: 12, jam: 86 }, r15_18: { call: 61, jam: 26 } },
          "55": { league1: { call: 1, jam: 93 }, r15_18: { call: 51, jam: 35 } },
          JTs: { league1: { call: 17, jam: 80 }, r15_18: { call: 64, jam: 20 } },
        },
      },
    },
  };
})();
