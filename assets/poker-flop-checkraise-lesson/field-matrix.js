(function () {
  "use strict";

  const observedConfidence = window.FFObservedFrequencyConfidence;
  const host = document.querySelector("[data-structure-league-matrix]");
  const lessonData = window.FF_POKER_FIELD_LESSON_DATA;
  const source = lessonData?.fullHistory;
  const methodologyOnly = lessonData?.status === "methodology_only" && !source;
  const COHORTS = [
    { key: "league1", label: "Первая лига", ranks: "R1–5", tone: "league1" },
    { key: "league2", label: "Вторая лига", ranks: "R6–10", tone: "league2" },
    { key: "league3", label: "Третья лига", ranks: "R11–14", tone: "league3" },
    { key: "novice", label: "Ранги 15–18", ranks: "R15–18", tone: "novice" }
  ];
  const POSITIONS = ["BTN", "CO"];
  const DEPTHS = ["20-30", "30-40", "40-70", "70+"];
  const DEPTH_LABELS = {
    "20-30": "20–30 BB",
    "30-40": "30–40 BB",
    "40-70": "40–70 BB",
    "70+": "70+ BB"
  };
  const ACTIONS = [
    { key: "folds", label: "Пас", tone: "fold" },
    { key: "calls", label: "Колл", tone: "call" },
    { key: "raises", label: "Чек-рейз", tone: "raise" }
  ];
  let selectedPosition = "BTN";

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function integer(value) {
    return Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  }

  function rate(numerator, denominator) {
    return observedConfidence?.rate?.(numerator, denominator) ?? null;
  }

  function percent(value, signed = false) {
    if (!Number.isFinite(value)) return "—";
    const rounded = value.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${signed && value > 0 ? "+" : ""}${rounded} п.п.`;
  }

  function ratePercent(value) {
    if (!Number.isFinite(value)) return "—";
    return `${value.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }

  function count(value) {
    return Number(value).toLocaleString("ru-RU");
  }

  function rows(value = source) {
    return Array.isArray(value?.rows)
      ? value.rows.filter((row) => row?.node === "bb_response")
      : [];
  }

  function matrixErrors(value) {
    const errors = [];
    if (!value || typeof value !== "object") return ["нет fullHistory"];
    const meta = value.meta && typeof value.meta === "object" ? value.meta : {};
    if (value.schemaVersion !== 1) errors.push("ожидается fullHistory.schemaVersion = 1");
    if (meta.rankTiming !== "exact_as_of_hand") errors.push("нужен exact rank-at-hand");
    if (meta.minimumDenominator !== 50) errors.push("общий порог должен быть N=50");
    if (meta.windowStartInclusive !== "2023-09-01" || meta.windowEndExclusive !== "2026-07-22") {
      errors.push("нужно окно [2023-09-01, 2026-07-22)");
    }
    const dataRows = rows(value);
    if (!dataRows.length) errors.push("нет exact BB-response rows");
    dataRows.forEach((row, index) => {
      const opportunities = integer(row.opportunities);
      const folds = integer(row.folds);
      const calls = integer(row.calls);
      const raises = integer(row.raises);
      const other = integer(row.other);
      if (!COHORTS.some((cohort) => cohort.key === row.cohort)) errors.push(`rows[${index}]: неверная когорта`);
      if (!POSITIONS.includes(row.position)) errors.push(`rows[${index}]: неверная позиция опенера`);
      if (!DEPTHS.includes(row.depthBand)) errors.push(`rows[${index}]: неверная глубина`);
      if ([opportunities, folds, calls, raises, other].some((item) => item === null)) {
        errors.push(`rows[${index}]: неверные counts`);
      } else if (folds + calls + raises + other !== opportunities) {
        errors.push(`rows[${index}]: действия не сходятся с opportunities`);
      }
      if (row.publishable !== (opportunities >= 50)) errors.push(`rows[${index}]: нарушен N=50 gate`);
    });
    COHORTS.forEach((cohort) => {
      if (!dataRows.some((row) => row.cohort === cohort.key)) errors.push(`нет ${cohort.key}`);
    });
    return errors;
  }

  function aggregate(cohortKey, position, depthBand = "") {
    const selected = rows().filter((row) => (
      row.cohort === cohortKey
      && row.position === position
      && (!depthBand || row.depthBand === depthBand)
    ));
    if (!selected.length) return null;
    return selected.reduce((result, row) => {
      result.opportunities += Number(row.opportunities);
      result.folds += Number(row.folds);
      result.calls += Number(row.calls);
      result.raises += Number(row.raises);
      result.other += Number(row.other);
      return result;
    }, { opportunities: 0, folds: 0, calls: 0, raises: 0, other: 0 });
  }

  function actionRate(row, key) {
    return row ? rate(row[key], row.opportunities) : null;
  }

  function renderScope() {
    const scope = element("aside", "structure-league-scope panel");
    const copy = element("div", "structure-league-scope-copy");
    copy.append(
      element("p", "eyebrow", "Что показываем"),
      element("strong", "", "BB заколлировал опен CO/BTN, чекнул и встретил c-bet"),
      element("span", "", "Сравниваем не сырую частоту одной кнопки, а весь ответ BB: пас, колл и чек-рейз. Это наблюдение поля, а не стратегическая цель.")
    );
    const facts = element("div", "structure-league-scope-facts");
    facts.append(
      element("span", "", "01.09.2023–22.07.2026"),
      element("span", "", "Ранг на момент раздачи"),
      element("span", "", "Только надёжные срезы")
    );
    scope.append(copy, facts);
    return scope;
  }

  function renderControls() {
    const controls = element("section", "structure-league-controls panel");
    const copy = element("div", "structure-league-controls-copy");
    copy.append(
      element("p", "eyebrow", "Опенер"),
      element("h3", "", `BB против ${selectedPosition}`),
      element("p", "", "Глубина на старте раздачи. Слабые срезы не публикуются.")
    );
    const buttons = element("div", "structure-league-view-tabs");
    buttons.setAttribute("role", "group");
    buttons.setAttribute("aria-label", "Позиция опенера");
    POSITIONS.forEach((position) => {
      const button = element("button", position === selectedPosition ? "is-active" : "", position);
      button.type = "button";
      button.setAttribute("aria-pressed", String(position === selectedPosition));
      button.addEventListener("click", () => {
        if (position === selectedPosition) return;
        selectedPosition = position;
        render();
      });
      buttons.append(button);
    });
    controls.append(copy, buttons);
    return controls;
  }

  function renderMix(row, compact = false) {
    const wrapper = element("div", `structure-response-mix${compact ? " is-compact" : ""}`);
    if (!row || row.opportunities < 50) {
      wrapper.classList.add("is-withheld");
      wrapper.append(element("strong", "", "—"), element("small", "", "N < 50"));
      return wrapper;
    }
    const bar = element("div", "structure-response-bar");
    const legend = element("div", "structure-response-legend");
    ACTIONS.forEach((action) => {
      const value = actionRate(row, action.key);
      const segment = element("i", `is-${action.tone}`);
      segment.style.width = `${value ?? 0}%`;
      segment.title = `${action.label}: ${ratePercent(value)}`;
      bar.append(segment);
      const label = element("span", `is-${action.tone}`);
      label.append(element("i", ""), element("b", "", action.label), element("strong", "", ratePercent(value)));
      legend.append(label);
    });
    wrapper.append(bar, legend, element("small", "structure-response-n", `${count(row.opportunities)} раздач`));
    return wrapper;
  }

  function renderSummaries() {
    const grid = element("div", "structure-league-summary-grid");
    COHORTS.forEach((cohort, index) => {
      const row = aggregate(cohort.key, selectedPosition);
      const xr = actionRate(row, "raises");
      const card = element("article", `structure-league-summary panel is-${cohort.tone}`);
      const heading = element("header", "");
      const title = element("div", "");
      title.append(element("p", "eyebrow", cohort.ranks), element("h3", "", cohort.label));
      heading.append(element("span", "structure-league-index", String(index + 1).padStart(2, "0")), title);
      const headline = element("div", "structure-league-summary-headline");
      headline.append(element("span", "", "Чек-рейз"), element("strong", "", ratePercent(xr)));
      card.append(heading, headline, renderMix(row, true));
      grid.append(card);
    });
    return grid;
  }

  function renderDifference() {
    const comparisons = DEPTHS.map((depthBand) => {
      const leagueOne = aggregate("league1", selectedPosition, depthBand);
      const novice = aggregate("novice", selectedPosition, depthBand);
      const reference = actionRate(leagueOne, "raises");
      const observed = actionRate(novice, "raises");
      return { depthBand, reference, observed, delta: observed === null || reference === null ? null : observed - reference };
    }).filter((item) => Number.isFinite(item.delta));
    comparisons.sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
    const biggest = comparisons[0];
    const card = element("aside", "structure-league-difference panel");
    if (!biggest) {
      card.append(element("strong", "", "Разница не публикуется"), element("span", "", "Недостаточно двух сопоставимых надёжных срезов."));
      return card;
    }
    const direction = biggest.delta < 0 ? "реже" : "чаще";
    card.append(
      element("p", "eyebrow", "Самая заметная разница"),
      element("strong", "", `${DEPTH_LABELS[biggest.depthBand]} · новички чек-рейзят на ${percent(Math.abs(biggest.delta))} ${direction}`),
      element("span", "", `Первая лига ${ratePercent(biggest.reference)} · новички ${ratePercent(biggest.observed)}. Смотри на разделение всего ответа, а не на одну цифру.`)
    );
    return card;
  }

  function renderTable() {
    const card = element("article", "structure-league-table-card panel");
    const header = element("header", "structure-league-table-heading");
    const title = element("div", "");
    title.append(element("p", "eyebrow", `BB против ${selectedPosition}`), element("h3", "", "Как меняется ответ со стеком"));
    const legend = element("div", "structure-league-legend");
    ACTIONS.forEach((action) => legend.append(element("span", `is-${action.tone}`, action.label)));
    header.append(title, legend);

    const scroll = element("div", "structure-league-table-scroll");
    const table = element("table", "structure-league-table");
    const caption = element("caption", "visually-hidden", "Пас, колл и чек-рейз BB против c-bet по стеку и когорте");
    const thead = element("thead", "");
    const headRow = element("tr", "");
    ["Стек", ...COHORTS.map((cohort) => `${cohort.label} · ${cohort.ranks}`)].forEach((label) => {
      const cell = element("th", "", label);
      cell.scope = "col";
      headRow.append(cell);
    });
    thead.append(headRow);
    const tbody = element("tbody", "");
    DEPTHS.forEach((depthBand) => {
      const tr = element("tr", "");
      const depth = element("th", "structure-league-board");
      depth.scope = "row";
      depth.append(element("strong", "", DEPTH_LABELS[depthBand]), element("small", "", "эффективный стек"));
      tr.append(depth);
      COHORTS.forEach((cohort) => {
        const cell = element("td", `structure-league-cell is-${cohort.tone}`);
        cell.dataset.label = `${cohort.label} · ${cohort.ranks}`;
        cell.append(element("span", "structure-league-mobile-label", `${cohort.label} · ${cohort.ranks}`), renderMix(aggregate(cohort.key, selectedPosition, depthBand)));
        tr.append(cell);
      });
      tbody.append(tr);
    });
    table.append(caption, thead, tbody);
    scroll.append(table);
    card.append(header, scroll);
    return card;
  }

  function renderError(errors) {
    console.error("[flop-checkraise] full-history field validation failed", errors);
    const card = element("article", "structure-league-error panel");
    card.append(element("strong", "", "Данные поля не загрузились"), element("p", "", "Обнови страницу или попробуй позже."));
    host.replaceChildren(card);
  }

  function renderPending() {
    host.dataset.state = "pending";
    const card = element("article", "structure-league-pending panel");
    card.append(
      element("p", "eyebrow", "Полная история FF"),
      element("h3", "", "Не публикуем старый срез как актуальное поле"),
      element("p", "", "Финальная матрица появится после полной проверки раздач и групп игроков."),
      element("strong", "", "Пока здесь намеренно нет процентов и сравнительных выводов.")
    );
    host.replaceChildren(card);
  }

  function reconcileStaticCopy() {
    const ready = !methodologyOnly && matrixErrors(source).length === 0;
    const fieldTab = document.querySelector('[data-step-target="field"]');
    const fieldLink = document.querySelector('[data-step-link="field"]');
    if (fieldTab) fieldTab.hidden = !ready;
    if (fieldLink) fieldLink.hidden = !ready;
    const period = document.querySelector("[data-period-label]");
    if (period) period.textContent = methodologyOnly
      ? "Источник не опубликован"
      : (source?.meta?.periodLabel || "Период из exact artifact");
    const heading = document.querySelector('[data-step="field"] .field-heading');
    if (heading) {
      const eyebrow = heading.querySelector(".eyebrow");
      const title = heading.querySelector("h2");
      if (eyebrow) eyebrow.textContent = methodologyOnly ? "Полевые данные · проверка" : "BB против c-bet CO/BTN";
      if (title) title.textContent = methodologyOnly
        ? "Полевые частоты пока скрыты"
        : "Где меняется пас, колл и чек-рейз";
    }
    const observed = document.querySelector(".example-observed");
    if (observed) observed.hidden = true;
    const examplesLead = document.querySelector("[data-examples-lead]");
    const examplesMethod = document.querySelector("[data-examples-method]");
    if (examplesLead) examplesLead.textContent = "Учебные кандидаты на чек-рейз по всем типам флопа.";
    if (examplesMethod) examplesMethod.textContent = "Примеры ниже — учебная стратегия, а не наблюдавшиеся раздачи поля.";
  }

  function render() {
    if (methodologyOnly) {
      renderPending();
      return;
    }
    const errors = matrixErrors(source);
    if (errors.length) {
      renderError(errors);
      return;
    }
    host.dataset.openerPosition = selectedPosition;
    host.replaceChildren(renderScope(), renderControls(), renderSummaries(), renderDifference(), renderTable());
  }

  window.FFCheckraiseFieldMatrix = Object.freeze({
    version: 2,
    validate(value) {
      return { errors: matrixErrors(value) };
    }
  });

  if (!host) return;
  reconcileStaticCopy();
  window.addEventListener("load", reconcileStaticCopy, { once: true });
  render();
})();
