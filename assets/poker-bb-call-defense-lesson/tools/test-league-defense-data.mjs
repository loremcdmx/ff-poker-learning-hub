import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const lessonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(lessonRoot, "data/ff-bb-defense-ranks.json");
const query = fs.readFileSync(path.join(lessonRoot, "tools/q_ff_bb_defense_ranks.sql"), "utf8");
assert.ok(fs.existsSync(dataPath), "missing data/ff-bb-defense-ranks.json");

const payload = JSON.parse(fs.readFileSync(dataPath, "utf8"));
assert.ok(payload?.meta && payload?.aggregates && payload?.hands, "complete payload");

const cohorts = ["novice", "league3", "league2", "league1"];
const stacks = ["70_plus", "40_70", "0_40"];
const positions = ["EP", "MP", "HJ", "CO", "BTN"];
const sizes = ["2_0", "2_5", "3_0"];
assert.deepEqual(Object.keys(payload.meta.cohorts).sort(), cohorts.slice().sort(), "cohort metadata");
assert.deepEqual(payload.meta.stackBuckets.map((row) => row.key), stacks, "stack metadata order");
assert.deepEqual(payload.meta.stackBuckets.map((row) => row.label), ["70 BB+", "40–70 BB", "0–40 BB"], "stack labels");
assert.deepEqual(payload.meta.positions, positions, "position metadata");
assert.deepEqual(payload.meta.sizes, [2, 2.5, 3], "size metadata");
assert.deepEqual(payload.meta.cohorts.novice.ranks, [15, 16, 17, 18], "novice ranks");
assert.deepEqual(payload.meta.cohorts.league3.ranks, [11, 12, 13, 14, 15], "league 3 ranks");
assert.ok(payload.meta.cohorts.novice.ranks.includes(15) && payload.meta.cohorts.league3.ranks.includes(15), "rank 15 intentionally overlaps");
assert.deepEqual(payload.meta.cohorts.league2.ranks, [6, 7, 8, 9, 10], "league 2 ranks");
assert.deepEqual(payload.meta.cohorts.league1.ranks, [1, 2, 3, 4, 5], "league 1 ranks");

for (const key of ["minChartDisplayN", "minCellDisplayN", "minCellReliableN"]) {
  assert.ok(Number.isInteger(payload.meta[key]) && payload.meta[key] > 0, "meta." + key);
}
assert.ok(payload.meta.minCellReliableN >= payload.meta.minCellDisplayN, "sample thresholds ordered");
assert.match(payload.meta.samplePolicy, /Empty cells remain explicit rather than imputed/);
assert.match(payload.meta.cohortPolicy, /Rank 15 intentionally appears in both novice/);
assert.equal(payload.meta.window.startInclusive, "2026-01-01T00:00:00Z");
assert.equal(payload.meta.window.endExclusive, "2026-07-17T00:00:00Z");
assert.match(payload.meta.scope, /effective stack >0 BB/);

assert.equal(typeof payload.meta.abiMetric, "string", "ABI definition");
assert.deepEqual(Object.keys(payload.meta.abi).sort(), cohorts.slice().sort(), "ABI cohort metadata");
for (const cohort of cohorts) {
  const abi = payload.meta.abi[cohort];
  assert.ok(Number.isInteger(abi.players) && abi.players > 0, "abi players " + cohort);
  assert.ok(Number.isInteger(abi.entries) && abi.entries > 0, "abi entries " + cohort);
  assert.ok(Number.isFinite(abi.loadUsd) && abi.loadUsd > 0, "abi load " + cohort);
  assert.ok(Math.abs(abi.loadUsd / abi.entries - abi.abiUsd) <= 0.01, "weighted ABI " + cohort);
}
assert.match(payload.meta.abiCorrelation.method, /40–70 BB/);
assert.ok(payload.meta.abiCorrelation.pearsonR >= -1 && payload.meta.abiCorrelation.pearsonR <= 1, "Pearson r");
assert.match(payload.meta.abiCorrelation.caveat, /does not establish training causality/);

const expectedAggregateKeys = new Set();
for (const cohort of cohorts) {
  for (const stack of stacks) {
    for (const position of positions) {
      for (const size of sizes) expectedAggregateKeys.add([cohort, stack, position, size].join(":"));
    }
  }
}
const aggregateKeys = Object.keys(payload.aggregates);
assert.equal(aggregateKeys.length, 180, "4 cohorts x 3 stacks x 5 positions x 3 sizes");
assert.deepEqual(new Set(aggregateKeys), expectedAggregateKeys, "aggregate key cube");

function assertCount(value, label) {
  assert.ok(Number.isInteger(value) && value >= 0, label);
}

for (const key of aggregateKeys) {
  const row = payload.aggregates[key];
  for (const field of ["n", "players", "folds", "calls", "threeBets", "cardKnownN"]) assertCount(row[field], key + "." + field);
  assert.equal(row.folds + row.calls + row.threeBets, row.n, key + " action reconciliation");
  assert.ok(row.players <= row.n, key + " players <= decisions");
  assert.ok(row.cardKnownN <= row.n, key + " known cards <= decisions");
}

