import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const repo = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const read = (path) => readFileSync(resolve(repo, path), "utf8");
const require = createRequire(import.meta.url);
const { model: handCompletionModel } = require("../simulator-hand-completion.js");
require("../simulator-leaderboard.js");
const { model: sessionLeaderboardModel } = require("../simulator-session-leaderboard.js");
const { model: sessionArchiveModel } = require("../simulator-session-archive.js");
const leaderboardKit = globalThis.PokerSimulatorLeaderboard;

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); }
  };
}

function handEntry(handNo, text = "") {
  return {
    id: `session:${handNo}:1`,
    sessionId: "session",
    handNo,
    tableId: 1,
    playedAt: "2026-07-22T00:00:00.000Z",
    text,
    result: { outcome: "fold", folded: true, pot: 2.5, netBb: -0.5 },
    handHistory: { handNo, tableId: 1, sessionId: "session", actions: [] }
  };
}

function handWindow(fetchImpl) {
  const storage = memoryStorage();
  const timers = new Map();
  let nextTimer = 1;
  return {
    FF_SIMULATOR_HAND_SYNC_ENABLED: true,
    localStorage: storage,
    fetch: fetchImpl,
    console,
    document: { visibilityState: "visible" },
    addEventListener() {},
    setTimeout(callback) { const id = nextTimer++; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    storage,
    timers
  };
}

function handModel(windowRef, options = {}) {
  return handCompletionModel({
    windowRef,
    getState: () => ({ settings: {} }),
    activeSimulatorProfile: () => ({ id: "player-1", loggedIn: true, name: "Player" }),
    handLogEndpoint: "/api/simulator-sessions",
    nowIso: () => "2026-07-22T00:00:00.000Z",
    ...options
  });
}

{
  let fetches = 0;
  const windowRef = handWindow(async () => { fetches += 1; });
  windowRef.FF_STATIC_LEARNING_HUB = true;
  const completion = handModel(windowRef);
  assert.equal(completion.trySendHandLogToBackend(handEntry(1)), false, "static simulator keeps hand sync local-only");
  assert.equal((await completion.flushHandSyncOutbox()).suppressed, true);
  assert.equal(fetches, 0, "static simulator never probes an absent hand-sync endpoint");
}

{
  let fetches = 0;
  const windowRef = handWindow(async () => {
    fetches += 1;
    return { ok: false, status: 404, json: async () => ({}) };
  });
  const completion = handModel(windowRef);
  assert.equal(completion.trySendHandLogToBackend(handEntry(1)), true, "first authenticated hand enters sync");
  const result = await completion.flushHandSyncOutbox();
  assert.equal(fetches, 1, "missing endpoint is probed once");
  assert.equal(result.reason, "http_404", "404 terminalizes the transport");
  assert.equal(windowRef.storage.getItem("ff.poker.table-simulator.hand-sync-outbox.v1"), null, "terminal 404 clears the sync-only outbox");
  assert.equal(completion.trySendHandLogToBackend(handEntry(2)), false, "disabled hand sync does not enqueue later hands");
  await completion.flushHandSyncOutbox();
  assert.equal(fetches, 1, "disabled hand sync never retries the missing endpoint");
}

{
  let fetches = 0;
  const windowRef = handWindow(async () => {
    fetches += 1;
    throw new Error("offline");
  });
  const completion = handModel(windowRef, { handSyncMaxAttempts: 2 });
  completion.trySendHandLogToBackend(handEntry(1));
  await completion.flushHandSyncOutbox();
  assert.equal(JSON.parse(windowRef.storage.getItem("ff.poker.table-simulator.hand-sync-outbox.v1"))[0].attempts, 1);
  await completion.flushHandSyncOutbox();
  assert.equal(fetches, 2, "transient transport observes the attempt cap");
  assert.equal(windowRef.storage.getItem("ff.poker.table-simulator.hand-sync-outbox.v1"), null, "max-attempt item is evicted");
  assert.equal(windowRef.timers.size, 0, "retry timer is cancelled when the bounded queue empties");
}

{
  const windowRef = handWindow(undefined);
  const completion = handModel(windowRef, { handSyncOutboxLimit: 3, handSyncOutboxMaxBytes: 16_384 });
  for (let handNo = 1; handNo <= 8; handNo += 1) completion.trySendHandLogToBackend(handEntry(handNo, "x".repeat(400)));
  const serialized = windowRef.storage.getItem("ff.poker.table-simulator.hand-sync-outbox.v1") || "[]";
  assert(JSON.parse(serialized).length <= 3, "hand sync outbox obeys its item cap");
  assert(serialized.length * 2 <= 16_384, "hand sync outbox obeys its conservative byte cap");
}

function leaderboardContext({ staticBuild = true, backendEnabled = false } = {}) {
  const storage = memoryStorage();
  const profile = { id: "player-1", name: "Regular", loggedIn: true, authenticated: true };
  const localEntry = leaderboardKit.normalizeLeaderboardEntry({
    id: "player-1:older-session",
    sessionId: "older-session",
    source: "archive",
    updatedAt: "2026-07-21T00:00:00.000Z",
    profile,
    metrics: { hands: 100, netBb: 12, evNetBb: 10, evBb100: 10 }
  });
  const state = {
    sessionId: "current-session",
    settings: { simulationMode: "tournament", tableCount: 1, playerCount: 7, difficulty: "standard" },
    handLog: [],
    leaderboard: [localEntry],
    leaderboardRemote: { entries: [], status: "idle", message: "", fetchedAt: "", configured: false },
    leaderboardSync: { status: "idle", lastHands: 0, lastAttemptAt: 0 },
    leaderboardFilters: { period: "all", players: "all", difficulty: "all", query: "", sort: "score" }
  };
  storage.setItem("leaderboard", JSON.stringify([localEntry]));
  let fetches = 0;
  const windowRef = {
    FF_STATIC_LEARNING_HUB: staticBuild,
    FF_SIMULATOR_LEADERBOARD_BACKEND_ENABLED: backendEnabled,
    location: { origin: "https://example.test" },
    fetch: async () => {
      fetches += 1;
      return { ok: false, status: 404, json: async () => ({ configured: false }) };
    }
  };
  const leaderboard = sessionLeaderboardModel({
    leaderboardKit,
    storage,
    keys: { leaderboard: "leaderboard" },
    windowRef,
    currentState: () => state,
    activeSimulatorProfile: () => profile,
    cachedPokerStats: () => ({ hands: 10, wins: 4, netBb: 1, evNetBb: 1, evBb100: 10 }),
    cachedDecisionStats: () => ({ decisions: 4, good: 3, leaks: 1, score: 75 }),
    sessionMetrics: () => ({}),
    defaultSessionArchiveEndpoint: "/api/simulator-sessions",
    leaderboardLimit: 100
  });
  return { leaderboard, state, localEntry, fetches: () => fetches };
}

{
  const { leaderboard, state, localEntry, fetches } = leaderboardContext();
  assert.equal(leaderboard.leaderboardBackendEnabled(), false);
  assert.equal(await leaderboard.refreshRemoteLeaderboard({ prefetch: true }), false);
  assert.equal(await leaderboard.refreshRemotePlayerStats(), false);
  assert.equal(await leaderboard.refreshRemoteGraphHands(), false);
  assert.equal(await leaderboard.syncCurrentLeaderboardSnapshot({ force: true }), false);
  assert.equal(fetches(), 0, "static leaderboard never probes the absent simulator-sessions endpoint");
  assert.equal(state.leaderboardRemote.status, "not-configured");
  assert(
    leaderboard.leaderboardEntries().some((entry) => entry.profile?.id === localEntry.profile.id),
    "local leaderboard rows remain available"
  );
  assert.equal(await leaderboard.deleteCurrentLeaderboardEntry({ entry: localEntry }), true);
  assert.equal(leaderboard.loadLeaderboardData().length, 0, "local leaderboard rows can be deleted without a backend");
  assert.equal(fetches(), 0, "local leaderboard deletion also stays offline");
}

{
  const { leaderboard, fetches } = leaderboardContext({ backendEnabled: true });
  assert.equal(leaderboard.leaderboardBackendEnabled(), true, "future static deployments can opt in explicitly");
  assert.equal(await leaderboard.refreshRemoteLeaderboard({ prefetch: true }), false);
  assert.equal(fetches(), 1, "explicit leaderboard backend opt-in preserves the remote request path");
}

function archiveContext({ staticBuild = true, backendEnabled = false } = {}) {
  const storage = memoryStorage();
  const state = { sessionId: "archive-session" };
  const session = {
    sessionId: "archive-session",
    settings: { simulationMode: "tournament", tableCount: 1, playerCount: 7, difficulty: "standard" },
    handLog: [handEntry(1)],
    history: [],
    decisions: [],
    foldAnyEvents: []
  };
  let fetches = 0;
  let lastMethod = "";
  const windowRef = {
    FF_STATIC_LEARNING_HUB: staticBuild,
    FF_SIMULATOR_SESSION_BACKEND_ENABLED: backendEnabled,
    fetch: async (_endpoint, options = {}) => {
      fetches += 1;
      lastMethod = String(options.method || "GET");
      return { ok: true, status: 200, json: async () => ({ stored: true }) };
    }
  };
  const archive = sessionArchiveModel({
    storage,
    keys: { sessionArchive: "session-archive" },
    windowRef,
    currentState: () => state,
    normalizeSessionPayload: (payload) => payload && Array.isArray(payload.handLog) ? payload : null,
    currentSessionPayload: () => session,
    sessionMetrics: (payload) => ({ hands: payload?.handLog?.length || 0, netBb: 1 }),
    activeSimulatorProfile: () => ({ id: "player-1", name: "Regular", loggedIn: true }),
    sanitizeProfileSnapshot: (profile) => ({ ...profile }),
    compactSessionMetrics: (metrics) => ({ ...metrics }),
    leaderboardEntryFromArchive: (record) => ({ id: record.id, profile: record.profile, metrics: record.metrics }),
    simulatorArchiveEndpoint: () => "/api/simulator-sessions",
    aggregateArchiveTotals: (records) => ({ sessions: records.length }),
    nowIso: () => "2026-07-22T00:00:00.000Z",
    sessionArchiveLimit: 60
  });
  return { archive, storage, fetches: () => fetches, lastMethod: () => lastMethod };
}

{
  const { archive, fetches } = archiveContext();
  assert.equal(archive.sessionArchiveBackendEnabled(), false);
  const finalized = archive.archiveCurrentSession("finalize");
  assert.equal(finalized.persisted, true, "static finalize persists the complete session locally");
  assert.equal(finalized.savedRecord.backend.status, "local", "static archive is never left in a fake pending state");
  assert.equal(archive.archiveExportPayload().sessions.length, 2, "locally saved archive remains available to the UI/export");
  assert.equal(await archive.syncSessionArchiveToBackend(finalized.savedRecord), false);
  archive.saveSessionArchive([{ ...finalized.savedRecord, backend: { status: "pending" } }]);
  archive.syncPendingSessionArchives();
  assert.equal(fetches(), 0, "static finalize/save/boot archive sync performs zero backend requests");
  assert.equal(archive.loadSessionArchive()[0].backend.status, "local", "legacy pending archives reconcile to local-only");
}

{
  const { archive, fetches, lastMethod } = archiveContext({ backendEnabled: true });
  assert.equal(archive.sessionArchiveBackendEnabled(), true, "future static deployments can opt into session archive sync");
  const finalized = archive.archiveCurrentSession("finalize");
  assert.equal(finalized.savedRecord.backend.status, "pending");
  assert.equal(await archive.syncSessionArchiveToBackend(finalized.savedRecord), true);
  assert.equal(fetches(), 1, "explicit session backend opt-in preserves the future archive request");
  assert.equal(lastMethod(), "POST", "archive opt-in uses the existing POST contract");
  assert.equal(archive.loadSessionArchive()[0].backend.status, "synced");
}

function progressContext({ enabled = false, fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }) } = {}) {
  const storage = memoryStorage();
  const timers = new Map();
  let nextTimer = 1;
  const windowRef = {
    FF_TRAINER_EVENTS_ENABLED: enabled,
    localStorage: storage,
    location: { protocol: "https:", pathname: "/lesson", href: "https://example.test/lesson" },
    navigator: {},
    fetch: fetchImpl,
    console,
    addEventListener() {},
    dispatchEvent() {},
    setTimeout(callback) { const id = nextTimer++; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  windowRef.window = windowRef;
  windowRef.parent = windowRef;
  const context = createContext({ window: windowRef, console, URL, Date, Math, Number, String, Boolean, Object, Array, Set, Map, JSON });
  runInContext(read("assets/poker-progress/progress.js"), context, { filename: "progress.js" });
  return { windowRef, storage, timers };
}

{
  let fetches = 0;
  const { windowRef, storage } = progressContext({ fetchImpl: async () => { fetches += 1; } });
  const event = windowRef.FFTrainerEvents.send("trainer_decision", { trainerKey: "test", choice: "fold" });
  assert.equal(event.delivery.status, "local-only", "static build archives trainer events locally without pretending to sync");
  assert.equal(fetches, 0, "trainer transport is opt-in");
  assert.equal(windowRef.FFTrainerEvents.pending().length, 0, "local-only events never become a retry queue");
  for (let index = 0; index < 230; index += 1) {
    windowRef.FFTrainerEvents.send("trainer_decision", { trainerKey: "test", choice: "fold", metadata: { note: "x".repeat(4_000), index } });
  }
  const serialized = storage.getItem("ff-trainer-events-v1") || "[]";
  assert(JSON.parse(serialized).length <= 200, "trainer archive obeys its item cap");
  assert(serialized.length * 2 <= 512_000, "trainer archive obeys its byte cap");
}

{
  let fetches = 0;
  const { windowRef, storage } = progressContext({
    enabled: true,
    fetchImpl: async () => {
      fetches += 1;
      return { ok: false, status: 405, json: async () => ({}) };
    }
  });
  windowRef.FFTrainerEvents.send("trainer_decision", { trainerKey: "test", choice: "call" });
  const result = await windowRef.FFTrainerEvents.flush();
  assert.equal(result.notConfigured, true, "trainer 404/405 response is reported as not configured");
  assert.equal(fetches, 1);
  assert.equal(JSON.parse(storage.getItem("ff-trainer-events-v1"))[0].delivery.status, "not-configured");
  const later = windowRef.FFTrainerEvents.send("trainer_decision", { trainerKey: "test", choice: "raise" });
  assert.equal(later.delivery.status, "not-configured");
  await windowRef.FFTrainerEvents.flush();
  assert.equal(fetches, 1, "terminal trainer transport does not retry");
}

function featureLoaderContext({ enabled, healthy = false, staticBuild = false, search = "" } = {}) {
  const listeners = new Map();
  const appendedAssets = [];
  const elements = {
    "sim-start-tabs": { hidden: false, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; }, remove() { this.removed = true; } },
    "online-lobby": { hidden: false, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; }, remove() { this.removed = true; } }
  };
  let fetches = 0;
  const documentRef = {
    readyState: "complete",
    baseURI: "https://example.test/poker-simulator.html",
    scripts: [],
    documentElement: { dataset: {} },
    head: {
      appendChild(node) {
        appendedAssets.push(node.href || node.src || "");
        node.onload?.();
      }
    },
    getElementById(id) { return elements[id] || null; },
    querySelectorAll() { return []; },
    createElement() { return { dataset: {}, getAttribute() { return null; } }; },
    addEventListener(type, listener) { listeners.set(type, listener); }
  };
  const windowRef = {
    FF_STATIC_LEARNING_HUB: staticBuild,
    location: { search },
    document: documentRef,
    console,
    setTimeout,
    fetch: async () => {
      fetches += 1;
      return { ok: healthy, status: healthy ? 200 : 404, json: async () => healthy ? { ok: true, rooms: [] } : null };
    }
  };
  if (enabled !== undefined) windowRef.FF_ONLINE_LOBBY_ENABLED = enabled;
  windowRef.window = windowRef;
  const context = createContext({ window: windowRef, document: documentRef, console, URL, Promise, Error, setTimeout });
  runInContext(read("assets/poker-simulator/simulator-feature-loader.js"), context, { filename: "simulator-feature-loader.js" });
  return { windowRef, elements, appendedAssets, fetches: () => fetches };
}

