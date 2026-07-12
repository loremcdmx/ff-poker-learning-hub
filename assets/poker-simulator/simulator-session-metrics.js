(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const handLogKit = options.handLogKit || root.PokerSimulatorHandLog || {};
    const leaderboardRatingFromMetrics = typeof options.leaderboardRatingFromMetrics === "function" ? options.leaderboardRatingFromMetrics : () => ({});
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : (value) => String(value ?? "");
    const handLogOptions = options.handLogOptions && typeof options.handLogOptions === "object" ? options.handLogOptions : {};
    const limits = options.limits || {};
    const sessionHistoryLimit = Math.max(1, Number(limits.sessionHistory || 500));
    const sessionDecisionLimit = Math.max(1, Number(limits.sessionDecision || 2000));
    const foldAnyEventLimit = Math.max(1, Number(limits.foldAnyEvent || 2000));
    const handLogLimit = Math.max(1, Number(limits.handLog || 5000));

    function state() {
      return getState() || {};
    }

    function statsEntryKey(entry) {
      if (!entry || typeof entry !== "object") return "";
      return [
        entry.id || "",
        entry.no || "",
        entry.handNo || "",
        entry.tableId || "",
        entry.playedAt || "",
        entry.result?.text || entry.result || "",
        entry.result?.outcome || entry.outcome || "",
        entry.result?.netBb ?? entry.netBb ?? "",
        entry.result?.showdown || entry.showdown ? "showdown" : "",
        entry.result?.folded || entry.fold ? "folded" : "",
        entry.stats?.preflop?.vpip ? "vpip" : "",
        entry.stats?.preflop?.pfr ? "pfr" : "",
        entry.stats?.preflop?.threeBet ? "3b" : "",
        Array.isArray(entry.handHistory?.actions) ? entry.handHistory.actions.length : "",
        compactEntryChecksum(entry)
      ].join("|");
    }

    function compactEntryChecksum(entry) {
      const text = JSON.stringify([
        entry?.result || null,
        entry?.stats || null,
        entry?.handHistory?.status || "",
        entry?.handHistory?.result || "",
        entry?.handHistory?.pot || 0,
        entry?.handHistory?.board || [],
        Array.isArray(entry?.handHistory?.seats)
          ? entry.handHistory.seats.map((seat) => [seat?.id, seat?.folded, seat?.stack, Array.isArray(seat?.cards) ? seat.cards.join("") : ""])
          : []
      ]);
      let hash = 0;
      for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
      }
      return hash.toString(36);
    }

    function decisionEntryKey(entry) {
      if (!entry || typeof entry !== "object") return "";
      return [
        entry.id || "",
        entry.no || "",
        entry.tableId || "",
        entry.street || "",
        entry.label || "",
        entry.feedback?.grade || "",
        entry.feedback?.score || "",
        entry.decisionMs || ""
      ].join("|");
    }

    function collectionCacheKey(prefix, entries, keyFn) {
      const list = Array.isArray(entries) ? entries : [];
      const first = keyFn(list[0]);
      const last = keyFn(list[list.length - 1]);
      return `${prefix}:${list.length}:${first}:${last}`;
    }

    function handIdentityKey(entry, fallbackSessionId = "") {
      if (!entry || typeof entry !== "object") return "";
      const hand = entry.handHistory && typeof entry.handHistory === "object" ? entry.handHistory : {};
      const sessionId = String(entry.sessionId || hand.sessionId || fallbackSessionId || "");
      const handNo = entry.handNo ?? entry.no ?? hand.handNo ?? "";
      const tableId = entry.tableId ?? hand.tableId ?? "";
      if (sessionId || handNo || tableId) return `${sessionId}:${handNo}:${tableId}`;
      return statsEntryKey(entry);
    }

    function mergeHandEntries(primaryEntries, fallbackEntries, fallbackSessionId = "") {
      const merged = [];
      const seen = new Set();
      [primaryEntries, fallbackEntries].forEach((entries) => {
        (Array.isArray(entries) ? entries : []).forEach((entry) => {
          if (!entry || typeof entry !== "object") return;
          const key = handIdentityKey(entry, fallbackSessionId);
          if (key && seen.has(key)) return;
          if (key) seen.add(key);
          merged.push(entry);
        });
      });
      return merged;
    }

    function allTimeHandEntries(current = state()) {
      const handLog = Array.isArray(current?.handLog) ? current.handLog : [];
      const history = Array.isArray(current?.history) ? current.history : [];
      return mergeHandEntries(handLog, history, current?.sessionId || "");
    }

    function cachedPokerStats() {
      const current = state();
      const source = allTimeHandEntries(current);
      const key = collectionCacheKey("allTime:merged", source, statsEntryKey);
      current.sessionStatsCache ||= {};
      if (current.sessionStatsCache.handKey !== key) {
        current.sessionStatsCache.handKey = key;
        current.sessionStatsCache.pokerStats = aggregatePokerStats(source);
      }
      return current.sessionStatsCache.pokerStats || aggregatePokerStats([]);
    }

    function sanitizeStatsScope(value) {
      return String(value || "").toLowerCase() === "session" ? "session" : "allTime";
    }

    function statsScopeSetting() {
      return sanitizeStatsScope(state().settings?.statsScope);
    }

    // Hands the CURRENT live session has dealt past the retained hand window.
    // current.handLog is hard-capped to handLogLimit (and current.history to
    // sessionHistoryLimit), so once a single session runs past that cap the
    // merged sample — and therefore cachedPokerStats().hands — plateaus and the
    // HUD "Всё время" count silently stops growing. handSeq is the monotonic
    // per-session hand counter that survives truncation, so the overflow beyond
    // the window is the count the sample can no longer represent. Only the COUNT
    // is recoverable here (the dropped hands' win/BB outcomes are gone), so this
    // tops up the displayed hand total without diluting the rate/BB math.
    function currentSessionTruncatedHands() {
      const current = state();
      const handSeq = Math.max(0, Math.floor(Number(current?.handSeq) || 0));
      return Math.max(0, handSeq - handLogLimit);
    }

    // HUD "Всё время": local per-hand stats topped up with sessions the live
    // hand source no longer covers (archived sessions + remote-only sessions
    // from other devices, supplied by the store deduped by sessionId) plus the
    // current session's own hands lost to the retained-window cap. Count and BB
    // totals become true all-time; rate stats (VPIP/PFR/3bet/cbet) intentionally
    // stay on the local per-hand sample — extra/truncated hands only carry a
    // count (or compact totals), not per-hand data.
    function allTimeDisplayPokerStats() {
      const base = cachedPokerStats();
      const extra = typeof options.allTimeExtraTotals === "function" ? options.allTimeExtraTotals() : null;
      const truncatedHands = currentSessionTruncatedHands();
      // DISPLAY count includes every hand the player has anywhere: the live sample,
      // the extra sessions' high-water count, and this session's window-truncated
      // hands. `extra.hands` is a high-water mark that can EXCEED the hands actually
      // backed by BB/win data after a quota-eviction (see BUGHUNT F022).
      const extraHands = extra ? Number(extra.hands || 0) : 0;
      // Hands BACKED by aggregated BB/win data. Prefer extra.sampledHands (added by
      // BUGHUNT F022); fall back to extra.hands for older payloads that predate the
      // split (then countOnlySurplus below is 0 and behavior is unchanged).
      const extraSampledHands = extra
        ? Number(extra.sampledHands != null ? extra.sampledHands : extra.hands || 0)
        : 0;
      if (!extraHands && !truncatedHands) return base;
      // Rate/BB denominators divide by ONLY the hands backed by aggregated BB/win
      // data (base sample + extra sampled). The count-only surplus (BUGHUNT F022:
      // extra high-water minus extra sampled) and the window-truncated hands
      // (BUGHUNT F036: current-session hands past handLogLimit) carry a count but no
      // BB data, so they top up the DISPLAYED hand count only — never the rate
      // denominator. This is the single coherent denominator story: shown `hands`
      // is the true all-time count; win-rate/bb100/EV are over the sampled subset.
      const sampledHands = Number(base.hands || 0) + extraSampledHands;
      const countOnlySurplus = Math.max(0, extraHands - extraSampledHands);
      const hands = sampledHands + countOnlySurplus + truncatedHands;
      const wins = Number(base.wins || 0) + (extra ? Number(extra.wins || 0) : 0);
      const evWins = Math.round((Number(base.evWins || 0) + (extra ? Number(extra.evWins || 0) : 0)) * 1000) / 1000;
      const netBb = Math.round((Number(base.netBb || 0) + (extra ? Number(extra.netBb || 0) : 0)) * 10) / 10;
      const evNetBb = Math.round((Number(base.evNetBb || 0) + (extra ? Number(extra.evNetBb || 0) : 0)) * 10) / 10;
      return {
        ...base,
        hands,
        wins,
        evWins,
        folds: Number(base.folds || 0) + (extra ? Number(extra.folds || 0) : 0),
        showdowns: Number(base.showdowns || 0) + (extra ? Number(extra.showdowns || 0) : 0),
        netBb,
        evNetBb,
        winRate: sampledHands ? wins / sampledHands : 0,
        evWinRate: sampledHands ? evWins / sampledHands : 0,
        bb100: sampledHands ? Math.round((netBb / sampledHands) * 1000) / 10 : 0,
        evBb100: sampledHands ? Math.round((evNetBb / sampledHands) * 1000) / 10 : 0
      };
    }

    function cachedDisplayPokerStats() {
      if (statsScopeSetting() !== "session") return allTimeDisplayPokerStats();
      const current = state();
      const source = current.history;
      const key = collectionCacheKey("session:history", source, statsEntryKey);
      current.sessionStatsCache ||= {};
      if (current.sessionStatsCache.displayHandKey !== key) {
        current.sessionStatsCache.displayHandKey = key;
        current.sessionStatsCache.displayPokerStats = aggregatePokerStats(source);
      }
      return current.sessionStatsCache.displayPokerStats || aggregatePokerStats([]);
    }

    function cachedDecisionStats() {
      const current = state();
      const key = collectionCacheKey("decisions", current.decisions, decisionEntryKey);
      current.sessionStatsCache ||= {};
      if (current.sessionStatsCache.decisionKey !== key) {
        current.sessionStatsCache.decisionKey = key;
        current.sessionStatsCache.decisionStats = aggregateDecisionStats(current.decisions);
      }
      return current.sessionStatsCache.decisionStats || aggregateDecisionStats([]);
    }

    function aggregateDecisionStats(entries) {
      const list = Array.isArray(entries) ? entries : [];
      const decisions = list.length;
      const aggressive = list.filter((entry) => entry && entry.intent === "aggressive").length;
      const good = list.filter((entry) => entry && entry.feedback?.grade === "good").length;
      const leaks = list.filter((entry) => entry && entry.feedback?.grade === "leak").length;
      const score = list.reduce((sum, entry) => sum + Number(entry?.feedback?.score || 0), 0);
      const timedDecisionMs = list.map(decisionDurationMs).filter((value) => value !== null);
      const averageDecisionMs = averageDurationMs(timedDecisionMs);
      const recent = list.slice(0, 12);
      const recentAgg = recent.filter((entry) => entry && entry.intent === "aggressive").length;
      const recentTimedDecisionMs = recent.map(decisionDurationMs).filter((value) => value !== null);
      const recentAverageDecisionMs = averageDurationMs(recentTimedDecisionMs);
      const pills = [
        `Recent aggression ${recent.length ? Math.round((recentAgg / recent.length) * 100) : 0}%`,
        `Avg move ${formatDecisionDuration(recentAverageDecisionMs ?? averageDecisionMs)}`
      ];
      return {
        decisions,
        aggressive,
        good,
        leaks,
        score,
        timedDecisionCount: timedDecisionMs.length,
        averageDecisionMs,
        reviewHtml: decisions ? pills.map((pill) => `<span class="review-pill">${escapeHtml(pill)}</span>`).join("") : ""
      };
    }

    function decisionDurationMs(entry) {
      const value = Number(entry?.decisionMs);
      return Number.isFinite(value) && value >= 0 ? value : null;
    }

    function averageDurationMs(values) {
      const list = (Array.isArray(values) ? values : []).filter((value) => Number.isFinite(value) && value >= 0);
      if (!list.length) return null;
      return list.reduce((sum, value) => sum + value, 0) / list.length;
    }

    function formatDecisionDuration(ms) {
      if (ms === null || ms === undefined || !Number.isFinite(Number(ms)) || Number(ms) < 0) return "—";
      const seconds = Number(ms) / 1000;
      if (seconds < 9.95) return `${seconds.toFixed(1)}s`;
      return `${Math.round(seconds)}s`;
    }

    function combineRateStats(...stats) {
      const combined = emptyRateStat();
      stats.forEach((stat) => {
        combined.made += Number(stat?.made || 0);
        combined.opportunities += Number(stat?.opportunities || 0);
      });
      combined.rate = ratio(combined.made, combined.opportunities);
      return combined;
    }

    function sessionHudRate(stat) {
      if (!Number(stat?.opportunities || 0)) return "—";
      return percent(stat.rate);
    }

    function normalizeSessionPayload(payload, options = {}) {
      if (!payload || typeof payload !== "object") return null;
      const history = Array.isArray(payload.history) ? payload.history.slice(0, sessionHistoryLimit).map(sanitizeHistoryEntry) : [];
      const handLog = normalizePayloadHandLog(payload);
      const decisions = Array.isArray(payload.decisions) ? payload.decisions.slice(0, sessionDecisionLimit).filter((entry) => entry && typeof entry === "object") : [];
      const foldAnyEvents = Array.isArray(payload.foldAnyEvents) ? payload.foldAnyEvents.slice(0, foldAnyEventLimit).map(sanitizeFoldAnyEvent).filter(Boolean) : [];
      const tableSnapshots = Array.isArray(payload.tableSnapshots)
        ? payload.tableSnapshots.map((entry) => cloneSessionPayloadValue(entry, null)).filter(Boolean).slice(0, 4)
        : [];
      const restoreInterruptedHands = Array.isArray(payload.restoreInterruptedHands)
        ? payload.restoreInterruptedHands.map((entry) => cloneSessionPayloadValue(entry, null)).filter(Boolean).slice(0, 20)
        : [];
      const botLab = payload.botLab && typeof payload.botLab === "object" ? payload.botLab : null;
      if (!options.allowEmpty && !history.length && !handLog.length && !decisions.length && !foldAnyEvents.length && !botLab) return null;
      const handSeq = Number(payload.handSeq);
      const labelSource = payload.label || payload.name || payload.exportedAt || "Импортированная сессия";
      return {
        schema: payload.schema || "poker-simulator-session-v1",
        label: String(labelSource).slice(0, 80),
        exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : "",
        importedAt: typeof payload.importedAt === "string" ? payload.importedAt : new Date().toISOString(),
        sessionId: typeof payload.sessionId === "string" ? payload.sessionId.slice(0, 80) : "",
        settings: payload.settings && typeof payload.settings === "object" ? payload.settings : null,
        handSeq: Number.isFinite(handSeq) ? Math.max(0, Math.floor(handSeq)) : 0,
        history,
        handLog,
        decisions,
        foldAnyEvents,
        tableSnapshots,
        restoreInterruptedHands,
        botLab
      };
    }

    function normalizePayloadHandLog(payload) {
      if (!payload || typeof payload !== "object") return [];
      try {
        const entries = Array.isArray(payload.handLog)
          ? payload.handLog
          : typeof payload.handLogJsonl === "string"
          ? parseHandLogJsonl(payload.handLogJsonl)
          : [];
        return entries
          .slice(0, handLogLimit)
          .map(sanitizeHandLogEntry)
          .filter(Boolean);
      } catch {
        return [];
      }
    }

    function cloneSessionPayloadValue(value, fallback) {
      if (value == null) return fallback;
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return fallback;
      }
    }

    function currentSessionPayload() {
      const current = state();
      return {
        schema: "poker-simulator-session-v1",
        label: "Текущая сессия",
        exportedAt: new Date().toISOString(),
        sessionId: current.sessionId,
        settings: cloneSessionPayloadValue(current.settings, { ...current.settings }),
        handSeq: current.handSeq,
        history: (current.history || []).map(sanitizeHistoryEntry).map((entry) => cloneSessionPayloadValue(entry, null)).filter(Boolean),
        handLog: (current.handLog || []).map(sanitizeHandLogEntry).map((entry) => cloneSessionPayloadValue(entry, null)).filter(Boolean),
        handLogJsonl: handLogJsonl(current.handLog || []),
        decisions: (current.decisions || [])
          .filter((entry) => entry && typeof entry === "object")
          .map((entry) => cloneSessionPayloadValue(entry, null))
          .filter(Boolean),
        foldAnyEvents: (current.foldAnyEvents || []).map(sanitizeFoldAnyEvent).map((entry) => cloneSessionPayloadValue(entry, null)).filter(Boolean),
        tableSnapshots: (current.restoreTableSnapshots || []).map((entry) => cloneSessionPayloadValue(entry, null)).filter(Boolean).slice(0, 4),
        restoreInterruptedHands: (current.restoreInterruptedHands || []).map((entry) => cloneSessionPayloadValue(entry, null)).filter(Boolean).slice(0, 20),
        botLab: cloneSessionPayloadValue(current.botLab, null)
      };
    }

    function sessionMetrics(source) {
      const history = Array.isArray(source?.history) ? source.history : [];
      const handLog = Array.isArray(source?.handLog) ? source.handLog.map(sanitizeHandLogEntry).filter(Boolean) : [];
      const handEntries = mergeHandEntries(handLog, history, source?.sessionId || "");
      const pokerStats = aggregatePokerStats(handEntries);
      const decisions = Array.isArray(source?.decisions) ? source.decisions : [];
      const good = decisions.filter((entry) => entry && entry.feedback?.grade === "good").length;
      const leaks = decisions.filter((entry) => entry && entry.feedback?.grade === "leak").length;
      const aggressive = decisions.filter((entry) => entry && entry.intent === "aggressive").length;
      const score = decisions.reduce((sum, entry) => sum + Number(entry?.feedback?.score || 0), 0);
      const timedDecisionMs = decisions.map(decisionDurationMs).filter((value) => value !== null);
      const averageDecisionMs = averageDurationMs(timedDecisionMs);
      return {
        hands: pokerStats.hands,
        handLogHands: handLog.length,
        wins: pokerStats.wins,
        folds: pokerStats.folds,
        showdowns: pokerStats.showdowns,
        evWins: pokerStats.evWins,
        evNetBb: pokerStats.evNetBb,
        evBb100: pokerStats.evBb100,
        evWinRate: pokerStats.evWinRate,
        decisions: decisions.length,
        good,
        leaks,
        aggressive,
        score,
        timedDecisionCount: timedDecisionMs.length,
        averageDecisionMs,
        averageDecisionSeconds: averageDecisionMs === null ? null : averageDecisionMs / 1000,
        winRate: pokerStats.winRate,
        leaderboard: leaderboardRatingFromMetrics(pokerStats),
        leakRate: ratio(leaks, decisions.length),
        goodRate: ratio(good, decisions.length),
        aggressionRate: ratio(aggressive, decisions.length),
        pokerStats,
        streets: countBy(decisions.map((entry) => entry?.street || "unknown")),
        actions: countBy(decisions.map((entry) => entry?.action || "unknown")),
        leaksByCategory: countBy(decisions
          .filter((entry) => entry && entry.feedback?.grade === "leak")
          .map((entry) => entry.feedback?.category || "strategy")),
        feedbackByCategory: countBy(decisions.map((entry) => entry?.feedback?.category || "uncategorized")),
        botLab: source?.botLab || null
      };
    }

    function handLogJsonl(entries = []) {
      return typeof handLogKit.handLogJsonl === "function" ? handLogKit.handLogJsonl(entries, handLogOptions) : "";
    }

    function parseHandLogJsonl(text) {
      return typeof handLogKit.parseHandLogJsonl === "function" ? handLogKit.parseHandLogJsonl(text) : [];
    }

    function sanitizeHistoryEntry(entry) {
      return typeof handLogKit.sanitizeHistoryEntry === "function" ? handLogKit.sanitizeHistoryEntry(entry, handLogOptions) : entry;
    }

    function sanitizeHandLogEntry(entry) {
      return typeof handLogKit.sanitizeHandLogEntry === "function" ? handLogKit.sanitizeHandLogEntry(entry, handLogOptions) : entry;
    }

    function sanitizeFoldAnyEvent(event) {
      return typeof handLogKit.sanitizeFoldAnyEvent === "function" ? handLogKit.sanitizeFoldAnyEvent(event, handLogOptions) : event;
    }

    function aggregatePokerStats(entries) {
      return typeof handLogKit.aggregatePokerStats === "function" ? handLogKit.aggregatePokerStats(entries) : {};
    }

    function emptyRateStat() {
      return typeof handLogKit.emptyRateStat === "function" ? handLogKit.emptyRateStat() : { made: 0, opportunities: 0, rate: 0 };
    }

    function ratio(part, total) {
      return total ? Number(part || 0) / Number(total || 0) : 0;
    }

    function countBy(values) {
      return (Array.isArray(values) ? values : []).reduce((acc, value) => {
        const key = String(value || "unknown");
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    }

    function percent(value) {
      return `${Math.round(Number(value || 0) * 100)}%`;
    }

    return {
      statsEntryKey,
      compactEntryChecksum,
      decisionEntryKey,
      collectionCacheKey,
      cachedPokerStats,
      sanitizeStatsScope,
      statsScopeSetting,
      allTimeDisplayPokerStats,
      cachedDisplayPokerStats,
      cachedDecisionStats,
      aggregateDecisionStats,
      decisionDurationMs,
      averageDurationMs,
      formatDecisionDuration,
      combineRateStats,
      sessionHudRate,
      normalizeSessionPayload,
      normalizePayloadHandLog,
      cloneSessionPayloadValue,
      currentSessionPayload,
      sessionMetrics,
      ratio,
      countBy
    };
  }

  root.PokerSimulatorSessionMetrics = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
