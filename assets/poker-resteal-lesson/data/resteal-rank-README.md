# BB direct resteal pushes by FF rank-at-hand

This frozen dataset powers the novice-versus-league comparison in the Resteal lesson.

## Files

- `resteal-rank-hand-cube.csv` — lossless ClickHouse aggregate at cohort × opener × size × depth × hand-class grain.
- `resteal-rank-data.js` — compact browser payload exported as `window.PokerRestealRankData`.
- `resteal-rank-diagnostics.json` — deterministic coverage, totals, sparsity and association QA.
- `../tools/resteal-rank-cube.sql` — BigQuery rank bridge, ClickHouse cube and same-window ABI queries.
- `../tools/build-resteal-rank-data.mjs` — deterministic CSV-to-browser build.
- `../tools/test-resteal-rank-data.mjs` — fail-fast data and query-contract validation.

## Frozen contract

- Window: `[2026-01-01 00:00:00, 2026-07-14 00:00:00)` UTC.
- Rank is joined at the exact hand timestamp from `mcp__check_rank_history` using half-open, non-overlapping intervals.
- Cohorts: comparison baseline ranks 15–17, league 3 ranks 11–14, league 2 ranks 6–10, league 1 ranks 1–5. Rank 18 is retained only in the audit bridge and excluded from every product cohort.
- Hero is BB only, can 3-bet, faces exactly one CO/BTN raiser and no limpers at a 3–9 handed table.
- Effective stack is 25–40 BB; frontend bands are 25–30, 30–35, 35–40 and a count-pooled 25–40 view.
- Open sizes are 2.0, 2.5 and 3.0 BB with ±0.05 BB tolerance.
- `jam` is only the direct action `preflop_action='R' AND is_preflop_allin=1`.
- Any other `R*` line, including `RC/RR` that later reached all-in, is `small3bet` rather than a direct jam.
- Unknown cards remain in chart-level opportunities and action totals but are not painted into a 13×13 cell.
- Percentages and pooled views must be calculated by summing integer counts, never by averaging cell percentages.

## ABI and association

Same-window ABI uses `SUM(load_usd) / SUM(1 + multientries)` with real players, `pack_id IS NOT NULL` and self-play excluded. The browser payload stores the refreshed ABI inputs and values.

The predeclared association slice is BTN versus a 2.0 BB open. Direct-jam rates are standardized to one common effective-stack distribution: the pooled opportunity weights of all four cohorts across the three depth bands. `correlation.abiVsStandardizedJamPearson` is an ecological four-point Pearson correlation. It is descriptive and must not be presented as evidence that resteal training caused ABI growth.

## Frozen QA and default slice

- 12,222 lossless CSV rows, no duplicate keys and no unknown action bucket. SHA-256: `e5d367369c6126b8fbc6326c96ae7dd22fb54c75ce62e3fbd222b858303aa2ad`.
- 1,158,099 opportunities reconcile exactly to 369,387 folds, 631,798 calls, 85,471 non-all-in 3-bets and 71,443 direct jams.
- 1,025,230 opportunities have canonical hole cards; 132,869 missing-card decisions remain only in chart totals (88.527% known-card coverage).
- BTN versus 2.0 BB, depth-standardized direct-jam rates: ranks 15–17 2.952% (N=70,858; 2,080 jams), league 3 5.643% (N=185,734; 10,486 jams), league 2 9.198% (N=204,428; 18,852 jams), league 1 10.264% (N=77,702; 7,948 jams).
- Same-slice ABI-versus-jam Pearson `r=0.8547`, four aggregate cohorts.

The ranks 15–17 default pooled chart is fully sampled: all 169 cells have N≥50. Its 25–30, 30–35 and 35–40 depth charts have 169, 162 and 131 cells with N≥50 respectively, and none has N<20. At 2.5/3.0 BB pooled, no cell has N<5, but some cells remain below N=20, so the UI still exposes N and its compact sample-quality markers.

## Rebuild and validation

```sh
node assets/poker-resteal-lesson/tools/build-resteal-rank-data.mjs
node assets/poker-resteal-lesson/tools/test-resteal-rank-data.mjs
```

Use `build-resteal-rank-data.mjs --check` to verify that checked-in generated files exactly match the lossless CSV without writing them.
