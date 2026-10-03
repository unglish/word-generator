import hashlib
import json
from pathlib import Path
import subprocess
import time
base=Path(__file__).parent
out=Path('/private/tmp/q18-parity-driver-v1');out.mkdir()
tools=base/'parity-tools'
def pins():return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in tools.iterdir() if p.is_file()}
before=pins();(out/'tools-before.json').write_text(json.dumps(before,indent=2)+'\n')
print('Waiting for Q10b2 diagnostics before omitted-policy parity; no overlap with registered timings.',flush=True)
while not Path('/private/tmp/q10b2-diagnostics-v2/complete.json').exists():
 for name in ['/private/tmp/q10b2-audit-v3/failure.json','/private/tmp/q10b2-performance-v2/failure.json']:
  if Path(name).exists():
   (out/'upstream-failure.json').write_text(json.dumps({'path':name})+'\n')
   raise RuntimeError('Upstream infrastructure failed; parity not started')
 time.sleep(15)
assert pins()==before
command=['/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node','--import','/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs',str(tools/'omitted-parity.mjs')]
with (out/'parity.log').open('x') as log:process=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT)
record=dict(command=command,exitCode=process.returncode,tools=before)
(out/('failure.json' if process.returncode else 'complete.json')).write_text(json.dumps(record,indent=2)+'\n')
assert pins()==before
if process.returncode:raise RuntimeError('Parity failed; evidence retained')
print(json.dumps(record),flush=True)
