(function () {
  "use strict";

  const seatOrder = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

  const seats = (stack, villain) => seatOrder.map((label) => ({
    label,
    state: label === "BB" ? "hero" : label === villain ? "waiting" : "folded",
    stackBb: stack
  }));

  const optimisticXr = (discipline) =>
    `Так можно сыграть как эксплойт, если у тебя есть уверенный рид на большой оверфолд именно на этот сайз. Базовая линия дисциплинированнее: ${discipline}`;

  const actions = (raiseTo, feedback) => [
    { key: "fold", label: "Пас", feedback: feedback.fold },
    { key: "call", label: "Колл", feedback: feedback.call },
    { key: "checkraise", label: `Чек-рейз до ${raiseTo} BB`, feedback: feedback.checkraise }
  ];

  const spot = ({
    id, title, hand, cards, board, villain = "BTN", stack = 40, pot = 5.5,
    bet = 1.8, raiseTo = 5.5, question, answer, context, correct, feedback
  }) => {
    const continuation = window.FF_FLOP_CHECKRAISE_CONTINUATIONS?.getContinuation?.(id) || null;
    return {
      id,
      title,
      hand,
      question,
      answer,
      context,
      ...(continuation ? { continuation } : {}),
      table: {
      seats: seats(stack, villain),
      heroPosition: "BB",
      heroStack: `${stack} BB`,
      effectiveStack: `${stack} BB`,
      pot: `${pot} BB`,
      anteBb: 1,
      heroCards: cards,
      boardCards: board,
      street: "flop",
      actionLine: ["BB check", `${villain} bet ${bet} BB`],
      historyLine: `${villain} открывает 2.2 BB · BB коллирует · на флопе двое`,
      toCall: bet,
      currentBet: bet,
      dealerPosition: "BTN"
      },
      options: actions(raiseTo, feedback).map((option) => ({
        ...option,
        correct: option.key === correct,
        ...(option.key === "checkraise" && correct !== "checkraise" ? { acceptableExploit: true } : {})
      }))
    };
  };

  const practice = [
    spot({
      id: "xr-t9-backdoors", title: "K82r · T9s как кандидат", hand: "T9s", cards: ["Th", "9h"], board: ["Kc", "8h", "2s"],
      question: "BTN поставил треть банка после твоего чека. Какая базовая учебная линия с T♥9♥?",
      answer: "Check-raise: у T♥9♥ нет готового дро, зато есть backdoor straight и backdoor flush. Это выборочный учебный кандидат, а не обязательный рейз каждой T9s.",
      context: "BB защитил против BTN. Ищем лучший воздух с несколькими путями усиления, а не рейзим весь диапазон.",
      correct: "checkraise",
      feedback: {
        fold: "Пас возможен в смешанной стратегии, но T♥9♥ имеет два полезных backdoor-направления и подходит для активной части лучше несвязанного воздуха.",
        call: "У T-high нет готовой пары или дро; если продолжаем с этой рукой, check-raise использует её будущие карты лучше пассивного колла.",
        checkraise: "Верно: backdoor straight плюс backdoor flush делают T♥9♥ осмысленным выборочным полублефом."
      }
    }),
    spot({
      id: "xr-97-double-backdoor", title: "K82r · 97s и два backdoor", hand: "97s", cards: ["9h", "7h"], board: ["Kc", "8h", "2s"],
      question: "У 9♥7♥ нет готовой пары или дро. Остаётся ли рука кандидатом на check-raise?",
      answer: "Да, как редкий учебный полублеф: у руки backdoor straight и backdoor flush. Важно выбрать лучший воздух, а не любой воздух.",
      context: "Один heart на флопе вместе с двумя hearts в руке оставляет runner-runner flush; 6/T и следующие карты дают straight-направления.",
      correct: "checkraise",
      feedback: {
        fold: "Пас не катастрофа в реальной смешанной стратегии, но здесь 97s выбран как лучший из слабых кандидатов благодаря двум backdoor-направлениям.",
        call: "Без готовой пары колл реализует equity хуже. Если продолжаем с этой рукой, агрессивная линия логичнее пассивной.",
        checkraise: "Верно: это выборочный полублеф с двумя backdoor-направлениями, а не рейз по принципу «две случайные карты»."
      }
    }),
    spot({
      id: "xr-kq-value", title: "K82r · сильный Kx на вэлью", hand: "KQ", cards: ["Kd", "Qd"], board: ["Kc", "8h", "2s"],
      question: "Нужно ли оставлять все top pair только в check-call, если у тебя K♦Q♦?",
      answer: "Нет. В учебной модели часть сильных Kx начинает строить вэлью через check-raise, чтобы у блефов была сильная пара.",
      context: "KQ — верх top-pair части диапазона BB. Более слабые Kx чаще сохраняют ветку check-call.",
      correct: "checkraise",
      feedback: {
        fold: "Сильная top pair далеко впереди диапазона маленькой ставки BTN.",
        call: "Колл допустим как часть микса, но если всё сильное вэлью только коллирует, check-raise остаётся без естественной опоры.",
        checkraise: "Верно: KQ даёт вэлью-часть диапазона check-raise и может получить продолжение от Kx хуже и дро."
      }
    }),
    spot({
      id: "xr-jt-gutshot", title: "K92r · JT с gutshot", hand: "JTs", cards: ["Jc", "Tc"], board: ["Ks", "9d", "2c"],
      question: "На K♠9♦2♣ у J♣T♣ появился gutshot. Как использовать сочетание equity и давления?",
      answer: "Check-raise — учебный кандидат: Q закрывает straight, а clubs дают backdoor flush. Рука лучше случайного воздуха продолжает против колла.",
      context: "Выбирай блефы, которые могут усилиться, если BTN не сфолдит сразу.",
      correct: "checkraise",
      feedback: {
        fold: "Gutshot плюс backdoor flush дают достаточно будущих карт, чтобы рассмотреть активную линию.",
        call: "Колл сохраняет equity, но в этом уроке JT входит в выборочную агрессивную часть защиты BB.",
        checkraise: "Верно: живая equity делает давление устойчивее, чем рейз с полностью мёртвым воздухом."
      }
    }),
    spot({
      id: "xr-qt-gutshot", title: "K92r · QT с gutshot", hand: "QTs", cards: ["Qh", "Th"], board: ["Ks", "9d", "2h"],
      question: "Q♥T♥ собирает straight на J и runner-runner flush на двух hearts. Подходит ли рука для активной ветки?",
      answer: "Да, как учебный check-raise-кандидат: готовый gutshot и backdoor flush дают продолжение после колла.",
      context: "Это не обязательный рейз каждой QT, а пример руки с двумя понятными путями усиления.",
      correct: "checkraise",
      feedback: {
        fold: "У QT есть готовый gutshot и backdoor flush: среди воздуха это полезный кандидат для продолжения.",
        call: "Колл возможен в миксе, но урок выделяет QT в агрессивную часть благодаря двум путям усиления.",
        checkraise: "Верно: J закрывает straight, а две следующие hearts могут закрыть flush."
      }
    }),
    spot({
      id: "xr-qj-gutshot", title: "K92r · QJ с gutshot", hand: "QJs", cards: ["Qd", "Jd"], board: ["Kh", "9c", "2d"],
      question: "Q♦J♦ усиливается на T и имеет backdoor diamonds. Какая учебная линия использует это equity?",
      answer: "Check-raise: QJ связывает gutshot, backdoor flush и блокеры к сильным KQ/KJ-продолжениям.",
      context: "Три причины делают QJ лучше несвязанного Q-high, если BB выбирает полублеф.",
      correct: "checkraise",
      feedback: {
        fold: "Пас допустим в смешанной стратегии, но QJ слишком хорошо соединяет блокеры и будущие карты для нижнего воздуха.",
        call: "Колл сохраняет equity, однако учебная задача — распознать QJ как одного из лучших агрессивных кандидатов.",
        checkraise: "Верно: T закрывает straight, diamonds дают backdoor, Q/J блокируют часть сильных Kx."
      }
    }),
    spot({
      id: "xr-k9-two-pair", title: "K92r · две пары", hand: "K9", cards: ["Kd", "9c"], board: ["Ks", "9d", "2h"],
      question: "BTN поставил 33% банка. Какая линия начинает добор с K♦9♣?",
      answer: "Check-raise на вэлью. Две пары строят банк и дают естественную сильную часть диапазона рейза.",
      context: "Размер 5.5 BB — фиксированный учебный сайз, не утверждение об единственном верном размере.",
      correct: "checkraise",
      feedback: {
        fold: "Две пары — верх диапазона BB и не могут сдаваться на маленькую ставку.",
        call: "Колл оставляет блефы, но часть двух пар нужна в рейзе для добора и баланса полублефов.",
        checkraise: "Верно: K9 получает вэлью от Kx и дро и поддерживает блефовую часть check-raise."
      }
    }),
    spot({
      id: "xr-k2-two-pair", title: "K92r · нижние две пары", hand: "K2", cards: ["Kh", "2c"], board: ["Ks", "9d", "2h"],
      question: "У K♥2♣ две пары. Как получить вэлью и поддержать полублефовую часть рейза?",
      answer: "Check-raise: K2 строит банк против Kx и дро, оставаясь ясной сильной частью диапазона.",
      context: "K2 сильнее одной пары, хотя нижняя пара доски выглядит скромно.",
      correct: "checkraise",
      feedback: {
        fold: "Две пары не могут сдаваться на маленькую ставку.",
        call: "Колл возможен выборочно, но часть K2 нужна в value check-raise.",
        checkraise: "Верно: K2 добирает с Kx и даёт блефам сильную пару в той же линии."
      }
    }),
    spot({
      id: "xr-99-set", title: "K92r · средний сет", hand: "99", cards: ["9s", "9c"], board: ["Kh", "9d", "2s"], villain: "CO", pot: 5.3, bet: 1.8,
      question: "CO поставил треть банка, у BB сет девяток. Какая линия начинает добор?",
      answer: "Check-raise на вэлью: Kx и готовые пары хуже могут продолжить, а сет строит банк уже на флопе.",
      context: "Это тот же узел против позднего стила; меняется только позиция raiser с BTN на CO.",
      correct: "checkraise",
      feedback: {
        fold: "Сет — верх диапазона и не сдаётся.",
        call: "Колл сохраняет блефы, но базовая учебная линия отправляет часть сетов в добор через рейз.",
        checkraise: "Верно: 99 получают продолжение от Kx и быстро строят банк."
      }
    }),
    spot({
      id: "xr-22-set", title: "K92r · нижний сет", hand: "22", cards: ["2c", "2s"], board: ["Kh", "9d", "2h"],
      question: "Нижний сет выглядит скрыто. Оставлять 2♣2♠ только в колле или начинать добор?",
      answer: "Check-raise на вэлью: скрытый сет получает продолжение от Kx, 9x и подходящих дро.",
      context: "Название «нижний» не делает сет средней рукой: это всё ещё верх диапазона BB.",
      correct: "checkraise",
      feedback: {
        fold: "Сет не рассматривает пас на маленький c-bet.",
        call: "Колл возможен в миксе, но учебная value-линия начинает строить банк.",
        checkraise: "Верно: 22 поддерживают полублефы и добирают с готовых рук хуже."
      }
    }),
    spot({
      id: "xr-set-value", title: "Q72tt · сет как ясное вэлью", hand: "77", cards: ["7s", "7c"], board: ["Qh", "7d", "2h"], villain: "CO", pot: 5.3, bet: 1.8,
      question: "CO поставил треть банка на Q♥7♦2♥. Как строить банк с сетом?",
      answer: "Check-raise на вэлью: Qx и дро могут продолжить, а сильная рука защищает полублефы в той же линии.",
      context: "CO открыл, BB защитил и чекнул. Это всё ещё один и тот же BB-vs-late-RFI узел.",
      correct: "checkraise",
      feedback: {
        fold: "Сет — одна из сильнейших возможных рук.",
        call: "Колл допустим выборочно, но базовая учебная линия начинает добор уже на флопе.",
        checkraise: "Верно: сет строит банк против Qx и дро и формирует верх диапазона рейза."
      }
    }),
    spot({
      id: "call-a8-middle-pair", title: "K82r · средняя пара", hand: "A8", cards: ["Ah", "8c"], board: ["Kc", "8h", "2s"],
      question: "A♥8♣ имеет showdown value. Нужно ли превращать руку в check-raise?",
      answer: "Колл: средняя пара защищает check-call и не выбивает руки хуже без необходимости.",
      context: "Диапазону BB нужны не только рейзы и фолды. Руки средней силы удерживают ставочный воздух BTN.",
      correct: "call",
      feedback: {
        fold: "На треть банка middle pair слишком сильна для немедленного паса.",
        call: "Верно: A8 реализует showdown value и сохраняет блефы BTN.",
        checkraise: optimisticXr("A8 лучше коллирует, сохраняет блефы BTN и не превращает showdown value в блеф.")
      }
    }),
    spot({
      id: "call-k7-top-pair", title: "K82r · Kx для check-call", hand: "K7", cards: ["Kh", "7c"], board: ["Kc", "8h", "2s"],
      question: "K♥7♣ — top pair, но не верх Kx. Какая линия сохраняет диапазон колла?",
      answer: "Колл. Не каждый Kx должен раздувать банк; более слабые top pair удерживают ставочный диапазон BTN широким.",
      context: "В примерах KQ представляет сильную вэлью-часть рейза, а K7 — естественный контроль.",
      correct: "call",
      feedback: {
        fold: "Top pair слишком сильна для паса на маленькую ставку.",
        call: "Верно: K7 защищает check-call и не изолирует себя против Kx сильнее.",
        checkraise: optimisticXr("K7 лучше защищает check-call и не изолируется против Kx с более сильным kicker.")
      }
    }),
    spot({
      id: "call-a2-bottom-pair", title: "K82r · нижняя пара", hand: "A2", cards: ["Ac", "2d"], board: ["Kc", "8h", "2s"],
      question: "A♣2♦ получил нижнюю пару против ставки 33%. Что лучше рейза?",
      answer: "Колл: пара с A-kicker имеет showdown value, но плохо чувствует себя против продолжения на check-raise.",
      context: "Сильный кандидат на рейз должен выигрывать от фолдов и иметь разумное продолжение; A2 чаще просто реализует equity.",
      correct: "call",
      feedback: {
        fold: "Против небольшого сайза bottom pair с A-kicker ещё может защищаться.",
        call: "Верно: колл сохраняет хуже и не превращает готовую руку в ненужный блеф.",
        checkraise: optimisticXr("A2 удобнее реализует пару через колл, чем получает продолжение от сильной части диапазона.")
      }
    }),
    spot({
      id: "call-66-underpair", title: "K82r · карманная пара", hand: "66", cards: ["6s", "6d"], board: ["Kc", "8h", "2s"],
      question: "Как защитить 6♠6♦ против маленького c-bet BTN?",
      answer: "Колл как базовая учебная линия: у руки есть showdown value, но нет хорошей причины превращать её в рейз.",
      context: "Цель урока — находить пропущенные X/R и отделять базовую дисциплину от осознанного эксплойта против оверфолда.",
      correct: "call",
      feedback: {
        fold: "На треть банка карманная пара часто ещё может защититься.",
        call: "Верно: 66 сохраняют showdown value и ловят слишком широкие c-bet.",
        checkraise: optimisticXr("66 лучше сохраняют showdown value через колл, а блефовую часть проще набрать руками с живым backdoor equity.")
      }
    }),
    spot({
      id: "fold-q4-air", title: "K82r · воздух без опоры", hand: "Q4", cards: ["Qc", "4d"], board: ["Kc", "8h", "2s"],
      question: "Q♣4♦ блокирует мало и почти не усиливается. Нужно ли защищать её рейзом?",
      answer: "База — пас: диапазон check-raise остаётся выборочным. Против явного оверфолда рейз допустим как эксплойт, но сначала выбирай воздух с более живой equity.",
      context: "Сравни с QJ: там выше связность и два backdoor-направления.",
      correct: "fold",
      feedback: {
        fold: "Верно: без полезных блокеров и живой equity это нижняя часть диапазона.",
        call: "Колл без пары и хороших backdoor-направлений плохо реализует equity.",
        checkraise: optimisticXr("сначала рейзь более связанные руки вроде QJ, у которых есть и блокеры, и два backdoor-направления.")
      }
    }),
    spot({
      id: "fold-j5-weak-backdoor", title: "K82r · одного намёка мало", hand: "J5s", cards: ["Jh", "5h"], board: ["Kc", "8h", "2s"],
      question: "У J♥5♥ есть runner-runner hearts, но мало straight equity. Достаточно ли этого для X/R?",
      answer: "База — пас. При уверенном риде на большой оверфолд X/R допустим как эксплойт, но один слабый backdoor уступает рукам с двумя путями усиления.",
      context: "Приоритет получают сочетания нескольких причин: блокеры, equity и связность.",
      correct: "fold",
      feedback: {
        fold: "Верно: одного слабого backdoor flush недостаточно, когда есть более связанные кандидаты.",
        call: "Колл с J-high и минимальной equity слишком оптимистичен.",
        checkraise: optimisticXr("T9 и 97 — первые кандидаты, потому что покрывают будущие карты сразу двумя backdoor-направлениями.")
      }
    }),
    spot({
      id: "call-a9-middle-pair", title: "K92r · средняя пара", hand: "A9", cards: ["Ah", "9c"], board: ["Ks", "9d", "2c"],
      question: "A♥9♣ попал во вторую пару. Какую ветку защищает эта рука?",
      answer: "Check-call: готовая рука ловит широкую ставку и не нуждается в превращении в блеф.",
      context: "Полублефы рейзят за счёт фолд-эквити и усилений; A9 уже имеет достаточную текущую ценность.",
      correct: "call",
      feedback: {
        fold: "Middle pair слишком сильна для паса на 33% банка.",
        call: "Верно: A9 сохраняет блефы и реализует showdown value.",
        checkraise: optimisticXr("A9 лучше коллирует, сохраняет худшие ставки и не превращает текущую showdown value в блеф.")
      }
    }),
    spot({
      id: "call-k8-top-pair", title: "K92r · top pair слабее", hand: "K8", cards: ["Kh", "8c"], board: ["Ks", "9d", "2c"],
      question: "K♥8♣ — готовая сильная рука, но нужно ли автоматически рейзить?",
      answer: "Колл. Слабый kicker оставляет K8 в устойчивой ветке check-call; вэлью-рейзы начинаются выше.",
      context: "Не путай «сильная рука» и «обязательный check-raise».",
      correct: "call",
      feedback: {
        fold: "Top pair не сдаётся на маленькую ставку.",
        call: "Верно: K8 сохраняет диапазон BTN широким и контролирует банк.",
        checkraise: optimisticXr("K8 лучше остаётся в check-call и контролирует банк против Kx с более сильным kicker.")
      }
    }),
    spot({
      id: "fold-t8-backdoor-only", title: "K92r · не каждый backdoor", hand: "T8", cards: ["Th", "8d"], board: ["Ks", "9d", "2c"],
      question: "T♥8♦ может собрать runner-runner straight, но этого достаточно для продолжения?",
      answer: "База — пас. Против явного оверфолда X/R допустим как эксплойт, но у JT уже есть gutshot, а у T8 только один далёкий runner-runner путь.",
      context: "Этот контроль защищает тренажёр от правила «увидел backdoor — нажал raise».",
      correct: "fold",
      feedback: {
        fold: "Верно: T8 уступает JT/QT/QJ по текущей equity и качеству блокеров.",
        call: "Колл с T-high и без готового дро слишком слаб.",
        checkraise: optimisticXr("JT/QT/QJ дисциплинированнее, потому что уже имеют gutshot и дополнительную backdoor-ветку.")
      }
    }),
    spot({
      id: "fold-q4-k92", title: "K92r · нижний воздух", hand: "Q4", cards: ["Qd", "4s"], board: ["Ks", "9d", "2c"],
      question: "Q♦4♠ не попала и не получила готового дро. Какая дисциплинированная линия?",
      answer: "База — пас. Если BTN явно оверфолдит именно на этот сайз, X/R допустим как эксплойт; без такого рида сначала выбирай связанные руки с equity.",
      context: "Кандидаты JT/QT/QJ имеют больше equity и лучше взаимодействуют с продолжениями BTN.",
      correct: "fold",
      feedback: {
        fold: "Верно: это естественная нижняя часть защиты BB.",
        call: "Колл без пары и дро не имеет достаточной опоры.",
        checkraise: optimisticXr("сначала используй связанные руки с gutshot и backdoor equity, а Q4 оставляй для особенно сильного рида на оверфолд.")
      }
    }),
    spot({
      id: "call-55-q72", title: "Q72tt · underpair", hand: "55", cards: ["5s", "5d"], board: ["Qh", "7d", "2h"], villain: "CO", pot: 5.3, bet: 1.8,
      question: "5♠5♦ встретили маленький c-bet CO. Нужно ли превращать пару в рейз?",
      answer: "Колл как учебная базовая линия: рука имеет showdown value и ловит широкую ставку CO.",
      context: "На двухмастной доске сильные draws и value лучше подходят для полярного check-raise.",
      correct: "call",
      feedback: {
        fold: "На маленькую ставку карманная пара ещё может продолжать.",
        call: "Верно: 55 защищают check-call без лишней поляризации.",
        checkraise: optimisticXr("55 лучше реализуют showdown value через колл, а полярный X/R проще строить из сетов и сильных дро.")
      }
    }),
    spot({
      id: "call-q8-q72", title: "Q72tt · top pair", hand: "Q8", cards: ["Qc", "8c"], board: ["Qh", "7d", "2h"], villain: "CO", pot: 5.3, bet: 1.8,
      question: "Q♣8♣ — top pair со средним kicker. Где ей проще реализовать ценность?",
      answer: "В check-call. Рука удерживает блефы CO и не обязана входить в value check-raise.",
      context: "Вэлью-часть рейза строится из более сильных комбинаций; диапазон колла тоже должен быть защищён.",
      correct: "call",
      feedback: {
        fold: "Top pair слишком сильна для паса.",
        call: "Верно: Q8 реализует showdown value и оставляет худшие ставки в раздаче.",
        checkraise: optimisticXr("Q8 лучше удерживает блефы CO в check-call; для value X/R есть более сильные Qx и сеты.")
      }
    })
  ];

  const byId = new Map(practice.map((item) => [item.id, item]));
  const xrIds = [
    "xr-t9-backdoors", "xr-97-double-backdoor", "xr-kq-value",
    "xr-jt-gutshot", "xr-qt-gutshot", "xr-qj-gutshot",
    "xr-k9-two-pair", "xr-k2-two-pair", "xr-99-set", "xr-22-set", "xr-set-value"
  ];
  const controlIds = practice.map((item) => item.id).filter((id) => !xrIds.includes(id));
  const allModeIds = [...xrIds, ...controlIds, ...controlIds, ...controlIds, ...controlIds, ...controlIds.slice(0, 7)];

  const categoryEvidence = (categoryKey, categoryLabel) => ({
    status: "pending_exact_extract",
    categoryKey,
    categoryLabel,
    scope: "Q2 2026 · BB vs CO/BTN · exact made-hand/draw category на флопе; не одна точная комбинация",
    league1: { xraises: null, opportunities: null, players: null, note: "Нужен reverse-Hero extract: BB cards + board + faced c-bet + action." },
    league2: { xraises: null, opportunities: null, players: null, note: "Нужен тот же category denominator для R6–10." },
    league3: { xraises: null, opportunities: null, players: null, note: "Нужен тот же category denominator для R11–17." }
  });

  const example = ({
    sourceIds, title, handClass, categoryKey, categoryLabel, takeaway,
    baselineRole, whyThisHand, bestTurns, slowdownTurns, afterVillainContinues,
    controlId, controlCopy
  }) => {
    const representatives = sourceIds.map((sourceId) => {
      const source = byId.get(sourceId);
      return {
        sourceSpotId: sourceId,
        hand: source.hand,
        title: source.title,
        boardLabel: source.title.split("·")[0].trim(),
        heroCards: source.table.heroCards,
        boardCards: source.table.boardCards
      };
    });
    const source = byId.get(sourceIds[0]);
    const control = byId.get(controlId);
    const controlAction = control.options.find((option) => option.correct);
    return {
      id: `example-${categoryKey}`,
      sourceSpotId: sourceIds[0],
      sourceSpotIds: sourceIds,
      tree: "bb_vs_late_rfi",
      title,
      handClass,
      heroCards: source.table.heroCards,
      boardCards: source.table.boardCards,
      representatives,
      playbook: {
        action: "Чек-рейз до 5,5 BB",
        baselineRole,
        whyThisHand,
        bestTurns,
        slowdownTurns,
        afterVillainContinues
      },
      contrast: {
        sourceSpotId: controlId,
        hand: control.hand,
        heroCards: control.table.heroCards,
        boardCards: control.table.boardCards,
        actionKey: controlAction.key,
        actionLabel: controlAction.label,
        copy: controlCopy
      },
      takeaway,
      representativeNote: "Карты показывают учебные границы категории. Общий X/R всего узла сюда не подставляется; L1–L3 появятся только после exact-HH с картами BB.",
      evidence: categoryEvidence(categoryKey, categoryLabel)
    };
  };

  window.FF_POKER_FIELD_LESSON_DATA = {
    schemaVersion: 1,
    key: "flop-checkraise",
    meta: {
      title: "Чек-рейз флопа: BB против CO/BTN",
      kicker: "Постфлоп · защищённый BB против стила",
      lead: "BB заколлировал один опен CO/BTN, чекнул флоп и встретил c-bet. Найди руки, которые должны рейзить, не превращая в рейз весь диапазон.",
      scope: [
        "Один опен от CO или BTN и один колл BB; без лимперов и других игроков на флопе",
        "Опен не больше 3 BB, эффективный стек от 20 BB, столы на 3–9 игроков",
        "Решение начинается только после чек BB → ставка префлоп-рейзера",
        "Частота check-raise BB и частота фолда CO/BTN считаются на разных наборах решений",
        "Карточные примеры — учебные кандидаты, а не обязательное действие с каждой комбинацией"
      ],
      sourceLabel: "FF ClickHouse · tracker stats + hand actions",
      period: "Q2 2026 · 01.04–30.06",
      sampleNote: "BB сделал 150 387 check-raise из 1 018 330 возможностей с известным рангом игрока — это 94,69% полного набора из 1 075 431 решений. Для каждого месяца берётся ранг, в котором игрок провёл больше всего дней. Фолд CO/BTN считается отдельно: например, R15–17 сфолдили 12 303 раза из 22 434 встреченных check-raise. Поэтому две колонки не складываются в 100%. Доски и руки в примерах методические: точной полевой частоты для отдельной комбинации мы не заявляем."
    },
    intro: byId.get("xr-t9-backdoors"),
    wisdom: [
      {
        eyebrow: "Выбор кандидата",
        title: "Что делает блеф хорошим",
        copy: "Блокер в твоей руке уменьшает число сильных продолжений соперника. Запас усиления — шанс собрать лучшую руку. Бэкдор требует двух подходящих карт на тёрне и ривере. На K82 это помогает T9s/97s, на K92 — JT/QT/QJ.",
        rule: "Рейзь лучший из слабых рук: ищи хотя бы две причины, а не один далёкий бэкдор.",
        stat: { value: "3 фильтра", label: "блокеры · усиления · бэкдоры" }
      },
      {
        eyebrow: "Диапазон",
        title: "Блефам нужна сильная пара",
        copy: "Если BB только коллирует все Kx, две пары и сеты, его check-raise становится перекошен в блефы. Часть KQ/KJ/KT и сильнейшего вэлью поддерживает полублефы.",
        rule: "Не рейзь всё сильное: оставь защищённый check-call и подними верх диапазона вместе с лучшими полублефами.",
        stat: { value: "value + bluff", label: "одна линия, две взаимные опоры" }
      },
      {
        eyebrow: "Экономика · реальные HH",
        title: "Один сайз — три реакции",
        copy: "Берём сопоставимый срез: CO/BTN против BB, сухой K-high флоп, c-bet 30–36% банка и check-raise примерно до стартового банка. В Q2 2026 игроки League 1 фолдили 49,5%, League 2 — 45,5%, League 3 — 60,2%. Учебный размер 1,8 → 5,5 BB попадает в этот бакет; чистому блефу нужно около 43% фолдов.",
        rule: "На одном размере League 1 и 2 дают чистому блефу небольшой запас над 43%, а League 3 — заметный. Это observed HH-частота, не solver target: equity и будущие улицы меняют итоговый EV.",
        visual: {
          type: "board-folds",
          boardCards: ["Kc", "8h", "2s"],
          boardLabel: "K-high dry · пример K82r",
          boardScope: "K♣8♥2♠ — представитель класса; проценты собраны по всем сухим K-high флопам, не только по точной K82r.",
          cohortRole: "aggressor",
          breakeven: 42.97,
          period: "CO/BTN vs BB · Q2 2026 · 70% HH-выборка",
          sizing: {
            cbet: "c-bet 30–36% банка",
            checkraise: "X/R-to ≈ банк (95–105%)",
            example: "Учебный пример: банк 5,5 · bet 1,8 · raise-to 5,5 BB"
          },
          rows: [
            { key: "league1", label: "League 1", ranks: "R1–5", folds: 46, faced: 93, players: 69 },
            { key: "league2", label: "League 2", ranks: "R6–10", folds: 110, faced: 242, players: 178 },
            { key: "league3", label: "League 3", ranks: "R11–17", folds: 162, faced: 269, players: 211 }
          ],
          note: "Лига — ранг CO/BTN, который получил X/R; это близкий HH-срез, не полный canonical denominator."
        }
      }
    ],
    fieldMatrix: {
      version: 1,
      role: "aggressor",
      rankRole: "preflop_aggressor",
      positions: ["CO", "BTN"],
      tree: "CO/BTN RFI → BB call → BB check",
      canonicalNode: false,
      period: "Q2 2026 · 01.04–30.06",
      sample: {
        kind: "deterministic_hh_sample",
        percent: 70,
        analysisIncluded: true,
        compactRows: 2300854,
        parsedRows: 2297953,
        rankedRows: 2256311,
        coBtnRows: 1267631,
        positionParseErrors: 21
      },
      definitions: {
        cbet: "Ставки CO/BTN после чека BB / все возможности поставить",
        foldVsXr: "Фолды того же CO/BTN / встреченные check-raise с известным ответом"
      },
      foldViews: [
        {
          key: "overall",
          label: "Все X/R",
          shortLabel: "все размеры",
          note: "Все наблюдавшиеся размеры c-bet и check-raise, включая редкие олл-ины. Это реальная смесь сайзов поля."
        },
        {
          key: "matched",
          label: "Один сайз",
          shortLabel: "≈⅓ → ≈банк",
          note: "C-bet 30–36% стартового банка → X/R-to 95–105% стартового банка. Одно окно сайза для всех структур и лиг."
        }
      ],
      defaultFoldView: "overall",
      leagues: [
        {
          key: "league1", label: "League 1", ranks: "R1–5",
          opportunityPlayers: 185, facedPlayers: 185, matchedPlayers: 173
        },
        {
          key: "league2", label: "League 2", ranks: "R6–10",
          opportunityPlayers: 554, facedPlayers: 549, matchedPlayers: 514
        },
        {
          key: "league3", label: "League 3", ranks: "R11–17",
          opportunityPlayers: 1276, facedPlayers: 1227, matchedPlayers: 982
        }
      ],
      rows: [
        {
          key: "a_high_dry", label: "A-high · сухая", example: "A♣7♦2♠", note: "rainbow · без плотных связей",
          values: {
            league1: { cbet: { made: 4192, opportunities: 4305 }, foldVsXr: { overall: { folds: 205, faced: 472 }, matched: { folds: 18, faced: 52 } } },
            league2: { cbet: { made: 11516, opportunities: 11942 }, foldVsXr: { overall: { folds: 571, faced: 1160 }, matched: { folds: 64, faced: 154 } } },
            league3: { cbet: { made: 15775, opportunities: 16998 }, foldVsXr: { overall: { folds: 790, faced: 1339 }, matched: { folds: 92, faced: 160 } } }
          }
        },
        {
          key: "k_high_dry", label: "K-high · сухая", example: "K♣8♥2♠", note: "rainbow · без плотных связей",
          values: {
            league1: { cbet: { made: 4970, opportunities: 5132 }, foldVsXr: { overall: { folds: 362, faced: 747 }, matched: { folds: 46, faced: 93 } } },
            league2: { cbet: { made: 13238, opportunities: 13728 }, foldVsXr: { overall: { folds: 883, faced: 1752 }, matched: { folds: 110, faced: 243 } } },
            league3: { cbet: { made: 18366, opportunities: 19891 }, foldVsXr: { overall: { folds: 1203, faced: 2015 }, matched: { folds: 162, faced: 269 } } }
          }
        },
        {
          key: "broadway", label: "Бродвейная", example: "Q♣J♦4♠", note: "две или три карты T+",
          values: {
            league1: { cbet: { made: 16398, opportunities: 17387 }, foldVsXr: { overall: { folds: 699, faced: 1384 }, matched: { folds: 69, faced: 144 } } },
            league2: { cbet: { made: 44359, opportunities: 47028 }, foldVsXr: { overall: { folds: 1825, faced: 3560 }, matched: { folds: 192, faced: 414 } } },
            league3: { cbet: { made: 61540, opportunities: 66575 }, foldVsXr: { overall: { folds: 2639, faced: 4666 }, matched: { folds: 337, faced: 576 } } }
          }
        },
        {
          key: "low_connected", label: "Низкая связанная", example: "8♣7♦5♠", note: "низкие ранги · много straight equity",
          values: {
            league1: { cbet: { made: 2572, opportunities: 4309 }, foldVsXr: { overall: { folds: 225, faced: 518 }, matched: { folds: 14, faced: 38 } } },
            league2: { cbet: { made: 7666, opportunities: 11897 }, foldVsXr: { overall: { folds: 666, faced: 1661 }, matched: { folds: 43, faced: 146 } } },
            league3: { cbet: { made: 13408, opportunities: 17227 }, foldVsXr: { overall: { folds: 1317, faced: 2779 }, matched: { folds: 159, faced: 377 } } }
          }
        },
        {
          key: "paired", label: "Спаренная / trips", example: "9♣9♦2♠", note: "две или три карты одного ранга",
          values: {
            league1: { cbet: { made: 26350, opportunities: 29276 }, foldVsXr: { overall: { folds: 2146, faced: 5142 }, matched: { folds: 141, faced: 394 } } },
            league2: { cbet: { made: 71466, opportunities: 78304 }, foldVsXr: { overall: { folds: 5748, faced: 11974 }, matched: { folds: 583, faced: 1338 } } },
            league3: { cbet: { made: 98074, opportunities: 111411 }, foldVsXr: { overall: { folds: 7695, faced: 13534 }, matched: { folds: 954, faced: 1711 } } }
          }
        },
        {
          key: "two_tone", label: "Two-tone", example: "Q♥7♥2♣", note: "ровно две карты одной масти",
          values: {
            league1: { cbet: { made: 69230, opportunities: 78912 }, foldVsXr: { overall: { folds: 4719, faced: 10128 }, matched: { folds: 369, faced: 910 } } },
            league2: { cbet: { made: 189084, opportunities: 211393 }, foldVsXr: { overall: { folds: 13171, faced: 27115 }, matched: { folds: 1318, faced: 2920 } } },
            league3: { cbet: { made: 269739, opportunities: 298939 }, foldVsXr: { overall: { folds: 19101, faced: 35564 }, matched: { folds: 2182, faced: 4183 } } }
          }
        },
        {
          key: "monotone", label: "Монотонная", example: "A♠8♠3♠", note: "три карты одной масти",
          values: {
            league1: { cbet: { made: 7628, opportunities: 8777 }, foldVsXr: { overall: { folds: 649, faced: 1405 }, matched: { folds: 54, faced: 121 } } },
            league2: { cbet: { made: 20486, opportunities: 23315 }, foldVsXr: { overall: { folds: 1686, faced: 3293 }, matched: { folds: 141, faced: 338 } } },
            league3: { cbet: { made: 29072, opportunities: 33121 }, foldVsXr: { overall: { folds: 2235, faced: 3940 }, matched: { folds: 241, faced: 441 } } }
          }
        },
        {
          key: "other", label: "Другие rainbow", example: "J♣8♦4♠", note: "остальные неспаренные rainbow-флопы",
          values: {
            league1: { cbet: { made: 19218, opportunities: 21154 }, foldVsXr: { overall: { folds: 1428, faced: 3213 }, matched: { folds: 130, faced: 333 } } },
            league2: { cbet: { made: 51841, opportunities: 56693 }, foldVsXr: { overall: { folds: 4061, faced: 8472 }, matched: { folds: 477, faced: 1082 } } },
            league3: { cbet: { made: 72254, opportunities: 79917 }, foldVsXr: { overall: { folds: 5828, faced: 10550 }, matched: { folds: 749, faced: 1444 } } }
          }
        }
      ],
      note: "Лига всегда относится к CO/BTN — префлоп-агрессору. C-bet и фолд на X/R имеют разные знаменатели и не складываются в 100%. CO/BTN восстановлены из полного порядка preflop actions; это близкий HH-срез без всех канонических фильтров по стеку, размеру опена и числу игроков."
    },
    cohorts: [
      {
        key: "league1", label: "League 1 · R1–5", subtitle: "две роли, две базы решений", display: "independent",
        samples: [{ label: "BB X/R N", value: 151874 }, { label: "Fold vs X/R N", value: 34781 }],
        insight: "BB: 24 170 X/R, 179 игроков. Aggressor: 15 545 folds, 179 игроков.",
        actions: [
          { key: "bb_xr", label: "BB check-raise", pct: 15.91, tone: "xr" },
          { key: "fold_vs_xr", label: "CO/BTN fold vs X/R", pct: 44.69, tone: "call" }
        ]
      },
      {
        key: "league2", label: "League 2 · R6–10", subtitle: "две роли, две базы решений", display: "independent",
        samples: [{ label: "BB X/R N", value: 378226 }, { label: "Fold vs X/R N", value: 89584 }],
        insight: "BB: 60 081 X/R, 525 игроков. Aggressor: 43 338 folds, 524 игрока.",
        actions: [
          { key: "bb_xr", label: "BB check-raise", pct: 15.88, tone: "xr" },
          { key: "fold_vs_xr", label: "CO/BTN fold vs X/R", pct: 48.38, tone: "call" }
        ]
      },
      {
        key: "league3", label: "League 3 · R11–17", subtitle: "две роли, две базы решений", display: "independent",
        samples: [{ label: "BB X/R N", value: 488230 }, { label: "Fold vs X/R N", value: 115837 }],
        insight: "BB: 66 136 X/R, 1 275 игроков. Aggressor: 63 535 folds, 1 239 игроков.",
        actions: [
          { key: "bb_xr", label: "BB check-raise", pct: 13.55, tone: "xr" },
          { key: "fold_vs_xr", label: "CO/BTN fold vs X/R", pct: 54.85, tone: "call" }
        ]
      },
      {
        key: "rank15_17", label: "Ранги 15–17", subtitle: "вложенный подсрез League 3", display: "independent",
        samples: [{ label: "BB X/R N", value: 100372 }, { label: "Fold vs X/R N", value: 22434 }],
        insight: "BB: 10 833 X/R, 657 игроков. Aggressor: 12 303 folds, 623 игрока.",
        actions: [
          { key: "bb_xr", label: "BB check-raise", pct: 10.79, tone: "xr" },
          { key: "fold_vs_xr", label: "CO/BTN fold vs X/R", pct: 54.84, tone: "call" }
        ]
      }
    ],
    examples: {
      tree: "bb_vs_late_rfi",
      title: "Из чего собрать check-raise",
      lead: "Пять категорий показывают не только руку, но и всю базовую линию: почему X/R, что делать после колла и где похожая рука уже выбирает Call или Fold.",
      note: "Опен CO/BTN → колл BB → чек BB → c-bet префлоп-рейзера → решение BB. Другие типы банков сюда не входят.",
      method: "Turn-план начинается после колла флопового X/R; ререйз соперника на флопе — отдельная ветка. Category×League частоты появятся после reverse-Hero hand-level extract. До этого мы показываем полный учебный разбор и не маскируем общий X/R под частоту конкретной руки.",
      value: [
        example({
          sourceIds: ["xr-kq-value"], title: "Сильная top pair", handClass: "Вэлью · верх Kx",
          categoryKey: "strong_top_pair", categoryLabel: "сильная top pair",
          baselineRole: "Вэлью-опора полублефов",
          whyThisHand: "K♦Q♦ находится наверху одно-парной части BB и может получить продолжение от части Kx хуже. Если всё сильное только коллирует, X/R остаётся без естественной вэлью-опоры.",
          bestTurns: "K усиливает до трипса, Q — до двух пар. Чистые низкие бланки часто сохраняют второй контролируемый вэлью-баррель.",
          slowdownTurns: "A ухудшает относительную силу пары; J/T и спаривание доски усиливают часть продолжения BTN. Это не автоматический три барреля с одной парой.",
          afterVillainContinues: "На K/Q продолжай уверенно; на чистом бланке добирай умеренно. На A/J/T/спаренной доске чаще оставляй место для чека и не стекуй одну пару против резкой агрессии.",
          controlId: "call-k7-top-pair",
          controlCopy: "K7 — тоже top pair, но слабый kicker оставляет её в check-call: сохраняем блефы BTN и не изолируемся против Kx сильнее.",
          takeaway: "Рейзим не любой Kx: верх top-pair части поддерживает X/R, более слабые Kx защищают колл."
        }),
        example({
          sourceIds: ["xr-k9-two-pair", "xr-k2-two-pair"], title: "Две пары", handClass: "Вэлью · K9 и K2",
          categoryKey: "two_pair", categoryLabel: "две пары",
          baselineRole: "Сильное вэлью против Kx",
          whyThisHand: "K9 и K2 уже бьют любую одну пару Kx и должны строить банк, пока BTN готов продолжать с top pair и усилениями.",
          bestTurns: "Повтор своей ранги даёт full house: K/9 для K9, K/2 для K2. Чистые низкие бланки сохраняют большое преимущество над одной парой.",
          slowdownTurns: "Для K2 девятка контрафитит исходные две пары; T/J/Q закрывают естественные gutshot. Сильная made hand остаётся вэлью, но сайз и ответ соперника важны.",
          afterVillainContinues: "На full-house картах играй на большой банк; большинство бланков продолжай ставить. На контрафите и закрывшихся straight-картах внимательнее реагируй на крупный рейз.",
          controlId: "call-k8-top-pair",
          controlCopy: "K8 — одна пара со слабым kicker. Она достаточно сильна для Call, но X/R чаще выбивает хуже и получает продолжение от Kx сильнее.",
          takeaway: "Две пары начинают добор сразу; соседняя одна пара сохраняет устойчивый check-call."
        }),
        example({
          sourceIds: ["xr-99-set", "xr-22-set", "xr-set-value"], title: "Сеты", handClass: "Вэлью · 99, 22 и 77",
          categoryKey: "set", categoryLabel: "сет",
          baselineRole: "Верх диапазона на сухой и two-tone доске",
          whyThisHand: "Сет быстро получает деньги от top pair, второй пары и дро. На Q72tt 77 дополнительно строит банк до того, как runout остановит Qx или закроет draw.",
          bestTurns: "Повтор ранга сета даёт каре; спаривание другой карты доски — full house. Большинство неспаренных бланков всё ещё оставляют сет очень сильной рукой.",
          slowdownTurns: "T/J/Q закрывают часть gutshot на K92; heart завершает фронтдорный flush на Q72tt и в варианте 22 на K92hh. Это карты внимания, а не автоматический fold.",
          afterVillainContinues: "На paired board играй на стек; на чистых бланках продолжай добор. Когда закрывается очевидное дро, уменьшай сайз или проверяй ответ соперника, сохраняя redraw к full house.",
          controlId: "call-55-q72",
          controlCopy: "55 на Q72tt — готовая underpair для Call. Showdown value есть, но полярный X/R лучше строить из сетов и сильных дро.",
          takeaway: "Название «нижний сет» не делает руку средней: сеты формируют естественный верх value X/R."
        })
      ],
      bluff: [
        example({
          sourceIds: ["xr-t9-backdoors", "xr-97-double-backdoor"], title: "Двойной backdoor", handClass: "Полублеф · T9s и 97s",
          categoryKey: "double_backdoor", categoryLabel: "два backdoor-пути",
          baselineRole: "Лучший связный воздух",
          whyThisHand: "T♥9♥ и 9♥7♥ не имеют готового дро, но объединяют backdoor straight и backdoor flush. Это осмысленный нижний край X/R, а не лицензия рейзить любые две карты.",
          bestTurns: "T9: J/7 создают OESD; 97: T/6. Любой heart включает flush draw. В authored T9-линии J♥ ведёт к bet 10 BB, а Q♥ на ривере — к jam 24,5 BB.",
          slowdownTurns: "Спаривание K/8/2 укрепляет продолжение BTN; сухие оверкарты почти не добавляют equity. Попадание в T/9/7 чаще переводит руку в контроль showdown value.",
          afterVillainContinues: "Баррель лучшие straight-карты и hearts; промежуточные gutshot продолжай выборочно. На полном бланке спокойно завершай блеф вместо обязательного второго барреля.",
          controlId: "fold-j5-weak-backdoor",
          controlCopy: "J♥5♥ имеет только один слабый backdoor. База — Fold. При уверенном риде на сильный оверфолд X/R допустим как эксплойт, но T9/97 дисциплинированнее: у них два пути усиления.",
          takeaway: "Оверфолд позволяет расшириться, но базовый порядок кандидатов сохраняется: сначала руки с двумя независимыми путями усиления."
        }),
        example({
          sourceIds: ["xr-jt-gutshot", "xr-qt-gutshot", "xr-qj-gutshot"], title: "Gutshot + backdoor", handClass: "Полублеф · JT, QT и QJ",
          categoryKey: "gutshot_plus", categoryLabel: "gutshot + backdoor",
          baselineRole: "Готовая equity и полезные блокеры",
          whyThisHand: "У всех трёх рук уже есть прямой аут на straight и мастевая backdoor-ветка. QJ дополнительно убирает часть KQ/KJ из сильного продолжения BTN.",
          bestTurns: "JT закрывает straight на Q, QT — на J, QJ — на T. Мастевая карта включает flush draw; для JT восьмёрка также создаёт OESD.",
          slowdownTurns: "Спаривание K/9/2 усиливает часть диапазона колла; сухие низкие бланки почти не добавляют equity. Q/J/T, давшие пару, чаще переводят полублеф в контроль.",
          afterVillainContinues: "На straight-карте переходи к вэлью, на мастевых картах продолжай полублеф. На паре чаще реализуй showdown value, на пустой карте разреши себе give-up.",
          controlId: "fold-t8-backdoor-only",
          controlCopy: "T8 имеет только один runner-runner straight-путь. База — Fold; против явного оверфолда X/R допустим как эксплойт, но JT/QT/QJ дисциплинированнее благодаря готовому gutshot и backdoor-ветке.",
          takeaway: "Эксплойт может расширить X/R, но готовый gutshot даёт намного надёжнее план после колла, чем один далёкий runner-runner путь."
        })
      ]
    },
    practice,
    practiceModes: [
      {
        key: "all",
        label: "Все ситуации",
        description: "Калибровочная учебная колода: value, полублефы, calls и folds. Сначала T♥9♥ до showdown, затем очередь бесконечно перемешивается.",
        reference: "В полном цикле 11 базовых X/R из 66 решений = 16,7%. Оптимистичные X/R считаются отдельно: они допустимы при уверенном риде на оверфолд, но база выбирает руки дисциплинированнее.",
        compareExpectedXr: true,
        spotIds: allModeIds
      },
      {
        key: "missed",
        label: "Пропущенные X/R",
        description: "Усиленная выборка X/R-кандидатов плюс два контроля. Сначала T♥9♥ до showdown; это поиск пропусков относительно учебной линии, не exact-combo анализ League 1.",
        reference: "Режим намеренно переобогащён X/R: смотри на пропуски и оптимистичные эксплойт-рейзы, не сравнивай свою частоту с полем.",
        spotIds: [...xrIds, "call-a8-middle-pair", "fold-t8-backdoor-only"]
      }
    ]
  };
})();
