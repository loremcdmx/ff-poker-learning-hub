import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { normalizeHandClass } from "./field-action-quality.mjs";
import {
  COIN_PARTY_PUBLICATION_CONTRACT,
  COIN_PARTY_PUBLICATION_NETWORKS,
  coinPartyGrammarContract,
} from "./coin-party-publication-contract.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const realizer = require(path.resolve(here, "../../poker-kit/simulator/bot-range-realizer.js"));
const observedConfidence = require(path.resolve(here, "../../poker-kit/observed-frequency-confidence.js"));

const RAW_STACKS = ["70+", "30-70", "20-30", "15-20", "12-15", "10-12", "8-10", "6-8", "<6"];
const STACK_COMPONENTS = Object.freeze({
  "70+": ["70+"],
  "30-70": ["30-70"],
  "20-30": ["20-30"],
  "15-20": ["15-20"],
  "<15": ["12-15", "10-12", "8-10", "6-8", "<6"],
});
const STACKS = Object.keys(STACK_COMPONENTS);
const PUBLIC_STACK_FOR_RAW = Object.fromEntries(
  Object.entries(STACK_COMPONENTS).flatMap(([publicStack, rawStacks]) =>
    rawStacks.map((rawStack) => [rawStack, publicStack])
  )
);
const POSITIONS = ["EP", "MP", "HJ", "CO", "BTN", "SB"];
const COHORTS = ["l3top", "l3", "l2", "l1"];
const HANDS = realizer.HAND_CLASSES.map((item) => item.key);
const EXACT_CELL_MIN_N = observedConfidence.MIN_EXACT_DENOMINATOR;
const POSITION_CONTRACT = Object.freeze({
  EP: { order: 1, code: 4 },
  MP: { order: 2, code: 3 },
  HJ: { order: 3, code: 2 },
  CO: { order: 4, code: 1 },
  BTN: { order: 5, code: 0 },
  SB: { order: 6, code: 9 },
});
const RECOVERY_SOURCE_TABLES = Object.freeze([
  "analytics.int_tracker_hand_joined",
  "analytics.stg_hh_texts__hh_texts",
]);
const RECOVERY_RAW_JOIN = Object.freeze({
  type: "exact-key",
  trackerKey: ["toUInt64(user_id)", "toString(network)", "toString(hh_id)"],
  rawKey: [
    "toUInt64(check_user_id)",
    "toString(network)",
    "toString(converted_hh_id)",
  ],
});
const RECOVERY_PARSER_NETWORKS = Object.freeze([
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
const ACTION_COUNTER_NAMES = Object.freeze([
  "opportunities",
  "raises_total",
  "regular_raise",
  "open_shove",
  "limp",
  "fold_other",
  "shove_allin_flag",
  "shove_effective_amount_only",
  "regular_three_bb_open",
  "normal_three_bb_as_shove",
  "non_exact_r_effective_allin",
]);
const CURRENT_SUPPLEMENT_SCHEMA = "ff-rfi-field-action-current-supplement-v1";
const CURRENT_SUPPLEMENT_STRATEGY = "exact-same-window-novel-raw-l3top-supplement-with-l3-delta";
const CURRENT_SUPPLEMENT_WINDOW = Object.freeze({
  startInclusive: "2023-09-01T00:00:00Z",
  endExclusive: "2026-07-26T00:00:00Z",
  semantics: "half-open-utc",
});
const DIRECT_NOVEL_SUPPLEMENT_SCHEMA = "ff-rfi-field-action-novel-raw-supplement-merge-v1";
const DIRECT_NOVEL_SUPPLEMENT_STRATEGY = "approved-plan-source-union-with-observed-zero-dimension-completion";
const COMPOSED_NOVEL_SUPPLEMENT_SCHEMA = "ff-rfi-field-action-novel-raw-supplement-composition-v1";
const COMPOSED_NOVEL_SUPPLEMENT_STRATEGY = "disjoint-approved-source-set-supplement-union-v1";
const NOVEL_RAW_SOURCE_KIND = "publication-safe-novel-raw-hh-l3top";
const NOVEL_INPUT_SOURCE_KINDS = Object.freeze([
  "coin-party-publication-v2",
  "immutable-plan-raw-hh-v5",
]);
const SAFE_NOVEL_INPUT_KEYS = Object.freeze([
  "sourceKind",
  "network",
  "userShard",
  "queryJobId",
  "executionMode",
  "startedAt",
  "finishedAt",
  "rendererMetadataSha256",
  "receiptSha256",
  "querySha256",
  "resultSha256",
  "resultRows",
  "resultBytes",
  "observedStates",
  "observedCells",
  "templateSha256",
  "parserTemplateSha256",
  "parserValidationSha256",
  "publicationGate",
  "windowStartInclusive",
  "windowEndExclusive",
  "privacy",
]);
const SAFE_BASE_COMMON_INPUT_KEYS = Object.freeze([
  "sourceKind",
  "queryJobId",
  "executionMode",
  "startedAt",
  "finishedAt",
  "rendererMetadataSha256",
  "receiptSha256",
  "querySha256",
  "resultSha256",
  "resultRows",
  "resultBytes",
  "templateSha256",
  "windowStartInclusive",
  "windowEndExclusive",
  "userShard",
  "membershipSha256",
  "membershipKeysSha256",
  "privacy",
]);
const SAFE_BASE_STRUCTURED_INPUT_KEYS = Object.freeze([
  ...SAFE_BASE_COMMON_INPUT_KEYS,
  "handClassMode",
  "holecardMappingSha256",
]);
const SAFE_BASE_RECOVERY_INPUT_KEYS = Object.freeze([
  ...SAFE_BASE_COMMON_INPUT_KEYS,
  "parserGrammarsSha256",
  "parserNetworks",
  "recoveryIsDisjoint",
  "recoveryPredicate",
  "rawJoin",
  "validation",
]);
const SAFE_USER_SHARD_KEYS = Object.freeze([
  "index",
  "count",
  "users",
  "userIdsSha256",
]);
const SAFE_RECOVERY_VALIDATION_KEYS = Object.freeze([
  "schema",
  "manifestSha256",
  "queryJobId",
  "queryExecutionMode",
  "startedAt",
  "finishedAt",
  "rendererMetadataSha256",
  "renderedSqlSha256",
  "queryTemplateSha256",
  "resultSha256",
  "resultRows",
  "resultBytes",
  "receiptSha256",
  "window",
  "networks",
  "totals",
  "privacy",
]);
const SAFE_RECOVERY_NETWORK_COUNTER_KEYS = Object.freeze([
  "trackerRows",
  "trackerKnownWithRaw",
  "rawHhJoined",
  "parserSuccess",
  "classMatches",
  "classFailures",
  "matchPctTrackerKnown",
  "trackerMissingRecovered",
  "validationPassed",
]);
const SAFE_RECOVERY_TOTAL_KEYS = Object.freeze([
  "trackerRows",
  "trackerKnownWithRaw",
  "rawHhJoined",
  "parserSuccess",
  "classMatches",
  "classFailures",
  "trackerMissingRecovered",
]);

const COHORT_META = {
  l3top: {
    label: "Лига 3 · топ-25%",
    shortLabel: "Лига 3 · топ-25%",
    ranks: "текущая Лига 3",
    description: "Верхний квартиль по FFEV среди всех активных реальных игроков текущей Лиги 3."
  },
  l3: {
    label: "Лига 3",
    shortLabel: "Лига 3",
    ranks: "текущая лига",
    description: "Активные реальные игроки текущей Лиги 3 с минимум 30 000 рук в окне FFEV."
  },
  l2: {
    label: "Лига 2",
    shortLabel: "Лига 2",
    ranks: "R6–10",
    description: "Активные реальные игроки текущей Лиги 2 с минимум 30 000 рук в окне FFEV."
  },
  l1: {
    label: "Первая лига",
    shortLabel: "Первая лига",
    ranks: "R1–5",
    description: "Активные реальные игроки текущей Лиги 1 с минимум 30 000 рук в окне FFEV."
  }
};

function args() {
  return Object.fromEntries(process.argv.slice(2).map((item) => {
    const match = item.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Expected --key=value, got ${item}`);
    return [match[1], match[2]];
  }));
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const header = rows.shift();
  if (!header) return [];
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

function number(row, ...keys) {
  for (const key of keys) if (row && row[key] !== undefined && row[key] !== "") return Number(row[key]);
  return 0;
}

function actions(row) {
  const opportunities = number(row, "opportunities");
  const shove = number(row, "open_shove", "open_shoves", "shoves", "open_pushes");
  const raisesTotal = number(row, "raises_total", "opens", "rfi");
  const raise = number(row, "regular_raise", "regular_raises", "raises");
  const limp = number(row, "limp", "limps");
  const fold = number(row, "fold_other", "folds", "fold");
  const resolvedRaise = row && (row.regular_raise !== undefined || row.regular_raises !== undefined || row.raises !== undefined)
    ? raise
    : Math.max(0, raisesTotal - shove);
  return { opportunities, raise: resolvedRaise, shove, limp, fold, raisesTotal };
}

function classifierCounts(row, label) {
  const fields = ["shove_allin_flag", "shove_effective_amount_only", "regular_three_bb_open", "normal_three_bb_as_shove", "non_exact_r_effective_allin"];
  const values = Object.fromEntries(fields.map((field) => {
    if (row?.[field] === undefined || row[field] === "") throw new Error(`Missing ${field}: ${label}`);
    const value = Number(row[field]);
    if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${field}: ${label}`);
    return [field, value];
  }));
  return values;
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function sourceExecutionMode(sourceRef, querySha256, asyncPattern, label) {
  if (sourceRef === `sync:${querySha256}`) return "sync";
  if (asyncPattern.test(String(sourceRef || ""))) return "async";
  throw new Error(`${label} has no honest execution id: ${sourceRef || "missing"}`);
}

function succeededReceipt(raw, pattern, label) {
  const receipt = raw.structuredContent || raw.result?.structuredContent || raw;
  if (receipt.status !== "succeeded") throw new Error(`${label} receipt is not succeeded`);
  if (!pattern.test(String(receipt.job_id || ""))) throw new Error(`${label} receipt has an invalid job id`);
  if (!Number.isSafeInteger(Number(receipt.row_count))) throw new Error(`${label} receipt has no row count`);
  return { ...receipt, row_count: Number(receipt.row_count) };
}

function membershipQueryFromTemplate(template) {
  const start = template.indexOf("WITH eligible AS (");
  const end = template.indexOf("\n-- -------------------------------------------------------------------------\n-- ClickHouse:");
  if (start < 0 || end <= start) throw new Error("Cannot isolate the canonical RFI cohort-membership query");
  return `${template.slice(start, end).trim()}\n`;
}

function packU16(values) {
  const buffer = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => buffer.writeUInt16LE(Math.max(0, Math.min(65535, value)), index * 2));
  return buffer.toString("base64");
}

function packU32(values) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeUInt32LE(Math.max(0, value) >>> 0, index * 4));
  return buffer.toString("base64");
}

function roundedPct(value, total) {
  return total ? Math.round(value / total * 100) : 0;
}

