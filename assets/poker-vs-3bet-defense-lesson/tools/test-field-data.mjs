#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const lessonDirectory = path.resolve(toolDirectory, '..');
const dataPath = path.join(lessonDirectory, 'data/vs3bet-field-data.js');
const diagnosticsPath = path.join(lessonDirectory, 'data/vs3bet-field-diagnostics.json');
const sqlPath = path.join(toolDirectory, 'vs3bet-field-cube.sql');
const publicCubePath = path.join(lessonDirectory, 'data/vs3bet-field-hand-cube.csv');
const publicRankPath = path.join(lessonDirectory, 'data/vs3bet-rank-intervals.csv');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(dataPath, 'utf8'), context, { filename: dataPath });
const data = context.window.FF_VS3BET_FIELD_DATA;
const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
const sql = fs.readFileSync(sqlPath, 'utf8');
const clickhouse = sql.slice(sql.indexOf('-- 2. ClickHouse:'));

assert(data, 'field data global missing');
assert.equal(fs.existsSync(publicCubePath), false, 'lossless timestamped hand cube must not be stored in public lesson assets');
assert.equal(fs.existsSync(publicRankPath), false, 'raw user_id rank histories must not be stored in public lesson assets');
assert.equal(data.version, 'vs3bet-field-cube-20260717-v3');
assert.equal(data.meta.windowEndExclusive, '2026-07-17T00:00:00Z');
assert.deepEqual(Array.from(data.meta.cohortOrder), ['novice', 'league3', 'league2', 'league1']);
assert.equal(data.meta.hands.length, 169);
assert.equal(new Set(data.meta.hands).size, 169);
assert.match(data.meta.sizeBoundary.omitted, /RFI.*omitted/i);
assert.match(data.meta.provenance.rankIntervals.storage, /not shipped as a public lesson asset/i);
assert.match(data.meta.privacy.policy, /N>=20/);
assert.match(data.meta.privacy.policy, /Dirichlet-smoothed/);
assert.equal(data.meta.privacy.estimatePriorHands, 16);
assert.match(data.meta.privacy.rawCubeStorage, /not shipped as a public lesson asset/i);
assert.equal(data.meta.filters.squeezeExcluded, true);
assert.equal(data.meta.provenance.handCube.sourceQueryTemplateSha256, crypto.createHash('sha256').update(sql).digest('hex'));
assert.match(clickhouse, /latest_versions AS/);
assert.match(clickhouse, /coalesce\(h\.is_rfi, 0\) = 1/);
assert.match(clickhouse, /coalesce\(h\.is_preflop_face_3bet, 0\) = 1/);
assert.match(clickhouse, /coalesce\(h\.is_preflop_could_4bet, 0\) = 1/);
assert.match(clickhouse, /coalesce\(h\.is_face_squeeze, 0\) = 0/);
assert.match(clickhouse, /h\.position BETWEEN 0 AND 7 AND \(h\.preflop_aggressor_position < h\.position OR h\.preflop_aggressor_position IN \(8, 9\)\)/);
assert.match(clickhouse, /h\.position = 9 AND h\.preflop_aggressor_position = 8/);
assert.match(clickhouse, /h\.amt_preflop_3bet_facing_bb >= 3/);
assert.doesNotMatch(clickhouse, /h\.preflop_2bet_and_blind_facing_amount_bb/);
assert.match(clickhouse, /face_action = 'R' AND preflop_action = 'RR' AND is_allin = 1, 'jam'/);

