(function () {
  "use strict";

  const observedConfidence = window.FFObservedFrequencyConfidence;

  const BOARD_STRUCTURES = [
    { key: "a_high_dry", label: "Туз-хай · сухая", note: "туз на флопе · три масти · без плотных связей" },
    { key: "k_high_dry", label: "Король-хай · сухая", note: "король на флопе · три масти · без плотных связей" },
    { key: "broadway", label: "Бродвейная", note: "две или три карты от десятки" },
    { key: "low_connected", label: "Низкая связанная", note: "низкие карты · много стрит-дро" },
    { key: "paired", label: "Спаренная / трипс", note: "две или три карты одного ранга" },
    { key: "two_tone", label: "Двухмастная", note: "две карты одной масти" },
    { key: "monotone", label: "Монотонная", note: "три карты одной масти" },
    { key: "other", label: "Другие разноцветные", note: "остальные неспаренные флопы трёх мастей" }
  ];

  const METHODOLOGY_BOARDS = {
    a_high_dry: { cards: ["Ac", "7d", "2h"], action: "Ставь 25–33%", note: "Сухой туз-хай хорошо поддерживает широкий диапазон префлоп-рейзера." },
    k_high_dry: { cards: ["Ks", "8h", "3d"], action: "Ставь 25–33%", note: "На сухом король-хай маленькая ставка сохраняет диапазон широким." },
    broadway: { cards: ["Qh", "Jc", "4s"], action: "Ставь выборочно", note: "Следи за количеством сильных пар и дро у BB, не нажимай кнопку автоматически." },
    low_connected: { cards: ["7s", "6h", "5d"], action: "С воздухом чаще чек", note: "Низкая связанная доска лучше цепляет диапазон колла BB." },
    paired: { cards: ["Jh", "Jc", "4s"], action: "Ставь 25%", note: "Маленький размер давит на воздух и не требует раздувать банк." },
    two_tone: { cards: ["Qh", "7h", "2c"], action: "Разделяй по руке", note: "Вэлью и дро ставят охотнее; чистый воздух сильнее зависит от блокеров." },
    monotone: { cards: ["8s", "5s", "3s"], action: "Ставь 25% или чек", note: "На одной масти большой размер редко нужен всему диапазону." },
    other: { cards: ["Tc", "6d", "2h"], action: "Начни с 25–33%", note: "Если доска не даёт явной причины замедлиться, сохраняй простой план." }
  };

  const LEAGUE_COHORTS = [
    { key: "1-5", label: "Лига 1 · R1–5", cohort: { type: "band", from: 1, to: 5 } },
    { key: "6-10", label: "Лига 2 · R6–10", cohort: { type: "band", from: 6, to: 10 } },
    { key: "11-14", label: "Лига 3 · R11–14", cohort: { type: "band", from: 11, to: 14 } },
    { key: "15-18", label: "Ранги 15–18", cohort: { type: "band", from: 15, to: 18 } }
  ];

  const BOARD_EXAMPLE_SCENARIOS = [
    {
      key: "league1_more",
      label: "Лига 1 ставит — ранги 15–18 чекают"
    }
  ];

  const CARD_RANK_NAMES = {
    A: "туз", K: "король", Q: "дама", J: "валет", T: "десятка",
    9: "девятка", 8: "восьмёрка", 7: "семёрка", 6: "шестёрка",
    5: "пятёрка", 4: "четвёрка", 3: "тройка", 2: "двойка"
  };

  const CARD_SUITS = {
    s: { symbol: "♠", name: "пик" },
    h: { symbol: "♥", name: "червей" },
    d: { symbol: "♦", name: "бубен" },
    c: { symbol: "♣", name: "треф" }
  };

  const METRICS = {
    cbet: { label: "Как часто поле ставит", short: "Ставка поля", kind: "percent" },
    fold: { label: "Как часто BB пасует", short: "Пас BB", kind: "percent" },
    cbet_size: { label: "Любимый размер ставки", short: "Размер", kind: "size" },
    xr: { label: "Как часто BB чек-рейзит", short: "Чек-рейз", kind: "percent" }
  };

  const METRIC_ALIASES = {
    cbet: ["cbet", "c_bet", "cbet_pct", "cbet_percent", "cbet_frequency", "flop_cbet"],
    fold: ["fold", "fold_pct", "fold_percent", "observed_fe", "observed_fold_equity", "fold_equity", "fold_to_cbet"],
    xr: ["xr", "x_r", "check_raise", "check_raise_pct", "check_raise_against", "check_raise_against_us", "xr_against_us"]
  };

  const STRUCTURE_ALIASES = {
    a_high_dry: ["a_high_dry", "ace_high_dry", "a_high_rainbow_dry", "a_hi_dry"],
    k_high_dry: ["k_high_dry", "king_high_dry", "k_high_rainbow_dry", "k_hi_dry"],
    broadway: ["broadway", "broadway_heavy", "high_broadway"],
    low_connected: ["low_connected", "low_connected_wet", "low_8_connected", "low_connected_board"],
    paired: ["paired", "pair", "paired_board"],
    two_tone: ["two_tone", "twotone", "two_suit", "two_suited"],
    monotone: ["monotone", "monotonic", "one_suit"],
    other: ["other", "other_rainbow", "rainbow_other"]
  };

  const WISDOM_SLIDES = [
    {
      kind: "default",
      kicker: "Учебный автопилот",
      title: "BB чекнул — по умолчанию ставь",
      wisdom: "Сначала научись видеть очевидный c-bet. Исключения добавишь потом.",
      body: "Для новичка рангов 15–18 полезнее широкий и понятный план, чем попытка сразу сбалансировать каждый редкий чек.",
      note: "BTN открылся, BB заколлировал и прочекал."
    },
    {
      kind: "high",
      kicker: "Высокие доски",
      title: "На высокой доске выбирай размер, а не причину для чека",
      wisdom: "A-high и K-high — самые простые места для мелкого c-bet.",
      body: "Сухие высокие флопы чаще сохраняют преимущество диапазона префлоп-рейзера. Здесь маленькая ставка давит на воздух BB и не раздувает банк.",
      note: "Это учебное правило по структуре доски; поле ниже сравнивается только там, где полный источник поддерживает точный срез."
    },
    {
      kind: "range",
      kicker: "Почему это работает",
      title: "Слабая рука не означает слабый диапазон",
      wisdom: "Высокая доска чаще даёт преимущество диапазону префлоп-рейзера.",
      body: "Такая доска чаще даёт преимущество диапазону префлоп-рейзера: у Hero больше сильных Ax и премиальных комбинаций. Поэтому даже Q♠J♠ без пары может поддержать широкий мелкий c-bet на A-high.",
      note: "Мы ставим диапазоном, а не только тогда, когда попали во флоп."
    },
    {
      kind: "small",
      kicker: "Размер ставки",
      title: "Спаренная и монотонная доски просят маленькую ставку",
      wisdom: "25% позволяют ставить широко и не раздувать банк.",
      body: "На спаренных и монотонных флопах маленький сайз позволяет ставить широко. Страшный вид доски сам по себе не причина отдавать бесплатную карту."
    },
    {
      kind: "value",
      kicker: "Эксплойт слабого коллера",
      title: "Сильная рука зарабатывает ставками, а не надеждой",
      wisdom: "Против «часто коллирует» — 50–67%. Без такого рида хочешь заманить — ставь мало, не чекай.",
      body: "Это сайз для вэлью против конкретного рида, а не новый размер для всего диапазона. Чек-ловушку оставь против доказанно агрессивного соперника.",
      note: "Без рида возвращайся к простому маленькому c-bet."
    },
    {
      kind: "exception",
      kicker: "Нюанс на будущее",
      title: "Низкая связанная выключает автопилот",
      wisdom: "С чистым воздухом чаще чек; если ставишь — выбирай 25%.",
      body: "На 7-6-5 и 6-5-4 диапазон колла BB сильнее цепляется за доску. Поэтому чистый воздух можно прочекать, а ставку оставить рукам с вэлью или понятным усилением.",
      note: "Доска — методический пример, а не полевой процент для отдельной текстуры."
    },
    {
      kind: "algorithm",
      kicker: "Забери с собой",
      title: "Сначала правило, потом нюансы",
      wisdom: "Твоя задача — быстро узнать один из четырёх простых планов.",
      body: "Не пытайся решить весь покер на одном флопе. Сначала выбери структуру и базовый размер; точные частоты, риды и исключения добавляй после уверенного решения.",
      note: "Сначала правило. Потом риды, диапазоны и исключения."
    }
  ];

  function fishTrainerSpot(
    structure,
    board,
    hand,
    read,
    explanation,
    accepted = ["50", "67"],
    title = "Добирай с фиша"
  ) {
    return {
      structure,
      board,
      hand,
      opponent: `чек · ${read}`,
      opponentClass: "is-loose",
      accepted,
      title,
      explanation
    };
  }

  const TRAINER_FISH_SPOTS = [
    fishTrainerSpot(
      "A-high · топ-пара",
      ["Ah", "7d", "2c"],
      ["As", "Kd"],
      "часто коллирует",
      "Фиш платит с худшими Ax и слабыми парами. С топ-парой и сильным кикером добирай 50–67% банка."
    ),
    fishTrainerSpot(
      "K-high · топ-пара",
      ["Kh", "8d", "3c"],
      ["Ks", "Qd"],
      "не любит фолдить",
      "Фиш продолжает с худшими Kx, восьмёрками и карманками. Сильная топ-пара хочет 50–67% банка."
    ),
    fishTrainerSpot(
      "Q-high · топ-пара",
      ["Qh", "9h", "5c"],
      ["Qs", "Ad"],
      "тянет любые дро",
      "Фиш переплачивает с флеш-дро, девятками и гатшотами. Добирай и защищайся ставкой 50–67% банка."
    ),
    fishTrainerSpot(
      "J-high · топ-пара",
      ["Jh", "7h", "4c"],
      ["Js", "Ad"],
      "платит с парой",
      "Фиш коллирует худшие Jx, семёрки и дро. Топ-пара с сильным кикером ставит 50–67% банка."
    ),
    fishTrainerSpot(
      "T-high · оверпара",
      ["Tc", "8d", "3h"],
      ["As", "Ah"],
      "коллирует широко",
      "Фиш не выбрасывает Tx, восьмёрки и карманки. Оверпара уверенно добирает 50–67% банка."
    ),
    fishTrainerSpot(
      "Спаренная · оверпара",
      ["7s", "7h", "4d"],
      ["Kc", "Kd"],
      "цепляется за карманки",
      "Фиш платит с четвёрками и младшими карманками. Не слоуплей — ставь 50–67% банка."
    ),
    fishTrainerSpot(
      "A-high · две пары",
      ["Ac", "9h", "5h"],
      ["As", "9d"],
      "не выбрасывает Ax",
      "Фиш широко продолжает с любым тузом и флеш-дро. Две пары добирают 50–67% банка."
    ),
    fishTrainerSpot(
      "K-high · две пары",
      ["Kc", "Jh", "4h"],
      ["Ks", "Jd"],
      "переигрывает топ-пару",
      "Фиш редко отпускает Kx и тянет флеш-дро. Две пары ставят 50–67% банка."
    ),
    fishTrainerSpot(
      "Спаренная · трипс",
      ["8c", "5h", "5d"],
      ["5s", "As"],
      "платит до ривера",
      "Фиш продолжает с восьмёрками, карманками и оверкартами. Трипс начинает добор с 50–67% банка."
    ),
    fishTrainerSpot(
      "Связанная · стрит",
      ["9h", "8h", "7c"],
      ["Js", "Td"],
      "тянет пары и дро",
      "Фиш платит с двумя парами, сетами и сильными дро. Готовый стрит ставит 50–67% банка."
    ),
    fishTrainerSpot(
      "Монотонная · натс",
      ["8s", "5s", "3s"],
      ["As", "Qs"],
      "платит с любой пикой",
      "Фиш переоценивает младшие флеши и пары с пикой. Натсовый флеш добирает 50–67% банка."
    ),
    fishTrainerSpot(
      "K-high · воздух",
      ["Kd", "6c", "2s"],
      ["Qh", "Jh"],
      "редко фолдит",
      "Даже против фиша высокая сухая доска остаётся хорошей для c-bet. С воздухом ставь только 25–33% банка.",
      ["25", "33"],
      "Фиш — не причина раздувать банк"
    ),
    fishTrainerSpot(
      "Низкая связанная · воздух",
      ["7c", "6d", "5c"],
      ["Kd", "Qh"],
      "тянет пары и дро",
      "На связанной доске фиш редко выбрасывает пару или дро. С воздухом c-bet можно пропустить.",
      ["check"],
      "Здесь можно взять бесплатную карту"
    )
  ];

  const TRAINER_FALLBACK_SPOTS = [
    {
      structure: "K-high · сухая",
      board: ["Kc", "7d", "2h"],
      hand: ["Qs", "Js"],
      opponent: "чек · ридов нет",
      accepted: ["25", "33"],
      checkFeedback: "Здесь лучше всегда ставить. ",
      title: "Мелкая ставка — базовый план",
      explanation: "Высокая сухая доска хорошо подходит диапазону Hero. 25–33% дают дешёвый широкий c-bet; чек здесь чаще означает, что новичок переусложнил простой спот."
    },
    {
      structure: "Спаренная",
      board: ["Js", "Jh", "4d"],
      hand: ["Qc", "9c"],
      opponent: "чек · ридов нет",
      accepted: ["25"],
      title: "Пара на доске не отменяет c-bet",
      explanation: "У BB много рук, которым трудно продолжать даже против маленькой ставки. Выбирай 25% и не превращай спаренный флоп в автоматический чек."
    },
    {
      structure: "Монотонная",
      board: ["8s", "5s", "3s"],
      hand: ["Ah", "Qd"],
      opponent: "чек · ридов нет",
      accepted: ["25"],
      title: "Страшная доска — маленькая ставка",
      explanation: "Монотонный флоп не требует большого сайза. 25% давит на воздух BB и сохраняет управляемым банк, когда он продолжает."
    },
    {
      structure: "Низкая связанная",
      board: ["6s", "5h", "4s"],
      hand: ["Kc", "Qd"],
      opponent: "чек · ридов нет",
      accepted: ["check"],
      title: "Не ставь чистый воздух на автопилоте",
      explanation: "На 6-5-4 диапазон BB хорошо цепляется за доску. Без пары, дро и бэкдоров KQ может взять бесплатную карту."
    }
  ];

  const TRAINER_STRUCTURE_RULES = {
    a_high_dry: {
      structure: "A-high · сухая",
      accepted: ["25", "33"],
      checkFeedback: "Здесь лучше всегда ставить. ",
      title: "Мелкая ставка — базовый план",
      explanation: "Высокая сухая доска хорошо подходит диапазону Hero. 25–33% дают дешёвый широкий c-bet."
    },
    k_high_dry: {
      structure: "K-high · сухая",
      accepted: ["25", "33"],
      checkFeedback: "Здесь лучше всегда ставить. ",
      title: "Мелкая ставка — базовый план",
      explanation: "Высокая сухая доска хорошо подходит диапазону Hero. 25–33% дают дешёвый широкий c-bet."
    },
    broadway: {
      structure: "Бродвейная",
      accepted: ["25", "33"],
      title: "Мелкая ставка — базовый план",
      explanation: "Высокие карты подходят диапазону префлоп-рейзера. Начни с 25–33% и не ищи лишнюю причину для чека."
    },
    paired: {
      structure: "Спаренная",
      accepted: ["25"],
      title: "Пара на доске не отменяет c-bet",
      explanation: "У BB много рук, которым трудно продолжать даже против маленькой ставки. Выбирай 25%."
    },
    two_tone: {
      structure: "Two-tone",
      accepted: ["25", "33"],
      title: "Мелкая ставка — базовый план",
      explanation: "Две карты одной масти не отменяют широкий c-bet. Базовый план — 25–33%."
    },
    monotone: {
      structure: "Монотонная",
      accepted: ["25"],
      title: "Страшная доска — маленькая ставка",
      explanation: "Монотонный флоп не требует большого сайза. 25% давит на воздух BB и сохраняет банк управляемым."
    },
    low_connected: {
      structure: "Низкая связанная",
      accepted: ["check"],
      title: "Не ставь чистый воздух на автопилоте",
      explanation: "Низкая связанная доска хорошо подходит диапазону BB. С чистым воздухом чаще бери бесплатную карту; маленькую ставку оставляй рукам с понятным вэлью или усилением."
    },
    other: {
      structure: "Другая rainbow",
      accepted: ["25", "33"],
      title: "Мелкая ставка — базовый план",
      explanation: "Без особого рида на BB сохраняй простой план: широкий c-bet 25–33%."
    }
  };

  const SNAPSHOT_ACTIONS = [
    { key: "check", label: "Чек" },
    { key: "small", label: "С-бет 25–33%" },
    { key: "large", label: "С-бет 50–67%" }
  ];
  const SNAPSHOT_SEAT_ORDER = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
  const COURSE_PROGRESS = Object.freeze({
    skillKey: "ff_learning_flop_cbet_hu",
    targetHands: 25,
    passScore: 80,
    mode: "flop-cbet-hu"
  });

  const state = {
    step: "deal",
    dealChoice: "",
    cohortMode: "rank",
    rank: 15,
    leagueBand: "15-18",
    metric: "cbet",
    tableMode: "focus",
    structure: "a_high_dry",
    xrCbetSize: "all",
    fullHistoryPosition: "BTN",
    wisdomIndex: 0,
    trainerIndex: 0,
    trainerScore: 0,
    trainerAnswered: false,
    trainerChoice: "",
    trainerRunning: false,
    trainerSpot: null,
    trainerQueue: [],
    trainerLastKey: "",
    courseReported: false,
    courseSessionId: ""
  };

  const pageParams = new URLSearchParams(window.location.search);
  const requestedStepRaw = pageParams.get("step");
  const requestedStep = requestedStepRaw === "simulator" ? "practice" : requestedStepRaw;
  const isEmbedded = pageParams.get("embed") === "1" || window.self !== window.top;
  document.documentElement.dataset.embed = String(isEmbedded);

  const rawData = window.FF_FLOP_CBET_HU_DATA || null;
  const model = buildModel(rawData);

  function query(selector, root) {
    return (root || document).querySelector(selector);
  }

  function queryAll(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function numberFrom(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function firstNumber(row, keys) {
    for (const key of keys) {
      const value = numberFrom(row && row[key]);
      if (value !== null) return value;
    }
    return null;
  }

  function firstText(row, keys) {
    for (const key of keys) {
      if (row && row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
        return String(row[key]).trim();
      }
    }
    return "";
  }

  function normalizedToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/%/g, "pct")
      .replace(/[^a-zа-яё0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "");
  }

  function normalizeStructure(value) {
    const token = normalizedToken(value);
    for (const [canonical, aliases] of Object.entries(STRUCTURE_ALIASES)) {
      if (aliases.includes(token)) return canonical;
    }
    return token;
  }

  function normalizeMetric(value) {
    const token = normalizedToken(value);
    for (const [canonical, aliases] of Object.entries(METRIC_ALIASES)) {
      if (aliases.includes(token)) return canonical;
    }
    return token;
  }

  function normalizeRankBand(row) {
    const explicit = firstText(row, ["rank_band", "rankBand", "band", "cohort"]);
    const match = explicit.match(/(\d+)\s*[-–—]\s*(\d+)/);
    if (match) return `${Number(match[1])}-${Number(match[2])}`;
    const from = firstNumber(row, ["rank_from", "rankFrom", "min_rank"]);
    const to = firstNumber(row, ["rank_to", "rankTo", "max_rank"]);
    return from !== null && to !== null ? `${from}-${to}` : "";
  }

  function normalizePercentValue(row, rawValue) {
    if (rawValue === null) return null;
    const unit = normalizedToken(firstText(row, ["unit", "value_unit"]));
    if (["ratio", "fraction", "share"].includes(unit)) return rawValue * 100;
    if (["percent", "percentage", "pct"].includes(unit)) return rawValue;
    return Math.abs(rawValue) <= 1 ? rawValue * 100 : rawValue;
  }

  function commonFields(row) {
    return {
      rank: firstNumber(row, ["rank", "rang", "ff_rank"]),
      league: firstNumber(row, ["league", "ranked_league", "liga"]),
      rankBand: normalizeRankBand(row),
      structure: normalizeStructure(firstText(row, ["structure", "board_structure", "boardStructure", "texture"])),
      players: firstNumber(row, ["players", "player_count", "unique_players", "n_players"]),
      playerIds: Array.isArray(row.player_ids) ? row.player_ids.map(String) : null
    };
  }

  function normalizeLongMetric(row) {
    const fields = commonFields(row);
    const metric = normalizeMetric(firstText(row, ["metric", "metric_key", "name"]));
    if (!METRICS[metric] || metric === "cbet_size" || !fields.structure) return null;
    const numerator = firstNumber(row, ["numerator", "successes", "count_yes", "events"]);
    const denominator = firstNumber(row, ["denominator", "n", "opportunities", "base"]);
    const direct = firstNumber(row, ["value", "rate", "pct", "percent"]);
    return {
      ...fields,
      metric,
      numerator,
      denominator,
      value: normalizePercentValue(row, direct)
    };
  }

  function normalizeWideMetrics(row) {
    const fields = commonFields(row);
    if (!fields.structure) return [];
    const definitions = [
      {
        metric: "cbet",
        numerator: ["cbets", "cbet_count", "flop_cbets"],
        denominator: ["cbet_opportunities", "opportunities", "flop_cbet_opportunities"],
        value: ["cbet_pct", "cbet_percent", "cbet_frequency"]
      },
      {
        metric: "fold",
        numerator: ["folds", "bb_folds", "fold_count", "folds_to_cbet"],
        denominator: ["fold_opportunities", "response_opportunities", "cbet_response_opportunities", "valid_responses"],
        value: ["fold_pct", "observed_fe", "observed_fold_equity"]
      },
      {
        metric: "xr",
        numerator: ["check_raises", "xr_count", "bb_check_raises", "check_raises_against_us"],
        denominator: ["xr_opportunities", "response_opportunities", "cbet_response_opportunities", "valid_responses"],
        value: ["xr_pct", "check_raise_pct", "check_raise_against_pct"]
      }
    ];
    return definitions.map((definition) => {
      const numerator = firstNumber(row, definition.numerator);
      const denominator = firstNumber(row, definition.denominator);
      const direct = firstNumber(row, definition.value);
      if (numerator === null && denominator === null && direct === null) return null;
      return {
        ...fields,
        metric: definition.metric,
        numerator,
        denominator,
        value: normalizePercentValue({ unit: direct !== null ? "percent" : "" }, direct)
      };
    }).filter(Boolean);
  }

  function normalizeSizeRow(row, kind) {
    const fields = commonFields(row);
    if (!fields.structure) return null;
    const labelKeys = kind === "cbet"
      ? ["size_bin", "sizeBin", "bin", "label", "cbet_size_bin", "size_label"]
      : ["size_bin", "sizeBin", "bin", "label", "xr_size_bin", "raise_to_bin", "size_label"];
    const label = firstText(row, labelKeys);
    if (!label) return null;
    return {
      ...fields,
      label,
      count: firstNumber(row, ["count", "n", "events", "frequency"]),
      share: normalizePercentValue(row, firstNumber(row, ["share", "value", "pct", "percent"])),
      order: firstNumber(row, ["order", "sort", "sort_order"]),
      ourCbetSizeBin: firstText(row, ["our_cbet_size_bin", "ourCbetSizeBin", "cbet_size_filter"]),
      folds: firstNumber(row, ["folds", "fold_count"]),
      validResponses: firstNumber(row, ["valid_responses", "valid_response_count"]),
      xrCount: firstNumber(row, ["xr_count", "checkraise_count", "checkraise_against_us_count"]),
      xrValidResponses: firstNumber(row, ["xr_valid_responses", "checkraise_eligible_valid_response_count"]),
      meanBetPctPot: firstNumber(row, ["mean_bet_pct_pot", "mean_cbet_pct_pot"]),
      meanBreakevenFe: normalizePercentValue(
        { unit: "ratio" },
        firstNumber(row, ["mean_breakeven_fe", "mean_breakeven_fold_equity"])
      )
    };
  }

  function normalizeOverallCbet(row) {
    const fields = commonFields(row);
    if (fields.rank === null && !fields.rankBand) return null;
    const numerator = firstNumber(row, ["numerator", "cbets", "cbet_count", "flop_cbets"]);
    const denominator = firstNumber(row, ["denominator", "n", "cbet_opportunities", "opportunities", "flop_cbet_opportunities"]);
    const direct = firstNumber(row, ["value", "rate", "pct", "percent", "cbet_pct", "cbet_frequency"]);
    return {
      ...fields,
      metric: "cbet",
      numerator,
      denominator,
      value: normalizePercentValue(row, direct)
    };
  }

  function arrayAt(data, keys) {
    for (const key of keys) {
      const parts = key.split(".");
      let value = data;
      for (const part of parts) value = value && value[part];
      if (Array.isArray(value)) return value;
    }
    return [];
  }

  function buildModel(data) {
    if (!data || typeof data !== "object") {
      return { ready: false, status: "missing", meta: {}, metrics: [], overallCbet: [], cbetSizes: [], xrSizes: [], boardExamples: null, fullHistory: null };
    }

    const rows = arrayAt(data, ["metrics", "rows"]);
    const observations = arrayAt(data, ["observations", "boardRows", "board_rows"]);
    const explicitMetrics = rows.filter((row) => row && (row.metric || row.metric_key || row.name));
    const wideRows = observations.length ? observations : rows.filter((row) => row && !(row.metric || row.metric_key || row.name));
    const metrics = explicitMetrics.map(normalizeLongMetric).filter(Boolean);
    wideRows.forEach((row) => metrics.push(...normalizeWideMetrics(row)));

    const cbetSizeRows = arrayAt(data, ["cbetSizes", "cbet_sizes", "sizes.cbet", "sizeDistributions.cbet"]);
    const xrSizeRows = arrayAt(data, ["checkRaiseSizes", "check_raise_sizes", "xr_sizes", "sizes.check_raise", "sizeDistributions.checkRaise"]);
    const overallCbetRows = arrayAt(data, ["overallCbet", "overall_cbet", "rankBaselines", "rank_baselines"]);
    const overallCbet = overallCbetRows.map(normalizeOverallCbet).filter(Boolean);
    const cbetSizes = cbetSizeRows.map((row) => normalizeSizeRow(row, "cbet")).filter(Boolean);
    const xrSizes = xrSizeRows.map((row) => normalizeSizeRow(row, "xr")).filter(Boolean);
    const boardExamples = data.boardExamples && typeof data.boardExamples === "object"
      ? data.boardExamples
      : (data.board_examples && typeof data.board_examples === "object" ? data.board_examples : null);
    const fullHistory = data.fullHistory && typeof data.fullHistory === "object"
      ? {
          meta: data.fullHistory.meta && typeof data.fullHistory.meta === "object" ? data.fullHistory.meta : {},
          rows: Array.isArray(data.fullHistory.rows) ? data.fullHistory.rows.filter((row) => row && typeof row === "object") : []
        }
      : null;

    return {
      ready: metrics.length > 0 || overallCbet.length > 0 || cbetSizes.length > 0 || xrSizes.length > 0 || Boolean(fullHistory && fullHistory.rows.length),
      status: firstText(data, ["status"]) || "ready",
      meta: data.meta && typeof data.meta === "object" ? data.meta : {},
      metrics,
      overallCbet,
      cbetSizes,
      xrSizes,
      boardExamples,
      fullHistory
    };
  }

  function fullHistoryRows(node) {
    const rows = model.fullHistory && Array.isArray(model.fullHistory.rows)
      ? model.fullHistory.rows
      : [];
    return node ? rows.filter((row) => row.node === node) : rows;
  }

  function methodologyOnly() {
    return model.status === "methodology_only" && !fullHistoryRows().length;
  }

  function fullHistoryAggregate(cohort, filters = {}) {
    const rows = fullHistoryRows("cbet").filter((row) => (
      row.cohort === cohort
      && (!filters.position || row.position === filters.position)
      && (!filters.depthBand || row.depthBand === filters.depthBand)
    ));
    const opportunities = rows.reduce((sum, row) => sum + Number(row.opportunities || 0), 0);
    const cbets = rows.reduce((sum, row) => sum + Number(row.cbets || 0), 0);
    return {
      opportunities,
      cbets,
      value: opportunities >= 50 ? (cbets / opportunities) * 100 : null,
      publishable: opportunities >= 50
    };
  }

  function bandBounds(value) {
    const match = String(value || "").match(/(\d+)\s*[-–—]\s*(\d+)/);
    return match ? [Number(match[1]), Number(match[2])] : null;
  }

  function rowsForCohort(rows, cohort) {
    if (cohort.type === "rank") {
      return rows.filter((row) => row.rank === cohort.rank);
    }

    const band = `${cohort.from}-${cohort.to}`;
    const preAggregated = rows.filter((row) => row.rank === null && row.rankBand === band);
    if (preAggregated.length) return preAggregated;
    return rows.filter((row) => row.rank !== null && row.rank >= cohort.from && row.rank <= cohort.to);
  }

  function selectedCohort() {
    if (state.cohortMode === "rank") return { type: "rank", rank: state.rank };
    const bounds = bandBounds(state.leagueBand) || [15, 18];
    return { type: "band", from: bounds[0], to: bounds[1] };
  }

  function metricSummary(metric, structure, cohort) {
    const rows = rowsForCohort(
      model.metrics.filter((row) => row.metric === metric && row.structure === structure),
      cohort
    );
    if (!rows.length) return null;

    const ratioRows = rows.filter((row) => row.numerator !== null && row.denominator !== null && row.denominator > 0);
    let value = null;
    let n = null;
    if (ratioRows.length) {
      const numerator = ratioRows.reduce((sum, row) => sum + row.numerator, 0);
      const denominator = ratioRows.reduce((sum, row) => sum + row.denominator, 0);
      value = denominator > 0 ? (numerator / denominator) * 100 : null;
      n = denominator;
    } else {
      const valueRows = rows.filter((row) => row.value !== null);
      const weightedRows = valueRows.filter((row) => row.denominator !== null && row.denominator > 0);
      if (weightedRows.length) {
        const totalWeight = weightedRows.reduce((sum, row) => sum + row.denominator, 0);
        value = weightedRows.reduce((sum, row) => sum + row.value * row.denominator, 0) / totalWeight;
        n = totalWeight;
      } else if (valueRows.length === 1) {
        value = valueRows[0].value;
        n = valueRows[0].denominator;
      }
    }

    const playerIds = new Set();
    rows.forEach((row) => (row.playerIds || []).forEach((id) => playerIds.add(id)));
    const players = playerIds.size
      ? playerIds.size
      : (rows.length === 1 && rows[0].players !== null ? rows[0].players : null);
    return value === null ? null : { value, n, players };
  }

  function overallCbetSummary(cohort) {
    const rows = rowsForCohort(model.overallCbet, cohort);
    if (!rows.length) return null;
    const ratioRows = rows.filter((row) => row.numerator !== null && row.denominator !== null && row.denominator > 0);
    if (ratioRows.length) {
      const numerator = ratioRows.reduce((sum, row) => sum + row.numerator, 0);
      const denominator = ratioRows.reduce((sum, row) => sum + row.denominator, 0);
      return {
        value: denominator > 0 ? (numerator / denominator) * 100 : null,
        n: denominator,
        players: rows.length === 1 ? rows[0].players : null
      };
    }
    const valueRows = rows.filter((row) => row.value !== null);
    if (valueRows.length !== 1) return null;
    return { value: valueRows[0].value, n: valueRows[0].denominator, players: valueRows[0].players };
  }

  function sizeSummary(kind, structure, cohort) {
    const source = kind === "cbet" ? model.cbetSizes : model.xrSizes;
    const structureRows = source.filter((row) => {
      if (row.structure !== structure) return false;
      if (kind !== "xr") return true;
      const filter = row.ourCbetSizeBin || "all";
      return filter === state.xrCbetSize;
    });
    const rows = rowsForCohort(structureRows, cohort);
    if (!rows.length) return null;

    const buckets = new Map();
    rows.forEach((row) => {
      const bucket = buckets.get(row.label) || {
        label: row.label,
        count: 0,
        shares: [],
        order: row.order,
        folds: 0,
        validResponses: 0,
        xrCount: 0,
        xrValidResponses: 0,
        breakevenWeighted: 0,
        breakevenWeight: 0,
        betPctWeighted: 0,
        betPctWeight: 0
      };
      if (row.count !== null) bucket.count += row.count;
      if (row.share !== null) bucket.shares.push(row.share);
      if (row.folds !== null) bucket.folds += row.folds;
      if (row.validResponses !== null) bucket.validResponses += row.validResponses;
      if (row.xrCount !== null) bucket.xrCount += row.xrCount;
      if (row.xrValidResponses !== null) bucket.xrValidResponses += row.xrValidResponses;
      if (row.meanBreakevenFe !== null && row.count !== null && row.count > 0) {
        bucket.breakevenWeighted += row.meanBreakevenFe * row.count;
        bucket.breakevenWeight += row.count;
      }
      if (row.meanBetPctPot !== null && row.count !== null && row.count > 0) {
        bucket.betPctWeighted += row.meanBetPctPot * row.count;
        bucket.betPctWeight += row.count;
      }
      if (bucket.order === null && row.order !== null) bucket.order = row.order;
      buckets.set(row.label, bucket);
    });

    const entries = Array.from(buckets.values());
    const hasCounts = entries.some((entry) => entry.count > 0);
    const total = hasCounts ? entries.reduce((sum, entry) => sum + entry.count, 0) : null;
    entries.forEach((entry) => {
      entry.value = hasCounts && total > 0
        ? (entry.count / total) * 100
        : (entry.shares.length ? entry.shares.reduce((sum, value) => sum + value, 0) / entry.shares.length : null);
      entry.observedFe = entry.validResponses > 0 ? (entry.folds / entry.validResponses) * 100 : null;
      entry.xrRate = entry.xrValidResponses > 0 ? (entry.xrCount / entry.xrValidResponses) * 100 : null;
      entry.breakevenFe = entry.breakevenWeight > 0 ? entry.breakevenWeighted / entry.breakevenWeight : null;
      entry.meanBetPctPot = entry.betPctWeight > 0 ? entry.betPctWeighted / entry.betPctWeight : null;
    });
    entries.sort((a, b) => {
      if (a.order !== null || b.order !== null) return (a.order ?? 999) - (b.order ?? 999);
      const aNumber = Number.parseFloat(a.label.replace(",", "."));
      const bNumber = Number.parseFloat(b.label.replace(",", "."));
      if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return aNumber - bNumber;
      return a.label.localeCompare(b.label, "ru");
    });
    const valid = entries.filter((entry) => entry.value !== null);
    if (!valid.length) return null;
    const mode = valid.reduce((best, entry) => (!best || entry.value > best.value ? entry : best), null);
    return { entries: valid, mode: mode.label, n: total };
  }

  function currentMetricSummary(structure, cohort) {
    if (state.metric === "cbet_size") return sizeSummary("cbet", structure, cohort);
    return metricSummary(state.metric, structure, cohort);
  }

  function reliabilityFor(n) {
    if (!Number.isFinite(n)) return "unknown";
    const reliability = model.meta.reliability || {};
    const solidMin = numberFrom(reliability.solidMin ?? reliability.solid_min) ?? 200;
    const directionalMin = observedConfidence?.MIN_EXACT_DENOMINATOR ?? Number.POSITIVE_INFINITY;
    if (n >= solidMin) return "solid";
    if (n >= directionalMin) return "directional";
    return "thin";
  }

  function canRenderObservedFrequency(n) {
    return observedConfidence?.canRenderExact?.(n) === true;
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return "—";
    return `${new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
  }

  function reliabilityLabel(reliability) {
    return "";
  }

  function observedRateDisplay(value, denominator) {
    const reliability = reliabilityFor(denominator);
    return {
      value: Number.isFinite(value) && canRenderObservedFrequency(denominator) ? formatPercent(value) : "—",
      note: reliabilityLabel(reliability),
      reliability
    };
  }

  function metricDisplay(metric, summary) {
    if (!summary) return { value: "—", note: "", reliability: "unknown" };
    const reliability = reliabilityFor(summary.n);
    return {
      value: canRenderObservedFrequency(summary.n)
        ? (metric === "cbet_size" ? (summary.mode || "—") : formatPercent(summary.value))
        : "—",
      note: reliabilityLabel(reliability),
      reliability
    };
  }

  function cohortLabel(cohort) {
    return cohort.type === "rank" ? `Ранг ${cohort.rank}` : `Ранги ${cohort.from}–${cohort.to}`;
  }

  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function createLessonCardRow(cards, label, className) {
    const row = document.createElement("div");
    row.className = `wisdom-card-row${className ? ` ${className}` : ""}`;
    const normalized = cards.map(normalizeCardCode).filter(Boolean);
    fillColorBlockCards(row, normalized, `${label}: ${normalized.map(cardName).join(", ")}`, "mini");
    return row;
  }

  function createWisdomBoard(label, cards, className) {
    const board = document.createElement("div");
    board.className = `wisdom-board${className ? ` ${className}` : ""}`;
    board.append(textElement("span", "wisdom-board-label", label));
    board.append(createLessonCardRow(cards, label));
    return board;
  }

  function appendWisdomMetric(host, label, value, note, tone) {
    const metric = document.createElement("div");
    metric.className = `wisdom-metric${tone ? ` is-${tone}` : ""}`;
    metric.append(
      textElement("span", "", label),
      textElement("strong", "", value),
      textElement("small", "", note)
    );
    host.append(metric);
  }

  function smallCbetShare(structure, cohort) {
    const summary = sizeSummary("cbet", structure, cohort);
    if (!summary) return null;
    const smallEntries = summary.entries.filter((entry) => {
      const label = String(entry.label || "").replace(/\s/g, "");
      return label.includes("≤29") || label.includes("30–42");
    });
    if (!smallEntries.length) return null;
    return {
      value: smallEntries.reduce((sum, entry) => sum + (Number.isFinite(entry.value) ? entry.value : 0), 0),
      n: summary.n
    };
  }

  function appendWisdomSizeMatrix(host, cohorts) {
    const table = document.createElement("table");
    table.className = "wisdom-size-matrix";
    const caption = document.createElement("caption");
    caption.textContent = "Доля ставок ≤42%";
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Уровень", "Спаренные", "Монотонные"].forEach((label) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = label;
      headRow.append(cell);
    });
    head.append(headRow);

    const body = document.createElement("tbody");
    cohorts.forEach((item) => {
      const row = document.createElement("tr");
      row.className = `is-${item.tone}`;
      const label = document.createElement("th");
      label.scope = "row";
      label.textContent = item.label;
      row.append(label);
      ["paired", "monotone"].forEach((structure) => {
        const summary = smallCbetShare(structure, item.cohort);
        const display = metricDisplay("cbet", summary);
        const cell = document.createElement("td");
        cell.append(
          textElement("strong", "", display.value),
          textElement("small", "", display.note)
        );
        row.append(cell);
      });
      body.append(row);
    });
    table.append(caption, head, body);
    host.append(table);
  }

  function createHighBoardComparison(label, cards, structure, cohorts) {
    const card = document.createElement("article");
    card.className = "wisdom-high-card";
    card.append(createWisdomBoard(label, cards));

    const table = document.createElement("table");
    table.className = "wisdom-high-table";
    const caption = document.createElement("caption");
    caption.textContent = `${label}: как ставит поле и отвечает BB`;

    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    [
      { label: "Уровень" },
      { label: "Ставка", title: "Как часто поле ставит" },
      { label: "Пас BB", title: "Как часто BB выбрасывает" },
      { label: "Чек-рейз", title: "Как часто BB чек-рейзит" }
    ].forEach((item) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = item.label;
      if (item.title) cell.title = item.title;
      headRow.append(cell);
    });
    head.append(headRow);

    const body = document.createElement("tbody");
    cohorts.forEach((item) => {
      const row = document.createElement("tr");
      row.className = `is-${item.tone}`;
      const cohort = document.createElement("th");
      cohort.scope = "row";
      cohort.append(textElement("span", "", item.label));
      row.append(cohort);

      ["cbet", "fold", "xr"].forEach((metric) => {
        const summary = metricSummary(metric, structure, item.cohort);
        const display = metricDisplay(metric, summary);
        const cell = document.createElement("td");
        cell.title = METRICS[metric].label;
        cell.append(
          textElement("strong", "", display.value),
          textElement("small", "", display.note)
        );
        row.append(cell);
      });
      body.append(row);
    });

    table.append(caption, head, body);
    card.append(table);
    return card;
  }

  function renderWisdomVisual(host, slide) {
    const leagueOne = LEAGUE_COHORTS.find((item) => item.key === "1-5").cohort;
    const ranksElevenToFourteen = LEAGUE_COHORTS.find((item) => item.key === "11-14").cohort;
    const newcomers = LEAGUE_COHORTS.find((item) => item.key === "15-18").cohort;

    if (slide.kind === "default") {
      const boards = document.createElement("div");
      boards.className = "wisdom-board-grid";
      boards.append(
        createWisdomBoard("A-high", ["Ac", "7d", "2h"]),
        createWisdomBoard("K-high", ["Ks", "8h", "3d"]),
        createWisdomBoard("Бродвей", ["Qh", "Jc", "4s"])
      );
      const plan = document.createElement("div");
      plan.className = "wisdom-plan";
      plan.append(
        textElement("span", "", "По умолчанию"),
        textElement("strong", "", "c-bet 25–33%"),
        textElement("small", "", "пока доска не дала причину замедлиться")
      );
      host.append(boards, plan);
      return;
    }

    if (slide.kind === "high") {
      if (fullHistoryRows("cbet").length || methodologyOnly()) {
        const comparison = document.createElement("div");
        comparison.className = "wisdom-high-comparison is-methodology";
        comparison.append(
          createWisdomBoard("A-high · маленькая ставка", ["Ac", "7d", "2h"]),
          createWisdomBoard("K-high · маленькая ставка", ["Kh", "4c", "3s"])
        );
        const note = document.createElement("p");
        note.className = "wisdom-field-boundary";
        note.textContent = "Частоты поля не приписываются этим двум доскам: полный источник сравнивает позицию и стек, а структура здесь — учебная.";
        host.append(comparison, note);
        return;
      }
      const comparison = document.createElement("div");
      comparison.className = "wisdom-high-comparison";
      const cohorts = [
        { label: "Лига 1", cohort: leagueOne, tone: "expert" },
        { label: "Новички", cohort: newcomers, tone: "new" }
      ];
      comparison.append(
        createHighBoardComparison("A-high", ["Ac", "7d", "2h"], "a_high_dry", cohorts),
        createHighBoardComparison("K-high", ["Kh", "4c", "3s"], "k_high_dry", cohorts)
      );
      host.append(comparison);
      return;
    }

    if (slide.kind === "range") {
      const rangeStage = document.createElement("div");
      rangeStage.className = "wisdom-range-stage";
      const board = createWisdomBoard("Флоп", ["Ac", "7d", "2h"], "is-featured");
      const hand = document.createElement("div");
      hand.className = "wisdom-hand";
      hand.append(textElement("span", "", "Твоя рука"), createLessonCardRow(["Qs", "Js"], "Твоя рука", "is-hand"));
      const signal = document.createElement("div");
      signal.className = "wisdom-range-signal";
      signal.append(
        textElement("span", "", "Одна рука"),
        textElement("strong", "", "≠"),
        textElement("span", "", "весь диапазон")
      );
      rangeStage.append(board, hand, signal);
      host.append(rangeStage);
      return;
    }

    if (slide.kind === "small") {
      const sizes = document.createElement("div");
      sizes.className = "wisdom-size-pair";
      sizes.append(textElement("strong", "", "25–33%"));
      host.append(sizes);
      if (fullHistoryRows("cbet").length || methodologyOnly()) {
        host.append(textElement("p", "wisdom-field-boundary", "Размер — методический выбор. Полный полевой источник ниже не содержит надёжного разбиения по сайзингу, поэтому проценты здесь не дорисованы."));
        return;
      }
      appendWisdomSizeMatrix(host, [
        { label: "Лига 1", cohort: leagueOne, tone: "expert" },
        { label: "Ранги 11–14", cohort: ranksElevenToFourteen, tone: "middle" },
        { label: "Новички", cohort: newcomers, tone: "new" }
      ]);
      return;
    }

    if (slide.kind === "value") {
      const profile = document.createElement("div");
      profile.className = "wisdom-opponent is-loose";
      profile.append(
        textElement("span", "", "BB · рид"),
        textElement("strong", "", "часто коллирует"),
        textElement("small", "", "крупнее — только с сильным вэлью")
      );
      const valueSpot = document.createElement("div");
      valueSpot.className = "wisdom-value-spot";
      valueSpot.append(
        createLessonCardRow(["As", "Kd"], "Твоя рука", "is-hand"),
        createLessonCardRow(["Ah", "7d", "2c"], "Флоп")
      );
      const sizes = document.createElement("div");
      sizes.className = "wisdom-size-pair is-value";
      sizes.append(textElement("strong", "", "50%"), textElement("span", "", "—"), textElement("strong", "", "67%"));
      host.append(profile, valueSpot, sizes);
      return;
    }

    if (slide.kind === "exception") {
      const comparison = document.createElement("div");
      comparison.className = "wisdom-exception-grid";
      [
        { label: "A-high · сухая", structure: "a_high_dry", cards: ["Ac", "7d", "2h"], tone: "easy" },
        { label: "Низкая связанная", structure: "low_connected", cards: ["7s", "6h", "5d"], tone: "alert" }
      ].forEach((item) => {
        const card = document.createElement("div");
        card.className = `wisdom-exception is-${item.tone}`;
        card.append(createWisdomBoard(item.label, item.cards));
        if (fullHistoryRows("cbet").length || methodologyOnly()) {
          const plan = METHODOLOGY_BOARDS[item.structure];
          card.append(
            textElement("strong", "wisdom-method-action", plan.action),
            textElement("small", "wisdom-method-note", plan.note)
          );
          comparison.append(card);
          return;
        }
        const metrics = document.createElement("div");
        metrics.className = "wisdom-mini-metrics";
        const fold = metricSummary("fold", item.structure, newcomers);
        const xr = metricSummary("xr", item.structure, newcomers);
        const foldDisplay = metricDisplay("fold", fold);
        const xrDisplay = metricDisplay("xr", xr);
        appendWisdomMetric(metrics, "Пас BB", foldDisplay.value, foldDisplay.note, item.tone);
        appendWisdomMetric(metrics, "Чек-рейз BB", xrDisplay.value, xrDisplay.note, item.tone);
        card.append(metrics);
        comparison.append(card);
      });
      host.append(comparison);
      return;
    }

    const algorithm = document.createElement("ol");
    algorithm.className = "wisdom-algorithm";
    [
      ["Высокая", "ставь 25–33% банка"],
      ["Спаренная / монотонная", "ставь 25% банка"],
      ["Слабый коллер + вэлью", "добирай 50–67% банка"],
      ["Низкая связанная", "с чистым воздухом чаще чек"]
    ].forEach(([label, action]) => {
      const item = document.createElement("li");
      item.append(textElement("strong", "", label), textElement("span", "", action));
      algorithm.append(item);
    });
    const button = textElement("button", "primary-button", "Применить в тренировке");
    button.type = "button";
    button.addEventListener("click", () => setStep("practice", true));
    host.append(algorithm, button);
  }

  function renderWisdomSlide() {
    const slide = WISDOM_SLIDES[state.wisdomIndex];
    const host = query("[data-wisdom-slide]");
    host.className = `wisdom-slide is-${slide.kind}`;
    host.replaceChildren();

    const copy = document.createElement("div");
    copy.className = "wisdom-copy";
    const copyBlocks = [
      textElement("p", "eyebrow", slide.kicker),
      textElement("h3", "", slide.title),
      textElement("blockquote", "wisdom-quote", slide.wisdom),
      textElement("p", "wisdom-body", slide.body)
    ];
    if (slide.note) copyBlocks.push(textElement("p", "wisdom-note", slide.note));
    copy.append(...copyBlocks);
    const visual = document.createElement("div");
    visual.className = "wisdom-visual";
    renderWisdomVisual(visual, slide);
    host.append(copy, visual);

    query("[data-wisdom-progress]").textContent = `${state.wisdomIndex + 1} / ${WISDOM_SLIDES.length}`;
    const progressBar = query("[data-wisdom-progress-bar]");
    progressBar.style.width = `${((state.wisdomIndex + 1) / WISDOM_SLIDES.length) * 100}%`;
    progressBar.parentElement.setAttribute("aria-valuenow", String(state.wisdomIndex + 1));
    query("[data-wisdom-prev]").disabled = state.wisdomIndex === 0;
    query("[data-wisdom-next]").textContent = state.wisdomIndex === WISDOM_SLIDES.length - 1 ? "К тренировке" : "Дальше";
    queryAll("[data-wisdom-dot]").forEach((dot) => {
      const active = Number(dot.dataset.wisdomDot) === state.wisdomIndex;
      dot.classList.toggle("is-active", active);
      if (active) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    });
  }

  function initWisdom() {
    const dots = query("[data-wisdom-dots]");
    WISDOM_SLIDES.forEach((slide, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.wisdomDot = String(index);
      button.setAttribute("aria-label", `Слайд ${index + 1}: ${slide.title}`);
      button.addEventListener("click", () => {
        state.wisdomIndex = index;
        renderWisdomSlide();
      });
      dots.append(button);
    });
    query("[data-wisdom-prev]").addEventListener("click", () => {
      state.wisdomIndex = Math.max(0, state.wisdomIndex - 1);
      renderWisdomSlide();
    });
    query("[data-wisdom-next]").addEventListener("click", () => {
      if (state.wisdomIndex === WISDOM_SLIDES.length - 1) {
        setStep("practice", true);
        return;
      }
      state.wisdomIndex += 1;
      renderWisdomSlide();
    });
    renderWisdomSlide();
  }

  function comparisonCohorts(selected) {
    if (state.cohortMode === "league") {
      return LEAGUE_COHORTS.map((item) => ({
        label: item.label,
        cohort: item.cohort,
        primary: item.key === state.leagueBand
      }));
    }
    const disjointReferences = LEAGUE_COHORTS.filter((item) => (
      selected.type !== "rank"
      || selected.rank < item.cohort.from
      || selected.rank > item.cohort.to
    ));
    const referenceItems = [disjointReferences[0], disjointReferences.at(-1)]
      .filter((item, index, items) => item && items.indexOf(item) === index);
    return [
      { label: cohortLabel(selected), cohort: selected, primary: true },
      ...referenceItems.map((item) => ({ label: item.label, cohort: item.cohort, primary: false }))
    ];
  }

  function syncCohortControls() {
    queryAll("[data-cohort-mode]").forEach((item) => {
      const active = item.dataset.cohortMode === state.cohortMode;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    query("[data-rank-control]").hidden = state.cohortMode !== "rank";
    query("[data-league-control]").hidden = state.cohortMode !== "league";
    query("[data-league-select]").value = state.leagueBand;
    queryAll("[data-rank-step]").forEach((button) => {
      const nextRank = state.rank + Number(button.dataset.rankStep);
      button.disabled = state.cohortMode !== "rank" || nextRank < 1 || nextRank > 18;
    });
  }

  function selectRank(rank) {
    state.rank = Math.max(1, Math.min(18, Number(rank) || state.rank));
    state.cohortMode = "rank";
    query("[data-rank-select]").value = String(state.rank);
    syncCohortControls();
    renderField();
  }

  function setStep(step, focusTab) {
    const screen = query(`[data-step="${step}"]`);
    const tab = query(`[data-step-target="${step}"]`);
    if (!screen) return;
    state.step = step;
    document.documentElement.dataset.step = step;
    queryAll(".lesson-screen").forEach((item) => {
      const active = item === screen;
      item.hidden = !active;
      item.classList.toggle("is-active", active);
    });
    queryAll(".step-tab").forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    if (focusTab && tab) tab.focus();
    const reduceMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function initNavigation() {
    queryAll("[data-step-target]").forEach((tab, index, tabs) => {
      tab.addEventListener("click", () => setStep(tab.dataset.stepTarget, false));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;
        setStep(tabs[nextIndex].dataset.stepTarget, true);
      });
    });
    queryAll("[data-step-link]").forEach((button) => {
      button.addEventListener("click", () => setStep(button.dataset.stepLink, true));
    });
  }

  function replaceCoachFeedback(title, copy, kicker) {
    const host = query("[data-deal-feedback]");
    host.replaceChildren();
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = kicker;
    const heading = document.createElement("h3");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = copy;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-button";
    button.textContent = "Разобрать принцип";
    button.addEventListener("click", () => setStep("main", true));
    host.append(eyebrow, heading, paragraph, button);
  }

  function snapshotSeats(spot = {}) {
    const fishOpponent = spot.opponentClass === "is-loose";
    return SNAPSHOT_SEAT_ORDER.map((label) => ({
      label,
      state: label === "BTN" ? "hero" : label === "BB" ? "waiting" : "folded",
      stackBb: label === "BTN" || label === "BB" ? 38 : label === "SB" ? 39.5 : 40,
      ...(label === "BB" ? {
        botProfile: fishOpponent
          ? { difficulty: "easy", style: "fish", label: "Фиш" }
          : { difficulty: "standard", style: "reg", label: "Рег" }
      } : {})
    }));
  }

  function snapshotOptions(correctKey, spot) {
    const largeSizingAlternative = correctKey === "small"
      && trainerHasStrongMadeHand(spot && spot.board, spot && spot.hand);
    return SNAPSHOT_ACTIONS.map((option) => ({
      ...option,
      correct: option.key === correctKey,
      acceptableExploit: option.key === "large" && largeSizingAlternative
    }));
  }

  function snapshotSpot(spot, options = {}) {
    const correctKey = spot.accepted && spot.accepted[0] || "small";
    const opponent = spot.opponent || "чек · ридов нет";
    return {
      id: options.id || spot.key || trainerSpotKey(spot.board, spot.hand),
      title: spot.structure,
      hand: spot.hand.map(normalizeCardCode).join(" "),
      question: `BB чекнул (${opponent}). Что делаешь?`,
      answer: spot.explanation || "",
      context: "BTN открыл 2 BB, BB заколлировал и прочекал флоп.",
      table: {
        seats: snapshotSeats(spot),
        heroPosition: "BTN",
        heroStack: "38 BB",
        effectiveStack: "38 BB",
        pot: "4.5 BB",
        anteBb: 0,
        heroCards: spot.hand,
        boardCards: spot.board,
        street: "flop",
        actionLine: ["BB check"],
        historyLine: "UTG, HJ, CO и SB выбросили · BTN открыл 2 BB · BB заколлировал",
        toCall: 0,
        currentBet: 0,
        dealerPosition: "BTN"
      },
      options: snapshotOptions(correctKey, spot)
    };
  }

  function renderSnapshotDecision(host, spot, selectedKey, options = {}) {
    if (!host) return null;
    if (!window.FFTrainerSimulator || typeof window.FFTrainerSimulator.renderDecision !== "function") {
      console.error("[c-bet lesson] FFTrainerSimulator.renderDecision is unavailable");
      host.innerHTML = '<p class="table-load-error">Ситуация временно недоступна.</p>';
      return null;
    }
    try {
      const rendered = window.FFTrainerSimulator.renderDecision(host, spot, {
        answered: Boolean(selectedKey),
        selectedKey: selectedKey || "",
        finished: false
      }, {
        decimalComma: true,
        nextLabel: options.nextLabel || ""
      });
      const alternative = host.querySelector('[data-answer-state="alternative"]');
      if (alternative) {
        alternative.setAttribute("aria-label", "С-бет 50–67% — допустимый сайзинг с сильной рукой");
        const mark = alternative.querySelector(".table-action-result-mark");
        if (mark) mark.textContent = "Допустимо";
      }
      return rendered;
    } catch (error) {
      console.error("[c-bet lesson] Failed to render simulator decision", error);
      host.innerHTML = '<p class="table-load-error">Ситуация временно недоступна.</p>';
      return null;
    }
  }

  function introSnapshotSpot() {
    return snapshotSpot({
      key: "cbet-intro-a-high-dry",
      structure: "A-high · сухая",
      board: ["Ac", "7d", "2h"],
      hand: ["Qs", "Js"],
      opponent: "чек · ридов нет",
      accepted: ["small"],
      explanation: "На сухом A-high базовый широкий размер — 25–33% банка."
    });
  }

  function renderDeal() {
    renderSnapshotDecision(query("[data-deal-table]"), introSnapshotSpot(), state.dealChoice);
  }

  function answerDeal(action) {
    if (state.dealChoice || !SNAPSHOT_ACTIONS.some((option) => option.key === action)) return;
    state.dealChoice = action;
    renderDeal();
    if (action === "small") {
      replaceCoachFeedback(
        "Да — это простой c-bet",
        "На сухом A-high не нужно искать редкую причину для чека. 25–33% — понятный базовый план для широкого диапазона Hero.",
        "Базовая рекомендация"
      );
      return;
    }
    if (action === "check") {
      replaceCoachFeedback(
        "Ты переусложнил простой спот",
        "Q-high кажется слабой рукой, но весь диапазон Hero силён на A-high. Для новичка полезнее сначала освоить широкий мелкий c-bet, а тонкие чеки добавить позже.",
        "Слабая рука ≠ слабый диапазон"
      );
      return;
    }
    replaceCoachFeedback(
      "С воздухом достаточно меньшего",
      "50–67% оставь для понятной причины — например, сильного вэлью против соперника, который часто коллирует. На сухом A-high базовый широкий размер — 25–33%.",
      "Крупный сайз — не range size"
    );
  }

  function initDeal() {
    const host = query("[data-deal-table]");
    host.addEventListener("click", (event) => {
      const action = event.target.closest("[data-option-key]");
      if (action) answerDeal(action.dataset.optionKey);
    });
    renderDeal();
  }

  function initRankSelect() {
    const select = query("[data-rank-select]");
    for (let rank = 1; rank <= 18; rank += 1) {
      const option = document.createElement("option");
      option.value = String(rank);
      option.textContent = `Ранг ${rank}`;
      option.selected = rank === state.rank;
      select.append(option);
    }
    select.addEventListener("change", () => {
      selectRank(Number(select.value));
    });
    queryAll("[data-rank-step]").forEach((button) => {
      button.addEventListener("click", () => selectRank(state.rank + Number(button.dataset.rankStep)));
    });
    query("[data-league-select]").addEventListener("change", (event) => {
      state.leagueBand = event.currentTarget.value;
      renderField();
    });
    query("[data-xr-cbet-size-filter]").addEventListener("change", (event) => {
      state.xrCbetSize = event.currentTarget.value;
      renderDistribution("xr");
    });
    queryAll("[data-cohort-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.cohortMode = button.dataset.cohortMode;
        syncCohortControls();
        renderField();
      });
    });
    queryAll("[data-metric]").forEach((button) => {
      button.addEventListener("click", () => {
        state.metric = button.dataset.metric;
        queryAll("[data-metric]").forEach((item) => {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        renderField();
      });
    });
    queryAll("[data-table-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.tableMode = button.dataset.tableMode;
        queryAll("[data-table-mode]").forEach((item) => {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        renderTable();
      });
    });
    syncCohortControls();
  }

  function metricSet(structure, cohort) {
    return {
      cbet: metricSummary("cbet", structure, cohort),
      fold: metricSummary("fold", structure, cohort),
      cbet_size: sizeSummary("cbet", structure, cohort),
      xr: metricSummary("xr", structure, cohort)
    };
  }

  function appendMatrixKpi(host, metric, summary) {
    const labels = { cbet: "Ставка поля", fold: "Пас BB", cbet_size: "Размер", xr: "Чек-рейз" };
    const display = metricDisplay(metric, summary);
    const item = document.createElement("div");
    item.className = `matrix-kpi is-${metric}${summary ? "" : " is-empty"}`;
    item.dataset.reliability = display.reliability;
    const label = document.createElement("span");
    label.textContent = labels[metric];
    const value = document.createElement("strong");
    value.textContent = display.value;
    const base = document.createElement("small");
    base.textContent = display.note;
    item.append(label, value, base);
    host.append(item);
  }

  function appendCohortCell(row, summaries, label, primary) {
    const cell = document.createElement("td");
    cell.className = `cohort-metric-cell${primary ? " is-primary-cohort" : ""}`;
    cell.dataset.cohortLabel = label;
    const mobileLabel = document.createElement("span");
    mobileLabel.className = "cohort-mini-heading";
    mobileLabel.textContent = label;
    const grid = document.createElement("div");
    grid.className = "cohort-metrics";
    ["cbet", "fold", "cbet_size", "xr"].forEach((metric) => appendMatrixKpi(grid, metric, summaries[metric]));
    cell.append(mobileLabel, grid);
    row.append(cell);
  }

  function formatDeltaPercent(current, reference) {
    if (
      !current
      || !reference
      || !canRenderObservedFrequency(current.n)
      || !canRenderObservedFrequency(reference.n)
      || !Number.isFinite(current.value)
      || !Number.isFinite(reference.value)
    ) return "—";
    const delta = current.value - reference.value;
    const value = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(delta));
    return `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${value} п.п.`;
  }

  function appendDeltaCell(row, selected, reference, deltaLabel) {
    const cell = document.createElement("td");
    cell.className = "delta-cell";
    const mobileLabel = document.createElement("span");
    mobileLabel.className = "cohort-mini-heading";
    mobileLabel.textContent = deltaLabel;
    const grid = document.createElement("div");
    grid.className = "delta-grid";
    [["Ставка", "cbet"], ["Пас BB", "fold"], ["Чек-рейз", "xr"]].forEach(([label, metric]) => {
      const item = document.createElement("div");
      const name = document.createElement("span");
      name.textContent = label;
      const value = document.createElement("strong");
      value.textContent = formatDeltaPercent(selected[metric], reference[metric]);
      item.append(name, value);
      grid.append(item);
    });
    cell.append(mobileLabel, grid);
    row.append(cell);
  }

  function appendTableHead(labels) {
    const head = query("[data-field-table-head]");
    const row = document.createElement("tr");
    labels.forEach((label) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = label;
      row.append(cell);
    });
    head.replaceChildren(row);
  }

  function appendStructureCell(row, structure, cbetSummary, evidenceContext) {
    const labelCell = document.createElement("td");
    const label = document.createElement("div");
    label.className = "structure-cell";
    const strong = document.createElement("strong");
    strong.textContent = structure.label;
    const small = document.createElement("small");
    small.textContent = structure.note;
    const evidence = document.createElement("span");
    evidence.className = `structure-evidence has-${reliabilityFor(cbetSummary ? cbetSummary.n : null)}`;
    const reliability = reliabilityLabel(reliabilityFor(cbetSummary ? cbetSummary.n : null));
    evidence.textContent = evidenceContext ? `${evidenceContext} · ${reliability}` : reliability;
    label.append(strong, small, evidence);
    labelCell.append(label);
    row.append(labelCell);
  }

  function appendFocusedCohortCell(row, summary, label, primary) {
    const cell = document.createElement("td");
    cell.className = `focus-metric-cell${primary ? " is-primary-cohort" : ""}`;
    const mobileLabel = document.createElement("span");
    mobileLabel.className = "cohort-mini-heading";
    mobileLabel.textContent = label;
    const metric = document.createElement("div");
    metric.className = "focus-metric";
    const display = metricDisplay(state.metric, summary);
    metric.dataset.reliability = display.reliability;
    const value = document.createElement("strong");
    value.textContent = display.value;
    const base = document.createElement("small");
    base.textContent = display.note;
    metric.append(value, base);
    cell.append(mobileLabel, metric);
    row.append(cell);
  }

  function appendFocusedDeltaCell(row, selected, reference, deltaLabel) {
    const cell = document.createElement("td");
    cell.className = "focus-delta-cell";
    const mobileLabel = document.createElement("span");
    mobileLabel.className = "cohort-mini-heading";
    mobileLabel.textContent = deltaLabel;
    const value = document.createElement("strong");
    if (state.metric === "cbet_size") {
      value.textContent = !selected
        || !reference
        || !canRenderObservedFrequency(selected.n)
        || !canRenderObservedFrequency(reference.n)
        ? "—"
        : (selected.mode === reference.mode ? "тот же сайз" : `${selected.mode} vs ${reference.mode}`);
    } else {
      value.textContent = formatDeltaPercent(selected, reference);
    }
    const note = document.createElement("small");
    note.textContent = state.metric === "cbet_size" ? "самый частый размер" : "разница в п.п.";
    cell.append(mobileLabel, value, note);
    row.append(cell);
  }

  function renderTable() {
    const body = query("[data-field-table-body]");
    const table = query("[data-field-table]");
    body.replaceChildren();
    const selected = selectedCohort();
    const leagueMode = state.cohortMode === "league";
    const cohorts = comparisonCohorts(selected);
    const deltaLabel = leagueMode ? "Δ Л3 к Л1" : "Δ к R1–5";
    const focusMode = state.tableMode === "focus";
    table.classList.toggle("is-focus-mode", focusMode);
    query("[data-table-kicker]").textContent = leagueMode
      ? "Лига 1 vs Лига 2 vs Лига 3 vs новички · по структурам"
      : (focusMode ? "Структуры флопа · быстрый скан" : "Структуры флопа · полный профиль");
    query("[data-table-title]").textContent = focusMode
      ? `${METRICS[state.metric].label} · ${leagueMode ? "сравнение лиг" : cohortLabel(selected)}`
      : `Все метрики · ${leagueMode ? "сравнение лиг" : cohortLabel(selected)}`;
    const leagueInsight = query("[data-league-insight]");
    const showLeagueInsight = leagueMode && state.metric === "cbet";
    leagueInsight.hidden = !showLeagueInsight;
    if (showLeagueInsight) {
      const overall = LEAGUE_COHORTS.map((item) => overallCbetSummary(item.cohort));
      leagueInsight.textContent = overall.every(Boolean)
        ? `Общая частота ставки: Л1 ${formatPercent(overall[0].value)}, Л2 ${formatPercent(overall[1].value)}, Л3 ${formatPercent(overall[2].value)}, R15–18 ${formatPercent(overall[3].value)}. Главное отличие — в выборе флопов.`
        : "Общая частота близка — главное отличие видно в выборе структур.";
    }
    appendTableHead([
      "Структура",
      ...cohorts.map((item) => item.label),
      deltaLabel
    ]);

    BOARD_STRUCTURES.forEach((structure) => {
      const cohortMetrics = cohorts.map((item) => metricSet(structure.key, item.cohort));
      const evidenceIndex = Math.max(0, cohorts.findIndex((item) => item.primary));
      const deltaCurrent = cohortMetrics[leagueMode ? 2 : 0];
      const deltaReference = cohortMetrics[leagueMode ? 0 : 1];
      const row = document.createElement("tr");
      row.tabIndex = 0;
      row.dataset.structure = structure.key;
      row.classList.toggle("is-selected", state.structure === structure.key);
      row.setAttribute("aria-selected", String(state.structure === structure.key));

      appendStructureCell(
        row,
        structure,
        cohortMetrics[evidenceIndex].cbet,
        leagueMode ? cohorts[evidenceIndex].label.split(" · ")[0] : ""
      );
      if (focusMode) {
        cohorts.forEach((item, index) => {
          appendFocusedCohortCell(row, cohortMetrics[index][state.metric], item.label, item.primary);
        });
        appendFocusedDeltaCell(row, deltaCurrent[state.metric], deltaReference[state.metric], deltaLabel);
      } else {
        cohorts.forEach((item, index) => {
          appendCohortCell(row, cohortMetrics[index], item.label, item.primary);
        });
        appendDeltaCell(row, deltaCurrent, deltaReference, deltaLabel);
      }

      const selectRow = () => {
        state.structure = structure.key;
        renderField();
      };
      row.addEventListener("click", selectRow);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRow();
        }
      });
      body.append(row);
    });
  }

  function renderStructureDetail() {
    const board = BOARD_STRUCTURES.find((item) => item.key === state.structure);
    const selected = selectedCohort();
    const cohorts = comparisonCohorts(selected);
    const host = query("[data-structure-detail]");
    query("[data-structure-detail-title]").textContent = board.label;
    query("[data-structure-detail-note]").textContent = board.note;
    const selectedLeague = LEAGUE_COHORTS.find((item) => item.key === state.leagueBand);
    query("[data-detail-cohort]").textContent = state.cohortMode === "league" && selectedLeague
      ? selectedLeague.label
      : cohortLabel(selected);
    host.replaceChildren();
    cohorts.forEach((item) => {
      const summaries = metricSet(board.key, item.cohort);
      const card = document.createElement("article");
      card.className = `structure-profile${item.primary ? " is-primary" : ""}`;
      const heading = document.createElement("div");
      heading.className = "structure-profile-heading";
      const title = document.createElement("strong");
      title.textContent = item.label;
      const reliability = document.createElement("span");
      reliability.textContent = reliabilityLabel(reliabilityFor(summaries.cbet ? summaries.cbet.n : null));
      heading.append(title, reliability);
      const grid = document.createElement("div");
      grid.className = "cohort-metrics";
      ["cbet", "fold", "cbet_size", "xr"].forEach((metric) => appendMatrixKpi(grid, metric, summaries[metric]));
      card.append(heading, grid);
      host.append(card);
    });
  }

  function renderRankStrip() {
    const host = query("[data-rank-strip]");
    host.replaceChildren();
    const board = BOARD_STRUCTURES.find((item) => item.key === state.structure);
    query("[data-selected-board]").textContent = board.label;
    query("[data-rank-map-title]").textContent = `${METRICS[state.metric].short} по рангам 1–18`;
    for (let rank = 1; rank <= 18; rank += 1) {
      const summary = currentMetricSummary(state.structure, { type: "rank", rank });
      const display = metricDisplay(state.metric, summary);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "rank-cell";
      cell.classList.toggle("is-active", state.cohortMode === "rank" && state.rank === rank);
      cell.dataset.reliability = display.reliability;
      cell.setAttribute("aria-pressed", String(state.cohortMode === "rank" && state.rank === rank));
      cell.setAttribute("aria-label", `Ранг ${rank}: ${display.value}. ${display.note}`);
      const label = document.createElement("span");
      label.textContent = `R${rank}`;
      const value = document.createElement("strong");
      value.textContent = display.value;
      cell.title = display.note;
      cell.append(label, value);
      cell.addEventListener("click", () => selectRank(rank));
      host.append(cell);
    }
  }

  function renderOverallCbet() {
    const card = query("[data-overall-cbet-card]");
    const host = query("[data-overall-cbet-strip]");
    if (!model.overallCbet.length) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    host.replaceChildren();
    for (let rank = 1; rank <= 18; rank += 1) {
      const summary = overallCbetSummary({ type: "rank", rank });
      const display = metricDisplay("cbet", summary);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "rank-cell";
      cell.classList.toggle("is-active", state.cohortMode === "rank" && state.rank === rank);
      cell.dataset.reliability = display.reliability;
      cell.setAttribute("aria-pressed", String(state.cohortMode === "rank" && state.rank === rank));
      cell.setAttribute("aria-label", `Выбрать ранг ${rank}: ставка поля ${display.value}. ${display.note}`);
      const label = document.createElement("span");
      label.textContent = `R${rank}`;
      const value = document.createElement("strong");
      value.textContent = display.value;
      cell.title = display.note;
      cell.append(label, value);
      cell.addEventListener("click", () => selectRank(rank));
      host.append(cell);
    }
  }

  function renderDistribution(kind) {
    const summary = sizeSummary(kind, state.structure, selectedCohort());
    const chart = query(kind === "cbet" ? "[data-cbet-size-chart]" : "[data-xr-size-chart]");
    const base = query(kind === "cbet" ? "[data-cbet-size-base]" : "[data-xr-size-base]");
    chart.replaceChildren();
    if (!summary || !canRenderObservedFrequency(summary.n)) {
      const empty = document.createElement("div");
      empty.className = "empty-chart";
      empty.textContent = kind === "cbet" ? "Нет устойчивого среза размеров ставки" : "Нет устойчивого среза размеров чек-рейза";
      chart.append(empty);
      base.textContent = "";
      return;
    }
    base.textContent = reliabilityLabel(reliabilityFor(summary.n));
    summary.entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "bar-row";
      const label = document.createElement("span");
      label.textContent = entry.label;
      const track = document.createElement("div");
      track.className = "bar-track";
      const fill = document.createElement("i");
      fill.style.setProperty("--bar-width", `${Math.max(0, Math.min(100, entry.value))}%`);
      track.append(fill);
      const value = document.createElement("strong");
      value.textContent = formatPercent(entry.value);
      row.append(label, track, value);
      chart.append(row);
    });
  }

  function appendOutcomeCell(row, text, note) {
    const cell = document.createElement("td");
    const wrapper = document.createElement("div");
    wrapper.className = "metric-cell";
    const value = document.createElement("strong");
    value.textContent = text;
    wrapper.append(value);
    if (note) {
      const small = document.createElement("small");
      small.textContent = note;
      wrapper.append(small);
    }
    cell.append(wrapper);
    row.append(cell);
  }

  function renderSizeOutcomes() {
    const body = query("[data-size-outcomes-body]");
    body.replaceChildren();
    const summary = sizeSummary("cbet", state.structure, selectedCohort());
    if (!summary) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "empty-table-cell";
      cell.textContent = "Нет валидных сайзов для выбранного ранга и структуры.";
      row.append(cell);
      body.append(row);
      return;
    }

    summary.entries.forEach((entry) => {
      const row = document.createElement("tr");
      const actual = Number.isFinite(entry.meanBetPctPot) && canRenderObservedFrequency(entry.count)
        ? `среднее ${formatPercent(entry.meanBetPctPot)}`
        : "";
      const share = observedRateDisplay(entry.value, entry.count);
      const observedFe = observedRateDisplay(entry.observedFe, entry.validResponses);
      const xrRate = observedRateDisplay(entry.xrRate, entry.xrValidResponses);
      appendOutcomeCell(row, entry.label, actual);
      appendOutcomeCell(row, share.value, share.note);
      appendOutcomeCell(row, observedFe.value, observedFe.note);
      appendOutcomeCell(row, formatPercent(entry.breakevenFe), "чистый блеф без усилений");
      appendOutcomeCell(row, xrRate.value, xrRate.note);
      body.append(row);
    });
  }

  function fullHistoryCohortMeta() {
    return [
      { key: "league1", label: "Первая лига", ranks: "R1–5", tone: "expert" },
      { key: "league2", label: "Вторая лига", ranks: "R6–10", tone: "middle" },
      { key: "league3", label: "Третья лига", ranks: "R11–14", tone: "middle" },
      { key: "novice", label: "Новички", ranks: "R15–18", tone: "new" }
    ];
  }

  function fullHistoryRate(row) {
    const opportunities = Number(row && row.opportunities || 0);
    const cbets = Number(row && row.cbets || 0);
    return opportunities >= 50 && cbets >= 0 && cbets <= opportunities
      ? (cbets / opportunities) * 100
      : null;
  }

  function fullHistoryDelta(value, reference) {
    if (!Number.isFinite(value) || !Number.isFinite(reference)) return "";
    const delta = value - reference;
    if (Math.abs(delta) < 0.05) return "как Л1";
    return `${delta > 0 ? "+" : "−"}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(Math.abs(delta))} п.п. к Л1`;
  }

  function renderFullHistoryField() {
    const field = query("#fieldScreen");
    const rows = fullHistoryRows("cbet");
    if (!field || !rows.length) return;

    query(".field-controls", field).hidden = true;
    query("[data-overall-cbet-card]", field).hidden = true;
    query("#selectedStructure", field).hidden = true;
    query("#rankComparison", field).hidden = true;
    query("#sizeDetails", field).hidden = true;
    query(".size-outcomes-card", field).hidden = true;
    query("#fieldTitle").textContent = "Как частота c-bet меняется по позиции и стеку";
    const headingCopy = query(".field-heading > p", field);
    if (headingCopy) headingCopy.textContent = "Один и тот же точный спот, четыре непересекающиеся группы. Сравнивай действие, а не цветную легенду.";

    const host = query("#structureMatrix", field);
    host.className = "panel full-history-field-card";
    host.removeAttribute("aria-labelledby");
    host.replaceChildren();

    const top = document.createElement("div");
    top.className = "full-history-field-heading";
    const copy = document.createElement("div");
    copy.append(
      textElement("p", "eyebrow", "RFI → единственный колл BB → HU-флоп"),
      textElement("h3", "", "Ставит или берёт бесплатную карту"),
      textElement("p", "", "Выбери позицию. В каждой строке один стек; в каждом столбце одна группа игроков. Полоса показывает долю ставок, остаток — чеки.")
    );
    const badge = textElement("span", "source-badge", "Проверенный полевой срез");
    top.append(copy, badge);

    const positions = ["BTN", "CO", "HJ", "MP", "EP"];
    if (!positions.includes(state.fullHistoryPosition)) state.fullHistoryPosition = "BTN";
    const positionControls = document.createElement("div");
    positionControls.className = "full-history-position-tabs";
    positionControls.setAttribute("role", "group");
    positionControls.setAttribute("aria-label", "Позиция префлоп-рейзера");
    positions.forEach((position) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = position;
      button.classList.toggle("is-active", position === state.fullHistoryPosition);
      button.setAttribute("aria-pressed", String(position === state.fullHistoryPosition));
      button.addEventListener("click", () => {
        state.fullHistoryPosition = position;
        renderFullHistoryField();
      });
      positionControls.append(button);
    });

    const cohorts = fullHistoryCohortMeta();
    const summary = document.createElement("div");
    summary.className = "full-history-summary";
    cohorts.forEach((cohort) => {
      const aggregate = fullHistoryAggregate(cohort.key, { position: state.fullHistoryPosition });
      const card = document.createElement("article");
      card.className = `full-history-summary-card is-${cohort.tone}`;
      const value = aggregate.publishable ? formatPercent(aggregate.value) : "—";
      card.append(
        textElement("span", "", cohort.label),
        textElement("strong", "", value),
        textElement("small", "", cohort.ranks)
      );
      summary.append(card);
    });

    const tableWrap = document.createElement("div");
    tableWrap.className = "full-history-table-wrap";
    tableWrap.tabIndex = 0;
    const table = document.createElement("table");
    table.className = "full-history-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Стек", ...cohorts.map((cohort) => `${cohort.label} · ${cohort.ranks}`)].forEach((label) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = label;
      headRow.append(cell);
    });
    thead.append(headRow);
    const tbody = document.createElement("tbody");
    const depthOrder = ["<20", "20-30", "30-40", "40-70", "70+"];
    let biggest = null;
    depthOrder.forEach((depthBand) => {
      const row = document.createElement("tr");
      const depth = document.createElement("th");
      depth.scope = "row";
      depth.innerHTML = `<strong>${depthBand.replace("-", "–")} BB</strong><small>эффективный стек</small>`;
      row.append(depth);
      const leagueOneRow = rows.find((item) => item.position === state.fullHistoryPosition && item.depthBand === depthBand && item.cohort === "league1");
      const reference = fullHistoryRate(leagueOneRow);
      cohorts.forEach((cohort) => {
        const source = rows.find((item) => item.position === state.fullHistoryPosition && item.depthBand === depthBand && item.cohort === cohort.key);
        const value = fullHistoryRate(source);
        const cell = document.createElement("td");
        cell.dataset.cohort = cohort.key;
        const mobile = textElement("span", "full-history-mobile-label", `${cohort.label} · ${cohort.ranks}`);
        const valueRow = document.createElement("div");
        valueRow.className = "full-history-value-row";
        valueRow.append(
          textElement("strong", "", Number.isFinite(value) ? formatPercent(value) : "—"),
          textElement("small", "", cohort.key === "league1" ? "ориентир" : fullHistoryDelta(value, reference))
        );
        const track = document.createElement("div");
        track.className = "full-history-action-track";
        const bet = document.createElement("i");
        bet.style.width = `${Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0}%`;
        track.append(bet);
        const split = textElement("span", "full-history-action-split", Number.isFinite(value) ? `Ставка ${formatPercent(value)} · чек ${formatPercent(100 - value)}` : "Срез скрыт: меньше 50 решений");
        cell.append(mobile, valueRow, track, split);
        row.append(cell);
        if (cohort.key === "novice" && Number.isFinite(value) && Number.isFinite(reference)) {
          const delta = value - reference;
          if (!biggest || Math.abs(delta) > Math.abs(biggest.delta)) biggest = { depthBand, delta, value, reference };
        }
      });
      tbody.append(row);
    });
    table.append(thead, tbody);
    tableWrap.append(table);

    const insight = document.createElement("aside");
    insight.className = "full-history-insight";
    if (biggest) {
      const direction = biggest.delta < 0 ? "реже ставят" : "чаще ставят";
      insight.append(
        textElement("span", "eyebrow", "Самая заметная разница в выбранной позиции"),
        textElement("strong", "", `${biggest.depthBand.replace("-", "–")} BB · новички ${direction} на ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(Math.abs(biggest.delta))} п.п.`),
        textElement("p", "", `Первая лига ${formatPercent(biggest.reference)}, новички ${formatPercent(biggest.value)}. Это наблюдение поля для точного спота, не готовая стратегия.`)
      );
    }

    const boundary = textElement("p", "full-history-boundary", "В этом агрегированном срезе сравниваются позиция, эффективный стек и факт ставки. Доски и сайзинги здесь не подменяются усреднением и не дорисовываются.");
    host.append(top, positionControls, summary, tableWrap, insight, boundary);
  }

  function renderDataMeta() {
    const status = query("[data-data-status]");
    const stamp = query("[data-data-stamp]");
    const source = query("[data-source-note]");
    if (!model.ready) return;

    const sourceMeta = model.fullHistory && model.fullHistory.rows.length ? model.fullHistory.meta : model.meta;
    const period = firstText(sourceMeta, ["period", "dateRange", "date_range"]);
    const start = firstText(sourceMeta, ["windowStart", "window_start", "start"]);
    const end = firstText(sourceMeta, ["windowEnd", "window_end", "end"]);
    const asOf = firstText(sourceMeta, ["asOf", "as_of", "generatedAt", "generated_at"]);
    const periodText = period || ([start, end].filter(Boolean).join(" — ")) || "период указан в источнике";
    stamp.querySelector("span").textContent = asOf ? `Срез на ${asOf}` : "Период данных";
    stamp.querySelector("strong").textContent = periodText;
    status.classList.add("is-ready");
    status.querySelector("strong").textContent = "Как реально играет поле";
    status.querySelector("span").textContent = model.fullHistory && model.fullHistory.rows.length
      ? "RFI, единственный колл BB, HU-флоп и возможность поставить в позиции. Это наблюдение за игрой поля, а не совет."
      : "BTN открылся, BB заколлировал и прочекал. Это наблюдение за игрой поля, а не совет.";
    query("[data-sample-size]").textContent = "Реальные раздачи FF";
    const sample = model.meta.sample && typeof model.meta.sample === "object"
      ? model.meta.sample
      : {};
    const candidateRows = firstNumber(sample, ["candidateRows", "candidate_rows"]);
    const matchedRows = firstNumber(sample, ["matchedCompactHands", "matched_compact_hands"]);
    const coverage = candidateRows > 0 && matchedRows >= 0 && matchedRows <= candidateRows
      ? matchedRows / candidateRows
      : null;
    const coverageCopy = Number.isFinite(coverage)
      ? ` История действий найдена для ${new Intl.NumberFormat("ru-RU").format(matchedRows)} из ${new Intl.NumberFormat("ru-RU").format(candidateRows)} подходящих раздач (${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(coverage * 100)}%). Остальные раздачи исключены — значения за них не подставлялись.`
      : "";
    source.textContent = model.fullHistory && model.fullHistory.rows.length
      ? `Агрегированный срез поля за ${periodText}. Ранг определяется на момент каждой раздачи; значения публикуются только при N ≥ 50.`
      : `Реальные раздачи поля за ${periodText}.${coverageCopy}`;
  }

  function renderSourceBadges() {
    queryAll("[data-overall-cbet-source], [data-metric-source], [data-cbet-size-source], [data-xr-size-source], [data-size-outcomes-source]")
      .forEach((badge) => { badge.textContent = "Реальные раздачи FF"; });
  }

  function renderPendingField() {
    const field = query("#fieldScreen");
    if (!field) return;
    [
      query(".field-controls", field),
      query("[data-overall-cbet-card]", field),
      query("#selectedStructure", field),
      query("#rankComparison", field),
      query("#sizeDetails", field),
      query(".size-outcomes-card", field),
      query(".method-card", field)
    ].filter(Boolean).forEach((node) => { node.hidden = true; });

    query("#fieldTitle").textContent = "Полевые частоты пока скрыты";
    const headingCopy = query(".field-heading > p", field);
    if (headingCopy) headingCopy.textContent = "Пока здесь нет ни старой выборки, ни дорисованных процентов.";
    const stamp = query("[data-data-stamp]", field);
    stamp.querySelector("span").textContent = "Статус";
    stamp.querySelector("strong").textContent = model.meta.period || "Источник не опубликован";
    const status = query("[data-data-status]", field);
    status.classList.remove("is-ready");
    status.querySelector("strong").textContent = "Проверяем источник";
    status.querySelector("span").textContent = "Наличие подходящих раздач ещё не доказывает полноту истории. Частоты скрыты до полной сверки.";
    query("[data-sample-size]", field).textContent = "Частоты скрыты";

    const host = query("#structureMatrix", field);
    host.className = "panel full-history-field-card is-pending";
    host.removeAttribute("aria-labelledby");
    host.replaceChildren();
    const pending = document.createElement("article");
    pending.className = "full-history-pending";
    pending.append(
      textElement("p", "eyebrow", "Полная история FF"),
      textElement("h3", "", "Не выдаём непроверенный срез за актуальные данные"),
      textElement("p", "", "Финальная матрица появится только после полной проверки раздач и групп игроков."),
      textElement("strong", "", "До этого здесь намеренно нет процентов, сравнений и выводов о поле.")
    );
    host.append(pending);
  }

  function renderField() {
    if (fullHistoryRows("cbet").length) {
      renderFullHistoryField();
      return;
    }
    if (methodologyOnly()) {
      renderPendingField();
      return;
    }
    renderOverallCbet();
    renderTable();
    renderStructureDetail();
    renderRankStrip();
    renderDistribution("cbet");
    renderDistribution("xr");
    renderSizeOutcomes();
    renderSourceBadges();
  }

  function normalizeCardCode(value) {
    const match = String(value || "").trim().match(/^([2-9TJQKA])([shdc])$/i);
    return match ? `${match[1].toUpperCase()}${match[2].toLowerCase()}` : "";
  }

  function cardText(value) {
    const code = normalizeCardCode(value);
    if (!code) return "";
    return `${code[0]}${CARD_SUITS[code[1]].symbol}`;
  }

  function cardName(value) {
    const code = normalizeCardCode(value);
    if (!code) return "неизвестная карта";
    return `${CARD_RANK_NAMES[code[0]] || code[0]} ${CARD_SUITS[code[1]].name}`;
  }

  function createColorBlockCard(value, variant) {
    const code = normalizeCardCode(value);
    const deckKit = window.PokerDeckKit;
    if (!code || !deckKit || typeof deckKit.renderCard !== "function") return null;
    const template = document.createElement("template");
    template.innerHTML = deckKit.renderCard(code, {
      theme: "color-block",
      mini: variant === "mini",
      board: variant === "board",
      hero: variant === "hero",
      className: "cbet-color-block-card",
      attributes: 'aria-hidden="true"'
    }).trim();
    return template.content.firstElementChild;
  }

  function fillColorBlockCards(host, cards, ariaLabel, variant) {
    const normalized = (Array.isArray(cards) ? cards : [])
      .map(normalizeCardCode)
      .filter(Boolean);
    host.replaceChildren();
    host.setAttribute("role", "img");
    if (ariaLabel) host.setAttribute("aria-label", ariaLabel);
    normalized.forEach((code) => {
      const card = createColorBlockCard(code, variant);
      if (card) host.append(card);
    });
    return normalized.length;
  }

  function hydrateStaticColorBlockCards() {
    queryAll("[data-card-codes]").forEach((host) => {
      fillColorBlockCards(
        host,
        String(host.dataset.cardCodes || "").split(","),
        host.getAttribute("aria-label"),
        host.dataset.cardVariant || "mini"
      );
    });
  }

  function createMiniBoard(cards, label) {
    const normalized = (Array.isArray(cards) ? cards : []).map(normalizeCardCode).filter(Boolean).slice(0, 3);
    const board = document.createElement("div");
    board.className = "example-mini-board";
    fillColorBlockCards(board, normalized, `${label}: ${normalized.map(cardName).join(", ")}`, "mini");
    if (!normalized.length) {
      const fallback = document.createElement("span");
      fallback.textContent = "доска не указана";
      board.append(fallback);
    }
    return board;
  }

  function createCheckedHand(hand, cohortLabelText) {
    const cards = (Array.isArray(hand && hand.cards) ? hand.cards : [])
      .map(normalizeCardCode)
      .filter(Boolean)
      .slice(0, 2);
    const item = document.createElement("li");
    item.className = "checked-hand-chip";
    const visual = document.createElement("div");
    visual.className = "checked-hand-cards";
    const handClass = firstText(hand || {}, ["handClass", "hand_class", "label"])
      || cards.map(cardText).join("");
    fillColorBlockCards(
      visual,
      cards,
      `${cohortLabelText}, чек с ${handClass}: ${cards.map(cardName).join(", ")}`,
      "mini"
    );
    item.append(visual);
    return item;
  }

  function createCheckedHandExamples(observation, cohortLabelText, scenarioKey, showHeading = true) {
    const tray = document.createElement("div");
    tray.className = "checked-hand-examples";
    const list = document.createElement("ul");
    list.className = "checked-hand-list";
    observation.checkedHands.forEach((hand) => {
      list.append(createCheckedHand(hand, cohortLabelText));
    });
    if (showHeading) {
      const heading = document.createElement("div");
      heading.className = "checked-hand-heading";
      const label = document.createElement("strong");
      label.textContent = scenarioKey === "league1_more"
        ? "Новички чекают — Лига 1 ставит"
        : (scenarioKey === "newcomers_more"
          ? "Лига 1 чекает — новички ставят"
          : "Примеры рук для чека");
      heading.append(label);
      tray.append(heading);
    }
    tray.append(list);
    return tray;
  }

  function checkedHandEvidenceDenominator(hand) {
    const bets = firstNumber(hand || {}, ["comparisonActionOccurrences", "comparison_action_occurrences"]);
    const checks = firstNumber(hand || {}, ["comparisonCheckOccurrences", "comparison_check_occurrences"]);
    return Number.isFinite(bets) && Number.isFinite(checks) ? bets + checks : 0;
  }

  function checkedHandHasStableEvidence(hand) {
    return canRenderObservedFrequency(checkedHandEvidenceDenominator(hand));
  }

  function observationFor(example, cohortKey, scenarioKey) {
    const observations = example && example.observations;
    let observation = observations && !Array.isArray(observations) ? observations[cohortKey] : null;
    if (!observation && Array.isArray(observations)) {
      observation = observations.find((item) => item && [item.cohort, item.group, item.key].includes(cohortKey));
    }
    const fallbackActions = {
      league1_more: { league1: "bet", newcomers: "check" },
      both_low: { league1: "check", newcomers: "check" },
      newcomers_more: { league1: "check", newcomers: "bet" }
    };
    return {
      action: firstText(observation || {}, ["action", "decision"]) || fallbackActions[scenarioKey][cohortKey],
      cards: Array.isArray(observation && observation.cards)
        ? observation.cards
        : (Array.isArray(example.canonicalCards) ? example.canonicalCards : []),
      checkedHands: Array.isArray(observation && observation.checkedHands)
        ? observation.checkedHands.filter(checkedHandHasStableEvidence).slice(0, 2)
        : []
    };
  }

  function createObservedAction(observation, cohortKey, scenarioKey, showCheckedHands = true) {
    const cohortLabelText = cohortKey === "league1" ? "Лига 1" : "Новички";
    const action = normalizedToken(observation.action) === "bet" ? "bet" : "check";
    const row = document.createElement("div");
    row.className = `board-action-row is-${cohortKey}`;
    const cohort = document.createElement("span");
    cohort.textContent = cohortLabelText;
    const actionLabel = document.createElement("strong");
    actionLabel.className = `observed-action is-${action}`;
    actionLabel.textContent = action === "bet" ? "ставка" : "чек";
    row.append(cohort, actionLabel);
    if (showCheckedHands && action === "check" && observation.checkedHands.length) {
      row.append(createCheckedHandExamples(observation, cohortLabelText, scenarioKey));
    }
    return row;
  }

  function createCompactBoardExample(example, scenario, cohortLabelText) {
    const tile = document.createElement("li");
    tile.className = "missed-cbet-example";
    const league1Observation = observationFor(example, "league1", scenario.key);
    const newcomersObservation = observationFor(example, "newcomers", scenario.key);
    const canonicalCards = Array.isArray(example.canonicalCards) ? example.canonicalCards : [];
    const boardCards = canonicalCards.length
      ? canonicalCards
      : (league1Observation.cards.length ? league1Observation.cards : newcomersObservation.cards);
    const boardStage = document.createElement("div");
    boardStage.className = "scenario-board-stage";
    boardStage.append(createMiniBoard(boardCards, "Флоп"));
    const missedLabel = document.createElement("span");
    missedLabel.className = "missed-cbet-copy";
    missedLabel.textContent = "не поставили c-bet с";
    tile.append(boardStage, missedLabel);
    if (newcomersObservation.checkedHands.length) {
      tile.append(createCheckedHandExamples(newcomersObservation, cohortLabelText, scenario.key, false));
    }
    return tile;
  }

  function createBoardScenarioGroup(examples, scenario) {
    const card = document.createElement("article");
    card.className = `board-scenario-card is-${scenario.key} is-grouped`;
    if (!examples.length) {
      card.classList.add("is-empty");
      const heading = document.createElement("h4");
      heading.textContent = scenario.label;
      const empty = document.createElement("p");
      empty.textContent = "Здесь пока нет учебного примера.";
      card.append(heading, empty);
      return card;
    }

    const cohortLabelText = "Новички";
    const evidence = document.createElement("div");
    evidence.className = "missed-cbet-evidence";
    const evidenceTitle = document.createElement("strong");
      evidenceTitle.textContent = "Где новички не поставили";
      const evidenceMeta = document.createElement("span");
      evidenceMeta.textContent = `Новички не поставили · Лига 1 ставит чаще`;
    evidence.append(evidenceTitle, evidenceMeta);

    const boardGrid = document.createElement("ul");
    boardGrid.className = "missed-cbet-grid";
    examples.forEach((example) => {
      boardGrid.append(createCompactBoardExample(example, scenario, cohortLabelText));
    });

    card.append(evidence, boardGrid);
    return card;
  }

  function renderBoardExamples() {
    const host = query("[data-board-example-library]");
    if (!host) return;
    host.replaceChildren();
    const payload = model.boardExamples;
    const categories = payload && Array.isArray(payload.categories) ? payload.categories : [];
    if (!categories.length) {
      const screen = query("#examplesScreen");
      const eyebrow = query(".examples-heading .eyebrow", screen);
      const heading = query("#examplesTitle", screen);
      const intro = query(".examples-heading > p", screen);
      if (eyebrow) eyebrow.textContent = "Библиотека ситуаций";
      if (heading) heading.textContent = "Восемь типов флопа — восемь простых планов";
      if (intro) intro.textContent = "Здесь нет выдуманных полевых процентов для отдельных досок: только структура, базовое действие и причина.";
      const grid = document.createElement("div");
      grid.className = "methodology-board-grid";
      BOARD_STRUCTURES.forEach((structure) => {
        const plan = METHODOLOGY_BOARDS[structure.key];
        const card = document.createElement("article");
        card.className = "panel methodology-board-card";
        card.append(
          textElement("p", "eyebrow", structure.label),
          createLessonCardRow(plan.cards, `Пример: ${structure.label}`),
          textElement("strong", "methodology-board-action", plan.action),
          textElement("p", "", plan.note)
        );
        grid.append(card);
      });
      host.append(grid);
      return;
    }

    const byStructure = new Map(categories.map((category) => [category.structure, category]));
    BOARD_STRUCTURES.forEach((structure, index) => {
      const category = byStructure.get(structure.key);
      const details = document.createElement("details");
      details.className = "board-structure-group panel";
      details.open = index === 0;
      const summary = document.createElement("summary");
      const title = document.createElement("span");
      const heading = document.createElement("h3");
      heading.textContent = structure.label;
      const note = document.createElement("small");
      note.textContent = structure.note;
      title.append(heading, note);
      const focusScenario = BOARD_EXAMPLE_SCENARIOS[0];
      const focusExamples = [
        category && category.scenarios && category.scenarios[focusScenario.key],
        ...(category && Array.isArray(category.league1MoreExamples)
          ? category.league1MoreExamples
          : [])
      ].filter((example) => example && typeof example === "object");
      const count = document.createElement("b");
      count.textContent = `Досок: ${focusExamples.length}`;
      summary.append(title, count);
      const grid = document.createElement("div");
      grid.className = "board-scenario-grid";
      grid.append(createBoardScenarioGroup(focusExamples, focusScenario));
      details.append(summary, grid);
      host.append(details);
    });
  }

  function renderTrainerCards(host, cards, label) {
    const normalized = cards.map(normalizeCardCode).filter(Boolean);
    fillColorBlockCards(
      host,
      normalized,
      `${label}: ${normalized.map(cardName).join(", ")}`,
      label === "Флоп" ? "board" : "hero"
    );
  }

  function replaceTrainerFeedback(kicker, title, copy, lesson) {
    const host = query("[data-trainer-feedback]");
    host.classList.toggle("is-correct", kicker === "Верно");
    host.classList.toggle("is-alternative", kicker === "Допустимо");
    host.classList.toggle("is-wrong", kicker === "Не совсем");
    host.replaceChildren();
    host.append(
      textElement("p", "eyebrow", kicker),
      textElement("h3", "", title)
    );
    if (copy) host.append(textElement("p", "", copy));
    if (lesson) host.append(textElement("strong", "trainer-lesson", lesson));
  }

  function trainerSpotKey(board, hand) {
    return `${board.join(",")}|${hand.slice().sort().join(",")}`;
  }

  function trainerActionGroup(action) {
    if (action === "check") return "check";
    if (["25", "33", "small"].includes(action)) return "small";
    if (["50", "67", "large"].includes(action)) return "large";
    return "";
  }

  function trainerHasStrongMadeHand(board, hand) {
    const boardCards = (Array.isArray(board) ? board : []).map(normalizeCardCode).filter(Boolean);
    const handCards = (Array.isArray(hand) ? hand : []).map(normalizeCardCode).filter(Boolean);
    if (boardCards.length !== 3 || handCards.length !== 2) return false;

    const rankOrder = "23456789TJQKA";
    const boardRanks = boardCards.map((card) => card[0]);
    const handRanks = handCards.map((card) => card[0]);
    const allCards = [...boardCards, ...handCards];
    const allRanks = allCards.map((card) => card[0]);
    const topBoardRank = boardRanks.reduce((best, rank) => (
      rankOrder.indexOf(rank) > rankOrder.indexOf(best) ? rank : best
    ), boardRanks[0]);
    const combinedCount = (rank) => allRanks.filter((item) => item === rank).length;
    const boardMatches = new Set(handRanks.filter((rank) => boardRanks.includes(rank)));

    if (boardMatches.size >= 2) return true;
    if (handRanks.some((rank) => combinedCount(rank) >= 3)) return true;
    if (
      handRanks[0] === handRanks[1]
      && rankOrder.indexOf(handRanks[0]) > rankOrder.indexOf(topBoardRank)
    ) return true;
    if (boardMatches.has(topBoardRank)) {
      const kicker = handRanks.find((rank) => rank !== topBoardRank);
      if (rankOrder.indexOf(kicker) >= rankOrder.indexOf("T")) return true;
    }

    const flush = allCards.every((card) => card[1] === allCards[0][1]);
    const uniqueValues = Array.from(new Set(allRanks.map((rank) => rankOrder.indexOf(rank) + 2)))
      .sort((a, b) => a - b);
    const straight = uniqueValues.length === 5 && (
      uniqueValues[4] - uniqueValues[0] === 4
      || uniqueValues.join(",") === "2,3,4,5,14"
    );
    return flush || straight;
  }

  function trainerSizingAlternative(spot, action) {
    return action === "large"
      && spot.accepted.includes("small")
      && trainerHasStrongMadeHand(spot.board, spot.hand);
  }

  function normalizedTrainerSpot(spot) {
    const board = (Array.isArray(spot && spot.board) ? spot.board : [])
      .map(normalizeCardCode)
      .filter(Boolean);
    const hand = (Array.isArray(spot && spot.hand) ? spot.hand : [])
      .map(normalizeCardCode)
      .filter(Boolean);
    if (board.length !== 3 || hand.length !== 2 || new Set([...board, ...hand]).size !== 5) return null;
    const accepted = Array.from(new Set(
      (Array.isArray(spot && spot.accepted) ? spot.accepted : [])
        .map(trainerActionGroup)
        .filter(Boolean)
    ));
    if (accepted.length !== 1) return null;
    return {
      ...spot,
      board,
      hand,
      accepted,
      key: trainerSpotKey(board, hand)
    };
  }

  function dataBackedTrainerSpots() {
    const payload = model.boardExamples;
    const categories = payload && Array.isArray(payload.categories) ? payload.categories : [];
    const spots = [];

    categories.forEach((category) => {
      const rule = TRAINER_STRUCTURE_RULES[category && category.structure];
      if (!rule) return;
      const examples = [
        category.scenarios && category.scenarios.league1_more,
        ...(Array.isArray(category.league1MoreExamples) ? category.league1MoreExamples : [])
      ].filter(Boolean);

      examples.forEach((example) => {
        const league1 = example.observations && example.observations.league1;
        const newcomers = example.observations && example.observations.newcomers;
        if (
          example.directionSupported !== true
          || !(Number(example.gapPp) > 0)
          || normalizedToken(league1 && league1.action) !== "bet"
          || normalizedToken(newcomers && newcomers.action) !== "check"
        ) return;
        const board = Array.isArray(example.canonicalCards) ? example.canonicalCards : [];
        const hands = Array.isArray(newcomers && newcomers.checkedHands) ? newcomers.checkedHands : [];
        hands.forEach((hand) => {
          if (
            !checkedHandHasStableEvidence(hand)
            ||
            firstText(hand || {}, ["comparisonCohort", "comparison_cohort"]) !== "league1"
            || firstText(hand || {}, ["comparisonAction", "comparison_action"]) !== "bet"
            || !(firstNumber(hand || {}, ["comparisonActionOccurrences", "comparison_action_occurrences"]) > 0)
            || firstNumber(hand || {}, ["comparisonCheckOccurrences", "comparison_check_occurrences"]) !== 0
          ) return;
          const spot = normalizedTrainerSpot({
            ...rule,
            board,
            hand: hand.cards,
            opponent: "чек · ридов нет",
            // This branch has both reviewed `league1_more` direction and at
            // least the shared N floor for the exact board/hand evidence.
            // Sparse examples stay descriptive only and never become a
            // prescriptive practice answer.
            accepted: ["small"],
            title: "Не пропускай подтверждённый маленький c-bet",
            explanation: "Эта рука пришла из собранного примера, где Лига 1 ставила, а новички чекали. Выбирай 25–33% банка."
          });
          if (spot) spots.push(spot);
        });
      });
    });

    return Array.from(new Map(spots.map((spot) => [spot.key, spot])).values());
  }

  function buildTrainerPool() {
    const dataSpots = dataBackedTrainerSpots();
    const regularSpots = dataSpots.length ? dataSpots : TRAINER_FALLBACK_SPOTS;
    const source = [...regularSpots, ...TRAINER_FISH_SPOTS];
    const normalized = source.map(normalizedTrainerSpot).filter(Boolean);
    return Array.from(new Map(normalized.map((spot) => [spot.key, spot])).values());
  }

  function shuffledTrainerSpots(spots) {
    const shuffled = spots.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
  }

  function trainerQueueWithFish(spots) {
    const regularQueue = shuffledTrainerSpots(spots.filter((spot) => spot.opponentClass !== "is-loose"));
    const fishSpots = spots.filter((spot) => spot.opponentClass === "is-loose");
    if (!fishSpots.length) return regularQueue;
    if (!regularQueue.length) return shuffledTrainerSpots(fishSpots);

    let fishQueue = shuffledTrainerSpots(fishSpots);
    const queue = [];
    const takeFish = () => {
      if (!fishQueue.length) fishQueue = shuffledTrainerSpots(fishSpots);
      return fishQueue.shift();
    };

    if (state.trainerIndex === 0) queue.push(takeFish());
    while (regularQueue.length) {
      const chunk = regularQueue.splice(0, 3);
      queue.push(...chunk);
      if (chunk.length === 3) queue.push(takeFish());
    }
    return queue;
  }

  function refillTrainerQueue() {
    const queue = trainerQueueWithFish(buildTrainerPool());
    if (queue.length > 1 && queue[0].key === state.trainerLastKey) {
      const replacement = queue.findIndex((spot) => spot.key !== state.trainerLastKey);
      [queue[0], queue[replacement]] = [queue[replacement], queue[0]];
    }
    state.trainerQueue = queue;
  }

  function takeTrainerSpot() {
    if (!state.trainerQueue.length) refillTrainerQueue();
    const spot = state.trainerQueue.shift() || normalizedTrainerSpot(TRAINER_FALLBACK_SPOTS[0]);
    state.trainerSpot = spot;
    state.trainerLastKey = spot.key;
    return spot;
  }

  function updateTrainerHud() {
    const completed = state.trainerIndex + (state.trainerAnswered ? 1 : 0);
    query("[data-trainer-hands]").textContent = String(completed);
    query("[data-trainer-correct]").textContent = String(state.trainerScore);
    query("[data-trainer-misses]").textContent = String(Math.max(0, completed - state.trainerScore));
  }

  function reportTrainerProgress() {
    const attempts = state.trainerIndex + (state.trainerAnswered ? 1 : 0);
    const api = window.FFPlayerProgress;
    if (
      state.courseReported
      || attempts < COURSE_PROGRESS.targetHands
      || !api
      || typeof api.setResult !== "function"
    ) return false;
    const correct = state.trainerScore;
    const score = Math.round((correct / attempts) * 100);
    try {
      api.setResult(COURSE_PROGRESS.skillKey, {
        attempts,
        correct,
        score,
        bestScore: score,
        status: score >= COURSE_PROGRESS.passScore ? "passed" : "repeat"
      }, {
        session: {
          id: state.courseSessionId,
          type: "lesson",
          mode: COURSE_PROGRESS.mode,
          total: attempts,
          correct,
          accuracy: score
        },
        metadata: { lesson: COURSE_PROGRESS.mode, source: "standalone-course-practice" }
      });
      state.courseReported = true;
      return true;
    } catch (error) {
      return false;
    }
  }

  function renderTrainer() {
    const spot = state.trainerSpot || takeTrainerSpot();
    const isLoose = spot.opponentClass === "is-loose";
    const context = query("[data-trainer-context]");
    context.textContent = isLoose ? `ФИШ · ${spot.structure}` : spot.structure;
    context.classList.toggle("is-loose", isLoose);
    query("[data-trainer-title]").textContent = `Раздача ${state.trainerIndex + 1}`;
    renderSnapshotDecision(
      query("[data-trainer-table]"),
      snapshotSpot(spot),
      state.trainerAnswered ? state.trainerChoice : "",
      { nextLabel: state.trainerAnswered ? "Следующая раздача" : "" }
    );
    updateTrainerHud();
    if (!state.trainerAnswered) {
      replaceTrainerFeedback(
        spot.structure,
        "Что делаешь?",
        `BB ${spot.opponent}.`
      );
    }
  }

  function answerTrainer(action) {
    if (state.trainerAnswered) return;
    const spot = state.trainerSpot;
    if (!SNAPSHOT_ACTIONS.some((option) => option.key === action)) return;
    const correct = spot.accepted.includes(action);
    const alternative = !correct && trainerSizingAlternative(spot, action);
    const credited = correct || alternative;
    state.trainerAnswered = true;
    state.trainerChoice = action;
    if (credited) state.trainerScore += 1;
    reportTrainerProgress();

    renderTrainer();
    const incorrectLead = action === "check" && spot.checkFeedback
      ? spot.checkFeedback
      : "Здесь лучше изменить план. ";
    replaceTrainerFeedback(
      correct ? "Верно" : alternative ? "Допустимо" : "Не совсем",
      alternative ? "Крупнее с сильной рукой — разумно" : spot.title,
      alternative
        ? "В целом поставить больше с хорошей рукой — мудрый выбор. Но не забывай: достаточно компетентные оппоненты могут вчитываться в твой сайзинг и сужать твой диапазон по размеру ставки."
        : `${correct ? "Хороший учебный выбор. " : incorrectLead}${spot.explanation}`,
      alternative
        ? "Мелкий c-bet остаётся базовым планом диапазона; крупный сайз не должен автоматически означать силу."
        : "Сначала структура → потом размер."
    );
    window.requestAnimationFrame(() => {
      const next = query("[data-trainer-table] [data-practice-next]");
      next?.focus({ preventScroll: true });
      next?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  function resetTrainer() {
    state.trainerIndex = 0;
    state.trainerScore = 0;
    state.trainerAnswered = false;
    state.trainerChoice = "";
    state.trainerSpot = null;
    state.trainerQueue = [];
    state.trainerLastKey = "";
    state.courseReported = false;
    state.courseSessionId = `flop-cbet-hu-${Date.now().toString(36)}`;
    takeTrainerSpot();
    renderTrainer();
  }

  function setTrainerRunning(running) {
    state.trainerRunning = Boolean(running);
    query("[data-trainer-setup]").hidden = state.trainerRunning;
    query("[data-trainer-run]").hidden = !state.trainerRunning;
    query("#practiceScreen").classList.toggle("is-running", state.trainerRunning);
  }

  function focusTrainerActions() {
    window.requestAnimationFrame(() => {
      const action = query("[data-trainer-table] .table-action");
      action?.focus({ preventScroll: true });
      action?.closest(".client-controls")?.scrollIntoView({ block: "nearest", behavior: "auto" });
    });
  }

  function advanceTrainer() {
    if (!state.trainerAnswered) return;
    state.trainerIndex += 1;
    state.trainerAnswered = false;
    state.trainerChoice = "";
    takeTrainerSpot();
    renderTrainer();
    focusTrainerActions();
  }

  function startTrainer() {
    resetTrainer();
    setTrainerRunning(true);
    focusTrainerActions();
  }

  function exitTrainer() {
    setTrainerRunning(false);
    query("[data-trainer-start]").focus();
  }

  function initTrainer() {
    query("[data-trainer-table]").addEventListener("click", (event) => {
      if (event.target.closest("[data-practice-next]")) {
        advanceTrainer();
        return;
      }
      const action = event.target.closest("[data-option-key]");
      if (action) answerTrainer(action.dataset.optionKey);
    });
    query("[data-trainer-start]").addEventListener("click", startTrainer);
    query("[data-trainer-exit]").addEventListener("click", exitTrainer);
    setTrainerRunning(false);
  }

  initNavigation();
  initDeal();
  initWisdom();
  initRankSelect();
  initTrainer();
  renderDataMeta();
  renderField();
  renderBoardExamples();
  if (["deal", "main", "field", "practice", "examples"].includes(requestedStep)) {
    setStep(requestedStep, false);
  } else {
    document.documentElement.dataset.step = state.step;
  }
})();
