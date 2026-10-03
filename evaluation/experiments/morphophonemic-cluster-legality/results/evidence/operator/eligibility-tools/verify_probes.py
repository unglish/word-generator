import copy
import hashlib
import json
from pathlib import Path
import sys
from eligibility import Runtime, evaluate

source = Path('/private/tmp/q11b-eligibility-probes-v1/probes.json')
seal = json.loads((source.parent / 'complete.json').read_text())
assert seal['passed'] is True
raw = source.read_bytes()
assert {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()} == seal['probes']
rows = json.loads(raw)['cases']
assert len(rows) == seal['cases'] == 25
for row in rows:
    runtime = Runtime(row['configuration'])
    reference = row['replacementReference']
    if reference['kind'] == 'inventory':
        assert 0 <= reference['index'] < len(row['configuration']['phonemes'])
        inventory = row['configuration']['phonemes']
        assert inventory[reference['index']] == row['replacement']
        canonical_index = max(i for i, phone in enumerate(inventory) if phone['sound'] == row['replacement']['sound'])
        identity = reference['index'] == canonical_index
    else:
        assert reference['kind'] == 'external-copy'
        identity = False
    original = copy.deepcopy(row['root'])
    actual = evaluate(runtime, row['root'], row['target'], row['replacement'], row['prefix'], row['suffix'], canonical_identity=identity)
    assert row['root'] == original, row['id']
    if actual != row['result']:
        Path('/private/tmp/q11b-eligibility-probes-mismatch-v1.json').write_text(json.dumps({'case': row['id'], 'expected': row['result'], 'actual': actual}, indent=2) + '\n')
        raise AssertionError(row['id'])
    print(row['id'] + ': complete decision/evidence agrees')
print(json.dumps({'passed': True, 'cases': len(rows), 'inputSha256': hashlib.sha256(raw).hexdigest()}))
