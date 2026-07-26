import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const files = {
  html: "vs-3bet-defense-lesson.html",
  confidence: "assets/poker-kit/observed-frequency-confidence.js",
  snapshot: "assets/poker-trainer-shell/simulator-snapshot.js",
  controller: "assets/poker-trainer-shell/simulator-continuation.js",
  continuations: "assets/poker-vs-3bet-defense-lesson/continuations.js",
  model: "assets/poker-vs-3bet-defense-lesson/range-model.js",
  rfiData: "assets/poker-rfi-open-lesson/data.js",
  data: "assets/poker-vs-3bet-defense-lesson/data.js",
  fieldData: "assets/poker-vs-3bet-defense-lesson/data/vs3bet-field-data.js",
  fieldDataReadiness: "assets/poker-vs-3bet-defense-lesson/field-data-readiness.js",
  wisdomReference: "assets/poker-vs-3bet-defense-lesson/wisdom-reference.js",
  explorer: "assets/poker-vs-3bet-defense-lesson/range-explorer.js",
  explorerCss: "assets/poker-vs-3bet-defense-lesson/range-explorer.css",
  fieldExplorer: "assets/poker-vs-3bet-defense-lesson/field-explorer.js",
  sharedLesson: "assets/poker-field-lesson/lesson.js",
  research: "assets/poker-vs-3bet-defense-lesson/research/README.md",
  transcript: "assets/poker-vs-3bet-defense-lesson/research/methodics-ranges.md"
};
const source = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, filename]) => (
  [key, await readFile(path.join(root, filename), "utf8")]
))));

const context = { window: {}, console };
vm.createContext(context);
for (const key of ["confidence", "snapshot", "controller", "continuations", "rfiData", "fieldData", "fieldDataReadiness", "model", "data"]) {
  vm.runInContext(source[key], context, { filename: files[key] });
}

const data = context.window.FF_POKER_FIELD_LESSON_DATA;
const model = context.window.FF_VS3BET_RANGE_MODEL;
const continuationApi = context.window.FFTrainerSimulatorContinuation;
const continuationRegistry = context.window.FF_VS3BET_CONTINUATIONS;
const fieldData = context.window.FF_VS3BET_FIELD_DATA;
const fieldDataReadiness = context.window.FFVs3BetFieldDataReadiness;
const rfiData = context.window.PokerRfiData;
const preflopPotBb = context.window.FFTrainerSimulatorSnapshot.preflopPotBb;
const assetHash = (value) => createHash("sha256")
  .update(value.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);

assert.equal(data.schemaVersion, 1);
assert.equal(data.key, "vs-3bet-defense");
assert.equal(data.meta.scope.length, 6, "vs-3bet scope includes its strategy-source boundary");
assert.equal(
  data.meta.scope.at(-1),
  "полевые частоты описывают сыгранные решения и не являются solver-чартом",
  "the final visible scope item preserves the observed-field-versus-solver boundary"
);
assert.match(source.sharedLesson, /asArray\(meta\.scope\)\.forEach/, "shared lesson renders every authored scope item");
assert.doesNotMatch(source.sharedLesson, /asArray\(meta\.scope\)\.slice\(0,\s*5\)/, "scope rendering cannot truncate the final disclaimer");
assert.equal(data.wisdom.length, 3);
assert.doesNotMatch(source.data, /rank15_17|R15–17|monthly aggregate/, "legacy cohort and monthly aggregate labels cannot diverge from the field cube");
assert.doesNotMatch(source.data, /42,6 → 21,0%/);
assert.equal(fieldData.meta.samplePolicy.exactFrequencyMinimumN, 50);
assert.equal(fieldData.meta.samplePolicy.smoothing, false);
if (fieldDataReadiness.ready) {
  assert.equal(data.status, "ready");
  assert.equal(fieldData.status, "ready");
  assert.equal(fieldData.version, "vs3bet-field-cube-20260722-v6");
  assert.equal(data.meta.observedDataStatus, "ready");
  assert.deepEqual(Array.from(data.meta.cohortOrder), ["league1", "league2", "league3", "novice"]);
  assert.deepEqual(Array.from(data.cohorts, (cohort) => cohort.key), ["league1", "league2", "league3", "novice"]);
  assert.match(data.meta.sampleNote, /наблюдаемую игру поля/i);
  assert(Object.keys(fieldData.charts).length > 0, "ready hand charts are copied into the public payload");
  assert.deepEqual(Object.keys(fieldData.summaries).sort(), ["league1", "league2", "league3", "novice"]);
  assert(fieldData.meta.enabledComparisonKeys.length > 0);
} else {
  assert.equal(data.status, "methodology_only");
  assert.deepEqual(Array.from(data.cohorts), [], "unverified cohort summaries are not copied into the lesson payload");
  assert.deepEqual(Array.from(data.meta.cohortOrder), [], "unverified cohort labels cannot leak into field UI");
  assert.equal(data.meta.observedDataStatus, "unavailable");
  assert.match(data.meta.sampleNote, /старые полевые частоты скрыты/i);
  assert.equal(fieldData.version, "vs3bet-field-methodology-only-20260722-v1");
  assert.equal(fieldData.status, "methodology_only");
  assert.equal(fieldData.meta.publicationGate, "full_window_latest_first_four_cohorts_n50_169");
  assert.deepEqual(Object.keys(fieldData.charts), [], "rejected hand charts are absent from the public payload");
  assert.deepEqual(Object.keys(fieldData.summaries), [], "rejected cohort summaries are absent from the public payload");
  assert.deepEqual(Array.from(fieldData.meta.enabledComparisonKeys), []);
}
assert.match(
  source.html,
  new RegExp(`poker-vs-3bet-defense-lesson/data/vs3bet-field-data\\.js\\?v=${assetHash(source.fieldData)}`),
  "field-data cache token matches the exact aggregate bytes"
);
assert.match(
  source.html,
  new RegExp(`poker-vs-3bet-defense-lesson/field-data-readiness\\.js\\?v=${assetHash(source.fieldDataReadiness)}`),
  "field-data readiness cache token matches the exact runtime bytes"
);
assert.match(
  source.html,
  new RegExp(`poker-vs-3bet-defense-lesson/range-explorer\\.js\\?v=${assetHash(source.explorer)}`),
  "range-explorer cache token matches the exact runtime bytes"
);
assert.match(source.fieldExplorer, /enabledComparisonKeys/);
assert.match(source.wisdomReference, /enabledComparisonKeys/);
assert.match(source.explorer, /enabledComparisonKeys/);
assert.match(source.fieldExplorer, /FFVs3BetFieldDataReadiness\?\.ready/);
assert.match(source.wisdomReference, /FFVs3BetFieldDataReadiness\?\.ready/);
assert.match(source.explorer, /FFVs3BetFieldDataReadiness\?\.ready/);
for (const token of [
  "function fieldComparisonReady()",
  "enabledComparisonKeys.has(fieldComparisonKey())",
  "Для этого фильтра полевой срез не опубликован",
  "соседний стек или размер 3-бета сюда не подставляется",
]) assert.ok(source.explorer.includes(token), `exact field-comparison gate: ${token}`);

