"""Independently verify every source-entry score under the pinned historical model."""
import argparse
import copy
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
PROTOCOL_PATH = "evaluation/experiments/cmu-score-reference/protocol.json"
PROTOCOL_SHA = "be46836df65c94d2e61f4e713de004e8581db75c81abdd4ebcf8aa74a43b1f78"
SCORER_PATH = "src/phonotactic/score.ts"
TABLE_PATH = "src/phonotactic/arpabet-bigrams.ts"
SCORER_SHA = "c4d5ff5bd77a4a77e63a7ab3ef610f2bb31c1981e4c4666c803e210672ac551f"
TABLE_SHA = "741eee7a1d331432a50c136a4801251bc8c7e3a8a3567265011fd865f203b1a7"
ABS_TOLERANCE = 1e-10
REL_TOLERANCE = 1e-12
ALLOWED_PARENT_EDITS = {"scripts/generate-baseline.ts", "docs/phonotactic-scoring.md", "TUNING.md"}
MODEL = {
    "id": "legacy-arpabet-add-one-log2-v1", "sourceSha256": SCORER_SHA, "tableSha256": TABLE_SHA,
    "alpha": 1, "logBase": 2, "vocabularySize": 40,
    "boundaries": "one-#-start-and-one-#-end-per-entry",
    "normalization": "total-log2-score/(phoneCount+1)",
    "aggregate": "equal-entry-weight; sorted-sequential-binary64-sum; upper-middle-median",
    "supplementalMax": "maximum-of-all-finite-row-values; not-a-legacy-ScoreStats-field",
}
UNITS = {"total": "log2-conditional-probability-sum", "perTransition": "mean-log2-per-within-word-transition",
         "aggregate": "equal-selected-entry-weights"}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def dependencies(root):
    path = root / "evaluation/corpus/verify-transitions.py"
    # This frozen dependency supplies I/O checks and the pinned independent parser/joint proof, not score math.
    if any(part.is_symlink() for part in [path, *path.parents]):
        raise ValueError("Aliased frozen dependency")
    if sha(path.read_bytes()) != "a241fab741c8539df496b0235342957b818088a86cfb6cf3ace3e11cb21294eb":
        raise ValueError("Frozen transition verifier changed")
    spec = importlib.util.spec_from_file_location("score_transition_io", path)
    io = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(io)
    if sha(io.regular_bytes(path)) != "a241fab741c8539df496b0235342957b818088a86cfb6cf3ace3e11cb21294eb":
        raise ValueError("Unstable or aliased transition verifier")
    if sha(io.regular_bytes(root / PROTOCOL_PATH)) != PROTOCOL_SHA:
        raise ValueError("Frozen score protocol changed")
    return io, io.load_joint(root)


def source_paths(joint, io):
    return [*io.source_paths(joint), "evaluation/corpus/score-reference.ts", "evaluation/corpus/score-reference-builder.ts",
            "scripts/generate-baseline.ts", SCORER_PATH, TABLE_PATH]


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


def audit_model(root, io, joint):
    table = io.regular_bytes(root / TABLE_PATH)
    joint.same(sha(table), TABLE_SHA, "pinned historical table bytes")
    joint.same(sha(io.regular_bytes(root / SCORER_PATH)), SCORER_SHA, "pinned historical scorer bytes")
    return parse_model(table.decode("utf-8"), joint)


