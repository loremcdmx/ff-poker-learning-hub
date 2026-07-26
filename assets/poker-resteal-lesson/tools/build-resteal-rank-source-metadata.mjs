#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const options = parseArguments(process.argv.slice(2));
const required = [
  "cube", "merge", "rank-intervals", "rank-query-job-id", "abi", "output",
  "renderer-metadata", "rendered-sql", "source-csv",
];
for (const name of required) if (!options[name]) throw new Error(`Missing --${name}=...`);

const cubePath = privatePath(options.cube, "merged cube");
const mergePath = privatePath(options.merge, "merge metadata");
const rankIntervalsPath = privatePath(options["rank-intervals"], "rank interval export");
const abiPath = privatePath(options.abi, "ABI evidence");
const outputPath = privatePath(options.output, "source metadata output");
const rendererPaths = pathList(options["renderer-metadata"], "renderer metadata");
const renderedSqlPaths = pathList(options["rendered-sql"], "rendered SQL");
const sourceCsvPaths = pathList(options["source-csv"], "source CSV");
const failedAttemptsPath = options["failed-attempts"] ? privatePath(options["failed-attempts"], "failed-attempts evidence") : null;
const queryTemplatePath = path.join(here, "resteal-rank-cube.sql");
const currentTemplateSha256 = sha256(fs.readFileSync(queryTemplatePath));
assert.match(
  options["rank-query-job-id"],
  /^mcp_bq_(?:job_)?[a-f0-9]+$/,
  "rank bridge query job id is required",
);

const merge = readJson(mergePath);
assert.equal(merge.schema, "ff-resteal-rank-cube-merge-v1", "unexpected merge schema");
assert(["immutable-user-id", "contiguous-time"].includes(merge.shardStrategy), `unexpected merge shard strategy ${merge.shardStrategy}`);
assert(merge.inputs.length > 1, "multiple source shards are required");
assert.equal(rendererPaths.length, merge.inputs.length, "renderer metadata count does not match merge inputs");
assert.equal(renderedSqlPaths.length, merge.inputs.length, "rendered SQL count does not match merge inputs");
assert.equal(sourceCsvPaths.length, merge.inputs.length, "source CSV count does not match merge inputs");

const cubeBuffer = fs.readFileSync(cubePath);
assert.equal(sha256(cubeBuffer), merge.sha256, "merged cube SHA-256 does not match merge metadata");
assert.equal(countCsvRows(cubeBuffer), merge.mergedRows, "merged cube row count does not match merge metadata");

