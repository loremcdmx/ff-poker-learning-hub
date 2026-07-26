#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const injector = path.join(here, "inject-full-history-field-data.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-postflop-inject-"));
const artifactPath = path.join(temp, "artifact.json");
const cbetPath = path.join(temp, "cbet-data.js");
const checkraisePath = path.join(temp, "checkraise-data.js");
const cbetHtmlPath = path.join(temp, "cbet.html");
const checkraiseHtmlPath = path.join(temp, "checkraise.html");
const postflopTemplateSha256 = createHash("sha256")
  .update(fs.readFileSync(path.resolve(here, "../research/full-history-postflop-field-cube.sql")))
  .digest("hex");
const rankTemplateSha256 = createHash("sha256")
  .update(fs.readFileSync(path.resolve(here, "../research/full-history-rank-intervals.sql")))
  .digest("hex");
const shardResultSha256 = "a".repeat(64);
const rows = [];
for (const cohort of ["league1", "league2", "league3", "novice"]) {
  rows.push({
    node: "cbet", cohort, position: "BTN", depthBand: "20-30",
    opportunities: 50, checksBack: 20, cbets: 30, facedRaises: 4,
    folds: 0, calls: 0, raises: 0, other: 0,
    firstHandAt: "2023-09-01 00:00:00", lastHandAt: "2026-07-21 23:59:59", publishable: true
  });
  rows.push({
    node: "bb_response", cohort, position: "BTN", depthBand: "20-30",
    opportunities: 60, checksBack: 0, cbets: 0, facedRaises: 0,
    folds: 20, calls: 30, raises: 10, other: 0,
    firstHandAt: "2023-09-01 00:00:00", lastHandAt: "2026-07-21 23:59:59", publishable: true
  });
}
const exactSource = {
  table: "analytics.int_tracker_hand_joined",
  rankBridge: "exact_rank_at_hand_half_open",
  window: { startInclusive: "2023-09-01", endExclusive: "2026-07-22" },
  latest: { key: "hand_player_id", order: "version_then_complete_projected_tuple" },
  cohortBands: { league1: [1, 5], league2: [6, 10], league3: [11, 14], novice: [15, 18] },
  minimumDenominator: 50,
  shardManifest: {
    name: "full-history-shard-manifest.json",
    sha256: "b".repeat(64),
    strategy: "six_month_time_windows_x_contiguous_user_partitions",
    continuous: true,
    userPartitionPolicy: "sorted_user_offsets_exact_once",
    windowPartitions: [{
      from: "2023-09-01",
      to: "2026-07-22",
      eligibleUsers: 100,
      partitionCount: 1
    }],
    shardCount: 1,
    sourceQueryTemplateSha256: postflopTemplateSha256,
    rankSource: {
      executionMode: "async",
      queryJobId: "mcp_bq_job_fixture",
      querySha256: rankTemplateSha256,
      sourceQueryTemplateSha256: rankTemplateSha256,
      resultSha256: "c".repeat(64),
      rowCount: 100,
      window: { startInclusive: "2023-09-01", endExclusive: "2026-07-22" }
    },
    executions: [{
      id: "fixture-1",
      executionMode: "async",
      queryJobId: "mcp_ch_job_fixture",
      querySha256: "d".repeat(64),
      resultSha256: shardResultSha256,
      rowCount: 8,
      window: { startInclusive: "2023-09-01", endExclusive: "2026-07-22" }
    }]
  },
  inputFiles: [{ name: "exact-shard.csv", sha256: shardResultSha256 }]
};
fs.writeFileSync(artifactPath, JSON.stringify({
  schemaVersion: 1,
  source: exactSource,
  totals: {},
  rows
}));
fs.writeFileSync(cbetPath, `window.FF_FLOP_CBET_HU_DATA = ${JSON.stringify({
  status: "methodology_only",
  meta: { period: "01.09.2023–22.07.2026", sampleNote: "exact field layer pending" },
  metrics: [{ sentinel: "preserve-me" }],
  boardExamples: { sentinel: true }
})};\n`);
fs.writeFileSync(checkraisePath, '(function(){ const FULL_HISTORY_FIELD = /* FF_FULL_HISTORY_FIELD_START */ null /* FF_FULL_HISTORY_FIELD_END */; window.out = FULL_HISTORY_FIELD; })();\n');
fs.writeFileSync(cbetHtmlPath, '<script src="assets/poker-flop-cbet-hu-lesson/data.js?v=abc123"></script>\n');
fs.writeFileSync(checkraiseHtmlPath, '<script src="assets/poker-flop-checkraise-lesson/data.js?v=def456"></script>\n');

