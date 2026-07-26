# RFI field evidence for the first carousel slide

Updated: 2026-07-26.

## Exact 7-max field-action cube

The observed field selector is published for the closed UTC window
`[2023-09-01, 2026-07-26)`. It contains 30 complete public states:
5 stack bands × 6 positions, with 4 cohort charts per state and 169/169 hands
per chart. Every cell has `N >= 50`; the observed minimum is 55.

The public stack bands are `70+`, `30–70`, `20–30`, `15–20`, `<15`. The last
band is exact integer addition of the five non-overlapping raw buckets below
15 BB before rates are computed. This is the narrowest source-faithful
publication that clears the fixed threshold; keeping separate `10–15` and
`<10` selectors left two late-position states below it. No smoothing, model,
copied neighbour or disabled selector is used.

Reconciliation:

- exact source rows: 36,504;
- known-card opportunities: 65,334,010 of 74,722,772 (`87.435206%`);
- source CSV SHA-256:
  `12271ff6005957d0fe58fd24066195dfc90e04544228af207e4ce3296daeed3b`;
- browser payload SHA-256:
  `445631a7851b4eb771e5c47a4969a1cb5f6abcb8bf243f32c36146a727e845ef`;
- publication templates:
  structured `9e06fa18c5889fd12e00cab250af6dc17ad1d543f4ef67a4cbf65351c6093cde`,
  missing-card recovery
  `56a80f377f72dfb1f52e42b9157509419ed1c04dd30dfc1045503051e2540533`,
  Coin/Party supplement
  `0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959`.

The dedicated CoinPoker/PartyPoker supplement adds 5,108 exact opportunities
from eight executed immutable shards: 1,253 regular raises, 137 open shoves,
86 limps and 3,632 folds. Zero-row shards remain in the public provenance so
an empty partition cannot be confused with an omitted one. Raw histories,
membership exports and player identifiers remain outside the repository and
deploy tree.

`node scripts/check-release-data-readiness.mjs` is the release authority for
this surface and must report all six data surfaces as `READY`.

The first RFI carousel slide shows the full 7-max position ladder from EP to SB. “Players behind” is the standard 7-max positional projection: `EP 6`, `MP 5`, `HJ 4`, `CO 3`, `BTN 2`, `SB 1`.

## Measured FF outcomes

Every percentage below uses the `Regular opens` value in the same row as its denominator.

| Spot | Players behind | Regular opens | Excluded open shoves | Took pot before flop | Reraised | Old proxy | Old-proxy false positives |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| EP | 6 | 455,647 | 637 | 46,077 (10.1124%) | 156,143 (34.2684%) | 57,340 (12.5843%) | 11,263 |
| MP | 5 | 408,207 | 611 | 48,430 (11.8641%) | 129,215 (31.6543%) | 56,618 (13.8699%) | 8,188 |
| HJ | 4 | 356,403 | 592 | 49,668 (13.9359%) | 104,886 (29.4290%) | 55,390 (15.5414%) | 5,722 |
| CO | 3 | 347,707 | 955 | 58,031 (16.6896%) | 94,023 (27.0409%) | 62,167 (17.8791%) | 4,136 |
| BTN | 2 | 347,444 | 2,746 | 73,473 (21.1467%) | 81,229 (23.3790%) | 75,742 (21.7998%) | 2,269 |
| SB | 1 | 140,517 | 10,394 | 64,065 (45.5923%) | 16,632 (11.8363%) | 64,065 (45.5923%) | 0 |

The UI rounds the strict `Took pot before flop` and `Reraised` rates to one decimal place. In order from EP to SB, the displayed pairs are: `10.1 / 34.3`, `11.9 / 31.7`, `13.9 / 29.4`, `16.7 / 27.0`, `21.1 / 23.4`, `45.6 / 11.8`.

The strict rerun contains 2,055,925 regular opens and excludes 15,935 direct open shoves. Stack depth alone does not remove them. A direct open shove is classified as `is_rfi = 1 AND is_preflop_allin = 1 AND preflop_action = 'R'`; these rows are excluded from both rate numerators and the shared denominator. Do not replace this with a blanket `is_preflop_allin != 1` filter: that would also discard ordinary opens whose opener only moved all-in later after a reraise.

The superseded proxy counted `31,578` false positives: the hand did not reach a flop and the tracker did not set `is_preflop_face_3bet`, but the opener had made more than the initial raise. Of those false positives, `31,367` were explicitly `preflop_action = 'RF'` with `is_preflop_face_4bet = 1` (`EP 11,162`, `MP 8,127`, `HJ 5,692`, `CO 4,120`, `BTN 2,266`, `SB 0`).

Source and boundaries:

- ClickHouse table: `analytics.int_tracker_hand_joined`.
- Query: `assets/poker-rfi-open-lesson/tools/q_ff_rfi_position_pressure.sql` (FunFarm MCP ClickHouse, rerun 2026-07-26).
- Cohort: the 1,131 active real FF players in `training_league = 3` from the July 12 RFI user-id snapshot.
- Hand window: 2026-01-01 through 2026-07-11.
- Filters: unopened pot, actual `cnt_players = 7`, stack at least 30 BB, known hole cards, valid BB amount, `position IN (4, 3, 2, 1, 0, 9)`.
- Replacing-table versions are collapsed by `hand_player_id` with `argMax(..., version)` before aggregation.
- `regular_open` is `is_rfi = 1` excluding the direct-open-shove contract above.
- “Took pot before flop” is the strict event `regular_open AND preflop_action = 'R' AND cnt_flop_players = 0`.
- “Reraised” is `regular_open AND (is_preflop_face_3bet = 1 OR is_preflop_face_4bet = 1)`.
- “Old proxy” is retained only as a diagnostic: `regular_open AND is_preflop_face_3bet != 1 AND is_saw_flop != 1`.

The strict publication rerun was `mcp_ch_job_9c70a38dce7649beb5abbfc0fe7f14ef`. Rendered SQL SHA-256: `3376d2837536cbf48a3fb28fb72a34f647c3150eebd8d6391eb1a39351afba15`. Result CSV SHA-256: `ab44bd36c730097629449a16e69b2813ba754835380b621e1b9b65f3301e7707`.

The execution export is retained outside the public tree at `/private/tmp/ff-rfi-position-pressure-strict-20260726.csv`; the result hash above is the durable reconciliation key. The query also reports `49,307` rows where `cnt_players_lookup_position != 7`. This diagnostic does not alter the frozen publication filter, which is based on actual `cnt_players = 7`, but it remains visible here rather than being silently discarded.

## Probability illustration

The slide separately uses a simple teaching assumption: each remaining opponent has a strong hand 5% of the time.

```text
P(at least one strong hand) = 1 - (1 - p)^n

six players: 1 - 0.95^6 = 26.49%
two players: 1 - 0.95^2 = 9.75%
```

This is an illustration of the “more players, more chances someone wakes up strong” mechanism. It is not a fitted prediction of the measured took-pot-before-flop or reraised rates: the 5% threshold is an explicit teaching assumption, opponents’ cards are not fully independent, and real strategies differ by position.
