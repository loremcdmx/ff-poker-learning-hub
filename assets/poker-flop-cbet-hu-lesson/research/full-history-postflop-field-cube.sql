-- Exact full-history cohort cube shared by the HU c-bet and BB check-raise
-- lessons.  The private rank interval rows are injected by
-- ../tools/render-full-history-field-query.mjs and never committed.
--
-- Source hands: analytics.int_tracker_hand_joined.
-- Rank bridge: exact BigQuery rank-at-hand half-open intervals.
-- Window: [{{WINDOW_START_INCLUSIVE}}, {{WINDOW_END_EXCLUSIVE}}) UTC.
--
-- Non-negotiable ordering contract:
--   1. PREWHERE only immutable storage boundaries (month, played_at, user_id).
--   2. Latest row per hand_player_id is selected by the largest version, with
--      the complete projected tuple as an exact deterministic equal-version
--      tie-break.
--   3. Rank-at-hand is joined on latest played_at using [start, end).
--   4. Poker/business predicates are applied only after steps 1-3.
--
-- Cohorts are disjoint and shared by both lessons:
--   league1 = ranks 1-5; league2 = 6-10; league3 = 11-14;
--   novice = ranks 15-18.

WITH
rank_intervals AS
(
  SELECT *
  FROM values(
    'user_id Int32, rang Int16, rank_start_at DateTime, rank_end_at DateTime',
    {{RANK_INTERVAL_ROWS}}
  )
),
latest_overall AS
(
  SELECT
    argMax(
      tuple(
        h.user_id,                                      -- 1
        h.played_at,                                    -- 2
        h.position,                                     -- 3
        h.preflop_aggressor_position,                   -- 4
        h.preflop_effective_stack_size_bb,              -- 5
        toUInt8(coalesce(h.is_preflop_unopened, 0)),    -- 6
        toUInt8(coalesce(h.is_rfi, 0)),                 -- 7
        coalesce(h.preflop_raiser_count, 0),            -- 8
        coalesce(h.cnt_flop_players, 0),                -- 9
        toUInt8(coalesce(h.is_flop_in_position, 0)),    -- 10
        toUInt8(coalesce(h.is_flop_could_cbet, 0)),     -- 11
        toUInt8(coalesce(h.is_flop_cbet, 0)),           -- 12
        toUInt8(coalesce(h.is_flop_face_raise, 0)),     -- 13
        toUInt8(coalesce(h.is_flop_allin, 0)),          -- 14
        ifNull(h.preflop_actors_str, ''),               -- 15
        toUInt8(coalesce(h.is_bb, 0)),                  -- 16
        h.val_preflop_action_facing,                    -- 17
        ifNull(h.preflop_action, ''),                   -- 18
        toUInt8(coalesce(h.is_one_preflop_action_before_player, 0)), -- 19
        toUInt8(coalesce(h.is_first_aggressor_co, 0)),  -- 20
        toUInt8(coalesce(h.is_first_aggressor_btn, 0)), -- 21
        h.preflop_2bet_and_blind_facing_amount_bb,      -- 22
        coalesce(h.cnt_preflop_face_limpers, 0),        -- 23
        coalesce(h.cnt_players, 0),                     -- 24
        toUInt8(coalesce(h.is_3_9_max, 0)),             -- 25
        toUInt8(coalesce(h.is_flop_face_cbet, 0)),      -- 26
        toUInt8(coalesce(h.is_flop_fold_to_cbet, 0)),   -- 27
        toUInt8(coalesce(h.is_flop_call_to_cbet, 0)),   -- 28
        toUInt8(coalesce(h.is_flop_raise_to_cbet, 0)),  -- 29
        ifNull(h.flop_action, '')                       -- 30
      ),
      tuple(
        h.version,
        h.user_id,
        h.played_at,
        h.position,
        h.preflop_aggressor_position,
        h.preflop_effective_stack_size_bb,
        toUInt8(coalesce(h.is_preflop_unopened, 0)),
        toUInt8(coalesce(h.is_rfi, 0)),
        coalesce(h.preflop_raiser_count, 0),
        coalesce(h.cnt_flop_players, 0),
        toUInt8(coalesce(h.is_flop_in_position, 0)),
        toUInt8(coalesce(h.is_flop_could_cbet, 0)),
        toUInt8(coalesce(h.is_flop_cbet, 0)),
        toUInt8(coalesce(h.is_flop_face_raise, 0)),
        toUInt8(coalesce(h.is_flop_allin, 0)),
        ifNull(h.preflop_actors_str, ''),
        toUInt8(coalesce(h.is_bb, 0)),
        h.val_preflop_action_facing,
        ifNull(h.preflop_action, ''),
        toUInt8(coalesce(h.is_one_preflop_action_before_player, 0)),
        toUInt8(coalesce(h.is_first_aggressor_co, 0)),
        toUInt8(coalesce(h.is_first_aggressor_btn, 0)),
        h.preflop_2bet_and_blind_facing_amount_bb,
        coalesce(h.cnt_preflop_face_limpers, 0),
        coalesce(h.cnt_players, 0),
        toUInt8(coalesce(h.is_3_9_max, 0)),
        toUInt8(coalesce(h.is_flop_face_cbet, 0)),
        toUInt8(coalesce(h.is_flop_fold_to_cbet, 0)),
        toUInt8(coalesce(h.is_flop_call_to_cbet, 0)),
        toUInt8(coalesce(h.is_flop_raise_to_cbet, 0)),
        ifNull(h.flop_action, '')
      )
    ) AS x
  FROM analytics.int_tracker_hand_joined AS h
  PREWHERE h.month_start_date >= toDate('{{WINDOW_START_MONTH}}')
    AND h.month_start_date < toDate('{{WINDOW_END_MONTH_EXCLUSIVE}}')
    AND h.played_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
    AND h.user_id IN ({{RANK_USER_IDS}})
  GROUP BY h.hand_player_id
),
ranked_latest AS
(
  SELECT l.x, r.rang
  FROM latest_overall AS l
  INNER JOIN rank_intervals AS r
    ON l.x.1 = r.user_id
  WHERE l.x.2 >= r.rank_start_at
    AND l.x.2 < r.rank_end_at
),
prepared AS
(
  SELECT
    x,
    multiIf(
      rang BETWEEN 1 AND 5, 'league1',
      rang BETWEEN 6 AND 10, 'league2',
      rang BETWEEN 11 AND 14, 'league3',
      rang BETWEEN 15 AND 18, 'novice',
      'excluded'
    ) AS cohort,
    multiIf(
      x.5 < 20, '<20',
      x.5 < 30, '20-30',
      x.5 < 40, '30-40',
      x.5 < 70, '40-70',
      '70+'
    ) AS depth_band
  FROM ranked_latest
  WHERE x.25 = 1
    AND x.24 BETWEEN 3 AND 9
    AND isNotNull(x.5)
    AND x.5 > 0
),
cbet_rows AS
(
  SELECT
    'cbet' AS node,
    cohort,
    multiIf(x.3 = 0, 'BTN', x.3 = 1, 'CO', x.3 = 2, 'HJ', x.3 IN (3, 4), 'MP', 'EP') AS position,
    depth_band,
    x.1 AS user_id,
    x.2 AS played_at,
    x.12 AS made_cbet,
    x.13 AS faced_raise
  FROM prepared
  WHERE cohort != 'excluded'
    AND x.3 BETWEEN 0 AND 7
    AND x.6 = 1
    AND x.7 = 1
    AND x.8 = 1
    AND x.9 = 2
    AND x.10 = 1
    AND x.11 = 1
    AND match(x.15, '^[0-7]8$')
),
bb_response_rows AS
(
  SELECT
    'bb_response' AS node,
    cohort,
    if(x.4 = 0, 'BTN', 'CO') AS position,
    depth_band,
    x.1 AS user_id,
    x.2 AS played_at,
    x.27 AS folded,
    x.28 AS called,
    x.29 AS raised
  FROM prepared
  WHERE cohort != 'excluded'
    AND x.3 = 8
    AND x.16 = 1
    AND x.17 = 4
    AND x.18 = 'C'
    AND x.19 = 1
    AND (x.20 = 1 OR x.21 = 1)
    AND x.4 IN (0, 1)
    AND x.22 >= 1.5
    AND x.22 <= 3.0
    AND x.23 = 0
    AND x.5 >= 20
    AND x.9 = 2
    AND x.26 = 1
)
SELECT
  node,
  cohort,
  position,
  depth_band,
  count() AS opportunities,
  countIf(made_cbet = 0) AS checks_back,
  countIf(made_cbet = 1) AS cbets,
  countIf(made_cbet = 1 AND faced_raise = 1) AS faced_raises,
  toUInt64(0) AS folds,
  toUInt64(0) AS calls,
  toUInt64(0) AS raises,
  toUInt64(0) AS other,
  min(played_at) AS first_hand_at,
  max(played_at) AS last_hand_at
FROM cbet_rows
GROUP BY node, cohort, position, depth_band

UNION ALL

SELECT
  node,
  cohort,
  position,
  depth_band,
  count() AS opportunities,
  toUInt64(0) AS checks_back,
  toUInt64(0) AS cbets,
  toUInt64(0) AS faced_raises,
  countIf(folded = 1) AS folds,
  countIf(called = 1) AS calls,
  countIf(raised = 1) AS raises,
  countIf(folded + called + raised != 1) AS other,
  min(played_at) AS first_hand_at,
  max(played_at) AS last_hand_at
FROM bb_response_rows
GROUP BY node, cohort, position, depth_band

ORDER BY node, cohort, position, depth_band;
