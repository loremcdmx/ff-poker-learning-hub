#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const lessonDirectory = path.resolve(directory, "..");
const helperSource = fs.readFileSync(path.resolve(lessonDirectory, "../poker-kit/observed-frequency-confidence.js"), "utf8");
const dataSource = fs.readFileSync(path.join(lessonDirectory, "data/resteal-rank-data.js"), "utf8");
const runtimeSource = fs.readFileSync(path.join(lessonDirectory, "rank-comparison.js"), "utf8");

const runtimeContext = {
  window: {},
  document: { getElementById() { return null; } }
};
runtimeContext.globalThis = runtimeContext.window;
vm.runInNewContext(helperSource, runtimeContext, { filename: "observed-frequency-confidence.js" });
vm.runInNewContext(dataSource, runtimeContext, { filename: "resteal-rank-data.js" });
vm.runInNewContext(runtimeSource, runtimeContext, { filename: "rank-comparison.js" });

const policy = runtimeContext.window.PokerRestealRankConfidence;
assert(policy, "resteal chart exposes its shared confidence adapter");
assert.equal(policy.minimum, 50);
const dataContract = runtimeContext.window.PokerRestealRankDataContract;
assert(dataContract, "resteal chart exposes its fail-closed source contract");

for (const cell of [
  [1, 0, 0, 0, 1],
  [2, 0, 0, 0, 2],
  [34, 0, 0, 0, 34],
  [38, 0, 0, 0, 38],
  [49, 0, 0, 0, 49]
]) {
  const display = policy.displayCell(cell);
  assert.equal(display.available, false, `N=${cell[0]} stays hidden`);
  assert.equal(display.rate, null, `N=${cell[0]} cannot leak a percentage`);
}

const exact = policy.displayCell([50, 16, 32, 1, 1]);
assert.equal(exact.available, true, "N=50 is the first publishable cell");
assert.equal(exact.rate, 2, "N=50 uses exact observed counters without smoothing");
const above = policy.displayCell([51, 1, 46, 4, 0]);
assert.equal(above.available, true);
assert.equal(above.rate, 0);

for (const forbidden of ["Dirichlet", "LOW_N_PRIOR", "priorForCell", "is-estimated", "estimateBelow", "≈", " · N "]) {
  assert.ok(!runtimeSource.includes(forbidden), `runtime removes learner-facing or modeled ${forbidden}`);
}
assert.match(runtimeSource, /var Confidence = window\.FFObservedFrequencyConfidence/);
assert.match(runtimeSource, /Confidence\.rate\(jams, opportunities\)/);
assert.doesNotMatch(runtimeSource, /display\.available \? percent\(rate, 0\) : "—"/);
assert.doesNotMatch(runtimeSource, /недостаточно данных/);
assert.doesNotMatch(runtimeSource, /\.disabled\s*=|item\.disabled/, "the published preset catalog has no disabled selector states");
assert.match(runtimeSource, /full-history-r15-r18/);
assert.match(runtimeSource, /effective-shove-v1/);
assert.match(runtimeSource, /root\.classList\.add\("is-data-unavailable"\)/, "invalid snapshots render a controlled unavailable state");

const data = runtimeContext.window.PokerRestealRankData;
assert.equal(dataContract.failure(data), "", "the checked-in full-history payload satisfies the browser publication contract");
assert.equal(dataContract.isPublishable(data), true);

const unavailableClasses = new Set();
const unavailableAttributes = new Map();
const unavailableRoot = {
  innerHTML: "",
  classList: { add(value) { unavailableClasses.add(value); } },
  setAttribute(name, value) { unavailableAttributes.set(name, value); },
};
const unavailableContext = {
  window: {},
  document: {
    getElementById(id) {
      if (id === "rankEvidenceSlide") return unavailableRoot;
      return null;
    },
  },
};
unavailableContext.globalThis = unavailableContext.window;
vm.runInNewContext(helperSource, unavailableContext, { filename: "observed-frequency-confidence.js" });
unavailableContext.window.PokerRestealRankData = { version: "invalid-fixture", meta: {} };
assert.doesNotThrow(() => vm.runInNewContext(runtimeSource, unavailableContext, { filename: "rank-comparison.js" }), "invalid payload must not throw in the learner flow");
assert(unavailableClasses.has("is-data-unavailable"));
assert.equal(unavailableAttributes.get("data-rank-data-state"), "unavailable");
assert.match(unavailableRoot.innerHTML, /Ошибка данных FF/);
assert.match(unavailableRoot.innerHTML, /Этот релиз нельзя публиковать/);
assert.doesNotMatch(unavailableRoot.innerHTML, /\d+(?:[,.]\d+)?%/, "legacy percentages cannot leak into the fail-closed message");

