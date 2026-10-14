"""Verify lossless compact bytes; optionally verify every full retained input."""
import argparse
import hashlib
import json
import pathlib
import tarfile


def sha(data):
    return hashlib.sha256(data).hexdigest()


def verify_bytes(data, record):
    assert len(data) == record["bytes"] and sha(data) == record["sha256"], record["file"]


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--packet", type=pathlib.Path, default=pathlib.Path(__file__).parent / "current-composition-2026-10-03")
parser.add_argument("--retained", type=pathlib.Path, help="Complete local archive, including all 40 raw trace shards and selected runtime bytes")
args = parser.parse_args()
manifest = json.loads((args.packet / "manifest.json").read_text())
assert manifest["registeredWordsPerArm"] == 200000 and manifest["cohort"] == "development"
archive_record = manifest["archive"]
archive_bytes = (args.packet / archive_record["file"]).read_bytes()
verify_bytes(archive_bytes, archive_record)
expected = {item["file"]: item for item in manifest["members"]}
assert len(expected) == len(manifest["members"]) == 300
decoded = {}
with tarfile.open(args.packet / archive_record["file"], "r:gz") as archive:
    names = [item.name for item in archive.getmembers()]
    assert len(names) == len(set(names)) and set(names) == set(expected)
    for item in archive.getmembers():
        assert item.isfile() and not item.name.startswith("/") and ".." not in pathlib.PurePosixPath(item.name).parts
        data = archive.extractfile(item).read()
        record = expected[item.name]
        verify_bytes(data, record)
        decoded[item.name] = data
index = json.loads(decoded["retention-index.json"])
assert sha(decoded["retention-index.json"]) == manifest["fullRetainedIndexSha256"]
assert index["heads"] == manifest["heads"] == json.loads(decoded["execution/registration.json"])["heads"]
indexed = {record["file"]: record for record in index["files"]}
external = {record["file"]: record for record in manifest["externalRetainedFiles"]}
assert len(indexed) == len(index["files"]) == 413
assert len(external) == len(manifest["externalRetainedFiles"]) == 115
assert set(indexed) == (set(expected) - {"retention-index.json", "acceptance.json"}) | set(external)
for name, record in indexed.items():
    actual = external[name] if name in external else expected[name]
    assert actual["bytes"] == record["bytes"] and actual["sha256"] == record["sha256"], name
for record in manifest["plainComparisons"]:
    data = (args.packet / record["file"]).read_bytes()
    verify_bytes(data, record)
    original = record["file"].removesuffix(".md") + "/comparison.md"
    assert data == decoded[original]
gates = json.loads(decoded["execution/gate-commands.json"])
assert len(gates) == 15 and sum(x["exitCode"] == 0 for x in gates) == 13
assert {x["name"] for x in gates if x["exitCode"] != 0} == {"control-current-lint", "candidate-current-lint"}
timing = json.loads(decoded["execution/native-timing-complete.json"])
assert timing["runs"] == timing["passingRuns"] == 12 and timing["pairs"] == 6
replay = json.loads(decoded["execution/public-replay.json"])
assert replay["heads"] == manifest["heads"]
assert all(arm["words"] == 200000 and len(arm["streams"]) == 20 for arm in replay["arms"].values())
if args.retained:
    assert (args.retained / "index.json").read_bytes() == decoded["retention-index.json"]
    for name, record in indexed.items():
        data = (args.retained / name).read_bytes()
        verify_bytes(data, record)
print(json.dumps({"compactMembersVerified": len(expected), "fullExternalArchiveVerified": bool(args.retained), "fullRetainedFilesVerified": len(indexed) if args.retained else 0, "scope": "Byte/hash and recorded outcome integrity; not a fresh scientific rerun, human verdict or complete external test-runner installation."}))
