import copy
import math
import unittest
from verify import compare, project, scored, surface_marks, lexical_json, producer_canonical


class IndependentScoreTests(unittest.TestCase):
    def test_canonical_provenance_preserves_js_numbers_and_integer_key_order(self):
        data = '{"z":{"10":10,"2":2,"1":1},"a":1e-7,"b":0.000001,"😀":1,"\ue000":2}'
        self.assertEqual(producer_canonical(lexical_json(data)), '{"a":1e-7,"b":0.000001,"z":{"1":1,"2":2,"10":10},"😀":1,"\ue000":2}')
        with self.assertRaises(AssertionError):
            lexical_json('{"a":1,"a":2}')
        with self.assertRaises(ValueError):
            lexical_json('{"a":NaN}')

    def test_boundaries_and_mean_not_phone_denominator(self):
        compiled = {'#': {'AE1': -math.log2(5 / 12)}, 'AE1': {'T': -math.log2(5 / 8)}, 'T': {'#': -math.log2(3 / 4)}}
        result = scored(['AE1', 'T'], compiled, [])
        self.assertEqual(result['transitions'], 3)
        self.assertAlmostEqual(result['bitsPerTransition'], -(math.log2(5 / 12) + math.log2(5 / 8) + math.log2(3 / 4)) / 3, places=14)

    def test_nulls_never_create_new_adjacency(self):
        result = scored(['T', None, 'T'], {'T': {}}, ['stress:0'])
        self.assertEqual(result['tokens'], ['T', None, 'T'])
        self.assertEqual(result['unavailable'], ['stress:0', 'projection:1'])
        self.assertIsNone(result['bitsPerTransition'])
        self.assertEqual(result['transitions'], 0)

    def test_no_unsupported_or_missing_surface_inference(self):
        word = {'syllables': [{'onset': [], 'nucleus': [{'sound': 'æ'}], 'coda': []}]}
        observed = [{'stress': {'mark': 'unmarked', 'raw': None}, 'nucleusSize': 1}]
        self.assertEqual(surface_marks(word, observed), (None, 'missing-stress-pattern'))
        word['trace'] = {'stressPattern': {'version': True, 'snapshots': []}}
        self.assertEqual(surface_marks(word, observed), (None, 'unsupported-stress-pattern-version'))
        snapshot = {'domain': 'surface-after-realization', 'coordinates': 'word', 'eventCount': 0, 'syllables': [{**word['syllables'][0], 'mark': 'unmarked'}]}
        word['trace'] = {'stressPattern': {'version': 2, 'snapshots': [snapshot]}}
        self.assertEqual(surface_marks(word, observed), (['unstressed'], None))
        snapshot['syllables'][0]['mark'] = 'primary'
        self.assertEqual(surface_marks(word, observed), (None, 'surface-stress-mismatch'))

    def test_identity_and_coarse_losses_are_independently_aligned(self):
        inventory = {'æ': ('AE', 'vowel'), 'ɜ': ('ER', 'vowel'), 't': ('T', 'consonant')}
        base = {token: {second: 2.0 for second in ('#', 'AE', 'ER', 'T')} for token in ('#', 'AE', 'ER', 'T')}
        native = {token: {second: 3.0 for second in ('#', 'AE1', 'ER1', 'T')} for token in ('#', 'AE1', 'ER1', 'T')}
        draw = {'profile': 'fixture', 'seed': 1, 'drawIndex': 0, 'word': {'written': {'clean': 'a😀b'}, 'syllables': [{'stress': 'ˈ', 'onset': [], 'nucleus': [{'sound': 'ɜ'}], 'coda': [{'sound': 'tʰ'}]}]}}
        row = project(draw, inventory, {'base': base, 'native': native})
        self.assertEqual(row['coarse']['tokens'], ['ER', 'T'])
        self.assertEqual(row['nativeExplicit']['tokens'], [None, 'T'])
        self.assertTrue(row['losses'][0]['losses']['unresolvedIdentity'])
        self.assertTrue(row['losses'][1]['losses']['aspiration'])
        self.assertEqual(row['writtenCodePoints'], 3)
        unknown = copy.deepcopy(draw)
        unknown['word']['syllables'][0]['nucleus'][0]['sound'] = 'foreign'
        self.assertEqual(project(unknown, inventory, {'base': base, 'native': native})['coarse']['tokens'], [None, 'T'])

    def test_fixed_tolerance_never_weakens_identity_or_counts(self):
        compare({'score': 4.0 + 1e-13, 'tokens': ['AE1']}, {'score': 4.0, 'tokens': ['AE1']}, 'fixture')
        for changed in ({'score': 4.0 + 1e-8, 'tokens': ['AE1']}, {'score': 4.0, 'tokens': ['AE2']}):
            with self.assertRaises(AssertionError):
                compare(changed, {'score': 4.0, 'tokens': ['AE1']}, 'fixture')
        with self.assertRaises(AssertionError):
            compare(3, 2, 'count')


if __name__ == '__main__':
    unittest.main()
