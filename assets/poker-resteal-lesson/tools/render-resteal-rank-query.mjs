#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const membershipPath = process.argv[2];
const options = Object.fromEntries(process.argv.slice(3).map((item) => {
  const match = item.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${item}`);
  return [match[1], match[2]];
}));

if (!membershipPath) {
  throw new Error("Usage: node render-resteal-rank-query.mjs /private/path/rank-intervals.csv --rank-min=1 --rank-max=18");
}

const rankMin = Number(options["rank-min"] ?? 1);
const rankMax = Number(options["rank-max"] ?? 18);
if (!Number.isInteger(rankMin) || !Number.isInteger(rankMax) || rankMin < 1 || rankMax > 18 || rankMin > rankMax) {
  throw new Error(`Invalid rank shard ${rankMin}..${rankMax}`);
}
const from = options.from || "2023-09-01";
const to = options.to || "2026-07-22";
const userShardIndex = Number(options["user-shard-index"] ?? 0);
const userShardCount = Number(options["user-shard-count"] ?? 1);
if (!Number.isInteger(userShardIndex) || !Number.isInteger(userShardCount) || userShardCount < 1 || userShardIndex < 0 || userShardIndex >= userShardCount) {
  throw new Error(`Invalid user shard ${userShardIndex}/${userShardCount}`);
}
const output = options.output ? path.resolve(options.output) : "";
const metadataOutput = options["metadata-output"] ? path.resolve(options["metadata-output"]) : "";
if ([output, metadataOutput].some((candidate) => candidate && !candidate.startsWith("/private/tmp/"))) {
  throw new Error("Rendered rank SQL and metadata must stay under /private/tmp");
}
for (const [label, value] of [["from", from], ["to", to]]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ${label} date ${value}`);
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
  if (!header) return [];
  const expected = ["user_id", "rang", "rank_start_at", "rank_end_at"];
  if (header.join("|") !== expected.join("|")) throw new Error(`Unexpected rank CSV columns: ${header.join(",")}`);
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

function validTimestamp(value, label) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}Z`))) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return Date.parse(`${value}Z`);
}

const sourceRows = parseCsv(fs.readFileSync(path.resolve(membershipPath), "utf8"));
if (!sourceRows.length) throw new Error("Rank interval export is empty");

const allIntervals = sourceRows.map((row, index) => {
  const userId = Number(row.user_id);
  const rank = Number(row.rang);
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error(`Invalid user_id on row ${index + 2}`);
  if (!Number.isInteger(rank) || rank < 1 || rank > 18) throw new Error(`Invalid rank on row ${index + 2}`);
  const startMs = validTimestamp(row.rank_start_at, `rank_start_at on row ${index + 2}`);
  const endMs = validTimestamp(row.rank_end_at, `rank_end_at on row ${index + 2}`);
  return { userId, rank, start: row.rank_start_at, end: row.rank_end_at, startMs, endMs };
}).filter((interval) => interval.startMs < interval.endMs);

const byUser = new Map();
for (const interval of allIntervals) {
  if (!byUser.has(interval.userId)) byUser.set(interval.userId, []);
  byUser.get(interval.userId).push(interval);
}
for (const [userId, intervals] of byUser) {
  intervals.sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs || left.rank - right.rank);
  for (let index = 1; index < intervals.length; index += 1) {
    if (intervals[index].startMs < intervals[index - 1].endMs) throw new Error(`Overlapping rank intervals for user ${userId}`);
  }
}

const eligibleIntervals = allIntervals.filter((interval) => interval.rank >= rankMin && interval.rank <= rankMax && interval.endMs > fromMs && interval.startMs < toMs);
if (!eligibleIntervals.length) throw new Error(`No intervals in rank shard ${rankMin}..${rankMax}`);
const eligibleUserIds = [...new Set(eligibleIntervals.map((interval) => interval.userId))].sort((left, right) => left - right);
const shardStart = Math.floor(eligibleUserIds.length * userShardIndex / userShardCount);
const shardEnd = Math.floor(eligibleUserIds.length * (userShardIndex + 1) / userShardCount);
const userIds = eligibleUserIds.slice(shardStart, shardEnd);
if (!userIds.length) throw new Error(`Empty user shard ${userShardIndex}/${userShardCount} for ${eligibleUserIds.length} users`);
const selectedUsers = new Set(userIds);
const intervals = eligibleIntervals.filter((interval) => selectedUsers.has(interval.userId));
const tuples = intervals.map((interval) => `(${interval.userId}, ${interval.rank}, '${interval.start}', '${interval.end}')`);

const template = fs.readFileSync(path.join(here, "resteal-rank-cube.sql"), "utf8");
const clickHouseStart = template.indexOf("WITH\nrank_intervals AS");
if (clickHouseStart < 0) throw new Error("ClickHouse query marker not found");
const rendered = template.slice(clickHouseStart)
  .replace("{{RANK_INTERVAL_ROWS}}", tuples.join(", "))
  .replaceAll("{{RANK_USER_IDS}}", userIds.join(", "))
  .replaceAll("toDate('2023-09-01')", `toDate('${startMonth}')`)
  .replaceAll("{{WINDOW_END_MONTH_EXCLUSIVE}}", endMonthExclusive)
  .replaceAll("{{WINDOW_START_INCLUSIVE}}", from)
  .replaceAll("{{WINDOW_END_EXCLUSIVE}}", to);
const queryEnd = rendered.indexOf("\n-- -------------------------------------------------------------------------\n-- 3. BigQuery");
const query = (queryEnd >= 0 ? rendered.slice(0, queryEnd) : rendered).trim();
if (query.includes("{{")) throw new Error("Unresolved query placeholder");
const metadata = {
  templateSha256: crypto.createHash("sha256").update(template).digest("hex"),
  sourceRows: sourceRows.length,
  validIntervals: allIntervals.length,
  excludedZeroLength: sourceRows.length - allIntervals.length,
  window: [from, to],
  shard: [rankMin, rankMax],
  shardIntervals: intervals.length,
  shardUsers: userIds.length,
  userShard: {
    index: userShardIndex,
    count: userShardCount,
    eligibleUsers: eligibleUserIds.length,
    firstUserId: userIds[0],
    lastUserId: userIds.at(-1),
    userIdsSha256: crypto.createHash("sha256").update(userIds.join(",")).digest("hex")
  }
};
if (metadataOutput) fs.writeFileSync(metadataOutput, `${JSON.stringify(metadata)}\n`, { mode: 0o600 });
else process.stderr.write(`${JSON.stringify(metadata)}\n`);
if (output) {
  fs.writeFileSync(output, query + "\n", { mode: 0o600 });
  process.stdout.write(output + "\n");
} else {
  process.stdout.write(query + "\n");
}
