#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const SOURCE_TABLE = "analytics.stg_hh_texts__hh_texts";
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
const COUNTERS = [
  "opportunities", "raises_total", "regular_raise", "open_shove", "limp", "fold_other",
  "shove_allin_flag", "shove_effective_amount_only", "regular_three_bb_open",
  "normal_three_bb_as_shove", "non_exact_r_effective_allin",
];
const RATE_COLUMNS = ["raise_total_pct", "regular_raise_pct", "open_shove_pct", "limp_pct", "fold_pct"];
const CORE_VALIDATION_CHECKS = ["cards", "position", "stack", "publicStack", "action"];
const HANDS = canonicalHands();

const options = parseOptions(process.argv.slice(2));
for (const required of [
  "aggregate", "raw-export", "query", "query-template", "receipt", "validation",
  "membership", "parser", "aggregator", "window-start", "window-end", "output",
]) {
  if (!options[required]) throw new Error(`Missing --${required}`);
}
validateDate(options["window-start"], "window-start");
validateDate(options["window-end"], "window-end");
if (options["window-start"] >= options["window-end"]) throw new Error("Raw-HH window must be non-empty and half-open");

const aggregateBuffer = fs.readFileSync(options.aggregate);
const aggregateRows = parseCsv(aggregateBuffer.toString("utf8"), options.aggregate, COLUMNS);
if (!aggregateRows.length) throw new Error("Raw-HH aggregate is empty");
const membershipBuffer = fs.readFileSync(options.membership);
const membership = inspectMembership(membershipBuffer.toString("utf8"), options.membership);
const aggregate = inspectAggregate(
  aggregateRows,
  options["window-start"],
  options["window-end"],
  membership.cohortCounts,
  options.aggregate,
);

const rawExport = await inspectCsvFile(options["raw-export"]);
if (rawExport.rowCount <= 0) throw new Error("Raw-HH source export is empty");
assert.deepEqual(
  rawExport.header,
  ["check_user_id", "network", "converted_hh_id", "nickname", "hh_at", "hh_text"],
  "Raw-HH source export has unexpected columns",
);
const receiptBuffer = fs.readFileSync(options.receipt);
const receipt = executionReceipt(JSON.parse(receiptBuffer.toString("utf8")));
if (receipt.rowCount !== rawExport.rowCount) {
  throw new Error(`Source receipt row count ${receipt.rowCount} does not match raw export ${rawExport.rowCount}`);
}

const queryBuffer = fs.readFileSync(options.query);
const templateBuffer = fs.readFileSync(options["query-template"]);
validateRenderedQuery(
  queryBuffer.toString("utf8"),
  templateBuffer.toString("utf8"),
  options["window-start"],
  options["window-end"],
);

const parserBuffer = fs.readFileSync(options.parser);
const aggregatorBuffer = fs.readFileSync(options.aggregator);
if (!parserBuffer.length || !aggregatorBuffer.length) throw new Error("Parser and aggregator sources must be non-empty");
const validationBuffer = fs.readFileSync(options.validation);
const validation = inspectValidation(JSON.parse(validationBuffer.toString("utf8")));

