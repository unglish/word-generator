"""Independent Q20 spelling law, reconstructed from configuration and phones.

This module imports no generator code. Trace weights and probabilities are
observations to test, never inputs to candidate support or probability mass.
"""
from collections import Counter
import json
import math


def near(actual, expected, label):
    assert math.isfinite(actual) and math.isfinite(expected), (label, actual, expected)
    assert math.isclose(actual, expected, rel_tol=5e-12, abs_tol=5e-13), (label, actual, expected)


def log_sum(values):
    values = list(values)
    maximum = max(values, default=-math.inf)
    if maximum == -math.inf:
        return maximum
    return maximum + math.log(sum(math.exp(value - maximum) for value in values))


def position_label(initial, final):
    if initial and final:
        return 'isolated'
    if initial:
        return 'initial'
    return 'final' if final else 'medial'


def fallback_reason(conditioned, positional):
    if not conditioned:
        return 'no-conditioned-candidates'
    if not positional:
        return 'no-positional-candidates'
    return 'no-positive-weights'


def boundary_slots(phones):
    count = max((phone['syllableIndex'] + 1 for phone in phones), default=0)
    shapes = [Counter() for _ in range(count)]
    for index, phone in enumerate(phones):
        assert phone['id'] == index and phone['soundAtSpelling'] == phone['boundary']['phoneme']['sound']
        assert phone['segment'] in ['onset', 'nucleus', 'coda']
        assert phone['segmentIndex'] == shapes[phone['syllableIndex']][phone['segment']]
        shapes[phone['syllableIndex']][phone['segment']] += 1
    slots = []
    for index, phone in enumerate(phones):
        previous = phones[index - 1] if index else None
        following = phones[index + 1] if index + 1 < len(phones) else None
        prev_phoneme = previous['boundary']['phoneme'] if previous else None
        next_phoneme = following['boundary']['phoneme'] if following else None
        cluster = any(other and other['syllableIndex'] == phone['syllableIndex'] and other['segment'] == phone['segment'] for other in [previous, following])
        slots.append({'phoneme': phone['boundary']['phoneme'], 'previous': prev_phoneme, 'next': next_phoneme,
            'index': index, 'total': len(phones), 'position': phone['segment'], 'syllable': phone['syllableIndex'],
            'syllables': count, 'shape': shapes[phone['syllableIndex']], 'cluster': cluster,
            'stress': phone['boundary'].get('stress'),
            'nextNucleus': next((other['boundary']['phoneme'] for other in phones[index + 1:] if other['segment'] == 'nucleus'), None),
            'firstInCoda': phone['segment'] == 'coda' and (not previous or previous['segment'] != 'coda'),
            'nextConsonant': bool(following and (following['segment'] == 'onset' or
                following['syllableIndex'] == phone['syllableIndex'] and following['segment'] == 'coda'))})
    return slots


