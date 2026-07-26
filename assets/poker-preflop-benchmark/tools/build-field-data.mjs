import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const readinessContract = require(resolve(toolDir, "../readiness.js"));
const input = process.argv[2];
const sbOverrideFlag = process.argv.indexOf("--sb-unopened");
const sbOverride = sbOverrideFlag >= 0 ? process.argv[sbOverrideFlag + 1] : "";
const freeOverrideFlag = process.argv.indexOf("--vs-raise-free");
const freeOverride = freeOverrideFlag >= 0 ? process.argv[freeOverrideFlag + 1] : "";
const windowStartFlag = process.argv.indexOf("--window-start");
const mainWindowStart = windowStartFlag >= 0 ? process.argv[windowStartFlag + 1] : "2023-09-01T00:00:00Z";
const outputFlag = process.argv.indexOf("--output");
const outputOverride = outputFlag >= 0 ? process.argv[outputFlag + 1] : "";
const sourceManifestFlag = process.argv.indexOf("--source-manifest");
const sourceManifestPath = sourceManifestFlag >= 0 ? process.argv[sourceManifestFlag + 1] : "";
if (!input) throw new Error("Usage: node build-field-data.mjs <msp-cube.csv> [--window-start <ISO>] [--vs-raise-free <fine-stack.csv>] [--sb-unopened <full-history-sb.csv>] [--source-manifest <json>] [--output <field-data.js>]");
if (sbOverrideFlag >= 0 && !sbOverride) throw new Error("--sb-unopened requires a CSV path");
if (freeOverrideFlag >= 0 && !freeOverride) throw new Error("--vs-raise-free requires a CSV path");
if (windowStartFlag >= 0 && !mainWindowStart) throw new Error("--window-start requires an ISO timestamp");
if (outputFlag >= 0 && !outputOverride) throw new Error("--output requires a file path");
if (sourceManifestFlag >= 0 && !sourceManifestPath) throw new Error("--source-manifest requires a JSON path");
const output = outputOverride ? resolve(outputOverride) : resolve(toolDir, "../field-data.js");
const sourceManifest = sourceManifestPath ? JSON.parse(readFileSync(resolve(sourceManifestPath), "utf8")) : null;
if (sourceManifest && (freeOverride || sbOverride)) {
  throw new Error("A provenance-ready build cannot use legacy override CSVs; merge every trainer into the manifest-bound full-window cube first");
}
const MIN_SLICE_ACTIONS = 100;
const MIN_HAND_ACTIONS = readinessContract.MIN_HAND_OPPORTUNITIES;
const VALID_HAND = /^(?:([AKQJT98765432])\1|[AKQJT98765432]{2}[so])$/;
const columns = ["folds", "calls", "raises", "jams"];

function parseCsv(source) {
  const lines = source.trim().split(/\r?\n/);
  const header = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(header.map((key, index) => [key, values[index]]));
  });
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function assertHex(value, label) {
  if (!/^[a-f0-9]{64}$/.test(String(value || ""))) throw new Error(`${label} must be a SHA-256 hash`);
}

