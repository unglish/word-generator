"""Independently parse the historical ARPABET table without executing TypeScript.

Prints the table's bins, row totals and vocabulary as JSON so the review suite can
compare them with the TypeScript exports. The full score-reference acceptance
verifier is archived at tag archive/evidence-pre-cleanup.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
SCORER_PATH = "src/phonotactic/score.ts"
TABLE_PATH = "src/phonotactic/arpabet-bigrams.ts"
SCORER_SHA = "c4d5ff5bd77a4a77e63a7ab3ef610f2bb31c1981e4c4666c803e210672ac551f"
TABLE_SHA = "741eee7a1d331432a50c136a4801251bc8c7e3a8a3567265011fd865f203b1a7"
# The frozen independent parser/joint proof supplies phone labels and strict JSON, not score math.
PINS = {
    "evaluation/corpus/verify-parser.py": "a59cfa124b1462f4147416236fe6b2ad267a788cb9e5a0c72acf0e9b2ec08c50",
    "evaluation/corpus/verify-joint.py": "a4a80097c1e57076eef30136ca5008a80a9a9803dc108ab1121c1bbaeff5699b",
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def regular_bytes(path):
    path = Path(path).absolute()
    for item in [path, *path.parents]:
        if item.is_symlink():
            raise ValueError(f"Symlink input: {item}")
    if not path.is_file():
        raise ValueError(f"Not a regular file: {path}")
    return path.read_bytes()


def load_joint(root):
    for path, expected in PINS.items():
        if sha(regular_bytes(root / path)) != expected:
            raise ValueError(f"Frozen dependency changed: {path}")
    spec = importlib.util.spec_from_file_location("score_joint", root / "evaluation/corpus/verify-joint.py")
    joint = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(joint)
    return joint


def parse_model(text, joint):
    """Recognize only the three static data declarations. Never eval or execute TypeScript."""
    clean = re.sub(r"/\*[\s\S]*?\*/|//[^\n]*", "", text)
    match = re.fullmatch(
        r"\s*export\s+const\s+ARPABET_BIGRAM_COUNTS\s*:\s*Record<string,\s*Record<string,\s*number>>\s*=\s*(\{.*?\})\s*;"
        r"\s*export\s+const\s+ARPABET_TOTAL_COUNTS\s*:\s*Record<string,\s*number>\s*=\s*(\{.*?\})\s*;"
        r"\s*export\s+const\s+ALL_ARPABET_PHONEMES\s*=\s*new\s+Set\(\s*(\[.*?\])\s*\)\s*;\s*", clean, re.S)
    if not match:
        raise ValueError("Expected only three restricted historical table declarations")
    counts, totals, vocabulary = [joint.strict_json(re.sub(r",\s*([}\]])", r"\1", value)) for value in match.groups()]
    expected_labels = joint.parser.CONSONANTS | joint.parser.VOWELS | {"#"}
    if not isinstance(counts, dict) or not isinstance(totals, dict) or not isinstance(vocabulary, list):
        raise ValueError("Invalid table container types")
    if any(not isinstance(token, str) or not re.fullmatch(r"#|[A-Z]+", token) for token in vocabulary):
        raise ValueError("Invalid vocabulary labels")
    if len(vocabulary) != len(set(vocabulary)) or set(vocabulary) != expected_labels or set(counts) != set(vocabulary) or set(totals) != set(vocabulary):
        raise ValueError("Historical vocabulary/rows differ")
    for first, row in counts.items():
        if not isinstance(row, dict) or not row or not set(row) <= set(vocabulary):
            raise ValueError("Invalid historical pair row or label")
        if any(type(n) is not int or n <= 0 or n > 2**53 - 1 for n in row.values()):
            raise ValueError("Pair occurrences must be positive safe integers")
        if type(totals[first]) is not int or totals[first] != sum(row.values()):
            raise ValueError("Historical row total differs from every-bin sum")
    return {"counts": counts, "totals": totals, "vocabulary": vocabulary}


def audit_model(root, joint):
    table = regular_bytes(root / TABLE_PATH)
    joint.same(sha(table), TABLE_SHA, "pinned historical table bytes")
    joint.same(sha(regular_bytes(root / SCORER_PATH)), SCORER_SHA, "pinned historical scorer bytes")
    return parse_model(table.decode("utf-8"), joint)


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--root", type=Path, required=True)
    root = cli.parse_args().root.resolve()
    print(json.dumps(audit_model(root, load_joint(root))))
