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

const options = parseOptions(process.argv.slice(2));
for (const required of [
  "aggregates", "manifests", "membership", "output", "output-metadata",
]) {
  if (!options[required]) throw new Error(`Missing --${required}`);
}
const aggregatePaths = listOption(options.aggregates);
const manifestPaths = listOption(options.manifests);
assert.ok(aggregatePaths.length >= 2, "Combine requires at least two supplements");
assert.equal(
  manifestPaths.length,
  aggregatePaths.length,
  "Every supplement aggregate needs one manifest",
);

const membershipBuffer = fs.readFileSync(options.membership);
const membership = inspectMembership(
  membershipBuffer.toString("utf8"),
  options.membership,
);
const components = [];
const networkOwners = new Map();
const jobOwners = new Map();
let window = null;
const rowsByCell = new Map();
const states = new Map();
const totals = emptyCounters();
const inputs = [];
let observedInputRows = 0;
let observedInputCells = 0;

for (let index = 0; index < aggregatePaths.length; index += 1) {
  const aggregatePath = path.resolve(aggregatePaths[index]);
  const manifestPath = path.resolve(manifestPaths[index]);
  const aggregateBuffer = fs.readFileSync(aggregatePath);
  const manifestBuffer = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBuffer.toString("utf8"));
  const rows = parseCsv(aggregateBuffer.toString("utf8"), aggregatePath);
  const cube = inspectCube(rows, aggregatePath, membership);
  const componentProof = validateComponentManifest({
    manifest,
    aggregateBuffer,
    manifestBuffer,
    cube,
    membership,
    membershipBuffer,
    label: `component ${index}`,
  });
  if (!window) window = componentProof.window;
  else assert.deepEqual(componentProof.window, window, `component ${index}: window drift`);

  for (const network of componentProof.networks) {
    assert.ok(
      !networkOwners.has(network),
      `Network ${network} appears in both component ${networkOwners.get(network)} and ${index}`,
    );
    networkOwners.set(network, index);
  }
  for (const input of componentProof.inputs) {
    assert.ok(
      !jobOwners.has(input.queryJobId),
      `Query job ${input.queryJobId} appears in multiple supplements`,
    );
    jobOwners.set(input.queryJobId, index);
    inputs.push(input);
  }
  for (const row of rows) {
    const key = cellKey(row);
    if (!rowsByCell.has(key)) {
      rowsByCell.set(key, {
        dimensions: pickDimensions(row),
        counters: emptyCounters(),
      });
    }
    const target = rowsByCell.get(key);
    for (const counter of COUNTERS) {
      target.counters[counter] += Number(row[counter]);
      totals[counter] += Number(row[counter]);
    }
  }
  for (const state of cube.states.values()) {
    const key = stateKey(state);
    if (!states.has(key)) {
      states.set(key, {
        dimensions: pickStateDimensions(state),
        eligible: 0,
        known: 0,
        mismatch: 0,
        opportunities: 0,
        first: "",
        last: "",
      });
    }
    const target = states.get(key);
    target.eligible += state.eligible;
    target.known += state.known;
    target.mismatch += state.lookupMismatch;
    target.opportunities += state.opportunities;
    target.first = minTimestamp(target.first, state.firstObservedAt);
    target.last = maxTimestamp(target.last, state.lastObservedAt);
  }
  observedInputRows += Number(manifest.densification.observedInputRows);
  observedInputCells += Number(manifest.densification.observedInputCells);
  components.push({
    componentKind: componentProof.componentKind,
    schema: manifest.schema,
    manifestSha256: sha256(manifestBuffer),
    aggregateSha256: sha256(aggregateBuffer),
    aggregateBytes: aggregateBuffer.length,
    aggregateRows: rows.length,
    networks: componentProof.networks,
    expectedExecutions: componentProof.expectedExecutions,
    parserValidationSha256: manifest.parserValidation.sha256,
    aggregateTemplateSha256: componentProof.aggregateTemplateSha256,
  });
}

