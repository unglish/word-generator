from pathlib import Path
import hashlib,json
root=Path('/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator')
old=root/'evaluation/experiments/unit-normalization/tools'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
plan=(old/'q13c-performance-plan-v2.md').read_text().replace('Q13c','Q12c').replace('exact #331 (569adf516a7fa03a77124d3515c9e1a17a8f71ac)','exact #335 (ce3800dd3454feb33cdb32f8be96cf2fc684c4eb)').replace('frozen deduplication candidate','frozen phoneme-aware doubling candidate')
plan+='\n## Q12c reuse\n\nThis uses the previously tested Q13c runner without changing workload, parsing,\nslot order, gate policy or dependency verification. Only experiment paths,\nexternal authority hashes and labels change. The candidate source freeze is\nnew, but the generator bytes match the completed Q12c corpus capture. These\nperformance inputs are fixed before any Q12c timing is executed.\n'
p=Path('/private/tmp/q12c-performance-plan-v1.md');p.write_text(plan)
s=(old/'q13c-performance-series-v2.py').read_text()
replacements={
 '/private/tmp/q13c-performance-control-v1':'/private/tmp/q12c-performance-control-v1',
 '01e9b7ec18bbe4efff8320fa897dfa25671b37034684d5bfb63d8edb67dbe6bb':sha(Path('/private/tmp/q12c-performance-control-v1.json')),
 '/private/tmp/q13c-formal-parity-freeze-v1.json':'/private/tmp/q12c-performance-candidate-freeze-v1.json',
 'fee661104514e33487c95eaa948b0acb1d41e78b1fc956412e4228f1b49e820e':sha(Path('/private/tmp/q12c-performance-candidate-freeze-v1.json')),
 '/private/tmp/q13c-performance-plan-v2.md':str(p),
 '8d5c6f4d2d590d2891a5af41d68cf56748f214fea08e32496f9aa87c99915ab3':sha(p),
 '/private/tmp/q13c-unit-normalization-candidate-v1':'/private/tmp/q12c-phoneme-aware-doubling-candidate-v1',
 'q13c-performance-series-v2':'q12c-performance-series-v1'}
for a,b in replacements.items():
 assert a in s,a;s=s.replace(a,b)
runner=Path('/private/tmp/q12c-performance-series-v1.py');runner.write_text(s)
t=(old/'q13c-performance-series-test-v2.py').read_text().replace('/private/tmp/q13c-performance-series-v2.py',str(runner)).replace('q13c-perf-synthetic','q12c-perf-synthetic')
Path('/private/tmp/q12c-performance-series-test-v1.py').write_text(t)
review={'historicalRunnerSha256':sha(old/'q13c-performance-series-v2.py'),'runnerSha256':sha(runner),'replacements':replacements,'onlyListedReplacements':True,'planSha256':sha(p),'testSourceSha256':sha(Path('/private/tmp/q12c-performance-series-test-v1.py'))}
Path('/private/tmp/q12c-performance-runner-review-v1.json').write_text(json.dumps(review,indent=2)+'\n')
print(json.dumps(review,indent=2))
