import copy
from pathlib import Path
from types import ModuleType
import unittest

PATH = Path(__file__).with_name("q09-supplement-observe-v1.py")
m = ModuleType("observe")
m.__file__ = str(PATH)
exec(compile(PATH.read_bytes(), str(PATH), "exec"), m.__dict__)
P, S, U = m.P, m.S, m.U
POLICY = {"type": "moraic", "analysis": "hand", "coda": "weight-by-position", "unknown": "legacy-segment-count"}
CONFIG = {"pronunciation": {"stress": {"syllableWeight": POLICY,
          "secondary": {"enabled": True, "candidateWindow": "first-three", "probability": 40, "heavyWeight": 70, "lightWeight": 30},
          "rhythmic": {"enabled": True, "probability": 40, "requireUnstressedNeighbors": True},
          "rootPattern": {"type": "count-conditioned", "lambda": 0.6931471805599453}}}}


def fixture(version=2, proposal=(P, S, U), applied=(P, U, S)):
    def phones(mark, origin):
        return {"onset": [], "nucleus": [{"sound": "æ", "nuclearQuantity": {"analysis": "hand", "moras": 1}}],
                "coda": [{"sound": "t"}], "mark": mark, "origin": origin}
    events = [{"id": 0, "after": P, "cause": {"kind": "root-primary"}}]
    events.extend({"id": i + 1, "after": S, "cause": {"kind": "root-pattern-sampler" if version == 2 else "explicit-secondary"}}
                  for i, _ in enumerate([mark for mark in applied if mark == S]))
    def snapshot(domain, labels):
        secondary = 0
        syllables = []
        for mark in labels:
            if mark == U:
                origin = {"kind": "unmarked"}
            elif mark == P:
                origin = {"kind": "event", "eventId": 0}
            else:
                secondary += 1
                origin = {"kind": "event", "eventId": secondary}
            syllables.append(phones(mark, origin))
        return {"domain": domain, "coordinates": "root" if domain.startswith("root-") else "word", "eventCount": len(events), "syllables": syllables}
    common = "root-after-pattern-application" if version == 2 else "root-after-rhythmic"
    snapshots = [snapshot("root-before-primary", [U] * len(applied)), snapshot("root-after-primary", [P] + [U] * (len(applied) - 1))]
    if version == 1:
        snapshots.append(snapshot("root-after-explicit-secondary", applied))
    snapshots.append(snapshot(common, applied))
    snapshots += [snapshot(domain, applied) for domain in m.WORD_DOMAINS]
    trace = {"version": version, "scope": "returned-attempt", "rootSyllableCount": len(applied), "snapshots": snapshots,
             "events": events, "morphology": [], "assembly": {"rootSyllableStart": 0, "prefixSyllables": 0, "suffixSyllables": 0}}
    trace["rootPattern"] = {"proposal": {"snapshots": [{"marks": list(proposal)}, {"marks": list(proposal)}]}}
    word = {"written": {"clean": "hand"}, "syllables": snapshots[-1]["syllables"], "trace": {"stressPattern": trace, "attempts": 0, "repairs": []}}
    source = {"beforePrimary": [U] * len(applied), "afterPrimary": [P] + [U] * (len(applied) - 1), "operationalHeavy": [True] * len(applied),
              "secondary": CONFIG["pronunciation"]["stress"]["secondary"], "rhythmic": CONFIG["pronunciation"]["stress"]["rhythmic"],
              "lambda": CONFIG["pronunciation"]["stress"]["rootPattern"]["lambda"]}
    k = list(proposal).count(S)
    context_id = m.digest({"input": source, "secondaryCount": k})
    patterns = {tuple(proposal), tuple(applied)}
    contexts = {context_id: {"id": context_id, "analysis": {"input": source, "secondaryCount": k,
        "rows": [{"marks": list(labels), "prior": {"status": "finite"}, "adjacentMarkedPairs": sum(a != U and b != U for a, b in zip(labels, labels[1:]))} for labels in patterns]}}}
    return word, contexts


