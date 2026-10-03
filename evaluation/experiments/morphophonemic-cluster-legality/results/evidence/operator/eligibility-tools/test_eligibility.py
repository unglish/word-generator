"""Portable independent-oracle fixtures. These do not establish corpus efficacy."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import unittest

from eligibility import Runtime, evaluate, verify_preparation, verify_profile_word

if not __debug__:
    raise RuntimeError('The independent oracle requires assertions; do not use Python -O')


def pin(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def load_fixtures(kind):
    directory = Path(__file__).parent
    manifest = json.loads((directory / 'fixtures-manifest.json').read_text())
    assert manifest['version'] == 'q11b-independent-eligibility-fixtures-v1'
    record = manifest['fixtures'][kind]
    assert Path(record['file']).name == record['file']
    compressed = (directory / record['file']).read_bytes()
    assert pin(compressed) == record['compressed'], 'Compressed fixture changed'
    raw = gzip.decompress(compressed)
    assert pin(raw) == record['uncompressed'], 'Exported fixture changed'
    rows = json.loads(raw)['cases']
    assert len(rows) == record['cases']
    assert len({row['id'] for row in rows}) == len(rows)
    seals = {}
    for name, seal in record['exportSeal'].items():
        assert Path(seal['file']).name == seal['file']
        compressed = (directory / seal['file']).read_bytes()
        assert pin(compressed) == seal['compressed']
        raw = gzip.decompress(compressed)
        assert pin(raw) == seal['uncompressed']
        seals[name] = json.loads(raw)
    assert seals['complete']['passed'] is True
    assert seals['complete']['after'] == seals['before']
    assert seals['before']['commit'] == record['sourceCommit']
    assert seals['complete']['cases'] == record['cases']
    assert seals['complete']['probes'] == record['uncompressed']
    assert record['exportSeal']['complete']['uncompressed']['sha256'] == record['originalSealSha256']
    return rows


class IndependentEligibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.guards = load_fixtures('guard')
        cls.transactions = load_fixtures('transaction')
        cls.rejected = next(row for row in cls.transactions if row['id'] == 'atomic-rejection')
        cls.accepted = next(row for row in cls.transactions if row['id'] == 'accepted-softening')

    def test_full_guard_decisions(self):
        self.assertEqual(len(self.guards), 25)
        for row in self.guards:
            with self.subTest(case=row['id']):
                inventory = row['configuration']['phonemes']
                reference = row['replacementReference']
                if reference['kind'] == 'inventory':
                    self.assertEqual(inventory[reference['index']], row['replacement'])
                    canonical_index = max(i for i, phone in enumerate(inventory)
                                          if phone['sound'] == row['replacement']['sound'])
                    canonical_identity = reference['index'] == canonical_index
                else:
                    self.assertEqual(reference['kind'], 'external-copy')
                    canonical_identity = False
                original = copy.deepcopy(row['root'])
                actual = evaluate(Runtime(row['configuration']), row['root'], row['target'],
                                  row['replacement'], row['prefix'], row['suffix'],
                                  canonical_identity=canonical_identity)
                self.assertEqual(actual, row['result'])
                self.assertEqual(row['root'], original)

    def test_full_transactions(self):
        self.assertEqual(len(self.transactions), 14)
        for row in self.transactions:
            with self.subTest(case=row['id']):
                result = verify_preparation(row['word'], Runtime(row['configuration']))
                self.assertTrue(result['available'])
                self.assertEqual(row['draws'], len(row['word']['trace']['morphologyPreparation']['rolls']))
                self.assertEqual(verify_profile_word(row['word'], Runtime(row['configuration']), True)['availability'], 'affixed')

    def test_rejected_transaction_corruptions(self):
        corruptions = {
            'missing-initial-coordinate': lambda r: r['phonesBefore']['final'].pop(),
            'unexplained-draw': lambda r: r['rolls'].append(0.5),
            'duplicate-identity': lambda r: r['phonesAfter']['initial'].append(copy.deepcopy(r['phonesAfter']['initial'][0])),
            'forged-outcome': lambda r: r['prepared']['evaluations'][0].update(outcome='accepted'),
            'forged-target': lambda r: r['prepared']['evaluations'][0]['target'].update(index=99),
            'erased-reasons': lambda r: r['prepared']['evaluations'][0]['guard'].update(rejections=[]),
            'forged-affix-index': lambda r: r['prepared']['evaluations'][0].update(affixIndex=99),
            'forged-selected-form': lambda r: r['prepared']['suffix']['resolved'].update(written='forged'),
            'forged-owner': lambda r: r['phonesAfter']['initial'][0]['source'].update(part='suffix'),
            'scheduled-rejected-rule': lambda r: r['prepared']['rules'].append({'ruleIndex': 0, 'boundary': 'root-suffix', 'rule': 'soften'}),
            'forged-assembled-metadata': lambda r: r['after']['syllables'][0]['nucleus'][0].update(tense='forged'),
        }
        for name, mutate in corruptions.items():
            with self.subTest(corruption=name):
                word = copy.deepcopy(self.rejected['word'])
                mutate(word['trace']['morphologyPreparation'])
                with self.assertRaises((AssertionError, KeyError, IndexError)):
                    verify_preparation(word, Runtime(self.rejected['configuration']))

    def test_accepted_transaction_corruptions(self):
        corruptions = {
            'erased-accepted-ledger-change': lambda t: t['morphologyPreparation']['phonesAfter'].update(changes=[]),
            'erased-written-half': lambda t: t['morphology']['realization'].update(rootEdits=[]),
            'forged-written-output': lambda t: t['morphology']['realization']['rootEdits'][0].update(after='forged'),
        }
        for name, mutate in corruptions.items():
            with self.subTest(corruption=name):
                word = copy.deepcopy(self.accepted['word'])
                mutate(word['trace'])
                with self.assertRaises((AssertionError, KeyError, IndexError)):
                    verify_preparation(word, Runtime(self.accepted['configuration']))

    def test_missing_affixed_diagnostics_fail(self):
        for missing in ('morphologyPreparation', 'prepared', 'evaluations'):
            with self.subTest(missing=missing):
                word = copy.deepcopy(self.rejected['word'])
                record = word['trace']
                if missing != 'morphologyPreparation':
                    record = record['morphologyPreparation']
                if missing == 'evaluations':
                    record = record['prepared']
                del record[missing]
                with self.assertRaises((AssertionError, KeyError)):
                    verify_profile_word(word, Runtime(self.rejected['configuration']), True)

    def test_disabled_profile_cannot_hide_transactions(self):
        with self.assertRaises(AssertionError):
            verify_profile_word(self.rejected['word'], Runtime(self.rejected['configuration']), False)
        word = copy.deepcopy(self.rejected['word'])
        del word['trace']['morphology']
        del word['trace']['morphologyPreparation']
        self.assertEqual(verify_profile_word(word, Runtime(self.rejected['configuration']), False)['availability'], 'profile-disabled')

    def test_bare_profile_is_identity_operation(self):
        word = copy.deepcopy(self.rejected['word'])
        word['trace']['morphology'] = {'template': 'bare'}
        record = word['trace']['morphologyPreparation']
        record.update(template='bare', configurationIndices={}, after=copy.deepcopy(record['before']),
                      phonesAfter=copy.deepcopy(record['phonesBefore']), rolls=[], structural=[], regexBefore=[], regexAfter=[])
        del record['prepared']
        runtime = Runtime(self.rejected['configuration'])
        self.assertEqual(verify_profile_word(word, runtime, True)['availability'], 'planned-bare')
        for field, value in [('rolls', [0.5]), ('configurationIndices', {'suffix': 0}), ('regexAfter', [1])]:
            with self.subTest(field=field):
                corrupted = copy.deepcopy(word)
                corrupted['trace']['morphologyPreparation'][field] = value
                with self.assertRaises(AssertionError):
                    verify_profile_word(corrupted, runtime, True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
