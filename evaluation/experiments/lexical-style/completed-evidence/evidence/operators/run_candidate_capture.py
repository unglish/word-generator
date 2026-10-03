"""Finite registered Q20 captures after parity and the Q11b quiet gate interval."""
from pathlib import Path
import hashlib
import json
import subprocess
import time

BASE = Path(__file__).parent
TOOLS = BASE / 'capture-tools'
OUT = Path('/private/tmp/q20-candidate-capture-driver-v1')
PREREQUISITES = {
    'parity': Path('/private/tmp/q20-public-parity-v1/complete.json'),
    'q11b-gates': Path('/private/tmp/q11b-gates-driver-v1/complete.json'),
    'default-preflight': Path('/private/tmp/q20-candidate-default-v1-preflight/complete.json'),
    'active-preflight': Path('/private/tmp/q20-candidate-active-v1-preflight/complete.json'),
}
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
LOADER = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'


def pins():
    paths = [Path(__file__)] + [p for p in TOOLS.iterdir() if p.is_file()]
    return {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}


OUT.mkdir()
before = pins()
(OUT / 'before.json').write_text(json.dumps({'inputPins': before,
    'prerequisites': {k: str(v) for k, v in PREREQUISITES.items()},
    'order': 'Q11b full captures/audits/original gates and timing; Q20 complete 30k parity; then both complete Q20 candidate captures.'}, indent=2) + '\n')
try:
    print('Q20 full 400000-word candidate capture queued after parity and Q11b original gates/timing.', flush=True)
    while not all(path.exists() for path in PREREQUISITES.values()):
        for path in PREREQUISITES.values():
            for name in ('failure.json', 'upstream-failure.json'):
                assert not (path.parent / name).exists(), f'Upstream failed: {path.parent / name}'
        time.sleep(15)
    reports = {name: json.loads(path.read_bytes()) for name, path in PREREQUISITES.items()}
    assert all(report['passed'] is True for report in reports.values())
    assert reports['parity']['comparisons'] == 30000 and reports['parity']['publicCalls'] == 60000
    assert reports['parity']['probes'] == 120
    assert before == pins()
    results = []
    for policy in ('default', 'active'):
        command = [NODE, '--import', LOADER, str(TOOLS / 'freeze-capture.mjs'), policy]
        with (OUT / (policy + '.log')).open('x') as log:
            process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
        record = {'policy': policy, 'command': command, 'exitCode': process.returncode}
        results.append(record)
        (OUT / 'progress.json').write_text(json.dumps(results, indent=2) + '\n')
        print(json.dumps(record), flush=True)
        assert process.returncode == 0, 'Capture failed; original logs and partial archive retained'
        seal = json.loads(Path(f'/private/tmp/q20-candidate-{policy}-v1-freeze/complete.json').read_bytes())
        assert seal['passed'] is True and seal['words'] == 200000
        assert before == pins()
    (OUT / 'complete.json').write_text(json.dumps({'passed': True, 'words': 400000,
        'candidateCommit': '4f4c95d555a00f1d8cb44892a72e57748f377948', 'results': results, 'inputPins': before,
        'prerequisites': {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in PREREQUISITES.items()},
        'scope': 'All registered candidate captures completed; full independent/public audits, paired measurements, original gates and human observations remain.'}, indent=2) + '\n')
except Exception as error:
    (OUT / 'failure.json').write_text(json.dumps({'error': str(error), 'type': type(error).__name__}, indent=2) + '\n')
    raise
