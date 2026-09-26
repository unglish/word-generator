"""Explicit archived-word supplement entry point. Never generates words."""
import argparse
from decimal import Decimal, localcontext
from fractions import Fraction
import json
import math
from pathlib import Path
import sys
from types import ModuleType

HERE = Path(__file__).resolve().parent
SOURCE_NAMES = [f"q09-supplement-{part}-v1.py" for part in
                ("authority", "authority-test", "expectations", "expectations-test", "observe", "observe-test", "run", "run-test")]
SOURCE_NAMES.append("q09-supplement-contract-v1.md")


def load_module(name, path):
    module = ModuleType(name)
    module.__file__ = str(path)
    exec(compile(path.read_bytes(), str(path), "exec"), module.__dict__)
    return module


def fraction(value):
    return Fraction(int(value["numerator"]), int(value["denominator"]))


def decimal_fraction(value):
    result = fraction(value)
    return Decimal(result.numerator) / Decimal(result.denominator)


def close(actual, expected, logarithm=False):
    assert type(actual) in (int, float) and math.isfinite(actual)
    value = Decimal(actual) if type(actual) is int else Decimal.from_float(actual)
    tolerance = Decimal("2e-10" if logarithm else "1e-12")
    assert abs(value - expected) <= tolerance
    if not logarithm and abs(expected) >= Decimal("1e-12"):
        assert abs(value - expected) / abs(expected) <= Decimal("1e-10")


def verify_reference(context, reference):
    """The independent law supplies support and values; frozen Node rows are claims."""
    with localcontext() as arithmetic:
        arithmetic.prec = 160
        rows = {tuple(row["marks"]): row for row in context["analysis"]["rows"]}
        assert len(rows) == len(context["analysis"]["rows"])
        assert set(rows) == {tuple(row["marks"]) for row in reference["patterns"]}
        for expected in reference["patterns"]:
            actual = rows[tuple(expected["marks"])]
            assert type(actual["adjacentMarkedPairs"]) is int and actual["adjacentMarkedPairs"] == expected["adjacentMarkedPairs"]
            for kind, mass in (("prior", decimal_fraction(expected["originalUnconditionalMass"])),
                               ("tilted", Decimal(expected["tiltedUnnormalizedMass"]))):
                if not expected["supported"]:
                    assert actual[kind] == {"status": "zero"} and mass == 0
                else:
                    assert set(actual[kind]) == {"status", "value"} and actual[kind]["status"] == "finite"
                    close(actual[kind]["value"], mass.ln(), logarithm=True)
            if not expected["supported"]:
                for field in ("before", "after"):
                    assert type(actual[field]) in (int, float) and actual[field] == 0
            else:
                close(actual["before"], decimal_fraction(expected["originalConditionalProbability"]))
                close(actual["after"], Decimal(expected["tiltedConditionalProbability"]))
        for field in ("before", "after"):
            total = sum(Decimal.from_float(float(row[field])) for row in rows.values())
            assert abs(total - 1) <= Decimal("2e-12")
            close(context["analysis"]["normalization"][field], total)
        expectation = context["analysis"]["expectation"]
        support = reference["support"]
        assert type(expectation["supportCostVaries"]) is bool and expectation["supportCostVaries"] == support["adjacencyCostVaries"]
        assert type(expectation["strictDecreaseExpected"]) is bool and expectation["strictDecreaseExpected"] == support["strictAdjacencyDecreaseByLaw"]
        assert type(expectation["minimumSupportedAdjacencies"]) is int and expectation["minimumSupportedAdjacencies"] == support["minimumSupportedAdjacencies"]
        adjacency = reference["expectations"]["adjacentMarkedPairs"]
        close(expectation["before"], decimal_fraction(adjacency["originalExact"]))
        close(expectation["after"], Decimal(adjacency["tiltedDecimal"]))
        close(context["analysis"]["originalLogPartition"], decimal_fraction(reference["partitions"]["originalExact"]).ln(), logarithm=True)
        close(context["analysis"]["tiltedLogPartition"], Decimal(reference["partitions"]["tiltedLogDecimal"]), logarithm=True)


