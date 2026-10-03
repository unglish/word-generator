"""Independent configured morphology proposal law; no production-code imports."""
import copy
import json
import re

SEGMENTS = ('onset', 'nucleus', 'coda')
OBSTRUENTS = {'stop', 'fricative', 'affricate', 'sibilant'}


def matches(phone, selector):
    for key, field in [('sounds', 'sound'), ('manner', 'mannerOfArticulation'), ('place', 'placeOfArticulation')]:
        if key in selector and phone.get(field) not in selector[key]:
            return False
    return 'voiced' not in selector or phone.get('voiced') == selector['voiced']


def relation_matches(left, right, relation):
    for key, field in [('place', 'placeOfArticulation'), ('voiced', 'voiced')]:
        if key in relation and (left.get(field) == right.get(field)) != (relation[key] == 'same'):
            return False
    return True


def map_phones(value):
    assert value.get('$type') == 'Map', 'Expected canonical map'
    return [phone for _, phones in value['entries'] for phone in phones]


class Runtime:
    def __init__(self, config):
        self.config = config
        self.phones = {phone['sound']: phone for phone in config['phonemes']}
        self.positions = {segment: map_phones(config['phonemeMaps'][segment]) for segment in SEGMENTS}
        self.limits = config.get('clusterLimits')
        self.constraints = config.get('codaConstraints', {})
        hierarchy = config['sonorityHierarchy']
        self.sonority = {sound: hierarchy['mannerOfArticulation'].get(phone['mannerOfArticulation'], 0)
            + hierarchy['placeOfArticulation'].get(phone['placeOfArticulation'], 0)
            + (hierarchy['voicedBonus'] if phone.get('voiced') else 0)
            + (hierarchy['tenseBonus'] if phone.get('tense') else 0) for sound, phone in self.phones.items()}
        self.attested = {}
        for segment, key in [('onset', 'attestedOnsets'), ('coda', 'attestedCodas')]:
            if self.limits is not None and key in self.limits:
                self.attested[segment] = {tuple(parts[:length]) for parts in self.limits[key] for length in range(1, len(parts) + 1)}
        self.banned = {tuple(pair) for pair in config.get('clusterConstraint', {}).get('banned', [])}
        # Native expansion uses distinct sound/features/voicing identities, not weights.
        distinct = lambda phones: {tuple(phone.get(key) for key in ('sound', 'mannerOfArticulation', 'placeOfArticulation', 'voiced')): phone for phone in phones}.values()
        codas, onsets = list(distinct(self.positions['coda'])), list(distinct(self.positions['onset']))
        for rule in config.get('clusterConstraint', {}).get('rules', []):
            selected_codas = [p for p in codas if matches(p, rule['coda'])]
            selected_onsets = [p for p in onsets if matches(p, rule['onset'])]
            allowed = {(a['sound'], b['sound']) for a in selected_codas for b in selected_onsets if relation_matches(a, b, rule.get('relation', {}))}
            if rule['mode'] == 'ban':
                expanded = allowed
            else:
                expanded = {(a['sound'], b['sound']) for a in selected_codas for b in onsets} - allowed
            self.banned.update(expanded - {tuple(pair) for pair in rule.get('except', [])})

    def resolve(self, sound):
        return self.phones.get(sound, {'sound': sound, 'voiced': True, 'mannerOfArticulation': 'midVowel',
            'placeOfArticulation': 'central', 'startWord': 1, 'midWord': 1, 'endWord': 1})

    def maximum(self, segment):
        key = {'onset': 'maxOnset', 'coda': 'maxCoda', 'nucleus': None}[segment]
        if key and self.limits is not None and key in self.limits:
            return self.limits[key]
        return self.config['syllableStructure']['max' + segment.capitalize() + 'Length']

    def shape_reason(self, cluster, phone):
        if self.limits is not None and len(cluster) + 1 > self.limits['maxCoda'] + int(phone['sound'] in self.limits.get('codaAppendants', [])):
            return 'length'
        if self.constraints.get('voicingAgreement') and phone['mannerOfArticulation'] in OBSTRUENTS:
            if any(p['mannerOfArticulation'] in OBSTRUENTS and p.get('voiced') != phone.get('voiced') for p in cluster):
                return 'voicing'
        if self.constraints.get('homorganicNasalStop') and cluster:
            previous = cluster[-1]
            if previous['mannerOfArticulation'] == 'nasal' and phone['mannerOfArticulation'] == 'stop' and previous['placeOfArticulation'] != phone['placeOfArticulation']:
                return 'place'
        return None

    def nucleus_coda_ban(self, nuclei, sound):
        return any(sound in row['coda'] and any(phone['sound'] in row['nucleus'] for phone in nuclei)
            for row in self.constraints.get('bannedNucleusCodaCombinations', []))

    def candidate_reason(self, phone, cluster, segment, initial, final, nuclei):
        sound = phone['sound']
        sounds = [p['sound'] for p in cluster]
        if sounds and (sounds[-1] == sound or (sound in sounds and not (segment == 'coda' and segment in self.attested))):
            return 'repetition'
        if phone.get(segment, 1) <= 0 or (initial and phone.get('startWord', 1) <= 0) or (final and phone.get('endWord', 1) <= 0):
            return 'position'
        if segment == 'coda':
            reason = self.shape_reason(cluster, phone)
            if reason:
                return reason
            if sound in self.constraints.get('bannedCodas', []):
                return 'banned-coda'
            if self.nucleus_coda_ban(nuclei, sound):
                return 'nucleus-coda'
        if sounds and 'clusterWeights' in self.config:
            weights = self.config['clusterWeights'].get('onset' if segment == 'onset' else 'coda')
            # Positional coda objects materialize a final slot even when only nonFinal is configured.
            if weights is not None and ('final' in weights or 'nonFinal' in weights):
                weights = weights.get('final' if final else 'nonFinal')
            if weights is not None:
                for begin in range(len(sounds) + 1):
                    key = ','.join(sounds[begin:] + [sound])
                    if key in weights:
                        if weights[key] < 0.01:
                            return 'cluster-weight'
                        break
        if sounds and segment in self.attested:
            return None if tuple(sounds + [sound]) in self.attested[segment] else 'attestation'
        if cluster and segment == 'onset':
            previous = cluster[-1]
            exception = len(cluster) == 1 and sounds[0] == 's' and sound in {'t', 'p', 'k'}
            if not exception:
                if previous['placeOfArticulation'] == phone['placeOfArticulation']:
                    return 'sonority'
                if previous['mannerOfArticulation'] == 'stop':
                    if phone['mannerOfArticulation'] not in {'glide', 'liquid'}:
                        return 'sonority'
                elif self.sonority.get(sound, 0) <= self.sonority.get(previous['sound'], 0):
                    return 'sonority'
        if cluster and segment == 'coda':
            previous = cluster[-1]
            a, b = previous['mannerOfArticulation'], phone['mannerOfArticulation']
            exception = (a == b and a in {'fricative', 'stop'}) or (a == 'stop' and b in {'fricative', 'sibilant'}) or (a == 'nasal' and b == 'sibilant')
            if not exception and self.sonority.get(sound, 0) >= self.sonority.get(previous['sound'], 0):
                return 'sonority'
        patterns = self.config['invalidClusters']['boundary' if segment == 'nucleus' else segment]
        if patterns:
            # Registered config has no patterns. Fixtures use a declared common regex subset;
            # unsupported JavaScript-only constructs are a verifier error, never a silent pass.
            assert all('(?<' not in p and '\\p{' not in p and '\\u{' not in p for p in patterns), 'Unsupported regex oracle domain'
            if re.search('|'.join(patterns), ''.join(sounds) + sound, re.IGNORECASE):
                return 'pattern'
        return None


