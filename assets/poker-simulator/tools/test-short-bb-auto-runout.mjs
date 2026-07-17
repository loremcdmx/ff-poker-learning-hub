import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Script, createContext } from "node:vm";
import { runSimulatorEngineScripts } from "../../../scripts/simulator-engine-script-list.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));

function loadEngine() {
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0.2;
  const context = createContext({
    console,
    Math: deterministicMath,
    window: {},
    globalThis: {}
  });
  const profileSource = readFileSync(
    join(root, "assets/poker-kit/simulator/bot-strategy-profile.js"),
    "utf8"
  );
  new Script(profileSource, { filename: "bot-strategy-profile.js" }).runInContext(context);
  runSimulatorEngineScripts({ root, context, Script });
  return context.window.PokerSimulatorEngine || context.globalThis.PokerSimulatorEngine;
}

const settings = {
  difficulty: "standard",
  botLineup: "single",
  playerCount: 2,
  simulationMode: "tournament",
  tournamentStartingStackBb: 100,
  tournamentLevelHands: 999,
  tournamentBlindLevels: "1",
  actionTimerSeconds: 0,
  anteBb: 0.1,
  bigBlindAnteBb: 0
};

function botProfile(label) {
  return { difficulty: "standard", style: "reg", label };
}

function headsUpCarryover(bbStack) {
  return {
    id: 1,
    handNo: 1,
    playerCount: 2,
    positions: ["SB", "BB"],
    status: "showdown",
    potAwarded: true,
    simulationMode: "tournament",
    blindLevel: 1,
    blindLevelIndex: 0,
    blindMultiplier: 1,
    seats: [
      {
        id: 0,
        name: "Hero",
        position: "BB",
        stack: 8,
        isHero: true,
        folded: false,
        dealer: false,
        blind: "BB",
        botProfile: null,
        lobbyState: "active"
      },
      {
        id: 1,
        name: "Ivan",
        position: "SB",
        stack: bbStack,
        isHero: false,
        folded: false,
        dealer: true,
        blind: "SB",
        botProfile: botProfile("short-bb"),
        lobbyState: "active"
      }
    ]
  };
}

function createHeadsUp(engine, bbStack) {
  return engine.createTable({
    id: 2,
    settings,
    handNo: 2,
    previousTable: headsUpCarryover(bbStack),
    tournamentHandNo: 2
  });
}

const engine = loadEngine();

// Exact production regression: both players post a 0.1 BB ante, Hero's 8 BB
// stack becomes 7.4 after the SB, and the 0.5 BB opponent has only 0.4 left
// for the BB. Hero already covers that all-in and must never receive a button.
const coveredShortBb = createHeadsUp(engine, 0.5);
assert.equal(coveredShortBb.heroPosition, "SB", "fixture seats Hero in the small blind");
assert.equal(coveredShortBb.status, "showdown", "covered short BB auto-runs to showdown");
assert.equal(coveredShortBb.heroTurn, false, "covered short BB does not leave a Hero decision");
assert.equal(coveredShortBb.toCall, 0, "covered short BB creates no synthetic call debt");
assert.equal(coveredShortBb.board.length, 5, "covered short BB receives a complete runout");
assert.equal(coveredShortBb.allInRunout?.startedAtStreet, "preflop", "runout starts preflop");
assert.equal(coveredShortBb.allInRunout?.refund?.seatId, 0, "the unmatched blind belongs to Hero");
assert.equal(coveredShortBb.allInRunout?.refund?.amount, 0.1, "the unmatched 0.1 BB is refunded");

// If the short BB still covers more than Hero's 0.5 blind, Hero should receive
// only the real difference, not the synthetic full-BB difference.
const uncoveredShortBb = createHeadsUp(engine, 0.9);
assert.equal(uncoveredShortBb.status, "playing", "an uncovered short BB still requires Hero action");
assert.equal(uncoveredShortBb.heroTurn, true, "Hero retains the decision against a 0.8 BB blind");
assert.equal(uncoveredShortBb.currentBet, 1, "the nominal full-BB bring-in remains intact");
assert.equal(uncoveredShortBb.toCall, 0.3, "Hero owes only 0.3 BB to cover the 0.8 BB all-in");
assert.equal(uncoveredShortBb.allInRunout, undefined, "the engine does not run out before Hero covers the bet");

// A live stack behind a short BB keeps the standard full-BB bring-in. This
// guards the fix from underpricing ordinary multiway preflop action.
const multiway = engine.createTable({
  id: 4,
  settings: { ...settings, playerCount: 3 },
  handNo: 2,
  tournamentHandNo: 2,
  previousTable: {
    ...headsUpCarryover(8),
    id: 3,
    playerCount: 3,
    positions: ["BTN", "SB", "BB"],
    seats: [
      { ...headsUpCarryover(8).seats[0], position: "SB", dealer: false, stack: 8 },
      { ...headsUpCarryover(8).seats[1], id: 1, position: "BB", dealer: false, stack: 8 },
      {
        id: 2,
        name: "Short BB",
        position: "BTN",
        stack: 0.5,
        isHero: false,
        folded: false,
        dealer: true,
        blind: "",
        botProfile: botProfile("multiway-short-bb"),
        lobbyState: "active"
      }
    ]
  }
});
assert.equal(multiway.heroPosition, "BTN", "multiway fixture puts Hero first to act");
assert.equal(multiway.status, "playing", "multiway short BB does not auto-run out");
assert.equal(multiway.currentBet, 1, "multiway action keeps the full 1 BB bring-in");
assert.equal(multiway.toCall, 1, "Hero still owes the full blind with a live stack behind");

console.log("Short BB auto-runout contract: ok");
