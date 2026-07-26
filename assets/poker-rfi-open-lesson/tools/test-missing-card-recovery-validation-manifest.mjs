#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const renderer = path.join(here, "render-missing-cards-recovery-query.mjs");
const builder = path.join(here, "build-missing-card-recovery-validation-manifest.mjs");
const temporary = fs.mkdtempSync("/private/tmp/ff-rfi-missing-card-validation-manifest-test-");

try {
  const membership = write("membership.csv", [
    "cohort,user_id,current_rank,current_league,ffev_hands,ffev",
    "l3top,101,11,3,30000,9.1",
    "l3,101,11,3,30000,9.1",
    "l2,202,8,2,45000,7.2",
    "l1,303,3,1,80000,12.4",
    "",
  ].join("\n"));
  const query = path.join(temporary, "validation.sql");
  const metadata = path.join(temporary, "renderer.json");
  const render = spawnSync(process.execPath, [
    renderer,
    membership,
    "--mode=validation",
    "--cohorts=l3top",
    "--from=2026-07-01",
    "--to=2026-07-02",
    "--user-shard-index=0",
    "--user-shard-count=1",
    `--output=${query}`,
    `--metadata-output=${metadata}`,
  ], { encoding: "utf8" });
  assert.equal(render.status, 0, render.stderr || render.stdout);

  const result = write("validation.csv", validationCsv());
  const receipt = writeReceipt("receipt.json", result, 9);
  const output = path.join(temporary, "validation-manifest.json");
  const build = runBuilder({ result, metadata, query, receipt, output });
  assert.equal(build.status, 0, build.stderr || build.stdout);

  const manifestText = fs.readFileSync(output, "utf8");
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.schema, "ff-rfi-missing-card-recovery-validation-v1");
  assert.equal(manifest.mode, "validation");
  assert.deepEqual(manifest.window, {
    startInclusive: "2026-07-01T00:00:00Z",
    endExclusive: "2026-07-02T00:00:00Z",
    semantics: "half-open-utc",
  });
  assert.equal(manifest.source.structuredTable, "analytics.int_tracker_hand_joined");
  assert.equal(manifest.source.rawTable, "analytics.stg_hh_texts__hh_texts");
  assert.equal(manifest.source.join.type, "exact-key");
  assert.equal(manifest.source.recoveryPredicate, "latest structured_hand_class = ''");
  assert.deepEqual(manifest.source.parserNetworks, [
    "888Poker",
    "Chico",
    "GGNetwork",
    "PokerPlanets",
    "PokerStars",
    "PokerStars(FR-ES-PT)",
    "Winamax.fr",
    "WPN",
    "iPoker",
  ]);
  assert.match(manifest.provenance.rendererMetadataSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.provenance.renderedSqlSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.provenance.queryTemplateSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.provenance.resultSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.provenance.receiptSha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.provenance.resultRowCount, 9);
  assert.equal(manifest.provenance.receiptRowCount, 9);
  assert.equal(manifest.provenance.resultBytes, fs.statSync(result).size);
  assert.equal(manifest.provenance.receiptBytes, fs.statSync(result).size);
  assert.match(manifest.provenance.queryJobId, /^mcp_ch_job_[a-f0-9]{32}$/);
  assert.equal(Object.keys(manifest.networks).length, 9);
  assert.ok(manifest.networks.iPoker.trackerMissingRecovered > 0);
  for (const counters of Object.values(manifest.networks)) {
    assert.ok(counters.trackerKnownWithRaw > 0);
    assert.equal(counters.classFailures, 0);
    assert.equal(counters.classMatches, counters.trackerKnownWithRaw);
    assert.equal(counters.matchPctTrackerKnown, 100);
    assert.equal(counters.validationPassed, 1);
  }
  assert.equal(manifest.privacy.rawHandHistoriesPublished, false);
  assert.equal(manifest.privacy.personalIdentifiersPublished, false);
  for (const forbidden of [
    "Hero One",
    "Dealt to",
    "\"hh_text\":",
    "\"nickname\":",
    "\"check_user_id\":",
    "\"converted_hh_id\":",
  ]) {
    assert.ok(!manifestText.includes(forbidden), `validation manifest leaked ${forbidden}`);
  }

  const syncReceiptValue = {
    schema: "ff-rfi-card-parser-validation-receipt-v1",
    queryId: `sync:${sha256(fs.readFileSync(query))}`,
    queryTransport: "FunFarm ClickHouse MCP inline",
    sourceResponseFormat: "json",
    renderedSqlSha256: sha256(fs.readFileSync(query)),
    renderMetadataSha256: sha256(fs.readFileSync(metadata)),
    resultSha256: sha256(fs.readFileSync(result)),
    window: ["2026-07-01", "2026-07-02"],
    cohort: "l3top",
    cohortSelectedPlayers: 1,
    parserNetworks: [
      "888Poker",
      "Chico",
      "GGNetwork",
      "PokerPlanets",
      "PokerStars",
      "PokerStars(FR-ES-PT)",
      "Winamax.fr",
      "WPN",
      "iPoker",
    ],
    validationRows: 9,
    validationPassedRows: 9,
    classFailures: 0,
    readRows: 1000,
    readBytes: 100000,
    durationMs: 100,
  };
  const syncReceipt = write("sync-receipt.json", `${JSON.stringify(syncReceiptValue, null, 2)}\n`);
  const syncOutput = path.join(temporary, "sync-validation-manifest.json");
  const syncRun = runBuilder({ result, metadata, query, receipt: syncReceipt, output: syncOutput });
  assert.equal(syncRun.status, 0, syncRun.stderr || syncRun.stdout);
  const syncManifest = JSON.parse(fs.readFileSync(syncOutput, "utf8"));
  assert.equal(syncManifest.provenance.queryExecutionMode, "sync");
  assert.equal(syncManifest.provenance.receiptSchema, "ff-rfi-card-parser-validation-receipt-v1");
  assert.equal(syncManifest.provenance.queryJobId, syncReceiptValue.queryId);

  const borrowedSyncReceipt = write(
    "borrowed-sync-receipt.json",
    `${JSON.stringify({ ...syncReceiptValue, queryId: `sync:${"0".repeat(64)}` }, null, 2)}\n`,
  );
  const borrowedSyncRun = runBuilder({
    result,
    metadata,
    query,
    receipt: borrowedSyncReceipt,
    output: path.join(temporary, "borrowed-sync-manifest.json"),
  });
  assert.notEqual(borrowedSyncRun.status, 0);
  assert.match(borrowedSyncRun.stderr, /sync.*query id.*rendered SQL bytes/i);

  const failingResult = write(
    "validation-failure.csv",
    validationCsv().replace("GGNetwork,100,10,12,12,10,0,100,2,1", "GGNetwork,100,10,12,12,9,1,90,2,0"),
  );
  const failingReceipt = writeReceipt("validation-failure-receipt.json", failingResult, 9);
  const failureRun = runBuilder({
    result: failingResult,
    metadata,
    query,
    receipt: failingReceipt,
    output: path.join(temporary, "validation-failure-manifest.json"),
  });
  assert.notEqual(failureRun.status, 0);
  assert.match(failureRun.stderr, /GGNetwork.*class_failures.*zero/i);

  const missingNetworkResult = write(
    "validation-missing-network.csv",
    `${validationCsv().trim().split("\n").filter((line) => !line.startsWith("PokerStars,")).join("\n")}\n`,
  );
  const missingNetworkReceipt = writeReceipt("validation-missing-network-receipt.json", missingNetworkResult, 8);
  const missingNetworkRun = runBuilder({
    result: missingNetworkResult,
    metadata,
    query,
    receipt: missingNetworkReceipt,
    output: path.join(temporary, "validation-missing-network-manifest.json"),
  });
  assert.notEqual(missingNetworkRun.status, 0);
  assert.match(missingNetworkRun.stderr, /exactly.*nine parser networks/i);

  const noIpokerRecoveryResult = write(
    "validation-no-ipoker-recovery.csv",
    validationCsv().replace("iPoker,100,10,12,12,10,0,100,1,1", "iPoker,100,10,12,12,10,0,100,0,1"),
  );
  const noIpokerRecoveryReceipt = writeReceipt("validation-no-ipoker-recovery-receipt.json", noIpokerRecoveryResult, 9);
  const noIpokerRecoveryRun = runBuilder({
    result: noIpokerRecoveryResult,
    metadata,
    query,
    receipt: noIpokerRecoveryReceipt,
    output: path.join(temporary, "validation-no-ipoker-recovery-manifest.json"),
  });
  assert.notEqual(noIpokerRecoveryRun.status, 0);
  assert.match(noIpokerRecoveryRun.stderr, /iPoker.*tracker_missing_recovered.*positive/i);

  const badMetadataValue = JSON.parse(fs.readFileSync(metadata, "utf8"));
  badMetadataValue.mode = "recovery-counters";
  const badMetadata = write("bad-renderer.json", `${JSON.stringify(badMetadataValue, null, 2)}\n`);
  const badModeRun = runBuilder({
    result,
    metadata: badMetadata,
    query,
    receipt,
    output: path.join(temporary, "bad-mode-manifest.json"),
  });
  assert.notEqual(badModeRun.status, 0);
  assert.match(badModeRun.stderr, /renderer mode must be validation/i);

  const tamperedQuery = write("tampered.sql", `${fs.readFileSync(query, "utf8")}\nSELECT 1;\n`);
  const tamperedQueryRun = runBuilder({
    result,
    metadata,
    query: tamperedQuery,
    receipt,
    output: path.join(temporary, "tampered-query-manifest.json"),
  });
  assert.notEqual(tamperedQueryRun.status, 0);
  assert.match(tamperedQueryRun.stderr, /rendered SQL SHA-256 mismatch/i);

  const piiResult = write(
    "validation-pii.csv",
    `${validationCsv().trimEnd().split("\n").map((line, index) =>
      index === 0 ? `${line},nickname` : `${line},Hero One`
    ).join("\n")}\n`,
  );
  const piiReceipt = writeReceipt("validation-pii-receipt.json", piiResult, 9);
  const piiRun = runBuilder({
    result: piiResult,
    metadata,
    query,
    receipt: piiReceipt,
    output: path.join(temporary, "validation-pii-manifest.json"),
  });
  assert.notEqual(piiRun.status, 0);
  assert.match(piiRun.stderr, /unexpected validation result columns/i);

  const badReceipt = writeReceipt("bad-row-count-receipt.json", result, 3);
  const badReceiptRun = runBuilder({
    result,
    metadata,
    query,
    receipt: badReceipt,
    output: path.join(temporary, "bad-receipt-manifest.json"),
  });
  assert.notEqual(badReceiptRun.status, 0);
  assert.match(badReceiptRun.stderr, /receipt row count.*result row count/i);

  console.log("RFI missing-card recovery validation manifest gate: ok");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

