import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = dirname(fileURLToPath(import.meta.url));
const builderPath = resolve(toolRoot, "build-resteal-reaction-summary.mjs");
const sourcePath = resolve(toolRoot, "../data/field-opener-response.json");
const outputPath = resolve(toolRoot, "../data/resteal-reaction-summary.json");
const openerPositions = ["CO", "BTN"];
const heroPositions = ["SB", "BB"];
const openSizes = [2, 2.5, 3];
const depthBands = ["25-30", "30-35", "35-40"];
const responseActions = ["F", "C", "R"];
const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const canonicalHands = ranks.flatMap((rowRank, rowIndex) => ranks.map((columnRank, columnIndex) => {
  if (rowIndex === columnIndex) return `${rowRank}${columnRank}`;
  if (rowIndex < columnIndex) return `${rowRank}${columnRank}s`;
  return `${columnRank}${rowRank}o`;
}));
const canonicalHandSet = new Set(canonicalHands);
const canonicalJsonHandOrder = [
  ...canonicalHands.filter((hand) => /^\d\d$/.test(hand)).sort((left, right) => Number(left) - Number(right)),
  ...canonicalHands.filter((hand) => !/^\d\d$/.test(hand))
];

function runBuilder() {
  const result = spawnSync(process.execPath, [builderPath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

const source = JSON.parse(readFileSync(sourcePath, "utf8"));
runBuilder();
const firstBuild = readFileSync(outputPath, "utf8");
runBuilder();
const secondBuild = readFileSync(outputPath, "utf8");
assert.equal(secondBuild, firstBuild, "summary rebuild must be byte-for-byte deterministic");

const summary = JSON.parse(firstBuild);
const [windowStartInclusive, windowEndExclusive] = source.meta.source.window.split("..");
assert.deepEqual(summary.meta, {
  generatedAt: windowEndExclusive,
  sourceVersion: source.meta.version,
  windowStartInclusive,
  windowEndExclusive,
  heroJams: source.meta.source.heroJamsTotal,
  matchedResponses: source.meta.source.matchedOpenerResponsesTotal,
  matchRatePct: source.meta.source.matchPct,
  ambiguousJamsExcluded: source.meta.source.ambiguousHeroJamsTotal,
  actions: {
    F: source.meta.actions.F,
    C: source.meta.actions.C,
    R: source.meta.actions.R
  }
});

const expectedKeys = openerPositions.flatMap((openerPosition) => heroPositions.flatMap((heroPosition) => openSizes.flatMap((openSizeBb) => depthBands.map((depthBand) => (
  `${openerPosition}:${heroPosition}:${openSizeBb}:${depthBand}`
)))));
assert.equal(summary.spots.length, 36, "summary must contain all 36 spot slices");
assert.deepEqual(summary.spots.map((spot) => spot.key), expectedKeys, "spot order must be deterministic");
assert.equal(new Set(summary.spots.map((spot) => spot.key)).size, 36, "spot keys must be unique");

const rawActionTotals = Object.fromEntries(responseActions.map((action) => [action, 0]));
let rawKnownContinuing = 0;
for (const row of source.rows) {
  rawActionTotals[row.responseAction] += row.n;
  if (["C", "R"].includes(row.responseAction) && row.hand !== "unknown") rawKnownContinuing += row.n;
}

const outputActionTotals = Object.fromEntries(responseActions.map((action) => [action, 0]));
let outputKnownContinuing = 0;
for (const spot of summary.spots) {
  const expectedKey = `${spot.openerPosition}:${spot.heroPosition}:${spot.openSizeBb}:${spot.depthBand}`;
  assert.equal(spot.key, expectedKey);
  assert.ok(openerPositions.includes(spot.openerPosition));
  assert.ok(heroPositions.includes(spot.heroPosition));
  assert.ok(openSizes.includes(spot.openSizeBb));
  assert.ok(depthBands.includes(spot.depthBand));
  for (const action of responseActions) {
    assert.ok(Number.isSafeInteger(spot.totals[action]) && spot.totals[action] >= 0, `${spot.key} ${action} must be a non-negative integer`);
    outputActionTotals[action] += spot.totals[action];
  }
  assert.equal(spot.totals.N, spot.totals.F + spot.totals.C + spot.totals.R, `${spot.key} totals.N must reconcile`);

  const hands = Object.keys(spot.hands);
  assert.ok(!hands.includes("unknown"), `${spot.key} must exclude unknown hands`);
  assert.deepEqual(hands, canonicalJsonHandOrder.filter((hand) => hands.includes(hand)), `${spot.key} hand order must be deterministic and canonical`);
  for (const [handLabel, hand] of Object.entries(spot.hands)) {
    assert.ok(canonicalHandSet.has(handLabel), `${spot.key} has invalid hand ${handLabel}`);
    assert.ok(Number.isSafeInteger(hand.C) && hand.C >= 0, `${spot.key} ${handLabel} C must be non-negative`);
    assert.ok(Number.isSafeInteger(hand.R) && hand.R >= 0, `${spot.key} ${handLabel} R must be non-negative`);
    assert.equal(hand.N, hand.C + hand.R, `${spot.key} ${handLabel} N must reconcile`);
    assert.ok(hand.N > 0, `${spot.key} ${handLabel} must not be an empty hand`);
    outputKnownContinuing += hand.N;
  }
}

assert.deepEqual(outputActionTotals, rawActionTotals, "all action totals must reconcile with the detailed source");
assert.equal(summary.spots.reduce((sum, spot) => sum + spot.totals.N, 0), source.meta.source.matchedOpenerResponsesTotal, "spot N must reconcile with matched responses");
assert.equal(outputKnownContinuing, rawKnownContinuing, "known C/R hand counts must reconcile with the detailed source");

console.log(JSON.stringify({
  ok: true,
  spots: summary.spots.length,
  matchedResponses: summary.meta.matchedResponses,
  actionTotals: outputActionTotals,
  knownContinuingHands: outputKnownContinuing,
  deterministicBytes: Buffer.byteLength(firstBuild)
}, null, 2));
