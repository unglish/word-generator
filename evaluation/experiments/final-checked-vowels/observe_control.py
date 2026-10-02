import gzip,json,hashlib,collections
from pathlib import Path
BASE=Path('.local-evidence/q02-resumed/archives/candidate')
OUT=Path('.local-evidence/final-checked-vowels')
CHECKED={'ɪ','ɛ','æ','ʌ','ʊ'}
def sound(p):return p if isinstance(p,str) else p['sound']
def problem(syllables):
    if not syllables:return False
    last=syllables[-1]
    return not last['coda'] and len(last['nucleus'])==1 and sound(last['nucleus'][0]) in CHECKED
counts=collections.Counter();profiles={};witnesses={};artifacts={}
for shard in sorted((BASE/'words').glob('*.gz')):
    digest=hashlib.sha256(shard.read_bytes()).hexdigest();artifacts[shard.name]=digest
    rows=0
    with gzip.open(shard,'rt') as f:
        for line in f:
            r=json.loads(line);w=r['word'];t=w['trace'];rows+=1;counts['words']+=1
            p=profiles.setdefault(r['profile'],collections.Counter());p['words']+=1
            if not problem(w['syllables']):continue
            counts['final_open_checked']+=1;p['final_open_checked']+=1
            last=w['syllables'][-1];stress=last.get('stress','unstressed');counts['stress:'+stress]+=1
            counts['sound:'+sound(last['nucleus'][0])]+=1
            template=t.get('morphology',{}).get('template','no-plan');counts['template:'+template]+=1
            ledger=t['finalWord']['phones'];lastidx=len(w['syllables'])-1
            final=next(x for x in ledger['final'] if x['syllable']==lastidx and x['segment']=='nucleus' and x['index']==0)
            initial=ledger['initial'][final['id']];src=initial['source'];key='source:'+src['kind']+':'+src.get('part','');counts[key]+=1
            n=t['finalNucleus'];before=problem(n['before']);counts['before_final_nucleus:'+str(before)]+=1
            root=problem(w['lexical']['root']);counts['root_open_checked:'+str(root)]+=1
            stageflags={s['name']:problem(s['after']) for s in t['stages']}
            for name,val in stageflags.items():
                if val:counts['stage:'+name]+=1
            category=(stress,sound(last['nucleus'][0]),template,key,before,root)
            label='|'.join(map(str,category))
            if label not in witnesses:witnesses[label]={'profile':r['profile'],'seed':r['seed'],'drawIndex':r['drawIndex'],'archive':shard.name,'archiveSha256':digest,'lineSha256':hashlib.sha256(line.encode()).hexdigest(),'word':w}
    assert rows==10000,(shard,rows)
    print(json.dumps({'shard':shard.name,'rows':rows,'cumulative':counts['words']}),flush=True)
result={'version':1,'sourceCommit':'7e34a17f31d44d1e31420f458bf6e2d99c5fa038','scope':'Q02 active-policy archived development corpus; exploratory, not candidate acceptance','checkedSounds':sorted(CHECKED),'counts':dict(sorted(counts.items())),'profiles':{k:dict(v) for k,v in profiles.items()},'archives':artifacts,'witnessStrata':len(witnesses)}
(OUT/'control-observation.json').write_text(json.dumps(result,indent=2)+'\n')
with gzip.open(OUT/'control-witnesses.json.gz','wt') as f:json.dump(witnesses,f,ensure_ascii=False)
print(json.dumps(result['counts']),flush=True)
