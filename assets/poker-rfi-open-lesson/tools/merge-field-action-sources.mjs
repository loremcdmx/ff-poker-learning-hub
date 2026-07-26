#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const COHORTS = ["l3top", "l3", "l2", "l1"];
const POSITIONS = Object.freeze({
  EP: { order: 1, code: 4 },
  MP: { order: 2, code: 3 },
  HJ: { order: 3, code: 2 },
  CO: { order: 4, code: 1 },
  BTN: { order: 5, code: 0 },
  SB: { order: 6, code: 9 },
});
const STACKS = Object.freeze({
  "70+": 1,
  "30-70": 2,
  "20-30": 3,
  "15-20": 4,
  "12-15": 5,
  "10-12": 6,
  "8-10": 7,
  "6-8": 8,
  "<6": 9,
});
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
const DIMENSIONS = ["cohort", "position_group", "position_order", "position_code", "stack_bucket", "stack_order", "hand_class"];
const COUNTERS = [
  "opportunities", "raises_total", "regular_raise", "open_shove", "limp", "fold_other",
  "shove_allin_flag", "shove_effective_amount_only", "regular_three_bb_open",
  "normal_three_bb_as_shove", "non_exact_r_effective_allin",
];
const RATE_COLUMNS = ["raise_total_pct", "regular_raise_pct", "open_shove_pct", "limp_pct", "fold_pct"];
const HISTORICAL_RAW_PARSER_NETWORKS = Object.freeze([
  "888Poker",
  "GGNetwork",
  "PokerStars",
  "PokerStars(FR-ES-PT)",
  "Winamax.fr",
  "WPN",
  "iPoker",
]);
const HISTORICAL_VALIDATION_CHECKS = Object.freeze([
  "cards", "position", "stack", "publicStack", "action", "shove",
]);
const HANDS = canonicalHands();

const options = parseOptions(process.argv.slice(2));
for (const required of [
  "structured-aggregate", "structured-manifest", "raw-aggregate", "raw-manifest", "output", "metadata",
]) {
  if (!options[required]) throw new Error(`Missing --${required}`);
}

const structuredAggregateBuffer = fs.readFileSync(options["structured-aggregate"]);
const structuredManifestBuffer = fs.readFileSync(options["structured-manifest"]);
const rawAggregateBuffer = fs.readFileSync(options["raw-aggregate"]);
const rawManifestBuffer = fs.readFileSync(options["raw-manifest"]);
const structuredManifest = JSON.parse(structuredManifestBuffer.toString("utf8"));
const rawManifest = JSON.parse(rawManifestBuffer.toString("utf8"));

const structuredContract = validateStructuredSource(
  structuredManifest,
  structuredManifestBuffer,
  structuredAggregateBuffer,
);
const rawContract = validateRawSource(
  rawManifest,
  rawManifestBuffer,
  rawAggregateBuffer,
  structuredManifest.schema === "ff-rfi-field-action-cohort-replacement-v1",
);
if (rawContract.window.endExclusive !== structuredContract.window.startInclusive) {
  throw new Error(
    `Raw-HH and structured source windows must be strictly adjacent: ${rawContract.window.endExclusive} != ${structuredContract.window.startInclusive}`,
  );
}
if (rawContract.window.startInclusive >= rawContract.window.endExclusive ||
    structuredContract.window.startInclusive >= structuredContract.window.endExclusive) {
  throw new Error("Mixed-source windows must be ordered non-empty half-open intervals");
}
assert.deepEqual(
  rawContract.membership,
  structuredContract.membership,
  "Raw-HH and structured source membership hashes/counts must be identical",
);

const cohortCounts = rawContract.membership.cohortCounts;
const rawRows = parseCsv(rawAggregateBuffer.toString("utf8"), options["raw-aggregate"], COLUMNS);
const structuredRows = parseCsv(structuredAggregateBuffer.toString("utf8"), options["structured-aggregate"], COLUMNS);
const rawSummary = inspectRows(rawRows, rawContract.window, cohortCounts, options["raw-aggregate"], true);
const structuredSummary = inspectRows(structuredRows, structuredContract.window, cohortCounts, options["structured-aggregate"], false);
assert.deepEqual(rawSummary.totals, rawContract.totals, "Raw aggregate totals drift from its manifest");
assert.deepEqual(rawSummary.knownCards, rawContract.knownCards, "Raw aggregate coverage drifts from its manifest");
assert.deepEqual(rawSummary.stateCoverage, rawContract.stateCoverage, "Raw aggregate state coverage drifts from its manifest");
assert.deepEqual(structuredSummary.totals, structuredContract.totals, "Structured aggregate totals drift from its manifest");
assert.deepEqual(structuredSummary.knownCards, structuredContract.knownCards, "Structured aggregate coverage drifts from its manifest");
const recoveryAdjustedComposition =
  structuredContract.sourceKind === "current-recovery-adjusted-cohort-replacement";
const rawCube = recoveryAdjustedComposition
  ? validateCompleteCube(rawRows, rawSummary, "historical raw aggregate")
  : null;
const structuredCube = recoveryAdjustedComposition
  ? validateCompleteCube(structuredRows, structuredSummary, "current recovery-adjusted aggregate")
  : null;
if (recoveryAdjustedComposition) {
  assert.equal(
    rawCube.grainSha256,
    structuredCube.grainSha256,
    "Historical and current cube dimensions do not match exactly",
  );
}

