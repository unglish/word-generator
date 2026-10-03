"""Independent complete source/split/count/likelihood/POS reconstruction."""
import collections
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import audit_sources as source

OUT = Path('/private/tmp/q19-independent-fit-v1')
FIT = Path('/private/tmp/q19-registered-fit-v1')

def close(actual, expected):
    assert math.isclose(actual, expected, rel_tol=2e-12, abs_tol=2e-9), (actual, expected)

def counts(rows, weighting):
    phones, lengths, syllables = collections.Counter(), collections.Counter(), {}
    for spelling, count, tokens in rows:
        mass = 1 if weighting == 'types' else count
        lengths[len(tokens)] += mass
        row = syllables.setdefault(str(len(tokens)), collections.Counter())
        row[sum(phone[-1:] in '012' for phone in tokens)] += mass
        for phone in tokens:
            phones[phone] += mass
    return dict(version='frequency-citation-counts-v1', weighting=weighting, types=len(rows),
                wordMass=sum(lengths.values()), phoneMass=sum(phones.values()), phones=dict(phones),
                lengths={str(k): v for k, v in lengths.items()},
                syllablesByLength={k: {str(s): n for s, n in v.items()} for k, v in syllables.items()})

def score(model, entry, alpha):
    spelling, count, tokens = entry
    length = len(tokens)
    syllables = sum(phone[-1:] in '012' for phone in tokens)
    length_count = model['lengths'].get(str(length), 0)
    length_prob = (length_count + alpha * 2 ** -length) / (model['wordMass'] + alpha)
    syllable_prob = (model['syllablesByLength'].get(str(length), {}).get(str(syllables), 0)
                     + alpha / length) / (length_count + alpha)
    joint = -math.log(length_prob) - math.log(syllable_prob)
    phone_nll = -sum(math.log((model['phones'].get(phone, 0) + alpha / 69)
                              / (model['phoneMass'] + alpha)) for phone in tokens)
    return dict(spelling=spelling, count=count, phoneCount=length, syllableCount=syllables,
                jointLengthSyllableNll=joint, phoneNllSum=phone_nll, objective=joint + phone_nll / length)

def verify_word(actual, expected):
    for key, value in expected.items():
        if isinstance(value, float):
            close(actual[key], value)
        else:
            assert actual[key] == value

