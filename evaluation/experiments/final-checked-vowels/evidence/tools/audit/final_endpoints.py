from collections import Counter

CHECKED = frozenset(['ɪ', 'ɛ', 'æ', 'ʌ', 'ʊ'])

def ending(syllables):
    if not syllables or not syllables[-1]['nucleus']:
        return None
    last = syllables[-1]
    return last, last['nucleus'][-1]['sound']

def final_counts(word):
    counts = Counter()
    trace = word['trace']
    lexical = word['lexical']
    counts['endpoint/words'] = 1
    for name, syllables in [('lexical', lexical['syllables']), ('surface', word['syllables'])]:
        pair = ending(syllables)
        assert pair is not None
        last, sound = pair
        if not last['coda']:
            counts[f'endpoint/{name}/open/{sound}'] += 1
            if sound in CHECKED:
                counts[f'endpoint/{name}/configuredViolation'] += 1
                if len(last['nucleus']) == 1:
                    counts[f'endpoint/{name}/legacyDiagnostic'] += 1
                counts[f'endpoint/{name}/stress/{last.get("stress", "unstressed")}'] += 1
        elif sound in CHECKED:
            counts[f'endpoint/{name}/closedChecked/{sound}'] += 1
    root_start = lexical['rootSyllableStart']
    root = lexical['root']
    last_root = root[-1]
    if not last_root['coda'] and last_root['nucleus'][-1]['sound'] in CHECKED:
        domain = 'internal' if root_start + len(root) < len(lexical['syllables']) else 'wordFinal'
        counts[f'endpoint/root/openChecked/{domain}'] += 1
    final = trace['finalWord']['phones']
    packet = trace['finalNucleus']
    assert packet['after'] == lexical['syllables'] and packet['rootAfter'] == root
    assert packet['rootAfter'] == trace['writerInput']
    positions = {p['id']: p for p in final['final']}
    replacements = [change for change in final['realization'] if change['rule'] == 'repairFinalCheckedVowel']
    events = [event for event in packet['repairs'] if event['rule'] == 'repairFinalCheckedVowel']
    assert len(replacements) == len(events)
    assert len(replacements) <= 1
    for replacement, event in zip(replacements, events):
        identity = replacement['id']
        assert type(identity) is int and identity >= 0
        origin = final['initial'][identity]['source']
        assert origin['kind'] == 'segment' and origin['part'] == 'root' and origin['segment'] == 'nucleus'
        ri, ni = origin['syllable'], origin['index']
        assert type(ri) is int and type(ni) is int and ri >= 0 and ni >= 0
        position = positions[identity]
        si = position['syllable']
        assert position['segment'] == 'nucleus' and position['index'] == ni
        assert si == root_start + ri and si == len(packet['after']) - 1
        assert ni == len(packet['after'][si]['nucleus']) - 1 and not packet['after'][si]['coda']
        before = replacement['before']['sound']; after = replacement['after']['sound']
        assert before in CHECKED and after not in CHECKED
        assert (event['before'], event['after']) == (before, after)
        assert root[ri]['nucleus'][ni] == replacement['after']
        assert packet['after'][si]['nucleus'][ni] == replacement['after']
        assert final['initial'][identity]['initialSound'] == packet['rootBefore'][ri]['nucleus'][ni]['sound']
        counts['endpoint/repair/events'] += 1
        counts[f'endpoint/repair/from/{before}'] += 1
        counts[f'endpoint/repair/to/{after}'] += 1
        counts[f'endpoint/repair/stress/{packet["after"][si].get("stress", "unstressed")}'] += 1
    return counts
