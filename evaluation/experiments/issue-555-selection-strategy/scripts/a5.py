import csv,gzip,sys,collections,json,math
ev=sys.argv[1]
ref=[r['arpabet'].split() for r in csv.DictReader(gzip.open(ev+'/uci-reference.csv.gz','rt'))]
gen=[r['arpabet'].split() for r in csv.DictReader(gzip.open(ev+'/uci-generated.csv.gz','rt'))]
V=set('AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW'.split())
def slots(p):
    vi=[i for i,x in enumerate(p) if x in V]
    out=[]
    if not vi: return [None]*(len(p)-1)
    f,l=vi[0],vi[-1]
    for i in range(len(p)-1):
        a,b=p[i] in V,p[i+1] in V
        if i+1<=f: out.append('initial CC' if not b else 'initial C>V')
        elif i>=l: out.append('V>final C' if a else 'final CC')
        elif a and b: out.append('hiatus')
        elif a: out.append('V>medial C')
        elif b: out.append('medial C>V')
        else: out.append('medial CC')
    return out
def dist(words):
    d=collections.defaultdict(collections.Counter)
    for p in words:
        for i,s in enumerate(slots(p)): d[s][(p[i],p[i+1])]+=1
    return d
rd,gd=dist(ref),dist(gen)
def js(a,b):
    ta,tb=sum(a.values()),sum(b.values()); s=0
    for k in set(a)|set(b):
        x,y=a[k]/ta,b[k]/tb; m=(x+y)/2
        if x: s+=.5*x*math.log2(x/m)
        if y: s+=.5*y*math.log2(y/m)
    return s
# marginal-vs-conditional: how much of the pair divergence is explained by marginals (first, second) alone?
def indep_fit(a,b):
    """reweight gen pairs so both marginals match ref (IPF), return JS after"""
    ta=sum(a.values()); tb=sum(b.values())
    q={k:v/tb for k,v in b.items()}
    r1=collections.Counter(); r2=collections.Counter()
    for (x,y),v in a.items(): r1[x]+=v/ta; r2[y]+=v/ta
    for _ in range(50):
        m=collections.Counter()
        for (x,y),v in q.items(): m[x]+=v
        q={(x,y):v*r1[x]/m[x] if m[x] else 0 for (x,y),v in q.items()}
        m=collections.Counter()
        for (x,y),v in q.items(): m[y]+=v
        q={(x,y):v*r2[y]/m[y] if m[y] else 0 for (x,y),v in q.items()}
    return js(a,collections.Counter(q))
for s in ['initial CC','initial C>V','V>medial C','medial CC','medial C>V','hiatus','V>final C','final CC']:
    a,b=rd[s],gd[s]; ta,tb=sum(a.values()),sum(b.values())
    print('== %s  JS(pair)=%.4f bits ; after matching both marginals to ref (IPF)=%.4f ; ref types %d gen types %d'%(s,js(a,b),indep_fit(a,b),len(a),len(b)))
    diff=sorted(((b[k]/tb-a[k]/ta)*100,k) for k in set(a)|set(b))
    print('   under:',' '.join('%s-%s %+.1f(%.1f)'%(k[0],k[1],d,a[k]/ta*100) for d,k in diff[:14]))
    print('   over :',' '.join('%s-%s %+.1f(%.1f)'%(k[0],k[1],d,a[k]/ta*100) for d,k in diff[::-1][:14]))
    unseen=sorted(((b[k],k) for k in b if a[k]<=2),reverse=True)[:12]
    print('   gen pairs with ref count<=2:',' '.join('%s-%s x%d'%(k[0],k[1],c) for c,k in unseen), '| total %.2f%%'%(100*sum(b[k] for k in b if a[k]<=2)/tb))
# nuclei by position
def nuc(words):
    c=collections.defaultdict(collections.Counter)
    for p in words:
        v=[x for x in p if x in V]
        if len(v)<2: c['mono'][v[0]]+=1; continue
        c['first'][v[0]]+=1; c['final'][v[-1]]+=1
        for x in v[1:-1]: c['medial'][x]+=1
    return c
rn,gn=nuc(ref),nuc(gen)
for k in ['mono','first','medial','final']:
    ta,tb=sum(rn[k].values()),sum(gn[k].values())
    print('nucleus',k,'JS %.4f'%js(rn[k],gn[k]),' '.join('%s %.0f/%.0f'%(v,100*rn[k][v]/ta,100*gn[k][v]/tb) for v in sorted(V,key=lambda v:-rn[k][v])))
