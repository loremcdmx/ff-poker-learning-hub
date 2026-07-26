#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  parseRawRfiHand,
  RAW_RFI_SUPPORTED_NETWORKS,
} from "./raw-hand-history-parser.mjs";

const EXPECTED_COLUMNS = [
  "user_id",
  "network",
  "hh_id",
  "played_at",
  "cnt_players",
  "cnt_players_lookup_position",
  "position",
  "holecards_str",
  "preflop_effective_stack_size_bb",
  "is_preflop_unopened",
  "is_rfi",
  "is_preflop_allin",
  "is_preflop_limp",
  "preflop_action",
  "preflop_raise_and_blind_made_amount_bb",
  "bb_amount",
  "bet_bb_amount",
  "raw_nickname",
  "hh_text_base64",
];
const EXPECTED_POSITIONS = [0, 1, 2, 3, 4, 9];
const EXPECTED_ACTIONS = ["fold", "limp", "raise"];
const EXPECTED_STACKS = ["70+", "30-70", "20-30", "15-20", "10-15", "<10"];
const MAX_CSV_LINE_BYTES = 2 * 1024 * 1024;
const supportedNetworkSet = new Set(RAW_RFI_SUPPORTED_NETWORKS);

main().catch((error) => {
  console.error(`Raw hand-history parser gate failed: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const input = process.argv[2];
  const expectedInputSha256 = optionValue("--sha256");
  const outputPath = optionValue("--output");
  if (!input || !expectedInputSha256) {
    throw new Error(
      "Usage: node validate-raw-hand-history-parser.mjs /private/tmp/structured-plus-raw.csv --sha256=<expected-input-sha256>"
    );
  }
  if (!/^[a-f0-9]{64}$/i.test(expectedInputSha256)) {
    throw new Error("--sha256 must be exactly 64 hexadecimal characters");
  }

  const resolvedInput = resolvePrivateInput(input);
  const inputSha256 = await sha256File(resolvedInput);
  if (inputSha256 !== expectedInputSha256.toLowerCase()) {
    throw new Error(`input SHA-256 mismatch: expected ${expectedInputSha256.toLowerCase()}, got ${inputSha256}`);
  }
  const parserPath = fileURLToPath(new URL("./raw-hand-history-parser.mjs", import.meta.url));
  const parserSha256 = crypto.createHash("sha256").update(fs.readFileSync(parserPath)).digest("hex");

  const stream = readline.createInterface({
    input: fs.createReadStream(resolvedInput),
    crlfDelay: Infinity,
  });
  let header = null;
  let rowNumber = 0;
  const totals = counter();
  const byNetwork = new Map();
  const excludedNetworks = new Map();
  const acceptedMismatches = [];

  for await (const line of stream) {
    rowNumber += 1;
    if (Buffer.byteLength(line, "utf8") > MAX_CSV_LINE_BYTES) {
      throw new Error(`row ${rowNumber}: CSV line exceeds ${MAX_CSV_LINE_BYTES} bytes`);
    }
    if (header === null) {
      header = parseCsvLine(line.replace(/^\uFEFF/, ""), rowNumber);
      assertExactHeader(header);
      continue;
    }
    if (line === "") throw new Error(`row ${rowNumber}: blank CSV row`);
    const values = parseCsvLine(line, rowNumber);
    if (values.length !== header.length) {
      throw new Error(`row ${rowNumber}: expected ${header.length} CSV fields, got ${values.length}`);
    }
    const row = Object.fromEntries(header.map((column, index) => [column, values[index]]));
    validateStructuredRow(row, rowNumber);
    const hhText = decodeCanonicalBase64(row.hh_text_base64, rowNumber);

    if (!supportedNetworkSet.has(row.network)) {
      excludedNetworks.set(row.network, (excludedNetworks.get(row.network) || 0) + 1);
      const rejected = parseRawRfiHand({
        network: row.network,
        hhText,
        heroNickname: row.raw_nickname,
      });
      if (rejected.ok || rejected.reason !== "unsupported-network") {
        throw new Error(`row ${rowNumber}: unsupported network did not fail closed`);
      }
      continue;
    }

    const stats = byNetwork.get(row.network) || counter();
    byNetwork.set(row.network, stats);
    totals.rows += 1;
    stats.rows += 1;

    const parsed = parseRawRfiHand({
      network: row.network,
      hhText,
      heroNickname: row.raw_nickname,
    });
    if (!parsed.ok) {
      addReason(totals, parsed.reason);
      addReason(stats, parsed.reason);
      continue;
    }
    if (Object.hasOwn(parsed, "heroPlayer")) {
      throw new Error(`row ${rowNumber}: parser result exposes a raw player identity`);
    }

    totals.parsed += 1;
    stats.parsed += 1;
    const trackerAction = trackerActionClass(row);
    const rawAction = parsed.action === "shove" ? "raise" : parsed.action;
    const checks = {
      cards: parsed.handClass === row.holecards_str,
      position: parsed.positionCode === Number(row.position),
      stack: Math.abs(parsed.effectiveStackBb - Number(row.preflop_effective_stack_size_bb)) <= 0.011,
      publicStack:
        publicStackBucket(parsed.effectiveStackBb)
        === publicStackBucket(Number(row.preflop_effective_stack_size_bb)),
      action: rawAction === trackerAction,
    };
    for (const [key, matches] of Object.entries(checks)) {
      compare(totals, stats, key, matches);
      if (!matches) acceptedMismatches.push({ row: rowNumber, network: row.network, check: key });
    }
    if (trackerAction === "raise") {
      const shoveMatches = (parsed.action === "shove") === trackerShove(row);
      compare(totals, stats, "shove", shoveMatches);
      if (!shoveMatches) acceptedMismatches.push({ row: rowNumber, network: row.network, check: "shove" });
    }

    addCoverage(totals, parsed.positionCode, rawAction, parsed.effectiveStackBb);
    addCoverage(stats, parsed.positionCode, rawAction, parsed.effectiveStackBb);
  }

  if (header === null) throw new Error("input CSV is empty");
  const gateFailures = coverageFailures(totals, byNetwork, acceptedMismatches);
  const output = {
    schema: "ff-rfi-raw-hh-parser-validation-v1",
    source: {
      file: path.basename(resolvedInput),
      inputSha256,
      parserSha256,
      rawHandHistoriesPublished: false,
    },
    policy: {
      supportedNetworks: RAW_RFI_SUPPORTED_NETWORKS,
      acceptedMismatchTolerance: 0,
      requiredPositions: EXPECTED_POSITIONS,
      requiredActions: EXPECTED_ACTIONS,
      requiredPublicStackBuckets: EXPECTED_STACKS,
    },
    gatePassed: gateFailures.length === 0,
    gateFailures,
    acceptedMismatches: acceptedMismatches.slice(0, 20),
    excludedNetworks: Object.fromEntries([...excludedNetworks.entries()].sort(([left], [right]) => left.localeCompare(right))),
    totals: summarize(totals),
    networks: Object.fromEntries(RAW_RFI_SUPPORTED_NETWORKS.map((network) => [
      network,
      summarize(byNetwork.get(network) || counter()),
    ])),
  };
  const outputText = `${JSON.stringify(output, null, 2)}\n`;
  if (outputPath) {
    const resolvedOutput = path.resolve(outputPath);
    const privateRoot = fs.realpathSync("/private/tmp");
    const relative = path.relative(privateRoot, resolvedOutput);
    if (
      !relative
      || relative.startsWith(`..${path.sep}`)
      || relative === ".."
      || path.isAbsolute(relative)
    ) {
      throw new Error("validation output must stay under /private/tmp");
    }
    fs.writeFileSync(resolvedOutput, outputText, { mode: 0o600 });
    fs.chmodSync(resolvedOutput, 0o600);
  }
  console.log(outputText.trimEnd());
  if (gateFailures.length) process.exitCode = 1;
}

function resolvePrivateInput(input) {
  const privateRoot = fs.realpathSync("/private/tmp");
  const resolved = fs.realpathSync(input);
  const relative = path.relative(privateRoot, resolved);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    throw new Error("validation input must resolve to a regular file under /private/tmp");
  }
  if (!fs.statSync(resolved).isFile()) {
    throw new Error("validation input must resolve to a regular file under /private/tmp");
  }
  return resolved;
}

async function sha256File(file) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function assertExactHeader(header) {
  if (new Set(header).size !== header.length) throw new Error("CSV header contains duplicate columns");
  if (
    header.length !== EXPECTED_COLUMNS.length
    || header.some((column, index) => column !== EXPECTED_COLUMNS[index])
  ) {
    throw new Error(`CSV schema mismatch; expected columns: ${EXPECTED_COLUMNS.join(",")}`);
  }
}

function validateStructuredRow(row, rowNumber) {
  if (Number(row.cnt_players) !== 7) throw new Error(`row ${rowNumber}: cnt_players must equal 7`);
  if (Number(row.is_preflop_unopened) !== 1) throw new Error(`row ${rowNumber}: positive control must be unopened`);
  if (!EXPECTED_POSITIONS.includes(Number(row.position))) throw new Error(`row ${rowNumber}: unsupported position`);
  if (!/^(?:[2-9TJQKA]{2}|[2-9TJQKA]{2}[so])$/.test(row.holecards_str)) {
    throw new Error(`row ${rowNumber}: invalid hand class`);
  }
  for (const column of ["preflop_effective_stack_size_bb", "bb_amount"]) {
    const value = Number(row[column]);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`row ${rowNumber}: ${column} must be positive`);
  }
  for (const column of [
    "is_rfi",
    "is_preflop_allin",
    "is_preflop_limp",
    "preflop_raise_and_blind_made_amount_bb",
    "bet_bb_amount",
  ]) {
    if (!Number.isFinite(Number(row[column]))) throw new Error(`row ${rowNumber}: ${column} must be numeric`);
  }
}

function decodeCanonicalBase64(value, rowNumber) {
  if (
    !value
    || value.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  ) {
    throw new Error(`row ${rowNumber}: invalid canonical base64 hand history`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) {
    throw new Error(`row ${rowNumber}: invalid canonical base64 hand history`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`row ${rowNumber}: hand history is not valid UTF-8`);
  }
}

function trackerActionClass(row) {
  if (String(row.preflop_action || "").startsWith("R")) return "raise";
  if (Number(row.is_preflop_limp) === 1 || String(row.preflop_action || "").startsWith("C")) return "limp";
  if (row.preflop_action === "F") return "fold";
  return "other";
}

function trackerShove(row) {
  const effective = Number(row.preflop_effective_stack_size_bb);
  const blind = Number(row.bb_amount);
  const raiseAndBlind = Number(row.preflop_raise_and_blind_made_amount_bb);
  const postedBlindBb = blind > 0 ? Number(row.bet_bb_amount) / blind : 0;
  return row.preflop_action === "R" && (
    Number(row.is_preflop_allin) === 1
    || raiseAndBlind - postedBlindBb >= effective - 0.01
  );
}

function counter() {
  return {
    rows: 0,
    parsed: 0,
    reasons: {},
    checks: {
      cards: { compared: 0, matched: 0 },
      position: { compared: 0, matched: 0 },
      stack: { compared: 0, matched: 0 },
      publicStack: { compared: 0, matched: 0 },
      action: { compared: 0, matched: 0 },
      shove: { compared: 0, matched: 0 },
    },
    coverage: {
      positions: new Set(),
      actions: new Set(),
      publicStacks: new Set(),
    },
  };
}

function addCoverage(stats, position, action, stackBb) {
  stats.coverage.positions.add(position);
  stats.coverage.actions.add(action);
  stats.coverage.publicStacks.add(publicStackBucket(stackBb));
}

function coverageFailures(totals, byNetwork, acceptedMismatches) {
  const failures = [];
  if (acceptedMismatches.length) failures.push(`accepted parser rows have ${acceptedMismatches.length} structured mismatches`);
  if (!totals.rows || !totals.parsed) failures.push("supported-network overlap coverage is empty");
  for (const network of RAW_RFI_SUPPORTED_NETWORKS) {
    const stats = byNetwork.get(network);
    if (!stats?.rows || !stats.parsed) {
      failures.push(`${network}: no accepted overlap rows`);
      continue;
    }
    for (const [label, expected, actual] of [
      ["positions", EXPECTED_POSITIONS, stats.coverage.positions],
      ["actions", EXPECTED_ACTIONS, stats.coverage.actions],
      ["public stack buckets", EXPECTED_STACKS, stats.coverage.publicStacks],
    ]) {
      const missing = expected.filter((value) => !actual.has(value));
      if (missing.length) failures.push(`${network}: missing ${label}: ${missing.join(",")}`);
    }
    for (const [check, values] of Object.entries(stats.checks)) {
      if (!values.compared) failures.push(`${network}: no ${check} comparisons`);
      else if (values.matched !== values.compared) failures.push(`${network}: ${check} mismatch`);
    }
  }
  return failures;
}

function publicStackBucket(stackBb) {
  if (stackBb >= 70) return "70+";
  if (stackBb >= 30) return "30-70";
  if (stackBb >= 20) return "20-30";
  if (stackBb >= 15) return "15-20";
  if (stackBb >= 10) return "10-15";
  return "<10";
}

function addReason(stats, reason) {
  stats.reasons[reason] = (stats.reasons[reason] || 0) + 1;
}

function compare(totalsTarget, networkTarget, key, matches) {
  for (const target of [totalsTarget, networkTarget]) {
    target.checks[key].compared += 1;
    if (matches) target.checks[key].matched += 1;
  }
}

function summarize(stats) {
  return {
    rows: stats.rows,
    parsed: stats.parsed,
    parsedPct: pct(stats.parsed, stats.rows),
    rejected: stats.rows - stats.parsed,
    reasons: stats.reasons,
    coverage: {
      positions: [...stats.coverage.positions].sort((left, right) => left - right),
      actions: [...stats.coverage.actions].sort(),
      publicStacks: [...stats.coverage.publicStacks].sort(
        (left, right) => EXPECTED_STACKS.indexOf(left) - EXPECTED_STACKS.indexOf(right)
      ),
    },
    checks: Object.fromEntries(Object.entries(stats.checks).map(([key, value]) => [
      key,
      {
        ...value,
        pct: pct(value.matched, value.compared),
      },
    ])),
  };
}

function pct(value, total) {
  return total ? Number((value / total * 100).toFixed(4)) : 0;
}

function optionValue(name) {
  const prefix = `${name}=`;
  return process.argv.slice(3).find((argument) => argument.startsWith(prefix))?.slice(prefix.length) || "";
}

function parseCsvLine(line, rowNumber) {
  const values = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === "\"" && line[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
        closedQuote = true;
      } else {
        cell += char;
      }
    } else if (char === "\"") {
      if (cell || closedQuote) throw new Error(`row ${rowNumber}: malformed CSV quote`);
      quoted = true;
    } else if (char === ",") {
      values.push(cell);
      cell = "";
      closedQuote = false;
    } else {
      if (closedQuote) throw new Error(`row ${rowNumber}: characters after closing CSV quote`);
      cell += char;
    }
  }
  if (quoted) throw new Error(`row ${rowNumber}: unclosed CSV quote`);
  values.push(cell);
  return values;
}
