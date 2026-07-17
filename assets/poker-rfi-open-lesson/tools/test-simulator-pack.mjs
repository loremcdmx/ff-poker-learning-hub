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
assert.match(rfiPackCss, /\.client-controls\.is-rfi-opening\s*\{[^}]*min-height:0;/s, "fixed RFI actions collapse the reserved betbox height");
assert(rfiPackCss.includes('.client-controls.is-rfi-opening > .client-row .table-action'), "fixed RFI actions retain full-size button targets");

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

console.log("RFI simulator practice pack: ok");
