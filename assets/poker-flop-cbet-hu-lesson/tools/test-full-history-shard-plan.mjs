#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const planner = path.join(here, "print-full-history-shard-plan.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-postflop-plan-"));
const fakeRankPath = path.join(temp, "rank-intervals.csv");
const fakeRankMetaPath = `${fakeRankPath}.meta.json`;
const outputDir = path.join(temp, "outputs");
const planOutput = path.join(outputDir, "plan.json");
const result = spawnSync(process.execPath, [
  planner,
  fakeRankPath,
  `--rank-source-meta=${fakeRankMetaPath}`,
  `--output-dir=${outputDir}`,
  `--plan-output=${planOutput}`
], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr);
const plan = JSON.parse(result.stdout);

assert.deepEqual(plan.window, { startInclusive: "2023-09-01", endExclusive: "2026-07-22" });
assert.equal(plan.schemaVersion, 4);
assert.equal(plan.strategy, "six_month_time_windows_x_contiguous_user_partitions");
assert.equal(plan.userPartitionPolicy, "sorted_user_offsets_exact_once");
assert.equal(plan.windowMonths, 6);
assert.equal(plan.defaultUserShardCount, 2);
assert.deepEqual(plan.rankShard, [1, 18], "every query computes all four cohorts in one output");
assert.equal(plan.windows.length, 6, "five full six-month windows plus one final partial window are explicit");
assert.deepEqual(plan.windows[0], { from: "2023-09-01", to: "2024-03-01" });
assert.deepEqual(plan.windows.at(-1), { from: "2026-03-01", to: "2026-07-22" });
for (let index = 1; index < plan.windows.length; index += 1) {
  assert.equal(plan.windows[index - 1].to, plan.windows[index].from, `window ${index} is contiguous`);
}
assert.equal(plan.shardCount, 12);
assert.equal(plan.shards.length, 12);
assert.equal(plan.rankPath, fakeRankPath);
assert.equal(plan.rankSourceMetaPath, fakeRankMetaPath);
assert.equal(new Set(plan.shards.map((shard) => shard.id)).size, 12);
for (const window of plan.windows) {
  const pair = plan.shards.filter((shard) => shard.from === window.from && shard.to === window.to);
  assert.deepEqual(pair.map((shard) => shard.userShardIndex), [0, 1]);
  assert(pair.every((shard) => shard.userShardCount === 2));
  assert(pair.every((shard) => shard.rankMin === 1 && shard.rankMax === 18));
}
assert(plan.shards.every((shard) => shard.renderCommand.includes("render-full-history-field-query.mjs")));
assert(plan.shards.every((shard) => shard.renderCommand.includes("--rank-min=1")));
assert(plan.shards.every((shard) => shard.renderCommand.includes("--rank-max=18")));
assert(plan.shards.every((shard) => shard.renderCommand.includes(`--output=${shard.sqlPath}`)));
assert(plan.shards.every((shard) => shard.renderCommand.includes(`--meta-output=${shard.metaPath}`)));
assert(plan.shards.every((shard) => shard.executionPath.endsWith(".execution.json")));
assert(plan.shards.every((shard) => shard.recordSyncCommand.includes("record-full-history-source-execution.mjs")));
assert(plan.shards.every((shard) => shard.recordSyncCommand.includes(`--result=${shard.csvPath}`)));
assert.match(plan.rankRecordSyncCommand, /full-history-rank-intervals\.sql/);
assert.match(plan.manifestCommand, /build-full-history-shard-manifest\.mjs/);
assert.match(plan.manifestCommand, /--rank-source-meta=/);
assert.match(plan.mergeCommand, /merge-full-history-field-shards\.mjs/);
assert.match(plan.mergeCommand, /--manifest=.*full-history-shard-manifest\.json/);
assert.match(plan.mergeCommand, /--window-start=2023-09-01/);
assert.match(plan.mergeCommand, /--window-end=2026-07-22/);
assert.equal((plan.mergeCommand.match(/\.csv/g) || []).length, 12);
assert.deepEqual(JSON.parse(fs.readFileSync(planOutput, "utf8")), plan, "--plan-output persists the exact printed plan");

const windows = spawnSync(process.execPath, [planner, fakeRankPath, "--format=windows"], { encoding: "utf8" });
assert.equal(windows.status, 0, windows.stderr);
assert.equal(windows.stdout.trim().split("\n").length, 6);

const refined = spawnSync(process.execPath, [
  planner,
  fakeRankPath,
  "--refine-shard=2023-09-01_2024-03-01_u1of2",
  "--refine-user-shard-count=4"
], { encoding: "utf8" });
assert.equal(refined.status, 0, refined.stderr);
const refinedPlan = JSON.parse(refined.stdout);
assert.equal(refinedPlan.shardCount, 13);
assert.deepEqual(
  refinedPlan.shards
    .filter((shard) => shard.from === "2023-09-01")
    .map((shard) => [shard.userShardIndex, shard.userShardCount]),
  [[0, 4], [1, 4], [1, 2]],
  "the failed first half is replaced by two exact contiguous quarters while the succeeded second half is retained"
);
assert.equal(refinedPlan.refinements[0].replacedShardId, "2023-09-01_2024-03-01_u1of2");

const recursivelyRefined = spawnSync(process.execPath, [
  planner,
  fakeRankPath,
  "--refinement=2023-09-01_2024-03-01_u1of2:4,2023-09-01_2024-03-01_u1of4:8"
], { encoding: "utf8" });
assert.equal(recursivelyRefined.status, 0, recursivelyRefined.stderr);
const recursivelyRefinedPlan = JSON.parse(recursivelyRefined.stdout);
assert.equal(recursivelyRefinedPlan.shardCount, 14);
assert.deepEqual(
  recursivelyRefinedPlan.shards
    .filter((shard) => shard.from === "2023-09-01")
    .map((shard) => [shard.userShardIndex, shard.userShardCount]),
  [[0, 8], [1, 8], [1, 4], [1, 2]],
  "a failed quarter can be split into exact eighths without rerunning its succeeded sibling quarter"
);
assert.deepEqual(
  recursivelyRefinedPlan.refinements.map((entry) => entry.replacedShardId),
  ["2023-09-01_2024-03-01_u1of2", "2023-09-01_2024-03-01_u1of4"]
);

console.log("full-history postflop shard plan: ok");
