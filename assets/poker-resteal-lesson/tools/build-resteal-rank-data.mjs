#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(toolDirectory, '../data');
const require = createRequire(import.meta.url);
const confidence = require(path.resolve(toolDirectory, '../../poker-kit/observed-frequency-confidence.js'));
const options = parseArguments(process.argv.slice(2));
const checkOnly = options.check === true;
if (!checkOnly && (!options.input || !options.metadata)) {
  throw new Error('A write build requires --input=/path/cube.csv and --metadata=/path/source-metadata.json');
}
const csvPath = path.resolve(options.input || path.join(dataDirectory, 'resteal-rank-hand-cube.csv'));
const sourceMetadataPath = path.resolve(options.metadata || path.join(dataDirectory, 'resteal-rank-source-metadata.json'));
const queryTemplatePath = path.join(toolDirectory, 'resteal-rank-cube.sql');
const dataPath = path.join(dataDirectory, 'resteal-rank-data.js');
const diagnosticsPath = path.join(dataDirectory, 'resteal-rank-diagnostics.json');
const sourceMetadata = JSON.parse(fs.readFileSync(sourceMetadataPath, 'utf8'));
const exactCellMinimum = confidence.MIN_EXACT_DENOMINATOR;
assert.equal(typeof sourceMetadata.version, 'string', 'source metadata version is required');
const payloadVersion = sourceMetadata.version.replace(/-v\d+$/, '-v4');
assert.match(payloadVersion, /-v4$/, 'public preset schema must use the v4 payload version');
assert.equal(sourceMetadata.windowStartInclusive, '2023-09-01T00:00:00Z', 'unexpected source window start');
assert.equal(sourceMetadata.windowEndExclusive, '2026-07-22T00:00:00Z', 'unexpected source window end');
const handCubeProvenance = sourceMetadata.provenance?.handCube || {};
assert(
  ['immutable-user-id', 'contiguous-time'].includes(handCubeProvenance.shardStrategy),
  `unsupported hand-cube shard strategy ${handCubeProvenance.shardStrategy}`,
);
assert((handCubeProvenance.queryJobIds?.length || 0) > 1, 'multiple successful source shards are required');
const sourceShards = handCubeProvenance.shards || [];
assert.equal(sourceShards.length, sourceMetadata.provenance.handCube.queryJobIds.length, 'every successful job needs one shard provenance record');
assert.equal(new Set(sourceMetadata.provenance.handCube.queryJobIds).size, sourceShards.length, 'successful query job ids must be unique');
assert.deepEqual(
  [...sourceMetadata.provenance.handCube.queryJobIds].sort(),
  sourceShards.map((shard) => shard.queryJobId).sort(),
  'successful query job ids must match shard provenance exactly',
);
for (const shard of sourceShards) {
  assert.equal(shard.rankMin, 1, `rank shard must start at rank 1 for ${shard.name}`);
  assert.equal(shard.rankMax, 18, `rank shard must include rank 18 for ${shard.name}`);
  assert(shard.windowStartInclusive >= sourceMetadata.windowStartInclusive, `source shard starts before the product window for ${shard.name}`);
  assert(shard.windowEndExclusive <= sourceMetadata.windowEndExclusive, `source shard ends after the product window for ${shard.name}`);
  assert(shard.windowStartInclusive < shard.windowEndExclusive, `source shard has an empty window for ${shard.name}`);
  assert.match(shard.renderedSqlSha256, /^[a-f0-9]{64}$/, `missing rendered SQL hash for ${shard.name}`);
  assert.equal(
    shard.executionMode,
    executionMode(shard.queryJobId, shard.renderedSqlSha256),
    `execution mode does not match the source ref for ${shard.name}`,
  );
  assert.match(shard.exportSha256, /^[a-f0-9]{64}$/, `missing export hash for ${shard.name}`);
  assert(Number.isSafeInteger(shard.exportRows) && shard.exportRows > 0, `bad exported row count for ${shard.name}`);
  assert(Number.isSafeInteger(shard.rankIntervals) && shard.rankIntervals > 0, `bad rank-interval count for ${shard.name}`);
  assert(Number.isSafeInteger(shard.rankUsers) && shard.rankUsers > 0, `bad rank-user count for ${shard.name}`);
  assert.match(shard.userShard?.userIdsSha256 || '', /^[a-f0-9]{64}$/, `missing user-id-set hash for ${shard.name}`);
  assert(Number.isSafeInteger(shard.userShard?.index) && shard.userShard.index >= 0, `bad user-shard index for ${shard.name}`);
  assert(Number.isSafeInteger(shard.userShard?.count) && shard.userShard.count > 0, `bad user-shard count for ${shard.name}`);
  assert(Number.isSafeInteger(shard.userShard?.eligibleUsers) && shard.userShard.eligibleUsers >= shard.rankUsers, `bad eligible-user count for ${shard.name}`);
  assert.match(shard.privateSql, /^\/private\/tmp\//, `rendered SQL must remain an explicit private input for ${shard.name}`);
  assert.match(shard.privateCsv, /^\/private\/tmp\//, `raw export must remain an explicit private input for ${shard.name}`);
}
validateSourceShards(handCubeProvenance.shardStrategy, sourceShards, sourceMetadata);
const failedJobIds = new Set((sourceMetadata.provenance.handCube.failedAttempts || []).map((attempt) => attempt.queryJobId));
for (const queryJobId of sourceMetadata.provenance.handCube.queryJobIds) {
  assert(!failedJobIds.has(queryJobId), `failed ClickHouse attempt cannot be used as successful provenance: ${queryJobId}`);
}
assert.match(sourceMetadata.provenance.rankIntervals.sha256, /^[a-f0-9]{64}$/, 'rank bridge export hash is required');
assert.match(sourceMetadata.provenance.rankIntervals.privateCsv, /^\/private\/tmp\//, 'rank bridge raw export must remain an explicit private input');
assert.equal(sourceMetadata.provenance.handCube.classifier, 'effective-shove-v1', 'effective-shove classifier identity is required');
assert.equal(
  sourceMetadata.provenance.handCube.templateSha256,
  sha256(fs.readFileSync(queryTemplatePath)),
  'source metadata query-template hash does not match resteal-rank-cube.sql',
);

const expectedColumns = [
  'cohort',
  'opener_position',
  'open_size_bb',
  'depth_band',
  'holecards_str',
  'opportunities',
  'folds',
  'calls',
  'small3bets',
  'jams',
  'other',
  'first_hand_at',
  'last_hand_at',
];
const cohortOrder = ['novice', 'league3', 'league2', 'league1'];
const positionOrder = ['CO', 'BTN'];
const sourceSizeOrder = ['2.0', '2.5', '3.0'];
const sourceDepthOrder = ['25-30', '30-35', '35-40'];
const depthOrder = ['25-40', ...sourceDepthOrder];
const scenarioOrder = [
  '2.0|25-30',
  '2.0|30-35',
  '2.0|35-40',
  '2.0|25-40',
  '2.5-3.0|25-40',
];
const scenarioDefinitions = {
  '2.0|25-30': {
    size: '2.0',
    depth: '25-30',
    label: '2 BB · 25–30 BB',
    sourceSlices: [{ size: '2.0', depth: '25-30' }],
  },
  '2.0|30-35': {
    size: '2.0',
    depth: '30-35',
    label: '2 BB · 30–35 BB',
    sourceSlices: [{ size: '2.0', depth: '30-35' }],
  },
  '2.0|35-40': {
    size: '2.0',
    depth: '35-40',
    label: '2 BB · 35–40 BB',
    sourceSlices: [{ size: '2.0', depth: '35-40' }],
  },
  '2.0|25-40': {
    size: '2.0',
    depth: '25-40',
    label: '2 BB · 25–40 BB',
    sourceSlices: [{ size: '2.0', depth: '25-40' }],
  },
  '2.5-3.0|25-40': {
    size: '2.5-3.0',
    depth: '25-40',
    label: '2,5–3 BB · 25–40 BB',
    sourceSlices: [
      { size: '2.5', depth: '25-40' },
      { size: '3.0', depth: '25-40' },
    ],
  },
};
const ranks = 'AKQJT98765432'.split('');
const handOrder = ranks.flatMap((_, row) => ranks.map((__, column) => {
  if (row === column) return `${ranks[row]}${ranks[column]}`;
  if (row < column) return `${ranks[row]}${ranks[column]}s`;
  return `${ranks[column]}${ranks[row]}o`;
}));
const handIndex = new Map(handOrder.map((hand, index) => [hand, index]));
const missingHand = '__MISSING__';
const windowStart = sourceMetadata.windowStartInclusive;
const windowEnd = sourceMetadata.windowEndExclusive;
const abi = sourceMetadata.abi.cohorts;
const cohortMeta = {
  novice: { label: 'Ранги 15–18', ranks: [15, 16, 17, 18] },
  league3: { label: 'Лига 3', ranks: [11, 12, 13, 14] },
  league2: { label: 'Лига 2', ranks: [6, 7, 8, 9, 10] },
  league1: { label: 'Первая лига', ranks: [1, 2, 3, 4, 5] },
};

const csvBuffer = fs.readFileSync(csvPath);
const csvSha256 = sha256(csvBuffer);
assert.equal(sourceMetadata.provenance.handCube.sha256, csvSha256, 'source metadata hand-cube hash does not match the explicit CSV input');
const csvText = csvBuffer.toString('utf8').trimEnd();
const [headerLine, ...csvLines] = csvText.split(/\r?\n/);
assert.deepEqual(headerLine.split(','), expectedColumns, 'unexpected CSV columns');

const rows = csvLines.map((line, index) => {
  const values = line.split(',');
  assert.equal(values.length, expectedColumns.length, `CSV width mismatch on row ${index + 2}`);
  return Object.fromEntries(expectedColumns.map((column, columnIndex) => [column, values[columnIndex]]));
});

const charts = precreateCharts();
const rowKeys = new Set();
const globalTotals = emptyTotals();
let firstHandAt = null;
let lastHandAt = null;

for (const [index, row] of rows.entries()) {
  const rowNumber = index + 2;
  assert(cohortOrder.includes(row.cohort), `bad cohort on row ${rowNumber}`);
  assert(positionOrder.includes(row.opener_position), `bad position on row ${rowNumber}`);
  assert(sourceSizeOrder.includes(row.open_size_bb), `bad size on row ${rowNumber}`);
  assert(sourceDepthOrder.includes(row.depth_band), `bad depth on row ${rowNumber}`);
  assert(row.holecards_str === missingHand || handIndex.has(row.holecards_str), `bad hand on row ${rowNumber}`);

  const key = [row.cohort, row.opener_position, row.open_size_bb, row.depth_band, row.holecards_str].join('|');
  assert(!rowKeys.has(key), `duplicate cube row ${key}`);
  rowKeys.add(key);

  const counts = {
    opportunities: integer(row.opportunities, 'opportunities', rowNumber),
    folds: integer(row.folds, 'folds', rowNumber),
    calls: integer(row.calls, 'calls', rowNumber),
    small3bets: integer(row.small3bets, 'small3bets', rowNumber),
    jams: integer(row.jams, 'jams', rowNumber),
    other: integer(row.other, 'other', rowNumber),
  };
  assert.equal(
    counts.folds + counts.calls + counts.small3bets + counts.jams + counts.other,
    counts.opportunities,
    `actions do not sum to opportunities on row ${rowNumber}`,
  );
  assert.equal(counts.other, 0, `unknown preflop action on row ${rowNumber}`);
  assertDate(row.first_hand_at, rowNumber);
  assertDate(row.last_hand_at, rowNumber);
  assert(Date.parse(`${row.first_hand_at}Z`) <= Date.parse(`${row.last_hand_at}Z`), `reversed dates on row ${rowNumber}`);

  const chart = charts[row.cohort][row.opener_position][row.open_size_bb][row.depth_band];
  addTotals(chart.totals, counts);
  addTotals(globalTotals, counts);
  if (row.holecards_str === missingHand) {
    chart.totals.missingOpportunities += counts.opportunities;
    globalTotals.missingOpportunities += counts.opportunities;
  } else {
    chart.totals.knownOpportunities += counts.opportunities;
    globalTotals.knownOpportunities += counts.opportunities;
    addCell(chart.cells[handIndex.get(row.holecards_str)], counts);
  }
  chart.firstHandAt = minDate(chart.firstHandAt, row.first_hand_at);
  chart.lastHandAt = maxDate(chart.lastHandAt, row.last_hand_at);
  firstHandAt = minDate(firstHandAt, row.first_hand_at);
  lastHandAt = maxDate(lastHandAt, row.last_hand_at);
}

for (const cohort of cohortOrder) {
  for (const position of positionOrder) {
    for (const size of sourceSizeOrder) {
      const pooled = charts[cohort][position][size]['25-40'];
      for (const depth of sourceDepthOrder) addChart(pooled, charts[cohort][position][size][depth]);
    }
  }
}

validateCharts(charts);
assert.deepEqual(
  [rows.length, globalTotals.opportunities, globalTotals.folds, globalTotals.calls, globalTotals.small3bets, globalTotals.jams, sourceMetadata.expected.other],
  [sourceMetadata.expected.csvRows, sourceMetadata.expected.opportunities, sourceMetadata.expected.folds, sourceMetadata.expected.calls, sourceMetadata.expected.small3bets, sourceMetadata.expected.jams, 0],
  'source metadata totals do not reconcile with the explicit CSV input',
);

const presetCharts = buildPresetCharts(charts);
const presetCoverage = buildPresetCoverage(presetCharts);
const presetOrder = positionOrder.flatMap((position) => scenarioOrder.map((scenario) => presetKey(position, scenario)));
assert.deepEqual(
  presetCoverage.map((item) => item.key),
  presetOrder,
  'preset coverage order must be stable',
);
for (const coverage of presetCoverage) {
  assert(
    cohortOrder.every((cohort) => coverage.cohorts[cohort].cellsAtExactMinimum === handOrder.length),
    `preset ${coverage.key} is below the exact N threshold`,
  );
}
assert.equal(presetOrder.length, 10, 'the learner catalog must contain exactly ten complete presets');

const defaultSlice = { position: 'BTN', scenario: '2.0|25-40', size: '2.0', depth: '25-40' };
const defaultKey = presetKey(defaultSlice.position, defaultSlice.scenario);
assert(presetOrder.includes(defaultKey), `default preset ${defaultKey} is not publishable`);
const defaultDepthOpportunities = Object.fromEntries(sourceDepthOrder.map((depth) => [depth, sum(
  cohortOrder.map((cohort) => charts[cohort][defaultSlice.position][defaultSlice.size][depth].totals.opportunities),
)]));
const defaultDepthTotal = sum(Object.values(defaultDepthOpportunities));
const defaultDepthWeights = Object.fromEntries(sourceDepthOrder.map((depth) => [
  depth,
  round(defaultDepthOpportunities[depth] / defaultDepthTotal, 6),
]));

const summaries = Object.fromEntries(cohortOrder.map((cohort) => {
  const chart = charts[cohort][defaultSlice.position][defaultSlice.size][defaultSlice.depth];
  const standardizedRate = sum(sourceDepthOrder.map((depth) => {
    const depthChart = charts[cohort][defaultSlice.position][defaultSlice.size][depth];
    assert(depthChart.totals.opportunities > 0, `${cohort} has no data for default ${depth}`);
    return defaultDepthWeights[depth] * depthChart.totals.jams / depthChart.totals.opportunities;
  }));
  assert.equal(round(abi[cohort].loadUsd / abi[cohort].abiEntries, 2), abi[cohort].abiUsd, `${cohort} ABI mismatch`);
  return [cohort, {
    label: cohortMeta[cohort].label,
    ranks: cohortMeta[cohort].ranks,
    abiUsd: abi[cohort].abiUsd,
    abiPlayers: abi[cohort].abiPlayers,
    abiEntries: abi[cohort].abiEntries,
    abiLoadUsd: abi[cohort].loadUsd,
    standardizedJamPct: round(standardizedRate * 100, 3),
    standardizedOpportunities: chart.totals.opportunities,
    observedJamPct: pct(chart.totals.jams, chart.totals.opportunities),
    jams: chart.totals.jams,
  }];
}));

const correlationValues = cohortOrder.map((cohort) => ({
  cohort,
  abiUsd: summaries[cohort].abiUsd,
  standardizedJamPct: summaries[cohort].standardizedJamPct,
  opportunities: summaries[cohort].standardizedOpportunities,
}));
const correlation = {
  abiVsStandardizedJamPearson: round(pearson(
    correlationValues.map((item) => item.abiUsd),
    correlationValues.map((item) => item.standardizedJamPct),
  ), 4),
  method: 'Pearson r across four aggregate rank-at-hand cohorts; descriptive ecological association, not a causal training effect.',
  defaultSlice: {
    ...defaultSlice,
    depthStandardization: 'Common opportunity weights across all four cohorts in the three effective-stack bands.',
    depthWeights: defaultDepthWeights,
  },
  observations: correlationValues,
};

const payload = {
  version: payloadVersion,
  meta: {
    generatedOn: sourceMetadata.generatedOn,
    source: 'analytics.int_tracker_hand_joined',
    rankSource: 'analytics_mcp_readonly.mcp__check_rank_history',
    abiSource: 'analytics_mcp_readonly.mcp__fulltplayers',
    windowStartInclusive: windowStart,
    windowEndExclusive: windowEnd,
    rankAssignment: 'Exact rank interval at played_at; intervals are half-open and non-overlapping.',
    cohortOrder,
    cohorts: cohortMeta,
    positionOrder,
    sourceSizeOrder,
    sourceDepthOrder,
    scenarioOrder,
    scenarios: scenarioDefinitions,
    presetOrder,
    handOrder,
    missingHolecardsKey: missingHand,
    sampleThresholds: { exactCellMinimum },
    comparisonStateContract: 'The learner sees exactly ten source-backed presets. Every preset contains all 169 known-card cells in every one of the four compared cohorts at or above the shared exact denominator minimum.',
    filters: {
      heroPosition: 'BB',
      facing: 'Exactly one preflop raiser (val_preflop_action_facing=4)',
      couldThreebet: true,
      limpers: 0,
      tablePlayers: [3, 9],
      effectiveStackBb: [25, 40],
      openerPositions: positionOrder,
      openSizesBb: sourceSizeOrder.map(Number),
      openSizeToleranceBb: 0.05,
    },
    actionContract: {
      jam: "preflop_action='R' AND (is_preflop_allin=1 OR raise_and_blind_made_amount_bb - posted_blind_bb >= effective_stack_bb - 0.01)",
      small3bet: "preflop_action starts with R except a direct/effective-stack shove; RC/RR remain here even if the later line reached all-in",
      call: 'preflop_action starts with C',
      fold: "preflop_action='F'",
    },
    aggregation: 'All percentages must be calculated from integer counts. Pooling sums counts, never percentages.',
    sourceGrain: 'The checked-in cube carries only additive integer action counters; disjoint time windows or immutable user partitions merge without approximating distinct-player counts.',
    provenance: publicProvenance(sourceMetadata.provenance, rows.length, csvSha256),
  },
  summaries,
  correlation,
  charts: publishPresetCharts(presetCharts),
};

const diagnostics = buildDiagnostics(payload, charts, presetCoverage, rows.length, globalTotals, firstHandAt, lastHandAt);
const dataText = `window.PokerRestealRankData=${JSON.stringify(payload)};\n`;
const diagnosticsText = `${JSON.stringify(diagnostics, null, 2)}\n`;
for (const forbidden of [
  "/private/tmp/",
  "privateSql",
  "privateCsv",
  "privateJson",
  "failedAttempts",
  "strict is_preflop_allin-only classifier rejected",
]) {
  assert(!dataText.includes(forbidden), `public resteal payload leaks private build evidence: ${forbidden}`);
}

if (checkOnly) {
  assert.equal(fs.readFileSync(dataPath, 'utf8'), dataText, 'resteal-rank-data.js is stale');
  assert.equal(fs.readFileSync(diagnosticsPath, 'utf8'), diagnosticsText, 'resteal-rank-diagnostics.json is stale');
  console.log(`resteal rank data is current: ${rows.length} CSV rows, ${diagnostics.global.opportunities} opportunities`);
} else {
  fs.writeFileSync(dataPath, dataText);
  fs.writeFileSync(diagnosticsPath, diagnosticsText);
  console.log(JSON.stringify({ dataPath, diagnosticsPath, diagnostics }, null, 2));
}

function precreateCharts() {
  return Object.fromEntries(cohortOrder.map((cohort) => [cohort,
    Object.fromEntries(positionOrder.map((position) => [position,
      Object.fromEntries(sourceSizeOrder.map((size) => [size,
        Object.fromEntries(depthOrder.map((depth) => [depth, emptyChart()])),
      ])),
    ])),
  ]));
}

function publicProvenance(provenance, rows, cubeSha256) {
  const rankIntervals = provenance.rankIntervals || {};
  const handCube = provenance.handCube || {};
  const abiSource = provenance.abi || {};
  return {
    rankIntervals: {
      sourceRows: rankIntervals.sourceRows,
      usableRows: rankIntervals.usableRows,
      excludedZeroLength: rankIntervals.excludedZeroLength,
      users: rankIntervals.users,
      queryJobId: rankIntervals.queryJobId,
      sha256: rankIntervals.sha256,
    },
    handCube: {
      classifier: handCube.classifier,
      shardStrategy: handCube.shardStrategy,
      mergeSchema: handCube.mergeSchema,
      templateSha256: handCube.templateSha256,
      rows,
      sha256: cubeSha256,
      queryJobIds: [...handCube.queryJobIds],
      shards: handCube.shards.map((shard) => ({
        name: shard.name,
        rankMin: shard.rankMin,
        rankMax: shard.rankMax,
        windowStartInclusive: shard.windowStartInclusive,
        windowEndExclusive: shard.windowEndExclusive,
        queryJobId: shard.queryJobId,
        executionMode: shard.executionMode,
        renderedSqlSha256: shard.renderedSqlSha256,
        exportSha256: shard.exportSha256,
        exportRows: shard.exportRows,
        rankIntervals: shard.rankIntervals,
        rankUsers: shard.rankUsers,
        userShard: {
          index: shard.userShard.index,
          count: shard.userShard.count,
          eligibleUsers: shard.userShard.eligibleUsers,
          userIdsSha256: shard.userShard.userIdsSha256,
        },
      })),
    },
    abi: {
      queryJobId: abiSource.queryJobId,
      formula: abiSource.formula,
      querySha256: abiSource.querySha256,
      sha256: abiSource.sha256,
    },
  };
}

function emptyChart() {
  return {
    totals: emptyTotals(),
    cells: Array.from({ length: handOrder.length }, () => [0, 0, 0, 0, 0]),
    firstHandAt: null,
    lastHandAt: null,
  };
}

function emptyTotals() {
  return { opportunities: 0, folds: 0, calls: 0, small3bets: 0, jams: 0, knownOpportunities: 0, missingOpportunities: 0 };
}

function addTotals(target, source) {
  target.opportunities += source.opportunities;
  target.folds += source.folds;
  target.calls += source.calls;
  target.small3bets += source.small3bets;
  target.jams += source.jams;
  return target;
}

function addCell(target, counts) {
  target[0] += counts.opportunities;
  target[1] += counts.folds;
  target[2] += counts.calls;
  target[3] += counts.small3bets;
  target[4] += counts.jams;
}

function addChart(target, source) {
  addTotals(target.totals, source.totals);
  target.totals.knownOpportunities += source.totals.knownOpportunities;
  target.totals.missingOpportunities += source.totals.missingOpportunities;
  source.cells.forEach((cell, index) => cell.forEach((value, actionIndex) => { target.cells[index][actionIndex] += value; }));
  target.firstHandAt = minDate(target.firstHandAt, source.firstHandAt);
  target.lastHandAt = maxDate(target.lastHandAt, source.lastHandAt);
}

function validateCharts(tree) {
  for (const cohort of cohortOrder) for (const position of positionOrder) for (const size of sourceSizeOrder) for (const depth of depthOrder) {
    const chart = tree[cohort][position][size][depth];
    const knownFromCells = sum(chart.cells.map((cell) => cell[0]));
    assert.equal(chart.cells.length, 169, `bad cell count for ${cohort}/${position}/${size}/${depth}`);
    assert.equal(knownFromCells, chart.totals.knownOpportunities, `known total mismatch for ${cohort}/${position}/${size}/${depth}`);
    assert.equal(chart.totals.knownOpportunities + chart.totals.missingOpportunities, chart.totals.opportunities, `coverage mismatch for ${cohort}/${position}/${size}/${depth}`);
    assert.equal(chart.totals.folds + chart.totals.calls + chart.totals.small3bets + chart.totals.jams, chart.totals.opportunities, `action total mismatch for ${cohort}/${position}/${size}/${depth}`);
    for (const cell of chart.cells) {
      assert.equal(cell.length, 5);
      assert(cell.every((value) => Number.isSafeInteger(value) && value >= 0));
      assert.equal(cell[1] + cell[2] + cell[3] + cell[4], cell[0]);
    }
  }
}

function buildDiagnostics(data, sourceCharts, presetCoverage, csvRows, sourceTotals, first, last) {
  const chartCoverage = [];
  for (const cohort of cohortOrder) for (const position of positionOrder) for (const size of sourceSizeOrder) for (const depth of depthOrder) {
    const chart = sourceCharts[cohort][position][size][depth];
    const sampleSizes = chart.cells.map((cell) => cell[0]);
    chartCoverage.push({
      cohort, position, size, depth,
      opportunities: chart.totals.opportunities,
      jams: chart.totals.jams,
      jamPct: pct(chart.totals.jams, chart.totals.opportunities),
      knownOpportunities: chart.totals.knownOpportunities,
      knownCoveragePct: pct(chart.totals.knownOpportunities, chart.totals.opportunities),
      cellsN0: sampleSizes.filter((n) => n === 0).length,
      cellsNlt5: sampleSizes.filter((n) => n < 5).length,
      cellsNlt20: sampleSizes.filter((n) => n < 20).length,
      cellsNge50: sampleSizes.filter((n) => n >= 50).length,
    });
  }
  return {
    csvRows,
    csvSha256: data.meta.provenance.handCube.sha256,
    duplicateRows: csvRows - rowKeys.size,
    sourceChartsExpected: cohortOrder.length * positionOrder.length * sourceSizeOrder.length * sourceDepthOrder.length,
    frontendChartsExpected: presetOrder.length * cohortOrder.length,
    exactCellMinimum,
    presetOrder,
    presetCoverage,
    firstHandAt: first,
    lastHandAt: last,
    global: {
      opportunities: sourceTotals.opportunities,
      folds: sourceTotals.folds,
      calls: sourceTotals.calls,
      small3bets: sourceTotals.small3bets,
      jams: sourceTotals.jams,
      jamPct: pct(sourceTotals.jams, sourceTotals.opportunities),
      knownOpportunities: sourceTotals.knownOpportunities,
      missingOpportunities: sourceTotals.missingOpportunities,
      knownCoveragePct: pct(sourceTotals.knownOpportunities, sourceTotals.opportunities),
    },
    summaries: data.summaries,
    correlation: data.correlation,
    chartCoverage,
  };
}

function integer(value, field, rowNumber) {
  assert(/^\d+$/.test(value), `${field} is not an unsigned integer on row ${rowNumber}`);
  const parsed = Number(value);
  assert(Number.isSafeInteger(parsed), `${field} is unsafe on row ${rowNumber}`);
  return parsed;
}

function assertDate(value, rowNumber) {
  const timestamp = Date.parse(`${value}Z`);
  assert(Number.isFinite(timestamp), `bad date on row ${rowNumber}`);
  assert(timestamp >= Date.parse(windowStart) && timestamp < Date.parse(windowEnd), `date outside window on row ${rowNumber}`);
}

function minDate(current, candidate) { return current === null || candidate < current ? candidate : current; }
function maxDate(current, candidate) { return current === null || candidate > current ? candidate : current; }
function sum(values) { return values.reduce((total, value) => total + value, 0); }
function round(value, places) { const factor = 10 ** places; return Math.round(value * factor) / factor; }
function pct(numerator, denominator) { return denominator ? round(100 * numerator / denominator, 3) : null; }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function executionMode(sourceRef, querySha256) {
  if (sourceRef === `sync:${querySha256}`) return 'sync';
  assert.match(sourceRef || '', /^mcp_ch_job_[a-f0-9]+$/, 'source shard has no honest ClickHouse execution id');
  return 'async';
}

function pearson(xs, ys) {
  assert.equal(xs.length, ys.length);
  const xMean = sum(xs) / xs.length;
  const yMean = sum(ys) / ys.length;
  const numerator = sum(xs.map((x, index) => (x - xMean) * (ys[index] - yMean)));
  const xDenominator = Math.sqrt(sum(xs.map((x) => (x - xMean) ** 2)));
  const yDenominator = Math.sqrt(sum(ys.map((y) => (y - yMean) ** 2)));
  return numerator / (xDenominator * yDenominator);
}

function parseArguments(items) {
  const parsed = {};
  for (const item of items) {
    if (item === '--check') parsed.check = true;
    else {
      const match = item.match(/^--([^=]+)=(.*)$/);
      if (!match) throw new Error(`Expected --check or --key=value, got ${item}`);
      parsed[match[1]] = match[2];
    }
  }
  return parsed;
}

function presetKey(position, scenario) {
  return [position, scenario].join('|');
}

function validateImmutableUserShards(shards) {
  const declaredCounts = new Set(shards.map((shard) => shard.userShard.count));
  assert.equal(declaredCounts.size, 1, 'all user shards must declare the same partition count');
  const count = [...declaredCounts][0];
  assert.equal(shards.length, count, 'every immutable user-id partition must be present exactly once');
  assert.deepEqual(
    shards.map((shard) => shard.userShard.index).sort((left, right) => left - right),
    Array.from({ length: count }, (_, index) => index),
    `user-shard indices must cover 0..${count - 1}`,
  );
  const eligibleCounts = new Set(shards.map((shard) => shard.userShard.eligibleUsers));
  assert.equal(eligibleCounts.size, 1, 'user shards disagree on the eligible population');
  const eligibleUsers = [...eligibleCounts][0];
  assert.equal(shards.reduce((total, shard) => total + shard.rankUsers, 0), eligibleUsers, 'user-shard sizes do not reconcile to the eligible population');
  assert.equal(new Set(shards.map((shard) => shard.userShard.userIdsSha256)).size, count, 'user-id-set hashes must be unique');
}

function validateSourceShards(strategy, shards, metadata) {
  if (strategy === 'immutable-user-id') {
    for (const shard of shards) {
      assert.equal(shard.windowStartInclusive, metadata.windowStartInclusive, `user shard must cover the full source window for ${shard.name}`);
      assert.equal(shard.windowEndExclusive, metadata.windowEndExclusive, `user shard must cover the full source window for ${shard.name}`);
    }
    validateImmutableUserShards(shards);
    return;
  }

  const ordered = [...shards].sort((left, right) => left.windowStartInclusive.localeCompare(right.windowStartInclusive));
  assert.equal(ordered[0].windowStartInclusive, metadata.windowStartInclusive, 'time shards do not start at the product window boundary');
  assert.equal(ordered.at(-1).windowEndExclusive, metadata.windowEndExclusive, 'time shards do not end at the product window boundary');
  for (const shard of ordered) {
    assert.equal(shard.userShard.index, 0, `time shard must include the full user population for ${shard.name}`);
    assert.equal(shard.userShard.count, 1, `time and user sharding cannot be mixed for ${shard.name}`);
    assert.equal(shard.rankUsers, shard.userShard.eligibleUsers, `time shard must include every eligible rank user for ${shard.name}`);
  }
  for (let index = 1; index < ordered.length; index += 1) {
    assert.equal(ordered[index - 1].windowEndExclusive, ordered[index].windowStartInclusive, 'time shards must be contiguous and non-overlapping');
  }
}

function buildPresetCharts(sourceTree) {
  return Object.fromEntries(cohortOrder.map((cohort) => [cohort,
    Object.fromEntries(positionOrder.flatMap((position) => scenarioOrder.map((scenario) => {
      const preset = scenarioDefinitions[scenario];
      const chart = emptyChart();
      for (const source of preset.sourceSlices) {
        addChart(chart, sourceTree[cohort][position][source.size][source.depth]);
      }
      return [presetKey(position, scenario), chart];
    }))),
  ]));
}

function buildPresetCoverage(tree) {
  const coverage = [];
  for (const position of positionOrder) for (const scenario of scenarioOrder) {
    const key = presetKey(position, scenario);
    const definition = scenarioDefinitions[scenario];
    const cohorts = Object.fromEntries(cohortOrder.map((cohort) => {
      const samples = tree[cohort][key].cells.map((cell) => cell[0]);
      return [cohort, {
        cellsAtExactMinimum: samples.filter((sample) => sample >= exactCellMinimum).length,
        minN: Math.min(...samples),
        missingCells: samples.filter((sample) => sample === 0).length,
      }];
    }));
    coverage.push({
      key,
      position,
      scenario,
      size: definition.size,
      depth: definition.depth,
      sourceSlices: definition.sourceSlices,
      cohorts,
    });
  }
  return coverage;
}

function publishPresetCharts(tree) {
  return Object.fromEntries(cohortOrder.map((cohort) => [
    cohort,
    Object.fromEntries(presetOrder.map((key) => [key, tree[cohort][key]])),
  ]));
}
