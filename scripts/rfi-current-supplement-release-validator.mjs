const SHA256 = /^[a-f0-9]{64}$/;
const CH_JOB_ID = /^mcp_ch_job_[a-f0-9]{32,}$/;
const BQ_JOB_ID = /^mcp_bq_job_[a-f0-9]+$/;

export const RFI_CURRENT_SUPPLEMENT_SCHEMA =
  "ff-rfi-field-action-current-supplement-v1";
export const RFI_CURRENT_SUPPLEMENT_STRATEGY =
  "exact-same-window-novel-raw-l3top-supplement-with-l3-delta";
export const RFI_CURRENT_SUPPLEMENT_WINDOW = Object.freeze({
  startInclusive: "2023-09-01T00:00:00Z",
  endExclusive: "2026-07-26T00:00:00Z",
  semantics: "half-open-utc",
});

const REPLACEMENT_SCHEMA = "ff-rfi-field-action-cohort-replacement-v1";
const REPLACEMENT_STRATEGY =
  "exact-same-window-l3top-replacement-with-l3-delta";
const DIRECT_NOVEL_SCHEMA =
  "ff-rfi-field-action-novel-raw-supplement-merge-v1";
const DIRECT_NOVEL_STRATEGY =
  "approved-plan-source-union-with-observed-zero-dimension-completion";
const COMPOSED_NOVEL_SCHEMA =
  "ff-rfi-field-action-novel-raw-supplement-composition-v1";
const COMPOSED_NOVEL_STRATEGY =
  "disjoint-approved-source-set-supplement-union-v1";
