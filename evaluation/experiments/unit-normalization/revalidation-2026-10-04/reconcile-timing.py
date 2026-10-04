import hashlib,json,re,statistics
from pathlib import Path
b=Path(__file__).parent;p=b/'committed/evaluation/experiments/unit-normalization/performance';report=json.loads((p/'report.json').read_bytes());assert report['completed'] and len(report['runs'])==12
pairs={};gates={v:{k:0 for k in ['floorGatePassed','varianceGatePassed']} for v in ['A','B']};last=None
for i,r in enumerate(report['runs']):
 pair=i//2+1;position=i%2+1;version=([['A','B'],['B','A']]*3)[pair-1][position-1];assert (r['pair'],r['position'],r['version'])==(pair,position,version)
 data=(p/r['log']).read_bytes();assert hashlib.sha256(data).hexdigest()==r['logSha256'];text=data.decode();m=re.findall(r'Performance: (\d+) words/sec \(10000 words in (\d+)ms\)',text);assert len(m)==1;speed,ms=map(int,m[0]);assert (speed,ms)==(r['reportedWordsPerSecond'],r['reportedBatchMilliseconds'])
 m=re.findall(r'Batch variance trials: ([0-9., x]+) \(median ([0-9.]+)x\)',text);assert len(m)==1;assert m[0][0]==r['reportedVarianceTrials'] and float(m[0][1])==r['reportedMedianVariance']
 assert 'Floor: 4500 words/sec' in text and 'Median variance threshold: < 3.0x' in text
 floor=bool(re.search(r'✓ .*should generate at least 4500 words/sec',text));variance=bool(re.search(r'✓ .*should not degrade significantly with sequential seeds',text));assert (floor,variance)==(r['floorGatePassed'],r['varianceGatePassed']);assert r['exitCode']==(0 if floor and variance else 1)
 assert r['endedAt']>r['startedAt'] and (last is None or r['startedAt']>=last);last=r['endedAt'];pairs.setdefault(pair,{})[version]=speed
 for k,v in [('floorGatePassed',floor),('varianceGatePassed',variance)]:gates[version][k]+=v
ratios=[v['B']/v['A'] for v in pairs.values()];assert ratios==[r['BoverA'] for r in report['pairs']];assert statistics.median(ratios)==report['medianPairedThroughputRatio'];assert [min(ratios),max(ratios)]==report['pairedRatioRange']
for v in gates:
 for k,count in gates[v].items():assert report['gates'][v][k]=={'passed':count,'failed':6-count,'unavailable':0,'notRun':0}
out={'passed':True,'all12OriginalLogsVerified':True,'medianPairedThroughputRatio':statistics.median(ratios),'gates':gates,'scope':'Original local timing raw-log/hash/gate/arithmetic reconciliation; no new timing, general speed or quality claim.'}
with (b/'timing-reconciliation.json').open('x') as f:json.dump(out,f,indent=2);f.write('\n')
print(json.dumps(out))
