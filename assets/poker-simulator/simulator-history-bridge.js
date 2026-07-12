(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const handLogKit = options.handLogKit || root.PokerSimulatorHandLog || {};
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const getHandCompletion = typeof options.getHandCompletion === "function" ? options.getHandCompletion : () => options.handCompletion || null;
    const getReplayHistory = typeof options.getReplayHistory === "function" ? options.getReplayHistory : () => options.replayHistory || null;
    const bootSessionId = String(options.bootSessionId || "");

    function state() {
      return getState() || {};
    }

    function sessionOptions() {
      return { sessionId: bootSessionId };
    }

    function sanitizeHistoryEntry(entry) {
      return typeof handLogKit.sanitizeHistoryEntry === "function" ? handLogKit.sanitizeHistoryEntry(entry) : entry;
    }

    function sanitizeHandHistory(hand, opts = {}) {
      return typeof handLogKit.sanitizeHandHistory === "function" ? handLogKit.sanitizeHandHistory(hand, opts) : hand || null;
    }

    function sanitizeTimelineEvent(event, opts = {}) {
      return typeof handLogKit.sanitizeTimelineEvent === "function" ? handLogKit.sanitizeTimelineEvent(event, opts) : event;
    }

    function sanitizeSnapshotSeats(seats, opts = {}) {
      return typeof handLogKit.sanitizeSnapshotSeats === "function" ? handLogKit.sanitizeSnapshotSeats(seats, opts) : [];
    }

    function sanitizeShowdownPayload(showdown) {
      return typeof handLogKit.sanitizeShowdownPayload === "function" ? handLogKit.sanitizeShowdownPayload(showdown) : showdown || null;
    }

    function sanitizeAllInRunoutPayload(runout) {
      return typeof handLogKit.sanitizeAllInRunoutPayload === "function" ? handLogKit.sanitizeAllInRunoutPayload(runout) : runout || null;
    }

    function sanitizeFoldAnyEvent(event) {
      return typeof handLogKit.sanitizeFoldAnyEvent === "function" ? handLogKit.sanitizeFoldAnyEvent(event, sessionOptions()) : event || null;
    }

    function sanitizeHandLogEntry(entry) {
      return typeof handLogKit.sanitizeHandLogEntry === "function" ? handLogKit.sanitizeHandLogEntry(entry, sessionOptions()) : entry || null;
    }

    function trainerFeedbackForTable(table) {
      if (!table) return null;
      const decisions = Array.isArray(state().decisions) ? state().decisions : [];
      return decisions.find((entry) => Number(entry?.no) === Number(table.handNo) && Number(entry?.tableId) === Number(table.id)) || null;
    }

    function callFallback(fallback, args) {
      const list = Array.prototype.slice.call(args || []);
      return typeof fallback === "function" ? fallback(...list) : fallback;
    }

    function delegateTo(getModel, method, args, fallback) {
      const modelRef = getModel();
      const fn = modelRef && modelRef[method];
      if (typeof fn === "function") return fn.apply(modelRef, args);
      return callFallback(fallback, args);
    }

    function delegateMap(getModel, spec) {
      return Object.keys(spec).reduce((api, method) => {
        api[method] = function () {
          return delegateTo(getModel, method, arguments, spec[method]);
        };
        return api;
      }, {});
    }

    const completionFallbacks = {
      settingsLogSnapshot: (settings = state().settings) => settings || {},
      recordHandLogEntry: null,
      buildHandLogEntry: null,
      trySendHandLogToBackend: undefined,
      renderHandLogText: (entry, handHistory) =>
        typeof handLogKit.renderHandLogText === "function" ? handLogKit.renderHandLogText(entry, handHistory) : "",
      extractHandStats: (hand) => (typeof handLogKit.extractHandStats === "function" ? handLogKit.extractHandStats(hand) : {}),
      aggregatePokerStats: (entries) => (typeof handLogKit.aggregatePokerStats === "function" ? handLogKit.aggregatePokerStats(entries) : {}),
      emptyRateStat: () => (typeof handLogKit.emptyRateStat === "function" ? handLogKit.emptyRateStat() : { made: 0, opportunities: 0, rate: 0 }),
      finiteNumber: (value, fallback = 0) => (typeof handLogKit.finiteNumber === "function" ? handLogKit.finiteNumber(value, fallback) : fallback),
      roundBbMetric: (value) => (typeof handLogKit.roundBbMetric === "function" ? handLogKit.roundBbMetric(value) : 0),
      outcomeForCompletedTable: (table, result = "") => (String(result || "").startsWith("Hero") ? "win" : "loss"),
      maybeRecordHand: null
    };
    const replayFallbacks = {
      renderHistoryEntry: "",
      renderDecisionEntry: "",
      historyEntryForTable: null,
      replayEntryIdentity: "",
      replayEntryFromHandLog: null,
      replayEntries: []
    };
    const completionDelegates = delegateMap(getHandCompletion, completionFallbacks);
    const replayDelegates = delegateMap(getReplayHistory, replayFallbacks);

    return {
      renderHistoryEntry: replayDelegates.renderHistoryEntry,
      renderDecisionEntry: replayDelegates.renderDecisionEntry,
      sanitizeHistoryEntry,
      sanitizeHandHistory,
      sanitizeTimelineEvent,
      sanitizeSnapshotSeats,
      sanitizeShowdownPayload,
      sanitizeAllInRunoutPayload,
      sanitizeFoldAnyEvent,
      sanitizeHandLogEntry,
      settingsLogSnapshot: completionDelegates.settingsLogSnapshot,
      recordHandLogEntry: completionDelegates.recordHandLogEntry,
      buildHandLogEntry: completionDelegates.buildHandLogEntry,
      trySendHandLogToBackend: completionDelegates.trySendHandLogToBackend,
      renderHandLogText: completionDelegates.renderHandLogText,
      extractHandStats: completionDelegates.extractHandStats,
      aggregatePokerStats: completionDelegates.aggregatePokerStats,
      emptyRateStat: completionDelegates.emptyRateStat,
      finiteNumber: completionDelegates.finiteNumber,
      roundBbMetric: completionDelegates.roundBbMetric,
      outcomeForCompletedTable: completionDelegates.outcomeForCompletedTable,
      maybeRecordHand: completionDelegates.maybeRecordHand,
      trainerFeedbackForTable,
      historyEntryForTable: replayDelegates.historyEntryForTable,
      replayEntryIdentity: replayDelegates.replayEntryIdentity,
      replayEntryFromHandLog: replayDelegates.replayEntryFromHandLog,
      replayEntries: replayDelegates.replayEntries
    };
  }

  root.PokerSimulatorHistoryBridge = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorHistoryBridge;
}());
