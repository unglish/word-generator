import copy
from decimal import Decimal
from fractions import Fraction
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import ModuleType
import unittest

HERE = Path(__file__).resolve().parent


def load(name):
    path = HERE / f"q09-supplement-{name}-v1.py"
    module = ModuleType(name)
    module.__file__ = str(path)
    exec(compile(path.read_bytes(), str(path), "exec"), module.__dict__)
    return module


m = load("run")
e = load("expectations")


class HandOracle:
    @staticmethod
    def enumerate_histories(case):
        p, s, u = "primary", "secondary", "unmarked"
        return {(p, s, u): Fraction(1, 2), (p, u, s): Fraction(1, 2)}, {}, 2


def context_and_reference():
    source = {"beforePrimary": ["unmarked"] * 3, "afterPrimary": ["primary", "unmarked", "unmarked"],
              "operationalHeavy": [True, True, False], "lambda": 0.6931471805599453,
              "secondary": {"enabled": True, "probability": 100, "candidateWindow": "first-three", "heavyWeight": 1, "lightWeight": 1},
              "rhythmic": {"enabled": False, "probability": 0, "requireUnstressedNeighbors": True}}
    context = {"analysis": {"input": source, "secondaryCount": 1}}
    reference = e.expectation_context(context, HandOracle())
    rows = []
    for row in reference["patterns"]:
        original = m.decimal_fraction(row["originalUnconditionalMass"])
        tilted = Decimal(row["tiltedUnnormalizedMass"])
        rows.append({"marks": row["marks"], "adjacentMarkedPairs": row["adjacentMarkedPairs"],
                     "prior": {"status": "finite", "value": float(original.ln())}, "tilted": {"status": "finite", "value": float(tilted.ln())},
                     "before": float(m.fraction(row["originalConditionalProbability"])), "after": float(row["tiltedConditionalProbability"])})
    adjacency = reference["expectations"]["adjacentMarkedPairs"]
    context["analysis"].update({"rows": rows, "normalization": {"before": 1, "after": 1}, "expectation": {"before": float(m.fraction(adjacency["originalExact"])),
        "after": float(adjacency["tiltedDecimal"]), "supportCostVaries": True, "strictDecreaseExpected": True, "minimumSupportedAdjacencies": 0},
        "originalLogPartition": float(m.decimal_fraction(reference["partitions"]["originalExact"]).ln()),
        "tiltedLogPartition": float(reference["partitions"]["tiltedLogDecimal"])})
    return context, reference


class RunnerTests(unittest.TestCase):
    def test_reference_checks_tolerances_without_using_node_rows_as_reference(self):
        context, reference = context_and_reference()
        m.verify_reference(context, reference)
        context["analysis"]["rows"][0]["after"] += 0.01
        with self.assertRaises(AssertionError):
            m.verify_reference(context, reference)

    def test_zero_support_and_support_minimum_corruptions_fail(self):
        context, reference = context_and_reference()
        context["analysis"]["rows"][0]["prior"] = {"status": "zero"}
        with self.assertRaises(AssertionError):
            m.verify_reference(context, reference)

    def test_exact_zero_cannot_be_replaced_with_a_tiny_probability(self):
        context, reference = context_and_reference()
        absent = copy.deepcopy(reference["patterns"][0])
        absent.update({"marks": ["unmarked", "primary", "secondary"], "supported": False,
                       "originalUnconditionalMass": {"numerator": "0", "denominator": "1"},
                       "originalConditionalProbability": {"numerator": "0", "denominator": "1"},
                       "tiltedUnnormalizedMass": "0", "tiltedConditionalProbability": "0"})
        reference["patterns"].append(absent)
        context["analysis"]["rows"].append({"marks": absent["marks"], "adjacentMarkedPairs": absent["adjacentMarkedPairs"],
            "prior": {"status": "zero"}, "tilted": {"status": "zero"}, "before": 1e-13, "after": 1e-13})
        with self.assertRaises(AssertionError):
            m.verify_reference(context, reference)

    def test_false_reported_normalization_fails(self):
        context, reference = context_and_reference()
        context["analysis"]["normalization"]["after"] = 1.01
        with self.assertRaises(AssertionError):
            m.verify_reference(context, reference)
        context, reference = context_and_reference()
        context["analysis"]["expectation"]["minimumSupportedAdjacencies"] = 1
        with self.assertRaises(AssertionError):
            m.verify_reference(context, reference)

    def test_retained_context_weighting_pools_denominator_not_average_ratios(self):
        _, reference = context_and_reference()
        other = copy.deepcopy(reference)
        for key in ("operationalHeavySecondaryNumerator", "operationalHeavySecondaryDenominator"):
            other["expectations"][key] = {"originalExact": {"numerator": "0", "denominator": "1"}, "tiltedDecimal": "0"}
        report = m.standardized_expectations({"hand": {"counts": {"words": 4}, "contextUses": {"a": 1, "b": 3}}}, {"a": reference, "b": other})
        coverage = report["groups"]["hand"]["pooledHeavySecondaryCoverage"]
        self.assertEqual(coverage["eligibleHeavyNonprimarySyllables"], 1)
        self.assertEqual(m.fraction(coverage["originalRatioExact"]), Fraction(1, 2))
        self.assertIn("retained-context", report["scope"])

    def test_empty_heavy_denominator_yields_unavailable_ratios(self):
        _, reference = context_and_reference()
        for key in ("operationalHeavySecondaryNumerator", "operationalHeavySecondaryDenominator"):
            reference["expectations"][key] = {"originalExact": {"numerator": "0", "denominator": "1"}, "tiltedDecimal": "0"}
        result = m.standardized_expectations({"hand": {"counts": {"words": 1}, "contextUses": {"a": 1}}}, {"a": reference})
        coverage = result["groups"]["hand"]["pooledHeavySecondaryCoverage"]
        self.assertIsNone(coverage["originalRatioExact"])
        self.assertIsNone(coverage["tiltedRatioDecimal"])

    def test_constructor_failure_is_preserved_exclusively(self):
        with tempfile.TemporaryDirectory(prefix="q09-supplement-run-test-", dir=HERE) as directory:
            source = Path(directory) / "spec.json"
            source.write_text("{}\n")
            report = Path(directory) / "failure.json"
            with self.assertRaises(Exception):
                m.run_exclusive(source, "0" * 64, report)
            result = json.loads(report.read_text())
            self.assertFalse(result["passed"])
            retained = report.read_bytes()
            with self.assertRaises(Exception):
                m.run_exclusive(source, "0" * 64, report)
            self.assertEqual(report.read_bytes(), retained)

    def test_optimized_python_is_rejected_with_a_retained_failure(self):
        with tempfile.TemporaryDirectory(prefix="q09-supplement-run-test-", dir=HERE) as directory:
            source = Path(directory) / "spec.json"
            source.write_text("{}\n")
            report = Path(directory) / "failure.json"
            result = subprocess.run([sys.executable, "-B", "-O", str(HERE / "q09-supplement-run-v1.py"), str(source), "0" * 64, str(report)],
                                    capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("assertions enabled", json.loads(report.read_text())["error"]["message"])


if __name__ == "__main__":
    unittest.main()
