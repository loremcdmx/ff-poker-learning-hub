import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const lessonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(lessonRoot, "../..");
const fieldDataPath = path.join(lessonRoot, "field-action-data.js");
const coveragePath = path.join(lessonRoot, "tools/field-action-coverage.json");
const extractionSqlPath = path.join(lessonRoot, "tools/q_ff_rfi_field_actions.sql");
const recoveryExtractionSqlPath = path.join(lessonRoot, "tools/q_ff_rfi_missing_cards_recovery.sql");
const rawExtractionSqlPath = path.join(
  lessonRoot,
  "tools/q_ff_rfi_raw_hh_field_actions_publication_20260726.sql",
);
const coinPartyExtractionSqlPath = path.join(
  lessonRoot,
  "tools/q_ff_rfi_coin_party_publication.sql",
);
const lessonHtmlPath = path.join(repositoryRoot, "rfi-open-position-lesson.html");
const fieldDataSource = fs.readFileSync(fieldDataPath, "utf8");
const extractionSql = fs.readFileSync(extractionSqlPath, "utf8");
const currentExtractionSqlSha256 = sha256(extractionSql);
const currentRecoveryExtractionSqlSha256 = sha256(fs.readFileSync(recoveryExtractionSqlPath, "utf8"));
const currentRawExtractionSqlSha256 = sha256(fs.readFileSync(rawExtractionSqlPath, "utf8"));
const currentCoinPartyExtractionSqlSha256 = sha256(
  fs.readFileSync(coinPartyExtractionSqlPath, "utf8"),
);
const currentMembershipQuerySha256 = sha256(membershipQueryFromTemplate(extractionSql));
const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"));

const context = { window: { atob } };
vm.runInNewContext(
  fs.readFileSync(path.join(repositoryRoot, "assets/poker-kit/observed-frequency-confidence.js"), "utf8"),
  context,
);
vm.runInNewContext(fieldDataSource, context);
vm.runInNewContext(fs.readFileSync(path.join(lessonRoot, "stack-data.js"), "utf8"), context);

