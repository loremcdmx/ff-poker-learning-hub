#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const buildManifestScript = path.join(here, "build-raw-hh-aggregate-manifest.mjs");
const mergeSourcesScript = path.join(here, "merge-field-action-sources.mjs");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "ff-rfi-source-merge-"));

const columns = [
  "window_start", "window_end", "table_filter", "table_size", "cohort", "cohort_selected_players",
  "position_group", "position_order", "position_code", "stack_bucket", "stack_order", "hand_class",
  "eligible_opportunities", "known_card_opportunities", "lookup_mismatch_opportunities",
  "first_observed_at", "last_observed_at",
  "opportunities", "raises_total", "regular_raise", "open_shove", "limp", "fold_other",
  "shove_allin_flag", "shove_effective_amount_only", "regular_three_bb_open",
  "normal_three_bb_as_shove", "non_exact_r_effective_allin",
  "raise_total_pct", "regular_raise_pct", "open_shove_pct", "limp_pct", "fold_pct",
  "below_exact_minimum", "low_sample",
];
const cohorts = ["l3top", "l3", "l2", "l1"];

try {
  const membership = write("membership.csv", [
    "cohort,user_id,current_rank,current_league,ffev_hands,ffev",
    "l3top,101,11,3,30000,9.1",
    "l3,101,11,3,30000,9.1",
    "l2,202,8,2,45000,7.2",
    "l1,303,3,1,80000,12.4",
    "",
  ].join("\n"));
  const rawAggregate = write("raw-aggregate.csv", aggregateCsv({
    start: "2023-08-01",
    end: "2023-08-31",
    opportunities: 10,
    raises: 3,
    regular: 2,
    shove: 1,
    limp: 2,
    fold: 5,
    shoveAllin: 1,
    shoveAmount: 0,
    regularThreeBb: 1,
  }));
  const rawExport = write("raw-private-export.csv", [
    "check_user_id,network,converted_hh_id,nickname,hh_at,hh_text",
    '101,PokerStars,one,Hero One,2023-08-01 00:00:00,"PokerStars Hand #1',
    'Dealt to Hero One [As Kh]"',
    '202,iPoker,two,Hero Two,2023-08-02 00:00:00,"<game gamecode=""2""><player name=""Hero Two"" /></game>"',
    '303,GG,three,Hero Three,2023-08-03 00:00:00,"PokerStars Hand #3"',
    "",
  ].join("\n"));
  const queryTemplate = write("raw-template.sql", [
    "WITH latest AS (",
    "  SELECT",
    "    check_user_id,",
    "    network,",
    "    converted_hh_id,",
    "    argMax(tuple(nickname, hh_at, hh_text), created_at) AS x",
    "  FROM analytics.stg_hh_texts__hh_texts",
    "  WHERE hh_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')",
    "    AND hh_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')",
    "  GROUP BY check_user_id, network, converted_hh_id",
    ")",
    "SELECT check_user_id, network, converted_hh_id, x.1 AS nickname, x.2 AS hh_at, x.3 AS hh_text",
    "FROM latest;",
    "",
  ].join("\n"));
  const query = write("raw-rendered.sql", fs.readFileSync(queryTemplate, "utf8")
    .replace("{{WINDOW_START_INCLUSIVE}}", "2023-08-01")
    .replace("{{WINDOW_END_EXCLUSIVE}}", "2023-09-01"));
  const parser = write("fixture-parser.mjs", "export function parseRawRfiHand() { return { ok: true }; }\n");
  const aggregator = write("fixture-aggregator.mjs", "export function aggregateRawRfiHands() { return []; }\n");
  const validation = writeJson("validation.json", passingValidation());
  const receipt = writeJson("receipt.json", {
    status: "succeeded",
    job_id: `mcp_ch_job_${"a".repeat(32)}`,
    row_count: 3,
    byte_size: fs.statSync(rawExport).size,
    finished_at: "2026-07-26T12:00:00Z",
  });
  const rawManifest = path.join(temporary, "raw-manifest.json");

  const build = buildRawManifest({
    aggregate: rawAggregate,
    rawExport,
    query,
    queryTemplate,
    receipt,
    validation,
    membership,
    parser,
    aggregator,
    output: rawManifest,
  });
  assert.equal(build.status, 0, build.stderr || build.stdout);
  const rawMetadata = JSON.parse(fs.readFileSync(rawManifest, "utf8"));
  assert.equal(rawMetadata.schema, "ff-rfi-raw-hh-aggregate-v1");
  assert.equal(rawMetadata.sourceKind, "raw-hh-local-aggregate");
  assert.deepEqual(rawMetadata.window, {
    startInclusive: "2023-08-01T00:00:00Z",
    endExclusive: "2023-09-01T00:00:00Z",
    semantics: "half-open-utc",
  });
  assert.equal(rawMetadata.source.table, "analytics.stg_hh_texts__hh_texts");
  assert.equal(rawMetadata.source.execution.queryJobId, `mcp_ch_job_${"a".repeat(32)}`);
  assert.match(rawMetadata.source.execution.receiptSha256, /^[a-f0-9]{64}$/);
  assert.equal(rawMetadata.source.export.rowCount, 3);
  assert.equal(rawMetadata.aggregate.rowCount, 4);
  assert.equal(rawMetadata.membership.rows, 4);
  assert.equal(rawMetadata.membership.uniqueUsers, 3);
  assert.deepEqual(rawMetadata.membership.cohortCounts, { l3top: 1, l3: 1, l2: 1, l1: 1 });
  assert.equal(rawMetadata.validation.status, "passed");
  assert.equal(rawMetadata.validation.rejected, 0);
  assert.equal(rawMetadata.totals.opportunities, 40);
  assert.equal(rawMetadata.stateCoverage.length, 4);
  const rawManifestText = fs.readFileSync(rawManifest, "utf8");
  for (const forbidden of ["Hero One", "Hero Two", "Hero Three", "Dealt to", "\"hh_text\":", "<game"]) {
    assert.ok(!rawManifestText.includes(forbidden), `raw manifest leaked ${forbidden}`);
  }

  const structuredAggregate = write("structured-aggregate.csv", aggregateCsv({
    start: "2023-09-01",
    end: "2023-09-30",
    opportunities: 50,
    raises: 20,
    regular: 15,
    shove: 5,
    limp: 10,
    fold: 20,
    shoveAllin: 3,
    shoveAmount: 2,
    regularThreeBb: 10,
  }));
  const structuredManifest = writeJson(
    "structured-manifest.json",
    structuredMergeManifest(structuredAggregate, membership),
  );
  const mergedAggregate = path.join(temporary, "merged.csv");
  const mergedManifest = path.join(temporary, "merged.json");
  const merge = mergeSources({
    structuredAggregate,
    structuredManifest,
    rawAggregate,
    rawManifest,
    output: mergedAggregate,
    metadata: mergedManifest,
  });
  assert.equal(merge.status, 0, merge.stderr || merge.stdout);

  const mergedMetadata = JSON.parse(fs.readFileSync(mergedManifest, "utf8"));
  assert.equal(mergedMetadata.schema, "ff-rfi-field-action-merge-v2");
  assert.equal(mergedMetadata.strategy, "adjacent-half-open-mixed-source");
  assert.deepEqual(mergedMetadata.window, {
    startInclusive: "2023-08-01T00:00:00Z",
    endExclusive: "2023-10-01T00:00:00Z",
    semantics: "half-open-utc",
  });
  assert.deepEqual(mergedMetadata.sources.map((source) => source.sourceKind), [
    "raw-hh-local-aggregate",
    "structured-field-action-merge-v1",
  ]);
  assert.equal(mergedMetadata.merged.rowCount, 4);
  assert.equal(mergedMetadata.merged.totals.opportunities, 240);
  assert.equal(mergedMetadata.merged.knownCards.known, 240);
  assert.equal(mergedMetadata.merged.knownCards.eligible, 248);
  assert.equal(mergedMetadata.merged.stateCoverage.length, 4);
  assert.match(mergedMetadata.merged.sha256, /^[a-f0-9]{64}$/);

  const mergedRows = parseCsv(fs.readFileSync(mergedAggregate, "utf8"));
  assert.equal(mergedRows.length, 4);
  for (const row of mergedRows) {
    assert.equal(row.window_start, "2023-08-01");
    assert.equal(row.window_end, "2023-09-30");
    assert.equal(row.opportunities, "60");
    assert.equal(row.raises_total, "23");
    assert.equal(row.regular_raise, "17");
    assert.equal(row.open_shove, "6");
    assert.equal(row.limp, "12");
    assert.equal(row.fold_other, "25");
    assert.equal(row.raise_total_pct, "38.333");
  }
  const mergedManifestText = fs.readFileSync(mergedManifest, "utf8");
  for (const forbidden of ["Hero One", "Hero Two", "Hero Three", "Dealt to", "\"hh_text\":", "<game"]) {
    assert.ok(!mergedManifestText.includes(forbidden), `merged manifest leaked ${forbidden}`);
  }

  const badValidation = writeJson("bad-validation.json", passingValidation({
    totals: {
      checks: {
        cards: { compared: 3, matched: 2, pct: 66.6667 },
      },
    },
  }));
  const validationFailure = buildRawManifest({
    aggregate: rawAggregate,
    rawExport,
    query,
    queryTemplate,
    receipt,
    validation: badValidation,
    membership,
    parser,
    aggregator,
    output: path.join(temporary, "bad-validation-manifest.json"),
  });
  assert.notEqual(validationFailure.status, 0);
  assert.match(validationFailure.stderr, /validation.*cards.*mismatch/i);

  const badReceipt = writeJson("bad-receipt.json", {
    status: "succeeded",
    job_id: `mcp_ch_job_${"b".repeat(32)}`,
    row_count: 2,
  });
  const receiptFailure = buildRawManifest({
    aggregate: rawAggregate,
    rawExport,
    query,
    queryTemplate,
    receipt: badReceipt,
    validation,
    membership,
    parser,
    aggregator,
    output: path.join(temporary, "bad-receipt-manifest.json"),
  });
  assert.notEqual(receiptFailure.status, 0);
  assert.match(receiptFailure.stderr, /receipt row count.*raw export/i);

  const badAggregate = write(
    "raw-aggregate-with-pii.csv",
    `${fs.readFileSync(rawAggregate, "utf8").trimEnd().split("\n").map((line, index) =>
      index === 0 ? `${line},nickname` : `${line},Hero One`
    ).join("\n")}\n`,
  );
  const piiFailure = buildRawManifest({
    aggregate: badAggregate,
    rawExport,
    query,
    queryTemplate,
    receipt,
    validation,
    membership,
    parser,
    aggregator,
    output: path.join(temporary, "bad-pii-manifest.json"),
  });
  assert.notEqual(piiFailure.status, 0);
  assert.match(piiFailure.stderr, /unexpected aggregate CSV columns/i);

  const tamperedAggregate = write("raw-aggregate-tampered.csv", fs.readFileSync(rawAggregate, "utf8").replace(",10,3,2,1,2,5,", ",11,3,2,1,2,6,"));
  const tamperedMerge = mergeSources({
    structuredAggregate,
    structuredManifest,
    rawAggregate: tamperedAggregate,
    rawManifest,
    output: path.join(temporary, "tampered-merged.csv"),
    metadata: path.join(temporary, "tampered-merged.json"),
  });
  assert.notEqual(tamperedMerge.status, 0);
  assert.match(tamperedMerge.stderr, /raw aggregate SHA-256 mismatch/i);

  const changedMembershipManifest = writeJson("raw-membership-drift.json", {
    ...rawMetadata,
    membership: {
      ...rawMetadata.membership,
      sha256: "0".repeat(64),
    },
  });
  const membershipFailure = mergeSources({
    structuredAggregate,
    structuredManifest,
    rawAggregate,
    rawManifest: changedMembershipManifest,
    output: path.join(temporary, "membership-merged.csv"),
    metadata: path.join(temporary, "membership-merged.json"),
  });
  assert.notEqual(membershipFailure.status, 0);
  assert.match(membershipFailure.stderr, /membership.*identical/i);

  const gapStructuredAggregate = write("structured-gap.csv", aggregateCsv({
    start: "2023-09-02",
    end: "2023-09-30",
    opportunities: 50,
    raises: 20,
    regular: 15,
    shove: 5,
    limp: 10,
    fold: 20,
    shoveAllin: 3,
    shoveAmount: 2,
    regularThreeBb: 10,
  }));
  const gapStructuredManifestValue = structuredMergeManifest(gapStructuredAggregate, membership, {
    startInclusive: "2023-09-02T00:00:00Z",
    endInclusive: "2023-09-30T23:59:59.999Z",
    endExclusive: "2023-10-01T00:00:00Z",
  });
  const gapStructuredManifest = writeJson("structured-gap.json", gapStructuredManifestValue);
  const gapFailure = mergeSources({
    structuredAggregate: gapStructuredAggregate,
    structuredManifest: gapStructuredManifest,
    rawAggregate,
    rawManifest,
    output: path.join(temporary, "gap-merged.csv"),
    metadata: path.join(temporary, "gap-merged.json"),
  });
  assert.notEqual(gapFailure.status, 0);
  assert.match(gapFailure.stderr, /strictly adjacent/i);

  console.log("RFI mixed-source provenance and merge gate: ok");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

function buildRawManifest(options) {
  return spawnSync(process.execPath, [
    buildManifestScript,
    `--aggregate=${options.aggregate}`,
    `--raw-export=${options.rawExport}`,
    `--query=${options.query}`,
    `--query-template=${options.queryTemplate}`,
    `--receipt=${options.receipt}`,
    `--validation=${options.validation}`,
    `--membership=${options.membership}`,
    `--parser=${options.parser}`,
    `--aggregator=${options.aggregator}`,
    "--window-start=2023-08-01",
    "--window-end=2023-09-01",
    `--output=${options.output}`,
  ], { encoding: "utf8" });
}

function mergeSources(options) {
  return spawnSync(process.execPath, [
    mergeSourcesScript,
    `--structured-aggregate=${options.structuredAggregate}`,
    `--structured-manifest=${options.structuredManifest}`,
    `--raw-aggregate=${options.rawAggregate}`,
    `--raw-manifest=${options.rawManifest}`,
    `--output=${options.output}`,
    `--metadata=${options.metadata}`,
  ], { encoding: "utf8" });
}

function aggregateCsv(config) {
  const rows = cohorts.map((cohort, index) => {
    const values = [
      config.start,
      config.end,
      "cnt_players = 7",
      "7",
      cohort,
      "1",
      "EP",
      "1",
      "4",
      "70+",
      "1",
      "AA",
      String(config.opportunities + 1),
      String(config.opportunities),
      "0",
      `${config.start} 00:00:0${index}`,
      `${config.end} 23:59:5${index}`,
      String(config.opportunities),
      String(config.raises),
      String(config.regular),
      String(config.shove),
      String(config.limp),
      String(config.fold),
      String(config.shoveAllin),
      String(config.shoveAmount),
      String(config.regularThreeBb),
      "0",
      "0",
      pct(config.raises, config.opportunities),
      pct(config.regular, config.opportunities),
      pct(config.shove, config.opportunities),
      pct(config.limp, config.opportunities),
      pct(config.fold, config.opportunities),
      String(Number(config.opportunities < 50)),
      String(Number(config.opportunities < 100)),
    ];
    return values.join(",");
  });
  return `${columns.join(",")}\n${rows.join("\n")}\n`;
}

function passingValidation(overrides = {}) {
  const baseCheck = { compared: 3, matched: 3, pct: 100 };
  const checks = {
    cards: { ...baseCheck },
    position: { ...baseCheck },
    stack: { ...baseCheck },
    publicStack: { ...baseCheck },
    action: { ...baseCheck },
    shove: { compared: 1, matched: 1, pct: 100 },
  };
  const totalsOverride = overrides.totals || {};
  const mergedChecks = {
    ...checks,
    ...(totalsOverride.checks || {}),
  };
  const totals = {
    rows: 3,
    parsed: 3,
    parsedPct: 100,
    rejected: 0,
    reasons: {},
    checks: mergedChecks,
    ...totalsOverride,
    checks: mergedChecks,
  };
  return {
    source: {
      rawHandHistoriesPublished: false,
    },
    totals,
    networks: {
      GG: {
        rows: 1,
        parsed: 1,
        rejected: 0,
        checks: networkChecks(),
      },
      iPoker: {
        rows: 1,
        parsed: 1,
        rejected: 0,
        checks: networkChecks(),
      },
      PokerStars: {
        rows: 1,
        parsed: 1,
        rejected: 0,
        checks: networkChecks(),
      },
    },
  };
}

function networkChecks() {
  return {
    cards: { compared: 1, matched: 1, pct: 100 },
    position: { compared: 1, matched: 1, pct: 100 },
    stack: { compared: 1, matched: 1, pct: 100 },
    publicStack: { compared: 1, matched: 1, pct: 100 },
    action: { compared: 1, matched: 1, pct: 100 },
    shove: { compared: 0, matched: 0, pct: 0 },
  };
}

function structuredMergeManifest(aggregatePath, membershipPath, window = {}) {
  const startInclusive = window.startInclusive || "2023-09-01T00:00:00Z";
  const endInclusive = window.endInclusive || "2023-09-30T23:59:59.999Z";
  const endExclusive = window.endExclusive || "2023-10-01T00:00:00Z";
  const aggregateBuffer = fs.readFileSync(aggregatePath);
  const rows = parseCsv(aggregateBuffer.toString("utf8"));
  const membershipBuffer = fs.readFileSync(membershipPath);
  const membershipRows = parseCsv(membershipBuffer.toString("utf8"));
  const membershipKeys = membershipRows.map((row) => `${row.cohort}|${row.user_id}`).sort();
  const cohortCounts = Object.fromEntries(cohorts.map((cohort) => [
    cohort,
    membershipRows.filter((row) => row.cohort === cohort).length,
  ]));
  const totals = totalsFor(rows);
  const knownCards = knownCardsFor(rows);
  return {
    schema: "ff-rfi-field-action-merge-v1",
    shardStrategy: "contiguous-time",
    inputs: [{
      file: "structured-shard.csv",
      queryJobId: `mcp_ch_job_${"c".repeat(32)}`,
      executionMode: "async",
      querySha256: "d".repeat(64),
      renderedSqlSha256: "d".repeat(64),
      templateSha256: "e".repeat(64),
      sourceTable: "analytics.int_tracker_hand_joined",
      handClassMode: "joined-holecards-str",
      holecardMappingSha256: null,
      sha256: sha256(aggregateBuffer),
      rows: rows.length,
      windowStartInclusive: startInclusive,
      windowEndInclusive: endInclusive,
      userShard: { index: 0, count: 1, userIdsSha256: "f".repeat(64) },
      shardUsers: 3,
      sourceUniqueUsers: 3,
      shardMembershipRows: 4,
      sourceMembershipRows: 4,
      membershipSha256: sha256(membershipBuffer),
      membershipKeysSha256: sha256(membershipKeys.join("\n")),
      membershipCohortCounts: cohortCounts,
      totals,
    }],
    merged: {
      file: "structured-aggregate.csv",
      rows: rows.length,
      sha256: sha256(aggregateBuffer),
      windowStartInclusive: startInclusive,
      windowEndExclusive: endExclusive,
      knownCards,
      totals,
    },
  };
}

function totalsFor(rows) {
  const names = [
    "opportunities", "raises_total", "regular_raise", "open_shove", "limp", "fold_other",
    "shove_allin_flag", "shove_effective_amount_only", "regular_three_bb_open",
    "normal_three_bb_as_shove", "non_exact_r_effective_allin",
  ];
  return Object.fromEntries(names.map((name) => [
    name,
    rows.reduce((sum, row) => sum + Number(row[name]), 0),
  ]));
}

function knownCardsFor(rows) {
  const states = new Map();
  for (const row of rows) {
    const key = [row.cohort, row.position_group, row.position_order, row.position_code, row.stack_bucket, row.stack_order].join("|");
    states.set(key, {
      eligible: Number(row.eligible_opportunities),
      known: Number(row.known_card_opportunities),
      lookupMismatch: Number(row.lookup_mismatch_opportunities),
    });
  }
  const result = [...states.values()].reduce((total, state) => ({
    eligible: total.eligible + state.eligible,
    known: total.known + state.known,
    lookupMismatch: total.lookupMismatch + state.lookupMismatch,
  }), { eligible: 0, known: 0, lookupMismatch: 0 });
  result.pct = Number((result.known / result.eligible * 100).toFixed(6));
  return result;
}

function parseCsv(text) {
  const parsed = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === "\"" && text[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") quoted = false;
      else cell += char;
    } else if (char === "\"") quoted = true;
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
  return parsed.filter((values) => values.some(Boolean)).map((values) =>
    Object.fromEntries(header.map((column, index) => [column, values[index] ?? ""]))
  );
}

function write(name, content) {
  const target = path.join(temporary, name);
  fs.writeFileSync(target, content);
  return target;
}

function writeJson(name, value) {
  return write(name, `${JSON.stringify(value, null, 2)}\n`);
}

function pct(value, total) {
  if (!total) return "0";
  return (value / total * 100).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
