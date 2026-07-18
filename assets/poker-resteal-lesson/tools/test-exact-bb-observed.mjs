import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const dataContext = { window: {} };
runInNewContext(
  readFileSync(new URL("../data/resteal-rank-data.js", import.meta.url), "utf8"),
  dataContext,
  { filename: "resteal-rank-data.js" },
);

const data = dataContext.window.PokerRestealRankData;
assert(data, "exact rank-at-hand resteal cube is available");
assert.equal(data.meta.filters.heroPosition, "BB", "slice is Hero BB only");
assert.equal(data.meta.filters.facing, "Exactly one preflop raiser (val_preflop_action_facing=4)");
assert.equal(data.meta.filters.limpers, 0);
assert.deepEqual(Array.from(data.meta.filters.effectiveStackBb), [25, 40]);
assert.equal(data.meta.windowStartInclusive, "2026-01-01T00:00:00Z");
assert.equal(data.meta.windowEndExclusive, "2026-07-14T00:00:00Z");

const totals = { opportunities: 0, folds: 0, calls: 0, small3bets: 0, jams: 0 };
const cells = data.meta.handOrder.map(() => [0, 0, 0, 0, 0]);
for (const cohort of data.meta.cohortOrder) {
  const chart = data.charts[cohort].BTN["2.0"]["25-40"];
  for (const key of Object.keys(totals)) totals[key] += chart.totals[key];
  chart.cells.forEach((cell, handIndex) => {
    cell.forEach((count, actionIndex) => { cells[handIndex][actionIndex] += count; });
  });
}

assert.deepEqual(totals, {
  opportunities: 537347,
  folds: 129797,
  calls: 316940,
  small3bets: 51337,
  jams: 39273,
}, "pooled exact-BB action counts reconcile to the frozen rank cube");
assert.equal(totals.folds + totals.calls + totals.small3bets + totals.jams, totals.opportunities);

function categoryCounts(hands) {
  const result = [0, 0, 0, 0, 0];
  for (const hand of hands) {
    const cell = cells[data.meta.handOrder.indexOf(hand)];
    cell.forEach((count, actionIndex) => { result[actionIndex] += count; });
  }
  return result;
}

assert.deepEqual(
  categoryCounts(["TT", "JJ", "QQ", "KK", "AA"]),
  [11442, 63, 285, 8892, 2202],
  "TT+ visibly includes fold, call, non-all-in 3-bet, and direct jam instead of implying slowplay",
);
assert.deepEqual(
  categoryCounts(["KQo", "KJo", "KTo", "QJo", "QTo", "JTo"]),
  [26770, 260, 22287, 1616, 2607],
  "offsuit broadways reconcile at the same exact-BB grain",
);

console.log("PASS exact BB observed field: N 537347, four exhaustive actions, fixed BTN 2 BB / 25-40 BB slice");