const metadata = {
  schema: "ff-rfi-raw-hh-aggregate-v1",
  sourceKind: "raw-hh-local-aggregate",
  window: {
    startInclusive: `${options["window-start"]}T00:00:00Z`,
    endExclusive: `${options["window-end"]}T00:00:00Z`,
    semantics: "half-open-utc",
  },
  table: {
    size: 7,
    filter: "actual occupied seats = 7",
    positionMap: Object.fromEntries(Object.entries(POSITIONS).map(([position, contract]) => [contract.code, position])),
  },
  source: {
    table: SOURCE_TABLE,
    execution: {
      executionMode: "async",
      queryJobId: receipt.jobId,
      querySha256: sha256(queryBuffer),
      queryTemplateSha256: sha256(templateBuffer),
      receiptSha256: sha256(receiptBuffer),
      receiptRowCount: receipt.rowCount,
      receiptByteSize: receipt.byteSize,
      receiptFinishedAt: receipt.finishedAt,
    },
    export: {
      sha256: rawExport.sha256,
      bytes: rawExport.bytes,
      rowCount: rawExport.rowCount,
    },
    dedupe: {
      key: ["check_user_id", "network", "converted_hh_id"],
      order: "latest created_at before local parsing",
    },
  },
  membership: {
    sha256: sha256(membershipBuffer),
    keysSha256: membership.keysSha256,
    rows: membership.rows,
    uniqueUsers: membership.uniqueUsers,
    cohortCounts: membership.cohortCounts,
  },
  transform: {
    parserSha256: sha256(parserBuffer),
    aggregatorSha256: sha256(aggregatorBuffer),
    handClassMode: "parsed-private-raw-hand-history",
    frequencyPolicy: "observed integer counters only; no smoothing, interpolation, model fill or threshold stopping",
  },
  validation: {
    status: "passed",
    reportSha256: sha256(validationBuffer),
    rows: validation.rows,
    parsed: validation.parsed,
    rejected: validation.rejected,
    networks: validation.networks,
    checks: validation.checks,
  },
  aggregate: {
    sha256: sha256(aggregateBuffer),
    bytes: aggregateBuffer.length,
    rowCount: aggregateRows.length,
    scopeSha256: aggregate.scopeSha256,
    stateCount: aggregate.stateCoverage.length,
  },
  knownCards: aggregate.knownCards,
  totals: aggregate.totals,
  stateCoverage: aggregate.stateCoverage,
  privacy: {
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  },
};

const outputText = `${JSON.stringify(metadata, null, 2)}\n`;
assertNoPrivatePayload(outputText);
fs.writeFileSync(options.output, outputText, { mode: 0o600 });
process.stdout.write(`${JSON.stringify({
  output: options.output,
  schema: metadata.schema,
  sourceRows: rawExport.rowCount,
  aggregateRows: aggregateRows.length,
  states: aggregate.stateCoverage.length,
  aggregateSha256: metadata.aggregate.sha256,
})}\n`);

