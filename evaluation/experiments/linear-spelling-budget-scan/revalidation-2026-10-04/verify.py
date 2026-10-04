import argparse,gzip,hashlib,json
from pathlib import Path
if not __debug__:raise RuntimeError('Assertions required')
a=argparse.ArgumentParser();a.add_argument('--repository-root',type=Path,required=True);root=a.parse_args().repository_root
p=Path(__file__).parent;e=root/'evaluation/experiments/linear-spelling-budget-scan'
for r in json.loads((p/'index.json').read_bytes())['records']:
 f=Path(r['path']);assert not f.is_absolute() and '..' not in f.parts
 d=(p/f).read_bytes();assert len(d)==r['bytes'] and hashlib.sha256(d).hexdigest()==r['sha256']
def old(name):return json.loads(gzip.decompress((e/name).read_bytes()))
inputs=(p/'parity-renewed.json.inputs.json').read_bytes();new=json.loads(inputs);original=old('exact-parity-inputs.json.gz')
for key in ['createdAt','original','candidate','archive']:new[key]=original[key]
assert new==original
new=json.loads((p/'parity-renewed.json').read_bytes());original=old('exact-parity.json.gz');assert new['inputsSha256']==hashlib.sha256(inputs).hexdigest()
assert new['apiCalls']==800000 and new['comparedDraws']==200000 and new['verifiedCertificates']==1517 and len(new['streams'])==20
for key in ['createdAt','original','candidate','archive','inputsSha256']:new[key]=original[key]
assert new==original
new=json.loads((p/'omitted-policy-parity-renewed.json').read_bytes());original=old('omitted-policy-parity.json.gz');assert new['apiCalls']==84800
for key in ['createdAt','original','candidate']:new[key]=original[key]
assert new==original
new=json.loads((p/'performance-arithmetic-renewed.json').read_bytes());original=json.loads((e/'independent-performance-check.json').read_bytes());assert new['scriptSha256']==hashlib.sha256((p/'renew-performance-check.py').read_bytes()).hexdigest();new['scriptSha256']=original['scriptSha256'];assert new==original
print('Verified full original correspondence: 800000 core calls, 84800 supplementary calls and all twelve original timing logs/arithmetic.')
