import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const json = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));

await import("../assets/poker-resteal-lesson/engine.js");
await import("../assets/poker-rfi-open-lesson/simulator-pack.js");
globalThis.window = globalThis;
await import("../assets/poker-rfi-open-lesson/data.js");
delete globalThis.window;

const engine = globalThis.PokerRestealEngine;
const rfi = globalThis.PokerRfiOpenSimulatorPack;
const ranks = json("assets/poker-resteal-lesson/data/rank_vs_random169.json");
const ranking = ranks.hands
  .map((hand, index) => ({ hand, score: ranks.equity_vs_random[index] }))
  .sort((left, right) => right.score - left.score)
  .map((item) => item.hand);
const equity = json("assets/poker-resteal-lesson/data/equity169.json");
const handIndex = new Map(equity.hands.map((hand, index) => [hand, index]));
const equityFor = (hero, villain) => equity.equity[handIndex.get(hero)][handIndex.get(villain)];
const exactRestealField = json("assets/poker-resteal-lesson/data/field-exact-bb-btn-2bb.json");
const fieldCalls = exactRestealField.callRange;
const fieldOpens = json("assets/poker-resteal-lesson/data/field_opens.json").pooled_25_40;
const fieldVsJam = exactRestealField.response;

assert.equal(engine.combosLeft("AKs", "AKs"), 3, "suited same-rank blocker leaves three suited combos");
assert.equal(engine.buildRange(ranking, 12, "AA").at(-1).hand, engine.buildRange(ranking, 12, "QJo").at(-1).hand, "Hero cards do not move the nominal range boundary");

function theoretical(hand) {
  return engine.theoreticalHand({ hand, openPct: 50, callPct: 12, stack: 40, openSize: 2, ante: 1, bounty: 0, ranking, equityFor });
}

assert(theoretical("AA").foldEquity > theoretical("QJo").foldEquity, "AA blockers increase fold equity against fixed ranges");
for (const hand of ["K8o", "Q8o", "84s", "73s", "52s"]) {
  assert(theoretical(hand).ev < 0, `${hand} no longer flips from fold to push through range-boundary leakage`);
}

function callWeights(category) {
  const record = fieldCalls.by_category[category];
  if ((record?.n_known_holecards || 0) >= 500) return record.hands || {};
  const group = ["good_reg", "mid_reg", "weak_reg", "nit"].includes(category) ? "reg" : "fish";
  return fieldCalls.super_groups[group]?.hands || fieldCalls.super_groups[group] || {};
}

function fieldGridPct(category) {
  const openPct = fieldOpens[category].BTN.open_clean_pct * 100;
  const observedFold = fieldVsJam[category].fold_pct;
  const useObservedFold = openPct < 12;
  const callPct = useObservedFold
    ? openPct * (1 - observedFold)
    : Math.max(openPct * (1 - observedFold), 12);
  const pushedCombos = equity.hands.reduce((total, hand) => {
    const result = engine.fieldHand({ hand, openPct, callPct, foldEquity: useObservedFold ? observedFold : undefined, callWeights: callWeights(category), stack: 40, openSize: 2, ante: 1, bounty: 0, ranking, equityFor });
    return total + (result.ev >= 0.5 ? engine.totalCombos(hand) : 0);
  }, 0);
  return pushedCombos / 1326 * 100;
}

const passiveFishOpen = fieldOpens.passive_fish.BTN.open_clean_pct * 100;
const passiveFishFold = fieldVsJam.passive_fish.fold_pct;
const passiveFishCall = passiveFishOpen * (1 - passiveFishFold);
const passiveFishQJo = engine.fieldHand({
  hand: "QJo",
  openPct: passiveFishOpen,
  callPct: passiveFishCall,
  foldEquity: passiveFishFold,
  callWeights: callWeights("passive_fish"),
  stack: 40,
  openSize: 2,
  ante: 1,
  bounty: 0,
  ranking,
  equityFor
});
assert.equal(passiveFishQJo.foldEquity, 0.5515, "passive-fish fold equity stays tied to exact BB / BTN / 2 BB responses");
assert(Math.abs(passiveFishQJo.ev - (-0.8196)) < 0.001, `passive-fish QJo EV stays near -0.82 BB in the exact spot (actual ${passiveFishQJo.ev})`);

