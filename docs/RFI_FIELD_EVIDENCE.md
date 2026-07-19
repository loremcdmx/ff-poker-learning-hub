# RFI field evidence for the first carousel slide

Updated: 2026-07-19.

The first RFI carousel slide shows the full 7-max position ladder from EP to SB. “Players behind” is the standard 7-max positional projection: `EP 6`, `MP 5`, `HJ 4`, `CO 3`, `BTN 2`, `SB 1`.

## Measured FF outcomes

| Spot | Players behind | Regular opens | Excluded open shoves | Everyone folded | Faced a 3-bet |
| --- | ---: | ---: | ---: | ---: | ---: |
| EP | 6 | 450,692 | 633 | 56,627 (12.5645%) | 139,498 (30.9520%) |
| MP | 5 | 403,829 | 608 | 55,919 (13.8472%) | 117,402 (29.0722%) |
| HJ | 4 | 352,286 | 591 | 54,710 (15.5300%) | 96,611 (27.4240%) |
| CO | 3 | 343,662 | 948 | 61,398 (17.8658%) | 87,987 (25.6028%) |
| BTN | 2 | 343,557 | 2,706 | 74,844 (21.7850%) | 77,731 (22.6254%) |
| SB | 1 | 139,052 | 10,293 | 63,391 (45.5880%) | 16,478 (11.8502%) |

The UI rounds every value to one decimal place. In order from EP to SB, the displayed FE / faced-3-bet pairs are: `12.6 / 31.0`, `13.8 / 29.1`, `15.5 / 27.4`, `17.9 / 25.6`, `21.8 / 22.6`, `45.6 / 11.9`.

The audit found 15,779 direct open shoves inside the otherwise eligible 30 BB+ rows (and 61,602 at the former 15 BB+ boundary). Stack depth alone therefore does not remove them. A direct open shove is classified as `is_rfi = 1 AND is_preflop_allin = 1 AND preflop_action = 'R'`; these rows are excluded from both rate numerators and the shared denominator. The published 30 BB+ sample contains 2,033,078 regular opens and zero direct open shoves. Do not replace this with a blanket `is_preflop_allin != 1` filter: that would also discard ordinary opens whose opener only moved all-in later after a 3-bet.

Source and boundaries:

- ClickHouse table: `analytics.int_tracker_hand_joined`.
- Query: `assets/poker-rfi-open-lesson/tools/q_ff_rfi_position_pressure.sql` (FunFarm MCP ClickHouse, rerun 2026-07-19).
- Cohort: the 1,131 active real FF players in `training_league = 3` from the July 12 RFI user-id snapshot.
- Hand window: 2026-01-01 through 2026-07-11.
- Filters: unopened pot, actual `cnt_players = 7`, stack at least 30 BB, known hole cards, valid BB amount, `position IN (4, 3, 2, 1, 0, 9)`.
- Replacing-table versions are collapsed by `hand_player_id` with `argMax(..., version)` before aggregation.
- `regular_open` is `is_rfi = 1` excluding the direct-open-shove contract above.
- “Everyone folded” is the operational proxy `regular_open AND is_preflop_face_3bet != 1 AND is_saw_flop != 1`.
- “Faced a 3-bet” is `regular_open AND is_preflop_face_3bet = 1`.

The exact 30 BB+ publication rerun was `mcp_ch_job_2c8ecc957c824ba2b68e8f7481bb4f6b`; an independent 15 BB+ versus 30 BB+ contamination audit was `mcp_ch_job_6007b6de5a9f4df99e14199a30dce119`. Both used the frozen 1,131-player cohort and returned the same 30 BB+ rates and exclusion counts.

Adjacent source artifacts in the research working copy:

- `outputs/third-league-rfi-2026-07-12/queries.sql`
- `outputs/third-league-rfi-2026-07-12/ep_handclass_by_user_stack.csv`
- `outputs/third-league-rfi-mp-btn-2026-07-12/mp_btn_handclass_clustered.csv`

## Probability illustration

The slide separately uses a simple teaching assumption: each remaining opponent has a strong hand 5% of the time.

```text
P(at least one strong hand) = 1 - (1 - p)^n

six players: 1 - 0.95^6 = 26.49%
two players: 1 - 0.95^2 = 9.75%
```

This is an illustration of the “more players, more chances someone wakes up strong” mechanism. It is not a fitted prediction of the measured fold-through or 3-bet rates: the 5% threshold is an explicit teaching assumption, opponents’ cards are not fully independent, and real strategies differ by position.
