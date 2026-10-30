import hashlib
import json
from pathlib import Path
import subprocess
import time

base = Path(__file__).parent
out = Path('/private/tmp/q17-fit-driver-v1')
out.mkdir()
tools = base / 'execution-tools'
def pins():
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in tools.iterdir() if p.is_file()}
before = pins()
(out / 'tools-before.json').write_text(json.dumps(before, indent=2) + '\n')
print('Waiting for Q10b2 diagnostics and Q11b baseline captures before registered fitting.', flush=True)
while not Path('/private/tmp/q11b-baseline-driver-v1/complete.json').exists():
    for name in ['/private/tmp/q10b2-audit-v3/failure.json', '/private/tmp/q10b2-performance-v2/failure.json',
                 '/private/tmp/q11b-baseline-driver-v1/failure.json', '/private/tmp/q11b-baseline-driver-v1/upstream-failure.json']:
        if Path(name).exists():
            (out / 'upstream-failure.json').write_text(json.dumps({'path': name}) + '\n')
            raise RuntimeError('Upstream infrastructure failure; fitting has not started')
    time.sleep(15)
assert pins() == before
node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
loader = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
command = [node, '--import', loader, str(tools / 'sealed-fit.mjs'), 'cbf479a1039a7db37333fed8b432d0f51ef686ca']
with (out / 'fit.log').open('x') as log:
    process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
record = {'command': command, 'exitCode': process.returncode, 'tools': before}
(out / ('failure.json' if process.returncode else 'complete.json')).write_text(json.dumps(record, indent=2) + '\n')
assert pins() == before
if process.returncode:
    raise RuntimeError('Registered fitting failed; original outputs retained')
print(json.dumps(record), flush=True)
