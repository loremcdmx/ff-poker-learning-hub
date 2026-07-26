#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COIN_PARTY_HEADER_CONTRACT,
  COIN_PARTY_PUBLICATION_CONTRACT,
  COIN_PARTY_PUBLICATION_NETWORKS,
  coinPartyGrammarContract,
} from "./coin-party-publication-contract.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const membershipPath = process.argv[2];
const options = Object.fromEntries(process.argv.slice(3).map((argument) => {
  const match = argument.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`expected --key=value, got ${argument}`);
  return [match[1], match[2]];
}));
if (!membershipPath) {
  throw new Error(
    "usage: render-coin-party-publication-query.mjs membership.csv "
      + "--network=CoinPoker|PartyPoker --user-shard-index=0 --user-shard-count=4 "
      + "--mode=aggregate|gate --output=/private/tmp/query.sql "
      + "--metadata-output=/private/tmp/query.render.json "
      + "--parser-validation=/private/tmp/coin-party-overlap-validation.json "
      + "[--parser-template=/private/tmp/frozen-raw-parser.sql]",
  );
}
const network = options.network;
const mode = options.mode || "aggregate";
const shardIndex = Number(options["user-shard-index"] ?? 0);
const shardCount = Number(
  options["user-shard-count"]
    ?? COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork,
);
const output = path.resolve(options.output || "");
const metadataOutput = path.resolve(options["metadata-output"] || "");
const parserValidationPath = path.resolve(options["parser-validation"] || "");
const parserTemplatePath = options["parser-template"]
  ? path.resolve(options["parser-template"])
  : path.join(here, "q_ff_rfi_raw_hh_field_actions.sql");
if (!COIN_PARTY_PUBLICATION_NETWORKS.includes(network)) {
  throw new Error(`unsupported network ${network}`);
}
if (!["aggregate", "gate"].includes(mode)) throw new Error(`unsupported mode ${mode}`);
if (
  !Number.isInteger(shardIndex)
  || !Number.isInteger(shardCount)
  || shardCount !== COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork
  || shardIndex < 0
  || shardIndex >= shardCount
) throw new Error(`invalid frozen user shard ${shardIndex}/${shardCount}`);
if (![output, metadataOutput, parserValidationPath].every(
  (candidate) => candidate.startsWith("/private/tmp/"),
)) {
  throw new Error("rendered SQL, metadata, and parser validation must stay under /private/tmp");
}
if (
  options["parser-template"]
  && !parserTemplatePath.startsWith("/private/tmp/")
) {
  throw new Error("an explicit frozen parser template must stay under /private/tmp");
}

const membershipBuffer = fs.readFileSync(path.resolve(membershipPath));
const membershipRows = parseCsv(membershipBuffer.toString("utf8"));
const selectedRows = membershipRows.filter((row) => row.cohort === COIN_PARTY_PUBLICATION_CONTRACT.cohort);
const allIds = [...new Set(selectedRows.map((row) => positiveInteger(row.user_id, "user_id")))]
  .sort((left, right) => left - right);
if (allIds.length !== COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers) {
  throw new Error(`expected ${COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers} frozen l3top users, got ${allIds.length}`);
}
if (selectedRows.length !== allIds.length) throw new Error("duplicate frozen l3top cohort membership");
const membershipSha256 = sha256(membershipBuffer);
const userIdsSha256 = sha256(allIds.join(","));
if (
  membershipSha256 !== COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.membershipSha256
  || userIdsSha256 !== COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256
) {
  throw new Error("membership bytes/user ids do not match the frozen Coin/Party publication cohort");
}
const start = Math.floor(allIds.length * shardIndex / shardCount);
const end = Math.floor(allIds.length * (shardIndex + 1) / shardCount);
const shardIds = allIds.slice(start, end);
if (shardIds.length !== allIds.length / shardCount) {
  throw new Error(`unbalanced frozen shard ${shardIndex}/${shardCount}`);
}

