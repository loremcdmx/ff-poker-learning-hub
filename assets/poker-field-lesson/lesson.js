(function () {
  "use strict";

  /**
   * Browser data contract (schemaVersion: 1)
   *
   * Each page-specific data script must assign one object to
   * `window.FF_POKER_FIELD_LESSON_DATA` before this file executes:
   *
   * {
   *   schemaVersion: 1,
   *   key: "flop-checkraise" | "vs-3bet-defense",
   *   meta: {
   *     title, kicker, lead, sourceLabel, period, sampleNote,
   *     scope: ["narrow spot boundary", ...]
   *   },
   *   intro: SNAPSHOT_SPOT,
   *   wisdom: [
   *     {
   *       eyebrow, title, copy, rule,
   *       stat?: { value, label },
   *       visual?: {
   *         type: "board-folds", boardCards, boardLabel, boardScope,
   *         cohortRole, breakeven, period, note,
   *         sizing: { cbet, checkraise, example },
   *         rows: [{ key, label, ranks, folds, faced, players }]
   *       }
   *     },
   *     ...exactly three items
   *   ],
   *   cohorts: [
   *     {
   *       key: "league1" | "league2" | "league3" | "rank15_17",
   *       label, subtitle, sample, players?, insight,
   *       actions: [{ key, label, pct, tone? }]
   *     },
   *     ...all four cohorts
   *   ],
   *   examples?: {
   *     tree?, title, lead, note, method,
   *     observedLeague1?: { title, lead, scope, note, sampleId, queryVersion, hands: [OBSERVED_HAND, ...] },
   *     value: [EXAMPLE, ...],
   *     bluff: [EXAMPLE, ...]
   *   },
   *   practice: [SNAPSHOT_SPOT, ...],
   *   practiceModes?: [
   *     { key, label, description, reference?, compareExpectedXr?, spotIds: [PRACTICE_ID, ...] }
   *   ],
   *   practiceGenerator?: {
   *     schemaVersion: 1,
   *     global: "BrowserGlobalWithCreateSession",
   *     defaultDepth?: "flop" | "full"
   *   }
   * }
   *
   * SNAPSHOT_SPOT is the native FFTrainerSimulatorSnapshot shape:
   * {
   *   id, title, hand, question, answer, context?,
   *   table: {
   *     seats, heroPosition, heroStack, effectiveStack, pot, anteBb,
   *     heroCards, boardCards, street, actionLine, historyLine,
   *     toCall, currentBet, dealerPosition
   *   },
   *   options: [{ key, label, correct, feedback, acceptableExploit?, acceptableMix? }],
   *   continuation?: {
   *     schemaVersion: 1, start,
   *     nodes: { [id]: FULL_SNAPSHOT_NODE | TERMINAL_SHOWDOWN_NODE },
   *     ui?: {
   *       launchLabel, coachEyebrow, coachTitle, coachCopy,
   *       completeEyebrow, completeTitle, completeCopy
   *     }
   *   }
   * }
   *
   * `pct` is expressed in percentage points (0..100). The renderer preserves
   * the supplied values in labels and normalizes only the visual bar widths.
   * No strategy target, sample size, or poker recommendation is invented here.
   */

  const root = window;
  const documentRoot = document;
  const body = documentRoot.body;
  const lessonKey = body.dataset.lessonKey || "field-lesson";
  const rawData = root.FF_POKER_FIELD_LESSON_DATA;
  const COHORT_ORDER = ["league1", "league2", "league3", "rank15_17"];
  const pageSteps = Array.from(documentRoot.querySelectorAll("[data-step-target]"))
    .map((tab) => cleanText(tab?.dataset?.stepTarget))
    .filter(Boolean);
  const STEP_ORDER = pageSteps.length ? pageSteps : ["deal", "wisdom", "field", "practice"];
  const STORAGE_KEY = `ff-learning-hub:field-lesson:${lessonKey}:v1`;
  const actionToneFallbacks = ["is-accent", "is-positive", "is-warning", "is-neutral"];

  const state = {
    step: "deal",
    unlocked: false,
    firstChoice: "",
    wisdomIndex: 0,
    practiceMode: "",
    practiceDepth: "flop",
    practiceSession: null,
    practiceQueue: [],
    practiceIndex: 0,
    practiceChoice: "",
    practiceAnswered: false,
    practiceContinuation: null,
    practiceContinuationActive: false,
    practiceContinuationIntroduced: false,
    practiceStarted: false,
    stats: { hands: 0, correct: 0, mistakes: 0, checkraises: 0, expectedXr: 0, missedXr: 0, extraXr: 0 }
  };

  const $ = (selector, scope = documentRoot) => scope.querySelector(selector);
  const $$ = (selector, scope = documentRoot) => Array.from(scope.querySelectorAll(selector));

  function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function cleanText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  const CHECKRAISE_STRUCTURE_LABELS = {
    a_high_dry: "Туз-хай · сухая",
    k_high_dry: "Король-хай · сухая",
    broadway: "Бродвейная",
    low_connected: "Низкая связанная",
    paired: "Спаренная",
    two_tone: "Двухмастная",
    monotone: "Одномастная",
    other: "Другие разноцветные"
  };

  function learnerStructureLabel(key, value) {
    const label = cleanText(value) || "Тип флопа";
    if (lessonKey !== "flop-checkraise") return label;
    if (CHECKRAISE_STRUCTURE_LABELS[cleanText(key)]) return CHECKRAISE_STRUCTURE_LABELS[cleanText(key)];
    return label
      .replace(/A-high/gi, "Туз-хай")
      .replace(/K-high/gi, "Король-хай")
      .replace(/\brainbow\b/gi, "разных мастей")
      .replace(/\btrips\b/gi, "трипс")
      .replace(/\bdry\b/gi, "сухая");
  }

  function learnerCheckraiseLabel(value) {
    const label = cleanText(value);
    if (lessonKey !== "flop-checkraise") return label;
    return label
      .replace(/Вэлью/gi, "Велью")
      .replace(/X\/R/gi, "чек-рейз")
      .replace(/top-pair/gi, "топ-пара")
      .replace(/showdown/gi, "вскрытие");
  }

  function numberOrNull(value) {
    if (value == null || (typeof value === "string" && !value.trim())) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatCount(value) {
    const number = numberOrNull(value);
    return number === null ? "—" : Math.round(number).toLocaleString("ru-RU");
  }

  function formatPercent(value) {
    const number = numberOrNull(value);
    if (number === null) return "—";
    const digits = Math.abs(number - Math.round(number)) < 0.05 ? 0 : 1;
    return `${number.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: 1 })}%`;
  }

  function makeElement(tag, className, text) {
    const element = documentRoot.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = cleanText(text);
    return element;
  }

  function replaceText(selector, value) {
    const text = cleanText(value);
    if (!text) return;
    $$(selector).forEach((element) => {
      element.textContent = text;
    });
  }

  function readProgress() {
    try {
      return JSON.parse(root.localStorage.getItem(STORAGE_KEY) || "null") || {};
    } catch (error) {
      return {};
    }
  }

  function saveProgress() {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: state.step,
        unlocked: state.unlocked
      }));
    } catch (error) {
      // Local progress is optional; privacy modes may block storage.
    }
  }

  function spotErrors(spot, label) {
    const errors = [];
    const source = asObject(spot);
    const options = asArray(source.options);
    if (!cleanText(source.id)) errors.push(`${label}: нет id`);
    if (!cleanText(source.question)) errors.push(`${label}: нет question`);
    if (!asObject(source.table).heroCards || !asArray(source.table?.heroCards).length) errors.push(`${label}: нет heroCards`);
    if (options.length < 2) errors.push(`${label}: нужно минимум два действия`);
    if (options.filter((option) => option?.correct === true).length !== 1) errors.push(`${label}: нужен ровно один correct action`);
    return errors;
  }

  function cohortErrors(cohort, index) {
    const source = asObject(cohort);
    const label = `cohorts[${index}]`;
    const errors = [];
    const actions = asArray(source.actions);
    if (!cleanText(source.key)) errors.push(`${label}: нет key`);
    if (!actions.length) errors.push(`${label}: actions пуст`);
    actions.forEach((action, actionIndex) => {
      const pct = numberOrNull(action?.pct);
      if (pct === null) errors.push(`${label}.actions[${actionIndex}]: нет pct`);
      else if (pct < 0 || pct > 100) errors.push(`${label}.actions[${actionIndex}]: pct вне 0..100`);
    });
    const samples = asArray(source.samples);
    if (samples.length) {
      samples.forEach((sample, sampleIndex) => {
        const value = numberOrNull(sample?.value);
        if (value === null) errors.push(`${label}.samples[${sampleIndex}]: нет value`);
        else if (value < 0) errors.push(`${label}.samples[${sampleIndex}]: value меньше нуля`);
      });
    } else {
      const sample = numberOrNull(source.sample);
      if (sample === null) errors.push(`${label}: нет sample`);
      else if (sample < 0) errors.push(`${label}: sample меньше нуля`);
    }
    return errors;
  }

  function wisdomErrors(item, index) {
    const source = asObject(item);
    const visual = asObject(source.visual);
    const label = `wisdom[${index}]`;
    const errors = [];
    if (!Object.keys(visual).length) return errors;
    const visualType = cleanText(visual.type);
    if (!["board-folds", "value-range"].includes(visualType)) {
      errors.push(`${label}.visual: неизвестный type`);
      return errors;
    }

    const cards = asArray(visual.boardCards).map(cleanText).filter(Boolean);
    if (cards.length !== 3 || new Set(cards).size !== 3 || cards.some((card) => !/^[2-9TJQKA][cdhs]$/.test(card))) {
      errors.push(`${label}.visual: нужны три уникальные валидные карты флопа`);
    }
    if (visualType === "value-range") {
      const groups = asArray(visual.groups);
      const groupKeys = groups.map((group) => cleanText(group?.key));
      if (JSON.stringify(groupKeys) !== JSON.stringify(["strong", "thin"])) {
        errors.push(`${label}.visual.groups: нужны strong и thin в этом порядке`);
      }
      const seenHands = new Set();
      groups.forEach((group, groupIndex) => {
        if (!cleanText(group?.label)) errors.push(`${label}.visual.groups[${groupIndex}]: нет label`);
        if (!cleanText(group?.caption)) errors.push(`${label}.visual.groups[${groupIndex}]: нет caption`);
        const hands = asArray(group?.hands);
        if (!hands.length) errors.push(`${label}.visual.groups[${groupIndex}]: hands пуст`);
        hands.forEach((handData, handIndex) => {
          const hand = cleanText(handData?.label);
          const pair = /^([2-9TJQKA])\1$/.test(hand);
          const unpaired = /^([2-9TJQKA])([2-9TJQKA])([so])?$/.exec(hand);
          if (!pair && (!unpaired || unpaired[1] === unpaired[2])) {
            errors.push(`${label}.visual.groups[${groupIndex}]: неверная рука ${hand || "—"}`);
          }
          if (seenHands.has(hand)) errors.push(`${label}.visual.groups: рука ${hand} повторяется`);
          seenHands.add(hand);
          const comboCards = asArray(handData?.cards).map(cleanText).filter(Boolean);
          if (
            comboCards.length !== 2 ||
            new Set(comboCards).size !== 2 ||
            comboCards.some((card) => !/^[2-9TJQKA][cdhs]$/.test(card) || cards.includes(card))
          ) {
            errors.push(`${label}.visual.groups[${groupIndex}].hands[${handIndex}]: нужны две валидные карты без конфликта с флопом`);
          }
        });
      });
      if (!cleanText(visual.note)) errors.push(`${label}.visual: нет note`);
      return errors;
    }
    if (!cleanText(visual.boardScope)) errors.push(`${label}.visual: нет boardScope`);
    if (cleanText(visual.cohortRole) !== "aggressor") errors.push(`${label}.visual: cohortRole должен быть aggressor`);

    const sizing = asObject(visual.sizing);
    ["cbet", "checkraise", "example"].forEach((key) => {
      if (!cleanText(sizing[key])) errors.push(`${label}.visual.sizing: нет ${key}`);
    });
    const breakeven = numberOrNull(visual.breakeven);
    if (breakeven === null || breakeven < 0 || breakeven > 100) errors.push(`${label}.visual: breakeven вне 0..100`);

    const rows = asArray(visual.rows);
    const rowKeys = rows.map((row) => cleanText(row?.key));
    if (JSON.stringify(rowKeys) !== JSON.stringify(["league1", "league2", "league3"])) {
      errors.push(`${label}.visual.rows: нужны league1, league2, league3 в этом порядке`);
    }
    rows.forEach((row, rowIndex) => {
      const folds = numberOrNull(row?.folds);
      const faced = numberOrNull(row?.faced);
      const players = numberOrNull(row?.players);
      if (folds === null || faced === null || faced <= 0 || folds < 0 || folds > faced) {
        errors.push(`${label}.visual.rows[${rowIndex}]: неверные folds/faced`);
      }
      if (players === null || players <= 0) errors.push(`${label}.visual.rows[${rowIndex}]: нет players`);
    });
    return errors;
  }

  function exampleErrors(example, label, expectedTree = "rvcc") {
    const source = asObject(example);
    const evidence = asObject(source.evidence);
    const errors = [];
    if (!cleanText(source.id)) errors.push(`${label}: нет id`);
    const tree = cleanText(expectedTree) || "rvcc";
    if (cleanText(source.tree) !== tree) errors.push(`${label}: tree должен быть ${tree}`);
    if (asArray(source.heroCards).length !== 2) errors.push(`${label}: нужно две heroCards`);
    if (asArray(source.boardCards).length !== 3) errors.push(`${label}: нужно три boardCards`);
    if (asArray(source.options).length) errors.push(`${label}: объясняющий пример не должен содержать actions`);
    if (!cleanText(source.handClass)) errors.push(`${label}: нет handClass`);
    if (!cleanText(source.representativeNote)) errors.push(`${label}: нет пояснения про representative bucket`);
    const representatives = asArray(source.representatives);
    if (!representatives.length) errors.push(`${label}: нет представителей категории`);
    representatives.forEach((representative, representativeIndex) => {
      if (!cleanText(representative?.sourceSpotId)) errors.push(`${label}.representatives[${representativeIndex}]: нет sourceSpotId`);
      if (asArray(representative?.heroCards).length !== 2) errors.push(`${label}.representatives[${representativeIndex}]: нужно две heroCards`);
      if (asArray(representative?.boardCards).length !== 3) errors.push(`${label}.representatives[${representativeIndex}]: нужно три boardCards`);
    });
    const playbook = asObject(source.playbook);
    ["action", "baselineRole", "whyThisHand", "bestTurns", "slowdownTurns", "afterVillainContinues"].forEach((key) => {
      if (!cleanText(playbook[key])) errors.push(`${label}.playbook: нет ${key}`);
    });
    const contrast = asObject(source.contrast);
    if (!cleanText(contrast.sourceSpotId)) errors.push(`${label}.contrast: нет sourceSpotId`);
    if (asArray(contrast.heroCards).length !== 2) errors.push(`${label}.contrast: нужно две heroCards`);
    if (asArray(contrast.boardCards).length !== 3) errors.push(`${label}.contrast: нужно три boardCards`);
    if (!["call", "fold"].includes(cleanText(contrast.actionKey))) errors.push(`${label}.contrast: actionKey должен быть call или fold`);
    if (!cleanText(contrast.actionLabel) || !cleanText(contrast.copy)) errors.push(`${label}.contrast: нет действия или объяснения`);
    if (!cleanText(evidence.scope)) errors.push(`${label}: нет границ evidence bucket`);
    if (!cleanText(evidence.categoryKey)) errors.push(`${label}: нет categoryKey`);
    if (!cleanText(evidence.categoryLabel)) errors.push(`${label}: нет categoryLabel`);
    const evidenceStatus = cleanText(evidence.status) || "ready";
    if (!["ready", "pending_exact_extract"].includes(evidenceStatus)) {
      errors.push(`${label}: неизвестный evidence status`);
    }
    ["league1", "league2", "league3"].forEach((cohortKey) => {
      const cohort = asObject(evidence[cohortKey]);
      const made = numberOrNull(cohort.xraises);
      const cases = numberOrNull(cohort.opportunities);
      const players = numberOrNull(cohort.players);
      if (evidenceStatus === "pending_exact_extract") {
        if ([made, cases, players].some((value) => value !== null)) {
          errors.push(`${label}.${cohortKey}: pending-категория не должна содержать выдуманные counts`);
        }
        if (!cleanText(cohort.note)) errors.push(`${label}.${cohortKey}: нет причины отсутствия среза`);
        return;
      }
      if (made === null || cases === null || cases <= 0) errors.push(`${label}.${cohortKey}: нет X/R numerator или denominator`);
      else if (made < 0 || made > cases) errors.push(`${label}.${cohortKey}: X/R count вне denominator`);
      if (players === null || players <= 0) errors.push(`${label}.${cohortKey}: нет числа игроков`);
    });
    return errors;
  }

  function examplesErrors(examples) {
    const source = asObject(examples);
    const expectedTree = cleanText(source.tree) || "rvcc";
    const errors = [];
    ["value", "bluff"].forEach((groupKey) => {
      const group = asArray(source[groupKey]);
      if (!group.length) errors.push(`examples.${groupKey}: список пуст`);
      group.forEach((example, index) => errors.push(...exampleErrors(example, `examples.${groupKey}[${index}]`, expectedTree)));
    });
    return errors;
  }

  function practiceModeErrors(practice, practiceModes) {
    const modes = asArray(practiceModes);
    if (!modes.length) return [];
    const errors = [];
    const spotIds = new Set(asArray(practice).map((spot) => cleanText(spot?.id)));
    const modeKeys = new Set();
    modes.forEach((mode, index) => {
      const source = asObject(mode);
      const label = `practiceModes[${index}]`;
      const key = cleanText(source.key);
      if (!key) errors.push(`${label}: нет key`);
      else if (modeKeys.has(key)) errors.push(`${label}: key ${key} повторяется`);
      modeKeys.add(key);
      const ids = asArray(source.spotIds).map(cleanText).filter(Boolean);
      if (!ids.length) errors.push(`${label}: spotIds пуст`);
      ids.forEach((id) => {
        if (!spotIds.has(id)) errors.push(`${label}: неизвестный spotId ${id}`);
      });
    });
    return errors;
  }

  function practiceGeneratorErrors(practiceGenerator) {
    const source = asObject(practiceGenerator);
    if (!Object.keys(source).length) return [];
    const errors = [];
    if (source.schemaVersion !== 1) errors.push("practiceGenerator.schemaVersion: ожидается 1");
    if (!cleanText(source.global)) errors.push("practiceGenerator.global: нет имени browser global");
    const defaultDepth = cleanText(source.defaultDepth || "flop");
    if (!["flop", "full"].includes(defaultDepth)) errors.push("practiceGenerator.defaultDepth: нужен flop или full");
    return errors;
  }

  function validateData(value) {
    const errors = [];
    const data = asObject(value);
    if (!Object.keys(data).length) return { data, errors: ["data-скрипт не загрузился"] };
    if (data.schemaVersion !== 1) errors.push("ожидается schemaVersion: 1");
    if (cleanText(data.key) !== lessonKey) errors.push(`ключ данных должен быть «${lessonKey}»`);
    errors.push(...spotErrors(data.intro, "intro"));
    if (asArray(data.wisdom).length !== 3) errors.push("wisdom должен содержать ровно три слайда");
    asArray(data.wisdom).forEach((item, index) => errors.push(...wisdomErrors(item, index)));
    const cohortKeys = new Set(asArray(data.cohorts).map((cohort) => cleanText(cohort?.key)));
    COHORT_ORDER.forEach((key) => {
      if (!cohortKeys.has(key)) errors.push(`нет когорты ${key}`);
    });
    asArray(data.cohorts).forEach((cohort, index) => errors.push(...cohortErrors(cohort, index)));
    if (Object.keys(asObject(data.examples)).length || documentRoot.querySelector('[data-step="examples"]')) {
      errors.push(...examplesErrors(data.examples));
    }
    if (!asArray(data.practice).length) errors.push("practice queue пуста");
    asArray(data.practice).forEach((spot, index) => errors.push(...spotErrors(spot, `practice[${index}]`)));
    errors.push(...practiceModeErrors(data.practice, data.practiceModes));
    errors.push(...practiceGeneratorErrors(data.practiceGenerator));
    return { data, errors };
  }

  const validation = validateData(rawData);
  const data = validation.data;

  function showDataError(errors) {
    const banner = $("[data-data-error]");
    const text = $("[data-data-error-text]");
    if (!banner || !text || !errors.length) return;
    console.error(`[${lessonKey || "poker-field-lesson"}] data validation failed`, errors);
    banner.hidden = false;
    text.textContent = "Данные урока не загрузились. Обнови страницу или попробуй позже.";
    body.classList.add("has-field-data-error");
  }

  function applyMeta() {
    const meta = asObject(data.meta);
    replaceText("[data-lesson-title]", meta.title);
    replaceText("[data-lesson-kicker]", meta.kicker);
    replaceText("[data-intro-title]", data.intro?.title || meta.title);
    replaceText("[data-intro-lead]", meta.lead);
    replaceText("[data-source-label]", meta.sourceLabel);
    replaceText("[data-period-label]", meta.period);
    replaceText("[data-sample-note]", meta.sampleNote);
    if (cleanText(meta.title)) documentRoot.title = `${cleanText(meta.title)} · FF Poker Learning Hub`;

    const scope = $("[data-scope-list]");
    if (scope) {
      scope.replaceChildren();
      asArray(meta.scope).slice(0, 5).forEach((item, index) => {
        const li = makeElement("li", "scope-item");
        li.append(makeElement("span", "scope-number", String(index + 1)), makeElement("p", "", item));
        scope.append(li);
      });
      if (!scope.childElementCount) {
        scope.append(makeElement("li", "scope-empty", "Подробности урока появятся здесь."));
      }
    }
  }

  function unlockSteps() {
    state.unlocked = true;
    $$(".step-tab").forEach((tab) => {
      tab.disabled = false;
      tab.tabIndex = tab.dataset.stepTarget === state.step ? 0 : -1;
    });
    saveProgress();
  }

  function showStep(next, options = {}) {
    if (!STEP_ORDER.includes(next)) return;
    if (!state.unlocked && next !== "deal") return;
    state.step = next;
    $$(".lesson-screen").forEach((screen) => {
      const active = screen.dataset.step === next;
      screen.hidden = !active;
      screen.classList.toggle("is-active", active);
    });
    $$(".step-tab").forEach((tab) => {
      const active = tab.dataset.stepTarget === next;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    body.dataset.currentStep = next;
    saveProgress();
    root.scrollTo({ top: 0, behavior: options.instant ? "auto" : "smooth" });
    if (next === "practice" && asObject(data.practicePresentation).autoStart && !state.practiceStarted) {
      startPractice();
    }
    if (options.focusHeading) {
      root.requestAnimationFrame(() => {
        const heading = $(`.lesson-screen[data-step="${next}"] h2`);
        if (!heading) return;
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      });
    }
  }

  function setupNavigation() {
    $$("[data-step-target]").forEach((tab, index, tabs) => {
      tab.addEventListener("click", () => showStep(tab.dataset.stepTarget));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let next = index;
        if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        if (!tabs[next].disabled) {
          showStep(tabs[next].dataset.stepTarget);
          tabs[next].focus({ preventScroll: true });
        }
      });
    });
    $$("[data-step-link]").forEach((button) => {
      button.addEventListener("click", () => showStep(button.dataset.stepLink, { focusHeading: true }));
    });
  }

  function optionFor(spot, key) {
    return asArray(spot?.options).find((option) => cleanText(option?.key) === cleanText(key)) || null;
  }

  function correctOption(spot) {
    return asArray(spot?.options).find((option) => option?.correct === true) || null;
  }

  function decisionOutcomeFor(chosen, expected) {
    if (chosen?.correct === true || (cleanText(chosen?.key) && cleanText(chosen?.key) === cleanText(expected?.key))) return "correct";
    if (chosen?.acceptableMix === true) return "alternative";
    if (chosen?.acceptableExploit === true && cleanText(chosen?.key) === "checkraise" && cleanText(expected?.key) !== "checkraise") return "alternative";
    return "wrong";
  }

  function renderDecision(host, spot, selectedKey, options = {}) {
    if (!host) return null;
    if (!spot || validation.errors.some((error) => error.startsWith(options.errorPrefix || "__never__"))) {
      console.error(`[${lessonKey || "poker-field-lesson"}] decision data unavailable`, {
        errorPrefix: options.errorPrefix || "",
        spotId: spot?.id || null,
        validationErrors: validation.errors
      });
      host.innerHTML = '<p class="table-load-error">Ситуация не загрузилась. Обнови страницу или попробуй позже.</p>';
      return null;
    }
    if (!root.FFTrainerSimulator?.renderDecision) {
      console.error(`[${lessonKey || "poker-field-lesson"}] FFTrainerSimulator.renderDecision is unavailable`);
      host.innerHTML = '<p class="table-load-error">Стол не загрузился. Обнови страницу или попробуй позже.</p>';
      return null;
    }
    try {
      return root.FFTrainerSimulator.renderDecision(host, spot, {
        answered: Boolean(selectedKey),
        selectedKey: selectedKey || "",
        finished: false
      }, {
        positionLabels: { UTG: "EP", LJ: "MP" },
        decimalComma: true,
        hideActionStatus: Boolean(options.hideActionStatus),
        nextLabel: options.nextLabel || ""
      });
    } catch (error) {
      console.error(`[${lessonKey || "poker-field-lesson"}] decision render failed`, error);
      host.innerHTML = '<p class="table-load-error">Стол не загрузился. Обнови страницу или попробуй позже.</p>';
      return null;
    }
  }

  function feedbackShell(host, tone, kicker, title, copy) {
    if (!host) return;
    host.classList.remove("is-neutral", "is-correct", "is-alternative", "is-wrong");
    host.classList.add("decision-feedback", tone || "is-neutral");
    host.replaceChildren(
      makeElement("p", "eyebrow", kicker),
      makeElement("h3", "", title),
      makeElement("p", "feedback-copy", copy)
    );
  }

  function renderFirstFeedback() {
    const host = $("[data-intro-feedback]");
    const spot = data.intro;
    if (!host) return;
    if (!spot || !state.firstChoice) {
      feedbackShell(
        host,
        "is-neutral",
        "Твой ход",
        spot?.question || "Данные ситуации готовятся",
        spot?.context || "Выбери действие за столом. После ответа откроются остальные шаги урока."
      );
      return;
    }

    const chosen = optionFor(spot, state.firstChoice);
    const expected = correctOption(spot);
    const outcome = decisionOutcomeFor(chosen, expected);
    const correct = outcome === "correct";
    const alternative = outcome === "alternative";
    const mix = alternative && chosen?.acceptableMix === true;
    feedbackShell(
      host,
      correct ? "is-correct" : alternative ? "is-alternative" : "is-wrong",
      correct ? "Верное решение" : mix ? "Допустимый микс" : alternative ? "Допустимый эксплойт · при большом оверфолде" : "Разберём промах",
      correct ? (spot.title || "Линия совпала") : mix ? `Основная линия: ${expected?.label || "—"}` : alternative ? `База дисциплинированнее: ${expected?.label || "—"}` : `Базовая линия: ${expected?.label || "—"}`,
      chosen?.feedback || spot.answer || "Сравни выбранное действие с базовой линией этого спота."
    );
    const answer = cleanText(spot.answer);
    if (answer && answer !== cleanText(chosen?.feedback)) host.append(makeElement("p", "feedback-answer", answer));
    const next = makeElement("button", "field-button is-primary", "Разобрать главное");
    next.type = "button";
    next.addEventListener("click", () => showStep("wisdom", { focusHeading: true }));
    host.append(next);
  }

  function renderFirstDecision() {
    const host = $("[data-intro-table]");
    renderDecision(host, data.intro, state.firstChoice, { hideActionStatus: false, errorPrefix: "intro" });
    renderFirstFeedback();
  }

  function answerFirst(key) {
    if (state.firstChoice || !optionFor(data.intro, key)) return;
    state.firstChoice = key;
    unlockSteps();
    renderFirstDecision();
    root.requestAnimationFrame(() => $("[data-intro-feedback] .field-button")?.focus({ preventScroll: true }));
  }

  function wisdomStat(item) {
    const stat = asObject(item?.stat);
    if (!cleanText(stat.value) && !cleanText(stat.label)) return null;
    const visual = makeElement("div", "wisdom-stat");
    visual.append(makeElement("strong", "", stat.value), makeElement("span", "", stat.label));
    return visual;
  }

  function wisdomBoardFolds(item) {
    const config = asObject(item?.visual);
    if (cleanText(config.type) !== "board-folds") return null;
    const boardLabel = learnerStructureLabel("", config.boardLabel || "Король-хай · сухая");
    const sizing = asObject(config.sizing);
    const breakeven = clamp(numberOrNull(config.breakeven) ?? 0, 0, 100);
    const card = makeElement("section", "wisdom-board-folds");
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", "Фолды по лигам на одной структуре флопа и одном размере чек-рейза");

    const head = makeElement("header", "wisdom-board-folds-head");
    const title = makeElement("div", "");
    title.append(
      makeElement("span", "wisdom-board-kicker", boardLabel),
      createExampleCards(config.boardCards, `Пример флопа ${boardLabel}`, "board")
    );
    head.append(title, makeElement("strong", "wisdom-size-badge", "один сайз"));

    const sizeLine = makeElement("div", "wisdom-size-line");
    sizeLine.append(
      makeElement("span", "", sizing.cbet),
      makeElement("i", "", "→"),
      makeElement("span", "", sizing.checkraise)
    );
    const example = makeElement("small", "wisdom-size-example", sizing.example);

    const list = makeElement("div", "wisdom-fold-list");
    list.setAttribute("role", "list");
    asArray(config.rows).forEach((rowData, rowIndex) => {
      const row = asObject(rowData);
      const folds = numberOrNull(row.folds);
      const faced = numberOrNull(row.faced);
      const rate = folds === null || faced === null || faced <= 0 ? null : folds / faced * 100;
      const reliability = faced === null || faced < 50 ? "thin" : faced < 200 ? "directional" : "solid";
      const itemRow = makeElement("div", `wisdom-fold-row is-${cleanText(row.key)}`);
      itemRow.dataset.reliability = reliability;
      itemRow.setAttribute("role", "listitem");
      const rowHead = makeElement("div", "wisdom-fold-row-head");
      const rowName = makeElement("span", "");
      rowName.append(
        makeElement("strong", "", `Лига ${rowIndex + 1}`)
      );
      rowHead.append(rowName, makeElement("b", "", rate === null ? "—" : formatPercent(rate)));

      const meter = makeElement("div", "wisdom-fold-meter");
      meter.setAttribute("aria-hidden", "true");
      const fill = makeElement("i", "wisdom-fold-fill");
      fill.style.width = `${clamp(rate ?? 0, 0, 100)}%`;
      const marker = makeElement("b", "wisdom-fold-breakeven");
      marker.style.left = `${breakeven}%`;
      meter.append(fill, marker);

      itemRow.append(rowHead, meter);
      list.append(itemRow);
    });

    const threshold = makeElement("p", "wisdom-threshold", `Порог выгодности чистого блефа: ${formatPercent(breakeven)}`);
    card.append(head, sizeLine, example, list, threshold);
    return card;
  }

  function wisdomValueRange(item) {
    const config = asObject(item?.visual);
    if (cleanText(config.type) !== "value-range") return null;
    const card = makeElement("section", "wisdom-value-range");
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", "Велью чек-рейз на разноцветном флопе K92");

    const head = makeElement("header", "wisdom-value-range-head");
    const board = makeElement("div", "wisdom-value-board");
    const boardLabel = learnerStructureLabel("", config.boardLabel || "Король-хай · сухая · K92");
    board.append(
      makeElement("span", "wisdom-board-kicker", boardLabel),
      createExampleCards(config.boardCards, "Разноцветный флоп K92", "board")
    );
    const rangeTitle = makeElement("div", "wisdom-value-range-title");
    rangeTitle.append(
      makeElement("span", "", "Состав чек-рейза"),
      makeElement("strong", "", "Велью + микс")
    );
    head.append(board, rangeTitle);

    const groups = makeElement("div", "wisdom-value-groups");
    groups.setAttribute("role", "list");
    asArray(config.groups).forEach((groupData) => {
      const group = asObject(groupData);
      const groupCard = makeElement("article", `wisdom-value-group is-${cleanText(group.key)}`);
      groupCard.setAttribute("role", "listitem");
      const groupHead = makeElement("header", "wisdom-value-group-head");
      groupHead.append(
        makeElement("strong", "", group.label),
        makeElement("span", "", group.caption)
      );
      const hands = makeElement("div", "wisdom-value-combos");
      asArray(group.hands).forEach((handData) => {
        const hand = asObject(handData);
        const combo = makeElement("div", "wisdom-value-combo");
        combo.append(
          makeElement("strong", "wisdom-value-combo-label", hand.label),
          createExampleCards(hand.cards, `${hand.label} — пример сочетания мастей`, "mini")
        );
        hands.append(combo);
      });
      groupCard.append(groupHead, hands);
      groups.append(groupCard);
    });

    const note = makeElement("p", "wisdom-value-note");
    note.append(
      makeElement("strong", "", "Зачем подмешивать KQ / KJ / KT"),
      makeElement("span", "", config.note)
    );
    card.append(head, groups, note);
    return card;
  }

  function wisdomValueCopy(item) {
    const config = asObject(item?.visual);
    if (cleanText(config.type) !== "value-range") return null;
    const block = makeElement("div", "wisdom-value-copy");
    block.append(makeElement("p", "wisdom-text", item.copy || ""));
    const list = makeElement("div", "wisdom-value-copy-list");
    asArray(config.groups).forEach((groupData) => {
      const group = asObject(groupData);
      const row = makeElement("div", `wisdom-value-copy-row is-${cleanText(group.key)}`);
      row.append(makeElement("span", "", group.label));
      const hands = makeElement("div", "wisdom-value-copy-hands");
      asArray(group.hands).forEach((handData) => {
        hands.append(makeElement("b", "", cleanText(handData?.label)));
      });
      row.append(hands);
      list.append(row);
    });
    block.append(list);
    return block;
  }

  function renderWisdom() {
    const track = $("[data-wisdom-track]");
    const dots = $("[data-wisdom-dots]");
    if (!track || !dots) return;
    track.replaceChildren();
    dots.replaceChildren();
    asArray(data.wisdom).slice(0, 3).forEach((item, index) => {
      const slide = makeElement("article", "wisdom-slide panel");
      slide.dataset.wisdomSlide = String(index);
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "слайд");
      slide.setAttribute("aria-label", `${index + 1} из 3: ${cleanText(item.title) || "мысль"}`);

      const copy = makeElement("div", "wisdom-copy");
      const valueCopy = wisdomValueCopy(item);
      copy.append(
        makeElement("p", "eyebrow", item.eyebrow || `Мысль ${index + 1}`),
        makeElement("h3", "", item.title || "Материал готовится"),
        valueCopy || makeElement("p", "wisdom-text", item.copy || "Текст появится вместе с проверенным data-файлом.")
      );
      if (cleanText(item.rule)) copy.append(makeElement("strong", "wisdom-rule", item.rule));

      const visual = makeElement("div", `wisdom-visual wisdom-visual-${index + 1}`);
      const boardFolds = wisdomBoardFolds(item);
      const valueRange = wisdomValueRange(item);
      if (boardFolds) {
        visual.classList.add("has-board-folds");
        visual.append(boardFolds);
      } else if (valueRange) {
        slide.classList.add("has-value-range-slide");
        visual.classList.add("has-value-range");
        visual.append(valueRange);
      } else {
        const stat = wisdomStat(item);
        if (stat) visual.append(stat);
        const orbit = makeElement("div", "wisdom-orbit");
        orbit.setAttribute("aria-hidden", "true");
        orbit.append(makeElement("i", ""), makeElement("b", ""), makeElement("span", ""));
        visual.append(orbit);
      }
      slide.append(copy, visual);
      track.append(slide);

      const dot = makeElement("button", "wisdom-dot");
      dot.type = "button";
      dot.dataset.wisdomDot = String(index);
      dot.setAttribute("aria-label", `Показать мысль ${index + 1}`);
      dots.append(dot);
    });
    showWisdom(0);
  }

  function showWisdom(requestedIndex) {
    const slides = $$("[data-wisdom-slide]");
    if (!slides.length) return;
    state.wisdomIndex = (requestedIndex + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      const active = index === state.wisdomIndex;
      slide.classList.toggle("is-active", active);
      slide.hidden = !active;
    });
    $$("[data-wisdom-dot]").forEach((dot, index) => {
      const active = index === state.wisdomIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
    replaceText("[data-wisdom-counter]", `${state.wisdomIndex + 1} из ${slides.length}`);
  }

  function setupWisdom() {
    $("[data-wisdom-prev]")?.addEventListener("click", () => showWisdom(state.wisdomIndex - 1));
    $("[data-wisdom-next]")?.addEventListener("click", () => showWisdom(state.wisdomIndex + 1));
    $("[data-wisdom-dots]")?.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-wisdom-dot]");
      if (dot) showWisdom(Number(dot.dataset.wisdomDot));
    });
    const region = $("[data-wisdom-carousel]");
    if (!region) return;
    region.addEventListener("keydown", (event) => {
      if (!event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        showWisdom(state.wisdomIndex - 1);
      }
      if (!event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        showWisdom(state.wisdomIndex + 1);
      }
    });
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    region.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button, a")) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      region.setPointerCapture?.(event.pointerId);
    });
    region.addEventListener("pointerup", (event) => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (region.hasPointerCapture?.(event.pointerId)) region.releasePointerCapture(event.pointerId);
      pointerId = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) showWisdom(state.wisdomIndex + (dx < 0 ? 1 : -1));
    });
    region.addEventListener("pointercancel", () => { pointerId = null; });
  }

  function orderedCohorts() {
    const lookup = new Map(asArray(data.cohorts).map((cohort) => [cleanText(cohort?.key), cohort]));
    return COHORT_ORDER.map((key) => lookup.get(key)).filter(Boolean);
  }

  function actionDefinitions(cohorts) {
    const definitions = new Map();
    cohorts.forEach((cohort) => {
      asArray(cohort.actions).forEach((action) => {
        const key = cleanText(action?.key || action?.label);
        if (key && !definitions.has(key)) definitions.set(key, action);
      });
    });
    return Array.from(definitions.entries()).map(([key, action], index) => ({
      key,
      label: cleanText(action.label || key),
      tone: toneClass(action, index)
    }));
  }

  function toneClass(action, index) {
    const tone = cleanText(action?.tone).toLowerCase();
    const key = cleanText(action?.key || action?.label).toLowerCase();
    if (["accent", "aggressive", "raise", "bet", "xr", "fourbet", "4bet"].includes(tone) || /raise|bet|рейз|став/.test(key)) return "is-accent";
    if (["positive", "call", "continue"].includes(tone) || /call|колл|продолж/.test(key)) return "is-positive";
    if (["warning", "check", "mix"].includes(tone) || /check|чек|mix|микс/.test(key)) return "is-warning";
    if (["neutral", "fold"].includes(tone) || /fold|пас|фолд/.test(key)) return "is-neutral";
    return actionToneFallbacks[index % actionToneFallbacks.length];
  }

  function actionFor(cohort, key) {
    return asArray(cohort?.actions).find((action) => cleanText(action?.key || action?.label) === key) || null;
  }

  function renderActionMix(cohort, definitions, compact = false) {
    const mix = makeElement("div", compact ? "action-mix is-compact" : "action-mix");
    const values = definitions.map((definition) => {
      const value = numberOrNull(actionFor(cohort, definition.key)?.pct);
      return value === null ? null : Math.max(0, value);
    });
    if (cleanText(cohort?.display).toLowerCase() === "independent") {
      mix.classList.add("is-independent");
      definitions.forEach((definition, index) => {
        const row = makeElement("div", "independent-metric");
        const label = makeElement("span", "independent-metric-label");
        label.append(makeElement("i", definition.tone), makeElement("b", "", definition.label), makeElement("strong", "", formatPercent(values[index])));
        const rail = makeElement("div", "independent-metric-rail");
        const fill = makeElement("i", `independent-metric-fill ${definition.tone}`);
        fill.style.width = `${clamp(values[index] ?? 0, 0, 100)}%`;
        rail.append(fill);
        row.append(label, rail);
        mix.append(row);
      });
      return mix;
    }
    const total = values.reduce((sum, value) => sum + (value ?? 0), 0);
    const bar = makeElement("div", "action-mix-bar");
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", definitions.map((definition, index) => `${definition.label} ${formatPercent(values[index])}`).join(", "));
    definitions.forEach((definition, index) => {
      const segment = makeElement("i", `mix-segment ${definition.tone}`);
      segment.style.width = `${total > 0 ? (values[index] ?? 0) / total * 100 : 0}%`;
      segment.title = `${definition.label}: ${formatPercent(values[index])}`;
      bar.append(segment);
    });
    mix.append(bar);
    if (!compact) {
      const legend = makeElement("div", "action-mix-legend");
      definitions.forEach((definition, index) => {
        const item = makeElement("span", "mix-legend-item");
        item.append(makeElement("i", definition.tone), makeElement("b", "", definition.label), makeElement("strong", "", formatPercent(values[index])));
        legend.append(item);
      });
      mix.append(legend);
    }
    return mix;
  }

  function renderField() {
    const cohorts = orderedCohorts();
    const definitions = actionDefinitions(cohorts);
    const cards = $("[data-cohort-cards]");
    const head = $("[data-field-head]");
    const bodyHost = $("[data-field-body]");
    if (!cards || !head || !bodyHost) return;
    cards.replaceChildren();
    head.replaceChildren();
    bodyHost.replaceChildren();

    cohorts.forEach((cohort, index) => {
      const card = makeElement("article", `cohort-card panel cohort-${cleanText(cohort.key)}`);
      const header = makeElement("header", "cohort-card-head");
      const number = makeElement("span", "cohort-index", String(index + 1).padStart(2, "0"));
      const title = makeElement("div", "");
      title.append(makeElement("p", "eyebrow", cohort.subtitle || "Срез поля"), makeElement("h3", "", cohort.label || cohort.key));
      header.append(number, title);
      card.append(header, renderActionMix(cohort, definitions));
      const evidence = makeElement("dl", "cohort-evidence");
      const splitSamples = asArray(cohort.samples).filter((item) => numberOrNull(item?.value) !== null);
      if (splitSamples.length) {
        splitSamples.forEach((item) => {
          const sample = makeElement("div", "");
          sample.append(makeElement("dt", "", item.label || "Наблюдений"), makeElement("dd", "", formatCount(item.value)));
          evidence.append(sample);
        });
      } else {
        const sample = makeElement("div", "");
        sample.append(makeElement("dt", "", "Наблюдений"), makeElement("dd", "", formatCount(cohort.sample)));
        evidence.append(sample);
      }
      if (numberOrNull(cohort.players) !== null) {
        const players = makeElement("div", "");
        players.append(makeElement("dt", "", "Игроков"), makeElement("dd", "", formatCount(cohort.players)));
        evidence.append(players);
      }
      card.append(evidence, makeElement("p", "cohort-insight", cohort.insight || "Интерпретация появится после проверки данных."));
      cards.append(card);
    });

    const headerRow = makeElement("tr", "");
    ["Группа", ...definitions.map((definition) => definition.label), "N", "Вывод"].forEach((label) => {
      const cell = makeElement("th", "", label);
      cell.scope = "col";
      headerRow.append(cell);
    });
    head.append(headerRow);

    cohorts.forEach((cohort) => {
      const row = makeElement("tr", "");
      const group = makeElement("th", "field-group-cell");
      group.scope = "row";
      group.append(makeElement("strong", "", cohort.label || cohort.key), makeElement("small", "", cohort.subtitle || ""));
      row.append(group);
      definitions.forEach((definition) => {
        const action = actionFor(cohort, definition.key);
        const cell = makeElement("td", `field-number ${definition.tone}`, formatPercent(action?.pct));
        cell.dataset.label = definition.label;
        row.append(cell);
      });
      const splitSamples = asArray(cohort.samples).filter((item) => numberOrNull(item?.value) !== null);
      const sampleText = splitSamples.length
        ? splitSamples.map((item) => `${cleanText(item.label)} ${formatCount(item.value)}`).join(" · ")
        : formatCount(cohort.sample);
      const sample = makeElement("td", "field-sample", sampleText);
      sample.dataset.label = "N";
      const insight = makeElement("td", "field-insight", cohort.insight || "—");
      insight.dataset.label = "Вывод";
      row.append(sample, insight);
      bodyHost.append(row);
    });

    if (!cohorts.length || !definitions.length) {
      const row = makeElement("tr", "");
      const cell = makeElement("td", "field-empty", "Сводка поля появится после подключения агрегированных данных.");
      cell.colSpan = 8;
      row.append(cell);
      bodyHost.append(row);
    }
  }

  function exampleRate(cohort) {
    const source = asObject(cohort);
    const made = numberOrNull(source.xraises);
    const cases = numberOrNull(source.opportunities);
    return made === null || cases === null || cases <= 0 ? null : made / cases * 100;
  }

  function createExampleCardVisual(code, variant) {
    const normalized = cleanText(code);
    if (!normalized) return null;
    if (typeof root.PokerDeckKit?.renderCard !== "function") {
      return makeElement("span", "example-card-fallback", normalized);
    }
    const template = documentRoot.createElement("template");
    template.innerHTML = root.PokerDeckKit.renderCard(normalized, {
      theme: "color-block",
      mini: variant === "mini",
      board: variant === "board",
      hero: variant === "hero",
      className: "example-color-card",
      attributes: 'aria-hidden="true"'
    }).trim();
    return template.content.firstElementChild;
  }

  function createExampleCards(cards, label, variant) {
    const host = makeElement("div", `example-cards is-${variant}`);
    const values = asArray(cards).map(cleanText).filter(Boolean);
    host.setAttribute("role", "img");
    host.setAttribute("aria-label", `${label}: ${values.join(", ")}`);
    values.forEach((code) => {
      const card = createExampleCardVisual(code, variant);
      if (card) host.append(card);
    });
    return host;
  }

  function createExampleEvidenceRow(label, cohort, tone) {
    const source = asObject(cohort);
    const rate = exampleRate(source);
    const pending = rate === null;
    const row = makeElement("div", `example-evidence-row ${tone}${pending ? " is-pending" : ""}`);
    const header = makeElement("div", "example-evidence-head");
    header.append(
      makeElement("span", "", label),
      makeElement("strong", "", pending ? "—" : formatPercent(rate))
    );
    const rail = makeElement("div", "example-evidence-rail");
    const fill = makeElement("i", "example-evidence-fill");
    fill.style.width = `${clamp(rate ?? 0, 0, 100)}%`;
    rail.append(fill);
    const detail = makeElement("small", "", pending
      ? "Нет подходящих раздач."
      : "Как часто так играют соперники.");
    row.append(header, rail, detail);
    return row;
  }

  function createExampleVariant(representative) {
    const source = asObject(representative);
    const chip = makeElement("div", "example-variant-chip");
    chip.setAttribute("aria-label", source.hand || "Дополнительная рука");
    chip.append(createExampleCards(source.heroCards, `Представитель ${source.hand || "категории"}`, "mini"));
    return chip;
  }

  function createExampleLessonCell(label, copy, tone) {
    const cell = makeElement("article", `example-lesson-cell ${tone || ""}`.trim());
    cell.append(makeElement("h5", "", label), makeElement("p", "", copy));
    return cell;
  }

  function createExampleContrast(contrast) {
    const source = asObject(contrast);
    const card = makeElement("aside", `example-contrast is-${cleanText(source.actionKey) || "call"}`);
    const visual = makeElement("div", "example-contrast-visual");
    visual.append(
      createExampleCards(source.heroCards, `Контрпример ${source.hand || "рука"}`, "mini"),
      makeElement("strong", "", `${source.hand || "Похожая рука"} — ${learnerCheckraiseLabel(source.actionLabel || "Колл")}`)
    );
    card.append(
      visual,
      makeElement("p", "", learnerCheckraiseLabel(source.shortCopy || source.copy || "Сравни границу между действиями."))
    );
    return card;
  }

  function createFieldExample(example, groupKey) {
    const source = asObject(example);
    const playbook = asObject(source.playbook);
    const summary = asObject(playbook.summary);
    const representatives = asArray(source.representatives);
    const card = makeElement("article", `field-example-card is-${groupKey}`);
    const heading = makeElement("header", "field-example-head");
    heading.append(makeElement("h4", "", learnerCheckraiseLabel(source.title || "Пример чек-рейза")));

    const stage = makeElement("div", "example-stage");
    const hand = makeElement("div", "example-card-block");
    hand.append(makeElement("span", "", "Рука"), createExampleCards(source.heroCards, "Карты игрока", "hero"));
    const board = makeElement("div", "example-card-block");
    board.append(makeElement("span", "", "Флоп"), createExampleCards(source.boardCards, "Флоп", "board"));
    stage.append(hand, makeElement("i", "example-stage-arrow", "→"), board);

    const action = makeElement("div", "example-action-band");
    action.append(makeElement("strong", "", learnerCheckraiseLabel(playbook.action || "Чек-рейз")));

    const variants = makeElement("div", "example-variants");
    if (representatives.length > 1) {
      variants.append(makeElement("p", "", "Ещё руки"));
      const variantRow = makeElement("div", "example-variant-row");
      representatives.slice(1).forEach((representative) => variantRow.append(createExampleVariant(representative)));
      variants.append(variantRow);
    }

    const lessonGrid = makeElement("div", "example-lesson-grid");
    lessonGrid.append(
      createExampleLessonCell(
        "Почему рейз",
        learnerCheckraiseLabel(summary.why || source.takeaway || playbook.whyThisHand),
        "is-why"
      ),
      createExampleLessonCell(
        "План тёрна",
        learnerCheckraiseLabel(summary.turn || playbook.afterVillainContinues),
        "is-after"
      )
    );

    card.append(heading, stage, action);
    if (representatives.length > 1) card.append(variants);
    card.append(lessonGrid, createExampleContrast(source.contrast));
    return card;
  }

  function renderExampleGroup(host, examples, groupKey) {
    if (!host) return;
    host.replaceChildren();
    const rows = asArray(examples);
    if (!rows.length) {
      host.append(makeElement("p", "examples-empty", "Проверенные примеры пока не загрузились."));
      return;
    }
    rows.forEach((example) => host.append(createFieldExample(example, groupKey)));
  }

  function formatBbValue(value) {
    const number = numberOrNull(value);
    if (number === null) return "—";
    const digits = Math.abs(number - Math.round(number)) < 0.05 ? 0 : 1;
    return number.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: 1 });
  }

  function observedResponse(responseKey) {
    const responses = {
      fold: { label: "Соперник сфолдил", tone: "fold" },
      call: { label: "Соперник заколлировал", tone: "call" },
      reraise_allin: { label: "Соперник переставил олл-ин", tone: "reraise" }
    };
    return responses[cleanText(responseKey)] || { label: "Линия продолжилась", tone: "neutral" };
  }

  function createObservedLeagueOneExample(handData, index) {
    const hand = asObject(handData);
    const structureLabel = learnerStructureLabel(hand.structureKey, hand.structureLabel);
    const response = observedResponse(hand.villainResponse);
    const card = makeElement("article", `observed-example-card is-${response.tone}`);
    card.dataset.structureKey = cleanText(hand.structureKey);
    card.setAttribute(
      "aria-label",
      `${structureLabel}: BB сделал чек-рейз против ${hand.openerPosition || "поздней позиции"}`
    );

    const head = makeElement("header", "observed-example-card-head");
    const title = makeElement("div", "observed-example-title");
    title.append(
      makeElement("span", "observed-example-index", String(index + 1).padStart(2, "0")),
      makeElement("strong", "", structureLabel)
    );
    head.append(title, makeElement("span", "observed-example-rank", `Уровень ${Math.round(Number(hand.rank) || 0)}`));

    const stage = makeElement("div", "observed-example-stage");
    const board = makeElement("div", "observed-example-cards");
    board.append(
      makeElement("span", "", "Флоп"),
      createExampleCards(hand.boardCards, `${structureLabel}: ${asArray(hand.boardCards).join(" ")}`, "mini")
    );
    const hero = makeElement("div", "observed-example-cards");
    hero.append(
      makeElement("span", "", "BB"),
      createExampleCards(hand.heroCards, `Рука BB: ${asArray(hand.heroCards).join(" ")}`, "mini")
    );
    stage.append(board, hero);

    const line = makeElement("p", "observed-example-line");
    line.append(
      makeElement("strong", "", `${hand.openerPosition || "BTN"} ${formatBbValue(hand.openSizeBb)} BB`),
      makeElement("span", "", `ставка ${formatBbValue(hand.cbetAmountBb)} → чек-рейз до ${formatBbValue(hand.xrToBb)} BB`)
    );

    const foot = makeElement("footer", "observed-example-foot");
    foot.append(
      makeElement("span", "observed-example-stack", `эффективный стек ${formatBbValue(hand.effectiveStackBb)} BB`),
      makeElement("strong", `observed-example-response is-${response.tone}`, response.label)
    );
    card.append(head, stage, line, foot);
    return card;
  }

  function renderObservedLeagueOneExamples(host, observedData) {
    if (!host) return;
    const source = asObject(observedData);
    const hands = asArray(source.hands);
    host.replaceChildren();
    replaceText("[data-examples-league-one-title]", source.title);
    replaceText("[data-examples-league-one-lead]", source.lead);
    replaceText("[data-examples-league-one-scope]", lessonKey === "flop-checkraise" ? "Q2 2026 · уровни 1–5" : source.scope);
    replaceText("[data-examples-league-one-note]", source.note);
    if (!hands.length) {
      host.append(makeElement("p", "examples-empty", "Наблюдавшиеся раздачи пока не загрузились."));
      return;
    }
    hands.forEach((hand, index) => host.append(createObservedLeagueOneExample(hand, index)));
  }

  function atlasTone(roleKey) {
    const tones = {
      value: "value",
      semi_bluff: "semi-bluff",
      check_call: "call",
      fold: "fold"
    };
    return tones[cleanText(roleKey)] || "neutral";
  }

  function createExampleAtlasInspector(structure, group, hand) {
    const role = asObject(group);
    const source = asObject(hand);
    const structureLabel = learnerStructureLabel(structure.key, structure.label);
    const roleLabel = learnerCheckraiseLabel(role.roleLabel || "Решение");
    const actionLabel = learnerCheckraiseLabel(role.actionLabel || "");
    const inspector = makeElement("aside", `example-atlas-inspector is-${atlasTone(role.roleKey)}`);
    inspector.setAttribute("aria-live", "polite");

    const visual = makeElement("div", "example-atlas-inspector-visual");
    const board = makeElement("div", "example-atlas-inspector-cards");
    board.append(
      makeElement("span", "", "Флоп"),
      createExampleCards(structure.boardCards, `${structureLabel}: ${asArray(structure.boardCards).join(" ")}`, "mini")
    );
    const hero = makeElement("div", "example-atlas-inspector-cards");
    hero.append(
      makeElement("span", "", "BB"),
      createExampleCards(source.heroCards, `Рука BB ${source.hand || ""}`, "mini")
    );
    visual.append(board, makeElement("i", "example-atlas-inspector-arrow", "→"), hero);

    const copy = makeElement("div", "example-atlas-inspector-copy");
    const eyebrow = makeElement("p", "example-atlas-inspector-role", `${roleLabel} · ${actionLabel}`);
    copy.append(
      eyebrow,
      makeElement("h4", "", learnerCheckraiseLabel(source.title || source.hand || "Учебная рука")),
      makeElement("p", "", learnerCheckraiseLabel(source.reason || "Сравни силу руки, эквити и план продолжения.")),
      makeElement("small", "", `План: ${learnerCheckraiseLabel(source.turnPlan || "переоцени тёрн после реакции соперника.")}`)
    );
    inspector.append(visual, copy);
    return inspector;
  }

  function renderExampleAtlas(host, atlasData) {
    if (!host) return;
    const atlas = asObject(atlasData);
    const structures = asArray(atlas.structures);
    host.replaceChildren();
    replaceText("[data-examples-atlas-title]", learnerCheckraiseLabel(atlas.title));
    replaceText("[data-examples-atlas-lead]", learnerCheckraiseLabel(atlas.lead));
    replaceText("[data-examples-atlas-scope]", learnerCheckraiseLabel(atlas.scope));
    replaceText("[data-examples-atlas-note]", learnerCheckraiseLabel(atlas.note));
    if (!structures.length) {
      host.append(makeElement("p", "examples-empty", "Примеры не загрузились. Обнови страницу или попробуй позже."));
      return;
    }

    const tabs = makeElement("div", "example-atlas-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Тип флопа");
    const panel = makeElement("div", "example-atlas-body");
    panel.id = "exampleAtlasPanel";
    panel.setAttribute("role", "tabpanel");
    const tabButtons = [];

    const renderStructure = (index) => {
      const structure = asObject(structures[index]);
      const structureLabel = learnerStructureLabel(structure.key, structure.label);
      const groups = asArray(structure.groups);
      panel.replaceChildren();
      panel.setAttribute("aria-labelledby", `exampleAtlasTab-${cleanText(structure.key) || index}`);

      const summary = makeElement("header", "example-atlas-summary");
      const summaryBoard = makeElement("div", "example-atlas-summary-board");
      summaryBoard.append(createExampleCards(
        structure.boardCards,
        `${structureLabel}: ${asArray(structure.boardCards).join(" ")}`,
        "board"
      ));
      const summaryCopy = makeElement("div", "example-atlas-summary-copy");
      summaryCopy.append(
        makeElement("p", "eyebrow", structureLabel),
        makeElement("h4", "", "Четыре границы решения"),
        makeElement(
          "p",
          "",
          learnerCheckraiseLabel(structure.description || "Сравни кандидатов на рейз с руками колла и паса.")
        )
      );
      summary.append(summaryBoard, summaryCopy);

      const buckets = makeElement("div", "example-atlas-buckets");
      const inspectorHost = makeElement("div", "example-atlas-inspector-host");
      inspectorHost.setAttribute("role", "status");
      inspectorHost.setAttribute("aria-live", "polite");
      inspectorHost.setAttribute("aria-atomic", "true");
      const handButtons = [];

      const selectHand = (button, group, hand) => {
        handButtons.forEach((candidate) => {
          const selected = candidate === button;
          candidate.classList.toggle("is-selected", selected);
          candidate.setAttribute("aria-pressed", String(selected));
        });
        inspectorHost.replaceChildren(createExampleAtlasInspector(structure, group, hand));
      };

      groups.forEach((groupData) => {
        const group = asObject(groupData);
        const roleLabel = learnerCheckraiseLabel(group.roleLabel || "Решение");
        const actionLabel = learnerCheckraiseLabel(group.actionLabel || "");
        const tone = atlasTone(group.roleKey);
        const bucket = makeElement("section", `example-atlas-bucket is-${tone}`);
        const head = makeElement("header", "example-atlas-bucket-head");
        head.append(
          makeElement("h5", "", roleLabel),
          makeElement("span", "", actionLabel)
        );
        const hands = makeElement("div", "example-atlas-hands");
        asArray(group.hands).forEach((handData) => {
          const hand = asObject(handData);
          const button = makeElement("button", "example-atlas-hand");
          button.type = "button";
          button.setAttribute("aria-pressed", "false");
          button.setAttribute(
            "aria-label",
            `${roleLabel}: ${hand.hand || asArray(hand.heroCards).join(" ")}. ${learnerCheckraiseLabel(hand.title || "")}`
          );
          button.append(createExampleCards(hand.heroCards, hand.hand || "Учебная рука", "mini"));
          button.addEventListener("click", () => selectHand(button, group, hand));
          handButtons.push(button);
          hands.append(button);
        });
        bucket.append(head, hands);
        buckets.append(bucket);
      });

      panel.append(summary, buckets, inspectorHost);
      const firstGroup = asObject(groups[0]);
      const firstHand = asObject(asArray(firstGroup.hands)[0]);
      if (handButtons[0] && Object.keys(firstHand).length) selectHand(handButtons[0], firstGroup, firstHand);
    };

    const activateStructure = (index, shouldFocus) => {
      const normalizedIndex = (index + structures.length) % structures.length;
      tabButtons.forEach((button, buttonIndex) => {
        const active = buttonIndex === normalizedIndex;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
      });
      renderStructure(normalizedIndex);
      if (shouldFocus) tabButtons[normalizedIndex]?.focus();
    };

    structures.forEach((structureData, index) => {
      const structure = asObject(structureData);
      const structureLabel = learnerStructureLabel(structure.key, structure.label);
      const button = makeElement("button", "example-atlas-tab");
      button.type = "button";
      button.id = `exampleAtlasTab-${cleanText(structure.key) || index}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", panel.id);
      button.setAttribute("aria-label", `${structureLabel}: ${asArray(structure.boardCards).join(" ")}`);
      const miniBoard = createExampleCards(structure.boardCards, structureLabel, "mini");
      button.append(miniBoard, makeElement("span", "", structureLabel || `Флоп ${index + 1}`));
      button.addEventListener("click", () => activateStructure(index, false));
      button.addEventListener("keydown", (event) => {
        const key = event.key;
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
        event.preventDefault();
        if (key === "Home") activateStructure(0, true);
        else if (key === "End") activateStructure(structures.length - 1, true);
        else activateStructure(index + (key === "ArrowRight" ? 1 : -1), true);
      });
      tabButtons.push(button);
      tabs.append(button);
    });

    host.append(tabs, panel);
    activateStructure(0, false);
  }

  function renderExamples() {
    const source = asObject(data.examples);
    const observedHost = $("[data-examples-league-one]");
    const atlasHost = $("[data-examples-atlas]");
    const valueHost = $("[data-examples-value]");
    const bluffHost = $("[data-examples-bluff]");
    if (!observedHost && !atlasHost && !valueHost && !bluffHost) return;
    replaceText("[data-examples-title]", source.title);
    replaceText("[data-examples-lead]", lessonKey === "flop-checkraise"
      ? "Реальные раздачи и учебные примеры по всем типам флопа."
      : source.lead);
    replaceText("[data-examples-note]", source.note);
    replaceText("[data-examples-method]", lessonKey === "flop-checkraise"
      ? "Сначала — реальные раздачи поля. Ниже — учебные примеры."
      : source.method);
    renderObservedLeagueOneExamples(observedHost, source.observedLeague1);
    renderExampleAtlas(atlasHost, source.boardAtlas);
    renderExampleGroup(valueHost, source.value, "value");
    renderExampleGroup(bluffHost, source.bluff, "bluff");
  }

  function currentPracticeSpot() {
    return state.practiceQueue[state.practiceIndex] || null;
  }

  function practiceGeneratorConfig() {
    return asObject(data.practiceGenerator);
  }

  function resolvePracticeGenerator() {
    const config = practiceGeneratorConfig();
    const globalName = cleanText(config.global);
    const generator = globalName ? root[globalName] : null;
    return generator && typeof generator.createSession === "function" ? generator : null;
  }

  function createPracticeSession() {
    const generator = resolvePracticeGenerator();
    if (!generator) return null;
    const session = generator.createSession();
    return session && typeof session.next === "function" ? session : null;
  }

  function nextGeneratedPracticeSpot() {
    if (!state.practiceSession || typeof state.practiceSession.next !== "function") return null;
    const spot = state.practiceSession.next();
    return spotErrors(spot, "generated practice").length ? null : spot;
  }

  function renderPracticeDepth() {
    $$("[data-practice-depth]").forEach((button) => {
      const active = cleanText(button.dataset.practiceDepth) === state.practiceDepth;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = state.practiceContinuationActive;
    });
  }

  function setPracticeDepth(depth) {
    const nextDepth = cleanText(depth);
    if (state.practiceContinuationActive || !["flop", "full"].includes(nextDepth)) return;
    state.practiceDepth = nextDepth;
    renderPracticeDepth();
    renderPracticeControls();
  }

  function practiceModes() {
    return asArray(data.practiceModes);
  }

  function activePracticeMode() {
    const modes = practiceModes();
    return modes.find((mode) => cleanText(mode?.key) === state.practiceMode) || modes[0] || null;
  }

  function practiceSource() {
    const catalog = asArray(data.practice);
    const mode = activePracticeMode();
    const ids = asArray(mode?.spotIds).map(cleanText).filter(Boolean);
    if (!ids.length) return catalog.slice();
    const byId = new Map(catalog.map((spot) => [cleanText(spot?.id), spot]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  function shuffledPractice() {
    const queue = practiceSource();
    for (let index = queue.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [queue[index], queue[swap]] = [queue[swap], queue[index]];
    }
    return queue;
  }

  function renderPracticeHud() {
    replaceText("[data-practice-hands]", state.stats.hands);
    replaceText("[data-practice-correct]", state.stats.correct);
    replaceText("[data-practice-mistakes]", state.stats.mistakes);
    replaceText("[data-practice-score]", `${state.stats.correct} / ${state.stats.hands}`);
    replaceText("[data-practice-xr-rate]", state.stats.hands ? formatPercent(state.stats.checkraises / state.stats.hands * 100) : "—");
    replaceText("[data-practice-missed-xr]", state.stats.missedXr);
    replaceText("[data-practice-extra-xr]", state.stats.extraXr);
    replaceText("[data-practice-reference]", practiceRateFeedback());
    const hud = $("[data-step=\"practice\"] .practice-hud");
    const total = Math.max(0, Number(state.stats.hands) || 0);
    const correctPercent = total ? Math.max(0, Math.min(100, state.stats.correct / total * 100)) : 0;
    const mistakePercent = total ? Math.max(0, Math.min(100, state.stats.mistakes / total * 100)) : 0;
    hud?.style.setProperty("--practice-correct-pct", `${correctPercent}%`);
    hud?.style.setProperty("--practice-mistake-pct", `${mistakePercent}%`);
  }

  function practiceRateFeedback() {
    return practiceRateFeedbackFor(activePracticeMode(), state.stats);
  }

  function revealPracticeNode(selector) {
    if (typeof root.matchMedia !== "function" || !root.matchMedia("(max-width: 900px)").matches) return;
    const node = $(selector);
    const behavior = root.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    node?.scrollIntoView?.({ behavior, block: "start" });
  }

  function practiceRateFeedbackFor(mode, stats) {
    const source = asObject(stats);
    if (!mode?.compareExpectedXr) return cleanText(mode?.reference);
    const hands = numberOrNull(source.hands) || 0;
    if (!hands) return "После первого ответа сравним твои X/R только с кандидатами, которые уже выпали; поле здесь не является целью.";
    const chosen = numberOrNull(source.checkraises) || 0;
    const expected = numberOrNull(source.expectedXr) || 0;
    const missed = numberOrNull(source.missedXr) || 0;
    const extra = numberOrNull(source.extraXr) || 0;
    const composition = `Пропущенных X/R: ${missed}; оптимистичных X/R: ${extra}.`;
    if (chosen < expected) return `Ниже учебной линии: выбрано X/R ${chosen}, а кандидатов уже выпало ${expected}. ${composition}`;
    if (chosen > expected) return `Выше базовой линии: выбрано X/R ${chosen}, а базовых кандидатов уже выпало ${expected}. ${composition} Такой эксплойт допустим при уверенном риде на оверфолд.`;
    if (missed || extra) return `По частоте — как в базовой линии (${chosen} X/R из ${hands}), но состав отличается. ${composition}`;
    return `В учебной линии: выбрано X/R ${chosen} из ${hands}, ровно столько кандидатов уже выпало.`;
  }

  function renderPracticeModeSetup() {
    const modes = practiceModes();
    if (!modes.length) return;
    if (!modes.some((mode) => cleanText(mode?.key) === state.practiceMode)) {
      state.practiceMode = cleanText(modes[0]?.key);
    }
    const mode = activePracticeMode();
    $$('[data-practice-mode]').forEach((button) => {
      const active = cleanText(button.dataset.practiceMode) === state.practiceMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    replaceText("[data-practice-mode-title]", mode?.label);
    replaceText("[data-practice-mode-description]", mode?.description);
    replaceText("[data-practice-mode-reference]", mode?.reference);
  }

  function renderPracticeFeedback() {
    const host = $("[data-practice-feedback]");
    const spot = currentPracticeSpot();
    const practiceMeta = asObject(spot?.practiceMeta);
    const generated = practiceMeta.generated === true;
    const compact = Boolean(asObject(data.practicePresentation).compactFeedback);
    if (!host || !spot) return;
    if (!state.practiceAnswered) {
      if (generated) {
        const foldRead = asObject(practiceMeta.foldRead);
        feedbackShell(
          host,
          "is-neutral",
          cleanText(foldRead.label) || "У соперника есть фолды",
          "Не надо рейзить всё",
          cleanText(foldRead.copy)
            || "Сильное вэлью и лучшие дро отправляй в чек-рейз, средние руки коллируй, слабый воздух выбрасывай."
        );
        return;
      }
      feedbackShell(
        host,
        "is-neutral",
        compact ? "Твой ход" : "Решение за столом",
        compact ? "Что делаешь?" : spot.question,
        compact ? "Выбери действие под столом." : (spot.context || "Выбери действие под столом. После ответа появится разбор.")
      );
      return;
    }
    const chosen = optionFor(spot, state.practiceChoice);
    const expected = correctOption(spot);
    const outcome = decisionOutcomeFor(chosen, expected);
    const correct = outcome === "correct";
    const alternative = outcome === "alternative";
    const missedXr = !correct && expected?.key === "checkraise";
    if (generated) {
      const semanticOutcome = cleanText(chosen?.outcome)
        || (correct && chosen?.key === "checkraise"
          ? "xr-ok"
          : alternative
            ? "loose-xr"
            : missedXr
              ? "missed-xr"
              : correct
                ? "correct"
                : "wrong");
      const verdict = {
        "xr-ok": {
          tone: "is-correct",
          kicker: "Верно · давление с планом",
          title: "Чек-рейз — ок"
        },
        "loose-xr": {
          tone: "is-alternative",
          kicker: "Эксплойт, но не база",
          title: "Лузовый чек-рейз"
        },
        "mix-xr": {
          tone: "is-alternative",
          kicker: "Допустимый микс",
          title: "Чек-рейз — тоже ок"
        },
        "missed-xr": {
          tone: "is-wrong",
          kicker: "Фолд-эквити осталось неиспользованным",
          title: "Очевидно пропущенный чек-рейз"
        },
        correct: {
          tone: "is-correct",
          kicker: "Верно · диапазон не обязан рейзить всё",
          title: chosen?.key === "fold" ? "Фолд — ок" : "Колл — ок"
        },
        wrong: {
          tone: "is-wrong",
          kicker: `Лучше: ${expected?.label || "другая линия"}`,
          title: "Линия не подходит"
        }
      }[semanticOutcome] || {
        tone: correct ? "is-correct" : alternative ? "is-alternative" : "is-wrong",
        kicker: correct ? "Верно" : alternative ? "Эксплойт, но не база" : `Лучше: ${expected?.label || "другая линия"}`,
        title: correct ? "Решение — ок" : alternative ? "Лузовый чек-рейз" : "Линия не подходит"
      };
      feedbackShell(
        host,
        verdict.tone,
        verdict.kicker,
        verdict.title,
        cleanText(chosen?.feedback || practiceMeta.reason || spot.answer || "Сравни линию с разбором урока.").replace(/^Верно:\s*/i, "")
      );
      return;
    }
    const kicker = correct
      ? "Верно"
      : alternative
        ? "Допустимый эксплойт"
        : missedXr
          ? "Пропущен чек-рейз"
          : `Промах · нужно: ${expected?.label || "другое действие"}`;
    feedbackShell(
      host,
      correct ? "is-correct" : alternative ? "is-alternative" : "is-wrong",
      compact ? kicker : correct ? "Верно" : alternative ? "Допустимый эксплойт · при большом оверфолде" : missedXr ? "Пропущен check-raise" : "Промах",
      compact ? (spot.title || "Разбор решения") : correct ? (spot.title || "Решение совпало") : alternative ? `База дисциплинированнее: ${expected?.label || "—"}` : `Нужно: ${expected?.label || "—"}`,
      compact
        ? cleanText(chosen?.feedback || spot.answer || "Сравни линию с разбором урока.").replace(/^Верно:\s*/i, "")
        : chosen?.feedback || spot.answer || "Сравни линию с разбором урока."
    );
    if (!compact && cleanText(spot.answer) && cleanText(spot.answer) !== cleanText(chosen?.feedback)) {
      host.append(makeElement("p", "feedback-answer", spot.answer));
    }
  }

  function destroyPracticeContinuation() {
    state.practiceContinuation?.destroy?.();
    state.practiceContinuation = null;
    state.practiceContinuationActive = false;
  }

  function appendPracticeContinuationControls(host, spot) {
    if ($("[data-practice-next-external]") || !host || !spot?.continuation || !state.practiceAnswered) return;
    const controls = host.querySelector(".client-controls");
    if (!controls) return;
    const continuationUi = asObject(spot.continuation.ui);
    const row = makeElement("div", "practice-next-row continuation-launch-row");
    const launch = makeElement(
      "button",
      "practice-next-button continuation-launch-button",
      continuationUi.launchLabel
        || (state.practiceChoice === "checkraise" ? "Доиграть до showdown" : "Разобрать X/R-ветку до showdown")
    );
    launch.type = "button";
    launch.dataset.practiceContinuation = "";
    const skip = makeElement("button", "practice-next-button continuation-skip-button", "Следующая раздача");
    skip.type = "button";
    skip.dataset.practiceNext = "";
    row.append(launch, skip);
    controls.append(row);
  }

  function renderPracticeControls() {
    const spot = currentPracticeSpot();
    const next = $("[data-practice-next-external]");
    const continuation = $("[data-practice-continuation-external]");
    const footer = $(".practice-trainer-footer");
    const depthAware = Boolean($("[data-practice-depth]"));
    const canContinue = Boolean(
      state.practiceAnswered
      && spot?.continuation
      && (!depthAware || state.practiceDepth === "full")
      && (!depthAware || state.practiceChoice !== "fold")
    );
    if (footer) footer.hidden = state.practiceContinuationActive;
    if (next) {
      next.hidden = depthAware && canContinue && !state.practiceContinuationActive;
      next.disabled = !state.practiceAnswered || state.practiceContinuationActive;
      next.textContent = "Следующая ситуация";
    }
    if (continuation) {
      continuation.hidden = !canContinue || state.practiceContinuationActive;
      continuation.textContent = "Продолжить раздачу";
      continuation.classList.toggle("is-primary", canContinue);
      continuation.classList.toggle("is-secondary", !canContinue);
    }
    $$("[data-practice-mode], [data-practice-depth], [data-practice-reset]").forEach((control) => {
      control.disabled = state.practiceContinuationActive;
    });
    renderPracticeDepth();
  }

  function startPracticeContinuation() {
    const spot = currentPracticeSpot();
    const host = $("[data-practice-table]");
    if (
      !spot?.continuation
      || !host
      || !state.practiceAnswered
      || state.practiceContinuationActive
      || ($("[data-practice-depth]") && state.practiceDepth !== "full")
    ) return;
    if (typeof root.FFTrainerSimulator?.mountContinuation !== "function") {
      feedbackShell($("[data-practice-feedback]"), "is-wrong", "Продолжение не загрузилось", "Обновите страницу", "Shared continuation controller недоступен.");
      return;
    }
    destroyPracticeContinuation();
    state.practiceContinuationActive = true;
    renderPracticeControls();
    const coach = $("[data-practice-feedback]");
    const continuationUi = asObject(spot.continuation.ui);
    const hasContinuationUi = Object.keys(continuationUi).length > 0;
    const compact = Boolean(asObject(data.practicePresentation).compactFeedback);
    const chosen = optionFor(spot, state.practiceChoice);
    const villain = cleanText(spot.table?.actionLine?.[1]).split(" ")[0] || "Соперник";
    const continuationTitle = cleanText(chosen?.continuationTitle)
      || (state.practiceChoice === "fold"
        ? "Ты выбросил — раздача закончилась"
        : state.practiceChoice === "call"
          ? `${villain} получил колл`
          : `${villain} отвечает на чек-рейз`);
    feedbackShell(
      coach,
      "is-neutral",
      continuationUi.coachEyebrow
        || (compact ? "Продолжение · без счёта" : "Свободное доигрывание · без дополнительного счёта"),
      continuationUi.coachTitle || continuationTitle,
      continuationUi.coachCopy
        || cleanText(chosen?.continuationCopy)
        || (compact
          ? "Если раздача продолжается, выбери линию на тёрне и ривере."
          : "Следующие решения не меняют оценку флопа. В конце увидишь реакцию соперника и итог линии.")
    );
    state.practiceContinuation = root.FFTrainerSimulator.mountContinuation(host, spot, {
      rootOptionKey: state.practiceChoice,
      positionLabels: { UTG: "EP", LJ: "MP" },
      decimalComma: true,
      completeLabel: "Следующая ситуация",
      onComplete(payload) {
        const result = payload?.result || {};
        feedbackShell(
          coach,
          hasContinuationUi ? "is-correct" : "is-neutral",
          continuationUi.completeEyebrow || "Шоудаун · диапазон стал конкретным",
          continuationUi.completeTitle || "Флоп уже оценён",
          continuationUi.completeCopy
            || (hasContinuationUi
              ? result.summary || "Теперь видна вся учебная линия и конкретная рука соперника."
              : "Итог раздачи показан на столе. Он не добавляет и не снимает баллы за первое решение.")
        );
      },
      onExit() {
        nextPractice();
      }
    });
  }

  function renderPracticeSpot() {
    const spot = currentPracticeSpot();
    const host = $("[data-practice-table]");
    if (!spot || !host) return;
    renderDecision(host, spot, state.practiceChoice, {
      hideActionStatus: false,
      nextLabel: $("[data-practice-next-external]") ? "" : state.practiceAnswered && !spot.continuation ? "Следующая раздача" : "",
      errorPrefix: `practice[${state.practiceIndex}]`
    });
    appendPracticeContinuationControls(host, spot);
    renderPracticeFeedback();
    renderPracticeHud();
    renderPracticeControls();
    try {
      root.FFFieldLessonPracticeExtension?.renderAfterDecision?.({
        spot,
        answered: state.practiceAnswered,
        choice: state.practiceChoice,
        stats: { ...state.stats }
      });
    } catch (error) {
      console.warn("Practice extension failed", error);
    }
  }

  function startPractice() {
    const restarting = state.practiceStarted;
    const generatorConfigured = Boolean(Object.keys(practiceGeneratorConfig()).length);
    let session = null;
    let queue = [];
    try {
      session = createPracticeSession();
      const generatedSpot = session ? (() => {
        state.practiceSession = session;
        return nextGeneratedPracticeSpot();
      })() : null;
      queue = generatedSpot ? [generatedSpot] : shuffledPractice();
    } catch (error) {
      session = null;
      queue = [];
    }
    if (generatorConfigured && (!session || !queue.length)) {
      state.practiceSession = null;
      showDataError([...validation.errors, "генератор бесконечной практики не загрузился"]);
      return;
    }
    if (!queue.length) {
      showDataError([...validation.errors, "практика пока недоступна"]);
      return;
    }
    if (!session && !state.practiceContinuationIntroduced) {
      const continuationIndex = queue.findIndex((spot) => spot?.continuation);
      if (continuationIndex > 0) [queue[0], queue[continuationIndex]] = [queue[continuationIndex], queue[0]];
      state.practiceContinuationIntroduced = continuationIndex >= 0;
    }
    state.practiceSession = session;
    state.practiceQueue = queue;
    state.practiceIndex = 0;
    state.practiceChoice = "";
    state.practiceAnswered = false;
    destroyPracticeContinuation();
    state.practiceStarted = true;
    state.stats = { hands: 0, correct: 0, mistakes: 0, checkraises: 0, expectedXr: 0, missedXr: 0, extraXr: 0 };
    const setup = $("[data-practice-setup]");
    const run = $("[data-practice-run]");
    if (setup) setup.hidden = true;
    if (run) run.hidden = false;
    renderPracticeSpot();
    root.requestAnimationFrame(() => {
      $("[data-practice-table] .table-action")?.focus({ preventScroll: true });
      if (restarting) revealPracticeNode("[data-practice-table]");
    });
  }

  function answerPractice(key) {
    const spot = currentPracticeSpot();
    const chosen = optionFor(spot, key);
    if (!spot || !chosen || state.practiceAnswered) return;
    state.practiceChoice = key;
    state.practiceAnswered = true;
    state.stats.hands += 1;
    const expected = correctOption(spot);
    const outcome = decisionOutcomeFor(chosen, expected);
    if (outcome === "correct" || chosen?.acceptableMix === true) state.stats.correct += 1;
    if (outcome === "wrong") state.stats.mistakes += 1;
    if (key === "checkraise") state.stats.checkraises += 1;
    if (expected?.key === "checkraise") state.stats.expectedXr += 1;
    if (expected?.key === "checkraise" && key !== "checkraise") state.stats.missedXr += 1;
    if (expected?.key !== "checkraise" && key === "checkraise" && chosen?.acceptableMix !== true) state.stats.extraXr += 1;
    renderPracticeSpot();
    root.requestAnimationFrame(() => {
      const continuation = $("[data-practice-continuation-external]");
      const next = $("[data-practice-next-external]");
      const target = continuation && !continuation.hidden
        ? continuation
        : next && !next.hidden
          ? next
          : $("[data-practice-table] [data-practice-next]");
      target?.focus({ preventScroll: true });
      revealPracticeNode("[data-practice-feedback]");
    });
  }

  function nextPractice() {
    if (!state.practiceAnswered || !state.practiceQueue.length) return;
    destroyPracticeContinuation();
    if (state.practiceSession) {
      const generatedSpot = nextGeneratedPracticeSpot();
      if (!generatedSpot) {
        showDataError([...validation.errors, "генератор не смог собрать следующую ситуацию"]);
        return;
      }
      state.practiceQueue = [generatedSpot];
      state.practiceIndex = 0;
    } else {
      state.practiceIndex += 1;
      if (state.practiceIndex >= state.practiceQueue.length) state.practiceQueue = shuffledPractice();
      state.practiceIndex %= state.practiceQueue.length;
    }
    state.practiceChoice = "";
    state.practiceAnswered = false;
    renderPracticeSpot();
    root.requestAnimationFrame(() => {
      $("[data-practice-table] .table-action")?.focus({ preventScroll: true });
      revealPracticeNode("[data-practice-table]");
    });
  }

  function stopPractice() {
    destroyPracticeContinuation();
    state.practiceStarted = false;
    state.practiceSession = null;
    state.practiceQueue = [];
    state.practiceChoice = "";
    state.practiceAnswered = false;
    try {
      root.FFFieldLessonPracticeExtension?.renderAfterDecision?.({ answered: false, spot: null, choice: "", stats: { ...state.stats } });
    } catch (error) {
      console.warn("Practice extension failed", error);
    }
    const run = $("[data-practice-run]");
    const setup = $("[data-practice-setup]");
    if (setup) {
      if (run) run.hidden = true;
      setup.hidden = false;
      $("[data-practice-start]")?.focus({ preventScroll: true });
      return;
    }
    startPractice();
  }

  function setupDecisionEvents() {
    $("[data-intro-table]")?.addEventListener("click", (event) => {
      const action = event.target.closest("[data-option-key]");
      if (action) answerFirst(action.dataset.optionKey);
    });
    $("[data-practice-table]")?.addEventListener("click", (event) => {
      if (event.target.closest("[data-practice-continuation]")) {
        startPracticeContinuation();
        return;
      }
      if (event.target.closest("[data-practice-next]")) {
        nextPractice();
        return;
      }
      const action = event.target.closest("[data-option-key]");
      if (action) answerPractice(action.dataset.optionKey);
    });
    $$("[data-practice-mode]").forEach((button) => button.addEventListener("click", () => {
      state.practiceMode = cleanText(button.dataset.practiceMode);
      renderPracticeModeSetup();
      if (state.practiceStarted && asObject(data.practicePresentation).autoStart) startPractice();
    }));
    $$("[data-practice-depth]").forEach((button) => button.addEventListener("click", () => {
      setPracticeDepth(button.dataset.practiceDepth);
    }));
    $("[data-practice-start]")?.addEventListener("click", startPractice);
    $("[data-practice-stop]")?.addEventListener("click", stopPractice);
    $("[data-practice-reset]")?.addEventListener("click", startPractice);
    $("[data-practice-next-external]")?.addEventListener("click", nextPractice);
    $("[data-practice-continuation-external]")?.addEventListener("click", startPracticeContinuation);
  }

  function restoreProgress() {
    const saved = readProgress();
    if (saved.unlocked) unlockSteps();
    const legacyVs3Field = lessonKey === "vs-3bet-defense" && saved.step === "leaks" && STEP_ORDER.includes("field");
    const requestedVs3Field = lessonKey === "vs-3bet-defense"
      && new URLSearchParams(root.location.search).has("regView")
      && STEP_ORDER.includes("field");
    if (legacyVs3Field) root.FFVs3BetFieldExplorer?.showView?.("errors", { updateUrl: false });
    const savedStep = legacyVs3Field ? "field" : saved.step;
    const next = state.unlocked && requestedVs3Field
      ? "field"
      : state.unlocked && STEP_ORDER.includes(savedStep) ? savedStep : "deal";
    showStep(next, { instant: true });
  }

  function initialize() {
    const defaultDepth = cleanText(practiceGeneratorConfig().defaultDepth);
    state.practiceDepth = ["flop", "full"].includes(defaultDepth) ? defaultDepth : "flop";
    applyMeta();
    renderWisdom();
    renderField();
    renderExamples();
    renderFirstDecision();
    renderPracticeModeSetup();
    renderPracticeDepth();
    setupNavigation();
    setupWisdom();
    setupDecisionEvents();
    restoreProgress();
    if (validation.errors.length) showDataError(validation.errors);
  }

  root.FFPokerFieldLesson = Object.freeze({
    schemaVersion: 1,
    lessonKey,
    validateData,
    decisionOutcomeFor,
    practiceRateFeedbackFor,
    showStep
  });

  initialize();
})();
