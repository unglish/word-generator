"""Finite two-policy capture job; Q19 owns the next uncontended interval."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator')
COMMIT = '9d2680b37b77ebb2f492f4173b1f1681446e40f4'
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
LOADER = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
OUT = Path('/private/tmp/q11b-candidate-capture-driver-v1')
OUT.mkdir()
binding = ROOT / 'evaluation/experiments/morphophonemic-cluster-legality/capture/freeze-capture.mjs'
registration = ROOT / 'evaluation/experiments/morphophonemic-cluster-legality/treatment-measurement.json'
prerequisite = Path('/private/tmp/q19-gates-driver-v1/complete.json')
public_preflight = Path('/private/tmp/q11b-public-oracle-preflight-v2/complete.json')
independent_preflight = Path('/private/tmp/q11b-public-oracle-recount-v1.json')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


paths = [Path(__file__), binding, registration, public_preflight, independent_preflight]
paths += [p for folder in ('capture', 'independent')
          for p in (binding.parent.parent / folder).iterdir() if p.is_file()]
before = {str(path): digest(path) for path in paths}
(OUT / 'before.json').write_text(json.dumps({'inputPins': before, 'expectedCommit': COMMIT,
    'prerequisite': str(prerequisite), 'order': 'Q18 audit, Q19 complete gates and six timing pairs, then these two Q11b captures. No new Q18 gate or other bulk work during the Q19 reserved interval or these captures.'}, indent=2) + '\n')
try:
    assert json.loads(public_preflight.read_bytes())['after']['commit'] == COMMIT
    independent = json.loads(independent_preflight.read_bytes())
    assert independent['passed'] is True and independent['words'] == 400 and independent['streams'] == 40
    assert independent['commit'] == COMMIT
    print('Q11b full candidate captures queued behind the complete Q19 gate/timing interval.', flush=True)
    while not prerequisite.exists():
        for failure in ('failure.json', 'upstream-failure.json'):
            path = prerequisite.parent / failure
            if path.exists():
                (OUT / 'upstream-failure.json').write_text(json.dumps({'path': str(path)}, indent=2) + '\n')
                raise RuntimeError('Q19 prerequisite failed; Q11b captures were not started')
        time.sleep(15)
    assert json.loads(prerequisite.read_bytes())['passed'] is True
    q19 = json.loads(Path('/private/tmp/q19-gates-v1/complete.json').read_bytes())
    assert q19['passed'] is True
    assert sum(r['name'].startswith('pair-') for r in q19['results']) == 24
    assert before == {str(path): digest(path) for path in paths}
    results = []
    for policy in ('default', 'active'):
        assert before == {str(path): digest(path) for path in paths}
        archive = Path(f'/private/tmp/q11b-candidate-{policy}-v1')
        command = [NODE, '--import', LOADER, str(binding), str(ROOT), 'candidate', policy, COMMIT, str(archive)]
        with (OUT / (policy + '.log')).open('x') as log:
            process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
        record = {'policy': policy, 'command': command, 'exitCode': process.returncode}
        results.append(record)
        (OUT / 'progress.json').write_text(json.dumps(results, indent=2) + '\n')
        if process.returncode:
            raise RuntimeError('Candidate capture failed; original archive, failure record and logs retained')
        seal = json.loads(Path(str(archive) + '-freeze/complete.json').read_bytes())
        assert seal['passed'] is True and seal['words'] == 200000
        print(json.dumps(record), flush=True)
    assert before == {str(path): digest(path) for path in paths}
    (OUT / 'complete.json').write_text(json.dumps({'passed': True, 'words': 400000,
        'sourceCommit': COMMIT, 'results': results, 'inputPins': before,
        'q19PrerequisiteSha256': digest(prerequisite),
        'scope': 'Both registered full candidate captures completed with frozen inputs. Full public/independent audits, evaluator comparison, original gates, timing and publication remain.'}, indent=2) + '\n')
except Exception as error:
    (OUT / 'failure.json').write_text(json.dumps({'error': str(error), 'type': type(error).__name__}, indent=2) + '\n')
    raise