const shards = merge.inputs.map((input, index) => {
  const renderer = readJson(rendererPaths[index]);
  assert.equal(renderer.templateSha256, currentTemplateSha256, `renderer metadata came from a stale query template for shard ${index}`);
  assert.deepEqual(input.renderer, renderer, `renderer metadata drift for shard ${index}`);
  assert.equal(path.basename(sourceCsvPaths[index]), input.file, `source CSV filename drift for shard ${index}`);
  const csvBuffer = fs.readFileSync(sourceCsvPaths[index]);
  const sqlBuffer = fs.readFileSync(renderedSqlPaths[index]);
  const querySha = sha256(sqlBuffer);
  assert.equal(sha256(csvBuffer), input.sha256, `source CSV SHA-256 drift for shard ${index}`);
  assert.equal(countCsvRows(csvBuffer), input.rows, `source CSV row count drift for shard ${index}`);
  assert.equal(querySha, input.querySha256, `rendered SQL SHA-256 drift for shard ${index}`);
  const executionMode = sourceExecutionMode(input.sourceRef, querySha, `shard ${index}`);
  assert.equal(input.executionMode, executionMode, `execution mode drift for shard ${index}`);
  assert.deepEqual(renderer.shard, [1, 18], `shard ${index} does not include every product rank`);
  assert(renderer.window[0] >= "2023-09-01" && renderer.window[1] <= "2026-07-22" && renderer.window[0] < renderer.window[1], `shard ${index} has an invalid window`);
  assert(Number.isSafeInteger(renderer.shardIntervals) && renderer.shardIntervals > 0, `shard ${index} has no rank intervals`);
  assert(Number.isSafeInteger(renderer.shardUsers) && renderer.shardUsers > 0, `shard ${index} has no rank users`);
  const privateUserShard = renderer.userShard;
  assert(Number.isSafeInteger(privateUserShard.firstUserId) && privateUserShard.firstUserId > 0, `invalid first user for shard ${index}`);
  assert(Number.isSafeInteger(privateUserShard.lastUserId) && privateUserShard.lastUserId >= privateUserShard.firstUserId, `invalid last user for shard ${index}`);
  return {
    name: merge.shardStrategy === "immutable-user-id"
      ? `user-${String(renderer.userShard.index).padStart(2, "0")}`
      : `time-${String(index).padStart(2, "0")}`,
    rankMin: renderer.shard[0],
    rankMax: renderer.shard[1],
    windowStartInclusive: `${renderer.window[0]}T00:00:00Z`,
    windowEndExclusive: `${renderer.window[1]}T00:00:00Z`,
    queryJobId: input.sourceRef,
    executionMode,
    renderedSqlSha256: querySha,
    exportSha256: input.sha256,
    exportRows: input.rows,
    rankIntervals: renderer.shardIntervals,
    rankUsers: renderer.shardUsers,
    userShard: {
      index: renderer.userShard.index,
      count: renderer.userShard.count,
      eligibleUsers: renderer.userShard.eligibleUsers,
      userIdsSha256: renderer.userShard.userIdsSha256,
    },
    privateSql: renderedSqlPaths[index],
    privateCsv: sourceCsvPaths[index],
  };
});
validateUserShards(shards);
validateCoverageStrategy(merge.shardStrategy, shards, rendererPaths.map(readJson));

const firstRenderer = readJson(rendererPaths[0]);
for (const rendererPath of rendererPaths.slice(1)) {
  const renderer = readJson(rendererPath);
  assert.equal(renderer.sourceRows, firstRenderer.sourceRows, "rank bridge source-row drift between shards");
  assert.equal(renderer.validIntervals, firstRenderer.validIntervals, "usable rank-interval drift between shards");
  assert.equal(renderer.excludedZeroLength, firstRenderer.excludedZeroLength, "zero-length exclusion drift between shards");
}
const rankIntervalsBuffer = fs.readFileSync(rankIntervalsPath);
assert.equal(countCsvRows(rankIntervalsBuffer), firstRenderer.sourceRows, "rank bridge CSV row count does not match renderer evidence");
const rankIntervalUsers = countUniqueValidRankUsers(rankIntervalsBuffer);
assert(rankIntervalUsers > 0, "rank bridge contains no users");

const abi = readJson(abiPath);
assert.equal(abi.schema, "ff-resteal-abi-v1", "unexpected ABI evidence schema");
assert.equal(abi.formula, "SUM(load_usd)/SUM(entries)", "ABI must be a ratio of sums");
assert.match(abi.queryJobId, /^mcp_bq_(?:job_)?[a-f0-9]+$/, "ABI query job id is required");
assert.match(abi.querySha256 || "", /^[a-f0-9]{64}$/, "ABI query SHA-256 is required");
const abiSqlPath = privatePath(abi.privateSql, "ABI SQL");
assert.equal(sha256(fs.readFileSync(abiSqlPath)), abi.querySha256, "ABI SQL SHA-256 does not match evidence");
const cohortRanks = {
  novice: [15, 16, 17, 18],
  league3: [11, 12, 13, 14],
  league2: [6, 7, 8, 9, 10],
  league1: [1, 2, 3, 4, 5],
};
const abiCohorts = {};
for (const [cohort, ranks] of Object.entries(cohortRanks)) {
  const value = abi.cohorts?.[cohort];
  assert(value, `missing ABI cohort ${cohort}`);
  assert.deepEqual(value.ranks, ranks, `ABI ranks drift for ${cohort}`);
  for (const field of ["abiPlayers", "abiEntries"]) assert(Number.isSafeInteger(value[field]) && value[field] > 0, `invalid ${cohort}.${field}`);
  assert(Number.isFinite(value.loadUsd) && value.loadUsd > 0, `invalid ${cohort}.loadUsd`);
  assert.equal(round(value.loadUsd / value.abiEntries, 2), value.abiUsd, `ratio-of-sums ABI mismatch for ${cohort}`);
  abiCohorts[cohort] = {
    abiPlayers: value.abiPlayers,
    abiEntries: value.abiEntries,
    loadUsd: value.loadUsd,
    abiUsd: value.abiUsd,
  };
}

