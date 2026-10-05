"""Independent split-cell and retirement accounting; no TypeScript producer imports."""
from recount_completion import require


def check_surface(cells, phones, record, supports):
    identity = record['id']
    owned = [(index, cell) for index, cell in enumerate(cells)
             if cell['origin']['kind'] == 'split-vowel' and cell['origin']['constructionId'] == identity]
    expected_ids = record['componentCellIds'] + record['markerCellIds']
    require([cell['id'] for _, cell in owned] == expected_ids, 'split cell identities')
    positions = {}
    for role, form in [('component', record['reading']['component']), ('marker', record['reading']['marker'])]:
        group = [(index, cell) for index, cell in owned if cell['origin']['role'] == role]
        require(len(group) == len(form) > 0, 'split role extent')
        positions[role] = [index for index, _ in group]
        for offset, (index, cell) in enumerate(group):
            origin = cell['origin']
            require(index == group[0][0] + offset and cell['text'] == form[offset] and cell['partId'] == record['partId'], 'split role surface')
            require(origin == dict(kind='split-vowel', constructionId=identity, editId=record['editId'],
                                   unitId=record['nucleusUnitId'], phoneId=record['phoneId'], role=role, offset=offset), 'split role origin')
    require(positions['component'][-1] < positions['marker'][0], 'split order')
    coda = cells[positions['component'][-1] + 1:positions['marker'][0]]
    require(coda == record['preservedCodaCells'] and [cell['id'] for cell in coda] == record['preservedCodaCellIds'], 'changed coda cells')
    phone = phones[record['phoneId']]
    require(record['nucleusUnitId'] == phone['id'] == record['phoneId'] and phone['segment'] == 'nucleus' and
            phone['syllableIndex'] == record['partId'] and phone['soundAtSpelling'] == record['reading']['sound'], 'split nucleus identity')
    codas = [entry for entry in phones if entry['syllableIndex'] == record['partId'] and entry['segment'] == 'coda']
    require([entry['id'] for entry in codas] == record['codaUnitIds'], 'complete coda phones')
    owners = []
    for cell in coda:
        origin = cell['origin']
        require(origin['kind'] in ('selection', 'licensed', 'normalized', 'completion', 'shared'), 'unowned coda cell')
        source_ids = origin['sourceUnitIds'] if origin['kind'] == 'shared' else [origin['unitId']]
        for source_id in source_ids:
            if source_id not in owners:
                owners.append(source_id)
    require(owners == record['codaUnitIds'], 'coda source ownership')
    relation = dict(vowel=dict(sound=phone['soundAtSpelling'], component=record['reading']['component']),
                    coda=dict(sounds=[entry['soundAtSpelling'] for entry in codas], written=''.join(cell['text'] for cell in coda)),
                    marker=record['reading']['marker'])
    require(relation in supports, 'unsupported split relation')
    require(all(cell.get('partId') is not None and cell['partId'] != record['partId']
                for cell in cells[positions['marker'][-1] + 1:]), 'split not at part edge')


def recount_structure(trace, supports):
    split = trace['split']; records = split['constructions']; edits = trace['edits']
    require([record['id'] for record in records] == list(range(len(records))), 'construction identity sequence')
    require(len(set(split['liveConstructionIds'])) == len(split['liveConstructionIds']), 'duplicate live construction')
    formed = [item for item in split['attempts'] if item['attempt']['status'] == 'evaluated' and item['attempt']['trial']['status'] == 'formed']
    require([item['constructionId'] for item in formed] == list(range(len(records))), 'formation attempt bindings')
    for record, trial in zip(records, formed):
        require(record['attempt'] == trial['attempt'] and record['nucleusUnitId'] == trial['attempt']['nucleusId'], 'formation attempt identity')
        edit = edits[record['editId']]
        require(edit['id'] == record['editId'] and edit['rule'] == 'splitVowel:' + record['attempt']['route'], 'formation edit identity')
        check_surface(edit['output'], trace['phones'], record, supports)
        require([cell['id'] for cell in edit['input']] == record['inputCellIds'] + record['preservedCodaCellIds'], 'formation input extent')
        require(edit['input'][len(record['inputCellIds']):] == record['preservedCodaCells'], 'formation coda preservation')
        for cell in edit['input'][:len(record['inputCellIds'])]:
            require(cell['origin']['kind'] in ('selection', 'licensed', 'normalized', 'completion') and
                    cell['origin']['unitId'] == record['nucleusUnitId'], 'formation nucleus ownership')
    retired = []
    for replacement in split['supersessions']:
        require(replacement['rule'].startswith('gapSpelling:') and replacement['ownership'] == 'unavailable', 'unsupported retirement')
        edit = edits[replacement['editId']]
        require(edit['phase'] == 'gap' and edit['rule'] == replacement['rule'] and edit['start'] == 0 and
                [cell['id'] for cell in edit['input']] == replacement['inputCellIds'] and
                [cell['id'] for cell in edit['output']] == replacement['outputCellIds'], 'retirement edit binding')
        retired.extend(replacement['constructionIds'])
    require(len(set(retired)) == len(retired), 'duplicate retirement')
    require(set(retired).isdisjoint(split['liveConstructionIds']) and
            set(retired) | set(split['liveConstructionIds']) == set(range(len(records))), 'unaccounted construction retirement')
    live = set(split['liveConstructionIds'])
    for cell in trace['cells']:
        if cell['origin']['kind'] == 'split-vowel':
            require(cell['origin']['constructionId'] in live, 'unknown final split cell')
    for identity in live:
        check_surface(trace['cells'], trace['phones'], records[identity], supports)
    return dict(formedConstructions=len(records), liveConstructions=len(live), supersededConstructions=len(retired))