function roundedPartition(values, total) {
  if (!total) return values.map(() => 0);
  const raw = values.map((value) => value / total * 100);
  const rounded = raw.map(Math.floor);
  let remaining = 100 - rounded.reduce((sum, value) => sum + value, 0);
  const priority = raw.map((value, index) => ({ index, fraction: value - rounded[index] }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (let index = 0; index < remaining; index += 1) rounded[priority[index].index] += 1;
  return rounded;
}

function validateRow(row) {
  if (!COHORTS.includes(row.cohort)) throw new Error(`Invalid cohort: ${row.cohort}`);
  if (!RAW_STACKS.includes(row.stack_bucket) && !STACKS.includes(row.stack_bucket)) throw new Error(`Invalid stack bucket: ${row.stack_bucket}`);
  if (!POSITIONS.includes(row.position_group)) throw new Error(`Invalid position group: ${row.position_group}`);
  if (row.table_filter !== "cnt_players = 7" || number(row, "table_size") !== 7) throw new Error(`Field row is not exact 7-max: ${row.table_filter}|${row.table_size}`);
  const positionContract = POSITION_CONTRACT[row.position_group];
  if (number(row, "position_order") !== positionContract.order || number(row, "position_code") !== positionContract.code) {
    throw new Error(`Invalid exact 7-max position mapping: ${row.position_group}|${row.position_order}|${row.position_code}`);
  }
  const eligible = number(row, "eligible_opportunities");
  const known = number(row, "known_card_opportunities");
  const lookupMismatch = number(row, "lookup_mismatch_opportunities");
  if (![eligible, known, lookupMismatch].every((value) => Number.isInteger(value) && value >= 0) || known > eligible) {
    throw new Error(`Invalid known-card coverage: ${row.cohort}|${row.stack_bucket}|${row.position_group}`);
  }
  const hand = normalizeHandClass(row.hand_class);
  const cell = actions(row);
  const values = [cell.opportunities, cell.raise, cell.shove, cell.limp, cell.fold];
  if (!values.every((value) => Number.isInteger(value) && value >= 0)) throw new Error(`Non-integer action count: ${row.cohort}|${row.stack_bucket}|${row.position_group}|${hand}`);
  if (cell.raisesTotal && cell.raisesTotal !== cell.raise + cell.shove) throw new Error(`Raise split mismatch: ${row.cohort}|${row.stack_bucket}|${row.position_group}|${hand}`);
  if (cell.opportunities !== cell.raise + cell.shove + cell.limp + cell.fold) throw new Error(`Action partition mismatch: ${row.cohort}|${row.stack_bucket}|${row.position_group}|${hand}`);
  const classifier = classifierCounts(row, `${row.cohort}|${row.stack_bucket}|${row.position_group}|${hand}`);
  if (cell.shove !== classifier.shove_allin_flag + classifier.shove_effective_amount_only) throw new Error(`Shove classifier partition mismatch: ${row.cohort}|${row.stack_bucket}|${row.position_group}|${hand}`);
  if (classifier.normal_three_bb_as_shove !== 0) throw new Error(`Normal 2.5–3.5 BB open classified as shove: ${row.cohort}|${row.stack_bucket}|${row.position_group}|${hand}`);
  return { ...row, hand_class: hand };
}

function indexRows(rows) {
  const indexes = Object.fromEntries(COHORTS.map((cohort) => [cohort, new Map()]));
  for (const sourceRow of rows) {
    const row = validateRow(sourceRow);
    const key = [row.stack_bucket, row.position_group, row.hand_class].join("|");
    if (indexes[row.cohort].has(key)) throw new Error(`Duplicate normalized field-action row: ${row.cohort}|${key}`);
    indexes[row.cohort].set(key, row);
  }
  return indexes;
}

function aggregateRows(rows) {
  const aggregates = new Map();
  for (const sourceRow of rows) {
    const row = validateRow(sourceRow);
    const publicStack = PUBLIC_STACK_FOR_RAW[row.stack_bucket];
    if (!publicStack) throw new Error(`Source rows must use raw stack buckets, got ${row.stack_bucket}`);
    const key = [row.cohort, publicStack, row.position_group, row.hand_class].join("|");
    if (!aggregates.has(key)) {
      aggregates.set(key, {
        window_start: row.window_start,
        window_end: row.window_end,
        table_filter: row.table_filter,
        cohort: row.cohort,
        cohort_selected_players: 0,
        position_group: row.position_group,
        position_order: row.position_order,
        position_code: row.position_code,
        stack_bucket: publicStack,
        stack_order: row.stack_order,
        hand_class: row.hand_class,
        table_size: row.table_size,
        eligible_opportunities: 0,
        known_card_opportunities: 0,
        lookup_mismatch_opportunities: 0,
        first_observed_at: row.first_observed_at,
        last_observed_at: row.last_observed_at,
        opportunities: 0,
        raises_total: 0,
        regular_raise: 0,
        open_shove: 0,
        limp: 0,
        fold_other: 0,
        shove_allin_flag: 0,
        shove_effective_amount_only: 0,
        regular_three_bb_open: 0,
        normal_three_bb_as_shove: 0,
        non_exact_r_effective_allin: 0,
      });
    }
    const target = aggregates.get(key);
    const cell = actions(row);
    const classifier = classifierCounts(row, key);
    target.cohort_selected_players = Math.max(
      target.cohort_selected_players,
      number(row, "cohort_players", "cohort_selected_players"),
    );
    target.eligible_opportunities += number(row, "eligible_opportunities");
    target.known_card_opportunities += number(row, "known_card_opportunities");
    target.lookup_mismatch_opportunities += number(row, "lookup_mismatch_opportunities");
    if (row.first_observed_at < target.first_observed_at) target.first_observed_at = row.first_observed_at;
    if (row.last_observed_at > target.last_observed_at) target.last_observed_at = row.last_observed_at;
    target.opportunities += cell.opportunities;
    target.raises_total += cell.raise + cell.shove;
    target.regular_raise += cell.raise;
    target.open_shove += cell.shove;
    target.limp += cell.limp;
    target.fold_other += cell.fold;
    target.shove_allin_flag += classifier.shove_allin_flag;
    target.shove_effective_amount_only += classifier.shove_effective_amount_only;
    target.regular_three_bb_open += classifier.regular_three_bb_open;
    target.normal_three_bb_as_shove += classifier.normal_three_bb_as_shove;
    target.non_exact_r_effective_allin += classifier.non_exact_r_effective_allin;
  }
  return [...aggregates.values()].map(validateRow);
}

function actionCountTotals(rows) {
  return rows.reduce((totals, row) => {
    const cell = actions(row);
    totals.opportunities += cell.opportunities;
    totals.regularRaise += cell.raise;
    totals.openShove += cell.shove;
    totals.limp += cell.limp;
    totals.foldOther += cell.fold;
    return totals;
  }, { opportunities: 0, regularRaise: 0, openShove: 0, limp: 0, foldOther: 0 });
}

function exactActionCounterTotals(rows) {
  return rows.reduce((totals, row) => {
    const cell = actions(row);
    const classifiers = classifierCounts(
      row,
      `${row.cohort}|${row.stack_bucket}|${row.position_group}|${row.hand_class}`,
    );
    totals.opportunities += cell.opportunities;
    totals.raises_total += cell.raise + cell.shove;
    totals.regular_raise += cell.raise;
    totals.open_shove += cell.shove;
    totals.limp += cell.limp;
    totals.fold_other += cell.fold;
    for (const counter of [
      "shove_allin_flag",
      "shove_effective_amount_only",
      "regular_three_bb_open",
      "normal_three_bb_as_shove",
      "non_exact_r_effective_allin",
    ]) totals[counter] += classifiers[counter];
    return totals;
  }, Object.fromEntries(ACTION_COUNTER_NAMES.map((counter) => [counter, 0])));
}

function exactActionCounterTotalsByCohort(rows) {
  return Object.fromEntries(COHORTS.map((cohort) => [
    cohort,
    exactActionCounterTotals(rows.filter((row) => row.cohort === cohort)),
  ]));
}

function sourceCoverageSummary(rows) {
  const states = new Map();
  const knownFromHands = new Map();
  const positionOpportunities = Object.fromEntries(COHORTS.map((cohort) => [
    cohort,
    Object.fromEntries(POSITIONS.map((position) => [position, 0])),
  ]));
  for (const sourceRow of rows) {
    const row = validateRow(sourceRow);
    const key = [row.cohort, row.stack_bucket, row.position_group].join("|");
    const state = {
      cohort: row.cohort,
      stack: row.stack_bucket,
      position: row.position_group,
      eligible: number(row, "eligible_opportunities"),
      known: number(row, "known_card_opportunities"),
      lookupMismatch: number(row, "lookup_mismatch_opportunities"),
      firstObservedAt: row.first_observed_at,
      lastObservedAt: row.last_observed_at,
    };
    if (states.has(key)) assert.deepEqual(state, states.get(key), `Known-card state drift: ${key}`);
    else states.set(key, state);
    const opportunities = actions(row).opportunities;
    knownFromHands.set(key, (knownFromHands.get(key) || 0) + opportunities);
    positionOpportunities[row.cohort][row.position_group] += opportunities;
  }
  for (const [key, state] of states) {
    assert.equal(knownFromHands.get(key), state.known, `Known-card numerator does not reconcile to 169 hand classes: ${key}`);
  }
  for (const cohort of COHORTS) {
    const ladder = POSITIONS.map((position) => positionOpportunities[cohort][position]);
    for (let index = 1; index < ladder.length; index += 1) {
      assert.ok(ladder[index - 1] > ladder[index], `Exact 7-max opportunities must decrease from EP to SB: ${cohort}|${POSITIONS[index - 1]}=${ladder[index - 1]}|${POSITIONS[index]}=${ladder[index]}`);
    }
  }
  const totals = [...states.values()].reduce((result, state) => {
    result.eligible += state.eligible;
    result.known += state.known;
    result.lookupMismatch += state.lookupMismatch;
    if (!result.firstObservedAt || state.firstObservedAt < result.firstObservedAt) result.firstObservedAt = state.firstObservedAt;
    if (!result.lastObservedAt || state.lastObservedAt > result.lastObservedAt) result.lastObservedAt = state.lastObservedAt;
    return result;
  }, { eligible: 0, known: 0, lookupMismatch: 0, firstObservedAt: "", lastObservedAt: "" });
  totals.pct = Number((totals.known / totals.eligible * 100).toFixed(6));
  return { totals, positionOpportunities, states: [...states.values()] };
}

function stateCoverage(indexes, stack, position) {
  const cohorts = {};
  let passesGate = true;
  for (const cohort of COHORTS) {
    const samples = HANDS.map((hand) => actions(indexes[cohort].get([stack, position, hand].join("|"))).opportunities);
    const complete = samples.filter((sample) => sample >= EXACT_CELL_MIN_N).length;
    const minN = Math.min(...samples);
    cohorts[cohort] = {
      rows: HANDS.length,
      complete,
      minN,
      missing: samples.filter((sample) => sample === 0).length,
    };
    if (complete !== HANDS.length) passesGate = false;
  }
  return { stack, position, passesGate, cohorts };
}

function buildChart(index, stack, position) {
  const cells = HANDS.map((hand) => actions(index.get([stack, position, hand].join("|"))));
  if (cells.some((cell) => cell.opportunities < EXACT_CELL_MIN_N)) throw new Error(`Attempted to publish incomplete chart: ${stack}|${position}`);
  const cellPcts = cells.map((cell) => roundedPartition([cell.raise, cell.shove, cell.limp, cell.fold], cell.opportunities));
  const total = cells.reduce((sum, cell) => sum + cell.opportunities, 0);
  const raiseTotal = cells.reduce((sum, cell) => sum + cell.raise, 0);
  const shoveTotal = cells.reduce((sum, cell) => sum + cell.shove, 0);
  const limpTotal = cells.reduce((sum, cell) => sum + cell.limp, 0);
  const foldTotal = cells.reduce((sum, cell) => sum + cell.fold, 0);
  const [raisePct, shovePct, limpPct] = roundedPartition([raiseTotal, shoveTotal, limpTotal, foldTotal], total);
  return {
    n: packU32(cells.map((cell) => cell.opportunities)),
    r: packU16(cellPcts.map((values) => values[0] * 10)),
    j: packU16(cellPcts.map((values) => values[1] * 10)),
    l: packU16(cellPcts.map((values) => values[2] * 10)),
    opportunities: total,
    raisePct,
    shovePct,
    limpPct,
    rfiPct: roundedPct(raiseTotal + shoveTotal, total),
    completeCells: HANDS.length,
    minimumCellOpportunities: Math.min(...cells.map((cell) => cell.opportunities))
  };
}

function validateActionSourceShards(metadata) {
  const inputs = metadata.inputs || [];
  if (metadata.shardStrategy === "immutable-user-id") {
    const firstWindow = `${inputs[0].windowStartInclusive}|${inputs[0].windowEndInclusive}`;
    if (!inputs.every((input) => `${input.windowStartInclusive}|${input.windowEndInclusive}` === firstWindow)) {
      throw new Error("Immutable user-id shards must cover the same source window");
    }
    const shardCount = inputs[0].userShard?.count;
    if (shardCount !== inputs.length) throw new Error("Every immutable user-id shard must be present");
    const indices = inputs.map((input) => input.userShard?.index).sort((left, right) => left - right);
    assert.deepEqual(indices, Array.from({ length: shardCount }, (_, index) => index), "Immutable user-id shard indices are incomplete");
    if (new Set(inputs.map((input) => input.userShard?.userIdsSha256)).size !== inputs.length) throw new Error("Immutable user-id shard hashes must be unique");
    if (new Set(inputs.map((input) => input.sourceUniqueUsers)).size !== 1) throw new Error("Immutable shards disagree on the source population");
    if (inputs.reduce((sum, input) => sum + input.shardUsers, 0) !== inputs[0].sourceUniqueUsers) throw new Error("Immutable user-id shard sizes do not reconcile");
    const requiresMembershipReconciliation =
      inputs[0].sourceKind === "missing-card-recovery-full-cube" ||
      inputs.every((input) => Number.isSafeInteger(input.shardMembershipRows)) &&
      Number.isSafeInteger(inputs[0].sourceMembershipRows);
    if (requiresMembershipReconciliation) {
      const expectedMembershipRows = inputs[0].sourceKind === "missing-card-recovery-full-cube"
        ? inputs[0].selectedMembershipRows
        : inputs[0].sourceMembershipRows;
      if (inputs.reduce((sum, input) => sum + input.shardMembershipRows, 0) !== expectedMembershipRows) {
        throw new Error("Immutable user-id shard membership rows do not reconcile");
      }
    }
    return;
  }

  const ordered = [...inputs].sort((left, right) => left.windowStartInclusive.localeCompare(right.windowStartInclusive));
  if (ordered[0].windowStartInclusive !== metadata.merged?.windowStartInclusive) throw new Error("Time shards do not start at the merged source boundary");
  if (nextDay(ordered.at(-1).windowEndInclusive) !== metadata.merged?.windowEndExclusive) throw new Error("Time shards do not end at the merged source boundary");
  for (const input of ordered) {
    if (input.userShard?.index !== 0 || input.userShard?.count !== 1) throw new Error("Time and user-id sharding cannot be mixed");
    if (input.shardUsers !== input.sourceUniqueUsers) throw new Error("A time shard must include every source user for its window");
    if (input.sourceKind === "missing-card-recovery-full-cube" ||
        Number.isSafeInteger(input.shardMembershipRows) && Number.isSafeInteger(input.sourceMembershipRows)) {
      const expectedMembershipRows = input.sourceKind === "missing-card-recovery-full-cube"
        ? input.selectedMembershipRows
        : input.sourceMembershipRows;
      if (input.shardMembershipRows !== expectedMembershipRows) {
        throw new Error("A time shard must include every selected source membership row");
      }
    }
  }
  for (let index = 1; index < ordered.length; index += 1) {
    if (nextDay(ordered[index - 1].windowEndInclusive) !== ordered[index].windowStartInclusive) throw new Error("Time shards must be contiguous and non-overlapping");
  }
}

function validateRecoveryActionInput(input, expectedTemplateSha256) {
  if (input.rendererSchema !== "ff-rfi-missing-card-recovery-render-v1") {
    throw new Error(`Recovery action shard renderer schema mismatch: ${input.queryJobId}`);
  }
  if (input.rendererMode !== "full-cube") {
    throw new Error(`Recovery action shard renderer mode mismatch: ${input.queryJobId}`);
  }
  for (const [value, label] of [
    [input.rendererMetadataSha256, "renderer metadata"],
    [input.receiptSha256, "receipt"],
    [input.querySha256, "rendered query"],
    [input.templateSha256, "query template"],
    [input.parserGrammarsSha256, "parser grammar"],
    [input.selectedMembershipKeysSha256, "selected membership keys"],
  ]) {
    if (!/^[a-f0-9]{64}$/.test(String(value || ""))) {
      throw new Error(`Recovery action shard ${label} hash is invalid: ${input.queryJobId}`);
    }
  }
  if (input.templateSha256 !== expectedTemplateSha256) {
    throw new Error(`Recovery action shard uses a stale extraction SQL template: ${input.queryJobId}`);
  }
  if (input.receiptRowCount !== input.rows || !Number.isSafeInteger(input.receiptBytes) || input.receiptBytes <= 0) {
    throw new Error(`Recovery action shard receipt does not reconcile: ${input.queryJobId}`);
  }
  if (input.sourceTable !== RECOVERY_SOURCE_TABLES[0] ||
      JSON.stringify(input.sourceTables) !== JSON.stringify(RECOVERY_SOURCE_TABLES)) {
    throw new Error(`Recovery action shard source tables mismatch: ${input.queryJobId}`);
  }
  if (input.handClassMode !== "structured-or-validated-raw-when-empty-v1") {
    throw new Error(`Recovery action shard hand-class mode mismatch: ${input.queryJobId}`);
  }
  if (input.recoveryPredicate !== "latest structured_hand_class = ''" ||
      input.recoveryIsDisjoint !== true) {
    throw new Error(`Recovery action shard disjoint predicate mismatch: ${input.queryJobId}`);
  }
  assert.deepEqual(input.rawJoin, RECOVERY_RAW_JOIN, `Recovery action shard exact-key join mismatch: ${input.queryJobId}`);
  assert.deepEqual(
    input.parserNetworks,
    RECOVERY_PARSER_NETWORKS,
    `Recovery action shard parser networks mismatch: ${input.queryJobId}`,
  );
  assert.deepEqual(
    Object.keys(input.selectedCohortCounts || {}),
    ["l3top"],
    `Recovery action shard must select exactly l3top: ${input.queryJobId}`,
  );
  if (input.selectedMembershipRows !== input.selectedCohortCounts.l3top ||
      input.selectedUniqueUsers <= 0 ||
      input.sourceMembershipRows < input.selectedMembershipRows) {
    throw new Error(`Recovery action shard selected membership mismatch: ${input.queryJobId}`);
  }
  const validation = input.validation || {};
  if (validation.schema !== "ff-rfi-missing-card-recovery-validation-v1") {
    throw new Error(`Recovery action shard has no mandatory validation manifest: ${input.queryJobId}`);
  }
  for (const [value, label] of [
    [validation.manifestSha256, "manifest"],
    [validation.rendererMetadataSha256, "renderer metadata"],
    [validation.renderedSqlSha256, "rendered SQL"],
    [validation.queryTemplateSha256, "query template"],
    [validation.resultSha256, "result"],
    [validation.receiptSha256, "receipt"],
  ]) {
    if (!/^[a-f0-9]{64}$/.test(String(value || ""))) {
      throw new Error(`Recovery validation ${label} hash is invalid: ${input.queryJobId}`);
    }
  }
  if (validation.queryTemplateSha256 !== expectedTemplateSha256 ||
      !/^(?:mcp_ch_job_[a-f0-9]{32}|sync:[a-f0-9]{64})$/.test(String(validation.queryJobId || ""))) {
    throw new Error(`Recovery validation execution identity mismatch: ${input.queryJobId}`);
  }
  if (String(validation.queryJobId).startsWith("sync:")) {
    if (validation.queryExecutionMode !== "sync" ||
        validation.receiptSchema !== "ff-rfi-card-parser-validation-receipt-v1") {
      throw new Error(`Recovery validation sync receipt identity mismatch: ${input.queryJobId}`);
    }
  } else if (validation.queryExecutionMode !== "async") {
    throw new Error(`Recovery validation async receipt identity mismatch: ${input.queryJobId}`);
  }
  assert.deepEqual(validation.window, {
    startInclusive: "2026-07-01T00:00:00Z",
    endExclusive: "2026-07-02T00:00:00Z",
    semantics: "half-open-utc",
  }, `Recovery validation window mismatch: ${input.queryJobId}`);
  assert.deepEqual(
    Object.keys(validation.networks || {}).sort(),
    [...RECOVERY_PARSER_NETWORKS].sort(),
    `Recovery validation network coverage mismatch: ${input.queryJobId}`,
  );
  for (const network of RECOVERY_PARSER_NETWORKS) {
    const counters = validation.networks[network] || {};
    if (!(Number(counters.trackerKnownWithRaw) > 0) ||
        Number(counters.classFailures) !== 0 ||
        Number(counters.classMatches) !== Number(counters.trackerKnownWithRaw) ||
        Number(counters.matchPctTrackerKnown) !== 100 ||
        Number(counters.validationPassed) !== 1) {
      throw new Error(`Recovery validation counters failed for ${network}: ${input.queryJobId}`);
    }
  }
  if (!(Number(validation.networks.iPoker.trackerMissingRecovered) > 0)) {
    throw new Error(`Recovery validation recovered no iPoker cards: ${input.queryJobId}`);
  }
  assert.deepEqual(input.privacy, {
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  }, `Recovery action shard privacy boundary mismatch: ${input.queryJobId}`);
}

function validateReplacementActionMetadata(metadata, sourceHash) {
  if (metadata.strategy !== "exact-same-window-l3top-replacement-with-l3-delta" ||
      metadata.replacedCohort !== "l3top" ||
      metadata.deltaAppliedCohort !== "l3") {
    throw new Error("Unexpected recovery cohort replacement strategy");
  }
  if (metadata.membership?.subsetProof?.l3topIsSubsetOfL3 !== true) {
    throw new Error("Recovery replacement has no l3top subset-of-l3 proof");
  }
  const structured = metadata.sourceMerges?.structured;
  const recovery = metadata.sourceMerges?.recovery;
  if (structured?.schema !== "ff-rfi-field-action-merge-v1" ||
      recovery?.schema !== "ff-rfi-field-action-merge-v1" ||
      recovery?.sourceKind !== "missing-card-recovery-full-cube") {
    throw new Error("Recovery replacement source merge provenance is incomplete");
  }
  validateActionSourceShards(structured);
  validateActionSourceShards(recovery);
  const expectedInputs = [...structured.inputs, ...recovery.inputs].map((input) => input.queryJobId);
  assert.deepEqual(
    (metadata.inputs || []).map((input) => input.queryJobId),
    expectedInputs,
    "Recovery replacement flattened source executions drift",
  );
  if (structured.merged?.windowStartInclusive !== recovery.merged?.windowStartInclusive ||
      structured.merged?.windowEndExclusive !== recovery.merged?.windowEndExclusive ||
      metadata.window?.startInclusive !== structured.merged?.windowStartInclusive ||
      metadata.window?.endExclusive !== structured.merged?.windowEndExclusive) {
    throw new Error("Recovery replacement source windows do not match exactly");
  }
  const replacement = metadata.replacement || {};
  if (replacement.l3top?.recoveryDominatesExactly !== true ||
      replacement.l3top?.recoveryProjectionSha256 !== replacement.l3top?.finalProjectionSha256) {
    throw new Error("Recovery l3top rows do not dominate final output exactly");
  }
  if (replacement.l3Delta?.exactCells !== 9_126 ||
      replacement.l3Delta?.stateCount !== 54 ||
      replacement.l3Delta?.nonnegativePerCell !== true ||
      replacement.l3Delta?.appliedExactly !== true ||
      replacement.l3Delta?.eligibleCoverageChanged !== false) {
    throw new Error("Recovery whole-l3 delta proof is incomplete");
  }
  for (const value of Object.values(replacement.l3Delta?.counters || {})) {
    if (!Number.isSafeInteger(Number(value)) || Number(value) < 0) {
      throw new Error("Recovery whole-l3 delta counters must be nonnegative integers");
    }
  }
  for (const cohort of ["l2", "l1"]) {
    const preserved = replacement.preserved?.[cohort];
    if (preserved?.exact !== true ||
        preserved.sourceProjectionSha256 !== preserved.finalProjectionSha256) {
      throw new Error(`${cohort} was not preserved exactly during recovery replacement`);
    }
  }
  if (metadata.merged?.rows !== 36_504 ||
      metadata.merged?.cube?.stateCount !== 216 ||
      metadata.merged?.cube?.handClassesPerState !== 169 ||
      metadata.merged?.cube?.coverageReconciled !== true) {
    throw new Error("Recovery replacement final 36,504-row cube proof is incomplete");
  }
  if (metadata.merged?.sha256 !== sourceHash) {
    throw new Error("Recovery replacement metadata SHA-256 does not match --source");
  }
  assert.deepEqual(metadata.privacy, {
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  }, "Recovery replacement privacy boundary mismatch");
}

function requireHex64(value, label) {
  if (!/^[a-f0-9]{64}$/.test(String(value || ""))) {
    throw new Error(`${label} SHA-256 is invalid`);
  }
  return value;
}

function validateAggregateOnlyPrivacy(value, label) {
  assert.deepEqual(value, {
    aggregateOnly: true,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  }, `${label} privacy boundary mismatch`);
}

function validateSafeNovelPrivacy(value, label) {
  assert.deepEqual(value, {
    aggregateOnly: true,
    noRawHandHistories: true,
    noPlayerLevelRows: true,
    noUserIds: true,
  }, `${label} safe aggregate privacy boundary mismatch`);
}

function isNovelInput(input) {
  return NOVEL_INPUT_SOURCE_KINDS.includes(input?.sourceKind);
}

function validIsoTimestamp(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
    String(value || ""),
  )) return false;
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp);
}