const injectionArguments = [
  injector,
  artifactPath,
  `--cbet-data=${cbetPath}`,
  `--checkraise-data=${checkraisePath}`,
  `--cbet-html=${cbetHtmlPath}`,
  `--checkraise-html=${checkraiseHtmlPath}`
];
const result = spawnSync(process.execPath, injectionArguments, { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr);
const injectionReport = JSON.parse(result.stdout);
const cbetContext = { window: {} };
vm.runInNewContext(fs.readFileSync(cbetPath, "utf8"), cbetContext);
assert.equal(cbetContext.window.FF_FLOP_CBET_HU_DATA.fullHistory.rows.length, 8);
assert.equal(cbetContext.window.FF_FLOP_CBET_HU_DATA.status, "ready");
assert.equal(cbetContext.window.FF_FLOP_CBET_HU_DATA.fullHistory.meta.minimumDenominator, 50);
assert.equal(cbetContext.window.FF_FLOP_CBET_HU_DATA.fullHistory.meta.shardManifest.continuous, true);
assert.equal(cbetContext.window.FF_FLOP_CBET_HU_DATA.metrics[0].sentinel, "preserve-me");
assert.equal(cbetContext.window.FF_FLOP_CBET_HU_DATA.boardExamples.sentinel, true);
assert.equal(cbetContext.window.FF_FLOP_CBET_HU_DATA.meta.period, "01.09.2023–22.07.2026");
const checkraiseContext = { window: {} };
vm.runInNewContext(fs.readFileSync(checkraisePath, "utf8"), checkraiseContext);
assert.equal(checkraiseContext.window.out.rows.length, 8);
assert.equal(checkraiseContext.window.out.meta.rankTiming, "exact_as_of_hand");
assert.equal((fs.readFileSync(cbetPath, "utf8").match(/FF_FULL_HISTORY_FIELD_START/g) || []).length, 1);
const expectedCbetToken = createHash("sha256").update(fs.readFileSync(cbetPath)).digest("hex").slice(0, 12);
const expectedCheckraiseToken = createHash("sha256").update(fs.readFileSync(checkraisePath)).digest("hex").slice(0, 12);
assert.equal(injectionReport.cbetCacheToken, expectedCbetToken);
assert.equal(injectionReport.checkraiseCacheToken, expectedCheckraiseToken);
assert.match(fs.readFileSync(cbetHtmlPath, "utf8"), new RegExp(`data\\.js\\?v=${expectedCbetToken}`));
assert.match(fs.readFileSync(checkraiseHtmlPath, "utf8"), new RegExp(`data\\.js\\?v=${expectedCheckraiseToken}`));
assert.doesNotMatch(fs.readFileSync(cbetPath, "utf8"), /\/private\/|SELECT\s|WITH\s+rank_intervals/i, "public c-bet payload contains digests, not private paths or query text");
assert.doesNotMatch(fs.readFileSync(checkraisePath, "utf8"), /\/private\/|SELECT\s|WITH\s+rank_intervals/i, "public check-raise payload contains digests, not private paths or query text");

const repeated = spawnSync(process.execPath, injectionArguments, { encoding: "utf8" });
assert.equal(repeated.status, 0, repeated.stderr);
assert.equal((fs.readFileSync(cbetPath, "utf8").match(/FF_FULL_HISTORY_FIELD_START/g) || []).length, 1, "repeat injection replaces the marked layer");

const badArtifactPath = path.join(temp, "bad.json");
fs.writeFileSync(badArtifactPath, JSON.stringify({
  schemaVersion: 1,
  source: exactSource,
  rows: [{ ...rows[0], opportunities: 49, publishable: true }]
}));
const rejected = spawnSync(process.execPath, [
  injector,
  badArtifactPath,
  `--cbet-data=${cbetPath}`,
  `--checkraise-data=${checkraisePath}`,
  `--cbet-html=${cbetHtmlPath}`,
  `--checkraise-html=${checkraiseHtmlPath}`
], { encoding: "utf8" });
assert.notEqual(rejected.status, 0);
assert.match(rejected.stderr, /N=50 flag mismatch/);

console.log("full-history postflop data injection: ok");
