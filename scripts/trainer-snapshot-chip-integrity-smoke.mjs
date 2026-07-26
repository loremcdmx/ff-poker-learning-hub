import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Script, createContext } from "node:vm";
import { fileURLToPath } from "node:url";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = readFileSync(resolve(repo, "assets/poker-trainer-shell/simulator-snapshot.js"), "utf8");
const window = { innerWidth: 1280 };
const runtime = createContext({ window, globalThis: window });
new Script(source, { filename: "simulator-snapshot.js" }).runInContext(runtime);

const { buildTable } = window.FFTrainerSimulatorSnapshot;
const positions = ["UTG", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
const startingStack = 32;

function spot({
  heroPosition,
  pot,
  actions = [],
  seats = null,
  effectiveStack = startingStack,
  heroStack = effectiveStack,
  street = "preflop",
  boardCards = [],
  anteBb = 1,
  anteMode = "bb",
  historyLine = ""
}) {
  return {
    table: {
      seats: seats || positions.map((label) => ({
        label,
        state: label === heroPosition ? "hero" : /^(SB|BB)$/.test(label) ? "blind" : "waiting",
        stackBb: startingStack
      })),
      heroPosition,
      heroStack: `${heroStack} BB`,
      effectiveStack: `${effectiveStack} BB`,
      pot: `${pot} BB`,
      anteBb,
      anteMode,
      heroCards: ["As", "Kd"],
      boardCards,
      street,
      actionLine: actions,
      historyLine,
      toCall: 0,
      currentBet: 0,
      dealerPosition: "BTN"
    }
  };
}

function seat(table, position) {
  const found = table.seats.find((row) => row.position === position);
  assert(found, `missing ${position} seat`);
  return found;
}

function assertChipIntegrity(table, initialTotal, label) {
  const visibleStacks = table.seats.reduce((total, row) => total + row.stack, 0);
  assert(Math.abs(visibleStacks + table.pot - initialTotal) < 0.000001, `${label}: visible stacks plus pot conserve all chips`);
}

const unopened = buildTable(spot({
  heroPosition: "SB",
  pot: 2.5,
  actions: ["UTG fold", "LJ fold", "HJ fold", "CO fold", "BTN fold"]
}), {});
assert.equal(unopened.pot, 2.5, "unopened BB-ante pot is 2.5 BB");
assert.equal(seat(unopened, "SB").stack, 31.5, "SB posts only its 0.5 BB blind");
assert.equal(seat(unopened, "BB").stack, 30, "BB posts the 1 BB blind and 1 BB ante");
assert.equal(seat(unopened, "BB").committedStreet, 1, "ante does not inflate the visible BB blind marker");
assert.equal(seat(unopened, "BB").postedAnte, 1, "BB owns the ante contribution");
assertChipIntegrity(unopened, positions.length * startingStack, "unopened");

const tableAnteUnopened = buildTable(spot({
  heroPosition: "SB",
  pot: 2.5,
  anteMode: "table",
  actions: ["UTG fold", "LJ fold", "HJ fold", "CO fold", "BTN fold"]
}), {});
const seatAnte = 1 / positions.length;
assert.equal(tableAnteUnopened.pot, 2.5, "unopened table-ante pot remains 2.5 BB");
assert(Math.abs(seat(tableAnteUnopened, "UTG").stack - (startingStack - seatAnte)) < 0.000001, "every ordinary seat posts its share of the table ante");
assert(Math.abs(seat(tableAnteUnopened, "SB").stack - (startingStack - 0.5 - seatAnte)) < 0.000001, "SB posts its blind and its share of the table ante");
assert(Math.abs(seat(tableAnteUnopened, "BB").stack - (startingStack - 1 - seatAnte)) < 0.000001, "BB posts its blind and only its share of the table ante");
assert(tableAnteUnopened.seats.every((row) => Math.abs(row.postedAnte - seatAnte) < 0.000001), "the total table ante is distributed across every seat");
assert.equal(seat(tableAnteUnopened, "BB").committedStreet, 1, "table ante does not inflate the visible BB blind marker");
assertChipIntegrity(tableAnteUnopened, positions.length * startingStack, "unopened table ante");

const oneRaiser = buildTable(spot({
  heroPosition: "CO",
  pot: 4.5,
  actions: ["UTG fold", "LJ fold", "HJ raise 2 BB"]
}), {});
assert.equal(oneRaiser.pot, 4.5, "one-raiser BB-ante pot is 4.5 BB");
assert.equal(seat(oneRaiser, "HJ").stack, 30, "opener posts exactly the 2 BB raise");
assert.equal(seat(oneRaiser, "SB").stack, 31.5, "one-raiser SB posts only its blind");
assert.equal(seat(oneRaiser, "BB").stack, 30, "one-raiser BB posts blind plus ante");
assertChipIntegrity(oneRaiser, positions.length * startingStack, "one raiser");

const bbCall = buildTable(spot({
  heroPosition: "CO",
  pot: 5.5,
  actions: ["BTN raise 2 BB", "BB call"]
}), {});
assert.equal(seat(bbCall, "BB").committedStreet, 2, "BB call replaces, rather than adds to, the posted blind");
assert.equal(seat(bbCall, "BB").stack, 29, "BB call deducts 2 BB total plus the separate 1 BB ante");
assertChipIntegrity(bbCall, positions.length * startingStack, "BB call");

const postflopSeats = positions.map((label) => ({
  label,
  state: label === "BB" ? "hero" : label === "BTN" ? "waiting" : "folded",
  // Postflop sources expose the already-visible stack. The shared renderer
  // must keep the preflop open/call/BB-ante in history instead of charging it
  // again on the flop.
  stackBb: label === "BTN" ? 30 : label === "BB" ? 29 : label === "SB" ? 31.5 : 32
}));
const postflopHistory = buildTable(spot({
  heroPosition: "BB",
  heroStack: 29,
  pot: 5.5,
  seats: postflopSeats,
  street: "flop",
  boardCards: ["Ac", "7d", "2h"],
  actions: ["BB check"],
  historyLine: "BTN открыл 2 BB · BB заколлировал · BB ante 1 BB"
}), {});
assert.equal(postflopHistory.pot, 5.5, "postflop pot preserves the full preflop blind, ante, open and call history");
assert.equal(seat(postflopHistory, "BTN").stack, 30, "postflop opener is not charged a second time");
assert.equal(seat(postflopHistory, "BB").stack, 29, "postflop BB call and ante remain deducted exactly once");
assert.equal(seat(postflopHistory, "BB").committedStreet, 0, "historical preflop money never becomes a fresh flop bet");
assertChipIntegrity(postflopHistory, positions.length * startingStack, "postflop history");

const legacySeats = positions.map((label) => ({
  label,
  state: label === "UTG" ? "hero" : /^(SB|BB)$/.test(label) ? "blind" : "waiting",
  stackBb: label === "BB" ? 31 : 32
}));
const legacy = buildTable(spot({ heroPosition: "UTG", pot: 2.5, seats: legacySeats }), {});
assert.equal(seat(legacy, "BB").stack, 30, "legacy ante-adjusted BB stack is not charged twice");
assert.equal(seat(legacy, "BB").postedAnte, 0, "legacy pre-deduction remains explicit in source stack");
assertChipIntegrity(legacy, positions.length * startingStack, "legacy ante-adjusted source");

const legacyHeroSeats = legacySeats.map((row) => ({
  ...row,
  state: row.label === "BB" ? "hero" : row.state === "hero" ? "waiting" : row.state
}));
const legacyHero = buildTable(spot({
  heroPosition: "BB",
  heroStack: 31,
  effectiveStack: 32,
  pot: 4.5,
  actions: ["BTN raise 2 BB"],
  seats: legacyHeroSeats
}), {});
assert.equal(seat(legacyHero, "BB").stack, 30, "legacy hero BB also avoids a second ante deduction");
assert.equal(seat(legacyHero, "BB").postedAnte, 0, "legacy hero BB keeps the pre-deducted ante contract");
assertChipIntegrity(legacyHero, positions.length * startingStack, "legacy ante-adjusted hero BB");

for (const asset of [
  "assets/poker-rfi-open-lesson/data.js",
  "assets/poker-bb-call-defense-lesson/range-data.js",
  "assets/poker-bb-call-defense-lesson/data.js",
  "assets/poker-vs-3bet-defense-lesson/data/vs3bet-field-data.js",
  "assets/poker-vs-3bet-defense-lesson/range-model.js",
  "assets/poker-vs-3bet-defense-lesson/data.js"
]) {
  new Script(readFileSync(resolve(repo, asset), "utf8"), { filename: asset }).runInContext(runtime);
}

const rfiLiveSpot = window.PokerRfiData?.firstSpot;
assert(rfiLiveSpot, "the live RFI intro spot is available for chip-integrity validation");
const rfiLiveTable = buildTable(rfiLiveSpot, {});
assert.equal(rfiLiveTable.pot, 2.5, "live RFI BANK includes both blinds and the BB ante");
assertChipIntegrity(rfiLiveTable, 7 * 40, "live RFI intro");

const bbLiveSpot = window.PokerBbCallData?.firstSpot;
assert(bbLiveSpot, "the live BB-defense intro spot is available for chip-integrity validation");
const bbLiveTable = buildTable(bbLiveSpot, {});
assert.equal(bbLiveTable.pot, 4.5, "live BB-defense BANK includes the 2x open, both blinds and the BB ante");
assertChipIntegrity(bbLiveTable, 7 * Number.parseFloat(bbLiveSpot.table.effectiveStack), "live BB-defense intro");

const vs3LiveSpots = [
  window.FF_POKER_FIELD_LESSON_DATA?.intro,
  window.FF_POKER_FIELD_LESSON_DATA?.practice?.[0],
  window.FF_POKER_FIELD_LESSON_DATA?.practice?.find((item) => item.practiceMeta?.villainPosition === "BB")
];
for (const [index, liveSpot] of vs3LiveSpots.entries()) {
  assert(liveSpot, `live vs-3bet spot ${index + 1} is available for chip-integrity validation`);
  const liveTable = buildTable(liveSpot, {});
  const liveStartingStack = Number.parseFloat(liveSpot.table.effectiveStack);
  assertChipIntegrity(liveTable, liveSpot.table.seats.length * liveStartingStack, `live vs-3bet spot ${index + 1}`);
}

new Script(
  readFileSync(resolve(repo, "assets/poker-flop-checkraise-lesson/data.js"), "utf8"),
  { filename: "flop-checkraise-data.js" }
).runInContext(runtime);
const checkraiseSpot = window.FF_POKER_FIELD_LESSON_DATA?.intro;
assert(checkraiseSpot, "the live check-raise intro spot is available for chip-integrity validation");
const checkraiseTable = buildTable(checkraiseSpot, {});
const checkraiseInitialTotal = checkraiseSpot.table.seats.reduce(
  (total, row) => total + Number(row.startingStackBb),
  0
);
assert.equal(checkraiseTable.pot, 7.7, "check-raise pot includes blinds, BB ante, preflop open/call and the facing flop bet");
assert.equal(checkraiseInitialTotal, 6 * 40, "check-raise seats declare the real 40 BB hand-start stacks");
assert.equal(seat(checkraiseTable, "BB").stack, 36.8, "Hero's stack includes the BB ante and completed preflop call");
assert.equal(seat(checkraiseTable, "BTN").stack, 36, "the opener's preflop raise and current flop bet are deducted exactly once");
assert.equal(seat(checkraiseTable, "SB").stack, 39.5, "the folded small blind keeps its posted contribution deducted");
assertChipIntegrity(checkraiseTable, checkraiseInitialTotal, "live check-raise intro");

console.log("✓ trainer snapshot ante chip integrity passed");
