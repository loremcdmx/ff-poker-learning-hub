(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const actionI18n = options.actionI18n || root.PokerSimulatorActionI18n || {};
    const localizeActionLabel = typeof actionI18n.localizeActionLabel === "function" ? actionI18n.localizeActionLabel : (value) => value;
    const localizeActionText = typeof actionI18n.localizeActionText === "function" ? actionI18n.localizeActionText : (value) => value;

    function state() {
      return getState() || {};
    }

    function defaultEscapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function renderHistoryEntry(entry) {
      const entryOutcome = replayEntryOutcome(entry);
      const outcome = entryOutcome === "win" ? "is-win" : entryOutcome === "split" ? "is-split" : "is-loss";
      return `<button class="history-entry ${outcome}" type="button" data-replay-hand="${entry?.no}" data-replay-table="${entry?.tableId}">#${entry?.no} ${escapeHtml(entry?.combo)} · ${escapeHtml(localizeActionText(entry?.result))}</button>`;
    }

    function renderDecisionEntry(entry) {
      const feedback = entry?.feedback || { grade: "neutral", label: "" };
      const categoryLabel = feedback.category ? `${feedback.category} · ` : "";
      const feedbackLabel = feedback.label ? `${feedback.label} · ` : "";
      return `<span class="decision-entry is-${escapeHtml(feedback.grade)}" title="${escapeHtml(feedback.detail || "")}">${escapeHtml(feedbackLabel)}#${entry?.no} ${escapeHtml(entry?.street)} ${escapeHtml(entry?.combo)} · ${escapeHtml(localizeActionLabel(entry?.label))} · ${escapeHtml(categoryLabel)}</span>`;
    }

    function replayEntryIdentity(entry) {
      const hand = entry?.handHistory || {};
      return [
        hand.sessionId || entry?.sessionId || "",
        Number(entry?.tableId ?? hand.tableId ?? 0),
        Number(entry?.no ?? hand.handNo ?? 0),
        hand.result || entry?.result || ""
      ].join(":");
    }

    function outcomeFromResultKind(resultKind, resultText) {
      const normalizedKind = String(resultKind || "").toLowerCase();
      if (normalizedKind === "won" || normalizedKind === "win" || normalizedKind === "tournament-won") return "win";
      if (normalizedKind === "split" || normalizedKind === "chop") return "split";
      if (normalizedKind === "lost" || normalizedKind === "loss" || normalizedKind === "busted" || normalizedKind === "fold") return "loss";
      const normalizedText = String(resultText || "").trim().toLowerCase();
      if (/^(split|chop)\b/.test(normalizedText)) return "split";
      if (/^hero\s+(wins?|won|win\b)/.test(normalizedText)) return "win";
      return "loss";
    }

    function structuredOutcome(entry) {
      // The hand-log sanitizer persists the authoritative outcome under
      // entry.result.outcome (and a flat entry.outcome on some paths). Prefer it
      // over text-parsing the result string, which mislabels a side-pot win
      // ("X wins main, Hero wins side N") as a loss (R2-SIDEPOTUI / P3).
      const nested = entry?.result && typeof entry.result === "object" ? entry.result.outcome : "";
      const value = String(nested || entry?.outcome || "").toLowerCase();
      return ["win", "split", "loss"].includes(value) ? value : "";
    }

    function replayEntryOutcome(entry) {
      const structured = structuredOutcome(entry);
      if (structured) return structured;
      const hand = entry?.handHistory || entry?.hand || {};
      const resultText = hand.result || (typeof entry?.result === "string" ? entry.result : entry?.result?.text);
      return outcomeFromResultKind(hand.resultKind, resultText);
    }

    function replayEntryFromHandLog(entry, index = 0) {
      const hand = entry?.handHistory || entry?.hand || null;
      if (!hand || typeof hand !== "object") return null;
      const handNo = Number.isFinite(Number(hand.handNo)) ? Number(hand.handNo) : Number(entry?.handNo || index + 1);
      const tableId = Number.isFinite(Number(hand.tableId)) ? Number(hand.tableId) : Number(entry?.tableId || 1);
      const result = String(hand.result || (typeof entry?.result === "string" ? entry.result : entry?.result?.text) || "");
      const outcome = structuredOutcome(entry) || outcomeFromResultKind(hand.resultKind, result);
      return {
        no: handNo,
        tableId,
        combo: entry?.hero?.combo || hand.combo || entry?.combo || "",
        result,
        outcome,
        handHistory: hand,
        source: "handLog"
      };
    }

    function replayEntries() {
      const current = state();
      const entries = [];
      const seen = new Set();
      const add = (entry) => {
        if (!entry?.handHistory) return;
        const normalized = { ...entry, outcome: replayEntryOutcome(entry) };
        const key = replayEntryIdentity(normalized);
        if (seen.has(key)) return;
        seen.add(key);
        entries.push(normalized);
      };
      (Array.isArray(current.handLog) ? current.handLog : []).map(replayEntryFromHandLog).forEach(add);
      (Array.isArray(current.serverReplayEntries) ? current.serverReplayEntries : []).forEach(add);
      (Array.isArray(current.history) ? current.history : []).forEach(add);
      return entries;
    }

    function historyEntryForTable(table) {
      if (!table) return null;
      return replayEntries().find((entry) =>
        Number(entry.no) === Number(table.handNo)
        && Number(entry.tableId) === Number(table.id)
      ) || null;
    }

    return {
      renderHistoryEntry,
      renderDecisionEntry,
      replayEntryIdentity,
      outcomeFromResultKind,
      replayEntryOutcome,
      replayEntryFromHandLog,
      replayEntries,
      historyEntryForTable
    };
  }

  root.PokerSimulatorReplayHistory = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
