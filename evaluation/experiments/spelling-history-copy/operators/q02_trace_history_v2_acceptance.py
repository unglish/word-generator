"""Run unchanged registered acceptance scopes serially after the initial proof."""
from pathlib import Path
import datetime, hashlib, json, os, subprocess, sys

root = Path.cwd()
out = Path('/private/tmp/q02-trace-history-performance-v2')
audit = root / '.local-evidence/roadmap-completion-audit-v1'
registration = json.loads((out / 'acceptance-chain-registration.json').read_text())
assert json.loads((out / 'independent-initial-complete.json').read_text())['allCompleteWordAndTraceBytesEqual']
initial = json.loads((root / '.local-evidence/q02-trace-history-initial-complete-v2.json').read_text())
assert initial['terminal'] and initial['initialPolicyScopePassed']
records = []

def stable():
    for row in registration['operatorAndInputPins']:
        raw = Path(row['path']).read_bytes()
        assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']

def save(name, value):
    target = out / name
    temporary = target.with_suffix('.new')
    with temporary.open('w') as handle:
        json.dump(value, handle, indent=2)
        handle.write('\n')
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, target)

try:
    for stage in registration['stages']:
        stable()
        record = {'name': stage, 'args': [sys.executable, '-B', str(audit / stage)],
                  'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
        with (out / (stage + '.log')).open('xb') as log:
            process = subprocess.Popen(record['args'], cwd=root, stdout=log, stderr=subprocess.STDOUT)
            save('acceptance-chain-stage.json', {'terminal': False, 'activeCommand': record,
                 'activePid': process.pid, 'commandsCompleted': len(records)})
            record['exitCode'] = process.wait()
        record['completedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        records.append(record)
        save('acceptance-chain-commands.json', records)
        stable()
        assert record['exitCode'] == 0, stage
    save('acceptance-chain-complete.json', {'terminal': True, 'commands': records,
         'scope': 'Registered original scopes executed; inspect numerical and repository failures before any acceptance or publication claim.'})
    save('acceptance-chain-stage.json', {'terminal': True, 'commandsCompleted': len(records)})
except Exception as error:
    save('acceptance-chain-failure.json', {'terminal': True, 'error': str(error), 'commands': records})
    save('acceptance-chain-stage.json', {'terminal': True, 'failed': True, 'commandsCompleted': len(records)})
    raise
