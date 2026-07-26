#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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
const RATE_COLUMNS = [
  "raise_total_pct", "regular_raise_pct", "open_shove_pct", "limp_pct",
  "fold_pct",
];
const HANDS = canonicalHands();
const PUBLIC_NOVEL_SOURCE_KIND = "publication-safe-novel-raw-hh-l3top";
const DIRECT_NOVEL_STRATEGY =
  "approved-plan-source-union-with-observed-zero-dimension-completion";
const COMPOSED_NOVEL_STRATEGY =
  "disjoint-approved-source-set-supplement-union-v1";
const SAFE_NOVEL_PRIVACY = Object.freeze({
  aggregateOnly: true,
  noRawHandHistories: true,
  noPlayerLevelRows: true,
  noUserIds: true,
});

const options = parseOptions(process.argv.slice(2));
for (const required of [
  "current-aggregate", "current-metadata", "supplement-aggregate",
  "supplement-metadata", "membership", "output", "metadata",
]) {
  if (!options[required]) throw new Error(`Missing --${required}`);
}

const currentAggregateBuffer = fs.readFileSync(options["current-aggregate"]);
const currentMetadataBuffer = fs.readFileSync(options["current-metadata"]);
const supplementAggregateBuffer = fs.readFileSync(options["supplement-aggregate"]);
const supplementMetadataBuffer = fs.readFileSync(options["supplement-metadata"]);
const membershipBuffer = fs.readFileSync(options.membership);
const currentMetadata = JSON.parse(currentMetadataBuffer.toString("utf8"));
const supplementMetadata = JSON.parse(supplementMetadataBuffer.toString("utf8"));
const membership = inspectMembership(
  membershipBuffer.toString("utf8"),
  options.membership,
);
const currentRows = parseCsv(
  currentAggregateBuffer.toString("utf8"),
  options["current-aggregate"],
  COLUMNS,
);
const supplementRows = parseCsv(
  supplementAggregateBuffer.toString("utf8"),
  options["supplement-aggregate"],
  COLUMNS,
);
const current = inspectCube(
  currentRows,
  options["current-aggregate"],
  COHORTS,
  membership,
);
const supplement = inspectCube(
  supplementRows,
  options["supplement-aggregate"],
  ["l3top"],
  membership,
  { exactNovelRaw: true },
);
assert.equal(currentRows.length, 36_504, "Current cube must contain 36,504 rows");
assert.equal(supplementRows.length, 9_126, "Supplement cube must contain 9,126 rows");
assert.deepEqual(current.window, supplement.window, "Current/supplement source windows differ");
assert.deepEqual(
  current.window,
  { start: "2023-09-01", end: "2026-07-25" },
  "Current/supplement sources must use the closed through-Jul-25 window",
);

validateCurrentMetadata({
  metadata: currentMetadata,
  metadataBuffer: currentMetadataBuffer,
  aggregateBuffer: currentAggregateBuffer,
  cube: current,
  membership,
  membershipBuffer,
});
validateSupplementMetadata({
  metadata: supplementMetadata,
  metadataBuffer: supplementMetadataBuffer,
  aggregateBuffer: supplementAggregateBuffer,
  cube: supplement,
  membership,
  membershipBuffer,
});
const safeBaseInputs = (currentMetadata.inputs || []).map(projectBaseInput);
const safeSupplementInputs = supplementMetadata.inputs.map(projectNovelInput);
const safeSourceMerges = projectSourceMerges(
  currentMetadata.sourceMerges,
  safeBaseInputs,
);
const supplementIsDirect = supplementMetadata.schema !==
  "ff-rfi-field-action-novel-raw-supplement-composition-v1";
assert.deepEqual(
  currentMetadata.membership.cohortCounts,
  supplementMetadata.membership.cohortCounts,
  "Current/supplement membership cohort counts differ",
);
for (const userId of membership.userSets.l3top) {
  assert.ok(membership.userSets.l3.has(userId), "Every l3top member must belong to l3");
}

const supplementCells = new Map();
for (const row of supplementRows) {
  supplementCells.set(cellKeyWithoutCohort(row), row);
}
const supplementStates = new Map();
for (const state of supplement.states.values()) {
  supplementStates.set(stateKeyWithoutCohort(state), state);
}
assert.equal(supplementCells.size, 9_126, "Supplement cell projection is incomplete");
assert.equal(supplementStates.size, 54, "Supplement state projection is incomplete");

const finalRows = currentRows.map((row) => {
  if (row.cohort === "l2" || row.cohort === "l1") return { ...row };
  const delta = supplementCells.get(cellKeyWithoutCohort(row));
  const stateDelta = supplementStates.get(stateKeyWithoutCohort(row));
  assert.ok(delta, `Missing supplement cell ${cellKeyWithoutCohort(row)}`);
  assert.ok(stateDelta, `Missing supplement state ${stateKeyWithoutCohort(row)}`);
  const counters = Object.fromEntries(COUNTERS.map((counter) => [
    counter,
    Number(row[counter]) + Number(delta[counter]),
  ]));
  return withDerived({
    ...row,
    eligible_opportunities:
      Number(row.eligible_opportunities) + stateDelta.eligible,
    known_card_opportunities:
      Number(row.known_card_opportunities) + stateDelta.known,
    lookup_mismatch_opportunities: Number(row.lookup_mismatch_opportunities),
    first_observed_at: minTimestamp(row.first_observed_at, stateDelta.firstObservedAt),
    last_observed_at: maxTimestamp(row.last_observed_at, stateDelta.lastObservedAt),
    ...counters,
  });
});
finalRows.sort(compareRows);

const outputText = `${COLUMNS.join(",")}\n${
  finalRows
    .map((row) => COLUMNS.map((column) => csvCell(row[column])).join(","))
    .join("\n")
}\n`;
const outputBuffer = Buffer.from(outputText);
const final = inspectCube(
  parseCsv(outputText, options.output, COLUMNS),
  options.output,
  COHORTS,
  membership,
);
assert.equal(final.rows.length, 36_504, "Supplemented output is not a complete cube");

for (const cohort of ["l2", "l1"]) {
  assert.equal(
    projectionSha(final.rows.filter((row) => row.cohort === cohort)),
    projectionSha(current.rows.filter((row) => row.cohort === cohort)),
    `${cohort} changed while applying the l3top supplement`,
  );
  assert.deepEqual(
    final.totalsByCohort[cohort],
    current.totalsByCohort[cohort],
    `${cohort} counters changed while applying the l3top supplement`,
  );
}

const deltaTotals = supplement.totalsByCohort.l3top;
const supplementEligibleDelta = [...supplement.states.values()]
  .reduce((sum, state) => sum + state.eligible, 0);
const supplementKnownDelta = [...supplement.states.values()]
  .reduce((sum, state) => sum + state.known, 0);
assert.equal(
  supplementEligibleDelta,
  deltaTotals.opportunities,
  "Supplement eligible delta does not equal exact cell opportunities",
);
assert.equal(
  supplementKnownDelta,
  deltaTotals.opportunities,
  "Supplement known delta does not equal exact cell opportunities",
);
for (const cohort of ["l3top", "l3"]) {
  assert.deepEqual(
    subtractTotals(final.totalsByCohort[cohort], current.totalsByCohort[cohort]),
    deltaTotals,
    `${cohort} did not receive the exact supplement counters`,
  );
  const finalStates = statesForCohort(final, cohort);
  const currentStates = statesForCohort(current, cohort);
  for (const [key, delta] of supplementStates) {
    const finalState = finalStates.get(key);
    const currentState = currentStates.get(key);
    assert.ok(finalState && currentState, `${cohort}: missing state ${key}`);
    assert.equal(
      finalState.eligible - currentState.eligible,
      delta.eligible,
      `${cohort}: eligible delta drift for ${key}`,
    );
    assert.equal(
      finalState.known - currentState.known,
      delta.known,
      `${cohort}: known delta drift for ${key}`,
    );
    assert.equal(
      finalState.lookupMismatch - currentState.lookupMismatch,
      0,
      `${cohort}: lookup mismatch changed for ${key}`,
    );
  }
}

