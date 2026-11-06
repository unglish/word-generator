"""Static model parsing only; never executes the historical table."""
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest

spec = importlib.util.spec_from_file_location("scores", Path(__file__).with_name("verify-score-reference.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
joint = module.load_joint(module.ROOT)
model = module.audit_model(module.ROOT, joint)


class ScoreModelTests(unittest.TestCase):
    def test_complete_model_data_matches_independently_imported_ts_exports(self):
        script = "import {ARPABET_BIGRAM_COUNTS as counts,ARPABET_TOTAL_COUNTS as totals,ALL_ARPABET_PHONEMES as v} from './src/phonotactic/arpabet-bigrams.ts'; console.log(JSON.stringify({counts,totals,vocabulary:[...v]}));"
        output = subprocess.run(["node", "--import", "tsx", "--input-type=module", "-e", script], cwd=module.ROOT, check=True, text=True, capture_output=True)
        self.assertEqual(json.loads(output.stdout), model)
        self.assertEqual(len(model["vocabulary"]), 40)
        self.assertEqual(sum(map(len, model["counts"].values())), 1338)
        self.assertEqual(sum(model["totals"].values()), 976831)

    def test_restricted_parser_rejects_code_duplicate_keys_and_invalid_counts(self):
        original = (module.ROOT / module.TABLE_PATH).read_text()
        changes = [original + "\nconsole.log('never executed');", original.replace('"B": 9632', '"B": (1+2)', 1),
                   original.replace('"B": 9632', '"B": 9632, "B": 9632', 1), original.replace('"B": 9632', '"B": true', 1),
                   original.replace('"B": 9632', '"B": 0.5', 1), original.replace('"B": 9632', '"B": -1', 1),
                   original.replace('"#": 132603', '"#": 132604', 1), original.replace('"#", "AA"', '"#", "#"', 1)]
        for changed in changes:
            with self.subTest(changed=changed[-70:]), self.assertRaises(ValueError):
                module.parse_model(changed, joint)


if __name__ == "__main__":
    unittest.main()
