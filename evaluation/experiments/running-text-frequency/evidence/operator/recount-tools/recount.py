"""Independent complete archived-word distributions and frozen reference distances."""
import collections
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import sys

ROOT=Path('/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator')
FIT=Path('/private/tmp/q19-registered-fit-v1/artifact.json')

def pin(path):
    digest=hashlib.sha256(); size=0
    with path.open('rb') as handle:
        while chunk:=handle.read(1024*1024):
            digest.update(chunk);size+=len(chunk)
    return dict(bytes=size,sha256=digest.hexdigest())

def jsd(left,right):
    a,b=sum(left.values()),sum(right.values())
    assert a>0 and b>0
    result=0.0
    for key in left.keys()|right.keys():
        p,q=left.get(key,0)/a,right.get(key,0)/b
        middle=(p+q)/2
        if p:result+=p*math.log(p/middle)/2
        if q:result+=q*math.log(q/middle)/2
    return result

def observe(word):
    assert isinstance(word,dict) and isinstance(word.get('trace'),dict)
    spelling=word['written']['clean'].lower()
    assert re.fullmatch('[a-z]+',spelling)
    syllables=word['syllables'];assert syllables
    phones=[];primary=secondary=0
    adjacent=0
    for syllable in syllables:
        assert syllable['nucleus']
        for position in ['onset','nucleus','coda']:
            cluster=syllable[position]
            sounds=[p['sound'] for p in cluster]
            assert all(isinstance(sound,str) and sound for sound in sounds)
            adjacent+=sum(left==right for left,right in zip(sounds,sounds[1:]))
            phones+=sounds
        primary+=syllable.get('stress')=='ˈ'
        secondary+=syllable.get('stress')=='ˌ'
    trace=word['trace']
    assert isinstance(trace.get('stages'),list) and trace['stages']
    assert isinstance(trace.get('repairs'),list)
    return dict(spelling=spelling,phones=phones,syllables=len(syllables),primary=primary,secondary=secondary,
                adjacent=adjacent,repairs=[event['rule'] for event in trace['repairs']],
                morphology=trace.get('morphology',{}).get('template','unavailable'),
                attempts=trace.get('attempts'))

def counter_set():
    return {key:collections.Counter() for key in ['counts','spellings','letterLengths','phoneLengths','syllableCounts',
        'jointLengthSyllables','phones','trigrams','stressPatterns','morphologyTemplates','repairRules','attempts']}

def add(counters,observation):
    word=observation;counts=counters['counts'];counts['words']+=1;counts['phones']+=len(word['phones'])
    counts['polysyllables']+=word['syllables']>1
    counts['polysyllablesMissingPrimary']+=word['syllables']>1 and word['primary']==0
    counts['multiplePrimaryWords']+=word['primary']>1
    counts['sameSegmentAdjacentEqualPairs']+=word['adjacent']
    counts['fiveConsecutiveWrittenConsonantsWords']+=bool(re.search('[^aeiou]{5}',word['spelling']))
    counts['repairEvents']+=len(word['repairs'])
    for key,value in [('spellings',word['spelling']),('letterLengths',len(word['spelling'])),
                     ('phoneLengths',len(word['phones'])),('syllableCounts',word['syllables']),
                     ('jointLengthSyllables',f"{len(word['phones'])}:{word['syllables']}"),
                     ('stressPatterns',f"{word['syllables']}:{word['primary']}:{word['secondary']}"),
                     ('morphologyTemplates',word['morphology']),('attempts',str(word['attempts']))]:
        counters[key][value]+=1
    counters['phones'].update(word['phones']);counters['repairRules'].update(word['repairs'])
    counters['trigrams'].update(word['spelling'][i:i+3] for i in range(len(word['spelling'])-2))