def sourced(syllables, part):
    return [{segment: [{'phone': phone, 'source': {'kind': 'segment', 'part': part, 'syllable': si, 'segment': segment, 'index': pi}}
        for pi, phone in enumerate(syllable[segment])] for segment in SEGMENTS} for si, syllable in enumerate(syllables)]


def project(runtime, root, target, replacement, prefix=None, suffix=None):
    roots = sourced(root, 'root')
    selected = roots[target['syllableIndex']][target['segment']][target['index']]
    selected['phone'] = replacement
    affixes = {}
    for part, form in [('prefix', prefix), ('suffix', suffix)]:
        form = form or {}
        templates = form.get('syllables', [])
        syllables = sourced([{segment: [runtime.resolve(sound) for sound in template[segment]] for segment in SEGMENTS} for template in templates], part)
        flat = [] if syllables else [{'phone': runtime.resolve(sound), 'source': {'kind': 'flat-affix', 'part': part, 'index': i}} for i, sound in enumerate(form.get('phonemes', []))]
        if form.get('syllableCount') == 0:
            attached = roots[0]['onset'] if part == 'prefix' else roots[-1]['coda']
            if syllables:
                for syllable in syllables:
                    phones = [p for segment in SEGMENTS for p in syllable[segment]]
                    if part == 'prefix':
                        attached[:0] = phones
                    else:
                        attached.extend(phones)
                syllables = []
            elif part == 'prefix':
                attached[:0] = flat[::-1]
            else:
                attached.extend(flat)
        affixes[part] = syllables
    assembled = affixes['prefix'] + roots + affixes['suffix']
    si = len(affixes['prefix']) + target['syllableIndex']
    index = next(i for i, p in enumerate(assembled[si][target['segment']]) if p is selected)
    return assembled, {'syllableIndex': si, 'segment': target['segment'], 'index': index}, selected


