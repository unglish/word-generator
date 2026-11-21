# usage: python3 diff.py base.jsonl cand.jsonl <issue>  — exhaustive per-seed diff
import json, re, sys, collections
A = {r['seed']: r for r in map(json.loads, open(sys.argv[1]))}
B = {r['seed']: r for r in map(json.loads, open(sys.argv[2]))}
issue = sys.argv[3]
def coda_len(G, k): return sum(1 for h in G[k+1:] if h['si'] == G[k]['si'] and h['pos'] == 'coda')
def onset_len(G, k): return sum(1 for h in G[:k] if h['si'] == G[k]['si'] and h['pos'] == 'onset')
# per issue: does the mechanism apply to this (baseline) word? return label or None
def target(r):
    G = r['G']
    if issue == '471':
        for k, g in enumerate(G):
            if g['p'] == 'ɚ' and g['sel'] == 're' and (coda_len(G, k) or g['sp'] == 'medial'): return 're'
    if issue == '472':
        for k, g in enumerate(G):
            if g['p'] == 'aɪ' and g['sel'] == 'ie' and onset_len(G, k) == 0: return 'ie'
    if issue == '473':
        for k, g in enumerate(G):
            if g['p'] == 'ɔɪ' and g['sel'] == 'oy' and coda_len(G, k): return 'oy'
    if issue == '474a':
        if re.search(r'([^aeiou])\1\1', r['w']): return 'triple'
    if issue == '474b':
        if 'quu' in r['w']: return 'quu'
    if issue == '474c':
        for k, g in enumerate(G):
            if g['p'] == 'n' and g['sel'] == 'gn' and 0 < k < len(G) - 1: return 'gn'
    return None
def sig(r, pick):
    return ' '.join(f"{g['p']}>{g['sel']}" for g in r['G'] if pick(g))
changed = [s for s in A if A[s]['w'] != B[s]['w']]
tg = [s for s in changed if target(A[s])]
other = [s for s in changed if not target(A[s])]
untouched_targets = [s for s in A if target(A[s]) and A[s]['w'] == B[s]['w']]
print(f"changed {len(changed)} / {len(A)}; targeted {len(tg)}; non-targeted {len(other)}; baseline targets unchanged {len(untouched_targets)}")
phon = {'471': 'ɚ', '472': 'aɪ', '473': 'ɔɪ'}.get(issue)
trans = collections.Counter(); ex = collections.defaultdict(list)
for s in tg:
    a, b = A[s], B[s]
    if phon:
        key = f"{sig(a, lambda g: g['p'] == phon)}  →  {sig(b, lambda g: g['p'] == phon)}"
    else:
        key = 'word'
    trans[key] += 1; ex[key].append(f"{s}:{a['w']}→{b['w']}")
for k, v in trans.most_common(): print(f"  {v:4d}  {k}   e.g. {', '.join(ex[k][:5])}")
same_ipa = sum(1 for s in tg if A[s]['ipa'] == B[s]['ipa'])
print(f"targeted with identical pronunciation: {same_ipa}/{len(tg)}")
print("non-targeted changes (first 15):", ', '.join(f"{s}:{A[s]['w']}→{B[s]['w']}" for s in other[:15]))
if untouched_targets: print("targets unchanged:", ', '.join(f"{s}:{A[s]['w']}" for s in untouched_targets[:10]))
json.dump({'changed': changed, 'targeted': tg, 'other': other}, open(f"diff-{issue}.json", 'w'))
same_other = sum(1 for s in other if A[s]['ipa'] == B[s]['ipa'])
print(f"non-targeted with identical pronunciation: {same_other}/{len(other)}")
