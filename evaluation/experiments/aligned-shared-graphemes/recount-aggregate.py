"""Independent Q13b groups and full first witnesses; no JavaScript execution.

This module compares all derived report fields. Archive authority verification is
separate. Certificate counts do not independently prove phonological licenses.
"""
from collections import Counter
import copy
import json
from pathlib import Path
import runpy
import sys

if sys.flags.optimize:
    raise RuntimeError('Assertions must be enabled')

ROOT = Path(__file__).resolve().parent
shared = runpy.run_path(str(ROOT / 'recount-shared.py'))
repairs = runpy.run_path(str(ROOT / 'recount-repairs.py'))
doubling = runpy.run_path(str(ROOT / 'recount-doubling.py'))
key = doubling['key']
LIMITS = [
    'Groups overlap; do not sum different grouping dimensions.',
    'Selected forms describe original sampler outcomes, not final pronunciations.',
    'Historical regex edit counts do not establish historical eligibility.',
    'Repair replay uses the implementation verifier; independent recount remains separate.',
    'Shared reading ownership is root-level; final morphology remains separately unresolved.',
]


def order(value):
    return value.encode('utf-16-be', 'surrogatepass')


def merge(target, source):
    for name, amount in source.items():
        assert type(amount) is int and amount >= 0
        target[name] += amount
        assert target[name] <= 2**53 - 1


def recount(rows, rules, ordinary_relations):
    groups, witnesses = {}, {}
    word_count = 0
    allowed = {tuple(relation) for relation in ordinary_relations}
    for row in rows:
        word = row['word']
        base = word['trace']['baseSpelling']
        observation = shared['observe'](word, rules)
        repair_counts = repairs['recount'](word)
        doubling_counts, _ = doubling['event_observation'](word, allowed)
        events, selected, realized = Counter(), Counter(), Counter()
        for unit in base['units']:
            selected[key([base['phones'][unit['phoneIds'][0]]['soundAtSpelling'], unit['selected'], unit['afterDoubling']])] += 1
        def remember(category, extra):
            if category not in witnesses:
                witnesses[category] = dict(category=category,
                    coordinate={k: row[k] for k in ('profile', 'seed', 'drawIndex')},
                    **copy.deepcopy(extra), word=copy.deepcopy(word))
        for event in observation['events'] or []:
            category = key([event['ruleId'], event['slot']['phase'], event['outcome'], event['reason']])
            events[category] += 1
            forms = [[base['units'][i]['selected'], base['units'][i]['afterDoubling']] for i in event['sourceUnitIds']]
            cross_part = len({base['phones'][i]['syllableIndex'] for i in event['sourceUnitIds']}) > 1
            remember(key([row['profile'], category, forms, cross_part]),
                     dict(attemptId=event['attemptId'], sourceForms=forms, crossPart=cross_part))
        for record in base['shared']['constructions'] if base['version'] == 4 else []:
            realized[key([record['attempt']['ruleId'], record['reading']['sounds'], record['after']])] += 1
        for name in ('unsupportedFormedSequences', 'partialSourceConsumptions', 'phoneMultiplicityViolations',
                     'unsupportedInputOwnership', 'silentlyDamagedConstructions'):
            if (observation['counts'] or {}).get(name):
                remember(key([row['profile'], 'violation', name]), dict(violation=name))
        dimensions = doubling['dimensions'](row) + [
            ['written-length', row['profile'], len(word['written']['clean'].encode('utf-16-le', 'surrogatepass')) // 2],
            ['root-phone-length', row['profile'], len(base['phones'])]]
        for dimension in dimensions:
            name = key(dimension)
            if name not in groups:
                groups[name] = dict(dimensions=dimension, words=0, availableWords=0, unavailableWords=0,
                    sharedCounts=Counter(), ruleCounts={}, events=Counter(), selectedForms=Counter(),
                    realizedForms=Counter(), historicalRegexEdits=Counter(), repairReplay=Counter(), doublingCounts=Counter())
            group = groups[name]
            group['words'] += 1
            if observation['availability'] == 'available':
                group['availableWords'] += 1
                merge(group['sharedCounts'], observation['counts'])
                for rule in observation['rules']:
                    merge(group['ruleCounts'].setdefault(rule['id'], Counter()), rule['counts'])
            else:
                group['unavailableWords'] += 1
            for field, values in (('events', events), ('selectedForms', selected), ('realizedForms', realized),
                                  ('historicalRegexEdits', observation['historicalRegexEdits']),
                                  ('repairReplay', repair_counts), ('doublingCounts', doubling_counts)):
                merge(group[field], values)
        word_count += 1
    output = []
    for name in sorted(groups, key=order):
        group = groups[name]
        available, unavailable = group.pop('availableWords'), group.pop('unavailableWords')
        rule_counts = group.pop('ruleCounts')
        group['rules'] = [dict(id=identifier, counts=dict(rule_counts[identifier])) for identifier in sorted(rule_counts, key=order)] if available else None
        if not available:
            group['sharedCounts'] = None
        group['sharedAvailability'] = dict(status=('partial' if available else 'unavailable') if unavailable else 'available',
                                           availableWords=available, unavailableWords=unavailable)
        output.append(group)
    return dict(version=1, words=word_count, groups=output,
                witnesses=[witnesses[k] for k in sorted(witnesses, key=order)], limits=LIMITS)


def exact(actual, expected, path='$'):
    """Reject missing/extra keys and bool-as-int matches throughout witnesses."""
    if isinstance(expected, dict):
        assert type(actual) is dict and actual.keys() == expected.keys(), (path, 'object keys')
        return sum(exact(actual[k], v, path + '.' + k) for k, v in expected.items())
    if isinstance(expected, list):
        assert type(actual) is list and len(actual) == len(expected), (path, 'array length')
        return sum(exact(a, b, f'{path}[{i}]') for i, (a, b) in enumerate(zip(actual, expected)))
    assert type(actual) is type(expected) and actual == expected, (path, actual, expected)
    return int(type(expected) is int)


def compare(report, rows, rules, ordinary_relations):
    expected = recount(rows, rules, ordinary_relations)
    comparisons = exact(report, expected)
    return dict(words=expected['words'], groups=len(expected['groups']), integerComparisons=comparisons,
                fullWitnesses=len(expected['witnesses']))


if __name__ == '__main__':
    request = json.load(sys.stdin)
    if 'report' in request:
        result = compare(request['report'], request['rows'], request['rules'], request['ordinaryRelations'])
    else:
        result = recount(request['rows'], request['rules'], request['ordinaryRelations'])
    json.dump(result, sys.stdout, ensure_ascii=True, separators=(',', ':'))
    sys.stdout.write('\n')
