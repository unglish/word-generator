"""Adversarial development fixtures for the independent Q09a replay."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("q09ind", Path(__file__).with_name("q09-independent-patterns.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
WORDS = [json.loads(line)["word"] for line in Path("/private/tmp/q09-independent-fixtures-v1.jsonl").read_text().splitlines()]


class PatternReplayTests(unittest.TestCase):
    def test_all_public_development_witnesses(self):
        self.assertEqual(len(WORDS), 400)
        for word in WORDS:
            module.validate_word(word)

    def test_ordered_history_corruptions(self):
        source = next(w for w in WORDS if len(w["trace"]["stressPattern"]["events"]) >= 3)
        def swap(p):
            p["events"][0], p["events"][1] = p["events"][1], p["events"][0]
        cases = [
            lambda p: p["events"].pop(0),
            lambda p: p["events"].append(deepcopy(p["events"][-1])),
            swap,
            lambda p: p["events"][0].update(id=44),
            lambda p: p["events"][0].update(syllableIndex=-1),
            lambda p: p["events"][0].update(before="primary"),
            lambda p: p["events"][1].update(previousOrigin={"kind": "event", "eventId": len(p["events"]) + 1}),
            lambda p: p["events"][0].update(coordinates="word"),
            lambda p: p["snapshots"].pop(1),
            lambda p: p["snapshots"][1].update(domain=p["snapshots"][0]["domain"]),
            lambda p: p["snapshots"][1].update(eventCount=0),
            lambda p: p["snapshots"][1]["syllables"][0].update(origin={"kind": "input"}),
            lambda p: p["primary"].update(draws=[1]),
            lambda p: p.update(version=True),
        ]
        for index, mutate in enumerate(cases):
            with self.subTest(index=index):
                word = deepcopy(source)
                mutate(word["trace"]["stressPattern"])
                with self.assertRaises(ValueError):
                    module.validate_word(word)

    def test_morphology_and_final_binding(self):
        source = next(w for w in WORDS if w["trace"]["stressPattern"]["morphology"] and any(e["eventIds"] for e in w["trace"]["stressPattern"]["morphology"]))
        cases = [
            lambda p: p["morphology"][0].update(role="invented"),
            lambda p: p["morphology"][0].update(eventIds=[]),
            lambda p: p["assembly"].update(rootSyllableStart=p["assembly"]["rootSyllableStart"] + 1),
            lambda p: p["assembly"].update(prefixSyllables=p["assembly"]["prefixSyllables"] + 1),
            lambda p: p["snapshots"][-1]["syllables"][0]["nucleus"][0].update(sound="forged"),
            lambda p: p["snapshots"][-2]["syllables"][0]["nucleus"][0].update(nuclearQuantity={"analysis": "forged", "moras": 2}),
        ]
        for index, mutate in enumerate(cases):
            with self.subTest(index=index):
                word = deepcopy(source)
                mutate(word["trace"]["stressPattern"])
                with self.assertRaises(ValueError):
                    module.validate_word(word)

    def test_executed_and_skipped_draws(self):
        executed = next(w for w in WORDS if w["trace"]["stressPattern"]["explicitSecondary"]["gateDraw"] is not None)
        for key, value in [("gateDraw", None), ("selectionDraw", -0.1), ("applied", not executed["trace"]["stressPattern"]["explicitSecondary"]["applied"]), ("skipped", "disabled")]:
            word = deepcopy(executed)
            word["trace"]["stressPattern"]["explicitSecondary"][key] = value
            with self.assertRaises(ValueError):
                module.validate_word(word)
        skipped = next(w for w in WORDS if w["trace"]["stressPattern"]["explicitSecondary"]["skipped"] is not None)
        word = deepcopy(skipped)
        word["trace"]["stressPattern"]["explicitSecondary"]["gateDraw"] = 0.5
        with self.assertRaises(ValueError):
            module.validate_word(word)
        rhythmic = next(w for w in WORDS if w["trace"]["stressPattern"]["rhythmic"]["iterations"])
        word = deepcopy(rhythmic)
        word["trace"]["stressPattern"]["rhythmic"]["iterations"][0]["left"] = "forged"
        with self.assertRaises(ValueError):
            module.validate_word(word)

    def test_json_duplicate_and_nonfinite_values(self):
        for data in ['{"x":1,"x":1}', '{"x":NaN}', '{"x":Infinity}']:
            with self.assertRaises(ValueError):
                module.strict_load(data)

    def test_archive_paths_reject_symlinks_at_each_level(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root / "archive"
            archive.mkdir()
            words = archive / "words"
            words.mkdir()
            shard = words / "data.gz"
            shard.write_bytes(b"same-bytes")
            self.assertEqual(module.regular_path(archive, "words/data.gz"), shard)
            (root / "alias").symlink_to(archive, target_is_directory=True)
            (archive / "alias").symlink_to(words, target_is_directory=True)
            (words / "alias.gz").symlink_to(shard)
            for base, relative in [(root / "alias", "words/data.gz"), (archive, "alias/data.gz"), (archive, "words/alias.gz"), (archive, "../archive/words/data.gz"), (archive, str(shard))]:
                with self.subTest(base=base, relative=relative), self.assertRaises(ValueError):
                    module.regular_path(base, relative)


if __name__ == "__main__":
    unittest.main()
