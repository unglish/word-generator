import copy
import gzip
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from recount import recount_archive, recount_word, units


class RecountTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.words = json.loads(gzip.decompress(Path(__file__).with_name("recount-smoke-words.json.gz").read_bytes()))

    def test_all_smoke_words_and_missing_evidence(self):
        for word in self.words:
            self.assertEqual(recount_word(word)["words"], 1)
        self.assertEqual(recount_word({"written": {"clean": "a"}})["missingFinalEvidence"], 1)
        self.assertEqual(len(units("a😀b")), 4)

    def test_corrupted_identity_and_sound(self):
        for location, field, value in (("spelling", "id", 99999), ("phones", "sound", "forged")):
            word = copy.deepcopy(self.words[0])
            key = "cells" if location == "spelling" else "final"
            word["trace"]["finalWord"][location][key][0][field] = value
            with self.assertRaises(AssertionError):
                recount_word(word)

    def test_boolean_phone_coordinates_are_rejected(self):
        for phase, field in (("initial", "id"), ("final", "syllable"), ("final", "index")):
            word = copy.deepcopy(self.words[0])
            word["trace"]["finalWord"]["phones"][phase][0][field] = False
            with self.assertRaises(AssertionError):
                recount_word(word)

    def test_archive_hash_and_draw_coordinates(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "words").mkdir()
            name = "words/test-7.jsonl.gz"
            rows = [dict(profile="test", seed=7, drawIndex=i, word=w) for i, w in enumerate(self.words[:2])]

            def save():
                data = gzip.compress("\n".join(json.dumps(row) for row in rows).encode(), mtime=0)
                (root / name).write_bytes(data)
                manifest = {"manifest": {"cohort": "development", "protocol": {"wordsPerReplicate": 2,
                    "profiles": [{"id": "test", "seeds": {"development": [7]}}]},
                    "artifacts": [{"file": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}]}}
                encoded = json.dumps(manifest).encode()
                (root / "manifest.json").write_bytes(encoded)
                return hashlib.sha256(encoded).hexdigest()

            digest = save()
            self.assertEqual(recount_archive(root, digest)["counts"]["words"], 2)
            protocol = json.loads((root / "manifest.json").read_bytes())["manifest"]["protocol"]
            self.assertEqual(recount_archive(root, digest, protocol)["counts"]["words"], 2)
            changed_protocol = copy.deepcopy(protocol)
            changed_protocol["wordsPerReplicate"] = 1
            with self.assertRaises(AssertionError):
                recount_archive(root, digest, changed_protocol)
            with self.assertRaises(AssertionError):
                recount_archive(root, "0" * 64)
            (root / name).write_bytes(b"damaged")
            with self.assertRaises(AssertionError):
                recount_archive(root, digest)
            for mutation in (
                lambda m: m["artifacts"].append(copy.deepcopy(m["artifacts"][0])),
                lambda m: m["protocol"]["profiles"].append(copy.deepcopy(m["protocol"]["profiles"][0])),
                lambda m: m["protocol"]["profiles"][0]["seeds"]["development"].append(7),
                lambda m: m["protocol"]["profiles"][0].update(id="../test"),
            ):
                save()
                manifest = json.loads((root / "manifest.json").read_bytes())
                mutation(manifest["manifest"])
                encoded = json.dumps(manifest).encode()
                (root / "manifest.json").write_bytes(encoded)
                with self.assertRaises(AssertionError):
                    recount_archive(root, hashlib.sha256(encoded).hexdigest())
            digest = save()
            (root / "words" / "unexpected.jsonl.gz").write_bytes(b"extra")
            with self.assertRaises(AssertionError):
                recount_archive(root, digest)
            (root / "words" / "unexpected.jsonl.gz").unlink()
            rows[1]["drawIndex"] = 0
            digest = save()
            with self.assertRaises(AssertionError):
                recount_archive(root, digest)


if __name__ == "__main__":
    unittest.main()
