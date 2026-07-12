// Postflop policy, grading, hand evaluation, and board texture helpers. Loaded before simulator-engine.js facade.

  // Smallest stack a bet/raise may leave behind for the bettor or any caller. A
  // remainder below this (e.g. 0.2 BB) is a dead, unplayable scrap — the sizing
  // snaps up to the relevant all-in instead. See snapPostflopBetLeaveBehind.
  const MIN_STACK_BEHIND_BB = 1;

  function initializePostflopSpot(table, spot) {
    const villain = seatByPosition(table, spot.villainPosition) || table.seats.find((seat) => !seat.isHero);
    table.activeVillain = villain?.id ?? chooseDefaultVillain(table);
    table.contestingSeatIds = [0, table.activeVillain].filter((seatId, index, list) =>
      Number.isFinite(Number(seatId)) && list.indexOf(seatId) === index
    );
    table.seats.forEach((seat) => {
      if (table.contestingSeatIds.includes(seat.id)) return;
      foldSeat(table, seat, "preflop");
    });

    table.board = boardCardsForSpot(table, spot);
    table.street = spot.startStreet || "flop";
    table.currentBet = 0;
    table.lastRaiseSize = 0;
    table.minRaiseTo = 1;
    table.toCall = Number(spot.toCall || 0);
    table.canCheck = table.toCall <= 0 && spot.canCheck !== false;
    table.heroTurn = true;
    table.busy = false;
    table.villainActedThisStreet = false;
    table.streetActionSeatIds = [];
    table.preflopAggressorSeatId = inferSpotInitiativeSeatId(table, spot);
    // C1a: best-effort opener for scripted spots — the spot aggressor is the opener; open-to falls back
    // to a sane baseline (originalOpenToBb) since scripted spots don't replay the original open size.
    table.preflopOpenerSeatId = table.preflopAggressorSeatId;
    table.preflopOpenToBb = 0;
    table.preflopOpenCallerSeatIds = [];
    table.initiativeSeatId = table.preflopAggressorSeatId;
    table.streetAggressorSeatId = null;
    table.previousStreetAggressorSeatId = null;
    table.previousStreetCheckedThrough = false;
    table.pot = Math.max(0, roundBbValue(Number(spot.startPot ?? spot.pot ?? 0) - table.toCall));
    table.contributions = {};
    table.seatBets = {};

    if (table.toCall > 0 && Number.isFinite(Number(table.activeVillain))) {
      const paidAmount = addSeatContribution(table, table.activeVillain, table.toCall, false);
      table.currentBet = paidAmount;
      table.lastRaiseSize = paidAmount;
      table.minRaiseTo = Math.min(maxContributionForSeat(table, 0), paidAmount * 2);
      table.canCheck = false;
      table.streetAggressorSeatId = table.activeVillain;
      recordSeatAction(table, table.activeVillain, `Bet ${formatBb(paidAmount)}`, "aggressive", true, { botReason: spot.prompt, labSpot: postflopLabSpot(table, spot.prompt, false) });
    }

    table.pot = roundBbValue(Math.max(table.pot, Number(spot.startPot ?? spot.pot ?? table.pot)));
    table.lastAction = spot.prompt || `${streetLabel(table.street)} spot`;
    addLog(table, table.lastAction);
    recordTimeline(table, "street", `${streetLabel(table.street)} spot`, { board: table.board.slice(), pot: table.pot });
    table.spot = {
      ...table.spot,
      ...spot,
      heroPosition: table.heroPosition,
      villainPosition: villain?.position || spot.villainPosition
    };
  }

  function boardCardsForSpot(table, spot) {
    const boardCards = spot.boardCards;
    const targetCount = Array.isArray(boardCards)
      ? Math.min(5, boardCards.length)
      : Math.max(0, Math.min(5, Number(boardCards || streetBoardCount(spot.startStreet))));
    const board = [];

    if (Array.isArray(boardCards)) {
      boardCards.slice(0, targetCount).forEach((card) => {
        const parsed = parseCardCode(String(card));
        const removed = removeCard(table.deck, parsed.rank, parsed.suit);
        // If the requested card was already dealt (collision with a hole card),
        // draw a fresh card so the board stays disjoint from dealt hands instead
        // of pushing a duplicate. Validation (validateBoardCards) makes such
        // packs fail loudly at registration time.
        board.push(removed || drawCard(table.deck));
      });
    }

    while (board.length < targetCount) {
      board.push(drawCard(table.deck));
    }

    return board;
  }

  function streetBoardCount(street) {
    if (street === "turn") return 4;
    if (street === "river") return 5;
    return 3;
  }

  function inferSpotInitiativeSeatId(table, spot) {
    const branchText = (spot.branch || []).join(" ").toLowerCase();
    if (branchText.includes("sb complete") && table.heroPosition === "BB" && spot.villainPosition === "SB") return null;
    if (branchText.includes(`${String(table.heroPosition).toLowerCase()} open`) || branchText.includes(`${String(table.heroPosition).toLowerCase()} raise`)) return 0;
    const villainPosition = String(spot.villainPosition || "").toLowerCase();
    if (villainPosition && (branchText.includes(`${villainPosition} open`) || branchText.includes(`${villainPosition} raise`) || branchText.includes(`${villainPosition} bet`))) {
      return table.activeVillain;
    }
    return null;
  }

  function rememberClosedStreet(table) {
    if (!table || table.street === "preflop" || table.street === "showdown") {
      if (table) {
        table.previousStreetAggressorSeatId = null;
        table.previousStreetCheckedThrough = false;
      }
      return;
    }

    const hasStreetAggressor = table.streetAggressorSeatId !== null
      && table.streetAggressorSeatId !== undefined
      && table.streetAggressorSeatId !== "";
    const streetAggressor = hasStreetAggressor ? Number(table.streetAggressorSeatId) : NaN;
    table.previousStreetAggressorSeatId = Number.isFinite(streetAggressor)
      ? streetAggressor
      : null;
    table.previousStreetCheckedThrough = table.previousStreetAggressorSeatId == null;
  }

  // C3: cold-call-vs-3bet. A non-opener facing a (non-all-in) 3bet that did NOT 4bet upstream gets a
  // deliberately narrow flat-or-fold — cold-calling 3bets is maximally avoided. Three classes:
  //  - pure cold-behind (only a blind in the pot): tiny + size-dependent {QQ,JJ,TT,AQs}; a very large
  //    3bet (ratio > 4x the open) drops TT/AQs to just {QQ,JJ}.
  //  - squeeze-caller (already flat-called the open → better price): wider, suited/pairs only, with a
  //    set-mining price guard for small pairs.
  // Premium nuts that randomly skipped their upstream 4bet never fold (rare trap-flat). The original
  // opener is handled separately (it is NOT cold) and keeps preHeroContinueDecision's wider logic.
  function coldCallVsThreeBetDecision(table, seat, combo, style, stackDepth, options = {}) {
    const currentBet = Number(table.currentBet || 0);
    const added = Math.max(0, currentBet - contributionOf(table, seat.id));
    const flat = (label) => ({ action: "call", target: currentBet, added, label: `${combo} ${label}` });
    const fold = (why) => ({ action: "fold", label: `${combo} avoid cold-call 3bet (${why})` });
    const nuts = ["AA", "KK", "AKs", "AKo"].includes(combo);
    // No speculative cold flat below 60bb effective — 4bet-or-fold (nuts already 4bet upstream).
    if (Number(stackDepth) < 60) return nuts ? flat("cold nuts vs 3bet (short)") : fold("short <60bb");
    if (nuts) return flat("cold nuts flat vs 3bet");

    const ratio = currentBet / Math.max(1, originalOpenToBb(table));
    if (isPreflopOpenCaller(table, seat)) {
      // squeeze-caller — suited + pairs only (offsuit folds); already invested with a better price.
      const valueFlat = ["QQ", "JJ", "TT", "AQs", "AJs", "KQs", "KJs", "QJs", "JTs", "T9s", "A5s", "A4s"];
      if (valueFlat.includes(combo)) {
        if (ratio > 4 && ["A5s", "A4s", "T9s", "JTs"].includes(combo)) return fold("squeeze trim vs big 3bet");
        return flat("squeeze-caller flat vs 3bet");
      }
      if (isPocketPairCombo(combo)) {
        const pairVal = RANK_VALUES[combo[0]] || 0;
        if (pairVal >= RANK_VALUES["2"] && pairVal <= RANK_VALUES["9"]) {
          // Set-mine 22-99 only at a set-mining price (cheap toCall OR implied >= ~15:1), then ~60%.
          const eff = Math.min(maxContributionForSeat(table, seat.id), effectiveAllInCeiling(table, seat.id));
          const behind = Math.max(0, eff - currentBet);
          const priceOk = added <= 0.06 * Math.max(1, eff) || behind / Math.max(0.1, added) >= 15;
          if (priceOk && (options.deterministic || randomChance(styleAdjustedFrequency(0.6, style, "continue")))) return flat("squeeze set-mine vs 3bet");
          return fold("squeeze set-mine price/freq");
        }
      }
      return fold("squeeze off-range");
    }

    // pure cold-behind — narrow + size-dependent.
    const designed = ratio > 4 ? ["QQ", "JJ"] : ["QQ", "JJ", "TT", "AQs"];
    return designed.includes(combo) ? flat("cold-behind flat vs 3bet 60bb+") : fold("cold-behind off-range");
  }

  function preHeroContinueDecision(difficulty, style, combo, patterns, context = {}) {
    const inChart = chartContains(patterns, combo);
    const proThreeBetFrequency = proThreeBetDefenseFrequency(difficulty, style, combo, context);
    if (!inChart) {
      if (proThreeBetFrequency !== null) {
        return randomChance(proThreeBetFrequency)
          ? { continue: true, label: "pro priced flat vs 3bet" }
          : { continue: false, label: "pro price fold vs 3bet" };
      }
      const looseContext = context.facingThreeBet ? "threeBet" : "continue";
      if (
        difficulty === "easy"
        && isLoosePreflopCandidate(combo, looseContext)
        && randomChance(clamp(styleAdjustedFrequency(context.facingThreeBet ? 0.06 : 0.12, style, "continue") + botDefenseFrequencyAdjustment(difficulty, context), 0, 1))
      ) {
        return { continue: true, label: context.facingThreeBet ? "textured flat vs 3bet" : "textured loose continue" };
      }
      return { continue: false, label: "outside continue chart" };
    }

    const premium = isPremiumPreflopCombo(combo);
    const pair = isPocketPairCombo(combo);
    const marginal = isMarginalPreflopCombo(combo);

    // A premium that did not 3-bet never folds to a single open (any tier). Without this, the easy
    // frequency gate below folds ~10% of premiums; standard/pro already continue unconditionally.
    if (premium) return { continue: true, label: "continue chart (premium)" };

    if (difficulty === "easy") {
      const baseFrequency = premium ? 0.9 : pair ? 0.76 : marginal ? 0.56 : 0.68;
      const frequency = clamp(styleAdjustedFrequency(baseFrequency, style, "continue") + botDefenseFrequencyAdjustment(difficulty, context), 0, 1);
      return randomChance(frequency)
        ? { continue: true, label: "loose continue" }
        : { continue: false, label: "missed easy continue" };
    }

    if (context.facingThreeBet) {
      // Facing a 3-bet: strong value already 4-bet upstream (threeBetFrequency); here we cold-call far
      // tighter than a single-raise defense. Premiums flat, pairs set-mine sometimes, suited hands mix,
      // offsuit non-premium folds — lifting fold-to-3bet toward ~65% instead of flatting the whole
      // single-raise-defense range with every pair at 100%.
      if (premium) return { continue: true, label: "flat vs 3bet" };
      const suitedCombo = typeof combo === "string" && combo.length === 3 && combo[2] === "s";
      // C4: the opener's 3bet-defense (cold-callers are handled by C3 upstream) shrinks vs larger 3bets.
      const betFactor = threeBetDefenseElasticity(context.threeBetRatio, style, difficulty);
      const defenseAdjustment = botDefenseFrequencyAdjustment(difficulty, context);
      if (pair) {
        const frequency = Math.max(
          clamp(styleAdjustedFrequency(0.55, style, "continue") + defenseAdjustment, 0, 1) * betFactor,
          proThreeBetFrequency ?? 0
        );
        return randomChance(frequency)
          ? { continue: true, label: "set-mine vs 3bet" }
          : { continue: false, label: "fold pair vs 3bet" };
      }
      if (suitedCombo) {
        const frequency = Math.max(
          clamp(styleAdjustedFrequency(0.5, style, "continue") + defenseAdjustment, 0, 1) * betFactor,
          proThreeBetFrequency ?? 0
        );
        return randomChance(frequency)
          ? { continue: true, label: "flat suited vs 3bet" }
          : { continue: false, label: "fold suited vs 3bet" };
      }
      if (proThreeBetFrequency !== null) {
        return randomChance(proThreeBetFrequency)
          ? { continue: true, label: "pro priced flat vs 3bet" }
          : { continue: false, label: "pro price fold vs 3bet" };
      }
      return { continue: false, label: "fold offsuit vs 3bet" };
    }

    if (premium || pair) {
      return { continue: true, label: "continue chart" };
    }

    const openTo = Number(context.openTo || 0);
    const openerBucket = openerPositionBucket(context.openerPosition);
    const defenderBucket = positionBucket(context.defenderPosition);
    if (
      context.singleRaise
      && openerBucket === "SB"
      && defenderBucket === "BLIND"
      && openTo > 0
      && openTo <= 2.05
    ) {
      return { continue: true, label: "priced minraise defense" };
    }

    if (isStrongSingleRaiseDefenseCombo(combo, context)) {
      return {
        continue: true,
        label: `strong single-raise defense${context.openerPosition ? ` vs ${context.openerPosition}` : ""}`
      };
    }

    if (context.singleRaise && difficulty !== "easy") {
      const frequency = singleRaiseDefenseFrequency(difficulty, style, combo, context);
      return randomChance(frequency)
        ? {
          continue: true,
          label: `single-raise defense chart${context.openerPosition ? ` vs ${context.openerPosition}` : ""}`
        }
        : {
          continue: false,
          label: `frequency fold single-raise defense${context.openerPosition ? ` vs ${context.openerPosition}` : ""}`
        };
    }

    const frequency = difficulty === "pro"
      ? marginal ? 0.72 : 0.82
      : marginal ? 0.62 : 0.76;

    return randomChance(styleAdjustedFrequency(frequency, style, "continue"))
      ? { continue: true, label: "continue chart" }
      : { continue: false, label: "frequency fold" };
  }

  function isStrongSingleRaiseDefenseCombo(combo, context = {}) {
    if (!context.singleRaise || context.facingThreeBet || context.allInPressure) return false;
    if (Math.max(0, Number(context.coldCallers) || 0) > 0) return false;
    const openTo = Number(context.openTo || 0);
    if (!(openTo > 0) || openTo > 3.5) return false;

    const openerBucket = openerPositionBucket(context.openerPosition);
    const defenderBucket = positionBucket(context.defenderPosition);
    const lateOpen = openerBucket === "CO" || openerBucket === "BTN" || openerBucket === "SB";
    if (!(defenderBucket === "BLIND" && lateOpen)) return false;

    const shape = preflopRankShape(combo);
    if (shape.high === RANK_VALUES.A && shape.low >= RANK_VALUES.T) return true;
    if (shape.high === RANK_VALUES.K && shape.low >= RANK_VALUES.Q) return true;
    return isSuitedCombo(combo) && shape.high >= RANK_VALUES.Q && shape.low >= RANK_VALUES.T;
  }

  function styleAdjustedFrequency(frequency, style, context) {
    let result = Number(frequency || 0);
    if (style === "passive") {
      // passive = sticky (over-flats/over-floats), not nit-tight. Stay below station (+0.12).
      result += context === "curiosity" ? 0.08 : 0.06;
    } else if (style === "aggro") {
      result += context === "curiosity" ? 0.1 : 0.08;
    } else if (style === "station") {
      result += context === "curiosity" ? 0.16 : 0.12;
    } else if (style === "fish" || style === "nit") {
      result += botPreflopTrait(style, context === "curiosity" ? "curiosity" : "continue");
    }
    return clamp(result, 0, 1);
  }

  // C4: preflop sizing elasticity. Defense width shrinks as the raise grows past a baseline; at/below
  // baseline it is unchanged, so normal-size opens/3bets keep their tuned behaviour (and locked smokes).
  // pro folds a touch steeper to big sizes; sticky fish/station are shallower.
  function elasticitySlopeScale(style, difficulty) {
    if (normalizeDifficulty(difficulty) === "pro") return 1.05;
    if (style === "fish" || style === "station") return 0.7;
    return 1;
  }
  function openDefenseElasticity(openTo, style, difficulty) {
    const slope = 0.18 * elasticitySlopeScale(style, difficulty);
    return clamp(1 - slope * Math.max(0, Number(openTo || 0) - 2.3), 0.45, 1);
  }
  function threeBetDefenseElasticity(ratio, style, difficulty) {
    const slope = 0.22 * elasticitySlopeScale(style, difficulty);
    return clamp(1 - slope * Math.max(0, Number(ratio || 0) - 3), 0.30, 1);
  }

  function botDefenseFrequencyAdjustment(difficulty, context = {}) {
    const adjustment = botStrategyArenaProductionAdjustment(difficulty, "defenseFrequency", context.seat);
    if (!context.facingThreeBet || normalizeDifficulty(difficulty) !== "pro") return adjustment;
    // Arena winners can carry tight single-raise defense bias. Use less of that negative bias at 3bet
    // nodes so the top pool stays selective without folding a visible 65%+ against spam 3bets.
    if (adjustment < 0) return adjustment * 0.45;
    return adjustment;
  }

  function proThreeBetDefenseFrequency(difficulty, style, combo, context = {}) {
    if (normalizeDifficulty(difficulty) !== "pro" || !context.facingThreeBet || context.allInPressure) return null;

    const stackDepth = Number(context.stackDepth || 0);
    if (stackDepth > 0 && stackDepth < 24) return null;
    const ratio = Number(context.threeBetRatio || 3);
    const expensive = ratio > 4.6;
    const mediumPrice = ratio > 3.8;
    const shallow = stackDepth > 0 && stackDepth < 60;
    const openerBucket = openerPositionBucket(context.openerPosition);
    const lateSteal = openerBucket === "CO" || openerBucket === "BTN" || openerBucket === "SB";
    let base = null;

    if (isPocketPairCombo(combo)) {
      const pairValue = RANK_VALUES[combo[0]] || 0;
      if (pairValue >= RANK_VALUES["2"] && pairValue <= RANK_VALUES["9"]) {
        base = shallow
          ? expensive ? 0.28 : mediumPrice ? 0.4 : 0.54
          : expensive ? 0.52 : mediumPrice ? 0.66 : 0.78;
      }
    } else if (isSuitedCombo(combo) && combo[0] === "A") {
      base = shallow
        ? expensive ? 0.26 : mediumPrice ? 0.38 : 0.5
        : expensive ? 0.46 : mediumPrice ? 0.58 : 0.7;
    } else if (["KTs", "QTs", "Q9s", "JTs", "J9s", "T9s", "98s", "87s", "76s"].includes(combo)) {
      base = shallow
        ? expensive ? 0.18 : mediumPrice ? 0.28 : 0.4
        : expensive ? 0.32 : mediumPrice ? 0.42 : 0.52;
    } else if (["AJo", "ATo", "KQo", "KJo", "KTo", "QJo", "QTo", "JTo"].includes(combo)) {
      base = shallow
        ? expensive ? 0.16 : mediumPrice ? 0.26 : 0.36
        : expensive ? 0.28 : mediumPrice ? 0.38 : 0.48;
    } else if (lateSteal && ["A9o", "A8o", "A7o", "A5o", "A4o"].includes(combo)) {
      base = shallow
        ? expensive ? 0.12 : mediumPrice ? 0.22 : 0.32
        : expensive ? 0.23 : mediumPrice ? 0.33 : 0.43;
    } else if (lateSteal && ["K9s", "K8s", "K7s", "Q8s", "Q7s", "J8s", "T8s", "65s"].includes(combo)) {
      base = shallow
        ? expensive ? 0.1 : mediumPrice ? 0.2 : 0.3
        : expensive ? 0.21 : mediumPrice ? 0.31 : 0.41;
    }

    if (base === null) return null;
    const adjusted = clamp(styleAdjustedFrequency(base, style, "continue") + botDefenseFrequencyAdjustment(difficulty, context), 0, 1);
    return clamp(adjusted * threeBetDefenseElasticity(ratio, style, difficulty), 0.08, 0.92);
  }

  function singleRaiseDefenseFrequency(difficulty, style, combo, context = {}) {
    const marginal = isMarginalPreflopCombo(combo);
    let frequency = difficulty === "pro"
      ? marginal ? 0.6 : 0.76
      : marginal ? 0.52 : 0.68;
    frequency += botDefenseFrequencyAdjustment(difficulty, context);
    const openerBucket = openerPositionBucket(context.openerPosition);
    const defenderBucket = positionBucket(context.defenderPosition);

    if ((openerBucket === "EP" || openerBucket === "MP") && defenderBucket === "BLIND") frequency -= 0.12;
    if ((openerBucket === "CO" || openerBucket === "BTN") && defenderBucket === "BLIND") frequency += 0.08;
    if (defenderBucket === "LP" && (openerBucket === "CO" || openerBucket === "BTN")) frequency += 0.06;
    if (Number(context.stackDepth) <= 30) frequency += 0.08;
    if (openerBucket === "SB" && defenderBucket === "BLIND") {
      // Blind vs Blind: BB must defend very wide vs an SB open (pot odds + position),
      // canon says "almost any two vs a minraise". Lift the under-defended baseline.
      frequency += marginal ? 0.16 : 0.12;
      const openTo = Number(context.openTo);
      if (openTo > 0 && openTo <= 2.05) frequency += 0.06; // minraise: defend even wider
    }
    const coldCallers = Math.max(0, Number(context.coldCallers) || 0);
    if (coldCallers > 0 && !isPocketPairCombo(combo) && !isPremiumPreflopCombo(combo)) {
      const tier = normalizeDifficulty(difficulty);
      let scale;
      if (style === "passive" && tier !== "pro") {
        // passive over-cold-calls the field (sticky leak)
        scale = coldCallers >= 2 ? 1.2 : 1.12;
      } else if (style === "station") {
        // station telephones multiway (weak discipline leak)
        scale = coldCallers >= 2 ? 0.78 : 0.92;
      } else if (style === "fish") {
        // fish over-defends junk multiway (calibrated junk_overdefend leak)
        scale = coldCallers >= 2 ? 1.18 : 1.1;
      } else if (tier === "pro") {
        // disciplined optimum: collapse dominated marginals in multiway
        scale = coldCallers >= 2 ? 0.5 : 0.72;
        if (defenderBucket === "BLIND") scale *= 0.85;
        else if (defenderBucket === "LP" && (openerBucket === "CO" || openerBucket === "BTN")) scale *= 1.05;
      } else {
        // standard/reg deliberately multiway-BLIND (calibrated loose_cold_call leak)
        scale = 1;
      }
      frequency *= scale;
    }
    // C4: shrink defense width as the open grows past ~2.3bb (a 2bb minraise → full; a 5bb open → ~half).
    return styleAdjustedFrequency(frequency, style, "continue") * openDefenseElasticity(context.openTo, style, difficulty);
  }

  function isPocketPairCombo(combo) {
    return typeof combo === "string" && combo.length === 2 && combo[0] === combo[1];
  }

  function comboLowValue(combo) {
    if (!combo) return 0;
    return Math.min(RANK_VALUES[combo[0]] || 0, RANK_VALUES[combo[1]] || 0);
  }

  function isPremiumPreflopCombo(combo) {
    if (isPocketPairCombo(combo)) return (RANK_VALUES[combo[0]] || 0) >= RANK_VALUES.T;
    return ["AKs", "AKo", "AQs", "AQo", "AJs", "KQs"].includes(combo);
  }

  function isMarginalPreflopCombo(combo) {
    if (!combo || isPremiumPreflopCombo(combo)) return false;
    if (isPocketPairCombo(combo)) return (RANK_VALUES[combo[0]] || 0) <= RANK_VALUES["9"];
    if (combo.length === 3 && combo[2] === "s") {
      const gap = Math.abs((RANK_VALUES[combo[0]] || 0) - (RANK_VALUES[combo[1]] || 0));
      if (combo[0] === "A" && comboLowValue(combo) <= RANK_VALUES["8"]) return true;
      if (gap <= 2 && comboLowValue(combo) >= RANK_VALUES["6"]) return true;
      return ["KTs", "K9s", "QTs", "Q9s", "JTs", "J9s"].includes(combo);
    }
    return ["AJo", "ATo", "KQo", "KJo", "QJo", "QTo", "JTo"].includes(combo);
  }

  function isSmallBlindStealTail(position, combo) {
    if (position !== "SB" || !combo || isPremiumPreflopCombo(combo) || isPocketPairCombo(combo)) return false;
    const shape = preflopRankShape(combo);
    if (combo.length === 3 && combo[2] === "s") {
      if (shape.high >= RANK_VALUES.K && shape.low <= RANK_VALUES["9"]) return true;
      if (shape.high === RANK_VALUES.Q && shape.low <= RANK_VALUES["8"]) return true;
      if (shape.high <= RANK_VALUES.J && shape.distance <= 4) return true;
    }
    if (combo.length === 3 && combo[2] === "o") {
      if (shape.high === RANK_VALUES.A && shape.low <= RANK_VALUES["7"]) return true;
      if (shape.high === RANK_VALUES.K && shape.low <= RANK_VALUES["9"]) return true;
      if (shape.high === RANK_VALUES.Q && shape.low <= RANK_VALUES["9"]) return true;
      if (shape.high <= RANK_VALUES.J && shape.distance <= 3) return true;
    }
    return false;
  }

  function isSuitedCombo(combo) {
    return typeof combo === "string" && combo.length === 3 && combo[2] === "s";
  }

  function preflopRankShape(combo) {
    if (!combo || isPocketPairCombo(combo)) return { high: 0, low: 0, distance: 0 };
    const high = RANK_VALUES[combo[0]] || 0;
    const low = RANK_VALUES[combo[1]] || 0;
    return {
      high,
      low,
      distance: Math.abs(high - low)
    };
  }

  function isLoosePreflopCandidate(combo, context = "continue") {
    if (!combo) return false;
    if (isPocketPairCombo(combo) || isPremiumPreflopCombo(combo)) return true;

    const { high, low, distance } = preflopRankShape(combo);
    const suited = isSuitedCombo(combo);
    const aceHigh = combo[0] === "A";
    const broadwayConnected = high >= RANK_VALUES.Q && low >= RANK_VALUES.T;
    const suitedConnector = suited && distance <= 3 && low >= RANK_VALUES["5"];
    const offsuitConnector = !suited && distance <= 1 && low >= RANK_VALUES["7"];

    if (context === "threeBet") {
      return (suited && aceHigh)
        || (suited && distance <= 2 && low >= RANK_VALUES["8"])
        || (suited && high >= RANK_VALUES.K && low >= RANK_VALUES.T);
    }

    if (context === "open") {
      return (suited && (aceHigh || high >= RANK_VALUES.Q || (distance <= 4 && low >= RANK_VALUES["4"])))
        || (!suited && (broadwayConnected || (aceHigh && low >= RANK_VALUES["5"]) || (distance <= 2 && low >= RANK_VALUES["6"])));
    }

    return (suited && (aceHigh || high >= RANK_VALUES.K || suitedConnector))
      || (!suited && (broadwayConnected || (aceHigh && low >= RANK_VALUES["8"]) || offsuitConnector));
  }

  function isVeryWeakPreflopCombo(combo) {
    if (!combo || isPocketPairCombo(combo)) return false;
    if (combo[0] === "A") return false;
    const high = Math.max(RANK_VALUES[combo[0]] || 0, RANK_VALUES[combo[1]] || 0);
    const low = comboLowValue(combo);
    return high <= RANK_VALUES.J && low <= RANK_VALUES["7"];
  }

  function isMarginalBotDecision(table, heroAction, heroAmount, difficulty) {
    const villain = table.seats?.[table.activeVillain];
    const combo = villain?.cards ? normalizeCombo(villain.cards) : "";

    if (table.street === "preflop") {
      if (heroAction === "call" || heroAction === "check") return false;
      if (isPremiumPreflopCombo(combo) || isVeryWeakPreflopCombo(combo)) return false;
      if (isMarginalPreflopCombo(combo)) return true;

      const chart = PREFLOP_CHARTS[difficulty] || PREFLOP_CHARTS.standard;
      const pressure = heroAction === "allin" || Number(heroAmount || 0) >= table.stackDepth * 0.65;
      const rangeKey = pressure ? "callJam" : table.stackDepth <= 30 ? "shortContinue" : "continueVsRaise";
      return chartContains(chart[rangeKey] || chart.continueVsRaise, combo);
    }

    const assessment = villain?.cards ? assessPostflopHand(villain.cards, table.board) : null;
    if (!assessment) return false;
    if (assessment.madeRank >= 4 || assessment.label === "air") return false;
    return assessment.madeRank === 2 || assessment.draw || assessment.overcards;
  }

  function chartContains(patterns, combo) {
    if (!Array.isArray(patterns)) return false;
    return patterns.some((pattern) => comboMatchesPattern(pattern, combo));
  }

  function comboMatchesPattern(pattern, combo) {
    if (pattern === combo) return true;
    if (!pattern.endsWith("+")) return false;

    const base = pattern.slice(0, -1);
    if (base.length === 2 && base[0] === base[1]) {
      return combo.length === 2 && combo[0] === combo[1] && RANK_VALUES[combo[0]] >= RANK_VALUES[base[0]];
    }

    if (base.length !== 3 || combo.length !== 3) return false;
    const [highRank, lowRank, suitedness] = base;
    return combo[0] === highRank
      && combo[2] === suitedness
      && RANK_VALUES[combo[1]] >= RANK_VALUES[lowRank];
  }

  function botPostflopIntent(table, cards, settings, leadOnStreet = false, seat = null) {
    const assessment = assessPostflopHand(cards, table.board);
    const profile = postflopProfile(settings, seat);
    const texture = assessBoardTexture(table.board);
    const cBetSpot = isOpponentCBetSpot(table);
    const labSpot = cBetSpot ? "cbet" : "";
    const difficulty = difficultyForSeat(settings, seat);
    let frequency = profile.airBet;
    let sizePool = [0.33];
    let reason = assessment.label;

    if (assessment.madeRank >= 5) {
      frequency = 1;
      sizePool = [0.75, 1];
    } else if (assessment.madeRank === 4) {
      frequency = 0.92;
      sizePool = [0.5, 0.75, 1];
    } else if (assessment.madeRank === 3) {
      frequency = profile.topPairBet;
      sizePool = [0.33, 0.5, 0.75];
    } else if (assessment.madeRank === 2) {
      frequency = profile.weakPairBet;
      sizePool = [0.33, 0.5];
    } else if (assessment.comboDraw) {
      frequency = profile.comboDrawBet;
      sizePool = [0.5, 0.75, 1];
      reason = "combo draw";
    } else if (assessment.draw) {
      frequency = profile.drawBet;
      sizePool = [0.33, 0.5, 0.75];
      reason = assessment.drawLabel;
    } else if (assessment.overcards) {
      frequency = profile.overcardBet;
      sizePool = [0.33, 0.5];
      reason = "overcards";
    }

    const texturePlan = applyBoardTexturePlan({
      assessment,
      texture,
      frequency,
      sizePool,
      reason,
      cBetSpot,
      leadOnStreet,
      table,
      difficulty
    });
    frequency = texturePlan.frequency;
    sizePool = texturePlan.sizePool;
    reason = texturePlan.reason;

    const bvbLimpPlan = applyBlindVsBlindLimpPotPlan({
      table,
      assessment,
      frequency,
      sizePool,
      reason,
      leadOnStreet,
      seat
    });
    if (bvbLimpPlan) {
      frequency = bvbLimpPlan.frequency;
      sizePool = bvbLimpPlan.sizePool;
      reason = bvbLimpPlan.reason;
    }

    if (isOpponentDonkSpot(table, leadOnStreet)) {
      return donkBetIntent(table, assessment, sizePool, reason, seat);
    }

    const startedMultiway = postflopStreetStartedMultiway(table);
    if (startedMultiway && assessment.madeRank < 2 && !assessment.draw && !assessment.comboDraw) {
      return { bet: false, amount: 0, label: `${assessment.label} multiway discipline check`, labSpot };
    }

    if (!leadOnStreet && assessment.madeRank < 3 && !assessment.draw) {
      frequency *= 0.72;
    }

    // BvB limp pots are a small-ball tree with their own plan (applyBlindVsBlindLimpPotPlan): natural
    // draws barrel, one pair gives up, ~1 BB sizing. Don't let the generic turn/river barrel intent
    // override it (it would re-barrel one pair at 0.62 and upsize to half-pot).
    const turnRiverBarrel = isBlindVsBlindLimpPot(table) ? null : turnRiverBarrelIntent(table, assessment, leadOnStreet, difficulty, styleForSeat(seat), profile);
    if (turnRiverBarrel) {
      return turnRiverBarrel;
    }

    if (randomUnit() > frequency) {
      return { bet: false, amount: 0, label: `${assessment.label} check`, labSpot };
    }

    // C8: on turn/river, pure-air/overcard bluffs use the same size as the value barrel (0.75) so the
    // bluff is not face-up; thin made-hand value (handled in turnRiverBarrelIntent) stays small. Flop
    // keeps its 0.33-biased small c-bet.
    if ((table.street === "turn" || table.street === "river") && assessment.madeRank === 0 && !assessment.draw && !assessment.comboDraw) {
      sizePool = [0.75];
    }
    const sizing = choosePostflopSizing(table, sizePool, profile, {
      assessment,
      texture,
      polar: table.street === "river" && assessment.madeRank === 0 && !assessment.draw && !assessment.comboDraw,
      noAutoShove: !(table.street === "river" && assessment.madeRank === 0 && !assessment.draw && !assessment.comboDraw)
    });
    // C9: a river pure-air bluff is the polar bluff half (may shove when a push fits); everything else
    // is non-polar and capped so a 0.75-pot bet at SPR<1 does not silently become an all-in.
    const polarAir = table.street === "river" && assessment.madeRank === 0 && !assessment.draw && !assessment.comboDraw;
    const amount = sizing.amount;
    const shoved = polarAir && amount >= remainingStack(table, table.activeVillain) - EPSILON_BB;
    return { bet: true, amount, label: `${reason} ${sizing.label}${shoved ? " river polar shove" : ""}`, labSpot };
  }

  function applyBoardTexturePlan(plan) {
    const { assessment, texture, cBetSpot, leadOnStreet, difficulty } = plan;
    let { frequency, sizePool, reason } = plan;
    const dryOrRangeBoard = texture.dry || texture.aceHigh || texture.paired;
    const wetBoard = texture.wet || texture.monotone;
    const startedMultiway = postflopStreetStartedMultiway(plan.table);
    const rangeEdge = rangeAdvantageForBot(plan.table, texture);

    if (cBetSpot) {
      if (assessment.madeRank >= 4) {
        frequency = Math.max(frequency, wetBoard ? 0.96 : 0.88);
        sizePool = wetBoard ? [0.5, 0.75, 1] : [0.33, 0.5, 0.75];
      } else if (assessment.madeRank === 3) {
        frequency = Math.max(frequency, wetBoard ? 0.9 : 0.78);
        sizePool = wetBoard ? [0.5, 0.75] : [0.33, 0.5];
      } else if (assessment.comboDraw) {
        frequency = Math.max(frequency, wetBoard ? 0.86 : 0.74);
        sizePool = [0.5, 0.75];
      } else if (assessment.draw) {
        frequency = Math.max(frequency, wetBoard ? 0.66 : 0.5);
        sizePool = wetBoard ? [0.5, 0.75] : [0.33, 0.5];
      } else if (assessment.madeRank === 2) {
        frequency = wetBoard ? frequency * 0.62 : Math.max(frequency, 0.34);
        sizePool = [0.33];
      } else if (assessment.overcards) {
        frequency = dryOrRangeBoard ? Math.max(frequency, cBetAirFrequency(difficulty, texture)) : frequency * 0.72;
        sizePool = [0.33];
      } else {
        frequency = dryOrRangeBoard ? Math.max(frequency, cBetAirFrequency(difficulty, texture)) : frequency * 0.48;
        // Missed air gives up most rivers (canon: once the river is dealt, missed draws/overcards are
        // air and should mostly check) — cBetAirFrequency is a flop-stab rate, so taper it on the river.
        if (plan.table?.street === "river") frequency *= 0.4;
        sizePool = [0.33];
      }
      // Multiway: reduced marginal aggression with more players live (mirrors the multiway call/raise gates).
      // No bluff c-bet into 3+ (air / overcards), and trim weak-pair thin value. Strong made hands and
      // draws keep their frequency.
      if (startedMultiway) {
        if (assessment.madeRank === 0 && !assessment.draw && !assessment.comboDraw && !assessment.overcards) {
          frequency = 0;
        } else if (assessment.overcards) {
          frequency = Math.min(frequency * 0.18, 0.08);
        } else if (assessment.madeRank === 2) {
          frequency *= 0.45;
        }
      }
      const canUseRangeEdge = !startedMultiway || assessment.madeRank >= 3 || assessment.draw || assessment.comboDraw;
      frequency = clamp(frequency + (canUseRangeEdge ? rangeEdge * 0.12 : 0), 0, 1);
      if (rangeEdge > 0.35 && assessment.madeRank >= 3 && !wetBoard) {
        sizePool = [0.33, 0.5];
      }
      reason = `c-bet ${reason} · ${texture.label}`;
    } else if (!leadOnStreet) {
      if (assessment.madeRank === 0 && !assessment.draw && !assessment.overcards) {
        frequency *= wetBoard ? 0.42 : 0.68;
      } else if (assessment.draw && wetBoard) {
        frequency = Math.max(frequency, 0.42);
        sizePool = [0.33, 0.5];
      }
      reason = `${reason} · ${texture.label}`;
    } else {
      if (wetBoard && assessment.madeRank >= 3) {
        sizePool = [0.5, 0.75];
      }
      reason = `${reason} · ${texture.label}`;
    }

    return {
      frequency: clamp(frequency, 0, 1),
      sizePool,
      reason
    };
  }

  function applyBlindVsBlindLimpPotPlan(plan) {
    const { table, assessment, leadOnStreet, seat } = plan;
    if (!isBlindVsBlindLimpPot(table)) return null;

    let { frequency, sizePool, reason } = plan;
    if (table.street === "flop") {
      const hasUsefulEquity = assessment.madeRank >= 2 || assessment.draw || assessment.overcards;
      sizePool = [0.33];
      reason = `BvB limp ${reason}`;

      if (leadOnStreet && seat?.position === "SB") {
        frequency = hasUsefulEquity ? Math.max(frequency, 0.48) : Math.min(frequency, 0.12);
      } else {
        frequency = hasUsefulEquity ? Math.max(frequency, 0.72) : Math.max(frequency, 0.34);
      }

      return { frequency: clamp(frequency, 0, 1), sizePool, reason };
    }

    if (table.street === "turn") {
      const naturalBarrel = assessment.madeRank >= 3 || assessment.draw || assessment.comboDraw;
      sizePool = [0.33];
      frequency = naturalBarrel ? Math.max(frequency, 0.66) : Math.min(frequency, 0.18);
      return {
        frequency: clamp(frequency, 0, 1),
        sizePool,
        reason: `BvB limp ${naturalBarrel ? "natural barrel" : "give up"} ${reason}`
      };
    }

    return null;
  }

  function cBetAirFrequency(difficulty, texture) {
    const base = difficulty === "pro" ? 0.42 : difficulty === "easy" ? 0.26 : 0.34;
    let frequency = base;
    if (texture.aceHigh) frequency += 0.1;
    if (texture.paired) frequency += 0.06;
    if (texture.monotone) frequency -= 0.1;
    if (texture.wet) frequency -= 0.12;
    return clamp(frequency, 0.08, 0.58);
  }

  function rangeAdvantageForBot(table, texture) {
    if (!table || table.activeVillain == null) return 0;
    const villain = seatById(table, table.activeVillain);
    const villainGroup = rangePositionGroup(villain?.position);
    const heroGroup = rangePositionGroup(table.heroPosition);
    let edge = 0;

    if (botHasStreetInitiative(table)) edge += 0.22;
    if (villainGroup === "late" && heroGroup === "blind" && (texture.aceHigh || texture.dry || texture.paired)) edge += 0.18;
    if (villainGroup === "early" && (texture.broadwayHeavy || texture.aceHigh)) edge += 0.16;
    if (heroGroup === "blind" && (texture.connected || texture.wet) && !texture.aceHigh) edge -= 0.16;
    if (texture.monotone) edge -= 0.08;
    // Multiway: range advantage is structurally diluted (3+ overlapping ranges) and the aggressor's
    // initiative credit is weaker once the field folded its trash. Discount the whole edge so the
    // late-vs-blind / early-broadway / initiative bonuses don't fire at heads-up strength.
    if (postflopStreetStartedMultiway(table)) edge *= 0.6;
    return clamp(edge, -0.32, 0.42);
  }

  function rangePositionGroup(position) {
    if (position === "SB" || position === "BB") return "blind";
    if (position === "UTG" || position === "UTG+1" || position === "MP") return "early";
    return "late";
  }

  // The acting bot has "fresh" initiative this street: it holds initiativeSeatId AND the prior street
  // did not check through. initiativeSeatId persists across streets (it carries preflop initiative to
  // the flop), so a turn/river after a checked-through street must NOT count as initiative — that is a
  // probe/delayed spot, and treating it as a c-bet took the elevated frequency / +range-edge wrongly.
  function botHasStreetInitiative(table) {
    if (!table || table.initiativeSeatId == null) return false;
    if (table.street !== "flop" && table.previousStreetCheckedThrough) return false;
    return Number(table.initiativeSeatId) === Number(table.activeVillain);
  }

  function isOpponentCBetSpot(table) {
    if (!table || table.street === "preflop") return false;
    return botHasStreetInitiative(table);
  }

  function isBlindVsBlindLimpPot(table) {
    if (!table || table.street === "preflop" || table.street === "showdown") return false;
    if (table.heroPosition !== "BB") return false;
    const opponent = liveContestingOpponents(table).find((seat) => seat.position === "SB") || seatByPosition(table, "SB");
    if (!opponent || opponent.folded) return false;
    if (table.preflopAggressorSeatId != null || table.initiativeSeatId != null) return false;

    const branchText = (table.spot?.branch || []).join(" ").toLowerCase();
    const spotText = `${table.spot?.key || ""} ${table.spot?.title || ""} ${table.spot?.prompt || ""}`.toLowerCase();
    return branchText.includes("sb complete") || spotText.includes("bvb limp") || spotText.includes("bb check");
  }

  function isOpponentDonkSpot(table, leadOnStreet) {
    if (!leadOnStreet || !table || table.street === "preflop") return false;
    if (table.initiativeSeatId == null) return false;
    const initiativeSeatId = Number(table.initiativeSeatId);
    if (!Number.isFinite(initiativeSeatId)) return false;
    if (initiativeSeatId !== 0 || Number(table.activeVillain) === initiativeSeatId) return false;
    if (table.street === "flop") return true;
    if (table.previousStreetCheckedThrough) return false;
    if (table.previousStreetAggressorSeatId == null) return false;
    return Number(table.previousStreetAggressorSeatId) === 0;
  }

  function isOpponentProbeSpot(table, leadOnStreet) {
    if (!leadOnStreet || !table || !["turn", "river"].includes(table.street)) return false;
    if (Number(table.activeVillain) === 0) return false;
    return table.previousStreetCheckedThrough === true;
  }

  function postflopLabSpot(table, reason, leadOnStreet) {
    const normalized = String(reason || "").toLowerCase();
    if (isOpponentDonkSpot(table, leadOnStreet) || normalized.includes("donk")) return "donk";
    if (isOpponentProbeSpot(table, leadOnStreet) || normalized.includes("probe")) return "probe";
    if (["turn", "river"].includes(table?.street)) return "barrel";
    if (normalized.includes("c-bet")) return "cbet";
    if (leadOnStreet && Number(table?.initiativeSeatId) === Number(table?.activeVillain)) return "cbet";
    return "bet";
  }

  function donkBetIntent(table, assessment, sizePool, reason, seat = null) {
    const style = styleForSeat(seat);
    const profile = postflopProfile({ difficulty: difficultyForSeat({}, seat) }, seat);
    const frequency = clamp(
      DONK_BET_FREQUENCY
        * Number(botPostflopTrait(style, "donk") || 1)
        * (1 + clamp(Number(profile.donkFrequency || 0), -0.35, 0.35)),
      0.01,
      0.24
    );
    if (!randomChance(frequency)) {
      return { bet: false, amount: 0, label: `${assessment.label} check · no donk` };
    }

    const cappedSizePool = (sizePool || [0.33]).filter((fraction) => fraction <= 0.5);
    const fraction = randomItem(cappedSizePool.length ? cappedSizePool : [0.33]);
    return {
      bet: true,
      // { noAutoShove: true } — a capped donk lead must NOT silently round up to a full
      // all-in at low SPR (postflopBetAmount jams any size > 75% stack). Every other
      // non-polar bet path threads this; the donk path omitted it, so the bot open-jammed
      // air while the label still read "donk 33%". BUGHUNT F045.
      amount: postflopBetAmount(table, fraction, { noAutoShove: true }),
      label: `donk ${reason} ${Math.round(fraction * 100)}%`
    };
  }

  function riverBustedDrawInfo(table, assessment) {
    if (!table || table.street !== "river" || !Array.isArray(table.board) || table.board.length < 5) return null;
    const seat = seatById(table, table.activeVillain);
    if (!seat || !Array.isArray(seat.cards) || seat.cards.length < 2) return null;
    const turnAssessment = assessPostflopHand(seat.cards.slice(0, 2), table.board.slice(0, 4));
    const missedFlush = turnAssessment.flushDraw && Number(assessment.category || 0) < 5;
    const missedStraight = turnAssessment.straightDraw && Number(assessment.category || 0) < 4;
    if (!missedFlush && !missedStraight) return null;
    if (Number(assessment.madeRank || 0) >= 2) return null;
    return {
      label: missedFlush && missedStraight ? "busted combo draw" : missedFlush ? "busted flush draw" : "busted straight draw"
    };
  }

  function postflopProfileBaseline(difficulty, key) {
    const tier = normalizeDifficulty(difficulty);
    const baselines = {
      easy: { topPairBet: 0.76, weakPairBet: 0.36, comboDrawBet: 0.74, drawBet: 0.5, airBet: 0.2 },
      standard: { topPairBet: 0.78, weakPairBet: 0.28, comboDrawBet: 0.72, drawBet: 0.46, airBet: 0.09 },
      pro: { topPairBet: 0.9, weakPairBet: 0.38, comboDrawBet: 0.84, drawBet: 0.62, airBet: 0.08 }
    };
    const value = Number((baselines[tier] || baselines.standard)[key]);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  function profileScaledFrequency(baseFrequency, profile, difficulty, key, options = {}) {
    const base = clamp(Number(baseFrequency || 0), 0, 1);
    const value = Number(profile?.[key]);
    if (!Number.isFinite(value)) return base;
    const baseline = postflopProfileBaseline(difficulty, key);
    const scaled = base * (clamp(value, 0, 1) / baseline);
    const min = Number.isFinite(Number(options.min)) ? Number(options.min) : 0;
    const max = Number.isFinite(Number(options.max)) ? Number(options.max) : 1;
    return clamp(scaled, min, max);
  }

  function drawBarrelProfileKey(assessment) {
    return assessment?.comboDraw ? "comboDrawBet" : "drawBet";
  }

  function turnRiverBarrelIntent(table, assessment, leadOnStreet, difficulty = "standard", style = "reg", profile = null) {
    if (!["turn", "river"].includes(table.street)) return null;

    const priorTurnRiverBets = Number(table.villainTurnRiverBets || 0);
    const probeSpot = isOpponentProbeSpot(table, leadOnStreet);
    // Underbluff multiplier for the thin-barrel / semi-bluff lines only (value barrels below keep their
    // frequency). nit = scared, almost no thin barrels or draw bluffs; easy = chaotic amateur who
    // under-applies correct barreling pressure. Gated so pro/reg/aggro/etc. are untouched.
    const barrelBluffScale = (style === "nit" ? 0.55 : 1) * (difficulty === "easy" ? 0.82 : 1);
    const texture = assessBoardTexture(table.board);
    const multiway = postflopStreetStartedMultiway(table);
    const isStrong = assessment.madeRank >= 3;
    const isMediumShowdown = assessment.madeRank === 2;
    const hasLiveDraw = table.street === "turn" && Boolean(assessment.draw || assessment.comboDraw);
    const bustedRiverDraw = !multiway ? riverBustedDrawInfo(table, assessment) : null;
    const shouldUseThird = !leadOnStreet;

    if (isStrong) {
      // Value sizing by strength x texture x street x players. Multiway: size up two-pair+ (protection +
      // dead money) and mostly check bare top pair (out-kicked by several ranges). HU pro: greedy value
      // (two pair+ larger, river overbet on dry/paired polar run-outs); TPGK stays medium.
      let fraction;
      if (multiway && assessment.madeRank >= 4) {
        fraction = randomItem([0.66, 0.75, 1]);
      } else if (difficulty === "pro" && assessment.madeRank >= 4) {
        const dryPolarRiver = table.street === "river" && (texture.dry || texture.paired);
        fraction = dryPolarRiver ? randomItem([1, 1.25]) : (table.street === "river" ? 1 : 0.75);
      } else if (assessment.madeRank >= 4) {
        // C8: a strong made hand barrels turn/river at 0.75 (value ∝ strength).
        fraction = 0.75;
      } else {
        // Bare top pair (madeRank 3) is thin value → proportionally smaller than the strong barrel.
        fraction = shouldUseThird ? 0.33 : 0.5;
      }
      // Bare top pair (madeRank 3) is thin value out-kicked/out-paired by multiple ranges: mostly
      // check/check-back in multiway (turn 40% / river 22%). Two pair+ still barrels every street.
      if (multiway && assessment.madeRank === 3 && !probeSpot) {
        const multiwayTopPairBarrel = profileScaledFrequency(table.street === "river" ? 0.22 : 0.4, profile, difficulty, "topPairBet", { max: 0.78 });
        if (!randomChance(multiwayTopPairBarrel)) {
          return { bet: false, amount: 0, label: `${assessment.label} ${table.street} multiway check-back ${texture.label}` };
        }
      } else if (table.street === "river" && assessment.madeRank === 3 && !probeSpot) {
        const scaryRiver = texture.monotone || texture.paired || texture.wet;
        const riverValueFrequency = profileScaledFrequency(scaryRiver ? 0.5 : 0.72, profile, difficulty, "topPairBet", { max: 0.92 });
        if (!randomChance(riverValueFrequency)) {
          return { bet: false, amount: 0, label: `${assessment.label} river check-back ${texture.label}` };
        }
      }
      // C9: river nuts (madeRank>=5) are the polar value half — they may shove when a push fits. Turn
      // value and thin top pair are non-polar and capped so they do not silently jam at low SPR.
      const polarValue = table.street === "river" && Number(assessment.category || 0) >= 4;
      const sizing = choosePostflopSizing(table, [fraction], profile, {
        assessment,
        texture,
        polar: polarValue,
        noAutoShove: !polarValue,
        preferValue: assessment.madeRank >= 4
      });
      const valueAmount = sizing.amount;
      const valueShove = polarValue && valueAmount >= remainingStack(table, table.activeVillain) - EPSILON_BB;
      return {
        bet: true,
        amount: valueAmount,
        label: `${assessment.label} ${valueShove ? "river polar shove" : (probeSpot ? "probe" : "forced")} ${sizing.label}`
      };
    }

    if (isMediumShowdown && priorTurnRiverBets === 0 && (table.street === "turn" || table.street === "river")) {
      // In-flow medium showdown mixes bet/check; no thin barrels into 3+ players. AUTHORITATIVE: a
      // declined roll returns an explicit check instead of falling through to the generic bet gate,
      // which would otherwise re-roll and inflate the true frequency well above the labeled mix.
      const onTurn = table.street === "turn";
      const mixFrequency = profileScaledFrequency(
        (multiway ? 0 : onTurn ? (probeSpot ? 0.44 : 0.62) : (probeSpot ? 0.52 : 0.45)) * barrelBluffScale,
        profile,
        difficulty,
        "weakPairBet",
        { max: 0.82 }
      );
      if (randomChance(mixFrequency)) {
        const sizing = choosePostflopSizing(table, [0.33], profile, { assessment, texture, noAutoShove: true });
        return {
          bet: true,
          amount: sizing.amount,
          label: `${assessment.label} ${probeSpot ? (onTurn ? "probe" : "delayed probe") : (onTurn ? "thin barrel" : "thin value")} ${sizing.label}`
        };
      }
      return { bet: false, amount: 0, label: `${assessment.label} ${table.street} check (mix)` };
    }

    const drawProbeFrequency = profileScaledFrequency(
      (probeSpot ? 0.52 : 0.74) * (multiway ? 0.5 : 1) * barrelBluffScale,
      profile,
      difficulty,
      drawBarrelProfileKey(assessment),
      { max: 0.92 }
    );
    if (hasLiveDraw && priorTurnRiverBets === 0 && randomChance(drawProbeFrequency)) {
      const sizing = choosePostflopSizing(table, [0.33], profile, { assessment, texture, noAutoShove: true });
      return {
        bet: true,
        amount: sizing.amount,
        label: `${assessment.drawLabel || assessment.label} ${probeSpot ? "turn probe" : "semi-bluff"} ${sizing.label}`
      };
    }

    if (bustedRiverDraw && priorTurnRiverBets <= 1) {
      const bluffFrequency = profileScaledFrequency(
        (probeSpot ? 0.3 : 0.35) * barrelBluffScale,
        profile,
        difficulty,
        "airBet",
        { min: 0.02, max: 0.55 }
      );
      if (randomChance(bluffFrequency)) {
        const sizing = choosePostflopSizing(table, [0.75], profile, { assessment, texture, noAutoShove: true, preferBluff: true });
        return {
          bet: true,
          amount: sizing.amount,
          label: `${bustedRiverDraw.label} river bluff ${sizing.label}`
        };
      }
      return { bet: false, amount: 0, label: `${bustedRiverDraw.label} river give-up` };
    }

    if (multiway && !isStrong && !hasLiveDraw) {
      return { bet: false, amount: 0, label: `${assessment.label} ${table.street} multiway check` };
    }

    return null;
  }

  // 1.0 = nut flush draw (holds the A of the 4-card suit) down to ~0.2 for a low, easily-dominated
  // draw. Used for reverse implied odds: a completed non-nut flush can still lose to a higher one.
  function flushDrawNutFactor(holeCards, board) {
    const all = [...holeCards, ...board].map(parseCardCode);
    const suitCounts = {};
    for (const card of all) suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    const drawSuit = Object.keys(suitCounts).find((suit) => suitCounts[suit] === 4);
    if (!drawSuit) return 1;
    const myHigh = Math.max(0, ...holeCards.map(parseCardCode).filter((card) => card.suit === drawSuit).map((card) => card.value));
    if (myHigh >= 14) return 1;
    if (myHigh >= 12) return 0.6;
    if (myHigh >= 10) return 0.4;
    return 0.2;
  }

  // Implied-odds adjustment to the DIRECT pot-odds threshold for drawing hands: the bot continues
  // draws on direct odds PLUS implied odds, not direct odds alone.
  //  - Forward implied (loosen): deep effective stacks behind let a completed draw get paid off
  //    later. Scaled by draw quality — only nut/strong draws actually get paid — and naturally ~0
  //    when facing an all-in, since there is no stack left behind to win.
  //  - Reverse implied (tighten): paired boards (the draw can be dead to a full house), a bare
  //    straight draw on a monotone board (drawing into a made flush), and non-nut flush draws all
  //    cost more chips when you do hit, so they should call worse direct prices, not better.
  function drawImpliedOddsAdjust(table, assessment, texture, holeCards, stackBehindAfterCall) {
    if (!assessment.draw) return 0;
    const pot = Math.max(Number(table.pot) || 0, 1);
    const sprBehind = Math.max(0, stackBehindAfterCall) / pot;
    const fdNut = assessment.flushDraw ? flushDrawNutFactor(holeCards, table.board) : 1;
    const quality = assessment.comboDraw ? 1 : assessment.flushDraw ? fdNut : 0.6;
    const forward = clamp(sprBehind * 0.05, 0, 0.18) * quality;
    let reverse = 0;
    if (texture.paired) reverse += 0.12;
    if (texture.monotone && assessment.straightDraw && !assessment.flushDraw) reverse += 0.1;
    if (assessment.flushDraw) reverse += (1 - fdNut) * 0.1;
    return clamp(forward - reverse, -0.28, 0.18);
  }

  function allInDrawDirectPriceGate(table, seatId, cards, assessment) {
    const equity = knownShowdownEquity(table, seatId, cards);
    if (!Number.isFinite(equity)) return null;
    const buffer = assessment?.comboDraw ? 0.06 : 0.04;
    const ceiling = assessment?.comboDraw ? 0.58 : 0.36;
    return {
      equity,
      maxPrice: clamp(equity + buffer, 0.04, ceiling)
    };
  }

  function knownShowdownEquity(table, seatId, cards, allowRealOpponentCards = false) {
    const board = Array.isArray(table?.board) ? table.board.slice(0, 5) : [];
    if (board.length < 3 || board.length > 5) return null;
    const targetSeatId = Number(seatId);
    const participants = knownShowdownParticipants(table, targetSeatId, cards, allowRealOpponentCards);
    if (participants.length < 2 || !participants.some((seat) => Number(seat.seatId) === targetSeatId)) return null;

    const missing = Math.max(0, 5 - board.length);
    if (missing > 2) return null;
    const known = new Set([
      ...board,
      ...participants.flatMap((seat) => seat.cards)
    ]);
    const deck = [];
    RANKS_HIGH.forEach((rank) => {
      SUITS.forEach((suit) => {
        const code = `${rank}${suit}`;
        if (!known.has(code)) deck.push(code);
      });
    });
    const runouts = missing > 0 ? combinations(deck, missing) : [[]];
    if (!runouts.length) return null;

    let equity = 0;
    runouts.forEach((runout) => {
      const fullBoard = [...board, ...runout];
      const results = participants.map((seat) => ({
        seatId: Number(seat.seatId),
        score: evaluateBest([...seat.cards, ...fullBoard]).score
      }));
      const best = results.reduce(
        (winner, result) => (compareScores(result.score, winner.score) > 0 ? result : winner),
        results[0]
      );
      const winners = results.filter((result) => compareScores(result.score, best.score) === 0);
      if (winners.some((winner) => Number(winner.seatId) === targetSeatId)) {
        equity += 1 / Math.max(winners.length, 1);
      }
    });

    return equity / runouts.length;
  }

  function knownShowdownParticipants(table, targetSeatId, targetCards, allowRealOpponentCards = false) {
    const seats = Array.isArray(table?.seats) ? table.seats : [];
    return seats
      .filter((seat) => seat && !seat.folded)
      .map((seat) => {
        const seatId = Number(seat.id);
        // Only the deciding (target) seat may use real cards. A LIVE bot decision
        // must NEVER peek at opponents' hidden cards — especially the human hero's
        // table.heroHand, which made the bot play all-in draws with god-mode exact
        // equity (BUGHUNT F032). allowRealOpponentCards is reserved for genuine
        // showdown contexts (all hands revealed); when false the equity gate sees
        // <2 participants and returns null, so the bot falls back to honest pot-odds
        // draw pricing instead of cheating.
        const cards = seatId === Number(targetSeatId)
          ? targetCards
          : allowRealOpponentCards
            ? (seatId === 0 && Array.isArray(table?.heroHand) && table.heroHand.length >= 2 ? table.heroHand : seat.cards)
            : [];
        return {
          seatId,
          cards: Array.isArray(cards) ? cards.slice(0, 2) : []
        };
      })
      .filter((seat) => Number.isFinite(seat.seatId) && seat.cards.length >= 2);
  }

  function strongMadeMaxPrice(assessment, texture, profile, price, facingAllIn, responsePressure = {}) {
    const category = Number(assessment?.category || 0);
    const madeRank = Number(assessment?.madeRank || 0);
    if (madeRank < 4) return 0;

    let maxPrice = category >= 6
      ? 2.35
      : category === 5
        ? 1.45
        : category === 4
          ? 1.3
          : category === 3
            ? 1.16
            : Math.max(1.05, Number(profile?.topPairMaxPrice || 0.82) + 0.22);

    if (texture?.paired && category < 6) maxPrice -= 0.18;
    if (texture?.monotone && category < 5) maxPrice -= 0.22;
    if (texture?.connected && category < 4) maxPrice -= 0.16;
    if (texture?.wet && category < 5) maxPrice -= 0.08;
    if (texture?.broadwayHeavy && category < 4) maxPrice -= 0.06;
    if (facingAllIn) maxPrice -= category >= 5 ? 0.08 : 0.14;
    if (price >= 1.2) maxPrice -= category >= 5 ? 0.08 : 0.16;
    maxPrice -= Math.max(0, Number(responsePressure?.topPair || 0)) * 0.45;

    const floor = category >= 5 ? 0.62 : category === 4 ? 0.46 : 0.34;
    const ceiling = category >= 6 ? 2.5 : category >= 5 ? 1.65 : 1.18;
    return clamp(maxPrice, floor, ceiling);
  }

  // Single source of truth for the made-hand defend thresholds (top-pair and
  // weak-pair maximum call price). Consumed by BOTH the live bot policy
  // (botCallVsBet) and the hero grader (gradePostflopHeroDecision) so the two
  // can no longer drift by hand: a fold the bot itself would make can never be
  // graded a Leak, because both read the identical numbers. `responsePressure`
  // is the multiway call-pressure tightening — it only applies to the live bot
  // decision; the grader passes none (its historical behavior), so the default
  // is a no-op. Property-tested by simulator-grader-mirror-smoke.mjs.
  function postflopContinueThresholds(profile, texture, pressureCall, responsePressure = null, assessment = null, facingAllIn = false) {
    const topPairPressure = Number(responsePressure?.topPair || 0);
    const weakPairPressure = Number(responsePressure?.weakPair || 0);
    let topPairMaxPrice = clamp(
      profile.topPairMaxPrice
        + (texture.dry ? 0.04 : 0)
        - (texture.wet ? 0.08 : 0)
        - (texture.monotone ? 0.08 : 0)
        - (pressureCall ? 0.18 : 0)
        - topPairPressure,
      0.2,
      1
    );
    let weakPairMaxPrice = clamp(
      profile.weakPairMaxPrice
        + (texture.dry ? 0.04 : 0)
        - (texture.wet ? 0.1 : 0)
        - (texture.monotone ? 0.1 : 0)
        - (pressureCall ? 0.2 : 0)
        - weakPairPressure,
      0.12,
      0.9
    );
    if (assessment?.pairedBoardTwoPair) {
      // A paired-board "two pair" is blocker/kicker-sensitive, not true
      // natural two-pair strength. Cap its defend price before size-read
      // tightens it further, so A on A77 and QQ on KK7 do not inherit
      // ordinary top-pair or natural two-pair thresholds.
      const allInPenalty = facingAllIn ? 0.08 : 0;
      const topCeiling = assessment.overpair ? 0.64 : assessment.topPair ? 0.58 : 0.42;
      const weakCeiling = assessment.secondPair ? 0.38 : 0.34;
      topPairMaxPrice = clamp(Math.min(topPairMaxPrice, topCeiling - allInPenalty), 0.08, 0.98);
      weakPairMaxPrice = clamp(Math.min(weakPairMaxPrice, weakCeiling - allInPenalty), 0.05, 0.9);
    }
    return { topPairMaxPrice, weakPairMaxPrice };
  }

  function botCallVsBet(table, cards, amount, settings, seat = null) {
    const assessment = assessPostflopHand(cards, table.board);
    const profile = postflopProfile(settings, seat);
    const texture = assessBoardTexture(table.board);
    const villainSeatId = Number(seat?.id ?? table.activeVillain);
    const targetTotal = Math.min(Number(amount || 0), maxContributionForSeat(table, villainSeatId));
    const callAmount = Math.max(0, targetTotal - contributionOf(table, villainSeatId));
    if (!(callAmount > 0)) return { call: true, label: `${assessment.label} no chips to call` };

    // `table.pot` already contains the aggressor's bet. Pot odds for the caller
    // are therefore call / (pot + call), not call / pot; the latter overstated
    // minbet/minraise prices and could make cheap continues look like folds.
    const price = callAmount / Math.max(Number(table.pot || 0) + callAmount, 1);
    const priceLabel = `price ${Math.round(price * 100)}%`;
    const stackBeforeCall = remainingStack(table, villainSeatId);
    const stackBehindAfterCall = Math.max(0, stackBeforeCall - callAmount);
    const rawAggressorSeatId = table?.streetAggressorSeatId;
    const aggressorSeatId = Number(rawAggressorSeatId);
    const aggressorAllIn = rawAggressorSeatId != null
      && rawAggressorSeatId !== ""
      && Number.isFinite(aggressorSeatId)
      && aggressorSeatId !== villainSeatId
      && contributionOf(table, aggressorSeatId) + EPSILON_BB >= targetTotal
      && remainingStack(table, aggressorSeatId) <= EPSILON_BB;
    const callerAllIn = stackBeforeCall > 0 && callAmount >= stackBeforeCall * 0.98;
    const facingAllIn = callerAllIn || aggressorAllIn;
    const drawImplied = drawImpliedOddsAdjust(table, assessment, texture, cards, facingAllIn ? 0 : stackBehindAfterCall);
    const turnCommitSpot = turnCrumbCallCommitSpot(table, villainSeatId, targetTotal, callAmount, stackBeforeCall);
    const finish = (decision) => {
      const commitDecision = finalizeTurnCrumbCallDecision(decision, assessment, texture, priceLabel, turnCommitSpot);
      return finalizePostflopRaiseDecision(commitDecision, {
        table,
        seatId: villainSeatId,
        targetTotal,
        callAmount,
        stackBeforeCall,
        assessment,
        texture,
        price,
        priceLabel,
        settings,
        seat,
        cards
      });
    };
    const pressureCall = facingAllIn || price >= 0.45;
    const responsePressure = postflopCallPressureAdjustments(table, assessment, seat);
    const decisionPriceLabel = responsePressure.label ? `${priceLabel} ${responsePressure.label}` : priceLabel;
    const allInLabel = facingAllIn ? "vs all-in " : "";
    const { topPairMaxPrice: rawTopPairMaxPrice, weakPairMaxPrice: rawWeakPairMaxPrice } = postflopContinueThresholds(profile, texture, pressureCall, responsePressure, assessment, facingAllIn);
    // Size-read range inference (opt-in via production `sizeReadDefense` in [0,1]). The field's bet
    // SIZE leaks its range strength: botPostflopIntent sizes value big ([0.75,1]) and bluffs small
    // ([0.33,0.5]). Pure pot-odds thresholds ignore this and call top pair vs a pot+ bet that is
    // ~all value. Tighten the made-hand continue thresholds vs BIG bets (don't pay off value), loosen
    // vs SMALL bets (the weak small-betting range is worth attacking). price ~0.33 = a pot-sized bet.
    const sizeRead = clamp(Number(profile.sizeReadDefense || 0), 0, 1);
    const sizeReadShift = sizeRead > 0 ? sizeRead * clamp((price - 0.25) * 8, -0.4, 0.85) : 0;
    const topPairMaxPrice = clamp(rawTopPairMaxPrice - sizeReadShift, 0.08, 0.98);
    const weakPairMaxPrice = clamp(rawWeakPairMaxPrice - sizeReadShift, 0.05, 0.95);
    const drawMaxPrice = clamp(
      profile.drawMaxPrice
        + (assessment.comboDraw ? 0.12 : 0)
        + (texture.wet ? 0.04 : 0)
        + drawImplied
        - (pressureCall ? 0.24 : 0)
        - responsePressure.draw,
      0.18,
      pressureCall ? (assessment.comboDraw ? 0.52 : 0.34) : 0.95
    );
    const comboDrawMaxPrice = clamp(
      (pressureCall ? Math.min(profile.comboDrawMaxPrice, 0.52) : profile.comboDrawMaxPrice) + drawImplied - responsePressure.comboDraw,
      0.18,
      1
    );
    const allInDrawGate = facingAllIn && assessment.madeRank < 2 && assessment.draw
      ? allInDrawDirectPriceGate(table, villainSeatId, cards, assessment)
      : null;
    const drawDecisionPriceLabel = allInDrawGate
      ? `${decisionPriceLabel} equity ${Math.round(allInDrawGate.equity * 100)}%`
      : decisionPriceLabel;
    const cappedDrawMaxPrice = allInDrawGate ? Math.min(drawMaxPrice, allInDrawGate.maxPrice) : drawMaxPrice;
    const cappedComboDrawMaxPrice = allInDrawGate ? Math.min(comboDrawMaxPrice, allInDrawGate.maxPrice) : comboDrawMaxPrice;
    const overcardMaxPrice = clamp(profile.overcardMaxPrice - responsePressure.overcard, 0.08, 1);
    const floatChance = clamp(profile.floatChance - responsePressure.floatChance, 0, 1);
    const heroCallChance = clamp(profile.heroCallChance - responsePressure.looseCallChance, 0, 1);
    const looseFloatMaxPrice = responsePressure.looseFloatMaxPrice ?? 0.35;
    const boardOnlyMeaningful = Boolean(assessment.boardOnlyMadeHand) && Number(assessment.category || 0) >= 2;

    if (assessment.madeRank >= 4) {
      if (isEffectiveNutHand(cards, table.board)) {
        return finish({ call: true, label: `${assessment.label} effective nuts continue ${allInLabel}${texture.label} ${decisionPriceLabel}` });
      }
      const strongMaxPrice = strongMadeMaxPrice(assessment, texture, profile, price, facingAllIn, responsePressure);
      if (price <= strongMaxPrice) {
        return finish({ call: true, label: `${assessment.label} strong made continue ${allInLabel}${texture.label} ${decisionPriceLabel}` });
      }
      return finish({ call: false, label: `${assessment.label} strong made fold ${allInLabel}${texture.label} ${decisionPriceLabel}` });
    }
    if (boardOnlyMeaningful && isEffectiveNutHand(cards, table.board)) {
      return finish({ call: true, label: `${assessment.label} board-locked nuts continue ${allInLabel}${texture.label} ${decisionPriceLabel}` });
    }
    if (boardOnlyMeaningful && price <= weakPairMaxPrice) {
      return finish({ call: true, label: `${assessment.label} board-only continue ${allInLabel}${texture.label} ${decisionPriceLabel}` });
    }
    if (table.street === "river" && assessment.madeRank < 2 && !boardOnlyMeaningful) return finish({ call: false, label: `${assessment.label} fold river ${texture.label} ${decisionPriceLabel}` });
    if (pressureCall && assessment.madeRank < 2 && !assessment.draw && !assessment.comboDraw) {
      return finish({ call: false, label: `${assessment.label} ${facingAllIn ? "fold vs all-in" : "fold pressure"} ${texture.label} ${decisionPriceLabel}` });
    }
    if (postflopStreetStartedMultiway(table) && assessment.madeRank < 2 && !assessment.draw && !assessment.comboDraw) {
      return finish({ call: false, label: `${assessment.label} fold multiway ${texture.label} ${decisionPriceLabel}` });
    }
    if (assessment.madeRank === 3 && price <= topPairMaxPrice) return finish({ call: true, label: `${assessment.label} ${allInLabel}${texture.label} ${decisionPriceLabel}` });
    if (assessment.madeRank === 2 && price <= weakPairMaxPrice) return finish({ call: true, label: `${assessment.label} ${allInLabel}${texture.label} ${decisionPriceLabel}` });
    if (assessment.comboDraw && price <= cappedComboDrawMaxPrice) return finish({ call: true, label: `combo draw ${allInLabel}${drawDecisionPriceLabel}` });
    if (assessment.draw && price <= cappedDrawMaxPrice) return finish({ call: true, label: `${assessment.drawLabel} ${allInLabel}${texture.label} ${drawDecisionPriceLabel}` });
    if (allInDrawGate) {
      return finish({ call: false, label: `${assessment.drawLabel || assessment.label} fold vs all-in equity ${Math.round(allInDrawGate.equity * 100)}% ${texture.label} ${decisionPriceLabel}` });
    }
    if (assessment.overcards && price <= overcardMaxPrice && randomChance(floatChance)) {
      return finish({ call: true, label: `overcards float ${allInLabel}${texture.label} ${decisionPriceLabel}` });
    }
    if (randomChance(heroCallChance) && price <= looseFloatMaxPrice) {
      return finish({ call: true, label: `loose float ${allInLabel}${decisionPriceLabel}` });
    }
    return finish({ call: false, label: `${assessment.label} fold ${allInLabel}${texture.label} ${decisionPriceLabel}` });
  }

  function postflopCallPressureAdjustments(table, assessment, seat = null) {
    const defaults = {
      topPair: 0,
      weakPair: 0,
      draw: 0,
      comboDraw: 0,
      overcard: 0,
      floatChance: 0,
      looseCallChance: 0,
      looseFloatMaxPrice: 0.35,
      label: ""
    };
    const multiway = postflopStreetStartedMultiway(table);
    if (!multiway) return defaults;

    const style = styleForSeat(seat);
    const scale = postflopPressureStyleScale(style);
    return {
      topPair: clamp(0.01 * scale, 0, 0.08),
      weakPair: clamp(0.3 * scale, 0, 0.42),
      draw: clamp((assessment?.comboDraw ? 0.06 : 0.12) * scale, 0, 0.24),
      comboDraw: clamp(0.05 * scale, 0, 0.16),
      overcard: clamp(0.14 * scale, 0, 0.28),
      floatChance: clamp(0.12 * scale, 0, 0.32),
      looseCallChance: clamp(0.08 * scale, 0, 0.26),
      looseFloatMaxPrice: clamp(style === "station" || style === "fish" ? 0.18 : 0.22, 0.14, 0.24),
      label: "multiway pressure"
    };
  }

  function postflopPressureStyleScale(style) {
    if (style === "station") return 1.15;
    if (style === "fish") return 1.05;
    if (style === "nit") return 1.25;
    if (style === "passive") return 1.12;
    if (style === "aggro") return 1;
    return 1;
  }

  function postflopStreetStartedMultiway(table) {
    const street = String(table?.street || "");
    if (!["flop", "turn", "river"].includes(street)) {
      return postflopOrderedContestingSeats(table).length > 2;
    }

    const participants = (table?.seats || []).filter((seat) => {
      if (!seat || !(seat.cards || []).length) return false;
      if (!seat.folded) return true;
      return String(seat.foldedAt || "") === street;
    });
    return participants.length > 2;
  }

  function turnCrumbCallCommitSpot(table, seatId, targetTotal, callAmount, stackBeforeCall) {
    if (table?.street !== "turn") return null;
    if (!(callAmount > 0) || !(stackBeforeCall > 0)) return null;

    const allInTarget = maxContributionForSeat(table, seatId);
    const opponentCeiling = effectiveAllInCeiling(table, seatId);
    if (!(allInTarget > targetTotal)) return null;
    if (!(opponentCeiling > targetTotal)) return null;
    if (allInTarget > opponentCeiling) return null;

    const leftBehind = roundBbValue(stackBeforeCall - callAmount);
    if (!(leftBehind > 0)) return null;

    const stackShareCalled = callAmount / Math.max(stackBeforeCall, 1);
    const maxCrumb = Math.max(3, stackBeforeCall * 0.18);
    if (stackShareCalled < 0.7 || leftBehind > maxCrumb) return null;

    return {
      allInTarget,
      callAmount: roundBbValue(callAmount),
      leftBehind,
      stackBeforeCall: roundBbValue(stackBeforeCall)
    };
  }

  function finalizeTurnCrumbCallDecision(decision, assessment, texture, priceLabel, commitSpot) {
    if (!commitSpot || !decision?.call) return decision;

    const canContinueForStack = assessment.madeRank >= 2 || assessment.comboDraw || assessment.draw;
    if (!canContinueForStack) {
      return {
        call: false,
        label: `${assessment.label} fold turn commit (${formatBb(commitSpot.leftBehind)} behind) ${texture.label} ${priceLabel}`
      };
    }

    return {
      ...decision,
      shove: true,
      allInTarget: commitSpot.allInTarget,
      label: `${decision.label} - turn commit shove (${formatBb(commitSpot.leftBehind)} behind)`
    };
  }

  function finalizePostflopRaiseDecision(decision, context) {
    if (!decision?.call || decision.shove || decision.raiseTo) return decision;

    const { table, seatId, targetTotal, callAmount, stackBeforeCall, assessment, texture, price, priceLabel, settings, seat, cards } = context;
    if (!["flop", "turn", "river"].includes(table?.street)) return decision;
    if (!(callAmount > 0) || !(stackBeforeCall > callAmount)) return decision;

    const raisePlan = postflopRaiseOverBetPlan({
      table,
      seatId,
      targetTotal,
      callAmount,
      assessment,
      texture,
      price,
      settings,
      seat,
      cards
    });
    if (!raisePlan) return decision;

    return {
      ...decision,
      raiseTo: raisePlan.target,
      label: `${decision.label} - ${raisePlan.label} ${priceLabel}`
    };
  }

  // True when the bot's made hand cannot be outranked on the current board — the effective nuts. Brute-
  // forces every two-card holding still live in the deck (52 minus the board minus the bot's own cards)
  // and bails the instant one beats the bot, so the common "strong but beatable" case stays cheap. Ties
  // count as nutted: a hand that can only chop still never loses, so raising it is pure value. Used to
  // stop the bot from flat-calling a bet with a hand it should be raising — slow-playing the nuts forgoes
  // a street of value with no upside (most glaring on the river, where there is nothing left to induce).
  function isEffectiveNutHand(holeCards, board) {
    const hole = Array.isArray(holeCards) ? holeCards : [];
    if (hole.length < 2 || !Array.isArray(board) || board.length < 3) return false;
    const botScore = evaluateBest([...hole, ...board]).score;
    if (Number(botScore[0]) < 3) return false; // below trips: not a hand worth slow-playing as "the nuts"
    const seen = new Set([...board, ...hole].map((card) => String(card)));
    const live = [];
    for (const rank of RANKS_HIGH) {
      for (const suit of SUITS) {
        const code = `${rank}${suit}`;
        if (!seen.has(code)) live.push(code);
      }
    }
    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) {
        if (compareScores(evaluateBest([...board, live[i], live[j]]).score, botScore) > 0) return false;
      }
    }
    return true;
  }

  function postflopRaiseOverBetPlan(context) {
    const { table, seatId, targetTotal, callAmount, assessment, texture, price, settings, seat, cards } = context;
    const maxTarget = effectivePostflopRaiseCap(table, seatId);
    if (!(maxTarget > targetTotal)) return null;

    const minRaiseTo = Number(table.minRaiseTo || targetTotal + Math.max(1, Number(table.lastRaiseSize || callAmount || 1)));
    const canLegalRaise = maxTarget >= minRaiseTo;
    const street = String(table.street || "");
    // Use the same "started multiway" definition as the c-bet / barrel / call-pressure gates, so the
    // raise decision is not heads-up while the rest of this same decision is still multiway (they
    // diverge when a seat folds mid-street). The chip cap below correctly stays on live-now seats.
    const multiway = postflopStreetStartedMultiway(table);
    const difficulty = difficultyForSeat(settings, seat);
    const style = styleForSeat(seat);
    const profile = postflopProfile(settings, seat);
    const wetOrDynamic = texture.wet || texture.monotone || texture.connected || texture.twoTone;
    let frequency = 0;
    let multiplier = 0;
    let label = "";

    if (assessment.madeRank >= 5) {
      // The effective nuts almost never flat a bet: raise on every street (~98% river, tapering to the
      // flop where a small trap mix is still defensible). Beatable strong hands — a set on a wet board, a
      // non-nut straight/flush — keep the old slow-play frequency for reverse-implied protection. The
      // global clamp to 0.95 below leaves a tiny flat branch even for the nuts, so the call range never
      // goes face-up.
      const nutted = isEffectiveNutHand(cards, table.board);
      frequency = nutted
        ? (street === "river" ? 0.98 : street === "turn" ? 0.95 : 0.9)
        : (street === "river" ? 0.62 : street === "turn" ? 0.84 : 0.72);
      multiplier = street === "river" ? (wetOrDynamic ? 3 : 2.55) : wetOrDynamic ? 3.25 : 2.75;
      // Multiway: size the value raise up — more callers = more dead money + more draws to charge.
      if (multiway) multiplier *= 1.15;
      label = `${assessment.label} ${nutted ? "nut value raise" : "value raise"}`;
    } else if (assessment.madeRank === 4) {
      frequency = street === "river" ? 0.32 : street === "turn" || wetOrDynamic ? 0.68 : 0.42;
      multiplier = street === "river" ? 2.35 : wetOrDynamic ? 3 : 2.55;
      label = `${assessment.label} protection raise`;
    } else if (!multiway && street === "flop" && assessment.comboDraw && price <= 0.42) {
      frequency = 0.46;
      multiplier = 3;
      label = "combo draw semi-bluff raise";
    } else if (!multiway && street === "turn" && assessment.comboDraw && price <= 0.36) {
      frequency = 0.34;
      multiplier = 2.8;
      label = "combo draw turn semi-bluff raise";
    }

    if (!frequency || !multiplier) return null;
    if (multiway && assessment.madeRank < 4) return null;
    if (difficulty === "easy") frequency *= 0.72;
    if (difficulty === "pro") frequency *= 1.12;
    if (style === "passive") frequency *= 0.62;
    if (style === "aggro") frequency *= 1.22;
    if (style === "station" && assessment.madeRank < 5) frequency *= 0.74;
    if (style === "fish" || style === "nit") frequency *= Number(botPostflopTrait(style, "raise") || 1);
    frequency = clamp(
      frequency
        + Number(profile.checkRaiseFrequency || 0) * (assessment.madeRank >= 4 ? 0.28 : assessment.comboDraw ? 0.22 : 0.12)
        + Number(profile.overbetFrequency || 0) * (assessment.madeRank >= 4 ? 0.35 : 0.18)
        + Number(profile.jamFrequency || 0) * (assessment.madeRank >= 5 || assessment.comboDraw ? 0.28 : 0.12),
      0.05,
      0.98
    );
    if (!randomChance(clamp(frequency, 0.05, 0.95))) return null;

    const minRaiseFrequency = clamp(Number(profile.smallBetFrequency || 0), 0, 0.35);
    const jamFrequency = clamp(Number(profile.jamFrequency || 0), 0, 0.35);
    const overRaiseFrequency = clamp(Number(profile.overbetFrequency || 0), 0, 0.4);
    const sizeShift = 1
      + clamp(Number(profile.sizeBias || 0), -0.35, 0.35) * 0.55
      + clamp(Number(profile.overbetFrequency || 0), 0, 0.45) * 0.5
      - minRaiseFrequency * 0.24;
    const potSize = Math.max(1, Number(table.pot || 0));
    let target = roundBbValue(Math.max(minRaiseTo, targetTotal * multiplier * sizeShift));
    let tinyBetValueFloor = 0;
    if (assessment.madeRank >= 4 && callAmount <= potSize * 0.12 && targetTotal <= potSize * 0.16) {
      tinyBetValueFloor = potSize * (assessment.madeRank >= 5 ? (street === "river" ? 0.65 : 0.6) : 0.5);
      target = roundBbValue(Math.max(target, tinyBetValueFloor));
    }
    if (canLegalRaise && minRaiseFrequency > 0 && assessment.madeRank < 5 && !tinyBetValueFloor && randomChance(minRaiseFrequency)) {
      target = minRaiseTo;
      label = `${label} min-raise`;
    } else if (canLegalRaise && overRaiseFrequency > 0 && randomChance(overRaiseFrequency * (assessment.madeRank >= 4 ? 1 : 0.55))) {
      const ratioPool = street === "flop" ? [1.15, 1.35, 1.6] : [1.15, 1.35, 1.6, 2.25, 3.5, 5];
      const ratio = ratioPool[randomInt(ratioPool.length)];
      target = roundBbValue(Math.max(minRaiseTo, potSize * ratio));
      label = `${label} ${Math.round(ratio * 100)}%`;
    }
    if (tinyBetValueFloor) {
      target = roundBbValue(Math.max(target, tinyBetValueFloor));
    }
    // SPR-aware snap-to-all-in: nutted hands commit earlier at low SPR,
    // thin two-pair value goes all-in less readily.
    const snapThreshold = assessment.madeRank >= 5 ? 0.78 : assessment.madeRank === 4 ? 0.86 : 0.82;
    const explicitJam = canLegalRaise
      && jamFrequency > 0
      && (assessment.madeRank >= 4 || assessment.comboDraw)
      && maxTarget > minRaiseTo + EPSILON_BB
      && randomChance(jamFrequency);
    if (!canLegalRaise) {
      target = maxTarget;
      label = `${label} all-in`;
    } else if (explicitJam) {
      target = maxTarget;
      label = `${label} all-in`;
    } else if (target >= maxTarget * snapThreshold) {
      target = maxTarget;
      label = `${label} all-in`;
    } else {
      target = Math.min(target, maxTarget);
    }

    // Leave-behind floor: a raise that would strand the effective short stack with a
    // sub-1-BB scrap (a small-cap case the proportional snapThreshold above misses)
    // is pushed to the effective all-in so no one is left with a dead remainder.
    const behindEff = roundBbValue(maxTarget - target);
    if (target < maxTarget && behindEff > 0 && behindEff < MIN_STACK_BEHIND_BB) {
      target = maxTarget;
      if (!/all-in/.test(label)) label = `${label} all-in`;
    }

    if (!(target > targetTotal)) return null;
    return { target: roundBbValue(target), label };
  }

  function effectivePostflopRaiseCap(table, seatId) {
    const ownMax = maxContributionForSeat(table, seatId);
    const otherMax = postflopOrderedContestingSeats(table)
      .filter((seat) => seat && Number(seat.id) !== Number(seatId) && !seat.folded)
      .map((seat) => maxContributionForSeat(table, seat.id))
      .filter((amount) => amount > 0);
    if (!otherMax.length) return ownMax;
    return roundBbValue(Math.min(ownMax, Math.max(...otherMax)));
  }

  function gradeHeroDecision(table, action, amount, settings) {
    if (!table || table.status !== "playing") {
      return { grade: "neutral", label: "Skip", detail: "Стол уже не в активном решении." };
    }

    return table.street === "preflop"
      ? gradePreflopHeroDecision(table, action, amount, settings)
      : gradePostflopHeroDecision(table, action, amount, settings);
  }

  function gradePreflopHeroDecision(table, action, amount, settings) {
    const aggressive = isAggressiveAction(action);
    const passiveContinue = action === "call" || action === "check";
    const pressure = action === "allin" || Number(amount) >= table.stackDepth * 0.65 || table.toCall >= table.stackDepth * 0.55;
    const difficulty = normalizeDifficulty(settings?.difficulty);
    const headsUp = isHeadsUpTable(table);
    const chart = PREFLOP_CHARTS[difficulty] || PREFLOP_CHARTS.standard;
    const baseRangeKey = pressure ? "callJam" : table.stackDepth <= 30 ? "shortContinue" : "continueVsRaise";
    // Grade a single-raise defense (BB/blind/IP) against the SAME opener-aware ranges the bot
    // defends with, so the trainer never flags as a leak a continue the bot itself makes and the
    // 15-11 canon endorses. Degrades to the flat chart when there is no resolvable single-raise opener.
    const gradeCurrentBet = Number(table.currentBet || 0);
    // Unraised pot (only blinds in) → grade an RFI open against the SAME OPEN_RANGES chart the bots
    // open with, not a defense continue chart, so the hand is judged on open-range membership and
    // open width. Otherwise canon-width opens (now matching the bots) would be flagged as leaks.
    const isOpenSpot = !pressure && gradeCurrentBet <= 1 && Boolean(table.heroPosition);
    const openPatterns = isOpenSpot ? openPatternsFor(table.heroPosition, difficulty, table.stackDepth, headsUp) : null;
    // Single raise (not a 3-bet) → grade the defense against the opener-aware ranges the bot defends
    // with, so the trainer never flags as a leak a continue the bot itself makes and the canon endorses.
    // Mirrors isFacingSinglePreflopRaise: the first voluntary raise (even an
    // oversized iso over limpers) grades as a single-raise defense, not as a
    // cold 3-bet spot.
    const facingSingleRaise = !pressure && table.toCall > 0 && gradeCurrentBet > 1
      && isFacingSinglePreflopRaise(table, heroSeat(table));
    const gradeOpenerPosition = facingSingleRaise ? preflopOpenerPosition(table) : "";
    const defensePatterns = (facingSingleRaise && gradeOpenerPosition && table.heroPosition)
      ? defensePatternsFor(table.heroPosition, difficulty, table.stackDepth, gradeOpenerPosition, headsUp)
      : null;
    const rangeKey = openPatterns ? "чарт открытия" : defensePatterns ? "диапазон защиты" : baseRangeKey;
    const continueByChart = chartContains(openPatterns || defensePatterns || chart[baseRangeKey] || chart.continueVsRaise, table.combo);
    const randomDeal = table.handGroup === "random";

    if (!randomDeal && table.handGroup === "fold") {
      if (action === "fold") return feedback("good", "OK", "Мусорная рука из fold-pool, фолд по плану.");
      if (table.canCheck && action === "check") return feedback("thin", "Thin", "Чек бесплатный, но рука из obvious-fold пула.");
      return feedback("leak", "Leak", "Рука добавлена как obvious fold, продолжение здесь тренер считает ошибкой.");
    }

    // C3: Hero facing a 3-bet as a NON-opener (cold) is graded against the narrow cold-call-vs-3bet
    // policy (the same the bots use), not the wide single-raise continue chart — so a loose cold flat is
    // a Leak and the grader mirrors bot cold-call discipline. The original opener keeps the chart path.
    const facingThreeBetGrade = !pressure && table.toCall > 0
      && gradeCurrentBet > MAX_SINGLE_OPEN_TO_BB + 0.01 && !facingSingleRaise;
    if (facingThreeBetGrade && !isOriginalPreflopOpener(table, heroSeat(table)) && !isFacingPreflopAllInRaise(table, 0)) {
      const coldDepth = effectiveResponseStackDepth(table, heroSeat(table), preflopOpenerPosition(table));
      const cold = coldCallVsThreeBetDecision(table, heroSeat(table), table.combo, "reg", coldDepth, { deterministic: true });
      const coldContinue = cold.action !== "fold";
      if (action === "fold") {
        return coldContinue
          ? feedback("thin", "Thin", `${table.combo} ещё можно флэтить трибет в холодную, но фолд почти всегда ок.`)
          : feedback("good", "OK", `${table.combo}: фолд на трибет в холодную правильный.`);
      }
      if (passiveContinue) {
        return coldContinue
          ? feedback("good", "OK", `${table.combo} входит в узкий cold-call-vs-3bet диапазон, колл ок.`)
          : feedback("leak", "Leak", `${table.combo}: колл трибета в холодную почти всегда минус — надо фолдить или 4бетить.`);
      }
    }

    if (table.toCall > 0) {
      if (continueByChart && action === "fold") return feedback("leak", "Leak", `${table.combo} входит в ${rangeKey}, фолд слишком тайтовый.`);
      if (!continueByChart && action === "fold") return feedback("good", "OK", `${table.combo} не входит в ${rangeKey}, фолд нормальный.`);
      if (continueByChart && (aggressive || passiveContinue)) return feedback("good", "OK", `${table.combo} входит в ${rangeKey}, продолжение нормальное.`);
      return feedback("leak", "Leak", `${table.combo} вне ${rangeKey}, продолжение слишком широкое.`);
    }

    if (table.canCheck && action === "check") {
      return continueByChart
        ? feedback("thin", "Thin", `${table.combo} можно повышать, чек оставляет EV на столе.`)
        : feedback("good", "OK", "Бесплатный чек с нижней частью диапазона.");
    }

    if (action === "fold") {
      return continueByChart
        ? feedback("leak", "Leak", `${table.combo} входит в ${rangeKey}, фолд слишком пассивный.`)
        : feedback("good", "OK", `${table.combo} вне ${rangeKey}, фолд нормальный.`);
    }
    if (action === "allin" && table.stackDepth > 28) return feedback("thin", "Thin", "Пуш слишком крупный для текущей глубины, обычный raise лучше.");
    if (aggressive) {
      return continueByChart
        ? feedback("good", "OK", `${table.combo} входит в ${rangeKey}, агрессивный вход подходит.`)
        : feedback("leak", "Leak", `${table.combo} вне ${rangeKey}, raise слишком широкий.`);
    }
    return continueByChart
      ? feedback("thin", "Thin", "Продолжение допустимо, но без инициативы хуже raise.")
      : feedback("leak", "Leak", `${table.combo} вне ${rangeKey}, продолжение слишком широкое.`);
  }

  function gradePostflopHeroDecision(table, action, amount, settings) {
    const assessment = assessPostflopHand(table.heroHand, table.board);
    const aggressive = isAggressiveAction(action);
    const facingBet = table.toCall > 0;
    // BUGHUNT F013: use the bot's pot-odds convention call/(pot+call). `table.pot`
    // already contains the villain's bet (like botCallVsBet's `table.pot`), so the
    // caller's true price is toCall/(pot+toCall) on the 0..1 scale — the SAME scale
    // the made-hand thresholds from postflopContinueThresholds live on. The old
    // toCall/pot (0..∞) scale compared against those 0..1 thresholds and graded a
    // bot-approved call (e.g. pot bet, bot price 0.33 < 0.82) as a fold-worthy
    // "leak" (old grader price 1.0 > 0.82). This value now also drives the correct
    // displayed pot-odds percentage.
    const price = facingBet ? table.toCall / Math.max(table.pot + table.toCall, 1) : 0;
    const priceText = facingBet ? ` Цена ${Math.round(price * 100)}% банка.` : "";
    const heroStackBeforeCall = remainingStack(table, 0);
    const facingAllIn = facingBet && heroStackBeforeCall > 0 && table.toCall >= heroStackBeforeCall * 0.98;
    const pressureCall = facingBet && (facingAllIn || price >= 0.45);
    // Grade the hero against the SAME made-hand thresholds the bot defends with
    // (postflopProfile + identical texture/pressure deltas in botCallVsBet), so a
    // fold the bot itself would make is never called a Leak.
    const heroProfile = postflopProfile(settings, heroSeat(table));
    const texture = assessBoardTexture(table.board);
    // Same shared thresholds the bot defends with (postflopContinueThresholds) —
    // the grader passes no multiway responsePressure, matching botCallVsBet for
    // the heads-up spots the trainer grades.
    // Keep main's call shape (paired-board two-pair ceilings need assessment +
    // facingAllIn inside postflopContinueThresholds — same args the bot passes).
    const { topPairMaxPrice: rawHeroTopPairMaxPrice, weakPairMaxPrice: rawHeroWeakPairMaxPrice } =
      postflopContinueThresholds(heroProfile, texture, pressureCall, null, assessment, facingAllIn);
    // BUGHUNT F012: mirror the bot's size-read defend shift (botCallVsBet ~1321-1324).
    // PRO bots run sizeReadDefense (default 0.6): they tighten made-hand continue
    // thresholds vs BIG bets (don't pay off value) and loosen vs SMALL bets. The
    // grader must apply the IDENTICAL shift under the IDENTICAL gating (profile flag +
    // the same 0..1 `price`), otherwise a PRO-mirroring top-pair fold vs an overbet is
    // graded a leak. Same clamp bounds as the bot so heroTopPairMaxPrice/heroWeakPairMaxPrice
    // equal the bot's post-shift thresholds exactly (shift applies AFTER the
    // in-function ceilings, matching the bot's raw -> shift order at ~1326-1339).
    const heroSizeRead = clamp(Number(heroProfile.sizeReadDefense || 0), 0, 1);
    const heroSizeReadShift = facingBet && heroSizeRead > 0
      ? heroSizeRead * clamp((price - 0.25) * 8, -0.4, 0.85)
      : 0;
    const heroTopPairMaxPrice = clamp(rawHeroTopPairMaxPrice - heroSizeReadShift, 0.08, 0.98);
    const heroWeakPairMaxPrice = clamp(rawHeroWeakPairMaxPrice - heroSizeReadShift, 0.05, 0.95);

    if (facingBet) {
      if (assessment.madeRank >= 4) {
        // Mirror botCallVsBet's madeRank>=4 logic (engine ~1354-1363): the bot CONTINUES
        // when the hand is effective nuts OR the price is within strongMadeMaxPrice, and
        // FOLDS above that (reverse-implied on wet/paired boards, huge all-ins). So a hero
        // fold is a Leak ONLY when the bot itself would continue; above the threshold the
        // fold matches the bot and is a defensible thin decision. Use the bot's price
        // convention (toCall/(pot+toCall)) for the comparison so the mirror is faithful.
        // BUGHUNT F046.
        const botMadePrice = table.toCall / Math.max(table.pot + table.toCall, 1);
        const heroStrongMaxPrice = strongMadeMaxPrice(assessment, texture, heroProfile, botMadePrice, facingAllIn);
        const botWouldContinue = isEffectiveNutHand(table.heroHand, table.board) || botMadePrice <= heroStrongMaxPrice;
        if (action === "fold") {
          return botWouldContinue
            ? feedback("leak", "Leak", `${assessment.label}: сильная готовая рука, фолд нельзя.${priceText}`)
            : feedback("thin", "Thin", `${assessment.label}: против крупного all-in/сайза фолд возможен (reverse-implied).${priceText}`);
        }
        return feedback("good", "OK", `${assessment.label}: продолжаем против ставки.${priceText}`);
      }

      if (assessment.madeRank === 3) {
        if (action === "fold") {
          return price > heroTopPairMaxPrice
            ? feedback("thin", "Thin", `${assessment.label}: против крупного сайза фолд возможен, но это уже пограничное решение.${priceText}`)
            : feedback("leak", "Leak", `${assessment.label}: top-pair/overpair слишком сильны для фолда.${priceText}`);
        }
        return aggressive
          ? feedback("thin", "Thin", `${assessment.label}: raise возможен, но call обычно стабильнее.${priceText}`)
          : price > heroTopPairMaxPrice
            ? feedback("thin", "Thin", `${assessment.label}: call большого сайза не автоматический, нужен аккуратный defend.${priceText}`)
            : feedback("good", "OK", `${assessment.label}: call нормальный.${priceText}`);
      }

      if (assessment.madeRank === 2 || assessment.draw) {
        const maxGoodPrice = assessment.comboDraw
          ? (pressureCall ? 0.52 : 0.72)
          : assessment.draw
            ? (pressureCall ? 0.34 : 0.58)
            : heroWeakPairMaxPrice;
        if (action === "fold") {
          return price <= maxGoodPrice
            ? feedback("thin", "Thin", `${assessment.label}: можно было продолжить по цене.${priceText}`)
            : feedback("good", "OK", `${assessment.label}: дорогая цена, фолд нормальный.${priceText}`);
        }
        return price <= maxGoodPrice
          ? feedback("good", "OK", `${assessment.label}: продолжение по цене нормальное.${priceText}`)
          : pressureCall
            ? feedback("leak", "Leak", `${assessment.label}: против крупного all-in/сайза продолжение слишком широкое.${priceText}`)
            : feedback("thin", "Thin", `${assessment.label}: цена уже высокая, продолжение пограничное.${priceText}`);
      }

      if (action === "fold") return feedback("good", "OK", `${assessment.label}: без руки фолд нормальный.${priceText}`);
      if (assessment.overcards && price <= 0.25) return feedback("thin", "Thin", "Overcards дешево, float допустим, но не обязателен.");
      return feedback("leak", "Leak", `${assessment.label}: продолжение без equity слишком широко.${priceText}`);
    }

    const bvbLimpFeedback = gradeBlindVsBlindLimpPotDecision(table, action, amount, assessment);
    if (bvbLimpFeedback) return bvbLimpFeedback;

    if (assessment.madeRank >= 4) {
      return aggressive
        ? feedback("good", "OK", `${assessment.label}: value bet.`)
        : feedback("thin", "Thin", `${assessment.label}: check допустим редко, value bet лучше.`);
    }

    if (assessment.madeRank === 3) {
      return aggressive
        ? feedback("good", "OK", `${assessment.label}: ставка на value/protection.`)
        : feedback("thin", "Thin", `${assessment.label}: check возможен, но чаще хочется ставить.`);
    }

    if (assessment.draw || assessment.overcards) {
      return aggressive
        ? feedback("good", "OK", `${assessment.label}: semi-bluff подходит.`)
        : feedback("thin", "Thin", `${assessment.label}: check нормальный, но часть дро стоит ставить.`);
    }

    return aggressive
      ? feedback("thin", "Thin", "Air bluff допустим иногда, но это не default.")
      : feedback("good", "OK", "Air без ставки: check по плану.");
  }

  function gradeBlindVsBlindLimpPotDecision(table, action, amount, assessment) {
    if (!isBlindVsBlindLimpPot(table)) return null;
    const aggressive = isAggressiveAction(action);
    const betAmount = Number(amount || 0);
    const oneBbStab = betAmount > 0 && betAmount <= 1.2;

    if (table.street === "flop") {
      if (aggressive) {
        return oneBbStab
          ? feedback("good", "OK", "BvB limp pot: частая ставка 1 BB на флопе по плану 15-11.", "bvb limp pot")
          : feedback("thin", "Thin", `BvB limp pot: ставка допустима, но базовый сайз методички - 1 BB; ${formatBb(betAmount)} разгоняет банк.`, "sizing");
      }

      if (assessment.madeRank >= 2 || assessment.draw || assessment.overcards) {
        return feedback("thin", "Thin", `BvB limp pot: ${assessment.label} часто ставит 1 BB, чек оставляет давление на столе.`, "bvb limp pot");
      }
      return feedback("thin", "Thin", "BvB limp pot по методичке часто ставим 1 BB даже широко; чек оставляем для нижней части диапазона.", "bvb limp pot");
    }

    if (table.street === "turn") {
      const naturalBarrel = assessment.madeRank >= 3 || assessment.draw || assessment.comboDraw;
      if (aggressive) {
        return naturalBarrel
          ? feedback("good", "OK", `BvB limp pot: ${assessment.label} подходит для продолжения на естественном draw/хорошем ранауте.`, "bvb limp pot")
          : feedback("leak", "Leak", "BvB limp pot: после флопа не доблефовываем случайный мусор без draw или хорошего ранаута.", "bad bluff");
      }
      return naturalBarrel
        ? feedback("thin", "Thin", `BvB limp pot: ${assessment.label} можно продолжать маленьким баррелем.`, "bvb limp pot")
        : feedback("good", "OK", "BvB limp pot: без естественного продолжения чек нормальный.", "bvb limp pot");
    }

    if (table.street === "river") {
      const valueBet = assessment.madeRank >= 3;
      if (aggressive) {
        return valueBet
          ? feedback("good", "OK", `BvB limp pot: ${assessment.label} добирает value.`, "bvb limp pot")
          : feedback("thin", "Thin", "BvB limp pot: river bluff нужен только на лучших ранаутах, случайный air не default.", "bad bluff");
      }
      return valueBet
        ? feedback("thin", "Thin", `BvB limp pot: ${assessment.label} часто хочет value bet.`, "bvb limp pot")
        : feedback("good", "OK", "BvB limp pot: missed air сдаем без лишнего третьего барреля.", "bvb limp pot");
    }

    return null;
  }

  function isAggressiveAction(action) {
    return action === "allin" || action === "open" || action.includes("raise") || action.includes("bet");
  }

  function feedback(grade, label, detail, category = "") {
    return {
      grade,
      label,
      detail,
      category: category || feedbackCategory(detail),
      score: feedbackScore(grade)
    };
  }

  function feedbackScore(grade) {
    if (grade === "good") return 1;
    if (grade === "thin") return 0;
    if (grade === "leak") return -1;
    return 0;
  }

  function feedbackCategory(detail) {
    const text = String(detail || "").toLowerCase();
    if (text.includes("фолд") || text.includes("overfold")) return "overfold";
    if (text.includes("продолж") || text.includes("call") || text.includes("float")) return "loose continue";
    if (text.includes("value") || text.includes("став")) return "missed value";
    if (text.includes("bluff") || text.includes("air")) return "bad bluff";
    if (text.includes("пуш") || text.includes("raise")) return "sizing";
    return "strategy";
  }

  function assessCards(cards) {
    const parsed = cards.map(parseCardCode);
    const category = cards.length >= 5 ? evaluateBest(cards).score[0] : 0;
    const canImprove = cards.length < 7;
    const suitCounts = parsed.reduce((acc, card) => {
      acc[card.suit] = (acc[card.suit] || 0) + 1;
      return acc;
    }, {});
    const flushDraw = canImprove && Object.values(suitCounts).some((count) => count >= 4);
    const values = [...new Set(parsed.map((card) => card.value === 14 ? [14, 1] : [card.value]).flat())].sort((a, b) => a - b);
    let straightDraw = false;
    for (let start = 1; start <= 10; start += 1) {
      const run = [start, start + 1, start + 2, start + 3, start + 4];
      const hits = run.filter((value) => values.includes(value)).length;
      if (canImprove && hits >= 4) straightDraw = true;
    }
    return { category, flushDraw, straightDraw };
  }

  function assessPostflopHand(holeCards, board) {
    const combined = [...holeCards, ...board];
    const hole = holeCards.map(parseCardCode);
    const boardCards = board.map(parseCardCode);
    const best = combined.length >= 5 ? evaluateBest(combined) : { score: [0], name: "старшая карта" };
    const category = best.score[0];
    const boardValues = boardCards.map((card) => card.value);
    const boardHigh = Math.max(...boardValues, 0);
    const uniqueBoardValues = [...new Set(boardValues)].sort((a, b) => b - a);
    const boardCounts = countBy(boardCards, "value");
    const boardPairValues = Object.entries(boardCounts)
      .filter(([, count]) => Number(count || 0) >= 2)
      .map(([value]) => Number(value))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => b - a);
    const boardHasPair = boardPairValues.length > 0;
    const pocketPair = hole.length === 2 && hole[0].value === hole[1].value;
    const pocketValue = pocketPair ? hole[0].value : 0;
    const pairedHoleValues = hole.filter((card) => boardCounts[card.value]).map((card) => card.value);
    const hasHolePair = pairedHoleValues.length > 0 || pocketPair;
    const topPair = pairedHoleValues.includes(boardHigh);
    const secondPair = uniqueBoardValues[1] ? pairedHoleValues.includes(uniqueBoardValues[1]) : false;
    const overpair = pocketPair && pocketValue > boardHigh;
    const boardOnlyPair = category === 1 && !hasHolePair;
    const canImprove = boardCards.length < 5;
    const flushDraw = canImprove && category < 5 && hasFlushDraw(combined);
    const straightDraw = canImprove && category < 4 && hasStraightDraw(combined);
    const comboDraw = flushDraw && straightDraw;
    const draw = flushDraw || straightDraw;
    const overcards = canImprove && category === 0 && boardHigh > 0 && hole.filter((card) => card.value > boardHigh).length >= 1;
    const boardOnlyMadeHand = isBoardOnlyMadeHand(category, best, board, boardCounts);
    const pairedBoardTwoPair = category === 2 && hasHolePair && boardHasPair && !boardOnlyMadeHand;
    // F056: on a DOUBLE-PAIRED board a category-2 hand with no hole pair IS the board's
    // two pair plus your kicker (e.g. Ah3d on KcKsQcQd2h = KKQQ+A). The kicker PLAYS, so
    // it beats "playing the board" and must NOT collapse to "air" (which folded near-nuts
    // to any river bet). Recognized as a genuine made hand, graded by the playing kicker.
    const twoPairKickerPlays = category === 2 && !hasHolePair && !boardOnlyMadeHand
      && Array.isArray(board) && board.length >= 5
      && compareScores(best.score || [-1], evaluateBest(board).score || [-1]) > 0;

    let madeRank = 0;
    let label = "air";
    if (boardOnlyMadeHand) {
      label = `board ${HAND_NAMES[category] || "made hand"}`;
    } else if (category >= 3) {
      madeRank = 5;
      label = refineTripsHandName(best, holeCards);
    } else if (pairedBoardTwoPair) {
      if (overpair || topPair) {
        madeRank = 3;
        label = `${overpair ? "overpair" : "top pair"} + board pair`;
      } else {
        madeRank = 2;
        label = `${secondPair ? "second pair" : "weak pair"} + board pair`;
      }
    } else if (category === 2 && hasHolePair) {
      madeRank = 4;
      label = "две пары";
    } else if (twoPairKickerPlays) {
      // Board's two pair + your kicker. A near-nut kicker (K/A) is a strong made hand;
      // a low kicker beats board-players/bluffs but stays kicker-vulnerable. Either way
      // it is a made hand, not air. (F056)
      const playKicker = Number(best?.score?.[3] || 0);
      if (playKicker >= 13) {
        madeRank = 4;
        label = "две пары (топ-кикер)";
      } else {
        madeRank = 2;
        label = "две пары (кикер)";
      }
    } else if (overpair) {
      madeRank = 3;
      label = "overpair";
    } else if (topPair) {
      madeRank = 3;
      label = "top pair";
    } else if (secondPair || (category === 1 && hasHolePair && !boardOnlyPair)) {
      madeRank = 2;
      label = secondPair ? "second pair" : "weak pair";
    } else if (comboDraw) {
      label = "combo draw";
    } else if (flushDraw) {
      label = "flush draw";
    } else if (straightDraw) {
      label = "straight draw";
    } else if (overcards) {
      label = "overcards";
    }

    return {
      category,
      bestName: best.name,
      madeRank,
      label,
      flushDraw,
      straightDraw,
      comboDraw,
      draw,
      drawLabel: comboDraw ? "combo draw" : flushDraw ? "flush draw" : straightDraw ? "straight draw" : "",
      overcards,
      topPair,
      secondPair,
      overpair,
      pocketPair,
      pairedBoardTwoPair,
      boardOnlyMadeHand
    };
  }

  function isBoardOnlyMadeHand(category, best, board, boardCounts) {
    if (category < 2) return false;
    if (Array.isArray(board) && board.length >= 5) {
      const boardBest = evaluateBest(board);
      if (compareScores(best.score || [-1], boardBest.score || [-1]) === 0) return true;
    }
    if (category === 3) {
      const tripRank = Number(best?.score?.[1] || 0);
      return tripRank > 0 && Number(boardCounts?.[tripRank] || 0) >= 3;
    }
    return false;
  }

  function assessBoardTexture(board) {
    const cards = (board || []).map(parseCardCode).filter((card) => Number.isFinite(card.value));
    if (!cards.length) {
      return {
        label: "empty board",
        wetness: 0,
        dry: true,
        wet: false,
        paired: false,
        monotone: false,
        twoTone: false,
        connected: false,
        aceHigh: false,
        broadwayHeavy: false
      };
    }

    const values = cards.map((card) => card.value);
    const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
    const suitCounts = countBy(cards, "suit");
    const valueCounts = countBy(cards, "value");
    const paired = Object.values(valueCounts).some((count) => count >= 2);
    const monotone = Object.values(suitCounts).some((count) => count >= Math.min(3, cards.length));
    const twoTone = !monotone && Object.values(suitCounts).some((count) => count >= 2);
    const connected = boardConnectedness(uniqueValues) >= 3;
    const broadwayHeavy = uniqueValues.filter((value) => value >= RANK_VALUES.T).length >= 2;
    const aceHigh = uniqueValues[0] === RANK_VALUES.A;

    let wetness = 0;
    if (monotone) wetness += 3;
    if (twoTone) wetness += 1;
    if (connected) wetness += 2;
    if (broadwayHeavy) wetness += 1;
    if (paired) wetness -= 1;
    if (aceHigh && !twoTone && !connected) wetness -= 1;
    wetness = clamp(wetness, 0, 6);

    const wet = wetness >= 3;
    const dry = wetness <= 1;
    const label = monotone
      ? "monotone"
      : paired
      ? "paired"
      : wet
      ? "wet"
      : dry
      ? aceHigh ? "A-high dry" : "dry"
      : "medium";

    return {
      label,
      wetness,
      dry,
      wet,
      paired,
      monotone,
      twoTone,
      connected,
      aceHigh,
      broadwayHeavy
    };
  }

  function boardConnectedness(values) {
    const expanded = [...new Set(values.flatMap((value) => value === RANK_VALUES.A ? [RANK_VALUES.A, 1] : [value]))].sort((a, b) => a - b);
    let best = 0;
    for (let start = 1; start <= 10; start += 1) {
      const hits = [start, start + 1, start + 2, start + 3, start + 4].filter((value) => expanded.includes(value)).length;
      best = Math.max(best, hits);
    }
    return best;
  }

  function postflopProfile(settings, seat = null) {
    const difficulty = difficultyForSeat(settings, seat);
    const style = styleForSeat(seat);
    let profile;
    if (difficulty === "easy") {
      // Calibrated loose-passive "chaotic amateur": passive chase tuned slightly UP (peels draws /
      // overcards and calls down a touch wider) while thin/bluff betting is reined in via the barrel
      // and raise scales elsewhere — i.e. wider passive continues, less correct aggression.
      profile = {
        topPairBet: 0.76,
        weakPairBet: 0.36,
        comboDrawBet: 0.74,
        drawBet: 0.5,
        overcardBet: 0.28,
        airBet: 0.2,
        topPairMaxPrice: 0.92,
        weakPairMaxPrice: 0.66,
        comboDrawMaxPrice: 0.9,
        drawMaxPrice: 0.76,
        overcardMaxPrice: 0.4,
        floatChance: 0.42,
        heroCallChance: 0.26,
        sizeBias: -0.04,
        smallBetFrequency: 0,
        overbetFrequency: 0,
        jamFrequency: 0,
        checkRaiseFrequency: 0,
        donkFrequency: 0,
        sizeReadDefense: 0
      };
    } else if (difficulty === "pro") {
      profile = {
        topPairBet: 0.9,
        weakPairBet: 0.38,
        comboDrawBet: 0.84,
        drawBet: 0.62,
        overcardBet: 0.2,
        airBet: 0.08,
        topPairMaxPrice: 0.88,
        weakPairMaxPrice: 0.54,
        comboDrawMaxPrice: 0.9,
        drawMaxPrice: 0.68,
        overcardMaxPrice: 0.28,
        floatChance: 0.2,
        heroCallChance: 0.05,
        sizeBias: 0,
        smallBetFrequency: 0,
        overbetFrequency: 0,
        jamFrequency: 0,
        checkRaiseFrequency: 0,
        donkFrequency: 0,
        // Default-ON for PRO bots (2026-06-29): read the opponent's bet SIZE as a range-strength
        // signal, but not at full weight. Full weight beat the bot field's value-big / bluff-small
        // sizing tell, yet over-folded one-pair hands to human-style big bluffs. The default 0.6 keeps
        // the searched edge while preserving a sane made-hand defend floor; production overrides can
        // still tune this in [0,1]. Weak/easy bots keep sizeReadDefense=0 (realistically size-blind).
        sizeReadDefense: 0.6
      };
    } else {
      profile = {
        topPairBet: 0.78,
        weakPairBet: 0.28,
        comboDrawBet: 0.72,
        drawBet: 0.46,
        overcardBet: 0.16,
        airBet: 0.09,
        topPairMaxPrice: 0.82,
        weakPairMaxPrice: 0.5,
        comboDrawMaxPrice: 0.82,
        drawMaxPrice: 0.62,
        overcardMaxPrice: 0.26,
        floatChance: 0.24,
        heroCallChance: 0.13,
        sizeBias: -0.01,
        smallBetFrequency: 0,
        overbetFrequency: 0,
        jamFrequency: 0,
        checkRaiseFrequency: 0,
        donkFrequency: 0,
        sizeReadDefense: 0
      };
    }

    profile = applyBotStrategyPostflopProfile(profile, difficulty, seat);

    // pro discipline: a pro-difficulty seat never inherits station/fish
    // postflop call leaks (over-calling), even if tagged with that style.
    return difficulty === "pro"
      ? applyPostflopStyle(profile, style === "station" || style === "fish" ? "reg" : style)
      : applyPostflopStyle(profile, style);
  }

  function applyBotStrategyPostflopProfile(profile, difficulty, seat = null) {
    const adjustments = BOT_STRATEGY_PROFILE.postflop?.[normalizeDifficulty(difficulty)];
    const next = { ...profile };
    const adjustmentBounds = (key) => {
      if (key === "sizeBias") return [-0.35, 0.35];
      if (key === "checkRaiseFrequency" || key === "donkFrequency") return [-0.35, 0.35];
      return [0, 1];
    };
    const applyAdjustments = (source) => {
      Object.entries(source || {}).forEach(([key, delta]) => {
        if (!Object.prototype.hasOwnProperty.call(next, key)) return;
        const current = Number(next[key]);
        const change = Number(delta);
        if (!Number.isFinite(current) || !Number.isFinite(change)) return;
        const [min, max] = adjustmentBounds(key);
        next[key] = clamp(current + change, min, max);
      });
    };
    if (adjustments && typeof adjustments === "object") applyAdjustments(adjustments);
    applyAdjustments(botStrategyArenaProductionAdjustments(difficulty, seat));
    return next;
  }

  function applyPostflopStyle(profile, style) {
    const next = { ...profile };
    const trait = botArchetype(style)?.postflop || {};
    if (style === "fish" || style === "nit") {
      ["topPairBet", "weakPairBet", "comboDrawBet", "drawBet", "overcardBet"].forEach((key) => {
        next[key] = clamp(next[key] * Number(trait.bet || 1), 0, 1);
      });
      next.airBet = clamp(next.airBet * Number(trait.air || trait.bet || 1), 0, 1);
      next.topPairMaxPrice = clamp(next.topPairMaxPrice + Number(trait.call || 0), 0.18, 1);
      next.weakPairMaxPrice = clamp(next.weakPairMaxPrice + Number(trait.call || 0), 0.08, 1);
      next.drawMaxPrice = clamp(next.drawMaxPrice + Number(trait.call || 0) * 0.7, 0.12, 1);
      next.comboDrawMaxPrice = clamp(next.comboDrawMaxPrice + Number(trait.call || 0) * 0.7, 0.18, 1);
      next.overcardMaxPrice = clamp(next.overcardMaxPrice + Number(trait.call || 0) * 0.6, 0.08, 1);
      next.floatChance = clamp(next.floatChance + Number(trait.float || 0), 0, 1);
      next.heroCallChance = clamp(next.heroCallChance + Number(trait.call || 0), 0, 1);
    } else if (style === "passive") {
      ["topPairBet", "weakPairBet", "comboDrawBet", "drawBet", "overcardBet", "airBet"].forEach((key) => {
        next[key] = clamp(next[key] * 0.72, 0, 1);
      });
      next.floatChance = clamp(next.floatChance * 0.95, 0, 1);
      next.heroCallChance = clamp(next.heroCallChance * 1.18, 0, 1);
    } else if (style === "aggro") {
      ["topPairBet", "weakPairBet", "comboDrawBet", "drawBet", "overcardBet", "airBet"].forEach((key) => {
        next[key] = clamp(next[key] * 1.22 + 0.04, 0, 1);
      });
      next.floatChance = clamp(next.floatChance + 0.08, 0, 1);
    } else if (style === "station") {
      next.weakPairMaxPrice = clamp(next.weakPairMaxPrice + 0.16, 0, 1);
      next.drawMaxPrice = clamp(next.drawMaxPrice + 0.1, 0, 1);
      next.overcardMaxPrice = clamp(next.overcardMaxPrice + 0.08, 0, 1);
      next.floatChance = clamp(next.floatChance + 0.18, 0, 1);
      next.heroCallChance = clamp(next.heroCallChance + 0.18, 0, 1);
      next.airBet = clamp(next.airBet * 0.72, 0, 1);
    }
    return next;
  }

  function adjustedPostflopFraction(fraction, profile) {
    const base = Number(fraction || 0);
    if (!(base > 0)) return 0.33;
    const sizeBias = clamp(Number(profile?.sizeBias || 0), -0.35, 0.35);
    if (!sizeBias) return base;
    return clamp(Math.round((base + sizeBias * 0.28) * 100) / 100, 0.1, 2.5);
  }

  function postflopMinBetAmount(table) {
    const max = remainingStack(table, table.activeVillain);
    if (!(max > 0)) return 0;
    return roundBbValue(Math.min(max, Math.max(1, Number(table.minBet || 1))));
  }

  function postflopAllInBetAmount(table) {
    const max = remainingStack(table, table.activeVillain);
    return max > 0 ? roundBbValue(max) : 0;
  }

  function canUsePostflopMinBet(table, profile, context = {}) {
    if (!(Number(profile?.smallBetFrequency || 0) > 0)) return false;
    if (!["flop", "turn", "river"].includes(String(table?.street || ""))) return false;
    if (context.polar) return false;
    if (context.preferValue && Number(context.assessment?.madeRank || 0) >= 4 && Number(table?.pot || 0) >= 8) return false;
    const amount = postflopMinBetAmount(table);
    if (!(amount > 0)) return false;
    return amount < Math.max(1.1, Number(table.pot || 0) * 0.28);
  }

  function canUsePostflopOverbet(table, profile, context = {}) {
    if (!(Number(profile?.overbetFrequency || 0) > 0)) return false;
    const street = String(table?.street || "");
    const assessment = context.assessment || {};
    const madeRank = Number(assessment.madeRank || 0);
    const strongValue = madeRank >= 4;
    const comboDraw = Boolean(assessment.comboDraw);
    const polarAir = Boolean(context.polar) && madeRank === 0 && !assessment.draw && !assessment.comboDraw;
    const valuePreferred = Boolean(context.preferValue) && strongValue;
    const bluffPreferred = Boolean(context.preferBluff);
    if (street === "flop") {
      const canFlopPolarize = strongValue || comboDraw || polarAir || valuePreferred || bluffPreferred;
      if (!canFlopPolarize) return false;
    } else if (!["turn", "river"].includes(street)) {
      return false;
    } else if (!(strongValue || comboDraw || polarAir || valuePreferred || bluffPreferred)) {
      return false;
    }
    if (postflopStreetStartedMultiway(table) && Number(context.assessment?.madeRank || 0) < 4) return false;
    const max = remainingStack(table, table.activeVillain);
    return max > Math.max(2, Number(table.pot || 0) * 1.05);
  }

  function canUsePostflopJam(table, profile, context = {}) {
    if (!(Number(profile?.jamFrequency || 0) > 0)) return false;
    if (!["flop", "turn", "river"].includes(String(table?.street || ""))) return false;
    const max = remainingStack(table, table.activeVillain);
    const pot = Math.max(1, Number(table.pot || 0));
    if (!(max > Math.max(2, pot * 0.75))) return false;
    const assessment = context.assessment || {};
    const strongValue = Boolean(context.polar) && Number(assessment.category || 0) >= 4;
    const comboDraw = Boolean(assessment.comboDraw);
    const polarAir = context.polar && Number(assessment.madeRank || 0) === 0 && !assessment.draw && !assessment.comboDraw;
    const valuePreferred = Boolean(context.preferValue) && strongValue;
    return strongValue || comboDraw || polarAir || valuePreferred || context.preferBluff;
  }

  function choosePostflopSizing(table, sizePool, profile = null, context = {}) {
    const pool = (Array.isArray(sizePool) && sizePool.length ? sizePool : [0.33])
      .map((fraction) => adjustedPostflopFraction(fraction, profile))
      .filter((fraction) => Number.isFinite(fraction) && fraction > 0);
    const fallbackFraction = pool.length ? randomItem(pool) : adjustedPostflopFraction(0.33, profile);
    const minBias = clamp(Number(profile?.smallBetFrequency || 0), 0, 0.45);
    const overBias = clamp(Number(profile?.overbetFrequency || 0), 0, 0.45);
    const pot = Math.max(1, Number(table.pot || 0));
    const max = remainingStack(table, table.activeVillain);
    const spr = max / pot;
    const strongValue = Number(context.assessment?.madeRank || 0) >= 4;
    const valuePreferred = Boolean(context.preferValue) && strongValue;
    const highSprPolar = spr >= 5 && (context.polar || valuePreferred || context.preferBluff || Number(context.assessment?.madeRank || 0) >= 5 || Boolean(context.assessment?.comboDraw));
    const jamBias = clamp(
      Number(profile?.jamFrequency || 0) * (spr >= 7 && !highSprPolar ? 0.45 : 1)
        + (highSprPolar ? 0.012 : 0),
      0,
      0.45
    );
    let overbetBlockedByStack = false;

    if (canUsePostflopMinBet(table, profile, context) && randomChance(minBias)) {
      return { amount: postflopMinBetAmount(table), label: "minbet" };
    }

    if (canUsePostflopJam(table, profile, context) && randomChance(jamBias)) {
      return { amount: postflopAllInBetAmount(table), label: "all-in" };
    }

    if (canUsePostflopOverbet(table, profile, context) && randomChance(overBias)) {
      const overPool = [1.1, 1.25, 1.5, 2, 3, 5]
        .map((fraction) => adjustedPostflopFraction(fraction, profile))
        .filter((fraction) => {
          const amount = postflopBetAmount(table, fraction, { noAutoShove: true });
          return amount > pot && amount < max - EPSILON_BB;
        });
      if (overPool.length) {
        const fraction = randomItem(overPool);
        return {
          amount: postflopBetAmount(table, fraction, { noAutoShove: true }),
          label: `${Math.round(fraction * 100)}%`
        };
      }
      overbetBlockedByStack = true;
    }

    const noAutoShove = context.noAutoShove || overbetBlockedByStack;
    return {
      amount: postflopBetAmount(table, fallbackFraction, noAutoShove ? { noAutoShove: true } : {}),
      label: `${Math.round(fallbackFraction * 100)}%`
    };
  }

  // A bet must never strand the betting bot — or any opponent who calls it — with a
  // trivially small, unplayable remainder (a sub-1-BB "scrap" like 0.2 BB). That is
  // never a real bet: you can't fold the scrap back, and a sub-BB call has no fold
  // equity. Whenever the chosen size would leave such a remainder, snap it up to the
  // relevant all-in:
  //   • almost the bot's own whole stack       → the bot's own all-in;
  //   • almost a coverable opponent's stack     → that opponent's all-in, when the bot
  //                                               stays meaningfully deep behind it;
  //   • near-equal stacks (|self − opp| < 1 BB) → the bot's own all-in, where the
  //                                               unavoidable chip difference is refunded
  //                                               at settlement rather than left in play.
  // Bets that leave a genuine, playable stack (≥ 1 BB) are untouched, so this never
  // turns a deliberate partial bet into a jam — it only removes dead scraps.
  function snapPostflopBetLeaveBehind(table, seatId, amount) {
    const selfStack = remainingStack(table, seatId);
    let snapped = roundBbValue(Math.min(Math.max(0, Number(amount) || 0), selfStack));
    if (!(snapped > 0) || !(selfStack > 0)) return snapped;
    const strands = (stack) => {
      const behind = roundBbValue(stack - snapped);
      return behind > 0 && behind < MIN_STACK_BEHIND_BB;
    };
    // Clean all-in targets (computed from the original size, so multiway can't cascade).
    const targets = [snapped];
    if (strands(selfStack)) targets.push(selfStack);
    (table.seats || []).forEach((seat) => {
      if (!seat || Number(seat.id) === Number(seatId) || seat.folded) return;
      const oppStack = remainingStack(table, seat.id);
      if (!(oppStack > 0)) return;
      const oppReach = Math.min(selfStack, oppStack); // largest add that puts this opp all-in
      const behind = roundBbValue(oppReach - snapped);
      if (behind > 0 && behind < MIN_STACK_BEHIND_BB) {
        // Put the opponent all-in if the bot stays ≥ 1 BB deep; otherwise (near-equal
        // stacks) take the bot's own all-in and let settlement refund the difference.
        targets.push(roundBbValue(selfStack - oppReach) >= MIN_STACK_BEHIND_BB ? oppReach : selfStack);
      }
    });
    return roundBbValue(Math.max(...targets));
  }

  function postflopBetAmount(table, fraction, options = {}) {
    const seatId = table.activeVillain;
    const max = remainingStack(table, seatId);
    if (!(max > 0)) return 0;
    let amount = clamp(Math.round(table.pot * fraction * 10) / 10, Math.min(1, max), max);
    // C9: a non-polar bet is the computed size (clamped to the stack) WITHOUT rounding a 75-99% bet up
    // to all-in — that silent round-up is the "0.75-pot at SPR<1 quietly becomes a jam" trap. A size
    // that genuinely reaches the stack still goes all-in (a pot-committed hand). Polar spots (river
    // nuts / river air, default options) keep the shove-when-big round-up so a push is taken when it fits.
    if (!options.noAutoShove && amount > max * 0.75) amount = max;
    // Leave-behind floor: regardless of the polar/non-polar size above, never leave a
    // sub-1-BB scrap for the bettor or a caller (see snapPostflopBetLeaveBehind).
    return snapPostflopBetLeaveBehind(table, seatId, amount);
  }

  function countBy(items, key) {
    return items.reduce((acc, item) => {
      acc[item[key]] = (acc[item[key]] || 0) + 1;
      return acc;
    }, {});
  }

  function hasFlushDraw(cards) {
    const suitCounts = countBy(cards.map(parseCardCode), "suit");
    return Object.values(suitCounts).some((count) => count === 4);
  }

  function hasStraightDraw(cards) {
    const parsed = cards.map(parseCardCode);
    const values = [...new Set(parsed.map((card) => card.value === 14 ? [14, 1] : [card.value]).flat())].sort((a, b) => a - b);
    for (let start = 1; start <= 10; start += 1) {
      const run = [start, start + 1, start + 2, start + 3, start + 4];
      const hits = run.filter((value) => values.includes(value)).length;
      if (hits >= 4) return true;
    }
    return false;
  }

  function evaluateBest(cards) {
    const combos = combinations(cards, 5);
    let best = null;
    combos.forEach((combo) => {
      const score = evaluateFive(combo);
      if (!best || compareScores(score, best.score) > 0) {
        best = { score, cards: combo };
      }
    });
    if (!best) {
      // Fewer than 5 cards (e.g. a pre-flop all-in runout stage with an empty
      // board): no ranked 5-card hand exists yet. Return a lowest-possible
      // sentinel so callers that compare scores never dereference null.
      return { score: [-1], cards: Array.isArray(cards) ? cards.slice() : [], name: "" };
    }
    best.name = HAND_NAMES[best.score[0]];
    return best;
  }

  // Three-of-a-kind reads as "сет" only when it comes from a pocket pair (both
  // hole cards are the trip rank); one hole card + a board pair, or board trips,
  // is "трипс". Score[1] is the trip rank value. Non-trips evals pass through.
  function refineTripsHandName(evaluation, holeCards) {
    if (!evaluation || Number(evaluation.score?.[0]) !== 3) return evaluation?.name || "";
    const tripRank = Number(evaluation.score[1]);
    const matches = (Array.isArray(holeCards) ? holeCards : [])
      .filter((card) => RANK_VALUES[String(card)[0]] === tripRank).length;
    return matches >= 2 ? "сет" : "трипс";
  }

  // Precompute the index combinations for the only hot shape: choosing 5 cards
  // from a 5/6/7-card pool (evaluateBest). Built once at load; same lexicographic
  // order as the recursive walk, so the materialized combos — and the winning
  // best.cards reference that feeds the showdown gold-glow — are identical.
  function buildFiveCardIndexCombos() {
    const table = {};
    for (const poolSize of [5, 6, 7]) {
      const combos = [];
      const walk = (start, picked) => {
        if (picked.length === 5) {
          combos.push(picked.slice());
          return;
        }
        for (let index = start; index < poolSize; index += 1) {
          picked.push(index);
          walk(index + 1, picked);
          picked.pop();
        }
      };
      walk(0, []);
      table[poolSize] = combos;
    }
    return table;
  }

  const FIVE_CARD_INDEX_COMBOS = buildFiveCardIndexCombos();

  function combinations(items, size) {
    if (size === 5) {
      const table = FIVE_CARD_INDEX_COMBOS[items.length];
      if (table) {
        const result = new Array(table.length);
        for (let i = 0; i < table.length; i += 1) {
          const idx = table[i];
          result[i] = [items[idx[0]], items[idx[1]], items[idx[2]], items[idx[3]], items[idx[4]]];
        }
        return result;
      }
    }
    const result = [];
    function walk(start, picked) {
      if (picked.length === size) {
        result.push([...picked]);
        return;
      }
      for (let index = start; index < items.length; index += 1) {
        picked.push(items[index]);
        walk(index + 1, picked);
        picked.pop();
      }
    }
    walk(0, []);
    return result;
  }

  function evaluateFive(cards) {
    const parsed = cards.map(parseCardCode).sort((a, b) => b.value - a.value);
    const values = parsed.map((card) => card.value);
    const counts = parsed.reduce((acc, card) => {
      acc[card.value] = (acc[card.value] || 0) + 1;
      return acc;
    }, {});
    const groups = Object.entries(counts)
      .map(([value, count]) => ({ value: Number(value), count }))
      .sort((a, b) => b.count - a.count || b.value - a.value);
    const flush = parsed.every((card) => card.suit === parsed[0].suit);
    const straightHigh = getStraightHigh(values);

    if (flush && straightHigh) return [8, straightHigh];
    if (groups[0].count === 4) return [7, groups[0].value, groups[1].value];
    if (groups[0].count === 3 && groups[1].count === 2) return [6, groups[0].value, groups[1].value];
    if (flush) return [5, ...values];
    if (straightHigh) return [4, straightHigh];
    if (groups[0].count === 3) {
      return [3, groups[0].value, ...groups.slice(1).map((group) => group.value).sort((a, b) => b - a)];
    }
    if (groups[0].count === 2 && groups[1].count === 2) {
      const pairs = groups.filter((group) => group.count === 2).map((group) => group.value).sort((a, b) => b - a);
      const kicker = groups.find((group) => group.count === 1).value;
      return [2, ...pairs, kicker];
    }
    if (groups[0].count === 2) {
      return [1, groups[0].value, ...groups.slice(1).map((group) => group.value).sort((a, b) => b - a)];
    }
    return [0, ...values];
  }

  function getStraightHigh(values) {
    const unique = [...new Set(values.includes(14) ? [...values, 1] : values)].sort((a, b) => b - a);
    for (let index = 0; index <= unique.length - 5; index += 1) {
      const windowValues = unique.slice(index, index + 5);
      if (windowValues[0] - windowValues[4] === 4) return windowValues[0];
    }
    return 0;
  }

  function compareScores(first, second) {
    // A hand category (score[0]) maps to exactly one score length, so two scores
    // of the same category share a length, and scores of different categories
    // differ at index 0. Scanning only the common prefix and breaking remaining
    // ties by length is therefore byte-identical to the old max-length + ||0 scan.
    const length = Math.min(first.length, second.length);
    for (let index = 0; index < length; index += 1) {
      const diff = first[index] - second[index];
      if (diff !== 0) return diff;
    }
    return first.length - second.length;
  }


