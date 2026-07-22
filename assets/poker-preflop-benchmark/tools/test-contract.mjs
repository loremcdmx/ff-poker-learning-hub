import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const assetRoot = resolve(root, "assets/poker-preflop-benchmark");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(resolve(assetRoot, "field-data.js"), "utf8"), context);
vm.runInContext(readFileSync(resolve(assetRoot, "spot-ev-data.js"), "utf8"), context);
vm.runInContext(readFileSync(resolve(assetRoot, "config.js"), "utf8"), context);
const data = context.window.PokerPreflopBenchmarkData;
const evData = context.window.PokerPreflopBenchmarkEvData;
const config = context.window.PokerPreflopBenchmarkConfig;
const actionCubeSql = readFileSync(resolve(assetRoot, "tools/msp-preflop-action-cube.sql"), "utf8");
const sbHistorySql = readFileSync(resolve(assetRoot, "tools/msp-sb-unopened-full-history.sql"), "utf8");
const pages = {
  vs_raise_free: "vs-one-raiser-positions-lesson.html",
  vs_raise_sb: "vs-one-raiser-sb-lesson.html",
  sb_unopened: "sb-unopened-lesson.html",
};

assert.equal(data.source.rankSemantics, "rank_at_hand");
assert.deepEqual(Array.from(data.source.cohorts.league1), [1, 5]);
assert.deepEqual(Array.from(data.source.cohorts.leagues2_3), [6, 14]);
assert.deepEqual(Array.from(data.source.cohorts.r15_18), [15, 18]);
assert.equal(data.source.handMinimum, 30);
assert.equal(data.source.sliceMinimum, 100);
for (const sql of [actionCubeSql, sbHistorySql]) {
  assert(sql.includes("preflop_raise_and_blind_made_amount_bb"), "action source keeps the made raise amount needed for effective-shove detection");
  assert(sql.includes("bet_bb_amount"), "action source subtracts Hero's posted blind before comparing against the effective stack");
}
assert(actionCubeSql.includes("x.15 - x.16 >= x.8 - 0.01"), "three-trainer cube detects a raise that covers the effective stack");
assert(sbHistorySql.includes("x.8 - x.9 >= x.7 - 0.01"), "SB full-history source detects a raise that covers the effective stack");
assert.deepEqual(JSON.parse(JSON.stringify(data.source.stackWindows.vs_raise_free)), {
  "20": { minInclusive: 18, maxExclusive: 22.5, label: "18–22" },
  "25": { minInclusive: 22.5, maxExclusive: 27.5, label: "23–27" },
  "30": { minInclusive: 27.5, maxExclusive: 32.5, label: "28–32" },
  "35": { minInclusive: 32.5, maxExclusive: 37.5, label: "33–37" },
  "40": { minInclusive: 37.5, maxExclusive: 40, label: "38–39" },
}, "free-position stack labels expose the real MSP window instead of pretending a bucket is an exact stack");
for (const trainerKey of ["vs_raise_free", "vs_raise_sb", "sb_unopened"]) {
  assert.deepEqual(Array.from(data.source.trainerWindows[trainerKey]), ["2023-09-01T00:00:00Z", "2026-07-22T00:00:00Z"], `${trainerKey} uses the full stable MSP window`);
}
assert.equal(evData.source.rankSemantics, "rank_at_hand");
assert.equal(evData.source.metric, "all_in_adjusted_net_ev_bb_per_100_spot_opportunities");
assert.equal(evData.source.windowStart, "2025-10-01T00:00:00Z");
assert.equal(evData.source.windowEndExclusive, "2026-07-22T00:00:00Z");
assert.equal(evData.spots["SB|BTN|2x|18-25"].league1.spotEvBb100, 4.49);
assert.equal(evData.spots["SB|BTN|2x|18-25"].r15_18.spotEvBb100, -5.35);
assert.equal(evData.spots["SB|BTN|2x|18-25"].gapBb100, 9.84);
assert.equal(evData.spots["SB|BTN|2x|18-25"].league1.actions.call, 3.5);
assert.equal(evData.spots["SB|BTN|2x|18-25"].r15_18.actions.call, 12.5);
assert.equal(evData.spots["SB|BTN|2x|18-25"].league1.actions.raise, 2.0);
assert.equal(evData.spots["SB|BTN|2x|18-25"].league1.actions.jam, 20.0);
assert.equal(evData.spots["SB|BTN|2x|18-25"].jamToCallSwaps.QJs.league1.jam, 91.3);
assert.equal(evData.spots["SB|BTN|2x|18-25"].jamToCallSwaps.QJs.r15_18.jam, 26.5);

