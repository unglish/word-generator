import csv,gzip,sys,collections,math
ev=sys.argv[1]
ref=[r['arpabet'].split() for r in csv.DictReader(gzip.open(ev+'/uci-reference.csv.gz','rt'))]
gen=[r['arpabet'].split() for r in csv.DictReader(gzip.open(ev+'/uci-generated.csv.gz','rt'))]
V=set('AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW'.split())
N=len(ref)
bi=collections.Counter()
for p in ref:
    for i in range(len(p)-1): bi[(i,p[i],p[i+1])]+=1
cls=lambda a,b:('V' if a in V else 'C')+('V' if b in V else 'C')
# mean contribution per position, length-matched: weight gen by ref length distribution
rl=collections.Counter(len(p) for p in ref)
def contrib(words):
    by=collections.defaultdict(lambda:collections.defaultdict(float)); n=collections.Counter()
    for p in words:
        L=len(p); n[L]+=1
        for i in range(L-1):
            by[L][(i,cls(p[i],p[i+1]))]+=bi[(i,p[i],p[i+1])]/N
    return by,n
rb,rn=contrib(ref); gb,gn=contrib(gen)
# aggregate gap by position and class using ref length weights (lengths 3..12)
gap=collections.defaultdict(float); refc=collections.defaultdict(float); tot=0
for L in range(3,13):
    w=rl[L]/N; tot+=w
    keys=set(rb[L])|set(gb[L])
    for k in keys:
        r=rb[L][k]/rn[L]; g=gb[L][k]/gn[L]
        gap[k]+=w*(g-r); refc[k]+=w*r
print('total ref mean score-1 (len3-12) %.5f, gap %.5f'%(sum(refc.values())/tot,sum(gap.values())/tot))
print('gap by position:')
for i in range(11):
    print(i,' '.join('%s ref %.5f gap %+.5f'%(c,refc[(i,c)]/tot,gap[(i,c)]/tot) for c in ['CV','VC','CC','VV']))
print('gap by class:',{c:round(sum(v for k,v in gap.items() if k[1]==c)/tot,5) for c in ['CV','VC','CC','VV']})
print('ref by class:',{c:round(sum(v for k,v in refc.items() if k[1]==c)/tot,5) for c in ['CV','VC','CC','VV']})
# class share of biphone tokens
def share(words):
    c=collections.Counter()
    for p in words:
        for i in range(len(p)-1): c[cls(p[i],p[i+1])]+=1
    t=sum(c.values()); return {k:round(100*v/t,1) for k,v in c.items()}
print('class share ref',share(ref));print('class share gen',share(gen))
# top positional biphone deficits (length-weighted): contribution to mean gap = (qgen-pref)*pref
d=collections.Counter()
gq=collections.defaultdict(collections.Counter); rq=collections.defaultdict(collections.Counter)
for p in gen:
    for i in range(len(p)-1): gq[len(p)][(i,p[i],p[i+1])]+=1
for p in ref:
    for i in range(len(p)-1): rq[len(p)][(i,p[i],p[i+1])]+=1
rate=collections.defaultdict(lambda:[0,0])
for L in range(3,13):
    w=rl[L]/N/tot
    for k in set(gq[L])|set(rq[L]):
        g=gq[L][k]/gn[L]; r=rq[L][k]/rn[L]
        d[k]+=w*(g-r)*bi[k]/N
        rate[k][0]+=w*g; rate[k][1]+=w*r
print('largest deficits (pos, a, b, gap contribution, gen rate%, ref rate%)')
for k,v in sorted(d.items(),key=lambda x:x[1])[:45]: print(k,'%+.6f'%v,'%.2f %.2f'%(100*rate[k][0],100*rate[k][1]))
print('largest surpluses')
for k,v in sorted(d.items(),key=lambda x:-x[1])[:12]: print(k,'%+.6f'%v,'%.2f %.2f'%(100*rate[k][0],100*rate[k][1]))
print('sum of top45 deficits',sum(v for k,v in sorted(d.items(),key=lambda x:x[1])[:45]),'total',sum(d.values()))
