import math
import unittest
from independent_reconstruction import integer_model, observations
from verify_likelihoods import compare, log_probability, summary

class IndependentLikelihoodTests(unittest.TestCase):
    def setUp(self):
        self.training = [dict(spelling=name, tokens=tokens) for name, tokens in
                         [('alpha', ['K', 'AE0', 'T']), ('beta', ['P', 'AE0', 'T'])]]
        self.model = integer_model(self.training)
        self.context = dict(constituent='onset', nucleusClass='monophthong', stress=0,
                            wordInitial=True, wordFinal=True)
    def test_hand_calculated_probabilities(self):
        self.assertAlmostEqual(math.exp(log_probability(self.model, self.context, ['K'], 0.5, 'baseline')), 0.4046875, places=14)
        self.assertAlmostEqual(math.exp(log_probability(self.model, self.context, ['K'], 0.5, 'candidate')), 0.4961875, places=14)
    def test_word_and_event_denominators(self):
        result = summary(self.model, [('probe', self.context, ['K']), ('probe', self.context, ['P'])], 0.5, 'baseline')
        self.assertEqual((result['words'], result['events']), (1, 2))
        self.assertAlmostEqual(result['meanPerWord'], -2*math.log(0.4046875), places=14)
    def test_rare_long_sequence_has_finite_log_probability(self):
        self.assertTrue(math.isfinite(log_probability(self.model, self.context, ['ZH']*1000, 8, 'candidate')))
    def test_segmentation_uses_only_supplied_onsets(self):
        result = list(observations([dict(spelling='probe', tokens=['AA0', 'ZH', 'HH', 'AE1'])], {''}))
        self.assertEqual(result[1][2], ['AA', 'ZH', 'HH'])
        self.assertEqual(result[2][2], [])
        self.assertEqual(result[2][1]['stress'], 1)
    def test_rejects_changed_numeric_or_integer_evidence(self):
        with self.assertRaises(AssertionError): compare({'count': 2}, {'count': 1})
        with self.assertRaises(AssertionError): compare({'score': 1.01}, {'score': 1.0})
        with self.assertRaises(AssertionError): compare({'score': float('nan')}, {'score': 1.0})

if __name__ == '__main__': unittest.main()
