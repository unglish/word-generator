import gzip,hashlib,json
from pathlib import Path
base=Path('/private/tmp/q14a-completion-joint-neighbor-evidence-v2')
records=[]
for seed in [69212153,101601885,3921817393,3948943232]:
 p=base/f'candidate-archive/words/lexicon-default-{seed}.jsonl.gz'
 before=hashlib.sha256(p.read_bytes()).hexdigest();count=0
 with gzip.open(p,'rt') as stream:
  for index,line in enumerate(stream):
   row=json.loads(line)
   assert row['profile']=='lexicon-default' and row['seed']==seed and row['drawIndex']==index
   assert isinstance(row['word']['written']['clean'],str)
   count+=1
 assert count==10000
 assert hashlib.sha256(p.read_bytes()).hexdigest()==before
 records.append({'file':str(p.relative_to(base)),'words':count,'sha256':before,'bytes':p.stat().st_size})
 print('Validated completed stream',seed,count,flush=True)
(base/'completed-stream-integrity-40000.json').write_text(json.dumps({'passed':True,'words':40000,'streams':records,'scope':'Complete gzip decoding and original coordinate sequence for four finished streams; not semantic replay, quality acceptance, or full200000-word integrity'},indent=2)+'\n')
