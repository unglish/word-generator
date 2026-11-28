"""Independent X5 check. Run from the repository root against the work directory argument."""
import collections as c
import gzip
import hashlib
import importlib.util
import json
import pathlib
import sys

repo = pathlib.Path.cwd()
work = pathlib.Path(sys.argv[1])
frozen = json.loads((repo/'evaluation/review/wordlikeness/artifacts/reference-v1.json').read_text())['model']
verifier_path = work/'phase1/evaluation/corpus/verify-joint.py'
spec = importlib.util.spec_from_file_location('independent_q15', verifier_path)
q15 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(q15)
raw = (work/'cmudict.dict').read_bytes()
assert hashlib.sha256(raw).hexdigest() == q15.parser.SOURCE_SHA
entries, rejections, excluded, records = q15.parser.count_source(raw.decode())
assert q15.reconstruct_derived(entries, excluded) == frozen
native = {entry['spelling']:entry for entry in entries}
phase = json.loads((work/'root.json').read_text())
assert phase['digest'] == '2eacf788dd396e5207908c613d6689390e462d0488fa6e847606e08c124ce467'
source_roots = phase['artifact']['roots']
assert all(native[r['spelling']] == r for r in source_roots)
exclude = set(sum(json.loads((repo/'evaluation/corpus/root-coda-exclusions.json').read_text()).values(), []))
weights = c.Counter(r['stem'] for r in phase['artifact']['ledger'] if r['status']=='included' and r['stem'] not in exclude)
assert len(weights) == 20851 and sum(weights.values()) == 42670
phones_by_stem = {stem:native[stem]['tokens'] for stem in weights}
def vowel(token): return token[-1] in '012'

def get_onset(tokens): return tuple(tokens[:next(i for i,p in enumerate(tokens) if vowel(p))])

onset_counts = c.Counter(get_onset(t) for t in phones_by_stem.values())
policies = {'304':{tuple(k.split()) for k in frozen['initial_onsets']}, 'audited':set(onset_counts)|{()}, 'audited-min3':{k for k,n in onset_counts.items() if n>=3}|{()}}

def analyze_dictionary(stems):
    phones, pairs, slots, fit_pairs = c.Counter(), c.Counter(), c.Counter(), c.Counter()
    full_fit, fit_phones, fit_words_phones = 0,0,0
    for stem, w in stems.items():
        tokens = phones_by_stem[stem]
        usable = all(not t.startswith('ER') for t in tokens)
        full_fit += w * usable
        fit_words_phones += w*len(tokens)*usable
        for t in tokens: phones[t] += w
        fit_phones += w*sum(not t.startswith('ER') for t in tokens)
        for a,b in zip(tokens,tokens[1:]):
            pairs[a+' '+b] += w
            fit_pairs['identity-eligible endpoints'] += w*(not a.startswith('ER') and not b.startswith('ER'))
            fit_pairs['whole eligible rows'] += w*usable
        for v in tokens:
            if vowel(v): slots['nuclei']+=w
    return {'rows':sum(stems.values()),'phones':sum(phones.values()),'internalPairs':sum(pairs.values()),'nativePhoneCounts':phones,'nativeInternalPairs':pairs,'boundaryInclusiveEvents':sum(phones.values())+sum(stems.values()),'nuclei':slots['nuclei'],'completeFitRows':full_fit,'eligiblePhones':fit_phones,'completeFitRowPhones':fit_words_phones,'eligiblePairs':fit_pairs}

def predicted(cluster, legal):
    for coda in range(len(cluster)+1):
        if tuple(cluster[coda:]) in legal: return coda
    raise AssertionError('Empty onset required')

report = {'populations':{'distinct':analyze_dictionary(dict.fromkeys(weights,1)),'phase2':analyze_dictionary(weights)}, 'onsetInventorySizes':{k:len(v) for k,v in policies.items()},'frozen304BinsVerified':sum(len(d['counts']) for d in frozen['constituents'].values()),'generated':{}}
for shard in sorted(work.glob('gold-*.jsonl.gz')):
    counters = {k:c.Counter() for k in policies}
    with gzip.open(shard, 'rt') as infile:
        for line in infile:
            draw=json.loads(line)
            syl = [item['slots'] for item in draw['root']]
            for name, onsets in policies.items():
                counts=counters[name]; correct=0
                counts['roots']+=1
                if any(len(n)!=1 for _,n,_ in syl): counts['unsupported']+=1; continue
                counts['poly'] += len(syl)>1
                for left,right in zip(syl,syl[1:]):
                    lc = left[2]; ro=right[0]; cluster=[p[1] for p in lc+ro]
                    given=len(lc); inferred=predicted(cluster,onsets)
                    correct+=given==inferred
                    counts['boundaries']+=1
                    counts['correct']+=given==inferred
                    counts['codaToOnset']+=max(given-inferred,0)
                    counts['onsetToCoda']+=max(inferred-given,0)
                    if len(cluster)==1:
                        counts['singletonBoundaries']+=1
                        counts['singletonCorrect']+=given==inferred
                counts['polyExact'] += len(syl)>1 and correct==len(syl)-1
    report['generated'][shard.name]=counters
with (work/'independent-counts.json').open('w') as out:
    json.dump(report,out,ensure_ascii=False,sort_keys=True,indent=2)
    out.write('\n')
print('onset inventories:', report['onsetInventorySizes'], 'frozen #304 constituent cells:',report['frozen304BinsVerified'])
for name,res in report['populations'].items(): print(name, {k:v for k,v in res.items() if k not in ('nativePhoneCounts','nativeInternalPairs')})
for shard,counts in report['generated'].items(): print(shard, {k:(v['correct'],v['boundaries'],v['polyExact'],v['poly']) for k,v in counts.items()})
