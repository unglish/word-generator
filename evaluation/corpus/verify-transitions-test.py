"""Small independent fixtures only; no formal raw-source construction or scorer calls."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("transitions", Path(__file__).with_name("verify-transitions.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
joint = module.load_joint(module.ROOT)


class PairTests(unittest.TestCase):
    def test_single_phone_and_no_cross_word_pair(self):
        table = module.pair_table([["AH0"], ["IY1"]])
        self.assertEqual(table["counts"], {"#": {"AH0": 1, "IY1": 1}, "AH0": {"#": 1}, "IY1": {"#": 1}})
        self.assertEqual(table["total"], 4)
        with self.assertRaises(ValueError):
            module.pair_table([[]])

    def test_repeated_phones_and_stress_projection(self):
        entries, _, _, _ = joint.parser.count_source("a AH0 ER0\nb AH1 ER1\nc AH2 ER2\nd T T AH0\n")
        table = module.transitions(joint, entries)
        self.assertEqual(table["native"]["counts"]["T"]["T"], 1)
        self.assertEqual(table["base"]["counts"]["AH"]["ER"], 3)
        self.assertEqual(table["base"]["total"], 13)
        self.assertEqual(table["native"]["counts"]["AH2"]["ER2"], 1)

    def test_shared_parser_rejects_whole_unsupported_pronunciation(self):
        entries, _, excluded, _ = joint.parser.count_source("same BAD\nSAME S EY1 M # comment\nsame S AH0 M\nsame(2) S EY2 M\ncafé K AE1 F\nhm HH M\n")
        self.assertEqual([entry["spelling"] for entry in entries], ["same"])
        self.assertEqual(excluded, {"unsupported_pronunciation": 1, "duplicate_spelling": 1, "alternate_pronunciation": 1, "non_ascii_spelling": 1, "no_vowel": 1})

    def test_rehashed_margin_preserving_forgery_is_rejected(self):
        table = module.pair_table([["AH0", "AH0"], ["ER1", "ER1"]])
        expected = {"transitions": table}
        candidate = copy.deepcopy(expected)
        rows = candidate["transitions"]["counts"]
        rows["AH0"]["AH0"] -= 1; rows["ER1"]["ER1"] -= 1
        rows["AH0"]["ER1"] = 1; rows["ER1"]["AH0"] = 1
        self.assertEqual({key: sum(row.values()) for key, row in rows.items()}, table["rowTotals"])
        with self.assertRaises(ValueError):
            joint.validate({"artifact": candidate, "digest": joint.digest(candidate)}, expected)

    def test_missing_extra_fraction_boolean_and_source_forgery(self):
        expected = {"counts": {"AH": {"ER": 2}}, "sources": [{"path": "counter.ts", "content": "trusted"}]}
        cases = []
        for value in [0.5, -1, True]:
            candidate = copy.deepcopy(expected); candidate["counts"]["AH"]["ER"] = value; cases.append(candidate)
        candidate = copy.deepcopy(expected); del candidate["counts"]["AH"]; cases.append(candidate)
        candidate = copy.deepcopy(expected); candidate["counts"]["EXTRA"] = {}; cases.append(candidate)
        candidate = copy.deepcopy(expected); candidate["sources"][0]["content"] = "untrusted"; cases.append(candidate)
        for candidate in cases:
            with self.assertRaises(ValueError):
                joint.validate({"artifact": candidate, "digest": joint.digest(candidate)}, expected)

    def test_report_writer_protects_missing_source_targets_and_aliases(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            (root / "src").mkdir(); (root / "evidence").mkdir()
            (root / "evaluation").symlink_to(root / "evidence", target_is_directory=True)
            for destination in [root / "src/new.json", root / "evidence/new.json"]:
                with self.assertRaises(ValueError):
                    module.report_path(root, destination)
            self.assertEqual(module.report_path(root, root / "fresh.json"), root / "fresh.json")
            (root / "old").write_text("old")
            (root / "dangling").symlink_to(root / "absent")
            for destination in [root / "old", root / "dangling"]:
                with self.assertRaises(ValueError):
                    module.report_path(root, destination)

    def test_rejects_duplicate_json_and_symlink_inputs(self):
        with self.assertRaises(ValueError):
            joint.strict_json('{"counts":{},"counts":{}}')
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory).resolve(); source = directory / "source"; source.write_text("test")
            link = directory / "alias"; link.symlink_to(source)
            with self.assertRaises(ValueError):
                module.regular_bytes(link)
            self.assertEqual(module.regular_bytes(source), b"test")


if __name__ == "__main__":
    unittest.main()