def main():
    OUT.mkdir()
    inputs = [source.BASE / name for name in ['q19-subtlexus2.zip', 'q19-subtlexus-pos.xlsx',
              'q17-cmudict-74790861.dict', 'q19-subtlexus-license.txt']]
    inputs += [FIT / name for name in ['artifact.json', 'before.json', 'after.json', 'complete.json']]
    inputs += [Path(__file__), Path(source.__file__)]
    before = {str(path): source.pin(path) for path in inputs}
    artifact = json.loads((FIT / 'artifact.json').read_text())
    complete = json.loads((FIT / 'complete.json').read_text())
    assert complete['passed'] and complete['artifact'] == source.pin(FIT / 'artifact.json')
    assert json.loads((FIT / 'before.json').read_text()) == json.loads((FIT / 'after.json').read_text())
    raw = source.text_rows('q19-subtlexus2.zip')
    cmu = source.compatible_cmu()
    assert source.account(raw, cmu) | {} == artifact['coverage'] | {
        'orderedJoinedSpellingCountPhoneDigest': source.account(raw, cmu)['orderedJoinedSpellingCountPhoneDigest']}
    rows = [(row['Word'].lower(), int(row['FREQcount']), cmu[row['Word'].lower()])
            for row in raw if row['Word'].lower() in cmu]
    split = dict(training=[], development=[], heldOut=[])
    for entry in rows:
        bucket = int.from_bytes(hashlib.sha256(json.dumps(['q19-2026-10-02', entry[0]],
                    separators=(',', ':')).encode()).digest()[:4], 'big') % 10000
        key = 'training' if bucket < 8000 else 'development' if bucket < 9000 else 'heldOut'
        split[key].append(entry)
    assert artifact['split'] == {key: [row[0] for row in entries] for key, entries in split.items()}
    models = {arm: counts(split['training'], weighting) for arm, weighting in
              [('baseline', 'types'), ('candidate', 'tokens')]}
    assert artifact['models'] == models
    held_scores = {}
    for arm, model in models.items():
        trials = []
        for actual in artifact['choices'][arm]['trials']:
            alpha = actual['alpha']
            scores = [score(model, entry, alpha) for entry in split['development']]
            tokens = sum(row['count'] for row in scores)
            phones = sum(row['count'] * row['phoneCount'] for row in scores)
            objective = sum(row['count'] * row['objective'] for row in scores)
            joint = sum(row['count'] * row['jointLengthSyllableNll'] for row in scores)
            phone_nll = sum(row['count'] * row['phoneNllSum'] for row in scores)
            expected = dict(types=len(scores), tokens=tokens, phones=phones, objectiveSum=objective,
                meanObjective=objective/tokens, jointLengthSyllableNllSum=joint,
                meanJointLengthSyllableNll=joint/tokens, phoneNllSum=phone_nll, meanPhoneNll=phone_nll/phones)
            verify_word(actual, expected)
            trials.append((expected['meanObjective'], alpha))
        assert [row['alpha'] for row in artifact['choices'][arm]['trials']] == [.5, 1, 2, 4, 8, 16, 32, 64]
        alpha = min(trials)[1]
        assert alpha == artifact['choices'][arm]['alpha']
        held_scores[arm] = [score(model, entry, alpha) for entry in split['heldOut']]
        for actual, expected in zip(artifact['scores'][arm]['words'], held_scores[arm], strict=True):
            verify_word(actual, expected)
    workbook = {row['Word'].lower(): row for row in source.workbook_rows()}
    categories = dict(content={'Adjective','Adverb','Noun','Verb'},
        function={'Article','Conjunction','Determiner','Ex','Not','Preposition','Pronoun','To'},
        other={'Interjection','Letter','Name','Number','Unclassified'})
    for actual in artifact['pos']:
        row = workbook[actual['spelling']]
        assert actual['row']['rawPosTags'] == row.get('All_PoS_SUBTLEX')
        assert actual['row']['rawPosCounts'] == row.get('All_freqs_SUBTLEX')
        raw_values = row.get('All_freqs_SUBTLEX', '').split('.')
        tags = row.get('All_PoS_SUBTLEX', '').split('.')
        valid = all(value.isdigit() for value in raw_values) and bool(tags[0])
        pairs = list(zip(tags, map(int, raw_values), strict=True)) if valid else None
        assert actual['counts'] == ([dict(tag=tag, count=n) for tag, n in pairs] if pairs is not None else None)
        total = sum(n for _, n in pairs) if pairs is not None else None
        allocation = actual['allocation']
        word_count = int(row['FREQcount'])
        assert allocation['wordCount'] == word_count and allocation['taggedCount'] == total
        assert allocation['wordMinusTaggedCount'] == (word_count-total if total is not None else None)
        for category, tag_set in categories.items():
            expected = Fraction(word_count * sum(n for tag,n in pairs if tag in tag_set), total) if total else Fraction(0)
            assert allocation['masses'][category] == dict(numerator=str(expected.numerator), denominator=str(expected.denominator))
        assert allocation['masses']['unknown'] == dict(numerator=str(0 if total else word_count), denominator='1')
    after = {str(path): source.pin(path) for path in inputs}
    assert after == before
    report = dict(passed=True, before=before, after=after, sourceRows=len(raw),
                  splits={key: len(entries) for key,entries in split.items()}, developmentTrials=16,
                  heldOutWordsPerArm=len(split['heldOut']), exactPosRows=len(artifact['pos']),
                  scope='Complete source/split/count/development-choice/per-word likelihood and rational POS verification. Generator gates and human preference not evaluated.')
    (OUT/'complete.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))

if __name__ == '__main__':
    main()
