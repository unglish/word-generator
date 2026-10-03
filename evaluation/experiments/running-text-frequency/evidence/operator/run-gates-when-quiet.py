import hashlib
import json
from pathlib import Path
import subprocess
import time

base = Path(__file__).parent
runner = base / 'gate-tools' / 'run-gates.mjs'
out = Path('/private/tmp/q19-gates-driver-v1')
out.mkdir()
prerequisites = {
    'q18-complete-audit': Path('/private/tmp/q18-audit-driver-v1/complete.json'),
    'q11b-integrated-preflight': Path('/private/tmp/q11b-integrated-preflight-v1/complete.json'),
}
failures = [Path('/private/tmp/q18-audit-driver-v1/failure.json'),
            Path('/private/tmp/q18-audit-driver-v1/upstream-failure.json'),
            Path('/private/tmp/q11b-integrated-preflight-v1/failure.json')]
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
pins = {str(path): digest(path) for path in [runner, Path(__file__)]}
(out / 'before.json').write_text(json.dumps({'tools': pins, 'prerequisites': {k: str(v) for k, v in prerequisites.items()},
    'reservedExecutionOrder': 'Q19 original/configured gates and all six timing pairs precede Q11b candidate captures and Q18 gates. Do not launch other thread-owned bulk work during this reserved interval.'}, indent=2) + '\n')
print('Q19 gates queued behind Q18 full audit and Q11b integrated preflight; no gate or timing started.', flush=True)
while not all(path.exists() for path in prerequisites.values()):
    for path in failures:
        if path.exists():
            (out / 'upstream-failure.json').write_text(json.dumps({'path': str(path)}, indent=2) + '\n')
            raise RuntimeError('Prerequisite failed; Q19 gates not started')
    time.sleep(15)
assert pins == {name: digest(Path(name)) for name in pins}
reports = {name: json.loads(path.read_text()) for name, path in prerequisites.items()}
assert all(report['passed'] is True for report in reports.values())
assert reports['q18-complete-audit']['corpusWords'] == 400000
assert reports['q11b-integrated-preflight']['omitted']['comparisons'] == 10000
assert reports['q11b-integrated-preflight']['enabled']['comparisons'] == 10000
(out / 'prerequisites.json').write_text(json.dumps({name: {'path': str(path), 'sha256': digest(path)} for name, path in prerequisites.items()}, indent=2) + '\n')
node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
command = [node, str(runner)]
with (out / 'gates.log').open('x') as log:
    process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
record = {'command': command, 'exitCode': process.returncode}
if process.returncode:
    (out / 'failure.json').write_text(json.dumps(record, indent=2) + '\n')
    raise RuntimeError('Gate execution infrastructure failed; command failures/logs remain intact')
assert json.loads(Path('/private/tmp/q19-gates-v1/complete.json').read_text())['passed'] is True
assert pins == {name: digest(Path(name)) for name in pins}
(out / 'complete.json').write_text(json.dumps({'passed': True, **record,
    'scope': 'All registered commands executed with provenance; individual gate failures are retained separately and are not a passing-quality claim.'}, indent=2) + '\n')
