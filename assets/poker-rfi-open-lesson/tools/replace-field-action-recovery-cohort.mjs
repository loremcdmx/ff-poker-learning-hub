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
const DIMENSIONS = [
  "cohort", "position_group", "position_order", "position_code",
  "stack_bucket", "stack_order", "hand_class",
];
const COUNTERS = [
  "opportunities", "raises_total", "regular_raise", "open_shove", "limp", "fold_other",
  "shove_allin_flag", "shove_effective_amount_only", "regular_three_bb_open",
  "normal_three_bb_as_shove", "non_exact_r_effective_allin",
];
const RATE_COLUMNS = [
  "raise_total_pct", "regular_raise_pct", "open_shove_pct", "limp_pct", "fold_pct",
];
const HANDS = canonicalHands();

const options = parseOptions(process.argv.slice(2));
for (const required of [
  "structured-aggregate", "structured-metadata", "recovery-aggregate",
  "recovery-metadata", "membership", "output", "metadata",
]) {
  if (!options[required]) throw new Error(`Missing --${required}`);
}

const structuredAggregateBuffer = fs.readFileSync(options["structured-aggregate"]);
const recoveryAggregateBuffer = fs.readFileSync(options["recovery-aggregate"]);
const structuredMetadataBuffer = fs.readFileSync(options["structured-metadata"]);
const recoveryMetadataBuffer = fs.readFileSync(options["recovery-metadata"]);
const membershipBuffer = fs.readFileSync(options.membership);
const structuredMetadata = JSON.parse(structuredMetadataBuffer.toString("utf8"));
const recoveryMetadata = JSON.parse(recoveryMetadataBuffer.toString("utf8"));

const structuredRows = parseCsv(
  structuredAggregateBuffer.toString("utf8"),
  options["structured-aggregate"],
  COLUMNS,
);
const recoveryRows = parseCsv(
  recoveryAggregateBuffer.toString("utf8"),
  options["recovery-aggregate"],
  COLUMNS,
);
const structured = inspectCube(structuredRows, options["structured-aggregate"], COHORTS);
const recovery = inspectCube(recoveryRows, options["recovery-aggregate"], ["l3top"]);
assert.equal(structuredRows.length, 36_504, "Canonical structured cube must contain 36,504 rows");
assert.equal(recoveryRows.length, 9_126, "Recovery l3top cube must contain 9,126 rows");
assert.deepEqual(recovery.window, structured.window, "Structured and recovery cubes must use the exact same window");

const structuredSource = validateStructuredMetadata(
  structuredMetadata,
  structuredMetadataBuffer,
  structuredAggregateBuffer,
  structured,
);
const recoverySource = validateRecoveryMetadata(
  recoveryMetadata,
  recoveryMetadataBuffer,
  recoveryAggregateBuffer,
  recovery,
);
assert.deepEqual(
  recoverySource.membership,
  structuredSource.membership,
  "Structured and recovery sources must use the same frozen membership bytes and counts",
);
assert.deepEqual(
  recoverySource.window,
  structuredSource.window,
  "Structured and recovery metadata windows must match exactly",
);

const membership = inspectMembership(membershipBuffer.toString("utf8"), options.membership);
assert.equal(
  sha256(membershipBuffer),
  structuredSource.membership.sha256,
  "Frozen membership bytes do not match source metadata",
);
assert.equal(
  membership.keysSha256,
  structuredSource.membership.keysSha256,
  "Frozen membership keys do not match source metadata",
);
assert.deepEqual(
  membership.cohortCounts,
  structuredSource.membership.cohortCounts,
  "Frozen membership cohort counts do not match source metadata",
);
for (const [label, rows] of [
  ["structured", structuredRows],
  ["recovery", recoveryRows],
]) {
  for (const row of rows) {
    assert.equal(
      Number(row.cohort_selected_players),
      membership.cohortCounts[row.cohort],
      `${label} cube cohort-selected-player count drift for ${row.cohort}`,
    );
  }
}
for (const userId of membership.userSets.l3top) {
  assert.ok(membership.userSets.l3.has(userId), "Every l3top member must also belong to l3");
}

assert.deepEqual(
  new Set(recovery.byGrain.keys()),
  new Set(
    structuredRows
      .filter((row) => row.cohort === "l3top")
      .map((row) => grainKey(row)),
  ),
  "Recovery l3top must cover the exact structured l3top dimensions",
);

