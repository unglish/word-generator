from pathlib import Path
import hashlib,json
root=Path('/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator')
old=root/'evaluation/experiments/phoneme-aware-doubling/performance'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
plan=(old/'q12c-performance-plan-v1.md').read_text().replace('Q12c','Q13b').replace('exact #335 (ce3800dd3454feb33cdb32f8be96cf2fc684c4eb)','exact #338 (b2373ca83cdbf5e8ad127b604e83397a8afe0d45)').replace('phoneme-aware doubling candidate','aligned shared-spelling candidate')
plan+='\n## Q13b execution prerequisite\n\nThis is preparation only. The full candidate capture must finish and every\ncaptured generator byte must match this performance freeze before timing starts.\nRun no controlled corpus scan concurrently with timing. The active user goal\nauthorizes the registered comparisons; historical parent-approval wording above\ndescribes the reused runner history and does not start any benchmark.\n'
p=Path('/private/tmp/q13b-performance-plan-v1.md')
with p.open('x') as f:f.write(plan)
s=(old/'q12c-performance-series-v1.py').read_text()
replacements={
 '/private/tmp/q12c-performance-control-v1':'/private/tmp/q13b-performance-control-v1',
 '3b473580f13cc736a42c9f77437f615c61ff1b91bcdd25914dd50f5ffda32e31':sha(Path('/private/tmp/q13b-performance-control-v1.json')),
 '/private/tmp/q12c-performance-candidate-freeze-v1.json':'/private/tmp/q13b-performance-candidate-freeze-v1.json',
 '26bc35d55c633140b576b14b035228ea3ba246fd2d5223cf4b6c388dad7a453c':sha(Path('/private/tmp/q13b-performance-candidate-freeze-v1.json')),
 '/private/tmp/q12c-performance-plan-v1.md':str(p),
 'd76d2d6110468f39851f9f79d967bdc0cf2302fba276651b833318e3ac22c4f8':sha(p),
 '/private/tmp/q12c-phoneme-aware-doubling-candidate-v1':'/private/tmp/q13b-aligned-shared-graphemes-candidate-v1',
 'q12c-performance-series-v1':'q13b-performance-series-v1'}
for a,b in replacements.items():
 assert a in s,a;s=s.replace(a,b)
runner=Path('/private/tmp/q13b-performance-series-v1.py')
with runner.open('x') as f:f.write(s)
t=(old/'q12c-performance-series-test-v1.py').read_text().replace('/private/tmp/q12c-performance-series-v1.py',str(runner)).replace('q12c-perf-synthetic','q13b-perf-synthetic')
test=Path('/private/tmp/q13b-performance-series-test-v1.py')
with test.open('x') as f:f.write(t)
review={'historicalRunnerSha256':sha(old/'q12c-performance-series-v1.py'),'runnerSha256':sha(runner),'replacements':replacements,'onlyListedReplacements':True,'planSha256':sha(p),'testSourceSha256':sha(test),'actualTimingStarted':False}
with Path('/private/tmp/q13b-performance-runner-review-v1.json').open('x') as f:json.dump(review,f,indent=2);f.write('\n')
print(json.dumps(review,indent=2))
