/*
  Full-history MSP source for the SB-unopened 169-hand matrices.

  Frozen window: [2023-09-01, 2026-07-22).
  Cohorts use rank at the exact hand time. Only real players and 7-9max tables
  are included. The published export has all 169 hand classes above the
  30-action threshold in both cohorts for every one of the ten stack buckets.

  Build the rank bridge with the BigQuery section, replace
  {{RANK_INTERVAL_ROWS}} in the ClickHouse section with those tuples, and pass
  the full CSV export to:

    node build-field-data.mjs <main-cube.csv> --sb-unopened <full-history.csv>
*/

-- 1. BigQuery: rank-at-hand intervals clipped to the full stable window.
SELECT
  h.user_id,
  h.rang,
  FORMAT_TIMESTAMP(
    '%F %T',
    GREATEST(h.rang_start_at, TIMESTAMP '2023-09-01 00:00:00+00'),
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
      > TIMESTAMP '2023-09-01 00:00:00+00'
  AND u.is_real_player IS TRUE
ORDER BY user_id, rank_start_at;

-- 2. ClickHouse: exact SB-unopened cube for the frozen rank bridge.
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
    h.played_at,
    h.holecards_str,
    h.preflop_action,
    toUInt8(coalesce(h.is_preflop_allin, 0)),
    h.preflop_effective_stack_size_bb
  ), tuple(h.version, h.hand_player_id)) AS x
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN rank_intervals AS r ON h.user_id = r.member_user_id
  WHERE h.played_at >= r.valid_from
    AND h.played_at < r.valid_to
    AND h.month_start_date >= toDate('2023-09-01')
    AND h.month_start_date < toDate('2026-08-01')
    AND h.played_at >= toDateTime('2023-09-01 00:00:00')
    AND h.played_at < toDateTime('2026-07-22 00:00:00')
    AND h.cnt_players_lookup_position BETWEEN 7 AND 9
    AND h.position = 9
    AND coalesce(h.is_preflop_unopened, 0) = 1
    AND h.preflop_effective_stack_size_bb > 0
    AND h.preflop_effective_stack_size_bb <= 200
  GROUP BY h.network, h.tourney_id, h.hand_id, h.user_id
),
classified AS (
  SELECT
    'sb_unopened' AS trainer,
    x.2 AS cohort,
    'SB' AS hero_position,
    '—' AS opener_position,
    '—' AS open_size,
    multiIf(
      x.7 >= 70, '70+',
      x.7 >= 40, '40-70',
      x.7 >= 25, '25-40',
      x.7 >= 18, '18-25',
      x.7 >= 15, '15-18',
      x.7 >= 12, '12-15',
      x.7 >= 10, '10-12',
      x.7 >= 8, '8-10',
      x.7 >= 6, '6-8',
      '<6'
    ) AS stack_bucket,
    ifNull(nullIf(x.4, ''), '__MISSING__') AS hand_class,
    x.1 AS user_id,
    x.3 AS played_at,
    multiIf(
      x.5 = 'R' AND x.6 = 1, 'jam',
      startsWith(ifNull(x.5, ''), 'R'), 'raise',
      startsWith(ifNull(x.5, ''), 'C'), 'call',
      x.5 = 'F', 'fold',
      'other'
    ) AS action_class
  FROM latest
)
SELECT
  trainer, cohort, hero_position, opener_position, open_size, stack_bucket,
  hand_class,
  count() AS opportunities,
  countIf(action_class = 'fold') AS folds,
  countIf(action_class = 'call') AS calls,
  countIf(action_class = 'raise') AS raises,
  countIf(action_class = 'jam') AS jams,
  countIf(action_class = 'other') AS other,
  uniqExact(user_id) AS players,
  uniqExact(toStartOfMonth(played_at)) AS months,
  min(played_at) AS first_hand_at,
  max(played_at) AS last_hand_at
FROM classified
GROUP BY
  trainer, cohort, hero_position, opener_position, open_size, stack_bucket,
  hand_class
ORDER BY
  trainer, cohort, hero_position, opener_position, open_size, stack_bucket,
  hand_class;
