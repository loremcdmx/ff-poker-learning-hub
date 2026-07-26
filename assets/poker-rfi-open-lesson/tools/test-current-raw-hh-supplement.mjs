#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const applicator = path.join(here, "apply-current-raw-hh-supplement.mjs");
const temporary = fs.mkdtempSync("/private/tmp/ff-rfi-current-supplement-test-");
const COHORTS = ["l3top", "l3", "l2", "l1"];
const POSITIONS = [
  ["EP", 1, 4], ["MP", 2, 3], ["HJ", 3, 2],
  ["CO", 4, 1], ["BTN", 5, 0], ["SB", 6, 9],
];
const STACKS = [
  ["70+", 1], ["30-70", 2], ["20-30", 3], ["15-20", 4],
  ["12-15", 5], ["10-12", 6], ["8-10", 7], ["6-8", 8], ["<6", 9],
];
const COLUMNS = [
  "window_start", "window_end", "table_filter", "table_size", "cohort",
  "cohort_selected_players", "position_group", "position_order",
  "position_code", "stack_bucket", "stack_order", "hand_class",
  "eligible_opportunities", "known_card_opportunities",
  "lookup_mismatch_opportunities", "first_observed_at", "last_observed_at",
  "opportunities", "raises_total", "regular_raise", "open_shove", "limp",
  "fold_other", "shove_allin_flag", "shove_effective_amount_only",
  "regular_three_bb_open", "normal_three_bb_as_shove",
  "non_exact_r_effective_allin", "raise_total_pct", "regular_raise_pct",
  "open_shove_pct", "limp_pct", "fold_pct", "below_exact_minimum",
  "low_sample",
];
const COUNTERS = [
  "opportunities", "raises_total", "regular_raise", "open_shove", "limp",
  "fold_other", "shove_allin_flag", "shove_effective_amount_only",
  "regular_three_bb_open", "normal_three_bb_as_shove",
  "non_exact_r_effective_allin",
];
const HANDS = [...canonicalHands()].sort();
const COHORT_COUNTS = { l3top: 4, l3: 6, l2: 1, l1: 1 };

