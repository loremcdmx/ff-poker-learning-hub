import assert from "node:assert/strict";
import fs from "node:fs";
import { handShape, normalizeHandClass } from "./field-action-quality.mjs";

const source = process.argv[2];
if (!source) throw new Error("Usage: node audit-field-action-source.mjs /path/to/field-action.csv");

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
    else if (char === ',') { row.push(cell); cell = ""; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const header = rows.shift();
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

const rows = parseCsv(fs.readFileSync(source, "utf8"));
const cohorts = ["l3top", "l3", "l2", "l1"];
const stacks = ["70+", "30-70", "20-30", "15-20", "12-15", "10-12", "8-10", "6-8", "<6"];
const positions = ["EP", "MP", "HJ", "CO", "BTN", "SB"];
const groups = new Map();
const keys = new Set();

for (const row of rows) {
  assert.ok(cohorts.includes(row.cohort), `known cohort ${row.cohort}`);
  assert.ok(stacks.includes(row.stack_bucket), `known stack ${row.stack_bucket}`);
  assert.ok(positions.includes(row.position_group), `known position ${row.position_group}`);
  assert.equal(row.table_filter, "cnt_players_lookup_position BETWEEN 7 AND 9");
  assert.equal(row.window_start, "2025-10-01");
  assert.equal(row.window_end, "2026-07-16");
  assert.equal(normalizeHandClass(row.hand_class), row.hand_class, `canonical source hand ${row.hand_class}`);
  const key = [row.cohort, row.stack_bucket, row.position_group, row.hand_class].join("|");
  assert.ok(!keys.has(key), `unique source grain ${key}`);
  keys.add(key);
  const group = [row.cohort, row.stack_bucket, row.position_group].join("|");
  groups.set(group, (groups.get(group) || 0) + 1);
  const opportunities = Number(row.opportunities);
  const raises = Number(row.raises_total);
  const regular = Number(row.regular_raise);
  const shove = Number(row.open_shove);
  const limp = Number(row.limp);
  const fold = Number(row.fold_other);
  assert.ok([opportunities, raises, regular, shove, limp, fold].every(Number.isFinite), `${key} finite actions`);
  assert.equal(raises, regular + shove, `${key} regular plus shove equals RFI`);
  assert.equal(opportunities, raises + limp + fold, `${key} exclusive action split`);
}

assert.equal(rows.length, cohorts.length * stacks.length * positions.length * 169);
for (const cohort of cohorts) for (const stack of stacks) for (const position of positions) {
  assert.equal(groups.get([cohort, stack, position].join("|")), 169, `${cohort} ${stack} ${position} has all 169 classes`);
}

const target = rows.filter((row) => row.cohort === "l3top" && row.stack_bucket === "<6" && row.position_group === "BTN");
const shapeSummary = {};
for (const shape of ["pair", "suited", "offsuit"]) {
  const values = target.filter((row) => handShape(row.hand_class) === shape).map((row) => Number(row.opportunities)).sort((left, right) => left - right);
  shapeSummary[shape] = {
    classes: values.length,
    opportunities: values.reduce((sum, value) => sum + value, 0),
    medianN: values[Math.floor(values.length / 2)],
    cellsUnder30: values.filter((value) => value < 30).length
  };
}
assert.equal(shapeSummary.suited.classes, 78);
assert.equal(shapeSummary.offsuit.classes, 78);
assert.ok(shapeSummary.suited.medianN * 2.5 < shapeSummary.offsuit.medianN, "physical-combo count explains the flat-N suppression bias");

console.log(JSON.stringify({ source, rows: rows.length, groups: groups.size, target: "l3top|<6|BTN", shapeSummary }, null, 2));
console.log("RFI field-action raw source audit: ok");
