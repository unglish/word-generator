import itertools
import json
import sys
from collections import Counter, defaultdict

DOUBLING_SUFFIXES = {"ing", "ed", "er", "est", "able"}
VOWELS = set("aeiou")
counts = defaultdict(Counter)
examples = defaultdict(list)
doubling_seeds = defaultdict(set)
changed = Counter()


def classify(row, phase, other):
    planned, suffix, base = (row[key] for key in ("planned", "resolved", "base"))
    if not suffix:
        return
    root = next(part["text"] for part in row["assembledParts"] if part["role"] == "root")
    if planned == "s":
        counts["planned -s"][phase] += 1
        if suffix == "es":
            kind = "syllabic" if len(row["suffixPhones"]) > 1 else "spelling-only"
            counts[f"{kind} -es"][phase] += 1
    if planned in DOUBLING_SUFFIXES and base and root == base + base[-1]:
        doubling_seeds[phase].add(row["seed"])
    if not base.endswith("e"):
        return
    closed = row["lastGrapheme"]["position"] == "coda"
    key = None
    if closed and suffix[0] in VOWELS:
        key = f"retained silent e before -{suffix}"
        hit = root.endswith("e")
    elif closed and suffix == planned == "s":
        key = "plain -s with silent e intact"
        hit = root.endswith("e")
    elif not closed and base.endswith("ee") and suffix.startswith("e"):
        key = "ee shared before initial e"
        hit = root == base[:-1]
    elif not closed and base.endswith("ee") and suffix[0] in VOWELS:
        key = "ee shortened before initial non-e vowel"
        hit = root == base[:-1]
    elif not closed and suffix[0] in VOWELS:
        key = "e lost from another open vowel spelling"
        hit = root == base[:-1]
    if key is None:
        return
    counts[key][f"{phase} eligible"] += 1
    counts[key][phase] += hit
    if phase == "before" and row["written"] != other["written"] and len(examples[key]) < 4:
        examples[key].append((row["seed"], base, row["written"], other["written"], row["pronunciation"]))


with open(sys.argv[1]) as before, open(sys.argv[2]) as after:
    for pair in itertools.zip_longest(before, after):
        left, right = map(json.loads, pair)
        assert left["seed"] == right["seed"]
        classify(left, "before", right)
        classify(right, "after", left)
        if left["written"] != right["written"]:
            changed["spelling"] += 1
            if not left["base"].endswith("e"):
                changed["spelling outside final-e roots"] += 1
        if left["pronunciation"] != right["pronunciation"]:
            changed["pronunciation"] += 1

for item, count in sorted(counts.items()):
    print(item, dict(count))
    for example in examples[item]:
        print(" ", *example, sep="\t")
print("Consonant doubling", {phase: len(ids) for phase, ids in doubling_seeds.items()})
print("Doubling seed set unchanged", doubling_seeds["before"] == doubling_seeds["after"])
print("Changes", dict(changed))
