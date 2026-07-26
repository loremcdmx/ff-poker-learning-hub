#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COHORTS = ["l3top", "l3", "l2", "l1"];
const APPROVED_NETWORKS = new Set([
  "888Poker",
  "CoinPoker",
  "GGNetwork",
  "PartyPoker",
  "PokerStars",
  "PokerStars(FR-ES-PT)",
  "Winamax.fr",
  "WPN",
  "iPoker",
]);
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
const SOURCE_PROVENANCE_COLUMNS = [
  "supplemental_network",
  "source_user_shard_index",
  "source_user_shard_count",
  "source_gate_raw_keys",
  "source_gate_exact_id_match_keys",
  "source_gate_nominal_novel_keys",
  "source_gate_normalized_time_eligible_keys",
  "source_gate_publication_eligible_keys",
];
const EXTRA_NETWORK_COLUMNS = [
  ...COLUMNS.slice(0, 4),
  ...SOURCE_PROVENANCE_COLUMNS,
  ...COLUMNS.slice(4),
];
const FALLBACK_V5_GATE_COLUMNS = [
  "source_raw_keys",
  "source_exact_keys",
  "source_novel_keys",
  "source_eligible_keys",
];
const FALLBACK_V5_COLUMNS = [
  ...COLUMNS.slice(0, 12),
  ...FALLBACK_V5_GATE_COLUMNS,
  ...COLUMNS.slice(12),
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
const HANDS = [...canonicalHands()].sort();
const CANONICAL_GRAINS = canonicalGrains();
const CANONICAL_STATES = canonicalStates();
const here = path.dirname(fileURLToPath(import.meta.url));
const canonicalTemplateBuffer = fs.readFileSync(
  path.join(here, "q_ff_rfi_raw_hh_field_actions.sql"),
);
const canonicalTemplateText = canonicalTemplateBuffer.toString("utf8");
const canonicalTemplateSha256 = sha256(canonicalTemplateBuffer);
const parserBodyStart = canonicalTemplateText.indexOf("lexical AS (");
const parserBodyEnd = canonicalTemplateText.lastIndexOf("SELECT\n  toString");
assert(parserBodyStart >= 0 && parserBodyEnd > parserBodyStart, "canonical parser boundary missing");
const canonicalParserBodySha256 = sha256(
  canonicalTemplateText.slice(parserBodyStart, parserBodyEnd),
);
const PUBLICATION_WINDOW = Object.freeze({
  startInclusive: "2023-09-01T00:00:00Z",
  endExclusive: "2026-07-26T00:00:00Z",
  semantics: "half-open-utc",
});

const options = parseOptions(process.argv.slice(2));
for (const required of [
  "plan", "plan-receipt", "membership", "parser-validation", "output", "metadata",
]) {
  if (!options[required]) throw new Error(`Missing --${required}`);
}

const planPath = privateInput(options.plan, "run plan");
const planReceiptPath = privateInput(options["plan-receipt"], "immutable plan receipt");
const membershipPath = privateInput(options.membership, "membership");
const parserValidationPath = privateInput(options["parser-validation"], "parser validation");
const outputPath = privateOutput(options.output, "supplement aggregate");
const metadataPath = privateOutput(options.metadata, "supplement metadata");
const planBuffer = fs.readFileSync(planPath);
const plan = JSON.parse(planBuffer.toString("utf8"));
const immutablePlanReceiptBuffer = fs.readFileSync(planReceiptPath);
validateImmutablePlanReceipt(
  JSON.parse(immutablePlanReceiptBuffer.toString("utf8")),
  planPath,
  planBuffer,
);
const normalizedPlan = normalizePlan(plan);
const entries = normalizedPlan.entries;
const membershipBuffer = fs.readFileSync(membershipPath);
const membership = inspectMembership(
  membershipBuffer.toString("utf8"),
  membershipPath,
);
assert.equal(
  sha256(membershipBuffer),
  normalizedPlan.membershipSha256,
  "Plan membership bytes do not match --membership",
);
if (normalizedPlan.membershipKeysSha256) {
  assert.equal(
    membership.keysSha256,
    normalizedPlan.membershipKeysSha256,
    "Plan membership keys do not match --membership",
  );
}
assert.equal(
  membership.cohortCounts.l3top,
  normalizedPlan.selectedPlayers,
  "Plan l3top player count does not match frozen membership",
);
if (normalizedPlan.selectedUserIds.length) {
  assert.deepEqual(
    membership.userIdsByCohort.l3top,
    normalizedPlan.selectedUserIds,
    "Plan selected user population differs from frozen l3top",
  );
}

const pathBindings = bindInputPaths(entries, normalizedPlan.kind, options);
const parserValidationBuffer = fs.readFileSync(parserValidationPath);
const parserValidation = JSON.parse(parserValidationBuffer.toString("utf8"));
const parserProof = validateParserValidation(
  parserValidation,
  normalizedPlan.networks,
  normalizedPlan,
  planBuffer,
  membership,
  membershipBuffer,
);

const groupedCells = new Map(CANONICAL_GRAINS.map((grain) => [
  grain.key,
  {
    dimensions: grain,
    counters: emptyCounters(),
  },
]));
const groupedStates = new Map(CANONICAL_STATES.map((state) => [
  state.key,
  {
    key: state.key,
    eligible: 0,
    known: 0,
    mismatch: 0,
    opportunities: 0,
    first: "",
    last: "",
  },
]));
const inputs = [];
const jobIds = new Set();
let observedInputRows = 0;
let observedInputCells = 0;
let window = null;
let aggregateTemplateSha256 = "";

for (const [entryIndex, entry] of entries.entries()) {
  const binding = pathBindings[entryIndex];
  const expectedPartition = expectedUserPartition(
    membership.userIdsByCohort.l3top,
    entry.shardIndex,
    entry.shardCount,
  );
  validatePlanPartition(entry, expectedPartition, normalizedPlan.kind);

  const queryBuffer = fs.readFileSync(binding.query);
  const rendererBuffer = fs.readFileSync(binding.renderer);
  const resultBuffer = fs.readFileSync(binding.result);
  const receiptBuffer = fs.readFileSync(binding.receipt);
  const renderer = JSON.parse(rendererBuffer.toString("utf8"));
  const receipt = JSON.parse(receiptBuffer.toString("utf8"));

  const rendererProof = normalizedPlan.kind === "extra-network"
    ? validateExtraNetworkRenderer({
      entry,
      renderer,
      rendererBuffer,
      queryBuffer,
      expectedPartition,
      membership,
    })
    : validateFallbackRenderer({
      entry,
      renderer,
      rendererBuffer,
      queryBuffer,
      expectedPartition,
      membership,
      normalizedPlan,
    });
  if (!aggregateTemplateSha256) {
    aggregateTemplateSha256 = rendererProof.templateSha256;
  } else {
    assert.equal(
      rendererProof.templateSha256,
      aggregateTemplateSha256,
      `${entryLabel(entry)}: aggregate template hash drift`,
    );
  }
  if (!window) window = rendererProof.window;
  else assert.deepEqual(rendererProof.window, window, `${entryLabel(entry)}: window drift`);

  const parsed = parseSourceCsv(
    resultBuffer.toString("utf8"),
    binding.result,
    normalizedPlan.kind,
  );
  const receiptProof = validateReceipt({
    entry,
    receipt,
    receiptBuffer,
    queryBuffer,
    rendererBuffer,
    resultBuffer,
    binding,
    rows: parsed.rows,
    normalizedPlan,
  });
  assert.ok(!jobIds.has(receiptProof.jobId), `${entryLabel(entry)}: duplicate query job id`);
  jobIds.add(receiptProof.jobId);

  const inputCube = inspectInputRows({
    entry,
    rows: parsed.rows,
    headerKind: parsed.headerKind,
    receiptProof,
    window: rendererProof.window,
    membership,
    input: binding.result,
  });
  if (entry.expectedRowCount !== null) {
    assert.equal(
      parsed.rows.length,
      entry.expectedRowCount,
      `${entryLabel(entry)}: result row count differs from declared plan`,
    );
  }
  assert.equal(
    receiptProof.observedCells,
    inputCube.cells.size,
    `${entryLabel(entry)}: receipt observed-cell count drift`,
  );
  assert.equal(
    receiptProof.observedStates,
    inputCube.states.size,
    `${entryLabel(entry)}: receipt observed-state count drift`,
  );
  assert.equal(
    receiptProof.opportunities,
    inputCube.totals.opportunities,
    `${entryLabel(entry)}: receipt opportunity total drift`,
  );
  assert.equal(
    receiptProof.openShove,
    inputCube.totals.open_shove,
    `${entryLabel(entry)}: receipt shove total drift`,
  );

  for (const [key, cell] of inputCube.cells) {
    const target = groupedCells.get(key);
    assert.ok(target, `${entryLabel(entry)}: noncanonical cell ${key}`);
    addCounters(target.counters, cell.counters);
  }
  for (const [key, state] of inputCube.states) {
    const target = groupedStates.get(key);
    assert.ok(target, `${entryLabel(entry)}: noncanonical state ${key}`);
    target.eligible += state.eligible;
    target.known += state.known;
    target.mismatch += state.mismatch;
    target.opportunities += state.opportunities;
    target.first = minTimestamp(target.first, state.first);
    target.last = maxTimestamp(target.last, state.last);
  }
  observedInputRows += parsed.rows.length;
  observedInputCells += inputCube.cells.size;
  inputs.push({
    sourceKind: "immutable-plan-raw-hh-v5",
    network: entry.network,
    userShard: {
      index: entry.shardIndex,
      count: entry.shardCount,
      users: expectedPartition.length,
      userIdsSha256: sha256(expectedPartition.join(",")),
    },
    rendererMetadataSha256: sha256(rendererBuffer),
    queryJobId: receiptProof.jobId,
    executionMode: receipt.execution_mode,
    startedAt: receipt.started_at,
    finishedAt: receipt.finished_at,
    receiptSha256: sha256(receiptBuffer),
    querySha256: sha256(queryBuffer),
    resultSha256: sha256(resultBuffer),
    resultRows: parsed.rows.length,
    resultBytes: resultBuffer.length,
    observedStates: inputCube.states.size,
    observedCells: inputCube.cells.size,
    templateSha256: rendererProof.templateSha256,
    parserTemplateSha256: canonicalTemplateSha256,
    parserValidationSha256: sha256(parserValidationBuffer),
    publicationGate: receiptProof.gateCounts,
    windowStartInclusive: rendererProof.window.startInclusive,
    windowEndExclusive: rendererProof.window.endExclusive,
    privacy: {
      aggregateOnly: true,
      noRawHandHistories: true,
      noPlayerLevelRows: true,
      noUserIds: true,
    },
  });
}

assert.equal(
  inputs.length,
  normalizedPlan.networks.length * normalizedPlan.shardCount,
  "Approved source set was not executed completely",
);
assert.equal(jobIds.size, inputs.length, "Every approved source needs a unique execution");

const outputRows = [];
const totals = emptyCounters();
let knownTotal = 0;
let eligibleTotal = 0;
let mismatchTotal = 0;
for (const state of groupedStates.values()) {
  assert.equal(
    state.eligible,
    state.known,
    `${state.key || "state"}: novel raw eligible/known coverage differs`,
  );
  assert.equal(
    state.known,
    state.opportunities,
    `${state.key || "state"}: novel raw state coverage does not reconcile`,
  );
  assert.equal(state.mismatch, 0, `${state.key || "state"}: lookup mismatch is nonzero`);
  if (state.known === 0) {
    assert.equal(state.first, "", `${state.key || "state"}: zero state has first timestamp`);
    assert.equal(state.last, "", `${state.key || "state"}: zero state has last timestamp`);
  } else {
    validateTimestampRange(state.first, state.last, state.key || "state");
  }
  eligibleTotal += state.eligible;
  knownTotal += state.known;
  mismatchTotal += state.mismatch;
}
for (const grain of CANONICAL_GRAINS) {
  const cell = groupedCells.get(grain.key);
  const state = groupedStates.get(grain.stateKey);
  validateCounterPartitions(cell.counters, grain.key);
  addCounters(totals, cell.counters);
  outputRows.push(withDerived({
    window_start: window.startInclusive.slice(0, 10),
    window_end: previousDay(window.endExclusive.slice(0, 10)),
    table_filter: "cnt_players = 7",
    table_size: 7,
    cohort: "l3top",
    cohort_selected_players: membership.cohortCounts.l3top,
    position_group: grain.position_group,
    position_order: grain.position_order,
    position_code: grain.position_code,
    stack_bucket: grain.stack_bucket,
    stack_order: grain.stack_order,
    hand_class: grain.hand_class,
    eligible_opportunities: state.eligible,
    known_card_opportunities: state.known,
    lookup_mismatch_opportunities: state.mismatch,
    first_observed_at: state.first,
    last_observed_at: state.last,
    ...cell.counters,
  }));
}
assert.equal(outputRows.length, 9_126, "Supplement must contain exactly 9,126 l3top rows");
assert.equal(totals.opportunities, knownTotal, "Output opportunity total does not reconcile");

const outputText = `${COLUMNS.join(",")}\n${
  outputRows
    .map((row) => COLUMNS.map((column) => csvCell(row[column])).join(","))
    .join("\n")
}\n`;
const outputBuffer = Buffer.from(outputText);
const metadata = {
  schema: "ff-rfi-field-action-novel-raw-supplement-merge-v1",
  sourceKind: "publication-safe-novel-raw-hh-l3top",
  strategy: "approved-plan-source-union-with-observed-zero-dimension-completion",
  plan: {
    schema: plan.schema,
    sha256: sha256(planBuffer),
    immutableReceiptSha256: sha256(immutablePlanReceiptBuffer),
    sourceSetComplete: true,
    networks: normalizedPlan.networks,
    userShardsPerNetwork: normalizedPlan.shardCount,
    expectedExecutions: entries.length,
    exactDisjointUserUnion: true,
    targetFilter: plan.targetFilter,
  },
  parserValidation: {
    schema: parserValidation.schema,
    sha256: sha256(parserValidationBuffer),
    gatePassed: true,
    networks: parserProof.networks,
    exactMismatchTolerance: 0,
    validatedAt: parserValidation.validatedAt,
    binding: parserValidation.binding,
  },
  window,
  membership: {
    sha256: sha256(membershipBuffer),
    keysSha256: membership.keysSha256,
    rows: membership.rows.length,
    cohortCounts: membership.cohortCounts,
    selectedCohort: "l3top",
    selectedPlayers: membership.cohortCounts.l3top,
    selectedUserIdsSha256: sha256(membership.userIdsByCohort.l3top.join(",")),
  },
  aggregateTemplateSha256,
  inputs,
  densification: {
    observedInputRows,
    observedInputCells,
    canonicalOutputCells: outputRows.length,
    absentDimensionsMaterializedAsObservedZero: true,
    smoothingApplied: false,
    modeledValuesApplied: false,
  },
  merged: {
    file: "novel-raw-hh-v5-supplement.csv",
    rows: outputRows.length,
    sha256: sha256(outputBuffer),
    bytes: outputBuffer.length,
    windowStartInclusive: window.startInclusive,
    windowEndExclusive: window.endExclusive,
    knownCards: {
      eligible: eligibleTotal,
      known: knownTotal,
      lookupMismatch: mismatchTotal,
      pct: eligibleTotal ? Number((knownTotal / eligibleTotal * 100).toFixed(6)) : 100,
    },
    totals,
    cube: {
      cohort: "l3top",
      stateCount: groupedStates.size,
      rowCount: outputRows.length,
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
assertNoPrivatePayload(outputText, "Supplement aggregate");
assertNoPrivatePayload(metadataText, "Supplement manifest");
assertPublicInputMetadata(inputs);
fs.writeFileSync(outputPath, outputBuffer, { mode: 0o600 });
fs.writeFileSync(metadataPath, metadataText, { mode: 0o600 });
process.stdout.write(`${JSON.stringify({
  rows: outputRows.length,
  states: groupedStates.size,
  opportunities: totals.opportunities,
  sha256: metadata.merged.sha256,
})}\n`);

function validateImmutablePlanReceipt(receipt, expectedPlanPath, expectedPlanBuffer) {
  assert.equal(
    receipt.schema,
    "ff-rfi-publication-eligible-full-v5-immutable-plan-receipt",
    "immutable plan receipt schema drift",
  );
  assert.equal(receipt.status, "frozen", "run plan is not frozen");
  assert.equal(receipt.jobsSubmitted, false, "immutable plan receipt must precede execution");
  assert.equal(
    fs.realpathSync(privateInput(receipt.runPlanPath, "receipt run plan")),
    fs.realpathSync(expectedPlanPath),
    "immutable receipt points to a different run plan",
  );
  assert.equal(
    receipt.runPlanSha256,
    sha256(expectedPlanBuffer),
    "immutable receipt run-plan hash drift",
  );
  assert.equal(
    Number(receipt.runPlanByteSize),
    expectedPlanBuffer.length,
    "immutable receipt run-plan byte size drift",
  );
  assert.match(
    String(receipt.mutationPolicy || ""),
    /never rewrite/i,
    "immutable receipt mutation policy missing",
  );
  validateEvidenceTime(receipt.createdAt, "immutable plan receipt");
}

function normalizePlan(planValue) {
  if (planValue.schema === "ff-rfi-extra-network-publication-shard-plan-v1") {
    throw new Error(
      "ff-rfi-extra-network-publication-shard-plan-v1 is not publication evidence; "
        + "use the dedicated Coin/Party v2 merger or an immutable v5 plan",
    );
    /* c8 ignore next 50 -- retained only to make the rejected legacy shape easy to audit. */
    assert.equal(planValue.cohort, "l3top", "Extra-network plan must select l3top");
    assert.equal(planValue.exactDisjointUnion, true, "Extra-network plan is not an exact user union");
    const networks = exactNetworkList(planValue.networks);
    const shardCount = positiveInteger(planValue.shardsPerNetwork, "shardsPerNetwork");
    assert.ok(Array.isArray(planValue.entries), "Extra-network plan entries are missing");
    const entriesValue = planValue.entries.map((entry, index) => ({
      kind: "extra-network",
      executionIndex: index,
      network: entry.network,
      shardIndex: integer(entry.shardIndex, "shardIndex", `plan entry ${index}`),
      shardCount: integer(entry.shardCount, "shardCount", `plan entry ${index}`),
      users: positiveInteger(entry.users, `plan entry ${index} users`),
      firstUserId: positiveInteger(entry.firstUserId, `plan entry ${index} firstUserId`),
      lastUserId: positiveInteger(entry.lastUserId, `plan entry ${index} lastUserId`),
      userIdsSha256: requiredHex(entry.userIdsSha256, `plan entry ${index} user hash`),
      gateQueryPath: requiredString(entry.sqlFile, `plan entry ${index} gate SQL`),
      gateQuerySha256: requiredHex(entry.sqlSha256, `plan entry ${index} gate SQL hash`),
      gateMetadataPath: requiredString(entry.metadataFile, `plan entry ${index} gate metadata`),
      gateMetadataSha256: requiredHex(entry.metadataSha256, `plan entry ${index} gate metadata hash`),
      queryPath: null,
      rendererPath: null,
      resultPath: null,
      receiptPath: null,
      expectedRowCount: null,
      expectedNominalNovelTotal: null,
      queryMetadataSha256: null,
    }));
    validateCartesian(entriesValue, networks, shardCount);
    const selectedPlayers = positiveInteger(planValue.users, "plan users");
    const selectedUserIds = inspectMembership(
      fs.readFileSync(requiredString(planValue.membershipFile, "plan membership file"), "utf8"),
      planValue.membershipFile,
    ).userIdsByCohort.l3top;
    assert.equal(selectedUserIds.length, selectedPlayers, "Plan membership/user count drift");
    assert.equal(
      sha256(selectedUserIds.join(",")),
      requiredHex(planValue.userIdsSha256, "plan selected-user hash"),
      "Plan selected-user hash drift",
    );
    return {
      kind: "extra-network",
      networks,
      shardCount,
      entries: entriesValue,
      membershipSha256: requiredHex(planValue.membershipSha256, "plan membership hash"),
      membershipKeysSha256: null,
      selectedPlayers,
      selectedUserIds,
    };
  }
  if (planValue.schema === "ff-rfi-publication-eligible-full-v4-run-plan") {
    throw new Error(
      "ff-rfi-publication-eligible-full-v4-run-plan is superseded and cannot be published; use v5 strong-gate evidence",
    );
  }
  if (planValue.schema === "ff-rfi-publication-eligible-full-v5-run-plan") {
    assert.equal(planValue.targetFilter, false, "Fallback v5 plan must explicitly forbid target filtering");
    assert.equal(planValue.executionMode, "async", "Fallback v5 plan must require async execution");
    assert.deepEqual(
      planValue.window,
      PUBLICATION_WINDOW,
      "Fallback v5 plan window drift",
    );
    assert.equal(
      planValue.canonicalTemplateSha256,
      canonicalTemplateSha256,
      "Fallback v5 plan is not pinned to the current query template",
    );
    assert.equal(
      planValue.canonicalParserBodySha256,
      canonicalParserBodySha256,
      "Fallback v5 plan is not pinned to the current parser body",
    );
    assert.ok(Array.isArray(planValue.parts) && planValue.parts.length, "Fallback plan parts are missing");
    assert.equal(
      positiveInteger(planValue.expectedParts, "expectedParts"),
      planValue.parts.length,
      "Fallback plan part count drift",
    );
    assert.equal(
      planValue.publicationMergeContract?.l3MustCloneL3topDeltaExactly,
      true,
      "Fallback plan lacks exact l3 delta contract",
    );
    const parts = planValue.parts;
    const shardCount = Math.max(...parts.map((part) => Number(part.userShard))) + 1;
    const networks = [...new Map(
      [...parts]
        .sort((left, right) => Number(left.networkPart) - Number(right.networkPart))
        .map((part) => [part.network, part.network]),
    ).values()];
    exactNetworkList(networks);
    const entriesValue = parts.map((part, index) => ({
      kind: "fallback-v5",
      executionIndex: integer(part.executionIndex, "executionIndex", `plan part ${index}`),
      network: part.network,
      shardIndex: integer(part.userShard, "userShard", `plan part ${index}`),
      shardCount,
      networkPart: integer(part.networkPart, "networkPart", `plan part ${index}`),
      users: null,
      firstUserId: null,
      lastUserId: null,
      userIdsSha256: null,
      gateQueryPath: null,
      gateQuerySha256: null,
      gateMetadataPath: null,
      gateMetadataSha256: null,
      queryPath: requiredString(part.querySqlPath, `plan part ${index} query`),
      rendererPath: requiredString(part.queryMetadataPath, `plan part ${index} renderer`),
      resultPath: requiredString(part.requiredResultCsvPath, `plan part ${index} result`),
      receiptPath: requiredString(part.requiredReceiptPath, `plan part ${index} receipt`),
      querySha256: requiredHex(part.querySqlSha256, `plan part ${index} query hash`),
      queryMetadataSha256: requiredHex(
        part.queryMetadataSha256,
        `plan part ${index} renderer hash`,
      ),
      expectedRowCount: nonnegativeInteger(
        part.expectedRowCount ?? planValue.expectedRowsPerPart,
        `plan part ${index} expected rows`,
      ),
      expectedNominalNovelTotal: null,
    }));
    for (const [index, entry] of entriesValue.entries()) {
      assert.equal(entry.executionIndex, index, `Fallback plan execution order drift at ${index}`);
    }
    validateCartesian(entriesValue, networks, shardCount);
    const firstRendererPath = privateInput(
      entriesValue[0].rendererPath,
      "fallback first renderer",
    );
    const firstRenderer = JSON.parse(fs.readFileSync(firstRendererPath, "utf8"));
    const selectedPlayers = positiveInteger(
      firstRenderer.selectedMembershipRows,
      "fallback selected membership rows",
    );
    const membershipSha256 = requiredHex(
      firstRenderer.membershipSha256,
      "fallback membership hash",
    );
    const membershipKeysSha256 = requiredHex(
      firstRenderer.membershipKeysSha256,
      "fallback membership-key hash",
    );
    return {
      kind: "fallback-v5",
      networks,
      shardCount,
      entries: entriesValue,
      membershipSha256,
      membershipKeysSha256,
      selectedPlayers,
      selectedUserIds: [],
      canonicalTemplateSha256: requiredHex(
        planValue.canonicalTemplateSha256,
        "fallback canonical template hash",
      ),
      canonicalParserBodySha256: requiredHex(
        planValue.canonicalParserBodySha256,
        "fallback canonical parser hash",
      ),
    };
  }
  throw new Error(`Unsupported novel raw source plan schema ${planValue.schema}`);
}

function bindInputPaths(entriesValue, kind, optionValues) {
  const overrides = {
    result: listOption(optionValues.results),
    query: listOption(optionValues.queries),
    renderer: listOption(optionValues["renderer-metadata"]),
    receipt: listOption(optionValues.receipts),
  };
  for (const [label, values] of Object.entries(overrides)) {
    if (values.length && values.length !== entriesValue.length) {
      throw new Error(`Expected ${entriesValue.length} ${label} paths, got ${values.length}`);
    }
  }
  if (kind === "extra-network") {
    for (const label of ["result", "query", "renderer", "receipt"]) {
      assert.equal(
        overrides[label].length,
        entriesValue.length,
        `Extra-network plan requires --${label === "renderer" ? "renderer-metadata" : `${label}s`}`,
      );
    }
  }
  return entriesValue.map((entry, index) => ({
    result: privateInput(
      overrides.result[index] || entry.resultPath,
      `${entryLabel(entry)} result`,
    ),
    query: privateInput(
      overrides.query[index] || entry.queryPath,
      `${entryLabel(entry)} query`,
    ),
    renderer: privateInput(
      overrides.renderer[index] || entry.rendererPath,
      `${entryLabel(entry)} renderer`,
    ),
    receipt: privateInput(
      overrides.receipt[index] || entry.receiptPath,
      `${entryLabel(entry)} receipt`,
    ),
  }));
}

function validateExtraNetworkRenderer({
  entry,
  renderer,
  rendererBuffer,
  queryBuffer,
  expectedPartition,
  membership,
}) {
  assert.equal(
    renderer.schema,
    "ff-rfi-extra-network-publication-aggregate-render-v1",
    `${entryLabel(entry)}: renderer schema drift`,
  );
  const gateQueryBuffer = fs.readFileSync(entry.gateQueryPath);
  assert.equal(
    sha256(gateQueryBuffer),
    entry.gateQuerySha256,
    `${entryLabel(entry)}: publication-gate SQL hash drift`,
  );
  const gateMetadataBuffer = fs.readFileSync(entry.gateMetadataPath);
  assert.equal(
    sha256(gateMetadataBuffer),
    entry.gateMetadataSha256,
    `${entryLabel(entry)}: publication-gate metadata hash drift`,
  );
  const gateMetadata = JSON.parse(gateMetadataBuffer.toString("utf8"));
  assert.equal(
    gateMetadata.schema,
    "ff-rfi-extra-network-publication-export-render-v1",
    `${entryLabel(entry)}: gate renderer schema drift`,
  );
  assert.equal(gateMetadata.network, entry.network, `${entryLabel(entry)}: gate network drift`);
  assert.equal(
    gateMetadata.renderedSqlSha256,
    entry.gateQuerySha256,
    `${entryLabel(entry)}: gate metadata/SQL drift`,
  );
  assert.equal(
    gateMetadata.membershipSha256,
    sha256(fs.readFileSync(options.membership)),
    `${entryLabel(entry)}: gate membership drift`,
  );
  assert.ok(
    Array.isArray(gateMetadata.gates) && gateMetadata.gates.length >= 5,
    `${entryLabel(entry)}: strict publication gates are missing`,
  );
  validateUserShard(gateMetadata.userShard, entry, expectedPartition, "gate renderer");
  assert.equal(renderer.network, entry.network, `${entryLabel(entry)}: network drift`);
  assert.equal(renderer.cohort, "l3top", `${entryLabel(entry)}: cohort drift`);
  assert.equal(
    renderer.selectedPlayers,
    membership.cohortCounts.l3top,
    `${entryLabel(entry)}: selected-player count drift`,
  );
  assert.equal(
    renderer.membershipSha256,
    sha256(fs.readFileSync(options.membership)),
    `${entryLabel(entry)}: membership hash drift`,
  );
  assert.equal(
    renderer.publicationGateSqlSha256,
    entry.gateQuerySha256,
    `${entryLabel(entry)}: aggregate query is not bound to the publication gate`,
  );
  requiredHex(renderer.aggregateTemplateSha256, `${entryLabel(entry)} template hash`);
  assert.deepEqual(renderer.cube, {
    stackBuckets: 9,
    positionGroups: 6,
    handClasses: 169,
    possibleCells: 9126,
    targetFilter: false,
  }, `${entryLabel(entry)}: cube/target-filter contract drift`);
  validateUserShard(renderer.userShard, entry, expectedPartition, "aggregate renderer");
  assert.equal(
    renderer.renderedSqlSha256,
    sha256(queryBuffer),
    `${entryLabel(entry)}: rendered aggregate SQL hash drift`,
  );
  assert.deepEqual(
    [...renderer.exposedPublicationGateCounters].sort(),
    [
      "exact_id_match_keys",
      "nominal_novel_keys",
      "normalized_time_eligible_keys",
      "publication_eligible_keys",
      "raw_keys",
    ],
    `${entryLabel(entry)}: gate counter contract drift`,
  );
  assert.deepEqual(
    [...renderer.actionCounters].sort(),
    COUNTERS.filter((counter) => counter !== "non_exact_r_effective_allin").sort(),
    `${entryLabel(entry)}: action counter contract drift`,
  );
  const windowValue = validateWindow(renderer.window, entryLabel(entry));
  assert.deepEqual(gateMetadata.window, renderer.window, `${entryLabel(entry)}: gate window drift`);
  assert.equal(
    sha256(rendererBuffer),
    sha256(rendererBuffer),
    `${entryLabel(entry)}: renderer bytes are unreadable`,
  );
  return {
    templateSha256: renderer.aggregateTemplateSha256,
    window: windowValue,
  };
}

function validateFallbackRenderer({
  entry,
  renderer,
  rendererBuffer,
  queryBuffer,
  expectedPartition,
  membership,
  normalizedPlan,
}) {
  assert.equal(
    renderer.schema,
    "ff-rfi-publication-eligible-full-aggregate-network-part-v5",
    `${entryLabel(entry)}: fallback renderer schema drift`,
  );
  assert.equal(
    sha256(rendererBuffer),
    entry.queryMetadataSha256,
    `${entryLabel(entry)}: fallback renderer hash drift`,
  );
  assert.equal(sha256(queryBuffer), entry.querySha256, `${entryLabel(entry)}: query hash drift`);
  assert.equal(
    renderer.renderedSqlSha256,
    entry.querySha256,
    `${entryLabel(entry)}: renderer/query hash drift`,
  );
  assert.equal(
    renderer.templateSha256,
    normalizedPlan.canonicalTemplateSha256,
    `${entryLabel(entry)}: canonical template drift`,
  );
  assert.equal(
    renderer.canonicalParserBoundary?.sha256,
    normalizedPlan.canonicalParserBodySha256,
    `${entryLabel(entry)}: canonical parser-body drift`,
  );
  assert.equal(
    renderer.canonicalParserBoundary?.byteIdenticalToCurrentTemplateRender,
    true,
    `${entryLabel(entry)}: parser body is not byte-identical`,
  );
  assert.equal(
    renderer.networkPartition?.network,
    entry.network,
    `${entryLabel(entry)}: network partition drift`,
  );
  assert.equal(
    renderer.networkPartition?.index,
    entry.networkPart,
    `${entryLabel(entry)}: network-part index drift`,
  );
  assert.deepEqual(renderer.selectedCohorts, ["l3top"], `${entryLabel(entry)}: cohort drift`);
  assert.equal(
    renderer.selectedMembershipRows,
    membership.cohortCounts.l3top,
    `${entryLabel(entry)}: selected-player count drift`,
  );
  assert.equal(
    renderer.membershipSha256,
    sha256(fs.readFileSync(options.membership)),
    `${entryLabel(entry)}: membership hash drift`,
  );
  assert.equal(
    renderer.membershipKeysSha256,
    membership.keysSha256,
    `${entryLabel(entry)}: membership-key hash drift`,
  );
  validateUserShard(renderer.userShard, entry, expectedPartition, "fallback renderer");
  assert.equal(renderer.dimensions?.completeRows, 9126, `${entryLabel(entry)}: grid drift`);
  assert.deepEqual(renderer.outputColumns, FALLBACK_V5_COLUMNS, `${entryLabel(entry)}: output columns drift`);
  assert.equal(renderer.outputColumnCount, 39, `${entryLabel(entry)}: output width drift`);
  assert.equal(
    renderer.outputContainsRawHandsNicknamesOrIds,
    false,
    `${entryLabel(entry)}: private output boundary is not proved`,
  );
  assert.equal(
    renderer.countersPartitionOpportunities,
    true,
    `${entryLabel(entry)}: action partition is not asserted`,
  );
  assert.equal(
    renderer.explicitAllinSplitPreserved,
    true,
    `${entryLabel(entry)}: shove partition is not asserted`,
  );
  assert.equal(
    renderer.targetFilter,
    false,
    `${entryLabel(entry)}: targetFilter must be explicitly false`,
  );
  const sourceReceipt = renderer.sourceReceipt || {};
  assert.match(
    String(sourceReceipt.strongGate || ""),
    /every dense result row repeats actual source_raw_keys/i,
    `${entryLabel(entry)}: v5 strong-gate contract is missing`,
  );
  return {
    templateSha256: renderer.templateSha256,
    window: validateWindow(renderer.window, entryLabel(entry)),
  };
}

function validateReceipt({
  entry,
  receipt,
  receiptBuffer,
  queryBuffer,
  rendererBuffer,
  resultBuffer,
  binding,
  rows,
  normalizedPlan,
}) {
  if (normalizedPlan.kind === "extra-network") {
    assert.equal(
      receipt.schema,
      "ff-rfi-extra-network-publication-aggregate-execution-v1",
      `${entryLabel(entry)}: receipt schema drift`,
    );
    assert.equal(receipt.network, entry.network, `${entryLabel(entry)}: receipt network drift`);
    assert.equal(
      receipt.query_file,
      binding.query,
      `${entryLabel(entry)}: receipt query path drift`,
    );
    assert.equal(
      receipt.result_file,
      binding.result,
      `${entryLabel(entry)}: receipt result path drift`,
    );
    assert.equal(
      receipt.query_sha256,
      sha256(queryBuffer),
      `${entryLabel(entry)}: receipt query hash drift`,
    );
    assert.equal(
      receipt.result_sha256,
      sha256(resultBuffer),
      `${entryLabel(entry)}: receipt result hash drift`,
    );
    assert.equal(
      receipt.user_shard?.index,
      entry.shardIndex,
      `${entryLabel(entry)}: receipt shard index drift`,
    );
    assert.equal(
      receipt.user_shard?.count,
      entry.shardCount,
      `${entryLabel(entry)}: receipt shard count drift`,
    );
    assert.equal(
      receipt.user_shard?.user_ids_sha256,
      entry.userIdsSha256,
      `${entryLabel(entry)}: receipt user hash drift`,
    );
  } else {
    assert.equal(
      receipt.schema,
      "ff-rfi-publication-eligible-full-v5-execution-receipt",
      `${entryLabel(entry)}: receipt schema drift`,
    );
    assert.equal(receipt.network, entry.network, `${entryLabel(entry)}: receipt network drift`);
    assert.equal(
      receipt.user_shard,
      entry.shardIndex,
      `${entryLabel(entry)}: receipt shard index drift`,
    );
    assert.equal(
      receipt.network_part,
      entry.networkPart,
      `${entryLabel(entry)}: receipt network-part drift`,
    );
    assert.equal(
      receipt.query_sql_sha256,
      sha256(queryBuffer),
      `${entryLabel(entry)}: receipt query hash drift`,
    );
    assert.equal(
      receipt.query_metadata_sha256,
      sha256(rendererBuffer),
      `${entryLabel(entry)}: receipt renderer hash drift`,
    );
    assert.equal(
      path.resolve(receipt.result_csv_path),
      binding.result,
      `${entryLabel(entry)}: receipt result path drift`,
    );
    assert.equal(
      receipt.result_csv_sha256,
      sha256(resultBuffer),
      `${entryLabel(entry)}: receipt result hash drift`,
    );
    assert.equal(
      receipt.run_plan_sha256,
      sha256(planBuffer),
      `${entryLabel(entry)}: receipt immutable run-plan hash drift`,
    );
    assert.equal(
      receipt.immutable_plan_receipt_sha256,
      sha256(immutablePlanReceiptBuffer),
      `${entryLabel(entry)}: receipt immutable-plan proof hash drift`,
    );
  }
  assert.equal(receipt.status, "succeeded", `${entryLabel(entry)}: execution did not succeed`);
  assert.equal(receipt.execution_mode, "async", `${entryLabel(entry)}: execution mode must be async`);
  assert.equal(
    receipt.window_start_inclusive,
    PUBLICATION_WINDOW.startInclusive,
    `${entryLabel(entry)}: receipt window start drift`,
  );
  assert.equal(
    receipt.window_end_exclusive,
    PUBLICATION_WINDOW.endExclusive,
    `${entryLabel(entry)}: receipt window end drift`,
  );
  validateExecutionTimes(receipt.started_at, receipt.finished_at, entryLabel(entry));
  assert.match(
    String(receipt.job_id || ""),
    /^mcp_ch_job_[a-f0-9]{32,}$/,
    `${entryLabel(entry)}: invalid query job id`,
  );
  assert.equal(receipt.truncated ?? false, false, `${entryLabel(entry)}: result is truncated`);
  assert.equal(
    nonnegativeInteger(receipt.row_count, `${entryLabel(entry)} receipt row_count`),
    rows.length,
    `${entryLabel(entry)}: receipt row count drift`,
  );
  assert.equal(
    nonnegativeInteger(receipt.byte_size, `${entryLabel(entry)} receipt byte_size`),
    resultBuffer.length,
    `${entryLabel(entry)}: receipt byte size drift`,
  );
  const gateCounts = validateGateCounts(
    normalizedPlan.kind === "fallback-v5" ? receipt.strong_gate : receipt.gate_counts,
    entry,
  );
  assert.ok(
    receipt.aggregate && typeof receipt.aggregate === "object",
    `${entryLabel(entry)}: aggregate receipt proof missing`,
  );
  const observedCells = nonnegativeInteger(
    receipt.aggregate.observed_cells,
    `${entryLabel(entry)} observed cells`,
  );
  const observedStates = nonnegativeInteger(
    receipt.aggregate.states,
    `${entryLabel(entry)} observed states`,
  );
  const opportunities = nonnegativeInteger(
    receipt.aggregate.opportunities,
    `${entryLabel(entry)} opportunities`,
  );
  const openShove = nonnegativeInteger(
    receipt.aggregate.open_shove,
    `${entryLabel(entry)} open shove`,
  );
  assert.equal(
    receipt.aggregate.action_partitions_valid,
    true,
    `${entryLabel(entry)}: receipt action partition failed`,
  );
  assert.equal(
    Number(receipt.aggregate.normal_three_bb_as_shove),
    0,
    `${entryLabel(entry)}: receipt reports 3BB-as-shove errors`,
  );
  assert.equal(
    observedCells,
    new Set(rows.map(grainKey)).size,
    `${entryLabel(entry)}: receipt observed-cell reconciliation drift`,
  );
  assert.equal(
    observedStates,
    new Set(rows.map(stateKey)).size,
    `${entryLabel(entry)}: receipt observed-state reconciliation drift`,
  );
  assert.equal(
    opportunities,
    rows.reduce((sum, row) => sum + Number(row.opportunities), 0),
    `${entryLabel(entry)}: receipt opportunity reconciliation drift`,
  );
  assert.equal(
    openShove,
    rows.reduce((sum, row) => sum + Number(row.open_shove), 0),
    `${entryLabel(entry)}: receipt shove reconciliation drift`,
  );
  if (entry.expectedNominalNovelTotal !== null) {
    assert.equal(
      gateCounts.nominal_novel_keys,
      entry.expectedNominalNovelTotal,
      `${entryLabel(entry)}: gate nominal total differs from plan`,
    );
  }
  assert.ok(
    gateCounts.publication_eligible_keys >= opportunities,
    `${entryLabel(entry)}: aggregate opportunities exceed publication-safe source keys`,
  );
  assert.match(sha256(receiptBuffer), /^[a-f0-9]{64}$/);
  return {
    jobId: receipt.job_id,
    gateCounts,
    observedCells,
    observedStates,
    opportunities,
    openShove,
  };
}

function validateGateCounts(raw, entry) {
  assert.ok(raw && typeof raw === "object", `${entryLabel(entry)}: gate counts are missing`);
  if (
    raw.source_raw_keys !== undefined
    || raw.source_exact_keys !== undefined
    || raw.source_novel_keys !== undefined
    || raw.source_eligible_keys !== undefined
  ) {
    raw = {
      raw_keys: raw.source_raw_keys,
      exact_id_match_keys: raw.source_exact_keys,
      nominal_novel_keys: raw.source_novel_keys,
      normalized_time_eligible_keys: raw.source_eligible_keys,
      publication_eligible_keys: raw.source_eligible_keys,
    };
  }
  const required = [
    "nominal_novel_keys",
    "normalized_time_eligible_keys",
    "publication_eligible_keys",
  ];
  const result = Object.fromEntries(required.map((field) => [
    field,
    nonnegativeInteger(raw[field], `${entryLabel(entry)} gate ${field}`),
  ]));
  assert.ok(
    result.publication_eligible_keys <= result.normalized_time_eligible_keys,
    `${entryLabel(entry)}: publication eligibility exceeds normalized-time eligibility`,
  );
  assert.ok(
    result.normalized_time_eligible_keys <= result.nominal_novel_keys,
    `${entryLabel(entry)}: normalized eligibility exceeds nominal novel keys`,
  );
  if (raw.raw_keys !== undefined || raw.exact_id_match_keys !== undefined) {
    result.raw_keys = nonnegativeInteger(raw.raw_keys, `${entryLabel(entry)} gate raw_keys`);
    result.exact_id_match_keys = nonnegativeInteger(
      raw.exact_id_match_keys,
      `${entryLabel(entry)} gate exact_id_match_keys`,
    );
    assert.equal(
      result.raw_keys,
      result.exact_id_match_keys + result.nominal_novel_keys,
      `${entryLabel(entry)}: exact/nominal raw-key partition failed`,
    );
  } else if (entry.kind === "extra-network") {
    throw new Error(`${entryLabel(entry)}: exact publication gate partition is missing`);
  }
  return result;
}

function inspectInputRows({
  entry,
  rows,
  headerKind,
  receiptProof,
  window: sourceWindow,
  membership,
  input,
}) {
  const cells = new Map();
  const states = new Map();
  const totals = emptyCounters();
  for (const [index, row] of rows.entries()) {
    const location = `${input}:${index + 2}`;
    assert.equal(row.window_start, sourceWindow.startInclusive.slice(0, 10), `${location}: window start`);
    assert.equal(
      row.window_end,
      previousDay(sourceWindow.endExclusive.slice(0, 10)),
      `${location}: window end`,
    );
    assert.equal(row.table_filter, "cnt_players = 7", `${location}: table filter`);
    assert.equal(integer(row.table_size, "table_size", location), 7, `${location}: table size`);
    assert.equal(row.cohort, "l3top", `${location}: cohort`);
    assert.equal(
      integer(row.cohort_selected_players, "cohort_selected_players", location),
      membership.cohortCounts.l3top,
      `${location}: cohort-selected-player count`,
    );
    const position = POSITIONS[row.position_group];
    assert.ok(position, `${location}: invalid position`);
    assert.equal(integer(row.position_order, "position_order", location), position.order, `${location}: position order`);
    assert.equal(integer(row.position_code, "position_code", location), position.code, `${location}: position code`);
    assert.equal(integer(row.stack_order, "stack_order", location), STACKS[row.stack_bucket], `${location}: stack order`);
    assert.ok(HANDS.includes(row.hand_class), `${location}: invalid hand class`);
    if (headerKind === "extra-network") {
      assert.equal(row.supplemental_network, entry.network, `${location}: source network`);
      assert.equal(
        integer(row.source_user_shard_index, "source_user_shard_index", location),
        entry.shardIndex,
        `${location}: source shard index`,
      );
      assert.equal(
        integer(row.source_user_shard_count, "source_user_shard_count", location),
        entry.shardCount,
        `${location}: source shard count`,
      );
      const rowGate = {
        raw_keys: integer(row.source_gate_raw_keys, "source_gate_raw_keys", location),
        exact_id_match_keys: integer(
          row.source_gate_exact_id_match_keys,
          "source_gate_exact_id_match_keys",
          location,
        ),
        nominal_novel_keys: integer(
          row.source_gate_nominal_novel_keys,
          "source_gate_nominal_novel_keys",
          location,
        ),
        normalized_time_eligible_keys: integer(
          row.source_gate_normalized_time_eligible_keys,
          "source_gate_normalized_time_eligible_keys",
          location,
        ),
        publication_eligible_keys: integer(
          row.source_gate_publication_eligible_keys,
          "source_gate_publication_eligible_keys",
          location,
        ),
      };
      assert.deepEqual(rowGate, receiptProof.gateCounts, `${location}: row/receipt gate drift`);
    } else if (headerKind === "fallback-v5") {
      const rowGate = {
        raw_keys: integer(row.source_raw_keys, "source_raw_keys", location),
        exact_id_match_keys: integer(row.source_exact_keys, "source_exact_keys", location),
        nominal_novel_keys: integer(row.source_novel_keys, "source_novel_keys", location),
        normalized_time_eligible_keys: integer(
          row.source_eligible_keys,
          "source_eligible_keys",
          location,
        ),
        publication_eligible_keys: integer(
          row.source_eligible_keys,
          "source_eligible_keys",
          location,
        ),
      };
      assert.deepEqual(rowGate, receiptProof.gateCounts, `${location}: row/receipt strong-gate drift`);
    }
    const key = grainKey(row);
    assert.ok(!cells.has(key), `${location}: duplicate source grain ${key}`);
    const counters = Object.fromEntries(COUNTERS.map((counter) => [
      counter,
      integer(row[counter], counter, location),
    ]));
    validateCounterPartitions(counters, location);
    assert.equal(
      counters.non_exact_r_effective_allin,
      0,
      `${location}: non-exact effective all-in is forbidden in exact raw supplement`,
    );
    validateDerived(row, counters, location);
    cells.set(key, { counters });
    addCounters(totals, counters);
    const stateId = stateKey(row);
    const coverage = {
      eligible: integer(row.eligible_opportunities, "eligible_opportunities", location),
      known: integer(row.known_card_opportunities, "known_card_opportunities", location),
      mismatch: integer(row.lookup_mismatch_opportunities, "lookup_mismatch_opportunities", location),
      opportunities: 0,
      first: row.first_observed_at,
      last: row.last_observed_at,
    };
    if (states.has(stateId)) {
      const existing = states.get(stateId);
      assert.deepEqual(
        {
          eligible: coverage.eligible,
          known: coverage.known,
          mismatch: coverage.mismatch,
          first: coverage.first,
          last: coverage.last,
        },
        {
          eligible: existing.eligible,
          known: existing.known,
          mismatch: existing.mismatch,
          first: existing.first,
          last: existing.last,
        },
        `${location}: repeated state coverage drift`,
      );
      existing.opportunities += counters.opportunities;
    } else {
      coverage.opportunities = counters.opportunities;
      states.set(stateId, coverage);
    }
  }
  for (const [key, state] of states) {
    assert.equal(state.eligible, state.known, `${input}: ${key} eligible/known drift`);
    assert.equal(state.known, state.opportunities, `${input}: ${key} coverage reconciliation`);
    assert.equal(state.mismatch, 0, `${input}: ${key} lookup mismatch`);
    if (state.known > 0) validateTimestampRange(state.first, state.last, `${input}: ${key}`);
  }
  return { cells, states, totals };
}

function validateParserValidation(
  report,
  networks,
  normalizedPlan,
  planBuffer,
  membership,
  membershipBuffer,
) {
  assert.equal(
    report.schema,
    "ff-rfi-raw-hh-parser-validation-v2",
    "Only current parser validation evidence is accepted",
  );
  assert.equal(report.status, "passed", "Raw-HH parser validation did not pass");
  assert.equal(report.gatePassed, true, "Raw-HH parser validation gate did not pass");
  assert.deepEqual(report.gateFailures, [], "Raw-HH parser validation has gate failures");
  assert.deepEqual(report.acceptedMismatches, [], "Raw-HH parser validation accepted mismatches");
  assert.equal(
    report.policy?.acceptedMismatchTolerance,
    0,
    "Raw-HH parser mismatch tolerance is not zero",
  );
  assert.equal(
    report.source?.rawHandHistoriesPublished,
    false,
    "Parser validation published raw hand histories",
  );
  assert.deepEqual(report.binding, {
    planSha256: sha256(planBuffer),
    parserTemplateSha256: canonicalTemplateSha256,
    parserBodySha256: canonicalParserBodySha256,
    membershipSha256: sha256(membershipBuffer),
    membershipKeysSha256: membership.keysSha256,
    selectedUserIdsSha256: sha256(membership.userIdsByCohort.l3top.join(",")),
    window: PUBLICATION_WINDOW,
  }, "Parser validation is stale for the immutable plan/parser/window/membership");
  assert.equal(
    normalizedPlan.canonicalTemplateSha256,
    report.binding.parserTemplateSha256,
    "Parser validation/template plan drift",
  );
  assert.equal(
    normalizedPlan.canonicalParserBodySha256,
    report.binding.parserBodySha256,
    "Parser validation/body plan drift",
  );
  validateEvidenceTime(report.validatedAt, "parser validation");
  assert.deepEqual(
    [...(report.policy?.supportedNetworks || [])].sort(),
    [...networks].sort(),
    "Raw-HH parser validation source set differs from plan",
  );
  assert.deepEqual(
    Object.keys(report.networks || {}).sort(),
    [...networks].sort(),
    "Raw-HH parser network evidence differs from plan",
  );
  for (const network of networks) validateNetworkParserStats(report.networks[network], network);
  return { networks: [...networks] };
}

function validateNetworkParserStats(stats, network) {
  assert.ok(stats && typeof stats === "object", `${network}: parser evidence missing`);
  const parsed = positiveInteger(stats.parsed, `${network} parsed overlap rows`);
  const rows = positiveInteger(stats.rows, `${network} overlap rows`);
  assert.equal(
    parsed + nonnegativeInteger(stats.rejected, `${network} rejected overlap rows`),
    rows,
    `${network}: parsed/rejected partition drift`,
  );
  for (const name of ["cards", "position", "stack", "publicStack", "action"]) {
    const check = stats.checks?.[name];
    assert.equal(check?.compared, parsed, `${network}: ${name} comparison coverage drift`);
    assert.equal(check?.matched, parsed, `${network}: ${name} mismatch`);
    assert.equal(Number(check?.pct), 100, `${network}: ${name} match rate`);
  }
  const shove = stats.checks?.shove;
  assert.ok(Number(shove?.compared) > 0, `${network}: no shove overlap evidence`);
  assert.equal(shove.matched, shove.compared, `${network}: shove mismatch`);
  assert.equal(Number(shove.pct), 100, `${network}: shove match rate`);
  assert.deepEqual(
    [...(stats.coverage?.positions || [])].sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 9],
    `${network}: position coverage drift`,
  );
  assert.deepEqual(
    [...(stats.coverage?.actions || [])].sort(),
    ["fold", "limp", "raise"],
    `${network}: action coverage drift`,
  );
  assert.ok(
    (stats.coverage?.publicStacks || []).length >= 6,
    `${network}: stack coverage is incomplete`,
  );
}

function inspectMembership(text, input) {
  const rows = parseCsv(text, input).rows;
  assert.ok(rows.length, `${input}: membership export is empty`);
  const keys = [];
  const sets = Object.fromEntries(COHORTS.map((cohort) => [cohort, new Set()]));
  for (const [index, row] of rows.entries()) {
    const location = `${input}:${index + 2}`;
    assert.ok(COHORTS.includes(row.cohort), `${location}: invalid cohort`);
    const userId = positiveInteger(row.user_id, `${location} user_id`);
    const key = `${row.cohort}|${userId}`;
    assert.ok(!keys.includes(key), `${location}: duplicate membership key`);
    keys.push(key);
    sets[row.cohort].add(userId);
  }
  for (const cohort of COHORTS) assert.ok(sets[cohort].size > 0, `${input}: empty ${cohort}`);
  for (const userId of sets.l3top) {
    assert.ok(sets.l3.has(userId), `${input}: l3top is not a subset of l3`);
  }
  return {
    rows,
    keysSha256: sha256(keys.sort().join("\n")),
    cohortCounts: Object.fromEntries(COHORTS.map((cohort) => [cohort, sets[cohort].size])),
    userIdsByCohort: Object.fromEntries(COHORTS.map((cohort) => [
      cohort,
      [...sets[cohort]].sort((left, right) => left - right),
    ])),
  };
}

function validateCartesian(entriesValue, networks, shardCount) {
  assert.equal(
    entriesValue.length,
    networks.length * shardCount,
    "Plan is not a complete network x user-shard source set",
  );
  const keys = new Set();
  for (const [index, entry] of entriesValue.entries()) {
    assert.ok(APPROVED_NETWORKS.has(entry.network), `Plan entry ${index}: unapproved network`);
    assert.ok(networks.includes(entry.network), `Plan entry ${index}: undeclared network`);
    assert.equal(entry.shardCount, shardCount, `Plan entry ${index}: shard count drift`);
    assert.ok(
      entry.shardIndex >= 0 && entry.shardIndex < shardCount,
      `Plan entry ${index}: shard index out of range`,
    );
    const key = `${entry.network}|${entry.shardIndex}`;
    assert.ok(!keys.has(key), `Plan has duplicate source ${key}`);
    keys.add(key);
  }
  for (const network of networks) {
    for (let shard = 0; shard < shardCount; shard += 1) {
      assert.ok(keys.has(`${network}|${shard}`), `Plan is missing ${network} shard ${shard}`);
    }
  }
}

function validatePlanPartition(entry, expected, kind) {
  const expectedHash = sha256(expected.join(","));
  if (kind === "extra-network") {
    assert.equal(entry.users, expected.length, `${entryLabel(entry)}: user count drift`);
    assert.equal(entry.firstUserId, expected[0], `${entryLabel(entry)}: first user drift`);
    assert.equal(entry.lastUserId, expected.at(-1), `${entryLabel(entry)}: last user drift`);
    assert.equal(entry.userIdsSha256, expectedHash, `${entryLabel(entry)}: user hash drift`);
  }
}

function validateUserShard(value, entry, expected, label) {
  assert.equal(value?.index, entry.shardIndex, `${entryLabel(entry)}: ${label} shard index`);
  assert.equal(value?.count, entry.shardCount, `${entryLabel(entry)}: ${label} shard count`);
  assert.equal(value?.users ?? expected.length, expected.length, `${entryLabel(entry)}: ${label} users`);
  assert.equal(
    value?.firstUserId ?? expected[0],
    expected[0],
    `${entryLabel(entry)}: ${label} first user`,
  );
  assert.equal(
    value?.lastUserId ?? expected.at(-1),
    expected.at(-1),
    `${entryLabel(entry)}: ${label} last user`,
  );
  assert.equal(
    value?.userIdsSha256,
    sha256(expected.join(",")),
    `${entryLabel(entry)}: ${label} user hash`,
  );
}

function parseSourceCsv(text, input, expectedKind) {
  assert.equal(expectedKind, "fallback-v5", `${input}: legacy source kind is forbidden`);
  assert.ok(text.trim(), `${input}: v5 dense result cannot be empty`);
  const parsed = parseCsv(text, input);
  if (arraysEqual(parsed.header, FALLBACK_V5_COLUMNS)) {
    return { ...parsed, headerKind: "fallback-v5" };
  }
  throw new Error(`${input}: aggregate header violates the public aggregate-only contract`);
}

function parseCsv(text, input) {
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
  assert.equal(new Set(header).size, header.length, `${input}: duplicate CSV columns`);
  const rows = parsed.filter((values) => values.some(Boolean)).map((values, index) => {
    assert.equal(values.length, header.length, `${input}:${index + 2}: malformed CSV row`);
    return Object.fromEntries(header.map((column, columnIndex) => [column, values[columnIndex]]));
  });
  return { header, rows };
}

function canonicalGrains() {
  const result = [];
  for (const [stack_bucket, stack_order] of Object.entries(STACKS)) {
    for (const [position_group, position] of Object.entries(POSITIONS)) {
      for (const hand_class of HANDS) {
        const dimensions = {
          position_group,
          position_order: position.order,
          position_code: position.code,
          stack_bucket,
          stack_order,
          hand_class,
        };
        result.push({
          ...dimensions,
          key: grainKey(dimensions),
          stateKey: stateKey(dimensions),
        });
      }
    }
  }
  assert.equal(result.length, 9_126, "Canonical grain construction drift");
  assert.equal(new Set(result.map((item) => item.key)).size, result.length);
  return result;
}

function canonicalStates() {
  const result = [];
  for (const [stack_bucket, stack_order] of Object.entries(STACKS)) {
    for (const [position_group, position] of Object.entries(POSITIONS)) {
      const dimensions = {
        position_group,
        position_order: position.order,
        position_code: position.code,
        stack_bucket,
        stack_order,
      };
      result.push({ ...dimensions, key: stateKey(dimensions) });
    }
  }
  assert.equal(result.length, 54, "Canonical state construction drift");
  return result;
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

function grainKey(row) {
  return [
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
    row.position_group,
    row.position_order,
    row.position_code,
    row.stack_bucket,
    row.stack_order,
  ].join("|");
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
  assert.equal(
    Number(row.below_exact_minimum),
    Number(counters.opportunities < 50),
    `${location}: stale below_exact_minimum`,
  );
  assert.equal(
    Number(row.low_sample),
    Number(counters.opportunities < 100),
    `${location}: stale low_sample`,
  );
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

function validateWindow(value, label) {
  assert.ok(Array.isArray(value) && value.length === 2, `${label}: invalid window`);
  const [start, end] = value;
  assert.match(start, /^\d{4}-\d{2}-\d{2}$/, `${label}: invalid window start`);
  assert.match(end, /^\d{4}-\d{2}-\d{2}$/, `${label}: invalid window end`);
  assert.ok(Date.parse(`${start}T00:00:00Z`) < Date.parse(`${end}T00:00:00Z`), `${label}: reversed window`);
  const normalized = {
    startInclusive: `${start}T00:00:00Z`,
    endExclusive: `${end}T00:00:00Z`,
    semantics: "half-open-utc",
  };
  assert.deepEqual(normalized, PUBLICATION_WINDOW, `${label}: publication window drift`);
  return normalized;
}

function validateTimestampRange(first, last, label) {
  assert.ok(first && last, `${label}: nonzero state lacks observation bounds`);
  const firstMs = Date.parse(`${first.replace(" ", "T")}Z`);
  const lastMs = Date.parse(`${last.replace(" ", "T")}Z`);
  assert.ok(Number.isFinite(firstMs) && Number.isFinite(lastMs), `${label}: invalid observation bounds`);
  assert.ok(firstMs <= lastMs, `${label}: reversed observation bounds`);
}

function expectedUserPartition(ids, index, count) {
  const start = Math.floor(ids.length * index / count);
  const end = Math.floor(ids.length * (index + 1) / count);
  const result = ids.slice(start, end);
  assert.ok(result.length > 0, `User shard ${index}/${count} is empty`);
  return result;
}

function exactNetworkList(raw) {
  assert.ok(Array.isArray(raw) && raw.length, "Plan network set is empty");
  assert.equal(new Set(raw).size, raw.length, "Plan network set contains duplicates");
  for (const network of raw) {
    assert.ok(APPROVED_NETWORKS.has(network), `Plan contains unapproved network ${network}`);
  }
  return [...raw];
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

function parseOptions(args) {
  return Object.fromEntries(args.map((argument) => {
    const match = argument.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Expected --key=value, got ${argument}`);
    return [match[1], match[2]];
  }));
}

function listOption(value) {
  return String(value || "").split(",").filter(Boolean);
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

function requiredString(value, label) {
  assert.ok(typeof value === "string" && value, `${label} is missing`);
  return value;
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function previousDay(value) {
  return new Date(Date.parse(`${value}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
}

function pct(value, total) {
  if (!total) return "0";
  return (value / total * 100).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function entryLabel(entry) {
  return `${entry.network} shard ${entry.shardIndex}/${entry.shardCount}`;
}

function validateExecutionTimes(startedAt, finishedAt, label) {
  assert.match(
    String(startedAt || ""),
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/,
    `${label}: invalid started_at`,
  );
  assert.match(
    String(finishedAt || ""),
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/,
    `${label}: invalid finished_at`,
  );
  const started = Date.parse(startedAt);
  const finished = Date.parse(finishedAt);
  const cutoff = Date.parse(PUBLICATION_WINDOW.endExclusive);
  assert(Number.isFinite(started) && Number.isFinite(finished), `${label}: unparseable execution time`);
  assert(started <= finished, `${label}: execution finished before it started`);
  assert(finished >= cutoff, `${label}: execution predates the closed-window cutoff`);
}

function validateEvidenceTime(value, label) {
  assert.match(
    String(value || ""),
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/,
    `${label}: invalid evidence timestamp`,
  );
  assert(
    Date.parse(value) >= Date.parse(PUBLICATION_WINDOW.endExclusive),
    `${label}: evidence predates the closed-window cutoff`,
  );
}

function privateInput(value, label) {
  const resolved = path.resolve(String(value || ""));
  assert(resolved.startsWith("/private/tmp/"), `${label} must stay under /private/tmp`);
  const real = fs.realpathSync(resolved);
  assert(real.startsWith("/private/tmp/"), `${label} resolves outside /private/tmp`);
  assert(fs.statSync(real).isFile(), `${label} must be a regular file`);
  return real;
}

function privateOutput(value, label) {
  const resolved = path.resolve(String(value || ""));
  assert(resolved.startsWith("/private/tmp/"), `${label} must stay under /private/tmp`);
  const parent = fs.realpathSync(path.dirname(resolved));
  assert(parent.startsWith("/private/tmp"), `${label} parent resolves outside /private/tmp`);
  return resolved;
}

function assertPublicInputMetadata(values) {
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
  ].sort();
  for (const [index, value] of values.entries()) {
    assert.deepEqual(Object.keys(value).sort(), keys, `public input ${index}: allowlist drift`);
    assert.deepEqual(Object.keys(value.userShard || {}).sort(), [
      "count",
      "index",
      "userIdsSha256",
      "users",
    ]);
    assert.equal(value.sourceKind, "immutable-plan-raw-hh-v5");
    assert.deepEqual(value.privacy, {
      aggregateOnly: true,
      noRawHandHistories: true,
      noPlayerLevelRows: true,
      noUserIds: true,
    }, `public input ${index}: safe privacy drift`);
  }
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
    /"(?:query|result|receipt|renderer)(?:File|Path)"\s*:/i,
  ]) {
    if (pattern.test(text)) throw new Error(`${label} contains private payload matching ${pattern}`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