function sameSpot(a, b) {
  return ["hero_position", "opener_position", "open_size", "stack_bucket"].every((key) => a[key] === b[key]);
}
function dominant(rates) {
  const values = Object.entries(rates).sort((a, b) => b[1] - a[1]);
  return { action: values[0][0], value: values[0][1], lead: values[0][1] - values[1][1] };
}
function completeCohortStateCount(trainer, cohorts) {
  return trainer.slices.filter((slice) => {
    if (slice.cohort !== "league1" || Object.keys(slice.cells).length !== 169) return false;
    return cohorts.every((cohort) => trainer.slices.some((candidate) => candidate.cohort === cohort && sameSpot(candidate, slice) && Object.keys(candidate.cells).length === 169));
  }).length;
}

assert(completeCohortStateCount(data.trainers.vs_raise_free, ["leagues2_3", "r15_18"]) >= 150, "free-position trainer exposes at least 150 complete three-cohort chart states after fine stack splitting");
assert(completeCohortStateCount(data.trainers.vs_raise_sb, ["r15_18"]) >= 54, "SB-vs-raiser trainer exposes at least 54 complete paired chart states after mixed-size removal");
assert(data.trainers.vs_raise_sb.slices.every((slice) => slice.open_size !== "other"), "SB-vs-raiser trainer never teaches a mixed open-size category");
const freePositionOrder = ["EP", "MP", "HJ", "CO", "BTN"];
for (const slice of data.trainers.vs_raise_free.slices) {
  assert.notEqual(slice.open_size, "other", "free-position trainer never teaches a mixed open-size category");
  assert(!["25-40", "18-25"].includes(slice.stack_bucket), "free-position trainer never republishes the broad stack buckets around the 3-bet/jam boundary");
  assert.notEqual(slice.hero_position, slice.opener_position, `free-position spot keeps Hero distinct from opener: ${slice.hero_position} vs ${slice.opener_position}`);
  assert(freePositionOrder.indexOf(slice.opener_position) < freePositionOrder.indexOf(slice.hero_position), `free-position opener acts before Hero: ${slice.opener_position} before ${slice.hero_position}`);
}
const freeStacks = new Set(data.trainers.vs_raise_free.slices.filter((slice) => slice.cohort === "league1").map((slice) => slice.stack_bucket));
for (const stack of ["20", "25", "30", "35", "40"]) assert(freeStacks.has(stack), `free-position trainer includes the ${stack} BB transition window`);

const freeSlice = (stack) => data.trainers.vs_raise_free.slices.find((slice) => slice.cohort === "league1" && slice.hero_position === "BTN" && slice.opener_position === "HJ" && slice.open_size === "2x" && slice.stack_bucket === stack);
assert.equal(freeSlice("20").cells["88"].jam, 92, "88 is a clear shove in the 18-22 BB MSP window");
assert.equal(freeSlice("25").cells["88"].jam, 80, "88 remains mostly shove in the 23-27 BB MSP window");
assert.equal(freeSlice("30").cells["88"].jam, 46, "88 is no longer an unambiguous shove in the 28-32 BB MSP window");
assert.equal(freeSlice("35").cells["88"].jam, 23, "88 shove frequency falls further in the 33-37 BB MSP window");
assert.equal(freeSlice("40").cells["88"].jam, 6, "88 is rarely shoved in the 38-39 BB MSP window");
assert(dominant(freeSlice("30").cells["88"]).value < 50, "the 28-32 BB 88 cell cannot enter practice as a categorical shove answer");
const fineStackFamilies = new Map();
for (const slice of data.trainers.vs_raise_free.slices.filter((row) => row.cohort === "league1" && ["20", "25", "30", "35", "40"].includes(row.stack_bucket))) {
  const key = [slice.hero_position, slice.opener_position, slice.open_size].join("|");
  const family = fineStackFamilies.get(key) || [];
  family.push(slice);
  fineStackFamilies.set(key, family);
}
for (const [key, family] of fineStackFamilies) {
  family.sort((a, b) => Number(a.stack_bucket) - Number(b.stack_bucket));
  for (let index = 1; index < family.length; index += 1) {
    assert(family[index].rates.jam <= family[index - 1].rates.jam + 2, `${key} does not silently increase aggregate shove advice as the stack gets deeper`);
  }
}
assert.equal(completeCohortStateCount(data.trainers.sb_unopened, ["r15_18"]), 10, "SB unopened exposes all ten complete paired stack states");
assert.deepEqual(Array.from(config.trainers.vs_raise_free.comparisonCohorts), ["league1", "leagues2_3", "r15_18"], "free-position comparison requires all three real cohorts");

