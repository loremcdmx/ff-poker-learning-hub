import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  validateRfiCurrentSupplementRelease,
} from "../../../scripts/rfi-current-supplement-release-validator.mjs";

const lessonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const confidenceSource = fs.readFileSync(
  path.resolve(lessonRoot, "../poker-kit/observed-frequency-confidence.js"),
  "utf8",
);
const stackSource = fs.readFileSync(path.join(lessonRoot, "stack-data.js"), "utf8");
const stacks = ["70+", "30-70", "20-30", "15-20", "<15"];
const positions = ["EP", "MP", "HJ", "CO", "BTN", "SB"];
const cohorts = ["l3top", "l3", "l2", "l1"];
const networks = [
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
const historicalNetworks = [
  "888Poker",
  "GGNetwork",
  "PokerStars",
  "PokerStars(FR-ES-PT)",
  "Winamax.fr",
  "WPN",
  "iPoker",
];
const historicalChecks = ["cards", "position", "stack", "publicStack", "action", "shove"];
const compositionCounters = [
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
];
const structuredTemplateSha256 = hash("a");
const recoveryTemplateSha256 = hash("b");
const rawTemplateSha256 =
  "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f";
const coinPartyTemplateSha256 = hash("d");
const coinPartyNetworks = ["CoinPoker", "PartyPoker"];
const coinPartyParserTemplateSha256 =
  "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f";
const coinPartyParserImplementationSha256 =
  "673a2d5967625a6874e5acade450269fc30677cb786418a85af593b77e407d3e";
const coinPartyGrammarSha256 =
  "e570a7271fd8dbff3c90bb840335f28eda10f63094065c57b8c4c328170e8f06";
const coinPartyMembershipSha256 =
  "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d";
const coinPartyUserIdsSha256 =
  "322fabfabb4ab4b6359c6720125dfb534525559e854c95fff79b9c1b11ccc771";
const coinPartyParserSource = {
  inputSha256: "2d1e2323a6d497b85b94d6278249dc3e9d78cce2c52477936021d5b9046592f6",
  inputBytes: 2859078,
  rows: 1366,
  uniqueUsers: 22,
  firstObservedAt: "2026-02-08T00:19:28Z",
  lastObservedAt: "2026-07-20T20:39:15Z",
  rawHandHistoriesPublished: false,
  personalIdentifiersPublished: false,
};
const coinPartyGateTotals = {
  CoinPoker: {
    raw_keys: 651627,
    exact_id_match_keys: 630348,
    nominal_novel_keys: 21279,
    normalized_time_eligible_keys: 19759,
    publication_eligible_keys: 19759,
  },
  PartyPoker: {
    raw_keys: 198324,
    exact_id_match_keys: 190491,
    nominal_novel_keys: 7833,
    normalized_time_eligible_keys: 7828,
    publication_eligible_keys: 7828,
  },
};

const replacementData = makeData(makeReplacementSnapshot());
assert.deepEqual(
  plain(loadPublication(replacementData)),
  { ready: true, reason: "" },
  "strict recovery replacement provenance is publishable",
);

for (const [label, mutate] of [
  ["missing validation manifest hash", (data) => { delete recoveryShard(data).validation.manifestSha256; }],
  ["stale validation template hash", (data) => { recoveryShard(data).validation.queryTemplateSha256 = structuredTemplateSha256; }],
  ["missing validation result hash", (data) => { delete recoveryShard(data).validation.resultSha256; }],
  ["substituted exact raw join key", (data) => { recoveryShard(data).rawJoin.rawKey[2] = "toString(hh_id)"; }],
  ["substituted parser network", (data) => { recoveryShard(data).parserNetworks[8] = "UnknownNetwork"; }],
  ["nonzero parser mismatch", (data) => { recoveryShard(data).validation.networks.Chico.classFailures = 1; }],
  ["missing exact replacement proof", (data) => { delete data.methodology.sourceSnapshot.replacement.l3top.recoveryDominatesExactly; }],
]) {
  const candidate = clone(replacementData);
  mutate(candidate);
  assert.equal(loadPublication(candidate).ready, false, label);
}

const compositionData = makeData(makeCompositionSnapshot());
assert.deepEqual(
  plain(loadPublication(compositionData)),
  { ready: true, reason: "" },
  "the adjacent historical raw-HH plus current recovery-adjusted composition is publishable",
);

for (const [label, mutate] of [
  ["missing historical query hash", (data) => {
    delete data.methodology.sourceSnapshot.composition.historical.execution.querySha256;
  }],
  ["stale historical query template", (data) => {
    data.methodology.sourceSnapshot.composition.historical.execution.queryTemplateSha256 =
      structuredTemplateSha256;
  }],
  ["missing historical result hash", (data) => {
    delete data.methodology.sourceSnapshot.composition.historical.resultSha256;
  }],
  ["missing historical receipt hash", (data) => {
    delete data.methodology.sourceSnapshot.composition.historical.execution.receiptSha256;
  }],
  ["missing historical validation report hash", (data) => {
    delete data.methodology.sourceSnapshot.composition.historical.validation.reportSha256;
  }],
  ["substituted historical parser network", (data) => {
    const validation = data.methodology.sourceSnapshot.composition.historical.validation;
    validation.networks.Chico = validation.networks.WPN;
    delete validation.networks.WPN;
  }],
  ["historical parser mismatch", (data) => {
    data.methodology.sourceSnapshot.composition.historical.validation
      .networks.PokerStars.checks.action.matched -= 1;
  }],
  ["historical global validation drift", (data) => {
    data.methodology.sourceSnapshot.composition.historical.validation.checks.cards.compared -= 1;
    data.methodology.sourceSnapshot.composition.historical.validation.checks.cards.matched -= 1;
  }],
  ["historical rejected hand", (data) => {
    data.methodology.sourceSnapshot.composition.historical.validation.rejected = 1;
  }],
  ["non-adjacent source windows", (data) => {
    data.methodology.sourceSnapshot.composition.current.window.startInclusive =
      "2023-09-02T00:00:00Z";
  }],
  ["membership hash drift", (data) => {
    data.methodology.sourceSnapshot.composition.membership.keysSha256 = hash("0");
  }],
  ["inner current replacement drift", (data) => {
    delete data.methodology.sourceSnapshot.composition.current
      .replacement.l3top.recoveryDominatesExactly;
  }],
  ["current result hash drift", (data) => {
    data.methodology.sourceSnapshot.composition.current
      .structuredExecutions[0].resultSha256 = hash("0");
  }],
  ["current aggregate reconciliation drift", (data) => {
    data.methodology.sourceSnapshot.composition.current.aggregate.totals.opportunities += 1;
  }],
  ["missing current receipt proof", (data) => {
    delete data.methodology.sourceSnapshot.composition.current
      .structuredExecutions[0].receiptSha256;
    delete data.methodology.sourceSnapshot.actionShards[0].receiptSha256;
  }],
  ["final aggregate hash drift", (data) => {
    data.methodology.sourceSnapshot.composition.final.aggregate.sha256 = hash("0");
  }],
  ["missing final cube grain hash", (data) => {
    delete data.methodology.sourceSnapshot.composition.final.aggregate.cube.grainSha256;
  }],
  ["final component reconciliation drift", (data) => {
    data.methodology.sourceSnapshot.composition.final.aggregate
      .componentReconciliation.finalTotals.opportunities += 1;
  }],
]) {
  const candidate = clone(compositionData);
  mutate(candidate);
  assert.equal(loadPublication(candidate).ready, false, label);
}

for (const supplementSchema of ["direct", "dedicated", "dedicated-coin", "composed"]) {
  const currentSupplementData = makeData(makeCurrentSupplementSnapshot(supplementSchema));
  assert.deepEqual(
    plain(loadPublication(currentSupplementData)),
    { ready: true, reason: "" },
    `${supplementSchema} novel raw-HH current supplement is publishable`,
  );
  assert.equal(
    validateCurrentSupplementReleaseFixture(currentSupplementData),
    true,
    `${supplementSchema} current supplement passes the strict release-data validator`,
  );

  for (const [label, mutate] of [
    ["final source hash drift", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.final.aggregate.sha256 = hash("0");
    }],
    ["supplement manifest hash missing", (data) => {
      delete data.methodology.sourceSnapshot.currentSupplement.supplementSource.manifestSha256;
    }],
    ["supplement smoothing enabled", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.supplementSource
        .densification.smoothingApplied = true;
    }],
    ["supplement modeled values enabled", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.supplementSource
        .densification.modeledValuesApplied = true;
    }],
    ["supplement fixed window drift", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.window.endExclusive =
        "2026-07-27T00:00:00Z";
    }],
    ["unapproved novel source kind", (data) => {
      const snapshot = data.methodology.sourceSnapshot;
      const root = novelShard(data);
      const nested = snapshot.currentSupplement.supplementSource.inputs.find(
        (input) => input.queryJobId === root.queryJobId,
      );
      root.sourceKind = "unapproved-novel-source";
      nested.sourceKind = "unapproved-novel-source";
    }],
    ["invalid novel query job id", (data) => {
      const snapshot = data.methodology.sourceSnapshot;
      const root = novelShard(data);
      const nested = snapshot.currentSupplement.supplementSource.inputs.find(
        (input) => input.queryJobId === root.queryJobId,
      );
      const actionIndex = snapshot.actionJobIds.indexOf(root.queryJobId);
      root.queryJobId = "mcp_ch_job_not_hex";
      nested.queryJobId = root.queryJobId;
      snapshot.actionJobIds[actionIndex] = root.queryJobId;
    }],
    ["novel execution result hash drift", (data) => {
      const shard = novelShard(data);
      shard.resultSha256 = hash("f");
    }],
    ["novel strong-gate partition drift", (data) => {
      novelShard(data).publicationGate.nominal_novel_keys += 1;
    }],
    ["membership-key hash drift", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.membership.keysSha256 = hash("0");
    }],
    ["l3 clone hash drift", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.supplement
        .l3Delta.deltaProjectionSha256 = hash("0");
    }],
    ["l2 preservation counter drift", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.supplement
        .preserved.l2.counters.fold_other += 1;
    }],
    ["exact action partition drift", (data) => {
      const snapshot = data.methodology.sourceSnapshot;
      snapshot.exactActionCounterTotals.raises_total += 1;
      snapshot.currentSupplement.final.aggregate.totals.raises_total += 1;
    }],
    ["missing nested novel input", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.supplementSource
        .inputs.pop();
    }],
    ["nested recovery merge hash drift", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.baseCurrent.sourceMerges
        .recovery.aggregate.sha256 = hash("0");
    }],
    ["base safe-projection extra key", (data) => {
      data.methodology.sourceSnapshot.actionShards.find(
        (shard) => shard.sourceKind === "structured-field-action",
      ).sourceTable = "analytics.int_tracker_hand_joined";
    }],
    ["base receipt predates closed-window boundary", (data) => {
      const snapshot = data.methodology.sourceSnapshot;
      const stale = "2026-07-25T23:59:59Z";
      snapshot.actionShards.find(
        (shard) => shard.sourceKind === "missing-card-recovery-full-cube",
      ).finishedAt = stale;
      snapshot.currentSupplement.baseCurrent.sourceMerges
        .recovery.inputs[0].finishedAt = stale;
    }],
    ["nested base execution diverges from root", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.baseCurrent.sourceMerges
        .structured.inputs[0].resultSha256 = hash("0");
    }],
    ["recovery validation safe keys drift", (data) => {
      const snapshot = data.methodology.sourceSnapshot;
      const root = snapshot.actionShards.find(
        (shard) => shard.sourceKind === "missing-card-recovery-full-cube",
      );
      const nested = snapshot.currentSupplement.baseCurrent.sourceMerges
        .recovery.inputs[0];
      root.validation.receiptPath = "/private/tmp/recovery.json";
      nested.validation.receiptPath = "/private/tmp/recovery.json";
    }],
    ["final privacy drift", (data) => {
      data.methodology.sourceSnapshot.currentSupplement.final
        .privacy.personalIdentifiersPublished = true;
    }],
  ]) {
    const candidate = clone(currentSupplementData);
    mutate(candidate);
    assert.equal(
      loadPublication(candidate).ready,
      false,
      `${supplementSchema}: ${label}`,
    );
    assertCurrentSupplementReleaseRejected(
      candidate,
      `${supplementSchema}: ${label}`,
    );
  }

  if (supplementSchema === "composed") {
    const candidate = clone(currentSupplementData);
    candidate.methodology.sourceSnapshot.currentSupplement.supplementSource
      .plan.componentManifestSha256.pop();
    assert.equal(
      loadPublication(candidate).ready,
      false,
      "composed supplement requires every component manifest hash",
    );
    assertCurrentSupplementReleaseRejected(
      candidate,
      "composed supplement requires every component manifest hash",
    );
  } else if (supplementSchema === "direct") {
    const staleBinding = clone(currentSupplementData);
    staleBinding.methodology.sourceSnapshot.currentSupplement.supplementSource
      .parserValidation.binding.planSha256 = hash("0");
    assert.equal(
      loadPublication(staleBinding).ready,
      false,
      "direct supplement parser binding must match the immutable run plan",
    );
    assertCurrentSupplementReleaseRejected(
      staleBinding,
      "direct supplement parser binding must match the immutable run plan",
    );
    const missingReceipt = clone(currentSupplementData);
    delete missingReceipt.methodology.sourceSnapshot.currentSupplement
      .supplementSource.plan.immutableReceiptSha256;
    assert.equal(
      loadPublication(missingReceipt).ready,
      false,
      "direct supplement requires the immutable plan receipt hash",
    );
    assertCurrentSupplementReleaseRejected(
      missingReceipt,
      "direct supplement requires the immutable plan receipt hash",
    );
  } else {
    const staleParserImplementation = clone(currentSupplementData);
    staleParserImplementation.methodology.sourceSnapshot.currentSupplement
      .supplementSource.parserValidation.binding.parserImplementationSha256 = hash("0");
    assert.equal(
      loadPublication(staleParserImplementation).ready,
      false,
      "dedicated Coin/Party parser implementation binding is exact",
    );
    assertCurrentSupplementReleaseRejected(
      staleParserImplementation,
      "dedicated Coin/Party parser implementation binding is exact",
    );

    const stalePrivateSource = clone(currentSupplementData);
    stalePrivateSource.methodology.sourceSnapshot.currentSupplement
      .supplementSource.parserValidation.source.inputBytes += 1;
    assert.equal(
      loadPublication(stalePrivateSource).ready,
      false,
      "dedicated Coin/Party private parser source counters are exact",
    );
    assertCurrentSupplementReleaseRejected(
      stalePrivateSource,
      "dedicated Coin/Party private parser source counters are exact",
    );

    const missingCoinPartyTemplate = clone(currentSupplementData);
    missingCoinPartyTemplate.methodology.sourceSnapshot.extractionTemplates =
      missingCoinPartyTemplate.methodology.sourceSnapshot.extractionTemplates.filter(
        (template) => template.path !== "tools/q_ff_rfi_coin_party_publication.sql",
      );
    assert.equal(
      loadPublication(missingCoinPartyTemplate).ready,
      false,
      "dedicated Coin/Party direct source requires its fourth extraction template",
    );
    assertCurrentSupplementReleaseRejected(
      missingCoinPartyTemplate,
      "dedicated Coin/Party direct source requires its fourth extraction template",
    );

    const staleGateTotals = clone(currentSupplementData);
    const rootShard = novelShard(staleGateTotals);
    const nestedShard = staleGateTotals.methodology.sourceSnapshot.currentSupplement
      .supplementSource.inputs.find((input) => input.queryJobId === rootShard.queryJobId);
    for (const shard of [rootShard, nestedShard]) {
      shard.publicationGate.raw_keys += 1;
      shard.publicationGate.exact_id_match_keys += 1;
    }
    assert.equal(
      loadPublication(staleGateTotals).ready,
      false,
      "dedicated Coin/Party frozen strong-gate totals are exact",
    );
    assertCurrentSupplementReleaseRejected(
      staleGateTotals,
      "dedicated Coin/Party frozen strong-gate totals are exact",
    );
  }
}