const deltaByCell = new Map();
const deltaByState = new Map();
const deltaTotals = emptyTotals();
for (const recoveryRow of recoveryRows) {
  const structuredTopRow = structured.byGrain.get(grainKey(recoveryRow));
  assert.ok(structuredTopRow, `Missing structured l3top cell ${grainKey(recoveryRow)}`);
  assert.equal(
    recoveryRow.eligible_opportunities,
    structuredTopRow.eligible_opportunities,
    `l3top eligible coverage changed for ${grainKey(recoveryRow)}`,
  );
  assert.equal(
    recoveryRow.lookup_mismatch_opportunities,
    structuredTopRow.lookup_mismatch_opportunities,
    `l3top lookup coverage changed for ${grainKey(recoveryRow)}`,
  );
  assert.equal(
    recoveryRow.first_observed_at,
    structuredTopRow.first_observed_at,
    `l3top first observation changed for ${grainKey(recoveryRow)}`,
  );
  assert.equal(
    recoveryRow.last_observed_at,
    structuredTopRow.last_observed_at,
    `l3top last observation changed for ${grainKey(recoveryRow)}`,
  );
  const delta = Object.fromEntries(COUNTERS.map((counter) => {
    const value = Number(recoveryRow[counter]) - Number(structuredTopRow[counter]);
    assert.ok(value >= 0, `Recovery delta must be nonnegative for ${grainKey(recoveryRow)}|${counter}`);
    deltaTotals[counter] += value;
    return [counter, value];
  }));
  deltaByCell.set(grainKey({ ...recoveryRow, cohort: "l3" }), delta);
}
for (const [key, recoveryState] of recovery.states) {
  const structuredState = structured.states.get(key);
  assert.ok(structuredState, `Missing structured l3top coverage state ${key}`);
  const knownDelta = recoveryState.known - structuredState.known;
  assert.ok(knownDelta >= 0, `Recovery known-card delta must be nonnegative for ${key}`);
  assert.equal(
    knownDelta,
    [...deltaByCell.entries()]
      .filter(([cellKey]) => stateKeyFromGrain(cellKey) === stateKeyWithCohort(key, "l3"))
      .reduce((sum, [, delta]) => sum + delta.opportunities, 0),
    `Recovery state delta does not reconcile to exact cells for ${key}`,
  );
  deltaByState.set(stateKeyWithCohort(key, "l3"), knownDelta);
}

const finalRows = [];
for (const row of structuredRows) {
  if (row.cohort === "l3top") continue;
  if (row.cohort !== "l3") {
    finalRows.push({ ...row });
    continue;
  }
  const delta = deltaByCell.get(grainKey(row));
  assert.ok(delta, `Missing l3top-derived delta for whole-l3 cell ${grainKey(row)}`);
  const stateDelta = deltaByState.get(stateKey(row));
  assert.ok(Number.isSafeInteger(stateDelta), `Missing l3top-derived state delta for ${stateKey(row)}`);
  const values = Object.fromEntries(COUNTERS.map((counter) => [
    counter,
    Number(row[counter]) + delta[counter],
  ]));
  const known = Number(row.known_card_opportunities) + stateDelta;
  assert.ok(
    known <= Number(row.eligible_opportunities),
    `Whole-l3 recovery known coverage exceeds eligible for ${stateKey(row)}`,
  );
  finalRows.push(withDerived({
    ...row,
    known_card_opportunities: known,
    ...values,
  }));
}
for (const row of recoveryRows) finalRows.push({ ...row });
finalRows.sort(compareRows);

const outputText = `${COLUMNS.join(",")}\n${
  finalRows.map((row) => COLUMNS.map((column) => csvCell(row[column])).join(",")).join("\n")
}\n`;
const outputBuffer = Buffer.from(outputText);
const final = inspectCube(
  parseCsv(outputText, options.output, COLUMNS),
  options.output,
  COHORTS,
);
assert.equal(finalRows.length, 36_504, "Replacement output must contain 36,504 rows");

