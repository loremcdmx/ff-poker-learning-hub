(function () {
  "use strict";

  const root = window;
  const documentRoot = document;
  const model = root.FF_VS3BET_RANGE_MODEL;
  const lessonData = root.FF_POKER_FIELD_LESSON_DATA;
  const fieldData = root.FF_VS3BET_FIELD_DATA;
  const rfiData = root.PokerRfiData;
  const targetOverviewHost = documentRoot.querySelector("[data-vs3-target-overview]");
  const explorerHost = documentRoot.querySelector("[data-vs3-range-explorer]");
  const leaksHost = documentRoot.querySelector("[data-vs3-leaks]");
  const practiceFiltersHost = documentRoot.querySelector("[data-vs3-practice-filters]");
  const practiceScopeHost = documentRoot.querySelector("[data-vs3-practice-scope]");
  const practiceStartButton = documentRoot.querySelector("[data-practice-start]");
  const practiceExpectedHost = documentRoot.querySelector("[data-vs3-practice-expected]");

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
      reference: "Наша стратегия",
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
    cohort: { label: "Сравнить с", preferred: "reference" }
  };

  const FIELD_SIZE_BUCKETS = Object.freeze({
    "2.5": "<6",
    "3": "6-8",
    "4": "8-10"
  });

  const FIELD_COHORTS = Object.freeze([
    { key: "league1", label: "Лига 1", ranks: "R1–5" },
    { key: "league2", label: "Лига 2", ranks: "R6–10" },
    { key: "league3", label: "Лига 3", ranks: "R11–14" },
    { key: "novice", label: "Новички", ranks: "R15–18" }
  ]);

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

  const practiceState = {
    scope: "all",
    position: "",
    stack: "",
    size: "",
    detailsOpen: false
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

  function openFrequencyFor(hand, position = state.position) {
    const value = rfiData?.sourceFrequencies?.[position]?.[hand];
    if (value === undefined || value === null || value === "") return null;
    const frequency = Number(value);
    return Number.isFinite(frequency) ? Math.max(0, Math.min(100, frequency)) : null;
  }

  function visualOpenFill(frequency) {
    if (frequency === null) return 100;
    return Math.max(10, Math.min(100, frequency));
  }

  function openFrequencyLabel(hand, position = state.position) {
    const frequency = openFrequencyFor(hand, position);
    if (frequency === null) return `Для ${position} частота опена по рукам не опубликована`;
    const floorNote = frequency < 10
      ? "; на матрице сохранена минимальная полоса 10% для читаемости"
      : "";
    return `Из ${position} открываем ${hand} в ${formatPercent(frequency)} случаев${floorNote}`;
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
    return `linear-gradient(90deg, ${stops.join(", ")})`;
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
      if (key === "cohort" && ["chart", "practice"].includes(context)) return;
      const group = element("div", "vs3-filter-group");
      group.dataset.filterKey = key;
      const labelText = context === "practice" && key === "cohort"
        ? "Сравнение · ответы не меняет"
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

  function comboWeight(hand) {
    if (clean(hand).length === 2) return 6;
    return clean(hand).endsWith("s") ? 4 : 12;
  }

  function normalizeActionTotals(values) {
    const totals = Object.fromEntries(ACTIONS.map((action) => [action.key, number(values?.[action.key])]));
    const total = ACTIONS.reduce((sum, action) => sum + totals[action.key], 0);
    if (total <= 0) return { fold: 100, call: 0, fourbet: 0, jam: 0 };
    ACTIONS.forEach((action) => { totals[action.key] = totals[action.key] * 100 / total; });
    return totals;
  }

  function roundedActionTotals(values) {
    const normalized = normalizeActionTotals(values);
    const rows = ACTIONS.map((action, index) => {
      const exact = normalized[action.key] * 10;
      return { key: action.key, index, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let missing = 1000 - rows.reduce((sum, row) => sum + row.value, 0);
    rows.slice().sort((a, b) => b.remainder - a.remainder || a.index - b.index).forEach((row) => {
      if (missing <= 0) return;
      rows[row.index].value += 1;
      missing -= 1;
    });
    return Object.fromEntries(rows.map((row) => [row.key, row.value / 10]));
  }

  function relationForPosition(position) {
    return position === "SB" ? "OOP" : "IP";
  }

  function referenceScenario(position) {
    if (typeof model?.scenario !== "function") return null;
    try {
      return model.scenario({
        position,
        relation: relationForPosition(position),
        stack: state.stack,
        size: Number(state.size),
        cohort: "reference"
      });
    } catch (error) {
      return null;
    }
  }

  function exactOpenWeightedTarget(position, scenario) {
    const frequencies = rfiData?.sourceFrequencies?.[position];
    if (!frequencies || !scenario) return null;
    const totals = Object.fromEntries(ACTIONS.map((action) => [action.key, 0]));
    let denominator = 0;
    asArray(model?.hands).forEach((hand) => {
      const openFrequency = number(frequencies[hand]) / 100;
      if (!openFrequency) return;
      const weight = comboWeight(hand) * openFrequency;
      const mix = normalizeMix(cellFrom(scenario, hand));
      denominator += weight;
      ACTIONS.forEach((action) => { totals[action.key] += weight * mix[action.key]; });
    });
    if (!denominator) return null;
    ACTIONS.forEach((action) => { totals[action.key] /= denominator; });
    return { mix: normalizeActionTotals(totals), source: "Опен и защита после 3-бета" };
  }

  function sbMethodicTarget(position, scenario) {
    if (!scenario || typeof model?.baseline !== "function") return null;
    let baseline;
    try {
      baseline = model.baseline(position);
    } catch (error) {
      return null;
    }
    const target = baseline?.summaryTarget;
    const baseMix = baseline?.summary?.comboWeighted;
    const scenarioMix = scenario?.summary?.comboWeighted;
    if (!target || !baseMix || !scenarioMix) return null;
    const targetContinue = Math.max(0.001, 100 - number(target.fold));
    const matrixContinue = Math.max(0.001, 100 - number(baseMix.fold));
    const impliedOpenCombos = 1326 * matrixContinue / targetContinue;
    const scenarioScale = 1326 / impliedOpenCombos;
    const totals = {
      call: number(target.call) + (number(scenarioMix.call) - number(baseMix.call)) * scenarioScale,
      fourbet: number(target.fourbet) + (number(scenarioMix.fourbet) - number(baseMix.fourbet)) * scenarioScale,
      jam: number(target.jam) + (number(scenarioMix.jam) - number(baseMix.jam)) * scenarioScale
    };
    totals.fold = Math.max(0, 100 - totals.call - totals.fourbet - totals.jam);
    return { mix: normalizeActionTotals(totals), source: "Методика SB против BB" };
  }

  function threeBetEconomics() {
    const openBb = 2;
    const bbPosted = 1;
    const potBeforeThreeBet = 4.5;
    const multiplier = Number(state.size) || 3;
    const raiseToBb = openBb * multiplier;
    const riskBb = raiseToBb - bbPosted;
    const threshold = riskBb / (riskBb + potBeforeThreeBet) * 100;
    const safetyMargin = 2.5;
    const targetFoldCap = Math.max(0, threshold - safetyMargin);
    const targetFoldRate = targetFoldCap / 100;
    const targetBluffEv = targetFoldRate * potBeforeThreeBet - (1 - targetFoldRate) * riskBb;
    const pressureFold = Math.min(95, threshold + 5);
    const pressureRate = pressureFold / 100;
    const pressureBluffEv = pressureRate * potBeforeThreeBet - (1 - pressureRate) * riskBb;
    return {
      openBb,
      bbPosted,
      potBeforeThreeBet,
      multiplier,
      raiseToBb,
      riskBb,
      threshold,
      safetyMargin,
      targetFoldCap,
      targetBluffEv,
      pressureFold,
      pressureBluffEv
    };
  }

  function targetForPosition(position) {
    const scenario = referenceScenario(position);
    const weighted = exactOpenWeightedTarget(position, scenario) || sbMethodicTarget(position, scenario);
    const raw = normalizeActionTotals(weighted?.mix);
    const economics = threeBetEconomics();
    let safe = raw;
    let capped = false;
    if (raw.fold > economics.targetFoldCap) {
      const rawContinue = Math.max(0.001, 100 - raw.fold);
      const targetContinue = 100 - economics.targetFoldCap;
      const factor = targetContinue / rawContinue;
      safe = {
        fold: economics.targetFoldCap,
        call: raw.call * factor,
        fourbet: raw.fourbet * factor,
        jam: raw.jam * factor
      };
      capped = true;
    }
    const displayMix = roundedActionTotals(safe);
    if (capped) {
      const displayedCap = Math.floor(economics.targetFoldCap * 10) / 10;
      const overflow = Math.max(0, displayMix.fold - displayedCap);
      if (overflow > 0) {
        displayMix.fold = displayedCap;
        displayMix.call = Math.round((displayMix.call + overflow) * 10) / 10;
      }
    }
    return {
      position,
      relation: relationForPosition(position),
      source: weighted?.source || "Наша рекомендация",
      raw: roundedActionTotals(raw),
      mix: displayMix,
      capped
    };
  }

  function createTargetControls() {
    const controls = element("div", "vs3-target-controls");
    controls.dataset.vs3FilterContext = "target";
    ["stack", "size"].forEach((key) => {
      const group = element("div", "vs3-target-control-group");
      group.dataset.filterKey = key;
      const label = element("span", "vs3-filter-label", FILTER_META[key].label);
      const options = element("div", "vs3-filter-options");
      options.setAttribute("role", "group");
      options.setAttribute("aria-label", FILTER_META[key].label);
      filterOptions[key].forEach((option) => {
        const button = element("button", "vs3-filter-button", option.label);
        button.type = "button";
        button.dataset.vs3Filter = key;
        button.dataset.vs3FilterValue = option.key;
        button.setAttribute("aria-pressed", String(state[key] === option.key));
        options.append(button);
      });
      group.append(label, options);
      controls.append(group);
    });
    return controls;
  }

  function createTargetAction(action, value) {
    const card = element("div", `vs3-target-action ${action.tone}`);
    card.dataset.vs3TargetAction = action.key;
    card.dataset.value = String(value);
    card.append(
      element("span", "vs3-target-action-label", action.label),
      element("strong", "", formatPercent(value))
    );
    return card;
  }

  function createTargetRow(target) {
    const row = element("article", "vs3-target-row");
    row.dataset.vs3TargetPosition = target.position;
    const heading = element("header", "vs3-target-position");
    heading.append(
      element("strong", "", target.position),
      element("span", "", target.relation === "IP" ? "против BB · в позиции" : "SB против BB · без позиции"),
      element("small", "", target.source)
    );
    const actions = element("div", "vs3-target-actions");
    ACTIONS.forEach((action) => actions.append(createTargetAction(action, target.mix[action.key])));
    const mix = { ...target.mix, missing: false };
    row.append(heading, actions, createMixBar(mix, "vs3-target-mix"));
    row.setAttribute("aria-label", `${target.position}: ${mixLabel(mix)}`);
    return row;
  }

  function formatBb(value, options = {}) {
    const numeric = Number(value) || 0;
    const prefix = options.signed && numeric > 0 ? "+" : "";
    const rounded = Math.round(numeric * 100) / 100;
    const minimumFractionDigits = Number.isInteger(rounded) ? 0 : 1;
    return `${prefix}${rounded.toLocaleString("ru-RU", { minimumFractionDigits, maximumFractionDigits: 2 })} BB`;
  }

  function createEconomicsProof(economics) {
    const proof = element("section", "vs3-target-proof");
    const redline = element("article", "vs3-redline-card");
    const threshold = formatPercent(economics.threshold);
    const pressureFold = formatPercent(economics.pressureFold);
    redline.append(
      element("p", "eyebrow", "Красная линия · BB закрывает экшен"),
      element("h4", "", `Автоприбыль начинается выше ${threshold}`),
      element("p", "vs3-redline-formula", `${formatBb(economics.riskBb)} ÷ (${formatBb(economics.riskBb)} + ${formatBb(economics.potBeforeThreeBet)}) = ${threshold}`),
      element("p", "", `BB 3-бетит open ${formatBb(economics.openBb)} до ${formatBb(economics.raiseToBb)} и рискует ещё ${formatBb(economics.riskBb)} ради банка ${formatBb(economics.potBeforeThreeBet)}. Если мы пасуем чаще ${threshold}, даже нулевой блеф уже плюсует сразу.`)
    );
    const warning = element("div", "vs3-redline-warning");
    warning.append(
      element("span", "", `При фолде ${pressureFold}`),
      element("strong", "", `${formatBb(economics.pressureBluffEv, { signed: true })} на чистом блефе`),
      element("p", "", "Регулярам выгодно расширять 3-бет, а пограничные опены первыми теряют прибыльность.")
    );
    redline.append(warning);

    const reasons = element("div", "vs3-target-reasons");
    const targetCard = element("article", "vs3-target-reason is-fold");
    targetCard.append(
      element("span", "", "Пас · с запасом"),
      element("strong", "", `не выше ${formatPercent(economics.targetFoldCap)}`),
      element("p", "", `Запас ${formatPercent(economics.safetyMargin)} ниже красной линии оставляет чистому блефу ${formatBb(economics.targetBluffEv)} ещё до учёта эквити.`)
    );
    const callCard = element("article", "vs3-target-reason is-call");
    callCard.append(
      element("span", "", "Колл"),
      element("strong", "", "реализует эквити"),
      element("p", "", "Позиция и цена сохраняют EV рук, которые слишком сильны для паса, но не хотят разгонять банк.")
    );
    const aggressionCard = element("article", "vs3-target-reason is-fourbet");
    aggressionCard.append(
      element("span", "", "4-бет и пуш"),
      element("strong", "", "наказывают давление"),
      element("p", "", "Велью добирает, а лучшие блефы забирают мёртвые деньги и не дают BB безнаказанно расширяться.")
    );
    reasons.append(targetCard, callCard, aggressionCard);
    proof.append(redline, reasons);

    const note = element("p", "vs3-target-caveat");
    note.append(
      element("strong", "", "Граница расчёта: "),
      documentRoot.createTextNode("Опен 2 BB, BB ante 1 BB, BB закрывает экшен. Это красная линия для частоты паса, а не требование продолжать любую руку.")
    );
    proof.append(note);
    return proof;
  }

  function renderTargetOverview() {
    if (!targetOverviewHost) return;
    if (!model || typeof model.scenario !== "function") {
      targetOverviewHost.replaceChildren(element("p", "vs3-loading", "Чарт временно недоступен. Обнови страницу."));
      return;
    }
    const economics = threeBetEconomics();
    const head = element("header", "vs3-target-head");
    const copy = element("div", "");
    copy.append(
      element("p", "eyebrow", "Наша цель · опен 2 BB против 3-бета BB"),
      element("h3", "", "Защищай опен там, где это приносит больше EV")
    );
    const context = element("p", "vs3-target-context", `${optionFor("stack")?.label} · 3-бет ${optionFor("size")?.label} до ${formatBb(economics.raiseToBb)}`);
    head.append(copy, context);

    const intro = element("div", "vs3-target-intro");
    intro.append(
      element("p", "", "Ниже — минимальная контрольная цель по каждому открытому диапазону. Форма колла, 4-бета и пуша берётся из наших чартов; фолд ограничен экономической красной линией."),
      element("p", "", "EP–BTN учитывают, как часто мы открываем каждую руку. Для SB показан отдельный расчёт защиты против 3-бета BB.")
    );

    const table = element("section", "vs3-target-table");
    const tableHead = element("div", "vs3-target-table-head");
    tableHead.append(element("span", "", "Позиция"));
    ACTIONS.forEach((action) => tableHead.append(element("span", action.tone, action.key === "fold" ? "Пас · главный" : action.label)));
    table.append(tableHead);
    asArray(model.positions).forEach((position) => table.append(createTargetRow(targetForPosition(position))));
    targetOverviewHost.replaceChildren(head, intro, createTargetControls(), table, createEconomicsProof(economics));
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
    const card = element("section", "vs3-matrix-card ff-chart-panel");
    const head = element("header", "vs3-matrix-head ff-chart-head");
    const copy = element("div", "");
    copy.append(
      element("h4", "", "Наша стратегия · 169 рук"),
      element("p", "vs3-scenario-copy", scenarioTitle()),
      element(
        "p",
        "vs3-open-weight-note",
        rfiData?.sourceFrequencies?.[state.position]
          ? "Высота — как часто открываем руку. Цвета внутри — пас, колл, 4-бет и пуш."
          : "Для SB показаны частоты паса, колла, 4-бета и пуша."
      )
    );
    head.append(copy, createLegend());

    const scroll = element("div", "vs3-matrix-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("aria-label", "Матрица 169 рук; на узких экранах прокручивается горизонтально");
    const grid = element("div", "vs3-range-grid ff-range-grid");
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", `Наша стратегия: ${scenarioTitle()}`);

    allHands().forEach((hand) => {
      const mix = normalizeMix(cellFrom(scenario, hand));
      const openFrequency = openFrequencyFor(hand);
      const unavailableClass = openFrequency === null ? " is-open-weight-unavailable" : "";
      const zeroClass = openFrequency !== null && openFrequency <= 0 ? " is-open-weight-zero" : "";
      const button = element("button", `vs3-range-cell ff-range-cell ${mix.missing ? "is-missing" : dominantAction(mix).tone}${unavailableClass}${zeroClass}`);
      button.type = "button";
      button.disabled = mix.missing;
      button.dataset.vs3Hand = hand;
      button.dataset.vs3OpenFrequency = openFrequency === null ? "unavailable" : String(openFrequency);
      button.dataset.vs3ActionSignature = ACTIONS.map((action) => `${action.key}:${mix[action.key].toFixed(2)}`).join("|");
      button.setAttribute("aria-pressed", String(hand === state.hand));
      button.setAttribute("aria-label", `${hand}: ${openFrequencyLabel(hand)}. После полученного 3-бета: ${mixLabel(mix)}. Сравнить нашу стратегию с реальным полем.`);
      button.style.setProperty("--vs3-open-fill", `${visualOpenFill(openFrequency)}%`);
      button.style.setProperty("--vs3-mix-background", gradientFor(mix));
      const fill = element("span", "vs3-open-weight-fill");
      fill.setAttribute("aria-hidden", "true");
      button.append(fill, element("strong", "", hand), createMixBar(mix, "vs3-cell-mix"));
      grid.append(button);
    });
    scroll.append(grid);
    card.append(head, scroll);
    return card;
  }

  function fieldSizeBucket() {
    return FIELD_SIZE_BUCKETS[state.size] || "all";
  }

  function fieldSizeLabel() {
    const bucket = fieldSizeBucket();
    return bucket === "<6" ? "до 6 BB" : `${bucket.replace("-", "–")} BB`;
  }

  function fieldHandIndex(hand = state.hand) {
    return asArray(fieldData?.meta?.hands).findIndex((candidate) => clean(candidate) === clean(hand));
  }

  function measuredFieldRow(cohort) {
    const bucket = fieldSizeBucket();
    const key = [cohort.key, state.position, state.relation, state.stack, bucket].join("|");
    const chart = fieldData?.charts?.[key];
    const handIndex = fieldHandIndex();
    const exact = handIndex >= 0 ? chart?.cells?.[handIndex] : null;
    let mix = normalizeMix(null);
    let sample = "";
    let confidence = "missing";
    let n = 0;

    if (Array.isArray(exact) && number(exact[0]) > 0) {
      [n] = exact;
      mix = normalizeMix({ fold: exact[1], call: exact[2], fourbet: exact[3], jam: exact[4] });
      confidence = n >= number(fieldData?.meta?.sampleThresholds?.strongAtLeast || 200) ? "strong" : "exact";
    }

    return { ...cohort, key, mix, sample, confidence, n, measured: true };
  }

  function comparisonRows() {
    const referenceMix = normalizeMix(cellFrom(scenarioFor("reference"), state.hand));
    return [
      {
        key: "reference",
        label: "Наша стратегия",
        ranks: "база",
        sample: "",
        confidence: "reference",
        measured: false,
        mix: referenceMix
      },
      ...FIELD_COHORTS.map(measuredFieldRow)
    ];
  }

  function signedPercentagePoints(value) {
    const numeric = Math.round(Number(value || 0) * 10) / 10;
    if (Math.abs(numeric) < .05) return "0 п.п.";
    const sign = numeric > 0 ? "+" : "−";
    return `${sign}${formatPercent(Math.abs(numeric)).replace("%", " п.п.")}`;
  }

  function comparisonSummary(rows) {
    const measured = rows.filter((row) => row.measured && !row.mix.missing);
    if (measured.length < 2) return "Для выбранного спота пока нет сравнимых групп поля.";
    const spreads = ACTIONS.map((action) => {
      const sorted = measured.slice().sort((a, b) => a.mix[action.key] - b.mix[action.key]);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      return { action, first, last, spread: last.mix[action.key] - first.mix[action.key] };
    }).sort((a, b) => b.spread - a.spread);
    const widest = spreads[0];
    if (!widest || widest.spread < 2) {
      return `Лиги здесь играют похоже: максимальная разница ${formatPercent(widest?.spread || 0).replace("%", " п.п.")}.`;
    }
    return `Главное различие — ${widest.action.label.toLowerCase()}: ${widest.first.label} ${formatPercent(widest.first.mix[widest.action.key])} → ${widest.last.label} ${formatPercent(widest.last.mix[widest.action.key])} (${formatPercent(widest.spread).replace("%", " п.п.")}).`;
  }

  function createComparisonTable(rows) {
    const table = element("table", "vs3-comparison-table");
    const head = element("thead", "");
    const headRow = element("tr", "");
    ["Группа", "Пас · разница", "Колл", "4-бет", "Пуш"].forEach((label, index) => {
      const cell = element("th", index === 1 ? "is-primary" : "", label);
      cell.scope = "col";
      headRow.append(cell);
    });
    head.append(headRow);

    const body = element("tbody", "");
    const reference = rows[0];
    rows.forEach((row) => {
      const tr = element("tr", `vs3-comparison-row is-${row.confidence}`);
      tr.dataset.vs3ComparisonRow = row.key;
      const name = element("th", "vs3-comparison-layer");
      name.scope = "row";
      name.append(
        element("strong", "", row.label),
        element("span", "", row.sample ? `${row.ranks} · ${row.sample}` : row.ranks)
      );
      tr.append(name);

      ACTIONS.forEach((action, index) => {
        const cell = element("td", `${action.tone}${index === 0 ? " is-primary" : ""}`);
        cell.dataset.label = action.label;
        if (row.mix.missing) {
          cell.append(element("strong", "", "—"));
        } else {
          cell.append(element("strong", "", formatPercent(row.mix[action.key])));
          if (index === 0) {
            const delta = row.measured ? row.mix.fold - reference.mix.fold : 0;
            const deltaNode = element("span", `vs3-comparison-delta ${delta > .05 ? "is-more" : delta < -.05 ? "is-less" : "is-even"}`, row.measured ? signedPercentagePoints(delta) : "—");
            cell.append(deltaNode);
          }
        }
        tr.append(cell);
      });
      tr.setAttribute("aria-label", `${row.label}, ${state.hand}: ${mixLabel(row.mix)}; ${row.sample}`);
      body.append(tr);
    });
    table.append(head, body);
    return table;
  }

  function renderComparison() {
    const host = documentRoot.querySelector("[data-vs3-hand-comparison]");
    if (!host) return;
    host.replaceChildren();
    const head = element("header", "vs3-comparison-head");
    const copy = element("div", "");
    const rows = comparisonRows();
    copy.append(
      element("h4", "", "Наша стратегия и поле"),
      element("p", "vs3-comparison-copy", `${scenarioTitle()} · поле: ${fieldSizeLabel()}`)
    );
    const handMetrics = element("div", "vs3-hand-metrics");
    handMetrics.append(
      element("strong", "vs3-hand-badge", state.hand),
      element(
        "span",
        `vs3-hand-open-rate${openFrequencyFor(state.hand) === null ? " is-unavailable" : ""}`,
        openFrequencyFor(state.hand) === null ? "Опен: —" : `Опен: ${formatPercent(openFrequencyFor(state.hand))}`
      )
    );
    handMetrics.setAttribute("aria-label", openFrequencyLabel(state.hand));
    head.append(copy, handMetrics);
    const summary = element("p", "vs3-comparison-summary", comparisonSummary(rows));
    summary.setAttribute("aria-live", "polite");
    summary.dataset.vs3ComparisonSummary = "";
    const note = element("p", "vs3-comparison-source", "Реальные решения FF.");
    host.dataset.vs3ComparisonSignature = rows.map((row) => [row.key, ...ACTIONS.map((action) => Math.round(row.mix[action.key] * 10))].join(":")).join("|");
    host.append(head, summary, createComparisonTable(rows), note);
  }

  function createExplorerFooter() {
    const footer = element("footer", "vs3-explorer-footer");
    const copy = element(
      "p",
      "",
      "Сначала запомни нашу стратегию, затем проверь конкретную руку. Под чартом показано, как её играет поле FF."
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
      explorerHost.replaceChildren(element("p", "vs3-loading", "Чарт временно недоступен. Обнови страницу."));
      return;
    }
    const scenario = scenarioFor("reference");
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
      documentRoot.createTextNode("в чарте — наша рекомендация; ниже — решения поля для выбранной руки.")
    );
    head.append(title, note);

    const layout = element("div", "vs3-chart-layout");
    const comparison = element("aside", "vs3-hand-comparison");
    comparison.dataset.vs3HandComparison = "";
    comparison.setAttribute("aria-label", "Сравнение нашей стратегии с наблюдаемой игрой поля FF");
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
        copy: `${definition.description || "Граница отличается от нашей стратегии."} Сравнение с группой «${cohortLabel}» при текущих фильтрах.`,
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
        copy: "Новички чаще пасуют эти руки, хотя наша стратегия ещё продолжает.",
        rule: "Проверь цену колла и реализацию, прежде чем автоматически выбрасывать пограничную руку."
      },
      {
        type: "overdefense",
        title: "Красивые руки без цены",
        hands: overHands,
        copy: "Новички чаще продолжают с этими руками, хотя размер 3-бета и глубина уже ухудшают их реализацию.",
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
    if (root.FFVs3BetFieldErrorExplorer?.refresh) {
      root.FFVs3BetFieldErrorExplorer.refresh();
      return;
    }
    if (root.FF_VS3BET_FIELD_DATA) {
      leaksHost.replaceChildren(element("article", "panel vs3-loading", "Собираем частые ошибки по рукам…"));
      return;
    }
    if (!model) {
      leaksHost.replaceChildren(element("article", "panel vs3-loading", "Примеры временно недоступны. Обнови страницу."));
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

  function practiceFilterPayload() {
    const payload = {};
    if (practiceState.scope === "IP" || practiceState.scope === "OOP") payload.relation = practiceState.scope;
    if (practiceState.position) payload.position = practiceState.position;
    if (practiceState.stack) payload.stack = practiceState.stack;
    if (practiceState.size) payload.size = Number(practiceState.size);
    return payload;
  }

  function practiceScopeLabel() {
    if (practiceState.scope === "IP") return "Все ситуации в позиции";
    if (practiceState.scope === "OOP") return "Все ситуации без позиции";
    return "Все ситуации против 3-бета";
  }

  function practiceSelectionLabel() {
    return [
      practiceScopeLabel(),
      practiceState.position ? `Hero ${LABELS.position[practiceState.position] || practiceState.position}` : "любая позиция",
      practiceState.stack ? LABELS.stack[practiceState.stack] : "любой стек",
      practiceState.size ? `3-бет ${LABELS.size[practiceState.size]}` : "любой сайз"
    ].join(" · ");
  }

  function practicePositionAllowed(position) {
    if (!position) return true;
    if (practiceState.scope === "IP") return position !== "SB";
    if (practiceState.scope === "OOP") return position !== "BTN";
    return true;
  }

  function createPracticePreset(label, value) {
    const button = element("button", "vs3-practice-preset", label);
    button.type = "button";
    button.dataset.vs3PracticeScope = value;
    button.setAttribute("aria-pressed", String(practiceState.scope === value));
    return button;
  }

  function createPracticeOptionalGroup(key, label, anyLabel) {
    const group = element("div", "vs3-practice-optional-group");
    const title = element("span", "vs3-filter-label", label);
    const controls = element("div", "vs3-filter-options");
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", label);
    const rows = [{ key: "", label: anyLabel }, ...filterOptions[key]];
    rows.forEach((option) => {
      const button = element("button", "vs3-filter-button", option.label);
      button.type = "button";
      button.dataset.vs3PracticeFilter = key;
      button.dataset.vs3PracticeFilterValue = option.key;
      button.setAttribute("aria-pressed", String(practiceState[key] === option.key));
      const unavailable = key === "position" && !practicePositionAllowed(option.key);
      button.disabled = unavailable;
      if (unavailable) button.setAttribute("aria-disabled", "true");
      controls.append(button);
    });
    group.append(title, controls);
    return group;
  }

  function createPracticeFilters() {
    const wrap = element("div", "vs3-practice-builder");
    const presets = element("div", "vs3-practice-presets");
    presets.setAttribute("role", "group");
    presets.setAttribute("aria-label", "Ширина выборки практики");
    presets.append(
      createPracticePreset("Любые", "all"),
      createPracticePreset("Только в позиции", "IP"),
      createPracticePreset("Только без позиции", "OOP")
    );
    const details = element("details", "vs3-practice-details");
    details.open = practiceState.detailsOpen;
    details.addEventListener("toggle", () => { practiceState.detailsOpen = details.open; });
    details.append(element("summary", "", "Уточнить позицию, стек или сайз"));
    const optional = element("div", "vs3-practice-optional-grid");
    optional.append(
      createPracticeOptionalGroup("position", "Позиция Hero", "Любая"),
      createPracticeOptionalGroup("stack", "Эффективный стек", "Любой"),
      createPracticeOptionalGroup("size", "Размер 3-бета", "Любой")
    );
    details.append(optional);
    wrap.append(presets, details);
    return wrap;
  }

  function practiceIds() {
    if (typeof model?.practiceSpotIds !== "function") return [];
    try {
      return asArray(model.practiceSpotIds(practiceFilterPayload())).map(clean).filter(Boolean);
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
    mode.label = practiceScopeLabel();
    mode.description = practiceSelectionLabel();
    mode.reference = "После каждого ответа откроется ожидаемый диапазон для этого спота.";
    return ids;
  }

  function renderPracticeSetup() {
    const ids = syncPracticeQueue();
    if (practiceFiltersHost) practiceFiltersHost.replaceChildren(createPracticeFilters());
    if (practiceScopeHost) {
      practiceScopeHost.textContent = ids.length
        ? `${ids.length} ${pluralHands(ids.length)} · ${practiceSelectionLabel()}`
        : `Нет раздач · ${practiceSelectionLabel()}`;
    }
    if (practiceStartButton) {
      practiceStartButton.disabled = !ids.length;
      practiceStartButton.textContent = ids.length ? `Начать: ${ids.length} ${pluralHands(ids.length)}` : "Нет раздач под фильтр";
    }
  }

  function practiceScenario(spot) {
    const meta = spot?.practiceMeta;
    if (!meta || typeof model?.scenario !== "function") return null;
    try {
      return model.scenario({
        position: meta.position,
        relation: meta.relation,
        stack: meta.stackBucket,
        size: Number(meta.threeBetSize),
        cohort: "reference"
      });
    } catch (error) {
      return null;
    }
  }

  function createPracticeExpectedMatrix(scenario, spot) {
    const position = clean(spot?.practiceMeta?.position);
    const currentHand = clean(spot?.hand || spot?.practiceMeta?.hand);
    const scroll = element("div", "vs3-matrix-scroll vs3-practice-expected-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("aria-label", "Ожидаемый диапазон розыгрыша; на узких экранах прокручивается горизонтально");
    const grid = element("div", "vs3-range-grid ff-range-grid vs3-practice-expected-grid");
    grid.setAttribute("role", "img");
    grid.setAttribute("aria-label", `Ожидаемый розыгрыш 169 рук из ${position}`);
    allHands().forEach((hand) => {
      const mix = normalizeMix(cellFrom(scenario, hand));
      const openFrequency = openFrequencyFor(hand, position);
      const unavailableClass = openFrequency === null ? " is-open-weight-unavailable" : "";
      const zeroClass = openFrequency !== null && openFrequency <= 0 ? " is-open-weight-zero" : "";
      const currentClass = hand === currentHand ? " is-current" : "";
      const cell = element("span", `vs3-range-cell ff-range-cell ${mix.missing ? "is-missing" : dominantAction(mix).tone}${unavailableClass}${zeroClass}${currentClass}`);
      cell.style.setProperty("--vs3-open-fill", `${visualOpenFill(openFrequency)}%`);
      cell.style.setProperty("--vs3-mix-background", gradientFor(mix));
      cell.dataset.vs3ActionSignature = ACTIONS.map((action) => `${action.key}:${mix[action.key].toFixed(2)}`).join("|");
      cell.setAttribute("aria-label", `${hand}: ${openFrequencyLabel(hand, position)}. Ожидаемый ответ: ${mixLabel(mix)}.`);
      const fill = element("span", "vs3-open-weight-fill");
      fill.setAttribute("aria-hidden", "true");
      cell.append(fill, element("strong", "", hand), createMixBar(mix, "vs3-cell-mix"));
      grid.append(cell);
    });
    scroll.append(grid);
    return scroll;
  }

  function renderPracticeExpected(payload = {}) {
    if (!practiceExpectedHost) return;
    const spot = payload.spot;
    const scenario = payload.answered ? practiceScenario(spot) : null;
    if (!payload.answered || !spot || !scenario) {
      practiceExpectedHost.hidden = true;
      practiceExpectedHost.replaceChildren();
      return;
    }
    const meta = spot.practiceMeta || {};
    const hand = clean(spot.hand || meta.hand);
    const mix = normalizeMix(cellFrom(scenario, hand));
    const head = element("header", "vs3-practice-expected-head");
    const copy = element("div", "");
    copy.append(
      element("p", "eyebrow", "Правильный розыгрыш"),
      element("h3", "", `${meta.position || "Hero"} · ${hand}`),
      element(
        "p",
        "",
        `${LABELS.relation[meta.relation] || meta.relationLabel || ""} · ${LABELS.stack[meta.stackBucket] || meta.stackBucket || ""} · 3-бет ${LABELS.size[String(meta.threeBetSize)] || `${meta.threeBetSize}x`}`
      )
    );
    const mixList = element("div", "vs3-practice-expected-mix");
    ACTIONS.filter((action) => mix[action.key] > 0.05).forEach((action) => {
      const chip = element("span", `vs3-practice-mix-chip ${action.tone}`);
      chip.append(element("small", "", action.label), element("strong", "", formatPercent(mix[action.key])));
      mixList.append(chip);
    });
    head.append(copy, mixList);
    const note = element(
      "p",
      "vs3-practice-expected-note",
      rfiData?.sourceFrequencies?.[meta.position]
        ? "Высота клетки — как часто эту руку открываем. Цвет — главное действие после 3-бета. Текущая рука выделена жёлтым."
        : "Цвет клетки — главное действие после 3-бета. Текущая рука выделена жёлтым."
    );
    practiceExpectedHost.replaceChildren(head, note, createPracticeExpectedMatrix(scenario, spot));
    practiceExpectedHost.hidden = false;
  }

  function renderAll() {
    renderTargetOverview();
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
    const practiceScope = event.target.closest("[data-vs3-practice-scope]");
    if (practiceScope) {
      const value = clean(practiceScope.dataset.vs3PracticeScope);
      if (["all", "IP", "OOP"].includes(value)) {
        practiceState.scope = value;
        if (!practicePositionAllowed(practiceState.position)) practiceState.position = "";
        renderPracticeSetup();
      }
      return;
    }

    const practiceFilter = event.target.closest("[data-vs3-practice-filter]");
    if (practiceFilter) {
      const key = clean(practiceFilter.dataset.vs3PracticeFilter);
      const value = clean(practiceFilter.dataset.vs3PracticeFilterValue);
      if (["position", "stack", "size"].includes(key)
        && (value === "" || filterOptions[key].some((option) => option.key === value))) {
        practiceState[key] = value;
        if (key === "position" && value === "BTN" && practiceState.scope === "OOP") practiceState.scope = "IP";
        if (key === "position" && value === "SB" && practiceState.scope === "IP") practiceState.scope = "OOP";
        renderPracticeSetup();
      }
      return;
    }

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
      root.FFVs3BetFieldExplorer?.showView?.("target");
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
    refresh: renderAll,
    profitBoundary: () => ({ ...threeBetEconomics() }),
    targets: () => asArray(model?.positions).map((position) => {
      const target = targetForPosition(position);
      return { ...target, raw: { ...target.raw }, mix: { ...target.mix } };
    })
  });

  root.FFFieldLessonPracticeExtension = Object.freeze({
    renderAfterDecision: renderPracticeExpected
  });

  renderAll();
})();
