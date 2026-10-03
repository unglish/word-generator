import copy
import gzip
import json
from pathlib import Path
import unittest
from final_endpoints import final_counts
from lineage_recount import recount_word

class EndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures=json.loads(gzip.decompress(Path(__file__).with_name('smoke-words.json.gz').read_bytes()))['fixtures']

    def test_public_records_replay_and_endpoints(self):
        self.assertGreater(len(self.fixtures),5)
        for word in self.fixtures.values():
            self.assertEqual(recount_word(word)['words'],1)
            counts=final_counts(word)
            self.assertEqual(counts['endpoint/words'],1)
            self.assertEqual(counts['endpoint/lexical/configuredViolation'],0)
            self.assertEqual(counts['endpoint/surface/configuredViolation'],0)
        self.assertTrue(any(key.startswith('repaired:') for key in self.fixtures))

    def test_independent_diagnostic_uses_actual_ending(self):
        word=copy.deepcopy(next(iter(self.fixtures.values())))
        # Deliberately corrupt only the emitted surface; endpoint counting must
        # detect it independently of otherwise valid lexical/trace packets.
        last=word['syllables'][-1];last['coda']=[];last['nucleus']=last['nucleus'][:1];last['nucleus'][0]['sound']='ɪ'
        self.assertEqual(final_counts(word)['endpoint/surface/legacyDiagnostic'],1)
        self.assertEqual(final_counts(word)['endpoint/lexical/legacyDiagnostic'],0)
        with self.assertRaises(AssertionError):recount_word(word)

    def test_checked_repair_cannot_be_rebound_or_removed(self):
        original=next(word for key,word in self.fixtures.items() if key.startswith('repaired:'))
        alterations=[lambda w:w['trace']['finalNucleus']['repairs'].clear(),
          lambda w:w['trace']['finalWord']['phones']['realization'].clear(),
          lambda w:w['trace']['finalNucleus']['rootAfter'][-1]['nucleus'][0].update(sound='forged')]
        for change in alterations:
            word=copy.deepcopy(original);change(word)
            with self.assertRaises(AssertionError):final_counts(word)
        word=copy.deepcopy(original)
        change=next(c for c in word['trace']['finalWord']['phones']['realization'] if c['rule']=='repairFinalCheckedVowel')
        word['trace']['finalWord']['phones']['initial'][change['id']]['source']['part']='suffix'
        with self.assertRaises(AssertionError):final_counts(word)

if __name__=='__main__':unittest.main()
