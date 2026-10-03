# Nucleus segment edges

Q07 separates a nucleus segment's position in the generated base word from the
legacy syllable-position weights. This is a narrow inventory migration: FOOT /ʊ/
must be available inside closed final rimes while remaining forbidden at an
actual open base-word edge. No frequencies or distribution gates are tuned.

## Inventory audit and contract

Legacy `startWord`, `midWord`, and `endWord` do not consistently describe literal
segments. Onset selection sees the first-syllable flag, coda selection sees the
last-syllable flag, and nucleus selection sees both. A nucleus in a monosyllable
must pass both filters; weighting then prefers its initial weight. Grapheme
position fields have their own syllable-based contract and are unchanged here.

The inventory's zero position weights are /ʊ/ at the end, /ŋ/ at the start, /h/ at
the end, and /ʒ/ at both ends. Only /ʊ/ is migrated. /ŋ/ already has zero onset
weight, /h/ zero coda weight, and /ʒ/ needs a separate distributional audit before
changing its restriction. All other phoneme position weights remain unchanged.

An optional structured `nucleusWordPosition: { initial, medial, final }` overrides
the legacy position tuple only during nucleus selection. Its scope is each
nucleus segment in the generated base/root word, before affix assembly. Consonant
clusters retain their existing semantics. /ʊ/ keeps its existing numeric tuple
`{ initial: 2, medial: 2, final: 0 }`; its old fields remain for compatibility.
Weights must be finite and nonnegative; zero excludes the corresponding position.
An isolated nucleus segment is both initial and final and must satisfy both
restrictions. A zero on either edge forbids it. Otherwise the initial weight
has precedence, matching the existing simultaneous-edge weighting convention.

The initial generation decision uses the realized onset and planned coda.
Structure repair can remove a coda, so shared eligibility is checked again on
the actual base word after stress and structure changes, before spelling or
pronunciation. Stress-driven nucleus replacement uses the same eligibility.
Its relative replacement weights remain the existing nucleus-only weights;
the new positional tuple changes hard eligibility in that pass, not its weights.
Actual validation accounts for each segment's index within a multi-segment
nucleus. If no eligible replacement exists, generation reports an incompatible
configuration instead of emitting a prohibited nucleus.
The current root sampler continues to generate one nucleus segment per syllable;
this change does not add multi-segment nucleus sampling.

This can alter the proposal distribution and retry stream; it is not an output
parity change. The general checked-vowel and nucleus/coda compatibility work is
Q10. In particular, this PR does not fix /æŋ/ or reinterpret `tense`.
The replacement pool can still select another checked vowel, such as /æ/, at an
open final edge under those legacy rules. The supplementary probe reports repair
transitions and how often the resulting base ends in another open checked vowel;
removing open final /ʊ/ alone does not establish legality of the whole rime.
Integration with Q04/PR #309 must retain this check after its final lexical stress pass and
before surface realization, with an explicit decision about base-word versus
assembled-word coordinates.

## Preregistered evidence

Use the frozen development protocol: four profiles, five fixed development seeds
per profile, 10,000 continuous draws per stream, 200,000 words. Analyze the same
original and candidate archives with one pinned supplementary evaluator. Keep
the original archives immutable and retain their integrity checks, generator and
evaluator fingerprints, and full trace witnesses.

