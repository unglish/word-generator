"""Package full Q11b measurements, including failed gates and prototypes."""
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

if not __debug__:
    raise RuntimeError('Assertions are required')

BASE = Path(__file__).resolve().parents[1]
ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator')
CONTROL = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator')
MEASURED = '9d2680b37b77ebb2f492f4173b1f1681446e40f4'
CONTROL_COMMIT = '1159465fe6c10f55a97e8c5851e8a75c604450e7'
STAGE = Path('/private/tmp/q11b-publication-stage-v1')
LOCAL = BASE / 'retained-local-v1'
TEMP = Path('/private/tmp')


def load(path):
    return json.loads(path.read_bytes())


def pin_bytes(raw):
    return dict(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())


def pin(path):
    digest = hashlib.sha256()
    size = 0
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            size += len(chunk)
            digest.update(chunk)
    return dict(bytes=size, sha256=digest.hexdigest())


gates_root = TEMP / 'q11b-gates-v1'
initial = load(gates_root / 'initial.json')
gates = load(gates_root / 'complete.json')
assert gates['passed'] and gates['after'] == initial
assert len(gates['results']) == 22
assert sum(row['code'] == 0 for row in gates['results']) == 6
assert sum(row['name'].startswith('native-pair-') for row in gates['results']) == 12
for row in gates['results']:
    assert pin(gates_root / (row['name'] + '.log')) == row['log']
    assert load(gates_root / (row['name'] + '-before.json'))['before'] == initial
    assert load(gates_root / (row['name'] + '-after.json'))['after'] == initial
    for name, expected in row.items():
        if name.endswith(('.json', '.md')):
            assert pin(gates_root / name) == {key: expected[key] for key in ['bytes', 'sha256']}
            assert expected['state'] == 'created-or-modified-report'
for arm, repo, commit in [('candidate', ROOT, MEASURED), ('control', CONTROL, CONTROL_COMMIT)]:
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip() == commit
    assert subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=repo, text=True).strip() == ''
    assert initial['sources'][arm]['commit'] == commit
    for name, expected in initial['sources'][arm]['tracked'].items():
        assert pin(repo / name) == expected, name

audits = TEMP / 'q11b-full-audit-driver-v1'
assert load(audits / 'complete.json')['corpusWords'] == 400000
for policy in ['default', 'active']:
    public = load(audits / (policy + '-public-replay.json'))
    independent = load(audits / (policy + '-independent') / 'complete.json')
    assert public['passed'] and independent['passed']
    assert public['words'] == independent['words'] == 200000
    assert public['before'] == public['after'] and public['sourceCommit'] == MEASURED
    assert pin(TEMP / f'q11b-candidate-{policy}-v1/manifest.json') == public['manifest'] == independent['manifest']
paired = load(TEMP / 'q11b-paired-summary-v1/complete.json')
assert paired['passed'] and paired['before'] == paired['after']
assert paired['wordsPerArm'] == 400000 and paired['unchangedBareWords'] == paired['pairedAffixedProfileWords'] == 200000
for name, expected in paired['inputPins'].items():
    assert pin(Path(name)) == expected
traces_root = TEMP / 'q11b-complete-trace-pairs-v1'
traces = load(traces_root / 'complete.json')
assert traces['passed'] and len(traces['streams']) == 20 and len(traces['examples']) == 4
for row in traces['examples']:
    assert pin(traces_root / row['file']) == {key: row[key] for key in ['bytes', 'sha256']}
lint = load(TEMP / 'q11b-whole-lint-v1/complete.json')
assert [row['code'] for row in lint['results']] == [1, 1]
normalized = (TEMP / 'q11b-whole-lint-v1/control.log').read_text().replace(str(CONTROL), '<repo>')
assert normalized == (TEMP / 'q11b-whole-lint-v1/treatment.log').read_text().replace(str(ROOT), '<repo>')
assert '7 problems (7 errors, 0 warnings)' in normalized
assert load(TEMP / 'q11b-custom-fixture-diagnostics-v2/complete.json')['passed']

STAGE.mkdir()
LOCAL.mkdir()
records, local_records = [], []


