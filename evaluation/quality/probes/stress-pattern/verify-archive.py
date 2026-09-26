import gzip, hashlib, json, re, subprocess, sys
from pathlib import Path

run, checkout, output = map(Path, sys.argv[1:])
def sha(data): return hashlib.sha256(data).hexdigest()
def digest(value): return sha(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode())
def git(*args): return subprocess.check_output(['git', *args], cwd=checkout)
envelope=json.loads((run/'manifest.json').read_text()); manifest=envelope['manifest']
# The foundation verifier checks its JavaScript canonical manifest digest.
# This independent pass pins the same manifest bytes and checks source/artifacts/draws.
manifest_file_sha=sha((run/'manifest.json').read_bytes())
artifacts=manifest['artifacts']; byname={a['file']:a for a in artifacts}
assert len(byname)==len(artifacts), 'Duplicate artifact path'
for name, item in byname.items():
    data=(run/name).read_bytes()
    assert len(data)==item['bytes'] and sha(data)==item['sha256'], name
sources=json.loads(gzip.decompress((run/'sources.json.gz').read_bytes()))
summary=json.loads((run/'summary.json').read_text())
assert digest(sources['generator'])==manifest['generator']['sourceDigest']
assert digest(sources['references'])==manifest['referenceDigest']
assert digest({'files':sources['evaluator'],'definitions':summary['definitions']})==manifest['evaluatorDigest']
assert manifest['evaluatorDigest']=='ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007'
assert digest(manifest['protocol'])==manifest['protocolDigest']
reference=manifest['generator']['commit']
pinned=[p for p in git('ls-tree','--name-only','-r',reference,'--','src').decode().splitlines() if re.search(r'\.(ts|js|mjs|json)$',p) and not re.search(r'\.(test|bench)\.',p)]
assert sorted(pinned)==sorted(f['path'] for f in sources['generator'])
for group in ['generator','packageFiles']:
    assert len({f['path'] for f in sources[group]})==len(sources[group])
    for f in sources[group]: assert git('show',reference+':'+f['path']).decode()==f['content'], f['path']
protocol=manifest['protocol']; cohort=manifest['cohort']; draws=protocol['wordsPerReplicate']
expected=[f"words/{p['id']}-{s}.jsonl.gz" for p in protocol['profiles'] for s in p['seeds'][cohort]]
assert sorted(expected)==sorted(n for n in byname if n.startswith('words/'))
assert sorted(expected)==sorted(str(p.relative_to(run)) for p in (run/'words').iterdir())
assert [p['id'] for p in summary['profiles']]==[p['id'] for p in protocol['profiles']]
counts=[]
for p, observed in zip(protocol['profiles'],summary['profiles']):
    assert [r['seed'] for r in observed['replicates']]==p['seeds'][cohort]
    assert observed['words']==draws*len(p['seeds'][cohort])
    for seed, replicate in zip(p['seeds'][cohort],observed['replicates']):
        assert replicate['words']==draws
        count=0
        with gzip.open(run/f"words/{p['id']}-{seed}.jsonl.gz",'rt') as stream:
            for index,line in enumerate(stream):
                record=json.loads(line)
                assert (record['profile'],record['seed'],record['drawIndex'])==(p['id'],seed,index)
                assert isinstance(record['word']['lexical']['root'],list)
                assert isinstance(record['word']['trace'],dict)
                count+=1
        assert count==draws
        counts.append({'profile':p['id'],'seed':seed,'draws':count})
report={'result':'pass','manifestDigest':envelope['digest'],'manifestFileSha256':manifest_file_sha,'generator':manifest['generator']['sourceDigest'],'commit':reference,'evaluator':manifest['evaluatorDigest'],'sourceFiles':len(sources['generator']),'verifiedDraws':sum(r['draws'] for r in counts),'shards':counts}
with output.open('x') as f: json.dump(report,f,indent=2);f.write('\n')
print(json.dumps({k:v for k,v in report.items() if k!='shards'}))
