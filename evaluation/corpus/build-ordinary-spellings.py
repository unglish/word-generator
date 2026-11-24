"""Rebuild the common spelling reference from the project's two pinned inputs."""
import argparse
from collections import Counter
import json
from pathlib import Path
import runpy

root = Path(__file__).resolve().parents[2]
source = runpy.run_path(str(root / "evaluation/corpus/verify-root.py"))
args = argparse.ArgumentParser(description=__doc__)
args.add_argument("--source", required=True, type=Path)
args.add_argument("--scowl", required=True, type=Path)
args.add_argument("--out", type=Path, default=root / "data/cmu/ordinary")
options = args.parse_args()

cmu = source["pinned"](options.source, source["CMU"])
ordinary, _ = source["unpack_scowl"](source["pinned"](options.scowl, source["SCOWL"]))
entries = source["joint"].parser.count_source(cmu.decode())[0]
words = sorted(entry["spelling"] for entry in entries if entry["spelling"] in ordinary)
if len(words) != 45904:
    raise ValueError("Unexpected pinned CMU/SCOWL intersection size")
options.out.mkdir(parents=True, exist_ok=True)
(options.out / "spellings.txt").write_bytes(("\n".join(words) + "\n").encode("ascii"))
for order, name in enumerate(("letters", "bigrams", "trigrams"), start=1):
    counts = Counter(word[i:i + order] for word in words for i in range(len(word) - order + 1))
    (options.out / f"{name}.json").write_text(json.dumps(counts, sort_keys=True, indent=2) + "\n")