def stats(values):
    if not values or not all(math.isfinite(value) for value in values):
        raise ValueError("All rows must contribute a finite value")
    ordered = sorted(values)
    total = 0.0
    for value in ordered:  # Python sum may use a different accumulation algorithm; retain sequential binary64.
        total += value
    return {"mean": total / len(ordered), "min": ordered[0], "median": ordered[len(ordered) // 2], "max": ordered[-1]}


def independent_scores(entries, model, joint):
    if not entries:
        raise ValueError("Empty selected population")
    rows, seen, previous_line = [], set(), 0
    for ordinal, entry in enumerate(entries):
        if entry["line"] <= previous_line or entry["spelling"] in seen:
            raise ValueError("Invalid selected order/identity")
        previous_line = entry["line"]; seen.add(entry["spelling"])
        native = entry["tokens"]
        if not native or any(token not in joint.parser.CONSONANTS and not (
            re.fullmatch(r"[A-Z]+[012]", token) and token[:-1] in joint.parser.VOWELS) for token in native):
            raise ValueError("Invalid complete source pronunciation")
        if not any(token[-1:] in ("0", "1", "2") for token in native):
            raise ValueError("Selected entry has no source vowel")
        phones = [token[:-1] if token[-1:] in ("0", "1", "2") else token for token in native]
        sequence = ["#", *phones, "#"]
        total = 0.0
        for first, second in zip(sequence, sequence[1:]):
            count = model["counts"].get(first, {}).get(second, 0)
            probability = (count + 1) / (model["totals"].get(first, 0) + len(model["vocabulary"]))
            total += math.log2(probability)
        n = len(phones)
        rows.append({"ordinal": ordinal, "line": entry["line"], "spelling": entry["spelling"], "arpabet": " ".join(phones),
                     "phoneCount": n, "transitionCount": n + 1, "total": total, "perTransition": total / (n + 1)})
    return {"entryDigest": sha(joint.encoded(entries)), "accounting": {"selected": len(entries), "scored": len(rows), "invalid": 0, "dropped": 0},
            "phoneEvents": sum(row["phoneCount"] for row in rows), "transitionEvents": sum(row["transitionCount"] for row in rows),
            "rows": rows, "summary": {"total": stats([row["total"] for row in rows]), "perTransition": stats([row["perTransition"] for row in rows])}}


def expected_artifact(parent, implementation, scores, joint, io):
    reference = parent["reference"]
    lock = next(source["content"] for source in implementation if source["path"] == "package-lock.json")
    return copy.deepcopy({
        "version": "cmu-legacy-score-reference-artifact-v1", "source": reference["source"], "parser": reference["parser"],
        "population": reference["population"], "policy": "cmu-ascii-first-v1", "projection": joint.PROJECTIONS["base"],
        "scorer": MODEL, "units": UNITS, "scores": scores,
        "parentReference": {"version": "cmu-joint-reference-artifact-v1", "artifactDigest": io.PARENT_DIGEST,
                            "referenceDigest": joint.digest(reference), "compressedFileSha256": io.PARENT_SHA},
        "license": parent["license"], "implementation": {"digest": joint.digest(implementation), "sources": implementation,
                                                         "packageLockSha256": sha(lock.encode())},
    })


def validate(candidate, expected, joint):
    joint.same(set(candidate), {"artifact", "digest"}, "envelope fields")
    errors = {"comparedScoreValues": 0, "maximumAbsoluteError": 0.0, "maximumRelativeError": None,
              "maximumAbsoluteErrorWitness": None, "maximumRelativeErrorWitness": None}

    def compare(actual, wanted, path=()):
        score_value = (len(path) == 4 and path[:2] == ("scores", "rows") and type(path[2]) is int and path[3] in ("total", "perTransition"))
        summary_value = (len(path) == 4 and path[:2] == ("scores", "summary") and path[2] in ("total", "perTransition") and path[3] in ("mean", "min", "median", "max"))
        if score_value or summary_value:
            if isinstance(actual, bool) or not isinstance(actual, (int, float)) or not math.isfinite(actual) or not math.isfinite(wanted):
                raise ValueError(f"Nonfinite/wrong score type at {path}")
            error = abs(actual - wanted)
            if error > ABS_TOLERANCE + REL_TOLERANCE * abs(wanted):
                raise ValueError(f"Score differs beyond preregistered tolerance at {path}")
            errors["comparedScoreValues"] += 1
            relative = error / abs(wanted) if wanted else None
            witness = {"path": list(path), "actual": actual, "reference": wanted,
                       "absoluteError": error, "relativeError": relative}
            # First coordinate wins an exact tie. A zero reference has no relative error.
            if errors["maximumAbsoluteErrorWitness"] is None or error > errors["maximumAbsoluteError"]:
                errors["maximumAbsoluteError"] = error
                errors["maximumAbsoluteErrorWitness"] = witness
            previous = errors["maximumRelativeError"]
            if errors["maximumRelativeErrorWitness"] is None or (relative is not None and (previous is None or relative > previous)):
                errors["maximumRelativeError"] = relative
                errors["maximumRelativeErrorWitness"] = witness
        elif isinstance(wanted, dict):
            if not isinstance(actual, dict) or set(actual) != set(wanted):
                raise ValueError(f"Fields differ at {path}")
            for key in wanted:
                compare(actual[key], wanted[key], (*path, key))
        elif isinstance(wanted, list):
            if not isinstance(actual, list) or len(actual) != len(wanted):
                raise ValueError(f"Ordered list length/type differs at {path}")
            for i, (left, right) in enumerate(zip(actual, wanted)):
                compare(left, right, (*path, i))
        else:
            joint.same(actual, wanted, str(path))
    compare(candidate["artifact"], expected)
    joint.same(candidate["digest"], joint.digest(candidate["artifact"]), "candidate digest")
    return errors


def verify(root, source, artifact):
    root, source, artifact = Path(root).resolve(), Path(source).absolute(), Path(artifact).absolute()
    io, joint = dependencies(root)
    protocol = joint.strict_json(io.regular_bytes(root / PROTOCOL_PATH))
    directory = root / "evaluation/experiments/cmu-score-reference"
    for name, key in [("design.md", "designSha256"), ("parent-files.json", "parentFilesSha256"), ("fixtures-plan.json", "fixturesPlanSha256")]:
        joint.same(sha(io.regular_bytes(directory / name)), protocol[key], "frozen " + name)
    joint.same(protocol["independentNumericComparison"]["absoluteTolerance"], ABS_TOLERANCE, "frozen absolute tolerance")
    joint.same(protocol["independentNumericComparison"]["relativeTolerance"], REL_TOLERANCE, "frozen relative tolerance")
    parent_files = joint.strict_json(io.regular_bytes(directory / "parent-files.json"))
    protected = {path: identity for path, identity in parent_files.items() if path not in ALLOWED_PARENT_EDITS}
    for path, identity in protected.items():
        joint.same(sha(io.regular_bytes(root / path)), identity, "unchanged parent " + path)
    paths = list(dict.fromkeys([*source_paths(joint, io), *io.PINS, "evaluation/corpus/verify-transitions.py",
                               "evaluation/corpus/verify-score-reference.py", "evaluation/corpus/verify-score-reference-test.py",
                               PROTOCOL_PATH, io.PARENT_PATH, *[str((directory / name).relative_to(root)) for name in ["parent-files.json", "design.md", "fixtures-plan.json"]]]))
    pinned = {path: io.regular_bytes(root / path) for path in paths}
    raw, candidate_bytes = io.regular_bytes(source), io.regular_bytes(artifact)
    joint.same(sha(raw), joint.parser.SOURCE_SHA, "raw source")
    joint.same(sha(pinned[io.PARENT_PATH]), io.PARENT_SHA, "published joint bytes")
    parent = joint.strict_json(gzip.decompress(pinned[io.PARENT_PATH]))
    expected_parent = joint.prepare(source, root)
    joint.validate(parent, expected_parent); joint.same(parent["digest"], io.PARENT_DIGEST, "parent identity")
    model = audit_model(root, io, joint)
    entries, _, excluded, records = joint.parser.count_source(raw.decode("utf-8"))
    scores = independent_scores(entries, model, joint)
    joint.same(scores["entryDigest"], expected_parent["reference"]["population"]["entryDigest"], "all selected identities")
    joint.same(scores["phoneEvents"], expected_parent["reference"]["phones"]["native"]["total"], "phone events")
    implementation = [{"path": path, "content": pinned[path].decode("utf-8")} for path in source_paths(joint, io)]
    expected = expected_artifact(expected_parent, implementation, scores, joint, io)
    candidate = joint.strict_json(candidate_bytes)
    numeric = validate(candidate, expected, joint)
    for path, before in pinned.items():
        joint.same(io.regular_bytes(root / path), before, "stable input " + path)
    joint.same(io.regular_bytes(source), raw, "stable raw source"); joint.same(io.regular_bytes(artifact), candidate_bytes, "stable candidate")
    for path, identity in protected.items():
        joint.same(sha(io.regular_bytes(root / path)), identity, "unchanged parent after recount " + path)
    return {"version": "cmu-legacy-score-reference-independent-verification-v1", "sourceSha256": sha(raw),
            "artifactSha256": sha(candidate_bytes), "artifactDigest": candidate["digest"], "protocolSha256": PROTOCOL_SHA,
            "implementationDigest": expected["implementation"]["digest"], "entries": len(entries), "entryDigest": scores["entryDigest"],
            "records": records, "excluded": excluded, "phoneEvents": scores["phoneEvents"], "transitionEvents": scores["transitionEvents"],
            "historicalModel": {"tableSha256": TABLE_SHA, "scorerSha256": SCORER_SHA, "rows": len(model["counts"]),
                                "pairs": sum(map(len, model["counts"].values())), "vocabulary": model["vocabulary"]},
            "numericComparison": {"absoluteTolerance": ABS_TOLERANCE, "relativeTolerance": REL_TOLERANCE, **numeric},
            "summary": scores["summary"], "allOrderedRowsCompared": True, "independentParentReconstruction": True,
            "allMetadataExact": True, "sourceAndArtifactStable": True, "unmodifiedParentFiles": len(protected),
            "sourcePins": {path: sha(data) for path, data in pinned.items()}}


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--root", type=Path, required=True)
    cli.add_argument("--audit-model", action="store_true")
    for name in ["source", "artifact", "out"]:
        cli.add_argument("--" + name, type=Path)
    args = cli.parse_args()
    root = args.root.resolve()
    io, joint = dependencies(root)
    if args.audit_model:
        if any([args.source, args.artifact, args.out]):
            cli.error("--audit-model accepts only --root")
        print(json.dumps(audit_model(root, io, joint)))
    else:
        if not all([args.source, args.artifact, args.out]):
            cli.error("--source, --artifact and --out are required")
        out = io.report_path(root, args.out)
        report = verify(root, args.source, args.artifact)
        with out.open("x", encoding="utf-8") as handle:
            handle.write(json.dumps(report, indent=2) + "\n")
        print(json.dumps({key: report[key] for key in ["artifactDigest", "entries", "allOrderedRowsCompared"]}))
