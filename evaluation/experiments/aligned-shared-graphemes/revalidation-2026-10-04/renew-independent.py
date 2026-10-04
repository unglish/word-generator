import gzip,hashlib,json,runpy,sys
from pathlib import Path
b=Path(__file__).parent;arm=sys.argv[1];root=b/'committed';p=root/'evaluation/experiments/aligned-shared-graphemes';archive=b/'reproduced-candidate' if arm=='candidate' else Path('/private/tmp/q12c-closure-audit-v1/reproduced-candidate');runtime=root if arm=='candidate' else Path('/private/tmp/q12c-closure-audit-v1/committed')
module=runpy.run_path(str(p/'recount-aggregate.py'));report_bytes=gzip.decompress((p/(arm+'-measurement/report.json.gz')).read_bytes());report=json.loads(report_bytes);original=json.loads((p/(arm+'-measurement/independent.json')).read_bytes());assert hashlib.sha256(report_bytes).hexdigest()==original['reportSha256']
manifest=json.loads((archive/'manifest.json').read_bytes())['manifest'];source=json.loads(gzip.decompress((archive/'sources.json.gz').read_bytes()));protocol=json.loads((root/'evaluation/quality/protocol.json').read_bytes());registration=json.loads((p/'protocol.json').read_bytes());relations=json.loads((root/'evaluation/experiments/phoneme-aware-doubling/protocol.json').read_bytes())['ordinaryRelations']
def verify():
 assert hashlib.sha256((archive/'manifest.json').read_bytes()).hexdigest()==original['manifestSha256']
 for r in manifest['artifacts']:
  f=archive/r['file'];assert f.is_file() and not f.is_symlink() and f.stat().st_size==r['bytes'] and hashlib.sha256(f.read_bytes()).hexdigest()==r['sha256']
 for r in source['generator']:assert (runtime/r['path']).read_text()==r['content']
 assert manifest['protocol']==protocol and manifest['cohort']=='development'
verify();streams=[]
for profile in protocol['profiles']:
 for seed in profile['seeds']['development']:streams.append({'profile':profile['id'],'seed':seed,'words':10000,'file':f"words/{profile['id']}-{seed}.jsonl.gz"})
assert streams==report['streams'] and len(streams)==20
assert {r['file'] for r in streams}=={r['file'] for r in manifest['artifacts'] if r['file'].startswith('words/')}
def rows():
 for s in streams:
  count=0
  with gzip.open(archive/s['file'],'rt') as f:
   for line in f:
    d=json.loads(line);assert line.endswith('\n') and count<10000 and d['profile']==s['profile'] and type(d['seed']) is int and d['seed']==s['seed'] and type(d['drawIndex']) is int and d['drawIndex']==count
    yield d;count+=1
  assert count==10000
payload=dict(report)
for key in ['variant','authoritySha256','streams']:del payload[key]
payload['version']=1;counts=module['compare'](payload,rows(),registration['constructions'],relations);verify()
for k,v in counts.items():assert v==original[k],k
out={'passed':True,**counts,'arm':arm,'reportSha256':original['reportSha256'],'scope':'Original full independent compare algorithm on authenticated exact raw archive/runtime. Old absolute host/dependency authority not reexecuted. No independent reading-license/sampler-law or final morphology proof.'}
with (b/(arm+'-independent-renewed.json')).open('x') as f:json.dump(out,f,indent=2);f.write('\n')
print(json.dumps(out))