const topDeltaProjection = deltaProjection(
  current,
  final,
  "l3top",
);
const l3DeltaProjection = deltaProjection(
  current,
  final,
  "l3",
);
assert.equal(
  topDeltaProjection.sha256,
  l3DeltaProjection.sha256,
  "Parent l3 delta is not an exact clone of l3top supplement delta",
);
assert.equal(topDeltaProjection.cells, 9_126, "l3top delta cell count drift");
assert.equal(l3DeltaProjection.cells, 9_126, "l3 delta cell count drift");

const metadata = {
  schema: "ff-rfi-field-action-current-supplement-v1",
  strategy: "exact-same-window-novel-raw-l3top-supplement-with-l3-delta",
  supplementedCohort: "l3top",
  deltaAppliedCohort: "l3",
  window: {
    startInclusive: `${final.window.start}T00:00:00Z`,
    endExclusive: `${nextDay(final.window.end)}T00:00:00Z`,
    semantics: "half-open-utc",
  },
  membership: {
    sha256: sha256(membershipBuffer),
    keysSha256: membership.keysSha256,
    rows: membership.rows.length,
    cohortCounts: membership.cohortCounts,
    subsetProof: {
      l3topMembers: membership.userSets.l3top.size,
      l3Members: membership.userSets.l3.size,
      l3topIsSubsetOfL3: true,
    },
  },
  baseCurrent: {
    schema: currentMetadata.schema,
    strategy: currentMetadata.strategy,
    manifestSha256: sha256(currentMetadataBuffer),
    aggregate: {
      sha256: sha256(currentAggregateBuffer),
      bytes: currentAggregateBuffer.length,
      rows: currentRows.length,
    },
    sourceMerges: safeSourceMerges,
    replacement: projectReplacement(currentMetadata.replacement),
  },
  supplementSource: {
    schema: supplementIsDirect
      ? "ff-rfi-field-action-novel-raw-supplement-merge-v1"
      : "ff-rfi-field-action-novel-raw-supplement-composition-v1",
    sourceKind: PUBLIC_NOVEL_SOURCE_KIND,
    strategy: supplementIsDirect
      ? DIRECT_NOVEL_STRATEGY
      : COMPOSED_NOVEL_STRATEGY,
    manifestSha256: sha256(supplementMetadataBuffer),
    aggregate: {
      sha256: sha256(supplementAggregateBuffer),
      bytes: supplementAggregateBuffer.length,
      rows: supplementRows.length,
    },
    plan: supplementMetadata.plan,
    parserValidation: supplementMetadata.parserValidation,
    inputs: safeSupplementInputs,
    densification: supplementMetadata.densification,
  },
  inputs: [
    ...safeBaseInputs,
    ...safeSupplementInputs,
  ],
  supplement: {
    l3topAdditive: {
      exactCells: topDeltaProjection.cells,
      stateCount: supplement.states.size,
      counters: deltaTotals,
      eligibleDelta: supplementEligibleDelta,
      knownCardDelta: supplementKnownDelta,
      opportunitiesDelta: deltaTotals.opportunities,
      lookupMismatchDelta: 0,
      deltaProjectionSha256: topDeltaProjection.sha256,
      nonnegativePerCell: true,
      appliedExactly: true,
    },
    l3Delta: {
      exactCells: l3DeltaProjection.cells,
      stateCount: supplement.states.size,
      counters: deltaTotals,
      eligibleDelta: supplementEligibleDelta,
      knownCardDelta: supplementKnownDelta,
      opportunitiesDelta: deltaTotals.opportunities,
      lookupMismatchDelta: 0,
      deltaProjectionSha256: l3DeltaProjection.sha256,
      cloneEqualsL3top: true,
      nonnegativePerCell: true,
      appliedExactly: true,
    },
    preserved: Object.fromEntries(["l2", "l1"].map((cohort) => [
      cohort,
      {
        rows: current.rows.filter((row) => row.cohort === cohort).length,
        sourceProjectionSha256: projectionSha(
          current.rows.filter((row) => row.cohort === cohort),
        ),
        finalProjectionSha256: projectionSha(
          final.rows.filter((row) => row.cohort === cohort),
        ),
        counters: current.totalsByCohort[cohort],
        exact: true,
      },
    ])),
  },
  merged: {
    file: "current-field-action-with-novel-raw-supplement.csv",
    rows: finalRows.length,
    sha256: sha256(outputBuffer),
    bytes: outputBuffer.length,
    windowStartInclusive: `${final.window.start}T00:00:00Z`,
    windowEndExclusive: `${nextDay(final.window.end)}T00:00:00Z`,
    knownCards: final.knownCards,
    totals: final.totals,
    cube: {
      stateCount: final.states.size,
      rowCount: finalRows.length,
      handClassesPerState: 169,
      coverageReconciled: true,
    },
  },
  privacy: {
    aggregateOnly: true,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  },
};
const metadataText = `${JSON.stringify(metadata, null, 2)}\n`;
assertNoPrivatePayload(outputText, "Supplemented aggregate");
assertNoPrivatePayload(metadataText, "Supplemented manifest");
fs.writeFileSync(options.output, outputBuffer, { mode: 0o600 });
fs.writeFileSync(options.metadata, metadataText, { mode: 0o600 });
process.stdout.write(`${JSON.stringify({
  rows: finalRows.length,
  supplementOpportunities: deltaTotals.opportunities,
  l3CloneEqualsL3top: true,
  sha256: metadata.merged.sha256,
})}\n`);

function validateCurrentMetadata({
  metadata,
  metadataBuffer,
  aggregateBuffer,
  cube,
  membership,
  membershipBuffer,
}) {
  assert.equal(
    metadata.schema,
    "ff-rfi-field-action-cohort-replacement-v1",
    "Current source is not the recovery-adjusted replacement cube",
  );
  assert.equal(
    metadata.strategy,
    "exact-same-window-l3top-replacement-with-l3-delta",
    "Current replacement strategy drift",
  );
  validateMergedMetadata(metadata.merged, aggregateBuffer, cube, "Current");
  validateMetadataMembership(metadata.membership, membership, membershipBuffer, "Current");
  assert.deepEqual(
    metadata.window,
    {
      startInclusive: `${cube.window.start}T00:00:00Z`,
      endExclusive: `${nextDay(cube.window.end)}T00:00:00Z`,
      semantics: "half-open-utc",
    },
    "Current metadata window drift",
  );
  assert.equal(metadata.replacedCohort, "l3top", "Current replaced cohort drift");
  assert.equal(metadata.deltaAppliedCohort, "l3", "Current parent cohort drift");
  assert.equal(
    metadata.replacement?.l3top?.recoveryDominatesExactly,
    true,
    "Current recovery replacement proof is incomplete",
  );
  assert.equal(
    metadata.replacement?.l3top?.finalProjectionSha256,
    projectionSha(cube.rows.filter((row) => row.cohort === "l3top")),
    "Current l3top projection hash drift",
  );
  assert.equal(
    metadata.replacement?.l3Delta?.exactCells,
    9_126,
    "Current replacement l3 delta cell count drift",
  );
  assert.equal(
    metadata.replacement?.l3Delta?.stateCount,
    54,
    "Current replacement l3 delta state count drift",
  );
  assert.equal(
    metadata.replacement?.l3Delta?.nonnegativePerCell,
    true,
    "Current replacement delta is not nonnegative",
  );
  assert.equal(
    metadata.replacement?.l3Delta?.appliedExactly,
    true,
    "Current replacement delta was not applied exactly",
  );
  assert.equal(
    metadata.replacement?.l3Delta?.eligibleCoverageChanged,
    false,
    "Current recovery replacement changed eligible coverage",
  );
  for (const cohort of ["l2", "l1"]) {
    assert.equal(
      metadata.replacement?.preserved?.[cohort]?.exact,
      true,
      `Current ${cohort} preservation proof is missing`,
    );
    assert.equal(
      metadata.replacement?.preserved?.[cohort]?.finalProjectionSha256,
      projectionSha(cube.rows.filter((row) => row.cohort === cohort)),
      `Current ${cohort} projection hash drift`,
    );
  }
  for (const source of Object.values(metadata.sourceMerges || {})) {
    requiredHex(source.manifestSha256, "Current nested manifest hash");
    requiredHex(source.aggregate?.sha256, "Current nested aggregate hash");
  }
  assert.match(sha256(metadataBuffer), /^[a-f0-9]{64}$/);
  validatePrivacy(metadata.privacy, "Current");
}