const publicationTemplateBuffer = fs.readFileSync(
  path.join(here, "q_ff_rfi_coin_party_publication.sql"),
);
const parserTemplateBuffer = fs.readFileSync(
  parserTemplatePath,
);
const parserImplementationBuffer = fs.readFileSync(
  path.join(here, "coin-party-raw-hand-history-parser.mjs"),
);
const publicationTemplate = publicationTemplateBuffer.toString("utf8");
const parserTemplate = parserTemplateBuffer.toString("utf8");
const publicationTemplateSha256 = sha256(publicationTemplateBuffer);
const parserTemplateSha256 = sha256(parserTemplateBuffer);
const parserImplementationSha256 = sha256(parserImplementationBuffer);
const [windowStart, windowEnd] = COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window;
const through = previousDate(windowEnd);
const header = COIN_PARTY_HEADER_CONTRACT[network];
const trackerMonthStart = `${windowStart.slice(0, 7)}-01`;
const trackerMonthEnd = nextMonthStart(windowEnd);
const tuples = allIds.map((userId) => `('${COIN_PARTY_PUBLICATION_CONTRACT.cohort}', ${userId})`);
const uniqueUserIds = shardIds.join(", ");
const grammar = coinPartyGrammarContract();
const parserValidationBuffer = fs.readFileSync(parserValidationPath);
const parserValidation = JSON.parse(parserValidationBuffer.toString("utf8"));
validateParserValidation({
  report: parserValidation,
  reportSha256: sha256(parserValidationBuffer),
  parserTemplateSha256,
  parserImplementationSha256,
  grammarSha256: grammar.sha256,
  membershipSha256,
  userIdsSha256,
  window: [windowStart, windowEnd],
});

let aggregateBody = "";
if (mode === "aggregate") {
  const parserStart = parserTemplate.indexOf("latest_raw AS (");
  if (parserStart < 0) throw new Error("canonical raw-HH parser body not found");
  aggregateBody = parserTemplate.slice(parserStart)
    .replaceAll("{{UNIQUE_USER_IDS}}", uniqueUserIds)
    .replaceAll("{{WINDOW_START_INCLUSIVE}}", windowStart)
    .replaceAll("{{WINDOW_END_EXCLUSIVE}}", windowEnd)
    .replaceAll("{{WINDOW_THROUGH}}", through)
    .replace(
      "'888Poker',\n      'GGNetwork',\n      'PokerStars',\n      'PokerStars(FR-ES-PT)',\n      'Winamax.fr',\n      'WPN',\n      'iPoker'",
      `'${network}'`,
    )
    .replaceAll(
      "'(?i)^Seat\\\\s+[0-9]+:\\\\s+(.+?)\\\\s+\\\\(\\\\s*[0-9]'",
      "'(?i)^Seat\\\\s+[0-9]+:\\\\s+(.+?)\\\\s+\\\\(\\\\s*(?:€\\\\s*)?[0-9]'",
    )
    .replaceAll(
      "'(?i)^Seat\\\\s+[0-9]+:.*?\\\\(\\\\s*([0-9]+(?:,[0-9]{3})*(?:\\\\.[0-9]+)?)'",
      "'(?i)^Seat\\\\s+[0-9]+:.*?\\\\(\\\\s*(?:€\\\\s*)?([0-9]+(?:,[0-9]{3})*(?:\\\\.[0-9]+)?)'",
    )
    .replaceAll(
      "'(?i)posts(?:\\\\s+the)?\\\\s+(?:ante|small blind|big blind)\\\\s*\\\\[?\\\\s*([0-9][0-9,.]*)'",
      "'(?i)posts(?:\\\\s+the)?\\\\s+(?:ante|small blind|big blind)\\\\s*(?:\\\\[|\\\\(|€)?\\\\s*([0-9][0-9,.]*)'",
    )
    .replaceAll(
      "'(?is)\\\\*\\\\*\\\\*\\\\s*PRE-FLOP\\\\s*\\\\*\\\\*\\\\*\\\\*(.*?)(?:\\\\*\\\\*\\\\*\\\\s*(?:FLOP|SUMMARY)\\\\b|$)'",
      "'(?is)\\\\*\\\\*\\\\*\\\\s*PRE-FLOP\\\\s*\\\\*\\\\*\\\\*(.*?)(?:\\\\*\\\\*\\\\*\\\\s*(?:FLOP|SUMMARY)\\\\b|$)'",
    );
  const nullGate = "    AND converted_hh_id IS NOT NULL";
  if (!aggregateBody.includes(nullGate)) throw new Error("publication key gate insertion point missing");
  aggregateBody = aggregateBody.replace(
    nullGate,
    `${nullGate}
    AND tuple(
      toUInt64(check_user_id),
      toString(network),
      toString(assumeNotNull(converted_hh_id))
    ) IN (
      SELECT tuple(
        publication_user_id,
        publication_network,
        publication_hh_id
      )
      FROM publication_eligible_raw_keys
    )`,
  );
  const tableSizeProjection = "  toUInt8(7) AS table_size,";
  if (!aggregateBody.includes(tableSizeProjection)) throw new Error("aggregate provenance insertion point missing");
  aggregateBody = aggregateBody.replace(
    tableSizeProjection,
    `${tableSizeProjection}
  '${network}' AS supplemental_network,
  toUInt8(${shardIndex}) AS source_user_shard_index,
  toUInt8(${shardCount}) AS source_user_shard_count,
  any(a.gate_raw_keys) AS source_gate_raw_keys,
  any(a.gate_exact_id_match_keys) AS source_gate_exact_id_match_keys,
  any(a.gate_nominal_novel_keys) AS source_gate_nominal_novel_keys,
  any(a.gate_normalized_time_eligible_keys) AS source_gate_normalized_time_eligible_keys,
  any(a.gate_publication_eligible_keys) AS source_gate_publication_eligible_keys,`,
  );
  const finalJoin = "INNER JOIN membership_counts AS mc ON c.cohort = mc.cohort";
  if (!aggregateBody.includes(finalJoin)) throw new Error("aggregate assertion insertion point missing");
  aggregateBody = aggregateBody.replace(
    finalJoin,
    `${finalJoin}
CROSS JOIN assertions AS a
WHERE a.tracker_selection_assertion = 1
  AND a.exact_partition_assertion = 1
  AND a.publication_partition_assertion = 1`,
  );
} else {
  aggregateBody = `gate_result AS (
  SELECT
    '${network}' AS supplemental_network,
    toUInt8(${shardIndex}) AS source_user_shard_index,
    toUInt8(${shardCount}) AS source_user_shard_count,
    gate_raw_keys AS source_gate_raw_keys,
    gate_exact_id_match_keys AS source_gate_exact_id_match_keys,
    gate_nominal_novel_keys AS source_gate_nominal_novel_keys,
    gate_normalized_time_eligible_keys AS source_gate_normalized_time_eligible_keys,
    gate_publication_eligible_keys AS source_gate_publication_eligible_keys,
    tracker_selection_assertion,
    exact_partition_assertion,
    publication_partition_assertion
  FROM assertions
)
SELECT *
FROM gate_result;`;
}

