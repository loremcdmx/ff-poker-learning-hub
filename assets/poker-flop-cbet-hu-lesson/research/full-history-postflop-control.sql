-- Independent full-history reconciliation for the postflop field cube.
--
-- This daily mart is intentionally NOT the learner-facing source because its
-- grain cannot be joined to the exact rank-at-hand intervals.  It is kept only
-- to reconcile whole-field aggregate rates against the raw hand query.
--
-- Source: analytics.tracker_stats_users_by_day.
-- Window: [{{WINDOW_START_INCLUSIVE}}, {{WINDOW_END_EXCLUSIVE}}) UTC.
-- Grain before the final sum: the documented daily mart grain.
--
-- Latest-version rule:
--   key = tracker_player_id, played_date, blinds_level_group,
--         stack_size_group, hh_tour_id, total_bi_usd, tourney_type,
--         table_size, tourney_speed, first_hh_at, nickname, network
--   order = version, then the complete six-metric tuple as a deterministic
--           tie-break for physically duplicated equal-version rows.

WITH latest AS
(
  SELECT
    stack_size_group,
    argMax(
      tuple(
        made_cbet_flop_rfi_vs_bb,
        cases_cbet_flop_rfi_vs_bb,
        made_bb_vs_raiser_check_fold_flop,
        cases_bb_vs_raiser_check_fold_flop,
        made_bb_vs_raiser_check_raise_flop,
        cases_bb_vs_raiser_check_raise_flop,
        played_date
      ),
      tuple(
        version,
        made_cbet_flop_rfi_vs_bb,
        cases_cbet_flop_rfi_vs_bb,
        made_bb_vs_raiser_check_fold_flop,
        cases_bb_vs_raiser_check_fold_flop,
        made_bb_vs_raiser_check_raise_flop,
        cases_bb_vs_raiser_check_raise_flop
      )
    ) AS x
  FROM analytics.tracker_stats_users_by_day
  PREWHERE played_date >= toDate('{{WINDOW_START_INCLUSIVE}}')
    AND played_date < toDate('{{WINDOW_END_EXCLUSIVE}}')
  GROUP BY
    tracker_player_id,
    played_date,
    blinds_level_group,
    stack_size_group,
    hh_tour_id,
    total_bi_usd,
    tourney_type,
    table_size,
    tourney_speed,
    first_hh_at,
    nickname,
    network
)
SELECT
  ifNull(stack_size_group, 'unknown') AS stack_group,
  sum(x.1) AS cbet_made,
  sum(x.2) AS cbet_cases,
  sum(x.2) - sum(x.1) AS cbet_checks,
  sum(x.3) AS checkfold_made,
  sum(x.4) AS checkfold_cases,
  sum(x.4) - sum(x.3) AS checkfold_not_made,
  sum(x.5) AS checkraise_made,
  sum(x.6) AS checkraise_cases,
  sum(x.6) - sum(x.5) AS checkraise_not_made,
  min(x.7) AS first_date,
  max(x.7) AS last_date
FROM latest
GROUP BY stack_size_group
ORDER BY stack_group;
