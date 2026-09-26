"""Q13c v3 independent append/edit/guard recount. No reading/probability proof.

V1/v2 archives use the separately frozen historical verifier. This verifier
rejects those versions instead of manufacturing prospective guard observations.
"""
import argparse
from collections import Counter
import copy
import gzip
import hashlib
import json
from pathlib import Path
import re
import sys

if sys.flags.optimize:
    raise RuntimeError('Run with assertions enabled; -O/PYTHONOPTIMIZE is unsupported')
CAPS = {'repairConsonantPileups', 'repairConsonantLetters', 'repairFinalConsonantLetters', 'repairVowelLetters', 'postJoinVowelCap'}
DEDUP = {'deduplicateAdjacentLetters', 'deduplicateSyllableJoin'}
SITES = ('adjacent-choice', 'syllable-join')
REFUSALS = {'would-erase-phone', 'no-legal-remainder', 'unresolved-ownership', 'unknown-reading', 'construction-obligation', 'context-unavailable', 'unsupported-shared-construction'}
PROTOCOL = '451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862'
EVALUATOR = 'ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007'
REFERENCE = '38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858'
BASE = 'evaluation/quality/probes/unit-normalization'
CONTRACT_FILES = [BASE+'/observe-current.ts', BASE+'/protocol.json', 'src/core/base-spelling.ts',
                  'src/core/spelling-normalization-checks.ts', 'src/core/spelling-normalization-types.ts',
                  'src/core/spelling-normalization-evidence.ts', 'src/core/spelling-coverage-types.ts']
HISTORICAL = {'/private/tmp/q13-independent-recount-v2.py': '42bfc4945741bfffd1bdc06f0856e5ee0cba5c95e1bd01e64295aa43630345e1',
              '/private/tmp/q13c-independent-historical-recount.py': '31930c7bf2d13ee9c01b322a78ce4de0232d3159d047c00066e9eb8c79b12481'}
sha = lambda data: hashlib.sha256(data).hexdigest()


def integer(value, low=0, high=2**53-1):
    assert type(value) is int and low <= value <= high, ('integer', value)
    return value


def equal(a, b):
    # JSON types matter: Python's True == 1 must never validate a coordinate.
    if isinstance(a, dict) and isinstance(b, dict):
        assert a.keys() == b.keys(), (a.keys(), b.keys())
        for key in a: equal(a[key], b[key])
    elif isinstance(a, list) and isinstance(b, list):
        assert len(a) == len(b)
        for x, y in zip(a, b): equal(x, y)
    else:
        assert type(a) is type(b) and a == b, (a, b)


def utf16(text):
    assert isinstance(text, str)
    data = text.encode('utf-16-le', 'surrogatepass')
    return [data[i:i+2].decode('utf-16-le', 'surrogatepass') for i in range(0, len(data), 2)]


def joined(cells):
    return b''.join(cell['text'].encode('utf-16-le', 'surrogatepass') for cell in cells).decode('utf-16-le', 'surrogatepass')


def text_equal(a, b):
    assert utf16(a) == utf16(b)


def owners(cell):
    origin = cell['origin']
    return origin['sourceUnitIds'] if origin['kind'] == 'rewrite' else [origin['unitId']]


def id_list(values):
    assert isinstance(values, list)
    for value in values: integer(value)
    assert len(values) == len(set(values))
    return values


