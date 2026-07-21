-- Strict observed-field cube for Hero RFI -> faces the first non-squeeze 3-bet -> decision.
-- Refresh window: [2025-07-01 00:00:00, 2026-07-21 00:00:00) UTC.
--
-- The cube deliberately stores the absolute 3-bet-to amount in BB buckets.
-- The source does not expose Hero's original RFI size faithfully on Hero's row:
-- preflop_2bet_and_blind_facing_amount_bb is the amount Hero faced before RFI,
-- not the RFI amount. Do not turn these buckets into multipliers without a
-- separate action-history/opponent-row reconstruction.
--
-- Replace {{RANK_INTERVAL_ROWS}} in query 2 with query 1 rendered as
-- (user_id,rang,'rank_start_at','rank_end_at') tuples.

-- 1. BigQuery: exact rank-at-hand bridge.
SELECT
  h.user_id,
  h.rang,
  FORMAT_TIMESTAMP('%F %T', GREATEST(h.rang_start_at, TIMESTAMP '2025-07-01 00:00:00+00'), 'UTC') AS rank_start_at,
  FORMAT_TIMESTAMP('%F %T', LEAST(COALESCE(h.rang_end_at, TIMESTAMP '2026-07-21 00:00:00+00'), TIMESTAMP '2026-07-21 00:00:00+00'), 'UTC') AS rank_end_at
FROM `analytics_mcp_readonly.mcp__check_rank_history` AS h
JOIN `analytics_mcp_readonly.mcp__check_users` AS u USING (user_id)
WHERE h.rang BETWEEN 1 AND 18
  AND h.rang_start_at < TIMESTAMP '2026-07-21 00:00:00+00'
  AND COALESCE(h.rang_end_at, TIMESTAMP '2026-07-21 00:00:00+00') > TIMESTAMP '2025-07-01 00:00:00+00'
  AND u.is_real_player = TRUE
ORDER BY h.user_id, h.rang_start_at;

