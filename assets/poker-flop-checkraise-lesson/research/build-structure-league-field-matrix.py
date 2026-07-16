#!/usr/bin/env python3
"""Build the CO/BTN structure × league c-bet/check-raise response matrix.

The compact source contains lossless preflop payloads, while parsed_hands.csv
contains the validated flop features and responses. parsed_hands is an ordered
subsequence of the compact source, so this script joins them in one streaming
pass with O(1) row memory (player sets are the only growing state).

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
LEAGUES = ("league1", "league2", "league3")
RANK_LABELS = {"league1": "R1-5", "league2": "R6-10", "league3": "R11-17"}
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
EXPECTED_Q2_CONTROLS = {
    "compact": 2_300_854,
    "matched": 2_297_953,
    "skipped": 2_901,
    "ranked": 2_256_311,
    "position_error": 21,
    "co_btn": 1_267_631,
}


def exact_key(row: Mapping[str, str]) -> tuple[str, str, str]:
    return row["user_id"], row["network"], row["hh_id"]


def league_for(rank_raw: str) -> str:
    rank = int(rank_raw)
    if not 1 <= rank <= 17:
        raise ValueError(f"rank outside 1..17: {rank}")
    if rank <= 5:
        return "league1"
    if rank <= 10:
        return "league2"
    return "league3"


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

        parsed = next(parsed_iterator, None)

    if parsed is not None:
        controls["parsed_remaining"] = 1 + sum(1 for _ in parsed_iterator)
    return aggregates, players, {"controls": controls, "positions": positions}


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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, required=True, help="flop-cbet-hu-2026-07-15 output directory")
    parser.add_argument("--output", type=Path, help="write CSV here instead of stdout")
    parser.add_argument("--verify-q2-controls", action="store_true", help="assert the published Q2 row counters")
    args = parser.parse_args()

    compact_path = args.base / "source" / "compact_hh_q2_2026.csv"
    parsed_path = args.base / "parsed_hands.csv"
    aggregates, players, diagnostics = build(compact_path, parsed_path)
    controls = diagnostics["controls"]

    if args.verify_q2_controls:
        actual = {key: controls[key] for key in EXPECTED_Q2_CONTROLS}
        if actual != EXPECTED_Q2_CONTROLS:
            raise SystemExit(f"Q2 controls drifted: {actual} != {EXPECTED_Q2_CONTROLS}")

    if args.output:
        with args.output.open("w", encoding="utf-8", newline="") as handle:
            write_csv(output_rows(aggregates, players), handle)
    else:
        write_csv(output_rows(aggregates, players), sys.stdout)

    print(f"controls={dict(controls)}", file=sys.stderr)
    print(f"actions_after_raise={dict(diagnostics['positions'])}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
