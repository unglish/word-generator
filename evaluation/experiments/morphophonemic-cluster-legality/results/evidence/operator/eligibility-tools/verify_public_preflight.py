"""Check the public/verifier development preflight, separately from full acceptance."""
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import sys

from eligibility import Runtime
from recount_archive import pin, recount_candidate_word

assert __debug__, 'Do not run with Python -O'
assert len(sys.argv) == 3, 'Provide public preflight directory and fresh report path'
source, output = map(Path, sys.argv[1:])
assert not output.exists()
seal = json.loads((source / 'complete.json').read_bytes())
before = json.loads((source / 'before.json').read_bytes())
assert seal['passed'] is True and seal['words'] == 400 and seal['streams'] == 40
assert seal['after'] == before
records = source / 'records.json.gz'
assert pin(records) == seal['records']
tools = Path(__file__).parent
names = ['eligibility.py', 'recount_archive.py', 'lineage_recount.py', 'collisions.py']
model_pins = {name: pin(tools / name) for name in names}
for name, record in model_pins.items():
    assert record == before['files']['evaluation/experiments/morphophonemic-cluster-legality/independent/' + name]
data = json.loads(gzip.decompress(records.read_bytes()))
assert len(data['rows']) == 400 and len(data['streams']) == 40
runtimes = {policy: Runtime(config) for policy, config in data['configurations'].items()}
assert set(runtimes) == {'default', 'active'}
profiles = {p['id']: p for p in data['profiles']}
assert len(profiles) == 4
expected_streams = {(policy, p['id'], seed) for policy in runtimes for p in data['profiles']
                    for seed in p['seeds']['development']}
assert len(expected_streams) == 40
groups, counters = {}, Counter()
for row in data['rows']:
    key = (row['policy'], row['profile'], row['seed'])
    assert key in expected_streams
    indices = groups.setdefault(key, [])
    assert row['drawIndex'] == len(indices)
    indices.append(row['drawIndex'])
    counts, _ = recount_candidate_word(row['word'], runtimes[row['policy']], profiles[row['profile']]['options']['morphology'])
    counters.update(counts)
assert set(groups) == expected_streams and all(len(indices) == 10 for indices in groups.values())
assert counters['words'] == counters['morphologyCensus/words'] == 400
assert counters['eligibility/words/profile-disabled'] == 200
assert pin(records) == seal['records']
assert {name: pin(tools / name) for name in names} == model_pins
report = {'passed': True, 'words': 400, 'streams': 40, 'commit': before['commit'],
          'counts': dict(sorted(counters.items())), 'records': seal['records'], 'modelPins': model_pins,
          'sourceSealSha256': hashlib.sha256((source / 'complete.json').read_bytes()).hexdigest(),
          'scope': 'All public preflight words independently reconstructed with the committed candidate model. Ten words/stream is development verification only; full 400000-word candidate acceptance remains required.'}
with output.open('x') as stream:
    json.dump(report, stream, indent=2)
    stream.write('\n')
print(json.dumps({'passed': True, 'words': 400, 'streams': 40, 'counts': {
    k: v for k, v in counters.items() if k.startswith('eligibility/words/') or k.startswith('eligibility/outcome/')}}))