function validateSupplementMetadata({
  metadata,
  metadataBuffer,
  aggregateBuffer,
  cube,
  membership,
  membershipBuffer,
}) {
  assert.ok(
    [
      "ff-rfi-field-action-novel-raw-supplement-merge-v1",
      "ff-rfi-field-action-novel-raw-supplement-composition-v1",
      "ff-rfi-coin-party-publication-merge-v2",
    ].includes(metadata.schema),
    "Unexpected supplement schema",
  );
  const direct = metadata.schema !==
    "ff-rfi-field-action-novel-raw-supplement-composition-v1";
  assert.equal(metadata.sourceKind, PUBLIC_NOVEL_SOURCE_KIND, "Unexpected supplement source kind");
  assert.equal(
    metadata.strategy,
    direct ? DIRECT_NOVEL_STRATEGY : COMPOSED_NOVEL_STRATEGY,
    "Unexpected supplement merge strategy",
  );
  validateMergedMetadata(metadata.merged, aggregateBuffer, cube, "Supplement");
  validateMetadataMembership(metadata.membership, membership, membershipBuffer, "Supplement");
  assert.equal(metadata.plan?.sourceSetComplete, true, "Supplement source set is incomplete");
  assert.equal(metadata.plan?.exactDisjointUserUnion, true, "Supplement users are not a disjoint union");
  assert.equal(metadata.plan?.targetFilter, false, "Target-filtered supplement is forbidden");
  assert.equal(
    metadata.plan?.expectedExecutions,
    metadata.inputs?.length,
    "Supplement execution count drift",
  );
  assert.equal(metadata.parserValidation?.gatePassed, true, "Supplement parser gate failed");
  assert.equal(
    metadata.parserValidation?.exactMismatchTolerance,
    0,
    "Supplement parser mismatch tolerance is nonzero",
  );
  requiredHex(metadata.parserValidation?.sha256, "Supplement parser validation hash");
  requiredHex(metadata.aggregateTemplateSha256, "Supplement aggregate template hash");
  assert.equal(
    metadata.densification?.absentDimensionsMaterializedAsObservedZero,
    true,
    "Supplement does not prove observed-zero dimension completion",
  );
  assert.equal(metadata.densification?.smoothingApplied, false, "Supplement used smoothing");
  assert.equal(metadata.densification?.modeledValuesApplied, false, "Supplement used modeled values");
  assert.equal(
    metadata.densification?.canonicalOutputCells,
    9_126,
    "Supplement canonical output cell count drift",
  );
  assert.ok(Array.isArray(metadata.inputs) && metadata.inputs.length, "Supplement inputs are missing");
  const jobs = new Set();
  for (const input of metadata.inputs) {
    assert.equal(
      ["coin-party-publication-v2", "immutable-plan-raw-hh-v5"].includes(input.sourceKind),
      true,
      "Supplement contains a substituted source kind",
    );
    assert.match(
      input.queryJobId || "",
      /^mcp_ch_job_[a-f0-9]{32,}$/,
      "Supplement query job id is invalid",
    );
    assert.ok(!jobs.has(input.queryJobId), "Supplement query job id is duplicated");
    jobs.add(input.queryJobId);
    for (const [value, label] of [
      [input.rendererMetadataSha256, "renderer"],
      [input.receiptSha256, "receipt"],
      [input.querySha256, "query"],
      [input.resultSha256, "result"],
      [input.templateSha256, "template"],
      [input.userShard?.userIdsSha256, "user shard"],
    ]) requiredHex(value, `Supplement ${label} hash`);
    validateSafeNovelPrivacy(input.privacy, "Supplement input");
    validateGateCounts(input.publicationGate, "Supplement input");
  }
  assert.equal(jobs.size, metadata.inputs.length, "Supplement input job set drift");
  assert.match(sha256(metadataBuffer), /^[a-f0-9]{64}$/);
  validatePrivacy(metadata.privacy, "Supplement");
}

function validateMergedMetadata(merged, aggregateBuffer, cube, label) {
  assert.equal(merged?.sha256, sha256(aggregateBuffer), `${label} aggregate hash mismatch`);
  assert.equal(Number(merged?.bytes), aggregateBuffer.length, `${label} aggregate byte size mismatch`);
  assert.equal(Number(merged?.rows), cube.rows.length, `${label} aggregate row count mismatch`);
  assert.equal(
    merged?.windowStartInclusive,
    `${cube.window.start}T00:00:00Z`,
    `${label} aggregate window start mismatch`,
  );
  assert.equal(
    merged?.windowEndExclusive,
    `${nextDay(cube.window.end)}T00:00:00Z`,
    `${label} aggregate window end mismatch`,
  );
  assert.deepEqual(merged?.totals, cube.totals, `${label} aggregate counter totals drift`);
  assert.deepEqual(merged?.knownCards, cube.knownCards, `${label} aggregate coverage totals drift`);
  assert.equal(Number(merged?.cube?.stateCount), cube.states.size, `${label} state count drift`);
  assert.equal(Number(merged?.cube?.rowCount), cube.rows.length, `${label} cube row count drift`);
  assert.equal(merged?.cube?.handClassesPerState, 169, `${label} hand-class cube drift`);
  assert.equal(merged?.cube?.coverageReconciled, true, `${label} coverage proof missing`);
}

function validateMetadataMembership(value, membership, membershipBuffer, label) {
  assert.equal(value?.sha256, sha256(membershipBuffer), `${label} membership hash mismatch`);
  assert.equal(value?.keysSha256, membership.keysSha256, `${label} membership-key hash mismatch`);
  assert.equal(Number(value?.rows), membership.rows.length, `${label} membership row count mismatch`);
  assert.deepEqual(value?.cohortCounts, membership.cohortCounts, `${label} cohort counts mismatch`);
}