for (const [trainerKey, page] of Object.entries(pages)) {
  const trainer = data.trainers[trainerKey];
  const html = readFileSync(resolve(root, page), "utf8");
  assert(trainer.slices.some((slice) => slice.cohort === "league1"), `${trainerKey} has League 1 slices`);
  assert(trainer.slices.some((slice) => slice.cohort === "leagues2_3"), `${trainerKey} has ranks 6-14 slices`);
  assert(trainer.slices.some((slice) => slice.cohort === "r15_18"), `${trainerKey} has ranks 15-18 slices`);
  assert(html.includes(`data-trainer="${trainerKey}"`), `${page} selects the data trainer`);
  assert(html.includes("data-trainer-simulator-actions") === false, `${page} delegates in-table controls to the functional snapshot`);
  assert(html.includes("assets/poker-trainer-shell/simulator-snapshot.js"), `${page} loads the simulator snapshot`);
  assert(html.includes("assets/poker-preflop-benchmark/field-data.js"), `${page} loads generated field data`);
  assert(html.includes("assets/poker-preflop-benchmark/spot-ev-data.js"), `${page} loads exact-spot EV evidence`);
  assert.equal((html.match(/data-source-note/g) || []).length, 2, `${page} keeps one source label per data block`);
  assert(!/placeholder|coming soon|скоро/i.test(html), `${page} contains no placeholder copy`);
  assert(!/данн(?:ые|ых) MSP|N≥|ранг на момент|надёжные клетки|эталон|малонаблюдаем/i.test(html), `${page} keeps technical data language out of learner copy`);

  let practiceCells = 0;
  const actions = new Set();
  for (const league of trainer.slices.filter((slice) => slice.cohort === "league1")) {
    const novice = trainer.slices.find((slice) => slice.cohort === "r15_18" && sameSpot(slice, league));
    if (!novice) continue;
    for (const [hand, rates] of Object.entries(league.cells)) {
      if (!novice.cells[hand]) continue;
      const result = dominant(rates);
      const fieldGap = Object.keys(rates).reduce((sum, action) => sum + Math.abs(rates[action] - novice.cells[hand][action]), 0) / 2;
      if (result.value >= 50 && result.lead >= 12 && fieldGap >= 8) {
        practiceCells += 1;
        actions.add(result.action);
      }
    }
  }
  assert(practiceCells >= 20, `${trainerKey} has at least 20 source-backed practice cells`);
  assert(actions.size >= 2, `${trainerKey} practice covers multiple actions`);
  assert(config.trainers[trainerKey].resultKey, `${trainerKey} has a canonical progress key`);
}

for (const trainer of Object.values(data.trainers)) {
  for (const slice of trainer.slices) {
    assert.equal(Object.keys(slice.cells).length, 169, "published payload contains only complete 169-hand slices");
    assert.equal(Object.values(slice.rates).reduce((sum, value) => sum + value, 0), 100, "slice rates are integer counters summing to 100");
    assert(!("opportunities" in slice) && !("players" in slice), "learner payload omits raw counts and player counts");
    for (const rates of Object.values(slice.cells)) {
      assert.equal(Object.values(rates).reduce((sum, value) => sum + value, 0), 100, "cell rates are integer counters summing to 100");
    }
  }
}

