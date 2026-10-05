import json,hashlib,gzip,statistics
from pathlib import Path
root=Path(__file__).resolve().parent;repo=root.parents[2];e=root/'evidence'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
index=json.loads((e/'index.json').read_text());listed=set()
for a in index['artifacts']:
 p=e/a['file'];assert p.resolve().is_relative_to(e.resolve()) and a['file'] not in listed;listed.add(a['file'])
 assert p.stat().st_size==a['bytes'] and sha(p)==a['sha256'],a['file']
assert listed=={str(p.relative_to(e)) for p in e.rglob('*') if p.is_file() and p.name!='index.json'}
source=json.loads((e/'source-pins.json').read_text())
for name,pin in source.items():assert (repo/name).stat().st_size==pin['bytes'] and sha(repo/name)==pin['sha256'],name
load=lambda name:json.loads(gzip.decompress((e/name).read_bytes()))
production=load('candidate-analysis/report.json.gz');seal=json.loads((e/'candidate-analysis/complete.json').read_text());independent=load('independent-recount.json.gz')
assert production['words']==seal['words']==independent['words']==200000 and seal['passed']
assert seal['manifestSha256']==sha(e/'reproduced-candidate/manifest.json')
assert independent['integerComparisons']==3800019
allcounts=next(g['counts'] for g in production['groups'] if g['dimensions']==['all'])
assert all(allcounts[k]==v for k,v in independent['counts'].items())
assert allcounts['finalRoot:unresolved']==277 and allcounts['finalRoot:unavailable']==8026 and allcounts['completion:infeasible']==239
assert json.loads((e/'independent-execution.json').read_text())['exitCode']==0
config=json.loads((e/'measured-configuration.json').read_text());registration=json.loads((root/'registration.json').read_text());assert config['completionWeights']==registration['intervention']['support']
trace=load('trace-audit/complete.json.gz');assert trace['exitCode']==0 and trace['sourcePinsBeforeAndAfterMatchRegisteredCapture']
assert trace['controlReport']['config']==trace['candidateReport']['config'] and trace['candidateReport']['config']['count']==50000
binding=json.loads((e/'performance-binding.json').read_text());report=json.loads((e/'performance/report.json').read_text());assert sha(e/'performance-one.mjs')==binding['runnerSha256']==report['runnerSha256']
records=[json.loads((e/'performance'/f'{i+1:02d}-{v}.json').read_text()) for i,v in enumerate(binding['order'])];assert len(records)==12
for v,r in zip(binding['order'],records):
 assert r['variant']==v and r['sampleSize']==10000 and len(r['trials'])==3 and all(len(t['batches'])==5 for t in r['trials'])
 assert r['environment']==records[0]['environment'] and r['executableSha256']==records[0]['executableSha256']
 assert r['speedPass']==(r['wordsPerSec']>=r['floor']) and r['variancePass']==(r['medianVariance']<r['varianceLimit'])
 same=[x for x in records if x['variant']==v];assert r['configuration']==same[0]['configuration']
 if v=='B':assert r['source']=={name.removeprefix('src/'):pin for name,pin in source.items()}
pairs=[]
for i in range(0,12,2):
 pair={r['variant']:r for r in records[i:i+2]};pairs.append((pair['B']['wordsPerSec']/pair['A']['wordsPerSec']-1)*100)
assert pairs==report['pairedPercentChanges'] and statistics.median(pairs)==report['medianPairedPercentChange']
assert report['gates']=={v:{g:sum(r[g] for r in records if r['variant']==v) for g in ['speedPass','variancePass']} for v in ['A','B']}
print(json.dumps({'packetArtifacts':len(listed),'sourceFiles':len(source),'words':200000,'integerComparisons':3800019,'unresolvedRootObligations':277,'infeasibleCompletionAttempts':239,'medianPairedPercentChange':report['medianPairedPercentChange'],'scope':'Packet/source and complete report arithmetic checks; raw corpus retention separate; original zero-unresolved target unmet.'}))
