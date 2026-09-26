from pathlib import Path
import datetime, hashlib, json, platform, subprocess

ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator')
CONTROL = Path('/private/tmp/q09-observer-control.e87Jz5')
DEFINITIONS = ['vitest.perf.config.ts', 'src/core/generate.perf.test.ts', 'package.json', 'package-lock.json']
sha = lambda data: hashlib.sha256(data).hexdigest()
def verify(root, parity):
    for path, digest in parity['sources'].items():
        assert sha((root / path).read_bytes()) == digest, path

definitions = {path: sha((CONTROL / path).read_bytes()) for path in DEFINITIONS}
assert definitions == {path: sha((ROOT / path).read_bytes()) for path in DEFINITIONS}
report = {'schemaVersion': 1, 'design': 'One unchanged control-first then candidate interval; no repeats, unchanged thresholds; normal desktop activity not controlled.', 'orderedModes': ['control', 'candidate'], 'definitionHashes': definitions, 'platform': platform.platform(), 'node': subprocess.check_output(['node', '--version'], text=True).strip(), 'cpu': subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string'], text=True).strip(), 'runs': []}
for mode, root in [('control', CONTROL), ('candidate', ROOT)]:
    parity = json.loads(Path(f'/private/tmp/q09-observer-{mode}-parity.json').read_text())
    verify(root, parity)
    log = Path(f'/private/tmp/q09-observer-perf-{mode}.log')
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with log.open('x') as output:
        result = subprocess.run(['npm', 'run', 'test:perf'], cwd=root, stdout=output, stderr=subprocess.STDOUT)
    ended = datetime.datetime.now(datetime.timezone.utc).isoformat()
    verify(root, parity)
    assert definitions == {path: sha((root / path).read_bytes()) for path in DEFINITIONS}
    report['runs'].append({'mode': mode, 'cwd': str(root), 'commit': parity['reference'], 'sourceDigest': parity['sourceDigest'], 'command': ['npm', 'run', 'test:perf'], 'started': started, 'ended': ended, 'exitCode': result.returncode, 'logSha256': sha(log.read_bytes()), 'sourceAndDefinitionsUnchanged': True})
    print(json.dumps(report['runs'][-1]), flush=True)
report['runnerSha256'] = sha(Path(__file__).read_bytes())
with Path('/private/tmp/q09-observer-performance.json').open('x') as output:
    json.dump(report, output, indent=2); output.write('\n')
