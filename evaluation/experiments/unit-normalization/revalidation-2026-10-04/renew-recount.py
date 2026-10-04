import gzip,hashlib,importlib.util,json
from collections import Counter
from pathlib import Path
b=Path(__file__).parent;root=b/'committed';archive=Path('/private/tmp/q12c-closure-audit-v1/reproduced-control')
p=root/'evaluation/experiments/unit-normalization';script=p/'tools/q13c-independent-v3-recount-v1.py'
spec=importlib.util.spec_from_file_location('original',script);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
target=json.loads(gzip.decompress((p/'evidence/q13c-unit-normalization-independent-proof-v1.json.gz').read_bytes()))
manifest=json.loads((archive/'manifest.json').read_bytes())['manifest'];sources=json.loads(gzip.decompress((archive/'sources.json.gz').read_bytes()))
def verify():
 for r in manifest['artifacts']:
  f=archive/r['file'];assert f.is_file() and not f.is_symlink() and f.stat().st_size==r['bytes'] and hashlib.sha256(f.read_bytes()).hexdigest()==r['sha256']
 for r in sources['generator']:assert (root/r['path']).read_text()==r['content']
 assert hashlib.sha256((archive/'manifest.json').read_bytes()).hexdigest()==target['manifestSha256']
verify();result={'total':Counter(),'profiles':{},'streams':{},'strata':{}}
for profile in manifest['protocol']['profiles']:
 for seed in profile['seeds']['development']:
  counts=Counter();n=0
  for draw in m.read_stream(archive/f"words/{profile['id']}-{seed}.jsonl.gz",profile['id'],seed,10000):
   observed=m.observe(draw['word'],manifest['generator']['effectiveConfig']);counts.update(observed);result['total'].update(observed);result['profiles'].setdefault(profile['id'],Counter()).update(observed);result['strata'].setdefault(profile['id']+'/'+m.morphology(draw['word']),Counter()).update(observed);n+=1
  assert n==10000;result['streams'][f"{profile['id']}/{seed}"]=counts;print(len(result['streams']),flush=True)
for key in result:m.equal(m.dictify(result[key]),target[key])
replay={k:m.replay_summary(v) for k,v in {'total':result['total'],**result['profiles'],**result['streams'],**result['strata']}.items()}
assert replay==target['replay'];assert m.count_leaves(result)==target['integerLeavesCompared']==13835;verify()
out={'passed':True,'words':200000,'streams':20,'integerLeavesCompared':13835,'allOriginalCountsAndReplaySummariesEqual':True,'scriptSha256':hashlib.sha256(script.read_bytes()).hexdigest(),'scope':'Original independent observe/count/replay algorithm and exact archived data/runtime verification. Historical absolute tool/source-freeze authority is preserved separately and not reexecuted. No independent English reading or conditional-probability proof.'}
with (b/'independent-renewed.json').open('x') as f:json.dump(out,f,indent=2);f.write('\n')
print(json.dumps(out))
