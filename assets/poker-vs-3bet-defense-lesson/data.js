(function () {
  "use strict";

  const rawFieldData = window.FF_VS3BET_FIELD_DATA;
  const fieldData = window.FFVs3BetFieldDataReadiness?.ready ? rawFieldData : null;
  const preflopPotBb = window.FFTrainerSimulatorSnapshot?.preflopPotBb;
  if (typeof preflopPotBb !== "function") throw new Error("Shared preflop chip model is required");

  const seats = (heroPosition, stackBb) => ["UTG", "HJ", "CO", "BTN", "SB", "BB"].map((label) => ({
    label,
    state: label === heroPosition ? "hero" : /SB|BB/.test(label) ? "blind" : "waiting",
    stackBb
  }));

  const spot = ({ id, title, hand, cards, heroPosition, villainPosition, stack, openTo, toCall, currentBet, actionLine, historyLine, question, answer, correct, options }) => ({
    id,
    title,
    hand,
    question,
    answer,
    context: "Ты уже открылся. Учти позицию, размер 3-бета и эффективный стек.",
    table: {
      seats: seats(heroPosition, stack),
      heroPosition,
      heroStack: `${stack} BB`,
      effectiveStack: `${stack} BB`,
      pot: `${preflopPotBb({
        anteBb: 1,
        contributions: [
          { position: heroPosition, amountBb: openTo },
          { position: villainPosition, amountBb: currentBet }
        ]
      })} BB`,
      anteBb: 1,
      heroCards: cards,
      boardCards: [],
      street: "preflop",
      actionLine,
      historyLine,
      toCall,
      currentBet,
      dealerPosition: "BTN"
    },
    options: options.map((option) => ({ ...option, correct: option.key === correct }))
  });

  const intro = spot({
    id: "intro-98s-co-vs-btn",
    title: "98s после опена CO",
    hand: "98s",
    cards: ["9c", "8c"],
    heroPosition: "CO",
    villainPosition: "BTN",
    stack: 40,
    openTo: 2.2,
    toCall: 4.8,
    currentBet: 7,
    actionLine: ["UTG fold", "HJ fold", "CO open 2.2 BB", "BTN raise to 7 BB", "SB fold", "BB fold"],
    historyLine: "CO открыл 2,2 BB · BTN 3-бет до 7 BB",
    question: "98s без позиции против 3-бета BTN на 40 BB: пас или защита?",
    answer: "Нет. Базовая линия — колл: референсный чарт продолжает с 98s коллом в 79,4% случаев. Автоматический пас здесь отдаёт слишком много банков на 3-бет.",
    correct: "call",
    options: [
      { key: "fold", label: "Пас", feedback: "Слишком тайтово: 98s — не автоматический пас. В этом узле рука продолжает коллом в 79,4% случаев." },
      { key: "call", label: "Колл", feedback: "Верно: колл — главная линия с частотой 79,4%. Связность и одномастность помогают реализовать эквити постфлоп." },
      { key: "fourbet", label: "4-бет до 17 BB", acceptableMix: true, feedback: "Допустимый редкий микс около 3,8%, но базовая линия с 98s — колл." },
      { key: "jam", label: "Олл-ин 40 BB", feedback: "Пуш встречается лишь примерно в 1,5% случаев и не является основной линией на 40 BB." }
    ]
  });

  const fallbackPractice = [
    spot({
      id: "practice-aa-hj-vs-co", title: "Натсовая часть", hand: "AA", cards: ["As", "Ad"], heroPosition: "HJ", stack: 50,
      villainPosition: "CO", openTo: 2.2, toCall: 5.3, currentBet: 7.5,
      actionLine: ["UTG fold", "HJ open 2.2 BB", "CO raise to 7.5 BB", "BTN fold", "SB fold", "BB fold"],
      historyLine: "HJ открыл · CO 3-бет 3,4x",
      question: "HJ открыл AA и получил 3-бет CO. Что делает верх диапазона защиты?",
      answer: "AA строят вэлью уже сейчас: стандартный 4-бет оставляет сопернику возможность продолжить с худшими руками.",
      correct: "fourbet",
      options: [
        { key: "fold", label: "Пас", feedback: "AA никогда не уходят в пас в обычном споте против 3-бета." },
        { key: "call", label: "Колл", feedback: "Слоуплей возможен редко, но не должен заменять основной вэлью-4-бет." },
        { key: "fourbet", label: "4-бет до 18 BB", feedback: "Верно: верх диапазона получает вэлью и защищает блефовую часть 4-бета." },
        { key: "jam", label: "Олл-ин 50 BB", feedback: "Пуш перегружает размер и чаще оставляет сопернику только сильные продолжения." }
      ]
    }),
    spot({
      id: "practice-76s-hj-vs-bb", title: "Большой сайз без позиции", hand: "76s", cards: ["7s", "6s"], heroPosition: "HJ", stack: 30,
      villainPosition: "BB", openTo: 2.2, toCall: 7.8, currentBet: 10,
      actionLine: ["UTG fold", "HJ open 2.2 BB", "CO fold", "BTN fold", "SB fold", "BB raise to 10 BB"],
      historyLine: "HJ открыл · BB 3-бет 4,5x · 30 BB",
      question: "HJ открыл 76s, BB сделал крупный 3-бет, эффективный стек 30 BB. Что важнее красивой одномастности?",
      answer: "Пас. Цена колла высокая, позиционного преимущества недостаточно, а короткий остаток стека ухудшает реализацию пограничного коннектора.",
      correct: "fold",
      options: [
        { key: "fold", label: "Пас", feedback: "Верно: большой сайз и 30 BB сдвигают нижнюю границу продолжения вверх." },
        { key: "call", label: "Колл", feedback: "Одномастность не компенсирует дорогой колл и низкий SPR после флопа." },
        { key: "fourbet", label: "4-бет до 21 BB", feedback: "Такой 4-бет почти коммитит стек без достаточной силы или надёжного read." },
        { key: "jam", label: "Олл-ин 30 BB", feedback: "Для автоматического пуша 76s не хватает блокеров и силы против продолжения BB." }
      ]
    }),
    spot({
      id: "practice-aqs-btn-vs-sb", title: "Позиция сохраняет колл", hand: "AQs", cards: ["Ah", "Qh"], heroPosition: "BTN", stack: 60,
      villainPosition: "SB", openTo: 2, toCall: 6, currentBet: 8,
      actionLine: ["UTG fold", "HJ fold", "CO fold", "BTN open 2 BB", "SB raise to 8 BB", "BB fold"],
      historyLine: "BTN открыл · SB 3-бет 4x · 60 BB",
      question: "BTN открыл AQs, SB сделал 3-бет до 8 BB. Какая линия сохраняет позицию и глубину?",
      answer: "Колл — надёжная базовая линия: AQs хорошо реализует эквити в позиции и не обязана превращаться в 4-бет во всём диапазоне.",
      correct: "call",
      options: [
        { key: "fold", label: "Пас", feedback: "AQs слишком сильна для паса против блайнда после позднего опена." },
        { key: "call", label: "Колл", feedback: "Верно: позиция и 60 BB оставляют пространство для игры после флопа." },
        { key: "fourbet", label: "4-бет до 19 BB", feedback: "4-бет может быть частью микса, но не обязан вытеснять сильный позиционный колл." },
        { key: "jam", label: "Олл-ин 60 BB", feedback: "Пуш рискует слишком глубоко и изолируется против верхней части продолжения." }
      ]
    })
  ];

  const rangeModel = window.FF_VS3BET_RANGE_MODEL || null;
  const continuationRegistry = window.FF_VS3BET_CONTINUATIONS || null;
  const generatedSelections = new Map();
  const generatedSeatOrder = ["UTG", "MP", "HJ", "CO", "BTN", "SB", "BB"];
  const actionLabels = {
    fold: "Пас",
    call: "Колл",
    fourbet: "4-бет",
    jam: "4-бет пуш"
  };
  const actionPriority = ["jam", "fourbet", "call", "fold"];

  const openCandidateHands = {
    EP: "AA KK QQ JJ TT 99 88 77 66 55 44 33 22 AKs AQs AJs ATs A9s A8s A7s A6s A5s A4s A3s A2s KQs KJs KTs QJs QTs JTs T9s 98s 87s 76s 65s 54s AKo AQo KQo",
    MP: "AA KK QQ JJ TT 99 88 77 66 55 44 33 22 AKs AQs AJs ATs A9s A8s A7s A6s A5s A4s A3s A2s KQs KJs KTs K9s QJs QTs Q9s JTs J9s T9s 98s 87s 76s 65s 54s AKo AQo AJo KQo",
    HJ: "AA KK QQ JJ TT 99 88 77 66 55 44 33 22 AKs AQs AJs ATs A9s A8s A7s A6s A5s A4s A3s A2s KQs KJs KTs K9s K8s QJs QTs Q9s Q8s JTs J9s J8s T9s T8s 98s 97s 87s 86s 76s 65s 54s AKo AQo AJo ATo KQo KJo QJo",
    CO: "AA KK QQ JJ TT 99 88 77 66 55 44 33 22 AKs AQs AJs ATs A9s A8s A7s A6s A5s A4s A3s A2s KQs KJs KTs K9s K8s K7s K6s QJs QTs Q9s Q8s Q7s JTs J9s J8s J7s T9s T8s T7s 98s 97s 96s 87s 86s 76s 75s 65s 64s 54s AKo AQo AJo ATo KQo KJo KTo QJo QTo JTo",
    BTN: "AA KK QQ JJ TT 99 88 77 66 55 44 33 22 AKs AQs AJs ATs A9s A8s A7s A6s A5s A4s A3s A2s KQs KJs KTs K9s K8s K7s K6s K5s QJs QTs Q9s Q8s Q7s Q6s JTs J9s J8s J7s J6s T9s T8s T7s T6s 98s 97s 96s 87s 86s 85s 76s 75s 65s 64s 54s AKo AQo AJo ATo A9o KQo KJo KTo QJo QTo JTo",
    SB: "AA KK QQ JJ TT 99 88 77 66 55 44 33 22 AKs AQs AJs ATs A9s A8s A7s A6s A5s A4s A3s A2s KQs KJs KTs K9s K8s K7s K6s K5s QJs QTs Q9s Q8s Q7s Q6s JTs J9s J8s J7s J6s T9s T8s T7s T6s 98s 97s 96s 87s 86s 85s 76s 75s 65s 64s 54s AKo AQo AJo ATo A9o KQo KJo KTo QJo QTo JTo"
  };

  const actionCandidates = {
    fold: "KQo AJo ATo KJo QJo JTo KTo QTo K6s Q7s J7s T7s 97s 86s 76s 65s 54s 44 33 22",
    call: "AJs KQs JJ TT 99 88 QJs JTs T9s 98s 87s 76s 65s 54s A5s KTs",
    fourbet: "AKo AKs QQ KK AA AQo AQs JJ TT A5s",
    jam: "AKo AKs QQ KK AA JJ TT AQs A5s"
  };

  function splitHands(value) {
    return String(value || "").trim().split(/\s+/).filter(Boolean);
  }

  function unique(values) {
    return values.filter((value, index, rows) => rows.indexOf(value) === index);
  }

  function parsePracticeId(id) {
    const match = /^vs3-(ep|mp|hj|co|btn|sb)-(ip|oop)-(20_30|31_50|51_80|80_plus)-(2_5|3|4)x-v([12])$/.exec(String(id || ""));
    if (!match) throw new Error(`Unexpected vs3 practice id: ${id}`);
    const stackBySlug = { "20_30": "20-30", "31_50": "31-50", "51_80": "51-80", "80_plus": "80+" };
    return {
      id,
      position: match[1].toUpperCase(),
      relation: match[2].toUpperCase(),
      stack: stackBySlug[match[3]],
      size: Number(match[4].replace("_", ".")),
      variant: Number(match[5])
    };
  }

  function handClass(hand) {
    if (hand.length === 2) return "pair";
    if (hand.startsWith("A") && hand.endsWith("s")) return "suited-ace";
    if (hand.endsWith("o")) return "offsuit";
    if (/^[AKQJ][AKQJT]/.test(hand)) return "suited-broadway";
    const ranks = rangeModel?.ranks || ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
    const gap = Math.abs(ranks.indexOf(hand[0]) - ranks.indexOf(hand[1]));
    return gap <= 2 ? "suited-connector" : "other-suited";
  }

  function dominantAction(cell) {
    return actionPriority.reduce((best, action) => (
      Number(cell?.[action] || 0) > Number(cell?.[best] || 0) ? action : best
    ), "fold");
  }

  function rotated(values, offset) {
    if (!values.length) return values;
    const start = Math.abs(offset) % values.length;
    return [...values.slice(start), ...values.slice(0, start)];
  }

  function choosePracticeHand(config, scenario, comboIndex) {
    const comboKey = `${config.position}:${config.relation}:${config.stack}:${config.size}`;
    const prior = generatedSelections.get(comboKey) || null;
    if (config.id === "vs3-btn-ip-51_80-4x-v1") {
      const forced = {
        hand: "AJs",
        action: dominantAction(scenario.cells.AJs),
        className: handClass("AJs")
      };
      generatedSelections.set(comboKey, forced);
      return forced;
    }

    const actionOrder = config.stack === "20-30"
      ? ["jam", "call", "fold", "fourbet"]
      : ["call", "fourbet", "fold"];
    const preferredIndex = (comboIndex + config.variant - 1) % actionOrder.length;
    const preferredActions = rotated(actionOrder, preferredIndex);
    const openPool = splitHands(openCandidateHands[config.position]);

    function candidates(action, minimum) {
      const ordered = unique([...splitHands(actionCandidates[action]), ...openPool])
        .filter((hand) => openPool.includes(hand) && scenario.cells[hand])
        .filter((hand) => dominantAction(scenario.cells[hand]) === action)
        .filter((hand) => Number(scenario.cells[hand][action]) >= minimum)
        .filter((hand) => !prior || hand !== prior.hand);
      const diverse = prior ? ordered.filter((hand) => handClass(hand) !== prior.className) : ordered;
      return rotated(diverse.length ? diverse : ordered, comboIndex + config.variant);
    }

    for (const minimum of [60, 55, 50]) {
      for (const action of preferredActions) {
        const candidate = candidates(action, minimum)[0];
        if (!candidate) continue;
        const selected = { hand: candidate, action, className: handClass(candidate) };
        generatedSelections.set(comboKey, selected);
        return selected;
      }
    }

    const fallback = openPool.find((hand) => (
      scenario.cells[hand]
      && (!prior || (hand !== prior.hand && handClass(hand) !== prior.className))
    )) || openPool.find((hand) => hand !== prior?.hand) || "AA";
    const selected = {
      hand: fallback,
      action: dominantAction(scenario.cells[fallback]),
      className: handClass(fallback)
    };
    generatedSelections.set(comboKey, selected);
    return selected;
  }

  function cardsForHand(hand) {
    if (hand.length === 2) return [`${hand[0]}c`, `${hand[1]}h`];
    if (hand.endsWith("s")) return [`${hand[0]}h`, `${hand[1]}h`];
    return [`${hand[0]}s`, `${hand[1]}h`];
  }

  function heroTablePosition(position) {
    return position === "EP" ? "UTG" : position;
  }

  function villainTablePosition(position, relation) {
    if (relation === "IP") return "SB";
    return { EP: "HJ", MP: "CO", HJ: "BTN", CO: "BTN", SB: "BB" }[position] || "BTN";
  }

  function generatedSeats(heroPosition, villainPosition, stackBb) {
    return generatedSeatOrder.map((label) => ({
      label,
      state: label === heroPosition
        ? "hero"
        : label === villainPosition
          ? (/SB|BB/.test(label) ? "blind" : "waiting")
          : "folded",
      stackBb
    }));
  }

  function roundOne(value) {
    return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
  }

  function formatBb(value) {
    return String(roundOne(value)).replace(".", ",");
  }

  function formatFrequency(value) {
    const rounded = Math.round(Number(value || 0) * 10) / 10;
    return `${String(rounded).replace(".", ",")}%`;
  }

  function acceptableActionsFor(cell, correctAction) {
    const bestFrequency = Number(cell?.[correctAction] || 0);
    return actionPriority.filter((action) => (
      action === correctAction
      || (Number(cell?.[action] || 0) >= 25 && bestFrequency - Number(cell?.[action] || 0) <= 50)
    ));
  }

  function feedbackFor(action, correctAction, acceptableActions, cell, config) {
    const selected = actionLabels[action];
    const correct = actionLabels[correctAction];
    if (action === correctAction) {
      const relationCopy = config.relation === "IP"
        ? "Позиция помогает реализовать эквити."
        : "Без позиции граница продолжения уже строже.";
      return `Верно: ${selected.toLowerCase()} — главная учебная линия (${formatFrequency(cell[action])}). ${relationCopy}`;
    }
    if (acceptableActions.includes(action)) {
      return `Допустимая часть микса: ${selected.toLowerCase()} ${formatFrequency(cell[action])}; чаще — ${correct.toLowerCase()} ${formatFrequency(cell[correctAction])}.`;
    }
    return `${selected} получает ${formatFrequency(cell[action])}; главная линия здесь — ${correct.toLowerCase()} (${formatFrequency(cell[correctAction])}).`;
  }

  function generatedSpot(config, comboIndex) {
    const scenario = rangeModel.scenario({
      position: config.position,
      relation: config.relation,
      stack: config.stack,
      size: config.size,
      cohort: "reference"
    });
    const selected = choosePracticeHand(config, scenario, comboIndex);
    const cell = scenario.cells[selected.hand];
    const correctAction = dominantAction(cell);
    const acceptableActions = acceptableActionsFor(cell, correctAction);
    const stack = rangeModel.stacks.find((item) => item.key === config.stack);
    const stackBb = Number(stack?.sampleBb || 40);
    const heroPosition = heroTablePosition(config.position);
    const villainPosition = villainTablePosition(config.position, config.relation);
    const openTo = 2;
    const threeBetTo = roundOne(openTo * config.size);
    const toCall = roundOne(threeBetTo - openTo);
    const fourBetTo = roundOne(Math.min(stackBb - 1, Math.max(threeBetTo + 2, threeBetTo * (config.relation === "IP" ? 2.15 : 2.25))));
    const continuation = continuationRegistry?.getContinuation?.(config.id) || null;
    const heroCards = continuation?.nodes?.[continuation.start]?.table?.heroCards?.slice() || cardsForHand(selected.hand);
    const relationLabel = config.relation === "IP" ? "в позиции" : "без позиции";
    const options = [
      { key: "fold", label: "Пас" },
      { key: "call", label: "Колл" },
      { key: "fourbet", label: `4-бет до ${formatBb(fourBetTo)} BB` },
      { key: "jam", label: `Олл-ин ${formatBb(stackBb)} BB` }
    ].map((option) => ({
      ...option,
      correct: option.key === correctAction,
      acceptableMix: option.key !== correctAction && acceptableActions.includes(option.key),
      feedback: feedbackFor(option.key, correctAction, acceptableActions, cell, config)
    }));
    const practiceMeta = {
      family: "vs3bet-defense",
      position: config.position,
      heroPosition,
      villainPosition,
      relation: config.relation,
      relationLabel,
      stackBucket: config.stack,
      effectiveStackBb: stackBb,
      threeBetSize: config.size,
      openToBb: openTo,
      threeBetToBb: threeBetTo,
      cohort: "reference",
      availableCohorts: rangeModel.cohorts.map((cohort) => cohort.key),
      hand: selected.hand,
      handClass: selected.className,
      variant: config.variant,
      actions: { ...cell },
      correctAction,
      acceptableActions: acceptableActions.slice(),
      sourceStatus: "exact-baseline-plus-transparent-heuristics"
    };

    return {
      id: config.id,
      title: `${config.position} ${relationLabel} · ${selected.hand}`,
      hand: selected.hand,
      question: `${config.position} открыл ${formatBb(openTo)} BB с ${selected.hand}. ${villainPosition} сделал 3-бет ${String(config.size).replace(".", ",")}x до ${formatBb(threeBetTo)} BB. Стек ${stack?.label || config.stack}. Твоя линия?`,
      answer: `${actionLabels[correctAction]} — главная линия (${formatFrequency(cell[correctAction])}). После ответа ниже откроется весь ожидаемый розыгрыш.`,
      context: "Сначала оцени позицию, цену колла и эффективный стек.",
      practiceMeta,
      metadata: { rangeModel: practiceMeta },
      table: {
        seats: generatedSeats(heroPosition, villainPosition, stackBb),
        heroPosition,
        heroStack: `${stackBb} BB`,
        effectiveStack: `${stackBb} BB`,
        pot: `${preflopPotBb({
          anteBb: 1,
          contributions: [
            { position: heroPosition, amountBb: openTo },
            { position: villainPosition, amountBb: threeBetTo }
          ]
        })} BB`,
        anteBb: 1,
        heroCards,
        boardCards: [],
        street: "preflop",
        actionLine: [`${heroPosition} open ${formatBb(openTo)} BB`, `${villainPosition} raise to ${formatBb(threeBetTo)} BB`],
        historyLine: `${heroPosition} открыл ${formatBb(openTo)} BB · ${villainPosition} 3-бет ${String(config.size).replace(".", ",")}x · ${relationLabel}`,
        toCall,
        currentBet: threeBetTo,
        dealerPosition: "BTN"
      },
      options,
      ...(continuation ? { continuation } : {})
    };
  }

  function generatePractice() {
    if (!rangeModel || typeof rangeModel.scenario !== "function" || typeof rangeModel.practiceSpotIds !== "function") {
      return fallbackPractice;
    }
    return rangeModel.practiceSpotIds().map((id, index) => generatedSpot(parsePracticeId(id), Math.floor(index / 2)));
  }

  const practice = generatePractice();
  const practiceModes = [{
    key: "filtered",
    label: rangeModel ? "Вся сетка" : "Базовые примеры",
    description: rangeModel ? "Выбери позицию, IP/OOP, стек и размер 3-бета." : "Резервный набор без загруженной матрицы.",
    reference: rangeModel
      ? fieldData
        ? "Правильные ответы следуют слою «Методичка»; полевые слои показывают только проверенные отличия."
        : "Правильные ответы следуют учебной матрице; непроверенное сравнение групп скрыто."
      : "",
    spotIds: practice.map((item) => item.id)
  }];

  const fieldCohortOrder = (fieldData?.meta?.cohortOrder || []).slice().reverse();
  const cohortInsights = {
    league1: "Сильнейшая группа реже сдаёт опен и чаще отвечает агрессией.",
    league2: "Средняя группа сохраняет больше коллов, но уже чаще уходит в пас.",
    league3: "В младшей лиге часть агрессивных продолжений превращается в пас.",
    novice: "Новички чаще теряют агрессивную ветку защиты и оставляют больше фолдов."
  };

  function observedCohort(key) {
    const meta = fieldData.meta.cohorts[key];
    const summary = fieldData.summaries[key];
    const ranks = meta.ranks.filter(Number.isFinite);
    return {
      key,
      label: `${meta.label} · R${Math.min(...ranks)}–${Math.max(...ranks)}`,
      subtitle: "наблюдаемая игра поля",
      sample: summary.opportunities,
      insight: cohortInsights[key],
      actions: [
        { key: "fold", label: "Пас", pct: summary.foldPct, tone: "fold" },
        { key: "call", label: "Колл", pct: summary.callPct, tone: "call" },
        { key: "fourbet", label: "4-бет", pct: summary.fourbetPct, tone: "4bet" },
        { key: "jam", label: "4-бет пуш", pct: summary.jamPct, tone: "jam" }
      ]
    };
  }

  const observedCohorts = fieldCohortOrder.map(observedCohort);
  const aggressionPct = (key) => {
    const summary = fieldData?.summaries?.[key];
    return summary ? summary.fourbetPct + summary.jamPct : 0;
  };
  const aggressionGap = fieldData
    ? `${aggressionPct("league1").toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} → ${aggressionPct("league3").toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : "";

  window.FF_POKER_FIELD_LESSON_DATA = {
    schemaVersion: 1,
    status: fieldData ? "ready" : "methodology_only",
    key: "vs-3bet-defense",
    meta: {
      title: "Защита против 3-бета",
      kicker: "Префлоп · Hero уже открылся",
      lead: "Ты уже открыл банк и получил первый 3-бет без сквиза. Теперь выбери между пасом, коллом, 4-бетом и прямым пушем.",
      scope: [
        "Hero уже сделал первый опен-рейз в неоткрытом банке",
        "после опена Hero получил первый 3-бет",
        "один учебный узел: опен Hero, затем первый 3-бет без сквиза",
        "пас, колл, 4-бет и прямой 4-бет-пуш разбираются как разные ветки",
        "сравнение лиг показывается только после полной сверки всех периодов",
        "полевые частоты описывают сыгранные решения и не являются solver-чартом"
      ],
      sourceLabel: fieldData ? "FF · проверенные решения по раздачам" : "Методичка FF · полевые частоты скрыты",
      period: fieldData ? `${fieldData.meta.windowStartInclusive.slice(0, 10)} — ${fieldData.meta.windowEndExclusive.slice(0, 10)}` : "Без неподтверждённых процентов",
      sampleNote: fieldData
        ? "Один опен, первый 3-бет, без сквизов. Частоты описывают наблюдаемую игру поля, а не оптимальную стратегию."
        : "Старые полевые частоты скрыты. До полной сверки доступны только учебная матрица и практика по методичке.",
      cohortOrder: fieldCohortOrder,
      observedDataStatus: fieldData ? "ready" : "unavailable"
    },
    intro,
    wisdom: [
      {
        eyebrow: "Сначала узел дерева",
        title: "Защищай свой опен, а не любую похожую раздачу",
        copy: "Сквизы, лимпы и чужие опены требуют других диапазонов. Здесь один точный узел: Hero открылся, один соперник сделал первый 3-бет, остальные не вошли в банк.",
        rule: "До карт назови: кто открылся, кто 3-бетил и кто ещё остался в раздаче.",
        stat: { value: "1 на 1", label: "первый 3-бет после собственного опена · без сквизов" }
      },
      {
        eyebrow: "Цена продолжения",
        title: "Позиция и сайз двигают границу вместе",
        copy: "Маленький позиционный 3-бет оставляет больше коллов. Большой 3-бет из блайндов требует дороже платить и быстрее снижает SPR.",
        rule: "Сначала цена и позиция, потом красота конкретной руки.",
        stat: { value: "IP / OOP", label: "позиция меняет цену и реализацию эквити" }
      },
      {
        eyebrow: "Стек выбирает форму",
        title: "30 BB и 60 BB — разные деревья",
        copy: "На 60 BB колл сохраняет пространство постфлоп. Около 30 BB крупный 4-бет часто уже коммитит стек, поэтому пограничные руки быстрее уходят в пас.",
        rule: "Если 4-бет съедает треть стека, заранее знай план против олл-ина.",
        stat: fieldData
          ? { value: aggressionGap, label: "4-бет + пуш: Лига 1 → Лига 3" }
          : { value: "20–30 / 31–50 / 51–80 / 80+", label: "четыре отдельные ветки эффективного стека" }
      }
    ],
    cohorts: observedCohorts,
    practice,
    practiceModes,
    rangeModel: {
      schemaVersion: rangeModel?.schemaVersion || 0,
      status: rangeModel ? "ready" : "fallback",
      practiceSpots: practice.length,
      sourceBoundary: fieldData
        ? "Позиции взяты из методички; полевые сравнения показываются только для полностью проверенных срезов."
        : "Позиции взяты из методички; сравнение групп скрыто до полной сверки истории."
    }
  };
})();