function inspectCube(rows, input, expectedCohorts, membership, optionsValue = {}) {
  assert.ok(rows.length, `${input}: aggregate is empty`);
  const byGrain = new Map();
  const states = new Map();
  const totals = emptyCounters();
  const totalsByCohort = Object.fromEntries(COHORTS.map((cohort) => [cohort, emptyCounters()]));
  const periods = new Set();
  for (const [index, row] of rows.entries()) {
    const location = `${input}:${index + 2}`;
    periods.add(`${row.window_start}|${row.window_end}`);
    assert.equal(row.table_filter, "cnt_players = 7", `${location}: table filter`);
    assert.equal(integer(row.table_size, "table_size", location), 7, `${location}: table size`);
    assert.ok(expectedCohorts.includes(row.cohort), `${location}: unexpected cohort ${row.cohort}`);
    assert.equal(
      integer(row.cohort_selected_players, "cohort_selected_players", location),
      membership.cohortCounts[row.cohort],
      `${location}: cohort-selected-player count`,
    );
    const position = POSITIONS[row.position_group];
    assert.ok(position, `${location}: invalid position`);
    assert.equal(integer(row.position_order, "position_order", location), position.order, `${location}: position order`);
    assert.equal(integer(row.position_code, "position_code", location), position.code, `${location}: position code`);
    assert.equal(integer(row.stack_order, "stack_order", location), STACKS[row.stack_bucket], `${location}: stack order`);
    assert.ok(HANDS.has(row.hand_class), `${location}: invalid hand class`);
    const key = grainKey(row);
    assert.ok(!byGrain.has(key), `${location}: duplicate grain ${key}`);
    byGrain.set(key, row);
    const counters = Object.fromEntries(COUNTERS.map((counter) => [
      counter,
      integer(row[counter], counter, location),
    ]));
    validateCounterPartitions(counters, location);
    if (optionsValue.exactNovelRaw) {
      assert.equal(
        counters.non_exact_r_effective_allin,
        0,
        `${location}: non-exact effective all-in in raw supplement`,
      );
    }
    validateDerived(row, counters, location);
    addCounters(totals, counters);
    addCounters(totalsByCohort[row.cohort], counters);
    const stateId = stateKey(row);
    const coverage = {
      cohort: row.cohort,
      position_group: row.position_group,
      position_order: row.position_order,
      position_code: row.position_code,
      stack_bucket: row.stack_bucket,
      stack_order: row.stack_order,
      eligible: integer(row.eligible_opportunities, "eligible_opportunities", location),
      known: integer(row.known_card_opportunities, "known_card_opportunities", location),
      lookupMismatch: integer(row.lookup_mismatch_opportunities, "lookup_mismatch_opportunities", location),
      firstObservedAt: row.first_observed_at,
      lastObservedAt: row.last_observed_at,
      hands: new Set(),
      opportunities: 0,
    };
    if (states.has(stateId)) {
      const existing = states.get(stateId);
      assert.deepEqual(
        coverageProjection(coverage),
        coverageProjection(existing),
        `${location}: repeated state coverage drift`,
      );
      existing.hands.add(row.hand_class);
      existing.opportunities += counters.opportunities;
    } else {
      coverage.hands.add(row.hand_class);
      coverage.opportunities = counters.opportunities;
      states.set(stateId, coverage);
    }
  }
  assert.equal(periods.size, 1, `${input}: expected one exact source window`);
  const [start, end] = [...periods][0].split("|");
  for (const [key, state] of states) {
    assert.equal(state.hands.size, 169, `${input}: state ${key} lacks 169 hands`);
    assert.deepEqual([...state.hands].sort(), [...HANDS].sort(), `${input}: state ${key} hand set drift`);
    assert.equal(state.opportunities, state.known, `${input}: state ${key} coverage reconciliation`);
    assert.ok(state.known <= state.eligible, `${input}: state ${key} known exceeds eligible`);
    if (optionsValue.exactNovelRaw) {
      assert.equal(state.eligible, state.known, `${input}: state ${key} raw eligible/known drift`);
      assert.equal(state.lookupMismatch, 0, `${input}: state ${key} raw lookup mismatch`);
    }
    if (state.known > 0) validateTimestampRange(state.firstObservedAt, state.lastObservedAt, `${input}: ${key}`);
  }
  const expectedStates =
    expectedCohorts.length * Object.keys(POSITIONS).length * Object.keys(STACKS).length;
  assert.equal(states.size, expectedStates, `${input}: incomplete state cube`);
  const knownCards = [...states.values()].reduce((result, state) => {
    result.eligible += state.eligible;
    result.known += state.known;
    result.lookupMismatch += state.lookupMismatch;
    return result;
  }, { eligible: 0, known: 0, lookupMismatch: 0 });
  knownCards.pct = knownCards.eligible
    ? Number((knownCards.known / knownCards.eligible * 100).toFixed(6))
    : 100;
  return {
    rows,
    byGrain,
    states,
    totals,
    totalsByCohort,
    knownCards,
    window: { start, end },
  };
}

function statesForCohort(cube, cohort) {
  return new Map(
    [...cube.states.values()]
      .filter((state) => state.cohort === cohort)
      .map((state) => [stateKeyWithoutCohort(state), state]),
  );
}

function deltaProjection(before, after, cohort) {
  const beforeRows = new Map(
    before.rows
      .filter((row) => row.cohort === cohort)
      .map((row) => [cellKeyWithoutCohort(row), row]),
  );
  const afterRows = after.rows.filter((row) => row.cohort === cohort);
  const beforeStates = statesForCohort(before, cohort);
  const afterStates = statesForCohort(after, cohort);
  const records = afterRows.map((row) => {
    const key = cellKeyWithoutCohort(row);
    const source = beforeRows.get(key);
    const beforeState = beforeStates.get(stateKeyWithoutCohort(row));
    const afterState = afterStates.get(stateKeyWithoutCohort(row));
    assert.ok(source && beforeState && afterState, `${cohort}: delta source missing ${key}`);
    const counters = COUNTERS.map((counter) => Number(row[counter]) - Number(source[counter]));
    assert.ok(counters.every((value) => value >= 0), `${cohort}: negative supplement delta ${key}`);
    return [
      key,
      ...counters,
      afterState.eligible - beforeState.eligible,
      afterState.known - beforeState.known,
      afterState.lookupMismatch - beforeState.lookupMismatch,
    ].join("\u001f");
  }).sort();
  return {
    cells: records.length,
    sha256: sha256(records.join("\n")),
  };
}

function inspectMembership(text, input) {
  const rows = parseCsv(text, input);
  assert.ok(rows.length, `${input}: membership export is empty`);
  const keys = [];
  const userSets = Object.fromEntries(COHORTS.map((cohort) => [cohort, new Set()]));
  for (const [index, row] of rows.entries()) {
    const location = `${input}:${index + 2}`;
    assert.ok(COHORTS.includes(row.cohort), `${location}: invalid cohort`);
    const userId = positiveInteger(row.user_id, `${location} user_id`);
    const key = `${row.cohort}|${userId}`;
    assert.ok(!keys.includes(key), `${location}: duplicate membership key`);
    keys.push(key);
    userSets[row.cohort].add(userId);
  }
  for (const cohort of COHORTS) assert.ok(userSets[cohort].size > 0, `${input}: empty ${cohort}`);
  return {
    rows,
    keysSha256: sha256(keys.sort().join("\n")),
    cohortCounts: Object.fromEntries(COHORTS.map((cohort) => [
      cohort,
      userSets[cohort].size,
    ])),
    userSets,
  };
}

function validateGateCounts(value, label) {
  const nominal = nonnegativeInteger(value?.nominal_novel_keys, `${label} nominal gate`);
  const normalized = nonnegativeInteger(
    value?.normalized_time_eligible_keys,
    `${label} normalized gate`,
  );
  const publication = nonnegativeInteger(
    value?.publication_eligible_keys,
    `${label} publication gate`,
  );
  assert.ok(publication <= normalized && normalized <= nominal, `${label} gate ordering drift`);
  if (value.raw_keys !== undefined || value.exact_id_match_keys !== undefined) {
    const raw = nonnegativeInteger(value.raw_keys, `${label} raw gate`);
    const exact = nonnegativeInteger(value.exact_id_match_keys, `${label} exact gate`);
    assert.equal(raw, exact + nominal, `${label} raw-key partition drift`);
  }
}

