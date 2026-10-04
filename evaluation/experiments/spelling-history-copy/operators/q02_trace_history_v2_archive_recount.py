"""Independently compare all 200,000 original and newly generated active Words."""
from pathlib import Path
import datetime, gzip, hashlib, json

OUT = Path('/private/tmp/q02-trace-history-performance-v2')
registration = json.loads((OUT / 'archive-registration.json').read_text())
native = json.loads((OUT / 'active-archive-complete.json').read_text())
assert native['terminal'] and native['passed'] and native['publicWords'] == 200000
assert native['registrationSha256'] == hashlib.sha256((OUT / 'archive-registration.json').read_bytes()).hexdigest()
archive = Path(registration['archive'])
manifest_bytes = (archive / 'manifest.json').read_bytes()
assert hashlib.sha256(manifest_bytes).hexdigest() == registration['manifestSha256']
manifest = json.loads(manifest_bytes)['manifest']
protocol = json.loads((OUT / 'protocol.json').read_text())
assert manifest['protocol'] == protocol and protocol['wordsPerReplicate'] == 10000

def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1048576), b''):
            result.update(block)
    return result.hexdigest()

def unique_object(pairs):
    result = {}
    for key, value in pairs:
        assert key not in result, key
        result[key] = value
    return result

total = 0
strata = []
for profile in protocol['profiles']:
    assert len(profile['seeds']['development']) == 5
    for seed in profile['seeds']['development']:
        relative = f"words/{profile['id']}-{seed}.jsonl.gz"
        matches = [row for row in native['strata'] if row['output'] == relative]
        artifacts = [row for row in manifest['artifacts'] if row['file'] == relative]
        assert len(matches) == len(artifacts) == 1
        summary, artifact = matches[0], artifacts[0]
        original, actual = archive / relative, OUT / 'active-archive' / relative
        assert original.stat().st_size == artifact['bytes'] and digest(original) == artifact['sha256']
        assert actual.stat().st_size == summary['outputBytes'] and digest(actual) == summary['outputSha256']
        raw = hashlib.sha256()
        index = 0
        with gzip.open(original, 'rb') as baseline, gzip.open(actual, 'rb') as candidate:
            for line in baseline:
                produced = candidate.readline()
                assert line == produced, (profile['id'], seed, index)
                row = json.loads(produced, object_pairs_hook=unique_object)
                assert (row['profile'], row['seed'], row['drawIndex']) == (profile['id'], seed, index)
                word = row['word']
                assert word['trace']['baseSpelling']['version'] == 5
                assert word['trace']['finalWord']['spelling']['surface'] == word['written']['clean']
                raw.update(produced)
                index += 1
            assert candidate.readline() == b''
        assert index == summary['words'] == 10000
        assert raw.hexdigest() == summary['rawSha256']
        total += index
        strata.append({'profile': profile['id'], 'seed': seed, 'completeWords': index, 'rawSha256': raw.hexdigest()})
        print(json.dumps({'profile': profile['id'], 'seed': seed, 'completeWords': total}), flush=True)
assert total == 200000 and len(strata) == 20
freeze = json.loads((OUT / 'source-freeze.json').read_text())
for role, pins in freeze.items():
    for pin in pins:
        path = OUT / role / pin['path']
        assert path.stat().st_size == pin['bytes'] and digest(path) == pin['sha256']
assert digest(OUT / 'source-freeze.json') == registration['sourceFreezeSha256']
for pin in registration['contextPins']:
    path = Path(pin['path'])
    assert path.stat().st_size == pin['bytes'] and digest(path) == pin['sha256']
report = {'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'passed': True,
          'completePairedPublicWords': total, 'allCompleteWordAndTraceBytesEqual': True,
          'finalSpellingSurfaceEqualsPublicOutputEveryWord': True, 'all20NativeStreamHashesReconstructed': True,
          'allOriginalAndNewCompressedShardsAuthenticated': True, 'allSourceContextPinsStable': True,
          'strata': strata, 'nativeReportSha256': digest(OUT / 'active-archive-complete.json'),
          'sourceFreezeSha256': registration['sourceFreezeSha256'],
          'scope': 'Independentfull200000-record activecorpus bytecomparison againstoriginalsealedQ02candidate, includingfullpublicWord/trace andfinalsurface. No partialrecord projection, historicalsource relabeling, universalRNG orqualitygain claim.'}
with (OUT / 'active-archive-independent.json').open('x') as handle:
    json.dump(report, handle, indent=2)
    handle.write('\n')
print(json.dumps({'passed': True, 'completeWords': total, 'all20StreamHashesMatch': True}), flush=True)