function validateExactCounterObject(value, label, { novelRaw = false } = {}) {
  assert.deepEqual(
    Object.keys(value || {}).sort(),
    [...ACTION_COUNTER_NAMES].sort(),
    `${label} counter keys drift`,
  );
  for (const counter of ACTION_COUNTER_NAMES) {
    if (!Number.isSafeInteger(value[counter]) || value[counter] < 0) {
      throw new Error(`${label} ${counter} must be a nonnegative safe integer`);
    }
  }
  if (value.raises_total !== value.regular_raise + value.open_shove ||
      value.opportunities !== value.raises_total + value.limp + value.fold_other ||
      value.open_shove !== value.shove_allin_flag + value.shove_effective_amount_only ||
      value.normal_three_bb_as_shove !== 0 ||
      (novelRaw && value.non_exact_r_effective_allin !== 0)) {
    throw new Error(`${label} counter partitions do not reconcile exactly`);
  }
}

function validateNovelPublicationGate(value, label) {
  const fields = [
    "raw_keys",
    "exact_id_match_keys",
    "nominal_novel_keys",
    "normalized_time_eligible_keys",
    "publication_eligible_keys",
  ];
  for (const field of fields) {
    if (!Number.isSafeInteger(value?.[field]) || value[field] < 0) {
      throw new Error(`${label} ${field} is not a nonnegative safe integer`);
    }
  }
  if (value.raw_keys !== value.exact_id_match_keys + value.nominal_novel_keys ||
      value.publication_eligible_keys > value.normalized_time_eligible_keys ||
      value.normalized_time_eligible_keys > value.nominal_novel_keys) {
    throw new Error(`${label} publication-gate counts do not reconcile`);
  }
}

function validateNovelRawInput(
  input,
  expectedTemplateSha256,
  window,
  plannedNetworks,
  parserValidationHashes,
) {
  assert.deepEqual(
    Object.keys(input || {}).sort(),
    [...SAFE_NOVEL_INPUT_KEYS].sort(),
    `Novel raw-HH safe execution projection keys drift: ${input?.queryJobId || "missing"}`,
  );
  if (!isNovelInput(input) ||
      !plannedNetworks.includes(input.network)) {
    throw new Error(`Novel raw-HH input source/network drift: ${input.queryJobId}`);
  }
  for (const [hash, label] of [
    [input.rendererMetadataSha256, "renderer metadata"],
    [input.receiptSha256, "receipt"],
    [input.querySha256, "rendered query"],
    [input.resultSha256, "result"],
    [input.templateSha256, "query template"],
    [input.parserTemplateSha256, "parser template"],
    [input.parserValidationSha256, "parser validation"],
    [input.userShard?.userIdsSha256, "user shard"],
  ]) requireHex64(hash, `Novel raw-HH ${label}`);
  if (input.templateSha256 !== expectedTemplateSha256) {
    throw new Error(`Novel raw-HH input uses a stale extraction SQL template: ${input.queryJobId}`);
  }
  if (!parserValidationHashes.includes(input.parserValidationSha256)) {
    throw new Error(`Novel raw-HH input parser validation is not bound to its source manifest: ${input.queryJobId}`);
  }
  const executionMode = sourceExecutionMode(
    input.queryJobId,
    input.querySha256,
    /^mcp_ch_job_[a-f0-9]{32,}$/,
    "Novel raw-HH input",
  );
  if (executionMode !== "async" || input.executionMode !== "async") {
    throw new Error(`Novel raw-HH input execution mode drift: ${input.queryJobId}`);
  }
  if (!validIsoTimestamp(input.startedAt) ||
      !validIsoTimestamp(input.finishedAt) ||
      input.startedAt > input.finishedAt ||
      input.finishedAt < window.endExclusive) {
    throw new Error(`Novel raw-HH execution is not a closed-window as-of receipt: ${input.queryJobId}`);
  }
  if (!Number.isSafeInteger(input.resultRows) || input.resultRows < 0 ||
      !Number.isSafeInteger(input.resultBytes) || input.resultBytes <= 0 ||
      !Number.isSafeInteger(input.observedStates) || input.observedStates < 0 ||
      input.observedStates > 54 ||
      !Number.isSafeInteger(input.observedCells) || input.observedCells < 0 ||
      input.observedCells > 9_126 ||
      input.resultRows !== input.observedCells) {
    throw new Error(`Novel raw-HH result dimensions drift: ${input.queryJobId}`);
  }
  if (!Number.isSafeInteger(input.userShard?.index) || input.userShard.index < 0 ||
      !Number.isSafeInteger(input.userShard?.count) || input.userShard.count <= 0 ||
      input.userShard.index >= input.userShard.count ||
      !Number.isSafeInteger(input.userShard?.users) || input.userShard.users <= 0) {
    throw new Error(`Novel raw-HH immutable user shard is invalid: ${input.queryJobId}`);
  }
  if (input.windowStartInclusive !== window.startInclusive ||
      input.windowEndExclusive !== window.endExclusive) {
    throw new Error(`Novel raw-HH input window drift: ${input.queryJobId}`);
  }
  validateNovelPublicationGate(input.publicationGate, `Novel raw-HH ${input.queryJobId}`);
  validateSafeNovelPrivacy(input.privacy, `Novel raw-HH ${input.queryJobId}`);
}

