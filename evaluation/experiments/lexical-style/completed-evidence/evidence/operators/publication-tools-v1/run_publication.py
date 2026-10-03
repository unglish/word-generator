"""Finish Q20 evidence packaging during scientific work, outside timing."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import time
import traceback

HERE = Path(__file__).resolve().parent
MAIN = HERE.parents[2]
OUT = Path('/private/tmp/q20-publication-driver-v1')
STAGE = Path('/private/tmp/q20-publication-stage-v1')
PYTHON = '/Users/ryanbetts/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'


def pin(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def inputs():
    return {file.name: pin(file) for file in sorted(HERE.iterdir())}


def wait_success(root):
    while not (root / 'complete.json').exists():
        assert not (root / 'failure.json').exists(), str(root / 'failure.json')
        time.sleep(15)
    assert json.loads((root / 'complete.json').read_bytes())['passed']
    return {'path': str(root / 'complete.json'), **pin(root / 'complete.json')}


def run(name, command):
    with (OUT / (name + '.log')).open('x') as log:
        process = subprocess.run(command, cwd=MAIN, stdout=log, stderr=subprocess.STDOUT)
    record = {'stage': name, 'command': command, 'exitCode': process.returncode, 'log': pin(OUT / (name + '.log'))}
    with (OUT / 'progress.jsonl').open('a') as stream:
        stream.write(json.dumps(record) + '\n')
    assert process.returncode == 0, str(command) + ' exit ' + str(process.returncode)
    assert inputs() == BEFORE
    print(json.dumps(record), flush=True)
    return record


if __name__ == '__main__':
    OUT.mkdir(mode=0o700)
    try:
        BEFORE = inputs()
        (OUT / 'before.json').write_text(json.dumps(BEFORE, indent=2) + '\n')
        prerequisites = [wait_success(Path('/private/tmp') / name) for name in
            ('q20-paired-summary-driver-v2', 'q20-whole-lint-v1', 'q21-storage-sharing-v1')]
        assert not Path('/private/tmp/q21-original-gates-driver-v2/timing-reservation.json').exists()
        results = [run('prepare', [PYTHON, '-B', str(HERE / 'prepare.py')]),
                   run('independent-full', [PYTHON, '-B', str(HERE / 'verify.py'), '--root', str(STAGE), '--full-local']),
                   run('negative-checks', [PYTHON, '-B', str(HERE / 'corruptions.py')])]
        shutil.copyfile('/private/tmp/q20-publication-corruptions-v1/complete.json', STAGE / 'independent-corruptions.json')
        shutil.copyfile(OUT / 'independent-full.log', STAGE / 'independent-verification.json')
        assert inputs() == BEFORE
        (OUT / 'complete.json').write_text(json.dumps({'passed': True, 'prerequisites': prerequisites,
            'commands': results, 'operators': BEFORE, 'validationIndex': pin(STAGE / 'validation-index.json'),
            'independent': pin(STAGE / 'independent-verification.json'), 'corruptions': pin(STAGE / 'independent-corruptions.json'),
            'scope': 'All original full evidence packaged and independently verified;4whole-package corruptions rejected. Repository failures remain failures. PR staging/commit/publication still requires exact review; no human gain.'}, indent=2) + '\n')
    except Exception as error:
        (OUT / 'failure.json').write_text(json.dumps({'error': repr(error), 'traceback': traceback.format_exc()}, indent=2) + '\n')
        raise
