"""Exploratory inventory of recorded doubling, no generation or acceptability scoring."""
import collections,gzip,hashlib,json,pathlib
ROOT=pathlib.Path('/private/tmp/q13c-unit-normalization-candidate-v1')
PIN='dd931b501b6c26bbd17f953683eabee0d3b6d45aa0f3ead593d8902678d8dff3'
OUT=pathlib.Path('/private/tmp/q12c-doubling-inventory-v1.json')
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def verify(p,e):
 assert p.stat().st_size==e['bytes'] and sha(p)==e['sha256'],str(p)
assert sha(ROOT/'manifest.json')==PIN
m=json.loads((ROOT/'manifest.json').read_text())['manifest']
assert m['generator']['sourceDigest']=='75cb1cb805112a1dee06d15a3b54636d94825fd10952e40aff7010d4997f6450'
for e in m['artifacts']:verify(ROOT/e['file'],e)
expected={(p['id'],s) for p in m['protocol']['profiles'] for s in p['seeds']['development']}
counts=collections.Counter();relations={};witnesses={};streams=[]
for artifact in m['artifacts']:
 if not artifact['file'].startswith('words/'):continue
 n=0;stream=None
 with gzip.open(ROOT/artifact['file'],'rt') as f:
  for line in f:
   row=json.loads(line);coord=(row['profile'],row['seed']);assert coord in expected
   if stream is None:stream=coord
   assert coord==stream and row['drawIndex']==n
   n+=1;w=row['word'];t=w['trace'];base=t['baseSpelling'];assert base['version']==3
   choices={g['index']:g for g in t['graphemeSelections']};assert len(choices)==len(t['graphemeSelections'])
   phones={p['id']:p for p in base['phones']}
   assert len(choices)==len(base['units'])
   word_success=False
   for u in base['units']:
    assert len(u['phoneIds'])==1
    phone=phones[u['phoneIds'][0]];g=choices[u['choiceId']];d=g['doubling']
    assert phone['soundAtSpelling']==g['phoneme'] and u['selected']==g['selected']
    # afterDoubling is the sampler output; emitted may include a later silent-e decision.
    inc=u['doublingIncrement'];assert inc in (0,1)
    success='result' in d
    assert not success or (d['attempted'] and inc==1 and d['result']==u['afterDoubling'])
    assert success or u['afterDoubling']==u['selected']
    kind='sampled-success' if success else ('sampled-failure' if d['attempted'] else ('direct-counted' if inc else 'skipped'))
    key=json.dumps([g['phoneme'],u['selected'],u['afterDoubling'],kind,d.get('reason')],ensure_ascii=False)
    c=relations.setdefault(key,collections.Counter());c['all']+=1;c[row['profile']]+=1
    counts['units']+=1;counts[kind]+=1;counts['quotaIncrements']+=inc
    if kind in ('sampled-success','direct-counted') and key not in witnesses:
     witnesses[key]={'coordinate':{k:row[k] for k in ('profile','seed','drawIndex')},'unitId':u['id'],'word':w}
    word_success|=success
   counts['words']+=1;counts['wordsWithSampledSuccess']+=word_success
 assert n==m['protocol']['wordsPerReplicate'];streams.append({'profile':stream[0],'seed':stream[1],'words':n});print(artifact['file'],n,flush=True)
assert len(streams)==20 and {(x['profile'],x['seed']) for x in streams}==expected
assert counts['words']==200000
for e in m['artifacts']:verify(ROOT/e['file'],e)
assert sha(ROOT/'manifest.json')==PIN
out={'version':'q12c-exploratory-doubling-inventory-v1','scope':'Archived root-before-morphology unit and selection events only. No human acceptability or final-output pronunciation claim. No generation.','manifestSha256':PIN,'sourceDigest':m['generator']['sourceDigest'],'scriptSha256':sha(pathlib.Path(__file__)),'counts':dict(counts),'streams':streams,'relations':[{'key':json.loads(k),'counts':dict(v)} for k,v in sorted(relations.items())],'firstWitnessPerSuccessfulOrDirectRelation':[{'key':json.loads(k),**v} for k,v in sorted(witnesses.items())]}
with OUT.open('x') as f:json.dump(out,f,ensure_ascii=False,indent=2);f.write('\n')
print('COMPLETE',counts,'relations',len(relations),'witnesses',len(witnesses),sha(OUT),flush=True)