function validateNovelSupplementSource(
  source,
  window,
  membership,
  rawTemplateSha256,
  coinPartyTemplateSha256,
  coinPartyParserImplementationSha256,
) {
  const direct = source?.schema === DIRECT_NOVEL_SUPPLEMENT_SCHEMA;
  const composed = source?.schema === COMPOSED_NOVEL_SUPPLEMENT_SCHEMA;
  if ((!direct && !composed) ||
      source.sourceKind !== NOVEL_RAW_SOURCE_KIND ||
      source.strategy !== (direct
        ? DIRECT_NOVEL_SUPPLEMENT_STRATEGY
        : COMPOSED_NOVEL_SUPPLEMENT_STRATEGY)) {
    throw new Error("Unexpected novel raw-HH supplement source contract");
  }
  assert.deepEqual(
    Object.keys(source).sort(),
    [
      "schema", "sourceKind", "strategy", "manifestSha256", "aggregate",
      "plan", "parserValidation", "inputs", "densification",
    ].sort(),
    "Novel supplement source keys drift",
  );
  assert.deepEqual(
    Object.keys(source.aggregate || {}).sort(),
    ["sha256", "bytes", "rows"].sort(),
    "Novel supplement aggregate keys drift",
  );
  requireHex64(source.manifestSha256, "Novel supplement manifest");
  requireHex64(source.aggregate?.sha256, "Novel supplement aggregate");
  if (!Number.isSafeInteger(source.aggregate?.bytes) || source.aggregate.bytes <= 0 ||
      source.aggregate?.rows !== 9_126) {
    throw new Error("Novel supplement aggregate dimensions are incomplete");
  }

  const plan = source.plan || {};
  const parser = source.parserValidation || {};
  const inputs = source.inputs || [];
  const dedicatedCoinParty = direct &&
    plan.schema === "ff-rfi-coin-party-publication-run-plan-v2";
  const immutableV5 = direct &&
    plan.schema === "ff-rfi-publication-eligible-full-v5-run-plan";
  const plannedNetworks = plan.networks;
  if (plan.sourceSetComplete !== true ||
      plan.exactDisjointUserUnion !== true ||
      plan.targetFilter !== false ||
      !Array.isArray(plannedNetworks) ||
      plannedNetworks.length < 1 ||
      new Set(plannedNetworks).size !== plannedNetworks.length ||
      plan.expectedExecutions !== inputs.length ||
      !inputs.length) {
    throw new Error("Novel supplement approved source-set plan is incomplete");
  }
  if (parser.gatePassed !== true ||
      parser.exactMismatchTolerance !== 0 ||
      !Array.isArray(parser.networks) ||
      [...parser.networks].sort().join("|") !== [...plannedNetworks].sort().join("|")) {
    throw new Error("Novel supplement parser-validation gate is incomplete");
  }
  requireHex64(parser.sha256, "Novel supplement parser validation");
  const parserValidationHashes = direct
    ? [parser.sha256]
    : parser.componentSha256 || [];

  if (dedicatedCoinParty) {
    assert.deepEqual(
      Object.keys(plan).sort(),
      [
        "schema", "sha256", "sourceSetComplete", "networks",
        "userShardsPerNetwork", "expectedExecutions",
        "exactDisjointUserUnion", "targetFilter",
      ].sort(),
      "Dedicated Coin/Party supplement plan keys drift",
    );
    assert.deepEqual(
      Object.keys(parser).sort(),
      [
        "schema", "sha256", "gatePassed", "networks",
        "exactMismatchTolerance", "validatedAt", "binding", "source",
      ].sort(),
      "Dedicated Coin/Party supplement parser keys drift",
    );
    if (parser.schema !== "ff-rfi-coin-party-parser-validation-v2" ||
        !plannedNetworks.length ||
        plannedNetworks.some((network) => (
          !COIN_PARTY_PUBLICATION_NETWORKS.includes(network)
        )) ||
        plan.userShardsPerNetwork !==
          COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork ||
        plan.expectedExecutions !==
          plannedNetworks.length *
            COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork ||
        membership.subsetProof?.l3topMembers !==
          COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers) {
      throw new Error("Dedicated Coin/Party supplement plan/parser schema is not approved");
    }
    assert.deepEqual(
      plannedNetworks,
      COIN_PARTY_PUBLICATION_NETWORKS.filter((network) => (
        plannedNetworks.includes(network)
      )),
      "Dedicated Coin/Party supplement networks drift",
    );
    assert.deepEqual(
      parser.networks,
      plannedNetworks,
      "Dedicated Coin/Party parser networks drift",
    );
    requireHex64(plan.sha256, "Dedicated Coin/Party supplement plan");
    assert.deepEqual(
      Object.keys(parser.binding || {}).sort(),
      [
        "parserTemplateSha256", "parserImplementationSha256",
        "grammarSha256", "membershipSha256", "userIdsSha256", "window",
      ].sort(),
      "Dedicated Coin/Party parser binding keys drift",
    );
    for (const [hash, label] of [
      [parser.binding.parserTemplateSha256, "parser template"],
      [parser.binding.parserImplementationSha256, "parser implementation"],
      [parser.binding.grammarSha256, "grammar"],
      [parser.binding.membershipSha256, "membership"],
      [parser.binding.userIdsSha256, "selected users"],
    ]) requireHex64(hash, `Dedicated Coin/Party parser ${label}`);
    if (parser.binding.parserTemplateSha256 !==
          COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding
            .parserTemplateSha256 ||
        parser.binding.parserImplementationSha256 !==
          coinPartyParserImplementationSha256 ||
        parser.binding.grammarSha256 !== coinPartyGrammarContract().sha256 ||
        parser.binding.membershipSha256 !== membership.sha256 ||
        parser.binding.membershipSha256 !==
          COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.membershipSha256 ||
        parser.binding.userIdsSha256 !==
          COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256 ||
        !validIsoTimestamp(parser.validatedAt) ||
        Date.parse(parser.validatedAt) < Date.parse(window.endExclusive)) {
      throw new Error("Dedicated Coin/Party supplement parser binding is stale");
    }
    assert.deepEqual(
      parser.binding.window,
      [...COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window],
      "Dedicated Coin/Party parser window binding drift",
    );
    assert.deepEqual(
      Object.keys(parser.source || {}).sort(),
      [
        "inputSha256", "inputBytes", "rows", "uniqueUsers",
        "firstObservedAt", "lastObservedAt",
        "rawHandHistoriesPublished", "personalIdentifiersPublished",
      ].sort(),
      "Dedicated Coin/Party parser source keys drift",
    );
    assert.deepEqual(
      parser.source,
      {
        ...COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.source,
        rawHandHistoriesPublished: false,
        personalIdentifiersPublished: false,
      },
      "Dedicated Coin/Party parser source proof drift",
    );
  } else if (immutableV5) {
    assert.deepEqual(
      Object.keys(plan).sort(),
      [
        "schema", "sha256", "immutableReceiptSha256",
        "sourceSetComplete", "networks",
        "userShardsPerNetwork", "expectedExecutions",
        "exactDisjointUserUnion", "targetFilter",
      ].sort(),
      "Direct novel supplement plan keys drift",
    );
    assert.deepEqual(
      Object.keys(parser).sort(),
      [
        "schema", "sha256", "gatePassed", "networks",
        "exactMismatchTolerance", "validatedAt", "binding",
      ].sort(),
      "Direct novel supplement parser keys drift",
    );
    if (plan.schema !== "ff-rfi-publication-eligible-full-v5-run-plan" ||
        parser.schema !== "ff-rfi-raw-hh-parser-validation-v2" ||
        !Number.isSafeInteger(plan.userShardsPerNetwork) ||
        plan.userShardsPerNetwork <= 0) {
      throw new Error("Direct novel supplement plan/parser schema is not approved");
    }
    requireHex64(plan.sha256, "Direct novel supplement plan");
    requireHex64(
      plan.immutableReceiptSha256,
      "Direct novel supplement immutable plan receipt",
    );
    assert.deepEqual(
      Object.keys(parser.binding || {}).sort(),
      [
        "planSha256", "parserTemplateSha256", "parserBodySha256",
        "membershipSha256", "membershipKeysSha256",
        "selectedUserIdsSha256", "window",
      ].sort(),
      "Direct novel supplement parser binding keys drift",
    );
    for (const [hash, label] of [
      [parser.binding.planSha256, "plan"],
      [parser.binding.parserTemplateSha256, "parser template"],
      [parser.binding.parserBodySha256, "parser body"],
      [parser.binding.membershipSha256, "membership"],
      [parser.binding.membershipKeysSha256, "membership keys"],
      [parser.binding.selectedUserIdsSha256, "selected users"],
    ]) requireHex64(hash, `Direct novel supplement parser ${label}`);
    if (parser.binding.planSha256 !== plan.sha256 ||
        parser.binding.membershipSha256 !== membership.sha256 ||
        parser.binding.membershipKeysSha256 !== membership.keysSha256 ||
        !validIsoTimestamp(parser.validatedAt) ||
        Date.parse(parser.validatedAt) < Date.parse(window.endExclusive)) {
      throw new Error("Direct novel supplement parser binding is stale");
    }
    assert.deepEqual(
      parser.binding.window,
      window,
      "Direct novel supplement parser window binding drift",
    );
  } else if (direct) {
    throw new Error("Direct novel supplement plan/parser schema is not approved");
  } else {
    assert.deepEqual(
      Object.keys(plan).sort(),
      [
        "schema", "sourceSetComplete", "networks", "userShardsPerNetwork",
        "expectedExecutions", "exactDisjointUserUnion",
        "disjointNetworkSets", "targetFilter", "componentManifestSha256",
      ].sort(),
      "Composed novel supplement plan keys drift",
    );
    assert.deepEqual(
      Object.keys(parser).sort(),
      [
        "schema", "sha256", "gatePassed", "networks",
        "exactMismatchTolerance", "componentSha256",
      ].sort(),
      "Composed novel supplement parser keys drift",
    );
    if (plan.schema !== "ff-rfi-field-action-novel-raw-supplement-composition-plan-v1" ||
        parser.schema !== "ff-rfi-field-action-novel-raw-parser-validation-composition-v1" ||
        plan.userShardsPerNetwork !== null ||
        plan.disjointNetworkSets !== true ||
        !Array.isArray(plan.componentManifestSha256) ||
        plan.componentManifestSha256.length < 2 ||
        !Array.isArray(parser.componentSha256) ||
        parser.componentSha256.length !== plan.componentManifestSha256.length) {
      throw new Error("Composed novel supplement component provenance is incomplete");
    }
    for (const hash of plan.componentManifestSha256) {
      requireHex64(hash, "Composed novel supplement component manifest");
    }
    for (const hash of parser.componentSha256) {
      requireHex64(hash, "Composed novel supplement parser component");
    }
    if (new Set(plan.componentManifestSha256).size !== plan.componentManifestSha256.length ||
        new Set(parser.componentSha256).size !== parser.componentSha256.length) {
      throw new Error("Composed novel supplement component hashes must be unique");
    }
  }

  const jobs = new Set();
  const byNetwork = new Map(plannedNetworks.map((network) => [network, []]));
  for (const input of inputs) {
    validateNovelRawInput(
      input,
      input.sourceKind === "coin-party-publication-v2"
        ? coinPartyTemplateSha256
        : rawTemplateSha256,
      window,
      plannedNetworks,
      parserValidationHashes,
    );
    if (jobs.has(input.queryJobId)) throw new Error("Novel supplement query jobs are not unique");
    jobs.add(input.queryJobId);
    byNetwork.get(input.network).push(input);
  }
  const inputKinds = new Set(inputs.map((input) => input.sourceKind));
  if (dedicatedCoinParty) {
    if (inputKinds.size !== 1 || !inputKinds.has("coin-party-publication-v2")) {
      throw new Error("Dedicated Coin/Party supplement input source kind does not match its plan");
    }
    if (inputs.some((input) => (
      input.parserTemplateSha256 !== parser.binding.parserTemplateSha256
    ))) {
      throw new Error("Dedicated Coin/Party supplement parser template binding drift");
    }
  } else if (immutableV5) {
    if (inputKinds.size !== 1 || !inputKinds.has("immutable-plan-raw-hh-v5")) {
      throw new Error("Direct novel supplement input source kind does not match its plan");
    }
    if (inputs.some((input) => (
      input.parserTemplateSha256 !== parser.binding.parserTemplateSha256
    ))) {
      throw new Error("Direct novel supplement parser template binding drift");
    }
  } else if (inputKinds.size !== 2 ||
      !NOVEL_INPUT_SOURCE_KINDS.every((kind) => inputKinds.has(kind))) {
    throw new Error("Composed novel supplement must retain both approved source contracts");
  }
  for (const [network, networkInputs] of byNetwork) {
    if (!networkInputs.length) throw new Error(`Novel supplement has no inputs for ${network}`);
    const shardCount = networkInputs[0].userShard.count;
    if (direct && shardCount !== plan.userShardsPerNetwork) {
      throw new Error(`Novel supplement shard count drift for ${network}`);
    }
    if (networkInputs.length !== shardCount ||
        networkInputs.some((input) => input.userShard.count !== shardCount) ||
        networkInputs.map((input) => input.userShard.index)
          .sort((left, right) => left - right)
          .join("|") !== Array.from({ length: shardCount }, (_, index) => index).join("|") ||
        new Set(networkInputs.map((input) => input.userShard.userIdsSha256)).size !== shardCount ||
        networkInputs.reduce((sum, input) => sum + input.userShard.users, 0) !==
          membership.subsetProof.l3topMembers) {
      throw new Error(`Novel supplement immutable user union drift for ${network}`);
    }
  }
  if (dedicatedCoinParty) {
    for (const network of plannedNetworks) {
      const networkInputs = byNetwork.get(network);
      const totals = Object.fromEntries([
        "raw_keys",
        "exact_id_match_keys",
        "nominal_novel_keys",
        "normalized_time_eligible_keys",
        "publication_eligible_keys",
      ].map((field) => [
        field,
        networkInputs.reduce(
          (sum, input) => sum + input.publicationGate[field],
          0,
        ),
      ]));
      const expected =
        COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.strongGateTotals[network];
      assert.deepEqual(
        totals,
        {
          raw_keys: expected.rawKeys,
          exact_id_match_keys: expected.exactIdMatchKeys,
          nominal_novel_keys: expected.nominalNovelKeys,
          normalized_time_eligible_keys: expected.normalizedTimeEligibleKeys,
          publication_eligible_keys: expected.publicationEligibleKeys,
        },
        `Dedicated Coin/Party frozen gate totals drift for ${network}`,
      );
    }
  }

  const densification = source.densification || {};
  assert.deepEqual(
    Object.keys(densification).sort(),
    [
      "observedInputRows", "observedInputCells", "canonicalOutputCells",
      "absentDimensionsMaterializedAsObservedZero", "smoothingApplied",
      "modeledValuesApplied",
    ].sort(),
    "Novel supplement densification keys drift",
  );
  if (!Number.isSafeInteger(densification.observedInputRows) ||
      densification.observedInputRows < 0 ||
      densification.observedInputRows !== inputs.reduce((sum, input) => sum + input.resultRows, 0) ||
      densification.observedInputCells !== inputs.reduce((sum, input) => sum + input.observedCells, 0) ||
      densification.canonicalOutputCells !== 9_126 ||
      densification.absentDimensionsMaterializedAsObservedZero !== true ||
      densification.smoothingApplied !== false ||
      densification.modeledValuesApplied !== false) {
    throw new Error("Novel supplement densification/no-smoothing proof is incomplete");
  }
}

function validateSafeRecoveryValidation(validation, expectedTemplateSha256, window) {
  assert.deepEqual(
    Object.keys(validation || {}).sort(),
    [...SAFE_RECOVERY_VALIDATION_KEYS].sort(),
    "Safe recovery validation keys drift",
  );
  if (validation.schema !== "ff-rfi-missing-card-recovery-validation-v1") {
    throw new Error("Safe recovery validation schema drift");
  }
  for (const [value, label] of [
    [validation.manifestSha256, "manifest"],
    [validation.rendererMetadataSha256, "renderer metadata"],
    [validation.renderedSqlSha256, "rendered SQL"],
    [validation.queryTemplateSha256, "query template"],
    [validation.resultSha256, "result"],
    [validation.receiptSha256, "receipt"],
  ]) requireHex64(value, `Safe recovery validation ${label}`);
  if (validation.queryTemplateSha256 !== expectedTemplateSha256) {
    throw new Error("Safe recovery validation query template drift");
  }
  const executionMode = sourceExecutionMode(
    validation.queryJobId,
    validation.renderedSqlSha256,
    /^mcp_ch_job_[a-f0-9]{32,}$/,
    "Safe recovery validation",
  );
  if (validation.queryExecutionMode !== executionMode ||
      !validIsoTimestamp(validation.startedAt) ||
      !validIsoTimestamp(validation.finishedAt) ||
      Date.parse(validation.startedAt) > Date.parse(validation.finishedAt) ||
      Date.parse(validation.finishedAt) < Date.parse(window.endExclusive)) {
    throw new Error("Safe recovery validation execution receipt is stale or inconsistent");
  }
  if (!Number.isSafeInteger(validation.resultRows) ||
      validation.resultRows !== RECOVERY_PARSER_NETWORKS.length ||
      !Number.isSafeInteger(validation.resultBytes) ||
      validation.resultBytes <= 0) {
    throw new Error("Safe recovery validation result dimensions drift");
  }
  assert.deepEqual(validation.window, {
    startInclusive: "2026-07-01T00:00:00Z",
    endExclusive: "2026-07-02T00:00:00Z",
    semantics: "half-open-utc",
  }, "Safe recovery validation window drift");
  assert.deepEqual(
    Object.keys(validation.networks || {}).sort(),
    [...RECOVERY_PARSER_NETWORKS].sort(),
    "Safe recovery validation network coverage drift",
  );
  const calculatedTotals = Object.fromEntries(
    SAFE_RECOVERY_TOTAL_KEYS.map((counter) => [counter, 0]),
  );
  for (const network of RECOVERY_PARSER_NETWORKS) {
    const counters = validation.networks[network] || {};
    assert.deepEqual(
      Object.keys(counters).sort(),
      [...SAFE_RECOVERY_NETWORK_COUNTER_KEYS].sort(),
      `Safe recovery validation counter keys drift for ${network}`,
    );
    for (const counter of SAFE_RECOVERY_NETWORK_COUNTER_KEYS) {
      if (!Number.isSafeInteger(counters[counter]) || counters[counter] < 0) {
        throw new Error(`Safe recovery validation ${network}.${counter} is invalid`);
      }
    }
    if (counters.trackerRows <= 0 ||
        counters.trackerKnownWithRaw <= 0 ||
        counters.rawHhJoined < counters.trackerKnownWithRaw ||
        counters.parserSuccess > counters.rawHhJoined ||
        counters.classFailures !== 0 ||
        counters.classMatches !== counters.trackerKnownWithRaw ||
        counters.matchPctTrackerKnown !== 100 ||
        counters.validationPassed !== 1) {
      throw new Error(`Safe recovery parser validation failed for ${network}`);
    }
    for (const counter of SAFE_RECOVERY_TOTAL_KEYS) {
      calculatedTotals[counter] += counters[counter];
    }
  }
  if (validation.networks.iPoker.trackerMissingRecovered <= 0) {
    throw new Error("Safe recovery validation recovered no iPoker cards");
  }
  assert.deepEqual(
    Object.keys(validation.totals || {}).sort(),
    [...SAFE_RECOVERY_TOTAL_KEYS].sort(),
    "Safe recovery validation total keys drift",
  );
  assert.deepEqual(
    validation.totals,
    calculatedTotals,
    "Safe recovery validation totals do not reconcile",
  );
  validateAggregateOnlyPrivacy(validation.privacy, "Safe recovery validation");
}

