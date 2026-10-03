"""Finite Q11b paired summaries/output census after the reserved timing interval."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).parent
TOOLS = BASE / 'summary-tools'
OUT = Path('/private/tmp/q11b-paired-summary-driver-v1')
PREREQUISITE = Path('/private/tmp/q11b-gates-driver-v1/complete.json')
REPORT = Path('/private/tmp/q11b-paired-summary-v1/complete.json')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


OUT.mkdir()
paths = [Path(__file__)] + [path for path in TOOLS.iterdir() if path.is_file()]
before = {str(path): digest(path) for path in paths}
(OUT / 'before.json').write_text(json.dumps({'inputs': before, 'prerequisite': str(PREREQUISITE),
    'scope': 'Wait for Q11b full public/independent audits and all original gates/timing. Compare all original evaluator summaries and same-seed output pairs without changing measured sources.'}, indent=2) + '\n')
try:
    print('Q11b full paired summaries/output census queued after original gates/timing.', flush=True)
    while not PREREQUISITE.exists():
        for name in ('failure.json', 'upstream-failure.json'):
            failure = PREREQUISITE.parent / name
            if failure.exists():
                (OUT / 'upstream-failure.json').write_text(json.dumps({'path': str(failure)}, indent=2) + '\n')
                raise RuntimeError('Gate prerequisite failed; paired comparison not started')
        time.sleep(15)
    gates = json.loads(PREREQUISITE.read_bytes())
    assert gates['passed'] is True
    assert gates['sourceCommit'] == '9d2680b37b77ebb2f492f4173b1f1681446e40f4'
    assert before == {str(path): digest(path) for path in paths}
    command = ['/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node', '--import',
        '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs', str(TOOLS / 'compare-summaries.mjs')]
    with (OUT / 'comparison.log').open('x') as log:
        process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    if process.returncode:
        raise RuntimeError('Paired comparison failed; all existing results/logs retained')
    report = json.loads(REPORT.read_bytes())
    assert report['passed'] is True and report['before'] == report['after']
    assert report['wordsPerArm'] == 400000
    assert report['unchangedBareWords'] == 200000 and report['pairedAffixedProfileWords'] == 200000
    assert before == {str(path): digest(path) for path in paths}
    (OUT / 'complete.json').write_text(json.dumps({'passed': True, 'inputPins': before,
        'prerequisiteSha256': digest(PREREQUISITE), 'reportSha256': digest(REPORT),
        'command': command, 'exitCode': process.returncode,
        'scope': 'Full 400k-per-arm evaluator summaries; 200k complete bare words/traces byte-identical, 200k same-seed affixed-profile output pairs counted. Rejection may alter later RNG consumption; no human-preference claim.'}, indent=2) + '\n')
except Exception as error:
    (OUT / 'failure.json').write_text(json.dumps({'error': str(error), 'type': type(error).__name__}, indent=2) + '\n')
    raise
