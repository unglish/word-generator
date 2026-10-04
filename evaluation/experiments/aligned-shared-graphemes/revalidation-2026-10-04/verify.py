import argparse,gzip,hashlib,json
from pathlib import Path
if not __debug__:raise RuntimeError('Assertions required')
a=argparse.ArgumentParser();a.add_argument('--repository-root',type=Path,required=True);root=a.parse_args().repository_root
p=Path(__file__).parent;e=root/'evaluation/experiments/aligned-shared-graphemes'
sha=lambda d:hashlib.sha256(d).hexdigest()
for r in json.loads((p/'index.json').read_bytes())['records']:
 f=Path(r['path']);assert not f.is_absolute() and '..' not in f.parts
 d=(p/f).read_bytes();assert len(d)==r['bytes'] and sha(d)==r['sha256']
load=lambda f:json.loads(gzip.decompress(f.read_bytes()) if f.suffix=='.gz' else f.read_bytes())
for arm in ['control','candidate']:
 new=load(p/f'{arm}-production-renewed-report.json.gz');old=load(e/f'{arm}-measurement/report.json.gz')
 assert new['authoritySha256']==sha(gzip.decompress((p/f'{arm}-production-renewed-authority.json.gz').read_bytes()))
 for x in [new,old]:x.pop('authoritySha256')
 assert new==old and new['words']==200000
 r=load(p/f'{arm}-independent-renewed.json');assert r['passed'] and r['words']==200000
 assert r['reportSha256']==sha(gzip.decompress((e/f'{arm}-measurement/report.json.gz').read_bytes()))
 assert r['integerComparisons']==(213715 if arm=='control' else 420491)
 assert r['fullWitnesses']==(0 if arm=='control' else 181)
c=load(p/'candidate-complete.json');assert c['passed'] and c['words']==200000 and len(c['streams'])==20
m=load(e/'candidate-measurement/archive-manifest.json')['manifest'];pins={r['file']:r for r in m['artifacts']}
for r in c['streams']:assert r['matchesOriginalCompressedBytes'] and r['sha256']==pins[r['file']]['sha256'] and r['bytes']==pins[r['file']]['bytes']
a=load(e/'candidate-measurement/archive-sources.json.gz');files=a['generator'];assert len(files)==72
for v in files:assert (root/v['path']).read_text()==v['content']
new=load(p/'legacy-parity-renewed.json');old=load(e/'active-candidate-stage/q13b-legacy-parity-v2.json')
assert new['authoritySha256']==sha((p/'legacy-parity-authority-renewed.json').read_bytes())
for x in [new,old]:x.pop('authoritySha256')
assert new==old and new['generationCalls']==83072 and new['coordinates']==20768 and new['nextValueProbes']==128
assert load(p/'performance-arithmetic-renewed.json')==load(e/'performance/q13b-performance-arithmetic-v1.json')
assert 'Tests  234 passed' in (p/'construction-fixtures.log.txt').read_text()
assert 'pass 51' in (p/'measurement-fixtures-renewed.log.txt').read_text()
print('Verified complete original report/parity/timing correspondence, 400000-word scoped recount receipts, candidate shard receipts and frozen runtime.')