function validateSafeBaseInput(
  input,
  expectedKind,
  expectedTemplateSha256,
  membership,
  window,
) {
  const expectedKeys = expectedKind === "structured-field-action"
    ? SAFE_BASE_STRUCTURED_INPUT_KEYS
    : SAFE_BASE_RECOVERY_INPUT_KEYS;
  assert.deepEqual(
    Object.keys(input || {}).sort(),
    [...expectedKeys].sort(),
    `Safe ${expectedKind} execution projection keys drift`,
  );
  if (input.sourceKind !== expectedKind) {
    throw new Error(`Safe base source kind drift: ${input.sourceKind}`);
  }
  for (const [value, label] of [
    [input.rendererMetadataSha256, "renderer metadata"],
    [input.receiptSha256, "receipt"],
    [input.querySha256, "rendered query"],
    [input.resultSha256, "result"],
    [input.templateSha256, "query template"],
    [input.userShard?.userIdsSha256, "user shard"],
    [input.membershipSha256, "membership"],
    [input.membershipKeysSha256, "membership keys"],
  ]) requireHex64(value, `Safe base ${label}`);
  if (input.templateSha256 !== expectedTemplateSha256 ||
      input.membershipSha256 !== membership.sha256 ||
      input.membershipKeysSha256 !== membership.keysSha256) {
    throw new Error(`Safe ${expectedKind} template or membership binding drift`);
  }
  const executionMode = sourceExecutionMode(
    input.queryJobId,
    input.querySha256,
    /^mcp_ch_job_[a-f0-9]{32,}$/,
    `Safe ${expectedKind}`,
  );
  if (executionMode !== "async" ||
      input.executionMode !== "async" ||
      !validIsoTimestamp(input.startedAt) ||
      !validIsoTimestamp(input.finishedAt) ||
      Date.parse(input.startedAt) > Date.parse(input.finishedAt) ||
      Date.parse(input.finishedAt) < Date.parse(window.endExclusive)) {
    throw new Error(`Safe ${expectedKind} execution receipt is stale or inconsistent`);
  }
  if (input.windowStartInclusive !== window.startInclusive ||
      input.windowEndExclusive !== window.endExclusive ||
      !Number.isSafeInteger(input.resultRows) ||
      input.resultRows <= 0 ||
      !Number.isSafeInteger(input.resultBytes) ||
      input.resultBytes <= 0) {
    throw new Error(`Safe ${expectedKind} result dimensions or window drift`);
  }
  assert.deepEqual(
    Object.keys(input.userShard || {}).sort(),
    [...SAFE_USER_SHARD_KEYS].sort(),
    `Safe ${expectedKind} user-shard keys drift`,
  );
  if (!Number.isSafeInteger(input.userShard.index) ||
      input.userShard.index < 0 ||
      !Number.isSafeInteger(input.userShard.count) ||
      input.userShard.count <= 0 ||
      input.userShard.index >= input.userShard.count ||
      !Number.isSafeInteger(input.userShard.users) ||
      input.userShard.users <= 0) {
    throw new Error(`Safe ${expectedKind} immutable user shard is invalid`);
  }
  validateAggregateOnlyPrivacy(input.privacy, `Safe ${expectedKind}`);
  if (expectedKind === "structured-field-action") {
    if (input.handClassMode !== "joined-holecards-str" ||
        input.holecardMappingSha256 !== null) {
      throw new Error("Safe structured hand-class provenance drift");
    }
    return;
  }
  if (input.recoveryIsDisjoint !== true ||
      input.recoveryPredicate !== "latest structured_hand_class = ''" ||
      input.templateSha256 !== expectedTemplateSha256) {
    throw new Error("Safe recovery disjoint-source proof drift");
  }
  requireHex64(input.parserGrammarsSha256, "Safe recovery parser grammars");
  assert.deepEqual(
    input.parserNetworks,
    RECOVERY_PARSER_NETWORKS,
    "Safe recovery parser network set drift",
  );
  assert.deepEqual(input.rawJoin, RECOVERY_RAW_JOIN, "Safe recovery exact-key join drift");
  validateSafeRecoveryValidation(input.validation, expectedTemplateSha256, window);
}

function validateSafeBaseSourceMerge(
  merge,
  expectedKind,
  expectedRows,
  expectedTemplateSha256,
  membership,
  window,
) {
  const recovery = expectedKind === "missing-card-recovery-full-cube";
  assert.deepEqual(
    Object.keys(merge || {}).sort(),
    [
      "schema", "manifestSha256", "shardStrategy",
      ...(recovery ? ["sourceKind"] : []),
      "aggregate", "inputs", "merged",
    ].sort(),
    `Safe ${expectedKind} source-merge keys drift`,
  );
  assert.deepEqual(
    Object.keys(merge?.aggregate || {}).sort(),
    ["sha256", "bytes", "rows"].sort(),
    `Safe ${expectedKind} aggregate keys drift`,
  );
  assert.deepEqual(
    Object.keys(merge?.merged || {}).sort(),
    [
      "sha256", "rows", "windowStartInclusive", "windowEndExclusive",
      "knownCards", "totals", ...(recovery ? ["cube"] : []),
    ].sort(),
    `Safe ${expectedKind} merged keys drift`,
  );
  if (merge?.schema !== "ff-rfi-field-action-merge-v1" ||
      merge.shardStrategy !== "immutable-user-id" ||
      (recovery
        ? merge.sourceKind !== expectedKind
        : merge.sourceKind !== undefined)) {
    throw new Error(`Safe ${expectedKind} source-merge provenance is incomplete`);
  }
  requireHex64(merge.manifestSha256, `Safe ${expectedKind} merge manifest`);
  requireHex64(merge.aggregate?.sha256, `Safe ${expectedKind} merge aggregate`);
  if (!Number.isSafeInteger(merge.aggregate?.bytes) || merge.aggregate.bytes <= 0 ||
      merge.aggregate.rows !== expectedRows ||
      merge.aggregate.sha256 !== merge.merged?.sha256 ||
      merge.merged?.rows !== expectedRows ||
      merge.merged?.windowStartInclusive !== window.startInclusive ||
      merge.merged?.windowEndExclusive !== window.endExclusive) {
    throw new Error(`Safe ${expectedKind} source merge drift`);
  }
  const inputs = merge.inputs || [];
  if (!inputs.length) {
    throw new Error(`Safe ${expectedKind} source merge has no executions`);
  }
  for (const input of inputs) {
    validateSafeBaseInput(
      input,
      expectedKind,
      expectedTemplateSha256,
      membership,
      window,
    );
  }
  const shardCount = inputs[0].userShard.count;
  if (inputs.length !== shardCount ||
      inputs.some((input) => input.userShard.count !== shardCount) ||
      inputs.map((input) => input.userShard.index)
        .sort((left, right) => left - right)
        .join("|") !== Array.from({ length: shardCount }, (_, index) => index).join("|") ||
      new Set(inputs.map((input) => input.userShard.userIdsSha256)).size !== shardCount ||
      new Set(inputs.map((input) => input.queryJobId)).size !== inputs.length) {
    throw new Error(`Safe ${expectedKind} immutable user union drift`);
  }
  validateExactCounterObject(merge.merged?.totals, `Safe ${expectedKind} merge`);
  const known = merge.merged?.knownCards || {};
  if (!Number.isSafeInteger(known.eligible) ||
      !Number.isSafeInteger(known.known) ||
      !Number.isSafeInteger(known.lookupMismatch) ||
      known.eligible < known.known ||
      Math.abs(known.pct - (known.eligible
        ? known.known / known.eligible * 100
        : 100)) > 0.000001) {
    throw new Error(`Safe ${expectedKind} known-card coverage drift`);
  }
  if (recovery) {
    assert.deepEqual(merge.merged?.cube, {
      stateCount: 54,
      rowCount: 9_126,
      handClassesPerState: 169,
      coverageReconciled: true,
    }, "Safe recovery cube coverage drift");
  } else if (merge.merged?.cube !== undefined) {
    throw new Error("Safe structured source merge exposed an unexpected cube");
  }
}

function validateBaseCurrentReplacement(
  baseCurrent,
  membership,
  window,
  structuredTemplateSha256,
  recoveryTemplateSha256,
) {
  assert.deepEqual(
    Object.keys(baseCurrent || {}).sort(),
    [
      "schema", "strategy", "manifestSha256", "aggregate",
      "sourceMerges", "replacement",
    ].sort(),
    "Current supplement base keys drift",
  );
  assert.deepEqual(
    Object.keys(baseCurrent?.aggregate || {}).sort(),
    ["sha256", "bytes", "rows"].sort(),
    "Current supplement base aggregate keys drift",
  );
  assert.deepEqual(
    Object.keys(baseCurrent?.sourceMerges || {}).sort(),
    ["structured", "recovery"].sort(),
    "Current supplement base source-merge keys drift",
  );
  if (baseCurrent?.schema !== "ff-rfi-field-action-cohort-replacement-v1" ||
      baseCurrent.strategy !== "exact-same-window-l3top-replacement-with-l3-delta") {
    throw new Error("Current supplement base is not the approved recovery replacement");
  }
  requireHex64(baseCurrent.manifestSha256, "Current supplement base manifest");
  requireHex64(baseCurrent.aggregate?.sha256, "Current supplement base aggregate");
  if (!Number.isSafeInteger(baseCurrent.aggregate?.bytes) || baseCurrent.aggregate.bytes <= 0 ||
      baseCurrent.aggregate?.rows !== 36_504) {
    throw new Error("Current supplement base aggregate dimensions are incomplete");
  }
  const structured = baseCurrent.sourceMerges?.structured;
  const recovery = baseCurrent.sourceMerges?.recovery;
  validateSafeBaseSourceMerge(
    structured,
    "structured-field-action",
    36_504,
    structuredTemplateSha256,
    membership,
    window,
  );
  validateSafeBaseSourceMerge(
    recovery,
    "missing-card-recovery-full-cube",
    9_126,
    recoveryTemplateSha256,
    membership,
    window,
  );
  const replacement = baseCurrent.replacement || {};
  if (replacement.l3top?.structuredRows !== 9_126 ||
      replacement.l3top?.recoveryRows !== 9_126 ||
      ![
        replacement.l3top.structuredProjectionSha256,
        replacement.l3top.recoveryProjectionSha256,
        replacement.l3top.finalProjectionSha256,
      ].every((hash) => /^[a-f0-9]{64}$/.test(String(hash || ""))) ||
      replacement.l3top.recoveryDominatesExactly !== true ||
      replacement.l3top.recoveryProjectionSha256 !== replacement.l3top.finalProjectionSha256) {
    throw new Error("Current supplement base l3top replacement proof is incomplete");
  }
  const delta = replacement.l3Delta || {};
  if (delta.exactCells !== 9_126 ||
      delta.stateCount !== 54 ||
      delta.nonnegativePerCell !== true ||
      delta.appliedExactly !== true ||
      delta.eligibleCoverageChanged !== false ||
      delta.knownCardDelta !== delta.counters?.opportunities) {
    throw new Error("Current supplement base l3 delta proof is incomplete");
  }
  validateExactCounterObject(delta.counters, "Current supplement base l3 delta");
  for (const cohort of ["l2", "l1"]) {
    const preserved = replacement.preserved?.[cohort] || {};
    if (preserved.rows !== 9_126 ||
        preserved.exact !== true ||
        !/^[a-f0-9]{64}$/.test(String(preserved.sourceProjectionSha256 || "")) ||
        preserved.sourceProjectionSha256 !== preserved.finalProjectionSha256) {
      throw new Error(`Current supplement base did not preserve ${cohort} exactly`);
    }
    validateExactCounterObject(
      preserved.counters,
      `Current supplement base preserved ${cohort}`,
    );
  }
  if (membership.subsetProof?.l3topIsSubsetOfL3 !== true ||
      membership.subsetProof.l3topMembers !== membership.cohortCounts?.l3top ||
      membership.subsetProof.l3Members !== membership.cohortCounts?.l3) {
    throw new Error("Current supplement membership subset proof is incomplete");
  }
}

function validateCurrentSupplementActionMetadata(
  metadata,
  sourceHash,
  structuredTemplateSha256,
  recoveryTemplateSha256,
  rawTemplateSha256,
  coinPartyTemplateSha256,
  coinPartyParserImplementationSha256,
  sourceRows,
) {
  assert.deepEqual(
    Object.keys(metadata || {}).sort(),
    [
      "schema", "strategy", "supplementedCohort", "deltaAppliedCohort",
      "window", "membership", "baseCurrent", "supplementSource", "inputs",
      "supplement", "merged", "privacy",
    ].sort(),
    "Current supplement manifest keys drift",
  );
  if (metadata.schema !== CURRENT_SUPPLEMENT_SCHEMA ||
      metadata.strategy !== CURRENT_SUPPLEMENT_STRATEGY ||
      metadata.supplementedCohort !== "l3top" ||
      metadata.deltaAppliedCohort !== "l3") {
    throw new Error("Unexpected current novel raw-HH supplement strategy");
  }
  assert.deepEqual(
    metadata.window,
    CURRENT_SUPPLEMENT_WINDOW,
    "Current supplement must use the closed UTC release snapshot",
  );
  const membership = metadata.membership || {};
  assert.deepEqual(
    Object.keys(membership).sort(),
    ["sha256", "keysSha256", "rows", "cohortCounts", "subsetProof"].sort(),
    "Current supplement membership keys drift",
  );
  assert.deepEqual(
    Object.keys(membership.cohortCounts || {}).sort(),
    [...COHORTS].sort(),
    "Current supplement cohort-count keys drift",
  );
  assert.deepEqual(
    Object.keys(membership.subsetProof || {}).sort(),
    ["l3topMembers", "l3Members", "l3topIsSubsetOfL3"].sort(),
    "Current supplement subset-proof keys drift",
  );
  for (const [hash, label] of [
    [membership.sha256, "Current supplement membership"],
    [membership.keysSha256, "Current supplement membership keys"],
  ]) requireHex64(hash, label);
  if (!Number.isSafeInteger(membership.rows) || membership.rows <= 0 ||
      Object.keys(membership.cohortCounts || {}).join("|") !== COHORTS.join("|") ||
      Object.values(membership.cohortCounts).some((count) => (
        !Number.isSafeInteger(count) || count <= 0
      )) ||
      Object.values(membership.cohortCounts).reduce((sum, count) => sum + count, 0) !==
        membership.rows) {
    throw new Error("Current supplement membership counts do not reconcile");
  }

  validateBaseCurrentReplacement(
    metadata.baseCurrent,
    membership,
    metadata.window,
    structuredTemplateSha256,
    recoveryTemplateSha256,
  );
  validateNovelSupplementSource(
    metadata.supplementSource,
    metadata.window,
    membership,
    rawTemplateSha256,
    coinPartyTemplateSha256,
    coinPartyParserImplementationSha256,
  );
  const baseInputs = [
    ...metadata.baseCurrent.sourceMerges.structured.inputs,
    ...metadata.baseCurrent.sourceMerges.recovery.inputs,
  ];
  assert.deepEqual(
    metadata.inputs,
    [...baseInputs, ...metadata.supplementSource.inputs],
    "Current supplement flattened nested execution provenance drift",
  );

  const top = metadata.supplement?.l3topAdditive || {};
  const delta = metadata.supplement?.l3Delta || {};
  assert.deepEqual(
    Object.keys(metadata.supplement || {}).sort(),
    ["l3topAdditive", "l3Delta", "preserved"].sort(),
    "Current supplement proof keys drift",
  );
  for (const [proof, label] of [
    [top, "l3top additive"],
    [delta, "l3 delta"],
  ]) {
    assert.deepEqual(
      Object.keys(proof).sort(),
      [
        "exactCells", "stateCount", "counters", "eligibleDelta",
        "knownCardDelta", "opportunitiesDelta", "lookupMismatchDelta",
        "deltaProjectionSha256", "nonnegativePerCell", "appliedExactly",
        ...(label === "l3 delta" ? ["cloneEqualsL3top"] : []),
      ].sort(),
      `Current supplement ${label} keys drift`,
    );
    if (proof.exactCells !== 9_126 ||
        proof.stateCount !== 54 ||
        proof.nonnegativePerCell !== true ||
        proof.appliedExactly !== true ||
        proof.eligibleDelta !== proof.counters?.opportunities ||
        proof.knownCardDelta !== proof.counters?.opportunities ||
        proof.opportunitiesDelta !== proof.counters?.opportunities ||
        proof.lookupMismatchDelta !== 0) {
      throw new Error(`Current supplement ${label} proof is incomplete`);
    }
    requireHex64(proof.deltaProjectionSha256, `Current supplement ${label} projection`);
    validateExactCounterObject(proof.counters, `Current supplement ${label}`, {
      novelRaw: true,
    });
  }
  if (delta.cloneEqualsL3top !== true ||
      delta.deltaProjectionSha256 !== top.deltaProjectionSha256 ||
      JSON.stringify(delta.counters) !== JSON.stringify(top.counters)) {
    throw new Error("Current supplement l3 delta is not an exact l3top clone");
  }
  const sourceTotalsByCohort = exactActionCounterTotalsByCohort(sourceRows);
  assert.deepEqual(
    Object.keys(metadata.supplement?.preserved || {}).sort(),
    ["l2", "l1"].sort(),
    "Current supplement preserved-cohort keys drift",
  );
  for (const cohort of ["l2", "l1"]) {
    const preserved = metadata.supplement?.preserved?.[cohort] || {};
    assert.deepEqual(
      Object.keys(preserved).sort(),
      [
        "rows", "sourceProjectionSha256", "finalProjectionSha256",
        "counters", "exact",
      ].sort(),
      `Current supplement preserved ${cohort} keys drift`,
    );
    if (preserved.rows !== 9_126 ||
        preserved.exact !== true ||
        !/^[a-f0-9]{64}$/.test(String(preserved.sourceProjectionSha256 || "")) ||
        preserved.sourceProjectionSha256 !== preserved.finalProjectionSha256) {
      throw new Error(`Current supplement did not preserve ${cohort} exactly`);
    }
    validateExactCounterObject(preserved.counters, `Current supplement preserved ${cohort}`);
    assert.deepEqual(
      preserved.counters,
      sourceTotalsByCohort[cohort],
      `Current supplement preserved ${cohort} counters drift from final source`,
    );
  }

  const merged = metadata.merged || {};
  assert.deepEqual(
    Object.keys(merged).sort(),
    [
      "file", "rows", "sha256", "bytes", "windowStartInclusive",
      "windowEndExclusive", "knownCards", "totals", "cube",
    ].sort(),
    "Current supplement final aggregate keys drift",
  );
  if (merged.sha256 !== sourceHash ||
      merged.rows !== 36_504 ||
      merged.windowStartInclusive !== metadata.window.startInclusive ||
      merged.windowEndExclusive !== metadata.window.endExclusive ||
      merged.cube?.rowCount !== 36_504 ||
      merged.cube?.stateCount !== 216 ||
      merged.cube?.handClassesPerState !== 169 ||
      merged.cube?.coverageReconciled !== true) {
    throw new Error("Current supplement final aggregate proof is incomplete");
  }
  const sourceCoverage = sourceCoverageSummary(sourceRows);
  assert.deepEqual(
    merged.knownCards,
    {
      eligible: sourceCoverage.totals.eligible,
      known: sourceCoverage.totals.known,
      lookupMismatch: sourceCoverage.totals.lookupMismatch,
      pct: sourceCoverage.totals.pct,
    },
    "Current supplement final known-card coverage drift",
  );
  assert.deepEqual(
    merged.totals,
    exactActionCounterTotals(sourceRows),
    "Current supplement final action totals drift",
  );
  validateAggregateOnlyPrivacy(metadata.privacy, "Current supplement");
}

