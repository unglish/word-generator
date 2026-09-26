"""Independent raw-source phone-pair recount. Never imports or runs the TS builder."""
import argparse
from collections import Counter, defaultdict
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
PARENT_PATH = "evaluation/experiments/cmu-matched-reference/reference.json.gz"
PARENT_SHA = "d7b32d1c6f49edf8211f96db14139086172288f138328d37b41ae144b685a118"
PARENT_DIGEST = "f8f5bdd9a083772f76cbb7b9db78ddebb67bcea5fa04afbccfb20f6b0a628862"
PINS = {
    "evaluation/corpus/verify-parser.py": "a59cfa124b1462f4147416236fe6b2ad267a788cb9e5a0c72acf0e9b2ec08c50",
    "evaluation/corpus/verify-joint.py": "a4a80097c1e57076eef30136ca5008a80a9a9803dc108ab1121c1bbaeff5699b",
    "evaluation/experiments/cmu-transition-builder/protocol.json": "3dd173301978c980d1ab1f2afee19da43487ad6db433aad679bb14d6b2b86131",
    "evaluation/experiments/cmu-transition-builder/protocol-amendment-01.json": "95593fde227dcadb0dda0e1875fe80ae7f88632d44a8e9d5d8ae90fe1a7907aa",
}
UNITS = "integer-phone-transition-occurrences"
BOUNDARIES = {"marker": "#", "start": "one-per-selected-entry", "end": "one-per-selected-entry",
              "traversal": "adjacent-tokens-within-entry; no-cross-entry-pairs; no-boundary-to-boundary-pair"}
ALLOWED_PARENT_EDITS = {"scripts/generate-bigram-table.ts", "docs/phonotactic-scoring.md", "TUNING.md"}


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


def report_path(root, destination):
    root, destination = Path(root).resolve(), Path(destination).absolute()
    output = destination.parent.resolve(strict=True) / destination.name
    protected = [(root / name).resolve() for name in ["src", "data/cmu", "demo", "scripts", "evaluation"]]
    if any(output == path or path in output.parents for path in protected):
        raise ValueError("Protected source or evidence report destination")
    if output.exists() or output.is_symlink():
        raise ValueError("Report already exists; choose a fresh path")
    return output


def load_joint(root):
    for path, expected in PINS.items():
        if sha(regular_bytes(root / path)) != expected:
            raise ValueError(f"Frozen dependency/protocol changed: {path}")
    spec = importlib.util.spec_from_file_location("transition_joint", root / "evaluation/corpus/verify-joint.py")
    joint = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(joint)
    return joint


def source_paths(joint):
    return [*joint.SOURCE_PATHS, "evaluation/corpus/phone-transitions.ts", "evaluation/corpus/transition-builder.ts",
            "scripts/generate-bigram-table.ts", "package-lock.json"]


def pair_table(sequences):
    """Independent traversal: include start/end pairs for each entry, never concatenate entries."""
    pairs = Counter()
    for tokens in sequences:
        if not tokens:
            raise ValueError("Empty selected pronunciation")
        pairs[("#", tokens[0])] += 1
        pairs.update(zip(tokens, tokens[1:]))
        pairs[(tokens[-1], "#")] += 1
    rows = defaultdict(dict)
    for (first, second), count in pairs.items():
        rows[first][second] = count
    totals = {key: sum(row.values()) for key, row in rows.items()}
    return {"total": sum(pairs.values()), "counts": dict(rows), "rowTotals": totals,
            "vocabulary": sorted({token for pair in pairs for token in pair})}


def transitions(joint, entries):
    native = [entry["tokens"] for entry in entries]
    base = [[token[:-1] if token[-1:] in "012" else token for token in tokens] for tokens in native]
    return {"entries": len(entries), "entryDigest": sha(joint.encoded(entries)),
            "phoneEvents": sum(map(len, native)), "native": pair_table(native), "base": pair_table(base)}


def expected_artifact(joint, parent, implementation, pairs):
    reference = parent["reference"]
    joint.same([file["path"] for file in implementation], source_paths(joint), "implementation paths")
    lock = next(file["content"] for file in implementation if file["path"] == "package-lock.json")
    return copy.deepcopy({
        "version": "cmu-phone-transition-reference-artifact-v1", "source": reference["source"],
        "parser": reference["parser"], "population": reference["population"], "policy": "cmu-ascii-first-v1",
        "units": UNITS, "boundaries": BOUNDARIES, "projections": joint.PROJECTIONS, "transitions": pairs,
        "parentReference": {"version": "cmu-joint-reference-artifact-v1", "artifactDigest": PARENT_DIGEST,
                            "referenceDigest": joint.digest(reference), "compressedFileSha256": PARENT_SHA},
        "license": parent["license"],
        "implementation": {"digest": joint.digest(implementation), "sources": implementation, "packageLockSha256": sha(lock.encode())},
    })


