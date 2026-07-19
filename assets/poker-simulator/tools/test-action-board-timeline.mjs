import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script, createContext } from "node:vm";
import { runSimulatorEngineScripts } from "../../../scripts/simulator-engine-script-list.mjs";

const simulatorRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(simulatorRoot, "../..");

globalThis.window = globalThis;
await import("../simulator-action-visuals.js");
await import("../simulator-board-render.js");
delete globalThis.window;

const durations = {
  heroActionRevealDurationMs: 40,
  heroActionSettleDurationMs: 10,
  foldThinkDurationMs: 50,
  foldActionRevealDurationMs: 80,
  foldActionSettleDurationMs: 20,
  passiveThinkDurationMs: 60,
  passiveActionRevealDurationMs: 90,
  passiveActionSettleDurationMs: 20,
  chipAnnouncementDelayMs: 10,
  passiveChipFlightDurationMs: 40,
  betMarkerSettleDurationMs: 10,
  boardRevealDurationMs: 100,
  boardSettleDurationMs: 25
};

const table = {
  board: ["As", "7d", "6h"],
  boardRevealFrom: 0,
  actionSequenceLeadMs: 0,
  actionAnimations: [
    { key: "hero-open", seatId: 0, label: "Raise to 2", tone: "aggressive", street: "preflop", boardLength: 0, isHeroAction: true },
    { key: "lj-fold", seatId: 1, label: "Fold", tone: "fold", street: "preflop", boardLength: 0 },
    { key: "hj-fold", seatId: 2, label: "Fold", tone: "fold", street: "preflop", boardLength: 0 },
    { key: "co-fold", seatId: 3, label: "Fold", tone: "fold", street: "preflop", boardLength: 0 },
    { key: "btn-fold", seatId: 4, label: "Fold", tone: "fold", street: "preflop", boardLength: 0 },
    { key: "sb-fold", seatId: 5, label: "Fold", tone: "fold", street: "preflop", boardLength: 0 },
    { key: "bb-call", seatId: 6, label: "Call 2", tone: "passive", street: "preflop", boardLength: 3 }
  ]
};

const actionVisuals = globalThis.PokerSimulatorActionVisuals.model({
  durations,
  getSettings: () => ({ handTempo: "calm" }),
  isActionSequenceActive: () => true,
  windowRef: { matchMedia: () => ({ matches: false }) }
});

const stages = actionVisuals.actionSequenceBoardRevealStages(table, { elapsedMs: 0, leadMs: 0 });
assert.equal(stages.length, 1, "ordinary preflop to flop play has one board-reveal stage");
assert.equal(stages[0].from, 0);
assert.equal(stages[0].to, 3);
const closingActionTiming = actionVisuals.actionTimingAtIndex(table, table.actionAnimations.length - 1, {
  elapsedMs: 0,
  leadMs: 0
});
assert(stages[0].startMs >= closingActionTiming.endMs, "flop barrier starts after the BB call animation completes");

const beforeClosingActionFinishes = actionVisuals.actionSequenceBoardRevealState(table, {
  elapsedMs: stages[0].startMs - 1,
  leadMs: 0
});
assert(beforeClosingActionFinishes, "a single board stage remains owned by the action timeline");
assert.equal(beforeClosingActionFinishes.visibleLength, 0, "flop stays hidden before the closing action finishes");
assert.equal(beforeClosingActionFinishes.renderableLength, 0, "flop is not mounted on the legacy CSS-delay path");

const asRevealStarts = actionVisuals.actionSequenceBoardRevealState(table, {
  elapsedMs: stages[0].startMs,
  leadMs: 0
});
assert.equal(asRevealStarts.visibleLength, 0);
assert.equal(asRevealStarts.renderableLength, 3, "flop mounts only when its shared reveal stage begins");
assert.equal(asRevealStarts.revealing, true);

const afterReveal = actionVisuals.actionSequenceBoardRevealState(table, {
  elapsedMs: stages[0].revealEndMs,
  leadMs: 0
});
assert.equal(afterReveal.visibleLength, 3, "flop becomes visible after the reveal animation");

const boardBefore = globalThis.PokerSimulatorBoardRender.model({
  actionSequenceBoardRevealState: () => beforeClosingActionFinishes,
  visibleBoardLength: () => table.board.length,
  renderCard: (card) => `<i>${card}</i>`
}).renderBoard(table);
assert.equal(boardBefore, "", "renderer cannot expose future board cards while preflop actions are playing");

