#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const lessonDirectory = path.resolve(toolDirectory, '..');
const dataDirectory = path.join(lessonDirectory, 'data');
const cubeArgumentIndex = process.argv.indexOf('--cube');
const csvPath = cubeArgumentIndex >= 0 ? process.argv[cubeArgumentIndex + 1] : process.env.FF_VS3BET_FIELD_CUBE;
const cubeJobArgumentIndex = process.argv.indexOf('--cube-job-id');
const cubeJobId = cubeJobArgumentIndex >= 0 ? process.argv[cubeJobArgumentIndex + 1] : process.env.FF_VS3BET_FIELD_CUBE_JOB_ID;
const outputPath = path.join(dataDirectory, 'vs3bet-field-data.js');
const diagnosticsPath = path.join(dataDirectory, 'vs3bet-field-diagnostics.json');
const sourceQueryPath = path.join(toolDirectory, 'vs3bet-field-cube.sql');
if (!csvPath || !cubeJobId) throw new Error('Usage: build-vs3bet-field-data.mjs --cube <external-cube.csv> --cube-job-id <mcp-job-id> [--rank-intervals <external-rank.csv>]');
const rankArgumentIndex = process.argv.indexOf('--rank-intervals');
const rankPath = rankArgumentIndex >= 0 ? process.argv[rankArgumentIndex + 1] : process.env.FF_VS3BET_RANK_INTERVALS;
const rankProvenance = {
  rows: 6542,
  queryJobId: 'mcp_bq_7ec39be98a71484d8c845ba5df7ac2b9',
  sha256: '2c2222910fd1b44e7b56d060244e11487ee96f6f0484cc57ba9b90ffafb5fc64',
};

if (rankArgumentIndex >= 0 && !rankPath) throw new Error('Usage: --rank-intervals <external-rank-intervals.csv>');
if (rankPath) validateExternalRankSource(rankPath);

