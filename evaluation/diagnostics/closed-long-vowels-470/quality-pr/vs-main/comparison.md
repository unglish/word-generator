# Quality comparison: candidate-9ae4d67fc2bc

Original baseline: merge-base-81df038c87c9. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-81df038c87c9 | 81df038c87c908840d9bedaeaa457b0731e9467d | clean | 50d1e56674f65270e5dff6a8b9cb560dbca22f6efbdef958375ee88cfbe9e6b9 |
| candidate | candidate-9ae4d67fc2bc | 9ae4d67fc2bc54f72c26bf2e1835945f7ddad7bb | clean | eadbe3993ec4b89768fc1e485f42b67f27d8d3c57a3cd94801d04c37d9602602 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49552.000 | 49473.000 | -79.000 |
| Mean letters | 9.227 | 9.280 | +0.053 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004297 | 0.004336 | 0.000040 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.142895 | 0.146571 | 0.003676 |
| trigrams / missingReferenceMass | 0.031519 | 0.032503 | 0.000984 |
| trigrams / unseenGeneratedMass | 0.009125 | 0.008291 | -0.000833 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47005 (0.000%) | 0/46973 (0.000%) | 0.000 | -32 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47005 (0.000%) | 0/46973 (0.000%) | 0.000 | -32 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35043 (0.000%) | 0/34980 (0.000%) | 0.000 | -63 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35043/50000 (70.086%) | 34980/50000 (69.960%) | -0.126 | 0 | -1.010 to +0.410 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5319/13333 (39.893%) | 5257/13330 (39.437%) | -0.456 | -3 | -2.931 to +1.456 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2995 (0.000%) | 0/3027 (0.000%) | 0.000 | 32 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 48/2995 (1.603%) | 40/3027 (1.321%) | -0.281 | 32 | -0.715 to +0.142 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1937 | 1978 | 41 |
| bare/syllables:2 | 6958 | 6892 | -66 |
| bare/syllables:3 | 4099 | 4082 | -17 |
| bare/syllables:4 | 1430 | 1521 | 91 |
| bare/syllables:5 | 439 | 430 | -9 |
| bare/syllables:6 | 76 | 99 | 23 |
| bare/syllables:7 | 16 | 16 | 0 |
| bare/syllables:8 | 2 | 2 | 0 |
| both/syllables:11 | 1 | 0 | -1 |
| both/syllables:2 | 142 | 158 | 16 |
| both/syllables:3 | 828 | 873 | 45 |
| both/syllables:4 | 1345 | 1429 | 84 |
| both/syllables:5 | 991 | 995 | 4 |
| both/syllables:6 | 456 | 424 | -32 |
| both/syllables:7 | 123 | 149 | 26 |
| both/syllables:8 | 42 | 51 | 9 |
| both/syllables:9 | 5 | 10 | 5 |
| prefixed/syllables:10 | 0 | 1 | 1 |
| prefixed/syllables:2 | 852 | 861 | 9 |
| prefixed/syllables:3 | 3179 | 3107 | -72 |
| prefixed/syllables:4 | 1990 | 1960 | -30 |
| prefixed/syllables:5 | 811 | 751 | -60 |
| prefixed/syllables:6 | 208 | 238 | 30 |
| prefixed/syllables:7 | 50 | 40 | -10 |
| prefixed/syllables:8 | 12 | 6 | -6 |
| prefixed/syllables:9 | 1 | 0 | -1 |
| suffixed/syllables:1 | 1058 | 1049 | -9 |
| suffixed/syllables:10 | 1 | 1 | 0 |
| suffixed/syllables:2 | 5381 | 5419 | 38 |
| suffixed/syllables:3 | 8633 | 8420 | -213 |
| suffixed/syllables:4 | 5764 | 5777 | 13 |
| suffixed/syllables:5 | 2262 | 2301 | 39 |
| suffixed/syllables:6 | 674 | 769 | 95 |
| suffixed/syllables:7 | 198 | 157 | -41 |
| suffixed/syllables:8 | 31 | 28 | -3 |
| suffixed/syllables:9 | 5 | 6 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47684.000 | 47553.000 | -131.000 |
| Mean letters | 7.410 | 7.449 | +0.039 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000667 | 0.000624 | -0.000044 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174402 | 0.181004 | 0.006602 |
| trigrams / missingReferenceMass | 0.051342 | 0.054204 | 0.002862 |
| trigrams / unseenGeneratedMass | 0.011615 | 0.009994 | -0.001621 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43519 (0.000%) | 0/43433 (0.000%) | 0.000 | -86 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43519 (0.000%) | 0/43433 (0.000%) | 0.000 | -86 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9286/23032 (40.318%) | 9276/22810 (40.666%) | +0.349 | -222 | -0.785 to +1.763 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6481 (0.000%) | 0/6567 (0.000%) | 0.000 | 86 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 97/6481 (1.497%) | 110/6567 (1.675%) | +0.178 | 86 | -0.352 to +0.595 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6481 | 6567 | 86 |
| bare/syllables:2 | 23032 | 22810 | -222 |
| bare/syllables:3 | 13827 | 13895 | 68 |
| bare/syllables:4 | 4934 | 5001 | 67 |
| bare/syllables:5 | 1382 | 1363 | -19 |
| bare/syllables:6 | 277 | 305 | 28 |
| bare/syllables:7 | 55 | 46 | -9 |
| bare/syllables:8 | 11 | 12 | 1 |
| bare/syllables:9 | 1 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 17330.000 | 16876.000 | -454.000 |
| Mean letters | 4.421 | 4.424 | +0.003 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.048638 | 0.048350 | -0.000288 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.369641 | 0.380482 | 0.010840 |
| trigrams / missingReferenceMass | 0.329232 | 0.319951 | -0.009281 |
| trigrams / unseenGeneratedMass | 0.001999 | 0.001939 | -0.000060 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 823/50000 (1.646%) | 805/50000 (1.610%) | -0.036 | 0 | -0.110 to +0.110 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39807.000 | 39589.000 | -218.000 |
| Mean letters | 6.672 | 6.690 | +0.018 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006518 | 0.006315 | -0.000203 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.154784 | 0.159406 | 0.004622 |
| trigrams / missingReferenceMass | 0.041590 | 0.042575 | 0.000984 |
| trigrams / unseenGeneratedMass | 0.006840 | 0.005778 | -0.001062 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29055 (0.000%) | 0/28872 (0.000%) | 0.000 | -183 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29055 (0.000%) | 0/28872 (0.000%) | 0.000 | -183 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22636 (0.000%) | 0/22513 (0.000%) | 0.000 | -123 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22636/50000 (45.272%) | 22513/50000 (45.026%) | -0.246 | 0 | -1.020 to +0.550 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6189/15293 (40.469%) | 6167/15201 (40.570%) | +0.100 | -92 | -1.436 to +1.073 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20945 (0.000%) | 0/21128 (0.000%) | 0.000 | 183 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 330/20945 (1.576%) | 316/21128 (1.496%) | -0.080 | 183 | -0.262 to +0.066 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17807 | 17933 | 126 |
| bare/syllables:2 | 5451 | 5441 | -10 |
| bare/syllables:3 | 2752 | 2725 | -27 |
| bare/syllables:4 | 1083 | 1101 | 18 |
| bare/syllables:5 | 238 | 259 | 21 |
| bare/syllables:6 | 33 | 28 | -5 |
| both/syllables:2 | 483 | 478 | -5 |
| both/syllables:3 | 972 | 983 | 11 |
| both/syllables:4 | 611 | 620 | 9 |
| both/syllables:5 | 276 | 264 | -12 |
| both/syllables:6 | 99 | 98 | -1 |
| both/syllables:7 | 31 | 33 | 2 |
| both/syllables:8 | 9 | 4 | -5 |
| both/syllables:9 | 0 | 1 | 1 |
| prefixed/syllables:2 | 3044 | 3074 | 30 |
| prefixed/syllables:3 | 1130 | 1130 | 0 |
| prefixed/syllables:4 | 535 | 557 | 22 |
| prefixed/syllables:5 | 211 | 193 | -18 |
| prefixed/syllables:6 | 62 | 53 | -9 |
| prefixed/syllables:7 | 10 | 11 | 1 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3138 | 3195 | 57 |
| suffixed/syllables:2 | 6315 | 6208 | -107 |
| suffixed/syllables:3 | 3530 | 3416 | -114 |
| suffixed/syllables:4 | 1443 | 1431 | -12 |
| suffixed/syllables:5 | 536 | 581 | 45 |
| suffixed/syllables:6 | 170 | 151 | -19 |
| suffixed/syllables:7 | 30 | 29 | -1 |
| suffixed/syllables:8 | 0 | 2 | 2 |
