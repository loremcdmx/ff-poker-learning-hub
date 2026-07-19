import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultDataRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../data");
const manifestArgumentIndex = process.argv.indexOf("--manifest");
const dataArgumentIndex = process.argv.indexOf("--data-dir");
let dataRoot = dataArgumentIndex >= 0 ? process.argv[dataArgumentIndex + 1] : defaultDataRoot;
let sourceSpecs;

if (manifestArgumentIndex >= 0) {
  const manifestPath = process.argv[manifestArgumentIndex + 1];
  if (!manifestPath) throw new Error("--manifest requires a JSON path");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest.shards) || !manifest.shards.length) throw new Error("Strict opener manifest must contain non-empty shards[]");
  sourceSpecs = manifest.shards.map((shard) => ({
    path: shard.path,
    jobId: shard.jobId,
    windowStart: shard.windowStart,
    windowEnd: shard.windowEnd,
    querySha256: shard.querySha256
  }));
} else {
  const inputPath = process.argv[2];
  if (process.argv[3] && !process.argv[3].startsWith("--")) dataRoot = process.argv[3];
  const jobArgumentIndex = process.argv.indexOf("--job-id");
  const mcpJobId = jobArgumentIndex >= 0 ? process.argv[jobArgumentIndex + 1] : process.env.FF_RESTEAL_STRICT_JOB_ID;
  if (!inputPath || !mcpJobId) {
    throw new Error("Usage: node build-strict-opener-response.mjs <csv> [data-dir] --job-id <id>, or --manifest <json> [--data-dir <dir>]");
  }
  sourceSpecs = [{
    path: inputPath,
    jobId: mcpJobId,
    windowStart: "2026-01-01T00:00:00Z",
    windowEnd: "2026-07-17T00:00:00Z"
  }];
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
  const [header, ...values] = records;
  if (!header) throw new Error("CSV export is empty");
  return values
    .filter((candidate) => candidate.length === header.length)
    .map((candidate) => Object.fromEntries(header.map((name, index) => [name, candidate[index]])));
}

