(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  // Session archive concern (local snapshots + backend sync), carved out of
  // simulator-session-store.js. session-store composes this behind the unchanged
  // sessionBridge. Cross-concern calls (leaderboard / metrics / lock) resolve
  // through the shared `ctx` at call time, so the archive<->leaderboard cycle and
  // the archiveRevision counter (bumped here, read by the metrics totals) stay
  // consistent without construction-order coupling.
  function model(ctx = {}) {
    const storage = ctx.storage || null;
    const keys = ctx.keys || {};
    const sessionArchiveLimit = Math.max(1, Number(ctx.sessionArchiveLimit || 60));
    const warn = typeof ctx.warn === "function" ? ctx.warn : () => {};
    const nowIso = typeof ctx.nowIso === "function" ? ctx.nowIso : () => new Date().toISOString();
    const currentState = typeof ctx.currentState === "function" ? ctx.currentState : () => null;
    const normalizeSessionPayload = typeof ctx.normalizeSessionPayload === "function" ? ctx.normalizeSessionPayload : () => null;
    const sessionMetrics = typeof ctx.sessionMetrics === "function" ? ctx.sessionMetrics : () => ({});
    const currentSessionPayload = typeof ctx.currentSessionPayload === "function" ? ctx.currentSessionPayload : () => null;
    const activeSimulatorProfile = typeof ctx.activeSimulatorProfile === "function" ? ctx.activeSimulatorProfile : () => ({});
    const isSessionReadOnly = typeof ctx.isSessionReadOnly === "function" ? ctx.isSessionReadOnly : () => false;
    const markSessionReadOnly = typeof ctx.markSessionReadOnly === "function" ? ctx.markSessionReadOnly : () => {};
    const markPersistenceDegraded = typeof ctx.markPersistenceDegraded === "function" ? ctx.markPersistenceDegraded : () => {};
    const compactSessionMetrics = typeof ctx.compactSessionMetrics === "function" ? ctx.compactSessionMetrics : (metrics) => (metrics && typeof metrics === "object" ? { ...metrics } : {});
    const sanitizeProfileSnapshot = typeof ctx.sanitizeProfileSnapshot === "function" ? ctx.sanitizeProfileSnapshot : (profile) => profile || {};
    const leaderboardEntryFromArchive = typeof ctx.leaderboardEntryFromArchive === "function" ? ctx.leaderboardEntryFromArchive : () => null;
    const simulatorArchiveEndpoint = typeof ctx.simulatorArchiveEndpoint === "function" ? ctx.simulatorArchiveEndpoint : () => "";
    const aggregateArchiveTotals = typeof ctx.aggregateArchiveTotals === "function" ? ctx.aggregateArchiveTotals : () => ({});
    const bumpArchiveRevision = typeof ctx.bumpArchiveRevision === "function" ? ctx.bumpArchiveRevision : () => {};
    const windowRef = ctx.windowRef || root;

    function sanitizeArchiveBackendState(backend) {
      if (!backend || typeof backend !== "object") return { status: "local" };
      return {
        status: String(backend.status || "local").slice(0, 40),
        syncedAt: typeof backend.syncedAt === "string" ? backend.syncedAt : "",
        attemptedAt: typeof backend.attemptedAt === "string" ? backend.attemptedAt : "",
        endpoint: String(backend.endpoint || "").slice(0, 180),
        statusCode: Math.max(0, Number(backend.statusCode || 0)),
        error: String(backend.error || "").slice(0, 180)
      };
    }

    function normalizeSessionArchiveRecord(record) {
      if (!record || typeof record !== "object") return null;
      const session = normalizeSessionPayload(record.session || record.payload || record, { allowEmpty: false });
      if (!session) return null;
      const metrics = compactSessionMetrics(record.metrics && typeof record.metrics === "object" ? record.metrics : sessionMetrics(session));
      const archivedAt = typeof record.archivedAt === "string" && record.archivedAt ? record.archivedAt : nowIso();
      return {
        schema: "poker-simulator-session-archive-v1",
        id: String(record.id || `${session.sessionId || "session"}:${archivedAt}`).slice(0, 180),
        sessionId: String(record.sessionId || session.sessionId || "").slice(0, 80),
        archivedAt,
        reason: String(record.reason || "manual").slice(0, 80),
        profile: sanitizeProfileSnapshot(record.profile),
        metrics,
        backend: sanitizeArchiveBackendState(record.backend),
        session
      };
    }

    function loadSessionArchive() {
      try {
        const raw = storage?.getItem?.(keys.sessionArchive) || "";
        if (!raw.trim()) return [];
        const parsed = JSON.parse(raw);
        const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed.archive) ? parsed.archive : [];
        return records.map(normalizeSessionArchiveRecord).filter(Boolean).slice(0, sessionArchiveLimit);
      } catch (error) {
        warn("Session archive was not loaded.", error);
        return [];
      }
    }

    function saveSessionArchive(records) {
      const incoming = (Array.isArray(records) ? records : [])
        .map(normalizeSessionArchiveRecord)
        .filter(Boolean)
        .slice(0, sessionArchiveLimit);
      if (isSessionReadOnly()) {
        markSessionReadOnly();
        return loadSessionArchive();
      }
      const incomingIds = new Set(incoming.map((record) => record.id));
      const normalized = [
        ...incoming,
        ...loadSessionArchive().filter((record) => !incomingIds.has(record.id))
      ].slice(0, sessionArchiveLimit);
      const attempts = [normalized, normalized.slice(0, 30), normalized.slice(0, 12), normalized.slice(0, 4)];
      for (const attempt of attempts) {
        try {
          storage?.setItem?.(keys.sessionArchive, JSON.stringify(attempt));
          bumpArchiveRevision();
          // P1: surface a quota truncation (older archives silently dropped)
          // instead of returning a shorter list as if it were a clean save.
          if (attempt.length < normalized.length) {
            markPersistenceDegraded(currentState(), `Память браузера почти заполнена: сохранено архивов ${attempt.length} из ${normalized.length}.`, "quota");
          }
          return attempt;
        } catch (error) {
          if (attempt.length <= 4) warn("Session archive was not persisted.", error);
        }
      }
      // P1: every attempt failed — the in-memory archive is being wiped. Tell the
      // player instead of returning [] as a silent success.
      markPersistenceDegraded(currentState(), "Не удалось сохранить архив сессий: хранилище браузера заполнено.", "storage");
      return [];
    }

    function hasArchivableSession(payload) {
      return Boolean(
        (Array.isArray(payload?.handLog) && payload.handLog.length)
        || (Array.isArray(payload?.history) && payload.history.length)
        || (Array.isArray(payload?.decisions) && payload.decisions.length)
        || (Array.isArray(payload?.foldAnyEvents) && payload.foldAnyEvents.length)
        || payload?.botLab
      );
    }

    function buildArchivedSession(reason = "manual") {
      const state = currentState();
      const session = currentSessionPayload();
      if (!hasArchivableSession(session)) return null;
      const metrics = sessionMetrics(session);
      const archivedAt = nowIso();
      const profile = activeSimulatorProfile();
      return {
        schema: "poker-simulator-session-archive-v1",
        id: `${session.sessionId || state?.sessionId || "session"}:${Date.now()}`,
        sessionId: session.sessionId || state?.sessionId || "",
        archivedAt,
        reason,
        profile,
        metrics: compactSessionMetrics(metrics),
        backend: { status: profile.loggedIn ? "pending" : "local", attemptedAt: "", syncedAt: "", endpoint: "", statusCode: 0, error: "" },
        session
      };
    }

    function archiveCurrentSession(reason = "manual-reset") {
      const archive = buildArchivedSession(reason);
      if (!archive) return null;
      const records = loadSessionArchive().filter((record) => record.id !== archive.id);
      const saved = saveSessionArchive([archive, ...records]);
      const persisted = saved.some((record) => record.id === archive.id);
      const savedRecord = saved.find((record) => record.id === archive.id) || archive;
      return {
        archive,
        saved,
        savedRecord,
        persisted,
        // Don't publish a leaderboard row for a session that failed to persist
        // locally (saveSessionArchive already flagged the degradation). Returning
        // a phantom entry here used to report success while the data was lost.
        leaderboardEntry: persisted ? leaderboardEntryFromArchive(savedRecord) : null
      };
    }

    function archiveExportPayload() {
      const archive = loadSessionArchive();
      const state = currentState();
      const currentSession = currentSessionPayload();
      const includeCurrent = hasArchivableSession(currentSession);
      const sessions = includeCurrent
        ? [{ schema: "poker-simulator-session-archive-v1", id: `${currentSession.sessionId || state?.sessionId || "session"}:current`, sessionId: currentSession.sessionId || state?.sessionId || "", archivedAt: "", reason: "current", profile: activeSimulatorProfile(), metrics: compactSessionMetrics(sessionMetrics(currentSession)), backend: { status: "current" }, session: currentSession }, ...archive]
        : archive;
      return {
        schema: "poker-simulator-session-archive-export-v1",
        exportedAt: nowIso(),
        profile: activeSimulatorProfile(),
        totals: aggregateArchiveTotals(sessions),
        sessions
      };
    }

    async function syncSessionArchiveToBackend(record) {
      if (isSessionReadOnly()) return false;
      const archive = normalizeSessionArchiveRecord(record);
      if (!archive?.profile?.loggedIn || typeof windowRef.fetch !== "function") return false;
      const endpoint = simulatorArchiveEndpoint();
      if (!endpoint) return false;
      saveArchiveSyncStatus(archive.id, { status: "pending", attemptedAt: new Date().toISOString(), endpoint, error: "", statusCode: 0 });
      try {
        const payload = {
          schema: "poker-simulator-session-sync-v1",
          source: "ff-start-poker-hub",
          archive
        };
        const body = JSON.stringify(payload);
        const response = await windowRef.fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: body.length < 60000
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          const notConfigured = response.status === 503 && result?.configured === false;
          saveArchiveSyncStatus(archive.id, {
            status: notConfigured ? "not-configured" : "failed",
            attemptedAt: new Date().toISOString(),
            endpoint,
            statusCode: response.status,
            error: result?.error || result?.message || `http_${response.status}`
          });
          return false;
        }
        saveArchiveSyncStatus(archive.id, {
          status: "synced",
          syncedAt: new Date().toISOString(),
          attemptedAt: new Date().toISOString(),
          endpoint,
          statusCode: response.status,
          error: ""
        });
        return true;
      } catch (error) {
        saveArchiveSyncStatus(archive.id, {
          status: "failed",
          attemptedAt: new Date().toISOString(),
          endpoint,
          statusCode: 0,
          error: error?.message || "sync_failed"
        });
        warn("Session archive backend sync failed.", error);
        return false;
      }
    }

    function saveArchiveSyncStatus(id, backendPatch) {
      const archiveId = String(id || "");
      if (!archiveId) return;
      const records = loadSessionArchive();
      const index = records.findIndex((record) => record.id === archiveId);
      if (index < 0) return;
      records[index] = {
        ...records[index],
        backend: sanitizeArchiveBackendState({
          ...(records[index].backend || {}),
          ...(backendPatch || {})
        })
      };
      saveSessionArchive(records);
    }

    function syncPendingSessionArchives() {
      loadSessionArchive()
        .filter((record) => record.profile?.loggedIn && ["pending", "failed"].includes(String(record.backend?.status || "")))
        .slice(0, 3)
        .forEach((record) => syncSessionArchiveToBackend(record));
    }

    return {
      sanitizeArchiveBackendState,
      normalizeSessionArchiveRecord,
      loadSessionArchive,
      saveSessionArchive,
      hasArchivableSession,
      buildArchivedSession,
      archiveCurrentSession,
      archiveExportPayload,
      syncSessionArchiveToBackend,
      saveArchiveSyncStatus,
      syncPendingSessionArchives
    };
  }

  root.PokerSimulatorSessionArchive = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSessionArchive;
})();
