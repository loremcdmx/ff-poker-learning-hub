# RFI field-action data

## Current publication status: ready

The exact 7-max field cube is publishable for the closed UTC window
`[2023-09-01, 2026-07-26)`. The browser payload contains:

- 36,504 exact source rows: 4 cohorts × 9 raw stack buckets × 6 positions ×
  169 canonical hands;
- 30 public `stack × position` states and 120 cohort charts;
- 169/169 observed hands in every chart with `N >= 50`;
- no smoothing, priors, interpolation, neighbouring-state substitution,
  disabled selectors or model-filled values.

The published source CSV SHA-256 is
`12271ff6005957d0fe58fd24066195dfc90e04544228af207e4ce3296daeed3b`.
It reconciles 65,334,010 known-card opportunities out of 74,722,772 eligible
opportunities (`87.435206%`). The generated browser payload SHA-256 is
`445631a7851b4eb771e5c47a4969a1cb5f6abcb8bf243f32c36146a727e845ef`.

## Why there are five public stack bands

The raw source retains nine non-overlapping buckets:

`70+`, `30–70`, `20–30`, `15–20`, `12–15`, `10–12`, `8–10`, `6–8`, `<6`.

The public selector exposes:

`70+`, `30–70`, `20–30`, `15–20`, `<15`.

`<15` is exact integer addition of the five raw buckets below 15 BB before any
rate is calculated. It is not a weighted estimate or a copied neighbouring
chart. Keeping separate `10–15` and `<10` selectors left two late-position
states below the required 169/169 cells at `N >= 50`; inventing their missing
frequencies or lowering the gate is not permitted.

The minimum cell count in the strictest cohort (`l3top`) is:

| Stack | EP | MP | HJ | CO | BTN | SB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 70+ | 1819 | 1343 | 927 | 589 | 330 | 112 |
| 30–70 | 1961 | 1507 | 1123 | 777 | 467 | 203 |
| 20–30 | 575 | 453 | 340 | 257 | 184 | 91 |
| 15–20 | 276 | 214 | 150 | 112 | 81 | 55 |
| <15 | 410 | 323 | 241 | 173 | 131 | 106 |

## Publication contract

An observed RFI payload is published only when all of these conditions hold:

- the table is actual `cnt_players = 7`;
- the position map is `4→EP, 3→MP, 2→HJ, 1→CO, 0→BTN, 9→SB`;
- actions come from exact integer counters;
- effective open-push is a direct all-in or a first raise that exhausts the
  effective stack under the parser contract;
- all 5 × 6 public states exist in every frozen cohort and every chart contains
  all 169 hands with `N >= 50`;
- raw-to-public aggregation preserves every action counter exactly;
- known-card coverage and the EP→MP→HJ→CO→BTN→SB opportunity ladder reconcile;
- membership, rendered SQL, result files, receipts and merge manifests are
  bound by real execution IDs and SHA-256 hashes.

Failure of any condition rejects the entire publication before the target is
written.

## Source and supplement evidence

The structured and missing-card recovery layers are bound to:

| Role | Template SHA-256 |
| --- | --- |
| canonical structured cube | `9e06fa18c5889fd12e00cab250af6dc17ad1d543f4ef67a4cbf65351c6093cde` |
| missing-card recovery | `56a80f377f72dfb1f52e42b9157509419ed1c04dd30dfc1045503051e2540533` |
| Coin/Party publication supplement | `0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959` |

The CoinPoker/PartyPoker supplement uses eight immutable user shards. Their
ClickHouse jobs are:

- CoinPoker:
  `mcp_ch_job_c3e99be74bfe4a58899c127bf7788671`,
  `mcp_ch_job_a33728d567894179adca67b5e8a5bcb3`,
  `mcp_ch_job_ee654e01fec1471790d6e34b2caf1c15`,
  `mcp_ch_job_8870a5aba6134e63a005e72771c0eb57`;
- PartyPoker:
  `mcp_ch_job_aaf3243f703a4f5f873083b62ee759cb`,
  `mcp_ch_job_14238c749c9c4c1c915b801461fa2fbe`,
  `mcp_ch_job_0b0d39e1b59a440fbbf89ed4b573b892`,
  `mcp_ch_job_7fb8505f397445a9a54c095beb6aaba3`.

Zero-row shards remain in the manifest: they prove the partition was executed
and empty rather than silently omitted. The supplement adds 5,108 exact
opportunities: 1,253 regular raises, 137 open shoves, 86 limps and 3,632 folds.
It contains zero normal 2.5–3.5 BB opens misclassified as shoves.

Raw hand histories, membership exports and player identifiers stay outside the
repository and deploy tree. Only aggregate counters and safe provenance are
published.

## Rebuild and verification

The publication builder requires private source, action metadata, membership
and membership receipt inputs:

```sh
node assets/poker-rfi-open-lesson/tools/build-field-action-data.mjs \
  --source=/private/tmp/final-source.csv \
  --action-metadata=/private/tmp/final-source.meta.json \
  --membership=/private/tmp/cohort-membership.csv \
  --membership-receipt=/private/tmp/cohort-membership.receipt.json \
  --out=assets/poker-rfi-open-lesson/field-action-data.js \
  --diagnostics=assets/poker-rfi-open-lesson/tools/field-action-coverage.json
```

Focused release checks:

```sh
node assets/poker-rfi-open-lesson/tools/test-field-action-builder.mjs
node assets/poker-rfi-open-lesson/tools/test-stack-recovery-publication.mjs
node assets/poker-rfi-open-lesson/tools/test-current-raw-hh-supplement.mjs
node assets/poker-rfi-open-lesson/tools/test-recovery-cohort-replacement.mjs
node assets/poker-rfi-open-lesson/tools/test-field-action-quality.mjs
node assets/poker-rfi-open-lesson/tools/test-contract.mjs
node scripts/check-release-data-readiness.mjs
```

The release-data gate must report `READY` for all six required data surfaces.
