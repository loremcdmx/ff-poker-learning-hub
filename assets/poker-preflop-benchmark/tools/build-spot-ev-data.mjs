import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const observedConfidence = require(resolve(toolDir, "../../poker-kit/observed-frequency-confidence.js"));
const readinessContract = require(resolve(toolDir, "../readiness.js"));
const input = process.argv[2];
const outputFlag = process.argv.indexOf("--output");
const positionalOutput = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : "";
const output = resolve(outputFlag >= 0 ? process.argv[outputFlag + 1] : positionalOutput || resolve(toolDir, "../spot-ev-data.js"));
const sourceManifestFlag = process.argv.indexOf("--source-manifest");
const sourceManifestPath = sourceManifestFlag >= 0 ? process.argv[sourceManifestFlag + 1] : "";
if (!input) throw new Error("Usage: node build-spot-ev-data.mjs <sb-vs-btn-ev.csv> [output.js] [--source-manifest <json>]");
if (outputFlag >= 0 && !process.argv[outputFlag + 1]) throw new Error("--output requires a file path");
if (sourceManifestFlag >= 0 && !sourceManifestPath) throw new Error("--source-manifest requires a JSON path");

function parseCsv(source) {
  const [headerLine, ...lines] = source.trim().split(/\r?\n/);
  const header = headerLine.split(",");
  return lines.filter(Boolean).map((line) => {
    const values = line.split(",");
    assert.equal(values.length, header.length, `unexpected CSV width: ${line}`);
    return Object.fromEntries(header.map((key, index) => [key, values[index]]));
  });
}

const rows = parseCsv(readFileSync(resolve(input), "utf8"));
const inputSource = readFileSync(resolve(input), "utf8");
const cohorts = ["league1", "r15_18"];
const spotRows = rows.filter((row) => row.hand_class === "__SPOT__");
assert.equal(rows.length, cohorts.length, "EV publishable CSV must contain only the two exact-spot cohort rows");
assert.deepEqual(spotRows.map((row) => row.cohort).sort(), cohorts, "CSV must contain one exact-spot row for each cohort");

