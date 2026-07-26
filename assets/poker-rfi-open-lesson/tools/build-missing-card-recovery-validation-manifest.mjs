#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.join(here, "q_ff_rfi_missing_cards_recovery.sql");
const NETWORKS = [
  "888Poker",
  "Chico",
  "GGNetwork",
  "PokerPlanets",
  "PokerStars",
  "PokerStars(FR-ES-PT)",
  "Winamax.fr",
  "WPN",
  "iPoker",
];
const COLUMNS = [
  "network",
  "tracker_rows",
  "tracker_known_with_raw",
  "raw_hh_joined",
  "parser_success",
  "class_matches",
  "class_failures",
  "match_pct_tracker_known",
  "tracker_missing_recovered",
  "validation_passed",
];
const EXPECTED_JOIN = Object.freeze({
  type: "exact-key",
  trackerKey: ["toUInt64(user_id)", "toString(network)", "toString(hh_id)"],
  rawKey: [
    "toUInt64(check_user_id)",
    "toString(network)",
    "toString(converted_hh_id)",
  ],
});
const WINDOW = ["2026-07-01", "2026-07-02"];

const options = parseOptions(process.argv.slice(2));
for (const required of ["result", "renderer-metadata", "query", "receipt", "output"]) {
  if (!options[required]) throw new Error(`Missing --${required}`);
  const absolute = path.resolve(options[required]);
  if (!absolute.startsWith("/private/tmp/")) {
    throw new Error(`--${required} must stay under /private/tmp`);
  }
  options[required] = absolute;
}

const resultBuffer = fs.readFileSync(options.result);
const metadataBuffer = fs.readFileSync(options["renderer-metadata"]);
const queryBuffer = fs.readFileSync(options.query);
const receiptBuffer = fs.readFileSync(options.receipt);
const templateBuffer = fs.readFileSync(templatePath);
const metadata = JSON.parse(metadataBuffer.toString("utf8"));
const query = queryBuffer.toString("utf8");
validateRendererMetadata(metadata, templateBuffer, queryBuffer);
validateRenderedSql(query);

const rows = parseCsv(resultBuffer.toString("utf8"), options.result);
if (rows.length !== NETWORKS.length) {
  throw new Error("Validation result must contain exactly the nine parser networks");
}
const networks = {};
const totals = {
  trackerRows: 0,
  trackerKnownWithRaw: 0,
  rawHhJoined: 0,
  parserSuccess: 0,
  classMatches: 0,
  classFailures: 0,
  trackerMissingRecovered: 0,
};
for (const [index, row] of rows.entries()) {
  const location = `${options.result}:${index + 2}`;
  if (!NETWORKS.includes(row.network)) throw new Error(`${location}: unexpected validation network ${row.network}`);
  if (networks[row.network]) throw new Error(`${location}: duplicate validation network ${row.network}`);
  const counters = {
    trackerRows: positiveInteger(row.tracker_rows, "tracker_rows", location),
    trackerKnownWithRaw: positiveInteger(row.tracker_known_with_raw, "tracker_known_with_raw", location),
    rawHhJoined: nonNegativeInteger(row.raw_hh_joined, "raw_hh_joined", location),
    parserSuccess: nonNegativeInteger(row.parser_success, "parser_success", location),
    classMatches: nonNegativeInteger(row.class_matches, "class_matches", location),
    classFailures: nonNegativeInteger(row.class_failures, "class_failures", location),
    matchPctTrackerKnown: finiteNumber(row.match_pct_tracker_known, "match_pct_tracker_known", location),
    trackerMissingRecovered: nonNegativeInteger(
      row.tracker_missing_recovered,
      "tracker_missing_recovered",
      location,
    ),
    validationPassed: nonNegativeInteger(row.validation_passed, "validation_passed", location),
  };
  if (counters.rawHhJoined < counters.trackerKnownWithRaw) {
    throw new Error(`${location}: raw_hh_joined is below tracker_known_with_raw`);
  }
  if (counters.parserSuccess > counters.rawHhJoined) {
    throw new Error(`${location}: parser_success exceeds raw_hh_joined`);
  }
  if (counters.classFailures !== 0) {
    throw new Error(`${row.network}: class_failures must be zero`);
  }
  if (counters.classMatches !== counters.trackerKnownWithRaw) {
    throw new Error(`${row.network}: class_matches must equal tracker_known_with_raw`);
  }
  if (counters.matchPctTrackerKnown !== 100) {
    throw new Error(`${row.network}: match_pct_tracker_known must equal 100`);
  }
  if (counters.validationPassed !== 1) {
    throw new Error(`${row.network}: validation_passed must equal 1`);
  }
  if (row.network === "iPoker" && counters.trackerMissingRecovered <= 0) {
    throw new Error("iPoker tracker_missing_recovered must be positive");
  }
  networks[row.network] = counters;
  for (const key of Object.keys(totals)) totals[key] += counters[key];
}
assert.deepEqual(Object.keys(networks).sort(), [...NETWORKS].sort(), "Validation result must contain exactly the nine parser networks");

