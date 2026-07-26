-- Current exact-7 RFI cube with source-backed missing-card recovery.
--
-- Structured tracker data remains authoritative for action, position, stack,
-- table size and every already-known hand class. Raw hand histories are read
-- only by the exact (user, network, converted hand id) key selected below.
-- In full-cube/counter modes the raw lookup is strictly limited to latest
-- tracker rows where holecards_str = ''. A parsed raw class can therefore
-- never overwrite or duplicate a structured class.
--
-- Supported raw card grammars:
--   * iPoker XML: the type="Pocket" node whose player attribute exactly
--     equals stg_hh_texts__hh_texts.nickname; cards are suit-first.
--   * 888Poker / Chico / GGNetwork / PokerPlanets / PokerStars /
--     PokerStars(FR-ES-PT) / Winamax.fr / WPN: after exact duplicate lines
--     are collapsed, exactly one card-bearing "Dealt to ... [.. ..]" line;
--     its alias must exactly equal the source nickname or be the literal Hero
--     alias. Only the bracket payload is tokenized, and it must contain
--     exactly two rank-first cards.
--
-- The renderer supplies one of three final queries:
--   full-cube         complete aggregate CSV schema for the current window;
--   recovery-counters aggregate missing/recovered counts by network;
--   validation        fixed 2026-07-01 overlap gate against tracker classes.

