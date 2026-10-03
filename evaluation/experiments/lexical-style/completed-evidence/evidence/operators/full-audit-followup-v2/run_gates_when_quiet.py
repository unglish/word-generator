"""Run every registered Q20 gate only after all thread-owned bulk work ends."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).parent
TOOLS = BASE.parent / 'gate-tools'
OUT = Path('/private/tmp/q20-gates-driver-v2')
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
PREFLIGHT = Path('/private/tmp/q20-gate-bindings-preflight-v1/complete.json')
CHECKS = Path('/private/tmp/q20-gate-operator-checks-v1/complete.json')
PREREQUISITES = {
    'q20-full-audit': Path('/private/tmp/q20-full-audit-driver-v2/complete.json'),
    'q21-calibration': Path('/private/tmp/q21-calibration-driver-v1/complete.json'),
    'q21-independent': Path('/private/tmp/q21-calibration-independent-driver-v1/complete.json'),
    'q21-decisions': Path('/private/tmp/q21-calibration-summary-driver-v1/complete.json'),
    'q11b-paired': Path('/private/tmp/q11b-paired-summary-driver-v1/complete.json'),
}


def pin(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def pins():
    paths = [Path(__file__)] + [path for path in TOOLS.iterdir() if path.is_file()]
    return {str(path): pin(path) for path in sorted(paths)}


OUT.mkdir()
before = pins()
(OUT / 'before.json').write_text(json.dumps({'inputPins': before,
    'prerequisites': {name: str(path) for name, path in PREREQUISITES.items()},
    'scope': 'All 74 original/configured commands: twelve native timing runs plus 48 configured timing runs, six adjacent pairs in each policy/mode. No other thread-owned bulk job during execution.'}, indent=2) + '\n')
try:
    preflight, checks = json.loads(PREFLIGHT.read_bytes()), json.loads(CHECKS.read_bytes())
    assert preflight['passed'] is True and preflight['before'] == preflight['after']
    assert len(preflight['results']) == 4 and all(record['completePublicWordComparisons'] == 400 and record['nextRngProbes'] == 2 for record in preflight['results'])
    assert checks['passed'] is True and checks['strictTypesExitCode'] == 0
    for name, expected in preflight['before']['tools'].items():
        assert pin(TOOLS / name) == expected
    for name, expected in checks['tools'].items():
        assert pin(TOOLS / name) == expected
    registration = json.loads((TOOLS / 'binding-registration.json').read_bytes())
    assert registration['commands'] == 74 and registration['nativeTimingRuns'] == 12 and registration['configuredTimingRuns'] == 48
    assert pin(Path(registration['measurementPath'])) == registration['measurement']
    print('All Q20 original/configured gates queued behind complete morphology/style audits and full calibration/oracle/decision jobs.', flush=True)
    while not all(path.exists() for path in PREREQUISITES.values()):
        for path in PREREQUISITES.values():
            assert not (path.parent / 'failure.json').exists(), f'Upstream failed: {path.parent}'
            assert not (path.parent / 'upstream-failure.json').exists(), f'Upstream prerequisite failed: {path.parent}'
        time.sleep(15)
    reports = {name: json.loads(path.read_bytes()) for name, path in PREREQUISITES.items()}
    assert reports['q20-full-audit']['passed'] is True
    assert reports['q20-full-audit']['candidatePublicReplayWords'] == 400000 and reports['q20-full-audit']['independentWords'] == 800000
    assert reports['q21-calibration']['passed'] is True and reports['q21-calibration']['datasets'] == 14400
    assert reports['q21-independent']['passed'] is True and reports['q21-independent']['datasets'] == 14400
    assert reports['q21-decisions']['executionPassed'] is True and reports['q21-decisions']['datasets'] == 14400
    assert reports['q11b-paired']['passed'] is True
    # Calibration may legitimately fail its statistical criteria. Its execution
    # completion ends bulk load, without promoting that method or discarding it.
    assert pins() == before
    command = [NODE, str(TOOLS / 'run-gates.mjs')]
    with (OUT / 'gates.log').open('x') as log:
        process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    assert process.returncode == 0, 'Gate infrastructure failed; all prior outcomes and logs retained'
    complete = Path('/private/tmp/q20-gates-v1/complete.json')
    gates = json.loads(complete.read_bytes())
    assert gates['passed'] is True and len(gates['results']) == 74
    assert sum(record['name'].startswith('native-pair-') for record in gates['results']) == 12
    assert sum(record['name'].startswith('configured-pair-') for record in gates['results']) == 48
    assert pins() == before
    (OUT / 'complete.json').write_text(json.dumps({'passed': True, 'commands': 74,
        'nativeTimingRuns': 12, 'configuredTimingRuns': 48, 'inputPins': before,
        'prerequisites': {name: pin(path) for name, path in PREREQUISITES.items()},
        'command': command, 'exitCode': process.returncode, 'gateCompletion': pin(complete),
        'scope': 'All original/configured commands completed with unchanged bodies/counts/limits; every failure retained. Execution/provenance marker only, not passing quality/performance or promotion.'}, indent=2) + '\n')
except Exception as error:
    (OUT / 'failure.json').write_text(json.dumps({'error': str(error), 'type': type(error).__name__}, indent=2) + '\n')
    raise
