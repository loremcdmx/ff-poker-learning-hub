-- BB check-raise hand-category extract: reproducible query contract.
--
-- Window: [2026-04-01 00:00:00, 2026-07-01 00:00:00) UTC.
-- Actor: tracked Hero is BB.  This is intentionally the reverse of the
-- neighboring RvBB c-bet extract, where tracked Hero is the CO/BTN aggressor.
--
-- Run the BigQuery rank bridge first.  Render its rows as
--   (user_id, 'YYYY-MM-01', rang)
-- into {{RANK_MONTH_ROWS}}, then run the ClickHouse export.
--
-- The ClickHouse result is a candidate extract, not the final rate.  Missing
-- raw HH remains explicit through raw_available instead of being inner-joined
-- away.
-- A network-aware parser must recover exact Hero-BB cards and the action node
-- from the compact payloads, classify the hand against the exact flop, and
-- retain an explicit cards_unknown/parser_excluded row.  Do not infer exact
-- suits from holecards_str: T9s does not identify T9hh or a backdoor flush.
--
-- Required parsed output grain:
--   one tracked Hero-BB perspective per physical hand
-- Required parsed fields:
--   user_id, network, tourney_id, hand_id, hh_id, played_at, rang, league,
--   opener_position,
--   board, hole_card_1, hole_card_2, holecards_str, cards_known,
--   pot_before_cbet, cbet_amount, cbet_pct_pot, opportunity, xr,
--   xr_to, xr_all_in, category, category_version, parser_warnings
--
-- Publication gates after parsing:
--   * no duplicate (user_id, network, tourney_id, hand_id);
--   * every admitted row satisfies BB check -> CO/BTN c-bet;
--   * cards_known + cards_unknown = admitted opportunities in every league;
--   * category numerators never exceed category opportunities;
--   * league totals reconcile exactly to the canonical Q2 controls:
--       League 1 (R1-5)   24,170 / 151,874
--       League 2 (R6-10)  60,081 / 378,226
--       League 3 (R11-17) 66,136 / 488,230
--     If the raw-HH parser cannot reproduce those totals, publish neither the
--     category rates nor an apparently close approximation.
--
-- Before exporting raw HH, run the same mart_latest/ranked_candidates CTEs and
-- aggregate the prepared flop node by league.  The 2026-07-18 preflight is
-- recorded in reverse-hero-category-reconciliation.json and is deliberately
-- blocked: the current rank bridge no longer reproduces the frozen controls.

-- ---------------------------------------------------------------------------
-- BigQuery: one dominant-overlap rank per player and calendar month.
-- This matches the rank timing contract of the canonical lesson headline;
-- it must not be replaced by current rank or exact-hand as-of rank without
-- rebuilding the headline controls under the same alternative contract.
-- ---------------------------------------------------------------------------
WITH months AS (
  SELECT month_start
  FROM UNNEST([
    TIMESTAMP '2026-04-01 00:00:00+00',
    TIMESTAMP '2026-05-01 00:00:00+00',
    TIMESTAMP '2026-06-01 00:00:00+00'
  ]) AS month_start
),
overlaps AS (
  SELECT
    h.user_id,
    m.month_start,
    h.rang,
    h.rang_start_at,
    TIMESTAMP_DIFF(
      LEAST(
        COALESCE(h.rang_end_at, TIMESTAMP '9999-12-31 00:00:00+00'),
        TIMESTAMP(DATE_ADD(DATE(m.month_start), INTERVAL 1 MONTH))
      ),
      GREATEST(h.rang_start_at, m.month_start),
      SECOND
    ) AS overlap_seconds
  FROM `analytics_mcp_readonly.mcp__check_rank_history` AS h
  JOIN `analytics_mcp_readonly.mcp__check_users` AS u
    USING (user_id)
  CROSS JOIN months AS m
  WHERE h.rang BETWEEN 1 AND 17
    AND u.is_real_player = TRUE
    AND h.rang_start_at < TIMESTAMP(DATE_ADD(DATE(m.month_start), INTERVAL 1 MONTH))
    AND COALESCE(h.rang_end_at, TIMESTAMP '9999-12-31 00:00:00+00')
        > m.month_start
),
overlap_by_rank AS (
  SELECT
    user_id,
    month_start,
    rang,
    SUM(overlap_seconds) AS overlap_seconds,
    MAX(rang_start_at) AS latest_rank_start_at
  FROM overlaps
  GROUP BY user_id, month_start, rang
)
SELECT
  user_id,
  FORMAT_DATE('%F', DATE(month_start)) AS month_start,
  rang,
  overlap_seconds
