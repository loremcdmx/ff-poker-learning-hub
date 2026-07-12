(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  // Cross-session "all-time" metrics concern, carved out of simulator-session-store.js.
  // NOTE: named -totals (not -metrics) because simulator-session-metrics.js already
  // exists as the per-session compute module; this is the distinct cross-device
  // aggregation the store used to host. It owns the allTimeExtra memo and reads the
  // archiveRevision counter (owned by the composer, bumped by the archive module)
  // through ctx.getArchiveRevision so its HUD-render cache invalidates correctly.
  // loadSessionArchive is read lazily — the archive module composes after this one.
  function model(ctx = {}) {
    const currentState = typeof ctx.currentState === "function" ? ctx.currentState : () => null;
    const activeSimulatorProfile = typeof ctx.activeSimulatorProfile === "function" ? ctx.activeSimulatorProfile : () => ({});
    const compactSessionMetrics = typeof ctx.compactSessionMetrics === "function" ? ctx.compactSessionMetrics : (metrics) => (metrics && typeof metrics === "object" ? { ...metrics } : {});
    const leaderboardPlayerKey = typeof ctx.leaderboardPlayerKey === "function" ? ctx.leaderboardPlayerKey : () => "";
    const normalizeLeaderboardEntry = typeof ctx.normalizeLeaderboardEntry === "function" ? ctx.normalizeLeaderboardEntry : () => null;
    const getArchiveRevision = typeof ctx.getArchiveRevision === "function" ? ctx.getArchiveRevision : () => 0;
    const finiteNumber = typeof ctx.finiteNumber === "function" ? ctx.finiteNumber : (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
    const roundBbMetric = typeof ctx.roundBbMetric === "function" ? ctx.roundBbMetric : (value) => Math.round(finiteNumber(value, 0) * 10) / 10;
    const ratio = typeof ctx.ratio === "function" ? ctx.ratio : (part, total) => (total ? Number(part || 0) / Number(total || 0) : 0);
    // Archive helper read lazily — the archive module composes after this one.
    const loadSessionArchive = (...args) => (typeof ctx.loadSessionArchive === "function" ? ctx.loadSessionArchive(...args) : []);

    let allTimeExtraCache = { key: "", totals: null };

    // Lifetime hand-count high-water mark. The all-time HAND COUNT must never go
    // backwards. The heavy per-session archive (full hand logs) gets quota-evicted
    // when localStorage fills — saveSessionArchive truncates/wipes it — which drops
    // the recomputed past-session hand total and made the HUD "Всё время" count
    // "periodically reset". This ratchets a tiny per-profile counter in its OWN key
    // (only ever overwritten with a larger number, never grown structurally, so it
    // survives the very eviction that truncates the bulky archive) and floors the
    // past-session hand count to it. Only the COUNT is recovered — rate stats
    // (VPIP/PFR/bb100) stay on the live per-hand sample by design.
    const LIFETIME_HANDS_KEY = "ff.poker.sim.lifetime-extra-hands.v1";
    const LIFETIME_MAX_PROFILES = 24;
    function readLifetimeStore() {
      try {
        const raw = root.localStorage && root.localStorage.getItem(LIFETIME_HANDS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch (e) {
        return {};
      }
    }
    function liftExtraHandsHighWater(profileKey, hands) {
      const key = String(profileKey || "");
      const count = Math.max(0, Math.floor(Number(hands) || 0));
      if (!key) return count;
      const store = readLifetimeStore();
      const stored = Math.max(0, Math.floor(Number(store[key]) || 0));
      if (count <= stored) return stored; // archive shrank — hold the high-water
      store[key] = count;
      // Keep the map tiny so it can never itself become the thing that fills quota:
      // retain only the highest-count profiles.
      let next = store;
      const allKeys = Object.keys(store);
      if (allKeys.length > LIFETIME_MAX_PROFILES) {
        allKeys.sort((a, b) => (Number(store[b]) || 0) - (Number(store[a]) || 0));
        next = {};
        allKeys.slice(0, LIFETIME_MAX_PROFILES).forEach((k) => { next[k] = store[k]; });
      }
      try {
        if (root.localStorage) root.localStorage.setItem(LIFETIME_HANDS_KEY, JSON.stringify(next));
      } catch (e) {
        // Quota full even for the tiny key (overwrite should normally succeed) —
        // the in-memory return still floors the display this render.
      }
      return count;
    }

    function aggregateArchiveTotals(records) {
      const totals = (Array.isArray(records) ? records : []).reduce((acc, record) => {
        const metrics = compactSessionMetrics(record?.metrics || {});
        acc.sessions += 1;
        acc.hands += metrics.hands;
        acc.handLogHands += metrics.handLogHands;
        acc.wins += metrics.wins;
        acc.folds += metrics.folds;
        acc.showdowns += metrics.showdowns;
        acc.decisions += metrics.decisions;
        acc.good += metrics.good;
        acc.leaks += metrics.leaks;
        acc.score += metrics.score;
        acc.netBb = roundBbMetric(acc.netBb + metrics.netBb);
        acc.evWins += metrics.evWins;
        acc.evNetBb = roundBbMetric(acc.evNetBb + metrics.evNetBb);
        return acc;
      }, { sessions: 0, hands: 0, handLogHands: 0, wins: 0, folds: 0, showdowns: 0, decisions: 0, good: 0, leaks: 0, score: 0, netBb: 0, evWins: 0, evNetBb: 0, winRate: 0, bb100: 0, evWinRate: 0, evBb100: 0 });
      totals.winRate = ratio(totals.wins, totals.hands);
      totals.bb100 = totals.hands ? roundBbMetric((totals.netBb / totals.hands) * 100) : 0;
      totals.evWins = Math.round(totals.evWins * 1000) / 1000;
      totals.evWinRate = ratio(totals.evWins, totals.hands);
      totals.evBb100 = totals.hands ? roundBbMetric((totals.evNetBb / totals.hands) * 100) : 0;
      return totals;
    }

    // Totals of sessions NOT covered by the live hand source: archived
    // sessions of the active player plus remote-only sessions (other
    // devices). Feeds the HUD "Всё время" scope so it counts every hand the
    // player has anywhere, while rate stats (VPIP/PFR/...) stay on the local
    // per-hand sample. Cached: this runs on every HUD render, so the cache
    // key avoids touching localStorage — archiveRevision bumps on each
    // saveSessionArchive write, remote facets invalidate via fetchedAt.
    function allTimeExtraSessionTotals() {
      const state = currentState();
      // sampledHands = hands actually BACKED by aggregated BB/win data (the summed
      // per-session hands). countOnlyHands = high-water surplus with NO BB data
      // (sessions whose archive was quota-evicted). `hands` is the DISPLAY count
      // (sampled + countOnly). Rate denominators must divide by sampledHands, never
      // by `hands`, or an eviction collapses all-time Winrate/BB100. See BUGHUNT F022.
      const zero = { hands: 0, sampledHands: 0, countOnlyHands: 0, wins: 0, folds: 0, showdowns: 0, netBb: 0, evNetBb: 0, evWins: 0, sessions: 0 };
      if (!state) return zero;
      const profile = activeSimulatorProfile();
      const myKey = leaderboardPlayerKey({ profile });
      // Profile identity MUST be part of the cache key: the body filters by myKey,
      // so without it the memo returns the previous account's totals after a
      // login/logout/profile switch (the other key parts can be unchanged).
      const cacheKey = [
        myKey,
        state.sessionId,
        getArchiveRevision(),
        (state.leaderboard || []).length,
        String(state.leaderboardRemote?.fetchedAt || ""),
        (state.leaderboardRemote?.entries || []).length,
        String(state.leaderboardRemote?.playerStats?.fetchedAt || ""),
        (state.leaderboardRemote?.playerStats?.players || []).length
      ].join(":");
      if (allTimeExtraCache.key === cacheKey && allTimeExtraCache.totals) return allTimeExtraCache.totals;
      const currentSessionId = String(state.sessionId || "");
      // Same union rule as leaderboardEntries: the richer copy of the SAME
      // session wins, so HUD totals match the player's leaderboard row.
      const bySession = new Map();
      const consider = (sessionId, metrics) => {
        const sid = String(sessionId || "");
        if (!sid || sid === currentSessionId) return;
        const compact = compactSessionMetrics(metrics || {});
        if (!Number(compact.hands)) return;
        const existing = bySession.get(sid);
        if (!existing || Number(compact.hands) >= Number(existing.hands)) bySession.set(sid, compact);
      };
      loadSessionArchive().forEach((record) => {
        if (leaderboardPlayerKey({ profile: record.profile }) !== myKey) return;
        consider(record.sessionId || record.session?.sessionId, record.metrics);
      });
      // Locally published per-session snapshots (keys.leaderboard). They are
      // compact, so they survive when the full-payload session archive gets
      // quota-truncated — and they are the SAME source the leaderboard list
      // aggregates, so the HUD "Всё время" total tracks the player's
      // leaderboard row instead of collapsing to the live session.
      (state.leaderboard || [])
        .map(normalizeLeaderboardEntry)
        .filter(Boolean)
        .forEach((entry) => {
          if (leaderboardPlayerKey(entry) !== myKey) return;
          consider(entry.sessionId, entry.metrics);
        });
      (state.leaderboardRemote?.entries || [])
        .map(normalizeLeaderboardEntry)
        .filter(Boolean)
        .forEach((row) => {
          if (leaderboardPlayerKey(row) !== myKey || !Array.isArray(row.sessions)) return;
          row.sessions.forEach((session) => consider(session?.sessionId, session?.metrics));
        });
      // Rich per-player stats are fetched from `view=players` for the active
      // profile. They carry the same session breakdown plus saved-HH metrics, so
      // HUD "Всё время" can show the actual all-time result, not just a restored
      // hand-count high-water mark.
      const remotePlayerStats = state.leaderboardRemote?.playerStats;
      (Array.isArray(remotePlayerStats?.players) ? remotePlayerStats.players : [])
        .filter((player) => String(player?.playerKey || "").toLowerCase() === myKey)
        .forEach((player) => {
          (Array.isArray(player.sessions) ? player.sessions : [])
            .forEach((session) => consider(session?.sessionId, session?.metrics));
          (Array.isArray(player.handHistory?.sessions) ? player.handHistory.sessions : [])
            .forEach((session) => consider(session?.sessionId, session?.metrics));
        });
      const totals = [...bySession.values()].reduce((acc, metrics) => ({
        hands: acc.hands + Number(metrics.hands || 0),
        wins: acc.wins + Number(metrics.wins || 0),
        folds: acc.folds + Number(metrics.folds || 0),
        showdowns: acc.showdowns + Number(metrics.showdowns || 0),
        netBb: roundBbMetric(acc.netBb + Number(metrics.netBb || 0)),
        evNetBb: roundBbMetric(acc.evNetBb + Number(metrics.evNetBb || 0)),
        evWins: acc.evWins + Number(metrics.evWins || 0),
        sessions: acc.sessions + 1
      }), zero);
      // The summed hands ARE backed by BB/win data — they feed the rate denominator.
      totals.sampledHands = totals.hands;
      // Floor the past-session hand COUNT to the per-profile high-water so the HUD
      // "Всё время" total survives a quota-eviction of the bulky session archive.
      totals.hands = liftExtraHandsHighWater(myKey, totals.hands);
      // BUGHUNT F022 (2026-07-01): the high-water surplus (hands whose sessions were
      // quota-evicted, so their BB totals are GONE) may exceed the summed hands. Keep
      // it as a count-only quantity so allTimeDisplayPokerStats can top up the shown
      // hand COUNT without diluting the rate denominator (which stays sampledHands).
      totals.countOnlyHands = Math.max(0, totals.hands - totals.sampledHands);
      allTimeExtraCache = { key: cacheKey, totals };
      return totals;
    }

    return {
      aggregateArchiveTotals,
      allTimeExtraSessionTotals
    };
  }

  root.PokerSimulatorSessionTotals = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSessionTotals;
})();
