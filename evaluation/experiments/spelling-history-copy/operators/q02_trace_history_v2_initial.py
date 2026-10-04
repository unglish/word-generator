"""Run full original policy parity and unchanged timeout in a serial interval."""
from pathlib import Path
import datetime, hashlib, json, os, subprocess

ROOT = Path.cwd()
OUT = Path('/private/tmp/q02-trace-history-performance-v2')
AUDIT = ROOT / '.local-evidence/roadmap-completion-audit-v1'
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
LOADER = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
freeze = json.loads((OUT / 'source-freeze.json').read_text())
env = os.environ.copy()
env['PATH'] = str(Path(NODE).parent) + os.pathsep + env.get('PATH', '')
env.pop('CI', None)
env.pop('NODE_OPTIONS', None)

def stable():
    for role, pins in freeze.items():
        for pin in pins:
            path = OUT / role / pin['path']
            assert path.stat().st_size == pin['bytes'] and hashlib.sha256(path.read_bytes()).hexdigest() == pin['sha256']

commands = []
stable()
for name, args in [
    ('full8000-original-policy-parity', [NODE, '--import', LOADER, str(AUDIT / 'q02_trace_history_v2_policy_parity.mjs')]),
    ('unchanged-original-policy-gate', [NODE, str(OUT / 'candidate/node_modules/vitest/vitest.mjs'), 'run',
                                       'src/core/generate.test.ts', '-t', 'risingCodaDrop policy gates rising-coda drop events', '--reporter=verbose']),
]:
    record = {'name': name, 'args': args, 'cwd': str(OUT / 'candidate'),
              'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'CI': None, 'NODE_OPTIONS': None}
    with (OUT / (name + '.log')).open('xb') as handle:
        process = subprocess.run(args, cwd=OUT / 'candidate', env=env, stdout=handle, stderr=subprocess.STDOUT)
    record.update(exitCode=process.returncode, completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
    commands.append(record)
    (OUT / 'initial-commands.json').write_text(json.dumps(commands, indent=2) + '\n')
    stable()
report = {'terminal': True, 'commands': commands, 'allCommandsPassed': all(command['exitCode'] == 0 for command in commands),
          'allSourcePinsStableBeforeAfter': True,
          'scope': 'Original8000-word fullWord/trace parity and original60s gate only. Full200kactive archive/full80kpublictraceRNG suite/12paired originalpolicy timings and requiredrepositorygates remainpending. No general speed or quality gain claim.'}
with (OUT / 'initial-complete.json').open('x') as handle:
    json.dump(report, handle, indent=2)
    handle.write('\n')
print(json.dumps({'terminal': True, 'commandExitCodes': [command['exitCode'] for command in commands]}))
