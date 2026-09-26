"""Independently recount every tape row/transcript and all registered frequency bins."""
import argparse
import copy
from fractions import Fraction as F
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("reference_verifier", HERE / "verify-reference.py")
proof = importlib.util.module_from_spec(spec)
spec.loader.exec_module(proof)
ref = proof.ref


def exact_json(actual, expected, label):
    """JSON has one numeric kind, but booleans must never pass as 0/1."""
    if isinstance(expected, dict):
        ref.require(isinstance(actual, dict) and set(actual) == set(expected), label + " keys")
        for key in expected:
            exact_json(actual[key], expected[key], label + "." + key)
    elif isinstance(expected, list):
        ref.require(isinstance(actual, list) and len(actual) == len(expected), label + " length")
        for index, value in enumerate(expected):
            exact_json(actual[index], value, label + "[" + str(index) + "]")
    elif isinstance(expected, bool):
        ref.require(isinstance(actual, bool) and actual == expected, label + " boolean")
    elif isinstance(expected, (int, float)):
        ref.require(ref.finite(actual) and actual == expected, label + " numeric identity")
    else:
        ref.require(type(actual) is type(expected) and actual == expected, label + " identity")


def rational(value):
    ref.fields(value, ["numerator", "denominator", "probability"], "reference fraction")
    numerator, denominator = value["numerator"], value["denominator"]
    ref.require(isinstance(numerator, str) and isinstance(denominator, str), "decimal fraction strings")
    result = F(int(numerator), int(denominator))
    ref.require(numerator == str(result.numerator) and denominator == str(result.denominator), "canonical fraction")
    ref.require(0 <= result <= 1 and ref.finite(value["probability"]) and value["probability"] == float(result), "fraction probability")
    return result


def masks(spec):
    return [str(mask) for mask in range(1 << spec["n"]) if not mask & (1 << spec["primary"])]


def schedule(protocol):
    tape = protocol["tapes"]
    size = tape["rowsPerBlock"] * tape["uint32PerRow"] * 4
    return [{"caseId": case["id"], "caseIndex": index, "block": block, "rows": tape["rowsPerBlock"],
             "byteOffset": (index * tape["blocksPerCase"] + block) * size, "byteLength": size}
            for index, case in enumerate(protocol["cases"]) for block in range(tape["blocksPerCase"])]


def verify_tape(protocol, tape, manifest, bindings):
    ref.require(len(tape) == protocol["tapes"]["bytes"], "exact tape size")
    segments = [{**segment, "sha256": proof.sha(tape[segment["byteOffset"]:segment["byteOffset"] + segment["byteLength"]])}
                for segment in schedule(protocol)]
    expected = {"version": "q09-sampler-tape-v1", **bindings, "byteLength": len(tape), "sha256": proof.sha(tape),
        "encoding": "uint32-little-endian", "uint32PerRow": protocol["tapes"]["uint32PerRow"],
        "primaryFrequencyDraws": protocol["samplerCalls"], "segments": segments,
        "source": "Fresh OS random bytes; independent-uniform-input assumption is not empirically certified"}
    exact_json(manifest, expected, "tape manifest")


def without_uniforms(sample):
    result = copy.deepcopy(sample)
    for _, step in ref.drawn_steps(result):
        step.pop("uniform")
    return result


def verify_draw(tree, observation, row):
    """Transfer accepted leaf evidence; actual uniforms are checked against every tape cell."""
    ref.fields(observation, ["sample", "consumed"], "frequency observation")
    sample, consumed = observation["sample"], observation["consumed"]
    ref.require(ref.integer(consumed) and 0 <= consumed <= 15, "draw count integer")
    steps = ref.drawn_steps(sample)
    ref.require(len(steps) == consumed, "draw count/transcript")
    node_id, ordinal = tree["root"], 0
    while tree["nodes"][node_id]["kind"] == "branch":
        node = tree["nodes"][node_id]
        ref.require(ordinal < consumed, "missing actual grid decision")
        kind, step = steps[ordinal]
        ref.require(ref.integer(step["drawOrdinal"]) and step["drawOrdinal"] == ordinal, "contiguous ordinal")
        ref.require(ref.finite(step["uniform"]) and step["uniform"] == row[ordinal] / ref.GRID, "exact tape uniform")
        first = row[ordinal] < node["boundary"]
        ref.require(ref.takes_first(kind, step) is first, "actual finite-grid branch")
        node_id = node["first"] if first else node["second"]
        ref.require(node_id is not None, "no zero-grid branch")
        ordinal += 1
    leaf = tree["nodes"][node_id]
    ref.require(ordinal == consumed == leaf["consumed"], "leaf draw count")
    exact_json(without_uniforms(sample), without_uniforms(leaf["sample"]), "accepted complete leaf transcript")
    return sample


