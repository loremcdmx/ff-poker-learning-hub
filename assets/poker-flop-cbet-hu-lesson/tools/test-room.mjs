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

console.log("flop c-bet shared room contract: ok");