const receipt = succeededReceipt(JSON.parse(receiptBuffer.toString("utf8")), {
  queryBuffer,
  metadataBuffer,
  rendererMetadata: metadata,
  resultBuffer,
  resultRows: rows.length,
});
if (receipt.rowCount !== rows.length) {
  throw new Error(`Receipt row count ${receipt.rowCount} does not match result row count ${rows.length}`);
}
if (receipt.byteSize !== resultBuffer.length) {
  throw new Error(`Receipt byte size ${receipt.byteSize} does not match result bytes ${resultBuffer.length}`);
}

const output = {
  schema: "ff-rfi-missing-card-recovery-validation-v1",
  mode: "validation",
  window: {
    startInclusive: `${WINDOW[0]}T00:00:00Z`,
    endExclusive: `${WINDOW[1]}T00:00:00Z`,
    semantics: "half-open-utc",
  },
  source: {
    structuredTable: metadata.structuredSourceTable,
    rawTable: metadata.rawSourceTable,
    handClassMode: metadata.handClassMode,
    join: EXPECTED_JOIN,
    recoveryPredicate: metadata.recoveryPredicate,
    recoveryIsDisjoint: true,
    validationLookupPredicate: "validation-only overlap includes tracker-known classes",
    parserNetworks: NETWORKS,
    parserGrammarsSha256: metadata.parserGrammarsSha256,
  },
  provenance: {
    queryJobId: receipt.jobId,
    queryExecutionMode: receipt.executionMode,
    receiptSchema: receipt.schema,
    rendererMetadataSha256: sha256(metadataBuffer),
    rendererMetadataBytes: metadataBuffer.length,
    renderedSqlSha256: sha256(queryBuffer),
    renderedSqlBytes: queryBuffer.length,
    queryTemplateSha256: sha256(templateBuffer),
    queryTemplateBytes: templateBuffer.length,
    resultSha256: sha256(resultBuffer),
    resultRowCount: rows.length,
    resultBytes: resultBuffer.length,
    receiptSha256: sha256(receiptBuffer),
    receiptFileBytes: receiptBuffer.length,
    receiptRowCount: receipt.rowCount,
    receiptBytes: receipt.byteSize,
    receiptFinishedAt: receipt.finishedAt,
  },
  membership: {
    sha256: metadata.membershipSha256,
    keysSha256: metadata.membershipKeysSha256,
    selectedKeysSha256: metadata.selectedMembershipKeysSha256,
    sourceRows: metadata.sourceMembershipRows,
    selectedRows: metadata.selectedMembershipRows,
    selectedUniqueUsers: metadata.selectedUniqueUsers,
    cohortCounts: metadata.membershipCohortCounts,
    selectedCohortCounts: metadata.selectedCohortCounts,
    userShard: metadata.userShard,
  },
  networks: Object.fromEntries(NETWORKS.map((network) => [network, networks[network]])),
  totals,
  privacy: {
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  },
};
const outputText = `${JSON.stringify(output, null, 2)}\n`;
assertNoPrivatePayload(outputText);
fs.writeFileSync(options.output, outputText, { mode: 0o600 });
process.stdout.write(`${JSON.stringify({
  output: options.output,
  schema: output.schema,
  queryJobId: receipt.jobId,
  networks: NETWORKS.length,
  validationRows: rows.length,
  resultSha256: output.provenance.resultSha256,
})}\n`);

