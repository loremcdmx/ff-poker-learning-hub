-- Historical exact-7 RFI recovery from canonical raw hand histories.
--
-- Scope is intentionally narrow:
--   * only networks whose raw grammar reproduced current tracker hand class,
--     position, public stack bucket, first action and shove split exactly;
--   * exactly seven occupied seat records;
--   * only hands where Hero, nominal blinds and the first preflop action are
--     recoverable; two overlap-certified fallbacks cover an empty physical
--     button seat and a dead small blind while still failing closed.
--
-- Rejected hand histories do not become modelled cells. The query only adds
-- observed actions whose parser contract is independently checked against the
-- structured source on a modern overlap window.

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
latest_raw AS (
  SELECT
    toUInt64(check_user_id) AS user_id,
    network,
    assumeNotNull(converted_hh_id) AS hh_id,
    argMax(
      tuple(hh_at, ifNull(nickname, ''), hh_text),
      tuple(created_at, hh_at, ifNull(nickname, ''), hh_text)
    ) AS x
  FROM analytics.stg_hh_texts__hh_texts
  WHERE hh_at >= toDateTime('{{WINDOW_START_INCLUSIVE}} 00:00:00')
    AND hh_at < toDateTime('{{WINDOW_END_EXCLUSIVE}} 00:00:00')
    AND check_user_id IN ({{UNIQUE_USER_IDS}})
    AND network IN (
      '888Poker',
      'Chico',
      'GGNetwork',
      'PokerPlanets',
      'PokerStars',
      'PokerStars(FR-ES-PT)',
      'Winamax.fr',
      'WPN',
      'iPoker'
    )
    AND converted_hh_id IS NOT NULL
    AND hh_text != ''
  GROUP BY check_user_id, network, converted_hh_id
),
lexical AS (
  SELECT
    *,
    x.1 AS played_ts,
    x.2 AS source_nickname,
    x.3 AS hh_text,
    arrayFilter(
      line ->
        positionCaseInsensitive(line, 'out of hand') = 0,
      extractAll(x.3, '(?m)^Seat\\s+[0-9]+:\\s+[^\\r\\n]+')
    ) AS raw_seat_lines,
    extractAll(x.3, '(?im)^Dealt to\\s+[^\\r\\n]*\\[[^\\]]+\\][^\\r\\n]*$') AS dealt_lines,
    extractAll(
      x.3,
      '(?im)^[^\\r\\n]+?(?::)?\\s+posts(?:\\s+the)?\\s+(?:ante|small blind|big blind)\\b[^\\r\\n]*$'
    ) AS forced_lines,
    multiIf(
      extract(
        x.3,
        '(?is)\\*\\*\\*\\s*HOLE CARDS\\s*\\*\\*\\*(.*?)(?:\\*\\*\\*\\s*(?:FLOP|SUMMARY)\\b|$)'
      ) != '',
      extract(
        x.3,
        '(?is)\\*\\*\\*\\s*HOLE CARDS\\s*\\*\\*\\*(.*?)(?:\\*\\*\\*\\s*(?:FLOP|SUMMARY)\\b|$)'
      ),
      extract(
        x.3,
        '(?is)\\*\\*\\s*Dealing down cards\\s*\\*\\*(.*?)(?:\\*\\*\\s*(?:Dealing flop|Summary)\\b|$)'
      ) != '',
      extract(
        x.3,
        '(?is)\\*\\*\\s*Dealing down cards\\s*\\*\\*(.*?)(?:\\*\\*\\s*(?:Dealing flop|Summary)\\b|$)'
      ),
      extract(
        x.3,
        '(?is)\\*\\*\\*\\s*PRE-FLOP\\s*\\*\\*\\*(.*?)(?:\\*\\*\\*\\s*(?:FLOP|SUMMARY)\\b|$)'
      )
    ) AS preflop_payload
  FROM latest_raw
  WHERE network != 'iPoker'
),
arrays AS (
  SELECT
    *,
    arraySort(arrayDistinct(arrayMap(
      line -> toUInt8OrZero(extract(line, '(?i)^Seat\\s+([0-9]+):')),
      raw_seat_lines
    ))) AS seat_numbers,
    arrayMap(
      seat_no -> arrayFirst(
        line -> toUInt8OrZero(extract(line, '(?i)^Seat\\s+([0-9]+):')) = seat_no,
        raw_seat_lines
      ),
      seat_numbers
    ) AS seat_lines,
    arrayDistinct(arrayFilter(
      line -> length(extractAll(line, '(?i)(?:10|[2-9TJQKA])[cdhs]')) = 2,
      dealt_lines
    )) AS cardful_dealt_lines,
    arrayFilter(
      line ->
        trim(extract(line, '(?i)^Dealt to\\s+(.+?)\\s*\\[')) = x.2
          OR lower(trim(extract(line, '(?i)^Dealt to\\s+(.+?)\\s*\\['))) = 'hero',
      cardful_dealt_lines
    ) AS hero_dealt_lines,
    arrayElement(hero_dealt_lines, 1) AS hero_dealt_line,
    extractAll(
      preflop_payload,
      '(?im)^[^\\r\\n]+?(?::)?\\s+(?:folds?|calls?|raises?|checks?)\\b[^\\r\\n]*$'
    ) AS action_lines
  FROM lexical
),
tokens AS (
  SELECT
    *,
    arrayMap(
      line -> trim(extract(line, '(?i)^Seat\\s+[0-9]+:\\s+(.+?)\\s+\\(\\s*[0-9]')),
      seat_lines
    ) AS seat_names,
    arrayMap(
      line -> toFloat64OrZero(replaceAll(
        extract(line, '(?i)^Seat\\s+[0-9]+:.*?\\(\\s*([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)'),
        ',',
        ''
      )),
      seat_lines
    ) AS seat_chips,
    trim(extract(hero_dealt_line, '(?i)^Dealt to\\s+(.+?)\\s*\\[')) AS hero_name,
    extractAll(hero_dealt_line, '(?i)(?:10|[2-9TJQKA])[cdhs]') AS hero_cards,
    toUInt8OrZero(extract(hh_text, '(?i)Seat\\s+#?([0-9]+)\\s+is\\s+the\\s+button')) AS button_seat,
    arrayMap(
      line -> trim(extract(line, '(?i)^(.+?)(?::)?\\s+posts')),
      forced_lines
    ) AS forced_names,
    arrayMap(
      line -> lower(extract(line, '(?i)posts(?:\\s+the)?\\s+(ante|small blind|big blind)')),
      forced_lines
    ) AS forced_kinds,
    arrayMap(
      line -> toFloat64OrZero(replaceAll(
        extract(
          line,
          '(?i)posts(?:\\s+the)?\\s+(?:ante|small blind|big blind)\\s*\\[?\\s*([0-9][0-9,.]*)'
        ),
        ',',
        ''
      )),
      forced_lines
    ) AS forced_amounts,
    arrayMap(
      line -> trim(extract(line, '(?i)^(.+?)(?::)?\\s+(?:folds?|calls?|raises?|checks?)\\b')),
      action_lines
    ) AS action_names,
    arrayMap(
      line -> lower(extract(line, '(?i)^.+?(?::)?\\s+(folds?|calls?|raises?|checks?)\\b')),
      action_lines
    ) AS action_verbs
  FROM arrays
),
indexes AS (
  SELECT
    *,
    length(seat_numbers) AS player_count,
    indexOf(seat_names, hero_name) AS hero_seat_index,
    indexOf(seat_numbers, button_seat) AS header_button_seat_index,
    indexOf(action_names, hero_name) AS hero_action_index,
    countEqual(forced_kinds, 'small blind') AS small_blind_count,
    countEqual(forced_kinds, 'big blind') AS big_blind_count,
    indexOf(
      seat_names,
      arrayElement(forced_names, indexOf(forced_kinds, 'small blind'))
    ) AS small_blind_seat_index,
    indexOf(
      seat_names,
      arrayElement(forced_names, indexOf(forced_kinds, 'big blind'))
    ) AS big_blind_seat_index,
    arrayMap(
      seat_name -> arraySum(arrayMap(
        (forced_name, forced_kind, forced_amount) ->
          if(forced_name = seat_name AND forced_kind = 'ante', forced_amount, 0.0),
        forced_names,
        forced_kinds,
        forced_amounts
      )),
      seat_names
    ) AS seat_antes,
    arrayMax(arrayMap(
      (forced_kind, forced_amount) -> if(forced_kind = 'big blind', forced_amount, 0.0),
      forced_kinds,
      forced_amounts
    )) AS posted_big_blind,
    arrayMax(arrayMap(
      (forced_kind, forced_amount) -> if(forced_kind = 'small blind', forced_amount, 0.0),
      forced_kinds,
      forced_amounts
    )) AS posted_small_blind
  FROM tokens
),
resolved_indexes AS (
  SELECT
    *,
    multiIf(
      header_button_seat_index > 0,
      toInt64(header_button_seat_index),
      small_blind_count = 1 AND small_blind_seat_index > 0,
      if(
        small_blind_seat_index = 1,
        toInt64(length(seat_names)),
        toInt64(small_blind_seat_index) - 1
      ),
      toInt64(0)
    ) AS button_seat_index
  FROM indexes
),
geometry AS (
  SELECT
    *,
    greatest(posted_big_blind, posted_small_blind * 2.0) AS big_blind,
    arrayMap(
      seat_index -> modulo(seat_index - button_seat_index + 7, 7),
      arrayEnumerate(seat_names)
    ) AS seat_offsets,
    arrayMap(
      seat_offset -> multiIf(
        seat_offset = 3, 0,
        seat_offset = 4, 1,
        seat_offset = 5, 2,
        seat_offset = 6, 3,
        seat_offset = 0, 4,
        seat_offset = 1, 5,
        seat_offset = 2, 6,
        -1
      ),
      seat_offsets
    ) AS seat_action_orders,
    arrayMap(
      (chips, ante) -> greatest(0.0, chips - ante),
      seat_chips,
      seat_antes
    ) AS decision_stacks,
    modulo(hero_seat_index - button_seat_index + 7, 7) AS hero_offset
  FROM resolved_indexes
),
cards_and_action AS (
  SELECT
    *,
    arrayElement(hero_cards, 1) AS card_1,
    arrayElement(hero_cards, 2) AS card_2,
    replaceAll(upper(substring(card_1, 1, length(card_1) - 1)), '10', 'T') AS rank_1,
    replaceAll(upper(substring(card_2, 1, length(card_2) - 1)), '10', 'T') AS rank_2,
    lower(right(card_1, 1)) AS suit_1,
    lower(right(card_2, 1)) AS suit_2,
    arrayElement(action_lines, hero_action_index) AS hero_action_line,
    arrayElement(action_verbs, hero_action_index) AS hero_action_verb,
    arrayMap(
      amount -> toFloat64OrZero(replaceAll(amount, ',', '')),
      extractAll(hero_action_line, '[0-9][0-9,.]*')
    ) AS hero_action_amounts,
    arraySum(arrayMap(
      (forced_name, forced_kind, forced_amount) ->
        if(
          forced_name = hero_name
            AND forced_kind IN ('small blind', 'big blind'),
          forced_amount,
          0.0
        ),
      forced_names,
      forced_kinds,
      forced_amounts
    )) AS hero_posted_blind,
    arrayElement(seat_action_orders, hero_seat_index) AS hero_action_order,
    arrayElement(decision_stacks, hero_seat_index) AS hero_decision_stack,
    arrayElement(decision_stacks, big_blind_seat_index) AS big_blind_decision_stack,
    arrayFilter(
      (stack, action_order) -> action_order > hero_action_order,
      decision_stacks,
      seat_action_orders
    ) AS stacks_behind
  FROM geometry
),
text_action_context AS (
  SELECT
    *,
    arraySlice(action_names, hero_action_index + 1) AS action_names_after_hero,
    indexOf(
      arraySlice(action_names, hero_action_index + 1),
      hero_name
    ) AS next_hero_action_offset
  FROM cards_and_action
),
text_action_sets AS (
  SELECT
    *,
    arraySlice(
      action_names,
      1,
      if(hero_action_index > 0, toInt64(hero_action_index) - 1, toInt64(0))
    ) AS prior_action_names,
    arraySlice(
      action_verbs,
      1,
      if(hero_action_index > 0, toInt64(hero_action_index) - 1, toInt64(0))
    ) AS prior_action_verbs,
    arrayDistinct(arraySlice(
      action_names_after_hero,
      1,
      if(
        next_hero_action_offset > 0,
        toInt64(next_hero_action_offset) - 1,
        toInt64(length(action_names_after_hero))
      )
    )) AS action_behind_names
  FROM text_action_context
),
text_action_stacks AS (
  SELECT
    *,
    arrayMap(
      actor -> arrayElement(decision_stacks, indexOf(seat_names, actor)),
      arrayFilter(actor -> indexOf(seat_names, actor) > 0, action_behind_names)
    ) AS action_behind_stacks
  FROM text_action_sets
),
text_open_state AS (
  SELECT
    *,
    multiIf(
      hero_offset = 0, toInt8(0),
      hero_offset = 1, toInt8(9),
      hero_offset = 2, toInt8(8),
      hero_offset = 3, toInt8(4),
      hero_offset = 4, toInt8(3),
      hero_offset = 5, toInt8(2),
      hero_offset = 6, toInt8(1),
      toInt8(-1)
    ) AS standard_pos,
    multiIf(
      hero_action_index = 2, toInt8(4),
      hero_action_index = 3, toInt8(3),
      hero_action_index = 4, toInt8(2),
      hero_action_index = 5, toInt8(1),
      hero_action_index = 6, toInt8(0),
      toInt8(-1)
    ) AS dead_small_blind_pos,
    hero_action_index > 0
      AND hero_action_index - 1 = multiIf(
        hero_offset = 3, 0,
        hero_offset = 4, 1,
        hero_offset = 5, 2,
        hero_offset = 6, 3,
        hero_offset = 0, 4,
        hero_offset = 1, 5,
        -1
      )
      AND arrayAll(verb -> startsWith(verb, 'fold'), prior_action_verbs)
      AND arrayAll(
        (actor, action_index) ->
          actor = arrayElement(
            seat_names,
            indexOf(seat_action_orders, action_index - 1)
          ),
        prior_action_names,
        arrayEnumerate(prior_action_names)
      ) AS standard_unopened,
    small_blind_count = 0
      AND big_blind_count = 1
      AND hero_action_index BETWEEN 2 AND 6
      AND arrayAll(verb -> startsWith(verb, 'fold'), prior_action_verbs)
      AND length(arrayDistinct(prior_action_names)) = length(prior_action_names)
      AND arrayAll(
        actor -> actor != hero_name AND indexOf(seat_names, actor) > 0,
        prior_action_names
      )
      AND length(action_behind_stacks) > 0
      AND big_blind_decision_stack > 0 AS dead_small_blind_unopened
  FROM text_action_stacks
),
parsed AS (
  SELECT
    *,
    concat(
      if(position('23456789TJQKA', rank_1) >= position('23456789TJQKA', rank_2), rank_1, rank_2),
      if(position('23456789TJQKA', rank_1) >= position('23456789TJQKA', rank_2), rank_2, rank_1),
      if(rank_1 = rank_2, '', if(suit_1 = suit_2, 's', 'o'))
    ) AS hand_class,
    if(standard_unopened, standard_pos, dead_small_blind_pos) AS pos,
    if(
      NOT standard_unopened AND dead_small_blind_unopened,
      least(
        hero_decision_stack,
        greatest(
          big_blind_decision_stack,
          arrayMax(arrayConcat(action_behind_stacks, [0.0]))
        )
      ),
      least(hero_decision_stack, arrayMax(arrayConcat(stacks_behind, [0.0])))
    ) AS effective_chips,
    arrayElement(hero_action_amounts, -1) AS hero_action_amount,
    positionCaseInsensitive(hero_action_line, 'all-in') > 0
      OR positionCaseInsensitive(hero_action_line, 'all in') > 0 AS explicit_allin,
    standard_unopened OR dead_small_blind_unopened AS unopened
  FROM text_open_state
),
text_observations AS (
  SELECT
    user_id,
    network,
    hh_id,
    played_ts,
    hand_class,
    pos,
    big_blind,
    effective_chips,
    hero_action_amount,
    hero_action_amount + hero_posted_blind AS hero_commitment_amount,
    toUInt8(explicit_allin) AS explicit_allin,
    multiIf(
      startsWith(hero_action_verb, 'raise') AND (
        explicit_allin
          OR hero_action_amount + hero_posted_blind
            >= effective_chips - 0.01 * big_blind
      ), 'shove',
      startsWith(hero_action_verb, 'raise'), 'raise',
      startsWith(hero_action_verb, 'call'), 'limp',
      startsWith(hero_action_verb, 'fold'), 'fold',
      'other'
    ) AS action_class
  FROM parsed
  WHERE player_count = 7
    AND length(seat_numbers) = 7
    AND length(arrayDistinct(seat_numbers)) = 7
    AND length(hero_dealt_lines) = 1
    AND length(hero_cards) = 2
    AND hero_cards[1] != hero_cards[2]
    AND (hero_name = source_nickname OR lower(hero_name) = 'hero')
    AND hero_seat_index > 0
    AND button_seat_index > 0
    AND hero_action_index > 0
    AND unopened
    AND pos IN (0, 1, 2, 3, 4, 9)
    AND big_blind > 0
    AND effective_chips > 0
    AND effective_chips / big_blind <= 200
    AND action_class IN ('raise', 'shove', 'limp', 'fold')
    AND match(hand_class, '^(?:[2-9TJQKA]{2})(?:[so])?$')
),
ip_lexical AS (
  SELECT
    *,
    x.1 AS played_ts,
    x.2 AS source_nickname,
    x.3 AS hh_text,
    arrayDistinct(extractAll(
      x.3,
      '(?is)<player\\b[^>]*>'
    )) AS player_nodes,
    arrayDistinct(extractAll(
      x.3,
      '(?is)<cards\\b[^>]*>[^<]*</cards>'
    )) AS pocket_nodes,
    extractAll(
      x.3,
      '(?is)<round\\b[^>]*\\bno="0"[^>]*>(.*?)</round>'
    ) AS round_zero_payloads,
    extractAll(
      x.3,
      '(?is)<round\\b[^>]*\\bno="1"[^>]*>(.*?)</round>'
    ) AS round_one_payloads,
    toFloat64OrZero(replaceRegexpAll(
      extract(x.3, '(?is)<bigblind>([^<]*)</bigblind>'),
      '[^0-9.-]',
      ''
    )) AS big_blind
  FROM latest_raw
  WHERE network = 'iPoker'
),
ip_arrays AS (
  SELECT
    *,
    arraySort(arrayMap(
      node -> toUInt8OrZero(extract(node, '(?i)\\bseat="([0-9]+)"')),
      player_nodes
    )) AS seat_numbers,
    arrayMap(
      seat_no -> arrayFirst(
        node ->
          toUInt8OrZero(extract(node, '(?i)\\bseat="([0-9]+)"')) = seat_no,
        player_nodes
      ),
      seat_numbers
    ) AS seat_nodes,
    arrayFilter(
      node ->
        extract(node, '(?i)\\btype="([^"]*)"') = 'Pocket'
          AND extract(node, '(?i)\\bplayer="([^"]*)"') = source_nickname,
      pocket_nodes
    ) AS hero_pocket_nodes,
    extractAll(
      arrayElement(round_zero_payloads, 1),
      '(?is)<action\\b[^>]*\\/>'
    ) AS forced_action_nodes,
    extractAll(
      arrayElement(round_one_payloads, 1),
      '(?is)<action\\b[^>]*\\/>'
    ) AS preflop_action_nodes
  FROM ip_lexical
),
ip_tokens AS (
  SELECT
    *,
    arrayMap(
      node -> extract(node, '(?i)\\bname="([^"]*)"'),
      seat_nodes
    ) AS seat_names,
    arrayMap(
      node -> toFloat64OrZero(replaceRegexpAll(
        extract(node, '(?i)\\bchips="([^"]*)"'),
        '[^0-9.-]',
        ''
      )),
      seat_nodes
    ) AS seat_chips,
    arrayMap(
      node -> toUInt8OrZero(extract(node, '(?i)\\bdealer="([01])"')),
      seat_nodes
    ) AS dealer_flags,
    extractAll(
      extract(
        arrayElement(hero_pocket_nodes, 1),
        '(?is)>([^<]*)</cards>'
      ),
      '(?i)[CDHS](?:10|[2-9TJQKA])'
    ) AS hero_cards,
    arrayMap(
      node -> extract(node, '(?i)\\bplayer="([^"]*)"'),
      forced_action_nodes
    ) AS forced_names,
    arrayMap(
      node -> extract(node, '(?i)\\btype="([^"]*)"'),
      forced_action_nodes
    ) AS forced_types,
    arrayMap(
      node -> toFloat64OrZero(replaceRegexpAll(
        extract(node, '(?i)\\bsum="([^"]*)"'),
        '[^0-9.-]',
        ''
      )),
      forced_action_nodes
    ) AS forced_amounts,
    arrayMap(
      node -> extract(node, '(?i)\\bplayer="([^"]*)"'),
      preflop_action_nodes
    ) AS action_names,
    arrayMap(
      node -> extract(node, '(?i)\\btype="([^"]*)"'),
      preflop_action_nodes
    ) AS action_types,
    arrayMap(
      node -> toFloat64OrZero(replaceRegexpAll(
        extract(node, '(?i)\\bsum="([^"]*)"'),
        '[^0-9.-]',
        ''
      )),
      preflop_action_nodes
    ) AS action_amounts
  FROM ip_arrays
),
ip_indexes AS (
  SELECT
    *,
    length(seat_numbers) AS player_count,
    indexOf(seat_names, source_nickname) AS hero_seat_index,
    indexOf(dealer_flags, toUInt8(1)) AS dealer_button_seat_index,
    countEqual(dealer_flags, toUInt8(1)) AS button_count,
    indexOf(action_names, source_nickname) AS hero_action_index,
    countEqual(forced_types, '1') AS small_blind_count,
    countEqual(forced_types, '2') AS big_blind_count,
    indexOf(
      seat_names,
      arrayElement(forced_names, indexOf(forced_types, '1'))
    ) AS small_blind_seat_index,
    indexOf(
      seat_names,
      arrayElement(forced_names, indexOf(forced_types, '2'))
    ) AS big_blind_seat_index,
    arrayMap(
      seat_name -> arraySum(arrayMap(
        (forced_name, forced_type, forced_amount) ->
          if(
            forced_name = seat_name AND forced_type = '15',
            forced_amount,
            0.0
          ),
        forced_names,
        forced_types,
        forced_amounts
      )),
      seat_names
    ) AS seat_antes
  FROM ip_tokens
),
ip_resolved_indexes AS (
  SELECT
    *,
    multiIf(
      button_count = 1,
      toInt64(dealer_button_seat_index),
      button_count = 0 AND small_blind_count = 1 AND small_blind_seat_index > 0,
      if(
        small_blind_seat_index = 1,
        toInt64(length(seat_names)),
        toInt64(small_blind_seat_index) - 1
      ),
      toInt64(0)
    ) AS button_seat_index
  FROM ip_indexes
),
ip_geometry AS (
  SELECT
    *,
    arrayMap(
      seat_index -> modulo(seat_index - button_seat_index + 7, 7),
      arrayEnumerate(seat_names)
    ) AS seat_offsets,
    arrayMap(
      seat_offset -> multiIf(
        seat_offset = 3, 0,
        seat_offset = 4, 1,
        seat_offset = 5, 2,
        seat_offset = 6, 3,
        seat_offset = 0, 4,
        seat_offset = 1, 5,
        seat_offset = 2, 6,
        -1
      ),
      seat_offsets
    ) AS seat_action_orders,
    arrayMap(
      (chips, ante) -> greatest(0.0, chips - ante),
      seat_chips,
      seat_antes
    ) AS decision_stacks,
    modulo(hero_seat_index - button_seat_index + 7, 7) AS hero_offset
  FROM ip_resolved_indexes
),
ip_cards_and_action AS (
  SELECT
    *,
    arrayElement(hero_cards, 1) AS card_1,
    arrayElement(hero_cards, 2) AS card_2,
    replaceAll(upper(substring(card_1, 2)), '10', 'T') AS rank_1,
    replaceAll(upper(substring(card_2, 2)), '10', 'T') AS rank_2,
    lower(left(card_1, 1)) AS suit_1,
    lower(left(card_2, 1)) AS suit_2,
    arrayElement(action_types, hero_action_index) AS hero_action_type,
    arrayElement(action_amounts, hero_action_index) AS hero_action_amount,
    arrayElement(seat_action_orders, hero_seat_index) AS hero_action_order,
    arrayElement(decision_stacks, hero_seat_index) AS hero_decision_stack,
    arrayElement(decision_stacks, big_blind_seat_index) AS big_blind_decision_stack,
    arrayFilter(
      (stack, action_order) -> action_order > hero_action_order,
      decision_stacks,
      seat_action_orders
    ) AS stacks_behind
  FROM ip_geometry
),
ip_action_context AS (
  SELECT
    *,
    arraySlice(action_names, hero_action_index + 1) AS action_names_after_hero,
    indexOf(
      arraySlice(action_names, hero_action_index + 1),
      source_nickname
    ) AS next_hero_action_offset
  FROM ip_cards_and_action
),
ip_action_sets AS (
  SELECT
    *,
    arraySlice(
      action_names,
      1,
      if(hero_action_index > 0, toInt64(hero_action_index) - 1, toInt64(0))
    ) AS prior_action_names,
    arraySlice(
      action_types,
      1,
      if(hero_action_index > 0, toInt64(hero_action_index) - 1, toInt64(0))
    ) AS prior_action_types,
    arrayDistinct(arraySlice(
      action_names_after_hero,
      1,
      if(
        next_hero_action_offset > 0,
        toInt64(next_hero_action_offset) - 1,
        toInt64(length(action_names_after_hero))
      )
    )) AS action_behind_names
  FROM ip_action_context
),
ip_action_stacks AS (
  SELECT
    *,
    arrayMap(
      actor -> arrayElement(decision_stacks, indexOf(seat_names, actor)),
      arrayFilter(actor -> indexOf(seat_names, actor) > 0, action_behind_names)
    ) AS action_behind_stacks
  FROM ip_action_sets
),
ip_open_state AS (
  SELECT
    *,
    multiIf(
      hero_offset = 0, toInt8(0),
      hero_offset = 1, toInt8(9),
      hero_offset = 2, toInt8(8),
      hero_offset = 3, toInt8(4),
      hero_offset = 4, toInt8(3),
      hero_offset = 5, toInt8(2),
      hero_offset = 6, toInt8(1),
      toInt8(-1)
    ) AS standard_pos,
    multiIf(
      hero_action_index = 2, toInt8(4),
      hero_action_index = 3, toInt8(3),
      hero_action_index = 4, toInt8(2),
      hero_action_index = 5, toInt8(1),
      hero_action_index = 6, toInt8(0),
      toInt8(-1)
    ) AS dead_small_blind_pos,
    hero_action_index > 0
      AND hero_action_index - 1 = multiIf(
        hero_offset = 3, 0,
        hero_offset = 4, 1,
        hero_offset = 5, 2,
        hero_offset = 6, 3,
        hero_offset = 0, 4,
        hero_offset = 1, 5,
        -1
      )
      AND arrayAll(type -> type = '0', prior_action_types)
      AND arrayAll(
        (actor, action_index) ->
          actor = arrayElement(
            seat_names,
            indexOf(seat_action_orders, action_index - 1)
          ),
        prior_action_names,
        arrayEnumerate(prior_action_names)
      ) AS standard_unopened,
    small_blind_count = 0
      AND big_blind_count = 1
      AND hero_action_index BETWEEN 2 AND 6
      AND arrayAll(type -> type = '0', prior_action_types)
      AND length(arrayDistinct(prior_action_names)) = length(prior_action_names)
      AND arrayAll(
        actor -> actor != source_nickname AND indexOf(seat_names, actor) > 0,
        prior_action_names
      )
      AND length(action_behind_stacks) > 0
      AND big_blind_decision_stack > 0 AS dead_small_blind_unopened
  FROM ip_action_stacks
),
ip_parsed AS (
  SELECT
    *,
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
    ) AS hand_class,
    if(standard_unopened, standard_pos, dead_small_blind_pos) AS pos,
    if(
      NOT standard_unopened AND dead_small_blind_unopened,
      least(
        hero_decision_stack,
        greatest(
          big_blind_decision_stack,
          arrayMax(arrayConcat(action_behind_stacks, [0.0]))
        )
      ),
      least(
        hero_decision_stack,
        arrayMax(arrayConcat(stacks_behind, [0.0]))
      )
    ) AS effective_chips,
    hero_action_type = '7' AS explicit_allin,
    standard_unopened OR dead_small_blind_unopened AS unopened
  FROM ip_open_state
),
ip_observations AS (
  SELECT
    user_id,
    network,
    hh_id,
    played_ts,
    hand_class,
    pos,
    big_blind,
    effective_chips,
    hero_action_amount,
    hero_action_amount AS hero_commitment_amount,
    toUInt8(explicit_allin) AS explicit_allin,
    multiIf(
      hero_action_type = '23'
        AND hero_action_amount >= effective_chips - 0.01 * big_blind,
      'shove',
      hero_action_type = '23',
      'raise',
      hero_action_type = '3',
      'limp',
      hero_action_type = '0',
      'fold',
      hero_action_type = '7' AND hero_action_amount > big_blind,
      'shove',
      hero_action_type = '7',
      'limp',
      'other'
    ) AS action_class
  FROM ip_parsed
  WHERE length(round_zero_payloads) = 1
    AND length(round_one_payloads) = 1
    AND player_count = 7
    AND length(arrayDistinct(seat_numbers)) = 7
    AND countEqual(seat_numbers, toUInt8(0)) = 0
    AND length(hero_pocket_nodes) = 1
    AND length(hero_cards) = 2
    AND hero_cards[1] != hero_cards[2]
    AND hero_seat_index > 0
    AND button_seat_index > 0
    AND hero_action_index > 0
    AND unopened
    AND pos IN (0, 1, 2, 3, 4, 9)
    AND big_blind > 0
    AND effective_chips > 0
    AND effective_chips / big_blind <= 200
    AND action_class IN ('raise', 'shove', 'limp', 'fold')
    AND match(hand_class, '^(?:[2-9TJQKA]{2})(?:[so])?$')
),
observations AS (
  SELECT * FROM text_observations
  UNION ALL
  SELECT * FROM ip_observations
),
classified AS (
  SELECT
    m.cohort,
    o.*,
    effective_chips / big_blind AS stackbb,
    multiIf(
      pos = 4, 'EP',
      pos = 3, 'MP',
      pos = 2, 'HJ',
      pos = 1, 'CO',
      pos = 0, 'BTN',
      pos = 9, 'SB',
      ''
    ) AS position_group,
    multiIf(pos = 4, 1, pos = 3, 2, pos = 2, 3, pos = 1, 4, pos = 0, 5, pos = 9, 6, 0) AS position_order,
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
  FROM observations AS o
  INNER JOIN members AS m ON o.user_id = m.member_user_id
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
  sum(count()) OVER state_window AS known_card_opportunities,
  toUInt64(0) AS lookup_mismatch_opportunities,
  toString(min(min(c.played_ts)) OVER state_window) AS first_observed_at,
  toString(max(max(c.played_ts)) OVER state_window) AS last_observed_at,
  count() AS opportunities,
  countIf(action_class IN ('raise', 'shove')) AS raises_total,
  countIf(action_class = 'raise') AS regular_raise,
  countIf(action_class = 'shove') AS open_shove,
  countIf(action_class = 'limp') AS limp,
  countIf(action_class = 'fold') AS fold_other,
  countIf(action_class = 'shove' AND explicit_allin) AS shove_allin_flag,
  countIf(action_class = 'shove' AND NOT explicit_allin) AS shove_effective_amount_only,
  countIf(
    action_class = 'raise'
    AND hero_commitment_amount / big_blind BETWEEN 2.5 AND 3.5
    AND stackbb > hero_commitment_amount / big_blind + 0.01
  ) AS regular_three_bb_open,
  countIf(
    action_class = 'shove'
    AND NOT explicit_allin
    AND hero_commitment_amount / big_blind BETWEEN 2.5 AND 3.5
    AND stackbb > hero_commitment_amount / big_blind + 0.01
  ) AS normal_three_bb_as_shove,
  toUInt64(0) AS non_exact_r_effective_allin,
  round(100.0 * countIf(action_class IN ('raise', 'shove')) / count(), 3) AS raise_total_pct,
  round(100.0 * countIf(action_class = 'raise') / count(), 3) AS regular_raise_pct,
  round(100.0 * countIf(action_class = 'shove') / count(), 3) AS open_shove_pct,
  round(100.0 * countIf(action_class = 'limp') / count(), 3) AS limp_pct,
  round(100.0 * countIf(action_class = 'fold') / count(), 3) AS fold_pct,
  toUInt8(count() < 50) AS below_exact_minimum,
  toUInt8(count() < 100) AS low_sample
FROM classified AS c
INNER JOIN membership_counts AS mc ON c.cohort = mc.cohort
GROUP BY c.cohort, c.position_group, c.position_order, position_code, c.stack_bucket, c.stack_order, c.hand_class
WINDOW state_window AS (
  PARTITION BY c.cohort, c.position_group, c.position_order, position_code, c.stack_bucket, c.stack_order
)
ORDER BY c.cohort, stack_order, position_order, hand_class;
