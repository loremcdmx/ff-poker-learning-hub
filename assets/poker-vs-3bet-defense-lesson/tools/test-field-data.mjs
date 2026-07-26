#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const lessonDirectory = path.resolve(toolDirectory, "..");
const require = createRequire(import.meta.url);
const observedConfidence = require(path.resolve(lessonDirectory, "../poker-kit/observed-frequency-confidence.js"));
const dataPath = path.join(lessonDirectory, "data/vs3bet-field-data.js");
const diagnosticsPath = path.join(lessonDirectory, "data/vs3bet-field-diagnostics.json");
const driftAuditPath = path.join(lessonDirectory, "data/vs3bet-version-drift-audit.json");
const sqlPath = path.join(toolDirectory, "vs3bet-field-cube.sql");
const driftAuditSqlPath = path.join(toolDirectory, "vs3bet-version-drift-audit.sql");
const publicCubePath = path.join(lessonDirectory, "data/vs3bet-field-hand-cube.csv");
const publicRankPath = path.join(lessonDirectory, "data/vs3bet-rank-intervals.csv");
const builderPath = path.join(toolDirectory, "build-vs3bet-field-data.mjs");
const rendererPath = path.join(toolDirectory, "render-vs3bet-field-query.mjs");
const readinessPath = path.join(lessonDirectory, "field-data-readiness.js");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(dataPath, "utf8"), context, { filename: dataPath });
vm.runInNewContext(fs.readFileSync(readinessPath, "utf8"), context, { filename: readinessPath });
const data = context.window.FF_VS3BET_FIELD_DATA;
const publishedReadiness = context.window.FFVs3BetFieldDataReadiness;
const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, "utf8"));
const driftAudit = JSON.parse(fs.readFileSync(driftAuditPath, "utf8"));
const sql = fs.readFileSync(sqlPath, "utf8");
const driftAuditSql = fs.readFileSync(driftAuditSqlPath, "utf8");
const clickhouse = sql.slice(sql.indexOf("-- 2. ClickHouse:"));

assert(data, "field data global missing");
assert.equal(fs.existsSync(publicCubePath), false, "lossless hand cube stays private");
assert.equal(fs.existsSync(publicRankPath), false, "rank-history bridge stays private");
assert.equal(data.meta.samplePolicy.exactFrequencyMinimumN, 50);
assert.equal(data.meta.samplePolicy.smoothing, false);
assert.equal(data.meta.samplePolicy.exactFrequencyMinimumN, observedConfidence.MIN_EXACT_DENOMINATOR, "field metadata mirrors the shared exact-frequency gate");
if (publishedReadiness.ready) {
  assert.equal(data.status, "ready");
  assert.equal(data.version, "vs3bet-field-cube-20260722-v6");
  assert(Object.keys(data.charts).length > 0, "ready publication exposes validated aggregate charts");
  assert.deepEqual(Object.keys(data.summaries).sort(), ["league1", "league2", "league3", "novice"]);
  assert(data.meta.enabledComparisonKeys.length > 0, "ready publication exposes at least one common comparison slice");
  assert.equal(diagnostics.version, data.version);
  assert(diagnostics.publicChartCount > 0, "ready diagnostics record public chart coverage");
  assert.equal(diagnostics.publicChartCount, Object.keys(data.charts).length);
} else {
  assert.equal(data.status, "methodology_only", "an unready public asset cannot self-advertise as observed field data");
  assert.equal(data.version, "vs3bet-field-methodology-only-20260722-v1");
  assert.equal(data.meta.publicationGate, "full_window_latest_first_four_cohorts_n50_169");
  assert.deepEqual(Object.keys(data.charts), [], "no rejected hand chart is shipped to learners");
  assert.deepEqual(Object.keys(data.summaries), [], "no rejected cohort summary is shipped to learners");
  assert.deepEqual(Array.from(data.meta.enabledComparisonKeys), [], "no comparison filter is enabled without publishable data");
  assert(fs.statSync(dataPath).size < 4096, "the public sentinel cannot hide a rejected cube behind a false status");
  assert.equal(diagnostics.status, "quarantined");
  assert.equal(diagnostics.publicCharts, 0);
  assert.equal(diagnostics.samplePolicy.exactFrequencyMinimumN, 50);
  assert.equal(diagnostics.samplePolicy.smoothing, false);
  assert(fs.statSync(diagnosticsPath).size < 2048, "public diagnostics cannot retain rejected counts or percentages");
}
assert.equal(driftAudit.status, "quarantined");
assert.equal(driftAudit.staleAfterLatestVersion, 1, "the optimization audit records the stale row that forced latest-first semantics");
assert.match(driftAudit.resolution, /latest-first/i);
assert.match(driftAudit.resolution, /diagnostic evidence only/i);
assert.match(driftAudit.resolution, /no cube is published/i);
assert.equal(
  driftAudit.queryTemplateSha256,
  crypto.createHash("sha256").update(driftAuditSql).digest("hex"),
  "drift audit evidence remains tied to its reproducible query template"
);
assert.match(clickhouse, /coalesce\(h\.is_rfi, 0\) = 1/);
assert.match(clickhouse, /coalesce\(h\.is_preflop_face_3bet, 0\) = 1/);
assert.match(clickhouse, /coalesce\(h\.is_preflop_could_4bet, 0\) = 1/);
assert.match(clickhouse, /coalesce\(h\.is_face_squeeze, 0\) = 0/);
assert.match(clickhouse, /h\.amt_preflop_3bet_facing_bb >= 3/);
assert.equal((clickhouse.match(/h\.user_id IN \(\{\{RANK_USER_IDS\}\}\)/g) || []).length, 2, "immutable user prefilter is repeated before both latest-first scans");
assert.equal((clickhouse.match(/PREWHERE h\.month_start_date/g) || []).length, 2, "both scans push down only immutable time and user filters");
assert.doesNotMatch(clickhouse, /h\.preflop_2bet_and_blind_facing_amount_bb/);
assert.match(clickhouse, /h\.preflop_raise_and_blind_made_amount_bb/);
assert.match(clickhouse, /coalesce\(h\.bet_bb_amount, 0\) \/ h\.bb_amount/);
assert.match(clickhouse, /face_action = 'R' AND preflop_action = 'RR' AND \([\s\S]*?is_allin = 1 OR \([\s\S]*?raise_and_blind_bb - posted_blind_bb >= effective_stack_bb - 0\.01[\s\S]*?\)[\s\S]*?\), 'jam'/);
if (publishedReadiness.ready) {
  assert.match(data.meta.actionContract.jam, /raise_and_blind_bb-posted_blind_bb>=effective_stack_bb-0\.01/);
}

