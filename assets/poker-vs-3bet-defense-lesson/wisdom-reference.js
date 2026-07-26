(function () {
  "use strict";

  const root = window;
  const documentRoot = document;
  const data = root.FF_VS3BET_FIELD_DATA;
  const host = documentRoot.querySelector("[data-vs3-wisdom-reference]");
  if (!host) return;

  const actions = [
    { key: "fold", totalKey: "folds", index: 1, label: "Пас", tone: "is-fold" },
    { key: "call", totalKey: "calls", index: 2, label: "Колл", tone: "is-call" },
    { key: "fourbet", totalKey: "fourbets", index: 3, label: "4-бет", tone: "is-fourbet" },
    { key: "jam", totalKey: "jams", index: 4, label: "4-бет пуш", tone: "is-jam" }
  ];
  const labels = {
    cohort: {
      novice: "Новички · R15–18",
      league3: "Лига 3 · R11–14",
      league2: "Лига 2 · R6–10",
      league1: "Лига 1 · R1–5"
    },
    relation: { IP: "В позиции · IP", OOP: "Без позиции · OOP" },
    stack: { "20-30": "20–30 BB", "31-50": "31–50 BB", "51-80": "51–80 BB", "80+": "80+ BB" },
    size: { "2.5": "2,5x", "3": "3x", "4": "4x" }
  };
  const positions = data?.meta?.heroPositions || ["EP", "MP", "HJ", "CO", "BTN", "SB"];
  const stacks = data?.meta?.stackBands || ["20-30", "31-50", "51-80", "80+"];
  const cohorts = data?.meta?.cohortOrder || ["novice", "league3", "league2", "league1"];
  const relations = data?.meta?.relations || ["IP", "OOP"];
  const sizes = data?.meta?.sizeBuckets || ["2.5", "3", "4"];
  const state = {
    cohort: cohorts.includes("league3") ? "league3" : cohorts[0],
    relation: relations.includes("IP") ? "IP" : relations[0],
    size: sizes.includes("3") ? "3" : sizes[0],
    position: positions.includes("BTN") ? "BTN" : positions[0],
    stack: stacks.includes("31-50") ? "31-50" : stacks[0],
    hand: data?.meta?.hands?.includes("AQs") ? "AQs" : data?.meta?.hands?.[0]
  };

  function element(tag, className, text) {
    const node = documentRoot.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function count(value) {
    return Math.max(0, Number(value) || 0);
  }

  function formatCount(value) {
    return Math.round(count(value)).toLocaleString("ru-RU");
  }

  function formatPercent(value, digits = 1) {
    if (!Number.isFinite(value)) return "—";
    return `${value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
  }

  function relationAllowed(relation, position) {
    if (position === "BTN") return relation === "IP";
    if (position === "SB") return relation === "OOP";
    return true;
  }

  function chartKey(position = state.position, stack = state.stack) {
    return [state.cohort, position, state.relation, stack, state.size].join("|");
  }

  function chart(position = state.position, stack = state.stack) {
    if (!relationAllowed(state.relation, position)) return null;
    return data?.charts?.[chartKey(position, stack)] || null;
  }

  function startingHandComboCount(hand) {
    const value = String(hand || "");
    if (/^([2-9TJQKA])\1$/.test(value)) return 6;
    return value.endsWith("s") ? 4 : 12;
  }

  function occurrenceProfile(current) {
    const scores = data.meta.hands.map((hand, index) => (
      count(current?.cells?.[index]?.[0]) / startingHandComboCount(hand)
    ));
    const positive = scores.filter((score) => score > 0).sort((left, right) => left - right);
    const referenceIndex = Math.max(0, Math.floor((positive.length - 1) * .9));
    const reference = positive[referenceIndex] || 0;
    return scores.map((score) => reference ? Math.min(100, score / reference * 100) : 0);
  }

  function visualOccurrenceFill(frequency) {
    if (!(frequency > 0)) return 0;
    return Math.max(10, Math.min(100, frequency));
  }

  function actionMix(cell) {
    const n = count(cell?.[0]);
    return Object.fromEntries(actions.map((action) => [action.key, n ? count(cell[action.index]) / n * 100 : 0]));
  }

  function totalsMix(totals = {}) {
    const opportunities = count(totals.opportunities);
    return Object.fromEntries(actions.map((action) => [action.key, opportunities ? count(totals[action.totalKey]) / opportunities * 100 : 0]));
  }

  function createMixBar(mix, className) {
    const bar = element("span", ["vs3-mix-bar", className].filter(Boolean).join(" "));
    bar.setAttribute("aria-hidden", "true");
    actions.forEach((action) => {
      const segment = element("i", `vs3-action-segment ${action.tone}`);
      segment.style.width = `${mix[action.key] || 0}%`;
      bar.append(segment);
    });
    return bar;
  }

  function applyMixSurface(node, mix) {
    let cumulative = 0;
    actions.forEach((action) => {
      cumulative += count(mix[action.key]);
      node.style.setProperty(`--vs3-${action.key}-end`, `${Math.min(100, cumulative)}%`);
    });
  }

  function dominantTone(mix) {
    return actions.reduce((best, action) => mix[action.key] > mix[best.key] ? action : best, actions[0]).tone;
  }

  function sampleClass(n) {
    const thresholds = data.meta.sampleThresholds;
    if (n < thresholds.unavailableBelow) return "is-unavailable";
    if (n < thresholds.lowConfidenceBelow) return "is-low-sample";
    return "is-measured";
  }

  function sampleNote(n) {
    return "";
  }

  function createFilterGroup(key, label, values) {
    const group = element("div", "vs3-wisdom-filter-group");
    group.dataset.filterKey = key;
    group.append(element("span", "vs3-filter-label", label));
    const options = element("div", "vs3-filter-options");
    values.forEach((value) => {
      const button = element("button", "vs3-filter-button", labels[key]?.[value] || value);
      button.type = "button";
      button.dataset.vs3WisdomFilter = key;
      button.dataset.vs3WisdomValue = value;
      button.setAttribute("aria-pressed", String(state[key] === value));
      options.append(button);
    });
    group.append(options);
    return group;
  }

  function createFilters() {
    const filters = element("section", "vs3-wisdom-filters");
    filters.setAttribute("aria-label", "Фильтры таблицы защит");
    filters.append(
      createFilterGroup("cohort", "Лига игрока", cohorts),
      createFilterGroup("relation", "Где Hero окажется постфлоп", relations),
      createFilterGroup("size", "Размер 3-бета", sizes)
    );
    return filters;
  }

  function createLegend() {
    const legend = element("div", "vs3-action-legend");
    actions.forEach((action) => {
      const item = element("span", action.tone);
      item.append(element("i", ""), element("b", "", action.label));
      legend.append(item);
    });
    return legend;
  }

  function createTableCell(position, stack) {
    const current = chart(position, stack);
    const invalid = !relationAllowed(state.relation, position);
    const cell = element("td", invalid ? "is-invalid" : current ? "" : "is-empty");
    if (!current) {
      const unavailable = element("span", "vs3-wisdom-cell-unavailable", invalid ? "Не бывает" : "—");
      unavailable.title = invalid
        ? `${position} не может играть ${state.relation} против 3-бета в этом споте`
        : "Для этого сочетания нет отдельного среза";
      cell.append(unavailable);
      return cell;
    }

    const totals = current.totals || {};
    const mix = totalsMix(totals);
    const aggressive = mix.fourbet + mix.jam;
    const selected = position === state.position && stack === state.stack;
    const button = element("button", "vs3-wisdom-table-cell");
    button.type = "button";
    button.dataset.vs3WisdomCell = "";
    button.dataset.position = position;
    button.dataset.stack = stack;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute(
      "aria-label",
      `${position}, ${labels.stack[stack]}: пас ${formatPercent(mix.fold)}, колл ${formatPercent(mix.call)}, 4-бет вместе с пушем ${formatPercent(aggressive)}. Показать чарт.`
    );
    button.append(
      element("strong", "vs3-wisdom-fold", formatPercent(mix.fold)),
      element("span", "vs3-wisdom-cell-copy", `колл ${formatPercent(mix.call).replace("%", "")} · 4Б ${formatPercent(aggressive).replace("%", "")}`),
      createMixBar(mix, "vs3-wisdom-cell-mix")
    );
    cell.append(button);
    return cell;
  }

  function createSummaryTable() {
    const section = element("section", "vs3-wisdom-table-card");
    const head = element("div", "vs3-wisdom-table-head");
    const copy = element("div", "");
    copy.append(
      element("h3", "", "Таблица фолдов"),
      element("p", "", "Крупно — как часто игроки пасуют на 3-бет. Полоса ниже показывает всю реакцию. Нажми ячейку, чтобы раскрыть руки.")
    );
    head.append(copy, createLegend());

    const scroll = element("div", "vs3-wisdom-table-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("aria-label", "Таблица фолдов на 3-бет по позициям и глубине");
    const table = element("table", "vs3-wisdom-table");
    const tableHead = element("thead", "");
    const headRow = element("tr", "");
    headRow.append(element("th", "vs3-wisdom-stack-heading", "Стек"));
    positions.forEach((position) => {
      const heading = element("th", "", position);
      heading.scope = "col";
      headRow.append(heading);
    });
    tableHead.append(headRow);

    const body = element("tbody", "");
    stacks.forEach((stack) => {
      const row = element("tr", "");
      const heading = element("th", "", labels.stack[stack]);
      heading.scope = "row";
      row.append(heading);
      positions.forEach((position) => row.append(createTableCell(position, stack)));
      body.append(row);
    });
    table.append(tableHead, body);
    scroll.append(table);
    section.append(head, scroll);
    return section;
  }

  function createRangeGrid(current) {
    const matrix = element("section", "vs3-wisdom-matrix-card ff-chart-panel");
    const header = element("div", "vs3-wisdom-matrix-head ff-chart-head");
    const copy = element("div", "");
    copy.append(
      element("h3", "", `${state.position} · ${labels.stack[state.stack]}`),
      element("p", "", `${labels.cohort[state.cohort]} · ${labels.relation[state.relation]} · ${labels.size[state.size]}`),
      element("p", "vs3-wisdom-occurrence-note", "Высота ячейки — как часто рука доходит до этого спота. Цвет и нижняя полоса — действие.")
    );
    header.append(copy, createLegend());

    const scroll = element("div", "vs3-matrix-scroll vs3-wisdom-matrix-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("aria-label", "Чарт наблюдаемых решений по 169 рукам");
    const grid = element("div", "vs3-range-grid vs3-wisdom-range-grid ff-range-grid");
    const occurrence = occurrenceProfile(current);
    data.meta.hands.forEach((hand, index) => {
      const cell = current.cells?.[index] || [0, 0, 0, 0, 0];
      const n = count(cell[0]);
      const mix = actionMix(cell);
      const availability = sampleClass(n);
      const available = Boolean(n);
      const occurrenceFrequency = occurrence[index] || 0;
      const button = element("button", `vs3-range-cell vs3-wisdom-range-cell ff-range-cell ${available ? dominantTone(mix) : ""} ${availability}`);
      button.type = "button";
      button.dataset.vs3WisdomHand = hand;
      button.dataset.vs3OccurrenceFrequency = occurrenceFrequency.toFixed(1);
      button.style.setProperty("--vs3-open-fill", `${visualOccurrenceFill(occurrenceFrequency)}%`);
      button.setAttribute("aria-pressed", String(hand === state.hand));
      button.setAttribute(
        "aria-label",
        available
          ? `${hand}: относительная встречаемость ${formatPercent(occurrenceFrequency)}; пас ${formatPercent(mix.fold)}, колл ${formatPercent(mix.call)}, 4-бет ${formatPercent(mix.fourbet)}, пуш ${formatPercent(mix.jam)}.`
          : `${hand}: нет отдельного среза.`
      );
      const fill = element("span", "vs3-open-weight-fill");
      applyMixSurface(fill, mix);
      button.append(fill, element("strong", "", hand), createMixBar(mix, "vs3-cell-mix"));
      grid.append(button);
    });
    scroll.append(grid);
    matrix.append(header, scroll);
    return matrix;
  }

  function recommendationMix(hand) {
    const result = root.FFVs3BetRangeExplorer?.strategyFor?.({
      position: state.position,
      relation: state.relation,
      stack: state.stack,
      size: state.size,
      cohort: "reference",
      hand
    });
    return result?.mix || null;
  }

  function createComparisonRow(label, note, mix, className) {
    const row = element("tr", `vs3-comparison-row ${className}`);
    const layer = element("th", "vs3-comparison-layer");
    layer.scope = "row";
    layer.append(element("strong", "", label), element("span", "", note));
    row.append(layer);
    const primary = mix
      ? actions.reduce((best, action) => mix[action.key] > mix[best.key] ? action : best, actions[0]).key
      : "";
    actions.forEach((action) => {
      const cell = element("td", `${action.tone} ${action.key === primary ? "is-primary" : ""}`);
      cell.dataset.label = action.label;
      cell.append(element("strong", "", mix ? formatPercent(mix[action.key]) : "—"));
      row.append(cell);
    });
    return row;
  }

  function createComparisonTable(fieldMix) {
    const table = element("table", "vs3-comparison-table");
    const head = element("thead", "");
    const headRow = element("tr", "");
    ["Линия", "Пас", "Колл", "4-бет", "Пуш"].forEach((label) => headRow.append(element("th", "", label)));
    head.append(headRow);
    const body = element("tbody", "");
    body.append(
      createComparisonRow("Наш чарт", "рекомендация", recommendationMix(state.hand), "is-reference"),
      createComparisonRow("Поле", labels.cohort[state.cohort], fieldMix, "is-measured")
    );
    table.append(head, body);
    return table;
  }

  function createHandDetail(current) {
    const index = data.meta.hands.indexOf(state.hand);
    const cell = current.cells?.[index] || [0, 0, 0, 0, 0];
    const n = count(cell[0]);
    const available = Boolean(n);
    const detail = element("aside", `vs3-wisdom-hand-detail ${sampleClass(n)}`);
    const head = element("header", "vs3-wisdom-hand-head");
    const copy = element("div", "");
    copy.append(element("span", "vs3-wisdom-detail-kicker", "Сравнение выбранной руки"), element("h3", "", state.hand));
    head.append(copy);
    detail.append(head);
    if (!available) {
      detail.append(createComparisonTable(null));
      return detail;
    }

    const mix = actionMix(cell);
    detail.append(createComparisonTable(mix));
    return detail;
  }

  function createChart() {
    const current = chart();
    const section = element("section", "vs3-wisdom-chart-card ff-chart-panel");
    if (!current) {
      section.append(element("p", "vs3-loading", "Для выбранного сочетания нет отдельного среза."));
      return section;
    }
    const layout = element("div", "vs3-wisdom-chart-layout");
    layout.append(createRangeGrid(current), createHandDetail(current));
    section.append(layout);
    return section;
  }

  function createSourceNote() {
    const note = element("footer", "vs3-wisdom-source");
    note.append(
      element("strong", "", "Наблюдаемая игра FF"),
      element("span", "", "Один опен, первый 3-бет, без сквизов.")
    );
    return note;
  }

  function selectFallbackPosition() {
    if (relationAllowed(state.relation, state.position)) return;
    state.position = state.relation === "IP" && positions.includes("BTN")
      ? "BTN"
      : positions.find((position) => relationAllowed(state.relation, position) && chart(position, state.stack)) || positions[0];
  }

  function selectAvailableCell() {
    selectFallbackPosition();
    if (chart()) return;
    for (const stack of stacks) {
      for (const position of positions) {
        if (chart(position, stack)) {
          state.position = position;
          state.stack = stack;
          return;
        }
      }
    }
  }

  function restoreFocus(focusTarget) {
    if (!focusTarget) return;
    let target = null;
    if (focusTarget.kind === "filter") {
      target = [...host.querySelectorAll("[data-vs3-wisdom-filter]")].find((button) => (
        button.dataset.vs3WisdomFilter === focusTarget.key
        && button.dataset.vs3WisdomValue === focusTarget.value
      ));
    } else if (focusTarget.kind === "cell") {
      target = [...host.querySelectorAll("[data-vs3-wisdom-cell]")].find((button) => (
        button.dataset.position === focusTarget.position && button.dataset.stack === focusTarget.stack
      ));
    } else if (focusTarget.kind === "hand") {
      target = [...host.querySelectorAll("[data-vs3-wisdom-hand]")].find((button) => button.dataset.vs3WisdomHand === focusTarget.hand);
    }
    target?.focus({ preventScroll: true });
  }

  function render({ preserveScroll = false, focusTarget = null, revealChart = false } = {}) {
    if (!data?.meta || !data?.charts) {
      host.replaceChildren(element("p", "vs3-loading", "Данные поля не загрузились. Обнови страницу."));
      return;
    }
    const previousTableScroll = preserveScroll ? host.querySelector(".vs3-wisdom-table-scroll")?.scrollLeft || 0 : 0;
    const previousMatrixScroll = preserveScroll ? host.querySelector(".vs3-wisdom-matrix-scroll")?.scrollLeft || 0 : 0;
    selectAvailableCell();
    host.replaceChildren(createFilters(), createSummaryTable(), createChart(), createSourceNote());
    if (preserveScroll) {
      const tableScroll = host.querySelector(".vs3-wisdom-table-scroll");
      const matrixScroll = host.querySelector(".vs3-wisdom-matrix-scroll");
      if (tableScroll) tableScroll.scrollLeft = previousTableScroll;
      if (matrixScroll) matrixScroll.scrollLeft = previousMatrixScroll;
    }
    requestAnimationFrame(() => {
      restoreFocus(focusTarget);
      if (revealChart && matchMedia("(max-width: 650px)").matches) {
        host.querySelector(".vs3-wisdom-chart-card")?.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    });
  }

  host.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-vs3-wisdom-filter]");
    if (filter) {
      const key = filter.dataset.vs3WisdomFilter;
      const value = filter.dataset.vs3WisdomValue;
      const allowed = key === "cohort" ? cohorts : key === "relation" ? relations : key === "size" ? sizes : [];
      if (!allowed.includes(value)) return;
      state[key] = value;
      selectAvailableCell();
      render({ focusTarget: { kind: "filter", key, value } });
      return;
    }

    const cell = event.target.closest("[data-vs3-wisdom-cell]");
    if (cell) {
      state.position = cell.dataset.position;
      state.stack = cell.dataset.stack;
      render({
        preserveScroll: true,
        focusTarget: { kind: "cell", position: state.position, stack: state.stack },
        revealChart: true
      });
      return;
    }

    const hand = event.target.closest("[data-vs3-wisdom-hand]");
    if (hand && data.meta.hands.includes(hand.dataset.vs3WisdomHand)) {
      state.hand = hand.dataset.vs3WisdomHand;
      render({ preserveScroll: true, focusTarget: { kind: "hand", hand: state.hand } });
    }
  });

  root.FFVs3BetWisdomReference = Object.freeze({
    schemaVersion: 1,
    state: () => ({ ...state }),
    setState(next = {}) {
      if (cohorts.includes(next.cohort)) state.cohort = next.cohort;
      if (relations.includes(next.relation)) state.relation = next.relation;
      if (sizes.includes(next.size)) state.size = next.size;
      if (positions.includes(next.position)) state.position = next.position;
      if (stacks.includes(next.stack)) state.stack = next.stack;
      if (data.meta.hands.includes(next.hand)) state.hand = next.hand;
      selectAvailableCell();
      render();
      return { ...state };
    },
    refresh: render
  });

  render();
})();
