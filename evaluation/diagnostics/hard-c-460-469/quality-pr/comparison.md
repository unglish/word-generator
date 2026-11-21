# Quality comparison: candidate-5511eaedefe8

Original baseline: merge-base-81df038c87c9. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-81df038c87c9 | 81df038c87c908840d9bedaeaa457b0731e9467d | clean | 50d1e56674f65270e5dff6a8b9cb560dbca22f6efbdef958375ee88cfbe9e6b9 |
| candidate | candidate-5511eaedefe8 | 5511eaedefe825499fbdc69e2a00b90a435434ee | clean | cccf6314e7b82a7947d8b5422ebfe7d8f486ad4db951fd6e4c01a7f0238b1235 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49552.000 | 49517.000 | -35.000 |
| Mean letters | 9.227 | 9.230 | +0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004297 | 0.004278 | -0.000019 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.142895 | 0.142657 | -0.000239 |
| trigrams / missingReferenceMass | 0.031519 | 0.032468 | 0.000950 |
| trigrams / unseenGeneratedMass | 0.009125 | 0.009026 | -0.000099 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47005 (0.000%) | 0/47053 (0.000%) | 0.000 | 48 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47005 (0.000%) | 0/47053 (0.000%) | 0.000 | 48 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35043 (0.000%) | 0/35062 (0.000%) | 0.000 | 19 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35043/50000 (70.086%) | 35062/50000 (70.124%) | +0.038 | 0 | -0.280 to +0.650 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5319/13333 (39.893%) | 5435/13472 (40.343%) | +0.449 | 139 | -0.138 to +1.166 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2995 (0.000%) | 0/2947 (0.000%) | 0.000 | -48 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 48/2995 (1.603%) | 46/2947 (1.561%) | -0.042 | -48 | -0.263 to +0.339 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1937 | 1893 | -44 |
| bare/syllables:2 | 6958 | 6949 | -9 |
| bare/syllables:3 | 4099 | 4082 | -17 |
| bare/syllables:4 | 1430 | 1493 | 63 |
| bare/syllables:5 | 439 | 421 | -18 |
| bare/syllables:6 | 76 | 90 | 14 |
| bare/syllables:7 | 16 | 9 | -7 |
| bare/syllables:8 | 2 | 1 | -1 |
| both/syllables:11 | 1 | 0 | -1 |
| both/syllables:2 | 142 | 142 | 0 |
| both/syllables:3 | 828 | 824 | -4 |
| both/syllables:4 | 1345 | 1374 | 29 |
| both/syllables:5 | 991 | 1026 | 35 |
| both/syllables:6 | 456 | 441 | -15 |
| both/syllables:7 | 123 | 141 | 18 |
| both/syllables:8 | 42 | 41 | -1 |
| both/syllables:9 | 5 | 7 | 2 |
| prefixed/syllables:2 | 852 | 857 | 5 |
| prefixed/syllables:3 | 3179 | 3142 | -37 |
| prefixed/syllables:4 | 1990 | 1969 | -21 |
| prefixed/syllables:5 | 811 | 793 | -18 |
| prefixed/syllables:6 | 208 | 215 | 7 |
| prefixed/syllables:7 | 50 | 52 | 2 |
| prefixed/syllables:8 | 12 | 11 | -1 |
| prefixed/syllables:9 | 1 | 1 | 0 |
| suffixed/syllables:1 | 1058 | 1054 | -4 |
| suffixed/syllables:10 | 1 | 0 | -1 |
| suffixed/syllables:2 | 5381 | 5524 | 143 |
| suffixed/syllables:3 | 8633 | 8611 | -22 |
| suffixed/syllables:4 | 5764 | 5690 | -74 |
| suffixed/syllables:5 | 2262 | 2216 | -46 |
| suffixed/syllables:6 | 674 | 705 | 31 |
| suffixed/syllables:7 | 198 | 180 | -18 |
| suffixed/syllables:8 | 31 | 43 | 12 |
| suffixed/syllables:9 | 5 | 3 | -2 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47684.000 | 47697.000 | +13.000 |
| Mean letters | 7.410 | 7.422 | +0.012 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000667 | 0.000659 | -0.000008 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174402 | 0.173575 | -0.000827 |
| trigrams / missingReferenceMass | 0.051342 | 0.050790 | -0.000551 |
| trigrams / unseenGeneratedMass | 0.011615 | 0.011191 | -0.000424 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43519 (0.000%) | 0/43609 (0.000%) | 0.000 | 90 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43519 (0.000%) | 0/43609 (0.000%) | 0.000 | 90 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9286/23032 (40.318%) | 9310/23051 (40.389%) | +0.071 | 19 | -1.259 to +1.250 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6481 (0.000%) | 0/6391 (0.000%) | 0.000 | -90 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 97/6481 (1.497%) | 92/6391 (1.440%) | -0.057 | -90 | -0.344 to +0.115 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6481 | 6391 | -90 |
| bare/syllables:2 | 23032 | 23051 | 19 |
| bare/syllables:3 | 13827 | 13821 | -6 |
| bare/syllables:4 | 4934 | 5001 | 67 |
| bare/syllables:5 | 1382 | 1380 | -2 |
| bare/syllables:6 | 277 | 292 | 15 |
| bare/syllables:7 | 55 | 58 | 3 |
| bare/syllables:8 | 11 | 5 | -6 |
| bare/syllables:9 | 1 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 17330.000 | 17438.000 | +108.000 |
| Mean letters | 4.421 | 4.426 | +0.005 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.048638 | 0.048583 | -0.000055 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.369641 | 0.363719 | -0.005923 |
| trigrams / missingReferenceMass | 0.329232 | 0.318877 | -0.010355 |
| trigrams / unseenGeneratedMass | 0.001999 | 0.001962 | -0.000037 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 823/50000 (1.646%) | 826/50000 (1.652%) | +0.006 | 0 | -0.060 to +0.140 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39807.000 | 39847.000 | +40.000 |
| Mean letters | 6.672 | 6.672 | -0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006518 | 0.006432 | -0.000086 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.154784 | 0.153958 | -0.000826 |
| trigrams / missingReferenceMass | 0.041590 | 0.041598 | 0.000008 |
| trigrams / unseenGeneratedMass | 0.006840 | 0.006823 | -0.000017 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29055 (0.000%) | 0/29075 (0.000%) | 0.000 | 20 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29055 (0.000%) | 0/29075 (0.000%) | 0.000 | 20 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22636 (0.000%) | 0/22615 (0.000%) | 0.000 | -21 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22636/50000 (45.272%) | 22615/50000 (45.230%) | -0.042 | 0 | -0.400 to +0.150 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6189/15293 (40.469%) | 6243/15373 (40.610%) | +0.141 | 80 | -0.803 to +1.033 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20945 (0.000%) | 0/20925 (0.000%) | 0.000 | -20 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 330/20945 (1.576%) | 323/20925 (1.544%) | -0.032 | -20 | -0.208 to +0.124 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17807 | 17766 | -41 |
| bare/syllables:2 | 5451 | 5521 | 70 |
| bare/syllables:3 | 2752 | 2695 | -57 |
| bare/syllables:4 | 1083 | 1124 | 41 |
| bare/syllables:5 | 238 | 242 | 4 |
| bare/syllables:6 | 33 | 37 | 4 |
| both/syllables:2 | 483 | 489 | 6 |
| both/syllables:3 | 972 | 1008 | 36 |
| both/syllables:4 | 611 | 615 | 4 |
| both/syllables:5 | 276 | 255 | -21 |
| both/syllables:6 | 99 | 108 | 9 |
| both/syllables:7 | 31 | 34 | 3 |
| both/syllables:8 | 9 | 6 | -3 |
| prefixed/syllables:2 | 3044 | 3067 | 23 |
| prefixed/syllables:3 | 1130 | 1138 | 8 |
| prefixed/syllables:4 | 535 | 512 | -23 |
| prefixed/syllables:5 | 211 | 210 | -1 |
| prefixed/syllables:6 | 62 | 63 | 1 |
| prefixed/syllables:7 | 10 | 10 | 0 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3138 | 3159 | 21 |
| suffixed/syllables:2 | 6315 | 6296 | -19 |
| suffixed/syllables:3 | 3530 | 3401 | -129 |
| suffixed/syllables:4 | 1443 | 1470 | 27 |
| suffixed/syllables:5 | 536 | 577 | 41 |
| suffixed/syllables:6 | 170 | 167 | -3 |
| suffixed/syllables:7 | 30 | 27 | -3 |
| suffixed/syllables:8 | 0 | 2 | 2 |
