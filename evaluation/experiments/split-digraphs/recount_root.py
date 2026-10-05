"""Independent final-root obligation accounting after producer semantic verification."""
from collections import Counter
from recount_structure import check_surface


def indexed(entries, identity):
    return entries[identity] if type(identity) is int and 0 <= identity < len(entries) else None


def current_reading(trace, phone, config):
    identity = phone['id']; unit = indexed(trace['units'], identity)
    if not unit or unit['id'] != identity or unit['phoneIds'] != [identity]:
        return None
    positions = []
    for index, cell in enumerate(trace['cells']):
        origin = cell['origin']
        if origin['kind'] in ('rewrite', 'shared') and identity in origin['sourceUnitIds']:
            return None
        if origin.get('unitId') == identity:
            if origin['kind'] not in ('selection', 'licensed', 'normalized', 'completion'):
                return None
            positions.append(index)
    if not positions or positions != list(range(positions[0], positions[-1] + 1)):
        return None
    cells = [trace['cells'][index] for index in positions]; first = cells[0]['origin']
    if len(set(cell['id'] for cell in cells)) != len(cells):
        return None
    for offset, cell in enumerate(cells):
        origin = cell['origin']
        if origin['kind'] != first['kind'] or origin['offset'] != offset or cell.get('partId') != phone['syllableIndex']:
            return None
        if first['kind'] != 'selection' and (origin['certificateId'] != first['certificateId'] or
                origin['editId'] != first['editId'] or origin['sourceUnitIds'] != [identity]):
            return None
    form = ''.join(cell['text'] for cell in cells)
    reading = None
    if first['kind'] == 'selection':
        selected = indexed(config['graphemes'], unit.get('inventoryIndex'))
        if [cell['id'] for cell in cells] != unit['sourceCellIds'] or form != unit['afterDoubling'] or not selected:
            return None
        if selected['form'] != unit['selected'] or selected['phoneme'] != phone['soundAtSpelling']:
            return None
        realizations = config.get('doubling', {}).get('realizations')
        reading = selected.get('reading')
        if realizations is not None and form != selected['form']:
            rules = [rule for rule in realizations if rule['phoneme'] == selected['phoneme'] and rule['from'] == selected['form'] and rule['to'] == form]
            reading = rules[0].get('reading') if len(rules) == 1 else None
    elif first['kind'] == 'licensed':
        certificate = indexed(trace['certificates'], first['certificateId'])
        if not certificate or certificate['id'] != first['certificateId']:
            return None
        replacements = [entry for entry in certificate['replacements'] if entry['unitId'] == identity]
        if len(replacements) != 1:
            return None
        replacement = replacements[0]
        if replacement['phoneIds'] != [identity] or replacement['after'] != form or replacement['partId'] != phone['syllableIndex']:
            return None
        reading = replacement.get('reading')
    else:
        certificates = trace['completion']['certificates'] if first['kind'] == 'completion' else trace['normalizationCertificates']
        certificate = indexed(certificates, first['certificateId'])
        if not certificate or certificate['id'] != first['certificateId'] or certificate['editId'] != first['editId'] or certificate['unitId'] != identity or certificate['phoneIds'] != [identity] or certificate['after'] != form or certificate['partId'] != phone['syllableIndex']:
            return None
        if first['kind'] == 'completion' and certificate['outputCellIds'] != [cell['id'] for cell in cells]:
            return None
        reading = certificate.get('reading' if first['kind'] == 'completion' else 'targetReading')
    return (reading, positions[-1]) if reading else None


def recount_root(trace, config):
    counts = Counter()
    for phone in trace['phones']:
        if phone['segment'] != 'nucleus':
            continue
        if trace['version'] not in (4, 5):
            counts['finalRootOwnershipUnavailableNuclei'] += 1
            continue
        live = [record for record in trace.get('split', {}).get('constructions', [])
                if record['id'] in trace['split']['liveConstructionIds'] and record['nucleusUnitId'] == phone['id']]
        if live:
            if len(live) != 1:
                raise ValueError('multiple live nucleus constructions')
            check_surface(trace['cells'], trace['phones'], live[0], config['splitVowels']['supports'])
            counts['finalRoot:satisfied'] += 1; counts['finalRoot:satisfied:split'] += 1
            continue
        resolved = current_reading(trace, phone, config)
        if resolved is None:
            status = 'unavailable'
        elif resolved[0]['kind'] != 'open-vowel-or-split-marker':
            status = 'not-target'
        else:
            following = trace['cells'][resolved[1] + 1:]
            closed = any(entry['segment'] == 'coda' and entry['syllableIndex'] == phone['syllableIndex'] for entry in trace['phones'])
            if not closed and any(cell.get('partId') is None for cell in following):
                status = 'unavailable'
            elif not closed and not any(cell['partId'] == phone['syllableIndex'] for cell in following):
                status = 'satisfied'; counts['finalRoot:satisfied:open'] += 1
            else:
                status = 'unresolved'
        counts['finalRoot:' + status] += 1
    return dict(counts)
