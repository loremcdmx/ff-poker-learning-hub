-- RFI field-action extraction, refreshed 2026-07-22.
--
-- This is a two-source read-only extraction:
--   1. Run the BigQuery section and export its rows as the cohort-membership
--      snapshot. It is the canonical definition of the four displayed cohorts
--      used by the learner-facing comparison.
--   2. Render each membership row as ('cohort', user_id), replace
--      {{COHORT_MEMBERSHIP_TUPLES}}, replace {{UNIQUE_USER_IDS}} with the
--      distinct numeric user ids, and run the ClickHouse section.
--   3. Export the ClickHouse result as one four-cohort CSV. The browser build
--      publishes a stack/position state only when every one of the four
--      cohorts has all 169 hand classes with N >= 50.
--
-- FFEV is read from the canonical FFLK last-100k period. Do not recreate it
-- with AVG(), or with an ad-hoc tournament truncation. The source already
-- carries the validated twice-weighted EV result for that exact period.

-- -------------------------------------------------------------------------
-- BigQuery: current active-real cohorts and deterministic League 3 top 25%.
-- Dataset: analytics_mcp_readonly
-- -------------------------------------------------------------------------
WITH eligible AS (
  SELECT
    cu.user_id,
    cu.rang AS current_rank,
    cu.league AS current_league,
    ev.hand_count AS ffev_hands,
    ev.ev_2_weighted AS ffev
  FROM `analytics_mcp_readonly.mcp__check_users` AS cu
  JOIN `analytics_mcp_readonly.mcp__fflk_users` AS fu
    ON fu.user_id = cu.user_id
  JOIN `analytics_mcp_readonly.mcp__fflk_player_evs_by_period` AS ev
    ON ev.user_id = fu.fflk_user_id
  WHERE cu.is_active IS TRUE
    AND cu.is_real_player IS TRUE
    AND COALESCE(cu.is_kicked, FALSE) IS FALSE
    AND ev.period_type = 'last_100k_hands'
    AND ev.hand_count >= 30000
    AND ev.ev_2_weighted IS NOT NULL
),
top_ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (ORDER BY ffev DESC, user_id ASC) AS deterministic_rank,
    COUNT(*) OVER () AS eligible_players
  FROM eligible
  WHERE current_league = 3
),
memberships AS (
  SELECT
    CONCAT('l', CAST(current_league AS STRING)) AS cohort,
    user_id,
    current_rank,
    current_league,
    ffev_hands,
    ffev,
    COUNT(*) OVER (PARTITION BY current_league) AS cohort_selected_players
  FROM eligible
  WHERE current_league IN (1, 2, 3)

  UNION ALL

  SELECT
    'l3top' AS cohort,
    user_id,
    current_rank,
    current_league,
    ffev_hands,
    ffev,
    CAST(CEIL(eligible_players * 0.25) AS INT64) AS cohort_selected_players
  FROM top_ranked
  WHERE deterministic_rank <= CEIL(eligible_players * 0.25)

)
SELECT *
FROM memberships
ORDER BY cohort, user_id;

