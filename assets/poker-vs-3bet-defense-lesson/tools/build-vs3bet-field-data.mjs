#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const lessonDirectory = path.resolve(toolDirectory, '..');
const require = createRequire(import.meta.url);
const observedConfidence = require(path.resolve(lessonDirectory, '../poker-kit/observed-frequency-confidence.js'));
const dataDirectory = path.join(lessonDirectory, 'data');
const cubePaths = repeatedArgument('--cube', process.env.FF_VS3BET_FIELD_CUBES);
const cubeJobIds = repeatedArgument('--cube-job-id', process.env.FF_VS3BET_FIELD_CUBE_JOB_IDS);
const cubeExecutionModes = repeatedArgument('--cube-execution-mode', process.env.FF_VS3BET_FIELD_CUBE_EXECUTION_MODES);
const cubeQuerySha256 = repeatedArgument('--cube-query-sha256', process.env.FF_VS3BET_FIELD_CUBE_QUERY_SHA256);
const cubeWindowStarts = repeatedArgument('--cube-window-start', process.env.FF_VS3BET_FIELD_CUBE_WINDOW_STARTS);
const cubeWindowEnds = repeatedArgument('--cube-window-end', process.env.FF_VS3BET_FIELD_CUBE_WINDOW_ENDS);
const outputPath = singleArgument('--output') || path.join(dataDirectory, 'vs3bet-field-data.js');
const diagnosticsPath = singleArgument('--diagnostics') || path.join(dataDirectory, 'vs3bet-field-diagnostics.json');
const sourceQueryPath = path.join(toolDirectory, 'vs3bet-field-cube.sql');
const rankPath = singleArgument('--rank-intervals') || process.env.FF_VS3BET_RANK_INTERVALS;
const rankJobId = singleArgument('--rank-job-id') || process.env.FF_VS3BET_RANK_JOB_ID;
const rankExecutionMode = singleArgument('--rank-execution-mode') || process.env.FF_VS3BET_RANK_EXECUTION_MODE;
const rankQuerySha256 = singleArgument('--rank-query-sha256') || process.env.FF_VS3BET_RANK_QUERY_SHA256;
const rankWindowStart = singleArgument('--rank-window-start') || process.env.FF_VS3BET_RANK_WINDOW_START;
const rankWindowEnd = singleArgument('--rank-window-end') || process.env.FF_VS3BET_RANK_WINDOW_END;
const requestedVersion = singleArgument('--version') || 'vs3bet-field-cube-20260722-v6';
const requestedGeneratedOn = singleArgument('--generated-on');

const usage = 'Usage: build-vs3bet-field-data.mjs --cube <external-cube.csv> --cube-job-id <job-or-sync:sha> --cube-execution-mode <async|sync> --cube-query-sha256 <sha256> --cube-window-start <ISO> --cube-window-end <ISO> [repeat all six per non-overlapping shard] --rank-intervals <external-rank.csv> --rank-job-id <job> --rank-execution-mode <async|sync> --rank-query-sha256 <sha256> --rank-window-start <ISO> --rank-window-end <ISO> [--output <js>] [--diagnostics <json>]';
assert(cubePaths.length > 0, usage);
for (const [label, values] of [['cube job ids', cubeJobIds], ['cube execution modes', cubeExecutionModes], ['cube query hashes', cubeQuerySha256], ['cube window starts', cubeWindowStarts], ['cube window ends', cubeWindowEnds]]) {
  assert.equal(values.length, cubePaths.length, `${label} must have one explicit value per --cube. ${usage}`);
}
assert(rankPath && rankJobId && rankExecutionMode && rankQuerySha256 && rankWindowStart && rankWindowEnd, usage);

const legacyColumns = [
  'cohort', 'hero_position', 'threebettor_position', 'relation', 'stack_band',
  'threebet_to_bucket', 'holecards_str', 'opportunities', 'unique_players',
  'folds', 'calls', 'fourbets', 'jams', 'other', 'first_hand_at', 'last_hand_at',
];
const columns = legacyColumns.filter((column) => column !== 'unique_players');
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
const publishedCellMinimumN = 1;
const exactFrequencyMinimumN = observedConfidence.MIN_EXACT_DENOMINATOR;