class SpellingLaw:
    def __init__(self, config, feature_policy=None):
        self.config = config
        self.inventory = config['graphemes']
        categories = {name: set() for name in ['vowel', 'consonant', 'lax-vowel', 'tense-vowel', 'front-vowel', 'back-vowel', 'c-soft-vowel']}
        for phoneme in config['phonemes']:
            sound = phoneme['sound']
            vowel = phoneme['mannerOfArticulation'] in ['highVowel', 'midVowel', 'lowVowel']
            categories['vowel' if vowel else 'consonant'].add(sound)
            if not vowel:
                continue
            if phoneme.get('tense') is False:
                categories['lax-vowel'].add(sound)
            if phoneme.get('tense') is True:
                categories['tense-vowel'].add(sound)
            for place in ['front', 'back']:
                if phoneme['placeOfArticulation'] == place:
                    categories[place + '-vowel'].add(sound)
            if sound in ['i:', 'ɪ', 'ɛ', 'eɪ', 'aɪ', 'ɜ', 'ɚ']:
                categories['c-soft-vowel'].add(sound)
        self.conditions = []
        self.maps = {position: {} for position in ['onset', 'nucleus', 'coda']}
        for index, grapheme in enumerate(self.inventory):
            condition = grapheme.get('condition', {})
            alias = config.get('graphemeConditionAliases', {}).get(condition.get('alias'), {})
            if condition.get('alias'):
                assert condition['alias'] in config.get('graphemeConditionAliases', {})
            merged = {**alias, **{key: value for key, value in condition.items() if key not in ['alias', 'syllableShape']}}
            shape = {**alias.get('syllableShape', {}), **condition.get('syllableShape', {})}
            if shape:
                merged['syllableShape'] = shape
            for key in ['leftContext', 'rightContext', 'notLeftContext', 'notRightContext']:
                if key in merged:
                    merged[key] = set().union(*(categories.get(item, {item}) for item in merged[key]))
            self.conditions.append(merged)
            for position in self.maps:
                if position not in grapheme or grapheme[position] > 0:
                    self.maps[position].setdefault(grapheme['phoneme'], []).append(index)
        # Authenticate the inventory-to-position inclusion law as well as its use.
        for position, mapping in self.maps.items():
            observed = config['graphemeMaps'][position]
            assert observed['$type'] == 'Map'
            assert dict(observed['entries']) == {sound: [self.inventory[index] for index in indices] for sound, indices in mapping.items()}
        self.doubling = config.get('doubling', {})
        self.typed_realizations = 'realizations' in self.doubling
        self.realizations = {(rule['phoneme'], rule['from']): rule for rule in self.doubling.get('realizations', [])}
        self.direct = {(rule['phoneme'], rule['to']) for rule in self.realizations.values()}
        self.legacy_direct = set(self.doubling.get('doubledForms', {}).values())
        self.style = config.get('lexicalStyle')
        assessed = self.style['policy']['features'] if self.style else feature_policy or []
        self.features = {(feature['phoneme'], feature['form']): feature for feature in assessed}

    def is_direct(self, grapheme):
        if self.typed_realizations:
            return (grapheme['phoneme'], grapheme['form']) in self.direct
        return grapheme['form'] in self.legacy_direct

    def condition_accepts(self, index, slot, previous_form):
        condition = self.conditions[index]
        for field, initial, final in [('wordPosition', slot['syllable'] == 0, slot['syllable'] == slot['syllables'] - 1),
                                      ('segmentPosition', slot['index'] == 0, slot['index'] == slot['total'] - 1)]:
            if field in condition:
                allowed = condition[field]
                if not (initial and 'initial' in allowed or final and 'final' in allowed or not initial and not final and 'medial' in allowed):
                    return False
        for key, phoneme, negative in [('leftContext', slot['previous'], False), ('rightContext', slot['next'], False),
                                       ('notLeftContext', slot['previous'], True), ('notRightContext', slot['next'], True)]:
            if key in condition:
                present = bool(phoneme and phoneme['sound'] in condition[key])
                if present == negative:
                    return False
        for key, negative in [('leftGraphemeContext', False), ('notLeftGraphemeContext', True)]:
            if key in condition:
                present = bool(previous_form and previous_form[-1] in condition[key])
                if present == negative:
                    return False
        shape = condition.get('syllableShape', {})
        for part in ['onset', 'coda']:
            if shape.get(part) == 'empty' and slot['shape'][part] != 0:
                return False
            if shape.get(part) == 'nonEmpty' and slot['shape'][part] <= 0:
                return False
        nucleus = shape.get('nucleusLength')
        if isinstance(nucleus, (int, float)) and slot['shape']['nucleus'] != nucleus:
            return False
        if isinstance(nucleus, dict):
            if slot['shape']['nucleus'] < nucleus.get('min', -math.inf) or slot['shape']['nucleus'] > nucleus.get('max', math.inf):
                return False
        return True

    def position_weight(self, grapheme, slot):
        segment = grapheme.get('positionScope') == 'segment'
        initial = slot['index'] == 0 if segment else slot['syllable'] == 0
        final = slot['index'] == slot['total'] - 1 if segment else slot['syllable'] == slot['syllables'] - 1
        if initial and final:
            if not segment and 'isolatedSyllableWeight' in grapheme:
                return grapheme['isolatedSyllableWeight']
            return min(grapheme.get('startWord', 1), grapheme.get('endWord', 1))
        if initial:
            return grapheme.get('startWord', 1)
        return grapheme.get('endWord' if final else 'midWord', 1)

    def resolve(self, slot, previous_form, doubling_count, style_id):
        candidates = self.maps[slot['position']].get(slot['phoneme']['sound'], [])
        ordinary = [index for index in candidates if not self.inventory[index].get('fallbackOnly')]
        def conditioned(pool):
            return [index for index in pool if self.condition_accepts(index, slot, previous_form)]
        def positional(pool):
            return [index for index in pool if (not slot['cluster'] or self.inventory[index].get('cluster', 1) > 0)
                    and self.position_weight(self.inventory[index], slot) > 0]
        def positive(pool):
            result = []
            for index in pool:
                grapheme = self.inventory[index]
                modifier = 1
                if slot['stress'] != 'ˈ' and slot['syllables'] >= 2 and len(grapheme['form']) > 1:
                    modifier = max(.02, .15 / slot['syllables']) if slot['position'] == 'nucleus' else max(.15, .5 / slot['syllables'])
                weight = grapheme['frequency'] * self.position_weight(grapheme, slot) * modifier
                if math.isfinite(weight) and weight > 0:
                    result.append((index, weight))
            return result
        filtered, positions = conditioned(ordinary), positional(conditioned(ordinary))
        weights = positive(positions)
        positive_count, fallback = len(weights), None
        if not weights:
            fallback = fallback_reason(filtered, positions)
            weights = positive(positional(conditioned([index for index in candidates if self.inventory[index].get('fallbackOnly')])))
        if not weights:
            return None
        direct_present = bool(self.direct) if self.typed_realizations else bool(self.legacy_direct)
        quota = [(index, weight) for index, weight in weights if not self.is_direct(self.inventory[index])] if direct_present and doubling_count >= self.doubling.get('maxPerWord', math.inf) else weights
        relaxed = None if quota else 'doubling-quota'
        base_weights = quota or weights
        styled, evidence = [], []
        for index, weight in base_weights:
            grapheme = self.inventory[index]
            feature = self.features.get((grapheme['phoneme'], grapheme['form']))
            multiplier = 1
            if feature and style_id is not None:
                association = next(item for item in feature['associations'] if item['style_id'] == style_id)
                multiplier += self.style['policy']['strength'] * (association['multiplier'] - 1)
            styled.append((index, weight * multiplier))
            evidence.append({'phoneme': grapheme['phoneme'], 'form': grapheme['form'], 'base_weight': weight,
                'multiplier': multiplier, 'final_weight': weight * multiplier,
                'association_source_ids': feature['source_ids'] if feature else []})
        return {'candidates': candidates, 'ordinary': ordinary, 'conditioned': filtered, 'positional': positions,
                'positiveCount': positive_count, 'fallback': fallback, 'relaxed': relaxed,
                'weights': styled, 'baseWeights': base_weights, 'evidence': evidence}

    def doubling_decision(self, grapheme, slot, count, nucleus_form):
        form, config, phoneme = grapheme['form'], self.doubling, slot['phoneme']
        def fixed(reason, increment=0):
            return {'reason': reason, 'outcomes': [(form, 1.0, increment)]}
        if not config.get('enabled'):
            return fixed('disabled')
        if not slot['previous']:
            return fixed('no-prev-phoneme')
        realization = self.realizations.get((phoneme['sound'], form))
        cluster_allowed = bool(realization and realization.get('allowInCodaCluster')) if self.typed_realizations else bool(config.get('doubledForms', {}).get(form))
        if slot['cluster'] and not (slot['position'] == 'coda' and slot['firstInCoda'] and cluster_allowed):
            return fixed('in-cluster')
        if slot['position'] == 'coda' and slot['nextConsonant']:
            return fixed('coda-before-consonant')
        if len(form) != 1:
            return fixed('multi-char-grapheme', int(self.is_direct(grapheme)))
        if slot['position'] not in ['onset', 'coda']:
            return fixed('nucleus-position')
        if count >= config['maxPerWord']:
            return fixed('max-per-word')
        previous = slot['previous']
        if config.get('trigger') == 'lax-vowel' and not (previous.get('nucleus', 0) > 0 and previous.get('tense') is False):
            return fixed('trigger:not-after-lax-vowel')
        if nucleus_form and nucleus_form[-1].lower() not in 'aeiouy':
            return fixed('nucleus-ends-consonant-letter')
        last_syllable = slot['syllable'] == slot['syllables'] - 1
        if last_syllable and slot['index'] == slot['total'] - 1 and phoneme['sound'] in config.get('neverDoubleFinal', []):
            return fixed('never-double-final')
        if phoneme['sound'] in config.get('neverDouble', []):
            return fixed('never-double:sound')
        if form in config.get('neverDouble', []):
            return fixed('never-double:form')
        if last_syllable and config.get('finalDoublingOnly') and phoneme['sound'] not in config['finalDoublingOnly']:
            return fixed('final-doubling-only')
        if config.get('suppressAfterReduction') and previous.get('reduced', False):
            return fixed('suppress-after-reduction')
        if config.get('suppressBeforeTense') and slot['nextNucleus'] and slot['nextNucleus'].get('tense') is True:
            return fixed('suppress-before-tense')
        if self.typed_realizations and realization is None:
            return fixed('unsupported-realization')
        probability = config['probability']
        if 'unstressedModifier' in config and not slot['stress'] and slot['syllables'] != 1:
            probability *= config['unstressedModifier']
        probability = min(100, max(0, math.floor(probability + .5)))
        if probability <= 0:
            return fixed('zero-probability:unstressed')
        doubled = realization['to'] if realization else config.get('doubledForms', {}).get(form, form + form)
        return {'reason': None, 'probability': probability,
                'outcomes': [(form, 1 - probability / 100, 0), (doubled, probability / 100, 1)]}

    def reading_for(self, grapheme, realized):
        if not self.typed_realizations or realized == grapheme['form']:
            return grapheme.get('reading')
        rule = self.realizations.get((grapheme['phoneme'], grapheme['form']))
        return rule['reading'] if rule and rule['to'] == realized else None

    def sequence(self, slots, style_id):
        targets = {(target['phoneme'], target['form']) for target in self.config['followingLetters']['targets']}
        initial = {'doublingCount': 0, 'currentNucleus': '', 'previousNucleus': '', 'pending': []}
        def edges(index, state):
            slot = slots[index]
            law = self.resolve(slot, state.get('previousForm'), state['doublingCount'], style_id)
            if law is None:
                return []
            total_log = log_sum(math.log(weight) for _, weight in law['weights'])
            result = []
            for inventory_index, weight in law['weights']:
                grapheme = self.inventory[inventory_index]
                nucleus = grapheme['form'] if slot['position'] == 'nucleus' else state['currentNucleus']
                decision = self.doubling_decision(grapheme, slot, state['doublingCount'],
                    state['previousNucleus'] if slot['position'] == 'onset' else nucleus)
                for realized, probability, increment in decision['outcomes']:
                    if probability == 0:
                        continue
                    first = realized[:1].lower()
                    if first and not all(accepts_letter(reading, first) for reading in state['pending']):
                        continue
                    pending = [] if first else list(state['pending'])
                    if (grapheme['phoneme'], realized) in targets:
                        reading = self.reading_for(grapheme, realized)
                        assert reading and reading['kind'] == 'following-letter'
                        pending.append(reading)
                    crossing = index + 1 == len(slots) or slots[index + 1]['syllable'] != slot['syllable']
                    following = {'previousForm': realized, 'doublingCount': state['doublingCount'] + increment,
                        'currentNucleus': '' if crossing else nucleus,
                        'previousNucleus': nucleus if crossing else state['previousNucleus'], 'pending': pending}
                    result.append({'next': following, 'choice': {'inventoryIndex': inventory_index, 'selected': grapheme['form'],
                        'realized': realized, 'doublingIncrement': increment},
                        'logProbability': math.log(weight) - total_log + math.log(probability)})
            return result
        return SequencePlan(slots, initial, edges)


