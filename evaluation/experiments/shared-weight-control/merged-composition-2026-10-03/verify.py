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
parser.add_argument("--original-baseline", type=Path, help="Original full development baseline for additional raw-artifact verification")
parser.add_argument("--retained", type=Path, help="Complete retained archive with all raw and selected runtime files")
args = parser.parse_args()
manifest = json.loads((args.packet / "manifest.json").read_text())
assert manifest["registeredWordsPerArm"] == 200000 and manifest["cohort"] == "development"
archive_record = manifest["archive"]
verify_bytes((args.packet / archive_record["file"]).read_bytes(), archive_record)
expected = unique_records(manifest["members"])
assert len(expected) == 323
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
assert len(indexed) == acceptance["retained"]["files"] == 456
assert len(external) == 135
assert set(indexed) == (set(expected) - {"retention-index.json", "acceptance.json"}) | set(external)
for name, record in indexed.items():
    actual = external[name] if name in external else expected[name]
    assert actual["bytes"] == record["bytes"] and actual["sha256"] == record["sha256"], name
for record in manifest["plainFiles"]:
    verify_bytes((args.packet / record["file"]).read_bytes(), record)
for comparison in ["candidate-vs-control", "candidate-vs-original", "control-vs-original"]:
    assert (args.packet / (comparison + ".md")).read_bytes() == decoded[comparison + "/comparison.md"]
replay = json.loads(decoded["execution/public-replay.json"])
independent = json.loads(decoded["execution/independent-recount.json"])
assert replay['heads'] == independent['heads'] == manifest['heads']
assert sum(arm['words'] for arm in replay['arms'].values()) == 400000
assert independent['control']['words'] == independent['candidate']['words'] == 200000
assert all(arm['completeWordsAndTracesEqual'] and len(arm['streams']) == 20 for arm in replay['arms'].values())
assert all(independent[arm]['completeWeightObservationsAndWitnessesMatch'] for arm in ['control','candidate'])
legacy = json.loads(decoded['execution/legacy-comparison.json'])
assert legacy['legacyParity'] and legacy['totals']['pairs'] == 200000 and legacy['totals']['legacyPayloadChanges'] == 0
core = json.loads(decoded['execution/legacy-core-summary-parity.json'])
assert core['allCompleteCoreSummaryFieldsEqualExceptRunId'] and core['allCompletePhoneTrigramDistributionsEqual']
original = json.loads(decoded['original-baseline-compact/manifest.json'])['manifest']
original_raw = [record for record in original['artifacts'] if record['file'].startswith('words/')]
assert original_raw == manifest['externalOriginalBaselineRawArtifacts'] and len(original_raw) == 20
if args.original_baseline:
    for record in original['artifacts']:
        verify_bytes((args.original_baseline / record['file']).read_bytes(), record)
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
print(json.dumps({"compactMembersVerified": len(expected), "fullRetainedFilesVerified": len(indexed) if args.retained else 0, "originalBaselineRawVerified": bool(args.original_baseline),
                  "scope": "Byte/hash and recorded-outcome integrity only; not a scientific rerun, human verdict or complete runtime installation."}))
