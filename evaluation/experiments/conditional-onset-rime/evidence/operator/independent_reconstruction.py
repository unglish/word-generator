"""Independent native-source, split and integer-model reconstruction; no TS imports."""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

VOWELS = set('AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW'.split())
CONSONANTS = set('B CH D DH F G HH JH K L M N NG P R S SH T TH V W Y Z ZH'.split())
CLASSES = {'diphthong': 'AW AY EY OW OY'.split(), 'rhotic': ['ER'],
           'monophthong': 'AA AE AH AO EH IH IY UH UW'.split()}
VOWEL_CLASS = {v: name for name, values in CLASSES.items() for v in values}
SOURCE_SHA = '81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22'

def compact(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False)

def digest(value):
    return hashlib.sha256(compact(value).encode()).hexdigest()

def selected_entries(raw):
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA:
        raise ValueError('Pinned dictionary bytes disagree')
    text = raw.decode('utf8')
    entries, excluded, seen = [], Counter(), set()
    for line, literal in enumerate(text.splitlines(), 1):
        stripped = literal.strip()
        if not stripped or stripped.startswith(';;;'):
            continue
        fields = re.split(r'\s+', re.split(r'\s+#', stripped, maxsplit=1)[0])
        label, tokens = fields[0], fields[1:]
        spelling = label.lower()
        if re.search(r'\(\d+\)$', label):
            reason = 'alternate_pronunciation'
        elif not re.fullmatch('[a-zA-Z]+', label):
            reason = 'non_ascii_spelling'
        elif not tokens or any(t not in CONSONANTS and not (t[-1:] in '012' and t[:-1] in VOWELS) for t in tokens):
            reason = 'unsupported_pronunciation'
        elif not any(t[-1:] in '012' for t in tokens):
            reason = 'no_vowel'
        elif spelling in seen:
            reason = 'duplicate_spelling'
        else:
            reason = None
        if reason:
            excluded[reason] += 1
        else:
            entries.append(dict(line=line, label=label, spelling=spelling, tokens=tokens))
            seen.add(spelling)
    if len(entries) != 117485:
        raise ValueError('Selection population disagrees')
    return entries, dict(excluded)

def splits_for(entries, seed):
    splits = dict(training=[], development=[], heldOut=[])
    for entry in entries:
        raw = hashlib.sha256(compact([seed, entry['spelling']]).encode()).digest()
        bucket = int.from_bytes(raw[:4], 'big') % 10000
        split = 'training' if bucket < 8000 else 'development' if bucket < 9000 else 'heldOut'
        splits[split].append(entry)
    return splits

def observations(entries, onsets):
    for entry in entries:
        tokens = entry['tokens']
        nuclei = [i for i, t in enumerate(tokens) if t[-1:] in '012']
        start = 0
        for index, vowel in enumerate(nuclei):
            boundary = len(tokens)
            if index + 1 < len(nuclei):
                next_vowel = nuclei[index + 1]
                boundary = next_vowel
                for candidate in range(vowel + 1, next_vowel + 1):
                    if ' '.join(tokens[candidate:next_vowel]) in onsets:
                        boundary = candidate
                        break
            for kind, phones in [('onset', tokens[start:vowel]),
                                 ('rime', [tokens[vowel][:-1]] + tokens[vowel+1:boundary])]:
                context = dict(constituent=kind, nucleusClass=VOWEL_CLASS[tokens[vowel][:-1]],
                               stress=int(tokens[vowel][-1]), wordInitial=index == 0,
                               wordFinal=index == len(nuclei)-1)
                yield entry['spelling'], context, phones
            start = boundary

def integer_model(training):
    onsets = {''}
    for entry in training:
        first = next(i for i, t in enumerate(entry['tokens']) if t[-1:] in '012')
        onsets.add(' '.join(entry['tokens'][:first]))
    base = dict(consonants={}, vowels={}, lengths=dict(onset=dict(events=0, phones=0), coda=dict(events=0, phones=0)))
    levels = dict(class_={}, stress={}, full={})
    levels['class'] = levels.pop('class_')
    for _, context, phones in observations(training, onsets):
        consonants = phones if context['constituent'] == 'onset' else phones[1:]
        for token in consonants:
            base['consonants'][token] = base['consonants'].get(token, 0) + 1
        length = base['lengths']['onset' if context['constituent'] == 'onset' else 'coda']
        length['events'] += 1
        length['phones'] += len(consonants)
        if context['constituent'] == 'rime':
            base['vowels'][phones[0]] = base['vowels'].get(phones[0], 0) + 1
        for level in ('class', 'stress', 'full'):
            keys = ('constituent', 'nucleusClass') + (() if level == 'class' else ('stress',)) + (('wordInitial', 'wordFinal') if level == 'full' else ())
            key = compact({k: context[k] for k in keys})
            row = levels[level].setdefault(key, dict(total=0, counts={}))
            token = ' '.join(phones)
            row['total'] += 1
            row['counts'][token] = row['counts'].get(token, 0) + 1
    return dict(version='conditional-onset-rime-v1', initialOnsets=sorted(onsets), trainingEntries=len(training), base=base, levels=levels)

if __name__ == '__main__':
    import sys
    entries, excluded = selected_entries(Path(sys.argv[1]).read_bytes())
    splits = splits_for(entries, 'q17-2026-10-02')
    model = integer_model(splits['training'])
    summary = dict(selection=dict(entries=len(entries), digest=digest(entries), excluded=excluded),
                   splits={name: dict(entries=len(values), digest=digest(values)) for name, values in splits.items()},
                   modelRows={name: len(rows) for name, rows in model['levels'].items()})
    if len(sys.argv) > 2:
        artifact = json.loads(Path(sys.argv[2]).read_text())['artifact']
        assert artifact['model'] == model, 'Integer model differs'
        assert artifact['splits'] == summary['splits'], 'Split identities differ'
        for key, value in summary['selection'].items():
            assert artifact['selection'][key] == value, 'Selection differs: ' + key
        summary['agreement'] = 'all source identities, splits and integer model tables'
    print(json.dumps(summary, indent=2))
