"""Independent Q13b structural recount; no production imports or license proof.

Input is JSON containing archived word and registered rules, one object per line.
Output preserves unavailable historical observations. Reading-license semantics
and writer schedule verification remain separate production checks.
"""
import copy
import json
import sys

if sys.flags.optimize:
    raise RuntimeError('Assertions must be enabled')

MIGRATED = ('ks-to-x', 'gz-to-x', 'cw-to-qu', 'cx-to-x')
RULE_FIELDS = ('scans emptyScans sourceWindows ownershipUnavailable policyRefused '
               'neighborRefused eligibleTrials formed rollFailed rngDraws rngSkipped '
               'crossPartFormed sourceUnitsConsumed phonesConsumed').split()


def equal(left, right):
    """JSON equality without Python's boolean/integer coercion."""
    if type(left) is not type(right):
        return False
    if isinstance(left, dict):
        return left.keys() == right.keys() and all(equal(left[k], right[k]) for k in left)
    if isinstance(left, list):
        return len(left) == len(right) and all(equal(a, b) for a, b in zip(left, right))
    return left == right


def utf16(text):
    raw = text.encode('utf-16-le', 'surrogatepass')
    return [raw[i:i+2].decode('utf-16-le', 'surrogatepass') for i in range(0, len(raw), 2)]


def owners(cell):
    origin = cell['origin']
    return origin['sourceUnitIds'] if origin['kind'] in ('shared', 'rewrite') else [origin['unitId']]


def ids(cells):
    return [cell['id'] for cell in cells]


def complete_unit(base, cells, unit):
    extent = [cell for cell in cells if unit['id'] in owners(cell)]
    if not extent:
        return False
    origin = extent[0]['origin']
    kind = origin['kind']
    if kind == 'selection':
        return all(c['origin']['kind'] == kind and c['origin']['unitId'] == unit['id'] for c in extent) and equal(ids(extent), unit['sourceCellIds'])
    if kind not in ('licensed', 'normalized'):
        return False
    certificates = base['certificates' if kind == 'licensed' else 'normalizationCertificates']
    index = origin['certificateId']
    if type(index) is not int or not 0 <= index < len(certificates):
        return False
    cert = certificates[index]
    replacement = next((r for r in cert['replacements'] if r['unitId'] == unit['id']), None) if kind == 'licensed' else cert
    edit = next((e for e in base['edits'] if e['id'] == origin['editId']), None)
    if replacement is None or edit is None or replacement['unitId'] != unit['id'] or not equal(replacement['phoneIds'], unit['phoneIds']):
        return False
    if kind == 'normalized' and cert['editId'] != origin['editId']:
        return False
    output = [c for c in edit['output'] if c['origin']['kind'] == kind and c['origin']['unitId'] == unit['id']]
    return (all(c['origin']['kind'] == kind and c['origin']['unitId'] == unit['id'] and
                c['origin']['editId'] == origin['editId'] and c['origin']['certificateId'] == index for c in extent)
            and equal(ids(extent), ids(output)) and ''.join(c['text'] for c in extent) == replacement['after'])


