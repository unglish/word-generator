import hashlib
import json
from pathlib import Path
import subprocess
import time
base=Path(__file__).parent
tools=base/'audit-tools'
out=Path('/private/tmp/q18-audit-driver-v1');out.mkdir()
def pins():return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in tools.iterdir() if p.is_file()}
before=pins();(out/'tools-before.json').write_text(json.dumps(before,indent=2)+'\n')
print('Waiting for both registered Q18 captures; trace parity and corpus audits have not started.',flush=True)
while not Path('/private/tmp/q18-capture-driver-v1/complete.json').exists():
 for name in ['/private/tmp/q18-capture-driver-v1/failure.json','/private/tmp/q18-capture-driver-v1/upstream-failure.json']:
  if Path(name).exists():
   (out/'upstream-failure.json').write_text(json.dumps({'path':name})+'\n')
   raise RuntimeError('Capture prerequisite failed; audits not started')
 time.sleep(15)
assert json.loads(Path('/private/tmp/q18-capture-driver-v1/complete.json').read_text())['words']==400000
assert pins()==before
node='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
loader='/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'
profile='/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator/evaluation/experiments/stem-affix-compatibility/experimental-profile.json'
commands=[('independent-fixtures',['python3',str(tools/'test_category_recount.py')]),
 ('trace-plain-parity',[node,'--import',loader,str(tools/'trace-plain-parity.mjs')])]
for policy in ['default','active']:
 archive=f'/private/tmp/q18-candidate-{policy}-v1'
 commands.append((policy+'-public-replay',[node,'--import',loader,str(tools/'replay-archive.mjs'),archive,str(out/(policy+'-public-replay.json'))]))
 commands.append((policy+'-independent',['python3',str(tools/'recount_archive.py'),archive,profile,str(out/(policy+'-independent.json'))]))
results=[]
for stage,command in commands:
 assert pins()==before
 with (out/(stage+'.log')).open('x') as log:process=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT)
 record=dict(stage=stage,command=command,exitCode=process.returncode);results.append(record)
 (out/'progress.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(record),flush=True)
 if process.returncode:
  (out/'failure.json').write_text(json.dumps(record,indent=2)+'\n')
  raise RuntimeError('Q18 audit failed; all original evidence retained')
assert pins()==before
for policy in ['default','active']:
 for stage in ['public-replay','independent']:
  report=json.loads((out/(policy+'-'+stage+'.json')).read_text());assert report['passed'] is True
  assert (report['words'] if stage=='public-replay' else report['counts']['words'])==200000
parity=json.loads(Path('/private/tmp/q18-trace-plain-parity-v1/complete.json').read_text());assert parity['passed'] is True and parity['comparisons']==10000 and parity['probes']==40
(out/'complete.json').write_text(json.dumps(dict(passed=True,corpusWords=400000,tracePlainComparisons=10000,results=results,tools=before,scope='All registered candidate records public-API replayed and independently category/lineage reconstructed. Baseline evaluator comparisons, unchanged gates, performance and publication remain.'),indent=2)+'\n')
