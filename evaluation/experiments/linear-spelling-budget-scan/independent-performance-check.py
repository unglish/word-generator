"""Independent extraction of all fixed-series timing results from raw logs."""
import hashlib
import json
from pathlib import Path
import re
from statistics import median

root = Path("/private/tmp/q13-budget-performance-series-1")
report_bytes = (root / "report.json").read_bytes()
report = json.loads(report_bytes)
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha((root / "inputs.json").read_bytes()) == report["inputsSha256"]
assert json.loads((root / "inputs.json").read_bytes()) == report["inputs"]
expected_order = [["A", "B"], ["B", "A"]] * 3
assert report["inputs"]["order"] == expected_order
assert report["inputs"]["CI"] is None
assert report["inputs"]["runtimeDigests"] == {"A": "f0a9da1fa95cb7f0d8901b82567d94f1b565a36a83c58d404f7c8b0528a79666", "B": "3dfffb12c5f595507276983f0eae78fedf010726c928ed69cd182db987c3da5b"}
assert len(report["runs"]) == 12
pairs, values, floors, variances = {}, {"A": [], "B": []}, {"A": 0, "B": 0}, {"A": 0, "B": 0}
last_end = None
for ordinal, run in enumerate(report["runs"]):
    pair, position = ordinal // 2 + 1, ordinal % 2 + 1
    version = expected_order[pair - 1][position - 1]
    assert (run["pair"], run["position"], run["version"]) == (pair, position, version)
    data = (root / run["log"]).read_bytes()
    assert sha(data) == run["logSha256"]
    text = data.decode()
    matches = re.findall(r"Performance: (\d+) words/sec \(10000 words in (\d+)ms\)", text)
    assert len(matches) == 1
    speed, milliseconds = map(int, matches[0])
    variance_matches = re.findall(r"Batch variance trials: ([0-9., x]+) \(median ([0-9.]+)x\)", text)
    assert len(variance_matches) == 1
    trials, variance = variance_matches[0]
    assert (speed, milliseconds, trials, float(variance)) == (run["reportedWordsPerSecond"], run["reportedBatchMilliseconds"], run["reportedVarianceTrials"], run["reportedMedianVariance"])
    assert "Floor: 4500 words/sec" in text and "Median variance threshold: < 3.0x" in text
    floor_pass = bool(re.search(r"✓ .*should generate at least 4500 words/sec", text))
    variance_pass = bool(re.search(r"✓ .*should not degrade significantly with sequential seeds", text))
    assert (floor_pass, variance_pass) == (run["floorGatePassed"], run["varianceGatePassed"])
    assert run["exitCode"] == (0 if floor_pass and variance_pass else 1)
    assert run["endedAt"] > run["startedAt"]
    assert last_end is None or run["startedAt"] >= last_end
    last_end = run["endedAt"]
    pairs.setdefault(pair, {})[version] = speed
    values[version].append(speed)
    floors[version] += floor_pass
    variances[version] += variance_pass
ratios = [pair["B"] / pair["A"] for pair in pairs.values()]
assert ratios == [p["BoverA"] for p in report["pairs"]]
assert median(ratios) == report["medianPairedThroughputRatio"]
assert [min(ratios), max(ratios)] == report["pairedRatioRange"]
assert {key: median(value) for key, value in values.items()} == report["versionMedians"]
assert floors == report["floorPasses"] and variances == report["variancePasses"]
assert sum(ratio > 1 for ratio in ratios) == report["positivePairs"] == 6
assert report["registeredLocalImprovementCriterionMet"] == (median(ratios) > 1 and sum(ratio > 1 for ratio in ratios) >= 5)
proof = {"schemaVersion": 1, "allTwelveRawLogsVerified": True, "predeclaredOrderPreserved": True,
         "reportSha256": sha(report_bytes), "medianPairedThroughputGainPercent": 100 * (median(ratios) - 1),
         "pairedRatios": ratios, "floorPasses": floors, "variancePasses": variances,
         "scope": "Independent raw-log extraction and arithmetic; rounded throughput, one local series, no general speed or naturalness claim",
         "scriptSha256": sha(Path(__file__).read_bytes())}
with Path("/private/tmp/q13-budget-parent-performance-check.json").open("x") as handle:
    json.dump(proof, handle, indent=2)
    handle.write("\n")
print(json.dumps(proof, indent=2))
