#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(directory, '../data');
const csvPath = path.join(dataDirectory, 'resteal-rank-hand-cube.csv');
const dataPath = path.join(dataDirectory, 'resteal-rank-data.js');
const diagnosticsPath = path.join(dataDirectory, 'resteal-rank-diagnostics.json');
const sqlPath = path.join(directory, 'resteal-rank-cube.sql');

const renderer = spawnSync(process.execPath, [path.join(directory, 'test-resteal-rank-query-renderer.mjs')], { encoding: 'utf8' });
assert.equal(renderer.status, 0, renderer.stderr || renderer.stdout);

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(dataPath, 'utf8'), context, { filename: dataPath });
const data = context.window.PokerRestealRankData;
const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
const sql = fs.readFileSync(sqlPath, 'utf8');
const csv = fs.readFileSync(csvPath);
const cubeEvidence = totalsFromCube(csv.toString('utf8'));
const publicDataSource = fs.readFileSync(dataPath, 'utf8');

assert(data, 'window.PokerRestealRankData is missing');
assert.match(data.version, /^resteal-rank-cube-\d{8}-full-history-r15-r18-v\d+$/);
assert.equal(data.meta.windowStartInclusive, '2023-09-01T00:00:00Z');
assert.equal(data.meta.windowEndExclusive, '2026-07-22T00:00:00Z');
assert.deepEqual(Array.from(data.meta.cohortOrder), ['novice', 'league3', 'league2', 'league1']);
assert.deepEqual(Array.from(data.meta.cohorts.novice.ranks), [15, 16, 17, 18]);
assert.deepEqual(Array.from(data.meta.cohorts.league3.ranks), [11, 12, 13, 14]);
assert.deepEqual(Array.from(data.meta.cohorts.league2.ranks), [6, 7, 8, 9, 10]);
assert.deepEqual(Array.from(data.meta.cohorts.league1.ranks), [1, 2, 3, 4, 5]);
const allRanks = Array.from(data.meta.cohortOrder).flatMap((cohort) => Array.from(data.meta.cohorts[cohort].ranks));
assert.equal(new Set(allRanks).size, allRanks.length, 'product cohorts must be disjoint');
assert.equal(allRanks.includes(18), true, 'rank 18 belongs to the novice comparison cohort');
assert.deepEqual(Array.from(data.meta.positionOrder), ['CO', 'BTN']);
assert.deepEqual(Array.from(data.meta.sourceSizeOrder), ['2.0', '2.5', '3.0']);
assert.deepEqual(Array.from(data.meta.sourceDepthOrder), ['25-30', '30-35', '35-40']);
const expectedScenarios = ['2.0|25-30', '2.0|30-35', '2.0|35-40', '2.0|25-40', '2.5-3.0|25-40'];
const expectedPresets = ['CO', 'BTN'].flatMap((position) => expectedScenarios.map((scenario) => `${position}|${scenario}`));
assert.deepEqual(Array.from(data.meta.scenarioOrder), expectedScenarios);
assert.deepEqual(Array.from(data.meta.presetOrder), expectedPresets);
assert.deepEqual(Array.from(diagnostics.presetOrder), expectedPresets);
assert.equal(new Set(data.meta.presetOrder).size, 10);
assert.deepEqual(
  JSON.parse(JSON.stringify(data.meta.scenarios['2.5-3.0|25-40'].sourceSlices)),
  [{ size: '2.5', depth: '25-40' }, { size: '3.0', depth: '25-40' }],
  'the combined open-size preset declares both exact source slices',
);
assert.equal(data.meta.handOrder.length, 169);
assert.equal(new Set(data.meta.handOrder).size, 169);
assert.equal(data.meta.sampleThresholds.exactCellMinimum, 50);
assert.match(data.meta.comparisonStateContract, /ten source-backed presets.*169.*every one of the four.*shared exact denominator/i);

