"""Pure supplemental references for the declared conditional root-pattern law.

The caller supplies the accepted literal-history oracle. No production law,
archive reader, source discovery, or output writer is imported or executed.
Original references are exact Fractions; tilted references retain all digits of
Decimal calculations at precision 140, independently checked at precision 100.
"""
from collections import defaultdict
from copy import deepcopy
from decimal import Decimal, Underflow, localcontext
from fractions import Fraction
import itertools
import math

U, P, S = "unmarked", "primary", "secondary"
RUN_POSITIONS = ("all", "initial", "internal", "final", "whole-word")
PRECISIONS = (100, 140)
STABILITY_TOLERANCE = Decimal("1e-80")


def _require(condition, message):
    if not condition:
        raise ValueError(message)


def _integer(value, lower, upper, name):
    _require(type(value) is int and lower <= value <= upper,
             f"{name} must be an integer in [{lower}, {upper}]")
    return value


def _number(value, name):
    _require(type(value) in (int, float), f"{name} must be a finite number")
    try:
        finite = math.isfinite(value)
    except OverflowError:
        finite = False
    _require(finite, f"{name} must be a finite binary64-compatible number")
    return value


def _marks(marks):
    _require(isinstance(marks, (list, tuple)) and len(marks) > 0,
             "marks must be a nonempty list or tuple")
    _require(all(type(mark) is str and mark in (U, P, S) for mark in marks),
             "marks must contain only unmarked, primary, or secondary")


def _heavy(heavy, n):
    _require(isinstance(heavy, (list, tuple)) and len(heavy) == n,
             "operationalHeavy must match the mark count")
    _require(all(type(value) is bool for value in heavy),
             "operationalHeavy values must be booleans")


def _run_position(start, end, n):
    if start == 0 and end == n:
        return "whole-word"
    if start == 0:
        return "initial"
    if end == n:
        return "final"
    return "internal"


def pattern_features(marks, operational_heavy=None):
    """Integer features of an actual snapshot or a hypothetical law pattern.

    Runs are maximal, nonoverlapping unmarked sequences. A whole-word run is
    neither an initial nor a final run. ``wordsWith`` is a per-pattern indicator,
    so its expectation is a probability; ``count`` may exceed one. Missing
    operational weight omits heavy features, rather than treating it as light.
    Quantity and assignment provenance cannot be recovered from these inputs.
    """
    _marks(marks)
    n = len(marks)
    if operational_heavy is not None:
        _heavy(operational_heavy, n)
    adjacency = sum(a != U and b != U for a, b in zip(marks, marks[1:]))
    secondary = [index for index, mark in enumerate(marks) if mark == S]
    features = {
        "adjacentMarkedPairs": adjacency,
        "wordsWithAdjacentMarkedPairs": int(adjacency > 0),
        "secondaryCount": len(secondary),
        "secondaryEdgeCount": sum(index in (0, n - 1) for index in secondary),
        "secondaryInteriorCount": sum(0 < index < n - 1 for index in secondary),
    }
    features.update({f"secondaryByIndex:{index}": int(mark == S)
                     for index, mark in enumerate(marks)})
    lengths = {position: [] for position in RUN_POSITIONS}
    start = 0
    while start < n:
        if marks[start] != U:
            start += 1
            continue
        end = start + 1
        while end < n and marks[end] == U:
            end += 1
        length = end - start
        lengths["all"].append(length)
        lengths[_run_position(start, end, n)].append(length)
        start = end
    for position, runs in lengths.items():
        counts = {"": len(runs), "ge2": sum(length >= 2 for length in runs),
                  "ge3": sum(length >= 3 for length in runs)}
        counts.update({f"length:{length}": runs.count(length) for length in range(1, n + 1)})
        for qualifier, count in counts.items():
            prefix = f"unmarkedRun:{position}:" + (qualifier + ":" if qualifier else "")
            features[prefix + "count"] = count
            features[prefix + "wordsWith"] = int(count > 0)
    if operational_heavy is not None:
        features.update({
            "operationalHeavyCount": sum(operational_heavy),
            "operationalHeavySecondaryNumerator": sum(operational_heavy[index] for index in secondary),
            "operationalHeavySecondaryDenominator": sum(
                heavy and mark != P for heavy, mark in zip(operational_heavy, marks)),
        })
    return features


