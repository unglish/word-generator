"""Reconstruct full held-out summaries, frequency strata and modeled POS strata."""
import collections
from fractions import Fraction
import json
import math
from pathlib import Path
import importlib.util
spec = importlib.util.spec_from_file_location("fit_verifier", Path(__file__).with_name("verify-fit.py"))
fit_verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fit_verifier)
score, close = fit_verifier.score, fit_verifier.close
import audit_sources as source

FIT = Path('/private/tmp/q19-registered-fit-v1')
OUT = Path('/private/tmp/q19-independent-strata-v1')

def summary(words):
    tokens = sum(word['count'] for word in words)
    phones = sum(word['count'] * word['phoneCount'] for word in words)
    objective = sum(word['count'] * word['objective'] for word in words)
    joint = sum(word['count'] * word['jointLengthSyllableNll'] for word in words)
    phone_nll = sum(word['count'] * word['phoneNllSum'] for word in words)
    return dict(types=len(words), tokens=tokens, phones=phones, objectiveSum=objective,
                meanObjective=objective/tokens, jointLengthSyllableNllSum=joint,
                meanJointLengthSyllableNll=joint/tokens, phoneNllSum=phone_nll, meanPhoneNll=phone_nll/phones)

def band(count):
    if count == 1:
        return '1'
    for limit, label in [(10,'2-9'), (100,'10-99'), (1000,'100-999')]:
        if count < limit:
            return label
    return '1000+'

def main():
    OUT.mkdir()
    paths = [FIT/'artifact.json', Path(__file__), Path(__file__).with_name('verify-fit.py'),
             Path(source.__file__), source.BASE/'q19-subtlexus-pos.xlsx']
    before = {str(path): source.pin(path) for path in paths}
    artifact = json.loads((FIT/'artifact.json').read_text())
    cmu = source.compatible_cmu()
    rows = {row['Word'].lower(): row for row in source.workbook_rows()}
    words = {arm: [score(model, (spelling, int(rows[spelling]['FREQcount']), cmu[spelling]),
                       artifact['choices'][arm]['alpha']) for spelling in artifact['split']['heldOut']]
             for arm, model in artifact['models'].items()}
    for arm, scores in words.items():
        for key, value in summary(scores).items():
            close(artifact['scores'][arm]['summary'][key], value)
    strata = {}
    for before_word, after_word in zip(words['baseline'], words['candidate'], strict=True):
        key = band(before_word['count'])
        row = strata.setdefault(key, dict(id=key,types=0,tokens=0,phones=0,
                             baselineObjectiveSum=0,candidateObjectiveSum=0))
        row['types'] += 1
        row['tokens'] += before_word['count']
        row['phones'] += before_word['count']*before_word['phoneCount']
        row['baselineObjectiveSum'] += before_word['count']*before_word['objective']
        row['candidateObjectiveSum'] += after_word['count']*after_word['objective']
    for key, row in strata.items():
        row['baselineMeanObjective'] = row['baselineObjectiveSum']/row['tokens']
        row['candidateMeanObjective'] = row['candidateObjectiveSum']/row['tokens']
    assert set(strata) == {row['id'] for row in artifact['frequencyStrata']}
    for actual in artifact['frequencyStrata']:
        for key, value in strata[actual['id']].items():
            if isinstance(value, str):
                assert actual[key] == value
            else:
                close(actual[key], value)
    categories = dict(content={'Adjective','Adverb','Noun','Verb'},
        function={'Article','Conjunction','Determiner','Ex','Not','Preposition','Pronoun','To'},
        other={'Interjection','Letter','Name','Number','Unclassified'}, name={'Name'}, unknown=set())
    pos = {}
    for category, tags in categories.items():
        terms = collections.Counter()
        mass = objective_before = objective_after = 0.0
        types = 0
        for before_word, after_word in zip(words['baseline'], words['candidate'], strict=True):
            raw = rows[before_word['spelling']]
            values = raw.get('All_freqs_SUBTLEX','').split('.')
            labels = raw.get('All_PoS_SUBTLEX','').split('.')
            valid = all(value.isdigit() for value in values) and bool(labels[0])
            pairs = list(zip(labels,map(int,values),strict=True)) if valid else []
            total = sum(value for _,value in pairs)
            if category == 'unknown':
                share = Fraction(before_word['count'] if not total else 0)
            else:
                share = Fraction(before_word['count']*sum(value for tag,value in pairs if tag in tags), total) if total else Fraction(0)
            if share:
                types += 1
                terms[share.denominator] += share.numerator
                mass += float(share)
                objective_before += float(share)*before_word['objective']
                objective_after += float(share)*after_word['objective']
        pos[category] = dict(contributingTypes=types, exactMassTerms=[dict(numerator=str(n),denominator=str(d))
            for d,n in sorted(terms.items())], approximateTokenMass=mass,
            baselineMeanObjective=objective_before/mass if mass else None,
            candidateMeanObjective=objective_after/mass if mass else None)
    close(sum(pos[category]['approximateTokenMass'] for category in ['content','function','other','unknown']),
          artifact['scores']['baseline']['summary']['tokens'])
    after = {str(path): source.pin(path) for path in paths}
    assert before == after
    report = dict(passed=True,before=before,after=after,frequencyStrata=list(strata.values()), modeledPosStrata=pos,
         interpretation='POS is FREQcount times within-row tag share. Name overlaps other; contributing types can overlap. Exact token masses are sums of rational terms; likelihood aggregates are floating approximations. No human preference or connected-speech inference.')
    (OUT/'complete.json').write_text(json.dumps(report,indent=2)+'\n')
    print('Complete held-out summaries, all five frequency bands and modeled POS strata verified.')

if __name__ == '__main__':
    main()
