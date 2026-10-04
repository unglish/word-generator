"""Run all twelve registered unchanged original policy gates without overlap."""
from pathlib import Path
import datetime, hashlib, json, os, re, statistics, subprocess

OUT = Path('/private/tmp/q02-trace-history-performance-v2')
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
registration = json.loads((OUT / 'registration.json').read_text())
freeze = json.loads((OUT / 'source-freeze.json').read_text())
assert json.loads((OUT / 'independent-initial-complete.json').read_text())['allCompleteWordAndTraceBytesEqual']
order = registration['acceptance']['pairedOrder']
assert order == ['baseline', 'candidate', 'candidate', 'baseline', 'baseline', 'candidate',
                 'candidate', 'baseline', 'baseline', 'candidate', 'candidate', 'baseline']
env = os.environ.copy()
env['PATH'] = str(Path(NODE).parent) + os.pathsep + env.get('PATH', '')
env.pop('CI', None)
env.pop('NODE_OPTIONS', None)

def stable():
    for role, pins in freeze.items():
        for pin in pins:
            path = OUT / role / pin['path']
            assert path.stat().st_size == pin['bytes'] and hashlib.sha256(path.read_bytes()).hexdigest() == pin['sha256']

records = []
stable()
for index, role in enumerate(order, 1):
    repo = OUT / role
    args = [NODE, str(repo / 'node_modules/vitest/vitest.mjs'), 'run', 'src/core/generate.test.ts',
            '-t', 'risingCodaDrop policy gates rising-coda drop events', '--reporter=verbose']
    path = OUT / f'paired-{index:02d}-{role}.log'
    record = {'slot': index, 'pair': (index - 1) // 2 + 1, 'role': role, 'args': args, 'cwd': str(repo),
              'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'CI': None, 'NODE_OPTIONS': None}
    print(json.dumps({'starting': index, 'role': role}), flush=True)
    with path.open('xb') as handle:
        process = subprocess.run(args, cwd=repo, env=env, stdout=handle, stderr=subprocess.STDOUT)
    record.update(exitCode=process.returncode, completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
    matches = re.findall(r'risingCodaDrop policy gates rising-coda drop events (\d+)ms', path.read_text())
    record['reportedTestMilliseconds'] = int(matches[0]) if len(matches) == 1 else None
    record['logSha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    records.append(record)
    (OUT / 'paired-gate-commands.json').write_text(json.dumps(records, indent=2) + '\n')
    stable()
    print(json.dumps({'completed': index, 'role': role, 'exitCode': process.returncode,
                      'reportedTestMilliseconds': record['reportedTestMilliseconds']}), flush=True)
pairs = []
for offset in range(0, len(records), 2):
    arms = {record['role']: record for record in records[offset:offset + 2]}
    baseline = arms['baseline']['reportedTestMilliseconds']
    candidate = arms['candidate']['reportedTestMilliseconds']
    pairs.append({'pair': offset // 2 + 1, 'baselineMilliseconds': baseline, 'candidateMilliseconds': candidate,
                  'baselineExitCode': arms['baseline']['exitCode'], 'candidateExitCode': arms['candidate']['exitCode'],
                  'elapsedFractionChange': candidate / baseline - 1 if baseline and candidate is not None else None})
valid = [pair['elapsedFractionChange'] for pair in pairs if pair['elapsedFractionChange'] is not None]
report = {'terminal': True, 'registeredRuns': 12, 'completedRuns': len(records), 'records': records, 'pairs': pairs,
          'allCandidateGatesPassed': all(record['exitCode'] == 0 for record in records if record['role'] == 'candidate'),
          'all12ReportedTimingsAvailable': len(valid) == 6,
          'medianPairedElapsedFractionChange': statistics.median(valid) if len(valid) == 6 else None,
          'allSourcePinsStableBeforeAfter': True,
          'scope': 'Sixregisteredpairs ofexactoriginal8000-word policytest atunchanged60s limit, fixedcounterbalancedorder andsameenvironment; everyfailure retained. ReportedVitesttestduration includesrunnerinteraction andisnotuniversal throughput oroutputquality gain. Full200kactivearchive/full80kpublictraceRNGandrequiredrepositorygates remainopen.'}
with (OUT / 'paired-gates-complete.json').open('x') as handle:
    json.dump(report, handle, indent=2)
    handle.write('\n')
print(json.dumps({'terminal': True, 'completedRuns': len(records), 'allCandidateGatesPassed': report['allCandidateGatesPassed'],
                  'medianPairedElapsedFractionChange': report['medianPairedElapsedFractionChange']}), flush=True)
