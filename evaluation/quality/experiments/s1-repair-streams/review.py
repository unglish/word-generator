"""Score paired quality:pr archives. Usage: python3 review.py quality_dir ref.csv.gz repo query model.arpa out_dir"""
import bisect, collections, csv, functools, gzip, hashlib, itertools, json, math, re, statistics, subprocess, sys
from pathlib import Path

quality, reference, repo, query, model, out = map(Path, sys.argv[1:])
out.mkdir(parents=True, exist_ok=True)
C = collections.Counter
D = collections.defaultdict
with gzip.open(reference, 'rt') as f:
    reference_rows = list(csv.DictReader(f))
train = [r for r in reference_rows if r['fold'] != '4']
held = [r for r in reference_rows if r['fold'] == '4']
dictionary = {r['spelling'].lower() for r in reference_rows}
uni, bi, pairs, tri, ctx = C(), C(), C(), C(), C()
for r in train:
    phones = tuple(r['arpabet'].split())
    uni.update(enumerate(phones))
    bi.update((i, a, b) for i, (a,b) in enumerate(zip(phones, phones[1:])))
    pairs.update(set(zip(phones, phones[1:])))
    padded = ('#','#') + phones + ('$',)
    tri.update(zip(padded, padded[1:], padded[2:]))
    ctx.update(zip(padded[:-2], padded[1:-1]))

@functools.lru_cache(maxsize=120000)
def raw(phones):
    padded = ('#','#') + phones + ('$',)
    return (sum(uni[x] for x in enumerate(phones)),
            sum(bi[i,a,b] for i,(a,b) in enumerate(zip(phones, phones[1:]))),
            sum(math.log((tri[a,b,c]+.1)/(ctx[a,b]+4)) for a,b,c in zip(padded,padded[1:],padded[2:])) / (len(phones)+1))
peers = D(lambda:[[],[],[]])
for r in held:
    s = tuple(r['arpabet'].split())
    for values,v in zip(peers[len(s)],raw(s)): values.append(v)
for row in peers.values():
    for values in row: values.sort()

@functools.lru_cache(maxsize=120000)
def scores(phones):
    row=peers[len(phones)]
    pct = tuple(100*bisect.bisect_left(vals,v)/len(vals) for vals,v in zip(row,raw(phones))) if len(row[0])>=30 else (None,)*3
    return (*pct, any(pairs[a,b]<=4 for a,b in zip(phones,phones[1:])))

phone_map=dict(re.findall(r'^  "([^"]+)":\s*"([^"]+)"', (repo/'src/phonotactic/ipa-to-arpabet.ts').read_text(), re.M))
def phones(w):
    return tuple(phone_map[p['sound'].replace('ʰ','')] for syl in w['syllables'] for pos in ('onset','nucleus','coda') for p in syl[pos])
def word_view(w):
    return {'word':w['written']['clean'], 'ipa':w['pronunciation'], 'key':w['trace']['random']['key'],
        'selected':w['trace']['selection']['selectedAttempt'],'rootSyllables':w['trace']['syllableCount']}
def group():
    return {'single':[], 'pair':[], 'trigram':[], 'rare':0,'real':0,'spellings':C()}
def add(g,sc,spell):
    for key,val in zip(('single','pair','trigram'),sc):
        if val is not None:g[key].append(val)
    g['rare']+=sc[3]
    g['real']+=spell in dictionary
    g['spellings'][spell]+=1
