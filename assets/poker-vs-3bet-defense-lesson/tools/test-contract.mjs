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
  rfiData: "assets/poker-rfi-open-lesson/data.js",
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
for (const key of ["controller", "continuations", "rfiData", "model", "data", "fieldData"]) {
  vm.runInContext(source[key], context, { filename: files[key] });
}

const data = context.window.FF_POKER_FIELD_LESSON_DATA;
const model = context.window.FF_VS3BET_RANGE_MODEL;
const continuationApi = context.window.FFTrainerSimulatorContinuation;
const continuationRegistry = context.window.FF_VS3BET_CONTINUATIONS;
const fieldData = context.window.FF_VS3BET_FIELD_DATA;
const rfiData = context.window.PokerRfiData;

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
assert.equal(fieldData.version, "vs3bet-field-cube-20260721-v5");
assert.equal(fieldData.meta.windowEndExclusive, "2026-07-21T00:00:00Z");
assert.equal(fieldData.meta.hands.length, 169);
assert.equal(Object.keys(fieldData.charts).length, 800, "all valid chart slices are public");
assert.deepEqual(Array.from(fieldData.meta.cohorts.novice.ranks), [15, 16, 17, 18]);
assert.deepEqual(Array.from(fieldData.meta.cohorts.league3.ranks), [11, 12, 13, 14]);
assert.equal(fieldData.summaries.league3.opportunities, 3485206);
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
assert.deepEqual(Object.keys(rfiData.sourceFrequencies), ["EP", "MP", "HJ", "CO", "BTN"]);
assert.equal(Object.keys(rfiData.sourceFrequencies.BTN).length, 169);
assert.equal(rfiData.sourceFrequencies.BTN.AA, 100, "full cell weight keeps a 100% open visible");
assert.equal(rfiData.sourceFrequencies.BTN.Q2o, 50, "mixed open uses the source frequency, not the binary training range");
assert.equal(rfiData.sourceFrequencies.CO.J3s, 5, "rare open keeps its true 5% value behind the 10% visual floor");
assert.equal(rfiData.sourceFrequencies.CO.Q2o, 0, "a true never-open remains distinguishable from missing data");
assert.equal(rfiData.sourceFrequencies.EP.K7s, 80, "source frequency preserves methodic mixing");
assert.equal(rfiData.sourceFrequencies.SB, undefined, "SB stays unavailable instead of being mislabelled as 0% open");

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
  source.html.indexOf("data-intro-table") < source.html.indexOf("data-intro-feedback"),
  "the intro feedback must live after the table so stale CSS cannot overlap it with the deal table"
);
assert(
  source.html.indexOf("data-practice-table") < source.html.indexOf("data-practice-feedback"),
  "the practice feedback must live after the table so stale CSS cannot overlap it with the practice table"
);
assert.doesNotMatch(
  source.explorerCss,
  /\.decision-panel \.decision-feedback[\s\S]{0,140}order:\s*1/,
  "decision panel feedback must not be reordered above the table by responsive CSS"
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
  t8sSmallThreeBet.call > t8sSmallThreeBet.fold,
  "HJ T8s in position against a 3x-to-6-BB 3-bet is call-first, not a pure fold"
);
assert(
  t8sSmallThreeBet.call >= 60,
  "the corrected small-price transfer keeps at least 60% call for HJ T8s IP at 31-50 BB"
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
assert.equal(scenarioCount, 600);
assert(jamCellCount > 0, "short-stack scenarios contain a distinct 4-bet jam component");

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
  assert.equal(spot.table.pot, "1 BB", `${spot.id} keeps only the carried BB ante in the pot label`);
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
assert.deepEqual(stepOrder, ["deal", "wisdom", "field", "practice"]);
assert.match(source.html, />3\. Чарты и поле</);
assert.match(source.html, />4\. Практика</);
assert.doesNotMatch(source.html, /data-step="leaks"/);
assert.doesNotMatch(source.html, /id="leaksTab"/);
assert.match(source.html, /data-vs3-target-overview/);
assert.match(source.html, /data-vs3-wisdom-reference/);
assert.doesNotMatch(source.html, /data-wisdom-carousel/);
assert.match(source.html, /data-vs3-range-explorer/);
assert.match(source.html, /data-vs3-field-explorer/);
assert.match(source.html, /data-vs3-leaks/);
assert.match(source.html, /data-vs3-practice-filters/);
assert.match(source.html, /data-vs3-practice-expected/);
assert.match(source.html, /practice-hud-rail/);
assert.match(source.html, /Начни со всех ситуаций/);
assert.match(source.html, /data-vs3-reg-view-tabs/);
assert.match(source.html, /Сравни, как начинающие и сильные игроки разыгрывают один и тот же спот/);
assert.doesNotMatch(source.html, /Где поле защищается лишне или недостаточно/);
assert.doesNotMatch(source.html, /Сначала открой наш чарт/);
assert.doesNotMatch(source.html, /Это фактические решения поля, а не совет/);
assert.doesNotMatch(source.html, /Как играют реги/);
assert.doesNotMatch(source.fieldExplorer, /vs3-error-context/);
assert.equal(Array.from(source.html.matchAll(/data-vs3-reg-view="(target|field)"/g)).length, 2);
assert.equal(Array.from(source.html.matchAll(/data-vs3-reg-view-panel="(target|field)"/g)).length, 2);
assert.equal(Array.from(source.html.matchAll(/class="vs3-reg-tab" type="button" role="tab"/g)).length, 2);
assert.equal(Array.from(source.html.matchAll(/data-vs3-field-tool="(summary|hands|errors)"/g)).length, 3);
assert.match(source.html, /id="vs3RegTargetTab"[^>]+aria-controls="vs3RegTargetPanel"[^>]+aria-selected="true"[^>]+tabindex="0"/);
assert.match(source.html, /id="vs3RegFieldTab"[^>]+aria-controls="vs3RegFieldPanel"[^>]+aria-selected="false"[^>]+tabindex="-1"/);
assert.match(source.html, /id="vs3RegTargetPanel"[^>]+aria-labelledby="vs3RegTargetTab"/);
assert.match(source.html, /id="vs3RegFieldPanel"[^>]+aria-labelledby="vs3RegFieldTab"[^>]+hidden/);
const regTabMarkup = Array.from(source.html.matchAll(/<button class="vs3-reg-tab"[^>]*>/g), (match) => match[0]);
assert.equal(regTabMarkup.filter((markup) => /aria-selected="true"/.test(markup)).length, 1);
assert.equal(regTabMarkup.filter((markup) => /tabindex="0"/.test(markup)).length, 1);
assert(regTabMarkup.every((markup) => !/data-step-target/.test(markup)), "internal tabs must not trigger lesson navigation");
const mainHostIndex = source.html.indexOf("data-vs3-target-overview");
const chartPanelIndex = source.html.indexOf('id="chartsPanel"');
const practicePanelIndex = source.html.indexOf('id="practicePanel"');
assert(mainHostIndex > 0 && mainHostIndex < chartPanelIndex, "target overview lives on step 2 Главное");
for (const marker of ["data-vs3-range-explorer", "data-vs3-reg-view-tabs", "data-vs3-wisdom-reference", "data-vs3-field-explorer", "data-vs3-leaks"]) {
  const markerIndex = source.html.indexOf(marker);
  assert(markerIndex > chartPanelIndex && markerIndex < practicePanelIndex, `${marker} lives inside unified step 3`);
}
const expectedScriptOrder = [
  "simulator-snapshot.js",
  "simulator-practice.js",
  "simulator-continuation.js",
  "poker-vs-3bet-defense-lesson/continuations.js",
  "poker-rfi-open-lesson/data.js",
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
assert.match(source.explorer, /PokerRfiData/);
assert.match(source.explorer, /sourceFrequencies/);
assert.match(source.explorer, /function openFrequencyFor/);
assert.match(source.explorer, /function visualOpenFill/);
assert.match(source.explorer, /function practiceFilterPayload/);
assert.match(source.explorer, /function renderPracticeExpected/);
assert.match(source.explorer, /Любые/);
assert.match(source.explorer, /Только в позиции/);
assert.match(source.explorer, /Только без позиции/);
assert.match(source.explorer, /FFFieldLessonPracticeExtension/);
assert.match(source.explorer, /Math\.max\(10, Math\.min\(100, frequency\)\)/);
assert.match(source.explorer, /data-vs3-open-frequency|dataset\.vs3OpenFrequency/);
assert.match(source.explorer, /Высота — как часто открываем руку\. Цвета внутри — пас, колл, 4-бет и пуш/);
assert.match(source.explorer, /минимальная полоса 10%/);
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
assert.match(source.explorer, /const potBeforeThreeBet = 4\.5/);
assert.match(source.explorer, /riskBb \/ \(riskBb \+ potBeforeThreeBet\) \* 100/);
assert.match(source.explorer, /const safetyMargin = 2\.5/);
assert.match(source.explorer, /Автоприбыль начинается выше/);
assert.match(source.explorer, /Если мы пасуем чаще .* даже нулевой блеф уже плюсует сразу/);
assert.doesNotMatch(source.explorer, /solver-MDF/);
assert.match(source.explorer, /profitBoundary/);
assert.match(source.explorer, /targets:/);
assert.match(source.explorer, /mix\.missing \? "is-missing" : dominantAction\(mix\)\.tone/);
assert.match(source.explorer, /button\.disabled = mix\.missing/);
assert.match(source.explorer, /const fieldData = root\.FF_VS3BET_FIELD_DATA/);
assert.match(source.explorer, /"2\.5": "<6"/);
assert.match(source.explorer, /"3": "6-8"/);
assert.match(source.explorer, /"4": "8-10"/);
assert.match(source.explorer, /function measuredFieldRow/);
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
assert.match(source.fieldExplorer, /unavailableBelow/);
assert.match(source.fieldExplorer, /function filterValueAvailable\(key, value\)[\s\S]*Boolean\(chart\(next\)\)/, "filter choices are only available when the refreshed cube has an exact slice");
assert.match(source.fieldExplorer, /button\.disabled = unavailable/, "structurally empty exact slices are disabled instead of receiving a learner-facing placeholder");
assert.match(source.fieldExplorer, /dataset\.vs3ErrorMatrix/);
assert.match(source.fieldExplorer, /dataset\.vs3ErrorDetail/);
assert.match(source.fieldExplorer, /dataset\.vs3ErrorRanking/);
assert.match(source.fieldExplorer, /dataset\.vs3ErrorHand/);
assert.match(source.fieldExplorer, /wilsonInterval/);
assert.match(source.fieldExplorer, /sampleThresholds\.lowConfidenceBelow/);
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
assert.match(source.html, /data-vs3-leaks aria-live="off"/);
assert.match(source.explorerCss, /\.vs3-error-layout[\s\S]*grid-template-columns: minmax\(610px/);
assert.match(source.explorerCss, /\.vs3-error-range-cell\.is-underdefense/);
assert.match(source.explorerCss, /\.vs3-error-range-cell\.is-overdefense/);
assert.doesNotMatch(source.explorerCss, /is-estimated/);
assert.match(source.explorer, /--vs3-mix-background/);
assert.match(source.explorer, /dataset\.vs3ActionSignature/);
assert.match(source.explorerCss, /\.vs3-open-weight-fill[\s\S]*var\(--vs3-mix-background/);
assert.match(source.explorerCss, /\.vs3-reg-switcher[\s\S]*grid-template-columns: repeat\(2/);
assert.match(source.explorerCss, /\.vs3-field-tool\[open\]/);
assert.match(source.explorerCss, /\.vs3-reg-tab small \{ display: none; \}/);
assert.match(source.explorerCss, /\.vs3-reg-panel\[hidden\][^}]*display: none !important/);
assert.match(source.sharedLesson, /continuationUi/);
assert.match(source.sharedLesson, /saved\.step === "leaks"/);
assert.match(source.sharedLesson, /has\("regView"\)/);
assert.match(source.sharedLesson, /--practice-correct-pct/);
assert.match(source.sharedLesson, /FFFieldLessonPracticeExtension/);
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
