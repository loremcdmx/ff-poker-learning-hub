#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const merger = path.join(here, "merge-full-history-field-shards.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-postflop-merge-"));
const header = "node,cohort,position,depth_band,opportunities,checks_back,cbets,faced_raises,folds,calls,raises,other,first_hand_at,last_hand_at";
const cohorts = ["league1", "league2", "league3", "novice"];
const files = cohorts.map((cohort, index) => {
  const file = path.join(temp, `${cohort}.csv`);
  fs.writeFileSync(file, [
    header,
    `cbet,${cohort},BTN,20-30,${49 + index},20,${29 + index},5,0,0,0,0,2023-09-01 00:00:00,2026-07-21 23:59:59`,
    `bb_response,${cohort},BTN,20-30,60,0,0,0,20,20,20,0,2023-09-01 00:00:00,2026-07-21 23:59:59`
  ].join("\n"));
  return file;
});
const windows = [
  { from: "2023-09-01", to: "2025-03-01" },
  { from: "2025-03-01", to: "2026-07-22" }
];

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function writeManifest(manifestFiles, name) {
  const manifestPath = path.join(temp, name);
  const shards = manifestFiles.map((file, index) => ({
    id: `fixture-${index}`,
    window: { startInclusive: windows[Math.floor(index / 2)].from, endExclusive: windows[Math.floor(index / 2)].to },
    rankShard: [1, 18],
    userShard: {
      index: index % 2,
      count: 2,
      startOffset: index % 2 === 0 ? 0 : 5,
      endOffsetExclusive: index % 2 === 0 ? 5 : 10,
      eligibleUsers: 10,
      selectedUsers: 5,
      selectedUserIdsSha256: String(index + 3).padStart(64, "0")
    },
    query: { name: `fixture-${index}.sql`, sha256: String(index + 1).padStart(64, "0") },
    execution: {
      name: `fixture-${index}.execution.json`,
      sha256: String(index + 2).padStart(64, "0"),
      executionMode: "async",
      queryJobId: `mcp_ch_job_fixture_${index}`,
      querySha256: String(index + 1).padStart(64, "0")
    },
    result: { name: path.basename(file), sha256: sha256(file), rowCount: 2 }
  }));
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    schemaVersion: 2,
    strategy: "six_month_time_windows_x_contiguous_user_partitions",
    sourceQueryTemplateSha256: "a".repeat(64),
    rankSource: {
      executionMode: "async",
      queryJobId: "mcp_bq_job_fixture",
      querySha256: "b".repeat(64),
      sourceQueryTemplateSha256: "b".repeat(64),
      resultSha256: "c".repeat(64),
      rowCount: 10,
      window: { startInclusive: "2023-09-01", endExclusive: "2026-07-22" }
    },
    coverage: {
      window: { startInclusive: "2023-09-01", endExclusive: "2026-07-22" },
      continuous: true,
      timeWindows: windows,
      rankShard: [1, 18],
      userPartitionPolicy: "sorted_user_offsets_exact_once",
      windowPartitions: windows.map((window) => ({
        ...window,
        eligibleUsers: 10,
        partitionCount: 2
      })),
      shardCount: shards.length
    },
    shards
  }, null, 2)}\n`);
  return manifestPath;
}

const manifest = writeManifest(files, "manifest.json");
const output = path.join(temp, "merged.json");
const merged = spawnSync(process.execPath, [merger, ...files, `--manifest=${manifest}`, `--output=${output}`], { encoding: "utf8" });
assert.equal(merged.status, 0, merged.stderr);
const artifact = JSON.parse(fs.readFileSync(output, "utf8"));
assert.equal(artifact.rows.length, 8);
assert.equal(Object.hasOwn(artifact.source, "artifactSha256"), false, "the artifact never embeds a misleading pre-self-hash");
assert.equal(artifact.source.shardManifest.continuous, true);
assert.equal(artifact.source.shardManifest.userPartitionPolicy, "sorted_user_offsets_exact_once");
assert.match(artifact.source.shardManifest.sha256, /^[a-f0-9]{64}$/);
assert.equal(artifact.rows.find((row) => row.cohort === "league1" && row.node === "cbet").publishable, false, "N=49 is hidden");
assert.equal(artifact.rows.find((row) => row.cohort === "league2" && row.node === "cbet").publishable, true, "N=50 is published");
assert.equal(artifact.totals.cbet.opportunities, 202);
assert.equal(artifact.totals.bbResponse.opportunities, 240);

const bad = path.join(temp, "bad.csv");
fs.writeFileSync(bad, [header, "cbet,league1,BTN,20-30,50,20,29,5,0,0,0,0,2023-09-01 00:00:00,2026-07-21 23:59:59"].join("\n"));
const badFiles = [bad, ...files.slice(1)];
const badManifest = writeManifest(badFiles, "bad-manifest.json");
const rejected = spawnSync(process.execPath, [merger, ...badFiles, `--manifest=${badManifest}`], { encoding: "utf8" });
assert.notEqual(rejected.status, 0);
assert.match(rejected.stderr, /do not sum to opportunities/);

const duplicated = spawnSync(process.execPath, [merger, ...files, files[0], `--manifest=${manifest}`], { encoding: "utf8" });
assert.notEqual(duplicated.status, 0);
assert.match(duplicated.stderr, /Manifest shard count does not match/);

const wrongRole = path.join(temp, "wrong-role.csv");
fs.writeFileSync(wrongRole, [header, "bb_response,league1,HJ,20-30,60,0,0,0,20,20,20,0,2023-09-01 00:00:00,2026-07-21 23:59:59"].join("\n"));
const wrongRoleFiles = [wrongRole, ...files.slice(1)];
const wrongRoleManifest = writeManifest(wrongRoleFiles, "wrong-role-manifest.json");
const wrongRoleResult = spawnSync(process.execPath, [merger, ...wrongRoleFiles, `--manifest=${wrongRoleManifest}`], { encoding: "utf8" });
assert.notEqual(wrongRoleResult.status, 0);
assert.match(wrongRoleResult.stderr, /Unexpected position HJ for bb_response/);

const noManifest = spawnSync(process.execPath, [merger, ...files], { encoding: "utf8" });
assert.notEqual(noManifest.status, 0);
assert.match(noManifest.stderr, /validated --manifest is required/);

const unclassified = path.join(temp, "unclassified.csv");
fs.writeFileSync(unclassified, [header, "bb_response,league1,BTN,20-30,60,0,0,0,19,20,20,1,2023-09-01 00:00:00,2026-07-21 23:59:59"].join("\n"));
const unclassifiedFiles = [unclassified, ...files.slice(1)];
const unclassifiedManifest = writeManifest(unclassifiedFiles, "unclassified-manifest.json");
const unclassifiedResult = spawnSync(process.execPath, [merger, ...unclassifiedFiles, `--manifest=${unclassifiedManifest}`], { encoding: "utf8" });
assert.notEqual(unclassifiedResult.status, 0);
assert.match(unclassifiedResult.stderr, /unclassified actions/);

console.log("full-history postflop shard merge: ok");
