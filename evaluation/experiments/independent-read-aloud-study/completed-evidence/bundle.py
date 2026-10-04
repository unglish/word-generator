"""Lossless compact evidence bundles with explicit private-authentication exclusions."""
import gzip
import hashlib
import json
from pathlib import Path
import re

VERSION = 'study-evidence-bundle-v3'
TOKEN_PATTERN = re.compile(rb'(?=([0-9a-f]{64}))')


def identity(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def token_hashes(raw):
    return {hashlib.sha256(match.group(1)).hexdigest() for match in TOKEN_PATTERN.finditer(raw)}


def safe_relative(value):
    path = Path(value)
    assert value and not path.is_absolute() and '..' not in path.parts
    assert path.as_posix() == value and value not in ('.', 'index.json')
    return path


def credential_hashes(raw):
    credentials = json.loads(raw)
    assert set(credentials) == {'version', 'manifest_digest', 'owner_token', 'participants'}
    assert isinstance(credentials['participants'], list)
    values = [credentials['owner_token']]
    slots = set()
    for participant in credentials['participants']:
        assert set(participant) == {'participant_slot', 'token'}
        slot = participant['participant_slot']
        assert isinstance(slot, str) and slot and slot not in slots
        slots.add(slot)
        values.append(participant['token'])
    assert all(isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value) for value in values)
    assert len(values) == len(set(values))
    return {hashlib.sha256(value.encode()).hexdigest() for value in values}


def authentication_inventory(items):
    """Discover real credential values without saving or returning their plaintext."""
    hashes, credentials = set(), set()
    for item in items:
        path = Path(item['path'])
        if item['origin'].endswith('/credentials.json') or item['logical'].endswith('/credentials.json'):
            raw = path.read_bytes()
            assert identity(raw) == item['expected']
            hashes.update(credential_hashes(raw))
            credentials.add((item['origin'], item['expected']['sha256']))
    assert credentials and hashes
    return hashes, credentials


def build(items, destination, entry, phase):
    assert entry in ('Q22', 'Q23') and phase in ('engineering', 'complete')
    assert isinstance(items, list) and items
    assert len(items) == len({item['logical'] for item in items})
    private_hashes, credentials = authentication_inventory(items)
    destination.mkdir(mode=0o700)
    artifacts = destination / 'artifacts'
    artifacts.mkdir(mode=0o700)
    public, excluded, origins = [], [], {}
    for item in items:
        path = Path(item['path'])
        assert path.is_file() and not path.is_symlink()
        raw = path.read_bytes()
        actual = identity(raw)
        assert actual == item['expected']
        origin = item['origin']
        assert origin not in origins or origins[origin] == actual
        origins[origin] = actual
        reason = None
        if (origin, actual['sha256']) in credentials:
            reason = 'private-credentials'
        elif 'chrome-profile' in Path(item['logical']).parts or 'chrome-profile' in Path(origin).parts:
            reason = 'private-browser-profile'
        elif token_hashes(raw) & private_hashes:
            reason = 'contains-authentication-value'
        record = {'logical': item['logical'], 'origin': origin, 'original': actual}
        if reason:
            excluded.append({**record, 'reason': reason})
            continue
        compression = 'none' if origin.endswith('.gz') else 'gzip'
        encoded = raw if compression == 'none' else gzip.compress(raw, mtime=0)
        saved = identity(encoded)
        relative = 'artifacts/' + saved['sha256'] + ('.gz' if compression == 'gzip' else '.bin')
        target = destination / relative
        if target.exists():
            assert target.read_bytes() == encoded
        else:
            with target.open('xb') as stream:
                stream.write(encoded)
        public.append({**record, 'path': relative, 'compression': compression, 'saved': saved})
    index = {'version': VERSION, 'entry': entry, 'phase': phase, 'records': public,
             'privateAuthentication': {'excludedRecords': excluded, 'tokenHashes': sorted(private_hashes)},
             'originalLogicalFiles': len(items),
             'scope': 'Lossless selected evidence and explicit private-authentication exclusions. All excluded original bytes remain in local evidence archives. Bundle integrity alone does not prove complete scientific inputs, successful gates, calibrated inference or real people.'}
    (destination / 'index.json').write_text(json.dumps(index, indent=2) + '\n')
    return index


def verify(destination, expected_entry, expected_phase):
    index = json.loads((destination / 'index.json').read_bytes())
    assert index['version'] == VERSION and index['entry'] == expected_entry and index['phase'] == expected_phase
    assert expected_entry in ('Q22', 'Q23') and expected_phase in ('engineering', 'complete')
    private = index['privateAuthentication']
    assert private['excludedRecords'] and private['tokenHashes']
    hashes = private['tokenHashes']
    assert hashes == sorted(set(hashes)) and all(re.fullmatch('[0-9a-f]{64}', value) for value in hashes)
    private_hashes = set(hashes)
    logicals, origins, public_origins, actual_paths = set(), {}, {}, set()
    for record in index['records'] + private['excludedRecords']:
        logical = record['logical']
        safe_relative(logical)
        assert logical not in logicals
        logicals.add(logical)
        assert record['origin'] not in origins or origins[record['origin']] == record['original']
        origins[record['origin']] = record['original']
    assert len(logicals) == index['originalLogicalFiles']
    for record in private['excludedRecords']:
        assert record['reason'] in ('private-credentials', 'private-browser-profile', 'contains-authentication-value')
    for record in index['records']:
        relative = safe_relative(record['path'])
        path = destination / relative
        assert relative.parts[0] == 'artifacts' and not path.is_symlink()
        encoded = path.read_bytes()
        assert identity(encoded) == record['saved']
        assert record['compression'] in ('gzip', 'none')
        raw = gzip.decompress(encoded) if record['compression'] == 'gzip' else encoded
        assert identity(raw) == record['original']
        assert not record['origin'].endswith('/credentials.json')
        assert 'chrome-profile' not in Path(record['origin']).parts
        assert 'chrome-profile' not in Path(record['logical']).parts
        assert not token_hashes(raw) & private_hashes
        public_origins[record['origin']] = record
        actual_paths.add(record['path'])
    expected_files = actual_paths | {'index.json'}
    all_files = {path.relative_to(destination).as_posix() for path in destination.rglob('*') if path.is_file()}
    assert not any(path.is_symlink() for path in destination.rglob('*'))
    assert expected_files == all_files
    return index, public_origins


def reader(destination, origins):
    def read(origin):
        record = origins[origin]
        encoded = (destination / record['path']).read_bytes()
        assert identity(encoded) == record['saved']
        raw = gzip.decompress(encoded) if record['compression'] == 'gzip' else encoded
        assert identity(raw) == record['original']
        return raw
    return read
