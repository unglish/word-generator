"""Run the pinned independent recount for both completed Q13b reports."""
from pathlib import Path
import hashlib,json,subprocess,sys
root=Path('/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator')
for variant in ('control','candidate'):
    options=json.loads(Path(f'/private/tmp/q13b-{variant}-analysis-inputs-v1.json').read_text())
    report=Path(options['out'])/'report.json'
    arguments={
        'archive':options['archive'],'manifest-sha256':options['manifest-sha256'],
        'report':str(report),'report-sha256':hashlib.sha256(report.read_bytes()).hexdigest(),
        'protocol':options['protocol'],'protocol-sha256':options['protocol-sha256'],
        'registration':options['registration'],'registration-sha256':options['registration-sha256'],
        'source-root':str(root),'out':f'/private/tmp/q13b-{variant}-independent-v1.json'}
    with Path(f'/private/tmp/q13b-{variant}-independent-inputs-v1.json').open('x') as target:
        json.dump(arguments,target,indent=2);target.write('\n')
    command=[sys.executable,str(root/'evaluation/experiments/aligned-shared-graphemes/recount-corpus.py')]
    for name,value in arguments.items():command.extend(['--'+name,value])
    print('Recounting '+variant,flush=True)
    subprocess.run(command,check=True)
    result=json.loads(Path(arguments['out']).read_text())
    print(json.dumps({'variant':variant,**{k:result[k] for k in ('passed','words','groups','integerComparisons','fullWitnesses')}}),flush=True)
