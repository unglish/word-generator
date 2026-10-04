"""Independent complete-dataset recount for Q22/Q23 publication reports."""
from collections import Counter
from decimal import Decimal, localcontext
import math
import statistics

TRUTHS = ('population_full', 'population_conditional', 'finite_full', 'finite_conditional')
STRATA = (None, 'short', 'long')
METRICS = (
    {'name': 'intended_phones', 'accepted': False},
    {'name': 'intended_phones_and_stress', 'accepted': False},
    {'name': 'accepted_phones', 'accepted': True},
    {'name': 'accepted_phones_and_stress', 'accepted': True},
)


def score_interval(successes, trials):
    assert type(successes) is int and 0 <= successes <= trials and trials > 0
    with localcontext() as context:
        context.prec = 60
        n, k = Decimal(trials), Decimal(successes)
        z = Decimal('1.9599639845400542355245944305205515279555500778695')
        a, b, c = n + z * z, -(2 * k + z * z), k * k / n
        root = (b * b - 4 * a * c).sqrt()
        return [float(max(Decimal(0), (-b - root) / (2 * a))),
                float(min(Decimal(1), (-b + root) / (2 * a)))]


def compare(actual, expected):
    if isinstance(expected, dict):
        assert isinstance(actual, dict) and set(actual) == set(expected)
        for key in expected:
            compare(actual[key], expected[key])
    elif isinstance(expected, list):
        assert isinstance(actual, list) and len(actual) == len(expected)
        for left, right in zip(actual, expected):
            compare(left, right)
    elif type(expected) is float:
        assert type(actual) in (int, float) and math.isfinite(actual)
        assert math.isclose(actual, expected, rel_tol=0, abs_tol=1e-12)
    else:
        assert type(actual) is type(expected) and actual == expected


def finite_or_none(value):
    assert value is None or type(value) in (int, float) and math.isfinite(value)


def dimensions(entry, registration):
    result = []
    for stratum in STRATA:
        if entry == 'Q22':
            for cohort in ('all-ratings', 'unfamiliar-only'):
                result.append({'stratum': stratum, 'cohort': cohort,
                               'primary': stratum is None and cohort == registration['inferenceEligibility']['primaryCohort']})
        else:
            assert entry == 'Q23'
            for metric in METRICS:
                result.append({'stratum': stratum, 'metric': metric['name'],
                               'primary': stratum is None and metric['name'] == registration['inferenceEligibility']['primaryMetric']})
    return result


def validate_context(context, dimension):
    for key, value in dimension.items():
        compare(context[key], value)
    for key in ('stratum', 'cohort', 'metric'):
        if key in dimension:
            compare(context['truth'][key], dimension[key])
    finite_or_none(context['point'])
    interval = context['interval']
    assert isinstance(context['withheldReasons'], list)
    assert bool(context['withheldReasons']) == (interval is None)
    if interval is not None:
        assert isinstance(interval, list) and len(interval) == 2
        assert all(type(value) in (int, float) and math.isfinite(value) for value in interval)
        assert interval[0] <= interval[1] and context['point'] is not None
    assert set(context['coverage']) == set(TRUTHS)
    assert set(context['truth']['contrasts']) == set(TRUTHS)
    for truth in TRUTHS:
        target = context['truth']['contrasts'][truth]
        finite_or_none(target)
        flag = context['coverage'][truth]
        assert type(flag) is bool
        assert flag == bool(interval is not None and target is not None and interval[0] <= target <= interval[1])
    assert type(context['rejectsZero']) is bool
    assert context['rejectsZero'] == bool(interval is not None and (interval[0] > 0 or interval[1] < 0))


def mean(values):
    return float(statistics.mean(values)) if values else None


def rejection_required(entry, scenario, dimension):
    if entry == 'Q22':
        return scenario['deltaFavorable'] == 0
    metric = next(metric for metric in METRICS if metric['name'] == dimension['metric'])
    unequal_acceptance = scenario['acceptanceSets'] == 'candidate-A-I-AB' and metric['accepted']
    return scenario['deltaA'] == 0 and not unequal_acceptance


def effect_sign(entry, scenario):
    delta = scenario['deltaFavorable'] if entry == 'Q22' else scenario['deltaA']
    if delta > 0:
        return 1
    if delta < 0:
        return -1
    return 0


