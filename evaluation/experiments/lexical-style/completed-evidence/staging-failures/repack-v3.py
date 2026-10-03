"""Retain staging failures as lossless evidence accepted by existing Git ignores."""
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator')
OLD = Path('/private/tmp/q20-publication-stage-v2')
STAGE = Path('/private/tmp/q20-publication-stage-v3')
DESTINATION = ROOT / 'evaluation/experiments/lexical-style/completed-evidence'
BASE = Path(__file__).resolve().parents[1]


def pin(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


if __name__ == '__main__':
    shutil.copytree(OLD, STAGE)
    index = json.loads((STAGE / 'validation-index.json').read_bytes())
    (STAGE / 'original-staging-failure.log').unlink()
    inputs = [('original-check.log.gz', BASE / 'publication-staging-v2/original-staging-failure.log'),
              ('repack-v2.log.gz', BASE / 'publication-staging-v3/repack-v2-failure.log'),
              ('repack-v2.py', BASE / 'publication-staging-v2/repack.py'),
              ('repack-v3.py', Path(__file__))]
    for name, source in inputs:
        original = source.read_bytes()
        encoded = gzip.compress(original, mtime=0) if name.endswith('.gz') else original
        relative = 'staging-failures/' + name
        (STAGE / relative).parent.mkdir(exist_ok=True)
        (STAGE / relative).write_bytes(encoded)
        index['records'].append({'path': relative, 'origin': str(source), 'compression': 'gzip' if name.endswith('.gz') else 'none',
                                 'saved': pin(encoded), 'original': pin(original)})
    index['version'] = 'q20-completed-evidence-v3'
    index['encodingAmendment'] += ' Failed V2 staging scope assertion identified an ignored .log suffix; both failures and exact repair operators are retained with lossless encoding. No scientific bytes or gates changed.'
    (STAGE / 'validation-index.json').write_text(json.dumps(index, indent=2) + '\n')
    for source in STAGE.rglob('*'):
        if source.is_file():
            destination = DESTINATION / source.relative_to(STAGE)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)
    (DESTINATION / 'original-staging-failure.log').unlink()
    subprocess.run(['git', 'add', '--', 'docs/lexical-style-evidence.md', 'evaluation/experiments/lexical-style/completed-evidence'], cwd=ROOT, check=True)
    expected = {'docs/lexical-style-evidence.md'} | {'evaluation/experiments/lexical-style/completed-evidence/' + source.relative_to(STAGE).as_posix() for source in STAGE.rglob('*') if source.is_file()}
    actual = set(subprocess.check_output(['git', 'diff', '--cached', '--name-only', '-z'], cwd=ROOT).decode().split('\0')) - {''}
    assert expected == actual, (expected - actual, actual - expected)
    subprocess.run(['git', 'diff', '--cached', '--check'], cwd=ROOT, check=True)
    for name, identity in index['sourcePins'].items():
        assert pin((ROOT / name).read_bytes()) == identity
    print(json.dumps({'passed': True, 'stagedFiles': len(actual), 'scientificBytesUnchanged': True, 'stagingFailuresRetained': 2}))
