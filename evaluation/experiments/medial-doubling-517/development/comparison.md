# Quality comparison: candidate-517-post-selection-final

Original baseline: baseline-c151c4c9. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | baseline-c151c4c9 | c151c4c9ca4512d89ccc1f2f2324c4627c552de6 | clean | 021034b976fdbcd00f133fb0e65aa752124fda416fa4bb7a5ce89eb8969ffe8b |
| candidate | candidate-517-post-selection-final | c151c4c9ca4512d89ccc1f2f2324c4627c552de6 | dirty (uncommitted generator changes) | 751a65e0705768948717897b2f9244bc6de876143cae8a70149f59d19fbf839b |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 48263.000 | 48262.000 | -1.000 |
| Mean letters | 7.838 | 7.845 | +0.007 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.003944 | 0.003944 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.136584 | 0.136242 | -0.000342 |
| trigrams / missingReferenceMass | 0.040363 | 0.040363 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.006204 | 0.006196 | -0.000008 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43592 (0.000%) | 0/43592 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43592 (0.000%) | 0/43592 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/25778 (0.000%) | 0/25778 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 25778/50000 (51.556%) | 25778/50000 (51.556%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5925/23027 (25.731%) | 5925/23027 (25.731%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6408 (0.000%) | 0/6408 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 118/6408 (1.841%) | 118/6408 (1.841%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 3340 | 3340 | 0 |
| bare/syllables:2 | 12825 | 12825 | 0 |
| bare/syllables:3 | 5198 | 5198 | 0 |
| bare/syllables:4 | 1989 | 1989 | 0 |
| bare/syllables:5 | 674 | 674 | 0 |
| bare/syllables:6 | 168 | 168 | 0 |
| bare/syllables:7 | 25 | 25 | 0 |
| bare/syllables:8 | 3 | 3 | 0 |
| both/syllables:2 | 427 | 427 | 0 |
| both/syllables:3 | 781 | 781 | 0 |
| both/syllables:4 | 516 | 516 | 0 |
| both/syllables:5 | 142 | 142 | 0 |
| both/syllables:6 | 28 | 28 | 0 |
| both/syllables:7 | 1 | 1 | 0 |
| both/syllables:8 | 1 | 1 | 0 |
| prefixed/syllables:2 | 343 | 343 | 0 |
| prefixed/syllables:3 | 403 | 403 | 0 |
| prefixed/syllables:4 | 213 | 213 | 0 |
| prefixed/syllables:5 | 83 | 83 | 0 |
| prefixed/syllables:6 | 23 | 23 | 0 |
| prefixed/syllables:7 | 6 | 6 | 0 |
| suffixed/syllables:1 | 3068 | 3068 | 0 |
| suffixed/syllables:2 | 9432 | 9432 | 0 |
| suffixed/syllables:3 | 7351 | 7351 | 0 |
| suffixed/syllables:4 | 2274 | 2274 | 0 |
| suffixed/syllables:5 | 548 | 548 | 0 |
| suffixed/syllables:6 | 113 | 113 | 0 |
| suffixed/syllables:7 | 23 | 23 | 0 |
| suffixed/syllables:8 | 2 | 2 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44903.000 | 44914.000 | +11.000 |
| Mean letters | 6.730 | 6.738 | +0.008 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006286 | 0.006286 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.168370 | 0.167862 | -0.000509 |
| trigrams / missingReferenceMass | 0.053590 | 0.053590 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.007256 | 0.007244 | -0.000012 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/39299 (0.000%) | 0/39299 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/39299 (0.000%) | 0/39299 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7415/26422 (28.064%) | 7415/26422 (28.064%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/10701 (0.000%) | 0/10701 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 178/10701 (1.663%) | 178/10701 (1.663%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 10701 | 10701 | 0 |
| bare/syllables:2 | 26422 | 26422 | 0 |
| bare/syllables:3 | 8852 | 8852 | 0 |
| bare/syllables:4 | 3031 | 3031 | 0 |
| bare/syllables:5 | 778 | 778 | 0 |
| bare/syllables:6 | 189 | 189 | 0 |
| bare/syllables:7 | 25 | 25 | 0 |
| bare/syllables:8 | 2 | 2 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14905.000 | 14905.000 | 0.000 |
| Mean letters | 4.286 | 4.286 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.043483 | 0.043483 | 0.000000 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.332929 | 0.332929 | 0.000000 |
| trigrams / missingReferenceMass | 0.329025 | 0.329025 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.002800 | 0.002800 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Polysyllables with multiple primary stresses / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 954/50000 (1.908%) | 954/50000 (1.908%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39736.000 | 39736.000 | 0.000 |
| Mean letters | 6.709 | 6.712 | +0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006797 | 0.006797 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158167 | 0.157703 | -0.000464 |
| trigrams / missingReferenceMass | 0.044791 | 0.044775 | -0.000016 |
| trigrams / unseenGeneratedMass | 0.004910 | 0.004906 | -0.000004 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29029 (0.000%) | 0/29029 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29029 (0.000%) | 0/29029 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22521 (0.000%) | 0/22521 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22521/50000 (45.042%) | 22521/50000 (45.042%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5191/15337 (33.846%) | 5191/15337 (33.846%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20971 (0.000%) | 0/20971 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 325/20971 (1.550%) | 325/20971 (1.550%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17703 | 17703 | 0 |
| bare/syllables:2 | 5484 | 5484 | 0 |
| bare/syllables:3 | 2849 | 2849 | 0 |
| bare/syllables:4 | 1150 | 1150 | 0 |
| bare/syllables:5 | 261 | 261 | 0 |
| bare/syllables:6 | 32 | 32 | 0 |
| both/syllables:2 | 564 | 564 | 0 |
| both/syllables:3 | 990 | 990 | 0 |
| both/syllables:4 | 569 | 569 | 0 |
| both/syllables:5 | 267 | 267 | 0 |
| both/syllables:6 | 107 | 107 | 0 |
| both/syllables:7 | 34 | 34 | 0 |
| both/syllables:8 | 6 | 6 | 0 |
| prefixed/syllables:2 | 2932 | 2932 | 0 |
| prefixed/syllables:3 | 1158 | 1158 | 0 |
| prefixed/syllables:4 | 537 | 537 | 0 |
| prefixed/syllables:5 | 226 | 226 | 0 |
| prefixed/syllables:6 | 45 | 45 | 0 |
| prefixed/syllables:7 | 11 | 11 | 0 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3268 | 3268 | 0 |
| suffixed/syllables:2 | 6357 | 6357 | 0 |
| suffixed/syllables:3 | 3404 | 3404 | 0 |
| suffixed/syllables:4 | 1335 | 1335 | 0 |
| suffixed/syllables:5 | 562 | 562 | 0 |
| suffixed/syllables:6 | 128 | 128 | 0 |
| suffixed/syllables:7 | 17 | 17 | 0 |
| suffixed/syllables:8 | 3 | 3 | 0 |
