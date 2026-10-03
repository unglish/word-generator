"""Authentic retained gap override and cross-ledger corruption checks."""
import copy
import json
from pathlib import Path
from types import SimpleNamespace
import unittest

from feature_lineage import verify_feature_lineage


class GapLineageChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.word = json.loads((Path(__file__).parents[1] / 'failing-word.json').read_bytes())['word']
        base = cls.word['trace']['baseSpelling']
        cls.feature = (base['phones'][0]['soundAtSpelling'], base['units'][0]['selected'])
        cls.law = SimpleNamespace(features={cls.feature})
        cls.key = 'feature/' + '/'.join(cls.feature) + '/'

    def test_original_gap_is_not_a_missing_source_cell(self):
        counts = verify_feature_lineage(self.law, self.word)
        self.assertEqual(counts['final/words/gap-overridden'], 1)
        self.assertEqual(self.word['written']['clean'], 'when')

    def test_identical_visible_w_does_not_restore_its_erased_selection(self):
        counts = verify_feature_lineage(self.law, self.word)
        self.assertEqual(counts[self.key + 'sourceCharactersSelected'], 1)
        self.assertEqual(counts[self.key + 'sourceCharactersSurviving'], 0)
        self.assertEqual(counts[self.key + 'exactSelectedSourceSurviving'], 0)
        self.assertEqual(counts[self.key + 'selectedSourceErased'], 1)
        self.assertEqual(counts[self.key + 'unambiguousDerivedSameForm'], 0)
        self.assertEqual(counts[self.key + 'ambiguousOrUnlicensedDerivedLineage'], 1)

    def test_post_gap_cell_cannot_replace_original_pre_gap_binding(self):
        word = copy.deepcopy(self.word)
        trace = word['trace']
        trace['finalWord']['spelling']['initial'][0]['source']['cellId'] = trace['baseSpelling']['cells'][0]['id']
        with self.assertRaises((AssertionError, KeyError)):
            verify_feature_lineage(self.law, word)

    def test_changed_rule_in_one_gap_ledger_is_rejected(self):
        word = copy.deepcopy(self.word)
        word['trace']['baseSpelling']['edits'][-1]['rule'] = 'gapSpelling:unbound'
        with self.assertRaises(AssertionError):
            verify_feature_lineage(self.law, word)

    def test_missing_final_gap_event_cannot_be_hidden_by_valid_surface(self):
        word = copy.deepcopy(self.word)
        word['trace']['finalWord']['spelling']['events'] = []
        with self.assertRaises(AssertionError):
            verify_feature_lineage(self.law, word)

    def test_changed_original_selection_owner_is_rejected(self):
        word = copy.deepcopy(self.word)
        word['trace']['baseSpelling']['edits'][-1]['input'][0]['origin']['unitId'] = 2
        with self.assertRaises(AssertionError):
            verify_feature_lineage(self.law, word)


if __name__ == '__main__':
    unittest.main()