def conservation(joint, pairs, reference):
    joint.same(pairs["entries"], reference["population"]["accepted"], "entry count")
    joint.same(pairs["entryDigest"], reference["population"]["entryDigest"], "entry digest")
    joint.same(pairs["phoneEvents"], reference["phones"]["native"]["total"], "phone count")
    for view in ["native", "base"]:
        table = pairs[view]
        expected = {**reference["phones"][view]["counts"], "#": pairs["entries"]}
        incoming = Counter()
        for first, row in table["counts"].items():
            for second, count in row.items():
                if first == second == "#" or type(count) is not int or count <= 0:
                    raise ValueError("Invalid boundary or occurrence count")
                incoming[second] += count
        joint.same(table["rowTotals"], expected, view + " outgoing marginals")
        joint.same(dict(incoming), expected, view + " incoming marginals")
        joint.same(table["vocabulary"], sorted(expected), view + " vocabulary")
        joint.same(table["total"], pairs["phoneEvents"] + pairs["entries"], view + " event conservation")


def verify(root, source, artifact):
    root = Path(root).resolve()
    source, artifact = Path(source).absolute(), Path(artifact).absolute()
    joint = load_joint(root)
    protocol = joint.strict_json(regular_bytes(root / "evaluation/experiments/cmu-transition-builder/protocol.json"))
    design_path = root / "evaluation/experiments/cmu-transition-builder/design.md"
    joint.same(sha(regular_bytes(design_path)), protocol["designSha256"], "reviewed design bytes")
    parent_files_path = root / "evaluation/experiments/cmu-transition-builder/parent-files.json"
    parent_files_bytes = regular_bytes(parent_files_path)
    joint.same(sha(parent_files_bytes), protocol["parentFilesSha256"], "parent-file snapshot")
    parent_files = joint.strict_json(parent_files_bytes)
    for path, expected in parent_files.items():
        if path not in ALLOWED_PARENT_EDITS:
            joint.same(sha(regular_bytes(root / path)), expected, "unchanged parent " + path)
    paths = list(dict.fromkeys([*source_paths(joint), *PINS, "evaluation/corpus/verify-transitions.py",
                               "evaluation/corpus/verify-transitions-test.py", PARENT_PATH,
                               "evaluation/experiments/cmu-transition-builder/parent-files.json",
                               "evaluation/experiments/cmu-transition-builder/design.md"]))
    pinned = {path: regular_bytes(root / path) for path in paths}
    raw, candidate_bytes = regular_bytes(source), regular_bytes(artifact)
    joint.same(sha(raw), joint.parser.SOURCE_SHA, "source bytes")
    joint.same(sha(pinned[PARENT_PATH]), PARENT_SHA, "compressed parent bytes")
    parent = joint.strict_json(gzip.decompress(pinned[PARENT_PATH]))
    reconstructed_parent = joint.prepare(source, root)
    joint.validate(parent, reconstructed_parent)
    joint.same(parent["digest"], PARENT_DIGEST, "parent digest")
    entries, _, excluded, records = joint.parser.count_source(raw.decode("utf-8"))
    pairs = transitions(joint, entries)
    conservation(joint, pairs, reconstructed_parent["reference"])
    implementation = [{"path": path, "content": pinned[path].decode("utf-8")} for path in source_paths(joint)]
    expected = expected_artifact(joint, reconstructed_parent, implementation, pairs)
    candidate = joint.strict_json(candidate_bytes)
    joint.validate(candidate, expected)
    for path, before in pinned.items():
        joint.same(regular_bytes(root / path), before, "stable input " + path)
    joint.same(regular_bytes(source), raw, "stable raw source")
    joint.same(regular_bytes(artifact), candidate_bytes, "stable candidate")
    for path, expected_sha in parent_files.items():
        if path not in ALLOWED_PARENT_EDITS:
            joint.same(sha(regular_bytes(root / path)), expected_sha, "unchanged parent after recount " + path)
    return {
        "version": "cmu-phone-transition-independent-verification-v1", "sourceSha256": sha(raw),
        "artifactSha256": sha(candidate_bytes), "artifactDigest": candidate["digest"],
        "implementationDigest": expected["implementation"]["digest"], "protocolSha256": PINS["evaluation/experiments/cmu-transition-builder/protocol.json"],
        "records": records, "excluded": excluded, "entries": pairs["entries"], "entryDigest": pairs["entryDigest"],
        "phoneEvents": pairs["phoneEvents"],
        "views": {view: {"total": pairs[view]["total"], "observedPairs": sum(map(len, pairs[view]["counts"].values())),
                         "vocabulary": pairs[view]["vocabulary"], "startEvents": pairs[view]["rowTotals"]["#"],
                         "endEvents": sum(row.get("#", 0) for row in pairs[view]["counts"].values())} for view in ["native", "base"]},
        "allNativeBaseBinsExact": True, "independentParentReconstruction": True, "fullExpectedEnvelopeExact": True,
        "sourceAndArtifactStable": True, "unmodifiedParentFiles": len(parent_files) - len(ALLOWED_PARENT_EDITS),
        "sourcePins": {path: sha(data) for path, data in pinned.items()},
    }


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    for name in ["root", "source", "artifact", "out"]:
        cli.add_argument("--" + name, type=Path, required=True)
    args = cli.parse_args()
    out = report_path(args.root, args.out)
    report = verify(args.root, args.source, args.artifact)
    with out.open("x", encoding="utf-8") as handle:
        handle.write(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ["artifactDigest", "entries", "allNativeBaseBinsExact"]}))
