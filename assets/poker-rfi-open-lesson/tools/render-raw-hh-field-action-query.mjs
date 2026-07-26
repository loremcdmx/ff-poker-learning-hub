#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const membershipPath = process.argv[2];
const parserNetworks = Object.freeze([
  "888Poker",
  "Chico",
  "GGNetwork",
  "PokerPlanets",
  "PokerStars",
  "PokerStars(FR-ES-PT)",
  "Winamax.fr",
  "WPN",
  "iPoker",
]);
const options = Object.fromEntries(process.argv.slice(3).map((item) => {
  const match = item.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${item}`);
  return [match[1], match[2]];
}));
if (!membershipPath) {
  throw new Error("Usage: node render-raw-hh-field-action-query.mjs /private/path/membership.csv --from=YYYY-MM-DD --to=YYYY-MM-DD");
}

const from = options.from || "2020-01-01";
const to = options.to || "2023-09-01";
const selectedCohorts = new Set(String(options.cohorts || "l3top,l3,l2,l1").split(",").filter(Boolean));
const requestedNetworks = String(options.networks || parserNetworks.join(","))
  .split(",")
  .map((network) => network.trim())
  .filter(Boolean);
const selectedNetworks = parserNetworks.filter((network) => requestedNetworks.includes(network));
const userShardIndex = Number(options["user-shard-index"] ?? 0);
const userShardCount = Number(options["user-shard-count"] ?? 1);
const output = options.output ? path.resolve(options.output) : "";
const metadataOutput = options["metadata-output"] ? path.resolve(options["metadata-output"]) : "";
if ([output, metadataOutput].some((candidate) => candidate && !candidate.startsWith("/private/tmp/"))) {
  throw new Error("Rendered raw-HH SQL and metadata must stay under /private/tmp");
}
const allowedCohorts = ["l3top", "l3", "l2", "l1"];
if (!selectedCohorts.size || [...selectedCohorts].some((cohort) => !allowedCohorts.includes(cohort))) {
  throw new Error(`Invalid cohort selection: ${[...selectedCohorts].join(",")}`);
}
if (
  !requestedNetworks.length
  || new Set(requestedNetworks).size !== requestedNetworks.length
  || selectedNetworks.length !== requestedNetworks.length
) {
  throw new Error(`Invalid network selection: ${requestedNetworks.join(",")}`);
}
if (!Number.isInteger(userShardIndex) || !Number.isInteger(userShardCount) || userShardCount < 1 || userShardIndex < 0 || userShardIndex >= userShardCount) {
  throw new Error(`Invalid user shard ${userShardIndex}/${userShardCount}`);
}
for (const [label, value] of [["from", from], ["to", to]]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ${label} date ${value}`);
}
const fromDate = new Date(`${from}T00:00:00Z`);
const toDate = new Date(`${to}T00:00:00Z`);
if (!(fromDate < toDate)) throw new Error("The extraction window must be non-empty");

const membershipText = fs.readFileSync(path.resolve(membershipPath), "utf8");
const memberships = parseCsv(membershipText);
if (!memberships.length) throw new Error("Cohort membership export is empty");
const membershipKeys = memberships.map((row) => `${row.cohort}|${row.user_id}`).sort();
if (new Set(membershipKeys).size !== membershipKeys.length) throw new Error("Duplicate cohort/user membership key");
for (const row of memberships) {
  if (!allowedCohorts.includes(row.cohort)) throw new Error(`Unexpected cohort ${row.cohort}`);
  if (!Number.isSafeInteger(Number(row.user_id)) || Number(row.user_id) <= 0) throw new Error(`Invalid user_id ${row.user_id}`);
}

const selectedMemberships = memberships.filter((row) => selectedCohorts.has(row.cohort));
const allSelectedUserIds = [...new Set(selectedMemberships.map((row) => Number(row.user_id)))]
  .sort((left, right) => left - right);
const shardStart = Math.floor(allSelectedUserIds.length * userShardIndex / userShardCount);
const shardEnd = Math.floor(allSelectedUserIds.length * (userShardIndex + 1) / userShardCount);
const userIds = allSelectedUserIds.slice(shardStart, shardEnd);
if (!userIds.length) throw new Error(`Empty raw-HH user shard ${userShardIndex}/${userShardCount}`);
const userIdSet = new Set(userIds);
const shardMemberships = selectedMemberships.filter((row) => userIdSet.has(Number(row.user_id)));
const tuples = shardMemberships.map((row) => `('${row.cohort}', ${Number(row.user_id)})`);

const template = fs.readFileSync(path.join(here, "q_ff_rfi_raw_hh_field_actions.sql"), "utf8");
const defaultNetworkClause = `AND network IN (\n${
  parserNetworks.map((network) => `      '${network}'`).join(",\n")
}\n    )`;
const selectedNetworkClause = `AND network IN (\n${
  selectedNetworks.map((network) => `      '${network}'`).join(",\n")
}\n    )`;
if (!template.includes(defaultNetworkClause)) {
  throw new Error("Raw-HH template network clause drift");
}
const through = new Date(toDate.getTime() - 86400000).toISOString().slice(0, 10);
const rendered = template
  .replace(defaultNetworkClause, selectedNetworkClause)
  .replace("{{COHORT_MEMBERSHIP_TUPLES}}", tuples.join(", "))
  .replaceAll("{{UNIQUE_USER_IDS}}", userIds.join(", "))
  .replaceAll("{{WINDOW_START_INCLUSIVE}}", from)
  .replaceAll("{{WINDOW_END_EXCLUSIVE}}", to)
  .replaceAll("{{WINDOW_THROUGH}}", through);
if (rendered.includes("{{")) throw new Error("Unresolved raw-HH query placeholder");

const metadata = {
  schema: "ff-rfi-raw-hh-render-v1",
  templateSha256: sha256(template),
  renderedSqlSha256: sha256(rendered),
  sourceTable: "analytics.stg_hh_texts__hh_texts",
  handClassMode: "validated-raw-hh-text-and-ipoker-xml-v4",
  actionCommitmentMode: "network-and-line-aware-v1",
  actionCommitmentRules: {
    "888Poker single amount without total-to token": "action amount plus Hero posted blind",
    "text raises X to Y": "last action-suffix amount is the final total-to commitment",
    "other text raises": "last action-suffix amount is the commitment",
    "iPoker XML": "hero action sum is the commitment",
  },
  parserNetworks,
  selectedNetworks,
  membershipSha256: sha256(membershipText),
  membershipKeysSha256: sha256(membershipKeys.join("\n")),
  membershipCohortCounts: Object.fromEntries(allowedCohorts.map((cohort) => [
    cohort,
    memberships.filter((row) => row.cohort === cohort).length,
  ])),
  sourceMembershipRows: memberships.length,
  sourceUniqueUsers: new Set(memberships.map((row) => Number(row.user_id))).size,
  selectedCohorts: [...selectedCohorts],
  selectedMembershipRows: selectedMemberships.length,
  selectedUniqueUsers: allSelectedUserIds.length,
  shardMembershipRows: shardMemberships.length,
  shardUsers: userIds.length,
  window: [from, to],
  userShard: {
    index: userShardIndex,
    count: userShardCount,
    firstUserId: userIds[0],
    lastUserId: userIds.at(-1),
    userIdsSha256: sha256(userIds.join(",")),
  },
};

if (metadataOutput) fs.writeFileSync(metadataOutput, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
else process.stderr.write(`${JSON.stringify(metadata)}\n`);
if (output) {
  fs.writeFileSync(output, rendered, { mode: 0o600 });
  process.stdout.write(`${output}\n`);
} else {
  process.stdout.write(rendered);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === "\"" && text[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const header = rows.shift();
  if (!header) return [];
  return rows.filter((values) => values.some(Boolean)).map((values) => (
    Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]))
  ));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
