# BB call defense lesson alpha

Standalone lesson prototype based on physical pages 10 and 11 of:

`/Users/loremcdmx/Downloads/Telegram Desktop/часть методички для аишки (1) (2).pdf`

Trainer voice and teaching priorities come from:

`/Users/loremcdmx/Downloads/Telegram Desktop/покерный урок 2.txt`

## Evidence boundaries

- Pot odds, fold/continue aggregates, opener widths, and the 38.5% to 27.8% equity-realization example come directly from the supplied methodology pages.
- The source matrices define fold, cold-call, and 3-bet actions, but not an exact 3-bet size; the lesson therefore labels that option only as `3-бет`.
- The 15 range PNG files are measured crops of the rendered source page. `range-data.js` is a reproducible color transcription of those crops into 169 clickable action cells per scenario; the PNGs remain the provenance evidence.
- Every aggregate percentage shown for those charts is derived from the same structured matrix and weighted by all 1,326 starting-hand combinations. There is no separate hand-count percentage or manually maintained headline.
- These ranges are educational source material, not a measured player-EV or bb/100 analysis.
- Practice spots use only clear 100% cells from the source matrices. No EV number is invented for an individual hand.
- Per-hand showdown equity is a marked model: the existing reproducible 169×169 all-in equity matrix is averaged against a blocker-aware top-X% opener range, where X is the lesson's opener width. It is not postflop realization and not a solver result for the source matrix.
- The clickable readout shows only the modelled minimum share of raw equity that a hypothetical call must realize (`pot odds / modelled raw equity`). It is labelled as a break-even threshold, not observed hand profit. Actual per-hand realization is unavailable in the PDF; the source's 38.5% → 27.8% example remains explicitly range-level only.
- The frozen `data/ff-bb-call-realization.json` export is retained locally for methodology audit but is not loaded by the learner page and is excluded from the deployment package. Its numerator is not bounded as an equity share, its per-hand rows contain only hands players chose to call, and the previous UI failed to enforce its own sample threshold. Those limits make the old per-hand percentages unsuitable for instruction.
- The hand-shape concept slide has a separate League-3 comparison in `data/ff-bb-l3-shape-summary.json`. It matches 55 suited/offsuit pairs with the same ranks, requires at least 500 EV-ready calls in both cells, and balances each pair to its smaller cell (32,410 calls per group). Raw equity comes from the 169×169 matrix weighted by 120,638 observed League-3 BTN opens at 30–70 BB; realization comes from rank-at-hand League-3 all-in-adjusted EV after actual BB calls at 40–70 BB. This is a descriptive comparison inside played calls, not a causal estimate or a strategy recommendation. Rebuild it with `tools/build-ff-bb-l3-shape-summary.mjs` from the frozen query `tools/q_ff_l3_shape_realization.sql`.
- The memory check grades all five exact source states for every one of the 169 cells: raise, 50/50 raise/call, call, 50/50 call/fold, and fold. An unpainted cell is fold.
- The 21-spot queue was checked cell-by-cell against all referenced source crops; causal coaching cues remain transcript-based interpretation rather than claims extracted from the matrices.
- Claims such as missed defenses costing tenths of a blind are presented only as a trainer estimate from the transcript, not as measured storage-backed EV.
- Noisy ASR wording is edited for clarity; ambiguous fragments are not promoted into rules.

## Deliberate alpha scope

- Standalone route only: `bb-call-defense-lesson.html`.
- No hub registration, progress persistence, trainer telemetry, or production deployment.
- Practice uses the shared trainer table snapshot with a deterministic lesson queue; it does not add a second special case to the uncommitted resteal simulator pack.
- The lesson keeps its own frozen copy of the neighboring lesson shell styles, so this standalone route does not depend on untracked resteal files at runtime.
