(function () {
  "use strict";

  const root = window;
  const documentRoot = document;
  const data = root.FF_VS3BET_FIELD_DATA;
  const host = documentRoot.querySelector("[data-vs3-field-explorer]");
  if (!host) return;

  const actions = [
    { key: "fold", index: 1, label: "Пас", tone: "is-fold" },
    { key: "call", index: 2, label: "Колл", tone: "is-call" },
    { key: "fourbet", index: 3, label: "4-бет", tone: "is-fourbet" },
    { key: "jam", index: 4, label: "4-бет пуш", tone: "is-jam" }
  ];
  const labels = {
    cohort: { novice: "Новички · R16–18", league3: "Лига 3 · R11–15", league2: "Лига 2 · R6–10", league1: "Лига 1 · R1–5" },
    position: { EP: "EP", MP: "MP", HJ: "HJ", CO: "CO", BTN: "BTN", SB: "SB" },
    relation: { IP: "В позиции", OOP: "Без позиции" },
    stack: { "20-30": "20–30 BB", "31-50": "31–50 BB", "51-80": "51–80 BB", "80+": "80+ BB" },
    size: { all: "Все сайзы", "<6": "до 6 BB", "6-8": "6–8 BB", "8-10": "8–10 BB", "10+": "10+ BB" }
  };
  const filters = {
    cohort: { label: "Кто играет", values: data?.meta?.cohortOrder || ["league3"], preferred: "league3" },
    position: { label: "Позиция Hero", values: data?.meta?.heroPositions || ["BTN"], preferred: "BTN" },
    relation: { label: "Против 3-бета", values: data?.meta?.relations || ["IP"], preferred: "IP" },
    stack: { label: "Эффективный стек", values: data?.meta?.stackBands || ["31-50"], preferred: "31-50" },
    size: { label: "3-бет до", values: data?.meta?.sizeBuckets || ["all"], preferred: "all" }
  };
  const state = Object.fromEntries(Object.entries(filters).map(([key, config]) => [key, config.values.includes(config.preferred) ? config.preferred : config.values[0]]));
  state.hand = "AQs";

  function element(tag, className, text) {
    const node = documentRoot.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function relationAllowed(relation, position = state.position) {
    if (position === "BTN") return relation === "IP";
    if (position === "SB") return relation === "OOP";
    return true;
  }

  function chartKey() {
    return [state.cohort, state.position, state.relation, state.stack, state.size].join("|");
  }

  function chart() {
    return data?.charts?.[chartKey()] || null;
  }

  function count(value) {
    return Math.max(0, Number(value) || 0);
  }

  function formatCount(value) {
    return Math.round(count(value)).toLocaleString("ru-RU");
  }

  function percent(numerator, denominator) {
    if (!denominator) return "—";
    const value = numerator / denominator * 100;
    return `${value.toLocaleString("ru-RU", { minimumFractionDigits: value < 10 ? 1 : 0, maximumFractionDigits: 1 })}%`;
  }

  function hasEstimate(estimate) {
    return Array.isArray(estimate) && estimate.some((value) => count(value) > 0);
  }

  function actionMix(cell, estimate) {
    if (hasEstimate(estimate)) {
      return Object.fromEntries(actions.map((action) => [action.key, count(estimate[action.index - 1]) / 10]));
    }
    const n = count(cell?.[0]);
    return Object.fromEntries(actions.map((action) => [action.key, n ? count(cell[action.index]) / n * 100 : 0]));
  }

  function createMixBar(cell, className = "vs3-field-mix", estimate = null) {
    const mix = actionMix(cell, estimate);
    const bar = element("span", className);
    bar.setAttribute("aria-hidden", "true");
    actions.forEach((action) => {
      const segment = element("i", `vs3-action-segment ${action.tone}`);
      segment.style.width = `${mix[action.key]}%`;
      bar.append(segment);
    });
    return bar;
  }

  function dominantTone(cell, estimate = null) {
    const mix = actionMix(cell, estimate);
    return actions.reduce((best, action) => mix[action.key] > mix[best.key] ? action : best, actions[0]).tone;
  }

  function sampleClass(n, estimated = false) {
    if (estimated) return "is-estimated";
    const thresholds = data.meta.sampleThresholds;
    if (n < thresholds.unavailableBelow) return "is-unavailable";
    if (n < thresholds.lowConfidenceBelow) return "is-low-sample";
    return "is-measured";
  }

  function sampleNote(n, estimated = false) {
    if (estimated) return `Сглаженная оценка · исходная выборка N < ${data.meta.sampleThresholds.unavailableBelow}`;
    const thresholds = data.meta.sampleThresholds;
    if (n < thresholds.unavailableBelow) return "Недостаточно данных · точный N и частоты скрыты";
    if (n < thresholds.lowConfidenceBelow) return `N ${formatCount(n)} · малая выборка`;
    return `N ${formatCount(n)} решений`;
  }

  function createFilters() {
    const grid = element("div", "vs3-filter-grid vs3-field-filter-grid");
    Object.entries(filters).forEach(([key, config]) => {
      const group = element("div", "vs3-filter-group");
      group.dataset.filterKey = key;
      const label = element("span", "vs3-filter-label", config.label);
      const controls = element("div", "vs3-filter-options");
      config.values.forEach((value) => {
        const button = element("button", "vs3-filter-button", labels[key]?.[value] || value);
        button.type = "button";
        button.dataset.vs3FieldFilter = key;
        button.dataset.vs3FieldValue = value;
        button.setAttribute("aria-pressed", String(state[key] === value));
        const unavailable = key === "relation" && !relationAllowed(value);
        button.disabled = unavailable;
        controls.append(button);
      });
      group.append(label, controls);
      grid.append(group);
    });
    return grid;
  }

  function createSummary(current) {
    const totals = current?.totals || {};
    const card = element("section", "vs3-field-summary");
    const heading = element("div", "vs3-field-summary-head");
    const title = element("div", "");
    title.append(
      element("strong", "", `${labels.cohort[state.cohort]} · ${labels.position[state.position]} ${labels.relation[state.relation]}`),
      element("span", "", `${labels.stack[state.stack]} · ${labels.size[state.size]}`)
    );
    const sample = element("div", "vs3-field-summary-n");
    sample.append(element("b", "", formatCount(totals.opportunities)), element("span", "", "решений"));
    heading.append(title, sample);
    const totalCell = [totals.opportunities, totals.folds, totals.calls, totals.fourbets, totals.jams];
    const numbers = element("div", "vs3-field-summary-actions");
    actions.forEach((action) => {
      const item = element("span", action.tone);
      item.append(element("b", "", percent(totals[`${action.key}s`] ?? totals[action.key], totals.opportunities)), element("small", "", action.label));
      numbers.append(item);
    });
    card.append(heading, createMixBar(totalCell, "vs3-field-summary-mix"), numbers);
    return card;
  }

  function createMatrix(current) {
    const card = element("section", "vs3-matrix-card vs3-field-matrix-card");
    const head = element("header", "vs3-matrix-head");
    const copy = element("div", "");
    copy.append(element("h4", "", "Реальные действия по 169 рукам"), element("p", "vs3-scenario-copy", "Цвет показывает сыгранный mix; точка и штриховка — сглаженная оценка малой выборки."));
    head.append(copy);
    const scroll = element("div", "vs3-matrix-scroll");
    scroll.tabIndex = 0;
    const grid = element("div", "vs3-range-grid");
    data.meta.hands.forEach((hand, index) => {
      const cell = current.cells[index] || [0, 0, 0, 0, 0];
      const estimate = current.estimates?.[index] || null;
      const n = count(cell[0]);
      const estimated = !n && hasEstimate(estimate);
      const availability = sampleClass(n, estimated);
      const reveal = estimated || availability !== "is-unavailable";
      const button = element("button", `vs3-field-range-cell ${reveal ? dominantTone(cell, estimate) : ""} ${availability}`);
      button.type = "button";
      button.dataset.vs3FieldHand = hand;
      button.setAttribute("aria-pressed", String(hand === state.hand));
      button.setAttribute("aria-label", `${hand}: ${sampleNote(n, estimated)}. Показать действия поля.`);
      button.append(element("strong", "", hand), element("small", "", estimated ? "оценка" : n ? formatCount(n) : "—"));
      if (reveal) button.append(createMixBar(cell, "vs3-field-mix", estimate));
      grid.append(button);
    });
    scroll.append(grid);
    card.append(head, scroll);
    return card;
  }

  function createHandDetail(current) {
    const index = data.meta.hands.indexOf(state.hand);
    const cell = current?.cells?.[index] || [0, 0, 0, 0, 0];
    const estimate = current?.estimates?.[index] || null;
    const n = count(cell[0]);
    const estimated = !n && hasEstimate(estimate);
    const available = estimated || n >= data.meta.sampleThresholds.unavailableBelow;
    const aside = element("aside", `vs3-field-hand-detail ${sampleClass(n, estimated)}`);
    const head = element("header", "vs3-comparison-head");
    const copy = element("div", "");
    copy.append(element("h4", "", "Что делало поле"), element("p", "vs3-comparison-copy", sampleNote(n, estimated)));
    head.append(copy, element("strong", "vs3-hand-badge", state.hand));
    aside.append(head);
    if (!available) {
      aside.append(element("p", "vs3-field-no-sample", "Не рисуем проценты и не раскрываем точный N: выборка ниже честного минимума N=20."));
      return aside;
    }
    const rows = element("div", "vs3-field-hand-actions");
    const mix = actionMix(cell, estimate);
    actions.forEach((action) => {
      const row = element("div", action.tone);
      row.append(
        element("span", "", action.label),
        element("strong", "", `${mix[action.key].toLocaleString("ru-RU", { minimumFractionDigits: mix[action.key] < 10 ? 1 : 0, maximumFractionDigits: 1 })}%`),
        element("small", "", estimated ? "сглаженная оценка; точные N и счётчики скрыты" : `${formatCount(cell[action.index])} решений`)
      );
      rows.append(row);
    });
    const caution = estimated
      ? "Оценка стабилизирована поведением других лиг в том же споте. Это не GTO-рекомендация."
      : n < data.meta.sampleThresholds.lowConfidenceBelow
      ? "Выборка мала: смотри направление, а не точную десятую процента."
      : "Это наблюдаемое поведение поля, не рекомендация и не правильный ответ тренажёра.";
    aside.append(createMixBar(cell, "vs3-field-detail-mix", estimate), rows, element("p", "vs3-field-detail-note", caution));
    return aside;
  }

  function render() {
    if (!data?.meta || !data?.charts) {
      host.replaceChildren(element("p", "vs3-loading", "Измеренный полевой куб не загрузился."));
      return;
    }
    const current = chart();
    if (!current) {
      host.replaceChildren(createFilters(), element("p", "vs3-loading", "В этом сочетании фильтров нет измеренных решений."));
      return;
    }
    const layout = element("div", "vs3-field-chart-layout");
    layout.append(createMatrix(current), createHandDetail(current));
    host.replaceChildren(createFilters(), createSummary(current), layout);
  }

  documentRoot.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-vs3-field-filter]");
    if (filter) {
      const key = filter.dataset.vs3FieldFilter;
      const value = filter.dataset.vs3FieldValue;
      if (!filters[key]?.values.includes(value)) return;
      state[key] = value;
      if (key === "position" && !relationAllowed(state.relation, value)) state.relation = value === "SB" ? "OOP" : "IP";
      render();
      return;
    }
    const hand = event.target.closest("[data-vs3-field-hand]");
    if (hand) {
      state.hand = hand.dataset.vs3FieldHand;
      render();
    }
  });

  root.FFVs3BetFieldExplorer = Object.freeze({
    schemaVersion: 1,
    filters: () => ({ ...state }),
    setFilters(next = {}) {
      Object.keys(filters).forEach((key) => {
        if (filters[key].values.includes(next[key])) state[key] = next[key];
      });
      if (!relationAllowed(state.relation, state.position)) state.relation = state.position === "SB" ? "OOP" : "IP";
      if (data.meta.hands.includes(next.hand)) state.hand = next.hand;
      render();
      return { ...state };
    },
    refresh: render
  });
  render();
})();
