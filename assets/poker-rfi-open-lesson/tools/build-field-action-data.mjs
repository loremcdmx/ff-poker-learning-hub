import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const realizer = require(path.resolve(here, "../../poker-kit/simulator/bot-range-realizer.js"));

const STACKS = ["70+", "30-70", "20-30", "15-20", "12-15", "10-12", "8-10", "6-8", "<6"];
const POSITIONS = ["EP", "MP", "HJ", "CO", "BTN", "SB"];
const RECOMMENDATION_POSITIONS = ["EP", "MP", "HJ", "CO", "BTN"];
const SHORT_STACKS = ["20-30", "15-20", "12-15", "10-12", "8-10", "6-8", "<6"];
const GROUP = { EP: "early", MP: "middle", HJ: "middle", CO: "co", BTN: "btn" };
const HANDS = realizer.HAND_CLASSES.map((item) => item.key);
const PRIOR_STRENGTH_GRID = [4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256];

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
const OBSERVED_PLAYERS = { l3top: 161, l3: 946, l2: 471, l1: 165 };

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
  return new Map(rows.map((row) => [[row.stack_bucket, row.position_group, row.hand_class].join("|"), row]));
}

function buildChart(index, stack, position) {
  const cells = HANDS.map((hand) => {
    const row = index.get([stack, position, hand].join("|"));
    return actions(row || {});
  });
  const total = cells.reduce((sum, cell) => sum + cell.opportunities, 0);
  const raiseTotal = cells.reduce((sum, cell) => sum + cell.raise, 0);
  const shoveTotal = cells.reduce((sum, cell) => sum + cell.shove, 0);
  const limpTotal = cells.reduce((sum, cell) => sum + cell.limp, 0);
  return {
    n: packU32(cells.map((cell) => cell.opportunities)),
    r: packU16(cells.map((cell) => Math.round(roundedPct(cell.raise, cell.opportunities) * 10))),
    j: packU16(cells.map((cell) => Math.round(roundedPct(cell.shove, cell.opportunities) * 10))),
    l: packU16(cells.map((cell) => Math.round(roundedPct(cell.limp, cell.opportunities) * 10))),
    p: packU16(cells.map((cell) => cell.players)),
    m: packU8(cells.map((cell) => cell.months)),
    opportunities: total,
    raisePct: roundedPct(raiseTotal, total),
    shovePct: roundedPct(shoveTotal, total),
    limpPct: roundedPct(limpTotal, total),
    rfiPct: roundedPct(raiseTotal + shoveTotal, total),
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
const cohorts = {};
for (const [key, meta] of Object.entries(COHORT_META)) {
  const rows = rowsByCohort[key];
  const selectedPlayers = Math.max(...rows.map((row) => number(row, "cohort_players", "cohort_selected_players")), 0);
  const players = OBSERVED_PLAYERS[key] || selectedPlayers;
  const charts = {};
  for (const stack of STACKS) {
    charts[stack] = {};
    for (const position of POSITIONS) charts[stack][position] = buildChart(indexes[key], stack, position);
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
  version: "2026-07-17",
  handOrder: HANDS,
  stackOrder: STACKS,
  positions: POSITIONS,
  cohortOrder: ["l3top", "l3", "l2", "l1"],
  methodology: {
    period: { from: "2025-10-01", to: "2026-06-30", label: "1 октября 2025 — 30 июня 2026" },
    table: "7–9 max",
    opportunity: "неоткрытый банк, известные карманные карты, эффективный стек",
    actionSplit: "пас / обычный рейз / open-push / лимп",
    cohortRule: "текущий ранг, активный реальный игрок, без кикнутых аккаунтов, минимум 30 000 рук FFEV",
    knownCardsPct: Number(options["known-cards-pct"] || 0),
    top25: {
      eligiblePlayers: 651,
      selectedPlayers: 163,
      minHands: 30000,
      minFFev: 10.050272,
      ranks: "11–14",
      metric: "ev_2_weighted",
      periodType: "last_100k_hands",
      selection: "верхние 25% по текущему FFEV; deterministic rank, ceil(N × 0.25)"
    },
    recommendation: "Ширина диапазона равна наблюдаемому RFI top-25%; состав рук ранжирован по empirical-Bayes posterior: top-25 как основной срез, все eligible L3 R11–14 как hand-level prior. Сила сглаживания подбирается beta-binomial marginal likelihood отдельно для каждого стека и позиции.",
    sourceSnapshot: {
      rows: Number(options["source-rows"] || 0),
      sha256: options["source-sha256"] || "",
      l3topUsable: Number(options["l3top-usable"] || 0),
      l3topCellsLt30: Number(options["l3top-cells-lt30"] || 0),
      l3topCellsLt100: Number(options["l3top-cells-lt100"] || 0),
      priorRows: priorRows.length,
      priorSha256: options["prior-sha256"] || "",
      priorUsable: Number(options["prior-usable"] || 0)
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
