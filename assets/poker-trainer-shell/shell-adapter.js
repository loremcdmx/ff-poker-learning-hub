(function (root) {
  "use strict";

  const VERSION = "ff-trainer-shell-adapter-v1";
  const DATA_READY_TIMEOUT_MS = 8000;

  const COMMON_CONTRACT = Object.freeze({
    schema: "ff-trainer-shell-pack-v1",
    runtime: "FFTrainerShell.mount",
    telemetry: "ff-trainer-event-v1",
    result: "FFPlayerProgress.setResult",
    richEvents: ["trainer_decision", "trainer_session"],
    requiredSpotFields: ["id", "title", "question", "table", "options"]
  });

  const ACTION_LABELS = Object.freeze({
    allin: "Олл-ин",
    all_in: "Олл-ин",
    bet: "Ставка",
    call: "Колл",
    check: "Чек",
    coldcall: "Колдколл",
    cold_call: "Колдколл",
    fold: "Пас",
    isolate: "Изолейт",
    iso: "Изолейт",
    jam: "Пуш",
    limp: "Лимп",
    min_open: "Мин-рейз",
    open: "Открыть",
    overlimp: "Оверлимп",
    push: "Пуш",
    raise: "Рейз",
    resteal: "Рестил",
    squeeze: "Сквиз",
    threeBet: "3-бет",
    threebet: "3-бет"
  });

  const PROFILES = Object.freeze({
    open_first: {
      id: "third-league-open-first-l10-v1",
      dataKey: "PokerOpenFirstData",
      readyKey: "PokerOpenFirstDataReady",
      skillKey: "open_first",
      title: "Первое открытие",
      subtitle: "Выбираем первое действие по позиции, стеку и руке",
      trainerTitle: "Первое открытие",
      defaultSessionLength: 20,
      defaultPassScore: 80,
      nextRecommendation: "isolation",
      accent: "mint",
      tableTone: "green",
      sourceFiles: ["assets/poker-open-first/data.js"]
    },
    isolation: {
      id: "third-league-isolation-l13-v1",
      dataKey: "PokerIsolationData",
      readyKey: "PokerIsolationDataReady",
      skillKey: "isolation",
      title: "Изоляция лимперов",
      subtitle: "Изолейт, оверлимп или пас против игроков, уже вошедших в банк",
      trainerTitle: "Изоляция",
      defaultSessionLength: 18,
      defaultPassScore: 75,
      nextRecommendation: "vs_3bet",
      accent: "mint",
      tableTone: "green"
    },
    bb_defense: {
      id: "third-league-bb-defense-l10-v1",
      dataKey: "PokerBbDefenseData",
      readyKey: "PokerBbDefenseDataReady",
      skillKey: "bb_defense",
      title: "Защита BB",
      subtitle: "Цена колла, 3-бет и защита против позиции опенрейзера",
      trainerTitle: "Защита большого блайнда",
      defaultSessionLength: 18,
      defaultPassScore: 80,
      nextRecommendation: "vs_3bet",
      accent: "cyan",
      tableTone: "green"
    },
    vs_3bet: {
      id: "third-league-vs-3bet-l13-v1",
      dataKey: "PokerVs3BetData",
      readyKey: "PokerVs3BetDataReady",
      skillKey: "vs_3bet",
      title: "3-бет: атака и защита",
      subtitle: "3-бет против опена и решения после ответного 3-бета",
      trainerTitle: "3-бет: атака и защита",
      defaultSessionLength: 18,
      defaultPassScore: 75,
      nextRecommendation: "squeeze",
      accent: "violet",
      tableTone: "green"
    },
    squeeze: {
      id: "third-league-squeeze-l13-v1",
      dataKey: "PokerSqueezeData",
      readyKey: "PokerSqueezeDataReady",
      skillKey: "squeeze",
      title: "Сквизы",
      subtitle: "Давление против рейза и коллера: value, блеф или пас",
      trainerTitle: "Сквиз",
      defaultSessionLength: 12,
      defaultPassScore: 80,
      nextRecommendation: "short",
      accent: "amber",
      tableTone: "green"
    },
    flop: {
      id: "third-league-postflop-aggressor-l13-v1",
      dataKey: "PokerPostflopAggressorData",
      readyKey: "PokerPostflopAggressorDataReady",
      skillKey: "flop",
      title: "Постфлоп агрессор",
      subtitle: "Продолжаем давление или сдаём темп по текстуре доски",
      trainerTitle: "Постфлоп агрессор",
      defaultSessionLength: 18,
      defaultPassScore: 75,
      nextRecommendation: "exam",
      accent: "amber",
      tableTone: "slate"
    },
    range_call: {
      id: "third-league-range-call-l8-v1",
      dataKey: "PokerRangeCallData",
      readyKey: "PokerRangeCallDataReady",
      skillKey: "range_call",
      title: "Ренджи и коллы",
      subtitle: "Рука, позиция, цена банка и риск доминации",
      trainerTitle: "Ренджи и прибыльный колл",
      defaultSessionLength: 14,
      defaultPassScore: 80,
      nextRecommendation: "open_first",
      accent: "cyan",
      tableTone: "green"
    },
    tournament: {
      id: "third-league-tournament-foundation-l6-v1",
      dataKey: "PokerTournamentFoundationData",
      readyKey: "PokerTournamentFoundationDataReady",
      skillKey: "tournament",
      title: "Турнирная база",
      subtitle: "Формат, стадия, стек и призовое давление перед решением",
      trainerTitle: "Турнирная база",
      defaultSessionLength: 14,
      defaultPassScore: 80,
      nextRecommendation: "range_call",
      accent: "amber",
      tableTone: "slate"
    },
    short: {
      id: "third-league-short-stack-l13-v1",
      dataKey: "PokerShortStackData",
      readyKey: "PokerShortStackDataReady",
      skillKey: "short",
      title: "Короткий стек",
      subtitle: "Пуш, пас, рестил и колл пуша по эффективному стеку",
      trainerTitle: "Короткий стек",
      defaultSessionLength: 16,
      defaultPassScore: 75,
      nextRecommendation: "icm_short",
      accent: "amber",
      tableTone: "green"
    },
    icm_short: {
      id: "third-league-icm-short-l14-v1",
      dataKey: "PokerIcmShortData",
      readyKey: "PokerIcmShortDataReady",
      skillKey: "icm_short",
      title: "ICM короткого стека",
      subtitle: "Давление баббла, финалки, сателлита и PKO",
      trainerTitle: "ICM short",
      defaultSessionLength: 14,
      defaultPassScore: 75,
      nextRecommendation: "exam",
      accent: "violet",
      tableTone: "slate"
    },
    exam: {
      id: "third-league-mixed-exam-abi6-l15-v1",
      dataKey: "PokerMixedExamData",
      readyKey: "PokerMixedExamDataReady",
      skillKey: "exam",
      title: "Смешанный экзамен",
      subtitle: "Контрольная ABI6: префлоп, постфлоп, ICM и повтор слабых мест",
      trainerTitle: "Mixed exam",
      defaultSessionLength: 30,
      defaultPassScore: 80,
      nextRecommendation: "review",
      accent: "mint",
      tableTone: "slate"
    },
    table_decision: {
      id: "third-league-table-decision-shell-v1",
      skillKey: "table_decision",
      title: "Позиции за столом",
      subtitle: "Определи зону позиции до выбора диапазона",
      trainerTitle: "Позиции за столом",
      defaultSessionLength: 7,
      defaultPassScore: 85,
      nextRecommendation: "open_first",
      accent: "violet",
      tableTone: "violet",
      synthetic: "table_decision"
    },
    review: {
      id: "third-league-review-shell-v1",
      skillKey: "review",
      title: "Разбор ошибок",
      subtitle: "Выбери правильный повтор по текущим слабым тегам",
      trainerTitle: "Review",
      defaultSessionLength: 3,
      defaultPassScore: 80,
      nextRecommendation: "exam",
      accent: "cyan",
      tableTone: "slate",
      synthetic: "review"
    }
  });

  const TABLE_DECISION_SEATS = Object.freeze([
    { position: "UTG", band: "early" },
    { position: "UTG+1", band: "early" },
    { position: "MP", band: "middle" },
    { position: "LJ", band: "middle" },
    { position: "HJ", band: "middle" },
    { position: "CO", band: "late" },
    { position: "BTN", band: "late" }
  ]);

  const BAND_LABELS = Object.freeze({
    early: "ранняя",
    middle: "средняя",
    late: "поздняя"
  });

  const COACH_NOTE_TRANSLATIONS = Object.freeze({
    "Price: call cost and pot odds": "Сначала проверь цену колла и шансы банка.",
    "Range gate: opener group and hand class": "Потом сопоставь группу рейзера и класс руки.",
    "Context: PKO cover, ICM or SB limp": "Дальше учитывай контекст: PKO, ICM или лимп SB.",
    "How many limpers and where are they?": "Сначала посчитай лимперов и их позиции.",
    "Do we have position and enough hand class to isolate?": "Потом проверь позицию и достаточно ли рука сильна для изолейта.",
    "If isolating, is the size standard or exploit-large?": "Если изолируем, выбери стандартный или exploit-крупный размер.",
    "Позиция и source-row gate": "Сначала проверь позицию и ветку чарта.",
    "Стек: full RFI, short RFI или push/fold": "Затем раздели стек на full RFI, short RFI или push/fold.",
    "Рука внутри нужной ветки, а не просто выглядит красиво": "Рука должна попадать в нужную ветку, а не просто выглядеть красиво.",
    "Identify the ABI6 category before reading the action labels.": "Сначала определи категорию ABI6, потом читай варианты действий.",
    "Map street, stack and pot pressure.": "Потом сопоставь улицу, стек и давление банка.",
    "Choose the line that routes cleanly to the source category.": "Выбирай линию, которая чисто ведёт в нужную категорию тренировки.",
    "Texture: static, wet, paired, monotone or multiway": "Сначала классифицируй текстуру: статичная, мокрая, спаренная, монотонная или мультивей.",
    "Line pressure: prior bets, folds and SPR": "Потом проверь давление линии: предыдущие ставки, фолды и SPR.",
    "Hero hand: showdown value, overcards or draw equity": "Затем оцени руку Героя: шоудаун-велью, оверкарты или дро-эквити.",
    "Mode: open push, resteal or call-vs-jam": "Сначала определи режим: open push, resteal или call-vs-jam.",
    "Stack band: 0-10, 11-15, 16-20 or 21-24 BB": "Потом найди стековую зону: 0-10, 11-15, 16-20 или 21-24 BB.",
    "Source range and price gate": "Дальше проверь исходный диапазон и цену решения.",
    "Do not resize c-bets before checking board texture and fold equity.": "Не меняй сайзинг c-bet до проверки текстуры доски и фолд-эквити.",
    "Do not treat every flop as the same c-bet problem.": "Не решай каждый флоп как одинаковую задачу на c-bet.",
    "Do not apply freezeout, re-entry, rebuy/add-on or bounty rules without reading the live format gate first.": "Сначала проверь формат турнира: freezeout, re-entry, rebuy/add-on и bounty меняют риск по-разному.",
    "Do not import bubble pressure into early or middle stages where stack utility is still close to chip-EV.": "Не переноси bubble-давление на ранние и средние стадии, где chip-EV ещё ближе к базовой модели.",
    "Do not ignore bubble, satellite or payjump pressure once the payout gate is active.": "Не игнорируй bubble, satellite и payjump, когда выплаты уже меняют цену риска.",
    "Do not plan from chips alone; convert to BB, compare to average and account for orbit cost.": "Не планируй по фишкам в вакууме: переведи стек в BB, сравни со средним и учти цену орбиты.",
    "Do not treat a covered all-in or final-table ladder spot as a normal chip-EV call.": "Не считай all-in против покрывающего стека или финальный payjump обычным chip-EV коллом.",
    "Do not add bounty value unless Hero can actually win the bounty and the payout stage allows the risk.": "Не добавляй bounty в решение, если Hero не может реально забрать награду или стадия не выдерживает риск.",
    "Do not choose the line before source, format, stack and payout gates agree.": "Сначала сведи формат, стек, стадию выплат и линию, потом выбирай действие.",
    "Do not fire thin multiway bets without value or strong texture pressure.": "Не ставь тонко в мультипоте без value или сильного давления текстуры.",
    "Do not treat multiway flops like heads-up range bets.": "Не играй мультипот как обычный heads-up c-bet по диапазону.",
    "Do not continue OOP just because Hero was preflop aggressor.": "Не продолжай без позиции только потому, что Hero был префлоп-агрессором.",
    "Do not auto-c-bet every flop when texture or range pressure says stop.": "Не ставь c-bet автоматически, если текстура или давление диапазонов говорят остановиться.",
    "Do not click the label before mapping texture, line pressure and source row.": "Сначала сопоставь текстуру, давление линии и учебную ветку, потом выбирай кнопку.",
    "Do not turn bounty value into an automatic loose continue.": "Не превращай bounty в автоматическое широкое продолжение.",
    "SB versus BTN: do not cold call like BB": "SB против BTN: не коллируй как на BB",
    "Fold: At 23 BB from UTG, low pairs do not realize enough when called or jammed on.": "Пас: на 23 BB из UTG низкие пары плохо реализуются против колла или пуша.",
    "Too loose at 24 BB. You do not have enough implied odds.": "Слишком широко для 24 BB: implied odds не хватает.",
    "Correct. Do not confuse price with profit.": "Верно: не путай цену колла с прибыльностью.",
    "Pressure line: test blockers, fold equity and value.": "Линия давления: проверь блокеры, фолд-эквити и value.",
    "Correct. Use blocker pressure and fold equity.": "Верно: используй давление блокерами и фолд-эквити.",
    "Reject passive folds when ICM pressure creates fold equity.": "Не выбирай пассивный фолд, когда ICM-давление создаёт фолд-эквити.",
    "Reject the passive flat when your hand wants value or fold equity.": "Не выбирай пассивный колл, когда рука хочет value или фолд-эквити.",
    "Reject the passive line when it gives up initiative or equity.": "Не выбирай пассивную линию, если она отдаёт инициативу или эквити.",
    "Too loose. This blocker does not carry enough realization.": "Слишком широко: одного блокера не хватает для реализации.",
    "Too tight for this exploit read.": "Слишком тайтово для такого exploit-рида."
  });

  const TEACHING_VALUE_TRANSLATIONS = Object.freeze({
    air_or_backdoor: "воздух или бэкдор",
    bad_fold_flop: "лишний фолд на флопе",
    bluff: "блеф",
    bluff_c_bet: "блефовый c-bet",
    call_vs_jam: "колл против пуша",
    connected: "связная",
    delayed_c_bet: "отложенный c-bet",
    draw_equity: "дро-эквити",
    dry: "сухая",
    dry_brick_river: "сухой бланк ривера",
    dry_range: "сухая, за диапазоном рейзера",
    early: "ранняя",
    exam_bb_price_call: "защита BB по цене",
    exam_flop_pressure: "давление на флопе",
    exam_isolation_attack: "изолейт-атака",
    exam_math_price: "математика цены",
    exam_open_first_raise: "опен-рейз первым",
    exam_short_push_fold: "push/fold",
    exam_vs3bet_aggressive: "агрессивный ответ на 3-бет",
    fish_station: "фиш-коллингстейшн",
    flop_decision: "решение на флопе",
    flop_discipline_fold: "дисциплинированный фолд на флопе",
    flush_completed: "флаш закрылся",
    full_stack: "глубокий стек",
    give_up: "сдаться",
    high_card_texture: "высокая текстура",
    isolation_cbet: "c-bet в изолейт-поте",
    late: "поздняя",
    loose_multiway_bet: "слишком тонкая ставка мультивей",
    loose_unplanned_bet: "лишняя ставка без плана",
    mid_stack: "средний стек",
    middle: "средняя",
    missed_cbet: "пропущенный c-bet",
    missed_draw: "недоехавшее дро",
    mixed_texture: "смешанная текстура",
    monotone: "монотонная",
    monotone_high_pressure: "монотонная, высокое давление",
    multiway: "мультивей",
    multiway_discipline_check: "дисциплинированный чек мультивей",
    multiway_value_bet: "value-ставка мультивей",
    no_showdown_value: "нет шоудаун-велью",
    one_pair: "одна пара",
    oop_check: "чек без позиции",
    oop_flop: "флоп без позиции",
    oop_pressure_bet: "ставка давления без позиции",
    overcard_river: "оверкарта ривера",
    overcards: "оверкарты",
    paired: "спаренная",
    paired_board: "спаренная доска",
    paired_static: "спаренная статичная",
    pair_or_better: "пара или лучше",
    polar_value: "полярное value",
    pressure_bluff: "блеф давлением",
    push_fold: "push/fold",
    rainbow: "радуга",
    range_cbet: "рейндж-сбет",
    range_checkback: "рейндж-чек-бэк",
    range_pressure: "давление диапазоном",
    resteal: "рестил",
    short_stack: "короткий стек",
    showdown: "шоудаун",
    showdown_value: "шоудаун-велью",
    static: "статичная",
    straight: "стрит",
    target_line: "целевая линия",
    thin_showdown: "тонкое шоудаун-велью",
    thin_value: "тонкое value",
    thin_value_bad: "плохое тонкое value",
    top_pair: "топ-пара",
    two_overcards: "две оверкарты",
    two_pair: "две пары",
    two_tone: "две масти",
    value_bet: "value-ставка",
    value_c_bet: "value c-bet",
    weak_oop_continue: "слабое продолжение без позиции",
    wet: "мокрая",
    wet_connected: "мокрая связная",
    wrong_cbet_size: "неверный размер c-bet",
    wrong_flop_line: "неверная линия флопа"
  });

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function cleanText(value, fallback = "") {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text || fallback;
  }

  function safeId(value, fallback = "spot") {
    const text = String(value || fallback)
      .replace(/[^a-zA-Z0-9_.:-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
    return text || fallback;
  }

  function numberOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatBb(value, fallback = "") {
    const number = numberOrNull(value);
    if (number === null) return cleanText(value, fallback);
    const rounded = Math.round(number * 10) / 10;
    return `${rounded} BB`;
  }

  function formatOptionalBb(value) {
    const text = cleanText(value);
    if (!text) return "";
    const number = numberOrNull(value);
    if (number !== null) return number > 0 ? formatBb(number) : "";
    if (/^0(?:[.,]0)?\s*(?:BB|ББ)?$/i.test(text)) return "";
    return text;
  }

  function bbNumber(value) {
    const direct = numberOrNull(value);
    if (direct !== null) return direct;
    const text = cleanText(value).replace(",", ".");
    const match = text.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
  }

  function firstText(values, fallback = "") {
    for (const value of values) {
      const text = cleanText(value);
      if (text) return text;
    }
    return fallback;
  }

  function unique(values) {
    return [...new Set(asArray(values).map((value) => cleanText(value)).filter(Boolean))];
  }

  function actionLabel(key, spot = {}, data = {}) {
    const text = cleanText(key);
    const lookup = [
      spot.optionLabels?.[text],
      data.actionLabels?.[text],
      ACTION_LABELS[text],
      ACTION_LABELS[text.replace(/[-_\s]+(.)/g, (_, char) => char.toUpperCase())],
      ACTION_LABELS[text.toLowerCase()]
    ].find(Boolean);
    if (lookup) return lookup;
    return text
      .replace(/_/g, " ")
      .replace(/\bfold\b/gi, "Пас")
      .replace(/\bcall\b/gi, "Колл")
      .replace(/\bcheck\b/gi, "Чек")
      .replace(/\braise\b/gi, "Рейз")
      .replace(/\bopen\b/gi, "Открыть")
      .replace(/\bjam\b/gi, "Пуш")
      .replace(/\bsqueeze\b/gi, "Сквиз");
  }

  function cardCode(code) {
    const text = cleanText(code);
    if (!text) return "";
    const rankRaw = text.length === 3 ? text.slice(0, 2) : text.slice(0, -1);
    const suitRaw = text.slice(text.length === 3 ? 2 : -1);
    const rank = rankRaw.toUpperCase() === "10" ? "T" : rankRaw.toUpperCase();
    const suit = suitRaw.toLowerCase();
    if (!rank || !"shdc".includes(suit)) return "";
    return `${rank}${suit}`;
  }

  function cardsFromHand(hand) {
    const text = cleanText(hand).toUpperCase();
    if (!/^[AKQJT2-9][AKQJT2-9][SO]?$/.test(text)) return [];
    const first = text[0];
    const second = text[1];
    const marker = text[2] || "";
    if (first === second) return [`${first}s`, `${second}h`];
    if (marker === "S") return [`${first}s`, `${second}s`];
    return [`${first}s`, `${second}h`];
  }

  function normalizeCards(values, fallbackHand = "") {
    const cards = asArray(values).map(cardCode).filter(Boolean);
    return cards.length ? cards : cardsFromHand(fallbackHand);
  }

  function sourceRowsForSpot(spot) {
    return unique([
      spot.sourceRowId,
      spot.sourceRowKey,
      spot.sourceRow,
      ...(asArray(spot.sourceRowIds)),
      ...(asArray(spot.checkpointSourceRows)),
      ...(asArray(spot.checkpointSourceRowIds))
    ]);
  }

  function sourceRowsForData(data, profile) {
    const rows = [
      ...(asArray(data.sourceRows)),
      ...(asArray(data.checkpointGate?.sourceRows)),
      ...(asArray(data.checkpointGate?.requiredSourceRows)),
      ...(asArray(data.sourcePacks).map((pack) => pack.rowKey || pack.rowId || pack.sourceRow))
    ];
    if (profile.skillKey === "table_decision") rows.push("table_decision_position_zones");
    if (profile.skillKey === "review") rows.push("trainer_progress_weak_tags");
    return unique(rows);
  }

  function sourceForSpot(spot, profile) {
    const rows = sourceRowsForSpot(spot);
    const row = rows[0] || cleanText(spot.sourceLink) || cleanText(spot.sourceTitle) || profile.skillKey;
    return {
      label: "источник",
      row,
      detail: firstText([spot.sourceTitle, spot.sourceLink, spot.sourceNote, spot.source, spot.sourceKind], profile.title)
    };
  }

  function defaultPositions(heroPosition, spot = {}) {
    const positions = asArray(spot.positionsOrder).length
      ? asArray(spot.positionsOrder)
      : ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
    if (heroPosition && !positions.includes(heroPosition)) return [...positions, heroPosition];
    return positions;
  }

  function sourceSeatPosition(seat) {
    return cleanText(seat?.position || seat?.pos || seat?.label || seat?.seat || seat?.name);
  }

  function sourceSeatStack(seat) {
    const value = Number(seat?.visibleStackBb ?? seat?.stackBb ?? seat?.stack);
    return Number.isFinite(value) ? value : null;
  }

  function decisionOpponentPositions(spot, heroPosition) {
    const heroKey = actionSeatKey(heroPosition);
    const street = firstText([spot.street, spot.table?.street, spot.stage], "preflop");
    const explicit = unique([
      spot.opener,
      spot.openerPosition,
      spot.threeBettorPosition,
      spot.villainPosition,
      ...(asArray(spot.callers)),
      ...(asArray(spot.limperPositions))
    ]).filter((position) => actionSeatKey(position) !== heroKey);
    const actors = [
      ...asArray(spot.actionLine),
      ...asArray(spot.actions),
      ...asArray(spot.flowSteps),
      ...asArray(spot.preActionLine)
    ].filter((row) => {
      if (!row || typeof row !== "object") return false;
      const seat = actionSeat(row, heroPosition);
      const seatKey = actionSeatKey(seat, heroPosition);
      const type = actionTypeKey(row);
      if (!seatKey || seatKey === heroKey || /fold|пас/.test(type)) return false;
      return !isBlindPostAction(row, street, heroPosition);
    }).map((row) => actionSeat(row, heroPosition));

    const seats = asArray(spot.seats);
    const heroSeat = seats.find((seat) => actionSeatKey(sourceSeatPosition(seat)) === heroKey);
    const heroStack = sourceSeatStack(heroSeat) ?? bbNumber(spot.stackBb ?? spot.heroStackBb);
    const seatStacks = seats.map(sourceSeatStack).filter((stack) => stack !== null);
    const tableMax = seatStacks.length ? Math.max(...seatStacks) : null;
    const sameCommittedStack = heroStack !== null && tableMax !== null && heroStack < tableMax - 0.2
      ? seats.filter((seat) => {
        const position = sourceSeatPosition(seat);
        const stack = sourceSeatStack(seat);
        return position
          && actionSeatKey(position) !== heroKey
          && stack !== null
          && Math.abs(stack - heroStack) < 0.05;
      }).map(sourceSeatPosition)
      : [];

    return unique([...explicit, ...actors, ...sameCommittedStack])
      .filter((position) => actionSeatKey(position) !== heroKey)
      .slice(0, 3);
  }

  function seatState(label, heroPosition, spot = {}) {
    const text = cleanText(label);
    if (text === heroPosition) return "hero";
    const villains = unique([
      spot.opener,
      spot.openerPosition,
      spot.threeBettorPosition,
      spot.villainPosition,
      ...(asArray(spot.callers)),
      ...(asArray(spot.limperPositions)),
      ...decisionOpponentPositions(spot, heroPosition)
    ]);
    if (villains.includes(text)) return "villain";
    if (text === "SB" || text === "BB") return "blind";
    return "folded";
  }

  function normalizeSeat(seat, heroPosition, spot, index) {
    if (typeof seat === "string") {
      return { label: seat, state: seatState(seat, heroPosition, spot) };
    }
    const isHeroSeat = Boolean(seat?.isHero);
    const positionCode = cleanText(seat?.position || seat?.pos);
    const label = cleanText(
      isHeroSeat
        ? (positionCode || heroPosition || seat?.label || seat?.seat)
        : (positionCode || seat?.label || seat?.seat || seat?.name),
      `S${index + 1}`
    );
    const explicitState = cleanText(seat?.state || seat?.status);
    const state = explicitState || (isHeroSeat ? "hero" : seatState(label, heroPosition, spot)) || "waiting";
    const normalized = { label, state };
    if (Number.isFinite(Number(seat?.x))) normalized.x = Number(seat.x);
    if (Number.isFinite(Number(seat?.y))) normalized.y = Number(seat.y);
    const visibleStack = sourceSeatStack(seat);
    if (visibleStack !== null) normalized.visibleStackBb = visibleStack;
    return normalized;
  }

  function seatsForSpot(spot, heroPosition) {
    const directSeats = asArray(spot.seats);
    if (directSeats.length) return directSeats.map((seat, index) => normalizeSeat(seat, heroPosition, spot, index));
    return defaultPositions(heroPosition, spot).map((position) => ({
      label: position,
      state: seatState(position, heroPosition, spot)
    }));
  }

  function streetForSpot(spot, table, boardCards) {
    const explicit = firstText([spot.street, table.street, spot.stage]);
    if (explicit) return explicit;
    const count = Array.isArray(boardCards) ? boardCards.length : 0;
    if (count >= 5) return "river";
    if (count >= 4) return "turn";
    if (count >= 3) return "flop";
    return "preflop";
  }

  function actionSeat(row, heroPosition = "") {
    const actor = cleanText(row?.seat || row?.position || row?.actor || row?.player || row?.pos);
    return /^(hero|герой)$/i.test(actor) ? heroPosition : actor;
  }

  function actionSeatKey(value, heroPosition = "") {
    const text = cleanText(value);
    if (/^(hero|герой)$/i.test(text)) return actionSeatKey(heroPosition);
    return text.toUpperCase().replace(/\s+/g, "");
  }

  function actionTypeKey(row) {
    return cleanText(row?.action || row?.type || row?.kind || row?.label).toLowerCase().replace(/[\s_-]+/g, "");
  }

  function actionAmountBb(row) {
    return bbNumber(row?.amountBb ?? row?.amount ?? row?.toBb ?? row?.sizeBb ?? row?.size);
  }

  function isFoldOrCheckAction(action) {
    return /fold|пас|check|чек/.test(cleanText(action).toLowerCase());
  }

  function isBlindPostAction(row, street, heroPosition = "") {
    if (!/^preflop$/i.test(cleanText(street))) return false;
    const seat = actionSeatKey(actionSeat(row, heroPosition), heroPosition);
    const amount = actionAmountBb(row);
    const type = actionTypeKey(row);
    if (!/bet|blind|post|став/.test(type)) return false;
    return (seat === "SB" && amount === 0.5) || (seat === "BB" && amount === 1);
  }

  function isAggressivePackAction(row, street, heroPosition = "") {
    if (isBlindPostAction(row, street, heroPosition)) return false;
    const type = actionTypeKey(row);
    const amount = actionAmountBb(row);
    if (/allin|jam|push|пуш|оллин/.test(type)) return true;
    if (/3bet|threebet|squeeze|сквиз|raise|рейз|open|откр/.test(type)) return true;
    if (/^preflop$/i.test(cleanText(street)) && /bet|став/.test(type) && Number(amount || 0) <= 1) return false;
    return /bet|став/.test(type) && Number(amount || 0) > 0;
  }

  function normalizedPackActionKey(row, street, heroPosition = "", aggressiveSeen = 0) {
    const type = actionTypeKey(row);
    const amount = actionAmountBb(row);
    if (/fold|пас/.test(type)) return "fold";
    if (/check|чек/.test(type)) return "check";
    if (/coldcall|coldколл/.test(type)) return "coldcall";
    if (/call|колл/.test(type)) return "call";
    if (/allin|jam|push|пуш|оллин/.test(type)) return "allin";
    if (/3bet|threebet/.test(type)) return "threebet";
    if (/squeeze|сквиз/.test(type)) return "squeeze";
    if (/limp|лимп/.test(type)) return "limp";
    if (/bet|став|raise|рейз|open|откр/.test(type)) {
      if (/^preflop$/i.test(cleanText(street)) && /bet|став/.test(type) && Number(amount || 0) <= 1 && !isBlindPostAction(row, street, heroPosition)) {
        return "limp";
      }
      if (/^preflop$/i.test(cleanText(street)) && Number(amount || 0) > 1 && !isBlindPostAction(row, street, heroPosition)) {
        return aggressiveSeen > 0 ? "threebet" : "raise";
      }
      return /raise|рейз|open|откр/.test(type) ? "raise" : "bet";
    }
    return type || "action";
  }

  function findDecisionActionCutoff(rows, heroPosition, street) {
    const heroKey = actionSeatKey(heroPosition);
    return rows.findIndex((row, index) => {
      if (!row || typeof row !== "object") return false;
      const seatKey = actionSeatKey(actionSeat(row, heroPosition), heroPosition);
      if (!seatKey || seatKey !== heroKey) return false;
      return !rows.slice(index + 1).some((next) => {
        if (!next || typeof next !== "object") return false;
        const nextSeatKey = actionSeatKey(actionSeat(next, heroPosition), heroPosition);
        return nextSeatKey && nextSeatKey !== heroKey && isAggressivePackAction(next, street, heroPosition);
      });
    });
  }

  function normalizePackActionLine(rows, spot, table) {
    const sourceRows = asArray(rows);
    if (!sourceRows.length) return [];
    const heroPosition = firstText([spot.heroPosition, spot.position, table.heroPosition, spot.hero?.position], "Hero");
    const street = firstText([spot.street, table.street, spot.stage], "preflop");
    const cutoff = findDecisionActionCutoff(sourceRows, heroPosition, street);
    const priorRows = cutoff >= 0 ? sourceRows.slice(0, cutoff) : sourceRows;
    let aggressiveSeen = 0;
    return priorRows.map((row) => {
      if (!row || typeof row !== "object") return cleanText(row);
      if (isBlindPostAction(row, street, heroPosition)) return null;
      const seat = actionSeat(row, heroPosition);
      const action = normalizedPackActionKey(row, street, heroPosition, aggressiveSeen);
      const amountBb = isFoldOrCheckAction(action) ? null : actionAmountBb(row);
      const amount = amountBb === null ? "" : formatOptionalBb(amountBb);
      if (isAggressivePackAction(row, street, heroPosition)) aggressiveSeen += 1;
      return {
        seat,
        actor: seat,
        action,
        type: action,
        amount,
        amountBb: amountBb ?? 0,
        street,
        text: [seat, actionLabel(action, spot), amount].filter(Boolean).join(" ")
      };
    }).filter((row) => row && (typeof row !== "string" || row));
  }

  function isFoldActionRow(row) {
    if (!row || typeof row !== "object") return false;
    return /fold|пас/.test(cleanText(row.action || row.type || row.label).toLowerCase());
  }

  function compactDecisionActions(rows, street = "preflop") {
    const source = asArray(rows);
    const meaningful = source.filter((row) => row && typeof row === "object" && !isFoldActionRow(row));
    if (meaningful.length) return meaningful.slice(-4);
    if (!/^preflop$/i.test(cleanText(street))) return [];
    return source.slice(-3);
  }

  function inferredPostflopAction(spot, table, normalizedRows) {
    const heroPosition = firstText([spot.heroPosition, spot.position, table.heroPosition, spot.hero?.position], "Hero");
    const street = firstText([spot.street, table.street, spot.stage], "preflop");
    if (/^preflop$/i.test(street)) return null;
    if (asArray(normalizedRows).some((row) => row && typeof row === "object" && !isFoldActionRow(row))) return null;
    const prompt = firstText([spot.question, spot.prompt, spot.tableState]).toLowerCase();
    const checkedToHero = spot.mode === "cbet_ip" || /после чека|оппонент[^.]{0,40}(?:сыграл|играет)?\s*чек/.test(prompt);
    if (!checkedToHero) return null;
    const opponent = decisionOpponentPositions(spot, heroPosition)[0];
    if (!opponent) return null;
    return {
      seat: opponent,
      actor: opponent,
      action: "check",
      type: "check",
      amount: "",
      amountBb: 0,
      street,
      text: `${opponent} Чек`
    };
  }

  function actionLineForSpot(spot, table) {
    // Tournament-foundation rows describe format/stage/stack concepts rather
    // than a seat-by-seat hand history. Parsing those sentences as poker
    // actions invents an actor (usually BB) and turns any mentioned stack into
    // a fake bet. The full source situation is rendered above the answers, so
    // keep the felt neutral unless the pack supplies an actual action line.
    if (spot.tournamentLab || (spot.table?.heroBb !== undefined && !asArray(spot.heroCards).length)) {
      const explicit = [
        ...asArray(table.actionLine),
        ...asArray(table.actions),
        ...asArray(table.flowSteps),
        ...asArray(spot.actionLine),
        ...asArray(spot.preActionLine)
      ];
      return explicit.length ? normalizePackActionLine(explicit, spot, table) : [];
    }
    // Short-stack resteal / call-vs-jam spots store the live villain in
    // `villainPosition` (+ size in openSizeBb/jamSizeBb) and put the hero's
    // OPTION keys in `actions` (jam/fold/call). Without this, the villain
    // renders folded and the options masquerade as prior action. Synthesize the
    // real villain action so it renders as a live raiser/shover with a chip.
    const villain = cleanText(spot.villainPosition);
    if (villain) {
      const jam = bbNumber(firstText([spot.jamSizeBb]));
      const openSize = bbNumber(firstText([spot.openSizeBb]));
      if (jam > 0) return [`${villain} олл-ин ${jam} BB`];
      if (openSize > 0) return [`${villain} рейз ${openSize} BB`];
      return [`${villain} рейз`];
    }
    const street = firstText([spot.street, table.street, spot.stage], "preflop");
    const direct = [
      ...asArray(table.actionLine),
      ...asArray(table.actions),
      ...asArray(table.flowSteps)
    ];
    if (direct.length) {
      const normalized = normalizePackActionLine(direct, spot, table);
      const inferred = inferredPostflopAction(spot, table, normalized);
      return inferred ? [inferred] : compactDecisionActions(normalized, street);
    }
    const source = [
      ...asArray(spot.actionLine),
      ...asArray(spot.actions),
      ...asArray(spot.flowSteps),
      ...asArray(spot.preActionLine)
    ];
    if (source.length) {
      const normalized = normalizePackActionLine(source, spot, table);
      const inferred = inferredPostflopAction(spot, table, normalized);
      return inferred ? [inferred] : compactDecisionActions(normalized, street);
    }
    const inferred = inferredPostflopAction(spot, table, []);
    if (inferred) return [inferred];
    if (!/^preflop$/i.test(cleanText(street))) return [];
    return unique([spot.tableState, table.line, spot.prompt].filter(Boolean)).slice(0, 4);
  }

  function historyLineForSpot(spot, table, heroPosition, street) {
    const explicit = firstText([spot.historyLine, table.historyLine]);
    if (explicit) return explicit;
    if (/^preflop$/i.test(cleanText(street))) return "";
    const prompt = firstText([spot.question, spot.prompt, spot.tableState]);
    const opponents = decisionOpponentPositions(spot, heroPosition);
    const opponent = opponents[0] || "оппонент";
    const openSize = prompt.match(/(?:оупенрейз|опенрейз)[а-яё\s-]*(\d+(?:[.,]\d+)?)\s*бб/i)?.[1]?.replace(",", ".") || "2";
    const threeBetSize = prompt.match(/3[-\s]?бет[а-яё\s-]*(\d+(?:[.,]\d+)?)\s*бб/i)?.[1]?.replace(",", ".");
    const isolationSize = prompt.match(/изолейт[а-яё\s-]*(\d+(?:[.,]\d+)?)\s*бб/i)?.[1]?.replace(",", ".");
    if (threeBetSize && /колл\s*3[-\s]?бет/i.test(prompt)) {
      return `Префлоп: ${opponent} рейз ${openSize} BB · ${heroPosition} 3-бет ${threeBetSize} BB · ${opponent} колл`;
    }
    if (isolationSize && /лимп/.test(prompt) && /заколлил/.test(prompt)) {
      return `Префлоп: ${opponent} лимп · ${heroPosition} изолейт ${isolationSize} BB · ${opponent} колл`;
    }
    if (spot.mode === "cbet_ip" || spot.mode === "oop_flop" || /оупенрейз|опенрейз/.test(prompt)) {
      return `Префлоп: ${heroPosition} рейз ${openSize} BB · ${opponent} колл`;
    }
    return "";
  }

  function blindCommitment(position, street) {
    if (!/^preflop$/i.test(cleanText(street))) return 0;
    const key = actionSeatKey(position);
    if (key === "SB") return 0.5;
    if (key === "BB") return 1;
    return 0;
  }

  function pressureForActionLine(spot, table, actionLine, heroPosition, street) {
    const explicitCurrentBet = formatOptionalBb(firstText([spot.currentBetBb, spot.currentBet, table.currentBet]));
    const explicitToCall = formatOptionalBb(firstText([spot.toCallBb, spot.toCall, table.toCall]));
    const heroKey = actionSeatKey(heroPosition);
    let currentBet = bbNumber(explicitCurrentBet) || 0;
    let heroCommitted = blindCommitment(heroPosition, street);
    asArray(actionLine).forEach((row) => {
      if (!row || typeof row !== "object") return;
      const amount = actionAmountBb(row);
      if (amount === null || amount <= 0) return;
      const seatKey = actionSeatKey(actionSeat(row, heroPosition), heroPosition);
      if (seatKey === heroKey) heroCommitted = Math.max(heroCommitted, amount);
      currentBet = Math.max(currentBet, amount);
    });
    const computedToCall = Math.max(0, currentBet - heroCommitted);
    return {
      currentBet: explicitCurrentBet || formatOptionalBb(currentBet),
      toCall: explicitToCall || formatOptionalBb(computedToCall)
    };
  }

  function tableForSpot(spot, profile, expectedLabel = "") {
    const table = spot.table && typeof spot.table === "object" ? spot.table : {};
    const heroPosition = firstText([spot.heroPosition, spot.position, table.heroPosition, spot.hero?.position], "Hero");
    const heroCards = normalizeCards(
      asArray(spot.heroCards).length ? spot.heroCards : (asArray(spot.hero).length ? spot.hero : table.heroCards),
      spot.hand
    );
    const boardCards = normalizeCards(
      asArray(spot.boardCards).length ? spot.boardCards : (asArray(spot.board).length ? spot.board : table.boardCards),
      ""
    );
    const street = streetForSpot(spot, table, boardCards);
    const actionLine = actionLineForSpot(spot, table);
    const pressure = pressureForActionLine(spot, table, actionLine, heroPosition, street);
    const historyLine = historyLineForSpot(spot, table, heroPosition, street);
    return {
      seats: seatsForSpot(spot, heroPosition),
      heroPosition,
      heroStack: formatBb(firstText([spot.heroStackBb, spot.stackBb, spot.hero?.stack, table.heroStack, table.heroBb]), "-"),
      pot: formatBb(firstText([spot.potBb, table.pot, spot.pot]), "-"),
      heroCards,
      boardCards,
      street,
      line: firstText([spot.tableState, spot.prompt, spot.question, table.line], profile.subtitle),
      actionLine,
      historyLine,
      activeSeat: heroPosition,
      heroTurn: true,
      decisionLabel: expectedLabel,
      toCall: pressure.toCall,
      currentBet: pressure.currentBet,
      potLabel: firstText([spot.potLabel, spot.street, spot.modeLabel, profile.trainerTitle], "банк"),
      tone: profile.tableTone || "green"
    };
  }

  function boardRanks(cards) {
    return asArray(cards).map((card) => cleanText(card).slice(0, -1).toUpperCase()).filter(Boolean).join("");
  }

  function decisionQuestionForSpot(spot, table, profile) {
    const heroPosition = table.heroPosition || firstText([spot.heroPosition, spot.position], "Hero");
    const heroKey = actionSeatKey(heroPosition);
    const hand = firstText([spot.hand, asArray(table.heroCards).join(" ")]);
    const street = cleanText(table.street).toLowerCase();
    const actions = asArray(table.actionLine).filter((row) => row && typeof row === "object");
    const opponentActions = actions.filter((row) => actionSeatKey(actionSeat(row, heroPosition), heroPosition) !== heroKey);
    if (/^preflop$/i.test(street)) {
      const meaningful = opponentActions.filter((row) => !isFoldActionRow(row));
      if (meaningful.length) {
        const facing = meaningful.slice(-2).map((row) => {
          const seat = actionSeat(row, heroPosition);
          const label = actionLabel(row.action || row.type, spot).toLowerCase();
          const amount = cleanText(row.amount);
          return [seat, label, amount].filter(Boolean).join(" ");
        }).join(" · ");
        return `${heroPosition} с ${hand} · ${facing}`;
      }
      if (opponentActions.length) return `${heroPosition} с ${hand} · до Hero все выбросили`;
    } else {
      const streetName = /river|ривер/.test(street) ? "Ривер" : /turn|терн|тёрн/.test(street) ? "Тёрн" : "Флоп";
      const board = boardRanks(table.boardCards);
      const opponents = decisionOpponentPositions(spot, heroPosition);
      const lastAction = opponentActions[opponentActions.length - 1];
      let context = opponents.length ? `против ${opponents.join(" и ")}` : "";
      if (lastAction) {
        const seat = actionSeat(lastAction, heroPosition);
        const action = cleanText(lastAction.action || lastAction.type).toLowerCase();
        const amount = cleanText(lastAction.amount);
        if (/check|чек/.test(action)) context = `после чека ${seat}`;
        else if (!isFoldActionRow(lastAction)) context = `против ${seat}: ${actionLabel(action, spot).toLowerCase()}${amount ? ` ${amount}` : ""}`;
      }
      return `${streetName}${board ? ` ${board}` : ""} · ${heroPosition} с ${hand}${context ? ` · ${context}` : ""}`;
    }
    return firstTeachingText([spot.question, spot.prompt, spot.tableState, profile.subtitle], "Выбери лучшее действие.");
  }

  function metric(label, value, tone = "neutral") {
    const text = cleanText(value);
    return text ? { label, value: text, tone } : null;
  }

  function metricsForSpot(spot, table) {
    return [
      metric("позиция", table.heroPosition, "good"),
      metric("стек", table.heroStack, "neutral"),
      metric("рука", cleanText(spot.hand) || table.heroCards.join(" "), "neutral"),
      metric("борд", table.boardCards.join(" ").toUpperCase() || cleanText(spot.texture?.join?.(", ")), table.boardCards.length ? "warn" : "neutral"),
      metric("банк", table.pot, "neutral")
    ].filter(Boolean).slice(0, 4);
  }

  function gate(label, value, state = "passed", detail = "") {
    return { label, value: cleanText(value, "-"), state, detail: cleanText(detail) };
  }

  function gatesForSpot(spot, profile, expectedLabel) {
    const sourceRows = sourceRowsForSpot(spot);
    return [
      gate("источник", sourceRows[0] || profile.skillKey, "passed", spot.sourceTitle || spot.sourceLink || ""),
      gate("контекст", firstText([spot.modeLabel, spot.categoryLabel, spot.street, spot.stage], profile.trainerTitle), "passed", firstText([spot.familyLabel, spot.pressureLabel], "")),
      gate("цель", expectedLabel, "open", "закроется после ответа")
    ];
  }

  function optionErrorTag(spot, key, data) {
    if (spot.errorTags && typeof spot.errorTags === "object" && !Array.isArray(spot.errorTags)) return spot.errorTags[key] || "";
    if (Array.isArray(spot.errorTags) && spot.errorTags.length) return spot.errorTags[0];
    return spot.errorTag || data.defaultErrorTag || "trainer_shell_misread";
  }

  function correctKeyForSpot(spot) {
    const explicit = firstText([spot.correctKey, spot.correctAction]);
    if (explicit) return explicit;
    const correctOption = asArray(spot.options).find((option) => option && typeof option === "object" && option.correct);
    return firstText([correctOption?.key, correctOption?.actionType, spot.correctLabel]);
  }

  function genericFeedback(isCorrect, label, spot) {
    if (isCorrect) return firstText([spot.correctFeedback, spot.reason], `Верно: ${label}.`);
    return `Лучше выбрать целевую линию, а не ${label}. Проверь позицию, стек, цену банка и диапазоны.`;
  }

  function optionObjectsForSpot(spot, data) {
    const rawOptions = asArray(spot.options).length ? asArray(spot.options) : asArray(spot.actions);
    const correctKey = correctKeyForSpot(spot);
    const correctLabel = cleanText(spot.correctLabel || spot.actionText);
    const feedbackByAction = spot.feedbackByAction || {};
    const options = (rawOptions.length ? rawOptions : [correctKey || "continue"]).map((option, index) => {
      const object = option && typeof option === "object" ? option : { key: option };
      const key = cleanText(object.key || object.action || object.value || object.actionType || `option_${index + 1}`);
      const rawLabel = cleanText(object.label || object.title || object.text || actionLabel(key, spot, data));
      const label = actionLabel(rawLabel, spot, data);
      const keyMatches = correctKey && key === correctKey;
      const labelMatches = correctLabel && rawLabel === correctLabel;
      const isCorrect = Boolean(object.correct || keyMatches || labelMatches);
      const feedback = firstTeachingText([
        object.feedback,
        feedbackByAction[key],
        isCorrect ? spot.correctFeedback : "",
        isCorrect ? spot.reason : ""
      ], genericFeedback(isCorrect, label, spot));
      return {
        key,
        label,
        tone: isCorrect ? "good" : (index === 0 ? "warn" : "bad"),
        correct: isCorrect,
        feedback,
        errorTag: isCorrect ? "" : optionErrorTag(spot, key, data),
        cue: cleanText(object.cue || object.amount || object.amountBb || object.toBb)
      };
    });
    const correctCount = options.filter((option) => option.correct).length;
    if (correctCount !== 1) {
      options.forEach((option) => {
        option.correct = false;
      });
      const fallback = options.find((option) => option.key === correctKey || option.label === correctLabel) || options[0];
      if (fallback) {
        fallback.correct = true;
        fallback.tone = "good";
        fallback.errorTag = "";
      }
    }
    return options;
  }

  function correctLabelForOptions(options) {
    const correct = options.find((option) => option.correct) || options[0] || {};
    return correct.label || correct.key || "-";
  }

  function labForSpot(spot) {
    return spot.openLab || spot.bbDefenseLab || spot.threeBetLab || spot.squeezeLab || spot.rangeLab ||
      spot.tournamentLab || spot.shortLab || spot.icmLab || spot.examLab || spot.flopLab || spot.isolationLab || {};
  }

  function modelForSpot(spot, expectedLabel, profile) {
    const model = spot.decisionModel || {};
    const lab = labForSpot(spot);
    const coach = lab.coach || {};
    return {
      label: firstText([model.targetLabel, model.label, spot.modeLabel, spot.categoryLabel, profile.trainerTitle], "модель решения"),
      primary: firstTeachingText([model.primaryRule, model.primary, coach.headline, spot.correctFeedback, spot.reason], `Целевая линия: ${expectedLabel}.`),
      reject: firstTeachingText([model.rejectRule, model.reject, coach.reject], "Не выбирай действие по названию руки: сначала проверь позицию, стек, цену и диапазон."),
      exploit: firstTeachingText([model.exploitRule, model.exploit, coach.exploit, spot.rangeHint, spot.squeezeHint, spot.handHint])
    };
  }

  function actionMapForSpot(spot, table, expectedLabel) {
    return [
      { label: "позиция", value: table.heroPosition, state: "good" },
      { label: "рука", value: cleanText(spot.hand) || table.heroCards.join(" ").toUpperCase() || "диапазон", state: "neutral" },
      { label: table.boardCards.length ? "борд" : "банк", value: table.boardCards.length ? table.boardCards.join(" ").toUpperCase() : table.pot, state: table.boardCards.length ? "warn" : "neutral" },
      { label: "линия", value: expectedLabel, state: "good" }
    ].filter((item) => cleanText(item.value));
  }

  function teachingValueKey(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/[-\s]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function isPokerCode(value) {
    const text = cleanText(value);
    return /^(UTG(?:\+1)?|MP|LJ|HJ|CO|BTN|SB|BB|IP|OOP|EP)$/i.test(text) ||
      /^[AKQJT2-9]{2}[so]?$/.test(text) ||
      /^([AKQJT2-9][SHDC]\s*){1,5}$/i.test(text) ||
      /^\d+(?:\.\d+)?\s*BB$/i.test(text) ||
      /^SPR\s*\d/i.test(text);
  }

  function translateTeachingValue(value) {
    const text = cleanText(value);
    if (!text || isPokerCode(text)) return text;
    const key = teachingValueKey(text);
    if (TEACHING_VALUE_TRANSLATIONS[key]) return TEACHING_VALUE_TRANSLATIONS[key];
    if (/^\d+_overcards$/.test(key)) return `${key.slice(0, 1)} оверкарты`;
    return text.replace(/_/g, " ");
  }

  function readableTeachingValue(value) {
    if (Array.isArray(value)) return unique(value.map(readableTeachingValue)).join(", ");
    if (value && typeof value === "object") {
      return readableTeachingValue(firstText([
        value.label,
        value.value,
        value.title,
        value.name,
        value.pos,
        value.position,
        value.key,
        value.action,
        value.actionType
      ]));
    }
    return translateTeachingValue(value);
  }

  function pushTeachingFactor(factors, label, value, detail = "") {
    const text = readableTeachingValue(value);
    const extra = readableTeachingValue(detail);
    if (!text || text === "-") return;
    if (factors.some((item) => item.label === label && item.value === text)) return;
    factors.push({ label, value: text, detail: extra });
  }

  function teachingNote(value) {
    const text = cleanText(value);
    if (!text) return "";
    if (COACH_NOTE_TRANSLATIONS[text]) return COACH_NOTE_TRANSLATIONS[text];
    if (/^reject lines that skip the .+ checkpoint\.?$/i.test(text)) {
      return "Сначала учти давление выплат, потом выбирай линию.";
    }
    if (/^choose an? .+ line before the source target opens\.?$/i.test(text)) {
      return "Сначала выбери линию, потом откроется разбор.";
    }
    if (/\b(json|runtime|telemetry|schema|contract|qualitybar|sourcerow|sourcepack|fftrainer|localstorage)\b/i.test(text)) return "";
    if (/(^|\s)[a-z0-9]+_[a-z0-9_]{3,}/i.test(text)) return "";
    if (/\bdo not\b/i.test(text)) return "";
    if (/\b(?:source|format|quality|answer|summary|checkpoint|canvas|live|price)\s+gate\b/i.test(text)) return "";
    if (/\bcheckpoint\b/i.test(text)) return "";
    return text;
  }

  function firstTeachingText(values, fallback = "") {
    for (const value of asArray(values)) {
      const text = teachingNote(value);
      if (text) return text;
    }
    return fallback;
  }

  function optionTeachingForSpot(spot, options, lab) {
    const rawModel = spot.decisionModel || {};
    const actionRows = [
      ...asArray(lab.actionMap),
      ...asArray(rawModel.actionMap),
      ...asArray(spot.actionMap)
    ];
    return options.map((option) => {
      const key = cleanText(option.key);
      const label = cleanText(option.label);
      const match = actionRows.find((row) => {
        const rowKey = cleanText(row?.key || row?.action || row?.actionType);
        const rowLabel = cleanText(row?.label || row?.value || row?.title);
        return (key && rowKey === key) || (label && rowLabel === label);
      }) || {};
      const note = teachingNote(firstText([
        option.feedback,
        match.reason,
        match.detail,
        match.note,
        match.verdict
      ]));
      return {
        key,
        label,
        correct: Boolean(option.correct || match.correct || match.isTarget),
        note
      };
    }).filter((item) => item.key || item.label || item.note);
  }

  function teachingForSpot(spot, table, expectedLabel, profile, options) {
    const model = spot.decisionModel || {};
    const lab = labForSpot(spot);
    const coach = lab.coach || {};
    const factors = [];
    const board = table.boardCards.length ? table.boardCards.join(" ").toUpperCase() : "";
    const textureGate = lab.textureGate || {};
    const lineGate = lab.lineGate || {};
    const stackGate = lab.stackGate || {};
    const limperGate = lab.limperGate || {};
    const sizeGate = lab.sizeGate || {};
    const categoryGate = lab.categoryGate || {};
    const streetGate = lab.streetGate || {};

    pushTeachingFactor(factors, "позиция", table.heroPosition);
    pushTeachingFactor(factors, "рука", cleanText(spot.hand) || table.heroCards.join(" ").toUpperCase());
    pushTeachingFactor(factors, "борд", board);
    pushTeachingFactor(factors, "текстура", textureGate.cluster || textureGate.tags || spot.texture);
    pushTeachingFactor(factors, "стек", table.heroStack || stackGate.stackBb || stackGate.heroStackBb);
    pushTeachingFactor(factors, "банк", table.pot || spot.potBb);
    pushTeachingFactor(factors, "SPR", lineGate.spr || stackGate.spr || streetGate.spr || spot.spr);
    pushTeachingFactor(factors, "линия", lineGate.modeLabel || lab.modeGate?.label || spot.modeLabel || spot.mode || profile.trainerTitle);
    pushTeachingFactor(factors, "лимперы", limperGate.count || spot.limperCount, limperGate.positions || spot.limperPositions);
    pushTeachingFactor(factors, "сайзинг", sizeGate.targetAmountBb ? formatBb(sizeGate.targetAmountBb) : "", sizeGate.targetAction);
    pushTeachingFactor(factors, "категория", categoryGate.categoryLabel || spot.categoryLabel || model.categoryKey);
    pushTeachingFactor(factors, "улица", streetGate.street || spot.street);
    pushTeachingFactor(factors, "давление", lab.pressureAudit || spot.pressureLabel || spot.pressure);
    pushTeachingFactor(factors, "блокеры", lab.blockerAudit);

    const notes = unique([
      model.primaryRule,
      model.primary,
      coach.headline,
      coach.correctLine,
      coach.firstCheck,
      coach.secondCheck,
      coach.thirdCheck,
      model.rejectRule,
      model.reject,
      coach.avoid,
      model.exploitRule,
      model.exploit,
      coach.exploit,
      spot.rangeHint,
      spot.squeezeHint,
      spot.handHint,
      spot.correctFeedback,
      spot.reason
    ].map(teachingNote)).slice(0, 6);

    return {
      target: expectedLabel,
      notes,
      factors: factors.slice(0, 8),
      options: optionTeachingForSpot(spot, options, lab)
    };
  }

  function tagsForSpot(spot) {
    return unique([
      spot.errorTag,
      ...(Array.isArray(spot.errorTags) ? spot.errorTags : Object.values(spot.errorTags || {})),
      ...(asArray(spot.targetTags)),
      ...(asArray(spot.tags))
    ]);
  }

  function rangeToolForSpot(spot, expectedLabel) {
    const lab = labForSpot(spot);
    const rangeScan = lab.rangeScan || {};
    const counts = rangeScan.counts || {};
    const membership = rangeScan.membership || {};
    if (!counts.active && !counts.open && !counts.effectiveOpen && !counts.limp && !counts.push) return null;
    const stack = Number(spot.stackBb || 0);
    const targetAction = cleanText(spot.correctAction || spot.correctKey || "").toLowerCase();
    const rows = [
      {
        key: "open",
        label: stack === 20 ? "Опен 20 BB" : "Опен",
        count: counts.effectiveOpen ?? counts.open,
        current: membership.open || membership.shortOpen,
        target: targetAction === "open"
      },
      {
        key: "limp",
        label: "Лимп",
        count: counts.limp,
        current: membership.limp,
        target: targetAction === "limp"
      },
      {
        key: "push",
        label: "Пуш 12 BB",
        count: counts.push,
        current: membership.push,
        target: targetAction === "push"
      },
      {
        key: "fold",
        label: "Фолд",
        count: counts.fold,
        current: Boolean(membership.fold),
        target: targetAction === "fold"
      }
    ].filter((row) => Number(row.count) > 0 || row.current || row.target);
    if (!rows.some((row) => row.current)) {
      const targetRow = rows.find((row) => row.target);
      if (targetRow) targetRow.current = true;
    }
    return {
      label: "диапазон",
      title: `${cleanText(spot.position || spot.heroPosition || "") || "позиция"} · ${formatBb(spot.stackBb || stack, "") || "стек"}`,
      hand: cleanText(spot.hand),
      target: expectedLabel,
      activePct: rangeScan.activePct,
      totalCombos: counts.active,
      purpose: "Проверь, попадает ли рука в целевую ветку диапазона для этой позиции и стека.",
      note: "Если ветка и цель расходятся, решение определяется веткой, а не силой названия руки.",
      rows
    };
  }

  function logicNoteText(value) {
    const note = teachingNote(value);
    if (!note) return "";
    if (/иконк[а-яё\s-]*(слева|навед)/i.test(note)) return "";
    return note
      .replace(/^(молодец|правильно|верно|отлично|correct)[.!:\s]+/i, "")
      .replace(/^мы хотим/i, "Нужно")
      .trim();
  }

  function rangeObjectiveNote(range) {
    if (!range) return "";
    const current = asArray(range.rows).find((row) => row.current);
    const target = asArray(range.rows).find((row) => row.target);
    const currentLabel = cleanText(current?.label);
    const targetLabel = cleanText(target?.label);
    if (currentLabel && targetLabel && currentLabel === targetLabel) {
      return `Текущая рука уже в целевой ветке «${currentLabel}». Выбирай линию этой ветки, а не самую заметную кнопку.`;
    }
    if (currentLabel && targetLabel) {
      return `Источник относит руку к ветке «${currentLabel}», а цель спота - «${targetLabel}». Проверь фильтр позиции, стека или формата и не жми по названию ветки автоматически.`;
    }
    if (targetLabel) return `Сначала проверь, попадает ли рука в целевую ветку «${targetLabel}».`;
    return "";
  }

  function logicToolForSpot(spot, table, expectedLabel, profile, options, teaching, model, range) {
    const expected = options.find((option) => option.correct) || options[0] || {};
    const expectedTeaching = asArray(teaching.options).find((row) =>
      (expected.key && row.key === expected.key) ||
      (expected.label && row.label === expected.label)
    ) || {};
    const objectiveNote = firstText([
      rangeObjectiveNote(range),
      logicNoteText(expectedTeaching.note),
      logicNoteText(model.primary),
      logicNoteText(expected.feedback),
      asArray(teaching.notes).map(logicNoteText).find(Boolean)
    ], "Сначала найди решающий признак спота, потом выбирай кнопку.");
    const warning = firstText([
      logicNoteText(model.reject),
      asArray(teaching.notes).map(logicNoteText).find((note) => note && note !== objectiveNote)
    ]);
    const factors = asArray(teaching.factors).length ? teaching.factors : actionMapForSpot(spot, table, expectedLabel);
    return {
      label: "логика",
      title: firstText([spot.title, model.label, profile.trainerTitle], "Логика спота"),
      objective: expectedLabel,
      objectiveNote,
      warning,
      factors: factors.slice(0, 5),
      range
    };
  }

  function toolsForSpot(spot, table, expectedLabel, profile, options, teaching, model) {
    const range = rangeToolForSpot(spot, expectedLabel);
    const logic = logicToolForSpot(spot, table, expectedLabel, profile, options, teaching, model, range);
    return range ? { logic, range } : { logic };
  }

  function normalizeSpot(spot, index, data, profile) {
    const options = optionObjectsForSpot(spot, data);
    const expectedLabel = correctLabelForOptions(options);
    const table = tableForSpot(spot, profile, expectedLabel);
    const model = modelForSpot(spot, expectedLabel, profile);
    const actionMap = actionMapForSpot(spot, table, expectedLabel);
    const teaching = teachingForSpot(spot, table, expectedLabel, profile, options);
    return {
      id: safeId(spot.id || spot.sourceTaskId || `${profile.skillKey}_${index + 1}`),
      title: firstTeachingText([spot.title, spot.sourceTitle, spot.modeLabel, profile.trainerTitle], `Спот ${index + 1}`),
      question: decisionQuestionForSpot(spot, table, profile),
      source: sourceForSpot(spot, profile),
      table,
      metrics: metricsForSpot(spot, table),
      gates: gatesForSpot(spot, profile, expectedLabel),
      model,
      actionMap,
      teaching,
      tools: toolsForSpot(spot, table, expectedLabel, profile, options, teaching, model),
      options,
      errorTag: tagsForSpot(spot)[0] || "trainer_shell_misread",
      tags: tagsForSpot(spot)
    };
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  function bucketKeyForSpot(spot) {
    return cleanText(spot.categoryKey || spot.mode || spot.positionGroup || spot.openerGroup || spot.pressure || spot.sourceRowId || "mixed");
  }

  function roundRobin(items, bucketKey = bucketKeyForSpot) {
    const buckets = new Map();
    items.forEach((item) => {
      const key = bucketKey(item);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(item);
    });
    const keys = [...buckets.keys()];
    const ordered = [];
    let cursor = 0;
    while ([...buckets.values()].some((bucket) => bucket.length)) {
      const bucket = buckets.get(keys[cursor % keys.length]);
      if (bucket?.length) ordered.push(bucket.shift());
      cursor += 1;
    }
    return ordered;
  }

  function rowMatches(spot, row) {
    const rows = sourceRowsForSpot(spot);
    return rows.includes(row);
  }

  function balancedQueue(spots, data, profile) {
    const source = shuffle(spots);
    const sessionLength = Math.min(resolveSessionLength(data, profile), source.length);
    const requiredRows = asArray(data.checkpointGate?.requiredSourceRows);
    const openingBlockSize = Math.min(
      Math.max(0, Number(data.checkpointGate?.openingBlockSize || requiredRows.length || 0)),
      sessionLength
    );
    const picked = [];
    const used = new Set();

    requiredRows.slice(0, openingBlockSize).forEach((row) => {
      const index = source.findIndex((spot) => !used.has(spot.id) && rowMatches(spot, row));
      if (index >= 0) {
        const spot = source[index];
        used.add(spot.id);
        picked.push(spot);
      }
    });

    roundRobin(source.filter((spot) => !used.has(spot.id))).forEach((spot) => {
      if (picked.length < sessionLength) {
        used.add(spot.id);
        picked.push(spot);
      }
    });
    return picked.length ? picked : source.slice(0, sessionLength);
  }

  function orderedSpots(spots, data, profile) {
    const fallbackQueue = balancedQueue(spots, data, profile);
    const contextQueue = root.FFPathPracticeContext?.buildPackQueue?.(spots, {
      fallbackQueue,
      sessionLength: resolveSessionLength(data, profile),
      bucketKey: bucketKeyForSpot
    }) || fallbackQueue;
    const seen = new Set();
    const ordered = [];
    const push = (spot) => {
      const key = spot?.id || spot?.sourceTaskId || JSON.stringify(spot).slice(0, 80);
      if (!spot || seen.has(key)) return;
      seen.add(key);
      ordered.push(spot);
    };
    contextQueue.forEach(push);
    roundRobin(spots).forEach(push);
    return ordered;
  }

  function resolveSessionLength(data, profile) {
    const requested = Number(data.sessionLength || profile.defaultSessionLength || 8);
    const spotCount = asArray(data.spots).length || requested;
    return Math.max(1, Math.min(requested, spotCount));
  }

  function resolvePassScore(data, profile) {
    return Math.max(1, Number(data.passScore || profile.defaultPassScore || 80));
  }

  function qualityBarFor(data, profile) {
    const bar = data.qualityBar && typeof data.qualityBar === "object" ? data.qualityBar : {};
    return {
      id: bar.id || `${profile.skillKey}_shell_quality_v1`,
      label: bar.label || "Скелет v1",
      version: bar.version || data.labVersion || data.version || VERSION,
      skillKey: profile.skillKey
    };
  }

  function packFromData(profile, data) {
    const spots = asArray(data.spots);
    const normalizedSpots = orderedSpots(spots, data, profile)
      .map((spot, index) => normalizeSpot(spot, index, data, profile))
      .filter((spot) => spot.options.filter((option) => option.correct).length === 1);
    return {
      ...COMMON_CONTRACT,
      id: profile.id,
      title: profile.title,
      subtitle: profile.subtitle,
      trainer: {
        key: profile.skillKey,
        title: profile.trainerTitle || profile.title,
        version: data.labVersion || data.version || VERSION
      },
      theme: {
        tone: "analysis",
        accent: profile.accent || "mint",
        table: profile.tableTone || "green"
      },
      qualityBar: qualityBarFor(data, profile),
      sourceRows: sourceRowsForData(data, profile),
      sourcePacks: asArray(data.sourcePacks).flatMap((pack) => asArray(pack.packIds).length ? pack.packIds : [pack.id]).filter(Boolean),
      sessionLength: Math.min(resolveSessionLength(data, profile), normalizedSpots.length),
      passScore: resolvePassScore(data, profile),
      nextRecommendation: profile.nextRecommendation || `${profile.skillKey}.repeat`,
      reviewRoutes: reviewRoutesForProfile(profile),
      spots: normalizedSpots
    };
  }

  function tableDecisionSpot(seat, index) {
    const handByBand = {
      early: ["Ah", "Ks"],
      middle: ["Qs", "Jh"],
      late: ["Kc", "Qd"]
    };
    const options = Object.entries(BAND_LABELS).map(([key, label]) => ({
      key,
      label,
      correct: key === seat.band,
      feedback: key === seat.band
        ? `${seat.position} относится к зоне "${label}": за нами ещё ${seat.band === "early" ? "много" : seat.band === "middle" ? "несколько" : "мало"} игроков.`
        : `Это не зона ${seat.position}. Сначала найди место за столом, затем выбирай диапазон.`,
      errorTag: key === seat.band ? "" : `position_${seat.band}`,
      tone: key === seat.band ? "good" : "warn"
    }));
    return {
      id: `table-decision-${seat.position.toLowerCase().replace(/\W+/g, "-")}`,
      title: `${seat.position}: зона позиции`,
      question: `Герой сидит на ${seat.position}. Какая это зона позиции?`,
      source: { label: "источник", row: "table_decision_position_zones", detail: "позиции за столом" },
      table: {
        seats: TABLE_DECISION_SEATS.map((item) => ({
          label: item.position,
          state: item.position === seat.position ? "hero" : "villain"
        })),
        heroSeatOnRail: true,
        heroPosition: seat.position,
        heroStack: "40 BB",
        pot: "1.5 BB",
        heroCards: handByBand[seat.band],
        boardCards: [],
        potLabel: "префлоп",
        tone: "violet"
      },
      metrics: [
        { label: "позиция", value: seat.position, tone: "good" },
        { label: "зона", value: BAND_LABELS[seat.band], tone: "good" }
      ],
      gates: [
        { label: "стол", value: "9-max", state: "passed", detail: "блайнды не считаем как обычные зоны" },
        { label: "цель", value: BAND_LABELS[seat.band], state: "open", detail: "закроется после ответа" }
      ],
      model: {
        label: "позиция",
        primary: `${seat.position} - это ${BAND_LABELS[seat.band]} позиция.`,
        reject: "Не выбирай по силе руки: в этом упражнении решает только место за столом.",
        exploit: "Когда зона позиции определена быстро, дальше проще выбрать корректный префлоп-диапазон."
      },
      actionMap: [
        { label: "место", value: seat.position, state: "good" },
        { label: "решение", value: BAND_LABELS[seat.band], state: "good" },
        { label: "фокус", value: "позиция", state: "neutral" }
      ],
      options,
      errorTag: `position_${seat.band}`,
      tags: [`position_${seat.band}`]
    };
  }

  function tableDecisionPack(profile) {
    const spots = TABLE_DECISION_SEATS.map(tableDecisionSpot);
    return {
      ...COMMON_CONTRACT,
      id: profile.id,
      title: profile.title,
      subtitle: profile.subtitle,
      trainer: { key: profile.skillKey, title: profile.trainerTitle, version: VERSION },
      theme: { tone: "analysis", accent: profile.accent, table: profile.tableTone },
      qualityBar: { id: "table_decision_shell_quality_v1", label: "Скелет v1", skillKey: profile.skillKey },
      sourceRows: ["table_decision_position_zones"],
      sessionLength: profile.defaultSessionLength,
      passScore: profile.defaultPassScore,
      nextRecommendation: profile.nextRecommendation,
      reviewRoutes: reviewRoutesForProfile(profile),
      spots
    };
  }

  function activeWeakTags() {
    const counts = {};
    const progress = root.FFPlayerProgress;
    const store = progress?.readStore?.() || {};
    const activeId = store.activeProfileId || "guest";
    const skills = store.profiles?.[activeId]?.skills || store.skills || {};
    Object.values(skills).forEach((skill) => {
      asArray(skill?.weakErrorTags).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; });
      Object.entries(skill?.errorCounts || {}).forEach(([tag, count]) => { counts[tag] = (counts[tag] || 0) + Number(count || 1); });
    });
    asArray(root.FFTrainerEvents?.readArchive?.()).forEach((event) => {
      if (event.trainer?.key === "review") return;
      asArray(event.result?.weakErrorTags).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; });
      Object.entries(event.result?.errorCounts || {}).forEach(([tag, count]) => { counts[tag] = (counts[tag] || 0) + Number(count || 1); });
      if (event.decision?.correct === false) asArray(event.decision.tags || event.decision.errorTags).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; });
    });
    return Object.entries(counts)
      .filter(([tag]) => cleanText(tag))
      .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
      .slice(0, 3);
  }

  function routeForSkill(skillKey) {
    const route = root.FFLeakTaxonomy?.routeForSkill?.(skillKey);
    return route || { skillKey, target: "poker-review-trainer.html", title: "повтор" };
  }

  function reviewSpot([tag, count], index) {
    const skillKey = root.FFLeakTaxonomy?.skillForTag?.(tag) || "exam";
    const route = routeForSkill(skillKey);
    const cleanTag = cleanText(tag, "low_volume");
    const correctKey = `repeat_${skillKey}`;
    return {
      id: `review-${safeId(cleanTag)}-${index + 1}`,
      title: `Повтор: ${cleanTag.replace(/_/g, " ")}`,
      question: `В прогрессе чаще всего всплыл тег "${cleanTag.replace(/_/g, " ")}". Куда отправить повтор?`,
      source: { label: "источник", row: "trainer_progress_weak_tags", detail: `${count} сигналов` },
      table: {
        seats: [
          { label: "CO", state: "folded" },
          { label: "BTN", state: "hero" },
          { label: "SB", state: "blind" },
          { label: "BB", state: "blind" }
        ],
        heroPosition: "BTN",
        heroStack: `${Math.max(10, 40 - index * 5)} BB`,
        pot: `${count || 1} тег`,
        heroCards: ["As", "Kd"],
        boardCards: [],
        potLabel: "фокус",
        tone: "slate"
      },
      metrics: [
        { label: "тег", value: cleanTag.replace(/_/g, " "), tone: "warn" },
        { label: "повтор", value: route.title || route.label || skillKey, tone: "good" }
      ],
      gates: [
        { label: "сигнал", value: cleanTag, state: "passed", detail: `${count || 1} раз` },
        { label: "цель", value: route.title || route.label || skillKey, state: "open", detail: "закроется после ответа" }
      ],
      model: {
        label: "review",
        primary: `Повтор должен идти в "${route.title || route.label || skillKey}", потому что этот тренажёр закрывает выбранный слабый тег.`,
        reject: "Не отправляй игрока в случайный тренажёр: review должен выбирать точный следующий повтор.",
        exploit: "Если тегов мало, контрольный mixed exam лучше, чем ручное ожидание."
      },
      actionMap: [
        { label: "слабое место", value: cleanTag.replace(/_/g, " "), state: "warn" },
        { label: "маршрут", value: route.title || route.label || skillKey, state: "good" },
        { label: "объём", value: `${count || 1}`, state: "neutral" }
      ],
      options: [
        {
          key: correctKey,
          label: route.title || route.label || "Целевой повтор",
          correct: true,
          tone: "good",
          feedback: "Верно. Review выбирает тренажёр под конкретный повторяющийся тег."
        },
        {
          key: "random_exam",
          label: "Случайный экзамен",
          correct: false,
          tone: "warn",
          errorTag: "review_random_route",
          feedback: "Случайный экзамен не закрывает конкретный слабый тег так же точно."
        },
        {
          key: "manual_wait",
          label: "Ждать ручной разбор",
          correct: false,
          tone: "bad",
          errorTag: "review_manual_wait",
          feedback: "Ручной разбор не нужен, когда уже есть конкретный тренажёр для повтора."
        }
      ],
      errorTag: cleanTag,
      tags: [cleanTag]
    };
  }

  function reviewPack(profile) {
    const tags = activeWeakTags();
    const source = tags.length ? tags : [["low_volume", 1], ["exam_control", 1], ["review_route", 1]];
    const spots = source.map(reviewSpot);
    return {
      ...COMMON_CONTRACT,
      id: profile.id,
      title: profile.title,
      subtitle: profile.subtitle,
      trainer: { key: profile.skillKey, title: profile.trainerTitle, version: VERSION },
      theme: { tone: "analysis", accent: profile.accent, table: profile.tableTone },
      qualityBar: { id: "review_shell_quality_v1", label: "Скелет v1", skillKey: profile.skillKey },
      sourceRows: ["trainer_progress_weak_tags"],
      sessionLength: Math.min(profile.defaultSessionLength, spots.length),
      passScore: profile.defaultPassScore,
      nextRecommendation: profile.nextRecommendation,
      reviewRoutes: reviewRoutesForProfile(profile),
      spots
    };
  }

  function reviewRoutesForProfile(profile) {
    const route = routeForSkill(profile.skillKey);
    return [{
      label: `Повторить: ${profile.title}`,
      href: route?.target || `${root.location?.pathname || ""}`,
      reason: "закрепить текущую тему на общем скелете",
      targetTags: []
    }];
  }

  function waitForData(profile) {
    if (!profile.dataKey) return Promise.resolve({});
    const current = root[profile.dataKey];
    if (current && !current.loading && asArray(current.spots).length) return Promise.resolve(current);
    const ready = root[profile.readyKey];
    if (ready && typeof ready.then === "function") {
      return ready.then(() => root[profile.dataKey] || {});
    }
    return new Promise((resolve, reject) => {
      const timeout = root.setTimeout(() => {
        root.removeEventListener?.("ff-trainer-data:ready", onReady);
        const fallback = root[profile.dataKey] || {};
        if (asArray(fallback.spots).length) resolve(fallback);
        else reject(new Error(`Не удалось загрузить данные ${profile.dataKey}`));
      }, DATA_READY_TIMEOUT_MS);
      function onReady(event) {
        if (event?.detail?.key !== profile.dataKey) return;
        root.clearTimeout(timeout);
        root.removeEventListener?.("ff-trainer-data:ready", onReady);
        resolve(event.detail.data || root[profile.dataKey] || {});
      }
      root.addEventListener?.("ff-trainer-data:ready", onReady);
    });
  }

  function packForProfile(profile, data) {
    if (profile.synthetic === "table_decision") return tableDecisionPack(profile);
    if (profile.synthetic === "review") return reviewPack(profile);
    return packFromData(profile, data || {});
  }

  function renderError(rootNode, error, profile) {
    rootNode.innerHTML = `
      <section class="ff-shell ff-shell-theme-analysis ff-shell-accent-amber" data-shell-density="lab">
        <div class="ff-shell-grid">
          <section class="ff-shell-board">
            <header class="ff-shell-head">
              <div>
                <span class="ff-shell-kicker">ошибка данных</span>
                <h1>${profile?.title || "Тренажёр"}</h1>
                <p>Не удалось собрать пакет для общего скелета.</p>
              </div>
            </header>
            <div class="ff-shell-training-dock">
              <article class="ff-shell-practice-card is-result">
                <span>Что случилось</span>
                <b>${cleanText(error?.message || error, "неизвестная ошибка")}</b>
                <p>Старые данные не изменены; нужно поправить адаптер или источник спотов.</p>
              </article>
            </div>
          </section>
        </div>
      </section>
    `;
  }

  async function mount(rootOrSelector, profileId, options = {}) {
    const rootNode = typeof rootOrSelector === "string" ? document.querySelector(rootOrSelector) : rootOrSelector;
    if (!rootNode) throw new Error("FFTrainerShellAdapter.mount: нужен root");
    const profile = PROFILES[profileId] || PROFILES[rootNode.dataset.shellProfile];
    if (!profile) throw new Error(`Неизвестный профиль shell: ${profileId || rootNode.dataset.shellProfile}`);
    try {
      const data = await waitForData(profile);
      const pack = packForProfile(profile, data);
      if (!root.FFTrainerShell?.mount) throw new Error("FFTrainerShell.mount не загружен");
      rootNode.dataset.shellProfile = profileId;
      root.__ffTrainerShellPack = pack;
      return root.FFTrainerShell.mount(rootNode, {
        pack,
        packs: [pack],
        lab: Boolean(options.lab),
        showTech: Boolean(options.showTech),
        previewDensity: options.previewDensity || "trainer"
      });
    } catch (error) {
      renderError(rootNode, error, profile);
      throw error;
    }
  }

  function autoMount() {
    document.querySelectorAll("[data-ff-shell-root][data-shell-profile]").forEach((node) => {
      if (node.__ffTrainerShellAdapterMounted) return;
      node.__ffTrainerShellAdapterMounted = true;
      mount(node, node.dataset.shellProfile, {
        lab: node.dataset.shellLab === "true",
        showTech: node.dataset.shellTech === "true",
        previewDensity: node.dataset.shellDensity || "trainer"
      }).catch((error) => {
        console.error(error);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount, { once: true });
  } else {
    autoMount();
  }

  root.FFTrainerShellAdapter = Object.freeze({
    VERSION,
    PROFILES,
    mount,
    packForProfile,
    normalizeSpot
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