for (const cohort of ["l2", "l1"]) {
  assert.equal(
    projectionSha(final.rows.filter((row) => row.cohort === cohort)),
    projectionSha(structured.rows.filter((row) => row.cohort === cohort)),
    `${cohort} rows changed during l3top recovery replacement`,
  );
  assert.deepEqual(
    final.totalsByCohort[cohort],
    structured.totalsByCohort[cohort],
    `${cohort} counters changed during l3top recovery replacement`,
  );
}
assert.equal(
  projectionSha(final.rows.filter((row) => row.cohort === "l3top")),
  projectionSha(recovery.rows),
  "Final l3top rows are not exactly the recovery cube",
);
assert.deepEqual(
  subtractTotals(final.totalsByCohort.l3, structured.totalsByCohort.l3),
  deltaTotals,
  "Whole-l3 counters did not receive the exact l3top recovery delta",
);

const metadata = {
  schema: "ff-rfi-field-action-cohort-replacement-v1",
  strategy: "exact-same-window-l3top-replacement-with-l3-delta",
  replacedCohort: "l3top",
  deltaAppliedCohort: "l3",
  window: {
    startInclusive: `${final.window.start}T00:00:00Z`,
    endExclusive: `${nextDay(final.window.end)}T00:00:00Z`,
    semantics: "half-open-utc",
  },
  membership: {
    sha256: structuredSource.membership.sha256,
    keysSha256: structuredSource.membership.keysSha256,
    rows: structuredSource.membership.rows,
    cohortCounts: structuredSource.membership.cohortCounts,
    subsetProof: {
      l3topMembers: membership.userSets.l3top.size,
      l3Members: membership.userSets.l3.size,
      l3topIsSubsetOfL3: true,
    },
  },
  sourceMerges: {
    structured: {
      schema: structuredMetadata.schema,
      manifestSha256: sha256(structuredMetadataBuffer),
      shardStrategy: structuredMetadata.shardStrategy,
      inputs: structuredMetadata.inputs,
      merged: structuredMetadata.merged,
      aggregate: {
        sha256: sha256(structuredAggregateBuffer),
        bytes: structuredAggregateBuffer.length,
        rows: structuredRows.length,
      },
    },
    recovery: {
      schema: recoveryMetadata.schema,
      sourceKind: recoveryMetadata.sourceKind,
      manifestSha256: sha256(recoveryMetadataBuffer),
      shardStrategy: recoveryMetadata.shardStrategy,
      inputs: recoveryMetadata.inputs,
      merged: recoveryMetadata.merged,
      aggregate: {
        sha256: sha256(recoveryAggregateBuffer),
        bytes: recoveryAggregateBuffer.length,
        rows: recoveryRows.length,
      },
    },
  },
  inputs: [...structuredMetadata.inputs, ...recoveryMetadata.inputs],
  replacement: {
    l3top: {
      structuredRows: structured.rows.filter((row) => row.cohort === "l3top").length,
      structuredProjectionSha256: projectionSha(
        structured.rows.filter((row) => row.cohort === "l3top"),
      ),
      recoveryRows: recoveryRows.length,
      recoveryProjectionSha256: projectionSha(recoveryRows),
      finalProjectionSha256: projectionSha(final.rows.filter((row) => row.cohort === "l3top")),
      recoveryDominatesExactly: true,
    },
    l3Delta: {
      exactCells: deltaByCell.size,
      stateCount: deltaByState.size,
      counters: deltaTotals,
      knownCardDelta: [...deltaByState.values()].reduce((sum, value) => sum + value, 0),
      nonnegativePerCell: true,
      appliedExactly: true,
      eligibleCoverageChanged: false,
    },
    preserved: Object.fromEntries(["l2", "l1"].map((cohort) => [cohort, {
      rows: structured.rows.filter((row) => row.cohort === cohort).length,
      sourceProjectionSha256: projectionSha(
        structured.rows.filter((row) => row.cohort === cohort),
      ),
      finalProjectionSha256: projectionSha(final.rows.filter((row) => row.cohort === cohort)),
      counters: structured.totalsByCohort[cohort],
      exact: true,
    }])),
  },
  merged: {
    file: options.output.split("/").at(-1),
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
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  },
};
const metadataText = `${JSON.stringify(metadata, null, 2)}\n`;
assertNoPrivatePayload(metadataText);
fs.writeFileSync(options.output, outputBuffer);
fs.writeFileSync(options.metadata, metadataText, { mode: 0o600 });
process.stdout.write(`${JSON.stringify({
  output: options.output,
  metadata: options.metadata,
  schema: metadata.schema,
  rows: finalRows.length,
  sha256: metadata.merged.sha256,
  l3KnownDelta: metadata.replacement.l3Delta.knownCardDelta,
})}\n`);