assert.equal(rowsByCell.size, 9_126, "Combined supplement cell grid is incomplete");
assert.equal(states.size, 54, "Combined supplement state grid is incomplete");
for (const [key, state] of states) {
  assert.equal(state.eligible, state.known, `${key}: eligible/known delta drift`);
  assert.equal(state.known, state.opportunities, `${key}: state coverage does not reconcile`);
  assert.equal(state.mismatch, 0, `${key}: lookup mismatch is nonzero`);
}

const outputRows = [...rowsByCell.values()]
  .sort((left, right) => compareDimensions(left.dimensions, right.dimensions))
  .map(({ dimensions, counters }) => {
    const state = states.get(stateKey(dimensions));
    validateCounterPartitions(counters, cellKey(dimensions));
    return withDerived({
      window_start: window.startInclusive.slice(0, 10),
      window_end: previousDay(window.endExclusive.slice(0, 10)),
      table_filter: "cnt_players = 7",
      table_size: 7,
      cohort: "l3top",
      cohort_selected_players: membership.cohortCounts.l3top,
      ...dimensions,
      eligible_opportunities: state.eligible,
      known_card_opportunities: state.known,
      lookup_mismatch_opportunities: state.mismatch,
      first_observed_at: state.first,
      last_observed_at: state.last,
      ...counters,
    });
  });
const outputText = `${COLUMNS.join(",")}\n${
  outputRows.map((row) => COLUMNS.map((column) => csvCell(row[column])).join(",")).join("\n")
}\n`;
const outputBuffer = Buffer.from(outputText);
const knownCards = [...states.values()].reduce((result, state) => {
  result.eligible += state.eligible;
  result.known += state.known;
  result.lookupMismatch += state.mismatch;
  return result;
}, { eligible: 0, known: 0, lookupMismatch: 0 });
knownCards.pct = knownCards.eligible
  ? Number((knownCards.known / knownCards.eligible * 100).toFixed(6))
  : 100;
assert.equal(knownCards.known, totals.opportunities, "Combined coverage total drift");

const componentParserHashes = components
  .map((component) => component.parserValidationSha256)
  .sort();
const componentTemplateHashes = components
  .map((component) => component.aggregateTemplateSha256)
  .sort();