const sourceQueryBuffer = fs.readFileSync(sourceQueryPath);
const shardInputs = cubePaths.map((sourcePath, index) => readCubeShard({
  sourcePath,
  queryJobId: cubeJobIds[index],
  executionMode: cubeExecutionModes[index],
  querySha256: cubeQuerySha256[index],
  windowStartInclusive: canonicalIso(cubeWindowStarts[index], `cube ${index + 1} window start`),
  windowEndExclusive: canonicalIso(cubeWindowEnds[index], `cube ${index + 1} window end`),
  ordinal: index + 1,
}));
validateShardWindows(shardInputs);
const rankProvenance = readRankProvenance({
  sourcePath: rankPath,
  queryJobId: rankJobId,
  executionMode: rankExecutionMode,
  querySha256: rankQuerySha256,
  windowStartInclusive: canonicalIso(rankWindowStart, 'rank window start'),
  windowEndExclusive: canonicalIso(rankWindowEnd, 'rank window end'),
});
const windowStartInclusive = shardInputs.map((shard) => shard.windowStartInclusive).sort()[0];
const windowEndExclusive = shardInputs.map((shard) => shard.windowEndExclusive).sort().at(-1);
assert.equal(rankProvenance.windowStartInclusive, windowStartInclusive, 'rank bridge must cover the exact full cube window start');
assert.equal(rankProvenance.windowEndExclusive, windowEndExclusive, 'rank bridge must cover the exact full cube window end');
const generatedOn = requestedGeneratedOn || windowEndExclusive.slice(0, 10);
assert(/^\d{4}-\d{2}-\d{2}$/.test(generatedOn), 'generated-on must be YYYY-MM-DD');

const mergedRows = new Map();
for (const shard of shardInputs) {
  for (const row of shard.rows) {
    const rowKey = cubeRowKey(row);
    const existing = mergedRows.get(rowKey);
    if (existing) mergeCubeRow(existing, row);
    else mergedRows.set(rowKey, { ...row });
  }
}
const rows = [...mergedRows.values()];
const rawCsvRowCount = shardInputs.reduce((sum, shard) => safeAdd(sum, shard.rows.length, 'raw CSV row count'), 0);
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
  const rowKey = cubeRowKey(row);
  assert(!seen.has(rowKey), `duplicate cube row ${rowKey}`);
  seen.add(rowKey);
  assert.equal(row.other, 0, `unknown action in ${rowKey}`);
  assert.equal(row.folds + row.calls + row.fourbets + row.jams, row.opportunities, `actions do not sum in ${rowKey}`);
  addTotals(global, row);
  addTotals(byCohort[row.cohort], row);
  const coverageKey = row.hand === missingHand ? 'missingOpportunities' : 'knownOpportunities';
  global[coverageKey] = safeAdd(global[coverageKey], row.opportunities, `global ${coverageKey}`);
  byCohort[row.cohort][coverageKey] = safeAdd(byCohort[row.cohort][coverageKey], row.opportunities, `${row.cohort} ${coverageKey}`);
  const positionKey = [row.cohort, row.heroPosition, row.threebettorPosition].join('|');
  exactThreebettorCounts[positionKey] = safeAdd(exactThreebettorCounts[positionKey] || 0, row.opportunities, `position total ${positionKey}`);
  dimensionTotals.heroPosition[row.heroPosition] = safeAdd(dimensionTotals.heroPosition[row.heroPosition], row.opportunities, `hero position ${row.heroPosition}`);
  dimensionTotals.relation[row.relation] = safeAdd(dimensionTotals.relation[row.relation], row.opportunities, `relation ${row.relation}`);
  dimensionTotals.stackBand[row.stackBand] = safeAdd(dimensionTotals.stackBand[row.stackBand], row.opportunities, `stack ${row.stackBand}`);
  dimensionTotals.sizeBucket[row.sizeBucket] = safeAdd(dimensionTotals.sizeBucket[row.sizeBucket], row.opportunities, `size ${row.sizeBucket}`);
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
const publicChartEntries = chartEntries.map(([key, chart]) => [key, publicChart(chart)]);
const publicCharts = Object.fromEntries(publicChartEntries);
const comparisonDimensionKeys = positionRelations.flatMap(([heroPosition, relation]) => (
  stackBands.flatMap((stackBand) => sizeBuckets.map((sizeBucket) => comparisonKey(heroPosition, relation, stackBand, sizeBucket)))
));
const comparisonCoverageByKey = Object.fromEntries(comparisonDimensionKeys.map((dimensionKey) => {
  const [heroPosition, relation, stackBand, sizeBucket] = dimensionKey.split('|');
  const cohortCharts = cohorts.map((cohort) => publicCharts[keyFor(cohort, heroPosition, relation, stackBand, sizeBucket)]);
  const allCohortsPresent = cohortCharts.every(Boolean);
  const minCommonPerHandN = allCohortsPresent
    ? Math.min(...cohortCharts.flatMap((chart) => chart.cells.map((cell) => cell[0])))
    : 0;
  return [dimensionKey, { minCommonPerHandN, enabled: allCohortsPresent && minCommonPerHandN >= exactFrequencyMinimumN }];
}));
const enabledComparisonKeys = comparisonDimensionKeys.filter((key) => comparisonCoverageByKey[key].enabled);
const defaultKey = keyFor('league3', 'BTN', 'IP', '31-50', 'all');
const [resolvedDefaultKey, defaultChart] = publicCharts[defaultKey]
  ? [defaultKey, publicCharts[defaultKey]]
  : (publicChartEntries[0] || []);
