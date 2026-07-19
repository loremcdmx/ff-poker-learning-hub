#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const lessonDirectory = path.resolve(directory, "..");
const repo = path.resolve(lessonDirectory, "../..");
const dataSource = fs.readFileSync(path.join(lessonDirectory, "data/resteal-rank-data.js"), "utf8");
const runtimeSource = fs.readFileSync(path.join(lessonDirectory, "rank-comparison.js"), "utf8");
const cssSource = fs.readFileSync(path.join(lessonDirectory, "rank-comparison.css"), "utf8");
const htmlSource = fs.readFileSync(path.join(repo, "resteal-lesson.html"), "utf8");

const dataContext = { window: {} };
vm.runInNewContext(dataSource, dataContext, { filename: "resteal-rank-data.js" });
const data = dataContext.window.PokerRestealRankData;

const runtimeContext = {
  window: { PokerRestealRankData: data },
  document: { getElementById() { return null; } },
};
vm.runInNewContext(runtimeSource, runtimeContext, { filename: "rank-comparison.js" });
const lowN = runtimeContext.window.PokerRestealRankLowN;

assert(lowN, "low-N estimator is exposed for focused verification");
assert.equal(lowN.estimateBelow, 5);
assert.equal(lowN.priorStrength, 16);

const hand = "AQs";
const depth = "25-30";
const handIndex = data.meta.handOrder.indexOf(hand);
const noviceCell = data.charts.novice.CO["2.5"][depth].cells[handIndex];
assert.deepEqual(Array.from(noviceCell), [4, 0, 0, 1, 3], "frozen low-N anchor changed");

let priorN = 0;
let priorJams = 0;
const otherCohortCells = [];
for (const cohort of data.meta.cohortOrder) {
  if (cohort === "novice") continue;
  const cell = data.charts[cohort].CO["2.5"][depth].cells[handIndex];
  otherCohortCells.push(Array.from(cell));
  priorN += cell[0];
  priorJams += cell[4];
}
assert.deepEqual(otherCohortCells, [
  [13, 1, 0, 4, 8],
  [12, 0, 0, 1, 11],
  [3, 0, 0, 0, 3],
], "other-cohort low-N anchors changed");
assert.deepEqual([priorN, priorJams], [28, 22], "leave-one-cohort-out prior anchor changed");

const estimate = lowN.displayCell(data, "novice", "CO", "2.5", depth, handIndex, noviceCell);
const expected = (noviceCell[4] + 16 * priorJams / priorN) / (noviceCell[0] + 16) * 100;
assert.equal(estimate.available, true);
assert.equal(estimate.estimated, true);
assert.equal(estimate.prior.source, "same-spot-hand");
assert.equal(estimate.prior.opportunities, 28);
assert(Math.abs(estimate.rate - expected) < 1e-10, "Dirichlet-smoothed jam marginal is wrong");
assert(estimate.rate > 75 && estimate.rate < 80, "AQs estimate must blend the N=4 observation with the leave-one-cohort-out prior");

const observed = lowN.displayCell(data, "league3", "BTN", "2.0", "25-40", handIndex, data.charts.league3.BTN["2.0"]["25-40"].cells[handIndex]);
assert.equal(observed.estimated, false, "N>=5 must remain an observed rate");
assert.equal(observed.rate, data.charts.league3.BTN["2.0"]["25-40"].cells[handIndex][4] / data.charts.league3.BTN["2.0"]["25-40"].cells[handIndex][0] * 100);

const empty = lowN.displayCell(data, "novice", "CO", "2.5", depth, handIndex, [0, 0, 0, 0, 0]);
assert.equal(empty.available, false, "N=0 must remain no data");
assert.equal(empty.estimated, false, "N=0 must not be invented by smoothing");

const fallbackData = {
  meta: {
    cohortOrder: ["novice", "league3"],
    positionOrder: ["CO"],
    sizeOrder: ["2.5"],
    sourceDepthOrder: ["25-30"],
  },
  charts: {
    novice: { CO: { "2.5": { "25-30": { cells: [[2, 2, 0, 0, 0], [100, 0, 0, 0, 100]] } } } },
    league3: { CO: { "2.5": { "25-30": { cells: [[0, 0, 0, 0, 0], [100, 80, 0, 0, 20]] } } } },
  },
};
const fallback = lowN.displayCell(fallbackData, "novice", "CO", "2.5", "25-30", 0, fallbackData.charts.novice.CO["2.5"]["25-30"].cells[0]);
assert.equal(fallback.prior.source, "same-spot-all-hands", "empty same-hand prior must fall back safely");
assert.equal(fallback.prior.rate, 20, "fallback must exclude the current cohort's 100% jam sample");
assert(Math.abs(fallback.rate - (16 * 0.2 / 18 * 100)) < 1e-10);

assert.match(runtimeSource, /dataset\.rateKind = display\.estimated \? "estimate"/, "estimated cells expose their semantic kind");
assert.match(runtimeSource, /фиолетовый угол и знак ≈ — сглаженная оценка при N 1–4[\s\S]*16 условных рук/, "source copy explains estimates");
assert.match(cssSource, /\.rank-cell\.is-estimated[^}]*--sample-marker:\s*#c49af8/, "estimated cells have a distinct corner marker");
assert.match(htmlSource, /≈ оценка · N 1–4/, "legend labels the smoothed estimate");
assert.match(htmlSource, /нет данных · N 0/, "legend keeps true no-data cells separate");

console.log(`resteal rank low-N contract passed: ${hand} N=${noviceCell[0]}, prior N=${priorN}, estimate=${estimate.rate.toFixed(2)}%`);
