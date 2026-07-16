(function () {
  "use strict";

  const root = window;
  const documentRoot = document;
  const model = root.FF_VS3BET_RANGE_MODEL;
  const lessonData = root.FF_POKER_FIELD_LESSON_DATA;
  const explorerHost = documentRoot.querySelector("[data-vs3-range-explorer]");
  const leaksHost = documentRoot.querySelector("[data-vs3-leaks]");
  const practiceFiltersHost = documentRoot.querySelector("[data-vs3-practice-filters]");
  const practiceScopeHost = documentRoot.querySelector("[data-vs3-practice-scope]");
  const practiceStartButton = documentRoot.querySelector("[data-practice-start]");

  const ACTIONS = [
    { key: "fold", label: "Пас", shortLabel: "F", tone: "is-fold", color: "var(--vs3-fold)" },
    { key: "call", label: "Колл", shortLabel: "C", tone: "is-call", color: "var(--vs3-call)" },
    { key: "fourbet", label: "4-бет", shortLabel: "4B", tone: "is-fourbet", color: "var(--vs3-fourbet)" },
    { key: "jam", label: "4-бет пуш", shortLabel: "AI", tone: "is-jam", color: "var(--vs3-jam)" }
  ];

  const FALLBACKS = {
    position: ["EP", "MP", "HJ", "CO", "BTN", "SB"],
    relation: ["IP", "OOP"],
    stack: ["20-30", "31-50", "51-80", "80+"],
    size: ["2.5", "3", "4"],
    cohort: ["reference", "league1", "league2", "league3", "novice"]
  };

  const LABELS = {
    position: { EP: "EP", MP: "MP", HJ: "HJ", CO: "CO", BTN: "BTN", SB: "SB" },
    relation: { IP: "В позиции", OOP: "Без позиции" },
    stack: {
      "20-30": "20–30 BB",
      "31-50": "31–50 BB",
      "51-80": "51–80 BB",
      "80+": "80+ BB"
    },
    size: { "2.5": "2,5x", "3": "3x", "4": "4x" },
    cohort: {
      reference: "Методичка",
      league1: "Лига 1",
      league2: "Лига 2",
      league3: "Лига 3",
      novice: "Новички"
    }
  };

  const FILTER_META = {
    position: { label: "Позиция Hero", preferred: "CO" },
    relation: { label: "Относительная позиция", preferred: "IP" },
    stack: { label: "Эффективный стек", preferred: "31-50" },
    size: { label: "Размер 3-бета", preferred: "3" },
    cohort: { label: "Слой стратегии", preferred: "reference" }
  };

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value instanceof Set) return Array.from(value);
    return [];
  }

  function element(tag, className, text) {
    const node = documentRoot.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = clean(text);
    return node;
  }

  function sourceEntries(source, fallback, labelGroup) {
    let rows = [];
    if (Array.isArray(source)) {
      rows = source;
    } else if (source && typeof source === "object") {
      rows = Object.entries(source).map(([key, value]) => {
        if (value && typeof value === "object") return { key, ...value };
        return { key, label: value };
      });
    }
    if (!rows.length) rows = fallback;
    return rows.map((row) => {
      const object = row && typeof row === "object" ? row : {};
      const rawValue = object.value ?? object.key ?? object.id ?? row;
      const key = clean(rawValue);
      const label = clean(LABELS[labelGroup]?.[key] || object.label || object.name || key);
      return { key, value: rawValue, label };
    }).filter((row) => row.key);
  }

  function modelSource(key) {
    if (!model) return null;
    if (key === "position") return model.positions;
    if (key === "relation") return model.relations;
    if (key === "stack") return model.stacks;
    if (key === "size") return model.sizes;
    return model.cohorts;
  }

  const filterOptions = Object.fromEntries(Object.keys(FILTER_META).map((key) => [
    key,
    sourceEntries(modelSource(key), FALLBACKS[key], key)
  ]));

  function preferredValue(key) {
    const options = filterOptions[key];
    const preferred = clean(FILTER_META[key].preferred);
    return options.find((option) => option.key === preferred)?.key || options[0]?.key || "";
  }

  function relationAllowed(relationKey, positionKey = state?.position) {
    if (positionKey === "BTN") return relationKey === "IP";
    if (positionKey === "SB") return relationKey === "OOP";
    return true;
  }

  const state = {
    position: preferredValue("position"),
    relation: preferredValue("relation"),
    stack: preferredValue("stack"),
    size: preferredValue("size"),
    cohort: preferredValue("cohort"),
    hand: "AQs"
  };

  function optionFor(key, selectedKey = state[key]) {
    return filterOptions[key].find((option) => option.key === clean(selectedKey)) || filterOptions[key][0] || null;
  }

  function filterPayload(overrides = {}) {
    return Object.fromEntries(Object.keys(FILTER_META).map((key) => {
      const selected = overrides[key] ?? state[key];
      const option = optionFor(key, selected);
      return [key, option?.value ?? selected];
    }));
  }

  function scenarioFor(cohortKey = state.cohort) {
    if (typeof model?.scenario !== "function") return { cells: {} };
    try {
      const scenario = model.scenario(filterPayload({ cohort: cohortKey }));
      return scenario && typeof scenario === "object" ? scenario : { cells: {} };
    } catch (error) {
      return { cells: {}, error };
    }
  }

  function ranks() {
    const values = asArray(model?.ranks).map(clean).filter(Boolean);
    return values.length === 13 ? values : ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  }

  function handAt(rowIndex, columnIndex) {
    const rankList = ranks();
    if (rowIndex === columnIndex) return `${rankList[rowIndex]}${rankList[columnIndex]}`;
    if (rowIndex < columnIndex) return `${rankList[rowIndex]}${rankList[columnIndex]}s`;
    return `${rankList[columnIndex]}${rankList[rowIndex]}o`;
  }

  function allHands() {
    const hands = [];
    const rankList = ranks();
    rankList.forEach((_, rowIndex) => {
      rankList.forEach((__, columnIndex) => hands.push(handAt(rowIndex, columnIndex)));
    });
    return hands;
  }

  function cellFrom(scenario, hand) {
    const cells = scenario?.cells;
    if (cells instanceof Map) return cells.get(hand) || null;
    return cells && typeof cells === "object" ? cells[hand] || null : null;
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  function rawActionValue(cell, key) {
    if (!cell || typeof cell !== "object") return 0;
    if (key === "fourbet") return cell.fourbet ?? cell.fourBet ?? cell["4bet"] ?? cell.raise ?? 0;
    if (key === "jam") return cell.jam ?? cell.push ?? cell.allin ?? cell.fourbetJam ?? cell.fourBetJam ?? 0;
    return cell[key] ?? 0;
  }

  function normalizeMix(cell) {
    const values = Object.fromEntries(ACTIONS.map((action) => [action.key, number(rawActionValue(cell, action.key))]));
    const total = ACTIONS.reduce((sum, action) => sum + values[action.key], 0);
    if (total <= 0) return { ...values, total: 0, missing: true };
    const factor = total <= 1.001 ? 100 : 100 / total;
    ACTIONS.forEach((action) => { values[action.key] *= factor; });
    return { ...values, total: 100, missing: false };
  }

  function formatPercent(value) {
    const rounded = Math.round(number(value) * 10) / 10;
    const digits = Math.abs(rounded - Math.round(rounded)) < .05 ? 0 : 1;
    return `${rounded.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: 1 })}%`;
  }

  function dominantAction(mix) {
    return ACTIONS.reduce((best, action) => mix[action.key] > mix[best.key] ? action : best, ACTIONS[0]);
  }

  function mixLabel(mix) {
    if (mix.missing) return "данные для руки не найдены";
    return ACTIONS.map((action) => `${action.label} ${formatPercent(mix[action.key])}`).join(", ");
  }

  function gradientFor(mix) {
    if (mix.missing) return "rgba(255, 255, 255, .02)";
    let cursor = 0;
    const stops = [];
    ACTIONS.forEach((action) => {
      const next = Math.min(100, cursor + mix[action.key]);
      if (next > cursor) stops.push(`${action.color} ${cursor.toFixed(2)}%`, `${action.color} ${next.toFixed(2)}%`);
      cursor = next;
    });
    return `linear-gradient(135deg, ${stops.join(", ")})`;
  }

  function createMixBar(mix, className) {
    const bar = element("span", className);
    bar.setAttribute("aria-hidden", "true");
    ACTIONS.forEach((action) => {
      const segment = element("i", `vs3-action-segment ${action.tone}`);
      segment.style.width = `${mix[action.key]}%`;
      bar.append(segment);
    });
    return bar;
  }

  let filterRenderId = 0;

  function createFilters(context) {
    filterRenderId += 1;
    const grid = element("div", "vs3-filter-grid");
    grid.dataset.vs3FilterContext = context;
    Object.entries(FILTER_META).forEach(([key, meta]) => {
      const group = element("div", "vs3-filter-group");
      group.dataset.filterKey = key;
      const labelText = context === "practice" && key === "cohort"
        ? "Слой сравнения · ответы не меняет"
        : meta.label;
      const label = element("span", "vs3-filter-label", labelText);
      label.id = `vs3-${context}-${key}-${filterRenderId}`;
      const controls = element("div", "vs3-filter-options");
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-labelledby", label.id);
      filterOptions[key].forEach((option) => {
        const button = element("button", "vs3-filter-button", option.label);
        button.type = "button";
        button.dataset.vs3Filter = key;
        button.dataset.vs3FilterValue = option.key;
        button.setAttribute("aria-pressed", String(state[key] === option.key));
        const unavailable = key === "relation" && !relationAllowed(option.key);
        button.disabled = unavailable;
        if (unavailable) button.setAttribute("aria-disabled", "true");
        controls.append(button);
      });
      group.append(label, controls);
      grid.append(group);
    });
    return grid;
  }

  function scenarioTitle() {
    return [
      optionFor("position")?.label,
      optionFor("relation")?.label,
      optionFor("stack")?.label,
      `3-бет ${optionFor("size")?.label}`
    ].filter(Boolean).join(" · ");
  }

  function createLegend() {
    const legend = element("div", "vs3-action-legend");
    legend.setAttribute("aria-label", "Цвета действий");
    ACTIONS.forEach((action) => {
      const item = element("span", `vs3-legend-item ${action.tone}`);
      item.append(element("i", ""), element("span", "", action.label));
      legend.append(item);
    });
    return legend;
  }

  function createMatrix(scenario) {
    const card = element("section", "vs3-matrix-card");
    const head = element("header", "vs3-matrix-head");
    const copy = element("div", "");
    copy.append(
      element("h4", "", `${optionFor("cohort")?.label || "Слой"} · 169 рук`),
      element("p", "vs3-scenario-copy", scenarioTitle())
    );
    head.append(copy, createLegend());

    const scroll = element("div", "vs3-matrix-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("aria-label", "Матрица 169 рук; на узких экранах прокручивается горизонтально");
    const grid = element("div", "vs3-range-grid");
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", `Чарт: ${scenarioTitle()}, ${optionFor("cohort")?.label || "учебная модель"}`);

    allHands().forEach((hand) => {
      const mix = normalizeMix(cellFrom(scenario, hand));
      const button = element("button", `vs3-range-cell ${dominantAction(mix).tone}`);
      button.type = "button";
      button.dataset.vs3Hand = hand;
      button.setAttribute("aria-pressed", String(hand === state.hand));
      button.setAttribute("aria-label", `${hand}: ${mixLabel(mix)}. Показать сравнение слоёв.`);
      button.style.setProperty("--vs3-cell-background", gradientFor(mix));
      button.append(element("strong", "", hand), createMixBar(mix, "vs3-cell-mix"));
      grid.append(button);
    });
    scroll.append(grid);
    card.append(head, scroll);
    return card;
  }

  function createLayerRow(cohortOption) {
    const scenario = scenarioFor(cohortOption.key);
    const mix = normalizeMix(cellFrom(scenario, state.hand));
    const row = element("article", `vs3-layer-row${cohortOption.key === state.cohort ? " is-current" : ""}`);
    const name = element("div", "vs3-layer-name");
    name.append(
      element("strong", "", cohortOption.label),
      element("span", "", cohortOption.key === state.cohort ? "слой матрицы" : "")
    );
    const numbers = element("div", "vs3-layer-numbers");
    ACTIONS.forEach((action) => {
      const item = element("span", `vs3-layer-number ${action.tone}`);
      item.append(element("b", "", formatPercent(mix[action.key])), element("span", "", action.shortLabel));
      numbers.append(item);
    });
    row.append(name, createMixBar(mix, "vs3-layer-mix"), numbers);
    row.setAttribute("aria-label", `${cohortOption.label}, ${state.hand}: ${mixLabel(mix)}`);
    return row;
  }

  function renderComparison() {
    const host = documentRoot.querySelector("[data-vs3-hand-comparison]");
    if (!host) return;
    host.replaceChildren();
    const head = element("header", "vs3-comparison-head");
    const copy = element("div", "");
    copy.append(
      element("h4", "", "Одна рука во всех слоях"),
      element("p", "vs3-comparison-copy", "Сравнение учебных частот при одинаковых фильтрах")
    );
    head.append(copy, element("strong", "vs3-hand-badge", state.hand));
    const list = element("div", "vs3-layer-list");
    filterOptions.cohort.forEach((cohort) => list.append(createLayerRow(cohort)));
    host.append(head, list);
  }

  function createExplorerFooter() {
    const footer = element("footer", "vs3-explorer-footer");
    const copy = element(
      "p",
      "",
      "Сначала запомни форму диапазона, затем проверяй конкретную руку. Слой лиги показывает учебную гипотезу различий, а не реальные частоты этой руки в hand history."
    );
    const button = element("button", "field-button is-primary", "Тренировать этот фильтр");
    button.type = "button";
    button.dataset.vs3PracticeCta = "";
    footer.append(copy, button);
    return footer;
  }

  function ensureSelectedHand(scenario) {
    if (cellFrom(scenario, state.hand)) return;
    state.hand = allHands().find((hand) => cellFrom(scenario, hand)) || allHands()[0];
  }

  function renderExplorer() {
    if (!explorerHost) return;
    if (!model || typeof model.scenario !== "function") {
      explorerHost.replaceChildren(element("p", "vs3-loading", "Учебная модель диапазонов не загрузилась. Обновите страницу."));
      return;
    }
    const scenario = scenarioFor();
    ensureSelectedHand(scenario);
    const head = element("header", "vs3-explorer-head");
    const title = element("div", "");
    title.append(
      element("p", "eyebrow", "Чарт под конкретный спот"),
      element("h3", "", "Где пас, колл, 4-бет и пуш")
    );
    const note = element("p", "vs3-model-note");
    note.append(
      element("strong", "", "Важно: "),
      documentRoot.createTextNode("раскладка рук по лигам — образовательная модель, откалиброванная по фактическим агрегатам. Это не фактический отчёт по каждой руке.")
    );
    head.append(title, note);

    const layout = element("div", "vs3-chart-layout");
    const comparison = element("aside", "vs3-hand-comparison");
    comparison.dataset.vs3HandComparison = "";
    comparison.setAttribute("aria-label", "Сравнение выбранной руки во всех слоях");
    layout.append(createMatrix(scenario), comparison);
    explorerHost.replaceChildren(head, createFilters("chart"), layout, createExplorerFooter());
    renderComparison();
  }

  function normalizeLeakType(value) {
    const text = clean(value).toLowerCase();
    if (/under|недо|too.?tight/.test(text)) return "underdefense";
    if (/over|лиш|wide/.test(text)) return "overdefense";
    return "underdefense";
  }

  function normalizeHands(value) {
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    return rows.map((row) => clean(row?.hand || row?.label || row)).filter(Boolean);
  }

  function leakComparison(cohortKey) {
    if (typeof model?.leaks?.compare !== "function") return null;
    try {
      return model.leaks.compare({ ...filterPayload({ cohort: cohortKey }), threshold: 1 });
    } catch (error) {
      return null;
    }
  }

  function leakRule(key) {
    if (key === "underdefend") return "Не сдавай пограничную руку до проверки позиции, цены колла и остаточного SPR.";
    if (key === "overdefend") return "Красивый вид руки не компенсирует плохую цену или слабую реализацию.";
    if (key === "missedAggression") return "Проверь верх диапазона и блокеры: часть продолжений должна защищать 4-бет.";
    return "Пуш — отдельная форма 4-бета: глубина должна оправдывать немедленный стек-офф.";
  }

  function exactLeakCards() {
    const primaryKey = state.cohort === "reference" ? "novice" : state.cohort;
    const primary = leakComparison(primaryKey);
    if (!primary) return [];
    const comparisons = new Map([[primaryKey, primary]]);
    const comparison = (cohortKey) => {
      if (!comparisons.has(cohortKey)) comparisons.set(cohortKey, leakComparison(cohortKey));
      return comparisons.get(cohortKey);
    };
    const requests = [
      { key: "underdefend", fallback: "novice", type: "underdefense" },
      { key: "overdefend", fallback: "league1", type: "overdefense" },
      { key: "missedAggression", fallback: "novice", type: "underdefense" },
      { key: "overjam", fallback: "league1", type: "overdefense" }
    ];

    return requests.map((request) => {
      let sourceKey = primaryKey;
      let source = primary;
      if (!asArray(source?.groups?.[request.key]).length) {
        sourceKey = request.fallback;
        source = comparison(sourceKey);
      }
      const entries = asArray(source?.groups?.[request.key]).slice(0, 6);
      if (!entries.length) return null;
      const definition = asArray(source.definitions).find((item) => clean(item?.key) === request.key) || {};
      const cohortLabel = optionFor("cohort", sourceKey)?.label || sourceKey;
      const maximum = Math.max(...entries.map((entry) => number(entry?.magnitude)));
      return {
        type: request.type,
        title: definition.label || request.key,
        copy: `${definition.description || "Граница отличается от методички."} Сравнение «${cohortLabel}» с референсом при текущих фильтрах.`,
        rule: leakRule(request.key),
        metric: `Максимальное отклонение среди примеров: ${formatPercent(maximum)}.`,
        entries,
        hands: entries.map((entry) => entry.hand)
      };
    }).filter(Boolean);
  }

  function derivedLeaks() {
    const reference = scenarioFor("reference");
    const novice = scenarioFor("novice");
    const differences = allHands().map((hand) => {
      const referenceMix = normalizeMix(cellFrom(reference, hand));
      const noviceMix = normalizeMix(cellFrom(novice, hand));
      const referenceDefense = 100 - referenceMix.fold;
      const noviceDefense = 100 - noviceMix.fold;
      return { hand, delta: noviceDefense - referenceDefense };
    });
    const overHands = differences.slice().sort((a, b) => b.delta - a.delta).filter((item) => item.delta > .4).slice(0, 6).map((item) => item.hand);
    const underHands = differences.slice().sort((a, b) => a.delta - b.delta).filter((item) => item.delta < -.4).slice(0, 6).map((item) => item.hand);
    return [
      {
        type: "underdefense",
        title: "Слишком ранний пас",
        hands: underHands,
        copy: "Эти руки в слое новичков чаще уходят в пас, хотя учебная опора ещё сохраняет продолжение.",
        rule: "Проверь цену колла и реализацию, прежде чем автоматически выбрасывать пограничную руку."
      },
      {
        type: "overdefense",
        title: "Красивые руки без цены",
        hands: overHands,
        copy: "Эти руки в слое новичков чаще продолжают лишний раз, когда сайз и глубина уже ухудшают их реализацию.",
        rule: "Одномастность и связность не отменяют большой 3-бет и низкий остаточный SPR."
      }
    ];
  }

  function createLeakCard(rawLeak) {
    const leak = rawLeak && typeof rawLeak === "object" ? rawLeak : {};
    const type = normalizeLeakType(leak.type || leak.key || leak.kind);
    const under = type === "underdefense";
    const title = clean(leak.title || (under ? "Слишком ранний пас" : "Лишнее продолжение"));
    const copy = clean(leak.copy || leak.description || leak.why || (under
      ? "Рука ещё входит в учебную защиту, но слишком часто превращается в автоматический пас."
      : "Рука выглядит привлекательно, но цена продолжения уже делает защиту лишней."));
    const rule = clean(leak.rule || leak.takeaway || leak.lesson || (under
      ? "Не сдавай весь низ диапазона одним движением: найди руки, которые сохраняют реализацию."
      : "Не защищай только потому, что рука одномастная или связная."));
    const entries = asArray(leak.entries);
    const hands = normalizeHands(leak.hands || leak.examples || leak.hand);

    const card = element("article", `vs3-leak-card panel is-${type}`);
    const head = element("header", "vs3-leak-head");
    head.append(
      element("h3", "", title),
      element("span", "vs3-leak-tag", under ? "Недозащита" : "Лишняя защита")
    );
    const handList = element("div", "vs3-leak-hands");
    handList.setAttribute("aria-label", "Примеры рук");
    hands.forEach((hand, index) => {
      const button = element("button", "vs3-leak-hand", hand);
      button.type = "button";
      button.dataset.vs3LeakHand = hand;
      const magnitude = number(entries[index]?.magnitude);
      button.setAttribute("aria-label", magnitude
        ? `Открыть ${hand} в чарте; отклонение ${formatPercent(magnitude)}`
        : `Открыть ${hand} в чарте`);
      handList.append(button);
    });
    if (!hands.length) handList.append(element("span", "vs3-leak-hand", "граница"));
    card.append(head, handList, element("p", "vs3-leak-copy", copy));
    if (clean(leak.metric)) card.append(element("p", "vs3-leak-metric", leak.metric));
    card.append(element("p", "vs3-leak-rule", rule));
    return card;
  }

  function renderLeaks() {
    if (!leaksHost) return;
    if (!model) {
      leaksHost.replaceChildren(element("article", "panel vs3-loading", "Примеры ошибок недоступны: модель диапазонов не загрузилась."));
      return;
    }
    let directLeaks = [];
    if (typeof model.leaks === "function") {
      try {
        directLeaks = asArray(model.leaks(filterPayload()));
      } catch (error) {
        directLeaks = [];
      }
    }
    const leaks = directLeaks.length ? directLeaks : exactLeakCards();
    const rows = leaks.length ? leaks : derivedLeaks();
    leaksHost.replaceChildren(...rows.slice(0, 6).map(createLeakCard));
  }

  function practiceIds() {
    if (typeof model?.practiceSpotIds !== "function") return [];
    try {
      return asArray(model.practiceSpotIds(filterPayload())).map(clean).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function pluralHands(count) {
    const mod100 = count % 100;
    const mod10 = count % 10;
    if (mod100 >= 11 && mod100 <= 14) return "раздач";
    if (mod10 === 1) return "раздача";
    if (mod10 >= 2 && mod10 <= 4) return "раздачи";
    return "раздач";
  }

  function syncPracticeQueue() {
    if (!lessonData || typeof lessonData !== "object") return [];
    const catalog = asArray(lessonData.practice);
    const catalogIds = new Set(catalog.map((spot) => clean(spot?.id)).filter(Boolean));
    const ids = practiceIds().filter((id, index, rows) => catalogIds.has(id) && rows.indexOf(id) === index);
    if (!Array.isArray(lessonData.practiceModes) || !lessonData.practiceModes.length) {
      lessonData.practiceModes = [{
        key: "filtered",
        label: "Текущий фильтр",
        description: "",
        reference: "",
        spotIds: ids
      }];
    }
    const mode = lessonData.practiceModes[0];
    mode.spotIds = ids;
    mode.label = "Текущий фильтр";
    mode.description = scenarioTitle();
    mode.reference = "Ответы всегда следуют слою «Методичка»; лиги и новички нужны только для сравнения диапазонов и ошибок.";
    return ids;
  }

  function renderPracticeSetup() {
    const ids = syncPracticeQueue();
    if (practiceFiltersHost) practiceFiltersHost.replaceChildren(createFilters("practice"));
    if (practiceScopeHost) {
      practiceScopeHost.textContent = ids.length
        ? `${ids.length} ${pluralHands(ids.length)} · ${scenarioTitle()} · ответы: Методичка`
        : `Нет раздач под фильтр · ${scenarioTitle()}`;
    }
    if (practiceStartButton) {
      practiceStartButton.disabled = !ids.length;
      practiceStartButton.textContent = ids.length ? `Начать: ${ids.length} ${pluralHands(ids.length)}` : "Нет раздач под фильтр";
    }
  }

  function renderAll() {
    renderExplorer();
    renderLeaks();
    renderPracticeSetup();
  }

  function setFilter(key, value, focusContext) {
    if (!FILTER_META[key] || !filterOptions[key].some((option) => option.key === value)) return;
    state[key] = value;
    if (key === "position" && !relationAllowed(state.relation, value)) {
      state.relation = value === "SB" ? "OOP" : "IP";
    }
    renderAll();
    if (focusContext) {
      root.requestAnimationFrame(() => {
        documentRoot.querySelector(
          `[data-vs3-filter-context="${focusContext}"] [data-vs3-filter="${key}"][data-vs3-filter-value="${CSS.escape(value)}"]`
        )?.focus({ preventScroll: true });
      });
    }
  }

  function showStep(step) {
    if (typeof root.FFPokerFieldLesson?.showStep === "function") {
      root.FFPokerFieldLesson.showStep(step, { focusHeading: true });
      return;
    }
    documentRoot.querySelector(`[data-step-target="${step}"]`)?.click();
  }

  documentRoot.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-vs3-filter]");
    if (filterButton) {
      const context = filterButton.closest("[data-vs3-filter-context]")?.dataset.vs3FilterContext || "";
      setFilter(clean(filterButton.dataset.vs3Filter), clean(filterButton.dataset.vs3FilterValue), context);
      return;
    }

    const handButton = event.target.closest("[data-vs3-hand]");
    if (handButton) {
      state.hand = clean(handButton.dataset.vs3Hand);
      documentRoot.querySelectorAll("[data-vs3-hand]").forEach((button) => {
        button.setAttribute("aria-pressed", String(clean(button.dataset.vs3Hand) === state.hand));
      });
      renderComparison();
      return;
    }

    const leakHand = event.target.closest("[data-vs3-leak-hand]");
    if (leakHand) {
      state.hand = clean(leakHand.dataset.vs3LeakHand);
      renderExplorer();
      showStep("field");
      return;
    }

    if (event.target.closest("[data-vs3-practice-cta]")) {
      syncPracticeQueue();
      showStep("practice");
    }
  });

  root.FFVs3BetRangeExplorer = Object.freeze({
    schemaVersion: 1,
    filters: () => ({ ...state }),
    setFilters(next = {}) {
      Object.keys(FILTER_META).forEach((key) => {
        const value = clean(next[key]);
        if (filterOptions[key].some((option) => option.key === value)) state[key] = value;
      });
      if (!relationAllowed(state.relation, state.position)) {
        state.relation = state.position === "SB" ? "OOP" : "IP";
      }
      if (clean(next.hand)) state.hand = clean(next.hand);
      renderAll();
      return { ...state };
    },
    refresh: renderAll
  });

  renderAll();
})();
