# Q02 final-word operational provenance — measured results

Q02 makes the final spelling and phone lineage inspectable after lexical stress,
morphology, pronunciation, final cleanup and gap overrides. It is an instrumented
comparison, not a spelling-quality tuning change. Adoption is not recommended
while the timing regression and existing failed gates remain unresolved.

## Source and corpus

The immediate control is `905ba3e92d396db358504fec1826c1c83f680ff3`, the fixed
Q04 + Q14b composition reviewed in draft PR #347. The measured candidate is
recovered snapshot `7e34a17f31d44d1e31420f458bf6e2d99c5fa038`. Publication
implementation `3dd6cf12c49462352dcc9510043aba723af48fcc` has byte-identical
contents for all 176 source files. The recovered dependency symlink and Python
cache artifacts are excluded.

The prospective `measurement.json` remains unchanged. Each arm captures four
profiles × five seeds × 10,000 words = 200,000 development words. Both use the
same active split-vowel and following-letter policies. Default behavior is
checked separately. All 25 artifacts per archive match their pinned lengths and
hashes; source, evaluator, references, runtime and dependency inputs match the
before/after capture seals. Raw word archives are retained separately from the
committed evidence package and remain necessary for full analytical replay.

## Completed production replay

All 200,000 candidate records pass configured lexical-operation, source-binding
and allomorph checks. The control has no final-word packets in any of its 200,000
records; its unavailable replay result is not represented as zero failures.

| Observation | Candidate |
|---|---:|
| Words with final provenance | 200,000 |
| Configured operation replay failures | 0 |
| Source-binding failures | 0 |
| Initial UTF-16 cells | 1,319,420 |
| Final UTF-16 cells | 1,320,254 |
| Initial / final recorded phones | 1,147,890 / 1,147,890 |
| Final-nucleus-repaired words | 245 |
| Gap-overridden words | 53 |
| Final-cleanup-edited words in this corpus | 0 |

Final cells comprise 1,159,922 root base cells, 10,324 root edit cells, 45,045
prefix cells and 104,963 suffix cells. All 1,320,254 final cells remain outside
this ledger's phonemic-license claim. This is a scope/availability count, not a
count of linguistically invalid cells. Root construction diagnostics are
retained separately; final cell origins do not authenticate root generation or
morphology-plan sampling.

An exhaustive archived-word witness scan retains the first full word in each
of nine observed operation strata, with coordinates and line hashes. All nine
match the archived records and pass production replay. No final-cleanup witness
exists in this corpus; its zero count is explicit. Forced-cleanup tests remain
separate fixture evidence. The initial witness-selection failure is retained.

## Preservation and independent checks

Every common quality-summary field matches the control across all four profiles
and twenty replicates: metrics, strata, distributions, diversity and lengths.
The original linguistic baseline is contextual because its pipeline and active
policies differ; its changes cannot be attributed to Q02.

Registered RNG checks cover the first 500 successive untraced words in each
registered development stream under default and active policies: 20,000
comparisons, 40,000 public calls, 1,926,655 draws and forty next-value probes, with
zero differences. This does not certify RNG use across every captured traced
record. The retained 4,000-case trace-on/off matrix is a separate source-bound
check.

The version-2 independent Python control recount completes all 200,000 words and
agrees with every production aggregate and replicate counter. Its stricter
numeric checks reject booleans in cell, event, source and phone coordinates;
six corruption/archive test groups pass. Candidate independent structural/count
replay also completes all 200,000 words. Every aggregate and replicate map agrees
with production: 1,213 candidate integer comparisons and 325 control comparisons,
with zero disagreements. Full archived legacy-field comparison also completes
all 200,000 pairs across twenty streams, with zero differences after removing
only the explicitly listed new provenance fields. This is archived JSON equality,
not a claim about every possible custom configuration or object identity.

## Costs and failed gates

Six registered local performance pairs have a median paired throughput change
of −13.88%. Individual changes span −28.07% to +298.72%; no run is discarded, and
this noisy local series is not a universal effect estimate. Both arms fail all
six absolute speed gates, while all twelve variance checks pass.

The separately required default performance gate observes 3,208 words/sec for
control and 2,903 for candidate, below the unchanged 4,500 floor. Both default
variance gates pass. Compressed corpus storage grows from 512,028,365 to
858,607,827 bytes, about 67.7%; this is storage, not heap-memory measurement.

| Required check | Control | Candidate |
|---|---|---|
| Full default suite | 1,034 pass; 4 fail; 1 skip | 1,060 pass; 5 fail; 1 skip |
| Default quality | 11 pass; 1 fail | 11 pass; 1 fail |
| Active-policy quality | 6 pass; 6 skip; gate-hook timeout | 7 pass; 2 fail; 3 skip; lexicon-mode hook timeout |
| Default performance | Speed floor fails; variance passes | Speed floor fails; variance passes |

The four full-suite writer assertion values match between arms: 9 five-plus
consonant-grapheme runs, 29 five-plus letter runs, 46 four-plus grapheme runs under
the custom cap, and 6 `ck`/doubling cases against a limit of 5. Both default
quality runs report 70 consonant-pileup cases. Active quality does not supply
matching completed gate denominators: the control's gate hook times out; the
candidate reports 92 consonant-pileup and 47 `owngs` cases but times out in a
separate mode benchmark.

The additional candidate full-suite failure is the rising-coda policy test's
unchanged 60-second timeout. It repeats in an isolated run, while the control
passes both full and isolated executions. The separate 10,000-word lexical and
morphology timing tests pass at their original 30-second limits. Samples,
assertions and timeouts were not reduced or relaxed.

The corpus audits and original-size diagnostic attempts are complete. Both
2,000,000-word trigram runs succeed; configuration, aggregate and all five
per-seed fields match exactly, excluding run timestamps and output locations.
The control's 50,000-word trace audit succeeds. The candidate aborts with exit
−6 and `JavaScript heap out of memory` near its default heap limit; no candidate
trace report is available. The CLI retains the entire traced word array. This
observed scalability failure needs a separate bounded-retention diagnostic fix,
without reducing its count or increasing its heap allowance. The original
failed log is retained.

`measured-results/index.json` binds 118 retained artifacts and records the
diagnostic failure. Stored and decompressed bytes were verified against every
indexed hash. Raw word archives remain separately required for full replay. No human preference gain,
complete final spelling/pronunciation licensing, or release readiness is claimed.