function number(row, key) {
  const value = Number(row[key]);
  assert(Number.isFinite(value), `${row.cohort}/${row.hand_class}: ${key} must be numeric`);
  return value;
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function assertHex(value, label) {
  assert(/^[a-f0-9]{64}$/.test(String(value || "")), `${label} must be a SHA-256 hash`);
}

function validateSourceManifest(manifest) {
  if (!manifest) return null;
  assert.equal(manifest.schema, "ff-preflop-benchmark-spot-ev-source-v1", "unexpected EV source manifest schema");
  assert.deepEqual(manifest.analysisWindow, {
    startInclusive: "2023-09-01T00:00:00Z",
    endExclusive: "2026-07-22T00:00:00Z",
  }, "EV source manifest must cover the frozen full window");
  assert(new Set(["sync", "async"]).has(manifest.rankBridge?.executionMode), "EV source manifest keeps an explicit rank-bridge execution mode");
  assert(Number.isSafeInteger(manifest.rankBridge?.rows) && Number.isSafeInteger(manifest.rankBridge?.usableRows), "EV source manifest keeps rank-bridge row counts");
  assert(Number.isSafeInteger(manifest.rankBridge?.byteSize) && manifest.rankBridge.byteSize > 0, "EV source manifest keeps the complete rank-bridge byte size");
  assert.equal(manifest.rankBridge?.truncated, false, "EV rank bridge export is explicitly complete");
  assertHex(manifest.rankBridge?.sha256, "rankBridge.sha256");
  const rankQueryTemplateSource = readFileSync(resolve(toolDir, "msp-preflop-rank-bridge.sql"), "utf8");
  assert.equal(manifest.rankBridge?.queryTemplate?.file, "tools/msp-preflop-rank-bridge.sql", "EV manifest uses the canonical full-rank bridge");
  assert.equal(manifest.rankBridge?.queryTemplate?.sha256, sha256(rankQueryTemplateSource), "EV rank bridge template hash matches the checked-in extractor");
  if (manifest.rankBridge.executionMode === "sync") {
    assert.equal(manifest.rankBridge.queryJobId, `sync:${manifest.rankBridge.queryTemplate.sha256}`, "EV sync rank bridge execution id matches the canonical query hash");
  } else {
    assert(/^mcp_bq_job_[a-f0-9]+$/.test(manifest.rankBridge.queryJobId || ""), "EV async rank bridge keeps the original BigQuery job id");
  }
  const queryTemplateSource = readFileSync(resolve(toolDir, "msp-sb-vs-btn-ev.sql"), "utf8");
  assert.equal(manifest.queryTemplate?.file, "tools/msp-sb-vs-btn-ev.sql", "EV manifest points at the checked-in query template");
  assertHex(manifest.queryTemplate?.sha256, "queryTemplate.sha256");
  assert.equal(manifest.queryTemplate.sha256, sha256(queryTemplateSource), "EV source manifest query hash matches the checked-in extractor");
  assert.equal(manifest.partitionAxis, "time", "EV publication uses explicit disjoint time shards");
  assert(Array.isArray(manifest.shards) && manifest.shards.length >= 2, "EV source manifest lists every time shard");
  const shardCount = manifest.shards[0]?.shardCount;
  assert.equal(shardCount, manifest.shards.length, "EV source manifest shard count is complete");
  const shardIndexes = new Set();
  const executionIds = new Set();
  for (const shard of manifest.shards) {
    assert(Number.isSafeInteger(shard.shardIndex) && shard.shardIndex >= 0 && shard.shardIndex < shardCount, "EV manifest shard index is valid");
    assert.equal(shard.shardCount, shardCount, "EV source manifest does not mix shard counts");
    assert(new Set(["sync", "async"]).has(shard.executionMode), "EV shard keeps an explicit execution mode");
    assert(!executionIds.has(shard.queryJobId), "EV shard execution ids are unique");
    assertHex(shard.querySha256, `EV shard ${shard.shardIndex} querySha256`);
    assertHex(shard.resultSha256, `EV shard ${shard.shardIndex} resultSha256`);
    if (shard.executionMode === "sync") assert.equal(shard.queryJobId, `sync:${shard.querySha256}`, "EV sync execution id matches querySha256");
    else assert(/^mcp_ch_job_[a-f0-9]+$/.test(shard.queryJobId || ""), "EV async shard keeps the original ClickHouse job id");
    assert(Number.isSafeInteger(shard.rowCount) && shard.rowCount > 0, "EV shard row count is present");
    assert(Number.isSafeInteger(shard.byteSize) && shard.byteSize > 0, "EV shard byte size is present");
    assert(Number.isSafeInteger(shard.durationMs) && shard.durationMs > 0, "EV shard runtime is present");
    assert.equal(shard.truncated, false, "EV shard must be a complete export");
    shardIndexes.add(shard.shardIndex);
    executionIds.add(shard.queryJobId);
  }
  assert.equal(shardIndexes.size, shardCount, "EV source manifest covers every shard index exactly once");
  const windows = [...manifest.shards].sort((a, b) => Date.parse(a.windowStartInclusive) - Date.parse(b.windowStartInclusive));
  assert.equal(windows[0].windowStartInclusive, manifest.analysisWindow.startInclusive, "EV shard windows start at the analysis boundary");
  assert.equal(windows.at(-1).windowEndExclusive, manifest.analysisWindow.endExclusive, "EV shard windows end at the analysis boundary");
  for (let index = 1; index < windows.length; index += 1) {
    assert.equal(windows[index - 1].windowEndExclusive, windows[index].windowStartInclusive, "EV shard windows neither overlap nor leave gaps");
  }
  assert.equal(manifest.playerCardinality?.method, "exact_union_private_user_ids", "EV time shards use exact cross-window player cardinality");
  assert.equal(manifest.playerCardinality?.privateIdentifiersDiscarded, true, "private player ids are discarded before publication");
  assertHex(manifest.merged?.sha256, "merged.sha256");
  assert.equal(manifest.merged.sha256, sha256(inputSource), "EV manifest merged hash matches the publishable CSV");
  assert.equal(manifest.merged.rows, rows.length, "EV manifest merged row count matches the CSV");
  assert(manifest.merged.rows <= manifest.shards.reduce((sum, shard) => sum + shard.rowCount, 0), "EV merged row count cannot exceed the source shards");
  const spotOpportunities = rows.filter((row) => row.hand_class === "__SPOT__").reduce((sum, row) => sum + Number(row.opportunities || 0), 0);
  assert.equal(manifest.merged.opportunities, spotOpportunities, "EV manifest opportunity count matches the exact spot rows");
  assert(!JSON.stringify(manifest).includes("private_player_ids"), "EV public provenance never embeds private player ids");
  return manifest;
}

const sourceManifest = sourceManifestPath ? JSON.parse(readFileSync(resolve(sourceManifestPath), "utf8")) : null;
const sourceProvenance = validateSourceManifest(sourceManifest);

for (const row of rows) {
  assert(cohorts.includes(row.cohort), `unexpected cohort: ${row.cohort}`);
  const classified = ["folds", "calls", "raises", "jams"].reduce((sum, key) => sum + number(row, key), 0);
  assert.equal(classified, number(row, "opportunities"), `${row.cohort}/${row.hand_class}: every opportunity must have one classified action`);
  assert(Number.isSafeInteger(number(row, "players")) && number(row, "players") > 0 && number(row, "players") <= number(row, "opportunities"), `${row.cohort}/${row.hand_class}: exact player count fits the opportunities`);
  const expectedEv = Math.round(10000 * number(row, "ev_sum_bb") / number(row, "opportunities")) / 100;
  assert.equal(number(row, "spot_ev_bb_100"), expectedEv, `${row.cohort}/${row.hand_class}: spot EV must be derived from the additive EV numerator`);
}
for (const row of spotRows) {
  assert(observedConfidence.canRenderExact(number(row, "opportunities")), `${row.cohort}/__SPOT__: observed outcome stays unavailable below N=${observedConfidence.MIN_EXACT_DENOMINATOR}`);
}

const byCohort = Object.fromEntries(spotRows.map((row) => [row.cohort, row]));
const leagueEv = number(byCohort.league1, "spot_ev_bb_100");
const noviceEv = number(byCohort.r15_18, "spot_ev_bb_100");
const payload = {
  schemaVersion: 3,
  source: {
    system: "MSP",
    availability: sourceProvenance ? "ready" : "unverified",
    analysisWindow: {
      startInclusive: "2023-09-01T00:00:00Z",
      endExclusive: "2026-07-22T00:00:00Z",
    },
    windowStart: "2023-09-01T00:00:00Z",
    windowEndExclusive: "2026-07-22T00:00:00Z",
    rankSemantics: "rank_at_hand",
    metric: "all_in_adjusted_net_ev_bb_per_100_spot_opportunities",
    actionSource: "PokerPreflopBenchmarkData",
    ...(sourceProvenance ? { provenance: sourceProvenance } : {}),
  },
  spots: {
    "SB|BTN|2x|18-25": {
      league1: {
        opportunities: number(byCohort.league1, "opportunities"),
        players: number(byCohort.league1, "players"),
        spotEvBb100: leagueEv,
      },
      r15_18: {
        opportunities: number(byCohort.r15_18, "opportunities"),
        players: number(byCohort.r15_18, "players"),
        spotEvBb100: noviceEv,
      },
      gapBb100: Math.round((leagueEv - noviceEv) * 100) / 100,
    },
  },
};

if (sourceProvenance) {
  payload.source.payloadSha256 = readinessContract.evPayloadSha256(payload);
  const readiness = readinessContract.validateEvData(payload);
  if (!readiness.ready) {
    payload.source.availability = "unverified";
    payload.source.publicationBlockers = readiness.reasons;
    payload.source.payloadSha256 = readinessContract.evPayloadSha256(payload);
  }
}

writeFileSync(output, `(function(){window.PokerPreflopBenchmarkEvData=${JSON.stringify(payload)};})();\n`);
console.log(JSON.stringify({ output, rows: rows.length, gapBb100: payload.spots["SB|BTN|2x|18-25"].gapBb100 }, null, 2));
