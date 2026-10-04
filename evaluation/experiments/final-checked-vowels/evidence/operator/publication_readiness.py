"""Check evidence completeness, without interpreting failed gates as success."""
import json
from pathlib import Path

BASE = Path(__file__).parent
pending = []
stages = {}

def completion(name, directory):
    path = Path(directory) / 'complete.json'
    if not path.exists():
        pending.append(name)
        stages[name] = {'complete': False}
        return None
    value = json.loads(path.read_text())
    stages[name] = {'complete': True, 'path': str(path)}
    return value

audit = completion('fullCorpusAudit', '/private/tmp/q10b2-audit-v3')
if audit:
    assert audit['passed'] is True and audit['words'] == 800000
    assert len(audit['results']) == 8
    assert all(row['exitCode'] == 0 for row in audit['results'])
    for arm in ['fixed-control', 'configured-final-vowel-contract']:
        for policy in ['default', 'active']:
            agreement = json.loads(Path(f'/private/tmp/q10b2-audit-v3/{arm}-{policy}-agreement.json').read_text())
            assert agreement['passed'] is True and agreement['words'] == 200000
            assert agreement['disagreements'] == 0

checks = completion('unchangedGates', '/private/tmp/q10b2-checks-v2')
if checks:
    expected = [(stage, arm) for stage in ['full', 'default-quality', 'active-quality', 'default-perf'] for arm in ['control', 'candidate']]
    assert [(row['stage'], row['arm']) for row in checks['results']] == expected
    stages['unchangedGates']['nonzeroOutcomes'] = [row for row in checks['results'] if row['exitCode'] != 0]

timing = completion('registeredTiming', '/private/tmp/q10b2-performance-v2')
if timing:
    plan = json.loads((BASE / 'timing-registration.json').read_text())
    expected = [(policy, slot, arm) for policy in plan['policies'] for slot, arm in enumerate(plan['orderPerPolicy'], 1)]
    assert [(row['policy'], row['slot'], row['arm']) for row in timing['results']] == expected
    assert len(expected) == 24 and all(row['exitCode'] == 0 for row in timing['results'])
    assert timing['plan'] == plan

diagnostics = completion('originalSizeDiagnostics', '/private/tmp/q10b2-diagnostics-v2')
if diagnostics:
    expected = [(arm, stage) for arm in ['control', 'candidate'] for stage in ['compile', 'trigrams', 'trace']]
    assert [(row['arm'], row['stage']) for row in diagnostics['results']] == expected
    stages['originalSizeDiagnostics']['nonzeroOutcomes'] = [row for row in diagnostics['results'] if row['exitCode'] != 0]

for name, path in [('traceParity', '/private/tmp/q10b2-registered-trace-parity.json'), ('witnessVerification', '/private/tmp/q10b2-witnesses-v1/verification.json')]:
    value = json.loads(Path(path).read_text())
    assert value['passed'] is True
    stages[name] = {'complete': True, 'path': path}

report = {'evidenceStagesComplete': not pending, 'pending': pending, 'stages': stages,
          'scope': 'Completeness of terminal evidence only. Gate failures remain failures; source equivalence, artifact indexing, final report review and PR publication require separate checks.'}
(BASE / 'publication-readiness.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'evidenceStagesComplete': not pending, 'pending': pending}))
