import json,hashlib,statistics,gzip
from pathlib import Path
root=Path(__file__).resolve().parent
repo=root.parents[2]
e=root/'evidence'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
index=json.loads((e/'index.json').read_text())
listed=set()
for a in index['artifacts']:
 p=e/a['file']
 assert p.resolve().is_relative_to(e.resolve()) and a['file'] not in listed
 listed.add(a['file'])
 assert p.stat().st_size==a['bytes'] and sha(p)==a['sha256'],a['file']
assert listed=={str(p.relative_to(e)) for p in e.rglob('*') if p.is_file() and p.name!='index.json'}
source=json.loads((e/'source-pins.json').read_text())
for name,pin in source.items():
 p=repo/name
 assert p.stat().st_size==pin['bytes'] and sha(p)==pin['sha256'],name
capture=json.loads((e/'reproduced-candidate/complete.json').read_text())
assert capture['passed'] and capture['words']==200000 and len(capture['streams'])==20 and capture['allOriginalCompressedHashesMatch']
assert all(s['matchesOriginalCompressedBytes'] for s in capture['streams'])
a=(e/'trace-audit/control-report.json').read_bytes();b=(e/'trace-audit/candidate-report.json').read_bytes()
assert a==b
trace=json.loads(a);assert trace['config']['count']==50000 and trace['config']['seed']==42 and len(trace['config']['metrics'])==5
quality=json.loads((e/'quality-correspondence.json').read_text());assert quality['tests']=={'passed':10,'failed':2} and quality['originalFullQualityReportByteIdentical']
default=json.loads((e/'default-assertion-correspondence.json').read_text());assert default['fullSuite']=={'passed':1022,'failed':4,'skipped':1,'timeouts':0}
assert hashlib.sha256(gzip.decompress((e/'default-tests.log.gz').read_bytes())).hexdigest()==default['candidateLogSha256']
binding=json.loads((e/'performance-binding.json').read_text());report=json.loads((e/'performance/report.json').read_text())
assert sha(e/'performance-one.mjs')==binding['runnerSha256']==report['runnerSha256']
records=[json.loads((e/'performance'/f'{i+1:02d}-{v}.json').read_text()) for i,v in enumerate(binding['order'])]
assert len(records)==12
for v,r in zip(binding['order'],records):
 assert r['variant']==v and r['sampleSize']==10000 and len(r['trials'])==3 and all(len(t['batches'])==5 for t in r['trials'])
 assert r['environment']==records[0]['environment'] and r['configuration']==records[0]['configuration'] and r['executableSha256']==records[0]['executableSha256']
 assert r['speedPass']==(r['wordsPerSec']>=r['floor']) and r['variancePass']==(r['medianVariance']<r['varianceLimit'])
 if v=='B':assert r['source']=={name.removeprefix('src/'):pin for name,pin in source.items()}
pairs=[]
for i in range(0,12,2):
 pair={r['variant']:r for r in records[i:i+2]};pairs.append((pair['B']['wordsPerSec']/pair['A']['wordsPerSec']-1)*100)
assert pairs==report['pairedPercentChanges'] and statistics.median(pairs)==report['medianPairedPercentChange']
assert report['gates']=={v:{g:sum(r[g] for r in records if r['variant']==v) for g in ['speedPass','variancePass']} for v in ['A','B']}
print(json.dumps({'packetArtifacts':len(listed),'sourceFiles':len(source),'capturedWords':200000,'pairedTimingSlots':12,'medianPairedPercentChange':report['medianPairedPercentChange'],'failedGatesPreserved':True,'scope':'Packet/source and full report arithmetic checks; raw corpus retention is separate.'}))