function validatePrivacy(value, label) {
  assert.equal(value?.rawHandHistoriesPublished, false, `${label} published raw histories`);
  assert.equal(value?.personalIdentifiersPublished, false, `${label} published identities`);
}

function withDerived(row) {
  const opportunities = Number(row.opportunities);
  const numerators = [
    row.raises_total,
    row.regular_raise,
    row.open_shove,
    row.limp,
    row.fold_other,
  ];
  return {
    ...row,
    ...Object.fromEntries(RATE_COLUMNS.map((column, index) => [
      column,
      pct(Number(numerators[index]), opportunities),
    ])),
    below_exact_minimum: Number(opportunities < 50),
    low_sample: Number(opportunities < 100),
  };
}

function validateDerived(row, counters, location) {
  const expected = [
    counters.raises_total,
    counters.regular_raise,
    counters.open_shove,
    counters.limp,
    counters.fold_other,
  ].map((value) => Number(pct(value, counters.opportunities)));
  for (let index = 0; index < RATE_COLUMNS.length; index += 1) {
    assert.ok(
      Math.abs(Number(row[RATE_COLUMNS[index]]) - expected[index]) <= 0.001000001,
      `${location}: stale ${RATE_COLUMNS[index]}`,
    );
  }
  assert.equal(Number(row.below_exact_minimum), Number(counters.opportunities < 50), `${location}: stale below_exact_minimum`);
  assert.equal(Number(row.low_sample), Number(counters.opportunities < 100), `${location}: stale low_sample`);
}

function validateCounterPartitions(counters, location) {
  assert.equal(
    counters.raises_total,
    counters.regular_raise + counters.open_shove,
    `${location}: raise partition`,
  );
  assert.equal(
    counters.opportunities,
    counters.raises_total + counters.limp + counters.fold_other,
    `${location}: action partition`,
  );
  assert.equal(
    counters.open_shove,
    counters.shove_allin_flag + counters.shove_effective_amount_only,
    `${location}: shove partition`,
  );
  assert.equal(
    counters.normal_three_bb_as_shove,
    0,
    `${location}: normal 3BB raise classified as shove`,
  );
}

