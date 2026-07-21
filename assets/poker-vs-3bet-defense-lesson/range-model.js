(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const schemaVersion = 1;
  const ranks = Object.freeze(["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"]);
  const positions = Object.freeze(["EP", "MP", "HJ", "CO", "BTN", "SB"]);
  const relations = Object.freeze(["IP", "OOP"]);
  const sizes = Object.freeze([2.5, 3, 4]);
  const actions = Object.freeze(["fold", "call", "fourbet", "jam"]);

  const stacks = deepFreeze([
    { key: "20-30", label: "20–30 BB", sampleBb: 25 },
    { key: "31-50", label: "31–50 BB", sampleBb: 40 },
    { key: "51-80", label: "51–80 BB", sampleBb: 60 },
    { key: "80+", label: "80+ BB", sampleBb: 90 }
  ]);

  const cohorts = deepFreeze([
    {
      key: "reference",
      label: "Методичка",
      subtitle: "точная базовая матрица",
      fieldActions: null,
      provenance: "Точные клетки страниц 7 и 12; не solver-чарт."
    },
    {
      key: "league1",
      label: "League 1",
      subtitle: "R1–5",
      fieldActions: { fold: 53.82, call: 29.88, fourbet: 16.3, jam: 0 },
      provenance: "Учебная hand-level адаптация, направленная агрегатами поля League 1."
    },
    {
      key: "league2",
      label: "League 2",
      subtitle: "R6–10",
      fieldActions: { fold: 56.18, call: 29, fourbet: 14.82, jam: 0 },
      provenance: "Учебная hand-level адаптация, направленная агрегатами поля League 2."
    },
    {
      key: "league3",
      label: "League 3",
      subtitle: "R11–14",
      fieldActions: { fold: 59.96, call: 28.49, fourbet: 11.55, jam: 0 },
      provenance: "Учебная hand-level адаптация, направленная агрегатами поля League 3."
    },
    {
      key: "novice",
      label: "Новички",
      subtitle: "R15–18 · расширено для редких спотов",
      fieldActions: { fold: 59.39, call: 30.14, fourbet: 10.47, jam: 0 },
      provenance: "Когорта новичков R15–18; hand-level клетки являются учебной адаптацией."
    }
  ]);

  const SOURCE = deepFreeze({
    status: "local-source-backed",
    sourceLabel: "Методичка FF · RFI vs 3-bet",
    sourceFile: "часть методички для аишки (1).pdf",
    transcript: "assets/poker-vs-3bet-defense-lesson/research/methodics-ranges.md",
    pages: {
      positions: 7,
      sbVsBb: 12,
      sizingExample: 15
    },
    boundary: "Точные клетки описывают vs3bet all. Полной исходной сетки по IP/OOP, стеку и сайзу нет.",
    solverStatus: "Это учебная методичка, а не solver-output."
  });

  const hands = Object.freeze(ranks.flatMap((rowRank, rowIndex) => (
    ranks.map((columnRank, columnIndex) => {
      if (rowIndex === columnIndex) return `${rowRank}${columnRank}`;
      if (rowIndex < columnIndex) return `${rowRank}${columnRank}s`;
      return `${columnRank}${rowRank}o`;
    })
  )));
  const handSet = new Set(hands);

  const h = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const suitedRange = (high, from, through) => {
    const start = ranks.indexOf(from);
    const end = ranks.indexOf(through);
    if (start < 0 || end < 0 || start > end) throw new Error(`Invalid suited range ${high}${from}-${through}`);
    return ranks.slice(start, end + 1).map((kicker) => `${high}${kicker}s`);
  };

  const EXACT_SPECS = {
    EP: {
      summaryTarget: { fold: 70, call: 17, fourbet: 13, jam: 0 },
      fourbet: [[100, h("AA KK QQ AKs AKo")]],
      call: [
        [100, h("AQs AJs ATs KQs KJs JJ TT")],
        [50, h("KTs 99 88 87s 77 76s 66 65s 55 44")],
        [10, [...suitedRange("A", "9", "2"), ...h("QJs QTs JTs")]]
      ]
    },
    MP: {
      summaryTarget: { fold: 65, call: 24, fourbet: 11, jam: 0 },
      fourbet: [[100, h("AA KK QQ AKs AKo")], [50, h("JJ")]],
      call: [
        [100, h("AQs AJs ATs KQs KJs TT 99")],
        [75, h("87s 76s 65s")],
        [70, h("88 77 66 55 44")],
        [50, h("JJ KTs")],
        [38, h("54s")],
        [35, h("QJs QTs JTs")],
        [30, h("T9s 98s")],
        [25, h("AQo")],
        [15, suitedRange("A", "9", "2")],
        [10, h("33 22")]
      ]
    },
    HJ: {
      summaryTarget: { fold: 55, call: 33, fourbet: 12, jam: 0 },
      fourbet: [[100, h("AA KK QQ JJ AKs AKo AQo")]],
      call: [
        [100, h("AQs AJs ATs KQs KJs KTs QJs QTs JTs TT T9s 99 98s 88 87s 76s 66 65s 55 54s 44 33 22")],
        [99, h("77")],
        [50, [...suitedRange("A", "9", "2"), ...h("K9s Q9s J9s")]]
      ]
    },
    CO: {
      summaryTarget: { fold: 55, call: 36, fourbet: 9, jam: 0 },
      fourbet: [[100, h("AA KK QQ JJ AKs AKo AQo")]],
      call: [
        [100, [
          ...suitedRange("A", "Q", "2"),
          ...suitedRange("K", "Q", "8"),
          ...suitedRange("Q", "J", "9"),
          ...h("JTs J9s TT T9s 99 98s 88 77 66 55 44 33 22")
        ]],
        [90, h("87s 76s 65s 54s")],
        [50, h("K7s KQo Q8s AJo J8s T8s 97s 86s")],
        [1, h("K6s")]
      ]
    },
    BTN: {
      summaryTarget: { fold: 70, call: 23, fourbet: 7, jam: 0 },
      fourbet: [[100, h("AA KK QQ JJ TT 99 AKs AQs AKo AQo")]],
      call: [
        [100, [
          ...suitedRange("A", "J", "2"),
          ...suitedRange("K", "Q", "7"),
          ...suitedRange("Q", "J", "8"),
          ...h("KQo AJo KJo JTs J9s J8s ATo T9s T8s 98s 97s 88 87s 86s 77 76s 66 65s 55 54s 44 33 22")
        ]],
        [51, h("K6s")],
        [50, h("Q7s J7s T7s")]
      ]
    },
    SB: {
      summaryTarget: { fold: 65, call: 27, fourbet: 8, jam: 0 },
      fourbet: [[100, h("AA KK QQ JJ TT 99 AKs AQs AKo")]],
      call: [
        [100, h("AJs ATs A9s KQs KJs KTs AQo KQo QJs QTs AJo JTs ATo 88 77 66 55 44")],
        [50, [...suitedRange("A", "8", "2"), ...h("K9s Q9s KJo QJo J9s T9s 98s")]]
      ]
    }
  };

  const RELATION_TRANSFERS = deepFreeze({
    IP: {
      label: "в позиции",
      sourceStatus: "heuristic",
      rationale: "IP сохраняет больше реализационного колла.",
      transfers: [
        { from: "fold", to: "call", share: 0.08, eligibility: "call-frontier" },
        { from: "fourbet", to: "call", share: 0.05 }
      ]
    },
    OOP: {
      label: "без позиции",
      sourceStatus: "heuristic",
      rationale: "OOP сокращает пограничный колл и немного поляризует 4-бет.",
      transfers: [
        { from: "call", to: "fold", share: 0.12 },
        { from: "call", to: "fourbet", share: 0.06 }
      ]
    }
  });

  const SIZE_TRANSFERS = deepFreeze({
    2.5: {
      sourceStatus: "heuristic-guided-by-page-15",
      rationale: "После опена 2 BB малый 3-бет до 5 BB даёт хорошую цену пограничному продолжению.",
      transfers: [
        { from: "fold", to: "call", share: 0.72, eligibility: "call-frontier" },
        { from: "fourbet", to: "call", share: 0.06 }
      ]
    },
    3: {
      sourceStatus: "heuristic-guided-by-price",
      rationale: "После опена 2 BB 3-бет до 6 BB всё ещё оставляет выгодную цену многим suited-рукам в позиции.",
      transfers: [
        { from: "fold", to: "call", share: 0.60, eligibility: "call-frontier" }
      ]
    },
    4: {
      sourceStatus: "heuristic-guided-by-page-15",
      rationale: "Крупный 3-бет сокращает call и переводит часть продолжения в 4-бет.",
      transfers: [
        { from: "fold", to: "call", share: 0.36, eligibility: "call-frontier" },
        { from: "call", to: "fold", share: 0.25 },
        { from: "call", to: "fourbet", share: 0.18 },
        { from: "fold", to: "fourbet", share: 0.03, eligibility: "fourbet-frontier" }
      ]
    }
  });

  const STACK_TRANSFERS = deepFreeze({
    "20-30": {
      sourceStatus: "heuristic",
      rationale: "При 20–30 BB часть обычных 4-бетов становится 4-бет-пушем, а пограничный call сжимается.",
      transfers: [
        { from: "call", to: "fold", share: 0.12 },
        { from: "fourbet", to: "jam", share: 0.72 }
      ]
    },
    "31-50": {
      sourceStatus: "heuristic",
      rationale: "При 31–50 BB сохраняется небольшой jam-компонент и чуть меньше пограничных коллов.",
      transfers: [
        { from: "call", to: "fold", share: 0.04 },
        { from: "fourbet", to: "jam", share: 0.28 }
      ]
    },
    "51-80": {
      sourceStatus: "heuristic-neutral",
      rationale: "51–80 BB — нейтральная учебная глубина.",
      transfers: []
    },
    "80+": {
      sourceStatus: "heuristic",
      rationale: "Глубокий стек сохраняет немного больше коллов и уменьшает долю немедленного 4-бета.",
      transfers: [
        { from: "fold", to: "call", share: 0.05, eligibility: "call-frontier" },
        { from: "fourbet", to: "call", share: 0.05 }
      ]
    }
  });

  const COHORT_TRANSFERS = deepFreeze({
    reference: {
      sourceStatus: "exact-reference",
      rationale: "Без полевой hand-level адаптации.",
      transfers: []
    },
    league1: {
      sourceStatus: "heuristic-calibrated-to-field-aggregate",
      rationale: "League 1 реже сдаёт опен и чаще находит 4-бет.",
      transfers: [
        { from: "fold", to: "fourbet", share: 0.05, eligibility: "fourbet-frontier" },
        { from: "fold", to: "call", share: 0.015, eligibility: "call-frontier" }
      ]
    },
    league2: {
      sourceStatus: "heuristic-calibrated-to-field-aggregate",
      rationale: "League 2 — умеренное смещение к дополнительному 4-бету.",
      transfers: [
        { from: "fold", to: "fourbet", share: 0.03, eligibility: "fourbet-frontier" },
        { from: "jam", to: "fourbet", share: 0.02 }
      ]
    },
    league3: {
      sourceStatus: "heuristic-calibrated-to-field-aggregate",
      rationale: "League 3 чаще оверфолдит и недобирает агрессивное продолжение.",
      transfers: [
        { from: "call", to: "fold", share: 0.025, eligibility: "marginal-call" },
        { from: "fourbet", to: "call", share: 0.08 },
        { from: "jam", to: "fourbet", share: 0.04 },
        { from: "jam", to: "call", share: 0.03 }
      ]
    },
    novice: {
      sourceStatus: "heuristic-calibrated-to-field-proxy",
      rationale: "Прокси новичков чаще недозащищает и пропускает 4-бет/пуш.",
      transfers: [
        { from: "call", to: "fold", share: 0.085, eligibility: "marginal-call" },
        { from: "fourbet", to: "call", share: 0.18 },
        { from: "jam", to: "call", share: 0.16 },
        { from: "fold", to: "call", share: 0.05, eligibility: "pretty-hand-bias" }
      ]
    }
  });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.getOwnPropertyNames(value).forEach((key) => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function cloneCell(cell) {
    return {
      fold: Number(cell.fold || 0),
      call: Number(cell.call || 0),
      fourbet: Number(cell.fourbet || 0),
      jam: Number(cell.jam || 0)
    };
  }

  function normalizeCell(cell) {
    const raw = actions.map((action) => Math.max(0, Number(cell[action]) || 0));
    const total = raw.reduce((sum, value) => sum + value, 0);
    if (!total) return { fold: 100, call: 0, fourbet: 0, jam: 0 };
    const exactBasisPoints = raw.map((value) => (value / total) * 10000);
    const basisPoints = exactBasisPoints.map(Math.floor);
    let remainder = 10000 - basisPoints.reduce((sum, value) => sum + value, 0);
    const remainderOrder = exactBasisPoints
      .map((value, index) => ({ index, fraction: value - basisPoints[index] }))
      .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
    for (let index = 0; index < remainder; index += 1) {
      basisPoints[remainderOrder[index % remainderOrder.length].index] += 1;
    }
    return actions.reduce((result, action, index) => {
      result[action] = basisPoints[index] / 100;
      return result;
    }, {});
  }

  function parseHand(hand) {
    const value = String(hand || "");
    const pair = value.length === 2;
    const high = value[0];
    const low = value[1];
    return {
      hand: value,
      high,
      low,
      highIndex: ranks.indexOf(high),
      lowIndex: ranks.indexOf(low),
      pair,
      suited: value.endsWith("s"),
      offsuit: value.endsWith("o")
    };
  }

  function eligibleForCallExpansion(hand) {
    const parsed = parseHand(hand);
    if (parsed.pair) return true;
    if (parsed.offsuit) return parsed.highIndex <= 3 && parsed.lowIndex <= 4;
    if (!parsed.suited) return false;
    if (parsed.high === "A") return true;
    if (parsed.high === "K") return parsed.lowIndex <= ranks.indexOf("6");
    if (parsed.high === "Q") return parsed.lowIndex <= ranks.indexOf("7");
    if (parsed.high === "J" || parsed.high === "T") return parsed.lowIndex <= ranks.indexOf("7");
    return parsed.highIndex <= ranks.indexOf("9") && Math.abs(parsed.lowIndex - parsed.highIndex) <= 2;
  }

  function eligibleForFourbetExpansion(hand) {
    const parsed = parseHand(hand);
    if (parsed.pair) return parsed.highIndex <= ranks.indexOf("T");
    if (parsed.high === "A") return parsed.suited || parsed.lowIndex <= ranks.indexOf("Q");
    return ["KQs", "KJs", "KTs", "QJs"].includes(parsed.hand);
  }

  const MARGINAL_CALL_PROTECTED = new Set(["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo", "AQs", "AJs", "KQs"]);
  const PRETTY_HAND_BIAS = new Set(["Q6s", "J6s", "T6s", "96s", "85s", "75s", "64s"]);

  function eligibleForMarginalCallReduction(hand) {
    return !MARGINAL_CALL_PROTECTED.has(hand);
  }

  function eligibleForPrettyHandBias(hand) {
    return PRETTY_HAND_BIAS.has(hand);
  }

  function transferEligible(hand, eligibility) {
    if (!eligibility) return true;
    if (eligibility === "call-frontier") return eligibleForCallExpansion(hand);
    if (eligibility === "fourbet-frontier") return eligibleForFourbetExpansion(hand);
    if (eligibility === "marginal-call") return eligibleForMarginalCallReduction(hand);
    if (eligibility === "pretty-hand-bias") return eligibleForPrettyHandBias(hand);
    return false;
  }

  function applyTransfers(cell, transfers, hand) {
    transfers.forEach((transfer) => {
      if (!transferEligible(hand, transfer.eligibility)) return;
      const from = transfer.from;
      const to = transfer.to;
      const share = Math.min(1, Math.max(0, Number(transfer.share) || 0));
      const amount = cell[from] * share;
      cell[from] -= amount;
      cell[to] += amount;
    });
    return cell;
  }

  const NEVER_FOLD = new Set(["AA", "KK", "QQ", "AKs", "AKo"]);

  function enforcePremiumDefense(cell, hand) {
    if (!NEVER_FOLD.has(hand) || cell.fold <= 0) return cell;
    const amount = cell.fold;
    cell.fold = 0;
    const target = ["jam", "fourbet", "call"].reduce((best, action) => (
      cell[action] > cell[best] ? action : best
    ), "call");
    cell[target] += amount;
    return cell;
  }

  function summarizeCells(cells) {
    const summary = actions.reduce((result, action) => {
      result[action] = round2(hands.reduce((sum, hand) => sum + cells[hand][action], 0) / hands.length);
      return result;
    }, {});
    const comboWeights = (hand) => hand.length === 2 ? 6 : hand.endsWith("s") ? 4 : 12;
    const comboTotal = hands.reduce((sum, hand) => sum + comboWeights(hand), 0);
    const comboWeighted = actions.reduce((result, action) => {
      result[action] = round2(hands.reduce((sum, hand) => (
        sum + (cells[hand][action] * comboWeights(hand))
      ), 0) / comboTotal);
      return result;
    }, {});
    return { cellAverage: summary, comboWeighted };
  }

  function buildExactBaseline(position) {
    const spec = EXACT_SPECS[position];
    if (!spec) throw new Error(`Unknown exact position "${position}"`);
    const cells = hands.reduce((result, hand) => {
      result[hand] = { fold: 100, call: 0, fourbet: 0, jam: 0 };
      return result;
    }, {});

    ["call", "fourbet"].forEach((action) => {
      (spec[action] || []).forEach(([percentage, groupHands]) => {
        groupHands.forEach((hand) => {
          if (!handSet.has(hand)) throw new Error(`Unknown hand "${hand}" in ${position}`);
          const cell = cells[hand];
          const amount = Number(percentage);
          if (!Number.isFinite(amount) || amount < 0 || amount > 100) {
            throw new Error(`Invalid ${action} frequency for ${position} ${hand}`);
          }
          cell[action] += amount;
          cell.fold -= amount;
          if (cell.fold < -0.0001) {
            throw new Error(`Exact frequencies exceed 100 for ${position} ${hand}`);
          }
          cells[hand] = normalizeCell(cell);
        });
      });
    });

    return deepFreeze({
      schemaVersion,
      kind: "exact-baseline",
      position,
      relationScope: position === "SB" ? "OOP · SB vs BB" : "vs3bet all",
      cells,
      summaryTarget: { ...spec.summaryTarget },
      summary: summarizeCells(cells),
      provenance: {
        ...SOURCE,
        exact: true,
        page: position === "SB" ? SOURCE.pages.sbVsBb : SOURCE.pages.positions,
        note: position === "SB"
          ? "Точная транскрипция SB open → BB 3-bet."
          : `Точная транскрипция матрицы ${position} vs3bet all.`
      }
    });
  }

  const exactBaselines = deepFreeze(positions.reduce((result, position) => {
    result[position] = buildExactBaseline(position);
    return result;
  }, {}));

  function normalizePosition(value) {
    const position = String(value || "").toUpperCase();
    if (!positions.includes(position)) throw new Error(`Unknown position "${value}"`);
    return position;
  }

  function normalizeRelation(value, position) {
    const fallback = position === "SB" ? "OOP" : "IP";
    const relation = String(value || fallback).toUpperCase();
    if (!relations.includes(relation)) throw new Error(`Unknown relation "${value}"`);
    if (position === "BTN" && relation !== "IP") throw new Error("BTN practice/model scenarios are IP only");
    if (position === "SB" && relation !== "OOP") throw new Error("SB practice/model scenarios are OOP only");
    return relation;
  }

  function normalizeStack(value) {
    if (value && typeof value === "object" && value.key) return normalizeStack(value.key);
    const text = String(value == null ? "51-80" : value).trim();
    const byKey = stacks.find((stack) => stack.key === text);
    if (byKey) return byKey;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new Error(`Unknown stack "${value}"`);
    if (numeric <= 30) return stacks[0];
    if (numeric <= 50) return stacks[1];
    if (numeric < 80) return stacks[2];
    return stacks[3];
  }

  function normalizeSize(value) {
    const size = Number(value == null ? 3 : value);
    if (!sizes.includes(size)) throw new Error(`Unknown 3-bet size "${value}"`);
    return size;
  }

  function normalizeCohort(value) {
    const key = String(value || "reference").toLowerCase();
    const cohort = cohorts.find((item) => item.key === key);
    if (!cohort) throw new Error(`Unknown cohort "${value}"`);
    return cohort;
  }

  function validRelations(position) {
    if (position === "BTN") return ["IP"];
    if (position === "SB") return ["OOP"];
    return relations;
  }

  function scenario(input = {}) {
    const position = normalizePosition(input.position || "CO");
    const relation = normalizeRelation(input.relation, position);
    const stack = normalizeStack(input.stack);
    const size = normalizeSize(input.size);
    const cohort = normalizeCohort(input.cohort);
    const source = exactBaselines[position];

    const relationProfile = position === "SB"
      ? {
        label: "без позиции",
        sourceStatus: "exact-source-relation",
        rationale: "SB vs BB уже является точным OOP-узлом исходной матрицы.",
        transfers: []
      }
      : RELATION_TRANSFERS[relation];
    const sizeProfile = SIZE_TRANSFERS[size];
    const stackProfile = STACK_TRANSFERS[stack.key];
    const cohortProfile = COHORT_TRANSFERS[cohort.key];

    const cells = hands.reduce((result, hand) => {
      const cell = cloneCell(source.cells[hand]);
      applyTransfers(cell, relationProfile.transfers, hand);
      applyTransfers(cell, sizeProfile.transfers, hand);
      applyTransfers(cell, stackProfile.transfers, hand);
      applyTransfers(cell, cohortProfile.transfers, hand);
      enforcePremiumDefense(cell, hand);
      result[hand] = normalizeCell(cell);
      return result;
    }, {});

    return deepFreeze({
      schemaVersion,
      kind: "teaching-scenario",
      filters: {
        position,
        relation,
        stack: stack.key,
        size,
        cohort: cohort.key
      },
      cells,
      summary: summarizeCells(cells),
      provenance: {
        source: SOURCE,
        baseline: {
          status: "exact",
          position,
          relationScope: source.relationScope,
          page: source.provenance.page
        },
        adaptation: {
          status: "heuristic",
          statement: "IP/OOP, стек, сайз и cohort преобразуют точные клетки прозрачными учебными переносами частот; это не solver и не наблюдаемые hand-level частоты.",
          adjustments: [
            { dimension: "relation", key: relation, status: relationProfile.sourceStatus, rationale: relationProfile.rationale, transfers: relationProfile.transfers },
            { dimension: "size", key: size, status: sizeProfile.sourceStatus, rationale: sizeProfile.rationale, transfers: sizeProfile.transfers },
            { dimension: "stack", key: stack.key, status: stackProfile.sourceStatus, rationale: stackProfile.rationale, transfers: stackProfile.transfers },
            { dimension: "cohort", key: cohort.key, status: cohortProfile.sourceStatus, rationale: cohortProfile.rationale, transfers: cohortProfile.transfers }
          ]
        }
      }
    });
  }

  const leakDefinitions = deepFreeze([
    {
      key: "underdefend",
      label: "Недозащита",
      description: "Фолд выше референса: рука слишком часто сдаётся на 3-бет."
    },
    {
      key: "overdefend",
      label: "Лишняя защита",
      description: "Фолд ниже референса: рука продолжает чаще учебной базы."
    },
    {
      key: "missedAggression",
      label: "Пропущенный 4-бет",
      description: "Сумма 4-бета и пуша ниже референса."
    },
    {
      key: "overjam",
      label: "Лишний пуш",
      description: "4-бет-пуш используется заметно чаще референса."
    }
  ]);

  function compareLeaks(input = {}) {
    const cohort = normalizeCohort(input.cohort || "novice");
    const threshold = Math.max(0.01, Number(input.threshold) || 5);
    const common = {
      position: input.position || "CO",
      relation: input.relation,
      stack: input.stack,
      size: input.size
    };
    const reference = scenario({ ...common, cohort: "reference" });
    const actual = scenario({ ...common, cohort: cohort.key });
    const result = leakDefinitions.reduce((output, definition) => {
      output[definition.key] = [];
      return output;
    }, {});

    hands.forEach((hand) => {
      const referenceCell = reference.cells[hand];
      const actualCell = actual.cells[hand];
      const foldDelta = round2(actualCell.fold - referenceCell.fold);
      const aggressionDelta = round2(
        (actualCell.fourbet + actualCell.jam) - (referenceCell.fourbet + referenceCell.jam)
      );
      const jamDelta = round2(actualCell.jam - referenceCell.jam);
      const entry = {
        hand,
        reference: referenceCell,
        actual: actualCell,
        deltas: { fold: foldDelta, aggression: aggressionDelta, jam: jamDelta }
      };
      if (foldDelta >= threshold) result.underdefend.push({ ...entry, magnitude: foldDelta });
      if (foldDelta <= -threshold) result.overdefend.push({ ...entry, magnitude: Math.abs(foldDelta) });
      if (aggressionDelta <= -threshold) result.missedAggression.push({ ...entry, magnitude: Math.abs(aggressionDelta) });
      if (jamDelta >= threshold) result.overjam.push({ ...entry, magnitude: jamDelta });
    });

    Object.values(result).forEach((entries) => {
      entries.sort((left, right) => right.magnitude - left.magnitude || left.hand.localeCompare(right.hand));
    });

    return deepFreeze({
      schemaVersion,
      filters: { ...actual.filters, referenceCohort: "reference", threshold },
      definitions: leakDefinitions,
      groups: result,
      provenance: {
        status: "derived-from-teaching-scenarios",
        note: "Примеры показывают разницу прозрачных учебных сценариев, а не сырые hand-level наблюдения игроков."
      }
    });
  }

  function stackSlug(key) {
    return key === "80+" ? "80_plus" : key.replace("-", "_");
  }

  function sizeSlug(size) {
    return String(size).replace(".", "_");
  }

  function practiceId(position, relation, stack, size, variant) {
    return `vs3-${position.toLowerCase()}-${relation.toLowerCase()}-${stackSlug(stack.key)}-${sizeSlug(size)}x-v${variant}`;
  }

  function filterMatches(actual, requested, normalizer) {
    if (requested == null || requested === "") return true;
    const values = Array.isArray(requested) ? requested : [requested];
    return values.some((value) => normalizer(value) === actual);
  }

  function practiceSpotIds(filters = {}) {
    if (filters.cohort != null) {
      const requestedCohorts = Array.isArray(filters.cohort) ? filters.cohort : [filters.cohort];
      if (!requestedCohorts.some((cohort) => cohorts.some((item) => item.key === String(cohort).toLowerCase()))) {
        return [];
      }
    }
    const ids = [];
    positions.forEach((position) => {
      if (!filterMatches(position, filters.position, (value) => String(value).toUpperCase())) return;
      validRelations(position).forEach((relation) => {
        if (!filterMatches(relation, filters.relation, (value) => String(value).toUpperCase())) return;
        stacks.forEach((stack) => {
          if (!filterMatches(stack.key, filters.stack ?? filters.stackBucket, (value) => normalizeStack(value).key)) return;
          sizes.forEach((size) => {
            if (!filterMatches(size, filters.size ?? filters.threeBetSize, normalizeSize)) return;
            [1, 2].forEach((variant) => ids.push(practiceId(position, relation, stack, size, variant)));
          });
        });
      });
    });
    return ids;
  }

  function leakCards(input = {}) {
    const selectedCohort = String(input.cohort || "novice").toLowerCase();
    const comparedCohort = selectedCohort === "reference" ? "novice" : selectedCohort;
    const comparison = compareLeaks({ ...input, cohort: comparedCohort, threshold: 0.4 });
    return deepFreeze([
      {
        type: "underdefense",
        title: "Слишком ранний пас",
        hands: comparison.groups.underdefend.slice(0, 6).map((entry) => entry.hand),
        copy: "Маргинальная часть точной матрицы чаще превращается в пас в учебном слое поля.",
        rule: "Сверь позицию, цену и глубину до того, как автоматически выбрасывать нижнюю часть продолжения."
      },
      {
        type: "overdefense",
        title: "Красивые руки без цены",
        hands: comparison.groups.overdefend.slice(0, 6).map((entry) => entry.hand),
        copy: "Пограничные suited-руки иногда добавляются сверх точной базовой матрицы только из-за внешней привлекательности.",
        rule: "Одномастность и связность не отменяют крупный 3-бет и низкий остаточный SPR."
      }
    ]);
  }

  Object.defineProperties(leakCards, {
    schemaVersion: { value: schemaVersion, enumerable: true },
    definitions: { value: leakDefinitions, enumerable: true },
    compare: { value: compareLeaks, enumerable: true }
  });
  const leaks = Object.freeze(leakCards);

  const api = deepFreeze({
    schemaVersion,
    ranks,
    positions,
    relations,
    stacks,
    sizes,
    cohorts,
    hands,
    baseline(position) {
      return exactBaselines[normalizePosition(position)];
    },
    scenario,
    leaks,
    practiceSpotIds
  });

  root.FF_VS3BET_RANGE_MODEL = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
