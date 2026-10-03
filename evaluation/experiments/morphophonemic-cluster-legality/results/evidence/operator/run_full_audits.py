"""Finite complete Q11b public and independent audit, after both full captures."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).parent
ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator')
COMMIT = '9d2680b37b77ebb2f492f4173b1f1681446e40f4'
TOOLS = BASE / 'full-audit-tools'
INDEPENDENT = ROOT / 'evaluation/experiments/morphophonemic-cluster-legality/independent'
REGISTRATION = ROOT / 'evaluation/experiments/morphophonemic-cluster-legality/treatment-measurement.json'
PROTOCOL = ROOT / 'evaluation/quality/protocol.json'
OUT = Path('/private/tmp/q11b-full-audit-driver-v1')
OUT.mkdir()
upstream = Path('/private/tmp/q11b-candidate-capture-driver-v2/complete.json')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


paths = [Path(__file__), REGISTRATION, PROTOCOL]
paths += [p for directory in (TOOLS, INDEPENDENT) for p in directory.iterdir() if p.is_file()]
before = {str(p): digest(p) for p in paths}
(OUT / 'before.json').write_text(json.dumps({'inputPins': before, 'upstream': str(upstream),
    'sourceCommit': COMMIT, 'wordsPerPolicy': 200000, 'wordsPerArm': 400000,
    'order': 'Q18 audit; Q19 gates/timing; Q18 gates/timing; Q11b full captures; these Q11b audits. No new timing during these audits.'}, indent=2) + '\n')
try:
    print('Q11b complete public/independent audits queued behind both full candidate captures.', flush=True)
    while not upstream.exists():
        for name in ('failure.json', 'upstream-failure.json'):
            failure = upstream.parent / name
            if failure.exists():
                (OUT / 'upstream-failure.json').write_text(json.dumps({'path': str(failure)}, indent=2) + '\n')
                raise RuntimeError('Capture prerequisite failed; full audits not started')
        time.sleep(15)
    capture = json.loads(upstream.read_bytes())
    assert capture['passed'] is True and capture['words'] == 400000 and capture['sourceCommit'] == COMMIT
    assert before == {str(p): digest(p) for p in paths}
    node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
    loader = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
    commands = [('independent-fixtures', ['python3', '-B', '-m', 'unittest', 'discover', '-s', str(INDEPENDENT), '-p', 'test_*.py', '-v'])]
    for policy in ('default', 'active'):
        archive = Path(f'/private/tmp/q11b-candidate-{policy}-v1')
        commands.append((policy + '-public-replay', [node, '--import', loader, str(TOOLS / 'replay-archive.mjs'),
            str(ROOT), COMMIT, str(archive), str(OUT / (policy + '-public-replay.json'))]))
        commands.append((policy + '-independent', ['python3', '-B', str(INDEPENDENT / 'recount_archive.py'),
            str(archive), str(REGISTRATION), str(PROTOCOL), COMMIT, str(OUT / (policy + '-independent'))]))
    results = []
    for name, command in commands:
        assert before == {str(p): digest(p) for p in paths}
        with (OUT / (name + '.log')).open('x') as log:
            process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
        record = {'stage': name, 'command': command, 'exitCode': process.returncode}
        results.append(record)
        (OUT / 'progress.json').write_text(json.dumps(results, indent=2) + '\n')
        print(json.dumps(record), flush=True)
        if process.returncode:
            raise RuntimeError('Full audit failed; original evidence and successful prior stages retained')
    for policy in ('default', 'active'):
        replay = json.loads((OUT / (policy + '-public-replay.json')).read_bytes())
        independent = json.loads((OUT / (policy + '-independent') / 'complete.json').read_bytes())
        assert replay['passed'] is True and replay['words'] == 200000 and replay['sourceCommit'] == COMMIT
        assert independent['passed'] is True and independent['words'] == 200000
        assert independent['manifest'] == replay['manifest']
    assert before == {str(p): digest(p) for p in paths}
    (OUT / 'complete.json').write_text(json.dumps({'passed': True, 'corpusWords': 400000,
        'sourceCommit': COMMIT, 'results': results, 'inputPins': before, 'captureCompletionSha256': digest(upstream),
        'scope': 'Every registered candidate word and complete trace public replayed; all configured proposals, atomic states, ownership, written halves, bridge draws and final cell/phone ledgers independently reconstructed. Original evaluator comparisons, original gates, timing and publication remain.'}, indent=2) + '\n')
except Exception as error:
    (OUT / 'failure.json').write_text(json.dumps({'error': str(error), 'type': type(error).__name__}, indent=2) + '\n')
    raise
