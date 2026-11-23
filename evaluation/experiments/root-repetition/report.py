import argparse
import json
from pathlib import Path
p = Path(__file__).parent
parser = argparse.ArgumentParser()
parser.add_argument("--after", required=True)
parser.add_argument("--holdout", required=True)
parser.add_argument("--profiles", required=True)
parser.add_argument("--gates", default="")
args = parser.parse_args()
read = lambda name: json.loads((p / (name + ".json")).read_text())
before, after = read("before"), read(args.after)
hold_before, hold_after = read("holdout-before"), read(args.holdout)
profile_before, profile_after = read("marginals-before")["rows"], read(args.profiles)["rows"]
expected = before["cmuMatched"]
rate = lambda hits, n: f"{100*hits/n:.3f}%"
counts = lambda rows, key: sum(row.get(key, 0) for row in rows.values())
long = lambda rev, start: {k: v for k,v in rev["surface"].items() if int(k) >= start}
print("""Fixes #503, fixes #498.

## Change

English lexicon mode uses positive weights for two root repetition patterns. Nucleus selection in roots of four syllables or more downweights a candidate that would complete three equal vowels in a row. Surface reduction has its own multiplier for changes that would produce such a run.

Both sequential coda construction and the audited root-final table downweight codas whose first sound matches the last sound of the onset. Stronger pressure applies to /l/. Existing coda eligibility rules still apply. The weighting preserves the probability of unpenalized /r s z ŋ/ coda starts within each choice set. This avoids shifting the removed weight into rhotic rimes or other already common starts.

Each selection uses the existing RNG draw. Fixed seeds retain deterministic behavior with the new weights. The golden fixture records the intentional output changes.

## Matched seed evaluation

`generateWord({ mode: "lexicon", seed, trace: true })` on seeds 5,000,000–5,019,999, with default morphology. Baseline is `ce03627a`. The CMU reference contains all 21,197 stripped roots from #492, independently verified with the pinned sources. Roots use the wordlikeness model's maximal attested onsets. CMU rates are weighted to the generated root-length mix. The analysis ignores stress digits except when distinguishing AH0 from stressed AH. Generated surface roots are sliced at their realized offset. Each root counts at most once for each pattern.

| Root pattern | Before | After | Matched CMU roots |
| --- | ---: | ---: | ---: |""")
for label,key in [("Vowel triple, all roots","triple"), ("Adjacent vowel pair, including triples","pair"),
                  ("Matching onset-final/coda-initial consonants","mirror"), ("/l/ match","mirror:l"),
                  ("/n/ match","mirror:n"), ("/t/ match","mirror:t"), ("/k/ match","mirror:k"), ("/s/ match","mirror:s")]:
    x,y = before["totals"].get(key,0),after["totals"].get(key,0)
    print(f"| {label} | {x:,} ({rate(x,before['count'])}) | {y:,} ({rate(y,after['count'])}) | {rate(expected[key],before['count'])} |")
for start, entire_tail in [(3,False),(4,False),(5,True)]:
    bs = long(before,start) if entire_tail else {str(start):before["surface"][str(start)]}
    ats = long(after,start) if entire_tail else {str(start):after["surface"][str(start)]}
    denom = counts(bs,"words")
    ref = sum(bs[k]["words"] * before["cmu"][k].get("triple",0) / before["cmu"][k]["words"] for k in bs)
    x,y = counts(bs,"triple"),counts(ats,"triple")
    print(f"| Vowel triple, {start}{'+' if entire_tail else ''} syllables | {x}/{denom} ({rate(x,denom)}) | {y}/{counts(ats,'words')} ({rate(y,counts(ats,'words'))}) | {rate(ref,denom)} |")
print()
print(f"The holdout (seeds 6,000,000–6,019,999) moved from {hold_before['totals']['triple']} to {hold_after['totals']['triple']} triples "
      f"and from {hold_before['totals']['mirror']:,} to {hold_after['totals']['mirror']:,} matching consonants.")
print()
print("## Trace attribution")
print()
for base in ("generated","lexical","surface"):
    x,y = counts(before[base],"triple"),counts(after[base],"triple")
    print(f"- Triple counts at {base} went {x} → {y}.")
print(f"- Surface /ɪ/ triples went {before['totals']['triple:ɪ']} → {after['totals'].get('triple:ɪ',0)} against {expected['triple:ɪ']:.1f} expected. "
      f"Schwa triples went {before['totals']['triple:ə']} → {after['totals'].get('triple:ə',0)} against {expected['triple:ə']:.1f} expected.")
print(f"- In the baseline, {before['attribution']['triple:001']} of the surface triple hits first appeared after lexical selection. "
      "An earlier generation-only trial left 100 surface triples on the same seeds, motivating the reduction multiplier.")
for name,row in read("witnesses-refined").items():
    quote = lambda s: " ".join("".join(y) for y in s)
    phase = "surface" if name == "reductionOnly" else "generated"
    stage = "generatePronunciation" if name == "reductionOnly" else "generateSyllables"
    control = " with only the reduction multiplier toggled" if name == "reductionOnly" else ""
    a,b = row['before'], row['after']
    print(f"- Seed {row['seed']:,}{control}, `{a['spelling']}` → `{b['spelling']}`. "
          f"`{stage}` shows /{quote(a[phase])}/ → /{quote(b[phase])}/.")
print("""
## Side effects

The phoneme comparison below uses 50,000 words per profile and revision, sampled
from the five development RNG streams in the committed quality protocol. JS uses
the full CMU phoneme reference. Bare-root TV uses the audited stage reference.
Text mode is outside the calibrated lexicon policy. A separate 2,000-seed
comparison verified exact text-mode word and trace parity with the baseline.
""")
print("| Profile | Phoneme JS (bits) | Phoneme TV (pp) |")
print("| --- | ---: | ---: |")
for a,b in zip(profile_before, profile_after):
    print(f"| {a['id']} | {a['jensenShannonBits']:.6f} → {b['jensenShannonBits']:.6f} | {a['totalVariationPct']:.3f} → {b['totalVariationPct']:.3f} |")
print()
for label,key in [("#509 rhotic onset plus rhotic rime","rhoticOnset"),("Tense nucleus plus coda /r/","tenseR"),("/ə ʌ/ plus coda /r/","reducedR"),("Root-final /ɚl/","finalRhoticL")]:
    a,b = [sum(r["totals"].get(key,0) for r in group) for group in [(before,hold_before),(after,hold_after)]]
    print(f"- {label} in both traced cohorts (40,000 roots per side) went {a:,} → {b:,}.")
for label,key in [("Mean phones","phones"),("Mean letters","letters"),("Mean syllables","syllables"),("Mean CMU normalized spelling log score","wordlikeness")]:
    print(f"- {label} went {before['means'][key]:.4f} → {after['means'][key]:.4f}.")
print(f"- Primary trigram JS went {before['trigramDistance']['jensenShannonBits']:.6f} → {after['trigramDistance']['jensenShannonBits']:.6f} bits.")
if args.gates:
    print("\n" + args.gates)
