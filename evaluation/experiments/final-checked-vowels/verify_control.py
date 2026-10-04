import json,hashlib,gzip
from pathlib import Path
base=Path('.local-evidence/q02-resumed/archives/candidate');out=Path('.local-evidence/final-checked-vowels')
o=json.loads((out/'control-observation.json').read_text());m=json.loads((base/'manifest.json').read_text())['manifest'];pins={a['file']:a for a in m['artifacts']}
for name,h in o['archives'].items():
    p=base/'words'/name
    assert h==pins['words/'+name]['sha256'],('hash',name)
    assert p.stat().st_size==pins['words/'+name]['bytes'],('length',name)
s=json.loads((base/'summary.json').read_text());agreements=[]
for p in s['profiles']:
    c=o['profiles'][p['id']];metric=p['metrics']['final_open_checked_vowel']
    assert c['final_open_checked']==metric['hits'],('hits',p['id'])
    assert c['words']==metric['eligible'],('eligible',p['id'])
    agreements.append({'profile':p['id'],'hits':metric['hits'],'eligible':metric['eligible']})
with gzip.open(out/'control-witnesses.json.gz','rt') as f:ws=json.load(f)
changed=0
for key,r in ws.items():
    w=r['word'];last=w['syllables'][-1]
    assert last['coda']==[] and len(last['nucleus'])==1 and last['nucleus'][0]['sound'] in o['checkedSounds'],('ending',key)
    ledger=w['trace']['finalWord']['phones'];positions=[x for x in ledger['final'] if x['segment']=='nucleus' and x['syllable']==len(w['syllables'])-1]
    assert len(positions)==1,('positions',key)
    origin=ledger['initial'][positions[0]['id']]['source']
    assert origin['kind']=='segment' and origin['part']=='root',('source',key)
    before=w['trace']['finalNucleus']['before'][-1]
    assert not before['coda'] and len(before['nucleus'])==1 and before['nucleus'][0]['sound'] in o['checkedSounds'],('pre-final',key)
    changed+=before['nucleus'][0]['sound']!=last['nucleus'][0]['sound']
grouped={}
for key,r in ws.items():grouped.setdefault(r['archive'],{})[r['drawIndex']]=r
checked=0
for name,requested in grouped.items():
    with gzip.open(base/'words'/name,'rt') as f:
        for line in f:
            row=json.loads(line);expected=requested.get(row['drawIndex'])
            if expected is None:continue
            assert row['profile']==expected['profile'] and row['seed']==expected['seed'],('coordinate',name)
            assert hashlib.sha256(line.encode()).hexdigest()==expected['lineSha256'],('line hash',name)
            assert row['word']==expected['word'],('word equality',name)
            checked+=1
            del requested[row['drawIndex']]
            if not requested:break
    assert not requested,('missing witnesses',name)
assert checked==len(ws)
result={'passed':True,'archiveHashesAndLengths':20,'qualitySummaryAgreement':agreements,'witnessesChecked':len(ws),'witnessesBoundToArchivedRows':checked,'witnessesWithDifferentPreFinalSound':changed,'observationSha256':hashlib.sha256((out/'control-observation.json').read_bytes()).hexdigest()}
(out/'control-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
