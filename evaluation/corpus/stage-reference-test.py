"""Independent constraints and negative cases for the Phase 2 stage builder."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import unittest

spec = spec_from_file_location("stage_reference", Path(__file__).with_name("stage-reference.py"))
stage = module_from_spec(spec)
spec.loader.exec_module(stage)


class StageReferenceTest(unittest.TestCase):
    def setUp(self):
        self.measured = {root: count for root, count in enumerate([20, 30, 20, 10, 10, 5, 3, 2], 1)}
        self.counts = {str(root): {str(root): 100} for root in self.measured}
        self.counts["1"] = {"1": 75, "2": 25}
        self.counts["3"] = {"3": 50, "4": 50}
        self.counts["7"] = {"7": 75, "8": 25}
        self.transitions = stage.validate_transitions(self.counts, self.measured)

    def test_exact_surface_fit_and_minimum_kl_tail(self):
        target = {1: 0.15, 2: 0.30, 3: 0.10, 4: 0.18, 5: 0.10, 6: 0.17}
        expected = {1: 0.2, 2: 0.25, 3: 0.2, 4: 0.08, 5: 0.10, 6: 0.085, 7: 0.051, 8: 0.034}
        actual = stage.target_root_weights(self.measured, self.transitions, target)
        for root, mass in expected.items():
            self.assertAlmostEqual(actual[root], mass)

    def test_transition_provenance_and_count_digest(self):
        from hashlib import sha256
        import json

        def digest(counts):
            return sha256(json.dumps(counts, sort_keys=True).encode()).hexdigest()

        counts = {str(root): {str(root): 30_000} for root in self.measured}
        artifact = {
            "counts": counts, "countsDigest": digest(counts), "sampleSize": 30_000,
            "seedBase": 491004, "generatorRevision": "a" * 40, "generatorSourceTree": "b" * 40,
        }
        self.assertEqual(stage.check_transition_artifact(artifact, digest), counts)
        with self.assertRaisesRegex(ValueError, "digest mismatch"):
            stage.check_transition_artifact({**artifact, "countsDigest": "z" * 64}, digest)
        with self.assertRaisesRegex(ValueError, "generatorRevision"):
            stage.check_transition_artifact({**artifact, "generatorRevision": "HEAD"}, digest)

    def test_missing_tail_row_fails(self):
        del self.counts["8"]
        with self.assertRaisesRegex(ValueError, "exactly the measured root lengths"):
            stage.validate_transitions(self.counts, self.measured)

    def test_invalid_transition_fails(self):
        for row in [{"6": 100}, {"7": -2}, {"7": 2.5}, {}]:
            with self.subTest(row=row):
                self.counts["7"] = row
                with self.assertRaises(ValueError):
                    stage.validate_transitions(self.counts, self.measured)

    def test_infeasible_target_fails(self):
        with self.assertRaisesRegex(ValueError, "infeasible"):
            stage.target_root_weights(self.measured, self.transitions, {
                1: 0.45, 2: 0.05, 3: 0.10, 4: 0.15, 5: 0.10, 6: 0.15,
            })


if __name__ == "__main__":
    unittest.main()