function validateSourceManifest(manifest, sourceText, sourceRows) {
  if (!manifest) return null;
  if (manifest.schema !== "ff-preflop-benchmark-action-cube-source-v1") throw new Error(`Unexpected source manifest schema: ${manifest.schema || "missing"}`);
  if (manifest.analysisWindow?.startInclusive !== mainWindowStart || manifest.analysisWindow?.endExclusive !== "2026-07-22T00:00:00Z") {
    throw new Error("Source manifest analysis window does not match the generated payload");
  }
  if (!new Set(["sync", "async"]).has(manifest.rankBridge?.executionMode)
    || !Number.isSafeInteger(manifest.rankBridge.rows) || !Number.isSafeInteger(manifest.rankBridge.usableRows)
    || !Number.isSafeInteger(manifest.rankBridge.byteSize) || manifest.rankBridge.byteSize <= 0
    || manifest.rankBridge.truncated !== false) {
    throw new Error("Source manifest must record the rank bridge job and row counts");
  }
  assertHex(manifest.rankBridge.sha256, "rankBridge.sha256");
  const rankQueryTemplateSource = readFileSync(resolve(toolDir, "msp-preflop-rank-bridge.sql"), "utf8");
  assertHex(manifest.rankBridge.queryTemplate?.sha256, "rankBridge.queryTemplate.sha256");
  if (manifest.rankBridge.queryTemplate?.file !== "tools/msp-preflop-rank-bridge.sql"
    || manifest.rankBridge.queryTemplate.sha256 !== sha256(rankQueryTemplateSource)) {
    throw new Error("Source manifest rank bridge does not match the canonical full-rank extractor");
  }
  if (manifest.rankBridge.executionMode === "sync") {
    if (manifest.rankBridge.queryJobId !== `sync:${manifest.rankBridge.queryTemplate.sha256}`) throw new Error("Source manifest sync rank bridge id differs from its canonical query hash");
  } else if (!/^mcp_bq_job_[a-f0-9]+$/.test(manifest.rankBridge.queryJobId || "")) {
    throw new Error("Source manifest async rank bridge must keep the original BigQuery job id");
  }
  const templateSource = readFileSync(resolve(toolDir, "msp-preflop-action-cube.sql"), "utf8");
  assertHex(manifest.queryTemplate?.sha256, "queryTemplate.sha256");
  if (manifest.queryTemplate.file !== "tools/msp-preflop-action-cube.sql" || manifest.queryTemplate.sha256 !== sha256(templateSource)) {
    throw new Error("Source manifest query template does not match the checked-in extractor");
  }
  if (manifest.partitionAxis !== "time") throw new Error("Published action cube must declare disjoint time shards");
  if (!Array.isArray(manifest.shards) || manifest.shards.length < 2) throw new Error("Source manifest must list every disjoint action-cube shard");
  const shardCount = manifest.shards[0]?.shardCount;
  if (!Number.isSafeInteger(shardCount) || shardCount !== manifest.shards.length) throw new Error("Source manifest shard count is incomplete");
  const shardIndexes = new Set();
  const queryJobIds = new Set();
  for (const shard of manifest.shards) {
    if (!Number.isSafeInteger(shard.shardIndex) || shard.shardIndex < 0 || shard.shardIndex >= shardCount) throw new Error("Source manifest contains an invalid shard index");
    if (shard.shardCount !== shardCount) throw new Error("Source manifest mixes incompatible shard counts");
    if (!new Set(["sync", "async"]).has(shard.executionMode) || queryJobIds.has(shard.queryJobId)) throw new Error("Source manifest execution modes and query job ids must be honest and unique");
    assertHex(shard.querySha256, `shard ${shard.shardIndex} querySha256`);
    assertHex(shard.resultSha256, `shard ${shard.shardIndex} resultSha256`);
    if (shard.executionMode === "sync" && shard.queryJobId !== `sync:${shard.querySha256}`) {
      throw new Error(`Source manifest shard ${shard.shardIndex} sync execution id differs from querySha256`);
    } else if (shard.executionMode === "async" && !/^mcp_ch_job_[a-f0-9]+$/.test(shard.queryJobId || "")) {
      throw new Error(`Source manifest shard ${shard.shardIndex} must keep the original ClickHouse job id`);
    }
    if (!Number.isSafeInteger(shard.rowCount) || shard.rowCount <= 0 || !Number.isSafeInteger(shard.byteSize) || shard.byteSize <= 0 || shard.truncated !== false) {
      throw new Error(`Source manifest shard ${shard.shardIndex} must record a complete non-empty export`);
    }
    if (!Number.isSafeInteger(shard.durationMs) || shard.durationMs <= 0) throw new Error(`Source manifest shard ${shard.shardIndex} must record a positive runtime`);
    if (!Number.isFinite(Date.parse(shard.windowStartInclusive)) || !Number.isFinite(Date.parse(shard.windowEndExclusive)) || Date.parse(shard.windowStartInclusive) >= Date.parse(shard.windowEndExclusive)) {
      throw new Error(`Source manifest shard ${shard.shardIndex} has an invalid half-open window`);
    }
    shardIndexes.add(shard.shardIndex);
    queryJobIds.add(shard.queryJobId);
  }
  if (shardIndexes.size !== shardCount || [...Array(shardCount).keys()].some((index) => !shardIndexes.has(index))) throw new Error("Source manifest does not cover every shard exactly once");
  const orderedWindows = [...manifest.shards].sort((left, right) => Date.parse(left.windowStartInclusive) - Date.parse(right.windowStartInclusive));
  if (orderedWindows[0].windowStartInclusive !== manifest.analysisWindow.startInclusive || orderedWindows.at(-1).windowEndExclusive !== manifest.analysisWindow.endExclusive) {
    throw new Error("Source manifest shard windows do not cover the analysis bounds");
  }
  for (let index = 1; index < orderedWindows.length; index += 1) {
    if (orderedWindows[index - 1].windowEndExclusive !== orderedWindows[index].windowStartInclusive) throw new Error("Source manifest shard windows overlap or leave a gap");
  }
  assertHex(manifest.merged?.sha256, "merged.sha256");
  if (manifest.merged.sha256 !== sha256(sourceText)) throw new Error("Source manifest merged SHA-256 does not match the action cube");
  if (manifest.merged.rows !== sourceRows.length) throw new Error("Source manifest merged row count does not match the action cube");
  if (manifest.merged.rows > manifest.shards.reduce((sum, shard) => sum + shard.rowCount, 0)) {
    throw new Error("Source manifest merged row count exceeds the source shards");
  }
  const opportunities = sourceRows.reduce((sum, row) => sum + Number(row.opportunities || 0), 0);
  if (manifest.merged.opportunities !== opportunities) throw new Error("Source manifest opportunity count does not match the action cube");
  if (JSON.stringify(manifest.coverage) !== JSON.stringify({
    minimumHandOpportunities: MIN_HAND_ACTIONS,
    nearFloorException: readinessContract.NEAR_FLOOR_EXCEPTION,
    requiredHands: readinessContract.REQUIRED_HANDS,
    comparedCohorts: readinessContract.COHORT_KEYS,
  })) {
    throw new Error("Source manifest coverage policy does not match the publication gate");
  }
  if (JSON.stringify(manifest.ignoredNonAdditiveColumns) !== JSON.stringify(["players", "months"])) {
    throw new Error("Source manifest must record that distinct players/months are not additive across shards");
  }
  if (JSON.stringify(manifest).includes("private_player_ids")) throw new Error("Source manifest cannot publish private player identifiers");
  return manifest;
}