def witness_keys(sample, mask):
    keys = ["component:" + str(sample["selectedComponentIndex"])]
    for kind, step in ref.drawn_steps(sample):
        coordinate = [kind, step["candidateIndex"], step["remainingFromIndex"]] if kind == "component" else [kind, step["syllableIndex"], step["remainingSecondaryCount"]]
        keys.append("branch:" + ":".join(map(str, coordinate)) + (":first" if ref.takes_first(kind, step) else ":second"))
    return keys + ["pattern:" + mask]


def recount(lines, protocol, tape, bindings, trees):
    header = proof.strict_json(next(lines))
    exact_json(header, {"kind": "header", "version": "q09-sampler-frequency-archive-v1", **bindings}, "archive header")
    width = protocol["tapes"]["uint32PerRow"]
    sequence, blocks, cases = 0, [], []
    for case_index, case in enumerate(protocol["cases"]):
        aggregate = dict.fromkeys(masks(case), 0)
        witnesses, case_consumed = {}, 0
        for segment in [value for value in schedule(protocol) if value["caseIndex"] == case_index]:
            counts, consumed, digest = dict.fromkeys(masks(case), 0), 0, hashlib.sha256()
            for row_index in range(segment["rows"]):
                line = next(lines)
                ref.require(line.endswith(b"\n"), "complete newline-delimited record")
                value = proof.strict_json(line)
                coordinate = {"caseId": case["id"], "caseIndex": case_index, "block": segment["block"], "row": row_index,
                    "sequence": sequence, "tapeByteOffset": segment["byteOffset"] + row_index * width * 4}
                ref.fields(value, ["kind", *coordinate, "sample", "consumed"], "draw record")
                exact_json({key: value[key] for key in ["kind", *coordinate]}, {"kind": "draw", **coordinate}, "draw coordinate")
                row = struct.unpack_from("<" + "I" * width, tape, coordinate["tapeByteOffset"])
                sample = verify_draw(trees[case_index], {"sample": value["sample"], "consumed": value["consumed"]}, row)
                pattern = sample["marks"]
                ref.require(len(pattern) == case["n"] and pattern[case["primary"]] == ref.P and pattern.count(ref.P) == 1 and
                            pattern.count(ref.S) == case["K"] and all(mark in [ref.P, ref.S, ref.U] for mark in pattern), "pattern domain/K")
                mask = str(sum(1 << i for i, mark in enumerate(pattern) if mark == ref.S))
                ref.require(mask in counts, "same-primary mask")
                counts[mask] += 1
                aggregate[mask] += 1
                consumed += value["consumed"]
                for key in witness_keys(sample, mask):
                    if key not in witnesses:
                        witnesses[key] = {"key": key, **coordinate}
                digest.update(line)
                sequence += 1
            case_consumed += consumed
            blocks.append({"caseId": case["id"], "block": segment["block"], "rows": segment["rows"], "counts": counts,
                "consumedCells": consumed, "unusedCells": segment["rows"] * width - consumed, "transcriptSha256": digest.hexdigest()})
        rows = protocol["tapes"]["blocksPerCase"] * protocol["tapes"]["rowsPerBlock"]
        cases.append({"id": case["id"], "rows": rows, "counts": aggregate, "consumedCells": case_consumed,
            "unusedCells": rows * width - case_consumed, "witnesses": list(witnesses.values())})
    exact_json(proof.strict_json(next(lines)), {"kind": "footer", "primaryFrequencyDraws": protocol["samplerCalls"],
        "blocks": len(blocks), "supplementarySamplerCalls": 0}, "archive footer")
    ref.require(next(lines, None) is None and sequence == protocol["samplerCalls"], "exact complete archive schedule")
    return {"blocks": blocks, "cases": cases, "primaryFrequencyDraws": sequence}


