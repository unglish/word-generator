"""Independent arithmetic recount of Q13b's retained repair observations.

Certificate totals count archived records; they do not independently establish
reading licenses. Production replay is required separately before comparison.
"""
from collections import Counter
import json
import re
import sys

if sys.flags.optimize:
    raise RuntimeError('Assertions must be enabled')

CAPS = {'repairConsonantPileups', 'repairConsonantLetters', 'repairFinalConsonantLetters', 'repairVowelLetters', 'postJoinVowelCap'}
ZERO_FIELDS = '''selectedThUnits selectedThOnsetUnits structuralAdjacentUnitSlots structuralSyllableBoundarySlots
normalizationEpisodesUnavailableWords prospectiveComparisonsUnavailableWords legacyDedupEvents uncertifiedDedupDeletions
wordsWithLegacyDedup wordsWithUncertifiedDedup legacyWholeUnitEvents legacyPartialUnitEvents legacySameUnitEvents
legacySameSoundEvents legacyDifferentSoundsEvents legacyUnresolvedInputEvents dedupAttributedNoLineageUnits
 dedupAttributedPartialSourceUnits dedupAttributedPartialThUnits wordsWithDedupNoLineage wordsWithDedupPartialSource
wordsWithDedupPartialTh wordsWithNormalizedOutcome wordsWithRetainedOutcome wordsWithNormalizationContextCapRefusal
normalizationPhoneMultiplicityViolations'''.split()


def owners(cell):
    origin = cell['origin']
    return origin['sourceUnitIds'] if origin['kind'] in ('rewrite', 'shared') else [origin['unitId']]


def key(values):
    return json.dumps(values, ensure_ascii=False, separators=(',', ':'))


def normalization_rule(rule):
    return rule in ('deduplicateAdjacentLetters', 'deduplicateSyllableJoin') or rule.startswith('unitNormalization:')


def normalization_counts(base):
    """Reconstruct compared cells at each archived check, not summary totals."""
    sites = ('adjacent-choice', 'syllable-join')
    comparisons, collisions = dict.fromkeys(sites, 0), dict.fromkeys(sites, 0)
    schedule, cells = [], []
    for index, unit in enumerate(base['units']):
        part = base['phones'][index]['syllableIndex']
        schedule.append(('adjacent-choice', index))
        if index + 1 == len(base['units']) or base['phones'][index + 1]['syllableIndex'] != part:
            schedule.append(('syllable-join', index))
        raw = unit['afterDoubling'].encode('utf-16-le', 'surrogatepass')
        letters = [raw[i:i+2].decode('utf-16-le', 'surrogatepass') for i in range(0, len(raw), 2)]
        assert len(letters) == len(unit['sourceCellIds'])
        cells.extend(dict(id=cell_id, text=letters[offset], partId=part,
                          origin=dict(kind='selection', unitId=index, offset=offset))
                     for offset, cell_id in enumerate(unit['sourceCellIds']))
    checks, episodes = base['normalization']['checks'], base['normalization']['episodes']
    assert len(checks) == len(schedule)
    edit_index = episode_index = 0
    for check, (site, end) in zip(checks, schedule):
        assert check['site'] == site and type(check['cursor']['lastAppendedUnitId']) is int and check['cursor']['lastAppendedUnitId'] == end
        target = check['cursor']['nextEditId']
        assert type(target) is int and edit_index <= target <= len(base['edits'])
        while edit_index < target:
            edit = base['edits'][edit_index]
            start, stop = edit['start'], edit['start'] + len(edit['input'])
            assert cells[start:stop] == edit['input']
            cells[start:stop] = edit['output']
            edit_index += 1
        prefix = [c for c in cells if c['origin']['kind'] != 'selection' or c['origin']['unitId'] <= end]
        assert all(i <= end for c in prefix for i in owners(c))
        part = base['phones'][end]['syllableIndex']
        if site == 'adjacent-choice':
            previous = [c for c in prefix if c['origin']['kind'] not in ('shared', 'rewrite') and c['origin']['unitId'] == end - 1] if end and base['phones'][end - 1]['syllableIndex'] == part else []
            following = [c for c in prefix if c['origin']['kind'] == 'selection' and c['origin']['unitId'] == end]
        else:
            previous = [c for c in prefix if c['partId'] == part - 1]
            following = [c for c in prefix if c['partId'] == part]
        if not previous or not following:
            continue
        left, right = previous[-1], following[0]
        comparisons[site] += 1
        if left['text'] != right['text']:
            continue
        collisions[site] += 1
        episode = episodes[episode_index]
        episode_index += 1
        assert episode['site'] == site and episode['cursor'] == check['cursor']
        assert episode['predecessorCellId'] == left['id'] and episode['rightCellId'] == right['id']
    assert episode_index == len(episodes)
    for field, observed in (('comparisons', comparisons), ('collisions', collisions)):
        archived = base['normalization'][field]
        assert archived.keys() == observed.keys()
        assert all(type(archived[k]) is int and archived[k] == observed[k] for k in observed)
    return comparisons, collisions