assert(defaultChart, 'no observed charts built');

const payload = {
  status: 'ready',
  version: requestedVersion,
  meta: {
    generatedOn,
    source: 'analytics.int_tracker_hand_joined',
    rankSource: 'analytics_mcp_readonly.mcp__check_rank_history',
    windowStartInclusive,
    windowEndExclusive,
    rankAssignment: 'Exact half-open rank interval at played_at; real players only.',
    cohorts: {
      novice: { label: 'Ранги 15–18', ranks: [15, 16, 17, 18] },
      league3: { label: 'Лига 3', ranks: [11, 12, 13, 14] },
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
    samplePolicy: { publishedCellMinimumN, exactFrequencyMinimumN, strongAtLeast: 80, smoothing: false },
    enabledComparisonKeys,
    coverage: {
      policy: 'Every observed hand cell is published from its exact integer counters. A zero remains unavailable rather than being filled with a modelled action mix.',
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
      jam: "preflop_face_3bet_action='R' AND preflop_action='RR' AND (is_preflop_allin=1 OR raise_and_blind_bb-posted_blind_bb>=effective_stack_bb-0.01)",
      fourbet: "all other preflop_face_3bet_action='R' lines",
    },
    aggregation: 'Chart summaries and hand cells use exact integer counters. Browser charts pool exact 3-bettor positions only to IP/OOP; the lossless CSV retains exact positions.',
    provenance: {
      rankIntervals: {
        ...rankProvenance,
        storage: 'External private build input; individual user_id rank histories are not shipped as a public lesson asset.',
      },
      handCube: {
        rows: rawCsvRowCount,
        mergedRows: rows.length,
        shards: shardInputs.map(({ ordinal, rows: shardRows, buffer, ...shard }) => ({
          ordinal,
          rows: shardRows.length,
          queryJobId: shard.queryJobId,
          executionMode: shard.executionMode,
          querySha256: shard.querySha256,
          windowStartInclusive: shard.windowStartInclusive,
          windowEndExclusive: shard.windowEndExclusive,
          sha256: sha256(buffer),
        })),
        sourceQueryTemplateSha256: sha256(sourceQueryBuffer),
      },
    },
  },
  summaries: Object.fromEntries(cohorts.map((cohort) => [cohort, summary(byCohort[cohort])])),
  charts: publicCharts,
};

const diagnostics = {
  version: payload.version,
  csvRows: rawCsvRowCount,
  mergedCellRows: rows.length,
  crossShardMergedRows: rawCsvRowCount - rows.length,
  duplicateRows: rows.length - seen.size,
  chartCount: chartEntries.length,
  publicChartCount: publicChartEntries.length,
  structurallyValidChartCount,
  missingStructurallyValidCharts: missingStructurallyValidChartKeys.length,
  missingStructurallyValidChartKeys,
  structurallyEmptyPublishedCharts: 0,
  firstHandAt,
  lastHandAt,
  global: { ...global, knownCoveragePct: pct(global.knownOpportunities, global.opportunities) },
  byCohort: Object.fromEntries(cohorts.map((cohort) => [cohort, summary(byCohort[cohort])])),
  dimensionTotals,
  cellCoverage: {
    nonEmptyCells: cellSamples.length,
    unpublishedCells: chartEntries.flatMap(([, chart]) => chart.cells).filter((cell) => cell[0] < payload.meta.samplePolicy.publishedCellMinimumN).length,
    hiddenExactFrequencyCells: chartEntries.flatMap(([, chart]) => chart.cells).filter((cell) => cell[0] < payload.meta.samplePolicy.exactFrequencyMinimumN).length,
    visibleExactFrequencyCells: cellSamples.filter((n) => n >= payload.meta.samplePolicy.exactFrequencyMinimumN).length,
    strongCells: cellSamples.filter((n) => n >= payload.meta.samplePolicy.strongAtLeast).length,
  },
  comparisonCoverage: {
    totalDimensionKeys: comparisonDimensionKeys.length,
    enabledDimensionKeys: enabledComparisonKeys.length,
    disabledDimensionKeys: comparisonDimensionKeys.length - enabledComparisonKeys.length,
    minimumCommonPerHandN: Math.min(...Object.values(comparisonCoverageByKey).map((entry) => entry.minCommonPerHandN)),
    maximumCommonPerHandN: Math.max(...Object.values(comparisonCoverageByKey).map((entry) => entry.minCommonPerHandN)),
    byKey: comparisonCoverageByKey,
  },
  defaultSlice: {
    key: resolvedDefaultKey,
    totals: defaultChart.totals,
    populatedHands: defaultChart.cells.filter((cell) => cell[0] > 0).length,
    estimatedHands: 0,
  },
  provenance: payload.meta.provenance,
};

const output = `window.FF_VS3BET_FIELD_DATA=${JSON.stringify(payload)};\n`;
const diagnosticsOutput = `${JSON.stringify(diagnostics, null, 2)}\n`;
fs.writeFileSync(outputPath, output);
fs.writeFileSync(diagnosticsPath, diagnosticsOutput);
console.log(JSON.stringify({ sourceRows: rawCsvRowCount, mergedRows: rows.length, charts: chartEntries.length, enabledComparisonKeys: enabledComparisonKeys.length, global: diagnostics.global, defaultSlice: diagnostics.defaultSlice }, null, 2));

function parseRow(line, rowNumber, headerColumns = columns) {
  const values = line.split(',');
  assert.equal(values.length, headerColumns.length, `CSV width mismatch on row ${rowNumber}`);
  const source = Object.fromEntries(headerColumns.map((column, index) => [column, values[index]]));
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
    folds: integer(source.folds, 'folds', rowNumber),
    calls: integer(source.calls, 'calls', rowNumber),
    fourbets: integer(source.fourbets, 'fourbets', rowNumber),
    jams: integer(source.jams, 'jams', rowNumber),
    other: integer(source.other, 'other', rowNumber),
    firstHandAt: source.first_hand_at,
    lastHandAt: source.last_hand_at,
  };
  return result;
}

