#!/usr/bin/env python3
"""Build an offline CO/BTN structure × cohort response diagnostic.

The compact source contains lossless preflop payloads, while parsed_hands.csv
contains the validated flop features and responses. parsed_hands is an ordered
subsequence of the compact source, so this script joins them in one streaming
pass with O(1) row memory (player sets are the only growing state).

This legacy residue-export helper is not a release source. In particular, it
does not certify current raw-HH coverage, latest-first deduplication or the
exact rank-at-hand contract required by the browser field cube.

League always belongs to the tracked preflop aggressor. CO/BTN is recovered
from the number of voluntary actions left after the single unopened raise:
two actions (SB fold, BB call) means BTN; three means CO.
"""

from __future__ import annotations

import argparse
import base64
import collections
import csv
import re
import statistics
import sys
from pathlib import Path
from typing import Iterable, Mapping, TextIO


STRUCTURES = (
    "a_high_dry",
    "k_high_dry",
    "broadway",
    "low_connected",
    "paired",
    "two_tone",
    "monotone",
    "other",
)
LEAGUES = ("league1", "league2", "league3", "novice")
RANK_LABELS = {
    "league1": "R1-5",
    "league2": "R6-10",
    "league3": "R11-14",
    "novice": "R15-18",
}
PREFLOP_DELIMITER = "__FF_PREFLOP_ACTIONS__"
GENERIC_VERB = re.compile(r"(?i)\b(folds?|calls?|raises?|bets?)\b")
IPOKER_ACTION = re.compile(r"(?i)<action\b[^>]*\btype=[\"'](\d+)[\"']")
FIELDNAMES = (
    "structure",
    "league",
    "ranks",
    "positions",
    "cbet_made",
    "cbet_opportunities",
    "overall_folds",
    "overall_faced_xr",
    "matched_folds",
    "matched_faced_xr",
    "opportunity_players",
    "overall_faced_players",
    "matched_faced_players",
)
SIZE_MATCHED_FIELDNAMES = (
    "period",
    "sample",
    "cohort",
    "rank_min",
    "rank_max",
    "board_class",
    "cbet_pct_min_inclusive",
    "cbet_pct_max_inclusive",
    "xr_pct_starting_pot_min_inclusive",
    "xr_pct_starting_pot_max_inclusive",
    "folds",
    "faced_xr",
    "players",
    "fold_rate",
    "median_cbet_pct_pot",
    "median_xr_multiple_cbet",
    "median_xr_pct_starting_pot",
)
def exact_key(row: Mapping[str, str]) -> tuple[str, str, str]:
    return row["user_id"], row["network"], row["hh_id"]


def league_for(rank_raw: str) -> str:
    rank = int(rank_raw)
    if not 1 <= rank <= 18:
        raise ValueError(f"rank outside 1..18: {rank}")
    if rank <= 5:
        return "league1"
    if rank <= 10:
        return "league2"
    if rank <= 14:
        return "league3"
    return "novice"


def actions_after_raise(payload_base64: str) -> int | None:
    payload = base64.b64decode(payload_base64, validate=True).decode("utf-8")
    parts = payload.split(PREFLOP_DELIMITER)
    if len(parts) != 2:
        return None
    action_payload = parts[1]
    actions: list[str] = []

    if "<round" in action_payload.lower():
        for action_type in IPOKER_ACTION.findall(action_payload):
            if action_type == "0":
                actions.append("fold")
            elif action_type == "3":
                actions.append("call")
            elif action_type in {"23", "5"}:
                actions.append("raise")
    else:
        for raw_line in action_payload.replace("\r", "").split("\n"):
            line = raw_line.strip().strip('"')
            if not line or line.lower().startswith(("uncalled bet", "total pot")):
                continue
            matches = list(GENERIC_VERB.finditer(line))
            if not matches:
                continue
            verb = matches[-1].group(1).lower()
            if verb.startswith("fold"):
                actions.append("fold")
            elif verb.startswith("call"):
                actions.append("call")
            else:
                actions.append("raise")

    raise_indexes = [index for index, action in enumerate(actions) if action == "raise"]
    if len(raise_indexes) != 1:
        return None
    return len(actions) - raise_indexes[0] - 1