def replay(base, config=None):
    """Append real units in order; commit only edits belonging at that point."""
    equal(base['version'], 3)
    equal(base['capabilities'], {'exactParts': 1, 'licensedOrigins': 1, 'writerBoundary': 1, 'unitNormalization': 1})
    assert base['scope'] in ('root-before-morphology', 'bare-after-gap-spelling')
    units, phones, edits = base['units'], base['phones'], base['edits']
    assert len(units) == len(phones) and units
    observation = base['normalization']; equal(observation['version'], 1)
    checks, episodes = observation['checks'], observation['episodes']
    local, caps = base['normalizationCertificates'], base['certificates']
    for i, cert in enumerate(local):
        equal(cert['id'], i); equal(cert['version'], 1)
        assert cert['kind'] == 'local-unit-normalization' and cert['site'] in SITES
    by_edit = {integer(c['editId']): c for c in local}
    assert len(by_edit) == len(local)
    for i, cert in enumerate(caps): equal(cert['id'], i); equal(cert['version'], 1)
    cells, known = [], set()
    edit_index = check_index = episode_index = next_cell = 0
    local_seen, cap_seen, replacement_seen = set(), set(), set()
    counts = Counter({site: 0 for site in SITES}); collisions = counts.copy()
    state = {'previousForm': None, 'doublingCount': 0, 'nucleusForm': '', 'previousNucleusForm': ''}
    historical = []

    def new_cell(cell):
        nonlocal next_cell
        equal(cell['id'], next_cell); assert cell['id'] not in known
        assert len(utf16(cell['text'])) == 1
        known.add(cell['id']); next_cell += 1

    def replace(edit, local_cert=None):
        nonlocal edit_index
        equal(edit['id'], edit_index); start = integer(edit['start'], 0, len(cells))
        assert start + len(edit['input']) <= len(cells)
        equal(cells[start:start+len(edit['input'])], edit['input'])
        text_equal(edit['before'], joined(edit['input'])); text_equal(edit['after'], joined(edit['output']))
        assert edit['rule'] not in DEDUP, 'uncertified legacy deletion in v3'
        parts = {c['partId'] for c in edit['input']}
        if parts: equal(edit['partId'], next(iter(parts)) if len(parts) == 1 else None)
        if edit['partId'] is not None: integer(edit['partId'])
        ancestry = list(dict.fromkeys(uid for c in edit['input'] for uid in owners(c)))
        touched = set()
        if local_cert:
            c = local_cert; uid = integer(c['unitId'], 0, len(units)-1)
            assert c['id'] not in local_seen and not cap_seen
            equal(c['phoneIds'], [uid]); equal(c['partId'], phones[uid]['syllableIndex'])
            equal(c['originalInventoryIndex'], units[uid]['inventoryIndex'])
            equal(c['preUnitState'], historical[uid])
            equal(c['inputCellIds'], [cell['id'] for cell in edit['input']])
            equal(c['cursor']['nextEditId'], edit_index)
            assert edit['phase'] == ('selection' if c['site'] == SITES[0] else 'syllable')
            assert edit['rule'] == 'unitNormalization:' + c['site']
            text_equal(c['before'], edit['before']); text_equal(c['after'], edit['after'])
            assert utf16(c['after']) == utf16(c['before'])[1:] and c['after']
            owned = [cell for cell in cells if cell['origin']['kind'] != 'rewrite' and cell['origin']['unitId'] == uid]
            equal(owned, edit['input']); assert start > 0 and owned
            equal(cells[start-1]['id'], c['predecessorCellId']); text_equal(cells[start-1]['text'], owned[0]['text'])
            prior = [x for x in local[:c['id']] if x['unitId'] == uid]
            text_equal(c['before'], prior[-1]['after'] if prior else units[uid]['afterDoubling'])
            for offset, cell in enumerate(owned):
                equal(cell['origin'], {'kind': 'normalized', 'unitId': uid, 'offset': offset, 'editId': prior[-1]['editId'], 'certificateId': prior[-1]['id'], 'sourceUnitIds': [uid]} if prior else {'kind': 'selection', 'unitId': uid, 'offset': offset})
            # Only certificate claims and structural correspondence are counted.
            # Grapheme eligibility, reading, support probabilities and neighbor
            # licensing are deliberately not reimplemented by this counter.
            assert len(edit['output']) == len(utf16(c['after']))
            local_seen.add(c['id'])
        else:
            assert not edit['rule'].startswith('unitNormalization:')
        for offset, cell in enumerate(edit['output']):
            new_cell(cell); equal(cell['partId'], edit['partId'])
            origin = cell['origin']; equal(origin['editId'], edit_index)
            if local_cert:
                equal(origin, {'kind': 'normalized', 'unitId': local_cert['unitId'], 'offset': offset,
                               'editId': edit_index, 'certificateId': local_cert['id'], 'sourceUnitIds': [local_cert['unitId']]})
            elif origin['kind'] == 'licensed':
                assert not local_seen and edit['rule'] == 'spellingBudget:respell'
                cid = integer(origin['certificateId'], 0, len(caps)-1); uid = integer(origin['unitId'], 0, len(units)-1)
                c = caps[cid]
                if cid not in cap_seen:
                    equal(c['inputCellIds'], [entry['id'] for entry in cells]); text_equal(c['before'], joined(cells))
                    assert len(c['contexts']) == len(units) and len(c['choices']) == len(units)
                    equal([entry['unitId'] for entry in c['choices']], list(range(len(units))))
                    changed = [p for entry in c['replacements'] for p in entry['phoneIds']]
                    equal(c['phoneIds'], changed); id_list(changed)
                    assert changed == sorted(changed) and changed
                    planned = list(cells)
                    replacements = []
                    for entry in c['replacements']:
                        unit_id = integer(entry['unitId'], 0, len(units)-1)
                        equal(entry['phoneIds'], [unit_id]); assert entry['after']
                        owned = [cell for cell in cells if cell['origin']['kind'] != 'rewrite' and cell['origin']['unitId'] == unit_id]
                        equal(entry['inputCellIds'], [cell['id'] for cell in owned]); assert owned
                        text_equal(entry['before'], joined(owned)); equal(entry['partId'], phones[unit_id]['syllableIndex'])
                        at = cells.index(owned[0]); equal(cells[at:at+len(owned)], owned)
                        replacements.append((at, len(owned), entry))
                    for at, size, entry in sorted(replacements, reverse=True):
                        planned[at:at+size] = [{'text': char} for char in utf16(entry['after'])]
                    text_equal(c['after'], joined(planned)); cap_seen.add(cid)
                matches = [entry for entry in c['replacements'] if entry['unitId'] == uid]; assert len(matches) == 1
                entry = matches[0]
                equal(entry['inputCellIds'], [cell['id'] for cell in edit['input']])
                text_equal(entry['before'], edit['before']); text_equal(entry['after'], edit['after'])
                equal(origin, {'kind': 'licensed', 'unitId': uid, 'offset': offset, 'editId': edit_index, 'certificateId': cid, 'sourceUnitIds': [uid]})
                equal(cell['partId'], entry['partId']); assert cell['text'] == utf16(entry['after'])[offset]
                if offset == 0:
                    assert (cid, uid) not in replacement_seen; replacement_seen.add((cid, uid))
                touched.add(cid)
            else:
                equal(origin, {'kind': 'rewrite', 'editId': edit_index, 'sourceUnitIds': ancestry, 'ownership': 'unresolved'})
        cells[start:start+len(edit['input'])] = copy.deepcopy(edit['output']); edit_index += 1
        for cid in touched:
            if all((cid, entry['unitId']) in replacement_seen for entry in caps[cid]['replacements']): text_equal(joined(cells), caps[cid]['after'])

    def guard(site, end):
        nonlocal check_index, episode_index
        cursor = {'lastAppendedUnitId': end, 'nextEditId': edit_index}
        equal(checks[check_index], {'site': site, 'cursor': cursor}); check_index += 1
        part = phones[end]['syllableIndex']; left = right = None
        if site == SITES[0]:
            previous = [c for c in cells if c['origin']['kind'] != 'rewrite' and c['origin']['unitId'] == end-1]
            if end and phones[end-1]['syllableIndex'] == part and previous: left = previous[-1]
            current = [c for c in cells if c['origin']['kind'] == 'selection' and c['origin']['unitId'] == end]
            if current: right = current[0]
        else:
            previous = [c for c in cells if c['partId'] == part-1]
            current = [c for c in cells if c['partId'] == part]
            if previous: left = previous[-1]
            if current: right = current[0]
        if left is None or right is None: return
        counts[site] += 1
        if utf16(left['text']) != utf16(right['text']): return
        collisions[site] += 1
        episode = episodes[episode_index]
        equal(episode['version'], 1); equal(episode['id'], episode_index); episode_index += 1
        equal(episode['site'], site); equal(episode['cursor'], cursor)
        equal(episode['predecessorCellId'], left['id']); equal(episode['rightCellId'], right['id'])
        uid = None if right['origin']['kind'] == 'rewrite' else right['origin']['unitId']
        equal(episode['rightUnitId'], uid)
        assert cells.index(right) > 0 and cells[cells.index(right)-1]['id'] == left['id']
        outcome = episode['outcome']
        if outcome['status'] == 'retained':
            assert outcome['reason'] in REFUSALS
        else:
            assert outcome['status'] == 'normalized'
            cid = integer(outcome['certificateId'], 0, len(local)-1); c = local[cid]
            equal(c['cursor'], cursor); equal(c['site'], site); equal(c['unitId'], uid)
            equal(c['id'], len(local_seen)); equal(c['predecessorCellId'], left['id'])
            assert c['inputCellIds'][0] == right['id']
            replace(edits[edit_index], c)

    previous_part = -1; previous_segment = -1; segment_index = 0
    for uid, (unit, phone) in enumerate(zip(units, phones)):
        equal(unit['id'], uid); equal(unit['choiceId'], uid); equal(phone['id'], uid); equal(unit['phoneIds'], [uid])
        assert phone['part'] == 'root' and phone['segment'] in ('onset', 'nucleus', 'coda')
        part = integer(phone['syllableIndex']); position = ('onset', 'nucleus', 'coda').index(phone['segment'])
        assert part == previous_part or part == previous_part+1
        if part != previous_part: previous_segment = -1
        assert position >= previous_segment
        segment_index = segment_index+1 if part == previous_part and position == previous_segment else 0
        equal(phone['segmentIndex'], segment_index); previous_part, previous_segment = part, position
        assert phone['boundary']['phoneme']['sound'] == phone['soundAtSpelling']
        integer(unit['doublingIncrement'], 0, 1); integer(unit['inventoryIndex'])
        if config is not None:
            g = config['graphemes'][unit['inventoryIndex']]
            assert g['form'] == unit['selected'] and g['phoneme'] == phone['soundAtSpelling']
        historical.append(dict(state))
        equal(len(unit['sourceCellIds']), len(utf16(unit['afterDoubling'])))
        for offset, (cid, char) in enumerate(zip(unit['sourceCellIds'], utf16(unit['afterDoubling']))):
            cell = {'id': cid, 'text': char, 'origin': {'kind': 'selection', 'unitId': uid, 'offset': offset}, 'partId': part}
            new_cell(cell); cells.append(cell)
        guard(SITES[0], uid)
        state['previousForm'] = unit['afterDoubling']; state['doublingCount'] += unit['doublingIncrement']
        if phone['segment'] == 'nucleus': state['nucleusForm'] = unit['selected']
        last = uid+1 == len(units) or phones[uid+1]['syllableIndex'] != part
        if last:
            while edit_index < len(edits):
                edit = edits[edit_index]
                if edit['phase'] != 'syllable' or edit['partId'] != part or edit_index in by_edit: break
                replace(edit)
            guard(SITES[1], uid)
            state['previousNucleusForm'] = state['nucleusForm']; state['nucleusForm'] = ''
    equal(check_index, len(checks)); equal(episode_index, len(episodes))
    while edit_index < len(edits):
        assert edits[edit_index]['phase'] in ('word', 'gap'), 'edit outside its exact append/part phase'
        replace(edits[edit_index])
    equal(dict(counts), observation['comparisons']); equal(dict(collisions), observation['collisions'])
    equal(cells, base['cells']); text_equal(joined(cells), base['surface'])
    equal(base['unresolvedCells'], sum(c['origin']['kind'] == 'rewrite' for c in cells))
    equal(sorted(local_seen), list(range(len(local)))); equal(sorted(cap_seen), list(range(len(caps))))
    assert replacement_seen == {(c['id'], entry['unitId']) for c in caps for entry in c['replacements']}
    return {'comparisons': dict(counts), 'collisions': dict(collisions), 'localCertificates': len(local_seen), 'coverageCertificates': len(cap_seen)}


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf8', 'backslashreplace').decode()


