"""Independently compare every complete public Word in the original policy scope."""
from pathlib import Path
from collections import Counter
import datetime, gzip, hashlib, json

OUT = Path('/private/tmp/q02-trace-history-performance-v2')
registration = json.loads((OUT / 'registration-with-capture.json').read_text())
capture = Path(registration['baselineCapture']['path'])
hashes = {role: hashlib.sha256() for role in ['baseline', 'candidate']}
counts, versions, histories = Counter(), Counter(), Counter()
rows = 0
with gzip.open(capture, 'rb') as baseline, gzip.open(OUT / 'candidate-policy-full-words.jsonl.gz', 'rb') as candidate:
    for original in baseline:
        actual = candidate.readline()
        assert original == actual, rows
        hashes['baseline'].update(original)
        hashes['candidate'].update(actual)
        record = json.loads(actual)
        assert record['seed'] == rows // 2 and record['policy'] == ('never' if rows % 2 else 'always')
        trace = record['word']['trace']
        versions[trace['baseSpelling']['version']] += 1
        counts[record['policy']] += sum(event['event'] == 'risingCodaBoundaryDrop' for event in trace['structural'])
        for name in ['writerSteps', 'timeline']:
            histories[name] += len(trace['baseSpelling']['shared'][name])
        rows += 1
    assert candidate.readline() == b''
assert rows == 8000 and dict(versions) == {4: 8000}
assert counts['always'] == 5 and counts['never'] == 0
assert dict(histories) == {'writerSteps': 576000, 'timeline': 842194}
for digest in hashes.values():
    assert digest.hexdigest() == registration['baselineCapture']['rawWordsSha256']
freeze = json.loads((OUT / 'source-freeze.json').read_text())
for role, pins in freeze.items():
    for pin in pins:
        path = OUT / role / pin['path']
        assert path.stat().st_size == pin['bytes'] and hashlib.sha256(path.read_bytes()).hexdigest() == pin['sha256']
initial = json.loads((OUT / 'initial-complete.json').read_text())
assert initial['terminal'] and initial['allCommandsPassed']
native = json.loads((OUT / 'candidate-policy-parity.json').read_text())
assert native['completePublicWords'] == rows and native['rawWordsSha256'] == hashes['candidate'].hexdigest()
report = {'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'completePublicWordsPerArm': rows,
          'allCompleteWordAndTraceBytesEqual': True, 'snapshotVersions': dict(versions), 'dropCounts': dict(counts),
          'completeHistoryEntries': dict(histories), 'decodedSha256': hashes['candidate'].hexdigest(),
          'all184SourceContextPinsPerArmStable': True, 'originalUnchanged60sGatePassed': True,
          'scope': 'Fulloriginal8000policycoordinates andcompleteWord/trace equality only; requiredfull200karchive/full80kpublictraceRNG/12paired originalpolicy timingrun andrepositorygates remainopen. Singlepassinggateisnotgeneralperformance orqualitygain proof.'}
with (OUT / 'independent-initial-complete.json').open('x') as handle:
    json.dump(report, handle, indent=2)
    handle.write('\n')
print(json.dumps(report))
