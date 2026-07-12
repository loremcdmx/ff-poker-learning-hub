(function () {
  "use strict";

  // Bot inspector: double-click a bot seat to see WHO it is (archetype/style/
  // difficulty/strategy) and WHY it made its recent decisions. Pure presentation
  // over data the engine already records: seat.botProfile + table.actionTimeline
  // events (each bot action event carries botReason). Self-contained module —
  // attaches its own delegated dblclick listener; does not touch event-wiring.

  const root = typeof window !== "undefined" ? window : globalThis;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }

  function styleLabelRu(style) {
    switch (String(style || "reg")) {
      case "fish": return "Фиш";
      case "station": return "Колл-стейшн";
      case "nit": return "Нит";
      case "aggro": return "Агро";
      case "passive": return "Пассивный";
      default: return "Рег";
    }
  }

  // F044 fix (2026-07-01): mirror seat tier-coloring's play-style fallback
  // (simulator-seat-renderer.js botTierFromSeat) so the inspector's strength
  // token agrees with the felt when `difficulty` is absent. WITHOUT collapsing
  // the two axes: this is only the difficulty/strength token (easy/standard/pro),
  // derived from difficulty first and from play-style ONLY as a defensive
  // fallback — exactly as the seat renderer does. It is NOT the play-style tag
  // (bi-style), which stays its own axis.
  function difficultyToken(difficulty, styleFallback) {
    const value = String(difficulty || "").toLowerCase();
    if (value === "easy" || value === "loose" || value === "weak") return "easy";
    if (value === "pro" || value === "nitty" || value === "hard" || value === "expert") return "pro";
    if (value === "standard" || value === "public" || value === "normal" || value === "mid" || value === "medium") return "standard";
    if (value) return "standard";
    // Difficulty absent — derive tier from play style, same mapping as botTierFromSeat.
    const style = String(styleFallback || "").toLowerCase();
    if (style === "fish" || style === "station") return "easy";
    if (style === "nit") return "pro";
    if (style) return "standard";
    return "standard";
  }

  function difficultyLabelRu(difficulty, styleFallback) {
    switch (difficultyToken(difficulty, styleFallback)) {
      case "easy": return "лёгкий";
      case "pro": return "про";
      default: return "стандартный";
    }
  }

  function archetypeSummaryRu(style) {
    switch (String(style || "reg")) {
      case "fish": return "Лузово-пассивный: играет много рук, лимпит, переплачивает на коллах, редко рейзит/блефует.";
      case "station": return "Колл-стейшн: широко колдаунит и не любит фолдить, постфлоп пассивный.";
      case "nit": return "Тайтово-пассивный нит: узкий рейндж, мало блефов, быстро фолдит на давление.";
      case "aggro": return "Агрессивный: широкие опены, много бетов, рейзов и блефов.";
      case "passive": return "Пассивный: редко проявляет инициативу, в основном чек/колл.";
      default: return "Сбалансированный рег: играет по чарт-диапазонам с дисциплиной.";
    }
  }

  // production knobs are offsets from the archetype baseline; describe the
  // fine-tuning of a top-strategy model in plain words.
  function band(value, lowTxt, midTxt, highTxt, lo, hi) {
    const v = Number(value || 0);
    if (v <= lo) return lowTxt;
    if (v >= hi) return highTxt;
    return midTxt;
  }

  function strategyTraits(profile) {
    const production = (profile && profile.strategyModel && profile.strategyModel.production) || null;
    if (!production || !Object.keys(production).length) return [];
    return [
      "Опен: " + band(production.openFrequency, "тайтовый", "стандартный", "широкий", -0.03, 0.03),
      // F028 fix (2026-07-01): threeBetFrequency is an additive OFFSET centered on 0
      // (production packs span -0.12..+0.24: fish/nit sit at -0.12..-0.04, aggro/reg
      // at +0.1..+0.24 — see bot-pack-profile.js). The old absolute 0.1/0.25 edges
      // floored ~8/12 bots into "редкий" and made "частый" unreachable (max offset
      // 0.24 < 0.25). Use symmetric offset edges like the sibling openFrequency
      // (-0.03/0.03): -0.05/0.05 splits negatives→редкий, ~0→средний, positives→частый.
      "3-бет: " + band(production.threeBetFrequency, "редкий", "средний", "частый", -0.05, 0.05),
      "Защита на агр: " + band(production.defenseFrequency, "оверфолд", "стандартная", "липкая", -0.06, 0.04),
      "Вельюсайз: " + band(production.sizeBias, "мельче нормы", "стандартный", "крупнее нормы", -0.1, 0.1),
      "Колдаун ривера: " + band(production.heroCallChance, "дисциплинированный", "средний", "много колла", -0.02, 0.06)
    ];
  }

  function modelId(strategyModel) {
    return String(
      strategyModel?.id
        || strategyModel?.baseModelId
        || strategyModel?.sourceModelId
        || ""
    ).trim();
  }

  function safeToken(value) {
    return String(value || "standard").toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "standard";
  }

  function streetRu(street) {
    switch (String(street || "")) {
      case "preflop": return "Префлоп";
      case "flop": return "Флоп";
      case "turn": return "Тёрн";
      case "river": return "Ривер";
      default: return street || "";
    }
  }

  function recentDecisions(table, seatId, limit) {
    const timeline = (table && Array.isArray(table.actionTimeline)) ? table.actionTimeline : [];
    return timeline
      .filter((event) => event && event.phase === "action" && Number(event.seatId) === Number(seatId))
      .slice(-(limit || 14))
      .map((event) => ({
        street: event.street || "",
        label: event.label || "",
        reason: event.botReason || "",
        pot: event.pot
      }));
  }

  function model(options = {}) {
    const documentRef = options.documentRef || (typeof document !== "undefined" ? document : null);
    const getTable = typeof options.getTable === "function" ? options.getTable : () => null;
    const formatAmount = typeof options.formatAmount === "function"
      ? options.formatAmount
      : (value) => `${Math.round(Number(value || 0) * 10) / 10} bb`;
    const controls = options.controls || {};

    function renderBody(table, seat) {
      const profile = seat.botProfile || {};
      const style = profile.style || profile.archetype || "reg";
      const strategyModel = profile.strategyModel || {};
      const strategyModelId = modelId(strategyModel);
      const seatName = `${seat.position ? seat.position + " · " : ""}${seat.name || ("Место " + seat.id)}`;
      const traits = strategyTraits(profile);
      const traitsHtml = traits.length
        ? `<ul class="bi-traits">${traits.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
        : `<p class="bi-traits-empty">Базовый архетип «${escapeHtml(styleLabelRu(style))}» без тонкой настройки стратегии.</p>`;
      const decisions = recentDecisions(table, seat.id, 14);
      const rows = decisions.length
        ? decisions.map((d) => `<tr>
            <td class="bi-street">${escapeHtml(streetRu(d.street))}</td>
            <td class="bi-action">${escapeHtml(d.label)}</td>
            <td class="bi-reason">${escapeHtml(d.reason || "—")}</td>
            <td class="bi-pot">${d.pot != null ? escapeHtml(formatAmount(d.pot)) : ""}</td>
          </tr>`).join("")
        : `<tr><td class="bi-empty" colspan="4">В этой раздаче бот ещё не действовал.</td></tr>`;
      return `
        <div class="bi-tags">
          <span class="bi-tag bi-style bi-style-${escapeHtml(safeToken(style))}">${escapeHtml(styleLabelRu(style))}</span>
          <span class="bi-tag">сложность: ${escapeHtml(difficultyLabelRu(profile.difficulty, style))}</span>
          ${strategyModel.label ? `<span class="bi-tag bi-model" title="${escapeHtml(strategyModelId)}">${escapeHtml(strategyModel.label)}</span>` : ""}
          ${strategyModelId ? `<span class="bi-tag bi-id">${escapeHtml(strategyModelId)}</span>` : ""}
        </div>
        <p class="bi-summary">${escapeHtml(archetypeSummaryRu(style))}</p>
        ${traitsHtml}
        <h3 class="bi-subhead">Логика последних решений</h3>
        <table class="bi-decisions">
          <thead><tr><th>Улица</th><th>Действие</th><th>Почему так решил</th><th>Банк</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="bi-hint">Двойной клик по любому боту — открыть его карточку.</p>
      `;
    }

    function openBotInspectorDialog(table, seat) {
      if (!controls.dialog || !seat || seat.isHero || !seat.botProfile) return;
      if (controls.title) {
        controls.title.textContent = `Бот: ${seat.position ? seat.position + " " : ""}${seat.name || ("Место " + seat.id)}`.trim();
      }
      if (controls.body) controls.body.innerHTML = renderBody(table, seat);
      if (typeof controls.dialog.showModal === "function") controls.dialog.showModal();
    }

    function seatIdFromElement(seatEl) {
      const cls = Array.from(seatEl.classList || []).find((name) => /^seat--\d+$/.test(name));
      return cls ? Number(cls.replace("seat--", "")) : null;
    }

    function attach(tableGrid) {
      const grid = tableGrid
        || (documentRef && (documentRef.querySelector("[data-table-grid]") || documentRef.querySelector(".table-grid")));
      if (!grid || grid.__botInspectorAttached) return;
      grid.__botInspectorAttached = true;
      grid.addEventListener("dblclick", (event) => {
        const target = event.target;
        if (!target || typeof target.closest !== "function") return;
        const shell = target.closest("[data-table-id]");
        if (!shell) return;
        const seatEl = target.closest(".seat");
        if (!seatEl || seatEl.classList.contains("is-hero")) return;
        const seatId = seatIdFromElement(seatEl);
        if (seatId == null) return;
        const table = getTable(shell.dataset.tableId);
        const seat = (table && Array.isArray(table.seats))
          ? table.seats.find((candidate) => Number(candidate.id) === seatId)
          : null;
        if (!seat || seat.isHero || !seat.botProfile) return;
        event.preventDefault();
        openBotInspectorDialog(table, seat);
      });
    }

    return { openBotInspectorDialog, attach };
  }

  root.PokerSimulatorBotInspector = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
