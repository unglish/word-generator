import copy
import gzip
import hashlib
import json
from pathlib import Path
import unittest
from recount_structure import recount_structure

ROOT = Path(__file__).resolve().parent


class SplitStructure(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        manifest = json.loads((ROOT / 'recount-fixtures/manifest.json').read_text())
        name = 'q14a-independent-completion-fixtures-v1.jsonl.gz'
        packed = (ROOT / 'recount-fixtures' / name).read_bytes()
        assert hashlib.sha256(packed).hexdigest() == manifest[name]['sha256']
        raw = gzip.decompress(packed)
        assert hashlib.sha256(raw).hexdigest() == manifest[name]['uncompressedSha256']
        cls.rows = [json.loads(line) for line in raw.splitlines()]
        cls.supports = json.loads((ROOT / 'measurement.json').read_text())['splitVowels']['supports']

    def test_all_public_fixtures_and_observer_counts(self):
        formed = 0
        for row in self.rows:
            counts = recount_structure(row['word']['trace']['baseSpelling'], self.supports)
            for key, value in counts.items():
                self.assertEqual(value, row['observation']['counts'][key])
            formed += counts['formedConstructions']
        self.assertGreater(formed, 0)

    def test_explicit_whole_root_retirement(self):
        trace = copy.deepcopy(next(row['word']['trace']['baseSpelling'] for row in self.rows
                                   if row['word']['trace']['baseSpelling']['split']['liveConstructionIds']))
        edit_id = len(trace['edits'])
        output = [dict(id=max(cell['id'] for cell in trace['cells']) + 1, text='x', partId=None,
                       origin=dict(kind='rewrite', editId=edit_id, sourceUnitIds=[phone['id'] for phone in trace['phones']], ownership='unresolved'))]
        replacement = dict(rule='gapSpelling:test', ownership='unavailable', editId=edit_id,
                           constructionIds=trace['split']['liveConstructionIds'],
                           inputCellIds=[cell['id'] for cell in trace['cells']], outputCellIds=[output[0]['id']])
        trace['edits'].append(dict(id=edit_id, phase='gap', rule='gapSpelling:test', start=0, input=trace['cells'], output=output))
        trace['split']['supersessions'].append(replacement)
        trace['split']['liveConstructionIds'] = []
        trace['cells'] = output
        counts = recount_structure(trace, self.supports)
        self.assertEqual(counts['liveConstructions'], 0)
        self.assertEqual(counts['supersededConstructions'], counts['formedConstructions'])

    def test_corrupted_component_coda_marker_and_retirement(self):
        trace = next(row['word']['trace']['baseSpelling'] for row in self.rows
                     if row['word']['trace']['baseSpelling']['split']['liveConstructionIds'])
        for role in ['component', 'marker']:
            bad = copy.deepcopy(trace)
            next(cell for cell in bad['cells'] if cell['origin']['kind'] == 'split-vowel' and cell['origin']['role'] == role)['text'] = '!'
            with self.assertRaises(ValueError):
                recount_structure(bad, self.supports)
        bad = copy.deepcopy(trace); bad['split']['liveConstructionIds'] = []
        with self.assertRaisesRegex(ValueError, 'retirement'):
            recount_structure(bad, self.supports)
        bad = copy.deepcopy(trace); bad['split']['constructions'][0]['preservedCodaCells'][0]['text'] = '!'
        with self.assertRaisesRegex(ValueError, 'coda'):
            recount_structure(bad, self.supports)
        with self.assertRaisesRegex(ValueError, 'unsupported split relation'):
            recount_structure(trace, [])


if __name__ == '__main__':
    unittest.main()
