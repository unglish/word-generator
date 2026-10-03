"""Finite original Q11b gate job; command failures remain measured outcomes."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).parent
TOOLS = BASE / 'gate-tools'
OUT = Path('/private/tmp/q11b-gates-driver-v1')
ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator')
COMMIT = '9d2680b37b77ebb2f492f4173b1f1681446e40f4'
PREFLIGHT = Path('/private/tmp/q11b-gate-static-preflight-v2.json')
MEASUREMENT = ROOT / 'evaluation/experiments/morphophonemic-cluster-legality/treatment-measurement.json'
PREREQUISITES = {
    'q19-gates': Path('/private/tmp/q19-gates-driver-v1/complete.json'),
    'q18-gates': Path('/private/tmp/q18-gates-driver-v1/complete.json'),
    'q11b-full-audits': Path('/private/tmp/q11b-full-audit-driver-v1/complete.json'),
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


OUT.mkdir()
paths = [Path(__file__), MEASUREMENT, PREFLIGHT] + [p for p in TOOLS.iterdir() if p.is_file()]
before = {str(p): digest(p) for p in paths}
(OUT / 'before.json').write_text(json.dumps({
    'inputPins': before, 'prerequisites': {k: str(v) for k, v in PREREQUISITES.items()},
    'order': 'Q18 audit; Q19 gates/timing; Q18 gates/timing; Q11b captures; Q11b full audits; Q11b original gates/timing.',
    'quietScope': 'No other thread-owned bulk work during this gate/timing interval.',
}, indent=2) + '\n')
try:
    preflight = json.loads(PREFLIGHT.read_bytes())
    assert preflight['passed'] is True and len(preflight['checks']) == 2
    assert all(check['gateFilesAuthenticated'] == 7 for check in preflight['checks'])
    registration = json.loads((TOOLS / 'binding-registration.json').read_bytes())
    assert registration['measuredCandidate'] == COMMIT
    assert registration['measurementSha256'] == digest(MEASUREMENT)
    assert registration['commands'] == 22 and registration['nativeTimingRuns'] == 12
    print('Q11b original gates and six native timing pairs queued after full public/independent audits.', flush=True)
    while not all(path.exists() for path in PREREQUISITES.values()):
        for path in PREREQUISITES.values():
            for name in ('failure.json', 'upstream-failure.json'):
                failure = path.parent / name
                if failure.exists():
                    (OUT / 'upstream-failure.json').write_text(json.dumps({'path': str(failure)}, indent=2) + '\n')
                    raise RuntimeError('Upstream failed; Q11b gates not started')
        time.sleep(15)
    reports = {name: json.loads(path.read_bytes()) for name, path in PREREQUISITES.items()}
    assert all(report['passed'] is True for report in reports.values())
    assert reports['q11b-full-audits']['corpusWords'] == 400000
    assert reports['q11b-full-audits']['sourceCommit'] == COMMIT
    q19 = json.loads(Path('/private/tmp/q19-gates-v1/complete.json').read_bytes())
    q18 = json.loads(Path('/private/tmp/q18-gates-v1/complete.json').read_bytes())
    assert q19['passed'] is True and sum(r['name'].startswith('pair-') for r in q19['results']) == 24
    assert q18['passed'] is True and sum(r['name'].startswith('native-pair-') for r in q18['results']) == 12
    assert sum(r['name'].startswith('configured-pair-') for r in q18['results']) == 24
    assert before == {str(path): digest(path) for path in paths}
    node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
    command = [node, str(TOOLS / 'run-gates.mjs')]
    with (OUT / 'gates.log').open('x') as log:
        process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    if process.returncode:
        raise RuntimeError('Q11b gate infrastructure failed; command outcomes/logs retained')
    gates = json.loads(Path('/private/tmp/q11b-gates-v1/complete.json').read_bytes())
    assert gates['passed'] is True and len(gates['results']) == 22
    assert sum(r['name'].startswith('native-pair-') for r in gates['results']) == 12
    assert before == {str(path): digest(path) for path in paths}
    (OUT / 'complete.json').write_text(json.dumps({
        'passed': True, 'sourceCommit': COMMIT, 'inputPins': before,
        'prerequisites': {name: {'path': str(path), 'sha256': digest(path)} for name, path in PREREQUISITES.items()},
        'command': command, 'exitCode': process.returncode, 'gateCompletionSha256': digest(Path('/private/tmp/q11b-gates-v1/complete.json')),
        'scope': 'Both frozen sources completed original unit/quality/compiled diagnostics and six adjacent native timing pairs. Failures remain failures; marker certifies complete execution/provenance only.',
    }, indent=2) + '\n')
except Exception as error:
    (OUT / 'failure.json').write_text(json.dumps({'error': str(error), 'type': type(error).__name__}, indent=2) + '\n')
    raise
