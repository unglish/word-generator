"""Compare every archived legacy word/trace field at registered stream coordinates."""
import copy
import gzip
import hashlib
import itertools
import json
from pathlib import Path

TRACE_ADDITIONS = ("finalWord", "writerInput", "writerOutput", "gapSpellingPass", "morphologyPass",
                   "pronunciationPasses", "morphologyPreparation", "morphologyWriting", "finalNucleus")
REALIZATION_ADDITIONS = ("rootEdits", "finalSpelling", "phoneAssembly", "finalPhones", "selectionPhones", "configurationIndices")


def legacy(word):
    result = copy.deepcopy(word)
    trace = result.get("trace")
    if trace is not None:
        for key in TRACE_ADDITIONS:
            trace.pop(key, None)
        realization = trace.get("morphology", {}).get("realization")
        if realization is not None:
            for key in REALIZATION_ADDITIONS:
                realization.pop(key, None)
    return result


def rows(path):
    with gzip.open(path, "rt", encoding="utf-8") as stream:
        for line in stream:
            yield json.loads(line)


def compare_stream(control_path, candidate_path, profile, seed, expected_rows):
    count = 0
    for index, (control, candidate) in enumerate(itertools.zip_longest(rows(control_path), rows(candidate_path))):
        assert control is not None and candidate is not None, "Unequal stream lengths"
        for row in (control, candidate):
            assert type(row["seed"]) is int and type(row["drawIndex"]) is int
            assert (row["profile"], row["seed"], row["drawIndex"]) == (profile, seed, index)
        assert "finalWord" not in control["word"].get("trace", {})
        assert candidate["word"].get("trace", {}).get("finalWord") is not None
        assert control["word"] == legacy(candidate["word"]), f"Legacy mismatch at {profile}/{seed}/{index}"
        count += 1
    assert count == expected_rows
    return count


def manifest(directory, expected_hash):
    raw = (directory / "manifest.json").read_bytes()
    assert hashlib.sha256(raw).hexdigest() == expected_hash
    data = json.loads(raw)["manifest"]
    freeze = json.loads(Path(str(directory) + "-freeze").joinpath("complete.json").read_bytes())
    assert freeze["passed"] is True and freeze["words"] == 200000
    assert freeze["manifest"]["sha256"] == expected_hash
    return data


def verify_artifact(directory, entries, name):
    items = [item for item in entries if item["file"] == name]
    assert len(items) == 1
    digest = hashlib.sha256()
    size = 0
    with (directory / name).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
            size += len(chunk)
    assert digest.hexdigest() == items[0]["sha256"] and size == items[0]["bytes"]


def compare(control, candidate, control_hash, candidate_hash, registration_path, protocol_path):
    control, candidate = Path(control), Path(candidate)
    registration_raw, protocol_raw = Path(registration_path).read_bytes(), Path(protocol_path).read_bytes()
    registration, protocol = json.loads(registration_raw), json.loads(protocol_raw)
    assert hashlib.sha256(protocol_raw).hexdigest() == registration["protocolSha256"]
    a, b = manifest(control, control_hash), manifest(candidate, candidate_hash)
    assert a["protocol"] == b["protocol"] == protocol
    assert a["cohort"] == b["cohort"] == "development"
    assert a["generator"]["effectiveConfig"] == b["generator"]["effectiveConfig"]
    assert a["generator"]["commit"] == "905ba3e92d396db358504fec1826c1c83f680ff3"
    assert b["generator"]["commit"] == "7e34a17f31d44d1e31420f458bf6e2d99c5fa038"
    total, groups = 0, {}
    for profile in protocol["profiles"]:
        for seed in profile["seeds"]["development"]:
            name = f"words/{profile['id']}-{seed}.jsonl.gz"
            verify_artifact(control, a["artifacts"], name)
            verify_artifact(candidate, b["artifacts"], name)
            count = compare_stream(control / name, candidate / name, profile["id"], seed, protocol["wordsPerReplicate"])
            groups[f"{profile['id']}/{seed}"] = count
            total += count
            print(f"{profile['id']}/{seed}: {count} complete legacy records equal", flush=True)
    assert total == registration["wordsPerArm"] == 200000
    return dict(passed=True, words=total, replicates=groups, legacyWordAndTraceDifferences=0,
                controlManifestSha256=control_hash, candidateManifestSha256=candidate_hash,
                registrationSha256=hashlib.sha256(registration_raw).hexdigest(),
                scope="Full archived JSON word/legacy-trace equality; RNG use is tested separately.")


if __name__ == "__main__":
    import argparse
    if not __debug__:
        raise RuntimeError("Do not run archive comparison with Python -O")
    parser = argparse.ArgumentParser()
    for name in ("control", "candidate", "control_hash", "candidate_hash", "registration", "protocol", "output"):
        parser.add_argument(name)
    args = parser.parse_args()
    result = compare(args.control, args.candidate, args.control_hash, args.candidate_hash, args.registration, args.protocol)
    with open(args.output, "x", encoding="utf-8") as output:
        json.dump(result, output, indent=2)
        output.write("\n")