class ObserveTests(unittest.TestCase):
    def test_common_endpoint_and_unavailable_domains(self):
        for version, target, missing in [(1, "root-after-rhythmic", "root-after-pattern-application"),
                                         (2, "root-after-pattern-application", "root-after-rhythmic")]:
            word, contexts = fixture(version)
            observed = m.observe_word(word, CONFIG, contexts)
            counts = observed["counts"]
            self.assertEqual(counts["root-placement-complete:secondaryMarks"], 1)
            self.assertEqual(counts[f"{target}:secondaryMarks"], 1)
            self.assertEqual(counts[f"{missing}:availability:not-executed:words"], 1)
            self.assertNotIn(f"{missing}:secondaryMarks", counts)
        word, contexts = fixture(1)
        word["trace"]["stressPattern"]["snapshots"] = [item for item in word["trace"]["stressPattern"]["snapshots"] if item["domain"] != "surface-after-realization"]
        counts = m.observe_word(word, CONFIG, contexts)["counts"]
        self.assertEqual(counts["surface-after-realization:availability:unavailable-historical:words"], 1)
        self.assertNotIn("surface-after-realization:secondaryMarks", counts)

    def test_full_delta_and_excess_distributions_use_support_not_observed_winner(self):
        word, contexts = fixture(proposal=(P, U, S), applied=(P, S, U))
        observed = m.observe_word(word, CONFIG, contexts)
        counts = observed["counts"]
        self.assertEqual(counts["mechanism:adjacencyDelta:1"], 1)
        self.assertEqual(sum(value for key, value in counts.items() if key.startswith("mechanism:adjacencyDelta:")), 1)
        self.assertEqual(counts["mechanism:application:excessAboveSupportMinimum:1"], 1)
        self.assertIn("adjacency-increase", observed["witnessConditions"])
        self.assertIn("applied-support-minimum-excess", observed["witnessConditions"])

    def test_quantity_unknown_is_not_operational_light(self):
        description = m.weight({"nucleus": [{"sound": "u"}], "coda": [{"sound": "t"}]}, POLICY)
        self.assertEqual(description["operational"], "heavy")
        self.assertEqual(description["quantities"], ["unknown:unspecified"])
        open_description = m.weight({"nucleus": [{"sound": "u"}], "coda": []}, POLICY)
        self.assertEqual(open_description["analytical"], "unknown")
        self.assertEqual(open_description["basis"], "legacy-fallback")

    def test_actual_origin_orientation_and_coordinate_boundary(self):
        word, _ = fixture(1, applied=(P, S, U))
        trace = word["trace"]["stressPattern"]
        snapshot = next(item for item in trace["snapshots"] if item["domain"] == "assembled-after-morphology")
        trace["assembly"]["rootSyllableStart"] = 1
        counts = m.snapshot_counts(trace, snapshot, POLICY)
        self.assertEqual(counts["adjacency:orientation:primary>secondary"], 1)
        self.assertEqual(counts["adjacency:origin:root-primary>explicit-secondary"], 1)
        self.assertEqual(counts["adjacency:boundary:prefix>root"], 1)
        trace.pop("assembly")
        self.assertEqual(m.snapshot_counts(trace, snapshot, POLICY)["adjacency:boundary:unavailable>unavailable"], 1)

    def test_no_proposal_origin_or_unsupported_version_is_accepted(self):
        word, contexts = fixture()
        word["trace"]["stressPattern"]["snapshots"][-1]["syllables"][2]["origin"] = {"kind": "proposal", "proposalEventId": 0}
        with self.assertRaises(AssertionError):
            m.observe_word(word, CONFIG, contexts)
        for version in (True, 3):
            word, contexts = fixture()
            word["trace"]["stressPattern"]["version"] = version
            with self.assertRaises(AssertionError):
                m.observe_word(word, CONFIG, contexts)

    def test_attempt_index_repairs_and_schwa_have_separate_denominators(self):
        word, contexts = fixture()
        word["trace"]["attempts"] = 4
        word["trace"]["repairs"] = [{"rule": "repairStressedNuclei", "before": "ə", "after": "æ"}, {"rule": "other", "before": "x", "after": "y"}]
        word["trace"]["stressPattern"]["snapshots"][-1]["syllables"][2]["nucleus"][0]["sound"] = "ə"
        observed = m.observe_word(word, CONFIG, contexts)
        counts = observed["counts"]
        self.assertEqual(counts["selectedAttemptIndex:4"], 1)
        self.assertEqual(counts["stressedNucleusRepairEvents"], 1)
        self.assertEqual(counts["surface-after-realization:secondarySchwaSyllables"], 1)
        self.assertEqual(counts["surface-after-realization:secondaryMarks"], 1)
        self.assertIn("selected-attempt-positive", observed["witnessConditions"])
        word["trace"]["attempts"] = True
        with self.assertRaises(AssertionError):
            m.observe_word(word, CONFIG, contexts)

    def test_zero_syllable_affix_retains_morphology_stratum(self):
        word, contexts = fixture()
        word["trace"]["morphology"] = {"realization": {"prefix": {"resolved": {"written": "", "syllables": []}}}}
        observed = m.observe_word(word, CONFIG, contexts)
        self.assertTrue(observed["strata"][0].startswith("morphology:prefix/"))

    def test_first_witness_is_bounded_and_all_denominators_reconcile(self):
        word, contexts = fixture(proposal=(P, U, S), applied=(P, S, U))
        aggregator = m.Aggregator()
        for index in range(2):
            draw = {"profile": "hand", "seed": 7, "drawIndex": index, "word": copy.deepcopy(word)}
            aggregator.add(draw, m.observe_word(draw["word"], CONFIG, contexts))
        result = aggregator.reconcile()
        self.assertEqual(result["words"], 2)
        for witness in result["witnesses"].values():
            self.assertEqual(witness["coordinate"]["drawIndex"], 0)
            self.assertEqual(witness["wordSha256"], m.digest(witness["word"]))
        self.assertEqual(result["groups"]["total"]["counts"]["mechanism:adjacencyDelta:1"], 2)


if __name__ == "__main__":
    unittest.main()
