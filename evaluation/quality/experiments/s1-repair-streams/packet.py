"""Render the measured review packet after review.py. Usage: python3 packet.py evidence-dir"""
import collections,csv,gzip,json,sys
from pathlib import Path
p=Path(sys.argv[1]); out=p/'packet'
s=json.loads((out/'scores.json').read_text())
profiles=list(s['changes'])
sections=[]
def table(head,rows):
    return '\n'.join(['| '+' | '.join(head)+' |','| '+' | '.join('---' for _ in head)+' |']+['| '+' | '.join(map(str,row))+' |' for row in rows])
def display(w):return f"{w['word']} /{w['ipa'].strip('/')}/"
def delta(row,metric,fmt='.3f'):
    a=row['A'][metric];b=row['B'][metric]
    return f'{a:{fmt}} → {b:{fmt}}'
sections.append('''# Per-attempt boundary and hiatus streams

Both revisions run the legacy-weighted engine. A shares the selection stream, B gives each root helper its own stream. The quality harness pairs all 200,000 development draws per revision by profile, seed and position. Each pair has the same word key. The forced bare monosyllable cohort must match byte for byte, including full traces.

The scoring probe follows the held-out-fold design in `archive/issue-555-selection-strategy` (`b1.py`). It uses the 45,904-entry spelling and phone reference from `archive/pr-553`, fits on folds 0–3, and compares to fold 4 peers of the same phone count (at least 30 entries). These are full-word guide scores, before the audited-root E1 scorer. Positional UCI single and pair scores rank the sum of position counts. The length-matched phone trigram ranks mean log probability with the archive's 0.1 smoothing. Rare means some adjacent pair occurs in four or fewer training words. Real and duplicate are measured on spelling, with repeats retained. KenLM is a character five-gram trained on the same four folds of spellings, with boundaries, measured in mean log10 probability per letter plus end marker. KenLM recognized every character in the sample.''')
sections.append(f"The reference contains {s['train']:,} training words and {s['held']:,} held-out words. The pooled root-length breakdown combines all four protocol profiles and therefore oversamples forced monosyllables. Per-seed results are in `scores.json`.")
sections.append('## Matched output\n\n'+table(['Profile','Pairs','Spelling or IPA changed','Full word or trace changed','Selected index changed'],[[k,v['draws'],v.get('surface',0),v.get('full_trace_or_word',0),v.get('selected_attempt',0)] for k,v in s['changes'].items()]))
rows=[]
for group in profiles+['root syllables 1','root syllables 2','root syllables 3','root syllables 4+']:
    row=s['scores'][group]
    rows.append([group,delta(row,'matched','d'),*[delta(row,m) for m in ['pair','below10Pct','single','trigram','kenLog10PerToken','rarePct','realSpellingPct','duplicateSpellingPct']]])
sections.append('## Guide metrics, A → B\n\n'+table(['Sample','Same-length peers available (draws)','Median pair pctile','Below pair p10 (%)','Median single pctile','Median trigram pctile','KenLM','Rare (%)','Real (%)','Duplicates (%)'],rows))
before=json.loads((p/'a-rejections.json').read_text())['streams'];after=json.loads((p/'b-rejections.json').read_text())['streams']
counts={}
for tag,rs in [('A',before),('B',after)]:
    for profile in profiles:
        count=collections.Counter(); selected=collections.Counter(); outcomes=collections.Counter()
        for r in rs:
            if r['profile']==profile: count.update(r['attemptsExecuted']); selected.update(r['selectedAttempts']); outcomes.update(r['outcomes'])
        counts[profile,tag]={'hist':count,'selected':selected,'outcomes':outcomes,'mean':sum(int(k)*v for k,v in count.items())/sum(count.values())}
sections.append('## Retry distribution\n\nThe rejection audit checks 1,000 paired draws for each of five development seeds per profile. Retries equal attempts executed minus one.\n\n'+table(['Profile','Mean attempts A → B','Exact A → B','Relaxed A → B','Fallback A → B'],[[prof, f"{counts[prof,'A']['mean']:.4f} → {counts[prof,'B']['mean']:.4f}",*[f"{counts[prof,'A']['outcomes'][m]} → {counts[prof,'B']['outcomes'][m]}" for m in ('exact','relaxed','fallback')]] for prof in profiles]))
sections.append(table(['Attempts executed']+profiles,[[i]+[f"{counts[prof,'A']['hist'][str(i)]} → {counts[prof,'B']['hist'][str(i)]}" for prof in profiles] for i in range(1,21)]))
sections.append(table(['Selected attempt (zero-based)']+profiles,[[i]+[f"{counts[prof,'A']['selected'][str(i)]} → {counts[prof,'B']['selected'][str(i)]}" for prof in profiles] for i in range(20)]))
for title,rows in [('Unfiltered paired words (first draw of every seed stream)',s['pairs']),('First 20 changed spellings, in protocol order',s['changedPairs'])]:
    sections.append('## '+title+'\n\n'+table(['Profile','Seed / draw','Before','After'],[[name,f'{seed} / {i}',display(a),display(b)] for name,seed,i,a,b in rows]))
sections.append('## Largest UCI pair percentile moves in each direction\n\n'+table(['Profile','Seed / draw','Before','After','Pair percentile A → B','Selected attempt A → B'],[[prof,f'{seed} / {i}',display(a),display(b),f'{pa:.2f} → {pb:.2f}',f"{a['selected']} → {b['selected']}"] for d,(prof,seed,i),pa,pb,a,b in s['movers']]))
with gzip.open(out/'mover-traces.json.gz','rt') as f:traces=json.load(f)
def describe(w):
    t=w['trace']; st=t['stages'][0]
    assert st['name']=='generateSyllables'
    root='.'.join(''.join(z for pos in ('onset','nucleus','coda') for z in syl[pos]) for syl in st['after'])
    events=[f"{e['event']}@{e.get('rightSyllableIndex','?')}" for e in t['structural'] if 'BoundaryDrop' in e['event'] or e['event'] in ('boundaryDrop','vowelHiatusFallback')]
    return root+(' ('+', '.join(events)+')' if events else '')
sections.append('These are the selected attempts. A changed winning index can expose a different plan in the public trace. The full stage snapshots, structural events, repairs, grapheme selections, and morphology records are in `mover-traces.json.gz`.\n\n'+table(['Profile / seed / draw','Generated root A','Generated root B'],[[' / '.join(map(str,t['id'])),describe(t['before']),describe(t['after'])] for t in traces]))
(out/'review.md').write_text('\n\n'.join(sections)+'\n')
