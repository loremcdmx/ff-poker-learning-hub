#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(process.argv[2] || resolve(toolDir, ".."));
mkdirSync(outputDir, { recursive: true });

const sharedSource = {
  system: "MSP",
  availability: "methodology_only",
  publicationGate: "full_window_latest_first_all_cohorts_n50",
  intendedWindowStart: "2023-09-01T00:00:00Z",
  intendedWindowEndExclusive: "2026-07-22T00:00:00Z",
  rankSemantics: "rank_at_hand",
  partialSourcesPublished: false,
  reason: "Полный источник не прошёл проверку целостности; частичные шарды и прежние проценты не публикуются.",
};

const fieldPayload = {
  schemaVersion: 3,
  source: {
    ...sharedSource,
    cohorts: { league1: [1, 5], leagues2_3: [6, 14], r15_18: [15, 18] },
    handMinimum: 50,
    requiredHandsPerChart: 169,
  },
  trainers: {
    vs_raise_free: { slices: [] },
    vs_raise_sb: { slices: [] },
    sb_unopened: { slices: [] },
  },
};

const evPayload = {
  schemaVersion: 3,
  source: {
    ...sharedSource,
    metric: "all_in_adjusted_net_ev_bb_per_100_spot_opportunities",
    actionSource: "PokerPreflopBenchmarkData",
  },
  spots: {},
};

const fieldPath = resolve(outputDir, "field-data.js");
const evPath = resolve(outputDir, "spot-ev-data.js");
writeFileSync(fieldPath, `(function(){window.PokerPreflopBenchmarkData=${JSON.stringify(fieldPayload)};})();\n`);
writeFileSync(evPath, `(function(){window.PokerPreflopBenchmarkEvData=${JSON.stringify(evPayload)};})();\n`);
console.log(JSON.stringify({ fieldPath, evPath, availability: "methodology_only" }, null, 2));
