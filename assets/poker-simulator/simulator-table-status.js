(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getSettings = typeof options.getSettings === "function" ? options.getSettings : () => ({});
    const getTables = typeof options.getTables === "function" ? options.getTables : () => [];
    const getStarted = typeof options.getStarted === "function" ? options.getStarted : () => false;
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : (value) => String(value ?? "");
    const decisionTimebankSeconds = typeof options.decisionTimebankSeconds === "function" ? options.decisionTimebankSeconds : () => 0;
    const formatBlindMultiplier = typeof options.formatBlindMultiplier === "function" ? options.formatBlindMultiplier : (value) => String(value ?? 1);
    const isPaused = typeof options.isPaused === "function" ? options.isPaused : () => false;
    const dealAnimationActive = typeof options.dealAnimationActive === "function" ? options.dealAnimationActive : () => false;
    const isActionSequenceActive = typeof options.isActionSequenceActive === "function" ? options.isActionSequenceActive : () => false;
    const showdownVisualSequenceActive = typeof options.showdownVisualSequenceActive === "function" ? options.showdownVisualSequenceActive : () => false;
    const isVisualActive = typeof options.isVisualActive === "function" ? options.isVisualActive : () => false;
    const canHeroAct = typeof options.canHeroAct === "function" ? options.canHeroAct : () => false;
    const compactActionText = typeof options.compactActionText === "function" ? options.compactActionText : (value) => String(value ?? "");
    const actionHint = typeof options.actionHint === "function" ? options.actionHint : () => "";
    const renderAutoDealCountdown = typeof options.renderAutoDealCountdown === "function" ? options.renderAutoDealCountdown : () => "";
    const renderActionClock = typeof options.renderActionClock === "function" ? options.renderActionClock : () => "";
    const showdownWinnerVisible = typeof options.showdownWinnerVisible === "function" ? options.showdownWinnerVisible : () => false;
    const showdownAwardVisible = typeof options.showdownAwardVisible === "function" ? options.showdownAwardVisible : () => false;
    const showdownPotAwardSettled = typeof options.showdownPotAwardSettled === "function" ? options.showdownPotAwardSettled : () => true;
    const showdownWinnerStatusText = typeof options.showdownWinnerStatusText === "function" ? options.showdownWinnerStatusText : () => "";
    const showdownPotAwardStatusText = typeof options.showdownPotAwardStatusText === "function" ? options.showdownPotAwardStatusText : () => "";
    const allInRunoutStageState = typeof options.allInRunoutStageState === "function" ? options.allInRunoutStageState : () => null;
    const allInEquityDisplayReady = typeof options.allInEquityDisplayReady === "function" ? options.allInEquityDisplayReady : () => false;
    const allInRunoutShowsEquity = typeof options.allInRunoutShowsEquity === "function" ? options.allInRunoutShowsEquity : () => false;
    const visibleStreet = typeof options.visibleStreet === "function" ? options.visibleStreet : () => "preflop";
    const streetLabel = typeof options.streetLabel === "function" ? options.streetLabel : (value) => String(value || "");
    const resultTitle = typeof options.resultTitle === "function" ? options.resultTitle : (_table, fallback = "Раздача завершена") => fallback;
    const heroBusted = typeof options.heroBusted === "function" ? options.heroBusted : () => false;
    const tableUsesTournamentMode = typeof options.tableUsesTournamentMode === "function" ? options.tableUsesTournamentMode : () => false;
    const trainerFeedbackForTable = typeof options.trainerFeedbackForTable === "function" ? options.trainerFeedbackForTable : () => null;
    const autoDealLabel = typeof options.autoDealLabel === "function" ? options.autoDealLabel : () => "";
    const tournamentFinishScreenVisible = typeof options.tournamentFinishScreenVisible === "function" ? options.tournamentFinishScreenVisible : () => false;
    const heroIsAllIn = typeof options.heroIsAllIn === "function" ? options.heroIsAllIn : () => false;
    const isActionRevealLocked = typeof options.isActionRevealLocked === "function" ? options.isActionRevealLocked : () => false;
    const seatPoint = typeof options.seatPoint === "function" ? options.seatPoint : () => ({ x: 50, y: 50 });
    const seatZone = typeof options.seatZone === "function" ? options.seatZone : () => "mid";
    const actionI18n = options.actionI18n || root.PokerSimulatorActionI18n || {};
    const localizeActionText = typeof actionI18n.localizeActionText === "function" ? actionI18n.localizeActionText : (value) => value;
    const currentSessionPayload = typeof options.currentSessionPayload === "function" ? options.currentSessionPayload : () => null;
    const sessionMetrics = typeof options.sessionMetrics === "function" ? options.sessionMetrics : () => ({});
    const signed = typeof options.signed === "function" ? options.signed : (value) => {
      const number = Number(value || 0);
      return `${number > 0 ? "+" : ""}${number}`;
    };
    const signedBb = typeof options.signedBb === "function" ? options.signedBb : (value) => `${signed(value)} BB`;
    const sessionHudRate = typeof options.sessionHudRate === "function"
      ? options.sessionHudRate
      : (stat) => (Number(stat?.opportunities || 0) ? `${Math.round(Number(stat.rate || 0) * 100)}%` : "—");
    const formatDecisionDuration = typeof options.formatDecisionDuration === "function" ? options.formatDecisionDuration : () => "—";
    const currentHandsPerHour = typeof options.currentHandsPerHour === "function" ? options.currentHandsPerHour : () => null;
    const formatHandsPerHour = typeof options.formatHandsPerHour === "function" ? options.formatHandsPerHour : () => "—";

    function formatServerBlind(value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) return "";
      return String(Math.round(number * 100) / 100);
    }

    function renderServerSimulationBadge(table) {
      const handText = Number(table.handNo || 0) > 0 ? `Рука ${Number(table.handNo || 0)}` : "Ожидание";
      const smallBlind = formatServerBlind(table.smallBlind);
      const bigBlind = formatServerBlind(table.bigBlind);
      const blindText = smallBlind && bigBlind ? ` · ${smallBlind}/${bigBlind} BB` : "";
      const occupied = Number(table.serverOccupiedCount || 0);
      const maxSeats = Number(table.serverMaxSeats || table.seatSlotCount || table.playerCount || 0);
      const seatsText = maxSeats > 0 ? ` · ${Math.max(0, occupied)}/${maxSeats}` : "";
      return `<div class="simulation-badge">Онлайн · ${escapeHtml(handText)}${escapeHtml(blindText)}${escapeHtml(seatsText)}</div>`;
    }

    function renderSimulationBadge(table) {
      if (!table) return "";
      if (table.serverMode) return renderServerSimulationBadge(table);
      const timer = decisionTimebankSeconds();
      const timerText = timer ? ` · ТБ ${timer}с` : "";
      if (table.simulationMode === "tournament") {
        return `<div class="simulation-badge">Турнир L${escapeHtml(table.blindLevel || 1)} · BB x${escapeHtml(table.blindMultiplier || 1)}${timerText}</div>`;
      }
      const settings = getSettings();
      return `<div class="simulation-badge">Рандом · ${escapeHtml(settings.randomStackMinBb)}-${escapeHtml(settings.randomStackMaxBb)} BB${timerText}</div>`;
    }

    function pauseSessionSummary() {
      const payload = currentSessionPayload() || {};
      const metrics = sessionMetrics({ ...payload, handLog: [] }) || {};
      const pokerStats = metrics.pokerStats || {};
      const hands = Number(pokerStats.hands ?? metrics.hands ?? 0);
      // EV BB / EV BB/100 are all-in-equity-adjusted money results (see
      // handEvResultForAggregate) — independent of the decision grader. The
      // grader's "good %" / decision-accuracy is intentionally NOT surfaced here
      // while it is still being validated.
      const evNetBb = Number(pokerStats.evNetBb ?? metrics.evNetBb ?? 0);
      const evBb100 = Number(pokerStats.evBb100 ?? metrics.evBb100 ?? 0);
      const handsPerHour = currentHandsPerHour(hands);
      const handsText = Number.isFinite(hands) ? String(hands) : "0";
      return {
        heroes: [
          {
            label: "EV BB",
            value: signed(evNetBb),
            unit: "BB",
            tone: evNetBb > 0 ? "up" : evNetBb < 0 ? "down" : "even",
            detail: `за ${handsText} рук`
          },
          {
            label: "EV BB/100",
            value: signed(evBb100),
            unit: "BB/100",
            tone: evBb100 > 0 ? "up" : evBb100 < 0 ? "down" : "even",
            detail: "винрейт сессии"
          }
        ],
        chips: [
          { label: "Руки", value: handsText },
          { label: "VPIP", value: sessionHudRate(pokerStats.preflop?.vpip) },
          { label: "PFR", value: sessionHudRate(pokerStats.preflop?.pfr) },
          { label: "3Bet", value: sessionHudRate(pokerStats.preflop?.threeBet) }
        ],
        footer: `Ср. ход ${formatDecisionDuration(metrics.averageDecisionMs)} · ${formatHandsPerHour(handsPerHour)} рук/ч`
      };
    }

    function renderPauseHeroCell(hero) {
      const toneClass = hero.tone === "up" ? " is-up" : hero.tone === "down" ? " is-down" : "";
      const unit = hero.unit ? `<span class="pause-unit">${escapeHtml(hero.unit)}</span>` : "";
      const detail = hero.detail ? `<p class="pause-hero-detail">${escapeHtml(hero.detail)}</p>` : "";
      return `
        <div class="pause-hero-cell">
          <div class="pause-hero-label">${escapeHtml(hero.label)}</div>
          <div class="pause-hero-value${toneClass}">${escapeHtml(hero.value)}${unit}</div>
          ${detail}
        </div>
      `;
    }

    function renderPauseChip(chip) {
      return `
        <div class="pause-stat">
          <p class="pause-stat-label">${escapeHtml(chip.label)}</p>
          <div class="pause-stat-value">${escapeHtml(chip.value)}</div>
        </div>
      `;
    }

    function renderPauseOverlay() {
      const hasPausableTable = getTables().some((table) =>
        table
        && (
          table.status === "playing"
          || dealAnimationActive(table)
          || isActionSequenceActive(table)
          || showdownVisualSequenceActive(table)
        )
      );
      if (!isPaused() || !getStarted() || !hasPausableTable) return "";
      const summary = pauseSessionSummary();
      return `
        <div class="pause-overlay" role="status" aria-live="polite">
          <div class="pause-overlay-card">
            <div class="pause-head">
              <div class="pause-head-text">
                <span class="pause-kicker"><span class="pause-pulse" aria-hidden="true"></span>Текущая сессия</span>
                <strong class="pause-title">Пауза</strong>
                <span class="pause-sub">Таймеры остановлены. Игра продолжится с того же места.</span>
              </div>
              <span class="pause-glyph" aria-hidden="true"><i></i><i></i></span>
            </div>
            <div class="pause-hero">
              ${summary.heroes.map(renderPauseHeroCell).join("")}
            </div>
            <div class="pause-stats" aria-label="Статистика текущей сессии">
              ${summary.chips.map(renderPauseChip).join("")}
            </div>
            <div class="pause-foot">
              <span class="pause-note"><span class="pause-dot" aria-hidden="true"></span>${escapeHtml(summary.footer)}</span>
              <button class="pause-resume" type="button" data-action="resume-simulator">
                <span class="pause-tri" aria-hidden="true"><svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.2L10 6L1 10.8V1.2Z" fill="#1c1230"/></svg></span>
                Продолжить
              </button>
            </div>
          </div>
        </div>
      `;
    }

    function renderBlindLevelAnnouncement(table) {
      const announcement = table?.blindLevelAnnouncement;
      if (!announcement || !isVisualActive(table, "blindLevelAnnouncementUntil")) return "";
      const fromLevel = Number(announcement.fromLevel || Math.max(1, Number(table.blindLevel || 1) - 1));
      const toLevel = Number(announcement.toLevel || table.blindLevel || 1);
      const fromMultiplier = formatBlindMultiplier(announcement.fromMultiplier || 1);
      const toMultiplier = formatBlindMultiplier(announcement.toMultiplier || table.blindMultiplier || 1);
      const handNo = Number(announcement.handNo || table.tournamentHandNo || table.handNo || 0);
      const key = `blind-up-${table.id}-${toLevel}-${handNo}`;
      const label = `Блайнды выросли: уровень ${toLevel}, BB x${toMultiplier}`;
      return `
        <div class="blind-up-announcement" role="status" aria-live="polite" aria-label="${escapeHtml(label)}" data-animation-key="${escapeHtml(key)}">
          <span>Блайнды выросли</span>
          <strong>L${escapeHtml(toLevel)} · BB x${escapeHtml(toMultiplier)}</strong>
          <small>L${escapeHtml(fromLevel)} · x${escapeHtml(fromMultiplier)} -> L${escapeHtml(toLevel)} · x${escapeHtml(toMultiplier)}</small>
        </div>
      `;
    }

    function isPlainHeroFoldResult(table) {
      if (!table || heroBusted(table)) return false;
      const result = String(table.result || table.lastAction || "");
      return table.status === "folded" || result === "Hero fold";
    }

    function renderResultBanner(table) {
      if (!table || table.status === "playing" || isActionSequenceActive(table)) return "";
      if (tournamentFinishScreenVisible(table)) return "";
      if (table.status === "showdown") return "";
      if (isPlainHeroFoldResult(table)) return "";
      const title = resultTitle(table, table.result || table.lastAction || "Раздача завершена");
      return `
        <div class="result-banner is-${resultTone(table)}">
          <strong>${escapeHtml(title)}</strong>
        </div>
      `;
    }

    function renderActionStatus(table) {
      const status = actionStatusState(table);
      if (!status || status.hidden) return "";
      const detailHtml = status.autoCountdown
        ? renderAutoDealCountdown(table, "action-status-countdown")
        : escapeHtml(status.detail);
      const clockHtml = status.clock ? renderActionClock(table, "action-status-clock") : "";
      return `
        <div class="action-status is-${status.tone}">
          <strong>${escapeHtml(status.title)}</strong>
          <span>${detailHtml}${clockHtml}</span>
        </div>
      `;
    }

    function actionClockVisible(table) {
      return Boolean(table?.serverMode || decisionTimebankSeconds());
    }

    function serverResultDetail() {
      return "Ждём следующую раздачу";
    }

    function isServerWaitingTable(table) {
      return Boolean(table?.serverMode && table.status === "playing" && !table.serverHandStatus && Number(table.handNo || 0) <= 0);
    }

    function serverWaitingStatus(table) {
      const title = table?.serverCanStart ? "Готово к раздаче" : "Ждём игроков";
      const detail = table?.serverCanStart
        ? "Серверный стол готов к следующей руке"
        : "Нужен второй игрок или bot-fill";
      return { tone: "bot", title, detail };
    }

    function actionStatusState(table) {
      if (isPaused()) {
        return { tone: "paused", title: "Пауза", detail: "Таймеры остановлены" };
      }
      if (table && canHeroAct(table)) {
        return { tone: "hero", title: "Ваше слово", detail: compactActionText(actionHint(table)), clock: actionClockVisible(table) };
      }
      if (table && isActionSequenceActive(table)) {
        return { hidden: true };
      }
      if (isServerWaitingTable(table)) {
        return serverWaitingStatus(table);
      }
      if (table?.status === "showdown" && !showdownWinnerVisible(table)) {
        const stage = allInRunoutStageState(table);
        if (stage) {
          const title = stage.index <= 0 ? "Олл-ин" : streetLabel(stage.stage?.street || visibleStreet(table));
          const showEquity = allInEquityDisplayReady(table) && allInRunoutShowsEquity(table, stage);
          const detail = stage.index <= 0
            ? (showEquity ? "Открываем руки и equity" : "Открываем руки")
            : (showEquity ? `Борд ${Array.isArray(stage.stage?.board) && stage.stage.board.length ? stage.stage.board.join(" ") : "префлоп"}` : "Считаем комбинацию");
          return { tone: "all-in", title, detail };
        }
        return { tone: "bot", title: "Шоудаун", detail: "Открываем карты" };
      }
      if (table?.status === "showdown" && !showdownAwardVisible(table)) {
        return { tone: resultTone(table), title: "Победитель", detail: showdownWinnerStatusText(table) };
      }
      if (table?.status === "showdown" && !showdownPotAwardSettled(table)) {
        return { tone: resultTone(table), title: "Банк", detail: showdownPotAwardStatusText(table) };
      }
      if (!table || table.status !== "playing") {
        const title = resultTitle(table, table?.result || table?.lastAction || "Раздача завершена");
        if (heroBusted(table)) {
          return { tone: resultTone(table), title, detail: resultBannerDetail(table) };
        }
        if (table?.serverMode) {
          return { tone: resultTone(table), title, detail: serverResultDetail(table) };
        }
        if (table && !getSettings().trainingMode) {
          return { tone: resultTone(table), title, detail: actionHint(table), autoCountdown: true };
        }
        return { tone: resultTone(table), title, detail: actionHint(table) };
      }
      const villain = table.seats?.[table.activeVillain];
      return turnIndicatorState(table, villain);
    }

    function turnIndicatorState(table, villain) {
      if (table.busy) {
        const position = villain?.position || "Bot";
        return { tone: "bot", title: `${position} думает`, detail: compactActionText(table.lastAction || streetLabel(table.street)) };
      }

      if (heroIsAllIn(table)) {
        return { tone: "all-in", title: "Олл-ин", detail: "Борд до шоудауна" };
      }

      if (isActionRevealLocked(table)) {
        return { hidden: true };
      }

      if (canHeroAct(table)) {
        return { tone: "hero", title: "Ваше слово", detail: compactActionText(actionHint(table)) };
      }

      return { tone: "bot", title: streetLabel(table.street), detail: localizeActionText(compactActionText(table.lastAction || "")) };
    }

    function resultBannerDetail(table) {
      if (heroBusted(table)) {
        const prefix = tableUsesTournamentMode(table) ? "Турнир закончен" : "Стек 0 BB";
        return `${prefix} · ${compactActionText(table.bustedReason || table.result || "раздача проиграна")}`;
      }
      const feedback = trainerFeedbackForTable(table)?.feedback;
      if (getSettings().trainingMode && feedback?.detail) return `${feedback.label}: ${feedback.detail}`;
      if (getSettings().trainingMode) return "Новая раздача вручную";
      return autoDealLabel(table);
    }

    function resultTone(table) {
      if (heroBusted(table)) return "busted";
      // Prefer the engine's authoritative resultKind: a side-pot win is recorded
      // as resultKind "won"/"split" even though table.result reads
      // "X wins main, Hero wins side N" — string-prefix alone mis-colors it loss.
      const kind = String(table?.resultKind || "").toLowerCase();
      if (kind === "split" || kind === "chop") return "split";
      if (kind === "won" || kind === "tournament-won") return "win";
      if (kind === "lost") return "loss";
      const result = String(table?.result || table?.lastAction || "");
      if (result.startsWith("Split")) return "split";
      if (table?.status === "won" || result.startsWith("Hero win") || result.includes("Hero wins side")) return "win";
      return "loss";
    }

    function actionBarClass(table) {
      const classes = [];
      const hero = Array.isArray(table?.seats) ? table.seats.find((seat) => seat.isHero) : null;
      if (hero) classes.push(`hero-zone-${seatZone(seatPoint(table, hero.id))}`);
      if (!table || table.status !== "playing") classes.push("is-result");
      else if (heroIsAllIn(table)) classes.push("is-all-in");
      else if (table.busy) classes.push("is-bot-turn");
      else if (canHeroAct(table)) classes.push("is-hero-turn");
      else classes.push("is-waiting");
      return classes.join(" ");
    }

    return {
      renderSimulationBadge,
      renderPauseOverlay,
      renderBlindLevelAnnouncement,
      renderResultBanner,
      renderActionStatus,
      actionStatusState,
      turnIndicatorState,
      resultBannerDetail,
      resultTone,
      actionBarClass,
      isPlainHeroFoldResult
    };
  }

  root.PokerSimulatorTableStatus = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