WITH members AS (
  SELECT
    tupleElement(member, 1) AS cohort,
    toInt32(tupleElement(member, 2)) AS member_user_id
  FROM (
    SELECT arrayJoin([{{COHORT_MEMBERSHIP_TUPLES}}]) AS member
  )
),
membership_counts AS (
  SELECT
    tupleElement(item, 1) AS cohort,
    toUInt64(tupleElement(item, 2)) AS cohort_selected_players
  FROM (
    SELECT arrayJoin([{{COHORT_COUNT_TUPLES}}]) AS item
  )
),
candidate_ids AS (
  SELECT h.hand_player_id
  FROM analytics.int_tracker_hand_joined AS h
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
      toString(ifNull(h.network, '')),
      toString(ifNull(h.hh_id, '')),
      toString(ifNull(h.holecards_str, '')),
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
      toString(ifNull(h.holecards_str, '')),
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
  FROM analytics.int_tracker_hand_joined AS h
  INNER JOIN candidate_ids AS c USING (hand_player_id)
  PREWHERE h.month_start_date >= toDate('{{WINDOW_START_MONTH}}')
    AND h.month_start_date < toDate('{{WINDOW_END_MONTH_EXCLUSIVE}}')
    AND h.user_id IN ({{UNIQUE_USER_IDS}})
  WHERE h.played_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND h.played_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
  GROUP BY h.hand_player_id
),
latest AS (
  SELECT
    toInt32(x.1) AS uid,
    x.2 AS played_ts,
    x.3 AS actual_players,
    x.4 AS lookup_players,
    x.5 AS pos,
    toString(x.6) AS network,
    toString(x.7) AS tracker_hh_id,
    toString(x.8) AS structured_hand_class,
    x.9 AS stackbb,
    x.10 AS unopened,
    x.11 AS rfi,
    x.12 AS allin,
    x.13 AS limped,
    x.14 AS preflop_actions,
    x.15 AS raise_and_blind_bb,
    x.16 AS posted_blind_bb
  FROM latest_versions
  WHERE x.3 = 7
    AND x.10 = 1
    AND x.5 IN (0, 1, 2, 3, 4, 9)
    AND isNotNull(x.9)
    AND x.9 > 0
    AND x.9 <= 200
),
positioned_latest AS (
  SELECT
    *,
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
),
raw_lookup_candidates AS (
  SELECT *
  FROM positioned_latest
  WHERE {{RAW_LOOKUP_CARD_SCOPE}}
    AND network IN (
      'GGNetwork',
      'PokerStars',
      'PokerStars(FR-ES-PT)',
      'iPoker',
      '888Poker',
      'Chico',
      'PokerPlanets',
      'Winamax.fr',
      'WPN'
    )
    AND tracker_hh_id != ''
),
raw_lookup_keys AS (
  SELECT
    toUInt64(uid) AS user_id,
    toString(network) AS network,
    toString(tracker_hh_id) AS hh_id
  FROM raw_lookup_candidates
),
raw_latest AS (
  SELECT
    toUInt64(check_user_id) AS user_id,
    toString(network) AS network,
    toString(converted_hh_id) AS hh_id,
    argMax(
      tuple(toString(nickname), hh_text),
      tuple(created_at, toString(nickname), hh_text)
    ) AS raw_x
  FROM analytics.stg_hh_texts__hh_texts
  WHERE check_user_id IN ({{UNIQUE_USER_IDS}})
    AND network IN (
      'GGNetwork',
      'PokerStars',
      'PokerStars(FR-ES-PT)',
      'iPoker',
      '888Poker',
      'Chico',
      'PokerPlanets',
      'Winamax.fr',
      'WPN'
    )
    AND tuple(
      toUInt64(check_user_id),
      toString(network),
      toString(converted_hh_id)
    ) IN (
      SELECT tuple(user_id, network, hh_id)
      FROM raw_lookup_keys
    )
    AND hh_text != ''
  GROUP BY check_user_id, network, converted_hh_id
),
raw_joined AS (
  SELECT
    c.*,
    r.raw_x.1 AS source_nickname,
    r.raw_x.2 AS hh_text
  FROM raw_lookup_candidates AS c
  INNER JOIN raw_latest AS r
    ON toUInt64(c.uid) = r.user_id
   AND toString(c.network) = r.network
   AND toString(c.tracker_hh_id) = r.hh_id
),
lexical AS (
  SELECT
    *,
    extractAll(
      hh_text,
      '(?is)<cards\\b[^>]*\\btype="Pocket"[^>]*>[^<]*</cards>'
    ) AS ip_pocket_nodes,
    arrayDistinct(extractAll(
      hh_text,
      '(?im)^Dealt to\\s+[^\\r\\n]*\\[[^\\]]+\\][^\\r\\n]*$'
    )) AS generic_cardful_dealt_lines
  FROM raw_joined
),
selected_lines AS (
  SELECT
    *,
    arrayFirst(
      node -> extract(node, '(?i)\\bplayer="([^"]*)"') = source_nickname,
      ip_pocket_nodes
    ) AS ip_hero_pocket_node,
    if(
      length(generic_cardful_dealt_lines) = 1,
      arrayElement(generic_cardful_dealt_lines, 1),
      ''
    ) AS generic_hero_dealt_line
  FROM lexical
),
tokenized AS (
  SELECT
    *,
    extractAll(
      extract(ip_hero_pocket_node, '(?is)>([^<]*)</cards>'),
      '(?i)[CDHS](?:10|[2-9TJQKA])'
    ) AS ip_cards,
    extractAll(
      extract(generic_hero_dealt_line, '(?i)\\[([^\\]]+)\\]'),
      '(?i)(?:10|[2-9TJQKA])[cdhs]'
    ) AS generic_cards,
    trim(extract(
      generic_hero_dealt_line,
      '(?i)^Dealt to\\s+(.+?)\\s*\\['
    )) AS generic_dealt_alias
  FROM selected_lines
),
selected_cards AS (
  SELECT
    *,
    multiIf(
      network = 'iPoker'
        AND ip_hero_pocket_node != ''
        AND length(ip_cards) = 2,
      ip_cards,
      network IN (
        '888Poker',
        'Chico',
        'GGNetwork',
        'PokerPlanets',
        'PokerStars',
        'PokerStars(FR-ES-PT)',
        'Winamax.fr',
        'WPN'
      )
        AND length(generic_cardful_dealt_lines) = 1
        AND (
          generic_dealt_alias = source_nickname
          OR lower(generic_dealt_alias) = 'hero'
        )
        AND length(generic_cards) = 2,
      generic_cards,
      emptyArrayString()
    ) AS raw_cards
  FROM tokenized
),
card_parts AS (
  SELECT
    *,
    arrayElement(raw_cards, 1) AS raw_card_1,
    arrayElement(raw_cards, 2) AS raw_card_2,
    if(
      network = 'iPoker',
      replaceAll(upper(substring(raw_card_1, 2)), '10', 'T'),
      replaceAll(
        upper(substring(raw_card_1, 1, length(raw_card_1) - 1)),
        '10',
        'T'
      )
    ) AS rank_1,
    if(
      network = 'iPoker',
      replaceAll(upper(substring(raw_card_2, 2)), '10', 'T'),
      replaceAll(
        upper(substring(raw_card_2, 1, length(raw_card_2) - 1)),
        '10',
        'T'
      )
    ) AS rank_2,
    if(
      network = 'iPoker',
      lower(left(raw_card_1, 1)),
      lower(right(raw_card_1, 1))
    ) AS suit_1,
    if(
      network = 'iPoker',
      lower(left(raw_card_2, 1)),
      lower(right(raw_card_2, 1))
    ) AS suit_2
  FROM selected_cards
),
parsed AS (
  SELECT
    *,
    if(
      length(raw_cards) = 2
      AND lower(raw_card_1) != lower(raw_card_2)
      AND position('23456789TJQKA', rank_1) > 0
      AND position('23456789TJQKA', rank_2) > 0,
      concat(
        if(
          position('23456789TJQKA', rank_1)
            >= position('23456789TJQKA', rank_2),
          rank_1,
          rank_2
        ),
        if(
          position('23456789TJQKA', rank_1)
            >= position('23456789TJQKA', rank_2),
          rank_2,
          rank_1
        ),
        if(rank_1 = rank_2, '', if(suit_1 = suit_2, 's', 'o'))
      ),
      ''
    ) AS validated_raw_hand_class
  FROM card_parts
),
structured_known AS (
  SELECT
    uid,
    played_ts,
    actual_players,
    lookup_players,
    pos,
    network,
    tracker_hh_id,
    stackbb,
    unopened,
    rfi,
    allin,
    limped,
    preflop_actions,
    raise_and_blind_bb,
    posted_blind_bb,
    position_group,
    position_order,
    stack_bucket,
    stack_order,
    structured_hand_class AS hand_class,
    toUInt8(0) AS recovered_from_raw
  FROM positioned_latest
  WHERE structured_hand_class != ''
),
recovered_missing AS (
  SELECT
    uid,
    played_ts,
    actual_players,
    lookup_players,
    pos,
    network,
    tracker_hh_id,
    stackbb,
    unopened,
    rfi,
    allin,
    limped,
    preflop_actions,
    raise_and_blind_bb,
    posted_blind_bb,
    position_group,
    position_order,
    stack_bucket,
    stack_order,
    validated_raw_hand_class AS hand_class,
    toUInt8(1) AS recovered_from_raw
  FROM parsed
  WHERE structured_hand_class = ''
    AND validated_raw_hand_class != ''
),
effective_known AS (
  SELECT * FROM structured_known
  UNION ALL
  SELECT * FROM recovered_missing
),
eligible_coverage AS (
  SELECT
    m.cohort,
    p.position_group,
    p.position_order,
    p.pos AS position_code,
    p.stack_bucket,
    p.stack_order,
    count() AS eligible_opportunities,
    countIf(p.lookup_players != 7) AS lookup_mismatch_opportunities,
    min(p.played_ts) AS first_observed_at,
    max(p.played_ts) AS last_observed_at
  FROM positioned_latest AS p
  INNER JOIN members AS m ON p.uid = m.member_user_id
  GROUP BY
    m.cohort,
    p.position_group,
    p.position_order,
    position_code,
    p.stack_bucket,
    p.stack_order
),
known_coverage AS (
  SELECT
    m.cohort,
    e.position_group,
    e.position_order,
    e.pos AS position_code,
    e.stack_bucket,
    e.stack_order,
    count() AS known_card_opportunities
  FROM effective_known AS e
  INNER JOIN members AS m ON e.uid = m.member_user_id
  GROUP BY
    m.cohort,
    e.position_group,
    e.position_order,
    position_code,
    e.stack_bucket,
    e.stack_order
),
state_coverage AS (
  SELECT
    a.*,
    ifNull(k.known_card_opportunities, 0) AS known_card_opportunities
  FROM eligible_coverage AS a
  LEFT JOIN known_coverage AS k USING (
    cohort,
    position_group,
    position_order,
    position_code,
    stack_bucket,
    stack_order
  )
),
known_classified AS (
  SELECT
    m.cohort,
    e.*
  FROM effective_known AS e
  INNER JOIN members AS m ON e.uid = m.member_user_id
),
actions AS (
  SELECT
    *,
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
  FROM known_classified
)
{{FINAL_QUERY}}
