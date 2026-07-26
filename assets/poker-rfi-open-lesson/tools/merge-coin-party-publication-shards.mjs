#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  COIN_PARTY_PUBLICATION_CONTRACT,
  COIN_PARTY_PUBLICATION_NETWORKS,
  coinPartyGrammarContract,
  validateCoinPartyGateTotals,
} from "./coin-party-publication-contract.mjs";

const STANDARD_COLUMNS = Object.freeze([
  "window_start", "window_end", "table_filter", "table_size", "cohort",
  "cohort_selected_players", "position_group", "position_order", "position_code",
  "stack_bucket", "stack_order", "hand_class", "eligible_opportunities",
  "known_card_opportunities", "lookup_mismatch_opportunities", "first_observed_at",
  "last_observed_at", "opportunities", "raises_total", "regular_raise", "open_shove",
  "limp", "fold_other", "shove_allin_flag", "shove_effective_amount_only",
  "regular_three_bb_open", "normal_three_bb_as_shove",
  "non_exact_r_effective_allin", "raise_total_pct", "regular_raise_pct",
  "open_shove_pct", "limp_pct", "fold_pct", "below_exact_minimum", "low_sample",
]);
const PROVENANCE_COLUMNS = Object.freeze([
  "supplemental_network", "source_user_shard_index", "source_user_shard_count",
  "source_gate_raw_keys", "source_gate_exact_id_match_keys",
  "source_gate_nominal_novel_keys", "source_gate_normalized_time_eligible_keys",
  "source_gate_publication_eligible_keys",
]);
const INPUT_COLUMNS = Object.freeze([
  ...STANDARD_COLUMNS.slice(0, 4),
  ...PROVENANCE_COLUMNS,
  ...STANDARD_COLUMNS.slice(4),
]);
const POSITIONS = Object.freeze({
  EP: Object.freeze({ order: 1, code: 4 }),
  MP: Object.freeze({ order: 2, code: 3 }),
  HJ: Object.freeze({ order: 3, code: 2 }),
  CO: Object.freeze({ order: 4, code: 1 }),
  BTN: Object.freeze({ order: 5, code: 0 }),
  SB: Object.freeze({ order: 6, code: 9 }),
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
const COUNTERS = Object.freeze([
  "opportunities", "raises_total", "regular_raise", "open_shove", "limp",
  "fold_other", "shove_allin_flag", "shove_effective_amount_only",
  "regular_three_bb_open", "normal_three_bb_as_shove",
  "non_exact_r_effective_allin",
]);
const GATE_RECEIPT_KEYS = Object.freeze({
  rawKeys: "raw_keys",
  exactIdMatchKeys: "exact_id_match_keys",
  nominalNovelKeys: "nominal_novel_keys",
  normalizedTimeEligibleKeys: "normalized_time_eligible_keys",
  publicationEligibleKeys: "publication_eligible_keys",
});
const PUBLIC_SOURCE_KEYS = Object.freeze([
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
]);
const HANDS = [...canonicalHands()].sort();
const here = path.dirname(fileURLToPath(import.meta.url));
const options = parseOptions(process.argv.slice(2));
const publicationTemplateBuffer = fs.readFileSync(
  path.join(here, "q_ff_rfi_coin_party_publication.sql"),
);
const parserTemplatePath = options["parser-template"]
  ? privateInput(options["parser-template"], "frozen parser template")
  : path.join(here, "q_ff_rfi_raw_hh_field_actions.sql");
const parserTemplateBuffer = fs.readFileSync(
  parserTemplatePath,
);
const parserImplementationBuffer = fs.readFileSync(
  path.join(here, "coin-party-raw-hand-history-parser.mjs"),
);
const publicationTemplateSha256 = sha256(publicationTemplateBuffer);
const parserTemplateSha256 = sha256(parserTemplateBuffer);
const parserImplementationSha256 = sha256(parserImplementationBuffer);

for (const required of ["plan", "membership", "parser-validation", "output", "manifest"]) {
  if (!options[required]) throw new Error(`missing --${required}`);
}
const planPath = privateInput(options.plan, "run plan");
const membershipPath = privateInput(options.membership, "frozen membership");
const parserValidationPath = privateInput(
  options["parser-validation"],
  "parser validation report",
);
const outputPath = privateOutput(options.output, "merged CSV");
const manifestPath = privateOutput(options.manifest, "merge manifest");
const planBuffer = fs.readFileSync(planPath);
const plan = JSON.parse(planBuffer.toString("utf8"));
const selectedNetworks = validatePlan(plan);
const membershipBuffer = fs.readFileSync(membershipPath);
const membership = inspectFrozenMembership(membershipBuffer.toString("utf8"), membershipPath);
const parserValidationBuffer = fs.readFileSync(parserValidationPath);
const parserValidation = JSON.parse(parserValidationBuffer.toString("utf8"));
validateParserValidation(parserValidation, parserValidationBuffer, membershipBuffer);

const grouped = new Map();
const coverage = new Map();
const sourceManifestRows = [];
const executionIds = new Set();

for (const source of plan.sources) {
  const network = source.network;
  const shardIndex = nonNegativeInteger(source.shardIndex, "shardIndex");
  const sourcePath = privateInput(source.aggregateCsv, `${network}/${shardIndex} aggregate CSV`);
  const queryPath = privateInput(source.querySql, `${network}/${shardIndex} query SQL`);
  const rendererPath = privateInput(
    source.renderMetadata,
    `${network}/${shardIndex} renderer metadata`,
  );
  const receiptPath = privateInput(
    source.executionReceipt,
    `${network}/${shardIndex} execution receipt`,
  );
  const sourceBuffer = fs.readFileSync(sourcePath);
  const queryBuffer = fs.readFileSync(queryPath);
  const rendererBuffer = fs.readFileSync(rendererPath);
  assert.equal(source.querySha256, sha256(queryBuffer), `${network}/${shardIndex} planned query hash drift`);
  assert.equal(
    source.renderMetadataSha256,
    sha256(rendererBuffer),
    `${network}/${shardIndex} planned renderer hash drift`,
  );
  const receiptBuffer = fs.readFileSync(receiptPath);
  const renderer = JSON.parse(rendererBuffer.toString("utf8"));
  const receipt = JSON.parse(receiptBuffer.toString("utf8"));
  const parsed = parseCsv(sourceBuffer.toString("utf8"));
  const expectedUserIds = expectedUserPartition(
    membership.userIds,
    shardIndex,
    COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork,
  );

  if (parsed.rows.length) {
    assert.deepEqual(parsed.header, INPUT_COLUMNS, `${sourcePath}: unexpected columns`);
  } else {
    assert(sourceBuffer.equals(Buffer.from("\n")), `${sourcePath}: empty result must be one newline`);
  }
  validateQuery(queryBuffer.toString("utf8"), network);
  validateRenderer(
    renderer,
    network,
    shardIndex,
    queryBuffer,
    expectedUserIds,
    parserValidationBuffer,
  );
  const receiptProof = validateReceipt(
    receipt,
    network,
    shardIndex,
    sourceBuffer,
    queryBuffer,
    rendererBuffer,
    parsed.rows.length,
    parsed.rows,
    expectedUserIds,
    executionIds,
  );
  const gate = receiptProof.gate;
  if (!parsed.rows.length) {
    validateGateCompanion(receipt, receiptPath, executionIds);
  }

  const localKeys = new Set();
  const localCoverage = new Map();
  const localStateTotals = new Map();
  for (const [rowIndex, row] of parsed.rows.entries()) {
    const location = `${path.basename(sourcePath)}:${rowIndex + 2}`;
    validateRowProvenance(row, network, shardIndex, gate, location);
    validateDimensions(row, location);
    validateActions(row, location);
    const cellKey = dimensionKey(row);
    assert(!localKeys.has(cellKey), `${location}: duplicate cell`);
    localKeys.add(cellKey);
    const stateKey = stateDimensionKey(row);
    const state = {
      eligible: integer(row.eligible_opportunities, location),
      known: integer(row.known_card_opportunities, location),
      mismatch: integer(row.lookup_mismatch_opportunities, location),
      first: row.first_observed_at,
      last: row.last_observed_at,
    };
    if (localCoverage.has(stateKey)) {
      assert.deepEqual(localCoverage.get(stateKey), state, `${location}: state coverage drift`);
    } else {
      localCoverage.set(stateKey, state);
    }
    localStateTotals.set(
      stateKey,
      (localStateTotals.get(stateKey) || 0) + integer(row.opportunities, location),
    );
    if (!grouped.has(cellKey)) grouped.set(cellKey, emptyCell(row));
    addCounters(grouped.get(cellKey), row);
  }
  for (const [stateKey, state] of localCoverage) {
    assert.equal(
      state.known,
      localStateTotals.get(stateKey),
      `${path.basename(sourcePath)}: known-card reconciliation ${stateKey}`,
    );
    assert.equal(state.mismatch, 0, `${path.basename(sourcePath)}: lookup mismatch ${stateKey}`);
    if (!coverage.has(stateKey)) {
      coverage.set(stateKey, {
        eligible: 0,
        known: 0,
        mismatch: 0,
        first: state.first,
        last: state.last,
      });
    }
    const target = coverage.get(stateKey);
    target.eligible += state.eligible;
    target.known += state.known;
    target.mismatch += state.mismatch;
    target.first = minText(target.first, state.first);
    target.last = maxText(target.last, state.last);
  }

  sourceManifestRows.push({
    sourceKind: "coin-party-publication-v2",
    network,
    userShard: {
      index: shardIndex,
      count: COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork,
      users: expectedUserIds.length,
      userIdsSha256: sha256(expectedUserIds.join(",")),
    },
    queryJobId: receipt.job_id,
    executionMode: receipt.execution_mode,
    startedAt: receipt.started_at,
    finishedAt: receipt.finished_at,
    rendererMetadataSha256: sha256(rendererBuffer),
    receiptSha256: sha256(receiptBuffer),
    querySha256: sha256(queryBuffer),
    resultSha256: sha256(sourceBuffer),
    resultRows: parsed.rows.length,
    resultBytes: sourceBuffer.length,
    observedStates: receiptProof.observedStates,
    observedCells: receiptProof.observedCells,
    templateSha256: publicationTemplateSha256,
    parserTemplateSha256,
    parserValidationSha256: sha256(parserValidationBuffer),
    publicationGate: gateToSnake(gate),
    windowStartInclusive:
      `${COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window[0]}T00:00:00Z`,
    windowEndExclusive:
      `${COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window[1]}T00:00:00Z`,
    privacy: COIN_PARTY_PUBLICATION_CONTRACT.publicInputPrivacy,
  });
}

for (const network of selectedNetworks) {
  const selected = sourceManifestRows
    .filter((source) => source.network === network)
    .sort((left, right) => left.userShard.index - right.userShard.index);
  assert.deepEqual(
    selected.map((source) => source.userShard.index),
    [0, 1, 2, 3],
    `${network}: incomplete 4-shard union`,
  );
  assert.equal(
    new Set(selected.map((source) => source.userShard.userIdsSha256)).size,
    COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork,
    `${network}: shard user hashes must be distinct`,
  );
  const networkTotals = {};
  for (const key of Object.keys(GATE_RECEIPT_KEYS)) {
    networkTotals[key] = selected.reduce(
      (sum, source) => sum + snakeGateToCamel(source.publicationGate)[key],
      0,
    );
  }
  assert.deepEqual(
    networkTotals,
    plan.expectedStrongGateTotals[network],
    `${network}: strong run-plan gate totals drift`,
  );
}
assert.equal(
  coverage.size,
  COIN_PARTY_PUBLICATION_CONTRACT.stackBuckets
    * COIN_PARTY_PUBLICATION_CONTRACT.positions,
  "supplement must observe all 9 x 6 states",
);

const outputRows = [];
for (const [stack, stackOrder] of Object.entries(STACKS)) {
  for (const [position, positionContract] of Object.entries(POSITIONS)) {
    const stateKey = [
      COIN_PARTY_PUBLICATION_CONTRACT.cohort,
      position,
      positionContract.order,
      positionContract.code,
      stack,
      stackOrder,
    ].join("|");
    const state = coverage.get(stateKey);
    assert(state, `missing state coverage ${stateKey}`);
    for (const hand of HANDS) {
      const cellKey = `${stateKey}|${hand}`;
      const cell = grouped.get(cellKey) || {
        cohort: COIN_PARTY_PUBLICATION_CONTRACT.cohort,
        position_group: position,
        position_order: positionContract.order,
        position_code: positionContract.code,
        stack_bucket: stack,
        stack_order: stackOrder,
        hand_class: hand,
        ...emptyCounters(),
      };
      outputRows.push(outputRow(cell, state));
    }
  }
}
assert.equal(
  outputRows.length,
  COIN_PARTY_PUBLICATION_CONTRACT.possibleCells,
  "dense supplement cube row count",
);
const outputText = `${STANDARD_COLUMNS.join(",")}\n${outputRows.map((row) => (
  STANDARD_COLUMNS.map((column) => csvCell(row[column])).join(",")
)).join("\n")}\n`;
fs.writeFileSync(outputPath, outputText, { mode: 0o600 });
fs.chmodSync(outputPath, 0o600);

const totals = emptyCounters();
for (const row of outputRows) addCounters(totals, row);
assert.equal(totals.raises_total, totals.regular_raise + totals.open_shove, "raise partition");
assert.equal(
  totals.opportunities,
  totals.raises_total + totals.limp + totals.fold_other,
  "action partition",
);
assert.equal(
  totals.open_shove,
  totals.shove_allin_flag + totals.shove_effective_amount_only,
  "shove partition",
);
assert.equal(totals.normal_three_bb_as_shove, 0, "regular 3BB classified as shove");
assert.equal(totals.non_exact_r_effective_allin, 0, "non-exact effective all-in");

const grammar = coinPartyGrammarContract();
const manifest = {
  schema: "ff-rfi-coin-party-publication-merge-v2",
  sourceKind: "publication-safe-novel-raw-hh-l3top",
  strategy: "approved-plan-source-union-with-observed-zero-dimension-completion",
  sourceContract: COIN_PARTY_PUBLICATION_CONTRACT.schema,
  planSha256: sha256(planBuffer),
  plan: {
    schema: "ff-rfi-coin-party-publication-run-plan-v2",
    sha256: sha256(planBuffer),
    sourceSetComplete: true,
    networks: selectedNetworks,
    userShardsPerNetwork: COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork,
    expectedExecutions: sourceManifestRows.length,
    exactDisjointUserUnion: true,
    targetFilter: false,
  },
  window: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window,
  cohort: {
    name: COIN_PARTY_PUBLICATION_CONTRACT.cohort,
    selectedPlayers: COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers,
    membershipSha256: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.membershipSha256,
    userIdsSha256: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
  },
  membership: {
    sha256: sha256(membershipBuffer),
    keysSha256: membership.keysSha256,
    rows: membership.rows,
    cohortCounts: membership.cohortCounts,
    selectedCohort: COIN_PARTY_PUBLICATION_CONTRACT.cohort,
    selectedPlayers: COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers,
    selectedUserIdsSha256: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
  },
  networks: selectedNetworks,
  grammar: {
    sha256: grammar.sha256,
    privateOverlapValidation: COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation,
  },
  parserValidation: {
    schema: COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding.reportSchema,
    sha256: sha256(parserValidationBuffer),
    gatePassed: true,
    networks: selectedNetworks,
    exactMismatchTolerance: 0,
    validatedAt: parserValidation.validatedAt,
    binding: {
      parserTemplateSha256,
      parserImplementationSha256,
      grammarSha256: grammar.sha256,
      membershipSha256: sha256(membershipBuffer),
      userIdsSha256: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
      window: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window,
    },
    source: parserValidation.source,
  },
  gatePolicy: {
    trackerLatestSelection: "deterministic byte-identical ledger and timed argMax tuples",
    normalizedIds: ["casefold", "alphanumeric compact", "known-prefix strip"],
    ambiguityRejection: [
      "structured exact-time collision",
      "raw normalized-id ambiguity",
      "raw canonical-header collision",
    ],
    canonicalHeader:
      "exactly one raw key per user/network canonical header, with that header equal to the raw key",
    structuredAntiJoin: "canonical header id has zero structured matches",
    networkTotals: plan.expectedStrongGateTotals,
  },
  inputs: [...sourceManifestRows].sort(compareSources),
  sources: [...sourceManifestRows].sort(compareSources),
  aggregateTemplateSha256: publicationTemplateSha256,
  densification: {
    observedInputRows: sourceManifestRows.reduce((sum, source) => sum + source.resultRows, 0),
    observedInputCells: sourceManifestRows.reduce((sum, source) => sum + source.observedCells, 0),
    canonicalOutputCells: outputRows.length,
    absentDimensionsMaterializedAsObservedZero: true,
    smoothingApplied: false,
    modeledValuesApplied: false,
  },
  cube: {
    stackBuckets: COIN_PARTY_PUBLICATION_CONTRACT.stackBuckets,
    positions: COIN_PARTY_PUBLICATION_CONTRACT.positions,
    handClasses: COIN_PARTY_PUBLICATION_CONTRACT.handClasses,
    states: coverage.size,
    rowCount: outputRows.length,
    dense: true,
    targetFilter: false,
    outputSha256: sha256(outputText),
    outputBytes: Buffer.byteLength(outputText),
  },
  merged: {
    file: "coin-party-publication.csv",
    rows: outputRows.length,
    sha256: sha256(outputText),
    bytes: Buffer.byteLength(outputText),
    windowStartInclusive:
      `${COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window[0]}T00:00:00Z`,
    windowEndExclusive:
      `${COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window[1]}T00:00:00Z`,
    knownCards: {
      eligible: [...coverage.values()].reduce((sum, state) => sum + state.eligible, 0),
      known: [...coverage.values()].reduce((sum, state) => sum + state.known, 0),
      lookupMismatch: [...coverage.values()].reduce((sum, state) => sum + state.mismatch, 0),
      pct: 100,
    },
    totals,
    cube: {
      cohort: COIN_PARTY_PUBLICATION_CONTRACT.cohort,
      stateCount: coverage.size,
      rowCount: outputRows.length,
      handClassesPerState: COIN_PARTY_PUBLICATION_CONTRACT.handClasses,
      coverageReconciled: true,
    },
  },
  totals,
  privacy: COIN_PARTY_PUBLICATION_CONTRACT.privacy,
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
assertPublicMetadata(manifest, "Coin/Party merge manifest");
fs.writeFileSync(manifestPath, manifestText, { mode: 0o600 });
fs.chmodSync(manifestPath, 0o600);
console.log(JSON.stringify({
  schema: manifest.schema,
  rows: manifest.cube.rowCount,
  states: manifest.cube.states,
  outputSha256: manifest.cube.outputSha256,
  manifestSha256: sha256(manifestText),
  totals,
}));

function validatePlan(value) {
  assert.equal(value.schema, "ff-rfi-coin-party-publication-run-plan-v2");
  assert.deepEqual(Object.keys(value).sort(), [
    "expectedStrongGateTotals",
    "membershipSha256",
    "parserImplementationSha256",
    "parserTemplateSha256",
    "publicationTemplateSha256",
    "schema",
    "sources",
    "tableSize",
    "targetFilter",
    "userIdsSha256",
    "window",
  ], "run plan allowlist drift");
  assert.deepEqual(
    value.window,
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window,
    "run plan window drift",
  );
  assert.equal(value.targetFilter, false, "run plan must explicitly forbid target filtering");
  assert.equal(value.tableSize, 7, "run plan must explicitly select exact 7-max");
  assert.equal(
    value.membershipSha256,
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.membershipSha256,
    "run plan membership hash drift",
  );
  assert.equal(
    value.userIdsSha256,
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
    "run plan user-id hash drift",
  );
  assert.equal(
    value.publicationTemplateSha256,
    publicationTemplateSha256,
    "run plan publication template hash drift",
  );
  assert.equal(
    value.parserTemplateSha256,
    parserTemplateSha256,
    "run plan parser template hash drift",
  );
  assert.equal(
    value.parserImplementationSha256,
    parserImplementationSha256,
    "run plan parser implementation hash drift",
  );
  assert(Array.isArray(value.sources), "run plan sources are required");
  const selectedNetworks = COIN_PARTY_PUBLICATION_NETWORKS.filter((network) => (
    value.sources.some((source) => source.network === network)
  ));
  assert(selectedNetworks.length > 0, "run plan needs at least one approved network");
  assert.deepEqual(
    [...new Set(value.sources.map((source) => source.network))].sort(),
    [...selectedNetworks].sort(),
    "run plan contains an unsupported network",
  );
  assert.deepEqual(
    Object.keys(value.expectedStrongGateTotals || {}).sort(),
    [...selectedNetworks].sort(),
    "run plan gate-total network scope drift",
  );
  for (const network of selectedNetworks) {
    assert.deepEqual(
      validateCoinPartyGateTotals(
        network,
        value.expectedStrongGateTotals[network],
      ),
      COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.strongGateTotals[network],
      `${network}: strong frozen run-plan gate totals drift`,
    );
  }
  assert.equal(
    value.sources.length,
    selectedNetworks.length
      * COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork,
    "run plan must contain exactly four sources per selected network",
  );
  const identities = value.sources.map((source) => `${source.network}|${source.shardIndex}`);
  assert.equal(new Set(identities).size, value.sources.length, "duplicate plan source identity");
  for (const source of value.sources) {
    assert.deepEqual(Object.keys(source).sort(), [
      "aggregateCsv",
      "executionReceipt",
      "network",
      "querySha256",
      "querySql",
      "renderMetadata",
      "renderMetadataSha256",
      "shardIndex",
    ], "run plan source allowlist drift");
    assert.match(source.querySha256 || "", /^[a-f0-9]{64}$/, "run plan query hash invalid");
    assert.match(
      source.renderMetadataSha256 || "",
      /^[a-f0-9]{64}$/,
      "run plan renderer hash invalid",
    );
  }
  for (const network of selectedNetworks) {
    assert.deepEqual(
      value.sources
        .filter((source) => source.network === network)
        .map((source) => nonNegativeInteger(source.shardIndex, "plan shard"))
        .sort((left, right) => left - right),
      [0, 1, 2, 3],
      `${network}: run plan needs shards 0..3`,
    );
  }
  return selectedNetworks;
}

function validateQuery(sql, network) {
  assert(sql.includes("publication_eligible_raw_keys"), `${network}: publication gate missing`);
  assert(sql.includes("raw_canonical_header_index"), `${network}: canonical raw-header index missing`);
  assert(
    sql.includes("raw_header_key_count, toUInt64(0)) = 1"),
    `${network}: canonical raw-header collision rejection missing`,
  );
  assert(sql.includes("tracker_selection_drift = 0"), `${network}: tracker drift gate missing`);
  assert(sql.includes("raw exact-id partition identity failed"), `${network}: exact partition gate missing`);
  assert(sql.includes("publication eligibility partition failed"), `${network}: publication partition gate missing`);
  assert(
    sql.includes(`network = '${network}'`) || sql.includes(`network IN (\n      '${network}'\n    )`),
    `${network}: network restriction missing`,
  );
  assert(
    !/\bhand_class\s*(?:=|IN\s*\(|LIKE\b)/i.test(sql),
    `${network}: target hand filter forbidden`,
  );
  assert(
    !/\b(?:position_group|stack_bucket)\s*(?:=|IN\s*\(|LIKE\b)/i.test(sql),
    `${network}: target position/stack filter forbidden`,
  );
  assert(!/\btarget_hand\b/i.test(sql), `${network}: target-cell filter forbidden`);
  for (const required of [
    "WHERE player_count = 7",
    "AND length(seat_numbers) = 7",
    "AND length(arrayDistinct(seat_numbers)) = 7",
    "'cnt_players = 7' AS table_filter",
    "toUInt8(7) AS table_size",
    "countIf(action_class = 'raise') AS regular_raise",
    "countIf(action_class = 'shove') AS open_shove",
    "countIf(action_class = 'limp') AS limp",
    "countIf(action_class = 'fold') AS fold_other",
    "normal_three_bb_as_shove",
  ]) assert(sql.includes(required), `${network}: aggregate counter missing ${required}`);
}

function validateRenderer(
  renderer,
  network,
  shardIndex,
  queryBuffer,
  expectedUserIds,
  parserValidationBuffer,
) {
  const canonicalDirectory = fs.mkdtempSync("/private/tmp/ff-rfi-coin-party-canonical-");
  try {
    const canonicalQueryPath = path.join(canonicalDirectory, "query.sql");
    const canonicalMetadataPath = path.join(canonicalDirectory, "render.json");
    const rendered = spawnSync(process.execPath, [
      path.join(here, "render-coin-party-publication-query.mjs"),
      membershipPath,
      `--network=${network}`,
      `--user-shard-index=${shardIndex}`,
      `--user-shard-count=${COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork}`,
      "--mode=aggregate",
      `--output=${canonicalQueryPath}`,
      `--metadata-output=${canonicalMetadataPath}`,
      `--parser-validation=${parserValidationPath}`,
      ...(options["parser-template"]
        ? [`--parser-template=${parserTemplatePath}`]
        : []),
    ], { encoding: "utf8" });
    assert.equal(
      rendered.status,
      0,
      `canonical renderer failed: ${rendered.stderr || rendered.stdout}`,
    );
    assert(
      queryBuffer.equals(fs.readFileSync(canonicalQueryPath)),
      `${network}/${shardIndex}: query is not the exact canonical renderer output`,
    );
    assert.deepEqual(
      renderer,
      JSON.parse(fs.readFileSync(canonicalMetadataPath, "utf8")),
      `${network}/${shardIndex}: renderer metadata is not canonical`,
    );
  } finally {
    fs.rmSync(canonicalDirectory, { recursive: true, force: true });
  }
  assert.equal(renderer.schema, "ff-rfi-coin-party-publication-render-v2");
  assert.equal(renderer.network, network, "renderer network mismatch");
  assert.equal(renderer.cohort, COIN_PARTY_PUBLICATION_CONTRACT.cohort, "renderer cohort mismatch");
  assert.equal(
    renderer.selectedPlayers,
    COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers,
    "renderer cohort size mismatch",
  );
  assert.deepEqual(
    renderer.window,
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window,
    "renderer window mismatch",
  );
  assert.equal(renderer.cube?.targetFilter, false, "target-filtered source forbidden");
  assert.equal(
    renderer.cube?.possibleCells,
    COIN_PARTY_PUBLICATION_CONTRACT.possibleCells,
    "renderer cube mismatch",
  );
  assert.equal(renderer.userShard?.index, shardIndex, "renderer shard index mismatch");
  assert.equal(
    renderer.userShard?.count,
    COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork,
    "renderer shard count mismatch",
  );
  assert.equal(
    renderer.userShard?.users,
    expectedUserIds.length,
    "renderer shard size mismatch",
  );
  assert.equal(
    renderer.userShard?.userIdsSha256,
    sha256(expectedUserIds.join(",")),
    "renderer shard membership hash mismatch",
  );
  assert.equal(renderer.renderedSqlSha256, sha256(queryBuffer), "renderer query hash mismatch");
  assert.equal(
    renderer.membershipSha256,
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.membershipSha256,
    "renderer membership hash mismatch",
  );
  assert.equal(
    renderer.userIdsSha256,
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
    "renderer user-id set hash mismatch",
  );
  assert.equal(renderer.mode, "aggregate", "merge accepts aggregate render only");
  assert.deepEqual(
    renderer.frozenMembership,
    {
      membershipSha256Matches: true,
      userIdsSha256Matches: true,
    },
    "renderer did not use the frozen publication cohort",
  );
  assert.equal(
    renderer.publicationTemplateSha256,
    publicationTemplateSha256,
    "renderer publication template hash mismatch",
  );
  assert.equal(
    renderer.parserTemplateSha256,
    parserTemplateSha256,
    "renderer parser template hash mismatch",
  );
  assert.equal(
    renderer.parserImplementationSha256,
    parserImplementationSha256,
    "renderer parser implementation hash mismatch",
  );
  assert.equal(
    renderer.grammarSha256,
    coinPartyGrammarContract().sha256,
    "renderer grammar contract mismatch",
  );
  assert.equal(
    renderer.parserValidation?.reportSha256,
    sha256(parserValidationBuffer),
    "renderer parser-validation bytes mismatch",
  );
  assert.deepEqual(
    renderer.parserValidation,
    {
      schema: COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding.reportSchema,
      reportSha256: sha256(parserValidationBuffer),
      parserTemplateSha256,
      parserImplementationSha256,
      grammarSha256: coinPartyGrammarContract().sha256,
      membershipSha256: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.membershipSha256,
      userIdsSha256: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
      window: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window,
    },
    "renderer parser-validation binding drift",
  );
  assert.deepEqual(
    renderer.privateOverlapValidation,
    COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation,
    "private overlap proof drift",
  );
  assert.equal(renderer.targetFilter, false, "renderer targetFilter must be explicitly false");
  assert.deepEqual(renderer.exactTableContract, {
    tableSize: 7,
    playerCountPredicate: "player_count = 7",
    seatCountPredicate: "length(seat_numbers) = 7",
    distinctSeatPredicate: "length(arrayDistinct(seat_numbers)) = 7",
  });
  assert.deepEqual(renderer.execution, COIN_PARTY_PUBLICATION_CONTRACT.execution);
  assert.deepEqual(renderer.privacy, COIN_PARTY_PUBLICATION_CONTRACT.privacy);
}

function validateReceipt(
  receipt,
  network,
  shardIndex,
  sourceBuffer,
  queryBuffer,
  rendererBuffer,
  rowCount,
  rows,
  expectedUserIds,
  executionIds,
) {
  assert.equal(
    receipt.schema,
    COIN_PARTY_PUBLICATION_CONTRACT.execution.receiptSchema,
    "execution receipt schema is not trusted",
  );
  assert.equal(receipt.status, "succeeded", "aggregate execution failed");
  assert.equal(receipt.execution_mode, "async", "publication query must use async execution");
  assert.equal(receipt.network, network, "receipt network mismatch");
  assert.equal(
    receipt.window_start_inclusive,
    `${COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window[0]}T00:00:00Z`,
    "receipt window start mismatch",
  );
  assert.equal(
    receipt.window_end_exclusive,
    `${COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window[1]}T00:00:00Z`,
    "receipt window end mismatch",
  );
  validateExecutionTimes(receipt.started_at, receipt.finished_at, "aggregate receipt");
  assert.equal(receipt.user_shard?.index, shardIndex, "receipt shard index mismatch");
  assert.equal(
    receipt.user_shard?.count,
    COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork,
    "receipt shard count mismatch",
  );
  assert.equal(
    receipt.user_shard?.users,
    expectedUserIds.length,
    "receipt shard size mismatch",
  );
  assert.equal(
    receipt.user_shard?.user_ids_sha256,
    sha256(expectedUserIds.join(",")),
    "receipt shard membership hash mismatch",
  );
  assert.match(receipt.job_id || "", /^mcp_ch_job_[a-f0-9]{32}$/, "invalid execution id");
  assert(!executionIds.has(receipt.job_id), "duplicate execution id");
  executionIds.add(receipt.job_id);
  assert.equal(receipt.row_count, rowCount, "receipt row count mismatch");
  assert.equal(receipt.byte_size, sourceBuffer.length, "receipt byte size mismatch");
  assert.equal(receipt.result_sha256, sha256(sourceBuffer), "receipt result hash mismatch");
  assert.equal(receipt.query_sha256, sha256(queryBuffer), "receipt query hash mismatch");
  assert.equal(
    receipt.render_metadata_sha256,
    sha256(rendererBuffer),
    "receipt renderer metadata hash mismatch",
  );
  const snake = receipt.gate_counts;
  assert(snake && typeof snake === "object", "strong gate counters missing");
  const camel = Object.fromEntries(Object.entries(GATE_RECEIPT_KEYS).map(([camelKey, snakeKey]) => (
    [camelKey, integer(snake[snakeKey], `receipt gate ${snakeKey}`)]
  )));
  const gate = validateCoinPartyGateTotals(network, camel);
  const observedStates = new Set(rows.map(stateDimensionKey)).size;
  const observedCells = new Set(rows.map(dimensionKey)).size;
  const counters = emptyCounters();
  for (const row of rows) addCounters(counters, row);
  assert.deepEqual(receipt.aggregate, {
    observed_states: observedStates,
    observed_cells: observedCells,
    opportunities: counters.opportunities,
    raises_total: counters.raises_total,
    regular_raise: counters.regular_raise,
    open_shove: counters.open_shove,
    limp: counters.limp,
    fold_other: counters.fold_other,
    normal_three_bb_as_shove: counters.normal_three_bb_as_shove,
    non_exact_r_effective_allin: counters.non_exact_r_effective_allin,
  }, "receipt aggregate reconciliation drift");
  return { gate, observedStates, observedCells };
}

function validateGateCompanion(receipt, receiptPath, executionIds) {
  const companion = receipt.gate_companion;
  assert.equal(
    companion?.schema,
    "ff-rfi-coin-party-publication-gate-execution-v2",
    "empty aggregate gate companion schema is not trusted",
  );
  assert.equal(companion?.status, "succeeded", "empty aggregate gate execution failed");
  assert.equal(companion?.execution_mode, "async", "gate query must use async execution");
  assert.equal(companion?.network, receipt.network, "gate companion network mismatch");
  assert.deepEqual(companion?.user_shard, receipt.user_shard, "gate companion shard mismatch");
  assert.equal(
    companion?.window_start_inclusive,
    receipt.window_start_inclusive,
    "gate companion window start mismatch",
  );
  assert.equal(
    companion?.window_end_exclusive,
    receipt.window_end_exclusive,
    "gate companion window end mismatch",
  );
  validateExecutionTimes(companion?.started_at, companion?.finished_at, "gate companion");
  assert.equal(companion?.all_assertions_passed, true, "empty aggregate needs gate companion");
  assert.match(companion?.job_id || "", /^mcp_ch_job_[a-f0-9]{32}$/, "invalid gate execution id");
  assert(!executionIds.has(companion.job_id), "duplicate gate execution id");
  executionIds.add(companion.job_id);
  const queryPath = privateInput(companion.query_file, `${receiptPath} gate query`);
  const rendererPath = privateInput(
    companion.render_metadata_file,
    `${receiptPath} gate renderer metadata`,
  );
  const resultPath = privateInput(companion.result_file, `${receiptPath} gate result`);
  const queryBuffer = fs.readFileSync(queryPath);
  const rendererBuffer = fs.readFileSync(rendererPath);
  assert.equal(companion.query_sha256, sha256(queryBuffer), "gate query hash mismatch");
  assert.equal(
    companion.render_metadata_sha256,
    sha256(rendererBuffer),
    "gate renderer metadata hash mismatch",
  );
  const canonicalDirectory = fs.mkdtempSync("/private/tmp/ff-rfi-coin-party-gate-canonical-");
  try {
    const canonicalQueryPath = path.join(canonicalDirectory, "query.sql");
    const canonicalMetadataPath = path.join(canonicalDirectory, "render.json");
    const rendered = spawnSync(process.execPath, [
      path.join(here, "render-coin-party-publication-query.mjs"),
      membershipPath,
      `--network=${receipt.network}`,
      `--user-shard-index=${receipt.user_shard.index}`,
      `--user-shard-count=${COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork}`,
      "--mode=gate",
      `--output=${canonicalQueryPath}`,
      `--metadata-output=${canonicalMetadataPath}`,
      `--parser-validation=${parserValidationPath}`,
      ...(options["parser-template"]
        ? [`--parser-template=${parserTemplatePath}`]
        : []),
    ], { encoding: "utf8" });
    assert.equal(
      rendered.status,
      0,
      `canonical gate renderer failed: ${rendered.stderr || rendered.stdout}`,
    );
    assert(
      queryBuffer.equals(fs.readFileSync(canonicalQueryPath)),
      "gate query is not the exact canonical renderer output",
    );
    assert(
      rendererBuffer.equals(fs.readFileSync(canonicalMetadataPath)),
      "gate renderer metadata is not canonical",
    );
  } finally {
    fs.rmSync(canonicalDirectory, { recursive: true, force: true });
  }
  const resultBuffer = fs.readFileSync(resultPath);
  assert.equal(companion.result_sha256, sha256(resultBuffer), "gate result hash mismatch");
  assert.equal(companion.result_bytes, resultBuffer.length, "gate result byte size mismatch");
  assert.equal(companion.result_rows, 1, "gate result must contain exactly one assertion row");
  const parsed = parseCsv(resultBuffer.toString("utf8"));
  assert.equal(parsed.rows.length, 1, "gate result must contain one data row");
  const gateRow = parsed.rows[0];
  assert.equal(
    gateRow.supplemental_network,
    receipt.network,
    "gate result network mismatch",
  );
  assert.equal(
    integer(gateRow.source_user_shard_index, "gate shard index"),
    receipt.user_shard.index,
    "gate result shard index mismatch",
  );
  assert.equal(
    integer(gateRow.source_user_shard_count, "gate shard count"),
    receipt.user_shard.count,
    "gate result shard count mismatch",
  );
  for (const column of Object.values(GATE_RECEIPT_KEYS)) {
    assert.equal(
      integer(gateRow[`source_gate_${column}`], `gate result ${column}`),
      integer(receipt.gate_counts[column], `receipt gate ${column}`),
      `gate result counter mismatch: ${column}`,
    );
  }
  for (const field of [
    "tracker_selection_assertion",
    "exact_partition_assertion",
    "publication_partition_assertion",
  ]) assert.equal(gateRow[field], "1", `gate assertion failed: ${field}`);
}

function validateRowProvenance(row, network, shardIndex, gate, location) {
  assert.equal(row.supplemental_network, network, `${location}: network drift`);
  assert.equal(integer(row.source_user_shard_index, location), shardIndex, `${location}: shard drift`);
  assert.equal(
    integer(row.source_user_shard_count, location),
    COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork,
    `${location}: shard count drift`,
  );
  for (const [column, key] of [
    ["source_gate_raw_keys", "rawKeys"],
    ["source_gate_exact_id_match_keys", "exactIdMatchKeys"],
    ["source_gate_nominal_novel_keys", "nominalNovelKeys"],
    ["source_gate_normalized_time_eligible_keys", "normalizedTimeEligibleKeys"],
    ["source_gate_publication_eligible_keys", "publicationEligibleKeys"],
  ]) assert.equal(integer(row[column], location), gate[key], `${location}: ${column} drift`);
}

function validateDimensions(row, location) {
  const [startInclusive, endExclusive] = COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window;
  assert.equal(row.window_start, startInclusive, `${location}: window start`);
  assert.equal(row.window_end, previousDate(endExclusive), `${location}: window end`);
  assert.equal(row.table_filter, "cnt_players = 7", `${location}: table filter`);
  assert.equal(integer(row.table_size, location), 7, `${location}: table size`);
  assert.equal(row.cohort, COIN_PARTY_PUBLICATION_CONTRACT.cohort, `${location}: cohort`);
  assert.equal(
    integer(row.cohort_selected_players, location),
    COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers,
    `${location}: cohort size`,
  );
  assert(POSITIONS[row.position_group], `${location}: position`);
  assert.equal(
    integer(row.position_order, location),
    POSITIONS[row.position_group].order,
    `${location}: position order`,
  );
  assert.equal(
    integer(row.position_code, location),
    POSITIONS[row.position_group].code,
    `${location}: position code`,
  );
  assert.equal(integer(row.stack_order, location), STACKS[row.stack_bucket], `${location}: stack`);
  assert(canonicalHands().has(row.hand_class), `${location}: hand class`);
}

function validateActions(row, location) {
  const values = Object.fromEntries(COUNTERS.map((key) => [key, integer(row[key], location)]));
  assert.equal(values.raises_total, values.regular_raise + values.open_shove, `${location}: raises`);
  assert.equal(
    values.opportunities,
    values.raises_total + values.limp + values.fold_other,
    `${location}: actions`,
  );
  assert.equal(
    values.open_shove,
    values.shove_allin_flag + values.shove_effective_amount_only,
    `${location}: shoves`,
  );
  assert.equal(values.normal_three_bb_as_shove, 0, `${location}: 3BB shove misclassification`);
  assert.equal(values.non_exact_r_effective_allin, 0, `${location}: non-exact all-in`);
}

function outputRow(cell, state) {
  const total = cell.opportunities;
  return {
    window_start: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window[0],
    window_end: previousDate(COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window[1]),
    table_filter: "cnt_players = 7",
    table_size: COIN_PARTY_PUBLICATION_CONTRACT.tableSize,
    cohort: COIN_PARTY_PUBLICATION_CONTRACT.cohort,
    cohort_selected_players: COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers,
    position_group: cell.position_group,
    position_order: cell.position_order,
    position_code: cell.position_code,
    stack_bucket: cell.stack_bucket,
    stack_order: cell.stack_order,
    hand_class: cell.hand_class,
    eligible_opportunities: state.eligible,
    known_card_opportunities: state.known,
    lookup_mismatch_opportunities: state.mismatch,
    first_observed_at: state.first,
    last_observed_at: state.last,
    ...Object.fromEntries(COUNTERS.map((key) => [key, cell[key]])),
    raise_total_pct: pct(cell.raises_total, total),
    regular_raise_pct: pct(cell.regular_raise, total),
    open_shove_pct: pct(cell.open_shove, total),
    limp_pct: pct(cell.limp, total),
    fold_pct: pct(cell.fold_other, total),
    below_exact_minimum: Number(total < 50),
    low_sample: Number(total < 100),
  };
}

function emptyCell(row) {
  return {
    cohort: row.cohort,
    position_group: row.position_group,
    position_order: integer(row.position_order, "position_order"),
    position_code: integer(row.position_code, "position_code"),
    stack_bucket: row.stack_bucket,
    stack_order: integer(row.stack_order, "stack_order"),
    hand_class: row.hand_class,
    ...emptyCounters(),
  };
}

function emptyCounters() {
  return Object.fromEntries(COUNTERS.map((counter) => [counter, 0]));
}

function addCounters(target, source) {
  for (const counter of COUNTERS) target[counter] += Number(source[counter] || 0);
}

function dimensionKey(row) {
  return [
    row.cohort, row.position_group, row.position_order, row.position_code,
    row.stack_bucket, row.stack_order, row.hand_class,
  ].join("|");
}

function stateDimensionKey(row) {
  return [
    row.cohort, row.position_group, row.position_order, row.position_code,
    row.stack_bucket, row.stack_order,
  ].join("|");
}

function pct(value, total) {
  if (!total) return "0";
  return (Number(value) / Number(total) * 100)
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

function integer(value, location) {
  assert.match(String(value), /^\d+$/, `${location}: non-negative integer required`);
  const result = Number(value);
  assert(Number.isSafeInteger(result), `${location}: unsafe integer`);
  return result;
}

function nonNegativeInteger(value, label) {
  const result = Number(value);
  assert(Number.isSafeInteger(result) && result >= 0, `${label} must be a non-negative integer`);
  return result;
}

function parseCsv(text) {
  const values = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      values.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    values.push(row);
  }
  const header = values.shift() || [];
  return {
    header,
    rows: values.filter((cells) => cells.some(Boolean)).map((cells, index) => {
      assert.equal(cells.length, header.length, `CSV row ${index + 2} is malformed`);
      return Object.fromEntries(header.map((column, columnIndex) => (
        [column, cells[columnIndex]]
      )));
    }),
  };
}

function inspectFrozenMembership(text, input) {
  const parsed = parseCsv(text);
  assert.deepEqual(
    parsed.header,
    [
      "cohort",
      "user_id",
      "current_rank",
      "current_league",
      "ffev_hands",
      "ffev",
      "cohort_selected_players",
    ],
    `${input}: frozen membership header drift`,
  );
  const cohortNames = ["l1", "l2", "l3", "l3top"];
  const cohortSets = Object.fromEntries(cohortNames.map((cohort) => [cohort, new Set()]));
  const keys = new Set();
  for (const [index, row] of parsed.rows.entries()) {
    const location = `${input}:${index + 2}`;
    assert(cohortSets[row.cohort], `${location}: invalid cohort`);
    const userId = Number(row.user_id);
    assert(Number.isSafeInteger(userId) && userId > 0, `${location}: invalid user id`);
    const key = `${row.cohort}|${userId}`;
    assert(!keys.has(key), `${location}: duplicate membership key`);
    keys.add(key);
    cohortSets[row.cohort].add(userId);
    assert.equal(
      Number(row.cohort_selected_players),
      cohortSets[row.cohort].size > 0
        ? { l1: 165, l2: 484, l3: 975, l3top: 244 }[row.cohort]
        : 0,
      `${location}: selected-player count drift`,
    );
  }
  const userIds = [...cohortSets.l3top].sort((left, right) => left - right);
  assert.equal(parsed.rows.length, 1868, `${input}: frozen membership row count drift`);
  assert.deepEqual(
    Object.fromEntries(cohortNames.map((cohort) => [cohort, cohortSets[cohort].size])),
    { l1: 165, l2: 484, l3: 975, l3top: 244 },
    `${input}: frozen membership cohort counts drift`,
  );
  assert.equal(
    sha256(Buffer.from(text)),
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.membershipSha256,
    `${input}: frozen membership bytes drift`,
  );
  assert.equal(
    sha256(userIds.join(",")),
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
    `${input}: frozen l3top membership drift`,
  );
  return {
    rows: parsed.rows.length,
    keysSha256: sha256([...keys].sort().join("\n")),
    cohortCounts: Object.fromEntries(
      cohortNames.map((cohort) => [cohort, cohortSets[cohort].size]),
    ),
    userIds,
  };
}

function expectedUserPartition(userIds, index, count) {
  const start = Math.floor(userIds.length * index / count);
  const end = Math.floor(userIds.length * (index + 1) / count);
  const selected = userIds.slice(start, end);
  assert.equal(
    selected.length,
    COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers
      / COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork,
    `unbalanced frozen user shard ${index}/${count}`,
  );
  return selected;
}

function validateParserValidation(report, reportBuffer, membershipBuffer) {
  const contract = COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation;
  const grammarSha256 = coinPartyGrammarContract().sha256;
  assert.equal(report.schema, contract.binding.reportSchema, "parser validation schema drift");
  assert.equal(report.status, "passed", "parser validation did not pass");
  assert.deepEqual(report.binding, {
    parserTemplateSha256,
    parserImplementationSha256,
    grammarSha256,
    membershipSha256: sha256(membershipBuffer),
    userIdsSha256: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
    window: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window,
  }, "parser validation grammar/window/membership binding drift");
  assert.deepEqual(report.source, {
    ...contract.source,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  }, "parser validation source bytes/window coverage drift");
  assert.match(sha256(reportBuffer), /^[a-f0-9]{64}$/);
  const validatedAt = Date.parse(report.validatedAt || "");
  const windowEnd = Date.parse(
    `${COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window[1]}T00:00:00Z`,
  );
  assert(
    Number.isFinite(validatedAt) && validatedAt >= windowEnd,
    "parser validation predates the frozen window cutoff",
  );
  const coin = report.networks?.CoinPoker;
  const party = report.networks?.PartyPoker;
  assert.equal(Number(coin?.rows), contract.CoinPoker.sample, "CoinPoker parser sample drift");
  assert.equal(Number(coin?.parsed), contract.CoinPoker.accepted, "CoinPoker parser acceptance drift");
  assert.equal(Number(coin?.rejected), 0, "CoinPoker parser rejection drift");
  assert.equal(
    Number(party?.rows),
    contract.PartyPoker.exact7Sample + contract.PartyPoker.raw8Sample,
    "PartyPoker parser sample drift",
  );
  assert.equal(
    Number(party?.parsed),
    contract.PartyPoker.acceptedExact7,
    "PartyPoker exact-7 parser acceptance drift",
  );
  assert.equal(
    Number(party?.rejected),
    contract.PartyPoker.rejectedRaw8,
    "PartyPoker raw-8 parser rejection drift",
  );
  assert.equal(
    Number(party?.reasons?.["not-exact-7"]),
    contract.PartyPoker.rejectedRaw8,
    "PartyPoker raw-8 rejection reason drift",
  );
  for (const [network, stats] of [["CoinPoker", coin], ["PartyPoker", party]]) {
    for (const checkName of ["cards", "position", "stack", "publicStack", "action", "shove"]) {
      const check = stats?.checks?.[checkName];
      assert(
        Number.isSafeInteger(Number(check?.compared))
          && Number(check.compared) > 0
          && Number(check.matched) === Number(check.compared)
          && Number(check.pct) === 100,
        `${network} parser ${checkName} overlap proof drift`,
      );
    }
  }
}

function gateToSnake(value) {
  return Object.fromEntries(
    Object.entries(GATE_RECEIPT_KEYS).map(([camel, snake]) => [snake, value[camel]]),
  );
}

function snakeGateToCamel(value) {
  return Object.fromEntries(
    Object.entries(GATE_RECEIPT_KEYS).map(([camel, snake]) => [
      camel,
      integer(value?.[snake], `publication gate ${snake}`),
    ]),
  );
}

function validateExecutionTimes(startedAt, finishedAt, label) {
  assert.match(String(startedAt || ""), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/, `${label}: invalid started_at`);
  assert.match(String(finishedAt || ""), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/, `${label}: invalid finished_at`);
  const started = Date.parse(startedAt);
  const finished = Date.parse(finishedAt);
  const cutoff = Date.parse(
    `${COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window[1]}T00:00:00Z`,
  );
  assert(Number.isFinite(started) && Number.isFinite(finished), `${label}: unparseable execution time`);
  assert(started <= finished, `${label}: execution finished before it started`);
  assert(finished >= cutoff, `${label}: execution finished before the frozen window cutoff`);
}

function assertPublicMetadata(value, label) {
  assert(value && typeof value === "object", `${label}: object required`);
  for (const source of value.inputs || []) {
    assert.deepEqual(
      Object.keys(source).sort(),
      [...PUBLIC_SOURCE_KEYS].sort(),
      `${label}: public input metadata allowlist drift`,
    );
    assert.deepEqual(Object.keys(source.userShard || {}).sort(), [
      "count",
      "index",
      "userIdsSha256",
      "users",
    ]);
  }
  const visit = (candidate, keyPath = "") => {
    if (typeof candidate === "string") {
      assert(!candidate.includes("/private/"), `${label}: private path leaked at ${keyPath}`);
      assert(!candidate.includes("/Users/"), `${label}: local path leaked at ${keyPath}`);
      assert(!/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(candidate), `${label}: email leaked at ${keyPath}`);
      return;
    }
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, `${keyPath}[${index}]`));
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    for (const [key, child] of Object.entries(candidate)) {
      assert(!/(?:path|basename)$/i.test(key), `${label}: forbidden metadata key ${keyPath}.${key}`);
      visit(child, keyPath ? `${keyPath}.${key}` : key);
    }
  };
  visit(value);
}

function canonicalHands() {
  const ranks = "AKQJT98765432";
  const result = new Set();
  for (let high = 0; high < ranks.length; high += 1) {
    result.add(`${ranks[high]}${ranks[high]}`);
    for (let low = high + 1; low < ranks.length; low += 1) {
      result.add(`${ranks[high]}${ranks[low]}s`);
      result.add(`${ranks[high]}${ranks[low]}o`);
    }
  }
  assert.equal(result.size, COIN_PARTY_PUBLICATION_CONTRACT.handClasses);
  return result;
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

function parseOptions(args) {
  return Object.fromEntries(args.map((argument) => {
    const match = argument.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`expected --key=value, got ${argument}`);
    return [match[1], match[2]];
  }));
}

function previousDate(date) {
  return new Date(Date.parse(`${date}T00:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10);
}

function minText(left, right) {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

function maxText(left, right) {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

function csvCell(value) {
  const text = String(value ?? "");
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function compareSources(left, right) {
  const network = left.network.localeCompare(right.network);
  return network || left.userShard.index - right.userShard.index;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