function validateCompositionActionMetadata(metadata, sourceHash, rawTemplateSha256) {
  if (metadata.schema !== "ff-rfi-field-action-composition-v1" ||
      metadata.strategy !== "adjacent-historical-raw-plus-current-recovery-adjusted") {
    throw new Error("Unexpected historical/current field-action composition strategy");
  }
  if (metadata.shardStrategy !== "contiguous-time") {
    throw new Error("Historical/current composition must use contiguous time windows");
  }
  const historical = metadata.historicalManifest;
  const current = metadata.currentManifest;
  if (historical?.schema !== "ff-rfi-raw-hh-aggregate-v1" ||
      historical?.sourceKind !== "raw-hh-local-aggregate") {
    throw new Error("Historical composition source is not a verified raw-HH aggregate");
  }
  if (current?.schema !== "ff-rfi-field-action-cohort-replacement-v1") {
    throw new Error("Current composition source is not a recovery-adjusted replacement");
  }
  if (metadata.merged?.sha256 !== sourceHash) {
    throw new Error("Historical/current composition SHA-256 does not match --source");
  }
  if (metadata.merged?.rowCount !== 36_504 ||
      metadata.merged?.cube?.rowCount !== 36_504 ||
      metadata.merged?.cube?.stateCount !== 216 ||
      metadata.merged?.cube?.handClassesPerState !== 169 ||
      metadata.merged?.cube?.coverageReconciled !== true) {
    throw new Error("Historical/current composition has no complete 36,504-row cube proof");
  }
  if (historical.window?.endExclusive !== current.window?.startInclusive ||
      metadata.window?.startInclusive !== historical.window?.startInclusive ||
      metadata.window?.endExclusive !== current.window?.endExclusive ||
      metadata.merged?.windowStartInclusive !== metadata.window?.startInclusive ||
      metadata.merged?.windowEndExclusive !== metadata.window?.endExclusive) {
    throw new Error("Historical/current composition windows are not exactly adjacent");
  }
  assert.deepEqual(metadata.noOverlap, {
    historicalEndExclusive: historical.window.endExclusive,
    currentStartInclusive: current.window.startInclusive,
    adjacent: true,
    overlapDays: 0,
    doubleCountPrevented: true,
  }, "Historical/current composition has no exact no-overlap proof");
  assert.deepEqual(
    metadata.membership,
    historical.membership,
    "Historical composition membership drift",
  );
  assert.deepEqual(
    metadata.membership,
    {
      sha256: current.membership?.sha256,
      keysSha256: current.membership?.keysSha256,
      rows: current.membership?.rows,
      uniqueUsers: current.sourceMerges?.structured?.inputs?.[0]?.sourceUniqueUsers,
      cohortCounts: current.membership?.cohortCounts,
    },
    "Current composition membership drift",
  );
  const sourceDescriptors = metadata.sources || [];
  if (sourceDescriptors.length !== 2 ||
      sourceDescriptors[0]?.sourceKind !== "raw-hh-local-aggregate" ||
      sourceDescriptors[1]?.sourceKind !== "current-recovery-adjusted-cohort-replacement") {
    throw new Error("Historical/current composition source order or kinds drifted");
  }
  if (sourceDescriptors[0].embeddedManifestSha256 !==
        sha256(`${JSON.stringify(historical, null, 2)}\n`) ||
      sourceDescriptors[1].embeddedManifestSha256 !==
        sha256(`${JSON.stringify(current, null, 2)}\n`)) {
    throw new Error("Historical/current embedded source manifest hash mismatch");
  }
  for (const [descriptor, label] of [
    [sourceDescriptors[0], "historical source manifest"],
    [sourceDescriptors[1], "current source manifest"],
  ]) {
    if (!/^[a-f0-9]{64}$/.test(String(descriptor.manifestSha256 || ""))) {
      throw new Error(`${label} SHA-256 is invalid`);
    }
  }
  if (sourceDescriptors[0].aggregate?.sha256 !== historical.aggregate?.sha256 ||
      sourceDescriptors[1].aggregate?.sha256 !== current.merged?.sha256) {
    throw new Error("Historical/current source aggregate hash mismatch");
  }
  assert.deepEqual(metadata.inputs, sourceDescriptors, "Composition inputs/source descriptors drift");
  assert.deepEqual(
    sourceDescriptors[0].manifest,
    historical,
    "Historical embedded manifest descriptor drift",
  );
  assert.deepEqual(
    sourceDescriptors[1].manifest,
    current,
    "Current embedded manifest descriptor drift",
  );
  const historicalExecution = historical.source?.execution || {};
  if (historicalExecution.executionMode !== "async" ||
      !/^mcp_ch_job_[a-f0-9]{32}$/.test(String(historicalExecution.queryJobId || ""))) {
    throw new Error("Historical raw-HH execution identity is invalid");
  }
  for (const [value, label] of [
    [historicalExecution.querySha256, "historical rendered query"],
    [historicalExecution.queryTemplateSha256, "historical query template"],
    [historicalExecution.receiptSha256, "historical receipt"],
    [historical.source?.export?.sha256, "historical raw export"],
    [historical.transform?.parserSha256, "historical parser"],
    [historical.transform?.aggregatorSha256, "historical aggregator"],
    [historical.validation?.reportSha256, "historical validation"],
    [historical.aggregate?.sha256, "historical aggregate"],
  ]) {
    if (!/^[a-f0-9]{64}$/.test(String(value || ""))) {
      throw new Error(`${label} SHA-256 is invalid`);
    }
  }
  if (historicalExecution.queryTemplateSha256 !== rawTemplateSha256) {
    throw new Error("Historical raw-HH source uses a stale extraction SQL template");
  }
  assert.deepEqual({
    queryJobIds: sourceDescriptors[0].queryJobIds,
    querySha256: sourceDescriptors[0].querySha256,
    queryTemplateSha256: sourceDescriptors[0].queryTemplateSha256,
    receiptSha256: sourceDescriptors[0].receiptSha256,
    resultSha256: sourceDescriptors[0].resultSha256,
    rawExport: sourceDescriptors[0].rawExport,
    transform: sourceDescriptors[0].transform,
    validation: sourceDescriptors[0].validation,
  }, {
    queryJobIds: [historicalExecution.queryJobId],
    querySha256: historicalExecution.querySha256,
    queryTemplateSha256: historicalExecution.queryTemplateSha256,
    receiptSha256: historicalExecution.receiptSha256,
    resultSha256: historical.source.export.sha256,
    rawExport: historical.source.export,
    transform: historical.transform,
    validation: historical.validation,
  }, "Historical source query/result/receipt/validation provenance drift");
  assert.deepEqual(
    sourceDescriptors[1].structuredQueryExecutions,
    current.sourceMerges.structured.inputs.map((input) => ({
      queryJobId: input.queryJobId,
      querySha256: input.querySha256,
      queryTemplateSha256: input.templateSha256,
      receiptSha256: input.receiptSha256,
      resultSha256: input.sha256,
    })),
    "Current structured query/result/receipt provenance drift",
  );
  assert.deepEqual(
    sourceDescriptors[1].recoveryQueryExecutions,
    current.sourceMerges.recovery.inputs.map((input) => ({
      queryJobId: input.queryJobId,
      querySha256: input.querySha256,
      queryTemplateSha256: input.templateSha256,
      receiptSha256: input.receiptSha256,
      resultSha256: input.sha256,
      rendererMetadataSha256: input.rendererMetadataSha256,
      parserGrammarsSha256: input.parserGrammarsSha256,
      validation: input.validation,
    })),
    "Current recovery query/result/receipt/validation provenance drift",
  );
  if (historical.validation?.status !== "passed" ||
      Number(historical.validation?.rejected) !== 0 ||
      historical.privacy?.rawHandHistoriesPublished !== false ||
      historical.privacy?.personalIdentifiersPublished !== false) {
    throw new Error("Historical raw-HH validation or privacy proof is incomplete");
  }
  assert.deepEqual(
    Object.keys(historical.validation?.networks || {}).sort(),
    [...HISTORICAL_RAW_PARSER_NETWORKS].sort(),
    "Historical raw-HH validation must cover exactly seven approved parser networks",
  );
  for (const network of HISTORICAL_RAW_PARSER_NETWORKS) {
    const stats = historical.validation.networks[network];
    if (!Number.isSafeInteger(Number(stats?.rows)) || Number(stats.rows) <= 0) {
      throw new Error(`Historical raw-HH validation network ${network} has no compared rows`);
    }
    for (const check of HISTORICAL_VALIDATION_CHECKS) {
      const compared = Number(stats.checks?.[check]?.compared);
      const matched = Number(stats.checks?.[check]?.matched);
      if (!Number.isSafeInteger(compared) || compared < 0 || matched !== compared ||
          (check !== "shove" && compared !== Number(stats.rows))) {
        throw new Error(`Historical raw-HH validation network ${network} failed ${check}`);
      }
    }
  }
  assert.deepEqual(metadata.privacy, {
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  }, "Historical/current composition privacy boundary mismatch");

  const reconciliation = metadata.merged?.componentReconciliation;
  if (reconciliation?.exactIntegerAddition !== true) {
    throw new Error("Historical/current composition has no exact integer-addition proof");
  }
  const counterNames = [
    "opportunities", "raises_total", "regular_raise", "open_shove", "limp", "fold_other",
    "shove_allin_flag", "shove_effective_amount_only", "regular_three_bb_open",
    "normal_three_bb_as_shove", "non_exact_r_effective_allin",
  ];
  for (const counter of counterNames) {
    const historicalValue = Number(reconciliation.historicalTotals?.[counter]);
    const currentValue = Number(reconciliation.currentTotals?.[counter]);
    const finalValue = Number(reconciliation.finalTotals?.[counter]);
    if (![historicalValue, currentValue, finalValue].every(Number.isSafeInteger) ||
        historicalValue < 0 || currentValue < 0 ||
        finalValue !== historicalValue + currentValue ||
        finalValue !== Number(metadata.merged?.totals?.[counter])) {
      throw new Error(`Historical/current composition double-count or omission for ${counter}`);
    }
  }
}

function nextDay(inclusiveTimestamp) {
  const date = inclusiveTimestamp.slice(0, 10);
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().replace(".000Z", "Z");
}

const options = args();
let sourceText = "";
if (options.source) {
  sourceText = fs.readFileSync(options.source, "utf8");
} else {
  for (const cohort of COHORTS) if (!options[cohort]) throw new Error(`Missing --source=path.csv or --${cohort}=path.csv`);
  const rows = COHORTS.flatMap((cohort) => parseCsv(fs.readFileSync(options[cohort], "utf8")));
  const header = Object.keys(rows[0] || {});
  sourceText = [header.join(","), ...rows.map((row) => header.map((key) => row[key]).join(","))].join("\n");
}

const sourceRows = parseCsv(sourceText);
if (!sourceRows.length) throw new Error("Field-action source is empty");
const sourceHash = sha256(sourceText);
const extractionSqlPath = path.resolve(here, "q_ff_rfi_field_actions.sql");
const extractionSqlText = fs.readFileSync(extractionSqlPath, "utf8");
const extractionSqlHash = sha256(extractionSqlText);
const recoveryExtractionSqlPath = path.resolve(here, "q_ff_rfi_missing_cards_recovery.sql");
const recoveryExtractionSqlText = fs.readFileSync(recoveryExtractionSqlPath, "utf8");
const recoveryExtractionSqlHash = sha256(recoveryExtractionSqlText);
const rawExtractionSqlPath = path.resolve(here, "q_ff_rfi_raw_hh_field_actions.sql");
const rawExtractionSqlText = fs.readFileSync(rawExtractionSqlPath, "utf8");
const currentRawExtractionSqlHash = sha256(rawExtractionSqlText);
const publicationRawExtractionSqlPath = path.resolve(
  here,
  "q_ff_rfi_raw_hh_field_actions_publication_20260726.sql",
);
const publicationRawExtractionSqlHash = sha256(
  fs.readFileSync(publicationRawExtractionSqlPath, "utf8"),
);
const coinPartyExtractionSqlPath = path.resolve(
  here,
  "q_ff_rfi_coin_party_publication.sql",
);
const coinPartyExtractionSqlHash = sha256(
  fs.readFileSync(coinPartyExtractionSqlPath),
);
const coinPartyParserImplementationSha256 = sha256(
  fs.readFileSync(path.resolve(here, "coin-party-raw-hand-history-parser.mjs")),
);
const membershipQuerySha256 = sha256(membershipQueryFromTemplate(extractionSqlText));
const actionMetadata = options["action-metadata"] ? JSON.parse(fs.readFileSync(options["action-metadata"], "utf8")) : null;
if (!actionMetadata) throw new Error("A publishable build requires --action-metadata=/private/path/verified-merge.json");
const composition = actionMetadata.schema === "ff-rfi-field-action-composition-v1";
const currentSupplement = actionMetadata.schema === CURRENT_SUPPLEMENT_SCHEMA;
const rawExtractionSqlHash = currentSupplement
  ? publicationRawExtractionSqlHash
  : currentRawExtractionSqlHash;
const rawExtractionTemplatePath = currentSupplement
  ? "tools/q_ff_rfi_raw_hh_field_actions_publication_20260726.sql"
  : "tools/q_ff_rfi_raw_hh_field_actions.sql";
