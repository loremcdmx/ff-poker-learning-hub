import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const input = process.argv[2];
const sbOverrideFlag = process.argv.indexOf("--sb-unopened");
const sbOverride = sbOverrideFlag >= 0 ? process.argv[sbOverrideFlag + 1] : "";
const freeOverrideFlag = process.argv.indexOf("--vs-raise-free");
const freeOverride = freeOverrideFlag >= 0 ? process.argv[freeOverrideFlag + 1] : "";
const windowStartFlag = process.argv.indexOf("--window-start");
const mainWindowStart = windowStartFlag >= 0 ? process.argv[windowStartFlag + 1] : "2025-10-01T00:00:00Z";
if (!input) throw new Error("Usage: node build-field-data.mjs <msp-cube.csv> [--window-start <ISO>] [--vs-raise-free <fine-stack.csv>] [--sb-unopened <full-history-sb.csv>]");
if (sbOverrideFlag >= 0 && !sbOverride) throw new Error("--sb-unopened requires a CSV path");
if (freeOverrideFlag >= 0 && !freeOverride) throw new Error("--vs-raise-free requires a CSV path");
if (windowStartFlag >= 0 && !mainWindowStart) throw new Error("--window-start requires an ISO timestamp");
const output = resolve(toolDir, "../field-data.js");
const MIN_SLICE_ACTIONS = 100;
const MIN_HAND_ACTIONS = 30;
const VALID_HAND = /^(?:([AKQJT98765432])\1|[AKQJT98765432]{2}[so])$/;
const columns = ["folds", "calls", "raises", "jams"];

function parseCsv(source) {
  const lines = source.trim().split(/\r?\n/);
  const header = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(header.map((key, index) => [key, values[index]]));
  });
}

function integerRates(counts) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return { fold: 0, call: 0, raise: 0, jam: 0 };
  const exact = counts.map((count) => count * 100 / total);
  const rounded = exact.map(Math.floor);
  let remaining = 100 - rounded.reduce((sum, value) => sum + value, 0);
  exact.map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach((entry) => { if (remaining > 0) { rounded[entry.index] += 1; remaining -= 1; } });
  return { fold: rounded[0], call: rounded[1], raise: rounded[2], jam: rounded[3] };
}

const baseRows = parseCsv(readFileSync(resolve(input), "utf8"));
let rows = baseRows;
if (freeOverride) {
  const freeRows = parseCsv(readFileSync(resolve(freeOverride), "utf8")).filter((row) => row.trainer === "vs_raise_free");
  rows = rows.filter((row) => row.trainer !== "vs_raise_free").concat(freeRows);
}
if (sbOverride) {
  const sbRows = parseCsv(readFileSync(resolve(sbOverride), "utf8")).filter((row) => row.trainer === "sb_unopened");
  rows = rows.filter((row) => row.trainer !== "sb_unopened").concat(sbRows);
}
const grouped = new Map();
for (const row of rows) {
  // `other` mixes materially different open sizes (including large opens) and
  // cannot be rendered or taught as one exact preflop situation.
  if (row.trainer !== "sb_unopened" && row.open_size === "other") continue;
  // The tracker has two adjacent middle-position indices (3 and 4), while the
  // learner-facing 7-max table exposes only one MP seat. When both collapse to
  // `MP`, the earlier seat is the table's EP seat; keeping `MP vs MP` would make
  // Hero look like the opener and incorrectly subtract the raise from Hero.
  if (row.trainer === "vs_raise_free" && row.hero_position === row.opener_position && row.hero_position !== "MP") {
    throw new Error(`Impossible collapsed position pair: ${row.hero_position} vs ${row.opener_position}`);
  }
  const opener = row.trainer === "sb_unopened"
    ? "—"
    : row.trainer === "vs_raise_free" && row.hero_position === "MP" && row.opener_position === "MP"
      ? "EP"
      : row.opener_position;
  const size = row.trainer === "sb_unopened" ? "—" : row.open_size;
  const sliceKey = [row.trainer, row.cohort, row.hero_position, opener, size, row.stack_bucket].join("|");
  let slice = grouped.get(sliceKey);
  if (!slice) {
    slice = {
      trainer: row.trainer,
      cohort: row.cohort,
      hero_position: row.hero_position,
      opener_position: opener,
      open_size: size,
      stack_bucket: row.stack_bucket,
      counts: [0, 0, 0, 0],
      hands: new Map(),
    };
    grouped.set(sliceKey, slice);
  }
  const counts = columns.map((column) => Number(row[column] || 0));
  counts.forEach((count, index) => { slice.counts[index] += count; });
  if (!VALID_HAND.test(row.hand_class || "")) continue;
  const hand = slice.hands.get(row.hand_class) || [0, 0, 0, 0];
  counts.forEach((count, index) => { hand[index] += count; });
  slice.hands.set(row.hand_class, hand);
}

