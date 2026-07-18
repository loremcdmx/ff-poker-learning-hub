import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const repo = new URL("../../../", import.meta.url);
const html = readFileSync(new URL("flop-cbet-hu-lesson.html", repo), "utf8");
const dataSource = readFileSync(new URL("assets/poker-flop-cbet-hu-lesson/data.js", repo), "utf8");
const lessonSource = readFileSync(new URL("assets/poker-flop-cbet-hu-lesson/lesson.js", repo), "utf8");
const lessonCss = readFileSync(new URL("assets/poker-flop-cbet-hu-lesson/lesson.css", repo), "utf8");
const engineSource = readFileSync(new URL("assets/poker-kit/simulator/engine-core.js", repo), "utf8");

const dataContext = { window: {} };
vm.runInNewContext(dataSource, dataContext, { filename: "data.js" });
const data = dataContext.window.FF_FLOP_CBET_HU_DATA;

assert.ok(data, "c-bet data payload is exported");
assert.equal(data.meta.sample.percent, 70);
assert.equal(data.meta.sample.inputRows, 2300854);
assert.equal(data.meta.sample.validSpots, 2297953);
assert.equal(data.meta.sample.rankedSpots, 2256311);
assert.equal(data.meta.overallCbetIsFullPopulation, true);
assert.ok(Array.isArray(data.overallCbet) && data.overallCbet.length >= 17, "rank-level c-bet population is present");
assert.ok(data.boardExamples && Object.keys(data.boardExamples).length > 0, "real board examples are present");

const rank15AHighSizes = data.cbetSizes.filter((row) => row.rank === 15 && row.structure === "a_high_dry");
const rank15AHighPot = rank15AHighSizes.find((row) => row.size_bin === "88–125%");
const rank15AHighOverbet = rank15AHighSizes.find((row) => row.size_bin === ">125%");
assert.deepEqual(
  [rank15AHighPot.folds, rank15AHighPot.valid_responses, rank15AHighPot.xr_count, rank15AHighPot.xr_valid_responses],
  [15, 16, 0, 16],
  "the default rank/structure includes a thin pot-size outcome that must not look precise"
);
assert.deepEqual(
  [rank15AHighOverbet.folds, rank15AHighOverbet.valid_responses, rank15AHighOverbet.xr_count, rank15AHighOverbet.xr_valid_responses],
  [18, 18, 0, 9],
  "the default overbet outcome has only nine X/R-eligible responses"
);

for (const id of ["dealScreen", "mainScreen", "practiceScreen", "examplesScreen"]) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} exists`);
}
for (const token of [
  "data-wisdom-slide",
  "data-deal-table",
  "data-trainer-table",
  "data-trainer-hands",
  "data-trainer-correct",
  "data-trainer-misses",
  "data-trainer-start",
  "data-trainer-exit",
  "data-board-example-library",
  "assets/poker-trainer-shell/shell.css",
  "assets/poker-trainer-shell/simulator-snapshot.js",
  "assets/poker-trainer-shell/simulator-practice.js",
  "assets/poker-flop-cbet-hu-lesson/data.js",
  "assets/poker-flop-cbet-hu-lesson/lesson.js",
  "href=\"/flop-checkraise-lesson\""
]) {
  assert.match(html, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), token);
}

assert.match(html, /poker-flop-cbet-hu-lesson\/lesson\.css\?v=[a-f0-9]{12}/);
assert.match(lessonCss, /@media \(max-width: 860px\)[\s\S]*?\.lesson-header \{\s*position: static;\s*top: auto;/, "mobile lesson header does not cover trainer actions");
assert.doesNotMatch(html, /simulatorTab|simulatorScreen|data-cbet-simulator|assets\/poker-simulator\/embed\.js/, "lesson has one practice surface and no generic simulator tab");
assert.doesNotMatch(html, /felt-table|data-deal-action|data-trainer-action/, "interactive c-bet decisions never pair a static table with external action buttons");
assert.match(lessonSource, /requestedStepRaw === "simulator" \? "practice"/, "old simulator deep links route to practice");
assert.match(lessonSource, /function trainerActionGroup\([\s\S]*\["25", "33", "small"\][\s\S]*\["50", "67", "large"\]/, "exact sizes collapse into three decision classes");
assert.match(lessonSource, /const SNAPSHOT_ACTIONS = \[[\s\S]*key: "check"[\s\S]*key: "small"[\s\S]*key: "large"/, "shared snapshot receives the same three decision classes");
assert.match(lessonSource, /window\.FFTrainerSimulator\.renderDecision/, "intro and practice render through the shared simulator adapter");
assert.match(lessonSource, /closest\("\[data-option-key\]"\)/, "action clicks are delegated from the functional table");
assert.match(lessonSource, /function introSnapshotSpot\([\s\S]*return snapshotSpot/, "intro and practice share one native snapshot spot builder");
assert.match(lessonSource, /accepted\.length !== 1/, "every generated c-bet spot has one unambiguous correct action class");
assert.doesNotMatch(lessonSource, /queryAll\("\[data-(?:deal|trainer)-action\]"/, "lesson code has no external poker-action controls");
assert.match(lessonSource, /function updateTrainerHud\([\s\S]*data-trainer-hands[\s\S]*data-trainer-correct[\s\S]*data-trainer-misses/, "practice HUD tracks hands, correct answers and misses");
assert.match(
  lessonSource,
  /function observedRateDisplay\([\s\S]*reliabilityFor\(denominator\)[\s\S]*reliability === "thin"[\s\S]*Мало данных[\s\S]*процент скрыт[\s\S]*reliability === "directional"[\s\S]*направление/,
  "thin observed rates are hidden and directional samples are labelled"
);
assert.match(lessonSource, /observedRateDisplay\(entry\.observedFe, entry\.validResponses\)/);
assert.match(lessonSource, /observedRateDisplay\(entry\.xrRate, entry\.xrValidResponses, "eligible N"\)/);
assert.match(lessonCss, /\.cbet-practice-table \.client-controls > \.client-row \{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, "practice renders three equal shared action columns");
assert.match(lessonCss, /\.cbet-practice-table \.table-action \{[^}]*min-height:\s*72px/, "shared practice actions keep the large hit target");
for (const action of ["check", "small", "large"]) {
  assert.match(lessonCss, new RegExp(`\\.cbet-practice-table \\.table-action\\[data-option-key="${action}"\\]`), `practice colors the shared ${action} action`);
}
assert.match(lessonSource, /function renderBoardExamples\(/);
assert.match(lessonSource, /function renderTrainer\(/);
assert.match(engineSource, /"cbet-rvbb":\s*\{[\s\S]*key:\s*"btn-vs-bb-cbet"[\s\S]*startStreet:\s*"flop"/);

console.log("flop c-bet lesson contract: ok");
