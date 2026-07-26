-- Version-integrity audit for the strict observed-field node.
-- Render one non-overlapping shard by replacing {{WINDOW_START}},
-- {{WINDOW_END}}, and {{MONTH_END_EXCLUSIVE}}. `stale_after_latest_version`
-- must be zero before exact counters from that shard are published.

WITH
candidate_ids AS
(
  SELECT h.hand_player_id
  FROM analytics.int_tracker_hand_joined AS h
  WHERE h.month_start_date >= toDate('{{WINDOW_START}}')
    AND h.month_start_date < toDate('{{MONTH_END_EXCLUSIVE}}')
    AND h.played_at >= toDateTime('{{WINDOW_START}}')
    AND h.played_at < toDateTime('{{WINDOW_END}}')
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
candidate_versions AS
(
  SELECT
    h.hand_player_id,
    max(h.version) AS latest_version,
    maxIf(
      h.version,
      coalesce(h.is_rfi, 0) = 1
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
    ) AS latest_qualifying_version
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN candidate_ids AS c USING (hand_player_id)
  WHERE h.month_start_date >= toDate('{{WINDOW_START}}')
    AND h.month_start_date < toDate('{{MONTH_END_EXCLUSIVE}}')
    AND h.played_at >= toDateTime('{{WINDOW_START}}')
    AND h.played_at < toDateTime('{{WINDOW_END}}')
  GROUP BY h.hand_player_id
)
SELECT
  '{{WINDOW_START}}' AS window_start_inclusive,
  '{{WINDOW_END}}' AS window_end_exclusive,
  count() AS qualifying_hand_players,
  countIf(latest_version > latest_qualifying_version) AS stale_after_latest_version
FROM candidate_versions
;
