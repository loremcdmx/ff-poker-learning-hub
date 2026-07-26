# Postflop field sources and release provenance

Status on 2026-07-22: **blocked / methodology-only**. No learner-facing
postflop frequency has been built from the current exact source set. Partial
current shards, the older Q2 sample, and queued jobs are not publishable.

This document deliberately separates three different things that must not be
called the same source:

1. an all-history **candidate-availability probe**;
2. the current exact **Q2 raw-HH rebuild**;
3. a pending full-window **latest-first hand-level mart cube**.

## 1. All-history candidate availability is not raw-HH coverage

`all-history-candidate-probe.sql` counts monthly distinct candidate keys for a
strict RFI-vs-BB node in `analytics.int_tracker_hand_joined`. Its saved output,
`all-history-candidate-counts-by-month.csv`, contains 34 months and 36,087,079
candidate keys.

- Probe SQL SHA-256:
  `a1c957645d7b08dd28ea15d7f5d9d97b8d9a4511039c55b737c8963cd019b63f`.
- Saved counts SHA-256:
  `0a2c235172367e03a12df9efd1a3e8b6f4702da8d6d2d880e8d7d97f824c0aa2`.

The probe is availability evidence only. It does not select latest by
`hand_player_id`, attach exact rank at the hand timestamp, find a raw HH for
every key, parse the action sequence, or certify board and sizing coverage.
Its total and period must never be rendered as a completed "full history"
browser sample.

## 2. Exact Q2 raw-HH rebuild

The reproducible raw-HH window is `[2026-04-01, 2026-07-01)`. The reviewed
extract is `q2-all-residue-extract.sql`, SHA-256
`bd316c81f1f5113b9a6a716b02c29aa1f185eccdba046d29f08d8c405db912f2`.
It partitions physical candidate keys into 200 disjoint residues. The query
selects the latest raw text for each source hand key by `created_at`; the
offline parser must then verify exact positions, the action sequence, board,
sizes, and rank at the hand timestamp.

The current candidate manifest contains 3,627,195 keys. That number proves the
candidate set, not raw-HH coverage. The current rebuild is incomplete:

| Residues | Current rows | SHA-256 | Status |
| --- | ---: | --- | --- |
| 140–160 | 330,269 | `4192d49595cd8c161f4d4911b82c9c5e0e0fd850cec54dcb6e7361434bb6863d` | downloaded, partial only |
| 160–180 | 330,082 | `61c4d4295430a7704a04ad8466890519a452b967847c5657d211cf1c38ec87a5` | downloaded, partial only |

The remaining current residue jobs were queued at the last provider check:

| Residues | Async job |
| --- | --- |
| 0–20 | `mcp_ch_job_4a680f96d59a4fbdb82c7348dc248012` |
| 20–40 | `mcp_ch_job_bcada3911ce84dd19848444c85befc07` |
| 40–60 | `mcp_ch_job_2922aaa6618141c8abbb1ea221b5962b` |
| 60–80 | `mcp_ch_job_a40c1077c8a144f48448a4aaa0e18c6d` |
| 80–100 | `mcp_ch_job_1a29cd80f44e4fef9ac5a4f3a2c52cd0` |
| 100–120 | `mcp_ch_job_e0d3213c57d44a2f9b44400f5ea9a283` |
| 120–140 | `mcp_ch_job_9ffe1df9b9c9489b8c1a957731994127` |
| 180–190 | `mcp_ch_job_2edd6655e5c34243aeea7be13749fab5` |
| 190–200 | `mcp_ch_job_37dd95382dfc42c7a59319b034382665` |

No additive merge is allowed until all 200 current residues are present, the
candidate manifest reconciles exactly, result hashes are recorded, and the
parser controls pass. Older 0–140 files belong to a different source snapshot
and must not be mixed with the current 140–180 files. The older deterministic
70% Q2 sample and its derived counts are retired from browser use.

Board, exact-hand, texture, and matched-sizing claims can come only from this
raw-HH pipeline. Because the current rebuild is incomplete, none is currently
published as observed field evidence.

## 3. Pending latest-first hand-level mart cube

`full-history-postflop-field-cube.sql` can build aggregate action counts from
`analytics.int_tracker_hand_joined`. It is a hand-level mart query, not a
raw-HH query. It can support aggregate c-bet and BB-response comparisons by
position and effective stack after completion, but cannot by itself certify
exact cards, board texture, or sizing.

- Query-template SHA-256:
  `df9f14a6140cb82d16cd568eafb512fbbb97f9a111c655df6bbb7e5ae81dccfe`.
- Target window: `[2023-09-01, 2026-07-22)` UTC, half-open.
- Latest key: `hand_player_id`.
- Latest ordering: `version`, then the complete projected tuple as a
  deterministic equal-version tie-break.
- Ordering boundary: latest is selected before poker and business predicates.
- Rank timing: exact rank at the hand timestamp, joined to half-open rank
  intervals.