try {
  const positive = buildFixture("positive");
  const positiveRun = runFixture(positive);
  assert.equal(positiveRun.status, 0, positiveRun.stderr || positiveRun.stdout);
  const currentRows = parseCsv(fs.readFileSync(positive.currentAggregate, "utf8"));
  const finalRows = parseCsv(fs.readFileSync(positive.output, "utf8"));
  const finalMetadata = readJson(positive.metadata);
  assert.equal(finalRows.length, 36_504);
  assert.equal(finalMetadata.schema, "ff-rfi-field-action-current-supplement-v1");
  assert.equal(
    finalMetadata.strategy,
    "exact-same-window-novel-raw-l3top-supplement-with-l3-delta",
  );
  assert.equal(finalMetadata.supplement.l3topAdditive.opportunitiesDelta, 2);
  assert.equal(finalMetadata.supplement.l3Delta.opportunitiesDelta, 2);
  assert.equal(finalMetadata.supplement.l3Delta.cloneEqualsL3top, true);
  assert.equal(finalMetadata.supplement.preserved.l2.exact, true);
  assert.equal(finalMetadata.supplement.preserved.l1.exact, true);
  assert.doesNotMatch(JSON.stringify(finalMetadata), /firstUserId|lastUserId/);
  assert.doesNotMatch(JSON.stringify(finalMetadata), /\/private\/tmp\/|queryFile|resultFile/);
  assert.deepEqual(
    finalMetadata.inputs.slice(2),
    finalMetadata.supplementSource.inputs,
  );
  assert.equal(
    finalMetadata.supplementSource.sourceKind,
    "publication-safe-novel-raw-hh-l3top",
  );
  assert.equal(
    finalMetadata.supplementSource.strategy,
    "approved-plan-source-union-with-observed-zero-dimension-completion",
  );
  assert.deepEqual(finalMetadata.supplementSource.inputs[0].privacy, {
    aggregateOnly: true,
    noRawHandHistories: true,
    noPlayerLevelRows: true,
    noUserIds: true,
  });
  assert.deepEqual(
    finalMetadata.inputs.slice(0, 2),
    [
      ...finalMetadata.baseCurrent.sourceMerges.structured.inputs,
      ...finalMetadata.baseCurrent.sourceMerges.recovery.inputs,
    ],
  );

  const cell = (rows, cohort) => rows.find((row) => (
    row.cohort === cohort
    && row.position_group === "EP"
    && row.stack_bucket === "70+"
    && row.hand_class === "AA"
  ));
  assert.equal(
    Number(cell(finalRows, "l3top").opportunities)
      - Number(cell(currentRows, "l3top").opportunities),
    2,
  );
  assert.equal(
    Number(cell(finalRows, "l3").opportunities)
      - Number(cell(currentRows, "l3").opportunities),
    2,
  );
  assert.deepEqual(cell(finalRows, "l2"), cell(currentRows, "l2"));
  assert.deepEqual(cell(finalRows, "l1"), cell(currentRows, "l1"));

  const composed = buildFixture("composed-schema");
  const composedSource = readJson(composed.supplementMetadata);
  composedSource.schema = "ff-rfi-field-action-novel-raw-supplement-composition-v1";
  composedSource.strategy = "disjoint-approved-source-set-supplement-union-v1";
  writeJson(composed.supplementMetadata, composedSource);
  const composedRun = runFixture(composed);
  assert.equal(composedRun.status, 0, composedRun.stderr || composedRun.stdout);

  const dedicated = buildFixture("dedicated-coin-party-schema");
  const dedicatedSource = readJson(dedicated.supplementMetadata);
  dedicatedSource.schema = "ff-rfi-coin-party-publication-merge-v2";
  dedicatedSource.plan.schema = "ff-rfi-coin-party-publication-run-plan-v2";
  dedicatedSource.parserValidation.schema = "ff-rfi-coin-party-parser-validation-v2";
  writeJson(dedicated.supplementMetadata, dedicatedSource);
  const dedicatedRun = runFixture(dedicated);
  assert.equal(dedicatedRun.status, 0, dedicatedRun.stderr || dedicatedRun.stdout);
  const dedicatedOutput = readJson(dedicated.metadata);
  assert.equal(
    dedicatedOutput.supplementSource.schema,
    "ff-rfi-field-action-novel-raw-supplement-merge-v1",
  );
  assert.equal(
    dedicatedOutput.supplementSource.strategy,
    "approved-plan-source-union-with-observed-zero-dimension-completion",
  );

  const legacyWindow = buildFixture("legacy-inclusive-window");
  mutateBaseInputs(legacyWindow, (input) => {
    delete input.windowEndExclusive;
    input.windowEndInclusive = "2026-07-25T23:59:59.999Z";
  });
  const legacyWindowRun = runFixture(legacyWindow);
  assert.equal(
    legacyWindowRun.status,
    0,
    legacyWindowRun.stderr || legacyWindowRun.stdout,
  );
  const legacyWindowOutput = readJson(legacyWindow.metadata);
  for (const input of legacyWindowOutput.inputs.slice(0, 2)) {
    assert.equal(input.windowEndExclusive, "2026-07-26T00:00:00Z");
    assert.equal(Object.hasOwn(input, "windowEndInclusive"), false);
  }

  const legacyReceipts = buildFixture("legacy-adjacent-receipts");
  addLegacyExecutionReceipts(legacyReceipts);
  const legacyReceiptsRun = runFixture(legacyReceipts);
  assert.equal(
    legacyReceiptsRun.status,
    0,
    legacyReceiptsRun.stderr || legacyReceiptsRun.stdout,
  );
  const legacyReceiptsOutput = readJson(legacyReceipts.metadata);
  assert.equal(
    legacyReceiptsOutput.inputs[0].startedAt,
    "2026-07-26T00:00:00.123456Z",
  );
  assert.equal(
    legacyReceiptsOutput.inputs[0].finishedAt,
    "2026-07-26T00:01:00.654321Z",
  );

  const legacyStructuredPrivacy = buildFixture("legacy-structured-privacy");
  mutateBaseInputs(legacyStructuredPrivacy, (input) => {
    if (input.sourceKind === "structured-field-action") delete input.privacy;
  });
  const legacyStructuredPrivacyRun = runFixture(legacyStructuredPrivacy);
  assert.equal(
    legacyStructuredPrivacyRun.status,
    0,
    legacyStructuredPrivacyRun.stderr || legacyStructuredPrivacyRun.stdout,
  );

  expectFailure("current aggregate hash", (fixture) => {
    const metadata = readJson(fixture.currentMetadata);
    metadata.merged.sha256 = "0".repeat(64);
    writeJson(fixture.currentMetadata, metadata);
  }, /Current aggregate hash mismatch/i);
  expectFailure("supplement membership", (fixture) => {
    const metadata = readJson(fixture.supplementMetadata);
    metadata.membership.sha256 = "0".repeat(64);
    writeJson(fixture.supplementMetadata, metadata);
  }, /Supplement membership hash mismatch/i);
  expectFailure("supplement action partition", (fixture) => {
    const rows = parseCsv(fs.readFileSync(fixture.supplementAggregate, "utf8"));
    rows[0].opportunities = "3";
    rewriteCsv(fixture.supplementAggregate, rows);
  }, /action partition/i);
  expectFailure("supplement lookup mismatch", (fixture) => {
    const rows = parseCsv(fs.readFileSync(fixture.supplementAggregate, "utf8"));
    for (const row of rows.filter((item) => (
      item.position_group === "EP" && item.stack_bucket === "70+"
    ))) row.lookup_mismatch_opportunities = "1";
    rewriteCsv(fixture.supplementAggregate, rows);
  }, /raw lookup mismatch/i);
  expectFailure("private supplement input", (fixture) => {
    const metadata = readJson(fixture.supplementMetadata);
    metadata.inputs[0].privacy.noRawHandHistories = false;
    writeJson(fixture.supplementMetadata, metadata);
  }, /safe privacy boundary drift/i);
  expectFailure("arbitrary supplement metadata", (fixture) => {
    const metadata = readJson(fixture.supplementMetadata);
    metadata.inputs[0].playerEmail = "private@example.com";
    writeJson(fixture.supplementMetadata, metadata);
  }, /Novel input allowlist drift/i);
  expectFailure("stale supplement receipt", (fixture) => {
    const metadata = readJson(fixture.supplementMetadata);
    metadata.inputs[0].startedAt = "2026-07-25T23:58:00Z";
    metadata.inputs[0].finishedAt = "2026-07-25T23:59:00Z";
    writeJson(fixture.supplementMetadata, metadata);
  }, /stale evidence/i);
  expectFailure("incomplete supplement cube", (fixture) => {
    const rows = parseCsv(fs.readFileSync(fixture.supplementAggregate, "utf8"));
    rewriteCsv(fixture.supplementAggregate, rows.slice(1));
  }, /lacks 169 hands|9,126 rows/i);
  expectFailure("drifted legacy inclusive window", (fixture) => {
    mutateBaseInputs(fixture, (input) => {
      delete input.windowEndExclusive;
      input.windowEndInclusive = "2026-07-25T23:59:59.998Z";
    });
  }, /legacy inclusive window end/i);
  expectFailure("ambiguous base window convention", (fixture) => {
    mutateBaseInputs(fixture, (input) => {
      input.windowEndInclusive = "2026-07-25T23:59:59.999Z";
    });
  }, /exactly one closed-window end convention/i);
  expectFailure("legacy receipt tamper", (fixture) => {
    addLegacyExecutionReceipts(fixture);
    const metadata = readJson(fixture.currentMetadata);
    const receiptPath = path.join(
      path.dirname(fixture.currentMetadata),
      metadata.inputs[0].file.replace(/\.csv$/, ".receipt.json"),
    );
    const receipt = readJson(receiptPath);
    receipt.finished_at = "2026-07-26T00:02:00+00:00";
    writeJson(receiptPath, receipt);
  }, /legacy execution receipt hash mismatch/i);

  process.stdout.write("current raw-HH supplement application tests passed\n");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

function expectFailure(label, mutate, pattern) {
  const fixture = buildFixture(`failure-${label.replace(/\W+/g, "-")}`);
  mutate(fixture);
  const result = runFixture(fixture);
  assert.notEqual(result.status, 0, `${label}: mutation unexpectedly passed`);
  assert.match(result.stderr, pattern, `${label}: wrong failure\n${result.stderr}`);
}

function mutateBaseInputs(fixture, mutate) {
  const metadata = readJson(fixture.currentMetadata);
  for (const input of metadata.inputs) mutate(input);
  for (const source of Object.values(metadata.sourceMerges)) {
    for (const input of source.inputs) mutate(input);
  }
  writeJson(fixture.currentMetadata, metadata);
}

function addLegacyExecutionReceipts(fixture) {
  const metadata = readJson(fixture.currentMetadata);
  for (const [index, sourceKind] of [
    "structured-field-action",
    "missing-card-recovery-full-cube",
  ].entries()) {
    const file = `legacy-${index}.csv`;
    const matchingInputs = [
      ...metadata.inputs,
      ...Object.values(metadata.sourceMerges).flatMap((source) => source.inputs),
    ].filter((input) => input.sourceKind === sourceKind);
    const reference = matchingInputs[0];
    const receipt = {
      job_id: reference.queryJobId,
      status: "succeeded",
      started_at: "2026-07-26T00:00:00.123456+00:00",
      finished_at: "2026-07-26T00:01:00.654321+00:00",
      row_count: reference.resultRows,
      byte_size: reference.resultBytes,
      truncated: false,
      result_sha256: reference.resultSha256,
    };
    const receiptPath = path.join(
      path.dirname(fixture.currentMetadata),
      file.replace(/\.csv$/, ".receipt.json"),
    );
    writeJson(receiptPath, receipt);
    const receiptSha256 = sha256(fs.readFileSync(receiptPath));
    for (const input of matchingInputs) {
      input.file = file;
      input.receiptSha256 = receiptSha256;
      delete input.startedAt;
      delete input.finishedAt;
    }
  }
  writeJson(fixture.currentMetadata, metadata);
}

function buildFixture(name) {
  const root = path.join(temporary, name);
  fs.mkdirSync(root, { recursive: true });
  const membership = write(path.join(root, "membership.csv"), membershipCsv());
  const membershipBuffer = fs.readFileSync(membership);
  const membershipInfo = inspectMembership(membership);

  const currentRows = buildCurrentRows();
  const currentAggregate = path.join(root, "current.csv");
  rewriteCsv(currentAggregate, currentRows);
  const currentBuffer = fs.readFileSync(currentAggregate);
  const currentSummary = summarize(currentRows);
  const currentTopSummary = summarize(
    currentRows.filter((row) => row.cohort === "l3top"),
  );
  const baseInputs = baseInputFixtures(membershipBuffer, membershipInfo);
  const structuredMerged = mergedMetadata(currentAggregate, currentBuffer, currentSummary);
  const recoveryMerged = {
    ...mergedMetadata(currentAggregate, currentBuffer, currentTopSummary),
    sha256: "4".repeat(64),
    rows: 9_126,
    bytes: 1234,
  };
  const currentMetadata = path.join(root, "current.json");
  writeJson(currentMetadata, {
    schema: "ff-rfi-field-action-cohort-replacement-v1",
    strategy: "exact-same-window-l3top-replacement-with-l3-delta",
    replacedCohort: "l3top",
    deltaAppliedCohort: "l3",
    window: exactWindow(),
    membership: {
      sha256: sha256(membershipBuffer),
      keysSha256: membershipInfo.keysSha256,
      rows: membershipInfo.rows,
      cohortCounts: COHORT_COUNTS,
      subsetProof: {
        l3topMembers: 4,
        l3Members: 6,
        l3topIsSubsetOfL3: true,
      },
    },
    sourceMerges: {
      structured: {
        schema: "ff-rfi-field-action-merge-v1",
        shardStrategy: "immutable-user-id",
        manifestSha256: "1".repeat(64),
        aggregate: { sha256: "2".repeat(64), bytes: 2345, rows: 36_504 },
        inputs: [baseInputs[0]],
        merged: structuredMerged,
      },
      recovery: {
        schema: "ff-rfi-field-action-merge-v1",
        sourceKind: "missing-card-recovery-full-cube",
        shardStrategy: "immutable-user-id",
        manifestSha256: "3".repeat(64),
        aggregate: { sha256: "4".repeat(64), bytes: 1234, rows: 9_126 },
        inputs: [baseInputs[1]],
        merged: recoveryMerged,
      },
    },
    inputs: baseInputs,
    replacement: {
      l3top: {
        structuredRows: 9_126,
        structuredProjectionSha256: projectionSha(
          currentRows.filter((row) => row.cohort === "l3top"),
        ),
        recoveryRows: 9_126,
        recoveryProjectionSha256: projectionSha(
          currentRows.filter((row) => row.cohort === "l3top"),
        ),
        recoveryDominatesExactly: true,
        finalProjectionSha256: projectionSha(
          currentRows.filter((row) => row.cohort === "l3top"),
        ),
      },
      l3Delta: {
        exactCells: 9_126,
        stateCount: 54,
        counters: Object.fromEntries(COUNTERS.map((counter) => [counter, 0])),
        knownCardDelta: 0,
        nonnegativePerCell: true,
        appliedExactly: true,
        eligibleCoverageChanged: false,
      },
      preserved: Object.fromEntries(["l2", "l1"].map((cohort) => [
        cohort,
        {
          rows: 9_126,
          sourceProjectionSha256: projectionSha(
            currentRows.filter((row) => row.cohort === cohort),
          ),
          exact: true,
          finalProjectionSha256: projectionSha(
            currentRows.filter((row) => row.cohort === cohort),
          ),
          counters: summarize(
            currentRows.filter((row) => row.cohort === cohort),
          ).totals,
        },
      ])),
    },
    merged: mergedMetadata(currentAggregate, currentBuffer, currentSummary),
    privacy: {
      aggregateOnly: true,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
  });

  const supplementRows = buildSupplementRows();
  const supplementAggregate = path.join(root, "supplement.csv");
  rewriteCsv(supplementAggregate, supplementRows);
  const supplementBuffer = fs.readFileSync(supplementAggregate);
  const supplementSummary = summarize(supplementRows);
  const supplementMetadata = path.join(root, "supplement.json");
  const publicationGate = {
    raw_keys: 2,
    exact_id_match_keys: 0,
    nominal_novel_keys: 2,
    normalized_time_eligible_keys: 2,
    publication_eligible_keys: 2,
  };
  writeJson(supplementMetadata, {
    schema: "ff-rfi-field-action-novel-raw-supplement-merge-v1",
    sourceKind: "publication-safe-novel-raw-hh-l3top",
    strategy: "approved-plan-source-union-with-observed-zero-dimension-completion",
    plan: {
      schema: "synthetic-plan-v1",
      sourceSetComplete: true,
      exactDisjointUserUnion: true,
      targetFilter: false,
      expectedExecutions: 1,
      networks: ["CoinPoker"],
    },
    parserValidation: {
      schema: "synthetic-parser-validation-v1",
      sha256: "6".repeat(64),
      gatePassed: true,
      exactMismatchTolerance: 0,
    },
    window: exactWindow(),
    membership: {
      sha256: sha256(membershipBuffer),
      keysSha256: membershipInfo.keysSha256,
      rows: membershipInfo.rows,
      cohortCounts: COHORT_COUNTS,
      selectedCohort: "l3top",
      selectedPlayers: 4,
    },
    aggregateTemplateSha256: "7".repeat(64),
    inputs: [{
      sourceKind: "coin-party-publication-v2",
      network: "CoinPoker",
      queryJobId: `mcp_ch_job_${"8".repeat(32)}`,
      executionMode: "async",
      startedAt: "2026-07-26T00:00:00Z",
      finishedAt: "2026-07-26T00:01:00Z",
      rendererMetadataSha256: "9".repeat(64),
      receiptSha256: "a".repeat(64),
      querySha256: "b".repeat(64),
      resultSha256: "c".repeat(64),
      resultRows: 1,
      resultBytes: supplementBuffer.length,
      observedStates: 1,
      observedCells: 1,
      templateSha256: "7".repeat(64),
      parserTemplateSha256: "e".repeat(64),
      parserValidationSha256: "6".repeat(64),
      userShard: {
        index: 0,
        count: 1,
        users: 4,
        userIdsSha256: "d".repeat(64),
      },
      publicationGate,
      windowStartInclusive: "2023-09-01T00:00:00Z",
      windowEndExclusive: "2026-07-26T00:00:00Z",
      privacy: {
        aggregateOnly: true,
        noRawHandHistories: true,
        noPlayerLevelRows: true,
        noUserIds: true,
      },
    }],
    densification: {
      observedInputRows: 1,
      observedInputCells: 1,
      canonicalOutputCells: 9_126,
      absentDimensionsMaterializedAsObservedZero: true,
      smoothingApplied: false,
      modeledValuesApplied: false,
    },
    merged: mergedMetadata(
      supplementAggregate,
      supplementBuffer,
      supplementSummary,
    ),
    privacy: {
      aggregateOnly: true,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
  });

  return {
    membership,
    currentAggregate,
    currentMetadata,
    supplementAggregate,
    supplementMetadata,
    output: path.join(root, "final.csv"),
    metadata: path.join(root, "final.json"),
  };
}

function runFixture(fixture) {
  return spawnSync(process.execPath, [
    applicator,
    `--current-aggregate=${fixture.currentAggregate}`,
    `--current-metadata=${fixture.currentMetadata}`,
    `--supplement-aggregate=${fixture.supplementAggregate}`,
    `--supplement-metadata=${fixture.supplementMetadata}`,
    `--membership=${fixture.membership}`,
    `--output=${fixture.output}`,
    `--metadata=${fixture.metadata}`,
  ], {
    encoding: "utf8",
    cwd: here,
  });
}

function baseInputFixtures(membershipBuffer, membershipInfo) {
  const privacy = {
    aggregateOnly: true,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  };
  const common = {
    executionMode: "async",
    startedAt: "2026-07-26T00:00:00Z",
    finishedAt: "2026-07-26T00:01:00Z",
    rendererMetadataSha256: "1".repeat(64),
    receiptSha256: "2".repeat(64),
    querySha256: "3".repeat(64),
    resultSha256: "4".repeat(64),
    resultRows: 9_126,
    resultBytes: 1234,
    templateSha256: "5".repeat(64),
    windowStartInclusive: "2023-09-01T00:00:00Z",
    windowEndExclusive: "2026-07-26T00:00:00Z",
    membershipSha256: sha256(membershipBuffer),
    membershipKeysSha256: membershipInfo.keysSha256,
    privacy,
  };
  return [
    {
      ...common,
      sourceKind: "structured-field-action",
      queryJobId: `mcp_ch_job_${"1".repeat(32)}`,
      resultRows: 36_504,
      resultBytes: 2345,
      userShard: {
        index: 0,
        count: 1,
        users: 8,
        userIdsSha256: "6".repeat(64),
      },
      handClassMode: "joined-holecards-str",
      holecardMappingSha256: null,
    },
    {
      ...common,
      sourceKind: "missing-card-recovery-full-cube",
      queryJobId: `mcp_ch_job_${"2".repeat(32)}`,
      userShard: {
        index: 0,
        count: 1,
        users: 4,
        userIdsSha256: "7".repeat(64),
      },
      parserGrammarsSha256: "8".repeat(64),
      parserNetworks: ["PokerStars"],
      recoveryIsDisjoint: true,
      recoveryPredicate: "latest structured_hand_class = ''",
      rawJoin: {
        type: "exact-key",
        trackerKey: [
          "toUInt64(user_id)",
          "toString(network)",
          "toString(hh_id)",
        ],
        rawKey: [
          "toUInt64(check_user_id)",
          "toString(network)",
          "toString(converted_hh_id)",
        ],
      },
      validation: {
        schema: "ff-rfi-missing-card-recovery-validation-v1",
        manifestSha256: "9".repeat(64),
        queryJobId: `sync:${"a".repeat(64)}`,
        queryExecutionMode: "sync",
        startedAt: "2026-07-26T00:00:00Z",
        finishedAt: "2026-07-26T00:00:30Z",
        rendererMetadataSha256: "b".repeat(64),
        renderedSqlSha256: "c".repeat(64),
        queryTemplateSha256: "d".repeat(64),
        resultSha256: "e".repeat(64),
        resultRows: 1,
        resultBytes: 100,
        receiptSha256: "f".repeat(64),
        window: {
          startInclusive: "2026-07-01T00:00:00Z",
          endExclusive: "2026-07-02T00:00:00Z",
          semantics: "half-open-utc",
        },
        networks: {
          PokerStars: {
            trackerRows: 10,
            trackerKnownWithRaw: 8,
            rawHhJoined: 9,
            parserSuccess: 9,
            classMatches: 8,
            classFailures: 0,
            matchPctTrackerKnown: 100,
            trackerMissingRecovered: 1,
            validationPassed: 1,
          },
        },
        totals: {
          trackerRows: 10,
          trackerKnownWithRaw: 8,
          rawHhJoined: 9,
          parserSuccess: 9,
          classMatches: 8,
          classFailures: 0,
          trackerMissingRecovered: 1,
        },
        rawHandHistoriesPublished: false,
        personalIdentifiersPublished: false,
      },
    },
  ];
}

function buildCurrentRows() {
  const perCell = { l3top: 1, l3: 2, l2: 3, l1: 4 };
  const rows = [];
  for (const cohort of COHORTS) {
    for (const [stack, stackOrder] of STACKS) {
      for (const [position, positionOrder, positionCode] of POSITIONS) {
        const value = perCell[cohort];
        const known = value * 169;
        for (const hand of HANDS) {
          rows.push(actionRow({
            cohort,
            selectedPlayers: COHORT_COUNTS[cohort],
            position,
            positionOrder,
            positionCode,
            stack,
            stackOrder,
            hand,
            stateKnown: known,
            cellOpportunities: value,
            first: "2024-01-01 00:00:00",
            last: "2026-01-01 00:00:00",
          }));
        }
      }
    }
  }
  return rows;
}

function buildSupplementRows() {
  const rows = [];
  for (const [stack, stackOrder] of STACKS) {
    for (const [position, positionOrder, positionCode] of POSITIONS) {
      const targetState = stack === "70+" && position === "EP";
      for (const hand of HANDS) {
        const opportunities = targetState && hand === "AA" ? 2 : 0;
        rows.push(actionRow({
          cohort: "l3top",
          selectedPlayers: 4,
          position,
          positionOrder,
          positionCode,
          stack,
          stackOrder,
          hand,
          stateKnown: targetState ? 2 : 0,
          cellOpportunities: opportunities,
          first: targetState ? "2025-01-01 00:00:00" : "",
          last: targetState ? "2026-07-01 00:00:00" : "",
        }));
      }
    }
  }
  return rows;
}

function actionRow({
  cohort,
  selectedPlayers,
  position,
  positionOrder,
  positionCode,
  stack,
  stackOrder,
  hand,
  stateKnown,
  cellOpportunities,
  first,
  last,
}) {
  return {
    window_start: "2023-09-01",
    window_end: "2026-07-25",
    table_filter: "cnt_players = 7",
    table_size: 7,
    cohort,
    cohort_selected_players: selectedPlayers,
    position_group: position,
    position_order: positionOrder,
    position_code: positionCode,
    stack_bucket: stack,
    stack_order: stackOrder,
    hand_class: hand,
    eligible_opportunities: stateKnown,
    known_card_opportunities: stateKnown,
    lookup_mismatch_opportunities: 0,
    first_observed_at: first,
    last_observed_at: last,
    opportunities: cellOpportunities,
    raises_total: 0,
    regular_raise: 0,
    open_shove: 0,
    limp: 0,
    fold_other: cellOpportunities,
    shove_allin_flag: 0,
    shove_effective_amount_only: 0,
    regular_three_bb_open: 0,
    normal_three_bb_as_shove: 0,
    non_exact_r_effective_allin: 0,
    raise_total_pct: 0,
    regular_raise_pct: 0,
    open_shove_pct: 0,
    limp_pct: 0,
    fold_pct: cellOpportunities ? 100 : 0,
    below_exact_minimum: 1,
    low_sample: 1,
  };
}

function summarize(rows) {
  const totals = Object.fromEntries(COUNTERS.map((counter) => [counter, 0]));
  const states = new Map();
  for (const row of rows) {
    for (const counter of COUNTERS) totals[counter] += Number(row[counter]);
    const key = [
      row.cohort, row.position_group, row.position_order, row.position_code,
      row.stack_bucket, row.stack_order,
    ].join("|");
    if (!states.has(key)) {
      states.set(key, {
        eligible: Number(row.eligible_opportunities),
        known: Number(row.known_card_opportunities),
        lookupMismatch: Number(row.lookup_mismatch_opportunities),
      });
    }
  }
  const knownCards = [...states.values()].reduce((result, state) => {
    result.eligible += state.eligible;
    result.known += state.known;
    result.lookupMismatch += state.lookupMismatch;
    return result;
  }, { eligible: 0, known: 0, lookupMismatch: 0 });
  knownCards.pct = knownCards.eligible
    ? Number((knownCards.known / knownCards.eligible * 100).toFixed(6))
    : 100;
  return { totals, knownCards, stateCount: states.size, rows: rows.length };
}

function mergedMetadata(file, buffer, summary) {
  return {
    file: path.basename(file),
    rows: summary.rows,
    sha256: sha256(buffer),
    bytes: buffer.length,
    windowStartInclusive: "2023-09-01T00:00:00Z",
    windowEndExclusive: "2026-07-26T00:00:00Z",
    knownCards: summary.knownCards,
    totals: summary.totals,
    cube: {
      stateCount: summary.stateCount,
      rowCount: summary.rows,
      handClassesPerState: 169,
      coverageReconciled: true,
    },
  };
}

function inspectMembership(file) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  return {
    rows: rows.length,
    keysSha256: sha256(
      rows.map((row) => `${row.cohort}|${row.user_id}`).sort().join("\n"),
    ),
  };
}

function exactWindow() {
  return {
    startInclusive: "2023-09-01T00:00:00Z",
    endExclusive: "2026-07-26T00:00:00Z",
    semantics: "half-open-utc",
  };
}

function projectionSha(rows) {
  return sha256(
    [...rows]
      .sort(compareRows)
      .map((row) => COLUMNS.map((column) => String(row[column] ?? "")).join("\u001f"))
      .join("\n"),
  );
}

function compareRows(left, right) {
  return COHORTS.indexOf(left.cohort) - COHORTS.indexOf(right.cohort)
    || Number(left.stack_order) - Number(right.stack_order)
    || Number(left.position_order) - Number(right.position_order)
    || left.hand_class.localeCompare(right.hand_class);
}

function canonicalHands() {
  const ranks = "AKQJT98765432";
  const hands = new Set();
  for (let high = 0; high < ranks.length; high += 1) {
    hands.add(`${ranks[high]}${ranks[high]}`);
    for (let low = high + 1; low < ranks.length; low += 1) {
      hands.add(`${ranks[high]}${ranks[low]}s`);
      hands.add(`${ranks[high]}${ranks[low]}o`);
    }
  }
  return hands;
}

function membershipCsv() {
  return [
    "cohort,user_id,current_rank,current_league,ffev_hands,ffev,cohort_selected_players",
    "l3top,101,11,3,1,1,4",
    "l3top,102,12,3,1,1,4",
    "l3top,103,13,3,1,1,4",
    "l3top,104,14,3,1,1,4",
    "l3,101,11,3,1,1,6",
    "l3,102,12,3,1,1,6",
    "l3,103,13,3,1,1,6",
    "l3,104,14,3,1,1,6",
    "l3,105,15,3,1,1,6",
    "l3,106,16,3,1,1,6",
    "l2,201,8,2,1,1,1",
    "l1,301,3,1,1,1,1",
    "",
  ].join("\n");
}

function rewriteCsv(file, rows) {
  const text = `${COLUMNS.join(",")}\n${
    rows.map((row) => COLUMNS.map((column) => row[column] ?? "").join(",")).join("\n")
  }\n`;
  write(file, text);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines[0]) return [];
  const header = lines[0].split(",");
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(header.map((column, index) => [column, values[index]]));
  });
}

function write(file, text) {
  fs.writeFileSync(file, text);
  return file;
}

function writeJson(file, value) {
  return write(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
