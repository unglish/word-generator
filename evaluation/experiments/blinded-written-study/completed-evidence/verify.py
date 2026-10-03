"""Verify every packaged written-study artifact, native gate and calibration row."""
import argparse
from collections import Counter
from decimal import Decimal, localcontext
import gzip
import hashlib
import json
import math
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


def proportion(actual, numerator, denominator):
    assert actual['numerator'] == numerator and actual['denominator'] == denominator
    estimate = numerator / denominator if denominator else None
    assert actual['estimate'] == estimate
    if not denominator:
        assert actual['wilson95'] is None and actual['monteCarloStandardError'] is None
        return
    assert math.isclose(actual['monteCarloStandardError'], math.sqrt(estimate * (1 - estimate) / denominator), abs_tol=1e-12)
    with localcontext() as context:
        context.prec = 60
        z = Decimal('1.9599639845400542355245944305205515279555500778695')
        n, p = Decimal(denominator), Decimal(numerator) / Decimal(denominator)
        divisor = 1 + z * z / n
        center = (p + z * z / (2 * n)) / divisor
        radius = z * (p * (1 - p) / n + z * z / (4 * n * n)).sqrt() / divisor
        expected = [float(max(Decimal(0), center - radius)), float(min(Decimal(1), center + radius))]
    assert all(math.isclose(a, b, abs_tol=1e-12) for a, b in zip(actual['wilson95'], expected))


def moments(actual, values):
    assert actual['count'] == len(values)
    mean = statistics.mean(values) if values else None
    deviation = statistics.stdev(values) if len(values) > 1 else None
    expected = {'mean': mean, 'standardDeviation': deviation,
                'monteCarloStandardError': deviation / math.sqrt(len(values)) if deviation is not None else None}
    for key, value in expected.items():
        if value is None:
            assert actual[key] is None
        else:
            assert math.isclose(actual[key], value, abs_tol=1e-12)