function number(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${label}: ${value}`);
  return parsed;
}

function round4(value) {
  return Number(Number(value || 0).toFixed(4));
}

function add(target, key, amount) {
  target[key] = (target[key] || 0) + amount;
}

function emptyResponse() {
  return { n: 0, folds: 0, calls: 0, reraises: 0 };
}

function responseSummary(record) {
  return {
    n_faced: record.n,
    fold_pct: round4(record.n ? record.folds / record.n : 0),
    continue_pct: round4(record.n ? (record.calls + record.reraises) / record.n : 0)
  };
}

function emptyCallRange() {
  return { n_total: 0, n_known_holecards: 0, unknown_holecards: 0, act_split: { C: 0, R: 0 }, hands: {} };
}

function addCallRange(target, row) {
  if (!['C', 'R'].includes(row.responseAction)) return;
  target.n_total += row.n;
  target.act_split[row.responseAction] += row.n;
  if (row.hand === "unknown") target.unknown_holecards += row.n;
  else target.n_known_holecards += row.n;
  add(target.hands, row.hand, row.n);
}

function responseKey(category, opener, depth) {
  return `${category}:${opener}:${depth}`;
}

const queryPath = resolve(dirname(fileURLToPath(import.meta.url)), "04_strict_opener_response.sql");
const queryTemplate = readFileSync(queryPath, "utf8");
const queryHash = createHash("sha256").update(queryTemplate).digest("hex");

function renderedQuerySha256(source) {
  const startDate = source.windowStart.slice(0, 10);
  const endDate = source.windowEnd.slice(0, 10);
  const end = new Date(source.windowEnd);
  const lastIncluded = new Date(end.getTime() - 1);
  const partitionEnd = new Date(Date.UTC(lastIncluded.getUTCFullYear(), lastIncluded.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const rendered = queryTemplate
    .replaceAll("2026-01-01", startDate)
    .replaceAll("2026-07-17", endDate)
    .replaceAll("2026-08-01", partitionEnd);
  return createHash("sha256").update(rendered).digest("hex");
}

sourceSpecs.sort((left, right) => String(left.windowStart).localeCompare(String(right.windowStart)));
for (const [index, source] of sourceSpecs.entries()) {
  if (!source.path || !source.jobId || !source.windowStart || !source.windowEnd) throw new Error(`Incomplete strict opener shard at index ${index}`);
  const start = Date.parse(source.windowStart);
  const end = Date.parse(source.windowEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error(`Invalid strict opener shard window ${source.windowStart}..${source.windowEnd}`);
  if (index > 0 && sourceSpecs[index - 1].windowEnd !== source.windowStart) {
    throw new Error(`Strict opener shard windows must be contiguous and disjoint: ${sourceSpecs[index - 1].windowEnd} != ${source.windowStart}`);
  }
  source.renderedQuerySha256 = renderedQuerySha256(source);
  if (source.querySha256 && source.querySha256 !== source.renderedQuerySha256) {
    throw new Error(`Rendered query SHA mismatch for shard ${source.windowStart}..${source.windowEnd}`);
  }
}
if (sourceSpecs.length > 1 && (sourceSpecs[0].windowStart !== "2026-01-01T00:00:00Z" || sourceSpecs.at(-1).windowEnd !== "2026-07-17T00:00:00Z")) {
  throw new Error("Strict opener shard manifest must cover exactly 2026-01-01..2026-07-17");
}

const sources = sourceSpecs.map((source, sourceIndex) => {
  const text = readFileSync(source.path, "utf8");
  const csvRows = parseCsv(text);
  const hash = createHash("sha256").update(text).digest("hex");
  const rows = csvRows.map((row) => ({
    category: row.category,
    openerPosition: row.opener_position,
    heroPosition: row.hero_position,
    openSizeBb: row.open_size_bb,
    depthBand: row.depth_band,
    responseAction: row.response_action,
    hand: row.hand || "unknown",
    n: number(row.response_count, "response_count"),
    uniqueHands: number(row.unique_hands, "unique_hands"),
    uniqueOpponents: number(row.unique_opponents, "unique_opponents"),
    firstHandAt: row.first_hand_at,
    lastHandAt: row.last_hand_at,
    sourceWindow: `${source.windowStart}..${source.windowEnd}`,
    sourceIndex,
    heroJamsTotal: number(row.hero_jams_total, "hero_jams_total"),
    candidateResponsesTotal: number(row.matched_opener_responses_total, "matched_opener_responses_total"),
    candidateUniqueHeroJamsTotal: number(row.matched_unique_hero_jams_total, "matched_unique_hero_jams_total"),
    maxCandidateResponsesPerHeroJam: number(row.max_responses_per_hero_jam, "max_responses_per_hero_jam")
  }));
  if (!rows.length) throw new Error(`Strict opener-response shard has no rows: ${source.path}`);
  if (rows.some((row) => row.n !== row.uniqueHands)) throw new Error(`One or more aggregate rows contain duplicate physical hands: ${source.path}`);

  const heroJamsTotal = rows[0].heroJamsTotal;
  const candidateResponsesTotal = rows[0].candidateResponsesTotal;
  const candidateUniqueHeroJamsTotal = rows[0].candidateUniqueHeroJamsTotal;
  const maxCandidateResponsesPerHeroJam = rows[0].maxCandidateResponsesPerHeroJam;
  if (rows.some((row) => row.heroJamsTotal !== heroJamsTotal || row.candidateResponsesTotal !== candidateResponsesTotal || row.candidateUniqueHeroJamsTotal !== candidateUniqueHeroJamsTotal || row.maxCandidateResponsesPerHeroJam !== maxCandidateResponsesPerHeroJam)) {
    throw new Error(`Repeated export controls are inconsistent: ${source.path}`);
  }
  const responseTotal = rows.reduce((sum, row) => sum + row.n, 0);
  const uniqueResponseTotal = rows.reduce((sum, row) => sum + row.uniqueHands, 0);
  if (responseTotal !== uniqueResponseTotal) throw new Error(`Strict output contains a repeated Hero jam in ${source.path}: ${responseTotal} != ${uniqueResponseTotal}`);
  if (candidateResponsesTotal < candidateUniqueHeroJamsTotal || maxCandidateResponsesPerHeroJam < 1 || maxCandidateResponsesPerHeroJam > 2) {
    throw new Error(`Candidate opener controls are inconsistent in ${source.path}`);
  }
  const ambiguousHeroJamsTotal = candidateResponsesTotal - candidateUniqueHeroJamsTotal;
  const expectedStrictResponsesTotal = candidateUniqueHeroJamsTotal - ambiguousHeroJamsTotal;
  if (responseTotal !== expectedStrictResponsesTotal) {
    throw new Error(`Strict one-to-one response reconciliation failed in ${source.path}: ${responseTotal} != ${expectedStrictResponsesTotal}`);
  }
  const ambiguousCandidateResponsesTotal = candidateResponsesTotal - responseTotal;
  if ((ambiguousHeroJamsTotal === 0) !== (maxCandidateResponsesPerHeroJam === 1)) {
    throw new Error(`Ambiguous opener controls disagree with candidate maximum in ${source.path}`);
  }
  const ambiguityPct = heroJamsTotal ? ambiguousHeroJamsTotal / heroJamsTotal * 100 : 0;
  if (ambiguityPct > 1) throw new Error(`Too many ambiguous original-opener matches in ${source.path}: ${round4(ambiguityPct)}%`);
  const matchedResponsesTotal = responseTotal;
  const matchedUniqueHeroJamsTotal = uniqueResponseTotal;
  const maxResponsesPerHeroJam = matchedResponsesTotal ? 1 : 0;
  if (matchedResponsesTotal > heroJamsTotal) throw new Error(`Matched opener responses exceed Hero jams: ${source.path}`);
  const matchPct = heroJamsTotal ? matchedResponsesTotal / heroJamsTotal * 100 : 0;
  if (matchPct < 50 || matchPct > 100) throw new Error(`Unexpected strict opener match coverage in ${source.path}: ${round4(matchPct)}%`);
  return {
    ...source,
    csvRows,
    rows,
    hash,
    controls: {
      heroJamsTotal,
      candidateResponsesTotal,
      candidateUniqueHeroJamsTotal,
      ambiguousHeroJamsTotal,
      ambiguousCandidateResponsesTotal,
      maxCandidateResponsesPerHeroJam,
      matchedResponsesTotal,
      matchedUniqueHeroJamsTotal,
      maxResponsesPerHeroJam,
      matchPct: round4(matchPct),
      ambiguityPct: round4(ambiguityPct)
    }
  };
});

const rows = sources.flatMap((source) => source.rows);
const sourceRows = sources.flatMap((source) => source.csvRows);
const heroJamsTotal = sources.reduce((sum, source) => sum + source.controls.heroJamsTotal, 0);
const candidateResponsesTotal = sources.reduce((sum, source) => sum + source.controls.candidateResponsesTotal, 0);
const candidateUniqueHeroJamsTotal = sources.reduce((sum, source) => sum + source.controls.candidateUniqueHeroJamsTotal, 0);
const ambiguousHeroJamsTotal = sources.reduce((sum, source) => sum + source.controls.ambiguousHeroJamsTotal, 0);
const ambiguousCandidateResponsesTotal = sources.reduce((sum, source) => sum + source.controls.ambiguousCandidateResponsesTotal, 0);
const maxCandidateResponsesPerHeroJam = Math.max(...sources.map((source) => source.controls.maxCandidateResponsesPerHeroJam));
const matchedResponsesTotal = sources.reduce((sum, source) => sum + source.controls.matchedResponsesTotal, 0);
const matchedUniqueHeroJamsTotal = sources.reduce((sum, source) => sum + source.controls.matchedUniqueHeroJamsTotal, 0);
const maxResponsesPerHeroJam = Math.max(...sources.map((source) => source.controls.maxResponsesPerHeroJam));
const responseTotal = rows.reduce((sum, row) => sum + row.n, 0);
const uniqueResponseTotal = rows.reduce((sum, row) => sum + row.uniqueHands, 0);
if (responseTotal !== matchedResponsesTotal || uniqueResponseTotal !== matchedUniqueHeroJamsTotal) throw new Error("Combined strict opener shard reconciliation failed");
const matchPct = heroJamsTotal ? matchedResponsesTotal / heroJamsTotal * 100 : 0;
const sourceHash = createHash("sha256").update(JSON.stringify(sources.map((source) => ({
  windowStart: source.windowStart,
  windowEnd: source.windowEnd,
  jobId: source.jobId,
  querySha256: source.renderedQuerySha256,
  sha256: source.hash,
  csvRows: source.csvRows.length
})))).digest("hex");

const categories = [...new Set(rows.map((row) => row.category))].sort();
const superGroupMap = {
  good_reg: "reg",
  mid_reg: "reg",
  weak_reg: "reg",
  nit: "reg",
  aggro_fish: "fish",
  passive_fish: "fish",
  semipassive_fish: "fish",
  aggro_sticky: "fish",
  aggro_foldy: "fish",
  unknown: "unknown"
};

const responseByPositionBand = {};
const responseByBand = {};
const responsePooled = {};
const responseAccumulator = new Map();
const bandAccumulator = new Map();
const pooledAccumulator = new Map();
const callByCategory = Object.fromEntries(categories.map((category) => [category, emptyCallRange()]));
const callBySuperGroup = { fish: emptyCallRange(), reg: emptyCallRange(), unknown: emptyCallRange() };
const callPooled = emptyCallRange();

for (const row of rows) {
  const positionKey = responseKey(row.category, row.openerPosition, row.depthBand);
  const bandKey = `${row.category}:${row.depthBand}`;
  const positionRecord = responseAccumulator.get(positionKey) || emptyResponse();
  const bandRecord = bandAccumulator.get(bandKey) || emptyResponse();
  const pooledRecord = pooledAccumulator.get(row.category) || emptyResponse();
  for (const target of [positionRecord, bandRecord, pooledRecord]) {
    target.n += row.n;
    if (row.responseAction === "F") target.folds += row.n;
    else if (row.responseAction === "C") target.calls += row.n;
    else if (row.responseAction === "R") target.reraises += row.n;
  }
  responseAccumulator.set(positionKey, positionRecord);
  bandAccumulator.set(bandKey, bandRecord);
  pooledAccumulator.set(row.category, pooledRecord);

  addCallRange(callByCategory[row.category], row);
  addCallRange(callBySuperGroup[superGroupMap[row.category] || "unknown"], row);
  addCallRange(callPooled, row);
}

for (const category of categories) {
  responseByPositionBand[category] = {};
  for (const opener of ["BTN", "CO"]) {
    responseByPositionBand[category][opener] = {};
    for (const depth of ["25-30", "30-35", "35-40"]) {
      responseByPositionBand[category][opener][depth] = responseSummary(responseAccumulator.get(responseKey(category, opener, depth)) || emptyResponse());
    }
  }
  responseByBand[category] = {};
  for (const depth of ["25-30", "30-35", "35-40"]) {
    responseByBand[category][depth] = responseSummary(bandAccumulator.get(`${category}:${depth}`) || emptyResponse());
  }
  responsePooled[category] = responseSummary(pooledAccumulator.get(category) || emptyResponse());
}

const commonSource = {
  window: "2026-01-01T00:00:00Z..2026-07-17T00:00:00Z",
  query: "assets/poker-resteal-lesson/tools/04_strict_opener_response.sql",
  templateQuerySha256: queryHash,
  ...(sources.length === 1 ? { mcpJobId: sources[0].jobId, csvFile: basename(sources[0].path), querySha256: sources[0].renderedQuerySha256 } : {}),
  mcpJobIds: sources.map((source) => source.jobId),
  csvFiles: sources.map((source) => basename(source.path)),
  csvRows: sourceRows.length,
  sha256: sourceHash,
  shards: sources.map((source) => ({
    windowStart: source.windowStart,
    windowEnd: source.windowEnd,
    mcpJobId: source.jobId,
    querySha256: source.renderedQuerySha256,
    csvFile: basename(source.path),
    csvRows: source.csvRows.length,
    sha256: source.hash,
    ...source.controls
  })),
  heroJamsTotal,
  candidateResponsesTotal,
  candidateUniqueHeroJamsTotal,
  ambiguousHeroJamsTotal,
  ambiguousCandidateResponsesTotal,
  ambiguityPct: round4(heroJamsTotal ? ambiguousHeroJamsTotal / heroJamsTotal * 100 : 0),
  maxCandidateResponsesPerHeroJam,
  matchedOpenerResponsesTotal: matchedResponsesTotal,
  matchPct: round4(matchPct),
  matchedUniqueHeroJamsTotal,
  maxResponsesPerHeroJam
};

const detailed = {
  meta: {
    version: "2026-07-17.1",
    description: "Original CO/BTN opener response to a direct SB/BB resteal jam; observed field behavior, not a strategy target.",
    spot: "No limpers; Hero SB/BB direct all-in versus original CO/BTN open 2/2.5/3 BB; effective stack 25–40 BB; 3–9 max.",
    actions: { F: "fold", C: "call", R: "technical-continuation-code" },
    samplePolicy: "The runtime falls back from a category to its reg/fish super-group below 500 known continuing hole cards.",
    source: commonSource
  },
  rows: rows.map(({ heroJamsTotal: _hero, candidateResponsesTotal: _candidates, candidateUniqueHeroJamsTotal: _candidateUnique, maxCandidateResponsesPerHeroJam: _candidateMax, ...row }) => row)
};

const vsJam = {
  meta: {
    deliverable: "field_vs_jam",
    version: "2026-07-17-strict-opener-v2",
    description: "Observed response of the original opener to Hero's direct resteal jam.",
    spot: detailed.meta.spot,
    value_convention: "fold_pct / continue_pct are fractions in [0,1].",
    source: commonSource
  },
  by_position_band: responseByPositionBand,
  by_band: responseByBand,
  pooled: responsePooled
};

const callRange = {
  meta: {
    deliverable: "field_call_range",
    version: "2026-07-17-strict-opener-v2",
    description: "Observed hole cards with which the original opener continues against Hero's direct resteal jam.",
    continue_def: "preflop_face_3bet_action IN ('C','R') for the original CO/BTN opener only.",
    note_unknown_holecards: "Unknown cards stay in totals and are excluded from n_known_holecards.",
    super_group_map: superGroupMap,
    small_categories_lt500_calls: Object.fromEntries(Object.entries(callByCategory).filter(([, row]) => row.n_known_holecards < 500).map(([key, row]) => [key, row.n_known_holecards])),
    source: commonSource
  },
  by_category: callByCategory,
  super_groups: callBySuperGroup,
  pooled: callPooled
};

mkdirSync(dataRoot, { recursive: true });
const writes = [
  ["field-opener-response.json", detailed],
  ["field_vs_jam.json", vsJam],
  ["field_call_range.json", callRange]
];
for (const [name, value] of writes) writeFileSync(resolve(dataRoot, name), JSON.stringify(value));

console.log(JSON.stringify({
  dataRoot,
  files: Object.fromEntries(writes.map(([name]) => [name, statSync(resolve(dataRoot, name)).size])),
  rows: rows.length,
  responseTotal,
  heroJamsTotal,
  matchedResponsesTotal,
  matchPct: commonSource.matchPct,
  callKnown: callPooled.n_known_holecards,
  categories
}, null, 2));
