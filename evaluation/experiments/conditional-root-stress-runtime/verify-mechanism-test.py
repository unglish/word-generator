import copy
from types import ModuleType
import math
import hashlib
import json
import subprocess
import sys
from pathlib import Path
import unittest

path = Path(__file__).with_name("verify-mechanism.py")
verify = ModuleType("verify_mechanism"); verify.__file__ = str(path)
exec(compile(path.read_bytes(), str(path), "exec"), verify.__dict__)


def fixture(zero=False):
    U, P, S = verify.U, verify.P, verify.S
    source = {"beforePrimary": [U, U, U], "afterPrimary": [P, U, U], "operationalHeavy": [False] * 3,
              "secondary": {"enabled": True, "candidateWindow": "all-nonprimary", "probability": 100,
                            "heavyWeight": 0 if zero else 1, "lightWeight": 0 if zero else 1},
              "rhythmic": {"enabled": False, "probability": 50, "requireUnstressedNeighbors": False}, "lambda": math.log(2)}
    mass = lambda value: {"status": "finite", "value": math.log(value)} if value else {"status": "zero"}
    rows = [{"marks": [P, U, S], "adjacentMarkedPairs": 0, "prior": mass(1 if zero else .5), "tilted": mass(1 if zero else .5),
             "before": 1 if zero else .5, "after": 1 if zero else 2 / 3},
            {"marks": [P, S, U], "adjacentMarkedPairs": 1, "prior": mass(0 if zero else .5), "tilted": mass(0 if zero else .25),
             "before": 0 if zero else .5, "after": 0 if zero else 1 / 3}]
    return {"analysis": {"input": source, "secondaryCount": 1, "originalLogPartition": 0,
                         "tiltedLogPartition": 0 if zero else math.log(.75), "normalization": {"before": 1, "after": 1},
                         "expectation": {"before": 0 if zero else .5, "after": 0 if zero else 1 / 3,
                                         "supportCostVaries": not zero, "strictDecreaseExpected": not zero, "minimumSupportedAdjacencies": 0}, "rows": rows},
            "observedWords": 2, "proposalPatterns": {"PUS": 2}, "appliedPatterns": {"PUS": 2}}


class MechanismTests(unittest.TestCase):
    def test_hand_law_and_exact_zero_support(self):
        self.assertEqual(verify.verify_context(fixture()), {"words": 2, "queries": 2, "positive": 2, "zero": 0})
        self.assertEqual(verify.verify_context(fixture(True)), {"words": 2, "queries": 2, "positive": 1, "zero": 1})

    def test_forged_mass_normalization_and_denominator(self):
        mutations = [lambda x: x["analysis"]["rows"].pop(),
                     lambda x: x["analysis"]["rows"].append(copy.deepcopy(x["analysis"]["rows"][0])),
                     lambda x: x["analysis"]["rows"][0].update(after=.5),
                     lambda x: x["analysis"]["expectation"].update(after=.5),
                     lambda x: x["analysis"]["normalization"].update(before=.9),
                     lambda x: x.update(observedWords=3),
                     lambda x: x["appliedPatterns"].update(PUU=1),
                     lambda x: x["analysis"].update(secondaryCount=True),
                     lambda x: x["analysis"]["rows"][0].update(adjacentMarkedPairs=False)]
        for mutate in mutations:
            data = fixture(); mutate(data)
            with self.assertRaises(AssertionError): verify.verify_context(data)

    def test_zero_support_cannot_be_relabelled_finite(self):
        data = fixture(True)
        data["analysis"]["rows"][1]["prior"] = {"status": "finite", "value": -999}
        with self.assertRaises(AssertionError): verify.verify_context(data)

    def test_same_hand_input_transfers_from_public_js_analysis_to_independent_fraction_proof(self):
        root = Path(__file__).parents[3]
        script = """
import { MechanismRegistry } from './evaluation/experiments/conditional-root-stress-runtime/mechanism.mjs';
const U='unmarked', P='primary', S='secondary';
const input={beforePrimary:[U,U,U],afterPrimary:[P,U,U],operationalHeavy:[false,false,false],
 secondary:{enabled:true,candidateWindow:'all-nonprimary',probability:100,heavyWeight:1,lightWeight:1},
 rhythmic:{enabled:false,probability:50,requireUnstressedNeighbors:false},lambda:Math.log(2)};
const registry=new MechanismRegistry(); registry.observe(input,1,[P,S,U],[P,U,S]);
process.stdout.write(JSON.stringify(registry.snapshot()[0]));
"""
        result = subprocess.run(["node", "--import", "tsx", "--input-type=module", "-e", script], cwd=root,
                                check=True, capture_output=True, text=True)
        context = json.loads(result.stdout)
        identity = json.dumps({"input": context["analysis"]["input"], "secondaryCount": 1}, sort_keys=True, separators=(",", ":"))
        self.assertEqual(context["id"], hashlib.sha256(identity.encode()).hexdigest())
        self.assertEqual(verify.verify_context(context), {"words": 1, "queries": 2, "positive": 2, "zero": 0})

    def test_optimized_python_cannot_disable_verification(self):
        result = subprocess.run([sys.executable, "-O", str(path)], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("requires Python assertions enabled", result.stderr)

    def test_inputs_and_results_are_untouched(self):
        data = fixture(); saved = copy.deepcopy(data); verify.verify_context(data)
        self.assertEqual(data, saved)


if __name__ == "__main__": unittest.main()
