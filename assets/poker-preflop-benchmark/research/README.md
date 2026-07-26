# Preflop benchmark · exact source run

The three benchmark lessons and their SB-vs-BTN outcome block publish together.
The release gate stays closed until one source run covers the frozen half-open
window `[2023-09-01T00:00:00Z, 2026-07-22T00:00:00Z)` with one byte-identical
rank-at-hand bridge.

Raw rank intervals, rendered SQL, ClickHouse receipts and raw EV shards contain
private user ids. Keep the whole run outside this repository, for example:

```text
/private/tmp/ff-preflop-benchmark-20260722/
```

The checked-in `sb-vs-btn-ev-full-history.csv` is historical evidence only. It
predates additive `ev_sum_bb`, execution receipts and the shared rank-bridge
contract, so it cannot open the release gate.

## External jobs

1. Before querying FF data, read the relevant FunFarm Knowledge Context.
2. Reuse an existing rank-bridge export only when its original BigQuery job id,
   CSV hash and exact executed SQL bytes are all available. For the frozen
   2026-07-22 run, that contract is already satisfied by:

   - job `mcp_bq_job_e9147a172e0a455faa21292b7aa80a4d`;
   - `/private/tmp/vs3bet-rank-intervals-full-history-exact-20260722.csv`;
   - CSV SHA-256
     `64b309058fabffe1d2f25e4a7d68f4aae84867d96a3faa9a743c4b0c39f78cd6`;
   - 19,699 data rows, of which 19,698 are usable intervals;
   - executed and canonical query SHA-256
     `622ecd00f28bba7baccc02de4cd4b2d46fe24e59d88e4bb2a1c488d20b28daaf`.

   No new BigQuery job is needed for this exact run. If any one of those
   identities changes, submit the current canonical query as
   `async=true, format=csv_file`, keep the original `mcp_bq_job_...`, and
   download the complete CSV outside the repository.
3. Prepare the immutable 12-window source run:

```bash
node assets/poker-preflop-benchmark/tools/prepare-source-run.mjs \
  /private/tmp/vs3bet-rank-intervals-full-history-exact-20260722.csv \
  --rank-job-id=mcp_bq_job_e9147a172e0a455faa21292b7aa80a4d \
  --output-dir=/private/tmp/ff-preflop-benchmark-20260722
```

This writes 12 action queries and 12 EV queries under
`/private/tmp/ff-preflop-benchmark-20260722/queries/`. Each query contains every
rank-bridge user whose interval overlaps its time window; there is no second
user partition axis.

4. Submit every rendered SQL file to ClickHouse with
   `async=true, format=csv_file`, poll its original `mcp_ch_job_...`, and
   download the full CSV to the exact `resultPath` in `source-plan.json`.
   Async ClickHouse jobs run one at a time, so execute the 24 jobs sequentially.
   If a quarterly query reaches the worker runtime limit, do not retry the same
   oversized bytes indefinitely. Render smaller half-open time windows that
   exactly replace only the failed interval, and record them in a new immutable
   plan with `strategy: "contiguous_time_shards"`. Keep successful quarterly
   shards unchanged. The ledger and source-manifest checks still require the
   resulting windows to cover the frozen analysis period exactly once, without
   gaps or overlaps. Pass that recovery plan to the `action` ledger command;
   the untouched quarterly plan can still be used for `ev`. Merge only the
   result paths listed by the selected ledger, never the failed oversized CSV
   or both an original interval and its replacements.
5. Fill `receipts/action.json` and `receipts/ev.json` with the original job id,
   `executionMode: "async"`, positive runtime, and `truncated: false`. Then
   build ledgers:

```bash
node assets/poker-preflop-benchmark/tools/build-shard-ledger.mjs \
  --plan=/private/tmp/ff-preflop-benchmark-20260722/source-plan.json \
  --kind=action \
  --receipts=/private/tmp/ff-preflop-benchmark-20260722/receipts/action.json \
  --output=/private/tmp/ff-preflop-benchmark-20260722/action-shard-ledger.json

node assets/poker-preflop-benchmark/tools/build-shard-ledger.mjs \
  --plan=/private/tmp/ff-preflop-benchmark-20260722/source-plan.json \
  --kind=ev \
  --receipts=/private/tmp/ff-preflop-benchmark-20260722/receipts/ev.json \
  --output=/private/tmp/ff-preflop-benchmark-20260722/ev-shard-ledger.json
```

## Exact local assembly