def add(source, destination):
    original = source.read_bytes()
    compressed = source.suffix != '.gz' and (len(original) > 65536 or source.suffix == '.log')
    saved = gzip.compress(original, mtime=0) if compressed else original
    relative = destination + ('.gz' if compressed else '')
    target = STAGE / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as stream:
        stream.write(saved)
    records.append(dict(path=relative, origin=str(source), compression='gzip' if compressed else 'none',
                        saved=pin_bytes(saved), original=pin_bytes(original)))


for policy in ['default', 'active']:
    for arm, label, commit in [('control', 'q11b-composed-control', CONTROL_COMMIT), ('candidate', 'q11b-candidate', MEASURED)]:
        archive = TEMP / f'{label}-{policy}-v1'
        manifest = load(archive / 'manifest.json')['manifest']
        assert manifest['generator']['commit'] == commit and manifest['generator']['dirty'] is False
        assert len([row for row in manifest['artifacts'] if row['file'].startswith('words/')]) == 20
        for row in manifest['artifacts']:
            relative = Path(row['file'])
            assert not relative.is_absolute() and '..' not in relative.parts
            source = archive / relative
            expected = {key: row[key] for key in ['bytes', 'sha256']}
            assert pin(source) == expected
            if relative.parts[0] == 'words':
                destination = LOCAL / arm / policy / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                with source.open('rb') as incoming, destination.open('xb') as outgoing:
                    shutil.copyfileobj(incoming, outgoing)
                assert pin(destination) == expected
                local_records.append(dict(path=destination.relative_to(LOCAL).as_posix(), origin=str(source), **expected))
            else:
                add(source, f'evidence/{archive.name}/{relative.as_posix()}')
        add(archive / 'manifest.json', f'evidence/{archive.name}/manifest.json')
        print('Authenticated and retained', arm, policy, '20 complete word/trace archives', flush=True)

# Finished diagnostics and historical failures: keep every file, not just success markers.
for directory in sorted(TEMP.glob('q11b*')):
    if not directory.is_dir() or directory == STAGE:
        continue
    for source in sorted(directory.rglob('*')):
        if not source.is_file() or 'words' in source.relative_to(directory).parts:
            continue
        if directory.name in {f'{label}-{policy}-v1' for label in ['q11b-candidate', 'q11b-composed-control'] for policy in ['default', 'active']}:
            continue
        add(source, 'evidence/' + directory.name + '/' + source.relative_to(directory).as_posix())
for source in sorted(TEMP.glob('q11b*')):
    if source.is_file() and source.suffix in {'.json', '.log'}:
        add(source, 'evidence/preparation/' + source.name)
for source in sorted(BASE.rglob('*')):
    if not source.is_file() or any(part in {'__pycache__', 'retained-local-v1'} for part in source.relative_to(BASE).parts):
        continue
    if source.name in {'RESULTS.md', 'verify-validation.py'}:
        continue
    if source.suffix in {'.mjs', '.ts', '.py', '.json', '.md', '.log', '.patch'}:
        add(source, 'evidence/operator/' + source.relative_to(BASE).as_posix())
for name in ['RESULTS.md', 'verify-validation.py']:
    add(BASE / 'publication-tools-v1' / name, name)
assert len(local_records) == 80
local_index = dict(version='q11b-retained-local-v1', ownerArchive=str(LOCAL), records=local_records,
                   scope='All80 complete control/candidate archives;400k words per arm. Raw archives remain local and are not bundled in Git.')
(STAGE / 'retained-local-index.json').write_text(json.dumps(local_index, indent=2) + '\n')
(LOCAL / 'retained-local-index.json').write_text(json.dumps(local_index, indent=2) + '\n')
index = dict(version='q11b-completed-evidence-v1', measuredCommit=MEASURED, generatorBase=CONTROL_COMMIT,
             records=records, sourcePins=initial['sources']['candidate']['tracked'],
             localIndex=pin(STAGE / 'retained-local-index.json'),
             gateOutcomes=dict(commands=22, passing=6, failing=16, wholeLintCandidateExitCode=1, wholeLintControlExitCode=1),
             scope='Full emitted-word reconstruction and descriptive local invariant effect; failed gates retained. No passing suite, speaker preference, broad quality or merge-readiness claim.')
(STAGE / 'validation-index.json').write_text(json.dumps(index, indent=2) + '\n')
print(json.dumps(dict(stage=str(STAGE), artifacts=len(records), savedBytes=sum(row['saved']['bytes'] for row in records),
                     retainedStreams=len(local_records), retainedBytes=sum(row['bytes'] for row in local_records))))
