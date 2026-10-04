"""Full original Q15c5 reproduction with explicitly registered relocated authority."""
from pathlib import Path
import datetime
import gzip
import hashlib
import json
import os
import subprocess
import sys

ROOT = Path.cwd()
OUT = Path('/private/tmp/q15c5-acceptance-revalidation-v2')
CHECKOUT = OUT / 'checkout'
PACKAGE = CHECKOUT / 'evaluation/experiments/cmu-model-sensitivity/outcomes'
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
PYTHON = sys.executable
LOADER = str(ROOT / 'node_modules/tsx/dist/loader.mjs')
os.environ['PATH'] = str(Path(NODE).parent) + ':' + os.environ['PATH']
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def pin(path):
    digest = hashlib.sha256()
    size = 0
    with path.open('rb') as handle:
        for data in iter(lambda: handle.read(1048576), b''):
            digest.update(data)
            size += len(data)
    return {'bytes': size, 'sha256': digest.hexdigest()}


def save(path, value):
    with path.open('x') as handle:
        json.dump(value, handle, indent=2)
        handle.write('\n')
        handle.flush()
        os.fsync(handle.fileno())


def read(path):
    return json.loads(path.read_text())


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])


OUT.mkdir()
subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(ROOT), str(CHECKOUT)], check=True, capture_output=True)
subprocess.run(['git', '-C', str(CHECKOUT), 'checkout', '--detach', '71f5a6f6af2291e14d0b012f1ab5911a3d7ecca0'], check=True, capture_output=True)
modules = CHECKOUT / 'node_modules'
modules.mkdir()
for path in Path('/Users/ryanbetts/Code/unglish/word-generator/node_modules').iterdir():
    if path.name in ['.vite', '.vite-temp']:
        (modules / path.name).mkdir()
    else:
        (modules / path.name).symlink_to(path, target_is_directory=path.is_dir())
summary = CHECKOUT / 'evaluation/experiments/cmu-model-sensitivity/RESULTS.md'
summary_pin = pin(summary)
summary.rename(PACKAGE / 'RESULTS.md')
assert pin(PACKAGE / 'RESULTS.md') == summary_pin
old_path = PACKAGE / 'machine/authority/source-input-freeze.json'
original = read(old_path)
assert pin(old_path)['sha256'] == '0676ac8c6669afa1b05519e68dee995359d5be7bab9ec72014f015f29f44c569'
assert len(original['sources']) == 338 and len(original['inputFiles']) == 30
for name, expected in original['sources'].items():
    assert pin(CHECKOUT / name) == expected, name
inputs = OUT / 'inputs'
inputs.mkdir()
data = {
    'source': (ROOT / '.local-evidence/running-text-frequency/retained-local-v1/sources/q17-cmudict-74790861.dict').read_bytes(),
    'identity': git('show', 'd95167be2a:src/phonology/identity.ts'),
    'identityReport': gzip.decompress(git('show', 'd95167be2a:evaluation/experiments/phoneme-identity/identity-original.json.gz')),
}
destinations = {'source': inputs / 'cmudict.dict', 'identity': inputs / 'identity.ts', 'identityReport': inputs / 'identity-original.json'}
for key, destination in destinations.items():
    with destination.open('xb') as handle:
        handle.write(data[key])
    assert pin(destination) == original['inputFiles'][original['inputs'][key]]
relocated_inputs = {key: str(path) for key, path in destinations.items()}
relocated_inputs['archive'] = original['inputs']['archive']
assert Path(relocated_inputs['archive']).is_dir()
for path, expected in original['inputFiles'].items():
    if path not in [original['inputs'][key] for key in destinations]:
        assert pin(Path(path)) == expected
registration = {
    'registeredAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'publishedHead': '71f5a6f6af2291e14d0b012f1ab5911a3d7ecca0',
    'originalFreeze': pin(old_path), 'originalRoot': original['root'], 'relocatedRoot': str(CHECKOUT),
    'originalInputs': original['inputs'], 'relocatedInputs': relocated_inputs,
    'sourcePinsExact': 338, 'inputPinsExact': 30,
    'driverSha256': pin(Path(__file__))['sha256'],
    'publicationLayoutRepair': {'from': 'evaluation/experiments/cmu-model-sensitivity/RESULTS.md',
        'to': 'evaluation/experiments/cmu-model-sensitivity/outcomes/RESULTS.md', **summary_pin,
        'reason': 'Post-measurement summary is not in original338 source closure; frozen guards allow outcome documents only under outcomes. Exact summary bytes preserved.'},
    'priorAttempt': '/private/tmp/q15c5-acceptance-revalidation-v1/freeze-command.json',
    'scope': 'Separately registered complete reproduction. Only root and three unavailable external input locations change. All338 source bytes,30 input bytes, engine identity,317485 rows,15 CLI cases,original operators,tolerances and default heap remain unchanged. New freeze/report authority is never relabeled as historical authority. Compare all21 row streams byte-for-byte and every report field except declared authority and authority-dependent canonical digest.'
}
save(OUT / 'relocation-registration.json', registration)
commands = []


