"""Full Q20 control/treatment reconstruction after the complete candidate capture."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).parent
TOOLS = BASE / 'full-audit-tools'
OUT = Path('/private/tmp/q20-full-audit-driver-v1')
UPSTREAM = Path('/private/tmp/q20-candidate-capture-driver-v1')
PYTHON = '/Users/ryanbetts/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
LOADER = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
ROOT = '/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator'
COMMIT = '4f4c95d555a00f1d8cb44892a72e57748f377948'
CHECKS = Path('/private/tmp/q20-independent-operator-checks-v1/complete.json')
PREFLIGHT = Path('/private/tmp/q20-independent-law-preflight-v3/complete.json')
MODULES = ['audit_archive.py', 'independent_model.py', 'feature_lineage.py', 'final_lineage.py']


def pin(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def pins():
    paths = [Path(__file__), BASE / 'capture-tools/execution-registration.json']
    paths += [path for path in TOOLS.iterdir() if path.is_file()]
    return {str(path): pin(path) for path in sorted(paths)}


OUT.mkdir()
before = pins()
(OUT / 'before.json').write_text(json.dumps({'inputPins': before, 'upstream': str(UPSTREAM),
    'candidateCommit': COMMIT, 'candidateWords': 400000, 'controlWords': 400000,
    'scope': 'All 400000 candidate words public replayed; all 800000 control/candidate words independently reconstructed with their own laws. No new timing during these audits.'}, indent=2) + '\n')
try:
    checks, preflight = json.loads(CHECKS.read_bytes()), json.loads(PREFLIGHT.read_bytes())
    assert checks['passed'] is True and checks['tests'] == 12
    assert preflight['passed'] is True and preflight['preflight'] is True and preflight['words'] == 400
    assert preflight['streams'] == 40 and preflight['before'] == preflight['after']
    for name in MODULES:
        assert preflight['before']['tools'][name] == pin(TOOLS / name)
        assert checks['tools'][name] == pin(TOOLS / name)
    for policy in ['default', 'active']:
        record = json.loads(Path(f'/private/tmp/q20-control-{policy}-preflight-v1/complete.json').read_bytes())
        assert record['passed'] is True and record['preflight'] is True and record['words'] == 200 and record['streams'] == 20
        assert record['before'] == record['after']
        for name in MODULES:
            assert record['before']['tools'][name] == pin(TOOLS / name)
    print('Complete Q20 audit queued: 400000 candidate public words and 800000 independent control/candidate words.', flush=True)
    while not (UPSTREAM / 'complete.json').exists():
        assert not (UPSTREAM / 'failure.json').exists(), 'Capture failed; full audit not started'
        time.sleep(15)
    capture = json.loads((UPSTREAM / 'complete.json').read_bytes())
    assert capture['passed'] is True and capture['words'] == 400000 and capture['candidateCommit'] == COMMIT
    assert pins() == before
    commands = []
    for policy in ['default', 'active']:
        commands.append((policy + '-public-replay', [NODE, '--import', LOADER, str(TOOLS / 'replay-archive.mjs'),
            ROOT, COMMIT, f'/private/tmp/q20-candidate-{policy}-v1', str(OUT / (policy + '-public-replay.json'))]))
        for arm in ['control', 'candidate']:
            commands.append((arm + '-' + policy + '-independent', [PYTHON, '-B', str(TOOLS / 'audit_archive.py'), arm, policy]))
    results = []
    for name, command in commands:
        assert pins() == before
        with (OUT / (name + '.log')).open('x') as log:
            process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
        result = {'stage': name, 'command': command, 'exitCode': process.returncode}
        results.append(result)
        (OUT / 'progress.json').write_text(json.dumps(results, indent=2) + '\n')
        print(json.dumps(result), flush=True)
        assert process.returncode == 0, 'Audit failed; complete prior stages and partial evidence retained'
    for policy in ['default', 'active']:
        replay = json.loads((OUT / (policy + '-public-replay.json')).read_bytes())
        assert replay['passed'] is True and replay['words'] == 200000 and replay['sourceCommit'] == COMMIT
        for arm in ['control', 'candidate']:
            record = json.loads(Path(f'/private/tmp/q20-{arm}-{policy}-independent-v1/complete.json').read_bytes())
            assert record['passed'] is True and record['preflight'] is False and record['words'] == 200000
            if arm == 'candidate':
                assert record['manifest'] == replay['manifest'] and record['sourceCommit'] == COMMIT
    assert pins() == before
    (OUT / 'complete.json').write_text(json.dumps({'passed': True, 'candidatePublicReplayWords': 400000,
        'independentWords': 800000, 'candidateCommit': COMMIT, 'results': results, 'inputPins': before,
        'captureCompletion': pin(UPSTREAM / 'complete.json'),
        'scope': 'Full accepted-word source/provenance/public trace parity and independent hard-support, local/style weights, complete conditioned probabilities and base/final lineage/source survival. Quality distributions, original gates/timing, repair semantic licensing and actual reader outcomes remain.'}, indent=2) + '\n')
except Exception as error:
    (OUT / 'failure.json').write_text(json.dumps({'error': str(error), 'type': type(error).__name__}, indent=2) + '\n')
    raise
