/*
  Strict observed response of the original CO/BTN opener to Hero's direct
  resteal jam from SB/BB.

  Window: [2026-01-01 00:00:00, 2026-07-17 00:00:00).
  Spot: one CO/BTN first aggressor, no limpers, Hero SB/BB can 3-bet, effective
  stack 25–40 BB, open 2/2.5/3 BB, Hero action is a direct all-in raise.

  Identity and execution contract:
  - select the latest source version first, then apply business filters;
  - carry tourney_id + hand_id + month_start_date + hero_hand_player_id;
  - select exactly the original opener seat;
  - deduplicate player/category/lookup dimensions before joining;
  - collapse to one row per Hero jam before calculating global controls;
  - reference every heavy latest-first CTE only once and spill large GROUP BYs
    to disk so the full-window export stays inside ClickHouse memory limits.
*/
WITH
hero_versions AS
(
  SELECT
    hand_player_id AS hero_hand_player_id,
    argMax(
      tuple(
        network,
        tourney_id,
        hand_id,
        month_start_date,
        played_at,
        toUInt8(coalesce(is_sb, 0)),
        toUInt8(coalesce(is_bb, 0)),
        toUInt8(coalesce(is_first_aggressor_co, 0)),
        toUInt8(coalesce(is_first_aggressor_btn, 0)),
        val_preflop_action_facing,
        coalesce(cnt_preflop_face_limpers, 0),
        preflop_effective_stack_size_bb,
        preflop_2bet_and_blind_facing_amount_bb,
        cnt_players,
        toUInt8(coalesce(is_preflop_could_3bet, 0)),
        user_id,
        preflop_action,
        toUInt8(coalesce(is_preflop_allin, 0))
      ),
      version
    ) AS x
  FROM analytics.int_tracker_hand_joined
  WHERE month_start_date >= toDate('2026-01-01')
    AND month_start_date < toDate('2026-08-01')
    AND hand_player_id IS NOT NULL
  GROUP BY hand_player_id
),
hero AS
(
  SELECT
    hero_hand_player_id,
    x.1 AS network,
    x.2 AS tourney_id,
    x.3 AS hand_id,
    x.4 AS month_start_date,
    x.5 AS played_at,
    if(x.7 = 1, 'BB', 'SB') AS hero_position,
    if(x.9 = 1, 0, 1) AS opener_position_id,
    x.12 AS effective_stack_bb,
    x.13 AS open_size_bb,
    x.14 AS cnt_players
  FROM hero_versions
  WHERE x.5 >= toDateTime('2026-01-01 00:00:00')
    AND x.5 < toDateTime('2026-07-17 00:00:00')
    AND (x.6 = 1 OR x.7 = 1)
    AND x.10 = 4
    AND (x.8 = 1 OR x.9 = 1)
    AND x.11 = 0
    AND x.12 BETWEEN 25 AND 40
    AND x.15 = 1
    AND x.16 IS NOT NULL
    AND x.17 = 'R'
    AND x.18 = 1
    AND x.14 BETWEEN 3 AND 9
    AND (
      abs(x.13 - 2.0) <= 0.05
      OR abs(x.13 - 2.5) <= 0.05
      OR abs(x.13 - 3.0) <= 0.05
    )
    AND x.2 IS NOT NULL
    AND x.3 IS NOT NULL
    AND x.1 IS NOT NULL
    AND x.1 != ''
),
hand_stats_version_rows AS
(
  SELECT
    hand_player_id AS opener_hand_player_id,
    argMax(
      tuple(
        tourney_id,
        hand_id,
        month_start_date,
        position,
        tracker_player_id,
        holecard_id,
        preflop_face_3bet_action,
        toUInt8(coalesce(is_preflop_face_3bet, 0))
      ),
      version
    ) AS x
  FROM analytics.stg_tracker__hand_stats
  WHERE month_start_date >= toDate('2026-01-01')
    AND month_start_date < toDate('2026-08-01')
    AND hand_player_id IS NOT NULL
  GROUP BY hand_player_id
),
hand_stats_latest AS
(
  SELECT
    opener_hand_player_id,
    x.1 AS tourney_id,
    x.2 AS hand_id,
    x.3 AS month_start_date,
    x.4 AS position,
    x.5 AS tracker_player_id,
    x.6 AS holecard_id,
    x.7 AS response_action,
    x.8 AS faced_3bet,
    toUInt8(1) AS matched_marker
  FROM hand_stats_version_rows
),
per_hero AS
(
  SELECT
    h.hero_hand_player_id,
    h.network,
    h.tourney_id,
    h.hand_id,
    h.month_start_date,
    h.played_at,
    h.hero_position,
    h.opener_position_id,
    h.effective_stack_bb,
    h.open_size_bb,
    h.cnt_players,
    countIf(hs.matched_marker = 1) AS response_rows,
    anyIf(hs.opener_hand_player_id, hs.matched_marker = 1) AS opener_hand_player_id,
    anyIf(hs.tracker_player_id, hs.matched_marker = 1) AS tracker_player_id,
    anyIf(hs.holecard_id, hs.matched_marker = 1) AS holecard_id,
    anyIf(hs.response_action, hs.matched_marker = 1) AS response_action
  FROM hero AS h
  LEFT JOIN hand_stats_latest AS hs
    ON hs.tourney_id = h.tourney_id
   AND hs.hand_id = h.hand_id
   AND hs.month_start_date = h.month_start_date
   AND hs.position = h.opener_position_id
   AND hs.faced_3bet = 1
   AND hs.response_action IN ('F', 'C', 'R')
  GROUP BY
    h.hero_hand_player_id,
    h.network,
    h.tourney_id,
    h.hand_id,
    h.month_start_date,
    h.played_at,
    h.hero_position,
    h.opener_position_id,
    h.effective_stack_bb,
    h.open_size_bb,
    h.cnt_players
),
controlled AS
(
  SELECT
    *,
    count() OVER () AS hero_jams_total,
    sum(response_rows) OVER () AS matched_opener_responses_total,
    sum(toUInt8(response_rows > 0)) OVER () AS matched_unique_hero_jams_total,
    max(response_rows) OVER () AS max_responses_per_hero_jam
  FROM per_hero
),
matched AS
(
  SELECT *
  FROM controlled
  WHERE response_rows = 1
),
players AS
(
  SELECT
    source.tracker_player_id AS player_id,
    any(source.network) AS network,
    any(source.nickname) AS nickname
  FROM analytics.stg_tracker__players AS source
  GROUP BY source.tracker_player_id
),
categories AS
(
  SELECT
    network,
    nickname,
    max(toUInt8(coalesce(horoshiy_reg, 0))) AS horoshiy_reg,
    max(toUInt8(coalesce(sredniy_reg, 0))) AS sredniy_reg,
    max(toUInt8(coalesce(slabiy_reg, 0))) AS slabiy_reg,
    max(toUInt8(coalesce(nit, 0))) AS nit,
    max(toUInt8(coalesce(aggro_fish, 0))) AS aggro_fish,
    max(toUInt8(coalesce(passivniy_fish, 0))) AS passivniy_fish,
    max(toUInt8(coalesce(polupassivniy_fish, 0))) AS polupassivniy_fish,
    max(toUInt8(coalesce(aggressivniy_i_neustupchiviy, 0))) AS aggressivniy_i_neustupchiviy,
    max(toUInt8(coalesce(agressivniy_i_ustupchiviy, 0))) AS agressivniy_i_ustupchiviy
  FROM analytics.tracker_united_player_cats
  GROUP BY network, nickname
),
holecards AS
(
  SELECT holecard_id, any(hole_cards) AS hole_cards
  FROM analytics.stg_tracker__lookup_holecards
  GROUP BY holecard_id
),
classified AS
(
  SELECT
    multiIf(
      c.horoshiy_reg = 1, 'good_reg',
      c.sredniy_reg = 1, 'mid_reg',
      c.slabiy_reg = 1, 'weak_reg',
      c.nit = 1, 'nit',
      c.aggro_fish = 1, 'aggro_fish',
      c.passivniy_fish = 1, 'passive_fish',
      c.polupassivniy_fish = 1, 'semipassive_fish',
      c.aggressivniy_i_neustupchiviy = 1, 'aggro_sticky',
      c.agressivniy_i_ustupchiviy = 1, 'aggro_foldy',
      'unknown'
    ) AS category,
    if(o.opener_position_id = 0, 'BTN', 'CO') AS opener_position,
    o.hero_position,
    multiIf(
      abs(o.open_size_bb - 2.0) <= 0.05, '2.0',
      abs(o.open_size_bb - 2.5) <= 0.05, '2.5',
      '3.0'
    ) AS open_size_bb,
    multiIf(o.effective_stack_bb < 30, '25-30', o.effective_stack_bb < 35, '30-35', '35-40') AS depth_band,
    o.response_action,
    coalesce(nullIf(lh.hole_cards, ''), 'unknown') AS hand,
    o.hero_hand_player_id,
    o.tracker_player_id,
    o.played_at,
    o.hero_jams_total,
    o.matched_opener_responses_total,
    o.matched_unique_hero_jams_total,
    o.max_responses_per_hero_jam
  FROM matched AS o
  LEFT JOIN players AS p ON o.tracker_player_id = p.player_id
  LEFT JOIN categories AS c ON p.network = c.network AND p.nickname = c.nickname
  LEFT JOIN holecards AS lh ON toInt64(o.holecard_id) = lh.holecard_id
)
SELECT
  category,
  opener_position,
  hero_position,
  open_size_bb,
  depth_band,
  response_action,
  hand,
  count() AS response_count,
  uniqExact(hero_hand_player_id) AS unique_hands,
  uniqExact(tracker_player_id) AS unique_opponents,
  min(played_at) AS first_hand_at,
  max(played_at) AS last_hand_at,
  any(hero_jams_total) AS hero_jams_total,
  any(matched_opener_responses_total) AS matched_opener_responses_total,
  any(matched_unique_hero_jams_total) AS matched_unique_hero_jams_total,
  any(max_responses_per_hero_jam) AS max_responses_per_hero_jam
FROM classified
GROUP BY category, opener_position, hero_position, open_size_bb, depth_band, response_action, hand
ORDER BY category, opener_position, hero_position, open_size_bb, depth_band, response_action, hand;
