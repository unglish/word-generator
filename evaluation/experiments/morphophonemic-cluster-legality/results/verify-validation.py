"""Authenticate the compact evidence and optionally all retained word archives."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re

if not __debug__:
    raise RuntimeError('Assertions are required')


def pin_bytes(raw):
    return dict(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())


def pin(path):
    digest = hashlib.sha256()
    size = 0
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
            size += len(chunk)
    return dict(bytes=size, sha256=digest.hexdigest())


def safe_path(root, relative):
    path = Path(relative)
    assert not path.is_absolute() and '..' not in path.parts, relative
    target = (root / path).resolve(strict=True)
    assert target.is_relative_to(root.resolve()), relative
    return target


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--evidence-root', type=Path, default=Path(__file__).resolve().parent)
parser.add_argument('--repository-root', type=Path, required=True)
parser.add_argument('--archive-root', type=Path, help='Authenticate all80 retained raw archives; omitted archives are not verified.')
args = parser.parse_args()
root = args.evidence_root
index = json.loads((root / 'validation-index.json').read_bytes())
assert index['version'] == 'q11b-completed-evidence-v1'
assert index['measuredCommit'] == '9d2680b37b77ebb2f492f4173b1f1681446e40f4'
assert index['generatorBase'] == '1159465fe6c10f55a97e8c5851e8a75c604450e7'
assert pin(root / 'retained-local-index.json') == index['localIndex']
content = {}
for row in index['records']:
    assert row['path'] not in content
    raw = safe_path(root, row['path']).read_bytes()
    assert pin_bytes(raw) == row['saved'], row['path']
    assert row['compression'] in {'gzip', 'none'}
    original = gzip.decompress(raw) if row['compression'] == 'gzip' else raw
    assert pin_bytes(original) == row['original'], row['path']
    logical = row['path'][:-3] if row['compression'] == 'gzip' else row['path']
    assert logical not in content
    content[logical] = original
for name, expected in index['sourcePins'].items():
    assert pin(safe_path(args.repository_root, name)) == expected, name


def load(name):
    return json.loads(content['evidence/' + name])


gates = load('q11b-gates-v1/complete.json')
initial = load('q11b-gates-v1/initial.json')
assert gates['passed'] and gates['after'] == initial
assert len(gates['results']) == 22
assert sum(row['code'] == 0 for row in gates['results']) == 6
for row in gates['results']:
    name = row['name']
    assert pin_bytes(content['evidence/q11b-gates-v1/' + name + '.log']) == row['log']
    assert load('q11b-gates-v1/' + name + '-before.json')['before'] == initial
    assert load('q11b-gates-v1/' + name + '-after.json')['after'] == initial
assert index['gateOutcomes'] == dict(commands=22, passing=6, failing=16,
                                    wholeLintCandidateExitCode=1, wholeLintControlExitCode=1)
for policy in ['default', 'active']:
    public = load('q11b-full-audit-driver-v1/' + policy + '-public-replay.json')
    independent = load('q11b-full-audit-driver-v1/' + policy + '-independent/complete.json')
    assert public['passed'] and independent['passed'] and public['words'] == independent['words'] == 200000
    assert public['before'] == public['after'] and public['manifest'] == independent['manifest']
paired = load('q11b-paired-summary-v1/complete.json')
assert paired['passed'] and paired['before'] == paired['after']
assert paired['wordsPerArm'] == 400000 and paired['unchangedBareWords'] == paired['pairedAffixedProfileWords'] == 200000
traces = load('q11b-complete-trace-pairs-v1/complete.json')
assert traces['passed'] and len(traces['streams']) == 20
assert [{k: v for k, v in row.items() if k != 'compressedArchiveReceipts'} for row in traces['streams']] == paired['pairedStreams']
assert sum(row['words'] for row in traces['streams']) == 200000
assert sum(row['completeWordChanges'] for row in traces['streams']) == 114774
assert sum(row['spellingChanges'] for row in traces['streams']) == 3
assert sum(row['pronunciationChanges'] for row in traces['streams']) == 4
assert len(traces['examples']) == 4
clean_changes = 0
for row in traces['examples']:
    raw = content['evidence/q11b-complete-trace-pairs-v1/' + row['file']]
    assert pin_bytes(raw) == {k: row[k] for k in ['bytes', 'sha256']}
    pair = json.loads(raw)
    control, candidate = [pair[arm]['word'] for arm in ['control', 'candidate']]
    clean_changes += control['written']['clean'] != candidate['written']['clean']
    assert pair['duplicate_coda'] == dict(control=True, candidate=False)
    evaluations = candidate['trace']['morphologyPreparation']['prepared']['evaluations']
    reject = next(value for value in evaluations if value['outcome'] == 'rejected')
    assert reject['guard']['syllableBefore']['coda'] == ['s', 'k']
    assert reject['guard']['syllableProposed']['coda'] == ['s', 's']
    assert reject['guard']['rejections'][0]['reason'] == 'repetition'
assert clean_changes == 3
lint = load('q11b-whole-lint-v1/complete.json')
assert [row['code'] for row in lint['results']] == [1, 1]
timings = {}
for arm in ['control', 'candidate']:
    timings[arm] = []
    for pair in range(1, 7):
        text = content[f'evidence/q11b-gates-v1/native-pair-{pair}-{arm}.log'].decode()
        values = re.findall(r'Performance: (\d+) words/sec', text)
        assert len(values) == 1 and int(values[0]) < 4500
        timings[arm].append(int(values[0]))
archive_count = 0
local = json.loads((root / 'retained-local-index.json').read_bytes())
assert len(local['records']) == 80
if args.archive_root:
    for row in local['records']:
        assert pin(safe_path(args.archive_root, row['path'])) == {k: row[k] for k in ['bytes', 'sha256']}
        archive_count += 1
print(json.dumps(dict(passed=True, compactArtifacts=len(index['records']), sourceFiles=len(index['sourcePins']),
                     retainedArchivesVerified=archive_count, roundedReportedTimings=timings,
                     scope='Integrity and recorded-result consistency. Does not rerun generator/oracle, prove untrusted manifests truthful, establish human quality, or turn failed gates into passes.')))
