import hashlib
import json
from pathlib import Path
import subprocess
import time
ROOT=Path(__file__).resolve().parent
TOOL=ROOT/'recount-tools/recount.py'
OUT=Path('/private/tmp/q19-candidate-recount-driver-v1');OUT.mkdir()
before=hashlib.sha256(TOOL.read_bytes()).hexdigest()
(OUT/'tool-before.json').write_text(json.dumps({'sha256':before})+'\n')
archive=Path('/private/tmp/q19-candidate-capture-v1')
while not (archive/'complete.json').exists():
    if (archive/'failure.json').exists():raise RuntimeError('Candidate capture failed')
    time.sleep(10)
assert json.loads((archive/'complete.json').read_text())['passed']
assert hashlib.sha256(TOOL.read_bytes()).hexdigest()==before
with (OUT/'recount.log').open('x') as log:
    code=subprocess.call(['python3',str(TOOL),'candidate'],stdout=log,stderr=subprocess.STDOUT)
assert hashlib.sha256(TOOL.read_bytes()).hexdigest()==before
(OUT/'complete.json').write_text(json.dumps({'passed':code==0,'exitCode':code,'toolSha256':before})+'\n')
assert code==0
