import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { normalizeHandClass } from "./field-action-quality.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const realizer = require(path.resolve(here, "../../poker-kit/simulator/bot-range-realizer.js"));

const STACKS = ["70+", "30-70", "20-30", "15-20", "12-15", "10-12", "8-10", "6-8", "<6"];
const POSITIONS = ["EP", "MP", "HJ", "CO", "BTN", "SB"];
const RECOMMENDATION_POSITIONS = ["EP", "MP", "HJ", "CO", "BTN"];
const SHORT_STACKS = ["20-30", "15-20", "12-15", "10-12", "8-10", "6-8", "<6"];
const PUBLIC_CELL_MIN_N = 30;
const GROUP = { EP: "early", MP: "middle", HJ: "middle", CO: "co", BTN: "btn" };
const HANDS = realizer.HAND_CLASSES.map((item) => item.key);
const PRIOR_STRENGTH_GRID = [4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256];
const FIELD_ESTIMATE_PRIOR_HANDS = 60;

const COHORT_META = {
  l3top: {
    label: "Лига 3 · top 25%",
    shortLabel: "Лига 3 · top 25%",
    ranks: "R11–14",
    description: "163 игрока из верхнего квартиля по FFEV среди активных игроков Лиги 3 на рангах 11–14; в окне анализа есть раздачи 161 игрока."
  },
  l3: {
    label: "Лига 3",
    shortLabel: "Лига 3",
    ranks: "текущая лига",
    description: "Активные реальные игроки текущей Лиги 3 с минимум 30 000 рук в окне FFEV."
  },
  l2: {
    label: "Лига 2",
    shortLabel: "Лига 2",
    ranks: "R6–10",
    description: "Активные реальные игроки текущей Лиги 2 с минимум 30 000 рук в окне FFEV."
  },
  l1: {
    label: "Лига 1",
    shortLabel: "Лига 1",
    ranks: "R1–5",
    description: "Активные реальные игроки текущей Лиги 1 с минимум 30 000 рук в окне FFEV."
  }
};
const DEFAULT_OBSERVED_PLAYERS = { l3top: 161, l3: 945, l2: 471, l1: 165 };

