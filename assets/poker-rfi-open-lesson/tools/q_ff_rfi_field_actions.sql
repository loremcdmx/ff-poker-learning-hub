-- RFI field-action extraction, refreshed 2026-07-18.
--
-- This is a two-source read-only extraction:
--   1. Run the BigQuery section and export its rows as the cohort-membership
--      snapshot. It is the canonical definition of the four displayed cohorts
--      and the all-eligible League 3 R11-14 prior.
--   2. Render each membership row as ('cohort', user_id), replace
--      {{COHORT_MEMBERSHIP_TUPLES}}, replace {{UNIQUE_USER_IDS}} with the
--      distinct numeric user ids, and run the ClickHouse section.
--   3. Split ClickHouse rows with cohort=l3_r11_14_eligible into the prior CSV;
--      the remaining l1/l2/l3/l3top rows form the four-cohort CSV.
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
  WHERE current_rank BETWEEN 11 AND 14
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

  UNION ALL

  SELECT
    'l3prior' AS cohort,
    user_id,
    current_rank,
    current_league,
    ffev_hands,
    ffev,
    eligible_players AS cohort_selected_players
  FROM top_ranked
)
SELECT *
FROM memberships
ORDER BY cohort, user_id;

-- -------------------------------------------------------------------------
-- ClickHouse: observed unopened-pot actions, 7-9 handed, through 2026-07-16.
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
dedup AS (
  SELECT
    network,
    tourney_id,
    hand_id,
    hand_player_id,
    argMax(user_id, version) AS uid,
    argMax(played_at, version) AS played_ts,
    argMax(cnt_players_lookup_position, version) AS cntp,
    argMax(position, version) AS pos,
    argMax(holecards_str, version) AS hand_class,
    argMax(preflop_effective_stack_size_bb, version) AS stackbb,
    argMax(is_preflop_unopened, version) AS unopened,
    argMax(is_rfi, version) AS rfi,
    argMax(is_preflop_allin, version) AS allin,
    argMax(is_preflop_limp, version) AS limped,
    argMax(preflop_action, version) AS preflop_actions
  FROM analytics.int_tracker_hand_joined
  PREWHERE month_start_date >= toDate('2025-10-01')
    AND month_start_date < toDate('2026-08-01')
  WHERE analytics.int_tracker_hand_joined.played_at >= toDateTime('2025-10-01 00:00:00')
    AND analytics.int_tracker_hand_joined.played_at < toDateTime('2026-07-17 00:00:00')
    AND user_id IN ({{UNIQUE_USER_IDS}})
  GROUP BY network, tourney_id, hand_id, hand_player_id
),
classified AS (
  SELECT
    m.cohort,
    d.*,
    multiIf(
      pos IN (5, 6, 7), 'EP',
      pos IN (3, 4), 'MP',
      pos = 2, 'HJ',
      pos = 1, 'CO',
      pos = 0, 'BTN',
      pos = 9, 'SB',
      ''
    ) AS position_group,
    multiIf(
      pos IN (5, 6, 7), 1,
      pos IN (3, 4), 2,
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
  FROM dedup AS d
  INNER JOIN members AS m ON d.uid = m.member_user_id
  WHERE cntp BETWEEN 7 AND 9
    AND unopened = 1
    AND pos IN (0, 1, 2, 3, 4, 5, 6, 7, 9)
    AND isNotNull(hand_class)
    AND hand_class != ''
    AND isNotNull(stackbb)
    AND stackbb > 0
)
SELECT
  toString(toDate('2025-10-01')) AS window_start,
  toString(toDate('2026-07-16')) AS window_end,
  'cnt_players_lookup_position BETWEEN 7 AND 9' AS table_filter,
  if(c.cohort = 'l3prior', 'l3_r11_14_eligible', c.cohort) AS cohort,
  any(mc.cohort_selected_players) AS cohort_selected_players,
  position_group,
  position_order,
  stack_bucket,
  stack_order,
  hand_class,
  count() AS opportunities,
  countIf(rfi = 1) AS raises_total,
  countIf(rfi = 1 AND NOT(ifNull(allin, 0) = 1 AND ifNull(preflop_actions, '') = 'R')) AS regular_raise,
  countIf(rfi = 1 AND ifNull(allin, 0) = 1 AND ifNull(preflop_actions, '') = 'R') AS open_shove,
  countIf(limped = 1) AS limp,
  count() - countIf(rfi = 1) - countIf(limped = 1) AS fold_other,
  uniqExact(uid) AS players,
  uniqExact(toStartOfMonth(played_ts)) AS months,
  round(100.0 * countIf(rfi = 1) / count(), 3) AS raise_total_pct,
  round(100.0 * countIf(rfi = 1 AND NOT(ifNull(allin, 0) = 1 AND ifNull(preflop_actions, '') = 'R')) / count(), 3) AS regular_raise_pct,
  round(100.0 * countIf(rfi = 1 AND ifNull(allin, 0) = 1 AND ifNull(preflop_actions, '') = 'R') / count(), 3) AS open_shove_pct,
  round(100.0 * countIf(limped = 1) / count(), 3) AS limp_pct,
  round(100.0 * (count() - countIf(rfi = 1) - countIf(limped = 1)) / count(), 3) AS fold_pct,
  toUInt8(count() < 30) AS very_low_sample,
  toUInt8(count() < 100) AS low_sample
FROM classified AS c
INNER JOIN membership_counts AS mc ON c.cohort = mc.cohort
WHERE c.cohort != 'l3prior'
  OR (stack_order >= 3 AND position_order <= 5)
GROUP BY c.cohort, position_group, position_order, stack_bucket, stack_order, hand_class
ORDER BY c.cohort, stack_order, position_order, hand_class;
