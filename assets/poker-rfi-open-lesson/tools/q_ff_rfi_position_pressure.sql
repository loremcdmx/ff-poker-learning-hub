-- Observed FF outcomes after an RFI by exact 7-max position.
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
    argMax(is_preflop_face_3bet, version) AS faced_3bet,
    argMax(is_saw_flop, version) AS saw_flop
  FROM analytics.int_tracker_hand_joined
  PREWHERE month_start_date >= toDate('2026-01-01')
    AND month_start_date < toDate('2026-08-01')
  WHERE played_at >= toDateTime('2026-01-01 00:00:00')
    AND played_at < toDateTime('2026-07-12 00:00:00')
    AND user_id IN ({{COHORT_IDS}})
  GROUP BY network, tourney_id, hand_id, hand_player_id
)
SELECT
  pos AS position,
  multiIf(pos = 4, 'EP', pos = 3, 'MP', pos = 2, 'HJ', pos = 1, 'CO', pos = 0, 'BTN', pos = 9, 'SB', '?') AS position_label,
  multiIf(pos = 4, 6, pos = 3, 5, pos = 2, 4, pos = 1, 3, pos = 0, 2, pos = 9, 1, 0) AS players_behind,
  uniqExact(uid) AS players,
  count() AS rfi_opportunities,
  countIf(rfi = 1) AS opens,
  countIf(rfi = 1 AND ifNull(faced_3bet, 0) != 1 AND ifNull(saw_flop, 0) != 1) AS everyone_folded,
  round(100.0 * everyone_folded / opens, 4) AS everyone_folded_pct,
  countIf(rfi = 1 AND faced_3bet = 1) AS faced_3bet_count,
  round(100.0 * faced_3bet_count / opens, 4) AS faced_3bet_pct,
  countIf(cntp_position != 7) AS position_lookup_mismatch,
  min(played_ts) AS first_hand,
  max(played_ts) AS last_hand
FROM dedup
WHERE cntp_actual = 7
  AND unopened = 1
  AND stackbb >= 15
  AND bb > 0
  AND isNotNull(hand_class)
  AND hand_class != ''
  AND pos IN (4, 3, 2, 1, 0, 9)
GROUP BY pos
ORDER BY players_behind DESC;
