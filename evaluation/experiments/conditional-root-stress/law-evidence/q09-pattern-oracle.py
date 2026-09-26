"""Independent rational oracle for the declared continuous root-stress law.

Enumerates the literal legacy procedure on copied mark arrays. No production
transition, dynamic-programming, sampler or normalization code is imported.
The exact input grid is a separately frozen JSON protocol, not a search space.
"""
import argparse
from collections import defaultdict
from decimal import Decimal, localcontext
from fractions import Fraction
from functools import lru_cache
import gzip
import hashlib
import itertools
import json
import math
from pathlib import Path

U, P, S = "unmarked", "primary", "secondary"


def sha(data):
    return hashlib.sha256(data).hexdigest()


@lru_cache(maxsize=None)
def rational_log(value):
    assert value > 0
    results = []
    for precision in (100, 140):
        with localcontext() as context:
            context.prec = precision
            results.append((Decimal(value.numerator) / Decimal(value.denominator)).ln())
    assert abs(results[0] - results[1]) <= Decimal("1e-80")
    result = float(results[1])
    assert math.isfinite(result)
    return result


def mass(value):
    if value == 0:
        return {"status": "zero"}
    assert value > 0
    return {"status": "finite", "log": rational_log(value), "probability": float(value),
            "numerator": str(value.numerator), "denominator": str(value.denominator)}


def enumerate_histories(case):
    """Sum literal selected/failed-gate histories only after reaching a leaf."""
    n, primary = case["n"], case["primaryIndex"]
    assert n >= 1 and 0 <= primary < n
    heavy = case["operationalHeavy"]
    assert len(heavy) == n
    secondary, rhythmic = case["secondary"], case["rhythmic"]
    candidates = [i for i in range(n if secondary["candidateWindow"] == "all-nonprimary" else min(n, 3)) if i != primary]
    weights = [Fraction(secondary["heavyWeight"] if heavy[i] else secondary["lightWeight"]) for i in candidates]
    assert all(w >= 0 for w in weights)
    g, r = Fraction(secondary["probability"]) / 100, Fraction(rhythmic["probability"]) / 100
    assert 0 <= g <= 1 and 0 <= r <= 1
    all_patterns = defaultdict(Fraction)
    component_candidates = candidates if n > 1 and secondary["enabled"] else []
    components = {None: defaultdict(Fraction), **{i: defaultdict(Fraction) for i in component_candidates}}
    positive_histories = 0

    def emit(marks, probability, explicit):
        nonlocal positive_histories
        assert probability > 0
        pattern = tuple(marks)
        all_patterns[pattern] += probability
        components[explicit][pattern] += probability
        positive_histories += 1

    def rhythm(index, marks, probability, explicit):
        if not rhythmic["enabled"] or index >= n - 1:
            emit(marks, probability, explicit)
            return
        if marks[index] != U or (rhythmic["requireUnstressedNeighbors"] and (marks[index - 1] != U or marks[index + 1] != U)):
            rhythm(index + 1, marks, probability, explicit)
            return
        if r < 1:
            rhythm(index + 1, marks[:], probability * (1 - r), explicit)
        if r > 0:
            changed = marks[:]
            changed[index] = S
            rhythm(index + 1, changed, probability * r, explicit)

    initial = [P if i == primary else U for i in range(n)]
    if n == 1 or not secondary["enabled"] or not candidates:
        rhythm(1, initial, Fraction(1), None)
    else:
        total = sum(weights)
        selection = [w / total for w in weights] if total else [Fraction(int(i == len(candidates) - 1)) for i in range(len(candidates))]
        for index, probability in zip(candidates, selection):
            if probability == 0:
                continue
            # Keep distinct selected-candidate histories even after gate failure.
            if g < 1:
                rhythm(1, initial[:], probability * (1 - g), None)
            if g > 0:
                changed = initial[:]
                changed[index] = S
                rhythm(1, changed, probability * g, index)
    assert sum(all_patterns.values()) == 1
    reconstructed = defaultdict(Fraction)
    for patterns in components.values():
        for pattern, probability in patterns.items():
            reconstructed[pattern] += probability
    assert dict(reconstructed) == dict(all_patterns)
    return dict(all_patterns), components, positive_histories