def coverage_counts(word):
    base = word["trace"]["baseSpelling"]
    out = Counter(words=1, phones=len(base["phones"]), units=len(base["units"]), unresolvedCells=base["unresolvedCells"])
    out[f'legacySelectedAttemptIndex:{word["trace"]["attempts"]}'] += 1
    out[f'ledgerVersion:{base["version"]}'] += 1
    if base["unresolvedCells"]:
        out["wordsWithUnresolvedCells"] += 1
    live = {c["id"] for c in base["cells"]}
    lineage = {p for c in base["cells"] for p in owners(c)}
    rewritten = {p for c in base["cells"] if c["origin"]["kind"] == "rewrite" for p in owners(c)}
    licensed = {p for c in base["cells"] if c["origin"]["kind"] in ("licensed", "normalized") for p in owners(c)}
    for unit in base["units"]:
        uid, original = unit["id"], set(unit["sourceCellIds"])
        spelling = compact([base["phones"][uid]["soundAtSpelling"], unit["selected"]])
        out[f"selectedSpelling:{spelling}"] += 1
        if unit["selected"] == "th":
            out["selectedThUnits"] += 1
        if original and uid not in lineage:
            out["noSurvivingLineageUnits"] += 1
            consuming = [e for e in base["edits"] if any(uid in owners(c) for c in e["input"])]
            rule = consuming[-1]["rule"] if consuming else "unavailable"
            out[f"noLineageRule:{rule}"] += 1
            if rule in CAPS:
                out["capNoLineageUnits"] += 1
        remaining = original & live
        if 0 < len(remaining) < len(original) and uid not in rewritten and uid not in licensed:
            out["partialSourceUnits"] += 1
            if unit["selected"] == "th" and len(remaining) == 1:
                out["partialThUnits"] += 1
                missing = next(i for i in unit["sourceCellIds"] if i not in live)
                edits = [e for e in base["edits"] if any(c["id"] == missing for c in e["input"])]
                rule = edits[0]["rule"] if edits else "unavailable"
                out[f"partialThRule:{rule}"] += 1
                if rule in CAPS:
                    out["capPartialThUnits"] += 1
    cap_edits = [e for e in base["edits"] if e["rule"] in CAPS]
    out["capEdits"] += len(cap_edits)
    if cap_edits:
        out["capWords"] += 1
    out["capUnknownInputCells"] += sum(c["origin"]["kind"] == "rewrite" for e in cap_edits for c in e["input"])
    episodes = word["trace"].get("spellingBudgets")
    if episodes is None:
        out["budgetEpisodesUnavailableWords"] += 1
    for key, yes in {
        'wordsWithOverBudgetEpisode': any(e['before']['exceeded'] for e in episodes or []),
        'wordsWithRespell': any(e['status'] == 'respell' for e in episodes or []),
        'wordsWithInfeasibleBudget': any(e['status'] == 'infeasible' for e in episodes or []),
        'wordsWithSearchBudgetRefusal': any(e['status'] == 'infeasible' and e['reason'] == 'search-budget' for e in episodes or []),
    }.items():
        if yes: out[key] += 1
    for e in episodes or []:
        scope, status = e["scope"], e["status"]
        for key in ["episodes", f"episodeScope:{scope}", f"episodeStatus:{status}", f"{scope}:status:{status}"]:
            out[key] += 1
        if e["before"]["exceeded"]:
            out["overBudgetEpisodes"] += 1
        for key in e["before"]["exceeded"]:
            out[f"implicatedBudget:{key}"] += 1
        out["visitedAssignments"] += e["visitedAssignments"]
        out["eligibleOptionsVisited"] += e["legalOptions"]
        out["changedUnits"] += len(e["changedUnits"])
        out["episodeUnresolvedInputCells"] += e["unresolvedCells"]
        out[f"{scope}:unresolvedInputCells"] += e["unresolvedCells"]
        if e["unresolvedCells"]:
            out[f"{scope}:episodesWithUnresolvedInput"] += 1
        for stage in ["before", "after"]:
            for key, value in e[stage]["values"].items():
                out[f"{scope}:{stage}:{key}:{value}"] += 1
        if status == "infeasible":
            out[f'infeasibleReason:{e["reason"]}'] += 1
            out[f'{scope}:reason:{e["reason"]}'] += 1
            for key, count in e["refusals"].items():
                out[f"branchRefusal:{key}"] += count
    certificates = base.get("certificates", [])
    out["verifiedCertificates"] += len(certificates)  # Comparison key; only structural replay is independent here.
    out["changedPhoneIdsInCertificates"] += sum(len(c["phoneIds"]) for c in certificates)
    for certificate in certificates:
        for replacement in certificate["replacements"]:
            uid = replacement["unitId"]
            spelling = compact([base["phones"][uid]["soundAtSpelling"], replacement["before"], replacement["after"]])
            out[f"licensedSpelling:{spelling}"] += 1
        for choice in certificate["choices"]:
            out[f'replayedPool:{choice["pool"]}'] += 1
            if choice["quotaRelaxed"]:
                out["replayedQuotaRelaxations"] += 1
    surface = word["written"]["clean"].lower()
    out["letters"] += len(utf16(surface))
    out[f"writtenLength:{len(utf16(surface))}"] += 1
    if re.search(r"[bcdfghjklmnpqrstvwxyz]{5}", surface):
        out["rawFiveConsonantWords"] += 1
    return out