function parseOptions(args) {
  return Object.fromEntries(args.map((argument) => {
    const match = argument.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Expected --key=value, got ${argument}`);
    return [match[1], match[2]];
  }));
}

function inspectMembership(text, input) {
  const rows = parseCsv(text, input);
  if (!rows.length) throw new Error("Cohort membership export is empty");
  const header = Object.keys(rows[0]);
  for (const required of ["cohort", "user_id"]) {
    if (!header.includes(required)) throw new Error(`Membership export is missing ${required}`);
  }
  const keys = [];
  const users = new Set();
  const cohortCounts = Object.fromEntries(COHORTS.map((cohort) => [cohort, 0]));
  for (const [index, row] of rows.entries()) {
    const location = `${input}:${index + 2}`;
    if (!COHORTS.includes(row.cohort)) throw new Error(`${location}: unexpected membership cohort ${row.cohort}`);
    const userId = integer(row.user_id, "user_id", location);
    if (userId <= 0) throw new Error(`${location}: user_id must be positive`);
    keys.push(`${row.cohort}|${userId}`);
    users.add(userId);
    cohortCounts[row.cohort] += 1;
  }
  if (new Set(keys).size !== keys.length) throw new Error("Duplicate cohort/user membership key");
  for (const cohort of COHORTS) {
    if (cohortCounts[cohort] <= 0) throw new Error(`Membership cohort ${cohort} is empty`);
  }
  return {
    rows: rows.length,
    uniqueUsers: users.size,
    cohortCounts,
    keysSha256: sha256([...keys].sort().join("\n")),
  };
}

function inspectAggregate(rows, windowStart, windowEndExclusive, cohortCounts, input) {
  const windowEnd = previousDate(windowEndExclusive);
  const keys = new Set();
  const states = new Map();
  const totals = emptyTotals();
  for (const [index, row] of rows.entries()) {
    const location = `${input}:${index + 2}`;
    if (row.window_start !== windowStart || row.window_end !== windowEnd) {
      throw new Error(`${location}: aggregate row is outside the declared raw-HH window`);
    }
    if (row.table_filter !== "cnt_players = 7" || integer(row.table_size, "table_size", location) !== 7) {
      throw new Error(`${location}: raw-HH aggregate is not exact 7-max`);
    }
    if (!COHORTS.includes(row.cohort)) throw new Error(`${location}: unexpected cohort ${row.cohort}`);
    if (integer(row.cohort_selected_players, "cohort_selected_players", location) !== cohortCounts[row.cohort]) {
      throw new Error(`${location}: cohort membership count drift`);
    }
    const position = POSITIONS[row.position_group];
    if (!position) throw new Error(`${location}: unexpected position ${row.position_group}`);
    if (integer(row.position_order, "position_order", location) !== position.order || integer(row.position_code, "position_code", location) !== position.code) {
      throw new Error(`${location}: position map drift`);
    }
    if (!Object.hasOwn(STACKS, row.stack_bucket) || integer(row.stack_order, "stack_order", location) !== STACKS[row.stack_bucket]) {
      throw new Error(`${location}: stack bucket drift`);
    }
    if (!HANDS.has(row.hand_class)) throw new Error(`${location}: unexpected hand class ${row.hand_class}`);
    const grain = ["cohort", "position_group", "position_order", "position_code", "stack_bucket", "stack_order", "hand_class"]
      .map((column) => row[column]).join("|");
    if (keys.has(grain)) throw new Error(`${location}: duplicate aggregate grain ${grain}`);
    keys.add(grain);

    const values = Object.fromEntries(COUNTERS.map((counter) => [counter, integer(row[counter], counter, location)]));
    if (values.raises_total !== values.regular_raise + values.open_shove) throw new Error(`${location}: raise partition mismatch`);
    if (values.opportunities !== values.raises_total + values.limp + values.fold_other) throw new Error(`${location}: action partition mismatch`);
    if (values.open_shove !== values.shove_allin_flag + values.shove_effective_amount_only) throw new Error(`${location}: shove partition mismatch`);
    if (values.normal_three_bb_as_shove !== 0) throw new Error(`${location}: normal 2.5–3.5 BB open was classified as shove`);
    validateDerived(row, values, location);
    for (const counter of COUNTERS) totals[counter] += values[counter];

    const stateKey = ["cohort", "position_group", "position_order", "position_code", "stack_bucket", "stack_order"]
      .map((column) => row[column]).join("|");
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
    if (state.eligible < state.known || state.known <= 0) throw new Error(`${location}: invalid known-card coverage`);
    if (state.lookupMismatch !== 0) throw new Error(`${location}: raw-HH source cannot claim tracker lookup mismatches`);
    validateObservation(state.firstObservedAt, windowStart, windowEndExclusive, `${location}: first_observed_at`);
    validateObservation(state.lastObservedAt, windowStart, windowEndExclusive, `${location}: last_observed_at`);
    if (state.firstObservedAt > state.lastObservedAt) throw new Error(`${location}: reversed observation bounds`);
    const existing = states.get(stateKey);
    if (existing) {
      assert.deepEqual(
        { ...state, opportunities: 0 },
        { ...existing, opportunities: 0 },
        `${location}: repeated state coverage drift`,
      );
      existing.opportunities += values.opportunities;
    } else {
      state.opportunities = values.opportunities;
      states.set(stateKey, state);
    }
  }
  for (const [key, state] of states) {
    if (state.opportunities !== state.known) {
      throw new Error(`${input}: state ${key} known-card coverage does not reconcile to hand rows`);
    }
  }
  const stateCoverage = [...states.values()].sort(compareState);
  const knownCards = stateCoverage.reduce((result, state) => {
    result.eligible += state.eligible;
    result.known += state.known;
    result.lookupMismatch += state.lookupMismatch;
    if (!result.firstObservedAt || state.firstObservedAt < result.firstObservedAt) result.firstObservedAt = state.firstObservedAt;
    if (!result.lastObservedAt || state.lastObservedAt > result.lastObservedAt) result.lastObservedAt = state.lastObservedAt;
    return result;
  }, { eligible: 0, known: 0, lookupMismatch: 0, firstObservedAt: "", lastObservedAt: "" });
  knownCards.pct = Number((knownCards.known / knownCards.eligible * 100).toFixed(6));
  return {
    totals,
    knownCards,
    stateCoverage,
    scopeSha256: sha256(stateCoverage.map((state) =>
      [state.cohort, state.position, state.positionCode, state.stack, state.stackOrder].join("|")
    ).join("\n")),
  };
}

function inspectValidation(raw) {
  if (raw?.source?.rawHandHistoriesPublished !== false) {
    throw new Error("Validation report does not prove that raw hand histories stayed private");
  }
  const totals = raw?.totals;
  if (!totals || !Number.isSafeInteger(Number(totals.rows)) || Number(totals.rows) <= 0) {
    throw new Error("Validation report has no compared rows");
  }
  const rows = Number(totals.rows);
  const parsed = Number(totals.parsed);
  const rejected = Number(totals.rejected);
  if (parsed !== rows || rejected !== 0) throw new Error("Validation report contains rejected or unparsed hands");
  const checks = {};
  for (const check of [...CORE_VALIDATION_CHECKS, "shove"]) {
    const value = totals.checks?.[check];
    const compared = Number(value?.compared);
    const matched = Number(value?.matched);
    if (!Number.isSafeInteger(compared) || !Number.isSafeInteger(matched) || compared < 0 || matched !== compared) {
      throw new Error(`Validation ${check} mismatch`);
    }
    if (CORE_VALIDATION_CHECKS.includes(check) && compared !== rows) {
      throw new Error(`Validation ${check} does not cover every parsed row`);
    }
    if (check === "shove" && compared <= 0) throw new Error("Validation shove check has no compared raises");
    checks[check] = { compared, matched };
  }
  const networks = {};
  const networkEntries = Object.entries(raw.networks || {});
  if (!networkEntries.length) throw new Error("Validation report has no network breakdown");
  for (const [network, stats] of networkEntries.sort(([left], [right]) => left.localeCompare(right))) {
    const networkRows = Number(stats.rows);
    if (!network || !Number.isSafeInteger(networkRows) || networkRows <= 0 || Number(stats.parsed) !== networkRows || Number(stats.rejected) !== 0) {
      throw new Error(`Validation network ${network || "unknown"} has rejected or unparsed hands`);
    }
    const networkChecks = {};
    for (const check of [...CORE_VALIDATION_CHECKS, "shove"]) {
      const value = stats.checks?.[check];
      const compared = Number(value?.compared);
      const matched = Number(value?.matched);
      if (!Number.isSafeInteger(compared) || !Number.isSafeInteger(matched) || compared < 0 || matched !== compared) {
        throw new Error(`Validation network ${network} ${check} mismatch`);
      }
      if (CORE_VALIDATION_CHECKS.includes(check) && compared !== networkRows) {
        throw new Error(`Validation network ${network} ${check} does not cover every parsed row`);
      }
      networkChecks[check] = { compared, matched };
    }
    networks[network] = { rows: networkRows, checks: networkChecks };
  }
  return { rows, parsed, rejected, checks, networks };
}

function validateRenderedQuery(query, template, windowStart, windowEnd) {
  if (query.includes("{{")) throw new Error("Rendered raw-HH query still contains a template placeholder");
  if (!template.includes("{{WINDOW_START_INCLUSIVE}}") || !template.includes("{{WINDOW_END_EXCLUSIVE}}")) {
    throw new Error("Raw-HH query template does not expose both half-open window boundaries");
  }
  const executable = stripSqlLiteralsAndComments(query);
  const tables = [...executable.matchAll(/\bFROM\s+(analytics\.[A-Za-z0-9_]+)/gi)].map((match) => match[1]);
  if (tables.length !== 1 || tables[0] !== SOURCE_TABLE) {
    throw new Error(`Raw-HH query must read only ${SOURCE_TABLE}`);
  }
  if (!query.includes(windowStart) || !query.includes(windowEnd)) {
    throw new Error("Rendered raw-HH query is not bound to the declared window");
  }
  for (const token of ["check_user_id", "network", "converted_hh_id", "nickname", "hh_at", "hh_text", "created_at"]) {
    if (!new RegExp(`\\b${token}\\b`, "i").test(executable)) throw new Error(`Raw-HH query is missing ${token}`);
  }
  if (!/\bargMax\s*\(/i.test(executable) || !/\bGROUP\s+BY\b/i.test(executable)) {
    throw new Error("Raw-HH query does not prove latest-created-at deduplication");
  }
}

function stripSqlLiteralsAndComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''");
}

function executionReceipt(raw) {
  const receipt = raw.structuredContent || raw.result?.structuredContent || raw;
  if (receipt.status !== "succeeded") throw new Error("Raw-HH source receipt is not succeeded");
  if (!/^mcp_ch_job_[a-f0-9]{32}$/.test(String(receipt.job_id || ""))) throw new Error("Raw-HH source receipt has an invalid job id");
  const rowCount = Number(receipt.row_count);
  if (!Number.isSafeInteger(rowCount) || rowCount <= 0) throw new Error("Raw-HH source receipt has no positive row count");
  return {
    jobId: receipt.job_id,
    rowCount,
    byteSize: Number.isSafeInteger(Number(receipt.byte_size)) ? Number(receipt.byte_size) : 0,
    finishedAt: String(receipt.finished_at || ""),
  };
}

async function inspectCsvFile(input) {
  const hash = crypto.createHash("sha256");
  let bytes = 0;
  let recordCount = 0;
  let recordHasContent = false;
  let quoted = false;
  let carry = "";
  let firstRecord = "";
  let collectingHeader = true;
  for await (const chunk of fs.createReadStream(input)) {
    hash.update(chunk);
    bytes += chunk.length;
    const text = carry + chunk.toString("utf8");
    carry = text.slice(-1);
    processText(text.slice(0, -1));
  }
  processText(carry);
  if (quoted) throw new Error("Raw-HH export CSV has an unterminated quoted field");
  if (recordHasContent) recordCount += 1;
  if (recordCount < 2) throw new Error("Raw-HH export CSV has no data rows");
  return {
    sha256: hash.digest("hex"),
    bytes,
    rowCount: recordCount - 1,
    header: parseCsvRecord(firstRecord.replace(/\r$/, "")),
  };

  function processText(text) {
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (collectingHeader && !(character === "\n" && !quoted)) firstRecord += character;
      if (character === "\"") {
        recordHasContent = true;
        if (quoted && text[index + 1] === "\"") {
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === "\n" && !quoted) {
        if (recordHasContent) recordCount += 1;
        recordHasContent = false;
        collectingHeader = false;
      } else if (character !== "\r") {
        recordHasContent = true;
      }
    }
  }
}

function parseCsvRecord(text) {
  const values = [];
  let cell = "";
  let quoted = false;
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
      values.push(cell);
      cell = "";
    } else cell += character;
  }
  if (quoted) throw new Error("CSV header has an unterminated quoted field");
  values.push(cell);
  return values;
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

function validateDerived(row, values, location) {
  const expectedRates = [
    values.raises_total,
    values.regular_raise,
    values.open_shove,
    values.limp,
    values.fold_other,
  ].map((value) => pct(value, values.opportunities));
  for (let index = 0; index < RATE_COLUMNS.length; index += 1) {
    const actual = Number(row[RATE_COLUMNS[index]]);
    if (!Number.isFinite(actual) || Math.abs(actual - Number(expectedRates[index])) > 0.001000001) {
      throw new Error(`${location}: stale ${RATE_COLUMNS[index]}`);
    }
  }
  if (Number(row.below_exact_minimum) !== Number(values.opportunities < 50)) throw new Error(`${location}: stale below_exact_minimum`);
  if (Number(row.low_sample) !== Number(values.opportunities < 100)) throw new Error(`${location}: stale low_sample`);
}

function validateObservation(value, start, endExclusive, label) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/);
  if (!match || match[1] < start || match[1] >= endExclusive) throw new Error(`${label} is outside the declared half-open window`);
}

function integer(value, label, location) {
  if (!/^\d+$/.test(String(value))) throw new Error(`${location}: invalid ${label}`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${location}: unsafe ${label}`);
  return parsed;
}

function compareState(left, right) {
  return COHORTS.indexOf(left.cohort) - COHORTS.indexOf(right.cohort)
    || left.stackOrder - right.stackOrder
    || left.positionOrder - right.positionOrder;
}

function emptyTotals() {
  return Object.fromEntries(COUNTERS.map((counter) => [counter, 0]));
}

function pct(value, total) {
  if (!total) return "0";
  return (value / total * 100).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function validateDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ${label} ${value}`);
  }
}

function previousDate(value) {
  return new Date(Date.parse(`${value}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
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
    if (pattern.test(text)) throw new Error(`Generated raw-HH manifest contains private payload matching ${pattern}`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