const replacements = {
  "{{COHORT_MEMBERSHIP_TUPLES}}": tuples.join(", "),
  "{{UNIQUE_USER_IDS}}": uniqueUserIds,
  "{{WINDOW_START_INCLUSIVE}}": windowStart,
  "{{WINDOW_END_EXCLUSIVE}}": windowEnd,
  "{{TRACKER_MONTH_START}}": trackerMonthStart,
  "{{TRACKER_MONTH_END_EXCLUSIVE}}": trackerMonthEnd,
  "{{NETWORK}}": network,
  "{{RAW_HEADER_ID_PATTERN}}": sqlPattern(header.rawHeaderIdPattern),
  "{{STRUCTURED_HEADER_ID_EXPRESSION}}": header.structuredHeaderIdExpression,
  "{{RAW_HEADER_MATCH_PREDICATE}}": header.rawHeaderMatchPredicate,
  "{{AGGREGATE_BODY}}": aggregateBody,
};
let rendered = publicationTemplate;
for (const [placeholder, value] of Object.entries(replacements)) {
  rendered = rendered.replaceAll(placeholder, () => value);
}
validateRendered(rendered, network, mode);

const metadata = {
  schema: "ff-rfi-coin-party-publication-render-v2",
  mode,
  network,
  cohort: COIN_PARTY_PUBLICATION_CONTRACT.cohort,
  selectedPlayers: allIds.length,
  window: [windowStart, windowEnd],
  userShard: {
    index: shardIndex,
    count: shardCount,
    users: shardIds.length,
    userIdsSha256: sha256(shardIds.join(",")),
  },
  membershipSha256,
  userIdsSha256,
  frozenMembership: {
    membershipSha256Matches: true,
    userIdsSha256Matches: true,
  },
  publicationTemplateSha256,
  parserTemplateSha256,
  parserImplementationSha256,
  grammarSha256: grammar.sha256,
  parserValidation: {
    schema: parserValidation.schema,
    reportSha256: sha256(parserValidationBuffer),
    parserTemplateSha256,
    parserImplementationSha256,
    grammarSha256: grammar.sha256,
    membershipSha256,
    userIdsSha256,
    window: [windowStart, windowEnd],
  },
  privateOverlapValidation: COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation,
  expectedStrongNetworkTotals:
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.strongGateTotals[network],
  cube: {
    stackBuckets: 9,
    positions: 6,
    handClasses: 169,
    possibleCells: 9126,
    targetFilter: false,
  },
  targetFilter: false,
  exactTableContract: {
    tableSize: 7,
    playerCountPredicate: "player_count = 7",
    seatCountPredicate: "length(seat_numbers) = 7",
    distinctSeatPredicate: "length(arrayDistinct(seat_numbers)) = 7",
  },
  execution: COIN_PARTY_PUBLICATION_CONTRACT.execution,
  privacy: COIN_PARTY_PUBLICATION_CONTRACT.privacy,
  renderedSqlSha256: sha256(rendered),
};
fs.writeFileSync(output, rendered, { mode: 0o600 });
fs.writeFileSync(metadataOutput, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({
  schema: metadata.schema,
  mode,
  network,
  userShard: {
    index: shardIndex,
    count: shardCount,
    users: shardIds.length,
    userIdsSha256: metadata.userShard.userIdsSha256,
  },
  frozenMembership: metadata.frozenMembership,
  renderedSqlSha256: metadata.renderedSqlSha256,
}));

