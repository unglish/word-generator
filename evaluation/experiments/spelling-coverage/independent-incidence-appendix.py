"""Independently count four per-word indicators, preserving unavailable history."""
import gzip
import hashlib
import io
import json
import sys
from collections import Counter
from pathlib import Path

KEYS = ["wordsWithOverBudgetEpisode", "wordsWithRespell", "wordsWithInfeasibleBudget", "wordsWithSearchBudgetRefusal"]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    run, prior_path, output_path = map(Path, sys.argv[1:])
    prior = json.loads(prior_path.read_text())
    assert sha((run / "manifest.json").read_bytes()) == prior["manifestSha256"]
    manifest = json.loads((run / "manifest.json").read_text())["manifest"]
    artifact_hashes = {a["file"]: a["sha256"] for a in manifest["artifacts"]}
    total, profiles, replicates, strata = Counter(), {}, {}, {}
    available, unavailable = 0, 0
    for profile in manifest["protocol"]["profiles"]:
        profiles[profile["id"]] = Counter()
        for seed in profile["seeds"]["development"]:
            relative = f'words/{profile["id"]}-{seed}.jsonl.gz'
            compressed = (run / relative).read_bytes()
            assert sha(compressed) == artifact_hashes[relative]
            counts = Counter()
            count = 0
            for index, row in enumerate(gzip.GzipFile(fileobj=io.BytesIO(compressed))):
                count += 1
                draw = json.loads(row)
                assert (draw["profile"], draw["seed"], draw["drawIndex"]) == (profile["id"], seed, index)
                trace = draw["word"]["trace"]
                episodes = trace.get("spellingBudgets")
                if episodes is None:
                    unavailable += 1
                else:
                    available += 1
                flags = [
                    any(e["before"]["exceeded"] for e in episodes or []),
                    any(e["status"] == "respell" for e in episodes or []),
                    any(e["status"] == "infeasible" for e in episodes or []),
                    any(e["status"] == "infeasible" and e["reason"] == "search-budget" for e in episodes or []),
                ]
                increment = Counter({key: 1 for key, flag in zip(KEYS, flags) if flag})
                counts.update(increment)
                morphology = trace.get("morphology") or {}
                realized = morphology.get("realization")
                prefix, suffix = (bool((realized or morphology).get(k)) for k in ["prefix", "suffix"])
                label = "both" if prefix and suffix else "prefix" if prefix else "suffix" if suffix else "bare"
                if realized is None and (prefix or suffix):
                    label = "planned-only:" + label
                strata.setdefault(f'{profile["id"]}/{label}', Counter()).update(increment)
            assert count == 10000
            replicates[f'{profile["id"]}/{seed}'] = counts
            profiles[profile["id"]].update(counts)
            total.update(counts)
    result = {"result": "pass", "scope": "Unique-word indicators; missing historical episodes are unavailable", "priorReportSha256": sha(prior_path.read_bytes()), "manifestSha256": prior["manifestSha256"], "scriptSha256": sha(Path(__file__).read_bytes()), "availableWords": available, "unavailableWords": unavailable, "total": total, "profiles": profiles, "replicates": replicates, "strata": strata}
    assert available + unavailable == 200000
    with output_path.open("x") as output:
        json.dump(result, output, indent=2)
        output.write("\n")
    print(json.dumps({"availableWords": available, "unavailableWords": unavailable, "total": total}))


if __name__ == "__main__":
    main()