const failedAttempts = failedAttemptsPath ? readJson(failedAttemptsPath) : [];
assert(Array.isArray(failedAttempts), "failed-attempts evidence must be a JSON array");
for (const attempt of failedAttempts) {
  assert.match(attempt.queryJobId || "", /^mcp_ch_job_[a-f0-9]+$/, "failed attempt job id is required");
  assert.equal(typeof attempt.reason, "string", "failed attempt reason is required");
}
const successfulRefs = new Set(shards.map((shard) => shard.queryJobId));
for (const attempt of failedAttempts) assert(!successfulRefs.has(attempt.queryJobId), "failed job leaked into successful source refs");

const totals = merge.totals || {};
for (const field of ["opportunities", "folds", "calls", "small3bets", "jams", "other"]) {
  assert(Number.isSafeInteger(totals[field]) && totals[field] >= 0, `invalid merge total ${field}`);
}
assert.equal(totals.opportunities, totals.folds + totals.calls + totals.small3bets + totals.jams + totals.other, "merged action partition mismatch");
assert.equal(totals.other, 0, "unknown preflop actions cannot be published");

const generatedOn = options["generated-on"] || "2026-07-22";
const version = options.version || "resteal-rank-cube-20260722-full-history-r15-r18-v3";
const metadata = {
  version,
  generatedOn,
  windowStartInclusive: "2023-09-01T00:00:00Z",
  windowEndExclusive: "2026-07-22T00:00:00Z",
  provenance: {
    rankIntervals: {
      sourceRows: firstRenderer.sourceRows,
      usableRows: firstRenderer.validIntervals,
      excludedZeroLength: firstRenderer.excludedZeroLength,
      users: rankIntervalUsers,
      queryJobId: options["rank-query-job-id"],
      sha256: sha256(rankIntervalsBuffer),
      privateCsv: rankIntervalsPath,
    },
    handCube: {
      classifier: "effective-shove-v1",
      shardStrategy: merge.shardStrategy,
      mergeSchema: merge.schema,
      templateSha256: currentTemplateSha256,
      rows: merge.mergedRows,
      sha256: merge.sha256,
      queryJobIds: shards.map((shard) => shard.queryJobId),
      shards,
      failedAttempts,
    },
    abi: {
      queryJobId: abi.queryJobId,
      formula: abi.formula,
      querySha256: abi.querySha256,
      privateSql: abiSqlPath,
      sha256: sha256(fs.readFileSync(abiPath)),
      privateJson: abiPath,
    },
  },
  abi: { cohorts: abiCohorts },
  expected: {
    csvRows: merge.mergedRows,
    opportunities: totals.opportunities,
    folds: totals.folds,
    calls: totals.calls,
    small3bets: totals.small3bets,
    jams: totals.jams,
    other: totals.other,
  },
};

fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify({ output: outputPath, version, shards: shards.length, rows: merge.mergedRows, opportunities: totals.opportunities }, null, 2));