function keyFor(cohort, heroPosition, relation, stackBand, sizeBucket) {
  return [cohort, heroPosition, relation, stackBand, sizeBucket].join('|');
}
function comparisonKey(heroPosition, relation, stackBand, sizeBucket) {
  return [heroPosition, relation, stackBand, sizeBucket].join('|');
}
function chartFor(cohort, heroPosition, relation, stackBand, sizeBucket) {
  const key = keyFor(cohort, heroPosition, relation, stackBand, sizeBucket);
  if (!charts[key]) charts[key] = { totals: emptyTotals(), cells: hands.map(() => [0, 0, 0, 0, 0]) };
  return charts[key];
}
function addToChart(chart, row) {
  addTotals(chart.totals, row);
  if (row.hand === missingHand) chart.totals.missingOpportunities = safeAdd(chart.totals.missingOpportunities, row.opportunities, 'chart missing opportunities');
  else {
    chart.totals.knownOpportunities = safeAdd(chart.totals.knownOpportunities, row.opportunities, 'chart known opportunities');
    const cell = chart.cells[handIndex.get(row.hand)];
    cell[0] = safeAdd(cell[0], row.opportunities, 'chart hand opportunities');
    cell[1] = safeAdd(cell[1], row.folds, 'chart hand folds');
    cell[2] = safeAdd(cell[2], row.calls, 'chart hand calls');
    cell[3] = safeAdd(cell[3], row.fourbets, 'chart hand fourbets');
    cell[4] = safeAdd(cell[4], row.jams, 'chart hand jams');
  }
}
function finalizeChart(chart) {
  assert.equal(chart.totals.opportunities, chart.totals.knownOpportunities + chart.totals.missingOpportunities);
  assert.equal(chart.totals.opportunities, actionKeys.reduce((sum, key) => sum + chart.totals[key], 0));
  chart.totals.knownCoveragePct = pct(chart.totals.knownOpportunities, chart.totals.opportunities);
}
function publicChart(chart) {
  const cells = chart.cells.map((cell) => [...cell]);
  const known = cells.reduce(
    (totals, cell) => totals.map((value, index) => safeAdd(value, cell[index], `public chart cell total ${index}`)),
    [0, 0, 0, 0, 0],
  );
  const totals = {
    opportunities: known[0],
    folds: known[1],
    calls: known[2],
    fourbets: known[3],
    jams: known[4],
    knownOpportunities: known[0],
    missingOpportunities: chart.totals.missingOpportunities,
    sourceOpportunities: chart.totals.opportunities,
    knownCoveragePct: chart.totals.knownCoveragePct,
    exactCellCount: cells.filter((cell) => cell[0] >= publishedCellMinimumN).length,
  };
  assert.equal(totals.opportunities, totals.folds + totals.calls + totals.fourbets + totals.jams);
  assert.equal(totals.sourceOpportunities, totals.knownOpportunities + totals.missingOpportunities);
  return { totals, cells };
}
function emptyTotals() { return { opportunities: 0, folds: 0, calls: 0, fourbets: 0, jams: 0, knownOpportunities: 0, missingOpportunities: 0 }; }
function addTotals(target, row) { for (const key of ['opportunities', ...actionKeys]) target[key] = safeAdd(target[key], row[key], `total ${key}`); }
function summary(totals) { return { ...totals, knownCoveragePct: pct(totals.knownOpportunities, totals.opportunities), foldPct: pct(totals.folds, totals.opportunities), callPct: pct(totals.calls, totals.opportunities), fourbetPct: pct(totals.fourbets, totals.opportunities), jamPct: pct(totals.jams, totals.opportunities) }; }
function integer(value, label, row) { const n = Number(value); assert(Number.isSafeInteger(n) && n >= 0, `bad ${label} on row ${row}`); return n; }
function assertDate(value, row) { assert(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(value), `bad date on row ${row}`); }
function minDate(a, b) { return !a || b < a ? b : a; }
function maxDate(a, b) { return !a || b > a ? b : a; }
function pct(n, d) { return d ? Math.round(n / d * 100000) / 1000 : 0; }
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

