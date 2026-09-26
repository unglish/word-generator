"""Independent historical Q13c count audit. No generation or reading-license claim."""
import gzip
import hashlib
import importlib.util
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator')
RUN = ROOT / 'memory/quality-runs/spelling-coverage-candidate'
TARGET = Path('/private/tmp/q13c-historical-observer-v1.json')
TARGET_SHA = '617752caa66f87f9003811aa3eeacc309b653ed3f1b7a6288c087164d5e93b69'
MANIFEST_SHA = '6ada36379c87d12dd2030b575f71a5402de6a377ce82963362620406f7f5521f'
SOURCE_SHA = 'f0a9da1fa95cb7f0d8901b82567d94f1b565a36a83c58d404f7c8b0528a79666'
REGISTRATION_SHA = '6d7a51a3d43739a301270410eabaf17958e1ba6e9f705d82458dd133e482e9ec'
DIRECTORY = ROOT / 'evaluation/quality/probes/unit-normalization'
REPLAY_PATH = Path('/private/tmp/q13-independent-recount-v2.py')
RULES = {'deduplicateAdjacentLetters', 'deduplicateSyllableJoin'}
KEYS = '''words phoneUnits selectedThUnits selectedThOnsetUnits
structuralAdjacentUnitSlots structuralSyllableBoundarySlots
normalizationEpisodesUnavailableWords prospectiveComparisonsUnavailableWords
legacyDedupEvents uncertifiedDedupDeletions wordsWithLegacyDedup
wordsWithUncertifiedDedup legacyWholeUnitEvents legacyPartialUnitEvents
legacySameUnitEvents legacySameSoundEvents legacyDifferentSoundsEvents
legacyUnresolvedInputEvents dedupAttributedNoLineageUnits
dedupAttributedPartialSourceUnits dedupAttributedPartialThUnits
wordsWithDedupNoLineage wordsWithDedupPartialSource wordsWithDedupPartialTh'''.split()
sha = lambda b: hashlib.sha256(b).hexdigest()
canonical = lambda x: json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()
spec = importlib.util.spec_from_file_location('independent_q13_replay', REPLAY_PATH)
ledger = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ledger)


