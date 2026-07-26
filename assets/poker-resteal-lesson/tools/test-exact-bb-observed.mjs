import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../data/resteal-rank-data.js", import.meta.url), "utf8");
const dataContext = { window: {} };
runInNewContext(source, dataContext, { filename: "resteal-rank-data.js" });

const data = dataContext.window.PokerRestealRankData;
assert(data, "public resteal rank payload is available");
assert.match(data.version, /^resteal-rank-cube-\d{8}-full-history-r15-r18-v\d+$/);
assert.equal(data.meta.sampleThresholds.exactCellMinimum, 50);
assert.equal(data.meta.handOrder.length, 169);
assert.equal(new Set(data.meta.handOrder).size, 169);
assert.equal(data.meta.presetOrder.length, 10, "exactly ten complete source-backed presets are public");
assert.equal(new Set(data.meta.presetOrder).size, 10, "public preset keys are unique");
assert.deepEqual(Object.keys(data.charts), ["novice", "league3", "league2", "league1"]);
assert.deepEqual(Object.keys(data.summaries), ["novice", "league3", "league2", "league1"]);
for (const cohort of data.meta.cohortOrder) {
  assert.deepEqual(Object.keys(data.charts[cohort]), Array.from(data.meta.presetOrder), `${cohort} exposes every complete preset`);
  for (const preset of data.meta.presetOrder) {
    const chart = data.charts[cohort][preset];
    assert.equal(chart.cells.length, 169);
    assert(chart.cells.every((cell) => cell[0] >= 50), `${cohort}/${preset} stays above the exact-cell threshold`);
  }
}
for (const forbidden of ["/private/tmp/", "privateSql", "privateCsv", "privateJson", "failedAttempts", "strict is_preflop_allin-only classifier rejected"]) {
  assert.doesNotMatch(source, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `public payload excludes ${forbidden}`);
}
assert.match(source, /"opportunities"\s*:/, "ready public payload carries exact observed counters");
assert.match(source, /"jams"\s*:/, "ready public payload carries exact observed action counts");

console.log("PASS resteal public rank payload: full-history exact counters, no private build evidence");
