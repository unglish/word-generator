"""Package all completed Q20 outcomes; retain every full raw stream locally."""
import ctypes
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import traceback

BASE = Path(__file__).resolve().parents[1]
ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator')
STAGE = Path('/private/tmp/q20-publication-stage-v1')
LOCAL = BASE / 'retained-local-v1'
TMP = Path('/private/tmp')
MEASURED = '4f4c95d555a00f1d8cb44892a72e57748f377948'
CONTROL = '1159465fe6c10f55a97e8c5851e8a75c604450e7'


def pin_bytes(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def pin(path):
    digest, size = hashlib.sha256(), 0
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
            size += len(block)
    return {'bytes': size, 'sha256': digest.hexdigest()}


def load(path):
    return json.loads(path.read_bytes())


def source_identity(initial):
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip() == MEASURED
    assert not subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=ROOT, text=True).strip()
    for name, expected in initial['sources']['candidate']['tracked'].items():
        assert pin(ROOT / name) == expected, name


if __name__ == '__main__':
    STAGE.mkdir(mode=0o700)
    try:
        gates = load(TMP / 'q20-gates-v1/complete.json')
        initial = load(TMP / 'q20-gates-v1/initial.json')
        assert gates['passed'] and gates['after'] == initial and len(gates['results']) == 74
        assert sum(record['code'] == 0 for record in gates['results']) == 6
        assert sum(record['name'].startswith('native-pair-') for record in gates['results']) == 12
        assert sum(record['name'].startswith('configured-pair-') for record in gates['results']) == 48
        assert load(TMP / 'q20-full-audit-driver-v2/complete.json')['independentWords'] == 800000
        paired = load(TMP / 'q20-paired-summary-v1/complete.json')
        assert paired['passed'] and paired['before'] == paired['after'] and paired['pairedWords'] == 400000
        assert len(paired['pairedStreams']) == 40 and all(record['words'] == 10000 for record in paired['pairedStreams'])
        lint = load(TMP / 'q20-whole-lint-v1/complete.json')
        assert lint['passed'] and lint['before'] == lint['after'] and len(lint['results']) == 2
        source_identity(initial)
        LOCAL.mkdir(mode=0o700)
        records, raw_records, objects = [], [], {}

        def add(source, destination):
            original = source.read_bytes()
            compressed = source.suffix != '.gz' and (len(original) > 65536 or source.suffix == '.log')
            saved = gzip.compress(original, mtime=0) if compressed else original
            relative = destination + ('.gz' if compressed else '')
            target = STAGE / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open('xb') as stream:
                stream.write(saved)
            records.append({'path': relative, 'origin': str(source), 'compression': 'gzip' if compressed else 'none',
                            'saved': pin_bytes(saved), 'original': pin_bytes(original)})

        libc = ctypes.CDLL(None, use_errno=True)
        clone = libc.clonefile
        clone.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int]
        clone.restype = ctypes.c_int

        def retain(source, expected=None):
            identity = pin(source)
            if expected is not None:
                assert identity == expected, str(source)
            target = LOCAL / 'objects' / identity['sha256']
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                result = clone(os.fsencode(source.resolve()), os.fsencode(target), 0)
                if result:
                    raise OSError(ctypes.get_errno(), 'Complete archive clone failed', str(source))
                assert not target.is_symlink() and source.stat().st_ino != target.stat().st_ino
                target.chmod(0o600)
            assert pin(target) == pin(source) == identity
            objects[str(target)] = identity
            return target, identity

        reused_root = BASE.parent / 'morphology-cluster-legality/retained-local-v1'
        reused_index = load(reused_root / 'retained-local-index.json')
        reused = {record['origin']: record for record in reused_index['records']}
        formal_roots = set()
        for policy in ('default', 'active'):
            for arm, label, commit in [('control', 'q11b-composed-control', CONTROL), ('candidate', 'q20-candidate', MEASURED)]:
                archive = TMP / (label + '-' + policy + '-v1')
                formal_roots.add(archive)
                manifest = load(archive / 'manifest.json')['manifest']
                assert manifest['generator']['commit'] == commit and not manifest['generator']['dirty']
                seal = load(Path(str(archive) + '-freeze') / 'complete.json')
                assert seal['passed'] and seal['words'] == 200000 and pin(archive / 'manifest.json') == seal['manifest']
                streams = 0
                for record in manifest['artifacts']:
                    relative = Path(record['file'])
                    assert not relative.is_absolute() and '..' not in relative.parts
                    source = archive / relative
                    expected = {key: record[key] for key in ('bytes', 'sha256')}
                    assert pin(source) == expected
                    if relative.parts[0] == 'words':
                        streams += 1
                        if arm == 'control':
                            existing = reused[str(source)]
                            retained = reused_root / existing['path']
                            assert pin(retained) == expected == {key: existing[key] for key in ('bytes', 'sha256')}
                            method = 'existing-complete-authenticated-control-archive'
                        else:
                            retained, _ = retain(source, expected)
                            method = 'independent-inode-filesystem-clone'
                        raw_records.append({'arm': arm, 'policy': policy, 'file': relative.as_posix(), 'origin': str(source),
                                            'retained': str(retained), 'retention': method, **expected})
                    else:
                        add(source, 'evidence/' + archive.name + '/' + relative.as_posix())
                assert streams == 20
                add(archive / 'manifest.json', 'evidence/' + archive.name + '/manifest.json')
                print(arm + '/' + policy + ':20 complete original word/trace streams retained', flush=True)

        # Every finished execution, preflight and historical failure is included.
        for directory in sorted(TMP.glob('q20*')):
            if directory.name.startswith('q20-publication') or directory in formal_roots:
                continue
            files = sorted(directory.rglob('*')) if directory.is_dir() else [directory]
            for source in files:
                if source.is_file():
                    add(source, 'evidence/' + directory.name + ('/' + source.relative_to(directory).as_posix() if directory.is_dir() else ''))
        for source in sorted(BASE.rglob('*')):
            relative = source.relative_to(BASE)
            if source.is_file() and not any(part in ('__pycache__', 'retained-local-v1') for part in relative.parts) and source.name != 'workspace.json' and relative.as_posix() not in ('publication-tools-v1/RESULTS.md', 'publication-tools-v1/verify.py'):
                add(source, 'evidence/operators/' + relative.as_posix())

        retained_support = []
        def retain_support(logical, source, expected):
            retained, actual = retain(source, expected)
            retained_support.append({'logical': logical, 'origin': str(source), 'retained': str(retained), **actual})
        for arm, source in initial['sources'].items():
            repo = Path('/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator') if arm == 'control' else ROOT
            for name, expected in source['tracked'].items():
                retain_support('source/' + arm + '/' + name, repo / name, expected)
        for identity in (initial, lint['before']):
            for source in identity['sources'].values():
                for package in source['dependencies']['packages'].values():
                    for name, expected in package['files'].items():
                        retain_support('dependencies/' + package['name'] + '/' + package['version'] + '/' + name,
                                       Path(expected['path']), {key: expected[key] for key in ('bytes', 'sha256')})
        for package in initial['toolDependencies']['packages'].values():
            for name, expected in package['files'].items():
                retain_support('gate-tool-dependencies/' + package['name'] + '/' + package['version'] + '/' + name,
                               Path(expected['path']), {key: expected[key] for key in ('bytes', 'sha256')})
        retain_support('runtime/node', Path(initial['node']['path']), {key: initial['node'][key] for key in ('bytes', 'sha256')})
        retain_support('runtime/npm', Path('/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/npm'), initial['npm'])
        independent = load(TMP / 'q20-candidate-default-independent-v2/complete.json')
        python = Path('/Users/ryanbetts/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3').resolve()
        retain_support('runtime/python', python, independent['before']['executable'])
        assert len(raw_records) == 80
        local_index = {'passed': True, 'streams': raw_records, 'support': retained_support, 'uniqueNewObjects': len(objects),
                       'newLogicalObjectBytes': sum(record['bytes'] for record in objects.values()),
                       'scope': 'All80full raw control/candidate streams,400000words per arm. Forty control streams reuse exact already authenticated retained archives; candidate/support copies have independent inodes and shared filesystem extents. Every byte retained; no subset or backup-to-another-device claim.'}
        (LOCAL / 'index.json').write_text(json.dumps(local_index, indent=2) + '\n')
        (STAGE / 'retained-local-index.json').write_text(json.dumps(local_index, indent=2) + '\n')
        for name in ('RESULTS.md', 'verify.py'):
            add(BASE / 'publication-tools-v1' / name, name)
        source_identity(initial)
        assert len({record['path'] for record in records}) == len(records)
        index = {'version': 'q20-completed-evidence-v1', 'measuredCommit': MEASURED, 'controlCommit': CONTROL,
                 'records': records, 'sourcePins': initial['sources']['candidate']['tracked'],
                 'localIndex': pin(STAGE / 'retained-local-index.json'),
                 'gateOutcomes': {'commands': 74, 'passing': 6, 'failed': 68, 'nativeTimingRuns': 12, 'configuredTimingRuns': 48},
                 'scope': 'Complete full-corpus trace/law/lineage evidence and descriptive comparisons. All gate/earlier failures retained. No within-word coherence observation, human quality gain, passing-suite or promotion claim.'}
        (STAGE / 'validation-index.json').write_text(json.dumps(index, indent=2) + '\n')
        print(json.dumps({'passed': True, 'artifacts': len(records), 'savedBytes': sum(record['saved']['bytes'] for record in records),
                          'retainedStreams': len(raw_records), 'newLogicalObjectBytes': local_index['newLogicalObjectBytes']}))
    except Exception as error:
        (STAGE / 'failure.json').write_text(json.dumps({'error': repr(error), 'traceback': traceback.format_exc()}, indent=2) + '\n')
        raise