{
  const disabled = featureLoaderContext();
  assert.equal(await disabled.windowRef.PokerSimulatorFeatureLoader.checkOnlineHealth(), false);
  assert.equal(disabled.fetches(), 0, "static release does not probe a disabled online surface");
  assert.equal(disabled.elements["sim-start-tabs"].hidden, true);
  assert.equal(disabled.elements["online-lobby"].hidden, true);

  const healthy = featureLoaderContext({ enabled: true, healthy: true });
  assert.equal(await healthy.windowRef.PokerSimulatorFeatureLoader.checkOnlineHealth(), true);
  assert.equal(healthy.fetches(), 1);
  assert.equal(healthy.elements["sim-start-tabs"].hidden, false, "online entry appears only after successful health check");
  assert.equal(healthy.elements["online-lobby"].hidden, false);

  const staticRoom = featureLoaderContext({ enabled: true, healthy: true, staticBuild: true, search: "?room=stale-invite" });
  assert.equal(staticRoom.windowRef.PokerSimulatorFeatureLoader.onlineRuntimeEnabled(), false, "static build wins over an online opt-in");
  assert.equal(staticRoom.windowRef.PokerSimulatorFeatureLoader.isServerMode(), false, "a direct room link cannot bypass static-off");
  await staticRoom.windowRef.PokerSimulatorFeatureLoader.readyForBoot();
  assert.deepEqual(staticRoom.appendedAssets, [], "static direct-room boot loads no multiplayer assets");
  assert.equal(staticRoom.fetches(), 0, "static direct-room boot performs no health request");
  assert.equal(staticRoom.elements["sim-start-tabs"].hidden, true);
  assert.equal(staticRoom.elements["online-lobby"].hidden, true);

  const deployedRoom = featureLoaderContext({ staticBuild: false, search: "?room=active-room" });
  assert.equal(deployedRoom.windowRef.PokerSimulatorFeatureLoader.isServerMode(), true, "non-static direct-room deployments keep their runtime path");
  await deployedRoom.windowRef.PokerSimulatorFeatureLoader.readyForBoot();
  assert(
    deployedRoom.appendedAssets.some((asset) => asset.includes("simulator-multiplayer-runtime.js")),
    "non-static direct-room boot still loads the multiplayer runtime"
  );
}

const simulatorHtml = read("poker-simulator.html");
assert.match(simulatorHtml, /id="sim-start-tabs"[^>]*\bhidden\b/, "online tabs are hidden in initial HTML");
assert.match(simulatorHtml, /id="online-lobby"[^>]*\bhidden\b/, "online lobby is hidden in initial HTML");
assert.doesNotMatch(read("assets/poker-simulator/simulator-online-lobby.js"), /эфемерный|durable backend|dev\/process/i, "developer backend note is not shipped to learners");

console.log("Static backend gates: ok");
