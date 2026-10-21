"""Finish original checks without repeating the completed full CLI studies."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import subprocess

ROOT = Path.cwd()
OUT = Path('/private/tmp/q15c5-acceptance-revalidation-v2')
CHECKOUT = OUT / 'checkout'
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
PYTHON = '/opt/homebrew/opt/python@3.13/bin/python3.13'
os.environ['PATH'] = str(Path(NODE).parent) + ':' + os.environ['PATH']
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
os.environ['Q15_IDENTITY_MODULE'] = str(OUT / 'inputs/identity.ts')


def save(path, value):
    with path.open('x') as handle:
        json.dump(value, handle, indent=2)
        handle.write('\n')


def pin(path):
    h = hashlib.sha256()
    size = 0
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1048576), b''):
            size += len(chunk)
            h.update(chunk)
    return {'bytes': size, 'sha256': h.hexdigest()}


freeze = json.loads((OUT / 'relocated-source-input-freeze.json').read_text())
assert pin(Path(os.environ['Q15_IDENTITY_MODULE'])) == freeze['inputFiles'][os.environ['Q15_IDENTITY_MODULE']]
save(OUT / 'fixture-input-registration.json', {
    'fixtureEnvironment': {'Q15_IDENTITY_MODULE': os.environ['Q15_IDENTITY_MODULE']},
    'existingFixtureHook': 'Both unchanged original TS and Python fixtures support Q15_IDENTITY_MODULE and check exact pinned observer bytes.',
    'priorFailure': 'original-python-fixtures-command.json; historical /private/tmp/q16-files/identity.ts absent',
    'historicalPython': PYTHON, 'historicalPythonVersion': subprocess.check_output([PYTHON, '--version'], text=True).strip(),
    'supplementalEarlierProofPython': 'registered Python3.12.14; full317485 rows and5325847 numeric comparisons passed; retained separately',
    'finishDriverSha256': pin(Path(__file__))['sha256']})
commands = []
for name, args in [
    ('python-fixtures-bound', [PYTHON, '-B', 'evaluation/corpus/verify-model-sensitivity-test.py']),
    ('review-tests-bound', [NODE, 'node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.review.config.ts']),
    ('corpus-types', [NODE, 'node_modules/typescript/bin/tsc', '-p', 'tsconfig.corpus.json', '--noEmit']),
    ('review-types', [NODE, 'node_modules/typescript/bin/tsc', '-p', 'tsconfig.review.json', '--noEmit']),
    ('targeted-lint', [NODE, 'node_modules/eslint/bin/eslint.js', 'evaluation/corpus/model-sensitivity.ts',
        'evaluation/corpus/model-sensitivity-integrity.ts', 'evaluation/corpus/model-sensitivity-acceptance.ts',
        'evaluation/corpus/model-sensitivity-runner.ts', 'evaluation/corpus/model-sensitivity-cli.ts',
        'evaluation/review/cmu-model-sensitivity.test.ts']),
]:
    print('starting ' + name, flush=True)
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with (OUT / (name + '.log')).open('xb') as log:
        result = subprocess.run(args, cwd=CHECKOUT, stdout=log, stderr=subprocess.STDOUT)
    record = {'name': name, 'args': args, 'cwd': str(CHECKOUT), 'startedAt': started,
        'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'exitCode': result.returncode,
        'fixtureEnvironment': {'Q15_IDENTITY_MODULE': os.environ['Q15_IDENTITY_MODULE']}}
    commands.append(record)
    save(OUT / (name + '-command.json'), record)
    assert result.returncode == 0, name
    print('passed ' + name, flush=True)
for name, expected in freeze['sources'].items():
    assert pin(CHECKOUT / name) == expected
for name, expected in freeze['inputFiles'].items():
    assert pin(Path(name)) == expected
save(OUT / 'additional-commands.json', commands)
save(OUT / 'additional-complete.json', {'terminal': True, 'commands': len(commands), 'passing': len(commands),
    'sourcePinsStable': 338, 'inputPinsStable': 30})
