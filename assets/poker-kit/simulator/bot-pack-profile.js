(function () {
  "use strict";

  const AGGRO_PACK_REALIZED_RANGES = Object.freeze({
    threeBet: Object.freeze({
      HJ: Object.freeze({ "*": Object.freeze(["99+", "ATs+", "KJs+", "QJs", "JTs", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"]) }),
      CO: Object.freeze({ "*": Object.freeze(["77+", "A8s+", "KTs+", "QTs+", "JTs", "T9s", "98s", "AJo+", "KQo", "A5s", "A4s", "A3s", "A2s"]) }),
      BTN: Object.freeze({ "*": Object.freeze(["55+", "A2s+", "K9s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "76s", "A9o+", "KTo+", "QJo"]) }),
      SB: Object.freeze({ "*": Object.freeze(["44+", "A2s+", "K7s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "76s", "65s", "A8o+", "KTo+", "QJo"]) }),
      BB: Object.freeze({ "*": Object.freeze(["44+", "A2s+", "K7s+", "Q8s+", "J8s+", "T8s+", "98s", "87s", "76s", "65s", "A8o+", "KTo+", "QJo"]) })
    })
  });

  const AUDIT_PACK_REALIZED_RANGES = Object.freeze({
    threeBet: Object.freeze({
      HJ: Object.freeze({ "*": Object.freeze(["88+", "A9s+", "KTs+", "QTs+", "JTs", "T9s", "AQo+", "KQo", "A5s", "A4s", "A3s", "A2s"]) }),
      CO: Object.freeze({ "*": Object.freeze(["66+", "A5s+", "K9s+", "Q9s+", "J9s+", "T8s+", "98s", "87s", "AJo+", "KQo", "A4s", "A3s", "A2s"]) }),
      BTN: Object.freeze({ "*": Object.freeze(["44+", "A2s+", "K7s+", "Q8s+", "J8s+", "T7s+", "97s+", "86s+", "76s", "65s", "A8o+", "KTo+", "QTo+", "JTo"]) }),
      SB: Object.freeze({ "*": Object.freeze(["33+", "A2s+", "K5s+", "Q7s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "64s+", "A7o+", "K9o+", "QTo+", "JTo"]) }),
      BB: Object.freeze({ "*": Object.freeze(["33+", "A2s+", "K5s+", "Q7s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "64s+", "A7o+", "K9o+", "QTo+", "JTo"]) })
    })
  });

  const PACKS = Object.freeze({
    "hidden-archetypes": Object.freeze({
      key: "hidden-archetypes",
      label: "Hidden archetypes",
      difficultyBand: "mixed",
      productGoal: "Back-compatible default roster: fish, regs, nits, stations, and aggro seats are hidden from the student.",
      compatibleLineups: ["single", "mixed", "soft", "tough"],
      runtime: Object.freeze({
        legacyLineup: true
      }),
      targetStats: Object.freeze({
        vpip: [18, 42],
        pfr: [12, 32],
        threeBet: [4, 14],
        limp: [0, 12]
      }),
      leaks: Object.freeze(["mixed_roster", "style_discovery"])
    }),

    "limping-fish": Object.freeze({
      key: "limping-fish",
      label: "Limping fish pool",
      difficultyBand: "easy",
      productGoal: "Practice isolating and value-betting loose passive players who enter too many pots by limp/call.",
      runtime: Object.freeze({
        seats: Object.freeze([
          Object.freeze({
            role: "limp-call-station",
            tier: "weak",
            style: "station",
            difficulty: "easy",
            weight: 4,
            modelIds: Object.freeze(["weak-calling-station"]),
            profile: Object.freeze({
              leakTags: Object.freeze(["open_limp", "limp_call_wide", "calls_pairs_too_wide", "underbluffs_river"]),
              focusSkill: "isolation",
	              production: Object.freeze({
	                openFrequency: -0.04,
	                limpFrequency: 0.42,
	                defenseFrequency: 0.1,
                threeBetFrequency: -0.12,
                fourBetFrequency: -0.08,
                topPairBet: -0.04,
                weakPairBet: -0.05,
                airBet: -0.06,
                topPairMaxPrice: 0.1,
                weakPairMaxPrice: 0.14,
                drawMaxPrice: 0.08,
                floatChance: 0.08,
                heroCallChance: 0.1,
                donkFrequency: 0.08,
                sizeBias: -0.08
              })
            })
          }),
          Object.freeze({
            role: "loose-limper-spew",
            tier: "weak",
            style: "fish",
            difficulty: "easy",
            weight: 3,
            modelIds: Object.freeze(["weak-spew"]),
            profile: Object.freeze({
              leakTags: Object.freeze(["open_limp", "limp_call_wide", "overplays_weak_pair", "stabs_small_pots"]),
              focusSkill: "value_vs_recreationals",
	              production: Object.freeze({
	                openFrequency: 0.02,
	                limpFrequency: 0.48,
	                defenseFrequency: 0.08,
                threeBetFrequency: -0.06,
                fourBetFrequency: -0.04,
                weakPairBet: 0.04,
                airBet: 0.08,
                topPairMaxPrice: 0.05,
                weakPairMaxPrice: 0.1,
                drawMaxPrice: 0.05,
                heroCallChance: 0.08,
                donkFrequency: 0.12,
                overbetFrequency: 0.04,
                sizeBias: 0.03
              })
            })
          }),
          Object.freeze({
            role: "fit-or-fold-limper",
            tier: "weak",
            style: "passive",
            difficulty: "easy",
            weight: 2,
            modelIds: Object.freeze(["weak-fit-or-fold"]),
            profile: Object.freeze({
              leakTags: Object.freeze(["open_limp", "fit_or_fold_flop", "folds_turn_pressure"]),
              focusSkill: "barrel_selection",
	              production: Object.freeze({
	                openFrequency: -0.08,
	                limpFrequency: 0.34,
	                defenseFrequency: -0.04,
                threeBetFrequency: -0.12,
                fourBetFrequency: -0.08,
                topPairBet: -0.05,
                weakPairBet: -0.12,
                airBet: -0.08,
                topPairMaxPrice: -0.04,
                weakPairMaxPrice: -0.08,
                drawMaxPrice: -0.04,
                floatChance: -0.06,
                heroCallChance: -0.06,
                donkFrequency: -0.04,
                sizeBias: -0.06
              })
            })
          })
        ])
      }),
      targetStats: Object.freeze({
        vpip: [38, 65],
        pfr: [5, 18],
        threeBet: [1, 5],
        limp: [20, 45],
        foldToIso: [28, 52]
      }),
      preflop: Object.freeze({
        openLimp: "high",
        limpCall: "wide",
        isoRaise: "rare",
        threeBet: "low",
        shortStackJam: "underjam"
      }),
      postflop: Object.freeze({
        callDown: "wide",
        bluffRaise: "low",
        donkProbe: "medium",
        riverBluff: "low"
      }),
      leaks: Object.freeze(["open_limp", "limp_call_wide", "overcall_flop", "underbluff_river"])
    }),

    "calling-stations": Object.freeze({
      key: "calling-stations",
      label: "Calling stations",
      difficultyBand: "easy",
      productGoal: "Practice thin value, larger value sizing, and lower bluff frequency against sticky opponents.",
      runtime: Object.freeze({
        seats: Object.freeze([
          Object.freeze({
            role: "sticky-caller",
            tier: "weak",
            style: "station",
            difficulty: "easy",
            weight: 5,
            modelIds: Object.freeze(["weak-calling-station"]),
            profile: Object.freeze({
              leakTags: Object.freeze(["calls_pairs_too_wide", "overcalls_draws", "pays_river"]),
              focusSkill: "thin_value",
	              production: Object.freeze({
	                openFrequency: -0.02,
	                limpFrequency: 0.24,
	                defenseFrequency: 0.14,
                threeBetFrequency: -0.12,
                fourBetFrequency: -0.1,
                weakPairBet: -0.05,
                airBet: -0.08,
                topPairMaxPrice: 0.12,
                weakPairMaxPrice: 0.16,
                comboDrawMaxPrice: 0.08,
                drawMaxPrice: 0.1,
                floatChance: 0.08,
                heroCallChance: 0.12,
                sizeBias: -0.08
              })
            })
          }),
          Object.freeze({
            role: "loose-splash",
            tier: "weak",
            style: "fish",
            difficulty: "easy",
            weight: 2,
            modelIds: Object.freeze(["weak-spew"]),
            profile: Object.freeze({
              leakTags: Object.freeze(["loose_preflop", "calls_pairs_too_wide", "stabs_missed_checks"]),
              focusSkill: "value_bet_sizing",
	              production: Object.freeze({
	                openFrequency: 0.04,
	                limpFrequency: 0.26,
	                defenseFrequency: 0.08,
                threeBetFrequency: -0.04,
                fourBetFrequency: -0.06,
                weakPairBet: 0.02,
                airBet: 0.06,
                topPairMaxPrice: 0.06,
                weakPairMaxPrice: 0.1,
                drawMaxPrice: 0.06,
                floatChance: 0.06,
                heroCallChance: 0.1,
                overbetFrequency: 0.04,
                sizeBias: 0.02
              })
            })
          })
        ])
      }),
      targetStats: Object.freeze({
        vpip: [34, 58],
        pfr: [8, 22],
        threeBet: [1, 6],
        wentToShowdown: [34, 52]
      }),
      preflop: Object.freeze({
        callOpen: "wide",
        threeBet: "low",
        fourBet: "very_low"
      }),
      postflop: Object.freeze({
        callDown: "very_wide",
        bluffRaise: "low",
        riverHeroCall: "high"
      }),
      leaks: Object.freeze(["overcall_flop", "overcall_turn", "pays_river", "underraises_value"])
    }),

    "nit-regs": Object.freeze({
      key: "nit-regs",
      label: "Nit regs",
      difficultyBand: "medium",
      productGoal: "Practice stealing blinds, attacking capped ranges, and avoiding overpaying value-heavy lines.",
      runtime: Object.freeze({
        seats: Object.freeze([
          Object.freeze({
            role: "tight-value-reg",
            tier: "standard",
            style: "nit",
            difficulty: "standard",
            weight: 4,
            modelIds: Object.freeze(["reg-tight-value"]),
            profile: Object.freeze({
              leakTags: Object.freeze(["overfolds_blinds", "underbluffs_river", "value_heavy_3bet"]),
              focusSkill: "steal_pressure",
              production: Object.freeze({
                openFrequency: -0.04,
                defenseFrequency: -0.1,
                threeBetFrequency: -0.08,
                fourBetFrequency: -0.06,
                topPairBet: -0.04,
                weakPairBet: -0.08,
                airBet: -0.08,
                topPairMaxPrice: -0.05,
                weakPairMaxPrice: -0.08,
                drawMaxPrice: -0.04,
                floatChance: -0.06,
                heroCallChance: -0.06,
                sizeBias: -0.03
              })
            })
          }),
          Object.freeze({
            role: "scared-money-nit",
            tier: "weak",
            style: "nit",
            difficulty: "easy",
            weight: 2,
            modelIds: Object.freeze(["weak-scared-nit"]),
            profile: Object.freeze({
              leakTags: Object.freeze(["overfolds_blinds", "fit_or_fold_flop", "folds_turn_pressure"]),
              focusSkill: "pressure_capped_ranges",
              production: Object.freeze({
                openFrequency: -0.08,
                defenseFrequency: -0.14,
                threeBetFrequency: -0.12,
                fourBetFrequency: -0.1,
                topPairBet: -0.08,
                weakPairBet: -0.12,
                airBet: -0.1,
                topPairMaxPrice: -0.08,
                weakPairMaxPrice: -0.1,
                drawMaxPrice: -0.06,
                floatChance: -0.08,
                heroCallChance: -0.08,
                sizeBias: -0.04
              })
            })
          })
        ])
      }),
      targetStats: Object.freeze({
        vpip: [12, 24],
        pfr: [9, 20],
        threeBet: [3, 8],
        foldBlindToSteal: [54, 76]
      }),
      preflop: Object.freeze({
        open: "tight",
        blindDefense: "tight",
        threeBet: "value_heavy"
      }),
      postflop: Object.freeze({
        barrelBluff: "low",
        valueBet: "strong",
        bluffCatch: "tight"
      }),
      leaks: Object.freeze(["overfold_blinds", "underbluff_river", "range_face_up"])
    }),

    "aggro-regs": Object.freeze({
      key: "aggro-regs",
      label: "Aggro regs",
      difficultyBand: "hard",
      productGoal: "Practice defending versus pressure, 3bet pots, delayed aggression, and bluff-catching with blockers.",
      runtime: Object.freeze({
        seats: Object.freeze([
          Object.freeze({
            role: "light-aggro-reg",
            tier: "standard",
            style: "aggro",
            difficulty: "standard",
            weight: 3,
            modelIds: Object.freeze(["reg-aggro-light"]),
            profile: Object.freeze({
              leakTags: Object.freeze(["wide_3bet", "barrels_too_wide", "pressure_turn"]),
              focusSkill: "defense_vs_aggression",
              production: Object.freeze({
                openFrequency: 0.03,
                defenseFrequency: 0.02,
                threeBetFrequency: 0.12,
                fourBetFrequency: 0.07,
                comboDrawBet: 0.04,
                drawBet: 0.04,
                overcardBet: 0.05,
                airBet: 0.08,
                checkRaiseFrequency: 0.08,
	                overbetFrequency: 0.08,
	                donkFrequency: 0.05,
	                sizeBias: 0.05
	              }),
	              realizedRanges: AGGRO_PACK_REALIZED_RANGES
	            })
          }),
          Object.freeze({
            role: "top-pressure-seat",
            tier: "top",
            style: "aggro",
            difficulty: "pro",
            weight: 2,
            modelIds: Object.freeze([]),
            profile: Object.freeze({
              leakTags: Object.freeze(["balanced_pressure", "probe_delayed_lines", "river_polarization"]),
              focusSkill: "tough_pool_adjustment",
              production: Object.freeze({
                openFrequency: 0.02,
                defenseFrequency: 0.01,
                threeBetFrequency: 0.1,
                fourBetFrequency: 0.08,
                comboDrawBet: 0.04,
                drawBet: 0.04,
                overcardBet: 0.04,
                airBet: 0.08,
                checkRaiseFrequency: 0.1,
	                overbetFrequency: 0.12,
	                donkFrequency: 0.06,
	                sizeBias: 0.08
	              }),
	              realizedRanges: AGGRO_PACK_REALIZED_RANGES
	            })
          })
        ])
      }),
      targetStats: Object.freeze({
        vpip: [24, 38],
        pfr: [20, 34],
        threeBet: [9, 18],
        checkRaise: [8, 18]
      }),
      preflop: Object.freeze({
        threeBet: "high",
        squeeze: "high",
        coldCall: "low"
      }),
      postflop: Object.freeze({
        cbet: "high",
        barrel: "high",
        checkRaise: "medium_high",
        overbet: "medium"
      }),
      leaks: Object.freeze(["overbluff_selected_nodes", "wide_3bet", "pressure_turn"])
    }),

    "gto-tough": Object.freeze({
      key: "gto-tough",
      label: "GTO-ish tough pool",
      difficultyBand: "expert",
      productGoal: "Provide the strongest general-purpose pool; no intentional obvious leaks.",
      runtime: Object.freeze({
        seats: Object.freeze([
          Object.freeze({
            role: "certified-top",
            tier: "top",
            style: "reg",
            difficulty: "pro",
            weight: 1,
            modelIds: Object.freeze([]),
            profile: Object.freeze({
              leakTags: Object.freeze(["balanced_baseline"]),
              focusSkill: "full_game",
              production: Object.freeze({})
            })
          })
        ])
      }),
      targetStats: Object.freeze({
        vpip: [20, 34],
        pfr: [17, 30],
        threeBet: [7, 15],
        exploitabilityCapBb100: [0, 3]
      }),
      preflop: Object.freeze({
        open: "balanced",
        blindDefense: "solver_like",
        threeBet: "polar_linear_mix"
      }),
      postflop: Object.freeze({
        cbet: "texture_aware",
        barrel: "range_aware",
        bluffCatch: "blocker_aware"
      }),
      leaks: Object.freeze([])
    }),

    "exploit-auditors": Object.freeze({
      key: "exploit-auditors",
      label: "Exploit auditors",
      difficultyBand: "audit",
      productGoal: "Stress-test candidate strategies for obvious human-exploitable mistakes before promotion.",
      runtime: Object.freeze({
        seats: Object.freeze([
          Object.freeze({
            role: "big-bet-bluffer",
            tier: "top",
            style: "aggro",
            difficulty: "pro",
            weight: 2,
            modelIds: Object.freeze([]),
            profile: Object.freeze({
              leakTags: Object.freeze(["bluffs_big_bets", "tests_size_read_overfold"]),
              focusSkill: "size_read_robustness",
              production: Object.freeze({
                openFrequency: 0.02,
                defenseFrequency: 0.03,
                threeBetFrequency: 0.12,
                fourBetFrequency: 0.08,
                comboDrawBet: 0.08,
                drawBet: 0.08,
                overcardBet: 0.08,
                airBet: 0.18,
                checkRaiseFrequency: 0.14,
                overbetFrequency: 0.26,
	                donkFrequency: 0.12,
	                jamFrequency: 0.08,
	                sizeBias: 0.18
	              }),
	              realizedRanges: AUDIT_PACK_REALIZED_RANGES
	            })
          }),
          Object.freeze({
            role: "squeeze-spammer",
            tier: "standard",
            style: "aggro",
            difficulty: "standard",
            weight: 2,
            modelIds: Object.freeze(["reg-aggro-light"]),
            profile: Object.freeze({
              leakTags: Object.freeze(["squeeze_spam", "tests_open_fold_vs_3bet"]),
              focusSkill: "vs_3bet",
              production: Object.freeze({
                openFrequency: 0.02,
                defenseFrequency: 0.02,
                threeBetFrequency: 0.24,
                fourBetFrequency: 0.1,
                airBet: 0.06,
	                checkRaiseFrequency: 0.08,
	                overbetFrequency: 0.12,
	                jamFrequency: 0.08,
	                sizeBias: 0.08
	              }),
	              realizedRanges: AUDIT_PACK_REALIZED_RANGES
	            })
          }),
          Object.freeze({
            role: "short-stack-any-two-defender",
            tier: "top",
            style: "reg",
            difficulty: "pro",
            weight: 1,
            modelIds: Object.freeze([]),
            profile: Object.freeze({
              leakTags: Object.freeze(["tests_short_allin_defense", "tests_pot_committed_folds"]),
              focusSkill: "short_stack",
              production: Object.freeze({
                openFrequency: 0.08,
                defenseFrequency: 0.18,
                threeBetFrequency: 0.12,
                fourBetFrequency: 0.08,
                jamFrequency: 0.18,
                topPairMaxPrice: 0.06,
                weakPairMaxPrice: 0.05,
	                drawMaxPrice: 0.04,
	                floatChance: 0.04,
	                heroCallChance: 0.04
	              }),
	              realizedRanges: AUDIT_PACK_REALIZED_RANGES
	            })
          })
        ])
      }),
      targetStats: Object.freeze({
        exploitScanOnly: [1, 1],
        threeBet: [10, 24],
        overbet: [10, 30],
        checkRaise: [10, 24]
      }),
      preflop: Object.freeze({
        squeeze: "stress_high",
        shortStackJam: "stress_high",
        callShove: "price_aware"
      }),
      postflop: Object.freeze({
        overbetBluff: "stress_high",
        smallBetProbe: "stress_high",
        checkRaise: "stress_high"
      }),
      leaks: Object.freeze(["audit_bot_not_training_default"])
    })
  });

  const PROFILE = Object.freeze({
    schema: "poker-simulator-bot-pack-profile-v2",
    schemaVersion: 2,
    version: "2026-06-29-botpack-v2-bridge",
    generatedAt: "2026-06-29T00:00:00.000Z",
    source: "manual-product-contract",
    packs: PACKS,
    defaultPack: "hidden-archetypes",
    aliases: Object.freeze({
      default: "hidden-archetypes",
      auto: "hidden-archetypes",
      hidden: "hidden-archetypes",
      mixed: "hidden-archetypes",
      fish: "limping-fish",
      limpers: "limping-fish",
      "limping-fishes": "limping-fish",
      stations: "calling-stations",
      callingstation: "calling-stations",
      nit: "nit-regs",
      nits: "nit-regs",
      aggro: "aggro-regs",
      aggressive: "aggro-regs",
      tough: "gto-tough",
      gto: "gto-tough",
      top: "gto-tough",
      audit: "exploit-auditors",
      exploit: "exploit-auditors"
    })
  });

  const root = typeof window !== "undefined" ? window : globalThis;
  root.PokerSimulatorBotPackProfile = PROFILE;
  if (typeof module !== "undefined" && module.exports) module.exports = PROFILE;
})();
