"""Compare public word output and traced root/suffix boundaries by seed."""
import argparse
from collections import Counter, defaultdict
from contextlib import nullcontext
import gzip
from itertools import zip_longest
import json

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("before")
parser.add_argument("after")
parser.add_argument("--evidence")
parser.add_argument("--first", type=int, default=5_000_000)
parser.add_argument("--count", type=int, default=100_000)
args = parser.parse_args()

SUFFIXES = ("es", "ist", "ism", "ian", "ial")
BOUNDARY_CONTROLS = {5_003_566, 5_004_272, 5_004_681, 5_007_319, 5_009_642,
                     5_014_397, 5_052_867, 5_089_587, 5_091_980, 5_097_680}
counts = defaultdict(Counter)
examples = defaultdict(list)
errors = []
controls = []
totals = Counter()


def read(path):
    reader = gzip.open if path.endswith(".gz") else open
    with reader(path, "rt", encoding="utf-8") as file:
        yield from map(json.loads, file)


def is_e_deletion(before, after):
    if len(before) != len(after) + 1:
        return False
    at = next((i for i, (x, y) in enumerate(zip(before, after)) if x != y), len(after))
    return before[at] == "e" and before[at + 1:] == after[at:]


def parts(row, key):
    return {part["role"]: part["text"] for part in row.get(key, [])}


packet = gzip.open(args.evidence, "wt", encoding="utf-8") if args.evidence else nullcontext()
with packet as output:
    for index, pair in enumerate(zip_longest(read(args.before), read(args.after))):
        before, after = pair
        seed = args.first + index
        if before is None or after is None or before["seed"] != seed or after["seed"] != seed:
            raise ValueError(f"Missing or misaligned pair at seed {seed}")
        totals["paired seeds"] += 1
        resolved = before.get("resolved", {})
        suffix = resolved.get("written", "")
        if suffix:
            counts[suffix]["observed"] += 1
        for key in ("base", "planned", "resolved", "allomorphIndex", "pronunciation"):
            if before.get(key) != after.get(key):
                totals[f"changed {key}"] += 1
                errors.append((seed, key))
        written_before, written_after = before["written"], after["written"]
        if written_before["hyphenated"] != written_after["hyphenated"]:
            totals["hyphenated spelling changes"] += 1
        if seed in BOUNDARY_CONTROLS:
            controls.append((seed, before.get("base"), suffix, written_before["clean"], written_after["clean"]))
        if output is not None and (seed in BOUNDARY_CONTROLS or written_before["clean"] != written_after["clean"]):
            output.write(json.dumps({"before": before, "after": after}, ensure_ascii=False) + "\n")
        if written_before["clean"] == written_after["clean"]:
            if written_before != written_after or before.get("assembled") != after.get("assembled"):
                errors.append((seed, "unexpected boundary or hyphenation change"))
            continue

        totals["changed spellings"] += 1
        spelling_before, spelling_after = written_before["clean"], written_after["clean"]
        if is_e_deletion(spelling_before, spelling_after):
            change = "e removed"
        elif is_e_deletion(spelling_after, spelling_before):
            change = "e added"
        else:
            change = "other"
        counts[suffix][change] += 1
        totals[change] += 1

        old_parts, new_parts = parts(before, "assembled"), parts(after, "assembled")
        old_root = old_parts.get("root", "")
        expected_parts = {**old_parts, "root": old_root[:-1]}
        if not (
            change == "e removed" and suffix in SUFFIXES
            and old_root == before["base"] and old_root.endswith("e")
            and before.get("lastUnit", {}).get("position") == "coda"
            and before.get("owner", {}).get("char") == "e"
            and before["owner"]["unitId"] == before["lastUnit"]["id"]
            and old_parts["suffix"] == suffix and new_parts == expected_parts
        ):
            errors.append((seed, f"unexpected {change} for -{suffix}"))
        if len(examples[suffix]) < 20:
            examples[suffix].append((seed, spelling_before, spelling_after, before["pronunciation"]))

print(f"Seeds {args.first}–{args.first + args.count - 1}")
for key in ("paired seeds", "changed spellings", "e removed", "e added", "other",
            "changed pronunciation", "changed base", "changed planned", "changed resolved",
            "changed allomorphIndex", "hyphenated spelling changes"):
    print(f"{key}: {totals[key]}")
print("\n| Realized suffix | Observed | e removed | e added | Other |")
print("| --- | ---: | ---: | ---: | ---: |")
for suffix, row in sorted(counts.items()):
    print(f"| `-{suffix}` | {row['observed']:,} | {row['e removed']} | {row['e added']} | {row['other']} |")

print("\n| Seed | Suffix | Before | After | IPA |")
print("| ---: | --- | --- | --- | --- |")
for suffix in SUFFIXES:
    limit = 20 - sum(min(len(examples[s]), 3) for s in SUFFIXES if s != "es") if suffix == "es" else 3
    for seed, before, after, ipa in examples[suffix][:limit]:
        print(f"| {seed} | `-{suffix}` | `{before}` | `{after}` | /{ipa}/ |")

print("\nOpen-root controls")
for row in controls:
    print(*row, sep="\t")
if totals["paired seeds"] != args.count or not totals["changed spellings"] or errors:
    raise SystemExit(f"Unexpected results: {len(errors)} mismatches. First 20: {errors[:20]}")
