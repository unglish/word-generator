"""Losslessly encode two historical wrappers; retain the original staging failure."""
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator')
ORIGINAL = Path('/private/tmp/q20-publication-stage-v1')
STAGE = Path('/private/tmp/q20-publication-stage-v2')
DESTINATION = ROOT / 'evaluation/experiments/lexical-style/completed-evidence'
HERE = Path(__file__).resolve().parent


def pin(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


if __name__ == '__main__':
    shutil.copytree(ORIGINAL, STAGE)
    index = json.loads((STAGE / 'validation-index.json').read_bytes())
    paths = []
    for filename in ('generate.perf.test.ts', 'generate-text.perf.test.ts'):
        record = next(record for record in index['records'] if record['path'] == 'evidence/operators/gate-tools/' + filename)
        assert record['compression'] == 'none'
        path = STAGE / record['path']
        raw = path.read_bytes()
        assert pin(raw) == record['original'] == record['saved']
        compressed = gzip.compress(raw, mtime=0)
        with path.with_name(path.name + '.gz').open('xb') as stream:
            stream.write(compressed)
        assert gzip.decompress(compressed) == raw
        paths.append(record['path'])
        path.unlink()
        record.update(path=record['path'] + '.gz', saved=pin(compressed), compression='gzip')
    index['version'] = 'q20-completed-evidence-v2'
    index['encodingAmendment'] = 'Two unchanged historical test wrappers losslessly gzip-encoded after original trailing-whitespace staging failure. Every original extracted byte, scientific input and result unchanged.'
    (STAGE / 'validation-index.json').write_text(json.dumps(index, indent=2) + '\n')
    shutil.copyfile(HERE / 'original-staging-failure.log', STAGE / 'original-staging-failure.log')
    for file in STAGE.rglob('*'):
        if file.is_file():
            shutil.copyfile(file, DESTINATION / file.relative_to(STAGE))
    subprocess.run(['git', 'rm', '--cached', '--'] + ['evaluation/experiments/lexical-style/completed-evidence/' + path for path in paths], cwd=ROOT, check=True)
    for path in paths:
        (DESTINATION / path).unlink()
    subprocess.run(['git', 'add', '--', 'docs/lexical-style-evidence.md', 'evaluation/experiments/lexical-style/completed-evidence'], cwd=ROOT, check=True)
    expected = {'docs/lexical-style-evidence.md'} | {'evaluation/experiments/lexical-style/completed-evidence/' + path.relative_to(STAGE).as_posix() for path in STAGE.rglob('*') if path.is_file()}
    actual = set(subprocess.check_output(['git', 'diff', '--cached', '--name-only', '-z'], cwd=ROOT).decode().split('\0')) - {''}
    assert actual == expected
    subprocess.run(['git', 'diff', '--cached', '--check'], cwd=ROOT, check=True)
    for name, expected_identity in index['sourcePins'].items():
        assert pin((ROOT / name).read_bytes()) == expected_identity
    print(json.dumps({'passed': True, 'stagedFiles': len(actual), 'originalBytesPreserved': True, 'sourceUnchanged': True}))
