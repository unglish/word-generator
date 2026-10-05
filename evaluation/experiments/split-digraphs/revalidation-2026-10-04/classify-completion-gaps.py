import gzip,json,hashlib
from pathlib import Path
from collections import Counter
b=Path('/private/tmp/q14a-closure-audit-v1');root=b/'reproduced-candidate'
counts=Counter();examples={};pins=[];words=0
for p in sorted(root.rglob('*.jsonl.gz')):
 pins.append({'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 with gzip.open(p,'rt') as f:
  for line in f:
   row=json.loads(line);words+=1;word=row['word'];base=word['trace']['baseSpelling']
   for entry in base['completion']['attempts']:
    a=entry['attempt']
    if a['status']!='evaluated' or a['sample']['status']!='infeasible':continue
    phone=base['phones'][a['nucleusId']]['soundAtSpelling']
    proposals=a['proposals'];reasons=tuple(sorted(set(p.get('refusal','missing-refusal') for p in proposals)))
    category='support-only' if all(p.get('refusal') in ('unknown-reading','unsupported-reading','unresolved-vowel-obligation') for p in proposals) else 'projection-refusal'
    key=json.dumps({'sound':phone,'category':category,'refusals':reasons},sort_keys=True)
    counts[key]+=1
    examples.setdefault(key,{'profile':row['profile'],'seed':row['seed'],'drawIndex':row['drawIndex'],'written':word['written'],'attempt':a})
 print(p.name,words,flush=True)
assert words==200000
assert sum(counts.values())==2855
report={'words':words,'infeasibleAttempts':sum(counts.values()),'inputPins':pins,'groups':[{'classification':json.loads(k),'count':v,'firstTraceWitness':examples[k]} for k,v in sorted(counts.items())],'scope':'Full original candidate trace attempts; cause accounting, not proof of improved output or independently validated reading licenses.'}
(b/'completion-gap-population.json').write_text(json.dumps(report,indent=2)+'\n')
print('Full 200,000-word completion cause accounting complete',flush=True)
