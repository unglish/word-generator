"""Numerically reconstruct registered results using independent Python arithmetic."""
import json
import math
import sys
from pathlib import Path
from independent_reconstruction import CLASSES, CONSONANTS, compact, integer_model, observations, selected_entries, splits_for

def context_key(context, level):
    keys = ('constituent', 'nucleusClass') + (() if level == 'class' else ('stress',)) + (('wordInitial', 'wordFinal') if level == 'full' else ())
    return compact({k: context[k] for k in keys})

def base_log(model, context, tokens):
    consonants = tokens if context['constituent'] == 'onset' else tokens[1:]
    length = model['base']['lengths']['onset' if context['constituent'] == 'onset' else 'coda']
    stop = (length['events'] + 1) / (length['events'] + length['phones'] + 2)
    result = math.log(stop) + len(consonants) * math.log1p(-stop)
    denominator = sum(model['base']['consonants'].values()) + 0.5 * len(CONSONANTS)
    for token in consonants:
        result += math.log((model['base']['consonants'].get(token, 0) + 0.5) / denominator)
    if context['constituent'] == 'rime':
        group = CLASSES[context['nucleusClass']]
        denominator = sum(model['base']['vowels'].get(v, 0) for v in group) + 0.5 * len(group)
        result += math.log((model['base']['vowels'].get(tokens[0], 0) + 0.5) / denominator)
    return result

def log_probability(model, context, tokens, alpha, kind):
    result = base_log(model, context, tokens)
    for level in (('class',) if kind == 'baseline' else ('class', 'stress', 'full')):
        row = model['levels'][level].get(context_key(context, level), {'total': 0, 'counts': {}})
        count = row['counts'].get(' '.join(tokens), 0)
        # Independent stable log1p form of count + alpha * parent.
        prior = math.log(alpha) + result
        if count:
            observed = math.log(count)
            result = max(observed, prior) + math.log1p(math.exp(-abs(observed-prior)))
        else:
            result = prior
        result -= math.log(row['total'] + alpha)
    return result

def summary(model, records, alpha, kind):
    total = 0
    for _, context, tokens in records:
        total -= log_probability(model, context, tokens, alpha, kind)
    words = len({spelling for spelling, _, _ in records})
    return dict(words=words, events=len(records), negativeLogLikelihood=total,
                meanPerWord=total/words, meanPerEvent=total/len(records))

def compare(actual, expected, path='root'):
    if isinstance(expected, dict):
        assert actual.keys() == expected.keys(), path + ': keys'
        for key in expected:
            compare(actual[key], expected[key], path + '/' + key)
    elif isinstance(expected, list):
        assert len(actual) == len(expected), path + ': length'
        for index, value in enumerate(expected):
            compare(actual[index], value, path + '/' + str(index))
    elif isinstance(expected, float):
        assert math.isfinite(actual) and math.isclose(actual, expected, rel_tol=1e-11, abs_tol=1e-10), (path, actual, expected)
    else:
        assert actual == expected, (path, actual, expected)

def verify(source, artifact):
    entries, _ = selected_entries(source)
    splits = splits_for(entries, 'q17-2026-10-02')
    model = integer_model(splits['training'])
    compare(artifact['model'], model)
    onsets = set(model['initialOnsets'])
    development = list(observations(splits['development'], onsets))
    choices = {}
    for kind in ('baseline', 'candidate'):
        trials = [dict(alpha=alpha, score=summary(model, development, alpha, kind)) for alpha in (0.5, 1, 2, 4, 8, 16, 32, 64)]
        selected = min(trials, key=lambda trial: (trial['score']['meanPerWord'], trial['alpha']))
        choices[kind] = selected['alpha']
        compare(artifact['development'][kind], dict(kind=kind, alpha=selected['alpha'], trials=trials))
    held = list(observations(splits['heldOut'], onsets))
    for kind in choices:
        compare(artifact['heldOut'][kind], summary(model, held, choices[kind], kind))
    bins, words = {}, {}
    for spelling, context, tokens in held:
        key = ' '.join(tokens)
        count = model['levels']['full'].get(context_key(context, 'full'), {}).get('counts', {}).get(key, 0)
        class_count = model['levels']['class'].get(context_key(context, 'class'), {}).get('counts', {}).get(key, 0)
        baseline = -log_probability(model, context, tokens, choices['baseline'], 'baseline')
        candidate = -log_probability(model, context, tokens, choices['candidate'], 'candidate')
        band = str(count) if count <= 2 else '3-5' if count <= 5 else '6-20' if count <= 20 else '>20'
        keys = ['all', 'constituent/'+context['constituent'], 'stress/'+str(context['stress']),
                'nucleusClass/'+context['nucleusClass'], f"edges/{int(context['wordInitial'])}/{int(context['wordFinal'])}",
                'trainingFrequency/'+band, 'fullContext/'+context_key(context, 'full')]
        for bin_key in keys:
            row = bins.setdefault(bin_key, dict(events=0, baselineNegativeLogLikelihood=0., candidateNegativeLogLikelihood=0., unseenFullContextEvents=0, unseenClassEvents=0))
            row['events'] += 1
            row['baselineNegativeLogLikelihood'] += baseline
            row['candidateNegativeLogLikelihood'] += candidate
            row['unseenFullContextEvents'] += int(count == 0)
            row['unseenClassEvents'] += int(class_count == 0)
        word = words.setdefault(spelling, dict(spelling=spelling, events=0, baseline=0., candidate=0., delta=0.))
        word['events'] += 1
        word['baseline'] += baseline
        word['candidate'] += candidate
        word['delta'] += candidate-baseline
    compare(artifact['heldOut']['bins'], bins)
    compare(artifact['heldOut']['words'], [words[key] for key in sorted(words)])
    support = []
    for key, row in sorted(model['levels']['full'].items()):
        context = json.loads(key)
        sequences = [token.split(' ') if token else [] for token in row['counts']]
        record = dict(context=context, trainingEvents=row['total'], observedSupport=len(sequences))
        for kind in ('baseline', 'candidate'):
            probabilities = [math.exp(log_probability(model, context, tokens, choices[kind], kind)) for tokens in sequences]
            # Direct complement of independently evaluated fitted support, unlike the production count recurrence.
            record[kind+'NovelMass'] = 1 - math.fsum(probabilities)
            record[kind+'TopTenObservedMass'] = math.fsum(sorted(probabilities, reverse=True)[:10])
        support.append(record)
    compare(artifact['support'], support)
    return dict(passed=True, developmentTrials=16, heldOutWords=len(words), heldOutEvents=len(held), bins=len(bins),
                supportContexts=len(support), scope='Independent integer model, all smoothing trials and choices, held-out summaries, every per-word likelihood and stratum, and direct-complement support diagnostics.')

if __name__ == '__main__':
    result = verify(Path(sys.argv[1]).read_bytes(), json.loads(Path(sys.argv[2]).read_text())['artifact'])
    print(json.dumps(result, indent=2))
