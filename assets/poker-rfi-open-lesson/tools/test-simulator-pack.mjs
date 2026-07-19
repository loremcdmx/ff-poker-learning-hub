import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Script, createContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { runSimulatorEngineScripts } from "../../../scripts/simulator-engine-script-list.mjs";

const repo = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
function loadHarness(search) {
  const document = {
    documentElement: { dataset: {} },
    readyState: "loading",
    addEventListener() {},
    querySelector() { return null; }
  };
  const window = {
    location: { search },
    document,
    addEventListener() {},
    setInterval,
    clearInterval
  };
  const context = createContext({ window, globalThis: window, document, URL, URLSearchParams, console, setInterval, clearInterval });
  const run = (path) => new Script(readFileSync(resolve(repo, path), "utf8"), { filename: path }).runInContext(context);
  run("assets/poker-kit/simulator/bot-strategy-profile.js");
  runSimulatorEngineScripts({ root: repo, context, Script });
  run("assets/poker-simulator/simulator-practice-packs.js");
  run("assets/poker-rfi-open-lesson/data.js");
  run("assets/poker-rfi-open-lesson/practice-stats.js");
  run("assets/poker-rfi-open-lesson/simulator-pack.js");
  run("assets/poker-simulator/simulator-action-controls.js");
  return { window, engine: window.PokerSimulatorEngine, pack: window.PokerRfiOpenSimulatorPack };
}

const finite = loadHarness("?embedded=1&practice=rfi-open&hands=10&handMode=preflop");
const { window, engine, pack } = finite;
const hands = Array.from({ length: 10 }, (_, index) => engine.createTable({
  id: 1,
  handNo: index + 1,
  settings: pack.applyBootSettings({})
}));

assert.deepEqual(hands.map((table) => table.heroPosition), ["UTG", "LJ", "HJ", "CO", "BTN", "UTG", "LJ", "HJ", "CO", "BTN"]);
for (const table of hands) {
  assert.equal(table.status, "playing");
  assert.equal(table.heroTurn, true);
  assert.equal(table.preflopOpenerSeatId, null);
  assert.equal(table.currentBet, 1);
  assert.equal(table.rfiOpenDrill.attempts, 1, "forced folds produce the exact RFI decision in one deal");
  assert.equal(table.rfiOpenDrill.position, table.heroPosition);
}
assert.equal(pack.practiceDescriptor.scenario.freshDeal, true);
assert.equal(typeof pack.practiceDescriptor.defaultBetAmount, "function");
assert.equal(pack.sessionHands(), 10);
assert.equal(pack.sessionLimitReached(9), false);
assert.equal(pack.sessionLimitReached(10), true);
assert.equal(pack.handMode(), "preflop");
assert.deepEqual(JSON.parse(JSON.stringify(hands[0].practiceScenario.defaultAfterHero)), { action: "fold" });
assert.equal(pack.applyBootSettings({}).revealPreflopFoldedCardsOnFinish, true);
assert(!/engine\.createTable\s*=/.test(readFileSync(resolve(repo, "assets/poker-rfi-open-lesson/simulator-pack.js"), "utf8")));

const defaultBet = window.PokerSimulatorPracticePacks.defaultBetAmount({
  table: hands[0],
  bounds: { min: 2, max: 40 },
  value: 2.2,
  draft: null
});
assert.equal(defaultBet, 2);

