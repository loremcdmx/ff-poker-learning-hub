import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const repo = new URL("../../../", import.meta.url);
const html = readFileSync(new URL("flop-cbet-hu-lesson.html", repo), "utf8");
const dataSource = readFileSync(new URL("assets/poker-flop-cbet-hu-lesson/data.js", repo), "utf8");
const lessonSource = readFileSync(new URL("assets/poker-flop-cbet-hu-lesson/lesson.js", repo), "utf8");
const lessonCss = readFileSync(new URL("assets/poker-flop-cbet-hu-lesson/lesson.css", repo), "utf8");
const engineSource = readFileSync(new URL("assets/poker-kit/simulator/engine-core.js", repo), "utf8");
const confidenceSource = readFileSync(new URL("assets/poker-kit/observed-frequency-confidence.js", repo), "utf8");

const checkedInContext = { window: {} };
vm.runInNewContext(dataSource, checkedInContext, { filename: "data.js" });
const checkedInData = checkedInContext.window.FF_FLOP_CBET_HU_DATA;
const exactRows = [];
for (const [cohortIndex, cohort] of ["league1", "league2", "league3", "novice"].entries()) {
  for (const [positionIndex, position] of ["BTN", "CO", "HJ", "MP", "EP"].entries()) {
    for (const [depthIndex, depthBand] of ["<20", "20-30", "30-40", "40-70", "70+"].entries()) {
      const opportunities = 100 + cohortIndex * 20 + positionIndex * 7 + depthIndex * 5;
      const cbets = opportunities - 25 - cohortIndex * 2 + depthIndex;
      exactRows.push({
        node: "cbet", cohort, position, depthBand,
        opportunities, checksBack: opportunities - cbets, cbets, facedRaises: 10,
        folds: 0, calls: 0, raises: 0, other: 0, publishable: true
      });
      exactRows.push({
        node: "bb_response", cohort, position, depthBand,
        opportunities, checksBack: 0, cbets: 0, facedRaises: 0,
        folds: 25, calls: opportunities - 40, raises: 15, other: 0, publishable: true
      });
    }
  }
}
const exactFullHistory = {
  schemaVersion: 1,
  meta: {
    source: "analytics.int_tracker_hand_joined",
    sourceLabel: "FF ClickHouse · exact hand-level history",
    period: "01.09.2023–22.07.2026",
    windowStartInclusive: "2023-09-01",
    windowEndExclusive: "2026-07-22",
    rankTiming: "exact_as_of_hand",
    latestKey: "hand_player_id",
    minimumDenominator: 50
  },
  rows: exactRows
};
const startMarker = "/* FF_FULL_HISTORY_FIELD_START */";
const endMarker = "/* FF_FULL_HISTORY_FIELD_END */";
const injectedDataSource = dataSource.includes(startMarker)
  ? dataSource.replace(
      new RegExp(`/\\* FF_FULL_HISTORY_FIELD_START \\*/[\\s\\S]*?/\\* FF_FULL_HISTORY_FIELD_END \\*/`),
      `${startMarker} ${JSON.stringify(exactFullHistory)} ${endMarker}`
    )
  : dataSource.replace("fullHistory: null", `fullHistory: ${JSON.stringify(exactFullHistory)}`);
const dataContext = { window: {} };
vm.runInNewContext(injectedDataSource, dataContext, { filename: "data.js" });
const data = dataContext.window.FF_FLOP_CBET_HU_DATA;
const confidenceContext = { window: {} };
vm.runInNewContext(confidenceSource, confidenceContext, { filename: "observed-frequency-confidence.js" });
const observedConfidence = confidenceContext.window.FFObservedFrequencyConfidence;

