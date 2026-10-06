import gzip,hashlib,json,sys
from collections import Counter
from pathlib import Path
sys.path.insert(0,'/private/tmp/q14a-completion-joint-neighbor-v2/evaluation/experiments/split-digraphs')
from recount_root import recount_root
from recount_completion import recount_completion
b=Path('/private/tmp/q14a-completion-joint-neighbor-evidence-v2');archive=b/'candidate-archive'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest_digest=sha(archive/'manifest.json');manifest=json.loads((archive/'manifest.json').read_text())['manifest']
config=json.loads((b/'capture-before.json').read_text())['configuration'];totals=Counter();completion=Counter();words=0;witnesses=[];streams=[]
for artifact in manifest['artifacts']:
 if not artifact['file'].startswith('words/'):continue
 p=archive/artifact['file'];assert p.stat().st_size==artifact['bytes'] and sha(p)==artifact['sha256'];count=0
 with gzip.open(p,'rt') as stream:
  for line in stream:
   row=json.loads(line);assert row['drawIndex']==count;count+=1;words+=1
   trace=row['word']['trace']['baseSpelling'];counts=recount_root(trace,config);totals.update(counts);completion.update(recount_completion(trace))
   if counts.get('finalRoot:unresolved',0):witnesses.append(row)
 assert count==10000 and sha(p)==artifact['sha256']
 streams.append({'file':artifact['file'],'words':count,'sha256':artifact['sha256']});print('Scanned',artifact['file'],words,flush=True)
assert words==200000 and sha(archive/'manifest.json')==manifest_digest
result={'words':words,'counts':dict(totals),'completion':dict(completion),'streams':streams,'allUnresolvedWordWitnesses':witnesses,'manifestSha256':manifest_digest,'scope':'Complete raw integer obligation and completion accounting; producer semantic replay still pending. Certificate reading eligibility is not independently proved by this scan. Registered replay/recount and exact final-population join remain required.'}
(b/'raw-final-root-scan.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'words':words,'unresolved':totals['finalRoot:unresolved'],'affectedWords':len(witnesses)}),flush=True)