def independent_counts(base):
    assert type(base['version']) is int and base['version'] in (1, 2)
    expected = {'exactParts': 1, 'licensedOrigins': 1, 'writerBoundary': 1}
    assert base.get('capabilities') == (expected if base['version'] == 2 else None)
    ledger.replay(base)
    result = Counter(dict.fromkeys(KEYS, 0))
    units, phones = base['units'], base['phones']
    result.update(words=1, phoneUnits=len(units), normalizationEpisodesUnavailableWords=1,
                  prospectiveComparisonsUnavailableWords=1)
    result['structuralAdjacentUnitSlots'] = sum(a['syllableIndex'] == b['syllableIndex'] for a, b in zip(phones, phones[1:]))
    result['structuralSyllableBoundarySlots'] = max(0, len({p['syllableIndex'] for p in phones}) - 1)
    for unit, phone in zip(units, phones):
        if unit['selected'] == 'th':
            result['selectedThUnits'] += 1
            result['selectedThOnsetUnits'] += int(phone['segment'] == 'onset')

    # Count at the edit's actual position. Maintain a live-cell map independently
    # of the production observer's array and of the prior structural replay.
    live_order, live, exact_by_unit = [], {}, defaultdict(set)
    for unit in units:
        uid = unit['id']
        for offset, cid in enumerate(unit['sourceCellIds']):
            live_order.append(cid)
            live[cid] = {'id': cid, 'text': unit['afterDoubling'][offset],
                         'origin': {'kind': 'selection', 'unitId': uid, 'offset': offset}}
            exact_by_unit[uid].add(cid)
    last_consumer, removed_source_by_dedup = {}, set()
    for edit in base['edits']:
        start, size = edit['start'], len(edit['input'])
        removed_ids = live_order[start:start + size]
        assert removed_ids == [c['id'] for c in edit['input']]
        if edit['rule'] in RULES:
            assert size == 1 and start > 0 and not edit['output']
            left, right = live[live_order[start-1]], live[removed_ids[0]]
            assert left['text'] == right['text']
            result['legacyDedupEvents'] += 1
            result['uncertifiedDedupDeletions'] += 1
            result['site:' + edit['rule'] + ':events'] += 1
            lo, ro = left['origin'], right['origin']
            if lo['kind'] == 'rewrite' or ro['kind'] == 'rewrite':
                category = 'legacyUnresolvedInputEvents'
            elif lo['unitId'] == ro['unitId']:
                category = 'legacySameUnitEvents'
            elif phones[lo['unitId']]['soundAtSpelling'] == phones[ro['unitId']]['soundAtSpelling']:
                category = 'legacySameSoundEvents'
            else:
                category = 'legacyDifferentSoundsEvents'
            result[category] += 1
            if ro['kind'] == 'rewrite':
                result['legacyRightOwnershipUnavailableEvents'] += 1
            else:
                category = 'legacyWholeUnitEvents' if len(exact_by_unit[ro['unitId']]) == 1 else 'legacyPartialUnitEvents'
                result[category] += 1
            removed_source_by_dedup.update(removed_ids)
        for cid in removed_ids:
            cell = live.pop(cid)
            for uid in ledger.owners(cell):
                last_consumer[uid] = edit['rule']
            if cell['origin']['kind'] != 'rewrite':
                exact_by_unit[cell['origin']['unitId']].remove(cid)
        for cell in edit['output']:
            live[cell['id']] = cell
            if cell['origin']['kind'] != 'rewrite':
                exact_by_unit[cell['origin']['unitId']].add(cell['id'])
        live_order[start:start + size] = [c['id'] for c in edit['output']]
    assert live_order == [c['id'] for c in base['cells']]

    final_owners, replacement_owners = set(), set()
    for cell in live.values():
        final_owners.update(ledger.owners(cell))
        if cell['origin']['kind'] != 'selection':
            replacement_owners.update(ledger.owners(cell))
    for unit in units:
        uid, source_ids = unit['id'], set(unit['sourceCellIds'])
        remaining = source_ids.intersection(live)
        if source_ids and uid not in final_owners and last_consumer.get(uid) in RULES:
            result['dedupAttributedNoLineageUnits'] += 1
        if remaining and remaining != source_ids and uid not in replacement_owners:
            if (source_ids - remaining).intersection(removed_source_by_dedup):
                result['dedupAttributedPartialSourceUnits'] += 1
                result['dedupAttributedPartialThUnits'] += int(unit['selected'] == 'th' and len(remaining) == 1)
    for event, incidence in [
        ('legacyDedupEvents', 'wordsWithLegacyDedup'),
        ('uncertifiedDedupDeletions', 'wordsWithUncertifiedDedup'),
        ('dedupAttributedNoLineageUnits', 'wordsWithDedupNoLineage'),
        ('dedupAttributedPartialSourceUnits', 'wordsWithDedupPartialSource'),
        ('dedupAttributedPartialThUnits', 'wordsWithDedupPartialTh')]:
        result[incidence] = int(result[event] > 0)
    return result


def compare(expected, actual):
    assert expected.keys() == actual.keys(), (expected.keys() - actual.keys(), actual.keys() - expected.keys())
    leaves = 0
    for key, value in expected.items():
        if isinstance(value, dict):
            leaves += compare(value, actual[key])
        else:
            assert type(value) is int and type(actual[key]) is int
            assert value == actual[key], (key, value, actual[key])
            leaves += 1
    return leaves


