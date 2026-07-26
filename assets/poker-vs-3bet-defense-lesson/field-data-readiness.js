(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const data = root.FF_VS3BET_FIELD_DATA;
  const SHA256 = /^[a-f0-9]{64}$/;
  const reasons = [];

  function requireCondition(condition, reason) {
    if (!condition) reasons.push(reason);
  }

  function validExecutionIdentity(source) {
    if (!source || !["async", "sync"].includes(source.executionMode)) return false;
    if (!source.queryJobId || !SHA256.test(String(source.querySha256 || ""))) return false;
    return source.executionMode !== "sync" || source.queryJobId === `sync:${source.querySha256}`;
  }

  function validIsoBoundary(value) {
    return Number.isFinite(Date.parse(String(value || "")));
  }

  const meta = data?.meta;
  const provenance = meta?.provenance;
  const rankIntervals = provenance?.rankIntervals;
  const handCube = provenance?.handCube;
  const charts = data?.charts;
  const shards = Array.isArray(handCube?.shards) ? handCube.shards : [];
  const sortedShards = shards.slice().sort((left, right) => Number(left.ordinal) - Number(right.ordinal));
  const expectedCohorts = {
    novice: [15, 16, 17, 18],
    league3: [11, 12, 13, 14],
    league2: [6, 7, 8, 9, 10],
    league1: [1, 2, 3, 4, 5]
  };

  requireCondition(data?.status === "ready", "status");
  requireCondition(data?.version === "vs3bet-field-cube-20260722-v6", "version");
  requireCondition(meta?.windowStartInclusive === "2023-09-01T00:00:00Z", "window_start");
  requireCondition(meta?.windowEndExclusive === "2026-07-22T00:00:00Z", "window_end");
  requireCondition(meta?.rankAssignment === "Exact half-open rank interval at played_at; real players only.", "rank_assignment");
  requireCondition(meta?.samplePolicy?.exactFrequencyMinimumN === 50, "minimum_n");
  requireCondition(meta?.samplePolicy?.smoothing === false, "smoothing");
  requireCondition(Array.isArray(meta?.hands) && meta.hands.length === 169 && new Set(meta.hands).size === 169, "hands");
  requireCondition(Array.isArray(meta?.enabledComparisonKeys) && meta.enabledComparisonKeys.length > 0, "comparison_keys");
  Object.entries(expectedCohorts).forEach(([key, ranks]) => {
    requireCondition(JSON.stringify(meta?.cohorts?.[key]?.ranks || []) === JSON.stringify(ranks), `cohort_${key}`);
  });

  requireCondition(validExecutionIdentity(rankIntervals), "rank_execution_identity");
  requireCondition(Number.isSafeInteger(rankIntervals?.rows) && rankIntervals.rows > 0, "rank_rows");
  requireCondition(SHA256.test(String(rankIntervals?.sha256 || "")), "rank_result_sha");
  requireCondition(validIsoBoundary(rankIntervals?.windowStartInclusive), "rank_window_start");
  requireCondition(validIsoBoundary(rankIntervals?.windowEndExclusive), "rank_window_end");
  requireCondition(rankIntervals?.windowStartInclusive === meta?.windowStartInclusive, "rank_window_start_match");
  requireCondition(rankIntervals?.windowEndExclusive === meta?.windowEndExclusive, "rank_window_end_match");

  requireCondition(shards.length > 1, "cube_shards");
  requireCondition(Number.isSafeInteger(handCube?.rows) && handCube.rows > 0, "cube_rows");
  requireCondition(SHA256.test(String(handCube?.sourceQueryTemplateSha256 || "")), "cube_query_template_sha");
  requireCondition(sortedShards.every((shard, index) => (
    Number(shard.ordinal) === index + 1
    && Number.isSafeInteger(shard.rows)
    && shard.rows > 0
    && validExecutionIdentity(shard)
    && SHA256.test(String(shard.sha256 || ""))
    && validIsoBoundary(shard.windowStartInclusive)
    && validIsoBoundary(shard.windowEndExclusive)
  )), "cube_shard_identity");
  requireCondition(
    sortedShards.length > 0
      && sortedShards[0].windowStartInclusive === meta?.windowStartInclusive
      && sortedShards.at(-1).windowEndExclusive === meta?.windowEndExclusive
      && sortedShards.every((shard, index) => index === 0 || sortedShards[index - 1].windowEndExclusive === shard.windowStartInclusive),
    "cube_window_coverage"
  );
  requireCondition(
    Number.isSafeInteger(handCube?.rows)
      && handCube.rows === sortedShards.reduce((sum, shard) => sum + Number(shard.rows || 0), 0),
    "cube_row_sum"
  );

  const enabledComparisonKeys = Array.isArray(meta?.enabledComparisonKeys) ? meta.enabledComparisonKeys : [];
  const cohortKeys = Object.keys(expectedCohorts);
  requireCondition(charts && typeof charts === "object" && !Array.isArray(charts), "charts");
  for (const comparisonKey of enabledComparisonKeys) {
    for (const cohort of cohortKeys) {
      const chart = charts?.[`${cohort}|${comparisonKey}`];
      const cells = chart?.cells;
      const cellCountsAreExact = Array.isArray(cells) && cells.length === 169 && cells.every((cell) => (
        Array.isArray(cell)
        && cell.length === 5
        && cell.every((value) => Number.isSafeInteger(value) && value >= 0)
        && cell[0] === cell[1] + cell[2] + cell[3] + cell[4]
        && cell[0] >= 50
      ));
      requireCondition(cellCountsAreExact, `chart_${cohort}_${comparisonKey}`);
      if (cellCountsAreExact) {
        const totals = cells.reduce((summary, cell) => summary.map((value, index) => value + cell[index]), [0, 0, 0, 0, 0]);
        const chartTotals = chart?.totals;
        const totalFields = ["opportunities", "folds", "calls", "fourbets", "jams", "knownOpportunities", "missingOpportunities", "sourceOpportunities"];
        const totalsAreSafe = totalFields.every((field) => Number.isSafeInteger(chartTotals?.[field]) && chartTotals[field] >= 0);
        requireCondition(
          totalsAreSafe
            && chartTotals.opportunities === totals[0]
            && chartTotals.knownOpportunities === totals[0]
            && chartTotals.sourceOpportunities === chartTotals.knownOpportunities + chartTotals.missingOpportunities
            && chartTotals.opportunities === chartTotals.folds + chartTotals.calls + chartTotals.fourbets + chartTotals.jams,
          `chart_totals_${cohort}_${comparisonKey}`
        );
      }
    }
  }

  root.FFVs3BetFieldDataReadiness = Object.freeze({
    schemaVersion: 1,
    ready: reasons.length === 0,
    reasons: Object.freeze(reasons.slice())
  });
})();