NORMALIZATION_KEYS = '''words phoneUnits selectedThUnits selectedThOnsetUnits
structuralAdjacentUnitSlots structuralSyllableBoundarySlots
normalizationEpisodesAvailableWords prospectiveComparisonsAvailableWords
normalizationEpisodesUnavailableWords prospectiveComparisonsUnavailableWords
legacyDedupEvents uncertifiedDedupDeletions wordsWithLegacyDedup wordsWithUncertifiedDedup
legacyWholeUnitEvents legacyPartialUnitEvents legacySameUnitEvents legacySameSoundEvents
legacyDifferentSoundsEvents legacyUnresolvedInputEvents dedupAttributedNoLineageUnits
dedupAttributedPartialSourceUnits dedupAttributedPartialThUnits wordsWithDedupNoLineage
wordsWithDedupPartialSource wordsWithDedupPartialTh wordsWithNormalizedOutcome wordsWithRetainedOutcome
wordsWithNormalizationContextCapRefusal normalizationPhoneMultiplicityViolations
emittedNormalizationCertificates verifiedNormalizationCertificates'''.split()


def normalization_counts(word, verified):
    base = word['trace']['baseSpelling']; units, phones = base['units'], base['phones']
    result = Counter(dict.fromkeys(NORMALIZATION_KEYS, 0))
    result.update(words=1, phoneUnits=len(units), normalizationEpisodesAvailableWords=1, prospectiveComparisonsAvailableWords=1,
                  emittedNormalizationCertificates=len(base['normalizationCertificates']), verifiedNormalizationCertificates=verified['localCertificates'])
    live = {cell['id'] for cell in base['cells']}
    lineage = {uid for cell in base['cells'] for uid in owners(cell)}
    replacement = {uid for cell in base['cells'] if cell['origin']['kind'] != 'selection' for uid in owners(cell)}
    normalization = lambda rule: rule in DEDUP or rule.startswith('unitNormalization:')
    for uid, unit in enumerate(units):
        if unit['selected'] == 'th':
            result['selectedThUnits'] += 1
            result['selectedThOnsetUnits'] += int(phones[uid]['segment'] == 'onset')
        if uid and phones[uid-1]['syllableIndex'] == phones[uid]['syllableIndex']: result['structuralAdjacentUnitSlots'] += 1
        source = set(unit['sourceCellIds']); remaining = live & source
        consumed = [edit for edit in base['edits'] if any(uid in owners(cell) for cell in edit['input'])]
        if source and uid not in lineage and consumed and normalization(consumed[-1]['rule']): result['dedupAttributedNoLineageUnits'] += 1
        if remaining and remaining != source and uid not in replacement:
            missing = source - remaining
            if any(normalization(edit['rule']) and any(cell['id'] in missing for cell in edit['input']) for edit in base['edits']):
                result['dedupAttributedPartialSourceUnits'] += 1
                result['dedupAttributedPartialThUnits'] += int(unit['selected'] == 'th' and len(remaining) == 1)
    result['structuralSyllableBoundarySlots'] = max(0, len({p['syllableIndex'] for p in phones})-1)
    for site in SITES:
        result[f'site:{site}:comparisons'] = verified['comparisons'][site]
        result[f'site:{site}:collisions'] = verified['collisions'][site]
        result['actualSiteComparisons'] += verified['comparisons'][site]
        result['actualCollisions'] += verified['collisions'][site]
    for episode in base['normalization']['episodes']:
        status, site = episode['outcome']['status'], episode['site']
        result['normalizationEpisodes'] += 1; result['normalizationStatus:'+status] += 1; result[f'site:{site}:status:{status}'] += 1
        if status == 'normalized': result['wordsWithNormalizedOutcome'] = 1
        else:
            result['wordsWithRetainedOutcome'] = 1
            reason = episode['outcome']['reason']
            result['normalizationRefusal:'+reason] += 1; result[f'site:{site}:refusal:{reason}'] += 1
    for c in base['normalizationCertificates']:
        result['normalizedSpelling:'+compact([phones[c['unitId']]['soundAtSpelling'], c['before'], c['after']])] += 1
        assert c['support']['pool'] in ('ordinary', 'fallback') and type(c['support']['quotaRelaxed']) is bool
        result['normalizationPool:'+c['support']['pool']] += 1
        if c['support']['quotaRelaxed']: result['normalizationQuotaRelaxations'] += 1
    for metric, incidence in [('dedupAttributedNoLineageUnits','wordsWithDedupNoLineage'),
                              ('dedupAttributedPartialSourceUnits','wordsWithDedupPartialSource'),
                              ('dedupAttributedPartialThUnits','wordsWithDedupPartialTh')]:
        result[incidence] = int(result[metric] > 0)
    for episode in word['trace'].get('spellingBudgets') or []:
        if episode['status'] == 'infeasible' and episode['reason'] == 'normalization-context-unavailable':
            scope = episode['scope']
            result['normalizationContextCapRefusalEpisodes'] += 1; result[scope+':normalizationContextCapRefusalEpisodes'] += 1
            result['wordsWithNormalizationContextCapRefusal'] = 1; result[scope+':wordsWithNormalizationContextCapRefusal'] = 1
    return result


