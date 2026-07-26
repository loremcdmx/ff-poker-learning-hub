#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../../..");
const options = {};
const positional = [];
for (const argument of process.argv.slice(2)) {
  const match = argument.match(/^--([^=]+)=(.*)$/);
  if (match) options[match[1]] = match[2];
  else positional.push(argument);
}
if (positional.length !== 1 || !options["rank-job-id"] || !options["output-dir"]) {
  throw new Error("Usage: node prepare-source-run.mjs /private/path/rank-bridge.csv --rank-job-id=mcp_bq_job_... --output-dir=/private/tmp/ff-preflop-benchmark-20260722");
}

const rankPath = path.resolve(positional[0]);
const outputDir = path.resolve(options["output-dir"]);
const planPath = path.join(outputDir, "source-plan.json");
const rankMetadataPath = path.join(outputDir, "rank-bridge-metadata.json");
const rankQueryPath = path.join(toolDir, "msp-preflop-rank-bridge.sql");
const rendererPath = path.join(toolDir, "render-action-cube-query.mjs");
const ANALYSIS_WINDOW = {
  startInclusive: "2023-09-01T00:00:00Z",
  endExclusive: "2026-07-22T00:00:00Z",
};
const WINDOWS = [
  ["2023-09-01T00:00:00Z", "2024-01-01T00:00:00Z"],
  ["2024-01-01T00:00:00Z", "2024-04-01T00:00:00Z"],
  ["2024-04-01T00:00:00Z", "2024-07-01T00:00:00Z"],
  ["2024-07-01T00:00:00Z", "2024-10-01T00:00:00Z"],
  ["2024-10-01T00:00:00Z", "2025-01-01T00:00:00Z"],
  ["2025-01-01T00:00:00Z", "2025-04-01T00:00:00Z"],
  ["2025-04-01T00:00:00Z", "2025-07-01T00:00:00Z"],
  ["2025-07-01T00:00:00Z", "2025-10-01T00:00:00Z"],
  ["2025-10-01T00:00:00Z", "2026-01-01T00:00:00Z"],
  ["2026-01-01T00:00:00Z", "2026-04-01T00:00:00Z"],
  ["2026-04-01T00:00:00Z", "2026-07-01T00:00:00Z"],
  ["2026-07-01T00:00:00Z", "2026-07-22T00:00:00Z"],
];

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function outsideRepository(candidate, label) {
  const resolved = path.resolve(candidate);
  if (resolved === repoRoot || resolved.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`${label} contains private rank/user evidence and must stay outside the repository`);
  }
  return resolved;
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
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

function clickHouseTimestamp(value) {
  return value.replace("T", " ").replace("Z", "");
}

outsideRepository(rankPath, "rank bridge");
outsideRepository(outputDir, "source run");
if (fs.existsSync(planPath)) {
  throw new Error(`source plan already exists at ${planPath}; use a new external output directory instead of overwriting receipts or query identity`);
}
const rankSource = fs.readFileSync(rankPath);
const parsed = parseCsv(rankSource.toString("utf8"));
const header = parsed.shift() || [];
assert.deepEqual(header, ["user_id", "rang", "rank_start_at", "rank_end_at"], "rank bridge columns are canonical");
const intervals = new Map();
let usableRows = 0;
for (const [index, values] of parsed.filter((row) => row.some(Boolean)).entries()) {
  assert.equal(values.length, header.length, `rank bridge row ${index + 2} has an unexpected CSV width`);
  const userId = Number(values[0]);
  const rank = Number(values[1]);
  const start = values[2];
  const end = values[3];
  assert(Number.isSafeInteger(userId) && userId > 0, `rank bridge row ${index + 2} has an invalid user id`);
  assert(Number.isSafeInteger(rank) && rank >= 1 && rank <= 18, `rank bridge row ${index + 2} has an invalid rank`);
  assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(end), `rank bridge row ${index + 2} has invalid timestamps`);
  if (start >= end) continue;
  usableRows += 1;
  const rows = intervals.get(userId) || [];
  rows.push({ start, end });
  intervals.set(userId, rows);
}
assert(usableRows > 0, "rank bridge has no usable intervals");
for (const [userId, rows] of intervals) {
  rows.sort((left, right) => left.start.localeCompare(right.start) || left.end.localeCompare(right.end));
  for (let index = 1; index < rows.length; index += 1) {
    assert(rows[index].start >= rows[index - 1].end, `rank bridge intervals overlap for user ${userId}`);
  }
}

const rankQuerySource = fs.readFileSync(rankQueryPath);
const rankQuerySha256 = sha256(rankQuerySource);
const rankJobId = options["rank-job-id"];
const rankExecutionMode = rankJobId.startsWith("sync:") ? "sync" : "async";
if (rankExecutionMode === "sync") assert.equal(rankJobId, `sync:${rankQuerySha256}`, "sync rank execution id must derive from the canonical query bytes");
else assert.match(rankJobId, /^mcp_bq_job_[a-f0-9]+$/, "async rank execution id must be the original BigQuery job id");

