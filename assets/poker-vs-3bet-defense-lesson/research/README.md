# Защита против 3-бета: источник полевых срезов

## Строгий узел

Урок использует только решения после собственного RFI:

`Hero RFI → соперник 3-bet → Hero fold / call / 4-bet`.

Широкий `face_3bet` не подходит: в ClickHouse за 2025-07-15…2026-07-14
точный узел после RFI дал `N=20 527 140` и mix `57.24 / 31.01 / 11.74%`,
а другие face-3bet ситуации дали `N=31 853 659` и `93.77%` fold.

## Опубликованный срез

- Source: `analytics_mcp_readonly.mcp__fflk_player_tracker_stats`.
- Period: monthly snapshots 2025-08-01…2026-07-01; July 2026 is partial.
- Rank: as of the start of each month via `mcp__check_rank_history`.
- Denominator: `cases_fold_3bet_total = cases_4bet_total`.
- Call is reconstructed as `opportunities - folds - fourbets`.
- Aggregation is opportunity-weighted, not an average of player percentages.

| Cohort | N | Players | Fold | Call | 4-bet |
| --- | ---: | ---: | ---: | ---: | ---: |
| League 1, R1–5 | 1,017,333 | 222 | 53.82% | 29.88% | 16.30% |
| League 2, R6–10 | 2,469,549 | 631 | 56.18% | 29.00% | 14.82% |
| League 3, R11–17 | 3,071,114 | 1,381 | 59.96% | 28.49% | 11.55% |
| R15–17 | 861,445 | 953 | 59.39% | 30.14% | 10.47% |

Jobs:

- main cohorts: `mcp_bq_80039683391746b3bc0cda01a00f1260`;
- pooled R15–17: `mcp_bq_b5cd549cc8d049f299aff3134e7e93ca`;
- denominator check: `mcp_bq_72cd109a0b0f4531a914636415e43874`;
- rank coverage: `mcp_bq_beb917a589eb499db4f0e06ba1ce7ccb`;
- stable full-month sensitivity: `mcp_bq_800bf15153434af198b894488a748d8e`.

Rank-at-month-start covers 6.558M of 6.663M recent opportunities (98.4%).
The stable-rank full-month sensitivity differs by less than about one percentage
point. Players can appear in several cohorts after rank changes.

R15 supplies 99.0% of the pooled R15–17 denominator. R16 and R17 exist in this
source only in partial July 2026, so this row is not a balanced comparison of
three ranks and must not be used to infer progression.

## Existing teaching material used

- `docs/methodics-15-11.md`: position, sizing and stack adjustments; teaching
  control `65 / 25 / 10`, kept separate from observed field frequencies.
- Supplied methodology PDF: page 7 has the positional RFI-vs-3-bet visual;
  page 15 compares defense against 2.5x / 3x / 4x.
- `assets/poker-vs-3bet/data.lazy.json`: 208 combined tasks, including 59
  defense tasks (23 fold / 27 call / 9 4-bet). All 59 use 58 BB and the same
  `Hero 2 BB → 3-bet 8 BB` line, so the new practice deliberately adds other
  stacks and sizes.

The field mix is descriptive. It is not an optimal chart and does not identify
the EV of an individual fold, call or 4-bet. `chips_ev` was not used as a
counterfactual action value.
