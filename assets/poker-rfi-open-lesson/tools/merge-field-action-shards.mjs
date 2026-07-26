#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const currentTemplateSha256 = sha256(fs.readFileSync(path.join(here, "q_ff_rfi_field_actions.sql")));
const recoveryTemplateSha256 = sha256(
  fs.readFileSync(path.join(here, "q_ff_rfi_missing_cards_recovery.sql")),
);

const args = process.argv.slice(2);
const optionIndex = args.findIndex((value) => value.startsWith("--"));
const inputArgs = optionIndex < 0 ? args : args.slice(0, optionIndex);
const options = Object.fromEntries((optionIndex < 0 ? [] : args.slice(optionIndex)).map((item) => {
  const match = item.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${item}`);
  return [match[1], match[2]];
}));
const inputs = inputArgs.map((item) => path.resolve(item));
const output = options.output && path.resolve(options.output);
const metadataOutput = options.metadata && path.resolve(options.metadata);
const rendererMetadataPaths = String(options["renderer-metadata"] || "").split(",").filter(Boolean).map((item) => path.resolve(item));
const receiptPaths = String(options.receipts || "").split(",").filter(Boolean).map((item) => path.resolve(item));
const queryPaths = String(options.queries || "").split(",").filter(Boolean).map((item) => path.resolve(item));
const validationManifestPaths = String(
  options["validation-manifests"] || options["validation-manifest"] || "",
).split(",").filter(Boolean).map((item) => path.resolve(item));
if (inputs.length < 1 || !output || !metadataOutput) {
  throw new Error(
    "Usage: node merge-field-action-shards.mjs shard.csv [...] --output=/tmp/cube.csv "
    + "--metadata=/tmp/merge.json --renderer-metadata=render.json,... "
    + "--receipts=receipt.json,... --queries=rendered.sql,... "
    + "[--validation-manifests=recovery-validation.json,...]",
  );
}
if (rendererMetadataPaths.length !== inputs.length) throw new Error(`Expected ${inputs.length} renderer metadata files, got ${rendererMetadataPaths.length}`);
if (receiptPaths.length !== inputs.length) throw new Error(`Expected ${inputs.length} execution receipts, got ${receiptPaths.length}`);
if (queryPaths.length !== inputs.length) throw new Error(`Expected ${inputs.length} rendered SQL query files, got ${queryPaths.length}`);
if (validationManifestPaths.length && validationManifestPaths.length !== inputs.length) {
  throw new Error(`Expected ${inputs.length} recovery validation manifests, got ${validationManifestPaths.length}`);
}

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
const dimensions = ["cohort", "position_group", "position_order", "position_code", "stack_bucket", "stack_order", "hand_class"];
const actionCounters = ["opportunities", "raises_total", "regular_raise", "open_shove", "limp", "fold_other"];
const classifierCounters = ["shove_allin_flag", "shove_effective_amount_only", "regular_three_bb_open", "normal_three_bb_as_shove", "non_exact_r_effective_allin"];
const counters = [...actionCounters, ...classifierCounters];
const rateColumns = ["raise_total_pct", "regular_raise_pct", "open_shove_pct", "limp_pct", "fold_pct"];
const positionContract = Object.freeze({
  EP: { order: 1, code: 4 },
  MP: { order: 2, code: 3 },
  HJ: { order: 3, code: 2 },
  CO: { order: 4, code: 1 },
  BTN: { order: 5, code: 0 },
  SB: { order: 6, code: 9 },
});
const sourceTableContract = Object.freeze({
  "analytics.int_tracker_hand_joined": {
    handClassMode: "joined-holecards-str",
    handClassColumn: "h.holecards_str",
    requiresHolecardMapping: false,
  },
  "analytics.bak20260720_int_tracker_hand_joined": {
    handClassMode: "verified-holecard-id-1-169",
    handClassColumn: "h.holecard_id",
    requiresHolecardMapping: true,
  },
});
const recoverySourceTables = Object.freeze([
  "analytics.int_tracker_hand_joined",
  "analytics.stg_hh_texts__hh_texts",
]);
const recoveryRawJoin = Object.freeze({
  type: "exact-key",
  trackerKey: ["toUInt64(user_id)", "toString(network)", "toString(hh_id)"],
  rawKey: [
    "toUInt64(check_user_id)",
    "toString(network)",
    "toString(converted_hh_id)",
  ],
});
const recoveryParserNetworks = Object.freeze([
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
const canonicalHandClasses = canonicalHands();
const cohortSizes = new Map();
const grouped = new Map();
const groupedCoverage = new Map();
const source = [];

for (const [inputIndex, input] of inputs.entries()) {
  const sourceBuffer = fs.readFileSync(input);
  const rows = parseCsv(sourceBuffer.toString("utf8"), input);
  const keys = new Set();
  let windowStart = "";
  let windowEnd = "";
  let tableFilter = "";
  const totals = emptyTotals();
  const shardCoverage = new Map();
  const shardKnownTotals = new Map();
  for (const [rowIndex, row] of rows.entries()) {
    const location = `${input}:${rowIndex + 2}`;
    if (!windowStart) ({ window_start: windowStart, window_end: windowEnd, table_filter: tableFilter } = row);
    assert.equal(row.window_start, windowStart, `${location}: one window_start per shard`);
    assert.equal(row.window_end, windowEnd, `${location}: one window_end per shard`);
    assert.equal(row.table_filter, tableFilter, `${location}: one table_filter per shard`);
    assert.equal(tableFilter, "cnt_players = 7", `${location}: unexpected table filter`);
    assert.equal(integer(row.table_size, "table_size", location), 7, `${location}: exact 7-max table size`);
    const expectedPosition = positionContract[row.position_group];
    assert.ok(expectedPosition, `${location}: unexpected position ${row.position_group}`);
    assert.equal(integer(row.position_order, "position_order", location), expectedPosition.order, `${location}: position order mismatch`);
    assert.equal(integer(row.position_code, "position_code", location), expectedPosition.code, `${location}: position code mismatch`);
    const key = dimensions.map((column) => row[column]).join("|");
    assert(!keys.has(key), `${location}: duplicate shard grain ${key}`);
    keys.add(key);
    const cohortSize = integer(row.cohort_selected_players, "cohort_selected_players", location);
    if (cohortSizes.has(row.cohort)) assert.equal(cohortSizes.get(row.cohort), cohortSize, `${location}: cohort size drift`);
    else cohortSizes.set(row.cohort, cohortSize);
    const values = Object.fromEntries(counters.map((counter) => [counter, integer(row[counter], counter, location)]));
    assert.equal(values.raises_total, values.regular_raise + values.open_shove, `${location}: raise partition mismatch`);
    assert.equal(values.opportunities, values.raises_total + values.limp + values.fold_other, `${location}: action partition mismatch`);
    assert.equal(values.open_shove, values.shove_allin_flag + values.shove_effective_amount_only, `${location}: shove classifier partition mismatch`);
    assert.equal(values.normal_three_bb_as_shove, 0, `${location}: a normal 2.5–3.5 BB open was classified as a shove`);
    validateDerived(row, values, location);
    const isKnownCard = row.hand_class !== "";
    const coverageKey = [row.cohort, row.position_group, row.position_order, row.position_code, row.stack_bucket, row.stack_order].join("|");
    const stateCoverage = {
      eligible: integer(row.eligible_opportunities, "eligible_opportunities", location),
      known: integer(row.known_card_opportunities, "known_card_opportunities", location),
      lookupMismatch: integer(row.lookup_mismatch_opportunities, "lookup_mismatch_opportunities", location),
      firstObservedAt: row.first_observed_at,
      lastObservedAt: row.last_observed_at,
    };
    assert.ok(stateCoverage.eligible >= stateCoverage.known, `${location}: known-card numerator exceeds eligible opportunities`);
    assert.ok(stateCoverage.known > 0, `${location}: known-card state is empty`);
    if (shardCoverage.has(coverageKey)) assert.deepEqual(stateCoverage, shardCoverage.get(coverageKey), `${location}: repeated state coverage drift`);
    else shardCoverage.set(coverageKey, stateCoverage);
    if (isKnownCard) shardKnownTotals.set(coverageKey, (shardKnownTotals.get(coverageKey) || 0) + values.opportunities);
    if (isKnownCard) addTotals(totals, values);
    if (isKnownCard && !grouped.has(key)) {
      grouped.set(key, {
        ...Object.fromEntries(dimensions.map((column) => [column, row[column]])),
        cohort_selected_players: cohortSize,
        ...emptyTotals(),
      });
    }
    if (isKnownCard) addTotals(grouped.get(key), values);
  }
  for (const [coverageKey, state] of shardCoverage) {
    assert.equal(shardKnownTotals.get(coverageKey), state.known, `${input}: hand rows do not reconcile to known-card coverage for ${coverageKey}`);
  }
  for (const [coverageKey, state] of shardCoverage) {
    if (!groupedCoverage.has(coverageKey)) groupedCoverage.set(coverageKey, { eligible: 0, known: 0, lookupMismatch: 0, firstObservedAt: state.firstObservedAt, lastObservedAt: state.lastObservedAt });
    const target = groupedCoverage.get(coverageKey);
    target.eligible += state.eligible;
    target.known += state.known;
    target.lookupMismatch += state.lookupMismatch;
    if (state.firstObservedAt < target.firstObservedAt) target.firstObservedAt = state.firstObservedAt;
    if (state.lastObservedAt > target.lastObservedAt) target.lastObservedAt = state.lastObservedAt;
  }
  validateWindow(windowStart, windowEnd, input);
  const rendererMetadataBuffer = fs.readFileSync(rendererMetadataPaths[inputIndex]);
  const renderer = JSON.parse(rendererMetadataBuffer.toString("utf8"));
  const renderedSqlBuffer = fs.readFileSync(queryPaths[inputIndex]);
  const renderedSqlSha256 = sha256(renderedSqlBuffer);
  const receiptBuffer = fs.readFileSync(receiptPaths[inputIndex]);
  const receipt = executionReceipt(JSON.parse(receiptBuffer.toString("utf8")), input);
  assert.match(renderer.renderedSqlSha256 || "", /^[a-f0-9]{64}$/, `${input}: rendered SQL hash missing`);
  assert.equal(renderer.renderedSqlSha256, renderedSqlSha256, `${input}: rendered SQL bytes do not match renderer metadata`);
  const recovery = renderer.schema === "ff-rfi-missing-card-recovery-render-v1";
  if (recovery && !validationManifestPaths[inputIndex]) {
    throw new Error(`${input}: recovery full-cube source requires a validation manifest`);
  }
  if (!recovery && validationManifestPaths[inputIndex]) {
    throw new Error(`${input}: validation manifests are only valid for recovery full-cube sources`);
  }
  const queryProvenance = recovery
    ? validateRecoveryRenderedSql(renderer, renderedSqlBuffer.toString("utf8"), input)
    : validateRenderedSql(renderer, renderedSqlBuffer.toString("utf8"), input);
  const membership = recovery
    ? validateRecoveryMembershipMetadata(renderer, input)
    : validateMembershipMetadata(renderer, input);
  const validation = recovery
    ? validateRecoveryValidationManifest(
      validationManifestPaths[inputIndex],
      renderer,
      membership,
      input,
    )
    : null;
  if (!recovery) {
    assert.equal(renderer.templateSha256, currentTemplateSha256, `${input}: renderer metadata came from a stale query template`);
  }
  assert.equal(renderer.window?.[0], windowStart, `${input}: renderer/source window start mismatch`);
  assert.equal(addDays(renderer.window?.[1], -1), windowEnd, `${input}: renderer/source window end mismatch`);
  assert.match(renderer.userShard?.userIdsSha256 || "", /^[a-f0-9]{64}$/, `${input}: renderer user-id hash missing`);
  assert.equal(receipt.row_count, rows.length, `${input}: execution receipt row count mismatch`);
  if (recovery) {
    assert.equal(receipt.byte_size, sourceBuffer.length, `${input}: execution receipt byte size mismatch`);
  }
  source.push({
    file: path.basename(input),
    sourceKind: recovery ? "missing-card-recovery-full-cube" : "structured-field-action",
    rendererSchema: renderer.schema || null,
    rendererMode: renderer.mode || null,
    rendererMetadataSha256: sha256(rendererMetadataBuffer),
    queryJobId: receipt.job_id,
    executionMode: "async",
    receiptSha256: sha256(receiptBuffer),
    receiptRowCount: receipt.row_count,
    receiptBytes: Number(receipt.byte_size || 0),
    queryFile: path.basename(queryPaths[inputIndex]),
    querySha256: renderedSqlSha256,
    renderedSqlSha256,
    templateSha256: renderer.templateSha256,
    sourceTable: queryProvenance.sourceTable,
    sourceTables: queryProvenance.sourceTables || [queryProvenance.sourceTable],
    handClassMode: queryProvenance.handClassMode,
    holecardMappingSha256: queryProvenance.holecardMappingSha256,
    ...(recovery ? {
      recoveryPredicate: renderer.recoveryPredicate,
      recoveryIsDisjoint: renderer.recoveryIsDisjoint,
      rawJoin: renderer.rawJoin,
      parserNetworks: renderer.parserNetworks,
      parserGrammarsSha256: renderer.parserGrammarsSha256,
      selectedMembershipKeysSha256: membership.selectedMembershipKeysSha256,
      selectedMembershipRows: membership.selectedMembershipRows,
      selectedUniqueUsers: membership.selectedUniqueUsers,
      selectedCohortCounts: membership.selectedCohortCounts,
      validation,
      privacy: {
        rawHandHistoriesPublished: false,
        personalIdentifiersPublished: false,
      },
    } : {}),
    sha256: sha256(sourceBuffer),
    rows: rows.length,
    windowStartInclusive: `${windowStart}T00:00:00Z`,
    windowEndInclusive: `${windowEnd}T23:59:59.999Z`,
    userShard: renderer.userShard,
    shardUsers: membership.shardUsers,
    sourceUniqueUsers: membership.sourceUniqueUsers,
    shardMembershipRows: membership.shardMembershipRows,
    sourceMembershipRows: membership.sourceMembershipRows,
    membershipSha256: membership.membershipSha256,
    membershipKeysSha256: membership.membershipKeysSha256,
    membershipCohortCounts: membership.membershipCohortCounts,
    coverage: Object.fromEntries(shardCoverage),
    totals,
  });
}
assert.equal(
  new Set(source.map((item) => item.sourceKind)).size,
  1,
  "Structured-only and recovery full-cube executions cannot be mixed in one merge",
);
assert.equal(new Set(source.map((item) => item.queryJobId)).size, source.length, "Every source execution id must be unique");
assert.equal(new Set(source.map((item) => item.membershipSha256)).size, 1, "All action shards must use identical membership bytes");
assert.equal(new Set(source.map((item) => item.membershipKeysSha256)).size, 1, "All action shards must use identical membership keys");
assert.equal(new Set(source.map((item) => stableJson({
  membershipCohortCounts: item.membershipCohortCounts,
  sourceMembershipRows: item.sourceMembershipRows,
  sourceUniqueUsers: item.sourceUniqueUsers,
}))).size, 1, "All action shards must use identical membership metadata");
if (source[0].sourceKind === "missing-card-recovery-full-cube") {
  assert.equal(
    new Set(source.map((item) => item.selectedMembershipKeysSha256)).size,
    1,
    "All recovery shards must use identical selected membership keys",
  );
  assert.equal(
    new Set(source.map((item) => stableJson({
      selectedMembershipRows: item.selectedMembershipRows,
      selectedUniqueUsers: item.selectedUniqueUsers,
      selectedCohortCounts: item.selectedCohortCounts,
    }))).size,
    1,
    "All recovery shards must use identical selected membership metadata",
  );
}

const orderedWindows = [...source].sort((left, right) => left.windowStartInclusive.localeCompare(right.windowStartInclusive));
const sameWindow = orderedWindows.every((item) => item.windowStartInclusive === orderedWindows[0].windowStartInclusive && item.windowEndInclusive === orderedWindows[0].windowEndInclusive);
if (sameWindow) {
  const shardCount = orderedWindows[0].userShard?.count;
  assert.equal(shardCount, inputs.length, "A full-window user partition must include every declared shard");
  assert.deepEqual(orderedWindows.map((item) => item.userShard?.index).sort((left, right) => left - right), Array.from({ length: shardCount }, (_, index) => index), "User shard indices must cover 0..count-1 exactly once");
  assert.equal(new Set(orderedWindows.map((item) => item.userShard?.userIdsSha256)).size, inputs.length, "User-id shards must be disjoint immutable sets");
  const sourceUsers = new Set(orderedWindows.map((item) => item.sourceUniqueUsers));
  assert.equal(sourceUsers.size, 1, "Every user shard must derive from one source population");
  assert.equal(orderedWindows.reduce((sum, item) => sum + item.shardUsers, 0), orderedWindows[0].sourceUniqueUsers, "User shard sizes must reconcile to the source population");
  const expectedShardMembershipRows = source[0].sourceKind === "missing-card-recovery-full-cube"
    ? orderedWindows[0].selectedMembershipRows
    : orderedWindows[0].sourceMembershipRows;
  assert.equal(orderedWindows.reduce((sum, item) => sum + item.shardMembershipRows, 0), expectedShardMembershipRows, "User-shard membership rows must reconcile to the selected frozen membership snapshot");
} else {
  for (const item of orderedWindows) {
    assert.equal(item.userShard?.index, 0, "A time shard must include the full user population for its window");
    assert.equal(item.userShard?.count, 1, "Time and user sharding cannot be mixed");
    assert.equal(item.shardUsers, item.sourceUniqueUsers, "A time shard must include every source user for its window");
    const expectedMembershipRows = item.sourceKind === "missing-card-recovery-full-cube"
      ? item.selectedMembershipRows
      : item.sourceMembershipRows;
    assert.equal(item.shardMembershipRows, expectedMembershipRows, "A time shard must include every selected frozen membership row for its window");
  }
  for (let index = 1; index < orderedWindows.length; index += 1) {
    const expectedStart = addDays(orderedWindows[index - 1].windowEndInclusive.slice(0, 10), 1);
    assert.equal(orderedWindows[index].windowStartInclusive.slice(0, 10), expectedStart, "Time-shard windows must be contiguous and non-overlapping");
  }
}

const rows = [...grouped.values()].sort((left, right) => {
  return left.cohort.localeCompare(right.cohort)
    || Number(left.stack_order) - Number(right.stack_order)
    || Number(left.position_order) - Number(right.position_order)
    || left.hand_class.localeCompare(right.hand_class);
});
const recoveryCube = source[0].sourceKind === "missing-card-recovery-full-cube"
  ? validateRecoveryCube(rows, groupedCoverage)
  : null;
const mergedWindowStart = orderedWindows[0].windowStartInclusive.slice(0, 10);
const mergedWindowEnd = orderedWindows.at(-1).windowEndInclusive.slice(0, 10);
const outputRows = rows.map((row) => outputRow(row, mergedWindowStart, mergedWindowEnd, groupedCoverage.get(coverageKeyFor(row))));
const outputText = `${columns.join(",")}\n${outputRows.map((row) => columns.map((column) => row[column]).join(",")).join("\n")}\n`;
fs.writeFileSync(output, outputText);

const mergedTotals = emptyTotals();
for (const row of rows) addTotals(mergedTotals, row);
const knownCards = [...groupedCoverage.values()].reduce((result, state) => {
  result.eligible += state.eligible;
  result.known += state.known;
  result.lookupMismatch += state.lookupMismatch;
  return result;
}, { eligible: 0, known: 0, lookupMismatch: 0 });
assert.equal(knownCards.known, mergedTotals.opportunities, "Merged known-card coverage must reconcile to all hand-class opportunities");
knownCards.pct = Number((knownCards.known / knownCards.eligible * 100).toFixed(6));
const metadata = {
  schema: "ff-rfi-field-action-merge-v1",
  sourceKind: source[0].sourceKind,
  shardStrategy: sameWindow ? "immutable-user-id" : "contiguous-time",
  inputs: source,
  merged: {
    file: path.basename(output),
    rows: rows.length,
    sha256: sha256(outputText),
    windowStartInclusive: `${mergedWindowStart}T00:00:00Z`,
    windowEndExclusive: `${addDays(mergedWindowEnd, 1)}T00:00:00Z`,
    knownCards,
    totals: mergedTotals,
    ...(recoveryCube ? { cube: recoveryCube } : {}),
  },
};
fs.writeFileSync(metadataOutput, `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(metadata, null, 2));

function parseCsv(text, input) {
  const parsed = [];
  let values = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { values.push(cell); cell = ""; }
    else if (char === "\n") { values.push(cell.replace(/\r$/, "")); parsed.push(values); values = []; cell = ""; }
    else cell += char;
  }
  if (cell || values.length) { values.push(cell.replace(/\r$/, "")); parsed.push(values); }
  const header = parsed.shift() || [];
  assert.deepEqual(header, columns, `${input}: unexpected CSV columns`);
  return parsed.filter((row) => row.some(Boolean)).map((row, index) => {
    assert.equal(row.length, columns.length, `${input}:${index + 2}: malformed CSV row`);
    return Object.fromEntries(columns.map((column, columnIndex) => [column, row[columnIndex]]));
  });
}

function integer(value, label, location) {
  assert.match(String(value), /^\d+$/, `${location}: invalid ${label}`);
  const parsed = Number(value);
  assert(Number.isSafeInteger(parsed), `${location}: unsafe ${label}`);
  return parsed;
}

function validateDerived(row, values, location) {
  const expected = [values.raises_total, values.regular_raise, values.open_shove, values.limp, values.fold_other]
    .map((value) => pct(value, values.opportunities));
  for (let index = 0; index < rateColumns.length; index += 1) {
    // ClickHouse rounds midpoint values such as 51.5625 to 51.562, while
    // JavaScript's toFixed produces 51.563. Both are valid three-decimal
    // projections of the same integer counters; counters remain canonical.
    assert(Math.abs(Number(row[rateColumns[index]]) - Number(expected[index])) <= 0.001000001, `${location}: stale ${rateColumns[index]}`);
  }
  assert.equal(Number(row.below_exact_minimum), Number(values.opportunities < 50), `${location}: stale below_exact_minimum`);
  assert.equal(Number(row.low_sample), Number(values.opportunities < 100), `${location}: stale low_sample`);
}

function outputRow(row, windowStart, windowEnd, coverage) {
  assert.ok(coverage, `Missing merged coverage for ${coverageKeyFor(row)}`);
  const values = [row.raises_total, row.regular_raise, row.open_shove, row.limp, row.fold_other].map((value) => pct(value, row.opportunities));
  return {
    window_start: windowStart,
    window_end: windowEnd,
    table_filter: "cnt_players = 7",
    table_size: 7,
    ...row,
    eligible_opportunities: coverage.eligible,
    known_card_opportunities: coverage.known,
    lookup_mismatch_opportunities: coverage.lookupMismatch,
    first_observed_at: coverage.firstObservedAt,
    last_observed_at: coverage.lastObservedAt,
    ...Object.fromEntries(rateColumns.map((column, index) => [column, values[index]])),
    below_exact_minimum: Number(row.opportunities < 50),
    low_sample: Number(row.opportunities < 100),
  };
}

function coverageKeyFor(row) {
  return [row.cohort, row.position_group, row.position_order, row.position_code, row.stack_bucket, row.stack_order].join("|");
}

function emptyTotals() {
  return Object.fromEntries(counters.map((counter) => [counter, 0]));
}

function addTotals(target, values) {
  for (const counter of counters) target[counter] += Number(values[counter] || 0);
}

function pct(value, total) {
  if (!total) return "0";
  return (value / total * 100).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function validateWindow(start, end, input) {
  assert.match(start, /^\d{4}-\d{2}-\d{2}$/, `${input}: invalid window_start`);
  assert.match(end, /^\d{4}-\d{2}-\d{2}$/, `${input}: invalid window_end`);
  assert(Date.parse(`${start}T00:00:00Z`) <= Date.parse(`${end}T00:00:00Z`), `${input}: reversed window`);
}

function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function validateRenderedSql(renderer, sql, input) {
  const executableSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''");
  assert.ok(!executableSql.includes("{{"), `${input}: rendered SQL still contains a template placeholder`);
  const sourceTables = [...executableSql.matchAll(/\bFROM\s+(analytics\.[A-Za-z0-9_]+)/gi)].map((match) => match[1]);
  assert.ok(sourceTables.length > 0, `${input}: rendered SQL has no analytics source table`);
  assert.equal(new Set(sourceTables).size, 1, `${input}: rendered SQL uses multiple analytics source tables`);
  const sourceTable = sourceTables[0];
  const contract = sourceTableContract[sourceTable];
  assert.ok(contract, `${input}: unsupported rendered SQL source table ${sourceTable}`);
  assert.equal(renderer.sourceTable, sourceTable, `${input}: renderer sourceTable does not match rendered SQL FROM`);
  assert.equal(renderer.handClassMode, contract.handClassMode, `${input}: renderer handClassMode does not match source table`);
  assert.ok(executableSql.includes(contract.handClassColumn), `${input}: rendered SQL does not use ${contract.handClassColumn} for hand classes`);
  if (contract.requiresHolecardMapping) {
    assert.match(renderer.holecardMappingSha256 || "", /^[a-f0-9]{64}$/, `${input}: backup source requires a verified holecard mapping hash`);
  } else {
    assert.equal(renderer.holecardMappingSha256, null, `${input}: joined-holecards source must not claim a holecard-id mapping`);
  }
  return {
    sourceTable,
    handClassMode: contract.handClassMode,
    holecardMappingSha256: renderer.holecardMappingSha256,
  };
}

function validateRecoveryRenderedSql(renderer, sql, input) {
  assert.equal(renderer.mode, "full-cube", `${input}: recovery renderer mode must be full-cube`);
  assert.equal(
    renderer.templateSha256,
    recoveryTemplateSha256,
    `${input}: recovery renderer metadata came from a stale query template`,
  );
  assert.equal(
    renderer.handClassMode,
    "structured-or-validated-raw-when-empty-v1",
    `${input}: recovery hand-class mode mismatch`,
  );
  assert.equal(
    renderer.recoveryPredicate,
    "latest structured_hand_class = ''",
    `${input}: recovery predicate mismatch`,
  );
  assert.equal(renderer.recoveryIsDisjoint, true, `${input}: recovery source is not disjoint`);
  assert.deepEqual(renderer.rawJoin, recoveryRawJoin, `${input}: recovery exact-key join mismatch`);
  assert.deepEqual(
    renderer.parserNetworks,
    recoveryParserNetworks,
    `${input}: recovery parser network contract mismatch`,
  );
  assert.match(
    renderer.parserGrammarsSha256 || "",
    /^[a-f0-9]{64}$/,
    `${input}: recovery parser grammar hash missing`,
  );
  assert.equal(
    renderer.parserGrammarsSha256,
    sha256(canonicalJson(renderer.parserGrammars)),
    `${input}: recovery parser grammar hash mismatch`,
  );
  assert.equal(
    renderer.actionPositionStackSource,
    "latest analytics.int_tracker_hand_joined exact-7 unopened rows",
    `${input}: recovery action/position/stack source mismatch`,
  );
  assert.equal(
    renderer.executionPlan?.rawTextTouchesStructuredKnownRows,
    false,
    `${input}: full-cube recovery touched structured-known raw text`,
  );
  assert.equal(
    renderer.outputContainsRawHandsNicknamesOrIds,
    false,
    `${input}: recovery renderer does not preserve the private-data boundary`,
  );
  assert.deepEqual(renderer.outputColumns, columns, `${input}: recovery output-column contract mismatch`);

  const executableSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''");
  assert.ok(!executableSql.includes("{{"), `${input}: recovery SQL still contains a template placeholder`);
  const sourceTables = [...new Set(
    [...executableSql.matchAll(/\b(?:FROM|JOIN)\s+(analytics\.[A-Za-z0-9_]+)/gi)]
      .map((match) => match[1]),
  )].sort();
  assert.deepEqual(
    sourceTables,
    [...recoverySourceTables].sort(),
    `${input}: recovery SQL source tables mismatch`,
  );
  for (const pattern of [
    /structured_hand_class\s*=\s*''\s*\/\*\s*strict disjoint recovery predicate\s*\*\//i,
    /\bINNER\s+JOIN\s+raw_latest\s+AS\s+r\b/i,
    /\btoUInt64\s*\(\s*c\.uid\s*\)\s*=\s*r\.user_id\b/i,
    /\btoString\s*\(\s*c\.network\s*\)\s*=\s*r\.network\b/i,
    /\btoString\s*\(\s*c\.tracker_hh_id\s*\)\s*=\s*r\.hh_id\b/i,
    /effective_known\s+AS\s*\(\s*SELECT\s+\*\s+FROM\s+structured_known\s+UNION\s+ALL\s+SELECT\s+\*\s+FROM\s+recovered_missing\s*\)/is,
    /FROM\s+positioned_latest\s+AS\s+p\b/i,
    /FROM\s+effective_known\s+AS\s+e\b/i,
  ]) {
    assert.match(sql, pattern, `${input}: recovery SQL is missing contract ${pattern}`);
  }
  for (const network of recoveryParserNetworks) {
    assert.ok(sql.includes(`'${network}'`), `${input}: recovery SQL is missing parser network ${network}`);
  }
  const finalOutput = sql.slice(sql.lastIndexOf("SELECT\n  toString(toDate("));
  assert.ok(finalOutput.startsWith("SELECT\n  toString(toDate("), `${input}: recovery final cube projection is missing`);
  for (const privateColumn of ["hh_text", "source_nickname", "tracker_hh_id", "uid", "user_id"]) {
    assert.doesNotMatch(
      finalOutput,
      new RegExp(`\\b${privateColumn}\\b`, "i"),
      `${input}: recovery final cube projection exposes ${privateColumn}`,
    );
  }
  return {
    sourceTable: recoverySourceTables[0],
    sourceTables: [...recoverySourceTables],
    handClassMode: renderer.handClassMode,
    holecardMappingSha256: null,
  };
}

function validateMembershipMetadata(renderer, input) {
  assert.match(renderer.membershipSha256 || "", /^[a-f0-9]{64}$/, `${input}: membership hash missing`);
  assert.match(renderer.membershipKeysSha256 || "", /^[a-f0-9]{64}$/, `${input}: membership-key hash missing`);
  const cohortOrder = ["l3top", "l3", "l2", "l1"];
  assert.deepEqual(Object.keys(renderer.membershipCohortCounts || {}).sort(), [...cohortOrder].sort(), `${input}: membership cohort metadata is incomplete`);
  const membershipCohortCounts = Object.fromEntries(cohortOrder.map((cohort) => [
    cohort,
    integer(renderer.membershipCohortCounts[cohort], `membershipCohortCounts.${cohort}`, input),
  ]));
  const sourceMembershipRows = integer(renderer.sourceMembershipRows, "sourceMembershipRows", input);
  const sourceUniqueUsers = integer(renderer.sourceUniqueUsers, "sourceUniqueUsers", input);
  const shardMembershipRows = integer(renderer.shardMembershipRows, "shardMembershipRows", input);
  const shardUsers = integer(renderer.shardUsers, "shardUsers", input);
  assert.ok(sourceMembershipRows > 0, `${input}: frozen membership snapshot is empty`);
  assert.ok(sourceUniqueUsers > 0 && sourceUniqueUsers <= sourceMembershipRows, `${input}: invalid source membership user count`);
  assert.ok(shardMembershipRows > 0 && shardMembershipRows <= sourceMembershipRows, `${input}: invalid shard membership row count`);
  assert.ok(shardUsers > 0 && shardUsers <= sourceUniqueUsers, `${input}: invalid shard membership user count`);
  assert.equal(Object.values(membershipCohortCounts).reduce((sum, count) => sum + count, 0), sourceMembershipRows, `${input}: cohort counts do not reconcile to membership rows`);
  return {
    membershipSha256: renderer.membershipSha256,
    membershipKeysSha256: renderer.membershipKeysSha256,
    membershipCohortCounts,
    sourceMembershipRows,
    sourceUniqueUsers,
    shardMembershipRows,
    shardUsers,
  };
}

function validateRecoveryMembershipMetadata(renderer, input) {
  const cohortOrder = ["l3top", "l3", "l2", "l1"];
  const selectedCohorts = ["l3top"];
  for (const [value, label] of [
    [renderer.membershipSha256, "membership hash"],
    [renderer.membershipKeysSha256, "membership-key hash"],
    [renderer.selectedMembershipKeysSha256, "selected membership-key hash"],
    [renderer.userShard?.userIdsSha256, "user-shard hash"],
  ]) {
    assert.match(value || "", /^[a-f0-9]{64}$/, `${input}: recovery ${label} missing`);
  }
  assert.deepEqual(
    [...(renderer.selectedCohorts || [])].sort(),
    selectedCohorts,
    `${input}: recovery cube must select only l3top`,
  );
  assert.deepEqual(
    Object.keys(renderer.membershipCohortCounts || {}).sort(),
    [...cohortOrder].sort(),
    `${input}: recovery membership cohort metadata is incomplete`,
  );
  assert.deepEqual(
    Object.keys(renderer.selectedCohortCounts || {}).sort(),
    selectedCohorts,
    `${input}: recovery selected cohort metadata is incomplete`,
  );
  const membershipCohortCounts = Object.fromEntries(cohortOrder.map((cohort) => [
    cohort,
    integer(renderer.membershipCohortCounts[cohort], `membershipCohortCounts.${cohort}`, input),
  ]));
  const selectedCohortCounts = Object.fromEntries(selectedCohorts.map((cohort) => [
    cohort,
    integer(renderer.selectedCohortCounts[cohort], `selectedCohortCounts.${cohort}`, input),
  ]));
  const sourceMembershipRows = integer(renderer.sourceMembershipRows, "sourceMembershipRows", input);
  const selectedMembershipRows = integer(renderer.selectedMembershipRows, "selectedMembershipRows", input);
  const selectedUniqueUsers = integer(renderer.selectedUniqueUsers, "selectedUniqueUsers", input);
  const shardMembershipRows = integer(renderer.shardMembershipRows, "shardMembershipRows", input);
  const shardUsers = integer(renderer.shardUsers, "shardUsers", input);
  assert.ok(sourceMembershipRows > 0, `${input}: frozen recovery membership snapshot is empty`);
  assert.equal(
    Object.values(membershipCohortCounts).reduce((sum, count) => sum + count, 0),
    sourceMembershipRows,
    `${input}: recovery cohort counts do not reconcile to membership rows`,
  );
  assert.equal(
    selectedMembershipRows,
    selectedCohortCounts.l3top,
    `${input}: recovery selected membership rows do not match l3top membership`,
  );
  assert.ok(
    selectedUniqueUsers > 0 && selectedUniqueUsers <= selectedMembershipRows,
    `${input}: invalid recovery selected unique-user count`,
  );
  assert.ok(
    shardMembershipRows > 0 && shardMembershipRows <= selectedMembershipRows,
    `${input}: invalid recovery shard membership row count`,
  );
  assert.ok(
    shardUsers > 0 && shardUsers <= selectedUniqueUsers,
    `${input}: invalid recovery shard user count`,
  );
  return {
    membershipSha256: renderer.membershipSha256,
    membershipKeysSha256: renderer.membershipKeysSha256,
    membershipCohortCounts,
    sourceMembershipRows,
    sourceUniqueUsers: selectedUniqueUsers,
    shardMembershipRows,
    shardUsers,
    selectedMembershipKeysSha256: renderer.selectedMembershipKeysSha256,
    selectedMembershipRows,
    selectedUniqueUsers,
    selectedCohortCounts,
  };
}

function validateRecoveryValidationManifest(manifestPath, renderer, membership, input) {
  const manifestBuffer = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBuffer.toString("utf8"));
  assert.equal(
    manifest.schema,
    "ff-rfi-missing-card-recovery-validation-v1",
    `${input}: unexpected recovery validation manifest schema`,
  );
  assert.equal(manifest.mode, "validation", `${input}: recovery validation mode mismatch`);
  assert.deepEqual(manifest.window, {
    startInclusive: "2026-07-01T00:00:00Z",
    endExclusive: "2026-07-02T00:00:00Z",
    semantics: "half-open-utc",
  }, `${input}: recovery validation window mismatch`);
  assert.equal(
    manifest.source?.structuredTable,
    recoverySourceTables[0],
    `${input}: validation structured source mismatch`,
  );
  assert.equal(
    manifest.source?.rawTable,
    recoverySourceTables[1],
    `${input}: validation raw source mismatch`,
  );
  assert.equal(
    manifest.source?.handClassMode,
    renderer.handClassMode,
    `${input}: validation hand-class mode mismatch`,
  );
  assert.deepEqual(manifest.source?.join, recoveryRawJoin, `${input}: validation exact-key join mismatch`);
  assert.equal(
    manifest.source?.recoveryPredicate,
    renderer.recoveryPredicate,
    `${input}: validation recovery predicate mismatch`,
  );
  assert.equal(manifest.source?.recoveryIsDisjoint, true, `${input}: validation recovery is not disjoint`);
  assert.deepEqual(
    manifest.source?.parserNetworks,
    recoveryParserNetworks,
    `${input}: validation parser networks mismatch`,
  );
  assert.equal(
    manifest.source?.parserGrammarsSha256,
    renderer.parserGrammarsSha256,
    `${input}: validation parser grammar hash mismatch`,
  );

  const provenance = manifest.provenance || {};
  assert.match(
    provenance.queryJobId || "",
    /^(?:mcp_ch_job_[a-f0-9]{32}|sync:[a-f0-9]{64})$/,
    `${input}: validation query job id is invalid`,
  );
  if (String(provenance.queryJobId).startsWith("sync:")) {
    assert.equal(provenance.queryExecutionMode, "sync", `${input}: validation sync execution mode mismatch`);
    assert.equal(
      provenance.receiptSchema,
      "ff-rfi-card-parser-validation-receipt-v1",
      `${input}: validation sync receipt schema mismatch`,
    );
  } else {
    assert.equal(provenance.queryExecutionMode, "async", `${input}: validation async execution mode mismatch`);
  }
  for (const [value, label] of [
    [provenance.rendererMetadataSha256, "renderer metadata"],
    [provenance.renderedSqlSha256, "rendered SQL"],
    [provenance.queryTemplateSha256, "query template"],
    [provenance.resultSha256, "result"],
    [provenance.receiptSha256, "receipt"],
  ]) {
    assert.match(value || "", /^[a-f0-9]{64}$/, `${input}: validation ${label} hash missing`);
  }
  assert.equal(
    provenance.queryTemplateSha256,
    recoveryTemplateSha256,
    `${input}: validation used a stale recovery template`,
  );
  assert.equal(
    integer(provenance.resultRowCount, "validation resultRowCount", input),
    recoveryParserNetworks.length,
    `${input}: validation result must contain nine network rows`,
  );
  assert.equal(
    integer(provenance.receiptRowCount, "validation receiptRowCount", input),
    recoveryParserNetworks.length,
    `${input}: validation receipt row count mismatch`,
  );
  assert.equal(
    integer(provenance.receiptBytes, "validation receiptBytes", input),
    integer(provenance.resultBytes, "validation resultBytes", input),
    `${input}: validation receipt byte size mismatch`,
  );

  assert.deepEqual(manifest.membership, {
    sha256: membership.membershipSha256,
    keysSha256: membership.membershipKeysSha256,
    selectedKeysSha256: membership.selectedMembershipKeysSha256,
    sourceRows: membership.sourceMembershipRows,
    selectedRows: membership.selectedMembershipRows,
    selectedUniqueUsers: membership.selectedUniqueUsers,
    cohortCounts: membership.membershipCohortCounts,
    selectedCohortCounts: membership.selectedCohortCounts,
    userShard: renderer.userShard,
  }, `${input}: recovery validation membership/window shard identity mismatch`);

  assert.deepEqual(
    Object.keys(manifest.networks || {}).sort(),
    [...recoveryParserNetworks].sort(),
    `${input}: validation must contain exactly nine parser networks`,
  );
  const validationTotals = {
    trackerRows: 0,
    trackerKnownWithRaw: 0,
    rawHhJoined: 0,
    parserSuccess: 0,
    classMatches: 0,
    classFailures: 0,
    trackerMissingRecovered: 0,
  };
  for (const network of recoveryParserNetworks) {
    const counters = manifest.networks[network] || {};
    const normalized = {
      trackerRows: positiveInteger(counters.trackerRows, `${input}: ${network} trackerRows`),
      trackerKnownWithRaw: positiveInteger(
        counters.trackerKnownWithRaw,
        `${input}: ${network} trackerKnownWithRaw`,
      ),
      rawHhJoined: nonNegativeInteger(counters.rawHhJoined, `${input}: ${network} rawHhJoined`),
      parserSuccess: nonNegativeInteger(counters.parserSuccess, `${input}: ${network} parserSuccess`),
      classMatches: nonNegativeInteger(counters.classMatches, `${input}: ${network} classMatches`),
      classFailures: nonNegativeInteger(counters.classFailures, `${input}: ${network} classFailures`),
      trackerMissingRecovered: nonNegativeInteger(
        counters.trackerMissingRecovered,
        `${input}: ${network} trackerMissingRecovered`,
      ),
    };
    assert.equal(normalized.classFailures, 0, `${input}: ${network} validation class failures`);
    assert.equal(
      normalized.classMatches,
      normalized.trackerKnownWithRaw,
      `${input}: ${network} validation class matches do not cover tracker-known rows`,
    );
    assert.equal(Number(counters.matchPctTrackerKnown), 100, `${input}: ${network} validation match rate`);
    assert.equal(Number(counters.validationPassed), 1, `${input}: ${network} validation did not pass`);
    if (network === "iPoker") {
      assert.ok(
        normalized.trackerMissingRecovered > 0,
        `${input}: iPoker validation recovered no missing cards`,
      );
    }
    for (const key of Object.keys(validationTotals)) validationTotals[key] += normalized[key];
  }
  assert.deepEqual(manifest.totals, validationTotals, `${input}: validation network totals drift`);
  assert.deepEqual(manifest.privacy, {
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  }, `${input}: recovery validation privacy boundary mismatch`);

  return {
    schema: manifest.schema,
    manifestSha256: sha256(manifestBuffer),
    queryJobId: provenance.queryJobId,
    queryExecutionMode: provenance.queryExecutionMode,
    receiptSchema: provenance.receiptSchema,
    rendererMetadataSha256: provenance.rendererMetadataSha256,
    renderedSqlSha256: provenance.renderedSqlSha256,
    queryTemplateSha256: provenance.queryTemplateSha256,
    resultSha256: provenance.resultSha256,
    resultRowCount: provenance.resultRowCount,
    resultBytes: provenance.resultBytes,
    receiptSha256: provenance.receiptSha256,
    receiptRowCount: provenance.receiptRowCount,
    receiptBytes: provenance.receiptBytes,
    window: manifest.window,
    networks: manifest.networks,
    totals: validationTotals,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  };
}

function validateRecoveryCube(rows, coverage) {
  const states = new Map();
  for (const row of rows) {
    assert.ok(
      canonicalHandClasses.has(row.hand_class),
      `Recovery cube contains an invalid hand class ${row.hand_class}`,
    );
    const key = coverageKeyFor(row);
    if (!states.has(key)) states.set(key, { hands: new Set(), opportunities: 0 });
    const state = states.get(key);
    assert.ok(!state.hands.has(row.hand_class), `Recovery cube contains duplicate hand ${key}|${row.hand_class}`);
    state.hands.add(row.hand_class);
    state.opportunities += Number(row.opportunities);
  }
  assert.equal(states.size, coverage.size, "Recovery cube state count does not match coverage states");
  for (const [key, state] of states) {
    assert.equal(state.hands.size, 169, `Recovery cube state ${key} does not contain 169 hand classes`);
    assert.deepEqual(
      [...state.hands].sort(),
      [...canonicalHandClasses].sort(),
      `Recovery cube state ${key} hand-class membership drift`,
    );
    assert.equal(
      state.opportunities,
      coverage.get(key)?.known,
      `Recovery cube state ${key} known-card coverage does not reconcile`,
    );
  }
  return {
    stateCount: states.size,
    rowCount: rows.length,
    handClassesPerState: 169,
    coverageReconciled: true,
  };
}

function stableJson(value) {
  return JSON.stringify(value);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}

function executionReceipt(raw, input) {
  const receipt = raw.structuredContent || raw.result?.structuredContent || raw;
  assert.equal(receipt.status, "succeeded", `${input}: execution receipt is not a succeeded source result`);
  assert.match(receipt.job_id || "", /^mcp_ch_job_[a-f0-9]{32}$/, `${input}: invalid ClickHouse execution id`);
  assert(Number.isSafeInteger(Number(receipt.row_count)), `${input}: execution receipt row count missing`);
  if (receipt.byte_size !== undefined) {
    assert(Number.isSafeInteger(Number(receipt.byte_size)), `${input}: execution receipt byte size invalid`);
  }
  return {
    ...receipt,
    row_count: Number(receipt.row_count),
    byte_size: receipt.byte_size === undefined ? 0 : Number(receipt.byte_size),
  };
}

function positiveInteger(value, label) {
  const parsed = Number(value);
  assert(Number.isSafeInteger(parsed) && parsed > 0, `${label} must be a positive integer`);
  return parsed;
}

function nonNegativeInteger(value, label) {
  const parsed = Number(value);
  assert(Number.isSafeInteger(parsed) && parsed >= 0, `${label} must be a non-negative integer`);
  return parsed;
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
