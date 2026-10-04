import argparse,gzip,hashlib,json
from pathlib import Path
if not __debug__:raise RuntimeError('Assertions required')
a=argparse.ArgumentParser();a.add_argument('--repository-root',type=Path,required=True);root=a.parse_args().repository_root
p=Path(__file__).parent
for r in json.loads((p/'index.json').read_bytes())['records']:
 f=Path(r['path']);assert not f.is_absolute() and '..' not in f.parts
 d=(p/f).read_bytes();assert len(d)==r['bytes'] and hashlib.sha256(d).hexdigest()==r['sha256']
e=root/'evaluation/experiments/phoneme-aware-doubling'
for arm in ['candidate','control']:
 packet=e/'candidate-measurement' if arm=='candidate' else root/'evaluation/experiments/unit-normalization/candidate'
 mf='capture-manifest.json.gz' if arm=='candidate' else 'manifest.json.gz'
 manifest=json.loads(gzip.decompress((packet/mf).read_bytes()))['manifest']
 expected={r['file']:r for r in manifest['artifacts'] if r['file'].startswith('words/')}
 c=json.loads((p/(arm+'-complete.json')).read_bytes());assert c['passed'] and c['words']==200000 and c['allOriginalCompressedHashesMatch']
 assert len(c['streams'])==len(expected)==20 and {r['file'] for r in c['streams']}==set(expected)
 for r in c['streams']:assert r['matchesOriginalCompressedBytes'] and all(r[k]==expected[r['file']][k] for k in ['bytes','sha256'])
 new=json.loads((p/(arm+'-independent-renewed.json')).read_bytes());old=json.loads((e/(arm+'-measurement')/('q12c-'+arm+'-independent-v1.json')).read_bytes())
 assert new['passed'] and new['observerSha256']==hashlib.sha256((e/'recount-doubling.py').read_bytes()).hexdigest()
 for k in ['words','groups','integerComparisons','fullWitnesses','reportSha256']:assert new[k]==old[k]
source=json.loads(gzip.decompress((e/'candidate-measurement/capture-sources.json.gz').read_bytes()))
assert len(source['generator'])==57
for r in source['generator']:assert (root/r['path']).read_text()==r['content']
print('Verified compact package, 57 runtime files, 40 original shard receipts and 400000-word recount correspondence.')