const grouped = new Map();
const coverage = new Map();
for (const sourceRows of [rawRows, structuredRows]) {
  for (const row of sourceRows) {
    const grain = DIMENSIONS.map((column) => row[column]).join("|");
    if (!grouped.has(grain)) {
      grouped.set(grain, {
        ...Object.fromEntries(DIMENSIONS.map((column) => [column, row[column]])),
        cohort_selected_players: Number(row.cohort_selected_players),
        ...emptyTotals(),
      });
    }
    const target = grouped.get(grain);
    if (target.cohort_selected_players !== Number(row.cohort_selected_players)) {
      throw new Error(`Cohort size drift while merging ${grain}`);
    }
    for (const counter of COUNTERS) target[counter] += Number(row[counter]);

    const stateKey = stateKeyFor(row);
    const state = {
      cohort: row.cohort,
      position: row.position_group,
      positionOrder: Number(row.position_order),
      positionCode: Number(row.position_code),
      stack: row.stack_bucket,
      stackOrder: Number(row.stack_order),
      eligible: Number(row.eligible_opportunities),
      known: Number(row.known_card_opportunities),
      lookupMismatch: Number(row.lookup_mismatch_opportunities),
      firstObservedAt: row.first_observed_at,
      lastObservedAt: row.last_observed_at,
      opportunities: 0,
    };
    const existing = coverage.get(stateKey);
    if (existing) {
      const sameSourceState = existing.sourceWindows.has(`${row.window_start}|${row.window_end}`);
      if (sameSourceState) {
        existing.opportunities += Number(row.opportunities);
      } else {
        existing.eligible += state.eligible;
        existing.known += state.known;
        existing.lookupMismatch += state.lookupMismatch;
        existing.firstObservedAt = minText(existing.firstObservedAt, state.firstObservedAt);
        existing.lastObservedAt = maxText(existing.lastObservedAt, state.lastObservedAt);
        existing.opportunities += Number(row.opportunities);
        existing.sourceWindows.add(`${row.window_start}|${row.window_end}`);
      }
    } else {
      coverage.set(stateKey, {
        ...state,
        opportunities: Number(row.opportunities),
        sourceWindows: new Set([`${row.window_start}|${row.window_end}`]),
      });
    }
  }
}

for (const [stateKey, state] of coverage) {
  if (state.known !== state.opportunities) {
    throw new Error(`Merged known-card coverage does not reconcile for ${stateKey}`);
  }
}

const mergedWindowStart = dateOnly(rawContract.window.startInclusive);
const mergedWindowEndExclusive = dateOnly(structuredContract.window.endExclusive);
const mergedWindowEnd = previousDate(mergedWindowEndExclusive);
const mergedRows = [...grouped.values()].sort(compareAggregateRows).map((row) => {
  const state = coverage.get(stateKeyFor(row));
  if (!state) throw new Error(`Missing merged coverage for ${stateKeyFor(row)}`);
  const rates = [
    row.raises_total,
    row.regular_raise,
    row.open_shove,
    row.limp,
    row.fold_other,
  ].map((value) => pct(value, row.opportunities));
  return {
    window_start: mergedWindowStart,
    window_end: mergedWindowEnd,
    table_filter: "cnt_players = 7",
    table_size: 7,
    ...Object.fromEntries(DIMENSIONS.map((column) => [column, row[column]])),
    cohort_selected_players: row.cohort_selected_players,
    eligible_opportunities: state.eligible,
    known_card_opportunities: state.known,
    lookup_mismatch_opportunities: state.lookupMismatch,
    first_observed_at: state.firstObservedAt,
    last_observed_at: state.lastObservedAt,
    ...Object.fromEntries(COUNTERS.map((counter) => [counter, row[counter]])),
    ...Object.fromEntries(RATE_COLUMNS.map((column, index) => [column, rates[index]])),
    below_exact_minimum: Number(row.opportunities < 50),
    low_sample: Number(row.opportunities < 100),
  };
});
const mergedText = `${COLUMNS.join(",")}\n${mergedRows.map((row) => COLUMNS.map((column) => csvCell(row[column])).join(",")).join("\n")}\n`;
const mergedBuffer = Buffer.from(mergedText);
const mergedSummary = inspectRows(
  parseCsv(mergedText, options.output, COLUMNS),
  {
    startInclusive: `${mergedWindowStart}T00:00:00Z`,
    endExclusive: `${mergedWindowEndExclusive}T00:00:00Z`,
  },
  cohortCounts,
  options.output,
  false,
);
const mergedCube = recoveryAdjustedComposition
  ? validateCompleteCube(
    parseCsv(mergedText, options.output, COLUMNS),
    mergedSummary,
    "final historical/current composition",
  )
  : null;
if (recoveryAdjustedComposition) {
  assert.equal(
    mergedCube.grainSha256,
    structuredCube.grainSha256,
    "Final composition dimensions drift from source cubes",
  );
  for (const counter of COUNTERS) {
    assert.equal(
      mergedSummary.totals[counter],
      rawSummary.totals[counter] + structuredSummary.totals[counter],
      `Final composition double-count/missing-count drift for ${counter}`,
    );
  }
}

