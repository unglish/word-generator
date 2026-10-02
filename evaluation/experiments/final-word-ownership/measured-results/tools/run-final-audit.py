import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

root = Path('/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator')
local = root / '.local-evidence/q02-resumed'
node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
loader = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
candidate = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator')
control = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q02-control/word-generator')
registration = str(candidate / 'evaluation/experiments/final-word-ownership/measurement.json')
protocol = str(candidate / 'evaluation/quality/protocol.json')
ch = '8dedab2241a1fe1155c0aa2259a3b34487e0031dca2c0f2b8961bc83e4fa8028'
bh = 'cdd4da06d591e41b8e17fb7f370c17ba50670a2eb0be048344ca6d890b338773'
out = Path('/private/tmp/q02-final-audit-v2')
out.mkdir()
print('Waiting for unchanged timed gates to finish before running audit work.', flush=True)
while not Path('/private/tmp/q02-checks-v1/complete.json').exists():
    time.sleep(15)
results = []
def run(name, args, cwd=root):
    with (out / (name + '.log')).open('x') as log:
        result = subprocess.run(args, cwd=cwd, env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}, stdout=log, stderr=subprocess.STDOUT)
    record = dict(name=name, exitCode=result.returncode, command=args, cwd=str(cwd))
    results.append(record)
    (out / 'progress.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(record), flush=True)
    return result.returncode
for arm, checkout in [('control', control), ('candidate', candidate)]:
    run('rising-coda-' + arm, [node, str(checkout / 'node_modules/vitest/vitest.mjs'), 'run', 'src/core/generate.test.ts', '-t', 'risingCodaDrop policy gates rising-coda drop events', '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism'], checkout)
run('candidate-production', [node, '--import', loader, str(local / 'analyze-archive.mjs'), '/private/tmp/q02-final-word-provenance-v1', ch, str(out / 'candidate-production.json')])
for arm, archive, digest in [('control', '/private/tmp/q02-spelling-stress-control-v1', bh), ('candidate', '/private/tmp/q02-final-word-provenance-v1', ch)]:
    run(arm + '-independent', ['python3', str(local / 'recount-v2/recount.py'), archive, digest, str(out / (arm + '-independent.json')), registration, protocol])
run('legacy-equality', ['python3', str(local / 'compare_archives.py'), '/private/tmp/q02-spelling-stress-control-v1', '/private/tmp/q02-final-word-provenance-v1', bh, ch, registration, protocol, str(out / 'legacy-equality.json')])
(out / 'complete.json').write_text(json.dumps(dict(results=results, allCommandsPassed=all(r['exitCode'] == 0 for r in results)), indent=2) + '\n')
