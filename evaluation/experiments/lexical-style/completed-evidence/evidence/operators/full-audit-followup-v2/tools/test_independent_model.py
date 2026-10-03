"""Closed-form probability cases and corrupted authentic evidence rejection."""
import copy
import gzip
import json
import math
from pathlib import Path
import unittest

from feature_lineage import verify_feature_lineage
from independent_model import SpellingLaw, boundary_slots, verify_word_law

INPUT = Path('/private/tmp/q20-independent-fixture-capture-v1')


def toy_config():
    consonant = {'sound': 'f', 'mannerOfArticulation': 'fricative', 'placeOfArticulation': 'labiodental', 'onset': 1, 'coda': 1}
    vowel = {'sound': 'a', 'mannerOfArticulation': 'lowVowel', 'placeOfArticulation': 'front', 'tense': False, 'nucleus': 1}
    inventory = [{'phoneme': 'f', 'form': 'f', 'frequency': 1, 'reading': {'kind': 'single-phone'}},
        {'phoneme': 'f', 'form': 'ph', 'frequency': 1, 'reading': {'kind': 'following-letter', 'require': ['a']}},
        {'phoneme': 'a', 'form': 'a', 'frequency': 3, 'reading': {'kind': 'single-phone'}},
        {'phoneme': 'a', 'form': 'e', 'frequency': 1, 'reading': {'kind': 'single-phone'}}]
    maps = {position: {'$type': 'Map', 'entries': [['f', inventory[:2]], ['a', inventory[2:]]]} for position in ['onset', 'nucleus', 'coda']}
    return {'phonemes': [consonant, vowel], 'graphemes': inventory, 'graphemeMaps': maps, 'doubling': {'enabled': False},
        'followingLetters': {'targets': [{'phoneme': 'f', 'form': 'ph'}]},
        'lexicalStyle': {'id': 'toy', 'policy': {'strength': 1,
            'styles': [{'style': {'id': 'plain'}, 'prior': 1}, {'style': {'id': 'marked'}, 'prior': 1}],
            'features': [{'phoneme': 'f', 'form': 'ph', 'source_ids': ['toy-only'],
                         'associations': [{'style_id': 'plain', 'multiplier': .5}, {'style_id': 'marked', 'multiplier': 1.5}]}]}}}


def toy_slots(config):
    return boundary_slots([{'id': index, 'part': 'root', 'syllableIndex': 0, 'segment': position, 'segmentIndex': 0,
        'soundAtSpelling': phoneme['sound'], 'boundary': {'phoneme': phoneme, 'stress': 'ˈ'}}
        for index, (position, phoneme) in enumerate(zip(['onset', 'nucleus'], config['phonemes']))])


class IndependentChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.models = {policy: SpellingLaw(json.loads((INPUT / (policy + '-config.json')).read_bytes())) for policy in ['default', 'active']}
        with gzip.open(INPUT / 'words.jsonl.gz', 'rt') as stream:
            cls.rows = [json.loads(line) for line in stream]

    def test_marked_local_feature_probability_closed_form(self):
        config = toy_config(); law = SpellingLaw(config)
        weights = law.resolve(toy_slots(config)[0], None, 0, 'marked')['weights']
        self.assertEqual(weights, [(0, 1), (1, 1.5)])
        self.assertAlmostEqual(weights[1][1] / sum(weight for _, weight in weights), .6)

    def test_plain_probability_closed_form(self):
        config = toy_config(); law = SpellingLaw(config)
        weights = law.resolve(toy_slots(config)[0], None, 0, 'plain')['weights']
        self.assertEqual(weights, [(0, 1), (1, .5)])
        self.assertAlmostEqual(weights[1][1] / sum(weight for _, weight in weights), 1 / 3)

    def test_conditioning_changes_local_probability_and_sums_all_paths(self):
        config = toy_config(); plan = SpellingLaw(config).sequence(toy_slots(config), 'marked')
        self.assertAlmostEqual(math.exp(plan.log_mass), 17 / 20)
        choices = plan.choices(0, plan.initial)
        self.assertAlmostEqual(math.exp(choices[1]['logConditionalProbability']), 9 / 17)
        self.assertAlmostEqual(sum(math.exp(edge['logConditionalProbability']) for edge in choices), 1)
        self.assertEqual(plan.state_count, 5)
        self.assertEqual(plan.edge_count, 5)

    def test_forbidden_letter_keeps_positive_weight_but_loses_conditional_path(self):
        config = toy_config(); law = SpellingLaw(config); slots = toy_slots(config)
        plan = law.sequence(slots, 'marked')
        ph_state = plan.choices(0, plan.initial)[1]['next']
        self.assertEqual([edge['choice']['selected'] for edge in plan.choices(1, ph_state)], ['a'])
        self.assertEqual([index for index, weight in law.resolve(slots[1], 'ph', 0, 'marked')['weights']], [2, 3])

    def test_illegal_feature_cannot_reenter_through_style_multiplier(self):
        config = toy_config(); config['graphemes'][1]['condition'] = {'segmentPosition': ['final']}
        law = SpellingLaw(config)
        self.assertEqual(law.resolve(toy_slots(config)[0], None, 0, 'marked')['weights'], [(0, 1)])

    def test_zero_strength_preserves_original_local_weights(self):
        config = toy_config(); config['lexicalStyle']['policy']['strength'] = 0
        law = SpellingLaw(config)
        self.assertEqual(law.resolve(toy_slots(config)[0], None, 0, 'marked')['weights'], [(0, 1), (1, 1)])

    def test_reject_style_draw_assignment_corruption(self):
        row = copy.deepcopy(self.rows[0]); choice = row['word']['trace']['lexicalStyle']
        choice['style_id'] = 'plain' if choice['style_id'] == 'marked' else 'marked'
        with self.assertRaises(AssertionError):
            verify_word_law(self.models[row['policy']], row['word'])

    def test_reject_base_weight_corruption(self):
        row = copy.deepcopy(self.rows[0]); row['word']['trace']['graphemeSelections'][0]['styleWeights'][0]['base_weight'] += 1
        with self.assertRaises(AssertionError):
            verify_word_law(self.models[row['policy']], row['word'])

    def test_reject_conditioned_partition_mass_corruption(self):
        row = copy.deepcopy(next(row for row in self.rows if row['policy'] == 'active'))
        row['word']['trace']['graphemeSelections'][0]['conditionedSelection']['logSequenceMass'] += .01
        with self.assertRaises(AssertionError):
            verify_word_law(self.models[row['policy']], row['word'])

    def test_reject_hard_candidate_support_corruption(self):
        row = copy.deepcopy(self.rows[0]); row['word']['trace']['graphemeSelections'][0]['candidates'].append('impossible')
        with self.assertRaises(AssertionError):
            verify_word_law(self.models[row['policy']], row['word'])

    def test_reject_final_cell_source_corruption(self):
        row = copy.deepcopy(self.rows[0]); row['word']['trace']['finalWord']['spelling']['initial'][0]['source']['cellId'] = 1000000
        with self.assertRaises((AssertionError, KeyError)):
            verify_feature_lineage(self.models[row['policy']], row['word'])

    def test_reject_edit_text_corruption(self):
        row = copy.deepcopy(next(row for row in self.rows if row['word']['trace']['baseSpelling']['edits']))
        row['word']['trace']['baseSpelling']['edits'][0]['before'] += 'x'
        with self.assertRaises(AssertionError):
            verify_feature_lineage(self.models[row['policy']], row['word'])


if __name__ == '__main__':
    unittest.main()
