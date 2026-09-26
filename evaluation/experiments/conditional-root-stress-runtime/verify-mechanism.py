"""Independent literal-history check; never imports production law or sampler code."""
from collections import Counter
from decimal import Decimal, localcontext
from fractions import Fraction
from types import ModuleType
import itertools
import math
import sys
from pathlib import Path

if sys.flags.optimize:
    raise RuntimeError("Verification requires Python assertions enabled (no -O/PYTHONOPTIMIZE).")

ORACLE_PATH = Path(__file__).parents[1] / "conditional-root-stress/law-evidence/q09-pattern-oracle.py"
oracle = ModuleType("frozen_q09_literal_histories")
oracle.__file__ = str(ORACLE_PATH)
exec(compile(ORACLE_PATH.read_bytes(), str(ORACLE_PATH), "exec"), oracle.__dict__)
U, P, S = "unmarked", "primary", "secondary"


def integer(value, lower, upper):
    assert type(value) is int and lower <= value <= upper
    return value


def number(value):
    assert type(value) in (int, float) and math.isfinite(value)
    return value


def close(actual, expected, log=False):
    actual = number(actual)
    reference = float(expected)
    assert math.isfinite(reference)
    assert abs(actual - reference) <= (2e-10 if log else 1e-12), (actual, reference)
    if not log and abs(reference) >= 1e-12:
        assert abs(actual - reference) / abs(reference) <= 1e-10


def dec(value):
    return Decimal(value.numerator) / Decimal(value.denominator)


def key(marks):
    assert all(mark in (U, P, S) for mark in marks)
    return "".join({U: "U", P: "P", S: "S"}[mark] for mark in marks)


def check_mass(observed, expected):
    if not expected:
        assert observed == {"status": "zero"}
    else:
        assert set(observed) == {"status", "value"} and observed["status"] == "finite"
        close(observed["value"], expected.ln(), log=True)


def verify_context(context):
    """Check every same-primary/K pattern, including absent literal histories."""
    analysis = context["analysis"]
    source = analysis["input"]
    n = integer(len(source["beforePrimary"]), 1, 9)
    assert source["beforePrimary"] == [U] * n
    marks = source["afterPrimary"]
    assert len(marks) == n and marks.count(P) == 1 and all(mark in (U, P) for mark in marks)
    primary = marks.index(P)
    assert len(source["operationalHeavy"]) == n and all(type(value) is bool for value in source["operationalHeavy"])
    for settings in (source["secondary"], source["rhythmic"]):
        assert type(settings["enabled"]) is bool
        assert 0 <= number(settings["probability"]) <= 100
    assert type(source["rhythmic"]["requireUnstressedNeighbors"]) is bool
    assert source["secondary"]["candidateWindow"] in ("first-three", "all-nonprimary")
    for field in ("heavyWeight", "lightWeight"):
        assert number(source["secondary"][field]) >= 0
    penalty = number(source["lambda"])
    assert penalty > 0
    k = integer(analysis["secondaryCount"], 0, n - 1)
    case = {"n": n, "primaryIndex": primary, "operationalHeavy": source["operationalHeavy"],
            "secondary": source["secondary"], "rhythmic": source["rhythmic"]}
    prior, _, _ = oracle.enumerate_histories(case)
    eligible = {pattern: mass for pattern, mass in prior.items() if pattern.count(S) == k}
    assert eligible
    positions = [index for index in range(n) if index != primary]
    complete = set()
    for secondary in itertools.combinations(positions, k):
        complete.add(tuple(P if index == primary else S if index in secondary else U for index in range(n)))
    rows = {tuple(row["marks"]): row for row in analysis["rows"]}
    assert len(rows) == len(analysis["rows"]) and set(rows) == complete
    original_partition = sum(eligible.values(), Fraction())
    references = []
    for precision in (100, 140):
        with localcontext() as ctx:
            ctx.prec = precision
            factor = (-Decimal.from_float(float(penalty))).exp()
            tilted = {pattern: dec(mass) * factor ** oracle.adjacency(pattern) for pattern, mass in eligible.items()}
            partition = sum(tilted.values())
            costs = {oracle.adjacency(pattern) for pattern in eligible}
            exact_before = sum((mass * oracle.adjacency(pattern) for pattern, mass in eligible.items()), Fraction()) / original_partition
            expected_before = dec(exact_before)
            expected_after = (Decimal(next(iter(costs))) if len(costs) == 1 else
                              sum(mass / partition * oracle.adjacency(pattern) for pattern, mass in tilted.items()))
            references.append((partition, expected_before, expected_after))
            if precision == 100:
                continue
            close(analysis["originalLogPartition"], dec(original_partition).ln(), log=True)
            close(analysis["tiltedLogPartition"], partition.ln(), log=True)
            for pattern, row in rows.items():
                adjacency = oracle.adjacency(pattern)
                integer(row["adjacentMarkedPairs"], 0, n - 1)
                assert row["adjacentMarkedPairs"] == adjacency
                mass = eligible.get(pattern, Fraction())
                moved = tilted.get(pattern, Decimal())
                check_mass(row["prior"], dec(mass))
                check_mass(row["tilted"], moved)
                if not mass:
                    assert type(row["before"]) in (int, float) and row["before"] == 0
                    assert type(row["after"]) in (int, float) and row["after"] == 0
                else:
                    close(row["before"], dec(mass / original_partition))
                    close(row["after"], moved / partition)
            costs = {oracle.adjacency(pattern) for pattern in eligible}
            expectation = analysis["expectation"]
            assert type(expectation["supportCostVaries"]) is bool and expectation["supportCostVaries"] == (len(costs) > 1)
            assert type(expectation["strictDecreaseExpected"]) is bool and expectation["strictDecreaseExpected"] == (len(costs) > 1)
            assert (expected_after < expected_before) == (len(costs) > 1)
            integer(expectation["minimumSupportedAdjacencies"], 0, n - 1)
            assert expectation["minimumSupportedAdjacencies"] == min(costs)
            close(expectation["before"], expected_before); close(expectation["after"], expected_after)
            for field in ("before", "after"):
                total = sum(number(row[field]) for row in rows.values())
                assert abs(total - 1) <= 2e-12
                close(analysis["normalization"][field], total)
    assert all(abs(a - b) <= Decimal("1e-80") for a, b in zip(*references))
    count = integer(context["observedWords"], 1, 200000)
    supported = {key(pattern) for pattern in eligible}
    for field in ("proposalPatterns", "appliedPatterns"):
        assert set(context[field]) <= supported
        assert sum(integer(value, 1, count) for value in context[field].values()) == count
    return {"words": count, "queries": len(complete), "positive": len(eligible), "zero": len(complete) - len(eligible)}
