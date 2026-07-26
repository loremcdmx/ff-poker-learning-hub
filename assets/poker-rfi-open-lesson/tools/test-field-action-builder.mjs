import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  COIN_PARTY_PUBLICATION_CONTRACT,
  coinPartyGrammarContract,
} from "./coin-party-publication-contract.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const realizer = require(path.resolve(here, "../../poker-kit/simulator/bot-range-realizer.js"));
const observedConfidence = require(path.resolve(here, "../../poker-kit/observed-frequency-confidence.js"));
const confidenceSource = fs.readFileSync(path.resolve(here, "../../poker-kit/observed-frequency-confidence.js"), "utf8");
const stackRuntimeSource = fs.readFileSync(path.resolve(here, "../stack-data.js"), "utf8");
const extractionSql = fs.readFileSync(path.join(here, "q_ff_rfi_field_actions.sql"), "utf8");
const extractionSqlSha256 = sha256(extractionSql);
const recoverySql = fs.readFileSync(path.join(here, "q_ff_rfi_missing_cards_recovery.sql"), "utf8");
const recoverySqlSha256 = sha256(recoverySql);
const rawSql = fs.readFileSync(path.join(here, "q_ff_rfi_raw_hh_field_actions.sql"), "utf8");
const rawSqlSha256 = sha256(rawSql);
const publicationRawSqlSha256 = sha256(fs.readFileSync(
  path.join(here, "q_ff_rfi_raw_hh_field_actions_publication_20260726.sql"),
));
const coinPartySql = fs.readFileSync(
  path.join(here, "q_ff_rfi_coin_party_publication.sql"),
  "utf8",
);
const coinPartySqlSha256 = sha256(coinPartySql);
const coinPartyParserImplementationSha256 = sha256(fs.readFileSync(
  path.join(here, "coin-party-raw-hand-history-parser.mjs"),
));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "ff-rfi-builder-"));

const header = [
  "window_start", "window_end", "table_filter", "table_size", "cohort", "cohort_selected_players",
  "position_group", "position_order", "position_code", "stack_bucket", "stack_order", "hand_class",
  "eligible_opportunities", "known_card_opportunities", "lookup_mismatch_opportunities",
  "first_observed_at", "last_observed_at",
  "opportunities", "raises_total", "regular_raise", "open_shove", "limp", "fold_other",
  "shove_allin_flag", "shove_effective_amount_only", "regular_three_bb_open",
  "normal_three_bb_as_shove", "non_exact_r_effective_allin",
];
const rawStacks = ["70+", "30-70", "20-30", "15-20", "12-15", "10-12", "8-10", "6-8", "<6"];
const publicStacks = ["70+", "30-70", "20-30", "15-20", "<15"];
const positions = [
  ["EP", 1, 4, 105],
  ["MP", 2, 3, 95],
  ["HJ", 3, 2, 85],
  ["CO", 4, 1, 75],
  ["BTN", 5, 0, 65],
  ["SB", 6, 9, 55],
];
const cohorts = ["l3top", "l3", "l2", "l1"];
const rows = [];
for (const cohort of cohorts) {
  for (const [stackIndex, stack] of rawStacks.entries()) {
    for (const [position, order, code, opportunities] of positions) {
      const known = opportunities * 169;
      for (const hand of realizer.HAND_CLASSES.map((item) => item.key)) {
        const regularRaise = Math.floor(opportunities * 0.2);
        const shove = Math.floor(opportunities * 0.3);
        const limp = Math.floor(opportunities * 0.1);
        const fold = opportunities - regularRaise - shove - limp;
        const shoveFlag = Math.floor(shove * 0.8);
        rows.push([
          "2023-09-01", "2026-07-25", "cnt_players = 7", "7", cohort, "100",
          position, String(order), String(code), stack, String(stackIndex + 1), hand,
          String(known + 10), String(known), "2", "2023-09-01 00:00:00", "2026-07-25 23:59:59",
          String(opportunities), String(regularRaise + shove), String(regularRaise), String(shove), String(limp), String(fold),
          String(shoveFlag), String(shove - shoveFlag), String(regularRaise), "0", "1",
        ]);
      }
    }
  }
}

const source = path.join(temporary, "source.csv");
const membership = path.join(temporary, "membership.csv");
const membershipReceipt = path.join(temporary, "membership-receipt.json");
const actionMetadata = path.join(temporary, "action-metadata.json");
const output = path.join(temporary, "field-action-data.js");
const diagnostics = path.join(temporary, "coverage.json");
const sourceText = csv(rows);
const membershipText = [
  "cohort,user_id,current_rank,current_league,ffev_hands,ffev,cohort_selected_players",
  "l3top,4,15,3,100000,20,1",
  "l3,1,11,3,100000,15,4",
  "l3,4,15,3,100000,20,4",
  "l3,5,16,3,100000,10,4",
  "l3,6,17,3,100000,5,4",
  "l2,2,8,2,100000,8,1",
  "l1,3,3,1,100000,4,1",
  "",
].join("\n");
const frozenDedicatedMembership =
  "/private/tmp/ff-rfi-memberships-full-l3-top25-20260726.csv";
const frozenDedicatedMembershipReceipt =
  "/private/tmp/ff-rfi-memberships-full-l3-top25-20260726.receipt.json";
const frozenDedicatedParserTemplate =
  "/private/tmp/ff-rfi-q_ff_rfi_raw_hh_field_actions-frozen-1591cb91-20260726.sql";
const dedicatedEvidenceAvailable = fs.existsSync(frozenDedicatedMembership) &&
  fs.existsSync(frozenDedicatedMembershipReceipt) &&
  fs.existsSync(frozenDedicatedParserTemplate);
