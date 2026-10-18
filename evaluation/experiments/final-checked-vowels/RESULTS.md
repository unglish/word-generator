# Q10b2: configured word-final checked-vowel contract


The registered measurement pipeline is complete. All 800,000 records pass production replay and independent count agreement. The candidate removes the configured lexical and surface final-vowel violations under both spelling policies. Broader quality effects are mixed, and every original repository gate command fails. This is evidence for a specific model contract, not an overall-wordlikeness claim or a release recommendation.

## Change and linguistic scope

English configuration explicitly identifies /ɪ ɛ æ ʌ ʊ/ as checked vowels.
The generator prevents these sounds from occupying the rightmost nucleus of
an open final syllable in its completed lexical and surface word. This is a
declared modeling policy, not a claim about every English dialect or register.
It does not derive the class from the inventory's phonetic `tense` property.

After morphology assembly and final stress assignment, an eligible unalternated
root nucleus is replaced using positive configured nucleus/end-word weights
and stress/initial-position restrictions. The writer receives the repaired
root. Pronunciation reduction is blocked when it would create the forbidden
word-final configuration. Closed checked vowels and internal open syllables
remain outside this word-edge restriction. Impossible replacement pools and
illegal affix/derived-source cases fail explicitly. Custom configurations may
omit the policy.

The repair has distinct trace evidence, phone realization evidence and
configured replay. Replacement adds an RNG draw: same seed coordinates across
arms do not imply paired words, and later words in a stream may all change.

## Frozen comparison

Control: `4a5defa56c7649145bfa9c953e698dc57a2d0acd`.
Candidate: `8499e925cb69728e38573cceb477f2bb60f90007`.

Both default and registered active spelling policies have four profiles,
five development seeds per profile and 10,000 words per stream. All four
200,000-word captures completed with artifact hashes and matching before/after
source, dependency and environment seals. The active control reproduces the
parent Q02 archive's 200,000 complete words/traces byte for byte.

No held-out fit or participant preference is measured here.

## Completed evidence

| Evidence | Verified scope |
|---|---|
| Independent candidate endpoint/source-coordinate scan | 400,000 words; zero lexical and surface configured violations under each policy |
| Retained complete candidate witnesses | 805 observed strata; exact archive-row hashes/content and all three production validators pass |
| Default control production replay | All 200,000 records; 4,076 lexical and 3,651 surface configured violations |
| Default control independent agreement | All 200,000 records; 2,328 integer comparisons, zero disagreements with production counts |
| Active control production replay | All 200,000 records; 4,065 lexical and 3,621 surface configured violations |
| Active control independent agreement | All 200,000 records; 2,344 integer comparisons, zero disagreements with production counts |
| Default candidate production replay | All 200,000 records pass; zero lexical/surface configured violations; 58 endpoint counters exactly agree with separate independent endpoint scan |
| Default candidate independent agreement | All 200,000 records; 2,405 integer comparisons, zero disagreements with production counts |
| Active candidate production replay | All 200,000 records pass; zero lexical/surface configured violations and zero configured-operation replay or source-binding failures |
| Active candidate independent agreement | All 200,000 records; 2,416 integer comparisons, zero disagreements with production counts |
| Registered trace/plain parity | 20,000 comparisons, 40,000 public calls, 1,924,814 draws and 40 next-RNG probes; output/draw equality passes |
| Focused implementation checks | 41 focused tests, TypeScript and three capture preflight tests pass |

The independent candidate endpoint scan does not substitute for full configured
operation replay or independent cell/phone lineage replay. The retained witness
validators cover those 805 records, not all 400,000 candidate records. All four complete corpus audits now agree: 800,000 records and 9,493 integer comparisons, with zero disagreements. Every arm also has zero configured-operation replay and source-binding failures.

Evaluator summaries count 3,651 default-control and 3,621 active-control surface
violations, versus zero in both candidate policies. These summaries are separate
from the stronger lexical/rightmost-nucleus audit. Report lexical and surface
endpoints separately: pronunciation removes some lexical violations in control.

## Broader quality tradeoffs

