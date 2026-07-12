# Resteal lesson — hero outcomes (real-hand-DB) datasets

Workstream: hero outcomes for the "jam vs call in resteal spots" lesson block.
All numbers come from our real hand database (ClickHouse `analytics.int_tracker_hand_joined`,
1 row = project player × hand). No frontend logic here — just the JSON datasets and how they
were built.

Files produced by this workstream (do not confuse with the field/equity workstream files in
the same folder):

- `hero_outcomes.json` — per (rank_group × hand_category × action) realized results, pooled over
  bands and split by band. The heart of "push vs call by category".
- `hero_bustouts.json` — bustout frequency and post-hand stack per (rank_group × action × band),
  plus a strong/weak roll-up.
- `hero_realization.json` — equity-realization building blocks for calls (per rank_group × category).
- `cleanup_waterfall.json` — honest sample-cleanliness ladder (raw → clean → tighter) for g1_8,
  g9_11, g12_15, ALL.

SQL that produced the underlying grain: `../tools/q_export_grain.sql` (plus the six per-month
runs described below). `../tools/q1_hero_fine.sql` and `../tools/q2_cleanup_waterfall.sql` are an
earlier id-embedded variant kept for reference — the shipped pipeline uses the grain export.

---

## Window & spot

- **Window:** `month_start_date IN (2026-01-01 … 2026-06-01)` (six monthly partitions).
- **RAW resteal spot** (verified definition):
  `(is_sb=1 OR is_bb=1) AND val_preflop_action_facing=4 AND (is_first_aggressor_co=1 OR is_first_aggressor_btn=1)
   AND coalesce(cnt_preflop_face_limpers,0)=0 AND preflop_effective_stack_size_bb BETWEEN 25 AND 40
   AND user_id IS NOT NULL`.
  Hero sits in a blind, faces exactly one CO/BTN open, no limpers, 25–40bb effective.
- **CLEAN spot** = RAW `AND is_preflop_could_3bet=1 AND preflop_2bet_and_blind_facing_amount_bb <= 3.0`
  (open size ≤ 3.0bb). This is the spot used for `hero_outcomes`, `hero_bustouts`, `hero_realization`.
  `cleanup_waterfall` walks RAW → CLEAN → tighter.

`preflop_2bet_and_blind_facing_amount_bb` is treated as the **open size in bb** ("raise-to").

## Actions

- `jam`  = `preflop_action='R' AND is_preflop_allin=1`
- `call` = `substring(preflop_action,1,1)='C'`
- `r3small` = starts with `R` and is not an all-in (small/non-all-in 3-bet)
- `fold` = `preflop_action='F'`

These are exhaustive over the spot (an `other` bucket exists in code but is empty here).

## Rank groups

League `rang` buckets: **g1_8** (rang 1–8), **g9_11** (9–11), **g12_15** (12–15). Membership is
**per (user_id, month)** and is taken verbatim from the source-of-truth userlists
(`scratchpad/resteal/userlists/{group}_{YYYY-MM-01}.txt`). A player can change bucket month to
month; the month of a hand must match the month of the list. **ALL** = union of the three buckets
(not "all DB users"). Players who are in the table but in no list for that month (g16_18 or
unranked) are excluded from every group and from ALL.

Membership was attached in Python from the exact id files, so there is **zero id-transcription
risk** (see "How it was built"). Attach rate: **1,308,315 / 1,443,886 grain rows (90.6%)** carry a
group; on a spots-weighted basis ALL covers **3,364,834 / 3,604,236 raw spots (93.4%)**.

## Hand categories (from `holecards_str`)

| category | hands |
|---|---|
| pair_22_66 | 22,33,44,55,66 |
| pair_77_99 | 77,88,99 |
| pair_TT_plus | TT,JJ,QQ,KK,AA |
| ax_strong | ATo/ATs+ incl AJ,AQ,AK (both suits) |
| ax_weak | A2–A9 suited & offsuit |
| broadway_suited | KQs,KJs,KTs,QJs,QTs,JTs |
| broadway_offsuit | KQo,KJo,KTo,QJo,QTo,JTo |
| suited_conn_low | T9s,98s,87s,76s,65s,54s |
| other | everything else |

