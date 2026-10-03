"""Package completed Q19 evidence without recomputing or discarding outcomes."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

BASE = Path(__file__).resolve().parent
STAGE = Path('/private/tmp/q19-publication-stage-v2')
RETAINED = BASE / 'retained-local-v1'
ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator')
MEASURED = '2144c816efaec4005911e774288258c0ed25f77a'


def pin_bytes(data):
    return dict(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())


def pin_file(path):
    digest = hashlib.sha256()
    size = 0
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
            size += len(chunk)
    return dict(bytes=size, sha256=digest.hexdigest())


def load(path):
    return json.loads(path.read_text())


fit = Path('/private/tmp/q19-registered-fit-v1')
before = load(fit / 'before.json')
assert before['head'] == MEASURED and before == load(fit / 'after.json')
fit_complete = load(fit / 'complete.json')
assert fit_complete['passed'] and fit_complete['measuredSource'] == MEASURED
assert pin_file(fit / 'artifact.json') == fit_complete['artifact']
for name in ['q19-independent-fit-v1', 'q19-independent-strata-v1', 'q19-paired-comparison-v1']:
    report = load(Path('/private/tmp') / name / 'complete.json')
    assert report['passed'] and report['before'] == report['after'], name
for arm in ['control', 'candidate']:
    capture = Path('/private/tmp') / f'q19-{arm}-capture-v1'
    assert load(capture / 'before.json') == load(capture / 'after.json')
    assert load(capture / 'complete.json')['words'] == 200000
    replay = Path('/private/tmp') / f'q19-{arm}-replay-v1'
    assert load(replay / 'before.json') == load(replay / 'after.json')
    assert load(replay / 'complete.json')['passed'] and load(replay / 'complete.json')['words'] == 200000
    recount = load(Path('/private/tmp') / f'q19-{arm}-recount-v1' / 'complete.json')
    assert recount['passed'] and recount['words'] == 200000 and recount['before'] == recount['after']
parity = load(Path('/private/tmp/q19-public-parity-v1/complete.json'))
assert parity['passed'] and parity['comparisons'] == 20000 and parity['probes'] == 40
assert load(Path('/private/tmp/q19-public-parity-v1/before.json')) == load(Path('/private/tmp/q19-public-parity-v1/after.json'))
gates_root = Path('/private/tmp/q19-gates-v1')
gates = load(gates_root / 'complete.json')
initial = load(gates_root / 'initial.json')
assert gates['passed'] and initial == gates['after']
assert len(gates['results']) == 32 and all(row['code'] == 0 for row in gates['results'])
assert len([row for row in gates['results'] if row['name'].startswith('pair-')]) == 24
for row in gates['results']:
    name = row['name']
    assert pin_file(gates_root / (name + '.log')) == row['log']
    assert load(gates_root / (name + '-before.json'))['before'] == initial
    assert load(gates_root / (name + '-after.json'))['after'] == initial
    for file, expected in row.items():
        if file.endswith(('.json', '.md')):
            assert pin_file(gates_root / file) == {key: expected[key] for key in ['bytes', 'sha256']}
            assert expected['state'] == 'created-or-modified-report'
checks = Path('/private/tmp/q19-publication-checks-v2')
publication = load(checks / 'complete.json')
assert publication['passed'] and publication['inheritedOnly'] and publication['lintPassed'] is False
assert publication['candidateExitCode'] == publication['baselineExitCode'] == 1
for key in ['candidateLog', 'baselineLog']:
    row = publication[key]
    assert pin_file(Path(row['path'])) == {k: row[k] for k in ['bytes', 'sha256']}
assert Path(publication['candidateLog']['path']).read_text().replace(str(ROOT), '<repo>') == Path(publication['baselineLog']['path']).read_text().replace('/private/tmp/q19-baseline-lint-v1/checkout', '<repo>')
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip() == MEASURED
assert subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=ROOT, text=True).strip() == ''
assert subprocess.check_output(['git', 'diff', '71f5a6f6af2291e14d0b012f1ab5911a3d7ecca0', MEASURED, '--', 'src', 'scripts', 'data'], cwd=ROOT) == b''
for path, expected in before['tracked'].items():
    assert pin_file(ROOT / path) == expected, path

STAGE.mkdir()
RETAINED.mkdir()
records = []
local_records = []


def add(source, destination):
    original = source.read_bytes()
    compressed = len(original) > 65536 or source.suffix == '.log'
    saved = gzip.compress(original, mtime=0) if compressed else original
    relative = destination + ('.gz' if compressed else '')
    target = STAGE / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as stream:
        stream.write(saved)
    records.append(dict(path=relative, origin=str(source), compression='gzip' if compressed else 'none',
                        saved=pin_bytes(saved), original=pin_bytes(original)))


def retain(source, destination, expected):
    assert pin_file(source) == expected, source
    target = RETAINED / destination
    target.parent.mkdir(parents=True, exist_ok=True)
    with source.open('rb') as incoming, target.open('xb') as outgoing:
        shutil.copyfileobj(incoming, outgoing)
    assert pin_file(target) == expected, target
    local_records.append(dict(path=destination, origin=str(source), **expected))


for source, expected in before['inputs'].items():
    retain(Path(source), 'sources/' + Path(source).name, expected)
for arm in ['control', 'candidate']:
    source = Path('/private/tmp') / f'q19-{arm}-capture-v1'
    complete = load(source / 'complete.json')
    assert complete['passed'] and pin_file(source / 'manifest.json') == complete['manifest']
    manifest = load(source / 'manifest.json')
    assert len(manifest['files']) == 20 and sum(row['words'] for row in manifest['files']) == 200000
    for row in manifest['files']:
        assert row['file'] == Path(row['file']).name
        retain(source / row['file'], arm + '/' + row['file'], {key: row[key] for key in ['bytes', 'sha256']})

for label in ['q19-registered-fit-v1', 'q19-independent-fit-v1', 'q19-independent-strata-v1',
              'q19-control-capture-v1', 'q19-candidate-capture-v1', 'q19-control-replay-v1',
              'q19-candidate-replay-v1', 'q19-control-recount-v1', 'q19-candidate-recount-v1',
              'q19-paired-comparison-v1', 'q19-public-parity-v1', 'q19-gates-v1', 'q19-gates-driver-v1',
              'q19-candidate-capture-driver-v1', 'q19-candidate-recount-driver-v1', 'q19-replays-driver-v1',
              'q19-publication-checks-v1', 'q19-publication-checks-v2', 'q19-publication-driver-v1', 'q19-baseline-lint-v1']:
    directory = Path('/private/tmp') / label
    assert directory.is_dir(), label
    for path in sorted(directory.iterdir()):
        if path.is_file() and not path.name.endswith(('.jsonl.gz', '.tar')):
            add(path, 'evidence/' + label + '/' + path.name)
for path in sorted(Path('/private/tmp').glob('q19*')):
    if path.is_file() and path.suffix in {'.log', '.json'} and path.name != 'q19-pos-literal-export-v1.json':
        add(path, 'evidence/preparation/' + path.name)
for path in sorted(BASE.rglob('*')):
    if not path.is_file() or any(part in {'__pycache__', 'retained-local-v1'} for part in path.relative_to(BASE).parts):
        continue
    if path.name in {'workspace.json', 'RESULTS.md', 'DATA-LICENSE.md', 'verify-validation.py', 'CMUdict-LICENSE.txt'}:
        continue
    if path.suffix in {'.py', '.ts', '.mjs', '.json', '.log', '.md'}:
        add(path, 'evidence/operator/' + path.relative_to(BASE).as_posix())
for name in ['RESULTS.md', 'DATA-LICENSE.md', 'verify-validation.py']:
    add(BASE / name, name)
add(Path('/private/tmp/q19-subtlexus-license.txt'), 'evidence/licenses/SUBTLEX-US.txt')
add(BASE / 'CMUdict-LICENSE.txt', 'evidence/licenses/CMUdict.txt')
local_index = dict(version='q19-retained-local-v1', ownerArchive=str(RETAINED), records=local_records,
                   scope='Authenticated raw inputs and complete40word/trace archives retained locally, not bundled in the compact PR.')
(STAGE / 'retained-local-index.json').write_text(json.dumps(local_index, indent=2) + '\n')
(RETAINED / 'retained-local-index.json').write_text(json.dumps(local_index, indent=2) + '\n')
timings = {}
for mode in ['lexicon', 'text']:
    timings[mode] = {}
    for arm in ['control', 'candidate']:
        timings[mode][arm] = []
        for pair in range(1, 7):
            text = (gates_root / f'pair-{pair}-{mode}-{arm}.log').read_text()
            values = re.findall(r'Performance: (\d+) words/sec', text)
            assert len(values) == 1
            timings[mode][arm].append(int(values[0]))
index = dict(version='q19-completed-evidence-v1', measuredCommit=MEASURED,
             generatorBase='71f5a6f6af2291e14d0b012f1ab5911a3d7ecca0', records=records,
             rawFitArtifact=fit_complete['artifact'], sourcePins=before['tracked'],
             localIndex=pin_file(STAGE / 'retained-local-index.json'), roundedReportedTimings=timings,
             scope='Integrity, arithmetic agreement and measured experiment results; no human preference or default promotion.')
(STAGE / 'validation-index.json').write_text(json.dumps(index, indent=2) + '\n')
print(json.dumps(dict(stage=str(STAGE), artifacts=len(records), savedBytes=sum(row['saved']['bytes'] for row in records),
                     retainedFiles=len(local_records), retainedBytes=sum(row['bytes'] for row in local_records))))
