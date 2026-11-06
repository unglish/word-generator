import json,sys,os,collections
d=sys.argv[1]
f=max((os.path.join(d,x) for x in os.listdir(d)),key=lambda f: open(f).read().count('/src/core/'))
p=json.load(open(f))
nodes={n['id']:n for n in p['nodes']}
dt=collections.Counter()
for s,t in zip(p['samples'],p['timeDeltas']): dt[s]+=t
total=sum(dt.values())
selfc=collections.Counter(); 
parent={}
for n in p['nodes']:
  for c in n.get('children',[]): parent[c]=n['id']
def key(n):
  cf=n['callFrame']; u=cf['url'].split('/src/')[-1] if '/src/' in cf['url'] else cf['url'].split('/')[-1]
  return f"{cf['functionName'] or '(anon)'} {u}:{cf['lineNumber']+1}"
incl=collections.Counter()
for nid,t in dt.items():
  selfc[key(nodes[nid])]+=t
  seen=set(); x=nid
  while x is not None:
    k=key(nodes[x])
    if k not in seen: incl[k]+=t; seen.add(k)
    x=parent.get(x)
mode=sys.argv[2] if len(sys.argv)>2 else 'self'
c=selfc if mode=='self' else incl
for k,v in c.most_common(int(sys.argv[3]) if len(sys.argv)>3 else 25):
  print(f"{100*v/total:5.1f}% {k}")
