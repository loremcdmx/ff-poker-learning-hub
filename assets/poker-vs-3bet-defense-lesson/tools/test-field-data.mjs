#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const lessonDirectory = path.resolve(toolDirectory, "..");
const dataPath = path.join(lessonDirectory, "data/vs3bet-field-data.js");
const diagnosticsPath = path.join(lessonDirectory, "data/vs3bet-field-diagnostics.json");
const sqlPath = path.join(toolDirectory, "vs3bet-field-cube.sql");
const publicCubePath = path.join(lessonDirectory, "data/vs3bet-field-hand-cube.csv");
const publicRankPath = path.join(lessonDirectory, "data/vs3bet-rank-intervals.csv");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(dataPath, "utf8"), context, { filename: dataPath });
const data = context.window.FF_VS3BET_FIELD_DATA;
const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, "utf8"));
const sql = fs.readFileSync(sqlPath, "utf8");
const clickhouse = sql.slice(sql.indexOf("-- 2. ClickHouse:"));

assert(data, "field data global missing");
assert.equal(fs.existsSync(publicCubePath), false, "lossless hand cube stays private");
assert.equal(fs.existsSync(publicRankPath), false, "rank-history bridge stays private");
assert.equal(data.version, "vs3bet-field-cube-20260721-v5");
assert.equal(data.meta.windowStartInclusive, "2025-07-01T00:00:00Z");
assert.equal(data.meta.windowEndExclusive, "2026-07-21T00:00:00Z");
assert.deepEqual(Array.from(data.meta.cohortOrder), ["novice", "league3", "league2", "league1"]);
assert.deepEqual(Array.from(data.meta.cohorts.novice.ranks), [15, 16, 17, 18]);
assert.deepEqual(Array.from(data.meta.cohorts.league3.ranks), [11, 12, 13, 14]);
assert.equal(data.meta.hands.length, 169);
assert.equal(new Set(data.meta.hands).size, 169);
assert.equal(data.meta.sampleThresholds.unavailableBelow, 1);
assert.match(data.meta.coverage.policy, /exact integer counters/i);
assert.match(data.meta.coverage.policy, /zero remains unavailable/i);
assert.equal(data.meta.filters.squeezeExcluded, true);
assert.match(data.meta.provenance.rankIntervals.storage, /not shipped as a public lesson asset/i);
assert.equal(data.meta.provenance.rankIntervals.rows, 9621);
assert.equal(data.meta.provenance.handCube.rows, 137245);
assert.equal(data.meta.provenance.handCube.sourceQueryTemplateSha256, crypto.createHash("sha256").update(sql).digest("hex"));
assert.match(clickhouse, /coalesce\(h\.is_rfi, 0\) = 1/);
assert.match(clickhouse, /coalesce\(h\.is_preflop_face_3bet, 0\) = 1/);
assert.match(clickhouse, /coalesce\(h\.is_preflop_could_4bet, 0\) = 1/);
assert.match(clickhouse, /coalesce\(h\.is_face_squeeze, 0\) = 0/);
assert.match(clickhouse, /h\.amt_preflop_3bet_facing_bb >= 3/);
assert.doesNotMatch(clickhouse, /h\.preflop_2bet_and_blind_facing_amount_bb/);
assert.match(clickhouse, /face_action = 'R' AND preflop_action = 'RR' AND is_allin = 1, 'jam'/);

