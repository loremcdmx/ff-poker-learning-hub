#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const planner = path.join(here, "print-full-history-shard-plan.mjs");
const builder = path.join(here, "build-full-history-shard-manifest.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-postflop-manifest-"));
const outputDir = path.join(temp, "outputs");
const planPath = path.join(outputDir, "plan.json");
const fakeRanks = path.join(temp, "ranks.csv");
const rankMetaPath = `${fakeRanks}.meta.json`;
const rankTemplatePath = path.resolve(here, "../research/full-history-rank-intervals.sql");
const postflopTemplatePath = path.resolve(here, "../research/full-history-postflop-field-cube.sql");

function sha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

fs.writeFileSync(fakeRanks, "user_id,rang,rank_start_at,rank_end_at\n1,1,2023-09-01 00:00:00,2026-07-22 00:00:00\n");
const rankTemplateSha256 = sha256(rankTemplatePath);
fs.writeFileSync(rankMetaPath, `${JSON.stringify({
  schemaVersion: 1,
  executionMode: "async",
  queryJobId: "mcp_bq_job_fixture",
  querySha256: rankTemplateSha256,
  sourceQueryTemplateSha256: rankTemplateSha256,
  resultSha256: sha256(fakeRanks),
  rowCount: 1,
  window: { startInclusive: "2023-09-01", endExclusive: "2026-07-22" }
}, null, 2)}\n`);
const planned = spawnSync(process.execPath, [planner, fakeRanks, `--rank-source-meta=${rankMetaPath}`, `--output-dir=${outputDir}`, `--plan-output=${planPath}`], { encoding: "utf8" });
assert.equal(planned.status, 0, planned.stderr);
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const failedHalf = plan.shards.find((shard) => shard.from === "2023-09-01" && shard.userShardIndex === 0);
const refinedHalves = [0, 1].map((userShardIndex) => {
  const id = `${failedHalf.from}_${failedHalf.to}_u${userShardIndex + 1}of4`;
  return {
    ...failedHalf,
    id,
    userShardIndex,
    userShardCount: 4,
    sqlPath: path.join(outputDir, `${id}.sql`),
    metaPath: path.join(outputDir, `${id}.meta.json`),
    csvPath: path.join(outputDir, `${id}.csv`),
    executionPath: path.join(outputDir, `${id}.execution.json`)
  };
});
plan.shards.splice(plan.shards.indexOf(failedHalf), 1, ...refinedHalves);
plan.shardCount = plan.shards.length;
fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
const header = "node,cohort,position,depth_band,opportunities,checks_back,cbets,faced_raises,folds,calls,raises,other,first_hand_at,last_hand_at";
const sourceSha256 = sha256(fakeRanks);
const postflopTemplateSha256 = sha256(postflopTemplatePath);
for (const shard of plan.shards) {
  const sql = `-- ${shard.id}\nSELECT 1;\n`;
  fs.writeFileSync(shard.sqlPath, sql);
  const startOffset = Math.floor(10 * shard.userShardIndex / shard.userShardCount);
  const endOffsetExclusive = Math.floor(10 * (shard.userShardIndex + 1) / shard.userShardCount);
  fs.writeFileSync(shard.metaPath, `${JSON.stringify({
    sourceRows: 10,
    validIntervals: 10,
    excludedZeroLength: 0,
    sourceSha256,
    window: [shard.from, shard.to],
    rankShard: [1, 18],
    userShard: {
      index: shard.userShardIndex,
      count: shard.userShardCount,
      startOffset,
      endOffsetExclusive,
      eligibleUsers: 10,
      selectedUsers: endOffsetExclusive - startOffset,
      selectedUserIdsSha256: createHash("sha256").update(`${shard.id}-users`).digest("hex")
    },
    shardIntervals: endOffsetExclusive - startOffset,
    shardUsers: endOffsetExclusive - startOffset,
    sourceQueryTemplateSha256: postflopTemplateSha256,
    sqlSha256: createHash("sha256").update(sql).digest("hex")
  }, null, 2)}\n`);
  fs.writeFileSync(shard.csvPath, [
    header,
    `cbet,league1,BTN,20-30,50,20,30,5,0,0,0,0,${shard.from} 00:00:00,${shard.from} 00:00:01`
  ].join("\n"));
  fs.writeFileSync(shard.executionPath, `${JSON.stringify({
    schemaVersion: 1,
    executionMode: "async",
    queryJobId: `mcp_ch_job_${shard.id}`,
    querySha256: createHash("sha256").update(sql).digest("hex"),
    sourceQueryTemplateSha256: postflopTemplateSha256,
    resultSha256: sha256(shard.csvPath),
    rowCount: 1,
    window: { startInclusive: shard.from, endExclusive: shard.to }
  }, null, 2)}\n`);
}