def observe(word, config=None):
    base = word['trace']['baseSpelling']; verified = replay(base, config)
    coverage = coverage_counts(word)
    # Match the public observer's explicit merge, never add overlapping counts.
    result = dict(coverage); result.update(normalization_counts(word, verified))
    for value in result.values(): integer(value)
    return result


def replay_summary(counts):
    available = counts.get('normalizationEpisodesAvailableWords', 0)
    unavailable = counts.get('normalizationEpisodesUnavailableWords', 0)
    if not available or unavailable > 0:
        return {'status': 'unavailable', 'fraction': None, 'emitted': counts.get('emittedNormalizationCertificates'),
                'verified': counts.get('verifiedNormalizationCertificates')}
    emitted, verified = counts.get('emittedNormalizationCertificates', 0), counts.get('verifiedNormalizationCertificates', 0)
    return {'status': 'available' if emitted else 'not-applicable', 'fraction': verified/emitted if emitted else None,
            'emitted': emitted, 'verified': verified}


def morphology(word):
    item = word['trace'].get('morphology') or {}; resolved = item.get('realization')
    forms = resolved if resolved is not None else item
    # A resolved object with empty written text is still an actual affix.
    present = lambda value: value is not None and value is not False and value != ''
    prefix, suffix = present(forms.get('prefix')), present(forms.get('suffix'))
    role = 'both' if prefix and suffix else 'prefix' if prefix else 'suffix' if suffix else 'bare'
    return 'planned-only:'+role if resolved is None and role != 'bare' else role