const directData = makeData(makeDirectSnapshot());
assert.deepEqual(
  plain(loadPublication(directData)),
  { ready: true, reason: "" },
  "the original direct structured provenance remains publishable",
);
const invalidDirect = clone(directData);
invalidDirect.methodology.sourceSnapshot.actionShards[0].sourceTable = "analytics.stg_hh_texts__hh_texts";
assert.equal(
  loadPublication(invalidDirect).ready,
  false,
  "recovery support does not relax the direct structured source-table contract",
);

console.log("RFI stack recovery publication contract: ok");

function makeData(sourceSnapshot) {
  const chart = {
    completeCells: 169,
    minimumCellOpportunities: 50,
    opportunities: 8450,
    n: "",
    r: "",
    j: "",
    l: "",
  };
  const sourceWindow = sourceSnapshot.composition?.window
    || sourceSnapshot.currentSupplement?.window;
  const periodFrom = sourceWindow?.startInclusive.slice(0, 10) || "2023-09-01";
  const periodToExclusive = sourceWindow?.endExclusive.slice(0, 10) || "2026-07-27";
  const periodThrough = new Date(
    Date.parse(`${periodToExclusive}T00:00:00Z`) - 86400000,
  ).toISOString().slice(0, 10);
  return {
    schema: "ff-rfi-field-actions-v3",
    version: "fixture",
    handOrder: Array.from({ length: 169 }, (_, index) => `H${index}`),
    stackOrder: stacks,
    positions,
    cohortOrder: cohorts,
    methodology: {
      period: {
        from: periodFrom,
        through: periodThrough,
        toExclusive: periodToExclusive,
      },
      table: "7-max",
      exactCellMinimum: 50,
      stackAggregation: {
        "70+": ["70+"],
        "30-70": ["30-70"],
        "20-30": ["20-30"],
        "15-20": ["15-20"],
        "<15": ["12-15", "10-12", "8-10", "6-8", "<6"],
      },
      sourceSnapshot,
    },
    recommendations: { charts: {} },
    cohorts: Object.fromEntries(cohorts.map((cohort) => [cohort, {
      charts: Object.fromEntries(stacks.map((stack) => [stack, Object.fromEntries(
        positions.map((position) => [position, { ...chart }]),
      )])),
    }])),
  };
}