def main():
    output = Path(sys.argv[1])
    assert not output.exists()
    target_bytes, registration_bytes = TARGET.read_bytes(), (DIRECTORY/'registration.json').read_bytes()
    assert sha(target_bytes) == TARGET_SHA and sha(registration_bytes) == REGISTRATION_SHA
    target, registration = json.loads(target_bytes), json.loads(registration_bytes)
    manifest_bytes = (RUN/'manifest.json').read_bytes()
    assert sha(manifest_bytes) == MANIFEST_SHA
    manifest = json.loads(manifest_bytes)['manifest']
    assert manifest['cohort'] == 'development' and manifest['generator']['sourceDigest'] == SOURCE_SHA
    assert manifest['protocol']['wordsPerReplicate'] == 10000
    assert manifest['protocolDigest'] == '451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862'
    assert sha(canonical(manifest['protocol'])) == manifest['protocolDigest']
    assert manifest['evaluatorDigest'] == 'ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007'
    assert manifest['referenceDigest'] == '38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858'
    pins = [(RUN/a['file'], a) for a in manifest['artifacts']]
    pins += [(DIRECTORY/a['file'], a) for a in registration['files']]
    assert len({a['file'] for a in manifest['artifacts']}) == len(manifest['artifacts'])

    def verify():
        assert TARGET.read_bytes() == target_bytes
        assert (DIRECTORY/'registration.json').read_bytes() == registration_bytes
        assert (RUN/'manifest.json').read_bytes() == manifest_bytes
        for path, pin in pins:
            assert path.is_file() and not path.is_symlink()
            data = path.read_bytes()
            assert len(data) == pin['bytes'] and sha(data) == pin['sha256'], str(path)
    verify()
    source = json.loads(gzip.decompress((RUN/'sources.json.gz').read_bytes()))['generator']
    assert sha(canonical(source)) == SOURCE_SHA
    schedule = [(p['id'], seed) for p in manifest['protocol']['profiles'] for seed in p['seeds']['development']]
    names = {f'{profile}-{seed}.jsonl.gz' for profile, seed in schedule}
    paths = list((RUN/'words').iterdir())
    assert {p.name for p in paths} == names and all(p.is_file() and not p.is_symlink() for p in paths)
    assert {a['file'] for a in manifest['artifacts'] if a['file'].startswith('words/')} == {'words/'+n for n in names}
    result = {'total': Counter(), 'profiles': {}, 'streams': {}, 'strata': {}}
    for profile, seed in schedule:
        counts = Counter()
        with gzip.open(RUN/'words'/f'{profile}-{seed}.jsonl.gz', 'rt') as stream:
            for index, line in enumerate(stream):
                draw = json.loads(line)
                assert (draw['profile'], draw['seed'], draw['drawIndex']) == (profile, seed, index)
                word = draw['word']
                observed = independent_counts(word['trace']['baseSpelling'])
                counts.update(observed)
                morphology = word['trace'].get('morphology') or {}
                resolved = morphology.get('realization')
                forms = resolved if resolved is not None else morphology
                prefix, suffix = bool(forms.get('prefix')), bool(forms.get('suffix'))
                label = 'both' if prefix and suffix else 'prefix' if prefix else 'suffix' if suffix else 'bare'
                if resolved is None and (prefix or suffix): label = 'planned-only:' + label
                result['strata'].setdefault(profile+'/'+label, Counter()).update(observed)
        assert counts['words'] == 10000
        result['streams'][f'{profile}/{seed}'] = counts
        result['profiles'].setdefault(profile, Counter()).update(counts)
        result['total'].update(counts)
        print(f'{profile}/{seed}: 10000 independently replayed and counted', flush=True)
    verify()
    leaves = compare({k: target[k] for k in result}, result)
    report = {'schema': 'q13c-independent-historical-recount-v1',
              'scope': 'Independent edit/lineage/count proof only; no English reading or probability licensing',
              'scriptSha256': sha(Path(__file__).read_bytes()), 'structuralReplayScriptSha256': sha(REPLAY_PATH.read_bytes()),
              'targetSha256': TARGET_SHA, 'registrationSha256': REGISTRATION_SHA,
              'manifestSha256': MANIFEST_SHA, 'sourceDigest': SOURCE_SHA,
              'integerLeavesCompared': leaves, 'allEqual': True, **result}
    with output.open('x') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(json.dumps({'allEqual': True, 'integerLeavesCompared': leaves, 'words': result['total']['words']}))


if __name__ == '__main__':
    main()