function repeatedArgument(name, environmentValue) {
  const values = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1];
    assert(value && !value.startsWith('--'), `${name} requires a value`);
    values.push(value);
  }
  if (values.length) return values;
  return (environmentValue || '').split(',').map((value) => value.trim()).filter(Boolean);
}

function singleArgument(name) {
  const values = repeatedArgument(name);
  assert(values.length <= 1, `${name} may be provided only once`);
  return values[0] || '';
}

function canonicalIso(value, label) {
  const parsed = new Date(value);
  assert(!Number.isNaN(parsed.valueOf()), `${label} must be a valid UTC timestamp`);
  assert(/Z$/.test(value), `${label} must be explicit UTC (Z)`);
  return parsed.toISOString().replace('.000Z', 'Z');
}

function readCubeShard({ sourcePath, queryJobId, executionMode, querySha256, windowStartInclusive, windowEndExclusive, ordinal }) {
  assert(windowStartInclusive < windowEndExclusive, `cube ${ordinal} has an empty or reversed window`);
  assert(/^[a-f0-9]{64}$/.test(querySha256), `cube ${ordinal} requires a lowercase SHA-256 query hash`);
  validateExecutionIdentity({ queryJobId, executionMode, querySha256, label: `cube ${ordinal}` });
  const buffer = fs.readFileSync(sourcePath);
  const lines = buffer.toString('utf8').trimEnd().split(/\r?\n/);
  assert(lines.length > 1, `cube ${ordinal} contains no rows`);
  const headerColumns = lines.shift().split(',');
  assert(
    arraysEqual(headerColumns, columns) || arraysEqual(headerColumns, legacyColumns),
    `unexpected field cube columns in shard ${ordinal}`,
  );
  const seenInShard = new Set();
  const rows = lines.map((line, index) => {
    const row = parseRow(line, index + 2, headerColumns);
    const rowKey = cubeRowKey(row);
    assert(!seenInShard.has(rowKey), `duplicate row inside cube shard ${ordinal}: ${rowKey}`);
    seenInShard.add(rowKey);
    assert.equal(row.other, 0, `unknown action in shard ${ordinal}: ${rowKey}`);
    assert.equal(row.folds + row.calls + row.fourbets + row.jams, row.opportunities, `actions do not sum in shard ${ordinal}: ${rowKey}`);
    const first = canonicalCubeTimestamp(row.firstHandAt);
    const last = canonicalCubeTimestamp(row.lastHandAt);
    assert(first >= windowStartInclusive && first < windowEndExclusive, `first_hand_at outside cube ${ordinal} window: ${rowKey}`);
    assert(last >= windowStartInclusive && last < windowEndExclusive, `last_hand_at outside cube ${ordinal} window: ${rowKey}`);
    return row;
  });
  return { ordinal, queryJobId, executionMode, querySha256, windowStartInclusive, windowEndExclusive, buffer, rows };
}