let auditedFieldCells = 0;
for (const [chartKey, chart] of Object.entries(fieldData.charts)) {
  const totals = chart.totals;
  assert.equal(
    totals.opportunities,
    totals.folds + totals.calls + totals.fourbets + totals.jams,
    `${chartKey} action totals reconcile to all opportunities`
  );
  assert.equal(
    totals.sourceOpportunities,
    totals.knownOpportunities + totals.missingOpportunities,
    `${chartKey} known and hidden-card opportunities reconcile to the unfiltered source total`
  );
  assert.equal(totals.opportunities, totals.knownOpportunities, `${chartKey} public chart denominator uses only known-card decisions`);
  assert.equal(chart.cells.length, 169, `${chartKey} has all 169 hand cells`);
  const knownByAction = [0, 0, 0, 0, 0];
  for (const cell of chart.cells) {
    auditedFieldCells += 1;
    assert.equal(cell.length, 5, `${chartKey} cell keeps opportunity plus four action counters`);
    assert(cell.every((value) => Number.isInteger(value) && value >= 0), `${chartKey} cells use non-negative integer counters`);
    assert.equal(cell[0], cell[1] + cell[2] + cell[3] + cell[4], `${chartKey} cell actions reconcile`);
    cell.forEach((value, index) => { knownByAction[index] += value; });
  }
  assert.equal(knownByAction[0], totals.knownOpportunities, `${chartKey} hand cells reconcile to known-card opportunities`);
  assert(knownByAction[1] <= totals.folds, `${chartKey} known-card folds do not exceed the all-card total`);
  assert(knownByAction[2] <= totals.calls, `${chartKey} known-card calls do not exceed the all-card total`);
  assert(knownByAction[3] <= totals.fourbets, `${chartKey} known-card 4-bets do not exceed the all-card total`);
  assert(knownByAction[4] <= totals.jams, `${chartKey} known-card jams do not exceed the all-card total`);
  assert(Math.abs(totals.knownCoveragePct - totals.knownOpportunities / totals.sourceOpportunities * 100) < 0.001, `${chartKey} coverage percentage is exact`);
}
assert.equal(auditedFieldCells, 800 * 169, "the entire 800-slice / 169-hand field cube is reconciled");

for (const [cohortKey, totals] of Object.entries(fieldData.summaries)) {
  assert.equal(
    totals.opportunities,
    totals.folds + totals.calls + totals.fourbets + totals.jams,
    `${cohortKey} summary action totals reconcile`
  );
  assert.equal(
    totals.opportunities,
    totals.knownOpportunities + totals.missingOpportunities,
    `${cohortKey} summary known and hidden-card opportunities reconcile`
  );
  const percentTotal = totals.foldPct + totals.callPct + totals.fourbetPct + totals.jamPct;
  assert(Math.abs(percentTotal - 100) < 0.002, `${cohortKey} summary percentages reconcile to 100%`);
}

assert.equal(model.schemaVersion, 1);
assert.deepEqual(Array.from(model.positions), ["EP", "MP", "HJ", "CO", "BTN", "SB"]);
assert.deepEqual(Array.from(model.relations), ["IP", "OOP"]);
assert.deepEqual(Array.from(model.stacks, (stack) => stack.key), ["20-30", "31-50", "51-80", "80+"]);
assert.deepEqual(Array.from(model.sizes), [2.5, 3, 4]);
assert.deepEqual(
  Array.from(model.cohorts, (cohort) => cohort.key),
  fieldDataReadiness.ready ? ["reference", "league1", "league2", "league3", "novice"] : ["reference"],
  "field-derived teaching layers exist only when the checked-in aggregate passes readiness"
);
assert.equal(model.hands.length, 169);
assert.equal(new Set(model.hands).size, 169);
assert.deepEqual(Object.keys(rfiData.sourceFrequencies), ["EP", "MP", "HJ", "CO", "BTN"]);
assert.equal(Object.keys(rfiData.sourceFrequencies.BTN).length, 169);
assert.equal(rfiData.sourceFrequencies.BTN.AA, 100, "full cell weight keeps a 100% open visible");
assert.equal(rfiData.sourceFrequencies.BTN.Q2o, 50, "mixed open uses the source frequency, not the binary training range");
assert.equal(rfiData.sourceFrequencies.CO.J3s, 5, "rare open keeps its true 5% value behind the 10% visual floor");
assert.equal(rfiData.sourceFrequencies.CO.Q2o, 0, "a true never-open remains distinguishable from missing data");
assert.equal(rfiData.sourceFrequencies.EP.K7s, 80, "source frequency preserves methodic mixing");
assert.equal(rfiData.sourceFrequencies.SB, undefined, "SB stays unavailable instead of being mislabelled as 0% open");

assert.equal(typeof model.targetEconomics, "function");
assert.equal(typeof model.targetPlan, "function");
assert.deepEqual(
  JSON.parse(JSON.stringify(model.targetEconomics(3))),
  {
    openBb: 2,
    bbPosted: 1,
    potBeforeThreeBet: 4.5,
    multiplier: 3,
    raiseToBb: 6,
    riskBb: 5,
    autoProfitFoldPct: 52.63
  },
  "the 3x economic red line is reproducible from the displayed pot and risk"
);

let targetPlanCount = 0;
const targetPlans = new Map();
for (const position of model.positions) {
  for (const stack of model.stacks) {
    for (const size of model.sizes) {
      const plan = model.targetPlan({
        position,
        stack: stack.key,
        size,
        openFrequencies: rfiData.sourceFrequencies[position]
      });
      targetPlanCount += 1;
      targetPlans.set(`${position}/${stack.key}/${size}`, plan);
      assert.deepEqual(
        JSON.parse(JSON.stringify(plan.filters)),
        {
          position,
          relation: position === "SB" ? "OOP" : "IP",
          stack: stack.key,
          size
        },
        `${position}/${stack.key}/${size} reports the exact selected filters`
      );
      const total = ["fold", "call", "fourbet", "jam"].reduce((sum, action) => {
        assert(plan.mix[action] >= 0 && plan.mix[action] <= 100, `${position}/${stack.key}/${size}/${action} stays in percentage bounds`);
        return sum + plan.mix[action];
      }, 0);
      assert(Math.abs(total - 100) < 0.001, `${position}/${stack.key}/${size} target actions reconcile to 100%`);
      assert(plan.mix.fold >= 45, `${position}/${stack.key}/${size} does not manufacture the implausible 20–30% fold targets`);
      assert(plan.mix.fold <= 80, `${position}/${stack.key}/${size} keeps a plausible recommendation rather than a pure-fold range`);
      if (stack.key === "51-80" || stack.key === "80+") {
        assert.equal(plan.mix.jam, 0, `${position}/${stack.key}/${size} does not label deep 4-bets as open jams`);
      }
    }
  }
}
assert.equal(targetPlanCount, 72, "all position / stack / size target combinations are audited");
const mixSignature = (mix) => ["fold", "call", "fourbet", "jam"]
  .map((action) => `${action}:${mix[action].toFixed(4)}`)
  .join("|");
