import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { model: tableLifecycleModel } = require("../simulator-table-lifecycle.js");

function completedTournamentTable(overrides = {}) {
  return {
    id: 1,
    status: "folded",
    simulationMode: "tournament",
    tournamentHandNo: 7,
    blindLevel: 1,
    blindMultiplier: 1,
    seats: [
      { id: 0, name: "Hero", isHero: true, stack: 42, lobbyState: "active" },
      { id: 1, name: "Ivan", isHero: false, stack: 91, lobbyState: "active" }
    ],
    ...overrides
  };
}

function continuityHarness({ trainingMode, previousTable = completedTournamentTable() }) {
  const calls = [];
  const state = {
    settings: {
      simulationMode: "tournament",
      trainingMode,
      pack: "basic-vpip",
      tableCount: 1,
      setupCompleted: true
    },
    tables: [previousTable],
    activeTableId: 1,
    handSeq: previousTable.handNo || previousTable.tournamentHandNo,
    history: []
  };
  const engine = {
    PACKS: { "basic-vpip": { spots: [{}] } },
    createTable(options) {
      calls.push(options);
      return {
        id: options.id,
        status: "playing",
        simulationMode: "tournament",
        tournamentHandNo: options.tournamentHandNo,
        carriedSeats: options.previousTable?.seats || null
      };
    }
  };
  const lifecycle = tableLifecycleModel({
    state,
    engine,
    isSupportedPack: () => true,
    heroBusted: (table) => Boolean(table?.heroBusted)
  });
  return { calls, lifecycle, state };
}

for (const trainingMode of [false, true]) {
  const { calls, lifecycle, state } = continuityHarness({ trainingMode });
  lifecycle.replaceTable(1);
  const engineCall = calls.at(-1);
  assert.equal(state.tables[0].tournamentHandNo, 8, "the MTT hand counter advances by one");
  assert.equal(
    engineCall.previousTable?.seats?.[0]?.stack,
    42,
    `MTT stacks carry into the next hand when review mode is ${trainingMode ? "on" : "off"}`
  );
  assert.equal(
    engineCall.previousTable?.seats?.[1]?.name,
    "Ivan",
    `MTT opponent composition carries into the next hand when review mode is ${trainingMode ? "on" : "off"}`
  );
}

{
  const previousTable = completedTournamentTable({ heroBusted: true });
  const { calls, lifecycle, state } = continuityHarness({ trainingMode: true, previousTable });
  lifecycle.replaceTable(1);
  assert.equal(state.tables[0].tournamentHandNo, 1, "a busted Hero starts a fresh tournament counter");
  assert.equal(calls.at(-1).previousTable, null, "a busted Hero does not carry a terminal tournament lineup");
}

console.log("Tournament review continuity contract: ok");
