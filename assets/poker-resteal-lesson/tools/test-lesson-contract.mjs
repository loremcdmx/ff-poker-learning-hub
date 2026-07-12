import assert from "node:assert/strict";
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

for (const id of ["lessonIntro", "startLesson", "introBtnChips", "introPotChips", "introJamChips", "introHeroCards", "introDealerButton", "firstEncounter", "firstTable", "firstCoach", "wisdomScreen", "wisdomCarouselTrack", "wisdomStoryCounter", "wisdomStoryDots", "wisdomFoldRate", "wisdomPassRate", "wisdomCallRate", "wisdomDoubleRate", "wisdomRiskDots", "deepScreen", "deepMathPanel", "deepFieldPanel", "opponentTabs", "foldSummary", "handMatrix", "practiceSimulatorShell", "restealSimulator", "startPracticeSession", "exitPractice", "infoPopover"]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `${id} exists`);
}
for (const script of [
  "deck-library.js", "chip-library.js", "simulator-board-render.js", "simulator-seat-slots.js",
  "simulator-seat-renderer.js", "simulator-table-renderer.js", "simulator-snapshot.js", "browser-bundle.js",
  "data.js", "engine.js", "lesson.js"
]) {
  assert.ok(html.indexOf(script) >= 0, `${script} is wired`);
}
assert.ok(html.indexOf("simulator-snapshot.js") < html.indexOf("lesson.js"), "snapshot loads before lesson runtime");
assert.ok(html.indexOf("browser-bundle.js") < html.indexOf("lesson.js"), "file-safe data bundle loads before lesson runtime");
assert.match(simulatorHtml, /assets\/poker-resteal-lesson\/simulator-pack\.js/);
assert.match(simulatorHtml, /assets\/poker-resteal-lesson\/simulator-pack\.css/);
assert.match(simulatorHtml, /assets\/poker-resteal-lesson\/advice\.js/);
assert.ok(simulatorHtml.indexOf("advice.js") < simulatorHtml.indexOf("simulator-pack.js"), "advice catalog loads before the practice pack");
assert.doesNotMatch(html, /poker-progress|FFPlayerProgress|FFTrainerEvents/);
assert.doesNotMatch(html, /data-control=["']ante["']|pkoToggle|waterfall|<details|Источник|Как посчитано/);
assert.match(html, /Всегда включён · 1 BB/);
assert.match(html, /Понятно, сыграть раздачу/);
assert.match(html, /class="intro-action-routes"/);
assert.equal((html.match(/data-wisdom-slide/g) || []).length, 6, "wisdom carousel has six distinct slides");
assert.match(html, /id="wisdomStoryCounter"[^>]*>1 из 6</);
assert.match(html, /data-step-target="wisdom"/);
assert.match(html, /data-step-target="deep"/);
assert.doesNotMatch(html, /data-step-target="(?:math|field)"/);
assert.doesNotMatch(html, /data-deep-target=/, "deep content should be one continuous page without duplicate inner tabs");
assert.doesNotMatch(html, /id="deepFieldPanel"[^>]*hidden/, "opponent adjustment should be visible below ranges and math");
assert.doesNotMatch(html, /id="presetRow"|id="fieldSummary"|class="range-picture"/, "deep lesson keeps one opponent picker and no duplicate metric cards");
assert.equal((html.match(/id="(?:hand|field)Matrix"/g) || []).length, 1, "deep lesson uses one shared 13x13 matrix");
assert.doesNotMatch(html, /id="fieldMatrix"|id="fieldHandReadout"/, "duplicate field matrix and readout are removed");
assert.doesNotMatch(html, /class="panel risk-card"|id="bustHeadline"/, "generic bustout card is removed");
assert.ok(html.indexOf("pko-card-under-matrix") < html.indexOf('id="deepFieldPanel"'), "PKO controls sit directly below the shared matrix section");
assert.match(html, /Реальные раздачи · январь–июнь 2026/);
assert.match(html, /средний chips_ev ÷ BB/i);
assert.match(html, /это не две линии одной и той же раздачи/);
assert.match(html, /Но я могу вылететь/);
assert.match(html, /Почему не просто колл/);
assert.match(html, /Боты не поддаются, ГСЧ честный/);
assert.match(html, /современных AI-технологий/);
assert.match(html, /Красный[\s\S]*близко к топ-модели/);
assert.match(html, /Синий[\s\S]*средняя сила/);
assert.match(html, /Зелёный[\s\S]*слабый бот/);
for (const hands of [10, 25, 50, 100]) assert.match(html, new RegExp(`data-session-hands=["']${hands}["']`));

for (const contract of ["renderIntroTableArt", "startLesson", "renderFirstTable", "answerFirst", "renderPracticeSetup", "practiceSimulatorUrl", "startPracticeSession", "renderWisdomEvidence", "renderWisdomStory", "setupWisdomCarousel", "applyOpponentProfile", "showInfo", "closeInfo"]) {
  assert.match(js, new RegExp(`function ${contract}\\(`), `${contract} runtime exists`);
}
assert.match(js, /data-option-key/);
assert.match(js, /lesson["'], ["']resteal/);
assert.match(js, /result\.foldEquity/);
assert.doesNotMatch(js, /hero_bustouts|bustHeadline|bustVisual/);
assert.doesNotMatch(js, /BB ante 1 BB · стек/, "ready matrix status does not repeat visible controls");
assert.doesNotMatch(js, /pointerover|focusin|renderFirstWisdom|metricContent|showMetric|cleanup_waterfall|answerPractice/);
assert.doesNotMatch(data, /ante:\s*0/);
assert.match(data, /hand:\s*"QJo"/);
assert.match(js, /PokerChipKit/);

assert.doesNotMatch(
  css,
  /\.seat\.is-hero \.hero-felt-bet[\s\S]{0,220}display:\s*inline-flex\s*!important/,
  "lesson leaves Hero marker visibility to the shared simulator-slot geometry"
);
assert.match(css, /--hero-card-pocket-y:\s*-18px/);
assert.match(css, /\.seat\.is-hero \.seat-position-label[\s\S]*white-space:\s*nowrap/);
assert.match(css, /--hero-card-width:\s*clamp\(51px/);
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
assert.match(simulatorPackCss, /hero-marker-ty[^;]*-\s*2\.5cqh/, "Hero bet marker keeps a clear lane above the cards");
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

console.log("PASS resteal lesson contract: wisdom intro, full simulator practice, fixed BB ante, no hub progress integration");