def _validated_input(context):
    analysis = context["analysis"]
    source = analysis["input"]
    _marks(source["beforePrimary"])
    n = _integer(len(source["beforePrimary"]), 1, 9, "root length")
    _require(source["beforePrimary"] == [U] * n, "beforePrimary must be wholly unmarked")
    marks = source["afterPrimary"]
    _marks(marks)
    _require(len(marks) == n and marks.count(P) == 1 and S not in marks,
             "afterPrimary must contain exactly one primary and no secondary")
    _heavy(source["operationalHeavy"], n)
    for name in ("secondary", "rhythmic"):
        settings = source[name]
        _require(type(settings["enabled"]) is bool, f"{name}.enabled must be boolean")
        probability = _number(settings["probability"], f"{name}.probability")
        _require(0 <= probability <= 100, f"{name}.probability must be in [0, 100]")
    secondary, rhythmic = source["secondary"], source["rhythmic"]
    _require(secondary["candidateWindow"] in ("first-three", "all-nonprimary"),
             "secondary.candidateWindow is unsupported")
    for field in ("heavyWeight", "lightWeight"):
        _require(_number(secondary[field], f"secondary.{field}") >= 0,
                 f"secondary.{field} must be nonnegative")
    _require(type(rhythmic["requireUnstressedNeighbors"]) is bool,
             "rhythmic.requireUnstressedNeighbors must be boolean")
    penalty = _number(source["lambda"], "lambda")
    _require(penalty >= 0, "lambda must be nonnegative")
    k = _integer(analysis["secondaryCount"], 0, n - 1, "secondaryCount")
    return source, n, marks.index(P), k, Decimal.from_float(float(penalty))


def _fraction_record(value):
    return {"numerator": str(value.numerator), "denominator": str(value.denominator)}


def _decimal(value):
    return Decimal(value.numerator) / Decimal(value.denominator)


def _pattern_key(marks):
    return "".join({U: "U", P: "P", S: "S"}[mark] for mark in marks)


def _complete_patterns(n, primary, k):
    positions = [index for index in range(n) if index != primary]
    patterns = []
    for selected in itertools.combinations(positions, k):
        marks = [U] * n
        marks[primary] = P
        for index in selected:
            marks[index] = S
        patterns.append(tuple(marks))
    return sorted(patterns, key=lambda marks: sum(1 << index for index, mark in enumerate(marks) if mark == S))


def _enumerated_prior(oracle, case):
    enumerate_histories = oracle if callable(oracle) else oracle.enumerate_histories
    prior, _, histories = enumerate_histories(deepcopy(case))
    _require(isinstance(prior, dict) and prior, "literal-history oracle must return a nonempty prior")
    _require(type(histories) is int and histories >= len(prior), "invalid positive literal-history count")
    for marks, mass in prior.items():
        _marks(marks)
        _require(type(marks) is tuple and len(marks) == case["n"] and marks.count(P) == 1
                 and marks[case["primaryIndex"]] == P, "oracle returned an invalid primary pattern")
        _require(type(mass) is Fraction and mass > 0, "oracle prior masses must be positive Fractions")
    _require(sum(prior.values(), Fraction()) == 1, "literal-history prior must normalize exactly")
    return prior, histories


def _feature_masses(eligible, feature_vectors):
    names = tuple(next(iter(feature_vectors.values())))
    by_cost = {name: defaultdict(Fraction) for name in names}
    for pattern, mass in eligible.items():
        features = feature_vectors[pattern]
        cost = features["adjacentMarkedPairs"]
        for name, value in features.items():
            if value:
                by_cost[name][cost] += mass * value
    return by_cost