const boardAtReveal = globalThis.PokerSimulatorBoardRender.model({
  actionSequenceBoardRevealState: () => asRevealStarts,
  visibleBoardLength: () => table.board.length,
  boardRevealMs: () => durations.boardRevealDurationMs,
  renderCard: (card) => `<i>${card}</i>`
}).renderBoard(table);
assert.equal((boardAtReveal.match(/board-card-wrap/g) || []).length, 3, "renderer mounts the three flop cards at the barrier");
assert(boardAtReveal.includes("is-board-dealt"), "flop still receives its normal reveal animation");

const timerSource = readFileSync(resolve(simulatorRoot, "simulator-visual-timers.js"), "utf8");
assert(!timerSource.includes("stages.length <= 1"), "single-stage board timelines receive scheduled start/reveal/settle paints");

function loadRfiFullHandEngine() {
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0.2;
  const browserRoot = { location: { search: "?practice=rfi-open&handMode=full" } };
  const context = createContext({
    console,
    Math: deterministicMath,
    URL,
    URLSearchParams,
    window: browserRoot,
    globalThis: browserRoot
  });
  const run = (path) => {
    const filename = resolve(repoRoot, path);
    new Script(readFileSync(filename, "utf8"), { filename }).runInContext(context);
  };
  run("assets/poker-kit/simulator/bot-strategy-profile.js");
  runSimulatorEngineScripts({ root: repoRoot, context, Script });
  run("assets/poker-simulator/simulator-practice-packs.js");
  run("assets/poker-rfi-open-lesson/simulator-pack.js");
  return {
    engine: browserRoot.PokerSimulatorEngine,
    pack: browserRoot.PokerRfiOpenSimulatorPack
  };
}

function assertRfiFullHandBarrier(engine, pack, handNo, expectedPosition) {
  const settings = {};
  pack.applyBootSettings(settings);
  const liveTable = engine.createTable({ id: handNo, settings, handNo });
  assert.equal(liveTable.heroPosition, expectedPosition, `${expectedPosition} fixture reaches its real RFI opening spot`);
  assert.equal(liveTable.street, "preflop");
  assert.equal(liveTable.heroTurn, true);

  const heroResult = engine.startHeroAction(liveTable, "raise-custom", settings, { amount: 2 });
  assert.equal(heroResult.accepted, true, `${expectedPosition} open is accepted by the engine`);
  assert.equal(heroResult.needsBot, true);
  const botResult = engine.resolveBotAction(liveTable, heroResult.heroAction, heroResult.heroAmount, settings);
  assert.equal(botResult.accepted, true);
  assert.equal(liveTable.street, "flop", `${expectedPosition} full-hand scenario advances through the real engine`);
  assert.equal(liveTable.board.length, 3);

  const actions = liveTable.actionAnimations || [];
  const closingPreflopIndex = actions.findLastIndex((item) => String(item?.street || "") === "preflop");
  const firstPostflopIndex = actions.findIndex((item) => String(item?.street || "") === "flop");
  assert(closingPreflopIndex >= 0, `${expectedPosition} trace contains a closing preflop action`);
  assert(firstPostflopIndex > closingPreflopIndex, `${expectedPosition} trace contains a postflop action after preflop closes`);

  liveTable.boardRevealFrom = 0;
  liveTable.actionSequenceLeadMs = 0;
  const liveStages = actionVisuals.actionSequenceBoardRevealStages(liveTable, { elapsedMs: 0, leadMs: 0 });
  const flopStage = liveStages.find((stage) => stage.from === 0 && stage.to === 3);
  assert(flopStage, `${expectedPosition} trace owns its flop on the shared action clock`);
  const closingPreflopTiming = actionVisuals.actionTimingAtIndex(liveTable, closingPreflopIndex, {
    elapsedMs: 0,
    leadMs: 0
  });
  const firstPostflopTiming = actionVisuals.actionTimingAtIndex(liveTable, firstPostflopIndex, {
    elapsedMs: 0,
    leadMs: 0
  });
  assert(
    flopStage.startMs >= closingPreflopTiming.endMs,
    `${expectedPosition} flop starts only after the closing preflop animation`
  );
  assert(
    firstPostflopTiming.actionStartMs >= flopStage.endMs,
    `${expectedPosition} postflop action starts only after the flop settles`
  );
}

const rfiFullHand = loadRfiFullHandEngine();
assertRfiFullHandBarrier(rfiFullHand.engine, rfiFullHand.pack, 1, "UTG");
assertRfiFullHandBarrier(rfiFullHand.engine, rfiFullHand.pack, 5, "BTN");

console.log("✓ shared action-to-board barrier covers synthetic and real RFI full-hand transitions");
