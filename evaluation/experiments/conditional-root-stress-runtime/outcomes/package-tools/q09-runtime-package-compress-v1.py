"""Transport-only deterministic gzip; does not reinterpret study evidence."""
from pathlib import Path
import gzip,hashlib,json
source=Path('/private/tmp/q09-runtime-supplement-result-v2.json')
target=Path('/private/tmp/q09-runtime-supplement-result-v2.json.gz')
expected='6a51e736296f436e9b55b0c97d14680b332ca7609a32b21941b5dda79e84e8dc'
digest=hashlib.sha256();size=0
with source.open('rb') as src,target.open('xb') as raw:
 with gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0,compresslevel=9) as gz:
  while block:=src.read(1024*1024):
   digest.update(block);size+=len(block);gz.write(block)
if digest.hexdigest()!=expected:raise ValueError('Input report hash differs; retain failed transport')
compressed=hashlib.sha256()
with target.open('rb') as src:
 while block:=src.read(1024*1024):compressed.update(block)
report={'source':str(source),'originalBytes':size,'originalSha256':digest.hexdigest(),'compressed':str(target),'compressedBytes':target.stat().st_size,'compressedSha256':compressed.hexdigest(),'compression':{'format':'gzip','level':9,'mtime':0,'filename':''}}
with Path('/private/tmp/q09-runtime-package-compress-v1.json').open('x') as out:json.dump(report,out,indent=2);out.write('\n')
print(json.dumps(report))
