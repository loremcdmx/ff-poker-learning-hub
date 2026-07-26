#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const merger = path.join(here, "merge-novel-raw-hh-field-action-shards.mjs");
const combiner = path.join(here, "combine-novel-raw-hh-supplements.mjs");
const temporary = fs.mkdtempSync("/private/tmp/ff-rfi-novel-supplement-test-");
const COLUMNS = [
  "window_start", "window_end", "table_filter", "table_size", "cohort",
  "cohort_selected_players", "position_group", "position_order",
  "position_code", "stack_bucket", "stack_order", "hand_class",
  "eligible_opportunities", "known_card_opportunities",
  "lookup_mismatch_opportunities", "first_observed_at", "last_observed_at",
  "opportunities", "raises_total", "regular_raise", "open_shove", "limp",
  "fold_other", "shove_allin_flag", "shove_effective_amount_only",
  "regular_three_bb_open", "normal_three_bb_as_shove",
  "non_exact_r_effective_allin", "raise_total_pct", "regular_raise_pct",
  "open_shove_pct", "limp_pct", "fold_pct", "below_exact_minimum",
  "low_sample",
];
const EXTRA_COLUMNS = [
  ...COLUMNS.slice(0, 4),
  "supplemental_network", "source_user_shard_index", "source_user_shard_count",
  "source_gate_raw_keys", "source_gate_exact_id_match_keys",
  "source_gate_nominal_novel_keys",
  "source_gate_normalized_time_eligible_keys",
  "source_gate_publication_eligible_keys",
  ...COLUMNS.slice(4),
];
const V5_COLUMNS = [
  ...COLUMNS.slice(0, 12),
  "source_raw_keys", "source_exact_keys", "source_novel_keys",
  "source_eligible_keys",
  ...COLUMNS.slice(12),
];
const NETWORKS_V5 = [
  "888Poker", "GGNetwork", "PokerStars", "PokerStars(FR-ES-PT)",
  "Winamax.fr", "WPN", "iPoker",
];
const templateBuffer = fs.readFileSync(
  path.join(here, "q_ff_rfi_raw_hh_field_actions.sql"),
);
const templateText = templateBuffer.toString("utf8");
const parserBody = templateText.slice(
  templateText.indexOf("lexical AS ("),
  templateText.lastIndexOf("SELECT\n  toString"),
);

