import csv,gzip,sys,collections,json,statistics as st
ev,regen=sys.argv[1],sys.argv[2]
refrows=list(csv.DictReader(gzip.open(ev+'/uci-reference.csv.gz','rt')))
genrows=list(csv.DictReader(gzip.open(ev+'/uci-generated.csv.gz','rt')))
tr=[json.loads(l) for l in open(regen)]
V=set('AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW'.split())
mism=0
for g,t in zip(genrows,tr):
    flat=' '.join(' '.join(x for x in s[:3] if x) for s in t['syl'])
    if flat!=g['arpabet']: mism+=1
print('regen mismatches',mism,'of',len(tr))
def med(v): return st.median(v) if v else float('nan')
def summ(name,rows):
    b=[float(g['uci_bigram_percentile']) for g in rows if g['uci_bigram_percentile']]
    u=[float(g['uci_unigram_percentile']) for g in rows if g['uci_unigram_percentile']]
    if len(b)<100: return
    print('%-28s n=%5d  bi med %4.0f  <p10 %4.1f%%   uni med %4.0f <p10 %4.1f%%'%(name,len(b),med(b),100*sum(x<10 for x in b)/len(b),med(u),100*sum(x<10 for x in u)/len(u)))
d=collections.defaultdict(list)
for g,t in zip(genrows,tr):
    d['template '+str(t['template'])].append(g)
    d['tmpl %s syl %d'%(t['template'],min(len(t['syl']),5))].append(g)
    d['rootsyl %d'%min(t['rootLen'],5)].append(g)
    d['attempts '+('0' if t['attempts']==0 else '1-3' if t['attempts']<4 else '4+')].append(g)
    for r in set(t['repairs']): d['repair '+r].append(g)
    if not t['repairs']: d['repair (none)'].append(g)
    for r in set(t['structural']):
        if r!='aspirationDecision': d['structural '+r].append(g)
    if t.get('suffix'): d['suffix '+t.get('suffix')].append(g)
    if t.get('prefix'): d['prefix '+t.get('prefix')].append(g)
for k in sorted(d): summ(k,d[k])
tc=collections.Counter(t['template'] for t in tr); print(tc)
