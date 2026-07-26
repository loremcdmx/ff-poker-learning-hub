#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const templateSha256 = sha256(fs.readFileSync(path.join(here, "resteal-rank-cube.sql")));
const temporary = fs.mkdtempSync(path.join("/private/tmp", "ff-resteal-source-meta-"));

try {
  const cubeHeader = "cohort,opener_position,open_size_bb,depth_band,holecards_str,opportunities,folds,calls,small3bets,jams,other,first_hand_at,last_hand_at";
  const sourceRows = [
    "novice,BTN,2.0,25-30,AA,20,5,6,7,2,0,2023-09-02 01:00:00,2024-08-31 23:00:00",
    "novice,BTN,2.0,25-30,AA,30,8,9,10,3,0,2024-09-02 01:00:00,2026-07-21 23:00:00",
  ];
  const sourceCsv = sourceRows.map((row, index) => path.join(temporary, `source-${index}.csv`));
  const renderedSql = sourceRows.map((_, index) => path.join(temporary, `source-${index}.sql`));
  const rendererMetadata = sourceRows.map((_, index) => path.join(temporary, `source-${index}.meta.json`));
  const userShards = [
    { index: 0, count: 2, eligibleUsers: 3, firstUserId: 101, lastUserId: 101, userIdsSha256: "a".repeat(64) },
    { index: 1, count: 2, eligibleUsers: 3, firstUserId: 202, lastUserId: 303, userIdsSha256: "b".repeat(64) },
  ];
  for (let index = 0; index < sourceRows.length; index += 1) {
    fs.writeFileSync(sourceCsv[index], `${cubeHeader}\n${sourceRows[index]}\n`);
    fs.writeFileSync(renderedSql[index], `SELECT ${index};\n`);
    fs.writeFileSync(rendererMetadata[index], `${JSON.stringify({
      templateSha256,
      sourceRows: 3,
      validIntervals: 3,
      excludedZeroLength: 0,
      window: ["2023-09-01", "2026-07-22"],
      shard: [1, 18],
      shardIntervals: index ? 2 : 1,
      shardUsers: index ? 2 : 1,
      userShard: userShards[index],
    })}\n`);
  }

  const cube = path.join(temporary, "cube.csv");
  fs.writeFileSync(cube, `${cubeHeader}\nnovice,BTN,2.0,25-30,AA,50,13,15,17,5,0,2023-09-02 01:00:00,2026-07-21 23:00:00\n`);
  const merge = path.join(temporary, "merge.json");
  const mergeInputs = sourceCsv.map((file, index) => ({
    file: path.basename(file),
    rows: 1,
    sha256: sha256(fs.readFileSync(file)),
    sourceRef: index === 0 ? "mcp_ch_job_cafebabe01" : `sync:${sha256(fs.readFileSync(renderedSql[index]))}`,
    executionMode: index === 0 ? "async" : "sync",
    querySha256: sha256(fs.readFileSync(renderedSql[index])),
    renderer: JSON.parse(fs.readFileSync(rendererMetadata[index], "utf8")),
  }));
  fs.writeFileSync(merge, `${JSON.stringify({
    schema: "ff-resteal-rank-cube-merge-v1",
    shardStrategy: "immutable-user-id",
    inputs: mergeInputs,
    sourceRows: 2,
    mergedRows: 1,
    sha256: sha256(fs.readFileSync(cube)),
    totals: { opportunities: 50, folds: 13, calls: 15, small3bets: 17, jams: 5, other: 0 },
  })}\n`);

  const rankIntervals = path.join(temporary, "rank-intervals.csv");
  fs.writeFileSync(rankIntervals, [
    "user_id,rang,rank_start_at,rank_end_at",
    "101,15,2023-09-01 00:00:00,2026-07-22 00:00:00",
    "202,18,2023-09-01 00:00:00,2026-07-22 00:00:00",
    "303,1,2023-09-01 00:00:00,2026-07-22 00:00:00",
  ].join("\n") + "\n");

  const abi = path.join(temporary, "abi.json");
  const abiSql = path.join(temporary, "abi.sql");
  fs.writeFileSync(abiSql, "SELECT 'ratio-of-sums';\n");
  fs.writeFileSync(abi, `${JSON.stringify({
    schema: "ff-resteal-abi-v1",
    queryJobId: "mcp_bq_deadbeef123",
    formula: "SUM(load_usd)/SUM(entries)",
    querySha256: sha256(fs.readFileSync(abiSql)),
    privateSql: abiSql,
    cohorts: {
      novice: { ranks: [15, 16, 17, 18], abiPlayers: 10, abiEntries: 100, loadUsd: 300, abiUsd: 3 },
      league3: { ranks: [11, 12, 13, 14], abiPlayers: 10, abiEntries: 100, loadUsd: 700, abiUsd: 7 },
      league2: { ranks: [6, 7, 8, 9, 10], abiPlayers: 10, abiEntries: 100, loadUsd: 1700, abiUsd: 17 },
      league1: { ranks: [1, 2, 3, 4, 5], abiPlayers: 10, abiEntries: 100, loadUsd: 4800, abiUsd: 48 },
    },
  })}\n`);
  const failedAttempts = path.join(temporary, "failed.json");
  fs.writeFileSync(failedAttempts, `${JSON.stringify([{ queryJobId: "mcp_ch_job_deadbeef", reason: "strict is_preflop_allin-only classifier rejected" }])}\n`);
  const output = path.join(temporary, "source-metadata.json");

  execFileSync(process.execPath, [
    path.join(here, "build-resteal-rank-source-metadata.mjs"),
    `--cube=${cube}`,
    `--merge=${merge}`,
    `--rank-intervals=${rankIntervals}`,
    "--rank-query-job-id=mcp_bq_job_deadbeef01",
    `--abi=${abi}`,
    `--output=${output}`,
    `--renderer-metadata=${rendererMetadata.join(",")}`,
    `--rendered-sql=${renderedSql.join(",")}`,
    `--source-csv=${sourceCsv.join(",")}`,
    `--failed-attempts=${failedAttempts}`,
  ], { stdio: "pipe" });

  const metadata = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(metadata.version, "resteal-rank-cube-20260722-full-history-r15-r18-v3");
  assert.equal(metadata.provenance.handCube.shardStrategy, "immutable-user-id");
  assert.equal(metadata.provenance.handCube.shards.length, 2);
  assert.deepEqual(metadata.provenance.handCube.queryJobIds, mergeInputs.map((item) => item.sourceRef));
  assert.deepEqual(metadata.provenance.handCube.shards.map((item) => item.executionMode), ["async", "sync"]);
  assert.deepEqual(metadata.provenance.handCube.shards.map((item) => item.rankMax), [18, 18]);
  assert.equal("firstUserId" in metadata.provenance.handCube.shards[0].userShard, false, "raw user ids cannot enter derived source metadata");
  assert.equal("lastUserId" in metadata.provenance.handCube.shards[0].userShard, false, "raw user ids cannot enter derived source metadata");
  assert.equal(metadata.provenance.rankIntervals.users, 3);
  assert.equal(metadata.provenance.rankIntervals.queryJobId, "mcp_bq_job_deadbeef01");
  assert.equal(metadata.provenance.abi.formula, "SUM(load_usd)/SUM(entries)");
  assert.equal(metadata.abi.cohorts.novice.abiUsd, 3);
  assert.deepEqual(metadata.expected, { csvRows: 1, opportunities: 50, folds: 13, calls: 15, small3bets: 17, jams: 5, other: 0 });
  assert.throws(() => execFileSync(process.execPath, [
    path.join(here, "build-resteal-rank-source-metadata.mjs"),
    `--cube=${cube}`,
    `--merge=${merge}`,
    `--rank-intervals=${rankIntervals}`,
    "--rank-query-job-id=fixture",
    `--abi=${abi}`,
    `--output=${path.join(temporary, "invalid-rank-source-metadata.json")}`,
    `--renderer-metadata=${rendererMetadata.join(",")}`,
    `--rendered-sql=${renderedSql.join(",")}`,
    `--source-csv=${sourceCsv.join(",")}`,
  ], { stdio: "pipe" }), "rank bridge provenance cannot use an invented execution id");
  assert.throws(() => execFileSync(process.execPath, [
    path.join(here, "build-resteal-rank-source-metadata.mjs"),
    `--cube=${cube}`,
    `--merge=${merge}`,
    `--rank-intervals=${rankIntervals}`,
    "--rank-query-job-id=mcp_bq_job_deadbeef01",
    `--abi=${abi}`,
    `--output=${path.join(here, "must-not-publish-private-source-metadata.json")}`,
    `--renderer-metadata=${rendererMetadata.join(",")}`,
    `--rendered-sql=${renderedSql.join(",")}`,
    `--source-csv=${sourceCsv.join(",")}`,
  ], { stdio: "pipe" }), "full source metadata with private evidence cannot be written into the public repository");

  const timeRendererMetadata = sourceRows.map((_, index) => path.join(temporary, `time-${index}.meta.json`));
  const timeWindows = [["2023-09-01", "2024-09-01"], ["2024-09-01", "2026-07-22"]];
  const timeEligibleUsers = [2, 3];
  for (let index = 0; index < timeRendererMetadata.length; index += 1) {
    fs.writeFileSync(timeRendererMetadata[index], `${JSON.stringify({
      templateSha256,
      sourceRows: 3,
      validIntervals: 3,
      excludedZeroLength: 0,
      window: timeWindows[index],
      shard: [1, 18],
      shardIntervals: 3,
      shardUsers: timeEligibleUsers[index],
      userShard: {
        index: 0,
        count: 1,
        eligibleUsers: timeEligibleUsers[index],
        firstUserId: 101,
        lastUserId: index ? 303 : 202,
        userIdsSha256: String(index + 3).repeat(64),
      },
    })}\n`);
  }
  const timeMerge = path.join(temporary, "time-merge.json");
  const timeMergeInputs = sourceCsv.map((file, index) => ({
    file: path.basename(file),
    rows: 1,
    sha256: sha256(fs.readFileSync(file)),
    sourceRef: `sync:${sha256(fs.readFileSync(renderedSql[index]))}`,
    executionMode: "sync",
    querySha256: sha256(fs.readFileSync(renderedSql[index])),
    renderer: JSON.parse(fs.readFileSync(timeRendererMetadata[index], "utf8")),
  }));
  fs.writeFileSync(timeMerge, `${JSON.stringify({
    schema: "ff-resteal-rank-cube-merge-v1",
    shardStrategy: "contiguous-time",
    inputs: timeMergeInputs,
    sourceRows: 2,
    mergedRows: 1,
    sha256: sha256(fs.readFileSync(cube)),
    totals: { opportunities: 50, folds: 13, calls: 15, small3bets: 17, jams: 5, other: 0 },
  })}\n`);
  const timeOutput = path.join(temporary, "time-source-metadata.json");
  execFileSync(process.execPath, [
    path.join(here, "build-resteal-rank-source-metadata.mjs"),
    `--cube=${cube}`,
    `--merge=${timeMerge}`,
    `--rank-intervals=${rankIntervals}`,
    "--rank-query-job-id=mcp_bq_job_deadbeef01",
    `--abi=${abi}`,
    `--output=${timeOutput}`,
    `--renderer-metadata=${timeRendererMetadata.join(",")}`,
    `--rendered-sql=${renderedSql.join(",")}`,
    `--source-csv=${sourceCsv.join(",")}`,
    `--failed-attempts=${failedAttempts}`,
  ], { stdio: "pipe" });
  const timeMetadata = JSON.parse(fs.readFileSync(timeOutput, "utf8"));
  assert.equal(timeMetadata.provenance.handCube.shardStrategy, "contiguous-time");
  assert.deepEqual(timeMetadata.provenance.handCube.shards.map((item) => item.name), ["time-00", "time-01"]);
  assert.deepEqual(timeMetadata.provenance.handCube.shards.map((item) => item.userShard.count), [1, 1]);
  assert.deepEqual(
    timeMetadata.provenance.handCube.shards.map((item) => item.userShard.eligibleUsers),
    timeEligibleUsers,
    "time-shard population is complete within each window and may grow across history",
  );
  console.log("resteal source metadata gate: ok");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
