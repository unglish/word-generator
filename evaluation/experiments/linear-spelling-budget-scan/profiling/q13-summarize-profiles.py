import json
from pathlib import Path
from collections import defaultdict
import sys
root=Path(sys.argv[1] if len(sys.argv)>1 else '/private/tmp/q13-cpu-profiles-v2')
reports=[]
for file in sorted(root.glob('*.cpuprofile')):
 p=json.loads(file.read_text());nodes={n['id']:n for n in p['nodes']};parents={c:n['id'] for n in p['nodes'] for c in n.get('children',[])}
 own=defaultdict(float);inclusive=defaultdict(float);self_files=defaultdict(float);time=sum(p.get('timeDeltas',[]))
 def identity(n):
  f=n['callFrame'];return (f.get('url',''),f.get('functionName','') or '(anonymous)',f.get('lineNumber',0),f.get('columnNumber',0))
 for sample,delta in zip(p.get('samples',[]),p.get('timeDeltas',[])):
  own[identity(nodes[sample])]+=delta;self_files[identity(nodes[sample])[0]]+=delta
  ids=set();cur=sample
  while cur:
   key=identity(nodes[cur]);ids.add(key);cur=parents.get(cur)
  for key in ids:inclusive[key]+=delta
 def table(values,count):return [{'function':k[1],'file':k[0].replace('file:///Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/',''),'line':k[2]+1,'column':k[3]+1,'sampledMs':round(v/1000,3),'percent':round(v/time*100,3)} for k,v in sorted(values.items(),key=lambda kv:-kv[1])[:count]]
 summary={'id':file.stem,'totalSampledMicros':time,'self':table(own,25),'inclusive':table(inclusive,35),'selfFiles':[{'file':k,'percent':round(v/time*100,3)} for k,v in sorted(self_files.items(),key=lambda kv:-kv[1])[:20]]};reports.append(summary)
 print('\n',file.stem,'samples',len(p.get('samples',[])))
 for row in summary['self'][:12]:print(f"{row['percent']:6.2f}% {row['function']} {row['file']}")
 print('Relevant inclusive:')
 for row in summary['inclusive']:
  if any(x in row['file'] for x in ['spelling','write.ts','js_transferable']):print(f"{row['percent']:6.2f}% {row['function']} {row['file']}")
(root/'summary.json').write_text(json.dumps(reports,indent=2)+'\n')
