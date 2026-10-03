"""Preserve the completed category experiment, including all failed gates."""
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

BASE = Path(__file__).resolve().parent
ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator')
CONTROL = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator')
STAGE = Path('/private/tmp/q18-publication-stage-v1')
LOCAL = BASE / 'retained-local-v1'
MEASURED = '11bdf6a90ed28e1aba09c40b3901c54c6308437f'
CONTROL_COMMIT = '1159465fe6c10f55a97e8c5851e8a75c604450e7'


def load(path):
    return json.loads(path.read_text())


def pin(path):
    digest = hashlib.sha256()
    size = 0
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            size += len(chunk)
            digest.update(chunk)
    return dict(bytes=size, sha256=digest.hexdigest())


def bytes_pin(raw):
    return dict(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())


assert not Path('/private/tmp/q11b-gates-v1').exists(), 'Reserved timing has begun'
gates_root = Path('/private/tmp/q18-gates-v1')
initial = load(gates_root / 'initial.json')
gates = load(gates_root / 'complete.json')
assert gates['passed'] and gates['after'] == initial
assert len(gates['results']) == 48
assert sum(row['code'] == 0 for row in gates['results']) == 6
assert sum(row['name'].startswith('native-pair-') for row in gates['results']) == 12
assert sum(row['name'].startswith('configured-pair-') for row in gates['results']) == 24
for row in gates['results']:
    assert pin(gates_root / (row['name'] + '.log')) == row['log']
    assert load(gates_root / (row['name'] + '-before.json'))['before'] == initial
    assert load(gates_root / (row['name'] + '-after.json'))['after'] == initial
    for name, expected in row.items():
        if name.endswith(('.json', '.md')):
            assert pin(gates_root / name) == {k: expected[k] for k in ['bytes', 'sha256']}
            assert expected['state'] == 'created-or-modified-report'
for arm, repo, commit in [('candidate', ROOT, MEASURED), ('control', CONTROL, CONTROL_COMMIT)]:
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip() == commit
    assert subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=repo, text=True).strip() == ''
    assert initial['sources'][arm]['commit'] == commit
    for name, expected in initial['sources'][arm]['tracked'].items():
        assert pin(repo / name) == expected, name
audit_root = Path('/private/tmp/q18-audit-driver-v1')
assert load(audit_root / 'complete.json')['corpusWords'] == 400000
for policy in ['default', 'active']:
    public = load(audit_root / (policy + '-public-replay.json'))
    independent = load(audit_root / (policy + '-independent.json'))
    assert public['passed'] and public['words'] == 200000 and public['before'] == public['after']
    assert independent['passed'] and independent['counts']['words'] == 200000
    manifest = Path('/private/tmp') / f'q18-candidate-{policy}-v1' / 'manifest.json'
    assert pin(manifest)['sha256'] == public['manifestSha256'] == independent['manifestSha256']
paired_root = Path('/private/tmp/q18-paired-summary-v1')
paired = load(paired_root / 'complete.json')
assert paired['passed'] and paired['before'] == paired['after']
assert paired['wordsPerArm'] == 400000 and paired['unchangedBareWords'] == 200000
for name, expected in paired['inputPins'].items():
    assert pin(Path(name)) == expected, name
for name in ['q18-omitted-parity-v1', 'q18-trace-plain-parity-v1']:
    parity = load(Path('/private/tmp') / name / 'complete.json')
    assert parity['passed'] and parity['comparisons'] == 10000 and parity['probes'] == 40
candidate_lint = Path('/private/tmp/q18-candidate-whole-lint-v1.log')
control_lint = Path('/private/tmp/q18-control-whole-lint-v1.log')
normalized = candidate_lint.read_text().replace(str(ROOT), '<repo>')
assert normalized == control_lint.read_text().replace(str(CONTROL), '<repo>')
assert '7 problems (7 errors, 0 warnings)' in normalized

STAGE.mkdir()
LOCAL.mkdir()
records = []
local_records = []


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
                        saved=bytes_pin(saved), original=bytes_pin(original)))


for policy in ['default', 'active']:
    for arm, label, commit in [('control', 'q11b-composed-control', CONTROL_COMMIT), ('candidate', 'q18-candidate', MEASURED)]:
        archive = Path('/private/tmp') / f'{label}-{policy}-v1'
        manifest = load(archive / 'manifest.json')['manifest']
        assert manifest['generator']['commit'] == commit and manifest['generator']['dirty'] is False
        assert len([r for r in manifest['artifacts'] if r['file'].startswith('words/')]) == 20
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
        print('Authenticated and retained', arm, policy, '20 full word/trace streams.', flush=True)

for name in ['q18-audit-driver-v1', 'q18-paired-summary-v1', 'q18-omitted-parity-v1',
             'q18-trace-plain-parity-v1', 'q18-capture-driver-v1', 'q18-parity-driver-v1',
             'q18-gate-bindings-preflight-v2', 'q18-gates-v1', 'q18-gates-driver-v1',
             'q18-candidate-default-v1-freeze', 'q18-candidate-active-v1-freeze',
             'q11b-composed-control-default-v1-freeze', 'q11b-composed-control-active-v1-freeze']:
    directory = Path('/private/tmp') / name
    assert directory.is_dir(), name
    for source in sorted(directory.iterdir()):
        if source.is_file():
            add(source, 'evidence/' + name + '/' + source.name)
for source in sorted(Path('/private/tmp').glob('q18*')):
    if source.is_file() and source.suffix in {'.json', '.log'}:
        add(source, 'evidence/preparation/' + source.name)
for source in sorted(BASE.rglob('*')):
    if not source.is_file() or any(part in {'__pycache__', 'retained-local-v1'} for part in source.relative_to(BASE).parts):
        continue
    if source.name in {'workspace.json', 'RESULTS.md', 'verify-validation.py'}:
        continue
    if source.suffix in {'.ts', '.mjs', '.py', '.json', '.log', '.md'}:
        add(source, 'evidence/operator/' + source.relative_to(BASE).as_posix())
for name in ['RESULTS.md', 'verify-validation.py']:
    add(BASE / name, name)
add(BASE.parent / 'running-text-frequency/CMUdict-LICENSE.txt', 'evidence/licenses/CMUdict-LICENSE.txt')
local_index = dict(version='q18-retained-local-v1', ownerArchive=str(LOCAL), records=local_records,
                   scope='All80 complete control/candidate word/trace streams, 400kwords/arm, retained locally rather than bundled.')
assert len(local_records) == 80
(STAGE / 'retained-local-index.json').write_text(json.dumps(local_index, indent=2) + '\n')
(LOCAL / 'retained-local-index.json').write_text(json.dumps(local_index, indent=2) + '\n')
index = dict(version='q18-completed-evidence-v1', measuredCommit=MEASURED, generatorBase=CONTROL_COMMIT,
             records=records, sourcePins=initial['sources']['candidate']['tracked'],
             localIndex=pin(STAGE / 'retained-local-index.json'),
             gateOutcomes=dict(commands=48, passing=6, failing=42, wholeLintCandidateExitCode=1, wholeLintControlExitCode=1),
             scope='Declared contract and complete measured evidence with failed gates. No empirical semantic, human-quality, default-promotion or merge-readiness claim.')
(STAGE / 'validation-index.json').write_text(json.dumps(index, indent=2) + '\n')
print(json.dumps(dict(stage=str(STAGE), artifacts=len(records), retainedStreams=len(local_records),
                     savedBytes=sum(r['saved']['bytes'] for r in records), retainedBytes=sum(r['bytes'] for r in local_records))))
