# Q19: token-weighted citation targets and an opt-in text experiment

The token-weighted model improves the registered held-out objective by 27.76%. The generated text sample moves closer to the training length/syllable target, while diversity, coarse-phone fit, historical written-trigram fit and primary-stress completeness regress. Keep this as an opt-in research experiment; these results do not support changing the default generator or claiming better human readability.

Measured implementation: `2144c816efaec4005911e774288258c0ed25f77a`; immediate base: `71f5a6f6af2291e14d0b012f1ab5911a3d7ecca0`. All `src/`, `scripts/` and default `data/` files are unchanged from that base. The adapter in `evaluation/corpus/frequency-runtime.ts` applies frozen training length/syllable tables to explicit text configurations. It does not directly tune phone inventories, connected speech, syntax or semantics.

## Source and held-out fit

The authenticated SUBTLEX-US word-form population contains 74,286 lowercase ASCII types and 49,719,560 tokens. The pinned CMU citation-pronunciation selection joins 48,825 types / 49,079,866 tokens, leaving 25,461 types / 639,694 tokens unmatched. The raw letter-string archive has a different population and is a diagnostic only. POS counts disagree with word counts on 10,638 rows, with 191 rows lacking usable integer tag counts. Content/function/other allocations use exact rational within-row shares; they are modeled allocations, not observed token partitions.

The frozen spelling split contains 38,938 training, 4,909 development and 4,978 held-out types. It is a lexical-type holdout, not an independent subtitle-document/corpus evaluation; morphology families are not grouped. Both arms independently choose alpha 0.5, the lower boundary of the unchanged eight-value development grid. Every development trial and held-out word is retained.

Held-out denominator: 4,978 types, 4,844,807 tokens, 15,003,352 phones. The per-token objective is negative log joint length/syllable probability plus mean phone negative log probability, using natural logarithms. Mean objective decreases from 7.4303738092 to 5.3679910721. Every frequency band below 1,000 source counts worsens, as does the unknown-POS allocation. Frequent types dominate the pooled token objective; its improvement does not imply improvement for rare vocabulary.

Independent Python reconstruction checks the entire source population, exact POS allocations, all 16 development trials, every held-out word and all frequency/POS strata against the TypeScript artifact. This agreement verifies the calculation, not the adequacy of the target for human reading.

## Generated output and trace evidence

Each arm has 200,000 words from the unchanged public-API protocol: four profiles, five seeds each, 10,000 words per stream. Full public word/trace replay and independent trace recount pass for all 400,000 words. The three lexicon profiles comprise 150,000 words per arm and have byte-identical compressed word/trace streams with matching next-RNG probes. The affected `text-default` profile has 50,000 words per arm.

| Text-profile measurement | Control | Candidate |
| --- | ---: | ---: |
| Unique written words / 50,000 draws | 28,443 | 16,503 |
| Phone-length JSD to token training target (nats) | 0.1754839341 | 0.0185520728 |
| Joint length/syllable JSD to token training target (nats) | 0.1853442504 | 0.0505641287 |
| Coarse-phone JSD to token training target (nats) | 0.0281904464 | 0.0379395437 |
| Written-trigram JSD to historical CMU reference (nats) | 0.1278716959 | 0.1828734835 |
| Polysyllables missing primary stress | 9,947 / 27,246 | 10,235 / 22,283 |
| Words with five consecutive consonant letters | 7 / 50,000 | 1 / 50,000 |
| Repair events / 50,000 words | 7,723 | 6,947 |
| Same-segment adjacent equal-phone pairs / 50,000 words | 167 | 44 |

Length/syllable distances measure closeness to the candidate's own training target. Coarse-phone distance uses the token citation target; written trigrams use a separate historical dictionary-type reference. They assess different distributions and must not be presented as one overall quality score. Equal adjacent phones are a descriptive trace counter, not universally illegal phonology. Repair counts are events rather than the proportion of repaired words. Full profile counters, traces and denominators remain in the evidence.

Enabled trace/plain and preserved lexicon public parity checks compare 20,000 pairs (40,000 calls), 1,944,941 RNG draws and 40 next-state probes. They check the stated API contracts; they do not assert identical RNG consumption between treatment and control in the changed text profile.

## Original gates and performance

All 32 registered commands pass: original unit tests, diagnostic compilation, original and both configured quality checks, original two-million-word trigram analysis, original 50,000-word trace audit, original native performance gate, and all 24 configured timing runs (six adjacent control/candidate pairs for each of lexicon and text). No sample count, seed, warmup, trial count, speed floor, variance threshold, timeout or heap limit was relaxed. Required whole-repository lint fails with 11 errors. Running the same command on an archive of the exact dependency baseline produces byte-identical diagnostics after replacing checkout paths; all affected generator sources are unchanged. Both failures and their source/log pins are retained. This is a draft research result, not a merge-ready change.

Configured factories expose `generateWord` only. The matched public single-word loop includes wrapper/configuration-validation overhead; it is not a measurement of custom native batch generation. The original default native performance gate is separate. Rounded reported words/second for all six pairs:

| Mode | Control | Candidate |
| --- | --- | --- |
| Lexicon | 7411, 6405, 7610, 6673, 7455, 7455 | 7509, 5520, 7587, 6913, 7662, 5338 |
| Text | 5243, 5881, 9032, 8624, 8979, 9009 | 6409, 8131, 7361, 7352, 7958, 8295 |

All unchanged 4,500 words/second floors and variance checks pass. These six same-order pairs are noisy observations, not a universal speed claim. Every log, failed preparatory attempt, binding amendment and source/dependency seal is preserved. Publication preparation V1 stopped on the lint failure; V2 verifies and records the inherited failures without changing the measured implementation or lint rules.

## Review and reproduction

Read the preimplementation registration and its explicit amendments, then `frequency-experiment.ts`, `frequency-runtime.ts`, the paired comparison and independent verification reports. `validation-index.json` authenticates packaged original/saved bytes and measured source files. Run `python3 -B verify-validation.py --repo /path/to/checkout` from this directory to verify the package and source identity. Integrity verification does not rerun the experiment or prove efficacy.

The compact PR package includes the full fit artifact, registrations, source accounting, all calculation/recount/replay/parity/gate reports, logs and measurement operators. Large raw source files and 40 compressed word/trace archives are retained in the owner's local evidence archive; their full byte pins and capture manifests are published. `retained-local-index.json` identifies exactly what is local rather than bundled. The package alone can verify recorded arithmetic and identity; full public replay requires the retained archives, authenticated source files, compatible dependencies and the recorded implementation. Operators retain their original execution paths as provenance and require path relocation on another machine; they are not advertised as a one-command portable rerun.

See `DATA-LICENSE.md` for SUBTLEX-US attribution and CC BY-NC-SA 4.0 derived-data terms and the separately retained CMU notice. Code remains under the repository's code license. No default runtime dataset is replaced and no real human responses have been collected.
