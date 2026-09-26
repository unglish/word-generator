"""Choose smaller lossless transport and add outcome companions in fresh staging."""
from pathlib import Path
import hashlib,json,lzma,shutil
TMP=Path('/private/tmp');OLD=TMP/'q09-runtime-publication-stage-v1';STAGE=TMP/'q09-runtime-publication-stage-v2'
PREFIX=Path('evaluation/experiments/conditional-root-stress-runtime/outcomes');OUT=STAGE/PREFIX
index=json.loads((OLD/PREFIX/'package-index.json').read_bytes())
xz=json.loads((TMP/'q09-runtime-package-xz-v1.json').read_bytes())
gz=json.loads((TMP/'q09-runtime-package-compress-v1.json').read_bytes())
if not xz['roundTripVerified'] or xz['originalSha256']!=gz['originalSha256']:raise ValueError('Transport identities differ')
if xz['compressedBytes']>=gz['compressedBytes']:raise ValueError('XZ is not smaller; retain both and seek review')
OUT.mkdir(parents=True,exist_ok=False)
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while block:=f.read(1024*1024):h.update(block)
 return h.hexdigest()
def copy(source,target):
 target.parent.mkdir(parents=True,exist_ok=True)
 with source.open('rb') as src,target.open('xb') as dst:shutil.copyfileobj(src,dst,1024*1024)
entries=[]
for entry in index['entries']:
 entry=dict(entry)
 if entry['path']==str(PREFIX/'supplement/full-report.json.gz'):
  entry.update(path=str(PREFIX/'supplement/full-report.json.xz'),transport='xz',bytes=xz['compressedBytes'],sha256=xz['compressedSha256'],compression=xz['compression'])
  source=Path(xz['compressed'])
 else:source=OLD/entry['path']
 copy(source,STAGE/entry['path'])
 if digest(STAGE/entry['path'])!=entry['sha256']:raise ValueError('Copy changed')
 entries.append(entry)
for source,destination,role in [
 (TMP/'q09-runtime-outcomes-README-v1.md','README.md','outcome companion'),
 (TMP/'q09-runtime-measured-summary-v1.json','measured-summary.json','selection of existing report fields'),
 (TMP/'q09-runtime-summary-v1.py','package-tools/q09-runtime-summary-v1.py','companion derivation source'),
 (TMP/'q09-runtime-package-xz-v1.py','package-tools/q09-runtime-package-xz-v1.py','transport source'),
 (TMP/'q09-runtime-package-xz-v1.json','supplement/q09-runtime-package-xz-v1.json','transport verification'),
 (Path(__file__),'package-tools/q09-runtime-package-finalize-v2.py','transport finalization source')]:
 relative=PREFIX/destination;copy(source,STAGE/relative)
 entries.append({'path':str(relative),'source':str(source),'transport':'identity','role':role,'sourceBytes':source.stat().st_size,'sourceSha256':digest(source),'bytes':source.stat().st_size,'sha256':digest(source)})
# Check full compressed report again from the exact candidate publication bytes.
raw=hashlib.sha256();size=0
with lzma.open(OUT/'supplement/full-report.json.xz','rb') as f:
 while block:=f.read(1024*1024):raw.update(block);size+=len(block)
if raw.hexdigest()!=xz['originalSha256'] or size!=xz['originalBytes']:raise ValueError('Staged XZ round trip differs')
index.update(schema='q09-runtime-outcome-package-v2',entries=entries,transportAmendment={'scope':'Lossless transport only; no raw source/report bytes changed','previousGzip':gz,'selectedXz':xz,'gzipRetainedExternally':True},allTransportsRoundTripVerified=True)
with (OUT/'package-index.json').open('x') as f:json.dump(index,f,indent=2);f.write('\n')
paths=sorted(p for p in STAGE.rglob('*') if p.is_file())
manifest={'schema':'q09-runtime-publication-stage-v2','stagingRoot':str(STAGE),'baseCommit':index['baseCommit'],'files':[{'path':str(p.relative_to(STAGE)),'bytes':p.stat().st_size,'sha256':digest(p)} for p in paths],'totalBytes':sum(p.stat().st_size for p in paths),'sourceFreezeSha256':index['sourceFreezeSha256'],'scope':'Evidence/README companion files only; runtime/registered source files remain in the frozen checkout and are not copied or changed here.'}
if max(row['bytes'] for row in manifest['files'])>=100000000:raise ValueError('Oversized Git artifact')
with (TMP/'q09-runtime-publication-stage-manifest-v2.json').open('x') as f:json.dump(manifest,f,indent=2);f.write('\n')
print(json.dumps({'stage':str(STAGE),'files':len(paths),'bytes':manifest['totalBytes'],'largestFile':max(row['bytes'] for row in manifest['files']),'manifestSha256':digest(TMP/'q09-runtime-publication-stage-manifest-v2.json')}))
