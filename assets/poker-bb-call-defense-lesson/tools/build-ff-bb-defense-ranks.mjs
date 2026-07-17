import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const inputArgument = process.argv[2];
const outputPath = process.argv[3] || path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/ff-bb-defense-ranks.json"
);

if (!inputArgument) {
  throw new Error("Usage: node build-ff-bb-defense-ranks.mjs <cube.csv[,cube-2.csv]> [output.json]");
}

const inputPaths = inputArgument.split(",").map((value) => value.trim()).filter(Boolean);
const COHORTS = ["novice", "league3", "league2", "league1"];
const STACK_BUCKETS = ["70_plus", "40_70", "0_40"];
const POSITIONS = ["EP", "MP", "HJ", "CO", "BTN"];
const SIZES = [2, 2.5, 3];
const RANKS = "AKQJT98765432";
const HANDS = [];
for (let row = 0; row < RANKS.length; row += 1) {
  for (let column = 0; column < RANKS.length; column += 1) {
    HANDS.push(row === column
      ? RANKS[row] + RANKS[column]
      : row < column
        ? RANKS[row] + RANKS[column] + "s"
        : RANKS[column] + RANKS[row] + "o");
  }
}
const HAND_SET = new Set(HANDS);

function parseCsv(text) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      records.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    records.push(row);
  }
  const [header, ...data] = records;
  if (!header) throw new Error("CSV export is empty");
  return data
    .filter((values) => values.length === header.length)
    .map((values) => Object.fromEntries(header.map((name, index) => [name, values[index]])));
}

function numeric(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return parsed;
}

function sizeKey(value) {
  return Number(value).toFixed(1).replace(".", "_");
}

function aggregateKey(cohort, stackBucket, position, size) {
  return `${cohort}:${stackBucket}:${position}:${sizeKey(size)}`;
}

function handKey(cohort, stackBucket, position, size, hand) {
  return `${aggregateKey(cohort, stackBucket, position, size)}:${hand}`;
}

function countsFrom(row) {
  return {
    n: numeric(row.hand_count, "hand_count"),
    folds: numeric(row.fold_hands, "fold_hands"),
    calls: numeric(row.call_hands, "call_hands"),
    threeBets: numeric(row.threebet_hands, "threebet_hands"),
    other: numeric(row.other_hands, "other_hands")
  };
}

function pearson(left, right) {
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const leftMean = mean(left);
  const rightMean = mean(right);
  const numerator = left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0);
  const leftScale = left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0);
  const rightScale = right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0);
  return numerator / Math.sqrt(leftScale * rightScale);
}

const inputFiles = inputPaths.map((inputPath) => {
  const content = fs.readFileSync(inputPath, "utf8");
  return {
    path: inputPath,
    content,
    sha256: createHash("sha256").update(content).digest("hex"),
    rows: Math.max(0, content.trim().split(/\r?\n/).length - 1)
  };
});
const rows = inputFiles.flatMap((input) => parseCsv(input.content));
const aggregates = {};
const observedHands = {};
const missingByChart = {};
const rowKeys = new Set();

for (const row of rows) {
  const cohort = row.cohort;
  const stackBucket = row.stack_bucket;
  const position = row.opener_position;
  const size = Number(row.open_size_bb);
  const hand = row.holecards_str;
  if (!COHORTS.includes(cohort) || !STACK_BUCKETS.includes(stackBucket) || !POSITIONS.includes(position) || !SIZES.includes(size)) {
    throw new Error(`Unexpected cube dimension: ${cohort}/${stackBucket}/${position}/${size}`);
  }
  const sourceKey = handKey(cohort, stackBucket, position, size, hand);
  if (rowKeys.has(sourceKey)) throw new Error(`Duplicate cube row: ${sourceKey}`);
  rowKeys.add(sourceKey);
  const counts = countsFrom(row);
  if (counts.folds + counts.calls + counts.threeBets + counts.other !== counts.n || counts.other !== 0) {
    throw new Error(`Action reconciliation failed: ${sourceKey}`);
  }
  const chartKey = aggregateKey(cohort, stackBucket, position, size);
  if (hand === "__AGGREGATE__") {
    aggregates[chartKey] = {
      n: counts.n,
      players: numeric(row.unique_players, "unique_players"),
      folds: counts.folds,
      calls: counts.calls,
      threeBets: counts.threeBets,
      cardKnownN: 0
    };
    continue;
  }
  if (hand === "__MISSING__") {
    missingByChart[chartKey] = counts;
    continue;
  }
  if (!HAND_SET.has(hand)) throw new Error(`Unexpected hand class: ${hand}`);
  observedHands[handKey(cohort, stackBucket, position, size, hand)] = {
    n: counts.n,
    players: numeric(row.unique_players, "unique_players"),
    folds: counts.folds,
    calls: counts.calls,
    threeBets: counts.threeBets
  };
}