const sources = [
  {
    sourceKind: "raw-hh-local-aggregate",
    schema: rawManifest.schema,
    manifestSha256: sha256(rawManifestBuffer),
    window: rawContract.window,
    aggregate: {
      sha256: rawContract.aggregate.sha256,
      bytes: rawContract.aggregate.bytes,
      rowCount: rawContract.aggregate.rowCount,
    },
    sourceTable: rawManifest.source.table,
    queryJobIds: [rawManifest.source.execution.queryJobId],
    querySha256: rawManifest.source.execution.querySha256,
    queryTemplateSha256: rawManifest.source.execution.queryTemplateSha256,
    receiptSha256: rawManifest.source.execution.receiptSha256,
    resultSha256: rawManifest.source.export.sha256,
    rawExport: rawManifest.source.export,
    transform: rawManifest.transform,
    validation: rawManifest.validation,
    ...(recoveryAdjustedComposition ? {
      embeddedManifestSha256: sha256(`${JSON.stringify(rawManifest, null, 2)}\n`),
      manifest: rawManifest,
    } : {}),
  },
  recoveryAdjustedComposition
    ? {
      sourceKind: structuredContract.sourceKind,
      schema: structuredManifest.schema,
      manifestSha256: sha256(structuredManifestBuffer),
      window: structuredContract.window,
      aggregate: {
        sha256: structuredContract.aggregate.sha256,
        bytes: structuredContract.aggregate.bytes,
        rowCount: structuredContract.aggregate.rowCount,
      },
      structuredQueryExecutions: structuredManifest.sourceMerges.structured.inputs.map((input) => ({
        queryJobId: input.queryJobId,
        querySha256: input.querySha256,
        queryTemplateSha256: input.templateSha256,
        receiptSha256: input.receiptSha256 || null,
        resultSha256: input.sha256,
      })),
      recoveryQueryExecutions: structuredManifest.sourceMerges.recovery.inputs.map((input) => ({
        queryJobId: input.queryJobId,
        querySha256: input.querySha256,
        queryTemplateSha256: input.templateSha256,
        receiptSha256: input.receiptSha256,
        resultSha256: input.sha256,
        rendererMetadataSha256: input.rendererMetadataSha256,
        parserGrammarsSha256: input.parserGrammarsSha256,
        validation: input.validation,
      })),
      replacement: structuredManifest.replacement,
      embeddedManifestSha256: sha256(`${JSON.stringify(structuredManifest, null, 2)}\n`),
      manifest: structuredManifest,
    }
    : {
      sourceKind: "structured-field-action-merge-v1",
      schema: structuredManifest.schema,
      manifestSha256: sha256(structuredManifestBuffer),
      window: structuredContract.window,
      aggregate: {
        sha256: structuredContract.aggregate.sha256,
        bytes: structuredContract.aggregate.bytes,
        rowCount: structuredContract.aggregate.rowCount,
      },
      sourceTables: [...new Set(structuredManifest.inputs.map((input) => input.sourceTable))].sort(),
      queryJobIds: structuredManifest.inputs.map((input) => input.queryJobId),
      querySha256: structuredManifest.inputs.map((input) => input.querySha256),
      queryTemplateSha256: [...new Set(structuredManifest.inputs.map((input) => input.templateSha256))].sort(),
    },
];
const stateCoverage = mergedSummary.stateCoverage;
const metadata = {
  schema: recoveryAdjustedComposition
    ? "ff-rfi-field-action-composition-v1"
    : "ff-rfi-field-action-merge-v2",
  strategy: recoveryAdjustedComposition
    ? "adjacent-historical-raw-plus-current-recovery-adjusted"
    : "adjacent-half-open-mixed-source",
  shardStrategy: "contiguous-time",
  window: {
    startInclusive: `${mergedWindowStart}T00:00:00Z`,
    endExclusive: `${mergedWindowEndExclusive}T00:00:00Z`,
    semantics: "half-open-utc",
  },
  membership: rawContract.membership,
  sources,
  inputs: sources,
  ...(recoveryAdjustedComposition ? {
    historicalManifest: rawManifest,
    currentManifest: structuredManifest,
    noOverlap: {
      historicalEndExclusive: rawContract.window.endExclusive,
      currentStartInclusive: structuredContract.window.startInclusive,
      adjacent: true,
      overlapDays: 0,
      doubleCountPrevented: true,
    },
  } : {}),
  merged: {
    sha256: sha256(mergedBuffer),
    bytes: mergedBuffer.length,
    rowCount: mergedRows.length,
    windowStartInclusive: `${mergedWindowStart}T00:00:00Z`,
    windowEndExclusive: `${mergedWindowEndExclusive}T00:00:00Z`,
    knownCards: mergedSummary.knownCards,
    totals: mergedSummary.totals,
    stateCoverage,
    ...(mergedCube ? {
      cube: mergedCube,
      componentReconciliation: {
        historicalTotals: rawSummary.totals,
        currentTotals: structuredSummary.totals,
        finalTotals: mergedSummary.totals,
        exactIntegerAddition: true,
      },
    } : {}),
  },
  privacy: {
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  },
};
const metadataText = `${JSON.stringify(metadata, null, 2)}\n`;
assertNoPrivatePayload(metadataText);
fs.writeFileSync(options.output, mergedBuffer);
fs.writeFileSync(options.metadata, metadataText, { mode: 0o600 });
process.stdout.write(`${JSON.stringify({
  output: options.output,
  metadata: options.metadata,
  schema: metadata.schema,
  rows: mergedRows.length,
  sha256: metadata.merged.sha256,
  window: metadata.window,
})}\n`);

function validateStructuredSource(manifest, manifestBuffer, aggregateBuffer) {
  if (manifest.schema === "ff-rfi-field-action-cohort-replacement-v1") {
    return validateRecoveryAdjustedCurrentSource(manifest, manifestBuffer, aggregateBuffer);
  }
  return validateStructuredMergeV1(manifest, manifestBuffer, aggregateBuffer);
}