def accepts_letter(reading, letter):
    return ('require' not in reading or letter in [item.lower() for item in reading['require']]) and letter not in [item.lower() for item in reading.get('forbid', [])]


def state_key(state):
    return json.dumps(state, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


class SequencePlan:
    """Enumerate every reachable state and sum every accepting continuation."""
    def __init__(self, slots, initial, edges):
        self.initial = initial
        self.layers = [{state_key(initial): {'state': initial, 'edges': [], 'mass': -math.inf}}]
        self.edge_count = 0
        for index in range(len(slots)):
            layer = {}
            for node in self.layers[index].values():
                node['edges'] = edges(index, node['state'])
                for edge in node['edges']:
                    assert math.isfinite(edge['logProbability']) and edge['logProbability'] <= 5e-13
                    key = state_key(edge['next'])
                    if key not in layer:
                        layer[key] = {'state': edge['next'], 'edges': [], 'mass': -math.inf}
                    self.edge_count += 1
            self.layers.append(layer)
        for node in self.layers[-1].values():
            node['mass'] = 0 if all(accepts_letter(reading, '') for reading in node['state']['pending']) else -math.inf
        for index in range(len(slots) - 1, -1, -1):
            for node in self.layers[index].values():
                node['mass'] = log_sum(edge['logProbability'] + self.layers[index + 1][state_key(edge['next'])]['mass'] for edge in node['edges'])
        self.log_mass = self.layers[0][state_key(initial)]['mass']
        self.state_count = sum(len(layer) for layer in self.layers)

    def choices(self, index, state):
        node = self.layers[index][state_key(state)]
        if node['mass'] == -math.inf:
            return []
        result = []
        for edge in node['edges']:
            continuation = self.layers[index + 1][state_key(edge['next'])]['mass']
            if continuation != -math.inf:
                result.append({**edge, 'logConditionalProbability': edge['logProbability'] + continuation - node['mass']})
        return result

    def draw(self, index, state, roll):
        assert math.isfinite(roll) and 0 <= roll < 1
        choices = self.choices(index, state)
        assert choices
        cumulative = -math.inf
        log_roll = math.log(roll) if roll else -math.inf
        for edge in choices:
            cumulative = log_sum([cumulative, edge['logConditionalProbability']])
            if log_roll < cumulative:
                return edge
        return choices[-1]


def verify_style_choice(law, choice):
    policy = law.style['policy']
    assert choice['profile_id'] == law.style['id']
    roll = choice['draw']
    assert math.isfinite(roll) and 0 <= roll < 1
    total = sum(row['prior'] for row in policy['styles'])
    priors = [{'style_id': row['style']['id'], 'probability': row['prior'] / total} for row in policy['styles']]
    assert choice['normalized_priors'] == priors
    cumulative, selected = 0, priors[-1]['style_id']
    for row in priors:
        cumulative += row['probability']
        if roll < cumulative:
            selected = row['style_id']
            break
    assert choice['style_id'] == selected
    return selected


def verify_weight_rows(actual, expected):
    assert len(actual) == len(expected)
    for observed, computed in zip(actual, expected):
        assert observed.keys() == computed.keys()
        for key in computed:
            if key in ['base_weight', 'multiplier', 'final_weight']:
                near(observed[key], computed[key], key)
            else:
                assert observed[key] == computed[key], (key, observed[key], computed[key])


def verify_word_law(law, word):
    trace = word['trace']
    base = trace['baseSpelling']
    if law.style and law.style['policy']['strength'] > 0:
        style_id = verify_style_choice(law, trace['lexicalStyle'])
    else:
        assert 'lexicalStyle' not in trace
        style_id = None
    slots = boundary_slots(base['phones'])
    assert len(slots) == len(base['units']) == len(trace['graphemeSelections'])
    counts = Counter(words=1)
    counts['words/style/' + (style_id or 'omitted')] += 1
    previous, count, current_nucleus, previous_nucleus = None, 0, '', ''
    plan = law.sequence(slots, style_id) if law.config.get('followingLetters') else None
    state = plan.initial if plan else None
    if plan:
        assert math.isfinite(plan.log_mass)
        counts['sequence/states'] += plan.state_count
        counts['sequence/edges'] += plan.edge_count
    word_features = Counter()
    for index, (slot, unit, record) in enumerate(zip(slots, base['units'], trace['graphemeSelections'])):
        assert unit['id'] == unit['choiceId'] == index and unit['phoneIds'] == [index]
        assert record['index'] == index and record['phoneme'] == slot['phoneme']['sound']
        assert record['position'] == slot['position'] and record['syllableIndex'] == slot['syllable']
        assert type(unit['inventoryIndex']) is int and 0 <= unit['inventoryIndex'] < len(law.inventory)
        grapheme = law.inventory[unit['inventoryIndex']]
        assert grapheme['phoneme'] == slot['phoneme']['sound'] and grapheme['form'] == unit['selected'] == record['selected']
        assert record['doubled'] == (unit['selected'] != unit['afterDoubling'])
        resolved = law.resolve(slot, previous, count, style_id)
        assert resolved is not None
        for field, pool in [('candidates', 'candidates'), ('afterCondition', 'conditioned'), ('afterPosition', 'positional')]:
            assert record[field] == [law.inventory[item]['form'] for item in resolved[pool]], (index, field)
        if style_id:
            verify_weight_rows(record['styleWeights'], resolved['evidence'])
        else:
            assert 'styleWeights' not in record
        assert unit['inventoryIndex'] in [item for item, weight in resolved['weights']]
        if slot['position'] == 'nucleus':
            current_nucleus = unit['selected']
        doubling = law.doubling_decision(grapheme, slot, count,
            previous_nucleus if slot['position'] == 'onset' else current_nucleus)
        assert (unit['afterDoubling'], unit['doublingIncrement']) in [(form, increment) for form, probability, increment in doubling['outcomes'] if probability > 0]
        if plan:
            conditioned = record['conditionedSelection']
            assert conditioned['version'] == 1 and conditioned['index'] == index
            assert record['roll'] == conditioned['roll']
            assert json.loads(conditioned['before']) == state
            expected = plan.draw(index, state, conditioned['roll'])
            assert conditioned['choice'] == expected['choice']
            assert json.loads(conditioned['after']) == expected['next']
            assert unit['inventoryIndex'] == expected['choice']['inventoryIndex']
            assert unit['afterDoubling'] == expected['choice']['realized']
            assert unit['doublingIncrement'] == expected['choice']['doublingIncrement']
            near(conditioned['logOriginalProbability'], expected['logProbability'], 'original probability')
            near(conditioned['logConditionalProbability'], expected['logConditionalProbability'], 'conditional probability')
            near(conditioned['logSequenceMass'], plan.log_mass, 'sequence partition mass')
            assert record['weights'] == [] and 'selection' not in record and 'doubling' not in record
            state = expected['next']
            counts['sequence/checkedSelections'] += 1
        else:
            weights = resolved['weights']
            assert len(record['weights']) == len(weights)
            for observed, (item, weight) in zip(record['weights'], weights):
                assert observed[0] == law.inventory[item]['form']
                near(observed[1], weight, 'ordinary weight')
            roll, total, cumulative, selected_index = record['roll'], sum(weight for _, weight in weights), 0, None
            assert math.isfinite(roll) and 0 <= roll < total
            if len(weights) == 1:
                assert roll == 0
            for item, weight in weights:
                cumulative += weight
                if roll < cumulative:
                    selected_index = item
                    break
            assert selected_index == unit['inventoryIndex']
            selection = {'version': 1, 'positionScope': grapheme.get('positionScope', 'syllable'),
                'segmentPosition': position_label(index == 0, index == len(slots) - 1),
                'syllablePosition': position_label(slot['syllable'] == 0, slot['syllable'] == slot['syllables'] - 1),
                'ordinaryCandidates': len(resolved['ordinary']), 'afterCondition': len(resolved['conditioned']),
                'afterPosition': len(resolved['positional']), 'positiveCandidates': resolved['positiveCount']}
            if resolved['fallback']:
                selection['fallback'] = resolved['fallback']
            if resolved['relaxed']:
                selection['preferenceRelaxed'] = resolved['relaxed']
            assert record['selection'] == selection
            doubling_record = record['doubling']
            if doubling['reason'] is not None:
                assert doubling_record == {'attempted': False, 'reason': doubling['reason']}
            else:
                assert doubling_record['attempted'] is True
                assert doubling_record['probability'] == doubling['probability']
                if unit['doublingIncrement']:
                    assert doubling_record == {'attempted': True, 'probability': doubling['probability'], 'result': unit['afterDoubling']}
                else:
                    assert doubling_record == {'attempted': True, 'probability': doubling['probability'], 'reason': 'roll-failed'}
            counts['ordinary/checkedSelections'] += 1
        for feature in law.features:
            eligible = [item for item, weight in resolved['weights'] if (law.inventory[item]['phoneme'], law.inventory[item]['form']) == feature]
            name = '/'.join(feature)
            counts['feature/' + name + '/legalOpportunities'] += bool(eligible)
            selected = (grapheme['phoneme'], unit['selected']) == feature
            counts['feature/' + name + '/selected'] += selected
            base_total = sum(weight for _, weight in resolved['baseWeights'])
            styled_total = sum(weight for _, weight in resolved['weights'])
            counts['feature/' + name + '/summedBaseLocalProbabilities'] += sum(weight for item, weight in resolved['baseWeights'] if item in eligible) / base_total
            counts['feature/' + name + '/summedStyledLocalProbabilities'] += sum(weight for item, weight in resolved['weights'] if item in eligible) / styled_total
            if plan:
                possibilities = plan.choices(index, json.loads(record['conditionedSelection']['before']))
                feature_choices = [edge for edge in possibilities if (law.inventory[edge['choice']['inventoryIndex']]['phoneme'], edge['choice']['selected']) == feature]
                counts['feature/' + name + '/conditionedOpportunities'] += bool(feature_choices)
                counts['feature/' + name + '/summedConditionalProbabilities'] += sum(math.exp(edge['logConditionalProbability']) for edge in feature_choices)
            word_features[name] += selected
        previous, count = unit['afterDoubling'], count + unit['doublingIncrement']
        if index + 1 == len(slots) or slots[index + 1]['syllable'] != slot['syllable']:
            previous_nucleus, current_nucleus = current_nucleus, ''
    if plan:
        assert all(accepts_letter(reading, '') for reading in state['pending'])
    counts['words/multipleDeclaredFeaturesSelected'] += sum(word_features.values()) >= 2
    for name, selected in word_features.items():
        counts['feature/' + name + '/wordsSelected'] += bool(selected)
    return counts
