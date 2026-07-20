import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const assets = new URL("../../", import.meta.url);
const lessonHtml = readFileSync(new URL("../../../flop-cbet-hu-lesson.html", import.meta.url), "utf8");
const lessonCss = readFileSync(new URL("../lesson.css", import.meta.url), "utf8");
const context = { innerWidth: 1280 };
context.window = context;
context.globalThis = context;

for (const path of [
  "poker-kit/decks/deck-library.js",
  "poker-kit/chips/chip-library.js",
  "poker-simulator/simulator-board-render.js",
  "poker-simulator/simulator-seat-slots.js",
  "poker-simulator/simulator-seat-renderer.js",
  "poker-simulator/simulator-table-renderer.js",
  "poker-trainer-shell/simulator-snapshot.js"
]) {
  runInNewContext(readFileSync(new URL(path, assets), "utf8"), context, { filename: path });
}

const renderer = context.FFTrainerSimulatorSnapshot;
assert.ok(renderer?.renderTable, "shared simulator snapshot renderer is available");
for (const asset of [
  "assets/poker-kit/chips/chips.css",
  "assets/poker-simulator/simulator-table.css",
  "assets/poker-simulator/simulator-polish.css",
  "assets/poker-kit/trainer-ui-sanitizer.css"
]) {
  assert.match(lessonHtml, new RegExp(asset.replaceAll("/", "\\/")), `${asset} is loaded for the shared table`);
}
for (const selector of ["seat", "hero-cards", "board-cards", "dealer-button", "pot-label"]) {
  assert.doesNotMatch(
    lessonCss,
    new RegExp(`(?:^|\\n)\\s*\\.${selector}\\s*\\{`),
    `legacy .${selector} styles stay scoped away from the shared simulator`
  );
}

const seatOrder = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
const spot = {
  id: "cbet-room-contract",
  title: "A-high · сухая",
  hand: "Qs Js",
  question: "BB чекнул. Что делаешь?",
  answer: "Мелкий c-bet — базовый план.",
  table: {
    seats: seatOrder.map((label) => ({
      label,
      state: label === "BTN" ? "hero" : label === "BB" ? "waiting" : "folded",
      stackBb: label === "BTN" || label === "BB" ? 38 : label === "SB" ? 39.5 : 40
    })),
    heroPosition: "BTN",
    heroStack: "38 BB",
    effectiveStack: "38 BB",
    pot: "4.5 BB",
    anteBb: 0,
    heroCards: ["Qs", "Js"],
    boardCards: ["Ac", "7d", "2h"],
    street: "flop",
    actionLine: ["BB check"],
    historyLine: "UTG, HJ, CO и SB выбросили · BTN открыл 2 BB · BB заколлировал",
    toCall: 0,
    currentBet: 0,
    dealerPosition: "BTN"
  },
  options: [
    { key: "check", label: "Чек", correct: false },
    { key: "small", label: "С-бет 25–33%", correct: true },
    { key: "large", label: "С-бет 50–67%", correct: false }
  ]
};

const table = renderer.buildTable(spot, {});
assert.equal(table.street, "flop");
assert.equal(table.pot, 4.5);
assert.equal(table.toCall, 0);
assert.equal(table.currentBet, 0);
assert.deepEqual(Array.from(table.board), ["Ac", "7d", "2h"]);
const hero = table.seats.find((seat) => seat.isHero);
assert.deepEqual(Array.from(hero.cards), ["Qs", "Js"]);
assert.equal(hero.committedStreet, 0, "the preflop open is history, not a fresh flop bet");
assert.equal(table.seats.find((seat) => seat.position === "BB").folded, false);
assert.equal(table.seats.find((seat) => seat.position === "BB").botProfile.difficulty, "standard", "regular BB keeps the default blue tier");
assert.equal(hero.botProfile, null, "Hero never receives an opponent tier");

const before = renderer.renderTable(spot, {});
assert.match(before, /ff-shell-simulator-snapshot/);
assert.equal((before.match(/data-option-key=/g) || []).length, 3, "functional table owns exactly three action buttons");
for (const key of ["check", "small", "large"]) {
  assert.match(before, new RegExp(`data-option-key="${key}"`));
}
assert.doesNotMatch(before, /data-answer-state=/);

const wrong = renderer.renderTable(spot, { answered: true, selectedKey: "large" });
assert.match(wrong, /data-option-key="small"[^>]*data-answer-state="correct"/);
assert.match(wrong, /data-option-key="large"[^>]*data-answer-state="wrong"/);
assert.equal((wrong.match(/<button[^>]*data-option-key=[^>]* disabled/g) || []).length, 3, "all actions lock after feedback");

const correct = renderer.renderTable(spot, { answered: true, selectedKey: "small" });
assert.match(correct, /data-option-key="small"[^>]*data-answer-state="correct"/);
assert.doesNotMatch(correct, /data-answer-state="wrong"/);

const fishSpot = {
  ...spot,
  id: "cbet-room-fish-profile",
  table: {
    ...spot.table,
    seats: spot.table.seats.map((seat) => seat.label === "BB"
      ? { ...seat, botProfile: { difficulty: "easy", style: "fish", label: "Фиш" } }
      : seat)
  }
};
const fishTable = renderer.buildTable(fishSpot, {});
assert.equal(fishTable.seats.find((seat) => seat.position === "BB").botProfile.difficulty, "easy", "explicit fish profile survives shared snapshot normalization");
assert.match(renderer.renderTable(fishSpot, {}), /data-bot-tier="easy"[^>]*data-bot-style="fish"/, "fish BB renders through the shared green seat-box tier");

const strongValueSpot = {
  ...spot,
  title: "Бродвейная · топ-пара",
  hand: "As Kd",
  table: {
    ...spot.table,
    heroCards: ["As", "Kd"],
    boardCards: ["Kc", "Jh", "5d"]
  },
  options: spot.options.map((option) => ({
    ...option,
    acceptableExploit: option.key === "large"
  }))
};
const acceptable = renderer.renderTable(strongValueSpot, { answered: true, selectedKey: "large" });
assert.match(acceptable, /data-option-key="small"[^>]*data-answer-state="correct"/);
assert.match(acceptable, /data-option-key="large"[^>]*data-answer-state="alternative"/);
assert.doesNotMatch(acceptable, /data-option-key="large"[^>]*data-answer-state="wrong"/);

const mixedSpot = {
  ...strongValueSpot,
  options: strongValueSpot.options.map((option) => ({
    ...option,
    acceptableExploit: false,
    acceptableMix: option.key === "large"
  }))
};
const mixed = renderer.renderTable(mixedSpot, { answered: true, selectedKey: "large" });
assert.match(mixed, /data-option-key="large"[^>]*data-answer-state="alternative"/);
assert.match(mixed, /data-option-key="large"[^>]*aria-label="[^"]*допустимый смешанный вариант"/);
assert.match(mixed, /data-option-key="large"[\s\S]*?<span class="table-action-result-mark"[^>]*>Микс<\/span>/);
assert.doesNotMatch(mixed, /data-option-key="large"[^>]*data-answer-state="wrong"/);

console.log("flop c-bet shared room contract: ok");
