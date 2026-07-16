# C-bet IP против BB: публичная методология

Строгий спот урока:

`Hero unopened RFI → BB is the only caller → HU SRP → BB checks flop → Hero IP decision`.

Donk pots, limped pots, SB-vs-BB, multiway, 3-bet pots and other check-raise
sequences are excluded. A check-raise is counted only as
`BB check → Hero non-all-in c-bet → BB raise`.

The Q2 2026 browser asset is built from a deterministic 70% physical-hand
sample:

- 2,526,583 strict candidate keys;
- 2,300,854 matched compact hands (91.1% key coverage);
- 2,297,953 structurally valid spots;
- 2,256,311 spots with rank as of the hand timestamp.

Exact ranks 1–17 and bands R1–5, R6–10 and R11–17 are opportunity-weighted.
Overall c-bet frequency uses the full user-day RvBB population; board texture,
size, observed fold equity and check-raise response use the HH sample. The
lesson's eight board families are mutually exclusive.

Validation status is `pass_with_warnings`:

- compact HH key coverage is 91.1%;
- 61.0% of valid hand headers have no timezone token and are interpreted as
  UTC for the as-of rank join;
- observed fold equity by size is descriptive because players select both the
  hand and the size; it is not a causal estimate;
- hands without a unique rank interval or a parseable exact action sequence are
  counted and excluded, never imputed.

No hand histories, nicknames, player identifiers or private raw extracts are
shipped to the browser. The public `data.js` contains only aggregated counts,
rates, confidence bounds and methodology labels.
