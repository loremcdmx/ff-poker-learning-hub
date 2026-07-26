-- MSP source for the three preflop benchmark trainers.
-- Frozen window: [2023-09-01, 2026-07-22). Cohorts are attached at the exact
-- time of each hand, never by current rank.
-- Learner visuals show integer action rates; the generated payload also keeps
-- each hand's exact denominator for the publication audit. Hand cells below
-- 50 classified actions and whole slices below 100 classified actions are
-- omitted by the builder; no interpolation or strategic model fills them.

-- Rank bridge: run tools/msp-preflop-rank-bridge.sql once and reuse that
-- exact full-rank CSV + metadata for this action cube and the EV source.
-- ClickHouse: replace the placeholder with tuples from the shared bridge.
WITH rank_intervals AS (
  SELECT member_user_id, rang, valid_from, valid_to FROM values(
    'member_user_id Int32, rang Int32, valid_from DateTime, valid_to DateTime',
    {{RANK_INTERVAL_ROWS}}
  )
),
candidate_ids AS (
  -- This pass only narrows the immutable set of hand ids that can belong to
  -- one of the three trainer nodes. Every predicate is repeated after argMax,
  -- so an older qualifying tracker version cannot survive when its latest
  -- version no longer belongs to the spot.
  SELECT h.hand_player_id
  FROM analytics.int_tracker_hand_joined AS h
  PREWHERE h.user_id IN ({{RANK_USER_IDS}})
    AND h.month_start_date >= toDate('{{WINDOW_MONTH_START}}')
    AND h.month_start_date < toDate('{{WINDOW_MONTH_END_EXCLUSIVE}}')
  WHERE h.played_at >= toDateTime('{{WINDOW_START}}')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}}')
    AND h.hand_player_id IS NOT NULL
    AND h.cnt_players_lookup_position BETWEEN 7 AND 9
    AND h.position IN (0,1,2,3,4,9)
    AND h.preflop_effective_stack_size_bb > 0
    AND h.preflop_effective_stack_size_bb <= 200
    AND ((h.val_preflop_action_facing = 4
      AND toUInt8(coalesce(h.cnt_preflop_face_limpers, 0)) = 0
      AND h.preflop_aggressor_position BETWEEN 0 AND 7
      AND (
        h.position = 9
        OR (h.position BETWEEN 0 AND 4 AND h.preflop_aggressor_position > h.position)
      ))
      OR (
        toUInt8(coalesce(h.is_preflop_unopened, 0)) = 1
        AND h.position = 9
      ))
  GROUP BY h.hand_player_id
),
latest AS (
  SELECT argMax(tuple(
    h.user_id, multiIf(r.rang BETWEEN 1 AND 5, 'league1', r.rang BETWEEN 6 AND 14, 'leagues2_3', 'r15_18'),
    h.played_at, h.cnt_players_lookup_position,
    h.position, h.preflop_aggressor_position,
    h.preflop_2bet_and_blind_facing_amount_bb,
    h.preflop_effective_stack_size_bb, h.holecards_str, h.preflop_action,
    toUInt8(coalesce(h.is_preflop_allin, 0)),
    toUInt8(coalesce(h.cnt_preflop_face_limpers, 0)),
    h.val_preflop_action_facing,
    toUInt8(coalesce(h.is_preflop_unopened, 0)),
    h.preflop_raise_and_blind_made_amount_bb,
    if(h.bb_amount > 0, coalesce(h.bet_bb_amount, 0) / h.bb_amount, 0)
  ), tuple(h.version, h.hand_player_id)) AS x
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN candidate_ids AS c USING (hand_player_id)
  INNER JOIN rank_intervals AS r ON h.user_id = r.member_user_id
  PREWHERE h.user_id IN ({{RANK_USER_IDS}})
    AND h.month_start_date >= toDate('{{WINDOW_MONTH_START}}')
    AND h.month_start_date < toDate('{{WINDOW_MONTH_END_EXCLUSIVE}}')
  WHERE h.played_at >= r.valid_from AND h.played_at < r.valid_to
    AND h.played_at >= toDateTime('{{WINDOW_START}}')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}}')
  GROUP BY h.hand_player_id
),
filtered AS (
  SELECT x
  FROM latest
  WHERE x.4 BETWEEN 7 AND 9
    AND x.5 IN (0,1,2,3,4,9)
    AND x.8 > 0
    AND x.8 <= 200
    AND ((x.13 = 4
      AND x.12 = 0
      AND x.6 BETWEEN 0 AND 7
      AND (x.5 = 9 OR (x.5 BETWEEN 0 AND 4 AND x.6 > x.5)))
      OR (x.14 = 1 AND x.5 = 9))
),
classified AS (
  SELECT
    multiIf(x.14 = 1 AND x.5 = 9, 'sb_unopened', x.13 = 4 AND x.5 = 9, 'vs_raise_sb', 'vs_raise_free') AS trainer,
    x.2 AS cohort,
    multiIf(x.5 IN (3,4), 'MP', x.5=2, 'HJ', x.5=1, 'CO', x.5=0, 'BTN', 'SB') AS hero_position,
    multiIf(
      x.6 IN (5,6,7) OR (x.5 IN (3,4) AND x.6 IN (3,4)), 'EP',
      x.6 IN (3,4), 'MP', x.6=2, 'HJ', x.6=1, 'CO', x.6=0, 'BTN', '—'
    ) AS opener_position,
    multiIf(x.7 BETWEEN 1.8 AND 2.25, '2x', x.7 > 2.25 AND x.7 <= 2.75, '2.5x', x.7 > 2.75 AND x.7 <= 3.25, '3x', 'other') AS open_size,
    -- Around the 3-bet/jam boundary, a 15-22 BB-wide bucket is too coarse for
    -- learner advice. The 20-35 BB labels are representative effective stacks
    -- for narrow nearest-5 BB windows; 38-39 BB is kept as a
    -- separate transition cell before the existing 40-70 BB deep-stack band.
    multiIf(
      x.5 = 9 AND x.8>=70,'70+', x.5 = 9 AND x.8>=40,'40-70',
      x.5 = 9 AND x.8>=25,'25-40', x.5 = 9 AND x.8>=18,'18-25',
      x.5 = 9 AND x.8>=15,'15-18', x.5 = 9 AND x.8>=12,'12-15',
      x.5 = 9 AND x.8>=10,'10-12', x.5 = 9 AND x.8>=8,'8-10',
      x.5 = 9 AND x.8>=6,'6-8', x.5 = 9,'<6',
      x.8>=70,'70+', x.8>=40,'40-70',
      x.8>=37.5,'40', x.8>=32.5,'35', x.8>=27.5,'30',
      x.8>=22.5,'25', x.8>=18,'20',
      x.8>=15,'15-18', x.8>=12,'12-15', x.8>=10,'10-12',
      x.8>=8,'8-10', x.8>=6,'6-8','<6'
    ) AS stack_bucket,
    ifNull(nullIf(x.9,''),'__MISSING__') AS hand_class,
    x.1 AS user_id,
    x.3 AS played_at,
    -- `is_preflop_allin` only says that Hero exhausted Hero's own stack. When
    -- Hero covers a shorter opponent, a raise that exhausts the effective
    -- stack is still an effective shove even though Hero is not all-in. The
    -- tracker amount includes Hero's already posted blind, so subtract that
    -- blind before comparing the made raise with the effective stack.
    multiIf(
      x.10 = 'R' AND (
        x.11 = 1 OR (
          isNotNull(x.15)
          AND x.15 - x.16 >= x.8 - 0.01
        )
      ), 'jam',
      startsWith(ifNull(x.10, ''), 'R'), 'raise',
      startsWith(ifNull(x.10, ''), 'C'), 'call',
      x.10 = 'F', 'fold',
      'other'
    ) AS action_class
  FROM filtered
)
SELECT trainer, cohort, hero_position, opener_position, open_size, stack_bucket,
  hand_class, count() AS opportunities,
  countIf(action_class='fold') AS folds,
  countIf(action_class='call') AS calls,
  countIf(action_class='raise') AS raises,
  countIf(action_class='jam') AS jams,
  countIf(action_class='other') AS other,
  min(played_at) AS first_hand_at,
  max(played_at) AS last_hand_at
FROM classified
WHERE hand_class != '__MISSING__'
  AND (trainer = 'sb_unopened' OR open_size IN ('2x', '2.5x', '3x'))
GROUP BY trainer, cohort, hero_position, opener_position, open_size, stack_bucket, hand_class
ORDER BY trainer, cohort, hero_position, opener_position, open_size, stack_bucket, hand_class;
