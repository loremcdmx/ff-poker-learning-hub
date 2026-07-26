import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const realizer = require(path.resolve(here, "../../poker-kit/simulator/bot-range-realizer.js"));
const membershipPath = process.argv[2];
const options = Object.fromEntries(process.argv.slice(3).map((item) => {
  const match = item.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${item}`);
  return [match[1], match[2]];
}));

if (!membershipPath) {
  throw new Error("Usage: node render-field-action-query.mjs /path/to/cohort-membership.csv --from=YYYY-MM-DD --to=YYYY-MM-DD");
}

const from = options.from;
const to = options.to;
if (!from || !to) {
  throw new Error("Both --from and --to are required; the extraction window is half-open UTC [from, to)");
}
const sourceTable = options["source-table"] || "analytics.int_tracker_hand_joined";
const userShardIndex = Number(options["user-shard-index"] ?? 0);
const userShardCount = Number(options["user-shard-count"] ?? 1);
const output = options.output ? path.resolve(options.output) : "";
const metadataOutput = options["metadata-output"] ? path.resolve(options["metadata-output"]) : "";
if ([output, metadataOutput].some((candidate) => candidate && !candidate.startsWith("/private/tmp/"))) {
  throw new Error("Rendered field-action SQL and metadata must stay under /private/tmp");
}
const ranks = "AKQJT98765432";
const handClasses = [...ranks].flatMap((highRank, highIndex) => [
  `${highRank}${highRank}`,
  ...[...ranks].slice(highIndex + 1).flatMap((lowRank) => [`${highRank}${lowRank}s`, `${highRank}${lowRank}o`]),
]);
const canonicalHandClasses = new Set(realizer.HAND_CLASSES.map((item) => item.key));
if (handClasses.length !== 169 || handClasses.some((handClass) => !canonicalHandClasses.has(handClass)) || handClasses[0] !== "AA" || handClasses[1] !== "AKs" || handClasses[2] !== "AKo" || handClasses.at(-1) !== "22") {
  throw new Error("Canonical 1..169 holecard-id mapping contract changed");
}
const holecardMapping = handClasses.map((handClass, index) => `${index + 1}|${handClass}`);
const holecardMappingSha256 = crypto.createHash("sha256").update(holecardMapping.join("\n")).digest("hex");
const sourceConfig = {
  "analytics.int_tracker_hand_joined": {
    handClassMode: "joined-holecards-str",
    handClassExpression: "ifNull(h.holecards_str, '')",
    holecardMappingSha256: null,
  },
  "analytics.bak20260720_int_tracker_hand_joined": {
    handClassMode: "verified-holecard-id-1-169",
    handClassExpression: `transform(toInt32(ifNull(h.holecard_id, 0)), [${handClasses.map((_, index) => index + 1).join(", ")}], [${handClasses.map((handClass) => `'${handClass}'`).join(", ")}], '')`,
    holecardMappingSha256,
  },
}[sourceTable];
if (!sourceConfig) throw new Error(`Unsupported field-action source table ${sourceTable}`);
if (!Number.isInteger(userShardIndex) || !Number.isInteger(userShardCount) || userShardCount < 1 || userShardIndex < 0 || userShardIndex >= userShardCount) {
  throw new Error(`Invalid user shard ${userShardIndex}/${userShardCount}`);
}
for (const [label, value] of [["from", from], ["to", to]]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ${label} date ${value}`);
}
const fromDate = new Date(`${from}T00:00:00Z`);
const toDate = new Date(`${to}T00:00:00Z`);
if (!(fromDate < toDate)) throw new Error("The extraction window must be non-empty");
const throughDate = new Date(toDate.getTime() - 86400000);
const startMonth = `${from.slice(0, 7)}-01`;
const toIsMonthStart = to.endsWith("-01");
const endMonthExclusiveDate = toIsMonthStart
  ? toDate
  : new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth() + 1, 1));
const isoDate = (value) => value.toISOString().slice(0, 10);

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
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

const membershipText = fs.readFileSync(path.resolve(membershipPath), "utf8");
const memberships = parseCsv(membershipText);
const allowedCohorts = new Set(["l3top", "l3", "l2", "l1"]);
if (!memberships.length) throw new Error("Cohort membership export is empty");
const membershipKeys = memberships.map((row) => `${row.cohort}|${row.user_id}`).sort();
if (new Set(membershipKeys).size !== membershipKeys.length) throw new Error("Duplicate cohort/user membership key");

