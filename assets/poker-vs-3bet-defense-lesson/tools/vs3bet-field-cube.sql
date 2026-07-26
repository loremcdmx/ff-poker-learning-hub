-- Strict observed-field cube for Hero RFI -> faces the first non-squeeze 3-bet -> decision.
-- Full available-history window: [2023-09-01 00:00:00, 2026-07-22 00:00:00) UTC.
-- The ClickHouse query is run in non-overlapping time shards by replacing
-- {{WINDOW_START}}, {{WINDOW_END}}, and {{MONTH_END_EXCLUSIVE}}. Counter rows
-- from those shards are exact-summed by build-vs3bet-field-data.mjs.
-- {{RANK_USER_IDS}} is an immutable user-id prefilter repeated on both sides
-- of the latest-version pass. It may be a deterministic user shard, but the
-- final rank-at-hand and node filters still run only after argMax.
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
  FORMAT_TIMESTAMP('%F %T', GREATEST(h.rang_start_at, TIMESTAMP '2023-09-01 00:00:00+00'), 'UTC') AS rank_start_at,
  FORMAT_TIMESTAMP('%F %T', LEAST(COALESCE(h.rang_end_at, TIMESTAMP '2026-07-22 00:00:00+00'), TIMESTAMP '2026-07-22 00:00:00+00'), 'UTC') AS rank_end_at
FROM `analytics_mcp_readonly.mcp__check_rank_history` AS h
JOIN `analytics_mcp_readonly.mcp__check_users` AS u USING (user_id)
WHERE h.rang BETWEEN 1 AND 18
  AND h.rang_start_at < TIMESTAMP '2026-07-22 00:00:00+00'
  AND COALESCE(h.rang_end_at, TIMESTAMP '2026-07-22 00:00:00+00') > TIMESTAMP '2023-09-01 00:00:00+00'
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
candidate_ids AS
(
  -- Restrict the expensive latest-first pass to hand ids that ever matched
  -- the strict node inside this shard. The final business filter is applied
  -- only after argMax, so a later non-qualifying version cannot leak in.
  SELECT h.hand_player_id
  FROM analytics.int_tracker_hand_joined AS h
  PREWHERE h.month_start_date >= toDate('{{WINDOW_START}}')
    AND h.month_start_date < toDate('{{MONTH_END_EXCLUSIVE}}')
    AND h.played_at >= toDateTime('{{WINDOW_START}}')
    AND h.played_at < toDateTime('{{WINDOW_END}}')
    AND h.user_id IN ({{RANK_USER_IDS}})
  WHERE h.hand_player_id IS NOT NULL
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
latest_versions AS
(
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
        toUInt8(coalesce(h.is_preflop_allin, 0)),
        toUInt8(coalesce(h.is_rfi, 0)),
        toUInt8(coalesce(h.is_preflop_face_3bet, 0)),
        toUInt8(coalesce(h.is_preflop_could_4bet, 0)),
        toUInt8(coalesce(h.is_face_squeeze, 0)),
        h.preflop_raise_and_blind_made_amount_bb,
        if(h.bb_amount > 0, coalesce(h.bet_bb_amount, 0) / h.bb_amount, 0)
      ),
      h.version
  ) AS x
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN candidate_ids AS c USING (hand_player_id)
  PREWHERE h.month_start_date >= toDate('{{WINDOW_START}}')
    AND h.month_start_date < toDate('{{MONTH_END_EXCLUSIVE}}')
    AND h.played_at >= toDateTime('{{WINDOW_START}}')
    AND h.played_at < toDateTime('{{WINDOW_END}}')
    AND h.user_id IN ({{RANK_USER_IDS}})
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
    v.x.10 AS is_allin,
    v.x.15 AS raise_and_blind_bb,
    v.x.16 AS posted_blind_bb
  FROM latest_versions AS v
  INNER JOIN rank_intervals AS r ON v.x.1 = r.user_id
  WHERE v.x.2 >= r.rank_start_at
    AND v.x.2 < r.rank_end_at
    AND v.x.2 >= toDateTime('{{WINDOW_START}}')
    AND v.x.2 < toDateTime('{{WINDOW_END}}')
    AND v.x.1 IS NOT NULL
    AND v.x.11 = 1
    AND v.x.12 = 1
    AND v.x.13 = 1
    AND v.x.14 = 0
    AND v.x.8 IN ('F', 'C', 'R')
    AND v.x.3 IN (0, 1, 2, 3, 4, 5, 6, 7, 9)
    AND v.x.4 IN (0, 1, 2, 3, 4, 5, 6, 7, 8, 9)
    AND (
      (v.x.3 BETWEEN 0 AND 7 AND (v.x.4 < v.x.3 OR v.x.4 IN (8, 9)))
      OR (v.x.3 = 9 AND v.x.4 = 8)
    )
    AND v.x.5 >= 20
    AND v.x.6 >= 3
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
      face_action = 'R' AND preflop_action = 'RR' AND (
        is_allin = 1 OR (
          isNotNull(raise_and_blind_bb)
          AND raise_and_blind_bb - posted_blind_bb >= effective_stack_bb - 0.01
        )
      ), 'jam',
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