function coverageProjection(state) {
  return {
    eligible: state.eligible,
    known: state.known,
    lookupMismatch: state.lookupMismatch,
    firstObservedAt: state.firstObservedAt,
    lastObservedAt: state.lastObservedAt,
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

function grainKey(row) {
  return [
    row.cohort,
    row.position_group,
    row.position_order,
    row.position_code,
    row.stack_bucket,
    row.stack_order,
    row.hand_class,
  ].join("|");
}

function stateKey(row) {
  return [
    row.cohort,
    row.position_group,
    row.position_order,
    row.position_code,
    row.stack_bucket,
    row.stack_order,
  ].join("|");
}

function cellKeyWithoutCohort(row) {
  return [
    row.position_group,
    row.position_order,
    row.position_code,
    row.stack_bucket,
    row.stack_order,
    row.hand_class,
  ].join("|");
}

function stateKeyWithoutCohort(row) {
  return [
    row.position_group,
    row.position_order,
    row.position_code,
    row.stack_bucket,
    row.stack_order,
  ].join("|");
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
  if (expectedHeader) assert.deepEqual(header, expectedHeader, `${input}: unexpected CSV columns`);
  assert.equal(new Set(header).size, header.length, `${input}: duplicate CSV columns`);
  return parsed.filter((values) => values.some(Boolean)).map((values, index) => {
    assert.equal(values.length, header.length, `${input}:${index + 2}: malformed CSV row`);
    return Object.fromEntries(header.map((column, columnIndex) => [column, values[columnIndex]]));
  });
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
  assert.equal(hands.size, 169, "Canonical hand-class contract changed");
  return hands;
}

function subtractTotals(left, right) {
  return Object.fromEntries(COUNTERS.map((counter) => [
    counter,
    left[counter] - right[counter],
  ]));
}

function emptyCounters() {
  return Object.fromEntries(COUNTERS.map((counter) => [counter, 0]));
}

function addCounters(target, values) {
  for (const counter of COUNTERS) target[counter] += Number(values[counter] || 0);
}

function minTimestamp(current, candidate) {
  if (!candidate) return current;
  return !current || candidate < current ? candidate : current;
}

function maxTimestamp(current, candidate) {
  if (!candidate) return current;
  return !current || candidate > current ? candidate : current;
}

function validateTimestampRange(first, last, label) {
  assert.ok(first && last, `${label}: nonzero state lacks observation bounds`);
  const firstMs = Date.parse(`${first.replace(" ", "T")}Z`);
  const lastMs = Date.parse(`${last.replace(" ", "T")}Z`);
  assert.ok(Number.isFinite(firstMs) && Number.isFinite(lastMs), `${label}: invalid observation bounds`);
  assert.ok(firstMs <= lastMs, `${label}: reversed observation bounds`);
}

function parseOptions(args) {
  return Object.fromEntries(args.map((argument) => {
    const match = argument.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Expected --key=value, got ${argument}`);
    return [match[1], match[2]];
  }));
}

function integer(value, label, location) {
  assert.match(String(value), /^\d+$/, `${location}: invalid ${label}`);
  const result = Number(value);
  assert.ok(Number.isSafeInteger(result), `${location}: unsafe ${label}`);
  return result;
}

function nonnegativeInteger(value, label) {
  assert.match(String(value), /^\d+$/, `${label} must be a nonnegative integer`);
  const result = Number(value);
  assert.ok(Number.isSafeInteger(result), `${label} is unsafe`);
  return result;
}

function positiveInteger(value, label) {
  const result = nonnegativeInteger(value, label);
  assert.ok(result > 0, `${label} must be positive`);
  return result;
}

function requiredHex(value, label) {
  assert.match(String(value || ""), /^[a-f0-9]{64}$/, `${label} is invalid`);
  return value;
}

function nextDay(value) {
  return new Date(Date.parse(`${value}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
}

function pct(value, total) {
  if (!total) return "0";
  return (value / total * 100).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function assertNoPrivatePayload(text, label) {
  for (const pattern of [
    /\bDealt to\b/i,
    /PokerStars Hand #/i,
    /<game\b/i,
    /<player\b/i,
    /"nickname"\s*:/i,
    /"hh_text[^"]*"\s*:/i,
    /"user_id"\s*:/i,
    /"firstUserId"\s*:/i,
    /"lastUserId"\s*:/i,
    /\/private\/tmp\//i,
    /\/Users\//i,
    /"(?:manifest|aggregate|query|result|receipt|renderer)(?:File|Path)"\s*:/i,
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  ]) {
    if (pattern.test(text)) throw new Error(`${label} contains private payload matching ${pattern}`);
  }
}

function projectNovelInput(input) {
  const keys = [
    "executionMode",
    "finishedAt",
    "network",
    "observedCells",
    "observedStates",
    "parserTemplateSha256",
    "parserValidationSha256",
    "privacy",
    "publicationGate",
    "queryJobId",
    "querySha256",
    "receiptSha256",
    "rendererMetadataSha256",
    "resultBytes",
    "resultRows",
    "resultSha256",
    "sourceKind",
    "startedAt",
    "templateSha256",
    "userShard",
    "windowEndExclusive",
    "windowStartInclusive",
  ];
  assert.deepEqual(Object.keys(input).sort(), [...keys].sort(), "Novel input allowlist drift");
  assert.ok(
    ["coin-party-publication-v2", "immutable-plan-raw-hh-v5"].includes(input.sourceKind),
    "Novel input source kind drift",
  );
  validateSafeExecution(input, "Novel input");
  for (const [value, label] of [
    [input.rendererMetadataSha256, "renderer"],
    [input.receiptSha256, "receipt"],
    [input.querySha256, "query"],
    [input.resultSha256, "result"],
    [input.templateSha256, "template"],
    [input.parserTemplateSha256, "parser template"],
    [input.parserValidationSha256, "parser validation"],
    [input.userShard?.userIdsSha256, "user shard"],
  ]) requiredHex(value, `Novel input ${label} hash`);
  assert.deepEqual(Object.keys(input.userShard || {}).sort(), [
    "count",
    "index",
    "userIdsSha256",
    "users",
  ], "Novel input user-shard allowlist drift");
  validateSafeNovelPrivacy(input.privacy, "Novel input");
  validateGateCounts(input.publicationGate, "Novel input");
  return {
    ...JSON.parse(JSON.stringify(input)),
    privacy: { ...SAFE_NOVEL_PRIVACY },
  };
}

function validateSafeNovelPrivacy(value, label) {
  assert.deepEqual(value, SAFE_NOVEL_PRIVACY, `${label} safe privacy boundary drift`);
}

function projectBaseInput(input) {
  assert.ok(
    ["structured-field-action", "missing-card-recovery-full-cube"].includes(input.sourceKind),
    `Unsupported base input source kind ${input.sourceKind}`,
  );
  const label = `Base ${input.sourceKind}`;
  const windowEndExclusive = normalizeBaseWindowEnd(
    input,
    label,
  );
  const executionTimes = resolveBaseExecutionTimes(input, label);
  const result = {
    sourceKind: input.sourceKind,
    queryJobId: input.queryJobId,
    executionMode: input.executionMode,
    ...executionTimes,
    rendererMetadataSha256: requiredHex(
      input.rendererMetadataSha256,
      "Base renderer metadata hash",
    ),
    receiptSha256: requiredHex(input.receiptSha256, "Base receipt hash"),
    querySha256: requiredHex(input.querySha256, "Base query hash"),
    resultSha256: requiredHex(input.resultSha256 ?? input.sha256, "Base result hash"),
    resultRows: nonnegativeInteger(input.resultRows ?? input.rows, "Base result rows"),
    resultBytes: nonnegativeInteger(
      input.resultBytes ?? input.receiptBytes,
      "Base result bytes",
    ),
    templateSha256: requiredHex(input.templateSha256, "Base template hash"),
    windowStartInclusive: input.windowStartInclusive,
    windowEndExclusive,
    userShard: {
      index: nonnegativeInteger(input.userShard?.index, "Base user shard index"),
      count: positiveInteger(input.userShard?.count, "Base user shard count"),
      users: positiveInteger(
        input.userShard?.users ?? input.shardUsers ?? input.selectedUniqueUsers,
        "Base user shard users",
      ),
      userIdsSha256: requiredHex(
        input.userShard?.userIdsSha256,
        "Base user shard hash",
      ),
    },
    membershipSha256: requiredHex(input.membershipSha256, "Base membership hash"),
    membershipKeysSha256: requiredHex(
      input.membershipKeysSha256,
      "Base membership-key hash",
    ),
    privacy: {
      aggregateOnly: true,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
  };
  validateSafeExecution(result, label);
  assert.match(
    result.queryJobId || "",
    /^mcp_ch_job_[a-f0-9]{32,}$/,
    "Base query job id is invalid",
  );
  validateBasePrivacy(input, label);
  if (input.sourceKind === "structured-field-action") {
    result.handClassMode = input.handClassMode;
    result.holecardMappingSha256 = input.holecardMappingSha256 ?? null;
    assert.equal(result.handClassMode, "joined-holecards-str", "Structured hand-class mode drift");
    if (result.holecardMappingSha256 !== null) {
      requiredHex(result.holecardMappingSha256, "Structured holecard mapping hash");
    }
  } else {
    result.parserGrammarsSha256 = requiredHex(
      input.parserGrammarsSha256,
      "Recovery parser grammar hash",
    );
    result.parserNetworks = [...(input.parserNetworks || [])];
    assert.ok(result.parserNetworks.length, "Recovery parser network set is empty");
    assert.equal(new Set(result.parserNetworks).size, result.parserNetworks.length);
    result.recoveryIsDisjoint = input.recoveryIsDisjoint;
    result.recoveryPredicate = input.recoveryPredicate;
    assert.equal(result.recoveryIsDisjoint, true, "Recovery source is not disjoint");
    assert.equal(
      result.recoveryPredicate,
      "latest structured_hand_class = ''",
      "Recovery disjoint predicate drift",
    );
    result.rawJoin = projectRawJoin(input.rawJoin);
    result.validation = projectRecoveryValidation(input.validation);
  }
  return result;
}

function validateBasePrivacy(input, label) {
  if (input.privacy !== undefined) {
    validatePrivacy(input.privacy, label);
    return;
  }
  assert.equal(
    input.sourceKind,
    "structured-field-action",
    `${label}: source privacy is missing`,
  );
  validatePrivacy(
    currentMetadata.privacy,
    `${label}: inherited current metadata privacy`,
  );
}

function resolveBaseExecutionTimes(input, label) {
  const hasStartedAt = Object.hasOwn(input, "startedAt");
  const hasFinishedAt = Object.hasOwn(input, "finishedAt");
  assert.equal(
    hasStartedAt,
    hasFinishedAt,
    `${label}: execution timestamps must be paired`,
  );
  if (hasStartedAt) {
    return {
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
    };
  }
  assert.equal(
    path.basename(String(input.file || "")),
    input.file,
    `${label}: legacy receipt source file must be a basename`,
  );
  assert.match(input.file, /\.csv$/, `${label}: legacy receipt source file`);
  const receiptPath = path.join(
    path.dirname(path.resolve(options["current-metadata"])),
    input.file.replace(/\.csv$/, ".receipt.json"),
  );
  assert.ok(fs.existsSync(receiptPath), `${label}: legacy execution receipt is missing`);
  const receiptBuffer = fs.readFileSync(receiptPath);
  assert.equal(
    sha256(receiptBuffer),
    requiredHex(input.receiptSha256, `${label}: receipt hash`),
    `${label}: legacy execution receipt hash mismatch`,
  );
  const receipt = JSON.parse(receiptBuffer.toString("utf8"));
  assert.equal(receipt.job_id, input.queryJobId, `${label}: legacy receipt job mismatch`);
  assert.equal(receipt.status, "succeeded", `${label}: legacy receipt did not succeed`);
  assert.equal(receipt.truncated, false, `${label}: legacy receipt is truncated`);
  assert.equal(
    receipt.row_count,
    nonnegativeInteger(input.resultRows ?? input.rows, `${label}: result rows`),
    `${label}: legacy receipt row count mismatch`,
  );
  assert.equal(
    receipt.byte_size,
    nonnegativeInteger(
      input.resultBytes ?? input.receiptBytes,
      `${label}: result bytes`,
    ),
    `${label}: legacy receipt byte size mismatch`,
  );
  assert.equal(
    receipt.result_sha256,
    requiredHex(input.resultSha256 ?? input.sha256, `${label}: result hash`),
    `${label}: legacy receipt result hash mismatch`,
  );
  return {
    startedAt: normalizeUtcReceiptTime(receipt.started_at, `${label}: receipt start`),
    finishedAt: normalizeUtcReceiptTime(receipt.finished_at, `${label}: receipt finish`),
  };
}

function normalizeUtcReceiptTime(value, label) {
  assert.match(
    String(value || ""),
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|\+00:00)$/,
    `${label}: invalid UTC timestamp`,
  );
  return String(value).replace(/\+00:00$/, "Z");
}

function normalizeBaseWindowEnd(input, label) {
  const hasExclusive = Object.hasOwn(input, "windowEndExclusive");
  const hasInclusive = Object.hasOwn(input, "windowEndInclusive");
  assert.notEqual(
    hasExclusive,
    hasInclusive,
    `${label}: provide exactly one closed-window end convention`,
  );
  if (hasExclusive) {
    assert.equal(
      input.windowEndExclusive,
      "2026-07-26T00:00:00Z",
      `${label}: window end`,
    );
  } else {
    assert.equal(
      input.windowEndInclusive,
      "2026-07-25T23:59:59.999Z",
      `${label}: legacy inclusive window end`,
    );
  }
  return "2026-07-26T00:00:00Z";
}

function projectRawJoin(value) {
  const projected = {
    type: value?.type,
    trackerKey: [...(value?.trackerKey || [])],
    rawKey: [...(value?.rawKey || [])],
  };
  assert.deepEqual(projected, {
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
  }, "Recovery exact raw-join proof drift");
  return projected;
}

function projectRecoveryValidation(value) {
  assert.equal(value?.schema, "ff-rfi-missing-card-recovery-validation-v1");
  const networkCounterKeys = [
    "classFailures",
    "classMatches",
    "matchPctTrackerKnown",
    "parserSuccess",
    "rawHhJoined",
    "trackerKnownWithRaw",
    "trackerMissingRecovered",
    "trackerRows",
    "validationPassed",
  ];
  const networks = {};
  for (const [network, counters] of Object.entries(value.networks || {})) {
    assert.match(network, /^[A-Za-z0-9().-]{2,40}$/, "Recovery validation network label");
    assert.deepEqual(
      Object.keys(counters).sort(),
      [...networkCounterKeys].sort(),
      `${network}: recovery validation counter allowlist drift`,
    );
    networks[network] = Object.fromEntries(networkCounterKeys.map((key) => [
      key,
      nonnegativeInteger(counters[key], `${network} validation ${key}`),
    ]));
    assert.equal(networks[network].classFailures, 0, `${network}: parser class failures`);
    assert.equal(networks[network].validationPassed, 1, `${network}: parser validation failed`);
    assert.equal(networks[network].matchPctTrackerKnown, 100, `${network}: parser match drift`);
  }
  assert.ok(Object.keys(networks).length, "Recovery validation network evidence is empty");
  const totalKeys = [
    "classFailures",
    "classMatches",
    "parserSuccess",
    "rawHhJoined",
    "trackerKnownWithRaw",
    "trackerMissingRecovered",
    "trackerRows",
  ];
  assert.deepEqual(
    Object.keys(value.totals || {}).sort(),
    [...totalKeys].sort(),
    "Recovery validation total allowlist drift",
  );
  const reexecution = resolveRecoveryValidationReexecution(value);
  const projected = {
    schema: value.schema,
    manifestSha256: requiredHex(value.manifestSha256, "Recovery validation manifest hash"),
    queryJobId: value.queryJobId,
    queryExecutionMode: value.queryExecutionMode,
    startedAt: reexecution?.startedAt ?? value.startedAt,
    finishedAt: reexecution?.finishedAt ?? value.finishedAt,
    rendererMetadataSha256: requiredHex(
      value.rendererMetadataSha256,
      "Recovery validation renderer hash",
    ),
    renderedSqlSha256: requiredHex(
      value.renderedSqlSha256,
      "Recovery validation SQL hash",
    ),
    queryTemplateSha256: requiredHex(
      value.queryTemplateSha256,
      "Recovery validation template hash",
    ),
    resultSha256: requiredHex(value.resultSha256, "Recovery validation result hash"),
    resultRows: nonnegativeInteger(
      value.resultRows ?? value.resultRowCount,
      "Recovery validation result rows",
    ),
    resultBytes: nonnegativeInteger(value.resultBytes, "Recovery validation result bytes"),
    receiptSha256: reexecution?.receiptSha256
      ?? requiredHex(value.receiptSha256, "Recovery validation receipt hash"),
    window: {
      startInclusive: value.window?.startInclusive,
      endExclusive: value.window?.endExclusive,
      semantics: value.window?.semantics,
    },
    networks,
    totals: Object.fromEntries(totalKeys.map((key) => [
      key,
      nonnegativeInteger(value.totals[key], `Recovery validation total ${key}`),
    ])),
    privacy: {
      aggregateOnly: true,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
  };
  assert.match(
    projected.queryJobId || "",
    /^(?:mcp_ch_job_[a-f0-9]{32,}|sync:[a-f0-9]{64})$/,
    "Recovery validation query job id is invalid",
  );
  assert.ok(["sync", "async"].includes(projected.queryExecutionMode));
  validateEvidenceTimes(projected.startedAt, projected.finishedAt, "Recovery validation");
  assert.equal(projected.window.semantics, "half-open-utc");
  assert(
    Date.parse(projected.window.startInclusive) < Date.parse(projected.window.endExclusive),
    "Recovery validation window is invalid",
  );
  validatePrivacy(value, "Recovery validation");
  return projected;
}

function resolveRecoveryValidationReexecution(value) {
  const receiptOption = options["recovery-validation-reexecution-receipt"];
  if (!receiptOption) return null;
  const receiptPath = path.resolve(receiptOption);
  assert(
    receiptPath.startsWith("/private/tmp/"),
    "Recovery validation reexecution receipt must stay under /private/tmp",
  );
  const receiptBuffer = fs.readFileSync(receiptPath);
  const receipt = JSON.parse(receiptBuffer.toString("utf8"));
  assert.deepEqual(Object.keys(receipt).sort(), [
    "classFailures",
    "cohort",
    "cohortSelectedPlayers",
    "finishedAt",
    "measuredWallDurationMs",
    "membershipPath",
    "membershipSha256",
    "providerDurationMs",
    "queryId",
    "queryTransport",
    "readBytes",
    "readRows",
    "renderMetadataPath",
    "renderMetadataSha256",
    "renderedSqlPath",
    "renderedSqlSha256",
    "resultByteIdenticalToPriorFrozenResult",
    "resultPath",
    "resultSha256",
    "schema",
    "sourceResponseFormat",
    "startedAt",
    "truncated",
    "validationPassedRows",
    "validationRows",
    "window",
  ].sort(), "Recovery validation reexecution receipt allowlist drift");
  assert.equal(
    receipt.schema,
    "ff-rfi-card-parser-validation-reexecution-receipt-v2",
  );
  assert(
    String(receipt.queryId || "").startsWith(`${value.queryJobId}:reexecution-`)
      && /^[A-Za-z0-9]+$/.test(
        String(receipt.queryId).slice(`${value.queryJobId}:reexecution-`.length),
      ),
    "Recovery validation reexecution query identity mismatch",
  );
  assert.equal(receipt.queryTransport, "FunFarm ClickHouse MCP inline");
  assert.equal(receipt.sourceResponseFormat, "csv");
  assert.equal(receipt.renderedSqlSha256, value.renderedSqlSha256);
  assert.equal(receipt.renderMetadataSha256, value.rendererMetadataSha256);
  assert.equal(receipt.resultSha256, value.resultSha256);
  assert.equal(receipt.membershipSha256, sha256(membershipBuffer));
  assert.equal(receipt.resultByteIdenticalToPriorFrozenResult, true);
  assert.deepEqual(receipt.window, ["2026-07-01", "2026-07-02"]);
  assert.equal(receipt.cohort, "l3top");
  assert.equal(receipt.cohortSelectedPlayers, membership.cohortCounts.l3top);
  assert.equal(receipt.validationRows, value.resultRows ?? value.resultRowCount);
  assert.equal(receipt.validationPassedRows, receipt.validationRows);
  assert.equal(receipt.classFailures, 0);
  assert.equal(receipt.truncated, false);
  for (const [inputPath, expectedHash, label] of [
    [receipt.renderedSqlPath, receipt.renderedSqlSha256, "rendered SQL"],
    [receipt.renderMetadataPath, receipt.renderMetadataSha256, "render metadata"],
    [receipt.membershipPath, receipt.membershipSha256, "membership"],
    [receipt.resultPath, receipt.resultSha256, "result"],
  ]) {
    const resolved = path.resolve(inputPath);
    assert(
      resolved.startsWith("/private/tmp/"),
      `Recovery validation reexecution ${label} must stay under /private/tmp`,
    );
    assert.equal(
      sha256(fs.readFileSync(resolved)),
      expectedHash,
      `Recovery validation reexecution ${label} hash mismatch`,
    );
  }
  assert.equal(
    fs.readFileSync(path.resolve(receipt.resultPath)).length,
    value.resultBytes,
    "Recovery validation reexecution result byte size mismatch",
  );
  const startedAt = normalizeUtcReceiptTime(
    receipt.startedAt,
    "Recovery validation reexecution start",
  );
  const finishedAt = normalizeUtcReceiptTime(
    receipt.finishedAt,
    "Recovery validation reexecution finish",
  );
  validateEvidenceTimes(startedAt, finishedAt, "Recovery validation reexecution");
  return {
    startedAt,
    finishedAt,
    receiptSha256: sha256(receiptBuffer),
  };
}

function projectSourceMerges(value, safeBaseInputs) {
  assert.deepEqual(Object.keys(value || {}).sort(), ["recovery", "structured"]);
  const result = {};
  for (const [name, sourceKind] of [
    ["structured", "structured-field-action"],
    ["recovery", "missing-card-recovery-full-cube"],
  ]) {
    const source = value[name];
    assert.equal(source.schema, "ff-rfi-field-action-merge-v1", `${name}: source merge schema`);
    assert.equal(source.shardStrategy, "immutable-user-id", `${name}: shard strategy`);
    const sourceInputs = (source.inputs || []).map(projectBaseInput);
    assert.deepEqual(
      sourceInputs,
      safeBaseInputs.filter((input) => input.sourceKind === sourceKind),
      `${name}: nested/flattened base inputs differ`,
    );
    result[name] = {
      schema: source.schema,
      ...(name === "recovery" ? { sourceKind: source.sourceKind } : {}),
      shardStrategy: source.shardStrategy,
      manifestSha256: requiredHex(source.manifestSha256, `${name}: manifest hash`),
      aggregate: {
        sha256: requiredHex(source.aggregate?.sha256, `${name}: aggregate hash`),
        bytes: nonnegativeInteger(source.aggregate?.bytes, `${name}: aggregate bytes`),
        rows: nonnegativeInteger(source.aggregate?.rows, `${name}: aggregate rows`),
      },
      inputs: sourceInputs,
      merged: {
        sha256: requiredHex(source.merged?.sha256, `${name}: merged hash`),
        rows: nonnegativeInteger(source.merged?.rows, `${name}: merged rows`),
        windowStartInclusive: source.merged?.windowStartInclusive,
        windowEndExclusive: source.merged?.windowEndExclusive,
        knownCards: projectKnownCards(source.merged?.knownCards, `${name}: known cards`),
        totals: projectCounters(source.merged?.totals, `${name}: totals`),
        ...(name === "recovery" ? {
          cube: {
            stateCount: nonnegativeInteger(
              source.merged?.cube?.stateCount,
              "recovery: state count",
            ),
            rowCount: nonnegativeInteger(
              source.merged?.cube?.rowCount,
              "recovery: cube row count",
            ),
            handClassesPerState: nonnegativeInteger(
              source.merged?.cube?.handClassesPerState,
              "recovery: hand classes per state",
            ),
            coverageReconciled: source.merged?.cube?.coverageReconciled,
          },
        } : {}),
      },
    };
    assert.equal(result[name].merged.windowStartInclusive, "2023-09-01T00:00:00Z");
    assert.equal(result[name].merged.windowEndExclusive, "2026-07-26T00:00:00Z");
    if (name === "recovery") {
      assert.deepEqual(result[name].merged.cube, {
        stateCount: 54,
        rowCount: 9126,
        handClassesPerState: 169,
        coverageReconciled: true,
      }, "Recovery merged cube proof drift");
    }
  }
  return result;
}

function projectReplacement(value) {
  return {
    l3top: {
      structuredRows: value.l3top.structuredRows,
      structuredProjectionSha256: requiredHex(
        value.l3top.structuredProjectionSha256,
        "Replacement structured projection",
      ),
      recoveryRows: value.l3top.recoveryRows,
      recoveryProjectionSha256: requiredHex(
        value.l3top.recoveryProjectionSha256,
        "Replacement recovery projection",
      ),
      finalProjectionSha256: requiredHex(
        value.l3top.finalProjectionSha256,
        "Replacement final projection",
      ),
      recoveryDominatesExactly: value.l3top.recoveryDominatesExactly,
    },
    l3Delta: {
      exactCells: value.l3Delta.exactCells,
      stateCount: value.l3Delta.stateCount,
      counters: projectCounters(value.l3Delta.counters, "Replacement l3 delta"),
      knownCardDelta: value.l3Delta.knownCardDelta,
      nonnegativePerCell: value.l3Delta.nonnegativePerCell,
      appliedExactly: value.l3Delta.appliedExactly,
      eligibleCoverageChanged: value.l3Delta.eligibleCoverageChanged,
    },
    preserved: Object.fromEntries(["l2", "l1"].map((cohort) => [
      cohort,
      {
        rows: value.preserved[cohort].rows,
        sourceProjectionSha256: requiredHex(
          value.preserved[cohort].sourceProjectionSha256,
          `${cohort} source projection`,
        ),
        finalProjectionSha256: requiredHex(
          value.preserved[cohort].finalProjectionSha256,
          `${cohort} final projection`,
        ),
        counters: projectCounters(
          value.preserved[cohort].counters,
          `${cohort} preserved counters`,
        ),
        exact: value.preserved[cohort].exact,
      },
    ])),
  };
}

function projectCounters(value, label) {
  return Object.fromEntries(COUNTERS.map((counter) => [
    counter,
    nonnegativeInteger(value?.[counter], `${label} ${counter}`),
  ]));
}

function projectKnownCards(value, label) {
  const eligible = nonnegativeInteger(value?.eligible, `${label} eligible`);
  const known = nonnegativeInteger(value?.known, `${label} known`);
  const lookupMismatch = nonnegativeInteger(
    value?.lookupMismatch,
    `${label} lookup mismatch`,
  );
  const pctValue = Number(value?.pct);
  assert(Number.isFinite(pctValue) && pctValue >= 0 && pctValue <= 100, `${label} pct`);
  return { eligible, known, lookupMismatch, pct: pctValue };
}

function validateSafeExecution(value, label) {
  assert.equal(value.executionMode, "async", `${label}: execution must be async`);
  assert.equal(value.windowStartInclusive, "2023-09-01T00:00:00Z", `${label}: window start`);
  assert.equal(value.windowEndExclusive, "2026-07-26T00:00:00Z", `${label}: window end`);
  validateEvidenceTimes(value.startedAt, value.finishedAt, label);
}

function validateEvidenceTimes(startedAt, finishedAt, label) {
  assert.match(String(startedAt || ""), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/, `${label}: invalid start`);
  assert.match(String(finishedAt || ""), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/, `${label}: invalid finish`);
  const started = Date.parse(startedAt);
  const finished = Date.parse(finishedAt);
  assert(Number.isFinite(started) && Number.isFinite(finished) && started <= finished, `${label}: invalid execution interval`);
  assert(finished >= Date.parse("2026-07-26T00:00:00Z"), `${label}: stale evidence`);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
