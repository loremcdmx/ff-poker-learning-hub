/*
 * Stat-driven preflop range realizer.
 *
 * Turns a recognizable poker "stat line" (per-position open%/vpip, 3bet split,
 * BB defend ranges, SB raise/limp split, shape coefficients) into concrete
 * hand ranges in the exact format the simulator engine consumes
 * (`comboMatchesPattern` in engine-postflop-policy.js — explicit class tokens
 * like "AKs"/"T9o"/"KK" match via its `pattern === combo` branch).
 *
 * This is an OFFLINE / build-time module: it precomputes a `realizedRanges`
 * map that gets attached to a bot's strategyModel; the engine then just reads
 * the precomputed lists. Nothing here runs in the per-decision hot path.
 *
 * Design (see docs/arena-bot-architecture-diagnosis-2026-06-27.md):
 * - Base ordering = the coach's OWN canon scoring (`openScore` from
 *   assets/poker-open-first/data.js), generalized into searchable coefficients.
 *   NOT all-in equity (which misranks suited connectors / offsuit broadways).
 * - Frequency ranges (RFI, 3bet) = top-X% by that score, with an optional
 *   deterministic boundary band for mixing (e.g. SB raise-50%-of-100%).
 * - Token ranges (BB defense, SB iso) = expand the canon's own token grammar
 *   ("JJ-22", "ATs-A2s", "T3o+", "K9o-K2o") into explicit combos.
 *
 * Pure functions only; no engine or DOM dependency.
 */