groups=D(group)
changes=D(C)
full_traces={}
moves=[]
review=[]
changed_examples=[]
protocol=json.loads((repo/'evaluation/quality/protocol.json').read_text())
for profile in protocol['profiles']:
    name=profile['id']
    for seed in profile['seeds']['development']:
        filename=f'{name}-{seed}.jsonl.gz'
        with gzip.open(quality/'baseline'/'words'/filename) as fa, gzip.open(quality/'candidate'/'words'/filename) as fb:
            count=0
            for i,(la,lb) in enumerate(itertools.zip_longest(fa,fb)):
                same = la==lb
                a=json.loads(la); b=a if same else json.loads(lb)
                assert (name,seed,i)==tuple(a[k] for k in ('profile','seed','drawIndex'))==tuple(b[k] for k in ('profile','seed','drawIndex'))
                wa,wb=a['word'],b['word']
                assert wa['trace']['random']==wb['trace']['random']
                sa=scores(phones(wa)); sb=sa if same else scores(phones(wb))
                for tag,w,sc in [('A',wa,sa),('B',wb,sb)]:
                    spell=w['written']['clean']; root=w['trace']['syllableCount']
                    for group_id in [name, f'root syllables {min(root,4)}' + ('+' if root>=4 else ''),f'{name}/{seed}']:
                        add(groups[group_id,tag],sc,spell)
                change=changes[name]
                change['draws']+=1
                if not same:
                    change['full_trace_or_word']+=1
                    if (wa['written'],wa['pronunciation'])!=(wb['written'],wb['pronunciation']): change['surface']+=1
                    if wa['trace']['selection']['selectedAttempt']!=wb['trace']['selection']['selectedAttempt']:change['selected_attempt']+=1
                if name=='monosyllables-bare':assert same
                if i==0 or (not same and wa['written']['clean']!=wb['written']['clean'] and len(changed_examples)<20):
                    row=[name,seed,i,word_view(wa),word_view(wb)]
                    if i==0: review.append(row)
                    elif len(changed_examples)<20:changed_examples.append(row)
                if sa[1] is not None and sb[1] is not None and sa[1]!=sb[1]:
                    key=(name,seed,i)
                    moves.append((sb[1]-sa[1],key,sa[1],sb[1],word_view(wa),word_view(wb)))
                    # Full before/after traces for global extrema only.
                    if len(moves)%32==1 or len(full_traces)<10:
                        leaders={m[1] for m in sorted(moves)[:5]+sorted(moves)[-5:]}
                        full_traces={k:v for k,v in full_traces.items() if k in leaders}
                    if len(moves)<=10 or key in {m[1] for m in sorted(moves)[:5]+sorted(moves)[-5:]}:
                        full_traces[key]=[wa,wb]
                count+=1
            assert count==protocol['wordsPerReplicate']
        print(name,seed,count,flush=True)
spells=sorted(set().union(*(g['spellings'].keys() for g in groups.values())))
res=subprocess.run([str(query),'-v','sentence',str(model)],input=''.join(' '.join(s)+'\n' for s in spells),text=True,capture_output=True,check=True)
logs=re.findall(r'^Total: ([^ ]+) OOV: (\d+)$',res.stdout,re.M)
assert len(logs)==len(spells) and not any(int(unk) for _,unk in logs)
ken={s:float(v)/(len(s)+1) for s,(v,_) in zip(spells,logs)}
def summarize(g):
    n=g['spellings'].total()
    return {'n':n,'matched':len(g['pair']),**{k:statistics.median(g[k]) for k in ['pair','single','trigram']},
            'below10Pct':100*sum(x<10 for x in g['pair'])/len(g['pair']),
            'kenLog10PerToken':sum(ken[w]*count for w,count in g['spellings'].items())/n,
            'rarePct':100*g['rare']/n,'realSpellingPct':100*g['real']/n,'duplicateSpellingPct':100*(n-len(g['spellings']))/n}
results={k:{tag:summarize(groups[k,tag]) for tag in ['A','B']} for k,tag in groups}
tops=sorted(moves)[:5]+sorted(moves)[-5:][::-1]
with gzip.open(out/'mover-traces.json.gz','wt') as f:json.dump([{'id':k,'before':full_traces[k][0],'after':full_traces[k][1]} for _,k,*_ in tops],f)
(out/'scores.json').write_text(json.dumps({'train':len(train),'held':len(held),'changes':changes,'scores':results,'pairs':review,'changedPairs':changed_examples,'movers':tops},indent=2)+'\n')
