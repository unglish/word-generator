"""Transport-only package; never modifies or executes frozen study sources."""
from pathlib import Path
import base64,gzip,hashlib,io,json,shutil,tarfile
TMP=Path('/private/tmp')
ROOT=Path('/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator')
STAGE=TMP/'q09-runtime-publication-stage-v1'
PREFIX=Path('evaluation/experiments/conditional-root-stress-runtime/outcomes')
OUT=STAGE/PREFIX
OUT.mkdir(parents=True,exist_ok=False)
entries=[]
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as stream:
  while block:=stream.read(1024*1024):h.update(block)
 return h.hexdigest()
def checked(path,pin=None):
 if path.is_symlink() or not path.is_file():raise ValueError(f'Nonregular source {path}')
 data=path.read_bytes()
 if pin and (hashlib.sha256(data).hexdigest()!=pin['sha256'] or 'bytes' in pin and len(data)!=pin['bytes']):raise ValueError(f'Frozen source differs: {path}')
 return data

def add(source,destination,compress=False,expected=None):
 source=Path(source);target=OUT/destination;target.parent.mkdir(parents=True,exist_ok=True)
 raw=checked(source,expected)
 encoded=gzip.compress(raw,compresslevel=9,mtime=0) if compress else raw
 with target.open('xb') as f:f.write(encoded)
 entries.append({'path':str(PREFIX/destination),'source':str(source),'transport':'gzip' if compress else 'identity','sourceBytes':len(raw),'sourceSha256':hashlib.sha256(raw).hexdigest(),'bytes':len(encoded),'sha256':hashlib.sha256(encoded).hexdigest()})

