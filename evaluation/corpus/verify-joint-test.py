"""Adversarial checks for the independent Q15b recount; local inputs required."""
import argparse
from collections import Counter
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("verify_joint", Path(__file__).with_name("verify-joint.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def replace_mapping(envelope):
    """Forge a self-consistent projection and embedded mapping together."""
    artifact = envelope["artifact"]
    file = next(file for file in artifact["legacy"]["artifacts"] if file["path"].endswith("/phoneme-normalization.json"))
    normalization = json.loads(file["content"])
    normalization["arpabetToIpa"]["AA"] = "ɔ"
    file["content"] = json.dumps(normalization)
    projection = artifact["comparisonProjection"]
    projection["mapping"] = normalization["arpabetToIpa"]
    counts = Counter()
    for token, count in artifact["reference"]["phones"]["base"]["counts"].items():
        counts[projection["mapping"][token]] += count
    projection["mapped"] = module.histogram(counts)


def shift_native_bins(envelope):
    """Preserve all token/stress/length totals and repair dependent projections."""
    artifact = envelope["artifact"]
    phones = artifact["reference"]["phones"]
    phones["native"]["counts"]["AH0"] -= 1
    phones["native"]["counts"]["AE0"] += 1
    phones["base"]["counts"]["AH"] -= 1
    phones["base"]["counts"]["AE"] += 1
    artifact["comparisonProjection"]["mapped"]["counts"]["ə"] -= 1
    artifact["comparisonProjection"]["mapped"]["counts"]["æ"] += 1


def swap_conditional_cells(envelope):
    """Keep row totals, global lengths and weighted letter totals unchanged."""
    tables = envelope["artifact"]["reference"]["lengths"]["bySyllables"]
    for syllables, direction in [("1", 1), ("2", -1)]:
        counts = tables[syllables]["written"]["counts"]
        counts["4"] += direction
        counts["5"] -= direction


class JointVerificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.expected = module.prepare(SOURCE)
        cls.envelope = module.strict_json(ARTIFACT.read_bytes())
        module.validate(cls.envelope, cls.expected)

    def rejected(self, change, redigest=True):
        corrupted = deepcopy(self.envelope)
        change(corrupted)
        if redigest:
            corrupted["digest"] = module.digest(corrupted["artifact"])
        with self.assertRaises(ValueError):
            module.validate(corrupted, self.expected)

    def test_complete_current_artifact(self):
        report = module.verify(SOURCE, ARTIFACT)
        self.assertEqual(report["accepted"], 117485)
        self.assertEqual(report["nativePhoneEvents"], 742333)
        self.assertEqual(report["characterEvents"], {"letters": 869802, "bigrams": 752317, "trigrams": 634858})
        self.assertTrue(report["completeDerivedModelReconstruction"])

    def test_joint_population_units_and_projections(self):
        cases = {
            "wrong source pin": lambda e: e["artifact"]["reference"]["source"].update(sha256="0" * 64),
            "wrong source revision": lambda e: e["artifact"]["reference"]["source"].update(revision="mutable-master"),
            "wrong entry sequence": lambda e: e["artifact"]["reference"]["population"].update(entryDigest="0" * 64),
            "percentages as event units": lambda e: e["artifact"]["reference"]["population"]["definition"].update(units="rounded-percentage"),
            "wrong phone projection": lambda e: e["artifact"]["reference"]["projections"]["native"].update(loss="stress-merged"),
            "unknown policy field": lambda e: e["artifact"]["reference"]["population"]["definition"].update(POS="noun"),
            "missing policy field": lambda e: e["artifact"]["reference"]["population"]["definition"].pop("labels"),
            "fractional count": lambda e: e["artifact"]["reference"]["characters"]["letters"]["counts"].update(a=1.5),
            "boolean count": lambda e: e["artifact"]["reference"]["characters"]["letters"].update(total=True),
            "negative count": lambda e: e["artifact"]["reference"]["phones"]["native"]["counts"].update(AA0=-1),
            "extra category": lambda e: e["artifact"]["reference"]["phones"]["native"]["counts"].update(AX0=1),
        }
        for name, change in cases.items():
            with self.subTest(name=name):
                self.rejected(change)

    def test_equal_marginals_do_not_hide_changed_bins(self):
        def shift_letters(e):
            counts = e["artifact"]["reference"]["characters"]["letters"]["counts"]
            counts["a"] -= 1
            counts["b"] += 1
        def shift_patterns(e):
            counts = e["artifact"]["reference"]["phones"]["stressPatterns"]["counts"]
            counts["1 0"] -= 1
            counts["0 1"] += 1
        for name, change in [
            ("letter marginals", shift_letters), ("native/stress/length marginals", shift_native_bins),
            ("conditional and global length marginals", swap_conditional_cells), ("stress/syllable marginals", shift_patterns),
        ]:
            with self.subTest(name=name):
                self.rejected(change)

    def test_derived_model_and_legacy_evidence_are_immutable(self):
        cases = {
            "derived analysis": lambda e: e["artifact"]["reference"]["derived"]["method"].update(stress="primary-only"),
            "legacy character bins": lambda e: e["artifact"]["legacy"]["characters"]["counts"]["letters"]["counts"].update(a=1),
            "legacy character population": lambda e: e["artifact"]["legacy"]["characters"].update(accepted=117485),
            "legacy length population": lambda e: e["artifact"]["legacy"]["lengths"].update(accepted=117485),
            "invented legacy denominator": lambda e: e["artifact"]["legacy"]["phones"].update(denominator=100),
            "legacy units": lambda e: e["artifact"]["legacy"]["phones"].update(units="integer-occurrence-counts"),
            "legacy source availability": lambda e: e["artifact"]["legacy"]["phones"].update(sourcePopulation="known"),
            "extra legacy field": lambda e: e["artifact"]["legacy"].update(estimates={}),
            "mutually consistent wrong mapping": replace_mapping,
        }
        for name, change in cases.items():
            with self.subTest(name=name):
                self.rejected(change)

    def test_envelope_source_and_license_identities(self):
        def changed_source(e):
            implementation = e["artifact"]["implementation"]
            implementation["sources"][0]["content"] += "\n// modified after capture\n"
            implementation["digest"] = module.digest(implementation["sources"])
        def changed_license(e):
            license_info = e["artifact"]["license"]
            license_info["content"] = "Replacement license"
            license_info["sha256"] = module.sha(license_info["content"].encode())
        cases = {
            "re-hashed wrong source": changed_source,
            "wrong license bytes": changed_license,
            "wrong license path": lambda e: e["artifact"]["license"].update(path="other/LICENSE.txt"),
            "missing source": lambda e: e["artifact"]["implementation"]["sources"].pop(),
            "reordered sources": lambda e: e["artifact"]["implementation"]["sources"].reverse(),
            "extra source field": lambda e: e["artifact"]["implementation"]["sources"][0].update(trusted=True),
            "extra envelope field": lambda e: e.update(trusted=True),
            "extra artifact field": lambda e: e["artifact"].update(trusted=True),
            "missing artifact field": lambda e: e["artifact"].pop("comparisonProjection"),
        }
        for name, change in cases.items():
            with self.subTest(name=name):
                self.rejected(change)
        self.rejected(lambda e: e.update(digest="0" * 64), redigest=False)

    def test_json_ambiguity_and_corrupt_source_rejected(self):
        for content in ['{"digest":1,"digest":2}', '{"value":NaN}', '{"value":Infinity}', '{"artifact":']:
            with self.subTest(content=content), self.assertRaises((ValueError, json.JSONDecodeError)):
                module.strict_json(content)
        with self.assertRaises(ValueError):
            module.validate([], self.expected)
        with tempfile.TemporaryDirectory(prefix="q15b-source-") as directory:
            truncated = Path(directory) / "truncated.dict"
            truncated.write_bytes(SOURCE.read_bytes()[:-1])
            with self.assertRaisesRegex(ValueError, "raw source"):
                module.prepare(truncated)

    def test_independent_parser_retains_stress_and_whole_invalid_pronunciations(self):
        text = "A AH0\nword W ER1 D\nword(2) W ER0 D\nword W ER2 D\nbad B AX0 D\nnone SH\n"
        entries, _, excluded, _ = module.parser.count_source(text)
        self.assertEqual([entry["tokens"] for entry in entries], [["AH0"], ["W", "ER1", "D"]])
        self.assertEqual(excluded, {"alternate_pronunciation": 1, "duplicate_spelling": 1, "unsupported_pronunciation": 1, "no_vowel": 1})
        characters, lengths, phones = module.reconstruct_joint(entries)
        self.assertEqual(characters["letters"]["total"], 5)
        self.assertEqual(lengths["syllables"]["counts"], {"1": 2})
        self.assertEqual(phones["vowelStress"]["counts"], {"0": 1, "1": 1})
        self.assertEqual(phones["native"]["counts"], {"AH0": 1, "W": 1, "ER1": 1, "D": 1})

    def test_canonical_order_matches_numeric_object_key_contract(self):
        self.assertEqual(module.encoded({"11": 1, "2": 2, "01": 3, "a": 4}, sorted_keys=True), b'{"2":2,"11":1,"01":3,"a":4}')
        self.assertEqual(module.digest(self.envelope["artifact"]), self.envelope["digest"])

    def test_cli_output_is_exclusive(self):
        with tempfile.TemporaryDirectory(prefix="q15b-output-") as directory:
            output = Path(directory) / "report.json"
            command = [sys.executable, str(Path(__file__).with_name("verify-joint.py")), "--source", str(SOURCE),
                       "--artifact", str(ARTIFACT), "--out", str(output)]
            subprocess.run(command, check=True, capture_output=True)
            before = output.read_bytes()
            failed = subprocess.run(command, capture_output=True)
            self.assertNotEqual(failed.returncode, 0)
            self.assertIn(b"FileExistsError", failed.stderr)
            self.assertEqual(output.read_bytes(), before)


if __name__ == "__main__":
    arguments = argparse.ArgumentParser(description=__doc__)
    arguments.add_argument("--source", required=True)
    arguments.add_argument("--artifact", required=True)
    args = arguments.parse_args()
    SOURCE, ARTIFACT = Path(args.source).resolve(), Path(args.artifact).resolve()
    unittest.main(argv=[sys.argv[0]], verbosity=2)
