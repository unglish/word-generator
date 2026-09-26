from pathlib import Path
import json
from collections import defaultdict
out=[]
for file in sorted(Path('/private/tmp/q13-cpu-profiles-v2').glob('*.cpuprofile')):
 p=json.loads(file.read_text());nodes={n['id']:n for n in p['nodes']};parents={child:n['id'] for n in p['nodes'] for child in n.get('children',[])};counts=defaultdict(float); total=sum(p['timeDeltas'])
 for sample,weight in zip(p['samples'],p['timeDeltas']):
  frames=[];current=sample
  while current:
   frames.append(nodes[current]['callFrame']);current=parents.get(current)
  if not any(f['functionName']=='structuredClone' for f in frames):continue
  callers=[]
  for f in frames:
   if '/src/' in f['url']:callers.append(f)
  if not callers:label='unattributed'
  else:
   f=callers[0];label=f"{Path(f['url']).name}:{f['functionName'] or '(anonymous)'}:{f['columnNumber']+1}"
  counts[label]+=weight
 result={'profile':file.stem,'clones':[{'caller':k,'sampledMicros':v,'percent':round(v/total*100,3)} for k,v in sorted(counts.items(),key=lambda v:-v[1])]};out.append(result);print(json.dumps(result))
Path('/private/tmp/q13-cpu-profiles-v2/clone-attribution.json').write_text(json.dumps(out,indent=2)+'\n')
