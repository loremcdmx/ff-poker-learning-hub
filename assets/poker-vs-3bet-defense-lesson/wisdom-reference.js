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
      novice: "Новички · R16–18",
      league3: "Лига 3 · R11–15",
      league2: "Лига 2 · R6–10",
      league1: "Лига 1 · R1–5"
    },
    relation: { IP: "В позиции · IP", OOP: "Без позиции · OOP" },
    stack: { "20-30": "20–30 BB", "31-50": "31–50 BB", "51-80": "51–80 BB", "80+": "80+ BB" },
    size: { all: "Все сайзы", "<6": "до 6 BB", "6-8": "6–8 BB", "8-10": "8–10 BB", "10+": "10+ BB" }
  };
  const positions = data?.meta?.heroPositions || ["EP", "MP", "HJ", "CO", "BTN", "SB"];
  const stacks = data?.meta?.stackBands || ["20-30", "31-50", "51-80", "80+"];
  const cohorts = data?.meta?.cohortOrder || ["novice", "league3", "league2", "league1"];
  const relations = data?.meta?.relations || ["IP", "OOP"];
  const sizes = data?.meta?.sizeBuckets || ["all", "<6", "6-8", "8-10", "10+"];
  const state = {
    cohort: cohorts.includes("league3") ? "league3" : cohorts[0],
    relation: relations.includes("IP") ? "IP" : relations[0],
    size: sizes.includes("all") ? "all" : sizes[0],
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

  function hasEstimate(estimate) {
    return Array.isArray(estimate) && estimate.some((value) => count(value) > 0);
  }

  function actionMix(cell, estimate = null) {
    if (hasEstimate(estimate)) {
      return Object.fromEntries(actions.map((action) => [action.key, count(estimate[action.index - 1]) / 10]));
    }
    const n = count(cell?.[0]);
    return Object.fromEntries(actions.map((action) => [action.key, n ? count(cell[action.index]) / n * 100 : 0]));
  }

  function totalsMix(totals = {}) {
    const opportunities = count(totals.opportunities);
    return Object.fromEntries(actions.map((action) => [action.key, opportunities ? count(totals[action.totalKey]) / opportunities * 100 : 0]));
  }

  function createMixBar(mix, className) {
    const bar = element("span", className);
    bar.setAttribute("aria-hidden", "true");
    actions.forEach((action) => {
      const segment = element("i", `vs3-action-segment ${action.tone}`);
      segment.style.width = `${mix[action.key] || 0}%`;
      bar.append(segment);
    });
    return bar;
  }

  function dominantTone(mix) {
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
    if (n < data.meta.sampleThresholds.unavailableBelow) return "Недостаточно данных · точные N и частоты скрыты";
    if (n < data.meta.sampleThresholds.lowConfidenceBelow) return `N ${formatCount(n)} · малая выборка`;
    return `N ${formatCount(n)} решений`;
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
      createFilterGroup("size", "3-бет до", sizes)
    );
    return filters;
  }

  function createLegend() {
    const legend = element("div", "vs3-wisdom-legend");
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
      const unavailable = element("span", "vs3-wisdom-cell-unavailable", invalid ? "Не бывает" : "Мало данных");
      unavailable.title = invalid
        ? `${position} не может играть ${state.relation} против корректного 3-бета в этом узле`
        : "Публичный срез скрыт: в сочетании меньше 20 решений";
      cell.append(unavailable);
      return cell;
    }

    const totals = current.totals || {};
    const mix = totalsMix(totals);
    const defend = mix.call + mix.fourbet + mix.jam;
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
      `${position}, ${labels.stack[stack]}: защищает ${formatPercent(defend)}, колл ${formatPercent(mix.call)}, 4-бет вместе с пушем ${formatPercent(aggressive)}. N ${formatCount(totals.opportunities)}. Показать чарт.`
    );
    button.append(
      element("strong", "vs3-wisdom-defense", formatPercent(defend)),
      element("span", "vs3-wisdom-cell-copy", `колл ${formatPercent(mix.call).replace("%", "")} · 4Б ${formatPercent(aggressive).replace("%", "")}`),
      createMixBar(mix, "vs3-wisdom-cell-mix"),
      element("small", "", `N ${formatCount(totals.opportunities)}`)
    );
    cell.append(button);
    return cell;
  }

  function createSummaryTable() {
    const section = element("section", "vs3-wisdom-table-card");
    const head = element("div", "vs3-wisdom-table-head");
    const copy = element("div", "");
    copy.append(
      element("h3", "", "Таблица дефендов"),
      element("p", "", "Крупно — вся защита: колл + 4-бет + 4-бет-пуш. Нажми ячейку, чтобы раскрыть руки.")
    );
    head.append(copy, createLegend());

    const scroll = element("div", "vs3-wisdom-table-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("aria-label", "Таблица защит по позициям и глубине");
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
    const matrix = element("section", "vs3-wisdom-matrix-card");
    const header = element("div", "vs3-wisdom-matrix-head");
    const copy = element("div", "");
    copy.append(
      element("h3", "", `${state.position} · ${labels.stack[state.stack]}`),
      element("p", "", `${labels.cohort[state.cohort]} · ${labels.relation[state.relation]} · ${labels.size[state.size]}`)
    );
    const sample = element("span", "vs3-wisdom-chart-sample", `N ${formatCount(current.totals?.opportunities)}`);
    header.append(copy, sample);

    const scroll = element("div", "vs3-matrix-scroll vs3-wisdom-matrix-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("aria-label", "Чарт наблюдаемых решений по 169 рукам");
    const grid = element("div", "vs3-range-grid vs3-wisdom-range-grid");
    data.meta.hands.forEach((hand, index) => {
      const cell = current.cells?.[index] || [0, 0, 0, 0, 0];
      const estimate = current.estimates?.[index] || null;
      const n = count(cell[0]);
      const estimated = !n && hasEstimate(estimate);
      const mix = actionMix(cell, estimate);
      const availability = sampleClass(n, estimated);
      const available = estimated || availability !== "is-unavailable";
      const button = element("button", `vs3-field-range-cell vs3-wisdom-range-cell ${available ? dominantTone(mix) : ""} ${availability}`);
      button.type = "button";
      button.dataset.vs3WisdomHand = hand;
      button.setAttribute("aria-pressed", String(hand === state.hand));
      button.setAttribute("aria-label", `${hand}: ${sampleNote(n, estimated)}. Показать разбивку действий.`);
      button.append(
        element("strong", "", hand),
        element("small", "", estimated ? "оценка" : n ? `N ${formatCount(n)}` : "—")
      );
      if (available) button.append(createMixBar(mix, "vs3-field-mix"));
      grid.append(button);
    });
    scroll.append(grid);
    matrix.append(header, scroll);
    return matrix;
  }

  function createHandDetail(current) {
    const index = data.meta.hands.indexOf(state.hand);
    const cell = current.cells?.[index] || [0, 0, 0, 0, 0];
    const estimate = current.estimates?.[index] || null;
    const n = count(cell[0]);
    const estimated = !n && hasEstimate(estimate);
    const available = estimated || n >= data.meta.sampleThresholds.unavailableBelow;
    const detail = element("aside", `vs3-wisdom-hand-detail ${sampleClass(n, estimated)}`);
    const head = element("header", "vs3-wisdom-hand-head");
    const copy = element("div", "");
    copy.append(element("span", "vs3-wisdom-detail-kicker", "Выбранная рука"), element("h3", "", state.hand));
    head.append(copy, element("small", "", sampleNote(n, estimated)));
    detail.append(head);
    if (!available) {
      detail.append(element("p", "vs3-field-no-sample", "Выборка ниже публичного минимума N=20. Точные частоты и счётчики не показываем."));
      return detail;
    }

    const mix = actionMix(cell, estimate);
    const list = element("div", "vs3-wisdom-hand-actions");
    actions.forEach((action) => {
      const item = element("div", action.tone);
      item.append(
        element("span", "", action.label),
        element("strong", "", formatPercent(mix[action.key])),
        element("small", "", estimated ? "сглаженная оценка" : `${formatCount(cell[action.index])} решений`)
      );
      list.append(item);
    });
    detail.append(
      createMixBar(mix, "vs3-field-detail-mix"),
      list,
      element("p", "vs3-wisdom-boundary", "Это наблюдаемая игра поля, а не рекомендация. За правильной стратегией переходи во вкладку «Чарты».")
    );
    return detail;
  }

  function createChart() {
    const current = chart();
    const section = element("section", "vs3-wisdom-chart-card");
    if (!current) {
      section.append(element("p", "vs3-loading", "Для выбранной ячейки недостаточно данных. Выбери соседнюю позицию или глубину."));
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
      element("span", "", "5 051 115 решений · 1 января — 16 июля 2026 · строгий RFI → первый 3-бет без сквиза → ответ Hero. Ранг взят на момент раздачи.")
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
      host.replaceChildren(element("p", "vs3-loading", "Полевой куб не загрузился. Обнови страницу."));
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
