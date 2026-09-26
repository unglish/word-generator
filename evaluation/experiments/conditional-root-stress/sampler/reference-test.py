"""Adversarial tests of independent structural/mathematical checks; no production runs."""
from copy import deepcopy
from fractions import Fraction as F
import importlib.util
import json
from pathlib import Path
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("sampler_reference", HERE / "reference.py")
ref = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ref)
HAND = json.loads((HERE / "fixtures/hand-samples.json").read_bytes())


def reference(n=4, primary=3, neighbors=True, g=40):
    case = ref.oracle.configuration(n, primary, "first-three", neighbors, True, True, g, 40, [1, 1], "all")
    return ref.HistoryReference(case, 1)


class SamplerReferenceTests(unittest.TestCase):
    def check(self, name, value=None, row=None, consumed=None):
        entry = HAND[name] if value is None else value
        model = reference(5, 4, False, 0) if name == "backward" else reference()
        return model.verify_sample(entry["sample"], HAND["row"] if row is None else row,
                                   entry["consumed"] if consumed is None else consumed)

    def test_hand_rational_witnesses_pass(self):
        self.assertEqual(self.check("duplicate"), (ref.U, ref.S, ref.U, ref.P))
        self.assertEqual(self.check("backward"), (ref.U, ref.S, ref.U, ref.U, ref.P))

    def test_prefix_sums_all_final_counts_and_divides_component_prior(self):
        model = reference(5, 4, False, 0)
        self.assertEqual(model.prefix_candidates(0, 1, True, 1), [F(2, 5), F()])
        # Conditioning the complete histories on K first would incorrectly give 1/3 here.
        prior_at_k = sum(p for pattern, p in model.prior.items() if pattern.count(ref.S) == 1)
        wrong = sum(p for pattern, p in model.prior.items() if pattern.count(ref.S) == 1 and pattern[1] == ref.S) / prior_at_k
        self.assertEqual(wrong, F(1, 3))
        self.assertNotEqual(wrong, F(2, 5))
        duplicate = reference()
        self.assertEqual(duplicate.prefix_candidates(0, 1, True, 1), [F(2, 5), F()])
        self.assertEqual(duplicate.component_priors[0], F(3, 5))

    def test_suffix_check_conditions_final_k_separately(self):
        model = reference(5, 4, False, 0)
        self.assertEqual(model.prefix_candidates(0, 4, True, 1), [F(36, 125), F(9, 125)])
        self.assertEqual(model.suffix_candidates(0, [ref.P]), [F(4, 5), F(1, 5)])

    def test_ideal_grid_sums_duplicate_histories_and_keeps_normalization(self):
        model = reference()
        grid = model.ideal_grid()
        self.assertEqual(sum(grid.values()), 1)
        self.assertEqual(set(grid), set(model.continuous))
        self.assertLessEqual(sum(abs(grid.get(p, 0) - value) for p, value in model.continuous.items()) / 2, F(7, ref.GRID))
        self.assertEqual(ref.ceil_grid(F(1, 2)), ref.GRID // 2)
        self.assertEqual(ref.ceil_grid(F(1, ref.GRID * 2)), 1)
        self.assertEqual(ref.ceil_grid(F(0)), 0)
        self.assertEqual(ref.ceil_grid(F(1)), ref.GRID)

    def test_coherent_wrong_branch_is_node_responsibility_not_python_libm(self):
        # This is mathematically consistent but its first takeCandidate=false at u=0
        # contradicts the actual Node predicate. The pinned Node checker rejects it.
        self.assertEqual(self.check("coherentWrongNumericBranch"), (ref.S, ref.U, ref.U, ref.P))

    def test_wrong_mass_and_lost_duplicate_history_fail(self):
        for path in ["partition", "component", "prior", "conditional", "tail"]:
            with self.subTest(path=path):
                value = deepcopy(HAND["duplicate"])
                sample = value["sample"]
                if path == "partition": sample["count"]["logPartition"]["value"] += 0.1
                elif path == "component": sample["count"]["components"][0]["prior"]["value"] += 0.1
                elif path == "prior": sample["selectedPatternPriorLogMass"] = ref.oracle.rational_log(F(10, 75))
                elif path == "conditional": sample["selectedPatternConditionalLogMass"] += 0.1
                else: sample["componentDraws"][0]["logRemainingMass"] += 0.1
                with self.assertRaises(ValueError): self.check("duplicate", value)

    def test_missing_extra_draw_wrong_row_and_ordinal_fail(self):
        for mutation in ["missing", "extra", "row", "ordinal", "consumed"]:
            with self.subTest(mutation=mutation):
                value = deepcopy(HAND["duplicate"])
                if mutation == "missing": value["sample"]["componentDraws"] = []
                elif mutation == "extra": value["sample"]["componentDraws"] *= 2
                elif mutation == "row": value["sample"]["componentDraws"][0]["uniform"] = 0.5
                elif mutation == "ordinal": value["sample"]["componentDraws"][0]["drawOrdinal"] = 1
                else: value["consumed"] += 1
                with self.assertRaises(ValueError): self.check("duplicate", value)

    def test_predecessor_forced_label_and_count_corruptions_fail(self):
        for mutation in ["predecessor", "forced", "count", "primary"]:
            with self.subTest(mutation=mutation):
                value = deepcopy(HAND["backward"])
                if mutation == "predecessor": value["sample"]["backward"][2]["previousMarked"] = False
                elif mutation == "forced": value["sample"]["backward"][0]["kind"] = "forced"
                elif mutation == "count": value["sample"]["backward"][0]["remainingSecondaryCount"] = 0
                else: value["sample"]["marks"][0] = ref.P
                with self.assertRaises(ValueError): self.check("backward", value)

    def test_boolean_integer_coordinates_are_rejected(self):
        paths = [("count", "secondaryCount"), ("count", "components", 2, "component", "syllableIndex"),
                 ("componentDraws", 0, "candidateIndex"), ("componentDraws", 0, "remainingFromIndex"),
                 ("componentDraws", 0, "drawOrdinal"), ("selectedComponentIndex",),
                 ("backward", 2, "syllableIndex"), ("backward", 2, "remainingSecondaryCount")]
        for path in paths:
            with self.subTest(path=path):
                value = deepcopy(HAND["duplicate"])
                target = value["sample"]
                for key in path[:-1]: target = target[key]
                target[path[-1]] = bool(target[path[-1]])
                with self.assertRaises(ValueError): self.check("duplicate", value)

    def test_zero_support_and_unknown_fields_fail(self):
        value = deepcopy(HAND["backward"])
        value["sample"]["count"]["components"][1]["prior"] = {"status": "finite", "value": -1000}
        with self.assertRaises(ValueError): self.check("backward", value)
        value = deepcopy(HAND["duplicate"])
        value["sample"]["future"] = True
        with self.assertRaises(ValueError): self.check("duplicate", value)

    def test_input_and_prior_verification_are_not_mutated(self):
        saved = deepcopy(HAND)
        model = reference()
        first = model.verify_sample(HAND["duplicate"]["sample"], HAND["row"], 1)
        self.assertEqual(HAND, saved)
        altered = deepcopy(HAND["duplicate"])
        altered["sample"]["marks"][0] = ref.S
        with self.assertRaises(ValueError): model.verify_sample(altered["sample"], HAND["row"], 1)
        self.assertEqual(model.verify_sample(HAND["duplicate"]["sample"], HAND["row"], 1), first)


if __name__ == "__main__":
    unittest.main()