def frequency_checks(protocol, counts, targets):
    checks, coverage = [], []
    for case_index, case in enumerate(protocol["cases"]):
        target = targets[case_index]
        groups = [value for value in counts["blocks"] if value["caseId"] == case["id"]]
        aggregate = counts["cases"][case_index]
        groups.append({**aggregate, "block": "aggregate"})
        for group in groups:
            n = group["rows"]
            limit = math.sqrt(math.log(2 * protocol["maskComparisons"]["M"] / protocol["frequency"]["alpha"]) / (2 * n))
            for mask in masks(case):
                observed, probability = group["counts"][mask], target.get(mask, F())
                error = abs(F(observed, n) - probability)
                # A structural zero is an exact requirement, independent of the statistical bound.
                passed = not (probability == 0 and observed != 0) and float(error) <= limit
                checks.append({"caseId": case["id"], "block": group["block"], "secondaryMask": mask, "N": n,
                    "count": observed, "target": proof.ratio(probability), "absoluteError": proof.ratio(error), "limit": limit, "passed": passed})
        coverage.append({"caseId": case["id"], "positiveNumericPatterns": len([value for value in target.values() if value > 0]),
            "observedPatterns": len([value for value in aggregate["counts"].values() if value > 0]),
            "unobservedPositiveNumericMasks": [mask for mask, probability in target.items() if probability > 0 and aggregate["counts"][mask] == 0]})
    ref.require(len(checks) == protocol["maskComparisons"]["M"], "registered multiple-comparison count")
    return checks, coverage


def accepted_inputs(protocol, reference, numeric, freeze_sha):
    ref.require(reference["version"] == "q09-independent-sampler-reference-v1" and reference["passed"] is True and
                reference["primaryFrequencyDraws"] == 0, "accepted prerequisite reference")
    ref.require(reference["sourceFreezeSha256"] == numeric["sourceFreezeSha256"] == freeze_sha and
                reference["protocolSha256"] == numeric["protocolSha256"] == proof.PROTOCOL_SHA, "reference source/protocol identities")
    exact_json(numeric["engine"], reference["engine"], "accepted engine identity")
    ref.require(len(reference["cases"]) == len(numeric["cases"]) == len(protocol["cases"]), "reference schedule")
    targets, trees = [], []
    for index, case in enumerate(protocol["cases"]):
        accepted, archived = reference["cases"][index], numeric["cases"][index]
        ref.require(accepted["id"] == archived["id"] == case["id"], "reference case identity")
        model = ref.HistoryReference(ref.configured_case(protocol, case), case["K"])
        distribution = ref.verify_numeric_tree(model, archived["tree"])
        target = {}
        for value in accepted["patterns"]:
            pattern = tuple(value["marks"])
            mask = str(ref.oracle.pattern_mask(pattern))
            ref.require(value["secondaryMask"] == mask and mask not in target, "reference pattern mask")
            target[mask] = rational(value["numericGrid"])
            ref.require(target[mask] == distribution.get(pattern, F()) and rational(value["continuous"]) == model.continuous[pattern], "accepted exact grid/mathematical law")
        ref.require(set(target) == {str(ref.oracle.pattern_mask(pattern)) for pattern in model.continuous} and sum(target.values()) == 1, "complete accepted pattern support")
        targets.append(target)
        trees.append(archived["tree"])
    return targets, trees


