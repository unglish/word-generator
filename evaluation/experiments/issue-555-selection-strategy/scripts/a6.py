import csv,gzip,sys,collections,json
ev,regen=sys.argv[1],sys.argv[2]
ref=[r['arpabet'].split() for r in csv.DictReader(gzip.open(ev+'/uci-reference.csv.gz','rt'))]
tr=[json.loads(l) for l in open(regen)]
N=len(ref)
bi=collections.Counter(); nb=collections.Counter()
for p in ref:
    for i in range(len(p)-1): bi[(i,p[i],p[i+1])]+=1
    for x in set(zip(p,p[1:])): nb[x]+=1
allp=sum(len(p)-1 for p in ref); refmean=sum(bi[(i,p[i],p[i+1])]/N for p in ref for i in range(len(p)-1))/allp
print('reference mean per-pair positional prob %.5f'%refmean)
agg=collections.defaultdict(lambda:[0,0.0,0]); tot=0
for t in tr:
    seq=[]  # (phone, syl index, part)
    for si,s in enumerate(t['syl']):
        for part,x in zip('ONC',s[:3]):
            for ph in x.split(): seq.append((ph,si,part))
    rs,rl=t['rootStart'],t['rootLen']
    isroot=lambda si: rs<=si<rs+rl
    for i in range(len(seq)-1):
        (a,sa,pa),(b,sb,pb)=seq[i],seq[i+1]
        rel=('within ' if sa==sb else 'cross  ')+pa+'>'+pb
        own='root' if isroot(sa) and isroot(sb) else 'affix' if not isroot(sa) and not isroot(sb) else 'root|affix join'
        if pa=='N' and pb in 'CO' : rel+=' ('+('stressed' if t['syl'][sa][3] else 'unstressed')+' V)'
        for k in [(own,rel),(own,'ALL'),('ALL',rel)]:
            e=agg[k]; e[0]+=1; e[1]+=bi[(i,a,b)]/N; e[2]+=nb[(a,b)]<=4
        tot+=1
for k in sorted(agg):
    n,s,r=agg[k]
    if n>300: print('%-16s %-28s share %5.1f%%  per-pair typicality %3.0f%% of ref  rare(<=4) %.2f%%'%(k[0],k[1],100*n/tot,100*s/n/refmean,100*r/n))