assert.match(data.meta.actionContract.jam, /preflop_action='R'.*is_preflop_allin=1.*raise_and_blind_made_amount_bb - posted_blind_bb >= effective_stack_bb - 0\.01/);
assert.match(sql, /h\.preflop_raise_and_blind_made_amount_bb/);
assert.match(sql, /coalesce\(h\.bet_bb_amount, 0\) \/ h\.bb_amount/);
assert.match(sql, /x\.3 = 'R' AND \([\s\S]*x\.4 = 1[\s\S]*isNotNull\(x\.17\)[\s\S]*x\.17 - x\.18 >= x\.7 - 0\.01[\s\S]*\), 'jam'/);
assert.match(sql, /startsWith\(x\.3, 'R'\), 'small3bet'/);
assert.match(sql, /rang BETWEEN 15 AND 18, 'novice'/);
assert.match(sql, /rang BETWEEN 11 AND 14, 'league3'/);
assert.match(sql, /rang BETWEEN 6 AND 10, 'league2'/);
assert.match(sql, /rang BETWEEN 1 AND 5, 'league1'/);
assert.match(sql, /f\.rang BETWEEN 1 AND 18/, 'ABI query includes rank 18 under the same cohort contract');
assert.match(sql, /GROUP BY h\.hand_player_id/, 'latest versions are resolved at hand-player grain');
assert(sql.indexOf('candidate_ids AS') < sql.indexOf('latest_overall AS'), 'candidate pruning must precede latest-version resolution');
assert.match(sql, /INNER JOIN candidate_ids AS c USING \(hand_player_id\)/, 'latest-version pass must be restricted by candidate hand ids');
const latestSection = sql.slice(sql.indexOf('latest_overall AS'), sql.indexOf('ranked_latest AS'));
for (const forbidden of [/x\.9 = 1/, /val_preflop_action_facing\s*=\s*4/, /is_preflop_could_3bet\s*=\s*1/, /preflop_effective_stack_size_bb BETWEEN/]) {
  assert.doesNotMatch(latestSection, forbidden, `business filter ${forbidden} cannot run before argMax`);
}
assert.match(latestSection, /tuple\(\s*h\.version,\s*h\.user_id,\s*h\.played_at,[\s\S]*h\.preflop_raise_and_blind_made_amount_bb,[\s\S]*h\.bet_bb_amount/, 'equal-version rows use the complete projected tuple as a deterministic tie-break');
assert.doesNotMatch(latestSection, /tuple\(h\.version,\s*h\.hand_player_id\)/, 'grouped hand_player_id is not an equal-version tie-break');
assert(sql.indexOf('latest_overall AS') < sql.indexOf('ranked_latest AS'));
assert(sql.indexOf('ranked_latest AS') < sql.indexOf('filtered AS'));
assert.match(sql, /WHERE x\.9 = 1[\s\S]*AND x\.10 = 4[\s\S]*AND x\.11 = 1/, 'poker filters run after latest-version resolution');

let frontendCharts = 0;
assert.equal(diagnostics.presetCoverage.length, 10);
for (const coverage of diagnostics.presetCoverage) {
  for (const cohort of data.meta.cohortOrder) {
    const chart = data.charts[cohort]?.[coverage.key] || null;
    frontendCharts += 1;
    validateChart(chart, `${cohort}/${coverage.key}`);
    assert(Math.min(...chart.cells.map((cell) => cell[0])) >= data.meta.sampleThresholds.exactCellMinimum, `published chart below N threshold: ${cohort}/${coverage.key}`);
    assert.equal(coverage.cohorts[cohort].cellsAtExactMinimum, 169);
    assert.equal(coverage.cohorts[cohort].missingCells, 0);
  }
}
assert.equal(frontendCharts, diagnostics.frontendChartsExpected);
assert.equal(frontendCharts, 10 * data.meta.cohortOrder.length);
const classifierSanityChart = data.charts.league1["BTN|2.0|30-35"];
const aces = classifierSanityChart.cells[data.meta.handOrder.indexOf("AA")];
const eights = classifierSanityChart.cells[data.meta.handOrder.indexOf("88")];
assert(
  aces[3] > aces[4],
  "regular AA 3-bets must remain separate from direct/effective-stack shoves",
);
assert(
  eights[4] > eights[3],
  "the observed 88 shove-heavy line must survive the same classifier rather than being normalized away",
);
for (const cohort of data.meta.cohortOrder) {
  for (const position of data.meta.positionOrder) {
    const expectedPooled = pooledChartFromCube(csv.toString('utf8'), cohort, position, Array.from(data.meta.handOrder));
    const actualPooled = data.charts[cohort][`${position}|2.5-3.0|25-40`];
    assert.deepEqual(
      ['opportunities', 'folds', 'calls', 'small3bets', 'jams', 'knownOpportunities', 'missingOpportunities']
        .map((key) => actualPooled.totals[key]),
      ['opportunities', 'folds', 'calls', 'small3bets', 'jams', 'knownOpportunities', 'missingOpportunities']
        .map((key) => expectedPooled.totals[key]),
      `pooled totals must be exact integer-count sums: ${cohort}/${position}`,
    );
    for (let index = 0; index < data.meta.handOrder.length; index += 1) {
      assert.deepEqual(
        Array.from(actualPooled.cells[index]),
        expectedPooled.cells[index],
        `pooled cell must equal 2.5x + 3x source counts: ${cohort}/${position}/${data.meta.handOrder[index]}`,
      );
    }
  }
}
assert.equal(diagnostics.duplicateRows, 0);
assert.equal(diagnostics.csvRows, data.meta.provenance.handCube.rows);
assert.equal(diagnostics.csvSha256, sha256(csv));
assert.equal(diagnostics.csvSha256, data.meta.provenance.handCube.sha256);
assert.equal(diagnostics.global.opportunities, diagnostics.global.folds + diagnostics.global.calls + diagnostics.global.small3bets + diagnostics.global.jams);
assert.equal(diagnostics.global.knownOpportunities + diagnostics.global.missingOpportunities, diagnostics.global.opportunities);

assert.deepEqual(
  [diagnostics.csvRows, diagnostics.global.opportunities, diagnostics.global.folds, diagnostics.global.calls, diagnostics.global.small3bets, diagnostics.global.jams],
  [cubeEvidence.rows, cubeEvidence.opportunities, cubeEvidence.folds, cubeEvidence.calls, cubeEvidence.small3bets, cubeEvidence.jams],
  'checked public diagnostics do not reconcile with the additive cube',
);
assert.equal(data.meta.provenance.rankIntervals.queryJobId, 'mcp_bq_job_0795894633234a1dbed2032ae29ee179');
assert.equal(data.meta.provenance.rankIntervals.sourceRows, 19699);
assert.equal(data.meta.provenance.rankIntervals.usableRows, 19698);
assert.equal(data.meta.provenance.rankIntervals.excludedZeroLength, 1);
assert.equal(data.meta.provenance.rankIntervals.users, 3881);
assert.equal(data.meta.provenance.rankIntervals.sha256, '7510e40b42cad7bf6bce6dbca9c2ba0f5d157a8ff2df5b7f9f28ca37eafb1d9e');
assert.equal(data.meta.provenance.handCube.classifier, 'effective-shove-v1');
assert.equal(data.meta.provenance.handCube.templateSha256, sha256(fs.readFileSync(sqlPath)));
assert(['immutable-user-id', 'contiguous-time'].includes(data.meta.provenance.handCube.shardStrategy));
const successfulRefs = Array.from(data.meta.provenance.handCube.queryJobIds);
const sourceShards = Array.from(data.meta.provenance.handCube.shards);
assert(sourceShards.length > 1, 'full-history extraction needs multiple reproducible shards');
assert.equal(sourceShards.length, successfulRefs.length);
assert.equal(new Set(successfulRefs).size, successfulRefs.length);
assert.deepEqual(successfulRefs, sourceShards.map((shard) => shard.queryJobId));
for (const shard of sourceShards) {
  assert.equal(shard.rankMin, 1);
  assert.equal(shard.rankMax, 18);
  assert.match(shard.renderedSqlSha256, /^[a-f0-9]{64}$/);
  if (shard.executionMode === "sync") {
    assert.equal(shard.queryJobId, `sync:${shard.renderedSqlSha256}`);
  } else {
    assert.equal(shard.executionMode, "async");
    assert.match(shard.queryJobId, /^mcp_ch_job_[a-f0-9]+$/);
  }
  assert.match(shard.exportSha256, /^[a-f0-9]{64}$/);
  assert.match(shard.userShard.userIdsSha256, /^[a-f0-9]{64}$/);
  assert.equal("privateSql" in shard, false);
  assert.equal("privateCsv" in shard, false);
}
if (data.meta.provenance.handCube.shardStrategy === 'immutable-user-id') {
  const declaredShardCount = sourceShards[0]?.userShard?.count;
  assert(Number.isSafeInteger(declaredShardCount) && declaredShardCount > 1);
  assert.equal(successfulRefs.length, declaredShardCount, 'full-history extraction must include every declared immutable user shard');
  assert(sourceShards.every((shard) => shard.userShard.count === declaredShardCount), 'declared user-shard count drifted between sources');
  assert.deepEqual(sourceShards.map((shard) => shard.userShard.index).sort((left, right) => left - right), Array.from({ length: declaredShardCount }, (_, index) => index));
  assert.equal(new Set(sourceShards.map((shard) => shard.userShard.userIdsSha256)).size, declaredShardCount);
  assert.equal(new Set(sourceShards.map((shard) => shard.userShard.eligibleUsers)).size, 1);
  assert.equal(sourceShards[0].userShard.eligibleUsers, 3881);
  assert.equal(sourceShards.reduce((sum, shard) => sum + shard.rankUsers, 0), 3881);
  for (const shard of sourceShards) {
    assert.equal(shard.windowStartInclusive, '2023-09-01T00:00:00Z');
    assert.equal(shard.windowEndExclusive, '2026-07-22T00:00:00Z');
  }
} else {
  const ordered = sourceShards.slice().sort((left, right) => left.windowStartInclusive.localeCompare(right.windowStartInclusive));
  assert.equal(ordered[0].windowStartInclusive, '2023-09-01T00:00:00Z');
  assert.equal(ordered.at(-1).windowEndExclusive, '2026-07-22T00:00:00Z');
  assert(sourceShards.every((shard) => shard.userShard.index === 0 && shard.userShard.count === 1));
  assert(
    sourceShards.every((shard) => shard.rankUsers === shard.userShard.eligibleUsers),
    'each time shard must include every rank-eligible user for its own half-open window',
  );
  for (let index = 1; index < ordered.length; index += 1) assert.equal(ordered[index - 1].windowEndExclusive, ordered[index].windowStartInclusive, 'time shards are contiguous');
}
assert.equal(data.meta.provenance.abi.queryJobId, 'mcp_bq_1aae14822e7542809baff5659212b349');
assert.equal(data.meta.provenance.abi.formula, 'SUM(load_usd)/SUM(entries)');
assert.equal(data.meta.provenance.abi.querySha256, '6b7bc7617193707d018961c25ea2f7710e590806e1cc168ecda5c7c4d867b809');
for (const forbidden of ["/private/tmp/", "privateSql", "privateCsv", "privateJson", "failedAttempts", "strict is_preflop_allin-only classifier rejected"]) {
  assert(!publicDataSource.includes(forbidden), `public payload leaks private build evidence: ${forbidden}`);
}
for (const jobId of [
  'mcp_ch_job_386032819b6149b3a1705207de5cce2a',
  'mcp_ch_job_84fd86665eaf4e2ca8d4f61fa82a55c1',
  'mcp_ch_job_42b6397ebf72413192ea7ab96201309d',
  'mcp_ch_job_fc7e7aaf8ca6434aa3848e530d125737',
  'mcp_ch_job_daa68580e8f34d90a70112b4ede85490',
  'mcp_ch_job_bd0a32ea535f47518ac3f20836260efa',
  'mcp_ch_job_c92ac2047d18422ba421c7983058cf86',
]) {
  assert(!data.meta.provenance.handCube.queryJobIds.includes(jobId), `obsolete strict classifier job leaked into successful provenance: ${jobId}`);
}

const xs = data.meta.cohortOrder.map((cohort) => data.summaries[cohort].abiUsd);
const ys = data.meta.cohortOrder.map((cohort) => data.summaries[cohort].standardizedJamPct);
assert.equal(round(pearson(xs, ys), 4), data.correlation.abiVsStandardizedJamPearson);
assert.equal(data.correlation.observations.length, 4);
assert.match(data.correlation.method, /not a causal/i);

console.log(`resteal rank cube passed: ${diagnostics.csvRows} rows, ${diagnostics.global.opportunities} opportunities, 10/10 complete presets`);

function validateChart(chart, label) {
  assert(chart, `missing chart ${label}`);
  assert.equal(chart.cells.length, 169, `bad cell count ${label}`);
  assert.equal(chart.totals.knownOpportunities + chart.totals.missingOpportunities, chart.totals.opportunities, `bad coverage ${label}`);
  assert.equal(chart.totals.folds + chart.totals.calls + chart.totals.small3bets + chart.totals.jams, chart.totals.opportunities, `bad actions ${label}`);
  assert.equal(chart.cells.reduce((total, cell) => total + cell[0], 0), chart.totals.knownOpportunities, `bad known total ${label}`);
  for (const cell of chart.cells) {
    assert.equal(cell.length, 5);
    assert(cell.every((value) => Number.isSafeInteger(value) && value >= 0));
    assert.equal(cell[1] + cell[2] + cell[3] + cell[4], cell[0]);
  }
}

function pearson(xs, ys) {
  const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const yMean = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const numerator = xs.reduce((sum, value, index) => sum + (value - xMean) * (ys[index] - yMean), 0);
  const xScale = Math.sqrt(xs.reduce((sum, value) => sum + (value - xMean) ** 2, 0));
  const yScale = Math.sqrt(ys.reduce((sum, value) => sum + (value - yMean) ** 2, 0));
  return numerator / (xScale * yScale);
}

function round(value, places) { const factor = 10 ** places; return Math.round(value * factor) / factor; }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function totalsFromCube(source) {
  const [headerLine, ...lines] = source.trimEnd().split(/\r?\n/);
  const header = headerLine.split(',');
  const indices = Object.fromEntries(['opportunities', 'folds', 'calls', 'small3bets', 'jams'].map((key) => [key, header.indexOf(key)]));
  assert(Object.values(indices).every((index) => index >= 0), 'cube is missing additive counter columns');
  const totals = { rows: lines.length, opportunities: 0, folds: 0, calls: 0, small3bets: 0, jams: 0 };
  for (const line of lines) {
    const cells = line.split(',');
    for (const key of Object.keys(indices)) totals[key] += Number(cells[indices[key]]);
  }
  return totals;
}

function pooledChartFromCube(source, cohort, position, handOrder) {
  const [headerLine, ...lines] = source.trimEnd().split(/\r?\n/);
  const header = headerLine.split(',');
  const index = Object.fromEntries(header.map((key, offset) => [key, offset]));
  const counterKeys = ['opportunities', 'folds', 'calls', 'small3bets', 'jams'];
  const cells = Object.fromEntries(handOrder.map((hand) => [hand, [0, 0, 0, 0, 0]]));
  const totals = {
    opportunities: 0,
    folds: 0,
    calls: 0,
    small3bets: 0,
    jams: 0,
    knownOpportunities: 0,
    missingOpportunities: 0,
  };
  for (const line of lines) {
    const row = line.split(',');
    if (row[index.cohort] !== cohort || row[index.opener_position] !== position) continue;
    if (!['2.5', '3.0'].includes(row[index.open_size_bb])) continue;
    const counts = counterKeys.map((key) => Number(row[index[key]]));
    for (let offset = 0; offset < counterKeys.length; offset += 1) totals[counterKeys[offset]] += counts[offset];
    const hand = row[index.holecards_str];
    if (hand === '__MISSING__') {
      totals.missingOpportunities += counts[0];
      continue;
    }
    assert(cells[hand], `unexpected hand in pooled source: ${hand}`);
    totals.knownOpportunities += counts[0];
    for (let offset = 0; offset < counts.length; offset += 1) cells[hand][offset] += counts[offset];
  }
  return { totals, cells: handOrder.map((hand) => cells[hand]) };
}