def _tilted_reference(eligible, features, feature_masses, penalty, precision):
    with localcontext() as arithmetic:
        arithmetic.prec = precision
        arithmetic.traps[Underflow] = True
        factor = (-penalty).exp()
        costs = {features[pattern]["adjacentMarkedPairs"] for pattern in eligible}
        powers = {cost: factor ** cost for cost in costs}
        masses = {pattern: _decimal(mass) * powers[features[pattern]["adjacentMarkedPairs"]]
                  for pattern, mass in eligible.items()}
        _require(all(mass.is_finite() and mass > 0 for mass in masses.values()),
                 "Decimal reference cannot represent positive tilted support")
        original_partition = sum(eligible.values(), Fraction())
        identical_conditional = penalty == 0 or len(costs) == 1
        partition = sum(masses.values(), Decimal())
        if identical_conditional:
            partition = _decimal(original_partition) * (Decimal(1) if penalty == 0 else powers[next(iter(costs))])
        probabilities = {pattern: (_decimal(eligible[pattern] / original_partition) if identical_conditional else mass / partition)
                         for pattern, mass in masses.items()}
        expectations = {}
        for name, mass_by_cost in feature_masses.items():
            values = {features[pattern][name] for pattern in eligible}
            if identical_conditional:
                expectations[name] = _decimal(sum(mass_by_cost.values(), Fraction()) / original_partition)
            elif len(values) == 1:
                expectations[name] = Decimal(next(iter(values)))
            else:
                expectations[name] = sum((_decimal(mass) * powers[cost]
                                          for cost, mass in mass_by_cost.items()), Decimal()) / partition
        denominator = expectations["operationalHeavySecondaryDenominator"]
        ratio = expectations["operationalHeavySecondaryNumerator"] / denominator if denominator else None
        if denominator and identical_conditional:
            numerator_mass = sum(feature_masses["operationalHeavySecondaryNumerator"].values(), Fraction())
            denominator_mass = sum(feature_masses["operationalHeavySecondaryDenominator"].values(), Fraction())
            ratio = _decimal(numerator_mass / denominator_mass)
        return {"partition": partition, "logPartition": partition.ln(),
                "probabilities": probabilities, "masses": masses, "expectations": expectations,
                "normalization": sum(probabilities.values(), Decimal()), "heavyCoverageRatio": ratio}


def _decimal_leaves(value, path=()):
    if isinstance(value, dict):
        for name, item in value.items():
            yield from _decimal_leaves(item, (*path, name))
    elif value is not None:
        yield path, value


def _stability(low, high):
    low_values, high_values = dict(_decimal_leaves(low)), dict(_decimal_leaves(high))
    _require(low_values.keys() == high_values.keys(), "precision runs disagree on reference shape")
    with localcontext() as arithmetic:
        arithmetic.prec = 160
        maximum = max(abs(low_values[name] - value) for name, value in high_values.items())
    _require(maximum <= STABILITY_TOLERANCE, "precision 100/140 reference stability failed")
    return {"precisions": list(PRECISIONS), "comparedDecimalValues": len(high_values),
            "maximumAbsoluteDifference": str(maximum), "absoluteTolerance": str(STABILITY_TOLERANCE),
            "passed": True}


