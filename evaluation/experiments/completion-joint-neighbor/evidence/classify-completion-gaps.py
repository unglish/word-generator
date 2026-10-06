import gzip,json,hashlib
from pathlib import Path
from collections import Counter
b=Path('/private/tmp/q14a-completion-joint-neighbor-evidence-v2');root=b/'candidate-archive'
counts=Counter();examples={};pins=[];words=0
for p in sorted(root.rglob('*.jsonl.gz')):
 pins.append({'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 expected_draw=0
 with gzip.open(p,'rt') as f:
  for line in f:
   row=json.loads(line)
   assert row['drawIndex']==expected_draw and p.name==f"{row['profile']}-{row['seed']}.jsonl.gz"
   expected_draw+=1;words+=1;word=row['word'];base=word['trace']['baseSpelling']
   for entry in base['completion']['attempts']:
    a=entry['attempt']
    if a['status']!='evaluated' or a['sample']['status']!='infeasible':continue
    phone=base['phones'][a['nucleusId']]['soundAtSpelling']
    proposals=a['proposals'];reasons=tuple(sorted(set(p.get('refusal','missing-refusal') for p in proposals)))
    category='support-only' if all(p.get('refusal') in ('unknown-reading','unsupported-reading','unresolved-vowel-obligation') for p in proposals) else 'projection-refusal'
    key=json.dumps({'sound':phone,'category':category,'refusals':reasons},sort_keys=True)
    counts[key]+=1
    examples.setdefault(key,{'profile':row['profile'],'seed':row['seed'],'drawIndex':row['drawIndex'],'written':word['written'],'attempt':a})
 assert expected_draw==10000
 assert hashlib.sha256(p.read_bytes()).hexdigest()==pins[-1]['sha256']
 print(p.name,words,flush=True)
assert words==200000
receipt=json.loads((b/'capture-complete.json').read_text());assert receipt['passed'] and receipt['words']==200000
manifest_bytes=(root/'manifest.json').read_bytes();assert hashlib.sha256(manifest_bytes).hexdigest()==receipt['manifestSha256']
manifest=json.loads(manifest_bytes)['manifest']
expected={r['file']:r['sha256'] for r in manifest['artifacts'] if r['file'].startswith('words/')}
assert len(expected)==20 and {r['path']:r['sha256'] for r in pins}==expected
report={'words':words,'infeasibleAttempts':sum(counts.values()),'inputPins':pins,'groups':[{'classification':json.loads(k),'count':v,'firstTraceWitness':examples[k]} for k,v in sorted(counts.items())],'scope':'Full corrected candidate trace attempts; cause accounting, not independently validated reading licenses or human-quality evidence.'}
(b/'completion-gap-population.json').write_text(json.dumps(report,indent=2)+'\n')
print('Full corrected 200,000-word completion cause accounting complete',flush=True)
