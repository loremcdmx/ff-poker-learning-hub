/*
  First-league BB response: BTN 2 BB open heads-up versus BTN 2 BB open + SB call.

  Window: [2026-01-01, 2026-07-17) UTC.
  Cohort: rank 1-5 at the moment of the hand, real players only.
  Hero: BB, effective stack >= 30 BB, 3-9 handed.
  Multiway encoding: val_preflop_action_facing=5. With BTN as the first
  aggressor and Hero on BB, the only player who can call between them is SB.
  A first action letter R is a 3-bet; direct all-ins remain part of that total.

  Run query 1 in BigQuery. Render its result as ClickHouse VALUES tuples and
  replace {{RANK_INTERVAL_ROWS}} before running query 2 in ClickHouse.
*/

-- 1. BigQuery: rank-at-hand bridge.
SELECT
  h.user_id,
  h.rang,
  FORMAT_TIMESTAMP(
    '%F %T',
    GREATEST(h.rang_start_at, TIMESTAMP '2026-01-01 00:00:00+00'),
    'UTC'
  ) AS rank_start_at,
  FORMAT_TIMESTAMP(
    '%F %T',
    LEAST(
      COALESCE(h.rang_end_at, TIMESTAMP '2026-07-17 00:00:00+00'),
      TIMESTAMP '2026-07-17 00:00:00+00'
    ),
    'UTC'
  ) AS rank_end_at
FROM `analytics_mcp_readonly.mcp__check_rank_history` AS h
JOIN `analytics_mcp_readonly.mcp__check_users` AS u USING (user_id)
WHERE h.rang BETWEEN 1 AND 5
  AND h.rang_start_at < TIMESTAMP '2026-07-17 00:00:00+00'
  AND COALESCE(h.rang_end_at, TIMESTAMP '2026-07-17 00:00:00+00') > TIMESTAMP '2026-01-01 00:00:00+00'
  AND u.is_real_player = TRUE
ORDER BY h.user_id, h.rang_start_at;

-- 2. ClickHouse: latest-version-first observed action aggregate.
WITH
rank_intervals AS
(
  SELECT *
  FROM values(
    'user_id Int32, rang Int16, rank_start_at DateTime, rank_end_at DateTime',
    {{RANK_INTERVAL_ROWS}}
  )
),
latest AS
(
  SELECT
    hand_player_id,
    argMax(
      tuple(
        h.user_id,
        h.played_at,
        h.val_preflop_action_facing,
        coalesce(h.is_first_aggressor_btn, 0),
        coalesce(h.cnt_preflop_face_limpers, 0),
        coalesce(h.is_preflop_could_3bet, 0),
        h.preflop_effective_stack_size_bb,
        h.preflop_2bet_and_blind_facing_amount_bb,
        h.cnt_players,
        ifNull(h.preflop_action, ''),
        coalesce(h.is_preflop_allin, 0),
        h.preflop_aggressor_position,
        ifNull(h.network, ''),
        h.tourney_id,
        h.hand_id
      ),
      h.version
    ) AS x
  FROM analytics.int_tracker_hand_joined AS h
  PREWHERE h.month_start_date >= toDate('2026-01-01')
    AND h.month_start_date < toDate('2026-08-01')
  WHERE h.played_at >= toDateTime('2026-01-01 00:00:00')
    AND h.played_at < toDateTime('2026-07-17 00:00:00')
    AND h.is_bb = 1
    AND h.hand_player_id IS NOT NULL
  GROUP BY h.hand_player_id
),
spots AS
(
  SELECT
    if(x.3 = 4, 'BTN_OPEN_BB', 'BTN_OPEN_SB_CALL_BB') AS spot,
    x.1 AS user_id,
    x.2 AS played_at,
    left(x.10, 1) AS action,
    x.11 AS is_allin
  FROM latest
  INNER JOIN rank_intervals AS r ON x.1 = r.user_id
  WHERE x.2 >= r.rank_start_at
    AND x.2 < r.rank_end_at
    AND x.1 IS NOT NULL
    AND x.3 IN (4, 5)
    AND x.4 = 1
    AND x.5 = 0
    AND x.6 = 1
    AND x.7 >= 30
    AND abs(x.8 - 2.0) <= 0.05
    AND x.9 BETWEEN 3 AND 9
    AND x.12 = 0
    AND x.13 != ''
    AND x.14 IS NOT NULL
    AND x.15 IS NOT NULL
)
SELECT
  spot,
  count() AS decisions,
  uniqExact(user_id) AS unique_players,
  countIf(action = 'F') AS folds,
  countIf(action = 'C') AS calls,
  countIf(action = 'R') AS threebets,
  countIf(action = 'R' AND is_allin = 1) AS direct_allins,
  countIf(action NOT IN ('F', 'C', 'R')) AS other_actions,
  round(100 * calls / decisions, 2) AS call_pct,
  round(100 * threebets / decisions, 2) AS threebet_pct,
  round(100 * folds / decisions, 2) AS fold_pct,
  min(played_at) AS first_hand_at,
  max(played_at) AS last_hand_at
FROM spots
GROUP BY spot
ORDER BY spot;
