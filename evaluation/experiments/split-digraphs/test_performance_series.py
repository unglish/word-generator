import importlib.util
from pathlib import Path
import unittest
spec = importlib.util.spec_from_file_location('series', Path(__file__).with_name('performance-series.py'))
series = importlib.util.module_from_spec(spec); spec.loader.exec_module(series)


class PerformanceSeries(unittest.TestCase):
    def test_paired_median_and_failed_gates(self):
        records = [dict(variant=variant, wordsPerSec=100 if variant == 'A' else 80,
                        speedPass=variant == 'A', variancePass=True) for variant in series.ORDER]
        result = series.summarize(records)
        self.assertAlmostEqual(result['medianPairedPercentChange'], -20)
        self.assertEqual(result['gates']['B']['speedPass'], 0)
        self.assertEqual(result['gates']['A']['variancePass'], 6)
        records[0], records[1] = records[1], records[0]
        with self.assertRaises(ValueError):
            series.summarize(records)


if __name__ == '__main__':
    unittest.main()
