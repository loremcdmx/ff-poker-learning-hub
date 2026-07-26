-- Exact rank-at-hand BB direct-resteal cube, refreshed 2026-07-22.
-- Window: [2023-09-01 00:00:00, 2026-07-22 00:00:00) UTC.
--
-- Extraction contract:
--   1. Export the BigQuery rank bridge below to a private CSV.
--   2. Render the ClickHouse section with render-resteal-rank-query.mjs.
--      The renderer validates half-open intervals and substitutes only the
--      requested rank shard plus its distinct user ids.
--   3. Run every rendered shard and combine the aggregate CSV rows. Rank
--      shards are disjoint, so integer hand/action counts remain additive.
--
-- Important: ClickHouse deduplicates the latest row for each hand_player_id
-- before applying any poker/business filters. This deliberately avoids the
-- old "latest qualifying" bias where a superseded version could survive only
-- because its latest version no longer matched the spot.

-- -------------------------------------------------------------------------
-- 1. BigQuery rank-at-hand bridge.
-- Dataset: analytics_mcp_readonly
-- -------------------------------------------------------------------------
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
ORDER BY h.user_id, h.rang_start_at, h.rang;

-- -------------------------------------------------------------------------
-- 2. ClickHouse lossless cube.
-- Database: analytics
-- -------------------------------------------------------------------------
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
  -- This is only a pruning pass. Any version that ever looked like the
  -- learner-facing node keeps the hand_player_id in the candidate set; the
  -- complete latest row is selected below and every predicate is repeated
  -- after argMax. A superseded qualifying version therefore cannot survive.
  SELECT h.hand_player_id
  FROM analytics.int_tracker_hand_joined AS h
  PREWHERE h.month_start_date >= toDate('2023-09-01')
    AND h.month_start_date < toDate('{{WINDOW_END_MONTH_EXCLUSIVE}}')
    AND h.user_id IN ({{RANK_USER_IDS}})
  WHERE h.played_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
    AND h.hand_player_id IS NOT NULL
    AND h.is_bb = 1
    AND h.val_preflop_action_facing = 4
    AND coalesce(h.is_preflop_could_3bet, 0) = 1
    AND coalesce(h.cnt_preflop_face_limpers, 0) = 0
    AND h.cnt_players BETWEEN 3 AND 9
    AND h.preflop_effective_stack_size_bb BETWEEN 25 AND 40
    AND h.preflop_aggressor_position IN (0, 1)
    AND (
      abs(h.preflop_2bet_and_blind_facing_amount_bb - 2.0) <= 0.05
      OR abs(h.preflop_2bet_and_blind_facing_amount_bb - 2.5) <= 0.05
      OR abs(h.preflop_2bet_and_blind_facing_amount_bb - 3.0) <= 0.05
    )
    AND h.hand_id IS NOT NULL
    AND h.tourney_id IS NOT NULL
    AND h.network IS NOT NULL
    AND h.network != ''
  GROUP BY h.hand_player_id
),
latest_overall AS
(
  SELECT
    argMax(
      tuple(
        h.user_id,
        h.played_at,
        ifNull(h.preflop_action, ''),
        toUInt8(coalesce(h.is_preflop_allin, 0)),
        h.preflop_aggressor_position,
        h.preflop_2bet_and_blind_facing_amount_bb,
        h.preflop_effective_stack_size_bb,
        ifNull(nullIf(h.holecards_str, ''), '__MISSING__'),
        toUInt8(coalesce(h.is_bb, 0)),
        h.val_preflop_action_facing,
        toUInt8(coalesce(h.is_preflop_could_3bet, 0)),
        coalesce(h.cnt_preflop_face_limpers, 0),
        h.cnt_players,
        ifNull(h.network, ''),
        h.tourney_id,
        h.hand_id,
        h.preflop_raise_and_blind_made_amount_bb,
        if(h.bb_amount > 0, coalesce(h.bet_bb_amount, 0) / h.bb_amount, 0)
      ),
      tuple(
        h.version,
        h.user_id,
        h.played_at,
        ifNull(h.preflop_action, ''),
        toUInt8(coalesce(h.is_preflop_allin, 0)),
        h.preflop_aggressor_position,
        h.preflop_2bet_and_blind_facing_amount_bb,
        h.preflop_effective_stack_size_bb,
        ifNull(nullIf(h.holecards_str, ''), '__MISSING__'),
        toUInt8(coalesce(h.is_bb, 0)),
        h.val_preflop_action_facing,
        toUInt8(coalesce(h.is_preflop_could_3bet, 0)),
        coalesce(h.cnt_preflop_face_limpers, 0),
        h.cnt_players,
        ifNull(h.network, ''),
        h.tourney_id,
        h.hand_id,
        h.preflop_raise_and_blind_made_amount_bb,
        if(h.bb_amount > 0, coalesce(h.bet_bb_amount, 0) / h.bb_amount, 0)
      )
    ) AS x
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN candidate_ids AS c USING (hand_player_id)
  PREWHERE h.month_start_date >= toDate('2023-09-01')
    AND h.month_start_date < toDate('{{WINDOW_END_MONTH_EXCLUSIVE}}')
    AND h.user_id IN ({{RANK_USER_IDS}})
  WHERE h.played_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
  GROUP BY h.hand_player_id
),
ranked_latest AS
(
  SELECT
    x,
    r.rang
  FROM latest_overall AS l
  INNER JOIN rank_intervals AS r
    ON x.1 = r.user_id
  WHERE x.2 >= r.rank_start_at
    AND x.2 < r.rank_end_at
),
filtered AS
(
  SELECT x, rang
  FROM ranked_latest
  WHERE x.9 = 1
    AND x.10 = 4
    AND x.11 = 1
    AND x.12 = 0
    AND x.13 BETWEEN 3 AND 9
    AND x.7 BETWEEN 25 AND 40
    AND x.5 IN (0, 1)
    AND (
      abs(x.6 - 2.0) <= 0.05
      OR abs(x.6 - 2.5) <= 0.05
      OR abs(x.6 - 3.0) <= 0.05
    )
    AND x.14 != ''
    AND isNotNull(x.15)
    AND isNotNull(x.16)
),
classified AS
(
  SELECT
    multiIf(
      rang BETWEEN 15 AND 18, 'novice',
      rang BETWEEN 11 AND 14, 'league3',
      rang BETWEEN 6 AND 10, 'league2',
      rang BETWEEN 1 AND 5, 'league1',
      'excluded'
    ) AS cohort,
    if(x.5 = 0, 'BTN', 'CO') AS opener_position,
    multiIf(abs(x.6 - 2.0) <= 0.05, '2.0', abs(x.6 - 2.5) <= 0.05, '2.5', '3.0') AS open_size_bb,
    multiIf(x.7 < 30, '25-30', x.7 < 35, '30-35', '35-40') AS depth_band,
    x.1 AS user_id,
    x.2 AS played_at,
    x.8 AS holecards_str,
    multiIf(
      x.3 = 'R' AND (
        x.4 = 1
        OR (
          isNotNull(x.17)
          AND x.17 - x.18 >= x.7 - 0.01
        )
      ), 'jam',
      startsWith(x.3, 'R'), 'small3bet',
      startsWith(x.3, 'C'), 'call',
      x.3 = 'F', 'fold',
      'other'
    ) AS action_class
  FROM filtered
)
SELECT
  cohort,
  opener_position,
  open_size_bb,
  depth_band,
  holecards_str,
  count() AS opportunities,
  countIf(action_class = 'fold') AS folds,
  countIf(action_class = 'call') AS calls,
  countIf(action_class = 'small3bet') AS small3bets,
  countIf(action_class = 'jam') AS jams,
  countIf(action_class = 'other') AS other,
  min(played_at) AS first_hand_at,
  max(played_at) AS last_hand_at