```bash
node assets/poker-preflop-benchmark/tools/merge-action-cube-shards.mjs \
  /private/tmp/ff-preflop-benchmark-20260722/results/action-*.csv \
  --partition time \
  --output /private/tmp/ff-preflop-benchmark-20260722/merged/action-cube.csv \
  --metadata /private/tmp/ff-preflop-benchmark-20260722/merged/action-merge.json

node assets/poker-preflop-benchmark/tools/merge-spot-ev-shards.mjs \
  /private/tmp/ff-preflop-benchmark-20260722/results/ev-*.csv \
  --partition time \
  --output /private/tmp/ff-preflop-benchmark-20260722/merged/spot-ev.csv \
  --metadata /private/tmp/ff-preflop-benchmark-20260722/merged/spot-ev-merge.json

node assets/poker-preflop-benchmark/tools/build-source-manifest.mjs \
  --kind=action \
  --rank-bridge-metadata=/private/tmp/ff-preflop-benchmark-20260722/rank-bridge-metadata.json \
  --shard-ledger=/private/tmp/ff-preflop-benchmark-20260722/action-shard-ledger.json \
  --merged-csv=/private/tmp/ff-preflop-benchmark-20260722/merged/action-cube.csv \
  --merge-metadata=/private/tmp/ff-preflop-benchmark-20260722/merged/action-merge.json \
  --output=/private/tmp/ff-preflop-benchmark-20260722/manifests/action-source.json

node assets/poker-preflop-benchmark/tools/build-source-manifest.mjs \
  --kind=ev \
  --rank-bridge-metadata=/private/tmp/ff-preflop-benchmark-20260722/rank-bridge-metadata.json \
  --shard-ledger=/private/tmp/ff-preflop-benchmark-20260722/ev-shard-ledger.json \
  --merged-csv=/private/tmp/ff-preflop-benchmark-20260722/merged/spot-ev.csv \
  --merge-metadata=/private/tmp/ff-preflop-benchmark-20260722/merged/spot-ev-merge.json \
  --output=/private/tmp/ff-preflop-benchmark-20260722/manifests/ev-source.json

node assets/poker-preflop-benchmark/tools/build-field-data.mjs \
  /private/tmp/ff-preflop-benchmark-20260722/merged/action-cube.csv \
  --source-manifest /private/tmp/ff-preflop-benchmark-20260722/manifests/action-source.json \
  --output assets/poker-preflop-benchmark/field-data.js

node assets/poker-preflop-benchmark/tools/build-spot-ev-data.mjs \
  /private/tmp/ff-preflop-benchmark-20260722/merged/spot-ev.csv \
  --source-manifest /private/tmp/ff-preflop-benchmark-20260722/manifests/ev-source.json \
  --output assets/poker-preflop-benchmark/spot-ev-data.js

node assets/poker-preflop-benchmark/tools/build-pages.mjs
node assets/poker-preflop-benchmark/tools/test-action-cube-query-time-shards.mjs
node assets/poker-preflop-benchmark/tools/test-source-run-pipeline.mjs
node assets/poker-preflop-benchmark/tools/test-contract.mjs
npm run check:release-data
```

The action gate treats the 550 poker-valid tuples as the audited source
universe, not as a Cartesian UI promise. The browser exposes a contextual
catalog of 177 complete tuples: 125 free-position spots, 42 SB-vs-raiser spots
and all 10 unopened-SB stack buckets. Every choice that is rendered opens all
169 canonical hands for all three cohorts; the UI contains no disabled or
dead-end selector states. Counts are never smoothed, interpolated, copied from
a neighboring slice or replaced by a synthetic zero.

The standard publication floor is `N >= 50` per hand and cohort. One
source-bound exception keeps the requested `<6 BB` unopened-SB chart intact:
the first-league slice has 165 hands at `N >= 50` and four hands at `N=48–49`;
the other two cohorts are fully above the standard floor. The exception is
encoded in both manifest and payload, is limited to that exact tuple and cohort,
and fails if more than four hands fall below `N=50` or any hand falls below
`N=48`. The checked-in publication contains 89,739 hand/cohort rows and
167,059,890 classified opportunities.

The gate still requires the lesson's teaching anchors: exact `20 / 25 / 30 /
35 BB` windows for the default free-position spot, the main SB-vs-BTN stack
ladder, and every unopened-SB stack down through `<6 BB`. Removing an anchor,
one cohort, one canonical hand, or reducing an ordinary included hand below
`N=50` blocks all observed benchmark screens. The published contextual catalog,
its narrowly scoped near-floor rule and exact row/opportunity totals are
digest-bound alongside the full source manifest.