function validateRendererMetadata(metadata, templateBuffer, queryBuffer) {
  if (metadata.schema !== "ff-rfi-missing-card-recovery-render-v1") {
    throw new Error("Unexpected recovery renderer metadata schema");
  }
  if (metadata.mode !== "validation") throw new Error("Renderer mode must be validation");
  if (metadata.templateSha256 !== sha256(templateBuffer)) throw new Error("Recovery query template SHA-256 mismatch");
  if (metadata.renderedSqlSha256 !== sha256(queryBuffer)) throw new Error("Rendered SQL SHA-256 mismatch");
  if (metadata.structuredSourceTable !== "analytics.int_tracker_hand_joined") throw new Error("Structured recovery source table mismatch");
  if (metadata.rawSourceTable !== "analytics.stg_hh_texts__hh_texts") throw new Error("Raw recovery source table mismatch");
  if (metadata.handClassMode !== "structured-or-validated-raw-when-empty-v1") throw new Error("Recovery hand-class mode mismatch");
  if (metadata.recoveryPredicate !== "latest structured_hand_class = ''" || metadata.recoveryIsDisjoint !== true) {
    throw new Error("Recovery predicate contract mismatch");
  }
  assert.deepEqual(metadata.rawJoin, EXPECTED_JOIN, "Recovery exact-key join contract mismatch");
  assert.deepEqual(metadata.parserNetworks, NETWORKS, "Recovery parser network contract mismatch");
  if (!/^[a-f0-9]{64}$/.test(String(metadata.parserGrammarsSha256 || "")) ||
      metadata.parserGrammarsSha256 !== sha256(stableJson(metadata.parserGrammars))) {
    throw new Error("Recovery parser grammar SHA-256 mismatch");
  }
  if (metadata.actionPositionStackSource !== "latest analytics.int_tracker_hand_joined exact-7 unopened rows") {
    throw new Error("Recovery action/position/stack source mismatch");
  }
  if (metadata.outputContainsRawHandsNicknamesOrIds !== false) {
    throw new Error("Recovery renderer metadata does not preserve the private-data boundary");
  }
  assert.deepEqual(metadata.outputColumns, COLUMNS, "Recovery validation output-column contract mismatch");
  if (metadata.validation?.rendererMode !== "validation" ||
      metadata.validation?.gate !== "class_matches = tracker_known_with_raw and tracker_known_with_raw > 0") {
    throw new Error("Recovery validation gate metadata mismatch");
  }
  assert.deepEqual(metadata.validation.fixedWindow, WINDOW, "Recovery validation window metadata mismatch");
  assert.deepEqual(metadata.window, WINDOW, "Recovery rendered window mismatch");
  if (metadata.windowEndInclusive !== WINDOW[0]) throw new Error("Recovery inclusive window end mismatch");
  assert.deepEqual(metadata.selectedCohorts, ["l3top"], "Recovery validation must select exactly l3top");
  assert.deepEqual(
    Object.keys(metadata.selectedCohortCounts || {}),
    ["l3top"],
    "Recovery validation selected cohort metadata mismatch",
  );
  if (Number(metadata.selectedMembershipRows) !== Number(metadata.selectedCohortCounts.l3top) ||
      Number(metadata.selectedUniqueUsers) <= 0 ||
      Number(metadata.shardMembershipRows) <= 0 ||
      Number(metadata.shardUsers) <= 0) {
    throw new Error("Recovery validation selected membership metadata is invalid");
  }
  for (const [label, value] of [
    ["membershipSha256", metadata.membershipSha256],
    ["membershipKeysSha256", metadata.membershipKeysSha256],
    ["selectedMembershipKeysSha256", metadata.selectedMembershipKeysSha256],
    ["userShard.userIdsSha256", metadata.userShard?.userIdsSha256],
  ]) {
    if (!/^[a-f0-9]{64}$/.test(String(value || ""))) throw new Error(`Recovery ${label} is invalid`);
  }
}