var __pokerSimulatorEngineParts = (typeof window !== "undefined" ? window : globalThis).PokerSimulatorEngineParts
  || ((typeof window !== "undefined" ? window : globalThis).PokerSimulatorEngineParts = {});
Object.assign(__pokerSimulatorEngineParts, {
  initializePostflopSpot,
  boardCardsForSpot,
  streetBoardCount,
  inferSpotInitiativeSeatId,
  rememberClosedStreet,
  coldCallVsThreeBetDecision,
  preHeroContinueDecision,
  styleAdjustedFrequency,
  elasticitySlopeScale,
  openDefenseElasticity,
  threeBetDefenseElasticity,
  botDefenseFrequencyAdjustment,
  singleRaiseDefenseFrequency,
  isPocketPairCombo,
  comboLowValue,
  isPremiumPreflopCombo,
  isMarginalPreflopCombo,
  isSmallBlindStealTail,
  isSuitedCombo,
  preflopRankShape,
  isLoosePreflopCandidate,
  isVeryWeakPreflopCombo,
  isMarginalBotDecision,
  chartContains,
  comboMatchesPattern,
  botPostflopIntent,
  applyBoardTexturePlan,
  applyBlindVsBlindLimpPotPlan,
  cBetAirFrequency,
  rangeAdvantageForBot,
  rangePositionGroup,
  botHasStreetInitiative,
  isOpponentCBetSpot,
  isBlindVsBlindLimpPot,
  isOpponentDonkSpot,
  isOpponentProbeSpot,
  postflopLabSpot,
  donkBetIntent,
  riverBustedDrawInfo,
  postflopProfileBaseline,
  profileScaledFrequency,
  drawBarrelProfileKey,
  turnRiverBarrelIntent,
  flushDrawNutFactor,
  drawImpliedOddsAdjust,
  allInDrawDirectPriceGate,
  knownShowdownEquity,
  knownShowdownParticipants,
  postflopContinueThresholds,
  botCallVsBet,
  postflopCallPressureAdjustments,
  postflopPressureStyleScale,
  postflopStreetStartedMultiway,
  turnCrumbCallCommitSpot,
  finalizeTurnCrumbCallDecision,
  finalizePostflopRaiseDecision,
  isEffectiveNutHand,
  postflopRaiseOverBetPlan,
  effectivePostflopRaiseCap,
  gradeHeroDecision,
  gradePreflopHeroDecision,
  gradePostflopHeroDecision,
  gradeBlindVsBlindLimpPotDecision,
  isAggressiveAction,
  feedback,
  feedbackScore,
  feedbackCategory,
  assessCards,
  assessPostflopHand,
  assessBoardTexture,
  boardConnectedness,
  postflopProfile,
  applyBotStrategyPostflopProfile,
  applyPostflopStyle,
  postflopBetAmount,
  countBy,
  hasFlushDraw,
  hasStraightDraw,
  evaluateBest,
  refineTripsHandName,
  combinations,
  evaluateFive,
  getStraightHigh,
  compareScores
});