- Disjoint cohorts: League 1 `R1–5`, League 2 `R6–10`, League 3 `R11–14`,
  newcomers `R15–18`.
- Shared publication floor: `N >= 50`; `N=49` is hidden and `N=50` is shown.

The c-bet node is unopened single RFI, BB the only caller, heads-up flop and IP
opportunity to c-bet. The BB-response node is one CO/BTN open of `1.5–3.0 BB`,
no limpers, BB call, heads-up flop, effective stack at least `20 BB`, BB check,
and faced c-bet. Fold, call, raise, and residue share one response denominator;
non-zero residue blocks publication.

### Rank bridge

- BigQuery job: `mcp_bq_job_0795894633234a1dbed2032ae29ee179`.
- Source rows: 19,699.
- Valid non-empty intervals: 19,698.
- Users represented: 3,881.
- Private interval-input SHA-256:
  `7510e40b42cad7bf6bce6dbca9c2ba0f5d157a8ff2df5b7f9f28ca37eafb1d9e`.

The private interval rows remain outside the repository.

### Proof run, not release data

The template passed one bounded proof run for League 1 over
`[2026-06-01, 2026-07-01)`: 222 rank intervals, 186 users, 33 output groups.
All c-bet and BB-response action identities balanced, BB residue was zero, and
the observed hand timestamps covered June. This verifies the query shape; it
does not prove the target window or authorize browser publication.

### Queued full-window attempts, not release data

The earlier full-window cohort jobs were still queued at the last provider
check and have never been injected:

| Rank shard | Async job |
| --- | --- |
| R1–5 | `mcp_ch_job_35662166e13643bc81a9304c045c57f1` |
| R6–10 | `mcp_ch_job_ce3cf17448a34986a8972181591d5e01` |
| R11–12 | `mcp_ch_job_3a00e368e5c44c7db71eb921833695bf` |
| R13–14 | `mcp_ch_job_98a498dfff2a457fb1fbc82dc8435fdc` |
| R15–18 | `mcp_ch_job_1eb3bce583d84ad88d1ccf1f9c909e8c` |

Queued provider IDs are operational trace only. They are not result evidence.

## Manifest-gated offline pipeline

The deterministic fallback uses six non-overlapping time windows and two
non-overlapping sorted-user partitions per window. Each shard contains all
ranks `1–18`. The fixed windows are:

```text
2023-09-01  2024-03-01
2024-03-01  2024-09-01
2024-09-01  2025-03-01
2025-03-01  2025-09-01
2025-09-01  2026-03-01
2026-03-01  2026-07-22
```

The plan, renderer metadata, SQL hashes, result hashes, continuous time
coverage, and exact user-partition coverage are bound into one manifest. The
merger refuses partial or duplicate inputs, adds raw counters only, validates
the action identities, and sets the publishable flag after the merge. It never
averages percentages across shards.

The resulting artifact is injected into both lessons by
`inject-full-history-field-data.mjs`. Injection fails closed on a missing or
invalid source and preserves methodology-only board and hand examples.

## Independent reconciliation only

`full-history-postflop-control.sql`, SHA-256
`ddf317ba694118309d566eea0dbbee5d8df81aa084acb556887766963acfed2a`,
uses the daily mart `analytics.tracker_stats_users_by_day`. Its grain cannot
attach exact rank at the hand timestamp, so it is a broad reconciliation
source only. Its rates and counts are not learner-facing data.

## Release gate

Before either lesson may leave `methodology_only`, all of these must hold:

- one complete current source set, with no old/current shard mixing;
- a manifest proving continuous window and exact partition coverage;
- latest-first semantics before poker/business filters;
- exact rank-at-hand and four disjoint cohorts through `R18`;
- c-bet and BB-response action identities on every row;
- zero unclassified BB responses;
- additive counts merged before percentages;
- `N >= 50` applied after merge, with no smoothing or imputation;
- one validated artifact injected into both lessons;
- learner-facing labels naming the actual source and period, not an
  availability probe.

Focused offline checks:

```sh
node assets/poker-flop-cbet-hu-lesson/tools/test-full-history-field-query.mjs
node assets/poker-flop-cbet-hu-lesson/tools/test-full-history-shard-plan.mjs
node assets/poker-flop-cbet-hu-lesson/tools/test-full-history-shard-manifest.mjs
node assets/poker-flop-cbet-hu-lesson/tools/test-full-history-field-merge.mjs
node assets/poker-flop-cbet-hu-lesson/tools/test-inject-full-history-field-data.mjs
node assets/poker-flop-checkraise-lesson/tools/test-full-history-contract.mjs
```

When a current artifact exists, append its provider result IDs, input hashes,
row counts, merged artifact SHA-256, exact totals, and focused test output here.
Until then, absence of field percentages is the correct product state.