const actionControls = window.PokerSimulatorActionControls.model({
  getState: () => ({ settings: { tableCount: 1 } }),
  getTable: () => hands[0],
  windowRef: window,
  canHeroAct: () => true,
  betBounds: () => ({ min: 2, max: 40, step: 0.1, value: 2 }),
  betSliderModel: (_table, bounds) => ({ kind: "amount", ...bounds }),
  betPresets: () => [],
  formatAmount: (value) => `${value} BB`,
  formatCompactAmount: (value) => `${value} BB`,
  formatBetSliderValue: (_table, _bounds, value) => `${value} BB`,
  betSliderFillPercent: () => 0
});
const rfiActions = actionControls.renderActions(hands[0]);
assert.equal((rfiActions.match(/class="table-action /g) || []).length, 3, "RFI opening renders exactly three actions");
assert(!rfiActions.includes("data-bet-widget"), "fixed 2 BB RFI opening omits presets, stepper and slider");
for (const action of ["fold", "call", "raise-custom"]) assert(rfiActions.includes(`data-action="${action}"`), `${action} action stays available`);
assert(rfiActions.includes('table-action-verb">Опен'), "fixed RFI raise is labelled as an open");
assert(rfiActions.includes('table-action-amount" data-bet-display>2 BB'), "fixed RFI open keeps the 2 BB amount visible");
const rfiPackCss = readFileSync(resolve(repo, "assets/poker-rfi-open-lesson/simulator-pack.css"), "utf8");
assert.match(rfiPackCss, /\.client-controls\.is-practice-simple\s*\{[^}]*min-height:0;/s, "simple practice actions collapse the reserved betbox height on every street");
assert(rfiPackCss.includes('.client-controls.is-practice-simple > .client-row .table-action'), "simple practice actions retain full-size button targets");
assert.match(rfiPackCss, /\.workspace:has\(> \.rfi-range-review\.is-visible\)\s*\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(400px,440px\)/s, "desktop review keeps a matrix-safe side rail beside the table");
assert.match(rfiPackCss, /@media\(max-width:1160px\)[\s\S]*?\.workspace:has\(> \.rfi-range-review\.is-visible\)\s*\{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*grid-template-rows:auto max-content/s, "review stays stacked at its real content height until table and side rail both have usable width");
assert.match(rfiPackCss, /\.rfi-stage-viewport\s*\{[^}]*align-self:stretch[^}]*width:100%[^}]*height:100%[^}]*min-width:0/s, "docked review gives the simulator a measurable, non-recursively shrinking stage viewport");
assert(rfiPackCss.includes('.rfi-range-review[data-collapsed="true"] .rfi-review-details'), "narrow review chart can collapse without hiding the verdict");
assert.match(rfiPackCss, /\.rfi-range-review\s*\{[^}]*display:block[^}]*height:calc\(100dvh - 138px\)/s, "desktop review keeps its own bounded scroll surface");
assert.match(rfiPackCss, /\.rfi-review-board\s*\{[^}]*height:100%[^}]*min-height:0[^}]*overflow: auto/s, "only the review board scrolls on desktop");
assert.match(rfiPackCss, /\.rfi-review-action-dock\s*\{[^}]*position:fixed[^}]*bottom:max\(8px,env\(safe-area-inset-bottom\)\)/s, "next-hand control is independently pinned to the simulator viewport");
assert.match(rfiPackCss, /@media\(max-width:1160px\)[\s\S]*?\.workspace:has\(> \.rfi-review-action-dock\.is-visible\)\s*\{[^}]*padding-bottom:72px/s, "stacked practice reserves room for the independent next-hand dock");
assert.match(rfiPackCss, /\.rfi-review-chart\s*\{[^}]*width:100%/s, "desktop review chart uses the available side-panel width");
assert.match(rfiPackCss, /@media\(max-width:1160px\)[\s\S]*?\.rfi-range-review\s*\{[^}]*width:min\(740px,100%\)/s, "stacked review uses the available laptop width without becoming an edge-to-edge sheet");
assert.match(rfiPackCss, /@media\(max-width:1160px\)[\s\S]*?\.rfi-review-chart\s*\{[^}]*width:min\(640px,100%\)/s, "stacked review chart grows to a readable width without overflowing its board");
assert.match(rfiPackCss, /\.rfi-review-chart\s*\{[^}]*container-type:inline-size/s, "review chart owns its responsive type scale");
assert.match(rfiPackCss, /\.rfi-review-cell b\s*\{[^}]*font-size:clamp\(7px,2\.25cqi,10px\)[^}]*text-shadow:none/s, "review chart labels scale from the matrix instead of the viewport and stay visually clean");
assert(!/\.rfi-review-chart\s*\{[^}]*width:min\(2(?:10|20)px,100%\)/s.test(rfiPackCss), "review chart is not squeezed by the obsolete 210/220 px caps");
const rfiPackSource = readFileSync(resolve(repo, "assets/poker-rfi-open-lesson/simulator-pack.js"), "utf8");
assert(rfiPackSource.includes('querySelector(".workspace") || root.document.body'), "review is mounted beside the simulator stage inside the workspace layout");
assert(rfiPackSource.includes('feedback.setAttribute("role", "region")'), "review is non-modal and does not claim dialog focus ownership");
assert(!rfiPackSource.includes('feedback.querySelector("[data-rfi-review-next]")?.focus'), "review no longer steals focus from the completed table");
assert.match(rfiPackSource, /data-rfi-review-close aria-label="Закрыть разбор"/, "review has an explicit accessible close control");
assert(rfiPackSource.includes('matchMedia?.("(max-width: 1160px)")'), "review collapse state follows the shared stacked-layout breakpoint");
assert.match(rfiPackSource, /setFeedbackCollapsed[\s\S]*?dock\.setAttribute\("aria-hidden", compact && !value \? "true" : "false"\)/, "expanding a compact chart temporarily clears the fixed next-hand dock");
assert.match(rfiPackSource, /if \(focusNext\)[\s\S]*?dock\.setAttribute\("aria-hidden", "false"\)/, "closing an expanded review restores the next-hand dock before focusing it");
assert(rfiPackSource.includes("workspace.scrollTop = workspace.scrollHeight"), "compact embeds reveal the verdict above the independent next-hand dock");
assert.match(rfiPackSource, /<footer class="rfi-review-footer" aria-live="polite">[\s\S]*?<div class="rfi-review-details"/s, "review announces and shows the verdict before the optional chart");
assert(!rfiPackSource.includes('feedback.setAttribute("aria-live", "polite")'), "the 169-cell chart is not part of the live announcement");
assert(!rfiPackSource.includes('title="${hand}:'), "native cell tooltips no longer cover the matrix");
assert.match(rfiPackSource, /aria-label="\$\{hand\}:[\s\S]*?исходная частота \$\{frequency\}%"/, "every chart cell keeps an accessible action and frequency label");
assert.match(rfiPackSource, /data-rfi-review-selection/, "played-hand details stay visible without hover");
assert.match(rfiPackSource, /function ensureReviewActionDock[\s\S]*?host\.appendChild\(dock\)/, "next-hand dock is mounted directly in the workspace, outside the review region");
assert(!/<\/section>\s*<div class="rfi-review-action-dock"/.test(rfiPackSource), "review markup does not own the next-hand dock");
assert.match(rfiPackSource, /closeReview[\s\S]*?hideGrade\(\{ focusNext: true \}\)/, "closing the review preserves and focuses the independent next-hand action");
assert.match(rfiPackSource, /const next = event\.target\?\.closest\?\.\("\[data-rfi-review-next\]"\)[\s\S]*?hideGrade\(\{ hideDock: true \}\)[\s\S]*?PokerSimulatorApp\?\.newHand/s, "next-hand control clears both surfaces and starts exactly one new hand");
for (const token of ["function setFeedbackCollapsed", "function resetAnalysis", 'querySelector(".table-grid.is-idle")', '[data-action="start-simulator"], #reset-session-button']) assert(rfiPackSource.includes(token), `RFI review lifecycle includes ${token}`);
for (const token of ["function ensureStageViewport", "function syncStageToViewport", "data-rfi-stage-viewport", "PokerSimulatorStage", "api.syncStage(shell, stage, viewport)"]) assert(rfiPackSource.includes(token), `RFI review stage fit includes ${token}`);

