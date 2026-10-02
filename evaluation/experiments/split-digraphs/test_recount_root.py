import gzip
import json
from pathlib import Path
import unittest
from recount_root import recount_root

ROOT = Path(__file__).resolve().parent


class RootObligations(unittest.TestCase):
    def test_public_fixture_classifications(self):
        config = json.loads((ROOT / 'recount-fixtures/configuration.json').read_text())
        with gzip.open(ROOT / 'recount-fixtures/q14a-independent-completion-fixtures-v1.jsonl.gz', 'rt') as stream:
            for line in stream:
                row = json.loads(line)
                result = recount_root(row['word']['trace']['baseSpelling'], config)
                for status in ['unavailable', 'unresolved', 'not-target', 'satisfied', 'satisfied:split', 'satisfied:open']:
                    key = 'finalRoot:' + status
                    self.assertEqual(result.get(key, 0), row['observation']['counts'].get(key, 0), (row['drawIndex'], key))

    def fixture(self, closed=False):
        trace = dict(version=4, phones=[dict(id=0, segment='nucleus', syllableIndex=0, soundAtSpelling='eɪ')],
                     units=[dict(id=0, phoneIds=[0], inventoryIndex=0, selected='a', afterDoubling='a', sourceCellIds=[0])],
                     cells=[dict(id=0, text='a', partId=0, origin=dict(kind='selection', unitId=0, offset=0))])
        config = dict(graphemes=[dict(phoneme='eɪ', form='a', reading=dict(kind='open-vowel-or-split-marker'))])
        if closed:
            trace['phones'].append(dict(id=1, segment='coda', syllableIndex=0, soundAtSpelling='t'))
            trace['cells'].append(dict(id=1, text='t', partId=0, origin=dict(kind='selection', unitId=1, offset=0)))
        return trace, config

    def test_open_and_closed_contexts(self):
        trace, config = self.fixture()
        self.assertEqual(recount_root(trace, config), {'finalRoot:satisfied:open': 1, 'finalRoot:satisfied': 1})
        trace, config = self.fixture(True)
        self.assertEqual(recount_root(trace, config), {'finalRoot:unresolved': 1})

    def test_generic_marker_never_supplies_split_ownership(self):
        trace, config = self.fixture(True)
        trace['cells'].append(dict(id=2, text='e', partId=0, origin=dict(kind='rewrite', sourceUnitIds=[])))
        self.assertEqual(recount_root(trace, config), {'finalRoot:unresolved': 1})
        trace, config = self.fixture()
        trace['cells'].append(dict(id=2, text='e', partId=None, origin=dict(kind='rewrite', sourceUnitIds=[])))
        self.assertEqual(recount_root(trace, config), {'finalRoot:unavailable': 1})

    def test_partial_or_opaque_vowel_is_unavailable(self):
        trace, config = self.fixture()
        trace['cells'][0]['origin'] = dict(kind='rewrite', sourceUnitIds=[0])
        self.assertEqual(recount_root(trace, config), {'finalRoot:unavailable': 1})
        trace, config = self.fixture()
        trace['cells'][0]['origin']['offset'] = 1
        self.assertEqual(recount_root(trace, config), {'finalRoot:unavailable': 1})


if __name__ == '__main__':
    unittest.main()