The supplementary probe depends on the archive integrity reader and canonical
serialization from [Q00 / PR #307](https://github.com/unglish/word-generator/pull/307).
Install that foundation's top-level `evaluation/quality/*.ts` files and
`protocol.json`, using frozen evaluator fingerprint
`ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`.
This is a tooling prerequisite; the runtime change remains independent. Run the
same probe on each archive (the probe is outside the core evaluator fingerprint):

```sh
node --import tsx evaluation/quality/probes/nucleus-edges.ts --run /path/to/original --out memory/nucleus-original.json
node --import tsx evaluation/quality/probes/nucleus-edges.ts --run /path/to/candidate --out memory/nucleus-candidate.json
```

Required outcomes:

- Nonzero /ʊ/ coverage in closed final base syllables and closed standalone
  monosyllables, with eligible syllable denominators reported by profile/seed.
- Zero /ʊ/ at an open final base edge after repairs, and zero in the final surface
  word at an open final edge, including stress-replacement cases.
- Report generated-stage versus post-repair base nuclei separately from final
  surface nuclei. Report actual morphology and returned length strata; missing
  historical stages remain unavailable rather than being counted as clean.
- Public-API deterministic fixtures cover closed final eligibility, open-edge
  exclusion, coda deletion, stress replacement, legacy custom configurations,
  explicit overrides, and trace/no-trace output and RNG equality.
- Run the unchanged full quality comparison, unit/quality suites, strict type
  check, and performance gates. Report all regressions and diversity changes.

These fixtures and frozen samples test a representational coverage correction
and its edge constraint. They do not establish population-wide correctness or
human wordlikeness and preference gains.

## Local validation

The full unit suite passed 410 tests with one skipped; all 12 unchanged quality
tests passed. After adding the explicit /ʊ/→/æ/ scope witness, all 14 Q07 targeted
tests passed. Strict project and probe type checks and focused lint passed. Isolated
performance measured 7,287 words/second against the 4,500 floor, with median batch
variance 1.37× against the 3× limit. These are gate results, not evidence of a
performance improvement.

## Frozen development results

The [supplementary comparison](../evaluation/experiments/nucleus-word-edges/nucleus-comparison.json)
records all profile/seed counts and report hashes. The complete compressed
[original](../evaluation/experiments/nucleus-word-edges/nucleus-original.json.gz)
and [candidate](../evaluation/experiments/nucleus-word-edges/nucleus-candidate.json.gz)
reports retain morphology/length strata, full traced witnesses, and evaluator
source. Both runs contain 200,000 words with every required stage observed.
The same probe fingerprint was used for both:
`70246cd35d937832791df5144e1c9d2dd6410fcc3ed4e43eea71140f553f5fec`.

FOOT in closed final base syllables, measured immediately before spelling:

| Profile | Original FOOT / eligible | Candidate FOOT / eligible |
| --- | ---: | ---: |
| lexicon-default | 5 / 35,132 | 666 / 35,176 |
| lexicon-bare | 7 / 40,733 | 841 / 40,775 |
| monosyllables-bare | 0 / 49,178 | 540 / 49,148 |
| text-default | 3 / 34,825 | 459 / 34,846 |

Every one of the 20 candidate seed streams contains both closed final and closed
monosyllabic base FOOT. The initial generation stage goes from zero final-base
FOOT to 2,484 cases; the original's 15 closed-final cases arose only later in
stress replacement. Open final FOOT falls from 3 / 40,132 to 0 / 40,055 in
prepared bases and from 2 / 30,880 to 0 / 31,130 in final surface words.

No selected default candidate exercised `repairNucleusWordPositions`: the
replacement transition and open-checked-after-repair denominators are zero.
That does not establish safety of the unobserved path. Custom-configuration tests
force coda removal and retain traces of both /ʊ/→/u/ and /ʊ/→/æ/; the latter leaves
an open checked vowel that remains Q10 work. No general rime-legality claim is
made. A separate Python reader and flattened segment counter independently
matched all four prepared-base counts for one complete 10,000-draw original and
candidate stream, including an original open-final violation.

The [full frozen comparison](../evaluation/experiments/nucleus-word-edges/comparison.md)
contains every unchanged, improved, and worsened diagnostic. In particular:

- Bare lexicon phoneme divergence increases from 0.000168 to 0.000573 bits and
  trigram divergence from 0.183856 to 0.184700 bits. Missing reference trigram mass
  increases from 0.049072 to 0.057138; zero-total-weight grapheme-choice words
  increase from 3,016 to 3,133 out of 50,000.
- Text-mode open checked vowels increase from 966 to 1,046 out of 50,000.
  Morphological hiatus fallback rises from 4,481 / 22,557 actually affixed words
  to 4,559 / 22,326; the disyllabic stress-clash rate also increases.
- Unique spelling counts increase in default lexicon, forced monosyllables, and
  text mode; bare lexicon uniqueness is unchanged. All existing quality gates
  passed without threshold changes.

These are changed stream distributions, not paired-word causal estimates. The
result supports the preregistered FOOT coverage and edge correction in this
sample while leaving the broader linguistic tradeoffs visible. Candidate runtime
source fingerprint:
`b82040120f95f742eac8eb9ef50b5391998f11b75ffa494502ea5a4e0d7f23cf`.

## Cumulative reproduction after Q06 — 2026-10-03

The [current composition checkpoint](../evaluation/experiments/nucleus-word-edges/current-composition-2026-10-03/README.md)
adds a fresh complete measurement of candidate `fa8c537` against merged control
`233b455`, with the original four-profile, five-development-seed, 10,000-word
schedule and frozen evaluator unchanged. Both 200,000-word captures authenticate;
all 400,000 complete words/traces replay exactly through untouched public APIs.
An independent Python recount agrees with every core diagnostic, distribution,
actual stratum, nucleus/morphology counter, sample, and bounded full witness.
All measured source pins remain unchanged. Earlier results above remain bound
to their original standalone revisions.

Prepared closed-final FOOT remains 15/159,868 to 2,506/159,945, and output
open-final FOOT remains 2/30,880 to 0/31,130. Resolved morphology survives:
control preserves 248/248 eligible `im` forms and candidate 243/243; all
64,031/63,792 selected forms agree with configuration and assembly, and emitted
parts concatenate to the output in every affixed word. Changing denominators
reflect changed streams. The complete cumulative and original-baseline
comparisons retain the mixed broader diagnostics.

Current whole unit suites pass 513/527 tests with one skip per arm; current
quality passes twelve per arm, candidate Q06/Q07 targeted tests pass forty, and
strict types pass. Separate original n-gram/phoneme/quality gate clones also
pass their unchanged policies. Thirteen of fifteen commands pass; both full
lint commands retain exactly the same ten inherited errors. The failed first
gate preparation is retained separately. All twelve unchanged native timing
runs pass; median candidate/control throughput ratio 0.985001 and observed
variability do not support a stable performance gain.

All 413 local retained files (334,079,112 bytes) pass full byte/hash checks.
The published 300-member compact packet includes full bounded trace witnesses,
sources, operators and outcome logs, with all forty external raw shards and
selected runtime files explicitly pinned. The portable verifier authenticates
compact bytes and can rehash the full external archive; it does not rerun the
science. Default edge-repair exposure remains zero. No human quality, universal
rime legality, seed independence, complete external test-runner installation,
or later-main/Q04-composition certificate is inferred.
