#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const renderer = path.join(here, "render-missing-cards-recovery-query.mjs");
const template = path.join(here, "q_ff_rfi_missing_cards_recovery.sql");
const temporary = fs.mkdtempSync("/private/tmp/ff-rfi-missing-card-query-test-");
const membership = path.join(temporary, "membership.csv");
const duplicateMembership = path.join(temporary, "membership-duplicate.csv");

const fullCubeColumns = [
  "window_start",
  "window_end",
  "table_filter",
  "table_size",
  "cohort",
  "cohort_selected_players",
  "position_group",
  "position_order",
  "position_code",
  "stack_bucket",
  "stack_order",
  "hand_class",
  "eligible_opportunities",
  "known_card_opportunities",
  "lookup_mismatch_opportunities",
  "first_observed_at",
  "last_observed_at",
  "opportunities",
  "raises_total",
  "regular_raise",
  "open_shove",
  "limp",
  "fold_other",
  "shove_allin_flag",
  "shove_effective_amount_only",
  "regular_three_bb_open",
  "normal_three_bb_as_shove",
  "non_exact_r_effective_allin",
  "raise_total_pct",
  "regular_raise_pct",
  "open_shove_pct",
  "limp_pct",
  "fold_pct",
  "below_exact_minimum",
  "low_sample",
];

