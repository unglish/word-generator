"""Independently check every packaged Q20 file and all registered outcomes."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import statistics


def pin_bytes(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def pin(path):
    digest, size = hashlib.sha256(), 0
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
            size += len(block)
    return {'bytes': size, 'sha256': digest.hexdigest()}


def verify(root, full_local=False):
    index = json.loads((root / 'validation-index.json').read_bytes())
    assert index['measuredCommit'] == '4f4c95d555a00f1d8cb44892a72e57748f377948'
    assert index['controlCommit'] == '1159465fe6c10f55a97e8c5851e8a75c604450e7'
    by_origin, paths = {}, set()
    for record in index['records']:
        relative = Path(record['path'])
        assert not relative.is_absolute() and '..' not in relative.parts and record['path'] not in paths
        paths.add(record['path'])
        raw = (root / relative).read_bytes()
        assert pin_bytes(raw) == record['saved'], record['path']
        assert record['compression'] in ('gzip', 'none')
        original = gzip.decompress(raw) if record['compression'] == 'gzip' else raw
        assert pin_bytes(original) == record['original']
        # Origins are keys for retained bytes, never locations read by this path.
        assert record['origin'] not in by_origin
        by_origin[record['origin']] = record

    def read(origin):
        record = by_origin[origin]
        raw = (root / record['path']).read_bytes()
        return gzip.decompress(raw) if record['compression'] == 'gzip' else raw

    def load(origin):
        return json.loads(read(origin))

    temp = '/private/tmp/'
    initial = load(temp + 'q20-gates-v1/initial.json')
    gates = load(temp + 'q20-gates-v1/complete.json')
    assert gates['passed'] and gates['after'] == initial
    assert index['sourcePins'] == initial['sources']['candidate']['tracked']
    assert initial['sources']['control']['commit'] == index['controlCommit']
    assert initial['sources']['candidate']['commit'] == index['measuredCommit']
    gate_tools = next(record['origin'].removesuffix('/binding-registration.json') for record in index['records']
                      if record['origin'].endswith('/lexical-style/gate-tools/binding-registration.json'))
    binding = load(gate_tools + '/binding-registration.json')
    assert binding['commands'] == 74 and binding['nativeTimingRuns'] == 12 and binding['configuredTimingRuns'] == 48
    assert binding['measuredControl'] == index['controlCommit'] and binding['measuredCandidate'] == index['measuredCommit']
    for arm in ('control', 'candidate'):
        for name, expected in binding['gateSourcePins'].items():
            assert initial['sources'][arm]['tracked'][name] == expected
    roots = {'control': '/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator',
             'candidate': '/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator'}
    node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
    npm = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/npm'
    expected_commands = []
    for arm in ('control', 'candidate'):
        for name, command in [('unit', [npm, 'test']), ('compile', [node, roots[arm] + '/node_modules/typescript/bin/tsc']),
                              ('quality', [npm, 'run', 'test:quality']), ('trigrams', [npm, 'run', 'analyze:trigrams']), ('trace', [npm, 'run', 'audit:trace'])]:
            expected_commands.append(('compile-' + arm + '-diagnostics' if name == 'compile' else 'original-' + arm + '-' + name, arm, command, {}))
    for policy in ('default', 'active'):
        for arm in ('control', 'candidate'):
            expected_commands.append(('configured-' + policy + '-' + arm + '-quality', arm,
                [node, roots[arm] + '/node_modules/vitest/vitest.mjs', 'run', '--config', gate_tools + '/quality.config.ts'],
                {'Q20_GATE_ARM': arm, 'Q20_SPELLING_POLICY': policy}))
    for pair in range(1, 7):
        for arm in ('control', 'candidate'):
            expected_commands.append(('native-pair-' + str(pair) + '-' + arm, arm, [npm, 'run', 'test:perf'], {}))
    for pair in range(1, 7):
        for policy in ('default', 'active'):
            for mode in ('lexicon', 'text'):
                for arm in ('control', 'candidate'):
                    config = 'text-perf.config.ts' if mode == 'text' else 'perf.config.ts'
                    expected_commands.append(('configured-pair-' + str(pair) + '-' + policy + '-' + mode + '-' + arm, arm,
                        [node, roots[arm] + '/node_modules/vitest/vitest.mjs', 'run', '--config', gate_tools + '/' + config, '--reporter=verbose'],
                        {'Q20_GATE_ARM': arm, 'Q20_SPELLING_POLICY': policy}))
    assert len(expected_commands) == len(gates['results']) == 74
    compiled, native, configured = {'control': False, 'candidate': False}, [], []
    for (name, arm, command, overrides), actual in zip(expected_commands, gates['results']):
        assert actual['name'] == name and actual['arm'] == arm and actual['command'] == command
        assert actual['cwd'] == roots[arm] and actual['environmentOverrides'] == overrides
        assert actual['signal'] is None and actual.get('startError') is None and type(actual['code']) is int
        before = load(temp + 'q20-gates-v1/' + name + '-before.json')
        after = load(temp + 'q20-gates-v1/' + name + '-after.json')
        assert before['before'] == after['after'] == initial and after['record'] == actual
        assert before['command'] == command and before['cwd'] == roots[arm] and before['environmentOverrides'] == overrides
        eligible = compiled[arm] if name.endswith(('-trigrams', '-trace')) else None
        assert before['compiledSourceEligible'] == actual['compiledSourceEligible'] == eligible
        if eligible is not None:
            assert before['compiledBefore'] == after['compiledAfter']
        if name.startswith('compile-'):
            compiled[arm] = actual['code'] == 0
        raw_log = read(temp + 'q20-gates-v1/' + name + '.log')
        assert pin_bytes(raw_log) == actual['log']
        for file, expected in actual.items():
            if file.endswith(('.json', '.md')):
                assert pin_bytes(read(temp + 'q20-gates-v1/' + file)) == {key: expected[key] for key in ('bytes', 'sha256')}
                assert expected['state'] in ('created-or-modified-report', 'unchanged-existing-report')
        if '-pair-' in name:
            log = raw_log.decode()
            measurements = re.findall(r'Performance: (\d+) words/sec \((\d+) words in (\d+)ms\)', log)
            assert len(measurements) == 1 and int(measurements[0][1]) == 10000 and 'Floor: 4500 words/sec' in log
            (native if name.startswith('native-') else configured).append({'name': name, 'arm': arm, 'roundedThroughput': int(measurements[0][0]), 'code': actual['code']})
    assert compiled == gates['compiled'] and len(native) == 12 and len(configured) == 48
    assert index['gateOutcomes'] == {'commands': 74, 'passing': sum(record['code'] == 0 for record in gates['results']),
        'failed': sum(record['code'] != 0 for record in gates['results']), 'nativeTimingRuns': 12, 'configuredTimingRuns': 48}
    assert index['gateOutcomes']['passing'] == 6 and all(record['code'] == 1 for record in native + configured)
    native_ratios = [native[i + 1]['roundedThroughput'] / native[i]['roundedThroughput'] for i in range(0, 12, 2)]
    assert read(temp + 'q20-gates-v1/original-control-quality-quality-report.json') == read(temp + 'q20-gates-v1/original-candidate-quality-quality-report.json')
    lint = load(temp + 'q20-whole-lint-v1/complete.json')
    assert lint['passed'] and lint['before'] == lint['after']
    lint_text = []
    for record in lint['results']:
        raw = read(temp + 'q20-whole-lint-v1/' + record['arm'] + '.log')
        assert pin_bytes(raw) == record['log'] and record['code'] == 1
        lint_text.append(raw.decode().replace(roots[record['arm']], '<repo>'))
    assert lint_text[0] == lint_text[1] and '7 problems (7 errors, 0 warnings)' in lint_text[0]
    audit = load(temp + 'q20-full-audit-driver-v2/complete.json')
    assert audit['passed'] and audit['candidatePublicReplayWords'] == 400000 and audit['independentWords'] == 800000
    selection_counts = {}
    for policy in ('default', 'active'):
        public = load(temp + 'q20-full-audit-driver-v2/' + policy + '-public-replay.json')
        assert public['passed'] and public['words'] == 200000 and public['sourceCommit'] == index['measuredCommit'] and public['before'] == public['after']
        for arm in ('control', 'candidate'):
            independent = load(temp + 'q20-' + arm + '-' + policy + '-independent-v2/complete.json')
            assert independent['passed'] and not independent['preflight'] and independent['words'] == 200000 and independent['streams'] == 20
            assert independent['before'] == independent['after']
            assert independent['counts']['words/multipleDeclaredFeaturesSelected'] == 0
            selection_counts[arm + '/' + policy] = {key: independent['counts'][key] for key in ('feature/f/ph/selected', 'feature/s/ps/selected', 'feature/n/mn/selected')}
    paired = load(temp + 'q20-paired-summary-v1/complete.json')
    assert paired['passed'] and paired['before'] == paired['after'] and paired['pairedWords'] == paired['wordsPerArm'] == 400000
    assert len(paired['pairedStreams']) == 40 and sum(record['words'] for record in paired['pairedStreams']) == 400000
    for policy in ('default', 'active'):
        comparison = load(temp + 'q20-paired-summary-v1/' + policy + '-comparison.json')
        assert len(comparison['profiles']) == 4 and sum(profile['words'] for profile in comparison['profiles']) == 200000
        for profile in comparison['profiles']:
            assert profile['uniqueSpellings']['delta'] == profile['uniqueSpellings']['candidate'] - profile['uniqueSpellings']['baseline']
            for measure in ('phonemes', 'trigrams'):
                distance = profile['distributions'][measure]['jensenShannonBits']
                assert distance['delta'] == distance['candidate'] - distance['baseline']
    raw_index_bytes = (root / 'retained-local-index.json').read_bytes()
    assert pin_bytes(raw_index_bytes) == index['localIndex']
    local = json.loads(raw_index_bytes)
    assert local['passed'] and len(local['streams']) == 80
    for arm in ('control', 'candidate'):
        for policy in ('default', 'active'):
            streams = [record for record in local['streams'] if record['arm'] == arm and record['policy'] == policy]
            assert len(streams) == 20 and len({record['file'] for record in streams}) == 20
            archive = ('q11b-composed-control' if arm == 'control' else 'q20-candidate') + '-' + policy + '-v1'
            manifest = load(temp + archive + '/manifest.json')['manifest']
            declared = {record['file']: record for record in manifest['artifacts'] if record['file'].startswith('words/')}
            assert set(declared) == {record['file'] for record in streams}
            for record in streams:
                assert {key: record[key] for key in ('bytes', 'sha256')} == {key: declared[record['file']][key] for key in ('bytes', 'sha256')}
    if full_local:
        for record in local['streams'] + local['support']:
            expected = {key: record[key] for key in ('bytes', 'sha256')}
            assert pin(Path(record['origin'])) == pin(Path(record['retained'])) == expected
    return {'passed': True, 'artifacts': len(paths), 'wordsPerArm': 400000, 'independentWords': 800000,
            'retainedStreams': 80, 'allRawAndSupportRehashed': full_local, 'gateOutcomes': index['gateOutcomes'],
            'medianNativeRoundedThroughputRatio': statistics.median(native_ratios), 'featureSelections': selection_counts,
            'scope': 'Original complete evidence checked, including failures. No human quality, within-word coherence or promotion claim.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--full-local', action='store_true')
    args = parser.parse_args()
    print(json.dumps(verify(args.root, args.full_local), indent=2))