const trainers = { vs_raise_free: { slices: [] }, vs_raise_sb: { slices: [] }, sb_unopened: { slices: [] } };
for (const slice of grouped.values()) {
  const total = slice.counts.reduce((sum, count) => sum + count, 0);
  if (total < MIN_SLICE_ACTIONS || !trainers[slice.trainer]) continue;
  const cells = {};
  for (const [hand, counts] of slice.hands.entries()) {
    if (counts.reduce((sum, count) => sum + count, 0) < MIN_HAND_ACTIONS) continue;
    cells[hand] = integerRates(counts);
  }
  trainers[slice.trainer].slices.push({
    cohort: slice.cohort,
    hero_position: slice.hero_position,
    opener_position: slice.opener_position,
    open_size: slice.open_size,
    stack_bucket: slice.stack_bucket,
    rates: integerRates(slice.counts),
    cells,
  });
}

const publishedCohorts = ["league1", "leagues2_3", "r15_18"];
const spotKey = (slice) => [slice.hero_position, slice.opener_position, slice.open_size, slice.stack_bucket].join("|");
for (const trainer of Object.values(trainers)) {
  const completeBySpot = new Map();
  for (const slice of trainer.slices) {
    if (!publishedCohorts.includes(slice.cohort) || Object.keys(slice.cells).length !== 169) continue;
    const key = spotKey(slice);
    const cohorts = completeBySpot.get(key) || new Set();
    cohorts.add(slice.cohort);
    completeBySpot.set(key, cohorts);
  }
  const publishableSpots = new Set([...completeBySpot].filter(([, cohorts]) => publishedCohorts.every((cohort) => cohorts.has(cohort))).map(([key]) => key));
  trainer.slices = trainer.slices.filter((slice) => publishedCohorts.includes(slice.cohort) && publishableSpots.has(spotKey(slice)) && Object.keys(slice.cells).length === 169);
  trainer.slices.sort((a, b) => [a.cohort, a.hero_position, a.opener_position, a.open_size, a.stack_bucket].join("|").localeCompare([b.cohort, b.hero_position, b.opener_position, b.open_size, b.stack_bucket].join("|")));
}

const payload = {
  schemaVersion: 1,
  source: {
    system: "MSP",
    windowStart: sbOverride && mainWindowStart > "2023-09-01T00:00:00Z" ? "2023-09-01T00:00:00Z" : mainWindowStart,
    windowEndExclusive: "2026-07-22T00:00:00Z",
    trainerWindows: {
      vs_raise_free: [mainWindowStart, "2026-07-22T00:00:00Z"],
      vs_raise_sb: [mainWindowStart, "2026-07-22T00:00:00Z"],
      sb_unopened: [sbOverride ? "2023-09-01T00:00:00Z" : mainWindowStart, "2026-07-22T00:00:00Z"],
    },
    rankSemantics: "rank_at_hand",
    cohorts: { league1: [1, 5], leagues2_3: [6, 14], r15_18: [15, 18] },
    stackWindows: {
      vs_raise_free: {
        "20": { minInclusive: 18, maxExclusive: 22.5, label: "18–22" },
        "25": { minInclusive: 22.5, maxExclusive: 27.5, label: "23–27" },
        "30": { minInclusive: 27.5, maxExclusive: 32.5, label: "28–32" },
        "35": { minInclusive: 32.5, maxExclusive: 37.5, label: "33–37" },
        "40": { minInclusive: 37.5, maxExclusive: 40, label: "38–39" },
      },
    },
    tableSize: "7-9",
    handMinimum: MIN_HAND_ACTIONS,
    sliceMinimum: MIN_SLICE_ACTIONS,
  },
  trainers,
};

writeFileSync(output, `(function(){window.PokerPreflopBenchmarkData=${JSON.stringify(payload)};})();\n`);
const summary = Object.fromEntries(Object.entries(trainers).map(([key, value]) => [key, { slices: value.slices.length, cells: value.slices.reduce((sum, slice) => sum + Object.keys(slice.cells).length, 0) }]));
console.log(JSON.stringify(summary, null, 2));
