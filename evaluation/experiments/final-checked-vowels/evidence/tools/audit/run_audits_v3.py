import hashlib
import json
from pathlib import Path
import subprocess
import time

ROOT=Path('/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator')
TOOLS=ROOT/'.local-evidence/final-checked-vowels/audit'
NODE='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
LOADER='/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
JOBS=json.loads((ROOT/'.local-evidence/final-checked-vowels/captures.json').read_text())['jobs']
OUT=Path('/private/tmp/q10b2-audit-v3');OUT.mkdir()
files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in TOOLS.iterdir() if p.is_file() and p.suffix in ('.py','.mjs','.json','.gz')}
(OUT/'tools-before.json').write_text(json.dumps(files,indent=2)+'\n')
print('Waiting for all four registered capture completion seals; failure seals abort explicitly.',flush=True)
while True:
    for job in JOBS:
        failure=Path(job['out']+'-freeze/failure.json')
        if failure.exists():
            (OUT/'capture-failure.json').write_text(json.dumps({'job':job,'failure':json.loads(failure.read_text())},indent=2)+'\n')
            raise RuntimeError('Capture failed: '+job['out'])
    if all(Path(job['out']+'-freeze/complete.json').exists() for job in JOBS):break
    time.sleep(15)
results=[]
for job in JOBS:
    slug=job['arm']+'-'+job['policy'];archive=job['out']
    commands=[('production',[NODE,'--import',LOADER,str(TOOLS/'analyze-archive.mjs'),archive,str(OUT/(slug+'-production.json'))]),
              ('independent',['python3',str(TOOLS/'recount_archive.py'),archive,str(OUT/(slug+'-independent.json'))])]
    for stage,command in commands:
        with (OUT/(slug+'-'+stage+'.log')).open('x') as log:
            proc=subprocess.run(command,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT)
        record={'arm':job['arm'],'policy':job['policy'],'stage':stage,'command':command,'exitCode':proc.returncode}
        results.append(record);(OUT/'progress.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(record),flush=True)
        if proc.returncode:
            (OUT/'failure.json').write_text(json.dumps(record,indent=2)+'\n')
            raise RuntimeError('Audit failed; original log retained')
    production=json.loads((OUT/(slug+'-production.json')).read_text());independent=json.loads((OUT/(slug+'-independent.json')).read_text())
    comparisons=0
    for key in ['manifestSha256','registrationSha256','arm','policy','sourceCommit']:assert production[key]==independent[key],key
    for a,b in [(production['counts'],independent['counts'])]+[(production['replicates'][key],independent['replicates'][key]) for key in production['replicates']]:
        for key in set(a)|set(b):
            assert a.get(key,0)==b.get(key,0),(slug,key,a.get(key,0),b.get(key,0))
            comparisons+=1
    (OUT/(slug+'-agreement.json')).write_text(json.dumps({'passed':True,'arm':job['arm'],'policy':job['policy'],'words':200000,'integerComparisons':comparisons,'disagreements':0},indent=2)+'\n')
after={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in TOOLS.iterdir() if p.is_file() and p.suffix in ('.py','.mjs','.json','.gz')}
assert after==files,'Audit tools changed during execution'
(OUT/'complete.json').write_text(json.dumps({'passed':True,'words':800000,'results':results,'tools':files},indent=2)+'\n')
