(function () {
  "use strict";

  const seats = (heroPosition, stackBb) => ["UTG", "HJ", "CO", "BTN", "SB", "BB"].map((label) => ({
    label,
    state: label === heroPosition ? "hero" : /SB|BB/.test(label) ? "blind" : "waiting",
    stackBb
  }));

  const spot = ({ id, title, hand, cards, heroPosition, stack, pot, toCall, currentBet, actionLine, historyLine, question, answer, correct, options }) => ({
    id,
    title,
    hand,
    question,
    answer,
    context: "Hero уже открыл банк. Сначала зафиксируй позицию, размер 3-бета и эффективный стек.",
    table: {
      seats: seats(heroPosition, stack),
      heroPosition,
      heroStack: `${stack} BB`,
      effectiveStack: `${stack} BB`,
      pot: `${pot} BB`,
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
    id: "intro-jj-co-vs-btn",
    title: "JJ после опена CO",
    hand: "JJ",
    cards: ["Jc", "Jh"],
    heroPosition: "CO",
    stack: 40,
    pot: 1,
    toCall: 4.8,
    currentBet: 7,
    actionLine: ["UTG fold", "HJ fold", "CO open 2.2 BB", "BTN raise to 7 BB", "SB fold", "BB fold"],
    historyLine: "CO открыл 2,2 BB · BTN 3-бет до 7 BB",
    question: "Ты открыл JJ с CO и получил позиционный 3-бет BTN. Какая базовая линия на 40 BB?",
    answer: "Базовая линия — 4-бет: референсный чарт отправляет JJ в 4-бет в 72% случаев и в пуш в 28%. Колла в этом узле нет.",
    correct: "fourbet",
    options: [
      { key: "fold", label: "Пас", feedback: "Слишком тайтово: JJ далеко выше границы продолжения против позиционного 3-бета." },
      { key: "call", label: "Колл +4.8 BB", feedback: "В референсном чарте для CO без позиции против BTN колла с JJ нет: рука уходит в агрессивную часть защиты." },
      { key: "fourbet", label: "4-бет до 17 BB", feedback: "Верно: обычный 4-бет — основная линия с частотой 72%." },
      { key: "jam", label: "Олл-ин 40 BB", acceptableMix: true, feedback: "Допустимый микс: референсный чарт пушит JJ в 28% случаев, но обычный 4-бет остаётся основной линией." }
    ]
  });

  const fallbackPractice = [
    spot({
      id: "practice-aa-hj-vs-co", title: "Натсовая часть", hand: "AA", cards: ["As", "Ad"], heroPosition: "HJ", stack: 50,
      pot: 1, toCall: 5.3, currentBet: 7.5,
      actionLine: ["UTG fold", "HJ open 2.2 BB", "CO raise to 7.5 BB", "BTN fold", "SB fold", "BB fold"],
      historyLine: "HJ открыл · CO 3-бет 3,4x",
      question: "HJ открыл AA и получил 3-бет CO. Что делает верх диапазона защиты?",
      answer: "AA строят вэлью уже сейчас: стандартный 4-бет оставляет сопернику возможность продолжить с худшими руками.",
      correct: "fourbet",
      options: [
        { key: "fold", label: "Пас", feedback: "AA никогда не уходят в пас в обычном споте против 3-бета." },
        { key: "call", label: "Колл +5.3 BB", feedback: "Слоуплей возможен редко, но не должен заменять основной вэлью-4-бет." },
        { key: "fourbet", label: "4-бет до 18 BB", feedback: "Верно: верх диапазона получает вэлью и защищает блефовую часть 4-бета." },
        { key: "jam", label: "Олл-ин 50 BB", feedback: "Пуш перегружает размер и чаще оставляет сопернику только сильные продолжения." }
      ]
    }),
    spot({
      id: "practice-76s-hj-vs-bb", title: "Большой сайз без позиции", hand: "76s", cards: ["7s", "6s"], heroPosition: "HJ", stack: 30,
      pot: 1, toCall: 7.8, currentBet: 10,
      actionLine: ["UTG fold", "HJ open 2.2 BB", "CO fold", "BTN fold", "SB fold", "BB raise to 10 BB"],
      historyLine: "HJ открыл · BB 3-бет 4,5x · 30 BB",
      question: "HJ открыл 76s, BB сделал крупный 3-бет, эффективный стек 30 BB. Что важнее красивой одномастности?",
      answer: "Пас. Цена колла высокая, позиционного преимущества недостаточно, а короткий остаток стека ухудшает реализацию пограничного коннектора.",
      correct: "fold",
      options: [
        { key: "fold", label: "Пас", feedback: "Верно: большой сайз и 30 BB сдвигают нижнюю границу продолжения вверх." },
        { key: "call", label: "Колл +7.8 BB", feedback: "Одномастность не компенсирует дорогой колл и низкий SPR после флопа." },
        { key: "fourbet", label: "4-бет до 21 BB", feedback: "Такой 4-бет почти коммитит стек без достаточной силы или надёжного read." },
        { key: "jam", label: "Олл-ин 30 BB", feedback: "Для автоматического пуша 76s не хватает блокеров и силы против продолжения BB." }
      ]
    }),
    spot({
      id: "practice-aqs-btn-vs-sb", title: "Позиция сохраняет колл", hand: "AQs", cards: ["Ah", "Qh"], heroPosition: "BTN", stack: 60,
      pot: 1, toCall: 6, currentBet: 8,
      actionLine: ["UTG fold", "HJ fold", "CO fold", "BTN open 2 BB", "SB raise to 8 BB", "BB fold"],
      historyLine: "BTN открыл · SB 3-бет 4x · 60 BB",
      question: "BTN открыл AQs, SB сделал 3-бет до 8 BB. Какая линия сохраняет позицию и глубину?",
      answer: "Колл — надёжная базовая линия: AQs хорошо реализует эквити в позиции и не обязана превращаться в 4-бет во всём диапазоне.",
      correct: "call",
      options: [
        { key: "fold", label: "Пас", feedback: "AQs слишком сильна для паса против блайнда после позднего опена." },
        { key: "call", label: "Колл +6 BB", feedback: "Верно: позиция и 60 BB оставляют пространство для игры после флопа." },
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
      { key: "call", label: `Колл +${formatBb(toCall)} BB` },
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
        pot: "1 BB",
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
    reference: rangeModel ? "Правильные ответы следуют слою «Методичка»; слои лиг нужны для сравнения ошибок." : "",
    spotIds: practice.map((item) => item.id)
  }];

  window.FF_POKER_FIELD_LESSON_DATA = {
    schemaVersion: 1,
    key: "vs-3bet-defense",
    meta: {
      title: "Защита против 3-бета",
      kicker: "Префлоп · Hero уже открылся",
      lead: "Не смешивай любой face-3bet с нужным узлом дерева: здесь Hero сначала открыл банк, затем выбирает пас, колл или 4-бет.",
      scope: [
        "Hero уже сделал первый опен-рейз в неоткрытом банке",
        "после опена Hero получил первый 3-бет",
        "годовой агрегат: fold, call и 4-bet; calls восстановлены как N − folds − 4-bets",
        "hand-level матрица: только one-on-one без сквиза; fold, call, 4-bet и прямой 4-bet-пуш взяты из действий",
        "в агрегате ранг фиксируется на начало месяца; в матрице — точно на момент раздачи",
        "полевые частоты описывают сыгранные решения и не являются solver-чартом"
      ],
      sourceLabel: "FFLK tracker · monthly aggregate + strict hand-level cube",
      period: "агрегат: авг. 2025 — июль 2026 · матрица: янв. — 16 июл. 2026",
      sampleNote: "Годовой агрегат содержит 6 557 996 ranked opportunities с rank-at-month-start; один игрок может перейти между группами. Строгая матрица содержит 5 051 115 решений после собственного RFI, исключает сквизы и назначает ранг на played_at; известные карты покрывают 87,0%. R15–17 в агрегате на 99,0% состоит из R15. Готовые FF-материалы дают 59 defense-задач из 208 общего pack, но только на 58 BB и линии 2→8 BB, поэтому практика здесь добавляет другие сайзы и стеки. Частоты описательные, не solver-optimal."
    },
    intro,
    wisdom: [
      {
        eyebrow: "Сначала узел дерева",
        title: "Защищай свой опен, а не любой face-3bet",
        copy: "В широкой метрике face-3bet смешиваются сквизы, лимпы и другие линии. Для hand-level матрицы оставлен только one-on-one узел Hero RFI → соперник 3-bet → решение Hero.",
        rule: "До карт назови: кто открылся, кто 3-бетил и кто ещё остался в раздаче.",
        stat: { value: "5,05 млн", label: "non-squeeze решений · 20 BB+ · янв—16 июл" }
      },
      {
        eyebrow: "Цена продолжения",
        title: "Позиция и сайз двигают границу вместе",
        copy: "Маленький позиционный 3-бет оставляет больше коллов. Большой 3-бет из блайндов требует дороже платить и быстрее снижает SPR.",
        rule: "Сначала цена и позиция, потом красота конкретной руки.",
        stat: { value: "87,0%", label: "решений строгого среза с известной рукой" }
      },
      {
        eyebrow: "Стек выбирает форму",
        title: "30 BB и 60 BB — разные деревья",
        copy: "На 60 BB колл сохраняет пространство постфлоп. Около 30 BB крупный 4-бет часто уже коммитит стек, поэтому пограничные руки быстрее уходят в пас.",
        rule: "Если 4-бет съедает треть стека, заранее знай план против олл-ина.",
        stat: { value: "16,0 → 11,6%", label: "4-бет + пуш: League 1 → 3 · строгий срез" }
      }
    ],
    cohorts: [
      {
        key: "league1", label: "League 1 · R1–5", subtitle: "сильнейшая группа", sample: 1017333, players: 222,
        insight: "Чаще всех 4-бетит и реже сдаёт опен; доля коллов при этом почти такая же, как в других лигах.",
        actions: [
          { key: "fold", label: "Fold", pct: 53.82, tone: "fold" },
          { key: "call", label: "Call", pct: 29.88, tone: "call" },
          { key: "fourbet", label: "4-bet", pct: 16.30, tone: "4bet" }
        ]
      },
      {
        key: "league2", label: "League 2 · R6–10", subtitle: "средняя группа", sample: 2469549, players: 631,
        insight: "Промежуточный профиль: примерно тот же call, но часть 4-бетов уже превращается в фолд.",
        actions: [
          { key: "fold", label: "Fold", pct: 56.18, tone: "fold" },
          { key: "call", label: "Call", pct: 29.00, tone: "call" },
          { key: "fourbet", label: "4-bet", pct: 14.82, tone: "4bet" }
        ]
      },
      {
        key: "league3", label: "League 3 · R11–17", subtitle: "широкая младшая группа", sample: 3071114, players: 1381,
        insight: "Главный разрыв с League 1 — не колл, а около 4,8 п.п. недостающих 4-бетов и 6,1 п.п. дополнительных фолдов.",
        actions: [
          { key: "fold", label: "Fold", pct: 59.96, tone: "fold" },
          { key: "call", label: "Call", pct: 28.49, tone: "call" },
          { key: "fourbet", label: "4-bet", pct: 11.55, tone: "4bet" }
        ]
      },
      {
        key: "rank15_17", label: "Ранги 15–17", subtitle: "подсрез League 3 · 99% R15", sample: 861445, players: 953,
        insight: "Полезный стартовый срез, но не сравнение трёх равных рангов: почти весь N даёт R15, а R16/17 появились только в неполном июле.",
        actions: [
          { key: "fold", label: "Fold", pct: 59.39, tone: "fold" },
          { key: "call", label: "Call", pct: 30.14, tone: "call" },
          { key: "fourbet", label: "4-bet", pct: 10.47, tone: "4bet" }
        ]
      }
    ],
    practice,
    practiceModes,
    rangeModel: {
      schemaVersion: rangeModel?.schemaVersion || 0,
      status: rangeModel ? "ready" : "fallback",
      practiceSpots: practice.length,
      sourceBoundary: "Точные позиции из методички; IP/OOP, стек, сайз и hand-level слои лиг — прозрачные учебные адаптации."
    }
  };
})();
