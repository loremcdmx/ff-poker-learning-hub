# Repository rules for agents

## Interactive poker tables

Whenever a learner is asked to choose a poker action — fold, check, call, raise, or all-in — the table shown for that decision must be functional.

- Use the shared simulator snapshot (`FFTrainerSimulatorSnapshot`) or the full simulator instead of drawing a static table.
- Put the action controls into the functional table and make a click update the rendered answer state and feedback.
- Do not pair a decorative/static table illustration with separate poker-action buttons.
- A static table is allowed only when it is purely explanatory, offers no poker decision, and is marked as decorative where appropriate.
- Keep a focused contract test for every lesson that introduces an interactive table.

## Standalone lesson header

Every root `*-lesson.html` page must use the shared lesson header contract in
`docs/lesson-header-contract.md`.

- Load `assets/poker-kit/lesson-header.css` after route styles and load
  `assets/poker-kit/lesson-header.js` with a current content-hash token.
- Keep one `[data-lesson-header].lesson-chrome` with the shared identity, title,
  back control, and step-rail classes.
- Do not add route-specific header geometry or a new lesson-header component.
- Full-viewport practices use `body.practice-is-running`; do not replace the
  shared header with a route-specific sticky or compact header.
- Run `node scripts/check-lesson-header-contract.mjs`; new standalone lessons
  are intentionally discovered by filename and fail the repository check until
  they adopt the shared shell.

## Shared chart language

Every standalone trainer chart must load `assets/poker-kit/chart-system.css`
and use its semantic action palette.

- Fold/neutral is slate, call/continue is green, raise/aggression is pink,
  shove/all-in is amber, and the selected filter uses the shared yellow focus.
- Keep route-specific geometry only when the data needs it; do not introduce a
  route-specific action palette, focus treatment, or sample-confidence style.
- Before publishing a sparse source-backed chart, refresh its exact FunFarm
  MCP slice. Show only observed integer-counter rates; if a refreshed slice is
  structurally empty, do not turn it into a selector state. Never render a
  disabled data choice or a dead-end control. Do not use learner-facing
  sample-state labels or model a hand-level percentage.
- Keep raw counts, query IDs, extraction windows, smoothing formulas, and
  methodology notes out of repeated learner-facing cells. One short source
  label per evidence block is enough; detailed provenance belongs in source
  files and tests.
- Run `node scripts/check-chart-system-contract.mjs` after adding or renaming a
  trainer route.

## Complete data-backed trainer matrices

A source-backed 169-hand chart is not reviewable or releasable while any
visible selector produces missing hand cells.

- Exhaust the authoritative historical window while preserving the exact spot
  filters before lowering a sample threshold or widening a definition.
- For every visible chart state, require 169/169 benchmark cells and 169 shared
  cells for every cohort comparison. Keep a contract test that enumerates all
  visible selectors.
- Never fill missing cells with smoothing, interpolation, solver or model
  output, or a hidden lower sample threshold.
- If the exact fine-grained state remains sparse after exhausting history,
  either aggregate additive integer counters into an honestly relabelled,
  fully covered scenario or use a contextual catalog containing only complete
  scenarios. Never render the sparse tuple as disabled, never silently replace
  it with a neighboring slice, and never present a patchy matrix as finished.
- Every rendered selector button must lead to a complete chart. Coverage tests
  must fail on any disabled selector, any visible dead end, or any automatic
  fallback that changes the selected poker situation without an explicit
  learner-facing label.
- Before requesting review, run the coverage contract and exact-route desktop
  and mobile browser smoke, and inspect every visible selector rather than only
  the default state.

## Exact observed-hand extraction

Do not publish a trainer snapshot unless its raw-hand extraction is reproducible
and version-safe.

- Select the latest tracker version for each `hand_player_id` before applying
  poker/spot predicates. Immutable source partitions such as the half-open
  time window, user id and rank-at-hand bridge may constrain that pass. A broad
  candidate-id prefilter is allowed only when the exact spot filters are
  repeated after `argMax`; a superseded qualifying version must never survive
  because its replacement leaves the spot.
- Classify actions from exhaustive integer counters. An effective shove is a
  raise that exhausts the effective stack after subtracting the player's posted
  blind; do not rely on `is_preflop_allin` alone and do not classify a normal
  fixed-size open as a shove.
- Shard only along boundaries that can be merged exactly. Sum additive action
  counters; recompute percentages and gates after the merge. Never add
  `uniqExact` results from overlapping/time shards or hand-join CSVs manually.
- Generated browser data must record the query-template hash, every source
  execution identity and source-file hash, the half-open analysis window, and
  the coverage gate. Use the provider job id when one is returned; for a
  synchronous export whose API returns no job id, record `sync:<querySha256>`
  and `executionMode: sync` instead of borrowing an unrelated queued job id.
  Tests must fail when any of those provenance fields is absent or when action
  counters do not partition every opportunity.