function args() {
  return Object.fromEntries(process.argv.slice(2).map((item) => {
    const match = item.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Expected --key=value, got ${item}`);
    return [match[1], match[2]];
  }));
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ""; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const header = rows.shift();
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

function number(row, ...keys) {
  for (const key of keys) if (row[key] !== undefined && row[key] !== "") return Number(row[key]);
  return 0;
}

function actions(row) {
  const opportunities = number(row, "opportunities");
  const shove = number(row, "open_shove", "open_shoves", "shoves", "open_pushes");
  const opens = number(row, "raises_total", "opens", "rfi");
  const raise = number(row, "regular_raise", "regular_raises", "raises") || Math.max(0, opens - shove);
  const limp = number(row, "limp", "limps");
  const players = number(row, "players");
  const months = number(row, "months");
  return { opportunities, raise, shove, limp, players, months };
}

function packU8(values) {
  return Buffer.from(values.map((value) => Math.max(0, Math.min(255, value)))).toString("base64");
}

function packU16(values) {
  const buffer = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => buffer.writeUInt16LE(Math.max(0, Math.min(65535, value)), index * 2));
  return buffer.toString("base64");
}

function packU32(values) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeUInt32LE(Math.max(0, value) >>> 0, index * 4));
  return buffer.toString("base64");
}

function roundedPct(value, total) {
  return total ? Math.round(value / total * 1000) / 10 : 0;
}

function logGamma(value) {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7
  ];
  if (value < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  let shifted = value - 1;
  let series = 0.9999999999998099;
  for (let index = 0; index < coefficients.length; index += 1) series += coefficients[index] / (shifted + index + 1);
  const scale = shifted + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(scale) - scale + Math.log(series);
}

function logBeta(left, right) {
  return logGamma(left) + logGamma(right) - logGamma(left + right);
}

function clampRate(value) {
  return Math.max(0.0025, Math.min(0.9975, value));
}

function betaBinomialLogLikelihood(observations, priorHands) {
  return observations.reduce((sum, observation) => {
    if (!observation.trials || !observation.priorTrials) return sum;
    const priorRate = clampRate(observation.priorSuccesses / observation.priorTrials);
    const alpha = priorRate * priorHands;
    const beta = (1 - priorRate) * priorHands;
    return sum +
      logGamma(observation.trials + 1) -
      logGamma(observation.successes + 1) -
      logGamma(observation.trials - observation.successes + 1) +
      logBeta(observation.successes + alpha, observation.trials - observation.successes + beta) -
      logBeta(alpha, beta);
  }, 0);
}

function fitPriorHands(observations) {
  let best = { hands: PRIOR_STRENGTH_GRID[0], score: -Infinity };
  for (const hands of PRIOR_STRENGTH_GRID) {
    const score = betaBinomialLogLikelihood(observations, hands);
    if (score > best.score) best = { hands, score };
  }
  return best.hands;
}

function posteriorRate(successes, trials, priorSuccesses, priorTrials, priorHands, fallback) {
  const priorRate = priorTrials ? priorSuccesses / priorTrials : fallback;
  return (successes + priorHands * priorRate) / (trials + priorHands);
}

function indexRows(rows) {
  const index = new Map();
  for (const row of rows) {
    const hand = normalizeHandClass(row.hand_class);
    if (!STACKS.includes(row.stack_bucket)) throw new Error(`Invalid stack bucket: ${row.stack_bucket}`);
    if (!POSITIONS.includes(row.position_group)) throw new Error(`Invalid position group: ${row.position_group}`);
    const key = [row.stack_bucket, row.position_group, hand].join("|");
    if (index.has(key)) throw new Error(`Duplicate normalized field-action row: ${key}`);
    index.set(key, { ...row, hand_class: hand });
  }
  return index;
}

function mergeIndexes(indexes) {
  const merged = new Map();
  for (const index of indexes) for (const [key, row] of index) {
    const current = actions(merged.get(key) || {});
    const incoming = actions(row);
    merged.set(key, {
      stack_bucket: row.stack_bucket,
      position_group: row.position_group,
      hand_class: row.hand_class,
      opportunities: current.opportunities + incoming.opportunities,
      regular_raise: current.raise + incoming.raise,
      open_shove: current.shove + incoming.shove,
      limp: current.limp + incoming.limp
    });
  }
  return merged;
}

function fallbackIndex(primary, fallback) {
  const result = new Map(fallback);
  for (const [key, value] of primary) result.set(key, value);
  return result;
}

function estimatedActions(cell, prior, aggregate) {
  const priorTotal = prior.opportunities || 0;
  const priorRates = priorTotal ? {
    raise: prior.raise / priorTotal,
    shove: prior.shove / priorTotal,
    limp: prior.limp / priorTotal
  } : aggregate;
  const denominator = cell.opportunities + FIELD_ESTIMATE_PRIOR_HANDS;
  return {
    raise: (cell.raise + FIELD_ESTIMATE_PRIOR_HANDS * priorRates.raise) / denominator,
    shove: (cell.shove + FIELD_ESTIMATE_PRIOR_HANDS * priorRates.shove) / denominator,
    limp: (cell.limp + FIELD_ESTIMATE_PRIOR_HANDS * priorRates.limp) / denominator
  };
}

function buildChart(index, estimatePriorIndex, stack, position) {
  const cells = HANDS.map((hand) => {
    const row = index.get([stack, position, hand].join("|"));
    return actions(row || {});
  });
  const estimatePriors = HANDS.map((hand) => actions(estimatePriorIndex.get([stack, position, hand].join("|")) || {}));
  const publicCells = cells.map((cell) => cell.opportunities < PUBLIC_CELL_MIN_N
    ? { opportunities: 0, raise: 0, shove: 0, limp: 0, players: 0, months: 0 }
    : cell);
  const total = cells.reduce((sum, cell) => sum + cell.opportunities, 0);
  const raiseTotal = cells.reduce((sum, cell) => sum + cell.raise, 0);
  const shoveTotal = cells.reduce((sum, cell) => sum + cell.shove, 0);
  const limpTotal = cells.reduce((sum, cell) => sum + cell.limp, 0);
  const aggregate = total ? { raise: raiseTotal / total, shove: shoveTotal / total, limp: limpTotal / total } : { raise: 0, shove: 0, limp: 0 };
  const estimates = cells.map((cell, index) => estimatedActions(cell, estimatePriors[index], aggregate));
  return {
    n: packU32(publicCells.map((cell) => cell.opportunities)),
    r: packU16(cells.map((cell, index) => cell.opportunities < PUBLIC_CELL_MIN_N ? Math.round(estimates[index].raise * 1000) : Math.round(roundedPct(cell.raise, cell.opportunities) * 10))),
    j: packU16(cells.map((cell, index) => cell.opportunities < PUBLIC_CELL_MIN_N ? Math.round(estimates[index].shove * 1000) : Math.round(roundedPct(cell.shove, cell.opportunities) * 10))),
    l: packU16(cells.map((cell, index) => cell.opportunities < PUBLIC_CELL_MIN_N ? Math.round(estimates[index].limp * 1000) : Math.round(roundedPct(cell.limp, cell.opportunities) * 10))),
    p: packU16(publicCells.map((cell) => cell.players)),
    m: packU8(publicCells.map((cell) => cell.months)),
    opportunities: total,
    raisePct: roundedPct(raiseTotal, total),
    shovePct: roundedPct(shoveTotal, total),
    limpPct: roundedPct(limpTotal, total),
    rfiPct: roundedPct(raiseTotal + shoveTotal, total),
    privacySuppressedCells: cells.filter((cell) => cell.opportunities < PUBLIC_CELL_MIN_N).length,
    veryLowSampleCells: cells.filter((cell) => cell.opportunities < 30).length,
    lowSampleCells: cells.filter((cell) => cell.opportunities < 100).length
  };
}

function recommendation(index, priorIndex, stack, position) {
  const cells = HANDS.map((hand) => ({
    hand,
    ...actions(index.get([stack, position, hand].join("|")) || {}),
    prior: actions(priorIndex.get([stack, position, hand].join("|")) || {})
  }));
  const opportunities = cells.reduce((sum, cell) => sum + cell.opportunities, 0);
  const raiseTotal = cells.reduce((sum, cell) => sum + cell.raise, 0);
  const shoveTotal = cells.reduce((sum, cell) => sum + cell.shove, 0);
  const opens = raiseTotal + shoveTotal;
  const targetPct = roundedPct(opens, opportunities);
  const aggregateOpenRate = opportunities ? opens / opportunities : 0;
  const openObservations = cells.map((cell) => ({
    successes: cell.raise + cell.shove,
    trials: cell.opportunities,
    priorSuccesses: cell.prior.raise + cell.prior.shove,
    priorTrials: cell.prior.opportunities
  }));
  const openPriorHands = fitPriorHands(openObservations);
  cells.forEach((cell) => {
    cell.posteriorOpenRate = posteriorRate(
      cell.raise + cell.shove,
      cell.opportunities,
      cell.prior.raise + cell.prior.shove,
      cell.prior.opportunities,
      openPriorHands,
      aggregateOpenRate
    );
  });
  const ranked = cells.slice().sort((left, right) =>
    right.posteriorOpenRate - left.posteriorOpenRate ||
    realizer.scoreClass(right.hand, GROUP[position]) - realizer.scoreClass(left.hand, GROUP[position]) ||
    left.hand.localeCompare(right.hand)
  );
  const targetCombos = targetPct / 100 * realizer.TOTAL_COMBOS;
  let runningCombos = 0;
  let bestPrefix = 0;
  let bestDistance = Math.abs(targetCombos);
  ranked.forEach((cell, index) => {
    runningCombos += realizer.comboCount(cell.hand);
    const distance = Math.abs(runningCombos - targetCombos);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPrefix = index + 1;
    }
  });
  const chosen = new Set(ranked.slice(0, bestPrefix).map((cell) => cell.hand));
  const aggregateJamShare = opens ? shoveTotal / opens : 0;
  const jamObservations = cells.map((cell) => ({
    successes: cell.shove,
    trials: cell.raise + cell.shove,
    priorSuccesses: cell.prior.shove,
    priorTrials: cell.prior.raise + cell.prior.shove
  }));
  const actionPriorHands = fitPriorHands(jamObservations);
  const mask = cells.map((cell) => {
    if (!chosen.has(cell.hand)) return "f";
    const observedActions = cell.raise + cell.shove;
    const priorActions = cell.prior.raise + cell.prior.shove;
    const jamShare = posteriorRate(
      cell.shove,
      observedActions,
      cell.prior.shove,
      priorActions,
      actionPriorHands,
      aggregateJamShare
    );
    return jamShare >= .65 ? "j" : jamShare <= .35 ? "r" : "m";
  }).join("");
  return {
    targetPct,
    actualPct: Math.round(realizer.rangePct(chosen) * 10) / 10,
    mask,
    observedRfiPct: targetPct,
    observedShoveSharePct: roundedPct(shoveTotal, opens),
    opportunities,
    openPriorHands,
    actionPriorHands,
    priorCohort: "l3-r11-14-eligible",
    shapeMethod: "empirical-bayes-hand-ranking"
  };
}

const options = args();
for (const key of Object.keys(COHORT_META)) if (!options[key]) throw new Error(`Missing --${key}=path.csv`);
const rowsByCohort = Object.fromEntries(Object.keys(COHORT_META).map((key) => {
  const rows = parseCsv(fs.readFileSync(options[key], "utf8"));
  return [key, rows.filter((row) => !row.cohort || row.cohort === key)];
}));
const indexes = Object.fromEntries(Object.entries(rowsByCohort).map(([key, rows]) => [key, indexRows(rows)]));
if (!options.l3prior) throw new Error("Missing --l3prior=path.csv");
const priorRows = parseCsv(fs.readFileSync(options.l3prior, "utf8"));
const priorIndex = indexRows(priorRows);
const pooledLeagueIndex = mergeIndexes([indexes.l1, indexes.l2, indexes.l3]);
const estimatePriorIndexes = {
  l1: mergeIndexes([indexes.l2, indexes.l3]),
  l2: mergeIndexes([indexes.l1, indexes.l3]),
  l3: mergeIndexes([indexes.l1, indexes.l2]),
  l3top: fallbackIndex(priorIndex, pooledLeagueIndex)
};
const priorSelectedPlayers = Math.max(...priorRows.map((row) => number(row, "cohort_players", "cohort_selected_players")), 0);
const cohorts = {};
for (const [key, meta] of Object.entries(COHORT_META)) {
  const rows = rowsByCohort[key];
  const selectedPlayers = Math.max(...rows.map((row) => number(row, "cohort_players", "cohort_selected_players")), 0);
  const players = Number(options[`${key}-observed`] || DEFAULT_OBSERVED_PLAYERS[key] || selectedPlayers);
  const charts = {};
  for (const stack of STACKS) {
    charts[stack] = {};
    for (const position of POSITIONS) charts[stack][position] = buildChart(indexes[key], estimatePriorIndexes[key], stack, position);
  }
  cohorts[key] = { ...meta, players, selectedPlayers, charts };
}

const recommendations = {};
for (const stack of SHORT_STACKS) {
  recommendations[stack] = {};
  for (const position of RECOMMENDATION_POSITIONS) recommendations[stack][position] = recommendation(indexes.l3top, priorIndex, stack, position);
}

const output = {
  schema: "ff-rfi-field-actions-v2",
  version: options.version || "2026-07-18",
  handOrder: HANDS,
  stackOrder: STACKS,
  positions: POSITIONS,
  cohortOrder: ["l3top", "l3", "l2", "l1"],
  methodology: {
    period: {
      from: options["period-from"] || "2025-10-01",
      to: options["period-to"] || "2026-07-16",
      label: options["period-label"] || "1 октября 2025 — 16 июля 2026"
    },
    table: "7–9 max",
    opportunity: "неоткрытый банк, известные карманные карты, эффективный стек",
    actionSplit: "пас / обычный рейз / open-push / лимп",
    cohortRule: "текущий ранг, активный реальный игрок, без кикнутых аккаунтов, минимум 30 000 рук FFEV",
    knownCardsPct: Number(options["known-cards-pct"] || 0),
    top25: {
      eligiblePlayers: Number(options["top25-eligible"] || priorSelectedPlayers || 651),
      selectedPlayers: Number(options["top25-selected"] || cohorts.l3top.selectedPlayers || 163),
      minHands: 30000,
      minFFev: Number(options["top25-min-ffev"] || 10.050272),
      ranks: "11–14",
      metric: "ev_2_weighted",
      periodType: "last_100k_hands",
      selection: "верхние 25% по текущему FFEV; deterministic rank, ceil(N × 0.25)"
    },
    recommendation: "Ширина диапазона равна наблюдаемому RFI top-25%; состав рук ранжирован по empirical-Bayes posterior: top-25 как основной срез, все eligible L3 R11–14 как hand-level prior. Сила сглаживания подбирается beta-binomial marginal likelihood отдельно для каждого стека и позиции.",
    fieldCellEstimate: `Для hand-level клеток с N < ${PUBLIC_CELL_MIN_N} вместо нуля показана Dirichlet-сглаженная оценка (${FIELD_ESTIMATE_PRIOR_HANDS} эквивалентных рук prior). Для top-25 prior — все eligible L3 R11–14 там, где этот срез доступен, иначе pooled leagues; для лиг — leave-one-league-out пул. Точное N и сырые частоты малой клетки не публикуются.`,
    fieldCellEstimatePriorHands: FIELD_ESTIMATE_PRIOR_HANDS,
    privacy: "Публичный payload не содержит идентификаторов игроков. Для hand-level клеток с N < 30 точные N, сырые частоты, число игроков и число месяцев подавлены; вместо ложного нуля отображается явно помеченная сглаженная оценка. Агрегаты стека/позиции и рекомендации считаются по полному read-only срезу.",
    sourceSnapshot: {
      rows: Number(options["source-rows"] || 0),
      sha256: options["source-sha256"] || "",
      l3topUsable: Number(options["l3top-usable"] || 0),
      l3topCellsLt30: Number(options["l3top-cells-lt30"] || 0),
      l3topCellsLt100: Number(options["l3top-cells-lt100"] || 0),
      priorRows: priorRows.length,
      priorSha256: options["prior-sha256"] || "",
      priorUsable: Number(options["prior-usable"] || 0),
      membershipRows: Number(options["membership-rows"] || 0),
      membershipSha256: options["membership-sha256"] || "",
      cohortJobId: options["cohort-job-id"] || "",
      actionJobId: options["action-job-id"] || "",
      extractionSql: "tools/q_ff_rfi_field_actions.sql"
    }
  },
  recommendations: {
    source: "top25-ffev-last100k-l3-r11-14",
    priorSource: "all-eligible-l3-r11-14",
    smoothing: { method: "beta-binomial-empirical-bayes", candidates: PRIOR_STRENGTH_GRID, raiseMax: .35, shoveMin: .65 },
    charts: recommendations
  },
  cohorts
};

const target = path.resolve(options.out || path.resolve(here, "../field-action-data.js"));
const body = `(function(){\n  "use strict";\n  window.PokerRfiFieldActionData = ${JSON.stringify(output, null, 2)};\n})();\n`;
fs.writeFileSync(target, body);
console.log(JSON.stringify({ target, bytes: Buffer.byteLength(body), cohorts: Object.fromEntries(Object.entries(cohorts).map(([key, cohort]) => [key, cohort.players])) }));