function parseArguments(items) {
  return Object.fromEntries(items.map((item) => {
    const match = item.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Expected --key=value, got ${item}`);
    return [match[1], match[2]];
  }));
}

function privatePath(value, label) {
  const resolved = path.resolve(value);
  if (!resolved.startsWith("/private/tmp/")) throw new Error(`${label} must stay under /private/tmp`);
  return resolved;
}

function pathList(value, label) {
  return String(value).split(",").filter(Boolean).map((item) => privatePath(item, label));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function countCsvRows(buffer) {
  const lines = buffer.toString("utf8").trimEnd().split(/\r?\n/);
  return Math.max(0, lines.length - 1);
}

function countUniqueValidRankUsers(buffer) {
  const lines = buffer.toString("utf8").trimEnd().split(/\r?\n/);
  const header = (lines.shift() || "").split(",");
  const userIndex = header.indexOf("user_id");
  const startIndex = header.indexOf("rank_start_at");
  const endIndex = header.indexOf("rank_end_at");
  assert(userIndex >= 0 && startIndex >= 0 && endIndex >= 0, "rank bridge CSV is missing required columns");
  return new Set(lines.filter(Boolean).map((line) => line.split(",")).filter((cells) => cells[startIndex] < cells[endIndex]).map((cells) => cells[userIndex])).size;
}

function validateUserShards(shards) {
  if (merge.shardStrategy !== "immutable-user-id") return;
  const count = shards[0].userShard.count;
  assert.equal(count, shards.length, "not every declared user shard is present");
  assert.deepEqual(shards.map((shard) => shard.userShard.index).sort((left, right) => left - right), Array.from({ length: count }, (_, index) => index), "user shard indices are incomplete");
  assert.equal(new Set(shards.map((shard) => shard.userShard.userIdsSha256)).size, count, "user-id set hashes must be unique");
  assert.equal(new Set(shards.map((shard) => shard.userShard.eligibleUsers)).size, 1, "eligible user count drift between shards");
  assert.equal(shards.reduce((sum, shard) => sum + shard.rankUsers, 0), shards[0].userShard.eligibleUsers, "user shard sizes do not reconcile");
  const ordered = [...shards].sort((left, right) => left.userShard.index - right.userShard.index);
  for (const shard of ordered) {
    assert.match(shard.userShard.userIdsSha256, /^[a-f0-9]{64}$/, `invalid user-id hash for ${shard.name}`);
  }
}

function validateCoverageStrategy(strategy, shards, privateRenderers) {
  if (strategy === "immutable-user-id") {
    for (const shard of shards) {
      assert.equal(shard.windowStartInclusive, "2023-09-01T00:00:00Z", "user shard must cover the full source window");
      assert.equal(shard.windowEndExclusive, "2026-07-22T00:00:00Z", "user shard must cover the full source window");
    }
    const ordered = [...privateRenderers].sort((left, right) => left.userShard.index - right.userShard.index);
    for (let index = 1; index < ordered.length; index += 1) assert(ordered[index - 1].userShard.lastUserId < ordered[index].userShard.firstUserId, "sorted private user shards overlap");
    return;
  }
  const ordered = [...shards].sort((left, right) => left.windowStartInclusive.localeCompare(right.windowStartInclusive));
  assert.equal(ordered[0].windowStartInclusive, "2023-09-01T00:00:00Z", "time shards do not start at the source boundary");
  assert.equal(ordered.at(-1).windowEndExclusive, "2026-07-22T00:00:00Z", "time shards do not end at the source boundary");
  for (const shard of ordered) {
    assert.equal(shard.userShard.index, 0, "time shard must include the full user population for its window");
    assert.equal(shard.userShard.count, 1, "time and user sharding cannot be mixed");
  }
  for (let index = 1; index < ordered.length; index += 1) assert.equal(ordered[index - 1].windowEndExclusive, ordered[index].windowStartInclusive, "time shards must be contiguous and non-overlapping");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sourceExecutionMode(sourceRef, querySha, label) {
  if (sourceRef === `sync:${querySha}`) return "sync";
  assert.match(sourceRef || "", /^mcp_ch_job_[a-f0-9]+$/, `${label} has no honest ClickHouse execution id`);
  return "async";
}

function round(value, places) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
