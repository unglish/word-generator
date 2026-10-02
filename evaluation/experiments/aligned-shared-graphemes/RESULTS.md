# Q13b: aligned shared spellings

The active English candidate replaces migrated string rewrites with explicit
joint readings for /ks, gz/→x and /kw/→qu. It records the complete source units
and ordered phones, refuses unsupported or partial ownership before sampling,
and guards later root edits. Other spelling rules retain their named order.
Absent `sharedSpellings` preserves the legacy path; an empty policy deliberately
disables migrated formations and is not counted as an improvement.

## Frozen corpus and independent verification

The unchanged development protocol generated 200,000 words across four profiles
and twenty streams. Source, observers, independent recount, reference, engine
and installed loader dependencies were pinned before capture and matched after.
The candidate manifest is `8fa4c8216beedf0d2803f18c2864ddbde1ea805af866071fac1c30ab34b1f876`.
The comparison control is exact #338, with its original frozen archive.
Validation remains sealed; no weights or thresholds were tuned from this sample.

Production schedule and reading-license verification passes every root ledger.
A separate Python implementation recounts all 400,000 control/candidate words:
634,206 integer comparisons across 798 control and 790 candidate groups, plus
all 181 complete candidate first witnesses, agree. That independently verifies
arithmetic and structure. It does not independently implement phonological
license semantics, unrelated regex sampling, or final morphological ownership.

| Registered construction | Eligible trials | Formed | Cross-part formations |
|---|---:|---:|---:|
| /ks/→x | 9,407 | 2,400 | 58 |
| /gz/→x | 163 | 139 | 37 |
| /kw/→qu | 2,617 | 2,617 | 74 |

All 5,156 formations have supported sequences, complete consumed units, exact
ordered phone multiplicity and supported input ownership. No live construction
is silently damaged by later root edits. These are zero observed violations,
not a proof about every possible output. Trials can revisit failed syllable
opportunities at the word slot. Historical eligibility is unavailable: the old
regex event counts cannot serve as matching trial denominators.

See [mechanical comparison](mechanical-comparison.json),
[candidate recount](candidate-measurement/independent.json), and
[control recount](control-measurement/independent.json). Full words remain in the
externally retained archives named in each measurement README; sampled witnesses
are not a substitute for the full shards when repeating verification.

## Tradeoffs retained

| Observation in 200,000 words | Exact #338 | Candidate |
|---|---:|---:|
| Unresolved root spelling cells | 63,938 | 57,428 |
| Words with unresolved root cells | 35,719 | 32,209 |
| Words with an infeasible spelling budget | 7,910 | 8,006 |
| Raw five-consonant words | 247 | 246 |
| Coverage certificates | 1,623 | 1,521 |
| Normalization certificates | 23 | 29 |

The [complete broad comparison](comparison/comparison.md) retains original and
immediate-predecessor diagnostics, distribution distances, missing/unseen mass,
length and morphology strata and diversity. The mechanical reports also retain
legacy attempt-index observations. Results are mixed. RNG consumption changes can affect every later word; these
are descriptive stream comparisons, not paired words or a causal count of all
spelling improvements. No overall wordlikeness or human-preference gain is claimed.

Six fixed local performance pairs show a **16.18% median throughput decrease**.
The unchanged speed floor passes 6/6 control slots and 0/6 candidate slots;
variance gates pass throughout. See [all timing evidence](performance/README.md).
This performance regression and remaining spelling failures keep the change a
draft for review, rather than evidence of release readiness.

## Validation and compatibility

Final-source legacy parity passes 20,768 coordinates / 83,072 public calls and
128 next-value probes against #338, including custom legacy configurations.
All 51 measurement tests pass. Strict TypeScript and changed-source lint pass.
Full suite: 921 passes, four failures, one skip. Dedicated quality: 11 passes,
one failure (63 five-consonant words in 50,000). Full-suite failures retain
9/100,000 grapheme runs, 28/100,000 letter runs, 43/10,000 custom max-three runs,
and six ck-plus-another-double words against the unchanged limit of five.

[Activation evidence](active-candidate-stage/README.md) preserves initial fixture
failures and sandbox errors as well as corrected runs. Historical fixtures now
explicitly omit the active shared policy; their assertions are unchanged.
Custom configurations that remove the predecessor spelling slots must likewise
omit `sharedSpellings`, or provide the matching slots for their structured rules.
