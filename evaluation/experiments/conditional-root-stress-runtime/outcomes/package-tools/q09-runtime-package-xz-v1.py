"""Lossless XZ transport of the unchanged full supplement; no data rewriting."""
from pathlib import Path
import hashlib,json,lzma
source=Path('/private/tmp/q09-runtime-supplement-result-v2.json')
target=Path('/private/tmp/q09-runtime-supplement-result-v2.json.xz')
expected='6a51e736296f436e9b55b0c97d14680b332ca7609a32b21941b5dda79e84e8dc'
h=hashlib.sha256();size=0
with source.open('rb') as src,target.open('xb') as raw:
 with lzma.LZMAFile(raw,'wb',format=lzma.FORMAT_XZ,check=lzma.CHECK_CRC64,preset=9) as out:
  while block:=src.read(1024*1024):h.update(block);size+=len(block);out.write(block)
if h.hexdigest()!=expected:raise ValueError('Raw report hash differs; retain failed transport')
compressed=hashlib.sha256()
with target.open('rb') as src:
 while block:=src.read(1024*1024):compressed.update(block)
roundtrip=hashlib.sha256();decoded=0
with lzma.open(target,'rb') as src:
 while block:=src.read(1024*1024):roundtrip.update(block);decoded+=len(block)
if roundtrip.hexdigest()!=expected or decoded!=size:raise ValueError('XZ round trip differs')
report={'source':str(source),'originalBytes':size,'originalSha256':expected,'compressed':str(target),'compressedBytes':target.stat().st_size,'compressedSha256':compressed.hexdigest(),'compression':{'format':'xz','preset':9,'check':'CRC64'},'roundTripVerified':True}
with Path('/private/tmp/q09-runtime-package-xz-v1.json').open('x') as out:json.dump(report,out,indent=2);out.write('\n')
print(json.dumps(report))