def read_rows(path: Path) -> Iterable[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def build(compact_path: Path, parsed_path: Path) -> tuple[dict, dict, dict]:
    aggregates: dict[tuple[str, str], collections.Counter] = collections.defaultdict(collections.Counter)
    players: dict[tuple[str, str, str], set[str]] = collections.defaultdict(set)
    controls: collections.Counter = collections.Counter()
    positions: collections.Counter = collections.Counter()
    matched_k_high_sizes: dict[str, dict[str, list[float]]] = {
        league: {
            "cbet_pct_pot": [],
            "checkraise_to_multiple_cbet": [],
            "checkraise_to_pct_starting_pot": [],
        }
        for league in LEAGUES
    }

    parsed_iterator = iter(read_rows(parsed_path))
    parsed = next(parsed_iterator, None)
    for compact in read_rows(compact_path):
        controls["compact"] += 1
        if parsed is None:
            controls["compact_after_end"] += 1
            continue
        if exact_key(compact) != exact_key(parsed):
            controls["skipped"] += 1
            continue

        controls["matched"] += 1
        after_raise = actions_after_raise(compact["preflop_payload_base64"])
        if parsed["analysis_included"] == "1":
            controls["ranked"] += 1
            if after_raise is None:
                controls["position_error"] += 1
            else:
                positions[after_raise] += 1

            if after_raise in {2, 3}:
                controls["co_btn"] += 1
                league = league_for(parsed["rank"])
                structure = parsed["lesson_structure"]
                if structure not in STRUCTURES:
                    raise ValueError(f"unknown lesson_structure: {structure}")
                actor = parsed["user_id"]
                aggregate = aggregates[structure, league]
                aggregate["opportunities"] += 1
                players[structure, league, "opportunity"].add(actor)

                if parsed["hero_flop_action"] == "bet":
                    aggregate["cbets"] += 1

                if parsed["checkraise_against_us"] == "1":
                    response = parsed["hero_vs_checkraise_response"]
                    if response:
                        aggregate["overall_faced"] += 1
                        players[structure, league, "overall_faced"].add(actor)
                        if response == "fold":
                            aggregate["overall_folds"] += 1

                        if (
                            parsed["checkraise_size_reliable"] == "1"
                            and parsed["cbet_pct_pot"]
                            and parsed["checkraise_to_pct_starting_pot"]
                            and 30 <= float(parsed["cbet_pct_pot"]) <= 36
                            and 95 <= float(parsed["checkraise_to_pct_starting_pot"]) <= 105
                        ):
                            aggregate["matched_faced"] += 1
                            players[structure, league, "matched_faced"].add(actor)
                            if response == "fold":
                                aggregate["matched_folds"] += 1
                            if structure == "k_high_dry":
                                matched_k_high_sizes[league]["cbet_pct_pot"].append(
                                    float(parsed["cbet_pct_pot"])
                                )
                                if parsed["checkraise_to_multiple_cbet"]:
                                    matched_k_high_sizes[league][
                                        "checkraise_to_multiple_cbet"
                                    ].append(float(parsed["checkraise_to_multiple_cbet"]))
                                matched_k_high_sizes[league][
                                    "checkraise_to_pct_starting_pot"
                                ].append(float(parsed["checkraise_to_pct_starting_pot"]))

        parsed = next(parsed_iterator, None)

    if parsed is not None:
        controls["parsed_remaining"] = 1 + sum(1 for _ in parsed_iterator)
    return aggregates, players, {
        "controls": controls,
        "positions": positions,
        "matched_k_high_sizes": matched_k_high_sizes,
    }


def output_rows(aggregates: dict, players: dict) -> Iterable[dict[str, object]]:
    for structure in STRUCTURES:
        for league in LEAGUES:
            aggregate = aggregates[structure, league]
            yield {
                "structure": structure,
                "league": league,
                "ranks": RANK_LABELS[league],
                "positions": "CO/BTN",
                "cbet_made": aggregate["cbets"],
                "cbet_opportunities": aggregate["opportunities"],
                "overall_folds": aggregate["overall_folds"],
                "overall_faced_xr": aggregate["overall_faced"],
                "matched_folds": aggregate["matched_folds"],
                "matched_faced_xr": aggregate["matched_faced"],
                "opportunity_players": len(players[structure, league, "opportunity"]),
                "overall_faced_players": len(players[structure, league, "overall_faced"]),
                "matched_faced_players": len(players[structure, league, "matched_faced"]),
            }


def write_csv(rows: Iterable[dict[str, object]], handle: TextIO) -> None:
    writer = csv.DictWriter(handle, fieldnames=FIELDNAMES, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)


def size_matched_k_high_rows(
    aggregates: dict,
    players: dict,
    diagnostics: dict,
    *,
    sample_id: str,
) -> Iterable[dict[str, object]]:
    rank_bounds = {
        "league1": (1, 5),
        "league2": (6, 10),
        "league3": (11, 14),
        "novice": (15, 18),
    }
    size_values = diagnostics["matched_k_high_sizes"]
    for league in LEAGUES:
        aggregate = aggregates["k_high_dry", league]
        folds = aggregate["matched_folds"]
        faced = aggregate["matched_faced"]
        rank_min, rank_max = rank_bounds[league]
        yield {
            "period": "2026-Q2",
            "sample": sample_id,
            "cohort": league,
            "rank_min": rank_min,
            "rank_max": rank_max,
            "board_class": "k_high_dry",
            "cbet_pct_min_inclusive": 30,
            "cbet_pct_max_inclusive": 36,
            "xr_pct_starting_pot_min_inclusive": 95,
            "xr_pct_starting_pot_max_inclusive": 105,
            "folds": folds,
            "faced_xr": faced,
            "players": len(players["k_high_dry", league, "matched_faced"]),
            "fold_rate": f"{folds / faced:.4f}" if faced else "",
            "median_cbet_pct_pot": f"{statistics.median(size_values[league]['cbet_pct_pot']):.2f}" if size_values[league]["cbet_pct_pot"] else "",
            "median_xr_multiple_cbet": f"{statistics.median(size_values[league]['checkraise_to_multiple_cbet']):.2f}" if size_values[league]["checkraise_to_multiple_cbet"] else "",
            "median_xr_pct_starting_pot": f"{statistics.median(size_values[league]['checkraise_to_pct_starting_pot']):.2f}" if size_values[league]["checkraise_to_pct_starting_pot"] else "",
        }


def write_size_matched_csv(rows: Iterable[dict[str, object]], handle: TextIO) -> None:
    writer = csv.DictWriter(
        handle, fieldnames=SIZE_MATCHED_FIELDNAMES, lineterminator="\n"
    )
    writer.writeheader()
    writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base",
        type=Path,
        required=True,
        help="local legacy residue-export directory (diagnostic only)",
    )
    parser.add_argument("--output", type=Path, help="write CSV here instead of stdout")
    parser.add_argument(
        "--size-matched-output",
        type=Path,
        help="write the K-high matched-size teaching-card CSV from the same pass",
    )
    parser.add_argument(
        "--sample-id",
        default="all_candidate_residues_hh_co_btn",
        help="sample id recorded in --size-matched-output",
    )
    args = parser.parse_args()

    compact_path = args.base / "source" / "compact_hh_q2_2026.csv"
    parsed_path = args.base / "parsed_hands.csv"
    aggregates, players, diagnostics = build(compact_path, parsed_path)
    controls = diagnostics["controls"]

    if args.output:
        with args.output.open("w", encoding="utf-8", newline="") as handle:
            write_csv(output_rows(aggregates, players), handle)
    else:
        write_csv(output_rows(aggregates, players), sys.stdout)

    if args.size_matched_output:
        with args.size_matched_output.open("w", encoding="utf-8", newline="") as handle:
            write_size_matched_csv(
                size_matched_k_high_rows(
                    aggregates,
                    players,
                    diagnostics,
                    sample_id=args.sample_id,
                ),
                handle,
            )

    print(f"controls={dict(controls)}", file=sys.stderr)
    print(f"actions_after_raise={dict(diagnostics['positions'])}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