function validateStructuredMergeV1(manifest, manifestBuffer, aggregateBuffer) {
  if (manifest.schema !== "ff-rfi-field-action-merge-v1") throw new Error("Structured source manifest must use ff-rfi-field-action-merge-v1");
  if (!Array.isArray(manifest.inputs) || !manifest.inputs.length) throw new Error("Structured source manifest has no verified inputs");
  if (!["contiguous-time", "immutable-user-id"].includes(manifest.shardStrategy)) throw new Error("Structured source shard strategy is invalid");
  const merged = manifest.merged || {};
  if (merged.sha256 !== sha256(aggregateBuffer)) throw new Error("Structured aggregate SHA-256 mismatch");
  const rows = parseCsv(aggregateBuffer.toString("utf8"), "structured aggregate", COLUMNS);
  if (Number(merged.rows) !== rows.length) throw new Error("Structured aggregate row count mismatch");
  const window = normalizeWindow(merged.windowStartInclusive, merged.windowEndExclusive, "structured source");
  const first = manifest.inputs[0];
  const membership = {
    sha256: requiredHex(first.membershipSha256, "structured membership SHA-256"),
    keysSha256: requiredHex(first.membershipKeysSha256, "structured membership-key SHA-256"),
    rows: positiveInteger(first.sourceMembershipRows, "structured membership rows"),
    uniqueUsers: positiveInteger(first.sourceUniqueUsers, "structured membership unique users"),
    cohortCounts: normalizeCohortCounts(first.membershipCohortCounts, "structured membership"),
  };
  for (const input of manifest.inputs) {
    if (!/^mcp_ch_job_[a-f0-9]{32}$/.test(String(input.queryJobId || "")) || input.executionMode !== "async") {
      throw new Error("Structured source has an invalid execution identity");
    }
    assert.deepEqual({
      sha256: input.membershipSha256,
      keysSha256: input.membershipKeysSha256,
      rows: Number(input.sourceMembershipRows),
      uniqueUsers: Number(input.sourceUniqueUsers),
      cohortCounts: normalizeCohortCounts(input.membershipCohortCounts, "structured input membership"),
    }, membership, "Structured source membership drift");
  }
  const summary = inspectRows(rows, window, membership.cohortCounts, "structured aggregate", false);
  const knownCards = normalizeKnownCards(merged.knownCards, "structured source");
  assert.deepEqual(summary.knownCards, knownCards, "Structured manifest known-card coverage drift");
  const totals = normalizeTotals(merged.totals, "structured source");
  assert.deepEqual(summary.totals, totals, "Structured manifest action totals drift");
  return {
    sourceKind: "structured-field-action-merge-v1",
    window,
    membership,
    totals,
    knownCards,
    stateCoverage: summary.stateCoverage,
    aggregate: {
      sha256: merged.sha256,
      bytes: aggregateBuffer.length,
      rowCount: rows.length,
      manifestSha256: sha256(manifestBuffer),
    },
  };
}

function validateRecoveryAdjustedCurrentSource(manifest, manifestBuffer, aggregateBuffer) {
  if (manifest.strategy !== "exact-same-window-l3top-replacement-with-l3-delta" ||
      manifest.replacedCohort !== "l3top" ||
      manifest.deltaAppliedCohort !== "l3") {
    throw new Error("Current replacement source strategy is invalid");
  }
  if (manifest.privacy?.rawHandHistoriesPublished !== false ||
      manifest.privacy?.personalIdentifiersPublished !== false) {
    throw new Error("Current replacement source does not preserve the private-data boundary");
  }
  const merged = manifest.merged || {};
  if (merged.sha256 !== sha256(aggregateBuffer)) {
    throw new Error("Current replacement aggregate SHA-256 mismatch");
  }
  if (Number(merged.bytes) !== aggregateBuffer.length) {
    throw new Error("Current replacement aggregate byte size mismatch");
  }
  const rows = parseCsv(aggregateBuffer.toString("utf8"), "current replacement aggregate", COLUMNS);
  if (Number(merged.rows) !== rows.length) {
    throw new Error("Current replacement aggregate row count mismatch");
  }
  const window = normalizeWindow(
    merged.windowStartInclusive,
    merged.windowEndExclusive,
    "current replacement source",
  );
  assert.deepEqual(manifest.window, window, "Current replacement top-level window drift");
  const membership = {
    sha256: requiredHex(manifest.membership?.sha256, "current replacement membership SHA-256"),
    keysSha256: requiredHex(
      manifest.membership?.keysSha256,
      "current replacement membership-key SHA-256",
    ),
    rows: positiveInteger(manifest.membership?.rows, "current replacement membership rows"),
    uniqueUsers: positiveInteger(
      manifest.sourceMerges?.structured?.inputs?.[0]?.sourceUniqueUsers,
      "current replacement membership unique users",
    ),
    cohortCounts: normalizeCohortCounts(
      manifest.membership?.cohortCounts,
      "current replacement membership",
    ),
  };
  if (manifest.membership?.subsetProof?.l3topIsSubsetOfL3 !== true) {
    throw new Error("Current replacement has no l3top subset-of-l3 proof");
  }
  validateCurrentReplacementProvenance(manifest, membership);
  const summary = inspectRows(
    rows,
    window,
    membership.cohortCounts,
    "current replacement aggregate",
    false,
  );
  assert.deepEqual(
    summary.knownCards,
    normalizeKnownCards(merged.knownCards, "current replacement source"),
    "Current replacement known-card coverage drift",
  );
  assert.deepEqual(
    summary.totals,
    normalizeTotals(merged.totals, "current replacement source"),
    "Current replacement action totals drift",
  );
  if (merged.cube?.rowCount !== 36_504 ||
      merged.cube?.stateCount !== 216 ||
      merged.cube?.handClassesPerState !== 169 ||
      merged.cube?.coverageReconciled !== true) {
    throw new Error("Current replacement has no complete 36,504-row cube proof");
  }
  return {
    sourceKind: "current-recovery-adjusted-cohort-replacement",
    window,
    membership,
    totals: summary.totals,
    knownCards: summary.knownCards,
    stateCoverage: summary.stateCoverage,
    aggregate: {
      sha256: merged.sha256,
      bytes: aggregateBuffer.length,
      rowCount: rows.length,
      manifestSha256: sha256(manifestBuffer),
    },
    replacement: manifest.replacement,
    sourceMerges: manifest.sourceMerges,
    provenance: manifest,
  };
}

