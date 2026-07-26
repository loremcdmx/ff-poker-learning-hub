#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../../..");
const options = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const match = argument.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${argument}`);
  return [match[1], match[2]];
}));
for (const key of ["plan", "kind", "receipts", "output"]) {
  if (!options[key]) throw new Error(`--${key} is required`);
}
if (!new Set(["action", "ev"]).has(options.kind)) throw new Error("--kind must be action or ev");

const expectedHeaders = {
  action: [
    "trainer", "cohort", "hero_position", "opener_position", "open_size",
    "stack_bucket", "hand_class", "opportunities", "folds", "calls",
    "raises", "jams", "other", "first_hand_at", "last_hand_at",
  ],
  ev: [
    "cohort", "hand_class", "opportunities", "players", "private_player_ids",
    "spot_ev_bb_100", "ev_sum_bb", "folds", "calls", "raises", "jams",
    "fold_pct", "call_pct", "raise_pct", "jam_pct",
  ],
};

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function outsideRepository(candidate, label) {
  const resolved = path.resolve(candidate);
  if (resolved === repoRoot || resolved.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`${label} must stay outside the repository`);
  }
  return resolved;
}

function rowCount(source) {
  return source.toString("utf8").split(/\r?\n/).filter(Boolean).length - 1;
}

const planPath = outsideRepository(options.plan, "source plan");
const receiptsPath = outsideRepository(options.receipts, "execution receipts");
const outputPath = outsideRepository(options.output, "shard ledger");
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const receipts = JSON.parse(fs.readFileSync(receiptsPath, "utf8"));
assert.equal(plan.schema, "ff-preflop-benchmark-source-plan-v1", "unexpected source plan schema");
assert(
  new Set(["contiguous-quarterly_time_shards", "contiguous_time_shards"]).has(plan.strategy),
  "unexpected source plan strategy"
);
assert.equal(receipts.schema, "ff-preflop-benchmark-execution-receipts-v1", "unexpected receipt schema");
assert.equal(receipts.kind, options.kind, "receipt kind differs");
assert(Array.isArray(plan.shards) && plan.shards.length >= 2 && plan.shardCount === plan.shards.length, "source plan has incomplete shards");
assert(Array.isArray(receipts.shards) && receipts.shards.length === plan.shards.length, "receipts do not cover every source shard");

const receiptByIndex = new Map(receipts.shards.map((receipt) => [receipt.shardIndex, receipt]));
assert.equal(receiptByIndex.size, plan.shards.length, "receipt shard indexes are duplicated");
const executionIds = new Set();
const shards = plan.shards.map((planned, expectedIndex) => {
  assert.equal(planned.shardIndex, expectedIndex, "source plan shard indexes are not contiguous");
  assert.equal(planned.shardCount, plan.shardCount, "source plan mixes shard counts");
  const receipt = receiptByIndex.get(planned.shardIndex);
  assert(receipt, `missing receipt for shard ${planned.shardIndex}`);
  const queryPath = outsideRepository(planned[options.kind].queryPath, `shard ${planned.shardIndex} query`);
  const expectedResultPath = outsideRepository(planned[options.kind].resultPath, `shard ${planned.shardIndex} result`);
  const resultPath = outsideRepository(receipt.resultPath || expectedResultPath, `shard ${planned.shardIndex} result`);
  assert.equal(resultPath, expectedResultPath, `shard ${planned.shardIndex} result path differs from the immutable plan`);
  const querySource = fs.readFileSync(queryPath);
  const resultSource = fs.readFileSync(resultPath);
  const querySha256 = sha256(querySource);
  const resultSha256 = sha256(resultSource);
  const queryJobId = String(receipt.queryJobId || "");
  const executionMode = receipt.executionMode;
  assert(new Set(["async", "sync"]).has(executionMode), `shard ${planned.shardIndex} execution mode is missing`);
  if (executionMode === "async") assert.match(queryJobId, /^mcp_ch_job_[a-f0-9]+$/, `shard ${planned.shardIndex} must keep the original ClickHouse job id`);
  else assert.equal(queryJobId, `sync:${querySha256}`, `shard ${planned.shardIndex} sync id must derive from the rendered query bytes`);
  assert(!executionIds.has(queryJobId), `shard ${planned.shardIndex} repeats an execution id`);
  executionIds.add(queryJobId);
  assert.equal(receipt.truncated, false, `shard ${planned.shardIndex} must be explicitly complete`);
  assert(Number.isSafeInteger(receipt.durationMs) && receipt.durationMs > 0, `shard ${planned.shardIndex} runtime is missing`);
  const header = resultSource.toString("utf8").split(/\r?\n/, 1)[0].split(",");
  assert.deepEqual(header, expectedHeaders[options.kind], `shard ${planned.shardIndex} result header differs`);
  const rows = rowCount(resultSource);
  assert(Number.isSafeInteger(rows) && rows > 0, `shard ${planned.shardIndex} result is empty`);
  return {
    shardIndex: planned.shardIndex,
    shardCount: planned.shardCount,
    queryPath,
    resultPath,
    queryJobId,
    executionMode,
    rowCount: rows,
    byteSize: resultSource.byteLength,
    truncated: false,
    durationMs: receipt.durationMs,
    windowStartInclusive: planned.windowStartInclusive,
    windowEndExclusive: planned.windowEndExclusive,
    querySha256,
    resultSha256,
  };
});

const ledger = {
  schema: "ff-preflop-benchmark-shard-ledger-v1",
  kind: options.kind,
  partitionAxis: "time",
  analysisWindow: plan.analysisWindow,
  plan: {
    file: path.basename(planPath),
    sha256: sha256(fs.readFileSync(planPath)),
    strategy: plan.strategy,
  },
  shards,
  ...(Array.isArray(receipts.nonSourceAttempts) && receipts.nonSourceAttempts.length
    ? { nonSourceAttempts: receipts.nonSourceAttempts }
    : {}),
};
fs.writeFileSync(outputPath, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({
  kind: options.kind,
  output: outputPath,
  shards: shards.length,
  rows: shards.reduce((sum, shard) => sum + shard.rowCount, 0),
  bytes: shards.reduce((sum, shard) => sum + shard.byteSize, 0),
}, null, 2));
