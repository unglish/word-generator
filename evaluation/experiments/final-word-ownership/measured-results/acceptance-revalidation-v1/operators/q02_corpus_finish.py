from pathlib import Path
import datetime,gzip,hashlib,json,os,subprocess
ROOT=Path.cwd();OUT=Path('/private/tmp/q02-corpus-acceptance-revalidation-v1');HIST=OUT/'historical';REPORTS=OUT/'reports';PYTHON='/Users/ryanbetts/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
def read(path):return json.loads(path.read_text())
def pin(path):
 h=hashlib.sha256();n=0
 with path.open('rb') as handle:
  for chunk in iter(lambda:handle.read(1048576),b''):h.update(chunk);n+=len(chunk)
 return {'bytes':n,'sha256':h.hexdigest()}
def save(path,value):path.write_text(json.dumps(value,indent=2)+'\n')
commands=read(OUT/'commands.json');assert len(commands)==7 and commands[-1]['exitCode']==1
adapter=ROOT/'.local-evidence/roadmap-completion-audit-v1/q02_directory_adapter.py';registration={'registeredAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'locations':{'/private/tmp/q02-final-audit-v2':str(REPORTS)},'additionalBoundInputs':[str(HIST/'tools/q02-control-production-counts.json')],'adapterSha256':pin(adapter)['sha256'],'scope':'Priorfile-only wrapperfailed beforecomparer math on directory. This directory-specificwrapper pins every existinginputfile and nativecontrolreport. Only oneoriginaldirectory constructor argument relocated; no source/math/counter/sample/gatechange.'};save(OUT/'counter-directory-registration.json',registration)
args=[PYTHON,'-B',str(adapter),str(OUT/'counter-directory-registration.json'),str(HIST/'tools/compare-final-counters.py'),str(OUT/'counter-directory-receipt.json')];record={'name':'original-all1538-counter-comparisons-directory-corrected','args':args,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
with (OUT/(record['name']+'.log')).open('xb') as log:p=subprocess.run(args,cwd=OUT,stdout=log,stderr=subprocess.STDOUT)
record.update(exitCode=p.returncode,completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat());commands.append(record);save(OUT/'commands.json',commands);assert p.returncode==0
assert (REPORTS/'counter-agreement.json').read_bytes()==gzip.decompress((HIST/'audit/counter-agreement.json.gz').read_bytes())
assert sum(x['integerComparisons'] for x in read(REPORTS/'counter-agreement.json')['arms'].values())==1538
binding=read(OUT/'source-binding.json');prep=read(OUT/'preparation-registration.json')
for role,files in binding['sourcePins'].items():
 for x in files:assert pin(Path(binding[role+'Source'])/x['path'])=={k:x[k] for k in ['bytes','sha256']}
for x in prep['rawPins']:assert pin(OUT/'archives'/x['role']/x['file'])=={k:x[k] for k in ['bytes','sha256']}
save(OUT/'complete.json',{'terminal':True,'commandsTotal':len(commands),'commandsPassed':sum(x['exitCode']==0 for x in commands),'preservedWrapperFailures':1,'completeWordsEach':200000,'all50OriginalScientificArtifactsStable':True,'completeNativeIndependentAndLegacyReportsByteExact':True,'integerComparisons':1538,'preparation':pin(OUT/'preparation-registration.json'),'sourceBinding':pin(OUT/'source-binding.json'),'publicDeliveryCorrection':{'publishedHead':'16ae629beb806b224117dfe63515bf47818fcfe6','evidence':'.local-evidence/q02-index-publication-complete-v1.json'},'scope':'Fulloriginal400000-record native/independent and200000pairedlegacy plusall1538counters pass; file-only wrapperfailure retained separately. Originalgate/timing outcomes are separately authenticated, notfresh reexecutions; currentpublicindexdelivery correctedwithoutsciencechange.'});print(json.dumps(read(OUT/'complete.json')))
