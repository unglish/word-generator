"""Run full registered preservation scopes and original repository commands."""
from pathlib import Path
import datetime, hashlib, json, os, subprocess

ROOT = Path.cwd()
OUT = Path('/private/tmp/q02-trace-history-performance-v2')
AUDIT = ROOT / '.local-evidence/roadmap-completion-audit-v1'
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
NPM = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/lib/node_modules/npm/bin/npm-cli.js'
PYTHON = '/Users/ryanbetts/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
LOADER = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
registration = json.loads((OUT / 'broader-registration.json').read_text())
freeze = json.loads((OUT / 'source-freeze.json').read_text())
assert json.loads((OUT / 'paired-gates-complete.json').read_text())['allCandidateGatesPassed']
assert json.loads((OUT / 'paired-gates-independent.json').read_text())['candidatePasses'] == 6
env = os.environ.copy()
env['PATH'] = str(Path(NODE).parent) + os.pathsep + env.get('PATH', '')
env.pop('CI', None)
env.pop('NODE_OPTIONS', None)
commands = []

def pin(path):
    return {'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

def stable():
    for role, pins in freeze.items():
        for entry in pins:
            assert pin(OUT / role / entry['path']) == {key: entry[key] for key in ['bytes', 'sha256']}
    for entry in registration['operatorAndInputPins']:
        assert pin(Path(entry['path'])) == {key: entry[key] for key in ['bytes', 'sha256']}

def save(name, report):
    temporary = OUT / (name + '.new')
    with temporary.open('x') as handle:
        json.dump(report, handle, indent=2)
        handle.write('\n')
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, OUT / name)

def run(name, args, cwd=OUT, required=True):
    stable()
    record = {'name': name, 'args': args, 'cwd': str(cwd),
              'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'CI': None, 'NODE_OPTIONS': None}
    save('broader-stage.json', {'terminal': False, 'activeCommand': record, 'commandsCompleted': len(commands)})
    print(json.dumps({'starting': name}), flush=True)
    with (OUT / (name + '.log')).open('xb') as handle:
        process = subprocess.run(args, cwd=cwd, env=env, stdout=handle, stderr=subprocess.STDOUT)
    record.update(exitCode=process.returncode, completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
    commands.append(record)
    save('broader-commands.json', commands)
    stable()
    print(json.dumps({'completed': name, 'exitCode': process.returncode}), flush=True)
    if required:
        assert process.returncode == 0, name

try:
    run('complete80k-public-trace-rng', [NODE, '--import', LOADER, str(AUDIT / 'q02_trace_history_v2_parity.mjs')])
    run('independent-complete80k-trace-rng-recount', [PYTHON, '-B', str(AUDIT / 'q02_trace_history_v2_parity_recount.py')])
    run('complete200k-active-public-word-archive', [NODE, '--import', LOADER, str(AUDIT / 'q02_trace_history_v2_archive.mjs')])
    run('independent-complete200k-active-recount', [PYTHON, '-B', str(AUDIT / 'q02_trace_history_v2_archive_recount.py')])
    for command, script in [('unit', 'test'), ('quality', 'test:quality'), ('performance', 'test:perf')]:
        for role in ['baseline', 'candidate']:
            run(f'{role}-required-{command}', [NODE, NPM, 'test'] if script == 'test' else [NODE, NPM, 'run', script],
                cwd=OUT / role, required=False)
    stable()
    gates = [command for command in commands if '-required-' in command['name']]
    report = {'terminal': True, 'commands': commands, 'preservationCommandsPassed': True,
              'repositoryGateCommands': len(gates), 'repositoryGateFailures': sum(command['exitCode'] != 0 for command in gates),
              'allRepositoryGatesPassed': all(command['exitCode'] == 0 for command in gates),
              'allSourceOperatorAndInputPinsStable': True,
              'scope': 'Fulloriginal80kpublictrace/RNG/defaultactive and200kactiveWord preservation, plusoriginalnpmtest/quality/performance commands onbotharms. Allfailures retained; repositoryoutcomes requirecausalreconciliation. HistoricalQ02activequalityfailures remainseparate unresolvedadoption evidence; no currentmain/fullgoal/qualitygain claim.'}
    save('broader-complete.json', report)
    save('broader-stage.json', {'terminal': True, 'commandsCompleted': len(commands)})
    print(json.dumps({'terminal': True, 'commandsCompleted': len(commands), 'repositoryGateFailures': report['repositoryGateFailures']}), flush=True)
except Exception as error:
    save('broader-failure.json', {'terminal': True, 'type': type(error).__name__, 'error': str(error), 'commands': commands})
    save('broader-stage.json', {'terminal': True, 'failed': True, 'commandsCompleted': len(commands)})
    raise