function validateCurrentReplacementProvenance(manifest, membership) {
  const structured = manifest.sourceMerges?.structured;
  const recovery = manifest.sourceMerges?.recovery;
  if (structured?.schema !== "ff-rfi-field-action-merge-v1" ||
      recovery?.schema !== "ff-rfi-field-action-merge-v1" ||
      recovery?.sourceKind !== "missing-card-recovery-full-cube") {
    throw new Error("Current replacement nested source merges are incomplete");
  }
  for (const [source, label] of [[structured, "structured"], [recovery, "recovery"]]) {
    requiredHex(source.manifestSha256, `current ${label} merge manifest SHA-256`);
    requiredHex(source.aggregate?.sha256, `current ${label} aggregate SHA-256`);
    if (source.aggregate.sha256 !== source.merged?.sha256 ||
        Number(source.aggregate.rows) !== Number(source.merged?.rows)) {
      throw new Error(`Current ${label} aggregate and merge metadata do not reconcile`);
    }
    if (!Array.isArray(source.inputs) || !source.inputs.length) {
      throw new Error(`Current ${label} merge has no source executions`);
    }
    for (const input of source.inputs) {
      if (input.membershipSha256 !== membership.sha256 ||
          input.membershipKeysSha256 !== membership.keysSha256 ||
          Number(input.sourceMembershipRows) !== membership.rows) {
        throw new Error(`Current ${label} source membership drift`);
      }
      requiredHex(input.querySha256, `current ${label} rendered query SHA-256`);
      requiredHex(input.templateSha256, `current ${label} query template SHA-256`);
      requiredHex(input.receiptSha256, `current ${label} execution receipt SHA-256`);
      requiredHex(input.sha256, `current ${label} result SHA-256`);
      if (!/^(?:mcp_ch_job_[a-f0-9]{32}|sync:[a-f0-9]{64})$/.test(String(input.queryJobId || ""))) {
        throw new Error(`Current ${label} source execution id is invalid`);
      }
    }
  }
  for (const input of recovery.inputs) {
    if (input.sourceKind !== "missing-card-recovery-full-cube" ||
        input.handClassMode !== "structured-or-validated-raw-when-empty-v1" ||
        input.recoveryPredicate !== "latest structured_hand_class = ''" ||
        input.recoveryIsDisjoint !== true) {
      throw new Error("Current recovery source contract was substituted");
    }
    for (const [value, label] of [
      [input.rendererMetadataSha256, "renderer metadata"],
      [input.receiptSha256, "execution receipt"],
      [input.parserGrammarsSha256, "parser grammar"],
      [input.validation?.manifestSha256, "validation manifest"],
      [input.validation?.rendererMetadataSha256, "validation renderer metadata"],
      [input.validation?.renderedSqlSha256, "validation rendered SQL"],
      [input.validation?.queryTemplateSha256, "validation query template"],
      [input.validation?.resultSha256, "validation result"],
      [input.validation?.receiptSha256, "validation receipt"],
    ]) {
      requiredHex(value, `current recovery ${label} SHA-256`);
    }
    if (input.validation?.schema !== "ff-rfi-missing-card-recovery-validation-v1" ||
        Number(input.validation?.totals?.classFailures) !== 0 ||
        Number(input.validation?.networks?.iPoker?.trackerMissingRecovered) <= 0) {
      throw new Error("Current recovery validation proof is not a strict pass");
    }
  }
  if (manifest.replacement?.l3top?.recoveryDominatesExactly !== true ||
      manifest.replacement?.l3top?.recoveryProjectionSha256 !==
        manifest.replacement?.l3top?.finalProjectionSha256 ||
      manifest.replacement?.l3Delta?.exactCells !== 9_126 ||
      manifest.replacement?.l3Delta?.stateCount !== 54 ||
      manifest.replacement?.l3Delta?.nonnegativePerCell !== true ||
      manifest.replacement?.l3Delta?.appliedExactly !== true ||
      manifest.replacement?.l3Delta?.eligibleCoverageChanged !== false) {
    throw new Error("Current replacement l3top/l3 delta proof is incomplete");
  }
  for (const cohort of ["l2", "l1"]) {
    const preserved = manifest.replacement?.preserved?.[cohort];
    if (preserved?.exact !== true ||
        preserved.sourceProjectionSha256 !== preserved.finalProjectionSha256) {
      throw new Error(`Current replacement did not preserve ${cohort} exactly`);
    }
  }
}

