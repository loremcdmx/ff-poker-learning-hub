#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { validateCurrentBenchmarkTemplates } from "../assets/poker-preflop-benchmark/tools/source-template-readiness.mjs";
import {
  RFI_CURRENT_SUPPLEMENT_SCHEMA,
  validateRfiCurrentSupplementRelease,
} from "./rfi-current-supplement-release-validator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const SHA256 = /^[a-f0-9]{64}$/;
const postflopQueryTemplateSha256 = createHash("sha256")
  .update(fs.readFileSync(path.join(root, "assets/poker-flop-cbet-hu-lesson/research/full-history-postflop-field-cube.sql")))
  .digest("hex");
const postflopRankQueryTemplateSha256 = createHash("sha256")
  .update(fs.readFileSync(path.join(root, "assets/poker-flop-cbet-hu-lesson/research/full-history-rank-intervals.sql")))
  .digest("hex");
const vs3betQueryTemplateSha256 = createHash("sha256")
  .update(fs.readFileSync(path.join(root, "assets/poker-vs-3bet-defense-lesson/tools/vs3bet-field-cube.sql")))
  .digest("hex");
let sharedPostflopArtifactSha256 = "";

function browserContext() {
  const context = {
    console,
    document: { getElementById: () => null },
    navigator: {},
    location: { href: "http://release-gate.invalid/" },
    atob: (value) => Buffer.from(String(value), "base64").toString("binary"),
    btoa: (value) => Buffer.from(String(value), "binary").toString("base64")
  };
  context.window = context;
  context.globalThis = context;
  return vm.createContext(context);
}

function load(context, relativePath) {
  const absolutePath = path.join(root, relativePath);
  vm.runInContext(fs.readFileSync(absolutePath, "utf8"), context, { filename: absolutePath });
}

function requireReady(condition, reason) {
  if (!condition) throw new Error(reason);
}

function gate(name, check) {
  try {
    check();
    results.push({ name, ready: true, reason: "" });
  } catch (error) {
    results.push({ name, ready: false, reason: error instanceof Error ? error.message : String(error) });
  }
}

function validExecutionIdentity(value) {
  if (!value || !["async", "sync"].includes(value.executionMode) || !value.queryJobId || !SHA256.test(String(value.querySha256 || ""))) return false;
  return value.executionMode !== "sync" || value.queryJobId === `sync:${value.querySha256}`;
}

function requireCurrentCacheToken(htmlRelativePath, assetRelativePath, dataRelativePath, label) {
  const html = fs.readFileSync(path.join(root, htmlRelativePath), "utf8");
  const escapedAsset = assetRelativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...html.matchAll(new RegExp(`src=["']${escapedAsset}\\?v=([a-f0-9]{12})["']`, "g"))];
  requireReady(matches.length === 1, `${label}: data script cache token is missing or duplicated`);
  const expected = createHash("sha256")
    .update(fs.readFileSync(path.join(root, dataRelativePath)))
    .digest("hex")
    .slice(0, 12);
  requireReady(matches[0][1] === expected, `${label}: stale data script cache token`);
}