fs.mkdirSync(path.join(outputDir, "queries"), { recursive: true, mode: 0o700 });
fs.mkdirSync(path.join(outputDir, "results"), { recursive: true, mode: 0o700 });
fs.mkdirSync(path.join(outputDir, "receipts"), { recursive: true, mode: 0o700 });
fs.mkdirSync(path.join(outputDir, "merged"), { recursive: true, mode: 0o700 });
fs.mkdirSync(path.join(outputDir, "manifests"), { recursive: true, mode: 0o700 });

const rankMetadata = {
  queryJobId: rankJobId,
  executionMode: rankExecutionMode,
  file: rankPath,
  rows: parsed.filter((row) => row.some(Boolean)).length,
  usableRows,
  byteSize: rankSource.byteLength,
  truncated: false,
  sha256: sha256(rankSource),
  queryTemplate: {
    file: "tools/msp-preflop-rank-bridge.sql",
    sha256: rankQuerySha256,
  },
};
fs.writeFileSync(rankMetadataPath, `${JSON.stringify(rankMetadata, null, 2)}\n`, { mode: 0o600 });

const shardCount = WINDOWS.length;
const shards = WINDOWS.map(([windowStartInclusive, windowEndExclusive], shardIndex) => {
  const id = String(shardIndex).padStart(2, "0");
  const actionQueryPath = path.join(outputDir, "queries", `action-${id}.sql`);
  const evQueryPath = path.join(outputDir, "queries", `ev-${id}.sql`);
  for (const [template, queryPath] of [["action", actionQueryPath], ["ev", evQueryPath]]) {
    execFileSync(process.execPath, [
      rendererPath,
      rankPath,
      "--shards=1",
      "--shard=0",
      `--template=${template}`,
      `--window-start=${clickHouseTimestamp(windowStartInclusive)}`,
      `--window-end=${clickHouseTimestamp(windowEndExclusive)}`,
      `--output=${queryPath}`,
      "--quiet=true",
    ], { stdio: "pipe" });
  }
  return {
    shardIndex,
    shardCount,
    windowStartInclusive,
    windowEndExclusive,
    action: {
      queryPath: actionQueryPath,
      resultPath: path.join(outputDir, "results", `action-${id}.csv`),
    },
    ev: {
      queryPath: evQueryPath,
      resultPath: path.join(outputDir, "results", `ev-${id}.csv`),
    },
  };
});

const receiptPaths = {};
for (const kind of ["action", "ev"]) {
  const receiptPath = path.join(outputDir, "receipts", `${kind}.json`);
  receiptPaths[kind] = receiptPath;
  fs.writeFileSync(receiptPath, `${JSON.stringify({
    schema: "ff-preflop-benchmark-execution-receipts-v1",
    kind,
    shards: shards.map((shard) => ({
      shardIndex: shard.shardIndex,
      queryJobId: "",
      executionMode: "async",
      durationMs: null,
      truncated: null,
      resultPath: shard[kind].resultPath,
    })),
  }, null, 2)}\n`, { mode: 0o600 });
}

const plan = {
  schema: "ff-preflop-benchmark-source-plan-v1",
  analysisWindow: ANALYSIS_WINDOW,
  strategy: "contiguous-quarterly_time_shards",
  outputDir,
  rankBridge: {
    file: rankPath,
    metadataPath: rankMetadataPath,
    queryJobId: rankJobId,
    executionMode: rankExecutionMode,
    sha256: rankMetadata.sha256,
  },
  shardCount,
  shards,
  receiptPaths,
  outputs: {
    actionLedger: path.join(outputDir, "action-shard-ledger.json"),
    evLedger: path.join(outputDir, "ev-shard-ledger.json"),
    actionMergedCsv: path.join(outputDir, "merged", "action-cube.csv"),
    actionMergeMetadata: path.join(outputDir, "merged", "action-merge.json"),
    evMergedCsv: path.join(outputDir, "merged", "spot-ev.csv"),
    evMergeMetadata: path.join(outputDir, "merged", "spot-ev-merge.json"),
    actionManifest: path.join(outputDir, "manifests", "action-source.json"),
    evManifest: path.join(outputDir, "manifests", "ev-source.json"),
  },
};
fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({
  plan: planPath,
  rankMetadata: rankMetadataPath,
  rankRows: rankMetadata.rows,
  usableRankRows: rankMetadata.usableRows,
  timeShards: shardCount,
  externalClickHouseJobs: shardCount * 2,
  receiptPaths,
}, null, 2));
