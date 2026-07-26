# BB resteal actions by FF rank-at-hand

This is the release contract for the exact, full-history dataset that powers the novice-versus-league comparison in the Resteal lesson. It is intentionally fail-closed: every published preset must have a complete 169-hand chart at the shared exact minimum in every compared cohort.

## Required release and private build files

- `resteal-rank-hand-cube.csv` — lossless ClickHouse aggregate at cohort × opener × size × depth × hand-class grain.
- `resteal-rank-data.js` — compact browser payload exported as `window.PokerRestealRankData`.
- `resteal-rank-diagnostics.json` — deterministic coverage, totals, sparsity and association QA.
- Private `resteal-rank-source-metadata.json` — external build evidence under `/private/tmp`, tied to the actual rank export, rendered SQL and ClickHouse CSV files. It is an input to the deterministic build, not a public release asset.
- `../tools/resteal-rank-cube.sql` — BigQuery rank bridge, ClickHouse cube and same-window ABI queries.
- `../tools/render-resteal-rank-query.mjs` — validates the private rank bridge and renders either disjoint full-window user shards or full-population contiguous-time shards.
- `../tools/merge-resteal-rank-cube.mjs` — merges only additive counters and records source CSV and query hashes.
- `../tools/build-resteal-rank-source-metadata.mjs` — validates complete shard coverage and creates the private build-evidence record.
- `../tools/build-resteal-rank-data.mjs` — deterministic CSV-to-browser build that copies only provider IDs, hashes, windows and counts into public provenance.
- `../tools/test-resteal-rank-data.mjs` — fail-fast data and query-contract validation.

## Frozen contract

- Window: `[2023-09-01 00:00:00, 2026-07-22 00:00:00)` UTC.
- Rank is joined at the exact hand timestamp from `mcp__check_rank_history` using half-open, non-overlapping intervals.
- Cohorts are exact and disjoint: novice ranks 15–18, league 3 ranks 11–14, league 2 ranks 6–10 and league 1 ranks 1–5.
- Hero is BB only, can 3-bet, faces exactly one CO/BTN raiser and no limpers at a 3–9 handed table.
- Effective stack is 25–40 BB; frontend bands are 25–30, 30–35, 35–40 and a count-pooled 25–40 view.
- Open sizes are 2.0, 2.5 and 3.0 BB with ±0.05 BB tolerance.
- Latest source versions are resolved at `hand_player_id` grain before poker predicates. Candidate-id pruning is allowed only as a broad first pass; a complete projected tuple is the deterministic tie-break for equal versions.
- `jam` is a direct/effective shove: `preflop_action='R' AND (is_preflop_allin=1 OR raise_and_blind_made_amount_bb - posted_blind_bb >= effective_stack_bb - 0.01)`.
- Any other `R*` line, including `RC/RR` that later reached all-in, is `small3bet`.
- Unknown cards remain in chart-level opportunities and action totals but are not painted into a 13×13 cell.
- Percentages and pooled views must be calculated by summing integer counts, never by averaging cell percentages.

## Publication and weak-sample policy

- The lesson exposes ten fixed source-backed presets: CO/BTN × `2 BB · 25–30`, `2 BB · 30–35`, `2 BB · 35–40`, `2 BB · 25–40` and `2.5–3 BB · 25–40`.
- Every one of those ten presets must contain all 169 canonical hand cells with an exact denominator of at least 50 in all four cohorts. There are no disabled, partial or placeholder selector states.
- The `2.5–3 BB · 25–40` preset is built by summing the integer hand/action counters for 2.5x and 3x, then recomputing rates. It is not an average of percentages.
- If any required preset fails the contract, the build and release gate fail. The builder does not smooth, interpolate, model or borrow a neighboring selector to manufacture a chart.
- The learner-facing chart contains observed action frequencies and exact per-hand `N` in the selected-hand readout.
- Model output outside observed chart support, including near/all-any-two stress tests, must be labeled as a model boundary or extrapolation rather than field frequency or advice.

## ABI and association

Same-window ABI uses `SUM(load_usd) / SUM(entries)` with real players, `pack_id IS NOT NULL` and self-play excluded. The browser payload stores the refreshed ratio-of-sums inputs and values.

The predeclared association slice is BTN versus a 2.0 BB open. Effective-shove rates are standardized to one common effective-stack distribution: the pooled opportunity weights of all four cohorts across the three depth bands. `correlation.abiVsStandardizedJamPearson` is an ecological four-point Pearson correlation. It is descriptive and must not be presented as evidence that resteal training caused ABI growth.

