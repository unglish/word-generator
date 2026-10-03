import hashlib
import json
from pathlib import Path
import subprocess
import time

base = Path(__file__).parent
out = Path('/private/tmp/q17-independent-verification-v1')
out.mkdir()
paths = [base / name for name in ['independent_reconstruction.py', 'verify_likelihoods.py', 'test_independent_likelihoods.py', 'run_verification.py']]
def pins(): return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
before = pins()
(out / 'tools-before.json').write_text(json.dumps(before, indent=2)+'\n')
print('Waiting for registered fitting seal; independent verification has not started.', flush=True)
while not Path('/private/tmp/q17-registered-fit-v1/complete.json').exists():
    for path in [Path('/private/tmp/q17-registered-fit-v1/failure.json'), Path('/private/tmp/q17-fit-driver-v1/failure.json'), Path('/private/tmp/q17-fit-driver-v1/upstream-failure.json')]:
        if path.exists():
            (out / 'upstream-failure.json').write_text(json.dumps({'path': str(path)})+'\n')
            raise RuntimeError('Fitting not accepted; verification not started')
    time.sleep(15)
assert pins() == before
artifact = Path('/private/tmp/q17-registered-fit-v1/artifact.json')
seal = json.loads(Path('/private/tmp/q17-registered-fit-v1/complete.json').read_text())
assert seal['passed'] is True
raw = artifact.read_bytes()
assert len(raw) == seal['artifact']['bytes']
assert hashlib.sha256(raw).hexdigest() == seal['artifact']['sha256']
results = []
for name in ['independent_reconstruction.py', 'verify_likelihoods.py']:
    command = ['python3', str(base/name), '/private/tmp/q17-cmudict-74790861.dict', str(artifact)]
    with (out/(name+'.log')).open('x') as log:
        process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    record = dict(command=command, exitCode=process.returncode)
    results.append(record)
    if process.returncode:
        (out/'failure.json').write_text(json.dumps(record, indent=2)+'\n')
        raise RuntimeError('Independent verification failed; evidence retained')
assert pins() == before
assert artifact.read_bytes() == raw
(out/'complete.json').write_text(json.dumps(dict(passed=True, results=results, tools=before, artifactSha256=hashlib.sha256(raw).hexdigest()), indent=2)+'\n')
print('Independent reconstruction and numerical verification completed.', flush=True)