const goodRegGrid = fieldGridPct("good_reg");
const nitGrid = fieldGridPct("nit");
const activeFishGrid = fieldGridPct("aggro_fish");
const passiveFishGrid = fieldGridPct("passive_fish");
assert(Math.abs(goodRegGrid - 39.0649) < 0.01, `good-reg keeps the structural teaching grid (actual ${goodRegGrid.toFixed(4)}%)`);
assert(Math.abs(nitGrid - 12.5189) < 0.01, `nit keeps the exact-spotted teaching grid (actual ${nitGrid.toFixed(4)}%)`);
assert(Math.abs(activeFishGrid - 22.4736) < 0.01, `active-fish keeps the exact-spotted continuation grid (actual ${activeFishGrid.toFixed(4)}%)`);
assert(Math.abs(passiveFishGrid - 14.0271) < 0.01, `passive-fish uses the exact-spotted response grid when its whole open is below the 12% floor (actual ${passiveFishGrid.toFixed(4)}%)`);
assert(passiveFishGrid < activeFishGrid, `passive-fish grid stays narrower than active-fish (${passiveFishGrid.toFixed(1)}% < ${activeFishGrid.toFixed(1)}%)`);

assert.deepEqual(rfi.enginePositions, ["UTG", "LJ", "HJ", "CO", "BTN"], "RFI pack uses the 7-max engine vocabulary");
assert.equal(rfi.targetPosition(2), "LJ", "second RFI hand targets engine LJ");
assert.equal(rfi.targetLearningPosition(2), "MP", "engine LJ is presented as learning MP");
assert.equal(rfi.openSizeBb, 2, "RFI lesson and simulator use the same 2 BB size");