function makeDirectSnapshot() {
  const shard = structuredShard();
  return {
    rows: 36504,
    sha256: hash("1"),
    membershipRows: 1868,
    membershipSha256: hash("2"),
    membershipQuerySha256: hash("3"),
    cohortJobId: `mcp_bq_job_${"4".repeat(32)}`,
    membershipExecutionMode: "async",
    actionJobIds: [shard.queryJobId],
    actionShardStrategy: "immutable-user-id",
    actionShards: [shard],
    mergeSchema: "ff-rfi-field-action-merge-v1",
    extractionSql: "tools/q_ff_rfi_field_actions.sql",
    extractionSqlSha256: structuredTemplateSha256,
    knownCards: { eligible: 100, known: 80, pct: 80 },
    classifierSanity: classifierSanity(),
    actionCountReconciliation: reconciliation(),
  };
}

function makeReplacementSnapshot() {
  const structured = structuredShard();
  const recovery = recoveredShard();
  return {
    rows: 36504,
    sha256: hash("1"),
    membershipRows: 1868,
    membershipSha256: hash("2"),
    membershipQuerySha256: hash("3"),
    cohortJobId: `mcp_bq_job_${"4".repeat(32)}`,
    membershipExecutionMode: "async",
    actionJobIds: [structured.queryJobId, recovery.queryJobId],
    actionShardStrategy: "exact-same-window-l3top-replacement-with-l3-delta",
    actionShards: [structured, recovery],
    mergeSchema: "ff-rfi-field-action-cohort-replacement-v1",
    extractionSql: null,
    extractionSqlSha256: null,
    extractionTemplates: [
      {
        path: "tools/q_ff_rfi_field_actions.sql",
        sha256: structuredTemplateSha256,
        role: "canonical-structured-cube",
      },
      {
        path: "tools/q_ff_rfi_missing_cards_recovery.sql",
        sha256: recoveryTemplateSha256,
        role: "l3top-missing-card-recovery",
      },
    ],
    replacement: {
      strategy: "exact-same-window-l3top-replacement-with-l3-delta",
      replacedCohort: "l3top",
      deltaAppliedCohort: "l3",
      membershipSubsetProof: {
        l3topMembers: 244,
        l3Members: 975,
        l3topIsSubsetOfL3: true,
      },
      l3top: {
        structuredRows: 9126,
        structuredProjectionSha256: hash("5"),
        recoveryRows: 9126,
        recoveryProjectionSha256: hash("6"),
        finalProjectionSha256: hash("6"),
        recoveryDominatesExactly: true,
      },
      l3Delta: {
        exactCells: 9126,
        stateCount: 54,
        counters: {
          opportunities: 9,
          raises_total: 2,
          regular_raise: 1,
          open_shove: 1,
          limp: 1,
          fold_other: 6,
          shove_allin_flag: 1,
          shove_effective_amount_only: 0,
          regular_three_bb_open: 1,
          normal_three_bb_as_shove: 0,
          non_exact_r_effective_allin: 0,
        },
        knownCardDelta: 9,
        nonnegativePerCell: true,
        appliedExactly: true,
        eligibleCoverageChanged: false,
      },
      preserved: Object.fromEntries(["l2", "l1"].map((cohort, index) => [cohort, {
        rows: 9126,
        sourceProjectionSha256: hash(String(7 + index)),
        finalProjectionSha256: hash(String(7 + index)),
        exact: true,
      }])),
    },
    knownCards: { eligible: 100, known: 80, pct: 80 },
    classifierSanity: classifierSanity(),
    actionCountReconciliation: reconciliation(),
  };
}

