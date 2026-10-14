"""Authenticate the compact packet; raw word replay requires the original verifier."""
import hashlib
import json
import tarfile
from pathlib import Path

root = Path(__file__).resolve().parent

def read(name):
    return json.loads((root / name).read_text())

def digest(data):
    return hashlib.sha256(data).hexdigest()

entries = read("artifacts.json")["artifacts"]
assert {p.name for p in root.iterdir() if p.is_file()} == {e["file"] for e in entries} | {"artifacts.json", "verify.py"}
for entry in entries:
    assert Path(entry["file"]).name == entry["file"]
    data = (root / entry["file"]).read_bytes()
    assert len(data) == entry["bytes"] and digest(data) == entry["sha256"]
report = read("verification.json")
complete = read("complete.json")
registration = read("registration.json")
assert report["result"] == "pass"
assert report["compared"] == report["replayedLedgers"] == 200000
assert report["coreProfilesExactlyEqual"] is True
assert len(report["streams"]) == 20
assert all(s["words"] == 10000 for s in report["streams"])
assert len({(s["profile"], s["seed"]) for s in report["streams"]}) == 20
assert complete["verificationSha256"] == digest((root / "verification.json").read_bytes())
assert complete["heads"] == registration["heads"]
assert report["strippedFields"] == ["word.trace.baseSpelling", "word.trace.orthography.alignment"]
assert report["scriptSha256"] == digest((root.parent / "verify.ts").read_bytes())
receipts = read("archive-receipts.json")
for arm, report_arm in [("control", "original"), ("candidate", "control")]:
    raw = (root / (arm + "-manifest.json")).read_bytes()
    manifest = json.loads(raw)["manifest"]
    assert digest(raw) == report[report_arm]["manifestSha256"]
    assert manifest["generator"]["commit"] == registration["heads"][arm]
    assert len(receipts[arm]) == 26
    assert {e["file"] for e in receipts[arm] if not e["file"].startswith("words/")} == {"manifest.json", "summary.json", "sources.json.gz", "distributions.json.gz", "review-samples.json.gz", "witnesses.json.gz"}
    assert sum(e["file"].startswith("words/") for e in receipts[arm]) == 20
    with tarfile.open(root / (arm + "-registered-sources.tar.gz")) as archive:
        pins = registration["sourcePins"][arm]
        assert {m.name for m in archive.getmembers()} == set(pins)
        for member in archive.getmembers():
            assert member.isfile() and not Path(member.name).is_absolute() and ".." not in Path(member.name).parts
            data = archive.extractfile(member).read()
            assert len(data) == pins[member.name]["bytes"]
            assert digest(data) == pins[member.name]["sha256"]
a = read("control-summary.json")
b = read("candidate-summary.json")
assert a["profiles"] == b["profiles"] and a["definitions"] == b["definitions"]
for key in ["protocolDigest", "evaluatorDigest", "referenceDigest"]:
    assert a[key] == b[key]
supplement = read("supplement-comparison.json")
assert supplement["result"] == "pass"
assert supplement["originalReportSha256"] == digest((root / "control-supplement.json").read_bytes())
assert supplement["candidateReportSha256"] == digest((root / "candidate-supplement.json").read_bytes())
assert supplement["distinctScheduledDraws"] == supplement["verifiedLedgers"] == 20000
assert supplement["generatedWordsPerCheckout"] == 40000
for key in ["wordsEqual", "rngCallsAtEveryDrawEqual", "nextRngEqual", "legacyTracesEqual", "traceOnOffEqual"]:
    assert supplement[key] is True
print("Verified", len(entries), "packet artifacts, full source snapshots, 200000-word corpus and separately 20000-coordinate RNG supplement. Raw replay is separately scoped.")