const rfiCss = readFileSync(resolve(root, "assets/poker-rfi-open-lesson/simulator-pack.css"), "utf8");
assert(!rfiCss.includes('.client-controls.is-rfi-opening [data-action="call"] { display:none'), "RFI opening keeps the call button visible as a teaching trap");
assert(rfiCss.includes(".rfi-range-review"), "RFI pack includes the post-hand range target review");
assert(rfiCss.includes(".rfi-limp-warning"), "RFI pack includes the dedicated limp warning dialog");
assert(rfiCss.includes('.rfi-review-cell.is-hit:after { content:none; }'), "RFI target ring keeps the played hand label unobstructed");
const rfiPackSource = readFileSync(resolve(root, "assets/poker-rfi-open-lesson/simulator-pack.js"), "utf8");
assert(rfiPackSource.includes("manualNextHand: true"), "RFI waits for post-hand review before dealing the next hand");
assert(!rfiPackSource.includes("const limp = event.target?.closest?.('.client-controls.is-rfi-opening"), "RFI Call reaches the engine as a real limp decision");
assert(rfiPackSource.includes('if (latest.action === "limp") playLimpTone();'), "RFI grades the limp after the decision instead of capture-blocking the button");
assert(!rfiPackSource.includes("2,2"), "RFI live mode no longer exposes the old 2.2 BB size");
const rfiBettingSource = readFileSync(resolve(root, "assets/poker-simulator/simulator-betting.js"), "utf8");
assert(rfiBettingSource.includes("PokerSimulatorPracticePacks?.defaultBetAmount"), "practice packs own their default live bet through the shared registry");
assert.equal(rfi.decisionForFrequency(75), "fold", "75-percent source weights stay outside the simplified range");
assert.equal(rfi.decisionForFrequency(76), "open", "source weights above 75 percent enter the simplified range");
assert.deepEqual(globalThis.PokerRfiData.targets, { EP: 20, MP: 24, HJ: 32, CO: 48, BTN: 66 }, "RFI targets are combo-weighted from the binary chart");
assert.equal(rfi.gradeEntry({ handNo: 2, hero: { combo: "A9o", seatId: 4 }, handHistory: { actions: [{ street: "preflop", seatId: 4, action: "fold" }] } }).expected, "fold", "MP 50-percent source cell is excluded after normalization");
assert.equal(rfi.gradeEntry({ handNo: 3, hero: { combo: "K3s", seatId: 4 }, handHistory: { actions: [{ street: "preflop", seatId: 4, action: "raise" }] } }).expected, "open", "HJ 80-percent source cell becomes a full-weight open");
assert.equal(rfi.heroPreflopAction({ hero: { seatId: 4 }, handHistory: { actions: [{ street: "preflop", seatId: 4, action: "call" }] } }), "limp", "completed hand grading recognizes a limp");
assert.equal(rfi.heroPreflopAction({ hero: { seatId: 0 }, handHistory: { actions: [{ street: "preflop", seatId: 0, phase: "chips", label: "Hero +2 BB" }, { street: "preflop", seatId: 0, phase: "action", label: "Raise to 2 BB" }] } }), "open", "RFI grading skips chip movement and finds the first meaningful hero action");
assert.equal(rfi.reviewVerdict({ action: "limp", expected: "open", correct: false }).tone, "wrong", "limp receives an explicit wrong verdict");
const epReviewChart = rfi.reviewChart({ position: "EP", combo: "A9o", correct: true });
assert.equal((epReviewChart.match(/class="rfi-review-cell/g) || []).length, 169, "post-hand review renders all 169 range cells");
assert(epReviewChart.includes("is-hit is-correct"), "post-hand review marks the played combo on the chart");
assert(!epReviewChart.includes("is-mixed") && !epReviewChart.includes("<small>"), "post-hand review stays binary and does not render source weights");
for (const chartClass of ["is-pair", "is-suited", "is-offsuit", "is-target-open"]) assert(epReviewChart.includes(chartClass), `post-hand review renders ${chartClass}`);
for (const paletteSelector of [".rfi-review-cell.is-pair", ".rfi-review-cell.is-suited", ".rfi-review-cell.is-offsuit", ".rfi-review-cell.is-target-open"]) assert(rfiCss.includes(paletteSelector), `simulator review styles ${paletteSelector}`);
for (const legendClass of ["is-open", "is-pair", "is-suited", "is-offsuit"]) assert(rfiPackSource.includes(`class="${legendClass}"`), `simulator review legend includes ${legendClass}`);
const actionControls = readFileSync(resolve(root, "assets/poker-simulator/simulator-action-controls.js"), "utf8");
assert(rfiPackSource.includes('action: "rfi-play-again"'), "RFI pack registers an in-frame restart action");
assert(actionControls.includes("PokerSimulatorPracticePacks?.sessionCompleteAction"), "terminal controls request restart behavior from the active practice pack");

const trainerShellCss = readFileSync(resolve(root, "assets/poker-trainer-shell/shell.css"), "utf8");
const trainerSnapshotSource = readFileSync(resolve(root, "assets/poker-trainer-shell/simulator-snapshot.js"), "utf8");
assert(trainerShellCss.includes('.felt .pot .pot-chip-stack'), "trainer pot chips have an explicit vertical-layout override");
assert(trainerShellCss.includes('.felt.has-board .pot-total'), "trainer postflop pot readout is restored below the board");
assert(trainerSnapshotSource.includes('potTotalLabel: "БАНК"'), "trainer postflop readout uses the same BANK label as preflop");

const restealDataSource = readFileSync(resolve(root, "assets/poker-resteal-lesson/data.js"), "utf8");
const restealLessonSource = readFileSync(resolve(root, "assets/poker-resteal-lesson/lesson.js"), "utf8");
const restealLessonHtml = readFileSync(resolve(root, "resteal-lesson.html"), "utf8");
assert(!restealLessonSource.includes("state.data.hero_outcomes.pooled.ALL"), "mixed SB/BB outcomes no longer drive the BB lesson panel");
assert(restealLessonSource.includes('RankData?.charts?.[cohort]?.BTN?.["2.0"]?.["25-40"]'), "resteal panel reads the exact BB / BTN 2 BB / 25-40 BB cube");
for (const action of ["folds", "calls", "small3bets", "jams"]) assert(restealLessonSource.includes(`key: "${action}"`), `resteal panel exposes observed ${action}`);
assert(restealLessonHtml.includes("Наблюдаемая игра поля · точно BB"), "resteal panel names the exact hero position");
assert(restealLessonHtml.includes("Не рекомендация"), "resteal panel separates observed play from strategic advice");

console.log(`✓ resteal field grids: reg ${goodRegGrid.toFixed(1)}% · nit ${nitGrid.toFixed(1)}% · active fish ${activeFishGrid.toFixed(1)}%`);
console.log("✓ learning contracts passed");