function validateRawSource(manifest, manifestBuffer, aggregateBuffer, requireHistoricalNetworkGate) {
  if (manifest.schema !== "ff-rfi-raw-hh-aggregate-v1" || manifest.sourceKind !== "raw-hh-local-aggregate") {
    throw new Error("Raw source manifest must use ff-rfi-raw-hh-aggregate-v1");
  }
  const window = normalizeWindow(manifest.window?.startInclusive, manifest.window?.endExclusive, "raw-HH source");
  if (manifest.window?.semantics !== "half-open-utc") throw new Error("Raw-HH source window semantics must be half-open-utc");
  if (manifest.source?.table !== "analytics.stg_hh_texts__hh_texts") throw new Error("Raw-HH source table is invalid");
  if (manifest.source?.execution?.executionMode !== "async" ||
      !/^mcp_ch_job_[a-f0-9]{32}$/.test(String(manifest.source?.execution?.queryJobId || ""))) {
    throw new Error("Raw-HH source execution identity is invalid");
  }
  for (const [value, label] of [
    [manifest.source?.execution?.querySha256, "raw query SHA-256"],
    [manifest.source?.execution?.queryTemplateSha256, "raw query-template SHA-256"],
    [manifest.source?.execution?.receiptSha256, "raw source-receipt SHA-256"],
    [manifest.source?.export?.sha256, "raw export SHA-256"],
    [manifest.transform?.parserSha256, "raw parser SHA-256"],
    [manifest.transform?.aggregatorSha256, "raw aggregator SHA-256"],
    [manifest.validation?.reportSha256, "raw validation report SHA-256"],
  ]) requiredHex(value, label);
  if (manifest.validation?.status !== "passed" || Number(manifest.validation?.rejected) !== 0) {
    throw new Error("Raw-HH validation report is not a strict pass");
  }
  if (requireHistoricalNetworkGate) {
    assert.deepEqual(
      Object.keys(manifest.validation?.networks || {}).sort(),
      [...HISTORICAL_RAW_PARSER_NETWORKS].sort(),
      "Raw-HH validation must cover exactly the seven approved historical parser networks",
    );
    for (const network of HISTORICAL_RAW_PARSER_NETWORKS) {
      const stats = manifest.validation.networks[network];
      if (!Number.isSafeInteger(Number(stats?.rows)) || Number(stats.rows) <= 0) {
        throw new Error(`Raw-HH validation network ${network} has no compared rows`);
      }
      for (const check of HISTORICAL_VALIDATION_CHECKS) {
        const compared = Number(stats.checks?.[check]?.compared);
        const matched = Number(stats.checks?.[check]?.matched);
        if (!Number.isSafeInteger(compared) || compared < 0 || matched !== compared ||
            (check !== "shove" && compared !== Number(stats.rows))) {
          throw new Error(`Raw-HH validation network ${network} failed ${check}`);
        }
      }
    }
  }
  if (manifest.privacy?.rawHandHistoriesPublished !== false || manifest.privacy?.personalIdentifiersPublished !== false) {
    throw new Error("Raw-HH source manifest does not preserve the private-data boundary");
  }
  const aggregate = manifest.aggregate || {};
  if (aggregate.sha256 !== sha256(aggregateBuffer)) throw new Error("Raw aggregate SHA-256 mismatch");
  if (Number(aggregate.bytes) !== aggregateBuffer.length) throw new Error("Raw aggregate byte size mismatch");
  const rows = parseCsv(aggregateBuffer.toString("utf8"), "raw aggregate", COLUMNS);
  if (Number(aggregate.rowCount) !== rows.length) throw new Error("Raw aggregate row count mismatch");
  const membership = {
    sha256: requiredHex(manifest.membership?.sha256, "raw membership SHA-256"),
    keysSha256: requiredHex(manifest.membership?.keysSha256, "raw membership-key SHA-256"),
    rows: positiveInteger(manifest.membership?.rows, "raw membership rows"),
    uniqueUsers: positiveInteger(manifest.membership?.uniqueUsers, "raw membership unique users"),
    cohortCounts: normalizeCohortCounts(manifest.membership?.cohortCounts, "raw membership"),
  };
  const summary = inspectRows(rows, window, membership.cohortCounts, "raw aggregate", true);
  const totals = normalizeTotals(manifest.totals, "raw source");
  const knownCards = normalizeKnownCards(manifest.knownCards, "raw source");
  const stateCoverage = normalizeStateCoverage(manifest.stateCoverage, "raw source");
  assert.deepEqual(summary.totals, totals, "Raw manifest action totals drift");
  assert.deepEqual(summary.knownCards, knownCards, "Raw manifest known-card coverage drift");
  assert.deepEqual(summary.stateCoverage, stateCoverage, "Raw manifest state coverage drift");
  return {
    window,
    membership,
    totals,
    knownCards,
    stateCoverage,
    aggregate: {
      sha256: aggregate.sha256,
      bytes: Number(aggregate.bytes),
      rowCount: rows.length,
      manifestSha256: sha256(manifestBuffer),
    },
  };
}

