"""Independently recount every registered timing, retaining all outcomes."""
from pathlib import Path
import hashlib, json, re, statistics

out = Path('/private/tmp/q02-trace-history-performance-v2')
native_path = out / 'paired-gates-complete.json'
native = json.loads(native_path.read_text())
registration = json.loads((out / 'paired-gate-registration.json').read_text())
assert native['terminal'] and native['completedRuns'] == 12
assert [row['role'] for row in native['records']] == registration['registeredOrder']
rows = []
for row in native['records']:
    path = out / f"paired-{row['slot']:02d}-{row['role']}.log"
    raw = path.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == row['logSha256']
    text = raw.decode()
    matches = re.findall(r'risingCodaDrop policy gates rising-coda drop events (\d+)ms', text)
    assert len(matches) == 1
    elapsed = int(matches[0])
    assert elapsed == row['reportedTestMilliseconds']
    assert row['CI'] is None and row['NODE_OPTIONS'] is None
    passed = 'Tests  1 passed | 12 skipped (13)' in text
    failed = 'Tests  1 failed | 12 skipped (13)' in text
    assert passed != failed and passed == (row['exitCode'] == 0)
    rows.append({'slot': row['slot'], 'role': row['role'], 'milliseconds': elapsed,
                 'passed': passed, 'timeout': 'Test timed out in 60000ms.' in text})
pairs = []
for index in range(0, 12, 2):
    arms = {row['role']: row for row in rows[index:index + 2]}
    baseline, candidate = arms['baseline']['milliseconds'], arms['candidate']['milliseconds']
    pairs.append({'pair': index // 2 + 1, 'baselineMilliseconds': baseline,
                  'candidateMilliseconds': candidate, 'elapsedFractionChange': candidate / baseline - 1})
median = statistics.median(row['elapsedFractionChange'] for row in pairs)
assert median == native['medianPairedElapsedFractionChange']
freeze_path = out / 'source-freeze.json'
assert hashlib.sha256(freeze_path.read_bytes()).hexdigest() == registration['sourceFreezeSha256']
for role, pins in json.loads(freeze_path.read_text()).items():
    for pin in pins:
        raw = (out / role / pin['path']).read_bytes()
        assert len(raw) == pin['bytes'] and hashlib.sha256(raw).hexdigest() == pin['sha256']
operator = Path(__file__).with_name('q02_trace_history_v2_paired_gates.py')
assert hashlib.sha256(operator.read_bytes()).hexdigest() == registration['operatorSha256']
report = {'terminal': True, 'all12OriginalLogsAuthenticated': True,
          'candidatePasses': sum(row['passed'] for row in rows if row['role'] == 'candidate'),
          'baselineTimeoutFailures': sum(row['timeout'] and not row['passed'] for row in rows if row['role'] == 'baseline'),
          'medianPairedElapsedFractionChange': median, 'pairs': pairs, 'observations': rows,
          'nativeReportSha256': hashlib.sha256(native_path.read_bytes()).hexdigest(),
          'allSourceContextPinsStable': True}
with (out / 'paired-gates-independent.json').open('x') as handle:
    json.dump(report, handle, indent=2)
    handle.write('\n')
print(json.dumps(report))