assert.deepEqual(payload.aggregates["league3:40_70:BTN:2_0"], {
  n: 274388,
  players: 1558,
  folds: 66968,
  calls: 170041,
  threeBets: 37379,
  cardKnownN: 222737
}, "League 3 / 40–70 BB / BTN / 2 BB snapshot anchor");
assert.deepEqual(payload.hands["league3:40_70:BTN:2_0:A2o"], {
  n: 2062,
  players: 896,
  folds: 209,
  calls: 1268,
  threeBets: 585
}, "hand-level snapshot anchor");

const ranks = "AKQJT98765432";
const handClasses = new Set();
for (let row = 0; row < 13; row += 1) {
  for (let column = 0; column < 13; column += 1) {
    handClasses.add(row === column
      ? ranks[row] + ranks[column]
      : row < column
        ? ranks[row] + ranks[column] + "s"
        : ranks[column] + ranks[row] + "o");
  }
}
assert.equal(handClasses.size, 169, "canonical hand classes");

const handSums = new Map(aggregateKeys.map((key) => [key, { n: 0, folds: 0, calls: 0, threeBets: 0, classes: new Set() }]));
let observedHandCells = 0;
for (const [key, row] of Object.entries(payload.hands)) {
  const parts = key.split(":");
  assert.equal(parts.length, 5, key + " key shape");
  const [cohort, stack, position, size, hand] = parts;
  const aggregateKey = [cohort, stack, position, size].join(":");
  assert.ok(expectedAggregateKeys.has(aggregateKey), key + " aggregate exists");
  assert.ok(handClasses.has(hand), key + " canonical hand");
  for (const field of ["n", "players", "folds", "calls", "threeBets"]) assertCount(row[field], key + "." + field);
  assert.equal(row.folds + row.calls + row.threeBets, row.n, key + " action reconciliation");
  assert.ok(row.players <= row.n, key + " players <= decisions");
  const sum = handSums.get(aggregateKey);
  assert.ok(!sum.classes.has(hand), key + " unique hand");
  sum.classes.add(hand);
  sum.n += row.n;
  sum.folds += row.folds;
  sum.calls += row.calls;
  sum.threeBets += row.threeBets;
  if (row.n > 0) observedHandCells += 1;
}

assert.equal(Object.keys(payload.hands).length, 30420, "180 complete 169-cell charts");
for (const [key, sum] of handSums) {
  assert.equal(sum.classes.size, 169, key + " has a full matrix");
  const aggregate = payload.aggregates[key];
  assert.equal(sum.n, aggregate.cardKnownN, key + " known-card reconciliation");
  assert.ok(sum.folds <= aggregate.folds, key + " known folds <= all folds");
  assert.ok(sum.calls <= aggregate.calls, key + " known calls <= all calls");
  assert.ok(sum.threeBets <= aggregate.threeBets, key + " known 3-bets <= all 3-bets");
}
assert.deepEqual(payload.hands["novice:40_70:EP:2_5:A3s"], { n: 0, players: 0, folds: 0, calls: 0, threeBets: 0 }, "empty cell is explicit");

const totalN = Object.values(payload.aggregates).reduce((sum, row) => sum + row.n, 0);
const cardKnownN = Object.values(payload.aggregates).reduce((sum, row) => sum + row.cardKnownN, 0);
assert.equal(totalN, 11658216, "full decision coverage");
assert.equal(cardKnownN, 10089518, "known-card coverage");
assert.equal(payload.meta.coverage.totalN, totalN);
assert.equal(payload.meta.coverage.cardKnownN, cardKnownN);
assert.equal(payload.meta.coverage.aggregateCells, 180);
assert.equal(payload.meta.coverage.handCells, 30420);
assert.equal(payload.meta.coverage.observedHandCells, observedHandCells);
assert.equal(payload.meta.coverage.emptyHandCells, 46);
assert.ok(Math.abs(payload.meta.coverage.cardKnownPct - cardKnownN / totalN * 100) <= 0.01, "known-card percentage");
assert.equal(payload.meta.source.cubeFiles.length, 1, "canonical source export is traceable");
for (const source of payload.meta.source.cubeFiles) {
  assert.match(source.sha256, /^[0-9a-f]{64}$/);
  assert.ok(source.rows > 0);
}
assert.deepEqual(payload.meta.source.cubeFiles[0], {
  name: "bb-defense-stack-cube-raw.csv",
  rows: 30734,
  sha256: "39a4f66fcc0e0aaf8a20fbdae6c1c3e1c2f6b30a50126b1d8a93fdac1ad6f5d5"
}, "canonical MCP export identity");
assert.match(query, /h\.preflop_effective_stack_size_bb > 0/);
assert.match(query, /x\.7 >= 70, '70_plus',[\s\S]*?x\.7 >= 40, '40_70',[\s\S]*?'0_40'/);
assert.match(query, /h\.played_at < toDateTime\('2026-07-17 00:00:00'\)/);
assert.match(query, /GROUP BY GROUPING SETS/);

console.log("BB league-defense stack data contract: ok");
