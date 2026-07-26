#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const lessonRoot = path.resolve(directory, "..");
const readinessSource = readFileSync(path.resolve(lessonRoot, "field-data-readiness.js"), "utf8");
const publishedSource = readFileSync(path.resolve(lessonRoot, "data/vs3bet-field-data.js"), "utf8");
const sha = "a".repeat(64);

function evaluate(dataSource) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(dataSource, context);
  vm.runInContext(readinessSource, context);
  return JSON.parse(JSON.stringify(context.window.FFVs3BetFieldDataReadiness));
}

const published = evaluate(publishedSource);
if (/"status"\s*:\s*"ready"/.test(publishedSource)) {
  assert.equal(published.ready, true, `checked-in ready aggregate failed closed: ${published.reasons.join(", ")}`);
  assert.deepEqual(published.reasons, [], "a checked-in ready aggregate has no hidden readiness failures");
} else {
  assert.equal(published.ready, false, "checked-in methodology sentinel cannot pass the readiness contract");
  assert(published.reasons.includes("status"), "methodology-only status is surfaced internally");
  assert(published.reasons.includes("version"), "non-publishable sentinel version is surfaced internally");
  assert(published.reasons.includes("rank_execution_identity"), "missing rank execution identity is surfaced internally");
  assert(published.reasons.includes("cube_shards"), "absence of publishable shards is surfaced internally");
}

const validPayload = {
  status: "ready",
  version: "vs3bet-field-cube-20260722-v6",
  meta: {
    windowStartInclusive: "2023-09-01T00:00:00Z",
    windowEndExclusive: "2026-07-22T00:00:00Z",
    rankAssignment: "Exact half-open rank interval at played_at; real players only.",
    cohorts: {
      novice: { ranks: [15, 16, 17, 18] },
      league3: { ranks: [11, 12, 13, 14] },
      league2: { ranks: [6, 7, 8, 9, 10] },
      league1: { ranks: [1, 2, 3, 4, 5] }
    },
    hands: Array.from({ length: 169 }, (_, index) => `H${index}`),
    enabledComparisonKeys: ["BTN|IP|80+|all"],
    samplePolicy: { exactFrequencyMinimumN: 50, smoothing: false },
    provenance: {
      rankIntervals: {
        rows: 10,
        queryJobId: "mcp_bq_job_valid",
        executionMode: "async",
        querySha256: sha,
        sha256: sha,
        windowStartInclusive: "2023-09-01T00:00:00Z",
        windowEndExclusive: "2026-07-22T00:00:00Z"
      },
      handCube: {
        rows: 30,
        sourceQueryTemplateSha256: sha,
        shards: [
          { ordinal: 1, rows: 10, queryJobId: "mcp_ch_job_one", executionMode: "async", querySha256: sha, sha256: sha, windowStartInclusive: "2023-09-01T00:00:00Z", windowEndExclusive: "2024-09-01T00:00:00Z" },
          { ordinal: 2, rows: 20, queryJobId: "mcp_ch_job_two", executionMode: "async", querySha256: sha, sha256: sha, windowStartInclusive: "2024-09-01T00:00:00Z", windowEndExclusive: "2026-07-22T00:00:00Z" }
        ]
      }
    }
  },
  charts: Object.fromEntries(["novice", "league3", "league2", "league1"].map((cohort) => [
    `${cohort}|BTN|IP|80+|all`,
    {
      totals: {
        opportunities: 169 * 50,
        folds: 169 * 20,
        calls: 169 * 15,
        fourbets: 169 * 10,
        jams: 169 * 5,
        knownOpportunities: 169 * 50,
        missingOpportunities: 0,
        sourceOpportunities: 169 * 50
      },
      cells: Array.from({ length: 169 }, () => [50, 20, 15, 10, 5])
    }
  ]))
};

const valid = evaluate(`window.FF_VS3BET_FIELD_DATA=${JSON.stringify(validPayload)};`);
assert.equal(valid.ready, true, valid.reasons.join(", "));

for (const mutate of [
  (payload) => { payload.status = "methodology_only"; },
  (payload) => { payload.meta.samplePolicy.exactFrequencyMinimumN = 49; },
  (payload) => { delete payload.meta.provenance.handCube.shards[0].executionMode; },
  (payload) => { payload.meta.provenance.handCube.shards[1].windowStartInclusive = "2024-10-01T00:00:00Z"; },
  (payload) => { payload.meta.cohorts.novice.ranks = [15, 16, 17]; },
  (payload) => { payload.charts["novice|BTN|IP|80+|all"].cells[0][0] = 49; },
  (payload) => { payload.charts["novice|BTN|IP|80+|all"].totals.knownOpportunities -= 1; },
  (payload) => { payload.charts["novice|BTN|IP|80+|all"].totals.sourceOpportunities -= 1; },
  (payload) => { payload.charts["novice|BTN|IP|80+|all"].totals.missingOpportunities = -1; },
  (payload) => { delete payload.charts["league1|BTN|IP|80+|all"]; }
]) {
  const drifted = structuredClone(validPayload);
  mutate(drifted);
  assert.equal(evaluate(`window.FF_VS3BET_FIELD_DATA=${JSON.stringify(drifted)};`).ready, false);
}

console.log("vs3bet field-data readiness: OK");