def observe(word, rules):
    base = word['trace']['baseSpelling']
    assert type(base['version']) is int and base['version'] in (3, 4)
    policy = {r['id']: r for r in rules}
    assert len(policy) == len(rules)
    historical = {name: sum(e['rule'] == 'spellingRule:' + name for e in base['edits']) for name in MIGRATED}
    if base['version'] == 3:
        return dict(version=1, availability='unavailable', reason='historical-shared-eligibility-not-recorded',
                    counts=None, rules=None, events=None, historicalRegexEdits=historical)
    shared = base['shared']
    for field in ('scans', 'attempts', 'constructions', 'supersessions', 'liveConstructionIds'):
        assert isinstance(shared[field], list)
    totals = {name: dict.fromkeys(RULE_FIELDS, 0) for name in policy}
    counts = dict(words=1, constructions=len(shared['constructions']), supersessions=len(shared['supersessions']),
                  unsupportedFormedSequences=0, partialSourceConsumptions=0, phoneMultiplicityViolations=0,
                  unsupportedInputOwnership=0, silentlyDamagedConstructions=0,
                  liveConstructions=len(shared['liveConstructionIds']),
                  finalSharedCells=sum(c['origin']['kind'] == 'shared' for c in base['cells']), unresolvedCells=base['unresolvedCells'])
    for scan in shared['scans']:
        tally = totals[scan['ruleId']]
        assert isinstance(scan['candidates'], list)
        tally['scans'] += 1
        tally['emptyScans'] += int(not scan['candidates'])
        tally['sourceWindows'] += len(scan['candidates'])
    events = []
    for entry in shared['attempts']:
        attempt = entry['attempt']
        tally = totals[attempt['ruleId']]
        result = attempt['result']
        reason, draws = None, 0
        if result['status'] == 'unavailable':
            outcome, reason = 'ownership-unavailable', result['reason']
            tally['ownershipUnavailable'] += 1
        elif result['status'] == 'neighbor-refused':
            outcome, reason = 'neighbor-refused', result['neighbors']['reason']
            tally['neighborRefused'] += 1
        else:
            assert result['status'] == 'evaluated'
            trial = result['trial']
            if trial['status'] == 'refused':
                outcome, reason = 'policy-refused', trial['reason']
                tally['policyRefused'] += 1
            else:
                outcome = trial['status']
                assert outcome in ('formed', 'roll-failed')
                draws = int('roll' in trial)
                assert bool(draws) == (trial['support']['probability'] != 100)
                tally['eligibleTrials'] += 1
                tally['formed' if outcome == 'formed' else 'rollFailed'] += 1
        if outcome.endswith('refused') or outcome == 'ownership-unavailable':
            assert isinstance(reason, str)
        tally['rngDraws'] += draws
        tally['rngSkipped'] += 1 - draws
        assert (entry['constructionId'] is not None) == (outcome == 'formed')
        events.append(dict(attemptId=entry['id'], ruleId=attempt['ruleId'], slot=copy.deepcopy(attempt['slot']),
                           sourceUnitIds=list(attempt['sourceUnitIds']), outcome=outcome, reason=reason,
                           rngDraws=draws, constructionId=entry['constructionId']))
    cells = []
    assert len(base['units']) == len(base['phones'])
    for index, unit in enumerate(base['units']):
        assert equal(unit['id'], index) and equal(unit['phoneIds'], [index])
        letters = utf16(unit['afterDoubling'])
        assert len(letters) == len(unit['sourceCellIds'])
        cells.extend(dict(id=cell_id, text=letters[offset], origin=dict(kind='selection', unitId=index, offset=offset),
                          partId=base['phones'][index]['syllableIndex']) for offset, cell_id in enumerate(unit['sourceCellIds']))
    formations = {r['editId']: r for r in shared['constructions']}
    retirements = {r['editId']: r for r in shared['supersessions']}
    assert len(formations) == len(shared['constructions']) and len(retirements) == len(shared['supersessions'])
    applied, retired, consumed, live, damaged = set(), set(), set(), {}, set()
    for edit in base['edits']:
        start, end = edit['start'], edit['start'] + len(edit['input'])
        assert type(start) is int and 0 <= start <= end <= len(cells)
        assert equal(cells[start:end], edit['input'])
        record = formations.get(edit['id'])
        if record is not None:
            assert edit['id'] not in applied
            applied.add(edit['id'])
            rule = policy[record['attempt']['ruleId']]
            tally = totals[rule['id']]
            units = [base['units'][i] for i in record['sourceUnitIds']]
            phones = [i for unit in units for i in unit['phoneIds']]
            sounds = [base['phones'][i]['soundAtSpelling'] for i in phones]
            sources = set(record['sourceUnitIds'])
            extent = [c for c in cells if sources.intersection(owners(c))]
            counts['unsupportedFormedSequences'] += int(sounds != [p['sound'] for p in rule['phonemes']] or record['after'] != rule['form'] or not equal(record['reading'], dict(kind='shared-phones', sounds=sounds)))
            counts['partialSourceConsumptions'] += int(not all(complete_unit(base, cells, u) for u in units) or not equal(ids(extent), record['inputCellIds']) or not equal(ids(edit['input']), record['inputCellIds']))
            counts['phoneMultiplicityViolations'] += int(not equal(phones, record['phoneIds']) or len(set(phones)) != len(phones) or bool(consumed.intersection(phones)) or len(sources) != len(units) or any(i > record['attempt']['cursor']['lastAppendedUnitId'] for i in sources))
            counts['unsupportedInputOwnership'] += int(any(c['origin']['kind'] not in ('selection', 'licensed', 'normalized') for c in edit['input']))
            consumed.update(phones)
            tally['crossPartFormed'] += int(len({base['phones'][i]['syllableIndex'] for i in phones}) > 1)
            tally['sourceUnitsConsumed'] += len(units)
            tally['phonesConsumed'] += len(phones)
            assert record['id'] not in live
            live[record['id']] = record
        retirement = retirements.get(edit['id'])
        if retirement is not None:
            assert edit['id'] not in retired
            retired.add(edit['id'])
            assert edit['phase'] == 'gap' and equal(retirement['constructionIds'], list(live))
            assert equal(retirement['inputCellIds'], ids(cells))
            live.clear()
        cells[start:end] = edit['output']
        for identifier, record in live.items():
            positions = [i for i, c in enumerate(cells) if c['origin']['kind'] == 'shared' and c['origin']['constructionId'] == identifier]
            extent = [cells[i] for i in positions]
            intact = equal(ids(extent), record['outputCellIds']) and ''.join(c['text'] for c in extent) == record['after']
            intact = intact and (not positions or positions == list(range(positions[0], positions[0] + len(positions))))
            for offset, cell in enumerate(extent):
                origin = cell['origin']
                intact = intact and cell['partId'] == record['displayPartId'] and origin['offset'] == offset and origin['editId'] == record['editId'] and equal(origin['phoneIds'], record['phoneIds']) and equal(origin['sourceUnitIds'], record['sourceUnitIds'])
            if not intact:
                damaged.add(identifier)
    assert applied == formations.keys() and retired == retirements.keys()
    assert equal(cells, base['cells']) and equal(list(live), shared['liveConstructionIds'])
    assert ''.join(c['text'] for c in cells) == base['surface']
    assert sum(c['origin']['kind'] == 'rewrite' for c in cells) == base['unresolvedCells']
    assert all(c['origin']['constructionId'] in live for c in cells if c['origin']['kind'] == 'shared')
    counts['silentlyDamagedConstructions'] = len(damaged)
    for name, tally in totals.items():
        assert tally['sourceWindows'] == sum(tally[k] for k in ('ownershipUnavailable', 'policyRefused', 'neighborRefused', 'eligibleTrials'))
        assert tally['eligibleTrials'] == tally['formed'] + tally['rollFailed']
        assert tally['sourceWindows'] == tally['rngDraws'] + tally['rngSkipped']
        assert tally['formed'] == sum(r['attempt']['ruleId'] == name for r in shared['constructions'])
    return dict(version=1, availability='available', counts=counts,
                rules=[dict(id=name, counts=tally) for name, tally in totals.items()], events=events, historicalRegexEdits=historical)


if __name__ == '__main__':
    for line in sys.stdin:
        request = json.loads(line)
        print(json.dumps(observe(request['word'], request['rules']), ensure_ascii=True, separators=(',', ':')))
