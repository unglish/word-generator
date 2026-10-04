import json
import os
from pathlib import Path
import subprocess

root = Path('/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator')
node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
arms = {'control': Path('/Users/ryanbetts/.codex/worktrees/linguistic-q02-control/word-generator'),
        'candidate': Path('/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator')}
for name in ['QUALITY_GATE_SAMPLE_SIZE', 'QUALITY_MODE_SAMPLE_SIZE', 'QUALITY_HEARTBEAT_EVERY']:
    assert not os.environ.get(name), f'Unregistered quality override: {name}'
out = Path('/private/tmp/q02-checks-v1')
out.mkdir()
results = []
for stage in ['full', 'default-quality', 'active-quality', 'default-perf']:
    for arm, checkout in arms.items():
        vitest = str(checkout / 'node_modules/vitest/vitest.mjs')
        cwd = checkout
        args = [node, vitest, 'run']
        if stage == 'full':
            args += ['--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism']
        elif stage == 'default-quality':
            args += ['--config', 'vitest.quality.config.ts']
        elif stage == 'active-quality':
            cwd = root / '.local-evidence/q02-resumed/active-quality' / arm
            args += ['--config', 'vitest.config.mjs']
        else:
            args += ['--config', 'vitest.perf.config.ts', '--reporter=verbose']
        with (out / f'{stage}-{arm}.log').open('x') as log:
            result = subprocess.run(args, cwd=cwd, stdout=log, stderr=subprocess.STDOUT)
        record = dict(stage=stage, arm=arm, exitCode=result.returncode, command=args, cwd=str(cwd))
        results.append(record)
        (out / 'progress.json').write_text(json.dumps(results, indent=2) + '\n')
        print(json.dumps(record), flush=True)
(out / 'complete.json').write_text(json.dumps(dict(results=results, scope='Unchanged assertions, samples, seeds and timeout settings. Nonzero test outcomes are retained and require review, not suppressed.'), indent=2) + '\n')
