#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const positional = [];
const options = {};
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  if (match) options[match[1]] = match[2];
  else positional.push(arg);
}
if (positional.length !== 1 || !options.output || !options["rank-source-meta"]) {
  throw new Error("Usage: node build-full-history-shard-manifest.mjs shard-plan.json --rank-source-meta=rank-intervals.meta.json --output=shard-manifest.json");
}

const EXPECTED_START = "2023-09-01";
const EXPECTED_END = "2026-07-22";
const EXPECTED_RANK_SHARD = [1, 18];
const EXPECTED_STRATEGY = "six_month_time_windows_x_contiguous_user_partitions";
const EXPECTED_PARTITION_POLICY = "sorted_user_offsets_exact_once";
const EXPECTED_HEADER = [
  "node", "cohort", "position", "depth_band", "opportunities",
  "checks_back", "cbets", "faced_raises", "folds", "calls", "raises",
  "other", "first_hand_at", "last_hand_at"
];
const EXPECTED_RANK_HEADER = ["user_id", "rang", "rank_start_at", "rank_end_at"];
const SHA256 = /^[a-f0-9]{64}$/;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

const EXPECTED_POSTFLOP_QUERY_TEMPLATE_SHA256 = sha256(
  fs.readFileSync(new URL("../research/full-history-postflop-field-cube.sql", import.meta.url))
);
const EXPECTED_RANK_QUERY_TEMPLATE_SHA256 = sha256(
  fs.readFileSync(new URL("../research/full-history-rank-intervals.sql", import.meta.url))
);

