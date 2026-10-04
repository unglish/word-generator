import hashlib
import json
from pathlib import Path

OUT=Path('/private/tmp/q19-paired-comparison-v1')
OUT.mkdir()
def pin(path):
    digest=hashlib.sha256();size=0
    with path.open('rb') as handle:
        while chunk:=handle.read(1024*1024):digest.update(chunk);size+=len(chunk)
    return dict(bytes=size,sha256=digest.hexdigest())
paths=[Path(__file__)]
archives={};counts={}
for arm in ['control','candidate']:
    root=Path(f'/private/tmp/q19-{arm}-capture-v1')
    complete=json.loads((root/'complete.json').read_text());assert complete['passed'] and complete['words']==200000
    assert pin(root/'manifest.json')==complete['manifest']
    manifest=json.loads((root/'manifest.json').read_text());archives[arm]=(root,manifest)
    paths += [root/'manifest.json',root/'complete.json']
    for record in manifest['files']:
        path=root/record['file'];assert pin(path)=={key:record[key] for key in ['bytes','sha256']};paths.append(path)
    recount_path=Path(f'/private/tmp/q19-{arm}-recount-v1/complete.json');paths.append(recount_path)
    recount=json.loads(recount_path.read_text());assert recount['passed'] and recount['words']==200000
    assert recount['before'][str(root/'manifest.json')]==pin(root/'manifest.json')
    counts[arm]=recount
before={str(path):pin(path) for path in paths}
a,b=counts['control'],counts['candidate'];assert a['profiles'].keys()==b['profiles'].keys()
unchanged=[]
for profile in ['lexicon-default','lexicon-bare','monosyllables-bare']:
    assert a['profiles'][profile]==b['profiles'][profile]
    for record in archives['control'][1]['files']:
        if record['profile']!=profile:continue
        candidate=next(row for row in archives['candidate'][1]['files'] if row['file']==record['file'])
        assert {key:record[key] for key in ['bytes','sha256','words','nextRngProbe']}=={key:candidate[key] for key in ['bytes','sha256','words','nextRngProbe']}
        unchanged.append(dict(profile=profile,seed=record['seed'],words=record['words'],sha256=record['sha256']))
assert sum(row['words'] for row in unchanged)==150000
comparisons={}
for profile in a['profiles']:
    baseline,candidate=a['distances'][profile],b['distances'][profile]
    metrics={key:dict(control=value,candidate=candidate[key],delta=candidate[key]-value,
               relativeChange=(candidate[key]/value-1) if value else None) for key,value in baseline.items()}
    ca,cb=a['profiles'][profile]['counts'],b['profiles'][profile]['counts']
    rates={}
    for key,denominator in [('polysyllablesMissingPrimary','polysyllables'),('multiplePrimaryWords','words'),
        ('fiveConsecutiveWrittenConsonantsWords','words'),('repairEvents','words'),('sameSegmentAdjacentEqualPairs','words')]:
        rates[key]=dict(denominator=denominator,controlNumerator=ca[key],candidateNumerator=cb[key],
         controlDenominator=ca[denominator],candidateDenominator=cb[denominator],
         controlRate=ca[key]/ca[denominator] if ca[denominator] else None,
         candidateRate=cb[key]/cb[denominator] if cb[denominator] else None)
    comparisons[profile]=dict(distancesAndDiversity=metrics,rates=rates,controlCounts=ca,candidateCounts=cb)
after={str(path):pin(path) for path in paths};assert before==after
result=dict(passed=True,wordsPerArm=200000,unchangedLexiconWords=150000,unchangedStreams=unchanged,
    comparisons=comparisons,before=before,after=after,
    interpretation='Paired independent corpus recount. Complete archived lexical profiles are byte-identical with equal next-state probes. Text distances improve for length/joint structure but phone/trigram fit, diversity and stress completeness regress. This comparison does not prove generator gates, timing, human preference or full candidate public replay.')
(OUT/'complete.json').write_text(json.dumps(result,indent=2)+'\n')
print('400,000 words compared; all 150,000 lexicon-profile words are byte-identical; every recorded distance/rate delta retained.')
