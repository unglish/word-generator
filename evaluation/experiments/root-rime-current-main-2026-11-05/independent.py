import gzip,json,sys,hashlib,pathlib
root=pathlib.Path(sys.argv[1]); report=json.load(open(sys.argv[2])); m=json.load(open(root/'manifest.json'))['manifest']
assert report['manifest']==m
rules=m['generator']['effectiveConfig']['codaConstraints']['bannedNucleusCodaCombinations']
banned={(n,c) for r in rules for n in r['nucleus'] for c in r['coda']}
for a in m['artifacts']:
 p=root/a['file']; assert p.stat().st_size==a['bytes']; assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256']
results={}
for profile in m['protocol']['profiles']:
 counts={}; words=0
 for seed in profile['seeds'][m['cohort']]:
  with gzip.open(root/f"words/{profile['id']}-{seed}.jsonl.gz",'rt') as f:
   for i,line in enumerate(f):
    d=json.loads(line); assert (d['profile'],d['seed'],d['drawIndex'])==(profile['id'],seed,i);words+=1
    stages={s['name']:s for s in d['word']['trace']['stages']}
    for key,stage,side in [('sampled','generateSyllables','after'),('structural','applyStress','before'),('rootStress','repairStressedNuclei','after'),('rootEdge','repairNucleusWordPositions','after'),('preparedRoot','generateWrittenForm','before')]:
     c=counts.setdefault(key,dict(pairs=0,violations=0,words=0));hits=0
     for syllable in stages[stage][side]:
      for n in syllable['nucleus']:
       for co in syllable['coda']:
        c['pairs']+=1
        if (n,co) in banned: hits+=1
     c['violations']+=hits;c['words']+=bool(hits)
  assert i+1==m['protocol']['wordsPerReplicate']
 assert counts==report['profiles'][profile['id']]['layers']
 assert words==report['profiles'][profile['id']]['words']
 results[profile['id']]=dict(words=words,layers=counts)
print(json.dumps(results,indent=2))