const dedicatedParserTemplateSha256 = dedicatedEvidenceAvailable
  ? sha256(fs.readFileSync(frozenDedicatedParserTemplate))
  : null;
const dedicatedParserBindingReady = dedicatedEvidenceAvailable &&
  dedicatedParserTemplateSha256 ===
    COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding
      .parserTemplateSha256 &&
  COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding
    .parserImplementationSha256 === coinPartyParserImplementationSha256 &&
  COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding
    .grammarSha256 === coinPartyGrammarContract().sha256;
const dedicatedMembership = frozenDedicatedMembership;
const dedicatedMembershipReceipt = frozenDedicatedMembershipReceipt;
const dedicatedMembershipText = dedicatedEvidenceAvailable
  ? fs.readFileSync(dedicatedMembership, "utf8")
  : "";
fs.writeFileSync(source, sourceText);
fs.writeFileSync(membership, membershipText);
fs.writeFileSync(membershipReceipt, JSON.stringify({
  status: "succeeded",
  job_id: "mcp_bq_job_deadbeef02",
  row_count: 7,
  byte_size: Buffer.byteLength(membershipText),
  finished_at: "2026-07-22T00:00:00Z",
}));
writeActionMetadata(actionMetadata, sourceText, rows);

try {
  execFileSync(process.execPath, [
    path.join(here, "build-field-action-data.mjs"),
    `--source=${source}`,
    `--membership=${membership}`,
    `--membership-receipt=${membershipReceipt}`,
    `--action-metadata=${actionMetadata}`,
    `--out=${output}`,
    `--diagnostics=${diagnostics}`,
  ], { stdio: "pipe" });

  const { field: F, stack: S } = loadPublication(output);
  assert.equal(F.schema, "ff-rfi-field-actions-v3");
  assert.match(F.version, /^rfi-field-actions-exact7-[a-f0-9]{12}$/);
  assert.equal(F.methodology.table, "7-max");
  assert.equal(F.methodology.exactCellMinimum, observedConfidence.MIN_EXACT_DENOMINATOR);
  assert.deepEqual(Array.from(F.stackOrder), publicStacks);
  assert.deepEqual(Array.from(F.positions), positions.map(([position]) => position));
  assert.equal(F.recommendations.smoothing, null);
  assert.deepEqual(Object.keys(F.recommendations.charts), []);
  assert.equal(F.methodology.sourceSnapshot.extractionSqlSha256, extractionSqlSha256);
  assert.equal(F.methodology.sourceSnapshot.membershipSha256, sha256(membershipText));
  assert.equal(F.methodology.sourceSnapshot.membershipReceipt.rowCount, 7);
  assert.equal(F.methodology.top25.eligiblePlayers, 4);
  assert.equal(F.methodology.top25.selectedPlayers, 1);
  assert.equal(F.methodology.top25.ranks, "текущая Лига 3");
  assert.match(extractionSql, /FROM eligible\s+WHERE current_league = 3/);
  assert.doesNotMatch(extractionSql, /current_rank BETWEEN 11 AND 14/);
  assert.equal(F.methodology.sourceSnapshot.knownCards.known, rows.reduce((sum, row) => sum + Number(row[17]), 0));
  assert.ok(F.methodology.sourceSnapshot.knownCards.pct > 99);
  for (const cohort of cohorts) {
    const ladder = positions.map(([position]) => F.methodology.sourceSnapshot.positionOpportunities[cohort][position]);
    for (let index = 1; index < ladder.length; index += 1) assert.ok(ladder[index - 1] > ladder[index]);
    for (const stack of publicStacks) {
      for (const [position] of positions) {
        const chart = S.fieldChart(cohort, stack, position);
        assert.ok(chart);
        assert.equal(chart.completeCells, 169);
        assert.ok(chart.minimumCellOpportunities >= 55);
      }
    }
  }
  assert.deepEqual({ ready: S.publication.ready, reason: S.publication.reason }, { ready: true, reason: "" });

  const report = JSON.parse(fs.readFileSync(diagnostics, "utf8"));
  assert.equal(report.status, "ready");
  assert.equal(report.table, "7-max");
  assert.equal(report.completeStates, publicStacks.length * positions.length);
  assert.equal(report.passingStates, publicStacks.length * positions.length);
  assert.deepEqual(report.failingStates, []);
  for (const state of report.coverage) {
    assert.equal(state.passesGate, true);
    for (const cohort of cohorts) {
      assert.deepEqual(state.cohorts[cohort], {
        rows: 169,
        complete: 169,
        minN: state.cohorts[cohort].minN,
        missing: 0,
      });
    }
  }
  assert.equal(report.extractionSqlSha256, extractionSqlSha256);
  assert.equal(JSON.stringify(report.knownCards), JSON.stringify(F.methodology.sourceSnapshot.knownCards));
  assert.deepEqual(report.actionCountReconciliation.source, report.actionCountReconciliation.aggregated);

  const currentSupplementKinds = dedicatedParserBindingReady
    ? ["direct", "dedicated", "dedicated-coin", "composed"]
    : ["direct", "composed"];
  for (const kind of currentSupplementKinds) {
    const currentBuild = runCurrentSupplementBuild(kind);
    const publication = loadPublication(currentBuild.output);
    assert.deepEqual(
      {
        ready: publication.stack.publication.ready,
        reason: publication.stack.publication.reason,
      },
      { ready: true, reason: "" },
      `${kind} current supplement builder/runtime contract`,
    );
    assert.equal(
      publication.field.methodology.sourceSnapshot.currentSupplement
        .supplementSource.schema,
      kind === "composed"
        ? "ff-rfi-field-action-novel-raw-supplement-composition-v1"
        : "ff-rfi-field-action-novel-raw-supplement-merge-v1",
    );
    assert.equal(
      publication.field.methodology.period.toExclusive,
      "2026-07-26",
      "current supplement publication window must be closed",
    );
    const snapshot = publication.field.methodology.sourceSnapshot;
    const current = snapshot.currentSupplement;
    assert.deepEqual(
      plain(snapshot.actionShards),
      plain([
        ...current.baseCurrent.sourceMerges.structured.inputs,
        ...current.baseCurrent.sourceMerges.recovery.inputs,
        ...current.supplementSource.inputs,
      ]),
      "public action shards must equal the nested safe execution projections",
    );
    assert.doesNotMatch(
      JSON.stringify(snapshot.actionShards),
      /sourceTable|firstUserId|lastUserId|\/private\/tmp|\/Users\//,
      "current supplement publication leaked private or legacy execution metadata",
    );
  }
  if (dedicatedEvidenceAvailable && !dedicatedParserBindingReady) {
    for (const kind of ["dedicated", "dedicated-coin"]) {
      const currentBuild = runCurrentSupplementBuild(kind);
      assert.equal(currentBuild.run.status, 0, currentBuild.run.stderr || currentBuild.run.stdout);
      const publication = loadPublication(currentBuild.output);
      assert.deepEqual(
        {
          ready: publication.stack.publication.ready,
          reason: publication.stack.publication.reason,
        },
        { ready: false, reason: "current-supplement-provenance" },
        `${kind} must fail closed while private parser validation is stale`,
      );
    }
  }
  assertCurrentSupplementBuildFails("direct", (metadata) => {
    metadata.supplementSource.inputs[0].user_id = 42;
    metadata.inputs.at(-1).user_id = 42;
  }, /safe execution projection keys drift/i);
  assertCurrentSupplementBuildFails("direct", (metadata) => {
    metadata.supplementSource.inputs[0].finishedAt = "2026-07-25T23:59:59.000Z";
    metadata.inputs.at(-1).finishedAt = "2026-07-25T23:59:59.000Z";
  }, /closed-window as-of receipt/i);
  assertCurrentSupplementBuildFails("composed", (metadata) => {
    metadata.supplementSource.plan.componentManifestSha256.pop();
  }, /component provenance is incomplete/i);
  assertCurrentSupplementBuildFails("direct", (metadata) => {
    metadata.supplement.preserved.l2.counters.fold_other += 1;
  }, /base preserved l2 counter partitions do not reconcile exactly/i);
  assertCurrentSupplementBuildFails("direct", (metadata) => {
    metadata.baseCurrent.sourceMerges.structured.inputs[0].sourceTable =
      "analytics.int_tracker_hand_joined";
  }, /safe structured-field-action execution projection keys drift/i);
  assertCurrentSupplementBuildFails("direct", (metadata) => {
    metadata.baseCurrent.sourceMerges.recovery.inputs[0].finishedAt =
      "2026-07-25T23:59:59Z";
  }, /execution receipt is stale or inconsistent/i);
  assertCurrentSupplementBuildFails("direct", (metadata) => {
    metadata.inputs[0] = {
      ...metadata.inputs[0],
      resultSha256: "0".repeat(64),
    };
  }, /flattened nested execution provenance drift/i);
  assertCurrentSupplementBuildFails("composed", (metadata) => {
    metadata.baseCurrent.sourceMerges.recovery.inputs[0]
      .validation.receiptPath = "/private/tmp/recovery.json";
  }, /safe recovery validation keys drift/i);
  assertCurrentSupplementBuildFails("direct", (metadata) => {
    metadata.supplementSource.parserValidation.binding.planSha256 =
      "0".repeat(64);
  }, /parser binding is stale/i);
  assertCurrentSupplementBuildFails("direct", (metadata) => {
    delete metadata.supplementSource.plan.immutableReceiptSha256;
  }, /direct novel supplement plan keys drift/i);
  if (dedicatedParserBindingReady) {
    assertCurrentSupplementBuildFails("dedicated", (metadata) => {
      metadata.supplementSource.inputs[0].templateSha256 = rawSqlSha256;
      metadata.inputs[2].templateSha256 = rawSqlSha256;
    }, /stale extraction SQL template/i);
    assertCurrentSupplementBuildFails("dedicated", (metadata) => {
      delete metadata.supplementSource.parserValidation.source.inputBytes;
    }, /dedicated Coin\/Party parser source keys drift/i);
  }

  const missingWindowRun = spawnSync(process.execPath, [
    path.join(here, "render-field-action-query.mjs"),
    membership,
  ], { encoding: "utf8" });
  assert.notEqual(missingWindowRun.status, 0);
  assert.match(missingWindowRun.stderr, /Both --from and --to are required/);

  const exactQuery = execFileSync(process.execPath, [
    path.join(here, "render-field-action-query.mjs"),
    membership,
    "--from=2023-09-01",
    "--to=2026-07-26",
  ], { encoding: "utf8" });
  assert.match(exactQuery, /h\.cnt_players = 7/);
  assert.match(exactQuery, /WHERE x\.3 = 7/);
  assert.match(exactQuery, /pos = 4, 'EP'/);
  assert.match(exactQuery, /pos = 3, 'MP'/);
  assert.doesNotMatch(exactQuery, /BETWEEN 7 AND 9|pos IN \(5, 6, 7\)/);
  assert.match(exactQuery, /eligible_opportunities/);
  assert.match(exactQuery, /known_card_opportunities/);

  const belowRows = rows.map((row) => row.slice());
  const below = belowRows.find((row) => row[4] === "l1" && row[6] === "EP" && row[9] === "70+" && row[11] === "AA");
  below[17] = "49";
  below[18] = "24";
  below[19] = "10";
  below[20] = "14";
  below[21] = "5";
  below[22] = "20";
  below[23] = "11";
  below[24] = "3";
  for (const row of belowRows.filter((row) => row[4] === "l1" && row[6] === "EP" && row[9] === "70+")) {
    row[13] = String(Number(row[13]) - 56);
  }
  assertBuildFails(belowRows, /Refusing partial RFI publication: 70\+\|EP/);

  const wrongTableRows = rows.map((row) => row.slice());
  wrongTableRows[0][3] = "8";
  assertBuildFails(wrongTableRows, /not exact 7-max/);

  const wrongPositionRows = rows.map((row) => row.slice());
  wrongPositionRows[0][8] = "5";
  assertBuildFails(wrongPositionRows, /Invalid exact 7-max position mapping/);

  const noMetadata = spawnSync(process.execPath, [
    path.join(here, "build-field-action-data.mjs"),
    `--source=${source}`,
    `--membership=${membership}`,
    `--membership-receipt=${membershipReceipt}`,
    `--out=${path.join(temporary, "no-metadata.js")}`,
  ], { encoding: "utf8" });
  assert.notEqual(noMetadata.status, 0);
  assert.match(noMetadata.stderr, /requires --action-metadata/);

  const duplicateMembership = path.join(temporary, "duplicate-membership.csv");
  fs.writeFileSync(duplicateMembership, `${membershipText.trim()}\nl1,3,3,1,100000,4,1\n`);
  const duplicateReceipt = path.join(temporary, "duplicate-membership-receipt.json");
  fs.writeFileSync(duplicateReceipt, JSON.stringify({ status: "succeeded", job_id: "mcp_bq_job_deadbeef03", row_count: 8 }));
  const duplicateRun = spawnSync(process.execPath, [
    path.join(here, "render-field-action-query.mjs"),
    duplicateMembership,
    "--from=2023-09-01",
    "--to=2026-07-26",
  ], { encoding: "utf8" });
  assert.notEqual(duplicateRun.status, 0);
  assert.match(duplicateRun.stderr, /Duplicate cohort\/user membership key/);

  console.log("RFI field-action builder gate: ok");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

function csv(sourceRows) {
  return `${header.join(",")}\n${sourceRows.map((row) => row.join(",")).join("\n")}\n`;
}

function sourceKnownCards(sourceRows) {
  const states = new Map();
  for (const row of sourceRows) {
    const key = [row[4], row[9], row[6]].join("|");
    states.set(key, {
      eligible: Number(row[12]),
      known: Number(row[13]),
      lookupMismatch: Number(row[14]),
    });
  }
  const totals = [...states.values()].reduce((result, state) => ({
    eligible: result.eligible + state.eligible,
    known: result.known + state.known,
    lookupMismatch: result.lookupMismatch + state.lookupMismatch,
  }), { eligible: 0, known: 0, lookupMismatch: 0 });
  return { ...totals, pct: Number((totals.known / totals.eligible * 100).toFixed(6)) };
}

function runCurrentSupplementBuild(kind, mutate = null) {
  const dedicated = kind.startsWith("dedicated");
  const selectedMembership = dedicated
    ? dedicatedMembership
    : membership;
  const selectedMembershipReceipt = dedicated
    ? dedicatedMembershipReceipt
    : membershipReceipt;
  const selectedMembershipText = dedicated
    ? dedicatedMembershipText
    : membershipText;
  const metadata = currentSupplementMetadata(kind, selectedMembershipText);
  if (mutate) mutate(metadata);
  const metadataPath = path.join(
    temporary,
    `current-supplement-${kind}-${crypto.randomUUID()}.json`,
  );
  const currentOutput = path.join(
    temporary,
    `current-supplement-${kind}-${crypto.randomUUID()}.js`,
  );
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  const run = spawnSync(process.execPath, [
    path.join(here, "build-field-action-data.mjs"),
    `--source=${source}`,
    `--membership=${selectedMembership}`,
    `--membership-receipt=${selectedMembershipReceipt}`,
    `--action-metadata=${metadataPath}`,
    `--out=${currentOutput}`,
  ], { encoding: "utf8" });
  return { run, output: currentOutput, metadataPath };
}

function assertCurrentSupplementBuildFails(kind, mutate, pattern) {
  const result = runCurrentSupplementBuild(kind, mutate);
  assert.notEqual(result.run.status, 0, `${kind} current supplement mutation passed`);
  assert.match(result.run.stderr, pattern);
}

function currentSupplementMetadata(kind, currentMembershipText = membershipText) {
  const dedicated = kind.startsWith("dedicated");
  const fixtureMembership = currentMembershipText.trim().split("\n")
    .slice(1)
    .map((line) => {
      const [cohort, userId] = line.split(",");
      return { cohort, userId: Number(userId) };
    });
  const membershipSha256 = sha256(currentMembershipText);
  const membershipKeysSha256 = sha256(fixtureMembership
    .map((row) => `${row.cohort}|${row.userId}`)
    .sort()
    .join("\n"));
  const cohortCounts = Object.fromEntries(cohorts.map((cohort) => [
    cohort,
    fixtureMembership.filter((row) => row.cohort === cohort).length,
  ]));
  const window = {
    startInclusive: "2023-09-01T00:00:00Z",
    endExclusive: "2026-07-26T00:00:00Z",
    semantics: "half-open-utc",
  };
  const structured = builderStructuredInput(membershipSha256, membershipKeysSha256);
  const recovery = builderRecoveryInput(membershipSha256, membershipKeysSha256);
  const baseTotals = exactCounters(80);
  const recoveryTotals = exactCounters(10);
  const sourceTotalsByCohort = Object.fromEntries(cohorts.map((cohort) => [
    cohort,
    sourceExactCounters(rows.filter((row) => row[4] === cohort)),
  ]));
  const baseReplacement = {
    l3top: {
      structuredRows: 9126,
      structuredProjectionSha256: "1".repeat(64),
      recoveryRows: 9126,
      recoveryProjectionSha256: "2".repeat(64),
      finalProjectionSha256: "2".repeat(64),
      recoveryDominatesExactly: true,
    },
    l3Delta: {
      exactCells: 9126,
      stateCount: 54,
      counters: exactCounters(10),
      knownCardDelta: 10,
      nonnegativePerCell: true,
      appliedExactly: true,
      eligibleCoverageChanged: false,
    },
    preserved: Object.fromEntries(["l2", "l1"].map((cohort, index) => [
      cohort,
      {
        rows: 9126,
        sourceProjectionSha256: String(index + 3).repeat(64),
        finalProjectionSha256: String(index + 3).repeat(64),
        counters: sourceTotalsByCohort[cohort],
        exact: true,
      },
    ])),
  };
  const structuredMerge = builderSourceMerge({
    input: structured,
    sourceKind: "structured-field-action",
    rows: 36504,
    totals: baseTotals,
    hashCharacter: "5",
    window,
  });
  const recoveryMerge = builderSourceMerge({
    input: recovery,
    sourceKind: "missing-card-recovery-full-cube",
    rows: 9126,
    totals: recoveryTotals,
    hashCharacter: "6",
    window,
  });
  const parserHash = "7".repeat(64);
  const componentParserHashes = ["8".repeat(64), "9".repeat(64)];
  const novelInputs = kind === "direct"
    ? [builderNovelInput({
      network: "PokerStars",
      sourceKind: "immutable-plan-raw-hh-v5",
      jobCharacter: "c",
      resultRows: 1,
      parserValidationSha256: parserHash,
    })]
    : dedicated
      ? (kind === "dedicated-coin"
        ? ["CoinPoker"]
        : ["CoinPoker", "PartyPoker"]).flatMap((network, networkIndex) =>
        Array.from({ length: 4 }, (_, shardIndex) => builderNovelInput({
          network,
          sourceKind: "coin-party-publication-v2",
          jobCharacter: ["a", "b", "c", "d", "e", "f", "3", "4"][
            networkIndex * 4 + shardIndex
          ],
          resultRows: 1,
          parserValidationSha256: parserHash,
          parserTemplateSha256: dedicatedParserTemplateSha256,
          userShardIndex: shardIndex,
          userShardCount: 4,
          userShardUsers: cohortCounts.l3top / 4,
          publicationGate: dedicatedPublicationGate(network, shardIndex),
        })))
      : [
      builderNovelInput({
        network: "CoinPoker",
        sourceKind: "coin-party-publication-v2",
        jobCharacter: "c",
        resultRows: 1,
        parserValidationSha256: componentParserHashes[0],
      }),
      builderNovelInput({
        network: "PokerStars",
        sourceKind: "immutable-plan-raw-hh-v5",
        jobCharacter: "d",
        resultRows: 0,
        parserValidationSha256: componentParserHashes[1],
      }),
    ];
  const networks = [...new Set(novelInputs.map((input) => input.network))];
  const plan = kind === "direct"
    ? {
      schema: "ff-rfi-publication-eligible-full-v5-run-plan",
      sha256: "a".repeat(64),
      immutableReceiptSha256: "f".repeat(64),
      sourceSetComplete: true,
      networks,
      userShardsPerNetwork: 1,
      expectedExecutions: novelInputs.length,
      exactDisjointUserUnion: true,
      targetFilter: false,
    }
    : dedicated
      ? {
        schema: "ff-rfi-coin-party-publication-run-plan-v2",
        sha256: "a".repeat(64),
        sourceSetComplete: true,
        networks,
        userShardsPerNetwork: 4,
        expectedExecutions: novelInputs.length,
        exactDisjointUserUnion: true,
        targetFilter: false,
      }
      : {
      schema: "ff-rfi-field-action-novel-raw-supplement-composition-plan-v1",
      sourceSetComplete: true,
      networks,
      userShardsPerNetwork: null,
      expectedExecutions: novelInputs.length,
      exactDisjointUserUnion: true,
      disjointNetworkSets: true,
      targetFilter: false,
      componentManifestSha256: ["b".repeat(64), "c".repeat(64)],
    };
  const parserValidation = kind === "direct"
    ? {
      schema: "ff-rfi-raw-hh-parser-validation-v2",
      sha256: parserHash,
      gatePassed: true,
      networks,
      exactMismatchTolerance: 0,
      validatedAt: "2026-07-26T00:30:00Z",
      binding: {
        planSha256: "a".repeat(64),
        parserTemplateSha256: "7".repeat(64),
        parserBodySha256: "e".repeat(64),
        membershipSha256,
        membershipKeysSha256,
        selectedUserIdsSha256: "f".repeat(64),
        window,
      },
    }
    : dedicated
      ? {
        schema: "ff-rfi-coin-party-parser-validation-v2",
        sha256: parserHash,
        gatePassed: true,
        networks,
        exactMismatchTolerance: 0,
        validatedAt: "2026-07-26T00:30:00Z",
        binding: {
          parserTemplateSha256: dedicatedParserTemplateSha256,
          parserImplementationSha256: coinPartyParserImplementationSha256,
          grammarSha256: coinPartyGrammarContract().sha256,
          membershipSha256,
          userIdsSha256:
            COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
          window: [
            ...COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.window,
          ],
        },
        source: {
          ...COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.source,
          rawHandHistoriesPublished: false,
          personalIdentifiersPublished: false,
        },
      }
      : {
      schema: "ff-rfi-field-action-novel-raw-parser-validation-composition-v1",
      sha256: "d".repeat(64),
      gatePassed: true,
      networks,
      exactMismatchTolerance: 0,
      componentSha256: componentParserHashes,
    };
  const supplementCounters = exactCounters(1, true);
  const sourceTextValue = sourceText;
  return {
    schema: "ff-rfi-field-action-current-supplement-v1",
    strategy: "exact-same-window-novel-raw-l3top-supplement-with-l3-delta",
    supplementedCohort: "l3top",
    deltaAppliedCohort: "l3",
    window,
    membership: {
      sha256: membershipSha256,
      keysSha256: membershipKeysSha256,
      rows: fixtureMembership.length,
      cohortCounts,
      subsetProof: {
        l3topMembers: cohortCounts.l3top,
        l3Members: cohortCounts.l3,
        l3topIsSubsetOfL3: true,
      },
    },
    baseCurrent: {
      schema: "ff-rfi-field-action-cohort-replacement-v1",
      strategy: "exact-same-window-l3top-replacement-with-l3-delta",
      manifestSha256: "e".repeat(64),
      aggregate: {
        sha256: "f".repeat(64),
        bytes: 20000,
        rows: 36504,
      },
      sourceMerges: {
        structured: structuredMerge,
        recovery: recoveryMerge,
      },
      replacement: baseReplacement,
    },
    supplementSource: {
      schema: kind === "composed"
        ? "ff-rfi-field-action-novel-raw-supplement-composition-v1"
        : "ff-rfi-field-action-novel-raw-supplement-merge-v1",
      sourceKind: "publication-safe-novel-raw-hh-l3top",
      strategy: kind === "composed"
        ? "disjoint-approved-source-set-supplement-union-v1"
        : "approved-plan-source-union-with-observed-zero-dimension-completion",
      manifestSha256: "1".repeat(64),
      aggregate: {
        sha256: "2".repeat(64),
        bytes: 1000,
        rows: 9126,
      },
      plan,
      parserValidation,
      inputs: novelInputs,
      densification: {
        observedInputRows: novelInputs.reduce((sum, input) => sum + input.resultRows, 0),
        observedInputCells: novelInputs.reduce((sum, input) => sum + input.observedCells, 0),
        canonicalOutputCells: 9126,
        absentDimensionsMaterializedAsObservedZero: true,
        smoothingApplied: false,
        modeledValuesApplied: false,
      },
    },
    inputs: [structured, recovery, ...novelInputs],
    supplement: {
      l3topAdditive: builderSupplementProof(supplementCounters, false),
      l3Delta: builderSupplementProof(supplementCounters, true),
      preserved: Object.fromEntries(["l2", "l1"].map((cohort, index) => [
        cohort,
        {
          rows: 9126,
          sourceProjectionSha256: String(index + 3).repeat(64),
          finalProjectionSha256: String(index + 3).repeat(64),
          counters: sourceTotalsByCohort[cohort],
          exact: true,
        },
      ])),
    },
    merged: {
      file: "final.csv",
      rows: rows.length,
      sha256: sha256(sourceTextValue),
      bytes: Buffer.byteLength(sourceTextValue),
      windowStartInclusive: window.startInclusive,
      windowEndExclusive: window.endExclusive,
      knownCards: sourceKnownCards(rows),
      totals: sourceExactCounters(rows),
      cube: {
        stateCount: 216,
        rowCount: rows.length,
        handClassesPerState: 169,
        coverageReconciled: true,
      },
    },
    privacy: {
      aggregateOnly: true,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
  };
}

function builderStructuredInput(membershipSha256, membershipKeysSha256) {
  return {
    sourceKind: "structured-field-action",
    queryJobId: `mcp_ch_job_${"1".repeat(32)}`,
    executionMode: "async",
    startedAt: "2026-07-26T00:01:00Z",
    finishedAt: "2026-07-26T00:02:00Z",
    rendererMetadataSha256: "1".repeat(64),
    receiptSha256: "2".repeat(64),
    querySha256: "3".repeat(64),
    resultSha256: "4".repeat(64),
    resultRows: 36504,
    resultBytes: 1000,
    templateSha256: extractionSqlSha256,
    windowStartInclusive: "2023-09-01T00:00:00Z",
    windowEndExclusive: "2026-07-26T00:00:00Z",
    userShard: {
      index: 0,
      count: 1,
      users: 6,
      userIdsSha256: "5".repeat(64),
    },
    membershipSha256,
    membershipKeysSha256,
    privacy: {
      aggregateOnly: true,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
    handClassMode: "joined-holecards-str",
    holecardMappingSha256: null,
  };
}

function builderRecoveryInput(membershipSha256, membershipKeysSha256) {
  const parserNetworks = [
    "888Poker", "Chico", "GGNetwork", "PokerPlanets", "PokerStars",
    "PokerStars(FR-ES-PT)", "Winamax.fr", "WPN", "iPoker",
  ];
  const networkEvidence = Object.fromEntries(parserNetworks.map((network) => [
    network,
    {
      trackerRows: 10,
      trackerKnownWithRaw: 5,
      rawHhJoined: 8,
      parserSuccess: 7,
      classMatches: 5,
      classFailures: 0,
      matchPctTrackerKnown: 100,
      trackerMissingRecovered: network === "iPoker" ? 1 : 0,
      validationPassed: 1,
    },
  ]));
  return {
    sourceKind: "missing-card-recovery-full-cube",
    queryJobId: `mcp_ch_job_${"2".repeat(32)}`,
    executionMode: "async",
    startedAt: "2026-07-26T00:03:00Z",
    finishedAt: "2026-07-26T00:04:00Z",
    rendererMetadataSha256: "6".repeat(64),
    receiptSha256: "7".repeat(64),
    querySha256: "8".repeat(64),
    resultSha256: "9".repeat(64),
    resultRows: 9126,
    resultBytes: 1000,
    templateSha256: recoverySqlSha256,
    windowStartInclusive: "2023-09-01T00:00:00Z",
    windowEndExclusive: "2026-07-26T00:00:00Z",
    userShard: {
      index: 0,
      count: 1,
      users: 1,
      userIdsSha256: "c".repeat(64),
    },
    membershipSha256,
    membershipKeysSha256,
    privacy: {
      aggregateOnly: true,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
    parserGrammarsSha256: "a".repeat(64),
    parserNetworks,
    recoveryIsDisjoint: true,
    recoveryPredicate: "latest structured_hand_class = ''",
    rawJoin: {
      type: "exact-key",
      trackerKey: ["toUInt64(user_id)", "toString(network)", "toString(hh_id)"],
      rawKey: ["toUInt64(check_user_id)", "toString(network)", "toString(converted_hh_id)"],
    },
    validation: {
      schema: "ff-rfi-missing-card-recovery-validation-v1",
      manifestSha256: "d".repeat(64),
      queryJobId: `sync:${"e".repeat(64)}`,
      queryExecutionMode: "sync",
      startedAt: "2026-07-26T00:05:00Z",
      finishedAt: "2026-07-26T00:06:00Z",
      rendererMetadataSha256: "f".repeat(64),
      renderedSqlSha256: "e".repeat(64),
      queryTemplateSha256: recoverySqlSha256,
      resultSha256: "1".repeat(64),
      resultRows: 9,
      resultBytes: 99,
      receiptSha256: "2".repeat(64),
      window: {
        startInclusive: "2026-07-01T00:00:00Z",
        endExclusive: "2026-07-02T00:00:00Z",
        semantics: "half-open-utc",
      },
      networks: networkEvidence,
      totals: {
        trackerRows: 90,
        trackerKnownWithRaw: 45,
        rawHhJoined: 72,
        parserSuccess: 63,
        classMatches: 45,
        classFailures: 0,
        trackerMissingRecovered: 1,
      },
      privacy: {
        aggregateOnly: true,
        rawHandHistoriesPublished: false,
        personalIdentifiersPublished: false,
      },
    },
  };
}

function builderSourceMerge({ input, sourceKind, rows: rowCount, totals, hashCharacter, window }) {
  const aggregateSha256 = hashCharacter.repeat(64);
  return {
    schema: "ff-rfi-field-action-merge-v1",
    manifestSha256: String(Number(hashCharacter) + 1).repeat(64),
    shardStrategy: "immutable-user-id",
    ...(sourceKind === "missing-card-recovery-full-cube" ? { sourceKind } : {}),
    inputs: [input],
    aggregate: {
      sha256: aggregateSha256,
      bytes: rowCount * 2,
      rows: rowCount,
    },
    merged: {
      rows: rowCount,
      sha256: aggregateSha256,
      windowStartInclusive: window.startInclusive,
      windowEndExclusive: window.endExclusive,
      knownCards: {
        eligible: totals.opportunities,
        known: totals.opportunities,
        lookupMismatch: 0,
        pct: 100,
      },
      totals,
      ...(sourceKind === "missing-card-recovery-full-cube"
        ? {
          cube: {
            stateCount: 54,
            rowCount: 9126,
            handClassesPerState: 169,
            coverageReconciled: true,
          },
        }
        : {}),
    },
  };
}

function builderNovelInput({
  network,
  sourceKind,
  jobCharacter,
  resultRows,
  parserValidationSha256,
  parserTemplateSha256 = "7".repeat(64),
  userShardIndex = 0,
  userShardCount = 1,
  userShardUsers = 1,
  publicationGate = null,
}) {
  return {
    sourceKind,
    network,
    userShard: {
      index: userShardIndex,
      count: userShardCount,
      users: userShardUsers,
      userIdsSha256: jobCharacter.repeat(64),
    },
    queryJobId: `mcp_ch_job_${jobCharacter.repeat(32)}`,
    executionMode: "async",
    startedAt: "2026-07-26T00:10:00.000Z",
    finishedAt: "2026-07-26T00:20:00.000Z",
    rendererMetadataSha256: "3".repeat(64),
    receiptSha256: "4".repeat(64),
    querySha256: "5".repeat(64),
    resultSha256: "6".repeat(64),
    resultRows,
    resultBytes: resultRows ? 100 : 1,
    observedStates: resultRows,
    observedCells: resultRows,
    templateSha256: sourceKind === "coin-party-publication-v2"
      ? coinPartySqlSha256
      : publicationRawSqlSha256,
    parserTemplateSha256,
    parserValidationSha256,
    publicationGate: publicationGate || {
      raw_keys: resultRows,
      exact_id_match_keys: 0,
      nominal_novel_keys: resultRows,
      normalized_time_eligible_keys: resultRows,
      publication_eligible_keys: resultRows,
    },
    windowStartInclusive: "2023-09-01T00:00:00Z",
    windowEndExclusive: "2026-07-26T00:00:00Z",
    privacy: {
      aggregateOnly: true,
      noRawHandHistories: true,
      noPlayerLevelRows: true,
      noUserIds: true,
    },
  };
}

function dedicatedPublicationGate(network, shardIndex) {
  const totals =
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.strongGateTotals[network];
  const split = (value) => (
    Math.floor(value / 4) + (shardIndex < value % 4 ? 1 : 0)
  );
  const raw = split(totals.rawKeys);
  const nominal = split(totals.nominalNovelKeys);
  return {
    raw_keys: raw,
    exact_id_match_keys: raw - nominal,
    nominal_novel_keys: nominal,
    normalized_time_eligible_keys: split(totals.normalizedTimeEligibleKeys),
    publication_eligible_keys: split(totals.publicationEligibleKeys),
  };
}

function builderSupplementProof(counters, cloneParent) {
  return {
    exactCells: 9126,
    stateCount: 54,
    counters,
    eligibleDelta: counters.opportunities,
    knownCardDelta: counters.opportunities,
    opportunitiesDelta: counters.opportunities,
    lookupMismatchDelta: 0,
    deltaProjectionSha256: "8".repeat(64),
    ...(cloneParent ? { cloneEqualsL3top: true } : {}),
    nonnegativePerCell: true,
    appliedExactly: true,
  };
}

function sourceExactCounters(sourceRows) {
  return sourceRows.reduce((totals, row) => {
    for (const [index, counter] of [
      [17, "opportunities"],
      [18, "raises_total"],
      [19, "regular_raise"],
      [20, "open_shove"],
      [21, "limp"],
      [22, "fold_other"],
      [23, "shove_allin_flag"],
      [24, "shove_effective_amount_only"],
      [25, "regular_three_bb_open"],
      [26, "normal_three_bb_as_shove"],
      [27, "non_exact_r_effective_allin"],
    ]) totals[counter] += Number(row[index]);
    return totals;
  }, exactCounters(0));
}

function exactCounters(opportunities, foldOnly = false) {
  if (foldOnly) {
    return {
      opportunities,
      raises_total: 0,
      regular_raise: 0,
      open_shove: 0,
      limp: 0,
      fold_other: opportunities,
      shove_allin_flag: 0,
      shove_effective_amount_only: 0,
      regular_three_bb_open: 0,
      normal_three_bb_as_shove: 0,
      non_exact_r_effective_allin: 0,
    };
  }
  const raises = Math.floor(opportunities / 5);
  const shove = Math.floor(raises / 2);
  const regular = raises - shove;
  const limp = Math.floor(opportunities / 10);
  return {
    opportunities,
    raises_total: raises,
    regular_raise: regular,
    open_shove: shove,
    limp,
    fold_other: opportunities - raises - limp,
    shove_allin_flag: shove,
    shove_effective_amount_only: 0,
    regular_three_bb_open: regular,
    normal_three_bb_as_shove: 0,
    non_exact_r_effective_allin: 0,
  };
}

function writeActionMetadata(target, text, sourceRows) {
  const membershipSha256 = sha256(membershipText);
  fs.writeFileSync(target, `${JSON.stringify({
    schema: "ff-rfi-field-action-merge-v1",
    shardStrategy: "immutable-user-id",
    inputs: [{
      queryJobId: "mcp_ch_job_deadbeef01",
      executionMode: "async",
      windowStartInclusive: "2023-09-01T00:00:00Z",
      windowEndInclusive: "2026-07-25T23:59:59.999Z",
      rows: sourceRows.length,
      sha256: sha256(text),
      querySha256: "b".repeat(64),
      templateSha256: extractionSqlSha256,
      sourceTable: "analytics.int_tracker_hand_joined",
      handClassMode: "joined-holecards-str",
      holecardMappingSha256: null,
      shardUsers: 6,
      sourceUniqueUsers: 6,
      membershipSha256,
      membershipKeysSha256: "e".repeat(64),
      userShard: { index: 0, count: 1, firstUserId: 1, lastUserId: 6, userIdsSha256: "f".repeat(64) },
    }],
    merged: {
      sha256: sha256(text),
      windowStartInclusive: "2023-09-01T00:00:00Z",
      windowEndExclusive: "2026-07-26T00:00:00Z",
      knownCards: sourceKnownCards(sourceRows),
    },
  }, null, 2)}\n`);
}

function assertBuildFails(sourceRows, pattern) {
  const candidate = path.join(temporary, `candidate-${crypto.randomUUID()}.csv`);
  const metadata = path.join(temporary, `candidate-${crypto.randomUUID()}.json`);
  const text = csv(sourceRows);
  fs.writeFileSync(candidate, text);
  writeActionMetadata(metadata, text, sourceRows);
  const run = spawnSync(process.execPath, [
    path.join(here, "build-field-action-data.mjs"),
    `--source=${candidate}`,
    `--membership=${membership}`,
    `--membership-receipt=${membershipReceipt}`,
    `--action-metadata=${metadata}`,
    `--out=${path.join(temporary, `failed-${crypto.randomUUID()}.js`)}`,
  ], { encoding: "utf8" });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, pattern);
}

function loadPublication(dataPath) {
  const context = { window: { atob } };
  vm.runInNewContext(confidenceSource, context);
  vm.runInNewContext(fs.readFileSync(dataPath, "utf8"), context);
  vm.runInNewContext(stackRuntimeSource, context);
  return {
    field: context.window.PokerRfiFieldActionData,
    stack: context.window.PokerRfiStackData,
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}
