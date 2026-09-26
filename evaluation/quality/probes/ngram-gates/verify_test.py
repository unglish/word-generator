"""Small hand-accounted archives exercise integrity checks before the real study."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from verify import verify


def data(value):
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode()


def artifact(directory, name):
    content = (directory / name).read_bytes()
    return {"file": name, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}


def fixture(directory):
    protocol = {"id": "fixture", "replicates": 2, "wordsPerReplicate": 2, "controlSeed": 42, "generatorCommit": "fixture"}
    thresholds = {"sampleSize": 2, "minBigramBaselineFreq": .001, "minTrigramBaselineFreq": .0005,
                  "maxBigramOverRepresentation": 4.25, "maxTrigramOverRepresentation": 3.21,
                  "minBigramRepresentation": .0215, "minTrigramRepresentation": .0062}
    content = {"evaluation/quality/probes/ngram-gates/protocol.json": json.dumps(protocol),
               "evaluation/quality/probes/ngram-gates/verify.py": Path(__file__).with_name("verify.py").read_text(),
               "src/config/ngram-thresholds.json": json.dumps(thresholds),
               "data/cmu/cmu-lexicon-bigrams.json": json.dumps({"aa": 10, "bb": 10}),
               "data/cmu/cmu-lexicon-trigrams.json": json.dumps({"aaa": 10, "bbb": 10})}
    source_bytes = data([{"path": path, "content": value} for path, value in content.items()])
    (directory / "sources.json.gz").write_bytes(gzip.compress(source_bytes, mtime=0))
    period, increment = 2 ** 32, 0x6D2B79F5
    anchor = int.from_bytes(hashlib.sha256(b"fixture").digest()[:4], "big")
    schedule = [{"id": "control", "seed": 42, "phase": None, "capacity": period},
                {"id": "study-01", "seed": anchor, "phase": 0, "capacity": period // 2},
                {"id": "study-02", "seed": (anchor + increment * (period // 2)) % period,
                 "phase": period // 2, "capacity": period // 2}]
    (directory / "protocol.json").write_bytes(data({"protocol": protocol, "schedule": schedule}))
    gates = {}
    for label, gram, total in [("bigram", "aa", 6), ("trigram", "aaa", 4)]:
        for direction in ["over", "under"]:
            name = f"{label}{direction.capitalize()}"
            threshold_key = f"max{label.capitalize()}OverRepresentation" if direction == "over" else f"min{label.capitalize()}Representation"
            gates[name] = {"ngram": gram, "generatedCount": total // 2, "referenceCount": 10,
                           "ratio": 1., "generatedTotal": total, "referenceTotal": 20,
                           "cutoff": .001 if direction == "over" else thresholds[f"min{label.capitalize()}BaselineFreq"],
                           "threshold": thresholds[threshold_key], "direction": direction, "failed": False}
    replicates = []
    # Call 21 from the public createSeededRng API, independently recorded for this fixture.
    next_values = {"control": 0.8373374259099364, "study-01": 0.46682732040062547, "study-02": 0.5687156091444194}
    for entry in schedule:
        written_name = f"{entry['id']}-written.jsonl.gz"
        trace_name = f"{entry['id']}-traces.jsonl.gz"
        (directory / written_name).write_bytes(gzip.compress(b'{"draw":0,"written":"aaaa"}\n{"draw":1,"written":"bbbb"}\n', mtime=0))
        traces = [{"draw": i, "wordSeed": (entry["seed"] + increment * i * 10) % period,
                   "startCalls": i * 10, "calls": 10, "grams": [char * 2, char * 3],
                   "word": {"written": {"clean": char * 4}, "trace": {"stages": []}}} for i, char in enumerate(("a", "b"))]
        (directory / trace_name).write_bytes(gzip.compress(b"\n".join(data(trace) for trace in traces) + b"\n", mtime=0))
        replicate = {**entry, "words": 2, "rngCalls": 20, "consumedStatesIncludingNextValue": 21, "nextRng": next_values[entry["id"]],
                     "traceWords": 2, "witnesses": {"aa": [0], "aaa": [0], "bb": [1], "bbb": [1]},
                     "bigrams": {"aa": 3, "bb": 3}, "trigrams": {"aaa": 2, "bbb": 2},
                     "bigramTotal": 6, "trigramTotal": 4, "gates": copy.deepcopy(gates),
                     "artifacts": [artifact(directory, written_name), artifact(directory, trace_name)]}
        (directory / f"{entry['id']}.json").write_bytes(data(replicate))
        replicates.append(replicate)
    report = {"protocol": protocol, "schedule": schedule, "generatorCommit": "fixture",
              "sourceDigest": hashlib.sha256(source_bytes).hexdigest(), "replicates": replicates,
              "failureCounts": {name: 0 for name in gates}, "anyGateFailures": 0,
              "artifacts": [artifact(directory, path.name) for path in sorted(directory.iterdir())]}
    (directory / "report.json").write_bytes(data(report))
    return report


class ArchiveChecks(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.directory = Path(self.temporary.name)
        self.report = fixture(self.directory)

    def tearDown(self):
        self.temporary.cleanup()

    def save_report(self):
        (self.directory / "report.json").write_bytes(data(self.report))

    def repin(self, name):
        self.report["artifacts"] = [artifact(self.directory, name) if item["file"] == name else item for item in self.report["artifacts"]]

    def test_valid(self):
        self.assertEqual(verify(self.directory)["anyGateFailures"], 0)

    def test_missing_extra_corrupt(self):
        for kind in ["missing", "extra", "corrupt"]:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as temporary:
                directory = Path(temporary)
                fixture(directory)
                if kind == "missing":
                    (directory / "study-01.json").unlink()
                elif kind == "extra":
                    (directory / "extra.json").write_text("{}")
                else:
                    (directory / "study-01.json").write_text("{}")
                with self.assertRaises(AssertionError):
                    verify(directory)

    def test_reordered_rehashed_draws(self):
        name = "study-01-written.jsonl.gz"
        rows = gzip.decompress((self.directory / name).read_bytes()).splitlines()
        (self.directory / name).write_bytes(gzip.compress(b"\n".join(reversed(rows)) + b"\n", mtime=0))
        self.repin(name)
        self.report["replicates"][1]["artifacts"][0] = artifact(self.directory, name)
        (self.directory / "study-01.json").write_bytes(data(self.report["replicates"][1]))
        self.repin("study-01.json")
        self.save_report()
        with self.assertRaises(AssertionError):
            verify(self.directory)

    def test_forged_gate_or_stream_certificate(self):
        for mutation in ["gate", "capacity", "next-value", "failure-count"]:
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temporary:
                directory = Path(temporary)
                report = fixture(directory)
                if mutation == "failure-count":
                    report["anyGateFailures"] = 1
                else:
                    replicate = report["replicates"][1]
                    if mutation == "gate":
                        replicate["gates"]["trigramUnder"]["ratio"] = .5
                    elif mutation == "next-value":
                        replicate["nextRng"] = .5
                    else:
                        replicate["rngCalls"] = replicate["capacity"]
                        replicate["consumedStatesIncludingNextValue"] = replicate["capacity"] + 1
                    name = "study-01.json"
                    (directory / name).write_bytes(data(replicate))
                    report["artifacts"] = [artifact(directory, name) if item["file"] == name else item for item in report["artifacts"]]
                (directory / "report.json").write_bytes(data(report))
                with self.assertRaises(AssertionError):
                    verify(directory)


if __name__ == "__main__":
    unittest.main()