const metadata = {
  schema: "ff-rfi-field-action-novel-raw-supplement-composition-v1",
  sourceKind: "publication-safe-novel-raw-hh-l3top",
  strategy: "disjoint-approved-source-set-supplement-union-v1",
  plan: {
    schema: "ff-rfi-field-action-novel-raw-supplement-composition-plan-v1",
    sourceSetComplete: true,
    networks: [...networkOwners.keys()].sort(),
    userShardsPerNetwork: null,
    expectedExecutions: inputs.length,
    exactDisjointUserUnion: true,
    disjointNetworkSets: true,
    targetFilter: false,
    componentManifestSha256: components.map((component) => component.manifestSha256),
  },
  parserValidation: {
    schema: "ff-rfi-field-action-novel-raw-parser-validation-composition-v1",
    sha256: sha256(componentParserHashes.join("\n")),
    gatePassed: true,
    networks: [...networkOwners.keys()].sort(),
    exactMismatchTolerance: 0,
    componentSha256: componentParserHashes,
  },
  window,
  membership: {
    sha256: sha256(membershipBuffer),
    keysSha256: membership.keysSha256,
    rows: membership.rows.length,
    cohortCounts: membership.cohortCounts,
    selectedCohort: "l3top",
    selectedPlayers: membership.cohortCounts.l3top,
    selectedUserIdsSha256: sha256([...membership.userSets.l3top].sort((a, b) => a - b).join(",")),
  },
  aggregateTemplateSha256: sha256(componentTemplateHashes.join("\n")),
  components,
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
    file: "combined-novel-raw-hh-supplement.csv",
    rows: outputRows.length,
    sha256: sha256(outputBuffer),
    bytes: outputBuffer.length,
    windowStartInclusive: window.startInclusive,
    windowEndExclusive: window.endExclusive,
    knownCards,
    totals,
    cube: {
      cohort: "l3top",
      stateCount: states.size,
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
assertNoPrivatePayload(outputText, "Combined supplement aggregate");
assertNoPrivatePayload(metadataText, "Combined supplement manifest");
fs.writeFileSync(options.output, outputBuffer, { mode: 0o600 });
fs.writeFileSync(options["output-metadata"], metadataText, { mode: 0o600 });
process.stdout.write(`${JSON.stringify({
  components: components.length,
  networks: metadata.plan.networks.length,
  rows: outputRows.length,
  opportunities: totals.opportunities,
  sha256: metadata.merged.sha256,
})}\n`);

function validateComponentManifest({
  manifest,
  aggregateBuffer,
  manifestBuffer,
  cube,
  membership,
  membershipBuffer,
  label,
}) {
  let componentKind;
  let networks;
  let expectedExecutions;
  let sourceWindow;
  let expectedSourceKind;
  if (manifest.schema === "ff-rfi-coin-party-publication-merge-v2") {
    componentKind = "coin-party-publication-v2";
    expectedSourceKind = "coin-party-publication-v2";
    assert.equal(
      manifest.sourceContract,
      "ff-rfi-coin-party-publication-contract-v2",
      `${label}: dedicated source contract drift`,
    );
    assert.deepEqual(manifest.sources, manifest.inputs, `${label}: dedicated source/input drift`);
    assert.equal(manifest.cube?.targetFilter, false, `${label}: dedicated target-filtered source`);
    networks = [...(manifest.networks || [])];
    expectedExecutions = manifest.inputs?.length;
    assert.deepEqual(manifest.window, ["2023-09-01", "2026-07-26"], `${label}: dedicated window drift`);
    sourceWindow = {
      startInclusive: `${manifest.window[0]}T00:00:00Z`,
      endExclusive: `${manifest.window[1]}T00:00:00Z`,
      semantics: "half-open-utc",
    };
  } else {
    assert.equal(
      manifest.schema,
      "ff-rfi-field-action-novel-raw-supplement-merge-v1",
      `${label}: only directly plan-bound supplements may be combined`,
    );
    componentKind = "immutable-plan-raw-hh-v5";
    expectedSourceKind = "immutable-plan-raw-hh-v5";
    assert.equal(
      manifest.sourceKind,
      "publication-safe-novel-raw-hh-l3top",
      `${label}: source kind drift`,
    );
    assert.equal(
      manifest.strategy,
      "approved-plan-source-union-with-observed-zero-dimension-completion",
      `${label}: source strategy drift`,
    );
    assert.equal(manifest.plan?.sourceSetComplete, true, `${label}: source set incomplete`);
    assert.equal(
      manifest.plan?.exactDisjointUserUnion,
      true,
      `${label}: source user partitions are not an exact disjoint union`,
    );
    assert.equal(manifest.plan?.targetFilter, false, `${label}: target-filtered source`);
    requiredHex(manifest.plan?.immutableReceiptSha256, `${label}: immutable plan receipt`);
    networks = [...(manifest.plan?.networks || [])];
    expectedExecutions = manifest.plan?.expectedExecutions;
    sourceWindow = manifest.window;
  }
  assert.ok(networks.length, `${label}: network set missing`);
  assert.equal(new Set(networks).size, networks.length, `${label}: duplicate declared network`);
  assert.equal(expectedExecutions, manifest.inputs?.length, `${label}: execution count drift`);
  assert.equal(manifest.parserValidation?.gatePassed, true, `${label}: parser gate failed`);
  assert.equal(
    manifest.parserValidation?.exactMismatchTolerance,
    0,
    `${label}: parser mismatch tolerance drift`,
  );
  requiredHex(manifest.parserValidation?.sha256, `${label} parser hash`);
  assert.deepEqual(
    [...(manifest.parserValidation?.networks || [])].sort(),
    [...networks].sort(),
    `${label}: parser/source network set drift`,
  );
  requiredHex(manifest.aggregateTemplateSha256, `${label} template hash`);
  assert.equal(manifest.membership?.sha256, sha256(membershipBuffer), `${label}: membership hash`);
  assert.equal(manifest.membership?.keysSha256, membership.keysSha256, `${label}: membership keys`);
  assert.equal(Number(manifest.membership?.rows), membership.rows.length, `${label}: membership rows`);
  assert.deepEqual(manifest.membership?.cohortCounts, membership.cohortCounts, `${label}: cohort counts`);
  assert.equal(
    Number(manifest.membership?.selectedPlayers),
    membership.cohortCounts.l3top,
    `${label}: selected-player count`,
  );
  assert.deepEqual(
    sourceWindow,
    {
      startInclusive: `${cube.window.start}T00:00:00Z`,
      endExclusive: `${nextDay(cube.window.end)}T00:00:00Z`,
      semantics: "half-open-utc",
    },
    `${label}: manifest window drift`,
  );
  assert.equal(manifest.merged?.sha256, sha256(aggregateBuffer), `${label}: aggregate hash`);
  assert.equal(Number(manifest.merged?.bytes), aggregateBuffer.length, `${label}: aggregate bytes`);
  assert.equal(Number(manifest.merged?.rows), cube.rows.length, `${label}: aggregate rows`);
  assert.deepEqual(manifest.merged?.totals, cube.totals, `${label}: aggregate totals`);
  assert.deepEqual(manifest.merged?.knownCards, cube.knownCards, `${label}: coverage totals`);
  assert.equal(
    manifest.merged?.windowStartInclusive,
    sourceWindow.startInclusive,
    `${label}: merged window start`,
  );
  assert.equal(
    manifest.merged?.windowEndExclusive,
    sourceWindow.endExclusive,
    `${label}: merged window end`,
  );
  assert.equal(manifest.merged?.cube?.stateCount, 54, `${label}: state count`);
  assert.equal(manifest.merged?.cube?.handClassesPerState, 169, `${label}: hand classes`);
  assert.equal(manifest.merged?.cube?.coverageReconciled, true, `${label}: coverage proof`);
  assert.equal(
    manifest.densification?.absentDimensionsMaterializedAsObservedZero,
    true,
    `${label}: observed-zero proof`,
  );
  assert.equal(manifest.densification?.smoothingApplied, false, `${label}: smoothing`);
  assert.equal(manifest.densification?.modeledValuesApplied, false, `${label}: modeled values`);
  assert.equal(manifest.privacy?.aggregateOnly, true, `${label}: aggregate-only boundary`);
  assert.equal(manifest.privacy?.rawHandHistoriesPublished, false, `${label}: raw histories`);
  assert.equal(manifest.privacy?.personalIdentifiersPublished, false, `${label}: identities`);
  const networksByInput = new Map(
    networks.map((network) => [network, new Set()]),
  );
  for (const input of manifest.inputs) {
    assert.equal(
      input.sourceKind,
      expectedSourceKind,
      `${label}: substituted input source kind`,
    );
    validatePublicInputShape(input, label);
    assert.ok(networksByInput.has(input.network), `${label}: undeclared input network`);
    const shardKey = `${input.userShard?.index}/${input.userShard?.count}`;
    assert.ok(
      !networksByInput.get(input.network).has(shardKey),
      `${label}: duplicate ${input.network} user shard ${shardKey}`,
    );
    networksByInput.get(input.network).add(shardKey);
    assert.match(input.queryJobId || "", /^mcp_ch_job_[a-f0-9]{32,}$/, `${label}: job id`);
    for (const value of [
      input.rendererMetadataSha256,
      input.receiptSha256,
      input.querySha256,
      input.resultSha256,
      input.templateSha256,
    ]) requiredHex(value, `${label} input hash`);
    validateSafeNovelPrivacy(input.privacy, `${label}: input privacy`);
    validateGateCounts(input.publicationGate, `${label}: ${input.network} ${shardKey}`);
  }
  for (const [network, shards] of networksByInput) {
    const expectedShardCount = Number(
      manifest.plan?.userShardsPerNetwork
        ?? manifest.inputs.find((input) => input.network === network)?.userShard?.count,
    );
    assert.equal(
      shards.size,
      expectedShardCount,
      `${label}: incomplete ${network} user-shard set`,
    );
  }
  assert.match(sha256(manifestBuffer), /^[a-f0-9]{64}$/);
  return {
    componentKind,
    networks,
    expectedExecutions,
    window: sourceWindow,
    inputs: manifest.inputs,
    aggregateTemplateSha256: manifest.aggregateTemplateSha256,
  };
}

function inspectCube(rows, input, membership) {
  assert.equal(rows.length, 9_126, `${input}: expected 9,126 rows`);
  const cells = new Set();
  const states = new Map();
  const totals = emptyCounters();
  const periods = new Set();
  for (const [index, row] of rows.entries()) {
    const location = `${input}:${index + 2}`;
    periods.add(`${row.window_start}|${row.window_end}`);
    assert.equal(row.table_filter, "cnt_players = 7", `${location}: table filter`);
    assert.equal(Number(row.table_size), 7, `${location}: table size`);
    assert.equal(row.cohort, "l3top", `${location}: cohort`);
    assert.equal(Number(row.cohort_selected_players), membership.cohortCounts.l3top, `${location}: players`);
    const position = POSITIONS[row.position_group];
    assert.ok(position, `${location}: position`);
    assert.equal(Number(row.position_order), position.order, `${location}: position order`);
    assert.equal(Number(row.position_code), position.code, `${location}: position code`);
    assert.equal(Number(row.stack_order), STACKS[row.stack_bucket], `${location}: stack order`);
    assert.ok(HANDS.has(row.hand_class), `${location}: hand class`);
    const key = cellKey(row);
    assert.ok(!cells.has(key), `${location}: duplicate cell`);
    cells.add(key);
    const counters = Object.fromEntries(COUNTERS.map((counter) => [
      counter,
      integer(row[counter], counter, location),
    ]));
    validateCounterPartitions(counters, location);
    assert.equal(counters.non_exact_r_effective_allin, 0, `${location}: non-exact all-in`);
    addCounters(totals, counters);
    const stateId = stateKey(row);
    const projection = {
      cohort: "l3top",
      ...pickStateDimensions(row),
      eligible: integer(row.eligible_opportunities, "eligible", location),
      known: integer(row.known_card_opportunities, "known", location),
      lookupMismatch: integer(row.lookup_mismatch_opportunities, "mismatch", location),
      firstObservedAt: row.first_observed_at,
      lastObservedAt: row.last_observed_at,
      opportunities: 0,
      hands: new Set(),
    };
    if (!states.has(stateId)) states.set(stateId, projection);
    const state = states.get(stateId);
    assert.deepEqual(
      {
        eligible: projection.eligible,
        known: projection.known,
        lookupMismatch: projection.lookupMismatch,
        firstObservedAt: projection.firstObservedAt,
        lastObservedAt: projection.lastObservedAt,
      },
      {
        eligible: state.eligible,
        known: state.known,
        lookupMismatch: state.lookupMismatch,
        firstObservedAt: state.firstObservedAt,
        lastObservedAt: state.lastObservedAt,
      },
      `${location}: state coverage drift`,
    );
    state.opportunities += counters.opportunities;
    state.hands.add(row.hand_class);
  }
  assert.equal(periods.size, 1, `${input}: source window drift`);
  assert.equal(states.size, 54, `${input}: state grid`);
  for (const [key, state] of states) {
    assert.equal(state.hands.size, 169, `${input}: ${key} hand grid`);
    assert.equal(state.eligible, state.known, `${input}: ${key} eligible/known`);
    assert.equal(state.known, state.opportunities, `${input}: ${key} coverage`);
    assert.equal(state.lookupMismatch, 0, `${input}: ${key} mismatch`);
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
  const [start, end] = [...periods][0].split("|");
  return { rows, states, totals, knownCards, window: { start, end } };
}

function inspectMembership(text, input) {
  const rows = parseCsv(text, input, null);
  const keys = [];
  const userSets = Object.fromEntries(COHORTS.map((cohort) => [cohort, new Set()]));
  for (const row of rows) {
    assert.ok(COHORTS.includes(row.cohort), `${input}: invalid membership cohort`);
    const userId = Number(row.user_id);
    assert.ok(Number.isSafeInteger(userId) && userId > 0, `${input}: invalid user id`);
    const key = `${row.cohort}|${userId}`;
    assert.ok(!keys.includes(key), `${input}: duplicate membership key`);
    keys.push(key);
    userSets[row.cohort].add(userId);
  }
  for (const cohort of COHORTS) assert.ok(userSets[cohort].size, `${input}: empty ${cohort}`);
  return {
    rows,
    keysSha256: sha256(keys.sort().join("\n")),
    cohortCounts: Object.fromEntries(COHORTS.map((cohort) => [cohort, userSets[cohort].size])),
    userSets,
  };
}

function parseCsv(text, input, expectedHeader = COLUMNS) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift()?.split(",") || [];
  if (expectedHeader) assert.deepEqual(header, expectedHeader, `${input}: header drift`);
  return lines.filter(Boolean).map((line, index) => {
    const values = line.split(",");
    assert.equal(values.length, header.length, `${input}:${index + 2}: malformed row`);
    return Object.fromEntries(header.map((column, columnIndex) => [column, values[columnIndex]]));
  });
}

function pickDimensions(row) {
  return {
    position_group: row.position_group,
    position_order: Number(row.position_order),
    position_code: Number(row.position_code),
    stack_bucket: row.stack_bucket,
    stack_order: Number(row.stack_order),
    hand_class: row.hand_class,
  };
}

function pickStateDimensions(row) {
  return {
    position_group: row.position_group,
    position_order: Number(row.position_order),
    position_code: Number(row.position_code),
    stack_bucket: row.stack_bucket,
    stack_order: Number(row.stack_order),
  };
}

function cellKey(row) {
  return [
    row.position_group, row.position_order, row.position_code,
    row.stack_bucket, row.stack_order, row.hand_class,
  ].join("|");
}

function stateKey(row) {
  return [
    row.position_group, row.position_order, row.position_code,
    row.stack_bucket, row.stack_order,
  ].join("|");
}

function compareDimensions(left, right) {
  return Number(left.stack_order) - Number(right.stack_order)
    || Number(left.position_order) - Number(right.position_order)
    || left.hand_class.localeCompare(right.hand_class);
}

function withDerived(row) {
  const numerators = [
    row.raises_total, row.regular_raise, row.open_shove, row.limp, row.fold_other,
  ];
  return {
    ...row,
    ...Object.fromEntries(RATE_COLUMNS.map((column, index) => [
      column,
      pct(numerators[index], row.opportunities),
    ])),
    below_exact_minimum: Number(row.opportunities < 50),
    low_sample: Number(row.opportunities < 100),
  };
}

function validateCounterPartitions(counters, location) {
  assert.equal(counters.raises_total, counters.regular_raise + counters.open_shove, `${location}: raise partition`);
  assert.equal(counters.opportunities, counters.raises_total + counters.limp + counters.fold_other, `${location}: action partition`);
  assert.equal(counters.open_shove, counters.shove_allin_flag + counters.shove_effective_amount_only, `${location}: shove partition`);
  assert.equal(counters.normal_three_bb_as_shove, 0, `${location}: 3BB as shove`);
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
  return result;
}

function addCounters(target, source) {
  for (const counter of COUNTERS) target[counter] += Number(source[counter] || 0);
}

function emptyCounters() {
  return Object.fromEntries(COUNTERS.map((counter) => [counter, 0]));
}

function integer(value, label, location) {
  assert.match(String(value), /^\d+$/, `${location}: invalid ${label}`);
  const result = Number(value);
  assert.ok(Number.isSafeInteger(result), `${location}: unsafe ${label}`);
  return result;
}

function requiredHex(value, label) {
  assert.match(String(value || ""), /^[a-f0-9]{64}$/, `${label} is invalid`);
  return value;
}

function validatePublicInputShape(input, label) {
  assert.deepEqual(Object.keys(input).sort(), [
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
  ], `${label}: public input allowlist drift`);
  assert.deepEqual(Object.keys(input.userShard || {}).sort(), [
    "count",
    "index",
    "userIdsSha256",
    "users",
  ], `${label}: public user-shard allowlist drift`);
  assert.equal(input.executionMode, "async", `${label}: non-async input`);
  assert.equal(input.windowStartInclusive, "2023-09-01T00:00:00Z", `${label}: input window start`);
  assert.equal(input.windowEndExclusive, "2026-07-26T00:00:00Z", `${label}: input window end`);
  validateExecutionTimes(input.startedAt, input.finishedAt, label);
  for (const value of [
    input.rendererMetadataSha256,
    input.receiptSha256,
    input.querySha256,
    input.resultSha256,
    input.templateSha256,
    input.parserTemplateSha256,
    input.parserValidationSha256,
    input.userShard?.userIdsSha256,
  ]) requiredHex(value, `${label} input hash`);
  validateSafeNovelPrivacy(input.privacy, `${label}: input privacy`);
}

function validateSafeNovelPrivacy(value, label) {
  assert.deepEqual(value, {
    aggregateOnly: true,
    noRawHandHistories: true,
    noPlayerLevelRows: true,
    noUserIds: true,
  }, `${label}: safe privacy boundary drift`);
}

function validateExecutionTimes(startedAt, finishedAt, label) {
  assert.match(String(startedAt || ""), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/, `${label}: invalid start`);
  assert.match(String(finishedAt || ""), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/, `${label}: invalid finish`);
  const start = Date.parse(startedAt);
  const finish = Date.parse(finishedAt);
  assert(Number.isFinite(start) && Number.isFinite(finish) && start <= finish, `${label}: invalid execution interval`);
  assert(finish >= Date.parse("2026-07-26T00:00:00Z"), `${label}: stale execution`);
}

function validateGateCounts(value, label) {
  const nominal = integer(value?.nominal_novel_keys, "nominal gate", label);
  const normalized = integer(
    value?.normalized_time_eligible_keys,
    "normalized gate",
    label,
  );
  const publication = integer(
    value?.publication_eligible_keys,
    "publication gate",
    label,
  );
  assert.ok(publication <= normalized && normalized <= nominal, `${label}: gate ordering`);
  if (value.raw_keys !== undefined || value.exact_id_match_keys !== undefined) {
    const raw = integer(value.raw_keys, "raw gate", label);
    const exact = integer(value.exact_id_match_keys, "exact gate", label);
    assert.equal(raw, exact + nominal, `${label}: raw-key gate partition`);
  }
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

function previousDay(value) {
  return new Date(Date.parse(`${value}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
}

function nextDay(value) {
  return new Date(Date.parse(`${value}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
}

function pct(value, total) {
  if (!total) return "0";
  return (Number(value) / Number(total) * 100)
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
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
  ]) {
    if (pattern.test(text)) throw new Error(`${label} contains private payload matching ${pattern}`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
