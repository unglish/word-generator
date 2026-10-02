"""Check all registered aggregate and replicate integer maps without generator imports."""
import hashlib
import json
from pathlib import Path

local = Path(__file__).resolve().parent
results = Path('/private/tmp/q02-final-audit-v2')


def read(path):
    raw = path.read_bytes()
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def compare(a, b):
    assert a.keys() == b.keys(), 'Different counter names'
    count = 0
    for name, value in a.items():
        assert type(value) is int and type(b[name]) is int, name
        assert value == b[name], (name, value, b[name])
        count += 1
    return count


report = {'arms': {}, 'independentCounterDisagreements': 0}
for arm in ('control', 'candidate'):
    production_path = local / 'q02-control-production-counts.json' if arm == 'control' else results / 'candidate-production.json'
    production, production_hash = read(production_path)
    independent, independent_hash = read(results / (arm + '-independent.json'))
    for key in ('manifestSha256', 'registrationSha256', 'protocolSha256'):
        assert production[key] == independent[key], key
    assert production['counts']['words'] == independent['counts']['words'] == 200000
    leaves = compare(production['counts'], independent['counts'])
    assert production['replicates'].keys() == independent['replicates'].keys()
    assert len(production['replicates']) == 20
    for name, values in production['replicates'].items():
        assert values['words'] == 10000
        leaves += compare(values, independent['replicates'][name])
    if arm == 'candidate':
        assert production['counts'].get('missingFinalEvidence', 0) == 0
        assert production['configuredOperationReplayFailures'] == production['sourceBindingFailures'] == 0
    else:
        assert production['counts']['missingFinalEvidence'] == 200000
        assert production['configuredOperationReplayFailures'] is None
        assert production['sourceBindingFailures'] is None
    report['arms'][arm] = dict(words=200000, replicates=20, integerComparisons=leaves,
        productionSha256=production_hash, independentSha256=independent_hash,
        manifestSha256=production['manifestSha256'])
report['scope'] = 'Every aggregate and replicate integer map agrees. Production configured replay and independent structural/count replay remain distinct claims. Control final evidence is unavailable.'
with (results / 'counter-agreement.json').open('x') as output:
    json.dump(report, output, indent=2)
    output.write('\n')
print(json.dumps(report), flush=True)
