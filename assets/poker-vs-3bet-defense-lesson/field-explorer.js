(function () {
  "use strict";

  const root = window;
  const documentRoot = document;
  const data = root.FF_VS3BET_FIELD_DATA;
  const model = root.FF_VS3BET_RANGE_MODEL;
  const host = documentRoot.querySelector("[data-vs3-field-explorer]");
  const errorsHost = documentRoot.querySelector("[data-vs3-leaks]");
  const regViewTabs = Array.from(documentRoot.querySelectorAll("[data-vs3-reg-view]"));
  const regViewPanels = Array.from(documentRoot.querySelectorAll("[data-vs3-reg-view-panel]"));
  const regViews = regViewTabs.map((tab) => tab.dataset.vs3RegView).filter(Boolean);
  if (!host && !errorsHost) return;

  const actions = [
    { key: "fold", index: 1, label: "Пас", tone: "is-fold" },
    { key: "call", index: 2, label: "Колл", tone: "is-call" },
    { key: "fourbet", index: 3, label: "4-бет", tone: "is-fourbet" },
    { key: "jam", index: 4, label: "4-бет пуш", tone: "is-jam" }
  ];
  const labels = {
    cohort: { novice: "Новички · R15–18", league3: "Лига 3 · R11–14", league2: "Лига 2 · R6–10", league1: "Лига 1 · R1–5" },
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
  state.errorHand = "";

  function initialRegView() {
    const params = new URLSearchParams(root.location.search);
    const requested = params.get("regView");
    if (regViews.includes(requested)) return requested;
    if (params.has("errorMatrix")) return "errors";
    return "target";
  }

  function setRegView(next, { focus = false, updateUrl = true } = {}) {
    const view = regViews.includes(next) ? next : regViews[0] || "overview";
    regViewTabs.forEach((tab) => {
      const selected = tab.dataset.vs3RegView === view;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus({ preventScroll: true });
    });
    regViewPanels.forEach((panel) => {
      const selected = panel.dataset.vs3RegViewPanel === view;
      panel.hidden = !selected;
      panel.classList.toggle("is-active", selected);
    });
    if (view === "overview") root.FFVs3BetWisdomReference?.refresh?.({ preserveScroll: true });
    if (view === "hands") render();
    if (view === "errors") renderErrors();
    if (updateUrl && root.history?.replaceState) {
      const url = new URL(root.location.href);
      url.searchParams.set("regView", view);
      root.history.replaceState(root.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    return view;
  }

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

  function chartKey(selection = state) {
    return [selection.cohort, selection.position, selection.relation, selection.stack, selection.size].join("|");
  }

  function chart(selection = state) {
    return data?.charts?.[chartKey(selection)] || null;
  }

  function filterValueAvailable(key, value) {
    const next = { ...state, [key]: value };
    return relationAllowed(next.relation, next.position) && Boolean(chart(next));
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

  function actionMix(cell) {
    const n = count(cell?.[0]);
    return Object.fromEntries(actions.map((action) => [action.key, n ? count(cell[action.index]) / n * 100 : 0]));
  }

  function createMixBar(cell, className = "vs3-field-mix") {
    const mix = actionMix(cell);
    const bar = element("span", className);
    bar.setAttribute("aria-hidden", "true");
    actions.forEach((action) => {
      const segment = element("i", `vs3-action-segment ${action.tone}`);
      segment.style.width = `${mix[action.key]}%`;
      bar.append(segment);
    });
    return bar;
  }

  function dominantTone(cell) {
    const mix = actionMix(cell);
    return actions.reduce((best, action) => mix[action.key] > mix[best.key] ? action : best, actions[0]).tone;
  }

  function sampleClass(n) {
    const thresholds = data.meta.sampleThresholds;
    if (n < thresholds.unavailableBelow) return "is-unavailable";
    return "is-measured";
  }

  function sampleNote(n) {
    return "";
  }

  function startingHandComboCount(hand) {
    const value = String(hand || "");
    if (/^([2-9TJQKA])\1$/.test(value)) return 6;
    return value.endsWith("s") ? 4 : 12;
  }

  function occurrenceProfile(current) {
    const allSizesKey = [state.cohort, state.position, state.relation, state.stack, "all"].join("|");
    const source = data?.charts?.[allSizesKey] || current;
    const scores = data.meta.hands.map((hand, index) => (
      count(source?.cells?.[index]?.[0]) / startingHandComboCount(hand)
    ));
    const positive = scores.filter((score) => score > 0).sort((left, right) => left - right);
    const reference = positive[Math.max(0, Math.floor((positive.length - 1) * .9))] || 0;
    return scores.map((score) => reference ? Math.min(100, score / reference * 100) : 0);
  }

  function visualOccurrenceFill(frequency) {
    if (!(frequency > 0)) return 0;
    return Math.max(10, Math.min(100, frequency));
  }

  function referenceSizeMultiplier(size = state.size) {
    if (size === "<6") return 2.5;
    if (size === "8-10" || size === "10+") return 4;
    return 3;
  }

  function referenceScenario() {
    if (typeof model?.scenario !== "function") return null;
    try {
      return model.scenario({
        position: state.position,
        relation: state.relation,
        stack: state.stack,
        size: referenceSizeMultiplier(),
        cohort: "reference"
      });
    } catch (error) {
      return null;
    }
  }

  function referenceMixFor(scenario, hand) {
    const cells = scenario?.cells;
    const cell = cells instanceof Map ? cells.get(hand) : cells?.[hand];
    const values = Object.fromEntries(actions.map((action) => [action.key, count(cell?.[action.key])]));
    const total = actions.reduce((sum, action) => sum + values[action.key], 0);
    if (!total) return Object.fromEntries(actions.map((action) => [action.key, 0]));
    return Object.fromEntries(actions.map((action) => [action.key, values[action.key] * 100 / total]));
  }

  function wilsonInterval(successes, total, z = 1.96) {
    if (!total) return [0, 100];
    const rate = Math.min(1, Math.max(0, successes / total));
    const denominator = 1 + z * z / total;
    const center = (rate + z * z / (2 * total)) / denominator;
    const margin = z * Math.sqrt(rate * (1 - rate) / total + z * z / (4 * total * total)) / denominator;
    return [Math.max(0, center - margin) * 100, Math.min(1, center + margin) * 100];
  }

  function errorEntry(current, reference, hand, index) {
    const cell = current?.cells?.[index] || [0, 0, 0, 0, 0];
    const n = count(cell[0]);
    const observed = actionMix(cell);
    const target = referenceMixFor(reference, hand);
    const foldDelta = observed.fold - target.fold;
    const aggressionDelta = observed.fourbet + observed.jam - target.fourbet - target.jam;
    const kind = Math.abs(foldDelta) < 3 ? "balanced" : foldDelta > 0 ? "underdefense" : "overdefense";
    const rankable = n >= data.meta.sampleThresholds.lowConfidenceBelow;
    const [foldLow, foldHigh] = rankable ? wilsonInterval(cell[1], n) : [0, 100];
    const confirmedGap = !rankable
      ? 0
      : kind === "underdefense"
      ? Math.max(0, foldLow - target.fold)
      : kind === "overdefense"
      ? Math.max(0, target.fold - foldHigh)
      : 0;
    const totalVariation = actions.reduce((sum, action) => sum + Math.abs(observed[action.key] - target[action.key]), 0) / 200;
    return {
      hand,
      index,
      cell,
      n,
      observed,
      target,
      kind,
      rankable,
      confirmedGap,
      foldDelta,
      aggressionDelta,
      totalVariation,
      redistributedDecisions: n * totalVariation,
      score: n * confirmedGap / 100
    };
  }

  function errorEntries(current = chart()) {
    const reference = referenceScenario();
    return data.meta.hands.map((hand, index) => errorEntry(current, reference, hand, index));
  }

  function errorLabel(entry) {
    if (entry.kind === "underdefense") return "Недозащита";
    if (entry.kind === "overdefense") return "Лишняя защита";
    return "Близко к цели";
  }

  function signedPercentPoints(value) {
    const rounded = Math.round(Math.abs(value) * 10) / 10;
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}${rounded.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} п.п.`;
  }

  function createFilters(context = "field") {
    const grid = element("div", "vs3-filter-grid vs3-field-filter-grid");
    grid.dataset.vs3FieldFilterContext = context;
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
        const unavailable = !filterValueAvailable(key, value);
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
    const opportunities = count(totals.opportunities);
    const card = element("section", "vs3-field-summary");
    const heading = element("div", "vs3-field-summary-head");
    const title = element("div", "");
    title.append(
      element("strong", "", `${labels.cohort[state.cohort]} · ${labels.position[state.position]} ${labels.relation[state.relation]}`),
      element("span", "", `${labels.stack[state.stack]} · ${labels.size[state.size]}`)
    );
    heading.append(title);
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
    const card = element("section", "vs3-matrix-card vs3-field-matrix-card ff-chart-panel");
    const head = element("header", "vs3-matrix-head ff-chart-head");
    const copy = element("div", "");
    copy.append(
      element("h4", "", "Как поле играет каждую руку"),
      element("p", "vs3-scenario-copy", "Высота — встречаемость среди опенов с учётом комбо. Цвет — главное действие.")
    );
    head.append(copy);
    const scroll = element("div", "vs3-matrix-scroll");
    scroll.tabIndex = 0;
    const grid = element("div", "vs3-range-grid ff-range-grid");
    const occurrence = occurrenceProfile(current);
    data.meta.hands.forEach((hand, index) => {
      const cell = current.cells[index] || [0, 0, 0, 0, 0];
      const n = count(cell[0]);
      const availability = sampleClass(n);
      const reveal = Boolean(n);
      const occurrenceFrequency = occurrence[index] || 0;
      const button = element("button", `vs3-field-range-cell ff-range-cell has-occurrence-weight ${reveal ? dominantTone(cell) : ""} ${availability}`);
      button.type = "button";
      button.dataset.vs3FieldHand = hand;
      button.dataset.vs3OccurrenceFrequency = occurrenceFrequency.toFixed(1);
      button.style.setProperty("--vs3-field-occurrence-fill", `${visualOccurrenceFill(occurrenceFrequency)}%`);
      button.setAttribute("aria-pressed", String(hand === state.hand));
      button.setAttribute("aria-label", reveal ? `${hand}: относительная встречаемость ${occurrenceFrequency.toFixed(1)}%. Показать действия поля.` : `${hand}: нет отдельного среза.`);
      button.append(element("span", "vs3-field-occurrence-fill"), element("strong", "", hand));
      grid.append(button);
    });
    scroll.append(grid);
    card.append(head, scroll);
    return card;
  }

  function createHandDetail(current) {
    const index = data.meta.hands.indexOf(state.hand);
    const cell = current?.cells?.[index] || [0, 0, 0, 0, 0];
    const n = count(cell[0]);
    const available = Boolean(n);
    const aside = element("aside", `vs3-field-hand-detail ${sampleClass(n)}`);
    const head = element("header", "vs3-comparison-head");
    const copy = element("div", "");
    copy.append(element("h4", "", "Что делало поле"));
    head.append(copy, element("strong", "vs3-hand-badge", state.hand));
    aside.append(head);
    if (!available) {
      aside.append(element("p", "vs3-field-no-sample", "Для этой руки нет отдельного среза."));
      return aside;
    }
    const rows = element("div", "vs3-field-hand-actions");
    const mix = actionMix(cell);
    actions.forEach((action) => {
      const row = element("div", action.tone);
      row.append(
        element("span", "", action.label),
        element("strong", "", `${mix[action.key].toLocaleString("ru-RU", { minimumFractionDigits: mix[action.key] < 10 ? 1 : 0, maximumFractionDigits: 1 })}%`)
      );
      rows.append(row);
    });
    const caution = "Это реальные решения поля, а не совет, как играть.";
    aside.append(createMixBar(cell, "vs3-field-detail-mix"), rows, element("p", "vs3-field-detail-note", caution));
    return aside;
  }

  function createPercentMixBar(mix, className) {
    const bar = element("span", className);
    bar.setAttribute("aria-hidden", "true");
    actions.forEach((action) => {
      const segment = element("i", `vs3-action-segment ${action.tone}`);
      segment.style.width = `${count(mix?.[action.key])}%`;
      bar.append(segment);
    });
    return bar;
  }

  function createErrorLegend() {
    const legend = element("div", "vs3-error-legend");
    [
      ["underdefense", "Лишний пас"],
      ["overdefense", "Лишнее продолжение"],
      ["balanced", "Близко к цели"],
    ].forEach(([tone, label]) => {
      const item = element("span", `is-${tone}`);
      item.append(element("i", ""), element("span", "", label));
      legend.append(item);
    });
    return legend;
  }

  function createErrorMatrix(entries) {
    const card = element("section", "vs3-matrix-card vs3-error-matrix-card");
    card.dataset.vs3ErrorMatrix = "";
    const head = element("header", "vs3-matrix-head");
    const copy = element("div", "");
    copy.append(
      element("h4", "", "169 рук · отклонение паса"),
      element("p", "vs3-scenario-copy", "Цвет показывает, где поле отклоняется от нашей стратегии. Нажми руку для разбора.")
    );
    head.append(copy, createErrorLegend());
    const maximum = Math.max(1, ...entries.filter((entry) => entry.rankable).map((entry) => Math.abs(entry.foldDelta)));
    const scroll = element("div", "vs3-matrix-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("aria-label", "Матрица отклонений 169 рук; на узких экранах прокручивается горизонтально");
    const grid = element("div", "vs3-range-grid vs3-error-range-grid");
    entries.forEach((entry) => {
      const availability = sampleClass(entry.n);
      const tone = entry.rankable ? entry.kind : entry.n ? "low-sample" : "unavailable";
      const button = element("button", `vs3-error-range-cell is-${tone} ${availability}`);
      button.type = "button";
      button.dataset.vs3ErrorHand = entry.hand;
      button.dataset.errorKind = entry.kind;
      button.setAttribute("aria-pressed", String(entry.hand === state.errorHand));
      button.style.setProperty("--vs3-error-intensity", String(Math.min(1, Math.abs(entry.foldDelta) / maximum)));
      const sample = entry.n ? signedPercentPoints(entry.foldDelta).replace(" п.п.", "") : "—";
      button.append(element("strong", "", entry.hand), element("small", "", sample));
      button.setAttribute("aria-label", entry.n
        ? `${entry.hand}: ${errorLabel(entry)}, пас ${signedPercentPoints(entry.foldDelta)}. Открыть разбор.`
        : `${entry.hand}: нет отдельного среза.`);
      grid.append(button);
    });
    scroll.append(grid);
    card.append(head, scroll);
    return card;
  }

  function createErrorMixRow(label, mix, tone) {
    const row = element("article", `vs3-error-mix-row ${tone}`);
    const head = element("div", "");
    head.append(element("strong", "", label), element("span", "", `Пас ${percentValue(mix.fold)}`));
    const numbers = element("div", "vs3-error-mix-numbers");
    actions.forEach((action) => {
      const item = element("span", action.tone);
      item.append(element("b", "", percentValue(mix[action.key])), element("small", "", action.label));
      numbers.append(item);
    });
    row.append(head, createPercentMixBar(mix, "vs3-error-mix-bar"), numbers);
    return row;
  }

  function percentValue(value) {
    const numeric = count(value);
    return `${numeric.toLocaleString("ru-RU", { minimumFractionDigits: numeric < 10 ? 1 : 0, maximumFractionDigits: 1 })}%`;
  }

  function createErrorDetail(entries) {
    const selected = entries.find((entry) => entry.hand === state.errorHand) || entries[0];
    const aside = element("section", "vs3-error-detail");
    aside.dataset.vs3ErrorDetail = "";
    if (!selected) return aside;
    const head = element("header", "vs3-comparison-head");
    const copy = element("div", "");
    copy.append(
      element("p", "vs3-error-kicker", errorLabel(selected)),
      element("h4", "", "Разбор выбранной руки")
    );
    head.append(copy, element("strong", "vs3-hand-badge", selected.hand));
    aside.append(head);
    if (!selected.n) {
      aside.append(element("p", "vs3-field-no-sample", "Для этой руки нет отдельного среза."));
      return aside;
    }
    const metrics = element("div", "vs3-error-metrics");
    const direction = selected.kind === "underdefense" ? "лишних пасов" : selected.kind === "overdefense" ? "лишних продолжений" : "решений около цели";
    [
      ["Поле пасует", percentValue(selected.observed.fold)],
      ["Наша стратегия", percentValue(selected.target.fold)],
      ["Разница", signedPercentPoints(selected.foldDelta)]
    ].forEach(([label, value]) => {
      const item = element("div", "");
      item.append(element("span", "", label), element("strong", "", value));
      metrics.append(item);
    });
    aside.append(metrics);
    if (selected.n) aside.append(element("p", "vs3-error-decision-context", `Чаще встречаются ${direction}.`));
    const mixes = element("div", "vs3-error-mixes");
    mixes.append(
      createErrorMixRow("Наблюдаемая игра", selected.observed, "is-observed"),
      createErrorMixRow("Наша учебная цель", selected.target, "is-target")
    );
    aside.append(mixes);
    const note = selected.rankable && selected.confirmedGap > 0
      ? "Разница входит в список частых ошибок этого среза."
      : selected.rankable
      ? "Разница видна, но не входит в список самых частых ошибок."
      : "Разница показана в матрице, но не входит в рейтинг частых ошибок.";
    aside.append(element("p", "vs3-error-detail-note", note));
    const chartButton = element("button", "field-button is-secondary vs3-error-open-chart", "Открыть руку в нашем чарте");
    chartButton.type = "button";
    chartButton.dataset.vs3OpenErrorChart = selected.hand;
    aside.append(chartButton);
    return aside;
  }

  function rankedErrors(entries, kind) {
    return entries.filter((entry) => entry.kind === kind && entry.rankable && entry.confirmedGap > 0)
      .sort((left, right) => right.score - left.score || Math.abs(right.foldDelta) - Math.abs(left.foldDelta) || left.hand.localeCompare(right.hand))
      .slice(0, 6);
  }

  function createErrorRankingGroup(entries, kind) {
    const under = kind === "underdefense";
    const group = element("section", `vs3-error-ranking-group is-${kind}`);
    group.append(element("h5", "", under ? "Чаще лишний пас" : "Чаще лишнее продолжение"));
    const list = element("div", "vs3-error-ranking-list");
    if (!entries.length) {
      list.append(element("p", "vs3-error-empty", "В этом срезе нет достаточно устойчивых отклонений."));
    } else {
      entries.forEach((entry, index) => {
        const button = element("button", "vs3-error-ranking-row");
        button.type = "button";
        button.dataset.vs3ErrorHand = entry.hand;
        button.setAttribute("aria-pressed", String(entry.hand === state.errorHand));
        const rank = element("span", "vs3-error-rank", String(index + 1).padStart(2, "0"));
        const copy = element("span", "vs3-error-ranking-copy");
        copy.append(element("strong", "", entry.hand), element("small", "", `Пас ${signedPercentPoints(entry.foldDelta)}`));
        button.append(rank, copy);
        list.append(button);
      });
    }
    group.append(list);
    return group;
  }

  function createErrorRanking(entries) {
    const card = element("section", "vs3-error-ranking");
    card.dataset.vs3ErrorRanking = "";
    const head = element("header", "");
    head.append(
      element("h4", "", "Самые частые ошибки"),
      element("p", "", "Показываем самые частые отклонения выбранного среза.")
    );
    card.append(
      head,
      createErrorRankingGroup(rankedErrors(entries, "underdefense"), "underdefense"),
      createErrorRankingGroup(rankedErrors(entries, "overdefense"), "overdefense")
    );
    return card;
  }

  function renderErrors() {
    if (!errorsHost) return;
    errorsHost.classList.add("is-error-explorer");
    if (!data?.meta || !data?.charts || typeof model?.scenario !== "function") {
      errorsHost.replaceChildren(element("p", "vs3-loading", "Матрица ошибок не загрузилась."));
      return;
    }
    const current = chart();
    if (!current) {
      errorsHost.replaceChildren(createFilters("errors"), element("p", "vs3-loading", "В этом сочетании фильтров пока нет решений."));
      return;
    }
    const entries = errorEntries(current);
    const defaultEntry = rankedErrors(entries, "underdefense")[0] || rankedErrors(entries, "overdefense")[0] || entries.find((entry) => entry.n) || entries[0];
    if (!entries.some((entry) => entry.hand === state.errorHand && entry.n)) state.errorHand = defaultEntry?.hand || data.meta.hands[0];
    const wrapper = element("article", "panel vs3-error-explorer");
    const head = element("header", "vs3-error-head");
    const copy = element("div", "");
    copy.append(
      element("p", "eyebrow", "Реальные раздачи FF"),
      element("h4", "", "Матрица отклонений по рукам")
    );
    head.append(copy);
    const boundary = element("p", "vs3-error-boundary");
    boundary.append(
      element("strong", "", "Как читать: "),
      documentRoot.createTextNode("красным — поле пасует лишний раз, жёлтым — продолжает слишком широко.")
    );
    const layout = element("div", "vs3-error-layout");
    const side = element("aside", "vs3-error-side");
    side.append(createErrorDetail(entries), createErrorRanking(entries));
    layout.append(createErrorMatrix(entries), side);
    wrapper.append(head, createFilters("errors"), boundary, layout);
    errorsHost.replaceChildren(wrapper);
  }

  function render() {
    if (!host) return;
    if (!data?.meta || !data?.charts) {
      host.replaceChildren(element("p", "vs3-loading", "Данные не загрузились. Обнови страницу."));
      return;
    }
    const current = chart();
    if (!current) {
      host.replaceChildren(createFilters(), element("p", "vs3-loading", "В этом сочетании фильтров пока нет решений."));
      return;
    }
    const layout = element("div", "vs3-field-chart-layout");
    layout.append(createMatrix(current), createHandDetail(current));
    host.replaceChildren(createFilters(), createSummary(current), layout);
  }

  function renderAll() {
    render();
    renderErrors();
  }

  documentRoot.addEventListener("click", (event) => {
    const regViewLink = event.target.closest("[data-vs3-reg-view-link]");
    if (regViewLink) {
      setRegView(regViewLink.dataset.vs3RegViewLink);
      return;
    }
    const regView = event.target.closest("[data-vs3-reg-view]");
    if (regView) {
      setRegView(regView.dataset.vs3RegView);
      return;
    }
    const filter = event.target.closest("[data-vs3-field-filter]");
    if (filter) {
      const key = filter.dataset.vs3FieldFilter;
      const value = filter.dataset.vs3FieldValue;
      const context = filter.closest("[data-vs3-field-filter-context]")?.dataset.vs3FieldFilterContext || "";
      if (!filters[key]?.values.includes(value) || !filterValueAvailable(key, value)) return;
      state[key] = value;
      if (key === "position" && !relationAllowed(state.relation, value)) state.relation = value === "SB" ? "OOP" : "IP";
      renderAll();
      root.requestAnimationFrame(() => {
        documentRoot.querySelector(
          `[data-vs3-field-filter-context="${CSS.escape(context)}"] [data-vs3-field-filter="${CSS.escape(key)}"][data-vs3-field-value="${CSS.escape(value)}"]`
        )?.focus({ preventScroll: true });
      });
      return;
    }
    const hand = event.target.closest("[data-vs3-field-hand]");
    if (hand) {
      state.hand = hand.dataset.vs3FieldHand;
      render();
      return;
    }
    const errorHand = event.target.closest("[data-vs3-error-hand]");
    if (errorHand) {
      state.errorHand = errorHand.dataset.vs3ErrorHand;
      renderErrors();
      return;
    }
    const openChart = event.target.closest("[data-vs3-open-error-chart]");
    if (openChart) {
      root.FFVs3BetRangeExplorer?.setFilters?.({
        position: state.position,
        relation: state.relation,
        stack: state.stack,
        size: String(referenceSizeMultiplier()),
        cohort: "reference",
        hand: openChart.dataset.vs3OpenErrorChart
      });
      setRegView("target");
      if (typeof root.FFPokerFieldLesson?.showStep === "function") {
        root.FFPokerFieldLesson.showStep("field", { focusHeading: true });
      } else {
        documentRoot.querySelector('[data-step-target="field"]')?.click();
      }
    }
  });

  documentRoot.addEventListener("keydown", (event) => {
    const tab = event.target.closest("[data-vs3-reg-view]");
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const index = regViewTabs.indexOf(tab);
    if (index < 0) return;
    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + regViewTabs.length) % regViewTabs.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % regViewTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = regViewTabs.length - 1;
    event.preventDefault();
    setRegView(regViewTabs[nextIndex]?.dataset.vs3RegView, { focus: true });
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
      if (data.meta.hands.includes(next.errorHand)) state.errorHand = next.errorHand;
      renderAll();
      return { ...state };
    },
    showView(next, options = {}) {
      return setRegView(next, options);
    },
    refresh: renderAll,
    errorSummary() {
      const entries = errorEntries();
      return {
        filters: { ...state },
        referenceSize: referenceSizeMultiplier(),
        underdefense: rankedErrors(entries, "underdefense").map((entry) => ({ ...entry })),
        overdefense: rankedErrors(entries, "overdefense").map((entry) => ({ ...entry }))
      };
    }
  });
  root.FFVs3BetFieldErrorExplorer = root.FFVs3BetFieldExplorer;
  renderAll();
  setRegView(initialRegView(), { updateUrl: false });
})();