const preflopOpen = engine.createTable({ id: 7, handNo: 11, settings: pack.applyBootSettings({}) });
const preflopOpenStart = engine.startHeroAction(preflopOpen, "raise-custom", pack.applyBootSettings({}), { amount: 2 });
assert.equal(preflopOpenStart.accepted, true);
assert.equal(preflopOpenStart.needsBot, true);
engine.resolveBotAction(preflopOpen, preflopOpenStart.heroAction, preflopOpenStart.heroAmount, pack.applyBootSettings({}));
assert.equal(preflopOpen.street, "preflop", "preflop-only mode never opens the flop");
assert.notEqual(preflopOpen.status, "playing", "preflop-only mode terminates after the opening decision");

const preflopCall = engine.createTable({ id: 8, handNo: 12, settings: pack.applyBootSettings({}) });
const preflopCallStart = engine.startHeroAction(preflopCall, "call", pack.applyBootSettings({}));
assert.equal(preflopCallStart.accepted, true, "the live Call button records a limp instead of being capture-blocked");
engine.resolveBotAction(preflopCall, preflopCallStart.heroAction, preflopCallStart.heroAmount, pack.applyBootSettings({}));
const preflopCallGrade = pack.gradeEntry({
  handNo: preflopCall.handNo,
  hero: { seatId: 0, combo: preflopCall.combo },
  handHistory: engine.snapshotHandHistory(preflopCall)
});
assert.equal(preflopCallGrade.action, "limp");
assert.equal(preflopCallGrade.correct, false);

const stats = pack.statsForGrades([
  { position: "EP", combo: "AA", action: "open", expected: "open" },
  { position: "EP", combo: "72o", action: "open", expected: "fold" },
  { position: "BTN", combo: "AA", action: "fold", expected: "open" }
]);
assert.deepEqual(JSON.parse(JSON.stringify(window.PokerRfiPracticeStats.summary(stats, "EP"))), { attempts: 2, correct: 1, accuracy: 50, extraOpens: 1, missedOpens: 0, otherMistakes: 0 });
assert.equal(pack.positionChartMarkup(stats, "EP").includes("rfi-position-grid"), true);

