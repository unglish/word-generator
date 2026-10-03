"""Check package verification against missing and consistently resealed evidence."""
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

BASE = Path('/private/tmp/q11b-publication-stage-v1')
OUT = Path('/private/tmp/q11b-publication-corruptions-v1')
REPO = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator')
OUT.mkdir()


def seal(raw):
    return dict(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())


def change(directory, logical, mutate):
    index_path = directory / 'validation-index.json'
    index = json.loads(index_path.read_bytes())
    row = next(row for row in index['records'] if row['path'] == logical or
               (row['compression'] == 'gzip' and row['path'] == logical + '.gz'))
    path = directory / row['path']
    saved = path.read_bytes()
    raw = gzip.decompress(saved) if row['compression'] == 'gzip' else saved
    value = json.loads(raw)
    mutate(value)
    raw = (json.dumps(value, indent=2) + '\n').encode()
    saved = gzip.compress(raw, mtime=0) if row['compression'] == 'gzip' else raw
    path.write_bytes(saved)
    row['original'], row['saved'] = seal(raw), seal(saved)
    index_path.write_text(json.dumps(index, indent=2) + '\n')


cases = ['missing-full-trace', 'failed-gate-relabelled', 'forged-proposed-coda', 'changed-census-resealed-in-both-reports']
results = []
for name in cases:
    directory = OUT / name
    shutil.copytree(BASE, directory)
    logical = 'evidence/q11b-complete-trace-pairs-v1/default-text-default-2666001996-178.json'
    if name == 'missing-full-trace':
        (directory / (logical + '.gz')).unlink()
    elif name == 'failed-gate-relabelled':
        change(directory, 'evidence/q11b-gates-v1/complete.json',
               lambda value: value['results'][0].update(code=0))
    elif name == 'forged-proposed-coda':
        change(directory, logical, lambda value: value['candidate']['word']['trace']['morphologyPreparation']
               ['prepared']['evaluations'][0]['guard']['syllableProposed'].update(coda=['s', 't']))
    else:
        change(directory, 'evidence/q11b-complete-trace-pairs-v1/complete.json',
               lambda value: value['streams'][0].update(completeWordChanges=0))
        change(directory, 'evidence/q11b-paired-summary-v1/complete.json',
               lambda value: value['pairedStreams'][0].update(completeWordChanges=0))
    with (OUT / (name + '.log')).open('xb') as log:
        process = subprocess.run(['python3', '-B', str(BASE / 'verify-validation.py'), '--evidence-root', str(directory),
                                  '--repository-root', str(REPO)], stdout=log, stderr=subprocess.STDOUT)
    results.append(dict(name=name, exitCode=process.returncode, log=seal((OUT / (name + '.log')).read_bytes())))
    (OUT / 'progress.json').write_text(json.dumps(results, indent=2) + '\n')
    assert process.returncode == 1, name
(OUT / 'complete.json').write_text(json.dumps(dict(passed=True, results=results,
    originalIndex=seal((BASE / 'validation-index.json').read_bytes()),
    scope='Four copied synthetic corruptions rejected; originals and all failed copies retained. Not a generator or human-quality check.'), indent=2) + '\n')
print(json.dumps(dict(passed=True, corruptions=len(results))))
