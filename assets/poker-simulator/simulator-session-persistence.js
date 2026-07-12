(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  // Session + hand-log persistence concern, carved out of simulator-session-store.js.
  // Owns the localStorage read/write with quota-fallback retries, the hand-log
  // (de)serialization wrappers, and the table-restore snapshot sanitizers. It is a
  // leaf concern (no archive/leaderboard dependency), reading lock + warning helpers
  // through the shared `ctx`; session-store composes it behind the unchanged bridge.
  function model(ctx = {}) {
    const storage = ctx.storage || null;
    const keys = ctx.keys || {};
    const sessionId = String(ctx.sessionId || "");
    const sessionHistoryLimit = Math.max(0, Number(ctx.sessionHistoryLimit || 500));
    const sessionDecisionLimit = Math.max(0, Number(ctx.sessionDecisionLimit || 2000));
    const foldAnyEventLimit = Math.max(0, Number(ctx.foldAnyEventLimit || 2000));
    const handLogLimit = Math.max(0, Number(ctx.handLogLimit || 5000));
    const warn = typeof ctx.warn === "function" ? ctx.warn : () => {};
    const nowIso = typeof ctx.nowIso === "function" ? ctx.nowIso : () => new Date().toISOString();
    const currentState = typeof ctx.currentState === "function" ? ctx.currentState : () => null;
    const finiteNumber = typeof ctx.finiteNumber === "function" ? ctx.finiteNumber : (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
    const roundBbMetric = typeof ctx.roundBbMetric === "function" ? ctx.roundBbMetric : (value) => Math.round(finiteNumber(value, 0) * 10) / 10;
    const normalizeSessionPayload = typeof ctx.normalizeSessionPayload === "function" ? ctx.normalizeSessionPayload : () => null;
    const handLogKit = ctx.handLogKit || root.PokerSimulatorHandLog || {};
    const isSessionReadOnly = typeof ctx.isSessionReadOnly === "function" ? ctx.isSessionReadOnly : () => false;
    const markSessionReadOnly = typeof ctx.markSessionReadOnly === "function" ? ctx.markSessionReadOnly : () => {};
    const markPersistenceDegraded = typeof ctx.markPersistenceDegraded === "function" ? ctx.markPersistenceDegraded : () => {};
    const clearPersistenceWarningAfterCleanSave = typeof ctx.clearPersistenceWarningAfterCleanSave === "function" ? ctx.clearPersistenceWarningAfterCleanSave : () => {};

    function sanitizeHistoryEntry(entry) {
      return typeof handLogKit.sanitizeHistoryEntry === "function" ? handLogKit.sanitizeHistoryEntry(entry) : entry;
    }

    function sanitizeFoldAnyEvent(event) {
      return typeof handLogKit.sanitizeFoldAnyEvent === "function"
        ? handLogKit.sanitizeFoldAnyEvent(event, { sessionId })
        : event;
    }

    function sanitizeHandLogEntry(entry) {
      return typeof handLogKit.sanitizeHandLogEntry === "function"
        ? handLogKit.sanitizeHandLogEntry(entry, handLogSanitizeOptions())
        : entry;
    }

    function parseHandLogJsonl(text) {
      return typeof handLogKit.parseHandLogJsonl === "function" ? handLogKit.parseHandLogJsonl(text) : [];
    }

    function handLogSanitizeOptions(extra = {}) {
      const settings = currentState()?.settings || {};
      return {
        sessionId,
        settings,
        revealOpponentCardsOnFinish: settings.revealOpponentCardsOnFinish,
        ...extra
      };
    }

    function handLogJsonl(entries = currentState()?.handLog || []) {
      return typeof handLogKit.handLogJsonl === "function" ? handLogKit.handLogJsonl(entries, handLogSanitizeOptions()) : "";
    }

    function safeString(value, fallback = "", maxLength = 120) {
      const text = String(value ?? fallback ?? "");
      return text.slice(0, Math.max(0, Number(maxLength) || 0));
    }

    function finiteInteger(value, fallback = 0, min = 0, max = 1_000_000) {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.min(max, Math.max(min, Math.floor(number)));
    }

    function sanitizeLobbyState(value, fallback = "active") {
      const state = String(value || fallback || "active").toLowerCase();
      return ["active", "sitting-out", "disconnected", "eliminated", "empty"].includes(state) ? state : "active";
    }

    function sanitizeRestoreSeatSnapshot(seat, index = 0) {
      if (!seat || typeof seat !== "object") return null;
      const id = finiteInteger(seat.id, index, 0, 24);
      return {
        id,
        name: safeString(seat.name, id === 0 || seat.isHero ? "Hero" : `Seat ${id + 1}`, 40),
        stack: roundBbMetric(Math.max(0, finiteNumber(seat.stack, 0))),
        isHero: Boolean(seat.isHero || id === 0),
        lobbyState: id === 0 || seat.isHero ? "active" : sanitizeLobbyState(seat.lobbyState),
        dealer: Boolean(seat.dealer),
        blind: ["SB", "BB"].includes(String(seat.blind || "")) ? String(seat.blind) : ""
      };
    }

    function sanitizeTableRestoreSnapshot(table) {
      if (!table || typeof table !== "object") return null;
      const seats = (Array.isArray(table.seats) ? table.seats : [])
        .slice(0, 10)
        .map(sanitizeRestoreSeatSnapshot)
        .filter(Boolean)
        .sort((first, second) => Number(first.id) - Number(second.id));
      if (!seats.length) return null;
      return {
        schema: "poker-simulator-table-restore-v1",
        tableId: finiteInteger(table.tableId ?? table.id, 1, 1, 4),
        handNo: finiteInteger(table.handNo, 0, 0),
        tournamentHandNo: finiteInteger(table.tournamentHandNo || table.handNo, 0, 0),
        simulationMode: String(table.simulationMode || "").toLowerCase() === "random" ? "random" : "tournament",
        playerCount: finiteInteger(table.playerCount || seats.length, seats.length, 1, 10),
        seatSlotCount: finiteInteger(table.seatSlotCount || table.playerCount || seats.length, seats.length, 1, 10),
        blindLevelIndex: finiteInteger(table.blindLevelIndex, 0, 0, 1000),
        blindLevel: finiteInteger(table.blindLevel, 1, 1, 1001),
        blindMultiplier: roundBbMetric(Math.max(0.1, finiteNumber(table.blindMultiplier, 1))),
        tournamentLevelHands: finiteInteger(table.tournamentLevelHands, 0, 0, 1000),
        savedAt: safeString(table.savedAt || nowIso(), "", 40),
        seats
      };
    }

    function sanitizeTableRestoreSnapshots(value) {
      return (Array.isArray(value) ? value : [])
        .slice(0, 4)
        .map(sanitizeTableRestoreSnapshot)
        .filter(Boolean);
    }

    function currentTableRestoreSnapshots(state) {
      const liveTables = state?.started && Array.isArray(state.tables)
        ? sanitizeTableRestoreSnapshots(state.tables)
        : [];
      if (liveTables.length) return liveTables;
      return sanitizeTableRestoreSnapshots(state?.restoreTableSnapshots);
    }

    function sanitizeInterruptedRestoreHand(marker) {
      if (!marker || typeof marker !== "object") return null;
      const snapshot = sanitizeTableRestoreSnapshot(marker.snapshot || marker);
      if (!snapshot) return null;
      return {
        schema: "poker-simulator-interrupted-hand-v1",
        tableId: snapshot.tableId,
        handNo: snapshot.handNo,
        tournamentHandNo: snapshot.tournamentHandNo,
        blindLevel: snapshot.blindLevel,
        blindMultiplier: snapshot.blindMultiplier,
        interruptedAt: safeString(marker.interruptedAt || marker.savedAt || "", "", 40),
        resumedAt: safeString(marker.resumedAt || "", "", 40),
        reason: safeString(marker.reason || "page-restore", "page-restore", 40),
        snapshot
      };
    }

    function sanitizeInterruptedRestoreHands(value) {
      return (Array.isArray(value) ? value : [])
        .slice(0, 20)
        .map(sanitizeInterruptedRestoreHand)
        .filter(Boolean);
    }

    function readLiveStorageItem(primaryKey, legacyKey) {
      const primary = storage?.getItem?.(primaryKey) || "";
      if (String(primary || "").trim()) return primary;
      if (!legacyKey || legacyKey === primaryKey) return primary;
      return storage?.getItem?.(legacyKey) || "";
    }

    function loadSessionData() {
      const empty = { sessionId, handSeq: 0, history: [], decisions: [], foldAnyEvents: [], botLab: null, compareSession: null, tableSnapshots: [], restoreInterruptedHands: [] };
      try {
        const parsed = JSON.parse(readLiveStorageItem(keys.session, keys.legacySession) || "{}");
        // Schema guard: a payload written by a newer build (version > 1) may use
        // a shape we cannot safely read. Fall back to an empty session instead of
        // mis-parsing unknown fields. version 0 (legacy/unversioned) and 1 stay live.
        const version = Number(parsed.version) || 0;
        if (version > 1) return empty;
        return {
          sessionId: typeof parsed.sessionId === "string" && parsed.sessionId ? parsed.sessionId.slice(0, 80) : sessionId,
          handSeq: Number.isFinite(Number(parsed.handSeq)) ? Math.max(0, Math.floor(Number(parsed.handSeq))) : 0,
          history: Array.isArray(parsed.history) ? parsed.history.slice(0, sessionHistoryLimit).map(sanitizeHistoryEntry) : [],
          decisions: Array.isArray(parsed.decisions) ? parsed.decisions.slice(0, sessionDecisionLimit).filter((entry) => entry && typeof entry === "object") : [],
          foldAnyEvents: Array.isArray(parsed.foldAnyEvents) ? parsed.foldAnyEvents.slice(0, foldAnyEventLimit).map(sanitizeFoldAnyEvent).filter(Boolean) : [],
          botLab: parsed.botLab && typeof parsed.botLab === "object" ? parsed.botLab : null,
          compareSession: normalizeSessionPayload(parsed.compareSession, { allowEmpty: false }),
          tableSnapshots: sanitizeTableRestoreSnapshots(parsed.tableSnapshots),
          restoreInterruptedHands: sanitizeInterruptedRestoreHands(parsed.restoreInterruptedHands)
        };
      } catch (error) {
        warn("Stored session data could not be parsed; starting a fresh session.", error);
        return empty;
      }
    }

    function saveSessionData() {
      const state = currentState();
      if (!state) return false;
      if (isSessionReadOnly()) {
        markSessionReadOnly();
        return false;
      }
      const buildPayload = (limit = {}) => ({
        version: 1,
        sessionId: state.sessionId,
        handSeq: state.handSeq,
        history: state.history.slice(0, limit.history ?? sessionHistoryLimit).map(sanitizeHistoryEntry),
        decisions: state.decisions.slice(0, limit.decisions ?? sessionDecisionLimit).filter((entry) => entry && typeof entry === "object"),
        foldAnyEvents: state.foldAnyEvents.slice(0, limit.foldAnyEvents ?? foldAnyEventLimit).map(sanitizeFoldAnyEvent).filter(Boolean),
        botLab: state.botLab,
        compareSession: state.compareSession,
        tableSnapshots: currentTableRestoreSnapshots(state),
        restoreInterruptedHands: sanitizeInterruptedRestoreHands(state.restoreInterruptedHands)
      });
      const attempts = [
        { history: sessionHistoryLimit, decisions: sessionDecisionLimit, foldAnyEvents: foldAnyEventLimit },
        { history: 300, decisions: 600, foldAnyEvents: 200 },
        { history: 160, decisions: 300, foldAnyEvents: 100 },
        { history: 80, decisions: 160, foldAnyEvents: 50 },
        { history: 40, decisions: 80, foldAnyEvents: 20 },
        { history: 12, decisions: 24, foldAnyEvents: 8 },
        { history: 0, decisions: 0, foldAnyEvents: 0 }
      ];
      for (const limit of attempts) {
        try {
          const payload = buildPayload(limit);
          storage?.setItem?.(keys.session, JSON.stringify(payload));
          if (
            limit.history < sessionHistoryLimit
            || limit.decisions < sessionDecisionLimit
            || limit.foldAnyEvents < foldAnyEventLimit
          ) {
            markPersistenceDegraded(state, "Память браузера почти заполнена: сохраненная копия сессии сокращена, освободите место.", "quota");
          } else {
            clearPersistenceWarningAfterCleanSave(state);
          }
          return true;
        } catch (error) {
          if (limit.history === 0 && limit.decisions === 0 && limit.foldAnyEvents === 0) {
            warn("Session history was not persisted.", error);
            markPersistenceDegraded(state, "Не удалось сохранить прогресс: хранилище браузера заполнено или открыто приватное окно.", "storage");
          }
        }
      }
      return false;
    }

    function loadHandLogData() {
      try {
        const raw = readLiveStorageItem(keys.handLog, keys.legacyHandLog) || "";
        return parseHandLogJsonl(raw)
          .slice(0, handLogLimit)
          .map((entry) => sanitizeHandLogEntry(entry))
          .filter(Boolean);
      } catch (error) {
        warn("Hand log was not loaded.", error);
        return [];
      }
    }

    function saveHandLogData() {
      const state = currentState();
      if (!state) return false;
      if (isSessionReadOnly()) {
        markSessionReadOnly();
        return false;
      }
      const source = Array.isArray(state.handLog) ? state.handLog : [];
      const attempts = [handLogLimit, 2500, 1200, 600, 300, 150, 60, 20, 0];
      for (const limit of attempts) {
        try {
          const entries = source.slice(0, limit).map(sanitizeHandLogEntry).filter(Boolean);
          storage?.setItem?.(keys.handLog, handLogJsonl(entries));
          if (entries.length !== source.length) state.handLog = entries;
          if (limit < handLogLimit) {
            // Reaching a fallback limit means recorded hands were dropped to
            // fit quota — that is data loss, not a clean save: surface it.
            markPersistenceDegraded(
              state,
              entries.length
                ? `Память браузера почти заполнена: журнал рук сокращён до ${entries.length}.`
                : "Не удалось сохранить журнал рук: хранилище браузера заполнено.",
              "quota"
            );
          } else {
            clearPersistenceWarningAfterCleanSave(state);
          }
          return true;
        } catch (error) {
          if (limit === 0) warn("Hand log was not persisted.", error);
        }
      }
      markPersistenceDegraded(state, "Не удалось сохранить журнал рук: хранилище браузера заполнено.", "storage");
      return false;
    }

    return {
      sanitizeHistoryEntry,
      sanitizeFoldAnyEvent,
      sanitizeHandLogEntry,
      parseHandLogJsonl,
      handLogJsonl,
      sanitizeTableRestoreSnapshot,
      sanitizeTableRestoreSnapshots,
      currentTableRestoreSnapshots,
      sanitizeInterruptedRestoreHands,
      loadSessionData,
      saveSessionData,
      loadHandLogData,
      saveHandLogData
    };
  }

  root.PokerSimulatorSessionPersistence = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSessionPersistence;
})();
