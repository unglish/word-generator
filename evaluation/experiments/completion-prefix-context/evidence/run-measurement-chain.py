import hashlib,json,subprocess,time,sys
from pathlib import Path
b=Path('/private/tmp/q14a-completion-prefix-context-evidence-v1');r=Path('/private/tmp/q14a-completion-prefix-context-v1')
node='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node';loader='/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
assert json.loads((b/'capture-complete.json').read_text())['passed']
pins=json.loads((b/'source-pins.json').read_text())
def check():
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
records=[]
for name,command,required in steps:
 check();print('Starting '+name,flush=True);started=time.time()
 with (b/('chain-'+name+'.log')).open('x') as log:result=subprocess.run(command,cwd=r,stdout=log,stderr=subprocess.STDOUT)
 check();records.append({'name':name,'command':command,'exitCode':result.returncode,'startedAt':started,'finishedAt':time.time(),'sourcePinsPreserved':True})
 (b/'measurement-chain.json').write_text(json.dumps(records,indent=2)+'\n');print(name+' exit '+str(result.returncode),flush=True)
 if required and result.returncode:raise SystemExit(result.returncode)
