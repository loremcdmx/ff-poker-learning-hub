#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const templateSha256 = crypto.createHash("sha256").update(fs.readFileSync(path.join(here, "resteal-rank-cube.sql"))).digest("hex");
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "resteal-rank-renderer-"));
const input = path.join(tempDirectory, "rank-intervals.csv");

try {
  fs.writeFileSync(input, [
    "user_id,rang,rank_start_at,rank_end_at",
    "101,15,2023-09-01 00:00:00,2024-01-01 00:00:00",
    "101,14,2024-01-01 00:00:00,2026-07-22 00:00:00",
    "101,15,2024-01-01 00:00:00,2024-01-01 00:00:00",
    "202,18,2023-09-01 00:00:00,2026-07-22 00:00:00",
    "303,16,2023-09-01 00:00:00,2026-07-22 00:00:00",
    "",
  ].join("\n"));

  const run = spawnSync(process.execPath, [
    path.join(here, "render-resteal-rank-query.mjs"),
    input,
    "--rank-min=11",
    "--rank-max=18",
  ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const metadata = JSON.parse(run.stderr.trim());
  assert.deepEqual(metadata, {
    templateSha256,
    sourceRows: 5,
    validIntervals: 4,
    excludedZeroLength: 1,
    window: ["2023-09-01", "2026-07-22"],
    shard: [11, 18],
    shardIntervals: 4,
    shardUsers: 3,
    userShard: {
      index: 0,
      count: 1,
      eligibleUsers: 3,
      firstUserId: 101,
      lastUserId: 303,
      userIdsSha256: "5d4a33e4992aac538f7748b8b40dc56b944beaf3aa1cb7040331764aecfc06e9",
    },
  });
  assert.match(run.stdout, /\(101, 15, '2023-09-01 00:00:00', '2024-01-01 00:00:00'\)/);
  assert.match(run.stdout, /\(101, 14, '2024-01-01 00:00:00', '2026-07-22 00:00:00'\)/);
  assert.match(run.stdout, /\(202, 18, '2023-09-01 00:00:00', '2026-07-22 00:00:00'\)/);
  assert.match(run.stdout, /h\.user_id IN \(101, 202, 303\)/);
  assert.doesNotMatch(run.stdout, /\{\{/);
  assert(run.stdout.indexOf("candidate_ids AS") < run.stdout.indexOf("latest_overall AS"));
  assert(run.stdout.indexOf("latest_overall AS") < run.stdout.indexOf("filtered AS"));
  assert.match(run.stdout, /INNER JOIN candidate_ids AS c USING \(hand_player_id\)/);
  assert.match(run.stdout, /candidate_ids AS[\s\S]*is_bb = 1[\s\S]*GROUP BY h\.hand_player_id/);
  assert.match(run.stdout, /filtered AS[\s\S]*WHERE x\.9 = 1[\s\S]*AND x\.10 = 4[\s\S]*AND x\.11 = 1/);
  const latestQuery = run.stdout.slice(run.stdout.indexOf("latest_overall AS"), run.stdout.indexOf("ranked_latest AS"));
  assert.match(latestQuery, /tuple\(\s*h\.version,\s*h\.user_id,\s*h\.played_at,[\s\S]*h\.preflop_raise_and_blind_made_amount_bb,[\s\S]*h\.bet_bb_amount/);
  assert.doesNotMatch(latestQuery, /tuple\(h\.version,\s*h\.hand_player_id\)/, "hand_player_id cannot break equal-version ties inside its own GROUP BY");
  assert.match(run.stdout, /GROUP BY h\.hand_player_id/);
  assert.match(run.stdout, /FROM latest_overall AS l[\s\S]*WHERE x\.2 >= r\.rank_start_at/);
  assert.match(run.stdout, /h\.preflop_raise_and_blind_made_amount_bb/);
  assert.match(run.stdout, /coalesce\(h\.bet_bb_amount, 0\) \/ h\.bb_amount/);
  assert.match(run.stdout, /x\.3 = 'R' AND \([\s\S]*x\.4 = 1[\s\S]*isNotNull\(x\.17\)[\s\S]*x\.17 - x\.18 >= x\.7 - 0\.01[\s\S]*\), 'jam'/);
  assert.match(run.stdout, /startsWith\(x\.3, 'R'\), 'small3bet'/);

  const userShards = [0, 1].map((index) => spawnSync(process.execPath, [
    path.join(here, "render-resteal-rank-query.mjs"),
    input,
    "--rank-min=11",
    "--rank-max=18",
    `--user-shard-index=${index}`,
    "--user-shard-count=2",
  ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }));
  for (const shard of userShards) assert.equal(shard.status, 0, shard.stderr || shard.stdout);
  assert.match(userShards[0].stdout, /h\.user_id IN \(101\)/);
  assert.doesNotMatch(userShards[0].stdout, /h\.user_id IN \([^)]*303/);
  assert.match(userShards[1].stdout, /h\.user_id IN \(202, 303\)/);
  assert.doesNotMatch(userShards[1].stdout, /h\.user_id IN \([^)]*101/);
  assert.deepEqual(userShards.map((shard) => JSON.parse(shard.stderr).userShard.index), [0, 1]);
  for (const shard of userShards) assert.match(JSON.parse(shard.stderr).userShard.userIdsSha256, /^[a-f0-9]{64}$/);

  const partitionInput = path.join(tempDirectory, "rank-intervals-128-users.csv");
  const partitionUserIds = Array.from({ length: 128 }, (_, index) => 10_001 + index);
  fs.writeFileSync(partitionInput, [
    "user_id,rang,rank_start_at,rank_end_at",
    ...partitionUserIds.map((userId, index) => `${userId},${index % 18 + 1},2023-09-01 00:00:00,2026-07-22 00:00:00`),
    "",
  ].join("\n"));
  for (const shardCount of [16, 32, 64, 128]) {
    const observedUserIds = [];
    const observedHashes = new Set();
    for (let shardIndex = 0; shardIndex < shardCount; shardIndex += 1) {
      const shard = spawnSync(process.execPath, [
        path.join(here, "render-resteal-rank-query.mjs"),
        partitionInput,
        "--rank-min=1",
        "--rank-max=18",
        `--user-shard-index=${shardIndex}`,
        `--user-shard-count=${shardCount}`,
      ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
      assert.equal(shard.status, 0, shard.stderr || shard.stdout);
      const shardMetadata = JSON.parse(shard.stderr);
      const expectedStart = Math.floor(partitionUserIds.length * shardIndex / shardCount);
      const expectedEnd = Math.floor(partitionUserIds.length * (shardIndex + 1) / shardCount);
      const expectedShardUserIds = partitionUserIds.slice(expectedStart, expectedEnd);
      assert.equal(shardMetadata.templateSha256, templateSha256);
      assert.equal(shardMetadata.sourceRows, partitionUserIds.length);
      assert.equal(shardMetadata.validIntervals, partitionUserIds.length);
      assert.equal(shardMetadata.excludedZeroLength, 0);
      assert.deepEqual(shardMetadata.window, ["2023-09-01", "2026-07-22"]);
      assert.deepEqual(shardMetadata.shard, [1, 18]);
      assert.equal(shardMetadata.shardIntervals, expectedShardUserIds.length);
      assert.equal(shardMetadata.shardUsers, expectedShardUserIds.length);
      assert.deepEqual(shardMetadata.userShard, {
        index: shardIndex,
        count: shardCount,
        eligibleUsers: partitionUserIds.length,
        firstUserId: expectedShardUserIds[0],
        lastUserId: expectedShardUserIds.at(-1),
        userIdsSha256: crypto.createHash("sha256").update(expectedShardUserIds.join(",")).digest("hex"),
      });
      const renderedUserLists = [...shard.stdout.matchAll(/h\.user_id IN \(([^)]*)\)/g)]
        .map((match) => match[1].split(",").map((value) => Number(value.trim())));
      assert.equal(renderedUserLists.length, 2, `expected candidate and latest user filters for ${shardIndex}/${shardCount}`);
      assert.deepEqual(renderedUserLists[0], expectedShardUserIds);
      assert.deepEqual(renderedUserLists[1], expectedShardUserIds);
      assert.doesNotMatch(shard.stdout, /\{\{/);
      observedUserIds.push(...renderedUserLists[0]);
      observedHashes.add(shardMetadata.userShard.userIdsSha256);
    }
    assert.deepEqual(observedUserIds, partitionUserIds, `${shardCount} shards must cover every eligible user exactly once and in order`);
    assert.equal(new Set(observedUserIds).size, partitionUserIds.length, `${shardCount} shards overlap`);
    assert.equal(observedHashes.size, shardCount, `${shardCount} shards must have distinct user-set hashes`);
  }

  const cubeHeader = "cohort,opener_position,open_size_bb,depth_band,holecards_str,opportunities,folds,calls,small3bets,jams,other,first_hand_at,last_hand_at";
  const firstCube = path.join(tempDirectory, "first.csv");
  const secondCube = path.join(tempDirectory, "second.csv");
  const mergedCube = path.join(tempDirectory, "merged.csv");
  const mergeMetadata = path.join(tempDirectory, "merge.json");
  fs.writeFileSync(firstCube, `${cubeHeader}\nnovice,BTN,2.0,25-30,AA,10,2,3,4,1,0,2023-09-02 01:00:00,2024-08-31 23:00:00\n`);
  fs.writeFileSync(secondCube, `${cubeHeader}\nnovice,BTN,2.0,25-30,AA,20,5,6,7,2,0,2024-09-02 01:00:00,2025-08-31 23:00:00\n`);
  const merge = spawnSync(process.execPath, [
    path.join(here, "merge-resteal-rank-cube.mjs"),
    `--inputs=${firstCube},${secondCube}`,
    `--output=${mergedCube}`,
    `--metadata=${mergeMetadata}`,
  ], { encoding: "utf8" });
  assert.equal(merge.status, 0, merge.stderr || merge.stdout);
  assert.equal(
    fs.readFileSync(mergedCube, "utf8"),
    `${cubeHeader}\nnovice,BTN,2.0,25-30,AA,30,7,9,11,3,0,2023-09-02 01:00:00,2025-08-31 23:00:00\n`,
    "time shards merge only exact additive counters and date bounds",
  );
  const mergeReport = JSON.parse(fs.readFileSync(mergeMetadata, "utf8"));
  assert.equal(mergeReport.schema, "ff-resteal-rank-cube-merge-v1");
  assert.equal(mergeReport.inputs.length, 2);
  assert.equal(mergeReport.mergedRows, 1);
  assert.equal(mergeReport.totals.opportunities, 30);
  assert.match(mergeReport.sha256, /^[a-f0-9]{64}$/);

  const userMetaOne = path.join(tempDirectory, "user-one.meta.json");
  const userMetaTwo = path.join(tempDirectory, "user-two.meta.json");
  fs.writeFileSync(userMetaOne, `${JSON.stringify({ templateSha256, window: ["2023-09-01", "2026-07-22"], shardUsers: 1, userShard: { index: 0, count: 2, eligibleUsers: 2, firstUserId: 101, lastUserId: 101, userIdsSha256: "a".repeat(64) } })}\n`);
  fs.writeFileSync(userMetaTwo, `${JSON.stringify({ templateSha256, window: ["2023-09-01", "2026-07-22"], shardUsers: 1, userShard: { index: 1, count: 2, eligibleUsers: 2, firstUserId: 303, lastUserId: 303, userIdsSha256: "b".repeat(64) } })}\n`);
  const userMergeMetadata = path.join(tempDirectory, "user-merge.json");
  const queryHashes = ["c".repeat(64), "d".repeat(64)];
  const userMerge = spawnSync(process.execPath, [
    path.join(here, "merge-resteal-rank-cube.mjs"),
    `--inputs=${firstCube},${secondCube}`,
    `--output=${path.join(tempDirectory, "user-merged.csv")}`,
    `--metadata=${userMergeMetadata}`,
    `--renderer-metadata=${userMetaOne},${userMetaTwo}`,
    `--query-sha256=${queryHashes.join(",")}`,
    `--source-refs=mcp_ch_job_deadbeef01,sync:${queryHashes[1]}`,
  ], { encoding: "utf8" });
  assert.equal(userMerge.status, 0, userMerge.stderr || userMerge.stdout);
  const userMergeReport = JSON.parse(fs.readFileSync(userMergeMetadata, "utf8"));
  assert.equal(userMergeReport.shardStrategy, "immutable-user-id");
  assert.deepEqual(userMergeReport.inputs.map((item) => item.executionMode), ["async", "sync"]);

  const timeMetaOne = path.join(tempDirectory, "time-one.meta.json");
  const timeMetaTwo = path.join(tempDirectory, "time-two.meta.json");
  fs.writeFileSync(timeMetaOne, `${JSON.stringify({ templateSha256, window: ["2023-09-01", "2024-09-01"], shardUsers: 2, userShard: { index: 0, count: 1, eligibleUsers: 2, firstUserId: 101, lastUserId: 303, userIdsSha256: "e".repeat(64) } })}\n`);
  fs.writeFileSync(timeMetaTwo, `${JSON.stringify({ templateSha256, window: ["2024-09-01", "2025-09-01"], shardUsers: 2, userShard: { index: 0, count: 1, eligibleUsers: 2, firstUserId: 101, lastUserId: 303, userIdsSha256: "e".repeat(64) } })}\n`);
  const timeMergeMetadata = path.join(tempDirectory, "time-merge.json");
  const timeMerge = spawnSync(process.execPath, [
    path.join(here, "merge-resteal-rank-cube.mjs"),
    `--inputs=${firstCube},${secondCube}`,
    `--output=${path.join(tempDirectory, "time-merged.csv")}`,
    `--metadata=${timeMergeMetadata}`,
    `--renderer-metadata=${timeMetaOne},${timeMetaTwo}`,
    `--query-sha256=${queryHashes.join(",")}`,
    `--source-refs=${queryHashes.map((hash) => `sync:${hash}`).join(",")}`,
  ], { encoding: "utf8" });
  assert.equal(timeMerge.status, 0, timeMerge.stderr || timeMerge.stdout);
  assert.equal(JSON.parse(fs.readFileSync(timeMergeMetadata, "utf8")).shardStrategy, "contiguous-time");
  console.log("resteal rank query renderer passed: external rank intervals validated and sharded");
} finally {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
}