const handOrder = Array.from({ length: 169 }, (_, index) => `H${index}`);
const cohortOrder = ["novice", "league3", "league2", "league1"];
const exactCells = Array.from({ length: 169 }, () => [50, 20, 20, 5, 5]);
const scenarioOrder = ["2.0|25-30", "2.0|30-35", "2.0|35-40", "2.0|25-40", "2.5-3.0|25-40"];
const scenarios = {
  "2.0|25-30": { size: "2.0", depth: "25-30", label: "2 BB · 25–30 BB", sourceSlices: [{ size: "2.0", depth: "25-30" }] },
  "2.0|30-35": { size: "2.0", depth: "30-35", label: "2 BB · 30–35 BB", sourceSlices: [{ size: "2.0", depth: "30-35" }] },
  "2.0|35-40": { size: "2.0", depth: "35-40", label: "2 BB · 35–40 BB", sourceSlices: [{ size: "2.0", depth: "35-40" }] },
  "2.0|25-40": { size: "2.0", depth: "25-40", label: "2 BB · 25–40 BB", sourceSlices: [{ size: "2.0", depth: "25-40" }] },
  "2.5-3.0|25-40": { size: "2.5-3.0", depth: "25-40", label: "2,5–3 BB · 25–40 BB", sourceSlices: [{ size: "2.5", depth: "25-40" }, { size: "3.0", depth: "25-40" }] },
};
const presetOrder = ["CO", "BTN"].flatMap((position) => scenarioOrder.map((scenario) => `${position}|${scenario}`));
const validFixture = {
  version: "resteal-rank-cube-20260722-full-history-r15-r18-v4",
  meta: {
    windowStartInclusive: "2023-09-01T00:00:00Z",
    windowEndExclusive: "2026-07-22T00:00:00Z",
    cohortOrder,
    cohorts: {
      novice: { ranks: [15, 16, 17, 18] },
      league3: { ranks: [11, 12, 13, 14] },
      league2: { ranks: [6, 7, 8, 9, 10] },
      league1: { ranks: [1, 2, 3, 4, 5] },
    },
    positionOrder: ["CO", "BTN"],
    sourceSizeOrder: ["2.0", "2.5", "3.0"],
    scenarioOrder,
    scenarios,
    presetOrder,
    handOrder,
    sampleThresholds: { exactCellMinimum: 50 },
    actionContract: { jam: "preflop_action='R' AND (is_preflop_allin=1 OR raise_and_blind_made_amount_bb - posted_blind_bb >= effective_stack_bb - 0.01)" },
    provenance: {
      rankIntervals: {
        queryJobId: "mcp_bq_job_0795894633234a1dbed2032ae29ee179",
        sourceRows: 19699,
        usableRows: 19698,
        excludedZeroLength: 1,
        users: 3881,
        sha256: "7510e40b42cad7bf6bce6dbca9c2ba0f5d157a8ff2df5b7f9f28ca37eafb1d9e",
      },
      abi: {
        queryJobId: "mcp_bq_1aae14822e7542809baff5659212b349",
        formula: "SUM(load_usd)/SUM(entries)",
        querySha256: "6b7bc7617193707d018961c25ea2f7710e590806e1cc168ecda5c7c4d867b809",
      },
      handCube: {
        classifier: "effective-shove-v1",
        mergeSchema: "ff-resteal-rank-cube-merge-v1",
        shardStrategy: "immutable-user-id",
        templateSha256: "b".repeat(64),
        sha256: "c".repeat(64),
        queryJobIds: ["mcp_ch_job_deadbeef01", "sync:" + "e".repeat(64)],
        shards: [
          { rankMin: 1, rankMax: 18, windowStartInclusive: "2023-09-01T00:00:00Z", windowEndExclusive: "2026-07-22T00:00:00Z", queryJobId: "mcp_ch_job_deadbeef01", executionMode: "async", renderedSqlSha256: "d".repeat(64), exportSha256: "f".repeat(64), exportRows: 100, rankIntervals: 2000, rankUsers: 1940, userShard: { index: 0, count: 2, eligibleUsers: 3881, userIdsSha256: "1".repeat(64) } },
          { rankMin: 1, rankMax: 18, windowStartInclusive: "2023-09-01T00:00:00Z", windowEndExclusive: "2026-07-22T00:00:00Z", queryJobId: "sync:" + "e".repeat(64), executionMode: "sync", renderedSqlSha256: "e".repeat(64), exportSha256: "0".repeat(64), exportRows: 100, rankIntervals: 2000, rankUsers: 1941, userShard: { index: 1, count: 2, eligibleUsers: 3881, userIdsSha256: "2".repeat(64) } },
        ],
      },
    },
  },
  charts: Object.fromEntries(cohortOrder.map((cohort) => [cohort, {
    ...Object.fromEntries(presetOrder.map((key) => [key, { cells: exactCells.map((cell) => [...cell]) }])),
  }])),
};
assert.equal(dataContract.failure(validFixture), "", "complete exact fixture is publishable");
assert.equal(dataContract.isPublishable(validFixture), true);
const validTimeFixture = structuredClone(validFixture);
validTimeFixture.meta.provenance.handCube.shardStrategy = "contiguous-time";
validTimeFixture.meta.provenance.handCube.shards[0] = {
  ...validTimeFixture.meta.provenance.handCube.shards[0],
  windowEndExclusive: "2025-01-01T00:00:00Z",
  rankUsers: 2100,
  userShard: { index: 0, count: 1, eligibleUsers: 2100, userIdsSha256: "3".repeat(64) },
};
validTimeFixture.meta.provenance.handCube.shards[1] = {
  ...validTimeFixture.meta.provenance.handCube.shards[1],
  windowStartInclusive: "2025-01-01T00:00:00Z",
  rankUsers: 3300,
  userShard: { index: 0, count: 1, eligibleUsers: 3300, userIdsSha256: "4".repeat(64) },
};
assert.equal(dataContract.failure(validTimeFixture), "", "contiguous full-history time shards are publishable");
for (const mutate of [
  (fixture) => { fixture.meta.windowStartInclusive = "2026-01-01T00:00:00Z"; },
  (fixture) => { fixture.meta.cohorts.novice.ranks = [15, 16, 17]; },
  (fixture) => { fixture.meta.provenance.handCube.classifier = "strict-allin-only"; },
  (fixture) => { fixture.charts.novice["BTN|2.0|25-40"].cells[0] = [49, 20, 19, 5, 5]; },
]) {
  const invalid = structuredClone(validFixture);
  mutate(invalid);
  assert(dataContract.failure(invalid), "source or coverage drift must fail closed");
  assert.equal(dataContract.isPublishable(invalid), false);
}

console.log("resteal rank confidence contract: exact percentages start at N=50; no low-sample modeling");
