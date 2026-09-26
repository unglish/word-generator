"""Compare every formal TypeScript counter with independent archive recounts."""
import hashlib
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("q09ind", "/private/tmp/q09-independent-patterns.py")
ind = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ind)


def read(path):
    data = Path(path).read_bytes()
    return ind.strict_load(data), hashlib.sha256(data).hexdigest()


def leaves(value):
    return sum(leaves(v) for v in value.values()) if isinstance(value, dict) else 1


freeze, freeze_hash = read("/private/tmp/q09-independent-recount-freeze-v1.json")
for file in freeze["files"]:
    ind.exact(hashlib.sha256(Path(file["path"]).read_bytes()).hexdigest(), file["sha256"], "Frozen independent source or development witness changed")
report, report_hash = read("/private/tmp/q09-observer-formal.json")
observer = "40c7068d486e04533cc3fd700e41debb5852223d0d05ee18f75c5d3bf98c1dba"
ind.exact(report["evaluatorDigest"], observer, "Expected corrected observer")
ind.exact(ind.content_digest(report["evaluatorSources"]), observer, "Archived observer source bytes")
ind.exact([report["completeWordAndLegacyTraceParity"], report["eventReplayComplete"]], [True, True], "Completed formal comparison")
ind.exact(len(report["streams"]), 20, "Full stream schedule")
proof = {"schemaVersion": 1, "freezeSha256": freeze_hash, "typeScriptReportSha256": report_hash,
         "typeScriptObserverDigest": observer, "scope": "All descriptive counts, ordered event replay and prior-origin/snapshot/final-Word binding; primary OT-law not independently recomputed", "modes": {}}
for mode in ["control", "candidate"]:
    independent, independent_hash = read(f"/private/tmp/q09-independent-{mode}-v1.json")
    pin = freeze["inputs"][mode]
    ind.exact(independent["toolSha256"], freeze["files"][0]["sha256"], "Executed frozen independent verifier")
    ind.exact(independent["mode"], mode, "Expected observation mode")
    ind.exact(independent["manifestFileSha256"], pin["manifestSha256"], "Independent manifest pin")
    ind.exact(independent["generatorDigest"], pin["sourceDigest"], "Independent source pin")
    ind.exact(report[mode]["sourceDigest"], pin["sourceDigest"], "TypeScript source pin")
    ind.exact(report[mode]["manifestDigest"], independent["manifestDigest"], "Same archive envelope")
    totals = ind.empty_observation()
    profiles, streams, strata = {}, {}, {}
    for stream in report["streams"]:
        key = f"{stream['profile']}:{stream['seed']}"
        ind.require(key not in streams, "Repeated formal stream")
        counts = stream["observations"][mode]
        streams[key] = counts
        strata[key] = {name: counts[mode] for name, counts in stream["strata"].items()}
        ind.merge(totals, counts)
        ind.merge(profiles.setdefault(stream["profile"], ind.empty_observation()), counts)
    expected = {"totals": totals, "profiles": profiles, "streams": streams, "strata": strata}
    ind.exact({key: independent[key] for key in expected}, expected, "Every aggregate/profile/stream/stratum counter")
    ind.exact(totals["words"], 200000, "All scheduled records recounted")
    proof["modes"][mode] = {"independentReportSha256": independent_hash, "words": totals["words"],
        "streams": len(streams), "profiles": len(profiles), "streamStrata": sum(map(len, strata.values())),
        "comparedIntegerLeaves": leaves(expected), "allCountersEqual": True, "assignmentEvents": totals["assignmentEvents"]}
ind.exact(read("/private/tmp/q09-observer-formal.json")[1], report_hash, "Formal report changed during comparison")
proof["comparisonScriptSha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
destination = Path("/private/tmp/q09-independent-comparison-v1.json")
with destination.open("x") as handle:
    json.dump(proof, handle, indent=2)
    handle.write("\n")
print(json.dumps(proof, indent=2))
