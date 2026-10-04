from pathlib import Path
import datetime,gzip,hashlib,json,os,subprocess
ROOT=Path.cwd();OUT=Path('/private/tmp/q02-corpus-acceptance-revalidation-v1');HIST=OUT/'historical';REPORTS=OUT/'reports';NODE='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node';PYTHON='/Users/ryanbetts/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';LOADER='/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs';env=os.environ.copy();env['PATH']=str(Path(NODE).parent)+os.pathsep+env.get('PATH','');commands=[]
def read(path):return json.loads(path.read_text())
def pin(path):
 h=hashlib.sha256();n=0
 with path.open('rb') as handle:
  for chunk in iter(lambda:handle.read(1048576),b''):h.update(chunk);n+=len(chunk)
 return {'bytes':n,'sha256':h.hexdigest()}
def save(path,value):
 temporary=path.with_name(path.name+'.new')
 with temporary.open('x') as handle:json.dump(value,handle,indent=2);handle.write('\n');handle.flush();os.fsync(handle.fileno())
 os.replace(temporary,path)
registration=read(OUT/'preparation-registration.json');binding=read(OUT/'source-binding.json');REPORTS.mkdir(exist_ok=False)
def sources_stable():
 for role,files in binding['sourcePins'].items():
  for x in files:assert pin(Path(binding[role+'Source'])/x['path'])=={k:x[k] for k in ['bytes','sha256']},(role,x['path'])
 for x in registration['rawPins']:assert pin(OUT/'archives'/x['role']/x['file'])=={k:x[k] for k in ['bytes','sha256']},(x['role'],x['file'])
 assert pin(OUT/'measurement.json')==registration['registration'] and pin(OUT/'protocol.json')==registration['protocol']
def run(name,args,cwd=OUT):
 print('starting '+name,flush=True);record={'name':name,'args':args,'cwd':str(cwd),'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 with (OUT/(name+'.log')).open('xb') as log:process=subprocess.run(args,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT)
 record.update(exitCode=process.returncode,completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat());commands.append(record);save(OUT/'commands.json',commands);print(json.dumps({'name':name,'exitCode':process.returncode}),flush=True);assert process.returncode==0,name
def original_bytes(path):return gzip.decompress((HIST/path).read_bytes())
try:
 sources_stable()
 run('original-six-independent-corruption-archive-fixtures',[PYTHON,'-B',str(HIST/'tools/recount-v2/test_recount.py')])
 for role in ['control','candidate']:
  archive=OUT/'archives'/role;manifest_hash=pin(archive/'manifest.json')['sha256'];production=HIST/'tools/q02-control-production-counts.json' if role=='control' else REPORTS/'candidate-production.json'
  run(role+'-complete200000-production-replay',[NODE,'--import',LOADER,str(OUT/'operators/analyze-archive-location-only.mjs'),str(archive),manifest_hash,str(production)])
  old_production='context/q02-control-production-counts.json.gz' if role=='control' else 'audit/candidate-production.json.gz';assert production.read_bytes()==original_bytes(old_production),(role,'native counters differ')
  independent=REPORTS/(role+'-independent.json');run(role+'-complete200000-independent-recount',[PYTHON,'-B',str(HIST/'tools/recount-v2/recount.py'),str(archive),manifest_hash,str(independent),str(OUT/'measurement.json'),str(OUT/'protocol.json')])
  assert independent.read_bytes()==original_bytes('audit/'+role+'-independent.json.gz'),(role,'independent counters differ')
 hashes={role:pin(OUT/'archives'/role/'manifest.json')['sha256'] for role in ['control','candidate']}
 run('original-complete200000-paired-legacy-wordtrace-equality',[PYTHON,'-B',str(HIST/'tools/compare_archives.py'),str(OUT/'archives/control'),str(OUT/'archives/candidate'),hashes['control'],hashes['candidate'],str(OUT/'measurement.json'),str(OUT/'protocol.json'),str(REPORTS/'legacy-equality.json')])
 assert (REPORTS/'legacy-equality.json').read_bytes()==original_bytes('audit/legacy-equality.json.gz')
 adapter=ROOT/'.local-evidence/roadmap-completion-audit-v1/q09a_location_adapter.py';mapping={'/private/tmp/q02-final-audit-v2':str(REPORTS)}
 save(OUT/'counter-location-registration.json',{'registeredAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'locations':mapping,'adapterSha256':pin(adapter)['sha256'],'scope':'One originalresults-directory location only; frozen comparatorreads freshlybyte-reproduced controlreport besideoriginalscript and bothfresh completeindependent reports. Originalmathematics/counters/guards/sourcebytes unchanged.'})
 run('original-all1538-independent-counter-comparisons',[PYTHON,'-B',str(adapter),str(OUT/'counter-location-registration.json'),str(HIST/'tools/compare-final-counters.py'),str(OUT/'counter-location-receipt.json')])
 assert (REPORTS/'counter-agreement.json').read_bytes()==original_bytes('audit/counter-agreement.json.gz')
 comparison=read(REPORTS/'counter-agreement.json');assert sum(arm['integerComparisons'] for arm in comparison['arms'].values())==1538 and comparison['independentCounterDisagreements']==0
 sources_stable();save(OUT/'complete.json',{'terminal':True,'commandsPassed':len(commands),'commands':commands,'completeWordsEach':200000,'all50OriginalScientificArtifactsStable':True,'completeNativeIndependentAndLegacyReportsByteExact':True,'integerComparisons':1538,'preparation':pin(OUT/'preparation-registration.json'),'sourceBinding':pin(OUT/'source-binding.json'),'scope':'Fulloriginal400000-record native andindependentrecounts/200000paired completelegacyrecords and all1538registeredcounters, frozenfullsource/raw closure; historicalgate/timing outcomes remainseparate, no changedseed/count/heap/threshold, no gain/currentmainclaim. Originaldeliveryindexcacheexclusions stillneed publiccorrection.'});print(json.dumps({'terminal':True,'commandsPassed':len(commands),'completeWordsEach':200000,'independentComparisons':1538,'reportsExact':True}),flush=True)
except Exception as error:
 save(OUT/'failure.json',{'terminal':True,'type':type(error).__name__,'error':str(error),'commands':commands});raise
