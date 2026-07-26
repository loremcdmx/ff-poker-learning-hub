#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(toolDir, "../../..");
const require = createRequire(import.meta.url);
const readinessContract = require(resolve(toolDir, "../readiness.js"));
const options = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const match = argument.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${argument}`);
  return [match[1], match[2]];
}));
const kind = options.kind;
if (!new Set(["action", "ev"]).has(kind)) throw new Error("--kind must be action or ev");
for (const key of ["rank-bridge-metadata", "shard-ledger", "merged-csv", "merge-metadata", "output"]) {
  if (!options[key]) throw new Error(`--${key} is required`);
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function lineCount(source) {
  if (!source.length) return 0;
  const text = source.toString("utf8");
  return text.split(/\r?\n/).filter(Boolean).length;
}

function publicShard(entry, expectedCount) {
  for (const key of ["queryPath", "resultPath", "queryJobId", "executionMode", "windowStartInclusive", "windowEndExclusive"]) {
    assert(entry[key], `shard ${entry.shardIndex}: ${key} is required`);
  }
  assert(Number.isSafeInteger(entry.shardIndex) && entry.shardIndex >= 0 && entry.shardIndex < expectedCount, "invalid shard index");
  assert.equal(entry.shardCount, expectedCount, "ledger mixes shard counts");
  const querySource = readFileSync(resolve(entry.queryPath));
  const resultSource = readFileSync(resolve(entry.resultPath));
  const querySha256 = sha256(querySource);
  const resultSha256 = sha256(resultSource);
  assert(new Set(["sync", "async"]).has(entry.executionMode), "shard executionMode must be sync or async");
  if (entry.executionMode === "sync") assert.equal(entry.queryJobId, `sync:${querySha256}`, "sync execution id must be derived from the exact query bytes");
  else assert(/^mcp_ch_job_[a-f0-9]+$/.test(entry.queryJobId), "async execution id must be the original ClickHouse job id");
  assert.equal(entry.truncated, false, "source shard cannot be truncated");
  assert(Number.isSafeInteger(entry.rowCount) && entry.rowCount > 0, "source shard row count must be a positive integer");
  assert(Number.isSafeInteger(entry.byteSize) && entry.byteSize > 0, "source shard byte size must be a positive integer");
  assert.equal(entry.rowCount, lineCount(resultSource) - 1, "source shard row count must match its CSV");
  assert.equal(entry.byteSize, resultSource.byteLength, "source shard byte size must match its CSV");
  assert(Number.isSafeInteger(entry.durationMs) && entry.durationMs > 0, "source shard duration is required");
  assert(Number.isFinite(Date.parse(entry.windowStartInclusive)) && Number.isFinite(Date.parse(entry.windowEndExclusive)), "source shard timestamps must be ISO dates");
  assert(Date.parse(entry.windowStartInclusive) < Date.parse(entry.windowEndExclusive), "source shard window must be non-empty");
  if (kind === "ev") {
    const resultPath = resolve(entry.resultPath);
    assert(!resultPath.startsWith(`${repoRoot}/`), "raw EV shards contain private player ids and must stay outside the repository");
  }
  return {
    shardIndex: entry.shardIndex,
    shardCount: entry.shardCount,
    queryJobId: entry.queryJobId,
    executionMode: entry.executionMode,
    querySha256,
    resultSha256,
    rowCount: entry.rowCount,
    byteSize: entry.byteSize,
    truncated: false,
    durationMs: entry.durationMs,
    windowStartInclusive: entry.windowStartInclusive,
    windowEndExclusive: entry.windowEndExclusive,
  };
}

const rankMetadata = readJson(options["rank-bridge-metadata"]);
assert(new Set(["sync", "async"]).has(rankMetadata.executionMode), "rank bridge executionMode must be sync or async");
const rankQueryTemplateFile = "tools/msp-preflop-rank-bridge.sql";
const rankQueryTemplateSha256 = sha256(readFileSync(resolve(toolDir, "msp-preflop-rank-bridge.sql")));
if (rankMetadata.executionMode === "sync") {
  assert.equal(rankMetadata.queryJobId, `sync:${rankQueryTemplateSha256}`, "sync rank bridge execution id must derive from the canonical query bytes");
} else {
  assert(/^mcp_bq_job_[a-f0-9]+$/.test(rankMetadata.queryJobId || ""), "async rank bridge execution id must be the original BigQuery job id");
}
assert(Number.isSafeInteger(rankMetadata.rows) && rankMetadata.rows > 0, "rank bridge row count is required");
assert(Number.isSafeInteger(rankMetadata.usableRows) && rankMetadata.usableRows > 0 && rankMetadata.usableRows <= rankMetadata.rows, "rank bridge usable row count is invalid");
const rankSourcePath = resolve(rankMetadata.file);
assert(rankSourcePath !== repoRoot && !rankSourcePath.startsWith(`${repoRoot}/`), "raw rank bridge contains private user ids and must stay outside the repository");
const rankSource = readFileSync(rankSourcePath);
assert.equal(rankMetadata.rows, lineCount(rankSource) - 1, "rank bridge row count must match its CSV");
assert.equal(rankMetadata.byteSize, rankSource.byteLength, "rank bridge byte size must match its CSV");
assert.equal(rankMetadata.truncated, false, "rank bridge export must be explicitly complete");
const rankSha256 = sha256(rankSource);
if (rankMetadata.sha256) assert.equal(rankMetadata.sha256, rankSha256, "rank bridge SHA does not match its CSV");
assert.deepEqual(rankMetadata.queryTemplate, {
  file: rankQueryTemplateFile,
  sha256: rankQueryTemplateSha256,
}, "rank bridge metadata must bind the canonical full-rank query template");
const [rankHeader, ...rankLines] = rankSource.toString("utf8").trim().split(/\r?\n/);
assert.equal(rankHeader, "user_id,rang,rank_start_at,rank_end_at", "rank bridge columns are canonical");
const rankRanges = new Map();
let usableRankRows = 0;
for (const [index, line] of rankLines.entries()) {
  const [userIdText, rankText, start, end, ...extra] = line.split(",");
  assert.equal(extra.length, 0, `rank bridge row ${index + 2} has an unexpected CSV width`);
  const userId = Number(userIdText);
  const rank = Number(rankText);
  assert(Number.isSafeInteger(userId) && userId > 0, `rank bridge row ${index + 2} has an invalid user id`);
  assert(Number.isSafeInteger(rank) && rank >= 1 && rank <= 18, `rank bridge row ${index + 2} has an invalid rank`);
  assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(end), `rank bridge row ${index + 2} has invalid timestamps`);
  if (start >= end) continue;
  usableRankRows += 1;
  const ranges = rankRanges.get(userId) || [];
  ranges.push({ start, end });
  rankRanges.set(userId, ranges);
}
assert.equal(rankMetadata.usableRows, usableRankRows, "rank bridge usable row count must be recomputed from its CSV");
for (const [userId, ranges] of rankRanges) {
  ranges.sort((left, right) => left.start.localeCompare(right.start) || left.end.localeCompare(right.end));
  for (let index = 1; index < ranges.length; index += 1) {
    assert(ranges[index].start >= ranges[index - 1].end, `rank bridge intervals overlap for user ${userId}`);
  }
}

const ledger = readJson(options["shard-ledger"]);
assert.equal(ledger.partitionAxis, "time", "benchmark publication uses disjoint time shards");
assert(Array.isArray(ledger.shards) && ledger.shards.length >= 2, "ledger must list at least two source shards");
const shardCount = ledger.shards.length;
const shards = ledger.shards.map((entry) => publicShard(entry, shardCount)).sort((a, b) => a.shardIndex - b.shardIndex);
assert.deepEqual(shards.map((entry) => entry.shardIndex), [...Array(shardCount).keys()], "ledger covers every shard index exactly once");
const windows = [...shards].sort((a, b) => Date.parse(a.windowStartInclusive) - Date.parse(b.windowStartInclusive));
assert.equal(windows[0].windowStartInclusive, "2023-09-01T00:00:00Z", "shards start at the frozen analysis boundary");
assert.equal(windows.at(-1).windowEndExclusive, "2026-07-22T00:00:00Z", "shards end at the frozen analysis boundary");
for (let index = 1; index < windows.length; index += 1) {
  assert.equal(windows[index - 1].windowEndExclusive, windows[index].windowStartInclusive, "shard windows overlap or leave a gap");
}

const mergedSource = readFileSync(resolve(options["merged-csv"]));
const mergeMetadata = readJson(options["merge-metadata"]);
assert.equal(mergeMetadata.partitionAxis, "time", "merge metadata records the time partition axis");
assert.equal(mergeMetadata.shards, shardCount, "merge metadata includes every source shard");
assert.equal(mergeMetadata.sha256, sha256(mergedSource), "merged SHA matches the publishable CSV");
assert.equal(mergeMetadata.rows, lineCount(mergedSource) - 1, "merged row count matches the publishable CSV");
assert(mergeMetadata.rows <= shards.reduce((sum, shard) => sum + shard.rowCount, 0), "merged row count cannot exceed source shard rows");
assert.deepEqual(
  mergeMetadata.inputs.map((entry) => entry.sha256).sort(),
  shards.map((entry) => entry.resultSha256).sort(),
  "merge inputs match the source shard hashes",
);

const templateFile = kind === "action" ? "msp-preflop-action-cube.sql" : "msp-sb-vs-btn-ev.sql";
const manifest = {
  schema: kind === "action" ? "ff-preflop-benchmark-action-cube-source-v1" : "ff-preflop-benchmark-spot-ev-source-v1",
  analysisWindow: { startInclusive: "2023-09-01T00:00:00Z", endExclusive: "2026-07-22T00:00:00Z" },
  rankBridge: {
    queryJobId: rankMetadata.queryJobId,
    executionMode: rankMetadata.executionMode,
    sha256: rankSha256,
    rows: rankMetadata.rows,
    usableRows: rankMetadata.usableRows,
    byteSize: rankMetadata.byteSize,
    truncated: false,
    queryTemplate: {
      file: rankQueryTemplateFile,
      sha256: rankQueryTemplateSha256,
    },
  },
  queryTemplate: {
    file: `tools/${templateFile}`,
    sha256: sha256(readFileSync(resolve(toolDir, templateFile))),
  },
  partitionAxis: "time",
  shards,
  merged: {
    sha256: mergeMetadata.sha256,
    rows: mergeMetadata.rows,
    opportunities: mergeMetadata.opportunities,
  },
  ...(kind === "action" ? {
    coverage: {
      minimumHandOpportunities: readinessContract.MIN_HAND_OPPORTUNITIES,
      nearFloorException: readinessContract.NEAR_FLOOR_EXCEPTION,
      requiredHands: readinessContract.REQUIRED_HANDS,
      comparedCohorts: readinessContract.COHORT_KEYS,
    },
    ignoredNonAdditiveColumns: ["players", "months"],
  } : {
    playerCardinality: mergeMetadata.playerCardinality,
  }),
  ...(Array.isArray(ledger.nonSourceAttempts) && ledger.nonSourceAttempts.length ? {
    nonSourceAttempts: ledger.nonSourceAttempts.map((attempt) => ({ id: String(attempt.id), reason: String(attempt.reason) })),
  } : {}),
};

assert(!JSON.stringify(manifest).includes("private_player_ids"), "manifest cannot publish private player identifiers");
assert(isAbsolute(resolve(options.output)), "output path must resolve absolutely");
writeFileSync(resolve(options.output), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ kind, output: resolve(options.output), shards: shards.length, merged: manifest.merged }, null, 2));
