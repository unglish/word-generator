# usage: python3 final.py base.jsonl cand.jsonl — classify every changed word by issue
import json, re, sys, collections
A = {r['seed']: r for r in map(json.loads, open(sys.argv[1]))}
B = {r['seed']: r for r in map(json.loads, open(sys.argv[2]))}
def coda_len(G, k): return sum(1 for h in G[k+1:] if h['si'] == G[k]['si'] and h['pos'] == 'coda')
def onset_len(G, k): return sum(1 for h in G[:k] if h['si'] == G[k]['si'] and h['pos'] == 'onset')
def targets(r):
    G, w, t = r['G'], r['w'], set()
    for k, g in enumerate(G):
        if g['p'] == 'ɚ' and g['sel'] == 're' and (coda_len(G, k) or g['sp'] == 'medial'): t.add('471')
        if g['p'] == 'aɪ' and g['sel'] == 'ie' and onset_len(G, k) == 0: t.add('472')
        if g['p'] == 'aɪ' and g['sel'] == 'is' and not (k + 1 < len(G) and G[k+1]['p'] == 'l'): t.add('472-is')
        if g['p'] == 'ɔɪ' and g['sel'] == 'oy' and coda_len(G, k): t.add('473')
        if g['p'] == 'aʊ' and g['sel'] == 'ow' and k + 1 < len(G) and G[k+1]['p'] == 't': t.add('473-ow')
        if g['p'] == 'n' and g['sel'] == 'gn' and 0 < k < len(G) - 1: t.add('474c')
    if re.search(r'([^aeiou])\1\1', w): t.add('474a')
    if 'quu' in w: t.add('474b')
    return t
changed = [s for s in A if A[s]['w'] != B[s]['w']]
cls = collections.Counter(); tg = []
for s in changed:
    t = targets(A[s])
    if t: tg.append(s); [cls.__setitem__(x, cls[x] + 1) for x in t]
other = [s for s in changed if s not in set(tg)]
same_ipa = sum(1 for s in other if A[s]['ipa'] == B[s]['ipa'])
print(f"words {len(A)}; changed {len(changed)}; targeted {len(tg)} {dict(cls)}; RNG-shifted {len(other)} (same pronunciation {same_ipa}, different {len(other)-same_ipa})")
leftover = collections.Counter()
for s in B:
    for x in targets(B[s]): leftover[x] += 1
print("target patterns remaining in candidate:", dict(leftover))
base_t = collections.Counter()
for s in A:
    for x in targets(A[s]): base_t[x] += 1
print("target patterns in baseline:", dict(base_t))
json.dump({'changed': changed, 'targeted': tg, 'other': other}, open('final-diff.json', 'w'))
