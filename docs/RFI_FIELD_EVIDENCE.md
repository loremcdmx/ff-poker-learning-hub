# RFI field evidence for the first carousel slide

Updated: 2026-07-18.

The first RFI carousel slide shows the full 7-max position ladder from EP to SB. “Players behind” is the standard 7-max positional projection: `EP 6`, `MP 5`, `HJ 4`, `CO 3`, `BTN 2`, `SB 1`.

## Measured FF outcomes

| Spot | Players behind | Opens | Everyone folded | Faced a 3-bet |
| --- | ---: | ---: | ---: | ---: |
| EP | 6 | 531,339 | 71,004 (13.3632%) | 162,552 (30.5929%) |
| MP | 5 | 476,202 | 70,105 (14.7217%) | 136,949 (28.7586%) |
| HJ | 4 | 417,380 | 68,637 (16.4447%) | 113,256 (27.1350%) |
| CO | 3 | 406,960 | 76,849 (18.8837%) | 103,153 (25.3472%) |
| BTN | 2 | 410,021 | 95,126 (23.2003%) | 91,790 (22.3867%) |
| SB | 1 | 179,207 | 87,271 (48.6984%) | 19,234 (10.7328%) |

The UI rounds every value to one decimal place. In order from EP to SB, the displayed FE / faced-3-bet pairs are: `13.4 / 30.6`, `14.7 / 28.8`, `16.4 / 27.1`, `18.9 / 25.3`, `23.2 / 22.4`, `48.7 / 10.7`.

Source and boundaries:

- ClickHouse table: `analytics.int_tracker_hand_joined`.
- Query: `assets/poker-rfi-open-lesson/tools/q_ff_rfi_position_pressure.sql` (FunFarm MCP ClickHouse, rerun 2026-07-18).
- Cohort: the 1,131 active real FF players in `training_league = 3` from the July 12 RFI user-id snapshot.
- Hand window: 2026-01-01 through 2026-07-11.
- Filters: unopened pot, actual `cnt_players = 7`, stack at least 15 BB, known hole cards, valid BB amount, `position IN (4, 3, 2, 1, 0, 9)`.
- Replacing-table versions are collapsed by `hand_player_id` with `argMax(..., version)` before aggregation.
- “Everyone folded” is the operational proxy `is_rfi = 1 AND is_preflop_face_3bet != 1 AND is_saw_flop != 1`.
- “Faced a 3-bet” is `is_rfi = 1 AND is_preflop_face_3bet = 1`.

The original July 13 endpoint job was `mcp_ch_job_e430098b2fb14271b7d27c6cfdce6627`. The July 18 rerun sees later backfills inside the same hand window, so the raw counts are larger, while both previously published endpoint values retain the same one-decimal rounding.

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
