import hashlib
import json
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).parent
TOOLS = BASE / 'baseline-tools'
OUT = Path('/private/tmp/q11b-baseline-driver-v1')
OUT.mkdir()
pins = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in TOOLS.iterdir() if p.is_file()}
(OUT / 'tools-before.json').write_text(json.dumps(pins, indent=2) + '\n')
print('Waiting for Q10b2 diagnostics to terminate before baseline captures; upstream infrastructure failures abort.', flush=True)
while not Path('/private/tmp/q10b2-diagnostics-v2/complete.json').exists():
    for name in ['/private/tmp/q10b2-audit-v3/failure.json', '/private/tmp/q10b2-audit-v3/capture-failure.json', '/private/tmp/q10b2-performance-v2/failure.json']:
        if Path(name).exists():
            (OUT / 'upstream-failure.json').write_text(json.dumps({'path': name}, indent=2) + '\n')
            raise RuntimeError('Q10b2 infrastructure failed; baseline capture not started')
    time.sleep(15)

assert pins == {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in TOOLS.iterdir() if p.is_file()}
root = '/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator'
node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
loader = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
commit = json.loads((TOOLS / 'measurement.json').read_text())['controlCommit']
results = []
for policy in ['default', 'active']:
    destination = f'/private/tmp/q11b-composed-control-{policy}-v1'
    command = [node, '--import', loader, str(TOOLS / 'freeze-capture.mjs'), root, 'composed-control', policy, commit, destination]
    with (OUT / f'{policy}.log').open('x') as log:
        process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    record = {'policy': policy, 'exitCode': process.returncode, 'command': command, 'archive': destination}
    results.append(record)
    (OUT / 'progress.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(record), flush=True)
    if process.returncode:
        (OUT / 'failure.json').write_text(json.dumps(record, indent=2) + '\n')
        raise RuntimeError('Baseline capture failed; original output retained')
    seal = json.loads(Path(destination + '-freeze/complete.json').read_text())
    assert seal['passed'] is True and seal['words'] == 200000
assert pins == {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in TOOLS.iterdir() if p.is_file()}
(OUT / 'complete.json').write_text(json.dumps({'passed': True, 'words': 400000, 'results': results, 'tools': pins,
    'scope': 'Exploratory composed-control captures; full replay, collision analysis and candidate registration remain separate.'}, indent=2) + '\n')
