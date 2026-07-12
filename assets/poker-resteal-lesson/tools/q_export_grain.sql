-- Resteal hero-outcomes: per-(user, month) aggregated grain over the RAW resteal spot.
-- No user-id lists embedded here (safe/exact): rank-group membership is attached in Python
-- from the per-month userlist files. RAW spot = the verified resteal definition WITHOUT
-- the could_3bet / open<=3.0 refinement (those are carried as grain flags could3 / open_bucket
-- so both the CLEAN subset and the cleanup waterfall can be derived downstream).
-- Window: 2026-01-01 .. 2026-06-01 (six monthly partitions).
SELECT
  user_id,
  month_start_date,
  multiIf(
    holecards_str IS NULL, 'unknown',
    has(['22','33','44','55','66'], holecards_str), 'pair_22_66',
    has(['77','88','99'], holecards_str), 'pair_77_99',
    has(['TT','JJ','QQ','KK','AA'], holecards_str), 'pair_TT_plus',
    has(['ATo','AJo','AQo','AKo','ATs','AJs','AQs','AKs'], holecards_str), 'ax_strong',
    has(['A2s','A2o','A3s','A3o','A4s','A4o','A5s','A5o','A6s','A6o','A7s','A7o','A8s','A8o','A9s','A9o'], holecards_str), 'ax_weak',
    has(['KQs','KJs','KTs','QJs','QTs','JTs'], holecards_str), 'broadway_suited',
    has(['KQo','KJo','KTo','QJo','QTo','JTo'], holecards_str), 'broadway_offsuit',
    has(['T9s','98s','87s','76s','65s','54s'], holecards_str), 'suited_conn_low',
    'other') AS hand_category,
  multiIf(preflop_action='R' AND is_preflop_allin=1,'jam',
          substring(preflop_action,1,1)='C','call',
          substring(preflop_action,1,1)='R','r3small',
          preflop_action='F','fold','other') AS action,
  multiIf(preflop_effective_stack_size_bb<30,'e25_30',preflop_effective_stack_size_bb<35,'e30_35','e35_40') AS band,
  toUInt8(coalesce(is_preflop_could_3bet,0)) AS could3,
  multiIf(preflop_2bet_and_blind_facing_amount_bb<=2.2,'le22',
          preflop_2bet_and_blind_facing_amount_bb<=3.0,'le30','gt30') AS open_bucket,
  toUInt8(coalesce(is_first_aggressor_btn,0)) AS opener_btn,
  toUInt8(coalesce(is_bb,0)) AS hero_bb,
  count() AS n,
  round(sum(chips_won / bb_amount), 6) AS sum_won_bb,
  round(sum(chips_ev / bb_amount), 6) AS sum_ev_bb,
  sum(toUInt8(coalesce(is_showdown, false))) AS sum_showdown,
  sum(toUInt8(coalesce(is_won_hand, false))) AS sum_won_hand,
  countIf(chips_before_player IS NOT NULL AND bb_amount > 0) AS n_stack,
  sumIf(toUInt8((chips_before_player + chips_won) / bb_amount < 0.75), chips_before_player IS NOT NULL AND bb_amount > 0) AS sum_bust,
  round(sumIf((chips_before_player + chips_won) / bb_amount, chips_before_player IS NOT NULL AND bb_amount > 0), 6) AS sum_stack_after_bb,
  round(sumIf(chips_before_player / bb_amount, chips_before_player IS NOT NULL AND bb_amount > 0), 6) AS sum_before_bb,
  round(sum(preflop_2bet_and_blind_facing_amount_bb), 6) AS sum_open_bb,
  countIf(cnt_players IS NOT NULL AND ante_amount IS NOT NULL AND bb_amount > 0) AS n_ante,
  round(sumIf(cnt_players * ante_amount / bb_amount, cnt_players IS NOT NULL AND ante_amount IS NOT NULL AND bb_amount > 0), 6) AS sum_ante_total_bb,
  round(sumIf(ante_amount / bb_amount, ante_amount IS NOT NULL AND bb_amount > 0), 6) AS sum_ante_player_bb,
  sumIf(cnt_players, cnt_players IS NOT NULL) AS sum_cnt_players,
  countIf(cnt_players IS NOT NULL) AS n_cnt
FROM analytics.int_tracker_hand_joined
WHERE month_start_date IN ('2026-01-01','2026-02-01','2026-03-01','2026-04-01','2026-05-01','2026-06-01')
  AND (is_sb = 1 OR is_bb = 1)
  AND val_preflop_action_facing = 4
  AND (is_first_aggressor_co = 1 OR is_first_aggressor_btn = 1)
  AND coalesce(cnt_preflop_face_limpers, 0) = 0
  AND preflop_effective_stack_size_bb BETWEEN 25 AND 40
  AND user_id IS NOT NULL
GROUP BY user_id, month_start_date, hand_category, action, band, could3, open_bucket, opener_btn, hero_bb