try {
  fs.writeFileSync(membership, [
    "cohort,user_id,current_rank",
    "l3top,101,11",
    "l3top,102,12",
    "l3,101,11",
    "l3,102,12",
    "l3,103,15",
    "l2,201,8",
    "l2,202,9",
    "l1,301,3",
    "",
  ].join("\n"));
  fs.writeFileSync(duplicateMembership, [
    "cohort,user_id",
    "l3top,101",
    "l3top,101",
    "",
  ].join("\n"));

  const fullSql = path.join(temporary, "full.sql");
  const fullMeta = path.join(temporary, "full.meta.json");
  const fullRun = runRenderer(membership, [
    "--mode=full-cube",
    "--from=2023-09-01",
    "--to=2026-07-27",
    "--user-shard-count=2",
    "--user-shard-index=0",
    `--output=${fullSql}`,
    `--metadata-output=${fullMeta}`,
  ]);
  assert.equal(fullRun.status, 0, fullRun.stderr || fullRun.stdout);

  const sql = fs.readFileSync(fullSql, "utf8");
  const metadata = JSON.parse(fs.readFileSync(fullMeta, "utf8"));
  assert.ok(!sql.includes("{{"), "renderer must resolve every placeholder");
  assert.equal(
    metadata.templateSha256,
    sha256(fs.readFileSync(template)),
    "metadata must hash the exact template bytes"
  );
  assert.equal(metadata.renderedSqlSha256, sha256(sql));
  assert.equal(metadata.mode, "full-cube");
  assert.equal(metadata.handClassMode, "structured-or-validated-raw-when-empty-v1");
  assert.equal(metadata.recoveryPredicate, "latest structured_hand_class = ''");
  assert.equal(metadata.recoveryIsDisjoint, true);
  assert.equal(metadata.executionPlan.rawTextTouchesStructuredKnownRows, false);
  assert.match(metadata.executionPlan.rawRecoveryPath, /blank class.*exact-key raw lookup/);
  assert.equal(metadata.outputContainsRawHandsNicknamesOrIds, false);
  assert.deepEqual(metadata.outputColumns, fullCubeColumns);
  assert.deepEqual(metadata.selectedCohortCounts, {
    l3top: 2,
    l3: 3,
    l2: 2,
    l1: 1,
  });
  assert.equal(metadata.selectedMembershipRows, 8);
  assert.equal(metadata.selectedUniqueUsers, 6);
  assert.equal(metadata.userShard.count, 2);
  assert.match(metadata.userShard.userIdsSha256, /^[a-f0-9]{64}$/);
  assert.match(metadata.parserGrammarsSha256, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(metadata.userShard, "firstUserId"), false);
  assert.equal(Object.hasOwn(metadata.userShard, "lastUserId"), false);

  const latest = section(sql, "latest AS (", "positioned_latest AS (");
  assert.doesNotMatch(
    latest,
    /network\s+IN\s*\(/i,
    "full latest must retain structured Chico/888/other-network rows"
  );
  assert.doesNotMatch(
    latest,
    /tracker_hh_id\s*!=\s*''/i,
    "full latest must retain structured rows without a raw HH key"
  );
  assert.match(latest, /toString\(x\.8\) AS structured_hand_class/);

  const rawLookup = section(sql, "raw_lookup_candidates AS (", "raw_latest AS (");
  assert.match(rawLookup, /structured_hand_class = ''/);
  assert.match(rawLookup, /network IN\s*\(\s*'GGNetwork'/s);
  assert.match(rawLookup, /'PokerStars\(FR-ES-PT\)'/);
  assert.match(rawLookup, /'iPoker'/);
  assert.match(rawLookup, /'888Poker'/);
  assert.match(rawLookup, /'Chico'/);
  assert.match(rawLookup, /'PokerPlanets'/);
  assert.match(rawLookup, /'Winamax\.fr'/);
  assert.match(rawLookup, /'WPN'/);
  assert.match(rawLookup, /tracker_hh_id != ''/);

  const rawJoin = section(sql, "raw_latest AS (", "joined AS (");
  assert.match(
    rawJoin,
    /tuple\(\s*toUInt64\(check_user_id\),\s*toString\(network\),\s*toString\(converted_hh_id\)/s
  );
  assert.match(
    rawJoin,
    /SELECT tuple\(user_id, network, hh_id\)\s+FROM raw_lookup_keys/s
  );
  assert.match(rawJoin, /WHERE check_user_id IN \([0-9, ]+\)/);
  assert.match(rawJoin, /AND network IN\s*\(\s*'GGNetwork'/s);
  assert.match(
    rawJoin,
    /argMax\(\s*tuple\(toString\(nickname\), hh_text\),\s*tuple\(created_at, toString\(nickname\), hh_text\)/s,
    "raw HH selection must break created_at ties deterministically"
  );

  const latestVersions = section(sql, "latest_versions AS (", "latest AS (");
  assert.match(
    latestVersions,
    /\), tuple\(\s*h\.version,\s*ifNull\(toString\(h\.user_id\), ''\)/s,
    "structured argMax must break version ties with normalized selected fields"
  );
  for (const selectedField of [
    "h.played_at",
    "h.cnt_players",
    "h.cnt_players_lookup_position",
    "h.position",
    "h.network",
    "h.hh_id",
    "h.holecards_str",
    "h.preflop_effective_stack_size_bb",
    "h.is_preflop_unopened",
    "h.is_rfi",
    "h.is_preflop_allin",
    "h.is_preflop_limp",
    "h.preflop_action",
    "h.preflop_raise_and_blind_made_amount_bb",
    "h.bet_bb_amount",
    "h.bb_amount",
  ]) {
    assert.match(latestVersions, new RegExp(selectedField.replaceAll(".", "\\.")));
  }

  assert.match(
    sql,
    /extract\(node, '\(\?i\)\\\\bplayer="\(\[\^"\]\*\)"'\) = source_nickname/
  );
  assert.match(sql, /length\(generic_cardful_dealt_lines\) = 1/);
  assert.match(
    sql,
    /arrayDistinct\(extractAll\(\s*hh_text,\s*'\(\?im\)\^Dealt to/s,
    "text parser may collapse only byte-identical repeated Dealt-to lines"
  );
  assert.match(sql, /generic_dealt_alias = source_nickname/);
  assert.match(sql, /lower\(generic_dealt_alias\) = 'hero'/);
  assert.match(
    sql,
    /extract\(generic_hero_dealt_line, '\(\?i\)\\\\\[\(\[\^\\\\\]\]\+\)\\\\\]'\)/,
    "text parser must tokenize only the bracket payload, never the alias"
  );
  assert.match(sql, /structured_hand_class AS hand_class/);
  assert.match(sql, /validated_raw_hand_class AS hand_class/);
  assert.match(sql, /effective_known AS \(\s*SELECT \* FROM structured_known\s*UNION ALL/s);

  const finalOutput = sql.slice(sql.lastIndexOf("SELECT\n  toString(toDate("));
  assert.ok(finalOutput.startsWith("SELECT\n  toString(toDate("));
  for (const privateColumn of [
    "hh_text",
    "source_nickname",
    "tracker_hh_id",
    "uid",
    "user_id",
  ]) {
    assert.doesNotMatch(
      finalOutput,
      new RegExp(`\\b${privateColumn}\\b`),
      `full-cube result must not expose ${privateColumn}`
    );
  }
  for (const column of fullCubeColumns) {
    assert.match(finalOutput, new RegExp(`\\b${column}\\b`));
  }

  const validationSql = path.join(temporary, "validation.sql");
  const validationMeta = path.join(temporary, "validation.meta.json");
  const validationRun = runRenderer(membership, [
    "--mode=validation",
    `--output=${validationSql}`,
    `--metadata-output=${validationMeta}`,
  ]);
  assert.equal(validationRun.status, 0, validationRun.stderr || validationRun.stdout);
  const validation = fs.readFileSync(validationSql, "utf8");
  const validationMetadata = JSON.parse(fs.readFileSync(validationMeta, "utf8"));
  assert.equal(validationMetadata.mode, "validation");
  assert.equal(validationMetadata.executionPlan.rawTextTouchesStructuredKnownRows, true);
  assert.deepEqual(validationMetadata.window, ["2026-07-01", "2026-07-02"]);
  assert.match(validation, /1 = 1 \/\* validation-only overlap includes tracker-known classes \*\//);
  assert.match(validation, /p\.class_matches = p\.tracker_known_with_raw/);
  assert.match(validation, /throwIf\(1, 'raw hand-class overlap gate failed'\)/);
  const validationFinal = validation.slice(validation.lastIndexOf("SELECT\n  t.network,"));
  assert.match(validationFinal, /WHERE network IN\s*\(\s*'GGNetwork'/s);
  assert.match(validationFinal, /'Chico'/);
  assert.match(validationFinal, /'888Poker'/);
  assert.match(validationFinal, /'PokerPlanets'/);
  assert.match(validationFinal, /'Winamax\.fr'/);
  assert.match(validationFinal, /'WPN'/);
  for (const privateColumn of ["hh_text", "source_nickname", "tracker_hh_id", "uid", "user_id"]) {
    assert.doesNotMatch(validationFinal, new RegExp(`\\b${privateColumn}\\b`));
  }

  const countersSql = path.join(temporary, "counters.sql");
  const countersMeta = path.join(temporary, "counters.meta.json");
  const countersRun = runRenderer(membership, [
    "--mode=recovery-counters",
    "--from=2023-09-01",
    "--to=2026-07-27",
    `--output=${countersSql}`,
    `--metadata-output=${countersMeta}`,
  ]);
  assert.equal(countersRun.status, 0, countersRun.stderr || countersRun.stdout);
  const counters = fs.readFileSync(countersSql, "utf8");
  assert.match(counters, /countIf\(structured_hand_class = ''\) AS structured_missing/);
  assert.match(
    counters,
    /countIf\(validated_raw_hand_class != ''\) AS tracker_missing_recovered/
  );
  assert.match(counters, /AS unresolved_missing/);
  assert.doesNotMatch(
    counters.slice(counters.lastIndexOf("SELECT\n  t.network,")),
    /WHERE network IN/,
    "counter mode must report unsupported networks as unresolved, not discard them"
  );

  const wrongValidationWindow = runRenderer(membership, [
    "--mode=validation",
    "--from=2026-07-02",
    "--to=2026-07-03",
  ]);
  assert.notEqual(wrongValidationWindow.status, 0);
  assert.match(wrongValidationWindow.stderr, /Validation mode is pinned/);

  const publicOutput = runRenderer(membership, [
    "--mode=full-cube",
    "--output=/tmp/not-private.sql",
  ]);
  assert.notEqual(publicOutput.status, 0);
  assert.match(publicOutput.stderr, /must stay under \/private\/tmp/);

  const duplicateRun = runRenderer(duplicateMembership, ["--mode=full-cube"]);
  assert.notEqual(duplicateRun.status, 0);
  assert.match(duplicateRun.stderr, /Duplicate cohort\/user membership key/);

  console.log("RFI missing-card recovery query gate: ok");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

function runRenderer(input, args) {
  return spawnSync(process.execPath, [renderer, input, ...args], {
    cwd: here,
    encoding: "utf8",
  });
}

function section(text, start, end) {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing SQL section ${start}..${end}`);
  return text.slice(from, to);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
