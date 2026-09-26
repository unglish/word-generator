"""Synthetic score-proof fixtures and static model parsing only; no corpus scoring."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("scores", Path(__file__).with_name("verify-score-reference.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
io, joint = module.dependencies(module.ROOT)
model = module.audit_model(module.ROOT, io, joint)


def selected(text):
    return joint.parser.count_source(text)[0]


def envelope(artifact):
    return {"artifact": copy.deepcopy(artifact), "digest": joint.digest(artifact)}


class ScoreProofTests(unittest.TestCase):
    def test_complete_model_data_matches_independently_imported_ts_exports(self):
        script = "import {ARPABET_BIGRAM_COUNTS as counts,ARPABET_TOTAL_COUNTS as totals,ALL_ARPABET_PHONEMES as v} from './src/phonotactic/arpabet-bigrams.ts'; console.log(JSON.stringify({counts,totals,vocabulary:[...v]}));"
        output = subprocess.run(["node", "--import", "tsx", "--input-type=module", "-e", script], cwd=module.ROOT, check=True, text=True, capture_output=True)
        self.assertEqual(json.loads(output.stdout), model)
        self.assertEqual(len(model["vocabulary"]), 40)
        self.assertEqual(sum(map(len, model["counts"].values())), 1338)
        self.assertEqual(sum(model["totals"].values()), 976831)

    def test_restricted_parser_rejects_code_duplicate_keys_and_invalid_counts(self):
        original = (module.ROOT / module.TABLE_PATH).read_text()
        changes = [original + "\nconsole.log('never executed');", original.replace('"B": 9632', '"B": (1+2)', 1),
                   original.replace('"B": 9632', '"B": 9632, "B": 9632', 1), original.replace('"B": 9632', '"B": true', 1),
                   original.replace('"B": 9632', '"B": 0.5', 1), original.replace('"B": 9632', '"B": -1', 1),
                   original.replace('"#": 132603', '"#": 132604', 1), original.replace('"#", "AA"', '"#", "#"', 1)]
        for changed in changes:
            with self.subTest(changed=changed[-70:]), self.assertRaises(ValueError):
                module.parse_model(changed, joint)

    def test_native_projection_all_stress_values_boundaries_and_repeats(self):
        entries = selected("a AH0 ER0\nb AH1 ER1\nc AH2 ER2\nd T T AH0\n")
        result = module.independent_scores(entries, model, joint)
        self.assertEqual([row["arpabet"] for row in result["rows"]], ["AH ER", "AH ER", "AH ER", "T T AH"])
        self.assertEqual(len({row["total"] for row in result["rows"][:3]}), 1)
        self.assertEqual(result["phoneEvents"], 9); self.assertEqual(result["transitionEvents"], 13)
        self.assertEqual(result["accounting"], {"selected": 4, "scored": 4, "invalid": 0, "dropped": 0})

    def test_mean_is_equal_word_and_median_is_upper_middle(self):
        result = module.independent_scores(selected("a AH0\nb S T R EH1 NG TH S\n"), model, joint)
        self.assertNotEqual(result["summary"]["perTransition"]["mean"], sum(row["total"] for row in result["rows"]) / result["transitionEvents"])
        self.assertEqual(module.stats([-5.0, -4.0, -2.0, -1.0]), {"mean": -3.0, "min": -5.0, "median": -2.0, "max": -1.0})
        self.assertEqual(module.stats([-1.0, -1.0, -1e16])["mean"], -1e16 / 3)

    def test_invalid_complete_entries_and_shared_selection(self):
        text = "same BAD\nSAME S EY1 M # comment\nsame S AH0 M\nsame(2) S EY2 M\ncan't K AE1 N T\nhm HH M\nyes Y EH1 S\n"
        entries, _, excluded, _ = joint.parser.count_source(text)
        self.assertEqual([entry["spelling"] for entry in entries], ["same", "yes"])
        self.assertEqual(sum(excluded.values()), 5)
        for invalid in [[], entries[::-1], [entries[0], entries[0]], [{**entries[0], "tokens": ["BAD"]}], [{**entries[0], "tokens": ["T"]}]]:
            with self.assertRaises(ValueError):
                module.independent_scores(invalid, model, joint)
        for values in [[], [float("nan")], [float("inf")]]:
            with self.assertRaises(ValueError):
                module.stats(values)

    def test_full_row_corruptions_including_summary_preserving_swap(self):
        expected = {"scores": module.independent_scores(selected("cat K AE1 T\ndog D AO1 G\n"), model, joint), "scorer": copy.deepcopy(module.MODEL)}
        self.assertEqual(module.validate(envelope(expected), expected, joint)["comparedScoreValues"], 12)
        variants = []
        for operation in ["missing", "duplicate", "reordered", "extra", "input", "swap", "model", "summary", "field"]:
            candidate = copy.deepcopy(expected); rows = candidate["scores"]["rows"]
            if operation == "missing": rows.pop()
            elif operation == "duplicate": rows[1] = rows[0]
            elif operation == "reordered": rows.reverse()
            elif operation == "extra": rows.append(rows[0])
            elif operation == "input": rows[0]["arpabet"] = "K ER T"
            elif operation == "swap":
                for key in ["total", "perTransition"]:
                    rows[0][key], rows[1][key] = rows[1][key], rows[0][key]
                self.assertEqual(candidate["scores"]["summary"], expected["scores"]["summary"])
                self.assertTrue(all(row["perTransition"] == row["total"] / row["transitionCount"] for row in rows))
            elif operation == "model": candidate["scorer"]["alpha"] = 2
            elif operation == "summary": candidate["scores"]["summary"]["total"]["mean"] += 1
            else: candidate["generatedBaseline"] = {"gap": 0}
            variants.append(candidate)
        for candidate in variants:
            with self.assertRaises(ValueError):
                module.validate(envelope(candidate), expected, joint)

    def test_numeric_tolerance_is_fixed_and_only_applies_to_scores(self):
        expected = {"scores": module.independent_scores(selected("a AH0\n"), model, joint)}
        nearby = copy.deepcopy(expected); nearby["scores"]["rows"][0]["total"] += 1e-12
        self.assertGreater(module.validate(envelope(nearby), expected, joint)["maximumAbsoluteError"], 0)
        far = copy.deepcopy(expected); far["scores"]["rows"][0]["total"] += 1e-5
        with self.assertRaises(ValueError): module.validate(envelope(far), expected, joint)
        bad_count = copy.deepcopy(expected); bad_count["scores"]["rows"][0]["phoneCount"] += 1e-12
        with self.assertRaises(ValueError): module.validate(envelope(bad_count), expected, joint)
        for invalid in [True, "-3", float("inf"), float("nan")]:
            candidate = envelope(expected); candidate["artifact"]["scores"]["rows"][0]["total"] = invalid
            with self.assertRaises(ValueError): module.validate(candidate, expected, joint)
        wrong_digest = envelope(expected); wrong_digest["digest"] = "changed"
        with self.assertRaises(ValueError): module.validate(wrong_digest, expected, joint)
        with self.assertRaises(ValueError): joint.strict_json('{"scores":{},"scores":{}}')

    def test_worst_numeric_witnesses_include_coordinates_values_and_first_ties(self):
        expected = {"scores": {"rows": [{"total": -10.0, "perTransition": -5.0}, {"total": -1.0, "perTransition": -0.5}]}}
        actual = copy.deepcopy(expected)
        delta = 2**-35
        actual["scores"]["rows"][0]["total"] += delta
        actual["scores"]["rows"][1]["total"] += delta
        result = module.validate(envelope(actual), expected, joint)
        absolute, relative = result["maximumAbsoluteErrorWitness"], result["maximumRelativeErrorWitness"]
        self.assertEqual(absolute["path"], ["scores", "rows", 0, "total"])
        self.assertEqual((absolute["actual"], absolute["reference"], absolute["absoluteError"]), (-10.0 + delta, -10.0, delta))
        self.assertEqual(relative["path"], ["scores", "rows", 1, "total"])
        self.assertEqual((relative["actual"], relative["reference"], relative["relativeError"]), (-1.0 + delta, -1.0, delta))
        exact = module.validate(envelope(expected), expected, joint)
        self.assertEqual(exact["maximumAbsoluteErrorWitness"]["path"], ["scores", "rows", 0, "total"])
        self.assertEqual(exact["maximumRelativeErrorWitness"]["path"], ["scores", "rows", 0, "total"])
        empty = module.validate(envelope({}), {}, joint)
        self.assertIsNone(empty["maximumAbsoluteErrorWitness"]); self.assertIsNone(empty["maximumRelativeErrorWitness"])
        zero = {"scores": {"rows": [{"total": 0.0}]}}
        result = module.validate(envelope(zero), zero, joint)
        self.assertIsNone(result["maximumRelativeError"])
        self.assertIsNotNone(result["maximumRelativeErrorWitness"])

    def test_immutable_inputs_and_fresh_report_path_guards(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve(); (root / "evaluation").mkdir(); (root / "src").mkdir()
            old = root / "old"; old.write_text("old")
            (root / "link").symlink_to(old); (root / "dangling").symlink_to(root / "absent")
            (root / "evidence-alias").symlink_to(root / "evaluation", target_is_directory=True)
            for path in [root / "link", root / "dangling"]:
                with self.assertRaises(ValueError): io.regular_bytes(path)
            for path in [old, root / "dangling", root / "src/new", root / "evidence-alias/new"]:
                with self.assertRaises(ValueError): io.report_path(root, path)
            self.assertEqual(io.report_path(root, root / "new"), root / "new")


if __name__ == "__main__":
    unittest.main()
