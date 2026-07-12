(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model({
    tableUsesTournamentMode = () => false,
    heroBusted = () => false,
    isActionSequenceActive = () => false,
    showdownTerminalControlsLocked = () => false,
    formatBlindMultiplier = (value) => String(value),
    formatAmount = (value) => String(value),
    compactActionText = (value) => String(value || ""),
    escapeHtml = (value) => String(value ?? "")
  } = {}) {
    function renderTournamentFinishScreen(table) {
      if (!tournamentFinishScreenVisible(table)) return "";
      const summary = tournamentFinishSummary(table);
      const champion = tournamentWon(table);
      const placeText = formatTournamentPlace(summary);
      const handsText = formatTournamentHands(summary.handsPlayed);
      const levelText = `L${summary.level} · x${formatBlindMultiplier(summary.blindMultiplier)}`;
      const reason = compactActionText(summary.reason || table?.result || table?.lastAction || "");
      const hero = Array.isArray(table?.seats) ? table.seats.find((seat) => seat?.isHero) : null;
      const finalStackText = champion && hero ? `Финальный стек ${formatAmount(hero.stack || 0)}` : "";
      const kicker = champion ? "Турнир выигран" : "Турнир завершен";
      const title = champion ? "Поздравляем" : "Ты вылетел";
      const lead = champion
        ? `Ты занял ${placeText}. Готов к следующему турниру?`
        : `Отыграл ${handsText} · ${placeText}`;
      const note = champion ? finalStackText : reason;
      const actionLabel = champion ? "Начать новый турнир" : "Новый турнир";
      return `
          <div class="tournament-finish-screen is-${champion ? "champion" : "busted"}" role="status" aria-live="polite">
            <div class="tournament-finish-card is-${champion ? "champion" : "busted"}">
              <span class="tournament-finish-kicker">${escapeHtml(kicker)}</span>
              ${champion ? '<span class="tournament-finish-medal" aria-hidden="true">1</span>' : ""}
              <strong>${escapeHtml(title)}</strong>
              <p>${escapeHtml(lead)}</p>
              <div class="tournament-finish-stats" aria-label="Итоги турнира">
                <span><b>${escapeHtml(summary.place)} / ${escapeHtml(summary.entrants)}</b><small>место</small></span>
                <span><b>${escapeHtml(summary.handsPlayed)}</b><small>${escapeHtml(tournamentHandsLabel(summary.handsPlayed))}</small></span>
                <span><b>${escapeHtml(levelText)}</b><small>уровень</small></span>
              </div>
              ${note ? `<em>${escapeHtml(note)}</em>` : ""}
              <button class="tournament-finish-action" type="button" data-action="restart-tournament">${escapeHtml(actionLabel)}</button>
            </div>
          </div>
        `;
    }

    function tournamentFinishScreenVisible(table) {
      if (!tableUsesTournamentMode(table) || (!heroBusted(table) && !tournamentWon(table))) return false;
      if (isActionSequenceActive(table)) return false;
      if (table?.status === "showdown" && showdownTerminalControlsLocked(table)) return false;
      return true;
    }

    function tournamentWon(table) {
      if (!tableUsesTournamentMode(table) || heroBusted(table)) return false;
      return table?.resultKind === "tournament-won"
        || table?.tournamentComplete === true
        || String(table?.result || "") === "Hero wins tournament";
    }

    function tournamentFinishSummary(table) {
      const finish = table?.tournamentFinish && typeof table.tournamentFinish === "object"
        ? table.tournamentFinish
        : null;
      const seats = Array.isArray(table?.seats) ? table.seats : [];
      const activeOpponents = seats.filter((seat) =>
        seat
        && !seat.isHero
        && String(seat.lobbyState || "active") !== "eliminated"
        && Number(seat.stack || 0) > 0
      ).length;
      const fallbackEntrants = Math.max(
        activeOpponents + 1,
        Math.floor(Number(table?.seatSlotCount || table?.playerCount || seats.length || 0)) || activeOpponents + 1
      );
      const entrants = Math.max(1, Math.floor(Number(finish?.entrants || fallbackEntrants)));
      const place = Math.min(
        entrants,
        Math.max(1, Math.floor(Number(finish?.place || activeOpponents + 1)))
      );
      return {
        place,
        entrants,
        handsPlayed: Math.max(1, Math.floor(Number(finish?.handsPlayed || table?.tournamentHandNo || table?.handNo || 1))),
        level: Math.max(1, Math.floor(Number(finish?.level || table?.blindLevel || 1))),
        blindMultiplier: Number(finish?.blindMultiplier || table?.blindMultiplier || 1),
        reason: String(finish?.reason || table?.bustedReason || table?.result || table?.lastAction || "")
      };
    }

    function formatTournamentPlace(summary) {
      const place = Math.max(1, Math.floor(Number(summary?.place || 1)));
      const entrants = Math.max(place, Math.floor(Number(summary?.entrants || place)));
      return `${place}-е место из ${entrants}`;
    }

    function formatTournamentHands(count) {
      const hands = Math.max(1, Math.floor(Number(count || 1)));
      return `${hands} ${russianPlural(hands, "раздачу", "раздачи", "раздач")}`;
    }

    function tournamentHandsLabel(count) {
      const hands = Math.max(1, Math.floor(Number(count || 1)));
      return russianPlural(hands, "раздача", "раздачи", "раздач");
    }

    function russianPlural(value, one, few, many) {
      const number = Math.abs(Math.floor(Number(value || 0)));
      const lastTwo = number % 100;
      const last = number % 10;
      if (lastTwo >= 11 && lastTwo <= 14) return many;
      if (last === 1) return one;
      if (last >= 2 && last <= 4) return few;
      return many;
    }

    function resultTitle(table, fallback = "Раздача завершена") {
      if (heroBusted(table)) return "Ты вылетел";
      if (tournamentWon(table)) return "Ты выиграл турнир";
      return compactActionText(fallback);
    }

    return {
      renderTournamentFinishScreen,
      tournamentFinishScreenVisible,
      tournamentWon,
      tournamentFinishSummary,
      formatTournamentPlace,
      formatTournamentHands,
      tournamentHandsLabel,
      russianPlural,
      resultTitle
    };
  }

  root.PokerSimulatorTournamentFinish = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