function makeCompositionSnapshot() {
  const snapshot = makeReplacementSnapshot();
  const structured = snapshot.actionShards.find(
    (shard) => shard.sourceKind === "structured-field-action",
  );
  const recovery = snapshot.actionShards.find(
    (shard) => shard.sourceKind === "missing-card-recovery-full-cube",
  );
  structured.shardUsers = 1624;
  structured.sourceUniqueUsers = 1624;

  const historicalJobId = `mcp_ch_job_${"c".repeat(32)}`;
  const membership = {
    sha256: snapshot.membershipSha256,
    keysSha256: hash("d"),
    rows: snapshot.membershipRows,
    uniqueUsers: 1624,
    cohortCounts: {
      l3top: 244,
      l3: 975,
      l2: 484,
      l1: 165,
    },
  };
  const historicalTotals = compositionTotals(1);
  const currentTotals = compositionTotals(2);
  const finalTotals = Object.fromEntries(compositionCounters.map((counter) => [
    counter,
    historicalTotals[counter] + currentTotals[counter],
  ]));
  const finalKnownCards = {
    eligible: 300,
    known: 240,
    lookupMismatch: 0,
    pct: 80,
  };
  const historicalWindow = {
    startInclusive: "2020-01-01T00:00:00Z",
    endExclusive: "2023-09-01T00:00:00Z",
    semantics: "half-open-utc",
  };
  const currentWindow = {
    startInclusive: "2023-09-01T00:00:00Z",
    endExclusive: "2026-07-27T00:00:00Z",
    semantics: "half-open-utc",
  };
  const compositionWindow = {
    startInclusive: historicalWindow.startInclusive,
    endExclusive: currentWindow.endExclusive,
    semantics: "half-open-utc",
  };
  const historicalValidation = makeHistoricalValidation();
  const historicalExport = {
    sha256: hash("e"),
    bytes: 7000,
    rowCount: historicalValidation.rows,
  };
  const currentAggregate = {
    sha256: hash("f"),
    bytes: 20000,
    rows: 36504,
    windowStartInclusive: currentWindow.startInclusive,
    windowEndExclusive: currentWindow.endExclusive,
    knownCards: { eligible: 100, known: 80, lookupMismatch: 0, pct: 80 },
    totals: currentTotals,
    cube: {
      rowCount: 36504,
      stateCount: 216,
      handClassesPerState: 169,
      coverageReconciled: true,
    },
  };
  snapshot.sha256 = hash("9");
  snapshot.membershipKeysSha256 = membership.keysSha256;
  snapshot.actionJobIds = [
    historicalJobId,
    ...snapshot.actionShards.map((shard) => shard.queryJobId),
  ];
  snapshot.actionShardStrategy = "contiguous-time";
  snapshot.mergeSchema = "ff-rfi-field-action-composition-v1";
  snapshot.extractionTemplates.push({
    path: "tools/q_ff_rfi_raw_hh_field_actions.sql",
    sha256: rawTemplateSha256,
    role: "adjacent-historical-raw-hh",
  });
  snapshot.knownCards = {
    ...finalKnownCards,
    firstObservedAt: "2020-01-01 00:00:00",
    lastObservedAt: "2026-07-26 23:59:59",
  };
  snapshot.composition = {
    schema: "ff-rfi-field-action-composition-v1",
    strategy: "adjacent-historical-raw-plus-current-recovery-adjusted",
    window: compositionWindow,
    noOverlap: {
      historicalEndExclusive: historicalWindow.endExclusive,
      currentStartInclusive: currentWindow.startInclusive,
      adjacent: true,
      overlapDays: 0,
      doubleCountPrevented: true,
    },
    membership,
    historical: {
      schema: "ff-rfi-raw-hh-aggregate-v1",
      sourceKind: "raw-hh-local-aggregate",
      manifestSha256: hash("0"),
      embeddedManifestSha256: hash("1"),
      window: historicalWindow,
      aggregate: {
        sha256: hash("2"),
        bytes: 15000,
        rowCount: 36504,
        scopeSha256: hash("3"),
        stateCount: 216,
      },
      execution: {
        executionMode: "async",
        queryJobId: historicalJobId,
        querySha256: hash("4"),
        queryTemplateSha256: rawTemplateSha256,
        receiptSha256: hash("5"),
        receiptRowCount: historicalExport.rowCount,
        receiptByteSize: historicalExport.bytes,
        receiptFinishedAt: "2026-07-26T12:00:00Z",
      },
      resultSha256: historicalExport.sha256,
      rawExport: historicalExport,
      transform: {
        parserSha256: hash("6"),
        aggregatorSha256: hash("7"),
        handClassMode: "parsed-private-raw-hand-history",
        frequencyPolicy: "observed integer counters only",
      },
      validation: historicalValidation,
    },
    current: {
      schema: "ff-rfi-field-action-cohort-replacement-v1",
      manifestSha256: hash("8"),
      embeddedManifestSha256: hash("9"),
      window: currentWindow,
      aggregate: currentAggregate,
      structuredExecutions: [structuredExecution(structured)],
      recoveryExecutions: [recoveryExecution(recovery)],
      replacement: clone(snapshot.replacement),
    },
    final: {
      aggregate: {
        sha256: snapshot.sha256,
        bytes: 30000,
        rowCount: 36504,
        windowStartInclusive: compositionWindow.startInclusive,
        windowEndExclusive: compositionWindow.endExclusive,
        knownCards: finalKnownCards,
        totals: finalTotals,
        cube: {
          rowCount: 36504,
          stateCount: 216,
          handClassesPerState: 169,
          grainSha256: hash("a"),
          coverageReconciled: true,
        },
        componentReconciliation: {
          historicalTotals,
          currentTotals,
          finalTotals,
          exactIntegerAddition: true,
        },
      },
      privacy: {
        rawHandHistoriesPublished: false,
        personalIdentifiersPublished: false,
      },
    },
  };
  return snapshot;
}

