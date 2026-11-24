"""Freeze and score complementary spelling-only first-reading packets for #517."""

import argparse
import json
import random
import re
from collections import Counter, defaultdict
from pathlib import Path


CONTROLS = {
    "habit": "AE", "lemon": "EH", "visit": "IH", "study": "AH",
    "happy": "AE", "letter": "EH", "ribbon": "IH", "summer": "AH",
}
VOWELS = set("AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW".split())
DIRECTIONS = (
    "For each spelling in the given order, give your first natural General "
    "American pronunciation as if reading the item on its own. Some spellings "
    "may be invented. Report the first pronounced vowel "
    "using an ARPABET vowel code, followed by confidence (high, medium, low). "
    "You may add the full pronunciation. Use unknown if you cannot choose a "
    "first pronunciation. Do not consult a dictionary or revisit answers. "
    "Return a JSON array of objects with id, vowel, and confidence."
)


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value):
    with path.open("x", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def is_single_doubling(before, after):
    return len(after) == len(before) + 1 and any(
        base in "bdfglmnpst"
        and before[max(0, index - 1):index] != base
        and before[index + 1:index + 2] != base
        and after == before[:index] + base + before[index:]
        for index, base in enumerate(before)
    )


def freeze(args):
    rows = read(args.pairs)
    seen = set(CONTROLS)
    arms = ([], [])
    strata = defaultdict(list)
    for record in rows:
        before, after, expected = (record[k] for k in ("before", "after", "expected"))
        stratum = record.get("stratum", "all")
        if expected not in {"AE", "EH", "IH", "AH"}:
            raise ValueError(f"Unexpected target {expected!r}")
        if before in seen or after in seen or not is_single_doubling(before, after):
            raise ValueError(f"Expected a unique single-doubling comparison: {record}")
        seen.update((before, after))
        strata[stratum].append(record)
    rng = random.Random(args.seed)
    candidate_starts_at = 0
    for stratum in sorted(strata):
        records = strata[stratum]
        rng.shuffle(records)
        for position, record in enumerate(records):
            candidate_arm = (position + candidate_starts_at) % 2
            for arm, assigned in enumerate(arms):
                condition = "candidate" if candidate_arm == arm else "baseline"
                key = "after" if candidate_arm == arm else "before"
                assigned.append({
                    "spelling": record[key], "condition": condition, "expected": record["expected"],
                    "pair": record["before"], "stratum": stratum,
                })
        candidate_starts_at = (candidate_starts_at + len(records)) % 2

    args.out.mkdir(parents=True)
    owner = {}
    for arm, assigned in enumerate(arms):
        assigned.extend({
            "spelling": word, "condition": "control", "expected": vowel,
            "pair": word, "stratum": "control",
        } for word, vowel in CONTROLS.items())
        rng.shuffle(assigned)
        packet = []
        arm_name = chr(ord("A") + arm)
        owner[arm_name] = {}
        for item in assigned:
            item_id = f"{rng.getrandbits(40):010x}"
            if item_id in owner[arm_name]:
                raise ValueError("Generated duplicate ID")
            owner[arm_name][item_id] = item
            packet.append({"id": item_id, "spelling": item["spelling"]})
        write(args.out / f"packet-{arm_name}.json", {"directions": DIRECTIONS, "items": packet})
    write(args.out / "owner-key.json", owner)


def score(args):
    owner = read(args.owner)
    totals = defaultdict(Counter)
    pairs = defaultdict(dict)
    for arm, path in (("A", args.ratings_a), ("B", args.ratings_b)):
        answers = {}
        for row in read(path):
            item_id = row["id"]
            if item_id in answers or item_id not in owner[arm]:
                raise ValueError(f"Duplicate or unknown packet ID {item_id}")
            answers[item_id] = row
        for item_id, item in owner[arm].items():
            count = totals[(arm, item["condition"])]
            count["assigned"] += 1
            row = answers.get(item_id)
            vowel = re.sub(r"[012]$", "", row["vowel"].strip().upper()) if row else ""
            outcome = {"status": "unknown", "match": None}
            if vowel in VOWELS:
                outcome = {"status": "answered", "match": vowel == item["expected"]}
                count["answered"] += 1
                count["matched"] += outcome["match"]
                count["low_confidence"] += row.get("confidence", "").lower() == "low"
            else:
                count["unknown_or_missing"] += 1
            if item["condition"] != "control":
                pairs[item["pair"]][item["condition"]] = outcome
    matched = Counter()
    for conditions in pairs.values():
        baseline = conditions["baseline"]["match"]
        candidate = conditions["candidate"]["match"]
        if candidate is None or baseline is None:
            matched["at_least_one_unknown"] += 1
        elif baseline == candidate:
            matched["both_correct" if baseline else "neither_correct"] += 1
        else:
            matched["candidate_only_correct" if candidate else "baseline_only_correct"] += 1
    print(json.dumps({
        "by_arm": {f"{arm} {condition}": counts for (arm, condition), counts in sorted(totals.items())},
        "paired_outcomes": matched,
    }, indent=2))


parser = argparse.ArgumentParser(description=__doc__)
commands = parser.add_subparsers(dest="command", required=True)
freezer = commands.add_parser("freeze")
freezer.add_argument("pairs", type=Path)
freezer.add_argument("out", type=Path)
freezer.add_argument("--seed", type=int, default=517)
scorer = commands.add_parser("score")
scorer.add_argument("owner", type=Path)
scorer.add_argument("ratings_a", type=Path)
scorer.add_argument("ratings_b", type=Path)
arguments = parser.parse_args()
(freeze if arguments.command == "freeze" else score)(arguments)