const expectedChartKeys = [];
for (const cohort of COHORTS) {
  for (const stackBucket of STACK_BUCKETS) {
    for (const position of POSITIONS) {
      for (const size of SIZES) expectedChartKeys.push(aggregateKey(cohort, stackBucket, position, size));
    }
  }
}
if (expectedChartKeys.length !== 180 || Object.keys(aggregates).length !== expectedChartKeys.length) {
  throw new Error(`Aggregate cube is incomplete: ${Object.keys(aggregates).length}/180 charts`);
}

const hands = {};
for (const chartKey of expectedChartKeys) {
  const aggregate = aggregates[chartKey];
  if (!aggregate) throw new Error(`Missing aggregate: ${chartKey}`);
  let knownN = 0;
  let knownFolds = 0;
  let knownCalls = 0;
  let knownThreeBets = 0;
  for (const hand of HANDS) {
    const key = `${chartKey}:${hand}`;
    const source = observedHands[key];
    hands[key] = source || { n: 0, players: 0, folds: 0, calls: 0, threeBets: 0 };
    knownN += hands[key].n;
    knownFolds += hands[key].folds;
    knownCalls += hands[key].calls;
    knownThreeBets += hands[key].threeBets;
  }
  aggregate.cardKnownN = knownN;
  const missing = missingByChart[chartKey] || { n: 0, folds: 0, calls: 0, threeBets: 0, other: 0 };
  if (knownN + missing.n !== aggregate.n ||
      knownFolds + missing.folds !== aggregate.folds ||
      knownCalls + missing.calls !== aggregate.calls ||
      knownThreeBets + missing.threeBets !== aggregate.threeBets) {
    throw new Error(`Known-card reconciliation failed: ${chartKey}`);
  }
}

const abi = {
  novice: { players: 1116, entries: 628101, loadUsd: 1687390.61, abiUsd: 2.69 },
  league3: { players: 1616, entries: 1768356, loadUsd: 9720802.96, abiUsd: 5.50 },
  league2: { players: 667, entries: 1082216, loadUsd: 17795180.04, abiUsd: 16.44 },
  league1: { players: 216, entries: 366251, loadUsd: 15609661.05, abiUsd: 42.62 }
};
const defaultStackBucket = "40_70";
const defaultDefend = COHORTS.map((cohort) => {
  const aggregate = aggregates[aggregateKey(cohort, defaultStackBucket, "BTN", 2)];
  return 100 * (aggregate.calls + aggregate.threeBets) / aggregate.n;
});
const abiValues = COHORTS.map((cohort) => abi[cohort].abiUsd);
const correlation = pearson(abiValues.map(Math.log), defaultDefend);
const totalN = Object.values(aggregates).reduce((sum, row) => sum + row.n, 0);
const cardKnownN = Object.values(aggregates).reduce((sum, row) => sum + row.cardKnownN, 0);

