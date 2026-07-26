#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  COIN_PARTY_PUBLICATION_CONTRACT,
  coinPartyGrammarContract,
  validateCoinPartyGateTotals,
  validateFrozenCoinPartyGateTotals,
} from "./coin-party-publication-contract.mjs";
import {
  normalizeCoinPartyHandHistory,
  parseCoinPartyRfiHand,
} from "./coin-party-raw-hand-history-parser.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const renderer = path.join(here, "render-coin-party-publication-query.mjs");
const merger = path.join(here, "merge-coin-party-publication-shards.mjs");
const parserTemplateBuffer = fs.readFileSync(
  path.join(here, "q_ff_rfi_raw_hh_field_actions.sql"),
);
const parserImplementationBuffer = fs.readFileSync(
  path.join(here, "coin-party-raw-hand-history-parser.mjs"),
);
const publicationTemplate = fs.readFileSync(
  path.join(here, "q_ff_rfi_coin_party_publication.sql"),
  "utf8",
);
const temporary = fs.mkdtempSync("/private/tmp/ff-rfi-coin-party-source-test-");
const frozenMembershipPath =
  "/private/tmp/ff-rfi-memberships-full-l3-top25-20260726.csv";
const frozenParserTemplatePath =
  "/private/tmp/ff-rfi-q_ff_rfi_raw_hh_field_actions-frozen-1591cb91-20260726.sql";
const frozenParserTemplateBuffer = fs.existsSync(frozenParserTemplatePath)
  ? fs.readFileSync(frozenParserTemplatePath)
  : null;

const standardColumns = [
  "window_start", "window_end", "table_filter", "table_size", "cohort",
  "cohort_selected_players", "position_group", "position_order", "position_code",
  "stack_bucket", "stack_order", "hand_class", "eligible_opportunities",
  "known_card_opportunities", "lookup_mismatch_opportunities", "first_observed_at",
  "last_observed_at", "opportunities", "raises_total", "regular_raise", "open_shove",
  "limp", "fold_other", "shove_allin_flag", "shove_effective_amount_only",
  "regular_three_bb_open", "normal_three_bb_as_shove",
  "non_exact_r_effective_allin", "raise_total_pct", "regular_raise_pct",
  "open_shove_pct", "limp_pct", "fold_pct", "below_exact_minimum", "low_sample",
];
const provenanceColumns = [
  "supplemental_network", "source_user_shard_index", "source_user_shard_count",
  "source_gate_raw_keys", "source_gate_exact_id_match_keys",
  "source_gate_nominal_novel_keys", "source_gate_normalized_time_eligible_keys",
  "source_gate_publication_eligible_keys",
];
const gateResultColumns = [
  "supplemental_network", "source_user_shard_index", "source_user_shard_count",
  "source_gate_raw_keys", "source_gate_exact_id_match_keys",
  "source_gate_nominal_novel_keys", "source_gate_normalized_time_eligible_keys",
  "source_gate_publication_eligible_keys", "tracker_selection_assertion",
  "exact_partition_assertion", "publication_partition_assertion",
];
const inputColumns = [
  ...standardColumns.slice(0, 4),
  ...provenanceColumns,
  ...standardColumns.slice(4),
];
const positions = {
  EP: { order: 1, code: 4 },
  MP: { order: 2, code: 3 },
  HJ: { order: 3, code: 2 },
  CO: { order: 4, code: 1 },
  BTN: { order: 5, code: 0 },
  SB: { order: 6, code: 9 },
};
const stacks = {
  "70+": 1,
  "30-70": 2,
  "20-30": 3,
  "15-20": 4,
  "12-15": 5,
  "10-12": 6,
  "8-10": 7,
  "6-8": 8,
  "<6": 9,
};

