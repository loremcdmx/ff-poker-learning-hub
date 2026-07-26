#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const templateSha256 = crypto.createHash("sha256").update(fs.readFileSync(path.join(here, "q_ff_rfi_field_actions.sql"))).digest("hex");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "ff-rfi-merge-"));
const columns = [
  "window_start", "window_end", "table_filter", "table_size", "cohort", "cohort_selected_players",
  "position_group", "position_order", "position_code", "stack_bucket", "stack_order", "hand_class",
  "eligible_opportunities", "known_card_opportunities", "lookup_mismatch_opportunities",
  "first_observed_at", "last_observed_at",
  "opportunities", "raises_total", "regular_raise", "open_shove", "limp", "fold_other",
  "shove_allin_flag", "shove_effective_amount_only", "regular_three_bb_open",
  "normal_three_bb_as_shove", "non_exact_r_effective_allin",
  "raise_total_pct", "regular_raise_pct", "open_shove_pct", "limp_pct", "fold_pct",
  "below_exact_minimum", "low_sample",
];

try {
  const first = path.join(temporary, "first.csv");
  const second = path.join(temporary, "second.csv");
  const output = path.join(temporary, "merged.csv");
  const metadata = path.join(temporary, "metadata.json");
  const firstMeta = path.join(temporary, "first.meta.json");
  const secondMeta = path.join(temporary, "second.meta.json");
  const firstQuery = path.join(temporary, "first.sql");
  const secondQuery = path.join(temporary, "second.sql");
  const firstSql = renderedSql("2023-09-01", "2024-09-01");
  const secondSql = renderedSql("2024-09-01", "2025-09-01");
  fs.writeFileSync(first, csvRow("2023-09-01", "2024-08-31", [40, 10, 7, 3, 5, 25, 2, 1, 6, 0, 1], [25, 17.5, 7.5, 12.5, 62.5], [1, 1]));
  fs.writeFileSync(second, csvRow("2024-09-01", "2025-08-31", [60, 30, 20, 10, 10, 20, 7, 3, 12, 0, 2], [50, 33.333, 16.667, 16.667, 33.333], [0, 1]));
  fs.writeFileSync(firstQuery, firstSql);
  fs.writeFileSync(secondQuery, secondSql);
  fs.writeFileSync(firstMeta, rendererMeta("2023-09-01", "2024-09-01", firstSql));
  fs.writeFileSync(secondMeta, rendererMeta("2024-09-01", "2025-09-01", secondSql));
  const run = merge([first, second], [firstMeta, secondMeta], [firstQuery, secondQuery], output, metadata);
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const [header, row] = fs.readFileSync(output, "utf8").trim().split("\n");
  assert.equal(header, columns.join(","));
  const values = row.split(",");
  const merged = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  assert.equal(merged.window_start, "2023-09-01");
  assert.equal(merged.window_end, "2025-08-31");
  assert.deepEqual([merged.opportunities, merged.raises_total, merged.regular_raise, merged.open_shove, merged.limp, merged.fold_other], ["100", "40", "27", "13", "15", "45"]);
  assert.deepEqual([merged.shove_allin_flag, merged.shove_effective_amount_only, merged.regular_three_bb_open, merged.normal_three_bb_as_shove, merged.non_exact_r_effective_allin], ["9", "4", "18", "0", "3"]);
  assert.deepEqual([merged.raise_total_pct, merged.regular_raise_pct, merged.open_shove_pct, merged.limp_pct, merged.fold_pct], ["40", "27", "13", "15", "45"]);
  assert.equal(merged.below_exact_minimum, "0");
  assert.equal(merged.low_sample, "0");
  const report = JSON.parse(fs.readFileSync(metadata, "utf8"));
  assert.equal(report.schema, "ff-rfi-field-action-merge-v1");
  assert.equal(new Set(report.inputs.map((item) => item.queryJobId)).size, 2);
  assert.deepEqual(report.inputs.map((item) => item.executionMode), ["async", "async"]);
  assert.deepEqual(report.inputs.map((item) => item.sourceTable), ["analytics.int_tracker_hand_joined", "analytics.int_tracker_hand_joined"]);
  assert.deepEqual(report.inputs.map((item) => item.handClassMode), ["joined-holecards-str", "joined-holecards-str"]);
  assert.deepEqual(report.inputs.map((item) => item.holecardMappingSha256), [null, null]);
  assert.deepEqual(report.inputs.map((item) => item.queryFile), ["first.sql", "second.sql"]);
  assert.deepEqual(report.inputs.map((item) => item.querySha256), [sha256(firstSql), sha256(secondSql)]);
  assert.deepEqual(report.inputs.map((item) => item.renderedSqlSha256), [sha256(firstSql), sha256(secondSql)]);
  assert.deepEqual(report.inputs.map((item) => item.membershipCohortCounts), [{ l3top: 1, l3: 4, l2: 3, l1: 2 }, { l3top: 1, l3: 4, l2: 3, l1: 2 }]);
  assert.equal(report.shardStrategy, "contiguous-time");
  assert.equal(merged.cohort_selected_players, "10", "cohort membership is a snapshot constant, not an additive counter");
  assert.equal(report.merged.rows, 1);
  assert.equal(report.merged.totals.opportunities, 100);
  assert.deepEqual(report.merged.knownCards, { eligible: 104, known: 100, lookupMismatch: 0, pct: 96.153846 });
  assert.match(report.merged.sha256, /^[a-f0-9]{64}$/);

  const midpointFirst = path.join(temporary, "midpoint-first.csv");
  const midpointSecond = path.join(temporary, "midpoint-second.csv");
  fs.writeFileSync(midpointFirst, csvRow("2023-09-01", "2024-08-31", [512, 264, 264, 0, 0, 248, 0, 0, 14, 0, 0], [51.562, 51.562, 0, 0, 48.438], [0, 0]));
  fs.writeFileSync(midpointSecond, csvRow("2024-09-01", "2025-08-31", [512, 264, 264, 0, 0, 248, 0, 0, 14, 0, 0], [51.562, 51.562, 0, 0, 48.438], [0, 0]));
  const midpointMerge = merge(
    [midpointFirst, midpointSecond],
    [firstMeta, secondMeta],
    [firstQuery, secondQuery],
    path.join(temporary, "midpoint-merged.csv"),
    path.join(temporary, "midpoint-merged.json"),
  );
  assert.equal(midpointMerge.status, 0, midpointMerge.stderr || midpointMerge.stdout);

  const userOne = path.join(temporary, "user-one.csv");
  const userTwo = path.join(temporary, "user-two.csv");
  const userOneMeta = path.join(temporary, "user-one.meta.json");
  const userTwoMeta = path.join(temporary, "user-two.meta.json");
  const userOneQuery = path.join(temporary, "user-one.sql");
  const userTwoQuery = path.join(temporary, "user-two.sql");
  const userOneSql = renderedSql("user-0", "full-window");
  const userTwoSql = renderedSql("user-1", "full-window");
  fs.writeFileSync(userOne, csvRow("2023-09-01", "2026-07-21", [40, 10, 7, 3, 5, 25, 2, 1, 6, 0, 1], [25, 17.5, 7.5, 12.5, 62.5], [1, 1]));
  fs.writeFileSync(userTwo, csvRow("2023-09-01", "2026-07-21", [60, 30, 20, 10, 10, 20, 7, 3, 12, 0, 2], [50, 33.333, 16.667, 16.667, 33.333], [0, 1]));
  fs.writeFileSync(userOneQuery, userOneSql);
  fs.writeFileSync(userTwoQuery, userTwoSql);
  fs.writeFileSync(userOneMeta, userRendererMeta(0, "f".repeat(64), userOneSql));
  fs.writeFileSync(userTwoMeta, userRendererMeta(1, "0".repeat(64), userTwoSql));
  const userMergeOutput = path.join(temporary, "user-merged.csv");
  const userMergeMetadata = path.join(temporary, "user-merged.json");
  const userMerge = merge([userOne, userTwo], [userOneMeta, userTwoMeta], [userOneQuery, userTwoQuery], userMergeOutput, userMergeMetadata);
  assert.equal(userMerge.status, 0, userMerge.stderr || userMerge.stdout);
  assert.equal(JSON.parse(fs.readFileSync(userMergeMetadata, "utf8")).shardStrategy, "immutable-user-id");

  const badClassifier = path.join(temporary, "bad-classifier.csv");
  fs.writeFileSync(badClassifier, csvRow("2024-09-01", "2025-08-31", [60, 30, 20, 10, 10, 20, 7, 3, 12, 1, 2], [50, 33.333, 16.667, 16.667, 33.333], [0, 1]));
  const classifierFailure = merge([first, badClassifier], [firstMeta, secondMeta], [firstQuery, secondQuery], path.join(temporary, "bad.csv"), path.join(temporary, "bad.json"));
  assert.notEqual(classifierFailure.status, 0);
  assert.match(classifierFailure.stderr, /normal 2\.5–3\.5 BB open was classified as a shove/i);

  const gap = path.join(temporary, "gap.csv");
  const gapMeta = path.join(temporary, "gap.meta.json");
  const gapQuery = path.join(temporary, "gap.sql");
  const gapSql = renderedSql("2024-09-02", "2025-09-01");
  fs.writeFileSync(gap, csvRow("2024-09-02", "2025-08-31", [60, 30, 20, 10, 10, 20, 7, 3, 12, 0, 2], [50, 33.333, 16.667, 16.667, 33.333], [0, 1]));
  fs.writeFileSync(gapQuery, gapSql);
  fs.writeFileSync(gapMeta, rendererMeta("2024-09-02", "2025-09-01", gapSql));
  const gapFailure = merge([first, gap], [firstMeta, gapMeta], [firstQuery, gapQuery], path.join(temporary, "gap-merged.csv"), path.join(temporary, "gap.json"));
  assert.notEqual(gapFailure.status, 0);
  assert.match(gapFailure.stderr, /contiguous and non-overlapping/i);

  const missingQueryFailure = merge(
    [first],
    [firstMeta],
    [firstQuery],
    path.join(temporary, "missing-query.csv"),
    path.join(temporary, "missing-query.json"),
    { omitQueries: true },
  );
  assert.notEqual(missingQueryFailure.status, 0);
  assert.match(missingQueryFailure.stderr, /Expected 1 rendered SQL query files, got 0/);

  const tamperedQuery = path.join(temporary, "tampered.sql");
  fs.writeFileSync(tamperedQuery, `${firstSql}\nSELECT 1;\n`);
  const tamperedQueryFailure = merge(
    [first],
    [firstMeta],
    [tamperedQuery],
    path.join(temporary, "tampered-query.csv"),
    path.join(temporary, "tampered-query.json"),
  );
  assert.notEqual(tamperedQueryFailure.status, 0);
  assert.match(tamperedQueryFailure.stderr, /rendered SQL bytes do not match renderer metadata/);

  const staleTemplateMeta = path.join(temporary, "stale-template.meta.json");
  fs.writeFileSync(staleTemplateMeta, mutateMeta(firstMeta, (meta) => { meta.templateSha256 = "0".repeat(64); }));
  const staleTemplateFailure = merge(
    [first],
    [staleTemplateMeta],
    [firstQuery],
    path.join(temporary, "stale-template.csv"),
    path.join(temporary, "stale-template.json"),
  );
  assert.notEqual(staleTemplateFailure.status, 0);
  assert.match(staleTemplateFailure.stderr, /stale query template/);

  const fakeReceiptFailure = merge(
    [first],
    [firstMeta],
    [firstQuery],
    path.join(temporary, "fake-receipt.csv"),
    path.join(temporary, "fake-receipt.json"),
    { receiptMutator: (receipt) => ({ ...receipt, job_id: "mcp_ch_job_deadbeef" }) },
  );
  assert.notEqual(fakeReceiptFailure.status, 0);
  assert.match(fakeReceiptFailure.stderr, /invalid ClickHouse execution id/);

  const changedMembershipMeta = path.join(temporary, "changed-membership.meta.json");
  fs.writeFileSync(changedMembershipMeta, mutateMeta(secondMeta, (meta) => {
    meta.membershipCohortCounts = { l3top: 2, l3: 3, l2: 3, l1: 2 };
  }));
  const changedMembershipFailure = merge(
    [first, second],
    [firstMeta, changedMembershipMeta],
    [firstQuery, secondQuery],
    path.join(temporary, "changed-membership.csv"),
    path.join(temporary, "changed-membership.json"),
  );
  assert.notEqual(changedMembershipFailure.status, 0);
  assert.match(changedMembershipFailure.stderr, /identical membership metadata/);

  const sourceMismatchMeta = path.join(temporary, "source-mismatch.meta.json");
  fs.writeFileSync(sourceMismatchMeta, mutateMeta(firstMeta, (meta) => {
    meta.sourceTable = "analytics.bak20260720_int_tracker_hand_joined";
    meta.handClassMode = "verified-holecard-id-1-169";
    meta.holecardMappingSha256 = "a".repeat(64);
  }));
  const sourceMismatchFailure = merge(
    [first],
    [sourceMismatchMeta],
    [firstQuery],
    path.join(temporary, "source-mismatch.csv"),
    path.join(temporary, "source-mismatch.json"),
  );
  assert.notEqual(sourceMismatchFailure.status, 0);
  assert.match(sourceMismatchFailure.stderr, /renderer sourceTable does not match rendered SQL FROM/);

  const backupQuery = path.join(temporary, "backup.sql");
  const backupMeta = path.join(temporary, "backup.meta.json");
  const backupSql = renderedSql("2023-09-01", "2024-09-01", "analytics.bak20260720_int_tracker_hand_joined");
  fs.writeFileSync(backupQuery, backupSql);
  fs.writeFileSync(backupMeta, rendererMeta("2023-09-01", "2024-09-01", backupSql, {
    sourceTable: "analytics.bak20260720_int_tracker_hand_joined",
    handClassMode: "verified-holecard-id-1-169",
    holecardMappingSha256: "a".repeat(64),
  }));
  const backupOutput = path.join(temporary, "backup.csv");
  const backupMetadata = path.join(temporary, "backup.json");
  const backupRun = merge([first], [backupMeta], [backupQuery], backupOutput, backupMetadata);
  assert.equal(backupRun.status, 0, backupRun.stderr || backupRun.stdout);
  assert.deepEqual(
    Object.fromEntries(["sourceTable", "handClassMode", "holecardMappingSha256"].map((key) => [key, JSON.parse(fs.readFileSync(backupMetadata, "utf8")).inputs[0][key]])),
    {
      sourceTable: "analytics.bak20260720_int_tracker_hand_joined",
      handClassMode: "verified-holecard-id-1-169",
      holecardMappingSha256: "a".repeat(64),
    },
  );
  const missingBackupMappingMeta = path.join(temporary, "backup-missing-mapping.meta.json");
  fs.writeFileSync(missingBackupMappingMeta, mutateMeta(backupMeta, (meta) => { meta.holecardMappingSha256 = null; }));
  const missingBackupMappingFailure = merge(
    [first],
    [missingBackupMappingMeta],
    [backupQuery],
    path.join(temporary, "backup-missing-mapping.csv"),
    path.join(temporary, "backup-missing-mapping.json"),
  );
  assert.notEqual(missingBackupMappingFailure.status, 0);
  assert.match(missingBackupMappingFailure.stderr, /backup source requires a verified holecard mapping hash/);
  console.log("RFI field-action shard merge gate: ok");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

function csvRow(start, end, counts, rates, flags) {
  const row = [
    start, end, "cnt_players = 7", "7", "l1", "10",
    "EP", "1", "4", "70+", "1", "AA",
    String(counts[0] + 2), String(counts[0]), "0", `${start} 00:00:00`, `${end} 23:59:59`,
    ...counts, ...rates, ...flags,
  ];
  return `${columns.join(",")}\n${row.join(",")}\n`;
}

function merge(inputs, rendererMetadata, queries, output, metadata, options = {}) {
  const receipts = inputs.map((input, index) => {
    const receipt = path.join(temporary, `receipt-${path.basename(output)}-${index}.json`);
    const sourceReceipt = {
      status: "succeeded",
      job_id: `mcp_ch_job_${crypto.createHash("sha256").update(`${output}|${index}`).digest("hex").slice(0, 32)}`,
      row_count: 1,
    };
    fs.writeFileSync(receipt, JSON.stringify(options.receiptMutator?.(sourceReceipt, index) || sourceReceipt));
    return receipt;
  });
  const command = [
    path.join(here, "merge-field-action-shards.mjs"), ...inputs,
    `--output=${output}`,
    `--metadata=${metadata}`,
    `--renderer-metadata=${rendererMetadata.join(",")}`,
    `--receipts=${receipts.join(",")}`,
  ];
  if (!options.omitQueries) command.push(`--queries=${queries.join(",")}`);
  return spawnSync(process.execPath, command, { encoding: "utf8" });
}

function rendererMeta(start, endExclusive, sql, overrides = {}) {
  return `${JSON.stringify({
    templateSha256,
    renderedSqlSha256: sha256(sql),
    sourceTable: "analytics.int_tracker_hand_joined",
    handClassMode: "joined-holecards-str",
    holecardMappingSha256: null,
    membershipSha256: "c".repeat(64),
    membershipKeysSha256: "d".repeat(64),
    membershipCohortCounts: { l3top: 1, l3: 4, l2: 3, l1: 2 },
    sourceMembershipRows: 10,
    sourceUniqueUsers: 10,
    shardMembershipRows: 10,
    shardUsers: 10,
    window: [start, endExclusive],
    userShard: { index: 0, count: 1, firstUserId: 1, lastUserId: 10, userIdsSha256: "e".repeat(64) },
    ...overrides,
  })}\n`;
}

function userRendererMeta(index, userIdsSha256, sql) {
  return `${JSON.stringify({
    templateSha256,
    renderedSqlSha256: sha256(sql),
    sourceTable: "analytics.int_tracker_hand_joined",
    handClassMode: "joined-holecards-str",
    holecardMappingSha256: null,
    membershipSha256: "c".repeat(64),
    membershipKeysSha256: "d".repeat(64),
    membershipCohortCounts: { l3top: 1, l3: 4, l2: 3, l1: 2 },
    sourceMembershipRows: 10,
    sourceUniqueUsers: 10,
    shardMembershipRows: 5,
    shardUsers: 5,
    window: ["2023-09-01", "2026-07-22"],
    userShard: { index, count: 2, firstUserId: index ? 6 : 1, lastUserId: index ? 10 : 5, userIdsSha256 },
  })}\n`;
}

function renderedSql(windowStart, windowEndExclusive, sourceTable = "analytics.int_tracker_hand_joined") {
  const handClassExpression = sourceTable === "analytics.bak20260720_int_tracker_hand_joined"
    ? "toInt32(ifNull(h.holecard_id, 0))"
    : "ifNull(h.holecards_str, '')";
  return `WITH latest AS (
  SELECT ${handClassExpression} AS hand_class
  FROM ${sourceTable} AS h
  WHERE h.played_at >= toDateTime('${windowStart} 00:00:00')
    AND h.played_at < toDateTime('${windowEndExclusive} 00:00:00')
)
SELECT * FROM latest;
`;
}

function mutateMeta(metadataPath, mutator) {
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  mutator(metadata);
  return `${JSON.stringify(metadata)}\n`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
