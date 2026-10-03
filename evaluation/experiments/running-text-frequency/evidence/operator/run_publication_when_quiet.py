"""Finite publication preparation after Q18's reserved interval."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).resolve().parent
OUT = Path('/private/tmp/q19-publication-driver-v1')
CHECKS = Path('/private/tmp/q19-publication-checks-v1')
ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator')
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
NPM = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/npm'
MEASURED = '2144c816efaec4005911e774288258c0ed25f77a'
OUT.mkdir()
paths = sorted(path for path in BASE.rglob('*') if path.is_file()
               and not any(part in {'__pycache__', 'retained-local-v1'} for part in path.relative_to(BASE).parts)
               and path.name != 'workspace.json'
               and path.suffix in {'.py', '.ts', '.mjs', '.json', '.log', '.md', '.txt'})


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    with path.open('x') as stream:
        stream.write(json.dumps(value, indent=2) + '\n')


pins = {str(path): digest(path) for path in paths}
save(OUT / 'before.json', dict(tools=pins, executionOrder='Wait for terminal Q18 gates/timing, prepare during Q11b captures/audits; if Q11b gate interval has already begun, wait for it to finish. No experiment rerun or threshold change.'))
try:
    prerequisite = Path('/private/tmp/q18-gates-driver-v1/complete.json')
    print('Q19 completed evidence publication preparation queued behind Q18 reserved gates/timing.', flush=True)
    while not prerequisite.exists():
        if (prerequisite.parent / 'failure.json').exists():
            raise RuntimeError('Q18 infrastructure failure: publication preparation has not started')
        time.sleep(15)
    assert json.loads(prerequisite.read_text())['passed']
    q11 = Path('/private/tmp/q11b-gates-v1')
    while q11.exists() and not Path('/private/tmp/q11b-gates-driver-v1/complete.json').exists():
        if Path('/private/tmp/q11b-gates-driver-v1/failure.json').exists():
            raise RuntimeError('Q11b gate infrastructure failed; quiet interval requires inspection')
        time.sleep(15)
    assert pins == {str(path): digest(path) for path in paths}
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    assert head == MEASURED
    assert subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=ROOT, text=True).strip() == ''
    measured = json.loads(Path('/private/tmp/q19-registered-fit-v1/before.json').read_text())
    CHECKS.mkdir()
    environment = os.environ.copy()
    environment['PATH'] = str(Path(NODE).parent) + ':' + environment['PATH']
    commands = [('whole-lint', [NPM, 'run', 'lint'])]
    results = []
    for label, command in commands:
        with (CHECKS / (label + '.log')).open('x') as log:
            result = subprocess.run(command, cwd=ROOT, env=environment, stdout=log, stderr=subprocess.STDOUT)
        results.append(dict(name=label, command=command, exitCode=result.returncode, logSha256=digest(CHECKS / (label + '.log'))))
        if result.returncode:
            save(CHECKS / 'failure.json', dict(results=results, scope='Required lint failed; no publication or package advancement.'))
            raise RuntimeError('Required whole-repository lint failed')
    for path, expected in measured['tracked'].items():
        file = ROOT / path
        assert file.stat().st_size == expected['bytes'] and digest(file) == expected['sha256'], path
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip() == head
    assert pins == {str(path): digest(path) for path in paths}
    save(CHECKS / 'complete.json', dict(passed=True, measuredCommit=head, results=results,
        scope='Required repository lint and unchanged measured tracked source. Other original gates are separately sealed.'))
    for label, command in [('package', ['python3', '-B', str(BASE / 'prepare_publication.py')]),
                           ('integrity', ['python3', '-B', str(BASE / 'verify-validation.py'), '--package', '/private/tmp/q19-publication-stage-v1', '--repo', str(ROOT), '--local-archive', str(BASE / 'retained-local-v1')])]:
        with (OUT / (label + '.log')).open('x') as log:
            result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
        if result.returncode:
            raise RuntimeError(label + ' failed; all partial artifacts retained')
    assert pins == {str(path): digest(path) for path in paths}
    save(OUT / 'complete.json', dict(passed=True, measuredCommit=head, inputs=pins,
        stage='/private/tmp/q19-publication-stage-v1', scope='Package ready for exact review/copy/commit; no PR automatically created.'))
    print('Q19 evidence package and required lint verified; ready for review and PR.', flush=True)
except Exception as error:
    save(OUT / 'failure.json', dict(error=str(error), type=type(error).__name__))
    raise