def verify(root, full_local=False):
    index = json.loads((root / 'validation-index.json').read_bytes())
    assert index['version'] == 'q21-completed-evidence-v4'
    assert index['sourceCommit'] == '5796cb441e9eb806266406becfcea2f822103e95'
    assert index['controlCommit'] == '58baeaa388ee2d83e670764a94f649506b098464'
    assert index['datasets'] == 14400 and index['bootstrapReplicatesPerDataset'] == 999 and index['contrasts'] == 43156800
    assert pin(root / 'RESULTS.md') == index['results']
    paths, origins = set(), {}
    private = index['privateAuthentication']
    assert len(private['excludedRecords']) == 4 and len(private['tokenHashes']) == 27
    assert len(set(private['tokenHashes'])) == 27
    token_hashes = set(private['tokenHashes'])
    for record in index['records']:
        relative = Path(record['path'])
        assert not relative.is_absolute() and '..' not in relative.parts and record['path'] not in paths
        paths.add(record['path'])
        encoded = (root / relative).read_bytes()
        assert pin_bytes(encoded) == record['saved']
        assert record['compression'] in ('gzip', 'none')
        original = gzip.decompress(encoded) if record['compression'] == 'gzip' else encoded
        assert pin_bytes(original) == record['original']
        assert not record['origin'].endswith('/credentials.json')
        assert not any(hashlib.sha256(match.group(1)).hexdigest() in token_hashes
                       for match in re.finditer(rb'(?=([0-9a-f]{64}))', original))
        if record['origin'] in origins:
            assert origins[record['origin']]['original'] == record['original']
        origins[record['origin']] = record

    def read(origin):
        record = origins[origin]
        raw = (root / record['path']).read_bytes()
        return gzip.decompress(raw) if record['compression'] == 'gzip' else raw

    def load(origin):
        return json.loads(read(origin))

    main = '/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator/.local-evidence/'
    temp = '/private/tmp/'
    registration = load(main + 'study-publication-gates-v3/q21-registration-v3.json')
    assert registration['commands'] == 28 and registration['timingPairs'] == 6
    initial = load(temp + 'q21-original-gates-v3/initial.json')['initial']
    complete = load(temp + 'q21-original-gates-v3/complete.json')
    assert complete['passed'] and complete['after'] == initial
    assert index['sourcePins'] == initial['sources']['candidate']['tracked']
    for name, identity in initial['sources']['control']['tracked'].items():
        if name.startswith(('src/', 'scripts/', 'evaluation/quality/', 'vitest.')):
            assert initial['sources']['candidate']['tracked'][name] == identity
    node = initial['node']['path']
    npm = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/npm'
    commands = []
    for arm in ('control', 'candidate'):
        source = registration['roots'][arm]
        for name, command in [('unit', [npm, 'test']), ('lint', [npm, 'run', 'lint']),
                              ('compile', [node, source + '/node_modules/typescript/bin/tsc']), ('quality', [npm, 'run', 'test:quality']),
                              ('trigrams', [npm, 'run', 'analyze:trigrams']), ('trace', [npm, 'run', 'audit:trace']),
                              ('review-types', [npm, 'run', 'review:typecheck']), ('review-suite', [npm, 'run', 'test:review'])]:
            commands.append(('compile-' + arm + '-diagnostics' if name == 'compile' else 'original-' + arm + '-' + name, arm, command))
    for pair in range(1, 7):
        for arm in ('control', 'candidate'):
            commands.append(('native-pair-' + str(pair) + '-' + arm, arm, [npm, 'run', 'test:perf']))
    assert len(commands) == len(complete['results']) == 28
    compiled, timing = {'control': False, 'candidate': False}, []
    for (name, arm, command), actual in zip(commands, complete['results']):
        assert actual['name'] == name and actual['arm'] == arm and actual['command'] == command
        assert actual['cwd'] == registration['roots'][arm]
        assert actual['signal'] is None and actual['startError'] is None and type(actual['code']) is int
        before = load(temp + 'q21-original-gates-v3/' + name + '-before.json')
        after = load(temp + 'q21-original-gates-v3/' + name + '-after.json')
        assert before['before'] == after['after'] == initial and after['record'] == actual
        assert before['command'] == command and before['cwd'] == registration['roots'][arm]
        eligibility = compiled[arm] if name.endswith(('-trigrams', '-trace')) else None
        assert before['compiledSourceEligible'] == actual['compiledSourceEligible'] == eligibility
        if eligibility is not None:
            assert before['compiledBefore'] == after['compiledAfter']
        if name.startswith('compile-'):
            compiled[arm] = actual['code'] == 0
        log = read(temp + 'q21-original-gates-v3/' + name + '.log')
        assert pin_bytes(log) == actual['log']
        for file, identity in actual.items():
            if file.endswith(('.json', '.md')):
                assert pin_bytes(read(temp + 'q21-original-gates-v3/' + file)) == {key: identity[key] for key in ('bytes', 'sha256')}
                assert identity['state'] in ('created-or-modified-report', 'unchanged-existing-report')
        if name.startswith('native-pair-'):
            values = re.findall(r'Performance: (\d+) words/sec \((\d+) words in (\d+)ms\)', log.decode())
            assert len(values) == 1 and int(values[0][1]) == 10000 and 'Floor: 4500 words/sec' in log.decode()
            timing.append({'pair': int(name.split('-')[2]), 'arm': arm, 'roundedThroughput': int(values[0][0]), 'code': actual['code']})
    assert compiled == complete['compiled'] and len(timing) == 12
    outcomes = {'commands': 28, 'passing': sum(row['code'] == 0 for row in complete['results']), 'failed': sum(row['code'] != 0 for row in complete['results'])}
    assert index['originalGateOutcomes'] == outcomes
    resume = load(temp + 'q21-original-gates-driver-v3/science-resumed.json')
    hold = load(temp + 'q21-original-gates-driver-v3/science-held.json')
    assert not resume['errors'] and len(resume['processes']) == len(hold['processes'])
    assert {row['before']['pid'] for row in resume['processes']} == {row['pid'] for row in hold['processes']}

    scientific_registration = load(main + 'blinded-written-study/calibration/registration-v2.json')
    assert scientific_registration['bootstrapReplicates'] == 999
    assert scientific_registration['datasetsPerCase'] == 1200 and scientific_registration['totalFormalDatasets'] == 14400
    registered_cases = {case['id']: case for case in scientific_registration['cases']}
    assert len(registered_cases) == 12
    native = load(temp + 'q21-calibration-v1/complete.json')
    independent = load(temp + 'q21-calibration-independent-v2/complete.json')
    summary = load(temp + 'q21-calibration-summary-v1/summary.json')
    assert native['passed'] and native['completed'] == 14400 and native['bootstrapReplicates'] == 999
    assert independent['passed'] and independent['datasets'] == 14400 and independent['independentlyReconstructedContrasts'] == 43156800
    assert summary['datasets'] == 14400 and summary['replicates'] == 14400 * 999 and summary['contexts'] == 43156800
    assert summary['calibrationPassed'] and len(summary['cases']) == 12
    assert {case['scenario']['id'] for case in summary['cases']} == set(registered_cases)
    assert all(case['scenario'] == registered_cases[case['scenario']['id']] for case in summary['cases'])
    journal_raw = read(temp + 'q21-calibration-v1/results.jsonl')
    rows = [json.loads(line) for line in journal_raw.splitlines()]
    assert len(rows) == 14400 and len({(row['scenario'], row['datasetIndex']) for row in rows}) == 14400
    groups = {}
    for row in rows:
        assert 0 <= row['datasetIndex'] < 1200 and len(row['results']) == 3
        assert row['role'] == registered_cases[row['scenario']]['role']
        assert {result['stratum'] for result in row['results']} == {None, 'short', 'long'}
        for result in row['results']:
            groups.setdefault((row['scenario'], result['stratum']), []).append(result)
            interval = result['interval']
            assert result['stratum'] == result['truth']['stratum']
            assert result['truth']['unconditional'] == registered_cases[row['scenario']]['delta']
            assert all(math.isfinite(value) for key, value in result['truth'].items() if key != 'stratum')
            assert result['point'] is None or math.isfinite(result['point'])
            assert interval is None or len(interval) == 2 and interval[0] <= interval[1] and all(math.isfinite(value) for value in interval)
            assert isinstance(result['withheldReasons'], list)
            assert bool(result['withheldReasons']) == (interval is None)
            for truth, flag in [('unconditional', 'coveredUnconditional'), ('frozenSpellingPool', 'coveredFinitePool')]:
                assert type(result[flag]) is bool and result[flag] == bool(interval and interval[0] <= result['truth'][truth] <= interval[1])
            assert type(result['rejectsZero']) is bool and result['rejectsZero'] == bool(interval and (interval[0] > 0 or interval[1] < 0))
    assert len(groups) == 36 and all(len(group) == 1200 for group in groups.values())
    for case in summary['cases']:
        scenario = case['scenario']
        assert len(case['contexts']) == 3
        assert {context['stratum'] for context in case['contexts']} == {None, 'short', 'long'}
        assert sum(context['primary'] for context in case['contexts']) == 1
        assert all(context['primary'] == (context['stratum'] is None) for context in case['contexts'])
        for context in case['contexts']:
            values, actual = groups[scenario['id'], context['stratum']], context['summary']
            available = sum(value['interval'] is not None for value in values)
            proportion(actual['intervalAvailability'], available, 1200)
            proportion(actual['pointAvailability'], sum(value['point'] is not None for value in values), 1200)
            assert actual['datasets'] == 1200 and actual['withheldDatasets'] == 1200 - available
            assert actual['withheldReasons'] == dict(Counter(reason for value in values for reason in value['withheldReasons']))
            for truth, flag in [('unconditional', 'coveredUnconditional'), ('frozenSpellingPool', 'coveredFinitePool')]:
                count = sum(value[flag] for value in values)
                proportion(actual['coverage'][truth]['allDatasets'], count, 1200)
                proportion(actual['coverage'][truth]['availableIntervals'], count, available)
                biases = [value['point'] - value['truth'][truth] for value in values if value['point'] is not None]
                moments(actual['coverage'][truth]['biasAmongAvailablePoints'], biases)
            rejects = sum(value['rejectsZero'] for value in values)
            proportion(actual['rejectsZero']['allDatasets'], rejects, 1200)
            proportion(actual['rejectsZero']['availableIntervals'], rejects, available)
            intervals = [value['interval'] for value in values if value['interval'] is not None]
            proportion(actual['directionalDetection']['positive'], sum(interval[0] > 0 for interval in intervals), 1200)
            proportion(actual['directionalDetection']['negative'], sum(interval[1] < 0 for interval in intervals), 1200)
            expected_direction = 'positive' if scenario['delta'] > 0 else 'negative' if scenario['delta'] < 0 else None
            assert actual['directionalDetection']['registeredDirection'] == expected_direction
            widths = [interval[1] - interval[0] for interval in intervals]
            moments(actual['intervalWidthAmongAvailable'], widths)
            assert actual['intervalWidthAmongAvailable']['minimum'] == (min(widths) if widths else None)
            assert actual['intervalWidthAmongAvailable']['maximum'] == (max(widths) if widths else None)
            assert actual['intervalWidthAmongAvailable']['median'] == (statistics.median(widths) if widths else None)
        primary = next(context['summary'] for context in case['contexts'] if context['primary'])
        if scenario['role'] == 'bias-diagnostic':
            assert not case['decision']['includedInGate'] and case['decision']['passed'] is None
        else:
            passed = primary['intervalAvailability']['estimate'] >= .95 and primary['coverage']['unconditional']['allDatasets']['wilson95'][0] >= .90
            if scenario['delta'] == 0:
                passed = passed and primary['rejectsZero']['allDatasets']['wilson95'][1] <= .075
            assert case['decision']['includedInGate'] and case['decision']['passed'] == passed
    assert sum(case['decision']['includedInGate'] for case in summary['cases']) == 11

    retained = load(main + 'blinded-written-study/full-calibration-retained-local-v1/index.json')
    assert retained['passed'] and retained['files'] == 30263 and retained['datasets'] == 14400
    retained_origins = {record['original']: record for record in retained['records']}
    expected_private_origins = {
        temp + 'q21-collection-browser-v1/collection/credentials.json',
        temp + 'q21-collection-cli-v1/collection/credentials.json',
        temp + 'q21-collection-cli-v2/collection/credentials.json',
        temp + 'q21-collection-cli-v2/crash-preserved-copy/credentials.json',
    }
    assert {record['origin'] for record in private['excludedRecords']} == expected_private_origins
    for record in private['excludedRecords']:
        assert record['origin'] not in origins
        assert record['original'] == {key: retained_origins[record['origin']][key] for key in ('bytes', 'sha256')}
    raw = {record['original']: record for record in retained['records'] if record['original'].startswith(temp + 'q21-calibration-v1/')
           and record['original'].endswith(('-input.json.gz', '-inference.json.gz'))}
    assert len(raw) == 28800
    for row in rows:
        prefix = temp + 'q21-calibration-v1/' + row['scenario'] + '/' + str(row['datasetIndex']).zfill(4)
        for label in ('input', 'inference'):
            assert {key: raw[prefix + '-' + label + '.json.gz'][key] for key in ('bytes', 'sha256')} == row['artifacts'][label]
    support_origin = main + 'blinded-written-study/original-gates-retained-local-v3/index.json'
    support = load(support_origin)
    assert support['passed'] and support['sourceCommit'] == index['sourceCommit']
    if full_local:
        archive = Path(main + 'blinded-written-study/full-calibration-retained-local-v1')
        for record in retained['records']:
            expected = {key: record[key] for key in ('bytes', 'sha256')}
            assert pin(Path(record['original'])) == pin(archive / record['retained']) == expected
        for record in support['records']:
            expected = {key: record[key] for key in ('bytes', 'sha256')}
            assert pin(Path(record['original'])) == pin(Path(record['retained'])) == expected
        tokens = set()
        for record in private['excludedRecords']:
            credentials = json.loads(Path(record['origin']).read_bytes())
            tokens.add(credentials['owner_token'])
            tokens.update(participant['token'] for participant in credentials['participants'])
        assert all(re.fullmatch(r'[0-9a-f]{64}', token) for token in tokens)
        assert {hashlib.sha256(token.encode()).hexdigest() for token in tokens} == token_hashes
    ratios = [timing[i + 1]['roundedThroughput'] / timing[i]['roundedThroughput'] for i in range(0, 12, 2)]
    return {'passed': True, 'artifacts': len(paths), 'datasets': 14400, 'independentContrasts': 43156800,
            'allRetainedBytesRehashed': full_local, 'recountedCalibrationContexts': 36, 'gateOutcomes': outcomes,
            'nativeTimingRuns': 12, 'medianRoundedTimingRatio': statistics.median(ratios),
            'privateCredentialFilesRetainedLocally': 4, 'credentialValueScanPassed': True,
            'scope': 'Every compact file, original gate, source/compiler/log/report identity and all 14,400 original decision rows verified. Synthetic calibration is not actual reader preference, universal coverage, informative-loss correction or generated-quality improvement.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--full-local', action='store_true')
    args = parser.parse_args()
    print(json.dumps(verify(args.root, args.full_local), indent=2))