for (const position of model.positions) {
  for (const stack of model.stacks) {
    const plansBySize = model.sizes.map((size) => targetPlans.get(`${position}/${stack.key}/${size}`));
    const [smallPlan, neutralPlan, largePlan] = plansBySize;
    const small = smallPlan.mix.fold;
    const neutral = neutralPlan.mix.fold;
    const large = largePlan.mix.fold;
    assert(small < neutral, `${position}/${stack.key} defends wider against 2.5x than against 3x`);
    assert(neutral < large, `${position}/${stack.key} folds more against 4x than against 3x`);
    assert.equal(
      new Set(plansBySize.map((plan) => mixSignature(plan.mix))).size,
      model.sizes.length,
      `${position}/${stack.key} exposes a distinct aggregate for every selected 3-bet size`
    );
    assert.notEqual(
      smallPlan.mix.fourbet,
      neutralPlan.mix.fourbet,
      `${position}/${stack.key} ordinary 4-bet frequency changes between 2.5x and 3x`
    );
    assert.notEqual(
      neutralPlan.mix.fourbet,
      largePlan.mix.fourbet,
      `${position}/${stack.key} ordinary 4-bet frequency changes between 3x and 4x`
    );
    if (stack.key === "20-30" || stack.key === "31-50") {
      assert.equal(
        new Set(plansBySize.map((plan) => plan.mix.jam.toFixed(4))).size,
        model.sizes.length,
        `${position}/${stack.key} 4-bet jam frequency changes with the incoming 3-bet size`
      );
    }
  }
  for (const size of model.sizes) {
    assert.notEqual(
      mixSignature(targetPlans.get(`${position}/51-80/${size}`).mix),
      mixSignature(targetPlans.get(`${position}/80+/${size}`).mix),
      `${position}/${size} keeps 51–80 BB distinct from 80+ BB`
    );
  }
}
for (const position of ["EP", "MP", "HJ", "CO"]) {
  for (const stack of model.stacks) {
    for (const size of model.sizes) {
      const ipPlan = model.targetPlan({
        position,
        relation: "IP",
        stack: stack.key,
        size,
        openFrequencies: rfiData.sourceFrequencies[position]
      });
      const oopPlan = model.targetPlan({
        position,
        relation: "OOP",
        stack: stack.key,
        size,
        openFrequencies: rfiData.sourceFrequencies[position]
      });
      assert.notEqual(
        mixSignature(ipPlan.mix),
        mixSignature(oopPlan.mix),
        `${position}/${stack.key}/${size} exposes a distinct aggregate when IP/OOP changes`
      );
    }
  }
}
assert.deepEqual(
  JSON.parse(JSON.stringify(targetPlans.get("EP/80+/3").mix)),
  { fold: 57.56, call: 29.69, fourbet: 12.75, jam: 0 },
  "EP 80+ BB versus 3x applies the selected IP node to the exact matrix and EP open weights"
);
assert.deepEqual(
  JSON.parse(JSON.stringify(targetPlans.get("EP/20-30/3").mix)),
  { fold: 61.04, call: 26.13, fourbet: 3.57, jam: 9.26 },
  "the shallow-stack plan trims speculative calls and moves the selected IP response into the jam bucket"
);
assert.deepEqual(
  JSON.parse(JSON.stringify(targetPlans.get("BTN/80+/3").mix)),
  { fold: 67.3, call: 25.62, fourbet: 7.08, jam: 0 },
  "BTN 80+ BB versus 3x is independently aggregated from BTN open frequencies and the IP node"
);
assert.deepEqual(
  JSON.parse(JSON.stringify(targetPlans.get("SB/80+/3").mix)),
  { fold: 65, call: 27, fourbet: 8, jam: 0 },
  "SB 80+ BB versus 3x preserves the source-conditioned SB versus BB aggregate"
);

const introScenario = model.scenario({
  position: "CO",
  relation: "OOP",
  stack: "31-50",
  size: 3,
  cohort: "reference"
});
assert.deepEqual(
  JSON.parse(JSON.stringify(introScenario.cells["98s"])),
  { fold: 15.31, call: 79.41, fourbet: 3.8, jam: 1.48 },
  "the intro 98s cell stays tied to the canonical reference scenario"
);
assert.equal(data.intro.id, "intro-98s-co-vs-btn");
assert.equal(data.intro.hand, "98s");
assert.deepEqual(
  JSON.parse(JSON.stringify(data.intro.table.heroCards)),
  ["9c", "8c"],
  "the intro table renders the suited 98 cards"
);
assert.equal(data.intro.options.find((option) => option.correct)?.key, "call");
assert.equal(data.intro.options.find((option) => option.key === "fourbet")?.acceptableMix, true);
assert.equal(data.intro.options.find((option) => option.key === "fold")?.acceptableMix, undefined);
assert.match(data.intro.answer, /колл.*79,4%/i);

const coIpScenario = model.scenario({
  position: "CO",
  relation: "IP",
  stack: "31-50",
  size: 3,
  cohort: "reference"
});
const coOopScenario = model.scenario({
  position: "CO",
  relation: "OOP",
  stack: "31-50",
  size: 3,
  cohort: "reference"
});
assert.notDeepEqual(
  JSON.parse(JSON.stringify(coIpScenario.cells.AQs)),
  JSON.parse(JSON.stringify(coOopScenario.cells.AQs)),
  "IP and OOP filters produce visibly different action frequencies for the same hand"
);
assert(
  source.html.indexOf("data-intro-feedback") < source.html.indexOf("data-intro-table"),
  "the intro prompt must live above the deal table so the task is visible before the action area"
);
assert(
  source.html.indexOf("data-practice-table") < source.html.indexOf("data-practice-feedback"),
  "the practice feedback must live after the table so stale CSS cannot overlap it with the practice table"
);
assert.doesNotMatch(
  source.explorerCss,
  /\.vs3-intro-decision-stack\s*>\s*\.decision-feedback[\s\S]{0,180}position:\s*absolute/,
  "the intro prompt must stay in normal flow above the deal table"
);
assert.doesNotMatch(
  source.explorerCss,
  /\.decision-panel \.lesson-table-host[\s\S]{0,140}order:\s*2/,
  "decision panel table must not be reordered below feedback by responsive CSS"
);