def adjacency(pattern):
    return sum(a != U and b != U for a, b in zip(pattern, pattern[1:]))


def pattern_mask(pattern):
    return sum(1 << i for i, mark in enumerate(pattern) if mark == S)


def expected_case(case, factor, enumerated=None):
    prior, components, histories = enumerated or enumerate_histories(case)
    factor = Fraction(factor["numerator"], factor["denominator"])
    assert 0 < factor <= 1
    counts = []
    for k in range(case["n"]):
        eligible = {pattern: probability for pattern, probability in prior.items() if pattern.count(S) == k}
        tilted = {pattern: probability * factor ** adjacency(pattern) for pattern, probability in eligible.items()}
        partition = sum(tilted.values())
        component_masses = [{"explicitIndex": index,
                             "prior": mass(sum(patterns.values())),
                             "tiltedAtK": mass(sum(probability * factor ** adjacency(pattern) for pattern, probability in patterns.items() if pattern.count(S) == k))}
                            for index, patterns in components.items()]
        assert sum(sum(probability * factor ** adjacency(pattern) for pattern, probability in patterns.items() if pattern.count(S) == k) for patterns in components.values()) == partition
        patterns = [{"secondaryMask": str(pattern_mask(pattern)), "marks": list(pattern), "adjacencies": adjacency(pattern),
                     "prior": mass(eligible[pattern]), "tilted": mass(tilted[pattern]),
                     "conditional": mass(tilted[pattern] / partition)}
                    for pattern in sorted(eligible, key=pattern_mask)]
        if patterns:
            assert sum(tilted.values()) / partition == 1
            before = sum(probability * adjacency(pattern) for pattern, probability in eligible.items()) / sum(eligible.values())
            after = sum(probability * adjacency(pattern) for pattern, probability in tilted.items()) / partition
            assert after <= before
            variable_cost = len({adjacency(pattern) for pattern in eligible}) > 1
            assert (after < before) == (factor < 1 and variable_cost)
            expectation = {"before": {"numerator": str(before.numerator), "denominator": str(before.denominator), "value": float(before)},
                           "after": {"numerator": str(after.numerator), "denominator": str(after.denominator), "value": float(after)}, "strictDecrease": after < before,
                           "minimumSupportedAdjacencies": min(map(adjacency, eligible))}
        else:
            expectation = None
        counts.append({"secondaryCount": k, "partition": mass(partition), "components": component_masses,
                       "patterns": patterns, "expectedAdjacencies": expectation})
    return {"positiveLiteralHistories": histories, "distinctPriorPatterns": len(prior), "counts": counts}


def heavy_mask(name, n, primary):
    if name == "none": return [False] * n
    if name == "all": return [True] * n
    if name == "even-indices": return [i % 2 == 0 for i in range(n)]
    if name == "primary-index": return [i == primary for i in range(n)]
    if name == "last-index": return [i == n - 1 for i in range(n)]
    raise ValueError("Unknown fixed mask " + name)


def configuration(n, primary, window, neighbors, secondary_enabled, rhythm_enabled, g, r, weights, mask):
    return {"n": n, "primaryIndex": primary, "operationalHeavy": heavy_mask(mask, n, primary),
            "secondary": {"enabled": secondary_enabled, "candidateWindow": window, "probability": g,
                          "heavyWeight": weights[0], "lightWeight": weights[1]},
            "rhythmic": {"enabled": rhythm_enabled, "probability": r, "requireUnstressedNeighbors": neighbors}}