const isEffectiveJam = ({ faceAction, preflopAction, allin, raiseAndBlindBb, postedBlindBb, effectiveStackBb }) => (
  faceAction === "R"
  && preflopAction === "RR"
  && (allin === 1 || (Number.isFinite(raiseAndBlindBb) && raiseAndBlindBb - postedBlindBb >= effectiveStackBb - 0.01))
);
assert.equal(isEffectiveJam({ faceAction: "R", preflopAction: "RR", allin: 0, raiseAndBlindBb: 3, postedBlindBb: 0, effectiveStackBb: 30 }), false, "ordinary 3 BB 4-bet marker cannot become a jam");
assert.equal(isEffectiveJam({ faceAction: "R", preflopAction: "RR", allin: 0, raiseAndBlindBb: 30.5, postedBlindBb: 0.5, effectiveStackBb: 30 }), true, "effective-cover shove survives a missing all-in flag");

const ranks = "AKQJT98765432".split("");
const canonicalHands = ranks.flatMap((rowRank, rowIndex) => ranks.map((columnRank, columnIndex) => {
  if (rowIndex === columnIndex) return `${rowRank}${columnRank}`;
  if (rowIndex < columnIndex) return `${rowRank}${columnRank}s`;
  return `${columnRank}${rowRank}o`;
}));
assert.equal(canonicalHands.length, 169);
assert.equal(new Set(canonicalHands).size, 169);

