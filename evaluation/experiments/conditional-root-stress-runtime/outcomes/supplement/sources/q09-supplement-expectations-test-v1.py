"""Synthetic, hand-derived checks; no archive or outcome report is opened."""
from copy import deepcopy
from decimal import Decimal, localcontext
from fractions import Fraction
import json
import math
from pathlib import Path
from types import ModuleType
import unittest

HERE = Path(__file__).parent
FROZEN_ORACLE = Path("/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator/evaluation/experiments/conditional-root-stress/law-evidence/q09-pattern-oracle.py")


def module(name, path):
    result = ModuleType(name)
    result.__file__ = str(path)
    exec(compile(path.read_bytes(), str(path), "exec"), result.__dict__)
    return result


reference = module("supplement_expectations", HERE / "q09-supplement-expectations-v1.py")
oracle = module("literal_history_oracle", FROZEN_ORACLE)
U, P, S = reference.U, reference.P, reference.S


def context(n=3, primary=0, k=1, penalty=math.log(2), heavy=None, **settings):
    secondary = {"enabled": True, "candidateWindow": "all-nonprimary", "probability": 100,
                 "heavyWeight": 1, "lightWeight": 1}
    secondary.update(settings.pop("secondary", {}))
    rhythmic = {"enabled": False, "probability": 40, "requireUnstressedNeighbors": True}
    rhythmic.update(settings.pop("rhythmic", {}))
    if settings:
        raise ValueError(settings)
    return {"analysis": {"input": {
        "beforePrimary": [U] * n, "afterPrimary": [P if index == primary else U for index in range(n)],
        "operationalHeavy": [False] * n if heavy is None else heavy,
        "secondary": secondary, "rhythmic": rhythmic, "lambda": penalty}, "secondaryCount": k}}


def fraction(value):
    return Fraction(int(value["numerator"]), int(value["denominator"]))


def exact(result, feature):
    return fraction(result["expectations"][feature]["originalExact"])


def tilted(result, feature):
    return Decimal(result["expectations"][feature]["tiltedDecimal"])