(function () {
  "use strict";

  const RANK_ORDER = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"]; // high -> low
  const RANK_VALUE = Object.fromEntries(RANK_ORDER.map((r, i) => [r, 14 - i])); // A=14 ... 2=2
  const RANK_INDEX = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i])); // A=0 ... 2=12

  // The 169 canonical hand classes, with combo counts (pairs 6, suited 4, offsuit 12).
  function buildHandClasses() {
    const list = [];
    for (let i = 0; i < 13; i += 1) {
      for (let j = 0; j < 13; j += 1) {
        const hi = RANK_ORDER[i];
        const lo = RANK_ORDER[j];
        if (i === j) list.push({ key: hi + lo, combos: 6, pair: true, suited: false });
        else if (i < j) list.push({ key: hi + lo + "s", combos: 4, pair: false, suited: true });
        else list.push({ key: lo + hi + "o", combos: 12, pair: false, suited: false });
      }
    }
    const seen = new Set();
    return list.filter((h) => (seen.has(h.key) ? false : seen.add(h.key)));
  }
  const HAND_CLASSES = buildHandClasses();
  const HAND_BY_KEY = new Map(HAND_CLASSES.map((h) => [h.key, h]));
  const TOTAL_COMBOS = 1326;

  function comboCount(key) {
    const h = HAND_BY_KEY.get(key);
    return h ? h.combos : 0;
  }

  // hand "info" mirroring assets/poker-open-first/data.js:handInfo
  function handInfo(key) {
    const first = key[0];
    const second = key[1];
    const pair = first === second;
    const suited = key.endsWith("s");
    const high = Math.max(RANK_VALUE[first], RANK_VALUE[second]);
    const low = Math.min(RANK_VALUE[first], RANK_VALUE[second]);
    const gap = pair ? 0 : high - low - 1;
    return { pair, suited, high, low, gap, first, second };
  }

  // ---- token grammar expander -------------------------------------------
  // Accepts every form the canon uses and yields a Set of canonical class keys:
  //   pair single "KK"; pair range "JJ-22"/"AA-22"
  //   concrete "AKs"/"T9o"
  //   kicker-up "A2s+"/"K2o+"/"T3o+"   (high pinned, low rolls up to high-1)
  //   kicker range "ATs-A2s"/"K9o-K2o"/"T3o-T6o" (high pinned, low spans both endpoints)
  //   pair-up "22+"
  function normalizeConcrete(a, b, suitedness) {
    // return canonical class key for two distinct ranks + suitedness ("s"/"o")
    const hi = RANK_VALUE[a] >= RANK_VALUE[b] ? a : b;
    const lo = RANK_VALUE[a] >= RANK_VALUE[b] ? b : a;
    return hi + lo + suitedness;
  }
  function expandToken(token, out) {
    const t = String(token).trim();
    if (!t) return;
    // pair range "JJ-22"
    let m = t.match(/^([AKQJT2-9])\1-([AKQJT2-9])\2$/);
    if (m) {
      const a = RANK_INDEX[m[1]], b = RANK_INDEX[m[2]];
      const lo = Math.min(a, b), hi = Math.max(a, b);
      for (let i = lo; i <= hi; i += 1) out.add(RANK_ORDER[i] + RANK_ORDER[i]);
      return;
    }
    // pair-up "22+"
    m = t.match(/^([AKQJT2-9])\1\+$/);
    if (m) {
      const start = RANK_INDEX[m[1]];
      for (let i = start; i >= 0; i -= 1) out.add(RANK_ORDER[i] + RANK_ORDER[i]);
      return;
    }
    // pair single "KK"
    m = t.match(/^([AKQJT2-9])\1$/);
    if (m) { out.add(m[1] + m[1]); return; }
    // kicker range "ATs-A2s" / "K9o-K2o" / "T3o-T6o" — both kickers must be strictly
    // lower rank than the pinned high card (so "KKs-K2s" is malformed -> throws).
    m = t.match(/^([AKQJT2-9])([AKQJT2-9])([so])-([AKQJT2-9])([AKQJT2-9])([so])$/);
    if (m && m[1] === m[4] && m[3] === m[6]
        && RANK_INDEX[m[2]] > RANK_INDEX[m[1]] && RANK_INDEX[m[5]] > RANK_INDEX[m[1]]) {
      const high = m[1], suit = m[3];
      const lo = Math.min(RANK_INDEX[m[2]], RANK_INDEX[m[5]]);
      const hi = Math.max(RANK_INDEX[m[2]], RANK_INDEX[m[5]]);
      for (let i = lo; i <= hi; i += 1) out.add(normalizeConcrete(high, RANK_ORDER[i], suit));
      return;
    }
    // kicker-up "A2s+" / "K2o+" / "T3o+" — kicker must be strictly lower than high
    // (so "AAs+" is malformed -> throws).
    m = t.match(/^([AKQJT2-9])([AKQJT2-9])([so])\+$/);
    if (m && RANK_INDEX[m[2]] > RANK_INDEX[m[1]]) {
      const high = m[1], suit = m[3];
      const highIdx = RANK_INDEX[high];
      for (let i = RANK_INDEX[m[2]]; i > highIdx; i -= 1) out.add(normalizeConcrete(high, RANK_ORDER[i], suit));
      return;
    }
    // concrete "AKs" / "T9o" — ranks must differ (a pair is "KK", never "KKs"/"KKo").
    m = t.match(/^([AKQJT2-9])([AKQJT2-9])([so])$/);
    if (m && m[1] !== m[2]) { out.add(normalizeConcrete(m[1], m[2], m[3])); return; }
    throw new Error("bot-range-realizer: unparseable range token: " + JSON.stringify(token));
  }
  function expandTokens(tokens) {
    const out = new Set();
    (Array.isArray(tokens) ? tokens : []).forEach((tok) => expandToken(tok, out));
    return out;
  }

  // combo% of a set/array of class keys (of the full 1326-combo space)
  function rangePct(keys) {
    const set = keys instanceof Set ? keys : new Set(keys);
    let combos = 0;
    set.forEach((k) => { combos += comboCount(k); });
    return (combos / TOTAL_COMBOS) * 100;
  }

  // ---- base ordering: generalized openScore ------------------------------
  // groupKey one of "early"|"middle"|"co"|"btn"|"sb". `shape` overrides the
  // hard-coded coefficients from assets/poker-open-first/data.js:openScore.
  const DEFAULT_SHAPE = {
    suitedBonus: 16,            // info.suited ? +16 : -5  (we keep the -5 offsuit baseline)
    offsuitBaseline: -5,
    aceSuitedBonus: 16,        // first === "A" suited
    aceOffsuitBonus: 8,        // first === "A" offsuit
    kingSuitedBonus: 10,
    kingOffsuitBonus: 4,
    broadwayBonus: 9,          // high>=J && low>=T
    connectorBonus: 10,        // gap0 (+10), gap1 (+6), gap2 (+2), else -gap*1.8
    gap1Bonus: 6,
    gap2Bonus: 2,
    gapPenaltyPerStep: 1.8,
    lowOffsuitPenalty: 12,     // !suited && low<=8 : -12
    pairBase: 86,
    pairCurve: 4.6,
    // per-group overrides (mirror openScore:147-150)
    earlyLowOffsuitPenalty: 14,   // early && low<=9 && !pair
    middleLowOffsuitPenalty: 8,   // middle && low<=7 && !suited && !pair
    sbSuitedWheelBonus: 8,        // sb && suited && low<=8
    btnSuitedHighBonus: 5         // btn && (suited || high>=Q)
  };
  function scoreClass(key, groupKey, shapeOverride) {
    const s = shapeOverride ? Object.assign({}, DEFAULT_SHAPE, shapeOverride) : DEFAULT_SHAPE;
    const info = handInfo(key);
    let score;
    if (info.pair) {
      score = s.pairBase + info.high * s.pairCurve;
    } else {
      score = info.high * 6 + info.low * 2.1;
      score += info.suited ? s.suitedBonus : s.offsuitBaseline;
      if (info.first === "A") score += info.suited ? s.aceSuitedBonus : s.aceOffsuitBonus;
      if (info.first === "K") score += info.suited ? s.kingSuitedBonus : s.kingOffsuitBonus;
      if (info.high >= RANK_VALUE.J && info.low >= RANK_VALUE.T) score += s.broadwayBonus;
      if (info.gap === 0) score += s.connectorBonus;
      else if (info.gap === 1) score += s.gap1Bonus;
      else if (info.gap === 2) score += s.gap2Bonus;
      else score -= info.gap * s.gapPenaltyPerStep;
      if (!info.suited && info.low <= RANK_VALUE["8"]) score -= s.lowOffsuitPenalty;
    }
    if (groupKey === "early" && info.low <= RANK_VALUE["9"] && !info.pair) score -= s.earlyLowOffsuitPenalty;
    if (groupKey === "middle" && info.low <= RANK_VALUE["7"] && !info.suited && !info.pair) score -= s.middleLowOffsuitPenalty;
    if (groupKey === "sb" && info.suited && info.low <= RANK_VALUE["8"]) score += s.sbSuitedWheelBonus;
    if (groupKey === "btn" && (info.suited || info.high >= RANK_VALUE.Q)) score += s.btnSuitedHighBonus;
    return score;
  }

  // Stable score-descending ordering of all 169 classes for a group.
  function rankedClasses(groupKey, shapeOverride) {
    return HAND_CLASSES
      .map((h) => ({ key: h.key, combos: h.combos, score: scoreClass(h.key, groupKey, shapeOverride) }))
      .sort((a, b) => (b.score - a.score) || a.key.localeCompare(b.key));
  }

  // ---- frequency realization (RFI, 3bet, etc.) ---------------------------
  // Pick top classes by score until cumulative combo% reaches targetPct.
  // `mixBandPct`: combos within the band straddling the cut are included only
  // up to the exact target (deterministic boundary fill by score order), so the
  // realized % lands close to target rather than overshooting on a coarse class.
  // `mustInclude`: class keys forced in (e.g. premiums), counted toward target.
  function realizeFrequencyRange(targetPct, groupKey, options) {
    const opts = options || {};
    const shape = opts.shape;
    const target = Math.max(0, Math.min(100, Number(targetPct) || 0));
    const targetCombos = (target / 100) * TOTAL_COMBOS;
    const ranked = rankedClasses(groupKey, shape);
    const forced = new Set(opts.mustInclude || []);
    const chosen = new Set();
    let combos = 0;
    // forced first
    ranked.forEach((h) => { if (forced.has(h.key)) { chosen.add(h.key); combos += h.combos; } });
    // then by score until we reach (but do not exceed) the target combo budget.
    for (const h of ranked) {
      if (chosen.has(h.key)) continue;
      if (combos >= targetCombos) break;
      // include if it fits, OR if including it lands closer to target than stopping.
      const over = combos + h.combos;
      if (over <= targetCombos + 1e-9) { chosen.add(h.key); combos = over; continue; }
      // boundary class: include only if it brings us closer to target than leaving it out
      const distIn = Math.abs(over - targetCombos);
      const distOut = Math.abs(combos - targetCombos);
      if (distIn < distOut) { chosen.add(h.key); combos = over; }
      break;
    }
    return Array.from(chosen);
  }

  // Realize a frequency range AND its strict subset for a split action.
  // e.g. SB: VPIP=100 (whole entry range), raiseSplit=50 -> the strongest 50%
  // of the entry range raises, the rest limps.
  function realizeSplit(vpipPct, raiseSplitPct, groupKey, options) {
    const entry = realizeFrequencyRange(vpipPct, groupKey, options); // class keys
    const raisePct = (Math.max(0, Math.min(100, raiseSplitPct)) / 100) * vpipPct;
    const raise = realizeFrequencyRange(raisePct, groupKey, options);
    const raiseSet = new Set(raise);
    const limp = entry.filter((k) => !raiseSet.has(k));
    return { entry, raise, limp };
  }

  // ---- full stat-line realization ----------------------------------------
  // Turn a compact stat line into a `realizedRanges` map the engine consumes:
  //   { open:{POS:[...]}, defense:{BB:{OPENER:[...],"*":[...]}}, threeBet:{BB:{...}} }
  // A position-keyed RFI, an SB raise/limp split, and BB defense as freq targets
  // (3bet = strongest top slice, flat call = next slice) per opener bucket.
  const RFI_POSITIONS = ["UTG", "HJ", "CO", "BTN"];
  const RFI_GROUP = { UTG: "early", "UTG+1": "early", LJ: "middle", MP: "middle", HJ: "middle", CO: "co", BTN: "btn", SB: "sb" };
  const OPENER_BUCKETS = { UTG: "early", "UTG+1": "early", LJ: "middle", MP: "middle", HJ: "middle", CO: "co", BTN: "btn", SB: "btn" };
  const STATLINE_PREMIUMS = ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AQs", "AJs", "KQs", "AKo"];
  function realizeStatLine(statLine) {
    const sl = statLine || {};
    const shape = sl.shape || undefined;
    const rfi = sl.rfi || {};
    const open = {};
    RFI_POSITIONS.forEach((pos) => {
      const pct = Number(rfi[pos]);
      if (Number.isFinite(pct)) open[pos] = realizeFrequencyRange(pct, RFI_GROUP[pos], { shape, mustInclude: STATLINE_PREMIUMS });
    });
    if (Number.isFinite(Number(rfi.SB))) {
      const split = realizeSplit(100, Number(rfi.SB), "sb", { shape, mustInclude: STATLINE_PREMIUMS });
      open.SB = split.raise;
    }
    // BB defense: 3bet = strongest top (bb3bet%), flat call = next slice up to bbDefend%.
    const defend = sl.bbDefend || {};
    const threeB = sl.bb3bet || {};
    const defenseBB = {}, threeBetBB = {};
    Object.entries(OPENER_BUCKETS).forEach(([opener, bucket]) => {
      const defPct = Number(defend[bucket]);
      const tbPct = Number(threeB[bucket]);
      if (!Number.isFinite(defPct)) return;
      // BB defense ordered by general playability ("btn" coefficients: suited/high bonus).
      if (Number.isFinite(tbPct) && tbPct > 0) {
        const threeSet = realizeFrequencyRange(tbPct, "btn", { shape, mustInclude: ["AA", "KK", "QQ", "AKs", "AKo"] });
        threeBetBB[opener] = threeSet;
        const wholeSet = new Set(realizeFrequencyRange(defPct, "btn", { shape }));
        threeSet.forEach((k) => wholeSet.delete(k)); // flat call = defend range minus the 3bet hands
        defenseBB[opener] = Array.from(wholeSet);
      } else {
        defenseBB[opener] = realizeFrequencyRange(defPct, "btn", { shape });
      }
    });
    if (!defenseBB["*"] && defenseBB.BTN) defenseBB["*"] = defenseBB.BTN;
    if (!threeBetBB["*"] && threeBetBB.BTN) threeBetBB["*"] = threeBetBB.BTN;
    const out = {};
    if (Object.keys(open).length) out.open = open;
    if (Object.keys(defenseBB).length) out.defense = { BB: defenseBB };
    if (Object.keys(threeBetBB).length) out.threeBet = { BB: threeBetBB };
    return out;
  }

  // ---- token-range realization (BB defense / SB iso) ---------------------
  // Expand canon token list, optionally apply coverage add/remove, return
  // explicit class keys.
  function realizeTokenRange(tokens, coverage) {
    const set = expandTokens(tokens);
    if (coverage) {
      if (coverage.add) expandTokens(coverage.add).forEach((k) => set.add(k));
      if (coverage.remove) expandTokens(coverage.remove).forEach((k) => set.delete(k));
    }
    return Array.from(set);
  }

  const realizer = {
    schema: "poker-simulator-bot-range-realizer-v1",
    version: "2026-06-28",
    RANK_ORDER,
    RANK_VALUE,
    HAND_CLASSES,
    TOTAL_COMBOS,
    DEFAULT_SHAPE,
    comboCount,
    handInfo,
    expandToken,
    expandTokens,
    rangePct,
    scoreClass,
    rankedClasses,
    realizeFrequencyRange,
    realizeSplit,
    realizeTokenRange,
    realizeStatLine
  };

  const root = typeof window !== "undefined" ? window : globalThis;
  root.PokerSimulatorBotRangeRealizer = realizer;
  if (typeof module !== "undefined" && module.exports) module.exports = realizer;
})();
