#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rankPath = process.argv[2];
const options = Object.fromEntries(process.argv.slice(3).map((item) => {
  const match = item.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${item}`);
  return [match[1], match[2]];
}));

if (!rankPath) {
  throw new Error("Usage: node render-full-history-field-query.mjs /private/path/rank-intervals.csv --from=2023-09-01 --to=2026-07-22 [--rank-min=1 --rank-max=18 --user-shard-index=0 --user-shard-count=1]");
}

const from = options.from || "2023-09-01";
const to = options.to || "2026-07-22";
const rankMin = Number(options["rank-min"] ?? 1);
const rankMax = Number(options["rank-max"] ?? 18);
const userShardIndex = Number(options["user-shard-index"] ?? 0);
const userShardCount = Number(options["user-shard-count"] ?? 1);
for (const [label, value] of [["from", from], ["to", to]]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) throw new Error(`Invalid ${label}: ${value || ""}`);
}
if (!Number.isInteger(rankMin) || !Number.isInteger(rankMax) || rankMin < 1 || rankMax > 18 || rankMin > rankMax) {
  throw new Error(`Invalid rank shard ${rankMin}..${rankMax}`);
}
if (!Number.isInteger(userShardCount) || userShardCount < 1 || !Number.isInteger(userShardIndex) || userShardIndex < 0 || userShardIndex >= userShardCount) {
  throw new Error(`Invalid user shard ${userShardIndex}/${userShardCount}`);
}
const fromMs = Date.parse(`${from}T00:00:00Z`);
const toMs = Date.parse(`${to}T00:00:00Z`);
if (!(fromMs < toMs)) throw new Error("The extraction window must be non-empty");
const startMonth = `${from.slice(0, 7)}-01`;
const toDate = new Date(toMs);
const endMonthExclusive = to.endsWith("-01")
  ? to
  : new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

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
  if (!header || header.join("|") !== expected.join("|")) {
    throw new Error(`Unexpected rank CSV columns: ${(header || []).join(",")}`);
  }
  return rows.filter((values) => values.some(Boolean)).map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]))
  );
}

function timestamp(value, label) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}Z`))) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return Date.parse(`${value}Z`);
}

const sourceBuffer = fs.readFileSync(path.resolve(rankPath));
const sourceSha256 = createHash("sha256").update(sourceBuffer).digest("hex");
const sourceRows = parseCsv(sourceBuffer.toString("utf8"));
if (!sourceRows.length) throw new Error("Rank interval export is empty");
const allIntervals = sourceRows.map((row, index) => {
  const userId = Number(row.user_id);
  const rank = Number(row.rang);
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error(`Invalid user_id on row ${index + 2}`);
  if (!Number.isInteger(rank) || rank < 1 || rank > 18) throw new Error(`Invalid rank on row ${index + 2}`);
  const startMs = timestamp(row.rank_start_at, `rank_start_at on row ${index + 2}`);
  const endMs = timestamp(row.rank_end_at, `rank_end_at on row ${index + 2}`);
  return { userId, rank, start: row.rank_start_at, end: row.rank_end_at, startMs, endMs };
}).filter((interval) => interval.startMs < interval.endMs);

const byUser = new Map();
for (const interval of allIntervals) {
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

const eligibleIntervals = allIntervals.filter((interval) =>
  interval.rank >= rankMin && interval.rank <= rankMax && interval.endMs > fromMs && interval.startMs < toMs
);
if (!eligibleIntervals.length) throw new Error(`No rank intervals intersect ${from}..${to} for ranks ${rankMin}..${rankMax}`);
const eligibleUserIds = [...new Set(eligibleIntervals.map((interval) => interval.userId))].sort((left, right) => left - right);
const shardStart = Math.floor(eligibleUserIds.length * userShardIndex / userShardCount);
const shardEnd = Math.floor(eligibleUserIds.length * (userShardIndex + 1) / userShardCount);
const userIds = eligibleUserIds.slice(shardStart, shardEnd);
if (!userIds.length) throw new Error(`User shard ${userShardIndex}/${userShardCount} is empty for ${eligibleUserIds.length} eligible users`);
const selectedUsers = new Set(userIds);
const intervals = eligibleIntervals.filter((interval) => selectedUsers.has(interval.userId));
const tuples = intervals.map((interval) => `(${interval.userId},${interval.rank},'${interval.start}','${interval.end}')`);

const templateBuffer = fs.readFileSync(path.resolve(here, "../research/full-history-postflop-field-cube.sql"));
const template = templateBuffer.toString("utf8");
const sourceQueryTemplateSha256 = createHash("sha256").update(templateBuffer).digest("hex");
const rendered = template
  .replace("{{RANK_INTERVAL_ROWS}}", tuples.join(",\n    "))
  .replace("{{RANK_USER_IDS}}", userIds.join(","))
  .replaceAll("{{WINDOW_START_MONTH}}", startMonth)
  .replaceAll("{{WINDOW_END_MONTH_EXCLUSIVE}}", endMonthExclusive)
  .replaceAll("{{WINDOW_START_INCLUSIVE}}", from)
  .replaceAll("{{WINDOW_END_EXCLUSIVE}}", to);
if (rendered.includes("{{")) throw new Error("Unresolved query placeholder");

const sqlSha256 = createHash("sha256").update(rendered).digest("hex");
const metadata = {
  sourceRows: sourceRows.length,
  validIntervals: allIntervals.length,
  excludedZeroLength: sourceRows.length - allIntervals.length,
  sourceSha256,
  window: [from, to],
  rankShard: [rankMin, rankMax],
  userShard: {
    index: userShardIndex,
    count: userShardCount,
    startOffset: shardStart,
    endOffsetExclusive: shardEnd,
    eligibleUsers: eligibleUserIds.length,
    selectedUsers: userIds.length,
    selectedUserIdsSha256: createHash("sha256").update(userIds.join(",")).digest("hex")
  },
  shardIntervals: intervals.length,
  shardUsers: userIds.length,
  sourceQueryTemplateSha256,
  sqlSha256,
};
if (options.output) fs.writeFileSync(path.resolve(options.output), rendered);
if (options["meta-output"]) fs.writeFileSync(path.resolve(options["meta-output"]), `${JSON.stringify(metadata, null, 2)}\n`);
if (options.quiet !== "true") process.stderr.write(`${JSON.stringify(metadata)}\n`);
if (!options.output) process.stdout.write(rendered);
