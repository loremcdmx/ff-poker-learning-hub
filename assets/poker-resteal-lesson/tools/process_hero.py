#!/usr/bin/env python3
"""Build resteal hero-outcomes JSON deliverables from the exported per-(user,month) grain.

Group membership (rank_group per user per month) is attached EXACTLY from the userlist
files (source of truth), so there is zero id-transcription risk. All averages are derived
from summed accumulators so pooling across bands / months / groups stays exact.
"""
import os, json, csv, sys
from collections import defaultdict

SCRATCH = "/private/tmp/claude-501/-Users-loremcdmx-Documents-------------------------claude-worktrees-happy-colden-62f257/e9f2a8b6-d5dc-40c3-9ecb-4acfc179c4b6/scratchpad/resteal"
UL = os.path.join(SCRATCH, "userlists")
GRAIN_CSV = os.path.join(SCRATCH, "grain_export.csv")
OUT = "/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/assets/poker-resteal-lesson/data"

MONTHS = ["2026-01-01","2026-02-01","2026-03-01","2026-04-01","2026-05-01","2026-06-01"]
GROUPS = ["g1_8","g9_11","g12_15"]
CATEGORIES = ["pair_22_66","pair_77_99","pair_TT_plus","ax_strong","ax_weak",
              "broadway_suited","broadway_offsuit","suited_conn_low","other"]
ACTIONS = ["jam","call","r3small","fold"]
BANDS = ["e25_30","e30_35","e35_40"]
STRONG_CATS = {"pair_TT_plus","pair_77_99","ax_strong","broadway_suited"}
WEAK_CATS = {"pair_22_66","ax_weak","broadway_offsuit","suited_conn_low","other"}

# ---- membership: (user_id:int, month:str) -> group ----
def load_membership():
    mem = {}
    for m in MONTHS:
        for g in GROUPS:
            p = os.path.join(UL, f"{g}_{m}.txt")
            with open(p) as f:
                ids = [x.strip() for x in f.read().strip().split(",") if x.strip()]
            for uid in ids:
                mem[(int(uid), m)] = g
    return mem

# accumulator fields we sum
SUMF = ["n","sum_won_bb","sum_ev_bb","sum_showdown","sum_won_hand","n_stack","sum_bust",
        "sum_stack_after_bb","sum_before_bb","sum_open_bb","n_ante","sum_ante_total_bb",
        "sum_ante_player_bb","sum_cnt_players","n_cnt"]

def new_acc():
    return {k:0.0 for k in SUMF}

def add(acc, row):
    for k in SUMF:
        acc[k]+=row[k]

