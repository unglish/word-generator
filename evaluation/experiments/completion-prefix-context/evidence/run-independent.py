import hashlib,json,subprocess,sys
from pathlib import Path
root=Path('/private/tmp/q14a-completion-prefix-context-v1');b=Path('/private/tmp/q14a-completion-prefix-context-evidence-v1')
archive=b/'candidate-archive';analysis=b/'candidate-analysis';tools=root/'evaluation/experiments/split-digraphs'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
pins={p.name:sha(p) for p in tools.glob('recount_*.py')}
command=[sys.executable,'-B',str(tools/'recount_archive.py'),'--archive',str(archive),'--analysis',str(analysis),'--manifest-sha256',sha(archive/'manifest.json'),'--analysis-sha256',sha(analysis/'complete.json'),'--out',str(b/'independent-recount.json')]
with (b/'independent-recount.log').open('x') as log:
 result=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT)
assert pins=={p.name:sha(p) for p in tools.glob('recount_*.py')}
(b/'independent-execution.json').write_text(json.dumps({'command':command,'exitCode':result.returncode,'toolPinsBeforeAndAfter':pins,'scope':'Original independent full-corpus count and structure reconstruction. Production verifier authenticates reading licenses; no human-quality inference.'},indent=2)+'\n')
raise SystemExit(result.returncode)
