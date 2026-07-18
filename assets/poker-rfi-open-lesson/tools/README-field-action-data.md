# RFI field-action snapshot

`../field-action-data.js` is a generated, browser-ready snapshot. It contains
observed first-in actions for four FF cohorts and the empirical-Bayes short-stack
recommendations shown on the RFI lesson page.

## Analysis boundary

- Window: 2025-10-01 through 2026-07-16 inclusive (`played_at < 2026-07-17`).
- Tables: 7–9 handed only (`cnt_players_lookup_position BETWEEN 7 AND 9`).
- Opportunity: unopened pot, known hole cards, positive effective stack.
- Actions: fold/other, regular open, open-shove, limp.
- Top cohort: active real League 3 players at ranks 11–14, at least 30,000
  hands for FFEV, top 25% by weighted last-100k-hands FFEV.
- Canonical FFEV source: `mcp__fflk_player_evs_by_period`,
  `period_type='last_100k_hands'`, metric `ev_2_weighted`. The current eligible
  population is 651 players; deterministic `FFEV DESC, user_id ASC` ranking
  selects 163 and has cutoff 10.0502716757261.
  The older 650-player prior export omitted one otherwise eligible member;
  651 is the count reproduced directly from the canonical source.
- Recommendations use the top-quartile action rate for width and all eligible
  League 3 rank 11–14 players as the hand-level prior. They describe observed
  field play; they are not a solver or causal strategy estimate.
- Privacy boundary: the browser payload contains no player identifiers. For
  hand-level cells with N < 30 it publishes no exact N, raw action rates,
  player count, or month count. The UI now shows a clearly marked Dirichlet-
  smoothed estimate instead of a false zero: 60 equivalent prior hands, using
  all eligible L3 R11–14 as the top-25 prior where that slice is available
  (pooled leagues otherwise), and a leave-one-league-out pool for league tabs.
  Stack/position aggregates and empirical-Bayes recommendations are still
  computed from the complete read-only slice.

Why this is necessary: a suited class represents four physical combinations,
an offsuit class twelve. A flat `N < 30` publication rule therefore suppressed
suited cells roughly three times more often. The exact raw `<6 BB / BTN /
L3 top-25%` slice contains, for example, Q7s 23/24 first-in actions and T6s
13/27; rendering every suppressed cell as zero made the suited sector look
artificially empty. The raw rows and privacy boundary stay unchanged; only the
public fallback is estimated and visibly labelled.

The exported CSV snapshots are analytics inputs and are not checked into the
learning-site repository. Before rebuilding, export the same slices and verify:

| input | rows | SHA-256 |
| --- | ---: | --- |
| canonical cohort memberships | 2,438 | `f7afe0cf1e3aec65b1f8333bf32305a2de114f33080fb32102d69b0085b9c3bd` |
| four cohorts | 36,504 | `a1b76b93a180a4f4a4f487c9717d048b61b6d52dd437ce769ee485bca572f65e` |
| eligible L3 R11–14 short-stack prior | 5,915 | `e712cde7184aa8e5a66da059e8df0cda958000fdf73cea4351f0734001a6afc5` |

The generated file also records these hashes, usable counts, low-sample cell
counts, cohort rules, smoothing method, and the known-card coverage boundary.
The exact two-source extraction lives in `q_ff_rfi_field_actions.sql`. This
snapshot came from BigQuery job `mcp_bq_71b6007a9c4c4e51b81e0aa3ae3945ea`
and ClickHouse job `mcp_ch_job_fd30df587eca46a4b0fb5d118e68a691`.

## Rebuild

The four cohort switches intentionally point to the same multi-cohort export;
the builder filters its `cohort` column. Replace `/path/to/...` with the two
verified exports:

```sh
node assets/poker-rfi-open-lesson/tools/build-field-action-data.mjs \
  --l3top=/path/to/rfi-action-cube-4cohorts-7to9max.csv \
  --l3=/path/to/rfi-action-cube-4cohorts-7to9max.csv \
  --l2=/path/to/rfi-action-cube-4cohorts-7to9max.csv \
  --l1=/path/to/rfi-action-cube-4cohorts-7to9max.csv \
  --l3prior=/path/to/rfi-l3-r11-14-eligible-short-stack-prior-7to9max.csv \
  --version=2026-07-18 \
  --period-from=2025-10-01 \
  --period-to=2026-07-16 \
  --period-label='1 октября 2025 — 16 июля 2026' \
  --known-cards-pct=87.926 \
  --source-rows=36504 \
  --source-sha256=a1b76b93a180a4f4a4f487c9717d048b61b6d52dd437ce769ee485bca572f65e \
  --l3top-usable=5438662 \
  --l3top-cells-lt30=1192 \
  --l3top-cells-lt100=3932 \
  --prior-sha256=e712cde7184aa8e5a66da059e8df0cda958000fdf73cea4351f0734001a6afc5 \
  --prior-usable=7405082 \
  --l3top-observed=161 \
  --l3-observed=945 \
  --l2-observed=471 \
  --l1-observed=165 \
  --membership-rows=2438 \
  --membership-sha256=f7afe0cf1e3aec65b1f8333bf32305a2de114f33080fb32102d69b0085b9c3bd \
  --cohort-job-id=mcp_bq_71b6007a9c4c4e51b81e0aa3ae3945ea \
  --action-job-id=mcp_ch_job_fd30df587eca46a4b0fb5d118e68a691 \
  --top25-eligible=651 \
  --top25-selected=163 \
  --top25-min-ffev=10.0502716757261 \
  --out=assets/poker-rfi-open-lesson/field-action-data.js
```

Then run the RFI contract, position-statistics test, and the repository release
gate before publishing.

The raw cube and generated fallback have focused quality gates:

```sh
node assets/poker-rfi-open-lesson/tools/audit-field-action-source.mjs \
  /path/to/rfi-action-cube-4cohorts-7to9max.csv
node assets/poker-rfi-open-lesson/tools/test-field-action-quality.mjs
```
