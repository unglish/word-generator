import json,gzip,hashlib,sys
from pathlib import Path
b=Path('/private/tmp/q13b-closure-audit-v1')
arm=sys.argv[1]
e=b/'committed/evaluation/experiments/aligned-shared-graphemes'
a=json.loads(gzip.decompress((e/f'{arm}-measurement/report.json.gz').read_bytes()))
p=b/f'{arm}-production-renewed'
n=json.loads((p/'report.json').read_bytes())
assert n['authoritySha256']==hashlib.sha256((p/'authority.json').read_bytes()).hexdigest()
for x in (a,n):x.pop('authoritySha256')
assert a==n
(b/f'{arm}-production-correspondence.json').write_text(json.dumps({'passed':True,'arm':arm,'words':n['words'],'groups':len(n['groups']),'witnesses':len(n['witnesses']),'comparison':'Entire original report matches except freshly verified authority hash','scope':'Original production observer on authenticated raw corpus; relocated current authority, not historical host/dependency certification.'},indent=2)+'\n')
print(arm,'entire original report matches')
