import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const repo = new URL("../../../", import.meta.url);
const html = readFileSync(new URL("resteal-lesson.html", repo), "utf8");
const js = readFileSync(new URL("assets/poker-resteal-lesson/lesson.js", repo), "utf8");
const css = readFileSync(new URL("assets/poker-resteal-lesson/lesson.css", repo), "utf8");
const data = readFileSync(new URL("assets/poker-resteal-lesson/data.js", repo), "utf8");
const simulatorHtml = readFileSync(new URL("poker-simulator.html", repo), "utf8");
const advice = readFileSync(new URL("assets/poker-resteal-lesson/advice.js", repo), "utf8");
const simulatorPack = readFileSync(new URL("assets/poker-resteal-lesson/simulator-pack.js", repo), "utf8");
const simulatorPackCss = readFileSync(new URL("assets/poker-resteal-lesson/simulator-pack.css", repo), "utf8");
const trainerShellCss = readFileSync(new URL("assets/poker-trainer-shell/shell.css", repo), "utf8");
const practiceRegistry = readFileSync(new URL("assets/poker-simulator/simulator-practice-packs.js", repo), "utf8");
const featureLoader = readFileSync(new URL("assets/poker-simulator/simulator-feature-loader.js", repo), "utf8");
const rankComparison = readFileSync(new URL("assets/poker-resteal-lesson/rank-comparison.js", repo), "utf8");
const rankCss = readFileSync(new URL("assets/poker-resteal-lesson/rank-comparison.css", repo), "utf8");
const rankData = readFileSync(new URL("assets/poker-resteal-lesson/data/resteal-rank-data.js", repo), "utf8");
const browserBundle = readFileSync(new URL("assets/poker-resteal-lesson/data/browser-bundle.js", repo), "utf8");
const assetHash = (source) => createHash("sha256")
  .update(source.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);