const allUniqueUserIds = [...new Set(memberships.map((row) => Number(row.user_id)))].sort((left, right) => left - right);
if (allUniqueUserIds.some((userId) => !Number.isSafeInteger(userId) || userId <= 0)) throw new Error("Invalid user_id in membership export");
const shardStart = Math.floor(allUniqueUserIds.length * userShardIndex / userShardCount);
const shardEnd = Math.floor(allUniqueUserIds.length * (userShardIndex + 1) / userShardCount);
const uniqueUserIds = allUniqueUserIds.slice(shardStart, shardEnd);
if (!uniqueUserIds.length) throw new Error(`Empty user shard ${userShardIndex}/${userShardCount} for ${allUniqueUserIds.length} users`);
const selectedUserIds = new Set(uniqueUserIds);
const shardMemberships = memberships.filter((row) => selectedUserIds.has(Number(row.user_id)));
const tuples = shardMemberships.map((row) => {
  if (!allowedCohorts.has(row.cohort)) throw new Error(`Unexpected cohort ${row.cohort}`);
  const userId = Number(row.user_id);
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error(`Invalid user_id ${row.user_id}`);
  return `('${row.cohort}', ${userId})`;
});

const template = fs.readFileSync(path.join(here, "q_ff_rfi_field_actions.sql"), "utf8");
const clickHouseStart = template.indexOf("WITH members AS (");
if (clickHouseStart < 0) throw new Error("ClickHouse query marker not found");
const rendered = template.slice(clickHouseStart)
  .replaceAll("{{SOURCE_TABLE}}", sourceTable)
  .replaceAll("{{HAND_CLASS_EXPRESSION}}", sourceConfig.handClassExpression)
  .replace("{{COHORT_MEMBERSHIP_TUPLES}}", tuples.join(", "))
    .replaceAll("{{UNIQUE_USER_IDS}}", uniqueUserIds.join(", "))
  .replaceAll("{{WINDOW_START_INCLUSIVE}}", from)
  .replaceAll("{{WINDOW_END_EXCLUSIVE}}", to)
  .replaceAll("{{WINDOW_THROUGH}}", isoDate(throughDate))
  .replaceAll("{{WINDOW_START_MONTH}}", startMonth)
  .replaceAll("{{WINDOW_END_MONTH_EXCLUSIVE}}", isoDate(endMonthExclusiveDate));
if (rendered.includes("{{")) throw new Error("Unresolved query placeholder");
const metadata = {
  templateSha256: crypto.createHash("sha256").update(template).digest("hex"),
  renderedSqlSha256: crypto.createHash("sha256").update(rendered).digest("hex"),
  sourceTable,
  handClassMode: sourceConfig.handClassMode,
  holecardMappingSha256: sourceConfig.holecardMappingSha256,
  membershipSha256: crypto.createHash("sha256").update(membershipText).digest("hex"),
  membershipKeysSha256: crypto.createHash("sha256").update(membershipKeys.join("\n")).digest("hex"),
  membershipCohortCounts: Object.fromEntries(
    [...allowedCohorts].map((cohort) => [cohort, memberships.filter((row) => row.cohort === cohort).length])
  ),
  sourceMembershipRows: memberships.length,
  sourceUniqueUsers: allUniqueUserIds.length,
  shardMembershipRows: shardMemberships.length,
  shardUsers: uniqueUserIds.length,
  window: [from, to],
  userShard: {
    index: userShardIndex,
    count: userShardCount,
    firstUserId: uniqueUserIds[0],
    lastUserId: uniqueUserIds.at(-1),
    userIdsSha256: crypto.createHash("sha256").update(uniqueUserIds.join(",")).digest("hex")
  }
};
if (metadataOutput) fs.writeFileSync(metadataOutput, `${JSON.stringify(metadata)}\n`, { mode: 0o600 });
else process.stderr.write(`${JSON.stringify(metadata)}\n`);
if (output) {
  fs.writeFileSync(output, rendered, { mode: 0o600 });
  process.stdout.write(`${output}\n`);
} else {
  process.stdout.write(rendered);
}
