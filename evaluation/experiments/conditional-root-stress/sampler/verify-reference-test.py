"""Prerequisite envelope/tree forgeries using hand-derived data, not sampler output."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("reference_verifier", HERE / "verify-reference.py")
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)
F = v.F


def bindings():
    protocol = json.loads((HERE / "protocol.json").read_bytes())
    engine = {"node": "synthetic", "versions": {}, "platform": "test", "architecture": "test", "executableSha256": "e" * 64}
    raw = {"version": "q09-sampler-numeric-tree-v1", "sourceFreezeSha256": "f" * 64,
        "protocolSha256": v.PROTOCOL_SHA, "engine": engine, "cases": [None] * 6, "scope": "synthetic"}
    replay = {"version": "q09-sampler-node-replay-v1", "passed": True, "archiveSha256": "a" * 64,
        "sourceFreezeSha256": "f" * 64, "protocolSha256": v.PROTOCOL_SHA, "engine": copy.deepcopy(engine), "cases": [None] * 6, "scope": "synthetic"}
    return protocol, raw, replay


def no_draw_tree():
    # Hand proof: n=2, primary0, both secondary mechanisms off, K=0. Only PU has mass1.
    case = v.ref.oracle.configuration(2, 0, "first-three", True, False, False, 0, 0, [1, 1], "all")
    model = v.ref.HistoryReference(case, 0)
    work = {"componentPasses": 1, "positions": 2, "statesVisited": 2, "transitionsConsidered": 4, "allocatedCells": 4, "peakRetainedCells": 4}
    sample_work = {"componentPasses": 2, "positions": 4, "statesVisited": 4, "transitionsConsidered": 8, "allocatedCells": 10, "peakRetainedCells": 6}
    one = {"status": "finite", "value": 0}
    sample = {"marks": [v.ref.P, v.ref.U], "count": {"secondaryCount": 0, "logPartition": one,
        "components": [{"component": {"kind": "no-explicit-mark"}, "prior": one, "tiltedMassAtK": one}], "work": work},
        "selectedComponentIndex": 0, "componentTermination": "only-positive", "componentDraws": [],
        "backward": [{"kind": "forced", "syllableIndex": 1, "previousMarked": True, "remainingSecondaryCount": 0},
                     {"kind": "forced", "syllableIndex": 0, "previousMarked": False, "remainingSecondaryCount": 0}],
        "selectedPatternPriorLogMass": 0, "selectedPatternConditionalLogMass": 0, "work": sample_work}
    return model, {"root": 0, "nodes": [{"kind": "leaf", "prefix": [], "sample": sample, "consumed": 0}], "apiCalls": 1}


class PrerequisiteTests(unittest.TestCase):
    def test_explicit_archive_source_protocol_and_engine_bindings(self):
        p, raw, replay = bindings()
        v.verify_bindings(raw, replay, "a" * 64, "f" * 64, p)
        for mutate in [lambda r: r.update(passed=1), lambda r: r.update(archiveSha256="0" * 64),
                       lambda r: r.update(sourceFreezeSha256="0" * 64), lambda r: r.update(protocolSha256="0" * 64),
                       lambda r: r["engine"].update(executableSha256="0" * 64), lambda r: r["engine"].update(node="other"),
                       lambda r: r["cases"].pop(), lambda r: r.update(extra=True)]:
            changed = copy.deepcopy(replay)
            mutate(changed)
            with self.assertRaises(ValueError):
                v.verify_bindings(raw, changed, "a" * 64, "f" * 64, p)

    def test_missing_or_malformed_executable_hash_is_rejected_even_if_both_sides_agree(self):
        p, raw, replay = bindings()
        for digest in [None, "e" * 63, "G" * 64, True]:
            first, second = copy.deepcopy(raw), copy.deepcopy(replay)
            first["engine"]["executableSha256"] = second["engine"]["executableSha256"] = digest
            with self.assertRaises(ValueError):
                v.verify_bindings(first, second, "a" * 64, "f" * 64, p)

    def test_hand_derived_zero_draw_leaf_is_exact_and_tree_forgeries_fail(self):
        model, tree = no_draw_tree()
        self.assertEqual(v.ref.verify_numeric_tree(model, tree), {(v.ref.P, v.ref.U): F(1)})
        for mutate in [lambda x: x.update(root=False), lambda x: x.update(apiCalls=True),
                       lambda x: x["nodes"].append(copy.deepcopy(x["nodes"][0])),
                       lambda x: x["nodes"][0].update(prefix=[0]), lambda x: x["nodes"][0].update(consumed=True),
                       lambda x: x["nodes"][0]["sample"]["marks"].reverse(),
                       lambda x: x["nodes"][0]["sample"]["backward"][0].update(previousMarked=False),
                       lambda x: x["nodes"][0]["sample"]["count"].update(secondaryCount=False)]:
            changed = copy.deepcopy(tree)
            mutate(changed)
            with self.assertRaises(ValueError):
                v.ref.verify_numeric_tree(model, changed)

    def test_strict_json_duplicate_nonfinite_and_exact_support(self):
        for data in [b'{"id":1,"id":2}', b'{"value":NaN}', b'{"value":-Infinity}']:
            with self.assertRaises(ValueError):
                v.strict_json(data)
        self.assertEqual(v.tv({"a": F(1)}, {"b": F(1)}), F(1))
        self.assertEqual(v.tv({"a": F(1)}, {"a": F(1)}), F())


if __name__ == "__main__":
    unittest.main()
