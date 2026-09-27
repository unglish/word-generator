import gzip,json,hashlib
from pathlib import Path
from collections import Counter
archive=Path('/private/tmp/q14a-split-vowels-candidate-v2')
manifest_bytes=(archive/'manifest.json').read_bytes()
assert hashlib.sha256(manifest_bytes).hexdigest()=='7593ad8e8e77e7428c3d07c00f6166fe09ff06c8533741eb1e1d6f1259e3735c'
manifest=json.loads(manifest_bytes)['manifest']
out=Path('/private/tmp/q14a-owngs-attribution-v1');out.mkdir()
counts=Counter();records=[]
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
with gzip.open(out/'witnesses.jsonl.gz','wt') as witnesses:
 for a in manifest['artifacts']:
  if not a['file'].startswith('words/'):continue
  p=archive/a['file'];assert digest(p)==a['sha256']
  with gzip.open(p,'rt') as f:
   for line in f:
    counts['rowsScanned']+=1
    if 'owngs' not in line:continue
    row=json.loads(line);w=row['word'];surface=w['written']['clean']
    if 'owngs' not in surface:continue
    counts['matchingWords']+=1;witnesses.write(line)
    b=w['trace']['baseSpelling'];root=b['surface'];cells=b['cells'];assert ''.join(c['text'] for c in cells)==root
    bound=[]
    for i in range(len(root)-3):
     if root[i:i+4]!='owng':continue
     pair=cells[i:i+2];origin=pair[0]['origin']
     if origin['kind']!='completion' or pair[1]['origin'].get('certificateId')!=origin['certificateId']:continue
     cert=b['completion']['certificates'][origin['certificateId']]
     if cert['after']!='ow' or cert['outputCellIds']!=[c['id'] for c in pair]:continue
     bound.append({'rootOffset':i,'certificateId':cert['id'],'before':cert['before'],'after':cert['after'],'cellIds':[c['id'] for c in pair]})
    if bound:counts['wordsWithRootOwngBoundToCompletion']+=1
    records.append({'profile':row['profile'],'seed':row['seed'],'drawIndex':row['drawIndex'],'surface':surface,'rootSurface':root,'boundRootOccurrences':bound})
  assert digest(p)==a['sha256'];print(a['file'],dict(counts),flush=True)
assert (archive/'manifest.json').read_bytes()==manifest_bytes
assert counts['rowsScanned']==200000
(out/'report.json').write_text(json.dumps({'scope':'Root-cell attribution only. Final-word ownership is not certified; complete matching witnesses retained.','counts':dict(counts),'records':records},indent=2)+'\n')
(out/'complete.json').write_text(json.dumps({'manifestSha256':hashlib.sha256(manifest_bytes).hexdigest(),'scriptSha256':digest(Path(__file__)),'artifacts':[{'file':name,'sha256':digest(out/name)} for name in ['report.json','witnesses.jsonl.gz']]},indent=2)+'\n')
