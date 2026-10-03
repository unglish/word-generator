import json
from pathlib import Path
import subprocess
import shutil
import time

node = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
arms = {'control': Path('/Users/ryanbetts/.codex/worktrees/linguistic-q10b2-control/word-generator'),
        'candidate': Path('/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator')}
out = Path('/private/tmp/q10b2-diagnostics-v1')
out.mkdir()
print('Waiting for captures, audits, repository gates and paired timing before original-size diagnostics.', flush=True)
while not Path('/private/tmp/q10b2-performance-v1/complete.json').exists():
    for path in ['/private/tmp/q10b2-audit-v2/failure.json', '/private/tmp/q10b2-audit-v2/capture-failure.json', '/private/tmp/q10b2-performance-v1/failure.json']:
        if Path(path).exists():raise RuntimeError('Prior measurement stage failed; diagnostics not started')
    time.sleep(15)
results = []
for arm, root in arms.items():
    commands = [
        ('compile', [node, str(root / 'node_modules/typescript/bin/tsc')]),
        ('trigrams', [node, 'scripts/analyze-cmu-trigrams.mjs']),
        ('trace', [node, 'scripts/trace-audit.mjs', '--out', str(out / f'trace-{arm}.json')]),
    ]
    for stage, args in commands:
        with (out / f'{stage}-{arm}.log').open('x') as log:
            result = subprocess.run(args, cwd=root, stdout=log, stderr=subprocess.STDOUT)
        if stage == 'trigrams':
            for suffix in ['json', 'md']:
                report = root / 'memory' / ('trigram-2m-analysis.' + suffix)
                if report.exists():
                    shutil.copyfile(report, out / ('trigrams-' + arm + '.' + suffix))
        record = dict(arm=arm, stage=stage, command=args, cwd=str(root), exitCode=result.returncode)
        results.append(record)
        (out / 'progress.json').write_text(json.dumps(results, indent=2) + '\n')
        print(json.dumps(record), flush=True)
        if stage == 'compile' and result.returncode:
            break
(out / 'complete.json').write_text(json.dumps(dict(results=results, scope='Existing diagnostic commands with their original default sample sizes and freshly compiled measured source. Nonzero outcomes retained.'), indent=2) + '\n')
