"""Synthetic/forged evidence only; no candidate sampler, random tape or frequency outcome."""
import copy
from fractions import Fraction as F
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("frequency_verifier", HERE / "verify-frequency.py")
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)


def sample(first, uniform):
    return {"marks": [v.ref.P, v.ref.U], "selectedComponentIndex": int(not first), "componentDraws": [
        {"candidateIndex": 0, "remainingFromIndex": 1, "logCandidateMass": -1, "logRemainingMass": -1,
         "uniform": uniform, "drawOrdinal": 0, "takeCandidate": first}], "backward": []}


def synthetic():
    protocol = {"cases": [{"id": "toy", "n": 2, "primary": 0, "K": 0}],
        "tapes": {"blocksPerCase": 2, "rowsPerBlock": 2, "uint32PerRow": 15, "bytes": 240}, "samplerCalls": 4,
        "maskComparisons": {"M": 6}, "frequency": {"alpha": .01}}
    tree = {"root": 0, "nodes": [{"kind": "branch", "boundary": v.ref.GRID // 2, "first": 1, "second": 2},
        {"kind": "leaf", "sample": sample(True, 0), "consumed": 1},
        {"kind": "leaf", "sample": sample(False, .5), "consumed": 1}]}
    tape = b"".join(struct.pack("<15I", *([value] * 15)) for value in [0, v.ref.GRID // 2, 1, v.ref.GRID - 1])
    bindings = {"test": "synthetic"}
    records = [{"kind": "header", "version": "q09-sampler-frequency-archive-v1", **bindings}]
    for sequence in range(4):
        value = struct.unpack_from("<I", tape, sequence * 60)[0]
        records.append({"kind": "draw", "caseId": "toy", "caseIndex": 0, "block": sequence // 2, "row": sequence % 2,
            "sequence": sequence, "tapeByteOffset": sequence * 60, "sample": sample(value < v.ref.GRID // 2, value / v.ref.GRID), "consumed": 1})
    records.append({"kind": "footer", "primaryFrequencyDraws": 4, "blocks": 2, "supplementarySamplerCalls": 0})
    return protocol, tree, tape, bindings, records


def encode(records):
    return iter((json.dumps(value, separators=(",", ":")) + "\n").encode() for value in records)


class FrequencyVerifierTests(unittest.TestCase):
    def test_exact_synthetic_recount_zero_bins_hashes_first_witnesses(self):
        p, tree, tape, bindings, records = synthetic()
        result = v.recount(encode(records), p, tape, bindings, [tree])
        self.assertEqual(result["primaryFrequencyDraws"], 4)
        self.assertEqual(result["cases"][0]["counts"], {"0": 4, "2": 0})
        self.assertEqual([b["consumedCells"] for b in result["blocks"]], [2, 2])
        self.assertEqual([b["unusedCells"] for b in result["blocks"]], [28, 28])
        witnesses = result["cases"][0]["witnesses"]
        self.assertEqual([w["sequence"] for w in witnesses], [0, 0, 0, 1, 1])
        checks, coverage = v.frequency_checks(p, result, [{"0": F(1)}])
        self.assertEqual(len(checks), 6)
        self.assertTrue(all(check["passed"] for check in checks))
        self.assertEqual(coverage[0]["unobservedPositiveNumericMasks"], [])

    def test_forged_schedule_boolean_coordinates_missing_extra_reordered_records(self):
        p, tree, tape, bindings, records = synthetic()
        for mutate in [lambda r: r.pop(2), lambda r: r.append(r[-1]), lambda r: r.insert(2, r[1]),
                       lambda r: r.__setitem__(slice(1, 3), list(reversed(r[1:3]))),
                       lambda r: r[1].update(sequence=True), lambda r: r[1].update(tapeByteOffset=60),
                       lambda r: r[1].update(caseIndex=False), lambda r: r[1].update(row=1),
                       lambda r: r[1].update(extra="unregistered")]:
            changed = copy.deepcopy(records)
            mutate(changed)
            with self.assertRaises((ValueError, StopIteration)):
                v.recount(encode(changed), p, tape, bindings, [tree])

    def test_branch_boundary_exact_and_forged_full_transcript(self):
        _, tree, _, _, _ = synthetic()
        for value in [0, v.ref.GRID // 2 - 1, v.ref.GRID // 2, v.ref.GRID - 1]:
            observation = {"sample": sample(value < v.ref.GRID // 2, value / v.ref.GRID), "consumed": 1}
            v.verify_draw(tree, observation, [value] * 15)
        for mutate in [lambda x: x["sample"]["componentDraws"][0].update(takeCandidate=False),
                       lambda x: x["sample"]["componentDraws"][0].update(uniform=.5),
                       lambda x: x["sample"]["componentDraws"][0].update(drawOrdinal=False),
                       lambda x: x["sample"]["componentDraws"][0].update(logCandidateMass=-2),
                       lambda x: x["sample"].update(selectedComponentIndex=True),
                       lambda x: x.update(consumed=True),
                       lambda x: x["sample"]["marks"].reverse()]:
            observation = {"sample": sample(True, 0), "consumed": 1}
            mutate(observation)
            with self.assertRaises(ValueError):
                v.verify_draw(tree, observation, [0] * 15)

    def test_zero_support_violation_fails_even_with_large_statistical_tolerance(self):
        p, tree, tape, bindings, records = synthetic()
        result = v.recount(encode(records), p, tape, bindings, [tree])
        checks, _ = v.frequency_checks(p, result, [{"2": F(1)}])
        self.assertFalse(all(check["passed"] for check in checks))
        self.assertTrue(any(check["count"] and check["target"]["probability"] == 0 and not check["passed"] for check in checks))

    def test_large_fixed_count_failure_is_retained_and_all_masks_counted(self):
        p, _, _, _, _ = synthetic()
        p["maskComparisons"]["M"] = 4
        result = {"blocks": [{"caseId": "toy", "block": 0, "rows": 20000, "counts": {"0": 20000, "2": 0}}],
            "cases": [{"id": "toy", "rows": 20000, "counts": {"0": 20000, "2": 0}}]}
        checks, coverage = v.frequency_checks(p, result, [{"0": F(1, 2), "2": F(1, 2)}])
        self.assertEqual(len(checks), 4)
        self.assertFalse(any(check["passed"] for check in checks))
        self.assertEqual(coverage[0]["unobservedPositiveNumericMasks"], ["2"])
        self.assertEqual({check["N"] for check in checks}, {20000})
        result = {"passed": all(check["passed"] for check in checks), "comparisons": checks}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "failed-synthetic-report.json"
            v.publish_report(path, result)
            self.assertIs(json.loads(path.read_bytes())["passed"], False)
            self.assertEqual(len(json.loads(path.read_bytes())["comparisons"]), 4)
            with self.assertRaises(FileExistsError):
                v.publish_report(path, {"passed": True})
            self.assertIs(json.loads(path.read_bytes())["passed"], False)

    def test_exact_tape_manifest_and_forged_raw_bytes(self):
        p, _, tape, bindings, _ = synthetic()
        segments = [{**value, "sha256": v.proof.sha(tape[value["byteOffset"]:value["byteOffset"] + value["byteLength"]])} for value in v.schedule(p)]
        manifest = {"version": "q09-sampler-tape-v1", **bindings, "byteLength": len(tape), "sha256": v.proof.sha(tape),
            "encoding": "uint32-little-endian", "uint32PerRow": 15, "primaryFrequencyDraws": 4, "segments": segments,
            "source": "Fresh OS random bytes; independent-uniform-input assumption is not empirically certified"}
        v.verify_tape(p, tape, manifest, bindings)
        for mutate in [lambda x: x["segments"].reverse(), lambda x: x["segments"][0].update(rows=True),
                       lambda x: x.update(sha256="0" * 64), lambda x: x.update(extra=True)]:
            changed = copy.deepcopy(manifest)
            mutate(changed)
            with self.assertRaises(ValueError):
                v.verify_tape(p, tape, changed, bindings)
        with self.assertRaises(ValueError):
            v.verify_tape(p, bytes([tape[0] ^ 1]) + tape[1:], manifest, bindings)
        # This cell is unused by every synthetic one-draw call, but its bytes remain pinned.
        with self.assertRaises(ValueError):
            v.verify_tape(p, tape[:-1] + bytes([tape[-1] ^ 1]), manifest, bindings)

    def test_forged_recount_summary_and_witness_are_not_trusted(self):
        p, tree, tape, bindings, records = synthetic()
        result = v.recount(encode(records), p, tape, bindings, [tree])
        for mutate in [lambda x: x["cases"][0]["counts"].update({"0": 3, "2": 1}),
                       lambda x: x["blocks"][0].update(transcriptSha256="0" * 64),
                       lambda x: x["cases"][0]["witnesses"][0].update(sequence=2),
                       lambda x: x["blocks"][0].update(unusedCells=27),
                       lambda x: x.update(primaryFrequencyDraws=True)]:
            changed = copy.deepcopy(result)
            mutate(changed)
            with self.assertRaises(ValueError):
                v.exact_json(changed, result, "complete capture recount")

    def test_strict_json_fraction_and_boolean_schema(self):
        for invalid in [b'{"a":1,"a":2}', b'{"a":NaN}', b'{"a":Infinity}']:
            with self.assertRaises(ValueError):
                v.proof.strict_json(invalid)
        for value in [True, False]:
            with self.assertRaises(ValueError):
                v.exact_json(value, int(value), "coordinate")
        self.assertEqual(v.rational({"numerator": "1", "denominator": "2", "probability": .5}), F(1, 2))
        for value in [{"numerator": "2", "denominator": "4", "probability": .5},
                      {"numerator": "1", "denominator": "2", "probability": True},
                      {"numerator": "1", "denominator": "2", "probability": .4}]:
            with self.assertRaises(ValueError):
                v.rational(value)


if __name__ == "__main__":
    unittest.main()
