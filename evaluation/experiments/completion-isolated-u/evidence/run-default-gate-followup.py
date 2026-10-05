import json,hashlib,subprocess,time
from pathlib import Path
b=Path('/private/tmp/q14a-completion-isolated-u-evidence-v1');r=Path('/private/tmp/q14a-completion-isolated-u-v1')
registration=json.loads((b/'default-gate-followup-registration.json').read_text());pins=json.loads((b/'source-pins.json').read_text())
def check():
 for name,pin in pins.items():
  data=(r/name).read_bytes();assert len(data)==pin['bytes'] and hashlib.sha256(data).hexdigest()==pin['sha256'],name
records=[]
for i,file in enumerate(registration['followupFiles']):
 check();command=['/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node',str(r/'node_modules/vitest/vitest.mjs'),'run',file,'--maxWorkers','1','--no-file-parallelism'];started=time.time();print('Starting '+file,flush=True)
 with (b/('followup-'+str(i)+'.log')).open('x') as log:result=subprocess.run(command,cwd=r,stdout=log,stderr=subprocess.STDOUT)
 check();records.append({'file':file,'command':command,'exitCode':result.returncode,'startedAt':started,'finishedAt':time.time(),'sourcePinsPreserved':True});(b/'default-gate-followup-results.json').write_text(json.dumps(records,indent=2)+'\n');print(file+' exit '+str(result.returncode),flush=True)
