// Core deck, packs, seating, chip accounting, and shared bot profile helpers. Loaded before simulator-engine.js facade.
  const root = typeof window !== "undefined" ? window : globalThis;
  const BOT_STRATEGY_PROFILE = root.PokerSimulatorBotStrategyProfile && typeof root.PokerSimulatorBotStrategyProfile === "object"
    ? root.PokerSimulatorBotStrategyProfile
    : {};
  const BOT_PACK_PROFILE = root.PokerSimulatorBotPackProfile && typeof root.PokerSimulatorBotPackProfile === "object"
    ? root.PokerSimulatorBotPackProfile
    : {};

  const TABLE_COUNTS = [1, 2, 4];
  const PACK_SCHEMA_VERSION = 1;
  const BOT_PACK_SCHEMA_VERSION = 2;
  const DONK_BET_FREQUENCY = 0.06;
  const COACH_15_11_SOURCE = "docs/methodics-15-11.md";
  const LOW_ACE_3BET_SUITS = ["A5s", "A4s", "A3s", "A2s"];
  const MAX_SINGLE_OPEN_TO_BB = 3.5;
  const MAX_SINGLE_OPEN_RAISE_SIZE_BB = 2.5;
  const ACTION_ANIMATION_WINDOW = 24;
  const BET_ANIMATION_WINDOW = 16;
  // Shared float-comparison tolerance for BB-denominated chip amounts. Stacks/bets
  // sit on a 0.1 BB grid (blinds/antes), so 0.05 BB = half a grid step: enough to
  // absorb rounding noise in "matched / all-in / X > Y" checks without ever masking
  // a real 0.1 BB difference. Single source of truth for the epsilons that were
  // previously hardcoded as bare 0.05 across preflop/lobby round resolution.
  const EPSILON_BB = 0.05;
  const BOT_MICRO_STACK_MAX_BB = 8;
  const BOT_OPEN_PUSH_FOLD_MAX_BB = 14;
  const BOT_FACING_PUSH_FOLD_MAX_BB = 20;
  const DEFAULT_STRATEGY_ANTE_BB = 0.1;
  const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9];
  const EMPTY_BOT_STRATEGY_MODELS = Object.freeze([]);
  const BOT_STRATEGY_FILTER_CACHE_MAX_ENTRIES = 256;
  const BOT_STRATEGY_SIZE_LABELS = Object.freeze({
    2: "hu",
    3: "3max",
    4: "4max",
    5: "5max",
    6: "6max",
    7: "7max",
    8: "8max",
    9: "9max"
  });
  const BOT_STRATEGY_SIZE_PRODUCTION_OVERLAYS = Object.freeze({
    standard: {
      2: { openFrequency: 0.035, sbOpenFrequency: 0.08, defenseFrequency: 0.025, threeBetFrequency: 0.018, cbet: 0.02, barrel: 0.01, floatChance: 0.025, sizeBias: -0.025, smallBetFrequency: 0.025 },
      3: { openFrequency: 0.025, sbOpenFrequency: 0.06, defenseFrequency: 0.018, threeBetFrequency: 0.014, cbet: 0.016, barrel: 0.006, floatChance: 0.018, sizeBias: -0.018, smallBetFrequency: 0.018 },
      4: { openFrequency: 0.018, sbOpenFrequency: 0.045, defenseFrequency: 0.012, threeBetFrequency: 0.01, cbet: 0.012, barrel: 0.004, floatChance: 0.012, sizeBias: -0.012, smallBetFrequency: 0.012 },
      5: { openFrequency: 0.012, sbOpenFrequency: 0.03, defenseFrequency: 0.008, threeBetFrequency: 0.006, cbet: 0.008, floatChance: 0.008 },
      6: { openFrequency: 0.006, sbOpenFrequency: 0.018, defenseFrequency: 0.004, threeBetFrequency: 0.004, cbet: 0.004 },
      7: { openFrequency: 0, sbOpenFrequency: 0.01, defenseFrequency: -0.004, threeBetFrequency: 0.002 },
      8: { openFrequency: -0.004, sbOpenFrequency: 0.006, defenseFrequency: -0.006, threeBetFrequency: 0 },
      9: { openFrequency: -0.008, sbOpenFrequency: 0.004, defenseFrequency: -0.008, threeBetFrequency: -0.002 }
    },
    weak: {
      2: { openFrequency: 0.045, sbOpenFrequency: 0.11, defenseFrequency: 0.055, threeBetFrequency: -0.028, topPairBet: -0.018, weakPairBet: -0.012, topPairMaxPrice: 0.04, weakPairMaxPrice: 0.05, comboDrawMaxPrice: 0.03, drawMaxPrice: 0.035, floatChance: 0.04, heroCallChance: 0.035 },
      3: { openFrequency: 0.036, sbOpenFrequency: 0.085, defenseFrequency: 0.04, threeBetFrequency: -0.024, topPairBet: -0.014, weakPairBet: -0.01, topPairMaxPrice: 0.032, weakPairMaxPrice: 0.04, comboDrawMaxPrice: 0.024, drawMaxPrice: 0.028, floatChance: 0.032, heroCallChance: 0.028 },
      4: { openFrequency: 0.028, sbOpenFrequency: 0.065, defenseFrequency: 0.03, threeBetFrequency: -0.02, topPairBet: -0.012, topPairMaxPrice: 0.026, weakPairMaxPrice: 0.032, comboDrawMaxPrice: 0.02, drawMaxPrice: 0.022, floatChance: 0.026, heroCallChance: 0.024 },
      5: { openFrequency: 0.02, sbOpenFrequency: 0.045, defenseFrequency: 0.022, threeBetFrequency: -0.016, topPairMaxPrice: 0.018, weakPairMaxPrice: 0.024, comboDrawMaxPrice: 0.014, drawMaxPrice: 0.016, floatChance: 0.02, heroCallChance: 0.018 },
      6: { openFrequency: 0.012, sbOpenFrequency: 0.028, defenseFrequency: 0.014, threeBetFrequency: -0.012, topPairMaxPrice: 0.012, weakPairMaxPrice: 0.016, floatChance: 0.014, heroCallChance: 0.012 },
      7: { openFrequency: 0.006, sbOpenFrequency: 0.018, defenseFrequency: 0.008, threeBetFrequency: -0.01, weakPairMaxPrice: 0.01, floatChance: 0.01, heroCallChance: 0.008 },
      8: { openFrequency: 0.002, sbOpenFrequency: 0.012, defenseFrequency: 0.004, threeBetFrequency: -0.008, floatChance: 0.006, heroCallChance: 0.006 },
      9: { openFrequency: -0.004, sbOpenFrequency: 0.008, defenseFrequency: 0, threeBetFrequency: -0.008, floatChance: 0.004, heroCallChance: 0.004 }
    }
  });
  const BOT_STRATEGY_STACK_BUCKETS = Object.freeze({
    micro: Object.freeze({ key: "micro", label: "micro", minStackDepthBb: null, maxStackDepthBb: 8 }),
    short: Object.freeze({ key: "short", label: "short", minStackDepthBb: 8.1, maxStackDepthBb: 24 }),
    mid: Object.freeze({ key: "mid", label: "mid", minStackDepthBb: 24.1, maxStackDepthBb: 60 }),
    deep: Object.freeze({ key: "deep", label: "deep", minStackDepthBb: 60.1, maxStackDepthBb: 150 }),
    ultra: Object.freeze({ key: "ultra", label: "ultra", minStackDepthBb: 150.1, maxStackDepthBb: null })
  });
  const BOT_STRATEGY_STACK_PRODUCTION_OVERLAYS = Object.freeze({
    standard: {
      micro: { openFrequency: -0.018, sbOpenFrequency: 0.01, defenseFrequency: -0.014, threeBetFrequency: 0.012, jamFrequency: 0.08, sizeBias: -0.03, smallBetFrequency: 0.02 },
      short: { openFrequency: -0.01, sbOpenFrequency: 0.006, defenseFrequency: -0.008, threeBetFrequency: 0.008, jamFrequency: 0.045, sizeBias: -0.018, smallBetFrequency: 0.012 },
      mid: { openFrequency: 0.002, defenseFrequency: 0.002, threeBetFrequency: 0.002 },
      deep: {},
      ultra: { openFrequency: -0.006, defenseFrequency: -0.004, threeBetFrequency: -0.004, overbetFrequency: -0.02, jamFrequency: -0.035, smallBetFrequency: 0.012 }
    },
    weak: {
      micro: { openFrequency: -0.03, sbOpenFrequency: 0.014, defenseFrequency: 0.018, threeBetFrequency: -0.018, jamFrequency: -0.035, topPairMaxPrice: 0.025, weakPairMaxPrice: 0.035, comboDrawMaxPrice: 0.02, drawMaxPrice: 0.025, heroCallChance: 0.025 },
      short: { openFrequency: -0.018, sbOpenFrequency: 0.01, defenseFrequency: 0.014, threeBetFrequency: -0.014, jamFrequency: -0.02, topPairMaxPrice: 0.018, weakPairMaxPrice: 0.026, comboDrawMaxPrice: 0.014, drawMaxPrice: 0.018, heroCallChance: 0.018 },
      mid: { openFrequency: 0.004, defenseFrequency: 0.006, threeBetFrequency: -0.004, heroCallChance: 0.006 },
      deep: {},
      ultra: { openFrequency: 0.012, defenseFrequency: 0.014, threeBetFrequency: -0.01, topPairMaxPrice: 0.02, weakPairMaxPrice: 0.03, comboDrawMaxPrice: 0.018, drawMaxPrice: 0.022, heroCallChance: 0.02 }
    }
  });
  const RANKS_HIGH = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  const SUITS = ["h", "d", "c", "s"];
  const RANK_VALUES = { "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
  const HAND_NAMES = ["старшая карта", "пара", "две пары", "сет", "стрит", "флеш", "фулл-хаус", "каре", "стрит-флеш"];
  const OPPONENT_NAMES = ["Nika", "Max", "Ivan", "Sara", "Den", "Mia", "Leo", "Ann"];
  // Ironic nicknames keyed by the bot's behavioural style (the same axis the
  // bot-inspector surfaces: fish / station / nit / aggro / passive / reg). The
  // name telegraphs how the seat plays, while still staying short enough for the
  // seat nameplate. Pools are intentionally much deeper than max-seat count:
  // `pickBotNickname` starts from a deterministic table/hand/seat seed, so fresh
  // tables do not always show the same first few names, but names still remain
  // unique within a table and stable across tournament carryover.
  const BOT_NICKNAMES = Object.freeze({
    fish: [
      "Карась", "Окунь", "Лещ", "Сазан", "Гольян", "Тюлень",
      "Кит", "Краб", "Донат", "Турист", "Лошок", "Лудик",
      "Чайник", "Зевака", "Зелень", "Лимпер", "Тильт", "Слив",
      "Промах", "Шара", "Фарт", "Авось", "Дрова", "Малёк",
      "Пузырь", "Балбес", "Зомби", "Балда", "Лапоть", "Жор",
      "Лопух", "Кошель", "Мякиш", "Карп", "Лошара", "Дятел"
    ],
    station: [
      "Липкий", "Якорь", "Магнит", "Клей", "Болото", "Пиявка",
      "Залип", "Репей", "Смола", "Патока", "Вязкий", "Тягун",
      "Глина", "Прилип", "Грузило", "Присос", "Цепкий", "Скотч",
      "Трясина", "Жвачка", "Спрут", "Хватка", "Зацеп", "Сироп",
      "Минога", "Хомут", "Затор", "Невод", "Дозвон", "Коллер",
      "Стена", "Тина", "Гудрон", "Дёготь", "Полип", "Смолка"
    ],
    nit: [
      "Скала", "Сейф", "Замок", "Касса", "Гранит", "Бункер",
      "Жмот", "Кащей", "Скряга", "Тиски", "Грош", "Гайка",
      "Засов", "Утёс", "Камень", "Аскет", "Ригель", "Зажим",
      "Броня", "Щит", "Окоп", "Форт", "Редут", "Скупой",
      "Сухарь", "Айсберг", "Валун", "Жадюга", "Глыба", "Страж",
      "Жадина", "Скупец", "Болт", "Сундук", "Латы", "Бетон"
    ],
    aggro: [
      "Ураган", "Маньяк", "Викинг", "Шторм", "Смерч", "Дизель",
      "Турбо", "Напор", "Таран", "Гроза", "Вулкан", "Бомбер",
      "Молот", "Рубака", "Зверь", "Псих", "Огонь", "Ярость",
      "Вихрь", "Пресс", "Дикарь", "Хищник", "Цунами", "Залп",
      "Атака", "Драйв", "Кураж", "Рывок", "Буян", "Пекло",
      "Удар", "Шквал", "Напалм", "Бык", "Бугай", "Лавина"
    ],
    passive: [
      "Тихоня", "Соня", "Зритель", "Молчун", "Спящий", "Тень",
      "Штиль", "Мямля", "Вата", "Дрёма", "Кисель", "Улитка",
      "Сурок", "Овца", "Тишь", "Фантом", "Эхо", "Туман",
      "Болван", "Лежень", "Рохля", "Затвор", "Покой", "Дзен",
      "Зефир", "Тюфяк", "Сонный", "Лентяй", "Лежак", "Кулёма",
      "Храпун", "Пень", "Овощ", "Кокон", "Вялый", "Сачок"
    ],
    reg: [
      "Солвер", "Робот", "GTO", "Чарт", "Баланс", "Нода",
      "Эквити", "Нэш", "Граф", "Матан", "Спектр", "Блокер",
      "Комбо", "Регуляр", "Линия", "Таймер", "Сетка", "Вектор",
      "Контур", "Профи", "Логик", "Модель", "Расчёт", "Чёткий",
      "Эталон", "Профит", "Сигма", "Индекс", "Квант", "Призма",
      "График", "Велью", "Анализ", "Метод", "Схема", "Спот"
    ]
  });
  const BOT_ARCHETYPES = {
    fish: {
      key: "fish",
      difficulty: "easy",
      style: "fish",
      label: "fish",
      preflop: { looseOpen: 0.2, limp: 0.16, threeBet: -0.1, continue: 0.22, curiosity: 0.22, pushFold: -0.1 },
      postflop: { bet: 1.08, air: 1.18, call: 0.18, float: 0.2, raise: 0.82, donk: 1.7 }
    },
    reg: {
      key: "reg",
      difficulty: "standard",
      style: "reg",
      label: "reg",
      preflop: { looseOpen: 0, limp: 0, threeBet: 0.02, continue: 0, curiosity: 0, pushFold: 0 },
      postflop: { bet: 1, air: 1, call: 0, float: 0, raise: 1, donk: 1 }
    },
    nit: {
      key: "nit",
      difficulty: "pro",
      style: "nit",
      label: "nit",
      preflop: { looseOpen: 0, limp: -0.08, threeBet: -0.18, continue: -0.2, curiosity: -0.14, pushFold: -0.08 },
      postflop: { bet: 0.78, air: 0.42, call: -0.16, float: -0.14, raise: 0.72, donk: 0.35 }
    },
    station: {
      key: "station",
      difficulty: "easy",
      style: "station",
      label: "station",
      preflop: { looseOpen: 0.08, limp: 0.24, threeBet: -0.12, continue: 0.16, curiosity: 0.2, pushFold: -0.06 },
      postflop: { bet: 0.78, air: 0.55, call: 0.22, float: 0.24, raise: 0.72, donk: 1.15 }
    },
    aggro: {
      key: "aggro",
      difficulty: "standard",
      style: "aggro",
      label: "aggro",
      preflop: { looseOpen: 0.1, limp: -0.12, threeBet: 0.18, continue: 0.08, curiosity: 0.1, pushFold: 0.04 },
      postflop: { bet: 1.24, air: 1.45, call: 0.02, float: 0.1, raise: 1.22, donk: 1.2 }
    }
  };
  // Bot Difficulty v0: `single` is the hidden-archetype default, not one
  // generic bot. `mixed` stays a legacy alias of the same roster; difficulty
  // and botStrategyPool select strategy-model tiers independently.
  const BOT_ARCHETYPE_ROSTERS = {
    single: ["fish", "reg", "nit", "station", "aggro", "reg", "nit", "fish"],
    mixed: ["fish", "reg", "nit", "station", "aggro", "reg", "nit", "fish"],
    soft: ["fish", "station", "fish", "reg", "nit", "station", "fish", "aggro"],
    tough: ["reg", "nit", "aggro", "reg", "nit", "aggro", "reg", "station"]
  };
  // Stakes Difficulty v1: `stakesLevel` (micro/mid/high) is the player-facing
  // composition driver. It picks EXACT per-role seat counts (top / mid reg /
  // passive fish / spew fish / nit reg) rather than the legacy probabilistic
  // tier weights, so the table reads like a real micro / mid / high game.
  // Each role resolves to a specific calibrated strategy model; the bb/100 each
  // role bleeds against the top pool is tuned in bot-strategy-profile.js and
  // verified by scripts/simulator-stakes-composition-smoke.mjs.
  const STAKES_ROLE_MODELS = Object.freeze({
    // top => whole certified top tier (drawn directly, never id-pinned).
    mid: ["reg-balanced", "reg-aggro-light"],
    nitReg: ["reg-tight-value"],
    fishPassive: ["weak-calling-station", "weak-fit-or-fold"],
    fishSpew: ["weak-spew"]
  });
  const STAKES_LEVELS = Object.freeze(["micro", "mid", "high"]);
  const THIRD_LEAGUE_BOT_OVERLAYS = Object.freeze([
    {
      key: "level10-open-first",
      levelBand: "L10",
      source: "docs/poker-skill-knowledge.md#third-league-leak-taxonomy",
      focusSkill: "open_first",
      weakTags: ["missed_open", "loose_open", "missed_sb_open"],
      preflop: { threeBet: -0.02, looseOpen: 0.04, continue: 0 },
      postflop: { bet: 1, air: 1, call: 1 }
    },
    {
      key: "level10-bb-defense",
      levelBand: "L10",
      source: "docs/poker-skill-knowledge.md#third-league-leak-taxonomy",
      focusSkill: "bb_defense",
      weakTags: ["bb_overfold", "bb_overdefend", "missed_bvb_isolation"],
      preflop: { threeBet: -0.05, looseOpen: 0, continue: -0.02 },
      postflop: { bet: 0.96, air: 0.9, call: 0.94 }
    },
    {
      key: "level13-vs-3bet",
      levelBand: "L13",
      source: "docs/poker-skill-knowledge.md#third-league-leak-taxonomy",
      focusSkill: "vs_3bet",
      weakTags: ["bad_3bet_defense", "overfold_vs_3bet", "loose_3bet"],
      preflop: { threeBet: 0.1, looseOpen: 0, continue: -0.04 },
      postflop: { bet: 1.02, air: 1.05, call: 0.96 }
    },
    {
      key: "level13-isolation",
      levelBand: "L13",
      source: "docs/player-path-trainer-porting.md#trainer-family-map",
      focusSkill: "isolation",
      weakTags: ["missed_iso", "loose_iso", "wrong_iso_size", "bad_overlimp"],
      preflop: { threeBet: 0, looseOpen: 0.06, continue: 0.02 },
      postflop: { bet: 1.08, air: 1.04, call: 0.98 }
    },
    {
      key: "level13-short-stack",
      levelBand: "L13",
      source: "docs/poker-skill-knowledge.md#pack-generation-contract",
      focusSkill: "short",
      weakTags: ["missed_jam", "loose_jam", "bad_call_vs_jam", "missed_resteal"],
      preflop: { threeBet: 0.04, looseOpen: -0.03, continue: 0.04, pushFold: 0.08 },
      postflop: { bet: 0.94, air: 0.88, call: 0.92 }
    },
    {
      key: "level13-postflop-aggressor",
      levelBand: "L13",
      source: "docs/poker-skill-knowledge.md#pack-generation-contract",
      focusSkill: "flop",
      weakTags: ["missed_cbet", "wrong_cbet_size", "loose_multiway_bet", "weak_oop_continue"],
      preflop: { threeBet: 0.02, looseOpen: 0, continue: 0 },
      postflop: { bet: 1.12, air: 1.16, call: 0.92, donk: 0.82 }
    }
  ]);
  const POSITION_SETS = {
    2: ["SB", "BB"],
    3: ["BTN", "SB", "BB"],
    4: ["CO", "BTN", "SB", "BB"],
    5: ["HJ", "CO", "BTN", "SB", "BB"],
    6: ["UTG", "HJ", "CO", "BTN", "SB", "BB"],
    7: ["UTG", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
    8: ["UTG", "UTG+1", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
    9: ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"]
  };
  const CLOCKWISE_POSITION_SETS = {
    2: ["SB", "BB"],
    3: ["BTN", "SB", "BB"],
    4: ["BTN", "SB", "BB", "CO"],
    5: ["BTN", "SB", "BB", "HJ", "CO"],
    6: ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
    7: ["BTN", "SB", "BB", "UTG", "LJ", "HJ", "CO"],
    8: ["BTN", "SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO"],
    9: ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]
  };

  const PLAYABLE_COMBOS = [
    "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
    "AKs", "AQs", "AJs", "ATs", "A9s", "A5s", "A4s", "A3s", "A2s",
    "KQs", "KJs", "KTs", "QJs", "QTs", "JTs", "T9s", "98s", "87s", "76s",
    "AKo", "AQo", "AJo", "KQo", "KJo", "QJo"
  ];

  const FOLD_COMBOS = ["72o", "83o", "94o", "T3o", "J4o", "Q5o", "K2o", "62s", "92s", "T2s", "J3s", "84o", "53o"];
  const PREFLOP_CHARTS = {
    easy: {
      continueVsRaise: ["33+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "A5o+", "KTo+", "QTo+", "JTo", "T9o"],
      callJam: ["44+", "A8s+", "KTs+", "QJs", "A9o+", "KQo"],
      shortContinue: ["22+", "A2s+", "K5s+", "Q7s+", "J7s+", "T7s+", "97s+", "86s+", "A5o+", "KTo+", "QTo+", "JTo"]
    },
    standard: {
      continueVsRaise: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AQo+", "KQo"],
      callJam: ["66+", "ATs+", "KQs", "AJo+", "KQo"],
      shortContinue: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "A8o+", "KTo+", "QJo"]
    },
    pro: {
      continueVsRaise: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
      // Nash-style call vs a preflop shove: small pairs (22-44) are standard set-mining/coinflip
      // calls and suited wheels/aces (A2s-A8s) play off methodic 15-11 ("A2-A5s почти всегда" +
      // suited Ax coverage) — closing pro's over-fold-vs-jam leak. SYMMETRIC with grading:
      // gradePreflopHeroDecision/heroFacingAllIn read this same callJam, so the Hero good-call zone
      // widens by exactly the same combos (invariant "bot continue ≠ hero leak" holds by construction).
      callJam: ["22+", "A2s+", "KJs+", "QJs", "AJo+", "KQo"],
      shortContinue: ["22+", "A2s+", "K7s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "76s", "A7o+", "KTo+", "QTo+", "JTo"]
    }
  };
  PREFLOP_CHARTS.public = PREFLOP_CHARTS.standard;
  PREFLOP_CHARTS.loose = PREFLOP_CHARTS.easy;
  PREFLOP_CHARTS.nitty = PREFLOP_CHARTS.pro;

  const PUSH_FOLD_OPEN_RANGES = {
    easy: {
      EP: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "A8o+", "KTo+", "QJo"],
      MP: ["22+", "A2s+", "K7s+", "Q9s+", "J9s+", "T9s", "98s", "A7o+", "KTo+", "QTo+", "JTo"],
      HJ: ["22+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "A5o+", "KTo+", "QTo+", "JTo"],
      CO: ["22+", "A2s+", "K3s+", "Q6s+", "J7s+", "T7s+", "97s+", "86s+", "76s", "A2o+", "K9o+", "QTo+", "JTo"],
      BTN: ["22+", "A2s+", "K2s+", "Q4s+", "J6s+", "T6s+", "96s+", "85s+", "75s+", "64s+", "54s", "A2o+", "K7o+", "Q9o+", "J9o+", "T9o"],
      SB: ["22+", "A2s+", "K2s+", "Q2s+", "J4s+", "T5s+", "95s+", "85s+", "74s+", "64s+", "53s+", "A2o+", "K4o+", "Q7o+", "J8o+", "T8o+", "98o"]
    },
    standard: {
      EP: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "A9o+", "KQo"],
      MP: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "A8o+", "KTo+", "QJo"],
      HJ: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "A7o+", "KTo+", "QTo+", "JTo"],
      CO: ["22+", "A2s+", "K6s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "76s", "A5o+", "KTo+", "QTo+", "JTo"],
      BTN: ["22+", "A2s+", "K2s+", "Q5s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "65s", "A2o+", "K8o+", "QTo+", "JTo"],
      SB: ["22+", "A2s+", "K2s+", "Q2s+", "J5s+", "T6s+", "96s+", "85s+", "75s+", "64s+", "54s", "A2o+", "K5o+", "Q8o+", "J8o+", "T8o+", "98o"]
    },
    pro: {
      EP: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "A8o+", "KQo"],
      MP: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "A7o+", "KTo+", "QJo"],
      HJ: ["22+", "A2s+", "K7s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "76s", "A6o+", "KTo+", "QTo+", "JTo"],
      CO: ["22+", "A2s+", "K5s+", "Q7s+", "J7s+", "T7s+", "97s+", "86s+", "76s", "65s", "A4o+", "K9o+", "QTo+", "JTo"],
      BTN: ["22+", "A2s+", "K2s+", "Q6s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "65s", "A2o+", "K8o+", "QTo+", "JTo"],
      SB: ["22+", "A2s+", "K2s+", "Q4s+", "J6s+", "T6s+", "96s+", "85s+", "74s+", "64s+", "54s", "A2o+", "K6o+", "Q8o+", "J8o+", "T8o+", "98o"]
    }
  };
  PUSH_FOLD_OPEN_RANGES.public = PUSH_FOLD_OPEN_RANGES.standard;
  PUSH_FOLD_OPEN_RANGES.loose = PUSH_FOLD_OPEN_RANGES.easy;
  PUSH_FOLD_OPEN_RANGES.nitty = PUSH_FOLD_OPEN_RANGES.pro;

  const MICRO_STACK_OPEN_ADDITIONS = {
    EP: ["A8o+", "KJs+", "KQo"],
    MP: ["A6o+", "K9o+", "QTo+"],
    HJ: ["A5o+", "K9o+", "Q9o+", "J9o+"],
    CO: ["K8o+", "Q9o+", "J9o+", "T9o", "Q7s+", "J7s+", "T7s+", "97s+"],
    BTN: ["K6o+", "Q8o+", "J8o+", "T8o+", "98o", "Q4s+", "J6s+", "T6s+", "96s+", "85s+"],
    SB: ["K3o+", "Q6o+", "J7o+", "T7o+", "97o+", "Q2s+", "J4s+", "T5s+", "95s+", "85s+", "74s+", "64s+", "53s+"]
  };

  const MICRO_STACK_CALL_JAM_ADDITIONS = {
    EP: {
      EP: ["44+", "A8s+", "KQs", "AJo+"],
      MP: ["33+", "A7s+", "KJs+", "QJs", "ATo+", "KQo"],
      HJ: ["33+", "A5s+", "KTs+", "QJs", "JTs", "ATo+", "KQo"],
      CO: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "A9o+", "KQo"],
      BTN: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "A8o+", "KTo+", "QJo"],
      SB: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "A8o+", "KTo+", "QJo"]
    },
    MP: {
      EP: ["44+", "A8s+", "KQs", "AJo+"],
      MP: ["33+", "A7s+", "KJs+", "QJs", "ATo+", "KQo"],
      HJ: ["22+", "A5s+", "KTs+", "QTs+", "JTs", "A9o+", "KQo"],
      CO: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "A8o+", "KTo+", "QJo"],
      BTN: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "A7o+", "KTo+", "QJo"],
      SB: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "A7o+", "KTo+", "QJo"]
    },
    LP: {
      EP: ["44+", "A8s+", "KQs", "QJs", "AJo+"],
      MP: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "A9o+", "KQo"],
      HJ: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "A8o+", "KTo+", "QJo"],
      CO: ["22+", "A2s+", "K9s+", "Q9s+", "JTs", "T9s", "98s", "87s", "A7o+", "KTo+", "QJo"],
      BTN: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "A6o+", "K9o+", "QTo+", "JTo"],
      SB: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "A6o+", "K9o+", "QTo+", "JTo"]
    },
    BLIND: {
      EP: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "A9o+", "KQo"],
      MP: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "A8o+", "KTo+", "QJo"],
      HJ: ["22+", "A2s+", "K9s+", "Q9s+", "JTs", "T9s", "98s", "87s", "A7o+", "KTo+", "QJo"],
      CO: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A5o+", "KTo+", "QJo"],
      BTN: ["22+", "A2s+", "K6s+", "Q8s+", "J8s+", "T8s+", "97s+", "87s", "76s", "A2o+", "K8o+", "QTo+", "JTo"],
      SB: ["22+", "A2s+", "K2s+", "Q6s+", "J7s+", "T7s+", "97s+", "86s+", "76s", "A2o+", "K7o+", "Q9o+", "J9o+", "T9o"]
    }
  };

  const SB_COMPLETE_CALL_RANGES = {
    easy: ["22+", "A2s+", "K2s+", "Q2s+", "J4s+", "T5s+", "95s+", "85s+", "75s+", "64s+", "54s", "A2o+", "K5o+", "Q8o+", "J8o+", "T8o+", "98o"],
    standard: ["22+", "A2s+", "K2s+", "Q4s+", "J6s+", "T7s+", "97s+", "86s+", "76s", "A2o+", "K7o+", "Q8o+", "J9o+", "T9o"],
    pro: ["22+", "A2s+", "K2s+", "Q5s+", "J7s+", "T7s+", "97s+", "86s+", "76s", "A2o+", "K8o+", "Q8o+", "J9o+", "T9o"]
  };
  SB_COMPLETE_CALL_RANGES.public = SB_COMPLETE_CALL_RANGES.standard;
  SB_COMPLETE_CALL_RANGES.loose = SB_COMPLETE_CALL_RANGES.easy;
  SB_COMPLETE_CALL_RANGES.nitty = SB_COMPLETE_CALL_RANGES.pro;

  const OPEN_RANGES = {
    easy: {
      UTG: ["44+", "A8s+", "KJs+", "QJs", "JTs", "AJo+", "KQo"],
      "UTG+1": ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "ATo+", "KQo"],
      MP: ["22+", "A2s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "A9o+", "KJo+", "QJo"],
      LJ: ["22+", "A2s+", "K8s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "A8o+", "KTo+", "QTo+"],
      HJ: ["22+", "A2s+", "K6s+", "Q8s+", "J8s+", "T8s+", "97s+", "86s+", "A7o+", "KTo+", "QTo+", "JTo"],
      CO: ["22+", "A2s+", "K2s+", "Q6s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "A2o+", "K8o+", "Q9o+", "J9o+", "T9o"],
      BTN: ["22+", "A2s+", "K2s+", "Q2s+", "J5s+", "T6s+", "96s+", "85s+", "74s+", "64s+", "A2o+", "K5o+", "Q8o+", "J8o+", "T8o+", "98o"],
      SB: ["22+", "A2s+", "K2s+", "Q5s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "A2o+", "K7o+", "Q9o+", "J9o+", "T9o"],
      BB: ["22+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "A5o+", "K9o+", "QTo+", "JTo"]
    },
    standard: {
      UTG: ["22+", "A2s+", "KTs+", "Q9s+", "J9s+", "T9s", "98s", "ATo+", "KJo+", "QJo"],
      "UTG+1": ["22+", "A2s+", "K9s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "ATo+", "KTo+", "QJo"],
      MP: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A8o+", "KTo+", "QTo+", "JTo"],
      LJ: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "AJo+", "KQo"],
      HJ: ["22+", "A2s+", "K6s+", "Q7s+", "J8s+", "T7s+", "97s+", "86s+", "75s+", "A7o+", "K9o+", "QTo+", "JTo"],
      CO: ["22+", "A2s+", "K2s+", "Q4s+", "J6s+", "T6s+", "96s+", "85s+", "75s+", "64s+", "A2o+", "K6o+", "Q8o+", "J8o+", "T8o+", "98o"],
      BTN: ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "82s+", "72s+", "62s+", "52s+", "42s+", "32s", "A2o+", "K2o+", "Q5o+", "J7o+", "T7o+", "97o+", "86o+", "76o", "65o"],
      SB: ["22+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "97s+", "86s+", "A5o+", "K9o+", "QTo+", "JTo"],
      BB: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "A8o+", "KTo+", "QJo"]
    },
    pro: {
      UTG: ["22+", "A2s+", "KTs+", "Q9s+", "J9s+", "T9s", "98s", "ATo+", "KJo+", "QJo"],
      "UTG+1": ["22+", "A2s+", "K9s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "ATo+", "KTo+", "QJo"],
      MP: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A8o+", "KTo+", "QTo+", "JTo"],
      LJ: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
      HJ: ["22+", "A2s+", "K6s+", "Q7s+", "J8s+", "T7s+", "97s+", "86s+", "75s+", "A7o+", "K9o+", "QTo+", "JTo"],
      CO: ["22+", "A2s+", "K2s+", "Q4s+", "J6s+", "T6s+", "96s+", "85s+", "75s+", "64s+", "A2o+", "K6o+", "Q8o+", "J8o+", "T8o+", "98o"],
      BTN: ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "82s+", "72s+", "62s+", "52s+", "42s+", "32s", "A2o+", "K2o+", "Q5o+", "J7o+", "T7o+", "97o+", "86o+", "76o", "65o"],
      SB: ["22+", "A2s+", "K4s+", "Q7s+", "J8s+", "T8s+", "97s+", "86s+", "A4o+", "K9o+", "QTo+", "JTo"],
      BB: ["22+", "A2s+", "K7s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A8o+", "KTo+", "QJo"]
    }
  };
  OPEN_RANGES.public = OPEN_RANGES.standard;
  OPEN_RANGES.loose = OPEN_RANGES.easy;
  OPEN_RANGES.nitty = OPEN_RANGES.pro;

  const DEFENSE_RANGES = {
    easy: {
      EP: ["33+", "A2s+", "K8s+", "Q9s+", "J9s+", "T9s", "98s", "A9o+", "KJo+", "QJo"],
      MP: ["22+", "A2s+", "K7s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "A8o+", "KTo+", "QTo+"],
      LP: ["22+", "A2s+", "K5s+", "Q7s+", "J7s+", "T7s+", "97s+", "86s+", "A5o+", "K9o+", "QTo+", "JTo"],
      BLIND: ["22+", "A2s+", "K2s+", "Q6s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "A2o+", "K8o+", "Q9o+", "J9o+", "T9o"]
    },
    standard: {
      EP: ["55+", "ATs+", "KQs", "AQo+"],
      MP: ["44+", "A8s+", "KJs+", "QTs+", "JTs", "T9s", "AQo+", "KQo"],
      LP: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AQo+", "KQo"],
      BLIND: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"]
    },
    pro: {
      EP: ["44+", "A9s+", "KQs", "QJs", "AJo+", "KQo"],
      MP: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
      LP: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
      BLIND: ["22+", "A2s+", "K7s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"]
    }
  };

  const THREE_BET_RANGES = {
    easy: {
      EP: ["JJ+", "AKs", "AKo", "A5s", "A4s", "A3s", "A2s"],
      MP: ["TT+", "AQs+", "AKo", "A5s", "A4s", "A3s", "A2s"],
      LP: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
      BLIND: ["99+", "ATs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"]
    },
    standard: {
      EP: ["QQ+", "AKs", "AKo", "A5s", "A4s", "A3s", "A2s"],
      MP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s", "A2s"],
      LP: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
      BLIND: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"]
    },
    pro: {
      EP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s", "A2s"],
      MP: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
      LP: ["99+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
      BLIND: ["99+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"]
    }
  };

  // Heads-up (2-max) is a blind-vs-blind game where the SB IS the button and plays
  // postflop IN POSITION, so the button opens far wider (~80-88% RFI, raise-or-fold)
  // and the BB defends/3bets far wider than the multiway BLIND buckets above. Used
  // ONLY when positions.length === 2 (see isHeadsUpTable + the headsUp flag threaded
  // through openPatternsFor/defensePatternsFor/threeBetPatternsFor). open = SB/BTN RFI,
  // defense = BB flat-continue vs the SB raise, threeBet = BB 3bet vs the SB raise.
  const HEADS_UP_RANGES = {
    easy: {
      open: ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "82s+", "72s+", "62s+", "52s+", "42s+", "32s", "A2o+", "K2o+", "Q2o+", "J3o+", "T5o+", "95o+", "85o+", "75o+", "64o+", "54o"],
      defense: ["22+", "A2s+", "K2s+", "Q4s+", "J6s+", "T6s+", "96s+", "85s+", "75s+", "64s+", "54s", "A2o+", "K4o+", "Q7o+", "J7o+", "T7o+", "97o+", "87o", "76o", "65o"],
      threeBet: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s"]
    },
    standard: {
      open: ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "82s+", "72s+", "62s+", "52s+", "42s+", "32s", "A2o+", "K2o+", "Q2o+", "J4o+", "T6o+", "96o+", "86o+", "75o+", "64o+", "54o"],
      defense: ["22+", "A2s+", "K2s+", "Q3s+", "J5s+", "T6s+", "95s+", "85s+", "75s+", "64s+", "53s+", "43s", "A2o+", "K2o+", "Q5o+", "J7o+", "T7o+", "97o+", "86o+", "76o", "65o", "54o"],
      threeBet: ["99+", "ATs+", "KTs+", "QTs+", "JTs", "AJo+", "KQo", "A5s", "A4s", "A3s", "A2s", "K9s", "Q9s", "J9s", "T9s", "98s", "87s", "76s"]
    },
    pro: {
      open: ["22+", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "82s+", "72s+", "62s+", "52s+", "42s+", "32s", "A2o+", "K2o+", "Q2o+", "J2o+", "T4o+", "95o+", "85o+", "74o+", "63o+", "53o+", "43o"],
      defense: ["22+", "A2s+", "K2s+", "Q2s+", "J3s+", "T5s+", "95s+", "84s+", "74s+", "63s+", "53s+", "43s", "A2o+", "K2o+", "Q4o+", "J6o+", "T7o+", "96o+", "86o+", "75o+", "65o", "54o"],
      threeBet: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "T9s", "ATo+", "KQo", "A5s", "A4s", "A3s", "A2s", "K8s", "K9s", "Q9s", "J8s", "J9s", "98s", "87s", "76s", "65s"]
    }
  };
  HEADS_UP_RANGES.public = HEADS_UP_RANGES.standard;
  HEADS_UP_RANGES.loose = HEADS_UP_RANGES.easy;
  HEADS_UP_RANGES.nitty = HEADS_UP_RANGES.pro;

  const SINGLE_RAISE_DEFENSE_RANGES = {
    easy: {
      EP: {
        EP: ["44+", "A8s+", "KJs+", "QJs", "JTs", "AJo+", "KQo"],
        MP: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "ATo+", "KQo"],
        HJ: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        CO: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        BTN: ["22+", "A2s+", "K8s+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        SB: ["22+", "A2s+", "K8s+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"]
      },
      MP: {
        EP: ["33+", "A8s+", "KJs+", "QJs", "JTs", "AJo+", "KQo"],
        MP: ["22+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        HJ: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"],
        CO: ["22+", "A2s+", "K8s+", "Q9s+", "JTs", "T9s", "98s", "87s", "ATo+", "KQo"],
        BTN: ["22+", "A2s+", "K7s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A9o+", "KJo+"],
        SB: ["22+", "A2s+", "K7s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A9o+", "KJo+"]
      },
      LP: {
        EP: ["22+", "A8s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        MP: ["22+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"],
        HJ: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "87s", "A9o+", "KJo+"],
        CO: ["22+", "A2s+", "K5s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
        BTN: ["22+", "A2s+", "K5s+", "Q8s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
        SB: ["22+", "A2s+", "K5s+", "Q8s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"]
      },
      BLIND: {
        EP: ["33+", "A8s+", "KJs+", "QJs", "JTs", "AJo+", "KQo"],
        MP: ["22+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        HJ: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"],
        CO: ["22+", "A2s+", "K7s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
        BTN: ["22+", "A2s+", "K2s+", "Q6s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "A2o+", "K8o+", "Q9o+", "J9o+", "T9o"],
        SB: ["22+", "A2s+", "K2s+", "Q6s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "A2o+", "K8o+", "Q9o+", "J9o+", "T9o"]
      }
    },
    standard: {
      EP: {
        EP: ["55+", "ATs+", "KQs", "AQo+"],
        MP: ["55+", "A9s+", "KQs", "QJs", "AJo+", "KQo"],
        HJ: ["44+", "A8s+", "KJs+", "QTs+", "JTs", "AQo+", "KQo"],
        CO: ["44+", "A8s+", "KJs+", "QTs+", "JTs", "AQo+", "KQo"],
        BTN: ["44+", "A8s+", "KJs+", "QTs+", "JTs", "AQo+", "KQo"],
        SB: ["44+", "A8s+", "KJs+", "QTs+", "JTs", "AQo+", "KQo"]
      },
      MP: {
        EP: ["66+", "ATs+", "KQs", "AQo+"],
        MP: ["55+", "A9s+", "KQs", "QJs", "JTs", "AQo+", "KQo"],
        HJ: ["44+", "A8s+", "KJs+", "QTs+", "JTs", "T9s", "AQo+", "KQo"],
        CO: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        BTN: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        SB: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"]
      },
      LP: {
        EP: ["66+", "ATs+", "KQs", "QJs", "JTs", "AQo+"],
        MP: ["44+", "A8s+", "KJs+", "QTs+", "JTs", "T9s", "98s", "AQo+", "KQo"],
        HJ: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"],
        CO: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"],
        BTN: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"],
        SB: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"]
      },
      BLIND: {
        EP: ["55+", "ATs+", "KQs", "QJs", "AQo+"],
        MP: ["44+", "A9s+", "KJs+", "QTs+", "JTs", "T9s", "AQo+", "KQo"],
        HJ: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        CO: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"],
        BTN: ["22+", "A2s+", "K7s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
        SB: ["22+", "A2s+", "K2s+", "Q8s+", "J8s+", "T8s+", "97s+", "86s+", "76s", "A8o+", "KTo+", "QTo+"]
      }
    },
    pro: {
      EP: {
        EP: ["55+", "AJs+", "KQs", "AQo+"],
        MP: ["55+", "ATs+", "KQs", "QJs", "AJo+", "KQo"],
        HJ: ["44+", "A9s+", "KJs+", "QTs+", "JTs", "AQo+", "KQo"],
        CO: ["44+", "A8s+", "KJs+", "QTs+", "JTs", "AQo+", "KQo"],
        BTN: ["44+", "A8s+", "KJs+", "QTs+", "JTs", "AQo+", "KQo"],
        SB: ["44+", "A8s+", "KJs+", "QTs+", "JTs", "AQo+", "KQo"]
      },
      MP: {
        EP: ["55+", "ATs+", "KQs", "QJs", "AQo+"],
        MP: ["44+", "A9s+", "KQs", "QJs", "JTs", "AQo+", "KQo"],
        HJ: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "AQo+", "KQo"],
        CO: ["22+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        BTN: ["22+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        SB: ["22+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"]
      },
      LP: {
        EP: ["55+", "ATs+", "KQs", "QJs", "JTs", "AQo+"],
        MP: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        HJ: ["22+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"],
        CO: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
        BTN: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
        SB: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"]
      },
      BLIND: {
        EP: ["55+", "ATs+", "KQs", "QJs", "AQo+"],
        MP: ["44+", "A9s+", "KJs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
        HJ: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"],
        CO: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
        BTN: ["22+", "A2s+", "K7s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
        SB: ["22+", "A2s+", "K2s+", "Q8s+", "J8s+", "T8s+", "97s+", "86s+", "75s+", "A8o+", "KTo+", "QTo+"]
      }
    }
  };

  const SINGLE_RAISE_THREE_BET_RANGES = {
    easy: {
      EP: {
        EP: ["JJ+", "AKs", "AKo", "A5s", "A4s"],
        MP: ["TT+", "AQs+", "AKo", "A5s", "A4s", "A3s"],
        HJ: ["TT+", "AQs+", "AKo", "A5s", "A4s", "A3s", "A2s"],
        CO: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        SB: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"]
      },
      MP: {
        EP: ["TT+", "AQs+", "AKo", "A5s", "A4s"],
        MP: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
        HJ: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        CO: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        SB: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"]
      },
      LP: {
        EP: ["TT+", "AQs+", "AKo", "A5s", "A4s"],
        MP: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
        HJ: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        CO: ["77+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["77+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        SB: ["77+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"]
      },
      BLIND: {
        EP: ["TT+", "AQs+", "AKo", "A5s", "A4s"],
        MP: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
        HJ: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        CO: ["77+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["66+", "A9s+", "KTs+", "QJs", "AJo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        SB: ["66+", "A9s+", "KTs+", "QJs", "AJo+", "KQo", "A5s", "A4s", "A3s", "A2s"]
      }
    },
    standard: {
      EP: {
        EP: ["QQ+", "AKs", "AKo", "A5s", "A4s"],
        MP: ["QQ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
        HJ: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s"],
        CO: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s"],
        BTN: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s"],
        SB: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s"]
      },
      MP: {
        EP: ["QQ+", "AKs", "AKo", "A5s", "A4s"],
        MP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s"],
        HJ: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
        CO: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        SB: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"]
      },
      LP: {
        EP: ["QQ+", "AKs", "AKo", "A5s", "A4s"],
        MP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s"],
        HJ: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        CO: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        SB: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"]
      },
      BLIND: {
        EP: ["QQ+", "AKs", "AKo", "A5s", "A4s"],
        MP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s"],
        HJ: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        CO: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        SB: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"]
      }
    },
    pro: {
      EP: {
        EP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
        MP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s"],
        HJ: ["TT+", "AKs", "AQs", "AKo", "A5s", "A4s", "A3s", "A2s"],
        CO: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        SB: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"]
      },
      MP: {
        EP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
        MP: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
        HJ: ["99+", "ATs+", "KQs", "AQo+", "A5s", "A4s", "A3s", "A2s"],
        CO: ["99+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["99+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        SB: ["99+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"]
      },
      LP: {
        EP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
        MP: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
        HJ: ["99+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        CO: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        SB: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"]
      },
      BLIND: {
        EP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
        MP: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
        HJ: ["99+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        CO: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        BTN: ["77+", "ATs+", "KTs+", "QJs", "AJo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
        SB: ["77+", "ATs+", "KTs+", "QJs", "AJo+", "KQo", "A5s", "A4s", "A3s", "A2s"]
      }
    }
  };
  DEFENSE_RANGES.public = DEFENSE_RANGES.standard;
  DEFENSE_RANGES.loose = DEFENSE_RANGES.easy;
  DEFENSE_RANGES.nitty = DEFENSE_RANGES.pro;
  THREE_BET_RANGES.public = THREE_BET_RANGES.standard;
  THREE_BET_RANGES.loose = THREE_BET_RANGES.easy;
  THREE_BET_RANGES.nitty = THREE_BET_RANGES.pro;
  SINGLE_RAISE_DEFENSE_RANGES.public = SINGLE_RAISE_DEFENSE_RANGES.standard;
  SINGLE_RAISE_DEFENSE_RANGES.loose = SINGLE_RAISE_DEFENSE_RANGES.easy;
  SINGLE_RAISE_DEFENSE_RANGES.nitty = SINGLE_RAISE_DEFENSE_RANGES.pro;
  SINGLE_RAISE_THREE_BET_RANGES.public = SINGLE_RAISE_THREE_BET_RANGES.standard;
  SINGLE_RAISE_THREE_BET_RANGES.loose = SINGLE_RAISE_THREE_BET_RANGES.easy;
  SINGLE_RAISE_THREE_BET_RANGES.nitty = SINGLE_RAISE_THREE_BET_RANGES.pro;

  applyBotStrategyProfile();

  function applyBotStrategyProfile() {
    const preflop = BOT_STRATEGY_PROFILE.preflop && typeof BOT_STRATEGY_PROFILE.preflop === "object"
      ? BOT_STRATEGY_PROFILE.preflop
      : {};
    ["easy", "standard", "pro"].forEach((difficulty) => {
      const profile = preflop[difficulty] || {};
      applyChartAdditions(PREFLOP_CHARTS[difficulty], profile.charts);
      applyRangeAdditions(OPEN_RANGES[difficulty], profile.open);
      applyRangeAdditions(DEFENSE_RANGES[difficulty], profile.defense);
      applyRangeAdditions(THREE_BET_RANGES[difficulty], profile.threeBet);
      applyRangeAdditions(PUSH_FOLD_OPEN_RANGES[difficulty], profile.pushFoldOpen);
      applyRangeAdditions(HEADS_UP_RANGES[difficulty], profile.headsUp);
    });
  }

  function applyChartAdditions(target, additions) {
    if (!target || !additions || typeof additions !== "object") return;
    Object.entries(additions).forEach(([key, patterns]) => {
      if (!Array.isArray(target[key])) return;
      target[key] = appendStrategyPatterns(target[key], patterns);
    });
  }

  function applyRangeAdditions(target, additions) {
    if (!target || !additions || typeof additions !== "object") return;
    Object.entries(additions).forEach(([key, patterns]) => {
      if (!Array.isArray(target[key])) return;
      target[key] = appendStrategyPatterns(target[key], patterns);
    });
  }

  function appendStrategyPatterns(target, additions) {
    const next = Array.isArray(target) ? target.slice() : [];
    (Array.isArray(additions) ? additions : []).forEach((pattern) => {
      const value = String(pattern || "").trim();
      if (value && !next.includes(value)) next.push(value);
    });
    return next;
  }

  const SINGLE_RAISE_THREE_BET_ADDITIONS = {
    easy: {
      MP: {
        HJ: ["99+", "ATs+", "KJs+", "QTs+", "JTs", "AJo+", "KQo"],
        CO: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "AJo+", "KQo"],
        BTN: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "AJo+", "KQo"],
        SB: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "AJo+", "KQo"]
      },
      LP: {
        HJ: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "T9s", "AJo+", "KQo"],
        CO: ["66+", "A7s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"],
        BTN: ["66+", "A7s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"],
        SB: ["66+", "A7s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"]
      },
      BLIND: {
        HJ: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "T9s", "AJo+", "KQo"],
        CO: ["66+", "A7s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"],
        BTN: ["55+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A9o+", "KJo+", "QJo"],
        SB: ["55+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A9o+", "KJo+", "QJo"]
      }
    },
    standard: {
      MP: {
        HJ: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s"],
        CO: ["99+", "ATs+", "KJs+", "QJs", "AJo+", "KQo", "A5s", "A4s", "A3s"],
        BTN: ["99+", "ATs+", "KJs+", "QJs", "AJo+", "KQo", "A5s", "A4s", "A3s"],
        SB: ["99+", "ATs+", "KJs+", "QJs", "AJo+", "KQo", "A5s", "A4s", "A3s"]
      },
      LP: {
        HJ: ["88+", "ATs+", "KTs+", "QTs+", "JTs", "AJo+", "KQo", "A5s", "A4s", "A3s"],
        CO: ["66+", "A7s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"],
        BTN: ["66+", "A7s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"],
        SB: ["66+", "A7s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"]
      },
      BLIND: {
        HJ: ["88+", "ATs+", "KTs+", "QTs+", "JTs", "AJo+", "KQo", "A5s", "A4s", "A3s"],
        CO: ["66+", "A7s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "AJo+", "KQo"],
        BTN: ["55+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A9o+", "KJo+", "QJo"],
        SB: ["55+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A9o+", "KJo+", "QJo"]
      }
    },
    pro: {
      MP: {
        HJ: ["99+", "ATs+", "KJs+", "QTs+", "JTs", "AJo+", "KQo", "A5s", "A4s"],
        CO: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "AJo+", "KQo", "A5s", "A4s", "A3s"],
        BTN: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "AJo+", "KQo", "A5s", "A4s", "A3s"],
        SB: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "AJo+", "KQo", "A5s", "A4s", "A3s"]
      },
      LP: {
        HJ: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "T9s", "AJo+", "KQo", "A5s", "A4s", "A3s"],
        CO: ["55+", "A5s+", "K9s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "AJo+", "KQo"],
        BTN: ["55+", "A5s+", "K9s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "AJo+", "KQo"],
        SB: ["55+", "A5s+", "K9s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "AJo+", "KQo"]
      },
      BLIND: {
        HJ: ["88+", "A9s+", "KTs+", "QTs+", "JTs", "T9s", "AJo+", "KQo", "A5s", "A4s", "A3s"],
        CO: ["55+", "A5s+", "K9s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "AJo+", "KQo"],
        BTN: ["44+", "A2s+", "K7s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "76s", "65s", "A8o+", "KTo+", "QJo"],
        SB: ["44+", "A2s+", "K7s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "76s", "65s", "A8o+", "KTo+", "QJo"]
      }
    }
  };
  SINGLE_RAISE_THREE_BET_ADDITIONS.public = SINGLE_RAISE_THREE_BET_ADDITIONS.standard;
  SINGLE_RAISE_THREE_BET_ADDITIONS.loose = SINGLE_RAISE_THREE_BET_ADDITIONS.easy;
  SINGLE_RAISE_THREE_BET_ADDITIONS.nitty = SINGLE_RAISE_THREE_BET_ADDITIONS.pro;

  // Solver-style MTT ranges are not one static chart: short and medium
  // stacks add more blocker-heavy Ax/Kx and high-card hands while trashy
  // suited connectors lose value. These additions sit on top of the baseline
  // position charts so existing easy/standard/pro personalities still matter.
  const MTT_STACK_OPEN_ADDITIONS = {
    short: {
      EP: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "A9o+", "KQo"],
      MP: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "A8o+", "KTo+", "QJo"],
      HJ: ["22+", "A2s+", "K7s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A7o+", "KTo+", "QTo+", "JTo"],
      CO: ["22+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "76s", "A5o+", "K9o+", "QTo+", "JTo"],
      BTN: ["22+", "A2s+", "K2s+", "Q4s+", "J6s+", "T6s+", "96s+", "86s+", "75s+", "64s+", "A2o+", "K7o+", "Q9o+", "J9o+", "T9o"],
      SB: ["22+", "A2s+", "K2s+", "Q4s+", "J6s+", "T6s+", "96s+", "85s+", "75s+", "64s+", "A2o+", "K6o+", "Q8o+", "J8o+", "T8o+", "98o"]
    },
    medium: {
      EP: ["22+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "AJo+", "KQo"],
      MP: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "ATo+", "KJo+", "QJo"],
      HJ: ["22+", "A2s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "87s", "ATo+", "KJo+", "QJo"],
      CO: ["22+", "A2s+", "K7s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QTo+", "JTo"],
      BTN: ["22+", "A2s+", "K2s+", "Q5s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "65s", "A2o+", "K8o+", "Q9o+", "J9o+", "T9o"],
      SB: ["22+", "A2s+", "K5s+", "Q8s+", "J8s+", "T8s+", "97s+", "86s+", "A5o+", "K9o+", "QTo+", "JTo"]
    }
  };

  const MTT_SHORT_STACK_DEFENSE_ADDITIONS = {
    EP: {
      EP: ["55+", "AJs+", "KQs", "AQo+"],
      MP: ["44+", "ATs+", "KQs", "QJs", "AJo+", "KQo"],
      HJ: ["44+", "A9s+", "KJs+", "QJs", "JTs", "AJo+", "KQo"],
      CO: ["44+", "A9s+", "KJs+", "QTs+", "JTs", "AJo+", "KQo"],
      BTN: ["44+", "A8s+", "KTs+", "QTs+", "JTs", "AJo+", "KQo"],
      SB: ["44+", "A8s+", "KTs+", "QTs+", "JTs", "AJo+", "KQo"]
    },
    MP: {
      EP: ["55+", "ATs+", "KQs", "AQo+"],
      MP: ["44+", "A9s+", "KQs", "QJs", "JTs", "AJo+", "KQo"],
      HJ: ["33+", "A8s+", "KTs+", "QTs+", "JTs", "T9s", "AJo+", "KQo"],
      CO: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
      BTN: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "ATo+", "KQo"],
      SB: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "ATo+", "KQo"]
    },
    LP: {
      EP: ["55+", "ATs+", "KQs", "QJs", "AQo+"],
      MP: ["44+", "A9s+", "KJs+", "QTs+", "JTs", "T9s", "AQo+", "KQo"],
      HJ: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
      CO: ["22+", "A2s+", "K9s+", "QTs+", "JTs", "T9s", "98s", "87s", "AJo+", "KQo"],
      BTN: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A8o+", "KTo+", "QJo"],
      SB: ["22+", "A2s+", "K8s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A8o+", "KTo+", "QJo"]
    },
    BLIND: {
      EP: ["44+", "A8s+", "KQs", "QJs", "JTs", "AJo+", "KQo"],
      MP: ["33+", "A5s+", "KTs+", "QTs+", "JTs", "T9s", "AQo+", "KQo"],
      HJ: ["22+", "A2s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo"],
      CO: ["22+", "A2s+", "K9s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "A9o+", "KTo+", "QJo"],
      BTN: ["22+", "A2s+", "K7s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A8o+", "KTo+", "QJo"],
      SB: ["22+", "A2s+", "K2s+", "Q8s+", "J8s+", "T8s+", "97s+", "86s+", "76s", "A8o+", "KTo+", "QTo+"]
    }
  };

  const MTT_SHORT_STACK_THREE_BET_ADDITIONS = {
    EP: {
      EP: ["QQ+", "AKs", "AKo"],
      MP: ["JJ+", "AKs", "AQs", "AKo"],
      HJ: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
      CO: ["TT+", "AKs", "AQs", "AKo", "A5s", "A4s"],
      BTN: ["TT+", "AKs", "AQs", "AKo", "A5s", "A4s"],
      SB: ["TT+", "AKs", "AQs", "AKo", "A5s", "A4s"]
    },
    MP: {
      EP: ["QQ+", "AKs", "AKo"],
      MP: ["JJ+", "AKs", "AQs", "AKo"],
      HJ: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s"],
      CO: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
      BTN: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
      SB: ["99+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"]
    },
    LP: {
      EP: ["QQ+", "AKs", "AKo"],
      MP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
      HJ: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
      CO: ["99+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
      BTN: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
      SB: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"]
    },
    BLIND: {
      EP: ["QQ+", "AKs", "AKo", "A5s"],
      MP: ["JJ+", "AKs", "AQs", "AKo", "A5s", "A4s"],
      HJ: ["TT+", "AJs+", "KQs", "AQo+", "A5s", "A4s", "A3s"],
      CO: ["88+", "ATs+", "KJs+", "QJs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
      BTN: ["55+", "A8s+", "KTs+", "QJs", "AJo+", "KQo", "A5s", "A4s", "A3s", "A2s"],
      SB: ["55+", "A8s+", "KTs+", "QJs", "AJo+", "KQo", "A5s", "A4s", "A3s", "A2s"]
    }
  };

  function normalizeDifficulty(value) {
    if (value === "loose") return "easy";
    if (value === "nitty") return "pro";
    if (value === "public") return "standard";
    if (value === "easy" || value === "standard" || value === "pro") return value;
    return "standard";
  }

  function normalizeBotLineup(value) {
    return ["single", "mixed", "soft", "tough"].includes(value) ? value : "single";
  }

  function normalizeBotStrategyPool(value) {
    const rawInput = String(value || "auto").trim();
    const raw = rawInput.toLowerCase();
    if (["auto", "top", "standard", "weak", "mixed"].includes(raw)) return raw;
    if (raw.startsWith("model:")) {
      const modelId = rawInput.slice(rawInput.indexOf(":") + 1).trim().toLowerCase();
      if (/^[a-z0-9][a-z0-9_.:-]*$/.test(modelId)) return `model:${modelId}`;
      return "model:";
    }
    return "auto";
  }

  function botPackCatalog() {
    return BOT_PACK_PROFILE && typeof BOT_PACK_PROFILE.packs === "object" && !Array.isArray(BOT_PACK_PROFILE.packs)
      ? BOT_PACK_PROFILE.packs
      : {};
  }

  function normalizeBotPack(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    const catalog = botPackCatalog();
    const aliases = BOT_PACK_PROFILE && typeof BOT_PACK_PROFILE.aliases === "object" && !Array.isArray(BOT_PACK_PROFILE.aliases)
      ? BOT_PACK_PROFILE.aliases
      : {};
    const key = String(aliases[raw] || raw).trim().toLowerCase();
    return catalog[key] ? key : "";
  }

  function botPackDefinition(value) {
    const key = normalizeBotPack(value);
    return key ? botPackCatalog()[key] || null : null;
  }

  function botPackLabel(value) {
    const pack = botPackDefinition(value);
    return pack ? String(pack.label || pack.key || "").slice(0, 80) : "";
  }

  function sanitizeStringList(value, maxItems = 16, maxLength = 64) {
    return (Array.isArray(value) ? value : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .map((item) => item.slice(0, maxLength))
      .slice(0, maxItems);
  }

  function sanitizeBotPackMetadata(value) {
    if (!value || typeof value !== "object") return null;
    const key = normalizeBotPack(value.key);
    if (!key) return null;
    const pack = botPackDefinition(key);
    return {
      key,
      label: String(value.label || pack?.label || key).slice(0, 80),
      difficultyBand: String(value.difficultyBand || pack?.difficultyBand || "").slice(0, 24),
      productGoal: String(value.productGoal || pack?.productGoal || "").slice(0, 180)
    };
  }

  function sanitizeBotPackSeatMetadata(value) {
    if (!value || typeof value !== "object") return null;
    const role = String(value.role || "").trim().slice(0, 48);
    if (!role) return null;
    return {
      role,
      tier: ["top", "standard", "weak"].includes(String(value.tier || "")) ? String(value.tier) : "",
      style: String(value.style || "").trim().slice(0, 24),
      difficulty: normalizeDifficulty(value.difficulty),
      focusSkill: String(value.focusSkill || value.profile?.focusSkill || "").trim().slice(0, 48),
      leakTags: sanitizeStringList(value.leakTags || value.profile?.leakTags, 20, 48)
    };
  }

  // Returns "" when no stakes level is set (legacy difficulty/lineup path).
  // STAKES_LEVELS is the single source of truth for the canonical set; the
  // alias clauses only fold spellings/synonyms onto those canonical values.
  function normalizeStakesLevel(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (STAKES_LEVELS.includes(raw)) return raw;
    if (raw === "microstakes" || raw === "low" || raw === "micros") return "micro";
    if (raw === "middle" || raw === "midstakes" || raw === "midstakes-reg") return "mid";
    if (raw === "highstakes" || raw === "nosebleed" || raw === "high-stakes") return "high";
    return "";
  }

  function stakesLevelLabel(value) {
    const level = normalizeStakesLevel(value);
    if (level === "micro") return "микролимиты";
    if (level === "mid") return "мидлстейк";
    if (level === "high") return "хайстейкс";
    return "";
  }

  let botStrategyModelIndexCache = null;
  let botStrategyModelIndexVersion = 0;
  let botStrategyFilteredModelCache = null;

  // Stat-driven archetype pool (assets/poker-kit/simulator/bot-stat-pool.js), realized
  // from compact stat lines. Exposed for explicit selection (model:<id>) and UI listing,
  // but intentionally NOT merged into the default top/standard/weak tiers, so the default
  // "mixed"/tier pools — and every pinned-seed regression — stay byte-identical.
  function statPoolModels() {
    const pool = (typeof window !== "undefined" ? window : globalThis).PokerSimulatorBotStatPool;
    return Array.isArray(pool?.models) ? pool.models : EMPTY_BOT_STRATEGY_MODELS;
  }

  function botStrategyModelCatalogSources() {
    const models = BOT_STRATEGY_PROFILE.arena?.models;
    const topModels = Array.isArray(models?.top) ? models.top : EMPTY_BOT_STRATEGY_MODELS;
    const standardModels = Array.isArray(models?.standard) ? models.standard : EMPTY_BOT_STRATEGY_MODELS;
    const weakModels = Array.isArray(models?.weak) ? models.weak : EMPTY_BOT_STRATEGY_MODELS;
    return { topModels, standardModels, weakModels };
  }

  function botStrategyModelCatalog() {
    const { topModels, standardModels, weakModels } = botStrategyModelCatalogSources();
    return {
      top: topModels,
      standard: standardModels,
      weak: weakModels,
      statPool: statPoolModels()
    };
  }

  function botStrategyRawModelSignature(models) {
    return (Array.isArray(models) ? models : EMPTY_BOT_STRATEGY_MODELS)
      .map((model) => String(model?.id || ""))
      .join("\u0001");
  }

  function cachedBotStrategyModelIndex() {
    const { topModels, standardModels, weakModels } = botStrategyModelCatalogSources();
    const topSignature = botStrategyRawModelSignature(topModels);
    const standardSignature = botStrategyRawModelSignature(standardModels);
    const weakSignature = botStrategyRawModelSignature(weakModels);
    const cache = botStrategyModelIndexCache;
    if (
      cache &&
      cache.topModels === topModels &&
      cache.standardModels === standardModels &&
      cache.weakModels === weakModels &&
      cache.topSignature === topSignature &&
      cache.standardSignature === standardSignature &&
      cache.weakSignature === weakSignature
    ) {
      return cache;
    }

    const tierModels = {
      top: topModels.map((model) => normalizeBotStrategyModel(model, "top")).filter(Boolean),
      standard: standardModels.map((model) => normalizeBotStrategyModel(model, "standard")).filter(Boolean),
      weak: weakModels.map((model) => normalizeBotStrategyModel(model, "weak")).filter(Boolean)
    };
    const allModels = ["top", "standard", "weak"].flatMap((tier) => tierModels[tier]);
    const byId = new Map();
    allModels.forEach((model) => {
      if (model?.id && !byId.has(model.id)) byId.set(model.id, model);
    });
    // Stat-pool archetypes are resolvable by id (model:<id>) but are NOT in allModels /
    // the tier pools, so they never enter "mixed"/auto selection or change default seating.
    statPoolModels().forEach((raw) => {
      const tier = normalizeDifficulty(raw?.difficulty) === "pro" ? "top" : normalizeDifficulty(raw?.difficulty) === "easy" ? "weak" : "standard";
      const norm = normalizeBotStrategyModel(raw, tier);
      if (norm?.id && !byId.has(norm.id)) byId.set(norm.id, norm);
    });
    botStrategyModelIndexVersion += 1;
    botStrategyModelIndexCache = {
      version: botStrategyModelIndexVersion,
      topModels,
      standardModels,
      weakModels,
      topSignature,
      standardSignature,
      weakSignature,
      tierModels,
      allModels,
      byId
    };
    return botStrategyModelIndexCache;
  }

  function sanitizeStrategyProduction(production) {
    if (!production || typeof production !== "object") return {};
    return Object.fromEntries(
      Object.entries(production)
        .map(([key, value]) => [key, Number(value)])
        .filter(([, value]) => Number.isFinite(value))
    );
  }

  // Validate a stat-driven realizer output: a precomputed map of street -> ranges
  // attached to a bot's strategyModel. Only the preflop membership streets are
  // accepted; values are either a flat string[] of hand-class tokens, or a
  // position-keyed (and optionally opener-keyed) nesting of such arrays. Anything
  // malformed is dropped so this can never inject junk into the policy. Returns
  // null when nothing valid survives (so the default path stays byte-identical).
  function sanitizeRealizedRangeList(value) {
    if (!Array.isArray(value)) return null;
    const tokens = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0 && item.length <= 6)
      .slice(0, 200);
    return tokens.length ? tokens : null;
  }
  function sanitizeRealizedRangeNode(value, depth) {
    const list = sanitizeRealizedRangeList(value);
    if (list) return list;
    if (depth <= 0 || !value || typeof value !== "object" || Array.isArray(value)) return null;
    const out = {};
    Object.keys(value).slice(0, 24).forEach((key) => {
      const child = sanitizeRealizedRangeNode(value[key], depth - 1);
      if (child) out[String(key)] = child;
    });
    return Object.keys(out).length ? out : null;
  }
  const REALIZED_RANGE_STREETS = ["open", "defense", "threeBet", "fourBet", "sbCompleteCall"];
  function sanitizeRealizedRanges(ranges) {
    if (!ranges || typeof ranges !== "object") return null;
    const out = {};
    REALIZED_RANGE_STREETS.forEach((street) => {
      const node = sanitizeRealizedRangeNode(ranges[street], 3);
      if (node) out[street] = node;
    });
    return Object.keys(out).length ? out : null;
  }

  function mergeRealizedRangeNode(base, overlay) {
    if (!overlay) return base || null;
    if (Array.isArray(overlay)) return overlay.slice();
    if (typeof overlay !== "object") return base || null;
    const out = base && typeof base === "object" && !Array.isArray(base) ? { ...base } : {};
    Object.entries(overlay).forEach(([key, value]) => {
      const merged = mergeRealizedRangeNode(out[key], value);
      if (merged) out[key] = merged;
    });
    return Object.keys(out).length ? out : null;
  }

  function mergeRealizedRanges(base, overlay) {
    const first = sanitizeRealizedRanges(base);
    const second = sanitizeRealizedRanges(overlay);
    if (!first && !second) return null;
    const out = {};
    REALIZED_RANGE_STREETS.forEach((street) => {
      const merged = mergeRealizedRangeNode(first?.[street], second?.[street]);
      if (merged) out[street] = merged;
    });
    return Object.keys(out).length ? out : null;
  }

  function roundStrategyProductionValue(value) {
    return Math.round(Number(value || 0) * 10000) / 10000;
  }

  function mergeStrategyProduction(base, overlay) {
    const production = { ...(base || {}) };
    Object.entries(overlay || {}).forEach(([key, value]) => {
      const number = Number(value);
      if (!Number.isFinite(number)) return;
      production[key] = roundStrategyProductionValue(Number(production[key] || 0) + number);
    });
    return production;
  }

  function strategyProductionEquals(first, second) {
    const left = sanitizeStrategyProduction(first);
    const right = sanitizeStrategyProduction(second);
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      if (roundStrategyProductionValue(left[key]) !== roundStrategyProductionValue(right[key])) return false;
    }
    return true;
  }

  function positiveBbOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? roundBbValue(number) : null;
  }

  function mergeStrategyStackBounds(base, next) {
    const min = base.minStackDepthBb != null
      ? base.minStackDepthBb
      : next.minStackDepthBb;
    const max = base.maxStackDepthBb != null
      ? base.maxStackDepthBb
      : next.maxStackDepthBb;
    if (min != null && max != null && min > max) {
      return { minStackDepthBb: max, maxStackDepthBb: min };
    }
    return { minStackDepthBb: min, maxStackDepthBb: max };
  }

  function parseStrategyStackDepthBounds(value) {
    if (value == null || value === "") return { minStackDepthBb: null, maxStackDepthBb: null };
    if (Array.isArray(value)) {
      const numbers = value.map(Number).filter((number) => Number.isFinite(number) && number > 0);
      if (!numbers.length) return { minStackDepthBb: null, maxStackDepthBb: null };
      return {
        minStackDepthBb: roundBbValue(Math.min(...numbers)),
        maxStackDepthBb: roundBbValue(Math.max(...numbers))
      };
    }
    if (typeof value === "object") {
      let bounds = {
        minStackDepthBb: positiveBbOrNull(value.minStackDepthBb ?? value.minStackDepth ?? value.minBb ?? value.min),
        maxStackDepthBb: positiveBbOrNull(value.maxStackDepthBb ?? value.maxStackDepth ?? value.maxBb ?? value.max)
      };
      const nested = value.stackDepths ?? value.stackDepthBb ?? value.stackDepth ?? value.range;
      if (nested != null && nested !== value) {
        bounds = mergeStrategyStackBounds(bounds, parseStrategyStackDepthBounds(nested));
      }
      return mergeStrategyStackBounds({ minStackDepthBb: null, maxStackDepthBb: null }, bounds);
    }

    const text = String(value || "").trim().toLowerCase();
    const numbers = (text.match(/\d+(?:\.\d+)?/g) || [])
      .map(Number)
      .filter((number) => Number.isFinite(number) && number > 0);
    if (!numbers.length) return { minStackDepthBb: null, maxStackDepthBb: null };
    if (numbers.length >= 2) {
      return {
        minStackDepthBb: roundBbValue(Math.min(numbers[0], numbers[1])),
        maxStackDepthBb: roundBbValue(Math.max(numbers[0], numbers[1]))
      };
    }
    const single = roundBbValue(numbers[0]);
    if (/[+]/.test(text) || />=|from|at least|min/.test(text)) {
      return { minStackDepthBb: single, maxStackDepthBb: null };
    }
    if (/<=|up to|max/.test(text)) {
      return { minStackDepthBb: null, maxStackDepthBb: single };
    }
    return { minStackDepthBb: single, maxStackDepthBb: single };
  }

  function strategyStackDepthBoundsForModel(model, evidence) {
    const direct = {
      minStackDepthBb: positiveBbOrNull(model?.minStackDepthBb ?? model?.minStackDepth ?? model?.minStackBb),
      maxStackDepthBb: positiveBbOrNull(model?.maxStackDepthBb ?? model?.maxStackDepth ?? model?.maxStackBb)
    };
    const modelBounds = parseStrategyStackDepthBounds(model?.stackDepths ?? model?.stackDepthBb ?? model?.stackDepth);
    const evidenceBounds = parseStrategyStackDepthBounds(evidence?.stackDepths ?? evidence?.stackDepthBb ?? evidence?.stackDepth);
    return mergeStrategyStackBounds(mergeStrategyStackBounds(direct, modelBounds), evidenceBounds);
  }

  function strategyPlayerCountOrNull(value) {
    if (value == null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(2, Math.floor(number)) : null;
  }

  // Less-exploitable default (2026-06-28): the bots' worst, dimension-wide leak is the BB
  // overfolding to ~20% vs steals (canon ~75-80%) — a leak a skilled player punishes hard
  // but the passive bot pool does not. The realizer (bot-range-realizer.js) fixes it: these
  // canon BB-defense token ranges (methodics 15-11, minraise bucket) are realized into the
  // BB flat-call + 3bet sets, so PRO bots defend correctly (~20% -> ~60%) in EVERY table size.
  // Weak/easy bots keep their (realistically exploitable) defaults.
  const CANON_BB_DEFENSE = {
    btn: { call: ["JJ-22", "ATs-A2s", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "82s+", "72s+", "62s+", "52s+", "42s+", "32s", "ATo-A2o", "K2o+", "Q2o+", "J2o+", "T3o+", "94o+", "84o+", "74o+", "64o+", "54o", "43o", "32o"], threeBet: ["AA-QQ", "AKs", "AKo", "AQs", "A5s-A2s", "KQs"] },
    co: { call: ["JJ-22", "A2s+", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "82s+", "72s+", "62s+", "52s+", "42s+", "32s", "A2o+", "K7o+", "Q7o+", "J7o+", "T7o+", "97o+", "87o", "76o"], threeBet: ["AA-QQ", "AKs", "AKo", "AQs", "A5s-A3s", "KQs"] },
    middle: { call: ["JJ-22", "AQs-A2s", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "82s+", "72s+", "62s+", "52s+", "42s+", "32s", "AQo-A2o", "K9o+", "Q9o+", "J9o+", "T8o+", "98o", "87o", "76o"], threeBet: ["AA-QQ", "AKs", "AKo", "AQs", "A5s-A4s", "KQs"] },
    early: { call: ["JJ-22", "AQs-A2s", "K2s+", "Q2s+", "J2s+", "T2s+", "92s+", "82s+", "72s+", "62s+", "52s+", "42s+", "32s", "AQo-ATo", "KTo+", "QTo+", "JTo"], threeBet: ["AA-QQ", "AKs", "AKo", "AQs", "A5s-A4s", "KQs"] }
  };
  const CANON_BB_OPENER_BUCKET = { UTG: "early", "UTG+1": "early", LJ: "middle", MP: "middle", HJ: "middle", CO: "co", BTN: "btn", SB: "btn" };
  let canonLeakFixCache;
  function canonLeakFixRealizedRanges() {
    if (canonLeakFixCache !== undefined) return canonLeakFixCache;
    const realizer = (typeof window !== "undefined" ? window : globalThis).PokerSimulatorBotRangeRealizer;
    if (!realizer || typeof realizer.realizeTokenRange !== "function") { canonLeakFixCache = null; return null; }
    // Override ONLY the BB flat-call (defense) range — with the FULL canon defend set
    // (call + 3bet hands) so the bot never folds a hand it should defend. The 3bet range is
    // NOT overridden, so each model keeps its own 3bet identity (the overfold leak is about
    // flat-folding too much, not about which hands 3bet). A hand 3bets via the model's own
    // range first, else flat-calls here, else folds.
    const defenseBB = {};
    Object.entries(CANON_BB_OPENER_BUCKET).forEach(([opener, bucket]) => {
      const b = CANON_BB_DEFENSE[bucket];
      if (!b) return;
      defenseBB[opener] = realizer.realizeTokenRange([...b.call, ...b.threeBet]);
    });
    defenseBB["*"] = realizer.realizeTokenRange([...CANON_BB_DEFENSE.btn.call, ...CANON_BB_DEFENSE.btn.threeBet]);
    canonLeakFixCache = sanitizeRealizedRanges({ defense: { BB: defenseBB } });
    return canonLeakFixCache;
  }

  function normalizeBotStrategyModel(model, tier = "") {
    if (!model || typeof model !== "object") return null;
    const id = String(model.id || "").trim();
    if (!id) return null;
    const difficulty = normalizeDifficulty(model.difficulty || (tier === "top" ? "pro" : tier === "weak" ? "easy" : "standard"));
    const style = String(model.style || model.archetype || (difficulty === "pro" ? "reg" : difficulty === "easy" ? "fish" : "reg")).trim();
    const minPlayers = strategyPlayerCountOrNull(model.minPlayers);
    const maxPlayers = strategyPlayerCountOrNull(model.maxPlayers);
    const evidence = model.arenaEvidence && typeof model.arenaEvidence === "object" ? model.arenaEvidence : {};
    const anteBb = Number(model.anteBb ?? evidence.anteBb);
    const requiresAnte = Boolean(model.requiresAnte || (Number.isFinite(anteBb) && anteBb > 0));
    const stackBounds = strategyStackDepthBoundsForModel(model, evidence);
    const packRealizedRanges = sanitizeRealizedRanges(model.packRealizedRanges);
    const ownRealizedRanges = mergeRealizedRanges(model.realizedRanges, packRealizedRanges);
    // Pro bots without their own realized ranges inherit the canon BB-defense leak-fix so
    // they defend correctly vs a skilled opponent in every dimension (less exploitable).
    const leakFixRanges = (!ownRealizedRanges && difficulty === "pro") ? canonLeakFixRealizedRanges() : null;
    const realizedRanges = ownRealizedRanges || leakFixRanges;
    const botPack = sanitizeBotPackMetadata(model.botPack);
    const packSeat = sanitizeBotPackSeatMetadata(model.packSeat);
    const packLeakTags = sanitizeStringList(model.packLeakTags || model.leakTags || packSeat?.leakTags, 24, 48);
    const packProduction = sanitizeStrategyProduction(model.packProduction);
    return {
      id,
      label: String(model.label || id).slice(0, 48),
      tier: String(model.tier || tier || difficulty).slice(0, 24),
      role: String(model.role || "").slice(0, 48),
      difficulty,
      style,
      archetype: String(model.archetype || style || "reg").slice(0, 24),
      tableTypes: Array.isArray(model.tableTypes)
        ? model.tableTypes.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6)
        : [],
      minPlayers,
      maxPlayers,
      baseModelId: String(model.baseModelId || model.sourceModelId || "").trim() || null,
      sourceModelId: String(model.sourceModelId || model.baseModelId || "").trim() || null,
      tableSizePlayers: strategyPlayerCountOrNull(model.tableSizePlayers),
      stackDepthBucket: normalizeBotStrategyStackBucket(model.stackDepthBucket || model.stackBucket || evidence.stackDepthBucket || evidence.stackBucket),
      anteBb: Number.isFinite(anteBb) && anteBb > 0 ? roundBbValue(anteBb) : 0,
      requiresAnte,
      minStackDepthBb: stackBounds.minStackDepthBb,
      maxStackDepthBb: stackBounds.maxStackDepthBb,
      production: sanitizeStrategyProduction(model.production),
      // Stat-driven realizer output (opt-in). `realizedRanges` is a precomputed
      // membership map; `useRealizedRanges` gates whether the preflop policy
      // prefers it over the hardcoded charts. Both default to inert.
      realizedRanges,
      useRealizedRanges: (Boolean(model.useRealizedRanges) || Boolean(leakFixRanges) || Boolean(packRealizedRanges)) && Boolean(realizedRanges),
      botPack,
      packRole: String(model.packRole || packSeat?.role || "").slice(0, 48),
      packSeat,
      packFocusSkill: String(model.packFocusSkill || packSeat?.focusSkill || "").slice(0, 48),
      packLeakTags,
      packProduction,
      packRealizedRanges
    };
  }

  function botStrategyTableType(settings) {
    const playerTotal = Math.floor(Number(settings?.playerCount || 0));
    if (!Number.isFinite(playerTotal) || playerTotal < 2) return "";
    return playerTotal <= 2 ? "hu" : "nonHu";
  }

  function botStrategyTableAnteBb(settings) {
    if (settings && Object.prototype.hasOwnProperty.call(settings, "bigBlindAnteBb")) {
      const value = Number(settings.bigBlindAnteBb);
      const players = Math.max(2, Number(settings.playerCount || 8));
      return Number.isFinite(value) && value > 0 ? roundBbValue(value / players) : 0;
    }
    if (settings && Object.prototype.hasOwnProperty.call(settings, "anteBb")) {
      const value = Number(settings.anteBb);
      return Number.isFinite(value) && value > 0 ? roundBbValue(value) : 0;
    }
    if (settings?.disableAnte === true || settings?.antes === false) return 0;
    return DEFAULT_STRATEGY_ANTE_BB;
  }

  function botStrategyTableStackDepth(settings) {
    const direct = positiveBbOrNull(settings?.stackDepth);
    if (direct != null) return direct;
    const mode = String(settings?.simulationMode || "").trim().toLowerCase();
    const starting = positiveBbOrNull(settings?.startingStackBb);
    const tournament = positiveBbOrNull(settings?.tournamentStartingStackBb);
    const randomMax = positiveBbOrNull(settings?.randomStackMaxBb);
    const randomMin = positiveBbOrNull(settings?.randomStackMinBb);
    if (mode === "fixed") {
      if (starting != null) return starting;
      if (tournament != null) return tournament;
      if (randomMax != null) return randomMax;
      if (randomMin != null) return randomMin;
      return null;
    }
    if (mode === "random") {
      if (randomMax != null) return randomMax;
      if (randomMin != null) return randomMin;
      if (starting != null) return starting;
      if (tournament != null) return tournament;
      return null;
    }
    if (mode === "tournament") {
      if (tournament != null) return tournament;
      if (starting != null) return starting;
      if (randomMax != null) return randomMax;
      if (randomMin != null) return randomMin;
      return null;
    }
    if (starting != null) return starting;
    if (tournament != null) return tournament;
    if (randomMax != null) return randomMax;
    if (randomMin != null) return randomMin;
    return null;
  }

  function normalizeBotStrategyStackBucket(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (BOT_STRATEGY_STACK_BUCKETS[raw]) return raw;
    if (raw === "pushfold" || raw === "push-fold" || raw === "micro-stack") return "micro";
    if (raw === "shortstack" || raw === "short-stack") return "short";
    if (raw === "middle" || raw === "medium") return "mid";
    if (raw === "deepstack" || raw === "deep-stack") return "deep";
    if (raw === "ultradeep" || raw === "ultra-deep" || raw === "verydeep") return "ultra";
    return "";
  }

  function botStrategyStackBucketForDepth(stackDepth) {
    const depth = positiveBbOrNull(stackDepth);
    if (depth == null) return "";
    if (depth <= BOT_STRATEGY_STACK_BUCKETS.micro.maxStackDepthBb) return "micro";
    if (depth <= BOT_STRATEGY_STACK_BUCKETS.short.maxStackDepthBb) return "short";
    if (depth <= BOT_STRATEGY_STACK_BUCKETS.mid.maxStackDepthBb) return "mid";
    if (depth <= BOT_STRATEGY_STACK_BUCKETS.deep.maxStackDepthBb) return "deep";
    return "ultra";
  }

  function botStrategyTableStackBucket(settings) {
    return botStrategyStackBucketForDepth(botStrategyTableStackDepth(settings));
  }

  function botStrategyStackBucketBounds(bucket) {
    const key = normalizeBotStrategyStackBucket(bucket);
    const config = BOT_STRATEGY_STACK_BUCKETS[key];
    if (!config) return { minStackDepthBb: null, maxStackDepthBb: null };
    return {
      minStackDepthBb: config.minStackDepthBb,
      maxStackDepthBb: config.maxStackDepthBb
    };
  }

  function botStrategySizeLabel(playerCount) {
    const count = Math.floor(Number(playerCount || 0));
    return BOT_STRATEGY_SIZE_LABELS[count] || "";
  }

  function tableSizedStrategyModelForSettings(model, settings) {
    const normalized = normalizeBotStrategyModel(model);
    if (!normalized) return null;
    const playerTotal = Math.floor(Number(settings?.playerCount || 0));
    if (hasExplicitStrategyModelTableContract(normalized)) {
      return playerTotal > 0 && normalized.minPlayers === playerTotal && normalized.maxPlayers === playerTotal
        ? { ...normalized, tableSizePlayers: playerTotal }
        : normalized;
    }

    const sizeLabel = botStrategySizeLabel(playerTotal);
    const tier = String(normalized.tier || "");
    const overlay = BOT_STRATEGY_SIZE_PRODUCTION_OVERLAYS[tier]?.[playerTotal];
    if (!sizeLabel || !overlay) return normalized;

    const tableType = playerTotal <= 2 ? "hu" : "nonHu";
    const baseModelId = normalized.baseModelId || normalized.sourceModelId || normalized.id;
    return {
      ...normalized,
      id: `${baseModelId}-${sizeLabel}`,
      label: `${normalized.label} ${sizeLabel}`.slice(0, 48),
      role: `${normalized.role || normalized.label} ${sizeLabel}`.slice(0, 48),
      baseModelId,
      sourceModelId: normalized.sourceModelId || baseModelId,
      tableSizePlayers: playerTotal,
      tableTypes: [tableType],
      minPlayers: playerTotal,
      maxPlayers: playerTotal,
      production: mergeStrategyProduction(normalized.production, overlay)
    };
  }

  function stackSizedStrategyModelForSettings(model, settings) {
    const normalized = normalizeBotStrategyModel(model);
    if (!normalized) return null;
    if (hasExplicitStrategyModelStackContract(normalized)) return normalized;

    const bucket = botStrategyTableStackBucket(settings);
    const tier = String(normalized.tier || "");
    const overlay = BOT_STRATEGY_STACK_PRODUCTION_OVERLAYS[tier]?.[bucket];
    if (!bucket || !overlay) return normalized;

    const bounds = botStrategyStackBucketBounds(bucket);
    const baseModelId = normalized.baseModelId || normalized.sourceModelId || normalized.id;
    return {
      ...normalized,
      id: `${normalized.id}-${bucket}`,
      label: `${normalized.label} ${bucket}`.slice(0, 48),
      role: `${normalized.role || normalized.label} ${bucket}`.slice(0, 48),
      baseModelId,
      sourceModelId: normalized.sourceModelId || baseModelId,
      stackDepthBucket: bucket,
      minStackDepthBb: bounds.minStackDepthBb,
      maxStackDepthBb: bounds.maxStackDepthBb,
      production: mergeStrategyProduction(normalized.production, overlay)
    };
  }

  function strategyModelForSettings(model, settings) {
    return stackSizedStrategyModelForSettings(tableSizedStrategyModelForSettings(model, settings), settings);
  }

  function hasExplicitStrategyModelConstraints(model) {
    return Boolean(
      model?.tableTypes?.length
      || model?.minPlayers != null
      || model?.maxPlayers != null
      || model?.stackDepthBucket
      || model?.minStackDepthBb != null
      || model?.maxStackDepthBb != null
    );
  }

  function hasExplicitStrategyModelTableContract(model) {
    return Boolean(model?.tableTypes?.length && model?.minPlayers != null && model?.maxPlayers != null);
  }

  function hasExplicitStrategyModelTableConstraints(model) {
    return Boolean(model?.tableTypes?.length || model?.minPlayers != null || model?.maxPlayers != null);
  }

  function hasExplicitStrategyModelStackContract(model) {
    return Boolean(model?.stackDepthBucket || model?.minStackDepthBb != null || model?.maxStackDepthBb != null);
  }

  function botStrategyModelMatchesSettings(model, settings) {
    const normalized = normalizeBotStrategyModel(model);
    if (!normalized) return false;
    return filterStrategyModelsForSettings([normalized], settings).length > 0;
  }

  function filterStrategyModelsForSettings(models, settings) {
    const list = (Array.isArray(models) ? models : [])
      .map((model) => strategyModelForSettings(model, settings))
      .filter(Boolean);
    const tableType = botStrategyTableType(settings);
    const playerTotal = Math.floor(Number(settings?.playerCount || 0));
    const tableAnte = botStrategyTableAnteBb(settings);
    const tableStackDepth = botStrategyTableStackDepth(settings);
    const tableStackBucket = botStrategyTableStackBucket(settings);
    const tableFiltered = list.filter((model) => !tableType || !model.tableTypes?.length || model.tableTypes.includes(tableType));
    const sizedFiltered = tableFiltered.filter((model) => {
      if (!playerTotal) return true;
      if (model.minPlayers != null && playerTotal < model.minPlayers) return false;
      if (model.maxPlayers != null && playerTotal > model.maxPlayers) return false;
      return true;
    });
    const anteFiltered = sizedFiltered.filter((model) => {
      const modelAnte = Number(model?.anteBb || 0);
      if (!(model?.requiresAnte || modelAnte > 0)) return true;
      return tableAnte > 0 && (!modelAnte || Math.abs(modelAnte - tableAnte) <= 0.051);
    });
    const stackFiltered = anteFiltered.filter((model) => {
      if (!(tableStackDepth > 0)) return true;
      if (model.stackDepthBucket && tableStackBucket && model.stackDepthBucket !== tableStackBucket) return false;
      if (model.minStackDepthBb != null && tableStackDepth < model.minStackDepthBb - 0.001) return false;
      if (model.maxStackDepthBb != null && tableStackDepth > model.maxStackDepthBb + 0.001) return false;
      return true;
    });
    const sameTier = new Set(list.map((model) => model?.tier || "")).size <= 1;
    if (sameTier && !playerTotal) {
      const tableAgnostic = stackFiltered.filter((model) => !hasExplicitStrategyModelTableConstraints(model));
      if (tableAgnostic.length) return tableAgnostic;
    }
    const exactSized = stackFiltered.filter((model) =>
      playerTotal
      && model.minPlayers === playerTotal
      && model.maxPlayers === playerTotal
    );
    const exactTop = exactSized.filter((model) => model?.tier === "top");
    if (sameTier && exactTop.length) return exactTop;
    if (!sameTier && playerTotal) {
      const grouped = new Map();
      stackFiltered.forEach((model) => {
        const tier = model?.tier || "";
        if (!grouped.has(tier)) grouped.set(tier, []);
        grouped.get(tier).push(model);
      });
      return Array.from(grouped.values()).flatMap((tierModels) => {
        const tierExactSized = tierModels.filter((model) =>
          model.minPlayers === playerTotal && model.maxPlayers === playerTotal
        );
        if (tierExactSized.length) return tierExactSized;
        const tierExplicit = tierModels.filter(hasExplicitStrategyModelConstraints);
        return tierExplicit.length ? tierExplicit : tierModels;
      });
    }
    const explicitSized = stackFiltered.filter(hasExplicitStrategyModelConstraints);
    if (sameTier && explicitSized.length) return explicitSized;
    return stackFiltered;
  }

  function botStrategyFilterSettingsKey(settings) {
    return [
      botStrategyTableType(settings),
      Math.floor(Number(settings?.playerCount || 0)) || 0,
      botStrategyTableAnteBb(settings),
      botStrategyTableStackDepth(settings) || 0,
      botStrategyTableStackBucket(settings)
    ].join("|");
  }

  function cachedFilteredBotStrategyModels(cacheKey, models, settings) {
    const index = cachedBotStrategyModelIndex();
    if (!botStrategyFilteredModelCache || botStrategyFilteredModelCache.version !== index.version) {
      botStrategyFilteredModelCache = { version: index.version, entries: new Map() };
    }
    const key = `${cacheKey}|${botStrategyFilterSettingsKey(settings)}`;
    if (!botStrategyFilteredModelCache.entries.has(key)) {
      if (botStrategyFilteredModelCache.entries.size >= BOT_STRATEGY_FILTER_CACHE_MAX_ENTRIES) {
        botStrategyFilteredModelCache.entries.clear();
      }
      botStrategyFilteredModelCache.entries.set(key, filterStrategyModelsForSettings(models, settings));
    }
    return (botStrategyFilteredModelCache.entries.get(key) || EMPTY_BOT_STRATEGY_MODELS).slice();
  }

  function cachedFilteredBotStrategyTierModels(tier, settings) {
    const key = String(tier || "");
    const models = cachedBotStrategyModelIndex().tierModels[key] || EMPTY_BOT_STRATEGY_MODELS;
    return cachedFilteredBotStrategyModels(`tier:${key}`, models, settings);
  }

  function cachedFilteredAllBotStrategyModels(settings) {
    return cachedFilteredBotStrategyModels("all", cachedBotStrategyModelIndex().allModels, settings);
  }

  function cachedFilteredBotStrategyModelsByIds(ids, settings) {
    const modelIds = (Array.isArray(ids) ? ids : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    const models = modelIds.map((id) => findBotStrategyModelById(id)).filter(Boolean);
    if (!models.length) return [];
    return cachedFilteredBotStrategyModels(`ids:${modelIds.join(",")}`, models, settings);
  }

  function shuffledCopy(items) {
    const copy = (Array.isArray(items) ? items : []).slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      const next = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = next;
    }
    return copy;
  }

  function drawBotStrategyModel(tier, settings = null) {
    const models = cachedFilteredBotStrategyTierModels(tier, settings);
    return models.length ? models[randomInt(models.length)] : null;
  }

  function repeatedShuffledModels(tier, count, settings = null) {
    const models = cachedFilteredBotStrategyTierModels(tier, settings);
    return models.length ? repeatedShuffledModelList(models, count) : emptyStrategyModelPlan(count);
  }

  function botStrategyModelsForTier(tier) {
    return (cachedBotStrategyModelIndex().tierModels[tier] || EMPTY_BOT_STRATEGY_MODELS).slice();
  }

  function allBotStrategyModels() {
    return cachedBotStrategyModelIndex().allModels.slice();
  }

  function findBotStrategyModelById(id) {
    const target = String(id || "").trim();
    if (!target) return null;
    return cachedBotStrategyModelIndex().byId.get(target) || null;
  }

  function selectableExactBotStrategyModelById(id, settings = null) {
    const target = String(id || "").trim();
    if (!target) return null;

    const direct = findBotStrategyModelById(target);
    if (direct) {
      const filtered = filterStrategyModelsForSettings([direct], settings)
        .filter(hasExplicitStrategyModelTableContract);
      if (filtered.length) return filtered[0];
    }

    const playerTotal = Math.floor(Number(settings?.playerCount || 0));
    const sizeLabel = botStrategySizeLabel(playerTotal);
    if (sizeLabel && target.endsWith(`-${sizeLabel}`)) {
      const baseId = target.slice(0, -sizeLabel.length - 1);
      const baseModel = findBotStrategyModelById(baseId);
      const sizedModel = tableSizedStrategyModelForSettings(baseModel, settings);
      const currentModel = strategyModelForSettings(baseModel, settings);
      if (
        sizedModel?.id === target &&
        hasExplicitStrategyModelTableContract(currentModel) &&
        filterStrategyModelsForSettings([currentModel], settings).length > 0
      ) {
        return currentModel;
      }
    }

    for (const model of allBotStrategyModels()) {
      const sizedModel = tableSizedStrategyModelForSettings(model, settings);
      const currentModel = strategyModelForSettings(model, settings);
      if (
        (sizedModel?.id === target || currentModel?.id === target) &&
        hasExplicitStrategyModelTableContract(currentModel) &&
        filterStrategyModelsForSettings([currentModel], settings).length > 0
      ) {
        return currentModel;
      }
    }
    return null;
  }

  function repeatedShuffledModelList(models, count) {
    const selected = [];
    while (selected.length < count && models.length) {
      shuffledCopy(models).forEach((model) => {
        if (selected.length < count) selected.push(model);
      });
    }
    return selected;
  }

  function emptyStrategyModelPlan(count) {
    return Array.from({ length: Math.max(0, Math.floor(Number(count || 0))) }, () => null);
  }

  function createBotStrategyPoolPlan(pool, count, settings = null) {
    const normalizedPool = normalizeBotStrategyPool(pool);
    if (normalizedPool === "auto") return null;
    if (normalizedPool.startsWith("model:")) {
      const model = selectableExactBotStrategyModelById(normalizedPool.slice(6), settings);
      if (!model) return emptyStrategyModelPlan(count);
      return Array.from({ length: count }, () => model);
    }
    const tableModels = normalizedPool === "mixed"
      ? cachedFilteredAllBotStrategyModels(settings)
      : cachedFilteredBotStrategyTierModels(normalizedPool, settings);
    return tableModels.length ? repeatedShuffledModelList(tableModels, count) : emptyStrategyModelPlan(count);
  }

  function cachedBotStrategyModelPicker(settings = null) {
    const cache = new Map();
    const modelsForTier = (tier) => {
      const key = String(tier || "");
      if (!cache.has(key)) cache.set(key, cachedFilteredBotStrategyTierModels(key, settings));
      return cache.get(key) || [];
    };
    return {
      draw(tier) {
        const models = modelsForTier(tier);
        return models.length ? models[randomInt(models.length)] : null;
      },
      repeated(tier, count) {
        const models = modelsForTier(tier);
        return models.length ? repeatedShuffledModelList(models, count) : emptyStrategyModelPlan(count);
      }
    };
  }

  // Resolve stakes roles through per-plan caches. Role-pinned pools fall back
  // to a tier only when their pinned ids are absent, not when table/size policy
  // rejects those pinned models for the current table.
  function cachedStakesRoleModelPicker(settings = null) {
    const roleCache = new Map();
    const tierCache = new Map();
    const modelsForTier = (tier) => {
      const key = String(tier || "");
      if (!tierCache.has(key)) tierCache.set(key, cachedFilteredBotStrategyTierModels(key, settings));
      return tierCache.get(key) || [];
    };
    const modelsForRole = (role) => {
      const key = String(role || "");
      if (roleCache.has(key)) return roleCache.get(key) || [];
      let models = [];
      if (key === "top") {
        models = modelsForTier("top");
      } else {
        const ids = STAKES_ROLE_MODELS[key] || [];
        const pinned = ids.map((id) => findBotStrategyModelById(id)).filter(Boolean);
        const filtered = cachedFilteredBotStrategyModelsByIds(ids, settings);
        if (filtered.length) models = filtered;
        else if (pinned.length) models = [];
        else models = modelsForTier(key === "fishPassive" || key === "fishSpew" ? "weak" : "standard");
      }
      roleCache.set(key, models);
      return models;
    };
    return {
      draw(role) {
        const models = modelsForRole(role);
        return models.length ? models[randomInt(models.length)] : null;
      }
    };
  }

  // Build the ordered list of seat ROLES for a stakes level, scaled to the bot
  // count and clamped for short-handed tables. Returns role keys, shuffled so
  // the strong/weak seats are not always in the same chair.
  function stakesRolePlan(level, count) {
    const n = Math.max(0, Math.floor(Number(count || 0)));
    if (!n) return [];
    const roles = [];
    const pushN = (role, times) => {
      for (let index = 0; index < times; index += 1) roles.push(role);
    };
    const randomFish = () => (randomUnit() < 0.5 ? "fishPassive" : "fishSpew");

    if (level === "micro") {
      // No top seats at all. The rest is mid regs plus a fish majority, split
      // between passive limpers (-10bb) and spew potters (-40..-50bb).
      const mid = Math.min(n, Math.round(n * 0.4));
      const fish = n - mid;
      const spew = fish >= 2 ? Math.max(1, Math.round(fish * 0.4)) : fish >= 1 ? randomInt(2) : 0;
      const passive = fish - spew;
      pushN("mid", mid);
      pushN("fishPassive", passive);
      pushN("fishSpew", spew);
    } else if (level === "mid") {
      // 1-2 strong regs, 1-2 fish (random passive/spew), the rest mid regs.
      let top = n >= 5 ? 1 + randomInt(2) : n >= 2 ? 1 : 0;
      let fish = n >= 4 ? 1 + randomInt(2) : n >= 3 ? 1 : 0;
      top = Math.min(top, n);
      fish = Math.min(fish, Math.max(0, n - top));
      const mid = Math.max(0, n - top - fish);
      pushN("top", top);
      for (let index = 0; index < fish; index += 1) roles.push(randomFish());
      pushN("mid", mid);
    } else {
      // high: almost all top regs, 1-2 nit regs (-3bb), at most one fish.
      let fish = n >= 5 ? randomInt(2) : 0;
      let nit = n >= 6 ? 1 + randomInt(2) : n >= 3 ? 1 : 0;
      fish = Math.min(fish, n);
      nit = Math.min(nit, Math.max(0, n - fish));
      let top = n - fish - nit;
      if (top < 1 && n >= 1) {
        // Always keep at least one top seat at high stakes.
        if (nit > 0) nit -= 1;
        else if (fish > 0) fish -= 1;
        top = n - fish - nit;
      }
      pushN("top", Math.max(0, top));
      pushN("nitReg", nit);
      for (let index = 0; index < fish; index += 1) roles.push(randomFish());
    }

    return shuffledCopy(roles).slice(0, n);
  }

  function createStakesModelPlan(level, count, settings = null) {
    const normalized = normalizeStakesLevel(level);
    if (!normalized) return null;
    const roles = stakesRolePlan(normalized, count);
    if (!roles.length) return null;
    const picker = cachedStakesRoleModelPicker(settings);
    return roles.map((role) => picker.draw(role));
  }

  function botPackSeatSpecs(pack) {
    const seats = Array.isArray(pack?.runtime?.seats) ? pack.runtime.seats : [];
    const expanded = [];
    seats.forEach((seat) => {
      const weight = Math.max(1, Math.min(24, Math.floor(Number(seat?.weight || 1))));
      for (let index = 0; index < weight; index += 1) expanded.push(seat);
    });
    return expanded;
  }

  function modelForBotPackSeat(seatSpec, settings = null) {
    const ids = sanitizeStringList(seatSpec?.modelIds, 12, 80);
    if (ids.length) {
      const pinned = cachedFilteredBotStrategyModelsByIds(ids, settings);
      if (pinned.length) return pinned[randomInt(pinned.length)];
    }
    const tier = ["top", "standard", "weak"].includes(String(seatSpec?.tier || "")) ? String(seatSpec.tier) : "standard";
    const tierModels = cachedFilteredBotStrategyTierModels(tier, settings);
    return tierModels.length ? tierModels[randomInt(tierModels.length)] : null;
  }

  function attachBotPackMetadataToModel(model, pack, seatSpec) {
    if (!model || !pack || !seatSpec) return model || null;
    const packKey = normalizeBotPack(pack.key);
    const seatMeta = sanitizeBotPackSeatMetadata({
      role: seatSpec.role,
      tier: seatSpec.tier,
      style: seatSpec.style,
      difficulty: seatSpec.difficulty,
      focusSkill: seatSpec.profile?.focusSkill,
      leakTags: seatSpec.profile?.leakTags
    });
    const packProduction = sanitizeStrategyProduction(seatSpec.profile?.production || seatSpec.production);
    const packRealizedRanges = sanitizeRealizedRanges(seatSpec.profile?.realizedRanges || seatSpec.realizedRanges);
    const realizedRanges = mergeRealizedRanges(model.realizedRanges, packRealizedRanges);
    return {
      ...model,
      difficulty: normalizeDifficulty(seatSpec.difficulty || model.difficulty),
      style: String(seatSpec.style || model.style || "reg").slice(0, 24),
      archetype: String(seatSpec.style || model.archetype || model.style || "reg").slice(0, 24),
      production: mergeStrategyProduction(model.production, packProduction),
      realizedRanges: realizedRanges || model.realizedRanges,
      useRealizedRanges: Boolean(model.useRealizedRanges || realizedRanges),
      packProduction,
      packRealizedRanges,
      botPack: {
        key: packKey,
        label: String(pack.label || packKey).slice(0, 80),
        difficultyBand: String(pack.difficultyBand || "").slice(0, 24),
        productGoal: String(pack.productGoal || "").slice(0, 180)
      },
      packRole: String(seatSpec.role || "").slice(0, 48),
      packSeat: seatMeta,
      packFocusSkill: String(seatMeta?.focusSkill || "").slice(0, 48),
      packLeakTags: sanitizeStringList([...(seatMeta?.leakTags || []), ...(Array.isArray(pack.leaks) ? pack.leaks : [])], 24, 48)
    };
  }

  function createBotPackModelPlan(packKey, count, settings = null) {
    const normalized = normalizeBotPack(packKey);
    if (!normalized) return null;
    const pack = botPackDefinition(normalized);
    if (!pack || pack.runtime?.legacyLineup) return null;
    const n = Math.max(0, Math.floor(Number(count || 0)));
    if (!n) return [];
    const seatSpecs = botPackSeatSpecs(pack);
    if (!seatSpecs.length) return emptyStrategyModelPlan(n);
    const planSpecs = repeatedShuffledModelList(shuffledCopy(seatSpecs), n);
    return planSpecs.map((seatSpec) => attachBotPackMetadataToModel(modelForBotPackSeat(seatSpec, settings), pack, seatSpec));
  }

  function createBotStrategyModelPlan(settings, botCount) {
    const count = Math.max(0, Math.floor(Number(botCount || 0)));
    const difficulty = normalizeDifficulty(settings?.difficulty);
    const lineup = normalizeBotLineup(settings?.botLineup);
    const plan = Array.from({ length: count }, () => null);
    if (!count) return plan;

    const botPackPlan = createBotPackModelPlan(settings?.botPack || settings?.botPackId || settings?.botOpponentPack, count, settings);
    if (botPackPlan) return botPackPlan;

    // Stakes Difficulty v1 is the primary path when a stakes level is set. The
    // legacy difficulty/lineup/pool logic below stays intact for back-compat
    // and for the settings that never set a stakes level (e.g. engine smokes).
    const stakesPlan = createStakesModelPlan(settings?.stakesLevel, count, settings);
    if (stakesPlan) return stakesPlan;

    const overridePlan = createBotStrategyPoolPlan(settings?.botStrategyPool, count, settings);
    if (overridePlan) return overridePlan;
    const picker = cachedBotStrategyModelPicker(settings);

    if (difficulty === "pro") {
      return picker.repeated("top", count);
    }

    if (difficulty === "easy") {
      // Easy tables stay weak-dominant. Top-tier bots are a minority "challenge"
      // sprinkle that only appears once the table is full enough for them to stay
      // outnumbered. We never force one short-handed (heads-up / 3-max): with a
      // single bot a forced top seat IS the whole opposition, so "easy" would
      // play like "pro" and almost never reach showdown.
      const topMax = count >= 5 ? Math.min(count, lineup === "soft" ? 1 : 2) : count >= 4 ? 1 : 0;
      const topMin = count >= 5 ? 1 : 0;
      const topCount = topMin + (topMax > topMin ? randomInt(topMax - topMin + 1) : 0);
      const topSeats = new Set(shuffledCopy(Array.from({ length: count }, (_, index) => index)).slice(0, topCount));
      for (let index = 0; index < count; index += 1) {
        plan[index] = topSeats.has(index) ? picker.draw("top") : picker.draw("weak");
      }
      return plan;
    }

    const topWeight = lineup === "tough" ? 0.45 : lineup === "soft" ? 0.2 : 0.32;
    const weakWeight = lineup === "tough" ? 0.08 : lineup === "soft" ? 0.34 : 0.18;
    for (let index = 0; index < count; index += 1) {
      const roll = randomUnit();
      const tier = roll < topWeight ? "top" : roll < topWeight + weakWeight ? "weak" : "standard";
      plan[index] = picker.draw(tier);
    }
    return plan;
  }

  function carryoverReplacementStrategyModel(carriedProfile, settings, fallbackModel = null) {
    const carriedModel = normalizeBotStrategyModel(carriedProfile?.strategyModel);
    if (!carriedModel) return fallbackModel;
    const tier = String(carriedModel.tier || "").trim();
    if (!tier) return fallbackModel;

    const candidates = cachedFilteredBotStrategyTierModels(tier, settings);
    if (!candidates.length) return fallbackModel;

    const carriedBaseId = carriedModel.baseModelId || carriedModel.sourceModelId || carriedModel.id;
    const sameBase = candidates.find((model) =>
      (model.baseModelId || model.sourceModelId || model.id) === carriedBaseId
    );
    if (sameBase) return carryBotPackMetadata(carriedModel, sameBase);

    const sameStyle = candidates.filter((model) =>
      model.style === carriedModel.style || model.archetype === carriedModel.archetype
    );
    if (sameStyle.length) return carryBotPackMetadata(carriedModel, sameStyle[randomInt(sameStyle.length)]);

    return carryBotPackMetadata(carriedModel, candidates[randomInt(candidates.length)] || fallbackModel);
  }

  function carryBotPackMetadata(sourceModel, targetModel) {
    if (!targetModel || !sourceModel?.botPack) return targetModel || null;
    const packProduction = sanitizeStrategyProduction(sourceModel.packProduction);
    const packRealizedRanges = sanitizeRealizedRanges(sourceModel.packRealizedRanges);
    const targetAlreadyCarriesPackProduction = strategyProductionEquals(targetModel.packProduction, packProduction);
    const realizedRanges = mergeRealizedRanges(targetModel.realizedRanges, packRealizedRanges);
    return {
      ...targetModel,
      difficulty: sourceModel.difficulty || targetModel.difficulty,
      style: sourceModel.style || targetModel.style,
      archetype: sourceModel.archetype || targetModel.archetype,
      production: Object.keys(packProduction).length && !targetAlreadyCarriesPackProduction
        ? mergeStrategyProduction(targetModel.production, packProduction)
        : targetModel.production,
      realizedRanges: realizedRanges || targetModel.realizedRanges,
      useRealizedRanges: Boolean(targetModel.useRealizedRanges || realizedRanges),
      botPack: sourceModel.botPack,
      packRole: sourceModel.packRole || "",
      packSeat: sourceModel.packSeat || null,
      packFocusSkill: sourceModel.packFocusSkill || "",
      packLeakTags: Array.isArray(sourceModel.packLeakTags) ? sourceModel.packLeakTags.slice() : [],
      packProduction,
      packRealizedRanges
    };
  }

  function adaptStrategyModelToSettings(model, settings, fallbackModel = null) {
    const normalized = normalizeBotStrategyModel(model);
    const fallback = normalizeBotStrategyModel(fallbackModel);
    if (!normalized) {
      return fallback && botStrategyModelMatchesSettings(fallback, settings)
        ? strategyModelForSettings(fallback, settings)
        : null;
    }
    const currentModel = strategyModelForSettings(normalized, settings);
    if (currentModel && botStrategyModelMatchesSettings(currentModel, settings)) return carryBotPackMetadata(normalized, currentModel);
    const replacement = carryoverReplacementStrategyModel({ strategyModel: normalized }, settings, null);
    if (replacement) return carryBotPackMetadata(normalized, replacement);
    return fallback && botStrategyModelMatchesSettings(fallback, settings)
      ? carryBotPackMetadata(normalized, strategyModelForSettings(fallback, settings))
      : null;
  }

  function botStrategyModelRequiredForSettings(settings) {
    if (normalizeStakesLevel(settings?.stakesLevel)) return true;
    if (normalizeBotStrategyPool(settings?.botStrategyPool) !== "auto") return true;
    return normalizeDifficulty(settings?.difficulty) === "pro";
  }

  function botStrategyPoolLabel(value) {
    const pool = normalizeBotStrategyPool(value);
    if (pool === "top") return "top-пул";
    if (pool === "standard") return "standard-пул";
    if (pool === "weak") return "weak-пул";
    if (pool === "mixed") return "все модели";
    if (pool.startsWith("model:")) {
      const model = findBotStrategyModelById(pool.slice(6));
      return model ? model.label : pool.slice(6);
    }
    return "авто-стратегии";
  }

  function botLineupLabel(value) {
    const lineup = normalizeBotLineup(value);
    if (lineup === "mixed") return "смешанный стол";
    if (lineup === "soft") return "мягкий состав";
    if (lineup === "tough") return "жесткий состав";
    return "скрытые типажи";
  }

  function shouldUseThirdLeagueBotOverlay(settings) {
    return Number(settings?.trainingLeague) === 3 || settings?.botPolicyOverlay === "third_league";
  }

  function thirdLeagueBotOverlayForSeat(settings, seatIndex) {
    if (!shouldUseThirdLeagueBotOverlay(settings)) return null;
    const numericIndex = Math.max(1, Number(seatIndex || 1));
    return THIRD_LEAGUE_BOT_OVERLAYS[(numericIndex - 1) % THIRD_LEAGUE_BOT_OVERLAYS.length] || null;
  }

  function applyThirdLeagueBotOverlay(profile, settings, seatIndex) {
    const overlay = thirdLeagueBotOverlayForSeat(settings, seatIndex);
    if (!overlay) return profile;
    const preflop = { ...(overlay.preflop || {}) };
    const postflop = { ...(overlay.postflop || {}) };
    return {
      ...profile,
      trainingLeague: 3,
      policyOverlay: {
        key: overlay.key,
        levelBand: overlay.levelBand,
        source: overlay.source,
        focusSkill: overlay.focusSkill,
        weakTags: overlay.weakTags.slice(),
        preflop,
        postflop
      },
      learning: {
        ...(profile.learning || {}),
        preflopAggressionAdjustment: Number(preflop.threeBet || 0)
      }
    };
  }

  function missingBotStrategyProfile(settings, seatIndex) {
    return applyThirdLeagueBotOverlay({
      archetype: "strategy-missing",
      difficulty: normalizeDifficulty(settings?.difficulty),
      style: "strategy-missing",
      label: "strategy model unavailable",
      strategyModel: null,
      strategyModelRequired: true,
      strategyModelMissing: true
    }, settings, seatIndex);
  }

  function chooseBotProfile(settings, seatIndex, strategyModel = null, options = {}) {
    const lineup = normalizeBotLineup(settings?.botLineup);
    const roster = BOT_ARCHETYPE_ROSTERS[lineup] || BOT_ARCHETYPE_ROSTERS.mixed;
    const key = roster[Math.max(0, Number(seatIndex || 1) - 1) % roster.length] || "reg";
    const model = normalizeBotStrategyModel(strategyModel);
    if (!model && options?.strategyModelRequired) {
      return missingBotStrategyProfile(settings, seatIndex);
    }
    const modelStyle = model?.style || "";
    const modelArchetype = model?.archetype || modelStyle;
    const archetype = BOT_ARCHETYPES[modelArchetype] || BOT_ARCHETYPES[modelStyle] || BOT_ARCHETYPES[key] || BOT_ARCHETYPES.reg;
    const profile = {
      archetype: model?.archetype || archetype.key,
      difficulty: model?.difficulty || archetype.difficulty,
      style: model?.style || archetype.style,
      label: model ? `${botStyleLabel(model.style)} / ${model.label}` : botStyleLabel(archetype.style),
      strategyModel: model,
      botPack: model?.botPack || null,
      packRole: model?.packRole || "",
      packFocusSkill: model?.packFocusSkill || "",
      packLeakTags: Array.isArray(model?.packLeakTags) ? model.packLeakTags.slice() : []
    };
    if (lineup === "tough" && profile.archetype === "station") {
      profile.difficulty = "standard";
    }
    return applyThirdLeagueBotOverlay(profile, settings, seatIndex);
  }

  function botStyleLabel(style) {
    if (style === "fish") return "fish";
    if (style === "nit") return "nit";
    if (style === "passive") return "пассивный";
    if (style === "aggro") return "агрессивный";
    if (style === "station") return "телефон";
    return "reg";
  }

  function botNicknameSeed(value) {
    const text = String(value || "");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  // Resolve a style-flavoured nickname that is unique within the table. `style`
  // comes from the seat's bot profile (so it reflects the model the seat runs);
  // unknown styles (e.g. "strategy-missing") fall back to the reg pool. The
  // `usedNames` set is shared across the table — pass the same set for every
  // seat so two same-style bots never collide. `seedKey` rotates the starting
  // point by table/hand/seat/model; normal table seeds use disjoint slots for the
  // first four table ids, which keeps visible multi-table layouts from repeating
  // the same style nickname beside itself.
  function pickBotNickname(style, usedNames, seedKey = "") {
    const used = (usedNames && typeof usedNames.has === "function" && typeof usedNames.add === "function")
      ? usedNames
      : new Set();
    const pool = BOT_NICKNAMES[style] || BOT_NICKNAMES.reg || OPPONENT_NAMES;
    const hashStart = pool.length ? botNicknameSeed(`${style}:${seedKey}`) % pool.length : 0;
    const seedParts = String(seedKey || "").split(":");
    const tableId = Number(seedParts[0]);
    const handNo = Number(seedParts[1]);
    const seatIndex = Number(seedParts[2]);
    let start = hashStart;
    if (pool.length >= 32 && Number.isFinite(tableId) && Number.isFinite(seatIndex)) {
      const tableSlot = Math.max(0, Math.floor(tableId) - 1) % 4;
      const seatSlot = Math.max(0, Math.floor(seatIndex) - 1) % 8;
      const handOffset = Number.isFinite(handNo) ? (Math.max(0, Math.floor(handNo)) % pool.length) : hashStart;
      start = (handOffset + tableSlot * 8 + seatSlot) % pool.length;
    }
    for (let i = 0; i < pool.length; i += 1) {
      const candidate = pool[(start + i) % pool.length];
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
    const base = pool[0] || OPPONENT_NAMES[0] || "Бот";
    let suffix = 2;
    let candidate = `${base} ${suffix}`;
    while (used.has(candidate)) {
      suffix += 1;
      candidate = `${base} ${suffix}`;
    }
    used.add(candidate);
    return candidate;
  }

  function difficultyForSeat(settings, seat) {
    return normalizeDifficulty(seat?.botProfile?.difficulty || settings?.difficulty);
  }

  function styleForSeat(seat) {
    return seat?.botProfile?.style || seat?.botProfile?.archetype || "reg";
  }

  function botArchetype(style) {
    const normalized = String(style || "reg").toLowerCase();
    if (BOT_ARCHETYPES[normalized]) return BOT_ARCHETYPES[normalized];
    if (normalized === "passive") return BOT_ARCHETYPES.nit;
    return BOT_ARCHETYPES.reg;
  }

  function botPreflopTrait(style, key) {
    return Number(botArchetype(style)?.preflop?.[key] || 0);
  }

  function botStrategyPreflopFrequencyAdjustment(difficulty, key) {
    const adjustments = BOT_STRATEGY_PROFILE.preflopFrequency?.[normalizeDifficulty(difficulty)];
    const value = adjustments && typeof adjustments === "object" ? Number(adjustments[key]) : 0;
    return Number.isFinite(value) ? value : 0;
  }

  function botStrategyModelProduction(seat) {
    const production = seat?.botProfile?.strategyModel?.production;
    return production && typeof production === "object" ? production : null;
  }

  function botStrategyArenaTop(difficulty) {
    if (normalizeDifficulty(difficulty) !== "pro") return null;
    const top = BOT_STRATEGY_PROFILE.arena?.top;
    return top && typeof top === "object" ? top : null;
  }

  function botStrategyArenaProductionAdjustments(difficulty, seat = null) {
    const modelProduction = botStrategyModelProduction(seat);
    if (modelProduction) return modelProduction;
    const production = botStrategyArenaTop(difficulty)?.production;
    return production && typeof production === "object" ? production : {};
  }

  function botStrategyArenaProductionAdjustment(difficulty, key, seat = null) {
    const value = Number(botStrategyArenaProductionAdjustments(difficulty, seat)[key]);
    return Number.isFinite(value) ? value : 0;
  }

  function botLearningPreflopAdjustment(seat, key) {
    const learning = seat?.botProfile?.learning;
    if (!learning || typeof learning !== "object") return 0;
    if (key !== "threeBet") return 0;
    // Bot policy lives in the engine: derive the preflop aggression adjustment
    // from the raw observed re-raise rates the UI feeds in (it used to compute
    // this threshold itself and inject the result — a UI→engine policy leak).
    // A villain that has shown it re-raises (4-bet/5-bet+) a lot makes our bots
    // 3-bet/4-bet it less.
    if (learning.fiveBetPlusRate != null || learning.fourBetPlusRate != null) {
      if (Number(learning.fiveBetPlusRate || 0) >= 0.08) return -0.35;
      if (Number(learning.fourBetPlusRate || 0) >= 0.14) return -0.2;
      return 0;
    }
    // League-3 training overlays still set the adjustment directly (no rates).
    return Number(learning.preflopAggressionAdjustment || 0);
  }

  function botPostflopTrait(style, key) {
    return Number(botArchetype(style)?.postflop?.[key] || 0);
  }

  const packLoadState = {
    attempted: false,
    loaded: false,
    source: "builtin",
    count: 0,
    error: ""
  };

  const PACKS = {
    "basic-vpip": {
      name: "Базовый VPIP v0",
      stackDepths: [24, 32, 40, 55, 72],
      playableWeight: 0.74,
      spots: [
        {
          key: "btn-open",
          title: "BTN first in",
          heroPosition: "BTN",
          activeVillain: 5,
          villainPosition: "BB",
          startPot: 1.5,
          toCall: 0,
          canCheck: false,
          branch: ["UTG fold", "HJ fold", "CO fold"],
          prompt: "Первый вход с баттона"
        },
        {
          key: "bb-defense",
          title: "BB defense vs BTN",
          heroPosition: "BB",
          activeVillain: 3,
          villainPosition: "BTN",
          startPot: 3.7,
          toCall: 1.2,
          canCheck: false,
          branch: ["UTG fold", "HJ fold", "CO fold", "BTN open 2.2 BB", "SB fold"],
          prompt: "Защита BB против стила"
        },
        {
          key: "co-call",
          title: "CO vs HJ open",
          heroPosition: "CO",
          activeVillain: 2,
          villainPosition: "HJ",
          startPot: 3.7,
          toCall: 2.2,
          canCheck: false,
          branch: ["UTG fold", "HJ open 2.2 BB"],
          prompt: "Решение против HJ open"
        },
        {
          key: "bb-check",
          title: "BB check option",
          heroPosition: "BB",
          activeVillain: 1,
          villainPosition: "SB",
          startPot: 2,
          toCall: 0,
          canCheck: true,
          branch: ["UTG fold", "HJ fold", "CO fold", "BTN fold", "SB complete"],
          prompt: "Опция чека в BB"
        }
      ]
    },
    "short-stack-pressure": {
      name: "Short stack pressure v0",
      stackDepths: [16, 20, 24, 30],
      playableWeight: 0.82,
      spots: [
        {
          key: "btn-short-open",
          title: "BTN 20 BB first in",
          heroPosition: "BTN",
          activeVillain: 5,
          villainPosition: "BB",
          startPot: 1.5,
          toCall: 0,
          canCheck: false,
          branch: ["UTG fold", "HJ fold", "CO fold"],
          prompt: "Короткий стек: open или push"
        },
        {
          key: "bb-vs-sb-jam",
          title: "BB vs SB jam",
          heroPosition: "BB",
          activeVillain: 1,
          villainPosition: "SB",
          startPot: 17.5,
          toCall: 14.5,
          canCheck: false,
          branch: ["UTG fold", "HJ fold", "CO fold", "BTN fold", "SB shove 15 BB"],
          prompt: "Короткий стек: call или fold"
        },
        {
          key: "co-short-open",
          title: "CO 24 BB first in",
          heroPosition: "CO",
          activeVillain: 3,
          villainPosition: "BTN",
          startPot: 1.5,
          toCall: 0,
          canCheck: false,
          branch: ["UTG fold", "HJ fold"],
          prompt: "CO first in с коротким стеком"
        }
      ]
    },
    "postflop-srp": {
      name: "Postflop SRP v0",
      stackDepths: [38, 50, 65, 80],
      playableWeight: 0.68,
      spots: [
        {
          key: "btn-vs-bb-flop",
          title: "BTN vs BB flop",
          heroPosition: "BTN",
          activeVillain: 5,
          villainPosition: "BB",
          startPot: 5.2,
          toCall: 0,
          canCheck: true,
          startStreet: "flop",
          boardCards: 3,
          branch: ["BTN open 2.2 BB", "BB call", "Flop"],
          prompt: "SRP IP: c-bet или check back"
        },
        {
          key: "bb-vs-btn-donk",
          title: "BB vs BTN flop",
          heroPosition: "BB",
          activeVillain: 3,
          villainPosition: "BTN",
          startPot: 7.3,
          toCall: 2.1,
          canCheck: false,
          startStreet: "flop",
          boardCards: 3,
          branch: ["BTN open 2.2 BB", "BB call", "Flop", "BTN bet 2.1 BB"],
          prompt: "SRP OOP: continue или fold"
        },
        {
          key: "turn-barrel",
          title: "Turn barrel spot",
          heroPosition: "BTN",
          activeVillain: 5,
          villainPosition: "BB",
          startPot: 13,
          toCall: 0,
          canCheck: true,
          startStreet: "turn",
          boardCards: 4,
          branch: ["BTN open 2.2 BB", "BB call", "Flop bet-call", "Turn"],
          prompt: "Turn: second barrel или check"
        },
        {
          key: "bb-vs-sb-limp-flop",
          title: "BB vs SB limp flop",
          heroPosition: "BB",
          activeVillain: 1,
          villainPosition: "SB",
          startPot: 2,
          toCall: 0,
          canCheck: true,
          startStreet: "flop",
          boardCards: 3,
          branch: ["UTG fold", "HJ fold", "CO fold", "BTN fold", "SB complete", "BB check", "Flop", "SB check"],
          prompt: "BvB limp pot: ставка 1 BB или check"
        }
      ]
    },
    "cbet-rvbb": {
      name: "C-bet IP vs BB",
      stackDepths: [38, 50, 65, 80],
      playableWeight: 1,
      spots: [
        {
          key: "btn-vs-bb-cbet",
          title: "BTN vs BB · c-bet",
          heroPosition: "BTN",
          activeVillain: 5,
          villainPosition: "BB",
          startPot: 5.2,
          toCall: 0,
          canCheck: true,
          startStreet: "flop",
          boardCards: 3,
          branch: ["BTN open 2.2 BB", "BB call", "Flop", "BB check"],
          prompt: "BB чекнул — c-bet или check back"
        }
      ]
    }
  };

  function registerPack(key, pack) {
    const normalized = validatePackDefinition(key, pack);
    PACKS[key] = normalized;
    return PACKS[key];
  }

  function registerPacks(packs) {
    Object.entries(packs || {}).forEach(([key, pack]) => registerPack(key, pack));
    return PACKS;
  }

  async function loadPackManifest(url = "assets/poker-kit/simulator/packs/manifest.json") {
    packLoadState.attempted = true;
    if (typeof fetch !== "function") {
      packLoadState.loaded = false;
      packLoadState.source = "builtin";
      packLoadState.error = "fetch unavailable";
      return { ...packLoadState };
    }

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const manifest = await response.json();
      const packs = manifest.packs || manifest;
      registerPacks(packs);

      packLoadState.loaded = true;
      packLoadState.source = url;
      packLoadState.count = Object.keys(packs).length;
      packLoadState.error = "";
    } catch (error) {
      packLoadState.loaded = false;
      packLoadState.source = "builtin";
      packLoadState.count = 0;
      packLoadState.error = error?.message || String(error);
    }

    return { ...packLoadState };
  }

  function validatePackDefinition(key, pack) {
    if (!key || !pack || typeof pack !== "object") {
      throw new Error(`Invalid simulator pack: ${key || "missing key"}`);
    }

    const spots = Array.isArray(pack.spots) ? pack.spots : [];
    if (!spots.length) {
      throw new Error(`Invalid simulator pack spots: ${key}`);
    }

    const stackDepths = Array.isArray(pack.stackDepths) && pack.stackDepths.length
      ? pack.stackDepths.map(Number).filter((value) => value > 0)
      : [32];
    if (!stackDepths.length) {
      throw new Error(`Invalid simulator pack stackDepths: ${key}`);
    }

    return {
      schemaVersion: Number(pack.schemaVersion || PACK_SCHEMA_VERSION),
      name: String(pack.name || key),
      stackDepths,
      playableWeight: clamp(Number(pack.playableWeight ?? 0.8), 0, 1),
      policy: packPolicyDefaults(pack.policy),
      spots: spots.map((spot, index) => validateSpotDefinition(key, spot, index))
    };
  }

  function validateBoardCards(packKey, index, cards) {
    const seen = new Set();
    cards.forEach((card) => {
      const code = String(card);
      const rank = code[0];
      const suit = code[1];
      if (code.length !== 2 || !(rank in RANK_VALUES) || !SUITS.includes(suit)) {
        throw new Error(`Invalid board card "${code}" in spot ${index} of ${packKey}`);
      }
      if (seen.has(code)) {
        throw new Error(`Duplicate board card "${code}" in spot ${index} of ${packKey}`);
      }
      seen.add(code);
    });
    return cards;
  }

  function validateSpotDefinition(packKey, spot, index) {
    if (!spot || typeof spot !== "object") {
      throw new Error(`Invalid spot ${index} in ${packKey}`);
    }
    const heroPosition = spot.heroPosition || "CO";
    const villainPosition = spot.villainPosition || "BB";
    return {
      key: String(spot.key || `${packKey}-${index}`),
      title: String(spot.title || `${heroPosition} vs ${villainPosition}`),
      heroPosition,
      villainPosition,
      startStreet: spot.startStreet || "preflop",
      boardCards: Array.isArray(spot.boardCards) ? validateBoardCards(packKey, index, spot.boardCards.slice(0, 5)) : Number(spot.boardCards || 0),
      startPot: Number(spot.startPot ?? spot.pot ?? 0),
      pot: Number(spot.pot ?? spot.startPot ?? 0),
      toCall: Number(spot.toCall || 0),
      canCheck: spot.canCheck !== false,
      branch: Array.isArray(spot.branch) ? spot.branch.map(String) : [],
      prompt: String(spot.prompt || "Решение Hero"),
      tags: Array.isArray(spot.tags) ? spot.tags.map(String) : []
    };
  }

  function packPolicyDefaults(policy = {}) {
    return {
      preflopChart: policy.preflopChart || "public-v0",
      postflopModel: policy.postflopModel || "texture-initiative-v1",
      scoring: policy.scoring || "trainer-v0"
    };
  }

  const UINT32_RANGE = 0x100000000;
  const UINT53_RANGE = 0x20000000000000;

  function secureCrypto() {
    const candidates = [
      root?.crypto,
      typeof globalThis !== "undefined" ? globalThis.crypto : null
    ];
    return candidates.find((candidate) => candidate && typeof candidate.getRandomValues === "function") || null;
  }

  function randomUint32() {
    const cryptoSource = secureCrypto();
    if (cryptoSource) {
      const buffer = new Uint32Array(1);
      cryptoSource.getRandomValues(buffer);
      return buffer[0] >>> 0;
    }
    return Math.floor(Math.random() * UINT32_RANGE) >>> 0;
  }

  function randomUnit() {
    if (!secureCrypto()) return Math.random();
    const high = randomUint32() >>> 5;
    const low = randomUint32() >>> 6;
    return (high * 0x4000000 + low) / UINT53_RANGE;
  }

  function randomInt(maxExclusive) {
    const max = Math.floor(Number(maxExclusive));
    if (!(max > 0)) return 0;
    if (!secureCrypto()) return Math.floor(Math.random() * max);
    const limit = Math.floor(UINT32_RANGE / max) * max;
    let value = randomUint32();
    while (value >= limit) value = randomUint32();
    return value % max;
  }

  function randomChance(probability) {
    return randomUnit() < clamp(Number(probability || 0), 0, 1);
  }

  function randomItem(items) {
    return items[randomInt(items.length)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function makeDeck() {
    return RANKS_HIGH.flatMap((rank) => SUITS.map((suit) => `${rank}${suit}`));
  }

  function shuffle(cards) {
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
    }
    return cards;
  }

  function removeCard(deck, rank, suit) {
    const index = deck.indexOf(`${rank}${suit}`);
    if (index === -1) return null;
    return deck.splice(index, 1)[0];
  }

  function drawCard(deck) {
    return deck.pop();
  }

  function dealSeatHoleCards(deck, seatPositions, forcedCardsBySeatId = {}, dealtSeatIds = null) {
    const seatPositionList = Array.isArray(seatPositions) ? seatPositions : [];
    const dealtSeatSet = Array.isArray(dealtSeatIds)
      ? new Set(dealtSeatIds.map(Number).filter((seatId) => Number.isFinite(seatId)))
      : null;
    const activeSeatIds = activeSeatIdsForPositions(seatPositionList)
      .filter((seatId) => !dealtSeatSet || dealtSeatSet.has(Number(seatId)));
    const hands = Array.from({ length: seatPositionList.length }, () => []);
    if (!activeSeatIds.length) return hands;

    const activePositions = activeSeatIds.map((seatId) => seatPositionList[seatId]);
    const { smallBlind, bigBlind } = blindPositions(activePositions);
    const smallBlindSeatId = activeSeatIds.find((seatId) => seatPositionList[seatId] === smallBlind);
    const bigBlindSeatId = activeSeatIds.find((seatId) => seatPositionList[seatId] === bigBlind);
    const firstCardSeatId = activeSeatIds.length === 2 ? bigBlindSeatId : smallBlindSeatId;
    const firstCardIndex = activeSeatIds.indexOf(firstCardSeatId);
    const startIndex = firstCardIndex >= 0 ? firstCardIndex : 0;
    const dealOrder = Array.from({ length: activeSeatIds.length }, (_, offset) =>
      activeSeatIds[(startIndex + offset) % activeSeatIds.length]
    );

    for (let cardIndex = 0; cardIndex < 2; cardIndex += 1) {
      dealOrder.forEach((seatId) => {
        const forcedCards = forcedCardsBySeatId?.[seatId];
        const forcedCard = Array.isArray(forcedCards) ? forcedCards[cardIndex] : null;
        hands[seatId].push(forcedCard || drawCard(deck));
      });
    }

    return hands;
  }

  function dealCombo(deck, combo) {
    const rankOne = combo[0];
    const rankTwo = combo[1];
    const suitedness = combo[2] || "";
    const shuffledSuits = shuffle([...SUITS]);

    if (rankOne === rankTwo) {
      const firstSuit = shuffledSuits[0];
      const secondSuit = shuffledSuits[1];
      return [removeCard(deck, rankOne, firstSuit), removeCard(deck, rankTwo, secondSuit)].filter(Boolean);
    }

    if (suitedness === "s") {
      const suit = shuffledSuits[0];
      return [removeCard(deck, rankOne, suit), removeCard(deck, rankTwo, suit)].filter(Boolean);
    }

    const firstSuit = shuffledSuits[0];
    const secondSuit = shuffledSuits.find((suit) => suit !== firstSuit) || shuffledSuits[1];
    return [removeCard(deck, rankOne, firstSuit), removeCard(deck, rankTwo, secondSuit)].filter(Boolean);
  }

  const parsedCardCache = new Map();
  function parseCardCode(card) {
    const cached = parsedCardCache.get(card);
    if (cached !== undefined) return cached;
    const parsed = { rank: card[0], suit: card[1], value: RANK_VALUES[card[0]] };
    if (typeof card === "string" && card.length === 2) parsedCardCache.set(card, parsed);
    return parsed;
  }

  function normalizeCombo(cards) {
    if (!Array.isArray(cards) || cards.length < 2
      || typeof cards[0] !== "string" || typeof cards[1] !== "string"
      || cards[0].length < 2 || cards[1].length < 2) return "";
    const [first, second] = cards.map(parseCardCode);
    const ordered = [first, second].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
    const suited = ordered[0].suit === ordered[1].suit ? "s" : "o";
    return ordered[0].rank === ordered[1].rank ? `${ordered[0].rank}${ordered[1].rank}` : `${ordered[0].rank}${ordered[1].rank}${suited}`;
  }

  function playerCount(settings) {
    const count = Number(settings?.playerCount);
    return PLAYER_COUNTS.includes(count) ? count : 8;
  }

  function positionsForCount(count) {
    return POSITION_SETS[count] || POSITION_SETS[8];
  }

  function clockwisePositionsForCount(count) {
    return CLOCKWISE_POSITION_SETS[count] || CLOCKWISE_POSITION_SETS[8];
  }

  function compatibleSpots(pack, positions) {
    const positionSet = new Set(positions);
    return (pack.spots || []).filter((spot) => {
      if (!positionSet.has(spot.heroPosition)) return false;
      return !spot.villainPosition || positionSet.has(spot.villainPosition);
    });
  }

  function chooseSpot(pack, positions) {
    const spots = compatibleSpots(pack, positions);
    if (spots.length) return randomItem(spots);

    const heroPosition = positions.includes("CO")
      ? "CO"
      : positions.includes("BTN")
        ? "BTN"
        : positions[0];

    return {
      key: "dynamic-preflop",
      title: `${heroPosition} preflop`,
      heroPosition,
      villainPosition: "BB",
      prompt: `${heroPosition}: решение по префлопу`
    };
  }

  function chooseSpotForHero(pack, positions, heroPosition) {
    const spots = compatibleSpots(pack, positions)
      .filter((spot) => spot.heroPosition === heroPosition);
    if (spots.length) return randomItem(spots);

    return {
      key: "dynamic-continuous-preflop",
      title: `${heroPosition} preflop`,
      heroPosition,
      villainPosition: "BB",
      prompt: `${heroPosition}: решение по префлопу`
    };
  }

  function blindPositions(positions) {
    if (!Array.isArray(positions) || positions.length <= 1) {
      return { dealer: positions?.[0] || "BTN", smallBlind: "", bigBlind: "" };
    }
    if (positions.length === 2) return { dealer: "SB", smallBlind: "SB", bigBlind: "BB" };
    return { dealer: "BTN", smallBlind: "SB", bigBlind: "BB" };
  }

  function activeSeatIdsForPositions(seatPositions) {
    return (Array.isArray(seatPositions) ? seatPositions : [])
      .map((position, seatId) => (position ? seatId : null))
      .filter((seatId) => seatId !== null && Number.isFinite(Number(seatId)));
  }

  function playablePositionsForCount(count) {
    const activeCount = Math.max(1, Number(count) || 0);
    if (activeCount === 1) return ["BTN"];
    return positionsForCount(activeCount);
  }

  function clockwisePositionsForPlayableCount(count) {
    const activeCount = Math.max(1, Number(count) || 0);
    if (activeCount === 1) return ["BTN"];
    return clockwisePositionsForCount(activeCount);
  }

  function blindRingCarryoverSeatIds(carryoverSeats) {
    return (Array.isArray(carryoverSeats) ? carryoverSeats : [])
      .filter((seat, index) => {
        if (!seat) return false;
        const isHeroSeat = index === 0 || Boolean(seat.isHero);
        const lobbyState = isHeroSeat ? "active" : String(seat.lobbyState || "active");
        return lobbyState !== "eliminated" && Number(seat.stack || 0) > 0;
      })
      .map((seat) => Number(seat.id))
      .filter((seatId) => Number.isFinite(seatId));
  }

  function activeCarryoverSeatIds(carryoverSeats) {
    return (Array.isArray(carryoverSeats) ? carryoverSeats : [])
      .filter((seat, index) => {
        if (!seat) return false;
        const isHeroSeat = index === 0 || Boolean(seat.isHero);
        const lobbyState = isHeroSeat ? "active" : String(seat.lobbyState || "active");
        return lobbyState === "active" && Number(seat.stack || 0) > 0;
      })
      .map((seat) => Number(seat.id))
      .filter((seatId) => Number.isFinite(seatId));
  }

  function nextActiveDealerSeatId(previousTable, activeSeatIds, count) {
    const ids = (Array.isArray(activeSeatIds) ? activeSeatIds : [])
      .map(Number)
      .filter((seatId, index, list) => Number.isFinite(seatId) && list.indexOf(seatId) === index);
    if (!ids.length) return 0;

    const activeSet = new Set(ids);
    const seats = Array.isArray(previousTable?.seats) ? previousTable.seats : [];
    const previousDealer = seats.find((seat) => seat.dealer);
    const previousDealerId = Number(previousDealer?.id);
    const slotCount = Math.max(1, Number(count) || seats.length || ids.length);
    if (!Number.isFinite(previousDealerId)) return ids[0];

    for (let offset = 1; offset <= slotCount; offset += 1) {
      const seatId = (previousDealerId + offset + slotCount) % slotCount;
      if (activeSet.has(seatId)) return seatId;
    }

    return ids[0];
  }

  function positionsForActiveSeatIds(count, activeSeatIds, dealerSeatId) {
    const slotCount = Math.max(1, Number(count) || 0);
    const ids = (Array.isArray(activeSeatIds) ? activeSeatIds : [])
      .map(Number)
      .filter((seatId, index, list) => (
        Number.isFinite(seatId)
        && seatId >= 0
        && seatId < slotCount
        && list.indexOf(seatId) === index
      ));
    const positions = Array.from({ length: slotCount }, () => "");
    if (!ids.length) return positions;

    const activeSet = new Set(ids);
    const preferredDealer = activeSet.has(Number(dealerSeatId)) ? Number(dealerSeatId) : ids[0];
    const orderedSeatIds = [];
    for (let offset = 0; offset < slotCount && orderedSeatIds.length < ids.length; offset += 1) {
      const seatId = (preferredDealer + offset + slotCount) % slotCount;
      if (activeSet.has(seatId)) orderedSeatIds.push(seatId);
    }

    const order = clockwisePositionsForPlayableCount(orderedSeatIds.length);
    orderedSeatIds.forEach((seatId, index) => {
      positions[seatId] = order[index] || "";
    });
    return positions;
  }

  function orderedSeatsForHero(positions, heroPosition) {
    const heroIndex = Math.max(0, positions.indexOf(heroPosition));
    return [positions[heroIndex], ...positions.slice(heroIndex + 1), ...positions.slice(0, heroIndex)];
  }

  function createSeats(table, deck, positions, stackDepth, settings, carryoverSeats = null, seatHoleCards = null, seatStackDepths = null) {
    const { dealer, smallBlind, bigBlind } = blindPositions(positions);
    const seatPositions = Array.isArray(table.seatPositions)
      ? table.seatPositions.slice()
      : orderedSeatsForHero(clockwisePositionsForCount(positions.length), table.heroPosition);
    const liveSeatCount = Math.max(1, activeSeatIdsForPositions(seatPositions).length || positions.length || Number(table?.playerCount || 0) || Number(settings?.playerCount || 0) || seatPositions.length);
    const strategySettings = {
      ...(settings || {}),
      playerCount: liveSeatCount,
      stackDepth: roundBbValue(stackDepth)
    };
    const requestedBotPack = normalizeBotPack(strategySettings.botPack || strategySettings.botPackId || strategySettings.botOpponentPack);
    const botModelPlan = createBotStrategyModelPlan(strategySettings, Math.max(0, seatPositions.length - 1));
    const strategyModelRequired = botStrategyModelRequiredForSettings(strategySettings);
    const seatStacks = seatPositions.map((position, index) =>
      roundBbValue(carryoverSeats?.[index]?.stack ?? seatStackDepths?.[index] ?? stackDepth)
    );
    const seatLobbyStates = seatPositions.map((position, index) =>
      index === 0 ? "active" : (carryoverSeats?.[index]?.lobbyState || "active")
    );
    const seatHasRingSeat = (index) => Boolean(seatPositions[index]) && seatLobbyStates[index] !== "eliminated" && seatStacks[index] > 0;
    const effectiveStackDepthForSeat = (seatIndex) => {
      const ownStack = positiveBbOrNull(seatStacks[seatIndex]) || roundBbValue(stackDepth);
      const opponentStacks = seatStacks
        .filter((value, index) => index !== seatIndex && seatHasRingSeat(index))
        .map((value) => positiveBbOrNull(value))
        .filter((value) => value != null);
      if (!opponentStacks.length) return ownStack;
      return roundBbValue(Math.min(ownStack, Math.max(...opponentStacks)));
    };
    const strategySettingsForSeat = (seatIndex) => ({
      ...strategySettings,
      stackDepth: effectiveStackDepthForSeat(seatIndex)
    });
    const carryoverBotProfile = (seat, seatIndex, fallbackModel, seatStrategySettings) => {
      const carried = seat?.botProfile || null;
      if (!carried) return null;
      const carriedBotPack = normalizeBotPack(carried.strategyModel?.botPack?.key || carried.botPack?.key);
      if (requestedBotPack && carriedBotPack !== requestedBotPack) return null;
      if (carried.strategyModelMissing) return strategyModelRequired
        ? missingBotStrategyProfile(seatStrategySettings, seatIndex)
        : carried;
      if (!carried.strategyModel) return carried;
      const carriedModel = normalizeBotStrategyModel(carried.strategyModel);
      if (
        hasExplicitStrategyModelTableContract(carriedModel) &&
        hasExplicitStrategyModelStackContract(carriedModel) &&
        botStrategyModelMatchesSettings(carriedModel, seatStrategySettings)
      ) {
        return carried;
      }
      const replacementModel = adaptStrategyModelToSettings(carriedModel, seatStrategySettings, fallbackModel)
        || carryoverReplacementStrategyModel(carried, seatStrategySettings, fallbackModel);
      return chooseBotProfile(seatStrategySettings, seatIndex, replacementModel, { strategyModelRequired });
    };
    // Nicknames are unique within a table. Seed the "taken" set with any names
    // carried over from the previous hand so a freshly-seated bot never reuses a
    // surviving neighbour's name; fresh seats then draw a style-matched nickname.
    const usedNames = new Set();
    if (Array.isArray(carryoverSeats)) {
      carryoverSeats.forEach((seat) => { if (seat && seat.name) usedNames.add(seat.name); });
    }
    return seatPositions.map((position, index) => {
      const carryoverSeat = carryoverSeats?.[index] || null;
      const lobbyState = seatLobbyStates[index];
      const stack = seatStacks[index];
      const hasRingSeat = Boolean(position) && lobbyState !== "eliminated" && stack > 0;
      const isSeatActive = hasRingSeat && lobbyState === "active";
      const dealtCards = Array.isArray(seatHoleCards?.[index]) ? seatHoleCards[index] : [];
      const seatStrategySettings = strategySettingsForSeat(index);
      const seatPlanModel = index === 0 ? null : adaptStrategyModelToSettings(botModelPlan[index - 1], seatStrategySettings, botModelPlan[index - 1]);
      const botProfile = index === 0 ? null : (
        carryoverBotProfile(carryoverSeat, index, seatPlanModel, seatStrategySettings)
        || chooseBotProfile(seatStrategySettings, index, seatPlanModel, { strategyModelRequired })
      );
      // Name reflects the bot's model: derive it from the profile style so an
      // aggressive seat reads aggressive, a nit reads tight, etc. Carryover keeps
      // the prior name (stable identity within a session).
      const nicknameSeed = `${table?.id || 0}:${table?.handNo || 0}:${index}:${position || ""}:${botProfile?.strategyModel?.id || botProfile?.label || ""}`;
      const name = carryoverSeat?.name
        || (index === 0 ? "Hero" : pickBotNickname(botProfile?.style || botProfile?.archetype, usedNames, nicknameSeed));

      return {
        id: index,
        name,
        botProfile,
        position: position || "",
        stack,
        cards: isSeatActive
          ? dealtCards.length >= 2
            ? dealtCards.slice(0, 2)
            : [drawCard(deck), drawCard(deck)]
          : [],
        isHero: index === 0,
        folded: !isSeatActive,
        foldedAt: isSeatActive ? "" : (lobbyState !== "active" ? lobbyState : "empty"),
        revealed: false,
        dealer: hasRingSeat && position === dealer,
        blind: hasRingSeat && position === smallBlind ? "SB" : hasRingSeat && position === bigBlind ? "BB" : "",
        // Lobby state survives between hands via carryoverSeats. Hero is
        // pinned to "active"; bots stay "active" unless the lobby driver
        // (`tickLobbyForHand`) flips them to sitting-out / disconnected
        // between hands.
        lobbyState
      };
    });
  }

  function carryoverSeatsForTable(previousTable, count, targetBlindMultiplier = 1) {
    const previousSeats = Array.isArray(previousTable?.seats) ? previousTable.seats : [];
    if (previousSeats.length !== count) return null;
    const previousBlindMultiplier = Math.max(0.1, Number(previousTable?.blindMultiplier || 1));
    const nextBlindMultiplier = Math.max(0.1, Number(targetBlindMultiplier || 1));
    const blindConversion = previousBlindMultiplier / nextBlindMultiplier;
    const orderedSeats = previousSeats
      .slice()
      .sort((first, second) => Number(first.id) - Number(second.id));
    // Carried seats keep their existing name; this set only guards the (rare)
    // fallback where a seat arrives unnamed, keeping the minted nickname unique.
    const usedNames = new Set(orderedSeats.map((seat) => seat?.name).filter(Boolean));
    const carriedSeats = orderedSeats.map((seat, index) => {
      const isHeroSeat = index === 0;
      const previousLobbyState = String(seat?.lobbyState || "active");
      const previousStack = Number(seat?.stack ?? 0);
      const rawCarried = roundBbValue(previousStack * blindConversion);
      // A seat that still holds real chips must never be rounded to a 0 stack by
      // a blind level-up. blindConversion < 1 on a blind raise, so a sub-BB stack
      // can roundBbValue down to 0 — which busts the hero (via
      // finishHeroBustedCarryoverIfNeeded, which fires on hero.stack <= 0) or
      // wrongly eliminates a short opponent that still has chips. Floor a
      // positive real stack to the smallest representable stack instead.
      const carriedStack = (previousStack > 0 && rawCarried <= 0) ? roundBbValue(0.1) : rawCarried;
      const isEliminated = !isHeroSeat && (previousLobbyState === "eliminated" || carriedStack <= 0);
      const botProfile = isHeroSeat ? null : (seat?.botProfile ? { ...seat.botProfile } : null);
      const nicknameSeed = `carry:${targetBlindMultiplier || 1}:${count}:${index}:${botProfile?.strategyModel?.id || botProfile?.label || ""}`;
      return {
        id: index,
        name: seat?.name || (isHeroSeat ? "Hero" : pickBotNickname(botProfile?.style || botProfile?.archetype, usedNames, nicknameSeed)),
        stack: isEliminated ? 0 : Math.max(0, carriedStack),
        botProfile,
        // Lobby state survives the hand boundary. A zero-stack opponent
        // in tournament mode becomes eliminated and keeps the seat empty;
        // Hero is always active.
        lobbyState: isHeroSeat ? "active" : (isEliminated ? "eliminated" : previousLobbyState),
        isHeroSeat,
        isEliminated
      };
    });

    // Conserve the table's chips across the BB-denomination change. Rounding each
    // seat to the 0.1 BB grid INDEPENDENTLY lets the per-seat residues fail to
    // cancel, so the carried sum drifts from the conserved total (chips minted or
    // destroyed every level-up, scaled by the blind multiplier). Convert the EXACT
    // total once and assign the leftover residue to a single live seat so the
    // carried stacks sum back to that conserved total.
    const previousTotal = orderedSeats.reduce((sum, seat) => sum + Number(seat?.stack ?? 0), 0);
    const conservedTotal = roundBbValue(previousTotal * blindConversion);
    const carriedTotal = roundBbValue(carriedSeats.reduce((sum, seat) => sum + seat.stack, 0));
    let residue = roundBbValue(conservedTotal - carriedTotal);
    if (Math.abs(residue) >= 0.05) {
      // Recipient: the largest LIVE (non-eliminated, positive) stack, ties broken
      // toward Hero so the residue lands on a deterministic, robust seat.
      const recipient = carriedSeats
        .filter((seat) => !seat.isEliminated && seat.stack > 0)
        .sort((first, second) =>
          (second.stack - first.stack) || ((first.isHeroSeat ? 0 : 1) - (second.isHeroSeat ? 0 : 1))
        )[0];
      if (recipient) {
        const adjusted = roundBbValue(recipient.stack + residue);
        // Never let the residue (which can be negative) bust/eliminate the
        // recipient: only apply it when it leaves a positive stack. Otherwise
        // leave the harmless dust uncorrected rather than destroy a live seat.
        if (adjusted > 0) {
          recipient.stack = adjusted;
          residue = 0;
        }
      }
    }

    return carriedSeats.map(({ isHeroSeat: _isHeroSeat, isEliminated: _isEliminated, ...seat }) => seat);
  }

  function seatByPosition(table, position) {
    return table.seats.find((seat) => seat.position === position);
  }

  function seatById(table, seatId) {
    return table.seats.find((seat) => seat.id === Number(seatId));
  }

  function contributionOf(table, seatId) {
    return Number(table.contributions?.[seatId] || 0);
  }

  function handCommitmentOf(table, seatId) {
    // Total chips a seat has committed THIS hand across all ledgers: antes
    // (anteContributions) + closed streets (handContributions) + the open
    // street (contributions). Unlike contributionOf (open street only), this
    // sees a seat that is all-in for just its ante — it still holds live cards
    // and contests the pot, so it must read as "still in the hand". (T2)
    return roundBbValue(
      Number(table.anteContributions?.[seatId] || 0)
      + Number(table.handContributions?.[seatId] || 0)
      + Number(table.contributions?.[seatId] || 0)
    );
  }

  function remainingStack(table, seatId) {
    const seat = seatById(table, seatId);
    return Math.max(0, Number(seat?.stack || 0));
  }

  function maxContributionForSeat(table, seatId) {
    return Math.round((contributionOf(table, seatId) + remainingStack(table, seatId)) * 10) / 10;
  }

  function effectiveStackBetweenSeats(table, firstSeatId, secondSeatId) {
    const firstTotal = maxContributionForSeat(table, firstSeatId);
    const secondTotal = maxContributionForSeat(table, secondSeatId);
    if (!(firstTotal > 0)) return roundBbValue(Number(table?.stackDepth || 0));
    if (!(secondTotal > 0)) return roundBbValue(firstTotal);
    return roundBbValue(Math.min(firstTotal, secondTotal));
  }

  // Largest total a seat can put in and still have it matched: its own stack
  // capped by the deepest live opponent's committable stack. Shoving past this
  // only commits dead money nobody can call. Works on every street (unlike
  // effectivePostflopRaiseCap, which is scoped to postflop contesting order).
  function effectiveAllInCeiling(table, seatId) {
    const ownMax = maxContributionForSeat(table, seatId);
    const opponentMax = (table?.seats || [])
      .filter((seat) => seat && Number(seat.id) !== Number(seatId) && !seat.folded)
      .map((seat) => maxContributionForSeat(table, seat.id))
      .filter((amount) => amount > 0);
    if (!opponentMax.length) return ownMax;
    return roundBbValue(Math.min(ownMax, Math.max(...opponentMax)));
  }

  function effectiveOpenStackDepth(table, seat) {
    if (!table || !seat) return roundBbValue(Number(table?.stackDepth || 0));
    const ownTotal = maxContributionForSeat(table, seat.id);
    if (!(ownTotal > 0)) return roundBbValue(Number(table.stackDepth || 0));
    const effectiveTotals = (table.seats || [])
      .filter((candidate) =>
        candidate
        && Number(candidate.id) !== Number(seat.id)
        && !candidate.folded
        && (candidate.lobbyState || "active") === "active"
        && maxContributionForSeat(table, candidate.id) > 0
      )
      .map((candidate) => Math.min(ownTotal, maxContributionForSeat(table, candidate.id)));
    return roundBbValue(effectiveTotals.length ? Math.max(...effectiveTotals) : ownTotal);
  }

  function effectiveResponseStackDepth(table, seat, openerPosition = "") {
    if (!table || !seat) return roundBbValue(Number(table?.stackDepth || 0));
    const opener = openerPosition ? seatByPosition(table, openerPosition) : null;
    const openerSeatId = opener?.id ?? table.preflopAggressorSeatId ?? 0;
    return effectiveStackBetweenSeats(table, seat.id, openerSeatId);
  }

  function foldSeat(table, seat, street = table.street) {
    if (!seat) return;
    seat.folded = true;
    seat.foldedAt = street || "preflop";
    if (Array.isArray(table?.contestingSeatIds)) {
      const foldedSeatId = Number(seat.id);
      table.contestingSeatIds = table.contestingSeatIds.filter((seatId) => Number(seatId) !== foldedSeatId);
    }
  }

  function addSeatContribution(table, seatId, amount, animate = true) {
    const requestedAmount = Math.round(Number(amount) * 10) / 10;
    if (!(requestedAmount > 0)) return 0;

    const seat = seatById(table, seatId);
    const paidAmount = seat
      ? Math.round(Math.min(requestedAmount, remainingStack(table, seatId)) * 10) / 10
      : requestedAmount;
    if (!(paidAmount > 0)) return 0;

    const nextTotal = Math.round((contributionOf(table, seatId) + paidAmount) * 10) / 10;
    table.contributions = table.contributions || {};
    table.contributions[seatId] = nextTotal;
    table.pot = Math.round((Number(table.pot || 0) + paidAmount) * 10) / 10;
    if (seat) {
      seat.stack = Math.round((remainingStack(table, seatId) - paidAmount) * 10) / 10;
    }
    setSeatBet(table, seatId, nextTotal);
    recordTimeline(table, "chips", `${seatTimelineLabel(table, seatId)} +${formatBb(paidAmount)}`, {
      seatId,
      amount: paidAmount,
      contribution: nextTotal,
      stack: seat?.stack,
      pot: table.pot
    });

    if (animate) {
      const street = table.street || "preflop";
      const boardLength = Array.isArray(table.board) ? table.board.length : 0;
      table.animationSeq = (table.animationSeq || 0) + 1;
      table.betAnimations = [
        ...(table.betAnimations || []),
        {
          key: `${table.handNo}-${table.animationSeq}`,
          seatId,
          amount: paidAmount,
          contribution: nextTotal,
          street,
          boardLength
        }
      ].slice(-BET_ANIMATION_WINDOW);
    }

    return paidAmount;
  }

  // ─── Pot settlement ──────────────────────────────────────────────────
  // Real chip settlement: build the main pot + side pots from each seat's
  // total per-hand contribution, refund any uncalled (over-shoved) chips to
  // the lone bettor, then award every layer only to the seats eligible for it
  // (those that actually put chips into that layer) ranked by hand strength.
  //
  // Replaces the old "best hand scoops table.pot" logic, which had no side-pot
  // model and let a short all-in stack win chips no opponent could match
  // (P1 chip-integrity bug, common in tournaments after eliminations).
  //
  // Sources: `table.handContributions` is the cumulative per-seat tally for
  // the whole hand (survives clearStreetBets, unlike the per-street
  // `table.contributions`). `table.pot` stays the authoritative total — any
  // gap (e.g. a postflop-spot start pot with no per-seat detail) is folded
  // into the main pot as dead money so chips are always conserved.

  function payChipsToSeat(table, seatId, amount) {
    const seat = seatById(table, seatId);
    const chips = roundBbValue(amount);
    if (!seat || !(chips > 0)) return 0;
    seat.stack = roundBbValue(Number(seat.stack || 0) + chips);
    return chips;
  }

  function handContributionEntries(table) {
    // Per-seat contribution for the whole hand = ante ledger (dead money, not
    // a call obligation) + closed streets rolled into
    // `handContributions` (by clearStreetBets) PLUS the still-open street in
    // `contributions`. The two are disjoint, so they sum. At showdown the
    // current street has already been rolled in and `contributions` is empty;
    // on a fold the current street is still live and gets added here.
    const hand = table.handContributions || {};
    const street = table.contributions || {};
    // A big-blind ante is one dead contribution for the whole table. It belongs
    // in the main pot, but it must not raise the BB seat's personal side-pot
    // level. Leaving it out here makes the existing `pot - contributedTotal`
    // dead-money path add it to the first contested layer instead. Per-player
    // antes stay in the seat ledger because they define an all-in player's
    // eligibility cap in the usual way.
    const bigBlindAnte = table?.anteMode === "big-blind" || Number(table?.bigBlindAnteBb || 0) > 0;
    const ante = bigBlindAnte ? {} : (table.anteContributions || {});
    const seatIds = new Set(
      [...Object.keys(ante), ...Object.keys(hand), ...Object.keys(street)].map(Number).filter(Number.isFinite)
    );
    const entries = [];
    seatIds.forEach((seatId) => {
      // Keep full precision until layers are built; snapping per-seat cents to
      // 0.1 here can mint chips when the summed layer is already grid-valid.
      const amount = Number(ante[seatId] || 0) + Number(hand[seatId] || 0) + Number(street[seatId] || 0);
      if (amount > 0) entries.push({ seatId, amount });
    });
    return entries;
  }

  function bettingContributionEntries(table) {
    // Uncalled chips are a betting-round concept. Antes are dead money and must
    // never make an otherwise matched bet look like a lone over-shove (BB ante),
    // nor make a genuinely unmatched bet look matched. Keep this ledger separate
    // from handContributionEntries(), which intentionally retains antes for pot
    // eligibility and side-pot construction.
    const hand = table.handContributions || {};
    const street = table.contributions || {};
    const seatIds = new Set(
      [...Object.keys(hand), ...Object.keys(street)].map(Number).filter(Number.isFinite)
    );
    const entries = [];
    seatIds.forEach((seatId) => {
      const amount = Number(hand[seatId] || 0) + Number(street[seatId] || 0);
      if (amount > 0) entries.push({ seatId, amount });
    });
    return entries;
  }

  // Best-first tiers of seat ids from comparable score tuples; ties share a tier.
  function rankTiersFromResults(results) {
    const sorted = (Array.isArray(results) ? results : [])
      .filter((entry) => entry && Number.isFinite(Number(entry.seatId)) && Array.isArray(entry.score))
      .slice()
      .sort((first, second) => compareScores(second.score, first.score));
    const tiers = [];
    sorted.forEach((entry) => {
      const top = tiers[tiers.length - 1];
      if (top && compareScores(top.score, entry.score) === 0) {
        top.ids.push(Number(entry.seatId));
      } else {
        tiers.push({ score: entry.score, ids: [Number(entry.seatId)] });
      }
    });
    return tiers.map((tier) => tier.ids);
  }

  function splitChipsAmong(table, seatIds, amount) {
    const ids = (Array.isArray(seatIds) ? seatIds : [])
      .map(Number)
      .filter((id) => Number.isFinite(id))
      .sort((first, second) => first - second);
    const total = roundBbValue(amount);
    if (!ids.length || !(total > 0)) return 0;
    // Integer-chip (0.1 BB) split: give floor(total/n) to everyone and spread the
    // leftover odd chips ONE PER SEAT. Avoids both (a) the float floor bug where
    // e.g. 4.8/3 === 1.5999.. floored to 1.5 underpaid co-winners, and (b) dumping
    // ALL leftover chips on a single seat (a 3-way chop of 5.0 paid {1.8,1.6,1.6}
    // instead of the fair {1.7,1.7,1.6}). Odd chips start at a hand-rotated offset
    // so they are not directionally biased and Hero (seat 0) is eligible.
    const n = ids.length;
    const totalChips = Math.round(total * 10);
    const baseChips = Math.floor(totalChips / n);
    const extraChips = totalChips - baseChips * n;
    const startOffset = n > 1
      ? (Math.max(0, Math.floor(Number(table?.handNo || table?.tournamentHandNo || 0))) % n)
      : 0;
    let paid = 0;
    ids.forEach((id, index) => {
      const rotated = (index - startOffset + n) % n;
      const give = roundBbValue((baseChips + (rotated < extraChips ? 1 : 0)) / 10);
      payChipsToSeat(table, id, give);
      if (give > 0) {
        if (!table.potAwards) table.potAwards = {};
        table.potAwards[id] = roundBbValue(Number(table.potAwards[id] || 0) + give);
      }
      paid = roundBbValue(paid + give);
    });
    return paid;
  }

  // Refund the uncalled portion of a lone top contributor (an over-shove no one
  // matched). Mutates `entries` down to the matched level and returns the chips
  // owed back, or null when the top contribution was fully called (a tie at the
  // top, or every seat matched it).
  function computeUncalledRefund(entries) {
    if (!Array.isArray(entries) || entries.length < 2) return null;
    const sorted = entries.slice().sort((first, second) => second.amount - first.amount);
    const [top, second] = sorted;
    if (!(top.amount > second.amount)) return null;
    const refund = roundBbValue(top.amount - second.amount);
    const entry = entries.find((item) => item.seatId === top.seatId);
    if (entry) entry.amount = roundBbValue(second.amount);
    return refund > 0 ? { seatId: top.seatId, amount: refund } : null;
  }

  function computeTableUncalledRefund(table, fullEntries) {
    const refund = computeUncalledRefund(bettingContributionEntries(table));
    if (!refund || !Array.isArray(fullEntries)) return refund;

    // computeUncalledRefund mutates its betting-only input. Side-pot construction
    // uses the separate full ledger (bets + antes), so remove the same returned
    // chips there explicitly without dropping the seat's ante contribution.
    const entryIndex = fullEntries.findIndex((entry) => Number(entry?.seatId) === Number(refund.seatId));
    if (entryIndex < 0) return refund;
    const entry = fullEntries[entryIndex];
    const nextAmount = Number(entry.amount || 0) - Number(refund.amount || 0);
    if (nextAmount > 0.0001) entry.amount = nextAmount;
    else fullEntries.splice(entryIndex, 1);
    return refund;
  }

  // Layered side pots from per-seat contributions. Each layer carries the chips
  // contributed at that level and the seats eligible to win it.
  function buildPotLayers(entries) {
    const remaining = new Map(entries.map((entry) => [entry.seatId, Number(entry.amount || 0)]));
    const layers = [];
    let guard = 0;
    while (remaining.size && guard < 256) {
      guard += 1;
      // Keep the working level at full precision (do NOT snap it to the 0.1 grid
      // here): a level ending in a half-chip residue (e.g. 1.25) would round UP
      // to 1.3 and the per-seat accrual then mints chips the one-sided leftover
      // net in settlePots (only claws back POSITIVE residue) cannot reclaim.
      const level = Math.min(...remaining.values());
      if (!(level > 0)) break;
      const eligible = [];
      remaining.forEach((value, seatId) => {
        eligible.push(seatId);
        const next = value - level;
        // Treat sub-chip dust as fully consumed so the layer count stays bounded.
        if (next > 0.0001) remaining.set(seatId, next);
        else remaining.delete(seatId);
      });
      // Round only the final layer total once, after summing across eligibles.
      layers.push({ amount: roundBbValue(level * eligible.length), eligible });
    }
    return layers;
  }

  // Core settlement. `tiers` is a best-first list of seat-id groups for the
  // LIVE (non-folded) contestants — e.g. [[2], [0, 3]] means seat 2 wins
  // outright over a 0/3 chop. Folded contributors are absent from tiers and
  // cannot win, but the chips they put in still seed the pots they contributed
  // to. table.pot is left intact as the post-hand display value.
  function settlePots(table, tiers) {
    if (!table || table.potAwarded) return;
    table.potAwarded = true;

    const pot = roundBbValue(Number(table.pot || 0));
    if (!(pot > 0)) return;

    const liveTiers = (Array.isArray(tiers) ? tiers : [])
      .map((tier) => (Array.isArray(tier) ? tier : [tier]).map(Number).filter((id) => Number.isFinite(id)))
      .filter((tier) => tier.length);

    const entries = handContributionEntries(table);
    const contributedTotal = roundBbValue(entries.reduce((sum, entry) => sum + entry.amount, 0));

    // Fallback for hand-built tables with no per-seat detail: split the pot
    // evenly among the best live tier so chips are never stranded.
    if (!(contributedTotal > 0)) {
      if (liveTiers.length) splitChipsAmong(table, liveTiers[0], pot);
      return;
    }

    // 1) Refund the uncalled over-shove, if any, before the pots are built.
    const refund = computeTableUncalledRefund(table, entries);
    let distributed = refund ? payChipsToSeat(table, refund.seatId, refund.amount) : 0;

    // 2) Build side-pot layers and fold any dead money (pot minus tracked
    //    contributions, e.g. a postflop-spot start pot) into the main pot.
    const deadMoney = Math.max(0, roundBbValue(pot - contributedTotal));
    const layers = buildPotLayers(entries);
    if (deadMoney > 0) {
      if (layers.length) layers[0].amount = roundBbValue(layers[0].amount + deadMoney);
      else layers.push({ amount: deadMoney, eligible: liveTiers.flat() });
    }

    // 3) Award each layer to the best-ranked live seats eligible for it.
    layers.forEach((layer) => {
      const eligible = new Set(layer.eligible);
      let winners = [];
      for (const tier of liveTiers) {
        const hit = tier.filter((id) => eligible.has(id));
        if (hit.length) { winners = hit; break; }
      }
      // Orphan layer (no live eligible winner) should not occur in real play —
      // the bettor who folds everyone out is always eligible. If it somehow
      // does, refund the layer to its contributors to conserve chips.
      const targets = winners.length ? winners : layer.eligible;
      distributed = roundBbValue(distributed + splitChipsAmong(table, targets, layer.amount));
    });

    // 4) Safety net: any residual (rounding dust / unexpected orphan) goes to
    //    the best live tier so the whole pot always lands back in stacks.
    const leftover = roundBbValue((contributedTotal + deadMoney) - distributed);
    if (leftover > 0 && liveTiers.length) splitChipsAmong(table, liveTiers[0], leftover);
  }

  // Fold-path entry: the passed winners are the sole live tier; every other
  // contributor is treated as folded. settlePots then refunds the winner's own
  // uncalled bet and returns the rest of the pot to them — matching the old
  // "winner takes the pot" result while staying side-pot correct.
  function awardPot(table, winners) {
    if (!table || table.potAwarded) return;
    const winnerIds = (Array.isArray(winners) ? winners : [])
      .filter((seat) => seat && Number.isFinite(Number(seat.id)))
      .map((seat) => Number(seat.id));
    if (!winnerIds.length) {
      table.potAwarded = true;
      return;
    }
    settlePots(table, [winnerIds]);
  }

  function markHeroBustedIfNeeded(table) {
    const hero = heroSeat(table);
    if (!table || !hero || Number(hero.stack || 0) > 0) return false;
    if (table.simulationMode !== "tournament") return false;
    table.heroBusted = true;
    table.resultKind = "busted";
    table.bustedReason = table.result || table.lastAction || "Hero stack 0 BB";
    table.tournamentFinish = tournamentFinishForHeroBusted(table, hero);
    return true;
  }

  function finishHeroBustedCarryoverIfNeeded(table) {
    const hero = heroSeat(table);
    if (!table || table.simulationMode !== "tournament" || !hero || Number(hero.stack || 0) > 0) return false;
    table.status = "folded";
    table.heroTurn = false;
    table.busy = false;
    table.result = "Hero busted";
    table.resultKind = "busted";
    table.lastAction = "Hero stack 0 BB";
    closeTerminalBettingState(table);
    markHeroBustedIfNeeded(table);
    addLog(table, table.result);
    recordTimeline(table, "result", table.result, {
      status: table.status,
      result: table.result,
      heroBusted: true,
      tournamentFinish: table.tournamentFinish ? { ...table.tournamentFinish } : null
    });
    return true;
  }

  function tournamentFinishForHeroBusted(table, hero) {
    if (!table || table.simulationMode !== "tournament" || !hero) return null;
    const seats = Array.isArray(table.seats) ? table.seats : [];
    const activeOpponents = seats.filter((seat) =>
      seat
      && !seat.isHero
      && String(seat.lobbyState || "active") !== "eliminated"
      && Number(seat.stack || 0) > 0
    );
    const entrants = Math.max(
      activeOpponents.length + 1,
      Math.floor(Number(table.seatSlotCount || table.playerCount || seats.length || 0)) || activeOpponents.length + 1
    );
    return {
      status: "busted",
      place: Math.min(entrants, activeOpponents.length + 1),
      entrants,
      handsPlayed: Math.max(1, Math.floor(Number(table.tournamentHandNo || table.handNo || 1))),
      level: Math.max(1, Math.floor(Number(table.blindLevel || 1))),
      blindMultiplier: roundBbValue(table.blindMultiplier || 1),
      stackBb: roundBbValue(hero.stack || 0),
      reason: table.bustedReason || table.result || table.lastAction || "Hero stack 0 BB"
    };
  }

  function markTournamentEliminations(table) {
    if (!table || table.simulationMode !== "tournament" || !Array.isArray(table.seats)) return [];
    const eliminated = [];
    table.seats.forEach((seat) => {
      if (!seat || seat.isHero) return;
      if (String(seat.lobbyState || "active") === "eliminated") return;
      if (Number(seat.stack || 0) > 0) return;
      seat.lobbyState = "eliminated";
      seat.eliminatedHandNo = table.handNo;
      eliminated.push(seat);
    });
    return eliminated;
  }

  function heroSeat(table) {
    return seatById(table, 0);
  }

  function winnerSeatsWhenHeroFolds(table) {
    const active = seatById(table, table.activeVillain);
    if (active && !active.folded && !active.isHero) return [active];
    const contesting = liveContestingOpponents(table);
    if (contesting.length) return [contesting[0]];
    const firstLiveOpponent = (table.seats || []).find((seat) => !seat.isHero && !seat.folded);
    return firstLiveOpponent ? [firstLiveOpponent] : [];
  }

  function bindPendingBetAnimationsToAction(table, seatId, actionAnimation) {
    if (!table || !Array.isArray(table.betAnimations) || !actionAnimation) return;
    if (String(actionAnimation.tone || "") === "fold") return;
    const actionStreet = String(actionAnimation.street || "");
    const actionBoardLength = Number(actionAnimation.boardLength || 0);
    table.betAnimations.forEach((item) => {
      if (!item || Number(item.seatId) !== Number(seatId)) return;
      if (item.actionKey || item.actionSeq !== undefined) return;
      const itemStreet = item.street !== undefined ? String(item.street || "") : actionStreet;
      const itemBoardLength = Number.isFinite(Number(item.boardLength)) ? Number(item.boardLength) : actionBoardLength;
      if (itemStreet !== actionStreet || itemBoardLength !== actionBoardLength) return;
      item.actionSeq = actionAnimation.seq;
      item.actionKey = actionAnimation.key;
    });
  }

  function recordSeatAction(table, seatId, label, tone = "neutral", animate = true, details = {}) {
    if (!table || seatId == null || !label) return;
    table.seatActions = table.seatActions || {};
    table.actionSeq = (table.actionSeq || 0) + 1;
    const street = table.street || "preflop";
    const boardLength = Array.isArray(table.board) ? table.board.length : 0;
    const action = {
      label,
      tone,
      seq: table.actionSeq,
      street,
      boardLength
    };
    table.seatActions[seatId] = action;
    recordTimeline(table, "action", `${seatTimelineLabel(table, seatId)} ${label}`, {
      seatId,
      label,
      tone,
      ...details
    });

    if (animate) {
      const actionAnimation = {
        key: `${table.handNo}-action-${table.actionSeq}`,
        seatId,
        label,
        tone,
        street,
        boardLength,
        seq: table.actionSeq
      };
      bindPendingBetAnimationsToAction(table, seatId, actionAnimation);
      table.actionAnimations = [
        ...(table.actionAnimations || []),
        actionAnimation
      ].slice(-ACTION_ANIMATION_WINDOW);
    }
  }

  function recordTimeline(table, phase, label, details = {}) {
    if (!table || !label) return;
    table.timelineSeq = (table.timelineSeq || 0) + 1;
    const event = {
      seq: table.timelineSeq,
      phase,
      street: table.street,
      label,
      pot: Math.round(Number(table.pot || 0) * 10) / 10,
      board: Array.isArray(table.board) ? table.board.slice() : [],
      state: snapshotTimelineState(table),
      ...details
    };
    table.actionTimeline = [...(table.actionTimeline || []), event].slice(-80);
  }

  function snapshotTimelineState(table) {
    if (!table) return null;
    return {
      street: table.street,
      pot: Math.round(Number(table.pot || 0) * 10) / 10,
      currentBet: Math.round(Number(table.currentBet || 0) * 10) / 10,
      minRaiseTo: Math.round(Number(table.minRaiseTo || 0) * 10) / 10,
      lastRaiseSize: Math.round(Number(table.lastRaiseSize || 0) * 10) / 10,
      toCall: Math.round(Number(table.toCall || 0) * 10) / 10,
      canCheck: Boolean(table.canCheck),
      heroTurn: Boolean(table.heroTurn),
      activeVillain: table.activeVillain,
      board: Array.isArray(table.board) ? table.board.slice() : [],
      seats: (table.seats || []).map((seat) => ({
        id: seat.id,
        position: seat.position,
        isHero: Boolean(seat.isHero),
        stack: Math.round(Number(seat.stack || 0) * 10) / 10,
        folded: Boolean(seat.folded),
        foldedAt: seat.foldedAt || "",
        contribution: contributionOf(table, seat.id),
        bet: Number(table.seatBets?.[seat.id] || 0),
        action: table.seatActions?.[seat.id]?.label || ""
      }))
    };
  }

  function seatTimelineLabel(table, seatId) {
    const seat = seatById(table, seatId);
    if (!seat) return `Seat ${seatId}`;
    return seat.isHero ? "Hero" : seat.position;
  }

  function updatePreflopStateForHero(table) {
    const heroContribution = contributionOf(table, 0);
    const heroHasChips = remainingStack(table, 0) > 0;
    table.toCall = Math.round(Math.max(0, Number(table.currentBet || 0) - heroContribution) * 10) / 10;
    table.canCheck = heroHasChips && table.heroPosition === blindPositions(table.positions).bigBlind && table.toCall === 0;
    table.heroTurn = heroHasChips && table.heroTurn;
    table.minRaiseTo = Math.round(Math.min(maxContributionForSeat(table, 0), Math.max(2, Number(table.currentBet || 1) + Number(table.lastRaiseSize || 1))) * 10) / 10;
  }

  function commitRaise(table, seatId, targetTotal, opts = {}) {
    const seat = seatById(table, seatId);
    const previousBet = roundBbValue(Number(opts.previousBet ?? table.currentBet ?? 0));
    const previousRaiseSize = Number.isFinite(Number(opts.previousRaiseSize))
      ? Number(opts.previousRaiseSize)
      : Number(table.lastRaiseSize || 1);
    const contributionBefore = contributionOf(table, seatId);
    const maxTotal = maxContributionForSeat(table, seatId);
    const ceiling = Number.isFinite(Number(opts.ceiling)) ? Number(opts.ceiling) : maxTotal;
    const cappedTarget = roundBbValue(Math.min(
      Math.max(Number(targetTotal || 0), contributionBefore),
      maxTotal,
      ceiling
    ));
    const added = Math.max(0, roundBbValue(cappedTarget - contributionBefore));
    const paidAmount = addSeatContribution(table, seatId, added, opts.animate !== false);
    const newTotal = contributionOf(table, seatId);
    const raiseSize = roundBbValue(Math.max(0, newTotal - previousBet));
    if (!(newTotal > previousBet + EPSILON_BB)) {
      return { kind: "call", paidAmount, target: newTotal, added, previousBet, raiseSize: 0, allIn: seat ? remainingStack(table, seatId) <= 0 : false };
    }

    table.currentBet = Math.max(previousBet, newTotal);
    const raiseFloor = Number.isFinite(Number(opts.raiseFloor)) ? Number(opts.raiseFloor) : 1;
    table.lastRaiseSize = roundBbValue(Math.max(raiseFloor, previousRaiseSize, raiseSize));
    if (opts.updateMinRaise !== false) {
      const minRaiseSeatId = opts.minRaiseSeatId ?? 0;
      table.minRaiseTo = roundBbValue(Math.min(
        maxContributionForSeat(table, minRaiseSeatId),
        table.currentBet + table.lastRaiseSize
      ));
    }

    table.activeVillain = Number(seatId);
    if (opts.preflop) {
      const previousAggressorSeatId = Number(opts.previousAggressorSeatId ?? table.preflopAggressorSeatId);
      table.heroPreflopRaiseLocked = previousAggressorSeatId === 0 && raiseSize + EPSILON_BB < previousRaiseSize;
      table.preflopAggressorSeatId = Number(seatId);
      markPreflopOpenContext(table, seatId, previousBet);
    }
    if (opts.postflop) {
      const allIn = seat ? remainingStack(table, seatId) <= 0 : false;
      if (opts.lockHeroPostflopOnShortAllIn) {
        table.heroPostflopRaiseLocked = allIn && raiseSize + EPSILON_BB < previousRaiseSize;
      } else if (opts.lockHeroPostflopOnShortRaise) {
        table.heroPostflopRaiseLocked = raiseSize + EPSILON_BB < previousRaiseSize;
      }
      table.toCall = roundBbValue(Math.max(0, table.currentBet - contributionOf(table, 0)));
      table.canCheck = table.toCall <= 0;
    }
    if (opts.initiative !== false) {
      table.initiativeSeatId = Number(seatId);
      table.streetAggressorSeatId = Number(seatId);
    }

    return {
      kind: "raise",
      paidAmount,
      target: newTotal,
      added: Math.max(0, roundBbValue(newTotal - contributionBefore)),
      previousBet,
      raiseSize,
      // Did this raise meet the full legal min-raise increment (a genuine re-open)?
      // A short all-in whose raiseSize is below the prior full-raise size does NOT
      // reopen betting for already-acted seats (NL / TDA Rule 39). Consumers use this
      // to decide whether to reopen action. BUGHUNT F003/F007.
      reopened: raiseSize + EPSILON_BB >= previousRaiseSize,
      allIn: seat ? remainingStack(table, seatId) <= 0 : false
    };
  }

  // Commit a bot's preflop open/3-bet, capped at the effective all-in ceiling so
  // it never commits more chips than a live opponent can actually match. Without
  // the cap a 3-bet over an already-shoved short stack puts in dead chips that
  // inflate the displayed pot until computeUncalledRefund corrects them at
  // payout. Returns how the action resolved ({ kind: "raise" | "call" }) plus the
  // capped target/added/paid amounts so the caller can label and log it in its
  // own voice. Shared by every bot preflop resolver so the ceiling guard can
  // never drift between pre-Hero, after-Hero, and bot-only loops again.
  function commitCappedPreflopRaise(table, seat, decision) {
    const ceiling = effectiveAllInCeiling(table, seat.id);
    if (Number(decision.target || 0) > table.currentBet && ceiling <= table.currentBet + EPSILON_BB) {
      const callAdded = Math.max(0, Math.min(table.currentBet, maxContributionForSeat(table, seat.id)) - contributionOf(table, seat.id));
      const paidAmount = addSeatContribution(table, seat.id, callAdded);
      table.activeVillain = seat.id;
      markPreflopOpenCaller(table, seat.id);
      return { kind: "call", paidAmount, target: Number(table.currentBet || 0), added: callAdded };
    }
    const previousBet = table.currentBet;
    const previousAggressorSeatId = Number(table.preflopAggressorSeatId);
    const commit = commitRaise(table, seat.id, decision.target, {
      ceiling,
      preflop: true,
      updateMinRaise: false,
      previousBet,
      previousAggressorSeatId
    });
    const allInPressure = commit.kind === "raise"
      && commit.target >= ceiling - EPSILON_BB
      && ceiling > previousBet + EPSILON_BB;
    return { ...commit, target: commit.target, added: commit.added, allInPressure };
  }

  function defaultPreflopLabSpots(table, decision) {
    const isOpenLimp = Number(table.currentBet || 0) <= 1 && String(decision?.label || "").includes("limp");
    if (Number(table.currentBet || 0) > 1) return ["defense", "threeBet"];
    return isOpenLimp ? ["open", "limp"] : ["open"];
  }


var __pokerSimulatorEngineParts = (typeof window !== "undefined" ? window : globalThis).PokerSimulatorEngineParts
  || ((typeof window !== "undefined" ? window : globalThis).PokerSimulatorEngineParts = {});
Object.assign(__pokerSimulatorEngineParts, {
  root,
  BOT_STRATEGY_PROFILE,
  BOT_PACK_PROFILE,
  TABLE_COUNTS,
  PACK_SCHEMA_VERSION,
  BOT_PACK_SCHEMA_VERSION,
  DONK_BET_FREQUENCY,
  COACH_15_11_SOURCE,
  LOW_ACE_3BET_SUITS,
  MAX_SINGLE_OPEN_TO_BB,
  MAX_SINGLE_OPEN_RAISE_SIZE_BB,
  EPSILON_BB,
  BOT_MICRO_STACK_MAX_BB,
  BOT_OPEN_PUSH_FOLD_MAX_BB,
  BOT_FACING_PUSH_FOLD_MAX_BB,
  DEFAULT_STRATEGY_ANTE_BB,
  PLAYER_COUNTS,
  BOT_STRATEGY_SIZE_LABELS,
  BOT_STRATEGY_STACK_BUCKETS,
  RANKS_HIGH,
  SUITS,
  RANK_VALUES,
  HAND_NAMES,
  OPPONENT_NAMES,
  BOT_NICKNAMES,
  pickBotNickname,
  BOT_ARCHETYPES,
  BOT_ARCHETYPE_ROSTERS,
  THIRD_LEAGUE_BOT_OVERLAYS,
  POSITION_SETS,
  CLOCKWISE_POSITION_SETS,
  PLAYABLE_COMBOS,
  FOLD_COMBOS,
  PREFLOP_CHARTS,
  PUSH_FOLD_OPEN_RANGES,
  MICRO_STACK_OPEN_ADDITIONS,
  MICRO_STACK_CALL_JAM_ADDITIONS,
  SB_COMPLETE_CALL_RANGES,
  OPEN_RANGES,
  DEFENSE_RANGES,
  THREE_BET_RANGES,
  HEADS_UP_RANGES,
  SINGLE_RAISE_DEFENSE_RANGES,
  SINGLE_RAISE_THREE_BET_RANGES,
  applyBotStrategyProfile,
  applyChartAdditions,
  applyRangeAdditions,
  appendStrategyPatterns,
  SINGLE_RAISE_THREE_BET_ADDITIONS,
  MTT_STACK_OPEN_ADDITIONS,
  MTT_SHORT_STACK_DEFENSE_ADDITIONS,
  MTT_SHORT_STACK_THREE_BET_ADDITIONS,
  normalizeDifficulty,
  normalizeBotLineup,
  normalizeBotStrategyPool,
  botPackCatalog,
  normalizeBotPack,
  botPackDefinition,
  botPackLabel,
  normalizeStakesLevel,
  stakesLevelLabel,
  createStakesModelPlan,
  botStrategyModelCatalog,
  sanitizeStrategyProduction,
  normalizeBotStrategyModel,
  botStrategyTableType,
  botStrategyTableAnteBb,
  botStrategyTableStackDepth,
  normalizeBotStrategyStackBucket,
  botStrategyStackBucketForDepth,
  botStrategyTableStackBucket,
  botStrategyStackBucketBounds,
  botStrategySizeLabel,
  tableSizedStrategyModelForSettings,
  stackSizedStrategyModelForSettings,
  strategyModelForSettings,
  filterStrategyModelsForSettings,
  shuffledCopy,
  drawBotStrategyModel,
  repeatedShuffledModels,
  botStrategyModelsForTier,
  allBotStrategyModels,
  findBotStrategyModelById,
  repeatedShuffledModelList,
  createBotStrategyPoolPlan,
  createBotPackModelPlan,
  createBotStrategyModelPlan,
  carryoverReplacementStrategyModel,
  adaptStrategyModelToSettings,
  botStrategyModelRequiredForSettings,
  botStrategyPoolLabel,
  botLineupLabel,
  shouldUseThirdLeagueBotOverlay,
  thirdLeagueBotOverlayForSeat,
  applyThirdLeagueBotOverlay,
  missingBotStrategyProfile,
  chooseBotProfile,
  botStyleLabel,
  difficultyForSeat,
  styleForSeat,
  botArchetype,
  botPreflopTrait,
  botStrategyPreflopFrequencyAdjustment,
  botStrategyModelProduction,
  botStrategyArenaTop,
  botStrategyArenaProductionAdjustments,
  botStrategyArenaProductionAdjustment,
  botLearningPreflopAdjustment,
  botPostflopTrait,
  packLoadState,
  PACKS,
  registerPack,
  registerPacks,
  loadPackManifest,
  validatePackDefinition,
  validateBoardCards,
  validateSpotDefinition,
  packPolicyDefaults,
  UINT32_RANGE,
  UINT53_RANGE,
  secureCrypto,
  randomUint32,
  randomUnit,
  randomInt,
  randomChance,
  randomItem,
  clamp,
  makeDeck,
  shuffle,
  removeCard,
  drawCard,
  dealSeatHoleCards,
  dealCombo,
  parseCardCode,
  normalizeCombo,
  playerCount,
  positionsForCount,
  clockwisePositionsForCount,
  compatibleSpots,
  chooseSpot,
  chooseSpotForHero,
  blindPositions,
  activeSeatIdsForPositions,
  playablePositionsForCount,
  clockwisePositionsForPlayableCount,
  blindRingCarryoverSeatIds,
  activeCarryoverSeatIds,
  nextActiveDealerSeatId,
  positionsForActiveSeatIds,
  orderedSeatsForHero,
  createSeats,
  carryoverSeatsForTable,
  seatByPosition,
  seatById,
  contributionOf,
  remainingStack,
  maxContributionForSeat,
  effectiveStackBetweenSeats,
  effectiveAllInCeiling,
  effectiveOpenStackDepth,
  effectiveResponseStackDepth,
  foldSeat,
  addSeatContribution,
  payChipsToSeat,
  handContributionEntries,
  bettingContributionEntries,
  rankTiersFromResults,
  splitChipsAmong,
  computeUncalledRefund,
  computeTableUncalledRefund,
  buildPotLayers,
  settlePots,
  awardPot,
  markHeroBustedIfNeeded,
  finishHeroBustedCarryoverIfNeeded,
  tournamentFinishForHeroBusted,
  markTournamentEliminations,
  heroSeat,
  winnerSeatsWhenHeroFolds,
  recordSeatAction,
  recordTimeline,
  snapshotTimelineState,
  seatTimelineLabel,
  updatePreflopStateForHero,
  commitRaise,
  commitCappedPreflopRaise,
  defaultPreflopLabSpots
});
