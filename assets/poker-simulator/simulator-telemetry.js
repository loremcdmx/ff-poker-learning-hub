(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const aggregatePokerStats = typeof options.aggregatePokerStats === "function" ? options.aggregatePokerStats : () => ({});
    const currentSessionPayload = typeof options.currentSessionPayload === "function" ? options.currentSessionPayload : () => ({});
    const sessionMetrics = typeof options.sessionMetrics === "function" ? options.sessionMetrics : () => ({});
    const compactSessionMetrics = typeof options.compactSessionMetrics === "function"
      ? options.compactSessionMetrics
      : (metrics) => (metrics && typeof metrics === "object" ? { ...metrics } : {});
    const startModel = options.startModel || {};
    const sanitizeHistoryEntry = typeof options.sanitizeHistoryEntry === "function"
      ? options.sanitizeHistoryEntry
      : (entry) => entry;
    const sanitizeTableCount = typeof options.sanitizeTableCount === "function"
      ? options.sanitizeTableCount
      : typeof startModel.sanitizeTableCount === "function"
        ? startModel.sanitizeTableCount
        : (value) => value;

    function state() {
      return getState() || {};
    }

    function simulatorTrainerMeta() {
      return {
        key: "simulator",
        title: "Poker Table Simulator",
        version: "table-simulator-v1"
      };
    }

    function simulatorTelemetryProfile() {
      const profile = windowRef.FFPlayerProgress?.getActiveProfile?.() || {};
      return {
        id: String(profile.id || "guest").slice(0, 80),
        name: String(profile.name || "Guest").slice(0, 80)
      };
    }

    function sendSimulatorTelemetry(kind, payload = {}) {
      const current = state();
      if (current.settings?.demoMode) return null;
      if (!windowRef.FFTrainerEvents?.send) return null;
      return windowRef.FFTrainerEvents.send({
        kind,
        trainer: simulatorTrainerMeta(),
        profile: simulatorTelemetryProfile(),
        client: { sessionId: current.sessionId, source: "poker-simulator" },
        ...payload
      });
    }

    function feedbackCorrectness(feedback) {
      const grade = String(feedback?.grade || "");
      if (grade === "good") return true;
      if (grade === "leak") return false;
      return null;
    }

    function normalizeSimulatorErrorTag(value) {
      const suffix = String(value || "strategy")
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "") || "strategy";
      return `simulator_${suffix}`;
    }

    function addSimulatorErrorCount(counts, tag, count = 1) {
      const key = String(tag || "").trim();
      const amount = Math.max(0, Number(count || 0));
      if (!key || !amount) return counts;
      counts[key] = (counts[key] || 0) + amount;
      return counts;
    }

    function simulatorErrorCounts() {
      const current = state();
      const counts = {};
      const history = Array.isArray(current.history) ? current.history : [];
      const decisions = Array.isArray(current.decisions) ? current.decisions : [];
      history.forEach((entry) => {
        if (entry?.fold) addSimulatorErrorCount(counts, "simulator_folds");
        if (entry?.busted) addSimulatorErrorCount(counts, "simulator_bustout");
      });
      decisions.forEach((entry) => {
        if (feedbackCorrectness(entry?.feedback) === false) {
          addSimulatorErrorCount(counts, normalizeSimulatorErrorTag(entry?.feedback?.category));
        }
      });
      return counts;
    }

    function simulatorWeakErrorTags(counts) {
      return Object.entries(counts || {})
        .sort((left, right) => Number(right[1]) - Number(left[1]))
        .map(([tag]) => tag);
    }

    function simulatorRepeatHref(weakErrorTags = []) {
      const current = state();
      const settings = current.settings || {};
      const SearchParams = windowRef.URLSearchParams || root.URLSearchParams || globalThis.URLSearchParams;
      const query = new SearchParams({
        source: "player-path",
        skill: "simulator",
        pack: String(settings.pack || "basic-vpip"),
        difficulty: String(settings.difficulty || "normal"),
        mode: String(settings.simulationMode || "tournament"),
        tables: String(sanitizeTableCount(settings.tableCount || 1))
      });
      const tags = weakErrorTags.slice(0, 4).join(",");
      if (tags) query.set("tags", tags);
      return `poker-simulator.html?${query.toString()}`;
    }

    function buildSimulatorReviewRoutes(status, weakErrorTags = []) {
      if (status === "passed") {
        return [{
          skillKey: "review",
          href: "player-path.html#step-review",
          label: "Review queue",
          reason: "simulator volume is recorded; review the session and move through the path",
          weakTags: []
        }];
      }
      return [{
        skillKey: "simulator",
        href: simulatorRepeatHref(weakErrorTags),
        label: "Repeat simulator session",
        reason: weakErrorTags.length ? "repeat the current table setup around the weakest simulator leak" : "play to 10 recorded hands before leaving the simulator gate",
        weakTags: weakErrorTags.slice(0, 4)
      }];
    }

    function sendSimulatorDecisionTelemetry(entry) {
      if (!entry) return null;
      const current = state();
      const feedback = entry.feedback || {};
      const correctness = feedbackCorrectness(feedback);
      const errorTag = correctness === false ? normalizeSimulatorErrorTag(feedback.category) : "";
      return sendSimulatorTelemetry("trainer_decision", {
        eventId: `${current.sessionId}:${entry.no}:${entry.tableId}:decision:${entry.decisionEndedAt || Date.now()}`,
        session: {
          id: current.sessionId,
          type: "poker_table_simulator",
          handNo: entry.no,
          tableId: entry.tableId,
          pack: entry.pack
        },
        spot: {
          id: `${entry.tableId}:${entry.no}:${entry.street}:${entry.combo}`,
          tableId: entry.tableId,
          handNo: entry.no,
          pack: entry.pack,
          spot: entry.spot,
          street: entry.street,
          combo: entry.combo,
          board: entry.board,
          pot: entry.pot,
          toCall: entry.toCall,
          source: entry.source
        },
        decision: {
          choice: entry.action,
          label: entry.label,
          intent: entry.intent,
          amount: entry.amount,
          correct: correctness,
          grade: feedback.grade || "neutral",
          score: Number(feedback.score || 0),
          category: feedback.category || "",
          errorTag,
          elapsedMs: entry.decisionMs,
          timebankSeconds: entry.timebankSeconds,
          occurredAt: entry.decisionEndedAt || new Date().toISOString()
        },
        metadata: {
          feedback,
          foldAny: entry.foldAny,
          settings: {
            difficulty: current.settings?.difficulty,
            mode: current.settings?.simulationMode,
            pack: current.settings?.pack,
            tableCount: current.settings?.tableCount,
            handTempo: current.settings?.handTempo
          }
        }
      });
    }

    function simulatorProgressResult() {
      const current = state();
      const handLog = Array.isArray(current.handLog) ? current.handLog : [];
      const history = Array.isArray(current.history) ? current.history : [];
      const progressEntries = handLog.length >= history.length ? handLog : history;
      const pokerStats = aggregatePokerStats(progressEntries) || {};
      const hands = Number(pokerStats.hands || 0);
      const wins = Number(pokerStats.wins || 0);
      const errorCounts = simulatorErrorCounts();
      const weakErrorTags = simulatorWeakErrorTags(errorCounts);
      const status = hands >= 10 ? "passed" : "in_progress";
      const reviewRoutes = buildSimulatorReviewRoutes(status, weakErrorTags);
      return {
        attempts: hands,
        correct: wins,
        bestScore: Math.min(100, hands * 10),
        status,
        streak: 0,
        nextRecommendation: status === "passed" ? "review" : "simulator.repeat",
        errorTags: weakErrorTags,
        errorCounts,
        weakErrorTags,
        reviewRoutes
      };
    }

    function sendSimulatorSessionTelemetry(historyEntry, progressResult) {
      const current = state();
      const payload = currentSessionPayload();
      const metrics = sessionMetrics(payload) || {};
      return sendSimulatorTelemetry("trainer_session", {
        eventId: `${current.sessionId}:${historyEntry?.no || 0}:${historyEntry?.tableId || 0}:session`,
        session: {
          id: current.sessionId,
          type: "poker_table_simulator",
          completedHandNo: historyEntry?.no || 0,
          completedTableId: historyEntry?.tableId || 0,
          hands: metrics.hands,
          decisions: metrics.decisions,
          status: progressResult?.status || "in_progress"
        },
        metadata: {
          result: progressResult,
          metrics: compactSessionMetrics(metrics),
          latestHand: historyEntry ? sanitizeHistoryEntry(historyEntry) : null,
          settings: {
            difficulty: current.settings?.difficulty,
            mode: current.settings?.simulationMode,
            pack: current.settings?.pack,
            tableCount: current.settings?.tableCount,
            handTempo: current.settings?.handTempo
          }
        }
      });
    }

    return {
      simulatorTrainerMeta,
      sendSimulatorTelemetry,
      feedbackCorrectness,
      normalizeSimulatorErrorTag,
      addSimulatorErrorCount,
      simulatorErrorCounts,
      simulatorWeakErrorTags,
      simulatorRepeatHref,
      buildSimulatorReviewRoutes,
      sendSimulatorDecisionTelemetry,
      simulatorProgressResult,
      sendSimulatorSessionTelemetry
    };
  }

  root.PokerSimulatorTelemetry = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
