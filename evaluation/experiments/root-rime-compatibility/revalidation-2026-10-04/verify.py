import argparse
import gzip
import hashlib
import json
from pathlib import Path

if not __debug__:
    raise RuntimeError("Assertions required")
parser = argparse.ArgumentParser()
parser.add_argument("--repository-root", type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent
index = json.loads((root / "index.json").read_bytes())
for r in index["records"]:
    p = Path(r["path"])
    assert not p.is_absolute() and ".." not in p.parts
    b = (root / p).read_bytes()
    assert len(b) == r["bytes"] and hashlib.sha256(b).hexdigest() == r["sha256"]
experiment = args.repository_root / "evaluation/experiments/root-rime-compatibility"
source = json.loads(gzip.decompress((experiment / "candidate/sources.json.gz").read_bytes()))
assert len(source["generator"]) == 45
for r in source["generator"]:
    assert (args.repository_root / r["path"]).read_text() == r["content"]
for arm in ["original", "control", "candidate"]:
    result = json.loads((root / (arm + "-independent-renewed.json")).read_bytes())
    assert result == json.loads((experiment / (arm + "-independent.json")).read_bytes())
    assert result["verifiedWords"] == 200000
    report = gzip.decompress((experiment / (arm + "-observation.json.gz")).read_bytes())
    assert result["reportSha256"] == hashlib.sha256(report).hexdigest()
for arm in ["control", "candidate"]:
    manifest = json.loads((experiment / arm / "manifest.json").read_bytes())["manifest"]
    expected = {r["file"]: r for r in manifest["artifacts"] if r["file"].startswith("words/")}
    complete = json.loads((root / (arm + "-complete.json")).read_bytes())
    assert complete["passed"] and complete["words"] == 200000 and complete["allOriginalCompressedHashesMatch"]
    assert len(complete["streams"]) == len(expected) == 20
    assert {r["file"] for r in complete["streams"]} == set(expected)
    for r in complete["streams"]:
        assert r["matchesOriginalCompressedBytes"]
        assert all(r[k] == expected[r["file"]][k] for k in ["bytes", "sha256"])
assert json.loads((root / "conditional-parity-renewed.json").read_bytes()) == json.loads((experiment / "conditional-parity.json").read_bytes())
print(json.dumps({"passed": True, "artifacts": len(index["records"]), "runtimeFiles": 45, "originalShardReceipts": 40, "independentWords": 600000, "conditionalParityWords": 20000, "scope": "Compact integrity and original source/result correspondence; not a fresh raw recount or human-quality proof."}))
