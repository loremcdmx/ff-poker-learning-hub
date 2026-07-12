(function () {
  "use strict";

  const METRICS = [
    { key: "performance", label: "Скорость" },
    { key: "design", label: "Дизайн" },
    { key: "ux", label: "Удобство" }
  ];

  const PAGES = [
    "Главная",
    "Турниры",
    "Финансы",
    "Загрузка",
    "Обучение",
    "Статистика",
    "Рейтинги",
    "Расписание",
    "Авторасписание",
    "Новости"
  ];

  const SKIP_SCORE = "Не знаю";
  const LEGACY_SKIP_SCORE = "Не пользовался / не могу оценить";
  const RESPONSES_PAGE_SIZE = 10;
  const ADMIN_LOGIN_ENDPOINT = "/api/player-survey-admin";
  const RU_COLLATOR = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });
  const HEATMAP_SORT_COLUMNS = [
    { key: "page", label: "Страница", type: "text" },
    ...METRICS.map((metric) => ({ key: metric.key, label: metric.label, type: "score" })),
    { key: "average", label: "Итог", type: "score" }
  ];
  const HEATMAP_SORT_DEFAULT = { key: "average", direction: "asc" };

  const status = document.querySelector("[data-results-status]");
  const count = document.querySelector("[data-result-count]");
  const overallScore = document.querySelector("[data-overall-score]");
  const commentCount = document.querySelector("[data-comment-count]");
  const worstPage = document.querySelector("[data-worst-page]");
  const insightsRoot = document.querySelector("[data-insights-board]");
  const totalScores = document.querySelector("[data-total-scores]");
  const metricSummaryRoot = document.querySelector("[data-metric-summary]");
  const scoreDistributionRoot = document.querySelector("[data-score-distribution]");
  const weakSpotsRoot = document.querySelector("[data-weak-spots]");
  const heatmapRoot = document.querySelector("[data-score-heatmap]");
  const aggregateRoot = document.querySelector("[data-results-aggregate]");
  const responsesRoot = document.querySelector("[data-results-responses]");
  const responsesPageInfo = document.querySelector("[data-responses-page-info]");
  const responsesPrev = document.querySelector("[data-responses-prev]");
  const responsesNext = document.querySelector("[data-responses-next]");
  const commentsFilterButton = document.querySelector("[data-comments-filter]");
  const responseSortButtons = Array.from(document.querySelectorAll("[data-responses-sort]"));
  const responsesSearchInput = document.querySelector("[data-responses-search]");
  const resultsNavLinks = Array.from(document.querySelectorAll(".results-nav a[href^='#']"));
  const refreshButton = document.querySelector("[data-refresh-results]");
  const csvLink = document.querySelector("[data-csv-link]");

  let responsesState = {
    page: 1,
    items: [],
    commentsOnly: false,
    sort: "newest",
    query: ""
  };
  let heatmapRowsState = [];
  let heatmapSort = { ...HEATMAP_SORT_DEFAULT };
  let deleteControl = {
    configured: false,
    requiresToken: true
  };
  let adminSessionKnown = false;
  let adminGatePromise = null;
  let resultsNavFrame = 0;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function queryParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function apiUrl(extra = "") {
    const endpoint = queryParam("api") || "/api/player-survey";
    const url = new URL(endpoint, window.location.href);
    if (extra) {
      const params = new URLSearchParams(extra);
      params.forEach((value, key) => url.searchParams.set(key, value));
    }
    return url.toString();
  }

  function adminAuthUrl() {
    return new URL(queryParam("authApi") || ADMIN_LOGIN_ENDPOINT, window.location.href).toString();
  }

  function createAdminGate() {
    const existing = document.querySelector("[data-admin-gate]");
    if (existing) return existing;

    const gate = document.createElement("section");
    gate.className = "admin-gate";
    gate.hidden = true;
    gate.setAttribute("data-admin-gate", "");
    gate.innerHTML = `
      <div class="admin-gate-panel" role="dialog" aria-modal="true" aria-labelledby="adminGateTitle">
        <div class="admin-gate-kicker">Закрытая страница</div>
        <h2 id="adminGateTitle">Результаты опроса</h2>
        <p>Введите админ-ключ один раз. После входа доступ сохранится в защищенной серверной cookie.</p>
        <form class="admin-gate-form" data-admin-gate-form>
          <label class="admin-gate-field">
            <span>Админ-ключ</span>
            <input type="password" name="adminToken" autocomplete="current-password" data-admin-token-input>
          </label>
          <div class="admin-gate-error" data-admin-gate-error aria-live="polite"></div>
          <div class="admin-gate-actions">
            <button class="results-link admin-gate-submit" type="submit" data-admin-gate-submit>Открыть</button>
            <button class="results-link admin-gate-secondary" type="button" data-admin-gate-cancel>Не сейчас</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(gate);
    return gate;
  }

  function hideAdminGate(gate) {
    gate.hidden = true;
    document.body.classList.remove("has-admin-gate");
    const input = gate.querySelector("[data-admin-token-input]");
    if (input) input.value = "";
  }

  function adminRequiredError(message = "Нужен админ-ключ для просмотра результатов") {
    const error = new Error(message);
    error.code = "admin_token_required";
    return error;
  }

  function showAdminGate(message = "") {
    if (adminGatePromise) return adminGatePromise;

    const gate = createAdminGate();
    const form = gate.querySelector("[data-admin-gate-form]");
    const input = gate.querySelector("[data-admin-token-input]");
    const errorRoot = gate.querySelector("[data-admin-gate-error]");
    const submit = gate.querySelector("[data-admin-gate-submit]");
    const cancel = gate.querySelector("[data-admin-gate-cancel]");

    gate.hidden = false;
    document.body.classList.add("has-admin-gate");
    errorRoot.textContent = message || "";
    input.value = "";
    window.setTimeout(() => input.focus(), 30);

    adminGatePromise = new Promise((resolve) => {
      const finish = (ok) => {
        form.removeEventListener("submit", onSubmit);
        cancel.removeEventListener("click", onCancel);
        submit.disabled = false;
        adminGatePromise = null;
        if (ok) hideAdminGate(gate);
        resolve(ok);
      };
      const onCancel = () => finish(false);
      const onSubmit = async (event) => {
        event.preventDefault();
        const adminToken = input.value.trim();
        if (!adminToken) {
          errorRoot.textContent = "Введите админ-ключ.";
          input.focus();
          return;
        }

        submit.disabled = true;
        errorRoot.textContent = "Проверяю ключ...";
        try {
          const response = await fetch(adminAuthUrl(), {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ adminToken })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.ok || !result.authenticated) {
            throw new Error(result.message || result.error || "admin_token_required");
          }
          adminSessionKnown = true;
          finish(true);
        } catch (error) {
          submit.disabled = false;
          errorRoot.textContent = error.message || "Ключ не подошел.";
          input.focus();
        }
      };

      form.addEventListener("submit", onSubmit);
      cancel.addEventListener("click", onCancel);
    });

    return adminGatePromise;
  }

  async function ensureAdminSession(message = "Введите админ-ключ для просмотра результатов") {
    if (adminSessionKnown) return true;
    try {
      const response = await fetch(adminAuthUrl(), {
        credentials: "same-origin",
        headers: { "Accept": "application/json" }
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.authenticated) {
        adminSessionKnown = true;
        return true;
      }
    } catch {
      // The data request below will surface a clearer error if auth status fails.
    }
    return showAdminGate(message);
  }

  async function fetchWithAdmin(extra = "", options = {}, retry = true) {
    const ready = await ensureAdminSession();
    if (!ready) throw adminRequiredError();

    const headers = {
      ...(options.headers || {})
    };
    const response = await fetch(apiUrl(extra), {
      ...options,
      credentials: "same-origin",
      headers
    });

    if (response.status === 401 && retry) {
      adminSessionKnown = false;
      const unlocked = await showAdminGate("Админ-ключ не подошел. Введите ключ еще раз.");
      if (unlocked) return fetchWithAdmin(extra, options, false);
    }

    return response;
  }

  function scoreValue(value) {
    return value && value !== SKIP_SCORE && value !== LEGACY_SKIP_SCORE ? value : "";
  }

  function scoreNumber(value) {
    const score = Number(scoreValue(value));
    return scoreValue(value) === "" || !Number.isFinite(score) ? null : score;
  }

  function average(values) {
    const scores = values.filter(Number.isFinite);
    if (!scores.length) return "";
    return Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10;
  }

  function scoreClass(value) {
    const score = scoreNumber(value);
    if (score === null) return "is-empty";
    if (score <= 3) return "is-low";
    if (score <= 7) return "is-mid";
    return "is-high";
  }

  function resultCardClass(value) {
    const score = scoreNumber(value);
    if (score === null) return "is-unrated";
    if (score <= 4) return "is-critical";
    if (score <= 6) return "is-watch";
    return "is-healthy";
  }

  function formatScore(value) {
    return scoreNumber(value) === null ? "—" : String(value);
  }

  function scorePercent(value) {
    const score = scoreNumber(value);
    if (score === null) return 0;
    return Math.max(0, Math.min(100, score * 10));
  }

  function heatmapSortColumn(key) {
    return HEATMAP_SORT_COLUMNS.find((column) => column.key === key) || HEATMAP_SORT_COLUMNS[HEATMAP_SORT_COLUMNS.length - 1];
  }

  function heatmapSortValue(row, key) {
    if (key === "page") return String(row.page || "");
    return scoreNumber(row[key]);
  }

  function compareHeatmapRows(left, right) {
    const column = heatmapSortColumn(heatmapSort.key);
    const direction = heatmapSort.direction === "desc" ? -1 : 1;

    if (column.type === "text") {
      return RU_COLLATOR.compare(
        heatmapSortValue(left, column.key),
        heatmapSortValue(right, column.key)
      ) * direction;
    }

    const leftValue = heatmapSortValue(left, column.key);
    const rightValue = heatmapSortValue(right, column.key);
    const leftMissing = leftValue === null;
    const rightMissing = rightValue === null;

    if (leftMissing || rightMissing) {
      if (leftMissing && rightMissing) return RU_COLLATOR.compare(String(left.page || ""), String(right.page || ""));
      return leftMissing ? 1 : -1;
    }

    return ((leftValue - rightValue) * direction)
      || RU_COLLATOR.compare(String(left.page || ""), String(right.page || ""));
  }

  function sortedHeatmapRows(rows) {
    return [...rows].sort(compareHeatmapRows);
  }

  function renderHeatmapSortButton(column) {
    const isActive = heatmapSort.key === column.key;
    const direction = isActive ? heatmapSort.direction : "none";
    const nextDirection = isActive && heatmapSort.direction === "asc" ? "по убыванию" : "по возрастанию";
    const icon = isActive ? (heatmapSort.direction === "asc" ? "↑" : "↓") : "↕";

    return `
      <button class="heatmap-sort-button ${isActive ? "is-active" : ""}" type="button" data-heatmap-sort="${escapeHtml(column.key)}" data-sort-direction="${escapeHtml(direction)}" aria-pressed="${escapeHtml(String(isActive))}" aria-label="${escapeHtml(`${column.label}: сортировать ${nextDirection}`)}">
        <span>${escapeHtml(column.label)}</span>
        <b aria-hidden="true">${icon}</b>
      </button>
    `;
  }

  function setActiveResultsNav(id) {
    if (!resultsNavLinks.length) return;
    resultsNavLinks.forEach((link) => {
      const active = link.hash === `#${id}`;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function currentResultsSectionId() {
    const sections = resultsNavLinks
      .map((link) => document.getElementById(link.hash.slice(1)))
      .filter(Boolean);
    if (!sections.length) return "";

    const scrollBottom = window.scrollY + window.innerHeight;
    const pageBottom = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const bottomTolerance = Math.max(96, window.innerHeight * 0.25);
    if (pageBottom - scrollBottom <= bottomTolerance) return sections[sections.length - 1].id;

    const stickyOffset = 132;
    return sections.reduce((current, section) => (
      section.getBoundingClientRect().top <= stickyOffset ? section.id : current
    ), sections[0].id);
  }

  function updateResultsNavActive() {
    setActiveResultsNav(currentResultsSectionId());
  }

  function scheduleResultsNavUpdate() {
    if (resultsNavFrame) return;
    resultsNavFrame = window.requestAnimationFrame(() => {
      resultsNavFrame = 0;
      updateResultsNavActive();
    });
  }

  function setupResultsNav() {
    if (!resultsNavLinks.length) return;
    updateResultsNavActive();
    window.addEventListener("scroll", scheduleResultsNavUpdate, { passive: true });
    window.addEventListener("resize", scheduleResultsNavUpdate);
    window.addEventListener("hashchange", () => {
      setActiveResultsNav(window.location.hash.slice(1) || currentResultsSectionId());
    });
  }

  function responseComment(response) {
    return String(response.comment || "").trim();
  }

  function normalizeSearch(value) {
    return String(value || "").trim().toLocaleLowerCase("ru-RU");
  }

  function responseSearchText(response) {
    return [
      response.discord || "аноним",
      response.comment,
      response.device,
      response.contact,
      response.issueNumber,
      response.issueUrl
    ].filter(Boolean).join(" ");
  }

  function matchesResponseSearch(response) {
    const query = normalizeSearch(responsesState.query);
    if (!query) return true;
    const haystack = normalizeSearch(responseSearchText(response));
    return query.split(/\s+/).filter(Boolean).every((part) => haystack.includes(part));
  }

  function usedPagesCount(response) {
    if (Array.isArray(response.usedPages)) return response.usedPages.length;
    return PAGES.filter((page) => (
      METRICS.some((metric) => scoreNumber(response.ratings?.[page]?.[metric.key]) !== null)
    )).length;
  }

  function pageAverage(response, page) {
    return average(METRICS.map((metric) => scoreNumber(response.ratings?.[page]?.[metric.key])));
  }

  function responseAverage(response) {
    return average(PAGES.flatMap((page) => (
      METRICS.map((metric) => scoreNumber(response.ratings?.[page]?.[metric.key]))
    )));
  }

  function responseTimestamp(response) {
    const time = new Date(response.submittedAt).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function allNumericScores(responses) {
    return responses.flatMap((response) => (
      PAGES.flatMap((page) => (
        METRICS.map((metric) => ({
          page,
          metric: metric.key,
          metricLabel: metric.label,
          value: scoreNumber(response.ratings?.[page]?.[metric.key])
        }))
      ))
    )).filter((item) => item.value !== null);
  }

  function skippedScoresCount(responses) {
    return responses.reduce((total, response) => (
      total + PAGES.reduce((pageTotal, page) => (
        pageTotal + METRICS.reduce((metricTotal, metric) => {
          const value = response.ratings?.[page]?.[metric.key];
          return metricTotal + (value === SKIP_SCORE || value === LEGACY_SKIP_SCORE ? 1 : 0);
        }, 0)
      ), 0)
    ), 0);
  }

  function overallAverage(responses) {
    return average(responses.flatMap((response) => (
      PAGES.flatMap((page) => METRICS.map((metric) => scoreNumber(response.ratings?.[page]?.[metric.key])))
    )));
  }

  function strongestMetric(scores) {
    const rows = METRICS.map((metric) => {
      const values = scores
        .filter((item) => item.metric === metric.key)
        .map((item) => item.value);
      return {
        ...metric,
        average: average(values),
        count: values.length
      };
    }).filter((row) => scoreNumber(row.average) !== null);
    return rows.sort((left, right) => Number(right.average) - Number(left.average))[0] || null;
  }

  function weakestMetric(scores) {
    const rows = METRICS.map((metric) => {
      const values = scores
        .filter((item) => item.metric === metric.key)
        .map((item) => item.value);
      return {
        ...metric,
        average: average(values),
        count: values.length
      };
    }).filter((row) => scoreNumber(row.average) !== null);
    return rows.sort((left, right) => Number(left.average) - Number(right.average))[0] || null;
  }

  function weakestMetricForPage(row) {
    return METRICS.map((metric) => ({
      label: metric.label,
      average: row[metric.key],
      count: row[`${metric.key}Count`] || 0
    }))
      .filter((item) => scoreNumber(item.average) !== null && item.count > 0)
      .sort((left, right) => Number(left.average) - Number(right.average))[0] || null;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "");
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function initials(name) {
    const clean = String(name || "А").trim();
    return clean.slice(0, 2).toUpperCase();
  }

  function updateSummary(data) {
    const responses = data.responses || [];
    const aggregate = data.aggregate || [];
    const weakest = aggregate.find((row) => Number.isFinite(Number(row.average)));
    const comments = responses.filter((response) => responseComment(response)).length;

    count.textContent = String(data.count || 0);
    overallScore.textContent = formatScore(overallAverage(responses));
    commentCount.textContent = String(comments);
    worstPage.textContent = weakest ? `${weakest.page} ${formatScore(weakest.average)}` : "—";
    worstPage.title = weakest ? `${weakest.page}: ${formatScore(weakest.average)}` : "";
  }

  function renderInsights(data) {
    if (!insightsRoot) return;
    const responses = data.responses || [];
    const aggregateRows = data.aggregate || [];
    const scores = allNumericScores(responses);
    const possibleCount = responses.length * PAGES.length * METRICS.length;
    const coverage = possibleCount ? Math.round((scores.length / possibleCount) * 100) : 0;
    const overall = overallAverage(responses);
    const weakestPage = aggregateRows.find((row) => scoreNumber(row.average) !== null);
    const weakestPageMetric = weakestPage ? weakestMetricForPage(weakestPage) : null;
    const strongMetric = strongestMetric(scores);
    const weakMetric = weakestMetric(scores);
    const spread = strongMetric && weakMetric
      ? Math.round((Number(strongMetric.average) - Number(weakMetric.average)) * 10) / 10
      : "";
    const mostSkipped = aggregateRows
      .slice()
      .sort((left, right) => Number(right.skippedCount || 0) - Number(left.skippedCount || 0))[0];
    const comments = responses.filter((response) => responseComment(response)).length;

    insightsRoot.innerHTML = `
      <article class="insight-card insight-card-primary">
        <div class="insight-card-head">
          <span>Итоговая оценка</span>
          <em>${escapeHtml(scores.length)} оценок</em>
        </div>
        <div class="insight-score-lockup">
          <div class="insight-ring" style="--score-pct: ${scorePercent(overall)}%">
            <strong>${escapeHtml(formatScore(overall))}</strong>
          </div>
          <p>${coverage}% шкал заполнено</p>
        </div>
      </article>

      <article class="insight-card insight-card-focus">
        <div class="insight-card-head">
          <span>Главная зона внимания</span>
          <em>${weakestPageMetric ? escapeHtml(weakestPageMetric.label) : "нет данных"}</em>
        </div>
        <strong>${weakestPage ? escapeHtml(weakestPage.page) : "—"}</strong>
        <p>${weakestPageMetric ? `${escapeHtml(weakestPageMetric.label)} ${escapeHtml(formatScore(weakestPageMetric.average))}, средняя ${escapeHtml(formatScore(weakestPage.average))}` : "Нужно больше ответов"}</p>
      </article>

      <article class="insight-card insight-card-contrast">
        <div class="insight-card-head">
          <span>Разрыв метрик</span>
          <em>${spread ? `${escapeHtml(spread)} пункта` : "нет данных"}</em>
        </div>
        <div class="insight-pair">
          <div>
            <small>Сильнее</small>
            <b>${strongMetric ? escapeHtml(strongMetric.label) : "—"}</b>
            <strong>${strongMetric ? escapeHtml(formatScore(strongMetric.average)) : "—"}</strong>
          </div>
          <div>
            <small>Слабее</small>
            <b>${weakMetric ? escapeHtml(weakMetric.label) : "—"}</b>
            <strong>${weakMetric ? escapeHtml(formatScore(weakMetric.average)) : "—"}</strong>
          </div>
        </div>
      </article>

      <article class="insight-card insight-card-signal">
        <div class="insight-card-head">
          <span>Сигнал по данным</span>
          <em>${escapeHtml(comments)} комментариев</em>
        </div>
        <strong>${mostSkipped ? escapeHtml(mostSkipped.page) : "—"}</strong>
        <p>${mostSkipped ? `${escapeHtml(mostSkipped.skippedCount || 0)} раз выбрали «не знаю»` : "Ответов пока нет"}</p>
      </article>
    `;
  }

  function renderAllAnswers(data) {
    const responses = data.responses || [];
    const aggregateRows = data.aggregate || [];
    const scores = allNumericScores(responses);
    const skippedCount = skippedScoresCount(responses);
    const possibleCount = responses.length * PAGES.length * METRICS.length;
    const coverage = possibleCount ? Math.round((scores.length / possibleCount) * 100) : 0;
    totalScores.textContent = String(scores.length);

    metricSummaryRoot.innerHTML = `
      <div class="all-answers-block-head">
        <h3>Средние по метрикам</h3>
        <span>${coverage}% заполнено, ${skippedCount} не знают</span>
      </div>
      <div class="metric-summary-list">
        ${METRICS.map((metric) => {
          const values = scores
            .filter((item) => item.metric === metric.key)
            .map((item) => item.value);
          const metricAverage = average(values);
          return `
            <div class="metric-summary-row ${scoreClass(metricAverage)}">
              <div class="metric-summary-line">
                <span>${escapeHtml(metric.label)}</span>
                <strong>${escapeHtml(formatScore(metricAverage))}</strong>
              </div>
              <div class="result-track"><i style="width: ${scorePercent(metricAverage)}%"></i></div>
              <em>${escapeHtml(values.length)} оценок</em>
            </div>
          `;
        }).join("")}
      </div>
    `;

    const distribution = Array.from({ length: 10 }, (_, index) => {
      const score = index + 1;
      return {
        score,
        count: scores.filter((item) => item.value === score).length
      };
    });
    const maxBucket = Math.max(1, ...distribution.map((item) => item.count));
    scoreDistributionRoot.innerHTML = `
      <div class="all-answers-block-head">
        <h3>Распределение оценок</h3>
        <span>сколько раз выбрали 1-10</span>
      </div>
      <div class="distribution-list">
        ${distribution.map((item) => `
          <div class="distribution-row ${scoreClass(item.score)}">
            <span>${escapeHtml(item.score)}</span>
            <div class="result-track"><i style="width: ${(item.count / maxBucket) * 100}%"></i></div>
            <strong>${escapeHtml(item.count)}</strong>
          </div>
        `).join("")}
      </div>
    `;

    const weakSpots = aggregateRows
      .flatMap((row) => METRICS.map((metric) => ({
        page: row.page,
        metric: metric.label,
        average: row[metric.key],
        count: row[`${metric.key}Count`] || 0
      })))
      .filter((item) => Number.isFinite(Number(item.average)) && item.count > 0)
      .sort((left, right) => Number(left.average) - Number(right.average) || right.count - left.count)
      .slice(0, 6);

    weakSpotsRoot.innerHTML = `
      <div class="all-answers-block-head">
        <h3>Самые слабые места</h3>
        <span>страница / метрика</span>
      </div>
      <ol class="weak-spots-list">
        ${weakSpots.length ? weakSpots.map((item) => `
          <li>
            <div>
              <span>${escapeHtml(item.page)}</span>
              <em>${escapeHtml(item.metric)} · ${escapeHtml(item.count)} оценок</em>
            </div>
            <strong class="${scoreClass(item.average)}">${escapeHtml(formatScore(item.average))}</strong>
          </li>
        `).join("") : "<li><div><span>Недостаточно данных</span><em>нет числовых оценок</em></div><strong class=\"is-empty\">—</strong></li>"}
      </ol>
    `;
  }

  function renderHeatmap(rows = heatmapRowsState) {
    if (!heatmapRoot) return;
    heatmapRowsState = Array.isArray(rows) ? rows.slice() : [];
    if (!heatmapRowsState.length) {
      heatmapRoot.innerHTML = `<div class="empty-results">Пока нет данных для карты оценок</div>`;
      return;
    }

    const sortedRows = sortedHeatmapRows(heatmapRowsState);

    heatmapRoot.innerHTML = `
      <div class="heatmap-row heatmap-row-head" role="row">
        ${HEATMAP_SORT_COLUMNS.map(renderHeatmapSortButton).join("")}
      </div>
      ${sortedRows.map((row, index) => {
        return `
          <div class="heatmap-row" role="row" data-rank="${escapeHtml(String(index + 1).padStart(2, "0"))}">
            <div class="heatmap-page">
              <strong>${escapeHtml(row.page)}</strong>
            </div>
            ${METRICS.map((metric) => {
              const value = row[metric.key];
              return `
                <div class="heatmap-cell ${scoreClass(value)}" style="--score-alpha: ${Math.max(0.12, scorePercent(value) / 100)}" title="${escapeHtml(row.page)} · ${escapeHtml(metric.label)}: ${escapeHtml(formatScore(value))}">
                  <b>${escapeHtml(formatScore(value))}</b>
                  <span>${escapeHtml(row[`${metric.key}Count`] || 0)}</span>
                </div>
              `;
            }).join("")}
            <div class="heatmap-cell heatmap-total ${scoreClass(row.average)}" style="--score-alpha: ${Math.max(0.12, scorePercent(row.average) / 100)}" title="${escapeHtml(row.page)} · средняя: ${escapeHtml(formatScore(row.average))}">
              <b>${escapeHtml(formatScore(row.average))}</b>
              <span>${escapeHtml(row.usedCount || 0)}/${escapeHtml(row.responses || 0)}</span>
            </div>
          </div>
        `;
      }).join("")}
    `;
  }

  function renderAggregate(rows) {
    if (!rows.length) {
      aggregateRoot.innerHTML = `<div class="empty-results">Пока нет оценок по страницам</div>`;
      return;
    }

    aggregateRoot.innerHTML = rows.map((row, index) => {
      const weakMetric = weakestMetricForPage(row);
      const coverage = row.responses ? Math.round((Number(row.usedCount || 0) / Number(row.responses)) * 100) : 0;
      return `
        <article class="result-card ${index === 0 ? "is-priority" : ""} ${resultCardClass(row.average)}" data-rank="${escapeHtml(String(index + 1).padStart(2, "0"))}">
          <div class="result-head">
            <div class="result-title">
              <span class="result-rank">#${escapeHtml(String(index + 1).padStart(2, "0"))}</span>
              <h2>${escapeHtml(row.page)}</h2>
              <span>${escapeHtml(row.usedCount)}/${escapeHtml(row.responses)} игроков оценили</span>
            </div>
            <div class="result-score-ring" style="--score-pct: ${scorePercent(row.average)}%">
              <strong>${escapeHtml(formatScore(row.average))}</strong>
            </div>
          </div>
          <div class="result-card-summary">
            <span>${weakMetric ? `Слабее всего: ${escapeHtml(weakMetric.label)} ${escapeHtml(formatScore(weakMetric.average))}` : "Недостаточно оценок"}</span>
            <b>${escapeHtml(coverage)}%</b>
          </div>
          <div class="result-bars">
            ${METRICS.map((metric) => {
              const value = row[metric.key];
              const metricCount = row[`${metric.key}Count`] || 0;
              return `
                <div class="result-bar ${scoreClass(value)}" style="--score-width: ${scorePercent(value)}%">
                  <div class="result-bar-line">
                    <span>${escapeHtml(metric.label)}</span>
                    <small>${escapeHtml(metricCount)} оценок</small>
                    <b>${escapeHtml(formatScore(value))}</b>
                  </div>
                  <div class="result-track"><i></i></div>
                </div>
              `;
            }).join("")}
          </div>
          <div class="result-meta">
            <span>Не знают: ${escapeHtml(row.skippedCount)}</span>
            <span>Покрытие: ${escapeHtml(coverage)}%</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderPlayerRatings(response) {
    return `
      <div class="player-ratings" role="table" aria-label="Оценки игрока">
        <div class="player-rating-row player-rating-head" role="row">
          <span>Страница</span>
          ${METRICS.map((metric) => `<span>${escapeHtml(metric.label)}</span>`).join("")}
          <span>Средняя</span>
        </div>
        ${PAGES.map((page) => {
          const averageScore = pageAverage(response, page);
          const rowScores = METRICS.map((metric) => scoreValue(response.ratings?.[page]?.[metric.key]));
          const isSkipped = !rowScores.some(Boolean);
          return `
            <div class="player-rating-row ${isSkipped ? "is-skipped" : ""}" role="row">
              <span class="player-page-name">${escapeHtml(page)}</span>
              ${rowScores.map((value) => `
                <span class="player-score ${scoreClass(value)}">${escapeHtml(formatScore(value))}</span>
              `).join("")}
              <span class="player-score player-average ${scoreClass(averageScore)}">${escapeHtml(formatScore(averageScore))}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function pageBreakdownLabel(response, page) {
    const parts = METRICS.map((metric) => (
      `${metric.label}: ${formatScore(response.ratings?.[page]?.[metric.key])}`
    ));
    return `${page} · ${parts.join(" · ")}`;
  }

  function renderCategorySummary(response) {
    return `
      <div class="category-summary" aria-label="Средние оценки по страницам">
        ${PAGES.map((page) => {
          const averageScore = pageAverage(response, page);
          const tooltip = pageBreakdownLabel(response, page);
          return `
            <span
              class="category-chip ${scoreClass(averageScore)}"
              tabindex="0"
              aria-label="${escapeHtml(tooltip)}"
              data-tooltip="${escapeHtml(tooltip)}"
            >
              <span>${escapeHtml(page)}</span>
              <strong>${escapeHtml(formatScore(averageScore))}</strong>
            </span>
          `;
        }).join("")}
      </div>
    `;
  }

  function closeCategoryTooltips(except = null) {
    responsesRoot.querySelectorAll(".category-chip.is-tooltip-open").forEach((chip) => {
      if (chip !== except) chip.classList.remove("is-tooltip-open");
    });
  }

  function sortResponses(responses) {
    const copy = responses.slice();
    if (responsesState.sort === "low") {
      return copy.sort((left, right) => {
        const leftAverage = responseAverage(left);
        const rightAverage = responseAverage(right);
        const leftScore = scoreNumber(leftAverage);
        const rightScore = scoreNumber(rightAverage);
        if (leftScore === null && rightScore === null) return 0;
        if (leftScore === null) return 1;
        if (rightScore === null) return -1;
        return leftScore - rightScore;
      });
    }
    if (responsesState.sort === "high") {
      return copy.sort((left, right) => {
        const leftAverage = responseAverage(left);
        const rightAverage = responseAverage(right);
        const leftScore = scoreNumber(leftAverage);
        const rightScore = scoreNumber(rightAverage);
        if (leftScore === null && rightScore === null) return 0;
        if (leftScore === null) return 1;
        if (rightScore === null) return -1;
        return rightScore - leftScore;
      });
    }
    return copy.sort((left, right) => responseTimestamp(right) - responseTimestamp(left));
  }

  function visibleResponses() {
    const filtered = responsesState.items.filter((response) => {
      if (!matchesResponseSearch(response)) return false;
      return responsesState.commentsOnly ? Boolean(responseComment(response)) : true;
    });
    return sortResponses(filtered);
  }

  function updateCommentsFilter(totalVisible) {
    if (!commentsFilterButton) return;
    const commentsCount = responsesState.items
      .filter(matchesResponseSearch)
      .filter((response) => responseComment(response)).length;
    commentsFilterButton.classList.toggle("is-selected", responsesState.commentsOnly);
    commentsFilterButton.setAttribute("aria-pressed", String(responsesState.commentsOnly));
    commentsFilterButton.textContent = responsesState.commentsOnly
      ? `С комментами: ${totalVisible}`
      : `Только с комментами (${commentsCount})`;
  }

  function updateSortButtons() {
    responseSortButtons.forEach((button) => {
      const selected = button.dataset.responsesSort === responsesState.sort;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function renderPagination(total, totalAll) {
    const totalPages = Math.max(1, Math.ceil(total / RESPONSES_PAGE_SIZE));
    responsesState.page = Math.min(Math.max(1, responsesState.page), totalPages);
    const start = total ? (responsesState.page - 1) * RESPONSES_PAGE_SIZE + 1 : 0;
    const end = Math.min(total, responsesState.page * RESPONSES_PAGE_SIZE);
    const activeFilters = [
      responsesState.query ? "поиск" : "",
      responsesState.commentsOnly ? "с комментами" : ""
    ].filter(Boolean).join(", ");
    const suffix = activeFilters ? ` · ${activeFilters}` : "";
    responsesPageInfo.textContent = total
      ? `${start}-${end} из ${total}${suffix}`
      : `0 из 0${suffix}${totalAll ? ` · всего ${totalAll}` : ""}`;
    responsesPrev.disabled = responsesState.page <= 1;
    responsesNext.disabled = responsesState.page >= totalPages;
    updateCommentsFilter(total);
    updateSortButtons();
  }

  function renderResponses() {
    const responses = visibleResponses();
    renderPagination(responses.length, responsesState.items.length);
    if (!responses.length) {
      const emptyText = responsesState.query
        ? (responsesState.commentsOnly ? "Поиск не нашёл ответов с комментами" : "Поиск не нашёл ответов")
        : (responsesState.commentsOnly ? "Ответов с комментами пока нет" : "Ответов пока нет");
      responsesRoot.innerHTML = `<div class="empty-results">${emptyText}</div>`;
      return;
    }
    const pageItems = responses.slice(
      (responsesState.page - 1) * RESPONSES_PAGE_SIZE,
      responsesState.page * RESPONSES_PAGE_SIZE
    );
    responsesRoot.innerHTML = pageItems.map((response) => {
      const playerAverage = responseAverage(response);
      const issueLink = response.issueUrl
        ? `<a href="${escapeHtml(response.issueUrl)}" target="_blank" rel="noreferrer">#${escapeHtml(response.issueNumber)}</a>`
        : "";
      const deleteButton = response.issueNumber
        ? `<button class="response-delete" type="button" data-delete-response="${escapeHtml(response.issueNumber)}" ${deleteControl.configured ? "" : "disabled"} title="${deleteControl.configured ? "Удалить ответ" : "Удаление не настроено"}">Удалить</button>`
        : "";

      return `
        <article class="response-item">
          <div class="response-topline">
            <div class="response-titleline">
              <span class="response-avatar" aria-hidden="true">${escapeHtml(initials(response.discord))}</span>
              <div class="response-name-block">
                <strong>${escapeHtml(response.discord || "аноним")}</strong>
                <span>${issueLink || "без GitHub-ссылки"}</span>
              </div>
            </div>
            <div class="response-actions">
              <span class="response-average ${scoreClass(playerAverage)}">${escapeHtml(formatScore(playerAverage))}</span>
              ${deleteButton}
            </div>
          </div>
          <div class="response-meta">
            <span>Оценил: ${escapeHtml(usedPagesCount(response))}/${escapeHtml(PAGES.length)}</span>
            <span>${escapeHtml(formatDate(response.submittedAt))}</span>
            ${responseComment(response) ? "<span>Есть комментарий</span>" : "<span>Без комментария</span>"}
          </div>
          ${renderCategorySummary(response)}
          <details class="player-details">
            <summary>
              <span>Все оценки</span>
              <b>${escapeHtml(usedPagesCount(response))}/${escapeHtml(PAGES.length)}</b>
            </summary>
            ${renderPlayerRatings(response)}
          </details>
          ${responseComment(response) ? `
            <div class="response-comment">
              <span>Комментарий</span>
              <p>${escapeHtml(responseComment(response))}</p>
            </div>
          ` : ""}
        </article>
      `;
    }).join("");
  }

  async function deleteResponse(issueNumber, button, retryWithPrompt = true, alreadyConfirmed = false) {
    if (!issueNumber || button.disabled) return;
    if (!deleteControl.configured) {
      status.textContent = "Удаление не настроено на сервере";
      status.classList.add("is-error");
      return;
    }
    if (!alreadyConfirmed && !window.confirm(`Удалить ответ #${issueNumber} из результатов?`)) return;

    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = "Удаляю...";
    status.textContent = `Удаляю ответ #${issueNumber}...`;
    status.classList.remove("is-error", "is-success");

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    try {
      const ready = await ensureAdminSession("Введите админ-ключ для удаления ответа");
      if (!ready) throw adminRequiredError("Нужен админ-ключ для удаления ответа");

      const response = await fetch(apiUrl(), {
        method: "DELETE",
        credentials: "same-origin",
        headers,
        body: JSON.stringify({ issueNumber: Number(issueNumber) })
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401 && retryWithPrompt) {
        adminSessionKnown = false;
        const unlocked = await showAdminGate("Админ-ключ не подошел. Введите ключ для удаления ответа.");
        if (unlocked) {
          button.disabled = false;
          button.textContent = previousText;
          await deleteResponse(issueNumber, button, false, true);
          return;
        }
      }
      if (!response.ok || !result.ok) {
        throw new Error(result.message || result.error || "delete_failed");
      }
      status.textContent = "Ответ удален";
      status.classList.add("is-success");
      await loadResults({ preservePage: true });
    } catch (error) {
      status.textContent = error.message || "Не удалось удалить ответ";
      status.classList.add("is-error");
      button.disabled = false;
      button.textContent = previousText;
    }
  }

  async function loadResults(options = {}) {
    status.textContent = "Загружаю...";
    status.classList.remove("is-error", "is-success");
    refreshButton.disabled = true;
    try {
      csvLink.href = apiUrl("format=csv");
      const response = await fetchWithAdmin("", { headers: { Accept: "application/json" } });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || data.error || "results_failed");
      updateSummary(data);
      renderInsights(data);
      renderAllAnswers(data);
      renderHeatmap(data.aggregate || []);
      renderAggregate(data.aggregate || []);
      deleteControl = {
        configured: data.deleteControl?.configured !== false,
        requiresToken: Boolean(data.deleteControl?.requiresToken)
      };
      responsesState = {
        page: options.preservePage ? responsesState.page : 1,
        items: data.responses || [],
        commentsOnly: responsesState.commentsOnly,
        sort: responsesState.sort,
        query: responsesState.query
      };
      renderResponses();
      status.textContent = data.configured
        ? "Данные загружены"
        : data.message || "Backend еще не настроен";
      status.classList.toggle("is-success", Boolean(data.configured));
      status.classList.toggle("is-error", !data.configured);
    } catch (error) {
      status.textContent = "Не удалось загрузить результаты";
      status.classList.add("is-error");
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function downloadCsv(event) {
    event.preventDefault();
    status.textContent = "Готовлю CSV...";
    status.classList.remove("is-error", "is-success");
    try {
      const response = await fetchWithAdmin("format=csv", { headers: { Accept: "text/csv" } });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || result.error || "csv_failed");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `ff-survey-results-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      status.textContent = "CSV скачан";
      status.classList.add("is-success");
    } catch (error) {
      status.textContent = error.message || "Не удалось скачать CSV";
      status.classList.add("is-error");
    }
  }

  responsesPrev.addEventListener("click", () => {
    responsesState.page -= 1;
    renderResponses();
  });
  responsesNext.addEventListener("click", () => {
    responsesState.page += 1;
    renderResponses();
  });
  commentsFilterButton?.addEventListener("click", () => {
    responsesState.commentsOnly = !responsesState.commentsOnly;
    responsesState.page = 1;
    renderResponses();
  });
  responsesSearchInput?.addEventListener("input", () => {
    responsesState.query = normalizeSearch(responsesSearchInput.value);
    responsesState.page = 1;
    renderResponses();
  });
  responseSortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      responsesState.sort = button.dataset.responsesSort || "newest";
      responsesState.page = 1;
      renderResponses();
    });
  });
  heatmapRoot?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-heatmap-sort]") : null;
    if (!button) return;

    const column = heatmapSortColumn(button.dataset.heatmapSort || HEATMAP_SORT_DEFAULT.key);
    heatmapSort = {
      key: column.key,
      direction: heatmapSort.key === column.key && heatmapSort.direction === "asc" ? "desc" : "asc"
    };
    renderHeatmap();
  });
  responsesRoot.addEventListener("click", (event) => {
    const chip = event.target instanceof Element ? event.target.closest(".category-chip") : null;
    if (chip) {
      const nextOpen = !chip.classList.contains("is-tooltip-open");
      closeCategoryTooltips(chip);
      chip.classList.toggle("is-tooltip-open", nextOpen);
      return;
    }

    const button = event.target instanceof Element ? event.target.closest("[data-delete-response]") : null;
    if (!button) {
      closeCategoryTooltips();
      return;
    }
    closeCategoryTooltips();
    deleteResponse(button.dataset.deleteResponse, button);
  });
  refreshButton.addEventListener("click", loadResults);
  csvLink.addEventListener("click", downloadCsv);
  setupResultsNav();
  loadResults();
})();
