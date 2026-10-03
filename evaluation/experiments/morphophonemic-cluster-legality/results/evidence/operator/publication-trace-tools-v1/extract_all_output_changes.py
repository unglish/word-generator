"""Retain complete trace pairs for every output change in all 200k affixed pairs."""
import gzip
import hashlib
import itertools
import json
from pathlib import Path

OUT = Path('/private/tmp/q11b-complete-trace-pairs-v1')
SUMMARY = Path('/private/tmp/q11b-paired-summary-v1/complete.json')
AUDIT = Path('/private/tmp/q11b-full-audit-driver-v1/complete.json')
COUNTERS = {'written': 'spellingChanges', 'pronunciation': 'pronunciationChanges', 'lexical': 'lexicalChanges',
            'syllables': 'syllableChanges', 'trace': 'traceChanges'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class HashingReader:
    def __init__(self, stream):
        self.stream, self.digest, self.bytes = stream, hashlib.sha256(), 0
        self.name = stream.name

    def read(self, size=-1):
        raw = self.stream.read(size)
        self.digest.update(raw)
        self.bytes += len(raw)
        return raw


def records(path, expected, receipts):
    with path.open('rb') as raw:
        stream = HashingReader(raw)
        with gzip.GzipFile(fileobj=stream, mode='rb') as archive:
            for line in archive:
                yield json.loads(line)
        assert stream.bytes == expected['bytes'] and stream.digest.hexdigest() == expected['sha256']
        receipts.append({'path': str(path), 'bytes': stream.bytes, 'sha256': stream.digest.hexdigest()})


def duplicate_coda(word):
    return any(any(left['sound'] == right['sound'] for left, right in zip(syllable['coda'], syllable['coda'][1:])) for syllable in word['syllables'])


def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


OUT.mkdir()
before = {str(path): sha(path) for path in [Path(__file__), SUMMARY, AUDIT]}
summary, audit = json.loads(SUMMARY.read_bytes()), json.loads(AUDIT.read_bytes())
assert summary['passed'] is True and summary['pairedAffixedProfileWords'] == 200000
assert audit['passed'] is True and audit['corpusWords'] == 400000 and audit['sourceCommit'] == '9d2680b37b77ebb2f492f4173b1f1681446e40f4'
save('before.json', {'inputPins': before, 'scope': 'Complete source/trace pairs for all output changes; all 200k affixed ordinal pairs reread. No sampling reduction or preference claim.'})
streams, changed, manifest_pins = [], [], {}
try:
    for number, expected in enumerate(summary['pairedStreams']):
        policy, profile, seed = expected['policy'], expected['profile'], expected['seed']
        file = f'words/{profile}-{seed}.jsonl.gz'
        roots = {'control': Path(f'/private/tmp/q11b-composed-control-{policy}-v1'), 'candidate': Path(f'/private/tmp/q11b-candidate-{policy}-v1')}
        artifacts, receipts = {}, []
        for arm, root in roots.items():
            manifest = root / 'manifest.json'
            manifest_pins[str(manifest)] = sha(manifest)
            inventory = json.loads(manifest.read_bytes())['manifest']['artifacts']
            artifacts[arm] = next(item for item in inventory if item['file'] == file)
        counts = {'words': 0, 'completeWordChanges': 0, **{counter: 0 for counter in COUNTERS.values()}}
        iterator = itertools.zip_longest(records(roots['control'] / file, artifacts['control'], receipts),
                                          records(roots['candidate'] / file, artifacts['candidate'], receipts))
        for left, right in iterator:
            assert left is not None and right is not None
            for row in (left, right):
                assert row['profile'] == profile and row['seed'] == seed and row['drawIndex'] == counts['words']
            a, b = left['word'], right['word']
            counts['completeWordChanges'] += a != b
            differences = {field: a[field] != b[field] for field in COUNTERS}
            for field, counter in COUNTERS.items():
                counts[counter] += differences[field]
            if any(differences[field] for field in ('written', 'pronunciation', 'lexical', 'syllables')):
                name = f"{policy}-{profile}-{seed}-{counts['words']}.json"
                evidence = {'policy': policy, 'profile': profile, 'seed': seed, 'drawIndex': counts['words'],
                            'field_changes': differences, 'duplicate_coda': {'control': duplicate_coda(a), 'candidate': duplicate_coda(b)},
                            'control': left, 'candidate': right, 'archiveArtifacts': artifacts}
                save(name, evidence)
                changed.append({'file': name, 'sha256': sha(OUT / name), 'bytes': (OUT / name).stat().st_size,
                                'policy': policy, 'profile': profile, 'seed': seed, 'drawIndex': counts['words'],
                                'field_changes': differences, 'duplicate_coda': evidence['duplicate_coda']})
            counts['words'] += 1
        assert counts['words'] == 10000
        assert all(counts[key] == expected[key] for key in counts), (expected, counts)
        streams.append({'policy': policy, 'profile': profile, 'seed': seed, **counts, 'compressedArchiveReceipts': receipts})
        save('progress.json', {'streams': streams, 'examples': changed})
        print(f'{number + 1}/20 streams; retained {len(changed)} complete output-change pairs', flush=True)
    assert len(streams) == 20 and sum(stream['words'] for stream in streams) == 200000
    assert before == {path: sha(Path(path)) for path in before}
    assert manifest_pins == {path: sha(Path(path)) for path in manifest_pins}
    save('complete.json', {'passed': True, 'streams': streams, 'examples': changed, 'inputPins': before, 'manifestPins': manifest_pins,
         'scope': 'All200k affixed ordinal pairs reread and all40 compressed archives hashed against original manifests. Complete original WordTrace/stages/graphemeSelections/structural/repairs/morphology retained for every output-changing pair. Matches prior strict Node counters. Descriptive local invariant effect, not English preference or passing gates.'})
except Exception as error:
    save('failure.json', {'error': str(error), 'streams': streams, 'examples': changed})
    raise