def standardized_expectations(groups, references):
    """Pooled expectations at retained contexts; not pre-rejection sampling claims."""
    result = {}
    with localcontext() as arithmetic:
        arithmetic.prec = 140
        for name, group in groups.items():
            uses = group["contextUses"]
            if not uses:
                continue
            count = sum(uses.values())
            assert count == group["counts"]["words"]
            totals = {}
            for context_id, frequency in uses.items():
                assert type(frequency) is int and frequency > 0
                for feature, value in references[context_id]["expectations"].items():
                    total = totals.setdefault(feature, [Fraction(), Decimal()])
                    total[0] += fraction(value["originalExact"]) * frequency
                    total[1] += Decimal(value["tiltedDecimal"]) * frequency
            metrics = {}
            for feature, (original, tilted) in totals.items():
                mean = original / count
                metrics[feature] = {"originalMeanExact": {"numerator": str(mean.numerator), "denominator": str(mean.denominator)},
                                    "tiltedMeanDecimal": str(tilted / count)}
            original_denominator, tilted_denominator = totals["operationalHeavySecondaryDenominator"]
            original_numerator, tilted_numerator = totals["operationalHeavySecondaryNumerator"]
            assert original_denominator >= 0 and original_denominator.denominator == 1
            if original_denominator:
                ratio = original_numerator / original_denominator
                original_ratio = {"numerator": str(ratio.numerator), "denominator": str(ratio.denominator)}
            else:
                original_ratio = None
            result[name] = {"retainedContextUses": count, "metrics": metrics,
                            "pooledHeavySecondaryCoverage": {"originalRatioExact": original_ratio,
                            "tiltedRatioDecimal": str(tilted_numerator / tilted_denominator) if tilted_denominator else None,
                            "eligibleHeavyNonprimarySyllables": int(original_denominator)}}
    return {"scope": "retained-context-standardized continuous-law expectations; no unbiased rejected-attempt or machine-frequency inference",
            "groups": result}


def reconcile_previous(aggregator, report, domains):
    assert aggregator.words == report["completedWords"]
    for name, group in aggregator.groups.items():
        if name == "total":
            old = report["groups"]["total"]
        elif name.startswith("stream:"):
            old = report["groups"]["streams"][name.removeprefix("stream:")]
        elif name.startswith("profile:") and "/" not in name:
            old = report["groups"]["profiles"][name.removeprefix("profile:")]
        elif "/morphology:" in name:
            key = name.removeprefix("profile:").replace("/morphology:", "/", 1)
            old = report["groups"]["strata"][key]
        else:
            continue
        current, previous = group["counts"], old["counts"]
        assert current["words"] == previous["words"] and current["rootSyllables"] == previous["rootSyllables"]
        assert group["contextUses"] == old["contextUses"]
        for domain in domains:
            observed = current.get(f"{domain}:availability:observed:words", 0)
            unavailable = current.get(f"{domain}:availability:not-executed:words", 0) + current.get(f"{domain}:availability:unavailable-historical:words", 0)
            assert observed == previous.get(f"{domain}:observedWords", 0)
            assert unavailable == previous.get(f"{domain}:unavailableWords", 0)
            if observed:
                for new_key, old_key in (("primaryMarks", "primaryMarks"), ("secondaryMarks", "secondaryMarks"),
                                         ("adjacentMarkedPairs", "adjacentPairs"), ("syllables", "syllables")):
                    assert current[f"{domain}:{new_key}"] == previous[f"{domain}:{old_key}"]


