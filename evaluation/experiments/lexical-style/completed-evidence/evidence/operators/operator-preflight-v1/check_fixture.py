"""Check every fixed Q20 development coordinate, never a corpus substitute."""
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import sys

from independent_model import SpellingLaw, verify_word_law

BASE = Path(__file__).parent
INPUT = Path('/private/tmp/q20-independent-fixture-capture-v1')
OUT = Path('/private/tmp/q20-independent-law-preflight-v1')


def pin(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def snapshot():
    return {'tools': {path.name: pin(path) for path in sorted(BASE.iterdir()) if path.is_file()},
            'inputs': {name: pin(INPUT / name) for name in ['before.json', 'complete.json', 'words.jsonl.gz', 'default-config.json', 'active-config.json']},
            'python': sys.version, 'executable': pin(Path(sys.executable).resolve())}


def save(name, value):
    with (OUT / name).open('x') as stream:
        stream.write(json.dumps(value, indent=2) + '\n')


OUT.mkdir()
checked, coordinate = 0, None
try:
    before = snapshot(); save('before.json', before)
    parent = json.loads((INPUT / 'complete.json').read_bytes())
    assert parent['passed'] is True and parent['preflight'] is True and parent['words'] == 400
    assert parent['before'] == parent['after']
    assert all(before['inputs'][name] == value for name, value in parent['artifacts'].items())
    models = {policy: SpellingLaw(json.loads((INPUT / (policy + '-config.json')).read_bytes())) for policy in ['default', 'active']}
    expected = {(stream['policy'], stream['profile'], stream['seed'], index) for stream in parent['streams'] for index in range(10)}
    assert len(expected) == 400 and len(parent['streams']) == 40
    seen, counts, groups = set(), Counter(), {}
    with gzip.open(INPUT / 'words.jsonl.gz', 'rt') as stream:
        for line in stream:
            row = json.loads(line)
            coordinate = (row['policy'], row['profile'], row['seed'], row['drawIndex'])
            assert coordinate in expected and coordinate not in seen
            seen.add(coordinate)
            observed = verify_word_law(models[row['policy']], row['word'])
            counts.update(observed)
            key = '/'.join(str(value) for value in coordinate[:3])
            groups.setdefault(key, Counter()).update(observed)
            checked += 1
    assert seen == expected and checked == 400
    after = snapshot(); assert after == before
    save('complete.json', {'passed': True, 'preflight': True, 'words': checked, 'streams': len(groups),
        'counts': dict(counts), 'groups': {key: dict(value) for key, value in groups.items()}, 'before': before, 'after': after,
        'scope': 'All 400 fixed development words independently checked for hard support, style prior, local weights, sampled choices/doubling and complete conditioned partition/path probabilities. No full-corpus or human-quality claim.'})
    print(json.dumps({'passed': True, 'preflight': True, 'words': checked, 'counts': dict(counts)}), flush=True)
except Exception as error:
    save('failure.json', {'error': str(error), 'type': type(error).__name__, 'checked': checked, 'coordinate': coordinate})
    raise
