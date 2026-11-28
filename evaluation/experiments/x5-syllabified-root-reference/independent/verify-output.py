"""Verify every exported reference row and all native/cell counts against independently read inputs."""
import collections as c
import json
import pathlib
import sys
work,out=map(pathlib.Path,sys.argv[1:3]); repo=pathlib.Path.cwd()
source=(work/'cmudict.dict').read_text().splitlines()
phase=json.loads((work/'root.json').read_text())['artifact']
expect_agg=json.loads((work/'independent-counts.json').read_text())
root_by={r['spelling']:r for r in phase['roots']}
excluded=set(sum(json.loads((repo/'evaluation/corpus/root-coda-exclusions.json').read_text()).values(),[]))
surfaces=c.defaultdict(list)
for r in phase['ledger']:
    if r['status']=='included' and r['stem'] not in excluded: surfaces[r['stem']].append({k:r[k] for k in ('stem','line','spelling')})
projection=json.loads((repo/'data/cmu/phoneme-normalization.json').read_text())['arpabetToIpa']
frozen={tuple(s.split()) for s in json.loads((repo/'evaluation/review/wordlikeness/artifacts/reference-v1.json').read_text())['model']['initial_onsets']}
def is_vowel(t): return t[-1] in '012'
def vowels(t): return [i for i,p in enumerate(t) if is_vowel(p)]
onsets=c.Counter(tuple(t[:vowels(t)[0]]) for t in (root_by[s]['tokens'] for s in surfaces))
legal={'304':frozen,'audited':set(onsets)|{()},'audited-min3':{k for k,n in onsets.items() if n>=3}|{()}}
report=json.loads((out/'reference.json').read_text()); rows=0;seen=set();beg_idx=-1
per_column={}
for kind in ('distinct','surfaceWeighted'):
 for pol in [p['policy'] for p in report['policies']]:
    per_column[kind,pol]=c.defaultdict(lambda:c.defaultdict(c.Counter))
def hist_table(x):return {k:{'counts':dict(v),'total':sum(v.values())} for k,v in x.items()}
for line in (out/'mapped-roots.jsonl').open():
 r=json.loads(line); stem=r['source']['spelling']; entry=root_by[stem]; tokens=entry['tokens']; indices=vowels(tokens)
 assert stem not in seen and r['source']['line']>beg_idx; seen.add(stem);beg_idx=r['source']['line']
 assert r['source']['line']==entry['line'] and r['source']['label']==entry['label']
 assert source[entry['line']-1].split('#',1)[0].split()==[entry['label'],*tokens]
 assert r['surfaces']==surfaces[stem]
 assert [p['raw'] for p in r['phones']]==tokens
 for i,(t,p) in enumerate(zip(tokens,r['phones'])):
    base=t[:-1] if is_vowel(t) else t; fit=p['fit']; assert p['index']==i and p['comparison']==base
    assert p['stress']==(int(t[-1]) if is_vowel(t) else 'not-applicable')
    assert p['kind']==('vowel' if is_vowel(t) else 'consonant')
    if base=='ER':
        assert fit['status']=='ambiguous' and {alt['sound'] for alt in fit['alternatives']}=={'ɚ','ɜ'}
    else:
        expected='ʌ' if t in ('AH1','AH2') else projection[base]; identity='english-legacy:'+'-'.join(f'{ord(c):x}' for c in expected)
        assert fit['status']=='permitted' and fit['sound']==expected and fit['identityId']==identity; assert fit['basis']==('convention' if base in ('OW','AH') else 'identity')
 for pol,s in r['splits'].items():
    if pol in legal:
        assert s['status']=='inferred'
        for v,n,b in zip(indices,indices[1:],s['boundaries']):
            all_splits=[k for k in range(n-v) if tuple(tokens[v+1+k:n]) in legal[pol]]
            assert b['leftNucleus']==v and b['rightNucleus']==n and b['chosenCodaSize']==min(all_splits)
            assert [x['codaSize'] for x in b['splits'] if x['licensed']]==all_splits
    if s['status']=='unavailable':continue
    syl=s['syllables']; assert len(syl)==len(indices) and [v for part in syl for slot in ('onset','nucleus','coda') for v in part[slot]]==list(range(len(tokens)))
    for j, (sy,vi) in enumerate(zip(syl,indices)):
      assert sy['nucleus']==[vi]
      if j<len(indices)-1: assert len(sy['coda'])==s['boundaries'][j]['chosenCodaSize']
      for name,ind,context in [('onset',sy['onset'],'initial' if j==0 else 'medial'),('rime',sy['nucleus']+sy['coda'],'final' if j==len(syl)-1 else 'medial')]:
        fitted=all(r['phones'][i]['fit']['status']=='permitted' for i in ind); bucket='permitted' if fitted else 'withheld'
        key=' '.join(r['phones'][i]['fit']['identityId'] if fitted else tokens[i] for i in ind)
        for kind,weight in [('distinct',1),('surfaceWeighted',len(r['surfaces']))]: per_column[kind,pol][name,bucket][context+':'+tokens[vi][-1]][key]+=weight
 rows+=1
assert rows==20851 and seen==set(surfaces)
for policy in report['policies']:
 for kind,tag in [('distinct','distinct'),('surfaceWeighted','phase2')]:
    t=policy[kind]; e=expect_agg['populations'][tag]; assert t['nativePhones']['total']==e['phones']; assert t['nativePhones']['counts']==e['nativePhoneCounts']; assert t['nativeAdjacentPairs']['counts']==e['nativeInternalPairs']; assert t['nativeBoundedPairs']['total']==e['boundaryInclusiveEvents'];assert t['completeCase']['adjacentPairs']['total']==e['eligiblePairs']['whole eligible rows']
    for cat in ('onset','rime'):
      for bucket in ('permitted','withheld'):
        target=hist_table(per_column[kind,policy['policy']][cat,bucket]); assert t[cat][bucket]==target, (kind,policy['policy'],cat,bucket)
for p in out.glob('generated-*.json'):
 rep=json.loads(p.read_text()); g=expect_agg['generated'][f"gold-{rep['seed']}.jsonl.gz"]; totals=rep['totals']['counts']; assert rep['words']==10000
 for k,cnt in g.items():
    assert totals[k+'/boundary:match']==cnt['correct']; assert totals[k+'/boundary:disagree']==cnt['boundaries']-cnt['correct']; assert totals[k+'/root:match']==10000-cnt['poly']+cnt['polyExact']
print('Verified every source row, weight, phone, mapping, supported split, fitted/withheld onset and rime bin for all four policies and both populations, every native phone/pair bin, #304 controls, and all three independently reconstructed dictionary policies on every generated shard supplied.')