def regular(root, path):
    assert root.is_dir() and not root.is_symlink()
    pieces = path.split('/'); assert all(p not in ('', '.', '..') for p in pieces)
    current = root
    for i, piece in enumerate(pieces):
        current /= piece; assert not current.is_symlink()
        assert current.is_file() if i == len(pieces)-1 else current.is_dir()
    return current


def pinned(path, expected):
    regular(path.parent, path.name)
    data = path.read_bytes(); assert sha(data) == expected, str(path)
    return data


def discover(root, folder):
    path = root / folder; assert path.is_dir() and not path.is_symlink()
    names = []
    for child in path.iterdir():
        assert not child.is_symlink()
        relative = child.relative_to(root).as_posix()
        if child.is_dir(): names.extend(discover(root, relative))
        else:
            assert child.is_file()
            if child.suffix in ('.ts', '.js', '.mjs', '.json'): names.append(relative)
    return sorted(names)


def archive_files(run, manifest):
    pins = {record['file']: record for record in manifest['artifacts']}; assert len(pins) == len(manifest['artifacts'])
    schedule = [(p['id'], seed) for p in manifest['protocol']['profiles'] for seed in p['seeds']['development']]
    assert len(schedule) == len(set(schedule)) == 20
    expected_shards = {f'words/{profile}-{seed}.jsonl.gz' for profile, seed in schedule}
    assert {name for name in pins if name.startswith('words/')} == expected_shards
    assert (run/'words').is_dir() and not (run/'words').is_symlink()
    actual = {p.name for p in run.iterdir() if p.name != 'words'} | {'words/'+p.name for p in (run/'words').iterdir()}
    assert actual == set(pins) | {'manifest.json'}
    for name, record in pins.items():
        assert name in expected_shards or '/' not in name
        data = regular(run, name).read_bytes()
        equal(len(data), record['bytes']); assert sha(data) == record['sha256']
    return schedule


