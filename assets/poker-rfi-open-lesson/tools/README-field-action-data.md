# RFI field-action snapshot

`../field-action-data.js` is a generated, browser-ready snapshot. It contains
observed first-in actions for four FF cohorts and the empirical-Bayes short-stack
recommendations shown on the RFI lesson page.

## Analysis boundary

- Window: 2025-10-01 through 2026-06-30.
- Tables: 7–9 handed only (`cnt_players_lookup_position BETWEEN 7 AND 9`).
- Opportunity: unopened pot, known hole cards, positive effective stack.
- Actions: fold/other, regular open, open-shove, limp.
- Top cohort: active real League 3 players at ranks 11–14, at least 30,000
  hands for FFEV, top 25% by weighted last-100k-hands FFEV.
- Recommendations use the top-quartile action rate for width and all eligible
  League 3 rank 11–14 players as the hand-level prior. They describe observed
  field play; they are not a solver or causal strategy estimate.

The exported CSV snapshots are analytics inputs and are not checked into the
learning-site repository. Before rebuilding, export the same slices and verify:

| input | rows | SHA-256 |
| --- | ---: | --- |
| four cohorts | 36,504 | `dea5722f6aed90b73219ce3ff54cc3a8857fd4765dde1a1235f578f92db20ec5` |
| eligible L3 R11–14 short-stack prior | 5,915 | `df89041e1ebbb1750eff8a7a8637c764cf852f4fcae8d5db12c8e40bd230d716` |

The generated file also records these hashes, usable counts, low-sample cell
counts, cohort rules, smoothing method, and the known-card coverage boundary.

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
  --known-cards-pct=87.91 \
  --source-rows=36504 \
  --source-sha256=dea5722f6aed90b73219ce3ff54cc3a8857fd4765dde1a1235f578f92db20ec5 \
  --l3top-usable=5109518 \
  --l3top-cells-lt30=1280 \
  --l3top-cells-lt100=4073 \
  --prior-sha256=df89041e1ebbb1750eff8a7a8637c764cf852f4fcae8d5db12c8e40bd230d716 \
  --prior-usable=7095878 \
  --out=assets/poker-rfi-open-lesson/field-action-data.js
```

Then run the RFI contract, position-statistics test, and the repository release
gate before publishing.
