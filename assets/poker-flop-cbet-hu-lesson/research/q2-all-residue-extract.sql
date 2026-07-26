-- Reviewed all-residue compact-HH extract for the standalone RvBB c-bet lesson.
-- Window: [2026-04-01, 2026-07-01), partitioned by month_start_date.
-- Physical-hand sampling is disabled by the default [0, 200) residue range.
-- For bounded async transport, change residue_start/residue_end to disjoint
-- ranges whose union is exactly [0, 200), then merge with the validated
-- streaming merger from the private reviewed pipeline.

WITH
  toUInt64(0) AS residue_start,
  toUInt64(200) AS residue_end,
  keys AS (
    SELECT DISTINCT
      toUInt64(assumeNotNull(user_id)) AS user_id,
      assumeNotNull(network) AS network,
      assumeNotNull(hh_id) AS hh_id
    FROM analytics.int_tracker_hand_joined
    WHERE month_start_date >= toDate('2026-04-01')
      AND month_start_date < toDate('2026-07-01')
      AND user_id IS NOT NULL
      AND network IS NOT NULL
      AND hh_id IS NOT NULL
      AND is_preflop_unopened = 1
      AND is_rfi = 1
      AND preflop_raiser_count = 1
      AND is_flop_could_cbet = 1
      AND is_flop_in_position = 1
      AND cnt_flop_players = 2
      AND match(ifNull(preflop_actors_str, ''), '^[0-7]8$')
      AND cityHash64(concat(ifNull(network, ''), '|', ifNull(hh_id, ''))) % 200 >= residue_start
      AND cityHash64(concat(ifNull(network, ''), '|', ifNull(hh_id, ''))) % 200 < residue_end
  ),
  latest_raw AS (
    SELECT
      check_user_id AS user_id,
      network,
      converted_hh_id AS hh_id,
      argMax(tuple(hh_at, created_at, hh_text), created_at) AS latest
    FROM analytics.stg_hh_texts__hh_texts
    WHERE (check_user_id, network, converted_hh_id) IN (
      SELECT user_id, network, hh_id FROM keys
    )
    GROUP BY check_user_id, network, converted_hh_id
  ),
  payloads AS (
    SELECT
      user_id,
      network,
      hh_id,
      latest.1 AS played_at,
      latest.2 AS source_created_at,
      extract(
        latest.3,
        '(?i)(20\\d{2}[/-]\\d{1,2}[/-]\\d{1,2}[ T]\\d{1,2}:\\d{2}:\\d{2}(?:\\s*(?:UTC|GMT|ET|EST|EDT|CET|CEST|[+-]\\d{2}:?\\d{2}))?)'
      ) AS hand_time_raw,
      if(
        network = 'iPoker',
        extract(latest.3, '(?i)<cards[^>]*type="flop"[^>]*>\\s*([^<]+)\\s*</cards>'),
        extract(
          latest.3,
          '(?im)^[^\\r\\n]*(?:\\*\\*\\*\\s*FLOP\\b|Dealing\\s+Flop\\b)[^\\r\\n]*\\[([^\\]]+)\\]'
        )
      ) AS board_raw,
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
      ) AS preflop_payload,
      if(
        network = 'iPoker',
        extract(latest.3, '(?is)(<round[^>]*no="2"[^>]*>.*?</round>)'),
        extract(
          latest.3,
          '(?is)(?:\\*{2,3}\\s*FLOP\\b[^\\r\\n]*|\\*{2}\\s*Dealing\\s+Flop\\b[^\\r\\n]*)(.*?)(?:\\*{2,3}\\s*(?:TURN|SUMMARY)\\b|\\*{2}\\s*Dealing\\s+Turn\\b|$)'
        )
      ) AS flop_payload
    FROM latest_raw
  )
SELECT
  user_id,
  network,
  hh_id,
  played_at,
  source_created_at,
  hand_time_raw,
  board_raw,
  base64Encode(preflop_payload) AS preflop_payload_base64,
  base64Encode(flop_payload) AS flop_payload_base64
FROM payloads;

-- Candidate-manifest query. Its output must contain all 200 residues before a
-- browser asset may claim `sample.percent = 100`.
WITH keys AS (
  SELECT DISTINCT
    toUInt64(assumeNotNull(user_id)) AS user_id,
    assumeNotNull(network) AS network,
    assumeNotNull(hh_id) AS hh_id,
    cityHash64(concat(ifNull(network, ''), '|', ifNull(hh_id, ''))) % 200 AS residue
  FROM analytics.int_tracker_hand_joined
  WHERE month_start_date >= toDate('2026-04-01')
    AND month_start_date < toDate('2026-07-01')
    AND user_id IS NOT NULL
    AND network IS NOT NULL
    AND hh_id IS NOT NULL
    AND is_preflop_unopened = 1
    AND is_rfi = 1
    AND preflop_raiser_count = 1
    AND is_flop_could_cbet = 1
    AND is_flop_in_position = 1
    AND cnt_flop_players = 2
    AND match(ifNull(preflop_actors_str, ''), '^[0-7]8$')
)
SELECT residue, count() AS candidate_keys
FROM keys
GROUP BY residue
ORDER BY residue;