function validateStructuredMetadata(metadata, metadataBuffer, aggregateBuffer, cube) {
  assert.equal(metadata.schema, "ff-rfi-field-action-merge-v1", "Unexpected structured merge schema");
  assert.ok(
    !metadata.sourceKind || metadata.sourceKind === "structured-field-action",
    "Structured merge source kind is invalid",
  );
  assert.ok(Array.isArray(metadata.inputs) && metadata.inputs.length, "Structured merge has no inputs");
  assert.ok(
    metadata.inputs.every((input) => input.sourceKind !== "missing-card-recovery-full-cube"),
    "Structured merge contains recovery inputs",
  );
  validateMergeAggregate(metadata, aggregateBuffer, cube, "Structured");
  return sourceIdentity(metadata, metadataBuffer, cube, "Structured");
}

function validateRecoveryMetadata(metadata, metadataBuffer, aggregateBuffer, cube) {
  assert.equal(metadata.schema, "ff-rfi-field-action-merge-v1", "Unexpected recovery merge schema");
  assert.equal(
    metadata.sourceKind,
    "missing-card-recovery-full-cube",
    "Recovery merge source kind is invalid",
  );
  assert.ok(Array.isArray(metadata.inputs) && metadata.inputs.length, "Recovery merge has no inputs");
  for (const input of metadata.inputs) {
    assert.equal(input.sourceKind, "missing-card-recovery-full-cube", "Recovery merge contains a substituted source");
    assert.deepEqual(
      Object.keys(input.selectedCohortCounts || {}),
      ["l3top"],
      "Recovery input must select exactly l3top",
    );
    assert.equal(input.selectedMembershipRows, input.selectedCohortCounts.l3top, "Recovery l3top membership count drift");
    assert.equal(input.handClassMode, "structured-or-validated-raw-when-empty-v1", "Recovery hand-class mode mismatch");
    assert.equal(input.recoveryPredicate, "latest structured_hand_class = ''", "Recovery predicate mismatch");
    assert.equal(input.recoveryIsDisjoint, true, "Recovery source is not disjoint");
    assert.equal(
      input.validation?.schema,
      "ff-rfi-missing-card-recovery-validation-v1",
      "Recovery input has no required validation manifest",
    );
  }
  assert.equal(metadata.merged?.cube?.handClassesPerState, 169, "Recovery merge has no 169-cell proof");
  assert.equal(metadata.merged?.cube?.coverageReconciled, true, "Recovery merge coverage is not reconciled");
  validateMergeAggregate(metadata, aggregateBuffer, cube, "Recovery");
  return sourceIdentity(metadata, metadataBuffer, cube, "Recovery");
}

function validateMergeAggregate(metadata, aggregateBuffer, cube, label) {
  assert.equal(metadata.merged?.sha256, sha256(aggregateBuffer), `${label} aggregate hash mismatch`);
  assert.equal(Number(metadata.merged?.rows), cube.rows.length, `${label} aggregate row count mismatch`);
  assert.equal(
    metadata.merged?.windowStartInclusive,
    `${cube.window.start}T00:00:00Z`,
    `${label} merge window start mismatch`,
  );
  assert.equal(
    metadata.merged?.windowEndExclusive,
    `${nextDay(cube.window.end)}T00:00:00Z`,
    `${label} merge window end mismatch`,
  );
  assert.deepEqual(metadata.merged?.knownCards, cube.knownCards, `${label} known-card totals drift`);
  assert.deepEqual(metadata.merged?.totals, cube.totals, `${label} action totals drift`);
}

function sourceIdentity(metadata, metadataBuffer, cube, label) {
  const first = metadata.inputs[0];
  const membership = {
    sha256: requiredHex(first.membershipSha256, `${label} membership hash`),
    keysSha256: requiredHex(first.membershipKeysSha256, `${label} membership-key hash`),
    rows: positiveInteger(first.sourceMembershipRows, `${label} membership rows`),
    cohortCounts: normalizeCohortCounts(first.membershipCohortCounts, label),
  };
  for (const input of metadata.inputs) {
    assert.equal(input.membershipSha256, membership.sha256, `${label} membership hash drift`);
    assert.equal(input.membershipKeysSha256, membership.keysSha256, `${label} membership-key hash drift`);
    assert.equal(Number(input.sourceMembershipRows), membership.rows, `${label} membership row-count drift`);
    assert.deepEqual(
      normalizeCohortCounts(input.membershipCohortCounts, label),
      membership.cohortCounts,
      `${label} membership cohort-count drift`,
    );
  }
  return {
    manifestSha256: sha256(metadataBuffer),
    membership,
    window: {
      startInclusive: `${cube.window.start}T00:00:00Z`,
      endExclusive: `${nextDay(cube.window.end)}T00:00:00Z`,
    },
  };
}

