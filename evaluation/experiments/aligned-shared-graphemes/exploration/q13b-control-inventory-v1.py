"""Exploratory retained-event inventory, not a reconstruction of unsampled opportunities."""
import collections,gzip,hashlib,json,sys
from pathlib import Path
ARCHIVE=Path('/private/tmp/q12c-phoneme-aware-doubling-candidate-v1')
MANIFEST_SHA='1bd32617b8ab62b034eeb0ae91ac8e2d1da675035c9b03a49c1912fee751e3fb'
OUT=Path('/private/tmp/q13b-control-inventory-v1.json')
RULES={'spellingRule:ks-to-x','spellingRule:cx-to-x','spellingRule:gz-to-x'}
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
assert __debug__
script_sha=sha(Path(__file__))
assert sha(ARCHIVE/'manifest.json')==MANIFEST_SHA
manifest=json.loads((ARCHIVE/'manifest.json').read_text())['manifest']
def verify():
 assert sha(ARCHIVE/'manifest.json')==MANIFEST_SHA
 for a in manifest['artifacts']:
  parts=a['file'].split('/');assert all(p and p not in ('.','..') for p in parts)
  p=ARCHIVE
  for part in parts:p=p/part;assert not p.is_symlink()
  assert p.is_file() and p.stat().st_size==a['bytes'] and sha(p)==a['sha256']
verify();counts=collections.Counter();categories=collections.Counter();witnesses={};streams=[]
for profile in manifest['protocol']['profiles']:
 for seed in profile['seeds']['development']:
  path=ARCHIVE/f"words/{profile['id']}-{seed}.jsonl.gz";n=0
  with gzip.open(path,'rt',encoding='utf8') as source:
   for line in source:
    r=json.loads(line);assert (r['profile'],r['seed'],r['drawIndex'])==(profile['id'],seed,n);n+=1
    word=r['word'];base=word['trace']['baseSpelling'];assert base['version']==3
    units={u['id']:u for u in base['units']};phones={p['id']:p for p in base['phones']}
    counts['words']+=1;counts['units']+=len(units)
    for unit in units.values():assert len(unit['phoneIds'])==1
    for first,second in zip(base['phones'],base['phones'][1:]):
     pair=first['soundAtSpelling'],second['soundAtSpelling']
     if pair in [('k','s'),('g','z')]:counts['adjacent-root-phones:'+json.dumps(pair)]+=1
    hits=0
    for edit in base['edits']:
     if edit['rule'] not in RULES:continue
     hits+=1;counts['events']+=1;counts[edit['rule']]+=1
     origins=[c['origin']['kind'] for c in edit['input']]
     ids=[]
     for c in edit['input']:
      o=c['origin'];owners=o['sourceUnitIds'] if o['kind']=='rewrite' else [o['unitId']]
      for i in owners:
       if i not in ids:ids.append(i)
     assert all(i in units for i in ids)
     sounds=[phones[p]['soundAtSpelling'] for i in ids for p in units[i]['phoneIds']]
     full_initial=all(o=='selection' for o in origins) and all(set(units[i]['sourceCellIds'])=={c['id'] for c in edit['input'] if c['origin'].get('unitId')==i} for i in ids)
     same_syllable=len({phones[p]['syllableIndex'] for i in ids for p in units[i]['phoneIds']})==1
     category=[edit['rule'],edit['phase'],edit['before'],edit['after'],sounds,origins,full_initial,same_syllable]
     key=json.dumps(category,ensure_ascii=False,separators=(',',':'));categories[key]+=1
     if key not in witnesses:witnesses[key]={'coordinate':{k:r[k] for k in ['profile','seed','drawIndex']},'editId':edit['id'],'sourceUnitIds':ids,'word':word}
     counts['complete-initial-selection-events' if full_initial else 'partial-or-previously-edited-events']+=1
    counts['affectedWords']+=int(hits>0)
  assert n==manifest['protocol']['wordsPerReplicate'];streams.append({'profile':profile['id'],'seed':seed,'words':n});print(profile['id'],seed,n,flush=True)
verify();assert sha(Path(__file__))==script_sha
result={'version':'q13b-exploratory-control-inventory-v1','manifestSha256':MANIFEST_SHA,'scriptSha256':script_sha,'python':sys.version,'streams':streams,'counts':dict(counts),'categories':dict(sorted(categories.items())),'firstWitnesses':[{'category':json.loads(k),**witnesses[k]} for k in sorted(witnesses)],'limits':['Retained applied edits only; failed probability draws and unexecuted opportunities are unavailable.','Adjacent root phone-pair counts are descriptive denominators, not spelling-rule eligibility.','Complete-initial means exact selected source cell set consumed; other events are not automatically defective.','Source ancestry is not a licensed joint pronunciation, final morphology ownership, or human judgment.']}
with OUT.open('x') as f:json.dump(result,f,ensure_ascii=False);f.write('\n')
print(json.dumps(result['counts'],indent=2));print('categories',len(categories),'reportSha256',sha(OUT))
