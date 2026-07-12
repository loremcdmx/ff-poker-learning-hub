(function () {
  "use strict";

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

  const METRICS = [
    { key: "performance", label: "Скорость" },
    { key: "design", label: "Дизайн" },
    { key: "ux", label: "Удобство" }
  ];

  const SKIP_SCORE = "Не знаю";
  const SCALE = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", SKIP_SCORE];

  const form = document.querySelector("[data-survey-form]");
  const ratingsRoot = document.querySelector("[data-ratings]");
  const submitButton = document.querySelector("[data-submit-button]");
  const submitState = document.querySelector("[data-submit-state]");

  const state = {
    ratings: Object.fromEntries(PAGES.map((page) => [
      page,
      Object.fromEntries(METRICS.map((metric) => [metric.key, ""]))
    ]))
  };

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

  function apiUrl() {
    try {
      if (window.location.protocol === "file:") return "";
      return new URL(queryParam("api") || "/api/player-survey", window.location.href).toString();
    } catch {
      return "";
    }
  }

  function buttonHtml(className, value, text, attrs = "") {
    return `<button class="${className}" type="button" data-value="${escapeHtml(value)}" ${attrs}>${escapeHtml(text)}</button>`;
  }

  function ratingTone(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "skip";
    if (numeric <= 3) return "low";
    if (numeric <= 7) return "mid";
    return "high";
  }

  function pageHasScore(page) {
    return METRICS.some((metric) => {
      const value = state.ratings[page][metric.key];
      return value && value !== SKIP_SCORE;
    });
  }

  function pageUntouched(page) {
    return METRICS.every((metric) => !state.ratings[page][metric.key]);
  }

  function pageSkipped(page) {
    return METRICS.every((metric) => state.ratings[page][metric.key] === SKIP_SCORE);
  }

  function derivedUsedPages() {
    return PAGES.filter(pageHasScore);
  }

  function renderRatings() {
    ratingsRoot.innerHTML = PAGES.map((page) => `
      <article class="page-card" data-page-card="${escapeHtml(page)}">
        <div class="page-head">
          <h2 class="page-title">${escapeHtml(page)}</h2>
        </div>
        ${METRICS.map((metric) => `
          <div class="metric-row" data-metric-row="${escapeHtml(page)}:${escapeHtml(metric.key)}">
            <div class="metric-name">
              <span>${escapeHtml(metric.label)}</span>
            </div>
            <div class="rating-scale" role="group" aria-label="${escapeHtml(`${page}: ${metric.label}`)}">
              ${SCALE.map((value) => buttonHtml(
                "rating-button",
                value,
                value,
                `data-tone="${escapeHtml(ratingTone(value))}" data-rating-page="${escapeHtml(page)}" data-rating-metric="${escapeHtml(metric.key)}" aria-pressed="false"`
              )).join("")}
            </div>
          </div>
        `).join("")}
      </article>
    `).join("");
  }

  function setSelected(container, value) {
    container.querySelectorAll("button").forEach((button) => {
      const selected = button.dataset.value === value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function setRating(page, metricKey, value) {
    state.ratings[page][metricKey] = value;
    const row = document.querySelector(`[data-metric-row="${CSS.escape(`${page}:${metricKey}`)}"]`);
    if (row) setSelected(row.querySelector(".rating-scale"), value);
  }

  function updatePageStatus(page) {
    const card = document.querySelector(`[data-page-card="${CSS.escape(page)}"]`);
    const used = pageHasScore(page);
    const skipped = pageSkipped(page);
    card?.classList.toggle("is-used", used);
    card?.classList.toggle("is-not-used", !used && skipped);
    card?.classList.toggle("is-missing", false);
  }

  function setSubmitState(message, mode = "") {
    submitState.textContent = message;
    submitState.classList.toggle("is-error", mode === "error");
    submitState.classList.toggle("is-success", mode === "success");
  }

  function selectedInput(name) {
    return String(form.elements[name]?.value || "").trim();
  }

  function removeLegacyCommentFields() {
    ["problem", "good", "device"].forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      const container = field.closest(".field, .section-card, label, div");
      container?.remove();
    });
    form.querySelectorAll(".section-card").forEach((card) => {
      if (!card.matches(".identity-card") && !card.querySelector("input, textarea, select")) {
        card.remove();
      }
    });
  }

  function ensureUntouchedPagesSkipped() {
    PAGES.forEach((page) => {
      if (pageUntouched(page)) {
        METRICS.forEach((metric) => {
          setRating(page, metric.key, SKIP_SCORE);
        });
        updatePageStatus(page);
      }
    });
  }

  function validate() {
    document.querySelectorAll(".page-card.is-missing").forEach((card) => card.classList.remove("is-missing"));

    if (!apiUrl()) return { ok: false, message: "Открой через сайт, не file://" };
    ensureUntouchedPagesSkipped();

    for (const page of PAGES) {
      for (const metric of METRICS) {
        if (!state.ratings[page][metric.key]) {
          const card = document.querySelector(`[data-page-card="${CSS.escape(page)}"]`);
          card?.classList.add("is-missing");
          card?.scrollIntoView({ block: "center", behavior: "smooth" });
          return { ok: false, message: `Заполни оценку: ${page} / ${metric.label}` };
        }
      }
    }

    if (!derivedUsedPages().length) return { ok: false, message: "Поставь хотя бы одну оценку по любой странице" };

    return { ok: true };
  }

  function submissionPayload() {
    return {
      id: `survey-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      discord: selectedInput("discord"),
      usedPages: derivedUsedPages(),
      ratings: state.ratings,
      comment: selectedInput("comment"),
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString()
    };
  }

  async function submitToApi() {
    const response = await fetch(apiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(submissionPayload())
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      const error = new Error(result.message || result.error || "survey_submit_failed");
      error.result = result;
      throw error;
    }
    return result;
  }

  function onClick(event) {
    const target = event.target instanceof Element ? event.target.closest("button[data-value]") : null;
    if (!target) return;

    const value = target.dataset.value || "";
    const ratingPage = target.dataset.ratingPage;
    const ratingMetric = target.dataset.ratingMetric;

    if (ratingPage && ratingMetric) {
      setRating(ratingPage, ratingMetric, value);
      updatePageStatus(ratingPage);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const validation = validate();
    if (!validation.ok) {
      setSubmitState(validation.message, "error");
      return;
    }
    submitButton.disabled = true;
    setSubmitState("Отправляю...", "");
    try {
      await submitToApi();
      setSubmitState("Отправлено", "success");
      submitButton.textContent = "Готово";
    } catch (error) {
      submitButton.disabled = false;
      if (error.message === "rate_limited") {
        setSubmitState("Слишком много отправок, попробуй позже", "error");
      } else if (error.result?.needsManualPublish) {
        setSubmitState("Сервер не настроен для приема ответов", "error");
      } else {
        setSubmitState("Не удалось отправить", "error");
      }
    }
  }

  function init() {
    removeLegacyCommentFields();
    renderRatings();
    if (!apiUrl()) {
      submitButton.disabled = true;
      setSubmitState("Открой через сайт, не file://", "error");
    }
    form.addEventListener("click", onClick);
    form.addEventListener("submit", onSubmit);
  }

  init();
})();
