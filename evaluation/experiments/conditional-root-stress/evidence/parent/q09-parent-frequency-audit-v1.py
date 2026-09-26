import gzip, hashlib, json, math, struct
from collections import Counter
from fractions import Fraction
from pathlib import Path
T=Path('/private/tmp')
R=Path('/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(n): return json.loads((T/n).read_bytes())
review=read('q09-sampler-run-review-v1.json')
for a in review['artifacts']:
 p=Path(a['path']); assert p.stat().st_size==a['bytes'] and sha(p)==a['sha256'],p
freeze=read('q09-sampler-source-freeze-v1.json')
assert len(freeze['sources'])==116
for p,h in freeze['sources'].items(): assert sha(R/p)==h,p
v=read('q09-sampler-frequency-verification-v1.json')
s=read('q09-sampler-frequency-capture-v1.summary.json')
ref=read('q09-sampler-independent-reference-v1.json')
protocol=json.loads((R/'evaluation/experiments/conditional-root-stress/sampler/protocol.json').read_text())
assert sha(T/'q09-sampler-frequency-verification-v1.json')=='9743c6296a00b42112d82abc98fe1b8d309dbf754981e2ae14b792253d7f8881'
assert v['passed'] is True and v['structuralChecksPassed'] is True
for k in ['sourceFreezeSha256','protocolSha256','referenceSha256','engine','tapeManifestSha256','tapeSha256']:
 assert v[k]==s[k]
for k in ['sourceFreezeSha256','protocolSha256','engine']: assert v[k]==ref[k]
assert v['captureSha256']==sha(T/'q09-sampler-frequency-capture-v1.summary.json')
assert v['archiveSha256']==s['archive']['sha256']==sha(T/'q09-sampler-frequency-capture-v1.jsonl.gz')
assert v['recount']=={k:s[k] for k in ['blocks','cases','primaryFrequencyDraws']}
tape=(T/'q09-sampler-frequency-tape-v1.bin').read_bytes()
assert hashlib.sha256(tape).hexdigest()==v['tapeSha256'] and len(tape)==36000000
counts={}; consumed=Counter(); digests={}; witnesses={}; total=0
with gzip.open(T/'q09-sampler-frequency-capture-v1.jsonl.gz','rb') as lines:
 header=json.loads(next(lines)); assert header['kind']=='header'
 for k in ['sourceFreezeSha256','protocolSha256','referenceSha256','engine','tapeManifestSha256','tapeSha256']: assert header[k]==v[k]
 for line in lines:
  x=json.loads(line)
  if x['kind']=='footer':
   assert x=={'kind':'footer','primaryFrequencyDraws':600000,'blocks':30,'supplementarySamplerCalls':0}
   assert next(lines,None) is None
   break
  i=total//100000; b=(total%100000)//20000; row=total%20000
  c=protocol['cases'][i]; cid=c['id']; key=(cid,b)
  assert x['kind']=='draw' and x['caseId']==cid and x['caseIndex']==i and x['block']==b and x['row']==row and x['sequence']==total and x['tapeByteOffset']==60*total
  marks=x['sample']['marks']; assert len(marks)==c['n'] and marks.count('primary')==1 and marks[c['primary']]=='primary' and marks.count('secondary')==c['K'] and all(z in ['primary','secondary','unmarked'] for z in marks)
  mask=str(sum(1<<j for j,z in enumerate(marks) if z=='secondary'))
  counts.setdefault(key,Counter())[mask]+=1; consumed[key]+=x['consumed'];digests.setdefault(key,hashlib.sha256()).update(line)
  steps=[]
  def visit(z):
   if isinstance(z,dict):
    if 'uniform' in z: steps.append(z)
    for a in z.values(): visit(a)
   elif isinstance(z,list):
    for a in z: visit(a)
  visit(x['sample']);steps.sort(key=lambda z:z['drawOrdinal'])
  assert len(steps)==x['consumed']
  for j,step in enumerate(steps):
   assert step['drawOrdinal']==j and step['uniform']==struct.unpack_from('<I',tape,60*total+4*j)[0]/(2**32)
  total+=1
 else: raise AssertionError('missing footer')
assert total==600000
for b in s['blocks']:
 key=(b['caseId'],b['block'])
 assert {k:counts[key].get(k,0) for k in b['counts']}==b['counts'] and sum(counts[key].values())==b['rows']==20000
 assert consumed[key]==b['consumedCells'] and b['unusedCells']==300000-consumed[key] and digests[key].hexdigest()==b['transcriptSha256']
for c in s['cases']:
 agg=Counter()
 for b in range(5): agg.update(counts[(c['id'],b)])
 assert {k:agg.get(k,0) for k in c['counts']}==c['counts'] and sum(agg.values())==c['rows']==100000
 assert c['consumedCells']==sum(consumed[(c['id'],b)] for b in range(5)) and c['unusedCells']==1500000-c['consumedCells']
 for w in c['witnesses']:
  assert w['caseId']==c['id'] and w['sequence']==w['caseIndex']*100000+w['block']*20000+w['row'] and w['tapeByteOffset']==60*w['sequence']
assert len(v['comparisons'])==1440
seen=set()
for x in v['comparisons']:
 key=(x['caseId'],x['block'],x['secondaryMask']);assert key not in seen;seen.add(key)
 target=next(c for c in ref['cases'] if c['id']==x['caseId'])
 pattern=next((p for p in target['patterns'] if p['secondaryMask']==x['secondaryMask']),None)
 t=Fraction(int(pattern['numericGrid']['numerator']),int(pattern['numericGrid']['denominator'])) if pattern else Fraction(0)
 assert x['target']=={'numerator':str(t.numerator),'denominator':str(t.denominator),'probability':float(t)}
 g=next(c for c in s['cases'] if c['id']==x['caseId']) if x['block']=='aggregate' else next(b for b in s['blocks'] if b['caseId']==x['caseId'] and b['block']==x['block'])
 assert x['count']==g['counts'][x['secondaryMask']] and x['N']==g['rows']
 error=abs(Fraction(x['count'],x['N'])-t)
 assert x['absoluteError']=={'numerator':str(error.numerator),'denominator':str(error.denominator),'probability':float(error)}
 limit=math.sqrt(math.log(2*1440/0.01)/(2*x['N']))
 assert limit==x['limit'] and x['passed'] is True and float(error)<=limit and (t>0 or x['count']==0)
for spec in protocol['cases']:
 for mask in range(1<<spec['n']):
  if mask & (1<<spec['primary']):continue
  for b in [0,1,2,3,4,'aggregate']: assert (spec['id'],b,str(mask)) in seen
coverage=[]
for target,c in zip(ref['cases'],s['cases']):
 assert target['id']==c['id']
 positive=[p['secondaryMask'] for p in target['patterns'] if int(p['numericGrid']['numerator'])>0]
 coverage.append({'caseId':c['id'],'positiveNumericPatterns':len(positive),'observedPatterns':sum(n>0 for n in c['counts'].values()),'unobservedPositiveNumericMasks':[m for m in positive if c['counts'][m]==0]})
assert coverage==v['coverage']==review['coverage']
assert sum(consumed.values())==1501143 and 9000000-sum(consumed.values())==7498857
for p,h in freeze['sources'].items(): assert sha(R/p)==h,p
for a in review['artifacts']: assert sha(Path(a['path']))==a['sha256']
out={'version':'q09-parent-frequency-outcome-review-v1','passed':True,'auditSourceSha256':sha(Path(__file__)),'sourceFreezeSha256':sha(T/'q09-sampler-source-freeze-v1.json'),'verificationSha256':sha(T/'q09-sampler-frequency-verification-v1.json'),'runReviewSha256':sha(T/'q09-sampler-run-review-v1.json'),'independentParentChecks':{'sourceFiles':116,'archiveRows':total,'frequencyComparisons':len(seen),'blockTranscriptHashes':30,'consumedUniforms':sum(consumed.values()),'unusedTapeCells':9000000-sum(consumed.values())},'coverage':coverage,'scope':'Independent parent recount of raw archive masks, schedules, used tape uniforms, block hashes, aggregate counts, exact target fractions/errors/limits and source/artifact identities. Full leaf semantics, detailed witness first occurrence and rational/numeric branch proof are established by the separately reviewed frozen independent verifier, not reimplemented by this audit. Frequency claims assume independent uniform inputs; no linguistic claim.','authorization':'Package exact frozen source and full tape/transcript/law evidence for a pure-law and sampler PR. No source changes, generator integration, reroll or additional frequency draws.'}
p=T/'q09-parent-frequency-outcome-review-v1.json'
with p.open('x') as f:json.dump(out,f,indent=2);f.write('\n')
print(json.dumps({'path':str(p),'sha256':sha(p),'checks':out['independentParentChecks']}))