function validateRfiExact7FieldCube(field, stackData, diagnostics, fieldDataSource) {
  const stacks = ["70+", "30-70", "20-30", "15-20", "<15"];
  const rawStacks = ["70+", "30-70", "20-30", "15-20", "12-15", "10-12", "8-10", "6-8", "<6"];
  const positions = ["EP", "MP", "HJ", "CO", "BTN", "SB"];
  const cohorts = ["l3top", "l3", "l2", "l1"];
  const stackAggregation = {
    "70+": ["70+"],
    "30-70": ["30-70"],
    "20-30": ["20-30"],
    "15-20": ["15-20"],
    "<15": ["12-15", "10-12", "8-10", "6-8", "<6"],
  };
  const exactCellMinimum = 50;
  const actionKeys = ["opportunities", "regularRaise", "openShove", "limp", "foldOther"];
  const sql = fs.readFileSync(path.join(root, "assets/poker-rfi-open-lesson/tools/q_ff_rfi_field_actions.sql"), "utf8");
  const extractionSqlSha256 = createHash("sha256").update(sql).digest("hex");
  const recoveryExtractionSqlSha256 = createHash("sha256")
    .update(fs.readFileSync(path.join(root, "assets/poker-rfi-open-lesson/tools/q_ff_rfi_missing_cards_recovery.sql")))
    .digest("hex");
  const rawExtractionSqlSha256 = createHash("sha256")
    .update(fs.readFileSync(path.join(
      root,
      "assets/poker-rfi-open-lesson/tools/q_ff_rfi_raw_hh_field_actions_publication_20260726.sql",
    )))
    .digest("hex");
  const coinPartyExtractionSqlSha256 = createHash("sha256")
    .update(fs.readFileSync(path.join(root, "assets/poker-rfi-open-lesson/tools/q_ff_rfi_coin_party_publication.sql")))
    .digest("hex");
  const membershipQuerySha256 = createHash("sha256").update(rfiMembershipQueryFromTemplate(sql)).digest("hex");
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const period = field?.methodology?.period;
  const snapshot = field?.methodology?.sourceSnapshot;

  requireReady(diagnostics?.schema === "ff-rfi-field-action-coverage-v3", "RFI exact-7: coverage schema is not v3");
  requireReady(diagnostics?.status === "ready", `RFI exact-7: raw-source audit status is ${diagnostics?.status || "missing"}`);
  requireReady(diagnostics?.table === "7-max", `RFI exact-7: coverage table is ${diagnostics?.table || "missing"}, expected 7-max`);
  requireReady(field?.methodology?.exactCellMinimum === exactCellMinimum, "RFI exact-7: payload exact-cell minimum is not N=50");
  requireReady(diagnostics?.exactCellMinimum === exactCellMinimum, "RFI exact-7: coverage exact-cell minimum is not N=50");
  requireReady(field?.schema === "ff-rfi-field-actions-v3", "RFI exact-7: field schema is not v3");
  requireReady(field?.methodology?.table === "7-max", `RFI exact-7: methodology.table is ${field?.methodology?.table || "missing"}, expected 7-max`);
  requireReady(/без сглаживания/i.test(field?.methodology?.frequencyPolicy || ""), "RFI exact-7: empirical frequencies are not explicitly unsmoothed");
  requireReady(field?.recommendations?.source === null && field?.recommendations?.smoothing === null, "RFI exact-7: model/proxy recommendation fill is present");
  requireReady(Object.keys(field?.recommendations?.charts || {}).length === 0, "RFI exact-7: model recommendation charts are present");
  requireReady(Array.isArray(field?.handOrder) && field.handOrder.length === 169 && new Set(field.handOrder).size === 169, "RFI exact-7: canonical 169-hand order is incomplete");
  requireReady(same(field?.stackOrder, stacks), "RFI exact-7: five public stack bands are incomplete or reordered");
  requireReady(same(field?.positions, positions), "RFI exact-7: six exact 7-max positions are incomplete or reordered");
  requireReady(same(field?.cohortOrder, cohorts) && same(Object.keys(field?.cohorts || {}), cohorts), "RFI exact-7: four cohorts are incomplete or reordered");
  requireReady(same(field?.methodology?.stackAggregation, stackAggregation), "RFI exact-7: raw-to-public stack aggregation drift");
  requireReady(!("enabledPositions" in field), "RFI exact-7: disabled-position fallback is present");
  requireReady(!("fieldPositionsFor" in stackData) && !("isFieldStateEnabled" in stackData), "RFI exact-7: dynamic disabled-state fallback is present");
  requireReady(stackData?.publication?.ready === true, `RFI exact-7: stack publication ${stackData?.publication?.reason || "not ready"}`);
  requireReady(same(Array.from(stackData?.fieldStackKeys || []), stacks), "RFI exact-7: not every stack band is enabled");
  requireReady(same(Array.from(stackData?.fieldPositions || []), positions), "RFI exact-7: not every position is enabled");

  requireReady(/^\d{4}-\d{2}-\d{2}$/.test(period?.from || ""), "RFI exact-7: invalid source period start");
  requireReady(/^\d{4}-\d{2}-\d{2}$/.test(period?.through || ""), "RFI exact-7: invalid source period end");
  requireReady(period?.toExclusive === rfiNextDate(period.through), "RFI exact-7: period is not half-open and contiguous");
  requireReady(period?.label === `${period.from} — ${period.through}`, "RFI exact-7: period label drift");
  requireReady(Date.parse(`${period.from}T00:00:00Z`) < Date.parse(`${period.toExclusive}T00:00:00Z`), "RFI exact-7: source period is empty");
  requireReady(diagnostics?.windowStart === period.from && diagnostics?.windowEnd === period.through, "RFI exact-7: diagnostics source-window drift");
  requireReady(same(diagnostics?.stackAggregation, stackAggregation), "RFI exact-7: diagnostics stack aggregation drift");

  const publicStateCount = stacks.length * positions.length;
  const chartCount = publicStateCount * cohorts.length;
  const sourceStateCount = cohorts.length * rawStacks.length * positions.length;
  requireReady(diagnostics?.sourceRows === sourceStateCount * 169, "RFI exact-7: source is not a complete 4×9×6×169 cube");
  requireReady(diagnostics?.sourceCoverageStates === sourceStateCount, "RFI exact-7: raw-stack coverage has missing states");
  requireReady(diagnostics?.passingStates === publicStateCount, "RFI exact-7: not all 30 public states pass N=50");
  requireReady(Array.isArray(diagnostics?.failingStates) && diagnostics.failingStates.length === 0, "RFI exact-7: one or more public states fail N=50");
  requireReady(Array.isArray(diagnostics?.coverage) && diagnostics.coverage.length === publicStateCount, "RFI exact-7: public coverage has missing states");

  const publicCoverage = new Map();
  for (const state of diagnostics.coverage) {
    const key = `${state.stack}|${state.position}`;
    requireReady(stacks.includes(state.stack) && positions.includes(state.position), `RFI exact-7: unexpected public state ${key}`);
    requireReady(!publicCoverage.has(key), `RFI exact-7: duplicate public state ${key}`);
    requireReady(state.passesGate === true, `RFI exact-7: ${key} fails the exact publication gate`);
    publicCoverage.set(key, state);
  }
  requireReady(publicCoverage.size === publicStateCount, "RFI exact-7: public state keys are incomplete");

  const chartPositionOpportunities = Object.fromEntries(cohorts.map((cohort) => [
    cohort,
    Object.fromEntries(positions.map((position) => [position, 0])),
  ]));
  let checkedCharts = 0;
  for (const cohort of cohorts) {
    for (const stack of stacks) {
      for (const position of positions) {
        checkedCharts += 1;
        const stateKey = `${stack}|${position}`;
        const packed = field.cohorts?.[cohort]?.charts?.[stack]?.[position];
        const chart = stackData.fieldChart?.(cohort, stack, position);
        const stateCoverage = publicCoverage.get(stateKey)?.cohorts?.[cohort];
        requireReady(Boolean(packed && chart && stateCoverage), `RFI exact-7: missing chart or diagnostics ${cohort}|${stateKey}`);
        requireReady(packed.completeCells === 169 && chart.completeCells === 169, `RFI exact-7: ${cohort}|${stateKey} is not 169/169`);
        requireReady(
          chart.sample?.length === 169 && chart.raise?.length === 169 && chart.shove?.length === 169 && chart.limp?.length === 169,
          `RFI exact-7: ${cohort}|${stateKey} decoded cell count`,
        );
        requireReady(stateCoverage.rows === 169 && stateCoverage.complete === 169, `RFI exact-7: ${cohort}|${stateKey} coverage cells`);
        const samples = Array.from(chart.sample);
        for (let handIndex = 0; handIndex < 169; handIndex += 1) {
          const sample = samples[handIndex];
          const actions = [chart.raise[handIndex], chart.shove[handIndex], chart.limp[handIndex]];
          requireReady(Number.isSafeInteger(sample) && sample >= exactCellMinimum, `RFI exact-7: ${cohort}|${stateKey}|${field.handOrder[handIndex]} N=${sample}`);
          requireReady(actions.every((value) => Number.isSafeInteger(value) && value >= 0 && value <= 1000), `RFI exact-7: invalid frequency ${cohort}|${stateKey}|${field.handOrder[handIndex]}`);
          requireReady(actions.reduce((sum, value) => sum + value, 0) <= 1000, `RFI exact-7: frequency partition ${cohort}|${stateKey}|${field.handOrder[handIndex]}`);
        }
        const minimum = Math.min(...samples);
        const opportunities = samples.reduce((sum, value) => sum + value, 0);
        requireReady(
          packed.minimumCellOpportunities === minimum
            && chart.minimumCellOpportunities === minimum
            && stateCoverage.minN === minimum,
          `RFI exact-7: minimum N drift ${cohort}|${stateKey}`,
        );
        requireReady(chart.opportunities === opportunities, `RFI exact-7: opportunity total drift ${cohort}|${stateKey}`);
        chartPositionOpportunities[cohort][position] += opportunities;
      }
    }
  }
  requireReady(checkedCharts === chartCount, "RFI exact-7: expected 144 checked charts");
  requireReady(same(chartPositionOpportunities, snapshot?.positionOpportunities), "RFI exact-7: chart totals do not bind to source snapshot");
  requireReady(same(chartPositionOpportunities, diagnostics?.positionOpportunities), "RFI exact-7: chart totals do not bind to diagnostics");
  requireRfiPositionLadders(chartPositionOpportunities, cohorts, positions, "chart totals");

  requireReady(snapshot && snapshot.rows === diagnostics.sourceRows, "RFI exact-7: source row count provenance");
  requireReady(SHA256.test(String(snapshot?.sha256 || "")) && snapshot.sha256 === diagnostics.sourceSha256, "RFI exact-7: merged-source result hash chain");
  requireReady(field.version === `rfi-field-actions-exact7-${snapshot.sha256.slice(0, 12)}`, "RFI exact-7: version does not bind to merged-source hash");
  requireReady(SHA256.test(String(snapshot.membershipSha256 || "")), "RFI exact-7: membership export hash chain");
  requireReady(SHA256.test(String(snapshot.membershipKeysSha256 || "")), "RFI exact-7: membership key-set hash missing");
  requireReady(snapshot.membershipQuerySha256 === membershipQuerySha256, "RFI exact-7: stale membership query SHA");
  requireReady(Number.isSafeInteger(snapshot.membershipRows) && snapshot.membershipRows > 0, "RFI exact-7: membership row count");
  requireReady(snapshot.membershipExecutionMode === "async" && /^mcp_bq_job_[a-f0-9]+$/.test(snapshot.cohortJobId || ""), "RFI exact-7: membership execution identity");
  requireReady(
    snapshot.membershipReceipt?.jobId === snapshot.cohortJobId
      && snapshot.membershipReceipt?.rowCount === snapshot.membershipRows
      && Number.isSafeInteger(snapshot.membershipReceipt?.byteSize)
      && snapshot.membershipReceipt.byteSize > 0
      && rfiValidTimestamp(snapshot.membershipReceipt?.finishedAt),
    "RFI exact-7: incomplete membership execution receipt",
  );

  if (snapshot.mergeSchema === RFI_CURRENT_SUPPLEMENT_SCHEMA) {
    validateRfiCurrentSupplementRelease(snapshot, {
      structuredTemplateSha256: extractionSqlSha256,
      recoveryTemplateSha256: recoveryExtractionSqlSha256,
      rawTemplateSha256: rawExtractionSqlSha256,
      coinPartyTemplateSha256: coinPartyExtractionSqlSha256,
      membershipQuerySha256,
      sourceWindowStartInclusive: `${period.from}T00:00:00Z`,
      sourceWindowEndInclusive: `${period.through}T23:59:59.999Z`,
    });
  } else {
    requireReady(snapshot.extractionSql === "tools/q_ff_rfi_field_actions.sql", "RFI exact-7: extraction SQL path drift");
    requireReady(snapshot.extractionSqlSha256 === extractionSqlSha256, "RFI exact-7: stale extraction SQL SHA");
    requireReady(snapshot.mergeSchema === "ff-rfi-field-action-merge-v1", "RFI exact-7: unverified merge schema");
    const shards = snapshot.actionShards;
    const jobIds = snapshot.actionJobIds;
    requireReady(["contiguous-time", "immutable-user-id"].includes(snapshot.actionShardStrategy), "RFI exact-7: unsupported shard strategy");
    requireReady(Array.isArray(shards) && shards.length > 0 && Array.isArray(jobIds) && jobIds.length === shards.length, "RFI exact-7: action shard manifest");
    requireReady(new Set(jobIds).size === jobIds.length, "RFI exact-7: duplicate action query job id");
    for (const [index, shard] of shards.entries()) {
      requireReady(jobIds[index] === shard.queryJobId, `RFI exact-7: action shard ${index} job order`);
      requireReady(shard.executionMode === "async" && /^mcp_ch_job_[a-f0-9]+$/.test(shard.queryJobId || ""), `RFI exact-7: action shard ${index} execution identity`);
      requireReady(SHA256.test(String(shard.querySha256 || "")), `RFI exact-7: action shard ${index} rendered-query hash`);
      requireReady(SHA256.test(String(shard.sha256 || "")), `RFI exact-7: action shard ${index} result hash`);
      requireReady(shard.templateSha256 === extractionSqlSha256, `RFI exact-7: action shard ${index} stale query template`);
      requireReady(Number.isSafeInteger(shard.rows) && shard.rows > 0, `RFI exact-7: action shard ${index} result row count`);
      requireReady(Number.isSafeInteger(shard.shardUsers) && shard.shardUsers > 0, `RFI exact-7: action shard ${index} user count`);
      requireReady(Number.isSafeInteger(shard.sourceUniqueUsers) && shard.sourceUniqueUsers >= shard.shardUsers, `RFI exact-7: action shard ${index} source user count`);
      requireReady(rfiValidTimestamp(shard.windowStartInclusive) && rfiValidTimestamp(shard.windowEndInclusive), `RFI exact-7: action shard ${index} window`);
      requireReady(Date.parse(shard.windowStartInclusive) <= Date.parse(shard.windowEndInclusive), `RFI exact-7: action shard ${index} empty window`);
      requireReady(Number.isSafeInteger(shard.userShard?.index) && shard.userShard.index >= 0, `RFI exact-7: action shard ${index} user index`);
      requireReady(Number.isSafeInteger(shard.userShard?.count) && shard.userShard.count > 0, `RFI exact-7: action shard ${index} user shard count`);
      requireReady(SHA256.test(String(shard.userShard?.userIdsSha256 || "")), `RFI exact-7: action shard ${index} user-id-set hash`);
    }
    requireReady(new Set(shards.map((shard) => shard.querySha256)).size === shards.length, "RFI exact-7: duplicate rendered action query");
    requireReady(new Set(shards.map((shard) => shard.sha256)).size === shards.length, "RFI exact-7: duplicate action shard result");
    requireRfiShardCoverage(snapshot, period);
  }

  requireReady(same(snapshot.actionCountReconciliation?.source, snapshot.actionCountReconciliation?.aggregated), "RFI exact-7: raw/public-stack action totals differ");
  const actionTotals = snapshot.actionCountReconciliation?.source;
  requireReady(actionKeys.every((key) => Number.isSafeInteger(actionTotals?.[key]) && actionTotals[key] >= 0), "RFI exact-7: invalid action totals");
  requireReady(
    actionTotals.opportunities === actionTotals.regularRaise + actionTotals.openShove + actionTotals.limp + actionTotals.foldOther,
    "RFI exact-7: action totals do not partition opportunities",
  );
  requireReady(same(snapshot.classifierSanity, diagnostics.classifierSanity), "RFI exact-7: classifier counters do not bind payload to diagnostics");
  requireReady(same(Object.keys(snapshot.classifierSanity || {}), stacks), "RFI exact-7: classifier stacks are incomplete");
  for (const stack of stacks) {
    const sanity = snapshot.classifierSanity[stack];
    requireReady(Object.values(sanity).every((value) => Number.isSafeInteger(value) && value >= 0), `RFI exact-7: invalid classifier counters ${stack}`);
    requireReady(sanity.normalThreeBbAsShove === 0, `RFI exact-7: normal 2.5–3.5 BB raise classified as shove in ${stack}`);
    requireReady(sanity.openShoves === sanity.shoveAllinFlag + sanity.shoveEffectiveAmountOnly, `RFI exact-7: shove classifier does not reconcile in ${stack}`);
  }

  requireReady(same(snapshot.knownCards, diagnostics.knownCards), "RFI exact-7: known-card coverage does not bind payload to diagnostics");
  requireRfiKnownCardTotals(snapshot.knownCards, "snapshot known-card coverage");
  requireReady(snapshot.knownCards.known === actionTotals.opportunities, "RFI exact-7: known cards do not reconcile to source opportunities");
  requireRfiPositionLadders(diagnostics.positionOpportunities, cohorts, positions, "raw-state opportunities");
  requireRfiObservationWindow(diagnostics.knownCards, period, "coverage known-card observations");

  const lowerSource = fieldDataSource.toLowerCase();
  for (const forbidden of ["dirichlet", "empirical-bayes", "beta-binomial", "estimatedactions", "priorhands", "model fill", "model-fill"]) {
    requireReady(!lowerSource.includes(forbidden), `RFI exact-7: learner payload includes ${forbidden}`);
  }
}

