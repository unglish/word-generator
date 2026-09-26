"""Verify sampler reference with independent histories plus separately pinned Node replay."""
import argparse
from fractions import Fraction as F
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASE = HERE.parent
spec = importlib.util.spec_from_file_location("sampler_reference", HERE / "reference.py")
ref = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ref)
PROTOCOL_SHA = "5fec61ae76fa0c81e317637f2dac065e43ced844ca46836236db47b8045929f4"


def sha(value):
    return hashlib.sha256(value).hexdigest()


def strict_json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            ref.require(key not in result, "duplicate JSON key")
            result[key] = value
        return result
    def constant(_value):
        raise ValueError("Nonfinite JSON number")
    return json.loads(data, object_pairs_hook=pairs, parse_constant=constant)


def source_snapshot():
    def walk(directory):
        result = []
        for path in directory.iterdir():
            ref.require(not path.is_symlink(), "source closure rejects symlinks")
            if path.is_dir():
                if path.name != "__pycache__":
                    result.extend(walk(path))
            else:
                ref.require(path.is_file(), "regular source file")
                result.append(path)
        return result
    files = {path for path in walk(ROOT / "src") if path.suffix == ".ts"} | {
        ROOT / name for name in ["package.json", "package-lock.json", "tsconfig.json"]}
    for directory in [BASE / "protocol", BASE / "law-evidence", HERE]:
        files.update(walk(directory))
    result = {}
    for path in sorted(files):
        ref.require(path.is_file() and not path.is_symlink(), "regular source file")
        result[path.relative_to(ROOT).as_posix()] = sha(path.read_bytes())
    return result


def ratio(value):
    return {"numerator": str(value.numerator), "denominator": str(value.denominator), "probability": float(value)}


def tv(first, second):
    return sum((abs(first.get(key, F()) - second.get(key, F())) for key in first.keys() | second.keys()), F()) / 2