def analyze(authority):
    observation = load_module("q09_supplement_observe", HERE / "q09-supplement-observe-v1.py")
    expectation = load_module("q09_supplement_expectations", HERE / "q09-supplement-expectations-v1.py")
    oracle_path = Path(authority.frozen["root"]) / "evaluation/experiments/conditional-root-stress/law-evidence/q09-pattern-oracle.py"
    oracle = ModuleType("frozen_independent_literal_history_oracle")
    oracle.__file__ = str(oracle_path)
    exec(compile(oracle_path.read_bytes(), str(oracle_path), "exec"), oracle.__dict__)
    proof_pins = [record for record in authority.spec["evidence"] if Path(record["path"]).name == "q09-runtime-independent-proof-v1.json"]
    assert len(proof_pins) == 1
    proof = json.loads(Path(proof_pins[0]["path"]).read_bytes())
    assert proof["schemaVersion"] == "q09-independent-runtime-recount-v1" and proof["passed"] is True
    assert proof["freezeSha256"] == authority.spec["freeze"]["sha256"]
    assert proof["analysisSha256"] == authority.spec["variants"]["active"]["report"]["sha256"]
    assert proof["manifestSha256"] == authority.spec["variants"]["active"]["manifest"]["sha256"]
    contexts = {}
    references = {}
    for context in authority.reports["active"]["contexts"]:
        context_id = context["id"]
        assert context_id not in contexts
        assert observation.digest({"input": context["analysis"]["input"], "secondaryCount": context["analysis"]["secondaryCount"]}) == context_id
        contexts[context_id] = context
        references[context_id] = expectation.expectation_context(context, oracle)
        verify_reference(context, references[context_id])
    assert len(contexts) == proof["contexts"]
    variants = {}
    for variant in ("control", "active"):
        aggregator = observation.Aggregator()
        at = None
        try:
            for draw in authority.iter_draws(variant):
                at = {key: draw[key] for key in ("profile", "seed", "drawIndex")}
                assert type(draw["word"]["trace"]["stressPattern"]["version"]) is int
                assert draw["word"]["trace"]["stressPattern"]["version"] == (1 if variant == "control" else 2)
                measured = observation.observe_word(draw["word"], authority.frozen["configs"][variant], contexts)
                aggregator.add(draw, measured)
            variants[variant] = aggregator.reconcile()
            reconcile_previous(aggregator, authority.reports[variant], observation.ROOT_DOMAINS + observation.WORD_DOMAINS)
            if variant == "active":
                assert aggregator.words == proof["words"]
                assert set(aggregator.context_patterns) == set(contexts)
                for context_id, observed in aggregator.context_patterns.items():
                    assert observed == {key: contexts[context_id][key] for key in observed}
                variants[variant]["conditionalExpectations"] = standardized_expectations(aggregator.groups, references)
        except Exception as error:
            raise RuntimeError(f"Supplement failed in {variant} at {at}: {error}") from error
    return {"schemaVersion": "q09-runtime-archived-supplement-v1", "scope": "preregistered broader endpoints from retained archived words; independent declared continuous-law expectations",
            "limitations": ["retained attempts only", "control/active word coordinates are not causal pairs", "no new machine sampler-frequency proof", "no perceptual quality inference"],
            "variants": variants, "contextReferences": references}


def run_exclusive(spec_path, expected_sha, fresh_report):
    helper = load_module("q09_supplement_authority", HERE / "q09-supplement-authority-v1.py")
    # These literal study roots protect inputs even if the external specification fails its hash.
    protected = ["/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator",
                 "/private/tmp/q09-runtime-control-9e772f2-v1",
                 "/private/tmp/q09-runtime-control-raw-v1", "/private/tmp/q09-runtime-active-raw-v1"]
    own_sources = [HERE / name for name in SOURCE_NAMES]
    destination = helper.protect_output(fresh_report, protected, [spec_path, *own_sources])
    with destination.open("x", encoding="utf8") as stream:
        try:
            if sys.flags.optimize:
                raise RuntimeError("Supplement requires assertions enabled (no -O/PYTHONOPTIMIZE).")
            authority = helper.Authority(spec_path, expected_sha, own_sources)
            # Output was reserved before construction; verify its location against bound input roots.
            for root in [authority.frozen["root"], authority.frozen["original"], *[item["run"] for item in authority.spec["variants"].values()]]:
                assert not destination.is_relative_to(Path(root))
            input_paths = [authority.spec["freeze"]["path"], *[record["path"] for record in authority.spec["evidence"]]]
            input_paths += [binding["report"]["path"] for binding in authority.spec["variants"].values()]
            assert str(destination) not in input_paths
            authority.validate_before()
            result = analyze(authority)
            result = {**result, "passed": True, "authority": authority.validate_after()}
            data = json.dumps(result, ensure_ascii=False, allow_nan=False) + "\n"
        except Exception as error:
            stream.write(json.dumps({"schemaVersion": "q09-runtime-archived-supplement-v1", "passed": False,
                                     "specSha256": expected_sha, "error": {"type": type(error).__name__, "message": str(error)}}) + "\n")
            raise
        stream.write(data)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("spec", type=Path)
    parser.add_argument("spec_sha256")
    parser.add_argument("fresh_report", type=Path)
    args = parser.parse_args()
    result = run_exclusive(args.spec, args.spec_sha256, args.fresh_report)
    print(json.dumps({"passed": result["passed"], "variants": {name: value["words"] for name, value in result["variants"].items()},
                      "contexts": len(result["contextReferences"])}))


if __name__ == "__main__":
    main()
