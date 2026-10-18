"""Verify packaged evidence byte identities and unchanged measured generator sources."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--package',type=Path,default=Path(__file__).parent)
parser.add_argument('--repo',type=Path)
args=parser.parse_args()
index=json.loads((args.package/'validation-index.json').read_text())
def pin(raw):return {'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
paths=set()
for record in index['records']:
 relative=Path(record['path'])
 assert not relative.is_absolute() and '..' not in relative.parts
 assert record['path'] not in paths;paths.add(record['path'])
 raw=(args.package/relative).read_bytes()
 assert pin(raw)=={'bytes':record['bytes'],'sha256':record['sha256']},record['path']
 original=gzip.decompress(raw) if record['compression']=='gzip' else raw
 assert pin(original)=={'bytes':record['originalBytes'],'sha256':record['originalSha256']},record['path']
if args.repo:
 for name,expected in index['registeredInputs'].items():
  path=args.package/name
  if path.exists():assert pin(path.read_bytes())==expected,name
  else:
   record=next(r for r in index['records'] if r['path']=='evidence/preimplementation/'+name+'.gz')
   assert {'bytes':record['originalBytes'],'sha256':record['originalSha256']}==expected,name
 actual={p.relative_to(args.repo/'src').as_posix():pin(p.read_bytes()) for p in (args.repo/'src').rglob('*') if p.is_file()}
 assert actual==index['sourcePins'],'Measured generator source changed'
print(json.dumps({'passed':True,'artifacts':len(paths),'sourceVerified':bool(args.repo),
 'scope':'Packaged byte integrity and unchanged measured generator source; gate failures remain failures.'}))
