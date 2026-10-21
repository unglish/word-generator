"""Independent distance, archive, and report-corruption fixtures for Q15b."""
import argparse
from copy import deepcopy
import gzip
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("verify_sensitivity", Path(__file__).with_name("verify-sensitivity.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def draw(index=0, spelling="purr", onset="pʰ", nucleus="ɚ"):
    return {"profile": "fixture", "seed": 123, "drawIndex": index,
            "word": {"written": {"clean": spelling}, "trace": {}, "syllables": [
                {"onset": [{"sound": onset}], "nucleus": [{"sound": nucleus}], "coda": []},
            ]}}


def compressed(draws):
    return gzip.compress(("\n".join(json.dumps(record) for record in draws) + "\n").encode(), mtime=0)


def score_fixture():
    counts = module.finish_counts(module.recount_shard(compressed([draw()]), "fixture", 123, 1))
    generated = {**{name: table["counts"] for name, table in counts["characters"].items()},
                 "writtenLength": counts["lengths"]["written"]["counts"],
                 "syllables": counts["lengths"]["syllables"]["counts"], "phones": counts["phones"]["comparison"]["counts"]}
    references, scores = {}, {}
    for name, table in generated.items():
        references[name] = {"legacy": table, "joint": {**table, "unseen": 1}}
        old, new = [module.distance(table, references[name][view]) for view in ["legacy", "joint"]]
        scores[name] = {"generatedEvents": sum(table.values()), "legacy": old, "joint": new,
                        "deltaJointMinusLegacy": {key: new[key] - old[key] for key in old}}
    return counts, references, scores


class CalculationTests(unittest.TestCase):
    def test_known_distances_and_null_denominators(self):
        self.assertEqual(module.distance({"a": 1}, {"a": 10}), {"jensenShannonBits": 0, "missingReferenceMass": 0, "unseenGeneratedMass": 0})
        self.assertEqual(module.distance({"a": 1}, {"b": 1}), {"jensenShannonBits": 1, "missingReferenceMass": 1, "unseenGeneratedMass": 1})
        score = module.distance({"a": 1, "b": 1}, {"a": 1})
        self.assertAlmostEqual(score["jensenShannonBits"], 0.31127812445913283, places=15)
        self.assertEqual(score["unseenGeneratedMass"], 0.5)
        self.assertEqual(score["missingReferenceMass"], 0)
        self.assertEqual(module.distance({}, {"a": 1}), dict.fromkeys(score))
        for weights in [{"a": -1}, {"a": float("nan")}, {"a": True}]:
            with self.assertRaises(ValueError):
                module.distance(weights, {"a": 1})

    def test_raw_counts_projection_paths_and_aspiration(self):
        words = [draw(), draw(1, "sun", "s", "ʌ")]
        counts = module.finish_counts(module.recount_shard(compressed(words), "fixture", 123, 2))
        self.assertEqual(counts["words"], 2)
        self.assertEqual(counts["characters"]["letters"]["total"], 7)
        self.assertEqual(counts["characters"]["bigrams"]["total"], 5)
        self.assertEqual(counts["characters"]["trigrams"]["total"], 3)
        self.assertEqual(counts["lengths"]["phones"]["counts"], {"2": 2})
        self.assertEqual(counts["phones"]["raw"]["counts"], {"pʰ": 1, "ɚ": 1, "s": 1, "ʌ": 1})
        self.assertEqual(counts["phones"]["comparison"]["counts"], {"p": 1, "ɜ": 1, "s": 1, "ə": 1})
        self.assertEqual(counts["aspirationEvents"], 1)
        self.assertEqual(counts["projectionPaths"]["ɚ"], {"output": "ɜ", "count": 1})
        self.assertEqual(counts["projectionPaths"]["ʌ"], {"output": "ə", "count": 1})

    def test_coordinate_count_and_content_corruptions(self):
        cases = {
            "wrong first coordinate": [draw(1)], "duplicate draw": [draw(), draw()],
            "extra draw": [draw(), draw(1)], "wrong seed": [{**draw(), "seed": 999}],
            "wrong profile": [{**draw(), "profile": "other"}], "non-ASCII spelling": [draw(spelling="é")],
            "boolean index": [{**draw(), "drawIndex": False}], "extra record field": [{**draw(), "candidate": True}],
        }
        for name, records in cases.items():
            with self.subTest(name=name), self.assertRaises(ValueError):
                module.recount_shard(compressed(records), "fixture", 123, 1)
        with self.assertRaisesRegex(ValueError, "complete draw stream"):
            module.recount_shard(compressed([draw()]), "fixture", 123, 2)
        with self.assertRaises((EOFError, OSError)):
            module.recount_shard(compressed([draw()])[:-4], "fixture", 123, 1)
        word = draw()
        word["word"].pop("trace")
        with self.assertRaisesRegex(ValueError, "trace"):
            module.recount_shard(compressed([word]), "fixture", 123, 1)

    def test_pinned_compressed_bytes(self):
        data = compressed([draw()])
        with tempfile.TemporaryDirectory(prefix="q15b-shard-") as temporary:
            directory = Path(temporary)
            (directory / "fixture.gz").write_bytes(data)
            metadata = {"file": "fixture.gz", "bytes": len(data), "sha256": module.joint.sha(data)}
            self.assertEqual(module.pinned_bytes(directory, metadata), data)
            for change in [{"bytes": len(data) + 1}, {"sha256": "0" * 64}]:
                with self.assertRaises(ValueError):
                    module.pinned_bytes(directory, {**metadata, **change})

    def test_tolerance_has_a_boundary_and_deltas_are_separately_checked(self):
        counts, references, scores = score_fixture()
        self.assertEqual(module.check_sensitivity(scores, counts, references), 0)
        nearby = deepcopy(scores)
        nearby["letters"]["joint"]["jensenShannonBits"] += module.TOLERANCE / 2
        self.assertLessEqual(module.check_sensitivity(nearby, counts, references), module.TOLERANCE)
        cases = {
            "score": lambda s: s["letters"]["joint"].update(jensenShannonBits=0.8),
            "just outside tolerance": lambda s: s["letters"]["joint"].update(jensenShannonBits=s["letters"]["joint"]["jensenShannonBits"] + module.TOLERANCE * 2),
            "delta only": lambda s: s["letters"]["deltaJointMinusLegacy"].update(jensenShannonBits=-0.7),
            "null score": lambda s: s["letters"]["joint"].update(jensenShannonBits=None),
            "boolean score": lambda s: s["letters"]["joint"].update(jensenShannonBits=False),
            "wrong denominator": lambda s: s["letters"].update(generatedEvents=10),
            "missing metric": lambda s: s.pop("phones"),
            "extra field": lambda s: s["letters"].update(improved=True),
        }
        for name, change in cases.items():
            corrupted = deepcopy(scores)
            change(corrupted)
            with self.subTest(name=name), self.assertRaises(ValueError):
                module.check_sensitivity(corrupted, counts, references)

    def test_original_numeric_lexemes_preserved_for_identity(self):
        parsed = module.load_json('{"delta":-8.266817062641332e-7,"small":0.000001731437918275902,"11":1,"2":2}')
        self.assertEqual(module.identity_json(parsed), '{"2":2,"11":1,"delta":-8.266817062641332e-7,"small":0.000001731437918275902}')
        for source in ['{"x":0,"x":1}', '{"x":NaN}', '{"x":1e999}']:
            with self.assertRaises(ValueError):
                module.load_json(source)


class CurrentArtifactTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.artifact_bytes = ARTIFACT.read_bytes()
        cls.artifact = module.joint.prepare(SOURCE)
        module.joint.validate(module.joint.strict_json(cls.artifact_bytes), cls.artifact)
        cls.envelope = module.load_json(REPORT.read_bytes())
        cls.manifest, cls.sources, _, cls.manifest_bytes = module.open_archive(BASELINE)

    def check_metadata(self, report):
        return module.check_report_metadata(report, self.artifact, self.artifact_bytes, self.manifest, self.sources, module.ROOT)

    def test_current_report_identity_and_all_metadata(self):
        self.assertEqual(module.digest(self.envelope["report"]), self.envelope["digest"])
        self.assertEqual(set(self.check_metadata(self.envelope["report"])), {"letters", "bigrams", "trigrams", "writtenLength", "syllables", "phones"})

    def test_metadata_corruptions_cannot_claim_matching_provenance(self):
        cases = {
            "quality claim": lambda r: r.update(interpretation="improved generator"),
            "wrong baseline": lambda r: r["baseline"].update(manifestDigest="0" * 64),
            "wrong joint artifact": lambda r: r["reference"].update(artifactDigest="0" * 64),
            "wrong old reference": lambda r: r["reference"].update(legacyReferenceDigest="0" * 64),
            "changed distance source": lambda r: r["evaluator"]["frozenDistance"].update(content="modified"),
            "changed evaluator source": lambda r: r["evaluator"]["sources"][0].update(content="modified"),
            "changed projection": lambda r: r["generatedProjection"]["aliases"].update({"ɚ": "other"}),
            "phone units": lambda r: r["referenceUnits"].update(legacyPhones="integer-counts"),
            "changed reference bins": lambda r: r["referenceTables"]["letters"]["joint"].update(a=1),
            "missing limitation": lambda r: r["limitations"].pop(),
            "extra metadata": lambda r: r.update(qualityScore=1),
        }
        for name, change in cases.items():
            corrupted = deepcopy(self.envelope["report"])
            change(corrupted)
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.check_metadata(corrupted)

    def test_forged_manifest_and_extra_missing_symlink_shards(self):
        names = [item["file"].split("/")[-1] for item in self.manifest["artifacts"] if item["file"].startswith("words/")]
        with tempfile.TemporaryDirectory(prefix="q15b-archive-") as temporary:
            directory = Path(temporary)
            manifest_file = directory / "manifest.json"
            manifest_file.write_bytes(self.manifest_bytes)
            words = directory / "words"
            words.mkdir()
            for name in names:
                (words / name).touch()
            extra = words / "unlisted.jsonl.gz"
            extra.touch()
            with self.assertRaisesRegex(ValueError, "filesystem shard set"):
                module.open_archive(directory)
            extra.unlink()
            missing = words / names[0]
            missing.unlink()
            with self.assertRaisesRegex(ValueError, "filesystem shard set"):
                module.open_archive(directory)
            missing.symlink_to(BASELINE / "words" / names[0])
            with self.assertRaisesRegex(ValueError, "symlink"):
                module.open_archive(directory)
            forged = module.load_json(self.manifest_bytes)
            forged["manifest"]["protocol"]["wordsPerReplicate"] -= 1
            forged["digest"] = module.digest(forged["manifest"])
            manifest_file.write_text(module.identity_json(forged))
            with self.assertRaisesRegex(ValueError, "original manifest pin"):
                module.open_archive(directory)


if __name__ == "__main__":
    arguments = argparse.ArgumentParser(description=__doc__)
    for name in ["source", "artifact", "baseline", "report"]:
        arguments.add_argument(f"--{name}", required=True)
    args = arguments.parse_args()
    SOURCE, ARTIFACT, BASELINE, REPORT = [Path(getattr(args, name)).resolve() for name in ["source", "artifact", "baseline", "report"]]
    unittest.main(argv=[sys.argv[0]], verbosity=2)