const NOVEL_SOURCE_KIND = "publication-safe-novel-raw-hh-l3top";
const NOVEL_INPUT_SOURCE_KINDS = Object.freeze([
  "coin-party-publication-v2",
  "immutable-plan-raw-hh-v5",
]);
const COHORTS = Object.freeze(["l3top", "l3", "l2", "l1"]);
const RECOVERY_NETWORKS = Object.freeze([
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
const RECOVERY_RAW_JOIN = Object.freeze({
  type: "exact-key",
  trackerKey: [
    "toUInt64(user_id)",
    "toString(network)",
    "toString(hh_id)",
  ],
  rawKey: [
    "toUInt64(check_user_id)",
    "toString(network)",
    "toString(converted_hh_id)",
  ],
});
const COMPOSITION_COUNTERS = Object.freeze([
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
]);
const BASE_COMMON_KEYS = Object.freeze([
  "sourceKind",
  "queryJobId",
  "executionMode",
  "startedAt",
  "finishedAt",
  "rendererMetadataSha256",
  "receiptSha256",
  "querySha256",
  "resultSha256",
  "resultRows",
  "resultBytes",
  "templateSha256",
  "windowStartInclusive",
  "windowEndExclusive",
  "userShard",
  "membershipSha256",
  "membershipKeysSha256",
  "privacy",
]);
const STRUCTURED_KEYS = Object.freeze([
  ...BASE_COMMON_KEYS,
  "handClassMode",
  "holecardMappingSha256",
]);
const RECOVERY_KEYS = Object.freeze([
  ...BASE_COMMON_KEYS,
  "parserGrammarsSha256",
  "parserNetworks",
  "recoveryIsDisjoint",
  "recoveryPredicate",
  "rawJoin",
  "validation",
]);
const NOVEL_KEYS = Object.freeze([
  "sourceKind",
  "network",
  "userShard",
  "queryJobId",
  "executionMode",
  "startedAt",
  "finishedAt",
  "rendererMetadataSha256",
  "receiptSha256",
  "querySha256",
  "resultSha256",
  "resultRows",
  "resultBytes",
  "observedStates",
  "observedCells",
  "templateSha256",
  "parserTemplateSha256",
  "parserValidationSha256",
  "publicationGate",
  "windowStartInclusive",
  "windowEndExclusive",
  "privacy",
]);
const USER_SHARD_KEYS = Object.freeze([
  "index",
  "count",
  "users",
  "userIdsSha256",
]);
const RECOVERY_VALIDATION_KEYS = Object.freeze([
  "schema",
  "manifestSha256",
  "queryJobId",
  "queryExecutionMode",
  "startedAt",
  "finishedAt",
  "rendererMetadataSha256",
  "renderedSqlSha256",
  "queryTemplateSha256",
  "resultSha256",
  "resultRows",
  "resultBytes",
  "receiptSha256",
  "window",
  "networks",
  "totals",
  "privacy",
]);
const RECOVERY_NETWORK_COUNTER_KEYS = Object.freeze([
  "trackerRows",
  "trackerKnownWithRaw",
  "rawHhJoined",
  "parserSuccess",
  "classMatches",
  "classFailures",
  "matchPctTrackerKnown",
  "trackerMissingRecovered",
  "validationPassed",
]);
const RECOVERY_TOTAL_KEYS = Object.freeze([
  "trackerRows",
  "trackerKnownWithRaw",
  "rawHhJoined",
  "parserSuccess",
  "classMatches",
  "classFailures",
  "trackerMissingRecovered",
]);
const NOVEL_GATE_KEYS = Object.freeze([
  "raw_keys",
  "exact_id_match_keys",
  "nominal_novel_keys",
  "normalized_time_eligible_keys",
  "publication_eligible_keys",
]);

const DEDICATED_COIN_PARTY_PLAN_SCHEMA =
  "ff-rfi-coin-party-publication-run-plan-v2";
const DEDICATED_COIN_PARTY_PARSER_SCHEMA =
  "ff-rfi-coin-party-parser-validation-v2";
const DEDICATED_COIN_PARTY_NETWORKS = Object.freeze([
  "CoinPoker",
  "PartyPoker",
]);
const DEDICATED_COIN_PARTY_PARSER_TEMPLATE_SHA256 =
  "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f";
const DEDICATED_COIN_PARTY_PARSER_IMPLEMENTATION_SHA256 =
  "673a2d5967625a6874e5acade450269fc30677cb786418a85af593b77e407d3e";
const DEDICATED_COIN_PARTY_GRAMMAR_SHA256 =
  "e570a7271fd8dbff3c90bb840335f28eda10f63094065c57b8c4c328170e8f06";
const DEDICATED_COIN_PARTY_MEMBERSHIP_SHA256 =
  "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d";
const DEDICATED_COIN_PARTY_USER_IDS_SHA256 =
  "322fabfabb4ab4b6359c6720125dfb534525559e854c95fff79b9c1b11ccc771";
const DEDICATED_COIN_PARTY_WINDOW = Object.freeze([
  "2023-09-01",
  "2026-07-26",
]);
const DEDICATED_COIN_PARTY_SOURCE = Object.freeze({
  inputSha256:
    "2d1e2323a6d497b85b94d6278249dc3e9d78cce2c52477936021d5b9046592f6",
  inputBytes: 2859078,
  rows: 1366,
  uniqueUsers: 22,
  firstObservedAt: "2026-02-08T00:19:28Z",
  lastObservedAt: "2026-07-20T20:39:15Z",
  rawHandHistoriesPublished: false,
  personalIdentifiersPublished: false,
});
const DEDICATED_COIN_PARTY_GATE_TOTALS = Object.freeze({
  CoinPoker: Object.freeze({
    raw_keys: 651627,
    exact_id_match_keys: 630348,
    nominal_novel_keys: 21279,
    normalized_time_eligible_keys: 19759,
    publication_eligible_keys: 19759,
  }),
  PartyPoker: Object.freeze({
    raw_keys: 198324,
    exact_id_match_keys: 190491,
    nominal_novel_keys: 7833,
    normalized_time_eligible_keys: 7828,
    publication_eligible_keys: 7828,
  }),
});

export function validateRfiCurrentSupplementRelease(
  snapshot,
  {
    structuredTemplateSha256,
    recoveryTemplateSha256,
    rawTemplateSha256,
    coinPartyTemplateSha256,
    membershipQuerySha256,
    sourceWindowStartInclusive,
    sourceWindowEndInclusive,
  },
) {
  for (const [label, value] of Object.entries({
    structuredTemplateSha256,
    recoveryTemplateSha256,
    rawTemplateSha256,
    coinPartyTemplateSha256,
    membershipQuerySha256,
  })) {
    invariant(hex64(value), `${label} is not a SHA-256`);
  }
  invariant(
    snapshot?.mergeSchema === RFI_CURRENT_SUPPLEMENT_SCHEMA,
    "merge schema is not current-supplement-v1",
  );
  invariant(
    snapshot?.actionShardStrategy === RFI_CURRENT_SUPPLEMENT_STRATEGY,
    "action shard strategy drift",
  );
  invariant(snapshot?.rows === 36504, "root cube is not 216 by 169");
  invariant(hex64(snapshot?.sha256), "root aggregate SHA-256 is missing");
  invariant(
    snapshot?.extractionSql === null
      && snapshot?.extractionSqlSha256 === null,
    "multi-template snapshot exposes a misleading single extraction template",
  );
  invariant(
    snapshot?.membershipQuerySha256 === membershipQuerySha256,
    "membership query SHA-256 is stale",
  );
  invariant(
    positiveInteger(snapshot?.membershipRows)
      && hex64(snapshot?.membershipSha256)
      && hex64(snapshot?.membershipKeysSha256),
    "membership export provenance is incomplete",
  );
  invariant(
    snapshot?.membershipExecutionMode === "async"
      && BQ_JOB_ID.test(String(snapshot?.cohortJobId || "")),
    "membership execution identity is invalid",
  );
  invariant(
    same(snapshot?.membershipReceipt, {
      jobId: snapshot?.cohortJobId,
      rowCount: snapshot?.membershipRows,
      byteSize: snapshot?.membershipReceipt?.byteSize,
      finishedAt: snapshot?.membershipReceipt?.finishedAt,
    })
      && positiveInteger(snapshot?.membershipReceipt?.byteSize)
      && validIsoTimestamp(snapshot?.membershipReceipt?.finishedAt),
    "membership execution receipt is incomplete",
  );

  const current = snapshot?.currentSupplement;
  invariant(current && typeof current === "object", "proof is missing");
  exactKeys(current, [
    "schema",
    "strategy",
    "supplementedCohort",
    "deltaAppliedCohort",
    "window",
    "membership",
    "baseCurrent",
    "supplementSource",
    "supplement",
    "final",
  ], "proof");
  invariant(
    current.schema === RFI_CURRENT_SUPPLEMENT_SCHEMA
      && current.strategy === RFI_CURRENT_SUPPLEMENT_STRATEGY,
    "proof schema or strategy drift",
  );
  invariant(
    current.supplementedCohort === "l3top"
      && current.deltaAppliedCohort === "l3",
    "supplement cohort scope drift",
  );
  invariant(
    validHalfOpenWindow(current.window)
      && same(current.window, RFI_CURRENT_SUPPLEMENT_WINDOW),
    "approved fixed source window drift",
  );
  invariant(
    current.window.startInclusive === sourceWindowStartInclusive
      && inclusiveEnd(current.window.endExclusive) === sourceWindowEndInclusive,
    "payload period does not match the supplement window",
  );
  invariant(
    Date.parse(snapshot.membershipReceipt.finishedAt)
      >= Date.parse(current.window.endExclusive),
    "membership receipt predates the closed source window",
  );

  validateExtractionTemplates(snapshot, {
    structuredTemplateSha256,
    recoveryTemplateSha256,
    rawTemplateSha256,
    coinPartyTemplateSha256,
  });
  const membership = validateMembership(snapshot, current.membership);
  const base = current.baseCurrent;
  const supplementSource = current.supplementSource;
  const allShards = snapshot.actionShards;
  const jobIds = snapshot.actionJobIds;
  invariant(
    Array.isArray(allShards) && allShards.length > 0,
    "root action shard list is empty",
  );
  invariant(
    Array.isArray(jobIds)
      && same(jobIds, allShards.map((shard) => shard?.queryJobId))
      && new Set(jobIds).size === jobIds.length,
    "root action job order or uniqueness drift",
  );

  const structuredShards = allShards.filter(
    (shard) => shard?.sourceKind === "structured-field-action",
  );
  const recoveryShards = allShards.filter(
    (shard) => shard?.sourceKind === "missing-card-recovery-full-cube",
  );
  const novelShards = allShards.filter((shard) =>
    NOVEL_INPUT_SOURCE_KINDS.includes(shard?.sourceKind)
  );
  invariant(
    structuredShards.length > 0
      && recoveryShards.length > 0
      && novelShards.length > 0
      && structuredShards.length + recoveryShards.length
        + novelShards.length === allShards.length,
    "root shards contain a missing or unapproved source kind",
  );
  invariant(
    same(
      allShards,
      [
        ...(base?.sourceMerges?.structured?.inputs || []),
        ...(base?.sourceMerges?.recovery?.inputs || []),
        ...(supplementSource?.inputs || []),
      ],
    ),
    "root shards are not the exact flattened nested provenance",
  );

  for (const shard of structuredShards) {
    validateSafeBaseShard(
      shard,
      "structured-field-action",
      structuredTemplateSha256,
      membership,
      current.window,
    );
  }
  for (const shard of recoveryShards) {
    validateSafeBaseShard(
      shard,
      "missing-card-recovery-full-cube",
      recoveryTemplateSha256,
      membership,
      current.window,
    );
  }
  invariant(
    new Set(allShards.map((shard) => shard.queryJobId)).size
      === allShards.length,
    "duplicate action query job id",
  );

  validateCurrentBase(
    snapshot,
    base,
    structuredShards,
    recoveryShards,
    membership,
    current.window,
  );
  validateNovelSupplementSource(
    supplementSource,
    novelShards,
    rawTemplateSha256,
    coinPartyTemplateSha256,
    membership,
    current.window,
  );
  validateSupplementAndFinal(snapshot, current, membership);
  return true;
}

function validateExtractionTemplates(
  snapshot,
  {
    structuredTemplateSha256,
    recoveryTemplateSha256,
    rawTemplateSha256,
    coinPartyTemplateSha256,
  },
) {
  const usesCoinParty = snapshot.actionShards?.some(
    (shard) => shard?.sourceKind === "coin-party-publication-v2",
  );
  const usesCurrentRaw = snapshot.actionShards?.some(
    (shard) => shard?.sourceKind === "immutable-plan-raw-hh-v5",
  );
  const expected = [
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
    ...(usesCurrentRaw ? [{
      path: "tools/q_ff_rfi_raw_hh_field_actions_publication_20260726.sql",
      sha256: rawTemplateSha256,
      role: "current-novel-raw-hh-supplement",
    }] : []),
    ...(usesCoinParty ? [{
      path: "tools/q_ff_rfi_coin_party_publication.sql",
      sha256: coinPartyTemplateSha256,
      role: "current-coin-party-publication-supplement",
    }] : []),
  ];
  invariant(
    same(snapshot.extractionTemplates, expected),
    "sourceKind-specific extraction template manifest drift",
  );
  invariant(
    new Set(expected.map((template) => template.sha256)).size
      === expected.length,
    "extraction template hashes are not distinct",
  );
}

function validateMembership(snapshot, membership) {
  exactKeys(
    membership,
    ["sha256", "keysSha256", "rows", "cohortCounts", "subsetProof"],
    "membership proof",
  );
  exactKeys(
    membership.subsetProof,
    ["l3topMembers", "l3Members", "l3topIsSubsetOfL3"],
    "membership subset proof",
  );
  invariant(
    membership.sha256 === snapshot.membershipSha256
      && membership.keysSha256 === snapshot.membershipKeysSha256
      && membership.rows === snapshot.membershipRows,
    "membership proof does not bind the root snapshot",
  );
  invariant(
    same(Object.keys(membership.cohortCounts || {}), COHORTS)
      && Object.values(membership.cohortCounts).every(positiveInteger)
      && Object.values(membership.cohortCounts)
        .reduce((sum, value) => sum + value, 0) === membership.rows,
    "membership cohort counts are incomplete or do not reconcile",
  );
  invariant(
    membership.subsetProof.l3topIsSubsetOfL3 === true
      && membership.subsetProof.l3topMembers
        === membership.cohortCounts.l3top
      && membership.subsetProof.l3Members === membership.cohortCounts.l3
      && membership.subsetProof.l3topMembers
        <= membership.subsetProof.l3Members,
    "l3top subset proof drift",
  );
  return membership;
}

function validateSafeBaseShard(
  shard,
  expectedKind,
  expectedTemplateSha256,
  membership,
  window,
) {
  exactKeys(
    shard,
    expectedKind === "structured-field-action"
      ? STRUCTURED_KEYS
      : RECOVERY_KEYS,
    `${expectedKind} shard`,
  );
  invariant(shard.sourceKind === expectedKind, "base shard source kind drift");
  for (const key of [
    "rendererMetadataSha256",
    "receiptSha256",
    "querySha256",
    "resultSha256",
    "templateSha256",
    "membershipSha256",
    "membershipKeysSha256",
  ]) {
    invariant(hex64(shard[key]), `${expectedKind} shard ${key} is invalid`);
  }
  invariant(
    shard.templateSha256 === expectedTemplateSha256,
    `${expectedKind} shard uses a stale query template`,
  );
  invariant(
    shard.membershipSha256 === membership.sha256
      && shard.membershipKeysSha256 === membership.keysSha256,
    `${expectedKind} shard membership binding drift`,
  );
  invariant(
    shard.executionMode === "async"
      && CH_JOB_ID.test(String(shard.queryJobId || "")),
    `${expectedKind} shard execution identity is invalid`,
  );
  validateExecutionWindow(shard, window, `${expectedKind} shard`);
  invariant(
    positiveInteger(shard.resultRows) && positiveInteger(shard.resultBytes),
    `${expectedKind} shard result counters are invalid`,
  );
  validateUserShard(shard.userShard, `${expectedKind} shard`);
  invariant(
    validAggregateOnlyPrivacy(shard.privacy),
    `${expectedKind} shard privacy boundary drift`,
  );

  if (expectedKind === "structured-field-action") {
    invariant(
      shard.handClassMode === "joined-holecards-str"
        && shard.holecardMappingSha256 === null,
      "structured shard hand-class provenance drift",
    );
    return;
  }
  invariant(
    shard.recoveryIsDisjoint === true
      && shard.recoveryPredicate === "latest structured_hand_class = ''"
      && hex64(shard.parserGrammarsSha256)
      && same(shard.parserNetworks, RECOVERY_NETWORKS)
      && same(shard.rawJoin, RECOVERY_RAW_JOIN),
    "recovery shard parser or exact-join provenance drift",
  );
  validateSafeRecoveryValidation(
    shard.validation,
    expectedTemplateSha256,
    window,
  );
}

function validateSafeRecoveryValidation(validation, templateSha256, window) {
  exactKeys(
    validation,
    RECOVERY_VALIDATION_KEYS,
    "recovery validation receipt",
  );
  invariant(
    validation.schema === "ff-rfi-missing-card-recovery-validation-v1",
    "recovery validation schema drift",
  );
  for (const key of [
    "manifestSha256",
    "rendererMetadataSha256",
    "renderedSqlSha256",
    "queryTemplateSha256",
    "resultSha256",
    "receiptSha256",
  ]) {
    invariant(hex64(validation[key]), `recovery validation ${key} is invalid`);
  }
  invariant(
    validation.queryTemplateSha256 === templateSha256,
    "recovery validation query template is stale",
  );
  invariant(
    validExecution(
      validation.queryJobId,
      validation.renderedSqlSha256,
      validation.queryExecutionMode,
    ),
    "recovery validation execution identity is invalid",
  );
  invariant(
    validIsoTimestamp(validation.startedAt)
      && validIsoTimestamp(validation.finishedAt)
      && Date.parse(validation.startedAt)
        <= Date.parse(validation.finishedAt)
      && Date.parse(validation.finishedAt) >= Date.parse(window.endExclusive),
    "recovery validation receipt timing is invalid",
  );
  invariant(
    validation.resultRows === RECOVERY_NETWORKS.length
      && positiveInteger(validation.resultBytes),
    "recovery validation result counters drift",
  );
  invariant(
    same(validation.window, {
      startInclusive: "2026-07-01T00:00:00Z",
      endExclusive: "2026-07-02T00:00:00Z",
      semantics: "half-open-utc",
    }),
    "recovery validation sample window drift",
  );
  invariant(
    same(Object.keys(validation.networks || {}).sort(), [
      ...RECOVERY_NETWORKS,
    ].sort()),
    "recovery validation network coverage drift",
  );
  exactKeys(
    validation.totals,
    RECOVERY_TOTAL_KEYS,
    "recovery validation totals",
  );
  invariant(
    validAggregateOnlyPrivacy(validation.privacy),
    "recovery validation privacy boundary drift",
  );

  const totals = Object.fromEntries(
    RECOVERY_TOTAL_KEYS.map((key) => [key, 0]),
  );
  for (const network of RECOVERY_NETWORKS) {
    const counters = validation.networks[network];
    exactKeys(
      counters,
      RECOVERY_NETWORK_COUNTER_KEYS,
      `recovery validation ${network}`,
    );
    invariant(
      RECOVERY_NETWORK_COUNTER_KEYS.every(
        (key) => nonNegativeInteger(counters[key]),
      ),
      `recovery validation ${network} has invalid counters`,
    );
    invariant(
      counters.trackerRows > 0
        && counters.trackerKnownWithRaw > 0
        && counters.rawHhJoined >= counters.trackerKnownWithRaw
        && counters.parserSuccess <= counters.rawHhJoined
        && counters.classFailures === 0
        && counters.classMatches === counters.trackerKnownWithRaw
        && counters.matchPctTrackerKnown === 100
        && counters.validationPassed === 1,
      `recovery validation ${network} did not pass exactly`,
    );
    for (const key of RECOVERY_TOTAL_KEYS) totals[key] += counters[key];
  }
  invariant(
    validation.networks.iPoker.trackerMissingRecovered > 0,
    "recovery validation does not prove iPoker recovery",
  );
  invariant(
    RECOVERY_TOTAL_KEYS.every(
      (key) => validation.totals[key] === totals[key],
    ),
    "recovery validation totals do not reconcile",
  );
}

function validateCurrentBase(
  snapshot,
  base,
  structuredShards,
  recoveryShards,
  membership,
  window,
) {
  exactKeys(base, [
    "schema",
    "strategy",
    "manifestSha256",
    "aggregate",
    "sourceMerges",
    "replacement",
  ], "base current proof");
  exactKeys(
    base.aggregate,
    ["sha256", "bytes", "rows"],
    "base current aggregate",
  );
  exactKeys(
    base.sourceMerges,
    ["structured", "recovery"],
    "base current source merges",
  );
  invariant(
    base.schema === REPLACEMENT_SCHEMA
      && base.strategy === REPLACEMENT_STRATEGY
      && hex64(base.manifestSha256)
      && hex64(base.aggregate.sha256)
      && positiveInteger(base.aggregate.bytes)
      && base.aggregate.rows === 36504,
    "base current schema, manifest, or aggregate drift",
  );
  invariant(
    same(base.replacement, snapshot.replacement),
    "base replacement proof does not bind the root snapshot",
  );
  validateSourceMerge(
    base.sourceMerges.structured,
    structuredShards,
    "structured-field-action",
    36504,
    membership.rows - membership.subsetProof.l3topMembers,
    window,
  );
  validateSourceMerge(
    base.sourceMerges.recovery,
    recoveryShards,
    "missing-card-recovery-full-cube",
    9126,
    membership.subsetProof.l3topMembers,
    window,
  );
  validateReplacement(snapshot.replacement, membership);
}

function validateSourceMerge(
  descriptor,
  shards,
  expectedKind,
  expectedRows,
  expectedUsers,
  window,
) {
  const recovery = expectedKind === "missing-card-recovery-full-cube";
  exactKeys(descriptor, [
    "schema",
    "manifestSha256",
    "shardStrategy",
    ...(recovery ? ["sourceKind"] : []),
    "aggregate",
    "inputs",
    "merged",
  ], `${expectedKind} source merge`);
  exactKeys(
    descriptor.aggregate,
    ["sha256", "bytes", "rows"],
    `${expectedKind} source aggregate`,
  );
  exactKeys(descriptor.merged, [
    "sha256",
    "rows",
    "windowStartInclusive",
    "windowEndExclusive",
    "knownCards",
    "totals",
    ...(recovery ? ["cube"] : []),
  ], `${expectedKind} merged result`);
  invariant(
    descriptor.schema === "ff-rfi-field-action-merge-v1"
      && descriptor.shardStrategy === "immutable-user-id"
      && (recovery
        ? descriptor.sourceKind === expectedKind
        : descriptor.sourceKind === undefined),
    `${expectedKind} source merge schema drift`,
  );
  invariant(
    hex64(descriptor.manifestSha256)
      && hex64(descriptor.aggregate.sha256)
      && positiveInteger(descriptor.aggregate.bytes)
      && descriptor.aggregate.rows === expectedRows
      && descriptor.merged.sha256 === descriptor.aggregate.sha256
      && descriptor.merged.rows === expectedRows,
    `${expectedKind} source merge aggregate drift`,
  );
  invariant(
    descriptor.merged.windowStartInclusive === window.startInclusive
      && descriptor.merged.windowEndExclusive === window.endExclusive,
    `${expectedKind} source merge window drift`,
  );
  invariant(
    validKnownCards(descriptor.merged.knownCards)
      && validExactCounters(descriptor.merged.totals, false),
    `${expectedKind} source merge counters are invalid`,
  );
  invariant(
    Array.isArray(descriptor.inputs)
      && same(descriptor.inputs, shards),
    `${expectedKind} source merge inputs drift`,
  );
  validateCompleteShardGroup(
    shards,
    expectedUsers,
    `${expectedKind} source merge`,
  );
  if (recovery) {
    exactKeys(
      descriptor.merged.cube,
      [
        "rowCount",
        "stateCount",
        "handClassesPerState",
        "coverageReconciled",
      ],
      "recovery source cube",
    );
    invariant(
      descriptor.merged.cube.rowCount === 9126
        && descriptor.merged.cube.stateCount === 54
        && descriptor.merged.cube.handClassesPerState === 169
        && descriptor.merged.cube.coverageReconciled === true,
      "recovery source cube is incomplete",
    );
  }
}

function validateReplacement(replacement, membership) {
  exactKeys(replacement, [
    "strategy",
    "replacedCohort",
    "deltaAppliedCohort",
    "membershipSubsetProof",
    "l3top",
    "l3Delta",
    "preserved",
  ], "base replacement");
  exactKeys(
    replacement.membershipSubsetProof,
    ["l3topMembers", "l3Members", "l3topIsSubsetOfL3"],
    "base replacement subset proof",
  );
  invariant(
    replacement.strategy === REPLACEMENT_STRATEGY
      && replacement.replacedCohort === "l3top"
      && replacement.deltaAppliedCohort === "l3"
      && same(replacement.membershipSubsetProof, membership.subsetProof),
    "base replacement scope or membership drift",
  );
  exactKeys(replacement.l3top, [
    "structuredRows",
    "structuredProjectionSha256",
    "recoveryRows",
    "recoveryProjectionSha256",
    "finalProjectionSha256",
    "recoveryDominatesExactly",
  ], "base replacement l3top");
  invariant(
    replacement.l3top.structuredRows === 9126
      && replacement.l3top.recoveryRows === 9126
      && hex64(replacement.l3top.structuredProjectionSha256)
      && hex64(replacement.l3top.recoveryProjectionSha256)
      && replacement.l3top.finalProjectionSha256
        === replacement.l3top.recoveryProjectionSha256
      && replacement.l3top.recoveryDominatesExactly === true,
    "base l3top replacement is not exact",
  );
  exactKeys(replacement.l3Delta, [
    "exactCells",
    "stateCount",
    "counters",
    "knownCardDelta",
    "nonnegativePerCell",
    "appliedExactly",
    "eligibleCoverageChanged",
  ], "base replacement l3 delta");
  invariant(
    replacement.l3Delta.exactCells === 9126
      && replacement.l3Delta.stateCount === 54
      && validExactCounters(replacement.l3Delta.counters, false)
      && replacement.l3Delta.knownCardDelta
        === replacement.l3Delta.counters.opportunities
      && replacement.l3Delta.nonnegativePerCell === true
      && replacement.l3Delta.appliedExactly === true
      && replacement.l3Delta.eligibleCoverageChanged === false,
    "base l3 delta is not exact",
  );
  exactKeys(replacement.preserved, ["l2", "l1"], "base preserved cohorts");
  for (const cohort of ["l2", "l1"]) {
    const preserved = replacement.preserved[cohort];
    exactKeys(preserved, [
      "rows",
      "sourceProjectionSha256",
      "finalProjectionSha256",
      "exact",
      "counters",
    ], `base preserved ${cohort}`);
    invariant(
      preserved.rows === 9126
        && preserved.exact === true
        && hex64(preserved.sourceProjectionSha256)
        && preserved.sourceProjectionSha256
          === preserved.finalProjectionSha256
        && validExactCounters(preserved.counters, false),
      `base preserved ${cohort} drift`,
    );
  }
}

function validateNovelSupplementSource(
  source,
  novelShards,
  rawTemplateSha256,
  coinPartyTemplateSha256,
  membership,
  window,
) {
  const direct = source?.schema === DIRECT_NOVEL_SCHEMA;
  const composed = source?.schema === COMPOSED_NOVEL_SCHEMA;
  invariant(direct || composed, "novel supplement schema is not approved");
  exactKeys(source, [
    "schema",
    "sourceKind",
    "strategy",
    "manifestSha256",
    "aggregate",
    "plan",
    "parserValidation",
    "inputs",
    "densification",
  ], "novel supplement source");
  exactKeys(
    source.aggregate,
    ["sha256", "bytes", "rows"],
    "novel supplement aggregate",
  );
  invariant(
    source.sourceKind === NOVEL_SOURCE_KIND
      && source.strategy === (direct
        ? DIRECT_NOVEL_STRATEGY
        : COMPOSED_NOVEL_STRATEGY)
      && hex64(source.manifestSha256)
      && hex64(source.aggregate.sha256)
      && positiveInteger(source.aggregate.bytes)
      && source.aggregate.rows === 9126,
    "novel supplement source metadata drift",
  );

  const plan = source.plan;
  const parser = source.parserValidation;
  const plannedNetworks = plan?.networks;
  invariant(
    plan?.sourceSetComplete === true
      && plan?.exactDisjointUserUnion === true
      && plan?.targetFilter === false
      && Array.isArray(plannedNetworks)
      && plannedNetworks.length > 0
      && new Set(plannedNetworks).size === plannedNetworks.length
      && plan.expectedExecutions === novelShards.length
      && parser?.gatePassed === true
      && parser?.exactMismatchTolerance === 0
      && hex64(parser?.sha256)
      && same(
        [...(parser.networks || [])].sort(),
        [...plannedNetworks].sort(),
      ),
    "novel plan or parser gate drift",
  );

  const dedicatedCoinParty =
    direct && plan.schema === DEDICATED_COIN_PARTY_PLAN_SCHEMA;
  const immutableV5 =
    direct && plan.schema === "ff-rfi-publication-eligible-full-v5-run-plan";
  if (dedicatedCoinParty) {
    validateDedicatedCoinParty(
      plan,
      parser,
      rawTemplateSha256,
      coinPartyTemplateSha256,
      membership,
      window,
    );
  } else if (immutableV5) {
    validateImmutableV5Plan(plan, parser, membership, window);
  } else if (direct) {
    invariant(false, "unapproved direct novel run-plan schema");
  } else {
    validateComposedNovelPlan(plan, parser);
  }

  invariant(
    Array.isArray(source.inputs)
      && same(source.inputs, novelShards),
    "novel root/nested safe input projections drift",
  );
  const parserValidationHashes = direct
    ? [parser.sha256]
    : parser.componentSha256;
  for (const shard of novelShards) {
    validateNovelShard(
      shard,
      shard.sourceKind === "coin-party-publication-v2"
        ? coinPartyTemplateSha256
        : rawTemplateSha256,
      window,
      plannedNetworks,
      parserValidationHashes,
    );
  }

  const inputKinds = new Set(novelShards.map((shard) => shard.sourceKind));
  if (dedicatedCoinParty) {
    invariant(
      inputKinds.size === 1
        && inputKinds.has("coin-party-publication-v2")
        && novelShards.every(
          (shard) =>
            shard.parserTemplateSha256
              === DEDICATED_COIN_PARTY_PARSER_TEMPLATE_SHA256,
        ),
      "dedicated Coin/Party input source binding drift",
    );
  } else if (immutableV5) {
    invariant(
      inputKinds.size === 1
        && inputKinds.has("immutable-plan-raw-hh-v5")
        && novelShards.every(
          (shard) =>
            shard.parserTemplateSha256
              === parser.binding.parserTemplateSha256,
        ),
      "immutable-v5 input source binding drift",
    );
  } else {
    invariant(
      inputKinds.size === 2
        && NOVEL_INPUT_SOURCE_KINDS.every((kind) => inputKinds.has(kind)),
      "composed supplement does not contain both approved source kinds",
    );
  }

  for (const network of plannedNetworks) {
    const networkShards = novelShards.filter(
      (shard) => shard.network === network,
    );
    invariant(networkShards.length > 0, `missing novel network ${network}`);
    validateCompleteShardGroup(
      networkShards,
      membership.subsetProof.l3topMembers,
      `novel ${network}`,
    );
    if (direct) {
      invariant(
        networkShards[0].userShard.count === plan.userShardsPerNetwork,
        `novel ${network} partition count does not bind the plan`,
      );
    }
    if (dedicatedCoinParty) {
      invariant(
        networkShards.every((shard) => shard.userShard.users === 61),
        `dedicated ${network} user shards are not the frozen 61-player splits`,
      );
      const actualGateTotals = Object.fromEntries(
        NOVEL_GATE_KEYS.map((key) => [
          key,
          networkShards.reduce(
            (sum, shard) => sum + shard.publicationGate[key],
            0,
          ),
        ]),
      );
      invariant(
        same(actualGateTotals, DEDICATED_COIN_PARTY_GATE_TOTALS[network]),
        `dedicated ${network} publication-gate totals drift`,
      );
    }
  }

  exactKeys(source.densification, [
    "observedInputRows",
    "observedInputCells",
    "canonicalOutputCells",
    "absentDimensionsMaterializedAsObservedZero",
    "smoothingApplied",
    "modeledValuesApplied",
  ], "novel densification");
  invariant(
    nonNegativeInteger(source.densification.observedInputRows)
      && source.densification.observedInputRows
        === novelShards.reduce((sum, shard) => sum + shard.resultRows, 0)
      && source.densification.observedInputCells
        === novelShards.reduce((sum, shard) => sum + shard.observedCells, 0)
      && source.densification.canonicalOutputCells === 9126
      && source.densification.absentDimensionsMaterializedAsObservedZero
        === true
      && source.densification.smoothingApplied === false
      && source.densification.modeledValuesApplied === false,
    "novel densification is incomplete, smoothed, or modeled",
  );
}

function validateDedicatedCoinParty(
  plan,
  parser,
  rawTemplateSha256,
  coinPartyTemplateSha256,
  membership,
  window,
) {
  const canonicalNetworks = DEDICATED_COIN_PARTY_NETWORKS.filter(
    (network) => plan.networks.includes(network),
  );
  exactKeys(plan, [
    "schema",
    "sha256",
    "sourceSetComplete",
    "networks",
    "userShardsPerNetwork",
    "expectedExecutions",
    "exactDisjointUserUnion",
    "targetFilter",
  ], "dedicated Coin/Party plan");
  exactKeys(parser, [
    "schema",
    "sha256",
    "gatePassed",
    "networks",
    "exactMismatchTolerance",
    "validatedAt",
    "binding",
    "source",
  ], "dedicated Coin/Party parser validation");
  exactKeys(parser.binding, [
    "parserTemplateSha256",
    "parserImplementationSha256",
    "grammarSha256",
    "membershipSha256",
    "userIdsSha256",
    "window",
  ], "dedicated Coin/Party parser binding");
  invariant(
    parser.schema === DEDICATED_COIN_PARTY_PARSER_SCHEMA
      && hex64(plan.sha256)
      && plan.networks.length > 0
      && same(plan.networks, canonicalNetworks)
      && plan.userShardsPerNetwork === 4
      && plan.expectedExecutions === plan.networks.length * 4
      && same(parser.networks, plan.networks)
      && parser.binding.parserTemplateSha256
        === DEDICATED_COIN_PARTY_PARSER_TEMPLATE_SHA256
      && parser.binding.parserImplementationSha256
        === DEDICATED_COIN_PARTY_PARSER_IMPLEMENTATION_SHA256
      && parser.binding.grammarSha256
        === DEDICATED_COIN_PARTY_GRAMMAR_SHA256
      && parser.binding.membershipSha256
        === DEDICATED_COIN_PARTY_MEMBERSHIP_SHA256
      && parser.binding.membershipSha256 === membership.sha256
      && parser.binding.userIdsSha256
        === DEDICATED_COIN_PARTY_USER_IDS_SHA256
      && same(parser.binding.window, DEDICATED_COIN_PARTY_WINDOW)
      && same(parser.source, DEDICATED_COIN_PARTY_SOURCE)
      && hex64(coinPartyTemplateSha256)
      && validIsoTimestamp(parser.validatedAt)
      && Date.parse(parser.validatedAt) >= Date.parse(window.endExclusive),
    "dedicated Coin/Party frozen provenance drift",
  );
}

function validateImmutableV5Plan(plan, parser, membership, window) {
  exactKeys(plan, [
    "schema",
    "sha256",
    "immutableReceiptSha256",
    "sourceSetComplete",
    "networks",
    "userShardsPerNetwork",
    "expectedExecutions",
    "exactDisjointUserUnion",
    "targetFilter",
  ], "immutable-v5 plan");
  exactKeys(parser, [
    "schema",
    "sha256",
    "gatePassed",
    "networks",
    "exactMismatchTolerance",
    "validatedAt",
    "binding",
  ], "immutable-v5 parser validation");
  exactKeys(parser.binding, [
    "planSha256",
    "parserTemplateSha256",
    "parserBodySha256",
    "membershipSha256",
    "membershipKeysSha256",
    "selectedUserIdsSha256",
    "window",
  ], "immutable-v5 parser binding");
  invariant(
    parser.schema === "ff-rfi-raw-hh-parser-validation-v2"
      && hex64(plan.sha256)
      && hex64(plan.immutableReceiptSha256)
      && positiveInteger(plan.userShardsPerNetwork)
      && hex64(parser.binding.planSha256)
      && hex64(parser.binding.parserTemplateSha256)
      && hex64(parser.binding.parserBodySha256)
      && hex64(parser.binding.membershipSha256)
      && hex64(parser.binding.membershipKeysSha256)
      && hex64(parser.binding.selectedUserIdsSha256)
      && parser.binding.planSha256 === plan.sha256
      && parser.binding.membershipSha256 === membership.sha256
      && parser.binding.membershipKeysSha256 === membership.keysSha256
      && same(parser.binding.window, window)
      && validIsoTimestamp(parser.validatedAt)
      && Date.parse(parser.validatedAt) >= Date.parse(window.endExclusive),
    "immutable-v5 parser or plan binding drift",
  );
}

function validateComposedNovelPlan(plan, parser) {
  exactKeys(plan, [
    "schema",
    "sourceSetComplete",
    "networks",
    "userShardsPerNetwork",
    "expectedExecutions",
    "exactDisjointUserUnion",
    "disjointNetworkSets",
    "targetFilter",
    "componentManifestSha256",
  ], "composed novel plan");
  exactKeys(parser, [
    "schema",
    "sha256",
    "gatePassed",
    "networks",
    "exactMismatchTolerance",
    "componentSha256",
  ], "composed novel parser validation");
  invariant(
    plan.schema
      === "ff-rfi-field-action-novel-raw-supplement-composition-plan-v1"
      && parser.schema
        === "ff-rfi-field-action-novel-raw-parser-validation-composition-v1"
      && plan.userShardsPerNetwork === null
      && plan.disjointNetworkSets === true
      && Array.isArray(plan.componentManifestSha256)
      && plan.componentManifestSha256.length >= 2
      && plan.componentManifestSha256.every(hex64)
      && new Set(plan.componentManifestSha256).size
        === plan.componentManifestSha256.length
      && Array.isArray(parser.componentSha256)
      && parser.componentSha256.length
        === plan.componentManifestSha256.length
      && parser.componentSha256.every(hex64)
      && new Set(parser.componentSha256).size
        === parser.componentSha256.length,
    "composed novel source-set proof drift",
  );
}

function validateNovelShard(
  shard,
  expectedTemplateSha256,
  window,
  plannedNetworks,
  parserValidationHashes,
) {
  exactKeys(shard, NOVEL_KEYS, "novel action shard");
  invariant(
    NOVEL_INPUT_SOURCE_KINDS.includes(shard.sourceKind)
      && plannedNetworks.includes(shard.network),
    "novel shard source kind or network is not approved",
  );
  for (const key of [
    "rendererMetadataSha256",
    "receiptSha256",
    "querySha256",
    "resultSha256",
    "templateSha256",
    "parserTemplateSha256",
    "parserValidationSha256",
  ]) {
    invariant(hex64(shard[key]), `novel shard ${key} is invalid`);
  }
  invariant(
    shard.templateSha256 === expectedTemplateSha256
      && parserValidationHashes.includes(shard.parserValidationSha256),
    "novel shard template or parser validation binding drift",
  );
  invariant(
    shard.executionMode === "async"
      && CH_JOB_ID.test(String(shard.queryJobId || "")),
    "novel shard execution identity is invalid",
  );
  validateExecutionWindow(shard, window, "novel shard");
  invariant(
    nonNegativeInteger(shard.resultRows)
      && positiveInteger(shard.resultBytes)
      && nonNegativeInteger(shard.observedStates)
      && shard.observedStates <= 54
      && nonNegativeInteger(shard.observedCells)
      && shard.observedCells <= 9126
      && shard.resultRows === shard.observedCells,
    "novel shard result or observed-cell counters drift",
  );
  validateUserShard(shard.userShard, "novel shard");
  validateNovelGate(shard.publicationGate);
  invariant(
    same(shard.privacy, {
      aggregateOnly: true,
      noRawHandHistories: true,
      noPlayerLevelRows: true,
      noUserIds: true,
    }),
    "novel shard privacy boundary drift",
  );
}

function validateNovelGate(gate) {
  exactKeys(gate, NOVEL_GATE_KEYS, "novel publication gate");
  invariant(
    NOVEL_GATE_KEYS.every((key) => nonNegativeInteger(gate[key]))
      && gate.raw_keys === gate.exact_id_match_keys + gate.nominal_novel_keys
      && gate.publication_eligible_keys
        <= gate.normalized_time_eligible_keys
      && gate.normalized_time_eligible_keys <= gate.nominal_novel_keys,
    "novel publication gate counters do not reconcile",
  );
}

function validateSupplementAndFinal(snapshot, current, membership) {
  exactKeys(
    current.supplement,
    ["l3topAdditive", "l3Delta", "preserved"],
    "supplement proof",
  );
  exactKeys(
    current.supplement.preserved,
    ["l2", "l1"],
    "supplement preserved cohorts",
  );
  const top = current.supplement.l3topAdditive;
  const delta = current.supplement.l3Delta;
  validateSupplementDelta(top, false, "l3top additive");
  validateSupplementDelta(delta, true, "l3 delta");
  invariant(
    delta.cloneEqualsL3top === true
      && delta.deltaProjectionSha256 === top.deltaProjectionSha256
      && same(delta.counters, top.counters),
    "l3 delta is not the exact l3top supplement clone",
  );

  const cohortTotals = snapshot.cohortActionCounterTotals;
  const exactTotals = snapshot.exactActionCounterTotals;
  invariant(
    same(Object.keys(cohortTotals || {}), COHORTS)
      && COHORTS.every((cohort) =>
        validExactCounters(cohortTotals[cohort], false)
      )
      && validExactCounters(exactTotals, false),
    "cohort or exact action counter totals are invalid",
  );
  const summed = Object.fromEntries(
    COMPOSITION_COUNTERS.map((counter) => [
      counter,
      COHORTS.reduce(
        (sum, cohort) => sum + cohortTotals[cohort][counter],
        0,
      ),
    ]),
  );
  invariant(
    same(summed, exactTotals),
    "cohort action counter totals do not sum to the exact total",
  );

  for (const cohort of ["l2", "l1"]) {
    const preserved = current.supplement.preserved[cohort];
    const basePreserved = current.baseCurrent.replacement.preserved[cohort];
    exactKeys(preserved, [
      "rows",
      "sourceProjectionSha256",
      "finalProjectionSha256",
      "counters",
      "exact",
    ], `supplement preserved ${cohort}`);
    invariant(
      preserved.rows === 9126
        && preserved.exact === true
        && hex64(preserved.sourceProjectionSha256)
        && preserved.sourceProjectionSha256
          === preserved.finalProjectionSha256
        && validExactCounters(preserved.counters, false)
        && same(preserved.counters, cohortTotals[cohort])
        && same(basePreserved.counters, cohortTotals[cohort]),
      `supplement preserved ${cohort} drift`,
    );
  }

  const actionSource = snapshot.actionCountReconciliation?.source;
  invariant(
    same(
      actionSource,
      snapshot.actionCountReconciliation?.aggregated,
    )
      && same(actionSource, {
        opportunities: exactTotals.opportunities,
        regularRaise: exactTotals.regular_raise,
        openShove: exactTotals.open_shove,
        limp: exactTotals.limp,
        foldOther: exactTotals.fold_other,
      }),
    "public action reconciliation does not bind exact counters",
  );
  invariant(
    validKnownCards(snapshot.knownCards)
      && snapshot.knownCards.known === exactTotals.opportunities,
    "known-card totals do not bind exact opportunities",
  );

  exactKeys(current.final, ["aggregate", "privacy"], "final proof");
  const aggregate = current.final.aggregate;
  exactKeys(aggregate, [
    "sha256",
    "bytes",
    "rows",
    "windowStartInclusive",
    "windowEndExclusive",
    "knownCards",
    "totals",
    "cube",
  ], "final aggregate proof");
  exactKeys(aggregate.cube, [
    "rowCount",
    "stateCount",
    "handClassesPerState",
    "coverageReconciled",
  ], "final cube proof");
  invariant(
    aggregate.sha256 === snapshot.sha256
      && positiveInteger(aggregate.bytes)
      && aggregate.rows === 36504
      && aggregate.windowStartInclusive === current.window.startInclusive
      && aggregate.windowEndExclusive === current.window.endExclusive
      && aggregate.cube.rowCount === 36504
      && aggregate.cube.stateCount === 216
      && aggregate.cube.handClassesPerState === 169
      && aggregate.cube.coverageReconciled === true
      && same(aggregate.totals, exactTotals)
      && same(
        comparableKnownCards(aggregate.knownCards),
        comparableKnownCards(snapshot.knownCards),
      )
      && validAggregateOnlyPrivacy(current.final.privacy),
    "final aggregate, cube, counters, or privacy proof drift",
  );
  invariant(
    current.membership.rows === membership.rows,
    "final proof membership binding drift",
  );
}

function validateSupplementDelta(proof, clone, label) {
  exactKeys(proof, [
    "exactCells",
    "stateCount",
    "counters",
    "eligibleDelta",
    "knownCardDelta",
    "opportunitiesDelta",
    "lookupMismatchDelta",
    "deltaProjectionSha256",
    ...(clone ? ["cloneEqualsL3top"] : []),
    "nonnegativePerCell",
    "appliedExactly",
  ], label);
  invariant(
    proof.exactCells === 9126
      && proof.stateCount === 54
      && validExactCounters(proof.counters, true)
      && proof.eligibleDelta === proof.counters.opportunities
      && proof.knownCardDelta === proof.counters.opportunities
      && proof.opportunitiesDelta === proof.counters.opportunities
      && proof.lookupMismatchDelta === 0
      && hex64(proof.deltaProjectionSha256)
      && proof.nonnegativePerCell === true
      && proof.appliedExactly === true,
    `${label} is not an exact observed delta`,
  );
}

function validateCompleteShardGroup(shards, expectedUsers, label) {
  invariant(shards.length > 0, `${label} has no shards`);
  const count = shards[0].userShard.count;
  invariant(
    shards.length === count
      && shards.every((shard) => shard.userShard.count === count)
      && same(
        shards
          .map((shard) => shard.userShard.index)
          .sort((left, right) => left - right),
        Array.from({ length: count }, (_, index) => index),
      )
      && new Set(
        shards.map((shard) => shard.userShard.userIdsSha256),
      ).size === count
      && new Set(shards.map((shard) => shard.queryJobId)).size
        === shards.length
      && shards.reduce(
        (sum, shard) => sum + shard.userShard.users,
        0,
      ) === expectedUsers,
    `${label} does not cover one complete disjoint immutable partition`,
  );
}

function validateUserShard(userShard, label) {
  exactKeys(userShard, USER_SHARD_KEYS, `${label} user shard`);
  invariant(
    nonNegativeInteger(userShard.index)
      && positiveInteger(userShard.count)
      && userShard.index < userShard.count
      && positiveInteger(userShard.users)
      && hex64(userShard.userIdsSha256),
    `${label} user-shard identity is invalid`,
  );
}

function validateExecutionWindow(value, window, label) {
  invariant(
    validIsoTimestamp(value.startedAt)
      && validIsoTimestamp(value.finishedAt)
      && Date.parse(value.startedAt) <= Date.parse(value.finishedAt)
      && Date.parse(value.finishedAt) >= Date.parse(window.endExclusive),
    `${label} execution receipt timing is invalid`,
  );
  invariant(
    value.windowStartInclusive === window.startInclusive
      && value.windowEndExclusive === window.endExclusive,
    `${label} source window drift`,
  );
}

function validExecution(jobId, querySha256, executionMode) {
  if (executionMode === "sync") return jobId === `sync:${querySha256}`;
  return executionMode === "async" && CH_JOB_ID.test(String(jobId || ""));
}

function validExactCounters(value, novelRaw) {
  if (!value) return false;
  if (!same([...Object.keys(value)].sort(), [...COMPOSITION_COUNTERS].sort())) {
    return false;
  }
  return COMPOSITION_COUNTERS.every((key) => nonNegativeInteger(value[key]))
    && value.raises_total === value.regular_raise + value.open_shove
    && value.opportunities
      === value.raises_total + value.limp + value.fold_other
    && value.open_shove
      === value.shove_allin_flag + value.shove_effective_amount_only
    && value.normal_three_bb_as_shove === 0
    && (!novelRaw || value.non_exact_r_effective_allin === 0);
}

function validKnownCards(value) {
  return Boolean(
    value
      && nonNegativeInteger(value.eligible)
      && nonNegativeInteger(value.known)
      && nonNegativeInteger(value.lookupMismatch)
      && value.eligible >= value.known
      && value.lookupMismatch <= value.eligible
      && (value.eligible === 0
        ? value.pct === 100
        : Math.abs(value.pct - value.known / value.eligible * 100)
          <= 0.000001),
  );
}

function comparableKnownCards(value) {
  return {
    eligible: value?.eligible,
    known: value?.known,
    lookupMismatch: value?.lookupMismatch,
    pct: value?.pct,
  };
}

function validAggregateOnlyPrivacy(value) {
  return same(value, {
    aggregateOnly: true,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  });
}

function validHalfOpenWindow(window) {
  return Boolean(
    window
      && validIsoTimestamp(window.startInclusive)
      && validIsoTimestamp(window.endExclusive)
      && Date.parse(window.startInclusive) < Date.parse(window.endExclusive)
      && window.semantics === "half-open-utc",
  );
}

function inclusiveEnd(endExclusive) {
  const timestamp = Date.parse(endExclusive);
  invariant(Number.isFinite(timestamp), "invalid exclusive source-window end");
  return new Date(timestamp - 1).toISOString();
}

function validIsoTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
    String(value || ""),
  ) && Number.isFinite(Date.parse(value));
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function hex64(value) {
  return SHA256.test(String(value || ""));
}

function exactKeys(value, expected, label) {
  invariant(
    value
      && same([...Object.keys(value)].sort(), [...expected].sort()),
    `${label} contains missing or unapproved fields`,
  );
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`RFI current supplement: ${message}`);
  }
}
