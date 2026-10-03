import hashlib
import json
from pathlib import Path
import subprocess
import sys

BASE=Path(__file__).resolve().parent
TOOLS=BASE/'tools'
OUT=Path('/private/tmp/q20-independent-operator-checks-v2')
OUT.mkdir()
def pins():
 return {p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(TOOLS.iterdir()) if p.is_file()}
before=pins()
(OUT/'before.json').write_text(json.dumps(before,indent=2)+'\n')
with (OUT/'tests.log').open('x') as log:
 process=subprocess.run([sys.executable,'-B','-m','unittest','discover','-s',str(TOOLS),'-p','test_*.py'],stdout=log,stderr=subprocess.STDOUT)
assert process.returncode==0
assert pins()==before
assert 'Ran 18 tests' in (OUT/'tests.log').read_text()
assert (TOOLS/'test_independent_model.py').read_bytes()==(BASE.parent/'full-audit-tools/test_independent_model.py').read_bytes()
(OUT/'complete.json').write_text(json.dumps({'passed':True,'tests':18,'tools':before,'exitCode':0,'before':before,'after':pins(),
 'scope':'Original 12 closed-form/corruption checks unchanged plus six authentic gap override/ancestry/corruption regressions. No corpus or human substitute.'},indent=2)+'\n')
print('All 18 unchanged-original-plus-gap independent tests pass; source unchanged.')
