# Q20: opt-in soft orthographic style

The generator can draw one word-level spelling style and apply bounded positive
weight adjustments to existing legal grapheme candidates. The frozen experimental
profile assesses `ph` for /f/, `ps` for /s/ and `mn` for /n/. A style choice remains
consistent through spelling contexts and retries. Trace evidence records the
prior, draw, legal candidates, base weights, multipliers and resulting weights.
The same policy works with ordinary spelling and the registered Q14b conditioned
sequence model. Zero strength consumes no style RNG draw.

Legacy origin labels are now explicitly unsourced assessments. Orthographic
associations and experimental multiplier strength do not establish a generated
word's etymology. This profile is opt-in; it is not a new default quality policy.

## Fixed comparison and complete evidence

Measured candidate: `4f4c95d555a00f1d8cb44892a72e57748f377948`.
Exact control: `1159465fe6c10f55a97e8c5851e8a75c604450e7`.
The preimplementation registration fixes profile strength, support, four
profiles, five 10,000-word seed streams and both spelling policies.

All 400,000 candidate words were replayed through public APIs. A separately
implemented audit reconstructed all 800,000 control/candidate words: legal
support, local/style/conditioned probabilities, selected-source survival,
structural spelling edits and base/final lineage. The archive preserves every
original word and full trace, every source/loader/runtime identity, all original
logs/reports, all earlier failed preparations and the versioned audit repair.
No samples, counts, thresholds, timeouts or heap limits were reduced.

Thirty thousand disabled/zero-strength public comparisons and 120 next-RNG
probes passed. Thirteen focused kernel/integration tests and strict source/test
types passed. These establish mechanisms and compatibility within their scope.

## Observed effects and limits

All eight profile comparisons are below. Each row has 50,000 words per arm.
Changes are candidate minus control. Jensen–Shannon changes are in bits;
smaller distance to these references is a descriptive property, not a human
quality score. The complete JSON reports retain every metric, eligibility count,
stratum, distribution and seed delta.

| Spelling policy / profile | Unique spelling change | Phone distance change | Trigram distance change |
|---|---:|---:|---:|
| default / lexicon-default | -63 | 0.000066 | 0.000294 |
| default / lexicon-bare | -70 | 0.000019 | 0.001178 |
| default / monosyllables-bare | -69 | 0.000322 | 0.000236 |
| default / text-default | -87 | 0.000336 | 0.002470 |
| active / lexicon-default | -50 | -0.000041 | -0.000289 |
| active / lexicon-bare | -11 | 0.000032 | 0.000578 |
| active / monosyllables-bare | 38 | 0.000067 | -0.000978 |
| active / text-default | -156 | 0.000045 | 0.000354 |

Within the default-policy corpus, the selected features totalled 819/9/7
(`ph`/`ps`/`mn`) in control and 762/11/5 in candidate. For the active-policy
corpus the totals were 779/13/11 and 757/7/1 respectively. These are trace-backed
selection totals; the full audit reports preserve opportunities, conditional
probabilities, profile/style/seed strata and final-source survival separately.
They do not estimate a causal effect at a fixed phonological opportunity.

**No word selected multiple declared features in either arm under either
policy.** These samples therefore provide no observed within-word feature
co-occurrence evidence for improved coherence. They also do not measure reader
preference or wordlikeness. The additional style draw changes later RNG
alignment; the 400,000 same-seed ordinal comparisons are not fixed-phone causal
interventions. All 40 stream comparisons and changes are retained.

## Original gate results

All 74 registered original/configured commands completed: **6 passed and 68
failed**. Compilation, trigram analysis and trace audit passed in both arms.
The full unit suites retained the same 17 failed-test signatures, with 13 new
passing mechanism tests in candidate. Original quality reports were byte
identical and each reported 73 five-consecutive-consonant gate hits. Configured
quality failed in both policies and arms; active spelling also failed the
original `owngs <= 1` gate in both arms. These gate signatures do not by
themselves diagnose the phonological cause of an outlier.

All 12 native and 48 configured throughput commands failed the unchanged
4,500-word/s floor. The original 10,000 words, warmups, seed, variance checks and
timeouts remain. Configured measurements use the same public single-word-loop
adapter in both arms; native default batches are reported separately. Native
median candidate/control throughput ratio was 0.988645 from the original
rounded logs, not an estimate of exact latent throughput. A 30-second morphology
stream test timed out in both unit suites; there is no external-load attribution.

Whole-repository lint separately failed with the same seven quote errors in
both exact sources. Full failures and logs remain reviewable. This is a draft
experimental mechanism with measurable trade-offs, not passing repository
quality/performance, proven human benefit or a promotion recommendation.

## Rechecking

`python3 verify.py --root .` verifies the complete compact package, original
commands, source/compiler/report provenance and outcome counts. Add
`--full-local` on the evidence owner's machine to rehash every full raw stream
and retained source/dependency/runtime object. The local index declares every
original and retained path. Forty control streams reuse the previously verified
complete Q11b archive; candidate/support copies have independent inodes and
share filesystem extents. Every byte is preserved; this is local evidence
retention, not an independent-device backup.