function readRankProvenance({ sourcePath, queryJobId, executionMode, querySha256, windowStartInclusive, windowEndExclusive }) {
  assert(windowStartInclusive < windowEndExclusive, 'rank bridge has an empty or reversed window');
  assert(/^[a-f0-9]{64}$/.test(querySha256), 'rank bridge requires a lowercase SHA-256 query hash');
  validateExecutionIdentity({ queryJobId, executionMode, querySha256, label: 'rank bridge' });
  const buffer = fs.readFileSync(sourcePath);
  const lines = buffer.toString('utf8').trimEnd().split(/\r?\n/);
  assert(lines.length > 1, 'rank bridge contains no rows');
  return {
    rows: lines.length - 1,
    queryJobId,
    executionMode,
    querySha256,
    windowStartInclusive,
    windowEndExclusive,
    sha256: sha256(buffer),
  };
}

function validateExecutionIdentity({ queryJobId, executionMode, querySha256, label }) {
  assert(['async', 'sync'].includes(executionMode), `${label} execution mode must be async or sync`);
  assert(queryJobId, `${label} requires a source execution identity`);
  if (executionMode === 'sync') assert.equal(queryJobId, `sync:${querySha256}`, `${label} sync identity must equal sync:<querySha256>`);
  else assert(!queryJobId.startsWith('sync:'), `${label} async execution must use its provider job id`);
}

function validateShardWindows(shards) {
  shards.sort((a, b) => a.windowStartInclusive.localeCompare(b.windowStartInclusive));
  for (let index = 1; index < shards.length; index += 1) {
    const previous = shards[index - 1];
    const current = shards[index];
    assert(previous.windowEndExclusive <= current.windowStartInclusive, `cube windows overlap: ${previous.ordinal} and ${current.ordinal}`);
    assert.equal(previous.windowEndExclusive, current.windowStartInclusive, `cube windows must be contiguous: ${previous.ordinal} and ${current.ordinal}`);
  }
}

function mergeCubeRow(target, source) {
  for (const key of ['opportunities', 'folds', 'calls', 'fourbets', 'jams', 'other']) {
    target[key] = safeAdd(target[key], source[key], `merged ${key}`);
  }
  target.firstHandAt = minDate(target.firstHandAt, source.firstHandAt);
  target.lastHandAt = maxDate(target.lastHandAt, source.lastHandAt);
}

function cubeRowKey(row) {
  return [row.cohort, row.heroPosition, row.threebettorPosition, row.relation, row.stackBand, row.sizeBucket, row.hand].join('|');
}

function canonicalCubeTimestamp(value) {
  return canonicalIso(`${value.replace(' ', 'T')}Z`, 'cube timestamp');
}

function safeAdd(left, right, label) {
  const value = left + right;
  assert(Number.isSafeInteger(value) && value >= 0, `${label} exceeds exact integer range`);
  return value;
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