FROM classified
WHERE cohort != 'excluded'
GROUP BY cohort, opener_position, open_size_bb, depth_band, holecards_str
ORDER BY cohort, opener_position, open_size_bb, depth_band, holecards_str;

-- -------------------------------------------------------------------------
-- 3. BigQuery same-window ABI context.
-- Dataset: analytics_mcp_readonly
-- -------------------------------------------------------------------------
WITH abi_base AS
(
  SELECT
    CASE
      WHEN f.rang BETWEEN 15 AND 18 THEN 'novice'
      WHEN f.rang BETWEEN 11 AND 14 THEN 'league3'
      WHEN f.rang BETWEEN 6 AND 10 THEN 'league2'
      WHEN f.rang BETWEEN 1 AND 5 THEN 'league1'
    END AS cohort,
    f.user_id,
    CAST(f.load_usd AS FLOAT64) AS load_usd,
    1 + COALESCE(f.multientries, 0) AS entries
  FROM `analytics_mcp_readonly.mcp__fulltplayers` AS f
  JOIN `analytics_mcp_readonly.mcp__check_users` AS u USING (user_id)
  WHERE f.date_start >= TIMESTAMP '2023-09-01 00:00:00+00'
    AND f.date_start < TIMESTAMP '2026-07-22 00:00:00+00'
    AND f.rang BETWEEN 1 AND 18
    AND f.pack_id IS NOT NULL
    AND f.is_selfplay = FALSE
    AND u.is_real_player = TRUE
    AND f.load_usd IS NOT NULL
)
SELECT cohort, COUNT(DISTINCT user_id) AS players, SUM(entries) AS entries,
       ROUND(SUM(load_usd), 2) AS load_usd,
       ROUND(SAFE_DIVIDE(SUM(load_usd), SUM(entries)), 2) AS abi_usd
FROM abi_base
GROUP BY cohort
ORDER BY cohort;
