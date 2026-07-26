#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const rankPath = process.argv[2];
const options = Object.fromEntries(process.argv.slice(3).map((item) => {
  const match = item.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${item}`);
  return [match[1], match[2]];
}));

if (!rankPath) {
  throw new Error("Usage: node render-action-cube-query.mjs /private/path/rank-intervals.csv [--shards=1 --shard=0 --window-start='2023-09-01 00:00:00' --window-end='2026-07-22 00:00:00' --template=action|ev --output=/private/path/query.sql]");
}
const resolvedRankPath = path.resolve(rankPath);
if (resolvedRankPath === repoRoot || resolvedRankPath.startsWith(`${repoRoot}${path.sep}`)) {
  throw new Error("The raw rank bridge contains private user ids and must stay outside the repository");
}
const resolvedOutputPath = options.output ? path.resolve(options.output) : "";
if (resolvedOutputPath && (resolvedOutputPath === repoRoot || resolvedOutputPath.startsWith(`${repoRoot}${path.sep}`))) {
  throw new Error("Rendered benchmark SQL contains private user ids and must stay outside the repository");
}

const shardCount = Number(options.shards ?? 1);
const shardIndex = Number(options.shard ?? 0);
if (!Number.isSafeInteger(shardCount) || shardCount < 1 || !Number.isSafeInteger(shardIndex) || shardIndex < 0 || shardIndex >= shardCount) {
  throw new Error(`Invalid shard ${shardIndex}/${shardCount}`);
}
if (shardCount !== 1 || shardIndex !== 0) {
  throw new Error("Benchmark time-shard publication requires the full rank bridge: include every user with --shards=1 --shard=0 and partition only with disjoint --window-start/--window-end time ranges");
}
const windowStart = options["window-start"] ?? "2023-09-01 00:00:00";
const windowEndExclusive = options["window-end"] ?? "2026-07-22 00:00:00";
const windowStartMs = timestamp(windowStart, "window start");
const windowEndMs = timestamp(windowEndExclusive, "window end");
const frozenStartMs = Date.parse("2023-09-01T00:00:00Z");
const frozenEndMs = Date.parse("2026-07-22T00:00:00Z");
if (windowStartMs >= windowEndMs || windowStartMs < frozenStartMs || windowEndMs > frozenEndMs) throw new Error("Invalid half-open shard window");
const monthStart = `${windowStart.slice(0, 7)}-01`;
const endDate = new Date(windowEndMs);
const monthEndDate = endDate.getUTCDate() === 1 && endDate.getUTCHours() === 0 && endDate.getUTCMinutes() === 0 && endDate.getUTCSeconds() === 0
  ? endDate
  : new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 1));
const monthEndExclusive = `${monthEndDate.getUTCFullYear()}-${String(monthEndDate.getUTCMonth() + 1).padStart(2, "0")}-${String(monthEndDate.getUTCDate()).padStart(2, "0")}`;

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
  const header = rows.shift();
  const expected = ["user_id", "rang", "rank_start_at", "rank_end_at"];
  if (!header || header.join("|") !== expected.join("|")) throw new Error(`Unexpected rank CSV columns: ${(header || []).join(",")}`);
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

function timestamp(value, label) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}Z`))) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return Date.parse(`${value}Z`);
}

const sourceRows = parseCsv(fs.readFileSync(resolvedRankPath, "utf8"));
if (!sourceRows.length) throw new Error("Rank interval export is empty");
const intervals = sourceRows.map((row, index) => {
  const userId = Number(row.user_id);
  const rank = Number(row.rang);
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error(`Invalid user_id on row ${index + 2}`);
  if (!Number.isInteger(rank) || rank < 1 || rank > 18) throw new Error(`Invalid rank on row ${index + 2}`);
  const startMs = timestamp(row.rank_start_at, `rank_start_at on row ${index + 2}`);
  const endMs = timestamp(row.rank_end_at, `rank_end_at on row ${index + 2}`);
  return { userId, rank, start: row.rank_start_at, end: row.rank_end_at, startMs, endMs };
}).filter((interval) => interval.startMs < interval.endMs);

const byUser = new Map();
for (const interval of intervals) {
  const rows = byUser.get(interval.userId) || [];
  rows.push(interval);
  byUser.set(interval.userId, rows);
}
for (const [userId, rows] of byUser) {
  rows.sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs || left.rank - right.rank);
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].startMs < rows[index - 1].endMs) throw new Error(`Overlapping rank intervals for user ${userId}`);
  }
}

// Publication manifests support one partition axis only: disjoint time windows.
// Every time shard must retain every rank-bridge user whose interval overlaps
// that window. A second user-modulo axis would silently omit population rows
// while the manifest still claimed complete time-only coverage.
const shardIntervals = intervals.filter((interval) => interval.startMs < windowEndMs && interval.endMs > windowStartMs);
if (!shardIntervals.length) throw new Error("No rank intervals overlap the requested time window");
const tuples = shardIntervals.map((interval) => `(${interval.userId},${interval.rank},'${interval.start}','${interval.end}')`);
const shardUsers = [...new Set(shardIntervals.map((interval) => interval.userId))].sort((left, right) => left - right);

const templateFiles = {
  action: "msp-preflop-action-cube.sql",
  ev: "msp-sb-vs-btn-ev.sql",
};
const templateName = options.template ?? "action";
if (!templateFiles[templateName]) throw new Error(`Invalid template: ${templateName}`);
const template = fs.readFileSync(path.join(here, templateFiles[templateName]), "utf8");
const clickHouseStart = template.indexOf("WITH rank_intervals AS");
if (clickHouseStart < 0) throw new Error("ClickHouse query marker not found");
const rendered = template.slice(clickHouseStart)
  .replace("{{RANK_INTERVAL_ROWS}}", tuples.join(",\n    "))
  .replaceAll("{{RANK_USER_IDS}}", shardUsers.join(","))
  .replaceAll("{{WINDOW_START}}", windowStart)
  .replaceAll("{{WINDOW_END_EXCLUSIVE}}", windowEndExclusive)
  .replaceAll("{{WINDOW_MONTH_START}}", monthStart)
  .replaceAll("{{WINDOW_MONTH_END_EXCLUSIVE}}", monthEndExclusive);
if (rendered.includes("{{")) throw new Error("Unresolved query placeholder");
if (options.quiet !== "true") {
  process.stderr.write(`${JSON.stringify({
    sourceRows: sourceRows.length,
    validIntervals: intervals.length,
    excludedZeroLength: sourceRows.length - intervals.length,
    partitionAxis: "time",
    rankBridgeCoverage: "all-overlapping-users",
    userShardCount: shardCount,
    userShardIndex: shardIndex,
    overlappingIntervals: shardIntervals.length,
    overlappingUsers: shardUsers.length,
    windowStart,
    windowEndExclusive,
    template: templateName,
  })}\n`);
}
const renderedSource = `${rendered.trim()}\n`;
if (resolvedOutputPath) fs.writeFileSync(resolvedOutputPath, renderedSource, { mode: 0o600 });
else process.stdout.write(renderedSource);
