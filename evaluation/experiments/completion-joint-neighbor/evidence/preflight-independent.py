import gzip,hashlib,json,sys
from pathlib import Path
sys.path.insert(0,'/private/tmp/q14a-completion-joint-neighbor-v2/evaluation/experiments/split-digraphs')
from recount_completion import recount_completion
base=Path('/private/tmp/q14a-completion-joint-neighbor-evidence-v2')
p=base/'candidate-archive/words/lexicon-bare-772709128.jsonl.gz'
before=hashlib.sha256(p.read_bytes()).hexdigest();totals={};words=0;joint=0
with gzip.open(p,'rt') as stream:
 for index,line in enumerate(stream):
  row=json.loads(line);assert row['seed']==772709128 and row['drawIndex']==index
  trace=row['word']['trace']['baseSpelling']
  for key,n in recount_completion(trace).items():totals[key]=totals.get(key,0)+n
  joint+=sum(bool(c.get('neighborReplacements')) for c in trace['completion']['certificates'])
  words+=1
assert words==10000 and joint>0
assert hashlib.sha256(p.read_bytes()).hexdigest()==before
(base/'preflight-independent.json').write_text(json.dumps({'passed':True,'words':words,'joint':joint,'totals':totals,'archiveSha256':before,'scope':'Independent completion arithmetic and certificate binding for one complete10000-word stream; no eligibility authentication or full corpus acceptance'},indent=2)+'\n')
print(json.dumps({'passed':True,'words':words,'joint':joint,'totals':totals}),flush=True)