const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ff-vs3-builder-"));
try {
  const fixtureHands = canonicalHands;
  const fixtureCohorts = ["novice", "league3", "league2", "league1"];
  const modernHeader = [
    "cohort", "hero_position", "threebettor_position", "relation", "stack_band",
    "threebet_to_bucket", "holecards_str", "opportunities", "folds", "calls",
    "fourbets", "jams", "other", "first_hand_at", "last_hand_at"
  ];
  const legacyHeader = [...modernHeader.slice(0, 8), "unique_players", ...modernHeader.slice(8)];
  const shardSpecs = [
    {
      path: path.join(fixtureDirectory, "cube-1.csv"),
      header: legacyHeader,
      first: "2024-01-10 00:00:00",
      last: "2024-02-20 00:00:00",
      start: "2024-01-01T00:00:00Z",
      end: "2024-03-01T00:00:00Z",
      job: "clickhouse_fixture_shard_1"
    },
    {
      path: path.join(fixtureDirectory, "cube-2.csv"),
      header: modernHeader,
      first: "2024-03-10 00:00:00",
      last: "2024-04-20 00:00:00",
      start: "2024-03-01T00:00:00Z",
      end: "2024-05-01T00:00:00Z",
      job: "clickhouse_fixture_shard_2"
    }
  ];
  for (const shard of shardSpecs) {
    const lines = [shard.header.join(",")];
    for (const cohort of fixtureCohorts) {
      for (const hand of fixtureHands) {
        const source = {
          cohort,
          hero_position: "BTN",
          threebettor_position: "BB",
          relation: "IP",
          stack_band: "31-50",
          threebet_to_bucket: "6-8",
          holecards_str: hand,
          opportunities: "25",
          unique_players: "3",
          folds: "10",
          calls: "5",
          fourbets: "5",
          jams: "5",
          other: "0",
          first_hand_at: shard.first,
          last_hand_at: shard.last
        };
        lines.push(shard.header.map((column) => source[column]).join(","));
      }
    }
    fs.writeFileSync(shard.path, `${lines.join("\n")}\n`);
  }

  const rankPath = path.join(fixtureDirectory, "rank.csv");
  fs.writeFileSync(rankPath, "user_id,rank,rank_start,rank_end\n1,1,2024-01-01 00:00:00,2024-05-01 00:00:00\n");
  const rendererRankPath = path.join(fixtureDirectory, "renderer-rank.csv");
  fs.writeFileSync(rendererRankPath, [
    "user_id,rang,rank_start_at,rank_end_at",
    "1,1,2024-01-01 00:00:00,2024-05-01 00:00:00",
    "2,2,2024-01-01 00:00:00,2024-05-01 00:00:00"
  ].join("\n") + "\n");
  const renderedQuery = execFileSync(process.execPath, [
    rendererPath,
    rendererRankPath,
    "--interval-start", "2024-01-01 00:00:00",
    "--interval-end", "2024-03-01 00:00:00",
    "--user-shard-index", "0",
    "--user-shard-count", "2"
  ], { encoding: "utf8" });
  assert.doesNotMatch(renderedQuery, /\{\{(?:RANK_INTERVAL_ROWS|RANK_USER_IDS|WINDOW_START|WINDOW_END|MONTH_END_EXCLUSIVE)\}\}/);
  assert.equal((renderedQuery.match(/h\.user_id IN \(1\)/g) || []).length, 2);
  assert.doesNotMatch(renderedQuery, /\(2,2,'2024-01-01 00:00:00','2024-03-01 00:00:00'\)/);
  assert.match(renderedQuery, /played_at >= toDateTime\('2024-01-01 00:00:00'\)/);
  assert.match(renderedQuery, /played_at < toDateTime\('2024-03-01 00:00:00'\)/);
  assert.match(renderedQuery, /month_start_date < toDate\('2024-03-01'\)/);
  const generatedDataPath = path.join(fixtureDirectory, "field-data.js");
  const generatedDiagnosticsPath = path.join(fixtureDirectory, "diagnostics.json");
  const builderArguments = [];
  for (const [shardIndex, shard] of shardSpecs.entries()) {
    builderArguments.push(
      "--cube", shard.path,
      "--cube-job-id", shard.job,
      "--cube-execution-mode", "async",
      "--cube-query-sha256", String(shardIndex + 1).repeat(64),
      "--cube-window-start", shard.start,
      "--cube-window-end", shard.end
    );
  }
  builderArguments.push(
    "--rank-intervals", rankPath,
    "--rank-job-id", "bigquery_fixture_rank_bridge",
    "--rank-execution-mode", "async",
    "--rank-query-sha256", "3".repeat(64),
    "--rank-window-start", "2024-01-01T00:00:00Z",
    "--rank-window-end", "2024-05-01T00:00:00Z",
    "--generated-on", "2024-05-01",
    "--version", "vs3bet-builder-fixture-v1",
    "--output", generatedDataPath,
    "--diagnostics", generatedDiagnosticsPath
  );
  execFileSync(process.execPath, [builderPath, ...builderArguments], { stdio: "pipe" });

  const generatedContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(generatedDataPath, "utf8"), generatedContext, { filename: generatedDataPath });
  const generated = generatedContext.window.FF_VS3BET_FIELD_DATA;
  const generatedDiagnostics = JSON.parse(fs.readFileSync(generatedDiagnosticsPath, "utf8"));
  assert.equal(generated.status, "ready");
  assert.equal(generated.meta.cohorts.novice.label, "Ранги 15–18");
  assert.match(generated.meta.actionContract.jam, /raise_and_blind_bb-posted_blind_bb>=effective_stack_bb-0\.01/);
  assert.equal(generated.meta.windowStartInclusive, "2024-01-01T00:00:00Z");
  assert.equal(generated.meta.windowEndExclusive, "2024-05-01T00:00:00Z");
  assert.equal(generated.meta.samplePolicy.exactFrequencyMinimumN, observedConfidence.MIN_EXACT_DENOMINATOR);
  assert.equal(generated.meta.samplePolicy.smoothing, false);
  assert.deepEqual(Array.from(generated.meta.enabledComparisonKeys), ["BTN|IP|31-50|all", "BTN|IP|31-50|6-8"]);
  assert.equal(generated.meta.provenance.handCube.shards.length, 2);
  assert.deepEqual(
    Array.from(generated.meta.provenance.handCube.shards, (shard) => shard.queryJobId),
    ["clickhouse_fixture_shard_1", "clickhouse_fixture_shard_2"]
  );
  assert.deepEqual(
    Array.from(generated.meta.provenance.handCube.shards, (shard) => shard.querySha256),
    ["1".repeat(64), "2".repeat(64)]
  );
  assert(generated.meta.provenance.handCube.shards.every((shard) => shard.executionMode === "async"));
  assert(generated.meta.provenance.handCube.shards.every((shard) => /^[a-f0-9]{64}$/.test(shard.sha256)));
  assert.equal(generated.meta.provenance.rankIntervals.queryJobId, "bigquery_fixture_rank_bridge");
  assert.equal(generated.meta.provenance.rankIntervals.executionMode, "async");
  assert.equal(generated.meta.provenance.rankIntervals.querySha256, "3".repeat(64));
  assert.equal(generated.meta.provenance.rankIntervals.rows, 1);
  assert(/^[a-f0-9]{64}$/.test(generated.meta.provenance.rankIntervals.sha256));
  assert.equal(generated.meta.provenance.handCube.sourceQueryTemplateSha256, crypto.createHash("sha256").update(sql).digest("hex"));
  assert.equal(generatedDiagnostics.csvRows, fixtureCohorts.length * fixtureHands.length * 2);
  assert.equal(generatedDiagnostics.mergedCellRows, fixtureCohorts.length * fixtureHands.length);
  assert.equal(generatedDiagnostics.crossShardMergedRows, fixtureCohorts.length * fixtureHands.length);
  assert.equal(generatedDiagnostics.firstHandAt, "2024-01-10 00:00:00");
  assert.equal(generatedDiagnostics.lastHandAt, "2024-04-20 00:00:00");
  assert.deepEqual(
    {
      total: generatedDiagnostics.comparisonCoverage.totalDimensionKeys,
      enabled: generatedDiagnostics.comparisonCoverage.enabledDimensionKeys,
      disabled: generatedDiagnostics.comparisonCoverage.disabledDimensionKeys,
      minimum: generatedDiagnostics.comparisonCoverage.minimumCommonPerHandN,
      maximum: generatedDiagnostics.comparisonCoverage.maximumCommonPerHandN
    },
    { total: 200, enabled: 2, disabled: 198, minimum: 0, maximum: 50 }
  );
  for (const cohort of fixtureCohorts) {
    for (const suffix of ["all", "6-8"]) {
      const chart = generated.charts[`${cohort}|BTN|IP|31-50|${suffix}`];
      assert(chart, `fixture chart missing for ${cohort}/${suffix}`);
      assert(chart.cells.every((cell) => cell[0] === 50), `shard counters did not exact-sum for ${cohort}/${suffix}`);
      assert.equal(chart.totals.opportunities, 169 * 50);
    }
  }
} finally {
  fs.rmSync(fixtureDirectory, { recursive: true, force: true });
}

console.log(`vs3bet checked-in ${publishedReadiness.ready ? "ready aggregate" : "methodology sentinel"} and exact builder fixture passed`);
