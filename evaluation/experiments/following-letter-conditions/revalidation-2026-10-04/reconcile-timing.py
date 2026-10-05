import json,hashlib,statistics,gzip
from pathlib import Path
b=Path('/private/tmp/q14b-closure-audit-v1');p=b/'committed/evaluation/experiments/following-letter-conditions/evidence/performance';report=json.loads((p/'report.json').read_text());rates=[];gates={v:{'speedPass':0,'variancePass':0} for v in ['A','B']};receipts=[]
assert report['order']==list('ABBAABBAABBA')
for i,v in enumerate(report['order'],1):
 stem=f'{i:02}-{v}';f=p/f'{stem}.json.gz';r=json.loads(gzip.decompress(f.read_bytes()));assert r['variant']==v and r['sampleSize']==10000
 assert r['wordsPerSec']==10000000/r['elapsed'] and r['speedPass']==(r['wordsPerSec']>=r['floor'])
 for t in r['trials']:assert t['ratio']==max(t['batches'])/min(t['batches'])
 assert r['medianVariance']==sorted(t['ratio'] for t in r['trials'])[1] and r['variancePass']==(r['medianVariance']<r['varianceLimit'])
 log=p/f'{stem}.log.gz';printed=json.loads(gzip.decompress(log.read_bytes()).decode().splitlines()[-1]);assert printed=={k:r[k] for k in ['variant','wordsPerSec','speedPass','variancePass']}
 rates.append((v,r['wordsPerSec']))
 for key in gates[v]:gates[v][key]+=int(r[key])
 receipts.append({'file':log.name,'sha256':hashlib.sha256(log.read_bytes()).hexdigest()})
ratios=[]
for i in range(0,12,2):pair=dict(rates[i:i+2]);ratios.append((pair['B']/pair['A']-1)*100)
assert ratios==report['pairedPercentChanges'] and statistics.median(ratios)==report['medianPairedPercentChange'] and gates==report['gates']
(b/'timing-reconciliation.json').write_text(json.dumps({'passed':True,'runs':12,'pairs':6,'medianPairedPercentChange':statistics.median(ratios),'gates':gates,'rawLogReceipts':receipts,'scope':'Reconciles original timing/gate arithmetic and indexed raw logs; no new timing series.'},indent=2)+'\n')
print('All 12 original timing results and gates reconcile')
