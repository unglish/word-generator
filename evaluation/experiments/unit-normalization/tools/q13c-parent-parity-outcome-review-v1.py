import hashlib,json,subprocess
from pathlib import Path
ROOT=Path('/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator')
BASE='569adf516a7fa03a77124d3515c9e1a17a8f71ac'
CONTROL=Path('/private/tmp/q13-normalization-control-569adf5-v1')
FREEZE=Path('/private/tmp/q13c-formal-parity-freeze-v1.json')
REPORT=Path('/private/tmp/q13c-formal-parity-result-v1.json')
INPUT=Path(str(REPORT)+'.inputs.json')
LOG=Path('/private/tmp/q13c-formal-parity-run-v1.log')
sha=lambda b:hashlib.sha256(b).hexdigest()
f=json.loads(FREEZE.read_bytes());r=json.loads(REPORT.read_bytes());i=json.loads(INPUT.read_bytes())
assert sha(FREEZE.read_bytes())=='fee661104514e33487c95eaa948b0acb1d41e78b1fc956412e4228f1b49e820e'
assert r['inputsSha256']==sha(INPUT.read_bytes())
assert i['analyzerFreezeSha256']==sha(FREEZE.read_bytes()) and i['baseCommit']==BASE
assert r['passed'] and r['generationPassed'] and r['sourceIntegrityPassed']
assert r['error'] is None and r['integrityError'] is None
assert (r['scheduledGenerationCalls'],r['omittedPolicyCalls'],r['activeTraceParityCalls'],r['supplementalMutationCalls'],r['coordinates'])==(120000,80000,40000,8,20000)
expected=[(p['id'],s) for p in i['schedule']['profiles'] for s in p['seeds']['development']]
assert len(expected)==len(set(expected))==20
assert [(s['profile'],s['seed']) for s in r['streams']]==expected
for stream in r['streams']:
 assert stream['coordinates']==1000
 paths=stream['paths']
 assert [p['name'] for p in paths]==['control-omitted','candidate-omitted','candidate-preserve-phones']
 for p in paths:
  assert [m['trace'] for m in p['modes']]==[False,True]
  assert p['modes'][0]['rng']==p['modes'][1]['rng']
  for mode in p['modes']:
   assert mode['rng']['sourceCalls']==mode['rng']['calls']+1
   assert len(mode['wordBytesSha256'])==len(mode['rng']['consumedBytesSha256'])==64
 for mode in (0,1):
  assert paths[0]['modes'][mode]==paths[1]['modes'][mode]
assert r['mutationChecks']['compatibilityPassed'] is True
assert r['mutationChecks']['returnedValueIsolation'] is False
for key in ('afterReturnedMutation','beforeConfigurationMutation','afterConfigurationMutation'):
 a,b=r['mutationChecks'][key]
 assert a==b
assert all(x['status']=='threw' and '/mutated/' in x['error']['message'] for x in r['mutationChecks']['afterReturnedMutation'])
for pin in f['files']:
 p=ROOT/pin['file'];assert p.is_file() and not p.is_symlink()
 data=p.read_bytes();assert len(data)==pin['bytes'] and sha(data)==pin['sha256'],str(p)
for pin in f['preparation']:
 data=(ROOT/'evaluation/quality/probes/unit-normalization'/pin['file']).read_bytes()
 assert len(data)==pin['bytes'] and sha(data)==pin['sha256']
for pin in i['controlSources']:
 path=pin['path'];data=(CONTROL/path).read_bytes()
 original=subprocess.check_output(['git','show',BASE+':'+path],cwd=ROOT)
 assert data==original and len(data)==pin['bytes'] and sha(data)==pin['sha256']
assert sha(Path(f['executable']['path']).read_bytes())==f['executable']['sha256']
result={'schema':'q13c-parent-parity-outcome-review-v1','passed':True,'scope':'Independent report/stream/source reconciliation; full per-boundary live comparisons were executed by reviewed Node harness, not repeated generation',
 'files':[{'path':str(p),'sha256':sha(p.read_bytes())} for p in (FREEZE,INPUT,REPORT,LOG,Path(__file__))],
 'streams':20,'coordinates':20000,'scheduledPublicCalls':120000,'supplementalMutationCalls':8,
 'sourceFilesVerified':len(f['files']),'historicalPreparationPinsVerified':len(f['preparation']),'controlFilesVerifiedAgainstGit':len(i['controlSources']),
 'omittedPolicyCompatibility':True,'activeTraceOnOffParity':True,'returnedValueIsolation':False,
 'limitations':['Not active/control equality','No arbitrary custom configuration guarantee','Inherited returned-value aliasing persists','Not output-quality, structural recount, or performance evidence']}
out=Path('/private/tmp/q13c-parent-parity-outcome-review-v1.json')
with out.open('x') as fd:json.dump(result,fd,indent=2);fd.write('\n')
print(json.dumps({'passed':True,'report':str(out),'sha256':sha(out.read_bytes()),'evidence':result['files'][:4]}))