def canonical(value):
    # Used only for source-file arrays / metric definitions / fixed schedule;
    # not as a universal cross-language binary64 config serializer.
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()


def check_contracts(tool, root):
    records = tool['observedContracts']
    assert len(records) == len(CONTRACT_FILES) and {r['path'] for r in records} == set(CONTRACT_FILES)
    for record in records:
        data = regular(root, record['path']).read_bytes()
        assert sha(data) == record['sha256'], record['path']


def verify_authority(args):
    tool_bytes = pinned(args.tool_freeze, args.tool_freeze_sha); tool = json.loads(tool_bytes)
    assert tool['kind'] == 'q13c-independent-v3-tools-v1'
    expected_tools = {str(Path(__file__).resolve()), str(Path(__file__).with_name('q13c-independent-v3-recount-test-v1.py').resolve())}
    assert {pin['path'] for pin in tool['files']} == expected_tools and len(tool['files']) == 2
    for pin in tool['files']: pinned(Path(pin['path']), pin['sha256'])
    equal(tool['historicalVerifiers'], HISTORICAL)
    check_contracts(tool, args.root)
    for path, digest in HISTORICAL.items(): pinned(Path(path), digest)
    frozen_bytes = pinned(args.freeze, args.freeze_sha); frozen = json.loads(frozen_bytes)
    target_bytes = pinned(args.report, args.report_sha); target = json.loads(target_bytes)
    manifest_bytes = pinned(args.run/'manifest.json', args.manifest_sha); envelope = json.loads(manifest_bytes); manifest = envelope['manifest']
    assert manifest['cohort'] == 'development' and manifest['protocol']['wordsPerReplicate'] == 10000
    assert manifest['protocolDigest'] == PROTOCOL and manifest['evaluatorDigest'] == EVALUATOR and manifest['referenceDigest'] == REFERENCE
    protocol = json.loads(regular(args.root, 'evaluation/quality/protocol.json').read_bytes())
    equal(manifest['protocol'], protocol); assert sha(canonical(protocol)) == PROTOCOL
    fixed = json.loads(regular(args.root, BASE+'/protocol.json').read_bytes())
    for key in ('protocolDigest', 'evaluatorDigest', 'referenceDigest'): assert manifest[key] == fixed['control'][key]
    assert target['analyzerFreezeSha256'] == args.freeze_sha and target['archiveManifestSha256'] == args.manifest_sha
    assert target['archiveSourceDigest'] == manifest['generator']['sourceDigest']
    equal(frozen['effectiveConfig'], manifest['generator']['effectiveConfig'])
    extras = ['package.json', 'package-lock.json', 'tsconfig.json', 'evaluation/quality/protocol.json', BASE+'/analyzer-contract-v1.md', BASE+'/parity-contract-v1.md']
    paths = sorted(set(discover(args.root, 'src') + discover(args.root, 'evaluation/quality') + extras))
    assert paths == [p['file'] for p in frozen['files']]
    for pin in frozen['files']:
        data = regular(args.root, pin['file']).read_bytes(); equal(len(data), pin['bytes']); assert sha(data) == pin['sha256']
    registration_bytes = regular(args.root, BASE+'/registration.json').read_bytes()
    assert sha(registration_bytes) == frozen['registrationSha256']
    registration = json.loads(registration_bytes); equal(registration['files'], frozen['preparation'])
    for pin in registration['files']:
        data = regular(args.root/BASE, pin['file']).read_bytes(); equal(len(data), pin['bytes']); assert sha(data) == pin['sha256']
    archive_files(args.run, manifest)
    sources = json.loads(gzip.decompress((args.run/'sources.json.gz').read_bytes()))
    assert sha(canonical(sources['generator'])) == manifest['generator']['sourceDigest']
    production = [p for p in paths if p.startswith('src/') and not re.search(r'\.(test|bench)\.', p)]
    assert len(sources['generator']) == len(production) and {p['path'] for p in sources['generator']} == set(production)
    for pin in sources['generator']: assert regular(args.root, pin['path']).read_bytes() == pin['content'].encode()
    summary = json.loads((args.run/'summary.json').read_bytes())
    assert sha(canonical(sources['references'])) == REFERENCE
    assert sha(canonical({'files': sources['evaluator'], 'definitions': summary['definitions']})) == EVALUATOR
    assert [p['path'] for p in sources['packageFiles']] == ['package.json', 'package-lock.json']
    for pin in sources['packageFiles']: assert regular(args.root, pin['path']).read_bytes() == pin['content'].encode()
    equal(summary['schemaVersion'], 1)
    for key in ('id', 'cohort', 'protocolDigest', 'evaluatorDigest', 'referenceDigest'): equal(summary[key], manifest[key])
    assert manifest['environment']['node'] == frozen['node']
    assert manifest['environment']['packageLockDigest'] == sha(canonical(sources['packageFiles'][1]['content']))
    return frozen, target, manifest, (tool_bytes, frozen_bytes, target_bytes, manifest_bytes)


