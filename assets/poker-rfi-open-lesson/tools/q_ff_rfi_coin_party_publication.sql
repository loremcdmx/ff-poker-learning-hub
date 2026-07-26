/*
  Strong-gated CoinPoker / PartyPoker supplement for the exact 7-max RFI cube.

  This template is rendered only from a private frozen l3top membership export.
  It intentionally contains no player ids, hand histories, target-cell filter,
  interpolation, smoothing, or low-sample fallback.

  AGGREGATE_BODY is the server-side parser/aggregate body derived from the
  canonical raw-HH query template. The renderer certifies the grammar changes
  and records both template hashes.
*/
WITH members AS (
  SELECT
    tupleElement(member, 1) AS cohort,
    toUInt64(tupleElement(member, 2)) AS member_user_id
  FROM (
    SELECT arrayJoin([{{COHORT_MEMBERSHIP_TUPLES}}]) AS member
  )
),
membership_counts AS (
  SELECT cohort, count() AS cohort_selected_players
  FROM members
  GROUP BY cohort
),
raw_latest AS (
  SELECT
    toUInt64(check_user_id) AS user_id,
    toString(network) AS network,
    toString(assumeNotNull(converted_hh_id)) AS hh_id,
    groupUniqArray(hh_at) AS raw_played_ats
  FROM analytics.stg_hh_texts__hh_texts
  WHERE hh_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND hh_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
    AND check_user_id IN ({{UNIQUE_USER_IDS}})
    AND network = '{{NETWORK}}'
    AND converted_hh_id IS NOT NULL
  GROUP BY check_user_id, network, converted_hh_id
),
tracker_candidate_ids AS (
  SELECT hand_player_id
  FROM analytics.int_tracker_hand_joined
  PREWHERE month_start_date >= toDate('{{TRACKER_MONTH_START}}')
    AND month_start_date < toDate('{{TRACKER_MONTH_END_EXCLUSIVE}}')
    AND user_id IN ({{UNIQUE_USER_IDS}})
  WHERE network = '{{NETWORK}}'
    AND played_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
    AND hand_player_id IS NOT NULL
  GROUP BY hand_player_id
),
tracker_latest_versions AS (
  SELECT
    h.hand_player_id,
    argMax(
      tuple(
        h.user_id,
        toString(ifNull(h.network, '')),
        toString(ifNull(h.hh_id, '')),
        h.cnt_players,
        toUInt8(coalesce(h.is_preflop_unopened, 0)),
        toString(ifNull(h.holecards_str, ''))
      ),
      tuple(
        h.version,
        ifNull(toString(h.user_id), ''),
        toString(ifNull(h.network, '')),
        toString(ifNull(h.hh_id, '')),
        ifNull(toString(h.cnt_players), ''),
        toString(toUInt8(coalesce(h.is_preflop_unopened, 0))),
        toString(ifNull(h.holecards_str, ''))
      )
    ) AS ledger_x,
    argMax(
      tuple(
        h.user_id,
        toString(ifNull(h.network, '')),
        toString(ifNull(h.hh_id, '')),
        h.cnt_players,
        toUInt8(coalesce(h.is_preflop_unopened, 0)),
        toString(ifNull(h.holecards_str, '')),
        h.played_at
      ),
      tuple(
        h.version,
        ifNull(toString(h.user_id), ''),
        toString(ifNull(h.network, '')),
        toString(ifNull(h.hh_id, '')),
        ifNull(toString(h.cnt_players), ''),
        toString(toUInt8(coalesce(h.is_preflop_unopened, 0))),
        toString(ifNull(h.holecards_str, '')),
        toString(h.played_at)
      )
    ) AS timed_x
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN tracker_candidate_ids AS c USING (hand_player_id)
  PREWHERE h.month_start_date >= toDate('{{TRACKER_MONTH_START}}')
    AND h.month_start_date < toDate('{{TRACKER_MONTH_END_EXCLUSIVE}}')
    AND h.user_id IN ({{UNIQUE_USER_IDS}})
  WHERE h.played_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
  GROUP BY h.hand_player_id
),
tracker_selection_assertion_source AS (
  SELECT
    countIf(
      ledger_x != tuple(
        timed_x.1,
        timed_x.2,
        timed_x.3,
        timed_x.4,
        timed_x.5,
        timed_x.6
      )
    ) AS tracker_selection_drift
  FROM tracker_latest_versions
),
structured_hands AS (
  SELECT
    hand_player_id,
    toUInt64(ledger_x.1) AS user_id,
    ledger_x.2 AS network,
    ledger_x.3 AS hh_id,
    timed_x.7 AS played_at
  FROM tracker_latest_versions
),
raw_casefold AS (
  SELECT
    *,
    lowerUTF8(trimBoth(hh_id)) AS casefold_hh_id
  FROM raw_latest
),
raw_compact AS (
  SELECT
    *,
    replaceRegexpAll(casefold_hh_id, '[^a-z0-9]', '') AS compact_hh_id
  FROM raw_casefold
),
raw_normalized AS (
  SELECT
    *,
    replaceRegexpOne(
      compact_hh_id,
      '^((?:coinpoker|partypoker|handhistory|hand|game|hh|id)+)',
      ''
    ) AS stripped_hh_id
  FROM raw_compact
),
raw_keys AS (
  SELECT
    *,
    if(stripped_hh_id != '', stripped_hh_id, compact_hh_id)
      AS prefix_stripped_hh_id
  FROM raw_normalized
),
structured_casefold AS (
  SELECT
    *,
    lowerUTF8(trimBoth(hh_id)) AS casefold_hh_id
  FROM structured_hands
),
structured_compact AS (
  SELECT
    *,
    replaceRegexpAll(casefold_hh_id, '[^a-z0-9]', '') AS compact_hh_id
  FROM structured_casefold
),
structured_normalized AS (
  SELECT
    *,
    replaceRegexpOne(
      compact_hh_id,
      '^((?:coinpoker|partypoker|handhistory|hand|game|hh|id)+)',
      ''
    ) AS stripped_hh_id
  FROM structured_compact
),
structured_keys AS (
  SELECT
    *,
    if(stripped_hh_id != '', stripped_hh_id, compact_hh_id)
      AS prefix_stripped_hh_id
  FROM structured_normalized
),
structured_exact_index AS (
  SELECT
    user_id,
    network,
    hh_id,
    uniqExact(hand_player_id) AS structured_exact_matches
  FROM structured_keys
  WHERE hh_id != ''
  GROUP BY user_id, network, hh_id
),
structured_casefold_index AS (
  SELECT
    user_id,
    network,
    casefold_hh_id,
    uniqExact(hand_player_id) AS structured_casefold_matches
  FROM structured_keys
  WHERE casefold_hh_id != ''
  GROUP BY user_id, network, casefold_hh_id
),
structured_prefix_index AS (
  SELECT
    user_id,
    network,
    prefix_stripped_hh_id,
    uniqExact(hand_player_id) AS structured_prefix_matches
  FROM structured_keys
  WHERE prefix_stripped_hh_id != ''
  GROUP BY user_id, network, prefix_stripped_hh_id
),
structured_time_index AS (
  SELECT
    user_id,
    network,
    played_at,
    uniqExact(hand_player_id) AS structured_time_matches
  FROM structured_keys
  GROUP BY user_id, network, played_at
),
raw_with_exact AS (
  SELECT
    r.*,
    ifNull(e.structured_exact_matches, toUInt64(0))
      AS structured_exact_matches
  FROM raw_keys AS r
  ANY LEFT JOIN structured_exact_index AS e
    ON r.user_id = e.user_id
   AND r.network = e.network
   AND r.hh_id = e.hh_id
),
nominal_novel AS (
  SELECT *
  FROM raw_with_exact
  WHERE structured_exact_matches = 0
),
raw_novel_casefold_index AS (
  SELECT
    user_id,
    network,
    casefold_hh_id,
    count() AS raw_casefold_variants
  FROM nominal_novel
  WHERE casefold_hh_id != ''
  GROUP BY user_id, network, casefold_hh_id
),
raw_novel_prefix_index AS (
  SELECT
    user_id,
    network,
    prefix_stripped_hh_id,
    count() AS raw_prefix_variants
  FROM nominal_novel
  WHERE prefix_stripped_hh_id != ''
  GROUP BY user_id, network, prefix_stripped_hh_id
),
nominal_novel_times AS (
  SELECT
    n.user_id,
    n.network,
    n.hh_id,
    arrayJoin(n.raw_played_ats) AS played_at
  FROM nominal_novel AS n
),
novel_time_diagnostics AS (
  SELECT
    nt.user_id,
    nt.network,
    nt.hh_id,
    count() AS raw_version_timestamp_count,
    sum(ifNull(t.structured_time_matches, toUInt64(0)))
      AS structured_time_matches
  FROM nominal_novel_times AS nt
  ANY LEFT JOIN structured_time_index AS t
    ON nt.user_id = t.user_id
   AND nt.network = t.network
   AND nt.played_at = t.played_at
  GROUP BY nt.user_id, nt.network, nt.hh_id
),
novel_diagnostics AS (
  SELECT
    n.user_id AS user_id,
    n.network AS network,
    n.hh_id AS hh_id,
    n.casefold_hh_id AS casefold_hh_id,
    n.prefix_stripped_hh_id AS prefix_stripped_hh_id,
    n.structured_exact_matches AS structured_exact_matches,
    ifNull(c.structured_casefold_matches, toUInt64(0))
      AS structured_casefold_matches,
    ifNull(p.structured_prefix_matches, toUInt64(0))
      AS structured_prefix_matches,
    ifNull(tm.structured_time_matches, toUInt64(0))
      AS structured_time_matches,
    ifNull(tm.raw_version_timestamp_count, toUInt64(0))
      AS raw_version_timestamp_count,
    ifNull(rc.raw_casefold_variants, toUInt64(0))
      AS raw_casefold_variants,
    ifNull(rp.raw_prefix_variants, toUInt64(0))
      AS raw_prefix_variants
  FROM nominal_novel AS n
  ANY LEFT JOIN structured_casefold_index AS c
    ON n.user_id = c.user_id
   AND n.network = c.network
   AND n.casefold_hh_id = c.casefold_hh_id
  ANY LEFT JOIN structured_prefix_index AS p
    ON n.user_id = p.user_id
   AND n.network = p.network
   AND n.prefix_stripped_hh_id = p.prefix_stripped_hh_id
  ANY LEFT JOIN novel_time_diagnostics AS tm
    ON n.user_id = tm.user_id
   AND n.network = tm.network
   AND n.hh_id = tm.hh_id
  ANY LEFT JOIN raw_novel_casefold_index AS rc
    ON n.user_id = rc.user_id
   AND n.network = rc.network
   AND n.casefold_hh_id = rc.casefold_hh_id
  ANY LEFT JOIN raw_novel_prefix_index AS rp
    ON n.user_id = rp.user_id
   AND n.network = rp.network
   AND n.prefix_stripped_hh_id = rp.prefix_stripped_hh_id
),
normalized_time_eligible_raw_keys AS (
  SELECT
    d.user_id,
    d.network,
    d.hh_id
  FROM novel_diagnostics AS d
  WHERE d.structured_casefold_matches = 0
    AND d.structured_prefix_matches = 0
    AND d.structured_time_matches = 0
    AND d.raw_casefold_variants = 1
    AND d.raw_prefix_variants = 1
    AND d.casefold_hh_id != ''
    AND d.prefix_stripped_hh_id != ''
),
raw_header_diagnostics AS (
  SELECT
    toUInt64(check_user_id) AS user_id,
    toString(network) AS network,
    toString(assumeNotNull(converted_hh_id)) AS hh_id,
    arrayFilter(
      value -> value != '',
      arraySort(groupUniqArray(extract(hh_text, '{{RAW_HEADER_ID_PATTERN}}')))
    ) AS valid_header_ids
  FROM analytics.stg_hh_texts__hh_texts
  WHERE hh_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND hh_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
    AND check_user_id IN ({{UNIQUE_USER_IDS}})
    AND network = '{{NETWORK}}'
    AND converted_hh_id IS NOT NULL
    AND hh_text != ''
    AND tuple(
      toUInt64(check_user_id),
      toString(network),
      toString(assumeNotNull(converted_hh_id))
    ) IN (
      SELECT tuple(user_id, network, hh_id)
      FROM normalized_time_eligible_raw_keys
    )
  GROUP BY check_user_id, network, converted_hh_id
),
raw_canonical_header_index AS (
  SELECT
    user_id,
    network,
    arrayElement(valid_header_ids, 1) AS canonical_header_id,
    uniqExact(hh_id) AS raw_header_key_count
  FROM raw_header_diagnostics
  WHERE length(valid_header_ids) = 1
    AND arrayElement(valid_header_ids, 1) != ''
  GROUP BY user_id, network, canonical_header_id
),
structured_header_index AS (
  SELECT
    user_id,
    network,
    {{STRUCTURED_HEADER_ID_EXPRESSION}} AS header_id,
    uniqExact(hand_player_id) AS structured_header_matches
  FROM structured_hands
  WHERE network = '{{NETWORK}}'
    AND hh_id != ''
    AND {{STRUCTURED_HEADER_ID_EXPRESSION}} != ''
  GROUP BY user_id, network, header_id
),
publication_eligible_raw_keys AS (
  SELECT
    r.user_id AS publication_user_id,
    r.network AS publication_network,
    r.hh_id AS publication_hh_id
  FROM raw_header_diagnostics AS r
  ANY LEFT JOIN raw_canonical_header_index AS rh
    ON r.user_id = rh.user_id
   AND r.network = rh.network
   AND arrayElement(r.valid_header_ids, 1) = rh.canonical_header_id
  ANY LEFT JOIN structured_header_index AS s
    ON r.user_id = s.user_id
   AND r.network = s.network
   AND arrayElement(r.valid_header_ids, 1) = s.header_id
  WHERE length(r.valid_header_ids) = 1
    AND {{RAW_HEADER_MATCH_PREDICATE}}
    AND ifNull(rh.raw_header_key_count, toUInt64(0)) = 1
    AND ifNull(s.structured_header_matches, toUInt64(0)) = 0
),
raw_counts AS (
  SELECT
    count() AS raw_keys,
    countIf(structured_exact_matches > 0) AS exact_id_match_keys,
    countIf(structured_exact_matches = 0) AS nominal_novel_keys
  FROM raw_with_exact
),
gate_counts AS (
  SELECT
    (SELECT count() FROM normalized_time_eligible_raw_keys)
      AS normalized_time_eligible_keys,
    (SELECT count() FROM publication_eligible_raw_keys)
      AS publication_eligible_keys
),
assertions AS (
  SELECT
    raw_keys AS gate_raw_keys,
    exact_id_match_keys AS gate_exact_id_match_keys,
    nominal_novel_keys AS gate_nominal_novel_keys,
    normalized_time_eligible_keys AS gate_normalized_time_eligible_keys,
    publication_eligible_keys AS gate_publication_eligible_keys,
    if(
      tracker_selection_drift = 0,
      toUInt8(1),
      throwIf(1, 'structured latest-version tuple drifted from exact ledger contract')
    ) AS tracker_selection_assertion,
    if(
      toInt64(raw_keys) - toInt64(exact_id_match_keys) - toInt64(nominal_novel_keys) = 0,
      toUInt8(1),
      throwIf(1, 'raw exact-id partition identity failed')
    ) AS exact_partition_assertion,
    if(
      publication_eligible_keys <= normalized_time_eligible_keys
        AND normalized_time_eligible_keys <= nominal_novel_keys,
      toUInt8(1),
      throwIf(1, 'publication eligibility partition failed')
    ) AS publication_partition_assertion
  FROM raw_counts
  CROSS JOIN gate_counts
  CROSS JOIN tracker_selection_assertion_source
),
{{AGGREGATE_BODY}}
