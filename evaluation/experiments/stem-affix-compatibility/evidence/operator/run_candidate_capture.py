import hashlib
import json
from pathlib import Path
import subprocess
import time
base=Path(__file__).parent
tools=base/'capture-tools'
out=Path('/private/tmp/q18-capture-driver-v1');out.mkdir()
def pins():return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in tools.iterdir() if p.is_file()}
before=pins();(out/'tools-before.json').write_text(json.dumps(before,indent=2)+'\n')
print('Waiting for Q17 verification and Q18 omitted-policy parity; candidate capture has not started.',flush=True)
prerequisites=['/private/tmp/q17-independent-verification-v1/complete.json','/private/tmp/q18-omitted-parity-v1/complete.json']
failures=['/private/tmp/q17-independent-verification-v1/failure.json','/private/tmp/q17-independent-verification-v1/upstream-failure.json','/private/tmp/q18-parity-driver-v1/failure.json','/private/tmp/q18-parity-driver-v1/upstream-failure.json']
while not all(Path(p).exists() for p in prerequisites):
 for name in failures:
  if Path(name).exists():
   (out/'upstream-failure.json').write_text(json.dumps({'path':name})+'\n')
   raise RuntimeError('Prerequisite failed; candidate captures not started')
 time.sleep(15)
for path in prerequisites:assert json.loads(Path(path).read_text())['passed'] is True
assert pins()==before
node='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
loader='/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
root='/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator'
commit='11bdf6a90ed28e1aba09c40b3901c54c6308437f'
results=[]
commands=[('preflight',[node,'--test',str(tools/'preflight.test.mjs')])]
for policy in ['default','active']:
 commands.append((policy,[node,'--import',loader,str(tools/'freeze-capture.mjs'),root,'candidate',policy,commit,f'/private/tmp/q18-candidate-{policy}-v1']))
for stage,command in commands:
 with (out/(stage+'.log')).open('x') as log:process=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT)
 record=dict(stage=stage,command=command,exitCode=process.returncode);results.append(record)
 (out/'progress.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(record),flush=True)
 if process.returncode:
  (out/'failure.json').write_text(json.dumps(record,indent=2)+'\n')
  raise RuntimeError('Candidate preflight or capture failed; original output retained')
 if stage!='preflight':
  seal=json.loads(Path(f'/private/tmp/q18-candidate-{stage}-v1-freeze/complete.json').read_text())
  assert seal['passed'] is True and seal['words']==200000
assert pins()==before
(out/'complete.json').write_text(json.dumps(dict(passed=True,words=400000,results=results,tools=before,scope='Complete registered candidate captures with execution seals; independent category and provenance audits and baseline comparisons remain required.'),indent=2)+'\n')