def context_summary(entry, scenario, dimension, contexts):
    available = [context for context in contexts if context['interval'] is not None]
    coverage = {truth: sum(context['coverage'][truth] for context in contexts) for truth in TRUTHS}
    rejected = sum(context['rejectsZero'] for context in contexts)
    null_gate = rejection_required(entry, scenario, dimension)
    registered = scenario['role'] == 'calibration' and dimension['stratum'] is None
    gates = {'availability': len(available) / 1200 >= .95,
             'fullPopulationCoverage': score_interval(coverage['population_full'], 1200)[0] >= .90,
             'structuralNullRejection': score_interval(rejected, 1200)[1] <= .075 if null_gate else None}
    bias = {}
    for truth in ('population_full', 'population_conditional'):
        differences = [context['point'] - context['truth']['contrasts'][truth] for context in contexts
                       if context['point'] is not None and context['truth']['contrasts'][truth] is not None]
        bias[truth] = mean(differences)
    widths = [context['interval'][1] - context['interval'][0] for context in available]
    sign = effect_sign(entry, scenario)
    directional = None
    if sign:
        directional = sum(context['interval'][0] > 0 if sign > 0 else context['interval'][1] < 0 for context in available)
    result = {'scenario': scenario['id'], 'role': scenario['role'], **dimension,
              'datasets': 1200, 'available': len(available), 'availability': len(available) / 1200,
              'coverage': {truth: {'covered': covered, 'allDatasetRate': covered / 1200,
                         'wilson95': score_interval(covered, 1200),
                         'availableOnlyRate': covered / len(available) if available else None} for truth, covered in coverage.items()},
              'zeroRejection': {'rejected': rejected, 'allDatasetRate': rejected / 1200, 'wilson95': score_interval(rejected, 1200)},
              'fullPopulationBias': bias['population_full'], 'conditionalPopulationBias': bias['population_conditional'],
              'withheldReasons': dict(Counter(reason for context in contexts for reason in context['withheldReasons'])),
              'structurallyNull': null_gate, 'registeredCalibrationGate': registered,
              'gates': gates if registered else None,
              'passesRegisteredGate': all(value is not False for value in gates.values()) if registered else None}
    if entry == 'Q22':
        result['meanAvailableIntervalWidth'] = mean(widths)
        result['directionalDetection'] = None if directional is None else {
            'detected': directional, 'allDatasetRate': directional / 1200, 'wilson95': score_interval(directional, 1200)}
    deviation = statistics.stdev(widths) if len(widths) > 1 else None
    supplemental = {'scenario': scenario['id'], **dimension, 'datasets': 1200,
                    'availableIntervals': len(widths), 'meanWidth': mean(widths),
                    'widthStandardDeviation': deviation,
                    'widthMonteCarloStandardError': deviation / math.sqrt(len(widths)) if deviation is not None else None,
                    'minimumWidth': min(widths) if widths else None,
                    'medianWidth': statistics.median(widths) if widths else None,
                    'maximumWidth': max(widths) if widths else None,
                    'registeredEffectDirection': sign, 'directionalDetections': directional,
                    'allDatasetDirectionalRate': directional / 1200 if directional is not None else None,
                    'scope': 'Descriptive widths/directional detection only; no additional power or promotion gate.'}
    return result, supplemental


def recount(entry, registration, rows):
    assert entry in ('Q22', 'Q23')
    assert registration['datasetsPerCase'] == 1200 and registration['bootstrapReplicates'] == 999
    assert registration['totalFormalDatasets'] == 20400
    assert len(registration['cases']) == 17 and len(rows) == 20400
    assert Counter(row['scenario'] for row in rows) == Counter({case['id']: 1200 for case in registration['cases']})
    assert len({(row['scenario'], row['datasetIndex']) for row in rows}) == 20400
    groups = {}
    dims = dimensions(entry, registration)
    for scenario in registration['cases']:
        datasets = [row for row in rows if row['scenario'] == scenario['id']]
        assert [row['datasetIndex'] for row in datasets] == list(range(1200))
        for row in datasets:
            assert row['role'] == scenario['role'] and len(row['results']) == len(dims)
            for dimension, context in zip(dims, row['results']):
                validate_context(context, dimension)
                key = (scenario['id'], tuple(dimension.items()))
                groups.setdefault(key, []).append(context)
    results, supplements = [], []
    for scenario in registration['cases']:
        for dimension in dims:
            contexts = groups[scenario['id'], tuple(dimension.items())]
            assert len(contexts) == 1200
            result, supplemental = context_summary(entry, scenario, dimension, contexts)
            results.append(result)
            supplements.append(supplemental)
    registered = [result for result in results if result['registeredCalibrationGate']]
    assert len(registered) == (28 if entry == 'Q22' else 60)
    assert len(results) == (102 if entry == 'Q22' else 204)
    report = {'contexts': results, 'passesRegisteredCalibration': all(result['passesRegisteredGate'] for result in registered),
              'registeredContexts': len(registered), 'failedRegisteredContexts': [result for result in registered if not result['passesRegisteredGate']]}
    return report, supplements