function fail(message) {
  throw new Error(`Invalid shard plan/results: ${message}`);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validExecutionIdentity(value, label) {
  if (!value || !["async", "sync"].includes(value.executionMode)) fail(`${label}: executionMode must be async or sync`);
  if (!SHA256.test(String(value.querySha256 || ""))) fail(`${label}: query SHA is missing`);
  if (!value.queryJobId) fail(`${label}: source execution identity is missing`);
  if (value.executionMode === "sync" && value.queryJobId !== `sync:${value.querySha256}`) {
    fail(`${label}: sync identity must equal sync:<querySha256>`);
  }
  if (value.executionMode === "async" && String(value.queryJobId).startsWith("sync:")) {
    fail(`${label}: async execution must use the provider job id`);
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const header = rows.shift() || [];
  return { header, rows: rows.filter((values) => values.some(Boolean)) };
}

const planPath = path.resolve(positional[0]);
const planBuffer = fs.readFileSync(planPath);
const plan = JSON.parse(planBuffer.toString("utf8"));
if (plan.schemaVersion !== 4) fail("plan.schemaVersion must be 4");
if (plan.strategy !== EXPECTED_STRATEGY) fail("unexpected plan strategy");
if (plan.userPartitionPolicy !== EXPECTED_PARTITION_POLICY) fail("unexpected user partition policy");
if (!same(plan.window, { startInclusive: EXPECTED_START, endExclusive: EXPECTED_END })) fail("unexpected full window");
if (!same(plan.rankShard, EXPECTED_RANK_SHARD)) fail("every shard must include ranks 1-18");
if (!Number.isSafeInteger(plan.defaultUserShardCount) || plan.defaultUserShardCount < 1) fail("defaultUserShardCount must be a positive integer");
if (!Array.isArray(plan.windows) || !plan.windows.length) fail("time windows are missing");
if (!Array.isArray(plan.shards) || plan.shards.length < plan.windows.length) fail("unexpected shard count");
if (plan.shardCount !== plan.shards.length) fail("declared shard count differs from plan");

const rankPath = path.resolve(plan.rankPath || "");
const rankBuffer = fs.readFileSync(rankPath);
const parsedRanks = parseCsv(rankBuffer.toString("utf8"));
if (!same(parsedRanks.header, EXPECTED_RANK_HEADER) || !parsedRanks.rows.length) fail("rank interval CSV is empty or has unexpected columns");
const rankMetaPath = path.resolve(options["rank-source-meta"]);
if (path.resolve(plan.rankSourceMetaPath || "") !== rankMetaPath) fail("rank source metadata path differs from the plan");
const rankMetaBuffer = fs.readFileSync(rankMetaPath);
const rankMetadata = JSON.parse(rankMetaBuffer.toString("utf8"));
if (rankMetadata.schemaVersion !== 1) fail("rank source metadata schema must be 1");
validExecutionIdentity(rankMetadata, "rank source");
if (!same(rankMetadata.window, { startInclusive: EXPECTED_START, endExclusive: EXPECTED_END })) fail("rank source window mismatch");
if (!SHA256.test(String(rankMetadata.sourceQueryTemplateSha256 || ""))) fail("rank source query-template SHA is missing");
if (rankMetadata.querySha256 !== rankMetadata.sourceQueryTemplateSha256) fail("rank source query SHA must match the unrendered canonical query template");
if (rankMetadata.sourceQueryTemplateSha256 !== EXPECTED_RANK_QUERY_TEMPLATE_SHA256) fail("rank source query-template SHA is stale");
if (rankMetadata.resultSha256 !== sha256(rankBuffer)) fail("rank source result SHA mismatch");
if (rankMetadata.rowCount !== parsedRanks.rows.length) fail("rank source row count mismatch");

plan.windows.forEach((window, index) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(window.from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(window.to || "") || window.from >= window.to) {
    fail(`invalid time window ${index}`);
  }
  if (index === 0 && window.from !== EXPECTED_START) fail("first window does not start at the release boundary");
  if (index > 0 && plan.windows[index - 1].to !== window.from) fail(`time gap or overlap before window ${index}`);
  if (index === plan.windows.length - 1 && window.to !== EXPECTED_END) fail("last window does not end at the release boundary");
});

const ids = new Set();
const filePaths = new Set();
const sourceHashes = new Set();
const queryTemplateHashes = new Set();
const manifestShards = [];
const windowPartitions = [];

for (const window of plan.windows) {
  const partitions = plan.shards
    .filter((shard) => shard.from === window.from && shard.to === window.to)
    .sort((left, right) => left.userShardIndex / left.userShardCount - right.userShardIndex / right.userShardCount);
  if (!partitions.length) fail(`window ${window.from}..${window.to} has no user partitions`);
  const partitionMetadata = [];
  for (const shard of partitions) {
    if (!shard.id || ids.has(shard.id)) fail(`duplicate or missing shard id ${shard.id || "(empty)"}`);
    ids.add(shard.id);
    if (shard.rankMin !== 1 || shard.rankMax !== 18) fail(`${shard.id}: rank shard is not 1-18`);
    if (
      !Number.isSafeInteger(shard.userShardCount)
      || shard.userShardCount < 1
      || !Number.isSafeInteger(shard.userShardIndex)
      || shard.userShardIndex < 0
      || shard.userShardIndex >= shard.userShardCount
    ) {
      fail(`${shard.id}: invalid user partition coordinates`);
    }
    for (const filePath of [shard.sqlPath, shard.metaPath, shard.csvPath, shard.executionPath]) {
      if (!filePath || filePaths.has(path.resolve(filePath))) fail(`${shard.id}: duplicate or missing file path`);
      filePaths.add(path.resolve(filePath));
    }

    const sqlBuffer = fs.readFileSync(path.resolve(shard.sqlPath));
    const metaBuffer = fs.readFileSync(path.resolve(shard.metaPath));
    const resultBuffer = fs.readFileSync(path.resolve(shard.csvPath));
    const executionBuffer = fs.readFileSync(path.resolve(shard.executionPath));
    const metadata = JSON.parse(metaBuffer.toString("utf8"));
    const execution = JSON.parse(executionBuffer.toString("utf8"));
    if (!same(metadata.window, [shard.from, shard.to])) fail(`${shard.id}: metadata window mismatch`);
    if (!same(metadata.rankShard, EXPECTED_RANK_SHARD)) fail(`${shard.id}: metadata rank shard mismatch`);
    if (metadata.userShard?.index !== shard.userShardIndex || metadata.userShard?.count !== shard.userShardCount) {
      fail(`${shard.id}: metadata user shard mismatch`);
    }
    if (metadata.sqlSha256 !== sha256(sqlBuffer)) fail(`${shard.id}: query SHA does not match renderer metadata`);
    if (!SHA256.test(String(metadata.sourceQueryTemplateSha256 || ""))) fail(`${shard.id}: source query-template SHA is missing`);
    if (!SHA256.test(String(metadata.sourceSha256 || ""))) fail(`${shard.id}: rank source SHA is missing`);
    if (!SHA256.test(String(metadata.userShard?.selectedUserIdsSha256 || ""))) fail(`${shard.id}: selected-user SHA is missing`);
    sourceHashes.add(metadata.sourceSha256);
    queryTemplateHashes.add(metadata.sourceQueryTemplateSha256);
    if (execution.schemaVersion !== 1) fail(`${shard.id}: execution metadata schema must be 1`);
    validExecutionIdentity(execution, shard.id);
    if (execution.querySha256 !== metadata.sqlSha256) fail(`${shard.id}: execution query SHA differs from the rendered SQL`);
    if (!same(execution.window, { startInclusive: shard.from, endExclusive: shard.to })) fail(`${shard.id}: execution window mismatch`);

    const startOffset = Number(metadata.userShard?.startOffset);
    const endOffsetExclusive = Number(metadata.userShard?.endOffsetExclusive);
    const eligibleUsers = Number(metadata.userShard?.eligibleUsers);
    const selectedUsers = Number(metadata.userShard?.selectedUsers);
    if (![startOffset, endOffsetExclusive, eligibleUsers, selectedUsers].every(Number.isSafeInteger)) fail(`${shard.id}: invalid user offsets`);
    if (selectedUsers !== endOffsetExclusive - startOffset || selectedUsers <= 0) fail(`${shard.id}: selected user count does not match offsets`);
    partitionMetadata.push({
      id: shard.id,
      index: shard.userShardIndex,
      count: shard.userShardCount,
      startOffset,
      endOffsetExclusive,
      eligibleUsers,
      selectedUsers,
      selectedUserIdsSha256: metadata.userShard.selectedUserIdsSha256
    });

    const parsed = parseCsv(resultBuffer.toString("utf8"));
    if (!same(parsed.header, EXPECTED_HEADER)) fail(`${shard.id}: result CSV header mismatch`);
    if (!parsed.rows.length) fail(`${shard.id}: result CSV is empty`);
    if (execution.resultSha256 !== sha256(resultBuffer)) fail(`${shard.id}: execution result SHA mismatch`);
    if (execution.rowCount !== parsed.rows.length) fail(`${shard.id}: execution row count mismatch`);
    manifestShards.push({
      id: shard.id,
      window: { startInclusive: shard.from, endExclusive: shard.to },
      rankShard: EXPECTED_RANK_SHARD,
      userShard: {
        index: shard.userShardIndex,
        count: shard.userShardCount,
        startOffset,
        endOffsetExclusive,
        eligibleUsers,
        selectedUsers,
        selectedUserIdsSha256: metadata.userShard.selectedUserIdsSha256
      },
      query: { name: path.basename(shard.sqlPath), sha256: metadata.sqlSha256 },
      rendererMetadata: { name: path.basename(shard.metaPath), sha256: sha256(metaBuffer) },
      execution: {
        name: path.basename(shard.executionPath),
        sha256: sha256(executionBuffer),
        executionMode: execution.executionMode,
        queryJobId: execution.queryJobId,
        querySha256: execution.querySha256
      },
      result: { name: path.basename(shard.csvPath), sha256: sha256(resultBuffer), rowCount: parsed.rows.length }
    });
  }
  partitionMetadata.sort((left, right) => left.startOffset - right.startOffset);
  const eligibleUsers = partitionMetadata[0].eligibleUsers;
  if (partitionMetadata.some((partition) => partition.eligibleUsers !== eligibleUsers)) {
    fail(`${window.from}: user partitions disagree on eligible user count`);
  }
  if (
    partitionMetadata[0].startOffset !== 0
    || partitionMetadata.some((partition, index) => index > 0 && partitionMetadata[index - 1].endOffsetExclusive !== partition.startOffset)
    || partitionMetadata.at(-1).endOffsetExclusive !== eligibleUsers
  ) {
    fail(`${window.from}: user partitions do not cover the eligible user list exactly once`);
  }
  windowPartitions.push({
    from: window.from,
    to: window.to,
    eligibleUsers,
    partitionCount: partitionMetadata.length,
    partitions: partitionMetadata
  });
}
if (sourceHashes.size !== 1) fail("rank source SHA differs across shards");
if ([...sourceHashes][0] !== sha256(rankBuffer)) fail("renderer rank source SHA differs from the recorded rank export");
if (queryTemplateHashes.size !== 1) fail("postflop source query-template SHA differs across shards");
if ([...queryTemplateHashes][0] !== EXPECTED_POSTFLOP_QUERY_TEMPLATE_SHA256) fail("postflop source query-template SHA is stale");

const manifest = {
  schemaVersion: 2,
  strategy: plan.strategy,
  plan: { name: path.basename(planPath), sha256: sha256(planBuffer) },
  coverage: {
    window: { startInclusive: EXPECTED_START, endExclusive: EXPECTED_END },
    continuous: true,
    timeWindows: plan.windows,
    rankShard: EXPECTED_RANK_SHARD,
    userPartitionPolicy: EXPECTED_PARTITION_POLICY,
    windowPartitions,
    shardCount: manifestShards.length
  },
  sourceQueryTemplateSha256: [...queryTemplateHashes][0],
  rankSource: {
    name: path.basename(rankPath),
    metadataName: path.basename(rankMetaPath),
    metadataSha256: sha256(rankMetaBuffer),
    sourceQueryTemplateSha256: rankMetadata.sourceQueryTemplateSha256,
    executionMode: rankMetadata.executionMode,
    queryJobId: rankMetadata.queryJobId,
    querySha256: rankMetadata.querySha256,
    resultSha256: rankMetadata.resultSha256,
    rowCount: rankMetadata.rowCount,
    window: rankMetadata.window
  },
  shards: manifestShards
};
const output = path.resolve(options.output);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ output, shards: manifestShards.length, continuous: true })}\n`);
