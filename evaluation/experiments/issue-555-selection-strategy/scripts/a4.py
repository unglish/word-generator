import csv,gzip,sys,collections,json,math
ev,regen=sys.argv[1],sys.argv[2]
ref=[r['arpabet'].split() for r in csv.DictReader(gzip.open(ev+'/uci-reference.csv.gz','rt'))]
gen=[r['arpabet'].split() for r in csv.DictReader(gzip.open(ev+'/uci-generated.csv.gz','rt'))]
tr=[json.loads(l) for l in open(regen)]
V=set('AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW'.split())
N=len(ref)
bi=collections.Counter(); nb=collections.Counter()
for p in ref:
    for i in range(len(p)-1): bi[(i,p[i],p[i+1])]+=1
    for x in set(zip(p,p[1:])): nb[x]+=1   # type count, position-free
def slots(p):
    """label each adjacent pair by syllable-independent slot"""
    vi=[i for i,x in enumerate(p) if x in V]
    out=[]
    if not vi: return [None]*(len(p)-1)
    f,l=vi[0],vi[-1]
    for i in range(len(p)-1):
        a,b=p[i] in V,p[i+1] in V
        if i+1<=f: out.append('1 initial-onset CC' if not b else '2 initial-onset>V')
        elif i>=l: out.append('7 V>final-coda' if a else '8 final-coda CC')
        elif a and b: out.append('6 hiatus V.V')
        elif a: out.append('3 V>medial C')
        elif b: out.append('5 medial C>V')
        else: out.append('4 medial CC')
    return out
rl=collections.Counter(len(p) for p in ref)
def agg(words,sel=lambda p:True):
    c=collections.defaultdict(lambda:collections.Counter()); n=collections.Counter(); cnt=collections.defaultdict(lambda:collections.Counter())
    for p in words:
        if not sel(p): continue
        L=len(p); n[L]+=1
        for i,s in enumerate(slots(p)):
            c[L][s]+=bi[(i,p[i],p[i+1])]/N; cnt[L][s]+=1
    return c,n,cnt
nsyl=lambda p:sum(x in V for x in p)
for name,sel in [('all',lambda p:True),('polysyllabic',lambda p:nsyl(p)>=2),('3+ syll',lambda p:nsyl(p)>=3)]:
    rc,rn,rcnt=agg(ref,sel); gc,gn,gcnt=agg(gen,sel)
    Ls=[L for L in range(3,13) if rn[L]>50 and gn[L]>50]; W=sum(rn[L] for L in Ls)
    print('==',name,'length-matched (ref weights); mean score contribution per word')
    tg=0
    for s in sorted(set(k for L in Ls for k in rc[L])):
        r=sum(rn[L]/W*rc[L][s]/rn[L] for L in Ls); g=sum(rn[L]/W*gc[L][s]/gn[L] for L in Ls)
        rk=sum(rn[L]/W*rcnt[L][s]/rn[L] for L in Ls); gk=sum(rn[L]/W*gcnt[L][s]/gn[L] for L in Ls)
        tg+=g-r
        print('  %-20s ref %.5f gen %.5f gap %+.5f | pairs/word ref %.2f gen %.2f | per-pair ref %.5f gen %.5f (%.0f%%)'%(s,r,g,g-r,rk,gk,r/rk,g/gk if gk else 0,100*(g/gk)/(r/rk) if gk else 0))
    print('  total gap %+.5f'%tg)
# rare/unseen pairs (position-free, type counts, leave-one-out for ref)
print('== share of pairs that are rare in reference (type count <=T after leave-one-out), by slot')
for T in (0,4):
    rs=collections.Counter(); rt=collections.Counter(); gs=collections.Counter(); gt=collections.Counter()
    rw=gw=0
    for p in ref:
        hit=False
        for i,s in enumerate(slots(p)):
            rt[s]+=1
            if nb[(p[i],p[i+1])]-1<=T: rs[s]+=1; hit=True
        rw+=hit
    for p in gen:
        hit=False
        for i,s in enumerate(slots(p)):
            gt[s]+=1
            if nb[(p[i],p[i+1])]<=T: gs[s]+=1; hit=True
        gw+=hit
    print(' T=%d words with >=1 such pair: ref %.1f%% gen %.1f%%'%(T,100*rw/len(ref),100*gw/len(gen)))
    for s in sorted(rt): print('   %-20s ref %.2f%% gen %.2f%%  (gen n=%d)'%(s,100*rs[s]/rt[s],100*gs[s]/max(gt[s],1),gs[s]))