def main():
    mem = load_membership()
    # counts for sanity
    n_rows=0; n_attached=0; n_unknown_user=0
    # raw-grain rows attached to a group, kept in memory as list of dicts (small: ~1.4M but we
    # aggregate on the fly instead of storing all)

    # Accumulators keyed for each deliverable. We iterate CSV once.
    # For pooling to ALL, we add each attached row to both its own group and 'ALL'.
    def gkeys(g):
        return (g, "ALL")

    # D1 clean outcomes: (rank_group, category, action, band) and (rank_group, category, action) pooled
    d1_band = defaultdict(new_acc)
    d1_pool = defaultdict(new_acc)
    # D2 bustouts clean: (rank_group, action, band) + pooled + strength
    d2_band = defaultdict(new_acc)
    d2_pool = defaultdict(new_acc)
    d2_strength = defaultdict(new_acc)  # (rank_group, action, strength)
    # D3 realization clean calls: (rank_group, category)
    d3 = defaultdict(new_acc)
    d3_bb = defaultdict(float)  # (rank_group, category) -> n of calls where hero is BB
    # D4 waterfall RAW: (rank_group, step) accumulate n and per-action counts
    # store as dict[(group,step)] -> {'n':,'jam':,'call':,'fold':}
    d4 = defaultdict(lambda: {"n":0.0,"jam":0.0,"call":0.0,"fold":0.0})

    with open(GRAIN_CSV, newline="") as f:
        r = csv.DictReader(f)
        for raw in r:
            n_rows+=1
            uid = int(raw["user_id"]); month = raw["month_start_date"]
            g = mem.get((uid, month))
            if g is None:
                n_unknown_user+=1
                continue
            n_attached+=1
            row = {
                "hand_category": raw["hand_category"],
                "action": raw["action"],
                "band": raw["band"],
                "could3": int(raw["could3"]),
                "open_bucket": raw["open_bucket"],
                "opener_btn": int(raw["opener_btn"]),
                "hero_bb": int(raw["hero_bb"]),
            }
            for k in SUMF:
                row[k] = float(raw[k])

            cat=row["hand_category"]; act=row["action"]; band=row["band"]
            clean = (row["could3"]==1) and (row["open_bucket"] in ("le22","le30"))
            strength = "strong" if cat in STRONG_CATS else "weak"

            for gg in gkeys(g):
                # D4 waterfall (RAW spot -> all rows)
                # step membership
                b = row["could3"]==1
                c = b and row["open_bucket"] in ("le22","le30")
                d = b and row["open_bucket"]=="le22"
                e = c and row["opener_btn"]==1 and row["hero_bb"]==1
                steps = {"a":True,"b":b,"c":c,"d":d,"e":e}
                for sname,ok in steps.items():
                    if ok:
                        cell=d4[(gg,sname)]
                        cell["n"]+=row["n"]
                        if act=="jam": cell["jam"]+=row["n"]
                        elif act=="fold": cell["fold"]+=row["n"]
                        elif act=="call": cell["call"]+=row["n"]

                if clean:
                    # D1 outcomes (exclude unknown category)
                    if cat!="unknown" and act in ACTIONS:
                        add(d1_band[(gg,cat,act,band)], row)
                        add(d1_pool[(gg,cat,act)], row)
                    # D2 bustouts (all categories incl unknown; actions jam/call/r3small)
                    if act in ("jam","call","r3small"):
                        add(d2_band[(gg,act,band)], row)
                        add(d2_pool[(gg,act)], row)
                        if cat!="unknown":
                            add(d2_strength[(gg,act,strength)], row)
                    # D3 realization (calls only, exclude unknown)
                    if act=="call" and cat!="unknown":
                        add(d3[(gg,cat)], row)
                        if row["hero_bb"]==1:
                            d3_bb[(gg,cat)] += row["n"]

    RG = GROUPS + ["ALL"]

    def rd(x, nd=4):
        return round(x, nd)

    def outcome_metrics(a):
        n=a["n"]
        out={"n":int(n)}
        if n>0:
            out["avg_won_bb"]=rd(a["sum_won_bb"]/n)
            out["avg_ev_bb"]=rd(a["sum_ev_bb"]/n)
            out["jam_called_pct"]=rd(a["sum_showdown"]/n)
            out["won_hand_pct"]=rd(a["sum_won_hand"]/n)
        else:
            out.update({"avg_won_bb":None,"avg_ev_bb":None,"jam_called_pct":None,"won_hand_pct":None})
        return out

    # ---------- D1 hero_outcomes.json ----------
    d1={"meta":{}, "by_band":{}, "pooled":{}}
    for g in RG:
        d1["pooled"][g]={}
        d1["by_band"][g]={}
        for cat in CATEGORIES:
            pblock={}
            for act in ACTIONS:
                a=d1_pool.get((g,cat,act))
                if a and a["n"]>0:
                    pblock[act]=outcome_metrics(a)
            if pblock:
                d1["pooled"][g][cat]=pblock
            bblock={}
            for band in BANDS:
                catband={}
                for act in ACTIONS:
                    a=d1_band.get((g,cat,act,band))
                    if a and a["n"]>0:
                        catband[act]=outcome_metrics(a)
                if catband:
                    bblock[band]=catband
            if bblock:
                d1["by_band"][g][cat]=bblock

    # ---------- D2 hero_bustouts.json ----------
    def bust_metrics(a):
        ns=a["n_stack"]; n=a["n"]
        out={"n":int(n), "n_stack":int(ns)}
        if ns>0:
            out["bust_pct"]=rd(a["sum_bust"]/ns)
            out["avg_stack_after_bb"]=rd(a["sum_stack_after_bb"]/ns)
            out["avg_stack_before_bb"]=rd(a["sum_before_bb"]/ns)
        else:
            out.update({"bust_pct":None,"avg_stack_after_bb":None,"avg_stack_before_bb":None})
        if n>0:
            out["avg_ev_bb"]=rd(a["sum_ev_bb"]/n)
        return out
    d2={"meta":{}, "by_band":{}, "pooled":{}, "by_strength":{}}
    for g in RG:
        d2["by_band"][g]={}
        d2["pooled"][g]={}
        d2["by_strength"][g]={}
        for act in ("jam","call","r3small"):
            a=d2_pool.get((g,act))
            if a and a["n"]>0:
                d2["pooled"][g][act]=bust_metrics(a)
            bb={}
            for band in BANDS:
                ab=d2_band.get((g,act,band))
                if ab and ab["n"]>0:
                    bb[band]=bust_metrics(ab)
            if bb:
                d2["by_band"][g][act]=bb
            sb={}
            for strength in ("strong","weak"):
                a2=d2_strength.get((g,act,strength))
                if a2 and a2["n"]>0:
                    sb[strength]=bust_metrics(a2)
            if sb:
                d2["by_strength"][g][act]=sb

    # ---------- D3 hero_realization.json ----------
    d3out={"meta":{}, "by_group":{}}
    for g in RG:
        block={}
        for cat in CATEGORIES:
            a=d3.get((g,cat))
            if not a or a["n"]==0:
                continue
            n=a["n"]
            avg_open = a["sum_open_bb"]/n
            avg_ante_total = a["sum_ante_total_bb"]/a["n_ante"] if a["n_ante"]>0 else None
            avg_ante_player = a["sum_ante_player_bb"]/a["n_ante"] if a["n_ante"]>0 else None
            avg_cnt = a["sum_cnt_players"]/a["n_cnt"] if a["n_cnt"]>0 else None
            frac_hero_bb = d3_bb.get((g,cat),0.0)/n if n>0 else None
            pot=None
            if avg_ante_total is not None and frac_hero_bb is not None:
                dead_other_blind = frac_hero_bb*0.5 + (1.0-frac_hero_bb)*1.0
                pot = 2.0*avg_open + dead_other_blind + avg_ante_total
            block[cat]={
                "n_calls":int(n),
                "avg_won_bb":rd(a["sum_won_bb"]/n),
                "avg_ev_bb":rd(a["sum_ev_bb"]/n),
                "won_hand_pct":rd(a["sum_won_hand"]/n),
                "avg_open_size_bb":rd(avg_open),
                "frac_hero_bb":rd(frac_hero_bb) if frac_hero_bb is not None else None,
                "avg_ante_total_bb":rd(avg_ante_total) if avg_ante_total is not None else None,
                "avg_ante_player_bb":rd(avg_ante_player) if avg_ante_player is not None else None,
                "avg_cnt_players":rd(avg_cnt,2) if avg_cnt is not None else None,
                "avg_pot_after_call_bb":rd(pot) if pot is not None else None,
            }
        d3out["by_group"][g]=block

    # ---------- D4 cleanup_waterfall.json ----------
    d4out={"meta":{}, "groups":{}}
    step_desc={
        "a":"raw resteal spot (no could_3bet / no open-size limit)",
        "b":"+ is_preflop_could_3bet=1",
        "c":"+ open <= 3.0bb (== CLEAN spot)",
        "d":"+ open <= 2.2bb (min-raise opens only)",
        "e":"+ BTN opener AND BB hero only",
    }
    for g in ["g1_8","g12_15","g9_11","ALL"]:
        steps=[]
        for sname in ["a","b","c","d","e"]:
            cell=d4.get((g,sname))
            if not cell or cell["n"]==0:
                steps.append({"step":sname,"desc":step_desc[sname],"n_spots":0})
                continue
            n=cell["n"]
            steps.append({
                "step":sname,
                "desc":step_desc[sname],
                "n_spots":int(n),
                "jam_pct":rd(cell["jam"]/n),
                "call_pct":rd(cell["call"]/n),
                "fold_pct":rd(cell["fold"]/n),
            })
        d4out["groups"][g]=steps

    # ---- meta ----
    meta_common={
        "window":"2026-01-01..2026-06-01 (six monthly partitions)",
        "spot":"resteal: (SB or BB) facing a single CO/BTN open (val_preflop_action_facing=4, is_first_aggressor_co|btn), no limpers, eff stack 25-40bb, project players only",
        "clean_definition":"is_preflop_could_3bet=1 AND open<=3.0bb (open = preflop_2bet_and_blind_facing_amount_bb)",
        "actions":"jam=preflop_action R & is_preflop_allin; call=starts with C; r3small=starts with R & not all-in; fold=F",
        "rank_groups":"g1_8/g9_11/g12_15 = league rang buckets, membership per (user,month) from userlists; ALL=union of the three",
        "bb_normalization":"chips_* divided by bb_amount",
        "bust_definition":"(chips_before_player + chips_won)/bb_amount < 0.75",
    }
    d1["meta"]=dict(meta_common, spot_used="CLEAN", note="hero_outcomes: CLEAN spot; unknown-holecard rows excluded")
    d2["meta"]=dict(meta_common, spot_used="CLEAN", note="hero_bustouts: CLEAN spot; all holecards incl unknown; strength: strong={pair_TT_plus,pair_77_99,ax_strong,broadway_suited}, weak=rest")
    d3out["meta"]=dict(meta_common, spot_used="CLEAN, calls only",
        pot_formula="avg_pot_after_call_bb = 2*avg_open_size_bb + dead_other_blind + avg_ante_total_bb; dead_other_blind = frac_hero_bb*0.5 + (1-frac_hero_bb)*1.0 (see README). Front-end computes realization from these components.")
    d4out["meta"]=dict(meta_common, spot_used="RAW->CLEAN waterfall", note="cleanup_waterfall: steps a..e are cumulative filters over the RAW spot; jam/fold/call pct of n_spots")

    os.makedirs(OUT, exist_ok=True)
    for fn,obj in [("hero_outcomes.json",d1),("hero_bustouts.json",d2),
                   ("hero_realization.json",d3out),("cleanup_waterfall.json",d4out)]:
        with open(os.path.join(OUT,fn),"w") as f:
            json.dump(obj,f,indent=2,ensure_ascii=False)

    print("grain rows read:", n_rows, "| attached to a group:", n_attached, "| not in any list:", n_unknown_user)
    # quick sanity dump
    def show(g,cat):
        for act in ("call","jam"):
            a=d1_pool.get((g,cat,act))
            if a and a["n"]>0:
                print(f"  {g} {cat} {act}: n={int(a['n'])} EV={a['sum_ev_bb']/a['n']:.3f} won={a['sum_won_bb']/a['n']:.3f}")
    print("--- SANITY d1 pooled ---")
    for g in ["g12_15","g1_8"]:
        show(g,"pair_22_66"); show(g,"broadway_suited")
    print("--- SANITY d4 waterfall g12_15 ---")
    for s in d4out["groups"]["g12_15"]:
        print("  ", s.get("step"), "n=",s.get("n_spots"), "jam%=",s.get("jam_pct"), "fold%=",s.get("fold_pct"))
    print("--- SANITY d4 waterfall g1_8 ---")
    for s in d4out["groups"]["g1_8"]:
        print("  ", s.get("step"), "n=",s.get("n_spots"), "jam%=",s.get("jam_pct"), "fold%=",s.get("fold_pct"))
    print("--- SANITY d2 bust pooled ---")
    for g in ["g12_15","g1_8"]:
        for act in ("jam","call"):
            a=d2_pool.get((g,act))
            if a: print(f"  {g} {act}: bust%={a['sum_bust']/a['n_stack']:.4f} stack_after={a['sum_stack_after_bb']/a['n_stack']:.2f} n={int(a['n'])}")

if __name__=="__main__":
    main()