def evaluate(runtime, root, target, replacement, prefix=None, suffix=None, *, canonical_identity):
    old = root[target['syllableIndex']][target['segment']][target['index']]
    proposal, coord, selected = project(runtime, root, target, replacement, prefix, suffix)
    si = coord['syllableIndex']
    syllable = proposal[si]
    before = {segment: [p['phone']['sound'] for p in syllable[segment]] for segment in SEGMENTS}
    after = copy.deepcopy(before)
    before[coord['segment']][coord['index']] = old['sound']
    errors, licenses = [], []
    physical = [p for segment in SEGMENTS for p in syllable[segment]]
    def reject(reason, segment, index, phones, position=si):
        errors.append({'reason': reason, 'syllableIndex': position, 'segment': segment, 'index': index,
            'sounds': [p['phone']['sound'] for p in phones], 'parts': [p['source']['part'] for p in phones]})
    if not canonical_identity or runtime.phones.get(replacement['sound']) != replacement or not any(p['sound'] == replacement['sound'] for p in runtime.positions[target['segment']]):
        reject('inventory', coord['segment'], coord['index'], [selected])
    affected = [target['segment']] + (['coda'] if target['segment'] == 'nucleus' else [])
    for segment in affected:
        whole = syllable[segment]
        lexical = [p for p in whole if p['source']['part'] == 'root']
        if segment in {'onset', 'nucleus'} and len(whole) > runtime.maximum(segment):
            reject('length', segment, len(whole) - 1, whole)
        nuclei = [p['phone'] for p in syllable['nucleus']]
        def test(groups, evidence):
            cluster = []
            for members in groups:
                first, last = members[0], members[-1]
                phone = first['phone']
                reason = runtime.candidate_reason(phone, cluster, segment,
                    si == 0 and physical[0] is first,
                    si == len(proposal) - 1 and physical[-1] is last, nuclei)
                if reason:
                    reject(reason, segment, next(i for i, p in enumerate(whole) if p is last), evidence)
                cluster.append(phone)
        test([[p] for p in lexical], lexical)
        if any(p['source']['part'] != 'root' for p in whole):
            groups = []
            for index, phone in enumerate(whole):
                previous = groups[-1] if groups else None
                if previous and previous[0]['phone']['sound'] == phone['phone']['sound'] and all(p['source']['part'] != phone['source']['part'] for p in previous):
                    previous.append(phone)
                else:
                    groups.append([phone])
            for members in groups:
                if len(members) > 1:
                    licenses.append({'syllableIndex': si, 'segment': segment, 'sound': members[0]['phone']['sound'],
                        'members': [{'index': next(i for i, p in enumerate(whole) if p is member), 'source': member['source']} for member in members]})
            test(groups, whole)
        if segment == 'coda':
            cluster = []
            for index, phone in enumerate(whole):
                reason = runtime.shape_reason(cluster, phone['phone'])
                if reason:
                    reject(reason, segment, index, whole)
                if phone['phone']['sound'] in runtime.constraints.get('bannedCodas', []):
                    reject('banned-coda', segment, index, whole)
                if runtime.nucleus_coda_ban(nuclei, phone['phone']['sound']):
                    reject('nucleus-coda', segment, index, whole)
                cluster.append(phone['phone'])
            if runtime.limits is None and len(whole) > runtime.maximum(segment):
                reject('length', segment, len(whole) - 1, whole)
            if si == len(proposal) - 1 and whole and 'allowedFinal' in runtime.constraints and whole[-1]['phone']['sound'] not in runtime.constraints['allowedFinal']:
                reject('word-final', segment, len(whole) - 1, whole)
    for left_index in [si - 1, si]:
        if left_index < 0 or left_index + 1 >= len(proposal):
            continue
        left, right = proposal[left_index]['coda'], proposal[left_index + 1]['onset']
        if left and right and (left[-1]['phone']['sound'], right[0]['phone']['sound']) in runtime.banned:
            reject('boundary', 'coda', len(left) - 1, [left[-1], right[0]], left_index)
    unique = {}
    for error in errors:
        unique[json.dumps(error, sort_keys=True)] = error
    return {'accepted': not unique, 'rootTarget': dict(target), 'assembledTarget': coord,
        'soundBefore': old['sound'], 'soundProposed': replacement['sound'], 'syllableBefore': before,
        'syllableProposed': after, 'rejections': list(unique.values()), 'boundaryRepetitionLicenses': licenses}


