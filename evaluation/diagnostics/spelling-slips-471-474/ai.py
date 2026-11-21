# usage: python3 ai.py f1.jsonl [f2 ...] — onsetless /aɪ/ spelling shares and initial patterns
import json, sys, collections, re
for f in sys.argv[1:]:
    allc = collections.Counter(); initc = collections.Counter(); starts = collections.Counter(); ex = collections.defaultdict(list)
    evowel = 0; is_ = collections.Counter()
    for l in open(f):
        r = json.loads(l); G = r['G']; pre = (r['m'] or {}).get('pre')
        for k, g in enumerate(G):
            if g['p'] != 'aɪ' or g['pos'] != 'nucleus': continue
            on = sum(1 for h in G[:k] if h['si'] == g['si'] and h['pos'] == 'onset')
            if g['sel'] == 'is': is_['before l' if k + 1 < len(G) and G[k+1]['p'] == 'l' else 'other'] += 1
            if on: continue
            allc[g['sel']] += 1
            if g['si'] == 0:
                initc[g['sel']] += 1
                if not pre:
                    starts[r['w'][:3]] += 1; ex[r['w'][:3]].append(r['w'])
                if g['sel'] == 'ie' and re.match(r'^i[^aeiouy]e[aeiouy]', r['w'][len(pre or ''):]): evowel += 1
    t = sum(allc.values()); ti = sum(initc.values())
    print(f"== {f}")
    print("  onsetless /aɪ/ all positions:", t, {k: f"{v} ({100*v/t:.0f}%)" for k, v in allc.most_common()})
    print("  onsetless root-initial /aɪ/:", ti, {k: f"{v} ({100*v/ti:.0f}%)" for k, v in initc.most_common()})
    print("  /aɪ/ is:", dict(is_), " initial i_e + vowel letter:", evowel)
    print("  top word starts (no prefix):", ', '.join(f"{k}:{v}" for k, v in starts.most_common(14)))