function rfiMembershipQueryFromTemplate(template) {
  const start = template.indexOf("WITH eligible AS (");
  const end = template.indexOf("\n-- -------------------------------------------------------------------------\n-- ClickHouse:");
  requireReady(start >= 0 && end > start, "RFI exact-7: canonical membership query missing from extraction SQL");
  return `${template.slice(start, end).trim()}\n`;
}

function rfiNextDate(date) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  requireReady(Number.isFinite(timestamp), `RFI exact-7: invalid date ${date}`);
  return new Date(timestamp + 86400000).toISOString().slice(0, 10);
}

function rfiValidTimestamp(value) {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function requireRfiPositionLadders(values, cohorts, positions, label) {
  for (const cohort of cohorts) {
    requireReady(JSON.stringify(Object.keys(values?.[cohort] || {})) === JSON.stringify(positions), `RFI exact-7: ${label} positions missing for ${cohort}`);
    for (let index = 1; index < positions.length; index += 1) {
      const previousPosition = positions[index - 1];
      const position = positions[index];
      const previous = values[cohort][previousPosition];
      const current = values[cohort][position];
      requireReady(
        Number.isSafeInteger(previous) && Number.isSafeInteger(current) && previous > current,
        `RFI exact-7: ${label} must decrease ${cohort}|${previousPosition}=${previous}|${position}=${current}`,
      );
    }
  }
}

function requireRfiShardCoverage(snapshot, period) {
  const shards = snapshot.actionShards;
  const sourceStart = `${period.from}T00:00:00Z`;
  const sourceEnd = `${period.through}T23:59:59.999Z`;
  if (snapshot.actionShardStrategy === "contiguous-time") {
    const ordered = [...shards].sort((left, right) => left.windowStartInclusive.localeCompare(right.windowStartInclusive));
    requireReady(ordered[0].windowStartInclusive === sourceStart, "RFI exact-7: time shards do not start at source boundary");
    requireReady(ordered.at(-1).windowEndInclusive === sourceEnd, "RFI exact-7: time shards do not end at source boundary");
    for (const [index, shard] of ordered.entries()) {
      requireReady(shard.userShard.index === 0 && shard.userShard.count === 1, `RFI exact-7: time shard ${index} mixes user sharding`);
      requireReady(shard.shardUsers === shard.sourceUniqueUsers, `RFI exact-7: time shard ${index} omits source users`);
      if (index > 0) {
        requireReady(
          Date.parse(ordered[index - 1].windowEndInclusive) + 1 === Date.parse(shard.windowStartInclusive),
          `RFI exact-7: time shard gap ${index - 1}/${index}`,
        );
      }
    }
    return;
  }

  const shardCount = shards[0].userShard.count;
  const sourceUsers = shards[0].sourceUniqueUsers;
  requireReady(shardCount === shards.length, "RFI exact-7: immutable user shard count");
  const indices = shards.map((shard) => shard.userShard.index).sort((left, right) => left - right);
  requireReady(
    JSON.stringify(indices) === JSON.stringify(Array.from({ length: shardCount }, (_, index) => index)),
    "RFI exact-7: immutable user shard indices are incomplete",
  );
  requireReady(new Set(shards.map((shard) => shard.userShard.userIdsSha256)).size === shards.length, "RFI exact-7: immutable user-id sets are not unique");
  requireReady(new Set(shards.map((shard) => shard.sourceUniqueUsers)).size === 1, "RFI exact-7: immutable shards disagree on source population");
  requireReady(shards.reduce((sum, shard) => sum + shard.shardUsers, 0) === sourceUsers, "RFI exact-7: immutable shard user counts do not reconcile");
  for (const [index, shard] of shards.entries()) {
    requireReady(shard.userShard.count === shardCount, `RFI exact-7: immutable shard ${index} count drift`);
    requireReady(shard.windowStartInclusive === sourceStart && shard.windowEndInclusive === sourceEnd, `RFI exact-7: immutable shard ${index} window drift`);
  }
}

function requireRfiKnownCardTotals(totals, label) {
  requireReady(
    ["eligible", "known", "lookupMismatch"].every((key) => Number.isSafeInteger(totals?.[key]) && totals[key] >= 0),
    `RFI exact-7: ${label} has invalid counters`,
  );
  requireReady(totals.eligible > 0 && totals.known > 0 && totals.known <= totals.eligible, `RFI exact-7: ${label} numerator/denominator`);
  requireReady(totals.lookupMismatch <= totals.eligible, `RFI exact-7: ${label} lookup mismatch count`);
  requireReady(totals.pct === Number((totals.known / totals.eligible * 100).toFixed(6)), `RFI exact-7: ${label} percentage`);
  requireReady(rfiValidTimestamp(totals.firstObservedAt) && rfiValidTimestamp(totals.lastObservedAt), `RFI exact-7: ${label} observation timestamps`);
  requireReady(Date.parse(totals.firstObservedAt) <= Date.parse(totals.lastObservedAt), `RFI exact-7: ${label} observation interval`);
}

function requireRfiObservationWindow(totals, period, label) {
  const first = Date.parse(totals.firstObservedAt);
  const last = Date.parse(totals.lastObservedAt);
  requireReady(
    first <= last
      && period.from <= totals.firstObservedAt.slice(0, 10)
      && totals.lastObservedAt.slice(0, 10) <= period.through,
    `RFI exact-7: ${label} outside source period`,
  );
}

function validatePostflopFullHistory(data, label) {
  requireReady(data?.status === "ready" && data.fullHistory, `${label} status: ${data?.status || "missing"}`);
  const fullHistory = data.fullHistory;
  const meta = fullHistory.meta;
  const shardManifest = meta?.shardManifest;
  const rankSource = shardManifest?.rankSource;
  const executions = Array.isArray(shardManifest?.executions) ? shardManifest.executions : [];
  const rows = Array.isArray(fullHistory.rows) ? fullHistory.rows : [];
  requireReady(fullHistory.schemaVersion === 1, `${label}: full-history schema`);
  requireReady(SHA256.test(String(meta?.artifactSha256 || "")), `${label}: artifact SHA`);
  requireReady(meta?.windowStartInclusive === "2023-09-01" && meta?.windowEndExclusive === "2026-07-22", `${label}: full-history window`);
  requireReady(meta?.windowSemantics === "half_open_utc" && meta?.rankTiming === "exact_as_of_hand", `${label}: time/rank semantics`);
  requireReady(meta?.minimumDenominator === 50, `${label}: denominator floor`);
  requireReady(
    shardManifest?.continuous === true
      && shardManifest?.strategy === "six_month_time_windows_x_contiguous_user_partitions"
      && shardManifest?.userPartitionPolicy === "sorted_user_offsets_exact_once"
      && Array.isArray(shardManifest?.windowPartitions)
      && shardManifest.windowPartitions.length > 0,
    `${label}: shard coverage`
  );
  requireReady(shardManifest?.sourceQueryTemplateSha256 === postflopQueryTemplateSha256, `${label}: stale postflop query template`);
  requireReady(
    rankSource?.sourceQueryTemplateSha256 === postflopRankQueryTemplateSha256
      && rankSource?.querySha256 === postflopRankQueryTemplateSha256
      && validExecutionIdentity(rankSource)
      && SHA256.test(String(rankSource?.resultSha256 || ""))
      && Number.isSafeInteger(rankSource?.rowCount)
      && rankSource.rowCount > 0,
    `${label}: rank-source provenance`
  );
  requireReady(Number.isSafeInteger(shardManifest?.shardCount) && shardManifest.shardCount > 0 && executions.length === shardManifest.shardCount, `${label}: shard execution count`);
  requireReady(executions.every((execution) => (
    validExecutionIdentity(execution)
    && SHA256.test(String(execution.resultSha256 || ""))
    && Number.isSafeInteger(execution.rowCount)
    && execution.rowCount > 0
    && execution.window?.startInclusive < execution.window?.endExclusive
  )), `${label}: shard execution provenance`);
  requireReady(new Set(executions.map((execution) => execution.resultSha256)).size === executions.length, `${label}: duplicate shard result`);
  requireReady(rows.length > 0, `${label}: empty field rows`);
  const cohorts = ["league1", "league2", "league3", "novice"];
  const rowKeys = new Set();
  for (const row of rows) {
    const rowKey = [row.node, row.cohort, row.position, row.depthBand].join("|");
    requireReady(!rowKeys.has(rowKey), `${label}: duplicate ${rowKey}`);
    rowKeys.add(rowKey);
    const opportunities = Number(row.opportunities);
    requireReady(Number.isSafeInteger(opportunities) && opportunities >= 0, `${label}: invalid opportunities`);
    requireReady(row.publishable === (opportunities >= 50), `${label}: N=50 flag`);
    if (row.node === "cbet") {
      requireReady(Number(row.checksBack) + Number(row.cbets) === opportunities, `${label}: c-bet action identity`);
    } else if (row.node === "bb_response") {
      requireReady(Number(row.folds) + Number(row.calls) + Number(row.raises) + Number(row.other) === opportunities && Number(row.other) === 0, `${label}: BB response identity`);
    } else {
      requireReady(false, `${label}: unexpected node`);
    }
  }
  for (const cohort of cohorts) {
    requireReady(rows.some((row) => row.cohort === cohort && row.node === "cbet"), `${label}: missing c-bet/${cohort}`);
    requireReady(rows.some((row) => row.cohort === cohort && row.node === "bb_response"), `${label}: missing BB-response/${cohort}`);
  }
  const visibleScenarios = [
    ...["BTN", "CO", "HJ", "MP", "EP"].flatMap((position) =>
      ["<20", "20-30", "30-40", "40-70", "70+"].flatMap((depthBand) =>
        cohorts.map((cohort) => ({ node: "cbet", cohort, position, depthBand }))
      )
    ),
    ...["BTN", "CO"].flatMap((position) =>
      ["20-30", "30-40", "40-70", "70+"].flatMap((depthBand) =>
        cohorts.map((cohort) => ({ node: "bb_response", cohort, position, depthBand }))
      )
    )
  ];
  for (const scenario of visibleScenarios) {
    const key = [scenario.node, scenario.cohort, scenario.position, scenario.depthBand].join("|");
    const row = rows.find((candidate) => (
      candidate.node === scenario.node
      && candidate.cohort === scenario.cohort
      && candidate.position === scenario.position
      && candidate.depthBand === scenario.depthBand
    ));
    requireReady(Boolean(row), `${label}: missing visible scenario ${key}`);
    requireReady(Number(row?.opportunities) >= 50 && row?.publishable === true, `${label}: visible scenario below N=50 ${key}`);
  }
  return meta.artifactSha256;
}

gate("benchmark (3 урока + EV)", () => {
  const context = browserContext();
  load(context, "assets/poker-preflop-benchmark/readiness.js");
  load(context, "assets/poker-preflop-benchmark/field-data.js");
  load(context, "assets/poker-preflop-benchmark/spot-ev-data.js");
  const field = context.PokerPreflopBenchmarkData;
  const ev = context.PokerPreflopBenchmarkEvData;
  const readiness = context.PokerPreflopBenchmarkReadiness?.validateBenchmarkData?.(field, ev);
  requireReady(readiness?.ready === true, (readiness?.reasons || ["shared readiness contract unavailable"]).slice(0, 4).join("; "));
  const sourceTemplates = validateCurrentBenchmarkTemplates(root, field, ev);
  requireReady(sourceTemplates.ready === true, sourceTemplates.reasons.slice(0, 4).join("; "));
});

gate("RFI field action cube", () => {
  requireCurrentCacheToken(
    "rfi-open-position-lesson.html",
    "assets/poker-rfi-open-lesson/field-action-data.js",
    "assets/poker-rfi-open-lesson/field-action-data.js",
    "RFI exact-7"
  );
  const fieldDataSource = fs.readFileSync(path.join(root, "assets/poker-rfi-open-lesson/field-action-data.js"), "utf8");
  const diagnostics = JSON.parse(fs.readFileSync(path.join(root, "assets/poker-rfi-open-lesson/tools/field-action-coverage.json"), "utf8"));
  const context = browserContext();
  load(context, "assets/poker-kit/observed-frequency-confidence.js");
  load(context, "assets/poker-rfi-open-lesson/field-action-data.js");
  load(context, "assets/poker-rfi-open-lesson/stack-data.js");
  validateRfiExact7FieldCube(
    context.PokerRfiFieldActionData,
    context.PokerRfiStackData,
    diagnostics,
    fieldDataSource,
  );
});

gate("resteal rank-at-hand cube", () => {
  const dataPath = path.join(root, "assets/poker-resteal-lesson/data/resteal-rank-data.js");
  const dataSource = fs.readFileSync(dataPath, "utf8");
  for (const forbidden of ["/private/tmp/", "failedAttempts", "privateSql", "privateCsv", "privateJson"]) {
    requireReady(!dataSource.includes(forbidden), `public resteal payload leaks ${forbidden}`);
  }
  const context = browserContext();
  load(context, "assets/poker-kit/observed-frequency-confidence.js");
  load(context, "assets/poker-resteal-lesson/data/resteal-rank-data.js");
  load(context, "assets/poker-resteal-lesson/rank-comparison.js");
  const contract = context.PokerRestealRankDataContract;
  const data = context.PokerRestealRankData;
  const failure = contract?.failure?.(data) || "";
  requireReady(contract?.isPublishable?.(data) === true, failure || "rank data contract unavailable");
});

gate("c-bet full-history field cube", () => {
  requireCurrentCacheToken(
    "flop-cbet-hu-lesson.html",
    "assets/poker-flop-cbet-hu-lesson/data.js",
    "assets/poker-flop-cbet-hu-lesson/data.js",
    "c-bet"
  );
  const source = fs.readFileSync(path.join(root, "assets/poker-flop-cbet-hu-lesson/data.js"), "utf8");
  requireReady(!/\/private\/|SELECT\s|WITH\s+rank_intervals/i.test(source), "c-bet public payload leaks private source details");
  const context = browserContext();
  load(context, "assets/poker-flop-cbet-hu-lesson/data.js");
  const data = context.FF_FLOP_CBET_HU_DATA;
  sharedPostflopArtifactSha256 = validatePostflopFullHistory(data, "c-bet");
});

gate("check-raise full-history field cube", () => {
  requireCurrentCacheToken(
    "flop-checkraise-lesson.html",
    "assets/poker-flop-checkraise-lesson/data.js",
    "assets/poker-flop-checkraise-lesson/data.js",
    "check-raise"
  );
  const source = fs.readFileSync(path.join(root, "assets/poker-flop-checkraise-lesson/data.js"), "utf8");
  requireReady(!/\/private\/|SELECT\s|WITH\s+rank_intervals/i.test(source), "check-raise public payload leaks private source details");
  const context = browserContext();
  load(context, "assets/poker-flop-checkraise-lesson/data.js");
  const data = context.FF_POKER_FIELD_LESSON_DATA;
  const artifactSha256 = validatePostflopFullHistory(data, "check-raise");
  requireReady(artifactSha256 === sharedPostflopArtifactSha256, "c-bet and check-raise do not share one exact artifact");
});

gate("VS3 rank-at-hand field cube", () => {
  const context = browserContext();
  load(context, "assets/poker-vs-3bet-defense-lesson/data/vs3bet-field-data.js");
  load(context, "assets/poker-vs-3bet-defense-lesson/field-data-readiness.js");
  const readiness = context.FFVs3BetFieldDataReadiness;
  requireReady(readiness?.ready === true, `readiness: ${(readiness?.reasons || ["missing"]).join(", ")}`);
  requireReady(
    context.FF_VS3BET_FIELD_DATA?.meta?.provenance?.handCube?.sourceQueryTemplateSha256 === vs3betQueryTemplateSha256,
    "stale VS3 query template"
  );
});

for (const result of results) {
  console.log(`${result.ready ? "READY" : "BLOCKED"}  ${result.name}${result.reason ? ` — ${result.reason}` : ""}`);
}

const blocked = results.filter((result) => !result.ready);
if (blocked.length) {
  console.error(`\nRelease data gate blocked: ${blocked.length}/${results.length} required surfaces are not ready.`);
  process.exitCode = 1;
} else {
  console.log(`\nRelease data gate ready: ${results.length}/${results.length} required surfaces passed.`);
}
