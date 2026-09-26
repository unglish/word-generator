"""Hand-derived witnesses for the independent literal-history oracle."""
from copy import deepcopy
from fractions import Fraction as F
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("oracle", Path(__file__).with_name("q09-pattern-oracle.py"))
oracle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oracle)


def example(n=4, primary=3, window="first-three", neighbors=True, secondary=True, rhythmic=True,
            g=40, r=40, weights=(1, 1), mask="all"):
    return oracle.configuration(n, primary, window, neighbors, secondary, rhythmic, g, r, weights, mask)


def by_mask(prior):
    return {oracle.pattern_mask(pattern): value for pattern, value in prior.items()}


class LiteralOracleTests(unittest.TestCase):
    def test_duplicate_histories_sum_before_tilting(self):
        case = example()
        prior, components, histories = oracle.enumerate_histories(case)
        self.assertEqual(by_mask(prior), {0: F(27, 75), 1: F(10, 75), 2: F(28, 75), 4: F(10, 75)})
        self.assertGreater(histories, len(prior))
        self.assertEqual(by_mask(components[None]), {0: F(27, 75), 2: F(18, 75)})
        expected = oracle.expected_case(case, {"numerator": 1, "denominator": 2})
        row = expected["counts"][1]
        self.assertEqual({int(p["secondaryMask"]): F(int(p["conditional"]["numerator"]), int(p["conditional"]["denominator"])) for p in row["patterns"]},
                         {1: F(10, 43), 2: F(28, 43), 4: F(5, 43)})
        self.assertTrue(row["expectedAdjacencies"]["strictDecrease"])

    def test_disyllabic_count_one_cannot_move(self):
        for primary in [0, 1]:
            case = example(2, primary)
            prior, _, _ = oracle.enumerate_histories(case)
            self.assertEqual(by_mask(prior), {0: F(3, 5), 1 << (1 - primary): F(2, 5)})
            for denominator in [1, 2, 4]:
                row = oracle.expected_case(case, {"numerator": 1, "denominator": denominator})["counts"][1]
                self.assertEqual(len(row["patterns"]), 1)
                self.assertEqual(row["patterns"][0]["conditional"]["probability"], 1)
                self.assertFalse(row["expectedAdjacencies"]["strictDecrease"])

    def test_all_zero_selects_last_candidate(self):
        for window, expected_index in [("first-three", 1), ("all-nonprimary", 3)]:
            prior, _, _ = oracle.enumerate_histories(example(4, 2, window, g=100, r=0, weights=(0, 0)))
            self.assertEqual(by_mask(prior), {1 << expected_index: F(1)})

    def test_directional_updates_and_neighbor_toggle(self):
        prior, _, _ = oracle.enumerate_histories(example(6, 5, g=0, r=100))
        self.assertEqual(by_mask(prior), {(1 << 1) | (1 << 3): F(1)})
        prior, _, _ = oracle.enumerate_histories(example(5, 4, neighbors=False, g=0, r=100))
        self.assertEqual(by_mask(prior), {14: F(1)})

    def test_failed_gate_retains_distinct_selection_histories(self):
        prior, components, histories = oracle.enumerate_histories(example(g=0, r=0))
        self.assertEqual(by_mask(prior), {0: F(1)})
        self.assertEqual(histories, 3)
        self.assertEqual(sum(components[None].values()), 1)
        self.assertTrue(all(not table for key, table in components.items() if key is not None))

    def test_disabled_and_monosyllabic_have_only_none_component(self):
        for case in [example(secondary=False, rhythmic=False, g=100, r=100), example(1, 0, g=100, r=100)]:
            prior, components, histories = oracle.enumerate_histories(case)
            self.assertEqual(by_mask(prior), {0: F(1)})
            self.assertEqual(list(components), [None])
            self.assertEqual(histories, 1)

    def test_weights_and_individual_zero_support(self):
        prior, _, _ = oracle.enumerate_histories(example(g=100, r=0, weights=(7, 3), mask="even-indices"))
        self.assertEqual(by_mask(prior), {1: F(7, 17), 2: F(3, 17), 4: F(7, 17)})
        prior, _, _ = oracle.enumerate_histories(example(g=100, r=0, weights=(0, 1), mask="even-indices"))
        self.assertEqual(by_mask(prior), {2: F(1)})

    def test_inputs_unchanged_and_long_masks_are_decimal_strings(self):
        case = example(128, 127, "all-nonprimary", g=100, r=0, weights=(0, 0))
        before = deepcopy(case)
        expected = oracle.expected_case(case, {"numerator": 1, "denominator": 2})
        self.assertEqual(case, before)
        self.assertEqual(expected["counts"][1]["patterns"][0]["secondaryMask"], str(1 << 126))

    def test_finite_grid_counts_match_frozen_protocol(self):
        import json
        protocol_path = Path(__file__).resolve().parents[1] / "protocol/q09-dp-oracle-protocol-v2.json"
        protocol_bytes = protocol_path.read_bytes()
        self.assertEqual(oracle.sha(protocol_bytes), "93c09bc77c513a5933ba146a31884fcba7947828ed6901ea95d97bd03b6852f2")
        protocol = json.loads(protocol_bytes)
        counts = {}
        for section, _, _ in oracle.grid_configurations(protocol):
            counts[section] = counts.get(section, 0) + 1
        self.assertEqual(counts, {"coreGrid": 75600, "extendedGrid": 864})
        self.assertEqual(sum(1 for _ in oracle.long_configurations(protocol)), 192)

    def test_positive_mass_can_underflow_its_binary64_display(self):
        import math
        tiny = math.ldexp(1.0, -1074)
        case = example(g=tiny, r=0)
        row = oracle.expected_case(case, {"numerator": 1, "denominator": 2})["counts"][1]
        self.assertEqual(row["partition"]["status"], "finite")
        self.assertEqual(row["partition"]["probability"], 0.0)
        self.assertLess(row["partition"]["log"], -740)
        case = example(3, 0, neighbors=False, g=0, r=tiny)
        row = oracle.expected_case(case, {"numerator": 1, "denominator": 2})["counts"][1]
        self.assertEqual(row["patterns"][0]["marks"], [oracle.P, oracle.S, oracle.U])
        self.assertEqual(row["partition"]["status"], "finite")

    def test_near_unit_gate_uses_exact_binary64_input_as_rational(self):
        import math
        g = 100 - math.ldexp(1.0, -46)
        prior, _, _ = oracle.enumerate_histories(example(3, 2, g=g, r=0))
        self.assertEqual(by_mask(prior)[0], F(1, 100 * (1 << 46)))


if __name__ == "__main__":
    unittest.main()