FROM overlap_by_rank
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY user_id, month_start
  ORDER BY overlap_seconds DESC, latest_rank_start_at DESC, rang ASC
) = 1
ORDER BY user_id, month_start;

-- ---------------------------------------------------------------------------
-- ClickHouse: reverse-Hero compact candidate extract.
--
-- Filtering happens on mart fields that define the preflop/HU candidate tree.
-- The final opportunity is deliberately parsed from raw street order rather
-- than guessed from a prefix of flop_action.  A candidate may donk, face no
-- c-bet, or have an unavailable/malformed raw HH; those rows must remain in
-- QA and may not silently disappear from coverage reporting.
-- ---------------------------------------------------------------------------
WITH
rank_by_user_month AS
(
  SELECT *
  FROM values(
    'user_id UInt64, month_start Date, rang Int16',
    {{RANK_MONTH_ROWS}}
  )
),
mart_latest AS
(
  SELECT
    assumeNotNull(h.network) AS network,
    assumeNotNull(h.tourney_id) AS tourney_id,
    assumeNotNull(h.hand_id) AS hand_id,
    argMax(
      tuple(
        h.user_id,
        h.hh_id,
        h.played_at,
        h.month_start_date,
        h.preflop_aggressor_position,
        h.preflop_2bet_and_blind_facing_amount_bb,
        h.stack_size_bb,
        h.preflop_effective_stack_size_bb,
        h.holecards_str,
        h.flop_action
      ),
      tuple(h.version, h.hand_player_id)
    ) AS x
  FROM analytics.int_tracker_hand_joined AS h
  WHERE h.month_start_date >= toDate('2026-04-01')
    AND h.month_start_date < toDate('2026-07-01')
    AND h.played_at >= toDateTime('2026-04-01 00:00:00')
    AND h.played_at < toDateTime('2026-07-01 00:00:00')
    AND h.user_id IS NOT NULL
    AND h.network IS NOT NULL
    AND h.network != ''
    AND h.tourney_id IS NOT NULL
    AND h.hand_id IS NOT NULL
    AND h.hand_player_id IS NOT NULL
    AND h.is_3_9_max = 1
    AND h.is_bb = 1
    AND h.cnt_players BETWEEN 3 AND 9
    AND h.is_preflop_first_actor_not_sb = 1
    AND h.val_preflop_action_facing = 4
    AND ifNull(h.cnt_preflop_face_limpers, 0) = 0
    -- preflop_raiser_count belongs to tracked Hero. Requiring it to equal one
    -- together with preflop_action = 'C' makes this candidate set empty.
    AND h.is_one_preflop_action_before_player = 1
    AND (h.is_first_aggressor_co = 1 OR h.is_first_aggressor_btn = 1)
    AND h.preflop_2bet_and_blind_facing_amount_bb <= 3.0
    AND h.stack_size_bb >= 20
    AND h.preflop_effective_stack_size_bb >= 20
    AND h.preflop_action = 'C'
    AND h.cnt_flop_players = 2
  GROUP BY network, tourney_id, hand_id
),
ranked_candidates AS
(
  SELECT
    toUInt64(assumeNotNull(m.x.1)) AS user_id,
    m.network,
    m.tourney_id,
    m.hand_id,
    m.x.2 AS hh_id,
    m.x.3 AS played_at,
    m.x.4 AS month_start,
    r.rang,
    multiIf(
      r.rang BETWEEN 1 AND 5, 'league1',
      r.rang BETWEEN 6 AND 10, 'league2',
      'league3'
    ) AS league,
    multiIf(
      m.x.5 = 0, 'BTN',
      m.x.5 = 1, 'CO',
      'INVALID'
    ) AS opener_position,
    m.x.6 AS open_size_bb,
    m.x.7 AS stack_size_bb,
    m.x.8 AS effective_stack_bb,
    m.x.9 AS holecards_str,
    m.x.10 AS mart_flop_action
  FROM mart_latest AS m
  INNER JOIN rank_by_user_month AS r
    ON toUInt64(assumeNotNull(m.x.1)) = r.user_id
   AND m.x.4 = r.month_start
  WHERE r.rang BETWEEN 1 AND 17
),
latest_raw AS
(
  SELECT
    check_user_id AS user_id,
    network,
    converted_hh_id AS hh_id,
    argMax(tuple(hh_at, created_at, hh_text), created_at) AS latest,
    toUInt8(1) AS has_raw
  FROM analytics.stg_hh_texts__hh_texts
  WHERE (check_user_id, network, converted_hh_id) IN (
    SELECT user_id, network, assumeNotNull(hh_id)
    FROM ranked_candidates
    WHERE hh_id IS NOT NULL
  )
  GROUP BY check_user_id, network, converted_hh_id
),
joined AS
(
  SELECT
    c.*,
    ifNull(raw.has_raw, toUInt8(0)) AS raw_available,
    raw.latest AS latest
  FROM ranked_candidates AS c
  LEFT JOIN latest_raw AS raw
    ON c.user_id = raw.user_id
   AND c.network = raw.network
   AND c.hh_id = raw.hh_id
),
payloads AS
(
  SELECT
    *,
    if(
      raw_available = 0,
      '',
      if(
        network = 'iPoker',
        extract(latest.3, '(?i)<cards[^>]*type="flop"[^>]*>\\s*([^<]+)\\s*</cards>'),
        extract(
          latest.3,
          '(?im)^[^\\r\\n]*(?:\\*\\*\\*\\s*FLOP\\b|Dealing\\s+Flop\\b)[^\\r\\n]*\\[([^\\]]+)\\]'
        )
      )
    ) AS board_raw,
    if(
      raw_available = 0,
      '',
      if(
        network = 'iPoker',
        concat(
          extract(latest.3, '(?is)(<round[^>]*no="0"[^>]*>.*?</round>)'),
          '\n__FF_PREFLOP_ACTIONS__\n',
          extract(latest.3, '(?is)(<round[^>]*no="1"[^>]*>.*?</round>)')
        ),
        concat(
          arrayStringConcat(
            extractAll(latest.3, '(?im)^([^\\r\\n]*\\bposts\\b[^\\r\\n]*)$'),
            '\n'
          ),
          '\n__FF_PREFLOP_ACTIONS__\n',
          extract(
            latest.3,
            '(?is)(?:HOLE\\s+CARDS|Dealing\\s+Down\\s+Cards|PRE-?FLOP)(.*?)(?:\\*{2,3}\\s*FLOP\\b|\\*{2}\\s*Dealing\\s+Flop\\b)'
          )
        )
      )
    ) AS preflop_payload,
    if(
      raw_available = 0,
      '',
      if(
        network = 'iPoker',
        extract(latest.3, '(?is)(<round[^>]*no="2"[^>]*>.*?</round>)'),
        extract(
          latest.3,
          '(?is)(?:\\*{2,3}\\s*FLOP\\b[^\\r\\n]*|\\*{2}\\s*Dealing\\s+Flop\\b[^\\r\\n]*)(.*?)(?:\\*{2,3}\\s*(?:TURN|SUMMARY)\\b|\\*{2}\\s*Dealing\\s+Turn\\b|$)'
        )
      )
    ) AS flop_payload
  FROM joined
)
SELECT
  user_id,
  network,
  tourney_id,
  hand_id,
  hh_id,
  played_at,
  month_start,
  rang,
  league,
  opener_position,
  open_size_bb,
  stack_size_bb,
  effective_stack_bb,
  holecards_str,
  mart_flop_action,
  raw_available,
  board_raw,
  base64Encode(preflop_payload) AS preflop_payload_base64,
  base64Encode(flop_payload) AS flop_payload_base64
FROM payloads
ORDER BY user_id, network, tourney_id, hand_id;
