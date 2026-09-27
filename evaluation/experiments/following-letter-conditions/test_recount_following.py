import copy
import gzip
import json
import unittest
from pathlib import Path
from recount_following import classification, compare, extent, observe


class IndependentFollowingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = []
        root = Path(__file__).parent
        fixtures = [root / 'accounting-v2' / name for name in ('pilot.jsonl.gz', 'targeted.jsonl.gz', 'normalized.jsonl.gz')]
        fixtures.append(root / 'boundary-fixtures' / 'shared-context.jsonl.gz')
        for path in fixtures:
            configurations = {}
            with gzip.open(path, 'rt') as stream:
                for line in stream:
                    row = json.loads(line)
                    if row['kind'] == 'configuration':
                        configurations[row['name']] = row['config']
                    else:
                        cls.rows.append((row, configurations[row['name']]))
        cls.row, cls.config = next((row, config) for row, config in cls.rows if row['coordinate'] == 'archived-carowngs')

    def test_all_pilot_events_and_counts_agree(self):
        for row, config in self.rows:
            compare(row['word'], config, row['observation'])

    def test_counter_and_event_corruption_are_detected(self):
        bad = copy.deepcopy(self.row['observation'])
        bad['counts']['phones'] += 1
        with self.assertRaisesRegex(ValueError, 'count disagreement'):
            compare(self.row['word'], self.config, bad)
        bad = copy.deepcopy(self.row['observation'])
        bad['events'][0]['context']['letter'] = 'e'
        with self.assertRaisesRegex(ValueError, 'event disagreement'):
            compare(self.row['word'], self.config, bad)

    def test_missing_reading_does_not_destroy_owned_extent(self):
        config = copy.deepcopy(self.config)
        config['graphemes'][102].pop('reading')
        result = observe(self.row['word'], config)
        for event in result['events'][:2]:
            self.assertEqual(event['ownership'], 'single-owned')
            self.assertEqual(event['readingStatus'], 'reading-unavailable')

    def test_partial_extent_and_false_source_identity_are_not_owned(self):
        for mutation in ('id', 'offset'):
            base = copy.deepcopy(self.row['word']['trace']['baseSpelling'])
            if mutation == 'id':
                base['cells'][0]['id'] = 9000
            else:
                base['cells'][0]['origin']['offset'] = 1
            self.assertIsNone(extent(base, base['phones'][0], base['units'][0], self.config))

    def test_context_origin_does_not_hide_a_visible_letter(self):
        rule = {'kind': 'following-letter', 'require': ['e', 'i', 'y']}
        for origin in ('selection', 'shared', 'split-vowel', 'rewrite', 'completion'):
            self.assertEqual(classification(rule, {'kind': 'letter', 'letter': 'e', 'origin': origin}), 'contextual-compatible')
        self.assertEqual(classification(rule, {'kind': 'root-edge'}), 'contextual-incompatible')
        self.assertEqual(classification(rule, {'kind': 'unavailable'}), 'context-unavailable')

    def test_empty_ledger_has_zero_denominators(self):
        word = copy.deepcopy(self.row['word'])
        word['trace']['baseSpelling'] = dict(version=1, scope='root-before-morphology', surface='',
                                            phones=[], units=[], cells=[], edits=[], unresolvedCells=0)
        result = observe(word, self.config)
        self.assertEqual(result['events'], [])
        self.assertTrue(all(value == (1 if key == 'words' else 0) for key, value in result['counts'].items()))

    def test_cross_syllable_and_shared_contexts_are_explicit(self):
        row, config = next((r, c) for r, c in self.rows if r['name'] == 'default' and r['coordinate']['index'] == 79)
        event = next(e for e in observe(row['word'], config)['events'] if e['boundary'] == 'final-root' and e['phoneId'] == 3)
        self.assertEqual(event['context']['letter'], 'y')
        self.assertEqual(event['readingStatus'], 'contextual-incompatible')
        shared = [(r, c) for r, c in self.rows if r['name'] == 'shared-context-custom']
        self.assertEqual(len(shared), 3)
        for row, config in shared:
            event = next(e for e in observe(row['word'], config)['events'] if e['boundary'] == 'final-root' and e['phoneId'] == 0)
            self.assertEqual(event['context'], dict(kind='letter', letter='e', origin='shared'))
            self.assertEqual(event['readingStatus'], 'contextual-compatible')


if __name__ == '__main__':
    unittest.main()
