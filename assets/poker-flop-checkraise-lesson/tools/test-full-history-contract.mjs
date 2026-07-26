#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const lessonDir = path.resolve(here, "..");
const dataPath = path.join(lessonDir, "data.js");
const matrixPath = path.join(lessonDir, "field-matrix.js");
const cssPath = path.join(lessonDir, "field-matrix.css");
const dataSource = fs.readFileSync(dataPath, "utf8");
const matrixSource = fs.readFileSync(matrixPath, "utf8");
const cssSource = fs.readFileSync(cssPath, "utf8");

assert.doesNotMatch(dataSource, /Q2 2026|2026-Q2|deterministic_hh_sample|pending_exact_extract|observedLeague1/);
assert.doesNotMatch(dataSource, /fieldMatrix\s*:/, "old sampled board matrix is removed at data level");
assert.match(dataSource, /status:\s*FULL_HISTORY_FIELD \? "ready" : "methodology_only"/);
assert.match(dataSource, /cohortOrder:\s*\["league1", "league2", "league3", "novice"\]/);

const checkedInContext = { window: {} };
vm.runInNewContext(dataSource, checkedInContext, { filename: dataPath });
const checkedInData = checkedInContext.window.FF_POKER_FIELD_LESSON_DATA;
assert(["methodology_only", "ready"].includes(checkedInData.status), "checked-in check-raise data is either the safe sentinel or a validated ready artifact");
if (checkedInData.status === "ready") {
  assert(checkedInData.fullHistory, "ready check-raise data carries the exact full-history layer");
  assert.equal(checkedInData.fullHistory.meta.rankTiming, "exact_as_of_hand");
  assert.match(checkedInData.fullHistory.meta.artifactSha256, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(checkedInData.fullHistory), /\/private\/|SELECT\s|WITH\s+rank_intervals/i);
} else {
  assert.equal(checkedInData.fullHistory, null);
}

const rows = [];
for (const cohort of ["league1", "league2", "league3", "novice"]) {
  rows.push({
    node: "bb_response", cohort, position: "BTN", depthBand: "20-30",
    opportunities: 100, checksBack: 0, cbets: 0, facedRaises: 0,
    folds: 20, calls: 60, raises: 20, other: 0, publishable: true
  });
  rows.push({
    node: "cbet", cohort, position: "BTN", depthBand: "20-30",
    opportunities: 100, checksBack: 25, cbets: 75, facedRaises: 10,
    folds: 0, calls: 0, raises: 0, other: 0, publishable: true
  });
}
const fixture = {
  schemaVersion: 1,
  meta: {
    rankTiming: "exact_as_of_hand",
    minimumDenominator: 50,
    windowStartInclusive: "2023-09-01",
    windowEndExclusive: "2026-07-22"
  },
  rows
};
const injectedSource = dataSource.replace(
  /\/\* FF_FULL_HISTORY_FIELD_START \*\/[\s\S]*?\/\* FF_FULL_HISTORY_FIELD_END \*\//,
  `/* FF_FULL_HISTORY_FIELD_START */ ${JSON.stringify(fixture)} /* FF_FULL_HISTORY_FIELD_END */`
);
const context = { window: {} };
vm.runInNewContext(injectedSource, context, { filename: dataPath });
const data = context.window.FF_POKER_FIELD_LESSON_DATA;
assert.equal(data.status, "ready");
assert.equal(data.fullHistory.meta.rankTiming, "exact_as_of_hand");
assert.deepEqual(Array.from(data.cohorts, (cohort) => cohort.key), ["league1", "league2", "league3", "novice"]);
for (const cohort of data.cohorts) {
  assert.equal(cohort.sample, 100);
  assert.equal(Math.round(cohort.actions.reduce((sum, action) => sum + action.pct, 0)), 100);
}
for (const example of [...data.examples.value, ...data.examples.bluff]) {
  assert.equal(example.evidence.status, "methodology_only");
  assert.equal(Object.hasOwn(example.evidence, "league1"), false, "methodology has no fabricated cohort counts");
  assert.equal(Object.hasOwn(example.evidence, "players"), false, "methodology has no fabricated player count");
}
assert.equal(Object.hasOwn(data.examples, "observedLeague1"), false);

assert.match(matrixSource, /const source = lessonData\?\.fullHistory/);
assert.match(matrixSource, /const methodologyOnly = lessonData\?\.status === "methodology_only" && !source/);
assert.match(matrixSource, /function renderPending\(\)/);
assert.match(matrixSource, /Пока здесь намеренно нет процентов и сравнительных выводов/);
assert.match(matrixSource, /const COHORTS = \[[\s\S]*league1[\s\S]*league2[\s\S]*league3[\s\S]*novice/);
assert.match(matrixSource, /row\.publishable !== \(opportunities >= 50\)/);
assert.match(matrixSource, /folds \+ calls \+ raises \+ other !== opportunities/);
assert.doesNotMatch(matrixSource, /STRUCTURE_KEYS|foldViews|matched sizing|Q2 2026/);
assert.match(cssSource, /structure-response-bar[\s\S]*is-fold[\s\S]*is-call[\s\S]*is-raise/);
assert.match(cssSource, /example-observed\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(cssSource, /structure-league-pending[\s\S]*min-height:\s*260px/);

console.log("flop check-raise full-history contract: ok");
