import copy
import unittest
from recount import add, counter_set, jsd, observe

class RecountContracts(unittest.TestCase):
    def word(self):
        return dict(written=dict(clean='brants'),syllables=[dict(onset=[dict(sound='b'),dict(sound='r')],
          nucleus=[dict(sound='æ')],coda=[dict(sound='n'),dict(sound='t'),dict(sound='s')],stress='ˈ')],
          trace=dict(stages=[dict(stage='complete')],repairs=[dict(rule='example')],morphology=dict(template='suffixed'),attempts=1))
    def test_exact_phone_and_word_denominators(self):
        counters=counter_set();add(counters,observe(self.word()))
        self.assertEqual(counters['counts']['words'],1)
        self.assertEqual(counters['counts']['phones'],6)
        self.assertEqual(counters['jointLengthSyllables'],{'6:1':1})
        self.assertEqual(counters['morphologyTemplates'],{'suffixed':1})
        self.assertEqual(counters['repairRules'],{'example':1})
        self.assertEqual(counters['trigrams'],{'bra':1,'ran':1,'ant':1,'nts':1})
    def test_equality_does_not_collapse_phones(self):
        word=self.word();word['syllables'][0]['coda']=[dict(sound='s'),dict(sound='s')]
        result=observe(word);self.assertEqual(result['adjacent'],1)
        self.assertEqual(result['phones'][-2:],['s','s'])
    def test_missing_trace_or_empty_nucleus_fails(self):
        for change in ['trace','nucleus']:
            word=self.word()
            if change=='trace':del word['trace']
            else:word['syllables'][0]['nucleus']=[]
            with self.assertRaises(AssertionError):observe(word)
    def test_distance_has_explicit_normalization_and_symmetric_support(self):
        self.assertEqual(jsd({'a':2},{'a':7}),0)
        self.assertAlmostEqual(jsd({'a':1},{'b':1}),__import__('math').log(2))
        self.assertEqual(jsd({'a':1,'b':2},{'b':3}),jsd({'b':3},{'a':1,'b':2}))

if __name__=='__main__':unittest.main()