def boundary(root, prefix, target='edge'):
    if not root:
        return None
    if target == 'nucleus':
        si = 0 if prefix else len(root) - 1
        if not root[si]['nucleus']:
            return None
        index = 0 if prefix else len(root[si]['nucleus']) - 1
        return {'syllableIndex': si, 'segment': 'nucleus', 'index': index}
    for si in (range(len(root)) if prefix else range(len(root) - 1, -1, -1)):
        for segment in (SEGMENTS if prefix else SEGMENTS[::-1]):
            if root[si][segment]:
                return {'syllableIndex': si, 'segment': segment, 'index': 0 if prefix else len(root[si][segment]) - 1}
    return None


def target_phone(root, coord):
    return root[coord['syllableIndex']][coord['segment']][coord['index']]


def condition_matches(phone, condition, prefix):
    if (condition.get('position') == 'preceding' and prefix) or (condition.get('position') == 'following' and not prefix):
        return False
    return matches(phone, condition)


def affix_form(affix):
    return {key: copy.deepcopy(affix[key]) for key in ('written', 'phonemes', 'syllableCount', 'syllables') if key in affix}


def resolve_affix(affix, root, prefix):
    coord = boundary(root, prefix)
    phone = target_phone(root, coord) if coord else None
    chosen = None
    if phone is not None:
        options = sorted(enumerate(affix.get('allomorphs', [])), key=lambda item: int(not ('manner' in item[1]['phonologicalCondition'] or 'place' in item[1]['phonologicalCondition'])))
        chosen = next((item for item in options if condition_matches(phone, item[1]['phonologicalCondition'], prefix)), None)
    resolved = affix if chosen is None else {**chosen[1], 'written': chosen[1].get('written', affix['written'])}
    return {'planned': affix_form(affix), 'resolved': affix_form(resolved), 'allomorphIndex': None if chosen is None else chosen[0],
        **({'boundaryPhoneme': {key: phone[key] for key in ('sound', 'voiced', 'mannerOfArticulation', 'placeOfArticulation') if key in phone}} if phone is not None else {})}


