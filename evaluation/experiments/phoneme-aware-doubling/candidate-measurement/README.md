# Q12c candidate measurement

The once-captured candidate contains 200,000 development words from the unchanged
four-profile, twenty-stream protocol. Source, tooling, installed loader dependencies,
Node, protocol and reference inputs were pinned before capture and matched after.
The source commit is b167534; generator bytes are unchanged from implementation
91fd20a. No validation cohort was inspected or generated. The exact raw archive
remains `/private/tmp/q12c-phoneme-aware-doubling-candidate-v1`; its word shards
are externally retained rather than duplicated in Git.

| Trace measure | Immediate control | Candidate |
|---|---:|---:|
| Words | 200,000 | 200,000 |
| Spelling units | 1,010,404 | 1,010,158 |
| Sampled doubling attempts | 20,770 | 19,108 |
| Sampled successes | 17,362 | 15,969 |
| Unsupported ordinary-policy expansions | 1,682 | 0 |
| /s/:c→ck sampled expansions | 220 | 0 |
| Direct quota-counted selections | 2,878 | 2,936 |

The independent Python recount agrees with every doubling counter, event table,
stratum and complete first witness in the candidate report. See its exact proof
for comparison counts. Groups overlap; they cannot be summed. Changed RNG use
means equal stream coordinates are not paired counterfactual words.

Production license replay is separately labeled and is not independently proved
by the doubling recount. It reports zero deduplication-attributed erased units,
partial th units and normalization phone-multiplicity violations in both corpora.
All 23 candidate normalization certificates pass implementation replay (control:
25). Raw five-consonant words decrease 252→247, unresolved spelling cells increase
63,911→63,938, and search-budget-refusal words increase 1→2. Unresolved evidence
is not credited as clean final-word ownership.

The complete broad comparison includes both the original frozen baseline and
exact #335 predecessor, with all metrics, denominators, morphology/length strata,
distributions and diversity. Effects remain mixed. For example, default-lexicon
missing-primary counts rise 9,288→9,407 and bare-lexicon trigram divergence falls.
Prior fixes are inherited and are not credited to Q12c. These are descriptive
sample results, not universal linguistic guarantees or reader preference proof.

Paired timing, final evidence review and the measured PR remain outstanding.
Existing runtime suite failures remain disclosed in the implementation checkpoint;
this capture does not waive them. The manifest pins exact source/stored bytes of
all packaged evidence, including compressed reports and the complete capture
metadata. It does not substitute for the external raw word shards.