try {
  testContract();
  testParserGrammars();
  testRendererRejectsArbitraryMembership();
  if (fs.existsSync(frozenMembershipPath) && parserValidationBindingReady()) {
    testStrictEightShardMerge();
  } else if (fs.existsSync(frozenMembershipPath)) {
    testStaleParserValidationFailsClosed();
    if (frozenParserTemplateBindingReady()) {
      testStrictEightShardMerge({
        parserTemplatePath: frozenParserTemplatePath,
        parserTemplateBuffer: frozenParserTemplateBuffer,
      });
    }
  }
  else console.log("Coin/Party frozen-membership integration fixture unavailable; strict negative renderer test ran");
  console.log("RFI Coin/Party publication source contract: ok");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

function testContract() {
  assert.equal(COIN_PARTY_PUBLICATION_CONTRACT.selectedPlayers, 244);
  assert.equal(COIN_PARTY_PUBLICATION_CONTRACT.userShardsPerNetwork, 4);
  assert.equal(COIN_PARTY_PUBLICATION_CONTRACT.possibleCells, 9126);
  assert.equal(COIN_PARTY_PUBLICATION_CONTRACT.targetFilter, false);
  assert.deepEqual(COIN_PARTY_PUBLICATION_CONTRACT.privacy, {
    aggregateOnly: true,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  });
  assert.deepEqual(COIN_PARTY_PUBLICATION_CONTRACT.publicInputPrivacy, {
    aggregateOnly: true,
    noRawHandHistories: true,
    noPlayerLevelRows: true,
    noUserIds: true,
  });
  assert.match(coinPartyGrammarContract().sha256, /^[a-f0-9]{64}$/);
  for (const network of ["CoinPoker", "PartyPoker"]) {
    const frozen = COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.strongGateTotals[network];
    assert.deepEqual(validateFrozenCoinPartyGateTotals(network, frozen), frozen);
    assert.throws(
      () => validateFrozenCoinPartyGateTotals(network, { ...frozen, rawKeys: frozen.rawKeys + 1 }),
      /partition|drift/,
    );
  }
  assert.throws(
    () => validateCoinPartyGateTotals("CoinPoker", {
      rawKeys: 2,
      exactIdMatchKeys: 0,
      nominalNovelKeys: 1,
      normalizedTimeEligibleKeys: 1,
      publicationEligibleKeys: 1,
    }),
    /exact-id partition/,
  );
  for (const required of [
    "publication_eligible_raw_keys",
    "tracker_selection_drift = 0",
    "raw exact-id partition identity failed",
    "publication eligibility partition failed",
    "raw_canonical_header_index",
    "raw_header_key_count",
    "{{RAW_HEADER_ID_PATTERN}}",
    "{{RAW_HEADER_MATCH_PREDICATE}}",
  ]) assert(publicationTemplate.includes(required), `template missing ${required}`);
  assert.doesNotMatch(publicationTemplate, /\bhand_class\s+IN\s*\(/i);
  assert.doesNotMatch(publicationTemplate, /\btarget_hand\b/i);
}

function testParserGrammars() {
  const coin = parseCoinPartyRfiHand({
    network: "CoinPoker",
    heroNickname: "EP",
    hhText: textFixture({
      network: "CoinPoker",
      hero: "EP",
      action: "raise",
      cards: "As Kd",
      euro: true,
    }),
  });
  assert.equal(coin.ok, true, coin.reason);
  assert.equal(coin.network, "CoinPoker");
  assert.equal(coin.handClass, "AKo");
  assert.equal(coin.positionCode, 4);
  assert.equal(coin.action, "raise");
  assert.equal(coin.effectiveStackBb, 20);

  const party = parseCoinPartyRfiHand({
    network: "PartyPoker",
    heroNickname: "CO",
    hhText: textFixture({
      network: "PartyPoker",
      hero: "CO",
      action: "amountShove",
      cards: "Qs, Kd",
      euro: true,
      parenthesizedForced: true,
    }),
  });
  assert.equal(party.ok, true, party.reason);
  assert.equal(party.network, "PartyPoker");
  assert.equal(party.handClass, "KQo");
  assert.equal(party.positionCode, 1);
  assert.equal(party.action, "shove");

  const regularThreeBb = parseCoinPartyRfiHand({
    network: "PartyPoker",
    heroNickname: "SB",
    hhText: textFixture({
      network: "PartyPoker",
      hero: "SB",
      action: "raise",
      stackBb: 10,
      euro: true,
      parenthesizedForced: true,
    }),
  });
  assert.equal(regularThreeBb.ok, true, regularThreeBb.reason);
  assert.equal(regularThreeBb.action, "raise");
  assert.equal(regularThreeBb.actionAmount, 300);

  const rawEight = textFixture({
    network: "PartyPoker",
    hero: "BTN",
    action: "raise",
    euro: true,
    parenthesizedForced: true,
  }).replace(
    "Seat 13: CO (€2000 in chips)",
    "Seat 13: CO (€2000 in chips)\nSeat 15: OBSERVER (€2000 in chips)",
  );
  assert.equal(parseCoinPartyRfiHand({
    network: "PartyPoker",
    heroNickname: "BTN",
    hhText: rawEight,
  }).reason, "not-exact-7");
  assert.equal(parseCoinPartyRfiHand({
    network: "Chico",
    heroNickname: "EP",
    hhText: textFixture({ network: "CoinPoker", hero: "EP" }),
  }).reason, "unsupported-network");

  const normalized = normalizeCoinPartyHandHistory({
    network: "PartyPoker",
    hhText: "Seat 1: A (€2000 in chips)\nA: posts small blind (€50)",
  });
  assert.equal(normalized.includes("€"), false);
  assert.match(normalized, /A: posts small blind 50/);
}

function testRendererRejectsArbitraryMembership() {
  const membershipPath = path.join(temporary, "synthetic-membership.csv");
  const parserValidationPath = path.join(temporary, "synthetic-parser-validation.json");
  fs.writeFileSync(
    membershipPath,
    `cohort,user_id\n${Array.from({ length: 244 }, (_, index) => `l3top,${index + 1}`).join("\n")}\n`,
    { mode: 0o600 },
  );
  fs.writeFileSync(parserValidationPath, "{}\n", { mode: 0o600 });
  const rejected = spawnSync(process.execPath, [
    renderer,
    membershipPath,
    "--network=CoinPoker",
    "--user-shard-index=0",
    "--user-shard-count=4",
    "--mode=aggregate",
    `--output=${path.join(temporary, "rejected.sql")}`,
    `--metadata-output=${path.join(temporary, "rejected.json")}`,
    `--parser-validation=${parserValidationPath}`,
  ], { encoding: "utf8" });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /do not match the frozen Coin\/Party publication cohort/);

  const outside = spawnSync(process.execPath, [
    renderer,
    membershipPath,
    "--network=CoinPoker",
    "--user-shard-index=0",
    "--user-shard-count=4",
    "--mode=gate",
    "--output=/tmp/coin-party-query.sql",
    "--metadata-output=/tmp/coin-party-query.json",
    `--parser-validation=${parserValidationPath}`,
  ], { encoding: "utf8" });
  assert.notEqual(outside.status, 0);
  assert.match(outside.stderr, /must stay under \/private\/tmp/);
}

function parserValidationBindingReady() {
  const binding = COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding;
  return (
    binding.parserTemplateSha256 === sha256(parserTemplateBuffer)
    && binding.parserImplementationSha256 === sha256(parserImplementationBuffer)
    && binding.grammarSha256 === coinPartyGrammarContract().sha256
  );
}

function frozenParserTemplateBindingReady() {
  return frozenParserTemplateBuffer !== null
    && COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding
      .parserTemplateSha256 === sha256(frozenParserTemplateBuffer)
    && COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding
      .parserImplementationSha256 === sha256(parserImplementationBuffer)
    && COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding
      .grammarSha256 === coinPartyGrammarContract().sha256;
}

function testStaleParserValidationFailsClosed() {
  const binding = COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.binding;
  assert.notEqual(
    binding.parserTemplateSha256,
    sha256(parserTemplateBuffer),
    "this branch is only valid while private validation is stale",
  );
  const parserValidationPath = path.join(temporary, "stale-parser-validation-v2.json");
  fs.writeFileSync(
    parserValidationPath,
    `${JSON.stringify(parserValidationFixture(fs.readFileSync(frozenMembershipPath)), null, 2)}\n`,
    { mode: 0o600 },
  );
  const rejected = spawnSync(process.execPath, [
    renderer,
    frozenMembershipPath,
    "--network=CoinPoker",
    "--user-shard-index=0",
    "--user-shard-count=4",
    "--mode=aggregate",
    `--output=${path.join(temporary, "stale-parser-query.sql")}`,
    `--metadata-output=${path.join(temporary, "stale-parser-query.json")}`,
    `--parser-validation=${parserValidationPath}`,
  ], { encoding: "utf8" });
  assert.notEqual(rejected.status, 0, "stale private validation must never render publication SQL");
  assert.match(
    rejected.stderr,
    /parser validation report is stale for the current grammar\/window\/membership/,
  );
  console.log("Coin/Party strict merge blocked safely: private parser validation fingerprint is stale");
}

function testStrictEightShardMerge({
  parserTemplatePath: selectedParserTemplatePath = null,
  parserTemplateBuffer: selectedParserTemplateBuffer = parserTemplateBuffer,
} = {}) {
  const membershipBuffer = fs.readFileSync(frozenMembershipPath);
  assert.equal(
    sha256(membershipBuffer),
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.membershipSha256,
  );
  const selectedUserIds = membershipBuffer.toString("utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(","))
    .filter(([cohort]) => cohort === "l3top")
    .map(([, userId]) => Number(userId))
    .sort((left, right) => left - right);
  assert.equal(
    sha256(selectedUserIds.join(",")),
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
  );
  const parserValidationPath = path.join(temporary, "parser-validation-v2.json");
  fs.writeFileSync(
    parserValidationPath,
    `${JSON.stringify(parserValidationFixture(
      membershipBuffer,
      selectedParserTemplateBuffer,
    ), null, 2)}\n`,
    { mode: 0o600 },
  );
  const sources = [];
  const states = [];
  for (const [stack, stackOrder] of Object.entries(stacks)) {
    for (const [position, positionContract] of Object.entries(positions)) {
      states.push({ stack, stackOrder, position, ...positionContract });
    }
  }
  const splitGate = Object.fromEntries(
    ["CoinPoker", "PartyPoker"].map((network) => [
      network,
      Array.from({ length: 4 }, (_, shardIndex) => (
        splitFrozenGate(network, shardIndex)
      )),
    ]),
  );
  let stateOffset = 0;
  for (const network of ["CoinPoker", "PartyPoker"]) {
    for (let shardIndex = 0; shardIndex < 4; shardIndex += 1) {
      const identity = `${network}-${shardIndex}`;
      const queryPath = path.join(temporary, `${identity}.sql`);
      const csvPath = path.join(temporary, `${identity}.csv`);
      const metadataPath = path.join(temporary, `${identity}.render.json`);
      const receiptPath = path.join(temporary, `${identity}.receipt.json`);
      const render = spawnSync(process.execPath, [
        renderer,
        frozenMembershipPath,
        `--network=${network}`,
        `--user-shard-index=${shardIndex}`,
        "--user-shard-count=4",
        "--mode=aggregate",
        `--output=${queryPath}`,
        `--metadata-output=${metadataPath}`,
        `--parser-validation=${parserValidationPath}`,
        ...(selectedParserTemplatePath
          ? [`--parser-template=${selectedParserTemplatePath}`]
          : []),
      ], { encoding: "utf8" });
      assert.equal(render.status, 0, render.stderr || render.stdout);
      const queryBuffer = fs.readFileSync(queryPath);
      const metadataBuffer = fs.readFileSync(metadataPath);
      const metadata = JSON.parse(metadataBuffer.toString("utf8"));
      assert.equal(metadata.schema, "ff-rfi-coin-party-publication-render-v2");
      assert.equal(metadata.targetFilter, false);
      assert.equal(metadata.exactTableContract.tableSize, 7);
      assert.equal(metadata.userShard.userIdsSha256, sha256(expectedPartition(
        selectedUserIds,
        shardIndex,
        4,
      ).join(",")));
      const emptyAggregate = network === "PartyPoker" && shardIndex === 3;
      const assigned = emptyAggregate
        ? []
        : states.filter((_, index) => (
          index % 8 === stateOffset
          || (network === "PartyPoker" && shardIndex === 0 && index % 8 === 7)
        ));
      stateOffset += 1;
      const gateCounts = splitGate[network][shardIndex];
      const rows = assigned.map((state) => inputRow(network, shardIndex, gateCounts, state));
      const csv = emptyAggregate
        ? "\n"
        : `${inputColumns.join(",")}\n${rows.map((row) => (
          inputColumns.map((column) => csvCell(row[column])).join(",")
        )).join("\n")}\n`;
      fs.writeFileSync(csvPath, csv, { mode: 0o600 });
      const receipt = {
        schema: "ff-rfi-coin-party-publication-execution-v2",
        job_id: `mcp_ch_job_${sha256(`job|${identity}`).slice(0, 32)}`,
        status: "succeeded",
        execution_mode: "async",
        network,
        window_start_inclusive: "2023-09-01T00:00:00Z",
        window_end_exclusive: "2026-07-26T00:00:00Z",
        user_shard: {
          index: shardIndex,
          count: 4,
          users: 61,
          user_ids_sha256: metadata.userShard.userIdsSha256,
        },
        started_at: "2026-07-26T00:00:00Z",
        finished_at: "2026-07-26T00:01:00Z",
        row_count: rows.length,
        byte_size: Buffer.byteLength(csv),
        query_sha256: sha256(queryBuffer),
        result_sha256: sha256(csv),
        render_metadata_sha256: sha256(metadataBuffer),
        gate_counts: gateCounts,
        aggregate: {
          observed_states: rows.length,
          observed_cells: rows.length,
          opportunities: rows.length,
          raises_total: 0,
          regular_raise: 0,
          open_shove: 0,
          limp: 0,
          fold_other: rows.length,
          normal_three_bb_as_shove: 0,
          non_exact_r_effective_allin: 0,
        },
      };
      if (emptyAggregate) {
        receipt.gate_companion = buildGateCompanion({
          network,
          shardIndex,
          userShard: receipt.user_shard,
          gateCounts,
          parserValidationPath,
          selectedParserTemplatePath,
        });
      }
      fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
      sources.push({
        network,
        shardIndex,
        aggregateCsv: csvPath,
        querySql: queryPath,
        querySha256: sha256(queryBuffer),
        renderMetadata: metadataPath,
        renderMetadataSha256: sha256(metadataBuffer),
        executionReceipt: receiptPath,
      });
    }
  }
  assert.equal(stateOffset, 8);
  const planPath = path.join(temporary, "run-plan.json");
  const outputPath = path.join(temporary, "merged.csv");
  const manifestPath = path.join(temporary, "merged.manifest.json");
  fs.writeFileSync(planPath, `${JSON.stringify({
    schema: "ff-rfi-coin-party-publication-run-plan-v2",
    window: ["2023-09-01", "2026-07-26"],
    targetFilter: false,
    tableSize: 7,
    membershipSha256: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.membershipSha256,
    userIdsSha256: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
    publicationTemplateSha256: sha256(publicationTemplate),
    parserTemplateSha256: sha256(selectedParserTemplateBuffer),
    parserImplementationSha256: sha256(parserImplementationBuffer),
    expectedStrongGateTotals:
      COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.strongGateTotals,
    sources,
  }, null, 2)}\n`, { mode: 0o600 });
  const run = runMerger(
    planPath,
    parserValidationPath,
    outputPath,
    manifestPath,
    selectedParserTemplatePath,
  );
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const summary = JSON.parse(run.stdout);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(summary.rows, 9126);
  assert.equal(summary.states, 54);
  assert.equal(summary.totals.opportunities, 54);
  assert.equal(summary.totals.fold_other, 54);
  assert.equal(manifest.sources.length, 8);
  assert.equal(manifest.schema, "ff-rfi-coin-party-publication-merge-v2");
  assert.equal(manifest.cube.targetFilter, false);
  assert.equal(manifest.cube.dense, true);
  assert.equal(Object.hasOwn(manifest, "targetContributions"), false);
  assert.deepEqual(manifest.privacy, {
    aggregateOnly: true,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  });
  assert.equal(JSON.stringify(manifest).includes("/private/tmp/"), false);
  assert.equal(Object.hasOwn(manifest.inputs[0], "queryFile"), false);
  assert.equal(Object.hasOwn(manifest.inputs[0], "receiptSchema"), false);
  assert.deepEqual(
    manifest.inputs[0].privacy,
    COIN_PARTY_PUBLICATION_CONTRACT.publicInputPrivacy,
  );
  const emptyManifestInput = manifest.inputs.find((input) => (
    input.network === "PartyPoker" && input.userShard.index === 3
  ));
  assert.equal(emptyManifestInput.resultRows, 0);
  assert.equal(emptyManifestInput.observedStates, 0);
  assert.equal(JSON.stringify(emptyManifestInput).includes("gate_companion"), false);
  assert.equal(fs.statSync(outputPath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(manifestPath).mode & 0o777, 0o600);

  for (const source of sources.filter((item) => item.network === "CoinPoker")) {
    const assigned = states.filter((_, index) => index % 4 === source.shardIndex);
    const gateCounts = splitGate.CoinPoker[source.shardIndex];
    const rows = assigned.map((state) => inputRow(
      "CoinPoker",
      source.shardIndex,
      gateCounts,
      state,
    ));
    const csv = `${inputColumns.join(",")}\n${rows.map((row) => (
      inputColumns.map((column) => csvCell(row[column])).join(",")
    )).join("\n")}\n`;
    fs.writeFileSync(source.aggregateCsv, csv, { mode: 0o600 });
    const receipt = JSON.parse(fs.readFileSync(source.executionReceipt, "utf8"));
    receipt.row_count = rows.length;
    receipt.byte_size = Buffer.byteLength(csv);
    receipt.result_sha256 = sha256(csv);
    receipt.aggregate = {
      observed_states: rows.length,
      observed_cells: rows.length,
      opportunities: rows.length,
      raises_total: 0,
      regular_raise: 0,
      open_shove: 0,
      limp: 0,
      fold_other: rows.length,
      normal_three_bb_as_shove: 0,
      non_exact_r_effective_allin: 0,
    };
    fs.writeFileSync(
      source.executionReceipt,
      `${JSON.stringify(receipt, null, 2)}\n`,
      { mode: 0o600 },
    );
  }
  const coinSources = sources.filter((source) => source.network === "CoinPoker");
  const coinPlanPath = path.join(temporary, "coin-only-run-plan.json");
  const coinOutputPath = path.join(temporary, "coin-only-merged.csv");
  const coinManifestPath = path.join(temporary, "coin-only-merged.manifest.json");
  const coinPlan = {
    ...JSON.parse(fs.readFileSync(planPath, "utf8")),
    expectedStrongGateTotals: {
      CoinPoker:
        COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.strongGateTotals.CoinPoker,
    },
    sources: coinSources,
  };
  fs.writeFileSync(
    coinPlanPath,
    `${JSON.stringify(coinPlan, null, 2)}\n`,
    { mode: 0o600 },
  );
  const coinRun = runMerger(
    coinPlanPath,
    parserValidationPath,
    coinOutputPath,
    coinManifestPath,
    selectedParserTemplatePath,
  );
  assert.equal(coinRun.status, 0, coinRun.stderr || coinRun.stdout);
  const coinManifest = JSON.parse(fs.readFileSync(coinManifestPath, "utf8"));
  assert.deepEqual(coinManifest.networks, ["CoinPoker"]);
  assert.deepEqual(coinManifest.plan.networks, ["CoinPoker"]);
  assert.deepEqual(coinManifest.parserValidation.networks, ["CoinPoker"]);
  assert.equal(coinManifest.plan.expectedExecutions, 4);
  assert.equal(coinManifest.inputs.length, 4);
  assert.equal(coinManifest.cube.states, 54);
  assert.equal(coinManifest.cube.rowCount, 9126);

  const rejectedMissingShardPlan = {
    ...coinPlan,
    sources: coinSources.slice(0, -1),
  };
  const rejectedMissingShardPlanPath = path.join(
    temporary,
    "coin-only-missing-shard-plan.json",
  );
  fs.writeFileSync(
    rejectedMissingShardPlanPath,
    `${JSON.stringify(rejectedMissingShardPlan, null, 2)}\n`,
    { mode: 0o600 },
  );
  const rejectedMissingShard = runMerger(
    rejectedMissingShardPlanPath,
    parserValidationPath,
    path.join(temporary, "coin-only-missing-shard.csv"),
    path.join(temporary, "coin-only-missing-shard.manifest.json"),
    selectedParserTemplatePath,
  );
  assert.notEqual(rejectedMissingShard.status, 0);
  assert.match(
    rejectedMissingShard.stderr,
    /exactly four sources per selected network/i,
  );

  const rejectedExtraGatePlan = {
    ...coinPlan,
    expectedStrongGateTotals:
      COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.strongGateTotals,
  };
  const rejectedExtraGatePlanPath = path.join(
    temporary,
    "coin-only-extra-gate-plan.json",
  );
  fs.writeFileSync(
    rejectedExtraGatePlanPath,
    `${JSON.stringify(rejectedExtraGatePlan, null, 2)}\n`,
    { mode: 0o600 },
  );
  const rejectedExtraGate = runMerger(
    rejectedExtraGatePlanPath,
    parserValidationPath,
    path.join(temporary, "coin-only-extra-gate.csv"),
    path.join(temporary, "coin-only-extra-gate.manifest.json"),
    selectedParserTemplatePath,
  );
  assert.notEqual(rejectedExtraGate.status, 0);
  assert.match(rejectedExtraGate.stderr, /gate-total network scope drift/i);

  const rejectMutation = (file, mutate, pattern, suffix) => {
    const original = fs.readFileSync(file);
    mutate(file, original);
    const rejected = runMerger(
      planPath,
      parserValidationPath,
      path.join(temporary, `rejected-${suffix}.csv`),
      path.join(temporary, `rejected-${suffix}.manifest.json`),
      selectedParserTemplatePath,
    );
    fs.writeFileSync(file, original, { mode: 0o600 });
    assert.notEqual(rejected.status, 0, `${suffix}: mutation unexpectedly passed`);
    assert.match(rejected.stderr, pattern, `${suffix}: wrong rejection`);
  };
  rejectMutation(
    sources[0].renderMetadata,
    (file, original) => {
      const value = JSON.parse(original);
      value.targetFilter = true;
      fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    },
    /planned renderer hash drift|renderer metadata is not canonical/,
    "target-filter",
  );
  rejectMutation(
    sources[0].querySql,
    (file, original) => {
      fs.writeFileSync(
        file,
        original.toString("utf8").replace("WHERE player_count = 7", "WHERE player_count > 0"),
        { mode: 0o600 },
      );
    },
    /planned query hash drift|aggregate counter missing WHERE player_count = 7/,
    "exact-seven",
  );
  rejectMutation(
    sources[0].executionReceipt,
    (file, original) => {
      const value = JSON.parse(original);
      value.started_at = "2026-07-25T23:58:59Z";
      value.finished_at = "2026-07-25T23:59:59Z";
      fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    },
    /before the frozen window cutoff/,
    "stale-receipt",
  );
  rejectMutation(
    sources[0].executionReceipt,
    (file, original) => {
      const value = JSON.parse(original);
      value.render_metadata_sha256 = "0".repeat(64);
      fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    },
    /renderer metadata hash mismatch/,
    "renderer-binding",
  );

  const emptySource = sources.find((source) => (
    source.network === "PartyPoker" && source.shardIndex === 3
  ));
  const rejectGateMutation = ({
    targetPath,
    mutateTarget,
    updateCompanion,
    pattern,
    suffix,
  }) => {
    const receiptOriginal = fs.readFileSync(emptySource.executionReceipt);
    const targetOriginal = fs.readFileSync(targetPath);
    const targetMutated = mutateTarget(targetOriginal);
    fs.writeFileSync(targetPath, targetMutated, { mode: 0o600 });
    const receipt = JSON.parse(receiptOriginal);
    updateCompanion(receipt.gate_companion, targetMutated);
    fs.writeFileSync(
      emptySource.executionReceipt,
      `${JSON.stringify(receipt, null, 2)}\n`,
      { mode: 0o600 },
    );
    const rejected = runMerger(
      planPath,
      parserValidationPath,
      path.join(temporary, `rejected-${suffix}.csv`),
      path.join(temporary, `rejected-${suffix}.manifest.json`),
      selectedParserTemplatePath,
    );
    fs.writeFileSync(targetPath, targetOriginal, { mode: 0o600 });
    fs.writeFileSync(emptySource.executionReceipt, receiptOriginal, { mode: 0o600 });
    assert.notEqual(rejected.status, 0, `${suffix}: mutation unexpectedly passed`);
    assert.match(rejected.stderr, pattern, `${suffix}: wrong rejection`);
  };
  const emptyReceipt = JSON.parse(
    fs.readFileSync(emptySource.executionReceipt, "utf8"),
  );
  rejectGateMutation({
    targetPath: emptyReceipt.gate_companion.result_file,
    mutateTarget: (original) => {
      const [headerLine, rowLine] = original.toString("utf8").trimEnd().split("\n");
      const columns = headerLine.split(",");
      const values = rowLine.split(",");
      const index = columns.indexOf("source_gate_raw_keys");
      values[index] = String(Number(values[index]) + 1);
      return Buffer.from(`${headerLine}\n${values.join(",")}\n`);
    },
    updateCompanion: (companion, target) => {
      companion.result_sha256 = sha256(target);
      companion.result_bytes = target.length;
    },
    pattern: /gate result counter mismatch: raw_keys/,
    suffix: "empty-gate-counter",
  });
  rejectGateMutation({
    targetPath: emptyReceipt.gate_companion.query_file,
    mutateTarget: (original) => Buffer.concat([
      original,
      Buffer.from("\n-- canonical-gate-query-tamper\n"),
    ]),
    updateCompanion: (companion, target) => {
      companion.query_sha256 = sha256(target);
    },
    pattern: /gate query is not the exact canonical renderer output/,
    suffix: "empty-gate-query",
  });
  console.log(
    "Coin/Party strict frozen-template merge covered empty aggregate gate companion and tamper rejection",
  );
}

function textFixture({
  network,
  hero,
  action = "raise",
  stackBb = 20,
  cards = "As Kd",
  euro = false,
  parenthesizedForced = false,
}) {
  const actionOrder = ["EP", "MP", "HJ", "CO", "BTN", "SB", "BB"];
  const seatOrder = ["BTN", "SB", "BB", "EP", "MP", "HJ", "CO"];
  const seatNumbers = [1, 3, 5, 7, 9, 11, 13];
  const stack = stackBb * 100;
  const amount = (value) => euro ? `€${value}` : String(value);
  const forced = (value) => parenthesizedForced ? `(${amount(value)})` : amount(value);
  const prior = actionOrder.slice(0, actionOrder.indexOf(hero)).map((position) => (
    `${position}: folds`
  ));
  const heroAction = action === "raise"
    ? "raises 200 to 300"
    : action === "amountShove"
      ? `raises ${stack}`
      : "folds";
  return [
    network === "PartyPoker"
      ? "***** Hand History For Game fixture *****"
      : "PokerStars Hand #123456: Hold'em No Limit",
    "Table 'Fixture' 7-max Seat #1 is the button",
    ...seatOrder.map((position, index) => (
      `Seat ${seatNumbers[index]}: ${position} (${amount(stack)} in chips)`
    )),
    `SB: posts small blind ${forced(50)}`,
    `BB: posts big blind ${forced(100)}`,
    network === "PartyPoker" ? "*** PRE-FLOP ***" : "*** HOLE CARDS ***",
    `Dealt to ${hero} [${cards}]`,
    ...prior,
    `${hero}: ${heroAction}`,
    "*** SUMMARY ***",
  ].join("\n");
}

function splitFrozenGate(network, shardIndex) {
  const totals =
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.strongGateTotals[network];
  const split = (value) => (
    Math.floor(value / 4) + (shardIndex < value % 4 ? 1 : 0)
  );
  const exact = split(totals.exactIdMatchKeys);
  const nominal = split(totals.nominalNovelKeys);
  const publication = split(totals.publicationEligibleKeys);
  return {
    raw_keys: exact + nominal,
    exact_id_match_keys: exact,
    nominal_novel_keys: nominal,
    normalized_time_eligible_keys: publication,
    publication_eligible_keys: publication,
  };
}

function buildGateCompanion({
  network,
  shardIndex,
  userShard,
  gateCounts,
  parserValidationPath,
  selectedParserTemplatePath,
}) {
  const identity = `${network}-${shardIndex}`;
  const queryPath = path.join(temporary, `${identity}.gate.sql`);
  const metadataPath = path.join(temporary, `${identity}.gate.render.json`);
  const resultPath = path.join(temporary, `${identity}.gate.csv`);
  const rendered = spawnSync(process.execPath, [
    renderer,
    frozenMembershipPath,
    `--network=${network}`,
    `--user-shard-index=${shardIndex}`,
    "--user-shard-count=4",
    "--mode=gate",
    `--output=${queryPath}`,
    `--metadata-output=${metadataPath}`,
    `--parser-validation=${parserValidationPath}`,
    ...(selectedParserTemplatePath
      ? [`--parser-template=${selectedParserTemplatePath}`]
      : []),
  ], { encoding: "utf8" });
  assert.equal(rendered.status, 0, rendered.stderr || rendered.stdout);
  const gateRow = {
    supplemental_network: network,
    source_user_shard_index: shardIndex,
    source_user_shard_count: 4,
    source_gate_raw_keys: gateCounts.raw_keys,
    source_gate_exact_id_match_keys: gateCounts.exact_id_match_keys,
    source_gate_nominal_novel_keys: gateCounts.nominal_novel_keys,
    source_gate_normalized_time_eligible_keys:
      gateCounts.normalized_time_eligible_keys,
    source_gate_publication_eligible_keys: gateCounts.publication_eligible_keys,
    tracker_selection_assertion: 1,
    exact_partition_assertion: 1,
    publication_partition_assertion: 1,
  };
  const result = `${gateResultColumns.join(",")}\n${
    gateResultColumns.map((column) => csvCell(gateRow[column])).join(",")
  }\n`;
  fs.writeFileSync(resultPath, result, { mode: 0o600 });
  const queryBuffer = fs.readFileSync(queryPath);
  const metadataBuffer = fs.readFileSync(metadataPath);
  return {
    schema: "ff-rfi-coin-party-publication-gate-execution-v2",
    job_id: `mcp_ch_job_${sha256(`gate-job|${identity}`).slice(0, 32)}`,
    status: "succeeded",
    execution_mode: "async",
    network,
    window_start_inclusive: "2023-09-01T00:00:00Z",
    window_end_exclusive: "2026-07-26T00:00:00Z",
    user_shard: { ...userShard },
    started_at: "2026-07-26T00:01:01Z",
    finished_at: "2026-07-26T00:02:00Z",
    query_file: queryPath,
    query_sha256: sha256(queryBuffer),
    render_metadata_file: metadataPath,
    render_metadata_sha256: sha256(metadataBuffer),
    result_file: resultPath,
    result_sha256: sha256(result),
    result_bytes: Buffer.byteLength(result),
    result_rows: 1,
    all_assertions_passed: true,
  };
}

function parserValidationFixture(
  membershipBuffer,
  selectedParserTemplateBuffer = parserTemplateBuffer,
) {
  const checks = (parsed, shoves) => ({
    cards: { compared: parsed, matched: parsed, pct: 100 },
    position: { compared: parsed, matched: parsed, pct: 100 },
    stack: { compared: parsed, matched: parsed, pct: 100 },
    publicStack: { compared: parsed, matched: parsed, pct: 100 },
    action: { compared: parsed, matched: parsed, pct: 100 },
    shove: { compared: shoves, matched: shoves, pct: 100 },
  });
  return {
    schema: "ff-rfi-coin-party-parser-validation-v2",
    status: "passed",
    validatedAt: "2026-07-26T00:05:00Z",
    binding: {
      parserTemplateSha256: sha256(selectedParserTemplateBuffer),
      parserImplementationSha256: sha256(parserImplementationBuffer),
      grammarSha256: coinPartyGrammarContract().sha256,
      membershipSha256: sha256(membershipBuffer),
      userIdsSha256: COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.userIdsSha256,
      window: ["2023-09-01", "2026-07-26"],
    },
    source: {
      ...COIN_PARTY_PUBLICATION_CONTRACT.privateOverlapValidation.source,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
    networks: {
      CoinPoker: {
        rows: 1191,
        parsed: 1191,
        rejected: 0,
        reasons: {},
        checks: checks(1191, 419),
      },
      PartyPoker: {
        rows: 175,
        parsed: 160,
        rejected: 15,
        reasons: { "not-exact-7": 15 },
        checks: checks(160, 44),
      },
    },
  };
}

function expectedPartition(ids, index, count) {
  return ids.slice(
    Math.floor(ids.length * index / count),
    Math.floor(ids.length * (index + 1) / count),
  );
}

function inputRow(network, shardIndex, sourceGate, state) {
  return {
    window_start: "2023-09-01",
    window_end: "2026-07-25",
    table_filter: "cnt_players = 7",
    table_size: 7,
    supplemental_network: network,
    source_user_shard_index: shardIndex,
    source_user_shard_count: 4,
    source_gate_raw_keys: sourceGate.raw_keys,
    source_gate_exact_id_match_keys: sourceGate.exact_id_match_keys,
    source_gate_nominal_novel_keys: sourceGate.nominal_novel_keys,
    source_gate_normalized_time_eligible_keys:
      sourceGate.normalized_time_eligible_keys,
    source_gate_publication_eligible_keys: sourceGate.publication_eligible_keys,
    cohort: "l3top",
    cohort_selected_players: 244,
    position_group: state.position,
    position_order: state.order,
    position_code: state.code,
    stack_bucket: state.stack,
    stack_order: state.stackOrder,
    hand_class: "AA",
    eligible_opportunities: 1,
    known_card_opportunities: 1,
    lookup_mismatch_opportunities: 0,
    first_observed_at: "2026-07-01 00:00:00",
    last_observed_at: "2026-07-01 00:00:00",
    opportunities: 1,
    raises_total: 0,
    regular_raise: 0,
    open_shove: 0,
    limp: 0,
    fold_other: 1,
    shove_allin_flag: 0,
    shove_effective_amount_only: 0,
    regular_three_bb_open: 0,
    normal_three_bb_as_shove: 0,
    non_exact_r_effective_allin: 0,
    raise_total_pct: 0,
    regular_raise_pct: 0,
    open_shove_pct: 0,
    limp_pct: 0,
    fold_pct: 100,
    below_exact_minimum: 1,
    low_sample: 1,
  };
}

function runMerger(
  planPath,
  parserValidationPath,
  outputPath,
  manifestPath,
  selectedParserTemplatePath = null,
) {
  return spawnSync(process.execPath, [
    merger,
    `--plan=${planPath}`,
    `--membership=${frozenMembershipPath}`,
    `--parser-validation=${parserValidationPath}`,
    `--output=${outputPath}`,
    `--manifest=${manifestPath}`,
    ...(selectedParserTemplatePath
      ? [`--parser-template=${selectedParserTemplatePath}`]
      : []),
  ], { encoding: "utf8" });
}

function csvCell(value) {
  const text = String(value ?? "");
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