function makeCurrentSupplementSnapshot(kind) {
  const snapshot = makeReplacementSnapshot();
  const dedicatedCoinParty = kind.startsWith("dedicated");
  const selectedCoinPartyNetworks = kind === "dedicated-coin"
    ? ["CoinPoker"]
    : coinPartyNetworks;
  if (dedicatedCoinParty) snapshot.membershipSha256 = coinPartyMembershipSha256;
  const structured = snapshot.actionShards.find(
    (shard) => shard.sourceKind === "structured-field-action",
  );
  const recovery = snapshot.actionShards.find(
    (shard) => shard.sourceKind === "missing-card-recovery-full-cube",
  );
  const membership = {
    sha256: snapshot.membershipSha256,
    keysSha256: hash("d"),
    rows: snapshot.membershipRows,
    cohortCounts: {
      l3top: 244,
      l3: 975,
      l2: 484,
      l1: 165,
    },
    subsetProof: {
      l3topMembers: 244,
      l3Members: 975,
      l3topIsSubsetOfL3: true,
    },
  };
  const window = {
    startInclusive: "2023-09-01T00:00:00Z",
    endExclusive: "2026-07-26T00:00:00Z",
    semantics: "half-open-utc",
  };
  const safeStructured = safeStructuredActionShard(structured, membership, window);
  const safeRecovery = safeRecoveryActionShard(recovery, membership, window);
  const novelShards = kind === "direct"
    ? [
      novelActionShard("PokerStars", 0, 2, 1, "c", "immutable-plan-raw-hh-v5", hash("3")),
      novelActionShard("PokerStars", 1, 2, 0, "d", "immutable-plan-raw-hh-v5", hash("3")),
    ]
    : dedicatedCoinParty
      ? selectedCoinPartyNetworks.flatMap((network, networkIndex) =>
        Array.from({ length: 4 }, (_, shardIndex) => {
          const character = String(networkIndex * 4 + shardIndex);
          return novelActionShard(
            network,
            shardIndex,
            4,
            1,
            character,
            "coin-party-publication-v2",
            hash("3"),
            {
              templateSha256: coinPartyTemplateSha256,
              parserTemplateSha256: coinPartyParserTemplateSha256,
              publicationGate: coinPartyGateShard(network, shardIndex),
            },
          );
        }))
    : [
      novelActionShard("CoinPoker", 0, 1, 1, "c", "coin-party-publication-v2", hash("4")),
      novelActionShard(
        "PokerStars",
        0,
        1,
        1,
        "d",
        "immutable-plan-raw-hh-v5",
        hash("5"),
      ),
    ];
  const plannedNetworks = [...new Set(novelShards.map((shard) => shard.network))];
  const cohortActionCounterTotals = {
    l3top: exactCounters(10),
    l3: exactCounters(20),
    l2: exactCounters(30),
    l1: exactCounters(40),
  };
  const exactActionCounterTotals = addExactCounters(
    Object.values(cohortActionCounterTotals),
  );
  snapshot.replacement.preserved.l2.counters = clone(cohortActionCounterTotals.l2);
  snapshot.replacement.preserved.l1.counters = clone(cohortActionCounterTotals.l1);
  snapshot.membershipKeysSha256 = membership.keysSha256;
  snapshot.actionShards = [safeStructured, safeRecovery, ...novelShards];
  snapshot.actionJobIds = snapshot.actionShards.map((shard) => shard.queryJobId);
  snapshot.membershipReceipt = {
    jobId: snapshot.cohortJobId,
    rowCount: snapshot.membershipRows,
    byteSize: 2048,
    finishedAt: "2026-07-26T00:25:00Z",
  };
  snapshot.actionShardStrategy =
    "exact-same-window-novel-raw-l3top-supplement-with-l3-delta";
  snapshot.mergeSchema = "ff-rfi-field-action-current-supplement-v1";
  if (novelShards.some((shard) => shard.sourceKind === "immutable-plan-raw-hh-v5")) {
    snapshot.extractionTemplates.push({
      path: "tools/q_ff_rfi_raw_hh_field_actions_publication_20260726.sql",
      sha256: rawTemplateSha256,
      role: "current-novel-raw-hh-supplement",
    });
  }
  if (novelShards.some((shard) => shard.sourceKind === "coin-party-publication-v2")) {
    snapshot.extractionTemplates.push({
      path: "tools/q_ff_rfi_coin_party_publication.sql",
      sha256: coinPartyTemplateSha256,
      role: "current-coin-party-publication-supplement",
    });
  }
  snapshot.knownCards = {
    eligible: 100,
    known: 100,
    lookupMismatch: 0,
    pct: 100,
  };
  snapshot.exactActionCounterTotals = exactActionCounterTotals;
  snapshot.cohortActionCounterTotals = cohortActionCounterTotals;
  snapshot.actionCountReconciliation = {
    source: {
      opportunities: exactActionCounterTotals.opportunities,
      regularRaise: exactActionCounterTotals.regular_raise,
      openShove: exactActionCounterTotals.open_shove,
      limp: exactActionCounterTotals.limp,
      foldOther: exactActionCounterTotals.fold_other,
    },
    aggregated: {
      opportunities: exactActionCounterTotals.opportunities,
      regularRaise: exactActionCounterTotals.regular_raise,
      openShove: exactActionCounterTotals.open_shove,
      limp: exactActionCounterTotals.limp,
      foldOther: exactActionCounterTotals.fold_other,
    },
  };

  const sourcePlan = kind === "direct"
    ? {
      schema: "ff-rfi-publication-eligible-full-v5-run-plan",
      sha256: hash("1"),
      immutableReceiptSha256: hash("2"),
      sourceSetComplete: true,
      networks: plannedNetworks,
      userShardsPerNetwork: 2,
      expectedExecutions: novelShards.length,
      exactDisjointUserUnion: true,
      targetFilter: false,
    }
    : dedicatedCoinParty
      ? {
        schema: "ff-rfi-coin-party-publication-run-plan-v2",
        sha256: hash("1"),
        sourceSetComplete: true,
        networks: plannedNetworks,
        userShardsPerNetwork: 4,
        expectedExecutions: plannedNetworks.length * 4,
        exactDisjointUserUnion: true,
        targetFilter: false,
      }
    : {
      schema: "ff-rfi-field-action-novel-raw-supplement-composition-plan-v1",
      sourceSetComplete: true,
      networks: plannedNetworks,
      userShardsPerNetwork: null,
      expectedExecutions: novelShards.length,
      exactDisjointUserUnion: true,
      disjointNetworkSets: true,
      targetFilter: false,
      componentManifestSha256: [hash("1"), hash("2")],
    };
  const parserValidation = kind === "direct"
    ? {
      schema: "ff-rfi-raw-hh-parser-validation-v2",
      sha256: hash("3"),
      gatePassed: true,
      networks: plannedNetworks,
      exactMismatchTolerance: 0,
      validatedAt: "2026-07-26T00:30:00Z",
      binding: {
        planSha256: hash("1"),
        parserTemplateSha256: hash("9"),
        parserBodySha256: hash("8"),
        membershipSha256: membership.sha256,
        membershipKeysSha256: membership.keysSha256,
        selectedUserIdsSha256: hash("7"),
        window,
      },
    }
    : dedicatedCoinParty
      ? {
        schema: "ff-rfi-coin-party-parser-validation-v2",
        sha256: hash("3"),
        gatePassed: true,
        networks: plannedNetworks,
        exactMismatchTolerance: 0,
        validatedAt: "2026-07-26T00:30:00Z",
        binding: {
          parserTemplateSha256: coinPartyParserTemplateSha256,
          parserImplementationSha256: coinPartyParserImplementationSha256,
          grammarSha256: coinPartyGrammarSha256,
          membershipSha256: coinPartyMembershipSha256,
          userIdsSha256: coinPartyUserIdsSha256,
          window: ["2023-09-01", "2026-07-26"],
        },
        source: clone(coinPartyParserSource),
      }
    : {
      schema: "ff-rfi-field-action-novel-raw-parser-validation-composition-v1",
      sha256: hash("3"),
      gatePassed: true,
      networks: plannedNetworks,
      exactMismatchTolerance: 0,
      componentSha256: [hash("4"), hash("5")],
    };
  const supplementDelta = exactCounters(2, { foldOnly: true });
  snapshot.currentSupplement = {
    schema: "ff-rfi-field-action-current-supplement-v1",
    strategy: "exact-same-window-novel-raw-l3top-supplement-with-l3-delta",
    supplementedCohort: "l3top",
    deltaAppliedCohort: "l3",
    window,
    membership,
    baseCurrent: {
      schema: "ff-rfi-field-action-cohort-replacement-v1",
      strategy: "exact-same-window-l3top-replacement-with-l3-delta",
      manifestSha256: hash("6"),
      aggregate: {
        sha256: hash("7"),
        bytes: 20000,
        rows: 36504,
      },
      sourceMerges: {
        structured: currentSourceMerge(
          safeStructured,
          "structured-field-action",
          36504,
          exactCounters(80),
          window,
        ),
        recovery: currentSourceMerge(
          safeRecovery,
          "missing-card-recovery-full-cube",
          9126,
          exactCounters(10),
          window,
        ),
      },
      replacement: clone(snapshot.replacement),
    },
    supplementSource: {
      schema: kind === "direct" || dedicatedCoinParty
        ? "ff-rfi-field-action-novel-raw-supplement-merge-v1"
        : "ff-rfi-field-action-novel-raw-supplement-composition-v1",
      sourceKind: "publication-safe-novel-raw-hh-l3top",
      strategy: kind === "direct" || dedicatedCoinParty
        ? "approved-plan-source-union-with-observed-zero-dimension-completion"
        : "disjoint-approved-source-set-supplement-union-v1",
      manifestSha256: hash("8"),
      aggregate: {
        sha256: hash("9"),
        bytes: 1000,
        rows: 9126,
      },
      plan: sourcePlan,
      parserValidation,
      inputs: novelShards.map(novelExecutionProjection),
      densification: {
        observedInputRows: novelShards.reduce((sum, shard) => sum + shard.resultRows, 0),
        observedInputCells: novelShards.reduce((sum, shard) => sum + shard.observedCells, 0),
        canonicalOutputCells: 9126,
        absentDimensionsMaterializedAsObservedZero: true,
        smoothingApplied: false,
        modeledValuesApplied: false,
      },
    },
    supplement: {
      l3topAdditive: supplementProof(supplementDelta, false),
      l3Delta: supplementProof(supplementDelta, true),
      preserved: Object.fromEntries(["l2", "l1"].map((cohort, index) => [
        cohort,
        {
          rows: 9126,
          sourceProjectionSha256: hash(String(index + 1)),
          finalProjectionSha256: hash(String(index + 1)),
          counters: clone(cohortActionCounterTotals[cohort]),
          exact: true,
        },
      ])),
    },
    final: {
      aggregate: {
        sha256: snapshot.sha256,
        bytes: 30000,
        rows: 36504,
        windowStartInclusive: window.startInclusive,
        windowEndExclusive: window.endExclusive,
        knownCards: clone(snapshot.knownCards),
        totals: clone(exactActionCounterTotals),
        cube: {
          rowCount: 36504,
          stateCount: 216,
          handClassesPerState: 169,
          coverageReconciled: true,
        },
      },
      privacy: {
        aggregateOnly: true,
        rawHandHistoriesPublished: false,
        personalIdentifiersPublished: false,
      },
    },
  };
  return snapshot;
}

