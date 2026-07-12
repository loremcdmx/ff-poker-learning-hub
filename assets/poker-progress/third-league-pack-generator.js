(function (root) {
  "use strict";

  const VERSION = "ff-third-league-pack-generator-v1";
  const taxonomy = root.FFLeakTaxonomy || {};

  const DEFAULT_UNLOCK = Object.freeze({ previousSkill: "hands", minScore: 85 });
  const DEFAULT_PASS = Object.freeze({ minScore: 80, maxRedRepeats: 0 });

  const PACK_TEMPLATES = Object.freeze([
    {
      id: "third-league-open-first-l10-v1",
      sourceLevel: 10,
      skillKey: "open_first",
      module: "Preflop discipline",
      step: "RFI by position",
      spotCount: 80,
      targetTags: ["missed_open", "loose_open", "missed_sb_open"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "openraise_from_ep1,openraise_from_ep2,openraise_from_mp,openraise_from_hj,openraise_from_co,openraise_from_bu,sb_vs_bb_trainer_1_n",
      layoutType: "decision_grid",
      lessonFormat: "short_video_plus_position_memo",
      estimatedMinutes: 18,
      practiceTask: "play RFI spots by position until all missed_open and loose_open tags are green",
      curatorStopper: "red_tags_after_two_sessions",
      trainerStopper: "minScore",
      evidence: ["LK prod openraise-*", "LK prod trenzalopen-*", "docs/poker-skill-knowledge.md#pack-generation-contract"]
    },
    {
      id: "third-league-bb-defense-l10-v1",
      sourceLevel: 10,
      skillKey: "bb_defense",
      module: "Blind defense",
      step: "BB defense versus opener",
      spotCount: 72,
      targetTags: ["bb_overfold", "bb_overdefend", "missed_bvb_isolation"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "test_strategia_bb_n,sb_vs_bb_trainer_2_n,trenzaldefbb-*",
      layoutType: "price_defense_grid",
      lessonFormat: "short_video_plus_price_memo",
      estimatedMinutes: 16,
      practiceTask: "defend BB by price, position and stack; repeat every red blind-defense tag",
      curatorStopper: "bb_defense_red_tags",
      trainerStopper: "minScore",
      evidence: ["LK prod trenzaldefbb-*", "docs/poker-skill-knowledge.md#third-league-leak-taxonomy"]
    },
    {
      id: "third-league-vs-3bet-l13-v1",
      sourceLevel: 13,
      skillKey: "vs_3bet",
      module: "3-bet pots",
      step: "Continue, fold and 4-bet versus 3-bet",
      spotCount: 72,
      targetTags: ["bad_3bet_defense", "overfold_vs_3bet", "loose_3bet"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "strategia_3bet_trainer_1_n,strategia_3bet_trainer_2_n,strategia_3bet_trainer_3_n,strategia_3bet_trainer_4_n,strategia_3bet_trainer_5_n,zashita_3bet_dz_n",
      layoutType: "branching_decision_grid",
      lessonFormat: "range_memo_plus_drill",
      estimatedMinutes: 20,
      practiceTask: "choose fold, call, 4-bet or jam versus 3-bet by position, ante and stack",
      curatorStopper: "overfold_vs_3bet_repeats",
      trainerStopper: "minScore",
      evidence: ["LK prod trenzal3bet-*", "LK prod 3-betstrat-*", "docs/poker-skill-knowledge.md#pack-generation-contract"]
    },
    {
      id: "third-league-squeeze-l13-v1",
      sourceLevel: 13,
      skillKey: "squeeze",
      module: "Preflop pressure",
      step: "Squeezes and multiway preflop",
      spotCount: 32,
      targetTags: ["missed_squeeze", "loose_squeeze", "dominated_flat", "flat_trap"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "tren_squeeze",
      layoutType: "squeeze_pressure_grid",
      lessonFormat: "range_memo_plus_squeeze_drill",
      estimatedMinutes: 14,
      practiceTask: "choose squeeze, flat or fold by opener range, caller cap, blocker value, stack and realization",
      curatorStopper: "squeeze_red_tags",
      trainerStopper: "minScore",
      evidence: ["docs/player-path-sheet-tabs-reconciliation.md#lk-path-trainer-rows", "assets/poker-squeeze/data.js"]
    },
    {
      id: "third-league-isolation-l13-v1",
      sourceLevel: 13,
      skillKey: "isolation",
      module: "Preflop exploit",
      step: "Isolation raises and overlimp discipline",
      spotCount: 64,
      targetTags: ["missed_iso", "loose_iso", "wrong_iso_size", "bad_overlimp"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "trainer_izol_reiz_1_n,trainer_izol_reiz_2_n",
      layoutType: "limper_branch_grid",
      lessonFormat: "short_video_plus_sizing_memo",
      estimatedMinutes: 15,
      practiceTask: "isolate or overlimp versus one and multiple limpers from late positions and blinds",
      curatorStopper: "wrong_iso_size_repeats",
      trainerStopper: "minScore",
      evidence: ["FFStart isolation trainer", "docs/player-path-trainer-porting.md#trainer-family-map"]
    },
    {
      id: "third-league-short-stack-l13-v1",
      sourceLevel: 13,
      skillKey: "short",
      module: "Short stack",
      step: "Push, resteal and call versus jam",
      spotCount: 72,
      targetTags: ["missed_jam", "loose_jam", "bad_call_vs_jam", "missed_resteal"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "push_fold_0_9bb,push_fold_10_14bb,threebet_push_range",
      layoutType: "stack_band_grid",
      lessonFormat: "range_memo_plus_stack_drill",
      estimatedMinutes: 22,
      practiceTask: "solve shove, call versus jam and resteal spots by effective-stack band",
      curatorStopper: "bad_call_vs_jam_repeats",
      trainerStopper: "minScore",
      evidence: ["assets/poker-short-stack/data.js", "docs/poker-skill-knowledge.md#pack-generation-contract"]
    },
    {
      id: "third-league-postflop-aggressor-l13-v1",
      sourceLevel: 13,
      skillKey: "flop",
      module: "Postflop as aggressor",
      step: "C-bet, delayed c-bet and multiway discipline",
      spotCount: 72,
      targetTags: ["missed_cbet", "wrong_cbet_size", "loose_multiway_bet", "weak_oop_continue"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "trainer_izol_reiz_3_n,postflop_cbet_ip,postflop_cbet_oop,postflop_multiway",
      layoutType: "board_texture_grid",
      lessonFormat: "board_texture_memo_plus_drill",
      estimatedMinutes: 24,
      practiceTask: "choose c-bet, delay, check or give up by texture, position and multiway pressure",
      curatorStopper: "postflop_red_tags",
      trainerStopper: "minScore",
      evidence: ["LK prod postflop-*", "LK prod trenzalpost-*", "docs/poker-skill-knowledge.md#pack-generation-contract"]
    },
    {
      id: "third-league-tournament-foundation-l6-v1",
      sourceLevel: 6,
      skillKey: "tournament",
      module: "Tournament foundation",
      step: "Format, stage and stack navigation",
      spotCount: 40,
      targetTags: ["tournament_format_misread", "stage_underpressure", "stack_unit_misread", "payout_risk_ignore"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "test_vidi_turnirov,kak_orientirovatsya_v_turn_dz",
      layoutType: "tournament_context_grid",
      lessonFormat: "scenario_memo_plus_drill",
      estimatedMinutes: 12,
      practiceTask: "read format, stage, stack unit and payout pressure before preflop decisions",
      curatorStopper: "tournament_context_red_tags",
      trainerStopper: "minScore",
      evidence: ["Current Player Path rows test_vidi_turnirov and kak_orientirovatsya_v_turn_dz", "assets/poker-tournament/foundation-data.js"]
    },
    {
      id: "third-league-range-call-l8-v1",
      sourceLevel: 8,
      skillKey: "range_call",
      module: "Preflop range reading",
      step: "Ranges and profitable cold calls",
      spotCount: 48,
      targetTags: ["range_position_misread", "suitedness_misread", "loose_cold_call", "dominated_call"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "test_reindzhi,test_cold_call",
      layoutType: "range_call_grid",
      lessonFormat: "range_memo_plus_drill",
      estimatedMinutes: 14,
      practiceTask: "choose open, call, 3-bet or fold by position, suitedness, domination and price",
      curatorStopper: "range_call_red_tags",
      trainerStopper: "minScore",
      evidence: ["Current Player Path rows test_reindzhi and test_cold_call", "assets/poker-range-call/data.js"]
    },
    {
      id: "third-league-math-outs-l9-v1",
      sourceLevel: 9,
      skillKey: "math",
      module: "Poker math",
      step: "Outs and call price",
      spotCount: 40,
      targetTags: ["counting_error", "decision_error", "loose_call", "tight_fold"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "test_matematika_1,test_matematika_2_n",
      layoutType: "outs_price_grid",
      lessonFormat: "math_memo_plus_drill",
      estimatedMinutes: 12,
      practiceTask: "count clean outs, convert them to equity and compare the draw with pot odds",
      curatorStopper: "math_decision_red_tags",
      trainerStopper: "minScore",
      evidence: ["FFStart rows test_matematika_1 and test_matematika_2_n", "assets/poker-outs/data.js"]
    },
    {
      id: "third-league-icm-short-l14-v1",
      sourceLevel: 14,
      skillKey: "icm_short",
      module: "Tournament discipline",
      step: "ICM pressure and short-stack choices",
      spotCount: 85,
      targetTags: ["icm_loose_call", "icm_missed_pressure", "bubble_risk_ignore", "pko_bounty_overvalue"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "test_icm,icmtest-may-main,indivvs3bicm-002-extra",
      layoutType: "icm_pressure_grid",
      lessonFormat: "pressure_memo_plus_drill",
      estimatedMinutes: 20,
      practiceTask: "adjust jam, call and fold ranges for bubble, satellite, final-table and bounty pressure",
      curatorStopper: "icm_pressure_red_tags",
      trainerStopper: "minScore",
      evidence: ["LK prod icmtest-*", "assets/poker-icm-short/data.js", "docs/poker-skill-knowledge.md#third-league-context"]
    },
    {
      id: "third-league-mixed-exam-abi6-l15-v1",
      sourceLevel: 15,
      skillKey: "exam",
      module: "Final exam",
      step: "ABI6 mixed decision checkpoint",
      spotCount: 148,
      targetTags: ["exam_open_first", "exam_vs_3bet", "exam_bb_defense", "exam_postflop"],
      materialType: "trainer_pack",
      embedType: "simulator",
      materialsLink: "final_exam_trainer_n,final_exam_test",
      layoutType: "mixed_exam_grid",
      lessonFormat: "mixed_exam_plus_review_routes",
      estimatedMinutes: 30,
      practiceTask: "play a balanced ABI6 exam and route failed categories into the first repeat drill",
      curatorStopper: "mixed_exam_red_category",
      trainerStopper: "mixedSkillScore",
      evidence: ["FFStart row final_exam_trainer_n", "assets/poker-mixed-exam/data.js", "assets/poker-mixed-exam/trainer.js"]
    }
  ]);

  function uniqueTags(tags) {
    return [...new Set((Array.isArray(tags) ? tags : [])
      .map((tag) => String(tag || "").trim())
      .filter(Boolean))];
  }

  function skillForTag(tag) {
    return typeof taxonomy.skillForTag === "function" ? taxonomy.skillForTag(tag) : "review";
  }

  function routeForSkill(skillKey) {
    if (typeof taxonomy.routeForSkill === "function") return taxonomy.routeForSkill(skillKey);
    return { skillKey, target: "poker-review-trainer.html", title: "Индивидуальный повтор" };
  }

  function buildTagPlan(tags) {
    return uniqueTags(tags).map((tag) => {
      const skillKey = skillForTag(tag);
      const route = routeForSkill(skillKey);
      return {
        tag,
        skillKey,
        severity: tag.includes("missed") || tag.includes("overfold") ? "red" : "yellow",
        reviewTarget: route.target || route.href,
        reviewTitle: route.title || route.label
      };
    });
  }

  function buildPackSpec(template, overrides = {}) {
    const source = { ...template, ...overrides };
    const targetTags = uniqueTags(source.targetTags);
    const tagPlan = buildTagPlan(targetTags);
    return {
      id: source.id,
      generator: VERSION,
      league: "third",
      sourceLevel: Number(source.sourceLevel) || 10,
      skillKey: source.skillKey,
      module: source.module,
      step: source.step,
      spotCount: Number(source.spotCount) || 60,
      decisionMode: "single_choice",
      targetTags,
      tagPlan,
      unlock: { ...DEFAULT_UNLOCK, ...(source.unlock || {}) },
      pass: { ...DEFAULT_PASS, ...(source.pass || {}) },
      explanationTemplate: "decision-first, result-never-grades",
      telemetry: true,
      material: {
        materialType: source.materialType || "trainer_pack",
        embedType: source.embedType || "simulator",
        materialsLink: source.materialsLink || source.id,
        layoutType: source.layoutType || "decision_grid",
        lessonFormat: source.lessonFormat || "short_video_plus_memo",
        estimatedMinutes: Number(source.estimatedMinutes) || 12,
        practiceTask: source.practiceTask || "play a source-backed drill and repeat red tags",
        evidenceSource: Array.isArray(source.evidence) ? source.evidence[0] : "local source",
        curatorStopper: source.curatorStopper || "maxRedRepeats",
        trainerStopper: source.trainerStopper || "minScore"
      },
      sourceEvidence: Array.isArray(source.evidence) ? source.evidence.slice() : []
    };
  }

  function generateStaticPacks(options = {}) {
    const onlySkills = new Set(Array.isArray(options.onlySkills) ? options.onlySkills : []);
    return PACK_TEMPLATES
      .filter((template) => !onlySkills.size || onlySkills.has(template.skillKey))
      .map((template) => buildPackSpec(template));
  }

  function generateReviewPack(input = {}) {
    const counts = input.tagCounts && typeof input.tagCounts === "object" ? input.tagCounts : {};
    const targetTags = Object.entries(counts)
      .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
      .slice(0, 2)
      .map(([tag]) => tag);
    return buildPackSpec({
      id: `third-league-review-${String(input.playerId || "player").replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40)}-v1`,
      sourceLevel: Number(input.sourceLevel) || 13,
      skillKey: "review",
      module: "Individual review",
      step: "Top recurring leak repeat",
      spotCount: 40,
      targetTags,
      materialType: "review_assignment",
      embedType: "local_drill",
      materialsLink: "poker-review-trainer.html",
      layoutType: "review_queue",
      lessonFormat: "individual_assignment",
      estimatedMinutes: 18,
      practiceTask: "repeat the top recurring weak tags through the assigned local drills",
      curatorStopper: "support_stopper_or_green_retest",
      trainerStopper: "maxRedRepeats",
      unlock: { previousSkill: "flop", minScore: 75 },
      pass: { minScore: 80, maxRedRepeats: 0 },
      evidence: ["central trainer telemetry", "assets/poker-progress/leak-taxonomy.js"]
    });
  }

  root.FFThirdLeaguePackGenerator = Object.freeze({
    VERSION,
    PACK_TEMPLATES,
    buildPackSpec,
    generateStaticPacks,
    generateReviewPack
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