function inspectRows(rows, window, cohortCounts, input, requireNoLookupMismatch) {
  if (!rows.length) throw new Error(`${input}: aggregate is empty`);
  const start = dateOnly(window.startInclusive);
  const endExclusive = dateOnly(window.endExclusive);
  const end = previousDate(endExclusive);
  const keys = new Set();
  const states = new Map();
  const totals = emptyTotals();
  for (const [index, row] of rows.entries()) {
    const location = `${input}:${index + 2}`;
    if (row.window_start !== start || row.window_end !== end) throw new Error(`${location}: aggregate window drift`);
    if (row.table_filter !== "cnt_players = 7" || integer(row.table_size, "table_size", location) !== 7) throw new Error(`${location}: source is not exact 7-max`);
    if (!COHORTS.includes(row.cohort)) throw new Error(`${location}: unexpected cohort`);
    if (integer(row.cohort_selected_players, "cohort_selected_players", location) !== cohortCounts[row.cohort]) throw new Error(`${location}: cohort count drift`);
    const position = POSITIONS[row.position_group];
    if (!position || integer(row.position_order, "position_order", location) !== position.order || integer(row.position_code, "position_code", location) !== position.code) {
      throw new Error(`${location}: position map drift`);
    }
    if (!Object.hasOwn(STACKS, row.stack_bucket) || integer(row.stack_order, "stack_order", location) !== STACKS[row.stack_bucket]) throw new Error(`${location}: stack map drift`);
    if (!HANDS.has(row.hand_class)) throw new Error(`${location}: unexpected hand class ${row.hand_class}`);
    const grain = DIMENSIONS.map((column) => row[column]).join("|");
    if (keys.has(grain)) throw new Error(`${location}: duplicate grain ${grain}`);
    keys.add(grain);
    const values = Object.fromEntries(COUNTERS.map((counter) => [counter, integer(row[counter], counter, location)]));
    if (values.raises_total !== values.regular_raise + values.open_shove) throw new Error(`${location}: raise partition mismatch`);
    if (values.opportunities !== values.raises_total + values.limp + values.fold_other) throw new Error(`${location}: action partition mismatch`);
    if (values.open_shove !== values.shove_allin_flag + values.shove_effective_amount_only) throw new Error(`${location}: shove partition mismatch`);
    if (values.normal_three_bb_as_shove !== 0) throw new Error(`${location}: normal 2.5–3.5 BB open was classified as shove`);
    validateDerived(row, values, location);
    for (const counter of COUNTERS) totals[counter] += values[counter];
    const stateKey = stateKeyFor(row);
    const state = {
      cohort: row.cohort,
      position: row.position_group,
      positionOrder: position.order,
      positionCode: position.code,
      stack: row.stack_bucket,
      stackOrder: STACKS[row.stack_bucket],
      eligible: integer(row.eligible_opportunities, "eligible_opportunities", location),
      known: integer(row.known_card_opportunities, "known_card_opportunities", location),
      lookupMismatch: integer(row.lookup_mismatch_opportunities, "lookup_mismatch_opportunities", location),
      firstObservedAt: row.first_observed_at,
      lastObservedAt: row.last_observed_at,
      opportunities: 0,
    };
    if (state.eligible < state.known || state.known <= 0) throw new Error(`${location}: invalid state coverage`);
    if (requireNoLookupMismatch && state.lookupMismatch !== 0) throw new Error(`${location}: raw source has tracker lookup mismatches`);
    validateObservation(state.firstObservedAt, start, endExclusive, `${location}: first observation`);
    validateObservation(state.lastObservedAt, start, endExclusive, `${location}: last observation`);
    if (state.firstObservedAt > state.lastObservedAt) throw new Error(`${location}: reversed observation bounds`);
    const existing = states.get(stateKey);
    if (existing) {
      assert.deepEqual({ ...existing, opportunities: 0 }, { ...state, opportunities: 0 }, `${location}: repeated state coverage drift`);
      existing.opportunities += values.opportunities;
    } else {
      state.opportunities = values.opportunities;
      states.set(stateKey, state);
    }
  }
  for (const [stateKey, state] of states) {
    if (state.known !== state.opportunities) throw new Error(`${input}: ${stateKey} known-card coverage does not reconcile`);
  }
  const stateCoverage = [...states.values()].sort(compareState);
  const knownCards = stateCoverage.reduce((result, state) => {
    result.eligible += state.eligible;
    result.known += state.known;
    result.lookupMismatch += state.lookupMismatch;
    return result;
  }, { eligible: 0, known: 0, lookupMismatch: 0 });
  knownCards.pct = Number((knownCards.known / knownCards.eligible * 100).toFixed(6));
  return { totals, knownCards, stateCoverage };
}

function validateCompleteCube(rows, summary, label) {
  if (rows.length !== 36_504) throw new Error(`${label} must contain exactly 36,504 rows`);
  if (summary.stateCoverage.length !== 216) throw new Error(`${label} must contain exactly 216 states`);
  const states = new Map();
  const grains = [];
  for (const row of rows) {
    const stateKey = stateKeyFor(row);
    if (!states.has(stateKey)) states.set(stateKey, new Set());
    states.get(stateKey).add(row.hand_class);
    grains.push(DIMENSIONS.map((column) => row[column]).join("|"));
  }
  const expectedStates = new Set();
  for (const cohort of COHORTS) {
    for (const [position, contract] of Object.entries(POSITIONS)) {
      for (const [stack, stackOrder] of Object.entries(STACKS)) {
        expectedStates.add([
          cohort,
          position,
          contract.order,
          contract.code,
          stack,
          stackOrder,
        ].join("|"));
      }
    }
  }
  assert.deepEqual(new Set(states.keys()), expectedStates, `${label} state dimensions are incomplete`);
  for (const [stateKey, hands] of states) {
    if (hands.size !== 169) throw new Error(`${label} state ${stateKey} is not 169/169`);
    assert.deepEqual([...hands].sort(), [...HANDS].sort(), `${label} state ${stateKey} hand set drift`);
  }
  return {
    rowCount: rows.length,
    stateCount: states.size,
    handClassesPerState: 169,
    grainSha256: sha256(grains.sort().join("\n")),
    coverageReconciled: true,
  };
}

function normalizeWindow(startInclusive, endExclusive, label) {
  if (!/^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(String(startInclusive || "")) ||
      !/^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(String(endExclusive || "")) ||
      startInclusive >= endExclusive) {
    throw new Error(`${label} has an invalid half-open UTC window`);
  }
  return { startInclusive, endExclusive, semantics: "half-open-utc" };
}

function normalizeCohortCounts(raw, label) {
  if (!raw || Object.keys(raw).sort().join("|") !== [...COHORTS].sort().join("|")) throw new Error(`${label} cohort counts are incomplete`);
  return Object.fromEntries(COHORTS.map((cohort) => [cohort, positiveInteger(raw[cohort], `${label} ${cohort}`)]));
}

function normalizeTotals(raw, label) {
  if (!raw) throw new Error(`${label} totals are missing`);
  return Object.fromEntries(COUNTERS.map((counter) => [counter, nonNegativeInteger(raw[counter], `${label} ${counter}`)]));
}