const baseSource = readFileSync(resolve(input), "utf8");
const baseRows = parseCsv(baseSource);
const sourceProvenance = validateSourceManifest(sourceManifest, baseSource, baseRows);
let rows = baseRows;
if (freeOverride) {
  const freeRows = parseCsv(readFileSync(resolve(freeOverride), "utf8")).filter((row) => row.trainer === "vs_raise_free");
  rows = rows.filter((row) => row.trainer !== "vs_raise_free").concat(freeRows);
}
if (sbOverride) {
  const sbRows = parseCsv(readFileSync(resolve(sbOverride), "utf8")).filter((row) => row.trainer === "sb_unopened");
  rows = rows.filter((row) => row.trainer !== "sb_unopened").concat(sbRows);
}
const grouped = new Map();
const sourceRowsSeen = new Map();
const rawSourceRowsSeen = new Set();
const requiredSpots = Object.fromEntries(Object.entries(readinessContract.REQUIRED_SPOT_MATRIX)
  .map(([trainer, spots]) => [trainer, new Set(spots)]));
for (const row of rows) {
  if (!readinessContract.TRAINER_KEYS.includes(row.trainer)) throw new Error(`Unexpected trainer: ${row.trainer || "missing"}`);
  if (!readinessContract.COHORT_KEYS.includes(row.cohort)) throw new Error(`Unexpected cohort: ${row.cohort || "missing"}`);
  // The tracker has two adjacent middle-position indices (3 and 4), while the
  // learner-facing 7-max table exposes only one MP seat. When both collapse to
  // `MP`, the earlier seat is the table's EP seat; keeping `MP vs MP` would make
  // Hero look like the opener and incorrectly subtract the raise from Hero.
  if (row.trainer === "vs_raise_free" && row.hero_position === row.opener_position && row.hero_position !== "MP") {
    throw new Error(`Impossible collapsed position pair: ${row.hero_position} vs ${row.opener_position}`);
  }
  const opener = row.trainer === "sb_unopened"
    ? "—"
    : row.trainer === "vs_raise_free" && row.hero_position === "MP" && row.opener_position === "MP"
      ? "EP"
      : row.opener_position;
  const size = row.trainer === "sb_unopened" ? "—" : row.open_size;
  const exactSpot = [row.hero_position, opener, size, row.stack_bucket].join("|");
  if (!requiredSpots[row.trainer].has(exactSpot)) throw new Error(`Unexpected selector state: ${row.trainer}/${exactSpot}`);
  if (!VALID_HAND.test(row.hand_class || "")) throw new Error(`Invalid or missing hand class: ${row.hand_class || "missing"}`);
  const opportunities = Number(row.opportunities);
  const counts = columns.map((column) => Number(row[column]));
  const other = Number(row.other || 0);
  if (![opportunities, other, ...counts].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error(`Non-integer action count: ${row.trainer}/${row.cohort}/${exactSpot}/${row.hand_class}`);
  }
  if (other !== 0 || counts.reduce((sum, count) => sum + count, 0) !== opportunities) {
    throw new Error(`Every opportunity must have one supported action: ${row.trainer}/${row.cohort}/${exactSpot}/${row.hand_class}`);
  }
  const rawSourceIdentity = [
    row.trainer,
    row.cohort,
    row.hero_position,
    row.opener_position,
    row.open_size,
    row.stack_bucket,
    row.hand_class,
  ].join("|");
  if (rawSourceRowsSeen.has(rawSourceIdentity)) throw new Error(`Duplicate raw source row: ${rawSourceIdentity}`);
  rawSourceRowsSeen.add(rawSourceIdentity);
  const sourceIdentity = [row.trainer, row.cohort, exactSpot, row.hand_class].join("|");
  // Two raw MSP selector dimensions intentionally collapse in the learner UI:
  // unopened SB ignores the recorded open-size bucket, and the tracker's
  // earlier MP seat becomes EP on the 7-max table. Keep every source count and
  // add those rows after normalization, while retaining the duplicate-row
  // guard for every identity that should already be unique in the raw cube.
  const intentionalNormalizationCollision = row.trainer === "sb_unopened"
    || (row.trainer === "vs_raise_free" && row.hero_position === "MP" && row.opener_position === "MP");
  const previousNormalizationCollision = sourceRowsSeen.get(sourceIdentity);
  if (sourceRowsSeen.has(sourceIdentity)
    && !intentionalNormalizationCollision
    && !previousNormalizationCollision) {
    throw new Error(`Duplicate source row: ${sourceIdentity}`);
  }
  sourceRowsSeen.set(sourceIdentity, Boolean(previousNormalizationCollision || intentionalNormalizationCollision));
  const sliceKey = [row.trainer, row.cohort, row.hero_position, opener, size, row.stack_bucket].join("|");
  let slice = grouped.get(sliceKey);
  if (!slice) {
    slice = {
      trainer: row.trainer,
      cohort: row.cohort,
      hero_position: row.hero_position,
      opener_position: opener,
      open_size: size,
      stack_bucket: row.stack_bucket,
      counts: [0, 0, 0, 0],
      hands: new Map(),
    };
    grouped.set(sliceKey, slice);
  }
  counts.forEach((count, index) => { slice.counts[index] += count; });
  const hand = slice.hands.get(row.hand_class) || [0, 0, 0, 0];
  counts.forEach((count, index) => { hand[index] += count; });
  slice.hands.set(row.hand_class, hand);
}