def run(name, args):
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    print('starting ' + name, flush=True)
    with (OUT / (name + '.log')).open('xb') as log:
        result = subprocess.run(args, cwd=CHECKOUT, stdout=log, stderr=subprocess.STDOUT)
    record = {'name': name, 'args': args, 'cwd': str(CHECKOUT), 'startedAt': started,
              'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'exitCode': result.returncode}
    commands.append(record)
    save(OUT / (name + '-command.json'), record)
    assert result.returncode == 0, name
    print('passed ' + name, flush=True)


freeze = OUT / 'relocated-source-input-freeze.json'
run('freeze', [NODE, '--import', LOADER, 'evaluation/corpus/model-sensitivity-cli.ts', 'freeze',
    '--source', relocated_inputs['source'], '--archive', relocated_inputs['archive'],
    '--identity', relocated_inputs['identity'], '--identity-report', relocated_inputs['identityReport'], '--out', str(freeze)])
actual = read(freeze)
expected = dict(original)
expected['root'] = str(CHECKOUT)
expected['inputs'] = relocated_inputs
expected['inputFiles'] = dict(original['inputFiles'])
for key, destination in destinations.items():
    expected['inputFiles'][str(destination)] = expected['inputFiles'].pop(original['inputs'][key])
assert actual == expected, 'New authority differs beyond registered paths'
digest = pin(freeze)['sha256']
save(OUT / 'relocated-freeze-review.json', {
    'originalFreeze': pin(old_path), 'relocatedFreeze': pin(freeze), 'allNonPathFieldsExact': True,
    'complete338SourcePinsEqual': True, 'complete30InputPinsEqualAfterDeclaredPathMapping': True,
    'engineIdentityExactlyEqual': actual['engine'] == original['engine'], 'reviewedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()
})
matrix = OUT / 'full-acceptance'
run('original-full-matrix', [NODE, '--import', LOADER, 'evaluation/corpus/model-sensitivity-acceptance.ts', str(freeze), digest, str(matrix)])
acceptance = read(matrix / 'acceptance.json')
assert acceptance['passed'] and len(acceptance['records']) == 15
assert all(x['actualExit'] == x['expectedExit'] for x in acceptance['records'])
assert len(acceptance['hashes']) == 22
study = matrix / 'root-run'
report_hash = pin(study / 'report.json')['sha256']
save(OUT / 'fresh-report-authority.json', {'path': str(study / 'report.json'), **pin(study / 'report.json')})
run('original-independent-full-proof', [PYTHON, '-B', 'evaluation/corpus/verify-model-sensitivity.py',
    '--freeze', str(freeze), '--freeze-sha256', digest, '--run', str(study), '--report-sha256', report_hash, '--out', str(OUT / 'independent-proof.json')])
independent = read(OUT / 'independent-proof.json')
assert independent['passed'] and independent['counts'] == {'english': 117485, 'generated': 200000}
assert independent['numericComparisons'] == 5325847
streams = {}
for path in sorted((PACKAGE / 'machine/study').glob('*.jsonl.gz')):
    fresh = study / path.name
    assert pin(path) == pin(fresh), path.name
    streams[path.name] = pin(fresh)
assert len(streams) == 21
old_report = json.loads(gzip.decompress((PACKAGE / 'machine/study/report.json.gz').read_bytes()))
fresh_report = read(study / 'report.json')
assert old_report['report']['authority'] == {'freezeSha256': pin(old_path)['sha256'], 'frozen': original}
assert fresh_report['report']['authority'] == {'freezeSha256': digest, 'frozen': actual}
old_report['report'].pop('authority')
fresh_report['report'].pop('authority')
old_report.pop('digest')
fresh_report.pop('digest')
assert old_report == fresh_report, 'Published/fresh semantic report equality outside declared authority'
save(OUT / 'published-equivalence.json', {'all21StreamsByteIdentical': streams,
    'entireSemanticReportEqualExceptDeclaredAuthority': True,
    'excludedFields': ['report.authority', 'digest'],
    'reason': 'New registered paths produce a distinct authority and dependent canonical digest. All measured fields and witnesses are exact.'})
for name, args in [
    ('original-python-fixtures', [PYTHON, '-B', 'evaluation/corpus/verify-model-sensitivity-test.py']),
    ('original-review-tests', [NODE, 'node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.review.config.ts']),
    ('original-corpus-types', [NODE, 'node_modules/typescript/bin/tsc', '-p', 'tsconfig.corpus.json', '--noEmit']),
    ('original-review-types', [NODE, 'node_modules/typescript/bin/tsc', '-p', 'tsconfig.review.json', '--noEmit']),
]:
    run(name, args)
for path, expected in actual['sources'].items():
    assert pin(CHECKOUT / path) == expected
for path, expected in actual['inputFiles'].items():
    assert pin(Path(path)) == expected
save(OUT / 'commands.json', commands)
save(OUT / 'complete.json', {'terminal': True, 'passingCommands': len(commands), 'sourcePinsStable': 338,
    'inputPinsStable': 30, 'all21PublishedRowStreamsByteEqual': True, 'allSemanticReportFieldsEqualExceptRegisteredAuthority': True,
    'completedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()})
print('Complete full Q15c5 registered reproduction', flush=True)
