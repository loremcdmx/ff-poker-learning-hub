import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const toolRoot = new URL("../", import.meta.url);
const context = { globalThis: {} };
runInNewContext(readFileSync(new URL("engine.js", toolRoot), "utf8"), context);
const engine = context.globalThis.PokerRestealEngine;
const equityData = JSON.parse(readFileSync(new URL("data/equity169.json", toolRoot), "utf8"));
const ranks = JSON.parse(readFileSync(new URL("data/rank_vs_random169.json", toolRoot), "utf8"));
const index = new Map(equityData.hands.map((hand, i) => [hand, i]));
const ranking = ranks.hands.map((hand, i) => ({ hand, score: ranks.equity_vs_random[i] }))
  .sort((a, b) => b.score - a.score).map((item) => item.hand);
const equityFor = (hero, villain) => equityData.equity[index.get(hero)][index.get(villain)];

function run(openPct, callPct, threshold) {
  const results = equityData.hands.map((hand) => engine.theoreticalHand({ hand, openPct, callPct, threshold, stack: 40, openSize: 2, ante: 1, bounty: 0, ranking, equityFor }));
  const pushed = results.filter((item) => item.ev >= threshold);
  return {
    pct: pushed.reduce((sum, item) => sum + engine.totalCombos(item.hand), 0) / 1326,
    byHand: new Map(results.map((item) => [item.hand, item]))
  };
}

const standard = run(50, 12, 0.5);
assert.ok(standard.pct >= 0.30 && standard.pct <= 0.45, `standard range ${standard.pct}`);
assert.ok(standard.byHand.get("22").ev > 0);
assert.ok(standard.byHand.get("KTo").ev > 0);
assert.ok(standard.byHand.get("QTo").ev > 0);
assert.ok(standard.byHand.get("K8s").ev > 0);

const worst = run(40, 18, 0);
assert.ok(worst.pct >= 0.12 && worst.pct <= 0.22, `worst-case range ${worst.pct}`);
for (const pair of ["22", "33", "44", "55", "66", "77", "88", "99", "TT", "JJ", "QQ", "KK", "AA"]) {
  assert.ok(worst.byHand.get(pair).ev >= 0, `${pair} remains non-negative in worst case`);
}

const vsJam = JSON.parse(readFileSync(new URL("data/field_vs_jam.json", toolRoot), "utf8"));
assert.equal(vsJam.pooled.good_reg.fold_pct, 0.7997);
assert.equal(vsJam.pooled.weak_reg.fold_pct, 0.753);
assert.equal(vsJam.pooled.aggro_fish.fold_pct, 0.6415);
assert.equal(vsJam.pooled.passive_fish.fold_pct, 0.5015);

console.log(`PASS resteal presets: standard ${(standard.pct * 100).toFixed(1)}%, worst ${(worst.pct * 100).toFixed(1)}%, field FE anchors`);
