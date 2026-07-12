(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const leaderboardQualificationHands = 20;
  // Mirrors the server caps in api/simulator-sessions.js so a corrupted or
  // hand-edited local entry (hands: Infinity, bb100: 1e12) cannot dominate
  // the local leaderboard the way it cannot dominate the public one.
  const leaderboardMaxHands = 100000;
  const leaderboardMaxBbPerHand = 2.2;
  const leaderboardMaxBb100 = 220;
  const ownerLeaderboardProfile = {
    id: "google_4a86593c06f5c8102d161e52",
    name: "Lorem CDMX (Fedor Truntsev)"
  };
  const ownerLeaderboardAliasKeys = new Set([
    `id:${ownerLeaderboardProfile.id}`,
    "name:loremcdmx",
    "name:ты",
    "name:babyshark14"
  ]);

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clampedCount(value, max = Number.MAX_SAFE_INTEGER) {
    return Math.min(max, Math.max(0, finiteNumber(value, 0)));
  }

  function clampedBb100(value) {
    return Math.max(-leaderboardMaxBb100, Math.min(leaderboardMaxBb100, finiteNumber(value, 0)));
  }

  function clampedNetBb(value, hands) {
    const cap = leaderboardMaxBbPerHand * Math.max(1, finiteNumber(hands, 0));
    return Math.max(-cap, Math.min(cap, finiteNumber(value, 0)));
  }

  function roundBbMetric(value) {
    return Math.round(finiteNumber(value, 0) * 10) / 10;
  }

  function ratio(part, total) {
    return total ? Number(part || 0) / Number(total || 0) : 0;
  }

  function clampRate(value) {
    return Math.max(0, Math.min(1, Number(value || 0)));
  }

  function sanitizeProfileSnapshot(profile) {
    const id = String(profile?.id || "guest").slice(0, 80);
    return canonicalLeaderboardProfile({
      id,
      name: String(profile?.name || (id === "guest" ? "Guest" : id)).slice(0, 80),
      loggedIn: Boolean(id && id !== "guest"),
      authenticated: Boolean(profile?.authenticated || profile?.authProvider),
      createdAt: typeof profile?.createdAt === "string" ? profile.createdAt : "",
      updatedAt: typeof profile?.updatedAt === "string" ? profile.updatedAt : ""
    });
  }

  function isPublicLeaderboardProfile(profile) {
    const snapshot = sanitizeProfileSnapshot(profile);
    const nameKey = normalizeLeaderboardPlayerName(snapshot.name);
    return Boolean(
      snapshot.id &&
      snapshot.id !== "guest" &&
      nameKey &&
      !isGuestProfileName(nameKey)
    );
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

  function rawLeaderboardPlayerKey(entry) {
    const profile = entry?.profile || entry || {};
    const id = String(profile.id || "").toLowerCase();
    if (profile.authenticated && id && id !== "guest") return `id:${id}`;
    const nameKey = normalizeLeaderboardPlayerName(profile.name);
    if (nameKey && !isGuestProfileName(nameKey)) return `name:${nameKey}`;
    return id && id !== "guest" ? `id:${id}` : "id:guest";
  }

  function canonicalLeaderboardPlayerKey(playerKey) {
    const key = String(playerKey || "").trim().toLowerCase();
    if (!key) return "";
    return ownerLeaderboardAliasKeys.has(key) ? `id:${ownerLeaderboardProfile.id}` : key;
  }

  function canonicalLeaderboardProfile(profile = {}) {
    const source = profile && typeof profile === "object" ? profile : {};
    const rawKey = rawLeaderboardPlayerKey(source);
    if (!ownerLeaderboardAliasKeys.has(rawKey)) return source;
    return {
      ...source,
      id: ownerLeaderboardProfile.id,
      name: ownerLeaderboardProfile.name,
      loggedIn: true,
      authenticated: true
    };
  }

  function leaderboardPlayerKey(entry) {
    const profile = sanitizeProfileSnapshot(entry?.profile || entry);
    return canonicalLeaderboardPlayerKey(rawLeaderboardPlayerKey(profile));
  }

  function leaderboardRatingFromMetrics(metrics = {}) {
    const pokerStats = metrics?.pokerStats || metrics || {};
    const hands = clampedCount(metrics?.hands || pokerStats.hands || 0, leaderboardMaxHands);
    const actualNetBb = roundBbMetric(clampedNetBb(pokerStats.netBb ?? metrics?.netBb ?? 0, hands));
    const netBb = roundBbMetric(clampedNetBb(pokerStats.evNetBb ?? metrics?.evNetBb ?? metrics?.leaderboardNetBb ?? actualNetBb, hands));
    const bb100 = Number.isFinite(Number(pokerStats.evBb100 ?? metrics?.evBb100 ?? metrics?.leaderboardBb100))
      ? roundBbMetric(clampedBb100(pokerStats.evBb100 ?? metrics?.evBb100 ?? metrics?.leaderboardBb100))
      : hands
      ? roundBbMetric(clampedBb100((netBb / hands) * 100))
      : 0;
    if (!hands) {
      return {
        score: 0,
        hands: 0,
        netBb,
        bb100,
        confidence: 0,
        sampleWeight: 0,
        qualified: false,
        neededHands: leaderboardQualificationHands,
        qualificationHands: leaderboardQualificationHands,
        qualificationProgress: 0,
        volumePoints: 0,
        pacePoints: 0
      };
    }

    const confidence = 1 - Math.exp(-hands / 80);
    const sampleWeight = Math.max(0.08, confidence);
    const qualified = hands >= leaderboardQualificationHands;
    const neededHands = Math.max(0, leaderboardQualificationHands - hands);
    const qualificationProgress = Math.min(1, hands / leaderboardQualificationHands);
    const shortSamplePenalty = qualified ? 1 : Math.max(0.25, qualificationProgress * 0.75);
    const volumePoints = netBb * sampleWeight * shortSamplePenalty;
    const cappedBb100 = Math.max(-120, Math.min(220, bb100));
    const pacePoints = cappedBb100 * 0.04 * confidence * shortSamplePenalty;
    return {
      score: roundBbMetric(volumePoints + pacePoints),
      hands,
      netBb,
      bb100,
      evNetBb: netBb,
      evBb100: bb100,
      actualNetBb,
      confidence: Math.round(confidence * 1000) / 1000,
      sampleWeight: Math.round(sampleWeight * 1000) / 1000,
      qualified,
      neededHands,
      qualificationHands: leaderboardQualificationHands,
      qualificationProgress: Math.round(qualificationProgress * 1000) / 1000,
      volumePoints: roundBbMetric(volumePoints),
      pacePoints: roundBbMetric(pacePoints)
    };
  }

  function compactSessionMetrics(metrics) {
    const pokerStats = metrics?.pokerStats || metrics || {};
    const hands = clampedCount(metrics?.hands || pokerStats.hands || 0, leaderboardMaxHands);
    const wins = clampedCount(metrics?.wins || pokerStats.wins || 0, hands || leaderboardMaxHands);
    const netBb = roundBbMetric(clampedNetBb(pokerStats.netBb ?? metrics?.netBb ?? 0, hands));
    const bb100 = Number.isFinite(Number(pokerStats.bb100 ?? metrics?.bb100))
      ? roundBbMetric(clampedBb100(pokerStats.bb100 ?? metrics?.bb100))
      : hands
      ? roundBbMetric(clampedBb100((netBb / hands) * 100))
      : 0;
    const winRate = clampRate(metrics?.winRate ?? pokerStats.winRate ?? ratio(wins, hands));
    const evWins = clampedCount(metrics?.evWins ?? pokerStats.evWins ?? wins, hands || leaderboardMaxHands);
    const evNetBb = roundBbMetric(clampedNetBb(pokerStats.evNetBb ?? metrics?.evNetBb ?? netBb, hands));
    const evBb100 = Number.isFinite(Number(pokerStats.evBb100 ?? metrics?.evBb100))
      ? roundBbMetric(clampedBb100(pokerStats.evBb100 ?? metrics?.evBb100))
      : hands
      ? roundBbMetric(clampedBb100((evNetBb / hands) * 100))
      : 0;
    const evWinRate = clampRate(metrics?.evWinRate ?? pokerStats.evWinRate ?? ratio(evWins, hands) ?? winRate);
    const compact = {
      hands,
      handLogHands: clampedCount(metrics?.handLogHands || 0, leaderboardMaxHands),
      wins,
      folds: clampedCount(metrics?.folds || pokerStats.folds || 0),
      showdowns: clampedCount(metrics?.showdowns || pokerStats.showdowns || 0),
      decisions: clampedCount(metrics?.decisions || 0),
      good: clampedCount(metrics?.good || 0),
      leaks: clampedCount(metrics?.leaks || 0),
      aggressive: clampedCount(metrics?.aggressive || 0),
      score: roundBbMetric(metrics?.score || 0),
      netBb,
      bb100,
      winRate,
      evWins,
      evNetBb,
      evBb100,
      evWinRate,
      goodRate: clampRate(metrics?.goodRate),
      leakRate: clampRate(metrics?.leakRate),
      aggressionRate: clampRate(metrics?.aggressionRate)
    };
    const rating = leaderboardRatingFromMetrics(compact);
    return {
      ...compact,
      leaderboardScore: rating.score,
      leaderboardConfidence: rating.confidence,
      leaderboardNetBb: rating.netBb,
      leaderboardBb100: rating.bb100
    };
  }

  function normalizeLeaderboardEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const metrics = compactSessionMetrics(entry.metrics || {});
    const rating = leaderboardRatingFromMetrics(metrics);
    if (!rating.hands) return null;
    const profile = sanitizeProfileSnapshot(entry.profile);
    const sessionId = String(entry.sessionId || entry.session?.sessionId || "").slice(0, 80);
    const id = String(entry.id || `${profile.id}:${sessionId || entry.updatedAt || Date.now()}`).slice(0, 180);
    const sessionCount = Math.max(1, finiteNumber(entry.sessionCount, 1));
    return {
      schema: "poker-simulator-leaderboard-entry-v1",
      id,
      sessionId,
      playerKey: leaderboardPlayerKey({ profile }),
      sessionCount,
      label: String(entry.label || "Сессия").slice(0, 80),
      source: String(entry.source || "local").slice(0, 40),
      updatedAt: typeof entry.updatedAt === "string" && entry.updatedAt ? entry.updatedAt : new Date().toISOString(),
      profile,
      mode: String(entry.mode || entry.settings?.simulationMode || "").slice(0, 40),
      tableCount: Math.max(0, finiteNumber(entry.tableCount ?? entry.settings?.tableCount, 0)),
      playerCount: Math.max(0, finiteNumber(entry.playerCount ?? entry.settings?.playerCount, 0)),
      // Filter facets: lineup difficulty travels with each session snapshot
      // (local archive/current always know it; older remote rows may not).
      difficulty: String(entry.difficulty || entry.settings?.difficulty || "").slice(0, 16),
      botLineup: String(entry.botLineup || entry.settings?.botLineup || "").slice(0, 24),
      // Per-session breakdown from the server aggregate (cross-device union
      // by sessionId); absent on local rows and legacy remote responses.
      ...(Array.isArray(entry.sessions)
        ? {
            sessions: entry.sessions
              .map((session) => {
                const sid = String(session?.sessionId || "").slice(0, 80);
                if (!sid) return null;
                return {
                  sessionId: sid,
                  updatedAt: typeof session?.updatedAt === "string" ? session.updatedAt : "",
                  playerCount: Math.max(0, finiteNumber(session?.playerCount, 0)),
                  difficulty: String(session?.difficulty || "").slice(0, 16),
                  metrics: compactSessionMetrics(session?.metrics || {})
                };
              })
              .filter(Boolean)
              .slice(0, 60)
          }
        : {}),
      metrics,
      rating
    };
  }

  function aggregateLeaderboardMetrics(entries) {
    const totals = (Array.isArray(entries) ? entries : []).reduce((acc, entry) => {
      const metrics = compactSessionMetrics(entry?.metrics || {});
      acc.hands += metrics.hands;
      acc.handLogHands += metrics.handLogHands;
      acc.wins += metrics.wins;
      acc.folds += metrics.folds;
      acc.showdowns += metrics.showdowns;
      acc.decisions += metrics.decisions;
      acc.good += metrics.good;
      acc.leaks += metrics.leaks;
      acc.aggressive += metrics.aggressive;
      acc.score = roundBbMetric(acc.score + metrics.score);
      acc.netBb = roundBbMetric(acc.netBb + metrics.netBb);
      acc.evWins += metrics.evWins;
      acc.evNetBb = roundBbMetric(acc.evNetBb + metrics.evNetBb);
      acc.evBb100Hands = roundBbMetric(acc.evBb100Hands + metrics.evBb100 * metrics.hands);
      return acc;
    }, { hands: 0, handLogHands: 0, wins: 0, folds: 0, showdowns: 0, decisions: 0, good: 0, leaks: 0, aggressive: 0, score: 0, netBb: 0, evWins: 0, evNetBb: 0, evBb100Hands: 0 });

    totals.winRate = ratio(totals.wins, totals.hands);
    totals.bb100 = totals.hands ? roundBbMetric((totals.netBb / totals.hands) * 100) : 0;
    totals.evWins = Math.round(totals.evWins * 1000) / 1000;
    totals.evWinRate = ratio(totals.evWins, totals.hands);
    totals.evBb100 = totals.hands ? roundBbMetric(totals.evBb100Hands / totals.hands) : 0;
    delete totals.evBb100Hands;
    totals.goodRate = ratio(totals.good, totals.decisions);
    totals.leakRate = ratio(totals.leaks, totals.decisions);
    totals.aggressionRate = ratio(totals.aggressive, totals.decisions);
    return compactSessionMetrics(totals);
  }

  function aggregateLeaderboardEntriesByPlayer(entries) {
    const groups = new Map();
    (Array.isArray(entries) ? entries : [])
      .map(normalizeLeaderboardEntry)
      .filter(Boolean)
      .forEach((entry) => {
        const key = leaderboardPlayerKey(entry);
        groups.set(key, [...(groups.get(key) || []), entry]);
      });

    return [...groups.entries()].map(([key, group]) => {
      const latest = group
        .slice()
        .sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))[0];
      const sameMode = [...new Set(group.map((entry) => entry.mode).filter(Boolean))];
      const sameTableCount = [...new Set(group.map((entry) => Number(entry.tableCount || 0)).filter(Boolean))];
      const samePlayerCount = [...new Set(group.map((entry) => Number(entry.playerCount || 0)).filter(Boolean))];
      const sameDifficulty = [...new Set(group.map((entry) => entry.difficulty).filter(Boolean))];
      const sameBotLineup = [...new Set(group.map((entry) => entry.botLineup).filter(Boolean))];
      return normalizeLeaderboardEntry({
        id: `player:${key}`.slice(0, 180),
        sessionId: "",
        playerKey: key,
        sessionCount: group.reduce((sum, entry) => sum + Math.max(1, Number(entry.sessionCount || 1)), 0),
        label: latest?.label || "Player total",
        source: "aggregate",
        updatedAt: latest?.updatedAt || new Date().toISOString(),
        profile: latest?.profile,
        mode: sameMode.length === 1 ? sameMode[0] : "",
        tableCount: sameTableCount.length === 1 ? sameTableCount[0] : 0,
        playerCount: samePlayerCount.length === 1 ? samePlayerCount[0] : 0,
        difficulty: sameDifficulty.length === 1 ? sameDifficulty[0] : "",
        botLineup: sameBotLineup.length === 1 ? sameBotLineup[0] : "",
        metrics: aggregateLeaderboardMetrics(group)
      });
    }).filter(Boolean);
  }

  function sortLeaderboardEntries(entries) {
    return (Array.isArray(entries) ? entries : [])
      .map(normalizeLeaderboardEntry)
      .filter(Boolean)
      .sort((left, right) => (
        Number(Boolean(right.rating?.qualified)) - Number(Boolean(left.rating?.qualified))
        || Number(right.rating?.score || 0) - Number(left.rating?.score || 0)
        || Number(right.metrics?.hands || 0) - Number(left.metrics?.hands || 0)
        || Number(right.metrics?.netBb || 0) - Number(left.metrics?.netBb || 0)
        || String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
        || String(left.profile?.name || "").localeCompare(String(right.profile?.name || ""))
        || String(left.playerKey || "").localeCompare(String(right.playerKey || ""))
        || String(left.id || "").localeCompare(String(right.id || ""))
      ));
  }

  root.PokerSimulatorLeaderboard = {
    finiteNumber,
    roundBbMetric,
    ratio,
    clampRate,
    leaderboardQualificationHands,
    sanitizeProfileSnapshot,
    normalizeLeaderboardPlayerName,
    isPublicLeaderboardProfile,
    canonicalLeaderboardPlayerKey,
    leaderboardPlayerKey,
    leaderboardRatingFromMetrics,
    compactSessionMetrics,
    normalizeLeaderboardEntry,
    aggregateLeaderboardMetrics,
    aggregateLeaderboardEntriesByPlayer,
    sortLeaderboardEntries
  };
})();
