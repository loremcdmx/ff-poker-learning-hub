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
          actions: { fold: 74.5, call: 3.5, raise: 2.0, jam: 20.0 },
        },
        r15_18: {
          opportunities: 33468,
          players: 1246,
          spotEvBb100: -5.35,
          actions: { fold: 73.6, call: 12.5, raise: 3.7, jam: 10.2 },
        },
        gapBb100: 9.84,
        jamToCallSwaps: {
          QJs: { league1: { call: 7.2, jam: 91.3 }, r15_18: { call: 61.4, jam: 26.5 } },
          QTs: { league1: { call: 22.4, jam: 72.4 }, r15_18: { call: 74.4, jam: 10.5 } },
          KTs: { league1: { call: 11.5, jam: 86.5 }, r15_18: { call: 60.8, jam: 26.8 } },
          "55": { league1: { call: 0.9, jam: 95.5 }, r15_18: { call: 50.4, jam: 36.5 } },
          JTs: { league1: { call: 16.7, jam: 80.6 }, r15_18: { call: 64.4, jam: 19.5 } },
        },
      },
    },
  };
})();