const output = {
  meta: {
    version: "2026-07-17.1",
    window: {
      startInclusive: "2026-01-01T00:00:00Z",
      endExclusive: "2026-07-17T00:00:00Z",
      label: "1 января — 16 июля 2026"
    },
    scope: "FF tracker · BB vs one raiser · 3–9 max · effective stack >0 BB · opens 2/2.5/3 BB ±0.05",
    cohorts: {
      novice: { label: "Совсем новички", detail: "ранги 15–18", ranks: [15, 16, 17, 18] },
      league3: { label: "3 лига", detail: "ранги 11–15", ranks: [11, 12, 13, 14, 15] },
      league2: { label: "2 лига", detail: "ранги 6–10", ranks: [6, 7, 8, 9, 10] },
      league1: { label: "1 лига", detail: "ранги 1–5", ranks: [1, 2, 3, 4, 5] }
    },
    stackBuckets: [
      { key: "70_plus", label: "70 BB+", minInclusive: 70, maxExclusive: null },
      { key: "40_70", label: "40–70 BB", minInclusive: 40, maxExclusive: 70 },
      { key: "0_40", label: "0–40 BB", minExclusive: 0, maxExclusive: 40 }
    ],
    positions: POSITIONS,
    sizes: SIZES,
    minChartDisplayN: 300,
    minCellDisplayN: 20,
    minCellReliableN: 80,
    samplePolicy: "Cells below N=20 keep their action color and receive a gray corner; charts below N=300 get a low-sample overlay. Empty cells remain explicit rather than imputed.",
    cohortPolicy: "Rank 15 intentionally appears in both novice (15-18) and league3 (11-15).",
    abiMetric: "SUM(load_usd) / SUM(1 + multientries), pack only, selfplay excluded, real players",
    abi,
    abiCorrelation: {
      method: "Pearson correlation between log cohort ABI and BTN/2 BB total defend at 40–70 BB",
      cohortCount: 4,
      pearsonR: Number(correlation.toFixed(6)),
      abiFrom: abi.novice.abiUsd,
      abiTo: abi.league1.abiUsd,
      defendFrom: Number(defaultDefend[0].toFixed(6)),
      defendTo: Number(defaultDefend[3].toFixed(6)),
      caveat: "Ecological cross-sectional association; it does not establish training causality. ABI metadata uses the frozen 2026-07-14 cohort snapshot."
    },
    coverage: {
      totalN,
      cardKnownN,
      cardKnownPct: Number((100 * cardKnownN / totalN).toFixed(2)),
      aggregateCells: Object.keys(aggregates).length,
      handCells: Object.keys(hands).length,
      observedHandCells: Object.keys(observedHands).length,
      emptyHandCells: Object.keys(hands).length - Object.keys(observedHands).length,
      expectedHandClassesPerChart: HANDS.length
    },
    source: {
      hands: "analytics.int_tracker_hand_joined",
      ranks: "analytics_mcp_readonly.mcp__check_rank_history",
      players: "analytics_mcp_readonly.mcp__check_users",
      abi: "analytics_mcp_readonly.mcp__fulltplayers",
      query: "assets/poker-bb-call-defense-lesson/tools/q_ff_bb_defense_ranks.sql",
      cubeFiles: inputFiles.map((input) => ({
        name: path.basename(input.path),
        rows: input.rows,
        sha256: input.sha256
      }))
    }
  },
  aggregates,
  hands
};

if (totalN !== 11658216 || cardKnownN !== 10089518) {
  throw new Error(`Snapshot reconciliation failed: ${Object.keys(aggregates).length} charts / ${totalN} hands / ${cardKnownN} known`);
}
if (Object.keys(observedHands).length !== 30374 || Object.keys(hands).length !== 30420) {
  throw new Error(`Hand-cell reconciliation failed: ${Object.keys(observedHands).length} observed / ${Object.keys(hands).length} complete`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output));
console.log(JSON.stringify({
  output: outputPath,
  bytes: fs.statSync(outputPath).size,
  charts: Object.keys(aggregates).length,
  observedHandCells: Object.keys(observedHands).length,
  handCells: Object.keys(hands).length,
  totalN,
  cardKnownN,
  cardKnownPct: output.meta.coverage.cardKnownPct,
  pearsonR: output.meta.abiCorrelation.pearsonR
}, null, 2));
