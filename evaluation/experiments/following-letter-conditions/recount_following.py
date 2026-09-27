"""Independent accounting of authenticated traces; no generator/observer imports.

This checks extent, reading, adjacency and arithmetic. Prior semantic licenses
and generation schedules must additionally pass the producer evidence verifier.
"""
from collections import Counter

STRATA = ('soft-c:c', 'soft-c:sc', 'soft-g:g', 'hard-c:c', 'hard-g:g', 'hard-g:gu', 'other')
OWNERSHIP = ('single-owned', 'joint-owned', 'unavailable', 'outside-supported-version')
READINGS = ('contextual-compatible', 'contextual-incompatible', 'context-unavailable', 'non-contextual', 'reading-unavailable')
SINGLE = ('selection', 'licensed', 'normalized', 'completion')


def at(items, identity):
    return items[identity] if type(identity) is int and 0 <= identity < len(items) else None


def stratum(sound, form):
    return {('s', 'c'): 'soft-c:c', ('s', 'sc'): 'soft-c:sc', ('dʒ', 'g'): 'soft-g:g',
            ('k', 'c'): 'hard-c:c', ('g', 'g'): 'hard-g:g', ('g', 'gu'): 'hard-g:gu'}.get((sound, form), 'other')


def selected_reading(config, phone, unit):
    entry = at(config['graphemes'], unit.get('inventoryIndex'))
    if not entry or (entry['phoneme'], entry['form']) != (phone['soundAtSpelling'], unit['selected']):
        return None
    rules = config.get('doubling', {}).get('realizations')
    if rules is None or unit['afterDoubling'] == entry['form']:
        return entry.get('reading')
    matches = [rule for rule in rules if (rule['phoneme'], rule['from'], rule['to']) ==
               (entry['phoneme'], entry['form'], unit['afterDoubling'])]
    if len(matches) > 1:
        raise ValueError('duplicate doubling realization')
    return matches[0]['reading'] if matches else None


def extent(base, phone, unit, config):
    identity = phone['id']
    if unit['id'] != identity or unit['choiceId'] != identity or unit['phoneIds'] != [identity]:
        return None
    if phone.get('boundary', {}).get('phoneme', {}).get('sound') != phone['soundAtSpelling']:
        return None
    positions = []
    for index, cell in enumerate(base['cells']):
        origin = cell['origin']
        if origin['kind'] in ('rewrite', 'shared') and identity in origin['sourceUnitIds']:
            return None
        if origin['kind'] == 'split-vowel' and origin['unitId'] == identity:
            return None
        if origin['kind'] in SINGLE and origin['unitId'] == identity:
            positions.append(index)
    if not positions or positions != list(range(positions[0], positions[-1] + 1)):
        return None
    cells = [base['cells'][index] for index in positions]
    ids = [cell['id'] for cell in cells]
    if len(set(ids)) != len(ids):
        return None
    first = cells[0]['origin']
    for offset, cell in enumerate(cells):
        origin = cell['origin']
        if origin['kind'] != first['kind'] or origin['offset'] != offset or cell['partId'] != phone['syllableIndex']:
            return None
        if first['kind'] != 'selection' and any((origin['certificateId'] != first['certificateId'],
                origin['editId'] != first['editId'], origin['sourceUnitIds'] != [identity])):
            return None
    form = ''.join(cell['text'] for cell in cells)
    kind = first['kind']
    if kind == 'selection':
        if ids != unit['sourceCellIds'] or form != unit['afterDoubling']:
            return None
        reading = selected_reading(config, phone, unit)
    else:
        tables = {'licensed': base.get('certificates', []), 'normalized': base.get('normalizationCertificates', []),
                  'completion': base.get('completion', {}).get('certificates', [])}
        certificate = at(tables[kind], first['certificateId'])
        if not certificate or certificate['id'] != first['certificateId']:
            return None
        if kind == 'licensed':
            replacements = [item for item in certificate['replacements'] if item['unitId'] == identity]
            if len(replacements) != 1:
                return None
            evidence = replacements[0]
        else:
            evidence = certificate
            if evidence['editId'] != first['editId'] or evidence['unitId'] != identity:
                return None
        if evidence['phoneIds'] != [identity] or evidence['after'] != form or evidence['partId'] != phone['syllableIndex']:
            return None
        if kind == 'completion' and evidence['outputCellIds'] != ids:
            return None
        reading = evidence.get('targetReading' if kind == 'normalized' else 'reading')
    return {'form': form, 'cellIds': ids, 'reading': reading, 'end': positions[-1] + 1}


def classification(reading, context):
    if not reading or reading['kind'] == 'unsupported-construction':
        return 'reading-unavailable'
    if reading['kind'] != 'following-letter':
        return 'non-contextual'
    if context['kind'] == 'unavailable':
        return 'context-unavailable'
    letter = context.get('letter', '').lower()
    rejected = ('require' in reading and letter not in reading['require']) or letter in reading.get('forbid', [])
    return 'contextual-incompatible' if rejected else 'contextual-compatible'