## Provenance gate

- Rank bridge: BigQuery job `mcp_bq_job_0795894633234a1dbed2032ae29ee179`; 19,699 exported intervals, 19,698 usable intervals and one zero-length interval excluded. The private CSV SHA-256 is `7510e40b42cad7bf6bce6dbca9c2ba0f5d157a8ff2df5b7f9f28ca37eafb1d9e`.
- ABI evidence: BigQuery job `mcp_bq_1aae14822e7542809baff5659212b349`; rendered SQL SHA-256 is `6b7bc7617193707d018961c25ea2f7710e590806e1cc168ecda5c7c4d867b809`.
- ABI ratio-of-sums anchors are novice 2.99, league 3 7.00, league 2 16.89 and league 1 47.90.
- The hand cube may use a complete immutable-user partition or a gapless, non-overlapping contiguous-time partition. Immutable-user shards each cover ranks 1–18 and the entire source window; indices cover `0..count-1`, user sets are disjoint and sizes reconcile to the 3,881 eligible users. Time shards each cover ranks 1–18 and the full eligible population for that half-open window; together they must cover the frozen source window exactly.
- Preserve a returned asynchronous ClickHouse ID as `mcp_ch_job_...` with `executionMode=async`. A synchronous source reference is `sync:<renderedSqlSha256>` with `executionMode=sync` and is accepted only when the API returned no job ID. Per-shard SQL SHA, CSV SHA, row count, user-set SHA and private evidence paths are mandatory in the external build record.
- Failed or timed-out jobs, stale-template results and strict `is_preflop_allin`-only extracts remain private failed-attempt evidence and cannot appear in successful provenance.
- The public browser payload contains only safe provider IDs, hashes, windows and aggregate counts. It must never contain `/private/tmp` paths, `privateSql` / `privateCsv` / `privateJson`, failed-attempt reasons or raw identities.
- Merged action totals must partition exactly and `other` must be zero. The checked-in cube SHA, row count and totals are generated from the external source metadata; they are never copied from an older snapshot or invented job id.
- The ready snapshot uses six contiguous ClickHouse jobs:
  `mcp_ch_job_7900743eb3f6493088c5e16881162fca`,
  `mcp_ch_job_223d1216b34c4bd0af82cb5c77cf6e69`,
  `mcp_ch_job_068efc14a21843eca25fd3e01b6d009a`,
  `mcp_ch_job_6bfc2519c6b84d88b5f590c453fa38b2`,
  `mcp_ch_job_e967be3aa4d14a2a8b247fd1f4733357` and
  `mcp_ch_job_4800067717b1436cb60412249934ec6d`.
  Their additive merge is 12,240 rows and 5,520,018 opportunities
  (`1,779,518` folds, `2,951,255` calls, `407,866` small 3-bets,
  `381,379` direct/effective shoves, `other=0`) with cube SHA-256
  `acf5048e35f3506d53dbbef1d75c243ce2e3ea37d9bee2d3bb382fec0c326e81`.
- All ten published presets pass the complete four-cohort `169 × N>=50` gate.
  The 2.5x and 3x source slices remain separate in the source cube and reconcile
  exactly to the pooled browser preset after integer-count addition. The browser
  aggregate SHA-256 is recorded by the deterministic builder and verified by the
  focused data test.

The release fails until the full cube, source metadata and generated payload agree byte-for-byte and all ten required presets pass the four-cohort `169 × N>=50` gate.

## Rebuild and validation

```sh
node assets/poker-resteal-lesson/tools/test-resteal-rank-query-renderer.mjs
node assets/poker-resteal-lesson/tools/test-resteal-rank-source-metadata.mjs
node assets/poker-resteal-lesson/tools/build-resteal-rank-data.mjs --input=/private/tmp/resteal-rank-cube.csv --metadata=/private/tmp/resteal-rank-source-metadata.json
node assets/poker-resteal-lesson/tools/test-resteal-rank-data.mjs
```

Use `build-resteal-rank-data.mjs --check --input=<checked cube> --metadata=<private source metadata>` while the private release evidence is present to verify that checked-in generated files match it byte-for-byte without writing them. The checked-in public tests independently reconcile the browser payload and diagnostics with the additive cube and reject private-path leakage.