const t8sSmallThreeBet = model.scenario({
  position: "HJ",
  relation: "IP",
  stack: "31-50",
  size: 3,
  cohort: "reference"
}).cells.T8s;
assert(
  t8sSmallThreeBet.call > 0 && t8sSmallThreeBet.fold > 0,
  "HJ T8s in position against a 3x-to-6-BB 3-bet stays a mixed boundary hand"
);
assert(
  t8sSmallThreeBet.call < 60,
  "the neutral 3x model no longer manufactures a 60%+ call by moving most folds into call"
);

const exactChecks = [
  ["EP", "QJs", { fold: 90, call: 10, fourbet: 0, jam: 0 }],
  ["MP", "JJ", { fold: 0, call: 50, fourbet: 50, jam: 0 }],
  ["MP", "T9s", { fold: 70, call: 30, fourbet: 0, jam: 0 }],
  ["HJ", "ATs", { fold: 0, call: 100, fourbet: 0, jam: 0 }],
  ["CO", "K6s", { fold: 99, call: 1, fourbet: 0, jam: 0 }],
  ["BTN", "99", { fold: 0, call: 0, fourbet: 100, jam: 0 }],
  ["BTN", "97s", { fold: 0, call: 100, fourbet: 0, jam: 0 }],
  ["SB", "KQo", { fold: 0, call: 100, fourbet: 0, jam: 0 }]
];
for (const [position, hand, expected] of exactChecks) {
  assert.deepEqual(
    JSON.parse(JSON.stringify(model.baseline(position).cells[hand])),
    expected,
    `${position} ${hand} matches the exact methodology transcription`
  );
}

const validRelations = (position) => position === "BTN" ? ["IP"] : position === "SB" ? ["OOP"] : ["IP", "OOP"];
const premiums = ["AA", "KK", "QQ", "AKs", "AKo"];
let scenarioCount = 0;
let jamCellCount = 0;
for (const position of model.positions) {
  for (const relation of validRelations(position)) {
    for (const stack of model.stacks) {
      for (const size of model.sizes) {
        for (const cohort of model.cohorts) {
          const scenario = model.scenario({
            position,
            relation,
            stack: stack.key,
            size,
            cohort: cohort.key
          });
          scenarioCount += 1;
          assert.equal(Object.keys(scenario.cells).length, 169);
          for (const hand of model.hands) {
            const cell = scenario.cells[hand];
            const total = ["fold", "call", "fourbet", "jam"].reduce((sum, action) => {
              assert(cell[action] >= 0, `${position}/${relation}/${stack.key}/${size}/${cohort.key}/${hand}/${action} is non-negative`);
              return sum + cell[action];
            }, 0);
            assert(Math.abs(total - 100) < 0.001, `${position}/${relation}/${stack.key}/${size}/${cohort.key}/${hand} totals 100%`);
            if (stack.key === "20-30" && cell.jam > 0) jamCellCount += 1;
          }
          premiums.forEach((hand) => {
            assert.equal(scenario.cells[hand].fold, 0, `${hand} never folds in ${position}/${relation}/${stack.key}/${size}/${cohort.key}`);
          });
        }
      }
    }
  }
}
assert.equal(scenarioCount, 120 * model.cohorts.length, "scenario grid covers every currently available cohort layer");
assert(jamCellCount > 0, "short-stack scenarios contain a distinct 4-bet jam component");

const scenarioFingerprint = (scenario) => model.hands
  .map((hand) => {
    const cell = scenario.cells[hand];
    return `${hand}:${cell.fold.toFixed(2)},${cell.call.toFixed(2)},${cell.fourbet.toFixed(2)},${cell.jam.toFixed(2)}`;
  })
  .join("|");
for (const position of model.positions) {
  for (const relation of validRelations(position)) {
    for (const stack of model.stacks) {
      const scenarios = model.sizes.map((size) => model.scenario({
        position,
        relation,
        stack: stack.key,
        size,
        cohort: "reference"
      }));
      assert.equal(
        new Set(scenarios.map(scenarioFingerprint)).size,
        model.sizes.length,
        `${position}/${relation}/${stack.key} changes the full 169-cell chart for every incoming 3-bet size`
      );
      for (const hand of model.hands) {
        const hasAggressiveComponent = scenarios.some((scenario) => (
          scenario.cells[hand].fourbet + scenario.cells[hand].jam >= 1
        ));
        if (hasAggressiveComponent) continue;
        const continuation = scenarios.map((scenario) => 100 - scenario.cells[hand].fold);
        assert(
          continuation[0] + 0.5 >= continuation[1]
            && continuation[1] + 0.5 >= continuation[2],
          `${position}/${relation}/${stack.key}/${hand} never continues more often versus a meaningfully larger 3-bet`
        );
      }
    }
    for (const size of model.sizes) {
      const mediumDeep = model.scenario({
        position,
        relation,
        stack: "51-80",
        size,
        cohort: "reference"
      });
      const deepest = model.scenario({
        position,
        relation,
        stack: "80+",
        size,
        cohort: "reference"
      });
      assert.notEqual(
        scenarioFingerprint(mediumDeep),
        scenarioFingerprint(deepest),
        `${position}/${relation}/${size} changes the full 169-cell chart between 51–80 and 80+ BB`
      );
    }
  }
}
for (const position of ["EP", "MP", "HJ", "CO"]) {
  for (const stack of model.stacks) {
    for (const size of model.sizes) {
      const ipScenario = model.scenario({
        position,
        relation: "IP",
        stack: stack.key,
        size,
        cohort: "reference"
      });
      const oopScenario = model.scenario({
        position,
        relation: "OOP",
        stack: stack.key,
        size,
        cohort: "reference"
      });
      assert.notEqual(
        scenarioFingerprint(ipScenario),
        scenarioFingerprint(oopScenario),
        `${position}/${stack.key}/${size} changes the full 169-cell chart when IP/OOP changes`
      );
    }
  }
}

assert.equal(model.practiceSpotIds().length, 240);
assert.equal(new Set(model.practiceSpotIds()).size, 240);
assert.equal(data.practice.length, 240);
assert.equal(data.practiceModes.length, 1);
assert.equal(data.practiceModes[0].spotIds.length, 240);

