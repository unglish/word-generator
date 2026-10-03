"""Exact selected-source survival, separately from repaired-form ancestry.

Cell replay validates structure and identity. It does not independently license
the phonological semantics of a configured repair or establish reader quality.
"""
from collections import Counter

from final_lineage import natural, recount_word, units


def owners(cell):
    origin = cell['origin']
    if 'sourceUnitIds' in origin:
        return origin['sourceUnitIds']
    return [origin['unitId']]


def replay_base(base):
    assert type(base['version']) is int and base['version'] in [4, 5]
    assert len(base['units']) == len(base['phones'])
    cells, allocated = [], {}
    for index, unit in enumerate(base['units']):
        assert unit['id'] == unit['choiceId'] == index and unit['phoneIds'] == [index]
        letters = units(unit['afterDoubling'])
        assert len(letters) == len(unit['sourceCellIds'])
        for offset, (identity, text) in enumerate(zip(unit['sourceCellIds'], letters)):
            assert natural(identity) and identity not in allocated
            cell = {'id': identity, 'text': text, 'origin': {'kind': 'selection', 'unitId': index, 'offset': offset},
                    'partId': base['phones'][index]['syllableIndex']}
            allocated[identity] = cell
            cells.append(cell)
    # Future raw units remain to the right while ordered edits act on the
    # already-appended prefix. Inputs and every reused identity must agree.
    for index, edit in enumerate(base['edits']):
        assert edit['id'] == index and type(edit['start']) is int and edit['start'] >= 0
        start, stop = edit['start'], edit['start'] + len(edit['input'])
        assert stop <= len(cells) and cells[start:stop] == edit['input']
        assert [cell['text'] for cell in edit['input']] == units(edit['before'])
        assert [cell['text'] for cell in edit['output']] == units(edit['after'])
        removed = {cell['id']: cell for cell in edit['input']}
        output_ids = set()
        for cell in edit['output']:
            identity = cell['id']
            assert natural(identity) and identity not in output_ids
            output_ids.add(identity)
            assert len(units(cell['text'])) == 1
            if identity in allocated:
                assert identity in removed and removed[identity] == cell == allocated[identity]
            else:
                assert cell['origin']['editId'] == index
                assert all(type(unit_id) is int and 0 <= unit_id < len(base['units']) for unit_id in owners(cell))
                allocated[identity] = cell
        cells[start:stop] = edit['output']
    assert cells == base['cells'] and [cell['text'] for cell in cells] == units(base['surface'])
    assert base['unresolvedCells'] == sum(cell['origin']['kind'] == 'rewrite' for cell in cells)
    assert len({cell['id'] for cell in cells}) == len(cells)
    return cells


def verify_feature_lineage(law, word):
    trace, counts = word['trace'], Counter()
    counts.update({'final/' + key: value for key, value in recount_word(word).items()})
    assert not any(value for key, value in counts.items() if key.startswith('final/missing'))
    base = trace['baseSpelling']
    cells = replay_base(base)
    by_id = {cell['id']: cell for cell in cells}
    final = trace['finalWord']['spelling']
    initial = final['initial']
    for cell in initial:
        if cell['source']['kind'] == 'base-cell':
            source = by_id[cell['source']['cellId']]
            assert cell['part'] == 'root' and cell['text'] == source['text']
    root_initial = [cell for cell in initial if cell['part'] == 'root']
    assert [cell['text'] for cell in root_initial] == [cell['text'] for cell in cells]
    assert [cell['source'] for cell in root_initial] == [{'kind': 'base-cell', 'cellId': cell['id']} for cell in cells]
    final_cells = final['cells']
    positions = {cell['source']['cellId']: index for index, cell in enumerate(final_cells)
                 if cell['source']['kind'] == 'base-cell'}
    assert len(positions) == sum(cell['source']['kind'] == 'base-cell' for cell in final_cells)
    for unit in base['units']:
        phone = base['phones'][unit['id']]
        feature = (phone['soundAtSpelling'], unit['selected'])
        if feature not in law.features:
            continue
        key = 'feature/' + '/'.join(feature) + '/'
        source_ids = unit['sourceCellIds']
        retained = [identity for identity in source_ids if identity in positions]
        counts[key + 'sourceCharactersSelected'] += len(source_ids)
        counts[key + 'sourceCharactersSurviving'] += len(retained)
        exact = len(retained) == len(source_ids) and bool(source_ids)
        if exact:
            extent = [positions[identity] for identity in source_ids]
            exact = extent == list(range(extent[0], extent[0] + len(source_ids)))
        counts[key + 'exactSelectedSourceSurviving'] += exact
        counts[key + 'selectedSourcePartiallySurviving'] += 0 < len(retained) < len(source_ids)
        counts[key + 'selectedSourceErased'] += not retained
        derived = []
        ambiguous = False
        for cell in final_cells:
            if cell['source']['kind'] != 'base-cell':
                continue
            base_cell = by_id[cell['source']['cellId']]
            ancestry = owners(base_cell)
            if unit['id'] in ancestry:
                ambiguous |= len(ancestry) != 1 or base_cell['origin']['kind'] == 'rewrite'
                derived.append(cell['text'])
        counts[key + 'unambiguousDerivedSameForm'] += bool(derived) and not ambiguous and ''.join(derived) == unit['afterDoubling']
        counts[key + 'ambiguousOrUnlicensedDerivedLineage'] += ambiguous
    counts['base/structurallyReplayedCells'] += len(cells)
    counts['base/structurallyReplayedEdits'] += len(base['edits'])
    return counts
