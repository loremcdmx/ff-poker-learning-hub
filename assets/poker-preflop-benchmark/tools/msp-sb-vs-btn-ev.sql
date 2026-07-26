/*
  MSP outcome evidence for the default SB-vs-BTN trainer spot.

  Exact spot:
    - 7-9max;
    - hero SB, BTN opens 1.8-2.25 BB, no limpers;
    - effective stack 18-25 BB;
    - rank-at-hand cohorts League 1 (ranks 1-5) and ranks 15-18;
    - frozen full-history window [2023-09-01, 2026-07-22), identical to
      msp-preflop-action-cube.sql.

  The metric is all-in-adjusted net BB per 100 opportunities in this exact
  preflop spot. It is not a player's global bb/100. The action-shape difference
  and the outcome gap coexist in the same observational slice; this query does
  not claim that extra calls causally explain the entire outcome gap.

  Published counts and rates are generated from this query by
  build-spot-ev-data.mjs; do not copy values between windows by hand.
*/

-- Rank bridge: reuse the exact full-rank CSV + metadata produced by
-- tools/msp-preflop-rank-bridge.sql for the action cube. Do not run a second
-- cohort-filtered BigQuery export for EV: readiness requires the two sources
-- to share one byte-identical rank bridge.
-- ClickHouse: replace {{RANK_INTERVAL_ROWS}} with the shared bridge tuples.
WITH rank_intervals AS (
  SELECT member_user_id, rang, valid_from, valid_to FROM values(
    'member_user_id Int32, rang Int32, valid_from DateTime, valid_to DateTime',
    {{RANK_INTERVAL_ROWS}}
  )
),
candidate_ids AS (
  -- Candidate ids only reduce the scan. Every spot predicate is repeated
  -- after argMax so an older qualifying tracker version cannot survive when
  -- the latest version no longer belongs to this exact spot.
  SELECT h.hand_player_id
  FROM analytics.int_tracker_hand_joined AS h
  PREWHERE h.user_id IN ({{RANK_USER_IDS}})
    AND h.month_start_date >= toDate('{{WINDOW_MONTH_START}}')
    AND h.month_start_date < toDate('{{WINDOW_MONTH_END_EXCLUSIVE}}')
  WHERE h.played_at >= toDateTime('{{WINDOW_START}}')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}}')
    AND h.hand_player_id IS NOT NULL
    AND h.cnt_players_lookup_position BETWEEN 7 AND 9
    AND h.position = 9
    AND h.preflop_aggressor_position = 0
    AND h.val_preflop_action_facing = 4
    AND toUInt8(coalesce(h.cnt_preflop_face_limpers, 0)) = 0
    AND h.preflop_2bet_and_blind_facing_amount_bb BETWEEN 1.8 AND 2.25
    AND h.preflop_effective_stack_size_bb >= 18
    AND h.preflop_effective_stack_size_bb < 25
  GROUP BY h.hand_player_id
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
    if(h.bb_amount > 0, coalesce(h.bet_bb_amount, 0) / h.bb_amount, 0),
    h.cnt_players_lookup_position,
    h.position,
    h.preflop_aggressor_position,
    h.val_preflop_action_facing,
    toUInt8(coalesce(h.cnt_preflop_face_limpers, 0)),
    h.preflop_2bet_and_blind_facing_amount_bb
  ), tuple(h.version, h.hand_player_id)) AS x
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN candidate_ids AS c USING (hand_player_id)
  INNER JOIN rank_intervals AS r ON h.user_id = r.member_user_id
  PREWHERE h.user_id IN ({{RANK_USER_IDS}})
    AND h.month_start_date >= toDate('{{WINDOW_MONTH_START}}')
    AND h.month_start_date < toDate('{{WINDOW_MONTH_END_EXCLUSIVE}}')
  WHERE h.played_at >= r.valid_from
    AND h.played_at < r.valid_to
    AND (r.rang BETWEEN 1 AND 5 OR r.rang BETWEEN 15 AND 18)
    AND h.played_at >= toDateTime('{{WINDOW_START}}')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}}')
  GROUP BY h.hand_player_id
),
filtered AS (
  SELECT x
  FROM latest
  WHERE x.11 BETWEEN 7 AND 9
    AND x.12 = 9
    AND x.13 = 0
    AND x.14 = 4
    AND x.15 = 0
    AND x.16 BETWEEN 1.8 AND 2.25
    AND x.8 >= 18
    AND x.8 < 25
    AND isNotNull(x.3)
    AND x.4 > 0
)
SELECT
  x.2 AS cohort,
  '__SPOT__' AS hand_class,
  count() AS opportunities,
  uniqExact(x.1) AS players,
  -- Private merge-only field. Time shards overlap players, so their uniqExact
  -- counts cannot be added. The local merger unions these ids exactly and
  -- drops the field; raw shard CSVs must stay outside the repository.
  arrayStringConcat(arrayMap(value -> toString(value), arraySort(groupUniqArray(x.1))), ';') AS private_player_ids,
  round(100 * avg(toFloat64(x.3) / toFloat64(x.4)), 2) AS spot_ev_bb_100,
  sum(toFloat64(x.3) / toFloat64(x.4)) AS ev_sum_bb,
  countIf(x.5 = 'F') AS folds,
  countIf(startsWith(ifNull(x.5, ''), 'C')) AS calls,
  countIf(startsWith(ifNull(x.5, ''), 'R') AND NOT (
    x.5 = 'R' AND (x.6 = 1 OR (isNotNull(x.9) AND x.9 - x.10 >= x.8 - 0.01))
  )) AS raises,
  countIf(x.5 = 'R' AND (
    x.6 = 1 OR (isNotNull(x.9) AND x.9 - x.10 >= x.8 - 0.01)
  )) AS jams,
  round(100 * countIf(x.5 = 'F') / count(), 1) AS fold_pct,
  round(100 * countIf(startsWith(ifNull(x.5, ''), 'C')) / count(), 1) AS call_pct,
  round(100 * countIf(startsWith(ifNull(x.5, ''), 'R') AND NOT (
    x.5 = 'R' AND (x.6 = 1 OR (isNotNull(x.9) AND x.9 - x.10 >= x.8 - 0.01))
  )) / count(), 1) AS raise_pct,
  round(100 * countIf(x.5 = 'R' AND (
    x.6 = 1 OR (isNotNull(x.9) AND x.9 - x.10 >= x.8 - 0.01)
  )) / count(), 1) AS jam_pct
FROM filtered
WHERE x.5 = 'F'
  OR startsWith(ifNull(x.5, ''), 'C')
  OR startsWith(ifNull(x.5, ''), 'R')
GROUP BY cohort
ORDER BY cohort, hand_class;
