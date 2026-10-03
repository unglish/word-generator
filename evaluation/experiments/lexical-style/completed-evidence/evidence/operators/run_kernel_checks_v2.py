"""Check the unintegrated style kernel only after all reserved timing is complete."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent.parent
IMPL = BASE / 'implementation'
OUT = Path('/private/tmp/q20-kernel-check-driver-v2')
OUT.mkdir()
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
paths = [Path(__file__)] + sorted(path for path in IMPL.iterdir() if path.is_file())


def pin(path):
    raw = path.read_bytes()
    return dict(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())


def save(path, value):
    with path.open('x') as stream:
        stream.write(json.dumps(value, indent=2) + '\n')


before = {str(path): pin(path) for path in paths}
save(OUT / 'before.json', dict(inputs=before, scope='Unintegrated kernel fixtures only; no generator change, corpus or human result.'))
try:
    q18 = Path('/private/tmp/q18-gates-driver-v1/complete.json')
    print('Q20 kernel types/lint/six fixtures queued after Q18 timing and Q21 collector checks; no checks started.', flush=True)
    while not q18.exists():
        if (q18.parent / 'failure.json').exists():
            raise RuntimeError('Q18 gate infrastructure failed; kernel checks not started')
        time.sleep(15)
    collection = Path('/private/tmp/q21-collection-check-driver-v1')
    while not any((collection / name).exists() for name in ['complete.json', 'failure.json']):
        time.sleep(15)
    q11 = Path('/private/tmp/q11b-gates-v1')
    while q11.exists() and not Path('/private/tmp/q11b-gates-driver-v1/complete.json').exists():
        if Path('/private/tmp/q11b-gates-driver-v1/failure.json').exists():
            raise RuntimeError('Q11b gate infrastructure failed; quiet interval needs inspection')
        time.sleep(15)
    assert before == {str(path): pin(path) for path in paths}
    environment = os.environ.copy(); environment['PATH'] = str(Path(NODE).parent) + ':' + environment['PATH']
    source_files = [str(path) for path in sorted(IMPL.glob('*.ts'))]
    commands = [('strict-types', [NODE, str(ROOT / 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--skipLibCheck',
                  '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'node', '--types', 'node', *source_files]),
                ('kernel-lint', [NODE, str(ROOT / 'node_modules/eslint/bin/eslint.js'), '--no-ignore', '--max-warnings', '0',
                  *source_files, str(IMPL / 'vitest.config.mts')]),
                ('kernel-tests', [NODE, str(ROOT / 'node_modules/vitest/vitest.mjs'), 'run', '--config', str(IMPL / 'vitest.config.mts')])]
    results = []
    for name, command in commands:
        with (OUT / (name + '.log')).open('x') as log:
            result = subprocess.run(command, cwd=ROOT, env=environment, stdout=log, stderr=subprocess.STDOUT)
        results.append(dict(name=name, command=command, exitCode=result.returncode, log=pin(OUT / (name + '.log'))))
        (OUT / 'progress.json').write_text(json.dumps(results, indent=2) + '\n')
        if result.returncode:
            raise RuntimeError(name + ' failed; logs retained and no kernel-passing claim')
    after = {str(path): pin(path) for path in paths}
    assert before == after
    save(OUT / 'complete.json', dict(passed=True, before=before, after=after, results=results,
         scope='Strict standalone style-kernel typing, lint and six fixture groups only; metadata migration, actual generator/config/trace integration, full registered measurements, human study and PR remain.'))
    print('Q20 standalone kernel checks passed; no generator or human quality claim.', flush=True)
except Exception as error:
    save(OUT / 'failure.json', dict(error=str(error), type=type(error).__name__))
    raise
