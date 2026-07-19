/*
  League-3 BB-call realization source for the hand-shape lesson slide.

  Window: [2026-01-01 00:00:00, 2026-07-17 00:00:00) UTC.
  Spot: League 3 at the moment of the hand (ranks 11-15), BB calls one BTN
  opener to 2 BB, 40-70 BB effective, non-all-in preflop, heads-up flop,
  3-9 players at the table.

  Query 1 runs in BigQuery. Render its result as VALUES tuples and replace
  {{RANK_INTERVAL_ROWS}} before running query 2 in ClickHouse.

  The output is observational. It contains only hands that were actually
  called, so weak offsuit hands are strongly selected. The lesson therefore
  compares same-rank suited/offsuit pairs only when both cells have at least
  500 EV-ready calls, balancing each pair to its smaller cell.

  The companion builder gets raw preflop equity from the reproducible 169x169
  matrix, weighted by the observed current-League-3 BTN open counts in
  poker-rfi-open-lesson/field-action-data.js. It never treats EV as equity.
*/

-- 1. BigQuery rank-at-hand bridge.
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
WHERE h.rang BETWEEN 11 AND 15
  AND h.rang_start_at < TIMESTAMP '2026-07-17 00:00:00+00'
  AND COALESCE(h.rang_end_at, TIMESTAMP '2026-07-17 00:00:00+00') > TIMESTAMP '2026-01-01 00:00:00+00'
  AND u.is_real_player = TRUE
ORDER BY h.user_id, h.rang_start_at;

-- 2. ClickHouse per-hand EV-ready call export.
WITH
rank_intervals AS
(
  SELECT *
  FROM values(
    'user_id Int32, rang Int16, rank_start_at DateTime, rank_end_at DateTime',
    {{RANK_INTERVAL_ROWS}}
  )
),
raw_latest AS
(
  SELECT
    h.network,
    h.tourney_id,
    h.hand_id,
    argMax(
      tuple(
        h.hand_player_id,
        h.user_id,
        r.rang,
        h.played_at,
        h.holecards_str,
        h.cnt_players,
        h.preflop_effective_stack_size_bb,
        h.preflop_2bet_and_blind_facing_amount_bb,
        h.preflop_aggressor_position,
        h.chips_ev,
        h.chips_won,
        h.ante_amount,
        h.bb_amount
      ),
      tuple(h.version, h.hand_player_id)
    ) AS x
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN rank_intervals AS r ON h.user_id = r.user_id
  WHERE h.played_at >= r.rank_start_at
    AND h.played_at < r.rank_end_at
    AND h.month_start_date >= toDate('2026-01-01')
    AND h.month_start_date < toDate('2026-08-01')
    AND h.played_at >= toDateTime('2026-01-01 00:00:00')
    AND h.played_at < toDateTime('2026-07-17 00:00:00')
    AND h.is_bb = 1
    AND h.val_preflop_action_facing = 4
    AND h.preflop_action = 'C'
    AND coalesce(h.is_preflop_allin, 0) = 0
    AND h.cnt_flop_players = 2
    AND h.cnt_players BETWEEN 3 AND 9
    AND h.preflop_effective_stack_size_bb >= 40
    AND h.preflop_effective_stack_size_bb < 70
    AND h.preflop_aggressor_position = 0
    AND abs(h.preflop_2bet_and_blind_facing_amount_bb - 2.0) <= 0.05
    AND h.bb_amount > 0
    AND h.hand_player_id IS NOT NULL
    AND h.hand_id IS NOT NULL
    AND h.tourney_id IS NOT NULL
    AND h.network IS NOT NULL
    AND h.network != ''
  GROUP BY h.network, h.tourney_id, h.hand_id
),
source AS
(
  SELECT
    x.2 AS user_id,
    x.4 AS played_at,
    x.5 AS hand,
    x.6 AS cnt_players,
    x.8 AS open_bb,
    toFloat64(x.10) / toFloat64(x.13) AS chips_ev_bb,
    toFloat64(x.12) / toFloat64(x.13) AS hero_ante_bb,
    (toFloat64(x.12) / toFloat64(x.13)) * x.6 AS total_ante_bb
  FROM raw_latest
  WHERE x.2 IS NOT NULL
    AND x.5 IS NOT NULL
    AND x.5 != ''
    AND x.10 IS NOT NULL
    AND x.11 IS NOT NULL
    AND x.12 IS NOT NULL
    AND x.13 IS NOT NULL
    AND x.13 > 0
)
SELECT
  hand,
  count() AS hand_count,
  uniqExact(user_id) AS unique_players,
  round(avg(chips_ev_bb), 6) AS avg_chips_ev_bb,
  round(avg(hero_ante_bb), 6) AS mean_hero_ante_bb,
  round(avg(2 * open_bb + 0.5 + total_ante_bb), 6) AS mean_pot_after_call_bb,
  round(avg(chips_ev_bb + 1 + hero_ante_bb), 6) AS mean_ev_vs_fold_bb,
  round(
    100 * sum(chips_ev_bb + open_bb + hero_ante_bb)
    / nullIf(sum(2 * open_bb + 0.5 + total_ante_bb), 0),
    4
  ) AS realized_equity_pct,
  min(played_at) AS first_hand_at,
  max(played_at) AS last_hand_at
FROM source
GROUP BY hand
ORDER BY hand;
