"""Package completed Q02 evidence; raw word archives remain separately retained."""
import gzip
import hashlib
import json
from pathlib import Path
import shutil

local = Path(__file__).resolve().parent
publication = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator')
target = publication / 'evaluation/experiments/final-word-ownership/measured-results'
audit = Path('/private/tmp/q02-final-audit-v2')
diagnostics = Path('/private/tmp/q02-diagnostics-v1')
assert (audit / 'complete.json').is_file() and (diagnostics / 'complete.json').is_file()
assert not target.exists(), 'Never overwrite a previous evidence package'
agreement = json.loads((audit / 'counter-agreement.json').read_bytes())
assert agreement['independentCounterDisagreements'] == 0
legacy = json.loads((audit / 'legacy-equality.json').read_bytes())
assert legacy['passed'] is True and legacy['words'] == 200000
assert legacy['legacyWordAndTraceDifferences'] == 0
production = json.loads((audit / 'candidate-production.json').read_bytes())
assert production['counts']['words'] == 200000
assert production['configuredOperationReplayFailures'] == production['sourceBindingFailures'] == 0
pins = json.loads((local / 'analysis-tools.json').read_bytes())
for name, pin in pins['files'].items():
    raw = (local / name).read_bytes()
    assert len(raw) == pin['bytes'] and hashlib.sha256(raw).hexdigest() == pin['sha256'], name

target.mkdir()
entries = []

def retain(source, name):
    raw = source.read_bytes()
    compressed = source.suffix in ('.json', '.log')
    stored_name = name + ('.gz' if compressed else '')
    destination = target / stored_name
    destination.parent.mkdir(parents=True, exist_ok=True)
    encoded = gzip.compress(raw, compresslevel=9, mtime=0) if compressed else raw
    with destination.open('xb') as stream:
        stream.write(encoded)
    entries.append(dict(file=stored_name, bytes=len(encoded), sha256=hashlib.sha256(encoded).hexdigest(),
        originalBytes=len(raw), originalSha256=hashlib.sha256(raw).hexdigest(), encoding='gzip' if compressed else 'original'))

for name in ('analysis-tools.json', 'publication-source-equivalence.json', 'q02-registered-rng-parity.json',
             'performance-summary.json', 'common-summary-equality.json', 'broad-comparison.json',
             'broad-comparison.md', 'broad-comparison-inputs.json', 'original-common-summary.json',
             'original-common-summary-seal.json', 'q02-control-production-counts.json', 'control-counter-comparison.json', 'analysis-pin-verification.json',
             'control-checkpoint-integrity.json', 'witness-attempt-v1.json', 'witnesses.json.gz', 'witness-verification.json'):
    retain(local / name, 'context/' + name)
for group, directory in [('checks', local / 'checks'), ('performance', local / 'performance'),
                         ('audit', audit), ('diagnostics', diagnostics)]:
    for source in sorted(directory.rglob('*')):
        if source.is_file():
            retain(source, group + '/' + source.relative_to(directory).as_posix())
for name in pins['files']:
    retain(local / name, 'tools/' + name)
for arm, directory in [('candidate', 'q02-final-word-provenance-v1'), ('control', 'q02-spelling-stress-control-v1')]:
    archive = Path('/private/tmp') / directory
    retain(archive / 'manifest.json', 'archives/' + arm + '/manifest.json')
    retain(archive / 'summary.json', 'archives/' + arm + '/summary.json')
    for name in ('before.json', 'complete.json'):
        retain(Path(str(archive) + '-freeze') / name, 'archives/' + arm + '/freeze/' + name)
index = dict(version='q02-measured-results-v1', controlCommit='905ba3e92d396db358504fec1826c1c83f680ff3',
    measuredCandidateCommit='7e34a17f31d44d1e31420f458bf6e2d99c5fa038',
    implementationCommit='3dd6cf12c49462352dcc9510043aba723af48fcc',
    scope='Completed corpus/replay/counter/parity results and original-size gate outcomes. Failed tests and diagnostics are retained. No human preference or complete spelling-phone license claim.',
    rawArchiveRequirement='Raw 200000-word archives per arm are retained separately; the archived manifests enumerate every raw shard hash. This committed package alone is insufficient for full analytical replay.',
    artifacts=entries)
(target / 'index.json').write_text(json.dumps(index, indent=2) + '\n')
for entry in entries:
    encoded = (target / entry['file']).read_bytes()
    assert len(encoded) == entry['bytes'] and hashlib.sha256(encoded).hexdigest() == entry['sha256']
    raw = gzip.decompress(encoded) if entry['encoding'] == 'gzip' else encoded
    assert len(raw) == entry['originalBytes'] and hashlib.sha256(raw).hexdigest() == entry['originalSha256']
print(json.dumps(dict(files=len(entries), directory=str(target), bytes=sum(e['bytes'] for e in entries))), flush=True)
