# BB call defense lesson alpha

Standalone lesson prototype based on physical pages 10 and 11 of:

`/Users/loremcdmx/Downloads/Telegram Desktop/часть методички для аишки (1) (2).pdf`

Trainer voice and teaching priorities come from:

`/Users/loremcdmx/Downloads/Telegram Desktop/покерный урок 2.txt`

## Evidence boundaries

- Pot odds, fold/continue aggregates, opener widths, and the 38.5% to 27.8% equity-realization example come directly from the supplied methodology pages.
- The source matrices define fold, cold-call, and 3-bet actions, but not an exact 3-bet size; the lesson therefore labels that option only as `3-бет`.
- The 15 range PNG files are measured crops of the rendered source page, not reconstructed charts.
- These ranges are educational source material, not a measured player-EV or bb/100 analysis.
- Practice spots use only clear 100% cells from the source matrices. No EV number is invented for an individual hand.
- The 21-spot queue was checked cell-by-cell against all referenced source crops; causal coaching cues remain transcript-based interpretation rather than claims extracted from the matrices.
- Claims such as missed defenses costing tenths of a blind are presented only as a trainer estimate from the transcript, not as measured storage-backed EV.
- Noisy ASR wording is edited for clarity; ambiguous fragments are not promoted into rules.

## Deliberate alpha scope

- Standalone route only: `bb-call-defense-lesson.html`.
- No hub registration, progress persistence, trainer telemetry, or production deployment.
- Practice uses the shared trainer table snapshot with a deterministic lesson queue; it does not add a second special case to the uncommitted resteal simulator pack.
- The lesson keeps its own frozen copy of the neighboring lesson shell styles, so this standalone route does not depend on untracked resteal files at runtime.
