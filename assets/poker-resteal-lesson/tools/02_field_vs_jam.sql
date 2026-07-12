-- field_vs_jam.json source query
-- Opener's reaction to a RESTEAL JAM (3bet all-in) from the blinds, by player type / opener position / stack band.
-- Source: analytics.int_tracker_hand_joined_for_opp_id (opponent seats).
-- We take the opener's clean opens (BTN/CO, is_rfi, raise <= 3bb) that then faced a 3bet whose size
--   (amt_preflop_3bet_facing normalized to bb via bb_amount) is 22..45 bb -> proxy for a 25-40bb resteal jam.
-- Effective-stack band fixed via preflop_effective_stack_size_bb 25..40.
-- fold_pct = is_preflop_fold_to_3bet ; continue_pct = 1 - fold_pct (call or re-jam; villain already all-in).
-- Window: month_start_date 2026-01-01 .. 2026-06-01.

SELECT
  category,
  position,
  multiIf(stack_bb<30,'25-30', stack_bb<35,'30-35','35-40') AS band,
  count()      AS n_faced,
  sum(is_fold) AS n_fold
FROM (
  SELECT
    o.position                                        AS position,
    o.preflop_effective_stack_size_bb                 AS stack_bb,
    toUInt8(coalesce(o.is_preflop_fold_to_3bet,0))    AS is_fold,
    multiIf(c.horoshiy_reg=1,'good_reg', c.sredniy_reg=1,'mid_reg', c.slabiy_reg=1,'weak_reg',
            c.nit=1,'nit', c.aggro_fish=1,'aggro_fish', c.passivniy_fish=1,'passive_fish',
            c.polupassivniy_fish=1,'semipassive_fish', c.aggressivniy_i_neustupchiviy=1,'aggro_sticky',
            c.agressivniy_i_ustupchiviy=1,'aggro_foldy', 'unknown')            AS category
  FROM analytics.int_tracker_hand_joined_for_opp_id o
  LEFT JOIN analytics.tracker_united_player_cats c
    ON o.network = c.network AND o.nickname = c.nickname
  WHERE o.month_start_date BETWEEN '2026-01-01' AND '2026-06-01'
    AND o.position IN (0,1)
    AND o.is_3_9_max = 1
    AND o.cnt_players >= 5
    AND o.is_rfi = 1
    AND o.preflop_raise_and_blind_made_amount_bb <= 3.0
    AND o.is_preflop_face_3bet = 1
    AND o.preflop_effective_stack_size_bb BETWEEN 25 AND 40
    AND (o.amt_preflop_3bet_facing / nullIf(o.bb_amount,0)) BETWEEN 22 AND 45
) t
GROUP BY category, position, band
ORDER BY category, position, band;
