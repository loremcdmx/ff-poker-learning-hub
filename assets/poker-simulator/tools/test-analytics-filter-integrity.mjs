import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const context = { console, globalThis: null };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(readFileSync(resolve(root, "assets/poker-simulator/simulator-analytics-ui.js"), "utf8"), context);

const nowMs = Date.now();
const now = new Date(nowMs).toISOString();
context.PokerSimulatorLeaderboardSeason = {
  label: "Сезон",
  startAt: new Date(nowMs - 3 * 86400000).toISOString(),
  endAt: new Date(nowMs + 3 * 86400000).toISOString(),
};
const state = {
  settings: { playerCount: 6, difficulty: "standard" },
  leaderboardFilters: { period: "season", players: "short", difficulty: "all", sort: "score" },
  leaderboardGraphPeriod: "season",
  leaderboardRemote: { status: "not-configured", fetchedAt: now, graphHands: { status: "idle", entries: [] } },
  leaderboardSync: { status: "not-configured" },
  leaderboardAuth: {},
  handLog: Array.from({ length: 6 }, (_, index) => ({
    id: `hand-${index}`,
    sessionId: "session-1",
    handNo: index + 1,
    tableId: "table-1",
    playedAt: now,
    settings: { playerCount: 6, difficulty: "standard" },
    result: { netBb: index % 2 ? -1 : 1 },
  })),
  history: [],
  leaderboard: [],
  sessionId: "session-1",
};

const fullRating = {
  score: 900,
  hands: 13,
  bb100: 12,
  qualified: false,
  neededHands: 7,
  qualificationHands: 20,
  qualificationProgress: 0.65,
  sampleWeight: 0.15,
  confidence: 0.15,
};
const emptyRating = {
  score: 0,
  hands: 0,
  bb100: 0,
  qualified: false,
  neededHands: 20,
  qualificationHands: 20,
  qualificationProgress: 0,
  sampleWeight: 0.08,
  confidence: 0,
};
const currentEntry = {
  id: "current-player",
  profile: { name: "Hero" },
  playerCount: 6,
  difficulty: "standard",
  metrics: { hands: 13 },
  rating: fullRating,
  sessionCount: 1,
};

const entryFilterCalls = [];
function leaderboardEntries(filters = {}) {
  entryFilterCalls.push({ ...filters });
  return filters.players === "full" ? [] : [currentEntry];
}

const analytics = context.PokerSimulatorAnalyticsUi.model({
  getState: () => state,
  currentSessionPayload: () => ({ sessionId: state.sessionId, history: state.history, handLog: state.handLog, settings: state.settings }),
  sessionMetrics: () => ({}),
  activeSimulatorProfile: () => ({ loggedIn: true, name: "Hero" }),
  leaderboardEntries,
  // Production deliberately falls back to the current unfiltered session so a
  // reload can still show the player's aggregate. The analytics UI must reject
  // that fallback when it is not present in the active facet.
  currentLeaderboardPlayerEntry: (entries) => entries.find((entry) => entry.id === currentEntry.id) || currentEntry,
  leaderboardRankFor: (entry, entries) => entry ? entries.indexOf(entry) + 1 : 0,
  leaderboardPlayerKey: (entry) => entry?.id || entry?.profile?.name || "",
  leaderboardRatingFromMetrics: (metrics) => Number(metrics?.hands || 0) ? fullRating : emptyRating,
  leaderboardDeleteTokenForEntry: () => "",
  sessionGraphKit: {
    buildSessionGraph: (entries) => ({ hands: entries.length, actualNetBb: 0, evNetBb: 0, points: entries }),
    renderSessionGraphSvg: () => '<svg aria-label="test graph"></svg>',
    renderSessionGraphLegend: () => "",
  },
  roundBbMetric: (value) => Math.round(Number(value || 0) * 10) / 10,
  emptyRateStat: () => ({ made: 0, opportunities: 0, rate: 0 }),
  botLabKit: {},
  botLabBandSettings: {},
  streetLabel: (value) => String(value),
  simulationModeLabel: (value) => String(value),
  escapeHtml: (value) => String(value ?? ""),
  formatDecisionDuration: (value) => String(value ?? ""),
});

const seasonHtml = analytics.renderLeaderboard();
assert.match(seasonHtml, /Неделя · 6 рук/);
assert.match(seasonHtml, /Сезон · 6 рук/);
assert.doesNotMatch(seasonHtml, /Сезон · 13 рук/, "period menu cannot mix plotted week hands with aggregate season hands");

const archivedShortHands = state.handLog.map((entry) => ({ ...entry }));
state.settings = { playerCount: 7, difficulty: "standard" };
state.handLog = [];
state.history = Array.from({ length: 5 }, (_, index) => ({
  id: `current-full-${index}`,
  sessionId: "current-full-session",
  handNo: index + 1,
  tableId: "full-table",
  playedAt: now,
  settings: { playerCount: 7, difficulty: "standard" },
  result: { netBb: 1 },
}));
state.leaderboardRemote.graphHands = {
  status: "ready",
  fetchedAt: now,
  playerKey: "Hero",
  entries: archivedShortHands,
};
const mixedFacetHtml = analytics.renderLeaderboard();
const mixedFacetCard = mixedFacetHtml.match(/<section class="leaderboard-current[^"]*"[\s\S]*?<\/section>/)?.[0] || "";
assert.match(mixedFacetCard, /в выбранном фильтре/, "an archived 6-max slice remains visible while the live session is 7-max");
assert.match(mixedFacetCard, /\+6 рук/, "the badge counts only hands inside the selected short-handed facet");
assert.doesNotMatch(mixedFacetCard, /\+5 рук/, "the live 7-max hand count cannot leak into the 6-max card");
assert.doesNotMatch(mixedFacetCard, /текущая сессия/, "the badge cannot label an off-facet live session as current");

state.settings = { playerCount: 6, difficulty: "standard" };
state.handLog = archivedShortHands;
state.history = [];
state.leaderboardRemote.graphHands = { status: "idle", entries: [] };

state.leaderboardFilters.players = "full";
const filteredHtml = analytics.renderLeaderboard();
assert.equal(entryFilterCalls.at(-1)?.players, "full", "the selected table-size facet reaches the entry query");
const currentCard = filteredHtml.match(/<section class="leaderboard-current[^"]*"[\s\S]*?<\/section>/)?.[0] || "";
assert(currentCard, "current-result card is rendered");
assert.match(currentCard, /Нет результата в этом срезе/, "current result becomes an explicit empty state outside the selected table-size facet");
assert.doesNotMatch(currentCard, />13<\//, "current result never falls back to an unfiltered cached score");
assert.match(filteredHtml, /Неделя · 0 рук/);
assert.match(filteredHtml, /Сезон · 0 рук/);
assert.doesNotMatch(filteredHtml, /<svg aria-label="test graph"><\/svg>/, "graph honors the same active table-size facet as the current-result card");

console.log("simulator analytics filter integrity: ok");
