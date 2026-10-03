"""Independent category path enumeration and trace contract reconstruction."""
import math
from collections import Counter

TEMPLATES = ('bare', 'prefixed', 'suffixed', 'both')

def enumerate_paths(model, template, morphology):
    roles = [] if template == 'bare' else ['prefix'] if template == 'prefixed' else ['suffix'] if template == 'suffixed' else ['prefix', 'suffix'] if model['order'] == 'prefix-then-suffix' else ['suffix', 'prefix']
    shares = Counter()
    for sense in model['senses']:
        shares[(sense['affix']['type'], sense['affix']['index'])] += sense['weight']
    paths = [dict(stem=stem['id'], final=stem['id'], steps=[], weight=stem['weight']) for stem in model['stems']]
    for role in roles:
        next_paths = []
        for path in paths:
            for sense in model['senses']:
                if sense['affix']['type'] != role:
                    continue
                transitions = [t for t in sense['transitions'] if t['input'] == path['final']]
                assert len(transitions) <= 1
                if not transitions:
                    continue
                frequency = morphology[role+'es' if role == 'suffix' else 'prefixes'][sense['affix']['index']]['frequency']
                if frequency == 0:
                    continue
                transition = transitions[0]
                weight = path['weight'] * frequency * sense['weight'] / shares[(role, sense['affix']['index'])]
                assert math.isfinite(weight) and weight > 0
                next_paths.append({**path, 'final': transition['output'], role+'Sense': sense['id'],
                                   'steps': path['steps'] + [dict(sense=sense['id'], **transition)], 'weight': weight})
        paths = next_paths
    return paths

def same_path(actual, expected):
    return actual.keys() == expected.keys() and all(math.isclose(actual[k], expected[k], rel_tol=1e-12, abs_tol=1e-10) if k == 'weight' else actual[k] == expected[k] for k in expected)

def eligible_paths(model, template, morphology, forced=0):
    senses = {sense['id']: sense for sense in model['senses']}
    candidates = []
    excluded = 0
    for path in enumerate_paths(model, template, morphology):
        prefix_sense = senses.get(path.get('prefixSense'))
        suffix_sense = senses.get(path.get('suffixSense'))
        prefix = morphology['prefixes'][prefix_sense['affix']['index']] if prefix_sense else None
        suffix = morphology['suffixes'][suffix_sense['affix']['index']] if suffix_sense else None
        reduction = (prefix['syllableCount'] if prefix else 0) + (suffix['syllableCount'] if suffix else 0)
        retained, emitted_template = path, template
        if template == 'both' and forced > 0 and forced-reduction < 1:
            transition = next((t for t in suffix_sense['transitions'] if t['input'] == path['stem']), None)
            if transition is None:
                excluded += 1
                continue
            retained = dict(stem=path['stem'], final=transition['output'], suffixSense=suffix_sense['id'],
                            steps=[dict(sense=suffix_sense['id'], **transition)], weight=path['weight'])
            emitted_template, prefix, reduction = 'suffixed', None, suffix['syllableCount']
        candidates.append(dict(planned=path, retained=retained, template=emitted_template,
                               prefix=prefix['written'] if prefix else None, suffix=suffix['written'] if suffix else None,
                               syllableReduction=reduction))
    return candidates, excluded

def recount(word, configuration, options, pools):
    counts = Counter({'category/words': 1})
    morphology = configuration['morphology']
    trace = word['trace'].get('morphology')
    if not options.get('morphology', True) or not morphology['enabled']:
        assert not trace, 'Disabled morphology must not assign a category plan'
        counts['category/unassigned'] += 1
        return counts
    assert trace and trace.get('categories'), 'Enabled explicit category policy lacks its trace'
    decision = trace['categories']
    requested = decision['requestedTemplate']
    assert requested in TEMPLATES
    candidates, excluded = pools[requested]
    assert decision['eligiblePaths'] == len(candidates) and decision['excludedProjections'] == excluded
    assert math.isclose(decision['totalWeight'], sum(p['planned']['weight'] for p in candidates), rel_tol=1e-12, abs_tol=1e-8)
    match = [path for path in candidates if same_path(decision['planned'], path['planned'])]
    assert len(match) == 1, 'Planned path must identify one licensed source opportunity'
    expected = match[0]
    assert same_path(decision['retained'], expected['retained']), 'Retained path differs from independent projection'
    for key in ('template', 'prefix', 'suffix', 'syllableReduction'):
        assert trace.get(key) == expected[key], ('Affix trace/path mismatch', key)
    counts['category/assigned'] += 1
    counts['category/requested/'+requested] += 1
    counts['category/retained/'+trace['template']] += 1
    counts['category/stem/'+decision['retained']['stem']] += 1
    counts['category/final/'+decision['retained']['final']] += 1
    for step in decision['retained']['steps']:
        counts['category/sense/'+step['sense']] += 1
        counts['category/transition/'+step['input']+'/'+step['output']] += 1
    return counts
