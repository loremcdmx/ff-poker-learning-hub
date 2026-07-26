(function () {
  "use strict";

  var fieldData = window.PokerRfiFieldActionData;
  var observedConfidence = window.FFObservedFrequencyConfidence;
  if (!observedConfidence) throw new Error("FFObservedFrequencyConfidence is required");
  var exactCellMinimum = observedConfidence.MIN_EXACT_DENOMINATOR;
  var expectedCohortOrder = ["l3top", "l3", "l2", "l1"];
  var expectedStackOrder = ["70+", "30-70", "20-30", "15-20", "<15"];
  var expectedPositions = ["EP", "MP", "HJ", "CO", "BTN", "SB"];
  var replacementSchema = "ff-rfi-field-action-cohort-replacement-v1";
  var replacementStrategy = "exact-same-window-l3top-replacement-with-l3-delta";
  var compositionSchema = "ff-rfi-field-action-composition-v1";
  var compositionStrategy = "adjacent-historical-raw-plus-current-recovery-adjusted";
  var currentSupplementSchema = "ff-rfi-field-action-current-supplement-v1";
  var currentSupplementStrategy = "exact-same-window-novel-raw-l3top-supplement-with-l3-delta";
  var currentSupplementWindow = {
    startInclusive: "2023-09-01T00:00:00Z",
    endExclusive: "2026-07-26T00:00:00Z",
    semantics: "half-open-utc"
  };
  var directNovelSupplementSchema = "ff-rfi-field-action-novel-raw-supplement-merge-v1";
  var directNovelSupplementStrategy = "approved-plan-source-union-with-observed-zero-dimension-completion";
  var composedNovelSupplementSchema = "ff-rfi-field-action-novel-raw-supplement-composition-v1";
  var composedNovelSupplementStrategy = "disjoint-approved-source-set-supplement-union-v1";
  var novelRawSourceKind = "publication-safe-novel-raw-hh-l3top";
  var novelInputSourceKinds = ["coin-party-publication-v2", "immutable-plan-raw-hh-v5"];
  var dedicatedCoinPartyPlanSchema = "ff-rfi-coin-party-publication-run-plan-v2";
  var dedicatedCoinPartyParserSchema = "ff-rfi-coin-party-parser-validation-v2";
  var dedicatedCoinPartyNetworks = ["CoinPoker", "PartyPoker"];
  var dedicatedCoinPartyParserTemplateSha256 =
    "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f";
  var dedicatedCoinPartyParserImplementationSha256 =
    "673a2d5967625a6874e5acade450269fc30677cb786418a85af593b77e407d3e";
  var dedicatedCoinPartyGrammarSha256 =
    "e570a7271fd8dbff3c90bb840335f28eda10f63094065c57b8c4c328170e8f06";
  var dedicatedCoinPartyMembershipSha256 =
    "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d";
  var dedicatedCoinPartyUserIdsSha256 =
    "322fabfabb4ab4b6359c6720125dfb534525559e854c95fff79b9c1b11ccc771";
  var dedicatedCoinPartyWindow = ["2023-09-01", "2026-07-26"];
  var dedicatedCoinPartyParserSource = {
    inputSha256: "2d1e2323a6d497b85b94d6278249dc3e9d78cce2c52477936021d5b9046592f6",
    inputBytes: 2859078,
    rows: 1366,
    uniqueUsers: 22,
    firstObservedAt: "2026-02-08T00:19:28Z",
    lastObservedAt: "2026-07-20T20:39:15Z",
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false
  };
  var dedicatedCoinPartyGateTotals = {
    CoinPoker: {
      raw_keys: 651627,
      exact_id_match_keys: 630348,
      nominal_novel_keys: 21279,
      normalized_time_eligible_keys: 19759,
      publication_eligible_keys: 19759
    },
    PartyPoker: {
      raw_keys: 198324,
      exact_id_match_keys: 190491,
      nominal_novel_keys: 7833,
      normalized_time_eligible_keys: 7828,
      publication_eligible_keys: 7828
    }
  };
  var safeNovelInputKeys = [
    "sourceKind", "network", "userShard", "queryJobId", "executionMode",
    "startedAt", "finishedAt", "rendererMetadataSha256", "receiptSha256",
    "querySha256", "resultSha256", "resultRows", "resultBytes",
    "observedStates", "observedCells", "templateSha256",
    "parserTemplateSha256", "parserValidationSha256", "publicationGate",
    "windowStartInclusive", "windowEndExclusive", "privacy"
  ];
  var safeBaseCommonInputKeys = [
    "sourceKind", "queryJobId", "executionMode", "startedAt", "finishedAt",
    "rendererMetadataSha256", "receiptSha256", "querySha256",
    "resultSha256", "resultRows", "resultBytes", "templateSha256",
    "windowStartInclusive", "windowEndExclusive", "userShard",
    "membershipSha256", "membershipKeysSha256", "privacy"
  ];
  var safeBaseStructuredInputKeys = safeBaseCommonInputKeys.concat([
    "handClassMode", "holecardMappingSha256"
  ]);
  var safeBaseRecoveryInputKeys = safeBaseCommonInputKeys.concat([
    "parserGrammarsSha256", "parserNetworks", "recoveryIsDisjoint",
    "recoveryPredicate", "rawJoin", "validation"
  ]);
  var safeUserShardKeys = ["index", "count", "users", "userIdsSha256"];
  var safeRecoveryValidationKeys = [
    "schema", "manifestSha256", "queryJobId", "queryExecutionMode",
    "startedAt", "finishedAt", "rendererMetadataSha256",
    "renderedSqlSha256", "queryTemplateSha256", "resultSha256",
    "resultRows", "resultBytes", "receiptSha256", "window", "networks",
    "totals", "privacy"
  ];
  var safeRecoveryNetworkCounterKeys = [
    "trackerRows", "trackerKnownWithRaw", "rawHhJoined", "parserSuccess",
    "classMatches", "classFailures", "matchPctTrackerKnown",
    "trackerMissingRecovered", "validationPassed"
  ];
  var safeRecoveryTotalKeys = [
    "trackerRows", "trackerKnownWithRaw", "rawHhJoined", "parserSuccess",
    "classMatches", "classFailures", "trackerMissingRecovered"
  ];
  var recoverySourceTables = [
    "analytics.int_tracker_hand_joined",
    "analytics.stg_hh_texts__hh_texts"
  ];
  var recoveryRawJoin = {
    type: "exact-key",
    trackerKey: ["toUInt64(user_id)", "toString(network)", "toString(hh_id)"],
    rawKey: ["toUInt64(check_user_id)", "toString(network)", "toString(converted_hh_id)"]
  };
  var recoveryParserNetworks = [
    "888Poker",
    "Chico",
    "GGNetwork",
    "PokerPlanets",
    "PokerStars",
    "PokerStars(FR-ES-PT)",
    "Winamax.fr",
    "WPN",
    "iPoker"
  ];
  var historicalParserNetworks = [
    "888Poker",
    "GGNetwork",
    "PokerStars",
    "PokerStars(FR-ES-PT)",
    "Winamax.fr",
    "WPN",
    "iPoker"
  ];
  var historicalValidationChecks = ["cards", "position", "stack", "publicStack", "action", "shove"];
  var compositionCounterNames = [
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
    "non_exact_r_effective_allin"
  ];
  var expectedStackAggregation = {
    "70+": ["70+"],
    "30-70": ["30-70"],
    "20-30": ["20-30"],
    "15-20": ["15-20"],
    "<15": ["12-15", "10-12", "8-10", "6-8", "<6"]
  };
  var cohortOrder = fieldData && fieldData.cohortOrder || expectedCohortOrder;
  var cohortLabels = {
    l3top: "Лига 3 · топ-25%",
    l3: "Лига 3",
    l2: "Лига 2",
    l1: "Первая лига"
  };

  function hex64(value) {
    return /^[a-f0-9]{64}$/.test(String(value || ""));
  }

  function validDate(value) {
    var text = String(value || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    var timestamp = Date.parse(text + "T00:00:00Z");
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === text;
  }

  function nextDate(value) {
    return new Date(Date.parse(value + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
  }

  function failPublication(reason) {
    return Object.freeze({ ready: false, reason: reason });
  }

  function validExecution(sourceRef, querySha256, executionMode, asyncPattern) {
    if (executionMode === "sync") return sourceRef === "sync:" + querySha256;
    return executionMode === "async" && asyncPattern.test(String(sourceRef || ""));
  }

  function sameJson(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function positiveInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
  }

  function nonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function validStructuredShard(shard, templateSha256) {
    if (shard.sourceKind && shard.sourceKind !== "structured-field-action") return false;
    if (shard.templateSha256 !== templateSha256) return false;
    if (shard.sourceTable === "analytics.int_tracker_hand_joined") {
      return shard.handClassMode === "joined-holecards-str";
    }
    if (shard.sourceTable === "analytics.bak20260720_int_tracker_hand_joined") {
      return shard.handClassMode === "verified-holecard-id-1-169" && hex64(shard.holecardMappingSha256);
    }
    return false;
  }

  function validRecoveryValidation(validation, recoveryTemplateSha256) {
    if (!validation || validation.schema !== "ff-rfi-missing-card-recovery-validation-v1") return false;
    for (var hashKey of [
      "manifestSha256",
      "rendererMetadataSha256",
      "renderedSqlSha256",
      "queryTemplateSha256",
      "resultSha256",
      "receiptSha256"
    ]) {
      if (!hex64(validation[hashKey])) return false;
    }
    if (validation.queryTemplateSha256 !== recoveryTemplateSha256 ||
      !validExecution(
        validation.queryJobId,
        validation.renderedSqlSha256,
        validation.queryExecutionMode,
        /^mcp_ch_job_[a-f0-9]{32}$/
      )) return false;
    if (validation.queryExecutionMode === "sync" &&
      validation.receiptSchema !== "ff-rfi-card-parser-validation-receipt-v1") return false;
    if (!sameJson(validation.window, {
      startInclusive: "2026-07-01T00:00:00Z",
      endExclusive: "2026-07-02T00:00:00Z",
      semantics: "half-open-utc"
    })) return false;
    if (validation.resultRowCount !== recoveryParserNetworks.length ||
      validation.receiptRowCount !== recoveryParserNetworks.length ||
      !positiveInteger(validation.resultBytes) ||
      validation.receiptBytes !== validation.resultBytes) return false;
    if (!validation.networks ||
      Object.keys(validation.networks).sort().join("|") !== recoveryParserNetworks.slice().sort().join("|")) return false;

    var totals = {
      trackerRows: 0,
      trackerKnownWithRaw: 0,
      rawHhJoined: 0,
      parserSuccess: 0,
      classMatches: 0,
      classFailures: 0,
      trackerMissingRecovered: 0
    };
    for (var networkIndex = 0; networkIndex < recoveryParserNetworks.length; networkIndex += 1) {
      var network = recoveryParserNetworks[networkIndex];
      var counters = validation.networks[network] || {};
      if (!positiveInteger(counters.trackerRows) ||
        !positiveInteger(counters.trackerKnownWithRaw) ||
        !nonNegativeInteger(counters.rawHhJoined) ||
        !nonNegativeInteger(counters.parserSuccess) ||
        !nonNegativeInteger(counters.classMatches) ||
        !nonNegativeInteger(counters.classFailures) ||
        !nonNegativeInteger(counters.trackerMissingRecovered) ||
        counters.rawHhJoined < counters.trackerKnownWithRaw ||
        counters.parserSuccess > counters.rawHhJoined ||
        counters.classFailures !== 0 ||
        counters.classMatches !== counters.trackerKnownWithRaw ||
        counters.matchPctTrackerKnown !== 100 ||
        counters.validationPassed !== 1) return false;
      if (network === "iPoker" && counters.trackerMissingRecovered <= 0) return false;
      for (var totalKey in totals) totals[totalKey] += counters[totalKey];
    }
    if (!sameJson(validation.totals, totals) ||
      validation.rawHandHistoriesPublished !== false ||
      validation.personalIdentifiersPublished !== false) return false;
    return true;
  }

  function validRecoveryShard(shard, recoveryTemplateSha256) {
    if (shard.sourceKind !== "missing-card-recovery-full-cube" ||
      shard.rendererSchema !== "ff-rfi-missing-card-recovery-render-v1" ||
      shard.rendererMode !== "full-cube" ||
      !hex64(shard.rendererMetadataSha256) ||
      !hex64(shard.receiptSha256) ||
      !positiveInteger(shard.receiptRowCount) ||
      shard.receiptRowCount !== shard.rows ||
      !positiveInteger(shard.receiptBytes) ||
      shard.templateSha256 !== recoveryTemplateSha256 ||
      !sameJson(shard.sourceTables, recoverySourceTables) ||
      shard.sourceTable !== recoverySourceTables[0] ||
      shard.handClassMode !== "structured-or-validated-raw-when-empty-v1" ||
      shard.recoveryPredicate !== "latest structured_hand_class = ''" ||
      shard.recoveryIsDisjoint !== true ||
      !sameJson(shard.rawJoin, recoveryRawJoin) ||
      !sameJson(shard.parserNetworks, recoveryParserNetworks) ||
      !hex64(shard.parserGrammarsSha256) ||
      !hex64(shard.selectedMembershipKeysSha256) ||
      !positiveInteger(shard.selectedMembershipRows) ||
      !positiveInteger(shard.selectedUniqueUsers) ||
      shard.selectedUniqueUsers > shard.selectedMembershipRows ||
      !sameJson(Object.keys(shard.selectedCohortCounts || {}), ["l3top"]) ||
      shard.selectedCohortCounts.l3top !== shard.selectedMembershipRows ||
      shard.sourceUniqueUsers !== shard.selectedUniqueUsers ||
      !validRecoveryValidation(shard.validation, recoveryTemplateSha256)) return false;
    return true;
  }

  function validAggregateOnlyPrivacy(value) {
    return sameJson(value, {
      aggregateOnly: true,
      rawHandHistoriesPublished: false,
      personalIdentifiersPublished: false
    });
  }

  function validSafeNovelPrivacy(value) {
    return sameJson(value, {
      aggregateOnly: true,
      noRawHandHistories: true,
      noPlayerLevelRows: true,
      noUserIds: true
    });
  }

  function isNovelShard(shard) {
    return novelInputSourceKinds.includes(shard && shard.sourceKind);
  }

  function validIsoTimestamp(value) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      String(value || "")
    )) return false;
    var timestamp = Date.parse(String(value || ""));
    return Number.isFinite(timestamp);
  }

  function validExactCounterObject(value, novelRaw) {
    if (!value ||
      Object.keys(value).sort().join("|") !== compositionCounterNames.slice().sort().join("|")) return false;
    for (var counterIndex = 0; counterIndex < compositionCounterNames.length; counterIndex += 1) {
      if (!nonNegativeInteger(value[compositionCounterNames[counterIndex]])) return false;
    }
    return value.raises_total === value.regular_raise + value.open_shove &&
      value.opportunities === value.raises_total + value.limp + value.fold_other &&
      value.open_shove === value.shove_allin_flag + value.shove_effective_amount_only &&
      value.normal_three_bb_as_shove === 0 &&
      (!novelRaw || value.non_exact_r_effective_allin === 0);
  }

  function validNovelGate(value) {
    if (!value) return false;
    for (var field of [
      "raw_keys",
      "exact_id_match_keys",
      "nominal_novel_keys",
      "normalized_time_eligible_keys",
      "publication_eligible_keys"
    ]) {
      if (!nonNegativeInteger(value[field])) return false;
    }
    return value.raw_keys === value.exact_id_match_keys + value.nominal_novel_keys &&
      value.publication_eligible_keys <= value.normalized_time_eligible_keys &&
      value.normalized_time_eligible_keys <= value.nominal_novel_keys;
  }

  function novelInputProjection(shard) {
    return {
      sourceKind: shard.sourceKind,
      network: shard.network,
      userShard: shard.userShard,
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
      publicationGate: shard.publicationGate,
      windowStartInclusive: shard.windowStartInclusive,
      windowEndExclusive: shard.windowEndExclusive,
      privacy: shard.privacy
    };
  }

  function validNovelShard(
    shard,
    rawTemplateSha256,
    window,
    plannedNetworks,
    parserValidationHashes
  ) {
    return isNovelShard(shard) &&
      Object.keys(shard).sort().join("|") ===
        safeNovelInputKeys.slice().sort().join("|") &&
      plannedNetworks.includes(shard.network) &&
      hex64(shard.rendererMetadataSha256) &&
      hex64(shard.receiptSha256) &&
      hex64(shard.querySha256) &&
      hex64(shard.resultSha256) &&
      hex64(shard.parserTemplateSha256) &&
      hex64(shard.parserValidationSha256) &&
      parserValidationHashes.includes(shard.parserValidationSha256) &&
      shard.templateSha256 === rawTemplateSha256 &&
      validExecution(
        shard.queryJobId,
        shard.querySha256,
        shard.executionMode,
        /^mcp_ch_job_[a-f0-9]{32,}$/
      ) &&
      validIsoTimestamp(shard.startedAt) &&
      validIsoTimestamp(shard.finishedAt) &&
      Date.parse(shard.startedAt) <= Date.parse(shard.finishedAt) &&
      Date.parse(shard.finishedAt) >= Date.parse(window.endExclusive) &&
      nonNegativeInteger(shard.resultRows) &&
      positiveInteger(shard.resultBytes) &&
      nonNegativeInteger(shard.observedStates) &&
      shard.observedStates <= 54 &&
      nonNegativeInteger(shard.observedCells) &&
      shard.observedCells <= 9126 &&
      shard.resultRows === shard.observedCells &&
      Object.keys(shard.userShard || {}).sort().join("|") ===
        safeUserShardKeys.slice().sort().join("|") &&
      nonNegativeInteger(shard.userShard && shard.userShard.index) &&
      positiveInteger(shard.userShard && shard.userShard.count) &&
      shard.userShard.index < shard.userShard.count &&
      positiveInteger(shard.userShard.users) &&
      hex64(shard.userShard.userIdsSha256) &&
      shard.windowStartInclusive === window.startInclusive &&
      shard.windowEndExclusive === window.endExclusive &&
      validNovelGate(shard.publicationGate) &&
      validSafeNovelPrivacy(shard.privacy);
  }

  function validShardCoverage(shards, sourceWindowStart, sourceWindowEnd) {
    if (!shards.length) return false;
    var ordered = shards.slice().sort(function (left, right) {
      return left.windowStartInclusive.localeCompare(right.windowStartInclusive);
    });
    var sameWindow = ordered.every(function (shard) {
      return shard.windowStartInclusive === sourceWindowStart &&
        shard.windowEndInclusive === sourceWindowEnd;
    });
    if (sameWindow) {
      var shardCount = ordered[0].userShard.count;
      var sourceUsers = ordered[0].sourceUniqueUsers;
      return shardCount === ordered.length &&
        new Set(ordered.map(function (shard) { return shard.userShard.userIdsSha256; })).size === ordered.length &&
        new Set(ordered.map(function (shard) { return shard.sourceUniqueUsers; })).size === 1 &&
        ordered.reduce(function (sum, shard) { return sum + shard.shardUsers; }, 0) === sourceUsers &&
        ordered.map(function (shard) { return shard.userShard.index; }).sort(function (a, b) { return a - b; }).join("|") ===
          Array.from({ length: shardCount }, function (_, index) { return index; }).join("|");
    }
    if (ordered[0].windowStartInclusive !== sourceWindowStart ||
      ordered[ordered.length - 1].windowEndInclusive !== sourceWindowEnd) return false;
    for (var index = 0; index < ordered.length; index += 1) {
      var shard = ordered[index];
      if (shard.userShard.index !== 0 || shard.userShard.count !== 1 ||
        shard.shardUsers !== shard.sourceUniqueUsers) return false;
      if (index && Date.parse(ordered[index - 1].windowEndInclusive) + 1 !==
        Date.parse(shard.windowStartInclusive)) return false;
    }
    return true;
  }

  function validReplacementProof(snapshot, recoveryShards) {
    var replacement = snapshot.replacement || {};
    var subset = replacement.membershipSubsetProof || {};
    var top = replacement.l3top || {};
    var delta = replacement.l3Delta || {};
    if (snapshot.rows !== 36504 ||
      replacement.strategy !== replacementStrategy ||
      replacement.replacedCohort !== "l3top" ||
      replacement.deltaAppliedCohort !== "l3" ||
      subset.l3topIsSubsetOfL3 !== true ||
      !positiveInteger(subset.l3topMembers) ||
      !positiveInteger(subset.l3Members) ||
      subset.l3topMembers > subset.l3Members ||
      !recoveryShards.every(function (shard) {
        return shard.selectedUniqueUsers === subset.l3topMembers;
      })) return false;
    if (top.structuredRows !== 9126 ||
      top.recoveryRows !== 9126 ||
      !hex64(top.structuredProjectionSha256) ||
      !hex64(top.recoveryProjectionSha256) ||
      !hex64(top.finalProjectionSha256) ||
      top.recoveryDominatesExactly !== true ||
      top.recoveryProjectionSha256 !== top.finalProjectionSha256) return false;
    if (delta.exactCells !== 9126 ||
      delta.stateCount !== 54 ||
      delta.nonnegativePerCell !== true ||
      delta.appliedExactly !== true ||
      delta.eligibleCoverageChanged !== false ||
      !positiveInteger(delta.knownCardDelta) ||
      !delta.counters ||
      !nonNegativeInteger(delta.counters.opportunities) ||
      delta.knownCardDelta !== delta.counters.opportunities) return false;
    for (var deltaCounter of Object.values(delta.counters)) {
      if (!nonNegativeInteger(deltaCounter)) return false;
    }
    for (var preservedCohort of ["l2", "l1"]) {
      var preserved = replacement.preserved && replacement.preserved[preservedCohort] || {};
      if (preserved.rows !== 9126 ||
        preserved.exact !== true ||
        !hex64(preserved.sourceProjectionSha256) ||
        preserved.sourceProjectionSha256 !== preserved.finalProjectionSha256) return false;
    }
    return true;
  }

  function validHalfOpenWindow(window) {
    return Boolean(window &&
      /^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(String(window.startInclusive || "")) &&
      /^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(String(window.endExclusive || "")) &&
      window.startInclusive < window.endExclusive &&
      window.semantics === "half-open-utc");
  }

  function inclusiveEnd(endExclusive) {
    var timestamp = Date.parse(endExclusive);
    return Number.isFinite(timestamp) ? new Date(timestamp - 1).toISOString() : "";
  }

  function validHistoricalValidation(validation) {
    if (!validation ||
      validation.status !== "passed" ||
      !positiveInteger(validation.rows) ||
      validation.parsed !== validation.rows ||
      validation.rejected !== 0 ||
      !hex64(validation.reportSha256) ||
      !validation.networks ||
      Object.keys(validation.networks).sort().join("|") !== historicalParserNetworks.slice().sort().join("|") ||
      !validation.checks ||
      Object.keys(validation.checks).sort().join("|") !== historicalValidationChecks.slice().sort().join("|")) return false;

    for (var checkIndex = 0; checkIndex < historicalValidationChecks.length; checkIndex += 1) {
      var checkName = historicalValidationChecks[checkIndex];
      var totalCheck = validation.checks[checkName] || {};
      if (!nonNegativeInteger(totalCheck.compared) ||
        totalCheck.matched !== totalCheck.compared ||
        (checkName === "shove" ? totalCheck.compared <= 0 : totalCheck.compared !== validation.rows)) return false;
    }

    var networkRows = 0;
    var networkCheckTotals = Object.fromEntries(historicalValidationChecks.map(function (check) {
      return [check, 0];
    }));
    for (var networkIndex = 0; networkIndex < historicalParserNetworks.length; networkIndex += 1) {
      var network = historicalParserNetworks[networkIndex];
      var stats = validation.networks[network] || {};
      if (!positiveInteger(stats.rows) ||
        !stats.checks ||
        Object.keys(stats.checks).sort().join("|") !== historicalValidationChecks.slice().sort().join("|")) return false;
      networkRows += stats.rows;
      for (var networkCheckIndex = 0; networkCheckIndex < historicalValidationChecks.length; networkCheckIndex += 1) {
        var networkCheckName = historicalValidationChecks[networkCheckIndex];
        var networkCheck = stats.checks[networkCheckName] || {};
        if (!nonNegativeInteger(networkCheck.compared) ||
          networkCheck.matched !== networkCheck.compared ||
          (networkCheckName !== "shove" && networkCheck.compared !== stats.rows)) return false;
        networkCheckTotals[networkCheckName] += networkCheck.compared;
      }
    }
    if (networkRows !== validation.rows) return false;
    return historicalValidationChecks.every(function (check) {
      return networkCheckTotals[check] === validation.checks[check].compared;
    });
  }

  function validCurrentExecutionProjection(current, structuredShards, recoveryShards) {
    var structuredExecutions = structuredShards.map(function (shard) {
      return {
        queryJobId: shard.queryJobId,
        querySha256: shard.querySha256,
        queryTemplateSha256: shard.templateSha256,
        receiptSha256: shard.receiptSha256 || null,
        resultSha256: shard.sha256
      };
    });
    var recoveryExecutions = recoveryShards.map(function (shard) {
      return {
        queryJobId: shard.queryJobId,
        querySha256: shard.querySha256,
        queryTemplateSha256: shard.templateSha256,
        receiptSha256: shard.receiptSha256,
        resultSha256: shard.sha256,
        rendererMetadataSha256: shard.rendererMetadataSha256,
        parserGrammarsSha256: shard.parserGrammarsSha256,
        validation: shard.validation
      };
    });
    if (!sameJson(current.structuredExecutions, structuredExecutions) ||
      !sameJson(current.recoveryExecutions, recoveryExecutions)) return false;
    return structuredExecutions.every(function (execution) {
      return /^mcp_ch_job_[a-f0-9]+$/.test(String(execution.queryJobId || "")) &&
        hex64(execution.querySha256) &&
        hex64(execution.queryTemplateSha256) &&
        hex64(execution.receiptSha256) &&
        hex64(execution.resultSha256);
    }) && recoveryExecutions.every(function (execution) {
      return /^mcp_ch_job_[a-f0-9]+$/.test(String(execution.queryJobId || "")) &&
        hex64(execution.querySha256) &&
        hex64(execution.queryTemplateSha256) &&
        hex64(execution.receiptSha256) &&
        hex64(execution.resultSha256) &&
        hex64(execution.rendererMetadataSha256) &&
        hex64(execution.parserGrammarsSha256);
    });
  }

  function comparableKnownCards(value) {
    var source = value || {};
    return {
      eligible: source.eligible,
      known: source.known,
      lookupMismatch: source.lookupMismatch,
      pct: source.pct
    };
  }

  function validCompositionProof(snapshot, structuredShards, recoveryShards, rawTemplateSha256, sourceWindowStart, sourceWindowEnd) {
    var composition = snapshot.composition || {};
    var historical = composition.historical || {};
    var current = composition.current || {};
    var final = composition.final || {};
    var membership = composition.membership || {};
    if (composition.schema !== compositionSchema ||
      composition.strategy !== compositionStrategy ||
      !validHalfOpenWindow(composition.window) ||
      composition.window.startInclusive !== sourceWindowStart ||
      inclusiveEnd(composition.window.endExclusive) !== sourceWindowEnd ||
      historical.schema !== "ff-rfi-raw-hh-aggregate-v1" ||
      historical.sourceKind !== "raw-hh-local-aggregate" ||
      !hex64(historical.manifestSha256) ||
      !hex64(historical.embeddedManifestSha256) ||
      !validHalfOpenWindow(historical.window) ||
      current.schema !== replacementSchema ||
      !hex64(current.manifestSha256) ||
      !hex64(current.embeddedManifestSha256) ||
      !validHalfOpenWindow(current.window) ||
      historical.window.endExclusive !== current.window.startInclusive ||
      composition.window.startInclusive !== historical.window.startInclusive ||
      composition.window.endExclusive !== current.window.endExclusive ||
      !sameJson(composition.noOverlap, {
        historicalEndExclusive: historical.window.endExclusive,
        currentStartInclusive: current.window.startInclusive,
        adjacent: true,
        overlapDays: 0,
        doubleCountPrevented: true
      })) return false;

    if (!hex64(membership.sha256) ||
      !hex64(membership.keysSha256) ||
      membership.sha256 !== snapshot.membershipSha256 ||
      membership.keysSha256 !== snapshot.membershipKeysSha256 ||
      membership.rows !== snapshot.membershipRows ||
      !positiveInteger(membership.uniqueUsers) ||
      !membership.cohortCounts ||
      Object.keys(membership.cohortCounts).join("|") !== expectedCohortOrder.join("|") ||
      Object.values(membership.cohortCounts).some(function (count) { return !positiveInteger(count); }) ||
      Object.values(membership.cohortCounts).reduce(function (sum, count) { return sum + count; }, 0) !== membership.rows ||
      membership.cohortCounts.l3top !== snapshot.replacement.membershipSubsetProof.l3topMembers ||
      membership.cohortCounts.l3 !== snapshot.replacement.membershipSubsetProof.l3Members ||
      !structuredShards.every(function (shard) { return shard.sourceUniqueUsers === membership.uniqueUsers; })) return false;

    var historicalAggregate = historical.aggregate || {};
    var execution = historical.execution || {};
    var rawExport = historical.rawExport || {};
    var transform = historical.transform || {};
    if (!hex64(historicalAggregate.sha256) ||
      !positiveInteger(historicalAggregate.bytes) ||
      historicalAggregate.rowCount !== 36504 ||
      historicalAggregate.stateCount !== 216 ||
      !hex64(historicalAggregate.scopeSha256) ||
      execution.executionMode !== "async" ||
      !/^mcp_ch_job_[a-f0-9]{32}$/.test(String(execution.queryJobId || "")) ||
      !hex64(execution.querySha256) ||
      execution.queryTemplateSha256 !== rawTemplateSha256 ||
      !hex64(execution.receiptSha256) ||
      !positiveInteger(execution.receiptRowCount) ||
      !positiveInteger(execution.receiptByteSize) ||
      !hex64(rawExport.sha256) ||
      !positiveInteger(rawExport.bytes) ||
      !positiveInteger(rawExport.rowCount) ||
      execution.receiptRowCount !== rawExport.rowCount ||
      historical.resultSha256 !== rawExport.sha256 ||
      !hex64(transform.parserSha256) ||
      !hex64(transform.aggregatorSha256) ||
      transform.handClassMode !== "parsed-private-raw-hand-history" ||
      !validHistoricalValidation(historical.validation)) return false;

    var currentAggregate = current.aggregate || {};
    if (!sameJson(current.replacement, snapshot.replacement) ||
      !validCurrentExecutionProjection(current, structuredShards, recoveryShards) ||
      currentAggregate.rows !== 36504 ||
      !hex64(currentAggregate.sha256) ||
      !positiveInteger(currentAggregate.bytes) ||
      currentAggregate.windowStartInclusive !== current.window.startInclusive ||
      currentAggregate.windowEndExclusive !== current.window.endExclusive ||
      currentAggregate.cube && (
        currentAggregate.cube.rowCount !== 36504 ||
        currentAggregate.cube.stateCount !== 216 ||
        currentAggregate.cube.handClassesPerState !== 169 ||
        currentAggregate.cube.coverageReconciled !== true
      ) ||
      !currentAggregate.cube) return false;

    var finalAggregate = final.aggregate || {};
    var finalCube = finalAggregate.cube || {};
    var reconciliation = finalAggregate.componentReconciliation || {};
    if (final.privacy && (
      final.privacy.rawHandHistoriesPublished !== false ||
      final.privacy.personalIdentifiersPublished !== false
    )) return false;
    if (!final.privacy ||
      finalAggregate.sha256 !== snapshot.sha256 ||
      !positiveInteger(finalAggregate.bytes) ||
      finalAggregate.rowCount !== 36504 ||
      finalAggregate.windowStartInclusive !== composition.window.startInclusive ||
      finalAggregate.windowEndExclusive !== composition.window.endExclusive ||
      finalCube.rowCount !== 36504 ||
      finalCube.stateCount !== 216 ||
      finalCube.handClassesPerState !== 169 ||
      !hex64(finalCube.grainSha256) ||
      finalCube.coverageReconciled !== true ||
      reconciliation.exactIntegerAddition !== true ||
      !sameJson(
        comparableKnownCards(finalAggregate.knownCards),
        comparableKnownCards(snapshot.knownCards)
      )) return false;

    for (var counterIndex = 0; counterIndex < compositionCounterNames.length; counterIndex += 1) {
      var counter = compositionCounterNames[counterIndex];
      var historicalValue = reconciliation.historicalTotals && reconciliation.historicalTotals[counter];
      var currentValue = reconciliation.currentTotals && reconciliation.currentTotals[counter];
      var finalValue = reconciliation.finalTotals && reconciliation.finalTotals[counter];
      if (!nonNegativeInteger(historicalValue) ||
        !nonNegativeInteger(currentValue) ||
        !nonNegativeInteger(finalValue) ||
        finalValue !== historicalValue + currentValue ||
        !currentAggregate.totals ||
        currentAggregate.totals[counter] !== currentValue ||
        !finalAggregate.totals ||
        finalAggregate.totals[counter] !== finalValue) return false;
    }
    return true;
  }

  function validKnownCards(value) {
    return Boolean(value &&
      nonNegativeInteger(value.eligible) &&
      nonNegativeInteger(value.known) &&
      nonNegativeInteger(value.lookupMismatch) &&
      value.eligible >= value.known &&
      (value.eligible === 0
        ? value.pct === 100
        : Math.abs(value.pct - value.known / value.eligible * 100) <= 0.000001));
  }

  function baseInputProjection(shard) {
    var common = {
      sourceKind: shard.sourceKind,
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
      templateSha256: shard.templateSha256,
      windowStartInclusive: shard.windowStartInclusive,
      windowEndExclusive: shard.windowEndExclusive,
      userShard: shard.userShard,
      membershipSha256: shard.membershipSha256,
      membershipKeysSha256: shard.membershipKeysSha256,
      privacy: shard.privacy
    };
    return shard.sourceKind === "structured-field-action"
      ? Object.assign(common, {
        handClassMode: shard.handClassMode,
        holecardMappingSha256: shard.holecardMappingSha256
      })
      : Object.assign(common, {
        parserGrammarsSha256: shard.parserGrammarsSha256,
        parserNetworks: shard.parserNetworks,
        recoveryIsDisjoint: shard.recoveryIsDisjoint,
        recoveryPredicate: shard.recoveryPredicate,
        rawJoin: shard.rawJoin,
        validation: shard.validation
      });
  }

  function validSafeRecoveryValidation(validation, recoveryTemplateSha256, window) {
    if (!validation ||
      Object.keys(validation).sort().join("|") !==
        safeRecoveryValidationKeys.slice().sort().join("|") ||
      validation.schema !== "ff-rfi-missing-card-recovery-validation-v1") {
      return false;
    }
    for (var hashKey of [
      "manifestSha256", "rendererMetadataSha256", "renderedSqlSha256",
      "queryTemplateSha256", "resultSha256", "receiptSha256"
    ]) {
      if (!hex64(validation[hashKey])) return false;
    }
    if (validation.queryTemplateSha256 !== recoveryTemplateSha256 ||
      !validExecution(
        validation.queryJobId,
        validation.renderedSqlSha256,
        validation.queryExecutionMode,
        /^mcp_ch_job_[a-f0-9]{32,}$/
      ) ||
      !validIsoTimestamp(validation.startedAt) ||
      !validIsoTimestamp(validation.finishedAt) ||
      Date.parse(validation.startedAt) > Date.parse(validation.finishedAt) ||
      Date.parse(validation.finishedAt) < Date.parse(window.endExclusive) ||
      validation.resultRows !== recoveryParserNetworks.length ||
      !positiveInteger(validation.resultBytes) ||
      !sameJson(validation.window, {
        startInclusive: "2026-07-01T00:00:00Z",
        endExclusive: "2026-07-02T00:00:00Z",
        semantics: "half-open-utc"
      }) ||
      Object.keys(validation.networks || {}).sort().join("|") !==
        recoveryParserNetworks.slice().sort().join("|") ||
      Object.keys(validation.totals || {}).sort().join("|") !==
        safeRecoveryTotalKeys.slice().sort().join("|") ||
      !validAggregateOnlyPrivacy(validation.privacy)) return false;

    var totals = Object.fromEntries(safeRecoveryTotalKeys.map(function (counter) {
      return [counter, 0];
    }));
    for (var networkIndex = 0; networkIndex < recoveryParserNetworks.length; networkIndex += 1) {
      var network = recoveryParserNetworks[networkIndex];
      var counters = validation.networks[network] || {};
      if (Object.keys(counters).sort().join("|") !==
          safeRecoveryNetworkCounterKeys.slice().sort().join("|")) return false;
      for (var counterIndex = 0; counterIndex < safeRecoveryNetworkCounterKeys.length; counterIndex += 1) {
        if (!nonNegativeInteger(counters[safeRecoveryNetworkCounterKeys[counterIndex]])) return false;
      }
      if (counters.trackerRows <= 0 ||
        counters.trackerKnownWithRaw <= 0 ||
        counters.rawHhJoined < counters.trackerKnownWithRaw ||
        counters.parserSuccess > counters.rawHhJoined ||
        counters.classFailures !== 0 ||
        counters.classMatches !== counters.trackerKnownWithRaw ||
        counters.matchPctTrackerKnown !== 100 ||
        counters.validationPassed !== 1) return false;
      for (var totalIndex = 0; totalIndex < safeRecoveryTotalKeys.length; totalIndex += 1) {
        var totalKey = safeRecoveryTotalKeys[totalIndex];
        totals[totalKey] += counters[totalKey];
      }
    }
    return validation.networks.iPoker.trackerMissingRecovered > 0 &&
      safeRecoveryTotalKeys.every(function (counter) {
        return validation.totals[counter] === totals[counter];
      });
  }

  function validSafeBaseShard(
    shard,
    expectedKind,
    expectedTemplateSha256,
    membership,
    window
  ) {
    var expectedKeys = expectedKind === "structured-field-action"
      ? safeBaseStructuredInputKeys
      : safeBaseRecoveryInputKeys;
    if (!shard ||
      Object.keys(shard).sort().join("|") !== expectedKeys.slice().sort().join("|") ||
      shard.sourceKind !== expectedKind ||
      !hex64(shard.rendererMetadataSha256) ||
      !hex64(shard.receiptSha256) ||
      !hex64(shard.querySha256) ||
      !hex64(shard.resultSha256) ||
      !hex64(shard.templateSha256) ||
      !hex64(shard.membershipSha256) ||
      !hex64(shard.membershipKeysSha256) ||
      shard.templateSha256 !== expectedTemplateSha256 ||
      shard.membershipSha256 !== membership.sha256 ||
      shard.membershipKeysSha256 !== membership.keysSha256 ||
      !validExecution(
        shard.queryJobId,
        shard.querySha256,
        shard.executionMode,
        /^mcp_ch_job_[a-f0-9]{32,}$/
      ) ||
      shard.executionMode !== "async" ||
      !validIsoTimestamp(shard.startedAt) ||
      !validIsoTimestamp(shard.finishedAt) ||
      Date.parse(shard.startedAt) > Date.parse(shard.finishedAt) ||
      Date.parse(shard.finishedAt) < Date.parse(window.endExclusive) ||
      shard.windowStartInclusive !== window.startInclusive ||
      shard.windowEndExclusive !== window.endExclusive ||
      !positiveInteger(shard.resultRows) ||
      !positiveInteger(shard.resultBytes) ||
      Object.keys(shard.userShard || {}).sort().join("|") !==
        safeUserShardKeys.slice().sort().join("|") ||
      !nonNegativeInteger(shard.userShard.index) ||
      !positiveInteger(shard.userShard.count) ||
      shard.userShard.index >= shard.userShard.count ||
      !positiveInteger(shard.userShard.users) ||
      !hex64(shard.userShard.userIdsSha256) ||
      !validAggregateOnlyPrivacy(shard.privacy)) return false;
    if (expectedKind === "structured-field-action") {
      return shard.handClassMode === "joined-holecards-str" &&
        shard.holecardMappingSha256 === null;
    }
    return shard.recoveryIsDisjoint === true &&
      shard.recoveryPredicate === "latest structured_hand_class = ''" &&
      hex64(shard.parserGrammarsSha256) &&
      sameJson(shard.parserNetworks, recoveryParserNetworks) &&
      sameJson(shard.rawJoin, recoveryRawJoin) &&
      validSafeRecoveryValidation(shard.validation, expectedTemplateSha256, window);
  }

  function validCurrentSupplementSourceMerge(descriptor, shards, expectedKind, expectedRows, window) {
    var merged = descriptor && descriptor.merged || {};
    var aggregate = descriptor && descriptor.aggregate || {};
    var recovery = expectedKind === "missing-card-recovery-full-cube";
    if (!descriptor ||
      Object.keys(descriptor).sort().join("|") !== [
        "schema", "manifestSha256", "shardStrategy",
        ...(recovery ? ["sourceKind"] : []),
        "aggregate", "inputs", "merged"
      ].sort().join("|") ||
      Object.keys(aggregate).sort().join("|") !==
        ["sha256", "bytes", "rows"].sort().join("|") ||
      Object.keys(merged).sort().join("|") !== [
        "sha256", "rows", "windowStartInclusive", "windowEndExclusive",
        "knownCards", "totals", ...(recovery ? ["cube"] : [])
      ].sort().join("|") ||
      descriptor.schema !== "ff-rfi-field-action-merge-v1" ||
      (recovery
        ? descriptor.sourceKind !== expectedKind
        : descriptor.sourceKind !== undefined) ||
      !hex64(descriptor.manifestSha256) ||
      descriptor.shardStrategy !== "immutable-user-id" ||
      aggregate.rows !== expectedRows ||
      !positiveInteger(aggregate.bytes) ||
      !hex64(aggregate.sha256) ||
      aggregate.sha256 !== merged.sha256 ||
      merged.rows !== expectedRows ||
      merged.windowStartInclusive !== window.startInclusive ||
      merged.windowEndExclusive !== window.endExclusive ||
      !validKnownCards(merged.knownCards) ||
      !validExactCounterObject(merged.totals, false) ||
      !Array.isArray(descriptor.inputs) ||
      !sameJson(descriptor.inputs, shards.map(baseInputProjection))) return false;
    if (!shards.length) return false;
    var shardCount = shards[0].userShard.count;
    if (shards.length !== shardCount ||
      shards.some(function (shard) {
        return shard.userShard.count !== shardCount;
      }) ||
      shards.map(function (shard) {
        return shard.userShard.index;
      }).sort(function (left, right) {
        return left - right;
      }).join("|") !== Array.from({ length: shardCount }, function (_, index) {
        return index;
      }).join("|") ||
      new Set(shards.map(function (shard) {
        return shard.userShard.userIdsSha256;
      })).size !== shardCount ||
      new Set(shards.map(function (shard) {
        return shard.queryJobId;
      })).size !== shards.length) return false;
    if (recovery) {
      return Boolean(merged.cube &&
        merged.cube.rowCount === 9126 &&
        merged.cube.stateCount === 54 &&
        merged.cube.handClassesPerState === 169 &&
        merged.cube.coverageReconciled === true);
    }
    return merged.cube === undefined;
  }

  function validNovelSupplementSource(
    source,
    novelShards,
    rawTemplateSha256,
    coinPartyTemplateSha256,
    membership,
    window
  ) {
    var direct = source && source.schema === directNovelSupplementSchema;
    var composed = source && source.schema === composedNovelSupplementSchema;
    var expectedStrategy = direct
      ? directNovelSupplementStrategy
      : composed ? composedNovelSupplementStrategy : "";
    var plan = source && source.plan || {};
    var parser = source && source.parserValidation || {};
    var aggregate = source && source.aggregate || {};
    var plannedNetworks = plan.networks || [];
    var dedicatedCoinParty = direct && plan.schema === dedicatedCoinPartyPlanSchema;
    var immutableV5 = direct &&
      plan.schema === "ff-rfi-publication-eligible-full-v5-run-plan";
    if ((!direct && !composed) ||
      Object.keys(source || {}).sort().join("|") !== [
        "schema", "sourceKind", "strategy", "manifestSha256", "aggregate",
        "plan", "parserValidation", "inputs", "densification"
      ].sort().join("|") ||
      Object.keys(aggregate).sort().join("|") !==
        ["sha256", "bytes", "rows"].sort().join("|") ||
      source.sourceKind !== novelRawSourceKind ||
      source.strategy !== expectedStrategy ||
      !hex64(source.manifestSha256) ||
      !hex64(aggregate.sha256) ||
      !positiveInteger(aggregate.bytes) ||
      aggregate.rows !== 9126 ||
      plan.sourceSetComplete !== true ||
      plan.exactDisjointUserUnion !== true ||
      plan.targetFilter !== false ||
      !Array.isArray(plannedNetworks) ||
      !plannedNetworks.length ||
      new Set(plannedNetworks).size !== plannedNetworks.length ||
      plan.expectedExecutions !== novelShards.length ||
      parser.gatePassed !== true ||
      parser.exactMismatchTolerance !== 0 ||
      !hex64(parser.sha256) ||
      !sameJson(
        (parser.networks || []).slice().sort(),
        plannedNetworks.slice().sort()
      )) return false;

    if (dedicatedCoinParty) {
      var dedicatedBinding = parser.binding || {};
      var canonicalDedicatedNetworks = dedicatedCoinPartyNetworks.filter(
        function (network) {
          return plannedNetworks.indexOf(network) !== -1;
        }
      );
      if (Object.keys(plan).sort().join("|") !== [
        "schema", "sha256", "sourceSetComplete", "networks",
        "userShardsPerNetwork", "expectedExecutions",
        "exactDisjointUserUnion", "targetFilter"
      ].sort().join("|") ||
        Object.keys(parser).sort().join("|") !== [
          "schema", "sha256", "gatePassed", "networks",
          "exactMismatchTolerance", "validatedAt", "binding", "source"
        ].sort().join("|") ||
        Object.keys(dedicatedBinding).sort().join("|") !== [
          "parserTemplateSha256", "parserImplementationSha256",
          "grammarSha256", "membershipSha256", "userIdsSha256", "window"
        ].sort().join("|") ||
        parser.schema !== dedicatedCoinPartyParserSchema ||
        !hex64(plan.sha256) ||
        !plannedNetworks.length ||
        !sameJson(plannedNetworks, canonicalDedicatedNetworks) ||
        plan.userShardsPerNetwork !== 4 ||
        plan.expectedExecutions !== plannedNetworks.length * 4 ||
        !sameJson(parser.networks, plannedNetworks) ||
        dedicatedBinding.parserTemplateSha256 !==
          dedicatedCoinPartyParserTemplateSha256 ||
        dedicatedBinding.parserImplementationSha256 !==
          dedicatedCoinPartyParserImplementationSha256 ||
        dedicatedBinding.grammarSha256 !== dedicatedCoinPartyGrammarSha256 ||
        dedicatedBinding.membershipSha256 !==
          dedicatedCoinPartyMembershipSha256 ||
        dedicatedBinding.membershipSha256 !== membership.sha256 ||
        dedicatedBinding.userIdsSha256 !== dedicatedCoinPartyUserIdsSha256 ||
        !sameJson(dedicatedBinding.window, dedicatedCoinPartyWindow) ||
        !sameJson(parser.source, dedicatedCoinPartyParserSource) ||
        !hex64(coinPartyTemplateSha256) ||
        !validIsoTimestamp(parser.validatedAt) ||
        Date.parse(parser.validatedAt) < Date.parse(window.endExclusive)) return false;
    } else if (immutableV5) {
      var binding = parser.binding || {};
      if (Object.keys(plan).sort().join("|") !== [
        "schema", "sha256", "immutableReceiptSha256", "sourceSetComplete",
        "networks", "userShardsPerNetwork", "expectedExecutions",
        "exactDisjointUserUnion", "targetFilter"
      ].sort().join("|") ||
        Object.keys(parser).sort().join("|") !== [
          "schema", "sha256", "gatePassed", "networks",
          "exactMismatchTolerance", "validatedAt", "binding"
        ].sort().join("|") ||
        Object.keys(binding).sort().join("|") !== [
          "planSha256", "parserTemplateSha256", "parserBodySha256",
          "membershipSha256", "membershipKeysSha256",
          "selectedUserIdsSha256", "window"
        ].sort().join("|") ||
        parser.schema !== "ff-rfi-raw-hh-parser-validation-v2" ||
        !hex64(plan.sha256) ||
        !hex64(plan.immutableReceiptSha256) ||
        !hex64(binding.planSha256) ||
        !hex64(binding.parserTemplateSha256) ||
        !hex64(binding.parserBodySha256) ||
        !hex64(binding.membershipSha256) ||
        !hex64(binding.membershipKeysSha256) ||
        !hex64(binding.selectedUserIdsSha256) ||
        binding.planSha256 !== plan.sha256 ||
        binding.membershipSha256 !== membership.sha256 ||
        binding.membershipKeysSha256 !== membership.keysSha256 ||
        !sameJson(binding.window, window) ||
        !validIsoTimestamp(parser.validatedAt) ||
        Date.parse(parser.validatedAt) < Date.parse(window.endExclusive) ||
        !positiveInteger(plan.userShardsPerNetwork)) return false;
    } else if (direct) {
      return false;
    } else if (
      Object.keys(plan).sort().join("|") !== [
        "schema", "sourceSetComplete", "networks", "userShardsPerNetwork",
        "expectedExecutions", "exactDisjointUserUnion",
        "disjointNetworkSets", "targetFilter", "componentManifestSha256"
      ].sort().join("|") ||
      Object.keys(parser).sort().join("|") !== [
        "schema", "sha256", "gatePassed", "networks",
        "exactMismatchTolerance", "componentSha256"
      ].sort().join("|") ||
      plan.schema !== "ff-rfi-field-action-novel-raw-supplement-composition-plan-v1" ||
      parser.schema !== "ff-rfi-field-action-novel-raw-parser-validation-composition-v1" ||
      plan.userShardsPerNetwork !== null ||
      plan.disjointNetworkSets !== true ||
      !Array.isArray(plan.componentManifestSha256) ||
      plan.componentManifestSha256.length < 2 ||
      !Array.isArray(parser.componentSha256) ||
      parser.componentSha256.length !== plan.componentManifestSha256.length ||
      plan.componentManifestSha256.some(function (hash) { return !hex64(hash); }) ||
      parser.componentSha256.some(function (hash) { return !hex64(hash); }) ||
      new Set(plan.componentManifestSha256).size !== plan.componentManifestSha256.length ||
      new Set(parser.componentSha256).size !== parser.componentSha256.length
    ) return false;

    var parserValidationHashes = direct ? [parser.sha256] : parser.componentSha256;
    if (!Array.isArray(source.inputs) ||
      source.inputs.some(function (input) {
        return Object.keys(input || {}).sort().join("|") !==
          safeNovelInputKeys.slice().sort().join("|");
      })) return false;
    if (!sameJson(source.inputs, novelShards.map(novelInputProjection))) return false;
    var jobs = new Set();
    for (var novelIndex = 0; novelIndex < novelShards.length; novelIndex += 1) {
      var novel = novelShards[novelIndex];
      if (!validNovelShard(
        novel,
        novel.sourceKind === "coin-party-publication-v2"
          ? coinPartyTemplateSha256
          : rawTemplateSha256,
        window,
        plannedNetworks,
        parserValidationHashes
      ) ||
        jobs.has(novel.queryJobId)) return false;
      jobs.add(novel.queryJobId);
    }
    var inputKinds = new Set(novelShards.map(function (shard) {
      return shard.sourceKind;
    }));
    if (dedicatedCoinParty) {
      if (inputKinds.size !== 1 ||
        !inputKinds.has("coin-party-publication-v2") ||
        novelShards.some(function (shard) {
          return shard.parserTemplateSha256 !==
            dedicatedCoinPartyParserTemplateSha256;
        })) return false;
    } else if (immutableV5) {
      if (inputKinds.size !== 1 ||
        !inputKinds.has("immutable-plan-raw-hh-v5") ||
        novelShards.some(function (shard) {
          return shard.parserTemplateSha256 !== parser.binding.parserTemplateSha256;
        })) return false;
    } else if (inputKinds.size !== 2 ||
      !novelInputSourceKinds.every(function (kind) { return inputKinds.has(kind); })) {
      return false;
    }
    for (var networkIndex = 0; networkIndex < plannedNetworks.length; networkIndex += 1) {
      var network = plannedNetworks[networkIndex];
      var networkShards = novelShards.filter(function (shard) {
        return shard.network === network;
      });
      if (!networkShards.length) return false;
      var shardCount = networkShards[0].userShard.count;
      if (direct && shardCount !== plan.userShardsPerNetwork ||
        networkShards.length !== shardCount ||
        networkShards.some(function (shard) {
          return shard.userShard.count !== shardCount;
        }) ||
        networkShards.map(function (shard) {
          return shard.userShard.index;
        }).sort(function (left, right) {
          return left - right;
        }).join("|") !== Array.from({ length: shardCount }, function (_, index) {
          return index;
        }).join("|") ||
        new Set(networkShards.map(function (shard) {
          return shard.userShard.userIdsSha256;
        })).size !== shardCount ||
        dedicatedCoinParty && networkShards.some(function (shard) {
          return shard.userShard.users !== 61;
        }) ||
        networkShards.reduce(function (sum, shard) {
          return sum + shard.userShard.users;
        }, 0) !== membership.subsetProof.l3topMembers) return false;
      if (dedicatedCoinParty) {
        var actualGateTotals = Object.fromEntries(
          Object.keys(dedicatedCoinPartyGateTotals[network] || {}).map(function (key) {
            return [key, networkShards.reduce(function (sum, shard) {
              return sum + shard.publicationGate[key];
            }, 0)];
          })
        );
        if (!sameJson(
          actualGateTotals,
          dedicatedCoinPartyGateTotals[network]
        )) return false;
      }
    }

    var densification = source.densification || {};
    return Object.keys(densification).sort().join("|") === [
      "observedInputRows", "observedInputCells", "canonicalOutputCells",
      "absentDimensionsMaterializedAsObservedZero", "smoothingApplied",
      "modeledValuesApplied"
    ].sort().join("|") &&
      nonNegativeInteger(densification.observedInputRows) &&
      densification.observedInputRows === novelShards.reduce(function (sum, shard) {
        return sum + shard.resultRows;
      }, 0) &&
      densification.observedInputCells === novelShards.reduce(function (sum, shard) {
        return sum + shard.observedCells;
      }, 0) &&
      densification.canonicalOutputCells === 9126 &&
      densification.absentDimensionsMaterializedAsObservedZero === true &&
      densification.smoothingApplied === false &&
      densification.modeledValuesApplied === false;
  }

  function validSupplementDelta(proof, novelRaw) {
    return Boolean(proof &&
      proof.exactCells === 9126 &&
      proof.stateCount === 54 &&
      proof.nonnegativePerCell === true &&
      proof.appliedExactly === true &&
      validExactCounterObject(proof.counters, novelRaw) &&
      proof.eligibleDelta === proof.counters.opportunities &&
      proof.knownCardDelta === proof.counters.opportunities &&
      proof.opportunitiesDelta === proof.counters.opportunities &&
      proof.lookupMismatchDelta === 0 &&
      hex64(proof.deltaProjectionSha256));
  }

  function validCurrentSupplementProof(
    snapshot,
    allShards,
    structuredShards,
    recoveryShards,
    novelShards,
    rawTemplateSha256,
    coinPartyTemplateSha256,
    sourceWindowStart,
    sourceWindowEnd
  ) {
    var current = snapshot.currentSupplement || {};
    var membership = current.membership || {};
    var base = current.baseCurrent || {};
    var supplement = current.supplement || {};
    var final = current.final || {};
    var finalAggregate = final.aggregate || {};
    var finalCube = finalAggregate.cube || {};
    if (Object.keys(current).sort().join("|") !== [
      "schema", "strategy", "supplementedCohort", "deltaAppliedCohort",
      "window", "membership", "baseCurrent", "supplementSource",
      "supplement", "final"
    ].sort().join("|") ||
      Object.keys(membership).sort().join("|") !== [
        "sha256", "keysSha256", "rows", "cohortCounts", "subsetProof"
      ].sort().join("|") ||
      Object.keys(membership.subsetProof || {}).sort().join("|") !== [
        "l3topMembers", "l3Members", "l3topIsSubsetOfL3"
      ].sort().join("|") ||
      Object.keys(base).sort().join("|") !== [
        "schema", "strategy", "manifestSha256", "aggregate",
        "sourceMerges", "replacement"
      ].sort().join("|") ||
      Object.keys(base.aggregate || {}).sort().join("|") !==
        ["sha256", "bytes", "rows"].sort().join("|") ||
      Object.keys(base.sourceMerges || {}).sort().join("|") !==
        ["structured", "recovery"].sort().join("|") ||
      Object.keys(supplement).sort().join("|") !==
        ["l3topAdditive", "l3Delta", "preserved"].sort().join("|") ||
      Object.keys(supplement.preserved || {}).sort().join("|") !==
        ["l2", "l1"].sort().join("|") ||
      Object.keys(final).sort().join("|") !== ["aggregate", "privacy"].sort().join("|") ||
      Object.keys(finalAggregate).sort().join("|") !== [
        "sha256", "bytes", "rows", "windowStartInclusive",
        "windowEndExclusive", "knownCards", "totals", "cube"
      ].sort().join("|") ||
      current.schema !== currentSupplementSchema ||
      current.strategy !== currentSupplementStrategy ||
      current.supplementedCohort !== "l3top" ||
      current.deltaAppliedCohort !== "l3" ||
      !validHalfOpenWindow(current.window) ||
      !sameJson(current.window, currentSupplementWindow) ||
      current.window.startInclusive !== sourceWindowStart ||
      inclusiveEnd(current.window.endExclusive) !== sourceWindowEnd ||
      !hex64(membership.sha256) ||
      !hex64(membership.keysSha256) ||
      membership.sha256 !== snapshot.membershipSha256 ||
      membership.keysSha256 !== snapshot.membershipKeysSha256 ||
      membership.rows !== snapshot.membershipRows ||
      !membership.cohortCounts ||
      Object.keys(membership.cohortCounts).join("|") !== expectedCohortOrder.join("|") ||
      Object.values(membership.cohortCounts).some(function (count) {
        return !positiveInteger(count);
      }) ||
      Object.values(membership.cohortCounts).reduce(function (sum, count) {
        return sum + count;
      }, 0) !== membership.rows ||
      !membership.subsetProof ||
      membership.subsetProof.l3topIsSubsetOfL3 !== true ||
      membership.subsetProof.l3topMembers !== membership.cohortCounts.l3top ||
      membership.subsetProof.l3Members !== membership.cohortCounts.l3) return false;

    var nestedStructuredInputs = base.sourceMerges &&
      base.sourceMerges.structured && base.sourceMerges.structured.inputs;
    var nestedRecoveryInputs = base.sourceMerges &&
      base.sourceMerges.recovery && base.sourceMerges.recovery.inputs;
    var nestedNovelInputs = current.supplementSource &&
      current.supplementSource.inputs;
    if (!Array.isArray(nestedStructuredInputs) ||
      !Array.isArray(nestedRecoveryInputs) ||
      !Array.isArray(nestedNovelInputs) ||
      !sameJson(
        allShards,
        nestedStructuredInputs.concat(nestedRecoveryInputs, nestedNovelInputs)
      )) return false;

    if (base.schema !== replacementSchema ||
      base.strategy !== replacementStrategy ||
      !hex64(base.manifestSha256) ||
      !hex64(base.aggregate && base.aggregate.sha256) ||
      !positiveInteger(base.aggregate && base.aggregate.bytes) ||
      base.aggregate.rows !== 36504 ||
      !sameJson(base.replacement, snapshot.replacement) ||
      !validCurrentSupplementSourceMerge(
        base.sourceMerges && base.sourceMerges.structured,
        structuredShards,
        "structured-field-action",
        36504,
        current.window
      ) ||
      !validCurrentSupplementSourceMerge(
        base.sourceMerges && base.sourceMerges.recovery,
        recoveryShards,
        "missing-card-recovery-full-cube",
        9126,
        current.window
      ) ||
      !validNovelSupplementSource(
        current.supplementSource,
        novelShards,
        rawTemplateSha256,
        coinPartyTemplateSha256,
        membership,
        current.window
      )) return false;
    if (Object.keys(base.replacement || {}).sort().join("|") !== [
      "strategy", "replacedCohort", "deltaAppliedCohort",
      "membershipSubsetProof", "l3top", "l3Delta", "preserved"
    ].sort().join("|")) return false;
    var baseDelta = base.replacement && base.replacement.l3Delta || {};
    if (!validExactCounterObject(baseDelta.counters, false) ||
      baseDelta.knownCardDelta !== baseDelta.counters.opportunities) return false;

    var top = supplement.l3topAdditive || {};
    var delta = supplement.l3Delta || {};
    if (Object.keys(top).sort().join("|") !== [
      "exactCells", "stateCount", "counters", "eligibleDelta",
      "knownCardDelta", "opportunitiesDelta", "lookupMismatchDelta",
      "deltaProjectionSha256", "nonnegativePerCell", "appliedExactly"
    ].sort().join("|") ||
      Object.keys(delta).sort().join("|") !== [
        "exactCells", "stateCount", "counters", "eligibleDelta",
        "knownCardDelta", "opportunitiesDelta", "lookupMismatchDelta",
        "deltaProjectionSha256", "cloneEqualsL3top",
        "nonnegativePerCell", "appliedExactly"
      ].sort().join("|") ||
      !validSupplementDelta(top, true) ||
      !validSupplementDelta(delta, true) ||
      delta.cloneEqualsL3top !== true ||
      delta.deltaProjectionSha256 !== top.deltaProjectionSha256 ||
      !sameJson(delta.counters, top.counters)) return false;

    var cohortTotals = snapshot.cohortActionCounterTotals || {};
    var exactTotals = snapshot.exactActionCounterTotals || {};
    if (!validExactCounterObject(exactTotals, false) ||
      Object.keys(cohortTotals).join("|") !== expectedCohortOrder.join("|")) return false;
    var summedTotals = Object.fromEntries(compositionCounterNames.map(function (counter) {
      return [counter, 0];
    }));
    for (var cohortIndex = 0; cohortIndex < expectedCohortOrder.length; cohortIndex += 1) {
      var cohort = expectedCohortOrder[cohortIndex];
      if (!validExactCounterObject(cohortTotals[cohort], false)) return false;
      for (var counterIndex = 0; counterIndex < compositionCounterNames.length; counterIndex += 1) {
        var counter = compositionCounterNames[counterIndex];
        summedTotals[counter] += cohortTotals[cohort][counter];
      }
    }
    if (!sameJson(summedTotals, exactTotals)) return false;
    for (var preservedCohort of ["l2", "l1"]) {
      var preserved = supplement.preserved && supplement.preserved[preservedCohort] || {};
      var basePreserved = base.replacement && base.replacement.preserved &&
        base.replacement.preserved[preservedCohort] || {};
      if (Object.keys(preserved).sort().join("|") !== [
        "rows", "sourceProjectionSha256", "finalProjectionSha256",
        "counters", "exact"
      ].sort().join("|") ||
        Object.keys(basePreserved).sort().join("|") !== [
          "rows", "sourceProjectionSha256", "finalProjectionSha256",
          "counters", "exact"
        ].sort().join("|") ||
        preserved.rows !== 9126 ||
        preserved.exact !== true ||
        !hex64(preserved.sourceProjectionSha256) ||
        preserved.sourceProjectionSha256 !== preserved.finalProjectionSha256 ||
        !validExactCounterObject(preserved.counters, false) ||
        !sameJson(preserved.counters, cohortTotals[preservedCohort]) ||
        basePreserved.rows !== 9126 ||
        basePreserved.exact !== true ||
        !hex64(basePreserved.sourceProjectionSha256) ||
        basePreserved.sourceProjectionSha256 !== basePreserved.finalProjectionSha256 ||
        !validExactCounterObject(basePreserved.counters, false) ||
        !sameJson(basePreserved.counters, cohortTotals[preservedCohort])) return false;
    }

    return finalAggregate.sha256 === snapshot.sha256 &&
      positiveInteger(finalAggregate.bytes) &&
      finalAggregate.rows === 36504 &&
      finalAggregate.windowStartInclusive === current.window.startInclusive &&
      finalAggregate.windowEndExclusive === current.window.endExclusive &&
      finalCube.rowCount === 36504 &&
      finalCube.stateCount === 216 &&
      finalCube.handClassesPerState === 169 &&
      finalCube.coverageReconciled === true &&
      sameJson(finalAggregate.totals, exactTotals) &&
      sameJson(
        comparableKnownCards(finalAggregate.knownCards),
        comparableKnownCards(snapshot.knownCards)
      ) &&
      validAggregateOnlyPrivacy(final.privacy);
  }

  function validPackedChart(chart, handCount) {
    return Boolean(chart &&
      chart.completeCells === handCount &&
      chart.minimumCellOpportunities >= exactCellMinimum &&
      Number(chart.opportunities) > 0 &&
      typeof chart.n === "string" &&
      typeof chart.r === "string" &&
      typeof chart.j === "string" &&
      typeof chart.l === "string");
  }

  function validatePublication(data) {
    try {
      if (!data) return failPublication("missing-data");
      if (data.status === "methodology_only") return failPublication("methodology_only");
      if (data.schema !== "ff-rfi-field-actions-v3") return failPublication("schema");
      if (!data.methodology || data.methodology.table !== "7-max") return failPublication("table");
      if (data.methodology && data.methodology.exactCellMinimum !== exactCellMinimum) return failPublication("minimum");
      if (!data.methodology || data.methodology.exactCellMinimum !== exactCellMinimum) return failPublication("methodology");
      var period = data.methodology.period || {};
      if (!validDate(period.from) || !validDate(period.through) ||
        period.toExclusive !== nextDate(period.through) ||
        Date.parse(period.from + "T00:00:00Z") >= Date.parse(period.toExclusive + "T00:00:00Z")) return failPublication("window");
      var sourceWindowStart = period.from + "T00:00:00Z";
      var sourceWindowEnd = period.through + "T23:59:59.999Z";
      if (!Array.isArray(data.handOrder) || data.handOrder.length !== 169 || new Set(data.handOrder).size !== 169) return failPublication("hands");
      if (!Array.isArray(data.cohortOrder) || data.cohortOrder.join("|") !== expectedCohortOrder.join("|")) return failPublication("cohorts");
      if (!Array.isArray(data.stackOrder) || data.stackOrder.join("|") !== expectedStackOrder.join("|")) return failPublication("stacks");
      if (!Array.isArray(data.positions) || data.positions.join("|") !== expectedPositions.join("|")) return failPublication("positions");
      if (JSON.stringify(data.methodology.stackAggregation) !== JSON.stringify(expectedStackAggregation)) return failPublication("stack-aggregation");

      var snapshot = data.methodology.sourceSnapshot || {};
      var strategy = snapshot.actionShardStrategy;
      var shards = snapshot.actionShards || [];
      var jobIds = snapshot.actionJobIds || [];
      var isReplacement = snapshot.mergeSchema === replacementSchema;
      var isComposition = snapshot.mergeSchema === compositionSchema;
      var isCurrentSupplement = snapshot.mergeSchema === currentSupplementSchema;
      if (!isReplacement && !isComposition && !isCurrentSupplement &&
        snapshot.mergeSchema !== "ff-rfi-field-action-merge-v1") return failPublication("merge-schema");
      if (isReplacement ? strategy !== replacementStrategy :
        isComposition ? strategy !== "contiguous-time" :
          isCurrentSupplement ? strategy !== currentSupplementStrategy :
          strategy !== "immutable-user-id" && strategy !== "contiguous-time") return failPublication("shard-strategy");
      if (!Number.isSafeInteger(snapshot.rows) || snapshot.rows <= 0 || !hex64(snapshot.sha256)) return failPublication("source-export");
      if (!Number.isSafeInteger(snapshot.membershipRows) || snapshot.membershipRows <= 0 || !hex64(snapshot.membershipSha256)) return failPublication("membership-export");
      if (!hex64(snapshot.membershipQuerySha256) ||
        !validExecution(snapshot.cohortJobId, snapshot.membershipQuerySha256, snapshot.membershipExecutionMode, /^mcp_bq_(?:job_)?[a-f0-9]+$/)) return failPublication("membership-source");
      var structuredTemplateSha256 = snapshot.extractionSqlSha256;
      var recoveryTemplateSha256 = "";
      var rawTemplateSha256 = "";
      var coinPartyTemplateSha256 = "";
      if (isReplacement || isComposition || isCurrentSupplement) {
        var extractionTemplates = snapshot.extractionTemplates || [];
        var usesCoinPartyNovel = Boolean(
          isCurrentSupplement &&
          shards.some(function (shard) {
            return shard.sourceKind === "coin-party-publication-v2";
          })
        );
        var usesCurrentRawNovel = Boolean(
          isCurrentSupplement &&
          shards.some(function (shard) {
            return shard.sourceKind === "immutable-plan-raw-hh-v5";
          })
        );
        if (snapshot.extractionSql !== null || snapshot.extractionSqlSha256 !== null ||
          extractionTemplates.length !==
            2 + (isComposition || usesCurrentRawNovel ? 1 : 0) +
              (usesCoinPartyNovel ? 1 : 0)) {
          return failPublication("query-templates");
        }
        var structuredTemplates = extractionTemplates.filter(function (item) {
          return item && item.path === "tools/q_ff_rfi_field_actions.sql" &&
            item.role === "canonical-structured-cube" && hex64(item.sha256);
        });
        var recoveryTemplates = extractionTemplates.filter(function (item) {
          return item && item.path === "tools/q_ff_rfi_missing_cards_recovery.sql" &&
            item.role === "l3top-missing-card-recovery" && hex64(item.sha256);
        });
        var rawTemplates = extractionTemplates.filter(function (item) {
          return item &&
            item.path === (isCurrentSupplement
              ? "tools/q_ff_rfi_raw_hh_field_actions_publication_20260726.sql"
              : "tools/q_ff_rfi_raw_hh_field_actions.sql") &&
            item.role === (isCurrentSupplement
              ? "current-novel-raw-hh-supplement"
              : "adjacent-historical-raw-hh") && hex64(item.sha256);
        });
        var coinPartyTemplates = extractionTemplates.filter(function (item) {
          return item &&
            item.path === "tools/q_ff_rfi_coin_party_publication.sql" &&
            item.role === "current-coin-party-publication-supplement" &&
            hex64(item.sha256);
        });
        if (structuredTemplates.length !== 1 || recoveryTemplates.length !== 1 ||
          (isComposition || usesCurrentRawNovel
            ? rawTemplates.length !== 1
            : rawTemplates.length !== 0) ||
          (usesCoinPartyNovel
            ? coinPartyTemplates.length !== 1
            : coinPartyTemplates.length !== 0) ||
          new Set(extractionTemplates.map(function (item) { return item.sha256; })).size !==
            extractionTemplates.length) return failPublication("query-templates");
        structuredTemplateSha256 = structuredTemplates[0].sha256;
        recoveryTemplateSha256 = recoveryTemplates[0].sha256;
        rawTemplateSha256 = isComposition || usesCurrentRawNovel
          ? rawTemplates[0].sha256
          : "";
        coinPartyTemplateSha256 = usesCoinPartyNovel
          ? coinPartyTemplates[0].sha256
          : "";
      } else if (!hex64(structuredTemplateSha256)) {
        return failPublication("query-template");
      }
      var knownCards = snapshot.knownCards || {};
      if (!Number.isSafeInteger(knownCards.eligible) || !Number.isSafeInteger(knownCards.known) ||
        knownCards.eligible < knownCards.known || knownCards.known <= 0 ||
        Math.abs(knownCards.pct - knownCards.known / knownCards.eligible * 100) > 0.000001) return failPublication("known-cards");
      if (!Array.isArray(shards) || shards.length < 1 || !Array.isArray(jobIds) ||
        jobIds.length !== shards.length + (isComposition ? 1 : 0)) return failPublication("shards");
      if (new Set(jobIds).size !== jobIds.length) return failPublication("duplicate-jobs");
      var compositionHistoricalJobId = isComposition &&
        snapshot.composition && snapshot.composition.historical &&
        snapshot.composition.historical.execution &&
        snapshot.composition.historical.execution.queryJobId;
      if (isComposition && jobIds[0] !== compositionHistoricalJobId) return failPublication("historical-source-ref");

      for (var shardIndex = 0; shardIndex < shards.length; shardIndex += 1) {
        var shard = shards[shardIndex];
        if (!(isCurrentSupplement ? hex64(shard.resultSha256) : hex64(shard.sha256)) ||
          !hex64(shard.querySha256) ||
          !hex64(shard.userShard && shard.userShard.userIdsSha256)) return failPublication("shard-hash");
        if (!validExecution(shard.queryJobId, shard.querySha256, shard.executionMode, /^mcp_ch_job_[a-f0-9]+$/) ||
          jobIds[shardIndex + (isComposition ? 1 : 0)] !== shard.queryJobId) return failPublication("source-ref");
        if (isCurrentSupplement) {
          if (!Number.isSafeInteger(shard.resultRows) ||
            (isNovelShard(shard) ? shard.resultRows < 0 : shard.resultRows <= 0) ||
            !positiveInteger(shard.userShard && shard.userShard.users)) {
            return failPublication("shard-counts");
          }
        } else {
          if (!Number.isSafeInteger(shard.rows) ||
            (isNovelShard(shard) ? shard.rows < 0 : shard.rows <= 0) ||
            !Number.isSafeInteger(shard.shardUsers) ||
            shard.shardUsers <= 0) return failPublication("shard-counts");
          if (!Number.isSafeInteger(shard.sourceUniqueUsers) ||
            shard.sourceUniqueUsers < shard.shardUsers) return failPublication("source-users");
        }
        if (isCurrentSupplement && isNovelShard(shard)) {
          var plannedNetworks = snapshot.currentSupplement &&
            snapshot.currentSupplement.supplementSource &&
            snapshot.currentSupplement.supplementSource.plan &&
            snapshot.currentSupplement.supplementSource.plan.networks || [];
          var supplementParser = snapshot.currentSupplement &&
            snapshot.currentSupplement.supplementSource &&
            snapshot.currentSupplement.supplementSource.parserValidation || {};
          var parserValidationHashes = snapshot.currentSupplement &&
            snapshot.currentSupplement.supplementSource &&
            snapshot.currentSupplement.supplementSource.schema === composedNovelSupplementSchema
            ? supplementParser.componentSha256 || []
            : [supplementParser.sha256];
          if (!validNovelShard(
            shard,
            shard.sourceKind === "coin-party-publication-v2"
              ? coinPartyTemplateSha256
              : rawTemplateSha256,
            snapshot.currentSupplement && snapshot.currentSupplement.window || {},
            plannedNetworks,
            parserValidationHashes
          )) return failPublication("novel-supplement-provenance");
        } else if (isCurrentSupplement) {
          var currentMembership = snapshot.currentSupplement &&
            snapshot.currentSupplement.membership || {};
          var currentSafeWindow = snapshot.currentSupplement &&
            snapshot.currentSupplement.window || {};
          var expectedSafeTemplate = shard.sourceKind === "structured-field-action"
            ? structuredTemplateSha256
            : shard.sourceKind === "missing-card-recovery-full-cube"
              ? recoveryTemplateSha256
              : "";
          if (!expectedSafeTemplate ||
            !validSafeBaseShard(
              shard,
              shard.sourceKind,
              expectedSafeTemplate,
              currentMembership,
              currentSafeWindow
            )) return failPublication("current-base-provenance");
        } else if ((isReplacement || isComposition || isCurrentSupplement) &&
          shard.sourceKind === "missing-card-recovery-full-cube") {
          if (!validRecoveryShard(shard, recoveryTemplateSha256)) return failPublication("recovery-provenance");
        } else {
          if (!validStructuredShard(shard, structuredTemplateSha256)) return failPublication("hand-class-source");
        }
      }

      if (isReplacement || isComposition || isCurrentSupplement) {
        var structuredShards = shards.filter(function (shard) {
          return !shard.sourceKind || shard.sourceKind === "structured-field-action";
        });
        var recoveryShards = shards.filter(function (shard) {
          return shard.sourceKind === "missing-card-recovery-full-cube";
        });
        var novelShards = shards.filter(function (shard) {
          return isNovelShard(shard);
        });
        var currentWindow = isComposition && snapshot.composition && snapshot.composition.current &&
          snapshot.composition.current.window ||
          isCurrentSupplement && snapshot.currentSupplement &&
            snapshot.currentSupplement.window || {
          startInclusive: sourceWindowStart,
          endExclusive: period.toExclusive + "T00:00:00Z",
          semantics: "half-open-utc"
        };
        var currentWindowStart = currentWindow.startInclusive;
        var currentWindowEnd = inclusiveEnd(currentWindow.endExclusive);
        if (structuredShards.length + recoveryShards.length + novelShards.length !== shards.length ||
          (!isCurrentSupplement && novelShards.length !== 0) ||
          (isCurrentSupplement && novelShards.length === 0) ||
          !validHalfOpenWindow(currentWindow) ||
          (!isCurrentSupplement &&
            (!validShardCoverage(structuredShards, currentWindowStart, currentWindowEnd) ||
              !validShardCoverage(recoveryShards, currentWindowStart, currentWindowEnd) ||
              !validReplacementProof(snapshot, recoveryShards)))) {
          return failPublication("replacement-provenance");
        }
        if (!isCurrentSupplement &&
          (new Set(recoveryShards.map(function (shard) {
            return shard.selectedMembershipKeysSha256;
          })).size !== 1 ||
            new Set(recoveryShards.map(function (shard) {
              return JSON.stringify([shard.selectedMembershipRows, shard.selectedUniqueUsers, shard.selectedCohortCounts]);
            })).size !== 1)) return failPublication("recovery-membership");
        if (isComposition && !validCompositionProof(
          snapshot,
          structuredShards,
          recoveryShards,
          rawTemplateSha256,
          sourceWindowStart,
          sourceWindowEnd
        )) return failPublication("composition-provenance");
        if (isCurrentSupplement && !validCurrentSupplementProof(
          snapshot,
          shards,
          structuredShards,
          recoveryShards,
          novelShards,
          rawTemplateSha256,
          coinPartyTemplateSha256,
          sourceWindowStart,
          sourceWindowEnd
        )) return failPublication("current-supplement-provenance");
      } else {
        var ordered = shards.slice().sort(function (left, right) { return left.windowStartInclusive.localeCompare(right.windowStartInclusive); });
        if (strategy === "contiguous-time") {
          if (ordered[0].windowStartInclusive !== sourceWindowStart || ordered[ordered.length - 1].windowEndInclusive !== sourceWindowEnd) return failPublication("time-boundary");
          for (var timeIndex = 0; timeIndex < ordered.length; timeIndex += 1) {
            var timeShard = ordered[timeIndex];
            if (timeShard.userShard.index !== 0 || timeShard.userShard.count !== 1 || timeShard.shardUsers !== timeShard.sourceUniqueUsers) return failPublication("time-users");
            if (timeIndex && Date.parse(ordered[timeIndex - 1].windowEndInclusive) + 1 !== Date.parse(timeShard.windowStartInclusive)) return failPublication("time-gap");
          }
        } else {
          var shardCount = shards[0].userShard.count;
          var sourceUsers = shards[0].sourceUniqueUsers;
          if (shardCount !== shards.length) return failPublication("user-shard-count");
          if (new Set(shards.map(function (shard) { return shard.userShard.userIdsSha256; })).size !== shards.length) return failPublication("user-overlap");
          if (new Set(shards.map(function (shard) { return shard.sourceUniqueUsers; })).size !== 1) return failPublication("user-population");
          if (shards.reduce(function (sum, shard) { return sum + shard.shardUsers; }, 0) !== sourceUsers) return failPublication("user-reconcile");
          if (shards.map(function (shard) { return shard.userShard.index; }).sort(function (a, b) { return a - b; }).join("|") !== Array.from({ length: shardCount }, function (_, index) { return index; }).join("|")) return failPublication("user-indices");
          for (var userIndex = 0; userIndex < shards.length; userIndex += 1) {
            if (shards[userIndex].windowStartInclusive !== sourceWindowStart || shards[userIndex].windowEndInclusive !== sourceWindowEnd) return failPublication("user-window");
          }
        }
      }

      var classifier = snapshot.classifierSanity || {};
      var classifierStacks = Object.keys(classifier);
      if (classifierStacks.join("|") !== expectedStackOrder.join("|")) return failPublication("classifier");
      for (var classifierIndex = 0; classifierIndex < classifierStacks.length; classifierIndex += 1) {
        var classifierCell = classifier[classifierStacks[classifierIndex]] || {};
        if (classifierCell.normalThreeBbAsShove !== 0 || classifierCell.openShoves !== classifierCell.shoveAllinFlag + classifierCell.shoveEffectiveAmountOnly) return failPublication("classifier-reconcile");
      }
      var actionReconciliation = snapshot.actionCountReconciliation || {};
      var actionKeys = ["opportunities", "regularRaise", "openShove", "limp", "foldOther"];
      if (!actionReconciliation.source || !actionReconciliation.aggregated) return failPublication("action-reconcile");
      for (var actionIndex = 0; actionIndex < actionKeys.length; actionIndex += 1) {
        var actionKey = actionKeys[actionIndex];
        if (!Number.isSafeInteger(actionReconciliation.source[actionKey]) ||
          actionReconciliation.source[actionKey] !== actionReconciliation.aggregated[actionKey]) return failPublication("action-reconcile");
      }

      var stacks = data.stackOrder || [];
      for (var stackIndex = 0; stackIndex < stacks.length; stackIndex += 1) {
        var stackKey = stacks[stackIndex];
        for (var positionIndex = 0; positionIndex < expectedPositions.length; positionIndex += 1) {
          var position = expectedPositions[positionIndex];
          for (var cohortIndex = 0; cohortIndex < expectedCohortOrder.length; cohortIndex += 1) {
            var cohort = data.cohorts && data.cohorts[expectedCohortOrder[cohortIndex]];
            var packed = cohort && cohort.charts && cohort.charts[stackKey] && cohort.charts[stackKey][position];
            if (!validPackedChart(packed, data.handOrder.length)) return failPublication("incomplete-state");
          }
        }
      }
      return Object.freeze({ ready: true, reason: "" });
    } catch (error) {
      return failPublication("invalid-provenance");
    }
  }

  var publication = validatePublication(fieldData);
  var publicCohorts = Object.fromEntries(expectedCohortOrder.map(function (key) {
    var raw = fieldData && fieldData.cohorts && fieldData.cohorts[key] || {};
    return [key, Object.freeze({
      key: key,
      label: cohortLabels[key],
      shortLabel: cohortLabels[key],
      players: publication.ready ? Number(raw.players || raw.selectedPlayers || 0) : 0,
      selectedPlayers: publication.ready ? Number(raw.selectedPlayers || raw.players || 0) : 0,
      charts: publication.ready ? raw.charts || {} : {}
    })];
  }));

  var stackGroups = [
    { key: "reference", label: "Источник", bands: ["35+"] },
    { key: "deep", label: "Глубокие", bands: ["70+", "30-70"] },
    { key: "short", label: "Короткие", bands: ["20-30", "15-20"] },
    { key: "pushfold", label: "Пуш-фолд", bands: ["<15"] }
  ];

  var stackBands = [
    { key: "35+", label: "35+", group: "reference", mode: "deep", note: "учебное ядро страницы 7" },
    { key: "70+", label: "70+", group: "deep", mode: "deep", note: "текущий чарт" },
    { key: "30-70", label: "30–70", group: "deep", mode: "deep", note: "текущий чарт" },
    { key: "20-30", label: "20–30", group: "short", mode: "empirical", note: "рейз / пуш" },
    { key: "15-20", label: "15–20", group: "short", mode: "empirical", note: "рейз / пуш" },
    { key: "<15", label: "<15", group: "pushfold", mode: "empirical", note: "рейз / пуш" }
  ];

  var bandByKey = Object.fromEntries(stackBands.map(function (item) { return [item.key, item]; }));
  var handOrder = fieldData && Array.isArray(fieldData.handOrder) ? fieldData.handOrder : [];
  var handIndex = Object.fromEntries(handOrder.map(function (hand, index) { return [hand, index]; }));
  var decodedFieldCache = {};

  function band(stackKey) {
    return bandByKey[stackKey] || stackBands[0];
  }

  function recommendation(stackKey, position) {
    var byStack = fieldData && fieldData.recommendations && fieldData.recommendations.charts && fieldData.recommendations.charts[stackKey];
    return byStack ? byStack[position] || null : null;
  }

  function recommendationAction(stackKey, position, hand) {
    var chart = recommendation(stackKey, position);
    if (!chart) return "fold";
    var code = chart.mask[handIndex[hand]];
    return code === "r" ? "open" : code === "j" ? "shove" : code === "m" ? "mix" : "fold";
  }

  function decodeBase64(value) {
    var binary = window.atob(value);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function decodeU16(value) {
    var bytes = decodeBase64(value);
    var output = new Uint16Array(bytes.length / 2);
    for (var index = 0; index < output.length; index += 1) output[index] = bytes[index * 2] | (bytes[index * 2 + 1] << 8);
    return output;
  }

  function decodeU32(value) {
    var bytes = decodeBase64(value);
    var output = new Uint32Array(bytes.length / 4);
    for (var index = 0; index < output.length; index += 1) {
      output[index] = (
        bytes[index * 4] |
        (bytes[index * 4 + 1] << 8) |
        (bytes[index * 4 + 2] << 16) |
        (bytes[index * 4 + 3] << 24)
      ) >>> 0;
    }
    return output;
  }

  function fieldChart(cohortKey, stackKey, position) {
    if (!publication.ready) return null;
    var cacheKey = cohortKey + "|" + stackKey + "|" + position;
    if (decodedFieldCache[cacheKey]) return decodedFieldCache[cacheKey];
    var cohort = publicCohorts[cohortKey] || publicCohorts.l3top;
    var packed = cohort.charts[stackKey] && cohort.charts[stackKey][position];
    if (!packed || packed.completeCells !== fieldData.handOrder.length || packed.minimumCellOpportunities < exactCellMinimum) return null;
    var chart = Object.assign({}, packed, {
      cohort: cohort,
      sample: decodeU32(packed.n),
      raise: decodeU16(packed.r),
      shove: decodeU16(packed.j),
      limp: decodeU16(packed.l)
    });
    decodedFieldCache[cacheKey] = chart;
    return chart;
  }

  window.PokerRfiStackData = Object.freeze({
    version: "rfi-reference-20260722-v3",
    publication: publication,
    stackGroups: Object.freeze(stackGroups),
    stackBands: Object.freeze(stackBands),
    cohortOrder: Object.freeze(cohortOrder),
    cohorts: publicCohorts,
    methodology: fieldData && fieldData.methodology || null,
    handOrder: Object.freeze(handOrder.slice()),
    fieldStackKeys: Object.freeze(publication.ready ? (fieldData.stackOrder || []).slice() : []),
    fieldPositions: Object.freeze(publication.ready ? (fieldData.positions || []).slice() : []),
    band: band,
    recommendation: recommendation,
    recommendationAction: recommendationAction,
    fieldChart: fieldChart
  });
})();