const columns = [
  'cohort', 'hero_position', 'threebettor_position', 'relation', 'stack_band',
  'threebet_to_bucket', 'holecards_str', 'opportunities', 'unique_players',
  'folds', 'calls', 'fourbets', 'jams', 'other', 'first_hand_at', 'last_hand_at',
];
const cohorts = ['novice', 'league3', 'league2', 'league1'];
const heroPositions = ['EP', 'MP', 'HJ', 'CO', 'BTN', 'SB'];
const threebettorPositions = ['EP', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const relations = ['IP', 'OOP'];
const positionRelations = [
  ['EP', 'IP'], ['EP', 'OOP'],
  ['MP', 'IP'], ['MP', 'OOP'],
  ['HJ', 'IP'], ['HJ', 'OOP'],
  ['CO', 'IP'], ['CO', 'OOP'],
  ['BTN', 'IP'], ['SB', 'OOP'],
];
const stackBands = ['20-30', '31-50', '51-80', '80+'];
const sourceSizeBuckets = ['<6', '6-8', '8-10', '10+'];
const sizeBuckets = ['all', ...sourceSizeBuckets];
const ranks = 'AKQJT98765432'.split('');
const hands = ranks.flatMap((_, row) => ranks.map((__, column) => {
  if (row === column) return `${ranks[row]}${ranks[column]}`;
  if (row < column) return `${ranks[row]}${ranks[column]}s`;
  return `${ranks[column]}${ranks[row]}o`;
}));
const handIndex = new Map(hands.map((hand, index) => [hand, index]));
const missingHand = '__MISSING__';
const actionKeys = ['folds', 'calls', 'fourbets', 'jams'];
const cellMinimumN = 20;
const estimatePriorHands = 16;

const csvBuffer = fs.readFileSync(csvPath);
const sourceQueryBuffer = fs.readFileSync(sourceQueryPath);
const csv = csvBuffer.toString('utf8').trimEnd().split(/\r?\n/);
assert.deepEqual(csv.shift().split(','), columns, 'unexpected field cube columns');
const rows = csv.map((line, index) => parseRow(line, index + 2));
const charts = {};
const seen = new Set();
const global = emptyTotals();
const byCohort = Object.fromEntries(cohorts.map((cohort) => [cohort, emptyTotals()]));
const exactThreebettorCounts = {};
const dimensionTotals = {
  heroPosition: Object.fromEntries(heroPositions.map((key) => [key, 0])),
  relation: Object.fromEntries(relations.map((key) => [key, 0])),
  stackBand: Object.fromEntries(stackBands.map((key) => [key, 0])),
  sizeBucket: Object.fromEntries(sourceSizeBuckets.map((key) => [key, 0])),
};
let firstHandAt = null;
let lastHandAt = null;

for (const row of rows) {
  const rowKey = [row.cohort, row.heroPosition, row.threebettorPosition, row.relation, row.stackBand, row.sizeBucket, row.hand].join('|');
  assert(!seen.has(rowKey), `duplicate cube row ${rowKey}`);
  seen.add(rowKey);
  assert.equal(row.other, 0, `unknown action in ${rowKey}`);
  assert.equal(row.folds + row.calls + row.fourbets + row.jams, row.opportunities, `actions do not sum in ${rowKey}`);
  addTotals(global, row);
  addTotals(byCohort[row.cohort], row);
  const coverageKey = row.hand === missingHand ? 'missingOpportunities' : 'knownOpportunities';
  global[coverageKey] += row.opportunities;
  byCohort[row.cohort][coverageKey] += row.opportunities;
  const positionKey = [row.cohort, row.heroPosition, row.threebettorPosition].join('|');
  exactThreebettorCounts[positionKey] = (exactThreebettorCounts[positionKey] || 0) + row.opportunities;
  dimensionTotals.heroPosition[row.heroPosition] += row.opportunities;
  dimensionTotals.relation[row.relation] += row.opportunities;
  dimensionTotals.stackBand[row.stackBand] += row.opportunities;
  dimensionTotals.sizeBucket[row.sizeBucket] += row.opportunities;
  addToChart(chartFor(row.cohort, row.heroPosition, row.relation, row.stackBand, row.sizeBucket), row);
  addToChart(chartFor(row.cohort, row.heroPosition, row.relation, row.stackBand, 'all'), row);
  firstHandAt = minDate(firstHandAt, row.firstHandAt);
  lastHandAt = maxDate(lastHandAt, row.lastHandAt);
}

for (const chart of Object.values(charts)) finalizeChart(chart);
assert.equal(global.opportunities, global.folds + global.calls + global.fourbets + global.jams);
assert.equal(global.opportunities, global.knownOpportunities + global.missingOpportunities);

const chartEntries = Object.entries(charts).sort(([a], [b]) => a.localeCompare(b));
const structurallyValidChartCount = cohorts.length * positionRelations.length * stackBands.length * sizeBuckets.length;
const structurallyValidChartKeys = new Set(cohorts.flatMap((cohort) => positionRelations.flatMap(([heroPosition, relation]) => (
  stackBands.flatMap((stackBand) => sizeBuckets.map((sizeBucket) => keyFor(cohort, heroPosition, relation, stackBand, sizeBucket)))
))));
for (const [key] of chartEntries) assert(structurallyValidChartKeys.has(key), `unexpected browser chart ${key}`);
const missingStructurallyValidChartKeys = [...structurallyValidChartKeys].filter((key) => !charts[key]).sort();
assert.equal(chartEntries.length + missingStructurallyValidChartKeys.length, structurallyValidChartCount);
const cellSamples = chartEntries.flatMap(([, chart]) => chart.cells.map((cell) => cell[0]).filter(Boolean));
const privacySuppressedChartKeys = [];
const publicChartEntries = chartEntries.flatMap(([key, chart]) => {
  if (chart.totals.opportunities < cellMinimumN) {
    privacySuppressedChartKeys.push(key);
    return [];
  }
  return [[key, publicChart(chart, priorChartFor(key), cellMinimumN)]];
});
const defaultKey = keyFor('league3', 'BTN', 'IP', '31-50', 'all');
const defaultChart = Object.fromEntries(publicChartEntries)[defaultKey] || publicChartEntries[0]?.[1];
assert(defaultChart, 'no observed charts built');

const payload = {
  version: 'vs3bet-field-cube-20260717-v3',
  meta: {
    generatedOn: '2026-07-18',
    source: 'analytics.int_tracker_hand_joined',
    rankSource: 'analytics_mcp_readonly.mcp__check_rank_history',
    windowStartInclusive: '2026-01-01T00:00:00Z',
    windowEndExclusive: '2026-07-17T00:00:00Z',
    rankAssignment: 'Exact half-open rank interval at played_at; real players only.',
    cohorts: {
      novice: { label: 'Совсем новички', ranks: [16, 17, 18] },
      league3: { label: 'Лига 3', ranks: [11, 12, 13, 14, 15] },
      league2: { label: 'Лига 2', ranks: [6, 7, 8, 9, 10] },
      league1: { label: 'Лига 1', ranks: [1, 2, 3, 4, 5] },
    },
    cohortOrder: cohorts,
    heroPositions,
    threebettorPositions,
    relations,
    stackBands,
    sizeBuckets,
    sourceSizeBuckets,
    hands,
    sampleThresholds: { unavailableBelow: cellMinimumN, lowConfidenceBelow: 80, strongAtLeast: 200 },
    privacy: {
      cellMinimumN,
      chartMinimumN: cellMinimumN,
      estimatePriorHands,
      policy: 'Exact known-card hand cells are emitted only at N>=20. For observed lower-N cells, raw counts and N are omitted and a visibly labelled Dirichlet-smoothed action estimate is published. Chart-level totals use every source decision once the chart itself reaches N>=20.',
      rawCubeStorage: 'External private build input; the lossless timestamped cube is not shipped as a public lesson asset.',
    },
    filters: {
      node: 'Hero RFI -> faces first non-squeeze 3-bet -> fold/call/4-bet',
      couldFourbet: true,
      squeezeExcluded: true,
      heroPositions,
      effectiveStackMinimumBb: 20,
      threebetToMinimumBb: 3,
    },
    sizeBoundary: {
      measuredField: 'Absolute 3-bet-to amount in BB: <6, 6-8, 8-10, 10+.',
      omitted: 'RFI-to amount and 3-bet multiplier are omitted: Hero-row preflop_2bet_and_blind_facing_amount_bb is not Hero RFI size.',
    },
    actionContract: {
      fold: "preflop_face_3bet_action='F'",
      call: "preflop_face_3bet_action='C'",
      jam: "preflop_face_3bet_action='R' AND preflop_action='RR' AND is_preflop_allin=1",
      fourbet: "all other preflop_face_3bet_action='R' lines",
    },
    aggregation: 'Chart summaries use all source decisions and are invariant to the hand-cell privacy threshold. Exact cells use integer counts; lower-N observed cells use a leave-current-cohort-out Dirichlet estimate. Browser charts pool exact 3-bettor positions only to IP/OOP; the lossless CSV retains exact positions.',
    provenance: {
      rankIntervals: {
        ...rankProvenance,
        storage: 'External private build input; individual user_id rank histories are not shipped as a public lesson asset.',
      },
      handCube: {
        rows: rows.length,
        queryJobId: cubeJobId,
        sha256: sha256(csvBuffer),
        sourceQueryTemplateSha256: sha256(sourceQueryBuffer),
      },
    },
  },
  summaries: Object.fromEntries(cohorts.map((cohort) => [cohort, summary(byCohort[cohort])])),
  charts: Object.fromEntries(publicChartEntries),
};

const diagnostics = {
  version: payload.version,
  csvRows: rows.length,
  duplicateRows: rows.length - seen.size,
  chartCount: chartEntries.length,
  publicChartCount: publicChartEntries.length,
  structurallyValidChartCount,
  missingStructurallyValidCharts: missingStructurallyValidChartKeys.length,
  missingStructurallyValidChartKeys,
  privacySuppressedCharts: privacySuppressedChartKeys.length,
  privacySuppressedChartKeys,
  firstHandAt,
  lastHandAt,
  global: { ...global, knownCoveragePct: pct(global.knownOpportunities, global.opportunities) },
  byCohort: Object.fromEntries(cohorts.map((cohort) => [cohort, summary(byCohort[cohort])])),
  dimensionTotals,
  cellCoverage: {
    nonEmptyCells: cellSamples.length,
    unavailableCells: cellSamples.filter((n) => n < payload.meta.sampleThresholds.unavailableBelow).length,
    lowConfidenceCells: cellSamples.filter((n) => n >= payload.meta.sampleThresholds.unavailableBelow && n < payload.meta.sampleThresholds.lowConfidenceBelow).length,
    strongCells: cellSamples.filter((n) => n >= payload.meta.sampleThresholds.strongAtLeast).length,
  },
  defaultSlice: {
    key: defaultKey,
    totals: defaultChart.totals,
    populatedHands: defaultChart.cells.filter((cell) => cell[0] > 0).length,
    estimatedHands: defaultChart.estimates.filter((cell) => cell.some(Boolean)).length,
  },
  provenance: payload.meta.provenance,
};

const output = `window.FF_VS3BET_FIELD_DATA=${JSON.stringify(payload)};\n`;
const diagnosticsOutput = `${JSON.stringify(diagnostics, null, 2)}\n`;
fs.writeFileSync(outputPath, output);
fs.writeFileSync(diagnosticsPath, diagnosticsOutput);
console.log(JSON.stringify({ rows: rows.length, charts: chartEntries.length, global: diagnostics.global, defaultSlice: diagnostics.defaultSlice }, null, 2));

function parseRow(line, rowNumber) {
  const values = line.split(',');
  assert.equal(values.length, columns.length, `CSV width mismatch on row ${rowNumber}`);
  const source = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  assert(cohorts.includes(source.cohort), `bad cohort on row ${rowNumber}`);
  assert(heroPositions.includes(source.hero_position), `bad hero position on row ${rowNumber}`);
  assert(threebettorPositions.includes(source.threebettor_position), `bad 3bettor position on row ${rowNumber}`);
  assert(relations.includes(source.relation), `bad relation on row ${rowNumber}`);
  assert(stackBands.includes(source.stack_band), `bad stack on row ${rowNumber}`);
  assert(sourceSizeBuckets.includes(source.threebet_to_bucket), `bad size on row ${rowNumber}`);
  assert(source.holecards_str === missingHand || handIndex.has(source.holecards_str), `bad hand on row ${rowNumber}`);
  assertDate(source.first_hand_at, rowNumber);
  assertDate(source.last_hand_at, rowNumber);
  const result = {
    cohort: source.cohort,
    heroPosition: source.hero_position,
    threebettorPosition: source.threebettor_position,
    relation: source.relation,
    stackBand: source.stack_band,
    sizeBucket: source.threebet_to_bucket,
    hand: source.holecards_str,
    opportunities: integer(source.opportunities, 'opportunities', rowNumber),
    uniquePlayers: integer(source.unique_players, 'unique_players', rowNumber),
    folds: integer(source.folds, 'folds', rowNumber),
    calls: integer(source.calls, 'calls', rowNumber),
    fourbets: integer(source.fourbets, 'fourbets', rowNumber),
    jams: integer(source.jams, 'jams', rowNumber),
    other: integer(source.other, 'other', rowNumber),
    firstHandAt: source.first_hand_at,
    lastHandAt: source.last_hand_at,
  };
  assert(result.uniquePlayers <= result.opportunities, `players exceed decisions on row ${rowNumber}`);
  return result;
}

function keyFor(cohort, heroPosition, relation, stackBand, sizeBucket) {
  return [cohort, heroPosition, relation, stackBand, sizeBucket].join('|');
}
function chartFor(cohort, heroPosition, relation, stackBand, sizeBucket) {
  const key = keyFor(cohort, heroPosition, relation, stackBand, sizeBucket);
  if (!charts[key]) charts[key] = { totals: emptyTotals(), cells: hands.map(() => [0, 0, 0, 0, 0]) };
  return charts[key];
}
function addToChart(chart, row) {
  addTotals(chart.totals, row);
  if (row.hand === missingHand) chart.totals.missingOpportunities += row.opportunities;
  else {
    chart.totals.knownOpportunities += row.opportunities;
    const cell = chart.cells[handIndex.get(row.hand)];
    cell[0] += row.opportunities;
    cell[1] += row.folds;
    cell[2] += row.calls;
    cell[3] += row.fourbets;
    cell[4] += row.jams;
  }
}
function finalizeChart(chart) {
  assert.equal(chart.totals.opportunities, chart.totals.knownOpportunities + chart.totals.missingOpportunities);
  assert.equal(chart.totals.opportunities, actionKeys.reduce((sum, key) => sum + chart.totals[key], 0));
  chart.totals.knownCoveragePct = pct(chart.totals.knownOpportunities, chart.totals.opportunities);
}
function publicChart(chart, priorChart, minimumN) {
  const cells = chart.cells.map((cell) => cell[0] >= minimumN ? [...cell] : [0, 0, 0, 0, 0]);
  const estimates = chart.cells.map((cell, index) => estimateCell(cell, priorChart.cells[index], priorChart.totals, minimumN));
  const totals = {
    ...chart.totals,
    suppressedCellCount: chart.cells.filter((cell) => cell[0] > 0 && cell[0] < minimumN).length,
    exactCellCount: cells.filter((cell) => cell[0] >= minimumN).length,
    estimatedCellCount: estimates.filter((cell) => cell.some(Boolean)).length,
  };
  return { totals, cells, estimates };
}

function priorChartFor(key) {
  const [currentCohort, heroPosition, relation, stackBand, sizeBucket] = key.split('|');
  const prior = { totals: emptyTotals(), cells: hands.map(() => [0, 0, 0, 0, 0]) };
  for (const cohort of cohorts) {
    if (cohort === currentCohort) continue;
    const source = charts[keyFor(cohort, heroPosition, relation, stackBand, sizeBucket)];
    if (source) addChart(prior, source);
  }
  if (prior.totals.opportunities) return prior;

  // Hierarchical fallback: keep position/relation/stack, pool the measured size buckets.
  if (sizeBucket !== 'all') {
    for (const cohort of cohorts) {
      if (cohort === currentCohort) continue;
      const source = charts[keyFor(cohort, heroPosition, relation, stackBand, 'all')];
      if (source) addChart(prior, source);
    }
  }
  if (prior.totals.opportunities) return prior;

  // Last-resort prior keeps position/relation and leaves the current cohort out.
  for (const cohort of cohorts) {
    if (cohort === currentCohort) continue;
    for (const candidateStack of stackBands) {
      const source = charts[keyFor(cohort, heroPosition, relation, candidateStack, 'all')];
      if (source) addChart(prior, source);
    }
  }
  return prior;
}

function addChart(target, source) {
  for (const key of ['opportunities', ...actionKeys, 'knownOpportunities', 'missingOpportunities']) {
    target.totals[key] += Number(source.totals[key] || 0);
  }
  source.cells.forEach((cell, index) => {
    for (let item = 0; item < cell.length; item += 1) target.cells[index][item] += cell[item];
  });
}

function estimateCell(cell, priorCell, priorTotals, minimumN) {
  const n = cell[0];
  if (!n || n >= minimumN) return [0, 0, 0, 0];
  const priorN = priorCell[0] || priorTotals.opportunities;
  if (!priorN) return [0, 0, 0, 0];
  const priorCounts = priorCell[0] ? priorCell.slice(1) : actionKeys.map((key) => priorTotals[key]);
  const weights = cell.slice(1).map((count, index) => count + estimatePriorHands * priorCounts[index] / priorN);
  return normalizedTenths(weights);
}

function normalizedTenths(weights) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!total) return [0, 0, 0, 0];
  const raw = weights.map((value) => value / total * 1000);
  const result = raw.map(Math.floor);
  let remainder = 1000 - result.reduce((sum, value) => sum + value, 0);
  raw.map((value, index) => ({ index, fraction: value - result[index] }))
    .sort((a, b) => b.fraction - a.fraction)
    .slice(0, remainder)
    .forEach(({ index }) => { result[index] += 1; });
  return result;
}
function emptyTotals() { return { opportunities: 0, folds: 0, calls: 0, fourbets: 0, jams: 0, knownOpportunities: 0, missingOpportunities: 0 }; }
function addTotals(target, row) { for (const key of ['opportunities', ...actionKeys]) target[key] += row[key]; }
function summary(totals) { return { ...totals, knownCoveragePct: pct(totals.knownOpportunities, totals.opportunities), foldPct: pct(totals.folds, totals.opportunities), callPct: pct(totals.calls, totals.opportunities), fourbetPct: pct(totals.fourbets, totals.opportunities), jamPct: pct(totals.jams, totals.opportunities) }; }
function integer(value, label, row) { const n = Number(value); assert(Number.isSafeInteger(n) && n >= 0, `bad ${label} on row ${row}`); return n; }
function assertDate(value, row) { assert(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(value), `bad date on row ${row}`); }
function minDate(a, b) { return !a || b < a ? b : a; }
function maxDate(a, b) { return !a || b > a ? b : a; }
function pct(n, d) { return d ? Math.round(n / d * 100000) / 1000 : 0; }
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

function validateExternalRankSource(sourcePath) {
  const buffer = fs.readFileSync(sourcePath);
  const rows = buffer.toString('utf8').trimEnd().split(/\r?\n/).length - 1;
  assert.equal(rows, rankProvenance.rows, 'unexpected external rank-interval row count');
  assert.equal(sha256(buffer), rankProvenance.sha256, 'unexpected external rank-interval SHA-256');
}