const trainers = { vs_raise_free: { slices: [] }, vs_raise_sb: { slices: [] }, sb_unopened: { slices: [] } };
for (const slice of grouped.values()) {
  const total = slice.counts.reduce((sum, count) => sum + count, 0);
  if (total < MIN_SLICE_ACTIONS || !trainers[slice.trainer]) continue;
  const handActionCounts = [];
  for (const hand of readinessContract.HAND_CLASSES) {
    const counts = slice.hands.get(hand);
    if (!counts) break;
    handActionCounts.push(...counts);
  }
  const candidate = {
    cohort: slice.cohort,
    hero_position: slice.hero_position,
    opener_position: slice.opener_position,
    open_size: slice.open_size,
    stack_bucket: slice.stack_bucket,
    handActionCounts,
  };
  if (!readinessContract.isCompleteFieldSlice(candidate)) continue;
  trainers[slice.trainer].slices.push(candidate);
}

const publishedCohorts = ["league1", "leagues2_3", "r15_18"];
const spotKey = (slice) => [slice.hero_position, slice.opener_position, slice.open_size, slice.stack_bucket].join("|");
for (const trainer of Object.values(trainers)) {
  const completeBySpot = new Map();
  for (const slice of trainer.slices) {
    if (!publishedCohorts.includes(slice.cohort) || !readinessContract.isCompleteFieldSlice(slice)) continue;
    const key = spotKey(slice);
    const cohorts = completeBySpot.get(key) || new Set();
    cohorts.add(slice.cohort);
    completeBySpot.set(key, cohorts);
  }
  const publishableSpots = new Set([...completeBySpot].filter(([, cohorts]) => publishedCohorts.every((cohort) => cohorts.has(cohort))).map(([key]) => key));
  trainer.slices = trainer.slices.filter((slice) => publishedCohorts.includes(slice.cohort)
    && publishableSpots.has(spotKey(slice))
    && readinessContract.isCompleteFieldSlice(slice));
  trainer.slices.sort((a, b) => [a.cohort, a.hero_position, a.opener_position, a.open_size, a.stack_bucket].join("|").localeCompare([b.cohort, b.hero_position, b.opener_position, b.open_size, b.stack_bucket].join("|")));
}

