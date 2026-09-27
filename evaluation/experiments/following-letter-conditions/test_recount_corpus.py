"""Run after smoke-corpus.mjs; Q14B_SMOKE points to its retained output."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class CorpusRecountTests(unittest.TestCase):
    def setUp(self):
        self.smoke = Path(os.environ['Q14B_SMOKE'])
        self.archive = self.smoke / 'archive'
        self.analysis = self.smoke / 'analysis'

    def run_recount(self, analysis, complete_hash=None):
        return subprocess.run(['python3', str(Path(__file__).with_name('recount_corpus.py')),
                               str(self.archive), str(analysis), sha(self.archive / 'manifest.json'),
                               complete_hash or sha(analysis / 'complete.json')],
                              capture_output=True, text=True, env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})

    def test_complete_smoke(self):
        result = self.run_recount(self.analysis)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['words'], 24)

    def test_wrong_pinned_completion(self):
        result = self.run_recount(self.analysis, '0' * 64)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('wrong pinned authority', result.stderr)

    def test_resealed_wrong_group_totals_are_detected(self):
        with tempfile.TemporaryDirectory(prefix='q14b-recount-corruption-') as temporary:
            analysis = Path(temporary) / 'analysis'
            shutil.copytree(self.analysis, analysis)
            report_path = analysis / 'report.json'
            report = json.loads(report_path.read_text())
            report['groups'][0]['counts']['words'] += 1
            report_path.write_text(json.dumps(report))
            complete_path = analysis / 'complete.json'
            complete = json.loads(complete_path.read_text())
            entry = next(item for item in complete['artifacts'] if item['file'] == 'report.json')
            entry.update(bytes=report_path.stat().st_size, sha256=sha(report_path))
            complete_path.write_text(json.dumps(complete))
            result = self.run_recount(analysis)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('group accounting mismatch', result.stderr)


if __name__ == '__main__':
    unittest.main()
