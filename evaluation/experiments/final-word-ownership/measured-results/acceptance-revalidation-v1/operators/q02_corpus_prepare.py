"""Recover and authenticate the complete original Q02 corpus and operators."""
from pathlib import Path
import ctypes,datetime,gzip,hashlib,json,os,subprocess
ROOT=Path.cwd();OUT=Path('/private/tmp/q02-corpus-acceptance-revalidation-v1');HEAD='76b102eaa7f70131bcbd0a924c6cc6ea9c6e214b';EXP='evaluation/experiments/final-word-ownership/measured-results';STREAM=Path('/private/tmp/q02-stream-acceptance-revalidation-v1')
def blob(path):return subprocess.check_output(['git','show',HEAD+':'+path],cwd=ROOT)
def pin(path):
 h=hashlib.sha256();n=0
 with path.open('rb') as handle:
  for chunk in iter(lambda:handle.read(1048576),b''):h.update(chunk);n+=len(chunk)
 return {'bytes':n,'sha256':h.hexdigest()}
def save(path,value):path.write_text(json.dumps(value,indent=2)+'\n')
OUT.mkdir(exist_ok=True);assert not (OUT/'preparation-registration.json').exists();hist=OUT/'historical';hist.mkdir(exist_ok=True);(hist/'index.json').write_bytes(blob(EXP+'/index.json'));index=json.loads((hist/'index.json').read_text());decoded=[];recovered_caches=[]
published=set(subprocess.check_output(['git','ls-tree','-r','--name-only',HEAD,EXP],cwd=ROOT).decode().splitlines())
for artifact in index['artifacts']:
 p=hist/artifact['file'];p.parent.mkdir(parents=True,exist_ok=True)
 if EXP+'/'+artifact['file'] in published:data=blob(EXP+'/'+artifact['file'])
 else:
  assert artifact['file'] in ['tools/active-quality/'+role+'/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json.gz' for role in ['control','candidate']],artifact['file']
  old=Path('/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator')/EXP/artifact['file'];data=old.read_bytes();assert pin(old)=={k:artifact[k] for k in ['bytes','sha256']};recovered_caches.append({'file':artifact['file'],'source':str(old),**pin(old),'wasPublishedInGit':False})
 p.write_bytes(data);assert pin(p)=={k:artifact[k] for k in ['bytes','sha256']}
 if artifact.get('encoding')=='gzip':
  raw=gzip.decompress(p.read_bytes());assert len(raw)==artifact['originalBytes'] and hashlib.sha256(raw).hexdigest()==artifact['originalSha256'];decoded.append({'file':artifact['file'],'sha256':artifact['originalSha256']})
registration=OUT/'measurement.json';registration.write_bytes(blob('evaluation/experiments/final-word-ownership/measurement.json'));protocol=OUT/'protocol.json';protocol.write_bytes(blob('evaluation/quality/protocol.json'));r=json.loads(registration.read_text());assert pin(protocol)['sha256']==r['protocolSha256']
clone=ctypes.CDLL(None,use_errno=True).clonefile;clone.argtypes=[ctypes.c_char_p,ctypes.c_char_p,ctypes.c_int];clone.restype=ctypes.c_int;rawpins=[];sourcepins={}
for role in ['control','candidate']:
 archive=ROOT/'.local-evidence/q02-resumed/archives'/role;dst=OUT/'archives'/role;dst.mkdir(parents=True)
 manifest=json.loads((archive/'manifest.json').read_text())['manifest'];assert manifest['cohort']=='development' and manifest['protocol']==json.loads(protocol.read_text()) and len(manifest['artifacts'])==25
 files=[{'file':'manifest.json',**pin(archive/'manifest.json')},*manifest['artifacts']]
 for artifact in files:
  src=archive/artifact['file'];target=dst/artifact['file'];target.parent.mkdir(parents=True,exist_ok=True);assert pin(src)=={k:artifact[k] for k in ['bytes','sha256']}
  if clone(os.fsencode(src),os.fsencode(target),0):raise OSError(ctypes.get_errno(),str(src))
  assert pin(target)==pin(src) and src.stat().st_ino!=target.stat().st_ino;rawpins.append({'role':role,'file':artifact['file'],**pin(target),'independentInode':True})
 seal_src=archive.with_name(role+'-freeze');seal_dst=dst.with_name(role+'-freeze');seal_dst.mkdir()
 for src in seal_src.iterdir():
  if src.is_file():target=seal_dst/src.name;target.write_bytes(src.read_bytes())
 seal=json.loads((seal_dst/'complete.json').read_text());assert seal['passed'] and seal['words']==200000 and seal['manifest']==pin(dst/'manifest.json');assert pin(seal_dst/'before.json')['sha256']==seal['beforeSha256']
 snapshot=json.loads(gzip.decompress((dst/'sources.json.gz').read_bytes()));checkout=STREAM/(role+'-checkout');sourcepins[role]=[]
 for x in snapshot['generator']+snapshot['packageFiles']:
  actual=checkout/x['path'];assert actual.read_bytes()==x['content'].encode(),(role,x['path']);sourcepins[role].append({'path':x['path'],**pin(actual)})
 for name,p in seal['after']['files']['src'].items():assert pin(checkout/'src'/name)==p,(role,'complete captured src pin',name)
 assert manifest['environment']['node']=='v24.11.1'
