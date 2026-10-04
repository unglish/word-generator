"""Verify complete study evidence bindings and independent publication recounts."""
from collections import Counter
import hashlib
import json


def pin(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def verify(read, entry, spec, locations, recount, gates):
    def load(origin):
        return json.loads(read(origin))

    assert entry in ('Q22', 'Q23') and locations['entry'] == entry
    registration = load(locations['registration'])
    assert registration['sourceCommit'] == spec['source']
    assert registration['datasetsPerCase'] == 1200 and registration['bootstrapReplicates'] == 999
    assert registration['totalFormalDatasets'] == 20400 and len(registration['cases']) == 17
    assert registration['contextsPerDataset'] == spec['dimensions']
    assert registration['totalReplicateContrasts'] == spec['contrasts'] and registration['confidence'] == .95
    native = locations['native']
    oracle = locations['oracle']
    decisions = locations['decisions']
    native_before = load(native + '/before.json')['before']
    assert native_before['sourceCommit'] == spec['source']
    assert native_before['operators']['registration-v1.json'] == pin(read(locations['registration']))
    completion = load(native + '/complete.json')
    assert completion['passed'] is True and completion['completed'] == 20400
    assert completion['contrasts'] == spec['contrasts'] and completion['preflight'] is False
    assert completion['before'] == pin(read(native + '/before.json')) and completion['after'] == native_before
    independent = load(oracle + '/complete.json')
    assert independent['passed'] is True and independent['datasets'] == 20400
    assert independent['contrasts'] == spec['contrasts']
    assert independent['inputCompletion'] == pin(read(native + '/complete.json'))
    assert independent['runtimeIdentity'] == pin(read(oracle + '/before.json'))
    assert independent['datasetResults'] == pin(read(oracle + '/datasets.json'))
    assert independent['case_counts'] == {case['id']: 1200 for case in registration['cases']}
    independent_datasets = load(oracle + '/datasets.json')
    assert len(independent_datasets) == 20400
    assert len({(item['scenario'], item['datasetIndex']) for item in independent_datasets}) == 20400
    assert Counter(item['scenario'] for item in independent_datasets) == Counter(independent['case_counts'])
    assert all(type(item['datasetIndex']) is int and 0 <= item['datasetIndex'] < 1200 for item in independent_datasets)
    assert all(item['contrasts'] == 999 * spec['dimensions'] for item in independent_datasets)
    assert sum(item['contrasts'] for item in independent_datasets) == spec['contrasts']
    verdict = load(decisions + '/complete.json')
    assert verdict['passed'] is True and verdict['datasets'] == 20400 and verdict['contrasts'] == spec['contrasts']
    assert verdict['summary'] == pin(read(decisions + '/summary.json'))
    assert verdict['inputs']['full'] == pin(read(native + '/complete.json'))
    assert verdict['inputs']['independent'] == pin(read(oracle + '/complete.json'))
    assert verdict['inputs']['registration'] == pin(read(locations['registration']))
    assert completion['results'] == verdict['inputs']['results'] == pin(read(native + '/results.jsonl'))
    rows = [json.loads(line) for line in read(native + '/results.jsonl').splitlines()]
    cases = {case['id'] for case in registration['cases']}
    assert len(cases) == 17 and len(rows) == 20400
    assert Counter(row['scenario'] for row in rows) == Counter({case: 1200 for case in cases})
    assert len({(row['scenario'], row['datasetIndex']) for row in rows}) == 20400
    archive = load(locations['archiveIndex'])
    assert archive['passed'] is True and archive['sourceCommit'] == spec['source']
    assert archive['datasets'] == 20400 and archive['rawArtifacts'] == 40800 and archive['contrasts'] == spec['contrasts']
    assert len(archive['records']) == len({record['logical'] for record in archive['records']}) == archive['files']
    retention = load(locations['retention'] + '/complete.json')
    assert retention['passed'] is True and retention['index'] == pin(read(locations['archiveIndex']))
    raw_records = {record['original']: record for record in archive['records']
                   if record['original'].startswith(native + '/')
                   and record['original'].endswith(('-input.json.gz', '-inference.json.gz'))}
    assert len(raw_records) == 40800
    for row in rows:
        assert type(row['datasetIndex']) is int and 0 <= row['datasetIndex'] < 1200
        for label in ('input', 'inference'):
            origin = native + '/' + row['scenario'] + '/' + str(row['datasetIndex']).zfill(4) + '-' + label + '.json.gz'
            record = raw_records[origin]
            assert {key: record[key] for key in ('bytes', 'sha256')} == row['artifacts'][label]
    assert [(row['scenario'], row['datasetIndex']) for row in rows] == [(item['scenario'], item['datasetIndex']) for item in independent_datasets]
    assert all(item['withheld'] == sum(context['interval'] is None for context in row['results']) for row, item in zip(rows, independent_datasets))
    report, supplement = recount.recount(entry, registration, rows)
    recount.compare(load(decisions + '/summary.json'), report)
    assert len(report['contexts']) == spec['reportContexts'] and report['registeredContexts'] == spec['registeredContexts']
    assert verdict['passesRegisteredCalibration'] is report['passesRegisteredCalibration']
    publication_recount = load(locations['recount'] + '/complete.json')
    assert publication_recount['passed'] is True and publication_recount['datasets'] == 20400
    assert publication_recount['contrasts'] == spec['contrasts']
    assert publication_recount['originalDecisionCompletion'] == pin(read(decisions + '/complete.json'))
    assert publication_recount['independentSummary'] == pin(read(locations['recount'] + '/independent-summary.json'))
    assert publication_recount['supplemental'] == pin(read(locations['recount'] + '/supplemental-width-direction.json'))
    assert publication_recount['passesRegisteredCalibration'] is report['passesRegisteredCalibration']
    assert publication_recount['failedRegisteredContexts'] == len(report['failedRegisteredContexts'])
    recount.compare(load(locations['recount'] + '/independent-summary.json'), report)
    recount.compare(load(locations['recount'] + '/supplemental-width-direction.json'), supplement)
    gate_registration = load(locations['gateRegistration'])
    assert gate_registration['entry'] == entry and gate_registration['commits']['candidate'] == spec['source']
    assert gate_registration['commits']['control'] == spec['control']
    gate_report = gates.verify(read, locations['gateRegistration'], locations['gateVerifier'])
    initial = load(gate_registration['out'] + '/initial.json')['initial']
    assert initial['sources']['candidate']['tracked'] == native_before['sourceFiles']
    portable = load(locations['portableGates'] + '/complete.json')
    assert portable['passed'] is True and portable['entry'] == entry
    assert portable['commands'] == 28 and portable['nativeTimingRuns'] == 12
    assert portable['passingOriginalCommands'] == gate_report['passingCommands']
    assert portable['failedOriginalCommands'] == gate_report['failedCommands']
    assert portable['fullRetainedIndex'] == pin(read(locations['archiveIndex']))
    assert portable['report'] == pin(read(locations['portableGates'] + '/portable-gate-recount.json'))
    assert load(locations['portableGates'] + '/portable-gate-recount.json') == gate_report
    control = load(locations['controlPublication'])
    assert control['passed'] is True
    references = [record for record in control['records'] if record['entry'] == entry]
    assert len(references) == 1
    reference = references[0]
    assert reference['control'] == spec['control'] and reference['branch'] == spec['controlBranch']
    assert reference['exitCode'] == 0 and reference['remoteVerified'].split() == [spec['control'], 'refs/heads/' + spec['controlBranch']]
    return {'entry': entry, 'datasets': 20400, 'contrasts': spec['contrasts'],
            'sourceCommit': spec['source'], 'controlCommit': spec['control'],
            'calibrationPassed': report['passesRegisteredCalibration'],
            'failedRegisteredContexts': len(report['failedRegisteredContexts']),
            'originalGatePassing': gate_report['passingCommands'], 'originalGateFailing': gate_report['failedCommands'],
            'report': report, 'supplement': supplement, 'gates': gate_report,
            'scope': 'Complete original native dataset journal,raw artifact hash bindings,independent completion,registered decisions and gate/log/compiler/timing recounts. Full raw/source/runtime contents require full local verification. Synthetic evidence only; failed calibration/gates stay failed. No human-quality claim or current-main certification.'}
