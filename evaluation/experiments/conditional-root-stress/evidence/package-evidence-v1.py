"""Package already accepted Q09 bytes; performs no sampler or generator calls."""
import base64
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator')
OUT = ROOT / 'evaluation/experiments/conditional-root-stress/evidence'
TEMP = Path('/private/tmp')
FREEZE_SHA = '624794b43f79bbb21e7e0c762a25b893ab89c571d313986757502eee80b70b0a'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def publish(relative, data):
    destination = OUT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open('xb') as handle:
        handle.write(data)
    assert destination.read_bytes() == data
    return {'path': relative, 'sha256': sha(data), 'bytes': len(data)}


def main():
    assert not OUT.exists(), 'Fresh package only; never overwrite accepted evidence'
    freeze_bytes = (TEMP / 'q09-sampler-source-freeze-v1.json').read_bytes()
    assert sha(freeze_bytes) == FREEZE_SHA
    freeze = json.loads(freeze_bytes)
    source_entries = []
    for path, expected in freeze['sources'].items():
        data = (ROOT / path).read_bytes()
        assert sha(data) == expected, path
        source_entries.append({'path': path, 'sha256': expected, 'bytes': len(data), 'base64': base64.b64encode(data).decode('ascii')})
    assert len(source_entries) == 116

    inventory = json.loads((TEMP / 'q09-sampler-run-review-v1.json').read_bytes())
    expected = {Path(value['path']).name: value for value in inventory['artifacts']}
    records = []

    def copy(name, group, expected_sha=None):
        source = TEMP / name
        data = source.read_bytes()
        if name in expected:
            assert len(data) == expected[name]['bytes'] and sha(data) == expected[name]['sha256']
        if expected_sha:
            assert sha(data) == expected_sha
        records.append({**publish(group + '/' + name, data), 'historicalPath': str(source)})

    for name in expected:
        group = 'parent' if 'parent-' in name else 'sampler'
        copy(name, group)
    copy('q09-sampler-run-review-v1.json', 'sampler', 'bd8a252274c7a0b9654e99a242e91b0d5cdad1f8227c51e16b48500a4c6cce4f')
    copy('q09-parent-frequency-outcome-review-v1.json', 'parent', 'd17d0b3f84693360964fd92957aa5a9fedeff4f1491a36dd01fa2a3533535c98')
    copy('q09-parent-frequency-audit-v1.py', 'parent', 'b5d4b11a0ddbddfd0575dd2ea4c1fc68dae80e48fb0d3f66406b68253419c35c')
    copy('q09-parent-frequency-audit-v1.log', 'parent')
    copy('q09-oracle-grid-v2.jsonl.gz', 'law', 'ab3324c373b60a1db03d42fb06741c482e1cf39460bf6349b9ad74c14d4b9304')
    copy('q09-oracle-grid-v2.jsonl.gz.manifest.json', 'law', '7b84aff93522c23393201d9e7657733b0a4538089def0deaa38d3c0dbfc46c0f')
    for name in ['q09-pure-pr-focused-tests-v1.log', 'q09-pure-pr-typecheck-v1.log', 'q09-pure-pr-lint-v1.log',
                 'q09-pure-pr-full-tests-v1.log', 'q09-pure-pr-quality-tests-v1.log', 'q09-pure-pr-quality-tests-v2.log']:
        copy(name, 'checks')
    bundle = {'version': 'q09-sampler-frozen-source-content-v1', 'sourceFreezeSha256': FREEZE_SHA,
              'encoding': 'base64 exact bytes', 'files': source_entries}
    bundle_bytes = json.dumps(bundle, separators=(',', ':'), ensure_ascii=False).encode() + b'\n'
    records.append(publish('source-bundle-v1.json.gz', gzip.compress(bundle_bytes, compresslevel=9, mtime=0)))
    records.append({**publish('package-evidence-v1.py', Path(__file__).read_bytes()), 'historicalPath': str(Path(__file__))})
    for value in source_entries:
        assert sha((ROOT / value['path']).read_bytes()) == value['sha256']
    index = {'version': 'q09-pure-law-sampler-evidence-package-v1', 'baseCommit': '3d5f1a9feb07b7c13cd384b8c0daf9036295da60',
        'sourceFreezeSha256': FREEZE_SHA, 'files': records,
        'fullRawEvidenceIncluded': {'analyticalOracleBytes': 14682873, 'randomTapeBytes': 36000000, 'frequencyTranscriptCompressedBytes': 37191354},
        'historicalSources': 'Original protocol/law-evidence/sampler files remain byte-identical outside this outcomes directory.',
        'publicationAmendment': 'The full prior oracle archive is now included. The unchanged historical law package note reflects its original local-only retention.',
        'scope': 'Pure law and sampler; no generator activation or claim of linguistic output improvement. Exact raw tape and transcripts are included, not only private local references.'}
    result = publish('package-index.json', json.dumps(index, indent=2).encode() + b'\n')
    print(json.dumps({'directory': str(OUT), 'index': result, 'indexedFiles': len(records), 'indexedBytes': sum(v['bytes'] for v in records)}))


if __name__ == '__main__':
    main()
