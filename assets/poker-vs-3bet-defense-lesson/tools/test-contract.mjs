import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const files = {
  html: "vs-3bet-defense-lesson.html",
  controller: "assets/poker-trainer-shell/simulator-continuation.js",
  continuations: "assets/poker-vs-3bet-defense-lesson/continuations.js",
  model: "assets/poker-vs-3bet-defense-lesson/range-model.js",
  data: "assets/poker-vs-3bet-defense-lesson/data.js",
  fieldData: "assets/poker-vs-3bet-defense-lesson/data/vs3bet-field-data.js",
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
for (const key of ["controller", "continuations", "model", "data", "fieldData"]) {
  vm.runInContext(source[key], context, { filename: files[key] });
}

const data = context.window.FF_POKER_FIELD_LESSON_DATA;
const model = context.window.FF_VS3BET_RANGE_MODEL;
const continuationApi = context.window.FFTrainerSimulatorContinuation;
const continuationRegistry = context.window.FF_VS3BET_CONTINUATIONS;
const fieldData = context.window.FF_VS3BET_FIELD_DATA;

assert.equal(data.schemaVersion, 1);
assert.equal(data.key, "vs-3bet-defense");
assert.equal(data.wisdom.length, 3);
assert.deepEqual(Array.from(data.cohorts, (cohort) => cohort.key), ["league1", "league2", "league3", "rank15_17"]);
assert.equal(data.cohorts.slice(0, 3).reduce((sum, cohort) => sum + cohort.sample, 0), 6557996);
for (const cohort of data.cohorts) {
  const actionTotal = cohort.actions.reduce((sum, action) => sum + action.pct, 0);
  assert(Math.abs(actionTotal - 100) < 0.02, `${cohort.key} fold/call/4-bet reconciles to 100%`);
}
assert.equal(data.cohorts[0].actions[2].pct, 16.30);
assert.equal(data.cohorts[2].actions[0].pct, 59.96);
assert.equal(data.cohorts[3].sample, 861445);
assert.equal(data.cohorts[3].players, 953);
assert.doesNotMatch(source.data, /42,6 → 21,0%/);
assert.equal(fieldData.version, "vs3bet-field-cube-20260717-v3");
assert.equal(fieldData.meta.windowEndExclusive, "2026-07-17T00:00:00Z");
assert.equal(fieldData.meta.hands.length, 169);
assert.equal(Object.keys(fieldData.charts).length, 778, "20 chart slices below the public N threshold stay omitted");
assert.equal(fieldData.summaries.league3.opportunities, 2483604);
assert.equal(fieldData.meta.filters.squeezeExcluded, true);
assert.match(fieldData.meta.aggregation, /descriptive|integer|count/i);

assert.equal(model.schemaVersion, 1);
assert.deepEqual(Array.from(model.positions), ["EP", "MP", "HJ", "CO", "BTN", "SB"]);
assert.deepEqual(Array.from(model.relations), ["IP", "OOP"]);
assert.deepEqual(Array.from(model.stacks, (stack) => stack.key), ["20-30", "31-50", "51-80", "80+"]);
assert.deepEqual(Array.from(model.sizes), [2.5, 3, 4]);
assert.deepEqual(Array.from(model.cohorts, (cohort) => cohort.key), ["reference", "league1", "league2", "league3", "novice"]);
assert.equal(model.hands.length, 169);
assert.equal(new Set(model.hands).size, 169);

const introScenario = model.scenario({
  position: "CO",
  relation: "OOP",
  stack: "31-50",
  size: 3,
  cohort: "reference"
});
assert.deepEqual(
  JSON.parse(JSON.stringify(introScenario.cells.JJ)),
  { fold: 0, call: 0, fourbet: 72, jam: 28 },
  "the intro JJ cell stays tied to the canonical reference scenario"
);
assert.equal(data.intro.id, "intro-jj-co-vs-btn");
assert.equal(data.intro.options.find((option) => option.correct)?.key, "fourbet");
assert.equal(data.intro.options.find((option) => option.key === "jam")?.acceptableMix, true);
assert.doesNotMatch(data.intro.answer, /колл сохраняет/i);

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
assert.equal(scenarioCount, 600);
assert(jamCellCount > 0, "short-stack scenarios contain a distinct 4-bet jam component");

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
  assert.equal(spot.table.pot, "1 BB", `${spot.id} keeps only the carried BB ante in the pot label`);
  assert.equal(spot.practiceMeta.family, "vs3bet-defense");
  assert.equal(spot.practiceMeta.sourceStatus, "exact-baseline-plus-transparent-heuristics");
  assert.equal(spot.practiceMeta.hand, spot.hand);
  assert.equal(spot.practiceMeta.correctAction, spot.options.find((option) => option.correct).key);
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

const defaultLeaks = model.leaks.compare({
  position: "CO",
  relation: "IP",
  stack: "31-50",
  size: 3,
  cohort: "novice",
  threshold: 1
});
assert(defaultLeaks.groups.underdefend.length > 0, "novice layer produces underdefense examples");
assert(defaultLeaks.groups.overdefend.length > 0, "novice layer produces overdefense examples");
assert(defaultLeaks.groups.missedAggression.length > 0, "novice layer produces missed 4-bet examples");

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
assert.deepEqual(stepOrder, ["deal", "wisdom", "field", "leaks", "practice"]);
assert.match(source.html, /data-vs3-wisdom-reference/);
assert.doesNotMatch(source.html, /data-wisdom-carousel/);
assert.match(source.html, /data-vs3-range-explorer/);
assert.match(source.html, /data-vs3-field-explorer/);
assert.match(source.html, /data-vs3-leaks/);
assert.match(source.html, /data-vs3-practice-filters/);
const expectedScriptOrder = [
  "simulator-snapshot.js",
  "simulator-practice.js",
  "simulator-continuation.js",
  "poker-vs-3bet-defense-lesson/continuations.js",
  "poker-vs-3bet-defense-lesson/range-model.js",
  "poker-vs-3bet-defense-lesson/data.js",
  "poker-vs-3bet-defense-lesson/data/vs3bet-field-data.js",
  "poker-vs-3bet-defense-lesson/wisdom-reference.js",
  "poker-vs-3bet-defense-lesson/range-explorer.js",
  "poker-vs-3bet-defense-lesson/field-explorer.js",
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
  ["/", "Завершить курс →"],
  "the final lesson returns to the learning hub instead of looping to check-raise"
);
assert.doesNotMatch(
  source.html,
  /<a href="\/flop-checkraise-lesson" data-footer-next>/,
  "the final lesson must not loop back to check-raise"
);
assert.match(source.explorer, /4-бет пуш/);
assert.match(source.explorer, /В позиции/);
assert.match(source.explorer, /Без позиции/);
assert.match(source.explorer, /mix\.missing \? "is-missing" : dominantAction\(mix\)\.tone/);
assert.match(source.explorer, /button\.disabled = mix\.missing/);
assert.match(source.explorerCss, /--vs3-fold: #91a9d0/);
assert.match(source.explorerCss, /\.is-fold[\s\S]*--vs3-cell-surface/);
assert.match(source.explorerCss, /\.vs3-range-cell\.is-missing/);
assert.match(source.explorerCss, /\.vs3-field-range-cell\.is-unavailable[\s\S]*background: #121016/);
assert.match(source.wisdomReference, /FF_VS3BET_FIELD_DATA/);
assert.match(source.wisdomReference, /data\?\.charts/);
assert.match(source.wisdomReference, /call \+ mix\.fourbet \+ mix\.jam/);
assert.match(source.wisdomReference, /data\.meta\.hands\.forEach/);
assert.match(source.wisdomReference, /Это наблюдаемая игра поля, а не рекомендация/);
assert.match(source.wisdomReference, /5 051 115 решений/);
assert.doesNotMatch(source.wisdomReference, /FF_VS3BET_RANGE_MODEL|scenario\.summary/);
assert.match(source.fieldExplorer, /Это наблюдаемое поведение поля, не рекомендация/);
assert.match(source.fieldExplorer, /unavailableBelow/);
assert.match(source.sharedLesson, /continuationUi/);
assert.match(source.research, /mcp_bq_80039683391746b3bc0cda01a00f1260/);
assert.match(source.research, /mcp_ch_job_1dc4dcea6c5644578ddb72c9f90a32f2/);
assert.match(source.research, /5 051 115/);
assert.match(source.research, /is_face_squeeze=0/);
assert.match(source.research, /98\.4%/);
assert.match(source.research, /учебной адаптацией/);
assert.match(source.research, /не являются измеренными hand-level/);
assert.match(source.transcript, /JJ.*call 50 \/ 4-bet 50/);
assert.match(source.transcript, /## BTN[\s\S]*Call 100:[\s\S]*97s/);

console.log("vs-3bet defense lesson contract: ok");
