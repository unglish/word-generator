"""Verify compact correspondence; full raw replay remains a separate workload."""
import argparse,gzip,hashlib,json
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--repository-root',type=Path,required=True);args=parser.parse_args()
p=args.repository_root/'evaluation/experiments/split-digraphs/revalidation-2026-10-04'
old=p.parent/'evidence'
def read(path):
 data=path.read_bytes()
 return json.loads(gzip.decompress(data) if path.suffix=='.gz' else data)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
records=read(p/'index.json')['records']
assert len({r['path'] for r in records})==len(records)
for r in records:
 path=Path(r['path']);assert not path.is_absolute() and len(path.parts)==1
 f=p/path;assert f.stat().st_size==r['bytes'] and sha(f)==r['sha256']
assert {f.name for f in p.iterdir()}=={r['path'] for r in records}|{'index.json'}
for arm,folder,comparisons in [('control','control',2200011),('candidate','candidate-analysis',3800019)]:
 original=read(old/folder/'report.json');renewed=read(p/f'{arm}-production-report.json.gz')
 assert isinstance(renewed['archive'],str);renewed['archive']=original['archive'];assert renewed==original
 seal=read(p/f'{arm}-production-complete.json.gz');originalseal=read(old/folder/'complete.json')
 assert seal['passed'] and seal['words']==originalseal['words']==200000
 assert seal['manifestSha256']==originalseal['manifestSha256']
 observations=lambda s:[r for r in s['artifacts'] if r['file'].startswith('observations/') or r['file']=='witnesses.json.gz']
 assert observations(seal)==observations(originalseal)
 assert len([r for r in observations(seal) if r['file'].startswith('observations/')])==20
 independent=read(p/f'{arm}-independent-renewed.json');originalindependent=read(old/folder/'independent.json')
 assert independent['words']==200000 and independent['integerComparisons']==comparisons
 if arm=='control':
  decoded=gzip.decompress((p/f'{arm}-production-complete.json.gz').read_bytes())
  assert independent['analysisSealSha256']==hashlib.sha256(decoded).hexdigest()
  independent['analysisSealSha256']=originalindependent['analysisSealSha256']
 assert independent==originalindependent
 for kind in ['production','independent']:assert read(p/f'{arm}-{kind}-correspondence.json')['passed']
assert read(p/'legacy-parity-correspondence.json')['passed']
print('Compact package integrity and complete original production/independent report correspondence verified; no human or acceptance-gate claim.')