-- 2. ClickHouse: lossless action-count cube.
WITH
rank_intervals AS
(
  SELECT *
  FROM values(
    'user_id Int32, rang Int16, rank_start_at DateTime, rank_end_at DateTime',
    {{RANK_INTERVAL_ROWS}}
  )
),
latest_versions AS
(
  -- The frozen-window dedup audit returned zero rows of drift between full
  -- latest-first and latest-qualifying for this exact RFI/face-3bet node.
  -- Keep the business predicates here to stay below ClickHouse's aggregation
  -- memory limit; rerun that audit before extending the window.
  SELECT
    h.hand_player_id,
    argMax(
      tuple(
        h.user_id,
        h.played_at,
        h.position,
        h.preflop_aggressor_position,
        h.preflop_effective_stack_size_bb,
        h.amt_preflop_3bet_facing_bb,
        h.holecards_str,
        h.preflop_face_3bet_action,
        h.preflop_action,
        toUInt8(coalesce(h.is_preflop_allin, 0))
      ),
      h.version
    ) AS x
  FROM analytics.int_tracker_hand_joined AS h
  WHERE h.month_start_date >= toDate('2025-07-01')
    AND h.month_start_date < toDate('2026-08-01')
    AND h.hand_player_id IS NOT NULL
    AND coalesce(h.is_rfi, 0) = 1
    AND coalesce(h.is_preflop_face_3bet, 0) = 1
    AND coalesce(h.is_preflop_could_4bet, 0) = 1
    AND coalesce(h.is_face_squeeze, 0) = 0
    AND h.preflop_face_3bet_action IN ('F', 'C', 'R')
    AND h.position IN (0, 1, 2, 3, 4, 5, 6, 7, 9)
    AND h.preflop_aggressor_position IN (0, 1, 2, 3, 4, 5, 6, 7, 8, 9)
    AND (
      (h.position BETWEEN 0 AND 7 AND (h.preflop_aggressor_position < h.position OR h.preflop_aggressor_position IN (8, 9)))
      OR (h.position = 9 AND h.preflop_aggressor_position = 8)
    )
    AND h.preflop_effective_stack_size_bb >= 20
    AND h.amt_preflop_3bet_facing_bb >= 3
  GROUP BY h.hand_player_id
),
latest AS
(
  SELECT
    v.x.1 AS user_id,
    r.rang AS rang,
    v.x.2 AS played_at,
    v.x.3 AS position,
    v.x.4 AS preflop_aggressor_position,
    v.x.5 AS effective_stack_bb,
    v.x.6 AS threebet_to_bb,
    v.x.7 AS holecards_str,
    v.x.8 AS face_action,
    v.x.9 AS preflop_action,
    v.x.10 AS is_allin
  FROM latest_versions AS v
  INNER JOIN rank_intervals AS r ON v.x.1 = r.user_id
  WHERE v.x.2 >= r.rank_start_at
    AND v.x.2 < r.rank_end_at
    AND v.x.2 >= toDateTime('2025-07-01 00:00:00')
    AND v.x.2 < toDateTime('2026-07-21 00:00:00')
    AND v.x.1 IS NOT NULL
),
classified AS
(
  SELECT
    multiIf(
      -- «Новички» в этом тренажёре — расширенная когорта R15–18. R15
      -- добавлен именно для покрытия редких, но логически возможных спотов.
      rang BETWEEN 15 AND 18, 'novice',
      rang BETWEEN 11 AND 14, 'league3',
      rang BETWEEN 6 AND 10, 'league2',
      'league1'
    ) AS cohort,
    multiIf(
      position = 0, 'BTN',
      position = 1, 'CO',
      position = 2, 'HJ',
      position IN (3, 4), 'MP',
      position IN (5, 6, 7), 'EP',
      'SB'
    ) AS hero_position,
    multiIf(
      preflop_aggressor_position = 0, 'BTN',
      preflop_aggressor_position = 1, 'CO',
      preflop_aggressor_position = 2, 'HJ',
      preflop_aggressor_position IN (3, 4), 'MP',
      preflop_aggressor_position IN (5, 6, 7), 'EP',
      preflop_aggressor_position = 8, 'BB',
      'SB'
    ) AS threebettor_position,
    if(position < preflop_aggressor_position, 'IP', 'OOP') AS relation,
    multiIf(
      effective_stack_bb <= 30, '20-30',
      effective_stack_bb <= 50, '31-50',
      effective_stack_bb <= 80, '51-80',
      '80+'
    ) AS stack_band,
    multiIf(
      threebet_to_bb < 6, '<6',
      threebet_to_bb < 8, '6-8',
      threebet_to_bb < 10, '8-10',
      '10+'
    ) AS threebet_to_bucket,
    ifNull(nullIf(holecards_str, ''), '__MISSING__') AS holecards_str,
    user_id,
    played_at,
    multiIf(
      face_action = 'F', 'fold',
      face_action = 'C', 'call',
      face_action = 'R' AND preflop_action = 'RR' AND is_allin = 1, 'jam',
      face_action = 'R', 'fourbet',
      'other'
    ) AS action_class
  FROM latest
)
SELECT
  cohort,
  hero_position,
  threebettor_position,
  relation,
  stack_band,
  threebet_to_bucket,
  holecards_str,
  count() AS opportunities,
  uniqExact(user_id) AS unique_players,
  countIf(action_class = 'fold') AS folds,
  countIf(action_class = 'call') AS calls,
  countIf(action_class = 'fourbet') AS fourbets,
  countIf(action_class = 'jam') AS jams,
  countIf(action_class = 'other') AS other,
  min(played_at) AS first_hand_at,
  max(played_at) AS last_hand_at
FROM classified
GROUP BY cohort, hero_position, threebettor_position, relation, stack_band, threebet_to_bucket, holecards_str
ORDER BY cohort, hero_position, threebettor_position, relation, stack_band, threebet_to_bucket, holecards_str;
