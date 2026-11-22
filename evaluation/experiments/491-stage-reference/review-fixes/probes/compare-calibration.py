"""Compare baseline and branch public-API streams using the final pinned references."""
import json
from pathlib import Path
from statistics import mean, stdev

here = Path(__file__).resolve().parent
refs = json.loads(Path('evaluation/corpus/stage-references.json').read_text())
keys = ["ʃ", "t", "ŋ", "ə", "z"]

def metrics(counts, reference):
    gtotal, rtotal = sum(counts.values()), sum(reference.values())
    g = {p: 100 * n / gtotal for p, n in counts.items()}
    p = {p: 100 * n / rtotal for p, n in reference.items()}
    gaps = {sound: g.get(sound, 0) - p.get(sound, 0) for sound in g.keys() | p.keys()}
    return {
        "TV": sum(map(abs, gaps.values())) / 2,
        **{f"{phone} ratio": g[phone] / p[phone] for phone in keys},
        **{f"{phone} pp": gaps[phone] for phone in keys},
    }

def summary(values):
    return {'min':min(values),'max':max(values),'mean':mean(values),'sd':stdev(values)}

comparisons={}
for stage, label in [('roots','roots'), ('fullCmu','full')]:
    main=json.loads((here/f'main-{label}.json').read_text())['results']
    branch=json.loads((here/f'final-{label}.json').read_text())['results']
    assert len(main)==len(branch)==30
    assert {r['seed'] for r in main}=={r['seed'] for r in branch}
    a = {r["seed"]:metrics(r["counts"], refs[stage]["phonemes"]) for r in main}
    b = {r["seed"]:metrics(r["counts"], refs[stage]["phonemes"]) for r in branch}
    comparisons[stage]={metric:{
        "before":summary([a[s][metric] for s in a]),
        "after":summary([b[s][metric] for s in a]),
        "pairedDelta":summary([b[s][metric]-a[s][metric] for s in a]),
    } for metric in a[42]}
print(json.dumps(comparisons, ensure_ascii=False,indent=2))