function inspectCube(rows, input, expectedCohorts) {
  assert.ok(rows.length, `${input}: aggregate is empty`);
  const byGrain = new Map();
  const states = new Map();
  const totals = emptyTotals();
  const totalsByCohort = Object.fromEntries(COHORTS.map((cohort) => [cohort, emptyTotals()]));
  const periods = new Set();
  for (const [index, row] of rows.entries()) {
    const location = `${input}:${index + 2}`;
    periods.add(`${row.window_start}|${row.window_end}`);
    assert.equal(row.table_filter, "cnt_players = 7", `${location}: table filter mismatch`);
    assert.equal(integer(row.table_size, "table_size", location), 7, `${location}: table size mismatch`);
    assert.ok(expectedCohorts.includes(row.cohort), `${location}: unexpected cohort ${row.cohort}`);
    const position = POSITIONS[row.position_group];
    assert.ok(position, `${location}: invalid position`);
    assert.equal(integer(row.position_order, "position_order", location), position.order, `${location}: position order`);
    assert.equal(integer(row.position_code, "position_code", location), position.code, `${location}: position code`);
    assert.equal(integer(row.stack_order, "stack_order", location), STACKS[row.stack_bucket], `${location}: stack order`);
    assert.ok(HANDS.has(row.hand_class), `${location}: invalid hand class ${row.hand_class}`);
    const key = grainKey(row);
    assert.ok(!byGrain.has(key), `${location}: duplicate grain ${key}`);
    byGrain.set(key, row);
    const values = Object.fromEntries(COUNTERS.map((counter) => [
      counter,
      integer(row[counter], counter, location),
    ]));
    assert.equal(values.raises_total, values.regular_raise + values.open_shove, `${location}: raise partition`);
    assert.equal(values.opportunities, values.raises_total + values.limp + values.fold_other, `${location}: action partition`);
    assert.equal(values.open_shove, values.shove_allin_flag + values.shove_effective_amount_only, `${location}: shove partition`);
    assert.equal(values.normal_three_bb_as_shove, 0, `${location}: normal raise classified as shove`);
    validateDerived(row, values, location);
    addTotals(totals, values);
    addTotals(totalsByCohort[row.cohort], values);
    const stateId = stateKey(row);
    const state = {
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
        coverageProjection(state),
        coverageProjection(existing),
        `${location}: repeated state coverage drift`,
      );
      existing.hands.add(row.hand_class);
      existing.opportunities += values.opportunities;
    } else {
      state.hands.add(row.hand_class);
      state.opportunities = values.opportunities;
      states.set(stateId, state);
    }
  }
  assert.equal(periods.size, 1, `${input}: expected one exact source window`);
  const [start, end] = [...periods][0].split("|");
  for (const [key, state] of states) {
    assert.equal(state.hands.size, 169, `${input}: state ${key} does not contain 169 hands`);
    assert.deepEqual([...state.hands].sort(), [...HANDS].sort(), `${input}: state ${key} hand set drift`);
    assert.equal(state.opportunities, state.known, `${input}: state ${key} known coverage does not reconcile`);
    assert.ok(state.known <= state.eligible, `${input}: state ${key} known exceeds eligible`);
  }
  const expectedStates = expectedCohorts.length * Object.keys(POSITIONS).length * Object.keys(STACKS).length;
  assert.equal(states.size, expectedStates, `${input}: incomplete position/stack/cohort state cube`);
  const knownCards = [...states.values()].reduce((result, state) => {
    result.eligible += state.eligible;
    result.known += state.known;
    result.lookupMismatch += state.lookupMismatch;
    return result;
  }, { eligible: 0, known: 0, lookupMismatch: 0 });
  knownCards.pct = Number((knownCards.known / knownCards.eligible * 100).toFixed(6));
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

