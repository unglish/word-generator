"""Verify compact bytes and recorded outcomes; optionally rehash full retention."""
import argparse
import hashlib
import json
from pathlib import Path
import tarfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify_bytes(data, record):
    assert len(data) == record["bytes"] and digest(data) == record["sha256"], record["file"]


def unique_records(records):
    indexed = {record["file"]: record for record in records}
    assert len(indexed) == len(records), "Duplicate evidence path"
    return indexed


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--packet", type=Path, default=Path(__file__).parent)
parser.add_argument("--retained", type=Path, help="Complete retained archive with all raw and selected runtime files")
args = parser.parse_args()
manifest = json.loads((args.packet / "manifest.json").read_text())
assert manifest["registeredWordsPerArm"] == 200000 and manifest["cohort"] == "development"
archive_record = manifest["archive"]
verify_bytes((args.packet / archive_record["file"]).read_bytes(), archive_record)
expected = unique_records(manifest["members"])
assert len(expected) == 284
decoded = {}
with tarfile.open(args.packet / archive_record["file"], "r:gz") as archive:
    members = archive.getmembers()
    names = [member.name for member in members]
    assert len(names) == len(set(names)) and set(names) == set(expected)
    for member in members:
        path = Path(member.name)
        assert member.isfile() and not path.is_absolute() and ".." not in path.parts
        data = archive.extractfile(member).read()
        verify_bytes(data, expected[member.name])
        decoded[member.name] = data
index = json.loads(decoded["retention-index.json"])
assert digest(decoded["retention-index.json"]) == manifest["fullRetainedIndexSha256"]
registration = json.loads(decoded["execution/registration.json"])
acceptance = json.loads(decoded["acceptance.json"])
assert index["heads"] == registration["heads"] == acceptance["heads"] == manifest["heads"]
indexed = unique_records(index["files"])
external = unique_records(manifest["externalRetainedFiles"])
assert len(indexed) == acceptance["retained"]["files"] == 397
assert len(external) == 115
assert set(indexed) == (set(expected) - {"retention-index.json", "acceptance.json"}) | set(external)
for name, record in indexed.items():
    actual = external[name] if name in external else expected[name]
    assert actual["bytes"] == record["bytes"] and actual["sha256"] == record["sha256"], name
for record in manifest["plainFiles"]:
    verify_bytes((args.packet / record["file"]).read_bytes(), record)
assert (args.packet / "candidate-vs-control.md").read_bytes() == decoded["candidate-vs-control/comparison.md"]
replay = json.loads(decoded["execution/public-replay.json"])
independent = json.loads(decoded["execution/independent-recount.json"])
prefix = json.loads(decoded["execution/trace-prefix-rng.json"])
assert replay["heads"] == independent["heads"] == prefix["heads"] == manifest["heads"]
assert replay["publicTracedWords"] == independent["rawRecordsRecounted"] == 400000
assert len(replay["streams"]) == len(independent["streams"]) == 20
assert replay["allCompleteArchiveWordsTracesMatch"] and replay["allLegacyPayloadsAndPerDrawRngBoundariesMatch"]
assert independent["allCoreSummaryFieldsEqualExceptRunId"] and independent["completeDistributionsEqual"]
assert prefix["everyTraceOnOffPrefixRngBoundaryAndNextValueMatches"]
assert digest(decoded["execution/public-replay.json"]) == prefix["publicReplaySha256"]
gates = json.loads(decoded["execution/gate-commands.json"])
assert len(gates) == 15 and sum(record["exitCode"] == 0 for record in gates) == 13
assert {record["name"] for record in gates if record["exitCode"] != 0} == {"control-current-lint", "candidate-current-lint"}
assert json.loads(decoded["execution/lint-equivalence.json"])["exactLogsEqualAfterCheckoutPathNormalization"]
timing = json.loads(decoded["execution/native-timing-complete.json"])
assert timing["runs"] == timing["passingRuns"] == 12 and timing["pairs"] == 6
if args.retained:
    assert (args.retained / "index.json").read_bytes() == decoded["retention-index.json"]
    for name, record in indexed.items():
        verify_bytes((args.retained / name).read_bytes(), record)
print(json.dumps({"compactMembersVerified": len(expected), "fullRetainedFilesVerified": len(indexed) if args.retained else 0,
                  "scope": "Byte/hash and recorded-outcome integrity only; not a scientific rerun, human verdict or complete runtime installation."}))
