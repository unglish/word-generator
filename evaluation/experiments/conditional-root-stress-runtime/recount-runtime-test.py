import copy
import hashlib
import json
from pathlib import Path
import tempfile
from types import ModuleType, SimpleNamespace
import unittest

path = Path(__file__).with_name("recount-runtime.py")
recount = ModuleType("recount_runtime"); recount.__file__ = str(path)
exec(compile(path.read_bytes(), str(path), "exec"), recount.__dict__)
U, P, S = recount.U, recount.P, recount.S


def fixture():
    rules = {"syllableWeight": {"type": "moraic", "analysis": "fixture", "coda": "weight-by-position", "unknown": "legacy-segment-count"},
             "secondary": {"enabled": True, "candidateWindow": "all-nonprimary", "probability": 100, "heavyWeight": 1, "lightWeight": 1},
             "rhythmic": {"enabled": False, "probability": 50, "requireUnstressedNeighbors": False},
             "rootPattern": {"type": "count-conditioned", "lambda": 0.6931471805599453}}
    config = {"pronunciation": {"stress": rules}}
    def syllables(marks):
        return [{"mark": mark, "onset": [], "nucleus": [{"sound": "ʌ", "nuclearQuantity": {"analysis": "fixture", "moras": 1}}], "coda": []} for mark in marks]
    snapshots = [{"domain": domain, "syllables": syllables([U, U, U] if index == 0 else [P, U, U] if index == 1 else [P, U, S])}
                 for index, domain in enumerate(recount.DOMAINS[:6])]
    pattern = {"version": 2, "rootSyllableCount": 3, "snapshots": snapshots,
               "events": [{"cause": {"kind": "root-primary"}}, {"cause": {"kind": "root-pattern-sampler"}}],
               "weightInput": {"syllables": [{"operational": {"weight": "light", "basis": "moraic-analysis"}}] * 3},
               "rootPattern": {"proposal": {"snapshots": [{}, {"marks": [P, S, U]}]}}}
    return {"syllables": [{}, {}, {}], "trace": {"stressPattern": pattern}}, config


class RecountTests(unittest.TestCase):
    def test_hand_actual_domain_and_context_counts(self):
        word, config = fixture()
        counts, identity, source, k, proposal, applied, stratum = recount.observe_word(word, config)
        self.assertEqual((k, proposal, applied, stratum), (1, "PSU", "PUS", "bare/root:3/word:3"))
        self.assertEqual(identity, hashlib.sha256(recount.semantic({"input": source, "secondaryCount": 1}).encode()).hexdigest())
        self.assertEqual(counts["root-before-primary:unmarkedRun:whole-word:3"], 1)
        self.assertEqual(counts["root-after-pattern-application:adjacentPairs"], 0)
        self.assertEqual(counts["root-after-rhythmic:unavailableWords"], 1)
        self.assertNotIn("root-after-rhythmic:adjacentPairs", counts)
        self.assertEqual(counts["nuclearQuantity:known:1"], 3)
        group = {"counts": {}, "contextUses": {}}
        context = {"id": identity, "analysis": {"expectation": {"supportCostVaries": True}}}
        recount.update_group(group, counts, context, k, proposal, applied)
        self.assertEqual(group["counts"]["proposalAdjacentPairs"], 1)
        self.assertEqual(group["counts"]["sampledAdjacentPairs"], 0)
        self.assertEqual(group["counts"]["proposalChangedWords"], 1)
        self.assertEqual(group["contextUses"], {identity: 1})

    def test_forged_shape_quantity_and_boolean_coordinate_fail(self):
        for mutate in [lambda word: word["trace"]["stressPattern"].update(rootSyllableCount=True),
                       lambda word: word["trace"]["stressPattern"]["snapshots"].pop(),
                       lambda word: word["trace"]["stressPattern"]["snapshots"][0]["syllables"].pop(),
                       lambda word: word["trace"]["stressPattern"]["weightInput"]["syllables"][0]["operational"].update(weight="heavy"),
                       lambda word: word["trace"].update(stressWeight=None)]:
            word, config = fixture(); mutate(word)
            with self.assertRaises(AssertionError): recount.observe_word(word, config)

    def test_unknown_and_coda_weight_remain_distinct(self):
        word, config = fixture(); syllable = word["trace"]["stressPattern"]["snapshots"][0]["syllables"][0]
        del syllable["nucleus"][0]["nuclearQuantity"]
        self.assertEqual(recount.classify_weight(syllable, config["pronunciation"]["stress"]["syllableWeight"]), ("light", "legacy-fallback", ["unknown:unspecified"]))
        syllable["coda"] = [{"sound": "t"}]
        self.assertEqual(recount.classify_weight(syllable, config["pronunciation"]["stress"]["syllableWeight"]), ("heavy", "moraic-analysis", ["unknown:unspecified"]))

    def test_source_ancestor_alias_and_untrusted_manifest_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); (root / "actual").mkdir(); (root / "actual/source").write_text("source")
            (root / "alias").symlink_to(root / "actual", target_is_directory=True)
            with self.assertRaises(AssertionError): recount.regular(root, "alias/source")
            (root / "freeze").write_text("{}"); (root / "analysis").write_text("{}"); (root / "manifest.json").write_text('{"manifest":{}}')
            args = SimpleNamespace(freeze=root / "freeze", freeze_sha=hashlib.sha256(b"{}").hexdigest(), analysis=root / "analysis",
                                   analysis_sha=hashlib.sha256(b"{}").hexdigest(), run=root, manifest_sha="0" * 64)
            with self.assertRaises(AssertionError): recount.verify(args)

    def test_output_excludes_control_candidate_and_raw_trees_through_aliases(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            original, run = root / "original", root / "run"
            original.mkdir(); run.mkdir()
            alias = root / "original-alias"; alias.symlink_to(original, target_is_directory=True)
            freeze = root / "freeze.json"; freeze.write_text(json.dumps({"original": str(original)}))
            args = SimpleNamespace(freeze=freeze, freeze_sha=hashlib.sha256(freeze.read_bytes()).hexdigest(),
                                   analysis=root / "analysis.json", run=run, out=root / "fresh.json")
            recount.protect_output(args)
            for output in (original / "fresh.json", alias / "fresh.json", run / "fresh.json",
                           recount.HERE.parents[2] / "fresh-proof.json", freeze, args.analysis):
                args.out = output
                with self.assertRaises(AssertionError): recount.protect_output(args)
            args.out = root / "occupied.json"; args.out.write_text("retained")
            with self.assertRaises(AssertionError): recount.protect_output(args)
            self.assertEqual(args.out.read_text(), "retained")
            args.out = root / "fresh.json"; args.freeze_sha = "0" * 64
            with self.assertRaises(AssertionError): recount.protect_output(args)
            self.assertFalse(args.out.exists())

    def test_counter_does_not_mutate_input(self):
        word, config = fixture(); saved = copy.deepcopy(word); recount.observe_word(word, config)
        self.assertEqual(word, saved)


if __name__ == "__main__": unittest.main()