function inspectMembership(text, input) {
  const rows = parseCsv(text, input);
  assert.ok(rows.length, "Frozen membership export is empty");
  const keys = [];
  const userSets = Object.fromEntries(COHORTS.map((cohort) => [cohort, new Set()]));
  for (const [index, row] of rows.entries()) {
    const location = `${input}:${index + 2}`;
    assert.ok(COHORTS.includes(row.cohort), `${location}: invalid cohort`);
    const userId = positiveInteger(row.user_id, `${location}: user_id`);
    const key = `${row.cohort}|${userId}`;
    assert.ok(!keys.includes(key), `${location}: duplicate membership key`);
    keys.push(key);
    userSets[row.cohort].add(userId);
  }
  const cohortCounts = Object.fromEntries(COHORTS.map((cohort) => [
    cohort,
    userSets[cohort].size,
  ]));
  return {
    rows,
    keysSha256: sha256(keys.sort().join("\n")),
    cohortCounts,
    userSets,
  };
}

function withDerived(row) {
  const opportunities = Number(row.opportunities);
  const rateValues = [
    row.raises_total, row.regular_raise, row.open_shove, row.limp, row.fold_other,
  ].map((value) => pct(Number(value), opportunities));
  return {
    ...row,
    ...Object.fromEntries(RATE_COLUMNS.map((column, index) => [column, rateValues[index]])),
    below_exact_minimum: Number(opportunities < 50),
    low_sample: Number(opportunities < 100),
  };
}

function validateDerived(row, values, location) {
  const expected = [
    values.raises_total, values.regular_raise, values.open_shove, values.limp, values.fold_other,
  ].map((value) => Number(pct(value, values.opportunities)));
  for (let index = 0; index < RATE_COLUMNS.length; index += 1) {
    assert.ok(
      Math.abs(Number(row[RATE_COLUMNS[index]]) - expected[index]) <= 0.001000001,
      `${location}: stale ${RATE_COLUMNS[index]}`,
    );
  }
  assert.equal(Number(row.below_exact_minimum), Number(values.opportunities < 50), `${location}: stale below_exact_minimum`);
  assert.equal(Number(row.low_sample), Number(values.opportunities < 100), `${location}: stale low_sample`);
}

function grainKey(row) {
  return DIMENSIONS.map((column) => row[column]).join("|");
}

function stateKey(row) {
  return DIMENSIONS.slice(0, -1).map((column) => row[column]).join("|");
}

function stateKeyWithCohort(key, cohort) {
  return [cohort, ...key.split("|").slice(1)].join("|");
}

function stateKeyFromGrain(key) {
  return key.split("|").slice(0, -1).join("|");
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
    [...rows].sort(compareRows)
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

function subtractTotals(left, right) {
  return Object.fromEntries(COUNTERS.map((counter) => [counter, left[counter] - right[counter]]));
}

function normalizeCohortCounts(raw, label) {
  assert.deepEqual(Object.keys(raw || {}).sort(), [...COHORTS].sort(), `${label} membership cohorts incomplete`);
  return Object.fromEntries(COHORTS.map((cohort) => [
    cohort,
    positiveInteger(raw[cohort], `${label} membership ${cohort}`),
  ]));
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

function parseOptions(args) {
  return Object.fromEntries(args.map((argument) => {
    const match = argument.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Expected --key=value, got ${argument}`);
    return [match[1], match[2]];
  }));
}

function integer(value, label, location) {
  assert.match(String(value), /^\d+$/, `${location}: invalid ${label}`);
  const parsed = Number(value);
  assert.ok(Number.isSafeInteger(parsed), `${location}: unsafe ${label}`);
  return parsed;
}

function positiveInteger(value, label) {
  const parsed = Number(value);
  assert.ok(Number.isSafeInteger(parsed) && parsed > 0, `${label} must be a positive integer`);
  return parsed;
}

function requiredHex(value, label) {
  assert.match(String(value || ""), /^[a-f0-9]{64}$/, `${label} is invalid`);
  return value;
}

function emptyTotals() {
  return Object.fromEntries(COUNTERS.map((counter) => [counter, 0]));
}

function addTotals(target, values) {
  for (const counter of COUNTERS) target[counter] += Number(values[counter] || 0);
}

function pct(value, total) {
  if (!total) return "0";
  return (value / total * 100).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function nextDay(value) {
  return new Date(Date.parse(`${value}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
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
  assert.equal(hands.size, 169, "Canonical hand-class contract changed");
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
  ]) {
    if (pattern.test(text)) throw new Error(`Replacement manifest contains private payload matching ${pattern}`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
