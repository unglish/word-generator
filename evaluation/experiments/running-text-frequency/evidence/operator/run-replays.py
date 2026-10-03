import hashlib
import json
from pathlib import Path
import subprocess
import time
ROOT=Path(__file__).resolve().parent
TOOLS=ROOT/'audit-tools'
OUT=Path('/private/tmp/q19-replays-driver-v1');OUT.mkdir()
def pins():
    return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(TOOLS.iterdir()) if p.is_file()}
before=pins();(OUT/'tools-before.json').write_text(json.dumps(before,indent=2)+'\n')
progress=[]
for arm in ['control','candidate']:
    archive=Path(f'/private/tmp/q19-{arm}-capture-v1')
    while not (archive/'complete.json').exists():
        if (archive/'failure.json').exists():
            raise RuntimeError('Capture failed: '+arm)
        time.sleep(10)
    assert json.loads((archive/'complete.json').read_text())['passed']
    assert pins()==before
    command=['/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node','--import',
       '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs',str(TOOLS/'replay.mjs'),arm]
    with (OUT/(arm+'.log')).open('x') as log:
        code=subprocess.call(command,stdout=log,stderr=subprocess.STDOUT)
    progress.append({'arm':arm,'exitCode':code});(OUT/'progress.json').write_text(json.dumps(progress,indent=2)+'\n')
    assert pins()==before and code==0
(OUT/'complete.json').write_text(json.dumps({'passed':True,'progress':progress,'tools':before},indent=2)+'\n')
