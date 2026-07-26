# Standalone Learning Hub · release scope 2026-07-22

These three product promises were conditional in the v2 release gate. Their
release decision is fixed here so implementation and verification cannot leave
an ambiguous half-enabled state.

## Rating, remote sync, and online lobby — outside this static release

The standalone deployment has no server functions. The UI must therefore not
promise remote rating, remote session sync, or online play:

- missing `POST /api/simulator-sessions` and `POST /api/trainer-events`
  terminate as `not configured` instead of retrying forever;
- local queues are bounded by item count, byte size, and retry count;
- the online lobby remains hidden unless its explicit feature flag is enabled
  and `/api/rooms` returns a valid JSON health response.

Adding those promises later requires a separate backend release and live E2E
proof; source code or a local mock is not enough.

## C-bet field library — included

The library is part of the release. It has a normal lesson-header entry and is
reachable without a query-string shortcut. Observed rates obey the shared
exact-frequency gate; methodical advice is labelled separately from field data.

## Simulator analytics — included

The analytics surface remains visible. Week, season, chart, and `Твой результат`
must all derive from the same rendered-hand set and honor the current table-size
filter. An empty filtered slice renders an explicit empty state instead of
borrowing results from another slice.

These decisions are release scope, not proof of readiness. The final candidate
still needs the focused contracts, exact-route desktop/mobile browser smoke,
clean console/overflow checks, chip-integrity checks, and production SHA proof.

## Two separate verification gates

`npm run check` proves that lesson contracts are internally consistent and that
unverified field data fail-closes without leaking stale percentages. A green
result there is deliberately **not** evidence that the observed-data layer is
ready for release.

`npm run check:release-data` is the mandatory observed-data publication gate.
It requires `ready` full-window artifacts for the three benchmark lessons,
RFI, resteal, c-bet, check-raise and VS3, including the provenance enforced by
each runtime contract. It is expected to fail while any one of those surfaces
is in `methodology_only` or quarantine. `npm run check:release` runs both gates
and is the command to use for a release candidate.
