import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { validateCurrentBenchmarkTemplates } from "./source-template-readiness.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const require = createRequire(import.meta.url);
const readinessContract = require(resolve(root, "assets/poker-preflop-benchmark/readiness.js"));
function versioned(asset) {
  const digest = createHash("sha256").update(readFileSync(resolve(root, asset))).digest("hex").slice(0, 12);
  return `${asset}?v=${digest}`;
}

const pages = [
  {
    key: "vs_raise_free",
    file: "vs-one-raiser-positions-lesson.html",
    title: "Против одного рейзера · свободные позиции · FF Префлоп-лаборатория",
    description: "Интерактивный тренажёр решений MP–BTN против одного рейзера: пас, колл, 3-бет и пуш.",
    kicker: "Префлоп · свободные позиции",
    heading: "Против одного рейзера",
    comparisonKicker: "Сравнение трёх уровней",
    comparisonCopy: "Один спот, три полных диапазона. Смотри, как меняется главное действие между первой лигой, 2–3 лигами и рангами 15–18.",
    next: "/vs-one-raiser-sb-lesson",
    nextLabel: "Дальше: SB против рейзера →",
  },
  {
    key: "vs_raise_sb",
    file: "vs-one-raiser-sb-lesson.html",
    title: "SB против одного рейзера · FF Префлоп-лаборатория",
    description: "Интерактивный тренажёр игры на малом блайнде против одного рейзера.",
    kicker: "Префлоп · малый блайнд",
    heading: "SB против одного рейзера",
    next: "/resteal-lesson",
    nextLabel: "Дальше: рестилы →",
  },
  {
    key: "sb_unopened",
    file: "sb-unopened-lesson.html",
    title: "SB без опена до тебя · FF Префлоп-лаборатория",
    description: "Интерактивный тренажёр широкого VPIP малого блайнда: комплиты, рейзы и опен-пуши по стеку.",
    kicker: "Префлоп · один соперник",
    heading: "SB без опена до тебя",
    next: "/bb-call-defense-lesson",
    nextLabel: "Дальше: защита BB →",
  },
];

const fieldContext = { window: {} };
vm.createContext(fieldContext);
vm.runInContext(readFileSync(resolve(root, "assets/poker-preflop-benchmark/field-data.js"), "utf8"), fieldContext);
vm.runInContext(readFileSync(resolve(root, "assets/poker-preflop-benchmark/spot-ev-data.js"), "utf8"), fieldContext);
const fieldData = fieldContext.window.PokerPreflopBenchmarkData;
const evData = fieldContext.window.PokerPreflopBenchmarkEvData;
const readiness = readinessContract.validateBenchmarkData(fieldData, evData);
const sourceTemplates = validateCurrentBenchmarkTemplates(root, fieldData, evData);

function pageObservedReady() {
  return readiness.ready === true && sourceTemplates.ready === true;
}

const sharedScripts = [
  versioned("assets/poker-kit/decks/deck-library.js"),
  versioned("assets/poker-kit/chips/chip-library.js"),
  versioned("assets/poker-simulator/simulator-random.js"),
  versioned("assets/poker-simulator/simulator-board-render.js"),
  versioned("assets/poker-simulator/simulator-seat-slots.js"),
  versioned("assets/poker-simulator/simulator-seat-renderer.js"),
  versioned("assets/poker-simulator/simulator-table-renderer.js"),
  versioned("assets/poker-trainer-shell/simulator-snapshot.js"),
  versioned("assets/poker-trainer-shell/simulator-practice.js"),
  versioned("assets/poker-progress/progress.js"),
  versioned("assets/poker-preflop-benchmark/field-data.js"),
  versioned("assets/poker-preflop-benchmark/spot-ev-data.js"),
  versioned("assets/poker-preflop-benchmark/config.js"),
  versioned("assets/poker-preflop-benchmark/readiness.js"),
  versioned("assets/poker-preflop-benchmark/lesson.js"),
];