`holecards_str IS NULL` (hero's own cards unknown, ~9% of spots — mostly non-list players) is
categorized `unknown` and **excluded** from category-based outputs (`hero_outcomes`,
`hero_realization`). It is **kept** in `hero_bustouts` (which does not need cards) and in
`cleanup_waterfall` (raw counts).

## Effective-stack bands

`e25_30` = [25,30), `e30_35` = [30,35), `e35_40` = [35,40] (from `preflop_effective_stack_size_bb`).

---

## Metric definitions

bb-normalization: every chips value divided by `bb_amount`.

### hero_outcomes.json  (CLEAN spot, unknown cards excluded)
Blocks `pooled` (over bands) and `by_band`, keyed `[rank_group][category][action]`:
- `n`
- `avg_won_bb` = mean(`chips_won`/`bb_amount`)  — realized chips result
- `avg_ev_bb`  = mean(`chips_ev`/`bb_amount`)   — all-in-adjusted EV
- `jam_called_pct` = mean(`is_showdown`)  — for `jam` this is the fraction that got called
  (a preflop jam reaches showdown iff called). Present for all actions; only meaningful for jam.
- `won_hand_pct` = mean(`is_won_hand`)

### hero_bustouts.json  (CLEAN spot, all cards incl unknown)
Blocks `pooled`, `by_band`, `by_strength`, keyed by `[rank_group][action]` (jam, call, r3small):
- `bust_pct` = fraction of hands where the player was eliminated **in this hand**:
  `(chips_before_player + chips_won)/bb_amount < 0.75`
- `avg_stack_after_bb` = mean(`(chips_before_player + chips_won)/bb_amount`)
- `avg_stack_before_bb`, `avg_ev_bb` for context
- `by_strength`: strong = {pair_TT_plus, pair_77_99, ax_strong, broadway_suited}; weak = the rest.

### hero_realization.json  (CLEAN spot, calls only, unknown excluded)
`[by_group][rank_group][category]`:
- `n_calls`, `avg_won_bb`, `avg_ev_bb`, `won_hand_pct`
- `avg_open_size_bb` = mean(open size)
- `frac_hero_bb` = share of these calls where hero is the BB (rest are SB)
- `avg_ante_player_bb` = mean(`ante_amount`/`bb_amount`) — **per-player** ante
- `avg_ante_total_bb`  = mean(`cnt_players * ante_amount`/`bb_amount`) — total dead ante at the table
- `avg_cnt_players`
- `avg_pot_after_call_bb` — computed pot the hero calls into, using:
  ```
  avg_pot_after_call_bb = 2*avg_open_size_bb + dead_other_blind + avg_ante_total_bb
  dead_other_blind      = frac_hero_bb*0.5 + (1 - frac_hero_bb)*1.0
  ```
  Rationale: opener puts in `open`, hero matches `open`; the *other* blind is dead (0.5bb if hero
  is BB → SB dead; 1.0bb if hero is SB → BB dead); plus total table antes. This is a heads-up-to-
  the-opener approximation — it ignores occasional extra callers/squeezes and treats hero's own
  posted blind as part of hero's `open` contribution. The raw components are all exposed so the
  frontend can recompute realization however it likes (e.g. `realization = (avg_won_bb + invested) /
  (equity_share * pot)`).

### cleanup_waterfall.json  (RAW spot)
`[groups][rank_group]` = ordered steps a→e, each cumulative:
- a: raw resteal spot (no could_3bet, no open-size limit)
- b: + `is_preflop_could_3bet=1`
- c: + open ≤ 3.0bb  (== CLEAN spot)
- d: + open ≤ 2.2bb  (min-raise opens only)
- e: + BTN opener AND BB hero only
Each step: `n_spots`, `jam_pct`, `call_pct`, `fold_pct` (of `n_spots`).

---

## Volumes

- Grain rows exported: **1,443,886** (per user × month × category × action × band × flags).
- Raw resteal spots by group: g1_8 = 1,147,502 · g9_11 = 853,711 · g12_15 = 1,363,621 · ALL = 3,364,834.
- CLEAN spot, ALL users (validation baseline): jam 192,892 · call 917,440 · r3small 213,512 · fold 1,738,449.

---

## Sanity checks (all passed)

1. **Pipeline exactness.** The grain, re-aggregated with no group filter over the CLEAN spot,
   reproduces a direct ClickHouse query to the row and to 3 decimals:
   jam n=192,892 EV=+1.917 · call n=917,440 EV=−0.235 · r3small n=213,512 EV=+2.513 · fold n=1,738,449 EV=−0.749.
2. **Row-count reconciliation.** Six per-month CSVs sum to 1,443,886, matching the server-side
   `count()` of the grain exactly.
3. jam blended EV ≈ **+1.9bb** (inside the expected +1.5…+3.5 band); call blended EV ≈ **−0.24bb**
   (at the expected −0.5…+0.2 edge). NB: the +1.5…+3.5 band is for the *blended* jamming range;
   per-category jam EV ranges from ~0 (marginal hands) to +5 (premium pairs).
4. `pair_22_66` call EV (ALL +0.14) is worse than `broadway_suited` call EV (ALL +0.51). ✔

---

## Key findings (honest)

**Jam beats call for the resteal core.** Pooled EV gap (jam − call), ALL group:
ax_strong +1.68 · pair_77_99 +1.20 · pair_22_66 +0.72 · ax_weak +0.20 · broadway_offsuit +0.14 ·
broadway_suited +0.14. The gap is largest exactly where restealing lives (small/mid pairs, Ax).

**Two honest exceptions — do not claim "jam always wins":**
- `pair_TT_plus`: calling/keeping villain in is about as good or better than jamming
  (ALL: call +5.36 vs jam +5.16; g1_8 call +6.63 vs jam +4.78). Premium pairs realize huge value
  by not folding out worse.
- `suited_conn_low`: both lines hover near/below zero at 25–40bb (ALL: call −0.19, jam −0.28);
  these are mostly fold-or-marginal, tiny jam samples.

**Bustout is the honest cost of jamming.** Per hand, jamming eliminates the hero far more often
than calling: ALL jam bust 9.3% vs call bust 1.2% (g12_15: 10.2% vs 1.2%). Avg stack after: jam
43.5bb vs call 48.4bb. This does **not** contradict "jam is +EV": `chips_ev` is all-in-adjusted, so
the higher jam EV already prices in the variance. The point of "who jams is right" is fold-equity /
not bleeding blinds, not lower single-hand bust risk — present it that way.

**The sample is clean.** Cleanup waterfall barely moves jam%:
- g12_15: raw 4.27% → could3 4.36% → clean 3.99% → open≤2.2 3.94% → BTN-vs-BB 4.35%.
- g1_8:   raw 8.64% → 8.74% → 8.54% → 8.70% → 9.71%.
- ALL:    raw 6.45% → 6.56% → 6.34% → 6.46% → 7.13%.
Filtering out big opens / non-3bet-able spots does **not** turn a 4% jam rate into 20%. The low
observed jam frequency is a real behavior, not a denominator artifact. (Note the separate behavioral
signal: STRONGER players (g1_8, rang 1 = best) jam ~2x as often as weaker players (g12_15), ~8.6% vs ~4.3%.)

---

## Limits / what was intentionally not done

- **EV is all-in-adjusted** (`chips_ev`); `avg_won_bb` is the raw realized result. They diverge only
  for all-in hands (jam, some r3small); for call/fold they are identical.
- **No breakdown by opener type** (CO vs BTN) inside the category tables, and **no PKO/Freeze split** —
  both were out of scope. A CO-vs-BTN split for the whole spot lives in `cleanup_waterfall` step (e)
  (BTN-opener + BB-hero only). Adding a per-category opener split is a straightforward extension of
  the grain (`opener_btn` is already a grain column) if needed later.
- **`unknown`-holecard hands** (~9%) are dropped from category outputs; they are disproportionately
  non-list players, so the effect on grouped category numbers is negligible.
- `avg_pot_after_call_bb` is an approximation (see formula) — the frontend should treat the exposed
  components as the source of truth, not the single pot number.

## How it was built

1. Server-side aggregation of the RAW resteal spot to a per-(user, month, category, action, band,
   could3, open_bucket, opener_btn, hero_bb) grain with summed accumulators — **no user-id lists in
   SQL** (`../tools/q_export_grain.sql`), run once per month (six sync `csv_file` exports; the
   full-window export timed out, per-month did not) and concatenated to `grain_export.csv`.
2. `scratchpad/resteal/process_hero.py` attaches rank-group per (user_id, month) from the exact
   userlist files and derives every deliverable from the summed accumulators, so pooling across
   bands / months / groups stays exact.
