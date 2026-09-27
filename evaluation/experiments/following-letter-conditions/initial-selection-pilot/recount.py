import sys,gzip,json,hashlib
from pathlib import Path
sys.path.insert(0,'/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/evaluation/experiments/following-letter-conditions')
from recount_following import compare
archive=Path('/private/tmp/q14b-initial-pilot-v1.jsonl.gz');summary=Path('/private/tmp/q14b-initial-pilot-v1.json')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=[sha(archive),sha(summary)]
source=json.loads(summary.read_text());counts={};events=integers=words=0
with gzip.open(archive,'rt') as rows:
 for row in rows:
  item=json.loads(row);assert item['seed']==words+1
  e,c=compare(item['word'],source['configuration'],item['observation']);events+=e;integers+=c;words+=1
  for key,value in item['observation']['counts'].items():counts[key]=counts.get(key,0)+value
assert words==2000 and counts==source['counts'] and before==[sha(archive),sha(summary)]
result={'passed':True,'words':words,'events':events,'integerComparisons':integers,'archiveSha256':before[0],'summarySha256':before[1],'scope':'Exploratory pilot: independent events/counts except producer refusal text; selection-law replay remains production-assisted; no formal candidate claim'}
Path('/private/tmp/q14b-initial-pilot-independent-v1.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
