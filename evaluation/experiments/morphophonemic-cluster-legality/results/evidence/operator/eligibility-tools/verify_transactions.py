import copy
import hashlib
import json
from pathlib import Path
from eligibility import Runtime, verify_preparation

source = Path('/private/tmp/q11b-transaction-probes-v2/probes.json')
seal = json.loads((source.parent / 'complete.json').read_text())
assert seal['passed'] is True
raw = source.read_bytes()
assert {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()} == seal['probes']
rows = json.loads(raw)['cases']
assert len(rows) == seal['cases'] == 14
reports = []
for row in rows:
    runtime = Runtime(row['configuration'])
    result = verify_preparation(row['word'], runtime)
    assert result['available'] is True
    assert row['draws'] == len(row['word']['trace']['morphologyPreparation']['rolls'])
    reports.append({'id': row['id'], 'outcomes': [p['outcome'] for p in result['evaluations']], 'changes': len(result['acceptedChanges'])})
    print(row['id'] + ': full transaction/owned assembly/written inclusion agrees')

base = next(row for row in rows if row['id'] == 'atomic-rejection')
accepted = next(row for row in rows if row['id'] == 'accepted-softening')
corruptions = {
    'missing-initial-coordinate': lambda word: word['trace']['morphologyPreparation']['phonesBefore']['final'].pop(),
    'unexplained-draw': lambda word: word['trace']['morphologyPreparation']['rolls'].append(0.5),
    'duplicate-identity': lambda word: word['trace']['morphologyPreparation']['phonesAfter']['initial'].append(copy.deepcopy(word['trace']['morphologyPreparation']['phonesAfter']['initial'][0])),
    'forged-outcome': lambda word: word['trace']['morphologyPreparation']['prepared']['evaluations'][0].update(outcome='accepted'),
    'forged-target': lambda word: word['trace']['morphologyPreparation']['prepared']['evaluations'][0]['target'].update(index=99),
    'erased-reasons': lambda word: word['trace']['morphologyPreparation']['prepared']['evaluations'][0]['guard'].update(rejections=[]),
    'forged-affix-index': lambda word: word['trace']['morphologyPreparation']['prepared']['evaluations'][0].update(affixIndex=99),
    'forged-selected-form': lambda word: word['trace']['morphologyPreparation']['prepared']['suffix']['resolved'].update(written='forged'),
    'forged-owner': lambda word: word['trace']['morphologyPreparation']['phonesAfter']['initial'][0]['source'].update(part='suffix'),
    'scheduled-rejected-rule': lambda word: word['trace']['morphologyPreparation']['prepared']['rules'].append({'ruleIndex': 0, 'boundary': 'root-suffix', 'rule': 'soften'}),
}
for name, mutate in corruptions.items():
    word = copy.deepcopy(base['word']); mutate(word)
    try:
        verify_preparation(word, Runtime(base['configuration']))
    except (AssertionError, KeyError, IndexError):
        print(name + ': rejected')
    else:
        raise AssertionError('Corruption accepted: ' + name)
for name, mutate in {
    'erased-accepted-ledger-change': lambda word: word['trace']['morphologyPreparation']['phonesAfter'].update(changes=[]),
    'erased-written-half': lambda word: word['trace']['morphology']['realization'].update(rootEdits=[]),
    'forged-written-output': lambda word: word['trace']['morphology']['realization']['rootEdits'][0].update(after='forged'),
}.items():
    word = copy.deepcopy(accepted['word']); mutate(word)
    try:
        verify_preparation(word, Runtime(accepted['configuration']))
    except (AssertionError, KeyError, IndexError):
        print(name + ': rejected')
    else:
        raise AssertionError('Corruption accepted: ' + name)
result = {'passed': True, 'fixtures': len(rows), 'corruptionCases': len(corruptions) + 3, 'reports': reports,
    'scope': 'Independent configured rule/allomorph/guard/ledger/owned assembly/written-half reconstruction preflight. Does not certify corpus frequencies or public generation.'}
Path('/private/tmp/q11b-transaction-oracle-preflight-v2.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'passed': True, 'fixtures': len(rows), 'corruptionCases': len(corruptions) + 3}))