assert.equal(diagnostics.duplicateRows, 0);
assert.equal(diagnostics.chartCount, 800);
assert.equal(diagnostics.publicChartCount, 800);
assert.equal(diagnostics.structurallyValidChartCount, 800);
assert.equal(diagnostics.missingStructurallyValidCharts, 0);
assert.deepEqual(diagnostics.missingStructurallyValidChartKeys, []);
assert.equal(Object.keys(data.charts).length, 800);
for (const key of ["novice|EP|IP|20-30|10+", "novice|EP|IP|20-30|8-10"]) {
  assert(data.charts[key], `valid filter must have an observed chart: ${key}`);
  assert(data.charts[key].totals.opportunities >= data.meta.sampleThresholds.lowConfidenceBelow, `valid filter needs at least the low-confidence floor: ${key}`);
}
assert.equal(diagnostics.global.opportunities, diagnostics.global.folds + diagnostics.global.calls + diagnostics.global.fourbets + diagnostics.global.jams);
assert.equal(diagnostics.global.opportunities, diagnostics.global.knownOpportunities + diagnostics.global.missingOpportunities);
assert.equal(diagnostics.global.opportunities, 9828126);
assert(diagnostics.global.knownCoveragePct > 80, "hole-card coverage unexpectedly low");
assert(diagnostics.firstHandAt.startsWith("2025-07-01"));
assert(diagnostics.lastHandAt.startsWith("2026-07-20"));
assert.equal(diagnostics.defaultSlice.totals.exactCellCount, 169);
assert.equal(diagnostics.defaultSlice.estimatedHands, 0);

for (const [key, chart] of Object.entries(data.charts)) {
  assert.equal(chart.cells.length, 169, `bad cell count ${key}`);
  assert.equal(chart.estimates, undefined, `modelled cells leaked into ${key}`);
  assert.equal(chart.totals.opportunities, chart.totals.folds + chart.totals.calls + chart.totals.fourbets + chart.totals.jams, `bad action total ${key}`);
  assert.equal(chart.totals.opportunities, chart.totals.knownOpportunities + chart.totals.missingOpportunities, `bad card coverage ${key}`);
  for (const cell of chart.cells) {
    assert.equal(cell.length, 5, `bad cell width ${key}`);
    assert(cell.every((n) => Number.isSafeInteger(n) && n >= 0), `bad cell value ${key}`);
    assert.equal(cell[0], cell[1] + cell[2] + cell[3] + cell[4], `bad hand total ${key}`);
  }
  assert.equal(chart.totals.exactCellCount, chart.cells.filter((cell) => cell[0] > 0).length, `exact cell counter mismatch ${key}`);
}

const defaultChart = data.charts[diagnostics.defaultSlice.key];
assert(defaultChart, "default chart missing");
assert.deepEqual(
  [defaultChart.totals.opportunities, defaultChart.totals.folds, defaultChart.totals.calls, defaultChart.totals.fourbets, defaultChart.totals.jams],
  [170164, 123459, 27671, 3055, 15979],
  "default chart must remain tied to the refreshed integer-counter slice"
);

const handMix = (chartKey, hand) => {
  const chart = data.charts[chartKey];
  const index = data.meta.hands.indexOf(hand);
  assert(chart, `comparison chart missing: ${chartKey}`);
  assert(index >= 0, `comparison hand missing: ${hand}`);
  const cell = chart.cells[index];
  assert(cell[0] > 0, `observed mix unavailable: ${chartKey}/${hand}`);
  return cell.slice(1).map((value) => Math.round(value / cell[0] * 1000) / 10);
};

const defaultAqsMixes = ["league1", "league2", "league3"].map((cohort) => handMix(`${cohort}|CO|IP|31-50|6-8`, "AQs"));
assert(new Set(defaultAqsMixes.map((mix) => mix.join("|"))).size >= 3, "league comparison must retain measured differences");
const filterSignatures = [
  ["league2|CO|IP|31-50|<6", "AQs"],
  ["league2|CO|IP|31-50|6-8", "AQs"],
  ["league2|CO|IP|31-50|8-10", "AQs"],
  ["league2|HJ|OOP|20-30|8-10", "AQs"]
].map(([key, hand]) => handMix(key, hand).join("|"));
assert(new Set(filterSignatures).size >= 3, "filters must address materially different observed slices");

console.log(`vs3bet field cube passed: ${diagnostics.csvRows} rows, ${diagnostics.global.opportunities} decisions, ${diagnostics.chartCount} observed charts`);