def expectation_context(context, oracle):
    """JSON-safe independent references for one actual input and observed K.

    Only ``context['analysis']['input']`` and ``['secondaryCount']`` are read;
    production analytical rows and observed frequencies are never references.
    The oracle is a supplied module exposing ``enumerate_histories(case)`` or
    that callable itself. No quantity, realized history, or population-level
    interpretation is inferred. An unsupported K fails instead of disappearing.
    """
    source, n, primary, k, penalty = _validated_input(context)
    case = {"n": n, "primaryIndex": primary, "operationalHeavy": source["operationalHeavy"],
            "secondary": source["secondary"], "rhythmic": source["rhythmic"]}
    prior, histories = _enumerated_prior(oracle, case)
    eligible = {pattern: mass for pattern, mass in prior.items() if pattern.count(S) == k}
    _require(bool(eligible), "actual secondaryCount has zero literal-history support")
    complete = _complete_patterns(n, primary, k)
    features = {pattern: pattern_features(pattern, source["operationalHeavy"]) for pattern in complete}
    feature_masses = _feature_masses(eligible, features)
    original_partition = sum(eligible.values(), Fraction())
    original = {name: sum(by_cost.values(), Fraction()) / original_partition
                for name, by_cost in feature_masses.items()}
    low, high = [_tilted_reference(eligible, features, feature_masses, penalty, precision)
                 for precision in PRECISIONS]
    stability = _stability(low, high)
    with localcontext() as arithmetic:
        arithmetic.prec = 160
        normalization_error = abs(high["normalization"] - 1)
    _require(normalization_error <= STABILITY_TOLERANCE, "tilted reference normalization failed")
    costs = {features[pattern]["adjacentMarkedPairs"] for pattern in eligible}
    denominator = original["operationalHeavySecondaryDenominator"]
    original_ratio = original["operationalHeavySecondaryNumerator"] / denominator if denominator else None
    rows = []
    for pattern in complete:
        mass = eligible.get(pattern, Fraction())
        rows.append({"pattern": _pattern_key(pattern), "marks": list(pattern), "supported": bool(mass),
                     "adjacentMarkedPairs": features[pattern]["adjacentMarkedPairs"],
                     "originalUnconditionalMass": _fraction_record(mass),
                     "originalConditionalProbability": _fraction_record(mass / original_partition),
                     "tiltedUnnormalizedMass": str(high["masses"].get(pattern, Decimal())),
                     "tiltedConditionalProbability": str(high["probabilities"].get(pattern, Decimal()))})
    return {
        "schemaVersion": 1, "scope": "declared-continuous-law; actual-returned-input-conditioned-on-K",
        "input": deepcopy(source), "rootLength": n, "primaryIndex": primary, "secondaryCount": k,
        "lambdaExactBinary64Decimal": str(penalty), "positiveLiteralHistoriesBeforeConditioning": histories,
        "distinctPriorPatternsBeforeConditioning": len(prior),
        "support": {"completeSamePrimaryKPatterns": len(complete), "positivePatterns": len(eligible),
                    "zeroPatterns": len(complete) - len(eligible), "minimumSupportedAdjacencies": min(costs),
                    "maximumSupportedAdjacencies": max(costs), "adjacencyCostVaries": len(costs) > 1,
                    "strictAdjacencyDecreaseByLaw": penalty > 0 and len(costs) > 1},
        "partitions": {"originalExact": _fraction_record(original_partition),
                       "tiltedDecimal": str(high["partition"]), "tiltedLogDecimal": str(high["logPartition"])},
        "normalization": {"originalExact": _fraction_record(sum((mass / original_partition for mass in eligible.values()), Fraction())),
                          "tiltedDecimal": str(high["normalization"]),
                          "tiltedAbsoluteError": str(normalization_error),
                          "absoluteTolerance": str(STABILITY_TOLERANCE)},
        "patterns": rows,
        "expectations": {name: {"originalExact": _fraction_record(value), "tiltedDecimal": str(high["expectations"][name])}
                         for name, value in original.items()},
        "operationalHeavySecondaryCoverage": {
            "definition": "secondary-marked operational-heavy syllables / operational-heavy nonprimary syllables",
            "numeratorFeature": "operationalHeavySecondaryNumerator",
            "denominatorFeature": "operationalHeavySecondaryDenominator",
            "denominator": denominator.numerator,
            "originalRatioExact": _fraction_record(original_ratio) if original_ratio is not None else None,
            "tiltedRatioDecimal": str(high["heavyCoverageRatio"]) if high["heavyCoverageRatio"] is not None else None,
        },
        "nuclearQuantityCoverage": {"availability": "unavailable", "reason": "operational input contains no nuclear quantity metadata"},
        "numerics": {"tiltedReferencePrecision": 140, "stability": stability,
                     "interpretation": "Finite-precision references are not exact real numbers; strict decrease is classified from positive support and lambda, never from a rounded difference."},
    }
