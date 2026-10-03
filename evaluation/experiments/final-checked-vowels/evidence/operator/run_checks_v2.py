import json
import os
from pathlib import Path
import subprocess
import time
ROOT=Path('/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator')
NODE='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
ARMS={'control':Path('/Users/ryanbetts/.codex/worktrees/linguistic-q10b2-control/word-generator'),
      'candidate':Path('/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator')}
for name in ['QUALITY_GATE_SAMPLE_SIZE','QUALITY_MODE_SAMPLE_SIZE','QUALITY_HEARTBEAT_EVERY']:
    assert not os.environ.get(name),f'Unregistered quality override: {name}'
OUT=Path('/private/tmp/q10b2-checks-v2');OUT.mkdir()
print('Waiting for the full corpus audits before unchanged repository gates.',flush=True)
while not Path('/private/tmp/q10b2-audit-v3/complete.json').exists():
    if Path('/private/tmp/q10b2-audit-v3/failure.json').exists() or Path('/private/tmp/q10b2-audit-v3/capture-failure.json').exists():
        raise RuntimeError('Corpus audit failed; gate run not started')
    time.sleep(15)
assert json.loads(Path('/private/tmp/q10b2-audit-v3/complete.json').read_text())['passed'] is True
results=[]
for stage in ['full','default-quality','active-quality','default-perf']:
    for arm,checkout in ARMS.items():
        cwd=checkout;args=[NODE,str(checkout/'node_modules/vitest/vitest.mjs'),'run']
        if stage=='full':args+=['--maxWorkers=1','--minWorkers=1','--no-file-parallelism']
        elif stage=='default-quality':args+=['--config','vitest.quality.config.ts']
        elif stage=='active-quality':
            cwd=ROOT/'.local-evidence/final-checked-vowels/active-quality'/arm;args+=['--config','vitest.config.mjs']
        else:args+=['--config','vitest.perf.config.ts','--reporter=verbose']
        with (OUT/f'{stage}-{arm}.log').open('x') as log:proc=subprocess.run(args,cwd=cwd,stdout=log,stderr=subprocess.STDOUT)
        row={'stage':stage,'arm':arm,'exitCode':proc.returncode,'command':args,'cwd':str(cwd)}
        results.append(row);(OUT/'progress.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(row),flush=True)
(OUT/'complete.json').write_text(json.dumps({'results':results,'scope':'Unchanged samples, seeds, assertions, timeouts, speed floor and variance gate; nonzero outcomes retained'},indent=2)+'\n')