function validateRenderedSql(query) {
  if (query.includes("{{")) throw new Error("Rendered validation SQL contains an unresolved placeholder");
  const executable = stripSqlCommentsAndLiterals(query);
  const sourceTables = new Set(
    [...executable.matchAll(/\b(?:FROM|JOIN)\s+(analytics\.[A-Za-z0-9_]+)/gi)]
      .map((match) => match[1]),
  );
  assert.deepEqual(
    [...sourceTables].sort(),
    ["analytics.int_tracker_hand_joined", "analytics.stg_hh_texts__hh_texts"].sort(),
    "Rendered validation SQL source tables mismatch",
  );
  for (const pattern of [
    /\bINNER\s+JOIN\s+raw_latest\s+AS\s+r\b/i,
    /\btoUInt64\s*\(\s*c\.uid\s*\)\s*=\s*r\.user_id\b/i,
    /\btoString\s*\(\s*c\.network\s*\)\s*=\s*r\.network\b/i,
    /\btoString\s*\(\s*c\.tracker_hh_id\s*\)\s*=\s*r\.hh_id\b/i,
    /1\s*=\s*1\s*\/\*\s*validation-only overlap includes tracker-known classes\s*\*\//i,
    /countIf\s*\(\s*structured_hand_class\s*!=\s*''\s*\)\s+AS\s+tracker_known_with_raw/i,
    /count\s*\(\s*\)\s+AS\s+raw_hh_joined/i,
    /countIf\s*\(\s*validated_raw_hand_class\s*!=\s*''\s*\)\s+AS\s+parser_success/i,
    /structured_hand_class\s*!=\s*''\s+AND\s+validated_raw_hand_class\s*=\s*structured_hand_class/i,
    /structured_hand_class\s*=\s*''\s+AND\s+validated_raw_hand_class\s*!=\s*''/i,
    /p\.class_matches\s*=\s*p\.tracker_known_with_raw/i,
    /\bthrowIf\s*\(/i,
  ]) {
    if (!pattern.test(query)) throw new Error(`Rendered validation SQL is missing contract ${pattern}`);
  }
  for (const network of NETWORKS) {
    if (!query.includes(`'${network}'`)) throw new Error(`Rendered validation SQL is missing parser network ${network}`);
  }
  for (const boundary of WINDOW) {
    if (!query.includes(boundary)) throw new Error(`Rendered validation SQL is missing fixed boundary ${boundary}`);
  }
}

function succeededReceipt(raw, evidence) {
  const receipt = raw.structuredContent || raw.result?.structuredContent || raw;
  if (receipt.schema === "ff-rfi-card-parser-validation-receipt-v1") {
    const querySha256 = sha256(evidence.queryBuffer);
    const metadataSha256 = sha256(evidence.metadataBuffer);
    const resultSha256 = sha256(evidence.resultBuffer);
    if (receipt.queryId !== `sync:${querySha256}`) {
      throw new Error("Synchronous validation receipt query id does not match rendered SQL bytes");
    }
    if (receipt.queryTransport !== "FunFarm ClickHouse MCP inline" ||
        receipt.sourceResponseFormat !== "json") {
      throw new Error("Synchronous validation receipt transport contract mismatch");
    }
    if (receipt.renderedSqlSha256 !== querySha256 ||
        receipt.renderMetadataSha256 !== metadataSha256 ||
        receipt.resultSha256 !== resultSha256) {
      throw new Error("Synchronous validation receipt evidence hash mismatch");
    }
    if (Number(receipt.validationRows) !== evidence.resultRows ||
        Number(receipt.validationPassedRows) !== evidence.resultRows ||
        Number(receipt.classFailures) !== 0) {
      throw new Error("Synchronous validation receipt counters do not prove a strict pass");
    }
    if (!Number.isSafeInteger(Number(receipt.readRows)) || Number(receipt.readRows) <= 0 ||
        !Number.isSafeInteger(Number(receipt.readBytes)) || Number(receipt.readBytes) <= 0 ||
        !Number.isSafeInteger(Number(receipt.durationMs)) || Number(receipt.durationMs) <= 0) {
      throw new Error("Synchronous validation receipt scan counters are invalid");
    }
    if (receipt.cohort !== "l3top" ||
        Number(receipt.cohortSelectedPlayers) !==
          Number(evidence.rendererMetadata.selectedCohortCounts?.l3top)) {
      throw new Error("Synchronous validation receipt cohort identity is invalid");
    }
    assert.deepEqual(receipt.window, WINDOW, "Synchronous validation receipt window mismatch");
    assert.deepEqual(receipt.parserNetworks, NETWORKS, "Synchronous validation receipt parser networks mismatch");
    return {
      schema: receipt.schema,
      executionMode: "sync",
      jobId: receipt.queryId,
      rowCount: evidence.resultRows,
      byteSize: evidence.resultBuffer.length,
      finishedAt: "",
    };
  }
  if (receipt.status !== "succeeded") throw new Error("ClickHouse validation receipt is not succeeded");
  if (!/^mcp_ch_job_[a-f0-9]{32}$/.test(String(receipt.job_id || ""))) {
    throw new Error("ClickHouse validation receipt has an invalid job id");
  }
  const rowCount = Number(receipt.row_count);
  const byteSize = Number(receipt.byte_size);
  if (!Number.isSafeInteger(rowCount) || rowCount <= 0) throw new Error("ClickHouse validation receipt has no positive row count");
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) throw new Error("ClickHouse validation receipt has no positive byte size");
  return {
    schema: null,
    executionMode: "async",
    jobId: receipt.job_id,
    rowCount,
    byteSize,
    finishedAt: String(receipt.finished_at || ""),
  };
}

