"""Reconcile complete original diagnostics and all original witness strata."""
from pathlib import Path
import datetime, gzip, hashlib, json, subprocess

ROOT = Path.cwd()
OUT = Path('/private/tmp/q02-corpus-acceptance-revalidation-v1')
HIST = OUT / 'historical'
WORK = OUT / 'witness-reconciliation'
SOURCE = Path('/private/tmp/q02-stream-acceptance-revalidation-v1/candidate-checkout')
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
PYTHON = '/Users/ryanbetts/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
TSX = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'

def read(path):
    return json.loads(path.read_text())

def original(relative):
    return json.loads(gzip.decompress((HIST / relative).read_bytes()))

def pin(path):
    h = hashlib.sha256()
    size = 0
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1048576), b''):
            h.update(chunk)
            size += len(chunk)
    return {'bytes': size, 'sha256': h.hexdigest()}

def save(path, value):
    with path.open('x') as handle:
        json.dump(value, handle, indent=2)
        handle.write('\n')

def check_source_and_archives():
    binding = read(OUT / 'source-binding.json')
    for role, files in binding['sourcePins'].items():
        for entry in files:
            assert pin(Path(binding[role + 'Source']) / entry['path']) == {
                k: entry[k] for k in ['bytes', 'sha256']
            }
    for entry in read(OUT / 'preparation-registration.json')['rawPins']:
        assert pin(OUT / 'archives' / entry['role'] / entry['file']) == {
            k: entry[k] for k in ['bytes', 'sha256']
        }

check_source_and_archives()
control = original('diagnostics/trigrams-control.json.gz')
candidate = original('diagnostics/trigrams-candidate.json.gz')
equality = original('context/diagnostic-equality.json.gz')
assert set(control) == set(candidate) == {'generatedAt', 'config', 'aggregate', 'bySeed', 'artifacts'}
assert equality['comparedFields'] == ['config', 'aggregate', 'bySeed']
assert equality['excludedFields'] == ['generatedAt', 'artifacts']
for key in equality['comparedFields']:
    assert control[key] == candidate[key], key
for role in ['control', 'candidate']:
    raw = gzip.decompress((HIST / f'diagnostics/trigrams-{role}.json.gz').read_bytes())
    assert hashlib.sha256(raw).hexdigest() == equality[role + 'Sha256']
assert control['config']['seeds'] == [42, 123, 456, 789, 1337]
assert control['config']['countPerSeed'] == 400000
assert control['config']['totalWords'] == equality['wordsPerArm'] == 2000000
assert [(s['seed'], s['wordCount']) for s in control['bySeed']] == [
    (seed, 400000) for seed in control['config']['seeds']
]

WORK.mkdir()
operators = []
old_source = '/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator'
old_archive = '/private/tmp/q02-final-word-provenance-v1'
for name, replacements in [
    ('retain-witnesses.py', [(old_archive, str(OUT / 'archives/candidate'))]),
    ('verify-witnesses.mjs', [(old_source, str(SOURCE)), (old_archive, str(OUT / 'archives/candidate'))]),
]:
    source = HIST / 'tools' / name
    raw = source.read_text()
    moved = raw
    counts = []
    for old, new in replacements:
        assert old in moved and new not in moved
        counts.append({'original': old, 'owned': new, 'occurrences': moved.count(old)})
        moved = moved.replace(old, new)
    reversed_text = moved
    for old, new in reversed(replacements):
        reversed_text = reversed_text.replace(new, old)
    assert reversed_text == raw
    path = WORK / name
    path.write_text(moved)
    operators.append({'name': name, 'original': pin(source), 'relocated': pin(path),
                      'locations': counts, 'reverseSubstitutionByteExact': True})
save(WORK / 'location-registration.json', {
    'registeredAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'operators': operators,
    'scope': 'Literal source/archive root relocation only; original full 200000-word selection, counts, checks and no-overwrite unchanged.'
})
commands = []
for name, args in [
    ('all200000-original-witness-selection', [PYTHON, '-B', str(WORK / 'retain-witnesses.py')]),
    ('all-nine-original-production-witness-verifications', [NODE, '--import', TSX, str(WORK / 'verify-witnesses.mjs')]),
]:
    record = {'name': name, 'args': args, 'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    with (WORK / (name + '.log')).open('xb') as log:
        result = subprocess.run(args, cwd=SOURCE, stdout=log, stderr=subprocess.STDOUT)
    record.update(exitCode=result.returncode, completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
    commands.append(record)
    (WORK / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n')
    assert result.returncode == 0
fresh = json.loads(gzip.decompress((WORK / 'witnesses.json.gz').read_bytes()))
assert fresh == original('context/witnesses.json.gz')
assert fresh['wordsScanned'] == 200000 and len(fresh['witnesses']) == 9
assert fresh['absentStrata'] == ['final-cleanup-edited']
assert fresh['stratumCounts']['final-cleanup-edited'] == 0
verification = read(WORK / 'witness-verification.json')
assert verification['passed'] and verification['records'] == 9
assert verification['witnessesSha256'] == pin(WORK / 'witnesses.json.gz')['sha256']
assert verification['runnerSha256'] == pin(WORK / 'verify-witnesses.mjs')['sha256']
check_source_and_archives()
report = {
    'passed': True, 'originalTrigramWordsEach': 2000000, 'originalSeeds': 5,
    'allOriginalDiagnosticConfigurationAggregateAndSeedFieldsExact': True,
    'diagnosticExclusions': ['generatedAt', 'artifacts'],
    'fullOriginalWitnessSelectionWords': 200000,
    'allOriginalWitnessRecordsAndStratumCountsExact': True,
    'fullWitnessRecordsReplayed': 9, 'absentStrata': fresh['absentStrata'],
    'sourceAndAll50ScientificArtifactsStableBeforeAfter': True,
    'commands': commands,
    'scope': 'Original complete two-million-word-per-arm diagnostic reports authenticated and compared, not newly generated. Frozen original selector freshly scans all 200000 original candidate records; all nine full first-witness records and every stratum count reproduce. Production verifiers freshly replay all nine. Missing final-cleanup-edited stratum remains absent; no preference or general final phonemic licensing claim.'
}
save(OUT / 'diagnostic-witness-reconciliation.json', report)
print(json.dumps({k: v for k, v in report.items() if k not in ['commands', 'scope']}))
