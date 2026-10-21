import argparse,json,gzip,hashlib,subprocess,sys
from pathlib import Path
if not __debug__:raise RuntimeError('Assertions required')
a=argparse.ArgumentParser();a.add_argument('--repository-root',type=Path,required=True);root=a.parse_args().repository_root;p=Path(__file__).parent;e=root/'evaluation/experiments/conditional-onset-rime'
for r in json.loads((p/'index.json').read_text())['records']:
 f=Path(r['path']);assert not f.is_absolute() and '..' not in f.parts;d=(p/f).read_bytes();assert len(d)==r['bytes'] and hashlib.sha256(d).hexdigest()==r['sha256']
for old,new in [('independent_reconstruction.py.log.gz','reconstruction-renewed.log.txt'),('verify_likelihoods.py.log.gz','likelihood-renewed.log.txt')]:assert json.loads(gzip.decompress((e/'evidence/independent'/old).read_bytes()))==json.loads((p/new).read_text())
assert hashlib.sha256(gzip.decompress((e/'evidence/fit/artifact.json.gz').read_bytes())).hexdigest()=='485b011ef85afeeb628c06655a84898a2c32fb57f55a27828a78baaaf7602618'
assert 'Ran 5 tests' in (p/'independent-fixtures.log.txt').read_text() and 'OK' in (p/'independent-fixtures.log.txt').read_text()
subprocess.run([sys.executable,'-B',str(e/'verify-validation.py'),'--repo',str(root)],check=True)
print('Verified complete original independent report correspondence, exact original fit artifact and original package/source identity; offline scope retained.')