def configured_rewrite(text, rule):
    assert text.isascii(), 'Registered written oracle domain is ASCII spelling'
    pattern = rule['writtenMatch']
    assert pattern['$type'] == 'RegExp' and set(pattern['flags']) <= {'i', 'g'}, 'Unsupported written-regex flags'
    assert all(token not in pattern['source'] for token in ('(?<', '\\p{', '\\u{')), 'Unsupported written-regex domain'
    assert '$' not in rule['writtenReplace'], 'Registered corpus uses literal replacements; JS substitution tokens require a separate oracle'
    return re.sub(pattern['source'], lambda _: rule['writtenReplace'], text,
        count=0 if 'g' in pattern['flags'] else 1, flags=re.IGNORECASE if 'i' in pattern['flags'] else 0)


def verify_preparation(word, runtime):
    """Rebuild every configured rule, proposal, transaction and sourced assembly."""
    trace = word['trace']
    record = trace.get('morphologyPreparation')
    if record is None or record.get('prepared') is None:
        assert not (record or {}).get('prepared')
        return {'available': False, 'evaluations': [], 'acceptedChanges': []}
    assert runtime.config['morphology']['morphophonemicPolicy']['preserveClusterLegality'] is True
    assert record['version'] == 1
    root = copy.deepcopy(record['before']['syllables'])
    initial_root = copy.deepcopy(root)
    morphology = runtime.config['morphology']
    affixes, resolved = {}, {}
    planned = trace['morphology']
    assert record['template'] == planned['template']
    for part in ('prefix', 'suffix'):
        required = record['template'] == 'both' or record['template'] == ('prefixed' if part == 'prefix' else 'suffixed')
        index = record['configurationIndices'].get(part)
        assert required == (index is not None), 'Configured affix presence'
        if index is None:
            assert part not in record['prepared'], 'Unexpected affix form'
            continue
        assert type(index) is int and 0 <= index < len(morphology[part + 'es'])
        affix = morphology[part + 'es'][index]
        assert planned[part] == affix['written'], 'Planned configured affix'
        affixes[part] = affix
        resolved[part] = resolve_affix(affix, initial_root, part == 'prefix')
        assert record['prepared'][part] == resolved[part], 'Configured allomorph binding'
    before_ledger, after_ledger = record['phonesBefore'], record['phonesAfter']
    coordinates = {(phone['syllable'], phone['segment'], phone['index']): phone['id'] for phone in before_ledger['final']}
    initial_identities = {phone['id']: phone for phone in before_ledger['initial']}
    required_coordinates = {(si, segment, index) for si, syllable in enumerate(initial_root)
        for segment in SEGMENTS for index in range(len(syllable[segment]))}
    assert len(coordinates) == len(before_ledger['final']) and set(coordinates) == required_coordinates, 'Complete initial coordinates'
    assert len(initial_identities) == len(before_ledger['initial']) and set(initial_identities) == set(coordinates.values()), 'Complete initial identities'
    assert before_ledger['changes'] == [], 'Registered lexical stage starts a fresh root ledger'
    assert all(type(identity) is int and identity >= 0 for identity in initial_identities)
    assert after_ledger['initial'][:len(before_ledger['initial'])] == before_ledger['initial'], 'Initial root identities preserved'
    for coord, identity in coordinates.items():
        si, segment, index = coord
        assert initial_identities[identity]['source'] == {'kind': 'segment', 'part': 'root', 'syllable': si, 'segment': segment, 'index': index}
        assert initial_identities[identity]['initialPhone'] == initial_root[si][segment][index], 'Initial phone metadata'
        assert initial_root[si][segment][index] in runtime.config['phonemes'], 'Root outside inventory'
    expected, accepted_rules, changes = [], [], []
    for part in ('prefix', 'suffix'):
        if part not in affixes:
            continue
        affix = affixes[part]
        rules = affix.get('morphophonemicRules', [])
        assert len({json.dumps(rule, sort_keys=True) for rule in rules}) == len(rules), 'Ambiguous duplicate rule metadata is outside registered oracle domain'
        for rule_index, rule in sorted(enumerate(rules), key=lambda item: item[1].get('priority', 100)):
            coord = boundary(root, part == 'prefix', rule.get('target', 'edge'))
            row = {'ruleIndex': rule_index, 'affixIndex': record['configurationIndices'][part],
                'boundary': 'prefix-root' if part == 'prefix' else 'root-suffix', 'rule': rule['name'], 'outcome': 'target-unavailable'}
            expected.append(row)
            if coord is None:
                continue
            phone = target_phone(root, coord)
            row.update(target=coord, soundBefore=phone['sound'], soundProposed=rule.get('replaceSound', phone['sound']))
            if 'phonologicalCondition' in rule and not condition_matches(phone, rule['phonologicalCondition'], part == 'prefix'):
                row['outcome'] = 'condition-not-matched'
                continue
            row['outcome'] = 'identity' if rule.get('replaceSound') else 'written-only'
            if rule.get('replaceSound') and rule['replaceSound'] != phone['sound']:
                replacement = runtime.resolve(rule['replaceSound'])
                decision = evaluate(runtime, root, coord, replacement, resolved.get('prefix', {}).get('resolved'),
                    resolved.get('suffix', {}).get('resolved'), canonical_identity=rule['replaceSound'] in runtime.phones)
                row['guard'] = decision
                row['outcome'] = 'accepted' if decision['accepted'] else 'rejected'
                if not decision['accepted']:
                    continue
                changes.append({'id': coordinates[(coord['syllableIndex'], coord['segment'], coord['index'])],
                    'before': phone['sound'], 'after': replacement['sound'],
                    'rule': f"morphophonemic:{row['boundary']}:{rule_index}:{rule['name']}"})
                root[coord['syllableIndex']][coord['segment']][coord['index']] = replacement
            accepted_rules.append({'ruleIndex': rule_index, 'boundary': row['boundary'], 'rule': rule['name']})
    assert record['prepared']['evaluations'] == expected, 'Configured evaluation/eligibility replay'
    assert record['prepared']['rules'] == accepted_rules, 'Atomic prepared-rule inclusion'
    assert after_ledger['changes'] == before_ledger['changes'] + changes, 'Atomic ledger replacement replay'
    first = boundary(root, True)
    assert first is not None, 'Emitted affixed word has no lexical phone'
    assembled, _, _ = project(runtime, root, first, target_phone(root, first), resolved.get('prefix', {}).get('resolved'), resolved.get('suffix', {}).get('resolved'))
    prefix_form = resolved.get('prefix', {}).get('resolved', {})
    start = len(prefix_form.get('syllables', [])) if prefix_form.get('syllableCount') != 0 else 0
    assert record['prepared']['rootSyllableStart'] == start
    # Eligibility consumes no draws: every recorded preparation draw must be one
    # declared post-proposal hiatus bridge, in prefix then suffix order.
    policy = morphology.get('boundaryPolicy', {})
    bridge_options = [(runtime.resolve(sound), weight) for sound, weight in policy.get('fallbackBridgeOnsets', [['h', 100]])
        if sound in runtime.phones and weight > 0]
    total_weight = 0.0
    for _, weight in bridge_options:
        total_weight += weight
    bridge_events, draw_index = [], 0
    suffix_start = start + len(root)
    boundary_tests = [
        ('prefix-root', start > 0 and not assembled[start - 1]['coda'] and not assembled[start]['onset'], start, 'enablePrefixRootFallback', 'morphPrefixHiatusFallback'),
        ('root-suffix', suffix_start < len(assembled) and not assembled[suffix_start - 1]['coda'] and not assembled[suffix_start]['onset'], suffix_start, 'enableRootSuffixFallback', 'morphSuffixHiatusFallback'),
    ]
    for name, eligible, target_index, key, event in boundary_tests:
        if not eligible or policy.get(key, True) is False or not bridge_options:
            continue
        assert draw_index < len(record['rolls']), 'Missing bridge draw'
        roll = record['rolls'][draw_index]; draw_index += 1
        assert type(roll) in (int, float) and 0 <= roll < 1
        draw, cumulative = roll * total_weight, 0.0
        chosen = bridge_options[-1][0]
        for phone, weight in bridge_options:
            cumulative += weight
            if draw < cumulative:
                chosen = phone
                break
        assembled[target_index]['onset'].insert(0, {'phone': chosen, 'source': {'kind': 'bridge', 'boundary': name}})
        bridge_events.append({'event': event, 'inserted': chosen['sound'], 'syllableIndex': target_index})
    assert draw_index == len(record['rolls']), 'Unexplained preparation/eligibility RNG draw'
    assert record['structural'] == bridge_events, 'Configured bridge events'
    identities = {phone['id']: phone for phone in after_ledger['initial']}
    assert len(identities) == len(after_ledger['initial']), 'Duplicate final identity'
    assert all(type(identity) is int and identity >= 0 for identity in identities)
    assert len(after_ledger['final']) == len(identities) and {phone['id'] for phone in after_ledger['final']} == set(identities), 'No physical phone deletion or duplicate'
    for phone in after_ledger['final']:
        actual = record['after']['syllables'][phone['syllable']][phone['segment']][phone['index']]
        assert actual['sound'] == phone['sound'], 'Ledger/assembled phone binding'
        assert actual == assembled[phone['syllable']][phone['segment']][phone['index']]['phone'], 'Complete assembled phone metadata'
    observed = [{segment: [] for segment in SEGMENTS} for _ in record['after']['syllables']]
    for phone in after_ledger['final']:
        source = identities[phone['id']]['source']
        observed[phone['syllable']][phone['segment']].append({'sound': phone['sound'], 'source': source})
    projected = [{segment: [{'sound': phone['phone']['sound'], 'source': phone['source']} for phone in syllable[segment]] for segment in SEGMENTS} for syllable in assembled]
    assert projected == observed, 'Complete owned morphology assembly'
    edits = [row for row in trace['morphology']['realization']['rootEdits'] if row['phase'] == 'morphophonemic']
    configured_edits = []
    for accepted in accepted_rules:
        part = 'prefix' if accepted['boundary'] == 'prefix-root' else 'suffix'
        rule = affixes[part]['morphophonemicRules'][accepted['ruleIndex']]
        if 'writtenMatch' in rule and 'writtenReplace' in rule:
            configured_edits.append((accepted, rule))
    assert len(edits) == len(configured_edits), 'Rejected or missing written half'
    for edit, (accepted, rule) in zip(edits, configured_edits):
        assert {key: edit[key] for key in ('ruleIndex', 'boundary', 'rule')} == accepted
        assert edit['after'] == configured_rewrite(edit['before'], rule), 'Configured written rewrite'
    return {'available': True, 'evaluations': expected, 'acceptedChanges': changes}


