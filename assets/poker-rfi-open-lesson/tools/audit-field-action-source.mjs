import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { normalizeHandClass } from "./field-action-quality.mjs";

const source = process.argv[2];
const options = Object.fromEntries(process.argv.slice(3).map((item) => {
  const match = item.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${item}`);
  return [match[1], match[2]];
}));
if (!source) throw new Error("Usage: node audit-field-action-source.mjs /path/to/field-action.csv [--diagnostics=/path/to/coverage.json]");

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
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

const sourceText = fs.readFileSync(source, "utf8");
const rows = parseCsv(sourceText);
const windowStarts = new Set(rows.map((row) => row.window_start));
const windowEnds = new Set(rows.map((row) => row.window_end));
assert.equal(windowStarts.size, 1, "source rows must share one window_start");
assert.equal(windowEnds.size, 1, "source rows must share one window_end");
const [windowStart] = windowStarts;
const [windowEnd] = windowEnds;
assert.match(windowStart, /^\d{4}-\d{2}-\d{2}$/, "window_start must be an ISO date");
assert.match(windowEnd, /^\d{4}-\d{2}-\d{2}$/, "window_end must be an ISO date");
assert.ok(windowStart <= windowEnd, "window_start must not be after window_end");
const cohorts = ["l3top", "l3", "l2", "l1"];
const rawStacks = ["70+", "30-70", "20-30", "15-20", "12-15", "10-12", "8-10", "6-8", "<6"];
const stackComponents = {
  "70+": ["70+"],
  "30-70": ["30-70"],
  "20-30": ["20-30"],
  "15-20": ["15-20"],
  "<15": ["12-15", "10-12", "8-10", "6-8", "<6"],
};
const stacks = Object.keys(stackComponents);
const publicStackForRaw = Object.fromEntries(Object.entries(stackComponents).flatMap(([stack, components]) => components.map((component) => [component, stack])));
const positions = ["EP", "MP", "HJ", "CO", "BTN", "SB"];
const positionContract = {
  EP: { order: 1, code: 4 }, MP: { order: 2, code: 3 }, HJ: { order: 3, code: 2 },
  CO: { order: 4, code: 1 }, BTN: { order: 5, code: 0 }, SB: { order: 6, code: 9 },
};
const groups = new Map();
const keys = new Set();
const sourceCoverage = new Map();
const knownTotals = new Map();
const positionTotals = Object.fromEntries(cohorts.map((cohort) => [cohort, Object.fromEntries(positions.map((position) => [position, 0]))]));
const classifierSanity = Object.fromEntries(stacks.map((stack) => [stack, {
  openShoves: 0,
  shoveAllinFlag: 0,
  shoveEffectiveAmountOnly: 0,
  regularThreeBbOpens: 0,
  normalThreeBbAsShove: 0,
  nonExactREffectiveAllin: 0
}]));

for (const row of rows) {
  assert.ok(cohorts.includes(row.cohort), `known cohort ${row.cohort}`);
  assert.ok(rawStacks.includes(row.stack_bucket), `known stack ${row.stack_bucket}`);
  assert.ok(positions.includes(row.position_group), `known position ${row.position_group}`);
  assert.equal(row.table_filter, "cnt_players = 7");
  assert.equal(Number(row.table_size), 7);
  assert.equal(Number(row.position_order), positionContract[row.position_group].order);
  assert.equal(Number(row.position_code), positionContract[row.position_group].code);
  assert.equal(row.window_start, windowStart);
  assert.equal(row.window_end, windowEnd);
  assert.equal(normalizeHandClass(row.hand_class), row.hand_class, `canonical source hand ${row.hand_class}`);
  const key = [row.cohort, row.stack_bucket, row.position_group, row.hand_class].join("|");
  assert.ok(!keys.has(key), `unique source grain ${key}`);
  keys.add(key);
  const publicStack = publicStackForRaw[row.stack_bucket];
  const group = [row.cohort, publicStack, row.position_group].join("|");
  const rawState = [row.cohort, row.stack_bucket, row.position_group].join("|");
  const state = {
    eligible: Number(row.eligible_opportunities),
    known: Number(row.known_card_opportunities),
    lookupMismatch: Number(row.lookup_mismatch_opportunities),
    firstObservedAt: row.first_observed_at,
    lastObservedAt: row.last_observed_at,
  };
  assert.ok(Number.isInteger(state.eligible) && Number.isInteger(state.known) && state.eligible >= state.known && state.known > 0);
  if (sourceCoverage.has(rawState)) assert.deepEqual(state, sourceCoverage.get(rawState), `${rawState} repeated coverage`);
  else sourceCoverage.set(rawState, state);
  if (!groups.has(group)) groups.set(group, new Map());
  const groupedHands = groups.get(group);
  groupedHands.set(row.hand_class, (groupedHands.get(row.hand_class) || 0) + Number(row.opportunities));
  const opportunities = Number(row.opportunities);
  const raises = Number(row.raises_total);
  const regular = Number(row.regular_raise);
  const shove = Number(row.open_shove);
  const limp = Number(row.limp);
  const fold = Number(row.fold_other);
  const shoveAllinFlag = Number(row.shove_allin_flag);
  const shoveEffectiveAmountOnly = Number(row.shove_effective_amount_only);
  const regularThreeBbOpen = Number(row.regular_three_bb_open);
  const normalThreeBbAsShove = Number(row.normal_three_bb_as_shove);
  const nonExactREffectiveAllin = Number(row.non_exact_r_effective_allin);
  assert.ok([opportunities, raises, regular, shove, limp, fold].every((value) => Number.isInteger(value) && value >= 0), `${key} integer action counts`);
  assert.ok([shoveAllinFlag, shoveEffectiveAmountOnly, regularThreeBbOpen, normalThreeBbAsShove, nonExactREffectiveAllin].every((value) => Number.isInteger(value) && value >= 0), `${key} integer classifier diagnostics`);
  assert.equal(raises, regular + shove, `${key} regular plus effective shove equals RFI`);
  assert.equal(opportunities, raises + limp + fold, `${key} exclusive action split`);
  assert.equal(shove, shoveAllinFlag + shoveEffectiveAmountOnly, `${key} every shove has one explicit classifier reason`);
  assert.equal(normalThreeBbAsShove, 0, `${key} normal 2.5–3.5 BB open cannot be a shove`);
  knownTotals.set(rawState, (knownTotals.get(rawState) || 0) + opportunities);
  positionTotals[row.cohort][row.position_group] += opportunities;
  const sanity = classifierSanity[publicStack];
  sanity.openShoves += shove;
  sanity.shoveAllinFlag += shoveAllinFlag;
  sanity.shoveEffectiveAmountOnly += shoveEffectiveAmountOnly;
  sanity.regularThreeBbOpens += regularThreeBbOpen;
  sanity.normalThreeBbAsShove += normalThreeBbAsShove;
  sanity.nonExactREffectiveAllin += nonExactREffectiveAllin;
}
for (const [key, state] of sourceCoverage) assert.equal(knownTotals.get(key), state.known, `${key} known-card reconciliation`);
for (const cohort of cohorts) {
  const ladder = positions.map((position) => positionTotals[cohort][position]);
  for (let index = 1; index < ladder.length; index += 1) {
    assert.ok(ladder[index - 1] > ladder[index], `${cohort} opportunities decrease ${positions[index - 1]} -> ${positions[index]}`);
  }
}

const coverage = [];
for (const stack of stacks) for (const position of positions) {
  const byCohort = {};
  let passesGate = true;
  for (const cohort of cohorts) {
    const group = groups.get([cohort, stack, position].join("|")) || new Map();
    const samples = [...group.values()];
    const complete = samples.filter((opportunities) => opportunities >= 50).length;
    const minN = group.size === 169 ? Math.min(...samples) : 0;
    byCohort[cohort] = { rows: group.size, complete, minN };
    if (group.size !== 169 || complete !== 169) passesGate = false;
  }
  coverage.push({ stack, position, passesGate, cohorts: byCohort });
}

const passing = coverage.filter((state) => state.passesGate);
const failing = coverage.filter((state) => !state.passesGate);
const knownCards = [...sourceCoverage.values()].reduce((result, state) => {
  result.eligible += state.eligible;
  result.known += state.known;
  result.lookupMismatch += state.lookupMismatch;
  if (!result.firstObservedAt || state.firstObservedAt < result.firstObservedAt) result.firstObservedAt = state.firstObservedAt;
  if (!result.lastObservedAt || state.lastObservedAt > result.lastObservedAt) result.lastObservedAt = state.lastObservedAt;
  return result;
}, { eligible: 0, known: 0, lookupMismatch: 0, firstObservedAt: "", lastObservedAt: "" });
knownCards.pct = Number((knownCards.known / knownCards.eligible * 100).toFixed(6));
const diagnostics = {
  schema: "ff-rfi-field-action-coverage-v3",
  status: failing.length ? "blocked" : "ready",
  table: "7-max",
  exactCellMinimum: 50,
  windowStart,
  windowEnd,
  source: path.basename(source),
  sourceRows: rows.length,
  sourceSha256: crypto.createHash("sha256").update(sourceText).digest("hex"),
  sourceCoverageStates: sourceCoverage.size,
  stackAggregation: stackComponents,
  passingStates: passing.length,
  failingStates: failing,
  knownCards,
  classifierSanity,
  positionOpportunities: positionTotals,
  coverage,
};
if (options.diagnostics) fs.writeFileSync(options.diagnostics, `${JSON.stringify(diagnostics, null, 2)}\n`);

console.log(JSON.stringify({
  source,
  rows: rows.length,
  groups: groups.size,
  status: diagnostics.status,
  classifierSanity,
  positionTotals,
  sourceCoverageStates: sourceCoverage.size,
  stackAggregation: stackComponents,
  passingStates: passing.map((state) => `${state.stack}|${state.position}`),
  failingStates: failing,
  knownCards,
}, null, 2));
assert.equal(passing.length, stacks.length * positions.length, "all 6x6 public RFI states must satisfy the exact publication gate");
console.log("RFI field-action raw source audit: ok");
