"""Adversarial checks for the independent length-artifact verifier; no raw rebuild."""
import copy
import gzip
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[3]
SPEC = importlib.util.spec_from_file_location("length_verify", Path(__file__).with_name("verify.py"))
verify = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify)
joint = verify.load_joint(ROOT)


class LengthVerifierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # These fixtures exercise rejection against fixed expected tables. The
        # acceptance verifier separately derives every expected bin from raw text.
        cls.parent = joint.strict_json(gzip.decompress((ROOT / verify.PARENT_PATH).read_bytes()))["artifact"]
        cls.sources = joint.read_sources(ROOT, verify.source_paths(joint))
        cls.expected = verify.expected_artifact(joint, cls.parent, cls.sources)

    def envelope(self, artifact):
        return {"digest": joint.digest(artifact), "artifact": artifact}

    def reject(self, artifact):
        with self.assertRaises(ValueError):
            joint.validate(self.envelope(artifact), self.expected)

    def test_exact_tables_accepted(self):
        joint.validate(self.envelope(self.expected), self.expected)
        self.assertEqual(self.expected["lengths"], self.parent["reference"]["lengths"])
        self.assertEqual(self.expected["lengths"]["bySyllables"]["12"]["written"]["total"], 1)

    def test_rejects_changed_values_with_fresh_digest(self):
        cases = [
            (["units"], "rounded-percentage"),
            (["axes", "phones"], "IPA-character-count"),
            (["axes", "syllables"], "any-digit-count"),
            (["axes", "conditional"], "phone-length"),
            (["source", "sha256"], "0" * 64),
            (["population", "entryDigest"], "0" * 64),
            (["population", "accepted"], 135158),
            (["parentReference", "artifactDigest"], "0" * 64),
            (["license", "content"], "fake"),
            (["implementation", "packageLockSha256"], "0" * 64),
            (["lengths", "written", "counts", "4"], 1.5),
            (["lengths", "written", "counts", "4"], -1),
            (["lengths", "written", "counts", "4"], True),
            (["lengths", "bySyllables", "1", "phones", "total"], 15107),
        ]
        for path, value in cases:
            with self.subTest(path=path, value=value):
                artifact = copy.deepcopy(self.expected)
                owner = artifact
                for key in path[:-1]:
                    owner = owner[key]
                owner[path[-1]] = value
                self.reject(artifact)

    def test_rejects_conditional_swaps_preserving_all_marginals(self):
        for axis in ["written", "phones"]:
            with self.subTest(axis=axis):
                artifact = copy.deepcopy(self.expected)
                rows = artifact["lengths"]["bySyllables"]
                before = [sum(rows[key][axis]["counts"].values()) for key in ["1", "2"]]
                for row, label, delta in [("1", "4", 1), ("1", "5", -1), ("2", "4", -1), ("2", "5", 1)]:
                    rows[row][axis]["counts"][label] += delta
                self.assertEqual(before, [sum(rows[key][axis]["counts"].values()) for key in ["1", "2"]])
                marginal = {}
                for row in rows.values():
                    for label, count in row[axis]["counts"].items():
                        self.assertGreater(count, 0)
                        marginal[label] = marginal.get(label, 0) + count
                self.assertEqual(marginal, self.expected["lengths"][axis]["counts"])
                self.reject(artifact)

    def test_rejects_same_total_and_mean_with_different_bins(self):
        artifact = copy.deepcopy(self.expected)
        counts = artifact["lengths"]["written"]["counts"]
        counts["2"] += 1
        counts["4"] += 1
        counts["3"] -= 2
        original = self.expected["lengths"]["written"]["counts"]
        self.assertEqual(sum(counts.values()), sum(original.values()))
        self.assertEqual(sum(int(key) * value for key, value in counts.items()),
                         sum(int(key) * value for key, value in original.items()))
        self.reject(artifact)

    def test_rejects_missing_tails_or_added_summary(self):
        for mode in ["tail", "row", "summary", "axis", "envelope"]:
            with self.subTest(mode=mode):
                artifact = copy.deepcopy(self.expected)
                if mode == "tail":
                    del artifact["lengths"]["written"]["counts"]["28"]
                elif mode == "row":
                    del artifact["lengths"]["bySyllables"]["12"]
                elif mode == "summary":
                    artifact["overallStats"] = {"mean": 7.53}
                elif mode == "axis":
                    del artifact["axes"]["written"]
                else:
                    envelope = {**self.envelope(artifact), "verified": True}
                    with self.assertRaises(ValueError):
                        joint.validate(envelope, self.expected)
                    continue
                self.reject(artifact)

    def test_rejects_internally_consistent_unreviewed_implementation(self):
        sources = copy.deepcopy(self.sources)
        sources[-2]["content"] += "\n// unreviewed\n"
        forged = verify.expected_artifact(joint, self.parent, sources)
        self.assertEqual(forged["implementation"]["digest"], joint.digest(sources))
        self.reject(forged)

    def test_expected_snapshot_is_detached(self):
        parent, sources = copy.deepcopy(self.parent), copy.deepcopy(self.sources)
        artifact = verify.expected_artifact(joint, parent, sources)
        parent["reference"]["lengths"]["bySyllables"]["1"]["written"]["counts"]["4"] += 1
        sources[0]["content"] += "changed"
        self.assertEqual(artifact, self.expected)

    def test_parser_rejects_duplicate_keys_and_nonfinite_counts(self):
        for text in ['{"digest":"a","digest":"b"}', '{"count":NaN}', '{"count":Infinity}']:
            with self.subTest(text=text), self.assertRaises(ValueError):
                joint.strict_json(text)


if __name__ == "__main__":
    unittest.main()
