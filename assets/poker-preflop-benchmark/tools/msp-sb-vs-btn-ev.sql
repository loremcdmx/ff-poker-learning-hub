/*
  MSP outcome evidence for the default SB-vs-BTN trainer spot.

  Exact spot:
    - 7-9max;
    - hero SB, BTN opens 1.8-2.25 BB, no limpers;
    - effective stack 18-25 BB;
    - rank-at-hand cohorts League 1 (ranks 1-5) and ranks 15-18;
    - frozen window [2025-10-01, 2026-07-22).

  The metric is all-in-adjusted net BB per 100 opportunities in this exact
  preflop spot. It is not a player's global bb/100. The action-shape difference
  and the outcome gap coexist in the same observational slice; this query does
  not claim that extra calls causally explain the entire outcome gap.

  The published extraction produced complete EV coverage:
    league1: 25,794 opportunities, 238 players, +4.49 BB/100 spots;
    r15_18: 33,468 opportunities, 1,246 players, -5.35 BB/100 spots;
    observed gap: 9.84 BB/100 spots.
*/

-- 1. BigQuery rank-at-hand bridge. Keep this bridge frozen with the outcome
--    export; do not replace it with current rank.
SELECT
  h.user_id,
  h.rang,
  FORMAT_TIMESTAMP(
    '%F %T',
    GREATEST(h.rang_start_at, TIMESTAMP '2025-10-01 00:00:00+00'),
    'UTC'
  ) AS rank_start_at,
  FORMAT_TIMESTAMP(
    '%F %T',
    LEAST(
      COALESCE(h.rang_end_at, TIMESTAMP '2026-07-22 00:00:00+00'),
      TIMESTAMP '2026-07-22 00:00:00+00'
    ),
    'UTC'
  ) AS rank_end_at
FROM `analytics_mcp_readonly.mcp__check_rank_history` AS h
JOIN `analytics_mcp_readonly.mcp__check_users` AS u USING (user_id)
WHERE (h.rang BETWEEN 1 AND 5 OR h.rang BETWEEN 15 AND 18)
  AND h.rang_start_at < TIMESTAMP '2026-07-22 00:00:00+00'
  AND COALESCE(h.rang_end_at, TIMESTAMP '2026-07-22 00:00:00+00')
      > TIMESTAMP '2025-10-01 00:00:00+00'
  AND u.is_real_player IS TRUE;

-- 2. ClickHouse. Replace {{RANK_INTERVAL_ROWS}} with tuples from query 1.
WITH rank_intervals AS (
  SELECT * FROM values(
    'member_user_id Int32, rang Int32, valid_from DateTime, valid_to DateTime',
    {{RANK_INTERVAL_ROWS}}
  )
),
latest AS (
  SELECT argMax(tuple(
    h.user_id,
    if(r.rang BETWEEN 1 AND 5, 'league1', 'r15_18'),
    h.chips_ev,
    h.bb_amount,
    h.preflop_action,
    toUInt8(coalesce(h.is_preflop_allin, 0)),
    h.holecards_str,
    h.preflop_effective_stack_size_bb,
    h.preflop_raise_and_blind_made_amount_bb,
    if(h.bb_amount > 0, coalesce(h.bet_bb_amount, 0) / h.bb_amount, 0)
  ), tuple(h.version, h.hand_player_id)) AS x
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN rank_intervals AS r ON h.user_id = r.member_user_id
  WHERE h.played_at >= r.valid_from
    AND h.played_at < r.valid_to
    AND (r.rang BETWEEN 1 AND 5 OR r.rang BETWEEN 15 AND 18)
    AND h.month_start_date >= toDate('2025-10-01')
    AND h.month_start_date < toDate('2026-08-01')
    AND h.played_at >= toDateTime('2025-10-01 00:00:00')
    AND h.played_at < toDateTime('2026-07-22 00:00:00')
    AND h.cnt_players_lookup_position BETWEEN 7 AND 9
    AND h.position = 9
    AND h.preflop_aggressor_position = 0
    AND h.val_preflop_action_facing = 4
    AND coalesce(h.cnt_preflop_face_limpers, 0) = 0
    AND h.preflop_2bet_and_blind_facing_amount_bb BETWEEN 1.8 AND 2.25
    AND h.preflop_effective_stack_size_bb >= 18
    AND h.preflop_effective_stack_size_bb < 25
    AND h.chips_ev IS NOT NULL
    AND h.bb_amount > 0
  GROUP BY h.network, h.tourney_id, h.hand_id, h.user_id
)
SELECT
  x.2 AS cohort,
  '__SPOT__' AS hand_class,
  count() AS opportunities,
  uniqExact(x.1) AS players,
  round(100 * avg(toFloat64(x.3) / toFloat64(x.4)), 2) AS spot_ev_bb_100,
  round(100 * countIf(x.5 = 'F') / count(), 1) AS fold_pct,
  round(100 * countIf(startsWith(ifNull(x.5, ''), 'C')) / count(), 1) AS call_pct,
  round(100 * countIf(startsWith(ifNull(x.5, ''), 'R') AND NOT (
    x.5 = 'R' AND (x.6 = 1 OR (isNotNull(x.9) AND x.9 - x.10 >= x.8 - 0.01))
  )) / count(), 1) AS raise_pct,
  round(100 * countIf(x.5 = 'R' AND (
    x.6 = 1 OR (isNotNull(x.9) AND x.9 - x.10 >= x.8 - 0.01)
  )) / count(), 1) AS jam_pct
FROM latest
GROUP BY cohort

UNION ALL

SELECT
  x.2 AS cohort,
  x.7 AS hand_class,
  count() AS opportunities,
  uniqExact(x.1) AS players,
  round(100 * avg(toFloat64(x.3) / toFloat64(x.4)), 2) AS spot_ev_bb_100,
  round(100 * countIf(x.5 = 'F') / count(), 1) AS fold_pct,
  round(100 * countIf(startsWith(ifNull(x.5, ''), 'C')) / count(), 1) AS call_pct,
  round(100 * countIf(startsWith(ifNull(x.5, ''), 'R') AND NOT (
    x.5 = 'R' AND (x.6 = 1 OR (isNotNull(x.9) AND x.9 - x.10 >= x.8 - 0.01))
  )) / count(), 1) AS raise_pct,
  round(100 * countIf(x.5 = 'R' AND (
    x.6 = 1 OR (isNotNull(x.9) AND x.9 - x.10 >= x.8 - 0.01)
  )) / count(), 1) AS jam_pct
FROM latest
WHERE x.7 IN ('QJs', 'QTs', 'KTs', '55', 'JTs')
GROUP BY cohort, hand_class
ORDER BY cohort, hand_class;
