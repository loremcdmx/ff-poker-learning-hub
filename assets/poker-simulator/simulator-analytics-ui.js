(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const GOOGLE_AUTH_UI_VISIBLE = false;

  function model(options = {}) {
    const {
      getState,
      currentSessionPayload,
      sessionMetrics,
      activeSimulatorProfile,
      leaderboardEntries,
      currentLeaderboardPlayerEntry,
      leaderboardRankFor,
      leaderboardPlayerKey,
      leaderboardRatingFromMetrics,
      leaderboardDeleteTokenForEntry = () => "",
      cachedPokerStats,
      sessionGraphKit,
      roundBbMetric,
      emptyRateStat,
      trackedCbetStreets = [],
      trackedPositions = [],
      botLabKit,
      botLabBandSettings,
      startModel = {},
      streetLabel,
      simulationModeLabel: optionSimulationModeLabel,
      escapeHtml: optionEscapeHtml,
      formatDecisionDuration: optionFormatDecisionDuration
    } = options;

    // Tolerate a wiring gap: if either helper is missing, fall back to a safe
    // default instead of throwing and taking down the whole analytics render.
    const escapeHtml = typeof optionEscapeHtml === "function" ? optionEscapeHtml : (value) => String(value ?? "");
    const formatDecisionDuration = typeof optionFormatDecisionDuration === "function" ? optionFormatDecisionDuration : (ms) => String(ms ?? "—");

    const state = getState();
    const simulationModeLabel = typeof optionSimulationModeLabel === "function"
      ? optionSimulationModeLabel
      : typeof startModel.simulationModeLabel === "function"
        ? startModel.simulationModeLabel
        : (value) => String(value || "");

  function renderAnalytics() {
    const currentPayload = currentSessionPayload();
    const current = sessionMetrics(currentPayload);
    const compare = state.compareSession ? sessionMetrics(state.compareSession) : null;
    return `
      <div class="analytics-grid">
        <section class="analytics-card">
          <h3>Сессия</h3>
          <div class="analytics-list">
            ${metricRow("Руки", current.hands, compare?.hands)}
            ${metricRow("Winrate", percent(current.winRate), compare ? compare.winRate * 100 : null, { suffix: "%", currentNumeric: current.winRate * 100 })}
            ${metricRow("Шоудаун", current.showdowns, compare?.showdowns)}
            ${metricRow("Fold hands", current.folds, compare?.folds, { higherGood: false })}
          </div>
        </section>
        <section class="analytics-card">
          <h3>Hand log</h3>
          <div class="analytics-list">
            ${metricRow("JSONL рук", current.handLogHands || current.hands, compare ? (compare.handLogHands || compare.hands) : null)}
            ${metricRow("Net BB", signedBb(current.pokerStats.netBb), compare?.pokerStats?.netBb, { currentNumeric: current.pokerStats.netBb })}
            ${metricRow("BB/100", signed(current.pokerStats.bb100), compare?.pokerStats?.bb100, { currentNumeric: current.pokerStats.bb100 })}
            ${metricRow("Вес рук", percent(current.leaderboard.confidence), compare ? compare.leaderboard.confidence * 100 : null, { suffix: "%", currentNumeric: current.leaderboard.confidence * 100 })}
            ${metricRow("Session id", currentPayload.sessionId || state.sessionId, null)}
          </div>
        </section>
        <section class="analytics-card">
          <h3>Preflop stats</h3>
          <div class="analytics-list">
            ${renderPreflopStatsRows(current.pokerStats, compare?.pokerStats)}
          </div>
        </section>
        <section class="analytics-card">
          <h3>Решения Hero</h3>
          <div class="analytics-list">
            ${metricRow("Решения", current.decisions, compare?.decisions)}
            ${metricRow("Ср. время", formatDecisionDuration(current.averageDecisionMs), compare?.averageDecisionSeconds, { suffix: "s", currentNumeric: current.averageDecisionSeconds === null ? undefined : current.averageDecisionSeconds, higherGood: false })}
            ${metricRow("Good", percent(current.goodRate), compare ? compare.goodRate * 100 : null, { suffix: "%", currentNumeric: current.goodRate * 100 })}
          </div>
        </section>
        <section class="analytics-card">
          <h3>Темп игры</h3>
          <div class="analytics-list">
            ${metricRow("Aggression", percent(current.aggressionRate), compare ? compare.aggressionRate * 100 : null, { suffix: "%", currentNumeric: current.aggressionRate * 100 })}
            ${metricRow("Timed moves", current.timedDecisionCount, compare?.timedDecisionCount)}
            ${metricRow("Bot lab spots", current.botLab?.sampleSize || 0, compare?.botLab?.sampleSize || null)}
            ${metricRow("Текущий pack", currentPayload.settings?.pack || state.settings.pack, null)}
            ${metricRow("Сравнение", state.compareSession ? state.compareSession.label : "нет импорта", null)}
          </div>
        </section>
        <section class="analytics-card">
          <h3>По улицам</h3>
          <div class="analytics-table">
            ${countRows(current.streets, compare?.streets, "Нет решений.")}
          </div>
        </section>
        <section class="analytics-card">
          <h3>Действия</h3>
          <div class="analytics-table">
            ${countRows(current.actions, compare?.actions, "Нет действий Hero.")}
          </div>
        </section>
        <section class="analytics-card">
          <h3>Категории</h3>
          <div class="analytics-table">
            ${countRows(current.feedbackByCategory, compare?.feedbackByCategory, "Нет фидбека.")}
          </div>
        </section>
        <section class="analytics-card is-wide">
          <h3>C-bet Hero</h3>
          <div class="analytics-subgrid">
            ${renderCbetStatsPanels(current.pokerStats, compare?.pokerStats)}
          </div>
        </section>
        <section class="analytics-card is-wide">
          <h3>Bot lab</h3>
          ${renderBotLabAnalytics(current.botLab)}
        </section>
        <section class="analytics-card is-wide">
          <h3>Слабые места / дальше</h3>
          ${renderSessionCoach(current)}
        </section>
      </div>
    `;
  }

  function renderLeaderboard() {
    const filters = currentLeaderboardFilters();
    const initialLoading = leaderboardRemoteInitialLoading();
    const entries = leaderboardEntries(filters);
    // First remote fetch still in flight: local data (archive/current session)
    // renders immediately with a slim refresh note; the blocking skeleton is
    // reserved for the truly-empty first visit where there is nothing to show.
    if (initialLoading && !entries.length) {
      return `
        <div class="leaderboard-dashboard">
          ${renderLeaderboardHero([], 0, {})}
          ${renderLeaderboardLoading()}
        </div>
      `;
    }
    const displayEntries = leaderboardDisplayEntries(entries, filters);
    const current = currentLeaderboardPlayerEntry(entries);
    const currentRank = leaderboardRankFor(current, entries);
    const top = displayEntries.slice(0, 10);
    // The podium is a result, not a preview of the table below. Short samples
    // remain visible in the rating table, but must not look like medal places
    // before they reach the qualification threshold. Search and alternate table
    // sorts are browsing tools only; Top-3 stays on the canonical score order.
    const podiumEntries = entries
      .filter((entry) => (entry.rating || leaderboardRatingFromMetrics(entry.metrics || {})).qualified)
      .slice(0, 3);
    const tableEntries = top;
    const currentKey = current ? leaderboardPlayerKey(current) : "";
    const currentIsVisible = current && tableEntries
      .some((entry) => entry.id === current.id || leaderboardPlayerKey(entry) === currentKey);
    // Keep a ranked current player visible below a score/hands/EV top-10, but do
    // not inject them into an unrelated search or a facet they do not match.
    const extraCurrent = current && currentRank > 0 && !currentIsVisible && !filters.query ? [current] : [];
    const score = current?.rating || leaderboardRatingFromMetrics(cachedPokerStats());
    const profile = activeSimulatorProfile();
    const rows = [...tableEntries, ...extraCurrent]
      .map((entry) => renderLeaderboardRow(entry, entries.indexOf(entry), current?.id, currentKey, entries))
      .join("");
    return `
      <div class="leaderboard-dashboard">
        ${renderLeaderboardHero(entries, currentRank, score)}
        ${initialLoading ? renderLeaderboardRefreshNote() : ""}
        <div class="leaderboard-main-grid">
          <section class="leaderboard-focus" aria-label="Твой результат и график">
            ${renderLeaderboardCurrent(profile, currentRank, score)}
            ${renderLeaderboardGraph(score)}
          </section>
          ${renderLeaderboardPodium(podiumEntries, entries)}
        </div>
        ${renderLeaderboardTable(rows, entries, currentRank, score)}
      </div>
    `;
  }

  function leaderboardRemoteInitialLoading() {
    const remote = state.leaderboardRemote || {};
    const status = String(remote.status || "idle");
    if (typeof root.fetch !== "function") return false;
    // Remote data already landed at least once — never show first-load chrome.
    if (remote.configured || (Array.isArray(remote.entries) && remote.entries.length)) return false;
    const fetchedAt = String(remote.fetchedAt || remote.playerStats?.fetchedAt || "");
    if (!fetchedAt) return ["idle", "loading"].includes(status);
    // A prior fetch failed (fetchedAt is stamped on failure too, e.g. an
    // offline boot prefetch): keep the loading chrome for live retries so the
    // first successful open doesn't masquerade as an empty board.
    return status === "loading";
  }

  function renderLeaderboardLoading() {
    return `
      <section class="leaderboard-loading-panel" aria-label="Загрузка лидерборда" aria-busy="true">
        <span class="leaderboard-loading-spinner" aria-hidden="true"></span>
        <strong>Загружаем полный рейтинг</strong>
        <span>Собираем сезон, all-time и фильтры — обычно это пара секунд.</span>
        <div class="leaderboard-loading-skeleton" aria-hidden="true">
          <i></i><i></i><i></i>
        </div>
      </section>
    `;
  }

  function renderLeaderboardRefreshNote() {
    return `
      <div class="leaderboard-refresh-note" role="status" aria-busy="true">
        <span class="leaderboard-loading-spinner" aria-hidden="true"></span>
        <span>Обновляем общий рейтинг — пока показаны данные этого устройства.</span>
      </div>
    `;
  }

  function renderLeaderboardHero(entries, currentRank, score) {
    return `
      <header class="leaderboard-hero" aria-label="Гонка сезона">
        <div class="leaderboard-brandline">
          <span class="leaderboard-brand" aria-label="FF"><img src="assets/player-survey/ff-logo.png" alt=""></span>
          <span class="leaderboard-brand-divider" aria-hidden="true"></span>
          <strong>Гонка сезона</strong>
        </div>
        ${renderLeaderboardFilters()}
        <button class="leaderboard-close-button" type="submit" value="close" aria-label="Закрыть окно">
          <span aria-hidden="true">×</span>
        </button>
      </header>
    `;
  }

  function renderLeaderboardFilters() {
    const filters = currentLeaderboardFilters();
    const season = leaderboardSeasonUiConfig();
    const daysLeft = leaderboardSeasonDaysLeft(season);
    const deadline = daysLeft ? `До финиша ${daysLeft} ${pluralRu(daysLeft, "день", "дня", "дней")}` : "Сезон активен";
    const chip = (group, value, label) => `
      <button class="leaderboard-filter-chip ${String(filters[group] || "all") === value ? "is-active" : ""}" type="button" data-lb-filter="${group}" data-lb-value="${value}" aria-pressed="${String(filters[group] || "all") === value}">${label}</button>`;
    const sortLabel = filters.sort === "hands" ? "Руки" : filters.sort === "evbb" ? "EVBB" : "Очки";
    return `
      <section class="leaderboard-filters" aria-label="Фильтры рейтинга">
        <div class="leaderboard-filter-group is-period" role="group" aria-label="Период">
          ${chip("period", "season", "Сезон")}
          ${chip("period", "all", "Всё время")}
        </div>
        <div class="leaderboard-season-note" aria-label="Состояние сезона">
          <span>${escapeHtml(season.label || "Сезон")}</span>
          <b>${escapeHtml(deadline)}</b>
        </div>
        <div class="leaderboard-filter-group" role="group" aria-label="Размер стола">
          ${chip("players", "hu", "2-max")}
          ${chip("players", "short", "3–6")}
          ${chip("players", "full", "7–8")}
        </div>
        <div class="leaderboard-filter-group" role="group" aria-label="Сложность состава">
          ${chip("difficulty", "easy", "Легко")}
          ${chip("difficulty", "standard", "Средне")}
          ${chip("difficulty", "pro", "Сложно")}
        </div>
        <div class="leaderboard-search" role="search">
          <input data-lb-search type="search" value="${escapeHtml(filters.query || "")}" placeholder="Поиск игрока" aria-label="Поиск игрока в рейтинге">
          <button class="leaderboard-sort-button" type="button" data-lb-filter="sort" data-lb-value="${escapeHtml(nextLeaderboardSort(filters.sort))}" title="${escapeHtml(`Сортировка: ${sortLabel}. Нажми, чтобы переключить.`)}" aria-label="${escapeHtml(`Сортировка: ${sortLabel}. Нажми, чтобы переключить.`)}">
            <i aria-hidden="true"></i>
            <span>${escapeHtml(sortLabel)}</span>
          </button>
        </div>
      </section>
    `;
  }

  function currentLeaderboardFilters() {
    const raw = state.leaderboardFilters && typeof state.leaderboardFilters === "object"
      ? state.leaderboardFilters
      : {};
    const defaultPlayers = (() => {
      const count = Number(state.settings?.playerCount || 0);
      if (count === 2) return "hu";
      if (count >= 7) return "full";
      if (count >= 3) return "short";
      return "all";
    })();
    return {
      period: ["season", "all", "7d", "today"].includes(raw.period) ? raw.period : "season",
      players: ["all", "hu", "short", "full"].includes(raw.players) ? raw.players : defaultPlayers,
      difficulty: ["all", "easy", "standard", "pro"].includes(raw.difficulty) ? raw.difficulty : "standard",
      query: cleanSeasonText(raw.query, "", 40),
      sort: ["score", "hands", "evbb"].includes(raw.sort) ? raw.sort : "score"
    };
  }

  function cleanSeasonText(value, fallback = "", maxLength = 80) {
    const text = String(value || fallback || "").replace(/\s+/g, " ").trim();
    return text.slice(0, maxLength);
  }

  function normalizeSeasonBoundary(value) {
    const text = cleanSeasonText(value, "", 80);
    if (!text) return "";
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  function leaderboardSeasonUiConfig() {
    const remote = state.leaderboardRemote?.season;
    const globalSeason = root.PokerSimulatorLeaderboardSeason;
    const raw = remote && typeof remote === "object"
      ? remote
      : globalSeason && typeof globalSeason === "object"
      ? globalSeason
      : {};
    const startAt = normalizeSeasonBoundary(raw.startAt || raw.start || raw.startsAt);
    const endAt = normalizeSeasonBoundary(raw.endAt || raw.end || raw.endsAt);
    return {
      id: cleanSeasonText(raw.id || raw.key || (startAt ? `season-${startAt.slice(0, 10)}` : "season-current")),
      label: cleanSeasonText(raw.label || raw.name || "Сезон"),
      startAt,
      endAt,
      configured: Boolean(raw.configured || startAt || endAt)
    };
  }

  function leaderboardSeasonDaysLeft(season = leaderboardSeasonUiConfig()) {
    const endMs = season.endAt ? Date.parse(season.endAt) : 0;
    if (!Number.isFinite(endMs) || !endMs) return 0;
    return Math.max(0, Math.ceil((endMs - Date.now()) / 86400000));
  }

  function pluralRu(count, one, few, many) {
    const mod10 = Math.abs(count) % 10;
    const mod100 = Math.abs(count) % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  function nextLeaderboardSort(sort) {
    if (sort === "score") return "hands";
    if (sort === "hands") return "evbb";
    return "score";
  }

  const LEADERBOARD_VOLUME_MILESTONES = [200, 500, 1000, 3000, 10000];

  // Piecewise-linear volume scale: each milestone interval occupies one equal
  // fifth of the bar, so the fill lines up exactly with the evenly-spaced
  // markers (a linear hands/target scale cannot — 500 hands is not 5% of 10k).
  function leaderboardVolumeProgressPercent(hands, milestones = LEADERBOARD_VOLUME_MILESTONES) {
    const value = Math.max(0, Number(hands) || 0);
    let lowerBound = 0;
    for (let index = 0; index < milestones.length; index += 1) {
      const upperBound = milestones[index];
      if (value < upperBound) {
        const span = Math.max(1, upperBound - lowerBound);
        return Math.round(((index + (value - lowerBound) / span) / milestones.length) * 1000) / 10;
      }
      lowerBound = upperBound;
    }
    return 100;
  }

  function leaderboardDisplayEntries(entries, filters = currentLeaderboardFilters()) {
    const source = Array.isArray(entries) ? entries : [];
    const query = String(filters.query || "").trim().toLowerCase();
    const filtered = query
      ? source.filter((entry) => leaderboardEntrySearchText(entry).includes(query))
      : source.slice();
    const scoreFor = (entry) => Number((entry.rating || leaderboardRatingFromMetrics(entry.metrics || {})).score || 0);
    const handsFor = (entry) => Number(entry.metrics?.hands || entry.rating?.hands || 0);
    const evbbFor = (entry) => Number((entry.rating || leaderboardRatingFromMetrics(entry.metrics || {})).bb100 || 0);
    const originalIndex = new Map(source.map((entry, index) => [entry, index]));
    if (filters.sort === "hands") {
      return filtered.sort((a, b) => handsFor(b) - handsFor(a) || scoreFor(b) - scoreFor(a) || (originalIndex.get(a) || 0) - (originalIndex.get(b) || 0));
    }
    if (filters.sort === "evbb") {
      return filtered.sort((a, b) => evbbFor(b) - evbbFor(a) || scoreFor(b) - scoreFor(a) || (originalIndex.get(a) || 0) - (originalIndex.get(b) || 0));
    }
    return filtered.sort((a, b) => scoreFor(b) - scoreFor(a) || handsFor(b) - handsFor(a) || (originalIndex.get(a) || 0) - (originalIndex.get(b) || 0));
  }

  function leaderboardEntrySearchText(entry) {
    const profileName = entry?.profile?.name || "";
    const pieces = [
      profileName,
      entry?.label || "",
      entry?.mode ? simulationModeLabel(entry.mode) : "",
      entry?.difficulty || "",
      entry?.playerCount ? `${entry.playerCount}-max` : "",
      entry?.tableCount ? `${entry.tableCount}` : ""
    ];
    return pieces.join(" ").toLowerCase();
  }

  function renderLeaderboardTable(rows, entries, currentRank, score) {
    const qualifiedCount = entries.filter((entry) => (entry.rating || leaderboardRatingFromMetrics(entry.metrics || {})).qualified).length;
    const currentPosition = !score.qualified
      ? `<b>${escapeHtml(score.neededHands || 0)}</b> рук до`
      : currentRank
        ? `<b>${escapeHtml(`#${currentRank}`)}</b> ты`
        : "<b>—</b> вне фильтра";
    return `
      <section class="leaderboard-top" aria-label="Топ игроков">
        <div class="leaderboard-top-head">
          <div><span>Рейтинг</span></div>
          <div class="leaderboard-top-meta">
            <span${leaderboardTooltipAttrs(`Всего игроков в выбранном фильтре: ${entries.length || 0}.`)}>
              <b>${escapeHtml(entries.length || 0)}</b> игроков
            </span>
            <span${leaderboardTooltipAttrs(`Зачтены игроки с минимум ${score.qualificationHands || 20} руками: ${qualifiedCount}. Короткие выборки видны ниже, но получают штраф выборки.`)}>
              <b>${escapeHtml(qualifiedCount)}</b> зачтено
            </span>
            <span${leaderboardTooltipAttrs(leaderboardRankTooltip(score, currentRank))}>
              ${currentPosition}
            </span>
          </div>
        </div>
        ${rows || !entries.length ? `<section class="leaderboard-table" role="table" aria-label="Рейтинг игроков">
          <div class="leaderboard-row is-head" role="row">
            <span>Место</span>
            <span>Игрок</span>
            <span>Очки</span>
            <span>Руки</span>
            <span>EVBB</span>
            <span>Статус</span>
          </div>
          ${rows || '<div class="leaderboard-empty">Пока нет сыгранных рук.</div>'}
        </section>` : ""}
      </section>
    `;
  }

  function renderLeaderboardPodium(podiumEntries = [], allEntries = leaderboardEntries()) {
    const rows = podiumEntries.map((entry, index) => renderLeaderboardPodiumCard(entry, index, allEntries)).join("");
    const openSlots = Array.from(
      { length: Math.max(0, 3 - podiumEntries.length) },
      (_, index) => renderLeaderboardPodiumOpenSlot(podiumEntries.length + index + 1)
    ).join("");
    return `
      <aside class="leaderboard-podium-panel" aria-label="Топ-3 сезона">
        <div class="leaderboard-podium-head">
          <span>Топ-3 сезона</span>
          <strong>Лучшие сейчас</strong>
        </div>
        <div class="leaderboard-podium" aria-label="Первые места">${rows}${openSlots}</div>
      </aside>
    `;
  }

  function renderLeaderboardPodiumCard(entry, index, allEntries = leaderboardEntries()) {
    const rank = leaderboardRankFor(entry, allEntries) || index + 1;
    const metrics = entry.metrics || {};
    const rating = entry.rating || leaderboardRatingFromMetrics(metrics);
    const profileName = entry.profile?.name || "Guest";
    const sessionCount = Math.max(0, Math.round(Number(entry.sessionCount || 0)));
    const sessionLabel = sessionCount
      ? `${formatHandsCount(sessionCount)} ${leaderboardSessionPlural(sessionCount)}`
      : "сессии: —";
    const meta = [
      metrics.hands || rating.hands ? renderLeaderboardNumber(`${formatHandsCount(metrics.hands || rating.hands)} рук`, leaderboardHandsTooltip(rating), "span", "leaderboard-number is-inline") : "",
      renderLeaderboardNumber(formatEvbb(rating), leaderboardEvbbTooltip(rating), "span", "leaderboard-number is-inline")
    ].filter(Boolean).join('<span class="leaderboard-meta-separator" aria-hidden="true"> · </span>');
    const className = [
      "leaderboard-podium-card",
      `is-rank-${Math.min(rank, 3)}`,
      rating.qualified ? "" : "is-qualifying"
    ].filter(Boolean).join(" ");
    const qualifier = rating.qualified
      ? ""
      : `<em${leaderboardTooltipAttrs(leaderboardHandsTooltip(rating))}>${escapeHtml(`${rating.neededHands} рук до зачёта`)}</em>`;
    return `
      <article class="${className}">
        <span class="leaderboard-podium-medal"${leaderboardTooltipAttrs(leaderboardRankTooltip(rating, rank))}>${rank}</span>
        <span class="leaderboard-podium-rank" aria-hidden="true">${escapeHtml(leaderboardInitials(profileName))}</span>
        <div>
          <b title="${escapeHtml(profileName)}">${escapeHtml(profileName)}</b>
          <small>${meta || escapeHtml(entry.label || "Сессия")}</small>
        </div>
        ${renderLeaderboardNumber(formatLeaderboardScore(rating.score), leaderboardScoreTooltip(rating), "strong")}
        <span class="leaderboard-podium-streak">${escapeHtml(sessionLabel)}</span>
        ${qualifier}
      </article>
    `;
  }

  function renderLeaderboardPodiumOpenSlot(rank) {
    const className = [
      "leaderboard-podium-card",
      "is-open-slot",
      `is-rank-${Math.min(rank, 3)}`
    ].join(" ");
    return `
      <article class="${className}" aria-label="${escapeHtml(`Открытое место #${rank}`)}">
        <span class="leaderboard-podium-medal">${rank}</span>
        <span class="leaderboard-podium-rank" aria-hidden="true">FF</span>
        <div>
          <b>Место открыто</b>
          <small>появится после зачёта</small>
        </div>
        <strong>—</strong>
        <span class="leaderboard-podium-streak">ждём сессию</span>
      </article>
    `;
  }

  function renderLeaderboardCurrent(profile, currentRank, score) {
    const rankLabel = score.qualified && currentRank ? `#${currentRank}` : "—";
    const playerLabel = String(profile?.loggedIn ? profile.name : "").trim() || "Ты";
    const filters = currentLeaderboardFilters();
    const entries = leaderboardEntries(filters);
    const currentEntry = currentLeaderboardPlayerEntry(entries);
    const nextEntry = currentRank && currentRank > 1 ? entries[currentRank - 2] : null;
    const nextScore = Number((nextEntry?.rating || leaderboardRatingFromMetrics(nextEntry?.metrics || {})).score || 0);
    const neededScore = nextEntry
      ? Math.max(0, Math.ceil(nextScore - Number(score.score || 0)))
      : 0;
    const sessionHands = leaderboardGraphEntries(filters).length;
    const recentHands = Math.max(0, Number(currentSessionPayload()?.history?.length || 0));
    const sessionCount = Math.max(0, Math.round(Number(currentEntry?.sessionCount || 0)));
    const totalHands = Math.max(0, Math.round(Number(score.hands || 0)));
    const progress = leaderboardVolumeProgressPercent(totalHands);
    const nextMilestone = LEADERBOARD_VOLUME_MILESTONES.find((mark) => totalHands < mark) || null;
    const progressLabel = nextMilestone
      ? `${formatHandsCount(totalHands)} / ${formatHandsCount(nextMilestone)} рук`
      : `${formatHandsCount(totalHands)} рук · все вехи взяты`;
    const nextRank = !score.qualified
      ? "До зачёта"
      : !currentRank
        ? "Вне фильтра"
        : currentRank > 1
          ? `До след. ранга: #${currentRank - 1}`
          : "Лидер рейтинга";
    const rankBadge = score.qualified && currentRank ? "<em>зачёт</em>" : "";
    const recentHandsLabel = recentHands || sessionHands ? `+${formatHandsCount(recentHands || sessionHands)} рук` : "нет рук";
    const recentStatus = recentHands ? "текущая сессия" : (sessionHands ? "в выбранном фильтре" : "сыграй первую");
    const sessionLabel = sessionCount
      ? `${formatHandsCount(sessionCount)} ${leaderboardSessionPlural(sessionCount)}`
      : "нет данных";
    return `
      <section class="leaderboard-current" aria-label="Твоя сессия">
        <div class="leaderboard-current-main">
          <span class="leaderboard-current-tag">Твой результат</span>
          <div class="leaderboard-current-person">
            <span class="leaderboard-avatar" aria-hidden="true">${escapeHtml(leaderboardInitials(profile.loggedIn ? profile.name : "Ты"))}</span>
            <div>
              <small title="${escapeHtml(playerLabel)}">${escapeHtml(playerLabel)}</small>
              <b>${escapeHtml(rankLabel)}</b>
            </div>
            ${rankBadge}
          </div>
        </div>
        <div class="leaderboard-current-grid">
          <span class="leaderboard-current-kpi"${leaderboardTooltipAttrs(leaderboardScoreTooltip(score))}><small>Очки</small><b>${escapeHtml(formatLeaderboardScore(score.score))}</b></span>
          <span class="leaderboard-current-kpi"${leaderboardTooltipAttrs(leaderboardHandsTooltip(score))}><small>Руки</small><b>${escapeHtml(formatHandsCount(score.hands || 0))}</b></span>
          <span class="leaderboard-current-kpi"${leaderboardTooltipAttrs(leaderboardEvbbTooltip(score))}><small>EVBB</small><b>${escapeHtml(formatEvbb(score))}</b></span>
        </div>
        <div class="leaderboard-current-progress" aria-label="Прогресс объёма за сезон">
          <small><span>Прогресс сезона</span><b>${escapeHtml(progressLabel)}</b></small>
          <span><b style="width:${progress}%"></b></span>
          <div class="leaderboard-volume-markers" aria-hidden="true">
            ${LEADERBOARD_VOLUME_MILESTONES.map((mark, index) => `<i class="${totalHands >= mark ? "is-done" : ""}" style="left:${(index + 1) * (100 / LEADERBOARD_VOLUME_MILESTONES.length)}%"><b></b><em>${escapeHtml(formatHandsCount(mark))}</em></i>`).join("")}
          </div>
        </div>
        <div class="leaderboard-current-notes" aria-label="Детали результата">
          <span><small>Последняя сессия</small><b>${escapeHtml(recentHandsLabel)}</b><small>${escapeHtml(recentStatus)}</small></span>
          <span><small>Сессии</small><b>${escapeHtml(sessionLabel)}</b></span>
          <span><small>${escapeHtml(nextRank)}</small><b>${escapeHtml(
            !score.qualified
              ? `осталось ${formatHandsCount(score.neededHands || 0)} рук`
              : !currentRank
                ? "нет позиции в этом срезе"
                : currentRank === 1
                  ? "держишь 1-е место"
                  : neededScore
                    ? `нужно ${formatHandsCount(neededScore)} очков`
                    : "равные очки"
          )}</b></span>
        </div>
      </section>
    `;
  }

  function leaderboardSessionPlural(count) {
    const value = Math.abs(Math.floor(Number(count) || 0));
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return "сессия";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "сессии";
    return "сессий";
  }

  function renderLeaderboardJoin(profile, score, current = currentLeaderboardPlayerEntry(leaderboardEntries())) {
    const authenticated = Boolean(profile.authenticated || profile.authProvider);
    const nameValue = profile.loggedIn && !/^guest|гость$/i.test(String(profile.name || ""))
      ? profile.name
      : "";
    const hasNick = Boolean(profile.loggedIn && nameValue);
    const hasDeleteToken = Boolean(leaderboardDeleteTokenForEntry(current));
    const canDelete = Boolean(authenticated || hasDeleteToken);
    const ready = hasNick;
    const profileStatus = hasNick ? "ник сохранён" : "введи ник";
    const headline = hasNick ? profile.name : "Выбери ник для топа";
    const remoteStatus = leaderboardRemoteStatusLabel();
    const syncStatus = leaderboardSyncStatusLabel();
    const publishStatus = hasNick ? syncStatus : "Ник нужен для топа";
    return `
      <section class="leaderboard-join ${ready ? "is-ready" : "needs-auth"}" aria-label="Игрок лидерборда">
        <div class="leaderboard-join-main">
          <span>Ник игрока</span>
          <strong>${escapeHtml(headline)}</strong>
          <small>${escapeHtml(score.hands || 0)} рук · ${escapeHtml(profileStatus)}</small>
        </div>
        <div class="leaderboard-name-row">
          <input data-leaderboard-name-input type="text" maxlength="32" autocomplete="nickname" value="${escapeHtml(nameValue)}" placeholder="Ник в Discord" aria-label="Ник в лидерборде">
          <button class="primary-button" type="button" data-leaderboard-save-name>Сохранить</button>
          ${canDelete ? '<button class="ghost-button leaderboard-delete-button" type="button" data-leaderboard-delete-current>Удалить запись</button>' : ""}
        </div>
        <div class="leaderboard-sync-row" aria-live="polite">
          <span class="leaderboard-sync-note is-${escapeHtml(state.leaderboardRemote.status || "idle")}">${escapeHtml(remoteStatus)}</span>
          <span class="leaderboard-sync-note is-${escapeHtml(state.leaderboardSync.status || "idle")}">${escapeHtml(publishStatus)}</span>
        </div>
      </section>
    `;
  }

  function leaderboardRankSummary(rank, score) {
    const rankText = score.qualified
      ? (rank ? `#${rank}` : "без ранга")
      : `до зачета: ${score.neededHands} рук`;
    return `${rankText} · ${score.hands} рук · EVBB ${formatEvbb(score)}`;
  }

  function leaderboardRemoteStatusLabel() {
    const status = String(state.leaderboardRemote.status || "idle");
    if (status === "synced") return state.leaderboardRemote.message || "Рейтинг загружен";
    if (status === "loading") return "Рейтинг грузится";
    if (status === "not-configured") return "Локальный рейтинг";
    if (status === "failed") return "Рейтинг недоступен";
    return "Рейтинг";
  }

  function leaderboardSyncStatusLabel() {
    const status = String(state.leaderboardSync.status || "idle");
    if (status === "synced") return "Опубликовано";
    if (status === "pending") return "Публикуем";
    if (status === "not-configured") return "Локально";
    if (status === "failed") {
      // A rename/login throw reuses this badge for styling, but it is not a
      // publish failure — surface the rename error instead of the publish label.
      if (String(state.leaderboardSync.reason || "") === "rename") {
        return state.leaderboardSync.message || "Не удалось сохранить ник";
      }
      return "Не опубликовано";
    }
    return "Автопубликация";
  }

  function renderLeaderboardRow(entry, visualIndex, currentId, currentKey = "", allEntries = leaderboardEntries()) {
    const rank = leaderboardRankFor(entry, allEntries) || visualIndex + 1;
    const metrics = entry.metrics || {};
    const rating = entry.rating || leaderboardRatingFromMetrics(metrics);
    const profileName = entry.profile?.name || "Guest";
    const sessionsWord = (count) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return "сессия";
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "сессии";
      return "сессий";
    };
    const meta = [
      entry.sessionCount > 1 ? `${entry.sessionCount} ${sessionsWord(entry.sessionCount)}` : "",
      entry.mode ? simulationModeLabel(entry.mode) : "",
      entry.playerCount ? `${entry.playerCount}-max` : "",
      entry.tableCount ? `${entry.tableCount} стол${entry.tableCount === 1 ? "" : "а"}` : ""
    ].filter(Boolean).join(" · ");
    const isCurrent = entry.id === currentId || (currentKey && leaderboardPlayerKey(entry) === currentKey);
    const rowClass = [
      "leaderboard-row",
      isCurrent ? "is-current" : "",
      rank <= 3 ? `is-top-${rank}` : "",
      rating.qualified ? "" : "is-qualifying"
    ].filter(Boolean).join(" ");
    const nextMilestone = LEADERBOARD_VOLUME_MILESTONES.find((mark) => Number(rating.hands || metrics.hands || 0) < mark);
    const statusText = !rating.qualified
      ? `до зачёта: ${rating.neededHands} рук`
      : isCurrent && nextMilestone
        ? `до ${formatHandsCount(nextMilestone)} рук: ${Math.max(0, nextMilestone - Number(rating.hands || metrics.hands || 0))}`
        : "зачёт";
    const evbb = formatEvbb(rating);
    return `
      <article class="${rowClass}" role="row">
        <span class="leaderboard-rank"${leaderboardTooltipAttrs(leaderboardRankTooltip(rating, rank))}>${rank}</span>
        <span class="leaderboard-player">
          <span class="leaderboard-player-avatar" aria-hidden="true">${escapeHtml(leaderboardInitials(profileName))}</span>
          <span>
            <b>${escapeHtml(profileName)}</b>
            <small>${escapeHtml(meta || entry.label || "Сессия")}</small>
          </span>
        </span>
        ${renderLeaderboardNumber(formatLeaderboardScore(rating.score), leaderboardScoreTooltip(rating), "strong")}
        ${renderLeaderboardNumber(formatHandsCount(metrics.hands || rating.hands || 0), leaderboardHandsTooltip(rating))}
        ${renderLeaderboardNumber(evbb, leaderboardEvbbTooltip(rating), "span", `leaderboard-number ${Number(rating.bb100 || 0) < 0 ? "is-negative" : "is-positive"}`)}
        <span class="leaderboard-status"${leaderboardTooltipAttrs(rating.qualified ? leaderboardHandsTooltip(rating) : `${rating.neededHands} рук до зачёта. После ${rating.qualificationHands || 20} рук запись идёт без штрафа короткой выборки.`)}>${escapeHtml(statusText)}</span>
      </article>
    `;
  }

  function renderLeaderboardGraph(score = null) {
    const filters = currentLeaderboardFilters();
    const graphPeriod = currentLeaderboardGraphPeriod();
    // The personal winnings graph must NOT narrow by the table-size chip. In a
    // tournament / multi-table session the seat count changes hand-to-hand, so
    // the leaderboard facet (which drives the KPIs on the left) counts the whole
    // session under one size, while the per-hand stream carries each hand's real
    // size. Applying "Short/Full" to the per-hand graph split one logical session
    // across brackets and dropped its off-size hands — so the curve stopped
    // matching "Твой результат". Keep only the genuine per-session filters
    // (difficulty + the graph's own period).
    const graphFilters = { ...filters, players: "all", period: graphPeriod };
    const graphEntries = leaderboardGraphEntries(graphFilters);
    const graphScore = leaderboardGraphScoreForPeriod(filters, graphPeriod, score);
    const rawGraph = buildSessionGraph(graphEntries);
    const loadState = leaderboardGraphLoadState(graphPeriod, rawGraph, graphScore);
    // The chart plots ONLY hands recorded in this browser — no synthetic
    // volume-stretching to the server total: interpolating a handful of local
    // points up to the all-time count painted a fake straight diagonal. The
    // gap to the server volume is stated in the note below instead.
    const graph = rawGraph;
    // The select labels show the period's full known volume (server total for
    // all-time); how much of it is plottable locally is stated by the note.
    const periodControl = renderLeaderboardGraphPeriodControl(filters, graphPeriod, loadState.targetHands || graph.hands, loadState);
    if (!graph.hands) {
      if (loadState.loading) {
        return `
          <section class="leaderboard-graph is-loading" aria-label="График результата" aria-busy="true">
            <div class="leaderboard-graph-head">
              <div>
                <strong>Факт vs EVBB</strong>
              </div>
              ${periodControl}
            </div>
            <div class="leaderboard-graph-empty is-loading">
              <span class="leaderboard-loading-spinner" aria-hidden="true"></span>
              <b>Загружаем полную историю рук</b>
              <span>Ждём серверный all-time перед построением графика.</span>
            </div>
          </section>
        `;
      }
      if (loadState.targetHands > 0) {
        return `
          <section class="leaderboard-graph is-empty" aria-label="График результата">
            <div class="leaderboard-graph-head">
              <div>
                <strong>Факт vs EVBB</strong>
              </div>
              ${periodControl}
            </div>
            <div class="leaderboard-graph-empty is-aggregate">
              <b>График начнётся с новых раздач</b>
              <span>Итог сохранён, но для старых рук нет детальной истории. Новые раздачи появятся здесь автоматически.</span>
              <small>${escapeHtml(leaderboardGraphAggregateSummary(graphScore, loadState.targetHands))}</small>
            </div>
          </section>
        `;
      }
      return `
        <section class="leaderboard-graph is-empty" aria-label="График результата">
          <div class="leaderboard-graph-head">
            <div>
              <span>График результата</span>
              <strong>Факт и EV</strong>
            </div>
            ${periodControl}
          </div>
          <div class="leaderboard-graph-empty">Нет рук в выбранном фильтре.</div>
        </section>
      `;
    }
    const volumeNote = leaderboardGraphVolumeNote(graph, loadState);
    return `
      <section class="leaderboard-graph" aria-label="График результата">
        <div class="leaderboard-graph-head">
          <div>
            <strong>Факт vs EVBB</strong>
            ${volumeNote ? `<small class="leaderboard-graph-volume-note">${escapeHtml(volumeNote)}</small>` : ""}
          </div>
          ${periodControl}
        </div>
        ${renderSessionGraphSvg(graph)}
        ${renderSessionGraphLegend(graph)}
      </section>
    `;
  }

  // The volume gap covers hands with no per-hand record anywhere (older than
  // hand-sync or beyond server retention) — the copy stays source-neutral.
  function leaderboardGraphVolumeNote(graph, loadState = {}) {
    const rawHands = Math.max(0, Math.round(Number(graph?.hands || 0)));
    const targetHands = Math.max(0, Math.round(Number(loadState.targetHands || 0)));
    if (!rawHands || targetHands <= rawHands) return "";
    return `на графике ${formatGraphHandsLabel(rawHands)} · всего в зачёте ${formatHandsCount(targetHands)}`;
  }

  function leaderboardGraphAggregateSummary(graphScore, targetHands) {
    const hands = Math.max(0, Math.round(Number(targetHands || graphScore?.hands || 0)));
    const netBb = Number(graphScore?.actualNetBb ?? graphScore?.netBb ?? 0);
    const bb100 = Number(graphScore?.bb100 || 0);
    return `Итог рейтинга: ${signed(roundBbMetric(netBb))} BB за ${formatGraphHandsLabel(hands)} · EVBB ${signed(roundBbMetric(bb100))}`;
  }

  function leaderboardGraphLoadState(period, graph, score = null) {
    const graphPeriod = sanitizeLeaderboardGraphPeriod(period);
    const remote = state.leaderboardRemote || {};
    const status = String(remote.status || "idle");
    const fetchedAt = String(remote.fetchedAt || remote.playerStats?.fetchedAt || "");
    const rawHands = Math.max(0, Math.round(Number(graph?.hands || 0)));
    const targetHands = Math.max(rawHands, Math.round(Number(score?.hands || 0)));
    const waitsForRemoteAllTime = graphPeriod === "all"
      && !fetchedAt
      && ["idle", "loading"].includes(status)
      && typeof root.fetch === "function";
    // Cross-device hand series still in flight (first fetch): with nothing
    // plottable locally the chart shows the loading state instead of the
    // empty/aggregate one that would flash and then get replaced.
    const graphHands = remote.graphHands || {};
    const waitsForGraphHands = String(graphHands.status || "") === "loading"
      && !String(graphHands.fetchedAt || "");
    return {
      loading: waitsForRemoteAllTime || waitsForGraphHands,
      rawHands,
      targetHands
    };
  }

  function sanitizeLeaderboardGraphPeriod(value) {
    const period = String(value || "");
    return ["today", "7d", "30d", "season", "all"].includes(period) ? period : "season";
  }

  function currentLeaderboardGraphPeriod() {
    return sanitizeLeaderboardGraphPeriod(state.leaderboardGraphPeriod);
  }

  function leaderboardGraphPeriodOptions(filters = currentLeaderboardFilters()) {
    const options = [
      { value: "today", label: "Сегодня" },
      { value: "7d", label: "Неделя" },
      { value: "30d", label: "Месяц" },
      { value: "season", label: leaderboardSeasonUiConfig().label || "Сезон" },
      { value: "all", label: "Всё время" }
    ];
    return options.map((option) => ({
      ...option,
      hands: leaderboardGraphPeriodHands(filters, option.value)
    }));
  }

  function leaderboardGraphPeriodHands(filters, period) {
    // Mirror renderLeaderboardGraph: the period dropdown counts the same
    // table-size-agnostic per-hand set the curve plots (see the comment there).
    const graphFilters = { ...(filters || {}), players: "all", period: sanitizeLeaderboardGraphPeriod(period) };
    const rawHands = leaderboardGraphEntries(graphFilters).length;
    if (!["season", "all"].includes(graphFilters.period)) return rawHands;
    const rating = currentLeaderboardPlayerEntry(leaderboardEntries({ ...(filters || {}), period: graphFilters.period }))?.rating;
    return Math.max(rawHands, Math.round(Number(rating?.hands || 0)));
  }

  function leaderboardGraphScoreForPeriod(filters, period, fallbackScore = null) {
    const graphPeriod = sanitizeLeaderboardGraphPeriod(period);
    if (!["season", "all"].includes(graphPeriod)) return null;
    return currentLeaderboardPlayerEntry(leaderboardEntries({ ...(filters || {}), period: graphPeriod }))?.rating || fallbackScore;
  }

  function renderLeaderboardGraphPeriodControl(filters, selectedPeriod, selectedHands, state = {}) {
    const period = sanitizeLeaderboardGraphPeriod(selectedPeriod);
    const options = leaderboardGraphPeriodOptions(filters);
    const current = options.find((option) => option.value === period);
    const hands = Math.max(0, Math.round(Number(selectedHands ?? current?.hands ?? 0)));
    const loading = Boolean(state.loading);
    return `
      <label class="leaderboard-graph-period">
        <span class="visually-hidden">Период графика</span>
        <select data-lb-graph-period aria-label="Период графика">
          ${options.map((option) => {
            const count = option.value === period ? hands : option.hands;
            const label = loading && option.value === period
              ? `${option.label} · загрузка`
              : `${option.label} · ${formatGraphHandsLabel(count)}`;
            return `<option value="${escapeHtml(option.value)}"${option.value === period ? " selected" : ""}>${escapeHtml(label)}</option>`;
          }).join("")}
        </select>
      </label>
    `;
  }

  function formatGraphHandsLabel(count) {
    const value = Math.max(0, Math.round(Number(count || 0)));
    const mod10 = value % 10;
    const mod100 = value % 100;
    const word = mod10 === 1 && mod100 !== 11
      ? "рука"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? "руки"
      : "рук";
    return `${formatHandsCount(value)} ${word}`;
  }

  function buildSessionGraph(entries) {
    return sessionGraphKit.buildSessionGraph(entries);
  }

  function leaderboardGraphEntries(filters = currentLeaderboardFilters()) {
    // Local sources first: a hand recorded here carries the full runout for
    // the EV math, so it must win the sessionId:handNo:tableId dedup against
    // the compact cross-device copy of the same hand.
    const merged = mergeGraphEntries(
      Array.isArray(state.handLog) ? state.handLog : [],
      Array.isArray(state.history) ? state.history : [],
      remoteGraphHandEntries()
    );
    return merged.filter((entry) => graphEntryMatchesFilters(entry, filters));
  }

  // Per-hand chart points recorded by other devices (view=graph), fetched by
  // refreshRemoteGraphHands into state.leaderboardRemote.graphHands.
  function remoteGraphHandEntries() {
    const graphHands = state.leaderboardRemote?.graphHands;
    if (!Array.isArray(graphHands?.entries) || !graphHands.entries.length) return [];
    // Profile switches don't clear the cache — never merge another player's
    // hands into the active player's chart; the next refresh overwrites it.
    const activeKey = leaderboardPlayerKey({ profile: activeSimulatorProfile() });
    if (String(graphHands.playerKey || "") !== String(activeKey || "")) return [];
    return graphHands.entries;
  }

  function mergeGraphEntries(...collections) {
    const merged = [];
    const seen = new Set();
    collections.forEach((entries) => {
      (Array.isArray(entries) ? entries : []).forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const key = graphEntryKey(entry);
        if (key && seen.has(key)) return;
        if (key) seen.add(key);
        merged.push(entry);
      });
    });
    return merged;
  }

  function graphEntryKey(entry) {
    const hand = entry?.handHistory && typeof entry.handHistory === "object" ? entry.handHistory : {};
    const sessionId = String(entry?.sessionId || hand.sessionId || "");
    const handNo = entry?.handNo ?? entry?.no ?? hand.handNo ?? "";
    const tableId = entry?.tableId ?? hand.tableId ?? "";
    if (sessionId && (handNo || tableId)) return `${sessionId}:${handNo}:${tableId}`;
    if (handNo || tableId) return `${state.sessionId || "local"}:${handNo}:${tableId}`;
    return [
      entry?.id || "",
      entry?.playedAt || "",
      entry?.result?.text || entry?.result || "",
      entry?.result?.netBb ?? ""
    ].join("|");
  }

  function graphEntryTimestamp(entry) {
    const hand = entry?.handHistory && typeof entry.handHistory === "object" ? entry.handHistory : {};
    const raw = entry?.playedAt || hand.playedAt || entry?.updatedAt || entry?.at;
    const parsed = Date.parse(String(raw || ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function graphPeriodBounds(period) {
    const value = String(period || "all");
    if (value === "all") return { minMs: 0, maxMs: 0 };
    if (value === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return { minMs: todayStart.getTime(), maxMs: 0 };
    }
    if (value === "7d") return { minMs: Date.now() - 7 * 86400000, maxMs: 0 };
    if (value === "30d") return { minMs: Date.now() - 30 * 86400000, maxMs: 0 };
    if (value !== "season") return { minMs: 0, maxMs: 0 };
    const season = leaderboardSeasonUiConfig();
    const minMs = season.startAt ? Date.parse(season.startAt) : 0;
    const maxMs = season.endAt ? Date.parse(season.endAt) : 0;
    return {
      minMs: Number.isFinite(minMs) ? minMs : 0,
      maxMs: Number.isFinite(maxMs) ? maxMs : 0
    };
  }

  function graphEntryMatchesPeriod(entry, period) {
    const bounds = graphPeriodBounds(period);
    if (!bounds.minMs && !bounds.maxMs) return true;
    const ts = graphEntryTimestamp(entry);
    // Current-session history can predate the per-hand playedAt field. Keep it
    // visible in graph ranges instead of collapsing the live chart to empty.
    if (!ts) return true;
    if (bounds.minMs && ts < bounds.minMs) return false;
    if (bounds.maxMs && ts > bounds.maxMs) return false;
    return true;
  }

  function graphEntryMatchesFilters(entry, filters = currentLeaderboardFilters()) {
    if (!graphEntryMatchesPeriod(entry, filters.period)) return false;
    const hand = entry?.handHistory && typeof entry.handHistory === "object" ? entry.handHistory : {};
    const settings = entry?.settings && typeof entry.settings === "object"
      ? entry.settings
      : hand.settings && typeof hand.settings === "object"
      ? hand.settings
      : {};
    if (filters.players !== "all") {
      const playerCount = Number(settings.playerCount || entry?.playerCount || 0);
      if (!playerCount) return false;
      if (filters.players === "hu" && playerCount !== 2) return false;
      if (filters.players === "short" && (playerCount < 3 || playerCount > 6)) return false;
      if (filters.players === "full" && playerCount < 7) return false;
    }
    if (filters.difficulty !== "all" && String(settings.difficulty || entry?.difficulty || "") !== filters.difficulty) return false;
    return true;
  }

  function leaderboardGraphScopeLabel(filters = currentLeaderboardFilters()) {
    if (filters.period === "all") return "all-time";
    if (filters.period === "today") return "сегодня";
    if (filters.period === "7d") return "7 дней";
    if (filters.period === "30d") return "месяц";
    return leaderboardSeasonUiConfig().label || "сезон";
  }

  function renderSessionGraphSvg(graph) {
    return sessionGraphKit.renderSessionGraphSvg(graph);
  }

  function renderSessionGraphLegend(graph) {
    return sessionGraphKit.renderSessionGraphLegend(graph);
  }

  function formatLeaderboardScore(value) {
    const rounded = roundBbMetric(value);
    if (Math.abs(rounded) >= 100) return signed(Math.round(rounded));
    return signed(Number.isInteger(rounded) ? rounded : rounded.toFixed(1));
  }

  function formatHandsCount(value) {
    const hands = Math.max(0, Math.round(Number(value || 0)));
    if (hands >= 10000) return `${Math.round(hands / 1000)}k`;
    if (hands >= 1000) return `${(hands / 1000).toFixed(hands >= 3000 ? 0 : 1).replace(/\.0$/, "")}k`;
    return String(hands);
  }

  function formatEvbb(rating = {}) {
    const value = Number(rating.bb100 || rating.evBb100 || 0);
    return signed(Number.isInteger(value) ? value : roundBbMetric(value));
  }

  function leaderboardInitials(name) {
    const cleaned = String(name || "FF").replace(/[^a-zA-Zа-яА-Я0-9_\s-]/g, " ").trim();
    const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
    const source = parts.length > 1 ? `${parts[0][0] || ""}${parts[1][0] || ""}` : cleaned.slice(0, 2);
    return (source || "FF").toUpperCase();
  }

  function formatLeaderboardNumber(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return "0";
    return number.toFixed(2);
  }

  function leaderboardTooltipAttrs(text) {
    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    const safe = escapeHtml(normalized);
    return ` data-lb-tooltip="${safe}" title="${safe}" aria-label="${safe}" tabindex="0"`;
  }

  function renderLeaderboardNumber(value, tooltip, tagName = "span", className = "leaderboard-number") {
    return `<${tagName} class="${className}"${leaderboardTooltipAttrs(tooltip)}>${escapeHtml(value)}</${tagName}>`;
  }

  function leaderboardShortSamplePenalty(rating = {}) {
    if (rating.qualified) return 1;
    return Math.max(0.25, Number(rating.qualificationProgress || 0) * 0.75);
  }

  function leaderboardRankTooltip(rating = {}, rank = null) {
    const rankText = !rating.qualified
      ? "ещё не зачтено"
      : rank
        ? `#${rank}`
        : "вне текущего фильтра";
    return `Позиция: ${rankText}. Сортировка: сначала записи с минимум ${rating.qualificationHands || 20} руками, затем очки по убыванию.`;
  }

  function leaderboardHandsTooltip(rating = {}) {
    const hands = Number(rating.hands || 0);
    const qualificationHands = Number(rating.qualificationHands || 20);
    const neededHands = Math.max(0, Number(rating.neededHands || 0));
    const sampleWeight = formatLeaderboardNumber(rating.sampleWeight || 0);
    const confidence = formatLeaderboardNumber(rating.confidence || 0);
    const samplePenalty = formatLeaderboardNumber(leaderboardShortSamplePenalty(rating));
    return `Руки: ${hands}. Зачёт начинается с ${qualificationHands} рук; осталось ${neededHands}. Вес рук в очках = max(0.08, 1 - e^(-руки/80)) = ${sampleWeight}; confidence = ${confidence}; штраф короткой выборки = ${samplePenalty}.`;
  }

  function leaderboardEvbbTooltip(rating = {}) {
    const capped = Math.max(-120, Math.min(220, Number(rating.bb100 || 0)));
    return `EVBB: ${signed(rating.bb100 || 0)}. Нормализованный EV-показатель на 100 рук; в очках используется cap ${signed(capped)}.`;
  }

  function leaderboardScoreTooltip(rating = {}) {
    const samplePenalty = leaderboardShortSamplePenalty(rating);
    const cappedBb100 = Math.max(-120, Math.min(220, Number(rating.bb100 || 0)));
    return `Очки: ${formatLeaderboardScore(rating.score || 0)}. Учитываются объем, EVBB ${signed(cappedBb100)}, confidence ${formatLeaderboardNumber(rating.confidence || 0)} и штраф короткой выборки ${formatLeaderboardNumber(samplePenalty)}.`;
  }

  function renderPreflopStatsRows(currentStats, compareStats = null) {
    const current = currentStats?.preflop || {};
    const compare = compareStats?.preflop || {};
    return [
      rateMetricRow("VPIP", current.vpip, compare.vpip),
      rateMetricRow("PFR", current.pfr, compare.pfr),
      rateMetricRow("3bet", current.threeBet, compare.threeBet),
      rateMetricRow("Fold to 3bet", current.foldToThreeBet, compare.foldToThreeBet, { higherGood: false })
    ].join("");
  }

  function renderCbetStatsPanels(currentStats, compareStats = null) {
    return trackedCbetStreets.map((street) => `
      <div class="analytics-subpanel">
        <h4>${escapeHtml(streetLabel(street))}</h4>
        <div class="analytics-table">
          ${trackedPositions.map((position) => {
            const current = currentStats?.cbet?.[street]?.[position] || emptyRateStat();
            const compare = compareStats?.cbet?.[street]?.[position] || null;
            return rateMetricRow(position.toUpperCase(), current, compare);
          }).join("")}
        </div>
      </div>
    `).join("");
  }

  function rateMetricRow(label, stat, compareStat = null, options = {}) {
    const current = stat || emptyRateStat();
    const compareValue = compareStat ? compareStat.rate * 100 : null;
    return metricRow(label, rateStatLabel(current), compareValue, {
      ...options,
      suffix: "%",
      currentNumeric: current.rate * 100
    });
  }

  function rateStatLabel(stat) {
    const made = Number(stat?.made || 0);
    const opportunities = Number(stat?.opportunities || 0);
    if (!opportunities) return "— (0/0)";
    return `${percent(stat.rate)} (${made}/${opportunities})`;
  }

  function metricRow(label, value, compareValue, options = {}) {
    const currentNumeric = Number.isFinite(Number(options.currentNumeric)) ? Number(options.currentNumeric) : Number(value);
    const hasCompare = compareValue !== null && compareValue !== undefined && compareValue !== "";
    const delta = hasCompare && Number.isFinite(Number(compareValue))
      ? renderDelta(currentNumeric, Number(compareValue), options)
      : "";
    return `
      <div class="analytics-row">
        <b>${escapeHtml(label)}</b>
        <span>${escapeHtml(value)}${delta}</span>
      </div>
    `;
  }

  function countRows(currentMap, compareMap = null, emptyText = "Нет данных.") {
    const entries = Object.entries(currentMap || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!entries.length) {
      return `<div class="analytics-row"><b>${escapeHtml(emptyText)}</b><span></span></div>`;
    }
    return entries.map(([label, count]) => `
      <div class="analytics-row">
        <b>${escapeHtml(label)}</b>
        <span>${escapeHtml(count)}${compareMap ? renderDelta(count, Number(compareMap[label] || 0)) : ""}</span>
      </div>
    `).join("");
  }

  function renderBotLabAnalytics(botLab) {
    return botLabKit.renderAnalytics(botLab, {
      escapeHtml,
      streetLabel,
      bandSettings: botLabBandSettings(botLab?.settings || state.settings)
    });
  }

  function renderSessionCoach(metrics) {
    const ideas = sessionCoachIdeas(metrics);
    return `
      <div class="analytics-subgrid">
        <div class="analytics-subpanel">
          <h4>Что тренировать</h4>
          <div class="analytics-list">${ideas.training.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>
        </div>
        <div class="analytics-subpanel">
          <h4>Что докрутить в симуляторе</h4>
          <div class="analytics-list">${ideas.product.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>
        </div>
        <div class="analytics-subpanel">
          <h4>Сейчас риск</h4>
          <div class="analytics-list">${ideas.risks.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>
        </div>
      </div>
    `;
  }

  function sessionCoachIdeas(metrics) {
    const training = [];
    const product = [];
    const risks = [];
    const topLeaks = topMapEntries(metrics.leaksByCategory, 3);
    const topStreets = topMapEntries(metrics.streets, 2);

    if (!metrics.decisions) {
      training.push("Сыграй 20-30 решений, чтобы появились реальные паттерны ошибок.");
    } else if (metrics.leakRate >= 0.28) {
      training.push(`Leak rate ${percent(metrics.leakRate)}: сначала разобрать ${topLeaks.map(([label]) => label).join(", ") || "частые ошибки"}.`);
    } else if (metrics.goodRate >= 0.72) {
      training.push(`Good ${percent(metrics.goodRate)}: можно усложнять пак или включать tough lineup.`);
    } else {
      training.push(`Good ${percent(metrics.goodRate)}: набрать больше рук и смотреть, где повторяются Thin/Leak.`);
    }

    if (metrics.aggressionRate < 0.22 && metrics.decisions >= 10) {
      training.push("Агрессия низкая: проверить missed value и пассивные продолжения.");
    } else if (metrics.aggressionRate > 0.55 && metrics.decisions >= 10) {
      training.push("Агрессия высокая: проверить loose continue, bad bluff и сайзинги.");
    }

    if (topStreets.length) {
      training.push(`Основная выборка сейчас: ${topStreets.map(([street, count]) => `${street} ${count}`).join(" · ")}.`);
    }

    product.push("Полный multiway postflop вместо одного representative villain.");
    product.push("Pack-specific trainer policy: эталонные действия и объяснения должны жить в pack, а не в общем коде.");
    product.push("Визуальный replay на основном столе: step-by-step карты, фишки, действия.");

    risks.push("Боты пока эвристические, не solver-grade. Их нельзя считать профессиональной стратегией.");
    risks.push("Side pots и сложные all-in ветки еще не полноценный rules engine.");
    if (!metrics.botLab) {
      risks.push("Bot lab не запускался: нет быстрой проверки, не перекошены ли частоты ботов.");
    } else if ((metrics.botLab.warnings || []).length) {
      risks.push(`Bot lab warnings: ${(metrics.botLab.warnings || []).slice(0, 2).join(" · ")}.`);
    } else {
      risks.push("Bot lab без грубых warning, но это только shape-check, не EV-анализ.");
    }

    return { training: training.slice(0, 4), product, risks };
  }

  function topMapEntries(map, limit = 3) {
    return Object.entries(map || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  function renderDelta(currentValue, compareValue, options = {}) {
    if (!Number.isFinite(currentValue) || !Number.isFinite(compareValue)) return "";
    const diff = currentValue - compareValue;
    if (Math.abs(diff) < 0.01) return '<span class="metric-delta">=</span>';
    const higherGood = options.higherGood !== false;
    const isGood = higherGood ? diff > 0 : diff < 0;
    const suffix = options.suffix || "";
    const rounded = suffix === "%" ? Math.round(diff) : Math.round(diff * 10) / 10;
    // A sub-rounding diff (e.g. 0.04 on a 1-decimal metric) collapses to 0 yet
    // would still render a colored +/- badge ("+0"/"-0"). Treat it as neutral.
    // (rounded === 0 also catches -0, since -0 === 0.)
    if (rounded === 0) return '<span class="metric-delta">=</span>';
    const prefix = rounded > 0 ? "+" : "";
    return `<span class="metric-delta ${isGood ? "is-up" : "is-down"}">${prefix}${rounded}${escapeHtml(suffix)}</span>`;
  }

  function percent(value) {
    return `${Math.round(Number(value || 0) * 100)}%`;
  }

  function signed(value) {
    const number = Number(value || 0);
    return `${number > 0 ? "+" : ""}${number}`;
  }

  function signedBb(value) {
    return `${signed(roundBbMetric(value))} BB`;
  }


    return {
      renderAnalytics,
      renderLeaderboard,
      formatLeaderboardScore,
      formatLeaderboardNumber,
      renderPreflopStatsRows,
      renderCbetStatsPanels,
      renderSessionCoach,
      sessionCoachIdeas
    };
  }

  function dialogModel(options = {}) {
    const analyticsUi = options.analyticsUi || model(options);
    const windowRef = options.windowRef || root;
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const sessionMetrics = typeof options.sessionMetrics === "function" ? options.sessionMetrics : () => ({ hands: 0, decisions: 0 });
    const activeSimulatorProfile = typeof options.activeSimulatorProfile === "function" ? options.activeSimulatorProfile : () => ({ loggedIn: false, name: "" });
    const migrateCurrentGuestLeaderboardToProfile = typeof options.migrateCurrentGuestLeaderboardToProfile === "function" ? options.migrateCurrentGuestLeaderboardToProfile : () => {};
    const refreshCurrentLeaderboardEntry = typeof options.refreshCurrentLeaderboardEntry === "function" ? options.refreshCurrentLeaderboardEntry : () => {};
    const syncCurrentLeaderboardSnapshot = typeof options.syncCurrentLeaderboardSnapshot === "function" ? options.syncCurrentLeaderboardSnapshot : () => Promise.resolve();
    const refreshRemoteLeaderboard = typeof options.refreshRemoteLeaderboard === "function" ? options.refreshRemoteLeaderboard : () => Promise.resolve();
    const deleteCurrentLeaderboardEntryAction = typeof options.deleteCurrentLeaderboardEntry === "function" ? options.deleteCurrentLeaderboardEntry : () => Promise.resolve(false);
    const setPaused = typeof options.setPaused === "function" ? options.setPaused : () => {};
    const sessionGraphKit = options.sessionGraphKit || root.PokerSimulatorSessionGraph || {};
    const domPatch = options.domPatch || {};
    const setTextIfChanged = typeof options.setTextIfChanged === "function"
      ? options.setTextIfChanged
      : typeof domPatch.setTextIfChanged === "function"
        ? domPatch.setTextIfChanged
      : (node, value) => {
          if (node && node.textContent !== String(value ?? "")) node.textContent = String(value ?? "");
        };
    const analyticsDialog = options.analyticsDialog || null;
    const analyticsBody = options.analyticsBody || null;
    const leaderboardDialog = options.leaderboardDialog || null;
    const leaderboardBody = options.leaderboardBody || null;
    const importHistoryStatus = options.importHistoryStatus || null;
    let resumeAfterLeaderboardClose = false;

    leaderboardDialog?.addEventListener?.("close", () => {
      const shouldResume = resumeAfterLeaderboardClose;
      resumeAfterLeaderboardClose = false;
      if (shouldResume) setPaused(false);
    });

    function state() {
      return getState() || {};
    }

    function renderImportStatus() {
      if (!importHistoryStatus) return;
      const current = state();
      if (current.importStatus) {
        setTextIfChanged(importHistoryStatus, current.importStatus);
        return;
      }
      if (!current.compareSession) {
        setTextIfChanged(importHistoryStatus, "Можно загрузить прошлый экспорт и сравнить с текущей сессией.");
        return;
      }
      const metrics = sessionMetrics(current.compareSession);
      setTextIfChanged(importHistoryStatus, `Сравнение: ${current.compareSession.label || "импорт"} · ${metrics.hands} рук · ${metrics.decisions} решений.`);
    }

    function showAnalytics() {
      // Render INSIDE try/catch so a render throw can't skip showModal and leave
      // the button dead with no dialog and no error surfaced (A1).
      try {
        if (analyticsBody) analyticsBody.innerHTML = analyticsUi.renderAnalytics();
      } catch (error) {
        if (analyticsBody) analyticsBody.innerHTML = '<p class="analytics-empty">Не удалось построить аналитику этой сессии.</p>';
        if (typeof console !== "undefined") console.warn?.("Analytics render failed", error);
      }
      analyticsDialog?.showModal?.();
    }

    // Discover ONCE whether this deployment wired Google OAuth. We default to
    // "not configured" (nickname-first) and only upgrade to the Google flow if
    // /api/auth/session reports configured:true. This keeps the no-Google board
    // from ever showing a "Войти" button that bounces to the idle start screen.
    function ensureLeaderboardAuthChecked() {
      if (!GOOGLE_AUTH_UI_VISIBLE) {
        const current = state();
        const auth = current.leaderboardAuth || {};
        if (!auth.checked || auth.pending || auth.configured || auth.authenticated) {
          current.leaderboardAuth = { checked: true, pending: false, configured: false, authenticated: false };
        }
        return;
      }
      const current = state();
      const auth = current.leaderboardAuth || {};
      if (auth.checked || auth.pending) return;
      const fetchFn = typeof windowRef.fetch === "function" ? windowRef.fetch.bind(windowRef) : null;
      if (!fetchFn) {
        current.leaderboardAuth = { checked: true, pending: false, configured: false, authenticated: false };
        return;
      }
      current.leaderboardAuth = { ...auth, pending: true };
      Promise.resolve(fetchFn("/api/auth/session", { headers: { accept: "application/json" }, credentials: "same-origin" }))
        .then((res) => (res && typeof res.json === "function" ? res.json() : null))
        .then((data) => {
          const next = state();
          next.leaderboardAuth = {
            checked: true,
            pending: false,
            configured: Boolean(data && data.configured),
            authenticated: Boolean(data && data.authenticated)
          };
          renderLeaderboardBody();
        })
        .catch(() => {
          const next = state();
          // On any failure, stay nickname-first: a broken/absent auth endpoint
          // must never strand the user behind a dead Google button.
          next.leaderboardAuth = { checked: true, pending: false, configured: false, authenticated: false };
          renderLeaderboardBody();
        });
    }

    function showLeaderboard() {
      resumeAfterLeaderboardClose = !Boolean(state().paused);
      setPaused(true);
      ensureLeaderboardAuthChecked();
      const remoteRefresh = refreshRemoteLeaderboard({ renderOnStart: false });
      try {
        renderLeaderboardBody();
      } catch (error) {
        if (typeof console !== "undefined") console.warn?.("Leaderboard render failed", error);
      }
      leaderboardDialog?.showModal?.();
      syncCurrentLeaderboardSnapshot({ force: true });
      Promise.resolve(remoteRefresh).catch((error) => console.warn("[simulator] leaderboard refresh failed", error));
    }

    function saveLeaderboardProfileName() {
      const input = leaderboardBody?.querySelector("[data-leaderboard-name-input]");
      const name = String(input?.value || "").replace(/\s+/g, " ").trim();
      if (!name) {
        input?.focus?.();
        return false;
      }
      try {
        // Clear any stale rename-failure marker from a prior attempt so a
        // successful rename does not keep showing the old error badge.
        const before = state();
        if (before.leaderboardSync && before.leaderboardSync.reason === "rename") {
          before.leaderboardSync = { ...before.leaderboardSync, status: "idle", reason: "", message: "" };
        }
        const profile = activeSimulatorProfile();
        if (profile.loggedIn) {
          windowRef.FFPlayerProgress?.renameActiveProfile?.(name);
        } else {
          windowRef.FFPlayerProgress?.login?.(name);
        }
        migrateCurrentGuestLeaderboardToProfile();
        refreshCurrentLeaderboardEntry();
        renderLeaderboardBody();
        Promise.resolve(syncCurrentLeaderboardSnapshot({ force: true })).then(() => refreshRemoteLeaderboard({ afterSync: true })).catch((error) => console.warn("[simulator] leaderboard action failed", error));
        return true;
      } catch (error) {
        const current = state();
        // This failure is a local rename/login throw, NOT a leaderboard publish
        // failure. Tag it with reason:"rename" so the status label surfaces the
        // rename error instead of the misleading "Публикация не прошла" publish label.
        current.leaderboardSync = {
          ...current.leaderboardSync,
          status: "failed",
          reason: "rename",
          message: error?.message || "Не удалось сохранить ник"
        };
        renderLeaderboardBody();
        return false;
      }
    }

    function startLeaderboardSignIn() {
      if (!GOOGLE_AUTH_UI_VISIBLE) {
        leaderboardBody?.querySelector("[data-leaderboard-name-input]")?.focus?.();
        return;
      }
      const current = state();
      // If we already know Google OAuth is NOT wired for this deployment, do not
      // full-page navigate to /api/auth/google/start — it would 302 straight back
      // with ?auth_error=google_not_configured and drop the user on the idle start
      // screen. Keep them on the nickname path instead.
      if (current.leaderboardAuth && current.leaderboardAuth.checked && current.leaderboardAuth.configured === false) {
        leaderboardBody?.querySelector("[data-leaderboard-name-input]")?.focus?.();
        return;
      }
      const location = windowRef.location || {};
      const returnTo = `${location.pathname || "/"}${location.search || ""}${location.hash || ""}` || "/";
      windowRef.location.href = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
    }

    async function deleteCurrentLeaderboardEntry() {
      const ok = await deleteCurrentLeaderboardEntryAction();
      renderLeaderboardBody();
      return ok;
    }

    // Text fields whose value/caret/focus must survive an innerHTML rebuild:
    // async network refreshes and the render loop re-render the dialog on
    // their own schedule and must not wipe what the user is mid-typing.
    const LEADERBOARD_PRESERVE_INPUTS = ["[data-leaderboard-name-input]", "[data-lb-search]"];
    let lastLeaderboardRenderSignature = null;

    // Cheap change-detector for the render-loop path: while the dialog is
    // open the loop asks for a re-render every frame, but rebuilding the DOM
    // 60×/сек kills hover tooltips, open selects and input focus. Rebuild only
    // when something the leaderboard actually displays has changed.
    function leaderboardRenderSignature() {
      const current = state();
      const remote = current.leaderboardRemote || {};
      const sync = current.leaderboardSync || {};
      const auth = current.leaderboardAuth || {};
      const profile = activeSimulatorProfile();
      return [
        JSON.stringify(current.leaderboardFilters || {}),
        current.leaderboardGraphPeriod || "",
        remote.status || "", remote.fetchedAt || "", (remote.entries || []).length,
        remote.playerStats?.fetchedAt || "", remote.playerStats?.status || "",
        remote.graphHands?.fetchedAt || "", remote.graphHands?.status || "", (remote.graphHands?.entries || []).length,
        sync.status || "", sync.syncedAt || "", sync.message || "",
        auth.checked || false, auth.configured || false, auth.authenticated || false,
        (current.history || []).length, (current.handLog || []).length,
        (current.leaderboard || []).length,
        current.sessionId || "", current.compareSession?.label || "",
        profile.name || "", profile.loggedIn || false
      ].join("");
    }

    function renderLeaderboardBody(renderOptions = {}) {
      if (!leaderboardBody) return;
      const signature = leaderboardRenderSignature();
      if (renderOptions.onlyIfChanged && signature === lastLeaderboardRenderSignature) return;
      const active = windowRef.document?.activeElement;
      const preserveSelector = LEADERBOARD_PRESERVE_INPUTS
        .find((selector) => active && active.matches?.(selector) && leaderboardBody.contains(active));
      const preserve = preserveSelector
        ? {
            selector: preserveSelector,
            value: active.value,
            start: active.selectionStart,
            end: active.selectionEnd
          }
        : null;
      leaderboardBody.innerHTML = analyticsUi.renderLeaderboard();
      // Commit the signature only after the DOM actually holds this state — a
      // throwing render must leave it uncommitted so the per-frame
      // onlyIfChanged path retries instead of latching stale content.
      lastLeaderboardRenderSignature = signature;
      if (typeof sessionGraphKit.bindSessionGraphInteractions === "function") {
        sessionGraphKit.bindSessionGraphInteractions(leaderboardBody, { documentRef: windowRef.document });
      }
      if (preserve) {
        const next = leaderboardBody.querySelector(preserve.selector);
        if (next) {
          next.value = preserve.value;
          next.focus();
          try {
            next.setSelectionRange(preserve.start ?? next.value.length, preserve.end ?? next.value.length);
          } catch (error) {
            /* selection range not supported for this input state */
          }
        }
      }
    }

    function renderLeaderboard() {
      return analyticsUi.renderLeaderboard();
    }

    return {
      renderImportStatus,
      showAnalytics,
      showLeaderboard,
      saveLeaderboardProfileName,
      startLeaderboardSignIn,
      deleteCurrentLeaderboardEntry,
      renderLeaderboardBody,
      renderLeaderboard
    };
  }

  root.PokerSimulatorAnalyticsUi = { model, dialogModel };
  if (typeof module !== "undefined" && module.exports) module.exports = { model, dialogModel };
})();
