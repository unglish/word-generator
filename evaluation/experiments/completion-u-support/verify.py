"""Authenticate the packet and its complete report arithmetic, not raw replay."""
import gzip
import hashlib
import json
import statistics
from pathlib import Path

root = Path(__file__).resolve().parent
repo = root.parents[2]
evidence = root / "evidence"

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load(name):
    path = evidence / name
    if not path.exists():
        path = path.with_name(path.name + ".gz")
    data = path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix == ".gz" else data)

index = load("index.json")
listed = set()
for artifact in index["artifacts"]:
    path = evidence / artifact["file"]
    assert path.resolve().is_relative_to(evidence.resolve())
    assert artifact["file"] not in listed
    listed.add(artifact["file"])
    assert path.stat().st_size == artifact["bytes"]
    assert sha(path) == artifact["sha256"], artifact["file"]
assert listed == {str(p.relative_to(evidence)) for p in evidence.rglob("*") if p.is_file() and p != evidence / "index.json"}
sources = load("source-pins.json")
for name, pin in sources.items():
    assert (repo / name).stat().st_size == pin["bytes"]
    assert sha(repo / name) == pin["sha256"], name

production = load("candidate-analysis/report.json.gz")
seal = load("candidate-analysis/complete.json")
independent = load("independent-recount.json")
assert production["words"] == seal["words"] == independent["words"] == 200000
assert seal["passed"] and independent["integerComparisons"] == 3800019
assert seal["manifestSha256"] == sha(evidence / "candidate-archive/manifest.json")
for artifact in seal["artifacts"]:
    if artifact["file"].startswith("observations/"):
        continue  # Full observations are separately retained, not in this packet.
    path = evidence / "candidate-analysis" / artifact["file"]
    data = path.read_bytes() if path.exists() else gzip.decompress(path.with_name(path.name + ".gz").read_bytes())
    assert len(data) == artifact["bytes"] and hashlib.sha256(data).hexdigest() == artifact["sha256"]
counts = next(g["counts"] for g in production["groups"] if g["dimensions"] == ["all"])
assert all(counts[k] == value for k, value in independent["counts"].items())
assert (counts["finalRoot:unresolved"], counts["finalRoot:unavailable"], counts["completion:infeasible"]) == (58, 7935, 22)
assert load("independent-execution.json")["exitCode"] == 0
opaque = load("opaque-context-proof.json")
assert opaque["manifestSha256"] == seal["manifestSha256"]
assert (opaque["words"], opaque["completionCertificates"], opaque["opaqueUnitContextsChecked"]) == (200000, 25679, 191)
parity = load("legacy-parity-renewed.json")
assert parity["passed"] and parity["generationCalls"] == 83072
assert parity["coordinates"] == 20768 and parity["nextValueProbes"] == 128
assert parity["authoritySha256"] == sha(evidence / "legacy-parity-authority-renewed.json")
quality = load("quality-gate-results.json")
assert (quality["passed"], quality["failed"], quality["timeoutFailures"]) == (10, 2, 0)
assert quality["qualityLogSha256"] == hashlib.sha256(gzip.decompress((evidence / "quality-tests.log.gz").read_bytes())).hexdigest()

control = load("control/candidate-analysis/report.json.gz")
assert control["words"] == 200000
comparison = load("structure-comparison.json")
old_groups = {json.dumps(g["dimensions"], ensure_ascii=False): g for g in control["groups"]}
new_groups = {json.dumps(g["dimensions"], ensure_ascii=False): g for g in production["groups"]}
expected_groups = []
for key in sorted(set(old_groups) | set(new_groups)):
    old, new = old_groups.get(key), new_groups.get(key)
    row = {"dimensions": json.loads(key), "controlPresent": old is not None, "candidatePresent": new is not None}
    for output, field in [("counts", "counts"), ("events", "eventCounts")]:
        a, b = old[field] if old else {}, new[field] if new else {}
        row[output] = {k: {"control": a.get(k), "candidate": b.get(k), "change": b[k] - a[k] if k in a and k in b else None} for k in sorted(set(a) | set(b))}
    expected_groups.append(row)
assert comparison["wordsPerArm"] == 200000
assert comparison["groups"] == expected_groups and len(expected_groups) == 807

binding = load("performance-binding.json")
report = load("performance/report.json")
assert sha(evidence / "performance-one.mjs") == binding["runnerSha256"] == report["runnerSha256"]
assert sha(evidence / "measured-configuration.json") == binding["measuredConfigurationSha256"]
records = [load(f"performance/{i + 1:02d}-{variant}.json") for i, variant in enumerate(binding["order"])]
assert len(records) == 12
for variant, record in zip(binding["order"], records):
    assert record["variant"] == variant and record["sampleSize"] == 10000
    assert len(record["trials"]) == 3 and all(len(t["batches"]) == 5 for t in record["trials"])
    assert record["configuration"] == next(r["configuration"] for r in records if r["variant"] == variant)
    assert record["environment"] == records[0]["environment"]
    assert record["executableSha256"] == records[0]["executableSha256"]
    assert record["speedPass"] == (record["wordsPerSec"] >= record["floor"])
    assert record["variancePass"] == (record["medianVariance"] < record["varianceLimit"])
    if variant == "B":
        assert record["source"] == {name.removeprefix("src/"): pin for name, pin in sources.items()}
pairs = []
for i in range(0, 12, 2):
    pair = {r["variant"]: r for r in records[i:i + 2]}
    pairs.append((pair["B"]["wordsPerSec"] / pair["A"]["wordsPerSec"] - 1) * 100)
assert pairs == report["pairedPercentChanges"]
assert statistics.median(pairs) == report["medianPairedPercentChange"]
assert report["gates"] == {v: {g: sum(r[g] for r in records if r["variant"] == v) for g in ["speedPass", "variancePass"]} for v in ["A", "B"]}

residual = load("final-residual-population.json")
assert residual["wordsScanned"] == 200000 and residual["finalUnresolvedNuclei"] == 58
assert sum(g["count"] for g in residual["groups"]) == 58
assert sum(w["finalUnresolvedCount"] for w in residual["allAffectedTraceWitnesses"]) == 58
assert residual["manifestSha256"] == seal["manifestSha256"]
assert len(residual["allAffectedTraceWitnesses"]) == residual["affectedWords"] == 58
print(json.dumps({"packetArtifacts": len(listed), "sourceFiles": len(sources), "words": 200000, "integerComparisons": 3800019, "unresolvedTargets": 58, "scope": "Packet/source and full report arithmetic checks; no fresh raw replay, human benefit, or acceptance claim."}))