try {
  const legacy = buildExtraFixture("legacy-rejected");
  const legacyRun = runFixture(legacy);
  assert.notEqual(legacyRun.status, 0);
  assert.match(legacyRun.stderr, /not publication evidence.*dedicated Coin\/Party v2|immutable v5/i);

  const fallbackA = buildFallbackV5Fixture(
    "fallback-a",
    NETWORKS_V5.slice(0, 3),
    100,
  );
  const fallbackB = buildFallbackV5Fixture(
    "fallback-b",
    NETWORKS_V5.slice(3),
    1000,
  );
  for (const fixture of [fallbackA, fallbackB]) {
    const run = runFixture(fixture);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const metadata = readJson(fixture.metadata);
    assert.equal(metadata.sourceKind, "publication-safe-novel-raw-hh-l3top");
    assert.equal(
      metadata.strategy,
      "approved-plan-source-union-with-observed-zero-dimension-completion",
    );
    assert.deepEqual(metadata.inputs[0].privacy, {
      aggregateOnly: true,
      noRawHandHistories: true,
      noPlayerLevelRows: true,
      noUserIds: true,
    });
    assert.equal(metadata.plan.targetFilter, false);
    assert.equal(metadata.inputs.every((input) => !Object.hasOwn(input, "queryFile")), true);
    assert.equal(JSON.stringify(metadata).includes("/private/tmp/"), false);
  }

  expectV5Failure("mutable plan", (fixture) => {
    const plan = readJson(fixture.plan);
    plan.targetFilter = true;
    writeJson(fixture.plan, plan);
  }, /run-plan hash drift|target filtering/i);
  expectV5Failure("renderer target filter omitted", (fixture) => {
    const rendererValue = readJson(fixture.renderers[0]);
    delete rendererValue.targetFilter;
    writeJson(fixture.renderers[0], rendererValue);
    rebindV5PlanAndReceipts(fixture);
  }, /targetFilter must be explicitly false/i);
  expectV5Failure("stale receipt", (fixture) => {
    const receipt = readJson(fixture.receipts[0]);
    receipt.started_at = "2026-07-25T23:58:00Z";
    receipt.finished_at = "2026-07-25T23:59:00Z";
    writeJson(fixture.receipts[0], receipt);
  }, /predates the closed-window cutoff/i);
  expectV5Failure("parser binding drift", (fixture) => {
    const validation = readJson(fixture.parserValidation);
    validation.binding.window.endExclusive = "2026-07-27T00:00:00Z";
    writeJson(fixture.parserValidation, validation);
  }, /stale for the immutable plan/i);
  expectV5Failure("non-v5 header", (fixture) => {
    const text = fs.readFileSync(fixture.results[0], "utf8");
    fs.writeFileSync(fixture.results[0], text.replace("low_sample\n", "low_sample,nickname\n"));
    rebindV5PlanAndReceipts(fixture);
  }, /aggregate header violates|malformed CSV row/i);

  const combinedOutput = path.join(temporary, "combined.csv");
  const combinedMetadata = path.join(temporary, "combined.json");
  const combineRun = spawnSync(process.execPath, [
    combiner,
    `--aggregates=${fallbackA.output},${fallbackB.output}`,
    `--manifests=${fallbackA.metadata},${fallbackB.metadata}`,
    `--membership=${fallbackA.membership}`,
    `--output=${combinedOutput}`,
    `--output-metadata=${combinedMetadata}`,
  ], { encoding: "utf8", cwd: here });
  assert.equal(combineRun.status, 0, combineRun.stderr || combineRun.stdout);
  const combined = readJson(combinedMetadata);
  assert.equal(combined.schema, "ff-rfi-field-action-novel-raw-supplement-composition-v1");
  assert.equal(combined.plan.networks.length, 7);
  assert.equal(combined.plan.expectedExecutions, 28);
  assert.equal(combined.merged.totals.opportunities, 28);
  assert.equal(JSON.stringify(combined).includes("/private/tmp/"), false);

  const duplicateNetworkRun = spawnSync(process.execPath, [
    combiner,
    `--aggregates=${fallbackA.output},${fallbackA.output}`,
    `--manifests=${fallbackA.metadata},${fallbackA.metadata}`,
    `--membership=${fallbackA.membership}`,
    `--output=${path.join(temporary, "duplicate.csv")}`,
    `--output-metadata=${path.join(temporary, "duplicate.json")}`,
  ], { encoding: "utf8", cwd: here });
  assert.notEqual(duplicateNetworkRun.status, 0);
  assert.match(duplicateNetworkRun.stderr, /appears in both component/i);

  process.stdout.write("novel raw-HH supplement merge tests passed\n");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

function expectV5Failure(label, mutate, pattern) {
  const fixture = buildFallbackV5Fixture(
    `failure-${label.replace(/\W+/g, "-")}`,
    ["888Poker"],
    2000,
  );
  mutate(fixture);
  const result = runFixture(fixture);
  assert.notEqual(result.status, 0, `${label}: mutation unexpectedly passed`);
  assert.match(result.stderr, pattern, `${label}: wrong failure\n${result.stderr}`);
}

function buildExtraFixture(name) {
  const root = path.join(temporary, name);
  fs.mkdirSync(root, { recursive: true });
  const membership = write(path.join(root, "membership.csv"), membershipCsv());
  const membershipBytes = fs.readFileSync(membership);
  const topIds = [101, 102, 103, 104];
  const networks = ["CoinPoker", "PartyPoker"];
  const entries = [];
  const queries = [];
  const renderers = [];
  const results = [];
  const receipts = [];
  let execution = 0;
  for (const network of networks) {
    for (let shard = 0; shard < 4; shard += 1) {
      const ids = [topIds[shard]];
      const userHash = sha256(ids.join(","));
      const gateQuery = write(
        path.join(root, `gate-${execution}.sql`),
        `SELECT '${network}' AS network, ${shard} AS shard\n`,
      );
      const gateMetadata = writeJson(path.join(root, `gate-${execution}.json`), {
        schema: "ff-rfi-extra-network-publication-export-render-v1",
        membershipSha256: sha256(membershipBytes),
        network,
        window: ["2023-09-01", "2026-07-27"],
        userShard: {
          index: shard,
          count: 4,
          users: 1,
          firstUserId: ids[0],
          lastUserId: ids[0],
          userIdsSha256: userHash,
        },
        gates: ["a", "b", "c", "d", "e"],
        renderedSqlSha256: sha256(fs.readFileSync(gateQuery)),
      });
      entries.push({
        network,
        shardIndex: shard,
        shardCount: 4,
        users: 1,
        firstUserId: ids[0],
        lastUserId: ids[0],
        userIdsSha256: userHash,
        sqlFile: gateQuery,
        sqlSha256: sha256(fs.readFileSync(gateQuery)),
        metadataFile: gateMetadata,
        metadataSha256: sha256(fs.readFileSync(gateMetadata)),
      });
      const query = write(
        path.join(root, `aggregate-${execution}.sql`),
        `SELECT '${network}' AS supplemental_network, ${shard} AS shard\n`,
      );
      const renderer = writeJson(path.join(root, `aggregate-${execution}.json`), {
        schema: "ff-rfi-extra-network-publication-aggregate-render-v1",
        publicationGateSqlSha256: sha256(fs.readFileSync(gateQuery)),
        aggregateTemplateSha256: "a".repeat(64),
        membershipSha256: sha256(membershipBytes),
        network,
        cohort: "l3top",
        selectedPlayers: 4,
        window: ["2023-09-01", "2026-07-27"],
        cube: {
          stackBuckets: 9,
          positionGroups: 6,
          handClasses: 169,
          possibleCells: 9126,
          targetFilter: false,
        },
        actionCounters: [
          "opportunities", "raises_total", "regular_raise", "open_shove",
          "limp", "fold_other", "shove_allin_flag",
          "shove_effective_amount_only", "regular_three_bb_open",
          "normal_three_bb_as_shove",
        ],
        exposedPublicationGateCounters: [
          "raw_keys", "exact_id_match_keys", "nominal_novel_keys",
          "normalized_time_eligible_keys", "publication_eligible_keys",
        ],
        userShard: {
          index: shard,
          count: 4,
          users: 1,
          firstUserId: ids[0],
          lastUserId: ids[0],
          userIdsSha256: userHash,
        },
        renderedSqlSha256: sha256(fs.readFileSync(query)),
      });
      const hasRow = execution !== 7;
      const gate = {
        raw_keys: 10,
        exact_id_match_keys: 9,
        nominal_novel_keys: 1,
        normalized_time_eligible_keys: hasRow ? 1 : 0,
        publication_eligible_keys: hasRow ? 1 : 0,
      };
      const result = path.join(root, `result-${execution}.csv`);
      if (hasRow) {
        rewriteCsv(result, EXTRA_COLUMNS, [extraRow(network, shard, gate)]);
      } else {
        write(result, "\n");
      }
      const receipt = writeJson(path.join(root, `receipt-${execution}.json`), {
        schema: "ff-rfi-extra-network-publication-aggregate-execution-v1",
        job_id: `mcp_ch_job_${execution.toString(16).padStart(32, "0")}`,
        status: "succeeded",
        network,
        user_shard: {
          index: shard,
          count: 4,
          users: 1,
          user_ids_sha256: userHash,
        },
        row_count: hasRow ? 1 : 0,
        byte_size: fs.statSync(result).size,
        truncated: false,
        query_file: query,
        query_sha256: sha256(fs.readFileSync(query)),
        result_file: result,
        result_sha256: sha256(fs.readFileSync(result)),
        gate_counts: gate,
        aggregate: {
          states: hasRow ? 1 : 0,
          observed_cells: hasRow ? 1 : 0,
          opportunities: hasRow ? 1 : 0,
          open_shove: 0,
          normal_three_bb_as_shove: 0,
          action_partitions_valid: true,
        },
      });
      queries.push(query);
      renderers.push(renderer);
      results.push(result);
      receipts.push(receipt);
      execution += 1;
    }
  }
  const plan = writeJson(path.join(root, "plan.json"), {
    schema: "ff-rfi-extra-network-publication-shard-plan-v1",
    membershipFile: membership,
    membershipSha256: sha256(membershipBytes),
    cohort: "l3top",
    users: 4,
    userIdsSha256: sha256(topIds.join(",")),
    networks,
    shardsPerNetwork: 4,
    exactDisjointUnion: true,
    entries,
  });
  const parserValidation = writeJson(
    path.join(root, "parser-validation.json"),
    extraParserValidation(networks),
  );
  const planReceipt = writePlanReceipt(root, plan);
  return {
    plan,
    planReceipt,
    membership,
    parserValidation,
    queries,
    renderers,
    results,
    receipts,
    output: path.join(root, "merged.csv"),
    metadata: path.join(root, "merged.json"),
  };
}

function buildFallbackV5Fixture(name, networks, jobOffset) {
  const root = path.join(temporary, name);
  fs.mkdirSync(root, { recursive: true });
  const membership = write(path.join(root, "membership.csv"), membershipCsv());
  const membershipBytes = fs.readFileSync(membership);
  const membershipKeysSha256 = membershipKeys(membership);
  const topIds = [101, 102, 103, 104];
  const templateSha = sha256(templateBuffer);
  const parserSha = sha256(parserBody);
  const parts = [];
  const renderers = [];
  const results = [];
  const receipts = [];
  const receiptSpecs = [];
  let execution = 0;
  for (let shard = 0; shard < 4; shard += 1) {
    for (const [networkPart, network] of networks.entries()) {
      const query = write(
        path.join(root, `query-${execution}.sql`),
        `SELECT '${network}' AS network, ${shard} AS shard\n`,
      );
      const rendererPath = path.join(root, `renderer-${execution}.json`);
      const renderer = {
        schema: "ff-rfi-publication-eligible-full-aggregate-network-part-v5",
        templateSha256: templateSha,
        canonicalParserBoundary: {
          sha256: parserSha,
          byteIdenticalToCurrentTemplateRender: true,
        },
        membershipSha256: sha256(membershipBytes),
        membershipKeysSha256,
        selectedCohorts: ["l3top"],
        selectedMembershipRows: 4,
        targetFilter: false,
        userShard: {
          index: shard,
          count: 4,
          firstUserId: topIds[shard],
          lastUserId: topIds[shard],
          userIdsSha256: sha256(String(topIds[shard])),
        },
        window: ["2023-09-01", "2026-07-26"],
        networkPartition: { index: networkPart, count: networks.length, network },
        sourceReceipt: {
          strongGate:
            "every dense result row repeats actual source_raw_keys and source_exact_keys",
        },
        dimensions: { completeRows: 9126 },
        outputColumns: V5_COLUMNS,
        outputColumnCount: 39,
        countersPartitionOpportunities: true,
        explicitAllinSplitPreserved: true,
        outputContainsRawHandsNicknamesOrIds: false,
        renderedSqlSha256: sha256(fs.readFileSync(query)),
      };
      writeJson(rendererPath, renderer);
      const gate = {
        source_raw_keys: 2,
        source_exact_keys: 1,
        source_novel_keys: 1,
        source_eligible_keys: 1,
      };
      const result = path.join(root, `result-${execution}.csv`);
      rewriteCsv(result, V5_COLUMNS, [v5Row(gate)]);
      const receipt = path.join(root, `receipt-${execution}.json`);
      receiptSpecs.push({ receipt, query, rendererPath, result, gate, shard, networkPart, network });
      parts.push({
        executionIndex: execution,
        userShard: shard,
        networkPart,
        network,
        querySqlPath: query,
        querySqlSha256: sha256(fs.readFileSync(query)),
        queryMetadataPath: rendererPath,
        queryMetadataSha256: sha256(fs.readFileSync(rendererPath)),
        requiredResultCsvPath: result,
        requiredReceiptPath: receipt,
        expectedRowCount: 1,
        expectedColumnCount: 39,
      });
      renderers.push(rendererPath);
      results.push(result);
      receipts.push(receipt);
      execution += 1;
    }
  }
  const plan = writeJson(path.join(root, "plan.json"), {
    schema: "ff-rfi-publication-eligible-full-v5-run-plan",
    targetFilter: false,
    executionMode: "async",
    window: {
      startInclusive: "2023-09-01T00:00:00Z",
      endExclusive: "2026-07-26T00:00:00Z",
      semantics: "half-open-utc",
    },
    canonicalTemplateSha256: templateSha,
    canonicalParserBodySha256: parserSha,
    expectedParts: parts.length,
    expectedRowsPerPart: 1,
    expectedColumnsPerPart: 39,
    publicationMergeContract: { l3MustCloneL3topDeltaExactly: true },
    parts,
  });
  const planReceipt = writePlanReceipt(root, plan);
  const planSha = sha256(fs.readFileSync(plan));
  const planReceiptSha = sha256(fs.readFileSync(planReceipt));
  for (const [index, spec] of receiptSpecs.entries()) {
    writeJson(spec.receipt, {
      schema: "ff-rfi-publication-eligible-full-v5-execution-receipt",
      status: "succeeded",
      execution_mode: "async",
      started_at: "2026-07-26T00:00:00Z",
      finished_at: "2026-07-26T00:01:00Z",
      window_start_inclusive: "2023-09-01T00:00:00Z",
      window_end_exclusive: "2026-07-26T00:00:00Z",
      job_id: `mcp_ch_job_${(jobOffset + index).toString(16).padStart(32, "0")}`,
      user_shard: spec.shard,
      network_part: spec.networkPart,
      network: spec.network,
      query_sql_sha256: sha256(fs.readFileSync(spec.query)),
      query_metadata_sha256: sha256(fs.readFileSync(spec.rendererPath)),
      result_csv_path: spec.result,
      result_csv_sha256: sha256(fs.readFileSync(spec.result)),
      run_plan_sha256: planSha,
      immutable_plan_receipt_sha256: planReceiptSha,
      row_count: 1,
      byte_size: fs.statSync(spec.result).size,
      truncated: false,
      strong_gate: spec.gate,
      aggregate: {
        states: 1,
        observed_cells: 1,
        opportunities: 1,
        open_shove: 0,
        normal_three_bb_as_shove: 0,
        action_partitions_valid: true,
      },
    });
  }
  const parserValidation = writeJson(
    path.join(root, "parser-validation.json"),
    {
      schema: "ff-rfi-raw-hh-parser-validation-v2",
      status: "passed",
      validatedAt: "2026-07-26T00:02:00Z",
      source: {
        rawHandHistoriesPublished: false,
      },
      policy: {
        supportedNetworks: networks,
        acceptedMismatchTolerance: 0,
      },
      gatePassed: true,
      gateFailures: [],
      acceptedMismatches: [],
      binding: {
        planSha256: planSha,
        parserTemplateSha256: templateSha,
        parserBodySha256: parserSha,
        membershipSha256: sha256(membershipBytes),
        membershipKeysSha256,
        selectedUserIdsSha256: sha256(topIds.join(",")),
        window: {
          startInclusive: "2023-09-01T00:00:00Z",
          endExclusive: "2026-07-26T00:00:00Z",
          semantics: "half-open-utc",
        },
      },
      networks: Object.fromEntries(
        networks.map((network) => [network, parserStats()]),
      ),
    },
  );
  return {
    plan,
    planReceipt,
    membership,
    parserValidation,
    queries: [],
    renderers,
    results,
    receipts,
    output: path.join(root, "merged.csv"),
    metadata: path.join(root, "merged.json"),
  };
}

function runFixture(fixture) {
  const args = [
    `--plan=${fixture.plan}`,
    `--plan-receipt=${fixture.planReceipt}`,
    `--membership=${fixture.membership}`,
    `--parser-validation=${fixture.parserValidation}`,
    `--output=${fixture.output}`,
    `--metadata=${fixture.metadata}`,
  ];
  if (fixture.queries.length) {
    args.push(`--queries=${fixture.queries.join(",")}`);
    args.push(`--renderer-metadata=${fixture.renderers.join(",")}`);
    args.push(`--results=${fixture.results.join(",")}`);
    args.push(`--receipts=${fixture.receipts.join(",")}`);
  }
  return spawnSync(process.execPath, [merger, ...args], {
    encoding: "utf8",
    cwd: here,
  });
}

function rebindExtraReceipt(fixture, index, aggregatePatch = {}) {
  const receipt = readJson(fixture.receipts[index]);
  receipt.row_count = parseCsv(fs.readFileSync(fixture.results[index], "utf8")).length;
  receipt.byte_size = fs.statSync(fixture.results[index]).size;
  receipt.result_sha256 = sha256(fs.readFileSync(fixture.results[index]));
  Object.assign(receipt.aggregate, aggregatePatch);
  writeJson(fixture.receipts[index], receipt);
}

function rebindV5PlanAndReceipts(fixture) {
  const plan = readJson(fixture.plan);
  for (const [index, part] of plan.parts.entries()) {
    part.querySqlSha256 = sha256(fs.readFileSync(part.querySqlPath));
    part.queryMetadataSha256 = sha256(fs.readFileSync(part.queryMetadataPath));
    const rendererValue = readJson(part.queryMetadataPath);
    rendererValue.renderedSqlSha256 = part.querySqlSha256;
    writeJson(part.queryMetadataPath, rendererValue);
    part.queryMetadataSha256 = sha256(fs.readFileSync(part.queryMetadataPath));
    if (fixture.results[index]) {
      part.expectedRowCount = parseCsv(fs.readFileSync(fixture.results[index], "utf8")).length;
    }
  }
  writeJson(fixture.plan, plan);
  writePlanReceipt(path.dirname(fixture.plan), fixture.plan, fixture.planReceipt);
  const planSha = sha256(fs.readFileSync(fixture.plan));
  const planReceiptSha = sha256(fs.readFileSync(fixture.planReceipt));
  for (const [index, receiptPath] of fixture.receipts.entries()) {
    const receipt = readJson(receiptPath);
    const part = plan.parts[index];
    const resultBuffer = fs.readFileSync(part.requiredResultCsvPath);
    receipt.query_sql_sha256 = part.querySqlSha256;
    receipt.query_metadata_sha256 = part.queryMetadataSha256;
    receipt.result_csv_sha256 = sha256(resultBuffer);
    receipt.row_count = parseCsv(resultBuffer.toString("utf8")).length;
    receipt.byte_size = resultBuffer.length;
    receipt.run_plan_sha256 = planSha;
    receipt.immutable_plan_receipt_sha256 = planReceiptSha;
    writeJson(receiptPath, receipt);
  }
  const parserValidation = readJson(fixture.parserValidation);
  parserValidation.binding.planSha256 = planSha;
  writeJson(fixture.parserValidation, parserValidation);
}

function writePlanReceipt(root, planPath, destination = path.join(root, "plan.receipt.json")) {
  const planBuffer = fs.readFileSync(planPath);
  return writeJson(destination, {
    schema: "ff-rfi-publication-eligible-full-v5-immutable-plan-receipt",
    createdAt: "2026-07-26T00:00:00Z",
    status: "frozen",
    jobsSubmitted: false,
    runPlanPath: planPath,
    runPlanSha256: sha256(planBuffer),
    runPlanByteSize: planBuffer.length,
    mutationPolicy:
      "never rewrite these frozen plan bytes; any contract change requires a new versioned plan",
  });
}

function extraRow(network, shard, gate) {
  return {
    window_start: "2023-09-01",
    window_end: "2026-07-26",
    table_filter: "cnt_players = 7",
    table_size: 7,
    supplemental_network: network,
    source_user_shard_index: shard,
    source_user_shard_count: 4,
    source_gate_raw_keys: gate.raw_keys,
    source_gate_exact_id_match_keys: gate.exact_id_match_keys,
    source_gate_nominal_novel_keys: gate.nominal_novel_keys,
    source_gate_normalized_time_eligible_keys: gate.normalized_time_eligible_keys,
    source_gate_publication_eligible_keys: gate.publication_eligible_keys,
    ...canonicalRow(),
  };
}

function v5Row(gate) {
  return {
    window_start: "2023-09-01",
    window_end: "2026-07-25",
    table_filter: "cnt_players = 7",
    table_size: 7,
    cohort: "l3top",
    cohort_selected_players: 4,
    position_group: "EP",
    position_order: 1,
    position_code: 4,
    stack_bucket: "70+",
    stack_order: 1,
    hand_class: "AA",
    ...gate,
    ...canonicalRowCoverage(),
  };
}

function canonicalRow() {
  return {
    cohort: "l3top",
    cohort_selected_players: 4,
    position_group: "EP",
    position_order: 1,
    position_code: 4,
    stack_bucket: "70+",
    stack_order: 1,
    hand_class: "AA",
    ...canonicalRowCoverage(),
  };
}

function canonicalRowCoverage() {
  return {
    eligible_opportunities: 1,
    known_card_opportunities: 1,
    lookup_mismatch_opportunities: 0,
    first_observed_at: "2025-01-01 00:00:00",
    last_observed_at: "2025-01-01 00:00:00",
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

function extraParserValidation(networks) {
  return {
    schema: "ff-rfi-extra-network-overlap-validation-v1",
    networks: Object.fromEntries(networks.map((network) => [network, parserStats()])),
  };
}

function parserStats() {
  const exact = () => ({ compared: 1, matched: 1, pct: 100 });
  return {
    rows: 1,
    parsed: 1,
    parsedPct: 100,
    rejected: 0,
    reasons: {},
    coverage: {
      positions: [0, 1, 2, 3, 4, 9],
      actions: ["fold", "limp", "raise"],
      publicStacks: ["70+", "30-70", "20-30", "15-20", "10-15", "<10"],
    },
    checks: {
      cards: exact(),
      position: exact(),
      stack: exact(),
      publicStack: exact(),
      action: exact(),
      shove: exact(),
    },
  };
}

function membershipCsv() {
  return [
    "cohort,user_id,current_rank,current_league,ffev_hands,ffev,cohort_selected_players",
    "l3top,101,11,3,1,1,4",
    "l3top,102,12,3,1,1,4",
    "l3top,103,13,3,1,1,4",
    "l3top,104,14,3,1,1,4",
    "l3,101,11,3,1,1,6",
    "l3,102,12,3,1,1,6",
    "l3,103,13,3,1,1,6",
    "l3,104,14,3,1,1,6",
    "l3,105,15,3,1,1,6",
    "l3,106,16,3,1,1,6",
    "l2,201,8,2,1,1,1",
    "l1,301,3,1,1,1,1",
    "",
  ].join("\n");
}

function membershipKeys(file) {
  return sha256(
    parseCsv(fs.readFileSync(file, "utf8"))
      .map((row) => `${row.cohort}|${row.user_id}`)
      .sort()
      .join("\n"),
  );
}

function rewriteCsv(file, columns, rows) {
  const text = `${columns.join(",")}\n${
    rows.map((row) => columns.map((column) => row[column] ?? "").join(",")).join("\n")
  }\n`;
  write(file, text);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines[0]) return [];
  const header = lines[0].split(",");
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(header.map((column, index) => [column, values[index]]));
  });
}

function write(file, text) {
  fs.writeFileSync(file, text);
  return file;
}

function writeJson(file, value) {
  return write(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