const currentActionMetadata = composition ? actionMetadata.currentManifest : actionMetadata;
const actionInputs = currentActionMetadata?.inputs || [];
{
  const replacement = currentActionMetadata?.schema === "ff-rfi-field-action-cohort-replacement-v1";
  if (!replacement && !currentSupplement &&
      currentActionMetadata?.schema !== "ff-rfi-field-action-merge-v1") {
    throw new Error(`Unexpected action metadata schema ${actionMetadata.schema}`);
  }
  if (!replacement && !currentSupplement &&
      !["immutable-user-id", "contiguous-time"].includes(currentActionMetadata.shardStrategy)) {
    throw new Error(`Unexpected action shard strategy ${currentActionMetadata.shardStrategy}`);
  }
  if (actionInputs.length < 1) throw new Error("At least one verified source execution is required");
  const sourceKinds = new Set(actionInputs.map((input) => (
    input.sourceKind || "structured-field-action"
  )));
  if (!replacement && !currentSupplement && sourceKinds.size !== 1) {
    throw new Error("Action merge cannot mix structured-only and recovery full-cube sources");
  }
  for (const input of actionInputs) {
    const executionMode = sourceExecutionMode(input.queryJobId, input.querySha256, /^mcp_ch_job_[a-f0-9]+$/, "Action shard");
    if (input.executionMode !== executionMode) throw new Error(`Action shard execution mode mismatch: ${input.queryJobId}`);
    if (!/^[a-f0-9]{64}$/.test(input.querySha256)) throw new Error(`Invalid rendered query hash: ${input.queryJobId}`);
    if ((composition || currentSupplement) &&
        (!/^[a-f0-9]{64}$/.test(String(input.receiptSha256 || "")) ||
          !/^[a-f0-9]{64}$/.test(String(
            currentSupplement
              ? input.resultSha256
              : input.sha256,
          )))) {
      throw new Error(`Historical/current composition lost current receipt or result hash: ${input.queryJobId}`);
    }
    if (isNovelInput(input)) {
      validateNovelRawInput(
        input,
        input.sourceKind === "coin-party-publication-v2"
          ? coinPartyExtractionSqlHash
          : rawExtractionSqlHash,
        currentActionMetadata.window,
        currentActionMetadata.supplementSource?.plan?.networks || [],
        currentActionMetadata.supplementSource?.schema ===
          COMPOSED_NOVEL_SUPPLEMENT_SCHEMA
          ? currentActionMetadata.supplementSource?.parserValidation?.componentSha256 || []
          : [currentActionMetadata.supplementSource?.parserValidation?.sha256],
      );
    } else if (currentSupplement) {
      if (!["structured-field-action", "missing-card-recovery-full-cube"].includes(
        input.sourceKind,
      )) {
        throw new Error(`Unexpected current base source kind: ${input.sourceKind}`);
      }
      validateSafeBaseInput(
        input,
        input.sourceKind,
        input.sourceKind === "missing-card-recovery-full-cube"
          ? recoveryExtractionSqlHash
          : extractionSqlHash,
        currentActionMetadata.membership,
        currentActionMetadata.window,
      );
    } else if (input.sourceKind === "missing-card-recovery-full-cube") {
      validateRecoveryActionInput(input, recoveryExtractionSqlHash);
    } else {
      if (input.templateSha256 !== extractionSqlHash) throw new Error(`Action shard uses a stale extraction SQL template: ${input.queryJobId}`);
      if (!["analytics.int_tracker_hand_joined", "analytics.bak20260720_int_tracker_hand_joined"].includes(input.sourceTable)) {
        throw new Error(`Action shard uses an unsupported source table: ${input.queryJobId}`);
      }
      const expectedHandClassMode = input.sourceTable === "analytics.int_tracker_hand_joined"
        ? "joined-holecards-str"
        : "verified-holecard-id-1-169";
      if (input.handClassMode !== expectedHandClassMode) throw new Error(`Action shard hand-class mode mismatch: ${input.queryJobId}`);
      if (expectedHandClassMode === "verified-holecard-id-1-169" && !/^[a-f0-9]{64}$/.test(input.holecardMappingSha256 || "")) {
        throw new Error(`Action shard has no verified holecard-id mapping hash: ${input.queryJobId}`);
      }
    }
  }
  if (replacement) {
    validateReplacementActionMetadata(
      currentActionMetadata,
      composition ? currentActionMetadata.merged?.sha256 : sourceHash,
    );
  } else if (!currentSupplement) {
    validateActionSourceShards(currentActionMetadata);
    if (currentActionMetadata.merged?.sha256 !== sourceHash) throw new Error("Action merge metadata SHA-256 does not match --source");
  }
  if (composition) {
    validateCompositionActionMetadata(actionMetadata, sourceHash, rawExtractionSqlHash);
  }
  if (currentSupplement) {
    validateCurrentSupplementActionMetadata(
      actionMetadata,
      sourceHash,
      extractionSqlHash,
      recoveryExtractionSqlHash,
      rawExtractionSqlHash,
      coinPartyExtractionSqlHash,
      coinPartyParserImplementationSha256,
      sourceRows,
    );
  }
  if (!replacement && !currentSupplement &&
      sourceKinds.has("missing-card-recovery-full-cube")) {
    if (currentActionMetadata.sourceKind !== "missing-card-recovery-full-cube") {
      throw new Error("Recovery merge metadata source kind mismatch");
    }
    if (currentActionMetadata.merged?.cube?.handClassesPerState !== 169 ||
        currentActionMetadata.merged?.cube?.coverageReconciled !== true) {
      throw new Error("Recovery merge has no verified 169-cell cube reconciliation");
    }
  }
}
const aggregatedRows = aggregateRows(sourceRows);
const sourceActionTotals = actionCountTotals(sourceRows);
const sourceCoverage = sourceCoverageSummary(sourceRows);
assert.equal(sourceCoverage.totals.known, sourceActionTotals.opportunities, "Known-card coverage must reconcile to source opportunities");
assert.deepEqual(actionMetadata.merged.knownCards, {
  eligible: sourceCoverage.totals.eligible,
  known: sourceCoverage.totals.known,
  lookupMismatch: sourceCoverage.totals.lookupMismatch,
  pct: sourceCoverage.totals.pct,
}, "Merge metadata known-card coverage drift");
const aggregatedActionTotals = actionCountTotals(aggregatedRows);
assert.deepEqual(
  aggregatedActionTotals,
  sourceActionTotals,
  "Public stack aggregation must reconcile every integer action count",
);
const indexes = indexRows(aggregatedRows);
const coverage = STACKS.flatMap((stack) => POSITIONS.map((position) => stateCoverage(indexes, stack, position)));
const incompleteStates = coverage.filter((state) => !state.passesGate);
if (incompleteStates.length) {
  throw new Error(
    `Refusing partial RFI publication: ${incompleteStates.map((state) => `${state.stack}|${state.position}`).join(", ")} do not satisfy 169/169 cells at N >= ${EXACT_CELL_MIN_N} in all cohorts`,
  );
}

const cohorts = {};
for (const cohort of COHORTS) {
  const rows = sourceRows.filter((row) => row.cohort === cohort);
  const selectedPlayers = Math.max(...rows.map((row) => number(row, "cohort_players", "cohort_selected_players")), 0);
  const charts = {};
  for (const stack of STACKS) {
    charts[stack] = {};
    for (const position of POSITIONS) charts[stack][position] = buildChart(indexes[cohort], stack, position);
  }
  cohorts[cohort] = { ...COHORT_META[cohort], players: selectedPlayers, selectedPlayers, charts };
}

const periods = new Set(sourceRows.map((row) => `${row.window_start}|${row.window_end}`));
if (periods.size !== 1) throw new Error(`Expected one source window, got ${[...periods].join(", ")}`);
const [periodFrom, periodThrough] = [...periods][0].split("|");
if (actionMetadata) {
  if (actionMetadata.merged.windowStartInclusive !== `${periodFrom}T00:00:00Z`) throw new Error("Action merge start does not match source rows");
  const expectedExclusive = new Date(Date.parse(`${periodThrough}T00:00:00Z`) + 86400000).toISOString().replace(".000Z", "Z");
  if (actionMetadata.merged.windowEndExclusive !== expectedExclusive) throw new Error("Action merge end does not match source rows");
}
if (!options.membership) throw new Error("A publishable build requires --membership=/private/path/cohort-membership.csv");
if (!options["membership-receipt"]) throw new Error("A publishable build requires --membership-receipt=/private/path/source-receipt.json");
const membershipText = fs.readFileSync(options.membership, "utf8");
const membershipRows = parseCsv(membershipText);
if (!membershipRows.length) throw new Error("Cohort membership export is empty");
const membershipReceipt = succeededReceipt(
  JSON.parse(fs.readFileSync(options["membership-receipt"], "utf8")),
  /^mcp_bq_job_[a-f0-9]+$/,
  "Cohort membership",
);
if (membershipReceipt.row_count !== membershipRows.length) throw new Error("Cohort membership receipt row count does not match export");
const membershipSha256 = sha256(membershipText);
const membershipKeys = membershipRows.map((row) => `${row.cohort}|${row.user_id}`).sort();
if (new Set(membershipKeys).size !== membershipKeys.length) throw new Error("Duplicate cohort/user membership key");
for (const row of membershipRows) {
  if (!COHORTS.includes(row.cohort)) throw new Error(`Unexpected membership cohort ${row.cohort}`);
  const userId = number(row, "user_id");
  const rank = number(row, "current_rank");
  const hands = number(row, "ffev_hands");
  const ffev = Number(row.ffev);
  if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isInteger(rank) || rank < 1 || rank > 18 || !Number.isFinite(ffev) || hands < 30000) {
    throw new Error(`Invalid membership row ${row.cohort}|${row.user_id}`);
  }
}
if (!actionInputs.every((input) => (
  isNovelInput(input)
    ? currentActionMetadata.membership?.sha256 === membershipSha256
    : input.membershipSha256 === membershipSha256
))) throw new Error("Action source membership bytes do not match --membership");
if (composition && actionMetadata.membership?.sha256 !== membershipSha256) {
  throw new Error("Historical/current composition membership bytes do not match --membership");
}
if (currentSupplement) {
  const actualCohortCounts = Object.fromEntries(COHORTS.map((cohort) => [
    cohort,
    membershipRows.filter((row) => row.cohort === cohort).length,
  ]));
  assert.deepEqual(
    actionMetadata.membership,
    {
      sha256: membershipSha256,
      keysSha256: sha256(membershipKeys.join("\n")),
      rows: membershipRows.length,
      cohortCounts: actualCohortCounts,
      subsetProof: {
        l3topMembers: actualCohortCounts.l3top,
        l3Members: actualCohortCounts.l3,
        l3topIsSubsetOfL3: true,
      },
    },
    "Current supplement frozen membership provenance drift",
  );
}
const cohortJobId = membershipReceipt.job_id;
const membershipExecutionMode = "async";
const top25Rows = membershipRows.filter((row) => row.cohort === "l3top");
const l3EligibleRows = membershipRows.filter((row) => row.cohort === "l3");
const expectedTop25 = [...l3EligibleRows]
  .sort((left, right) => Number(right.ffev) - Number(left.ffev) || number(left, "user_id") - number(right, "user_id"))
  .slice(0, Math.ceil(l3EligibleRows.length * 0.25));
assert.deepEqual(
  top25Rows.map((row) => number(row, "user_id")).sort((left, right) => left - right),
  expectedTop25.map((row) => number(row, "user_id")).sort((left, right) => left - right),
  "L3 top-25 membership must be derived deterministically from the frozen eligible cohort",
);
const top25Cutoff = Math.min(...top25Rows.map((row) => Number(row.ffev)));
const classifierSanity = Object.fromEntries(STACKS.map((stack) => {
  const totals = {
    openShoves: 0,
    shoveAllinFlag: 0,
    shoveEffectiveAmountOnly: 0,
    regularThreeBbOpens: 0,
    normalThreeBbAsShove: 0,
    nonExactREffectiveAllin: 0,
  };
  for (const row of aggregatedRows.filter((item) => item.stack_bucket === stack)) {
    const cell = actions(row);
    const counts = classifierCounts(row, `${row.cohort}|${row.stack_bucket}|${row.position_group}|${row.hand_class}`);
    totals.openShoves += cell.shove;
    totals.shoveAllinFlag += counts.shove_allin_flag;
    totals.shoveEffectiveAmountOnly += counts.shove_effective_amount_only;
    totals.regularThreeBbOpens += counts.regular_three_bb_open;
    totals.normalThreeBbAsShove += counts.normal_three_bb_as_shove;
    totals.nonExactREffectiveAllin += counts.non_exact_r_effective_allin;
  }
  if (totals.openShoves !== totals.shoveAllinFlag + totals.shoveEffectiveAmountOnly) throw new Error(`Shove classifier totals do not reconcile for ${stack}`);
  if (totals.normalThreeBbAsShove !== 0) throw new Error(`Normal 2.5–3.5 BB opens leaked into shove for ${stack}`);
  return [stack, totals];
}));
const actionJobIds = [
  ...(composition ? [actionMetadata.historicalManifest.source.execution.queryJobId] : []),
  ...actionInputs.map((item) => item.queryJobId),
];
const usesRecovery = actionInputs.some((item) => (
  item.sourceKind === "missing-card-recovery-full-cube"
));
const usesCoinPartyNovel = actionInputs.some((item) => (
  item.sourceKind === "coin-party-publication-v2"
));
const usesCurrentRawNovel = actionInputs.some((item) => (
  isNovelInput(item) && item.sourceKind !== "coin-party-publication-v2"
));
const extractionTemplates = [
  {
    path: "tools/q_ff_rfi_field_actions.sql",
    sha256: extractionSqlHash,
    role: usesRecovery ? "canonical-structured-cube" : "field-action-cube",
  },
  ...(usesRecovery ? [{
    path: "tools/q_ff_rfi_missing_cards_recovery.sql",
    sha256: recoveryExtractionSqlHash,
    role: "l3top-missing-card-recovery",
  }] : []),
  ...(composition ? [{
    path: "tools/q_ff_rfi_raw_hh_field_actions.sql",
    sha256: rawExtractionSqlHash,
    role: "adjacent-historical-raw-hh",
  }] : []),
  ...(currentSupplement && usesCurrentRawNovel ? [{
    path: rawExtractionTemplatePath,
    sha256: rawExtractionSqlHash,
    role: "current-novel-raw-hh-supplement",
  }] : []),
  ...(currentSupplement && usesCoinPartyNovel ? [{
    path: "tools/q_ff_rfi_coin_party_publication.sql",
    sha256: coinPartyExtractionSqlHash,
    role: "current-coin-party-publication-supplement",
  }] : []),
];
const replacementMetadata = currentSupplement
  ? {
    strategy: currentActionMetadata.baseCurrent.strategy,
    replacedCohort: "l3top",
    deltaAppliedCohort: "l3",
    membership: currentActionMetadata.membership,
    replacement: currentActionMetadata.baseCurrent.replacement,
  }
  : currentActionMetadata;
const replacementSnapshot = replacementMetadata.schema === "ff-rfi-field-action-cohort-replacement-v1" ||
    currentSupplement
  ? {
    strategy: replacementMetadata.strategy,
    replacedCohort: replacementMetadata.replacedCohort,
    deltaAppliedCohort: replacementMetadata.deltaAppliedCohort,
    membershipSubsetProof: replacementMetadata.membership.subsetProof,
    l3top: replacementMetadata.replacement.l3top,
    l3Delta: replacementMetadata.replacement.l3Delta,
    preserved: replacementMetadata.replacement.preserved,
  }
  : null;