const F = context.window.PokerRfiFieldActionData;
const S = context.window.PokerRfiStackData;
const exactCellMinimum = context.window.FFObservedFrequencyConfidence.MIN_EXACT_DENOMINATOR;
const expectedStacks = ["70+", "30-70", "20-30", "15-20", "<15"];
const expectedRawStacks = ["70+", "30-70", "20-30", "15-20", "12-15", "10-12", "8-10", "6-8", "<6"];
const expectedPositions = ["EP", "MP", "HJ", "CO", "BTN", "SB"];
const expectedCohorts = ["l3top", "l3", "l2", "l1"];
const expectedRecoveryNetworks = [
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
const expectedRecoveryJoin = {
  type: "exact-key",
  trackerKey: ["toUInt64(user_id)", "toString(network)", "toString(hh_id)"],
  rawKey: ["toUInt64(check_user_id)", "toString(network)", "toString(converted_hh_id)"],
};
const expectedStackAggregation = {
  "70+": ["70+"],
  "30-70": ["30-70"],
  "20-30": ["20-30"],
  "15-20": ["15-20"],
  "<15": ["12-15", "10-12", "8-10", "6-8", "<6"],
};
const actionKeys = ["opportunities", "regularRaise", "openShove", "limp", "foldOther"];
const currentSupplementSchema = "ff-rfi-field-action-current-supplement-v1";
const currentSupplementStrategy = "exact-same-window-novel-raw-l3top-supplement-with-l3-delta";
const currentSupplementWindow = {
  startInclusive: "2023-09-01T00:00:00Z",
  endExclusive: "2026-07-26T00:00:00Z",
  semantics: "half-open-utc",
};
const currentNovelSourceKinds = ["coin-party-publication-v2", "immutable-plan-raw-hh-v5"];
const currentBaseCommonKeys = [
  "sourceKind", "queryJobId", "executionMode", "startedAt", "finishedAt",
  "rendererMetadataSha256", "receiptSha256", "querySha256", "resultSha256",
  "resultRows", "resultBytes", "templateSha256", "windowStartInclusive",
  "windowEndExclusive", "userShard", "membershipSha256",
  "membershipKeysSha256", "privacy",
];
const currentStructuredKeys = [...currentBaseCommonKeys, "handClassMode", "holecardMappingSha256"];
const currentRecoveryKeys = [
  ...currentBaseCommonKeys,
  "parserGrammarsSha256", "parserNetworks", "recoveryIsDisjoint",
  "recoveryPredicate", "rawJoin", "validation",
];
const currentNovelKeys = [
  "sourceKind", "network", "userShard", "queryJobId", "executionMode",
  "startedAt", "finishedAt", "rendererMetadataSha256", "receiptSha256",
  "querySha256", "resultSha256", "resultRows", "resultBytes",
  "observedStates", "observedCells", "templateSha256",
  "parserTemplateSha256", "parserValidationSha256", "publicationGate",
  "windowStartInclusive", "windowEndExclusive", "privacy",
];

assert.notEqual(
  currentCoinPartyExtractionSqlSha256,
  currentRawExtractionSqlSha256,
  "Coin/Party publication and immutable raw-HH templates must stay distinct",
);
assert.equal(
  currentNovelTemplateSha256For("coin-party-publication-v2"),
  currentCoinPartyExtractionSqlSha256,
  "Coin/Party fixture routes to the dedicated publication template",
);
assert.equal(
  currentNovelTemplateSha256For("immutable-plan-raw-hh-v5"),
  currentRawExtractionSqlSha256,
  "immutable raw-HH fixture routes to the frozen publication template",
);
assert.throws(
  () => currentNovelTemplateSha256For("unknown-novel-source"),
  /unsupported current novel source kind/i,
  "unknown novel source kinds fail closed",
);

assert.ok(F && S, "RFI field data and stack adapter must load");
assert.equal(coverage.schema, "ff-rfi-field-action-coverage-v3", "coverage schema");
assert.equal(coverage.status, "ready", "raw-source audit must pass before publication");
assert.equal(coverage.table, "7-max", "coverage must be exact 7-max");
assert.equal(coverage.exactCellMinimum, exactCellMinimum, "coverage and payload exact-cell minimum");
assert.equal(F.schema, "ff-rfi-field-actions-v3", "RFI field schema");
assert.equal(F.methodology?.table, "7-max", "RFI field data must be exact 7-max");
assert.equal(F.methodology?.exactCellMinimum, exactCellMinimum, "runtime and payload exact-cell minimum");
assert.match(F.methodology?.frequencyPolicy || "", /без сглаживания/i, "field frequencies must remain unsmoothed");
assert.equal(F.recommendations?.source, null, "no recommendation proxy may fill the field cube");
assert.equal(F.recommendations?.smoothing, null, "no model smoothing may fill the field cube");
assert.deepEqual(Object.keys(F.recommendations?.charts || {}), [], "no model chart may fill the field cube");
assert.equal(F.handOrder.length, 169, "169 canonical hand classes");
assert.equal(new Set(F.handOrder).size, 169, "hand classes are unique");
assert.deepEqual(toPlain(F.stackOrder), expectedStacks, "five public stack bands");
assert.deepEqual(toPlain(F.positions), expectedPositions, "six exact 7-max positions");
assert.deepEqual(toPlain(F.cohortOrder), expectedCohorts, "four field cohorts");
assert.deepEqual(Object.keys(F.cohorts), expectedCohorts, "all four cohort payloads");
assert.deepEqual(toPlain(F.methodology?.stackAggregation), expectedStackAggregation, "raw-to-public stack aggregation");
assert.equal(S.publication?.ready, true, `stack adapter publication: ${S.publication?.reason || "missing"}`);
assert.equal(S.publication?.reason, "", "stack adapter has no publication warning");
assert.deepEqual(toPlain(S.fieldStackKeys), expectedStacks, "all stack bands remain enabled");
assert.deepEqual(toPlain(S.fieldPositions), expectedPositions, "all exact 7-max positions remain enabled");
assert.equal("enabledPositions" in F, false, "payload must not carry a disabled-position fallback");
assert.equal("fieldPositionsFor" in S, false, "stack adapter must not dynamically disable positions");
assert.equal("isFieldStateEnabled" in S, false, "stack adapter must not dynamically disable states");

const period = F.methodology?.period;
assert.match(period?.from || "", /^\d{4}-\d{2}-\d{2}$/, "period start");
assert.match(period?.through || "", /^\d{4}-\d{2}-\d{2}$/, "period end");
assert.equal(period?.toExclusive, nextDate(period.through), "half-open period boundary");
assert.equal(period?.label, `${period.from} — ${period.through}`, "period label");
assert.ok(Date.parse(`${period.from}T00:00:00Z`) < Date.parse(`${period.toExclusive}T00:00:00Z`), "non-empty source period");
assert.equal(coverage.windowStart, period.from, "coverage source-window start");
assert.equal(coverage.windowEnd, period.through, "coverage source-window end");
assert.deepEqual(coverage.stackAggregation, expectedStackAggregation, "coverage raw-to-public stack aggregation");

const expectedPublicStates = expectedStacks.length * expectedPositions.length;
const expectedCharts = expectedPublicStates * expectedCohorts.length;
const expectedSourceStates = expectedCohorts.length * expectedRawStacks.length * expectedPositions.length;
const expectedSourceRows = expectedSourceStates * F.handOrder.length;
assert.equal(coverage.sourceRows, expectedSourceRows, "one source row per raw stack/cohort/position/hand");
assert.equal(coverage.sourceCoverageStates, expectedSourceStates, "all raw-stack source states audited");
assert.equal(coverage.passingStates, expectedPublicStates, "all public stack-position states pass the gate");
assert.deepEqual(coverage.failingStates, [], "no public stack-position state fails the gate");
assert.equal(coverage.coverage?.length, expectedPublicStates, "coverage contains every public state");

const publicCoverage = new Map();
for (const item of coverage.coverage) {
  const key = `${item.stack}|${item.position}`;
  assert.ok(expectedStacks.includes(item.stack), `unexpected public stack ${item.stack}`);
  assert.ok(expectedPositions.includes(item.position), `unexpected public position ${item.position}`);
  assert.ok(!publicCoverage.has(key), `duplicate public coverage state ${key}`);
  publicCoverage.set(key, item);
  assert.equal(item.passesGate, true, `${key} passes the exact publication gate`);
}
assert.equal(publicCoverage.size, expectedPublicStates, "unique public coverage states");

let chartCount = 0;
const chartPositionOpportunities = emptyPositionOpportunities();
for (const cohortKey of expectedCohorts) {
  for (const stack of expectedStacks) {
    for (const position of expectedPositions) {
      chartCount += 1;
      const stateKey = `${stack}|${position}`;
      const packed = F.cohorts?.[cohortKey]?.charts?.[stack]?.[position];
      const chart = S.fieldChart(cohortKey, stack, position);
      const stateCoverage = publicCoverage.get(stateKey);
      const cohortCoverage = stateCoverage?.cohorts?.[cohortKey];
      assert.ok(packed, `${cohortKey} ${stateKey} packed chart is published`);
      assert.ok(chart, `${cohortKey} ${stateKey} decoded chart is published`);
      assert.ok(cohortCoverage, `${cohortKey} ${stateKey} diagnostics exist`);
      assert.equal(packed.completeCells, 169, `${cohortKey} ${stateKey} packed cells`);
      assert.equal(chart.completeCells, 169, `${cohortKey} ${stateKey} decoded cells`);
      assert.equal(chart.sample.length, 169, `${cohortKey} ${stateKey} sample cells`);
      assert.equal(chart.raise.length, 169, `${cohortKey} ${stateKey} raise cells`);
      assert.equal(chart.shove.length, 169, `${cohortKey} ${stateKey} shove cells`);
      assert.equal(chart.limp.length, 169, `${cohortKey} ${stateKey} limp cells`);
      assert.equal(cohortCoverage.rows, 169, `${cohortKey} ${stateKey} source rows`);
      assert.equal(cohortCoverage.complete, 169, `${cohortKey} ${stateKey} cells at N >= ${exactCellMinimum}`);

      const samples = Array.from(chart.sample);
      for (let handIndex = 0; handIndex < F.handOrder.length; handIndex += 1) {
        const hand = F.handOrder[handIndex];
        const sample = samples[handIndex];
        const raise = chart.raise[handIndex];
        const shove = chart.shove[handIndex];
        const limp = chart.limp[handIndex];
        assert.ok(Number.isSafeInteger(sample) && sample >= exactCellMinimum, `${cohortKey} ${stateKey} ${hand} N >= ${exactCellMinimum}`);
        for (const [action, value] of Object.entries({ raise, shove, limp })) {
          assert.ok(Number.isSafeInteger(value) && value >= 0 && value <= 1000, `${cohortKey} ${stateKey} ${hand} ${action} frequency`);
        }
        assert.ok(raise + shove + limp <= 1000, `${cohortKey} ${stateKey} ${hand} frequencies reconcile`);
      }
      const computedMinimum = Math.min(...samples);
      const computedOpportunities = samples.reduce((sum, value) => sum + value, 0);
      assert.equal(packed.minimumCellOpportunities, computedMinimum, `${cohortKey} ${stateKey} packed minimum N`);
      assert.equal(chart.minimumCellOpportunities, computedMinimum, `${cohortKey} ${stateKey} decoded minimum N`);
      assert.equal(cohortCoverage.minN, computedMinimum, `${cohortKey} ${stateKey} diagnostics minimum N`);
      assert.equal(chart.opportunities, computedOpportunities, `${cohortKey} ${stateKey} opportunity total`);
      assert.ok(chart.raisePct + chart.shovePct + chart.limpPct <= 100, `${cohortKey} ${stateKey} summary frequencies reconcile`);
      chartPositionOpportunities[cohortKey][position] += computedOpportunities;
    }
  }
}
assert.equal(chartCount, expectedCharts, "144 exact cohort/stack/position charts");
assert.deepEqual(chartPositionOpportunities, toPlain(F.methodology.sourceSnapshot.positionOpportunities), "chart totals bind to source snapshot position opportunities");
assert.deepEqual(chartPositionOpportunities, coverage.positionOpportunities, "chart totals bind to coverage position opportunities");
assertStrictPositionLadders(chartPositionOpportunities);

const snapshot = F.methodology?.sourceSnapshot;
assert.ok(snapshot, "source snapshot");
assert.equal(F.version, `rfi-field-actions-exact7-${snapshot.sha256.slice(0, 12)}`, "version binds to merged source hash");
assert.equal(snapshot.rows, coverage.sourceRows, "snapshot/source row count");
assert.match(snapshot.sha256 || "", /^[a-f0-9]{64}$/, "merged source SHA-256");
assert.equal(snapshot.sha256, coverage.sourceSha256, "merged source hash binds payload to coverage");
const recoveryReplacement = snapshot.mergeSchema === "ff-rfi-field-action-cohort-replacement-v1";
const currentSupplement = snapshot.mergeSchema === currentSupplementSchema;
if (currentSupplement) {
  const usesCoinPartyPublication = snapshot.actionShards.some(
    (shard) => shard.sourceKind === "coin-party-publication-v2",
  );
  const usesCurrentRawPublication = snapshot.actionShards.some(
    (shard) => shard.sourceKind === "immutable-plan-raw-hh-v5",
  );
  assert.equal(snapshot.extractionSql, null, "multi-template supplement has no misleading single extraction path");
  assert.equal(snapshot.extractionSqlSha256, null, "multi-template supplement has no misleading single extraction hash");
  const expectedCurrentTemplates = [
    {
      path: "tools/q_ff_rfi_field_actions.sql",
      sha256: currentExtractionSqlSha256,
      role: "canonical-structured-cube",
    },
    {
      path: "tools/q_ff_rfi_missing_cards_recovery.sql",
      sha256: currentRecoveryExtractionSqlSha256,
      role: "l3top-missing-card-recovery",
    },
    ...(usesCurrentRawPublication ? [{
      path: "tools/q_ff_rfi_raw_hh_field_actions_publication_20260726.sql",
      sha256: currentRawExtractionSqlSha256,
      role: "current-novel-raw-hh-supplement",
    }] : []),
    ...(usesCoinPartyPublication ? [{
      path: "tools/q_ff_rfi_coin_party_publication.sql",
      sha256: currentCoinPartyExtractionSqlSha256,
      role: "current-coin-party-publication-supplement",
    }] : []),
  ];
  assert.deepEqual(
    toPlain(snapshot.extractionTemplates),
    expectedCurrentTemplates,
    "current supplement binds every sourceKind-specific extraction template",
  );
  validateCurrentSupplement(snapshot);
} else if (recoveryReplacement) {
  assert.equal(snapshot.extractionSql, null, "multi-template replacement has no misleading single extraction path");
  assert.equal(snapshot.extractionSqlSha256, null, "multi-template replacement has no misleading single extraction hash");
  assert.deepEqual(toPlain(snapshot.extractionTemplates), [
    {
      path: "tools/q_ff_rfi_field_actions.sql",
      sha256: currentExtractionSqlSha256,
      role: "canonical-structured-cube",
    },
    {
      path: "tools/q_ff_rfi_missing_cards_recovery.sql",
      sha256: currentRecoveryExtractionSqlSha256,
      role: "l3top-missing-card-recovery",
    },
  ], "replacement binds both current extraction templates");
  validateRecoveryReplacement(snapshot);
} else {
  assert.equal(snapshot.extractionSql, "tools/q_ff_rfi_field_actions.sql", "canonical extraction SQL path");
  assert.equal(snapshot.extractionSqlSha256, currentExtractionSqlSha256, "payload uses current exact-7 extraction SQL");
}
assert.match(snapshot.membershipSha256 || "", /^[a-f0-9]{64}$/, "membership export SHA-256");
assert.match(snapshot.membershipKeysSha256 || "", /^[a-f0-9]{64}$/, "membership key-set SHA-256");
assert.equal(snapshot.membershipQuerySha256, currentMembershipQuerySha256, "membership export uses current canonical query");
assert.ok(
  [
    "ff-rfi-field-action-merge-v1",
    "ff-rfi-field-action-cohort-replacement-v1",
    currentSupplementSchema,
  ].includes(snapshot.mergeSchema),
  "verified merge, exact recovery-replacement, or current supplement schema",
);
assert.ok(Number.isSafeInteger(snapshot.membershipRows) && snapshot.membershipRows > 0, "membership row count");
assert.equal(snapshot.membershipExecutionMode, "async", "membership export execution mode");
assert.match(snapshot.cohortJobId || "", /^mcp_bq_job_[a-f0-9]+$/, "membership query job id");
assert.deepEqual(toPlain(snapshot.membershipReceipt), {
  jobId: snapshot.cohortJobId,
  rowCount: snapshot.membershipRows,
  byteSize: snapshot.membershipReceipt.byteSize,
  finishedAt: snapshot.membershipReceipt.finishedAt,
}, "membership receipt binds job id and row count");
assert.ok(Number.isSafeInteger(snapshot.membershipReceipt.byteSize) && snapshot.membershipReceipt.byteSize > 0, "membership receipt byte size");
assert.ok(validTimestamp(snapshot.membershipReceipt.finishedAt), "membership receipt completion timestamp");

assert.ok(
  currentSupplement
    ? snapshot.actionShardStrategy === currentSupplementStrategy
    : recoveryReplacement
      ? snapshot.actionShardStrategy === "exact-same-window-l3top-replacement-with-l3-delta"
      : ["contiguous-time", "immutable-user-id"].includes(snapshot.actionShardStrategy),
  "supported immutable shard or exact recovery-replacement strategy",
);
assert.ok(Array.isArray(snapshot.actionShards) && snapshot.actionShards.length > 0, "verified action shards");
assert.equal(snapshot.actionJobIds.length, snapshot.actionShards.length, "one job id per action shard");
assert.equal(new Set(snapshot.actionJobIds).size, snapshot.actionJobIds.length, "action query job ids are unique");
for (const [index, shard] of snapshot.actionShards.entries()) {
  assert.equal(snapshot.actionJobIds[index], shard.queryJobId, `action shard ${index} job order`);
  assert.equal(shard.executionMode, "async", `action shard ${index} execution mode`);
  assert.match(shard.queryJobId || "", /^mcp_ch_job_[a-f0-9]+$/, `action shard ${index} query job id`);
  assert.match(shard.querySha256 || "", /^[a-f0-9]{64}$/, `action shard ${index} rendered query hash`);
  if (currentSupplement) {
    validateCurrentActionShard(shard, index);
  } else {
    assert.match(shard.sha256 || "", /^[a-f0-9]{64}$/, `action shard ${index} result hash`);
  }
  if (!currentSupplement && shard.sourceKind === "missing-card-recovery-full-cube") {
    validateRecoveryShard(shard, index);
  } else if (!currentSupplement) {
    assert.equal(shard.templateSha256, currentExtractionSqlSha256, `action shard ${index} current structured query template`);
  }
  if (!currentSupplement) {
    assert.ok(Number.isSafeInteger(shard.rows) && shard.rows > 0, `action shard ${index} result row count`);
    assert.ok(Number.isSafeInteger(shard.shardUsers) && shard.shardUsers > 0, `action shard ${index} user count`);
    assert.ok(Number.isSafeInteger(shard.sourceUniqueUsers) && shard.sourceUniqueUsers >= shard.shardUsers, `action shard ${index} source users`);
    assert.ok(validTimestamp(shard.windowStartInclusive), `action shard ${index} window start`);
    assert.ok(validTimestamp(shard.windowEndInclusive), `action shard ${index} window end`);
    assert.ok(Date.parse(shard.windowStartInclusive) <= Date.parse(shard.windowEndInclusive), `action shard ${index} non-empty window`);
    assert.ok(Number.isSafeInteger(shard.userShard?.index) && shard.userShard.index >= 0, `action shard ${index} user index`);
    assert.ok(Number.isSafeInteger(shard.userShard?.count) && shard.userShard.count > 0, `action shard ${index} user partition count`);
    assert.match(shard.userShard?.userIdsSha256 || "", /^[a-f0-9]{64}$/, `action shard ${index} user-id-set hash`);
  }
}
assert.equal(new Set(snapshot.actionShards.map((shard) => shard.querySha256)).size, snapshot.actionShards.length, "rendered action queries are unique");
if (!currentSupplement) {
  assert.equal(new Set(snapshot.actionShards.map((shard) => shard.sha256)).size, snapshot.actionShards.length, "action shard result hashes are unique");
}
assertShardCoverage(snapshot, period);

assert.deepEqual(toPlain(snapshot.actionCountReconciliation.source), toPlain(snapshot.actionCountReconciliation.aggregated), "raw and public-stack action totals");
validateActionTotals(snapshot.actionCountReconciliation.source);
assert.deepEqual(toPlain(snapshot.classifierSanity), coverage.classifierSanity, "classifier sanity binds payload to coverage");
assert.deepEqual(Object.keys(snapshot.classifierSanity), expectedStacks, "classifier sanity covers every public stack");
for (const stack of expectedStacks) {
  const sanity = snapshot.classifierSanity[stack];
  assert.equal(sanity.normalThreeBbAsShove, 0, `${stack}: normal 2.5–3.5 BB opens are not shoves`);
  assert.equal(sanity.openShoves, sanity.shoveAllinFlag + sanity.shoveEffectiveAmountOnly, `${stack}: shove classifier reasons reconcile`);
  for (const value of Object.values(sanity)) assert.ok(Number.isSafeInteger(value) && value >= 0, `${stack}: classifier counter`);
}

assert.deepEqual(toPlain(snapshot.knownCards), coverage.knownCards, "known-card coverage binds payload to diagnostics");
validateKnownCardTotals(snapshot.knownCards);
assert.equal(snapshot.knownCards.known, snapshot.actionCountReconciliation.source.opportunities, "known cards reconcile to source opportunities");
assertStrictPositionLadders(coverage.positionOpportunities);
assertObservationWindow(coverage.knownCards, period, "coverage known-card observations");

const lessonHtml = fs.readFileSync(lessonHtmlPath, "utf8");
const cacheMatches = [...lessonHtml.matchAll(/src=["']assets\/poker-rfi-open-lesson\/field-action-data\.js\?v=([a-f0-9]{12})["']/g)];
assert.equal(cacheMatches.length, 1, "RFI HTML has one exact field-data cache token");
assert.equal(cacheMatches[0][1], sha256(fieldDataSource).slice(0, 12), "RFI HTML cache token binds to field-action-data.js bytes");
assert.ok(Buffer.byteLength(fieldDataSource, "utf8") > 100000, "published payload contains all checked charts");
for (const forbidden of ["Dirichlet", "empirical-Bayes", "beta-binomial", "estimatedActions", "priorHands", "model fill", "model-fill"]) {
  assert.ok(!fieldDataSource.toLowerCase().includes(forbidden.toLowerCase()), `learner payload excludes ${forbidden}`);
}

console.log(JSON.stringify({
  publicationReady: S.publication.ready,
  table: F.methodology.table,
  publicStates: expectedPublicStates,
  sourceStates: expectedSourceStates,
  charts: chartCount,
  cellsPerChart: F.handOrder.length,
  exactMinimum: F.methodology.exactCellMinimum,
  minimumObserved: Math.min(...coverage.coverage.flatMap((state) =>
    expectedCohorts.map((cohort) => state.cohorts[cohort].minN)
  )),
  sourceSha256: snapshot.sha256,
  extractionSqlSha256: snapshot.extractionSqlSha256,
  actionShards: snapshot.actionShards.length,
  knownCardCoveragePct: snapshot.knownCards.pct,
}));
console.log("RFI exact-7 field-action data quality: ok");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function currentNovelTemplateSha256For(sourceKind) {
  if (sourceKind === "coin-party-publication-v2") {
    return currentCoinPartyExtractionSqlSha256;
  }
  if (sourceKind === "immutable-plan-raw-hh-v5") {
    return currentRawExtractionSqlSha256;
  }
  throw new Error(`Unsupported current novel source kind: ${sourceKind}`);
}

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function projectKnownCardTotals(value) {
  return {
    eligible: value?.eligible,
    known: value?.known,
    lookupMismatch: value?.lookupMismatch,
    pct: value?.pct,
  };
}

function membershipQueryFromTemplate(template) {
  const start = template.indexOf("WITH eligible AS (");
  const end = template.indexOf("\n-- -------------------------------------------------------------------------\n-- ClickHouse:");
  assert.ok(start >= 0 && end > start, "canonical membership query is present in extraction SQL");
  return `${template.slice(start, end).trim()}\n`;
}

function nextDate(date) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  assert.ok(Number.isFinite(timestamp), `valid date ${date}`);
  return new Date(timestamp + 86400000).toISOString().slice(0, 10);
}

function validTimestamp(value) {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function emptyPositionOpportunities() {
  return Object.fromEntries(expectedCohorts.map((cohort) => [
    cohort,
    Object.fromEntries(expectedPositions.map((position) => [position, 0])),
  ]));
}

function validateCurrentSupplement(sourceSnapshot) {
  const current = sourceSnapshot.currentSupplement;
  assert.equal(current?.schema, currentSupplementSchema, "current supplement proof schema");
  assert.equal(current?.strategy, currentSupplementStrategy, "current supplement proof strategy");
  assert.equal(current?.supplementedCohort, "l3top", "current supplement changes only l3top");
  assert.equal(current?.deltaAppliedCohort, "l3", "current supplement delta is cloned only into l3");
  assert.deepEqual(toPlain(current?.window), currentSupplementWindow, "current supplement uses the approved fixed window");
  assert.equal(current?.membership?.sha256, sourceSnapshot.membershipSha256, "current membership export hash binds the payload");
  assert.equal(current?.membership?.keysSha256, sourceSnapshot.membershipKeysSha256, "current membership key hash binds the payload");
  assert.equal(current?.membership?.rows, sourceSnapshot.membershipRows, "current membership row count binds the payload");
  assert.deepEqual(Object.keys(current?.membership?.cohortCounts || {}), expectedCohorts, "current membership covers all cohorts");
  assert.equal(current?.membership?.subsetProof?.l3topIsSubsetOfL3, true, "current l3top subset proof");
  assert.equal(
    current?.membership?.subsetProof?.l3topMembers,
    current?.membership?.cohortCounts?.l3top,
    "current l3top subset size binds cohort membership",
  );
  assert.equal(
    current?.membership?.subsetProof?.l3Members,
    current?.membership?.cohortCounts?.l3,
    "current l3 size binds cohort membership",
  );

  const nestedInputs = [
    ...(current?.baseCurrent?.sourceMerges?.structured?.inputs || []),
    ...(current?.baseCurrent?.sourceMerges?.recovery?.inputs || []),
    ...(current?.supplementSource?.inputs || []),
  ];
  assert.deepEqual(toPlain(sourceSnapshot.actionShards), toPlain(nestedInputs), "root action shards equal the nested safe source projections");
  assert.deepEqual(
    toPlain(current?.baseCurrent?.replacement),
    toPlain(sourceSnapshot.replacement),
    "base recovery replacement proof is not rewritten by the supplement",
  );

  const supplementSource = current?.supplementSource;
  assert.equal(supplementSource?.sourceKind, "publication-safe-novel-raw-hh-l3top", "current supplement exposes only the publication-safe raw-HH projection");
  assert.ok(
    [
      "ff-rfi-field-action-novel-raw-supplement-merge-v1",
      "ff-rfi-field-action-novel-raw-supplement-composition-v1",
    ].includes(supplementSource?.schema),
    "current supplement is direct v5 or the approved disjoint composition",
  );
  assert.equal(supplementSource?.aggregate?.rows, 9126, "novel supplement is a complete 54 by 169 cube");
  assert.equal(supplementSource?.densification?.canonicalOutputCells, 9126, "novel supplement materializes every canonical cell");
  assert.equal(supplementSource?.densification?.absentDimensionsMaterializedAsObservedZero, true, "absent novel dimensions are explicit observed zeroes");
  assert.equal(supplementSource?.densification?.smoothingApplied, false, "novel supplement is not smoothed");
  assert.equal(supplementSource?.densification?.modeledValuesApplied, false, "novel supplement contains no modeled values");

  const top = current?.supplement?.l3topAdditive;
  const delta = current?.supplement?.l3Delta;
  assert.equal(top?.exactCells, 9126, "l3top supplement covers every exact cell");
  assert.equal(delta?.exactCells, 9126, "l3 supplement delta covers every exact cell");
  assert.equal(delta?.cloneEqualsL3top, true, "l3 delta is the exact l3top supplement clone");
  assert.equal(delta?.deltaProjectionSha256, top?.deltaProjectionSha256, "l3 and l3top deltas bind to one projection");
  assert.deepEqual(toPlain(delta?.counters), toPlain(top?.counters), "l3 and l3top supplement counters are exact clones");
  for (const proof of [top, delta]) {
    assert.equal(proof?.stateCount, 54, "supplement proof covers all raw stack-position states");
    assert.equal(proof?.nonnegativePerCell, true, "supplement is nonnegative per cell");
    assert.equal(proof?.appliedExactly, true, "supplement is applied exactly");
    assert.equal(proof?.knownCardDelta, proof?.counters?.opportunities, "supplement known-card delta reconciles");
    assert.equal(proof?.opportunitiesDelta, proof?.counters?.opportunities, "supplement opportunity delta reconciles");
    assert.equal(proof?.eligibleDelta, proof?.counters?.opportunities, "supplement eligible delta reconciles");
    assert.equal(proof?.lookupMismatchDelta, 0, "supplement introduces no card lookup mismatch");
  }
  for (const cohort of ["l2", "l1"]) {
    const preserved = current?.supplement?.preserved?.[cohort];
    assert.equal(preserved?.rows, 9126, `${cohort} supplement preservation covers every exact cell`);
    assert.equal(preserved?.exact, true, `${cohort} remains source exact`);
    assert.equal(
      preserved?.sourceProjectionSha256,
      preserved?.finalProjectionSha256,
      `${cohort} projection is byte-identical after supplement`,
    );
    assert.deepEqual(
      toPlain(preserved?.counters),
      toPlain(sourceSnapshot.cohortActionCounterTotals?.[cohort]),
      `${cohort} action totals are preserved`,
    );
  }

  const final = current?.final;
  assert.equal(final?.aggregate?.sha256, sourceSnapshot.sha256, "current final aggregate hash binds the payload");
  assert.equal(final?.aggregate?.rows, 36504, "current final aggregate has 216 by 169 cells");
  assert.equal(final?.aggregate?.windowStartInclusive, currentSupplementWindow.startInclusive, "current final aggregate start");
  assert.equal(final?.aggregate?.windowEndExclusive, currentSupplementWindow.endExclusive, "current final aggregate end");
  assert.deepEqual(toPlain(final?.aggregate?.totals), toPlain(sourceSnapshot.exactActionCounterTotals), "current final exact counters bind the payload");
  assert.deepEqual(
    toPlain(projectKnownCardTotals(final?.aggregate?.knownCards)),
    toPlain(projectKnownCardTotals(sourceSnapshot.knownCards)),
    "current final known-card totals bind the payload",
  );
  assert.deepEqual(toPlain(final?.aggregate?.cube), {
    rowCount: 36504,
    stateCount: 216,
    handClassesPerState: 169,
    coverageReconciled: true,
  }, "current final cube is complete");
  assert.deepEqual(toPlain(final?.privacy), {
    aggregateOnly: true,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  }, "current final payload remains aggregate-only");
}

function validateCurrentActionShard(shard, index) {
  const novel = currentNovelSourceKinds.includes(shard.sourceKind);
  const expectedKeys = novel
    ? currentNovelKeys
    : shard.sourceKind === "structured-field-action"
      ? currentStructuredKeys
      : currentRecoveryKeys;
  assert.ok(
    novel || ["structured-field-action", "missing-card-recovery-full-cube"].includes(shard.sourceKind),
    `current action shard ${index} has an approved source kind`,
  );
  assert.deepEqual(
    Object.keys(shard).sort(),
    [...expectedKeys].sort(),
    `current action shard ${index} is an exact publication-safe projection`,
  );
  for (const [label, value] of [
    ["renderer metadata", shard.rendererMetadataSha256],
    ["receipt", shard.receiptSha256],
    ["rendered query", shard.querySha256],
    ["result", shard.resultSha256],
    ["query template", shard.templateSha256],
    ...(novel ? [
      ["parser template", shard.parserTemplateSha256],
      ["parser validation", shard.parserValidationSha256],
    ] : []),
  ]) {
    assert.match(value || "", /^[a-f0-9]{64}$/, `current action shard ${index} ${label} hash`);
  }
  assert.ok(validTimestamp(shard.startedAt), `current action shard ${index} start timestamp`);
  assert.ok(validTimestamp(shard.finishedAt), `current action shard ${index} finish timestamp`);
  assert.ok(Date.parse(shard.startedAt) <= Date.parse(shard.finishedAt), `current action shard ${index} receipt order`);
  assert.ok(
    Date.parse(shard.finishedAt) >= Date.parse(currentSupplementWindow.endExclusive),
    `current action shard ${index} finished after the closed source window`,
  );
  assert.equal(shard.windowStartInclusive, currentSupplementWindow.startInclusive, `current action shard ${index} fixed start`);
  assert.equal(shard.windowEndExclusive, currentSupplementWindow.endExclusive, `current action shard ${index} fixed end`);
  assert.ok(Number.isSafeInteger(shard.resultRows), `current action shard ${index} result rows`);
  assert.ok(
    novel ? shard.resultRows >= 0 : shard.resultRows > 0,
    `current action shard ${index} permits zero rows only for a novel raw-HH execution`,
  );
  assert.ok(Number.isSafeInteger(shard.resultBytes) && shard.resultBytes > 0, `current action shard ${index} result bytes`);
  assert.deepEqual(
    Object.keys(shard.userShard || {}).sort(),
    ["count", "index", "userIdsSha256", "users"],
    `current action shard ${index} immutable user-shard keys`,
  );
  assert.ok(Number.isSafeInteger(shard.userShard.index) && shard.userShard.index >= 0, `current action shard ${index} user index`);
  assert.ok(
    Number.isSafeInteger(shard.userShard.count)
      && shard.userShard.count > 0
      && shard.userShard.index < shard.userShard.count,
    `current action shard ${index} user partition count`,
  );
  assert.ok(Number.isSafeInteger(shard.userShard.users) && shard.userShard.users > 0, `current action shard ${index} user count`);
  assert.match(shard.userShard.userIdsSha256 || "", /^[a-f0-9]{64}$/, `current action shard ${index} user-id-set hash`);

  if (novel) {
    assert.equal(
      shard.templateSha256,
      currentNovelTemplateSha256For(shard.sourceKind),
      `current novel shard ${index} uses its sourceKind-specific query template`,
    );
    assert.ok(Number.isSafeInteger(shard.observedStates) && shard.observedStates >= 0, `current novel shard ${index} observed states`);
    assert.ok(Number.isSafeInteger(shard.observedCells) && shard.observedCells >= 0, `current novel shard ${index} observed cells`);
    assert.deepEqual(toPlain(shard.privacy), {
      aggregateOnly: true,
      noRawHandHistories: true,
      noPlayerLevelRows: true,
      noUserIds: true,
    }, `current novel shard ${index} privacy projection`);
    return;
  }

  assert.equal(shard.membershipSha256, snapshot.membershipSha256, `current base shard ${index} membership hash`);
  assert.equal(shard.membershipKeysSha256, snapshot.membershipKeysSha256, `current base shard ${index} membership keys hash`);
  assert.deepEqual(toPlain(shard.privacy), {
    aggregateOnly: true,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  }, `current base shard ${index} privacy projection`);
  if (shard.sourceKind === "structured-field-action") {
    assert.equal(shard.templateSha256, currentExtractionSqlSha256, `current structured shard ${index} query template`);
    assert.equal(shard.handClassMode, "joined-holecards-str", `current structured shard ${index} hand-class mode`);
    assert.equal(shard.holecardMappingSha256, null, `current structured shard ${index} does not expose a synthetic card map`);
  } else {
    assert.equal(shard.templateSha256, currentRecoveryExtractionSqlSha256, `current recovery shard ${index} query template`);
    assert.equal(shard.recoveryIsDisjoint, true, `current recovery shard ${index} is disjoint`);
    assert.equal(shard.recoveryPredicate, "latest structured_hand_class = ''", `current recovery shard ${index} predicate`);
    assert.deepEqual(toPlain(shard.parserNetworks), expectedRecoveryNetworks, `current recovery shard ${index} parser networks`);
    assert.deepEqual(toPlain(shard.rawJoin), expectedRecoveryJoin, `current recovery shard ${index} exact raw-HH join`);
  }
}

function validateRecoveryReplacement(sourceSnapshot) {
  const replacement = sourceSnapshot.replacement;
  assert.equal(replacement?.strategy, "exact-same-window-l3top-replacement-with-l3-delta", "exact recovery-replacement strategy");
  assert.equal(replacement?.replacedCohort, "l3top", "only l3top is replaced");
  assert.equal(replacement?.deltaAppliedCohort, "l3", "the exact l3top delta is applied to whole l3");
  assert.equal(replacement?.membershipSubsetProof?.l3topIsSubsetOfL3, true, "l3top subset proof");
  assert.ok(replacement.membershipSubsetProof.l3topMembers > 0, "non-empty l3top subset");
  assert.ok(
    replacement.membershipSubsetProof.l3Members >= replacement.membershipSubsetProof.l3topMembers,
    "whole l3 contains l3top",
  );
  assert.equal(replacement.l3top?.structuredRows, 9126, "structured l3top has 54 by 169 cells");
  assert.equal(replacement.l3top?.recoveryRows, 9126, "recovered l3top has 54 by 169 cells");
  for (const key of ["structuredProjectionSha256", "recoveryProjectionSha256", "finalProjectionSha256"]) {
    assert.match(replacement.l3top?.[key] || "", /^[a-f0-9]{64}$/, `l3top ${key}`);
  }
  assert.equal(replacement.l3top?.recoveryDominatesExactly, true, "recovery l3top dominates exactly");
  assert.equal(
    replacement.l3top?.recoveryProjectionSha256,
    replacement.l3top?.finalProjectionSha256,
    "final l3top projection is the recovered projection",
  );
  assert.equal(replacement.l3Delta?.exactCells, 9126, "whole-l3 delta covers every exact cell");
  assert.equal(replacement.l3Delta?.stateCount, 54, "whole-l3 delta covers every raw-stack state");
  assert.equal(replacement.l3Delta?.nonnegativePerCell, true, "whole-l3 delta is nonnegative per cell");
  assert.equal(replacement.l3Delta?.appliedExactly, true, "whole-l3 delta is applied exactly");
  assert.equal(replacement.l3Delta?.eligibleCoverageChanged, false, "recovery does not rewrite eligible coverage");
  assert.equal(
    replacement.l3Delta?.knownCardDelta,
    replacement.l3Delta?.counters?.opportunities,
    "known-card and opportunity deltas reconcile",
  );
  for (const value of Object.values(replacement.l3Delta?.counters || {})) {
    assert.ok(Number.isSafeInteger(value) && value >= 0, "recovery delta counters are nonnegative integers");
  }
  for (const cohort of ["l2", "l1"]) {
    const preserved = replacement.preserved?.[cohort];
    assert.equal(preserved?.rows, 9126, `${cohort} preserved exact-cell rows`);
    assert.equal(preserved?.exact, true, `${cohort} preserved exactly`);
    assert.match(preserved?.sourceProjectionSha256 || "", /^[a-f0-9]{64}$/, `${cohort} source projection hash`);
    assert.equal(
      preserved?.sourceProjectionSha256,
      preserved?.finalProjectionSha256,
      `${cohort} final projection stays source-exact`,
    );
  }
}

function validateRecoveryShard(shard, index) {
  assert.equal(shard.rendererSchema, "ff-rfi-missing-card-recovery-render-v1", `recovery shard ${index} renderer schema`);
  assert.equal(shard.rendererMode, "full-cube", `recovery shard ${index} renderer mode`);
  for (const [label, value] of [
    ["renderer metadata", shard.rendererMetadataSha256],
    ["receipt", shard.receiptSha256],
    ["rendered query", shard.querySha256],
    ["query template", shard.templateSha256],
    ["result", shard.sha256],
    ["parser grammars", shard.parserGrammarsSha256],
    ["selected membership keys", shard.selectedMembershipKeysSha256],
  ]) {
    assert.match(value || "", /^[a-f0-9]{64}$/, `recovery shard ${index} ${label} hash`);
  }
  assert.equal(shard.templateSha256, currentRecoveryExtractionSqlSha256, `recovery shard ${index} current query template`);
  assert.equal(shard.receiptRowCount, shard.rows, `recovery shard ${index} result rows reconcile to receipt`);
  assert.ok(Number.isSafeInteger(shard.receiptBytes) && shard.receiptBytes > 0, `recovery shard ${index} receipt bytes`);
  assert.equal(shard.sourceTable, "analytics.int_tracker_hand_joined", `recovery shard ${index} structured source`);
  assert.deepEqual(toPlain(shard.sourceTables), [
    "analytics.int_tracker_hand_joined",
    "analytics.stg_hh_texts__hh_texts",
  ], `recovery shard ${index} exact source tables`);
  assert.equal(shard.handClassMode, "structured-or-validated-raw-when-empty-v1", `recovery shard ${index} hand-class mode`);
  assert.equal(shard.recoveryPredicate, "latest structured_hand_class = ''", `recovery shard ${index} disjoint predicate`);
  assert.equal(shard.recoveryIsDisjoint, true, `recovery shard ${index} disjoint flag`);
  assert.deepEqual(toPlain(shard.rawJoin), expectedRecoveryJoin, `recovery shard ${index} exact join key`);
  assert.deepEqual(toPlain(shard.parserNetworks), expectedRecoveryNetworks, `recovery shard ${index} nine-network whitelist`);
  assert.deepEqual(Object.keys(shard.selectedCohortCounts || {}), ["l3top"], `recovery shard ${index} l3top-only selection`);
  assert.equal(shard.selectedMembershipRows, shard.selectedCohortCounts.l3top, `recovery shard ${index} selected membership rows`);
  assert.ok(shard.selectedUniqueUsers > 0 && shard.selectedUniqueUsers <= shard.selectedMembershipRows, `recovery shard ${index} selected users`);

  const validation = shard.validation;
  assert.equal(validation?.schema, "ff-rfi-missing-card-recovery-validation-v1", `recovery shard ${index} validation schema`);
  for (const [label, value] of [
    ["manifest", validation?.manifestSha256],
    ["renderer metadata", validation?.rendererMetadataSha256],
    ["rendered query", validation?.renderedSqlSha256],
    ["query template", validation?.queryTemplateSha256],
    ["result", validation?.resultSha256],
    ["receipt", validation?.receiptSha256],
  ]) {
    assert.match(value || "", /^[a-f0-9]{64}$/, `recovery shard ${index} validation ${label} hash`);
  }
  assert.equal(validation.queryTemplateSha256, currentRecoveryExtractionSqlSha256, `recovery shard ${index} validation template`);
  assert.match(validation.queryJobId || "", /^(?:mcp_ch_job_[a-f0-9]{32}|sync:[a-f0-9]{64})$/, `recovery shard ${index} validation execution`);
  assert.equal(
    validation.queryExecutionMode,
    String(validation.queryJobId).startsWith("sync:") ? "sync" : "async",
    `recovery shard ${index} validation execution mode`,
  );
  if (validation.queryExecutionMode === "sync") {
    assert.equal(validation.receiptSchema, "ff-rfi-card-parser-validation-receipt-v1", `recovery shard ${index} sync receipt schema`);
    assert.equal(validation.queryJobId, `sync:${validation.renderedSqlSha256}`, `recovery shard ${index} sync query identity`);
  }
  assert.deepEqual(toPlain(validation.window), {
    startInclusive: "2026-07-01T00:00:00Z",
    endExclusive: "2026-07-02T00:00:00Z",
    semantics: "half-open-utc",
  }, `recovery shard ${index} validation window`);
  assert.equal(validation.resultRowCount, expectedRecoveryNetworks.length, `recovery shard ${index} validation result rows`);
  assert.equal(validation.receiptRowCount, expectedRecoveryNetworks.length, `recovery shard ${index} validation receipt rows`);
  assert.equal(validation.receiptBytes, validation.resultBytes, `recovery shard ${index} validation bytes reconcile`);
  assert.deepEqual(Object.keys(validation.networks || {}).sort(), [...expectedRecoveryNetworks].sort(), `recovery shard ${index} validation network rows`);
  for (const network of expectedRecoveryNetworks) {
    const counters = validation.networks[network];
    assert.ok(counters.trackerKnownWithRaw > 0, `${recoveryShardLabel(index, network)} overlap sample`);
    assert.equal(counters.classFailures, 0, `${recoveryShardLabel(index, network)} zero mismatches`);
    assert.equal(counters.classMatches, counters.trackerKnownWithRaw, `${recoveryShardLabel(index, network)} all known classes match`);
    assert.equal(counters.matchPctTrackerKnown, 100, `${recoveryShardLabel(index, network)} exact match rate`);
    assert.equal(counters.validationPassed, 1, `${recoveryShardLabel(index, network)} validation gate`);
  }
  assert.ok(validation.networks.iPoker.trackerMissingRecovered > 0, `recovery shard ${index} validates iPoker recovery`);
  assert.equal(validation.totals.classFailures, 0, `recovery shard ${index} total zero mismatches`);
  assert.equal(validation.rawHandHistoriesPublished, false, `recovery shard ${index} raw hands stay private`);
  assert.equal(validation.personalIdentifiersPublished, false, `recovery shard ${index} identities stay private`);
}

function recoveryShardLabel(index, network) {
  return `recovery shard ${index} ${network}`;
}

function assertStrictPositionLadders(positionOpportunities) {
  for (const cohort of expectedCohorts) {
    assert.deepEqual(Object.keys(positionOpportunities[cohort]), expectedPositions, `${cohort}: exact position order`);
    for (let index = 1; index < expectedPositions.length; index += 1) {
      const previousPosition = expectedPositions[index - 1];
      const position = expectedPositions[index];
      const previous = positionOpportunities[cohort][previousPosition];
      const current = positionOpportunities[cohort][position];
      assert.ok(
        Number.isSafeInteger(previous) && Number.isSafeInteger(current) && previous > current,
        `${cohort}: opportunities must strictly decrease ${previousPosition}=${previous} > ${position}=${current}`,
      );
    }
  }
}

function assertShardCoverage(snapshot, sourcePeriod) {
  const shards = snapshot.actionShards;
  if (snapshot.actionShardStrategy === currentSupplementStrategy) {
    const current = snapshot.currentSupplement;
    const structured = shards.filter((shard) => shard.sourceKind === "structured-field-action");
    const recovery = shards.filter((shard) => shard.sourceKind === "missing-card-recovery-full-cube");
    const novel = shards.filter((shard) => currentNovelSourceKinds.includes(shard.sourceKind));
    assert.ok(structured.length > 0, "current supplement has structured source executions");
    assert.ok(recovery.length > 0, "current supplement has disjoint recovery executions");
    assert.ok(novel.length > 0, "current supplement has novel raw-HH executions");
    assert.equal(structured.length + recovery.length + novel.length, shards.length, "current supplement contains only approved sources");
    assert.deepEqual(
      toPlain(shards),
      toPlain([
        ...current.baseCurrent.sourceMerges.structured.inputs,
        ...current.baseCurrent.sourceMerges.recovery.inputs,
        ...current.supplementSource.inputs,
      ]),
      "current root shard list is the exact flattened nested provenance",
    );
    assertCompleteCurrentShardGroup(structured, "current structured");
    assertCompleteCurrentShardGroup(recovery, "current recovery");
    for (const network of new Set(novel.map((shard) => shard.network))) {
      assertCompleteCurrentShardGroup(
        novel.filter((shard) => shard.network === network),
        `current novel ${network}`,
      );
    }
    return;
  }
  if (snapshot.actionShardStrategy === "exact-same-window-l3top-replacement-with-l3-delta") {
    const structured = shards.filter((shard) => shard.sourceKind !== "missing-card-recovery-full-cube");
    const recovery = shards.filter((shard) => shard.sourceKind === "missing-card-recovery-full-cube");
    assert.equal(structured.length + recovery.length, shards.length, "replacement has only structured and recovery inputs");
    assertInferredShardCoverage(structured, sourcePeriod, "structured");
    assertInferredShardCoverage(recovery, sourcePeriod, "recovery");
    assert.equal(
      new Set(recovery.map((shard) => shard.selectedMembershipKeysSha256)).size,
      1,
      "recovery shards share one selected membership key set",
    );
    assert.equal(
      new Set(recovery.map((shard) => JSON.stringify([
        shard.selectedMembershipRows,
        shard.selectedUniqueUsers,
        shard.selectedCohortCounts,
      ]))).size,
      1,
      "recovery shards share one selected membership population",
    );
    return;
  }
  const sourceStart = `${sourcePeriod.from}T00:00:00Z`;
  const sourceEnd = `${sourcePeriod.through}T23:59:59.999Z`;
  if (snapshot.actionShardStrategy === "contiguous-time") {
    const ordered = [...shards].sort((left, right) => left.windowStartInclusive.localeCompare(right.windowStartInclusive));
    assert.equal(ordered[0].windowStartInclusive, sourceStart, "time shards start at source boundary");
    assert.equal(ordered.at(-1).windowEndInclusive, sourceEnd, "time shards end at source boundary");
    for (const [index, shard] of ordered.entries()) {
      assert.equal(shard.userShard.index, 0, `time shard ${index} user index`);
      assert.equal(shard.userShard.count, 1, `time shard ${index} user partition count`);
      assert.equal(shard.shardUsers, shard.sourceUniqueUsers, `time shard ${index} covers all source users`);
      if (index > 0) {
        assert.equal(
          Date.parse(ordered[index - 1].windowEndInclusive) + 1,
          Date.parse(shard.windowStartInclusive),
          `time shards ${index - 1}/${index} are contiguous`,
        );
      }
    }
    return;
  }

  const shardCount = shards[0].userShard.count;
  const sourceUsers = shards[0].sourceUniqueUsers;
  assert.equal(shardCount, shards.length, "every immutable user shard is present");
  assert.deepEqual(
    toPlain(shards.map((shard) => shard.userShard.index).sort((left, right) => left - right)),
    Array.from({ length: shardCount }, (_, index) => index),
    "immutable user-shard indices cover 0..N-1",
  );
  assert.equal(new Set(shards.map((shard) => shard.userShard.userIdsSha256)).size, shards.length, "immutable user-id sets are unique");
  assert.equal(new Set(shards.map((shard) => shard.sourceUniqueUsers)).size, 1, "immutable shards share one source population");
  assert.equal(shards.reduce((sum, shard) => sum + shard.shardUsers, 0), sourceUsers, "immutable shard user counts reconcile");
  for (const [index, shard] of shards.entries()) {
    assert.equal(shard.userShard.count, shardCount, `immutable shard ${index} partition count`);
    assert.equal(shard.windowStartInclusive, sourceStart, `immutable shard ${index} source start`);
    assert.equal(shard.windowEndInclusive, sourceEnd, `immutable shard ${index} source end`);
  }
}

function assertCompleteCurrentShardGroup(shards, label) {
  const shardCount = shards[0].userShard.count;
  assert.equal(shards.length, shardCount, `${label} includes every immutable user shard`);
  assert.deepEqual(
    toPlain(shards.map((shard) => shard.userShard.index).sort((left, right) => left - right)),
    Array.from({ length: shardCount }, (_, index) => index),
    `${label} user-shard indices cover 0..N-1`,
  );
  assert.equal(new Set(shards.map((shard) => shard.userShard.userIdsSha256)).size, shardCount, `${label} user sets are disjoint`);
  for (const shard of shards) {
    assert.equal(shard.userShard.count, shardCount, `${label} partition count is stable`);
    assert.equal(shard.windowStartInclusive, currentSupplementWindow.startInclusive, `${label} fixed start`);
    assert.equal(shard.windowEndExclusive, currentSupplementWindow.endExclusive, `${label} fixed end`);
  }
}

function assertInferredShardCoverage(shards, sourcePeriod, label) {
  assert.ok(shards.length > 0, `${label} source group is non-empty`);
  const sourceStart = `${sourcePeriod.from}T00:00:00Z`;
  const sourceEnd = `${sourcePeriod.through}T23:59:59.999Z`;
  const ordered = [...shards].sort((left, right) => left.windowStartInclusive.localeCompare(right.windowStartInclusive));
  const sameWindow = ordered.every((shard) =>
    shard.windowStartInclusive === sourceStart && shard.windowEndInclusive === sourceEnd
  );
  if (sameWindow) {
    const shardCount = ordered[0].userShard.count;
    const sourceUsers = ordered[0].sourceUniqueUsers;
    assert.equal(shardCount, ordered.length, `${label} immutable shard count`);
    assert.equal(new Set(ordered.map((shard) => shard.userShard.userIdsSha256)).size, ordered.length, `${label} immutable user sets`);
    assert.equal(new Set(ordered.map((shard) => shard.sourceUniqueUsers)).size, 1, `${label} source population`);
    assert.equal(ordered.reduce((sum, shard) => sum + shard.shardUsers, 0), sourceUsers, `${label} user counts reconcile`);
    assert.deepEqual(
      ordered.map((shard) => shard.userShard.index).sort((left, right) => left - right),
      Array.from({ length: shardCount }, (_, index) => index),
      `${label} immutable shard indices`,
    );
    return;
  }
  assert.equal(ordered[0].windowStartInclusive, sourceStart, `${label} time shards start at source boundary`);
  assert.equal(ordered.at(-1).windowEndInclusive, sourceEnd, `${label} time shards end at source boundary`);
  for (const [index, shard] of ordered.entries()) {
    assert.equal(shard.userShard.index, 0, `${label} time shard ${index} user index`);
    assert.equal(shard.userShard.count, 1, `${label} time shard ${index} user partition count`);
    assert.equal(shard.shardUsers, shard.sourceUniqueUsers, `${label} time shard ${index} covers all users`);
    if (index > 0) {
      assert.equal(
        Date.parse(ordered[index - 1].windowEndInclusive) + 1,
        Date.parse(shard.windowStartInclusive),
        `${label} time shards ${index - 1}/${index} are contiguous`,
      );
    }
  }
}

function validateActionTotals(totals) {
  for (const key of actionKeys) assert.ok(Number.isSafeInteger(totals[key]) && totals[key] >= 0, `integer action total ${key}`);
  assert.ok(totals.opportunities > 0, "non-empty action source");
  assert.equal(
    totals.opportunities,
    totals.regularRaise + totals.openShove + totals.limp + totals.foldOther,
    "source action partition",
  );
}

function validateKnownCardTotals(totals) {
  for (const key of ["eligible", "known", "lookupMismatch"]) {
    assert.ok(Number.isSafeInteger(totals[key]) && totals[key] >= 0, `integer known-card total ${key}`);
  }
  assert.ok(totals.eligible > 0 && totals.known > 0 && totals.known <= totals.eligible, "known-card numerator and denominator");
  assert.ok(totals.lookupMismatch <= totals.eligible, "lookup mismatches do not exceed eligible opportunities");
  assert.equal(totals.pct, Number((totals.known / totals.eligible * 100).toFixed(6)), "known-card percentage");
  assert.ok(validTimestamp(totals.firstObservedAt), "known-card first observation");
  assert.ok(validTimestamp(totals.lastObservedAt), "known-card last observation");
  assert.ok(Date.parse(totals.firstObservedAt) <= Date.parse(totals.lastObservedAt), "known-card observation interval");
}

function assertObservationWindow(totals, sourcePeriod, label) {
  const first = Date.parse(totals.firstObservedAt);
  const last = Date.parse(totals.lastObservedAt);
  assert.ok(
    first <= last
      && sourcePeriod.from <= totals.firstObservedAt.slice(0, 10)
      && totals.lastObservedAt.slice(0, 10) <= sourcePeriod.through,
    `${label} stay inside source period`,
  );
}
