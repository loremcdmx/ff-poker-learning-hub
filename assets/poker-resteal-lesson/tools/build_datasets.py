#!/usr/bin/env python3
"""Build the resteal-lesson field-data JSON deliverables from raw ClickHouse CSV exports.

Inputs (in SCRATCH dir):
  opens_raw.csv       -> field_opens.json
  vsjam_raw.csv       -> field_vs_jam.json
  call_range_raw.csv  -> field_call_range.json  (optional; skipped if missing)

Outputs -> DATA dir.
Everything is deterministic; rerun after refreshing the CSVs.
"""
import csv, json, os, collections

SCRATCH = os.environ.get("SCRATCH", ".")
DATA = os.environ.get("DATA", ".")

POS_NAME = {"0": "BTN", "1": "CO"}
BANDS = ["25-30", "30-35", "35-40"]
CATS = ["good_reg", "mid_reg", "weak_reg", "nit", "aggro_fish", "passive_fish",
        "semipassive_fish", "aggro_sticky", "aggro_foldy", "unknown"]


def r(x, n=4):
    return round(x, n)


def frac(num, den):
    return r(num / den) if den else None


# ---------------------------------------------------------------- field_opens
def build_opens():
    rows = list(csv.DictReader(open(os.path.join(SCRATCH, "opens_raw.csv"))))
    for row in rows:
        for k in ("n_opp", "open_any", "open_clean", "open_jam",
                  "sz_le22", "sz_22_3", "sz_3_10", "sz_gt10", "limp"):
            row[k] = int(row[k])

    def metrics(agg):
        n = agg["n_opp"]; oa = agg["open_any"]
        return {
            "n_opportunities": n,
            "open_any_pct": frac(oa, n),
            "open_clean_pct": frac(agg["open_clean"], n),
            "open_jam_pct": frac(agg["open_jam"], n),
            "limp_pct": frac(agg["limp"], n),
            "open_size_mix": {
                "le2.2": frac(agg["sz_le22"], oa),
                "2.2-3": frac(agg["sz_22_3"], oa),
                "3-10": frac(agg["sz_3_10"], oa),
                "gt10": frac(agg["sz_gt10"], oa),
            },
        }

    KEYS = ("n_opp", "open_any", "open_clean", "open_jam",
            "sz_le22", "sz_22_3", "sz_3_10", "sz_gt10", "limp")

    def newagg():
        return {k: 0 for k in KEYS}

    def add(agg, row):
        for k in KEYS:
            agg[k] += row[k]

    by_band = {}                       # cat -> pos -> band -> metrics
    pooled_25_40 = {}                  # cat -> pos -> metrics (bands 25-40)
    pooled_ge25 = {}                   # cat -> pos -> metrics (all >=25)
    agg_2540 = collections.defaultdict(newagg)   # (cat,pos)
    agg_ge25 = collections.defaultdict(newagg)   # (cat,pos)
    share_2540 = collections.defaultdict(int)    # (pos,cat) -> n_opp in 25-40
    share_ge25 = collections.defaultdict(int)

    for row in rows:
        cat, pos, band = row["category"], row["position"], row["band"]
        pname = POS_NAME[pos]
        # pooled >= 25 always
        add(agg_ge25[(cat, pname)], row)
        share_ge25[(pname, cat)] += row["n_opp"]
        if band in BANDS:  # 25-40 detail
            by_band.setdefault(cat, {}).setdefault(pname, {})[band] = metrics(row)
            add(agg_2540[(cat, pname)], row)
            share_2540[(pname, cat)] += row["n_opp"]

    for (cat, pname), agg in agg_2540.items():
        pooled_25_40.setdefault(cat, {})[pname] = metrics(agg)
    for (cat, pname), agg in agg_ge25.items():
        pooled_ge25.setdefault(cat, {})[pname] = metrics(agg)

    def share_block(share):
        out = {}
        tot = collections.defaultdict(int)
        for (pname, cat), n in share.items():
            tot[pname] += n; tot["both"] += n
        for scope in ("BTN", "CO", "both"):
            out[scope] = {}
        for (pname, cat), n in share.items():
            out[pname][cat] = frac(n, tot[pname])
            out["both"][cat] = out["both"].get(cat, 0)
        both = collections.defaultdict(int)
        for (pname, cat), n in share.items():
            both[cat] += n
        out["both"] = {cat: frac(n, tot["both"]) for cat, n in both.items()}
        return out

    doc = {
        "meta": {
            "deliverable": "field_opens",
            "description": "Clean-open behavior of REAL observed opponents by player type, "
                           "opener position, and stack band. Powers the lesson 'opener type' toggle.",
            "window": "month_start_date 2026-01-01..2026-06-01 (6 monthly partitions)",
            "source_table": "analytics.int_tracker_hand_joined_for_opp_id + tracker_united_player_cats",
            "spot": "BTN(0)/CO(1) opener, is_3_9_max, cnt_players>=5, is_preflop_unopened, "
                    "opener OWN stack_size_bb in band (cleanliness = no short-stack layer behind).",
            "value_convention": "all *_pct and open_size_mix values are FRACTIONS in [0,1] (x100 for percent).",
            "definitions": {
                "open_any_pct": "is_rfi=1 / opportunities",
                "open_clean_pct": "is_rfi=1 AND raise+blind made <= 3.0bb / opportunities",
                "open_jam_pct": "is_rfi=1 AND (raise >= 10bb OR raise >= 85% of stack) / opportunities",
                "open_size_mix": "shares of raise size among is_rfi opens (bb of raise+blind made amount)",
                "limp_pct": "is_preflop_limp=1 / opportunities",
                "category_share": "share of opportunities contributed by each category (field mix)",
            },
            "positions": {"0": "BTN", "1": "CO"},
            "categories": CATS,
        },
        "by_band": by_band,
        "pooled_25_40": pooled_25_40,
        "pooled_ge25": pooled_ge25,
        "category_share": {
            "window_25_40": share_block(share_2540),
            "window_ge25": share_block(share_ge25),
        },
    }
    json.dump(doc, open(os.path.join(DATA, "field_opens.json"), "w"),
              ensure_ascii=False, indent=2)
    return doc


