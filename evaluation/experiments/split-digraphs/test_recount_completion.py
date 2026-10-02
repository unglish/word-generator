import copy
import math
import unittest
from recount_completion import check_completion_sample


def candidate(identity, weight, probability, refusal=None):
    entry = dict(inventoryIndex=identity, weight=weight, retainedWeight=weight if refusal is None else 0, probability=probability)
    if refusal is not None:
        entry['refusal'] = refusal
    return entry


class CompletionArithmetic(unittest.TestCase):
    def test_boundaries_and_inventory_order(self):
        for roll, selected in [(0, 8), (math.nextafter(.3, 0), 8), (.3, 2), (math.nextafter(1, 0), 2)]:
            sample = dict(status='selected', candidates=[candidate(8, 3, .3), candidate(2, 7, .7)], roll=roll, inventoryIndex=selected)
            self.assertEqual(check_completion_sample(sample)['draws'], 1)
            sample['inventoryIndex'] = 2 if selected == 8 else 8
            with self.assertRaisesRegex(ValueError, 'selected interval'):
                check_completion_sample(sample)

    def test_refusal_singleton_and_empty(self):
        sample = dict(status='selected', candidates=[candidate(0, 20, 0, 'reading'), candidate(1, 3, 1)], inventoryIndex=1)
        self.assertEqual(check_completion_sample(sample)['draws'], 0)
        sample['roll'] = .5
        with self.assertRaisesRegex(ValueError, 'singleton'):
            check_completion_sample(sample)
        self.assertEqual(check_completion_sample(dict(status='infeasible', candidates=[candidate(0, 1, 0, 'reading')]))['infeasible'], 1)
        self.assertEqual(check_completion_sample(dict(status='infeasible', candidates=[]))['candidates'], 0)

    def test_overflow_scaling_and_corruption(self):
        sample = dict(status='selected', candidates=[candidate(0, 1e308, .5), candidate(1, 1e308, .5)], inventoryIndex=1, roll=.5)
        self.assertEqual(check_completion_sample(sample)['selected'], 1)
        for field, value in [('retainedWeight', 0), ('probability', .6), ('weight', -1), ('inventoryIndex', 1)]:
            bad = copy.deepcopy(sample); bad['candidates'][0][field] = value
            with self.assertRaises(ValueError):
                check_completion_sample(bad)


if __name__ == '__main__':
    unittest.main()