for (const id of ["lessonIntro", "startLesson", "introBtnChips", "introPotChips", "introJamChips", "introHeroCards", "introDealerButton", "firstEncounter", "firstTable", "firstCoach", "wisdomScreen", "wisdomCarouselTrack", "wisdomStoryCounter", "wisdomStoryDots", "wisdomFoldRate", "wisdomHandSummary", "wisdomHandPicker", "wisdomPassRate", "wisdomCallRate", "wisdomDoubleRate", "wisdomRiskDots", "dataScreen", "rankEvidenceSlide", "rankGrowthStrip", "rankComparisonFilters", "rankPositionTabs", "rankSizeTabs", "rankDepthTabs", "rankSpotSummary", "rankNoviceTitle", "rankNoviceStats", "rankNoviceActionBar", "rankNoviceMatrix", "rankLeagueTitle", "rankLeagueStats", "rankLeagueTabs", "rankLeagueActionBar", "rankLeagueMatrix", "rankHandReadout", "rankEvidenceSource", "deepScreen", "deepMathPanel", "deepFieldPanel", "exactBbObservedPanel", "exactBbActionOverview", "exactBbCategoryRows", "exactBbSource", "opponentTabs", "foldSummary", "handMatrix", "practiceSimulatorShell", "restealSimulator", "startPracticeSession", "exitPractice", "infoPopover"]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `${id} exists`);
}
for (const script of [
  "deck-library.js", "chip-library.js", "simulator-board-render.js", "simulator-seat-slots.js",
  "simulator-seat-renderer.js", "simulator-table-renderer.js", "simulator-snapshot.js", "browser-bundle.js",
  "embed.js", "simulator-practice.js", "data.js", "resteal-rank-data.js", "engine.js", "rank-comparison.js", "lesson.js"
]) {
  assert.ok(html.indexOf(script) >= 0, `${script} is wired`);
}
assert.ok(html.indexOf("simulator-snapshot.js") < html.indexOf("lesson.js"), "snapshot loads before lesson runtime");
assert.ok(html.indexOf("browser-bundle.js") < html.indexOf("lesson.js"), "file-safe data bundle loads before lesson runtime");
assert.ok(html.indexOf("resteal-rank-data.js") < html.indexOf("rank-comparison.js"), "rank cube loads before rank comparison runtime");
assert.ok(html.indexOf("rank-comparison.js") < html.indexOf("lesson.js"), "rank comparison initializes before the lesson carousel runtime");
assert.match(simulatorHtml, /assets\/poker-simulator\/simulator-practice-packs\.js/);
assert.doesNotMatch(simulatorHtml, /assets\/poker-resteal-lesson\/(?:advice|simulator-pack)\.(?:js|css)/, "practice assets are lazy-loaded only for the requested pack");
for (const asset of ["assets/poker-resteal-lesson/simulator-pack.css", "assets/poker-resteal-lesson/advice.js", "assets/poker-resteal-lesson/simulator-pack.js"]) {
  assert.match(practiceRegistry, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${asset} is allowlisted`);
}
const restealCatalog = practiceRegistry.slice(practiceRegistry.indexOf("resteal: Object.freeze"));
assert.ok(restealCatalog.indexOf("advice.js") < restealCatalog.indexOf("simulator-pack.js"), "advice catalog loads before the practice pack");
assert.match(featureLoader, /function readyForBoot\(\)[\s\S]*loadPracticePack\(\)/, "simulator boot waits for the requested practice pack");
assert.match(html, /poker-progress\/progress\.js\?v=20260715-ffstart-handoff-v16/);
assert.match(html, /poker-resteal-lesson\/engine\.js\?v=b2b87c4f94e4/);
assert.match(html, new RegExp(`poker-resteal-lesson/data/browser-bundle\\.js\\?v=${assetHash(browserBundle)}`));
assert.match(html, new RegExp(`poker-resteal-lesson/lesson\\.js\\?v=${assetHash(js)}`));
assert.match(html, new RegExp(`poker-resteal-lesson/rank-comparison\\.css\\?v=${assetHash(rankCss)}`));
assert.match(html, new RegExp(`poker-resteal-lesson/rank-comparison\\.js\\?v=${assetHash(rankComparison)}`));
assert.match(html, new RegExp(`poker-resteal-lesson/lesson\\.css\\?v=${assetHash(css)}`));
assert.match(css, /@media \(max-width:620px\)\{[\s\S]*?\.step-tabs\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);overflow:visible\}/, "mobile lesson tabs use a visible 2x2 grid");
assert.match(css, /\.practice-screen\.is-running\{grid-template-columns:minmax\(0,1fr\)\}/, "mobile practice grid cannot expand to child max-content width");
assert.match(css, /\.practice-screen\.is-running \.practice-disclaimer\{grid-template-columns:minmax\(0,1fr\);min-width:0;max-width:100%\}/, "mobile bot legend cannot force a 430px grid track");
assert.match(css, /\.practice-screen\.is-running \.practice-launch\{width:100%;min-width:0;max-width:100%;box-sizing:border-box\}/, "mobile practice controls stay inside the viewport");
assert.match(css, /\.practice-screen\.is-running \.session-lengths\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\);width:100%;flex:1 1 100%\}/, "mobile session lengths stay fully visible");
assert.doesNotMatch(html, /data-control=["']ante["']|pkoToggle|waterfall|<details|Источник|Как посчитано/);
assert.match(html, /Всегда включён · 1 BB/);
assert.match(html, />Сыграть раздачу<\/button>/);
assert.match(html, /class="intro-action-routes"/);
assert.equal((html.match(/data-wisdom-slide/g) || []).length, 6, "wisdom carousel has six focused concept slides");
assert.match(html, /id="wisdomStoryCounter"[^>]*>1 из 6</);
const wisdomTrack = html.slice(html.indexOf('id="wisdomCarouselTrack"'), html.indexOf('class="wisdom-carousel-controls"'));
assert.doesNotMatch(wisdomTrack, /id="rankEvidenceSlide"/, "rank evidence is not trapped inside the wisdom carousel");
assert.ok(html.indexOf('id="dataScreen"') < html.indexOf('id="rankEvidenceSlide"'), "rank evidence belongs to the standalone data screen");
assert.match(html, /id="rankNoviceTitle">Совсем новички</, "left comparison cohort stays fixed to novices");
assert.match(html, /data-step-target="wisdom"/);
assert.match(html, /data-step-target="data"/);
assert.match(html, /data-step-target="deep"/);
assert.match(html, /data-step-target="deep"[^>]*>4\. Математика рестила<\/button>/, "deep-dive tab uses the requested title");
assert.doesNotMatch(html, /data-step-target="(?:math|field)"/);
assert.doesNotMatch(html, /data-deep-target=/, "deep content should be one continuous page without duplicate inner tabs");
assert.doesNotMatch(html, /id="deepFieldPanel"[^>]*hidden/, "opponent adjustment should be visible below ranges and math");
assert.doesNotMatch(html, /id="presetRow"|id="fieldSummary"|class="range-picture"/, "deep lesson keeps one opponent picker and no duplicate metric cards");
assert.equal((html.match(/id="(?:hand|field)Matrix"/g) || []).length, 1, "deep lesson uses one shared 13x13 matrix");
assert.doesNotMatch(html, /id="fieldMatrix"|id="fieldHandReadout"/, "duplicate field matrix and readout are removed");
assert.doesNotMatch(html, /class="panel risk-card"|id="bustHeadline"/, "generic bustout card is removed");
assert.ok(html.indexOf("pko-card-under-matrix") < html.indexOf('id="deepFieldPanel"'), "PKO controls sit directly below the shared matrix section");
assert.match(html, /Наблюдаемая игра поля · точно BB/);
assert.match(html, /один рейзер BTN[^]*эффективный стек 25–40 BB/);
assert.match(html, /частоты фактических действий[^]*не сравнивают EV и не говорят, что нажимать/);
assert.doesNotMatch(html, /Сколько олл-ин и колл выигрывали относительно паса/, "mixed SB+BB EV comparison is no longer presented");
assert.doesNotMatch(html, /это не две линии одной и той же раздачи|class="comparison-caveat"/, "removed methodology caveat stays removed");
assert.doesNotMatch(html, /class="comparison-method"|Игроки проекта с известными картами|Один фильтр спота/, "removed methodology cards stay removed");
assert.doesNotMatch(html, /class="comparison-footnote"|Значение линии|Разницы около 0,1 BB/, "removed methodology footnote stays removed");
assert.match(html, /Но я могу вылететь/);
assert.match(html, /Ты не теряешь 30 BB автоматически, даже если получил колл/);
assert.match(html, /Чеклист перед пушем/);
for (const cue of ["Один рейзер, без коллеров", "Опен с поздней позиции", "Эффективный стек 25–40 BB", "Соперник не любитель"]) assert.match(html, new RegExp(cue));
assert.equal((html.match(/class="is-optional"/g) || []).length, 1, "push checklist has one clearly optional filter");
assert.equal((html.match(/data-wisdom-hand=/g) || []).length, 4, "risk slide offers four hand examples");
for (const hand of ["QJo", "22", "K4o", "87s"]) assert.match(html, new RegExp(`data-wisdom-hand=["']${hand}["']`));
assert.match(html, /data-wisdom-hand="QJo" aria-pressed="true"/, "QJo is the default hand example");
assert.match(html, /Почему не просто колл/);
assert.match(html, /Боты не поддаются, ГСЧ честный/);
assert.match(html, /современных технологий искусственного интеллекта/);
assert.match(html, /Красный[\s\S]*близко к топ-модели/);
assert.match(html, /Синий[\s\S]*средняя сила/);
assert.match(html, /Зелёный[\s\S]*слабый бот/);
for (const hands of [10, 25, 50, 100]) assert.match(html, new RegExp(`data-session-hands=["']${hands}["']`));

for (const contract of ["renderIntroTableArt", "startLesson", "renderFirstTable", "answerFirst", "renderPracticeSetup", "practiceSimulatorOptions", "clearPracticeReadyTimer", "handlePracticeSimulatorReady", "startPracticeSession", "renderWisdomEvidence", "renderExactBbObservedField", "renderWisdomHandPicker", "selectWisdomHand", "renderWisdomStory", "setupWisdomCarousel", "applyOpponentProfile", "showInfo", "closeInfo"]) {
  assert.match(js, new RegExp(`function ${contract}\\(`), `${contract} runtime exists`);
}
assert.match(js, /data-option-key/);
assert.match(js, /practice:\s*"resteal"/);
assert.match(js, /FFTrainerSimulator\.mountPractice/);
assert.match(js, /message\.type !== "poker-simulator:event" \|\| message\.name !== "ready"/, "practice waits for the simulator ready handshake");
assert.match(js, /event\.source !== frame\.contentWindow \|\| event\.origin !== window\.location\.origin/, "ready handshake validates iframe source and origin");
assert.match(js, /frame\.contentDocument\?\.querySelector\("\.table-shell"\)/, "ready handshake confirms that the first table exists");
assert.match(js, /Стол не загрузился\. Нажми «Начать заново»\./, "failed cold boots expose a retry instead of an empty workspace");
assert.doesNotMatch(js, /restealSimulator"\)\.addEventListener\("load"[^\n]*setPracticeSimulatorLoading\(false\)/, "raw iframe load cannot hide the loading state before simulator boot");
assert.match(js, /result\.foldEquity/);
assert.match(js, /const RankData = window\.PokerRestealRankData/);
assert.match(js, /RankData\?\.charts\?\.\[cohort\]\?\.BTN\?\.\["2\.0"\]\?\.\["25-40"\]/, "observed panel reads the exact BB / BTN 2 BB / 25–40 BB cube");
assert.match(js, /state\.data\.field_exact_bb_btn_2bb\?\.callRange/, "EV call weights prefer the exact BB / BTN / 2 BB slice");
assert.match(js, /const exact = state\.data\.field_exact_bb_btn_2bb;/, "field fold equity prefers the exact canonical slice");
assert.match(js, /\{ key: "folds"[\s\S]*\{ key: "calls"[\s\S]*\{ key: "small3bets"[\s\S]*\{ key: "jams"/, "observed panel renders all four exhaustive actions");
assert.doesNotMatch(js, /state\.data\.hero_outcomes\.pooled\.ALL/, "mixed SB+BB outcome data no longer powers the visible panel");
assert.match(css, /\.observed-action-overview[^}]*grid-template-columns:\s*repeat\(4/, "exact BB panel gives every action an equal desktop summary card");
assert.match(css, /\.observed-action-stack \.is-small-raise[^}]*background:\s*#b786f3/, "non-all-in 3-bets have their own visible segment");
assert.doesNotMatch(js, /hero_bustouts|bustHeadline|bustVisual/);
assert.doesNotMatch(js, /BB ante 1 BB · стек/, "ready matrix status does not repeat visible controls");
assert.doesNotMatch(js, /pointerover|focusin|renderFirstWisdom|metricContent|showMetric|cleanup_waterfall|answerPractice/);
assert.doesNotMatch(data, /ante:\s*0/);
assert.match(data, /hand:\s*"QJo"/);
assert.match(js, /PokerChipKit/);
assert.match(js, /wisdomHand:\s*"QJo"/, "QJo is the runtime default example");
assert.match(js, /theoreticalResultFor\(state\.wisdomHand\)/, "selected hand uses the shared theoretical model");
assert.match(js, /const firstPassShare = Math\.round\(firstExample\.foldEquity \* 100\)/, "the previous slide stays tied to the original QJo spot");
assert.match(css, /risk-example-layout[\s\S]*grid-template-areas:[\s\S]*"copy picker"[\s\S]*"metrics picker"/, "desktop hand picker sits to the right of the model");
assert.match(css, /wisdom-hand-options[^{]*\{[^}]*grid-template-columns:\s*repeat\(2/, "hand choices use a compact two-column grid");

assert.match(rankData, /window\.PokerRestealRankData=/, "rank comparison has a file-safe data payload");
assert.match(rankData, /"cohortOrder":\["novice","league3","league2","league1"\]/, "rank cube keeps the novice to league-one progression");
assert.match(rankData, /"positionOrder":\["CO","BTN"\]/, "rank cube exposes opener-position slices");
assert.match(rankData, /"sizeOrder":\["2\.0","2\.5","3\.0"\]/, "rank cube exposes open-size slices");
assert.match(rankData, /"depthOrder":\["25-40","25-30","30-35","35-40"\]/, "rank cube exposes pooled and narrow effective-stack slices");
assert.match(rankComparison, /var Data = window\.PokerRestealRankData/);
assert.match(rankComparison, /league:\s*"league3"/, "league-three is the default comparison cohort");
assert.match(rankComparison, /chartFor\("novice"\)/, "novice chart is rendered independently of the selected league");
assert.match(rankComparison, /function renderSpotSummary\(\)/, "data screen summarizes every cohort for the selected spot");
assert.doesNotMatch(html, /rankDatasetFacts|rank-dataset-facts/, "dataset fact strip stays removed from the lesson");
assert.doesNotMatch(rankComparison, /renderDatasetFacts|rankDatasetFacts/, "dataset fact strip has no runtime renderer");
assert.doesNotMatch(rankCss, /\.rank-dataset-facts/, "dataset fact strip has no dead styles");
assert.match(rankComparison, /function gradientColor\(value\)/, "matrix fill uses a bounded sequential colour scale");
for (const league of ["league3", "league2", "league1"]) {
  assert.match(rankComparison, new RegExp(`\\{ key: "${league}", label: "[123] лига" \\}`), `${league} comparison option exists`);
}
for (const dimension of ["rankPositionTabs", "rankSizeTabs", "rankDepthTabs"]) {
  assert.match(rankComparison, new RegExp(`createTabs\\(byId\\("${dimension}"\\)`), `${dimension} drives the shared comparison slice`);
}
assert.match(rankComparison, /\["folds", "Пас"[\s\S]*\["calls", "Колл"[\s\S]*\["small3bets", "3-бет"[\s\S]*\["jams", "Олл-ин"/, "action bars separate folds, calls, small 3-bets, and direct jams");
assert.match(rankCss, /\.rank-evidence-compare\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, "rank evidence keeps two equal desktop charts");
assert.match(rankCss, /\.rank-matrix\s*\{[^}]*grid-template-columns:\s*repeat\(13,\s*minmax\(0,\s*1fr\)\)/, "each rank chart is a 13x13 hand matrix");
assert.doesNotMatch(rankCss, /\.wisdom-slide\.rank-evidence-slide|max-height:\s*72svh/, "standalone data screen uses page scroll instead of a nested carousel scroller");
assert.match(rankCss, /@media \(max-width:\s*980px\)[\s\S]*\.rank-evidence-compare\s*\{[^}]*grid-template-columns:\s*1fr/, "rank charts stack before their cells become too small");
assert.match(rankCss, /\.rank-matrix[^}]*width:\s*min\(100%,\s*440px\)/, "rank matrices are large enough for readable hand labels");
assert.match(rankCss, /\.rank-cell\s*\{[^}]*color:\s*#f7f7f4[^}]*background:\s*var\(--jam-color/, "cell labels keep fixed high contrast across the gradient");
assert.match(rankComparison, /\[0, \[17, 21, 26\]\][\s\S]*\[1, \[26, 42, 50\]\][\s\S]*\[50, \[9, 116, 86\]\]/, "frequency gradient separates zero, low, and high rates");
assert.match(rankCss, /\.rank-cell::after[^}]*--sample-marker/, "sample quality uses a compact corner marker");
assert.match(rankCss, /\.rank-cell\.is-thin:not\(\.is-empty\)[^}]*--sample-marker:\s*#ffc659/, "small samples use an amber corner marker");
assert.doesNotMatch(rankCss, /repeating-linear-gradient/, "sample quality no longer obscures the frequency colour");
assert.match(rankComparison, /LOW_N_PRIOR_STRENGTH = 16/, "low-N cells use the agreed prior strength");
assert.match(rankComparison, /display\.estimated \? " is-estimated"/, "N 1-4 cells render as estimates instead of empty cells");
assert.match(rankCss, /\.rank-cell\.is-estimated[^}]*--sample-marker:\s*#c49af8/, "estimated cells have a distinct violet corner marker");
assert.match(html, /≈ оценка · N 1–4/, "legend labels the low-N estimate explicitly");

assert.match(js, /firstChoice:\s*"",\s*\n\s*unlocked:\s*false/, "first-hand answer and persistent lesson unlock are separate state");
assert.match(js, /if \(!state\.unlocked && next !== "idea"\) return;/, "saved lesson unlock controls tab navigation");
assert.match(js, /JSON\.stringify\(\{ step: state\.step, unlocked: state\.unlocked \}\)/, "progress persists unlock without persisting the selected answer");
assert.doesNotMatch(js, /JSON\.stringify\(\{[^}]*firstChoice/, "first-hand answer is never persisted");
assert.match(js, /state\.firstChoice = key;\s*state\.unlocked = true;/, "answering the first hand unlocks the lesson");
assert.match(js, /const restoredUnlock = Boolean\(saved\.unlocked \|\| saved\.firstChoice\);/, "legacy saved answers migrate to unlock-only progress");
assert.match(js, /\["idea", "wisdom", "data", "deep", "practice"\]\.includes\(saved\.step\)/, "saved progress can reopen the standalone data screen");
assert.match(js, /new URLSearchParams\(window\.location\.search\)\.get\("from"\) === "ffstart"/);
assert.match(js, /practiceHands: FFSTART_COURSE_CONTEXT \? 25 : 10/);
assert.match(js, /function configureFfStartNavigation\(\)[\s\S]*\/ffstart\/play-session\?session=short-stack-run/);
assert.match(js, /function reportFfStartCompletion\(event\)/);
assert.match(js, /event\.source !== frame\.contentWindow \|\| event\.origin !== window\.location\.origin/);
assert.match(js, /message\.schema !== "ffstart-legacy-bridge-v1"[\s\S]*message\.type !== "ffstart:resteal-complete"/);
assert.match(js, /api\.setResult\("ffstart_resteal", \{[\s\S]*evaluated: false,[\s\S]*completed: true,[\s\S]*completedHands: 25,[\s\S]*targetHands: 25,[\s\S]*attempts: 25,[\s\S]*status: "passed"/);
assert.match(js, /metadata: \{ courseContext: true, evaluated: false \}/);
const initSource = js.slice(js.indexOf("  function init()"), js.indexOf("\n\n  init();"));
assert.doesNotMatch(initSource, /state\.firstChoice\s*=/, "page load never restores a previous answer");
assert.doesNotMatch(initSource, /has-answer/, "page load never renders the first hand as answered");

assert.doesNotMatch(
  css,
  /\.seat\.is-hero \.hero-felt-bet[\s\S]{0,220}display:\s*inline-flex\s*!important/,
  "lesson leaves Hero marker visibility to the shared simulator-slot geometry"
);
assert.match(trainerShellCss, /--hero-card-pocket-y:\s*-18px/, "shared trainer shell owns the compact hero-card pocket");
assert.match(
  trainerShellCss,
  /\.seat\.is-hero \.seat-position-label[\s\S]*white-space:\s*nowrap/,
  "shared trainer shell owns the compact Hero position label"
);
assert.doesNotMatch(
  css,
  /\.seat\.is-hero \.seat-position-label[\s\S]*white-space:\s*nowrap/,
  "lesson CSS does not own compact simulator-seat geometry"
);
assert.match(trainerShellCss, /--hero-card-width:\s*clamp\(51px/, "shared trainer shell owns compact hero-card sizing");
assert.doesNotMatch(css, /--hero-card-(?:pocket-y|width)/, "lesson CSS does not override shared simulator card geometry");
assert.match(css, /--poker-card-width:\s*34\.5px\s*!important/);
assert.match(css, /@keyframes intro-route-flow/);
assert.match(css, /\.wisdom-carousel-track/);
assert.match(css, /\.wisdom-slide\.is-active/);
assert.match(css, /\.matrix-status\.is-ready[^{]*\{[^}]*clip-path:\s*inset\(50%\)/);
assert.match(css, /\.practice-simulator-shell iframe/);
assert.match(css, /body\.practice-is-running[\s\S]*height:\s*100svh/);
assert.match(css, /\.practice-screen\.is-running \.practice-disclaimer\s*\{\s*display:\s*grid/);
assert.match(simulatorPack, /manualNextHand:\s*false/);
assert.match(simulatorPack, /continueAfterBust:\s*true/);
assert.match(simulatorPack, /uiScale:\s*"xl"/);
assert.match(simulatorPack, /handTempo:\s*"fast"/);
assert.doesNotMatch(simulatorPack, /simulatorStageProfile\s*=\s*"readable-single"/);
assert.match(simulatorPack, /delete\s+root\.document\.documentElement\.dataset\.simulatorStageProfile/);
assert.match(css, /practice-screen\.is-running[^\{]*\{[^\}]*min-height:\s*0[^\}]*overflow:\s*hidden/);
assert.doesNotMatch(
  simulatorPackCss,
  /--(?:hero-marker|seat-cards|reveal-card|mini-card|hero-card)/,
  "practice pack leaves seat, marker, and card geometry to the shared simulator"
);
assert.match(
  simulatorPackCss,
  /html\[data-resteal-drill="true"\][^\{]*\.action-status\s*\{\s*display:\s*none/,
  "resteal practice removes the redundant current-action status card"
);
assert.match(simulatorPack, /function sessionDrillMetrics\(/);
assert.match(simulatorPack, /function buildPostHandContext\(/);
assert.match(simulatorPack, /function updateDrillAdvice\(/);
assert.match(simulatorPack, /Сыграны все.*раздач\. Сыграть ещё\?/);
assert.match(simulatorPack, /\[10, 25, 50, 100\]/);
assert.match(simulatorPack, /bigBlindAnteBb:\s*1/);
assert.match(simulatorPack, /demoMode:\s*true/);
assert.equal((advice.match(/id:\s*"[^"]+"/g) || []).length, 50, "advice catalog has exactly 50 entries");
assert.match(simulatorPack, /role=\"status\" aria-live=\"polite\" aria-atomic=\"true\"/);
assert.match(simulatorPackCss, /resteal-wisdom-toast\.is-visible[^\{]*\{[^\}]*pointer-events:\s*none/);
assert.match(simulatorPackCss, /resteal-wisdom-close[^\{]*\{[^\}]*width:\s*40px[^\}]*height:\s*40px/);
assert.match(simulatorPackCss, /@media \(prefers-reduced-motion:\s*reduce\)/);

console.log("PASS resteal lesson contract: wisdom intro, full simulator practice, fixed BB ante, FF Start completion bridge");