assert.equal(diagnostics.duplicateRows, 0);
assert.equal(diagnostics.chartCount, 798);
assert.equal(diagnostics.publicChartCount, 778);
assert.equal(diagnostics.structurallyValidChartCount, 800);
assert.equal(diagnostics.missingStructurallyValidCharts, 2);
assert.deepEqual(diagnostics.missingStructurallyValidChartKeys, [
  'novice|EP|IP|20-30|10+',
  'novice|EP|IP|20-30|8-10',
]);
assert.equal(data.charts['novice|EP|IP|20-30|10+'], undefined);
assert.equal(data.charts['novice|EP|IP|20-30|8-10'], undefined);
assert(data.charts['novice|EP|IP|20-30|all']);
assert.equal(data.charts['novice|EP|IP|20-30|all'].totals.opportunities, 30, 'safe chart aggregate keeps every source decision');
assert.equal(data.charts['novice|EP|IP|20-30|all'].totals.estimatedCellCount, 23);
assert.equal(diagnostics.privacySuppressedCharts, 20);
for (const key of diagnostics.privacySuppressedChartKeys) assert.equal(data.charts[key], undefined, `chart below aggregate privacy N leaked: ${key}`);
assert.equal(diagnostics.global.opportunities, diagnostics.global.folds + diagnostics.global.calls + diagnostics.global.fourbets + diagnostics.global.jams);
assert.equal(diagnostics.global.opportunities, diagnostics.global.knownOpportunities + diagnostics.global.missingOpportunities);
assert(diagnostics.global.opportunities > 1_000_000, 'unexpectedly small cube');
assert(diagnostics.global.knownCoveragePct > 70, 'hole-card coverage unexpectedly low');
assert(diagnostics.firstHandAt.startsWith('2026-01-'));
assert(diagnostics.lastHandAt.startsWith('2026-07-16'));
assert(diagnostics.defaultSlice.totals.opportunities > 10_000, 'default measured chart too small');

for (const [key, chart] of Object.entries(data.charts)) {
  assert.equal(chart.cells.length, 169, `bad cell count ${key}`);
  assert.equal(chart.estimates.length, 169, `bad estimate count ${key}`);
  assert.equal(chart.totals.opportunities, chart.totals.folds + chart.totals.calls + chart.totals.fourbets + chart.totals.jams, `bad action total ${key}`);
  assert.equal(chart.totals.opportunities, chart.totals.knownOpportunities + chart.totals.missingOpportunities, `bad card coverage ${key}`);
  for (const [index, cell] of chart.cells.entries()) {
    const estimate = chart.estimates[index];
    assert.equal(cell.length, 5, `bad cell width ${key}`);
    assert.equal(estimate.length, 4, `bad estimate width ${key}`);
    assert(cell.every((n) => Number.isSafeInteger(n) && n >= 0), `bad cell value ${key}`);
    assert(estimate.every((n) => Number.isSafeInteger(n) && n >= 0), `bad estimate value ${key}`);
    assert.equal(cell[0], cell[1] + cell[2] + cell[3] + cell[4], `bad hand total ${key}`);
    assert(cell[0] === 0 || cell[0] >= data.meta.privacy.cellMinimumN, `low-N cell leaked into public payload ${key}`);
    const estimateTotal = estimate.reduce((sum, value) => sum + value, 0);
    assert(estimateTotal === 0 || estimateTotal === 1000, `estimate mix must sum to 100% ${key}`);
    assert(!(cell[0] && estimateTotal), `cell cannot be exact and estimated ${key}`);
  }
  const publicCellTotals = chart.cells.reduce((sum, cell) => sum + cell[0], 0);
  assert(publicCellTotals <= chart.totals.knownOpportunities, `exact hand cells exceed known-card aggregate ${key}`);
  assert.equal(chart.totals.exactCellCount, chart.cells.filter((cell) => cell[0] > 0).length, `exact cell counter mismatch ${key}`);
  assert.equal(chart.totals.estimatedCellCount, chart.estimates.filter((estimate) => estimate.some(Boolean)).length, `estimated cell counter mismatch ${key}`);
}

const anchor = data.charts['league2|BTN|IP|31-50|10+'];
assert(anchor, 'shape-bias anchor missing');
assert.deepEqual(
  [anchor.totals.opportunities, anchor.totals.folds, anchor.totals.calls, anchor.totals.fourbets, anchor.totals.jams],
  [2755, 2189, 157, 105, 304],
  'aggregate action mix must stay anchored to the full raw chart'
);
const suitedIndices = data.meta.hands.map((hand, index) => hand.endsWith('s') ? index : -1).filter((index) => index >= 0);
assert(suitedIndices.filter((index) => anchor.cells[index][0] || anchor.estimates[index].some(Boolean)).length >= 70, 'suited sector must not collapse under the privacy threshold');

console.log(`vs3bet field cube passed: ${diagnostics.csvRows} rows, ${diagnostics.global.opportunities} decisions, ${diagnostics.chartCount} measured charts`);