def recount(word):
    trace = word['trace']
    base = trace['baseSpelling']
    assert type(base['version']) is int and base['version'] in (3, 4)
    cells, units, phones, edits = (base[k] for k in ('cells', 'units', 'phones', 'edits'))
    counts = Counter(words=1, phones=len(phones), units=len(units), unresolvedCells=base['unresolvedCells'])
    counts[f"ledgerVersion:{base['version']}"] += 1
    counts[f"legacySelectedAttemptIndex:{trace['attempts']}"] += 1
    if base['unresolvedCells']:
        counts['wordsWithUnresolvedCells'] += 1
    surviving = {c['id'] for c in cells}
    lineage = {i for c in cells for i in owners(c)}
    replaced = {i for c in cells if c['origin']['kind'] != 'selection' for i in owners(c)}
    consuming = {}
    for edit in edits:
        for cell in edit['input']:
            for unit_id in owners(cell):
                consuming[unit_id] = edit
    for unit in units:
        counts['selectedSpelling:' + key([phones[unit['phoneIds'][0]]['soundAtSpelling'], unit['selected']])] += 1
        if unit['sourceCellIds'] and unit['id'] not in lineage:
            counts['noSurvivingLineageUnits'] += 1
            rule = consuming.get(unit['id'], {}).get('rule', 'unavailable')
            counts['noLineageRule:' + rule] += 1
            if rule in CAPS:
                counts['capNoLineageUnits'] += 1
        remaining = surviving.intersection(unit['sourceCellIds'])
        if 0 < len(remaining) < len(unit['sourceCellIds']) and unit['id'] not in replaced:
            counts['partialSourceUnits'] += 1
            if unit['selected'] == 'th' and len(remaining) == 1:
                counts['partialThUnits'] += 1
                missing = next(i for i in unit['sourceCellIds'] if i not in surviving)
                rule = next((e['rule'] for e in edits if any(c['id'] == missing for c in e['input'])), 'unavailable')
                counts['partialThRule:' + rule] += 1
                if rule in CAPS:
                    counts['capPartialThUnits'] += 1
    caps = [e for e in edits if e['rule'] in CAPS]
    counts['capEdits'] = len(caps)
    counts['capUnknownInputCells'] = sum(c['origin']['kind'] == 'rewrite' for e in caps for c in e['input'])
    if caps:
        counts['capWords'] += 1
    outcomes = trace.get('spellingBudgets')
    if outcomes is None:
        counts['budgetEpisodesUnavailableWords'] += 1
    outcomes = outcomes or []
    predicates = {
        'wordsWithOverBudgetEpisode': lambda e: bool(e['before']['exceeded']),
        'wordsWithRespell': lambda e: e['status'] == 'respell',
        'wordsWithInfeasibleBudget': lambda e: e['status'] == 'infeasible',
        'wordsWithSearchBudgetRefusal': lambda e: e['status'] == 'infeasible' and e['reason'] == 'search-budget',
    }
    for name, predicate in predicates.items():
        if any(predicate(e) for e in outcomes):
            counts[name] = 1
    for episode in outcomes:
        scope, status = episode['scope'], episode['status']
        for name in ('episodes', 'episodeScope:' + scope, 'episodeStatus:' + status, scope + ':status:' + status):
            counts[name] += 1
        if episode['before']['exceeded']:
            counts['overBudgetEpisodes'] += 1
        for budget in episode['before']['exceeded']:
            counts['implicatedBudget:' + budget] += 1
        for name, value in (('visitedAssignments', episode['visitedAssignments']), ('eligibleOptionsVisited', episode['legalOptions']),
                            ('changedUnits', len(episode['changedUnits'])), ('episodeUnresolvedInputCells', episode['unresolvedCells']),
                            (scope + ':unresolvedInputCells', episode['unresolvedCells'])):
            counts[name] += value
        if episode['unresolvedCells']:
            counts[scope + ':episodesWithUnresolvedInput'] += 1
        for phase in ('before', 'after'):
            for name, value in episode[phase]['values'].items():
                counts[f'{scope}:{phase}:{name}:{value}'] += 1
        if status == 'infeasible':
            counts['infeasibleReason:' + episode['reason']] += 1
            counts[scope + ':reason:' + episode['reason']] += 1
            for reason, amount in episode['refusals'].items():
                counts['branchRefusal:' + reason] += amount
    certificates = base['certificates']
    counts['verifiedCertificates'] = len(certificates)
    counts['changedPhoneIdsInCertificates'] = sum(len(c['phoneIds']) for c in certificates)
    for cert in certificates:
        for replacement in cert['replacements']:
            counts['licensedSpelling:' + key([phones[replacement['phoneIds'][0]]['soundAtSpelling'], replacement['before'], replacement['after']])] += 1
        for choice in cert['choices']:
            counts['replayedPool:' + choice['pool']] += 1
            if choice['quotaRelaxed']:
                counts['replayedQuotaRelaxations'] += 1
    surface = word['written']['clean'].lower()
    length = len(surface.encode('utf-16-le', 'surrogatepass')) // 2
    counts['letters'] = length
    counts[f'writtenLength:{length}'] += 1
    if re.search('[bcdfghjklmnpqrstvwxyz]{5}', surface):
        counts['rawFiveConsonantWords'] += 1

    # Preserve explicitly available zero counters and the historical merge contract.
    counts.update(dict.fromkeys(ZERO_FIELDS, 0))
    counts['phoneUnits'] = len(units)
    counts['normalizationEpisodesAvailableWords'] = 1
    counts['prospectiveComparisonsAvailableWords'] = 1
    counts['emittedNormalizationCertificates'] = len(base['normalizationCertificates'])
    counts['verifiedNormalizationCertificates'] = len(base['normalizationCertificates'])
    for index, unit in enumerate(units):
        phone = phones[index]
        if unit['selected'] == 'th':
            counts['selectedThUnits'] += 1
            if phone['segment'] == 'onset':
                counts['selectedThOnsetUnits'] += 1
        if index and phones[index - 1]['syllableIndex'] == phone['syllableIndex']:
            counts['structuralAdjacentUnitSlots'] += 1
        if index not in lineage and unit['sourceCellIds'] and normalization_rule(consuming.get(index, {}).get('rule', '')):
            counts['dedupAttributedNoLineageUnits'] += 1
        remaining = surviving.intersection(unit['sourceCellIds'])
        missing = set(unit['sourceCellIds']) - surviving
        if not remaining or not missing or index in replaced:
            continue
        if any(normalization_rule(e['rule']) and any(c['id'] in missing for c in e['input']) for e in edits):
            counts['dedupAttributedPartialSourceUnits'] += 1
            if unit['selected'] == 'th' and len(remaining) == 1:
                counts['dedupAttributedPartialThUnits'] += 1
    counts['structuralSyllableBoundarySlots'] = max(0, len({p['syllableIndex'] for p in phones}) - 1)
    comparisons, collisions = normalization_counts(base)
    for site in ('adjacent-choice', 'syllable-join'):
        for field, total in (('comparisons', 'actualSiteComparisons'), ('collisions', 'actualCollisions')):
            amount = (comparisons if field == 'comparisons' else collisions)[site]
            counts[f'site:{site}:{field}'] = amount
            counts[total] += amount
    for episode in base['normalization']['episodes']:
        status, site = episode['outcome']['status'], episode['site']
        counts['normalizationEpisodes'] += 1
        counts['normalizationStatus:' + status] += 1
        counts[f'site:{site}:status:{status}'] += 1
        if status == 'normalized':
            counts['wordsWithNormalizedOutcome'] = 1
        else:
            counts['wordsWithRetainedOutcome'] = 1
            reason = episode['outcome']['reason']
            counts['normalizationRefusal:' + reason] += 1
            counts[f'site:{site}:refusal:{reason}'] += 1
    for cert in base['normalizationCertificates']:
        counts['normalizedSpelling:' + key([phones[cert['unitId']]['soundAtSpelling'], cert['before'], cert['after']])] += 1
        counts['normalizationPool:' + cert['support']['pool']] += 1
        if cert['support']['quotaRelaxed']:
            counts['normalizationQuotaRelaxations'] += 1
    for units_key, word_key in (('dedupAttributedNoLineageUnits', 'wordsWithDedupNoLineage'),
                               ('dedupAttributedPartialSourceUnits', 'wordsWithDedupPartialSource'),
                               ('dedupAttributedPartialThUnits', 'wordsWithDedupPartialTh')):
        if counts[units_key]:
            counts[word_key] = 1
    for episode in outcomes:
        if episode['status'] == 'infeasible' and episode['reason'] == 'normalization-context-unavailable':
            scope = episode['scope']
            counts['normalizationContextCapRefusalEpisodes'] += 1
            counts[scope + ':normalizationContextCapRefusalEpisodes'] += 1
            counts['wordsWithNormalizationContextCapRefusal'] = 1
            counts[scope + ':wordsWithNormalizationContextCapRefusal'] = 1
    assert all(type(value) is int and 0 <= value <= 2**53 - 1 for value in counts.values())
    return dict(counts)


if __name__ == '__main__':
    for line in sys.stdin:
        print(json.dumps(recount(json.loads(line)['word']), ensure_ascii=True, separators=(',', ':')))
