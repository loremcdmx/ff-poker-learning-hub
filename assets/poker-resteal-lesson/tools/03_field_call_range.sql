-- field_call_range.json source query
-- The actual HANDS with which the field CONTINUES (calls / re-jams) vs a hero resteal jam, by opener type.
-- P4-style join:
--   hero  = project hero jam hands (resteal all-in from the blinds) from analytics.int_tracker_hand_joined
--   opp   = the opener seat in that same hand (from analytics.stg_tracker__hand_stats) who faced the 3bet
--           and continued (preflop_face_3bet_action IN ('C','R'))
--   -> players (nickname/network) -> cats (category) ; holecard_id -> lookup_holecards (hand label)
-- Window: month_start_date 2026-01-01 .. 2026-06-01. Join on (hand_id, month_start_date).
-- hand_stats has exactly one row per hand_player_id in this window (no version dedup needed).
--
-- HERO RESTEAL SPOT: (is_sb OR is_bb) AND val_preflop_action_facing=4 AND (is_first_aggressor_co OR is_first_aggressor_btn)
--   AND cnt_preflop_face_limpers=0 AND preflop_effective_stack_size_bb 25..40 AND is_preflop_could_3bet=1 AND user_id NOT NULL
--   ; jam := preflop_action='R' AND is_preflop_allin=1.

WITH hero AS (
  SELECT DISTINCT hand_id, month_start_date AS msd, position AS hero_pos
  FROM analytics.int_tracker_hand_joined
  WHERE month_start_date BETWEEN '2026-01-01' AND '2026-06-01'
    AND (is_sb=1 OR is_bb=1)
    AND val_preflop_action_facing=4
    AND (is_first_aggressor_co=1 OR is_first_aggressor_btn=1)
    AND coalesce(cnt_preflop_face_limpers,0)=0
    AND preflop_effective_stack_size_bb BETWEEN 25 AND 40
    AND is_preflop_could_3bet=1
    AND user_id IS NOT NULL
    AND preflop_action='R'
    AND is_preflop_allin=1
),
opp AS (
  SELECT hs.tracker_player_id AS tpid,
         hs.holecard_id       AS holecard_id,
         hs.preflop_face_3bet_action AS act
  FROM analytics.stg_tracker__hand_stats hs
  INNER JOIN hero h ON hs.hand_id = h.hand_id AND hs.month_start_date = h.msd
  WHERE hs.is_preflop_face_3bet = 1
    AND hs.preflop_face_3bet_action IN ('C','R')
    AND hs.position != h.hero_pos
)
SELECT
  multiIf(c.horoshiy_reg=1,'good_reg', c.sredniy_reg=1,'mid_reg', c.slabiy_reg=1,'weak_reg',
          c.nit=1,'nit', c.aggro_fish=1,'aggro_fish', c.passivniy_fish=1,'passive_fish',
          c.polupassivniy_fish=1,'semipassive_fish', c.aggressivniy_i_neustupchiviy=1,'aggro_sticky',
          c.agressivniy_i_ustupchiviy=1,'aggro_foldy', 'unknown')  AS category,
  coalesce(lh.hole_cards, 'unknown')                               AS hand,
  opp.act                                                          AS act,
  count()                                                          AS c
FROM opp
LEFT JOIN analytics.stg_tracker__players p       ON opp.tpid = p.tracker_player_id
LEFT JOIN analytics.tracker_united_player_cats c ON p.network = c.network AND p.nickname = c.nickname
LEFT JOIN analytics.stg_tracker__lookup_holecards lh ON toInt64(opp.holecard_id) = lh.holecard_id
GROUP BY category, hand, act
ORDER BY category, c DESC;
