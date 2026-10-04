import argparse,gzip,hashlib,json
from pathlib import Path
if not __debug__:raise RuntimeError('Assertions required')
a=argparse.ArgumentParser();a.add_argument('--repository-root',type=Path,required=True);root=a.parse_args().repository_root
p=Path(__file__).parent;e=root/'evaluation/experiments/spelling-coverage'
for r in json.loads((p/'index.json').read_bytes())['records']:
 f=Path(r['path']);assert not f.is_absolute() and '..' not in f.parts
 d=(p/f).read_bytes();assert len(d)==r['bytes'] and hashlib.sha256(d).hexdigest()==r['sha256']
for arm in ['candidate','control']:
 manifest=json.loads(gzip.decompress((e/(arm+'-manifest.json.gz')).read_bytes()))['manifest']
 expected={r['file']:r for r in manifest['artifacts']}
 c=json.loads((p/(arm+'-complete.json')).read_bytes());assert c['passed'] and c['words']==200000 and c['allOriginalCompressedHashesMatch'] and len(c['streams'])==20
 assert {r['file'] for r in c['streams']}=={k for k in expected if k.startswith('words/')}
 for r in c['streams']:assert r['matchesOriginalCompressedBytes'] and all(r[k]==expected[r['file']][k] for k in ['bytes','sha256'])
 receipt=json.loads((p/(arm+'-ancillary-recovery.json')).read_bytes());assert receipt['passed'] and receipt['words']==200000 and len(receipt['receipts'])==3
 assert {r['file'] for r in receipt['receipts']}=={'review-samples.json.gz','witnesses.json.gz','distributions.json.gz'}
 for r in receipt['receipts']:assert all(r[k]==expected[r['file']][k] for k in ['bytes','sha256'])
 old=json.loads(gzip.decompress((e/('independent-recount-'+arm+'-v2.json.gz')).read_bytes()));new=json.loads((p/(arm+'-independent-renewed.json')).read_bytes());assert old==new and new['total']['words']==200000
old=json.loads(gzip.decompress((e/'coverage-v2.json.gz').read_bytes()));new=json.loads(gzip.decompress((p/'coverage-renewed.json.gz').read_bytes()))
for arm in ['baseline','candidate']:
 for field in ['directory','runtime']:new[arm][field]=old[arm][field]
assert old==new
source=json.loads(gzip.decompress((e/'candidate-sources.json.gz').read_bytes()));assert len(source['generator'])==52
for r in source['generator']:assert (root/r['path']).read_text()==r['content']
print('Verified compact integrity, 52 runtime files, 40 original shard receipts, six ancillary receipts and full original report correspondence.')