-- -------------------------------------------------------------------------
-- ClickHouse: observed unopened-pot actions, exact 7-max, full stable history.
-- Database: analytics
-- -------------------------------------------------------------------------
WITH members AS (
  SELECT
    tupleElement(member, 1) AS cohort,
    toInt32(tupleElement(member, 2)) AS member_user_id
  FROM (
    SELECT arrayJoin([{{COHORT_MEMBERSHIP_TUPLES}}]) AS member
  )
),
membership_counts AS (
  SELECT cohort, count() AS cohort_selected_players
  FROM members
  GROUP BY cohort
),
candidate_ids AS (
  -- Use the broad observed node only to find hand ids worth deduplicating.
  -- The same predicates are repeated after argMax below, so a superseded
  -- qualifying version can never survive when the latest row no longer
  -- belongs to the learner-facing spot.
  SELECT h.hand_player_id
  FROM {{SOURCE_TABLE}} AS h
  PREWHERE h.month_start_date >= toDate('{{WINDOW_START_MONTH}}')
    AND h.month_start_date < toDate('{{WINDOW_END_MONTH_EXCLUSIVE}}')
    AND h.user_id IN ({{UNIQUE_USER_IDS}})
  WHERE h.played_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
    AND h.hand_player_id IS NOT NULL
    AND h.cnt_players = 7
    AND toUInt8(coalesce(h.is_preflop_unopened, 0)) = 1
    AND h.position IN (0, 1, 2, 3, 4, 9)
    AND isNotNull(h.preflop_effective_stack_size_bb)
    AND h.preflop_effective_stack_size_bb > 0
    AND h.preflop_effective_stack_size_bb <= 200
  GROUP BY h.hand_player_id
),
latest_versions AS (
  SELECT
    argMax(tuple(
      h.user_id,
      h.played_at,
      h.cnt_players,
      h.cnt_players_lookup_position,
      h.position,
      {{HAND_CLASS_EXPRESSION}},
      h.preflop_effective_stack_size_bb,
      toUInt8(coalesce(h.is_preflop_unopened, 0)),
      toUInt8(coalesce(h.is_rfi, 0)),
      toUInt8(coalesce(h.is_preflop_allin, 0)),
      toUInt8(coalesce(h.is_preflop_limp, 0)),
      ifNull(h.preflop_action, ''),
      h.preflop_raise_and_blind_made_amount_bb,
      if(h.bb_amount > 0, coalesce(h.bet_bb_amount, 0) / h.bb_amount, 0)
    ), tuple(
      h.version,
      ifNull(toString(h.user_id), ''),
      ifNull(toString(h.played_at), ''),
      ifNull(toString(h.cnt_players), ''),
      ifNull(toString(h.cnt_players_lookup_position), ''),
      ifNull(toString(h.position), ''),
      toString(ifNull(h.network, '')),
      toString(ifNull(h.hh_id, '')),
      {{HAND_CLASS_EXPRESSION}},
      ifNull(toString(h.preflop_effective_stack_size_bb), ''),
      toString(toUInt8(coalesce(h.is_preflop_unopened, 0))),
      toString(toUInt8(coalesce(h.is_rfi, 0))),
      toString(toUInt8(coalesce(h.is_preflop_allin, 0))),
      toString(toUInt8(coalesce(h.is_preflop_limp, 0))),
      ifNull(h.preflop_action, ''),
      ifNull(toString(h.preflop_raise_and_blind_made_amount_bb), ''),
      if(
        h.bb_amount > 0,
        toString(coalesce(h.bet_bb_amount, 0) / h.bb_amount),
        '0'
      )
    )) AS x
  FROM {{SOURCE_TABLE}} AS h
  INNER JOIN candidate_ids AS c USING (hand_player_id)
  PREWHERE h.month_start_date >= toDate('{{WINDOW_START_MONTH}}')
    AND month_start_date < toDate('{{WINDOW_END_MONTH_EXCLUSIVE}}')
    AND h.user_id IN ({{UNIQUE_USER_IDS}})
  WHERE h.played_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
  GROUP BY h.hand_player_id
),
latest AS (
  SELECT x
  FROM latest_versions
  WHERE x.3 = 7
    AND x.8 = 1
    AND x.5 IN (0, 1, 2, 3, 4, 9)
    AND isNotNull(x.7)
    AND x.7 > 0
    AND x.7 <= 200
),
classified AS (
  SELECT
    m.cohort,
    x.1 AS uid,
    x.2 AS played_ts,
    x.3 AS actual_players,
    x.4 AS lookup_players,
    x.5 AS pos,
    x.6 AS hand_class,
    x.7 AS stackbb,
    x.8 AS unopened,
    x.9 AS rfi,
    x.10 AS allin,
    x.11 AS limped,
    x.12 AS preflop_actions,
    x.13 AS raise_and_blind_bb,
    x.14 AS posted_blind_bb,
    multiIf(
      pos = 4, 'EP',
      pos = 3, 'MP',
      pos = 2, 'HJ',
      pos = 1, 'CO',
      pos = 0, 'BTN',
      pos = 9, 'SB',
      ''
    ) AS position_group,
    multiIf(
      pos = 4, 1,
      pos = 3, 2,
      pos = 2, 3,
      pos = 1, 4,
      pos = 0, 5,
      pos = 9, 6,
      0
    ) AS position_order,
    multiIf(
      stackbb >= 70, '70+',
      stackbb >= 30, '30-70',
      stackbb >= 20, '20-30',
      stackbb >= 15, '15-20',
      stackbb >= 12, '12-15',
      stackbb >= 10, '10-12',
      stackbb >= 8, '8-10',
      stackbb >= 6, '6-8',
      '<6'
    ) AS stack_bucket,
    multiIf(
      stackbb >= 70, 1,
      stackbb >= 30, 2,
      stackbb >= 20, 3,
      stackbb >= 15, 4,
      stackbb >= 12, 5,
      stackbb >= 10, 6,
      stackbb >= 8, 7,
      stackbb >= 6, 8,
      9
    ) AS stack_order
  FROM latest
  INNER JOIN members AS m ON x.1 = m.member_user_id
),
actions AS (
  SELECT
    *,
    -- `is_preflop_allin` misses effective all-ins when Hero covers a shorter
    -- opponent. The tracker amount includes Hero's posted blind, so subtract
    -- that blind before comparing the first raise with the effective stack.
    multiIf(
      preflop_actions = 'R' AND (
        allin = 1 OR (
          isNotNull(raise_and_blind_bb)
          AND raise_and_blind_bb - posted_blind_bb >= stackbb - 0.01
        )
      ), 'shove',
      startsWith(preflop_actions, 'R'), 'raise',
      limped = 1 OR startsWith(preflop_actions, 'C'), 'limp',
      preflop_actions = 'F', 'fold',
      'other'
    ) AS action_class
  FROM classified
)
SELECT
  toString(toDate('{{WINDOW_START_INCLUSIVE}}')) AS window_start,
  toString(toDate('{{WINDOW_THROUGH}}')) AS window_end,
  'cnt_players = 7' AS table_filter,
  toUInt8(7) AS table_size,
  c.cohort AS cohort,
  any(mc.cohort_selected_players) AS cohort_selected_players,
  c.position_group AS position_group,
  c.position_order AS position_order,
  c.pos AS position_code,
  c.stack_bucket AS stack_bucket,
  c.stack_order AS stack_order,
  c.hand_class AS hand_class,
  sum(count()) OVER state_window AS eligible_opportunities,
  sum(if(c.hand_class != '', count(), 0)) OVER state_window AS known_card_opportunities,
  sum(countIf(c.lookup_players != 7)) OVER state_window AS lookup_mismatch_opportunities,
  toString(min(min(c.played_ts)) OVER state_window) AS first_observed_at,
  toString(max(max(c.played_ts)) OVER state_window) AS last_observed_at,
  count() AS opportunities,
  countIf(action_class IN ('raise', 'shove')) AS raises_total,
  countIf(action_class = 'raise') AS regular_raise,
  countIf(action_class = 'shove') AS open_shove,
  countIf(action_class = 'limp') AS limp,
  countIf(action_class IN ('fold', 'other')) AS fold_other,
  countIf(action_class = 'shove' AND allin = 1) AS shove_allin_flag,
  countIf(
    action_class = 'shove'
    AND allin = 0
    AND isNotNull(raise_and_blind_bb)
    AND raise_and_blind_bb - posted_blind_bb >= stackbb - 0.01
  ) AS shove_effective_amount_only,
  countIf(
    action_class = 'raise'
    AND isNotNull(raise_and_blind_bb)
    AND raise_and_blind_bb - posted_blind_bb BETWEEN 2.5 AND 3.5
    AND stackbb > raise_and_blind_bb - posted_blind_bb + 0.01
  ) AS regular_three_bb_open,
  countIf(
    action_class = 'shove'
    AND allin = 0
    AND isNotNull(raise_and_blind_bb)
    AND raise_and_blind_bb - posted_blind_bb BETWEEN 2.5 AND 3.5
    AND stackbb > raise_and_blind_bb - posted_blind_bb + 0.01
  ) AS normal_three_bb_as_shove,
  countIf(
    preflop_actions != 'R'
    AND startsWith(preflop_actions, 'R')
    AND (
      allin = 1 OR (
        isNotNull(raise_and_blind_bb)
        AND raise_and_blind_bb - posted_blind_bb >= stackbb - 0.01
      )
    )
  ) AS non_exact_r_effective_allin,
  round(100.0 * countIf(action_class IN ('raise', 'shove')) / count(), 3) AS raise_total_pct,
  round(100.0 * countIf(action_class = 'raise') / count(), 3) AS regular_raise_pct,
  round(100.0 * countIf(action_class = 'shove') / count(), 3) AS open_shove_pct,
  round(100.0 * countIf(action_class = 'limp') / count(), 3) AS limp_pct,
  round(100.0 * countIf(action_class IN ('fold', 'other')) / count(), 3) AS fold_pct,
  toUInt8(count() < 50) AS below_exact_minimum,
  toUInt8(count() < 100) AS low_sample
FROM actions AS c
INNER JOIN membership_counts AS mc ON c.cohort = mc.cohort
GROUP BY c.cohort, c.position_group, c.position_order, position_code, c.stack_bucket, c.stack_order, c.hand_class
WINDOW state_window AS (
  PARTITION BY c.cohort, c.position_group, c.position_order, position_code, c.stack_bucket, c.stack_order
)
ORDER BY c.cohort, stack_order, position_order, hand_class;