def verify_profile_word(word, runtime, morphology_enabled):
    """Enforce evidence availability before checking any candidate transactions."""
    trace = word['trace']
    if not morphology_enabled:
        assert 'morphology' not in trace and 'morphologyPreparation' not in trace, 'Disabled-profile morphology evidence'
        return {'available': False, 'availability': 'profile-disabled', 'evaluations': [], 'acceptedChanges': []}
    morphology = trace['morphology']
    record = trace['morphologyPreparation']
    assert morphology['template'] in ('bare', 'prefixed', 'suffixed', 'both')
    assert record['version'] == 1 and record['template'] == morphology['template']
    if morphology['template'] == 'bare':
        assert record['configurationIndices'] == {} and 'prepared' not in record, 'Unexpected bare preparation'
        assert record['before'] == record['after'] and record['phonesBefore'] == record['phonesAfter'], 'Bare preparation changed root'
        assert record['rolls'] == [] and record['structural'] == []
        assert record['regexBefore'] == record['regexAfter'] == [], 'Unexpected bare regex state'
        return {'available': False, 'availability': 'planned-bare', 'evaluations': [], 'acceptedChanges': []}
    assert isinstance(record.get('prepared'), dict), 'Missing affixed preparation'
    assert isinstance(record['prepared'].get('evaluations'), list), 'Missing candidate proposal evaluations'
    result = verify_preparation(word, runtime)
    assert result['available'], 'Missing affixed eligibility evidence'
    return {**result, 'availability': 'affixed'}
