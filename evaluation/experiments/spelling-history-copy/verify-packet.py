"""Verify portable stored/decoded evidence and optional current source/local retention."""
from pathlib import Path
import argparse, gzip, hashlib, json

parser = argparse.ArgumentParser()
parser.add_argument('--packet', type=Path, default=Path(__file__).parent)
parser.add_argument('--repo', type=Path)
parser.add_argument('--local-root', type=Path)
args = parser.parse_args()
packet = args.packet
digest = lambda raw: hashlib.sha256(raw).hexdigest()
index = json.loads((packet / 'index.json').read_text())
seen = set()
for row in index['files']:
    path = Path(row['path'])
    assert not path.is_absolute() and '..' not in path.parts and row['path'] not in seen
    seen.add(row['path'])
    raw = (packet / path).read_bytes()
    assert len(raw) == row['bytes'] and digest(raw) == row['sha256'], row['path']
    if 'decodedSha256' in row:
        decoded = gzip.decompress(raw)
        assert len(decoded) == row['decodedBytes'] and digest(decoded) == row['decodedSha256']
summary = json.loads((packet / 'summary.json').read_text())
assert summary['control'] == '9b24c530f602685753f3e5b3d26d238552e61267'
assert summary['initialPolicyWords'] == 8000 and summary['publicParityCalls'] == 80000 and summary['archivalWords'] == 200000
assert summary['repositoryGateCommands'] == summary['repositoryGateFailures'] == 6
assert summary['fullSuiteTimeoutResolved'] is False and summary['adoptionRecommended'] is False
freeze = json.loads((packet / 'evidence/source-freeze.json').read_text())
for role in ['baseline', 'candidate']:
    bundle = json.loads(gzip.decompress((packet / (role + '-sources.json.gz')).read_bytes()))
    assert len(bundle) == len(freeze[role]) == 184
    assert [{k: row[k] for k in ['path', 'bytes', 'sha256']} for row in bundle] == freeze[role]
    for row in bundle:
        raw = row['utf8'].encode()
        assert len(raw) == row['bytes'] and digest(raw) == row['sha256']
        if args.repo and role == 'candidate':
            current = (args.repo / row['path']).read_bytes()
            assert current == raw, row['path']
for name, key, count in [('independent-initial-complete.json', 'completePublicWordsPerArm', 8000),
                         ('trace-parity-independent.json', 'completePublicWords', 80000),
                         ('active-archive-independent.json', 'completePairedPublicWords', 200000)]:
    assert json.loads((packet / 'evidence' / name).read_text())[key] == count
gates = json.loads((packet / 'evidence/broader-complete.json').read_text())
assert gates['preservationCommandsPassed'] and gates['repositoryGateFailures'] == 6 and not gates['allRepositoryGatesPassed']
paired = json.loads((packet / 'evidence/paired-gates-independent.json').read_text())
assert paired['candidatePasses'] == paired['baselineTimeoutFailures'] == 6
assert paired['medianPairedElapsedFractionChange'] == summary['medianPairedElapsedFractionChange']
local_files = 0
if args.local_root:
    for reference in summary['privateRetentionIndexes']:
        path = Path(reference['path'])
        assert not path.is_absolute() and '..' not in path.parts
        saved = args.local_root / path
        raw = saved.read_bytes()
        assert len(raw) == reference['bytes'] and digest(raw) == reference['sha256']
        for row in json.loads(raw)['files']:
            relative = Path(row['path'])
            assert not relative.is_absolute() and '..' not in relative.parts
            with (saved.parent / relative).open('rb') as handle:
                assert hashlib.file_digest(handle, 'sha256').hexdigest() == row['sha256']
            assert (saved.parent / relative).stat().st_size == row['bytes']
            local_files += 1
print(json.dumps({'passed': True, 'portableArtifacts': len(seen), 'currentSourceVerified': bool(args.repo),
                  'localFilesAuthenticated': local_files,
                  'scope': 'Evidence byte/source authenticity and declared scope; no raw-corpus numerical recount in portable mode or passing repository gates claimed.'}))