def read_stream(path, profile, seed, required):
    n = 0
    with gzip.open(path, 'rt', encoding='utf8') as stream:
        for line in stream:
            assert line.endswith('\n') and line != '\n'
            draw = json.loads(line)
            equal(draw['profile'], profile); equal(draw['seed'], seed); equal(draw['drawIndex'], n); assert n < required
            n += 1
            yield draw
    equal(n, required)


def recount(args):
    frozen, target, manifest, before = verify_authority(args)
    result = {'total': Counter(), 'profiles': {}, 'streams': {}, 'strata': {}}
    for profile, seed in archive_files(args.run, manifest):
        counts = Counter(); n = 0
        for draw in read_stream(args.run/f'words/{profile}-{seed}.jsonl.gz', profile, seed, 10000):
            observed = observe(draw['word'], frozen['effectiveConfig'])
            counts.update(observed); result['total'].update(observed)
            result['profiles'].setdefault(profile, Counter()).update(observed)
            result['strata'].setdefault(profile+'/'+morphology(draw['word']), Counter()).update(observed)
            n += 1
        equal(n, 10000); result['streams'][f'{profile}/{seed}'] = counts
        print(f'{len(result["streams"])}/20 independently recounted streams', flush=True)
    equal(result['total']['words'], 200000)
    for key in result: equal(dictify(result[key]), target[key])
    replay_counts = {key: replay_summary(counts) for key, counts in {'total': result['total'], **result['profiles'], **result['streams'], **result['strata']}.items()}
    # JS serializes integral fractions as integers. Compare numeric fractions
    # after rejecting booleans; all count/coordinate comparisons remain strict.
    for key, item in replay_counts.items():
        actual = target['replay'][key]
        equal({k:v for k,v in actual.items() if k != 'fraction'}, {k:v for k,v in item.items() if k != 'fraction'})
        if item['fraction'] is None: assert actual['fraction'] is None
        else: assert type(actual['fraction']) in (int,float) and actual['fraction'] == item['fraction']
    assert set(replay_counts) == set(target['replay'])
    assert verify_authority(args)[3] == before
    return {'schemaVersion': 'q13c-independent-v3-recount-v1', 'passed': True,
            'scope': 'Independent UTF-16 append/edit/guard structure, certificate phone multiplicity and all observer counts; no English reading, conditional-support probability, retained-reason or generic-regex correctness proof',
            'productionLicenseReplay': 'not independently performed; similarly named count keys refer to structurally bijective emitted certificates',
            'toolFreezeSha256': args.tool_freeze_sha, 'sourceFreezeSha256': args.freeze_sha, 'manifestSha256': args.manifest_sha, 'targetReportSha256': args.report_sha,
            'sourceDigest': manifest['generator']['sourceDigest'], 'words': 200000, 'streams': 20,
            'integerLeavesCompared': count_leaves(result), 'replay': replay_counts, **dictify(result)}


def dictify(value):
    return {k: dictify(v) for k, v in value.items()} if isinstance(value, dict) else value


def count_leaves(value):
    if isinstance(value, dict): return sum(count_leaves(v) for v in value.values())
    integer(value); return 1


def protect_output(out, inputs):
    target = out.resolve()
    assert not out.exists() and not out.is_symlink()
    for source in inputs:
        path = source.resolve()
        assert target != path and not (source.is_dir() and target.is_relative_to(path)), 'output overlaps input'


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for key in ('root','run','freeze','report','tool-freeze','out'): parser.add_argument('--'+key, type=Path, required=True)
    for key in ('freeze-sha','manifest-sha','report-sha','tool-freeze-sha'): parser.add_argument('--'+key, required=True)
    args = parser.parse_args()
    protect_output(args.out, [args.root, args.run, args.freeze, args.report, args.tool_freeze, Path(__file__), Path(__file__).with_name('q13c-independent-v3-recount-test-v1.py'), *map(Path,HISTORICAL)])
    try: outcome = recount(args)
    except Exception as error:
        with args.out.open('x') as stream: json.dump({'schemaVersion':'q13c-independent-v3-recount-v1','passed':False,'error':{'type':type(error).__name__,'message':str(error)}},stream); stream.write('\n')
        raise
    with args.out.open('x') as stream: json.dump(outcome,stream,indent=2); stream.write('\n')
