(function (root) {
  "use strict";

  const VERSION = "ff-leak-taxonomy-v1";

  const SKILL_ROUTES = {
    start: {
      target: "first-hand-story.html",
      title: "Первая раздача",
      reason: "повторить улицы, банк и базовые действия"
    },
    combos: {
      target: "poker-combinations.html",
      title: "Комбинации",
      reason: "закрыть силу руки, кикер и доску"
    },
    positions: {
      target: "poker-position-trainer.html",
      title: "Позиции",
      reason: "повторить кнопку, блайнды и порядок хода"
    },
    hands: {
      target: "poker-trainer.html",
      title: "Префлоп-пас",
      reason: "повторить базовую сортировку рук: fold, playable, premium"
    },
    tournament: {
      target: "poker-tournament-foundation-trainer.html",
      title: "Турнирный навигатор",
      reason: "повторить формат, стадию, стек и выплаты"
    },
    range_call: {
      target: "poker-range-call-trainer.html",
      title: "Рейнджи и колл",
      reason: "повторить чтение диапазона и выгодный колл"
    },
    open_first: {
      target: "poker-open-first-trainer.html",
      title: "Опенрейзы",
      reason: "добрать первое открытие"
    },
    isolation: {
      target: "poker-isolation-trainer.html",
      title: "Изолейты",
      reason: "повторить рейз против лимперов"
    },
    vs_3bet: {
      target: "poker-vs-3bet-trainer.html",
      title: "3-беты",
      reason: "разобрать 3-бет и защиту"
    },
    squeeze: {
      target: "poker-squeeze-trainer.html",
      title: "Squeeze Lab",
      reason: "повторить squeeze, overcall и fold в мультивей-префлопе"
    },
    math: {
      target: "poker-outs-trainer.html",
      title: "Ауты и цена",
      reason: "закрыть ауты и pot odds"
    },
    bb_defense: {
      target: "poker-bb-defense-trainer.html",
      title: "Защита BB",
      reason: "пересобрать защиту блайндов"
    },
    short: {
      target: "poker-short-stack-trainer.html",
      title: "Короткий стек",
      reason: "повторить push/fold и рестилы"
    },
    icm_short: {
      target: "poker-icm-short-trainer.html",
      title: "ICM short",
      reason: "повторить bubble, payjump и bounty pressure"
    },
    flop: {
      target: "poker-postflop-aggressor-trainer.html",
      title: "Постфлоп",
      reason: "повторить c-bet и давление"
    },
    exam: {
      target: "poker-mixed-exam-trainer.html",
      title: "Mixed exam",
      reason: "перепроверить слабые категории"
    },
    simulator: {
      target: "poker-simulator.html",
      title: "Симулятор",
      reason: "повторить живую раздачу вокруг слабого simulator leak"
    },
    review: {
      target: "poker-review-trainer.html",
      title: "Индивидуальный повтор",
      reason: "посмотреть назначенные drills"
    }
  };

  const TAG_TO_SKILL = {
    too_tight_button_open: "start",
    deep_stack_overpush: "start",
    invalid_limp_unopened: "start",
    missed_small_cbet: "start",
    oversized_flop_cbet: "start",
    flop_overpush: "start",
    missed_draw_pressure: "start",
    draw_overpush: "start",
    invalid_fold_to_check: "start",
    hero_call_king_high: "start",
    invalid_response_bet: "start",

    "combo_royal-flush": "combos",
    "combo_straight-flush": "combos",
    combo_four: "combos",
    "combo_full-house": "combos",
    combo_flush: "combos",
    combo_straight: "combos",
    combo_three: "combos",
    "combo_two-pair": "combos",
    combo_pair: "combos",
    "combo_high-card": "combos",

    missed_button: "positions",
    missed_sb: "positions",
    missed_bb: "positions",
    missed_utg: "positions",
    wrong_early_range: "positions",
    wrong_middle_range: "positions",
    wrong_late_range: "positions",
    button_order: "positions",
    position_early: "positions",
    position_middle: "positions",
    position_late: "positions",

    loose_preflop: "hands",
    missed_premium: "hands",
    underplayed_premium: "hands",
    missed_playable: "hands",
    overplayed_standard: "hands",
    wrong_preflop_category: "hands",
    wrong_premium: "hands",
    wrong_standard: "hands",
    wrong_fold: "hands",

    tournament_format_misread: "tournament",
    stage_overpressure: "tournament",
    stage_underpressure: "tournament",
    stack_unit_misread: "tournament",
    payout_risk_ignore: "tournament",
    bounty_misread: "tournament",

    range_position_misread: "range_call",
    suitedness_misread: "range_call",
    loose_cold_call: "range_call",
    cold_call_overfold: "range_call",
    dominated_call: "range_call",
    price_ignore: "range_call",

    missed_open: "open_first",
    loose_open: "open_first",
    missed_sb_open: "open_first",
    bvb_overfold: "open_first",
    missed_limp: "open_first",
    wrong_stack_mode: "open_first",
    button_overfold: "open_first",

    missed_iso: "isolation",
    loose_iso: "isolation",
    wrong_iso_size: "isolation",
    bad_overlimp: "isolation",
    bad_blind_complete: "isolation",
    overfold_iso: "isolation",

    bad_3bet_defense: "vs_3bet",
    overfold_vs_3bet: "vs_3bet",
    loose_3bet: "vs_3bet",

    missed_squeeze: "squeeze",
    loose_squeeze: "squeeze",
    dominated_flat: "squeeze",
    flat_trap: "squeeze",
    multiway_plan_gap: "squeeze",
    wrong_squeeze_size: "squeeze",
    blocker_misread: "squeeze",

    counting_error: "math",
    decision_error: "math",
    loose_call: "math",
    tight_fold: "math",
    exam_math_outs: "math",

    bb_overfold: "bb_defense",
    bb_overdefend: "bb_defense",
    missed_3bet: "bb_defense",
    missed_bvb_isolation: "bb_defense",

    missed_jam: "short",
    loose_jam: "short",
    bad_call_vs_jam: "short",
    missed_resteal: "short",
    flat_short_stack: "short",
    missed_call_vs_jam: "short",

    icm_loose_call: "icm_short",
    icm_missed_pressure: "icm_short",
    bubble_risk_ignore: "icm_short",
    pko_bounty_overvalue: "icm_short",
    missed_icm_jam: "icm_short",

    missed_cbet: "flop",
    wrong_cbet_size: "flop",
    loose_multiway_bet: "flop",
    weak_oop_continue: "flop",

    exam_open_first: "open_first",
    exam_isolation: "isolation",
    exam_vs_3bet: "vs_3bet",
    exam_bb_defense: "bb_defense",
    exam_short_stack: "short",
    exam_postflop: "flop",
    low_volume: "exam",

    simulator_folds: "simulator",
    simulator_bustout: "simulator",
    simulator_preflop: "simulator",
    simulator_postflop: "simulator",
    simulator_strategy: "simulator"
  };

  const SUPPORT_TAGS = new Set(["weak_ev", "load_gap", "bad_abi_select"]);

  function routeForSkill(skillKey) {
    const key = String(skillKey || "review");
    const route = SKILL_ROUTES[key] || SKILL_ROUTES.review;
    return {
      skillKey: SKILL_ROUTES[key] ? key : "review",
      target: route.target,
      href: route.target,
      title: route.title,
      label: route.title,
      reason: route.reason
    };
  }

  function skillForTag(tag) {
    const key = String(tag || "").trim();
    if (TAG_TO_SKILL[key]) return TAG_TO_SKILL[key];
    if (/^simulator_/.test(key)) return "simulator";
    if (/(^|_)preflop($|_)|premium|playable|standard|wrong_(fold|premium|standard)/.test(key)) return "hands";
    return "review";
  }

  function drillForTag(tag) {
    const route = routeForSkill(skillForTag(tag));
    return {
      tag,
      skillKey: route.skillKey,
      target: route.target,
      href: route.href,
      title: route.title,
      label: route.label,
      reason: route.reason
    };
  }

  const TAG_DRILLS = Object.freeze(Object.fromEntries(
    Object.keys(TAG_TO_SKILL).map((tag) => {
      const drill = drillForTag(tag);
      return [tag, [drill.skillKey, drill.target, drill.title]];
    })
  ));

  root.FFLeakTaxonomy = Object.freeze({
    VERSION,
    SKILL_ROUTES: Object.freeze(SKILL_ROUTES),
    TAG_TO_SKILL: Object.freeze(TAG_TO_SKILL),
    TAG_DRILLS,
    SUPPORT_TAGS,
    routeForSkill,
    skillForTag,
    drillForTag
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