def publish_report(out, result):
    # A statistical failure is retained too; callers must inspect passed, not only process exit.
    with out.open("x") as handle:
        json.dump(result, handle, indent=2, allow_nan=False)
        handle.write("\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["freeze", "freeze-sha", "reference", "reference-sha", "numeric-archive", "tape", "manifest", "manifest-sha", "capture", "capture-sha", "archive", "out"]:
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    out = Path(args.out)
    ref.require(not out.exists() and not out.is_symlink() and out.parent.is_dir() and not out.resolve().is_relative_to(proof.ROOT.resolve()), "fresh output outside source checkout")
    inputs = {key: Path(getattr(args, key)).read_bytes() for key in ["freeze", "reference", "manifest", "capture", "numeric_archive", "tape"]}
    for key in ["freeze", "reference", "manifest", "capture"]:
        ref.require(proof.sha(inputs[key]) == getattr(args, key + "_sha"), "externally pinned " + key)
    freeze, reference, manifest, capture = [proof.strict_json(inputs[key]) for key in ["freeze", "reference", "manifest", "capture"]]
    ref.require(proof.sha(inputs["numeric_archive"]) == reference["numericArchiveSha256"], "accepted exact numeric archive")
    before = proof.source_snapshot()
    ref.require(before == freeze["sources"] and freeze["version"] == "q09-sampler-source-freeze-v1" and freeze["protocolSha256"] == proof.PROTOCOL_SHA, "frozen source closure")
    protocol_bytes = (HERE / "protocol.json").read_bytes()
    ref.require(proof.sha(protocol_bytes) == proof.PROTOCOL_SHA, "protocol bytes")
    protocol = proof.strict_json(protocol_bytes)
    numeric = proof.strict_json(gzip.decompress(inputs["numeric_archive"]))
    targets, trees = accepted_inputs(protocol, reference, numeric, args.freeze_sha)
    bindings = {"sourceFreezeSha256": args.freeze_sha, "protocolSha256": proof.PROTOCOL_SHA,
        "referenceSha256": args.reference_sha, "engine": reference["engine"]}
    verify_tape(protocol, inputs["tape"], manifest, bindings)
    identities = {**bindings, "tapeManifestSha256": args.manifest_sha, "tapeSha256": proof.sha(inputs["tape"])}
    archive_path = Path(args.archive)
    archive_sha, archive_size = hash_file(archive_path)
    exact_json(capture["archive"], {"sha256": archive_sha, "byteLength": archive_size}, "capture archive identity")
    with gzip.open(archive_path, "rb") as handle:
        counts = recount(iter(handle), protocol, inputs["tape"], identities, trees)
    exact_json(capture, {"version": "q09-sampler-frequency-capture-v1", **identities,
        "archive": {"sha256": archive_sha, "byteLength": archive_size}, **counts, "supplementarySamplerCalls": 0,
        "scope": "Primary draws only; frequencies require independent verification; full raw transcripts retained"}, "complete capture recount")
    checks, coverage = frequency_checks(protocol, counts, targets)
    ref.require(proof.source_snapshot() == before, "source bytes changed during verification")
    for key, value in inputs.items():
        ref.require(Path(getattr(args, key)).read_bytes() == value, key + " changed during verification")
    ref.require(hash_file(archive_path) == (archive_sha, archive_size), "frequency archive changed during verification")
    result = {"version": "q09-independent-frequency-verification-v1", **identities, "captureSha256": args.capture_sha,
        "archiveSha256": archive_sha, "numericArchiveSha256": reference["numericArchiveSha256"],
        "structuralChecksPassed": True, "passed": all(value["passed"] for value in checks),
        "primaryFrequencyDraws": counts["primaryFrequencyDraws"], "supplementarySamplerCalls": 0,
        "comparisons": checks, "coverage": coverage, "recount": counts,
        "scope": "All exact leaf transcripts transferred from accepted independent rational/same-Node reference, all tape uniforms and finite-grid branches checked, every mask counted; frequency bound conditional on independent uniform input; not proof of exactness or linguistic quality"}
    publish_report(out, result)
    print(json.dumps({"output": str(out), "sha256": proof.sha(out.read_bytes()), "passed": result["passed"], "comparisons": len(checks)}))


def hash_file(path):
    digest, size = hashlib.sha256(), 0
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
            size += len(block)
    return digest.hexdigest(), size


if __name__ == "__main__":
    main()
