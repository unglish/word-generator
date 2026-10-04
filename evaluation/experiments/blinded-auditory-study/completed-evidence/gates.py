"""Recount original study gates from portable evidence, without running tests."""
import hashlib
import json
import re
import statistics


def pin(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def verify(read, registration_origin, verifier_origin):
    """Read original bytes by provenance path; never require a live checkout."""
    def load(origin):
        return json.loads(read(origin))

    registration = load(registration_origin)
    root = registration['out'].rstrip('/')
    entry = registration['entry']
    assert entry in ('Q21', 'Q22', 'Q23')
    assert registration['commands'] == 28 and registration['timingPairs'] == 6
    initial_record = load(root + '/initial.json')
    initial = initial_record['initial']
    complete = load(root + '/complete.json')
    assert initial_record['generatorAndOriginalGateSourceParity'] is True
    assert complete['passed'] is True and complete['entry'] == entry
    assert complete['after'] == initial
    assert initial['registration'] == pin(read(registration_origin))
    assert set(initial['sources']) == set(registration['roots']) == {'control', 'candidate'}
    assert set(registration['commits']) == {'control', 'candidate'}
    for arm, source in initial['sources'].items():
        assert source['commit'] == registration['commits'][arm]
        for name, identity in source['tracked'].items():
            if name.startswith(('src/', 'scripts/', 'evaluation/quality/', 'vitest.')) and arm == 'control':
                assert initial['sources']['candidate']['tracked'][name] == identity
    npm = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/npm'
    node = initial['node']['path']
    commands = []
    for arm in ('control', 'candidate'):
        source_root = registration['roots'][arm]
        for name, command in (
            ('unit', [npm, 'test']), ('lint', [npm, 'run', 'lint']),
            ('compile', [node, source_root + '/node_modules/typescript/bin/tsc']),
            ('quality', [npm, 'run', 'test:quality']),
            ('trigrams', [npm, 'run', 'analyze:trigrams']),
            ('trace', [npm, 'run', 'audit:trace']),
            ('review-types', [npm, 'run', 'review:typecheck']),
            ('review-suite', [npm, 'run', 'test:review'])):
            label = 'compile-' + arm + '-diagnostics' if name == 'compile' else 'original-' + arm + '-' + name
            commands.append((label, arm, command))
    for pair in range(1, 7):
        for arm in ('control', 'candidate'):
            commands.append(('native-pair-' + str(pair) + '-' + arm, arm, [npm, 'run', 'test:perf']))
    assert len(commands) == len(complete['results']) == 28
    compiled = {'control': False, 'candidate': False}
    timing, results = [], []
    for (name, arm, command), actual in zip(commands, complete['results']):
        assert actual['name'] == name and actual['arm'] == arm and actual['command'] == command
        assert actual['cwd'] == registration['roots'][arm]
        assert actual['signal'] is None and actual['startError'] is None
        assert type(actual['code']) is int
        log_origin = root + '/' + name + '.log'
        assert actual['log'] == pin(read(log_origin))
        before = load(root + '/' + name + '-before.json')
        after = load(root + '/' + name + '-after.json')
        assert before['before'] == after['after'] == initial
        assert before['command'] == command and after['record'] == actual
        assert before['cwd'] == registration['roots'][arm]
        eligibility = compiled[arm] if name.endswith(('-trigrams', '-trace')) else None
        assert before['compiledSourceEligible'] == actual['compiledSourceEligible'] == eligibility
        if eligibility is not None:
            assert before['compiledBefore'] == after['compiledAfter']
            assert actual['compiledSourceEligible'] == complete['compiled'][arm]
        if name.startswith('compile-'):
            compiled[arm] = actual['code'] == 0
        reports = {key: value for key, value in actual.items() if key.endswith(('.json', '.md'))}
        for file, record in reports.items():
            assert {key: record[key] for key in ('bytes', 'sha256')} == pin(read(root + '/' + file))
            assert record['state'] in ('unchanged-existing-report', 'created-or-modified-report')
        results.append({'name': name, 'arm': arm, 'exitCode': actual['code'], 'reports': reports,
                        'compiledSourceEligible': actual['compiledSourceEligible']})
        if name.startswith('native-pair-'):
            log = read(log_origin).decode()
            matches = re.findall(r'Performance: (\d+) words/sec \((\d+) words in (\d+)ms\)', log)
            assert len(matches) == 1 and int(matches[0][1]) == 10000
            assert 'Floor: 4500 words/sec' in log
            timing.append({'pair': int(name.split('-')[2]), 'arm': arm,
                           'roundedWordsPerSecond': int(matches[0][0]), 'originalWords': 10000,
                           'roundedElapsedMs': int(matches[0][2]), 'exitCode': actual['code'], 'log': actual['log']})
    assert compiled == complete['compiled'] and len(timing) == 12
    ratios = []
    for pair in range(1, 7):
        observations = {item['arm']: item for item in timing if item['pair'] == pair}
        assert set(observations) == {'control', 'candidate'}
        ratios.append(observations['candidate']['roundedWordsPerSecond'] / observations['control']['roundedWordsPerSecond'])
    original_verification = load(root + '/independent-verification.json')
    expected = {'passed': True, 'entry': entry, 'commands': 28,
                'passingCommands': sum(item['exitCode'] == 0 for item in results),
                'failedCommands': sum(item['exitCode'] != 0 for item in results),
                'results': results, 'timingPairs': timing,
                'candidateControlRoundedTimingRatios': ratios,
                'medianRoundedTimingRatio': statistics.median(ratios),
                'generatorAndOriginalGateSourceParity': True,
                'inputs': {'registration': pin(read(registration_origin)),
                           'originalCompletion': pin(read(root + '/complete.json')),
                           'verifier': pin(read(verifier_origin))},
                'scope': original_verification['scope']}
    assert original_verification == expected
    return {**expected, 'portableScope': 'Original command/log/report/source-snapshot/compiler and timing recount only. Live original/retained source/dependency bytes require full local archive verification. No rerun, current-main certification, precise throughput or human-quality claim.'}
