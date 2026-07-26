-- Observed FF outcomes after a non-all-in RFI by exact 7-max position.
-- Replace {{COHORT_IDS}} with the 1,131 IDs from the July 12 active-real League 3 snapshot.
WITH dedup AS (
  SELECT
    network,
    tourney_id,
    hand_id,
    hand_player_id,
    argMax(user_id, version) AS uid,
    argMax(played_at, version) AS played_ts,
    argMax(cnt_players_lookup_position, version) AS cntp_position,
    argMax(cnt_players, version) AS cntp_actual,
    argMax(position, version) AS pos,
    argMax(stack_size_bb, version) AS stackbb,
    argMax(bb_amount, version) AS bb,
    argMax(holecards_str, version) AS hand_class,
    argMax(is_preflop_unopened, version) AS unopened,
    argMax(is_rfi, version) AS rfi,
    argMax(is_preflop_allin, version) AS allin,
    argMax(preflop_action, version) AS preflop_actions,
    argMax(is_preflop_face_3bet, version) AS faced_3bet,
    argMax(is_preflop_face_4bet, version) AS faced_4bet,
    argMax(cnt_flop_players, version) AS flop_players,
    argMax(is_saw_flop, version) AS saw_flop
  FROM analytics.int_tracker_hand_joined
  PREWHERE month_start_date >= toDate('2026-01-01')
    AND month_start_date < toDate('2026-08-01')
  WHERE played_at >= toDateTime('2026-01-01 00:00:00')
    AND played_at < toDateTime('2026-07-12 00:00:00')
    AND user_id IN ({{COHORT_IDS}})
  GROUP BY network, tourney_id, hand_id, hand_player_id
),
base AS (
  SELECT
    *,
    (rfi = 1 AND ifNull(allin, 0) = 1 AND ifNull(preflop_actions, '') = 'R') AS direct_open_shove,
    (rfi = 1 AND NOT(ifNull(allin, 0) = 1 AND ifNull(preflop_actions, '') = 'R')) AS regular_open
  FROM dedup
  WHERE cntp_actual = 7
    AND unopened = 1
    AND stackbb >= 30
    AND bb > 0
    AND isNotNull(hand_class)
    AND hand_class != ''
    AND pos IN (4, 3, 2, 1, 0, 9)
)
SELECT
  pos AS position,
  multiIf(pos = 4, 'EP', pos = 3, 'MP', pos = 2, 'HJ', pos = 1, 'CO', pos = 0, 'BTN', pos = 9, 'SB', '?') AS position_label,
  multiIf(pos = 4, 6, pos = 3, 5, pos = 2, 4, pos = 1, 3, pos = 0, 2, pos = 9, 1, 0) AS players_behind,
  uniqExact(uid) AS players,
  count() AS rfi_opportunities,
  countIf(rfi = 1) AS rfi_including_shoves,
  countIf(direct_open_shove) AS excluded_open_shoves,
  countIf(regular_open) AS regular_opens,
  -- Strict fold-through: the opener made no second preflop action and the hand ended before a flop.
  countIf(
    regular_open
    AND preflop_actions = 'R'
    AND ifNull(flop_players, 0) = 0
  ) AS fold_through_count,
  round(100.0 * fold_through_count / regular_opens, 4) AS fold_through_pct,
  -- For an RFI opener, either tracker flag means that another player reraised the open.
  countIf(
    regular_open
    AND (ifNull(faced_3bet, 0) = 1 OR ifNull(faced_4bet, 0) = 1)
  ) AS reraised_count,
  round(100.0 * reraised_count / regular_opens, 4) AS reraised_pct,
  -- Diagnostics retained for exact reconciliation with the previously published proxy.
  countIf(
    regular_open
    AND ifNull(faced_3bet, 0) != 1
    AND ifNull(saw_flop, 0) != 1
  ) AS old_proxy_count,
  round(100.0 * old_proxy_count / regular_opens, 4) AS old_proxy_pct,
  countIf(
    regular_open
    AND ifNull(faced_3bet, 0) != 1
    AND ifNull(saw_flop, 0) != 1
    AND NOT(preflop_actions = 'R' AND ifNull(flop_players, 0) = 0)
  ) AS old_proxy_false_positive_count,
  countIf(
    regular_open
    AND ifNull(faced_3bet, 0) != 1
    AND ifNull(saw_flop, 0) != 1
    AND preflop_actions = 'RF'
    AND ifNull(faced_4bet, 0) = 1
  ) AS old_proxy_rf_face4_count,
  countIf(cntp_position != 7) AS position_lookup_mismatch,
  min(played_ts) AS first_hand,
  max(played_ts) AS last_hand
FROM base
GROUP BY pos
ORDER BY players_behind DESC;
