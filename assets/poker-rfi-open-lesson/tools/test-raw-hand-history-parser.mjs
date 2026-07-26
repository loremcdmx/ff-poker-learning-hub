#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  normalizeHandClass,
  parseRawRfiHand,
  RAW_RFI_SUPPORTED_NETWORKS,
} from "./raw-hand-history-parser.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const validator = path.join(here, "validate-raw-hand-history-parser.mjs");
const renderer = path.join(here, "render-raw-hh-field-action-query.mjs");
const rawQuery = fs.readFileSync(path.join(here, "q_ff_rfi_raw_hh_field_actions.sql"), "utf8");
const privateTemporary = fs.mkdtempSync("/private/tmp/ff-rfi-raw-parser-test-");
const outsideTemporary = fs.mkdtempSync(path.join(os.tmpdir(), "ff-rfi-raw-parser-outside-"));
const positionCode = { BTN: 0, CO: 1, HJ: 2, MP: 3, EP: 4, SB: 9 };
const actionOrder = ["EP", "MP", "HJ", "CO", "BTN", "SB", "BB"];
const seatOrder = ["BTN", "SB", "BB", "EP", "MP", "HJ", "CO"];
const seatNumbers = [1, 3, 5, 7, 9, 11, 13];
const columns = [
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

try {
  assert.match(
    rawQuery,
    /argMax\(\s*tuple\(hh_at, ifNull\(nickname, ''\), hh_text\),\s*tuple\(created_at, hh_at, ifNull\(nickname, ''\), hh_text\)\s*\) AS x/,
    "raw-HH latest-row selection must break equal-created_at ties deterministically",
  );
  for (const network of [
    "888Poker",
    "Chico",
    "GGNetwork",
    "PokerPlanets",
    "PokerStars",
    "PokerStars(FR-ES-PT)",
    "Winamax.fr",
    "WPN",
    "iPoker",
  ]) {
    assert.match(rawQuery, new RegExp(`'${network.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
  }
  assert.doesNotMatch(rawQuery, /'CoinPoker'|'PartyPoker'|'UpPoker'/);
  assert.match(rawQuery, /Dealing down cards/);
  assert.match(rawQuery, /network = 'iPoker'/);
  assert.match(rawQuery, /round_zero_payloads/);
  assert.match(rawQuery, /round_one_payloads/);
  assert.match(rawQuery, /hero_action_amount \+ hero_posted_blind/);
  assert.match(rawQuery, /actor = arrayElement\(\s*seat_names/);
  assert.match(rawQuery, /arrayDistinct\(arrayFilter\([\s\S]*dealt_lines/);
  assert.match(rawQuery, /length\(hero_dealt_lines\) = 1/);
  assert.match(rawQuery, /resolved_indexes AS/);
  assert.match(rawQuery, /ip_resolved_indexes AS/);
  assert.match(rawQuery, /small_blind_count = 1 AND small_blind_seat_index > 0/);
  assert.match(rawQuery, /button_count = 0 AND small_blind_count = 1/);
  assert.match(rawQuery, /dead_small_blind_unopened/);
  assert.match(rawQuery, /length\(arrayDistinct\(prior_action_names\)\) = length\(prior_action_names\)/);
  assert.match(rawQuery, /greatest\(\s*big_blind_decision_stack/);
  assert.match(rawQuery, /network = '888Poker'[\s\S]*length\(hero_action_amounts\) = 1/);
  assert.equal(
    (
      rawQuery.match(
        /positionCaseInsensitive\(hero_action_suffix, ' to '\) = 0/g,
      ) || []
    ).length,
    2,
    "both 888 commitment branches must inspect only the action suffix for total-to syntax",
  );
  assert.doesNotMatch(
    rawQuery,
    /positionCaseInsensitive\(hero_action_line, ' to '\) = 0/,
    "a `to` token in the actor nickname must not change 888 commitment semantics",
  );
  assert.match(
    rawQuery,
    /AS hero_action_suffix,[\s\S]*extractAll\(hero_action_suffix, '\[0-9\]\[0-9,.\]\*'\)/,
    "SQL amount tokens must exclude digits in the player nickname",
  );
  assert.match(rawQuery, /hero_action_amount AS hero_commitment_amount/);
  assert.equal(
    (
      rawQuery.match(
        /hero_commitment_amount \/ big_blind BETWEEN 2\.5 AND 3\.5/g,
      ) || []
    ).length,
    2,
    "both 2.5–3.5 BB audit counters must use total hero commitment",
  );
  assert.equal(
    (
      rawQuery.match(
        /stackbb > hero_commitment_amount \/ big_blind \+ 0\.01/g,
      ) || []
    ).length,
    2,
    "both 2.5–3.5 BB audit counters must measure chips behind after total commitment",
  );
  assert.equal(rawQuery.includes("'(?is)<player\\\\b[^>]*>'"), true);
  assert.equal(rawQuery.includes("'(?is)<player\\\\b[^>]*\\\\/>'"), false);
  assert.deepEqual(RAW_RFI_SUPPORTED_NETWORKS, [
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
  assert.equal(normalizeHandClass(["Kd", "As"]), "AKo");
  assert.equal(normalizeHandClass(["10h", "9h"]), "T9s");
  assert.equal(normalizeHandClass(["2c", "2d"]), "22");
  assert.equal(normalizeHandClass(["As", "As"]), "");

  for (const [hero, expected] of Object.entries(positionCode)) {
    const parsed = parseFixture({ hero, action: "fold" });
    assert.equal(parsed.ok, true, `${hero}: ${parsed.reason || "failed"}`);
    assert.equal(parsed.positionCode, expected, hero);
    assert.equal(Object.hasOwn(parsed, "heroPlayer"), false, `${hero}: leaked player identity`);
  }

  assert.equal(parseFixture({ hero: "EP", action: "fold" }).action, "fold");
  assert.equal(parseFixture({ hero: "EP", action: "limp" }).action, "limp");
  assert.equal(parseFixture({ hero: "EP", action: "raise" }).action, "raise");
  assert.equal(parseFixture({ hero: "EP", action: "explicitShove", stackBb: 10 }).action, "shove");
  assert.equal(parseFixture({ hero: "EP", action: "amountShove", stackBb: 10 }).action, "shove");
  assert.equal(parseFixture({
    network: "888Poker",
    hero: "SB",
    action: "amountShove",
    stackBb: 10,
  }).action, "shove");
  const exactPostedBlindShove = parseFixture({
    network: "888Poker",
    hero: "SB",
    action: "postedBlindShove",
    stackBb: 3.747,
    cards: "9s 7h",
  });
  assert.equal(exactPostedBlindShove.ok, true);
  assert.equal(exactPostedBlindShove.handClass, "97o");
  assert.equal(exactPostedBlindShove.effectiveStackBb, 3.747);
  assert.equal(exactPostedBlindShove.actionAmount, 324.7);
  assert.equal(exactPostedBlindShove.actionCommitment, 374.7);
  assert.equal(
    exactPostedBlindShove.action,
    "shove",
    "3.247 BB action plus the posted 0.5 BB SB is a real 3.747 BB all-in",
  );
  const numericNickname888Shove = parseFixture({
    network: "888Poker",
    hero: "Player2486",
    heroPosition: "SB",
    action: "postedBlindShove",
    stackBb: 3.747,
    cards: "9s 7h",
  });
  assert.equal(numericNickname888Shove.ok, true);
  assert.equal(numericNickname888Shove.actionAmount, 324.7);
  assert.equal(numericNickname888Shove.actionCommitment, 374.7);
  assert.equal(
    numericNickname888Shove.action,
    "shove",
    "digits in an 888 nickname must not change single-amount semantics",
  );
  const totalToNickname888Shove = parseFixture({
    network: "888Poker",
    hero: "From to Hero",
    heroPosition: "SB",
    action: "postedBlindShove",
    stackBb: 3.747,
    cards: "9s 7h",
  });
  assert.equal(totalToNickname888Shove.ok, true);
  assert.equal(totalToNickname888Shove.actionAmount, 324.7);
  assert.equal(totalToNickname888Shove.actionCommitment, 374.7);
  assert.equal(
    totalToNickname888Shove.action,
    "shove",
    "a `to` token in an 888 nickname must not disable single-amount semantics",
  );
  const ggTotalToRaise = parseFixture({
    network: "GGNetwork",
    hero: "SB",
    action: "totalToFalseShove",
    stackBb: 3.9914285714,
  });
  assert.equal(ggTotalToRaise.ok, true);
  assert.equal(ggTotalToRaise.actionAmount, 350);
  assert.equal(ggTotalToRaise.actionCommitment, 350);
  assert.equal(
    ggTotalToRaise.action,
    "raise",
    "GG `raises X to Y` already reports total-to and must not add the posted SB",
  );
  assert.equal(parseFixture({
    network: "iPoker",
    hero: "HJ",
    action: "explicitShove",
    stackBb: 8,
  }).action, "shove");

  const priorAction = buildTextHand({ hero: "MP", action: "raise" })
    .replace("EP: folds", "EP: calls 100");
  assert.equal(parseRawRfiHand({
    network: "PokerStars",
    hhText: priorAction,
    heroNickname: "MP",
  }).reason, "not-unopened");

  const wrongPriorActor = buildTextHand({ hero: "MP", action: "raise" })
    .replace("EP: folds", "BTN: folds");
  assert.equal(parseRawRfiHand({
    network: "PokerStars",
    hhText: wrongPriorActor,
    heroNickname: "MP",
  }).reason, "not-unopened");

  const missingFold = buildTextHand({ hero: "SB", action: "raise" })
    .replace("EP: folds\n", "");
  assert.equal(parseRawRfiHand({
    network: "PokerStars",
    hhText: missingFold,
    heroNickname: "SB",
  }).reason, "not-unopened");

  const truncated = buildTextHand({ hero: "CO", action: "raise" })
    .replace("CO: raises 200 to 300", "");
  assert.equal(parseRawRfiHand({
    network: "PokerStars",
    hhText: truncated,
    heroNickname: "CO",
  }).reason, "hero-action-not-found");

  const ambiguous = buildTextHand({ hero: "EP", action: "raise" })
    .replace("Dealt to EP [As Kd]", "Dealt to EP [As Kd]\nDealt to EP [Qh Qd]");
  assert.equal(parseRawRfiHand({
    network: "PokerStars",
    hhText: ambiguous,
    heroNickname: "EP",
  }).reason, "ambiguous-hero-cards");

  const duplicatePhysicalCard = buildTextHand({ hero: "EP", action: "raise", cards: "As As" });
  assert.equal(parseRawRfiHand({
    network: "PokerStars",
    hhText: duplicatePhysicalCard,
    heroNickname: "EP",
  }).reason, "invalid-hero-cards");

  assert.equal(parseRawRfiHand({
    network: "UpPoker",
    hhText: buildTextHand({ hero: "EP", action: "raise" }),
    heroNickname: "EP",
  }).reason, "unsupported-network");

  const duplicateIdentical = buildTextHand({ hero: "EP", action: "raise" })
    .replace("Dealt to EP [As Kd]", "Dealt to EP [As Kd]\nDealt to EP [As Kd]");
  assert.equal(parseRawRfiHand({
    network: "PokerStars",
    hhText: duplicateIdentical,
    heroNickname: "EP",
  }).ok, true);

  const ambiguousIpokerButton = buildIpokerHand({ hero: "EP", action: "raise" })
    .replace('seat="3" name="SB" chips="2010" dealer="0"', 'seat="3" name="SB" chips="2010" dealer="1"');
  assert.equal(parseRawRfiHand({
    network: "iPoker",
    hhText: ambiguousIpokerButton,
    heroNickname: "EP",
  }).reason, "button-seat-not-found");

  const emptyPhysicalButton = buildTextHand({ hero: "CO", action: "raise" })
    .replace("Seat #1 is the button", "Seat #2 is the button");
  const inferredTextButton = parseRawRfiHand({
    network: "PokerStars",
    hhText: emptyPhysicalButton,
    heroNickname: "CO",
  });
  assert.equal(inferredTextButton.ok, true, inferredTextButton.reason);
  assert.equal(inferredTextButton.positionCode, 1);
  assert.equal(inferredTextButton.usedButtonFallback, true);

  const ambiguousTextSmallBlind = emptyPhysicalButton
    .replace("SB: posts small blind 50", "SB: posts small blind 50\nBTN: posts small blind 50");
  assert.equal(parseRawRfiHand({
    network: "PokerStars",
    hhText: ambiguousTextSmallBlind,
    heroNickname: "CO",
  }).reason, "button-seat-not-found");

  const ambiguousEighthSeat = buildTextHand({ hero: "BTN", action: "raise" })
    .replace(
      "Seat 13: CO (2000 in chips)",
      "Seat 13: CO (2000 in chips)\nSeat 15: INACTIVE (2000 in chips)"
    );
  assert.equal(parseRawRfiHand({
    network: "Winamax.fr",
    hhText: ambiguousEighthSeat,
    heroNickname: "BTN",
  }).reason, "not-exact-7");

  const deadSmallBlind = buildTextHand({ hero: "EP", action: "raise" })
    .replace("SB: posts small blind 50\n", "")
    .replace(
      "Dealt to EP [As Kd]\nEP: raises 200 to 300",
      "Dealt to EP [As Kd]\nBTN: folds\nEP: raises 200 to 300\nBB: folds"
    );
  const parsedDeadSmallBlind = parseRawRfiHand({
    network: "PokerStars",
    hhText: deadSmallBlind,
    heroNickname: "EP",
  });
  assert.equal(parsedDeadSmallBlind.ok, true, parsedDeadSmallBlind.reason);
  assert.equal(parsedDeadSmallBlind.positionCode, 4);
  assert.equal(parsedDeadSmallBlind.effectiveStackBb, 20);
  assert.equal(parsedDeadSmallBlind.usedDeadBlindFallback, true);

  const duplicateDeadBlindActor = deadSmallBlind.replace(
    "BTN: folds\nEP: raises",
    "BTN: folds\nBTN: folds\nEP: raises"
  );
  assert.equal(parseRawRfiHand({
    network: "PokerStars",
    hhText: duplicateDeadBlindActor,
    heroNickname: "EP",
  }).reason, "not-unopened");

  const inferredIpokerButton = buildIpokerHand({ hero: "HJ", action: "raise" })
    .replace('dealer="1"', 'dealer="0"');
  const parsedInferredIpokerButton = parseRawRfiHand({
    network: "iPoker",
    hhText: inferredIpokerButton,
    heroNickname: "HJ",
  });
  assert.equal(parsedInferredIpokerButton.ok, true, parsedInferredIpokerButton.reason);
  assert.equal(parsedInferredIpokerButton.positionCode, 2);
  assert.equal(parsedInferredIpokerButton.usedButtonFallback, true);

  const nonSelfClosingIpokerPlayer = buildIpokerHand({ hero: "MP", action: "raise" })
    .replace(
      '<player seat="13" name="CO" chips="2010" dealer="0"/>',
      '<player seat="13" name="CO" chips="2010" dealer="0">'
    );
  assert.equal(parseRawRfiHand({
    network: "iPoker",
    hhText: nonSelfClosingIpokerPlayer,
    heroNickname: "MP",
  }).ok, true);

  const deadIpokerSmallBlind = buildIpokerHand({ hero: "EP", action: "raise" })
    .replace('<action no="8" player="SB" type="1" sum="50"/>\n', "")
    .replace(
      '<round no="1">\n<action no="1" player="EP" type="23" sum="300"/>',
      '<round no="1">\n<action no="0" player="BTN" type="0" sum="0"/>\n'
        + '<action no="1" player="EP" type="23" sum="300"/>\n'
        + '<action no="2" player="BB" type="0" sum="0"/>'
    );
  const parsedDeadIpokerSmallBlind = parseRawRfiHand({
    network: "iPoker",
    hhText: deadIpokerSmallBlind,
    heroNickname: "EP",
  });
  assert.equal(parsedDeadIpokerSmallBlind.ok, true, parsedDeadIpokerSmallBlind.reason);
  assert.equal(parsedDeadIpokerSmallBlind.positionCode, 4);
  assert.equal(parsedDeadIpokerSmallBlind.effectiveStackBb, 20);
  assert.equal(parsedDeadIpokerSmallBlind.usedDeadBlindFallback, true);

  const ggLiteralHero = buildTextHand({ hero: "Hero", heroPosition: "EP", action: "raise" });
  const ggParsed = parseRawRfiHand({
    network: "GGNetwork",
    hhText: ggLiteralHero,
    heroNickname: "different-tracker-alias",
  });
  assert.equal(ggParsed.ok, true, ggParsed.reason);
  assert.equal(ggParsed.positionCode, 4);

  const validRows = validationRows();
  const validCsv = renderCsv(validRows);
  const validPath = path.join(privateTemporary, "valid.csv");
  fs.writeFileSync(validPath, validCsv, { mode: 0o600 });
  const validRun = runValidator(validPath, sha256(validCsv));
  assert.equal(validRun.status, 0, validRun.stderr || validRun.stdout);
  const validReport = JSON.parse(validRun.stdout);
  assert.equal(validReport.gatePassed, true);
  assert.equal(validReport.acceptedMismatches.length, 0);
  assert.equal(validReport.source.rawHandHistoriesPublished, false);
  assert.match(validReport.source.inputSha256, /^[a-f0-9]{64}$/);
  assert.match(validReport.source.parserSha256, /^[a-f0-9]{64}$/);

  const membershipPath = path.join(privateTemporary, "membership.csv");
  const renderedQueryPath = path.join(privateTemporary, "chico.sql");
  const renderedMetadataPath = path.join(privateTemporary, "chico.meta.json");
  fs.writeFileSync(membershipPath, "cohort,user_id\nl3top,123\n", { mode: 0o600 });
  const renderRun = spawnSync(process.execPath, [
    renderer,
    membershipPath,
    "--from=2020-01-01",
    "--to=2023-09-01",
    "--cohorts=l3top",
    "--networks=Chico",
    `--output=${renderedQueryPath}`,
    `--metadata-output=${renderedMetadataPath}`,
  ], { encoding: "utf8" });
  assert.equal(renderRun.status, 0, renderRun.stderr || renderRun.stdout);
  const renderedQuery = fs.readFileSync(renderedQueryPath, "utf8");
  const renderedMetadata = JSON.parse(fs.readFileSync(renderedMetadataPath, "utf8"));
  assert.deepEqual(renderedMetadata.selectedNetworks, ["Chico"]);
  assert.deepEqual(renderedMetadata.selectedCohorts, ["l3top"]);
  assert.equal(renderedMetadata.handClassMode, "validated-raw-hh-text-and-ipoker-xml-v4");
  assert.equal(renderedMetadata.actionCommitmentMode, "network-and-line-aware-v1");
  const renderedNetworkClause = renderedQuery.match(/AND network IN \([\s\S]*?\n    \)/)?.[0] || "";
  assert.match(renderedNetworkClause, /AND network IN \(\s*'Chico'\s*\)/);
  assert.doesNotMatch(renderedNetworkClause, /'GGNetwork'|'888Poker'|'PokerPlanets'/);
  const invalidNetworkRun = spawnSync(process.execPath, [
    renderer,
    membershipPath,
    "--cohorts=l3top",
    "--networks=Chico,UnknownNetwork",
  ], { encoding: "utf8" });
  assert.notEqual(invalidNetworkRun.status, 0);
  assert.match(invalidNetworkRun.stderr, /Invalid network selection/);

  const missingHashRun = spawnSync(process.execPath, [validator, validPath], { encoding: "utf8" });
  assert.notEqual(missingHashRun.status, 0);
  assert.match(missingHashRun.stderr, /--sha256/);

  const wrongHashRun = runValidator(validPath, "0".repeat(64));
  assert.notEqual(wrongHashRun.status, 0);
  assert.match(wrongHashRun.stderr, /SHA-256 mismatch/);

  const schemaPath = path.join(privateTemporary, "bad-schema.csv");
  const badSchema = `${columns.slice(0, -1).join(",")}\n`;
  fs.writeFileSync(schemaPath, badSchema, { mode: 0o600 });
  const schemaRun = runValidator(schemaPath, sha256(badSchema));
  assert.notEqual(schemaRun.status, 0);
  assert.match(schemaRun.stderr, /schema mismatch/);

  const badBase64Rows = validRows.map((row, index) => (
    index === 0 ? { ...row, hh_text_base64: "!!!!" } : row
  ));
  const badBase64Csv = renderCsv(badBase64Rows);
  const badBase64Path = path.join(privateTemporary, "bad-base64.csv");
  fs.writeFileSync(badBase64Path, badBase64Csv, { mode: 0o600 });
  const base64Run = runValidator(badBase64Path, sha256(badBase64Csv));
  assert.notEqual(base64Run.status, 0);
  assert.match(base64Run.stderr, /invalid canonical base64/);

  const mismatchRows = validRows.map((row, index) => (
    index === 0 ? { ...row, holecards_str: "QJo" } : row
  ));
  const mismatchCsv = renderCsv(mismatchRows);
  const mismatchPath = path.join(privateTemporary, "accepted-mismatch.csv");
  fs.writeFileSync(mismatchPath, mismatchCsv, { mode: 0o600 });
  const mismatchRun = runValidator(mismatchPath, sha256(mismatchCsv));
  assert.notEqual(mismatchRun.status, 0);
  assert.match(mismatchRun.stdout, /accepted parser rows have 1 structured mismatches/);

  const coverageRows = validRows.filter((row) => row.network !== "PokerStars(FR-ES-PT)");
  const coverageCsv = renderCsv(coverageRows);
  const coveragePath = path.join(privateTemporary, "missing-network.csv");
  fs.writeFileSync(coveragePath, coverageCsv, { mode: 0o600 });
  const coverageRun = runValidator(coveragePath, sha256(coverageCsv));
  assert.notEqual(coverageRun.status, 0);
  assert.match(coverageRun.stdout, /PokerStars\(FR-ES-PT\): no accepted overlap rows/);

  const outsidePath = path.join(outsideTemporary, "outside.csv");
  fs.writeFileSync(outsidePath, validCsv, { mode: 0o600 });
  const symlinkPath = path.join(privateTemporary, "escape.csv");
  fs.symlinkSync(outsidePath, symlinkPath);
  const pathRun = runValidator(symlinkPath, sha256(validCsv));
  assert.notEqual(pathRun.status, 0);
  assert.match(pathRun.stderr, /must resolve to a regular file under \/private\/tmp/);

  console.log("RFI raw hand-history parser gate: ok");
} finally {
  fs.rmSync(privateTemporary, { recursive: true, force: true });
  fs.rmSync(outsideTemporary, { recursive: true, force: true });
}

function parseFixture(options) {
  const hero = options.hero || options.heroPosition;
  return parseRawRfiHand({
    network: options.network || "PokerStars",
    hhText: options.network === "iPoker"
      ? buildIpokerHand(options)
      : buildTextHand(options),
    heroNickname: hero,
  });
}

function buildTextHand({
  network = "PokerStars",
  hero = "",
  heroPosition = "",
  action = "raise",
  stackBb = 20,
  cards = "As Kd",
} = {}) {
  const position = heroPosition || hero;
  const heroPlayer = hero || position;
  const players = Object.fromEntries(seatOrder.map((seat) => [seat, seat === position ? heroPlayer : seat]));
  const stackChips = stackBb * 100;
  const seats = seatOrder.map((seat, index) => (
    `Seat ${seatNumbers[index]}: ${players[seat]} (${stackChips} in chips)`
  ));
  const priorPlayers = actionOrder.slice(0, actionOrder.indexOf(position));
  const actionLines = priorPlayers.map((seat) => `${players[seat]}: folds`);
  if (action) {
    actionLines.push(
      `${heroPlayer}: ${actionText(action, stackChips, network)}`,
    );
  }
  const is888 = network === "888Poker";
  return [
    is888 ? "***** 888poker Hand History for Game fixture *****" : "PokerStars Hand #fixture",
    "Table 'Fixture' 7-max Seat #1 is the button",
    ...seats,
    `${players.SB}: posts small blind 50`,
    `${players.BB}: posts big blind 100`,
    is888 ? "** Dealing down cards **" : "*** HOLE CARDS ***",
    `Dealt to ${heroPlayer} [${is888 ? cards.replace(" ", ", ") : cards}]`,
    ...actionLines,
    is888 ? "** Summary **" : "*** SUMMARY ***",
  ].join("\n");
}

function buildIpokerHand({
  hero = "",
  heroPosition = "",
  action = "raise",
  stackBb = 20,
} = {}) {
  const position = heroPosition || hero;
  const heroPlayer = hero || position;
  const players = Object.fromEntries(
    seatOrder.map((seat) => [seat, seat === position ? heroPlayer : seat])
  );
  const decisionStack = stackBb * 100;
  const playerChips = decisionStack + 10;
  const playerNodes = seatOrder.map((seat, index) => (
    `<player seat="${seatNumbers[index]}" name="${players[seat]}" chips="${playerChips}" dealer="${seat === "BTN" ? 1 : 0}"/>`
  ));
  const forcedActions = seatOrder.map((seat, index) => (
    `<action no="${index + 1}" player="${players[seat]}" type="15" sum="10"/>`
  ));
  forcedActions.push(`<action no="8" player="${players.SB}" type="1" sum="50"/>`);
  forcedActions.push(`<action no="9" player="${players.BB}" type="2" sum="100"/>`);
  const priorPlayers = actionOrder.slice(0, actionOrder.indexOf(position));
  const actionNodes = priorPlayers.map((seat, index) => (
    `<action no="${index + 1}" player="${players[seat]}" type="0" sum="0"/>`
  ));
  if (action) {
    const type = action === "fold" ? "0"
      : action === "limp" ? "3"
        : action === "explicitShove" ? "7"
          : "23";
    const amount = action === "fold" ? 0
      : action === "limp" ? 100
        : action === "raise" ? 300
          : decisionStack;
    actionNodes.push(
      `<action no="${actionNodes.length + 1}" player="${heroPlayer}" type="${type}" sum="${amount}"/>`
    );
  }
  const cardNodes = seatOrder.map((seat) => (
    `<cards type="Pocket" player="${players[seat]}">${seat === position ? "SA DK" : "X X"}</cards>`
  ));
  return [
    "<root>",
    "<game>",
    "<bigblind>100</bigblind>",
    "<players>",
    ...playerNodes,
    "</players>",
    '<round no="0">',
    ...forcedActions,
    "</round>",
    '<round no="1">',
    ...actionNodes,
    ...cardNodes,
    "</round>",
    "</game>",
    "</root>",
  ].join("\n");
}

function actionText(action, stackChips, network) {
  if (action === "fold") return "folds";
  if (action === "limp") return "calls 100";
  if (action === "raise") return "raises 200 to 300";
  if (action === "explicitShove") return `raises 900 to ${stackChips} and is all in`;
  if (action === "amountShove") return `raises ${stackChips - 0.5}`;
  if (action === "postedBlindShove") {
    if (network !== "888Poker") {
      throw new Error("postedBlindShove fixture is 888 single-amount syntax");
    }
    return `raises ${stackChips - 50}`;
  }
  if (action === "totalToFalseShove") return "raises 250 to 350";
  throw new Error(`unknown fixture action: ${action}`);
}

function validationRows() {
  const stackValues = [80, 40, 25, 17, 13, 8];
  const fixtureActions = ["fold", "limp", "raise", "explicitShove", "fold", "raise"];
  const rows = [];
  let id = 0;
  for (const network of RAW_RFI_SUPPORTED_NETWORKS) {
    for (const hero of Object.keys(positionCode)) {
      for (let index = 0; index < stackValues.length; index += 1) {
        id += 1;
        const stackBb = stackValues[index];
        const fixtureAction = fixtureActions[index];
        const trackerAction = fixtureAction === "fold" ? "F" : fixtureAction === "limp" ? "C" : "R";
        const isRaise = trackerAction === "R";
        const isShove = fixtureAction === "explicitShove";
        const postedBlindChips = hero === "SB" ? 50 : 0;
        const hhText = network === "iPoker"
          ? buildIpokerHand({ hero, action: fixtureAction, stackBb })
          : buildTextHand({ network, hero, action: fixtureAction, stackBb });
        rows.push({
          user_id: String(id),
          network,
          hh_id: `fixture-${id}`,
          played_at: "2026-07-01 00:00:00",
          cnt_players: "7",
          cnt_players_lookup_position: "7",
          position: String(positionCode[hero]),
          holecards_str: "AKo",
          preflop_effective_stack_size_bb: String(stackBb),
          is_preflop_unopened: "1",
          is_rfi: isRaise ? "1" : "0",
          is_preflop_allin: isShove ? "1" : "0",
          is_preflop_limp: fixtureAction === "limp" ? "1" : "0",
          preflop_action: trackerAction,
          preflop_raise_and_blind_made_amount_bb: isShove
            ? String(stackBb + postedBlindChips / 100)
            : isRaise
              ? "3"
              : "0",
          bb_amount: "100",
          bet_bb_amount: String(postedBlindChips),
          raw_nickname: hero,
          hh_text_base64: Buffer.from(hhText, "utf8").toString("base64"),
        });
      }
    }
  }
  return rows;
}

function renderCsv(rows) {
  return `${columns.join(",")}\n${rows.map((row) => (
    columns.map((column) => csvCell(row[column])).join(",")
  )).join("\n")}\n`;
}

function csvCell(value) {
  const string = String(value ?? "");
  return /[",\r\n]/.test(string) ? `"${string.replace(/"/g, "\"\"")}"` : string;
}

function runValidator(input, expectedSha256) {
  return spawnSync(process.execPath, [validator, input, `--sha256=${expectedSha256}`], {
    encoding: "utf8",
  });
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
