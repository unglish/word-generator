import hashlib,json,subprocess,time,sys
from pathlib import Path
b=Path('/private/tmp/q14a-completion-isolated-u-evidence-v1');r=Path('/private/tmp/q14a-completion-isolated-u-v1')
node='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node';loader='/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
capture=json.loads((b/'capture-complete.json').read_text());assert capture['passed'] and capture['words']==200000
closure=json.loads((b/'capture-before.json').read_text())
operatorBinding=json.loads((b/'verification-chain-binding.json').read_text())
validation=json.loads((b/'checkpoint-validation-v2/result.json').read_text());assert validation['passed'] and validation['operatorSha256']==hashlib.sha256((b/'analyze-split-resumable.mjs').read_bytes()).hexdigest()
pins=json.loads((b/'source-pins.json').read_text())
def check():
 assert json.loads((b/'measured-configuration.json').read_text())==closure['configuration']['splitVowels']
 for item in operatorBinding['operators']:
  data=(b/item['file']).read_bytes();assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256'],item['file']
 for name,pin in closure['sources'].items():
  data=(r/name).read_bytes();assert len(data)==pin['bytes'] and hashlib.sha256(data).hexdigest()==pin['sha256'],name
 for name,pin in pins.items():
  data=(r/name).read_bytes();assert len(data)==pin['bytes'] and hashlib.sha256(data).hexdigest()==pin['sha256']
steps=[('production',[node,'--import',loader,str(b/'analyze-candidate.mjs')],True),
 ('independent',[sys.executable,'-B',str(b/'run-independent.py')],True),
 ('opaque-context',[sys.executable,'-B',str(b/'audit-opaque-context.py')],True),
 ('written-boundary',[sys.executable,'-B',str(b/'audit-written-boundary.py')],True),
 ('raw-causes',[sys.executable,'-B',str(b/'classify-completion-gaps.py')],True),
 ('structure-comparison',[sys.executable,'-B',str(b/'compare-structure.py')],True),
 ('distribution-comparison',[node,'--import',loader,str(b/'compare-quality.mjs')],True),
 ('legacy-parity',[node,'--import',loader,str(b/'legacy-parity-runner.mjs')],True),
 ('original-gates',[sys.executable,'-B',str(b/'run-original-gates.py')],False),
 ('trace-audit',[node,'--import',loader,str(b/'trace-audit/candidate-trace-audit.mjs'),'--count','50000','--seed','42','--mode','lexicon','--morphology','true','--out',str(b/'trace-audit/candidate-report.json'),'--quiet'],False),
 ('full-lint',[node,str(r/'node_modules/eslint/bin/eslint.js'),'src/**/*.ts','evaluation/review/**/*.ts','demo/review/**/*.ts'],False)]
records=json.loads((b/"measurement-chain.json").read_text())
assert records[-1]["name"]=="legacy-parity" and records[-1]["exitCode"]==1
steps=steps[7:]
for name,command,required in steps:
 check();print('Starting '+name,flush=True);started=time.time()
 with (b/('chain-resumed-'+name+'.log')).open('x') as log:result=subprocess.run(command,cwd=r,stdout=log,stderr=subprocess.STDOUT)
 check();records.append({'name':name,'command':command,'exitCode':result.returncode,'startedAt':started,'finishedAt':time.time(),'sourcePinsPreserved':True})
 (b/'measurement-chain.json').write_text(json.dumps(records,indent=2)+'\n');print(name+' exit '+str(result.returncode),flush=True)
 if required and result.returncode:raise SystemExit(result.returncode)