function pageHtml(page) {
  const observedReady = pageObservedReady(page);
  const description = observedReady
    ? page.description
    : `Методика префлоп-решений: ${page.heading.toLowerCase()}. Числовые чарты и практика вернутся после проверки полевых данных.`;
  const tabs = observedReady
    ? `<button class="step-tab active" type="button" role="tab" aria-selected="true" data-go="hand">1. Раздача</button><button class="step-tab" type="button" role="tab" aria-selected="false" data-go="main" disabled>2. Главное</button><button class="step-tab" type="button" role="tab" aria-selected="false" data-go="ranges" disabled>3. Чарты</button><button class="step-tab" type="button" role="tab" aria-selected="false" data-go="field" disabled>4. Сравнение</button><button class="step-tab" type="button" role="tab" aria-selected="false" data-go="wisdom" disabled>5. Мудрости</button><button class="step-tab" type="button" role="tab" aria-selected="false" data-go="practice" disabled>6. Практика</button>`
    : `<button class="step-tab active" type="button" role="tab" aria-selected="true" data-go="hand">1. Об уроке</button><button class="step-tab" type="button" role="tab" aria-selected="false" data-go="main" disabled>2. Главное</button><button class="step-tab" type="button" role="tab" aria-selected="false" data-go="wisdom" disabled>3. Мудрости</button>`;
  const dataScreens = observedReady ? `
    <section class="screen" data-screen="ranges">
      <div class="deep-heading reference-heading"><div><p class="eyebrow">План первой лиги</p><h2 id="chartTitle"></h2></div><p id="chartCopy"></p></div>
      <article class="ff-chart-panel benchmark-chart-panel"><div class="benchmark-filters" data-filter-host></div><div class="ff-chart-head benchmark-chart-head"><div><p class="eyebrow" id="chartContext"></p><h2 id="chartSummary"></h2></div><div class="ff-chart-legend" data-action-legend></div></div><div class="benchmark-range-scroll" role="region" aria-label="Прокручиваемая матрица 13 на 13" tabindex="0"><div class="ff-range-grid benchmark-range-grid" id="benchmarkRange" role="grid" aria-label="Матрица решений первой лиги"></div></div><div class="benchmark-hand-detail" id="benchmarkHandDetail" aria-live="polite"></div><p class="source-note benchmark-source" data-source-note></p></article>
    </section>

    <section class="screen" data-screen="field">
      <div class="deep-heading reference-heading"><div><p class="eyebrow">${page.comparisonKicker || "Сравнение трёх уровней"}</p><h2>Где теряется правильная ветка</h2></div><p>${page.comparisonCopy || "Один спот, три полных диапазона. Смотри, как меняется главное действие между первой лигой, 2–3 лигами и рангами 15–18."}</p></div>
      <article class="ff-chart-panel comparison-panel"><div class="benchmark-filters" data-filter-host></div><div class="comparison-grid" id="comparisonGrid"></div><div class="comparison-gap" id="comparisonGap" aria-live="polite"></div><p class="source-note benchmark-source" data-source-note></p></article>
    </section>` : "";
  const practiceScreen = observedReady ? `
    <section class="screen" data-screen="practice">
      <div class="practice-heading"><div><p class="eyebrow">Бесконечная практика</p><h2 id="practiceTitle"></h2><p id="practiceCopy"></p></div></div>
      <div class="practice-launch" id="practiceLaunch"><article class="panel practice-mode-card"><div><p class="eyebrow">Руки с ясным планом</p><h2>Выбирать действие, а не угадывать процент</h2><p>Сначала закрепи понятные решения. Серую границу диапазона оставим на следующий уровень.</p></div><button class="btn primary" id="startPractice" type="button">Запустить</button></article></div>
      <div class="panel benchmark-practice" id="practiceShell" hidden><div class="practice-hud"><span>Рука <b id="handNo">0</b></span><span>Верно <b id="score">0</b></span><span>Промахи <b id="misses">0</b></span><button class="btn" id="stopPractice" type="button">Закончить</button></div><div class="practice-stage"><article class="room-stage"><div class="lesson-table-host" id="practiceTable" aria-live="polite"></div></article><aside class="coach"><div id="practiceCoach"></div><div class="practice-feedback" id="practiceFeedback" hidden></div></aside></div></div>
    </section>` : "";
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${description}">
  <title>${page.title}</title>
  <link rel="icon" href="assets/favicon.svg">
  <link rel="stylesheet" href="assets/poker-kit/tokens.css">
  <link rel="stylesheet" href="${versioned("assets/poker-kit/chart-system.css")}">
  <link rel="stylesheet" href="${versioned("assets/poker-kit/decks/decks.css")}">
  <link rel="stylesheet" href="${versioned("assets/poker-kit/suit-text.css")}">
  <link rel="stylesheet" href="${versioned("assets/poker-kit/chips/chips.css")}">
  <link rel="stylesheet" href="${versioned("assets/poker-simulator/simulator-table.css")}">
  <link rel="stylesheet" href="${versioned("assets/poker-simulator/simulator-polish.css")}">
  <link rel="stylesheet" href="${versioned("assets/poker-kit/trainer-ui-sanitizer.css")}">
  <link rel="stylesheet" href="${versioned("assets/poker-bb-call-defense-lesson/base.css")}">
  <link rel="stylesheet" href="${versioned("assets/poker-preflop-benchmark/lesson.css")}">
  <link rel="stylesheet" href="${versioned("assets/poker-kit/lesson-header.css")}">
  <script defer src="${versioned("assets/poker-kit/suit-text.js")}"></script>
  <script defer src="${versioned("assets/poker-kit/lesson-header.js")}"></script>
</head>
<body class="preflop-benchmark-lesson" data-trainer="${page.key}">
  <main class="app">
    <header class="topline lesson-chrome" data-lesson-header>
      <div class="lesson-brand lesson-chrome__identity">
        <a class="lesson-home lesson-chrome__back" href="/">← В лабораторию</a>
        <div class="lesson-chrome__copy">
          <p class="eyebrow lesson-chrome__eyebrow">${page.kicker}</p>
          <h1 class="lesson-chrome__title">${page.heading}</h1>
        </div>
      </div>
      <nav class="step-tabs lesson-chrome__steps" role="tablist" aria-label="Шаги урока">
        ${tabs}
      </nav>
    </header>

    <section class="screen active is-active" data-screen="hand">
      <article class="panel lesson-intro benchmark-intro">
        <div class="intro-copy"><p class="eyebrow">Главная мысль урока</p><h2 id="introTitle"></h2><p class="intro-lead" id="introLead"></p></div>
        <div class="intro-table-visual"><article class="table-card"><div class="lesson-table-host" id="introTableHost" aria-label="${observedReady ? "Интерактивный префлоп-стол" : "Статус полевых данных"}" aria-live="polite"></div><div class="intro-answer" id="introCoach" role="status" aria-live="polite" aria-atomic="true"></div></article></div>
      </article>
    </section>

    <section class="screen" data-screen="main">
      <div class="wisdom-heading"><div><p class="eyebrow">Сначала пойми идею</p><h2 id="wisdomTitle"></h2></div><p id="wisdomLead"></p></div>
      <div class="wisdom" id="wisdomCarousel" role="region" aria-roledescription="карусель" tabindex="0" aria-label="Три практических правила"><div id="wisdomSlides"></div><div class="carousel wisdom-carousel-controls" role="group" aria-label="Навигация по правилам"><button class="wisdom-arrow" id="wisdomPrev" type="button" aria-label="Предыдущая мысль">←</button><div class="wisdom-carousel-status"><strong id="wisdomCounter" aria-live="polite">1 из 3</strong><div class="wisdom-story-dots" id="wisdomDots"></div><small id="wisdomRemaining"></small></div><button class="wisdom-arrow" id="wisdomNext" type="button" aria-label="Следующая мысль">→</button></div></div>
      ${observedReady ? '<div class="actions wisdom-actions"><button class="btn primary" data-go="ranges">Посмотреть чарт</button><button class="btn" data-go="practice">Сразу попробовать</button></div>' : ""}
    </section>

    ${dataScreens}

    <section class="screen" data-screen="wisdom">
      <div class="deep-heading reference-heading"><div><p class="eyebrow">${observedReady ? "Выводы из разницы" : "Методика решения"}</p><h2>${observedReady ? "Что менять в следующей сессии" : "Что проверить перед каждым решением"}</h2></div><p>${observedReady ? "Мудрости перестраиваются вместе с выбранным стеком и позициями." : "Только принципы, которые не зависят от неподтверждённых частот."}</p></div>
      <div class="insight-grid" id="insightGrid"></div>
      <article class="panel stack-story" id="stackStory"></article>
    </section>

    ${practiceScreen}
  </main>
  <footer class="lesson-footer"><a href="/">← Все тренажёры</a><a href="${page.next}">${page.nextLabel}</a></footer>
  ${sharedScripts.map((src) => `<script src="${src}"></script>`).join("")}
</body>
</html>\n`.replace(/[ \t]+$/gm, "");
}

for (const page of pages) writeFileSync(resolve(root, page.file), pageHtml(page));
console.log(`generated ${pages.length} benchmark lesson pages`);