assert.ok(checkedInData, "c-bet data payload is exported");
assert.equal(checkedInData.schemaVersion, 2);
assert(["methodology_only", "ready"].includes(checkedInData.status), "checked-in c-bet data is either the safe sentinel or a validated ready artifact");
assert.equal(checkedInData.boardExamples, null);
if (checkedInData.status === "ready") {
  assert(checkedInData.fullHistory, "ready c-bet data carries the exact full-history layer");
  assert.equal(checkedInData.fullHistory.meta.rankTiming, "exact_as_of_hand");
  assert.match(checkedInData.fullHistory.meta.artifactSha256, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(checkedInData.fullHistory), /\/private\/|SELECT\s|WITH\s+rank_intervals/i);
} else {
  assert.equal(checkedInData.fullHistory, null);
  assert.match(checkedInData.meta.sampleNote, /полной проверки всей истории раздач.*без додуманных процентов/i);
  assert.doesNotMatch(checkedInData.meta.sampleNote, /hand_player_id|latest|manifest|candidate|raw-HH|N\s*[≥>]/i);
  assert.doesNotMatch(checkedInData.meta.sourceLabel, /полная история/i, "pending data does not relabel an availability probe as complete history");
}
assert.doesNotMatch(dataSource, /Q2 2026|2026-Q2|HH sample 70%|deterministic.*70%|overallCbet|cbetSizes|checkRaiseSizes/);
assert.equal(data.fullHistory.meta.rankTiming, "exact_as_of_hand");
assert.equal(data.fullHistory.meta.latestKey, "hand_player_id");
assert.equal(data.fullHistory.meta.minimumDenominator, 50);
assert.equal(data.fullHistory.rows.length, 200, "fixture covers two nodes, four cohorts, five positions and five stack bands");
for (const row of data.fullHistory.rows) {
  const actionSum = row.node === "cbet"
    ? row.checksBack + row.cbets
    : row.folds + row.calls + row.raises + row.other;
  assert.equal(actionSum, row.opportunities);
  assert.equal(row.publishable, row.opportunities >= 50);
}

for (const id of ["dealScreen", "mainScreen", "fieldScreen", "practiceScreen", "examplesScreen"]) {
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
  "id=\"fieldTab\"",
  "data-step-target=\"field\"",
  "assets/poker-trainer-shell/shell.css",
  "assets/poker-trainer-shell/simulator-snapshot.js",
  "assets/poker-trainer-shell/simulator-practice.js",
  "assets/poker-kit/chart-system.css",
  "assets/poker-kit/observed-frequency-confidence.js",
  "assets/poker-flop-cbet-hu-lesson/data.js",
  "assets/poker-flop-cbet-hu-lesson/lesson.js",
  "href=\"/flop-checkraise-lesson\""
]) {
  assert.match(html, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), token);
}

