"""Verify a complete portable study packet and optional complete local archives."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

from specs import SPECS


def pin(path):
    digest, size = hashlib.sha256(), 0
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
            size += len(block)
    return {'bytes': size, 'sha256': digest.hexdigest()}


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def verify(root, entry, full_local=False):
    index = json.loads((root / 'packet-index.json').read_bytes())
    assert index['version'] == 'complete-study-review-packet-v1' and index['entry'] == entry
    spec = SPECS[entry]
    assert index['sourceCommit'] == spec['source'] and index['controlCommit'] == spec['control']
    assert index['bundleIndex'] == pin(root / 'bundle/index.json')
    expected_root_files = {'verified-results.json', 'RESULTS.md', 'bundle.py', 'recount.py',
                           'gates.py', 'domain.py', 'verify_packet.py', 'specs.py'}
    assert set(index['rootFiles']) == expected_root_files
    assert {path.name for path in root.iterdir()} == expected_root_files | {'packet-index.json', 'bundle'}
    assert not any(path.is_symlink() for path in root.rglob('*'))
    for name, expected in index['rootFiles'].items():
        assert pin(root / name) == expected
    libraries = {name: module(name, root / (name + '.py')) for name in ('bundle', 'recount', 'gates', 'domain')}
    bundle, origins = libraries['bundle'].verify(root / 'bundle', entry, 'complete')
    read = libraries['bundle'].reader(root / 'bundle', origins)
    result = libraries['domain'].verify(read, entry, spec, index['bindings'], libraries['recount'], libraries['gates'])
    libraries['recount'].compare(json.loads((root / 'verified-results.json').read_bytes()), result)
    local_records = 0
    if full_local:
        locations = index['bindings']
        archive_path = Path(locations['archiveIndex'])
        base = archive_path.parent.parent
        primary = json.loads(read(locations['archiveIndex']))
        assert pin(archive_path) == libraries['domain'].pin(read(locations['archiveIndex']))
        for record in primary['records']:
            relative = Path(record['retained'])
            assert not relative.is_absolute() and '..' not in relative.parts
            expected = {key: record[key] for key in ('bytes', 'sha256')}
            assert pin(Path(record['original'])) == pin(archive_path.parent / relative) == expected
            local_records += 1
        for name in spec['historical']:
            directory = base / name
            raw = read(str(directory / 'index.json'))
            assert pin(directory / 'index.json') == libraries['domain'].pin(raw)
            historical = json.loads(raw)
            if isinstance(historical.get('records'), list):
                records = [(record['retained'], {key: record[key] for key in ('bytes', 'sha256')})
                           for record in historical['records']]
            else:
                records = [(relative, {key: record[key] for key in ('bytes', 'sha256')})
                           for relative, record in historical['files'].items()]
            for relative, expected in records:
                path = Path(relative)
                assert not path.is_absolute() and '..' not in path.parts
                assert pin(directory / path) == expected
                local_records += 1
    return {'passed': True, 'entry': entry, 'datasets': result['datasets'], 'contrasts': result['contrasts'],
            'calibrationPassed': result['calibrationPassed'], 'originalGateFailures': result['originalGateFailing'],
            'selectedPublicLogicalFiles': len(bundle['records']), 'explicitPrivateExclusions': len(bundle['privateAuthentication']['excludedRecords']),
            'localRecordsRehashed': local_records, 'scope': result['scope']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--entry', choices=('Q22', 'Q23'), required=True)
    parser.add_argument('--full-local', action='store_true')
    args = parser.parse_args()
    print(json.dumps(verify(args.root.resolve(), args.entry, args.full_local)))
