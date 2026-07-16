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
    answer: "Колл сохраняет руки хуже в диапазоне BTN и не превращает сильную, но не натсовую пару в автоматический стек-офф. Это учебный ориентир; конкретный чарт может добавлять 4-бет-микс.",
    correct: "call",
    options: [
      { key: "fold", label: "Пас", feedback: "Слишком тайтово: JJ далеко выше границы продолжения против позиционного 3-бета." },
      { key: "call", label: "Колл +4.8 BB", feedback: "Да. На 40 BB JJ достаточно сильны для продолжения, но не обязаны раздувать банк 4-бетом во всём диапазоне." },
      { key: "fourbet", label: "4-бет до 17 BB", feedback: "4-бет может входить в микс, но как единственная линия он выбивает часть слабых 3-бетов и чаще получает действие от более сильного диапазона." },
      { key: "jam", label: "Олл-ин 40 BB", feedback: "Прямой пуш слишком быстро переводит JJ в стек-офф. Сначала проверь позицию, сайз и диапазон 3-беттора." }
    ]
  });

  const practice = [
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
        "действия поля: fold, call и 4-bet; calls восстановлены как N − folds − 4-bets",
        "ранг фиксируется на начало месяца; League 1 = R1–5, League 2 = R6–10, League 3 = R11–17",
        "полевые частоты описывают сыгранные решения и не являются solver-чартом"
      ],
      sourceLabel: "FFLK tracker · opener-after-RFI",
      period: "авг. 2025 — июль 2026 · июль неполный",
      sampleNote: "6 557 996 ranked opportunities; player counts показаны по каждой группе, а один игрок может перейти между рангами. Rank-at-month-start покрывает 98,4% recent opportunities. R15–17 — подсрез League 3, на 99,0% состоящий из R15; R16/17 доступны только в неполном июле. Готовые FF-материалы дают 59 defense-задач из 208 общего pack, но только на 58 BB и линии 2→8 BB, поэтому практика здесь добавляет другие сайзы и стеки. Частоты описательные, не solver-optimal."
    },
    intro,
    wisdom: [
      {
        eyebrow: "Сначала узел дерева",
        title: "Защищай свой опен, а не любой face-3bet",
        copy: "В широкой метрике face-3bet смешиваются сквизы, лимпы и другие линии. Для урока оставлен только узел Hero RFI → соперник 3-bet → решение Hero.",
        rule: "До карт назови: кто открылся, кто 3-бетил и кто ещё остался в раздаче.",
        stat: { value: "6,56 млн", label: "точных opener-after-RFI решений" }
      },
      {
        eyebrow: "Цена продолжения",
        title: "Позиция и сайз двигают границу вместе",
        copy: "Маленький позиционный 3-бет оставляет больше коллов. Большой 3-бет из блайндов требует дороже платить и быстрее снижает SPR.",
        rule: "Сначала цена и позиция, потом красота конкретной руки.",
        stat: { value: "42,6 → 21,0%", label: "call в поле: 3-бет <2,5x → 7x+" }
      },
      {
        eyebrow: "Стек выбирает форму",
        title: "30 BB и 60 BB — разные деревья",
        copy: "На 60 BB колл сохраняет пространство постфлоп. Около 30 BB крупный 4-бет часто уже коммитит стек, поэтому пограничные руки быстрее уходят в пас.",
        rule: "Если 4-бет съедает треть стека, заранее знай план против олл-ина.",
        stat: { value: "16,3 → 11,6%", label: "наблюдаемый 4-bet: League 1 → 3" }
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
    practice
  };
})();
