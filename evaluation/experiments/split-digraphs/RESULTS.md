# Q14a: explicit split vowels and completion

**Disposition: measured opt-in experiment; do not promote. The zero-unresolved
spelling-obligation target is not met.** English defaults remain unchanged.

The candidate replaces legacy syllable magic-e and word silent-e swaps with
explicit, atomic split-vowel constructions and a final source-ordered vowel
completion pass. Formation uses the registered 48 support relations. Completion
conditions existing resolver weights on supported whole-nucleus alternatives;
it does not choose the shortest spelling or erase phonemes to meet a budget.

## Structural results

Both development corpora contain 200,000 words. Candidate production replay
completed all 20 streams and verified its source/input closure. Independent
Python recount agrees on 3,800,019 integer comparisons; the exact Q13b control
recount agrees on 2,200,011 comparisons. These checks establish agreement with
the declared model. They do not independently establish the linguistic adequacy
of each reading license or human decoding agreement.

| Measure | Q13b control | Q14a candidate |
| --- | ---: | ---: |
| Root nuclei | 341,288 | 340,386 |
| Unresolved final-root vowel obligations | 29,835 | 2,887 |
| Final-root status unavailable | 20,205 | 8,051 |
| Satisfied open/split obligations | 15,447 | 22,925 |
| Other final-root nuclei (`not-target`) | 275,801 | 306,523 |
| Unresolved spelling cells | 57,428 | 18,075 |
| Words with unresolved cells | 32,209 | 10,630 |
| Words with infeasible spelling budgets | 8,006 | 8,132 |

There are 7,470 candidate constructions: 2,215 from the syllable route and 5,255
from the word route, out of 14,214 eligible trials and 540,386 recorded attempts.
All 7,470 remain live at the final-root boundary. Historical control traces lack
comparable construction/eligibility evidence; their absence is not a zero count.
Final assembled-word construction ownership is unavailable for all 7,470.

The completion pass records 340,386 attempts: 314,252 unchanged, 23,247 selected,
2,855 infeasible and 32 with unavailable prefix evidence. It retains 44,531 of
81,741 proposals and uses 17,378 draws. Supported alternative spellings can move
nuclei into `not-target`, so satisfied-open/split counts alone do not count all
completed alternatives. Of the infeasible attempts, 2,676 concern /eɪ/.
A retained example offers only unresolved `a` and unsupported `ae`, leaving no
permitted completion under the frozen policy.

The aggregate obligation reduction is real within this model, but the remaining
2,887 unresolved and 8,051 unavailable nuclei prevent a complete-spelling claim.
Changed RNG consumption also changes later generated words: these totals are
stream comparisons, not per-word causal pairs.

## Output quality and performance

The [full comparison](evidence/comparison/comparison.md) retains comparisons to
both the original baseline and the immediate Q13b control, using one evaluator.
Trigram Jensen–Shannon divergence rises in all four profiles. Unique spellings
increase in three profiles and decrease in lexicon-default. No overall
wordlikeness or human-preference improvement is established.

The existing quality benchmark, adapted only to call the configured public
API and resolve its helper import, retains its original assertions, seeds,
sample sizes and timeouts: **10 tests pass and two fail**. In its 50,000-word
gate sample, 82 words have five or more consonant letters (limit zero), and 61
contain `owngs` (limit one). All mode gates pass. This is separate from the
unchanged-default full suite: 1,021 passes, four predecessor-matching failures,
and one skip. Omitted-policy parity passes 20,768 coordinates, 83,072 calls and
128 next-RNG probes against Q13b. Active 500-word trace/untraced replay parity
and 64 empty-support diagnostics also pass; evidence is in `premeasurement/`
and the implementation tests.

A separate full-archive investigation finds 138 `owngs` outputs. Each has a root
`owng` sequence whose `ow` cells bind to a completion certificate. All complete
matching traces are retained. For `erowngs`, completion changes `o` to `ow` and
morphology adds `s`; the conditioned weights are `ow:250`, `oe:10`. The declared
`single-phone` reading has no hard following-context restriction. Structural
conformance therefore coexists with a failed spelling-quality gate. Root-cell
attribution does not certify final morphological ownership.

Six fresh AB/BA pairs show a **63.44% median throughput decrease**. Both arms
fail all six speed gates and pass all six variance gates. The common configured
batch adapter calls public `generateWord` with a shared RNG; it is not the
optimized default batch API. Raw timings, gates and logs are retained, and an
independent calculation agrees. A later concurrent diagnostic profile suggests
cloning and repeated verification as optimization targets, not measured gains.

## Reproducibility and deviations

The formal candidate is `/private/tmp/q14a-split-vowels-candidate-v2`, manifest
SHA-256 `7593ad8e8e77e7428c3d07c00f6166fe09ff06c8533741eb1e1d6f1259e3735c`.
Its source digest is `fa9e8d73c5f03c06d356c6259930c0d2757170ccb7d6f530acae670090ff7b75`.
The effective configuration is explicitly pinned in the capture manifest.
Production analysis seal SHA-256 is
`5dc4ca0095191b95b690e1ec9fbeabdc50f8d1a9258bc4c310aab3addf6c6f3f`.

Immediate control is `/private/tmp/q13b-aligned-shared-graphemes-candidate-v1`,
manifest SHA-256 `8fa4c8216beedf0d2803f18c2864ddbde1ea805af866071fac1c30ab34b1f876`.
The raw generation archives remain external; this report and its evidence files
do not replace them for a full replay. Control observation shards likewise
remain in `/private/tmp/q14a-control-analysis-v1/observations/`.

The premature v1 capture was stopped because observers were not pinned first;
it is not formal evidence. See [capture-order correction](CAPTURE-ORDER-CORRECTION.md).
The first performance runner failed before timing because the factory exposes
only `generateWord`. Versioned corrected tools were prepared after capture;
see [runner correction](PERFORMANCE-RUNNER-CORRECTION.md). Neither deviation is
retroactively represented as part of the original registration. Post-capture
quality adaptation and exploratory diagnostics are labeled separately.

The candidate analysis and independent recount cover the development cohort;
validation remains sealed. `evidence/evidence-manifest.json` pins the packaged
reports, witnesses, commands, configuration and measurement files. Original
capture and analysis seals retain their original relative artifact paths.

## Remaining work

Resolve the registered infeasible/unavailable cases without erasing phones or
weakening acceptance criteria; improve context-sensitive reading support;
address performance with separately measured, semantics-preserving changes;
and complete final-word ownership and human reading evaluation in their own
roadmap items. A draft review can assess this experiment, but it is not evidence
that Q14a or the overall roadmap is complete.