class SupplementalExpectationsTests(unittest.TestCase):
    def test_hand_two_pattern_tilt_uses_exact_binary64_lambda(self):
        result = reference.expectation_context(context(heavy=[True, False, True]), oracle)
        self.assertEqual(exact(result, "adjacentMarkedPairs"), Fraction(1, 2))
        self.assertEqual(result["lambdaExactBinary64Decimal"], str(Decimal.from_float(math.log(2))))
        with localcontext() as arithmetic:
            arithmetic.prec = 140
            factor = (-Decimal.from_float(math.log(2))).exp()
            adjacent = factor / (1 + factor)
            separated = 1 / (1 + factor)
            self.assertLess(abs(tilted(result, "adjacentMarkedPairs") - adjacent), Decimal("1e-138"))
            self.assertLess(abs(tilted(result, "secondaryByIndex:2") - separated), Decimal("1e-138"))
            self.assertNotEqual(adjacent, Decimal(1) / 3)
        self.assertTrue(result["support"]["strictAdjacencyDecreaseByLaw"])
        coverage = result["operationalHeavySecondaryCoverage"]
        self.assertEqual(coverage["denominator"], 1)
        self.assertEqual(fraction(coverage["originalRatioExact"]), Fraction(1, 2))
        self.assertEqual(Decimal(coverage["tiltedRatioDecimal"]), tilted(result, "secondaryByIndex:2"))
        self.assertEqual(exact(result, "operationalHeavyCount"), 2)

    def test_zero_lambda_identity_retains_exact_original_rationals(self):
        result = reference.expectation_context(context(n=4, primary=3, penalty=0), oracle)
        self.assertEqual(exact(result, "adjacentMarkedPairs"), Fraction(1, 3))
        self.assertFalse(result["support"]["strictAdjacencyDecreaseByLaw"])
        with localcontext() as arithmetic:
            arithmetic.prec = 140
            for values in result["expectations"].values():
                value = fraction(values["originalExact"])
                self.assertEqual(Decimal(values["tiltedDecimal"]), Decimal(value.numerator) / value.denominator)
        self.assertEqual(fraction(result["normalization"]["originalExact"]), 1)

    def test_fixed_adjacent_disyllabic_support_has_exact_integer_references(self):
        for primary in (0, 1):
            result = reference.expectation_context(context(n=2, primary=primary), oracle)
            self.assertEqual(result["support"]["positivePatterns"], 1)
            self.assertFalse(result["support"]["strictAdjacencyDecreaseByLaw"])
            self.assertEqual(result["support"]["minimumSupportedAdjacencies"], 1)
            self.assertEqual(exact(result, "adjacentMarkedPairs"), 1)
            self.assertEqual(tilted(result, "adjacentMarkedPairs"), 1)
            self.assertEqual(result["patterns"][0]["tiltedConditionalProbability"], "1")

    def test_zero_probability_patterns_remain_explicit_and_unfloored(self):
        result = reference.expectation_context(context(n=4, primary=3, secondary={"heavyWeight": 0, "lightWeight": 0}), oracle)
        rows = {row["pattern"]: row for row in result["patterns"]}
        self.assertEqual(set(rows), {"SUUP", "USUP", "UUSP"})
        self.assertEqual(result["support"]["zeroPatterns"], 2)
        for name in ("SUUP", "USUP"):
            self.assertFalse(rows[name]["supported"])
            self.assertEqual(fraction(rows[name]["originalUnconditionalMass"]), 0)
            self.assertEqual(rows[name]["tiltedConditionalProbability"], "0")
        self.assertTrue(rows["UUSP"]["supported"])
        self.assertEqual(fraction(rows["UUSP"]["originalConditionalProbability"]), 1)

    def test_maximal_run_placement_lengths_and_thresholds(self):
        marks = [U, U, P, U, U, U, S, U, U]
        features = reference.pattern_features(marks)
        for position, length in (("initial", 2), ("internal", 3), ("final", 2)):
            self.assertEqual(features[f"unmarkedRun:{position}:length:{length}:count"], 1)
            self.assertEqual(features[f"unmarkedRun:{position}:ge2:wordsWith"], 1)
        self.assertEqual(features["unmarkedRun:all:ge2:count"], 3)
        self.assertEqual(features["unmarkedRun:all:ge2:wordsWith"], 1)
        self.assertEqual(features["unmarkedRun:all:ge3:count"], 1)
        self.assertEqual(features["unmarkedRun:all:length:2:count"], 2)
        self.assertEqual(features["unmarkedRun:whole-word:count"], 0)
        self.assertTrue(all(type(value) is int for value in features.values()))

    def test_whole_word_run_is_not_double_counted_as_two_edges(self):
        features = reference.pattern_features([U] * 4)
        self.assertEqual(features["unmarkedRun:whole-word:length:4:count"], 1)
        self.assertEqual(features["unmarkedRun:all:count"], 1)
        self.assertEqual(features["unmarkedRun:initial:count"], 0)
        self.assertEqual(features["unmarkedRun:final:count"], 0)
        self.assertEqual(features["unmarkedRun:whole-word:ge3:wordsWith"], 1)

    def test_no_unmarked_runs_and_single_syllable_edge_count(self):
        features = reference.pattern_features([S], [True])
        self.assertEqual(features["secondaryCount"], 1)
        self.assertEqual(features["secondaryEdgeCount"], 1)
        self.assertEqual(features["secondaryInteriorCount"], 0)
        self.assertEqual(features["unmarkedRun:all:count"], 0)

    def test_exact_positions_partition_fixed_k_and_edge_interior(self):
        case = context(n=6, primary=5, k=2, secondary={"enabled": False},
                       rhythmic={"enabled": True, "probability": 100})
        result = reference.expectation_context(case, oracle)
        self.assertEqual(exact(result, "secondaryCount"), 2)
        self.assertEqual(exact(result, "secondaryByIndex:1"), 1)
        self.assertEqual(exact(result, "secondaryByIndex:3"), 1)
        self.assertEqual(exact(result, "secondaryEdgeCount"), 0)
        self.assertEqual(exact(result, "secondaryInteriorCount"), 2)
        self.assertEqual(sum(exact(result, f"secondaryByIndex:{index}") for index in range(6)), 2)

    def test_monosyllable_and_zero_k_preserve_null_coverage(self):
        result = reference.expectation_context(context(n=1, primary=0, k=0, heavy=[True]), oracle)
        self.assertEqual(result["patterns"][0]["pattern"], "P")
        self.assertEqual(exact(result, "operationalHeavyCount"), 1)
        self.assertEqual(exact(result, "operationalHeavySecondaryDenominator"), 0)
        self.assertIsNone(result["operationalHeavySecondaryCoverage"]["originalRatioExact"])
        self.assertIsNone(result["operationalHeavySecondaryCoverage"]["tiltedRatioDecimal"])

    def test_fixed_k_zero_has_hand_derived_run_expectations(self):
        case = context(n=6, primary=2, k=0, secondary={"probability": 0})
        result = reference.expectation_context(case, oracle)
        self.assertEqual(exact(result, "unmarkedRun:initial:length:2:count"), 1)
        self.assertEqual(exact(result, "unmarkedRun:final:length:3:count"), 1)
        self.assertEqual(exact(result, "unmarkedRun:all:ge2:count"), 2)
        self.assertEqual(exact(result, "unmarkedRun:all:ge2:wordsWith"), 1)
        self.assertEqual(exact(result, "unmarkedRun:all:ge3:count"), 1)
        self.assertEqual(exact(result, "unmarkedRun:whole-word:count"), 0)
        features = reference.pattern_features([U, U, P, U, U, U], [False] * 6)
        for name, value in features.items():
            self.assertEqual(exact(result, name), value)
            self.assertEqual(tilted(result, name), value)

    def test_tiny_positive_gate_mass_is_not_a_zero_support_pattern(self):
        gate = math.ldexp(1.0, -1074)
        result = reference.expectation_context(context(secondary={"probability": gate}), oracle)
        self.assertEqual(fraction(result["partitions"]["originalExact"]), Fraction(gate) / 100)
        self.assertEqual(result["support"]["positivePatterns"], 2)
        for row in result["patterns"]:
            self.assertTrue(row["supported"])
            self.assertGreater(Decimal(row["tiltedUnnormalizedMass"]), 0)
            self.assertGreater(Decimal(row["tiltedConditionalProbability"]), 0)

    def test_unknown_quantity_and_unavailable_operational_weight_are_not_inferred(self):
        result = reference.expectation_context(context(), oracle)
        self.assertEqual(result["nuclearQuantityCoverage"]["availability"], "unavailable")
        features = reference.pattern_features([P, U, S])
        self.assertFalse(any(name.startswith("operationalHeavy") for name in features))
        self.assertFalse(any("quantity" in name.lower() or "origin" in name.lower() for name in features))
        with self.assertRaises(ValueError):
            reference.pattern_features([P, U, S], [False, None, True])

    def test_duplicate_histories_are_summed_by_supplied_oracle(self):
        case = context(n=4, primary=3, secondary={"candidateWindow": "first-three", "probability": 40},
                       rhythmic={"enabled": True, "probability": 40})
        result = reference.expectation_context(case, oracle.enumerate_histories)
        rows = {row["pattern"]: row for row in result["patterns"]}
        self.assertEqual(fraction(rows["USUP"]["originalUnconditionalMass"]), Fraction(28, 75))
        self.assertEqual(fraction(rows["USUP"]["originalConditionalProbability"]), Fraction(28, 48))
        self.assertGreater(result["positiveLiteralHistoriesBeforeConditioning"], result["distinctPriorPatternsBeforeConditioning"])

    def test_precision_stability_covers_pattern_law_and_all_metric_values(self):
        result = reference.expectation_context(context(n=9, primary=4, heavy=[True, False, True] * 3), oracle)
        stability = result["numerics"]["stability"]
        self.assertEqual(stability["precisions"], [100, 140])
        self.assertTrue(stability["passed"])
        self.assertGreater(stability["comparedDecimalValues"], len(result["expectations"]) + 2 * len(result["patterns"]))
        self.assertLessEqual(Decimal(stability["maximumAbsoluteDifference"]), Decimal("1e-80"))
        self.assertGreater(len(result["patterns"][0]["tiltedConditionalProbability"]), 100)

    def test_combinatorial_strictness_does_not_claim_a_rounded_difference(self):
        result = reference.expectation_context(context(penalty=1e-300), oracle)
        self.assertTrue(result["support"]["strictAdjacencyDecreaseByLaw"])
        self.assertEqual(tilted(result, "adjacentMarkedPairs"), Decimal("0.5"))

    def test_inputs_untouched_and_production_claims_are_not_references(self):
        case = context()
        case["analysis"]["rows"] = [{"marks": ["invented"], "after": 123}]
        case["proposalPatterns"] = {"invented": -1}
        original = deepcopy(case)
        expected = reference.expectation_context(case, oracle)
        self.assertEqual(case, original)
        self.assertEqual(exact(expected, "adjacentMarkedPairs"), Fraction(1, 2))
        json.dumps(expected, allow_nan=False)
        expected["input"]["operationalHeavy"][0] = True
        self.assertEqual(case, original)

    def test_zero_support_k_fails_explicitly(self):
        case = context(k=0)
        with self.assertRaisesRegex(ValueError, "zero literal-history support"):
            reference.expectation_context(case, oracle)

    def test_invalid_inputs_fail_before_oracle_and_booleans_are_not_integers(self):
        cases = [context(n=10), context(k=True), context(penalty=True), context(penalty=float("nan")),
                 context(heavy=[0, 0, 0]), context(secondary={"enabled": 1}),
                 context(secondary={"probability": True}), context(secondary={"heavyWeight": -1}),
                 context(rhythmic={"requireUnstressedNeighbors": 1})]
        for case in cases:
            with self.subTest(case=case), self.assertRaises(ValueError):
                reference.expectation_context(case, lambda _: self.fail("invalid input reached oracle"))

    def test_mutating_oracle_cannot_modify_caller_input(self):
        case = context()
        before = deepcopy(case)
        def mutating_oracle(source):
            result = oracle.enumerate_histories(source)
            source["secondary"]["enabled"] = False
            source["operationalHeavy"][0] = True
            return result
        reference.expectation_context(case, mutating_oracle)
        self.assertEqual(case, before)

    def test_decimal_ambient_precision_does_not_change_results(self):
        with localcontext() as arithmetic:
            arithmetic.prec = 7
            low_ambient = reference.expectation_context(context(), oracle)
        with localcontext() as arithmetic:
            arithmetic.prec = 70
            high_ambient = reference.expectation_context(context(), oracle)
        self.assertEqual(low_ambient, high_ambient)


if __name__ == "__main__":
    unittest.main()
