import json
from pathlib import Path
import subprocess

root = Path('/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator')
registration = json.loads(Path('/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/evaluation/experiments/final-word-ownership/measurement.json').read_bytes())
out = Path('/private/tmp/q02-performance-v1')
out.mkdir()
node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
loader = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
results = []
for number, arm in enumerate(registration['performanceOrder'], 1):
    variant = 'spelling-stress-control' if arm == 'control' else 'final-word-provenance'
    output = out / f'{number:02d}-{arm}.json'
    with (out / f'{number:02d}-{arm}.log').open('x') as log:
        result = subprocess.run([node, '--import', loader, str(root / '.local-evidence/q02-resumed/performance-one.mjs'), variant, str(output)], cwd=root, stdout=log, stderr=subprocess.STDOUT)
    results.append(dict(slot=number, arm=arm, exitCode=result.returncode, output=str(output)))
    print(json.dumps(results[-1]), flush=True)
    if result.returncode:
        (out / 'failure.json').write_text(json.dumps(results, indent=2) + '\n')
        raise SystemExit(result.returncode)
(out / 'complete.json').write_text(json.dumps(dict(slots=results, order=registration['performanceOrder']), indent=2) + '\n')