const genericActions = actionControls.renderActions({ ...hands[0], rfiOpenDrill: null, preflopOpenerSeatId: 99 });
assert(genericActions.includes("data-bet-widget"), "ordinary simulator decisions keep the full betbox");
assert(genericActions.includes('table-action-verb">Рейз'), "ordinary simulator decisions keep the raise label");

const endless = loadHarness("?embedded=1&practice=rfi-open");
const endlessSettings = endless.pack.applyBootSettings({ sessionHandLimit: 25 });
assert.equal(endless.pack.sessionHands(), 0);
assert.equal(endlessSettings.sessionHandLimit, 0, "unlimited practice clears a persisted finite session limit");
assert.equal(endless.pack.sessionLimitReached(1000), false);
const endlessHands = Array.from({ length: 12 }, (_, index) => endless.engine.createTable({
  id: 1,
  handNo: index + 1,
  settings: endlessSettings
}));
assert.deepEqual(
  endlessHands.map((table) => table.heroPosition),
  ["UTG", "LJ", "HJ", "CO", "BTN", "UTG", "LJ", "HJ", "CO", "BTN", "UTG", "LJ"]
);

const full = loadHarness("?embedded=1&practice=rfi-open&handMode=full");
const fullSettings = full.pack.applyBootSettings({});
const fullHand = full.engine.createTable({ id: 1, handNo: 1, settings: fullSettings });
assert.equal(full.pack.handMode(), "full");
assert.deepEqual(
  JSON.parse(JSON.stringify(fullHand.practiceScenario)),
  {
    defaultBeforeHero: { action: "fold" },
    afterHero: [{ position: "BB", action: "call" }],
    defaultAfterHero: { action: "fold" }
  },
  "full-hand mode guarantees a heads-up flop against the BB"
);
const fullOpenStart = full.engine.startHeroAction(fullHand, "raise-custom", fullSettings, { amount: 2 });
assert.equal(fullOpenStart.accepted, true);
full.engine.resolveBotAction(fullHand, fullOpenStart.heroAction, fullOpenStart.heroAmount, fullSettings);
assert.equal(fullHand.street, "flop", "full-hand mode always reaches the flop after Hero opens");
assert.equal(fullHand.status, "playing");
assert.equal(fullHand.seats.find((seat) => seat.position === "BB")?.folded, false, "BB is the guaranteed caller");

const fullActionControls = full.window.PokerSimulatorActionControls.model({
  getState: () => ({ settings: { tableCount: 1 } }),
  getTable: () => fullHand,
  windowRef: full.window,
  canHeroAct: () => true,
  betBounds: () => ({ min: 1, max: 38, step: 0.1, value: 2 }),
  betSliderModel: (_table, bounds) => ({ kind: "postflop-percent", ...bounds }),
  betPresets: () => [],
  formatAmount: (value) => `${value} BB`,
  formatCompactAmount: (value) => `${value} BB`,
  formatBetSliderValue: (_table, _bounds, value) => `${value} BB`,
  betSliderFillPercent: () => 0
});
const fullFlopTable = { ...fullHand, busy: false, heroTurn: true, status: "playing", toCall: 0, canCheck: true };
const fullFlopActions = fullActionControls.renderActions(fullFlopTable);
assert(fullFlopActions.includes("is-practice-simple"), "full-hand RFI keeps the simple practice contract after the flop opens");
assert(!fullFlopActions.includes("data-bet-widget"), "full-hand RFI postflop omits presets, stepper and slider");
assert.equal((fullFlopActions.match(/class="table-action /g) || []).length, 2, "checked-to RFI postflop exposes only Check and Bet");
for (const action of ["check", "bet-custom"]) assert(fullFlopActions.includes(`data-action="${action}"`), `${action} action stays available postflop`);

const fullFacingBetActions = fullActionControls.renderActions({ ...fullFlopTable, toCall: 1, canCheck: false });
assert(!fullFacingBetActions.includes("data-bet-widget"), "full-hand RFI facing a bet still omits the full betbox");
assert.equal((fullFacingBetActions.match(/class="table-action /g) || []).length, 3, "RFI postflop facing a bet exposes only Fold, Call and Raise");
for (const action of ["fold", "call", "raise-custom"]) assert(fullFacingBetActions.includes(`data-action="${action}"`), `${action} action stays available when facing a bet`);

const ordinaryFlopActions = fullActionControls.renderActions({ ...fullFlopTable, rfiOpenDrill: null });
assert(ordinaryFlopActions.includes("data-bet-widget"), "ordinary simulator postflop keeps the full sizing controls");

console.log("RFI simulator practice pack: ok");
