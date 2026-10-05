"""Fixed six-pair series; run after corpus verification/recounts finish."""
import hashlib
import json
from pathlib import Path
import statistics
import subprocess

ROOT=Path('/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator')
RUNNER=Path('/private/tmp/q14b-performance-one-v1.mjs')
OUT=Path('/private/tmp/q14b-performance-v1')
NODE='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
ORDER=['A','B','B','A','A','B','B','A','A','B','B','A']

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

capture=json.loads(Path('/private/tmp/q14b-following-letters-candidate-v1-freeze/complete.json').read_text())
analysis=json.loads(Path('/private/tmp/q14b-candidate-analysis-v1/complete.json').read_text())
independent=json.loads(Path('/private/tmp/q14b-candidate-independent-v1.json').read_text())
for result in [capture,analysis,independent]:
    assert result['passed'] is True and result['words']==200000
runner_sha=sha(RUNNER)
OUT.mkdir()
records=[]
for index,variant in enumerate(ORDER,1):
    assert sha(RUNNER)==runner_sha
    destination=OUT/f'{index:02d}-{variant}.json'
    with (OUT/f'{index:02d}-{variant}.log').open('x') as log:
        subprocess.run([NODE,'--import','tsx',str(RUNNER),variant,str(destination)],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,check=True)
    record=json.loads(destination.read_text())
    assert record['variant']==variant
    if records:
        assert record['environment']==records[0]['environment']
        assert record['executableSha256']==records[0]['executableSha256']
        assert record['registrationSha256']==records[0]['registrationSha256']
    records.append(record)
    print(json.dumps({'slot':index,'variant':variant,'wordsPerSec':record['wordsPerSec']}),flush=True)
changes=[]
for offset in range(0,12,2):
    pair={record['variant']:record for record in records[offset:offset+2]}
    changes.append((pair['B']['wordsPerSec']/pair['A']['wordsPerSec']-1)*100)
report={'order':ORDER,'runnerSha256':runner_sha,'pairedPercentChanges':changes,'medianPairedPercentChange':statistics.median(changes),'gates':{variant:{gate:sum(record[gate] for record in records if record['variant']==variant) for gate in ['speedPass','variancePass']} for variant in ['A','B']}}
assert sha(RUNNER)==runner_sha
with (OUT/'report.json').open('x') as stream:json.dump(report,stream,indent=2)
print(json.dumps(report),flush=True)