const correctActions = new Set();
let minimumCorrectFrequency = 100;
for (const spot of data.practice) {
  assert.equal(spot.options.filter((option) => option.correct).length, 1, `${spot.id} has exactly one teaching answer`);
  assert.equal(spot.table.heroCards.length, 2, `${spot.id} has hero cards`);
  assert.equal(
    Number.parseFloat(spot.table.pot),
    preflopPotBb({
      anteBb: 1,
      contributions: [
        { position: spot.practiceMeta.heroPosition, amountBb: spot.practiceMeta.openToBb },
        { position: spot.practiceMeta.villainPosition, amountBb: spot.practiceMeta.threeBetToBb }
      ]
    }),
    `${spot.id} includes blinds, BB ante, Hero open and villain 3-bet exactly once`
  );
  assert.equal(spot.practiceMeta.family, "vs3bet-defense");
  assert.equal(spot.practiceMeta.sourceStatus, "exact-baseline-plus-transparent-heuristics");
  assert.equal(spot.practiceMeta.hand, spot.hand);
  assert.equal(spot.practiceMeta.correctAction, spot.options.find((option) => option.correct).key);
  assert(spot.practiceMeta.acceptableActions.includes(spot.practiceMeta.correctAction));
  for (const option of spot.options) {
    assert.equal(
      option.acceptableMix === true,
      option.key !== spot.practiceMeta.correctAction && spot.practiceMeta.acceptableActions.includes(option.key),
      `${spot.id}/${option.key} exposes every accepted secondary mix and no false alternative`
    );
  }
  correctActions.add(spot.practiceMeta.correctAction);
  minimumCorrectFrequency = Math.min(
    minimumCorrectFrequency,
    spot.practiceMeta.actions[spot.practiceMeta.correctAction]
  );
}
assert.deepEqual(Array.from(correctActions).sort(), ["call", "fold", "fourbet", "jam"]);
assert(minimumCorrectFrequency >= 60, "generated quiz answers use a clear main line");

for (const position of model.positions) {
  for (const relation of validRelations(position)) {
    for (const stack of model.stacks) {
      for (const size of model.sizes) {
        const ids = model.practiceSpotIds({
          position,
          relation,
          stack: stack.key,
          size,
          cohort: "reference"
        });
        assert.equal(ids.length, 2, `${position}/${relation}/${stack.key}/${size} has two practice variants`);
        const spots = ids.map((id) => data.practice.find((spot) => spot.id === id));
        assert(spots.every(Boolean), `${position}/${relation}/${stack.key}/${size} ids resolve to authored spots`);
        assert.notEqual(spots[0].hand, spots[1].hand, `${position}/${relation}/${stack.key}/${size} uses different hands`);
        assert.notEqual(
          spots[0].practiceMeta.handClass,
          spots[1].practiceMeta.handClass,
          `${position}/${relation}/${stack.key}/${size} uses different hand classes`
        );
      }
    }
  }
}
assert.equal(model.practiceSpotIds({ position: "BTN", relation: "OOP" }).length, 0);
assert.equal(model.practiceSpotIds({ position: "SB", relation: "IP" }).length, 0);

assert.match(source.explorer, /Сравнение ошибок временно скрыто/, "unverified field errors render a learner-safe fail-closed state");

assert.equal(continuationRegistry.spotIds.length, 1);
const continuationSpot = data.practice.find((spot) => spot.id === continuationRegistry.spotIds[0]);
assert(continuationSpot?.continuation, "one practice spot exposes a full-hand continuation");
assert.deepEqual(Array.from(continuationApi.validateContinuation(continuationSpot).errors), []);
for (const key of ["launchLabel", "coachEyebrow", "coachTitle", "coachCopy", "completeEyebrow", "completeTitle", "completeCopy"]) {
  assert.match(continuationSpot.continuation.ui[key], /\S/, `continuation.ui.${key} is present`);
}