def main():
    arm=sys.argv[1];assert arm in ['control','candidate']
    archive=Path(f'/private/tmp/q19-{arm}-capture-v1');out=Path(f'/private/tmp/q19-{arm}-recount-v1');out.mkdir()
    complete=json.loads((archive/'complete.json').read_text());assert complete['passed']
    assert pin(archive/'manifest.json')==complete['manifest']
    manifest=json.loads((archive/'manifest.json').read_text());assert manifest['arm']==arm and manifest['words']==200000
    reference_paths=[ROOT/'data/cmu/cmu-lexicon-trigrams.json',ROOT/'data/cmu/phoneme-normalization.json']
    paths=[archive/'manifest.json',FIT,Path(__file__),*reference_paths]
    for entry in manifest['files']:
        path=archive/entry['file'];assert pin(path)=={key:entry[key] for key in ['bytes','sha256']};paths.append(path)
    before={str(path):pin(path) for path in paths}
    fit=json.loads(FIT.read_text());mapping=json.loads(reference_paths[1].read_text())
    token_model=fit['models']['candidate']
    token_phones=collections.Counter()
    for phone,mass in token_model['phones'].items():
        base=re.sub('[012]$','',phone);token_phones[mapping['arpabetToIpa'][base]]+=mass
    token_joint={f'{length}:{syllables}':mass for length,row in token_model['syllablesByLength'].items() for syllables,mass in row.items()}
    reference_trigrams=json.loads(reference_paths[0].read_text())
    profiles={};streams=[];expected=set()
    for profile in manifest['protocol']['profiles']:
        counters=counter_set();profiles[profile['id']]=counters
        for seed in profile['seeds']['development']:
            name=f"{profile['id']}-{seed}.jsonl.gz";expected.add(name);stream=counter_set();count=0
            with gzip.open(archive/name,'rt') as handle:
                for line in handle:
                    row=json.loads(line)
                    assert (row['profile'],row['seed'],row['drawIndex'])==(profile['id'],seed,count)
                    observation=observe(row['word']);add(counters,observation);add(stream,observation);count+=1
            assert count==10000
            streams.append(dict(profile=profile['id'],seed=seed,counters=stream))
            print(f'{arm} {profile["id"]}/{seed}: {count} words independently recounted',flush=True)
    assert expected=={entry['file'] for entry in manifest['files']} and len(expected)==20
    distances={}
    for profile,counters in profiles.items():
        coarse=collections.Counter()
        for phone,count in counters['phones'].items():coarse[mapping['generatedAliases'].get(phone,phone)]+=count
        counts=counters['counts'];assert counts['words']==50000 and counts['phones']==sum(counters['phones'].values())
        for key in ['letterLengths','phoneLengths','syllableCounts','jointLengthSyllables','stressPatterns','morphologyTemplates','attempts','spellings']:
            assert sum(counters[key].values())==50000
        distances[profile]=dict(uniqueSpellings=len(counters['spellings']),
          duplicateDraws=50000-len(counters['spellings']),
          phoneLengthJsdToTokenTraining=jsd({str(k):v for k,v in counters['phoneLengths'].items()},token_model['lengths']),
          jointLengthSyllableJsdToTokenTraining=jsd(counters['jointLengthSyllables'],token_joint),
          coarsePhoneJsdToTokenTraining=jsd(coarse,token_phones),
          writtenTrigramJsdToHistoricalCmu=jsd(counters['trigrams'],reference_trigrams))
    after={str(path):pin(path) for path in paths};assert after==before
    report=dict(passed=True,arm=arm,words=200000,before=before,after=after,profiles=profiles,streams=streams,distances=distances,
      interpretation='JSD natural logs. Coarse phone comparison uses pinned historical stress-collapsing normalization; no dialect/stress identity claim. Adjacent-equality counts are descriptive, not all illegality. Trigrams use full historical CMU table. Citation training targets include unsupported mass; generated structures include morphology. No human preference inference.')
    (out/'complete.json').write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n')

if __name__=='__main__':main()
