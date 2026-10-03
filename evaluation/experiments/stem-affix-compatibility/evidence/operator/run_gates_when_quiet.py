"""Finite Q18 gate job; original failures remain measured outcomes."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).parent
TOOLS = BASE / 'gate-tools'
OUT = Path('/private/tmp/q18-gates-driver-v1')
OUT.mkdir()
prerequisites = {'q18-full-audit': Path('/private/tmp/q18-audit-driver-v1/complete.json'),
                 'q19-complete-gates-and-timing': Path('/private/tmp/q19-gates-driver-v1/complete.json')}
preflight = Path('/private/tmp/q18-gate-bindings-preflight-v2/complete.json')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


paths = [Path(__file__), preflight] + [p for p in TOOLS.iterdir() if p.is_file()]
before = {str(p): digest(p) for p in paths}
(OUT / 'before.json').write_text(json.dumps({'inputs': before, 'prerequisites': {k: str(v) for k, v in prerequisites.items()},
    'executionOrder': 'Q18 full audit, Q19 gates/timing, Q18 gates/timing, Q11b captures, Q11b full audits. No other thread-owned bulk job during either gate/timing interval.'}, indent=2) + '\n')
try:
    binding = json.loads(preflight.read_bytes())
    assert binding['passed'] is True and binding['before'] == binding['after']
    assert len(binding['results']) == 2
    assert all(r['completePublicWordComparisons'] == 400 and r['nextRngProbes'] == 2 for r in binding['results'])
    for name, record in binding['before']['tools'].items():
        path = TOOLS / name
        assert path.stat().st_size == record['bytes'] and digest(path) == record['sha256']
    print('Q18 complete gates/timing queued behind its full audit and Q19’s reserved interval.', flush=True)
    while not all(p.exists() for p in prerequisites.values()):
        for p in prerequisites.values():
            for name in ('failure.json', 'upstream-failure.json'):
                failure = p.parent / name
                if failure.exists():
                    (OUT / 'upstream-failure.json').write_text(json.dumps({'path': str(failure)}, indent=2) + '\n')
                    raise RuntimeError('Upstream failed; Q18 gates were not started')
        time.sleep(15)
    reports = {name: json.loads(p.read_bytes()) for name, p in prerequisites.items()}
    assert all(r['passed'] is True for r in reports.values())
    assert reports['q18-full-audit']['corpusWords'] == 400000
    q19 = json.loads(Path('/private/tmp/q19-gates-v1/complete.json').read_bytes())
    assert q19['passed'] is True and sum(r['name'].startswith('pair-') for r in q19['results']) == 24
    assert not Path('/private/tmp/q11b-candidate-default-v1').exists()
    assert not Path('/private/tmp/q11b-candidate-active-v1').exists()
    assert before == {str(p): digest(p) for p in paths}
    node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
    command = [node, str(TOOLS / 'run-gates.mjs')]
    with (OUT / 'gates.log').open('x') as log:
        process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    record = {'command': command, 'exitCode': process.returncode}
    if process.returncode:
        raise RuntimeError('Q18 gate infrastructure failed; original command outcomes and logs retained')
    gates = json.loads(Path('/private/tmp/q18-gates-v1/complete.json').read_bytes())
    assert gates['passed'] is True
    assert sum(r['name'].startswith('native-pair-') for r in gates['results']) == 12
    assert sum(r['name'].startswith('configured-pair-') for r in gates['results']) == 24
    assert before == {str(p): digest(p) for p in paths}
    (OUT / 'complete.json').write_text(json.dumps({'passed': True, **record, 'inputPins': before,
        'prerequisites': {name: {'path': str(p), 'sha256': digest(p)} for name, p in prerequisites.items()},
        'scope': 'Both frozen sources completed every required original command, configured quality checks and all native/configured timing pairs. Individual failures remain failures; this marker certifies execution/provenance only.'}, indent=2) + '\n')
except Exception as error:
    (OUT / 'failure.json').write_text(json.dumps({'error': str(error), 'type': type(error).__name__}, indent=2) + '\n')
    raise