function runBuilder({ result, metadata, query, receipt, output }) {
  return spawnSync(process.execPath, [
    builder,
    `--result=${result}`,
    `--renderer-metadata=${metadata}`,
    `--query=${query}`,
    `--receipt=${receipt}`,
    `--output=${output}`,
  ], { encoding: "utf8" });
}

function validationCsv() {
  return [
    [
      "network",
      "tracker_rows",
      "tracker_known_with_raw",
      "raw_hh_joined",
      "parser_success",
      "class_matches",
      "class_failures",
      "match_pct_tracker_known",
      "tracker_missing_recovered",
      "validation_passed",
    ].join(","),
    "888Poker,100,10,12,12,10,0,100,2,1",
    "Chico,100,10,12,12,10,0,100,2,1",
    "GGNetwork,100,10,12,12,10,0,100,2,1",
    "PokerPlanets,100,10,12,12,10,0,100,2,1",
    "PokerStars,100,10,12,12,10,0,100,2,1",
    "PokerStars(FR-ES-PT),100,10,12,12,10,0,100,2,1",
    "Winamax.fr,100,10,12,12,10,0,100,2,1",
    "WPN,100,10,12,12,10,0,100,2,1",
    "iPoker,100,10,12,12,10,0,100,1,1",
    "",
  ].join("\n");
}

function writeReceipt(name, resultPath, rowCount) {
  return write(name, `${JSON.stringify({
    status: "succeeded",
    job_id: `mcp_ch_job_${crypto.createHash("sha256").update(name).digest("hex").slice(0, 32)}`,
    row_count: rowCount,
    byte_size: fs.statSync(resultPath).size,
    finished_at: "2026-07-26T12:00:00Z",
  }, null, 2)}\n`);
}

function write(name, content) {
  const target = path.join(temporary, name);
  fs.writeFileSync(target, content, { mode: 0o600 });
  return target;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