const sbStacks = new Set(data.trainers.sb_unopened.slices.filter((slice) => slice.cohort === "league1").map((slice) => slice.stack_bucket));
for (const stack of ["70+", "40-70", "25-40", "18-25", "15-18", "12-15", "10-12", "8-10", "6-8", "<6"]) assert(sbStacks.has(stack), `SB unopened includes ${stack} BB`);
for (const stack of ["70+", "40-70", "25-40", "18-25", "15-18", "12-15", "10-12", "8-10", "6-8", "<6"]) {
  const league = data.trainers.sb_unopened.slices.find((slice) => slice.cohort === "league1" && slice.stack_bucket === stack);
  const middle = data.trainers.sb_unopened.slices.find((slice) => slice.cohort === "leagues2_3" && slice.stack_bucket === stack);
  const novice = data.trainers.sb_unopened.slices.find((slice) => slice.cohort === "r15_18" && slice.stack_bucket === stack);
  assert.equal(Object.keys(league?.cells || {}).length, 169, `SB unopened ${stack} BB has 169/169 League 1 cells`);
  assert.equal(Object.keys(middle?.cells || {}).length, 169, `SB unopened ${stack} BB has 169/169 ranks 6-14 cells`);
  assert.equal(Object.keys(novice?.cells || {}).length, 169, `SB unopened ${stack} BB has 169/169 ranks 15-18 cells`);
  assert.deepEqual(Object.keys(league.cells).sort(), Object.keys(middle.cells).sort(), `SB unopened ${stack} BB has 169 shared League 1 and ranks 6-14 cells`);
  assert.deepEqual(Object.keys(league.cells).sort(), Object.keys(novice.cells).sort(), `SB unopened ${stack} BB has 169 shared cohort cells`);
}
const sbLeagueSlice = (stack) => data.trainers.sb_unopened.slices.find((slice) => slice.cohort === "league1" && slice.stack_bucket === stack);
assert.equal(sbLeagueSlice("<6").rates.raise, 5, "covered short-BB shoves do not leak into the <6 BB normal-raise rate");
assert.equal(sbLeagueSlice("<6").rates.jam, 69, "<6 BB effective shoves include both Hero all-ins and raises covering a shorter BB");
for (const stack of ["<6", "6-8", "8-10"]) {
  assert(sbLeagueSlice(stack).rates.jam > sbLeagueSlice(stack).rates.raise, `${stack} BB correctly shows effective shoves as the dominant aggressive action`);
}

const runtime = readFileSync(resolve(assetRoot, "lesson.js"), "utf8");
assert(runtime.includes("FFTrainerSimulator.renderDecision"), "decisions use the functional table renderer");
assert(runtime.includes("FFPlayerProgress.setResult"), "25-hand practice writes canonical lesson progress");
assert(runtime.includes('source: "msp-rank-at-hand"'), "progress records data provenance");
assert(runtime.includes("wisdom-rule-card"), "wisdom carousel contains an actionable table rule");
assert(runtime.includes("feedback-cohort"), "practice feedback compares the two learner cohorts");
assert(runtime.includes("stack-ladder"), "wisdom view contains the stack transition ladder");
assert(runtime.includes("chartReadySlice"), "enabled chart selectors require complete comparison-cohort 169-hand matrices");
assert(runtime.includes("Смешанная граница") && runtime.includes("isClearPlan"), "plurality-only hand cells are labelled as mixed and excluded from categorical practice answers");
assert(runtime.includes("Та же ширина — другой винрейт"), "SB wisdom names the observed exact-spot outcome gap");
assert(runtime.includes("QJs, QTs, KTs, 55 и JTs"), "SB wisdom names the clearest jam-to-call hand swaps");
assert(runtime.includes("Результат на 100 таких спотов"), "SB wisdom labels EV as exact-spot rather than global player winrate");
assert(!runtime.includes("ratesInline") && !runtime.includes("activeRate"), "runtime contains no dead technical-format helpers");
console.log("preflop benchmark trainer contract: ok · 3 routes · exact source data · learner copy clean");
