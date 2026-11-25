import csv,gzip,sys,collections,random,math,bisect,statistics as st
ev=sys.argv[1]
rows=list(csv.DictReader(gzip.open(ev+'/uci-reference.csv.gz','rt')))
gen=[r['arpabet'].split() for r in csv.DictReader(gzip.open(ev+'/uci-generated.csv.gz','rt'))]
V=set('AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW'.split())
train=[r['arpabet'].split() for r in rows if r['fold']!='4']; test=[r['arpabet'].split() for r in rows if r['fold']=='4']
trainset=set(map(tuple,train)); N=len(train)
bi=collections.Counter(); nb=collections.Counter(); tri=collections.Counter(); ctx=collections.Counter()
for p in train:
    for i in range(len(p)-1): bi[(i,p[i],p[i+1])]+=1
    for x in set(zip(p,p[1:])): nb[x]+=1
    q=['#','#']+p+['$']
    for i in range(2,len(q)): tri[tuple(q[i-2:i+1])]+=1; ctx[tuple(q[i-2:i])]+=1
uci=lambda p: sum(bi[(i,p[i],p[i+1])] for i in range(len(p)-1))/N
def trig(p):
    q=['#','#']+p+['$']
    return sum(math.log((tri[tuple(q[i-2:i+1])]+0.1)/(ctx[tuple(q[i-2:i])]+0.1*40)) for i in range(2,len(q)))/(len(p)+1)
# peers by length from test
def peers(f):
    d=collections.defaultdict(list)
    for p in test: d[len(p)].append(f(p))
    for k in d: d[k].sort()
    return d
PU,PT=peers(uci),peers(trig)
def pct(d,p,f):
    v=d.get(len(p))
    if not v or len(v)<30: return None
    return 100*bisect.bisect_left(v,f(p))/len(v)
# syllabify (max onset from word-initial inventory with count>=3)
ons=collections.Counter()
for p in train:
    i=0
    while i<len(p) and p[i] not in V: i+=1
    ons[tuple(p[:i])]+=1
legal={k for k,v in ons.items() if v>=3}|{()}
def syl(p):
    vi=[i for i,x in enumerate(p) if x in V]
    if not vi: return None
    out=[];start=0
    for n,i in enumerate(vi):
        if n+1<len(vi):
            inter=p[i+1:vi[n+1]]
            k=0
            while tuple(inter[k:]) not in legal: k+=1
            end=i+1+k
        else: end=len(p)
        out.append((tuple(p[start:i]),p[i],tuple(p[i+1:end]))); start=end
    return out
S=[s for s in map(syl,train) if s]
def pos(i,n): return 'mono' if n==1 else 'init' if i==0 else 'final' if i==n-1 else 'med'
O=collections.defaultdict(collections.Counter);R=collections.defaultdict(collections.Counter);SY=collections.defaultdict(collections.Counter)
OB=collections.defaultdict(collections.Counter);NUC=collections.defaultdict(collections.Counter);COD=collections.defaultdict(collections.Counter)
for s in S:
    n=len(s)
    for i,(o,v,c) in enumerate(s):
        k=pos(i,n); O[k][o]+=1; R[k][(v,c)]+=1; SY[k][(o,v,c)]+=1; NUC[k][v]+=1; COD[k][c]+=1
        if i>0:
            pc=s[i-1][2]; OB[(k,pc[-1] if pc else s[i-1][1])][o]+=1   # onset | previous final phone
def draw(c,rng):
    ks=list(c); return rng.choices(ks,weights=[c[k] for k in ks])[0]
nsyl_gen=[sum(x in V for x in p) for p in gen]
def mk(kind,rng,n):
    out=[]
    for _ in range(n):
        ns=rng.choice(nsyl_gen); w=[]; prev=None
        for i in range(ns):
            k=pos(i,ns)
            if kind=='syllable': o,v,c=draw(SY[k],rng)
            else:
                if kind=='rime+join' and i>0 and OB.get((k,prev)): o=draw(OB[(k,prev)],rng)
                else: o=draw(O[k],rng)
                if kind=='indep': v=draw(NUC[k],rng); c=draw(COD[k],rng)
                else: v,c=draw(R[k],rng)
            w+=list(o)+[v]+list(c); prev=w[-1]
        out.append(w)
    return out
# first-order phone chain
T=collections.defaultdict(collections.Counter)
for p in train:
    q=['#']+p+['$']
    for a,b in zip(q,q[1:]): T[a][b]+=1
def chain(rng,n):
    out=[]
    while len(out)<n:
        w=[];a='#'
        while True:
            a=draw(T[a],rng)
            if a=='$' or len(w)>14: break
            w.append(a)
        if 2<=len(w)<=13 and any(x in V for x in w): out.append(w)
    return out
def report(name,words):
    u=[x for x in (pct(PU,p,uci) for p in words) if x is not None]; t=[x for x in (pct(PT,p,trig) for p in words) if x is not None]
    rare=sum(any(nb[x]<=4 for x in zip(p,p[1:])) for p in words)/len(words)
    real=sum(tuple(p) in trainset for p in words)/len(words)
    c=collections.Counter(map(tuple,words)); dup=1-len(c)/len(words)
    print('%-34s UCI pair med %3.0f <p10 %4.1f%% | trigram med %3.0f <p10 %4.1f%% | rare-pair words %4.1f%% | real train words %4.1f%% | duplicate draws %4.1f%% | mean len %.2f'%(name,st.median(u),100*sum(x<10 for x in u)/len(u),st.median(t),100*sum(x<10 for x in t)/len(t),100*rare,100*real,100*dup,sum(map(len,words))/len(words)))
rng=random.Random(7); n=20000
report('held-out dictionary (fold 4)',test)
report('current generator (archive)',gen)
report('A0 independent O / N / C by pos',mk('indep',rng,n))
report('A1 onset + joint rime by pos',mk('rime',rng,n))
report('A2 joint rime + onset|prev phone',mk('rime+join',rng,n))
report('A3 whole CMU syllables by pos',mk('syllable',rng,n))
report('B  first-order phone chain',chain(rng,n))
