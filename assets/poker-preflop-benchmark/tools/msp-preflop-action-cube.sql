-- MSP source for the three preflop benchmark trainers.
-- Frozen window: [2023-09-01, 2026-07-22). Cohorts are attached at the exact
-- time of each hand, never by current rank.
-- Public output shows only integer action rates. Hand cells below 30 classified
-- actions and whole slices below 100 classified actions are omitted by the
-- builder; no interpolation or strategic model fills them.

-- 1. BigQuery: rank-at-hand bridge, clipped to the analysis window.
SELECT
  h.user_id,
  CASE WHEN h.rang BETWEEN 1 AND 5 THEN 'league1' ELSE 'r15_18' END AS cohort,
  FORMAT_TIMESTAMP('%F %T', GREATEST(h.rang_start_at, TIMESTAMP '2023-09-01 00:00:00+00'), 'UTC') AS valid_from,
  FORMAT_TIMESTAMP('%F %T', LEAST(COALESCE(h.rang_end_at, TIMESTAMP '2026-07-22 00:00:00+00'), TIMESTAMP '2026-07-22 00:00:00+00'), 'UTC') AS valid_to
FROM `analytics_mcp_readonly.mcp__check_rank_history` AS h
JOIN `analytics_mcp_readonly.mcp__check_users` AS u USING (user_id)
WHERE (h.rang BETWEEN 1 AND 5 OR h.rang BETWEEN 15 AND 18)
  AND h.rang_start_at < TIMESTAMP '2026-07-22 00:00:00+00'
  AND COALESCE(h.rang_end_at, TIMESTAMP '2026-07-22 00:00:00+00') > TIMESTAMP '2023-09-01 00:00:00+00'
  AND u.is_real_player IS TRUE;

-- 2. ClickHouse: replace the placeholder with tuples from query 1.
WITH rank_intervals AS (
  SELECT * FROM values(
    'member_user_id Int32, rang Int32, valid_from DateTime, valid_to DateTime',
    {{RANK_INTERVAL_ROWS}}
  )
),
latest AS (
  SELECT argMax(tuple(
    h.user_id, if(r.rang BETWEEN 1 AND 5, 'league1', 'r15_18'),
    h.played_at, h.cnt_players_lookup_position,
    h.position, h.preflop_aggressor_position,
    h.preflop_2bet_and_blind_facing_amount_bb,
    h.preflop_effective_stack_size_bb, h.holecards_str, h.preflop_action,
    toUInt8(coalesce(h.is_preflop_allin, 0)),
    toUInt8(coalesce(h.cnt_preflop_face_limpers, 0)),
    h.val_preflop_action_facing,
    toUInt8(coalesce(h.is_preflop_unopened, 0))
  ), tuple(h.version, h.hand_player_id)) AS x
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN rank_intervals AS r ON h.user_id = r.member_user_id
  WHERE h.played_at >= r.valid_from AND h.played_at < r.valid_to
    AND h.month_start_date >= toDate('2023-09-01')
    AND h.month_start_date < toDate('2026-08-01')
    AND h.played_at >= toDateTime('2023-09-01 00:00:00')
    AND h.played_at < toDateTime('2026-07-22 00:00:00')
    AND h.cnt_players_lookup_position BETWEEN 7 AND 9
    AND h.position IN (0,1,2,3,4,9)
    AND h.preflop_effective_stack_size_bb > 0
    AND h.preflop_effective_stack_size_bb <= 200
    AND ((h.val_preflop_action_facing = 4
      AND coalesce(h.cnt_preflop_face_limpers, 0) = 0
      AND h.preflop_aggressor_position BETWEEN 0 AND 7
      AND (h.position = 9 OR (h.position BETWEEN 0 AND 4 AND h.preflop_aggressor_position > h.position)))
      OR (coalesce(h.is_preflop_unopened, 0) = 1 AND h.position = 9))
  GROUP BY h.network, h.tourney_id, h.hand_id, h.user_id
),
classified AS (
  SELECT
    multiIf(x.14 = 1 AND x.5 = 9, 'sb_unopened', x.13 = 4 AND x.5 = 9, 'vs_raise_sb', 'vs_raise_free') AS trainer,
    x.2 AS cohort,
    multiIf(x.5 IN (3,4), 'MP', x.5=2, 'HJ', x.5=1, 'CO', x.5=0, 'BTN', 'SB') AS hero_position,
    multiIf(x.6 IN (5,6,7), 'EP', x.6 IN (3,4), 'MP', x.6=2, 'HJ', x.6=1, 'CO', x.6=0, 'BTN', '—') AS opener_position,
    multiIf(x.7 BETWEEN 1.8 AND 2.25, '2x', x.7 > 2.25 AND x.7 <= 2.75, '2.5x', x.7 > 2.75 AND x.7 <= 3.25, '3x', 'other') AS open_size,
    multiIf(x.8>=70,'70+',x.8>=40,'40-70',x.8>=25,'25-40',x.8>=18,'18-25',x.8>=15,'15-18',x.8>=12,'12-15',x.8>=10,'10-12',x.8>=8,'8-10',x.8>=6,'6-8','<6') AS stack_bucket,
    ifNull(nullIf(x.9,''),'__MISSING__') AS hand_class,
    x.1 AS user_id,
    x.3 AS played_at,
    multiIf(x.10='R' AND x.11=1,'jam',startsWith(ifNull(x.10,''),'R'),'raise',startsWith(ifNull(x.10,''),'C'),'call',x.10='F','fold','other') AS action_class
  FROM latest
)
SELECT trainer, cohort, hero_position, opener_position, open_size, stack_bucket,
  hand_class, count() AS opportunities,
  countIf(action_class='fold') AS folds,
  countIf(action_class='call') AS calls,
  countIf(action_class='raise') AS raises,
  countIf(action_class='jam') AS jams,
  countIf(action_class='other') AS other,
  uniqExact(user_id) AS players,
  uniqExact(toStartOfMonth(played_at)) AS months,
  min(played_at) AS first_hand_at,
  max(played_at) AS last_hand_at
FROM classified
GROUP BY trainer, cohort, hero_position, opener_position, open_size, stack_bucket, hand_class
ORDER BY trainer, cohort, hero_position, opener_position, open_size, stack_bucket, hand_class;