const stepOrder = Array.from(
  source.html.matchAll(/data-step="([^"]+)"/g),
  (match) => match[1]
);
assert.deepEqual(stepOrder, ["deal", "wisdom", "field", "practice"]);
assert.match(source.html, />3\. Чарты</);
assert.match(source.html, />4\. Практика</);
assert.doesNotMatch(source.html, /data-step="leaks"/);
assert.doesNotMatch(source.html, /id="leaksTab"/);
assert.match(source.html, /data-vs3-target-overview/);
assert.doesNotMatch(source.html, /data-wisdom-carousel/);
assert.match(source.html, /data-vs3-range-explorer/);
assert.match(source.html, /data-vs3-practice-filters/);
assert.match(source.html, /data-vs3-practice-expected/);
assert.match(source.html, /practice-hud-rail/);
assert.match(source.html, /Начни со всех ситуаций/);
assert.doesNotMatch(source.html, /data-vs3-reg-view-tabs/);
assert.doesNotMatch(source.html, /data-vs3-wisdom-reference/);
assert.doesNotMatch(source.html, /data-vs3-field-explorer/);
assert.doesNotMatch(source.html, /data-vs3-leaks/);
assert.doesNotMatch(source.html, /id="vs3RegFieldPanel"/);
assert.doesNotMatch(source.html, /Как играет поле|Сводка поля|Руки поля|Реальные раздачи FF|Новички против топов|игрокам рангов/);
assert.doesNotMatch(source.html, /wisdom-reference\.js|field-explorer\.js/);
assert.match(source.fieldExplorer, /if \(!data\)[\s\S]*regSwitcher\.hidden = true[\s\S]*return;/, "unverified field controls fail closed before rendering");
assert.match(source.fieldExplorer, /chartsTab\.textContent = "3\. Чарты и поле"/, "a verified cube restores the field tab label");
assert.doesNotMatch(source.html, /Где поле защищается лишне или недостаточно/);
assert.doesNotMatch(source.html, /Сначала открой наш чарт/);
assert.doesNotMatch(source.html, /Это фактические решения поля, а не совет/);
assert.doesNotMatch(source.html, /Как играют реги/);
assert.doesNotMatch(source.html, /игрокам рангов 15–17/);
assert.doesNotMatch(source.fieldExplorer, /vs3-error-context/);
assert.doesNotMatch(source.fieldExplorer, /Чаще встречаются лишних пасов/);
assert.match(source.fieldExplorer, /Поле чаще пасует лишний раз/);
assert.doesNotMatch(source.model, /League 1 реже/);
assert.equal(Array.from(source.html.matchAll(/data-vs3-reg-view-panel="target"/g)).length, 1);
assert.equal(Array.from(source.html.matchAll(/data-vs3-reg-view-panel="field"/g)).length, 0);
const mainHostIndex = source.html.indexOf("data-vs3-target-overview");
const chartPanelIndex = source.html.indexOf('id="chartsPanel"');
const practicePanelIndex = source.html.indexOf('id="practicePanel"');
assert(mainHostIndex > 0 && mainHostIndex < chartPanelIndex, "target overview lives on step 2 Главное");
for (const marker of ["data-vs3-range-explorer"]) {
  const markerIndex = source.html.indexOf(marker);
  assert(markerIndex > chartPanelIndex && markerIndex < practicePanelIndex, `${marker} lives inside unified step 3`);
}
const expectedScriptOrder = [
  "simulator-snapshot.js",
  "simulator-practice.js",
  "simulator-continuation.js",
  "poker-vs-3bet-defense-lesson/continuations.js",
  "poker-rfi-open-lesson/data.js",
  "poker-kit/observed-frequency-confidence.js",
  "poker-vs-3bet-defense-lesson/data/vs3bet-field-data.js",
  "poker-vs-3bet-defense-lesson/field-data-readiness.js",
  "poker-vs-3bet-defense-lesson/range-model.js",
  "poker-vs-3bet-defense-lesson/data.js",
  "poker-vs-3bet-defense-lesson/range-explorer.js",
  "poker-field-lesson/lesson.js"
];
for (let index = 1; index < expectedScriptOrder.length; index += 1) {
  assert(
    source.html.indexOf(expectedScriptOrder[index - 1]) < source.html.indexOf(expectedScriptOrder[index]),
    `${expectedScriptOrder[index - 1]} loads before ${expectedScriptOrder[index]}`
  );
}
const finalCourseLink = source.html.match(/<a href="([^"]+)" data-footer-next>([^<]+)<\/a>/);
assert.deepEqual(
  finalCourseLink?.slice(1),
  ["/poker-simulator", "Перейти к свободной игре →"],
  "the final lesson hands off to free play instead of looping to check-raise"
);
assert.doesNotMatch(
  source.html,
  /<a href="\/flop-checkraise-lesson" data-footer-next>/,
  "the final lesson must not loop back to check-raise"
);
assert.match(source.explorer, /4-бет пуш/);
assert.match(source.explorer, /В позиции/);
assert.match(source.explorer, /Без позиции/);
assert.match(source.explorer, /PokerRfiData/);
assert.match(source.explorer, /sourceFrequencies/);
assert.match(source.explorer, /function openFrequencyFor/);
assert.match(source.explorer, /function visualOpenFill/);
assert.match(source.explorer, /function practiceFilterPayload/);
assert.match(source.explorer, /function renderPracticeExpected/);
assert.match(source.explorer, /Все ситуации/);
assert.match(source.explorer, /createPracticePreset\("В позиции", "IP"\)/);
assert.match(source.explorer, /createPracticePreset\("Без позиции", "OOP"\)/);
assert.match(source.explorer, /Точная настройка/);
assert.match(source.explorer, /practiceStartButton\.textContent = ids\.length \? "Начать практику"/);
assert.doesNotMatch(source.html, /data-vs3-practice-scope|Считаем доступные раздачи/);
assert.match(source.html, /Бесконечная практика против 3-бета/);
assert.match(source.html, /без лимита раздач/);
assert.match(source.explorer, /FFFieldLessonPracticeExtension/);
assert.match(source.explorer, /Math\.max\(10, Math\.min\(100, frequency\)\)/);
assert.match(source.explorer, /data-vs3-open-frequency|dataset\.vs3OpenFrequency/);
assert.match(source.explorer, /Высота — как часто открываем руку\. Цвет заполнения — точная смесь паса, колла, 4-бета и пуша/);
assert.match(source.explorer, /минимальная полоса 10%/);
assert.match(source.explorer, /function applyMixSurface/);
assert.match(source.explorer, /vs3-matrix-summary-bar/);
assert.match(source.explorerCss, /\.vs3-matrix-summary-bar[\s\S]*display: flex/);
assert.match(source.explorerCss, /--vs3-fold-end/);
assert.match(source.explorerCss, /\.vs3-open-weight-fill[\s\S]*height: var\(--vs3-open-fill/);
assert.match(source.explorer, /vs3-range-grid ff-range-grid/);
assert.match(source.explorer, /vs3-range-cell ff-range-cell/);
assert.match(source.explorer, /button\.append\(fill, element\("strong", "", hand\), createMixBar\(mix, "vs3-cell-mix"\)\)/);
assert.match(source.explorer, /cell\.append\(fill, element\("strong", "", hand\), createMixBar\(mix, "vs3-cell-mix"\)\)/);
assert.doesNotMatch(source.explorerCss, /\.vs3-range-cell > \.vs3-cell-mix \{ display: none; \}/);
assert.match(source.explorerCss, /\.vs3-range-cell\.is-open-weight-unavailable/);
assert.match(source.explorerCss, /\.vs3-practice-presets/);
assert.match(source.explorerCss, /\.practice-hud-rail/);
assert.match(source.explorerCss, /\.vs3-practice-expected-grid/);
assert.match(
  source.explorerCss,
  /\.vs3-matrix-card,[\s\S]*\.vs3-hand-comparison[\s\S]*overflow: hidden/,
  "range cards clip internal decorations and do not let matrices bleed outside the panel"
);
assert.match(
  source.explorerCss,
  /\.vs3-range-grid[\s\S]*--vs3-range-cell-size: clamp\([\s\S]*grid-template-columns: repeat\(13, minmax\(0, var\(--vs3-range-cell-size\)\)\)[\s\S]*min-width: 0/,
  "range grids must fit their card with adaptive cells instead of a hard desktop minimum"
);
assert.doesNotMatch(source.explorerCss, /min-width: 660px/);
assert.doesNotMatch(source.explorerCss, /repeat\(13, 47px\)/);
assert.match(
  source.explorerCss,
  /\.vs3-chart-layout[\s\S]*grid-template-columns: minmax\(0, 1fr\)[\s\S]*width: min\(100%, 980px\)/,
  "the chart and selected-hand detail must use one readable centered column"
);
assert.match(
  source.explorerCss,
  /\.vs3-wisdom-chart-layout[\s\S]*grid-template-columns: minmax\(0, 1fr\)[\s\S]*width: min\(100%, 980px\)/,
  "the observed chart must follow the same readable one-column contract"
);
assert.match(source.model, /potBeforeThreeBet:\s*4\.5/);
assert.match(source.model, /riskBb \/ \(riskBb \+ TARGET_POLICY\.potBeforeThreeBet\) \* 100/);
assert.doesNotMatch(source.model, /safetyMarginPct|maxFoldPct|targetBluffEvBb/);
assert.match(source.explorer, /model\?\.targetEconomics/);
assert.match(source.explorer, /model\?\.targetPlan/);
assert.match(source.explorer, /dataset\.vs3ScenarioSignature/);
assert.match(source.explorer, /vs3-matrix-summary-metrics/);
assert.doesNotMatch(source.explorer, /exactOpenWeightedTarget/);
assert.match(source.explorer, /Автоприбыль начинается выше/);
assert.match(source.explorer, /Если мы пасуем чаще .* даже нулевой блеф уже плюсует сразу/);
assert.doesNotMatch(source.explorer, /solver-MDF/);
assert.match(source.explorer, /profitBoundary/);
assert.match(source.explorer, /targets:/);
assert.match(source.explorer, /function strategyFor\(next = \{\}\)/);
assert.match(source.explorer, /strategyFor,/);
assert.match(source.explorer, /mix\.missing \? "is-missing" : dominantAction\(mix\)\.tone/);
assert.match(source.explorer, /button\.disabled = mix\.missing/);
assert.match(
  source.explorer,
  /const availableOptions = key === "relation"[\s\S]*filter\(\(option\) => relationAllowed\(option\.key\)\)/,
  "structurally impossible relation choices are omitted instead of rendered disabled"
);
assert.match(
  source.explorer,
  /const rows = \[\{ key: "", label: anyLabel \}, \.\.\.filterOptions\[key\]\]\.filter[\s\S]*practicePositionAllowed\(option\.key\)/,
  "practice position choices form a contextual catalog for the selected scope"
);
assert.doesNotMatch(
  source.explorer,
  /button\.disabled = unavailable|setAttribute\("aria-disabled", "true"\)/,
  "learner-facing VS3 selectors never render dead disabled choices"
);
assert.match(source.explorer, /const rawFieldData = root\.FF_VS3BET_FIELD_DATA/);
assert.match(source.explorer, /"2\.5": "<6"/);
assert.match(source.explorer, /"3": "6-8"/);
assert.match(source.explorer, /"4": "8-10"/);
assert.match(source.explorer, /function measuredFieldRow/);
assert.match(source.explorer, /object\.label \|\| object\.name \|\| LABELS/, "field-sourced cohort labels outrank fallback UI labels");
assert.match(source.explorer, /vs3-comparison-table/);
assert.match(source.explorer, /Реальные решения FF/);
assert.doesNotMatch(source.explorer, /Слабые выборки скрыты|Мало данных|Ориентир/);
assert.match(source.explorer, /key === "cohort" && \["chart", "practice"\]\.includes\(context\)/);
assert.match(source.explorerCss, /--vs3-fold: #91a9d0/);
assert.match(source.explorerCss, /\.is-fold[\s\S]*--vs3-cell-surface/);
assert.match(source.explorerCss, /\.vs3-range-cell\.is-missing/);
assert.match(source.explorerCss, /\.vs3-comparison-table/);
assert.match(source.explorerCss, /\.vs3-comparison-delta\.is-more/);
assert.match(source.explorerCss, /\.vs3-field-range-cell\.is-unavailable[\s\S]*background: #121016/);
assert.match(source.explorerCss, /\.vs3-field-occurrence-fill[\s\S]*height: var\(--vs3-field-occurrence-fill/);
assert.match(source.explorerCss, /\.vs3-field-range-cell\.has-occurrence-weight[\s\S]*background: #151219/);
assert.match(source.fieldExplorer, /function occurrenceProfile\(current\)/);
assert.match(source.fieldExplorer, /startingHandComboCount\(hand\)/);
assert.match(source.fieldExplorer, /--vs3-field-occurrence-fill/);
assert.match(source.fieldExplorer, /vs3-field-range-cell ff-range-cell has-occurrence-weight/);
assert.doesNotMatch(source.fieldExplorer, /button\.append\([^\n]+createMixBar/);
assert.match(source.wisdomReference, /FF_VS3BET_FIELD_DATA/);
assert.match(source.wisdomReference, /data\?\.charts/);
assert.match(source.wisdomReference, /vs3-wisdom-fold[^\n]+formatPercent\(mix\.fold\)/);
assert.match(source.wisdomReference, /: пас \$\{formatPercent\(mix\.fold\)\}/);
assert.match(source.wisdomReference, /Таблица фолдов/);
assert.match(source.wisdomReference, /Крупно — как часто игроки пасуют на 3-бет/);
assert.doesNotMatch(source.wisdomReference, /Таблица дефендов/);
assert.doesNotMatch(source.wisdomReference, /vs3-wisdom-defense|Крупно — вся защита/);
assert.match(source.wisdomReference, /data\.meta\.hands\.forEach/);
assert.match(source.wisdomReference, /function startingHandComboCount/);
assert.match(source.wisdomReference, /return value\.endsWith\("s"\) \? 4 : 12/);
assert.match(source.wisdomReference, /count\(source\?\.cells\?\.\[index\]\?\.\[0\]\) \/ startingHandComboCount\(hand\)/);
assert.match(source.wisdomReference, /\[state\.cohort, state\.position, state\.relation, state\.stack, "all"\]/);
assert.match(source.wisdomReference, /dataset\.vs3OccurrenceFrequency/);
assert.match(source.wisdomReference, /vs3-range-grid vs3-wisdom-range-grid ff-range-grid/);
assert.match(source.wisdomReference, /vs3-field-range-cell vs3-wisdom-range-cell ff-range-cell/);
assert.match(source.wisdomReference, /--vs3-field-occurrence-fill/);
assert.match(source.wisdomReference, /Высота цвета — как часто рука встречается среди опенов/);
assert.match(source.wisdomReference, /Это наблюдаемая игра поля, а не рекомендация/);
assert.doesNotMatch(source.wisdomReference, /5 051 115 решений/);
assert.doesNotMatch(source.wisdomReference, /FF_VS3BET_RANGE_MODEL|scenario\.summary/);
assert.match(source.fieldExplorer, /Высота — встречаемость среди опенов с учётом комбо\. Цвет — главное действие/);
assert.match(source.fieldExplorer, /observedConfidence\?\.canRenderExact/);
assert.match(source.fieldExplorer, /function comparisonAvailable\(selection = state\)[\s\S]*enabledComparisonKeys\.has\(comparisonKey\(selection\)\)/, "filter choices use the build-time 169-hand common-cohort allowlist");
assert.match(source.fieldExplorer, /const publishedStates = Array\.from\(enabledComparisonKeys\)[\s\S]*Boolean\(data\?\.charts\?\.\[chartKey\(selection\)\]\)/, "field filters are derived only from complete published cohort charts");
assert.match(source.fieldExplorer, /function valuesForFilter\(key\)[\s\S]*upstream\.every/, "field filters form a contextual catalog instead of a Cartesian selector");
assert.match(source.fieldExplorer, /function availableFilterValues\(key, config\)[\s\S]*key !== "relation"[\s\S]*publishedStates\.some/, "the relation switch stays usable while every other filter remains source-backed");
assert.match(source.fieldExplorer, /function selectionForFilter\(key, value\)[\s\S]*value === "OOP" \? "CO" : "BTN"[\s\S]*Boolean\(chart\(\{ \.\.\.next, position \}\)\)/, "switching IP\/OOP moves an incompatible edge position to a published chart");
assert.match(source.fieldExplorer, /availableFilterValues\(key, config\)\.forEach/, "only usable field-filter controls are rendered");
assert.match(source.fieldExplorer, /function reconcileFilters\(changedKey = ""\)/, "downstream choices reconcile to a complete chart");
assert.doesNotMatch(source.fieldExplorer, /button\.disabled = unavailable|filterValueAvailable/, "sparse field dimensions never become learner-facing disabled controls");
assert.match(source.fieldExplorer, /dataset\.vs3ErrorMatrix/);
assert.match(source.fieldExplorer, /dataset\.vs3ErrorDetail/);
assert.match(source.fieldExplorer, /dataset\.vs3ErrorRanking/);
assert.match(source.fieldExplorer, /dataset\.vs3ErrorHand/);
assert.match(source.fieldExplorer, /wilsonInterval/);
assert.match(source.fieldExplorer, /const rankable = observedConfidence\?\.canRenderExact\?\.\(n\) === true/);
assert.match(source.fieldExplorer, /referenceSizeMultiplier/);
assert.match(source.fieldExplorer, /Самые частые ошибки/);
assert.doesNotMatch(source.fieldExplorer, /Слабые выборки скрыты|Мало данных|Ориентир/);
assert.match(source.fieldExplorer, /params\.get\("regView"\)/);
assert.match(source.fieldExplorer, /params\.has\("errorMatrix"\)/);
assert.match(source.fieldExplorer, /return "target"/);
assert.match(source.fieldExplorer, /legacyFieldViews = Object\.freeze\(\{ overview: "summary", hands: "hands", errors: "errors" \}\)/);
assert.match(source.fieldExplorer, /params\.get\("fieldSection"\)/);
assert.match(source.fieldExplorer, /function setFieldTool/);
assert.match(source.fieldExplorer, /data-vs3-reg-view-link/);
assert.match(source.fieldExplorer, /setRegView\("target"\)/);
assert.match(source.fieldExplorer, /showView\(next, options = \{\}\)/);
assert.match(source.fieldExplorer, /showFieldSection\(next, options = \{\}\)/);
assert.match(source.fieldExplorer, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/);
assert.match(source.fieldExplorer, /panel\.hidden = !selected/);
assert.doesNotMatch(source.fieldExplorer, /errorsHost\?\.setAttribute\("aria-live", selected \? "polite" : "off"\)/);
assert.doesNotMatch(source.html, /data-vs3-leaks/);
assert.match(source.explorerCss, /\.vs3-error-layout[\s\S]*grid-template-columns: minmax\(610px/);
assert.match(source.explorerCss, /\.vs3-error-range-cell\.is-underdefense/);
assert.match(source.explorerCss, /\.vs3-error-range-cell\.is-overdefense/);
assert.doesNotMatch(source.explorerCss, /is-estimated/);
assert.doesNotMatch(source.explorer, /--vs3-mix-background/);
assert.match(source.explorer, /dataset\.vs3ActionSignature/);
assert.doesNotMatch(source.explorerCss, /--vs3-mix-background/);
assert.match(source.explorerCss, /\.vs3-open-weight-fill[\s\S]*var\(--vs3-cell-surface/);
assert.match(source.explorerCss, /\.vs3-cell-mix[\s\S]*height: 6px/);
assert.match(source.explorerCss, /@media \(max-width: 760px\)[\s\S]*\.vs3-matrix-scroll[\s\S]*justify-content: flex-start[\s\S]*overflow-scrolling: touch/, "mobile matrices scroll inside their card instead of shrinking labels below the readable cell size");
assert.match(source.explorerCss, /@media \(max-width: 760px\)[\s\S]*\.vs3-range-grid[\s\S]*--vs3-range-cell-size: 31px[\s\S]*min-width: calc\(var\(--vs3-range-cell-size\) \* 13 \+ 48px\)/, "mobile matrices keep a readable 31px cell and expose the full 13x13 grid through internal scrolling");
assert.match(source.explorerCss, /\.vs3-reg-switcher[\s\S]*grid-template-columns: repeat\(2/);
assert.match(source.explorer, /function resolvedFieldSizeBucket\(\)[\s\S]*enabledComparisonKeys\.has\(fieldComparisonKeyFor\(exactBucket\)\)[\s\S]*enabledComparisonKeys\.has\(fieldComparisonKeyFor\("all"\)\)/, "hand comparison falls back to the validated all-sizing slice when the selected exact sizing lacks common N50 coverage");
assert.match(source.explorer, /if \(bucket === "all"\) return "все размеры 3-бета"/, "an all-sizing fallback is named explicitly instead of masquerading as the selected exact sizing");
assert.match(source.explorerCss, /\.vs3-field-tool\[open\]/);
assert.match(source.explorerCss, /\.vs3-reg-tab small \{ display: none; \}/);
assert.match(source.explorerCss, /\.vs3-reg-panel\[hidden\][^}]*display: none !important/);
assert.match(source.sharedLesson, /continuationUi/);
assert.match(source.sharedLesson, /saved\.step === "leaks"/);
assert.match(source.sharedLesson, /has\("regView"\)/);
assert.match(source.sharedLesson, /--practice-correct-pct/);
assert.match(source.sharedLesson, /FFFieldLessonPracticeExtension/);
assert.match(source.research, /Статус публикации: куб закарантинен/);
assert.match(source.research, /latest-версию каждой `hand_player_id`/);
assert.match(source.research, /169\/169 рук с `N >= 50`/);
assert.match(source.research, /запрещать smoothing, prior, interpolation/);
assert.match(source.research, /не release evidence/);
assert.match(source.research, /squeeze\/cold-call/);
assert.match(source.research, /учебной адаптацией/);
assert.match(source.research, /не являются измеренными hand-level[\s\S]*учебную модель/);
assert.match(source.transcript, /JJ.*call 50 \/ 4-bet 50/);
assert.match(source.transcript, /## BTN[\s\S]*Call 100:[\s\S]*97s/);

console.log("vs-3bet defense lesson contract: ok");