def pack_directory(source,destination):
 target=OUT/destination;target.parent.mkdir(parents=True,exist_ok=True);members=[];plain=io.BytesIO()
 with tarfile.open(fileobj=plain,mode='w',format=tarfile.USTAR_FORMAT) as tar:
  for source in sorted(source.iterdir()):
   data=checked(source);info=tarfile.TarInfo(source.name);info.size=len(data);info.mode=0o600;info.mtime=0
   tar.addfile(info,io.BytesIO(data));members.append({'member':source.name,'source':str(source),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 data=plain.getvalue();encoded=gzip.compress(data,compresslevel=9,mtime=0)
 with target.open('xb') as f:f.write(encoded)
 entries.append({'path':str(PREFIX/destination),'transport':'tar+gzip','sourceBytes':len(data),'sourceSha256':hashlib.sha256(data).hexdigest(),'bytes':len(encoded),'sha256':hashlib.sha256(encoded).hexdigest(),'members':members})

# Preserve exact top-level capture/rescore artifacts. Word shards are explicitly unbundled.
unbundled=[]
for variant in ['control','active']:
 for kind in ['raw','scored']:
  source=TMP/f'q09-runtime-{variant}-{kind}-v1'
  for p in sorted(source.iterdir()):
   if p.name=='words':
    unbundled.append({'source':str(p),'role':f'{variant}-{kind} word shards','files':len(list(p.iterdir())),'bytes':sum(q.stat().st_size for q in p.iterdir()),'authorityManifest':f'captures/{variant}-{kind}/manifest.json'})
   else:add(p,Path('captures')/f'{variant}-{kind}'/p.name)
for p in sorted((TMP/'q09-runtime-common-comparison-v1').iterdir()):add(p,Path('common-comparison')/p.name)
for name in ['q09-runtime-capture-freeze-v1.json','q09-runtime-control-materialization-v1.json','q09-runtime-delegation-parity-v1.json','q09-runtime-delegation-parity-v1.json.inputs.json','q09-runtime-control-observation-v1.json','q09-runtime-active-observation-v1.json','q09-runtime-independent-proof-v1.json']:
 add(TMP/name,Path('proofs')/(name+'.gz'),compress=True)

# Exact frozen source bytes; parent #334's existing large proof files are not duplicated.
frozen=json.loads((TMP/'q09-runtime-capture-freeze-v1.json').read_bytes())
bundled={}
for group in ['candidateSources','originalSources','tools','evaluator','dependencies','references']:
 base=Path(frozen['original']) if group=='originalSources' else ROOT
 bundled[group]=[{**pin,'contentBase64':base64.b64encode(checked(base/pin['path'],pin)).decode()} for pin in frozen[group]]
for pin in frozen['immutablePublishedFiles']:
 if digest(ROOT/pin['path'])!=pin['sha256']:raise ValueError(f'Published parent changed: {pin["path"]}')
source_bundle=TMP/'q09-runtime-frozen-source-bundle-v1.json'
with source_bundle.open('x') as f:json.dump({'schema':'q09-runtime-frozen-source-bundle-v1','freezeSha256':digest(TMP/'q09-runtime-capture-freeze-v1.json'),'groups':bundled,'inheritedParentCommit':frozen['baseCommit'],'inheritedPublishedFiles':frozen['immutablePublishedFiles'],'inheritedFilesVerified':True,'scope':'Exact bytes for capture runtime/tool/evaluator/dependency/reference closure; inherited #334 proof files remain in the base commit.'},f,separators=(',',':'));f.write('\n')
add(source_bundle,Path('proofs/frozen-source-bundle.json.gz'),compress=True)

# Full supplement, without dropping contexts, strata or witnesses.
transport=json.loads((TMP/'q09-runtime-package-compress-v1.json').read_bytes())
compressed=TMP/'q09-runtime-supplement-result-v2.json.gz'
if digest(compressed)!=transport['compressedSha256']:raise ValueError('Full supplement transport changed')
target=OUT/'supplement/full-report.json.gz';target.parent.mkdir(parents=True,exist_ok=True)
with compressed.open('rb') as src,target.open('xb') as dst:shutil.copyfileobj(src,dst,1024*1024)
entries.append({'path':str(PREFIX/'supplement/full-report.json.gz'),'source':transport['source'],'transport':'gzip','sourceBytes':transport['originalBytes'],'sourceSha256':transport['originalSha256'],'bytes':transport['compressedBytes'],'sha256':transport['compressedSha256'],'compression':transport['compression']})
spec=json.loads((TMP/'q09-supplement-authority-proposal-v2.json').read_bytes())
for pin in spec['ownSources']:add(pin['path'],Path('supplement/sources')/Path(pin['path']).name,expected=pin)
for name in ['q09-supplement-authority-proposal-v2.json','q09-runtime-supplement-overview-v2.json','q09-runtime-supplement-result-v2.log','q09-supplement-parent-synthetic-v2.log','q09-parent-supplement-source-review-v1.json','q09-runtime-package-compress-v1.json']:
 add(TMP/name,Path('supplement')/name,compress=False)
for name in ['q09-supplement-authority-proposal-v1.json','q09-supplement-before-index-order-authority-v1.py','q09-supplement-before-index-order-authority-test-v1.py','q09-supplement-before-index-order-contract-v1.md','q09-runtime-supplement-result-v1.json','q09-runtime-supplement-result-v1.log','q09-supplement-parent-synthetic-v1.log']:
 add(TMP/name,Path('supplement/failed-preflight-v1')/name)

# Both timing matrices, including all wholly invalid v1 outcomes, exact tools and source reviews.
for p in sorted(TMP.glob('q09-runtime-timing-*')):
 if p.is_file():
  compress=p.suffix=='.jsonl'
  add(p,Path('timing')/(p.name+('.gz' if compress else '')),compress=compress)
for version in ['v1','v2']:pack_directory(TMP/f'q09-runtime-timing-results-{version}',Path('timing')/f'raw-outcomes-{version}.tar.gz')
for p in sorted(TMP.glob('q09-parent-timing-*.json')):add(p,Path('timing')/p.name)
add(TMP/'q09-runtime-default-performance-v1.log',Path('timing/q09-runtime-default-performance-v1.log'))

# Existing validation/capture/analysis logs and independent parent bounded reviews.
for p in sorted(TMP.glob('q09-runtime-*.log')):
 if p.name.startswith(('q09-runtime-timing-','q09-runtime-supplement-')) or p.name=='q09-runtime-default-performance-v1.log':continue
 add(p,Path('checks')/p.name)
for pattern in ['q09-parent-capture-tests-*.log','q09-parent-parity-tool-tests-*.log','q09-parent-runtime-focused-*.log','q09-parent-mechanism-tests-*.log','q09-parent-recount-tests-*.log','q09-parent-observer-tool-tests-*.log','q09-parent-runtime-review-*.json','q09-parent-delegation-*.json','q09-parent-observer-source-review-*.json']:
 for p in sorted(TMP.glob(pattern)):add(p,Path('checks')/p.name)
for p in [Path(__file__),TMP/'q09-runtime-package-compress-v1.py']:
 add(p,Path('package-tools')/p.name)

# Verify every published transport back to its exact original bytes.
for entry in entries:
 p=STAGE/entry['path']
 if p.stat().st_size!=entry['bytes'] or digest(p)!=entry['sha256']:raise ValueError(f'Stored bytes differ {p}')
 if entry['bytes']>=100_000_000:raise ValueError(f'Git artifact exceeds declared <100 MB bound {p}')
 h=hashlib.sha256();count=0
 opener=gzip.open if entry['transport'] in ['gzip','tar+gzip'] else open
 with opener(p,'rb') as stream:
  while block:=stream.read(1024*1024):h.update(block);count+=len(block)
 if h.hexdigest()!=entry['sourceSha256'] or count!=entry['sourceBytes']:raise ValueError(f'Transport round-trip differs {p}')
 if entry['transport']=='tar+gzip':
  with tarfile.open(p,'r:gz') as tar:
   if tar.getnames()!=[r['member'] for r in entry['members']]:raise ValueError('Archive member schedule differs')
   for row in entry['members']:
    data=tar.extractfile(row['member']).read()
    if len(data)!=row['bytes'] or hashlib.sha256(data).hexdigest()!=row['sha256']:raise ValueError('Archive member differs')
index={'schema':'q09-runtime-outcome-package-v1','baseCommit':frozen['baseCommit'],'sourceFreezeSha256':digest(TMP/'q09-runtime-capture-freeze-v1.json'),'entries':entries,'unbundledInputs':unbundled,'scope':'Outcome evidence transports only. Top-level capture/scored artifacts are not complete readRun directories until omitted word shards are restored. Full supplement and timing outcomes are included. Original absolute execution paths remain historical provenance.','allTransportsRoundTripVerified':True,'inheritedPublishedFilesVerified':len(frozen['immutablePublishedFiles']),'artifactLimitBytesExclusive':100000000}
with (OUT/'package-index.json').open('x') as f:json.dump(index,f,indent=2);f.write('\n')
print(json.dumps({'stage':str(STAGE),'entries':len(entries),'bytes':sum(e['bytes'] for e in entries),'maxArtifactBytes':max(e['bytes'] for e in entries),'indexSha256':digest(OUT/'package-index.json'),'sourceClosureFiles':sum(len(rows) for rows in bundled.values())}))
