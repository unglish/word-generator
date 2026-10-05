"""Retain every production counter and event stratum; independent proofs stay separate."""
import hashlib
import json
from pathlib import Path
base = Path('/private/tmp/q14a-completion-prefix-context-evidence-v1/candidate-analysis')
candidate = Path('/private/tmp/q14a-completion-isolated-u-evidence-v1/candidate-analysis')
out = Path('/private/tmp/q14a-completion-isolated-u-evidence-v1/structure-comparison.json')

def authenticated(directory):
    complete = json.loads((directory / 'complete.json').read_text())
    for artifact in complete['artifacts']:
        data = (directory / artifact['file']).read_bytes()
        assert len(data) == artifact['bytes'] and hashlib.sha256(data).hexdigest() == artifact['sha256']
    report = json.loads((directory / 'report.json').read_text())
    assert report['words'] == 200000
    return report

def difference(old, new):
    keys = sorted(set(old) | set(new))
    return {key:dict(control=old.get(key), candidate=new.get(key),
                     change=new[key]-old[key] if key in old and key in new else None) for key in keys}

a,b = authenticated(base),authenticated(candidate)
x = {json.dumps(group['dimensions'],ensure_ascii=False):group for group in a['groups']}
y = {json.dumps(group['dimensions'],ensure_ascii=False):group for group in b['groups']}
rows=[]
for key in sorted(set(x)|set(y)):
    old,new=x.get(key),y.get(key)
    rows.append(dict(dimensions=json.loads(key),controlPresent=old is not None,candidatePresent=new is not None,
                     counts=difference(old['counts'] if old else {},new['counts'] if new else {}),
                     events=difference(old['eventCounts'] if old else {},new['eventCounts'] if new else {})))
out.write_text(json.dumps(dict(wordsPerArm=200000,groups=rows,
                              scope='All authenticated production counters and strata. Missing groups are null, not observed zero. Continuous RNG streams are distribution comparisons, not causal paired words.'),indent=2)+'\n')
print('Full structural counter comparison retained',len(rows),'groups')
