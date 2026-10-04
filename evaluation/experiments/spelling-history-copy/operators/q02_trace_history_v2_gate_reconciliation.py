"""Reconcile actual Vitest failure sections, excluding diagnostic stdout."""
from pathlib import Path
import hashlib, json, re

root = Path.cwd()
out = Path('/private/tmp/q02-trace-history-performance-v2')
native = json.loads((out / 'broader-complete.json').read_text())
assert native['terminal'] and native['repositoryGateCommands'] == native['repositoryGateFailures'] == 6
failures, policy, throughput, logs = {}, {}, {}, []
for role in ['baseline', 'candidate']:
    path = out / (role + '-required-unit.log')
    text = path.read_text()
    # A phonotactic diagnostic prints its own FAIL line before Vitest's summary.
    # Count only the authoritative Failed Tests section.
    section = re.split(r'Failed Tests \d+', text)[-1]
    failures[role] = re.findall(r'^ FAIL  (.+)$', section, re.M)
    assert len(failures[role]) == 8
    policy[role] = int(re.findall(r'risingCodaDrop policy gates rising-coda drop events (\d+)ms', text)[0])
    performance = out / (role + '-required-performance.log')
    throughput[role] = int(re.findall(r'Performance: (\d+) words/sec', performance.read_text())[0])
    for name in ['unit', 'quality', 'performance']:
        p = out / (role + '-required-' + name + '.log')
        raw = p.read_bytes()
        logs.append({'path': str(p), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
assert sorted(failures['baseline']) == sorted(failures['candidate'])
paired = json.loads((out / 'paired-gates-independent.json').read_text())
report = {'terminal': True, 'allSixOriginalGateCommandsRetained': True, 'allSixCommandsFailed': True,
          'unitFailureTitles': failures, 'sameUnitFailureTitles': True,
          'unitPolicyMilliseconds': policy, 'isolatedCandidatePolicyPasses': paired['candidatePasses'],
          'isolatedBaselineTimeouts': paired['baselineTimeoutFailures'],
          'medianIsolatedPairedElapsedFractionChange': paired['medianPairedElapsedFractionChange'],
          'defaultPerformanceWordsPerSecond': throughput, 'requiredPerformanceFloor': 4500, 'logs': logs,
          'priorParserFailure': 'An initial all-stdout FAIL search counted a diagnostic line in addition to eight actual Vitest failures; assertion rejected it. No source or scientific result changed.',
          'scope': 'Isolated trace-heavy policy gain proven; full-suite timeout and all default gates remain failed. Single default throughput observations do not establish a stable effect. No adoption or full Q02 timeout resolution claim.'}
(root / '.local-evidence/q02-trace-history-gate-reconciliation-v2.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'sameEightUnitFailures': True, 'unitPolicyMilliseconds': policy,
                  'isolatedTimingGain': paired['medianPairedElapsedFractionChange']}))
