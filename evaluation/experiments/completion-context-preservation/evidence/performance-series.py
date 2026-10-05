import hashlib,json,statistics,subprocess
from pathlib import Path
b=Path('/private/tmp/q14a-completion-context-evidence-v1');binding=json.loads((b/'performance-binding.json').read_text());capture=json.loads((b/'capture-complete.json').read_text())
assert capture['passed'] and capture['words']==200000
manifest=json.loads((b/'candidate-archive/manifest.json').read_text())['manifest']
assert manifest['protocol']['wordsPerReplicate']==10000
assert sum(len(p['seeds']['development']) for p in manifest['protocol']['profiles'])==20
for artifact in manifest['artifacts']:
 data=(b/'candidate-archive'/artifact['file']).read_bytes();assert len(data)==artifact['bytes'] and hashlib.sha256(data).hexdigest()==artifact['sha256']
assert hashlib.sha256((b/'measured-configuration.json').read_bytes()).hexdigest()==binding['measuredConfigurationSha256']
assert json.loads((b/'concurrent-workloads-terminal.json').read_text())['allKnownCompetingWorkloadsTerminal']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
runner=b/'performance-one.mjs';assert sha(runner)==binding['runnerSha256']
roots={'A':Path(binding['control']),'B':Path(binding['candidate'])}
expected={variant:{str(p.relative_to(root/'src')):{'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted((root/'src').rglob('*')) if p.is_file()} for variant,root in roots.items()}
assert expected['B']=={name.removeprefix('src/'):pin for name,pin in json.loads((b/'source-pins.json').read_text()).items()}
benchmark=roots['B']/'evaluation/experiments/split-digraphs/performance-one-v2.mjs';benchmark_sha=sha(benchmark)
out=b/'performance';out.mkdir();records=[]
for index,variant in enumerate(binding['order']):
 dest=out/f'{index+1:02d}-{variant}.json';cmd=['/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node','--import','/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs',str(runner),str(roots[variant]),variant,str(dest)]
 with (out/f'{index+1:02d}-{variant}.log').open('x') as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
 r=json.loads(dest.read_text());assert r['source']==expected[variant]
 if records:
  assert r['environment']==records[0]['environment'] and r['executableSha256']==records[0]['executableSha256']
 assert r['sampleSize']==10000 and len(r['trials'])==3 and all(len(t['batches'])==5 for t in r['trials'])
 same_arm=[previous for previous in records if previous['variant']==variant]
 if records: assert r['configuration']==records[0]['configuration']
 records.append(r);print(json.dumps({'slot':index+1,'variant':variant,'wordsPerSec':r['wordsPerSec'],'speedPass':r['speedPass'],'variancePass':r['variancePass']}),flush=True)
assert sha(runner)==binding['runnerSha256'] and sha(benchmark)==benchmark_sha
pairs=[]
for i in range(0,12,2):
 pair={r['variant']:r for r in records[i:i+2]};pairs.append((pair['B']['wordsPerSec']/pair['A']['wordsPerSec']-1)*100)
report={'order':binding['order'],'pairedPercentChanges':pairs,'medianPairedPercentChange':statistics.median(pairs),'gates':{v:{g:sum(r[g] for r in records if r['variant']==v) for g in ['speedPass','variancePass']} for v in ['A','B']},'runnerSha256':sha(runner),'originalBenchmarkSha256':benchmark_sha,'scope':'Preregistered completion opaque-context preservation intervention, original workload and gates; no inferred human-quality improvement.'}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