def grid_configurations(protocol):
    for grid_name in ["coreGrid", "extendedGrid"]:
        grid = protocol[grid_name]
        count = 0
        for n in grid["n"]:
            primaries = range(n) if grid_name == "coreGrid" else [0, n // 2, n - 1]
            for primary, window, neighbors, secondary_enabled, rhythm_enabled, g, r, weights, mask in itertools.product(
                primaries, grid["candidateWindow"], grid["requireUnstressedNeighbors"], grid["secondaryEnabled"],
                grid["rhythmicEnabled"], grid["secondaryPercent"], grid["rhythmicPercent"], grid["weightPairs"], grid["heavyMasks"]):
                yield grid_name, count, configuration(n, primary, window, neighbors, secondary_enabled, rhythm_enabled, g, r, weights, mask)
                count += 1
        assert count == grid["configuredCases"], (grid_name, count)


def long_configurations(protocol):
    grid = protocol["longRootChecks"]
    count = 0
    for n in grid["n"]:
        for primary, window, neighbors, gates in itertools.product([0, n // 2, n - 1], grid["candidateWindow"], grid["requireUnstressedNeighbors"], grid["gatePairs"]):
            yield "longRootChecks", count, configuration(n, primary, window, neighbors, True, True, *gates, grid["weights"], grid["heavyMask"])
            count += 1
    assert count == grid["configuredCases"]


def numeric_positive_configurations(protocol):
    names = {"tiny-explicit-gate", "tiny-rhythmic-gate", "near-unit-gate"}
    expressions = {"2^-1074": math.ldexp(1.0, -1074), "100-2^-46": 100 - math.ldexp(1.0, -46)}
    defaults = protocol["numericCaseDefaults"]
    selected = [case for case in protocol["numericCases"] if case["id"] in names]
    assert len(selected) == 3
    for ordinal, case in enumerate(selected):
        values = {**defaults, **case}
        def number(key):
            value = values[key]
            return expressions[value] if isinstance(value, str) else value
        yield "numericPositiveMass", ordinal, configuration(values["n"], values["primary"], values["window"], values["neighbors"],
            values["secondaryEnabled"], values["rhythmicEnabled"], number("secondaryPercent"), number("rhythmicPercent"), values["weights"], values["heavyMask"])


def write_grid(protocol_path, expected_protocol_sha, out):
    protocol_bytes = protocol_path.read_bytes()
    assert sha(protocol_bytes) == expected_protocol_sha
    protocol = json.loads(protocol_bytes)
    source_bytes = Path(__file__).read_bytes()
    total, grids = 0, defaultdict(int)
    assert not out.exists()
    # Exclusive raw file creation keeps interrupted output visible and immutable.
    with out.open("xb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", filename="", mtime=0) as archive:
        for section, ordinal, case in itertools.chain(grid_configurations(protocol), long_configurations(protocol), numeric_positive_configurations(protocol)):
            enumerated = enumerate_histories(case)
            factors = protocol["scoreFactors"] if section in ["coreGrid", "extendedGrid"] else [{"numerator": 1, "denominator": 2}]
            for factor_index, factor in enumerate(factors):
                record = {"id": f"{section}:{ordinal}:{factor_index}", "section": section, "ordinal": ordinal,
                          "case": case, "factor": factor, "expected": expected_case(case, factor, enumerated)}
                archive.write((json.dumps(record, separators=(",", ":"), allow_nan=False) + "\n").encode())
                total += 1
                grids[section] += 1
            if ordinal and ordinal % 5000 == 0:
                print(json.dumps({"section": section, "configuredCasesWritten": ordinal + 1, "factorCasesWritten": total}), flush=True)
    assert total == protocol["configurationFactorCases"] + protocol["longRootChecks"]["configuredCases"] + 3
    assert protocol_path.read_bytes() == protocol_bytes and Path(__file__).read_bytes() == source_bytes
    manifest = {"schemaVersion": 1, "protocolSha256": expected_protocol_sha, "oracleSha256": sha(source_bytes),
                "factorCases": total, "sectionCases": dict(grids), "compressedSha256": sha(out.read_bytes()),
                "compressedBytes": out.stat().st_size, "independentArithmetic": "Fraction literal histories; Decimal log precision100 checked at140",
                "scope": "declared real-valued law, not literal finite-grid RNG law or linguistic quality"}
    with Path(str(out) + ".manifest.json").open("x") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")
    print(json.dumps(manifest), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--protocol", type=Path, required=True)
    parser.add_argument("--protocol-sha", required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    write_grid(args.protocol, args.protocol_sha, args.out)
