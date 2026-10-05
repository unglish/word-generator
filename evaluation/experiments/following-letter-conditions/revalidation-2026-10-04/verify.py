import argparse,json,hashlib,gzip
from pathlib import Path
if not __debug__:raise RuntimeError('Assertions required')
a=argparse.ArgumentParser();a.add_argument('--repository-root',type=Path,required=True);root=a.parse_args().repository_root;p=Path(__file__).parent;e=root/'evaluation/experiments/following-letter-conditions/evidence'
for r in json.loads((p/'index.json').read_text())['records']:
 f=Path(r['path']);assert not f.is_absolute() and '..' not in f.parts;d=(p/f).read_bytes();assert len(d)==r['bytes'] and hashlib.sha256(d).hexdigest()==r['sha256']
load=lambda f:json.loads(f.read_text())
n=load(p/'independent-renewed.json');assert n==load(e/'independent-recount.json') and n['passed'] and n['words']==200000 and n['integerComparisons']==41278786 and n['events']==2018528 and n['groups']==791
assert load(p/'omitted-parity-renewed.json')==load(e/'checks/q14b-omitted-parity-final.json')
r=load(p/'q14b-raw-authentication-v1.json');assert r['passed'] and len(r['archives'])==2 and all(x['artifacts']==25 and x['wordShards']==20 for x in r['archives'])
r=load(p/'q14b-source-observation-authentication-v1.json');assert r['passed'] and r['frozenSourceFiles']==153 and r['sealedAnalysisArtifacts']==23
r=load(p/'timing-reconciliation.json');old=load(e/'performance/report.json');assert r['passed'] and r['runs']==12 and r['pairs']==6 and r['medianPairedPercentChange']==old['medianPairedPercentChange'] and r['gates']==old['gates']
assert 'pass 27' in (p/'focused-native-fixtures.log.txt').read_text() and 'Ran 10 tests' in (p/'independent-fixtures-renewed.log.txt').read_text() and 'OK' in (p/'independent-fixtures-renewed.log.txt').read_text()
print('Verified entire original recount/parity reports, full archive/source authentication receipts, original timing correspondence and fixture outcomes. Original acceptance remains failed.')
