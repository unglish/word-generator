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
experiment = args.repository_root / "evaluation/experiments/legal-coda-extensions"
source = json.loads(gzip.decompress((experiment / "sources.json.gz").read_bytes()))
assert len(source["generator"]) == 43
for r in source["generator"]:
    assert (args.repository_root / r["path"]).read_text() == r["content"]
manifest = json.loads((experiment / "manifest.json").read_bytes())["manifest"]
expected = {r["file"]: r for r in manifest["artifacts"] if r["file"].startswith("words/")}
complete = json.loads((root / "public-complete.json").read_bytes())
assert complete["passed"] and complete["words"] == 200000 and complete["allOriginalCompressedHashesMatch"]
assert len(complete["streams"]) == len(expected) == 20
assert {r["file"] for r in complete["streams"]} == set(expected)
for r in complete["streams"]:
    assert r["matchesOriginalCompressedBytes"]
    assert all(r[k] == expected[r["file"]][k] for k in ["bytes", "sha256"])
old = json.loads(gzip.decompress((experiment / "coda-extension-probe.json.gz").read_bytes()))
new = json.loads(gzip.decompress((root / "probe-renewed.json.gz").read_bytes()))
for arm in ["baseline", "candidate"]:
    new[arm]["directory"] = old[arm]["directory"]
assert new == old
assert all(new[a]["total"]["counts"]["words"] == 200000 for a in ["baseline", "candidate"])
print(json.dumps({"passed": True, "artifacts": len(index["records"]), "runtimeFiles": 43, "originalShardReceipts": 20, "probeWords": 400000, "scope": "Compact integrity/original result correspondence. No fresh raw probe, independent oracle or human-quality claim."}))
