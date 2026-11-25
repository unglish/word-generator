import csv,gzip,sys,collections,statistics as st
ev=sys.argv[1]
ref=list(csv.DictReader(gzip.open(ev+'/uci-reference.csv.gz','rt')))
gen=list(csv.DictReader(gzip.open(ev+'/uci-generated.csv.gz','rt')))
print(len(ref),len(gen))
V=set('AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW'.split())
# fit full-reference positional models (in-sample; attribution only)
N=len(ref)
uni=collections.Counter(); bi=collections.Counter()
for r in ref:
    p=r['arpabet'].split()
    for i,x in enumerate(p): uni[(i,x)]+=1
    for i in range(len(p)-1): bi[(i,p[i],p[i+1])]+=1
def sc(p):
    return 1+sum(uni[(i,x)] for i,x in enumerate(p))/N, 1+sum(bi[(i,p[i],p[i+1])] for i in range(len(p)-1))/N
# check reproduction
for r in ref[1:4]+gen[:3]:
    print(r['arpabet'],sc(r['arpabet'].split()),r['uci_unigram'],r['uci_bigram'])
# percentile summary
bp=[float(g['uci_bigram_percentile']) for g in gen if g['uci_bigram_percentile']]
up=[float(g['uci_unigram_percentile']) for g in gen if g['uci_unigram_percentile']]
print('median uni',st.median(up),'bi',st.median(bp),'below p10 bi',sum(x<10 for x in bp)/len(bp),'uni',sum(x<10 for x in up)/len(up))
# by length and syllables
def grp(key):
    d=collections.defaultdict(list)
    for g in gen:
        if g['uci_bigram_percentile']: d[key(g)].append((float(g['uci_bigram_percentile']),float(g['uci_unigram_percentile'])))
    for k in sorted(d):
        v=d[k]
        if len(v)>=200: print(k,len(v),'med bi %.0f uni %.0f'%(st.median(x[0] for x in v),st.median(x[1] for x in v)),'<p10 bi %.1f%%'%(100*sum(x[0]<10 for x in v)/len(v)))
print('by phonemes');grp(lambda g:int(g['phonemes']))
print('by syll');grp(lambda g:int(g['syllables']))
rl=collections.Counter(int(r['phonemes']) for r in ref); gl=collections.Counter(int(r['phonemes']) for r in gen)
print('len dist ref',{k:round(rl[k]/len(ref)*100,1) for k in sorted(rl)})
print('len dist gen',{k:round(gl[k]/len(gen)*100,1) for k in sorted(gl)})
rs=collections.Counter(int(r['syllables']) for r in ref); gs=collections.Counter(int(r['syllables']) for r in gen)
print('syl ref',{k:round(rs[k]/len(ref)*100,1) for k in sorted(rs)});print('syl gen',{k:round(gs[k]/len(gen)*100,1) for k in sorted(gs)})