function parseCsv(text, input) {
  const records = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === "\"" && text[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else if (character === "\"") quoted = false;
      else cell += character;
    } else if (character === "\"") quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      records.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (quoted) throw new Error(`${input}: unterminated quoted CSV field`);
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    records.push(row);
  }
  const header = records.shift() || [];
  assert.deepEqual(header, COLUMNS, `${input}: unexpected validation result columns`);
  return records.filter((values) => values.some(Boolean)).map((values, index) => {
    if (values.length !== COLUMNS.length) throw new Error(`${input}:${index + 2}: malformed validation CSV row`);
    return Object.fromEntries(COLUMNS.map((column, columnIndex) => [column, values[columnIndex]]));
  });
}

function parseOptions(args) {
  return Object.fromEntries(args.map((argument) => {
    const match = argument.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Expected --key=value, got ${argument}`);
    return [match[1], match[2]];
  }));
}

function positiveInteger(value, label, location) {
  const parsed = nonNegativeInteger(value, label, location);
  if (parsed <= 0) throw new Error(`${location}: ${label} must be positive`);
  return parsed;
}

function nonNegativeInteger(value, label, location) {
  if (!/^\d+$/.test(String(value))) throw new Error(`${location}: invalid ${label}`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${location}: unsafe ${label}`);
  return parsed;
}

function finiteNumber(value, label, location) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${location}: invalid ${label}`);
  return parsed;
}

function stripSqlCommentsAndLiterals(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''");
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

function assertNoPrivatePayload(text) {
  for (const pattern of [
    /\bDealt to\b/i,
    /PokerStars Hand #/i,
    /<game\b/i,
    /<player\b/i,
    /"nickname"\s*:/i,
    /"hh_text[^"]*"\s*:/i,
    /"check_user_id"\s*:/i,
    /"converted_hh_id"\s*:/i,
  ]) {
    if (pattern.test(text)) throw new Error(`Validation manifest contains private payload matching ${pattern}`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
