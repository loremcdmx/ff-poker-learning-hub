-- Exact monthly availability probe for the strict RvBB c-bet candidate node.
--
-- This query counts candidate keys only.  It does not certify raw-HH coverage,
-- rank-as-of-hand coverage, or a publishable browser sample.  The lesson asset
-- must therefore continue to use a period whose complete private inputs have
-- been extracted and reconciled separately.

WITH strict_candidates AS (
  SELECT DISTINCT
    month_start_date AS month,
    toUInt64(assumeNotNull(user_id)) AS user_id,
    assumeNotNull(network) AS network,
    assumeNotNull(hh_id) AS hh_id
  FROM analytics.int_tracker_hand_joined
  WHERE month_start_date >= toDate('2023-09-01')
    AND month_start_date < toDate('2026-07-01')
    AND user_id IS NOT NULL
    AND network IS NOT NULL
    AND hh_id IS NOT NULL
    AND is_preflop_unopened = 1
    AND is_rfi = 1
    AND preflop_raiser_count = 1
    AND is_flop_could_cbet = 1
    AND is_flop_in_position = 1
    AND cnt_flop_players = 2
    AND match(ifNull(preflop_actors_str, ''), '^[0-7]8$')
)
SELECT
  month,
  count() AS candidate_keys
FROM strict_candidates
GROUP BY month
ORDER BY month;
