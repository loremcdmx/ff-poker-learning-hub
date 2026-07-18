import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { comboCount, handShape, normalizeHandClass } from "./field-action-quality.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = { window: { atob } };
vm.runInNewContext(fs.readFileSync(path.join(root, "field-action-data.js"), "utf8"), context);
vm.runInNewContext(fs.readFileSync(path.join(root, "stack-data.js"), "utf8"), context);

const F = context.window.PokerRfiFieldActionData;
const S = context.window.PokerRfiStackData;
assert.ok(F && S);
assert.equal(F.handOrder.length, 169);
assert.equal(new Set(F.handOrder).size, 169);
for (const hand of F.handOrder) {
  assert.equal(normalizeHandClass(hand), hand, `canonical hand class ${hand}`);
  assert.ok([4, 6, 12].includes(comboCount(hand)), `combo count ${hand}`);
}
assert.equal(normalizeHandClass("2As"), "A2s");
assert.equal(normalizeHandClass("qJo"), "QJo");
assert.throws(() => normalizeHandClass("AAo"));
assert.throws(() => normalizeHandClass("AK"));

let charts = 0;
let suppressed = 0;
let suitedOffsuitComparisons = 0;
for (const cohortKey of F.cohortOrder) for (const stack of F.stackOrder) for (const position of F.positions) {
  const chart = S.fieldChart(cohortKey, stack, position);
  charts += 1;
  for (const values of [chart.sample, chart.raise, chart.shove, chart.limp]) {
    assert.equal(values.length, 169, `${cohortKey} ${stack} ${position} complete 169-cell payload`);
  }
  for (let index = 0; index < 169; index += 1) {
    const displayedTotal = chart.raise[index] + chart.shove[index] + chart.limp[index];
    assert.ok(displayedTotal >= 0 && displayedTotal <= 1001, `${cohortKey} ${stack} ${position} ${F.handOrder[index]} valid action split`);
    if (chart.sample[index]) continue;
    suppressed += 1;
    assert.equal((chart.players[index] || 0) + (chart.months[index] || 0), 0, "exact low-N supporting data remains private");
  }
  const displayedEntry = (index) => [chart.raise, chart.shove, chart.limp].reduce((sum, values) => sum + values[index], 0) / 10;
  for (let index = 0; index < F.handOrder.length; index += 1) {
    const hand = F.handOrder[index];
    if (!hand.endsWith("s")) continue;
    const offsuitIndex = F.handOrder.indexOf(hand.slice(0, -1) + "o");
    if (chart.sample[index] && chart.sample[offsuitIndex]) continue;
    suitedOffsuitComparisons += 1;
    assert.ok(displayedEntry(index) + 15 >= displayedEntry(offsuitIndex), `${cohortKey} ${stack} ${position} ${hand} has no sampling-created suited gap`);
  }
}

const chart = S.fieldChart("l3top", "<6", "BTN");
const cells = F.handOrder.map((hand, index) => ({
  hand,
  shape: handShape(hand),
  sample: chart.sample[index],
  estimatedEntry: (chart.raise[index] + chart.shove[index] + chart.limp[index]) / 10
}));
const median = (values) => values.slice().sort((left, right) => left - right)[Math.floor(values.length / 2)];
const suited = cells.filter((cell) => cell.shape === "suited");
const offsuit = cells.filter((cell) => cell.shape === "offsuit");
assert.ok(suited.filter((cell) => !cell.sample).length >= 70, "fixture still exercises the suited N<30 collapse condition");
assert.ok(offsuit.filter((cell) => !cell.sample).length <= 5, "fixture preserves the physical-combo sampling contrast");
assert.ok(median(suited.map((cell) => cell.estimatedEntry)) > median(offsuit.map((cell) => cell.estimatedEntry)), "suited sector no longer collapses below offsuit");
assert.equal(suited.filter((cell) => cell.estimatedEntry === 0).length, 0, "no suited cell is rendered as a false zero");
for (const hand of ["A2s", "K3s", "Q7s", "T6s", "76s"]) {
  assert.ok(cells.find((cell) => cell.hand === hand).estimatedEntry >= 10, `${hand} keeps a plausible non-zero estimate`);
}

console.log(JSON.stringify({ charts, cells: charts * 169, suppressed, suitedOffsuitComparisons, btnUnder6: {
  suitedSuppressed: suited.filter((cell) => !cell.sample).length,
  offsuitSuppressed: offsuit.filter((cell) => !cell.sample).length,
  suitedMedianEstimate: median(suited.map((cell) => cell.estimatedEntry)),
  offsuitMedianEstimate: median(offsuit.map((cell) => cell.estimatedEntry))
} }));
console.log("RFI field-action data quality: ok");