def interpretation(event):
    if event['ownership'] != 'single-owned' or event.get('readingStatus') == 'reading-unavailable':
        return 'unsupported-evidence'
    context = event.get('context', {'kind': 'unavailable'})
    if context['kind'] == 'unavailable':
        return 'unsupported-evidence'
    front = context.get('letter', '').lower() in ('e', 'i', 'y')
    target = event['stratum']
    if target == 'hard-g:g' and front:
        return 'hard-g-exception-sensitive'
    if target.startswith('soft-') and not front:
        return 'productive-soft-pattern-departure'
    if target == 'hard-c:c' and front:
        return 'hard-c-pattern-departure'
    if event.get('readingStatus') == 'contextual-incompatible':
        return 'other-declared-context-departure'
    return 'no-departure-established'


def observe(word, config):
    base = word['trace']['baseSpelling']
    events = []
    for phone in base['phones']:
        unit = at(base['units'], phone['id'])
        for boundary in ('selection', 'final-root'):
            event = dict(boundary=boundary, phoneId=phone['id'], sound=phone['soundAtSpelling'],
                         selected=unit['selected'] if unit else None, form=None, stratum='other',
                         selectionStratum=stratum(phone['soundAtSpelling'], unit['afterDoubling'] if unit else None),
                         ownership='unavailable', finalAssembled='unavailable')
            if unit and boundary == 'selection':
                following = ''.join(item['afterDoubling'] for item in base['units'][unit['id'] + 1:])
                event.update(ownership='single-owned', form=unit['afterDoubling'], cellIds=unit['sourceCellIds'],
                             reading=selected_reading(config, phone, unit),
                             context={'kind': 'letter', 'letter': following[0], 'origin': 'reconstructed-selection'}
                             if following else {'kind': 'root-edge'})
            elif unit and base['version'] not in (4, 5):
                event['ownership'] = 'outside-supported-version'
            elif unit:
                shared = base.get('shared', {})
                joints = [item for item in shared.get('constructions', []) if item['id'] in shared['liveConstructionIds']
                          and phone['id'] in item['phoneIds']]
                if len(joints) > 1:
                    raise ValueError('multiple live shared owners')
                if joints:
                    joint = joints[0]
                    event.update(ownership='joint-owned', form=joint['after'], cellIds=joint['outputCellIds'], constructionId=joint['id'])
                else:
                    owned = extent(base, phone, unit, config)
                    if owned:
                        end = owned.pop('end')
                        next_cell = at(base['cells'], end)
                        event.update(owned, ownership='single-owned',
                                     context={'kind': 'letter', 'letter': next_cell['text'], 'origin': next_cell['origin']['kind']}
                                     if next_cell else {'kind': 'root-edge'})
            if event['ownership'] == 'single-owned':
                event['stratum'] = stratum(event['sound'], event['form'])
                event['readingStatus'] = classification(event.get('reading'), event['context'])
            event['interpretation'] = interpretation(event)
            if event.get('reading') is None:
                event.pop('reading', None)
            events.append(event)
    counts = Counter(words=1, phones=len(base['phones']))
    for boundary in ('selection', 'final-root'):
        for axis, values in (('ownership', OWNERSHIP), ('reading', READINGS)):
            for value in values:
                counts[f'{boundary}:{axis}:{value}'] = 0
                for target in STRATA:
                    counts[f'{boundary}:stratum:{target}:{axis}:{value}'] = 0
                    if axis == 'ownership':
                        counts[f'{boundary}:selectionCohort:{target}:ownership:{value}'] = 0
    for event in events:
        boundary = event['boundary']
        for axis, field in (('ownership', 'ownership'), ('reading', 'readingStatus')):
            if field in event:
                value = event[field]
                counts[f'{boundary}:{axis}:{value}'] += 1
                counts[f'{boundary}:stratum:{event["stratum"]}:{axis}:{value}'] += 1
        counts[f'{boundary}:interpretation:{event["interpretation"]}'] += 1
        counts[f'{boundary}:selectionCohort:{event["selectionStratum"]}:ownership:{event["ownership"]}'] += 1
    selected = {event['phoneId']: event for event in events if event['boundary'] == 'selection'}
    for root in (event for event in events if event['boundary'] == 'final-root'):
        original = selected[root['phoneId']]
        before = original.get('readingStatus', original['ownership'])
        after = root.get('readingStatus', root['ownership'])
        counts[f'transition:{original["selectionStratum"]}:{before}:{after}'] += 1
    return {'counts': dict(counts), 'events': events}


def compare(word, config, production):
    independent = observe(word, config)
    if independent['counts'] != production['counts']:
        raise ValueError('following-letter count disagreement')
    # Refusal messages are producer diagnostics, not independently certified.
    expected = [{key: value for key, value in event.items() if key != 'reason'} for event in production['events']]
    if independent['events'] != expected:
        raise ValueError('following-letter event disagreement')
    return len(independent['events']), len(independent['counts'])
