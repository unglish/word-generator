import gzip,hashlib,importlib.util,json,sys
from pathlib import Path
b=Path(__file__).parent
arm=sys.argv[1]
root=b/('committed' if arm=='candidate' else 'control-committed')
archive=b/('reproduced-'+arm)
module=b/'committed/evaluation/experiments/phoneme-aware-doubling/recount-doubling.py'
spec=importlib.util.spec_from_file_location('original_recount',module);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
manifest=json.loads((archive/'manifest.json').read_bytes())['manifest']
source=json.loads(gzip.decompress((archive/'sources.json.gz').read_bytes()))
def verify():
 for r in source['generator']:assert (root/r['path']).read_text()==r['content']
 for r in manifest['artifacts']:
  f=archive/r['file'];assert f.is_file() and not f.is_symlink() and f.stat().st_size==r['bytes'] and m.sha(f)==r['sha256']
verify()
report=json.loads((b/(arm+'-original-report.json')).read_bytes())
registration=json.loads((b/'committed/evaluation/experiments/phoneme-aware-doubling/protocol.json').read_bytes())
expected=[]
for p in manifest['protocol']['profiles']:
 for seed in p['seeds']['development']:expected.append({'profile':p['id'],'seed':seed,'words':10000,'file':f"words/{p['id']}-{seed}.jsonl.gz"})
assert report['streams']==expected and len(expected)==20
assert {r['file'] for r in expected}=={r['file'] for r in manifest['artifacts'] if r['file'].startswith('words/')}
def rows():
 for stream in expected:
  count=0
  with gzip.open(archive/stream['file'],'rt') as f:
   for line in f:
    row=json.loads(line);assert line.endswith('\n') and count<10000 and row['profile']==stream['profile'] and row['seed']==stream['seed'] and type(row['drawIndex']) is int and row['drawIndex']==count
    yield row;count+=1
  assert count==10000
result=m.compare_report(report,rows(),{tuple(r) for r in registration['ordinaryRelations']})
verify()
out={'passed':True,**result,'arm':arm,'observerSha256':m.sha(module),'reportSha256':m.sha(b/(arm+'-original-report.json')),'scope':'Fresh exact original Python integer/event/stratum/witness algorithm on fully authenticated recovered archives. Original absolute authority paths are not reused; frozen runtime bytes checked independently before and after. No historical dependency/executable certification or fresh JS observer replay.'}
with (b/(arm+'-independent-renewed.json')).open('x') as f:json.dump(out,f,indent=2);f.write('\n')
print(json.dumps(out))
