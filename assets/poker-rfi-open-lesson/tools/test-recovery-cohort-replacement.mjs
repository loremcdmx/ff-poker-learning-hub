#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const renderStructured = path.join(here, "render-field-action-query.mjs");
const renderRecovery = path.join(here, "render-missing-cards-recovery-query.mjs");
const renderRaw = path.join(here, "render-raw-hh-field-action-query.mjs");
const buildValidation = path.join(here, "build-missing-card-recovery-validation-manifest.mjs");
const buildRawManifest = path.join(here, "build-raw-hh-aggregate-manifest.mjs");
const mergeShards = path.join(here, "merge-field-action-shards.mjs");
const mergeSources = path.join(here, "merge-field-action-sources.mjs");
const replaceCohort = path.join(here, "replace-field-action-recovery-cohort.mjs");
const buildData = path.join(here, "build-field-action-data.mjs");
const temporary = fs.mkdtempSync("/private/tmp/ff-rfi-recovery-replacement-test-");

const COLUMNS = [
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
const COHORTS = ["l3top", "l3", "l2", "l1"];
const COHORT_COUNTS = { l3top: 1, l3: 4, l2: 1, l1: 1 };
const POSITIONS = [
  ["EP", 1, 4, 60],
  ["MP", 2, 3, 59],
  ["HJ", 3, 2, 58],
  ["CO", 4, 1, 57],
  ["BTN", 5, 0, 56],
  ["SB", 6, 9, 55],
];
const STACKS = [
  ["70+", 1], ["30-70", 2], ["20-30", 3], ["15-20", 4], ["12-15", 5],
  ["10-12", 6], ["8-10", 7], ["6-8", 8], ["<6", 9],
];
const HANDS = canonicalHands();

try {
  const membership = write("membership.csv", [
    "cohort,user_id,current_rank,current_league,ffev_hands,ffev",
    "l3top,101,11,3,30000,10",
    "l3,101,11,3,30000,10",
    "l3,102,12,3,30000,9",
    "l3,103,13,3,30000,8",
    "l3,104,15,3,30000,7",
    "l2,201,8,2,30000,6",
    "l1,301,3,1,30000,5",
    "",
  ].join("\n"));
  const structuredInput = write("structured-input.csv", cubeCsv({ recovery: false }));
  const recoveryInput = write("recovery-input.csv", cubeCsv({ recovery: true }));

  const structuredQuery = path.join(temporary, "structured.sql");
  const structuredRenderer = path.join(temporary, "structured-renderer.json");
  const structuredRenderRun = run(renderStructured, [
    membership,
    "--from=2023-09-01",
    "--to=2026-07-26",
    `--output=${structuredQuery}`,
    `--metadata-output=${structuredRenderer}`,
  ]);
  assert.equal(structuredRenderRun.status, 0, structuredRenderRun.stderr || structuredRenderRun.stdout);
  const structuredReceipt = receiptFor("structured-receipt.json", structuredInput);
  const structuredAggregate = path.join(temporary, "structured-aggregate.csv");
  const structuredMetadata = path.join(temporary, "structured-merge.json");
  const structuredMergeRun = merge({
    input: structuredInput,
    renderer: structuredRenderer,
    query: structuredQuery,
    receipt: structuredReceipt,
    output: structuredAggregate,
    metadata: structuredMetadata,
  });
  assert.equal(structuredMergeRun.status, 0, structuredMergeRun.stderr || structuredMergeRun.stdout);

  const validationQuery = path.join(temporary, "validation.sql");
  const validationRenderer = path.join(temporary, "validation-renderer.json");
  const validationRenderRun = run(renderRecovery, [
    membership,
    "--mode=validation",
    "--cohorts=l3top",
    "--from=2026-07-01",
    "--to=2026-07-02",
    `--output=${validationQuery}`,
    `--metadata-output=${validationRenderer}`,
  ]);
  assert.equal(validationRenderRun.status, 0, validationRenderRun.stderr || validationRenderRun.stdout);
  const validationResult = write("validation.csv", [
    "network,tracker_rows,tracker_known_with_raw,raw_hh_joined,parser_success,class_matches,class_failures,match_pct_tracker_known,tracker_missing_recovered,validation_passed",
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
  ].join("\n"));
  const validationReceipt = validationSyncReceipt(
    "validation-receipt.json",
    validationQuery,
    validationRenderer,
    validationResult,
  );
  const validationManifest = path.join(temporary, "validation-manifest.json");
  const validationBuildRun = run(buildValidation, [
    `--result=${validationResult}`,
    `--renderer-metadata=${validationRenderer}`,
    `--query=${validationQuery}`,
    `--receipt=${validationReceipt}`,
    `--output=${validationManifest}`,
  ]);
  assert.equal(validationBuildRun.status, 0, validationBuildRun.stderr || validationBuildRun.stdout);

  const recoveryQuery = path.join(temporary, "recovery.sql");
  const recoveryRenderer = path.join(temporary, "recovery-renderer.json");
  const recoveryRenderRun = run(renderRecovery, [
    membership,
    "--mode=full-cube",
    "--cohorts=l3top",
    "--from=2023-09-01",
    "--to=2026-07-26",
    `--output=${recoveryQuery}`,
    `--metadata-output=${recoveryRenderer}`,
  ]);
  assert.equal(recoveryRenderRun.status, 0, recoveryRenderRun.stderr || recoveryRenderRun.stdout);
  const recoveryReceipt = receiptFor("recovery-receipt.json", recoveryInput);
  const recoveryAggregate = path.join(temporary, "recovery-aggregate.csv");
  const recoveryMetadata = path.join(temporary, "recovery-merge.json");
  const recoveryMergeRun = merge({
    input: recoveryInput,
    renderer: recoveryRenderer,
    query: recoveryQuery,
    receipt: recoveryReceipt,
    validation: validationManifest,
    output: recoveryAggregate,
    metadata: recoveryMetadata,
  });
  assert.equal(recoveryMergeRun.status, 0, recoveryMergeRun.stderr || recoveryMergeRun.stdout);
  const recoveryMerge = JSON.parse(fs.readFileSync(recoveryMetadata, "utf8"));
  assert.equal(recoveryMerge.sourceKind, "missing-card-recovery-full-cube");
  assert.equal(recoveryMerge.merged.rows, 9_126);
  assert.equal(recoveryMerge.merged.cube.stateCount, 54);
  assert.equal(recoveryMerge.inputs[0].validation.schema, "ff-rfi-missing-card-recovery-validation-v1");

  const finalAggregate = path.join(temporary, "final.csv");
  const finalMetadata = path.join(temporary, "final.json");
  const replaceRun = replacement({
    structuredAggregate,
    structuredMetadata,
    recoveryAggregate,
    recoveryMetadata,
    membership,
    output: finalAggregate,
    metadata: finalMetadata,
  });
  assert.equal(replaceRun.status, 0, replaceRun.stderr || replaceRun.stdout);
  const replacementMetadata = JSON.parse(fs.readFileSync(finalMetadata, "utf8"));
  assert.equal(replacementMetadata.schema, "ff-rfi-field-action-cohort-replacement-v1");
  assert.equal(replacementMetadata.strategy, "exact-same-window-l3top-replacement-with-l3-delta");
  assert.equal(replacementMetadata.membership.subsetProof.l3topIsSubsetOfL3, true);
  assert.equal(replacementMetadata.merged.rows, 36_504);
  assert.equal(replacementMetadata.merged.cube.stateCount, 216);
  assert.equal(replacementMetadata.replacement.l3Delta.exactCells, 9_126);
  assert.equal(replacementMetadata.replacement.l3Delta.stateCount, 54);
  assert.equal(replacementMetadata.replacement.l3Delta.counters.opportunities, 9_126);
  assert.equal(replacementMetadata.replacement.l3Delta.counters.fold_other, 9_126);
  assert.equal(replacementMetadata.replacement.l3Delta.counters.raises_total, 0);
  assert.equal(replacementMetadata.replacement.preserved.l2.exact, true);
  assert.equal(replacementMetadata.replacement.preserved.l1.exact, true);

  const finalRows = parseCsv(fs.readFileSync(finalAggregate, "utf8"));
  assert.equal(finalRows.length, 36_504);
  const structuredRows = parseCsv(fs.readFileSync(structuredAggregate, "utf8"));
  const recoveryRows = parseCsv(fs.readFileSync(recoveryAggregate, "utf8"));
  const cell = (rows, cohort) => rows.find((row) => (
    row.cohort === cohort &&
    row.position_group === "EP" &&
    row.stack_bucket === "70+" &&
    row.hand_class === "AA"
  ));
  assert.equal(cell(finalRows, "l3top").opportunities, cell(recoveryRows, "l3top").opportunities);
  assert.equal(
    Number(cell(finalRows, "l3").opportunities),
    Number(cell(structuredRows, "l3").opportunities) + 1,
  );
  assert.deepEqual(cell(finalRows, "l2"), cell(structuredRows, "l2"));
  assert.deepEqual(cell(finalRows, "l1"), cell(structuredRows, "l1"));

  const membershipReceipt = writeJson("membership-receipt.json", {
    status: "succeeded",
    job_id: `mcp_bq_job_${"b".repeat(32)}`,
    row_count: 7,
    byte_size: fs.statSync(membership).size,
    finished_at: "2026-07-26T12:00:00Z",
  });
  const builtData = path.join(temporary, "field-action-data.js");
  const diagnostics = path.join(temporary, "field-action-coverage.json");
  const publishRun = run(buildData, [
    `--source=${finalAggregate}`,
    `--action-metadata=${finalMetadata}`,
    `--membership=${membership}`,
    `--membership-receipt=${membershipReceipt}`,
    `--out=${builtData}`,
    `--diagnostics=${diagnostics}`,
  ]);
  assert.equal(publishRun.status, 0, publishRun.stderr || publishRun.stdout);
  const publishedText = fs.readFileSync(builtData, "utf8");
  assert.match(publishedText, /exact-same-window-l3top-replacement-with-l3-delta/);
  assert.match(publishedText, /ff-rfi-missing-card-recovery-validation-v1/);
  const publishedDiagnostics = JSON.parse(fs.readFileSync(diagnostics, "utf8"));
  assert.equal(publishedDiagnostics.completeStates, 30);
  assert.equal(publishedDiagnostics.passingStates, 30);
  assert.equal(publishedDiagnostics.replacement.l3Delta.appliedExactly, true);

  const historicalAggregate = write("historical-aggregate.csv", cubeCsv({
    recovery: false,
    historical: true,
    start: "2020-01-01",
    end: "2023-08-31",
  }));
  const historicalQuery = path.join(temporary, "historical-query.sql");
  const historicalRenderer = path.join(temporary, "historical-renderer.json");
  const historicalRenderRun = run(renderRaw, [
    membership,
    "--from=2020-01-01",
    "--to=2023-09-01",
    `--output=${historicalQuery}`,
    `--metadata-output=${historicalRenderer}`,
  ]);
  assert.equal(historicalRenderRun.status, 0, historicalRenderRun.stderr || historicalRenderRun.stdout);
  const historicalRawExport = write("historical-private-export.csv", [
    "check_user_id,network,converted_hh_id,nickname,hh_at,hh_text",
    '101,PokerStars,one,Hero One,2020-01-01 00:00:00,"PokerStars Hand #1',
    'Dealt to Hero One [As Kh]"',
    '201,iPoker,two,Hero Two,2021-01-01 00:00:00,"<game gamecode=""2""><player name=""Hero Two"" /></game>"',
    '301,GGNetwork,three,Hero Three,2022-01-01 00:00:00,"PokerStars Hand #3"',
    "",
  ].join("\n"));
  const historicalReceipt = writeJson("historical-receipt.json", {
    status: "succeeded",
    job_id: `mcp_ch_job_${"d".repeat(32)}`,
    row_count: 3,
    byte_size: fs.statSync(historicalRawExport).size,
    finished_at: "2026-07-26T12:00:00Z",
  });
  const historicalValidation = writeJson("historical-validation.json", passingRawValidation());
  const historicalAggregator = write(
    "fixture-historical-aggregator.mjs",
    "export function aggregateRawRfiHands() { return []; }\n",
  );
  const historicalManifest = path.join(temporary, "historical-manifest.json");
  const historicalBuildRun = rawManifest({
    aggregate: historicalAggregate,
    rawExport: historicalRawExport,
    query: historicalQuery,
    receipt: historicalReceipt,
    validation: historicalValidation,
    membership,
    aggregator: historicalAggregator,
    start: "2020-01-01",
    end: "2023-09-01",
    output: historicalManifest,
  });
  assert.equal(historicalBuildRun.status, 0, historicalBuildRun.stderr || historicalBuildRun.stdout);

  const composedAggregate = path.join(temporary, "composed.csv");
  const composedMetadata = path.join(temporary, "composed.json");
  const compositionRun = sourceComposition({
    historicalAggregate,
    historicalManifest,
    currentAggregate: finalAggregate,
    currentManifest: finalMetadata,
    output: composedAggregate,
    metadata: composedMetadata,
  });
  assert.equal(compositionRun.status, 0, compositionRun.stderr || compositionRun.stdout);
  const compositionMetadata = JSON.parse(fs.readFileSync(composedMetadata, "utf8"));
  assert.equal(compositionMetadata.schema, "ff-rfi-field-action-composition-v1");
  assert.equal(
    compositionMetadata.strategy,
    "adjacent-historical-raw-plus-current-recovery-adjusted",
  );
  assert.deepEqual(compositionMetadata.window, {
    startInclusive: "2020-01-01T00:00:00Z",
    endExclusive: "2026-07-26T00:00:00Z",
    semantics: "half-open-utc",
  });
  assert.equal(compositionMetadata.noOverlap.doubleCountPrevented, true);
  assert.equal(compositionMetadata.merged.rowCount, 36_504);
  assert.equal(compositionMetadata.merged.cube.stateCount, 216);
  assert.equal(compositionMetadata.merged.cube.handClassesPerState, 169);
  assert.equal(
    compositionMetadata.merged.componentReconciliation.finalTotals.opportunities,
    compositionMetadata.merged.componentReconciliation.historicalTotals.opportunities +
      compositionMetadata.merged.componentReconciliation.currentTotals.opportunities,
  );
  assert.match(
    compositionMetadata.historicalManifest.source.execution.receiptSha256,
    /^[a-f0-9]{64}$/,
  );
  assert.equal(
    compositionMetadata.sources[0].resultSha256,
    compositionMetadata.historicalManifest.source.export.sha256,
  );
  assert.match(
    compositionMetadata.currentManifest.sourceMerges.recovery.inputs[0].validation.resultSha256,
    /^[a-f0-9]{64}$/,
  );

  const composedRows = parseCsv(fs.readFileSync(composedAggregate, "utf8"));
  assert.equal(composedRows.length, 36_504);
  assert.equal(
    Number(cell(composedRows, "l3").opportunities),
    Number(cell(finalRows, "l3").opportunities) +
      Number(cell(parseCsv(fs.readFileSync(historicalAggregate, "utf8")), "l3").opportunities),
  );
  const composedData = path.join(temporary, "field-action-data-composed.js");
  const composedDiagnostics = path.join(temporary, "field-action-composed-coverage.json");
  const composedPublishRun = run(buildData, [
    `--source=${composedAggregate}`,
    `--action-metadata=${composedMetadata}`,
    `--membership=${membership}`,
    `--membership-receipt=${membershipReceipt}`,
    `--out=${composedData}`,
    `--diagnostics=${composedDiagnostics}`,
  ]);
  assert.equal(
    composedPublishRun.status,
    0,
    composedPublishRun.stderr || composedPublishRun.stdout,
  );
  const composedPublishedText = fs.readFileSync(composedData, "utf8");
  assert.match(composedPublishedText, /ff-rfi-field-action-composition-v1/);
  assert.ok(composedPublishedText.includes(
    compositionMetadata.historicalManifest.validation.reportSha256,
  ));
  assert.ok(composedPublishedText.includes(
    compositionMetadata.currentManifest.sourceMerges.recovery.inputs[0].validation.resultSha256,
  ));
  const composedPublishedDiagnostics = JSON.parse(fs.readFileSync(composedDiagnostics, "utf8"));
  assert.equal(composedPublishedDiagnostics.composition.noOverlap.doubleCountPrevented, true);
  assert.equal(composedPublishedDiagnostics.replacement.l3Delta.appliedExactly, true);

  const membershipDriftManifest = mutateJson(
    "historical-membership-drift.json",
    historicalManifest,
    (value) => {
      value.membership.sha256 = "0".repeat(64);
    },
  );
  const membershipDriftRun = sourceComposition({
    historicalAggregate,
    historicalManifest: membershipDriftManifest,
    currentAggregate: finalAggregate,
    currentManifest: finalMetadata,
    output: path.join(temporary, "membership-drift-composed.csv"),
    metadata: path.join(temporary, "membership-drift-composed.json"),
  });
  assert.notEqual(membershipDriftRun.status, 0);
  assert.match(membershipDriftRun.stderr, /membership.*identical/i);

  const missingHistoricalNetworkManifest = mutateJson(
    "historical-missing-network.json",
    historicalManifest,
    (value) => {
      delete value.validation.networks.WPN;
    },
  );
  const missingHistoricalNetworkRun = sourceComposition({
    historicalAggregate,
    historicalManifest: missingHistoricalNetworkManifest,
    currentAggregate: finalAggregate,
    currentManifest: finalMetadata,
    output: path.join(temporary, "missing-network-composed.csv"),
    metadata: path.join(temporary, "missing-network-composed.json"),
  });
  assert.notEqual(missingHistoricalNetworkRun.status, 0);
  assert.match(missingHistoricalNetworkRun.stderr, /seven approved historical parser networks/i);

  const missingCurrentReceiptManifest = mutateJson(
    "current-missing-receipt.json",
    finalMetadata,
    (value) => {
      value.sourceMerges.structured.inputs[0].receiptSha256 = null;
      value.inputs[0].receiptSha256 = null;
    },
  );
  const missingCurrentReceiptRun = sourceComposition({
    historicalAggregate,
    historicalManifest,
    currentAggregate: finalAggregate,
    currentManifest: missingCurrentReceiptManifest,
    output: path.join(temporary, "missing-current-receipt-composed.csv"),
    metadata: path.join(temporary, "missing-current-receipt-composed.json"),
  });
  assert.notEqual(missingCurrentReceiptRun.status, 0);
  assert.match(missingCurrentReceiptRun.stderr, /execution receipt SHA-256 is invalid/i);

  const gapHistoricalAggregate = write("historical-gap-aggregate.csv", cubeCsv({
    recovery: false,
    historical: true,
    start: "2020-01-01",
    end: "2023-08-30",
  }));
  const gapHistoricalQuery = path.join(temporary, "historical-gap-query.sql");
  const gapHistoricalRenderer = path.join(temporary, "historical-gap-renderer.json");
  const gapHistoricalRenderRun = run(renderRaw, [
    membership,
    "--from=2020-01-01",
    "--to=2023-08-31",
    `--output=${gapHistoricalQuery}`,
    `--metadata-output=${gapHistoricalRenderer}`,
  ]);
  assert.equal(
    gapHistoricalRenderRun.status,
    0,
    gapHistoricalRenderRun.stderr || gapHistoricalRenderRun.stdout,
  );
  const gapHistoricalManifest = path.join(temporary, "historical-gap-manifest.json");
  const gapHistoricalBuildRun = rawManifest({
    aggregate: gapHistoricalAggregate,
    rawExport: historicalRawExport,
    query: gapHistoricalQuery,
    receipt: historicalReceipt,
    validation: historicalValidation,
    membership,
    aggregator: historicalAggregator,
    start: "2020-01-01",
    end: "2023-08-31",
    output: gapHistoricalManifest,
  });
  assert.equal(
    gapHistoricalBuildRun.status,
    0,
    gapHistoricalBuildRun.stderr || gapHistoricalBuildRun.stdout,
  );
  const gapCompositionRun = sourceComposition({
    historicalAggregate: gapHistoricalAggregate,
    historicalManifest: gapHistoricalManifest,
    currentAggregate: finalAggregate,
    currentManifest: finalMetadata,
    output: path.join(temporary, "gap-composed.csv"),
    metadata: path.join(temporary, "gap-composed.json"),
  });
  assert.notEqual(gapCompositionRun.status, 0);
  assert.match(gapCompositionRun.stderr, /strictly adjacent/i);

  const overlapHistoricalAggregate = write("historical-overlap-aggregate.csv", cubeCsv({
    recovery: false,
    historical: true,
    start: "2020-01-01",
    end: "2023-09-01",
  }));
  const overlapHistoricalQuery = path.join(temporary, "historical-overlap-query.sql");
  const overlapHistoricalRenderer = path.join(temporary, "historical-overlap-renderer.json");
  const overlapHistoricalRenderRun = run(renderRaw, [
    membership,
    "--from=2020-01-01",
    "--to=2023-09-02",
    `--output=${overlapHistoricalQuery}`,
    `--metadata-output=${overlapHistoricalRenderer}`,
  ]);
  assert.equal(
    overlapHistoricalRenderRun.status,
    0,
    overlapHistoricalRenderRun.stderr || overlapHistoricalRenderRun.stdout,
  );
  const overlapHistoricalManifest = path.join(temporary, "historical-overlap-manifest.json");
  const overlapHistoricalBuildRun = rawManifest({
    aggregate: overlapHistoricalAggregate,
    rawExport: historicalRawExport,
    query: overlapHistoricalQuery,
    receipt: historicalReceipt,
    validation: historicalValidation,
    membership,
    aggregator: historicalAggregator,
    start: "2020-01-01",
    end: "2023-09-02",
    output: overlapHistoricalManifest,
  });
  assert.equal(
    overlapHistoricalBuildRun.status,
    0,
    overlapHistoricalBuildRun.stderr || overlapHistoricalBuildRun.stdout,
  );
  const overlapCompositionRun = sourceComposition({
    historicalAggregate: overlapHistoricalAggregate,
    historicalManifest: overlapHistoricalManifest,
    currentAggregate: finalAggregate,
    currentManifest: finalMetadata,
    output: path.join(temporary, "overlap-composed.csv"),
    metadata: path.join(temporary, "overlap-composed.json"),
  });
  assert.notEqual(overlapCompositionRun.status, 0);
  assert.match(overlapCompositionRun.stderr, /strictly adjacent/i);

  const partialHistoricalRows = parseCsv(fs.readFileSync(historicalAggregate, "utf8"));
  const removedHistorical = partialHistoricalRows.find((row) => (
    row.cohort === "l3top" &&
    row.position_group === "EP" &&
    row.stack_bucket === "70+" &&
    row.hand_class === "AA"
  ));
  const partialHistorical = partialHistoricalRows.filter((row) => row !== removedHistorical);
  for (const row of partialHistorical.filter((candidate) => (
    candidate.cohort === "l3top" &&
    candidate.position_group === "EP" &&
    candidate.stack_bucket === "70+"
  ))) {
    row.eligible_opportunities = String(Number(row.opportunities) * 168);
    row.known_card_opportunities = String(Number(row.opportunities) * 168);
  }
  const partialHistoricalAggregate = write(
    "historical-partial-aggregate.csv",
    serializeCsv(partialHistorical),
  );
  const partialHistoricalManifest = path.join(temporary, "historical-partial-manifest.json");
  const partialHistoricalBuildRun = rawManifest({
    aggregate: partialHistoricalAggregate,
    rawExport: historicalRawExport,
    query: historicalQuery,
    receipt: historicalReceipt,
    validation: historicalValidation,
    membership,
    aggregator: historicalAggregator,
    start: "2020-01-01",
    end: "2023-09-01",
    output: partialHistoricalManifest,
  });
  assert.equal(
    partialHistoricalBuildRun.status,
    0,
    partialHistoricalBuildRun.stderr || partialHistoricalBuildRun.stdout,
  );
  const partialCompositionRun = sourceComposition({
    historicalAggregate: partialHistoricalAggregate,
    historicalManifest: partialHistoricalManifest,
    currentAggregate: finalAggregate,
    currentManifest: finalMetadata,
    output: path.join(temporary, "partial-composed.csv"),
    metadata: path.join(temporary, "partial-composed.json"),
  });
  assert.notEqual(partialCompositionRun.status, 0);
  assert.match(partialCompositionRun.stderr, /historical raw aggregate must contain exactly 36,504 rows/i);

  const tamperedCompositionMetadata = mutateJson(
    "composed-tampered-receipt.json",
    composedMetadata,
    (value) => {
      value.historicalManifest.source.execution.receiptSha256 = "f".repeat(64);
    },
  );
  const tamperedCompositionPublishRun = run(buildData, [
    `--source=${composedAggregate}`,
    `--action-metadata=${tamperedCompositionMetadata}`,
    `--membership=${membership}`,
    `--membership-receipt=${membershipReceipt}`,
    `--out=${path.join(temporary, "tampered-composition-data.js")}`,
  ]);
  assert.notEqual(tamperedCompositionPublishRun.status, 0);
  assert.match(
    tamperedCompositionPublishRun.stderr,
    /embedded source manifest hash mismatch/i,
  );

  const noValidationRun = merge({
    input: recoveryInput,
    renderer: recoveryRenderer,
    query: recoveryQuery,
    receipt: recoveryReceipt,
    output: path.join(temporary, "no-validation.csv"),
    metadata: path.join(temporary, "no-validation.json"),
  });
  assert.notEqual(noValidationRun.status, 0);
  assert.match(noValidationRun.stderr, /requires a validation manifest/i);

  const substitutedJoinRenderer = mutateJson(
    "recovery-substituted-join-renderer.json",
    recoveryRenderer,
    (value) => {
      value.rawJoin.rawKey[2] = "toString(hh_id)";
    },
  );
  const substitutedJoinRun = merge({
    input: recoveryInput,
    renderer: substitutedJoinRenderer,
    query: recoveryQuery,
    receipt: recoveryReceipt,
    validation: validationManifest,
    output: path.join(temporary, "substituted-join.csv"),
    metadata: path.join(temporary, "substituted-join.json"),
  });
  assert.notEqual(substitutedJoinRun.status, 0);
  assert.match(substitutedJoinRun.stderr, /exact-key join mismatch/i);

  const driftValidation = mutateJson("validation-shard-drift.json", validationManifest, (value) => {
    value.membership.userShard.userIdsSha256 = "0".repeat(64);
  });
  const validationDriftRun = merge({
    input: recoveryInput,
    renderer: recoveryRenderer,
    query: recoveryQuery,
    receipt: recoveryReceipt,
    validation: driftValidation,
    output: path.join(temporary, "validation-drift.csv"),
    metadata: path.join(temporary, "validation-drift.json"),
  });
  assert.notEqual(validationDriftRun.status, 0);
  assert.match(validationDriftRun.stderr, /validation membership.*shard identity mismatch/i);

  const incompleteRows = parseCsv(fs.readFileSync(recoveryInput, "utf8"));
  const incomplete = incompleteRows.filter((row) => !(
    row.position_group === "EP" && row.stack_bucket === "70+" && row.hand_class === "AA"
  ));
  for (const row of incomplete.filter((candidate) => (
    candidate.position_group === "EP" && candidate.stack_bucket === "70+"
  ))) {
    row.known_card_opportunities = String(61 * 168);
  }
  const incompleteRecovery = write("recovery-incomplete.csv", serializeCsv(incomplete));
  const incompleteReceipt = receiptFor("recovery-incomplete-receipt.json", incompleteRecovery);
  const incompleteRun = merge({
    input: incompleteRecovery,
    renderer: recoveryRenderer,
    query: recoveryQuery,
    receipt: incompleteReceipt,
    validation: validationManifest,
    output: path.join(temporary, "incomplete-merged.csv"),
    metadata: path.join(temporary, "incomplete-merged.json"),
  });
  assert.notEqual(incompleteRun.status, 0);
  assert.match(incompleteRun.stderr, /does not contain 169 hand classes/i);

  const mismatchRows = parseCsv(fs.readFileSync(recoveryInput, "utf8"));
  const mismatchCell = cell(mismatchRows, "l3top");
  mismatchCell.opportunities = "62";
  mismatchCell.fold_other = "62";
  mismatchCell.fold_pct = "100";
  const coverageMismatch = write("recovery-coverage-mismatch.csv", serializeCsv(mismatchRows));
  const mismatchReceipt = receiptFor("recovery-coverage-mismatch-receipt.json", coverageMismatch);
  const coverageMismatchRun = merge({
    input: coverageMismatch,
    renderer: recoveryRenderer,
    query: recoveryQuery,
    receipt: mismatchReceipt,
    validation: validationManifest,
    output: path.join(temporary, "coverage-mismatch-merged.csv"),
    metadata: path.join(temporary, "coverage-mismatch-merged.json"),
  });
  assert.notEqual(coverageMismatchRun.status, 0);
  assert.match(coverageMismatchRun.stderr, /do not reconcile to known-card coverage/i);

  const negativeRecoveryRows = parseCsv(fs.readFileSync(recoveryAggregate, "utf8"));
  for (const row of negativeRecoveryRows.filter((candidate) => (
    candidate.position_group === "EP" && candidate.stack_bucket === "70+"
  ))) {
    row.known_card_opportunities = String(59 * 169);
    row.eligible_opportunities = String(61 * 169);
    row.opportunities = "59";
    row.fold_other = "59";
    row.fold_pct = "100";
  }
  const negativeRecovery = write("recovery-negative-delta.csv", serializeCsv(negativeRecoveryRows));
  const negativeRecoveryMetadata = mutateJson(
    "recovery-negative-delta-meta.json",
    recoveryMetadata,
    (value) => {
      const buffer = fs.readFileSync(negativeRecovery);
      value.merged.sha256 = sha256(buffer);
      value.merged.rows = negativeRecoveryRows.length;
      value.merged.knownCards.known -= 2 * 169;
      value.merged.knownCards.pct = Number((
        value.merged.knownCards.known / value.merged.knownCards.eligible * 100
      ).toFixed(6));
      value.merged.totals.opportunities -= 2 * 169;
      value.merged.totals.fold_other -= 2 * 169;
    },
  );
  const negativeDeltaRun = replacement({
    structuredAggregate,
    structuredMetadata,
    recoveryAggregate: negativeRecovery,
    recoveryMetadata: negativeRecoveryMetadata,
    membership,
    output: path.join(temporary, "negative-delta-final.csv"),
    metadata: path.join(temporary, "negative-delta-final.json"),
  });
  assert.notEqual(negativeDeltaRun.status, 0);
  assert.match(negativeDeltaRun.stderr, /delta must be nonnegative/i);

  const badMembership = write("membership-not-subset.csv", fs.readFileSync(membership, "utf8")
    .replace("l3top,101,11,3,30000,10", "l3top,999,11,3,30000,10"));
  const badMembershipHash = sha256(fs.readFileSync(badMembership));
  const badMembershipKeysHash = sha256([
    "l1|301", "l2|201", "l3top|999", "l3|101", "l3|102", "l3|103", "l3|104",
  ].sort().join("\n"));
  const badStructuredMeta = mutateJson("structured-bad-membership.json", structuredMetadata, (value) => {
    for (const input of value.inputs) {
      input.membershipSha256 = badMembershipHash;
      input.membershipKeysSha256 = badMembershipKeysHash;
    }
  });
  const badRecoveryMeta = mutateJson("recovery-bad-membership.json", recoveryMetadata, (value) => {
    for (const input of value.inputs) {
      input.membershipSha256 = badMembershipHash;
      input.membershipKeysSha256 = badMembershipKeysHash;
    }
  });
  const subsetFailure = replacement({
    structuredAggregate,
    structuredMetadata: badStructuredMeta,
    recoveryAggregate,
    recoveryMetadata: badRecoveryMeta,
    membership: badMembership,
    output: path.join(temporary, "bad-subset-final.csv"),
    metadata: path.join(temporary, "bad-subset-final.json"),
  });
  assert.notEqual(subsetFailure.status, 0);
  assert.match(subsetFailure.stderr, /l3top member must also belong to l3/i);

  const tamperedFinalMetadata = mutateJson("final-tampered-delta.json", finalMetadata, (value) => {
    value.replacement.l3Delta.appliedExactly = false;
  });
  const tamperedPublishRun = run(buildData, [
    `--source=${finalAggregate}`,
    `--action-metadata=${tamperedFinalMetadata}`,
    `--membership=${membership}`,
    `--membership-receipt=${membershipReceipt}`,
    `--out=${path.join(temporary, "tampered-data.js")}`,
  ]);
  assert.notEqual(tamperedPublishRun.status, 0);
  assert.match(tamperedPublishRun.stderr, /whole-l3 delta proof is incomplete/i);

  console.log("RFI recovery replacement and historical/current composition gate: ok");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

function cubeCsv({
  recovery,
  historical = false,
  start = "2023-09-01",
  end = "2026-07-25",
}) {
  const cohorts = recovery ? ["l3top"] : COHORTS;
  const rows = [];
  for (const cohort of cohorts) {
    for (const [stack, stackOrder] of STACKS) {
      for (const [position, positionOrder, positionCode, base] of POSITIONS) {
        const opportunities = base + Number(recovery) + Number(historical) * 5;
        const structuredMissing =
          !historical && !recovery && (cohort === "l3top" || cohort === "l3");
        const eligible = historical
          ? opportunities * 169
          : (base + Number(recovery || structuredMissing)) * 169;
        const known = opportunities * 169;
        for (const hand of HANDS) {
          rows.push({
            window_start: start,
            window_end: end,
            table_filter: "cnt_players = 7",
            table_size: 7,
            cohort,
            cohort_selected_players: COHORT_COUNTS[cohort],
            position_group: position,
            position_order: positionOrder,
            position_code: positionCode,
            stack_bucket: stack,
            stack_order: stackOrder,
            hand_class: hand,
            eligible_opportunities: eligible,
            known_card_opportunities: known,
            lookup_mismatch_opportunities: 0,
            first_observed_at: `${start} 00:00:00`,
            last_observed_at: `${end} 23:59:59`,
            opportunities,
            raises_total: 0,
            regular_raise: 0,
            open_shove: 0,
            limp: 0,
            fold_other: opportunities,
            shove_allin_flag: 0,
            shove_effective_amount_only: 0,
            regular_three_bb_open: 0,
            normal_three_bb_as_shove: 0,
            non_exact_r_effective_allin: 0,
            raise_total_pct: 0,
            regular_raise_pct: 0,
            open_shove_pct: 0,
            limp_pct: 0,
            fold_pct: 100,
            below_exact_minimum: 0,
            low_sample: 1,
          });
        }
      }
    }
  }
  return serializeCsv(rows);
}

function merge({ input, renderer, query, receipt, validation, output, metadata }) {
  const args = [
    input,
    `--output=${output}`,
    `--metadata=${metadata}`,
    `--renderer-metadata=${renderer}`,
    `--receipts=${receipt}`,
    `--queries=${query}`,
  ];
  if (validation) args.push(`--validation-manifests=${validation}`);
  return run(mergeShards, args);
}

function replacement(options) {
  return run(replaceCohort, [
    `--structured-aggregate=${options.structuredAggregate}`,
    `--structured-metadata=${options.structuredMetadata}`,
    `--recovery-aggregate=${options.recoveryAggregate}`,
    `--recovery-metadata=${options.recoveryMetadata}`,
    `--membership=${options.membership}`,
    `--output=${options.output}`,
    `--metadata=${options.metadata}`,
  ]);
}

function rawManifest(options) {
  return run(buildRawManifest, [
    `--aggregate=${options.aggregate}`,
    `--raw-export=${options.rawExport}`,
    `--query=${options.query}`,
    `--query-template=${path.join(here, "q_ff_rfi_raw_hh_field_actions.sql")}`,
    `--receipt=${options.receipt}`,
    `--validation=${options.validation}`,
    `--membership=${options.membership}`,
    `--parser=${path.join(here, "raw-hand-history-parser.mjs")}`,
    `--aggregator=${options.aggregator}`,
    `--window-start=${options.start}`,
    `--window-end=${options.end}`,
    `--output=${options.output}`,
  ]);
}

function sourceComposition(options) {
  return run(mergeSources, [
    `--structured-aggregate=${options.currentAggregate}`,
    `--structured-manifest=${options.currentManifest}`,
    `--raw-aggregate=${options.historicalAggregate}`,
    `--raw-manifest=${options.historicalManifest}`,
    `--output=${options.output}`,
    `--metadata=${options.metadata}`,
  ]);
}

function receiptFor(name, file) {
  return writeJson(name, {
    status: "succeeded",
    job_id: `mcp_ch_job_${crypto.createHash("sha256").update(name).digest("hex").slice(0, 32)}`,
    row_count: parseCsv(fs.readFileSync(file, "utf8")).length,
    byte_size: fs.statSync(file).size,
    finished_at: "2026-07-26T12:00:00Z",
  });
}

function validationSyncReceipt(name, query, metadata, result) {
  const querySha256 = sha256(fs.readFileSync(query));
  return writeJson(name, {
    schema: "ff-rfi-card-parser-validation-receipt-v1",
    queryId: `sync:${querySha256}`,
    queryTransport: "FunFarm ClickHouse MCP inline",
    sourceResponseFormat: "json",
    renderedSqlSha256: querySha256,
    renderMetadataSha256: sha256(fs.readFileSync(metadata)),
    resultSha256: sha256(fs.readFileSync(result)),
    window: ["2026-07-01", "2026-07-02"],
    cohort: "l3top",
    cohortSelectedPlayers: 1,
    parserNetworks: [
      "888Poker", "Chico", "GGNetwork", "PokerPlanets", "PokerStars",
      "PokerStars(FR-ES-PT)", "Winamax.fr", "WPN", "iPoker",
    ],
    validationRows: 9,
    validationPassedRows: 9,
    classFailures: 0,
    readRows: 1000,
    readBytes: 100000,
    durationMs: 100,
  });
}

function passingRawValidation() {
  const networks = [
    "888Poker",
    "GGNetwork",
    "PokerStars",
    "PokerStars(FR-ES-PT)",
    "Winamax.fr",
    "WPN",
    "iPoker",
  ];
  const checks = {
    cards: { compared: networks.length, matched: networks.length, pct: 100 },
    position: { compared: networks.length, matched: networks.length, pct: 100 },
    stack: { compared: networks.length, matched: networks.length, pct: 100 },
    publicStack: { compared: networks.length, matched: networks.length, pct: 100 },
    action: { compared: networks.length, matched: networks.length, pct: 100 },
    shove: { compared: networks.length, matched: networks.length, pct: 100 },
  };
  const networkChecks = () => ({
    cards: { compared: 1, matched: 1, pct: 100 },
    position: { compared: 1, matched: 1, pct: 100 },
    stack: { compared: 1, matched: 1, pct: 100 },
    publicStack: { compared: 1, matched: 1, pct: 100 },
    action: { compared: 1, matched: 1, pct: 100 },
    shove: { compared: 1, matched: 1, pct: 100 },
  });
  return {
    source: { rawHandHistoriesPublished: false },
    totals: {
      rows: networks.length,
      parsed: networks.length,
      parsedPct: 100,
      rejected: 0,
      reasons: {},
      checks,
    },
    networks: Object.fromEntries(networks.map((network) => [network, {
      rows: 1,
      parsed: 1,
      rejected: 0,
      checks: networkChecks(),
    }])),
  };
}

function mutateJson(name, source, mutate) {
  const value = JSON.parse(fs.readFileSync(source, "utf8"));
  mutate(value);
  return writeJson(name, value);
}

function serializeCsv(rows) {
  return `${COLUMNS.join(",")}\n${
    rows.map((row) => COLUMNS.map((column) => row[column]).join(",")).join("\n")
  }\n`;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift()?.split(",") || [];
  return lines.filter(Boolean).map((line) => Object.fromEntries(
    line.split(",").map((value, index) => [header[index], value]),
  ));
}

function canonicalHands() {
  const ranks = "AKQJT98765432";
  const hands = [];
  for (let high = 0; high < ranks.length; high += 1) {
    hands.push(`${ranks[high]}${ranks[high]}`);
    for (let low = high + 1; low < ranks.length; low += 1) {
      hands.push(`${ranks[high]}${ranks[low]}s`, `${ranks[high]}${ranks[low]}o`);
    }
  }
  assert.equal(hands.length, 169);
  return hands;
}

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function write(name, content) {
  const target = path.join(temporary, name);
  fs.writeFileSync(target, content, { mode: 0o600 });
  return target;
}

function writeJson(name, value) {
  return write(name, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