# ------------------------------------------------------------- field_vs_jam
def build_vsjam():
    rows = list(csv.DictReader(open(os.path.join(SCRATCH, "vsjam_raw.csv"))))
    for row in rows:
        row["n_faced"] = int(row["n_faced"]); row["n_fold"] = int(row["n_fold"])

    def metrics(nf, nfold):
        return {
            "n_faced": nf,
            "fold_pct": frac(nfold, nf),
            "continue_pct": frac(nf - nfold, nf),
        }

    by_pos_band = {}                                   # cat -> pos -> band
    by_band = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0]))  # cat -> band
    pooled = collections.defaultdict(lambda: [0, 0])   # cat
    for row in rows:
        cat, pname, band = row["category"], POS_NAME[row["position"]], row["band"]
        by_pos_band.setdefault(cat, {}).setdefault(pname, {})[band] = metrics(row["n_faced"], row["n_fold"])
        by_band[cat][band][0] += row["n_faced"]; by_band[cat][band][1] += row["n_fold"]
        pooled[cat][0] += row["n_faced"]; pooled[cat][1] += row["n_fold"]

    doc = {
        "meta": {
            "deliverable": "field_vs_jam",
            "description": "How the opener REACTS to a resteal jam (3bet all-in) from the blinds, "
                           "by player type. continue = call or re-jam (villain already all-in).",
            "window": "month_start_date 2026-01-01..2026-06-01",
            "source_table": "analytics.int_tracker_hand_joined_for_opp_id + tracker_united_player_cats",
            "spot": "opener's clean open (BTN/CO, is_rfi, raise<=3bb) that faced a 3bet sized "
                    "22..45x bb (proxy for 25-40bb resteal jam); preflop_effective_stack_size_bb 25..40.",
            "value_convention": "fold_pct / continue_pct are FRACTIONS in [0,1].",
            "positions": {"0": "BTN", "1": "CO"},
        },
        "by_position_band": by_pos_band,
        "by_band": {cat: {b: metrics(v[b][0], v[b][1]) for b in v} for cat, v in by_band.items()},
        "pooled": {cat: metrics(v[0], v[1]) for cat, v in pooled.items()},
    }
    json.dump(doc, open(os.path.join(DATA, "field_vs_jam.json"), "w"),
              ensure_ascii=False, indent=2)
    return doc