assert.match(html, /poker-flop-cbet-hu-lesson\/lesson\.css\?v=[a-f0-9]{12}/);
assert.ok(html.indexOf("observed-frequency-confidence.js") < html.indexOf("poker-flop-cbet-hu-lesson/data.js"), "the shared exact-frequency gate loads before c-bet data and UI");
assert.doesNotMatch(html, /Q2 2026|2026-Q2|70% HH|HH sample 70%/);
assert.match(html, /Полевые частоты пока скрыты/);
assert.match(html, /Полевые данные · проверка/);
assert.doesNotMatch(html, /Полная история FF/);
assert.match(html, /Частоты скрыты/);
assert.doesNotMatch(html, /Новички · ранги 15–18/);
assert.match(html, /Учебные примеры[\s\S]*Восемь типов флопа — восемь простых планов/);
assert.match(lessonSource, /function methodologyOnly\(\)[\s\S]*model\.status === "methodology_only"/);
assert.match(lessonSource, /function renderPendingField\(\)/);
assert.match(lessonSource, /if \(methodologyOnly\(\)\)[\s\S]*renderPendingField\(\)/);
const pendingFieldSource = lessonSource.slice(
  lessonSource.indexOf("function renderPendingField()"),
  lessonSource.indexOf("function renderField()")
);
assert.match(pendingFieldSource, /Наличие подходящих раздач ещё не доказывает полноту истории/);
assert.match(pendingFieldSource, /Полная история FF/);
assert.match(pendingFieldSource, /До этого здесь намеренно нет процентов, сравнений и выводов о поле/);
assert.doesNotMatch(pendingFieldSource, /Exact full-history gate|exact hand-level результата|До inject здесь|latest-first сверки|N ≥ 50/);
assert.match(pendingFieldSource, /полной проверки раздач и групп игроков/, "pending field copy explains the release gate without internal jargon");
assert.match(lessonCss, /full-history-field-card\.is-pending/);
assert.match(lessonCss, /full-history-pending\s*\{/);
assert.match(lessonCss, /@media \(max-width: 860px\)[\s\S]*?\.lesson-header \{\s*position: static;\s*top: auto;/, "mobile lesson header does not cover trainer actions");
assert.doesNotMatch(html, /simulatorTab|simulatorScreen|data-cbet-simulator|assets\/poker-simulator\/embed\.js/, "lesson has one practice surface and no generic simulator tab");
assert.doesNotMatch(html, /data-trainer-next/, "practice does not keep a detached next-hand button below the table grid");
assert.doesNotMatch(html, /felt-table|data-deal-action|data-trainer-action/, "interactive c-bet decisions never pair a static table with external action buttons");
assert.match(lessonSource, /requestedStepRaw === "simulator" \? "practice"/, "old simulator deep links route to practice");
assert.match(lessonSource, /\["deal", "main", "field", "practice", "examples"\]\.includes\(requestedStep\)/, "field library supports a direct standard-lesson deep link");
assert.match(html, /id="mainTab"[\s\S]*?>2\. Урок<\/button>[\s\S]*?id="fieldTab"[\s\S]*?>3\. Библиотека<\/button>[\s\S]*?id="practiceTab"[\s\S]*?>4\. Практика<\/button>[\s\S]*?id="examplesTab"[\s\S]*?>5\. Примеры<\/button>/, "the marketed field library is a visible step in the standard lesson order");
assert.match(html, /id="fieldScreen"[^>]+aria-labelledby="fieldTab"/, "field library panel is labelled by its visible tab");
assert.match(lessonCss, /html\[data-embed="true"\] \.step-tabs \{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/, "embedded c-bet header allocates one readable column to each of five steps");
assert.match(lessonSource, /function trainerActionGroup\([\s\S]*\["25", "33", "small"\][\s\S]*\["50", "67", "large"\]/, "exact sizes collapse into three decision classes");
assert.match(lessonSource, /const SNAPSHOT_ACTIONS = \[[\s\S]*key: "check"[\s\S]*key: "small"[\s\S]*key: "large"/, "shared snapshot receives the same three decision classes");
assert.match(lessonSource, /window\.FFTrainerSimulator\.renderDecision/, "intro and practice render through the shared simulator adapter");
assert.match(lessonSource, /closest\("\[data-option-key\]"\)/, "action clicks are delegated from the functional table");
assert.match(lessonSource, /nextLabel:\s*state\.trainerAnswered\s*\?\s*"Следующая раздача"/, "answered c-bet hands use the shared inline continuation control");
assert.match(lessonSource, /closest\("\[data-practice-next\]"\)[\s\S]*advanceTrainer\(\)[\s\S]*closest\("\[data-option-key\]"\)/, "inline continuation is delegated before poker actions");
assert.match(lessonSource, /function advanceTrainer\(\)/, "practice advances through one shared continuation path");
assert.match(lessonSource, /function introSnapshotSpot\([\s\S]*return snapshotSpot/, "intro and practice share one native snapshot spot builder");
assert.match(lessonSource, /function snapshotSeats\(spot = \{\}\)[\s\S]*spot\.opponentClass === "is-loose"[\s\S]*difficulty: "easy"[\s\S]*style: "fish"/, "fish semantics reach the shared BB seat profile without parsing visible copy");
assert.match(lessonSource, /seats:\s*snapshotSeats\(spot\)/, "each rendered c-bet spot supplies its opponent profile to the shared snapshot");
assert.match(lessonSource, /accepted\.length !== 1/, "every generated c-bet spot has one unambiguous correct action class");
assert.match(lessonSource, /function trainerHasStrongMadeHand\([\s\S]*?boardMatches\.has\(topBoardRank\)[\s\S]*?flush \|\| straight/, "top pair and stronger made hands are detected for sizing tolerance");
assert.match(lessonSource, /rankOrder\.indexOf\(kicker\) >= rankOrder\.indexOf\("T"\)/, "top-pair sizing tolerance requires a strong kicker rather than any weak top pair");
assert.match(lessonSource, /structure:\s*"Низкая связанная"[\s\S]*?accepted:\s*\["check"\][\s\S]*?Не ставь чистый воздух на автопилоте/, "the explicit low-connected fallback checks pure air");
assert.match(lessonSource, /low_connected:\s*\{[\s\S]*?accepted:\s*\["check"\][\s\S]*?С чистым воздухом чаще бери бесплатную карту/, "generated low-connected practice follows the same check rule");
assert.doesNotMatch(lessonSource, /Сейчас ставь 20–25%/, "the wisdom slide no longer contradicts low-connected practice");
assert.doesNotMatch(lessonSource, /textElement\("strong", "", "20%"\)/, "wisdom sizing never renders the retired 20% button");
assert.match(lessonSource, /textElement\("strong", "", "25–33%"\)/, "wisdom sizing uses the same 25–33% rule as the lesson");
assert.match(lessonSource, /key: "11-14"[\s\S]*from: 11, to: 14/, "League 3 is the disjoint R11–14 cohort");
assert.match(lessonSource, /key: "15-18"[\s\S]*from: 15, to: 18/, "newcomers are the disjoint R15–18 cohort");
assert.doesNotMatch(lessonSource, /key: "11-17"|R11–17|R15–17/, "overlapping legacy cohort labels are gone from lesson logic");
assert.match(lessonSource, /disjointReferences[\s\S]*selected\.rank < item\.cohort\.from[\s\S]*selected\.rank > item\.cohort\.to/, "exact-rank comparisons exclude the containing canonical cohort");
assert.match(lessonSource, /for \(let rank = 1; rank <= 18; rank \+= 1\)/, "rank controls cover the full canonical R1–18 scale");
assert.match(html, /по рангам 1–18[\s\S]*data-overall-cbet-strip[\s\S]*рангам 1–18/, "rank headings expose the full canonical R1–18 scale");
assert.doesNotMatch(lessonSource, /Все доступные раздачи поля|В этом полном источнике/, "aggregate field data never claims certified full-history raw-hand coverage");
assert.match(lessonSource, /Агрегированный срез поля за/, "aggregate field source is labeled by its real grain");
assert.match(lessonSource, /\["Низкая связанная",\s*"с чистым воздухом чаще чек"\]/, "the takeaway repeats the low-connected check exception");
assert.match(
  lessonSource,
  /function dataBackedTrainerSpots\([\s\S]*?league1_more[\s\S]*?accepted:\s*\["small"\][\s\S]*?Выбирай 25–33% банка/,
  "a reviewed League-1-bet/newcomer-check example stays a small c-bet in practice even when the generic low-connected fallback checks pure air"
);
const sparseLowConnectedKj = { handClass: "KJs", comparisonActionOccurrences: 1, comparisonCheckOccurrences: 0 };
assert.equal(
  observedConfidence.canRenderExact(sparseLowConnectedKj.comparisonActionOccurrences + sparseLowConnectedKj.comparisonCheckOccurrences),
  false,
  "the audited low-connected KJs case with one League-1 bet and zero checks is not publishable evidence"
);
assert.match(
  lessonSource,
  /function checkedHandEvidenceDenominator\([\s\S]*?comparisonActionOccurrences[\s\S]*?comparisonCheckOccurrences[\s\S]*?function checkedHandHasStableEvidence\([\s\S]*?canRenderObservedFrequency\(checkedHandEvidenceDenominator\(hand\)\)/,
  "exact board/hand examples use the same N >= 50 gate"
);
assert.match(
  lessonSource,
  /checkedHands\.filter\(checkedHandHasStableEvidence\)[\s\S]*?hands\.forEach\(\(hand\)[\s\S]*?!checkedHandHasStableEvidence\(hand\)/,
  "a sparse hand is hidden from Examples and cannot become a prescriptive Practice spot"
);
assert.doesNotMatch(
  `${html}\n${lessonSource}`,
  /20[–-]25%/,
  "all learner-facing small-size guidance uses the single 25–33% range"
);
assert.match(lessonSource, /acceptableExploit: option\.key === "large" && largeSizingAlternative/, "large sizing with strong value is rendered as an acceptable alternative, not an error");
assert.match(lessonSource, /const credited = correct \|\| alternative[\s\S]*?if \(credited\) state\.trainerScore \+= 1/, "accepted strong-value sizing does not count as a miss");
assert.match(lessonSource, /достаточно компетентные оппоненты могут вчитываться в твой сайзинг/, "yellow feedback warns that competent opponents can read sizing tells");
assert.match(lessonCss, /\.trainer-feedback\.is-alternative[\s\S]*?\.table-action\.is-alternative/, "acceptable sizing has a distinct yellow feedback and action treatment");
assert.doesNotMatch(lessonSource, /queryAll\("\[data-(?:deal|trainer)-action\]"/, "lesson code has no external poker-action controls");
assert.match(lessonSource, /function updateTrainerHud\([\s\S]*data-trainer-hands[\s\S]*data-trainer-correct[\s\S]*data-trainer-misses/, "practice HUD tracks hands, correct answers and misses");
assert.match(lessonSource, /function canRenderObservedFrequency\([\s\S]*observedConfidence\?\.canRenderExact/, "observed c-bet rates use the shared exact-frequency gate");
assert.match(lessonSource, /function observedRateDisplay\([\s\S]*reliabilityFor\(denominator\)[\s\S]*Number\.isFinite\(value\) && canRenderObservedFrequency\(denominator\)/, "observed rates stay unavailable below the shared denominator floor");
assert.match(lessonSource, /observedRateDisplay\(entry\.observedFe, entry\.validResponses\)/);
assert.match(lessonSource, /observedRateDisplay\(entry\.xrRate, entry\.xrValidResponses\)/);
assert.match(lessonSource, /function metricDisplay\([\s\S]*reliabilityFor\(summary\.n\)[\s\S]*canRenderObservedFrequency\(summary\.n\)/, "distribution metrics stay unavailable below the shared denominator floor");
assert.match(
  lessonSource,
  /candidateRows[\s\S]*matchedCompactHands[\s\S]*История действий найдена для[\s\S]*Остальные раздачи исключены — значения за них не подставлялись/,
  "the methodology UI states exact raw-HH coverage and fails closed for unmatched candidates"
);
assert.match(lessonSource, /function renderDistribution\([\s\S]*!canRenderObservedFrequency\(summary\.n\)/, "distribution bars never render an exact sparse split");
assert.match(lessonSource, /function formatDeltaPercent\([\s\S]*!canRenderObservedFrequency\(current\.n\)[\s\S]*!canRenderObservedFrequency\(reference\.n\)/, "sparse cohort deltas stay unavailable too");
assert.doesNotMatch(html, /<th scope="col">Надёжность<\/th>/, "the field table does not expose an empty sample-status column");
assert.doesNotMatch(lessonSource, /rowReliability|"для этой строки"/, "the renderer does not append an empty sample-status cell");
assert.doesNotMatch(lessonSource, /base\.textContent\s*=\s*summary[^;]*`N /, "chart cells do not expose raw sample denominators");
assert.doesNotMatch(html, /HH sample|eligible N|Hero RFI|hand history|6-max RvBB|SRP/, "learner-facing chart and practice copy avoids implementation shorthand");
assert.match(html, /Реальные раздачи FF/, "chart panels use the shared learner-facing source stamp");
assert.match(lessonSource, /console\.error\("\[c-bet lesson\]/, "technical render failures are kept in the console");
assert.match(lessonSource, /Ситуация временно недоступна/, "the learner sees a neutral render error");
assert.doesNotMatch(lessonSource, /Мало данных|Недостаточно раздач/, "c-bet learner UI has no low-sample substitute labels");
assert.match(lessonCss, /\.cbet-practice-table \.client-controls > \.client-row \{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, "practice renders three equal shared action columns");
assert.match(lessonCss, /\.cbet-practice-table \.table-action \{[^}]*min-height:\s*72px/, "shared practice actions keep the large hit target");
assert.match(lessonCss, /@media \(max-width: 620px\)[\s\S]*?\.cbet-practice-table \.client-controls > \.client-row\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important;/, "mobile c-bet actions use two readable columns instead of three squeezed ones");
assert.match(lessonCss, /@media \(max-width: 620px\)[\s\S]*?\.cbet-practice-table \.client-controls\[data-option-count="3"\][^{]*\.table-action:last-child\s*\{[^}]*grid-column:\s*1 \/ -1;/, "the third mobile c-bet action spans the full row");
assert.match(lessonCss, /\.cbet-practice-table:has\(\.practice-next-row\)\s*\{[^}]*--shell-action-gutter:\s*210px;[^}]*padding-bottom:\s*210px;/, "inline continuation reserves enough room inside the table stage");
assert.match(lessonCss, /\.cbet-practice-table \.practice-next-row\s*\{[^}]*width:\s*100%;[^}]*justify-self:\s*stretch;/, "inline continuation row spans the action dock despite simulator justify-items");
assert.match(lessonCss, /\.cbet-practice-table \.practice-next-button\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*44px;/, "inline continuation is a full-width nearby target");
assert.match(lessonCss, /@media \(max-width: 620px\)[\s\S]*?\.cbet-deal-table,[\s\S]*?\.cbet-practice-table\s*\{[^}]*padding-bottom:\s*168px;/, "wrapped mobile action rows keep a focus-safe bottom gutter");
for (const action of ["check", "small", "large"]) {
  assert.match(lessonCss, new RegExp(`\\.cbet-practice-table \\.table-action\\[data-option-key="${action}"\\]`), `practice colors the shared ${action} action`);
}
assert.match(lessonSource, /function renderBoardExamples\(/);
assert.match(lessonSource, /function renderTrainer\(/);
assert.match(engineSource, /"cbet-rvbb":\s*\{[\s\S]*key:\s*"btn-vs-bb-cbet"[\s\S]*startStreet:\s*"flop"/);

console.log("flop c-bet lesson contract: ok");
