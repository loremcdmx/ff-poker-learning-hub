(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  // Leaderboard aggregation concern, carved out of simulator-session-store.js:
  // profile/entry normalization, the local board + delete-token persistence, the
  // cross-device session-pool union, remote publish/fetch/delete, and the guest->
  // profile migration. session-store composes it before the archive module so the
  // archive<->leaderboard cycle resolves; the three archive helpers it needs
  // (load/saveSessionArchive, normalizeSessionArchiveRecord) are read LAZILY from
  // the shared ctx at call time, everything else at construction.
  function model(ctx = {}) {
    const leaderboardKit = ctx.leaderboardKit || root.PokerSimulatorLeaderboard || {};
    const storage = ctx.storage || null;
    const keys = ctx.keys || {};
    const deleteTokensKey = String(ctx.deleteTokensKey || "ff.poker.table-simulator.leaderboard-delete-tokens.v1");
    const leaderboardLimit = Math.min(250, Math.max(1, Number(ctx.leaderboardLimit || 250)));
    const leaderboardSnapshotMinHandsStep = Math.max(1, Number(ctx.leaderboardSnapshotMinHandsStep || 5));
    const leaderboardSnapshotMinIntervalMs = Math.max(0, Number(ctx.leaderboardSnapshotMinIntervalMs || 30000));
    const defaultSessionArchiveEndpoint = String(ctx.defaultSessionArchiveEndpoint || "/api/simulator-sessions");
    const windowRef = ctx.windowRef || root;
    const warn = typeof ctx.warn === "function" ? ctx.warn : () => {};
    const nowIso = typeof ctx.nowIso === "function" ? ctx.nowIso : () => new Date().toISOString();
    const currentState = typeof ctx.currentState === "function" ? ctx.currentState : () => null;
    const sessionMetrics = typeof ctx.sessionMetrics === "function" ? ctx.sessionMetrics : () => ({});
    const cachedPokerStats = typeof ctx.cachedPokerStats === "function" ? ctx.cachedPokerStats : () => ({});
    const cachedDecisionStats = typeof ctx.cachedDecisionStats === "function" ? ctx.cachedDecisionStats : () => ({});
    const activeSimulatorProfile = typeof ctx.activeSimulatorProfile === "function" ? ctx.activeSimulatorProfile : () => sanitizeProfileSnapshot(null);
    const renderLeaderboard = typeof ctx.renderLeaderboard === "function" ? ctx.renderLeaderboard : () => {};
    const isSessionReadOnly = typeof ctx.isSessionReadOnly === "function" ? ctx.isSessionReadOnly : () => false;
    const markSessionReadOnly = typeof ctx.markSessionReadOnly === "function" ? ctx.markSessionReadOnly : () => {};
    const markPersistenceDegraded = typeof ctx.markPersistenceDegraded === "function" ? ctx.markPersistenceDegraded : () => {};
    const clearPersistenceWarningAfterCleanSave = typeof ctx.clearPersistenceWarningAfterCleanSave === "function" ? ctx.clearPersistenceWarningAfterCleanSave : () => {};
    const leaderboardDataWarningOwner = "leaderboard-data";
    const leaderboardTokenWarningOwner = "leaderboard-token";
    // Archive helpers read lazily — the archive module composes after this one.
    const loadSessionArchive = (...args) => (typeof ctx.loadSessionArchive === "function" ? ctx.loadSessionArchive(...args) : []);
    const saveSessionArchive = (...args) => (typeof ctx.saveSessionArchive === "function" ? ctx.saveSessionArchive(...args) : []);
    const normalizeSessionArchiveRecord = (...args) => (typeof ctx.normalizeSessionArchiveRecord === "function" ? ctx.normalizeSessionArchiveRecord(...args) : null);

    function compactSessionMetrics(metrics) {
      if (typeof leaderboardKit.compactSessionMetrics === "function") return leaderboardKit.compactSessionMetrics(metrics);
      return metrics && typeof metrics === "object" ? { ...metrics } : {};
    }

    function sanitizeProfileSnapshot(profile) {
      if (typeof leaderboardKit.sanitizeProfileSnapshot === "function") return leaderboardKit.sanitizeProfileSnapshot(profile);
      const id = String(profile?.id || "guest").slice(0, 80);
      return {
        id,
        name: String(profile?.name || (id === "guest" ? "Guest" : id)).slice(0, 80),
        loggedIn: Boolean(id && id !== "guest"),
        authenticated: Boolean(profile?.authenticated || profile?.authProvider),
        createdAt: typeof profile?.createdAt === "string" ? profile.createdAt : "",
        updatedAt: typeof profile?.updatedAt === "string" ? profile.updatedAt : ""
      };
    }

    function isPublicLeaderboardProfile(profile) {
      if (typeof leaderboardKit.isPublicLeaderboardProfile === "function") return leaderboardKit.isPublicLeaderboardProfile(profile);
      const snapshot = sanitizeProfileSnapshot(profile);
      const nameKey = normalizeLeaderboardPlayerName(snapshot.name);
      return Boolean(snapshot.id && snapshot.id !== "guest" && nameKey && !isGuestProfileName(nameKey));
    }

    function normalizeLeaderboardPlayerName(value) {
      return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
    }

    function isGuestProfileName(value) {
      const key = normalizeLeaderboardPlayerName(value);
      return !key || key === "guest" || key === "гость" || key === "player" || key === "игрок";
    }

    function normalizeLeaderboardEntry(entry) {
      return typeof leaderboardKit.normalizeLeaderboardEntry === "function" ? leaderboardKit.normalizeLeaderboardEntry(entry) : null;
    }

    function leaderboardPlayerKey(entry) {
      if (typeof leaderboardKit.leaderboardPlayerKey === "function") return leaderboardKit.leaderboardPlayerKey(entry);
      const profile = sanitizeProfileSnapshot(entry?.profile || entry);
      const id = String(profile.id || "").toLowerCase();
      if (profile.authenticated && id && id !== "guest") return `id:${id}`;
      const nameKey = normalizeLeaderboardPlayerName(profile.name);
      if (nameKey && !isGuestProfileName(nameKey)) return `name:${nameKey}`;
      return id && id !== "guest" ? `id:${id}` : "id:guest";
    }

    function aggregateLeaderboardEntriesByPlayer(entries) {
      return typeof leaderboardKit.aggregateLeaderboardEntriesByPlayer === "function" ? leaderboardKit.aggregateLeaderboardEntriesByPlayer(entries) : entries;
    }

    function sortLeaderboardEntries(entries) {
      return typeof leaderboardKit.sortLeaderboardEntries === "function"
        ? leaderboardKit.sortLeaderboardEntries(entries)
        : (Array.isArray(entries) ? entries : []).map(normalizeLeaderboardEntry).filter(Boolean);
    }

    function leaderboardRatingFromMetrics(metrics = {}) {
      return typeof leaderboardKit.leaderboardRatingFromMetrics === "function" ? leaderboardKit.leaderboardRatingFromMetrics(metrics) : {};
    }

    function loadLeaderboardData() {
      try {
        const parsed = JSON.parse(storage?.getItem?.(keys.leaderboard) || "[]");
        return Array.isArray(parsed)
          ? sortLeaderboardEntries(parsed.map(normalizeLeaderboardEntry).filter(Boolean)).slice(0, leaderboardLimit)
          : [];
      } catch (error) {
        warn("Simulator leaderboard was not loaded.", error);
        return [];
      }
    }

    function activeLeaderboardEntry(entries = []) {
      const state = currentState();
      const sessionId = String(state?.sessionId || "");
      return (Array.isArray(entries) ? entries : []).find((entry) => sessionId && String(entry?.sessionId || "") === sessionId)
        || (Array.isArray(entries) ? entries : []).find((entry) => String(entry?.source || "") === "current")
        || null;
    }

    function leaderboardSubset(entries, limit, retainedEntry = activeLeaderboardEntry(entries)) {
      const normalized = Array.isArray(entries) ? entries : [];
      const count = Math.max(0, Math.min(normalized.length, Number(limit || 0)));
      if (!count) return [];
      if (!retainedEntry) return normalized.slice(0, count);
      const retainedId = String(retainedEntry.id || "");
      const subset = normalized.filter((entry) => String(entry.id || "") !== retainedId).slice(0, Math.max(0, count - 1));
      subset.push(retainedEntry);
      return sortLeaderboardEntries(subset).slice(0, count);
    }

    function leaderboardSaveCounts(length) {
      const full = Math.max(0, Number(length || 0));
      if (!full) return [0];
      return [...new Set([full, 60, 30, 12, 4, 1])]
        .filter((count) => count > 0 && count <= full)
        .sort((a, b) => b - a);
    }

    function clearLeaderboardPersistenceWarning() {
      const state = currentState();
      if (!state) return;
      state.leaderboardPersistenceTargetCount = 0;
      if (String(state.persistenceWarningOwner || "") !== leaderboardDataWarningOwner) return;
      clearPersistenceWarningAfterCleanSave(state, leaderboardDataWarningOwner);
    }

    function saveLeaderboardData(entries = currentState()?.leaderboard || [], options = {}) {
      if (isSessionReadOnly()) {
        markSessionReadOnly();
        return currentState()?.leaderboard || [];
      }
      const incoming = (Array.isArray(entries) ? entries : [])
        .map(normalizeLeaderboardEntry)
        .filter(Boolean);
      // Normal writes merge with the last persisted snapshot so a partial
      // in-memory view cannot erase older sessions. Successful deletion is the
      // inverse operation: its filtered list is authoritative, otherwise the
      // removed row is immediately resurrected from localStorage.
      const persisted = options.replace === true ? [] : loadLeaderboardData();
      const byId = new Map(persisted.map((entry) => [entry.id, entry]));
      incoming.forEach((entry) => byId.set(entry.id, entry));
      const sorted = sortLeaderboardEntries([...byId.values()]);
      const retainedEntry = activeLeaderboardEntry(sorted);
      const normalized = leaderboardSubset(sorted, leaderboardLimit, retainedEntry);
      const state = currentState();
      const pendingTargetCount = Math.max(0, Number(state?.leaderboardPersistenceTargetCount || 0));
      let lastError = null;

      for (const count of leaderboardSaveCounts(normalized.length)) {
        const attempt = leaderboardSubset(normalized, count, retainedEntry);
        try {
          storage?.setItem?.(keys.leaderboard, JSON.stringify(attempt));
          if (state) state.leaderboard = attempt;
          const targetCount = Math.max(pendingTargetCount, normalized.length);
          if (attempt.length < targetCount) {
            if (state) state.leaderboardPersistenceTargetCount = targetCount;
            markPersistenceDegraded(
              state,
              `Память браузера почти заполнена: сохранено записей рейтинга ${attempt.length} из ${targetCount}.`,
              "quota",
              leaderboardDataWarningOwner
            );
          } else {
            clearLeaderboardPersistenceWarning();
          }
          return attempt;
        } catch (error) {
          lastError = error;
        }
      }

      warn("Simulator leaderboard was not persisted.", lastError);
      // Keep the current row visible in memory, but leave the old localStorage
      // value untouched: setItem is atomic, so a later reload gets the last
      // complete snapshot rather than a partially-written one.
      if (state) state.leaderboard = normalized;
      if (state) state.leaderboardPersistenceTargetCount = Math.max(pendingTargetCount, normalized.length);
      markPersistenceDegraded(
        state,
        "Не удалось сохранить рейтинг: хранилище браузера заполнено.",
        "storage",
        leaderboardDataWarningOwner
      );
      return normalized;
    }

    function loadLeaderboardDeleteTokens() {
      try {
        const parsed = JSON.parse(storage?.getItem?.(deleteTokensKey) || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }

    function saveLeaderboardDeleteTokens(tokens) {
      if (isSessionReadOnly()) return loadLeaderboardDeleteTokens();
      const normalizedEntries = Object.entries(tokens && typeof tokens === "object" ? tokens : {})
        .reduce((result, [key, value]) => {
          const tokenKey = String(key || "").slice(0, 180);
          const tokenValue = String(value || "").slice(0, 1500);
          if (tokenKey && tokenValue) result.push([tokenKey, tokenValue]);
          return result;
        }, []);
      // Tokens are an authoritative snapshot (the two callers pass the whole
      // map), so bounding the tail also lets removeLeaderboardDeleteToken
      // actually remove a key instead of merging it back from storage.
      const bounded = Object.fromEntries(normalizedEntries.slice(-leaderboardLimit));
      try {
        storage?.setItem?.(deleteTokensKey, JSON.stringify(bounded));
        clearPersistenceWarningAfterCleanSave(currentState(), leaderboardTokenWarningOwner);
        return bounded;
      } catch (error) {
        warn("Leaderboard delete token was not persisted.", error);
        // Without the token persisted, the player can no longer self-delete that
        // published row. Surface the quota failure rather than swallowing it.
        markPersistenceDegraded(
          currentState(),
          "Память браузера почти заполнена: токен удаления рейтинга не сохранён.",
          "storage",
          leaderboardTokenWarningOwner
        );
        return loadLeaderboardDeleteTokens();
      }
    }

    function leaderboardDeleteTokenKey(entry) {
      const normalized = normalizeLeaderboardEntry(entry);
      if (!normalized) return "";
      return leaderboardPlayerKey(normalized) || String(normalized.id || "").slice(0, 180);
    }

    function storeLeaderboardDeleteToken(entry, token) {
      const key = leaderboardDeleteTokenKey(entry);
      const value = String(token || "");
      if (!key || !value) return false;
      const tokens = loadLeaderboardDeleteTokens();
      delete tokens[key];
      saveLeaderboardDeleteTokens({ ...tokens, [key]: value });
      return true;
    }

    function leaderboardDeleteTokenForEntry(entry = currentLeaderboardEntry()) {
      const key = leaderboardDeleteTokenKey(entry);
      if (!key) return "";
      return String(loadLeaderboardDeleteTokens()[key] || "");
    }

    function removeLeaderboardDeleteToken(entry) {
      const key = leaderboardDeleteTokenKey(entry);
      if (!key) return;
      const tokens = loadLeaderboardDeleteTokens();
      delete tokens[key];
      saveLeaderboardDeleteTokens(tokens);
    }

    function mergeLeaderboardEntries(entries) {
      const state = currentState();
      const byId = new Map((state?.leaderboard || []).map((entry) => [entry.id, entry]));
      (Array.isArray(entries) ? entries : [])
        .map(normalizeLeaderboardEntry)
        .filter(Boolean)
        .forEach((entry) => byId.set(entry.id, entry));
      const next = sortLeaderboardEntries([...byId.values()]).slice(0, leaderboardLimit);
      if (state) state.leaderboard = next;
      saveLeaderboardData(next);
      return currentState()?.leaderboard || next;
    }

    function leaderboardEntryFromArchive(record) {
      const normalized = normalizeSessionArchiveRecord(record);
      if (!normalized) return null;
      const session = normalized.session || {};
      const settings = session.settings || {};
      return normalizeLeaderboardEntry({
        id: normalized.id,
        sessionId: normalized.sessionId || session.sessionId,
        label: normalized.reason === "current" ? "Текущая сессия" : "Архив",
        source: normalized.reason === "current" ? "current" : "archive",
        updatedAt: normalized.archivedAt || nowIso(),
        profile: normalized.profile,
        metrics: normalized.metrics || sessionMetrics(session),
        mode: settings.simulationMode,
        tableCount: settings.tableCount,
        playerCount: settings.playerCount,
        difficulty: settings.difficulty,
        botLineup: settings.botLineup
      });
    }

    function currentLeaderboardEntry() {
      const state = currentState();
      if (!state) return null;
      const pokerStats = cachedPokerStats();
      const decisionStats = cachedDecisionStats();
      const metrics = compactSessionMetrics({
        hands: pokerStats.hands,
        handLogHands: Array.isArray(state.handLog) ? state.handLog.length : 0,
        wins: pokerStats.wins,
        folds: pokerStats.folds,
        showdowns: pokerStats.showdowns,
        evWins: pokerStats.evWins,
        evNetBb: pokerStats.evNetBb,
        evBb100: pokerStats.evBb100,
        evWinRate: pokerStats.evWinRate,
        decisions: decisionStats.decisions,
        good: decisionStats.good,
        leaks: decisionStats.leaks,
        aggressive: decisionStats.aggressive,
        score: decisionStats.score,
        winRate: pokerStats.winRate,
        pokerStats
      });
      if (!metrics.hands) return null;
      const profile = activeSimulatorProfile();
      return normalizeLeaderboardEntry({
        id: `${profile.id}:${state.sessionId}`,
        sessionId: state.sessionId,
        label: "Текущая сессия",
        source: "current",
        updatedAt: nowIso(),
        profile,
        metrics,
        mode: state.settings?.simulationMode,
        tableCount: state.settings?.tableCount,
        playerCount: state.settings?.playerCount,
        difficulty: state.settings?.difficulty,
        botLineup: state.settings?.botLineup
      });
    }

    function migrateCurrentGuestLeaderboardToProfile(profile = activeSimulatorProfile()) {
      const state = currentState();
      if (!state) return false;
      const nextProfile = sanitizeProfileSnapshot(profile);
      if (!isPublicLeaderboardProfile(nextProfile)) return false;
      const now = nowIso();
      let changed = false;
      const migratedEntries = (state.leaderboard || [])
        .map((entry) => {
          const normalized = normalizeLeaderboardEntry(entry);
          if (!normalized) return null;
          // Migrate EVERY guest-owned row on login, not just the current session —
          // a device has one guest identity, so prior guest sessions belong to the
          // same human. Restricting to sameSession orphaned them as a duplicate
          // "Гость" row alongside the new profile row.
          const guestProfile = !isPublicLeaderboardProfile(normalized.profile);
          if (!guestProfile) return normalized;
          changed = true;
          return normalizeLeaderboardEntry({
            ...normalized,
            id: `${nextProfile.id}:${normalized.sessionId || state.sessionId}`,
            playerKey: leaderboardPlayerKey({ profile: nextProfile }),
            updatedAt: now,
            profile: nextProfile
          });
        })
        .filter(Boolean);
      const byId = new Map();
      migratedEntries.forEach((entry) => byId.set(entry.id, entry));
      state.leaderboard = [...byId.values()];
      const migratedArchive = loadSessionArchive().map((record) => {
        const guestProfile = !isPublicLeaderboardProfile(record.profile);
        if (!guestProfile) return record;
        changed = true;
        const archivedAt = record.archivedAt || now;
        return normalizeSessionArchiveRecord({
          ...record,
          id: `${nextProfile.id}:${record.sessionId || state.sessionId}:${archivedAt}`.slice(0, 180),
          profile: nextProfile,
          session: {
            ...(record.session || {}),
            sessionId: record.session?.sessionId || record.sessionId || state.sessionId
          }
        });
      });
      if (changed) {
        saveLeaderboardData();
        saveSessionArchive(migratedArchive);
      }
      return changed;
    }

    function refreshCurrentLeaderboardEntry(options = {}) {
      migrateCurrentGuestLeaderboardToProfile();
      const entry = currentLeaderboardEntry();
      if (!entry) return null;
      mergeLeaderboardEntries([entry]);
      options.syncCurrentLeaderboardSnapshot?.();
      return entry;
    }

    function remoteLeaderboardUsable() {
      const state = currentState();
      return Boolean(
        state?.leaderboardRemote?.entries?.length
        || (state?.leaderboardRemote?.configured && state?.leaderboardRemote?.status !== "not-configured")
      );
    }

    function remoteCoversCurrentEntry(current) {
      const state = currentState();
      if (!state || !current || !isPublicLeaderboardProfile(current.profile) || !remoteLeaderboardUsable()) return false;
      const hands = Number(current.metrics?.hands || current.rating?.hands || 0);
      const remoteForPlayer = (state.leaderboardRemote.entries || [])
        .map(normalizeLeaderboardEntry)
        .filter(Boolean)
        .find((entry) => leaderboardPlayerKey(entry) === leaderboardPlayerKey(current));
      if (!remoteForPlayer) return false;
      if (state.leaderboardSync.status !== "synced") return false;
      if (state.leaderboardSync.lastEntryId !== current.id) return false;
      const syncedHands = Number(state.leaderboardSync.lastHands || 0);
      if (syncedHands < hands) return false;
      const remoteHands = Number(remoteForPlayer.metrics?.hands || remoteForPlayer.rating?.hands || 0);
      if (remoteHands < syncedHands) return false;
      const lastEntryUpdatedAt = String(state.leaderboardSync.lastEntryUpdatedAt || "");
      if (lastEntryUpdatedAt && String(remoteForPlayer.updatedAt || "") < lastEntryUpdatedAt) return false;
      if (state.leaderboardSync.syncedAt && state.leaderboardRemote.fetchedAt) {
        return String(state.leaderboardRemote.fetchedAt) >= String(state.leaderboardSync.syncedAt);
      }
      return false;
    }

    function sanitizeLeaderboardFilters(filters) {
      const raw = filters && typeof filters === "object" ? filters : {};
      const query = String(raw.query || "").replace(/\s+/g, " ").trim().slice(0, 40);
      return {
        period: ["season", "all", "7d", "today"].includes(raw.period) ? raw.period : "season",
        players: ["all", "hu", "short", "full"].includes(raw.players) ? raw.players : "all",
        difficulty: ["all", "easy", "standard", "pro"].includes(raw.difficulty) ? raw.difficulty : "all",
        query,
        sort: ["score", "hands", "evbb"].includes(raw.sort) ? raw.sort : "score"
      };
    }

    function leaderboardSeasonConfig() {
      const state = currentState();
      const remote = state?.leaderboardRemote?.season;
      const globalSeason = windowRef.PokerSimulatorLeaderboardSeason;
      const raw = remote && typeof remote === "object"
        ? remote
        : globalSeason && typeof globalSeason === "object"
        ? globalSeason
        : {};
      const normalize = (value) => {
        const text = String(value || "").replace(/\s+/g, " ").trim();
        if (!text) return "";
        const parsed = Date.parse(text);
        return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
      };
      return {
        startAt: normalize(raw.startAt || raw.start || raw.startsAt),
        endAt: normalize(raw.endAt || raw.end || raw.endsAt)
      };
    }

    function leaderboardFilterPredicate(filters) {
      const f = sanitizeLeaderboardFilters(filters);
      if (f.period === "all" && f.players === "all" && f.difficulty === "all") return () => true;
      let minMs = 0;
      let maxMs = 0;
      if (f.period === "today") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        minMs = todayStart.getTime();
      } else if (f.period === "7d") {
        minMs = Date.now() - 7 * 86400000;
      } else if (f.period === "season") {
        const season = leaderboardSeasonConfig();
        const startMs = season.startAt ? Date.parse(season.startAt) : 0;
        const endMs = season.endAt ? Date.parse(season.endAt) : 0;
        minMs = Number.isFinite(startMs) ? startMs : 0;
        maxMs = Number.isFinite(endMs) ? endMs : 0;
      }
      return (entry) => {
        if (!entry) return false;
        if (minMs || maxMs) {
          const ts = Date.parse(String(entry.updatedAt || ""));
          if (!Number.isFinite(ts)) return true;
          if (minMs && ts < minMs) return false;
          if (maxMs && ts > maxMs) return false;
        }
        if (f.players !== "all") {
          const playerCount = Number(entry.playerCount || 0);
          if (!playerCount) return false;
          if (f.players === "hu" && playerCount !== 2) return false;
          if (f.players === "short" && (playerCount < 3 || playerCount > 6)) return false;
          if (f.players === "full" && playerCount < 7) return false;
        }
        if (f.difficulty !== "all" && entry.difficulty && String(entry.difficulty || "") !== f.difficulty) return false;
        return true;
      };
    }

    // ALL hands, cross-device: every source dissolves into a SESSION pool
    // keyed by (player, sessionId) — local archive, the saved board, the live
    // session and the remote board's per-session breakdown. The richer copy
    // of the SAME session wins (a live session outgrows its published
    // snapshot; publishing is idempotent by profile:sessionId server-side,
    // so different sessionIds are genuinely different hands — другие девайсы
    // просто добавляются в объединение). Legacy remote aggregates without a
    // breakdown fall back to richer-wins per player so a stale snapshot can
    // never downgrade a fuller local total.
    function leaderboardEntries(filters = currentState()?.leaderboardFilters) {
      const state = currentState();
      if (!state) return [];
      const predicate = leaderboardFilterPredicate(filters);
      const current = currentLeaderboardEntry();
      const handsOf = (row) => Number(row?.metrics?.hands || row?.rating?.hands || 0);
      const sessionPool = new Map();
      const poolAdd = (entry) => {
        if (!entry) return;
        const sid = String(entry.sessionId || "");
        const key = sid ? `${leaderboardPlayerKey(entry)}:${sid}` : `id:${entry.id}`;
        const existing = sessionPool.get(key);
        const entryHands = handsOf(entry);
        const existingHands = handsOf(existing);
        const preferStableSnapshot = entryHands === existingHands && existing?.source === "current" && entry.source !== "current";
        if (!existing || entryHands > existingHands || preferStableSnapshot) sessionPool.set(key, entry);
      };
      loadSessionArchive().map(leaderboardEntryFromArchive).filter(Boolean).forEach(poolAdd);
      (state.leaderboard || []).map(normalizeLeaderboardEntry).filter(Boolean).forEach(poolAdd);
      if (current) poolAdd(current);
      const legacyRemote = [];
      (state.leaderboardRemote.entries || [])
        .map(normalizeLeaderboardEntry)
        .filter(Boolean)
        .forEach((row) => {
          if (Array.isArray(row.sessions) && row.sessions.length) {
            row.sessions.forEach((session) => poolAdd(normalizeLeaderboardEntry({
              id: `${row.profile?.id || "player"}:${session.sessionId}`,
              sessionId: session.sessionId,
              label: "Сессия",
              source: "remote-session",
              updatedAt: session.updatedAt || row.updatedAt,
              profile: row.profile,
              mode: row.mode,
              playerCount: session.playerCount,
              difficulty: session.difficulty,
              metrics: session.metrics
            })));
            return;
          }
          legacyRemote.push(row);
        });
      const rows = aggregateLeaderboardEntriesByPlayer([...sessionPool.values()].filter(predicate));
      const byPlayer = new Map();
      legacyRemote.filter(predicate).forEach((row) => byPlayer.set(leaderboardPlayerKey(row), row));
      rows.forEach((row) => {
        const key = leaderboardPlayerKey(row);
        const legacy = byPlayer.get(key);
        if (!legacy || handsOf(row) >= handsOf(legacy)) byPlayer.set(key, row);
      });
      return sortLeaderboardEntries([...byPlayer.values()]).slice(0, leaderboardLimit);
    }

    function currentLeaderboardPlayerEntry(entries = leaderboardEntries()) {
      const current = currentLeaderboardEntry();
      // A fresh session has no current entry until the first hand, but the
      // player's aggregated row (archive/remote) may already exist — without
      // this fallback the "Твой результат" block resets to zeros on every
      // reload until a hand is played.
      const currentKey = leaderboardPlayerKey(current || { profile: activeSimulatorProfile() });
      const match = (Array.isArray(entries) ? entries : []).find((entry) => leaderboardPlayerKey(entry) === currentKey);
      return match || current;
    }

    function leaderboardRankFor(entry, entries = leaderboardEntries()) {
      if (!entry) return 0;
      const playerKey = leaderboardPlayerKey(entry);
      const index = entries.findIndex((item) => item.id === entry.id || leaderboardPlayerKey(item) === playerKey);
      return index >= 0 ? index + 1 : 0;
    }

    function simulatorArchiveEndpoint() {
      const configured = typeof windowRef.PokerSimulatorSessionArchiveEndpoint === "string"
        ? windowRef.PokerSimulatorSessionArchiveEndpoint.trim()
        : "";
      return configured || defaultSessionArchiveEndpoint;
    }

    function simulatorLeaderboardEndpoint() {
      const configured = typeof windowRef.PokerSimulatorLeaderboardEndpoint === "string"
        ? windowRef.PokerSimulatorLeaderboardEndpoint.trim()
        : "";
      if (configured) return configured;
      try {
        const url = new URL(simulatorArchiveEndpoint(), windowRef.location?.origin || "http://localhost");
        url.searchParams.set("view", "leaderboard");
        url.searchParams.set("limit", String(leaderboardLimit));
        return url.toString();
      } catch {
        return `${defaultSessionArchiveEndpoint}?view=leaderboard&limit=${leaderboardLimit}`;
      }
    }

    function simulatorPlayerStatsEndpoint(playerKey = "") {
      const configured = typeof windowRef.PokerSimulatorPlayerStatsEndpoint === "string"
        ? windowRef.PokerSimulatorPlayerStatsEndpoint.trim()
        : "";
      try {
        const url = new URL(configured || simulatorArchiveEndpoint(), windowRef.location?.origin || "http://localhost");
        if (!configured) url.searchParams.set("view", "players");
        url.searchParams.set("limit", "1");
        if (playerKey) url.searchParams.set("player", playerKey);
        return url.toString();
      } catch {
        const joiner = defaultSessionArchiveEndpoint.includes("?") ? "&" : "?";
        return `${defaultSessionArchiveEndpoint}${joiner}view=players&limit=1${playerKey ? `&player=${encodeURIComponent(playerKey)}` : ""}`;
      }
    }

    function simulatorGraphSeriesEndpoint(playerKey = "") {
      try {
        const url = new URL(simulatorArchiveEndpoint(), windowRef.location?.origin || "http://localhost");
        url.searchParams.set("view", "graph");
        if (playerKey) url.searchParams.set("player", playerKey);
        return url.toString();
      } catch {
        const joiner = defaultSessionArchiveEndpoint.includes("?") ? "&" : "?";
        return `${defaultSessionArchiveEndpoint}${joiner}view=graph${playerKey ? `&player=${encodeURIComponent(playerKey)}` : ""}`;
      }
    }

    function canSyncLeaderboardProfile(profile = activeSimulatorProfile()) {
      return isPublicLeaderboardProfile(profile);
    }

    function shouldSyncCurrentLeaderboardSnapshot(entry, options = {}) {
      const state = currentState();
      if (!state || !entry || !isPublicLeaderboardProfile(entry.profile)) return false;
      if (isSessionReadOnly()) return false;
      if (typeof windowRef.fetch !== "function") return false;
      const hands = Number(entry.metrics?.hands || entry.rating?.hands || 0);
      if (!(hands > 0)) return false;
      if (options.force) return true;
      const now = Date.now();
      const handsSinceSync = hands - Number(state.leaderboardSync.lastHands || 0);
      const elapsed = now - Number(state.leaderboardSync.lastAttemptAt || 0);
      return handsSinceSync >= leaderboardSnapshotMinHandsStep && elapsed >= leaderboardSnapshotMinIntervalMs;
    }

    function isLeaderboardEndpointNotConfigured(response, result) {
      const status = Number(response?.status || 0);
      return Boolean(
        result?.configured === false
        || status === 404
        || status === 405
        || (status === 503 && result?.configured === false)
      );
    }

    async function syncCurrentLeaderboardSnapshot(options = {}) {
      const state = currentState();
      const entry = currentLeaderboardEntry();
      if (!state || !shouldSyncCurrentLeaderboardSnapshot(entry, options)) return false;
      const endpoint = simulatorArchiveEndpoint();
      const hands = Number(entry.metrics?.hands || entry.rating?.hands || 0);
      const syncSessionId = String(state.sessionId || "");
      const syncEntryId = String(entry.id || "");
      const syncEntryUpdatedAt = String(entry.updatedAt || "");
      function syncStillTargetsCurrentSession() {
        const current = currentState();
        if (!current || String(current.sessionId || "") !== syncSessionId) return false;
        const currentEntry = currentLeaderboardEntry();
        return Boolean(currentEntry && String(currentEntry.id || "") === syncEntryId);
      }
      state.leaderboardSync = {
        ...(state.leaderboardSync || {}),
        status: "pending",
        reason: "",
        message: "Публикуем текущий результат",
        attemptedAt: new Date().toISOString(),
        lastAttemptAt: Date.now()
      };
      try {
        const body = JSON.stringify({
          schema: "poker-simulator-leaderboard-snapshot-v1",
          source: "ff-start-poker-hub",
          entry
        });
        const response = await windowRef.fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: body.length < 60000
        });
        const result = await response.json().catch(() => null);
        if (!syncStillTargetsCurrentSession()) return false;
        if (!response.ok) {
          const notConfigured = isLeaderboardEndpointNotConfigured(response, result);
          state.leaderboardSync = {
            ...(state.leaderboardSync || {}),
            status: notConfigured ? "not-configured" : "failed",
            message: notConfigured ? "Общий рейтинг не настроен на сервере" : (result?.error || `HTTP ${response.status}`),
            lastHands: notConfigured ? state.leaderboardSync.lastHands : Number(state.leaderboardSync.lastHands || 0)
          };
          renderLeaderboard();
          return false;
        }
        state.leaderboardSync = {
          ...(state.leaderboardSync || {}),
          status: result?.stored ? "synced" : "local",
          message: result?.stored ? "Результат опубликован" : "Сервер принял локально",
          syncedAt: new Date().toISOString(),
          lastHands: hands,
          lastEntryId: entry.id,
          lastEntryUpdatedAt: syncEntryUpdatedAt
        };
        if (result?.deleteToken) storeLeaderboardDeleteToken(result?.entry || entry, result.deleteToken);
        renderLeaderboard();
        return true;
      } catch (error) {
        if (!syncStillTargetsCurrentSession()) return false;
        state.leaderboardSync = {
          ...(state.leaderboardSync || {}),
          status: "failed",
          message: error?.message || "Не удалось опубликовать рейтинг"
        };
        renderLeaderboard();
        return false;
      }
    }

    // Single in-flight guard: the boot-time prefetch and a dialog open can
    // race; the second caller must piggyback on the running fetch instead of
    // firing a duplicate request.
    let remoteLeaderboardRefreshInflight = null;

    function refreshRemoteLeaderboard(options = {}) {
      const state = currentState();
      if (!state || typeof windowRef.fetch !== "function") return Promise.resolve(false);
      if (remoteLeaderboardRefreshInflight) {
        // A post-publish refresh (afterSync) must observe data fetched AFTER
        // its publish landed — a GET that started earlier can't contain the
        // just-published entry, so chain a follow-up fetch behind it.
        if (!options.afterSync) return remoteLeaderboardRefreshInflight;
        const chained = remoteLeaderboardRefreshInflight
          .catch(() => false)
          .then(() => runRemoteLeaderboardRefresh(currentState() || state, options));
        trackRemoteLeaderboardInflight(chained);
        return chained;
      }
      // A prefetch only warms a cold cache — once any fetch has landed
      // (success or failure), it never refires; explicit refreshes still do.
      if (options.prefetch && String(state.leaderboardRemote?.fetchedAt || "")) return Promise.resolve(true);
      const started = runRemoteLeaderboardRefresh(state, options);
      trackRemoteLeaderboardInflight(started);
      return started;
    }

    function trackRemoteLeaderboardInflight(promise) {
      remoteLeaderboardRefreshInflight = promise;
      promise.catch(() => false).then(() => {
        // Only the promise that still owns the slot may clear it — an earlier
        // fetch settling must not evict a chained afterSync follow-up.
        if (remoteLeaderboardRefreshInflight === promise) remoteLeaderboardRefreshInflight = null;
      });
    }

    async function runRemoteLeaderboardRefresh(state, options = {}) {
      const endpoint = simulatorLeaderboardEndpoint();
      state.leaderboardRemote = {
        ...(state.leaderboardRemote || {}),
        status: "loading",
        message: "Загружаем общий рейтинг"
      };
      if (options.renderOnStart) renderLeaderboard();
      try {
        const response = await windowRef.fetch(endpoint, {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          const notConfigured = isLeaderboardEndpointNotConfigured(response, result);
          state.leaderboardRemote = {
            ...(state.leaderboardRemote || {}),
            status: notConfigured ? "not-configured" : "failed",
            message: notConfigured ? "Общий рейтинг не настроен на сервере" : (result?.error || `HTTP ${response.status}`),
            fetchedAt: new Date().toISOString(),
            configured: false
          };
          renderLeaderboard();
          return false;
        }
        const entries = Array.isArray(result?.entries)
          ? result.entries.map(normalizeLeaderboardEntry).filter(Boolean)
          : [];
        const previousPlayerStats = state.leaderboardRemote?.playerStats || null;
        const previousGraphHands = state.leaderboardRemote?.graphHands || null;
        state.leaderboardRemote = {
          entries,
          status: result?.configured ? "synced" : "not-configured",
          message: result?.configured
            ? (entries.length ? `Общий рейтинг: ${entries.length}` : "Общий рейтинг пуст")
            : "Общий рейтинг не настроен на сервере",
          fetchedAt: new Date().toISOString(),
          configured: Boolean(result?.configured),
          ...(previousPlayerStats ? { playerStats: previousPlayerStats } : {}),
          ...(previousGraphHands ? { graphHands: previousGraphHands } : {})
        };
        if (result?.configured) {
          await refreshRemotePlayerStats({ renderOnDone: false });
          // Cross-device hand series rides behind the board itself so the
          // dashboard paints without waiting on it; the graph re-renders when
          // the series lands.
          Promise.resolve(refreshRemoteGraphHands({ renderOnDone: true })).catch(() => {});
        }
        renderLeaderboard();
        return true;
      } catch (error) {
        state.leaderboardRemote = {
          ...(state.leaderboardRemote || {}),
          status: "failed",
          message: error?.message || "Не удалось загрузить общий рейтинг",
          fetchedAt: new Date().toISOString()
        };
        renderLeaderboard();
        return false;
      }
    }

    async function refreshRemotePlayerStats(options = {}) {
      const state = currentState();
      if (!state || typeof windowRef.fetch !== "function") return false;
      const profile = activeSimulatorProfile();
      if (!isPublicLeaderboardProfile(profile)) return false;
      const playerKey = leaderboardPlayerKey({ profile });
      const endpoint = simulatorPlayerStatsEndpoint(playerKey);
      try {
        const response = await windowRef.fetch(endpoint, {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.configured) {
          state.leaderboardRemote = {
            ...(state.leaderboardRemote || {}),
            playerStats: {
              ...(state.leaderboardRemote?.playerStats || {}),
              playerKey,
              status: result?.configured === false ? "not-configured" : "failed",
              message: result?.error || `HTTP ${response.status || 0}`,
              fetchedAt: new Date().toISOString(),
              configured: Boolean(result?.configured)
            }
          };
          if (options.renderOnDone) renderLeaderboard();
          return false;
        }
        const players = (Array.isArray(result.players) ? result.players : [])
          .filter((player) => String(player?.playerKey || "").toLowerCase() === playerKey)
          .slice(0, 1);
        state.leaderboardRemote = {
          ...(state.leaderboardRemote || {}),
          playerStats: {
            playerKey,
            players,
            status: "synced",
            message: players.length ? "Статы игрока загружены" : "Статы игрока пустые",
            fetchedAt: new Date().toISOString(),
            configured: true
          }
        };
        if (options.renderOnDone) renderLeaderboard();
        return true;
      } catch (error) {
        state.leaderboardRemote = {
          ...(state.leaderboardRemote || {}),
          playerStats: {
            ...(state.leaderboardRemote?.playerStats || {}),
            playerKey,
            status: "failed",
            message: error?.message || "Не удалось загрузить статы игрока",
            fetchedAt: new Date().toISOString(),
            configured: false
          }
        };
        if (options.renderOnDone) renderLeaderboard();
        return false;
      }
    }

    // Cross-device graph: fetch the player's per-hand chart points recorded by
    // hand-sync on ANY device (view=graph), expand them into graph entries the
    // local chart pipeline already understands, and cache them on
    // state.leaderboardRemote.graphHands. The local hand log stays the richer
    // source — mergeGraphEntries dedupes by sessionId:handNo:tableId with
    // local entries first.
    let remoteGraphHandsInflight = null;

    function refreshRemoteGraphHands(options = {}) {
      const state = currentState();
      if (!state || typeof windowRef.fetch !== "function") return Promise.resolve(false);
      if (remoteGraphHandsInflight) return remoteGraphHandsInflight;
      remoteGraphHandsInflight = runRemoteGraphHandsRefresh(state, options).finally(() => {
        remoteGraphHandsInflight = null;
      });
      return remoteGraphHandsInflight;
    }

    async function runRemoteGraphHandsRefresh(state, options = {}) {
      const profile = activeSimulatorProfile();
      if (!isPublicLeaderboardProfile(profile)) return false;
      const playerKey = leaderboardPlayerKey({ profile });
      const endpoint = simulatorGraphSeriesEndpoint(playerKey);
      state.leaderboardRemote = {
        ...(state.leaderboardRemote || {}),
        graphHands: {
          ...(state.leaderboardRemote?.graphHands || {}),
          playerKey,
          status: "loading"
        }
      };
      try {
        const response = await windowRef.fetch(endpoint, {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.configured) {
          state.leaderboardRemote = {
            ...(state.leaderboardRemote || {}),
            graphHands: {
              playerKey,
              entries: state.leaderboardRemote?.graphHands?.entries || [],
              status: result?.configured === false ? "not-configured" : "failed",
              message: result?.error || `HTTP ${response.status || 0}`,
              fetchedAt: new Date().toISOString(),
              configured: Boolean(result?.configured)
            }
          };
          if (options.renderOnDone) renderLeaderboard();
          return false;
        }
        const entries = expandRemoteGraphSessions(result.sessions);
        state.leaderboardRemote = {
          ...(state.leaderboardRemote || {}),
          graphHands: {
            playerKey,
            entries,
            hands: entries.length,
            status: "synced",
            message: entries.length ? `Руки для графика: ${entries.length}` : "Серверных рук пока нет",
            fetchedAt: new Date().toISOString(),
            configured: true
          }
        };
        if (options.renderOnDone) renderLeaderboard();
        return true;
      } catch (error) {
        state.leaderboardRemote = {
          ...(state.leaderboardRemote || {}),
          graphHands: {
            ...(state.leaderboardRemote?.graphHands || {}),
            playerKey,
            status: "failed",
            message: error?.message || "Не удалось загрузить руки для графика",
            fetchedAt: new Date().toISOString()
          }
        };
        if (options.renderOnDone) renderLeaderboard();
        return false;
      }
    }

    // view=graph point tuple: [handNo, tableId, playedAtMs, netBb, evBb, won].
    function expandRemoteGraphSessions(sessions) {
      const entries = [];
      (Array.isArray(sessions) ? sessions : []).slice(0, 500).forEach((session) => {
        const sessionId = String(session?.sessionId || "").slice(0, 80);
        if (!sessionId) return;
        const playerCount = Math.max(0, Math.round(Number(session?.playerCount || 0)));
        const difficulty = String(session?.difficulty || "").slice(0, 24);
        (Array.isArray(session?.hands) ? session.hands : []).slice(0, 5000).forEach((point) => {
          if (!Array.isArray(point) || point.length < 5) return;
          const handNo = Math.max(0, Math.round(Number(point[0]) || 0));
          const tableId = Math.max(0, Math.round(Number(point[1]) || 0));
          const playedAtMs = Number(point[2]) || 0;
          const netBb = Number(point[3]);
          const evBb = Number(point[4]);
          if (!handNo || !Number.isFinite(netBb)) return;
          entries.push({
            sessionId,
            handNo,
            tableId,
            playedAt: playedAtMs > 0 ? new Date(playedAtMs).toISOString() : "",
            source: "remote-graph",
            result: {
              netBb,
              won: Number(point[5]) === 1
            },
            evNetBb: Number.isFinite(evBb) ? evBb : netBb,
            settings: {
              playerCount,
              difficulty
            }
          });
        });
      });
      return entries.slice(0, 5000);
    }

    async function deleteCurrentLeaderboardEntry(options = {}) {
      if (isSessionReadOnly()) {
        markSessionReadOnly();
        renderLeaderboard();
        return false;
      }
      const state = currentState();
      const entry = options.entry || currentLeaderboardEntry();
      if (!state || !entry || typeof windowRef.fetch !== "function") return false;
      const endpoint = simulatorArchiveEndpoint();
      const token = String(options.deleteToken || leaderboardDeleteTokenForEntry(entry) || "");
      state.leaderboardSync = {
        ...(state.leaderboardSync || {}),
        status: "pending",
        message: "Удаляем запись рейтинга",
        attemptedAt: new Date().toISOString(),
        lastAttemptAt: Date.now()
      };
      try {
        const body = token ? JSON.stringify({ deleteToken: token }) : "";
        const response = await windowRef.fetch(endpoint, {
          method: "DELETE",
          headers: token ? { "Content-Type": "application/json" } : {},
          body: body || undefined
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.ok === false) {
          state.leaderboardSync = {
            ...(state.leaderboardSync || {}),
            status: "failed",
            message: result?.error || `HTTP ${response.status}`
          };
          renderLeaderboard();
          return false;
        }
        const key = leaderboardPlayerKey(entry);
        state.leaderboard = (state.leaderboard || []).filter((item) => leaderboardPlayerKey(item) !== key);
        state.leaderboardRemote.entries = (state.leaderboardRemote.entries || []).filter((item) => leaderboardPlayerKey(item) !== key);
        saveLeaderboardData(state.leaderboard, { replace: true });
        removeLeaderboardDeleteToken(entry);
        state.leaderboardSync = {
          ...(state.leaderboardSync || {}),
          status: "synced",
          message: "Запись рейтинга удалена",
          syncedAt: new Date().toISOString(),
          lastEntryId: "",
          lastEntryUpdatedAt: ""
        };
        renderLeaderboard();
        return true;
      } catch (error) {
        state.leaderboardSync = {
          ...(state.leaderboardSync || {}),
          status: "failed",
          message: error?.message || "Не удалось удалить запись рейтинга"
        };
        renderLeaderboard();
        return false;
      }
    }

    return {
      compactSessionMetrics,
      sanitizeProfileSnapshot,
      isPublicLeaderboardProfile,
      normalizeLeaderboardEntry,
      leaderboardPlayerKey,
      aggregateLeaderboardEntriesByPlayer,
      sortLeaderboardEntries,
      leaderboardRatingFromMetrics,
      loadLeaderboardData,
      saveLeaderboardData,
      loadLeaderboardDeleteTokens,
      saveLeaderboardDeleteTokens,
      leaderboardDeleteTokenForEntry,
      mergeLeaderboardEntries,
      leaderboardEntryFromArchive,
      currentLeaderboardEntry,
      migrateCurrentGuestLeaderboardToProfile,
      refreshCurrentLeaderboardEntry,
      remoteLeaderboardUsable,
      remoteCoversCurrentEntry,
      sanitizeLeaderboardFilters,
      leaderboardEntries,
      currentLeaderboardPlayerEntry,
      leaderboardRankFor,
      simulatorArchiveEndpoint,
      simulatorLeaderboardEndpoint,
      simulatorPlayerStatsEndpoint,
      canSyncLeaderboardProfile,
      shouldSyncCurrentLeaderboardSnapshot,
      isLeaderboardEndpointNotConfigured,
      syncCurrentLeaderboardSnapshot,
      refreshRemoteLeaderboard,
      refreshRemotePlayerStats,
      refreshRemoteGraphHands,
      deleteCurrentLeaderboardEntry
    };
  }

  root.PokerSimulatorSessionLeaderboard = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSessionLeaderboard;
})();