# --------------------------------------------------------- field_call_range
SUPER = {  # for merging small categories
    "good_reg": "reg", "mid_reg": "reg", "weak_reg": "reg", "nit": "reg",
    "aggro_fish": "fish", "passive_fish": "fish", "semipassive_fish": "fish",
    "aggro_sticky": "fish", "aggro_foldy": "fish", "unknown": "unknown",
}


def build_call_range():
    path = os.path.join(SCRATCH, "call_range_raw.csv")
    if not os.path.exists(path):
        print("call_range_raw.csv missing - skipping field_call_range.json")
        return None
    rows = list(csv.DictReader(open(path)))
    for row in rows:
        row["c"] = int(row["c"])

    cat_hands = collections.defaultdict(lambda: collections.Counter())
    cat_act = collections.defaultdict(lambda: collections.Counter())
    cat_total = collections.Counter()
    cat_known = collections.Counter()   # excludes 'unknown' holecards
    pooled_hands = collections.Counter()
    pooled_act = collections.Counter()

    for row in rows:
        cat, hand, act, c = row["category"], row["hand"], row["act"], row["c"]
        cat_hands[cat][hand] += c
        cat_act[cat][act] += c
        cat_total[cat] += c
        if hand != "unknown":
            cat_known[cat] += c
        pooled_hands[hand] += c
        pooled_act[act] += c

    def block(hands, act, total, known):
        return {
            "n_total": total,
            "n_known_holecards": known,
            "unknown_holecards": total - known,
            "act_split": dict(act),
            "hands": dict(hands.most_common()),
        }

    by_category = {}
    small = {}
    for cat in cat_total:
        by_category[cat] = block(cat_hands[cat], cat_act[cat], cat_total[cat], cat_known[cat])
        if cat_total[cat] < 300:
            small[cat] = cat_total[cat]

    # super-groups: always provide (useful), and flag which small cats they cover
    sg_hands = collections.defaultdict(lambda: collections.Counter())
    sg_act = collections.defaultdict(lambda: collections.Counter())
    sg_total = collections.Counter()
    sg_known = collections.Counter()
    for cat in cat_total:
        g = SUPER.get(cat, "unknown")
        sg_hands[g].update(cat_hands[cat])
        sg_act[g].update(cat_act[cat])
        sg_total[g] += cat_total[cat]
        sg_known[g] += cat_known[cat]
    super_groups = {g: block(sg_hands[g], sg_act[g], sg_total[g], sg_known[g]) for g in sg_total}

    pooled_known = sum(v for h, v in pooled_hands.items() if h != "unknown")
    pooled_total = sum(pooled_hands.values())

    doc = {
        "meta": {
            "deliverable": "field_call_range",
            "description": "Actual holecards with which the field CONTINUES (calls/re-jams) vs a hero "
                           "resteal jam, by opener type. Counts of hole-card labels.",
            "window": "month_start_date 2026-04-01..2026-06-01 (NARROWED to 3 months: the 6-month "
                      "async join did not finish in reasonable time; see README-field.md)",
            "source": "hero jam hands (analytics.int_tracker_hand_joined) JOIN opener seat "
                      "(stg_tracker__hand_stats, is_preflop_face_3bet, action in C/R) -> players -> cats -> lookup_holecards.",
            "continue_def": "preflop_face_3bet_action IN ('C','R'); vs an all-in jam this is call (C) "
                            "or cover-and-reraise (R). act_split reports the C/R breakdown.",
            "note_unknown_holecards": "rows where opponent holecards were not recorded show hand='unknown' "
                                      "(mucked without showdown). n_known_holecards excludes them.",
            "super_group_map": SUPER,
            "small_categories_lt300_calls": small,
        },
        "by_category": by_category,
        "super_groups": super_groups,
        "pooled": block(pooled_hands, pooled_act, pooled_total, pooled_known),
    }
    json.dump(doc, open(os.path.join(DATA, "field_call_range.json"), "w"),
              ensure_ascii=False, indent=2)
    return doc


if __name__ == "__main__":
    o = build_opens()
    v = build_vsjam()
    cr = build_call_range()
    print("field_opens.json: categories", len(o["by_band"]))
    print("field_vs_jam.json: categories", len(v["pooled"]))
    if cr:
        print("field_call_range.json: categories", len(cr["by_category"]),
              "pooled_total", cr["pooled"]["n_total"])
