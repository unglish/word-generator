"""Join authenticated per-word final counters to full raw recorded attempts."""
import gzip,hashlib,json
from pathlib import Path
from collections import Counter
b=Path('/private/tmp/q14a-completion-joint-neighbor-evidence-v2');analysis=b/'candidate-analysis';archive=b/'candidate-archive'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
seal=json.loads((analysis/'complete.json').read_text());manifest=json.loads((archive/'manifest.json').read_text())['manifest'];assert seal['manifestSha256']==sha(archive/'manifest.json')
report_artifact=next(a for a in seal['artifacts'] if a['file']=='report.json')
assert sha(analysis/'report.json')==report_artifact['sha256']
expected=json.loads((b/'independent-recount.json').read_text())['counts']['finalRoot:unresolved']
report=json.loads((analysis/'report.json').read_text())
assert expected==next(g['counts']['finalRoot:unresolved'] for g in report['groups'] if g['dimensions']==['all'])
coordinates={};observed=0
for artifact in seal['artifacts']:
 if not artifact['file'].startswith('observations/'):continue
 p=analysis/artifact['file'];assert sha(p)==artifact['sha256'];count=0
 with gzip.open(p,'rt') as f:
  for line in f:
   r=json.loads(line);assert r['drawIndex']==count;count+=1;n=r['counts'].get('finalRoot:unresolved',0)
   if n:coordinates[(r['profile'],r['seed'],r['drawIndex'])]=n;observed+=n
 assert count==10000 and sha(p)==artifact['sha256']
assert observed==expected
counts=Counter();witnesses=[];seen=set();words=0
for artifact in manifest['artifacts']:
 if not artifact['file'].startswith('words/'):continue
 p=archive/artifact['file'];assert sha(p)==artifact['sha256'];count=0
 with gzip.open(p,'rt') as f:
  for line in f:
   r=json.loads(line);assert r['drawIndex']==count;count+=1;words+=1;key=(r['profile'],r['seed'],r['drawIndex'])
   if key not in coordinates:continue
   seen.add(key);ledger=r['word']['trace']['baseSpelling'];matched=[]
   for entry in ledger['completion']['attempts']:
    a=entry['attempt']
    if a['obligation']['status']!='unresolved':continue
    if a['status']=='prefix-unavailable':reason='prefix:'+a['prefix']['reason']
    elif a['status']=='evaluated' and a['sample']['status']=='infeasible':reason='infeasible:'+','.join(sorted({p.get('refusal','none') for p in a['proposals']}))
    else:continue
    sound=ledger['phones'][a['nucleusId']]['soundAtSpelling'];counts[(reason,sound)]+=1;matched.append({'unitId':a['nucleusId'],'sound':sound,'reason':reason,'attempt':a})
   assert len(matched)==coordinates[key],(key,coordinates[key],matched)
   witnesses.append({'profile':key[0],'seed':key[1],'drawIndex':key[2],'written':r['word']['written'],'finalUnresolvedCount':coordinates[key],'recordedAttempts':matched,'edits':ledger['edits']})
 assert count==10000 and sha(p)==artifact['sha256']
assert words==200000 and seen==set(coordinates) and sum(counts.values())==expected
out={'wordsScanned':words,'finalUnresolvedNuclei':observed,'affectedWords':len(coordinates),'groups':[{'reason':k[0],'sound':k[1],'count':v} for k,v in sorted(counts.items())],'allAffectedTraceWitnesses':witnesses,'analysisSealSha256':sha(analysis/'complete.json'),'manifestSha256':sha(archive/'manifest.json'),'scope':'Full authenticated per-word final-counter/raw-attempt join, exact count agreement for every affected word. Recorded refusal attribution, not independent phonemic licensing, causal improvement or human evidence.'}
(b/'final-residual-population.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k!='allAffectedTraceWitnesses'},indent=2))