for name in ['candidate-production.json','control-independent.json','candidate-independent.json','legacy-equality.json','counter-agreement.json']:
 assert any(name in x['file'] for x in index['artifacts']),name
oldroot='/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator';ownedroot=str(STREAM/'candidate-checkout');original=(hist/'tools/analyze-archive.mjs').read_text();assert original.count(oldroot)==6
relocated=original.replace(oldroot,ownedroot);operators=OUT/'operators';operators.mkdir();(operators/'analyze-archive-location-only.mjs').write_text(relocated)
assert relocated.replace(ownedroot,oldroot)==original
mapping={oldroot:ownedroot};save(OUT/'operator-location-registration.json',{'registeredAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'originalOperator':pin(hist/'tools/analyze-archive.mjs'),'relocatedOperator':pin(operators/'analyze-archive-location-only.mjs'),'sixLiteralRootLocations':mapping,'reverseSubstitutionByteExact':True,'scope':'Only six original module/config/protocol locations point to exactsource-owned clone. All remaining operatorbytes/guards/metrics/gates/sourcecommits/manifests/schedules unchanged. No scientific output renaming.'})
save(OUT/'source-binding.json',{'sourcePins':sourcepins,'allArchivedGeneratorPackageAndCompleteCaptureSrcBytesExact':True,'candidateSource':str(STREAM/'candidate-checkout'),'controlSource':str(STREAM/'control-checkout'),'scope':'Every original generatorclosure and packagefile binds exactpublishedQ02/parent and ownedstreaming clones; CLI-only diagnostic patch is outsidegeneratorclosure. Completecapturedsrc includingtests matches originalseal.'})
save(OUT/'preparation-registration.json',{'registeredAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'publishedHead':HEAD,'completeWordsEach':200000,'artifactsVerified':50,'rawShardsVerified':40,'originalIndexedArtifactsAuthenticated':len(index['artifacts']),'publishedIndexedArtifactsVerified':len(index['artifacts'])-len(recovered_caches),'unpublishedOriginalCachesRecovered':recovered_caches,'decodedArtifactsVerified':len(decoded),'rawPins':rawpins,'registration':pin(registration),'protocol':pin(protocol),'sourceBinding':pin(OUT/'source-binding.json'),'scope':'Full originalsealed400000-record closure and everypublished scientific/check/timing artifact. Two originalcachebytes recovered independently; historicalGit deliverygap remains explicit and must be corrected under originalexclude-transientcache instruction. No regeneration, samplechange, historicalresult relabeling, sourcechange or criteriachange. Nextactions originalfullproduction/independent/legacyreplay and originalfixture/counterreconciliation.'})
print(json.dumps({'out':str(OUT),'wordsEach':200000,'all50ArtifactsVerified':True,'originalIndexedArtifactsAuthenticated':len(index['artifacts']),'publishedIndexedArtifacts':len(index['artifacts'])-len(recovered_caches),'sourceFiles':{k:len(v) for k,v in sourcepins.items()}}))