const publishedSpotMatrix = Object.fromEntries(Object.entries(trainers).map(([trainerKey, trainer]) => [
  trainerKey,
  [...new Set(trainer.slices.map(spotKey))].sort(),
]));
const publishedRows = Object.values(trainers).reduce(
  (sum, trainer) => sum + trainer.slices.length * readinessContract.REQUIRED_HANDS,
  0,
);
const publishedOpportunities = Object.values(trainers).reduce(
  (sum, trainer) => sum + trainer.slices.reduce(
    (trainerSum, slice) => trainerSum + slice.handActionCounts.reduce((sliceSum, count) => sliceSum + count, 0),
    0,
  ),
  0,
);

const payload = {
  schemaVersion: 3,
  source: {
    system: "MSP",
    availability: sourceProvenance ? "ready" : "unverified",
    analysisWindow: sourceProvenance?.analysisWindow || {
      startInclusive: mainWindowStart,
      endExclusive: "2026-07-22T00:00:00Z",
    },
    windowStart: sbOverride && mainWindowStart > "2023-09-01T00:00:00Z" ? "2023-09-01T00:00:00Z" : mainWindowStart,
    windowEndExclusive: "2026-07-22T00:00:00Z",
    trainerWindows: {
      vs_raise_free: [mainWindowStart, "2026-07-22T00:00:00Z"],
      vs_raise_sb: [mainWindowStart, "2026-07-22T00:00:00Z"],
      sb_unopened: [sbOverride ? "2023-09-01T00:00:00Z" : mainWindowStart, "2026-07-22T00:00:00Z"],
    },
    rankSemantics: "rank_at_hand",
    cohorts: { league1: [1, 5], leagues2_3: [6, 14], r15_18: [15, 18] },
    stackWindows: {
      vs_raise_free: {
        "20": { minInclusive: 18, maxExclusive: 22.5, label: "18–22" },
        "25": { minInclusive: 22.5, maxExclusive: 27.5, label: "23–27" },
        "30": { minInclusive: 27.5, maxExclusive: 32.5, label: "28–32" },
        "35": { minInclusive: 32.5, maxExclusive: 37.5, label: "33–37" },
        "40": { minInclusive: 37.5, maxExclusive: 40, label: "38–39" },
      },
    },
    tableSize: "7-9",
    handMinimum: MIN_HAND_ACTIONS,
    nearFloorException: readinessContract.NEAR_FLOOR_EXCEPTION,
    requiredHandsPerChart: readinessContract.REQUIRED_HANDS,
    selectorUniverse: readinessContract.REQUIRED_SPOT_MATRIX,
    requiredSpotAnchors: readinessContract.REQUIRED_PUBLICATION_ANCHORS,
    publicationPolicy: readinessContract.PUBLICATION_POLICY,
    selectorMode: readinessContract.SELECTOR_MODE,
    publishedSpotMatrix,
    publishedRows,
    publishedOpportunities,
    sliceMinimum: MIN_SLICE_ACTIONS,
    ...(sourceProvenance ? { provenance: sourceProvenance } : {}),
  },
  trainers,
};

if (sourceProvenance) {
  payload.source.payloadSha256 = readinessContract.fieldPayloadSha256(payload);
  const readiness = readinessContract.validateFieldData(payload);
  if (!readiness.ready) {
    payload.source.availability = "unverified";
    payload.source.publicationBlockers = readiness.reasons;
    payload.source.payloadSha256 = readinessContract.fieldPayloadSha256(payload);
  }
}

writeFileSync(output, `(function(){window.PokerPreflopBenchmarkData=${JSON.stringify(payload)};})();\n`);
const summary = Object.fromEntries(Object.entries(trainers).map(([key, value]) => [key, {
  slices: value.slices.length,
  cells: value.slices.reduce((sum, slice) => sum + slice.handActionCounts.length / readinessContract.ACTION_KEYS.length, 0),
}]));
console.log(JSON.stringify(summary, null, 2));