const manifestPath = path.join(outputDir, "manifest.json");
const built = spawnSync(process.execPath, [builder, planPath, `--rank-source-meta=${rankMetaPath}`, `--output=${manifestPath}`], { encoding: "utf8" });
assert.equal(built.status, 0, built.stderr);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.schemaVersion, 2);
assert.equal(manifest.coverage.continuous, true);
assert.equal(manifest.coverage.shardCount, 13);
assert.deepEqual(manifest.coverage.rankShard, [1, 18]);
assert.equal(manifest.coverage.userPartitionPolicy, "sorted_user_offsets_exact_once");
assert.equal(manifest.coverage.windowPartitions[0].partitionCount, 3);
assert.equal(manifest.shards.length, 13);
assert(manifest.shards.every((shard) => /^[a-f0-9]{64}$/.test(shard.query.sha256)));
assert(manifest.shards.every((shard) => /^[a-f0-9]{64}$/.test(shard.result.sha256)));
assert(manifest.shards.every((shard) => shard.result.rowCount === 1));
assert(manifest.shards.every((shard) => shard.execution.queryJobId.startsWith("mcp_ch_job_")));
assert.equal(manifest.sourceQueryTemplateSha256, postflopTemplateSha256);
assert.equal(manifest.rankSource.queryJobId, "mcp_bq_job_fixture");
assert.equal(manifest.rankSource.resultSha256, sourceSha256);

const badMeta = JSON.parse(fs.readFileSync(plan.shards[0].metaPath, "utf8"));
badMeta.userShard.endOffsetExclusive = 6;
fs.writeFileSync(plan.shards[0].metaPath, `${JSON.stringify(badMeta, null, 2)}\n`);
const rejectedOffsets = spawnSync(process.execPath, [builder, planPath, `--rank-source-meta=${rankMetaPath}`, `--output=${manifestPath}`], { encoding: "utf8" });
assert.notEqual(rejectedOffsets.status, 0);
assert.match(rejectedOffsets.stderr, /selected user count does not match offsets|partitions do not cover/);

badMeta.userShard.endOffsetExclusive = 5;
fs.writeFileSync(plan.shards[0].metaPath, `${JSON.stringify(badMeta, null, 2)}\n`);
fs.appendFileSync(plan.shards[0].sqlPath, "-- tampered\n");
const rejectedSha = spawnSync(process.execPath, [builder, planPath, `--rank-source-meta=${rankMetaPath}`, `--output=${manifestPath}`], { encoding: "utf8" });
assert.notEqual(rejectedSha.status, 0);
assert.match(rejectedSha.stderr, /query SHA does not match/);

fs.writeFileSync(plan.shards[0].sqlPath, `-- ${plan.shards[0].id}\nSELECT 1;\n`);
const missingExecution = JSON.parse(fs.readFileSync(plan.shards[0].executionPath, "utf8"));
delete missingExecution.queryJobId;
fs.writeFileSync(plan.shards[0].executionPath, `${JSON.stringify(missingExecution, null, 2)}\n`);
const rejectedExecution = spawnSync(process.execPath, [builder, planPath, `--rank-source-meta=${rankMetaPath}`, `--output=${manifestPath}`], { encoding: "utf8" });
assert.notEqual(rejectedExecution.status, 0);
assert.match(rejectedExecution.stderr, /source execution identity is missing/);

console.log("full-history postflop shard manifest: ok");