function validateRendered(sql, selectedNetwork, selectedMode) {
  const unresolved = [...sql.matchAll(/\{\{[^}]+\}\}/g)].map((match) => match[0]);
  if (unresolved.length) {
    throw new Error(`unresolved query placeholder: ${[...new Set(unresolved)].join(", ")}`);
  }
  if (!sql.includes("publication_eligible_raw_keys")) throw new Error("strong publication key gate missing");
  if (!sql.includes("raw_canonical_header_index")) throw new Error("raw canonical-header uniqueness gate missing");
  if (!sql.includes("raw_header_key_count, toUInt64(0)) = 1")) {
    throw new Error("raw canonical-header collision rejection missing");
  }
  if (!sql.includes("tracker_selection_drift = 0")) throw new Error("deterministic tracker assertion missing");
  if (!sql.includes("raw exact-id partition identity failed")) throw new Error("exact partition assertion missing");
  if (!sql.includes("publication eligibility partition failed")) throw new Error("publication partition assertion missing");
  if (!sql.includes(`network = '${selectedNetwork}'`)) throw new Error("network gate missing");
  if (sql.includes("hand_class IN (") || sql.includes("target_hand")) {
    throw new Error("target-cell filtering is forbidden");
  }
  if (/\bhand_class\s*(?:=|IN\s*\(|LIKE\b)/i.test(sql)) {
    throw new Error("target hand-class filtering is forbidden");
  }
  if (/\b(?:position_group|stack_bucket)\s*(?:=|IN\s*\(|LIKE\b)/i.test(sql)) {
    throw new Error("target position/stack filtering is forbidden");
  }
  if (selectedMode === "aggregate") {
    for (const required of [
      "WHERE player_count = 7",
      "AND length(seat_numbers) = 7",
      "AND length(arrayDistinct(seat_numbers)) = 7",
      "'cnt_players = 7' AS table_filter",
      "toUInt8(7) AS table_size",
      "countIf(action_class = 'raise') AS regular_raise",
      "countIf(action_class = 'shove') AS open_shove",
      "countIf(action_class = 'limp') AS limp",
      "countIf(action_class = 'fold') AS fold_other",
      "normal_three_bb_as_shove",
      "FROM publication_eligible_raw_keys",
    ]) if (!sql.includes(required)) throw new Error(`aggregate contract missing ${required}`);
    if (!sql.includes("(?:€\\\\s*)?")) throw new Error("Coin/Party euro seat grammar missing");
    if (!sql.includes("(?:\\\\[|\\\\(|€)?")) throw new Error("Party parenthesized forced-amount grammar missing");
    if (!sql.includes("[^\\\\r\\\\n]*$') AS dealt_lines")) {
      throw new Error("canonical dealt-line regex end anchor was corrupted");
    }
    if (!sql.includes("[^\\\\r\\\\n]*$'")) {
      throw new Error("canonical raw parser regex end anchors were corrupted");
    }
  }
}

function validateParserValidation({
  report,
  reportSha256,
  parserTemplateSha256,
  parserImplementationSha256,
  grammarSha256,
  membershipSha256,
  userIdsSha256,
  window,
}) {
  const expected = COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation;
  const binding = expected.binding;
  const actualBinding = {
    reportSchema: report.schema,
    parserTemplateSha256,
    parserImplementationSha256,
    grammarSha256,
    membershipSha256,
    userIdsSha256,
    window,
  };
  if (stableJson(actualBinding) !== stableJson(binding)) {
    throw new Error("parser validation report is stale for the current grammar/window/membership");
  }
  if (stableJson(report.binding) !== stableJson({
    parserTemplateSha256,
    parserImplementationSha256,
    grammarSha256,
    membershipSha256,
    userIdsSha256,
    window,
  })) {
    throw new Error("parser validation report does not carry the current grammar/window/membership binding");
  }
  if (report.status !== "passed") throw new Error("parser validation report did not pass");
  if (stableJson(report.source) !== stableJson({
    ...expected.source,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  })) {
    throw new Error("parser validation source bytes/window coverage drift");
  }
  if (!/^[a-f0-9]{64}$/.test(reportSha256)) {
    throw new Error("parser validation report bytes are not hashable");
  }
  const validatedAt = Date.parse(report.validatedAt || "");
  const windowEnd = Date.parse(`${window[1]}T00:00:00Z`);
  if (!Number.isFinite(validatedAt) || validatedAt < windowEnd) {
    throw new Error("parser validation report predates the frozen window cutoff");
  }
  const coin = report.networks?.CoinPoker;
  const party = report.networks?.PartyPoker;
  if (
    Number(coin?.rows) !== expected.CoinPoker.sample
    || Number(coin?.parsed) !== expected.CoinPoker.accepted
    || Number(coin?.rejected) !== 0
  ) throw new Error("CoinPoker parser overlap proof drift");
  if (
    Number(party?.rows) !== expected.PartyPoker.exact7Sample + expected.PartyPoker.raw8Sample
    || Number(party?.parsed) !== expected.PartyPoker.acceptedExact7
    || Number(party?.rejected) !== expected.PartyPoker.rejectedRaw8
    || Number(party?.reasons?.["not-exact-7"]) !== expected.PartyPoker.rejectedRaw8
  ) throw new Error("PartyPoker exact-7 parser overlap proof drift");
  for (const [network, stats] of [["CoinPoker", coin], ["PartyPoker", party]]) {
    for (const checkName of ["cards", "position", "stack", "publicStack", "action", "shove"]) {
      const check = stats?.checks?.[checkName];
      if (
        !Number.isSafeInteger(Number(check?.compared))
        || Number(check?.compared) <= 0
        || Number(check?.matched) !== Number(check?.compared)
        || Number(check?.pct) !== 100
      ) throw new Error(`${network} parser ${checkName} overlap proof drift`);
    }
  }
}

function parseCsv(text) {
  const parsed = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      parsed.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    parsed.push(row);
  }
  const header = parsed.shift() || [];
  return parsed.filter((values) => values.some(Boolean)).map((values) => (
    Object.fromEntries(header.map((column, index) => [column, values[index] ?? ""]))
  ));
}

function positiveInteger(value, label) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return result;
}

function previousDate(date) {
  return new Date(Date.parse(`${date}T00:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10);
}

function nextMonthStart(date) {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  return value.toISOString().slice(0, 10);
}

function sqlPattern(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "''");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}
