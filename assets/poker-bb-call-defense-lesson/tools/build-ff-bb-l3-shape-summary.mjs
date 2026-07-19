import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2];
const outputPath = process.argv[3] || path.resolve(here, "../data/ff-bb-l3-shape-summary.json");

if (!inputPath) {
  throw new Error("Usage: node build-ff-bb-l3-shape-summary.mjs <clickhouse-export.csv> [output.json]");
}

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const header = headerLine.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [header[index], value])));
}

function round(value, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

const equity = JSON.parse(fs.readFileSync(path.resolve(here, "../../poker-resteal-lesson/data/equity169.json"), "utf8"));
const handIndex = new Map(equity.hands.map((hand, index) => [hand, index]));
const rfiSource = fs.readFileSync(path.resolve(here, "../../poker-rfi-open-lesson/field-action-data.js"), "utf8");
const rfiAssignment = rfiSource.indexOf("window.PokerRfiFieldActionData");
const rfiObjectStart = rfiSource.indexOf("{", rfiAssignment);
const rfiObjectEnd = rfiSource.lastIndexOf("};");
if (rfiAssignment < 0 || rfiObjectStart < 0 || rfiObjectEnd < 0) {
  throw new Error("Could not find PokerRfiFieldActionData payload");
}
const rfiData = JSON.parse(rfiSource.slice(rfiObjectStart, rfiObjectEnd + 1));

function decodeU16(value) {
  const bytes = Buffer.from(value, "base64");
  const output = new Uint16Array(bytes.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = bytes[index * 2] | (bytes[index * 2 + 1] << 8);
  }
  return output;
}

const l3BtnChart = rfiData.cohorts.l3.charts["30-70"].BTN;
const regularRaiseCounts = decodeU16(l3BtnChart.r);
const openShoveCounts = decodeU16(l3BtnChart.j);
const fieldHandIndex = new Map(rfiData.handOrder.map((hand, index) => [hand, index]));
const observedOpenCounts = new Map(equity.hands.map((hand) => {
  const index = fieldHandIndex.get(hand);
  return [hand, regularRaiseCounts[index] + openShoveCounts[index]];
}));
const observedOpenHands = Array.from(observedOpenCounts.values()).reduce((sum, count) => sum + count, 0);

function equityAgainstObservedL3BtnRange(hero) {
  const heroIndex = handIndex.get(hero);
  let weightedEquity = 0;
  for (const villain of equity.hands) {
    weightedEquity += equity.equity[heroIndex][handIndex.get(villain)] * observedOpenCounts.get(villain);
  }
  return weightedEquity / observedOpenHands * 100;
}

const rows = new Map(parseCsv(fs.readFileSync(inputPath, "utf8")).map((row) => {
  const record = {
    hand: row.hand,
    n: Number(row.hand_count),
    players: Number(row.unique_players),
    meanPotAfterCallBb: Number(row.mean_pot_after_call_bb),
    realizedSharePct: Number(row.realized_equity_pct),
    rawEquityPct: equityAgainstObservedL3BtnRange(row.hand)
  };
  return [record.hand, record];
}));

if (rows.size !== 169) throw new Error(`Expected 169 hand rows, received ${rows.size}`);

const rankOrder = "AKQJT98765432";
const minCallsPerCell = 500;
const pairs = [];
for (let first = 0; first < rankOrder.length; first += 1) {
  for (let second = first + 1; second < rankOrder.length; second += 1) {
    const stem = rankOrder[first] + rankOrder[second];
    const suited = rows.get(`${stem}s`);
    const offsuit = rows.get(`${stem}o`);
    if (suited.n < minCallsPerCell || offsuit.n < minCallsPerCell) continue;
    pairs.push({ suited, offsuit, matchedN: Math.min(suited.n, offsuit.n) });
  }
}

function aggregate(side) {
  let rawEquitySum = 0;
  let realizedNumerator = 0;
  let realizedDenominator = 0;
  let matchedCalls = 0;
  for (const pair of pairs) {
    const record = pair[side];
    const scale = pair.matchedN / record.n;
    rawEquitySum += record.rawEquityPct * pair.matchedN;
    realizedNumerator += record.realizedSharePct / 100 * record.meanPotAfterCallBb * record.n * scale;
    realizedDenominator += record.meanPotAfterCallBb * record.n * scale;
    matchedCalls += pair.matchedN;
  }
  const rawEquityPct = rawEquitySum / matchedCalls;
  const realizedSharePct = realizedNumerator / realizedDenominator * 100;
  return {
    matchedCalls,
    rawEquityPct: round(rawEquityPct),
    realizedSharePct: round(realizedSharePct),
    equityRealizationPct: round(realizedSharePct / rawEquityPct * 100)
  };
}

const suited = aggregate("suited");
const offsuit = aggregate("offsuit");
const output = {
  schema: "ff-bb-l3-shape-summary-v1",
  version: "2026-07-18.1",
  meta: {
    window: { startInclusive: "2026-01-01T00:00:00Z", endExclusive: "2026-07-17T00:00:00Z" },
    cohort: "League 3 at hand time · ranks 11–15 · real FF players",
    spot: "BB call vs one BTN opener to 2 BB · 40–70 BB effective · heads-up flop · 3–9 max",
    rawEquityModel: "169×169 preflop all-in equity matrix weighted by observed League-3 30–70 BB BTN opens",
    openerRange: {
      cohort: "current active real League 3",
      window: rfiData.methodology.period,
      table: rfiData.methodology.table,
      stack: "30–70 BB",
      position: "BTN",
      rfiPct: l3BtnChart.rfiPct,
      observedOpenHands
    },
    observedRealization: "all-in-adjusted net EV converted to equivalent pot share after actual calls",
    matching: `${pairs.length} same-rank suited/offsuit pairs · minimum ${minCallsPerCell} EV-ready calls in each cell · each pair balanced to its smaller cell`,
    caveat: "Raw equity and observed realization use separately documented League-3 source contracts. Realization is conditional on an actual call and is descriptive, not a strategy target or a causal suitedness estimate.",
    source: {
      rankJobId: "mcp_bq_job_c10205250a32416593375f1c6d68a6c4",
      realizationJobId: "mcp_ch_job_3058947119da4ab3aba57e12173e125f",
      openerRangeJobId: rfiData.methodology.sourceSnapshot.actionJobId,
      openerRangeVersion: rfiData.version,
      query: "assets/poker-bb-call-defense-lesson/tools/q_ff_l3_shape_realization.sql"
    }
  },
  comparison: {
    eligiblePairs: pairs.length,
    minCallsPerCell,
    matchedCallsPerGroup: suited.matchedCalls,
    observedBtnOpenHands: observedOpenHands,
    observedBtnRfiPct: l3BtnChart.rfiPct,
    suited,
    offsuit,
    delta: {
      rawEquityPp: round(suited.rawEquityPct - offsuit.rawEquityPct),
      equityRealizationPp: round(suited.equityRealizationPct - offsuit.equityRealizationPct)
    }
  }
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ output: outputPath, comparison: output.comparison }, null, 2));
