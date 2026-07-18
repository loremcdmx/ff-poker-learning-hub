import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../data/ff-bb-call-realization.json"
);

if (!inputPath) {
  throw new Error("Usage: node build-ff-realization.mjs <clickhouse-export.csv> [output.json]");
}

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
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      records.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
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
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${field}: ${value}`);
  return parsed;
}

function sizeKey(value) {
  return numeric(value, "open_size_bb").toFixed(1).replace(".", "_");
}

function primaryStats(row) {
  return {
    n: numeric(row.hand_count, "hand_count"),
    players: numeric(row.unique_players, "unique_players"),
    meanNetEvBb: numeric(row.avg_chips_ev_bb, "avg_chips_ev_bb"),
    meanHeroAnteBb: numeric(row.mean_hero_ante_bb, "mean_hero_ante_bb"),
    meanPotAfterCallBb: numeric(row.mean_pot_after_call_bb, "mean_pot_after_call_bb"),
    meanRealizedEquityPct: numeric(row.realized_equity_pct, "realized_equity_pct"),
    meanEvVsFoldBb: numeric(row.mean_ev_vs_fold_bb, "mean_ev_vs_fold_bb")
  };
}

function diagnosticStats(row) {
  return {
    n: numeric(row.hand_count, "hand_count"),
    players: numeric(row.unique_players, "unique_players"),
    meanRealizedEquityPct: numeric(row.realized_equity_pct, "realized_equity_pct"),
    meanEvVsFoldBb: numeric(row.mean_ev_vs_fold_bb, "mean_ev_vs_fold_bb")
  };
}

const sourceText = fs.readFileSync(inputPath, "utf8");
const sourceRows = parseCsv(sourceText);
const sourceSha256 = crypto.createHash("sha256").update(sourceText).digest("hex");
const stackBuckets = ["0_40", "40_70", "70_plus"];
const output = {
  meta: {
    version: "2026-07-17.1",
    window: {
      startInclusive: "2026-01-01T00:00:00",
      endExclusive: "2026-07-17T00:00:00"
    },
    snapshot: "2026-07-17",
    scope: "FF tracker · BB call vs one raiser · heads-up flop · effective stack 0–40 / 40–70 / 70+ BB · open 2.0/2.5/3.0 BB ±0.05",
    stackBuckets: {
      "0_40": "0–40 BB",
      "40_70": "40–70 BB",
      "70_plus": "70 BB+"
    },
    compatibilityStackBucket: "25_40",
    primaryCohort: "all_ff_3_9max",
    primaryCohortLabel: "Все столы FF 3–9 max",
    diagnosticCohort: "exact_7max",
    diagnosticCohortLabel: "Только 7-max; subset общего 3–9 max, не добавляется повторно",
    minDisplayN: 500,
    minReliableN: 2000,
    passBaseline: "fold = -(1 BB + hero ante); meanEvVsFoldBb = meanNetEvBb + 1 + meanHeroAnteBb",
    realizedEquityFormula: "SUM(netEvBb + openBb + heroAnteBb) / SUM(2*openBb + 0.5 + totalAnteBb)",
    totalAnteMethod: "hero ante per player × cnt_players",
    source: {
      hands: "analytics.int_tracker_hand_joined",
      query: "assets/poker-bb-call-defense-lesson/tools/q_ff_realization.sql",
      mcpJobId: "mcp_ch_job_7aa792eb4d33408091aafc334479202f",
      file: path.basename(inputPath),
      sha256: sourceSha256,
      csvRows: sourceRows.length
    },
    knowledgeContext: {
      entryId: "1a324dc9-3cc3-421a-b71c-fee46c00dac2",
      status: "validated",
      rule: "Per-hand EV is aggregated with hand weighting; pre-aggregated rates are never averaged unweighted."
    }
  },
  rows: {}
};

for (const row of sourceRows) {
  if (row.cohort !== "all_ff_3_9max") continue;
  if (![...stackBuckets, "25_40"].includes(row.stack_bucket)) continue;
  const key = `${row.stack_bucket}:${sizeKey(row.open_size_bb)}:${row.opener_position}:${row.holecards_str}`;
  if (output.rows[key]) throw new Error(`Duplicate primary key: ${key}`);
  output.rows[key] = primaryStats(row);
}

for (const row of sourceRows) {
  if (row.cohort !== "exact_7max") continue;
  const key = `${row.stack_bucket}:${sizeKey(row.open_size_bb)}:${row.opener_position}:${row.holecards_str}`;
  const target = output.rows[key];
  if (!target) continue;
  if (target.exact7) throw new Error(`Duplicate exact7 key: ${key}`);
  target.exact7 = diagnosticStats(row);
}

const keys = Object.keys(output.rows);
const coverageByStack = Object.fromEntries([...stackBuckets, "25_40"].map((stackBucket) => {
  const stackKeys = keys.filter((key) => key.startsWith(`${stackBucket}:`));
  return [stackBucket, {
    observedCells: stackKeys.length,
    hands: stackKeys.reduce((sum, key) => sum + output.rows[key].n, 0),
    cellsAtOrAboveMinDisplayN: stackKeys.filter((key) => output.rows[key].n >= output.meta.minDisplayN).length,
    cellsAtOrAboveMinReliableN: stackKeys.filter((key) => output.rows[key].n >= output.meta.minReliableN).length
  }];
}));
output.meta.coverage = {
  byStack: coverageByStack,
  broadObservedCells: stackBuckets.reduce((sum, key) => sum + coverageByStack[key].observedCells, 0),
  broadHands: stackBuckets.reduce((sum, key) => sum + coverageByStack[key].hands, 0),
  expectedGridCellsPerStack: 169 * 5 * 3
};

const expected = {
  "0_40": { observedCells: 2509, hands: 2236490 },
  "40_70": { observedCells: 2470, hands: 1279289 },
  "70_plus": { observedCells: 2495, hands: 1342346 }
};
for (const stackBucket of stackBuckets) {
  const actual = coverageByStack[stackBucket];
  const frozen = expected[stackBucket];
  if (actual.observedCells !== frozen.observedCells || actual.hands !== frozen.hands) {
    throw new Error(`Snapshot reconciliation failed for ${stackBucket}: ${actual.observedCells} cells / ${actual.hands} hands`);
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output));
console.log(JSON.stringify({ output: outputPath, bytes: fs.statSync(outputPath).size, ...output.meta.coverage }, null, 2));