function normalizeKnownCards(raw, label) {
  if (!raw) throw new Error(`${label} known-card coverage is missing`);
  const eligible = nonNegativeInteger(raw.eligible, `${label} eligible`);
  const known = positiveInteger(raw.known, `${label} known`);
  const lookupMismatch = nonNegativeInteger(raw.lookupMismatch, `${label} lookupMismatch`);
  const pctValue = Number(raw.pct);
  if (eligible < known || !Number.isFinite(pctValue) || Math.abs(pctValue - known / eligible * 100) > 0.000001) {
    throw new Error(`${label} known-card coverage is invalid`);
  }
  return { eligible, known, lookupMismatch, pct: pctValue };
}

function normalizeStateCoverage(raw, label) {
  if (!Array.isArray(raw) || !raw.length) throw new Error(`${label} state coverage is missing`);
  return raw.map((state, index) => ({
    cohort: state.cohort,
    position: state.position,
    positionOrder: positiveInteger(state.positionOrder, `${label}[${index}] positionOrder`),
    positionCode: nonNegativeInteger(state.positionCode, `${label}[${index}] positionCode`),
    stack: state.stack,
    stackOrder: positiveInteger(state.stackOrder, `${label}[${index}] stackOrder`),
    eligible: nonNegativeInteger(state.eligible, `${label}[${index}] eligible`),
    known: positiveInteger(state.known, `${label}[${index}] known`),
    lookupMismatch: nonNegativeInteger(state.lookupMismatch, `${label}[${index}] lookupMismatch`),
    firstObservedAt: state.firstObservedAt,
    lastObservedAt: state.lastObservedAt,
    opportunities: positiveInteger(state.opportunities, `${label}[${index}] opportunities`),
  })).sort(compareState);
}

function validateDerived(row, values, location) {
  const rates = [
    values.raises_total,
    values.regular_raise,
    values.open_shove,
    values.limp,
    values.fold_other,
  ].map((value) => pct(value, values.opportunities));
  for (let index = 0; index < RATE_COLUMNS.length; index += 1) {
    const actual = Number(row[RATE_COLUMNS[index]]);
    if (!Number.isFinite(actual) || Math.abs(actual - Number(rates[index])) > 0.001000001) throw new Error(`${location}: stale ${RATE_COLUMNS[index]}`);
  }
  if (Number(row.below_exact_minimum) !== Number(values.opportunities < 50)) throw new Error(`${location}: stale below_exact_minimum`);
  if (Number(row.low_sample) !== Number(values.opportunities < 100)) throw new Error(`${location}: stale low_sample`);
}

function parseCsv(text, input, expectedHeader = null) {
  const parsed = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === "\"" && text[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else if (character === "\"") quoted = false;
      else cell += character;
    } else if (character === "\"") quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      parsed.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (quoted) throw new Error(`${input}: unterminated quoted CSV field`);
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    parsed.push(row);
  }
  const header = parsed.shift() || [];
  if (expectedHeader) assert.deepEqual(header, expectedHeader, `${input}: unexpected aggregate CSV columns`);
  if (new Set(header).size !== header.length) throw new Error(`${input}: duplicate CSV columns`);
  return parsed.filter((values) => values.some(Boolean)).map((values, index) => {
    if (values.length !== header.length) throw new Error(`${input}:${index + 2}: malformed CSV row`);
    return Object.fromEntries(header.map((column, columnIndex) => [column, values[columnIndex] ?? ""]));
  });
}

function stateKeyFor(row) {
  return ["cohort", "position_group", "position_order", "position_code", "stack_bucket", "stack_order"]
    .map((column) => row[column]).join("|");
}

function compareAggregateRows(left, right) {
  return COHORTS.indexOf(left.cohort) - COHORTS.indexOf(right.cohort)
    || Number(left.stack_order) - Number(right.stack_order)
    || Number(left.position_order) - Number(right.position_order)
    || left.hand_class.localeCompare(right.hand_class);
}

function compareState(left, right) {
  return COHORTS.indexOf(left.cohort) - COHORTS.indexOf(right.cohort)
    || left.stackOrder - right.stackOrder
    || left.positionOrder - right.positionOrder;
}

function validateObservation(value, start, endExclusive, label) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/);
  if (!match || match[1] < start || match[1] >= endExclusive) throw new Error(`${label} is outside the source window`);
}

function parseOptions(args) {
  return Object.fromEntries(args.map((argument) => {
    const match = argument.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Expected --key=value, got ${argument}`);
    return [match[1], match[2]];
  }));
}

function integer(value, label, location) {
  if (!/^\d+$/.test(String(value))) throw new Error(`${location}: invalid ${label}`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${location}: unsafe ${label}`);
  return parsed;
}

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer`);
  return parsed;
}

function nonNegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer`);
  return parsed;
}

function requiredHex(value, label) {
  if (!/^[a-f0-9]{64}$/.test(String(value || ""))) throw new Error(`${label} is invalid`);
  return value;
}

function emptyTotals() {
  return Object.fromEntries(COUNTERS.map((counter) => [counter, 0]));
}

function pct(value, total) {
  if (!total) return "0";
  return (value / total * 100).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function dateOnly(timestamp) {
  return String(timestamp).slice(0, 10);
}

function previousDate(value) {
  return new Date(Date.parse(`${value}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
}

function minText(left, right) {
  return !left || right < left ? right : left;
}

function maxText(left, right) {
  return !left || right > left ? right : left;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
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
  if (hands.size !== 169) throw new Error("Canonical hand-class contract changed");
  return hands;
}

function assertNoPrivatePayload(text) {
  for (const pattern of [
    /\bDealt to\b/i,
    /PokerStars Hand #/i,
    /<game\b/i,
    /<player\b/i,
    /"nickname"\s*:/i,
    /"hh_text[^"]*"\s*:/i,
    /"check_user_id"\s*:/i,
    /"converted_hh_id"\s*:/i,
  ]) {
    if (pattern.test(text)) throw new Error(`Mixed-source manifest contains private payload matching ${pattern}`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
