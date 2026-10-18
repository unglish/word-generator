import hashlib
import json
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent
TOOLS = ROOT/'capture-tools'
CONTROL = Path('/private/tmp/q19-control-capture-v1')
OUT = Path('/private/tmp/q19-candidate-capture-driver-v1')
OUT.mkdir()
def pins():
    return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(TOOLS.iterdir()) if p.is_file()}
before=pins()
(OUT/'tools-before.json').write_text(json.dumps(before,indent=2)+'\n')
while not (CONTROL/'complete.json').exists():
    if (CONTROL/'failure.json').exists():
        raise RuntimeError('Upstream control capture failed; candidate not started.')
    time.sleep(10)
assert json.loads((CONTROL/'complete.json').read_text())['passed']
assert pins()==before
command=['/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node','--import',
 '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs',str(TOOLS/'capture.mjs'),'candidate']
with (OUT/'capture.log').open('x') as log:
    code=subprocess.call(command,stdout=log,stderr=subprocess.STDOUT)
assert pins()==before
(OUT/'complete.json').write_text(json.dumps({'exitCode':code,'passed':code==0,'tools':before},indent=2)+'\n')
assert code==0