function safeStructuredActionShard(source, membership, window) {
  return {
    sourceKind: "structured-field-action",
    queryJobId: source.queryJobId,
    executionMode: "async",
    startedAt: "2026-07-26T00:01:00Z",
    finishedAt: "2026-07-26T00:02:00Z",
    rendererMetadataSha256: hash("8"),
    receiptSha256: source.receiptSha256,
    querySha256: source.querySha256,
    resultSha256: source.sha256,
    resultRows: source.rows,
    resultBytes: source.receiptBytes,
    templateSha256: source.templateSha256,
    windowStartInclusive: window.startInclusive,
    windowEndExclusive: window.endExclusive,
    userShard: {
      index: source.userShard.index,
      count: source.userShard.count,
      users: source.shardUsers,
      userIdsSha256: source.userShard.userIdsSha256,
    },
    membershipSha256: membership.sha256,
    membershipKeysSha256: membership.keysSha256,
    privacy: {
      aggregateOnly: true,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
    handClassMode: source.handClassMode,
    holecardMappingSha256: null,
  };
}

function safeRecoveryActionShard(source, membership, window) {
  return {
    sourceKind: "missing-card-recovery-full-cube",
    queryJobId: source.queryJobId,
    executionMode: "async",
    startedAt: "2026-07-26T00:03:00Z",
    finishedAt: "2026-07-26T00:04:00Z",
    rendererMetadataSha256: source.rendererMetadataSha256,
    receiptSha256: source.receiptSha256,
    querySha256: source.querySha256,
    resultSha256: source.sha256,
    resultRows: source.rows,
    resultBytes: source.receiptBytes,
    templateSha256: source.templateSha256,
    windowStartInclusive: window.startInclusive,
    windowEndExclusive: window.endExclusive,
    userShard: {
      index: source.userShard.index,
      count: source.userShard.count,
      users: source.shardUsers,
      userIdsSha256: source.userShard.userIdsSha256,
    },
    membershipSha256: membership.sha256,
    membershipKeysSha256: membership.keysSha256,
    privacy: {
      aggregateOnly: true,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
    parserGrammarsSha256: source.parserGrammarsSha256,
    parserNetworks: clone(source.parserNetworks),
    recoveryIsDisjoint: source.recoveryIsDisjoint,
    recoveryPredicate: source.recoveryPredicate,
    rawJoin: clone(source.rawJoin),
    validation: {
      schema: source.validation.schema,
      manifestSha256: source.validation.manifestSha256,
      queryJobId: source.validation.queryJobId,
      queryExecutionMode: source.validation.queryExecutionMode,
      startedAt: "2026-07-26T00:05:00Z",
      finishedAt: "2026-07-26T00:06:00Z",
      rendererMetadataSha256: source.validation.rendererMetadataSha256,
      renderedSqlSha256: source.validation.renderedSqlSha256,
      queryTemplateSha256: source.validation.queryTemplateSha256,
      resultSha256: source.validation.resultSha256,
      resultRows: source.validation.resultRowCount,
      resultBytes: source.validation.resultBytes,
      receiptSha256: source.validation.receiptSha256,
      window: clone(source.validation.window),
      networks: clone(source.validation.networks),
      totals: clone(source.validation.totals),
      privacy: {
        aggregateOnly: true,
        rawHandHistoriesPublished: false,
        personalIdentifiersPublished: false,
      },
    },
  };
}

function currentSourceMerge(shard, sourceKind, rows, totals, window) {
  const sha = sourceKind === "structured-field-action" ? hash("a") : hash("b");
  return {
    schema: "ff-rfi-field-action-merge-v1",
    manifestSha256: sourceKind === "structured-field-action" ? hash("c") : hash("d"),
    shardStrategy: "immutable-user-id",
    ...(sourceKind === "missing-card-recovery-full-cube" ? { sourceKind } : {}),
    aggregate: {
      sha256: sha,
      bytes: rows * 2,
      rows,
    },
    inputs: [clone(shard)],
    merged: {
      rows,
      sha256: sha,
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
        ? { cube: {
          rowCount: 9126,
          stateCount: 54,
          handClassesPerState: 169,
          coverageReconciled: true,
        } }
        : {}),
    },
  };
}

function novelActionShard(
  network,
  index,
  count,
  rows,
  character,
  sourceKind,
  parserValidationSha256,
  {
    templateSha256 = sourceKind === "coin-party-publication-v2"
      ? coinPartyTemplateSha256
      : rawTemplateSha256,
    parserTemplateSha256 = hash("9"),
    publicationGate = null,
  } = {},
) {
  const resultSha256 = hash(character);
  return {
    sourceKind,
    network,
    userShard: {
      index,
      count,
      users: 244 / count,
      userIdsSha256: hash(character),
    },
    queryJobId: `mcp_ch_job_${character.repeat(32)}`,
    executionMode: "async",
    startedAt: "2026-07-26T00:10:00.000Z",
    finishedAt: "2026-07-26T00:20:00.000Z",
    rendererMetadataSha256: hash("e"),
    receiptSha256: hash("f"),
    querySha256: hash(character === "c" ? "1" : "2"),
    resultSha256,
    resultRows: rows,
    resultBytes: rows ? 100 : 1,
    observedStates: rows,
    observedCells: rows,
    templateSha256,
    parserTemplateSha256,
    parserValidationSha256,
    publicationGate: publicationGate || {
      raw_keys: rows + 2,
      exact_id_match_keys: 1,
      nominal_novel_keys: rows + 1,
      normalized_time_eligible_keys: rows,
      publication_eligible_keys: rows,
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

function coinPartyGateShard(network, index) {
  const totals = coinPartyGateTotals[network];
  const exact = splitInteger(totals.exact_id_match_keys, index, 4);
  const nominal = splitInteger(totals.nominal_novel_keys, index, 4);
  return {
    raw_keys: exact + nominal,
    exact_id_match_keys: exact,
    nominal_novel_keys: nominal,
    normalized_time_eligible_keys:
      splitInteger(totals.normalized_time_eligible_keys, index, 4),
    publication_eligible_keys:
      splitInteger(totals.publication_eligible_keys, index, 4),
  };
}

function splitInteger(total, index, count) {
  return Math.floor(total / count) + (index < total % count ? 1 : 0);
}

function novelExecutionProjection(shard) {
  return {
    sourceKind: shard.sourceKind,
    network: shard.network,
    userShard: clone(shard.userShard),
    queryJobId: shard.queryJobId,
    executionMode: shard.executionMode,
    startedAt: shard.startedAt,
    finishedAt: shard.finishedAt,
    rendererMetadataSha256: shard.rendererMetadataSha256,
    receiptSha256: shard.receiptSha256,
    querySha256: shard.querySha256,
    resultSha256: shard.resultSha256,
    resultRows: shard.resultRows,
    resultBytes: shard.resultBytes,
    observedStates: shard.observedStates,
    observedCells: shard.observedCells,
    templateSha256: shard.templateSha256,
    parserTemplateSha256: shard.parserTemplateSha256,
    parserValidationSha256: shard.parserValidationSha256,
    publicationGate: clone(shard.publicationGate),
    windowStartInclusive: shard.windowStartInclusive,
    windowEndExclusive: shard.windowEndExclusive,
    privacy: clone(shard.privacy),
  };
}

function supplementProof(counters, parentClone) {
  return {
    exactCells: 9126,
    stateCount: 54,
    counters: clone(counters),
    eligibleDelta: counters.opportunities,
    knownCardDelta: counters.opportunities,
    opportunitiesDelta: counters.opportunities,
    lookupMismatchDelta: 0,
    deltaProjectionSha256: hash("a"),
    ...(parentClone ? { cloneEqualsL3top: true } : {}),
    nonnegativePerCell: true,
    appliedExactly: true,
  };
}

function exactCounters(opportunities, { foldOnly = false } = {}) {
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

function addExactCounters(values) {
  return Object.fromEntries(compositionCounters.map((counter) => [
    counter,
    values.reduce((sum, value) => sum + value[counter], 0),
  ]));
}

function structuredShard() {
  return {
    sourceKind: "structured-field-action",
    queryJobId: `mcp_ch_job_${"a".repeat(32)}`,
    executionMode: "async",
    querySha256: hash("a"),
    templateSha256: structuredTemplateSha256,
    receiptSha256: hash("e"),
    receiptRowCount: 36504,
    receiptBytes: 1000,
    sha256: hash("c"),
    rows: 36504,
    sourceTable: "analytics.int_tracker_hand_joined",
    handClassMode: "joined-holecards-str",
    shardUsers: 1624,
    sourceUniqueUsers: 1624,
    windowStartInclusive: "2023-09-01T00:00:00Z",
    windowEndInclusive: "2026-07-26T23:59:59.999Z",
    userShard: { index: 0, count: 1, userIdsSha256: hash("d") },
  };
}

function structuredExecution(shard) {
  return {
    queryJobId: shard.queryJobId,
    querySha256: shard.querySha256,
    queryTemplateSha256: shard.templateSha256,
    receiptSha256: shard.receiptSha256,
    resultSha256: shard.sha256,
  };
}

function recoveryExecution(shard) {
  return {
    queryJobId: shard.queryJobId,
    querySha256: shard.querySha256,
    queryTemplateSha256: shard.templateSha256,
    receiptSha256: shard.receiptSha256,
    resultSha256: shard.sha256,
    rendererMetadataSha256: shard.rendererMetadataSha256,
    parserGrammarsSha256: shard.parserGrammarsSha256,
    validation: shard.validation,
  };
}

function makeHistoricalValidation() {
  const networksEvidence = Object.fromEntries(historicalNetworks.map((network) => {
    const rows = 10;
    return [network, {
      rows,
      checks: Object.fromEntries(historicalChecks.map((check) => [
        check,
        {
          compared: check === "shove" ? 5 : rows,
          matched: check === "shove" ? 5 : rows,
        },
      ])),
    }];
  }));
  const rows = historicalNetworks.length * 10;
  return {
    status: "passed",
    reportSha256: hash("b"),
    rows,
    parsed: rows,
    rejected: 0,
    networks: networksEvidence,
    checks: Object.fromEntries(historicalChecks.map((check) => {
      const compared = check === "shove" ? historicalNetworks.length * 5 : rows;
      return [check, { compared, matched: compared }];
    })),
  };
}

function compositionTotals(value) {
  return Object.fromEntries(compositionCounters.map((counter) => [counter, value]));
}

function recoveredShard() {
  const networkEvidence = Object.fromEntries(networks.map((network) => [network, {
    trackerRows: 10,
    trackerKnownWithRaw: 5,
    rawHhJoined: 8,
    parserSuccess: 7,
    classMatches: 5,
    classFailures: 0,
    matchPctTrackerKnown: 100,
    trackerMissingRecovered: network === "iPoker" ? 1 : 0,
    validationPassed: 1,
  }]));
  return {
    sourceKind: "missing-card-recovery-full-cube",
    rendererSchema: "ff-rfi-missing-card-recovery-render-v1",
    rendererMode: "full-cube",
    rendererMetadataSha256: hash("e"),
    queryJobId: `mcp_ch_job_${"b".repeat(32)}`,
    executionMode: "async",
    receiptSha256: hash("f"),
    receiptRowCount: 9126,
    receiptBytes: 1000,
    querySha256: hash("b"),
    templateSha256: recoveryTemplateSha256,
    sha256: hash("0"),
    rows: 9126,
    sourceTable: "analytics.int_tracker_hand_joined",
    sourceTables: [
      "analytics.int_tracker_hand_joined",
      "analytics.stg_hh_texts__hh_texts",
    ],
    handClassMode: "structured-or-validated-raw-when-empty-v1",
    recoveryPredicate: "latest structured_hand_class = ''",
    recoveryIsDisjoint: true,
    rawJoin: {
      type: "exact-key",
      trackerKey: ["toUInt64(user_id)", "toString(network)", "toString(hh_id)"],
      rawKey: ["toUInt64(check_user_id)", "toString(network)", "toString(converted_hh_id)"],
    },
    parserNetworks: [...networks],
    parserGrammarsSha256: hash("1"),
    selectedMembershipKeysSha256: hash("2"),
    selectedMembershipRows: 244,
    selectedUniqueUsers: 244,
    selectedCohortCounts: { l3top: 244 },
    shardUsers: 244,
    sourceUniqueUsers: 244,
    windowStartInclusive: "2023-09-01T00:00:00Z",
    windowEndInclusive: "2026-07-26T23:59:59.999Z",
    userShard: { index: 0, count: 1, userIdsSha256: hash("e") },
    validation: {
      schema: "ff-rfi-missing-card-recovery-validation-v1",
      manifestSha256: hash("3"),
      queryJobId: `sync:${hash("4")}`,
      queryExecutionMode: "sync",
      receiptSchema: "ff-rfi-card-parser-validation-receipt-v1",
      rendererMetadataSha256: hash("5"),
      renderedSqlSha256: hash("4"),
      queryTemplateSha256: recoveryTemplateSha256,
      resultSha256: hash("6"),
      resultRowCount: 9,
      resultBytes: 99,
      receiptSha256: hash("7"),
      receiptRowCount: 9,
      receiptBytes: 99,
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
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false,
    },
  };
}

function classifierSanity() {
  return Object.fromEntries(stacks.map((stack) => [stack, {
    normalThreeBbAsShove: 0,
    openShoves: 3,
    shoveAllinFlag: 2,
    shoveEffectiveAmountOnly: 1,
  }]));
}

function reconciliation() {
  const totals = {
    opportunities: 10,
    regularRaise: 2,
    openShove: 1,
    limp: 1,
    foldOther: 6,
  };
  return { source: { ...totals }, aggregated: { ...totals } };
}

function loadPublication(data) {
  const context = { window: { PokerRfiFieldActionData: data, atob } };
  vm.runInNewContext(confidenceSource, context);
  vm.runInNewContext(stackSource, context);
  return context.window.PokerRfiStackData.publication;
}

function validateCurrentSupplementReleaseFixture(data) {
  return validateRfiCurrentSupplementRelease(
    data.methodology.sourceSnapshot,
    {
      structuredTemplateSha256,
      recoveryTemplateSha256,
      rawTemplateSha256,
      coinPartyTemplateSha256,
      membershipQuerySha256: hash("3"),
      sourceWindowStartInclusive: "2023-09-01T00:00:00Z",
      sourceWindowEndInclusive: "2026-07-25T23:59:59.999Z",
    },
  );
}

function assertCurrentSupplementReleaseRejected(data, label) {
  assert.throws(
    () => validateCurrentSupplementReleaseFixture(data),
    /RFI current supplement:/,
    `${label}: strict release-data validator unexpectedly accepted the mutation`,
  );
}

function recoveryShard(data) {
  return data.methodology.sourceSnapshot.actionShards.find(
    (shard) => shard.sourceKind === "missing-card-recovery-full-cube",
  );
}

function novelShard(data) {
  return data.methodology.sourceSnapshot.actionShards.find(
    (shard) => ["coin-party-publication-v2", "immutable-plan-raw-hh-v5"]
      .includes(shard.sourceKind),
  );
}

function hash(character) {
  return character.repeat(64);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}
