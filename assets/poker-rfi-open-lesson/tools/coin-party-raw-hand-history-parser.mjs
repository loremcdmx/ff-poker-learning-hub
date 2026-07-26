import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseRawRfiHand,
} from "./raw-hand-history-parser.mjs";
import {
  COIN_PARTY_PUBLICATION_CONTRACT,
  COIN_PARTY_PUBLICATION_NETWORKS,
  coinPartyGrammarContract,
} from "./coin-party-publication-contract.mjs";

const SUPPORTED = new Set(COIN_PARTY_PUBLICATION_NETWORKS);
const VALIDATION_COLUMNS = Object.freeze([
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
]);
const EXPECTED_POSITIONS = Object.freeze([0, 1, 2, 3, 4, 9]);
const EXPECTED_ACTIONS = Object.freeze(["fold", "limp", "raise"]);
const EXPECTED_PUBLIC_STACKS = Object.freeze([
  "70+",
  "30-70",
  "20-30",
  "15-20",
  "10-15",
  "<10",
]);

export function normalizeCoinPartyHandHistory({ network = "", hhText = "" } = {}) {
  if (!SUPPORTED.has(network)) return hhText;
  return String(hhText)
    .replace(
      /^(Seat\s+\d+:\s+.+?\(\s*)€\s*(?=\d)/gim,
      "$1",
    )
    .replace(
      /^(.+?\s+posts(?:\s+the)?\s+(?:ante|small blind|big blind)\s*)€\s*(?=\d)/gim,
      "$1",
    )
    .replace(
      /^(.+?\s+posts(?:\s+the)?\s+(?:ante|small blind|big blind)\s*)\(\s*(?:€\s*)?(\d[0-9,.]*)\s*\)/gim,
      "$1$2",
    );
}

export function parseCoinPartyRfiHand({
  network = "",
  hhText = "",
  heroNickname = "",
} = {}) {
  if (!SUPPORTED.has(network)) {
    return {
      ok: false,
      reason: "unsupported-network",
      network,
    };
  }
  const parsed = parseRawRfiHand({
    network: "PokerStars",
    hhText: normalizeCoinPartyHandHistory({ network, hhText }),
    heroNickname,
  });
  return {
    ...parsed,
    network,
  };
}

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  try {
    validatePrivateOverlapCli();
  } catch (error) {
    console.error(`Coin/Party parser validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

function validatePrivateOverlapCli() {
  const options = parseOptions(process.argv.slice(2));
  for (const required of ["input", "membership", "output"]) {
    if (!options[required]) throw new Error(`missing --${required}`);
  }
  const inputPath = privateInput(options.input, "validation input");
  const membershipPath = privateInput(options.membership, "membership");
  const outputPath = privateOutput(options.output, "validation report");
  const inputBuffer = fs.readFileSync(inputPath);
  const membershipBuffer = fs.readFileSync(membershipPath);
  const parserImplementationBuffer = fs.readFileSync(fileURLToPath(import.meta.url));
  const parserTemplateBuffer = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "q_ff_rfi_raw_hh_field_actions.sql"),
  );
  const expected = COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation;
  const membershipSha256 = sha256(membershipBuffer);
  const parserTemplateSha256 = sha256(parserTemplateBuffer);
  const parserImplementationSha256 = sha256(parserImplementationBuffer);
  const grammarSha256 = coinPartyGrammarContract().sha256;
  assert.equal(sha256(inputBuffer), expected.source.inputSha256, "validation input bytes drift");
  assert.equal(inputBuffer.length, expected.source.inputBytes, "validation input size drift");
  assert.equal(
    membershipSha256,
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.membershipSha256,
    "membership bytes drift",
  );
  assert.equal(
    parserTemplateSha256,
    expected.binding.parserTemplateSha256,
    "canonical parser SQL template drift",
  );
  assert.equal(
    parserImplementationSha256,
    expected.binding.parserImplementationSha256,
    "Coin/Party parser implementation drift",
  );
  assert.equal(grammarSha256, expected.binding.grammarSha256, "parser grammar contract drift");

  const membership = parseCsv(membershipBuffer.toString("utf8"), "membership");
  const cohortRows = membership.rows.filter(
    (row) => row.cohort === COIN_PARTY_PUBLICATION_CONTRACT.cohort,
  );
  const cohortIds = cohortRows
    .map((row) => positiveInteger(row.user_id, "membership user_id"))
    .sort((left, right) => left - right);
  assert.equal(
    cohortIds.length,
    COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers,
    "frozen l3top membership size drift",
  );
  assert.equal(new Set(cohortIds).size, cohortIds.length, "duplicate l3top membership");
  const userIdsSha256 = sha256(cohortIds.join(","));
  assert.equal(
    userIdsSha256,
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
    "frozen l3top user-id hash drift",
  );

  const parsedInput = parseCsv(inputBuffer.toString("utf8"), "validation input");
  assert.deepEqual(parsedInput.header, VALIDATION_COLUMNS, "validation input schema drift");
  assert.equal(parsedInput.rows.length, expected.source.rows, "validation input row-count drift");
  const allowedUsers = new Set(cohortIds);
  const inputUsers = new Set();
  const networkStats = new Map(
    COIN_PARTY_PUBLICATION_NETWORKS.map((network) => [network, validationCounter()]),
  );
  let firstObservedAt = "";
  let lastObservedAt = "";
  for (const [offset, row] of parsedInput.rows.entries()) {
    const rowNumber = offset + 2;
    validateStructuredRow(row, rowNumber);
    const userId = positiveInteger(row.user_id, `row ${rowNumber} user_id`);
    assert(allowedUsers.has(userId), `row ${rowNumber}: user is outside frozen l3top`);
    inputUsers.add(userId);
    const playedAt = canonicalTimestamp(row.played_at, rowNumber);
    assertInsideFrozenWindow(playedAt, rowNumber);
    firstObservedAt = minText(firstObservedAt, playedAt);
    lastObservedAt = maxText(lastObservedAt, playedAt);
    const stats = networkStats.get(row.network);
    assert(stats, `row ${rowNumber}: unsupported network ${row.network}`);
    stats.rows += 1;
    const parsed = parseCoinPartyRfiHand({
      network: row.network,
      hhText: decodeCanonicalBase64(row.hh_text_base64, rowNumber),
      heroNickname: row.raw_nickname,
    });
    if (!parsed.ok) {
      addReason(stats, parsed.reason);
      continue;
    }
    assert.equal(Object.hasOwn(parsed, "heroPlayer"), false, `row ${rowNumber}: raw identity leaked`);
    stats.parsed += 1;
    const action = trackerActionClass(row);
    const parsedAction = parsed.action === "shove" ? "raise" : parsed.action;
    compare(stats, "cards", parsed.handClass === row.holecards_str);
    compare(stats, "position", parsed.positionCode === Number(row.position));
    compare(
      stats,
      "stack",
      Math.abs(parsed.effectiveStackBb - Number(row.preflop_effective_stack_size_bb)) <= 0.011,
    );
    compare(
      stats,
      "publicStack",
      publicStackBucket(parsed.effectiveStackBb)
        === publicStackBucket(Number(row.preflop_effective_stack_size_bb)),
    );
    compare(stats, "action", parsedAction === action);
    if (action === "raise") {
      compare(stats, "shove", (parsed.action === "shove") === trackerShove(row));
    }
    stats.coverage.positions.add(parsed.positionCode);
    stats.coverage.actions.add(parsedAction);
    stats.coverage.publicStacks.add(publicStackBucket(parsed.effectiveStackBb));
  }
  assert.equal(inputUsers.size, expected.source.uniqueUsers, "validation input user coverage drift");
  assert.equal(firstObservedAt, expected.source.firstObservedAt, "validation first timestamp drift");
  assert.equal(lastObservedAt, expected.source.lastObservedAt, "validation last timestamp drift");

  const report = {
    schema: expected.binding.reportSchema,
    status: "passed",
    validatedAt: new Date().toISOString(),
    binding: {
      parserTemplateSha256,
      parserImplementationSha256,
      grammarSha256,
      membershipSha256,
      userIdsSha256,
      window: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window,
    },
    source: {
      inputSha256: sha256(inputBuffer),
      inputBytes: inputBuffer.length,
      rows: parsedInput.rows.length,
      uniqueUsers: inputUsers.size,
      firstObservedAt,
      lastObservedAt,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
    networks: Object.fromEntries(
      COIN_PARTY_PUBLICATION_NETWORKS.map((network) => [
        network,
        summarizeValidation(networkStats.get(network)),
      ]),
    ),
  };
  validateGeneratedReport(report);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(outputPath, 0o600);
  process.stdout.write(`${JSON.stringify({
    schema: report.schema,
    status: report.status,
    rows: report.source.rows,
    reportSha256: sha256(fs.readFileSync(outputPath)),
  })}\n`);
}

function validateGeneratedReport(report) {
  const expected = COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation;
  assert.deepEqual(
    report.source,
    {
      ...expected.source,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
    "parser validation source proof drift",
  );
  const coin = report.networks.CoinPoker;
  const party = report.networks.PartyPoker;
  assert.equal(coin.rows, expected.CoinPoker.sample, "CoinPoker sample drift");
  assert.equal(coin.parsed, expected.CoinPoker.accepted, "CoinPoker acceptance drift");
  assert.equal(coin.rejected, 0, "CoinPoker rejection drift");
  assert.deepEqual(coin.reasons, {}, "CoinPoker rejection reason drift");
  assert.equal(
    party.rows,
    expected.PartyPoker.exact7Sample + expected.PartyPoker.raw8Sample,
    "PartyPoker sample drift",
  );
  assert.equal(party.parsed, expected.PartyPoker.acceptedExact7, "PartyPoker acceptance drift");
  assert.equal(party.rejected, expected.PartyPoker.rejectedRaw8, "PartyPoker rejection drift");
  assert.deepEqual(
    party.reasons,
    { "not-exact-7": expected.PartyPoker.rejectedRaw8 },
    "PartyPoker rejection reason drift",
  );
  for (const [network, stats] of Object.entries(report.networks)) {
    assert.deepEqual(stats.coverage.positions, EXPECTED_POSITIONS, `${network}: position coverage drift`);
    assert.deepEqual(stats.coverage.actions, EXPECTED_ACTIONS, `${network}: action coverage drift`);
    assert.deepEqual(
      stats.coverage.publicStacks,
      EXPECTED_PUBLIC_STACKS,
      `${network}: public-stack coverage drift`,
    );
    for (const [name, check] of Object.entries(stats.checks)) {
      assert(check.compared > 0, `${network}: missing ${name} comparisons`);
      assert.equal(check.matched, check.compared, `${network}: ${name} mismatch`);
      assert.equal(check.pct, 100, `${network}: ${name} match percentage drift`);
    }
  }
}

function validateStructuredRow(row, rowNumber) {
  assert.equal(Number(row.cnt_players), 7, `row ${rowNumber}: structured player count drift`);
  assert.equal(Number(row.is_preflop_unopened), 1, `row ${rowNumber}: non-unopened control`);
  assert(EXPECTED_POSITIONS.includes(Number(row.position)), `row ${rowNumber}: unsupported position`);
  assert.match(row.holecards_str, /^(?:[2-9TJQKA]{2}|[2-9TJQKA]{2}[so])$/, `row ${rowNumber}: hand class`);
  for (const field of ["preflop_effective_stack_size_bb", "bb_amount"]) {
    assert(Number.isFinite(Number(row[field])) && Number(row[field]) > 0, `row ${rowNumber}: ${field}`);
  }
  for (const field of [
    "is_rfi",
    "is_preflop_allin",
    "is_preflop_limp",
    "preflop_raise_and_blind_made_amount_bb",
    "bet_bb_amount",
  ]) assert(Number.isFinite(Number(row[field])), `row ${rowNumber}: ${field}`);
  assert(row.hh_id, `row ${rowNumber}: missing hand id`);
  assert(row.raw_nickname, `row ${rowNumber}: missing private hero identity`);
}

function validationCounter() {
  return {
    rows: 0,
    parsed: 0,
    reasons: {},
    checks: Object.fromEntries(
      ["cards", "position", "stack", "publicStack", "action", "shove"]
        .map((name) => [name, { compared: 0, matched: 0 }]),
    ),
    coverage: {
      positions: new Set(),
      actions: new Set(),
      publicStacks: new Set(),
    },
  };
}

function summarizeValidation(stats) {
  return {
    rows: stats.rows,
    parsed: stats.parsed,
    parsedPct: percentage(stats.parsed, stats.rows),
    rejected: stats.rows - stats.parsed,
    reasons: stats.reasons,
    coverage: {
      positions: [...stats.coverage.positions].sort((left, right) => left - right),
      actions: [...stats.coverage.actions].sort(
        (left, right) => EXPECTED_ACTIONS.indexOf(left) - EXPECTED_ACTIONS.indexOf(right),
      ),
      publicStacks: [...stats.coverage.publicStacks].sort(
        (left, right) => EXPECTED_PUBLIC_STACKS.indexOf(left)
          - EXPECTED_PUBLIC_STACKS.indexOf(right),
      ),
    },
    checks: Object.fromEntries(Object.entries(stats.checks).map(([name, check]) => [
      name,
      {
        ...check,
        pct: percentage(check.matched, check.compared),
      },
    ])),
  };
}

function compare(stats, name, matches) {
  stats.checks[name].compared += 1;
  if (matches) stats.checks[name].matched += 1;
}

function addReason(stats, reason) {
  stats.reasons[reason] = (stats.reasons[reason] || 0) + 1;
}

function trackerActionClass(row) {
  if (String(row.preflop_action || "").startsWith("R")) return "raise";
  if (
    Number(row.is_preflop_limp) === 1
    || String(row.preflop_action || "").startsWith("C")
  ) return "limp";
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

function publicStackBucket(stackBb) {
  if (stackBb >= 70) return "70+";
  if (stackBb >= 30) return "30-70";
  if (stackBb >= 20) return "20-30";
  if (stackBb >= 15) return "15-20";
  if (stackBb >= 10) return "10-15";
  return "<10";
}

function decodeCanonicalBase64(value, rowNumber) {
  assert(
    value
      && value.length % 4 === 0
      && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value),
    `row ${rowNumber}: invalid base64 hand history`,
  );
  const bytes = Buffer.from(value, "base64");
  assert.equal(bytes.toString("base64"), value, `row ${rowNumber}: non-canonical base64`);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function canonicalTimestamp(value, rowNumber) {
  assert.match(
    String(value || ""),
    /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/,
    `row ${rowNumber}: invalid played_at`,
  );
  const canonical = `${value.replace(" ", "T")}Z`;
  assert(Number.isFinite(Date.parse(canonical)), `row ${rowNumber}: invalid played_at`);
  return canonical;
}

function assertInsideFrozenWindow(value, rowNumber) {
  const [start, end] = COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window;
  const timestamp = Date.parse(value);
  assert(
    timestamp >= Date.parse(`${start}T00:00:00Z`)
      && timestamp < Date.parse(`${end}T00:00:00Z`),
    `row ${rowNumber}: played_at is outside the frozen half-open window`,
  );
}

function parseCsv(text, label) {
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
    } else if (char === '"') {
      assert.equal(cell, "", `${label}: malformed opening quote`);
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      parsed.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  assert.equal(quoted, false, `${label}: unclosed quote`);
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    parsed.push(row);
  }
  const header = parsed.shift() || [];
  assert(header.length > 0, `${label}: empty CSV`);
  assert.equal(new Set(header).size, header.length, `${label}: duplicate columns`);
  const rows = parsed.filter((values) => values.some(Boolean)).map((values, index) => {
    assert.equal(values.length, header.length, `${label}: row ${index + 2} column drift`);
    return Object.fromEntries(header.map((column, columnIndex) => [column, values[columnIndex]]));
  });
  return { header, rows };
}

function parseOptions(args) {
  return Object.fromEntries(args.map((argument) => {
    const match = argument.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`expected --key=value, got ${argument}`);
    return [match[1], match[2]];
  }));
}

function privateInput(value, label) {
  const resolved = path.resolve(String(value || ""));
  assert(resolved.startsWith("/private/tmp/"), `${label} must stay under /private/tmp`);
  const real = fs.realpathSync(resolved);
  assert(real.startsWith("/private/tmp/"), `${label} resolves outside /private/tmp`);
  assert(fs.statSync(real).isFile(), `${label} must be a regular file`);
  return real;
}

function privateOutput(value, label) {
  const resolved = path.resolve(String(value || ""));
  assert(resolved.startsWith("/private/tmp/"), `${label} must stay under /private/tmp`);
  const parent = fs.realpathSync(path.dirname(resolved));
  assert(parent.startsWith("/private/tmp"), `${label} parent resolves outside /private/tmp`);
  return resolved;
}

function positiveInteger(value, label) {
  const result = Number(value);
  assert(Number.isSafeInteger(result) && result > 0, `${label} must be a positive integer`);
  return result;
}

function percentage(value, total) {
  return total ? Number((value / total * 100).toFixed(4)) : 0;
}

function minText(left, right) {
  return !left || right < left ? right : left;
}

function maxText(left, right) {
  return !left || right > left ? right : left;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
