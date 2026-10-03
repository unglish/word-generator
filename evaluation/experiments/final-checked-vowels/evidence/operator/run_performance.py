import hashlib
import json
from pathlib import Path
import subprocess
import time
ROOT=Path('/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator')
BASE=ROOT/'.local-evidence/final-checked-vowels'
NODE='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
LOADER='/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
plan=json.loads((BASE/'timing-registration.json').read_text())
OUT=Path('/private/tmp/q10b2-performance-v1');OUT.mkdir()
print('Waiting for repository gates, after complete capture and corpus audits; no competing measured work.',flush=True)
while not Path('/private/tmp/q10b2-checks-v1/complete.json').exists():
    if Path('/private/tmp/q10b2-audit-v2/failure.json').exists() or Path('/private/tmp/q10b2-audit-v2/capture-failure.json').exists():raise RuntimeError('Audit failed; timing not started')
    time.sleep(15)
pins={name:hashlib.sha256((BASE/name).read_bytes()).hexdigest() for name in ['performance-one.mjs','timing-registration.json','run_performance.py']}
results=[]
for policy in plan['policies']:
    for slot,arm in enumerate(plan['orderPerPolicy'],1):
        output=OUT/f'{policy}-{slot:02d}-{arm}.json';command=[NODE,'--import',LOADER,str(BASE/'performance-one.mjs'),arm,policy,str(output)]
        with (OUT/f'{policy}-{slot:02d}-{arm}.log').open('x') as log:proc=subprocess.run(command,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT)
        row={'policy':policy,'slot':slot,'arm':arm,'exitCode':proc.returncode,'output':str(output),'command':command}
        results.append(row);(OUT/'progress.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(row),flush=True)
        if proc.returncode:
            (OUT/'failure.json').write_text(json.dumps(row,indent=2)+'\n');raise RuntimeError('Timing infrastructure failed; failed run retained')
assert all(hashlib.sha256((BASE/name).read_bytes()).hexdigest()==value for name,value in pins.items())
(OUT/'complete.json').write_text(json.dumps({'results':results,'plan':plan,'toolPins':pins},indent=2)+'\n')