Common evaluator comparisons are complete for both policies. They are descriptive
development-sample observations, with seed-stream ranges rather than confidence
intervals or paired-word effects.

Default lexicon stress clashes increase from 41.786% to 42.731%; trigram
Jensen–Shannon divergence increases from 0.155710 to 0.156305 bits; distinct
spellings decrease from 44,317 to 44,144. Active lexicon stress clashes decrease
from 41.743% to 41.506%, while trigram divergence increases from 0.172695 to
0.172757 bits. Active text phoneme divergence increases from 0.009809 to
0.010186 bits and distinct spellings decrease from 30,193 to 29,933. All strata,
eligibility denominators, distributions and seed-stream comparisons must remain
in the published artifacts.

These mixed results support a specific final-vowel contract improvement. They
do not establish improved overall wordlikeness or human preference.

## Original repository gate outcomes

All eight gate commands terminated with exit code 1. Failures are retained in the authenticated gate logs and are not relabeled as success.

| Gate | Control | Candidate |
|---|---|---|
| Full suite | 1,060 pass; five fail; one skipped | 1,061 pass; eleven fail; one skipped |
| Default quality: 5+ consonant-letter runs | 70; threshold zero | 67; threshold zero |
| Active quality: 5+ consonant-letter runs | 92; threshold zero | 86; threshold zero |
| Active quality: `owngs` | 47; threshold at most one | 47; threshold at most one |
| Default performance floor | 3,425 words/s; floor 4,500 | 3,500 words/s; floor 4,500 |

The single performance gate runs are not the registered paired timing estimate. Both arms fail the same full-suite timeout and four spelling guardrails. The candidate has six additional failures: three archived exact-word fixtures differ, one historical morphology-bridge fixture differs, and two reduced-inventory fixtures inherit the checked-vowel policy without an eligible replacement nucleus. These need targeted source/fixture review after all frozen measurements terminate. This classification does not establish that all additional failures are harmless.

## Registered paired timing

All 24 timing runs completed with source, dependency and environment checks: six adjacent control/candidate pairs under each policy, retaining every run in registered alternating order. Each uses the existing 10,000-word benchmark, warmups, seeds, trial counts, speed floor and variance gate.

Default spelling median throughput is 2,996.5 control versus 3,093.9 candidate words/s. The median within-pair change is +3.20%, with pair changes from +0.96% to +4.39%. Active spelling medians are 610.9 versus 623.9 words/s; the median paired change is +2.28%, with changes from −0.25% to +11.28%. These are descriptive six-pair comparisons, not confidence intervals.

Every run fails the configured speed floor. All 24 variance gates pass. A relative improvement does not satisfy the repository's absolute performance requirement or establish improved human wordlikeness.

## Original-size diagnostics

Both measured arms compile successfully. Each original trigram command completes five 400,000-word seeds, totaling two million words with morphology disabled. Each original streaming trace audit completes 50,000 words with morphology enabled. All six diagnostic commands exit zero. Exported trigram reports match the newly generated source reports byte for byte; counts, seeds and command defaults are unchanged.

Use `validation-index.json` for every packaged artifact's saved and original byte hashes. Original preimplementation indexes remain historical checkpoints; their ignored logs are retained under `evidence/preimplementation/` as lossless gzip files. The four full trace archives remain separately retained at the paths named in their capture seals and manifests; all raw shard hashes are included. The package retains 805 complete independently authenticated witnesses rather than duplicating the raw corpus in Git.

`python3 verify-validation.py --package PATH --repo REPOSITORY` verifies packaged byte identities and that the repository's generator sources still match the measured candidate. It does not turn failed gates into passing results.

## Tooling attempts retained

The first corpus auditor included its changing stdout log in its tool pin set
and was stopped before corpus processing. The second compared canonical config
objects by identity and failed before records. Their original tools/logs remain
retained; the current auditor excludes execution logs from tool pins and compares
config structure. Neither changed the generator or captured samples.

The first witness verifier tried to stringify an entire decompressed shard and
hit Node's maximum string length. Its original source is retained. The passing
verifier streams all archive rows, retains selected rows and applies the same
hash, content and validator assertions without changing heap limits or samples.
