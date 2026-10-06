import hashlib,json,subprocess,time
from pathlib import Path
root=Path('/private/tmp/q14a-completion-joint-neighbor-v2');evidence=Path('/private/tmp/q14a-completion-joint-neighbor-evidence-v2')
node='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
pins=json.loads((evidence/'source-pins.json').read_text())
def check():
    for name,pin in pins.items():
        data=(root/name).read_bytes()
        assert len(data)==pin['bytes'] and hashlib.sha256(data).hexdigest()==pin['sha256']
commands=[('default-tests',root,[node,str(root/'node_modules/vitest/vitest.mjs'),'run','--maxWorkers','1','--no-file-parallelism']),
          ('quality-tests',evidence/'quality',[node,str(root/'node_modules/vitest/vitest.mjs'),'run','--config','vitest.config.mjs'])]
records=[]
for name,cwd,command in commands:
    check();started=time.time()
    with (evidence/(name+'.log')).open('x') as log:
        result=subprocess.run(command,cwd=cwd,stdout=log,stderr=subprocess.STDOUT)
    check();records.append(dict(name=name,command=command,cwd=str(cwd),exitCode=result.returncode,startedAt=started,finishedAt=time.time(),sourcePinsPreserved=True))
    (evidence/'original-gates.json').write_text(json.dumps(records,indent=2)+'\n')
    print(name,result.returncode,flush=True)
