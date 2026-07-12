-- field_opens.json source query
-- "Clean open" behavior of REAL opponents by player type, opener position (BTN=0, CO=1), and stack band.
-- Source: analytics.int_tracker_hand_joined_for_opp_id (1 row = one observed opponent seat in a hand).
-- Cleanliness = opener's OWN stack 25-40bb (no short-stack layer behind), 5+ handed, pot unopened to them.
-- One scan of stack>=25 with a 'gt40' band lets us derive both the 25-40 breakdown and the pooled >=25 view.
-- Window: month_start_date 2026-01-01 .. 2026-06-01 (6 monthly partitions).
--
-- open_any    = is_rfi=1
-- open_clean  = is_rfi=1 AND raise made <= 3.0 bb
-- open_jam    = is_rfi=1 AND (raise made >= 10 bb OR raise made >= 85% of opener stack)
-- size mix (among is_rfi): le2.2 / 2.2-3 / 3-10 / gt10 (in bb of raise+blind made amount)
-- limp        = is_preflop_limp=1
-- Category via multiIf priority (booleans are mutually exclusive; 18/1.5M multi-cat rows resolved by priority,
--   2153 zero-cat rows fall through to 'unknown'). cats join is 1:1 on (network, nickname).

SELECT
  category,
  position,
  multiIf(stack_bb<30,'25-30', stack_bb<35,'30-35', stack_bb<=40,'35-40','gt40') AS band,
  count()                                                                      AS n_opp,
  sum(is_rfi)                                                                  AS open_any,
  countIf(is_rfi=1 AND raise_bb<=3.0)                                          AS open_clean,
  countIf(is_rfi=1 AND (raise_bb>=10 OR raise_bb>=0.85*stack_bb))              AS open_jam,
  countIf(is_rfi=1 AND raise_bb<=2.2)                                          AS sz_le22,
  countIf(is_rfi=1 AND raise_bb>2.2 AND raise_bb<=3.0)                         AS sz_22_3,
  countIf(is_rfi=1 AND raise_bb>3.0 AND raise_bb<10)                           AS sz_3_10,
  countIf(is_rfi=1 AND raise_bb>=10)                                           AS sz_gt10,
  sum(is_limp)                                                                 AS limp
FROM (
  SELECT
    o.position                                        AS position,
    toUInt8(coalesce(o.is_rfi,0))                     AS is_rfi,
    toUInt8(coalesce(o.is_preflop_limp,0))            AS is_limp,
    o.preflop_raise_and_blind_made_amount_bb          AS raise_bb,
    o.stack_size_bb                                   AS stack_bb,
    multiIf(c.horoshiy_reg=1,'good_reg', c.sredniy_reg=1,'mid_reg', c.slabiy_reg=1,'weak_reg',
            c.nit=1,'nit', c.aggro_fish=1,'aggro_fish', c.passivniy_fish=1,'passive_fish',
            c.polupassivniy_fish=1,'semipassive_fish', c.aggressivniy_i_neustupchiviy=1,'aggro_sticky',
            c.agressivniy_i_ustupchiviy=1,'aggro_foldy', 'unknown')            AS category
  FROM analytics.int_tracker_hand_joined_for_opp_id o
  LEFT JOIN analytics.tracker_united_player_cats c
    ON o.network = c.network AND o.nickname = c.nickname
  WHERE o.month_start_date BETWEEN '2026-01-01' AND '2026-06-01'
    AND o.position IN (0,1)          -- BTN, CO
    AND o.is_3_9_max = 1
    AND o.cnt_players >= 5
    AND o.is_preflop_unopened = 1    -- had the right to open
    AND o.stack_size_bb >= 25        -- opener stack (cleanliness); band 'gt40' captured for pooled >=25
) t
GROUP BY category, position, band
ORDER BY category, position, band;
