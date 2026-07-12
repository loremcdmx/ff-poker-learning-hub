(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  const STORAGE_KEYS = {
    settings: "ff.poker.table-simulator.v0",
    session: "ff.poker.table-simulator.session.v1",
    handLog: "ff.poker.table-simulator.hand-log-jsonl.v1",
    sessionArchive: "ff.poker.table-simulator.session-archive.v1",
    leaderboard: "ff.poker.table-simulator.leaderboard.v1",
    opponentNotes: "ff.poker.table-simulator.opponent-notes.v1",
    opponentModel: "ff.poker.table-simulator.opponent-model.v1"
  };

  const LIMITS = {
    sessionHistory: 500,
    sessionDecision: 2000,
    foldAnyEvent: 2000,
    handLog: 5000,
    sessionArchive: 60,
    leaderboard: 100,
    leaderboardSnapshotMinHandsStep: 5,
    leaderboardSnapshotMinIntervalMs: 30_000
  };

  const DEFAULTS = {
    sessionArchiveEndpoint: "/api/simulator-sessions",
    handLogEndpoint: "/api/simulator-sessions",
    trackedCbetStreets: ["flop", "turn", "river"],
    trackedPositions: ["ip", "oop"]
  };

  function createBootSessionId(options = {}) {
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const randomToken = typeof options.randomToken === "function" ? options.randomToken : fallbackRandomToken;
    const randomUUID = typeof options.randomUUID === "function" ? options.randomUUID : null;
    const uuid = randomUUID ? safeRandomUuid(randomUUID) : "";
    if (uuid) return `sim-${uuid}`;
    return `sim-${Number(now()).toString(36)}-${randomToken(10)}`;
  }

  // Render-scheduling slice. RAF batching, dirty-table tracking, the
  // rendered-HTML cache, per-frame metrics and dealer snapshots used to be
  // seven loose fields on the flat `state` bag, read+written by the render
  // loop/runtime, perf and the table render adapter. Group them behind one
  // cohesive owner (`state.renderScheduler`) so their shape/lifecycle lives in
  // one place instead of being coupled across modules through shared memory.
  function createRenderScheduler() {
    return {
      renderRaf: 0,
      pendingRenderReasons: new Set(),
      renderedTableHtml: new Map(),
      currentRenderMetrics: null,
      dirtyTableIds: new Set(),
      forceAllTableRender: true,
      lastDealerByTable: new Map()
    };
  }

  function createInitialState(options = {}) {
    const savedSession = normalizeSavedSession(options.savedSession);
    const settings = options.settings || {};
    return {
      settings,
      tables: [],
      activeTableId: 1,
      started: false,
      sessionId: savedSession.sessionId,
      handSeq: savedSession.handSeq,
      history: savedSession.history,
      handLog: Array.isArray(options.handLog) ? options.handLog : [],
      restoreTableSnapshots: savedSession.tableSnapshots,
      restoreInterruptedHands: savedSession.restoreInterruptedHands,
      leaderboard: Array.isArray(options.leaderboard) ? options.leaderboard : [],
      leaderboardRemote: {
        entries: [],
        status: "idle",
        message: "",
        fetchedAt: "",
        configured: false
      },
      // Whether Google OAuth is wired for THIS deployment. Discovered lazily from
      // GET /api/auth/session when the leaderboard dialog opens. Default: not
      // configured, so the board renders nickname-first (the interim/no-Google
      // mode) and never offers a dead "Войти" button that bounces to the start
      // screen. Flips to configured:true only if the deployment actually has the
      // Google env wired.
      leaderboardAuth: {
        checked: false,
        pending: false,
        configured: false,
        authenticated: false
      },
      leaderboardSync: {
        status: "idle",
        message: "",
        syncedAt: "",
        attemptedAt: "",
        lastHands: 0,
        lastAttemptAt: 0,
        lastEntryId: "",
        lastEntryUpdatedAt: ""
      },
      decisions: savedSession.decisions,
      foldAnyEvents: savedSession.foldAnyEvents,
      botLab: savedSession.botLab,
      opponentNotes: options.opponentNotes || {},
      opponentModel: options.opponentModel || {},
      editingOpponentNoteKey: "",
      editingOpponentNoteSeatName: "",
      compareSession: savedSession.compareSession,
      importStatus: "",
      persistenceWarning: "",
      persistenceWarningReason: "",
      persistenceWarningOwner: "",
      leaderboardPersistenceTargetCount: 0,
      persistenceDegradedAt: 0,
      persistenceRestoredAt: 0,
      sessionStorageLock: {
        supported: false,
        mode: "tab-scoped",
        owner: true,
        readOnly: false,
        takeoverPending: false,
        message: "Каждая вкладка сохраняет свою live-сессию.",
        updatedAt: 0
      },
      replayHand: null,
      replayIndex: 0,
      replayPlaying: false,
      replayTimer: null,
      // Per-table replay scope: the dialog lists hands of ONE table (set by
      // the table-corner replay button); null = no scope yet.
      replayScopeTableId: null,
      // Leaderboard facet filters (period / table size / lineup difficulty).
      leaderboardFilters: initialLeaderboardFilters(settings),
      leaderboardGraphPeriod: "season",
      paused: false,
      pauseStartedAt: 0,
      pageHiddenAt: 0,
      tempoStartedAt: 0,
      tempoBaseHands: savedSession.history.length,
      tempoPausedMs: 0,
      autoDealCountdownTimer: null,
      actionClockTimers: new Map(),
      actionClockTicker: null,
      botResponseTimers: new Map(),
      renderScheduler: createRenderScheduler(),
      actionRevealTimers: new Map(),
      visualTimers: new Map(),
      perf: options.perf || {},
      perfMutationObserver: null,
      perfMutationObserverStopTimer: null,
      sessionStatsCache: {
        handKey: "",
        pokerStats: null,
        displayHandKey: "",
        displayPokerStats: null,
        decisionKey: "",
        decisionStats: null
      },
      suppressSessionPersistenceForSmoke: Boolean(options.suppressSessionPersistenceForSmoke),
      audio: null
    };
  }

  function initialLeaderboardFilters(settings = {}) {
    const playerCount = Number(settings.playerCount || 0);
    const players = playerCount === 2
      ? "hu"
      : playerCount >= 7
        ? "full"
        : playerCount >= 3
          ? "short"
          : "all";
    const difficulty = ["easy", "standard", "pro"].includes(String(settings.difficulty || ""))
      ? String(settings.difficulty)
      : "standard";
    return { period: "season", players, difficulty, query: "", sort: "score" };
  }

  function normalizeSavedSession(savedSession) {
    const source = savedSession && typeof savedSession === "object" ? savedSession : {};
    return {
      sessionId: String(source.sessionId || ""),
      handSeq: Number.isFinite(Number(source.handSeq)) ? Math.max(0, Math.floor(Number(source.handSeq))) : 0,
      history: Array.isArray(source.history) ? source.history : [],
      decisions: Array.isArray(source.decisions) ? source.decisions : [],
      foldAnyEvents: Array.isArray(source.foldAnyEvents) ? source.foldAnyEvents : [],
      botLab: source.botLab || null,
      compareSession: source.compareSession || null,
      tableSnapshots: Array.isArray(source.tableSnapshots) ? source.tableSnapshots : [],
      restoreInterruptedHands: Array.isArray(source.restoreInterruptedHands) ? source.restoreInterruptedHands : []
    };
  }

  function safeRandomUuid(randomUUID) {
    try {
      return String(randomUUID() || "");
    } catch {
      return "";
    }
  }

  function fallbackRandomToken(length = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let value = "";
    for (let index = 0; index < length; index += 1) {
      value += chars[Math.floor(Math.random() * chars.length)] || "0";
    }
    return value;
  }

  root.PokerSimulatorState = {
    storageKeys: { ...STORAGE_KEYS },
    limits: { ...LIMITS },
    defaults: {
      sessionArchiveEndpoint: DEFAULTS.sessionArchiveEndpoint,
      handLogEndpoint: DEFAULTS.handLogEndpoint,
      trackedCbetStreets: DEFAULTS.trackedCbetStreets.slice(),
      trackedPositions: DEFAULTS.trackedPositions.slice()
    },
    createBootSessionId,
    createInitialState
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorState;
})();