def verify_case(protocol, spec, archived, replay):
    ref.fields(archived, ["id", "input", "fixed", "inputMutation", "tree", "apiCalls"], "case")
    ref.fields(replay, ["id", "calls", "numericDecisionsChecked"], "Node replay case")
    ref.require(archived["id"] == replay["id"] == spec["id"], "case identity/order")
    case = ref.configured_case(protocol, spec)
    model = ref.HistoryReference(case, spec["K"])
    expected_input = {"beforePrimary": [ref.U] * case["n"],
        "afterPrimary": [ref.P if i == case["primaryIndex"] else ref.U for i in range(case["n"])],
        "operationalHeavy": case["operationalHeavy"], "secondary": case["secondary"], "rhythmic": case["rhythmic"],
        "lambda": ref.math.log(2)}
    ref.require(archived["input"] == expected_input, "registered law input")
    rows = [[value] * 15 for value in protocol["transcriptRows"]["constantUint32"]]
    rows.append([protocol["transcriptRows"]["alternatingUint32"][i % 2] for i in range(15)])
    ref.require(len(archived["fixed"]) == len(rows), "fixed fixture schedule")
    decisions = 0

    def observation(value, row):
        nonlocal decisions
        ref.fields(value, ["sample", "consumed"], "observation")
        model.verify_sample(value["sample"], row, value["consumed"])
        decisions += value["consumed"]

    for row, fixture in zip(rows, archived["fixed"]):
        ref.fields(fixture, ["row", "beforeMutation", "replay"], "fixed fixture")
        ref.require(fixture["row"] == row, "fixed row identity")
        observation(fixture["beforeMutation"], row)
        observation(fixture["replay"], row)
        ref.require(fixture["beforeMutation"] == fixture["replay"], "detached returned-result replay")
    mutation = archived["inputMutation"]
    ref.fields(mutation, ["row", "changedInput", "before", "after"], "input mutation")
    ref.require(mutation["row"] == [ref.GRID // 2] * 15, "input-mutation row")
    changed = strict_json(json.dumps(expected_input))
    changed["beforePrimary"] = [ref.P] * case["n"]
    changed["afterPrimary"] = [ref.S] * case["n"]
    changed["operationalHeavy"] = [False] * case["n"]
    changed["secondary"]["enabled"] = False
    changed["rhythmic"]["probability"] = 100
    ref.require(mutation["changedInput"] == changed, "exact detached input mutations")
    observation(mutation["before"], mutation["row"])
    observation(mutation["after"], mutation["row"])
    ref.require(mutation["before"] == mutation["after"], "detached input replay")
    numerical = ref.verify_numeric_tree(model, archived["tree"])
    for node in archived["tree"]["nodes"]:
        decisions += node["consumed"] if node["kind"] == "leaf" else sum(probe["consumed"] for probe in node["probes"])
    calls = {"fixedIncludingReplay": len(rows) * 2, "inputMutation": 2, "tree": archived["tree"]["apiCalls"]}
    for actual in [archived["apiCalls"], replay["calls"]]:
        ref.require(set(actual) == set(calls) and all(ref.integer(value) for value in actual.values()) and actual == calls, "supplementary call accounting")
    ref.require(ref.integer(replay["numericDecisionsChecked"]) and replay["numericDecisionsChecked"] == decisions, "same-Node numeric check coverage")
    ideal = model.ideal_grid()
    ideal_difference = tv(ideal, model.continuous)
    numeric_difference = tv(numerical, model.continuous)
    ref.require(ideal_difference <= F(2 * model.n - 1, ref.GRID), "ideal grid coupling bound")
    ref.require(numeric_difference <= F(str(protocol["numericalReference"]["maximumTotalVariationToContinuous"])), "registered numeric/continuous TV tolerance")
    require_support = set(numerical) <= set(model.continuous)
    ref.require(require_support, "numeric grid produced a zero-law-support pattern")
    patterns = [{"marks": list(pattern), "secondaryMask": str(ref.oracle.pattern_mask(pattern)),
                 "continuous": ratio(model.continuous[pattern]), "idealGrid": ratio(ideal.get(pattern, F())),
                 "numericGrid": ratio(numerical.get(pattern, F()))}
                for pattern in sorted(model.continuous, key=ref.oracle.pattern_mask)]
    return {"id": spec["id"], "calls": calls, "nodeReplayCalls": dict(calls), "checkedNumericDecisionsPerPass": decisions,
            "nodes": len(archived["tree"]["nodes"]), "patterns": patterns,
            "totalVariation": {"idealToContinuous": ratio(ideal_difference), "numericToContinuous": ratio(numeric_difference), "numericToIdeal": ratio(tv(numerical, ideal))}}


def verify_bindings(raw, replay, archive_sha, freeze_sha, protocol):
    ref.fields(raw, ["version", "sourceFreezeSha256", "protocolSha256", "engine", "cases", "scope"], "numeric archive")
    ref.fields(replay, ["version", "passed", "archiveSha256", "sourceFreezeSha256", "protocolSha256", "engine", "cases", "scope"], "Node replay")
    ref.require(raw["version"] == "q09-sampler-numeric-tree-v1" and replay["version"] == "q09-sampler-node-replay-v1", "artifact versions")
    ref.require(replay["passed"] is True and replay["archiveSha256"] == archive_sha, "externally pinned Node replay binds exact archive")
    ref.require(raw["sourceFreezeSha256"] == replay["sourceFreezeSha256"] == freeze_sha, "source identity")
    ref.require(raw["protocolSha256"] == replay["protocolSha256"] == PROTOCOL_SHA, "protocol identity")
    ref.fields(raw["engine"], ["node", "versions", "platform", "architecture", "executableSha256"], "engine identity")
    ref.require(raw["engine"] == replay["engine"], "same Node engine/binary")
    digest = raw["engine"]["executableSha256"]
    ref.require(isinstance(digest, str) and len(digest) == 64 and all(c in "0123456789abcdef" for c in digest), "Node executable SHA")
    ref.require(len(raw["cases"]) == len(replay["cases"]) == len(protocol["cases"]), "complete six-case schedule")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["input", "input-sha", "node-replay", "node-replay-sha", "freeze", "freeze-sha", "out"]:
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    out = Path(args.out)
    ref.require(not out.exists() and not out.is_symlink(), "fresh exclusive output")
    ref.require(out.parent.is_dir() and not out.resolve().is_relative_to(ROOT.resolve()), "output outside frozen checkout")
    inputs = {key: Path(getattr(args, key)).read_bytes() for key in ["input", "node_replay", "freeze"]}
    for key, value in inputs.items():
        ref.require(sha(value) == getattr(args, key + "_sha"), "externally pinned " + key)
    freeze = strict_json(inputs["freeze"])
    ref.fields(freeze, ["version", "protocolSha256", "sources"], "source freeze")
    ref.require(freeze["version"] == "q09-sampler-source-freeze-v1" and freeze["protocolSha256"] == PROTOCOL_SHA, "source freeze version/protocol")
    before = source_snapshot()
    ref.require(before == freeze["sources"], "exact source names/bytes before verification")
    protocol_bytes = (HERE / "protocol.json").read_bytes()
    ref.require(sha(protocol_bytes) == PROTOCOL_SHA, "frozen sampler protocol")
    protocol = strict_json(protocol_bytes)
    raw, replay = strict_json(gzip.decompress(inputs["input"])), strict_json(inputs["node_replay"])
    verify_bindings(raw, replay, args.input_sha, args.freeze_sha, protocol)
    cases = [verify_case(protocol, case, raw["cases"][i], replay["cases"][i]) for i, case in enumerate(protocol["cases"])]
    ref.require(source_snapshot() == before, "sources changed during verification")
    for key, value in inputs.items():
        ref.require(Path(getattr(args, key)).read_bytes() == value, key + " changed during verification")
    result = {"version": "q09-independent-sampler-reference-v1", "passed": True, "protocolSha256": PROTOCOL_SHA,
              "numericArchiveSha256": args.input_sha, "nodeReplaySha256": args.node_replay_sha, "sourceFreezeSha256": args.freeze_sha,
              "engine": raw["engine"], "cases": cases, "primaryFrequencyDraws": 0,
              "scope": "Independent literal-history mathematics/structure; separately pinned same-Node numerical authority; grid boundaries conditional on reviewed monotonic predicate; no frequency evidence"}
    with out.open("x") as handle:
        json.dump(result, handle, indent=2, allow_nan=False)
        handle.write("\n")
    print(json.dumps({"output": str(out), "sha256": sha(out.read_bytes()), "cases": len(cases)}))


if __name__ == "__main__":
    main()