const compositionSnapshot = composition
  ? {
    schema: actionMetadata.schema,
    strategy: actionMetadata.strategy,
    window: actionMetadata.window,
    noOverlap: actionMetadata.noOverlap,
    membership: actionMetadata.membership,
    historical: {
      schema: actionMetadata.historicalManifest.schema,
      sourceKind: actionMetadata.historicalManifest.sourceKind,
      manifestSha256: actionMetadata.sources[0].manifestSha256,
      embeddedManifestSha256: actionMetadata.sources[0].embeddedManifestSha256,
      window: actionMetadata.historicalManifest.window,
      aggregate: actionMetadata.historicalManifest.aggregate,
      execution: actionMetadata.historicalManifest.source.execution,
      resultSha256: actionMetadata.historicalManifest.source.export.sha256,
      rawExport: actionMetadata.historicalManifest.source.export,
      transform: actionMetadata.historicalManifest.transform,
      validation: actionMetadata.historicalManifest.validation,
    },
    current: {
      schema: currentActionMetadata.schema,
      manifestSha256: actionMetadata.sources[1].manifestSha256,
      embeddedManifestSha256: actionMetadata.sources[1].embeddedManifestSha256,
      window: currentActionMetadata.window,
      aggregate: currentActionMetadata.merged,
      structuredExecutions: currentActionMetadata.sourceMerges.structured.inputs.map((input) => ({
        queryJobId: input.queryJobId,
        querySha256: input.querySha256,
        queryTemplateSha256: input.templateSha256,
        receiptSha256: input.receiptSha256 || null,
        resultSha256: input.sha256,
      })),
      recoveryExecutions: currentActionMetadata.sourceMerges.recovery.inputs.map((input) => ({
        queryJobId: input.queryJobId,
        querySha256: input.querySha256,
        queryTemplateSha256: input.templateSha256,
        receiptSha256: input.receiptSha256,
        resultSha256: input.sha256,
        rendererMetadataSha256: input.rendererMetadataSha256,
        parserGrammarsSha256: input.parserGrammarsSha256,
        validation: input.validation,
      })),
      replacement: replacementSnapshot,
    },
    final: {
      aggregate: actionMetadata.merged,
      privacy: actionMetadata.privacy,
    },
  }
  : null;
function sourceMergeSnapshot(sourceMerge) {
  return {
    schema: sourceMerge.schema,
    manifestSha256: sourceMerge.manifestSha256,
    shardStrategy: sourceMerge.shardStrategy,
    ...(sourceMerge.sourceKind ? { sourceKind: sourceMerge.sourceKind } : {}),
    aggregate: sourceMerge.aggregate,
    inputs: sourceMerge.inputs.map(baseInputSnapshot),
    merged: {
      rows: sourceMerge.merged.rows,
      sha256: sourceMerge.merged.sha256,
      windowStartInclusive: sourceMerge.merged.windowStartInclusive,
      windowEndExclusive: sourceMerge.merged.windowEndExclusive,
      knownCards: sourceMerge.merged.knownCards,
      totals: sourceMerge.merged.totals,
      ...(sourceMerge.merged.cube
        ? { cube: sourceMerge.merged.cube }
        : {}),
    },
  };
}
function baseInputSnapshot(input) {
  const common = {
    sourceKind: input.sourceKind,
    queryJobId: input.queryJobId,
    executionMode: input.executionMode,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    rendererMetadataSha256: input.rendererMetadataSha256,
    receiptSha256: input.receiptSha256,
    querySha256: input.querySha256,
    resultSha256: input.resultSha256,
    resultRows: input.resultRows,
    resultBytes: input.resultBytes,
    templateSha256: input.templateSha256,
    windowStartInclusive: input.windowStartInclusive,
    windowEndExclusive: input.windowEndExclusive,
    userShard: input.userShard,
    membershipSha256: input.membershipSha256,
    membershipKeysSha256: input.membershipKeysSha256,
    privacy: input.privacy,
  };
  return input.sourceKind === "structured-field-action"
    ? {
      ...common,
      handClassMode: input.handClassMode,
      holecardMappingSha256: input.holecardMappingSha256,
    }
    : {
      ...common,
      parserGrammarsSha256: input.parserGrammarsSha256,
      parserNetworks: input.parserNetworks,
      recoveryIsDisjoint: input.recoveryIsDisjoint,
      recoveryPredicate: input.recoveryPredicate,
      rawJoin: input.rawJoin,
      validation: input.validation,
    };
}
function novelInputSnapshot(input) {
  return {
    sourceKind: input.sourceKind,
    network: input.network,
    userShard: input.userShard,
    queryJobId: input.queryJobId,
    executionMode: input.executionMode,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    rendererMetadataSha256: input.rendererMetadataSha256,
    receiptSha256: input.receiptSha256,
    querySha256: input.querySha256,
    resultSha256: input.resultSha256,
    resultRows: input.resultRows,
    resultBytes: input.resultBytes,
    observedStates: input.observedStates,
    observedCells: input.observedCells,
    templateSha256: input.templateSha256,
    parserTemplateSha256: input.parserTemplateSha256,
    parserValidationSha256: input.parserValidationSha256,
    publicationGate: input.publicationGate,
    windowStartInclusive: input.windowStartInclusive,
    windowEndExclusive: input.windowEndExclusive,
    privacy: input.privacy,
  };
}
const currentSupplementSnapshot = currentSupplement
  ? {
    schema: currentActionMetadata.schema,
    strategy: currentActionMetadata.strategy,
    supplementedCohort: currentActionMetadata.supplementedCohort,
    deltaAppliedCohort: currentActionMetadata.deltaAppliedCohort,
    window: currentActionMetadata.window,
    membership: currentActionMetadata.membership,
    baseCurrent: {
      schema: currentActionMetadata.baseCurrent.schema,
      strategy: currentActionMetadata.baseCurrent.strategy,
      manifestSha256: currentActionMetadata.baseCurrent.manifestSha256,
      aggregate: {
        sha256: currentActionMetadata.baseCurrent.aggregate.sha256,
        bytes: currentActionMetadata.baseCurrent.aggregate.bytes,
        rows: currentActionMetadata.baseCurrent.aggregate.rows,
      },
      sourceMerges: {
        structured: sourceMergeSnapshot(
          currentActionMetadata.baseCurrent.sourceMerges.structured,
        ),
        recovery: sourceMergeSnapshot(
          currentActionMetadata.baseCurrent.sourceMerges.recovery,
        ),
      },
      replacement: replacementSnapshot,
    },
    supplementSource: {
      schema: currentActionMetadata.supplementSource.schema,
      sourceKind: currentActionMetadata.supplementSource.sourceKind,
      strategy: currentActionMetadata.supplementSource.strategy,
      manifestSha256: currentActionMetadata.supplementSource.manifestSha256,
      aggregate: {
        sha256: currentActionMetadata.supplementSource.aggregate.sha256,
        bytes: currentActionMetadata.supplementSource.aggregate.bytes,
        rows: currentActionMetadata.supplementSource.aggregate.rows,
      },
      plan: currentActionMetadata.supplementSource.plan,
      parserValidation: currentActionMetadata.supplementSource.parserValidation,
      inputs: currentActionMetadata.supplementSource.inputs.map(novelInputSnapshot),
      densification: currentActionMetadata.supplementSource.densification,
    },
    supplement: currentActionMetadata.supplement,
    final: {
      aggregate: {
        sha256: currentActionMetadata.merged.sha256,
        bytes: currentActionMetadata.merged.bytes,
        rows: currentActionMetadata.merged.rows,
        windowStartInclusive: currentActionMetadata.merged.windowStartInclusive,
        windowEndExclusive: currentActionMetadata.merged.windowEndExclusive,
        knownCards: currentActionMetadata.merged.knownCards,
        totals: currentActionMetadata.merged.totals,
        cube: currentActionMetadata.merged.cube,
      },
      privacy: currentActionMetadata.privacy,
    },
  }
  : null;
const periodToExclusive = new Date(Date.parse(`${periodThrough}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

const output = {
  schema: "ff-rfi-field-actions-v3",
  version: `rfi-field-actions-exact7-${sourceHash.slice(0, 12)}`,
  handOrder: HANDS,
  stackOrder: STACKS,
  positions: POSITIONS,
  cohortOrder: COHORTS,
  methodology: {
    period: {
      from: periodFrom,
      through: periodThrough,
      toExclusive: periodToExclusive,
      label: `${periodFrom} — ${periodThrough}`
    },
    table: "7-max",
    opportunity: "неоткрытый банк, известные карманные карты, эффективный стек 0–200 BB",
    actionSplit: "пас / обычный рейз / эффективный open-push / лимп",
    actionClassifier: {
      shove: "preflop_action='R' AND (is_preflop_allin=1 OR raise_and_blind_made_amount_bb - posted_blind_bb >= effective_stack_bb - 0.01)",
      regularRaise: "preflop_action starts with R except an exact direct effective shove; later RC/RR sequences remain regular opens",
      sanity: "Every stack bucket reconciles shove into all-in-flag and effective-amount-only reasons; a non-all-in 2.5–3.5 BB raise with stack behind must never be shove."
    },
    cohortRule: "текущая лига, активный реальный игрок, без кикнутых аккаунтов, минимум 30 000 рук FFEV",
    exactCellMinimum: EXACT_CELL_MIN_N,
    stateGate: `Публикация целиком требует 5 диапазонов стеков × 6 позиций × 4 группы; в каждом чарте 169/169 рук с N >= ${EXACT_CELL_MIN_N}. Частичный каталог не создаётся.`,
    stackAggregation: STACK_COMPONENTS,
    frequencyPolicy: "Только частоты из наблюдаемых целочисленных счётчиков, округлённые до целого процента; без сглаживания, интерполяции или модельного заполнения.",
    top25: {
      eligiblePlayers: l3EligibleRows.length,
      selectedPlayers: top25Rows.length,
      minHands: 30000,
      minFFev: top25Cutoff,
      ranks: "текущая Лига 3",
      metric: "ev_2_weighted",
      periodType: "last_100k_hands",
      selection: "верхние 25% по текущему FFEV; deterministic rank, ceil(N × 0.25)"
    },
    sourceSnapshot: {
      rows: sourceRows.length,
      sha256: sourceHash,
      membershipRows: membershipRows.length,
      membershipSha256,
      membershipKeysSha256: sha256(membershipKeys.join("\n")),
      membershipQuerySha256,
      cohortJobId,
      membershipExecutionMode,
      membershipReceipt: {
        jobId: membershipReceipt.job_id,
        rowCount: membershipReceipt.row_count,
        byteSize: Number(membershipReceipt.byte_size || 0),
        finishedAt: new Date(membershipReceipt.finished_at).toISOString(),
      },
      actionJobIds,
      actionShardStrategy: actionMetadata?.shardStrategy || actionMetadata?.strategy || null,
      actionShards: actionInputs.map((item) => currentSupplement
        ? (isNovelInput(item)
          ? novelInputSnapshot(item)
          : baseInputSnapshot(item))
        : ({
        sourceKind: item.sourceKind || "structured-field-action",
        network: item.network || null,
        rendererSchema: item.rendererSchema || null,
        rendererMode: item.rendererMode || null,
        rendererMetadataSha256: item.rendererMetadataSha256 || null,
        queryJobId: item.queryJobId,
        executionMode: item.executionMode,
        startedAt: item.startedAt || null,
        finishedAt: item.finishedAt || null,
        receiptSchema: item.receiptSchema || null,
        receiptSha256: item.receiptSha256 || null,
        receiptRowCount: item.receiptRowCount || null,
        receiptBytes: item.receiptBytes || null,
        windowStartInclusive: item.windowStartInclusive,
        windowEndInclusive: item.windowEndInclusive || null,
        windowEndExclusive: item.windowEndExclusive || null,
        rows: item.rows ?? item.resultRows,
        sha256: item.sha256 || item.resultSha256,
        querySha256: item.querySha256,
        templateSha256: item.templateSha256,
        parserTemplateSha256: item.parserTemplateSha256 || null,
        parserValidationSha256: item.parserValidationSha256 || null,
        resultSha256: item.resultSha256 || null,
        resultRows: item.resultRows ?? null,
        resultBytes: item.resultBytes ?? null,
        observedStates: item.observedStates ?? null,
        observedCells: item.observedCells ?? null,
        publicationGate: item.publicationGate || null,
        privacy: item.privacy || null,
        sourceTable: item.sourceTable,
        sourceTables: item.sourceTables || [item.sourceTable],
        handClassMode: item.handClassMode,
        holecardMappingSha256: item.holecardMappingSha256 || null,
        recoveryPredicate: item.recoveryPredicate || null,
        recoveryIsDisjoint: item.recoveryIsDisjoint ?? null,
        rawJoin: item.rawJoin || null,
        parserNetworks: item.parserNetworks || null,
        parserGrammarsSha256: item.parserGrammarsSha256 || null,
        selectedMembershipKeysSha256: item.selectedMembershipKeysSha256 || null,
        selectedMembershipRows: item.selectedMembershipRows || null,
        selectedUniqueUsers: item.selectedUniqueUsers || null,
        selectedCohortCounts: item.selectedCohortCounts || null,
        validation: item.validation || null,
        membershipSha256: item.membershipSha256 || null,
        membershipKeysSha256: item.membershipKeysSha256 || null,
        shardUsers: item.shardUsers ?? item.userShard.users,
        sourceUniqueUsers: item.sourceUniqueUsers ??
          (isNovelInput(item)
            ? currentActionMetadata.membership.subsetProof.l3topMembers
            : null),
        userShard: {
          index: item.userShard.index,
          count: item.userShard.count,
          users: item.userShard.users ?? item.shardUsers,
          userIdsSha256: item.userShard.userIdsSha256,
        },
        })),
      mergeSchema: actionMetadata?.schema || null,
      replacement: replacementSnapshot,
      composition: compositionSnapshot,
      currentSupplement: currentSupplementSnapshot,
      classifierSanity,
      actionCountReconciliation: {
        source: sourceActionTotals,
        aggregated: aggregatedActionTotals,
      },
      exactActionCounterTotals: exactActionCounterTotals(sourceRows),
      cohortActionCounterTotals: exactActionCounterTotalsByCohort(sourceRows),
      knownCards: sourceCoverage.totals,
      positionOpportunities: sourceCoverage.positionOpportunities,
      extractionSql: extractionTemplates.length === 1 ? extractionTemplates[0].path : null,
      extractionSqlSha256: extractionTemplates.length === 1 ? extractionTemplates[0].sha256 : null,
      extractionTemplates
    }
  },
  recommendations: {
    source: null,
    smoothing: null,
    charts: {}
  },
  cohorts
};

const target = path.resolve(options.out || path.resolve(here, "../field-action-data.js"));
const body = `(function(){\n  "use strict";\n  window.PokerRfiFieldActionData = ${JSON.stringify(output, null, 2)};\n})();\n`;
fs.writeFileSync(target, body);

if (options.diagnostics) {
  const diagnosticsTarget = path.resolve(options.diagnostics);
  const diagnostics = {
    schema: "ff-rfi-field-action-coverage-v3",
    status: "ready",
    generatedThrough: periodThrough,
    windowStart: periodFrom,
    windowEnd: periodThrough,
    table: "7-max",
    exactCellMinimum: EXACT_CELL_MIN_N,
    sourceRows: sourceRows.length,
    sourceCoverageStates: sourceCoverage.states.length,
    aggregatedRows: aggregatedRows.length,
    completeStates: coverage.length,
    passingStates: coverage.length,
    failingStates: [],
    sourceSha256: sourceHash,
    extractionSqlSha256: extractionTemplates.length === 1 ? extractionTemplates[0].sha256 : null,
    extractionTemplates,
    replacement: replacementSnapshot
      ? {
        strategy: replacementSnapshot.strategy,
        replacedCohort: replacementSnapshot.replacedCohort,
        deltaAppliedCohort: replacementSnapshot.deltaAppliedCohort,
        l3Delta: replacementSnapshot.l3Delta,
      }
      : null,
    composition: compositionSnapshot,
    membershipSha256,
    actionJobIds,
    stackAggregation: STACK_COMPONENTS,
    actionCountReconciliation: {
      source: sourceActionTotals,
      aggregated: aggregatedActionTotals,
    },
    classifierSanity,
    knownCards: sourceCoverage.totals,
    positionOpportunities: sourceCoverage.positionOpportunities,
    sourceCoverage: sourceCoverage.states,
    coverage
  };
  fs.writeFileSync(diagnosticsTarget, `${JSON.stringify(diagnostics, null, 2)}\n`);
}

console.log(JSON.stringify({
  target,
  bytes: Buffer.byteLength(body),
  sourceRows: sourceRows.length,
  aggregatedRows: aggregatedRows.length,
  completeStates: coverage.length,
  passingStates: coverage.length,
  failingStates: 0,
  positions: POSITIONS
}));
