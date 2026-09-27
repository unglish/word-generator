import gzip,json,hashlib
from pathlib import Path
from collections import Counter
root=Path('/private/tmp/q14a-split-vowels-candidate-v2')
out=Path('/private/tmp/q14a-owngs-corpus-v1');out.mkdir()
manifest_bytes=(root/'manifest.json').read_bytes()
assert hashlib.sha256(manifest_bytes).hexdigest()=='7593ad8e8e77e7428c3d07c00f6166fe09ff06c8533741eb1e1d6f1259e3735c'
manifest=json.loads(manifest_bytes); totals=Counter();profiles={};matches=[]
for a in manifest['artifacts']:
 if not a['file'].startswith('words/'):continue
 p=root/a['file']
 def digest():
  h=hashlib.sha256()
  with p.open('rb') as f:
   for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
  return h.hexdigest()
 assert digest()==a['sha256']
 with gzip.open(p,'rt') as f:
  for line in f:
   row=json.loads(line);w=row['word'];profile=profiles.setdefault(row['profile'],Counter());totals['words']+=1;profile['words']+=1
   if 'owngs' not in w['written']['clean']:continue
   b=w['trace']['baseSpelling'];cs=[c for c in b['completion']['certificates'] if c['after']=='ow']; key='owngs_with_ow_completion' if cs else 'owngs_without_ow_completion'
   totals['owngs']+=1;profile['owngs']+=1;totals[key]+=1;profile[key]+=1
   matches.append({'profile':row['profile'],'seed':row['seed'],'drawIndex':row['drawIndex'],'written':w['written'],'owCompletionCertificateIds':[c['id'] for c in cs],'rootSurface':b['surface']})
 assert digest()==a['sha256']
 print(a['file'],dict(totals),flush=True)
assert (root/'manifest.json').read_bytes()==manifest_bytes
assert totals['words']==200000
report={'scope':'Post-capture exploratory count. Co-occurrence of ow completion and owngs is not proof that every matching substring was created by that edit. Complete archive trace remains authority; not a replacement for structural replay.','manifestSha256':hashlib.sha256(manifest_bytes).hexdigest(),'counts':dict(totals),'profiles':{k:dict(v) for k,v in profiles.items()},'matches':matches}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
