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

const wisdomExpected = {
  QJo: { equity: 34, pass: 80, call: 20, bust: 13, win: 7, ev: 2.0 },
  "22": { equity: 38, pass: 79, call: 21, bust: 13, win: 8, ev: 2.4 },
  K4o: { equity: 29, pass: 79, call: 21, bust: 15, win: 6, ev: 1.3 },
  "87s": { equity: 34, pass: 80, call: 20, bust: 13, win: 7, ev: 2.0 }
};
for (const [hand, expected] of Object.entries(wisdomExpected)) {
  const result = engine.theoreticalHand({ hand, openPct: 50, callPct: 10, stack: 30, openSize: 2, ante: 1, bounty: 0, ranking, equityFor });
  const pass = Math.round(result.foldEquity * 100);
  const call = 100 - pass;
  const win = Math.round((1 - result.foldEquity) * result.equity * 100);
  assert.deepEqual({
    equity: Math.round(result.equity * 100),
    pass,
    call,
    bust: call - win,
    win,
    ev: Number(result.ev.toFixed(1))
  }, expected, `${hand} wisdom model remains stable`);
}

const vsJam = JSON.parse(readFileSync(new URL("data/field_vs_jam.json", toolRoot), "utf8"));
const fieldCalls = JSON.parse(readFileSync(new URL("data/field_call_range.json", toolRoot), "utf8"));
const exactBbBtn = JSON.parse(readFileSync(new URL("data/field-exact-bb-btn-2bb.json", toolRoot), "utf8"));
assert.equal(vsJam.pooled.good_reg.fold_pct, 0.7814);
assert.equal(vsJam.pooled.weak_reg.fold_pct, 0.7301);
assert.equal(vsJam.pooled.aggro_fish.fold_pct, 0.6063);
assert.equal(vsJam.pooled.passive_fish.fold_pct, 0.4719);
assert.match(vsJam.meta.description, /original opener/i, "field frequency is scoped to the original opener");
assert.match(vsJam.meta.spot, /direct all-in/i, "field frequency is scoped to a direct Hero jam");
assert.match(fieldCalls.meta.description, /observed/i, "continuing cards are labelled as observed field data");
assert.equal(vsJam.meta.source.sha256, fieldCalls.meta.source.sha256, "fold and call-range files share one reconciled source");
assert.equal(vsJam.meta.source.mcpJobIds.length, 3);
assert.equal(vsJam.meta.source.heroJamsTotal, 179341);
assert.equal(vsJam.meta.source.candidateResponsesTotal, 128718);
assert.equal(vsJam.meta.source.ambiguousHeroJamsTotal, 30);
assert.equal(vsJam.meta.source.matchedOpenerResponsesTotal, 128658);
assert.equal(vsJam.meta.source.matchedUniqueHeroJamsTotal, 128658);
assert.equal(vsJam.meta.source.maxCandidateResponsesPerHeroJam, 2);
assert.equal(vsJam.meta.source.maxResponsesPerHeroJam, 1);
assert.equal(vsJam.meta.source.matchPct, 71.7393);
assert.ok(vsJam.meta.source.shards.every((shard) => /^[a-f0-9]{64}$/.test(shard.querySha256)), "each rendered query is fingerprinted");
assert.equal(fieldCalls.pooled.n_total, 36569);
assert.equal(fieldCalls.pooled.n_known_holecards, 36553);
assert.deepEqual(exactBbBtn.meta.slice, { heroPosition: "BB", openerPosition: "BTN", openSizeBb: "2.0", effectiveStackBb: "25-40" });
assert.deepEqual(exactBbBtn.response.passive_fish, { n_faced: 165, fold_pct: 0.5515, continue_pct: 0.4485 });
assert.equal(exactBbBtn.response.aggro_fish.fold_pct, 0.7075);
assert.equal(exactBbBtn.response.semipassive_fish.fold_pct, 0.6888);

const passiveFishWeights = exactBbBtn.callRange.super_groups.fish.hands;
const passiveFishQJo = engine.fieldHand({
  hand: "QJo",
  openPct: 10.56,
  callPct: 4.73616,
  foldEquity: exactBbBtn.response.passive_fish.fold_pct,
  callWeights: passiveFishWeights,
  stack: 40,
  openSize: 2,
  ante: 1,
  bounty: 0,
  ranking,
  equityFor
});
assert.equal(passiveFishQJo.foldEquity, 0.5515);
assert.ok(Math.abs(passiveFishQJo.ev - (-0.8196)) < 0.001, `exact BB/BTN passive-fish QJo EV ${passiveFishQJo.ev}`);

console.log(`PASS resteal presets: standard ${(standard.pct * 100).toFixed(1)}%, worst ${(worst.pct * 100).toFixed(1)}%, field FE anchors`);
