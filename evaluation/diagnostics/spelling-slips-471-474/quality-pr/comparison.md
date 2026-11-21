# Quality comparison: candidate-a0218eecd40a

Original baseline: merge-base-81df038c87c9. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-81df038c87c9 | 81df038c87c908840d9bedaeaa457b0731e9467d | clean | 50d1e56674f65270e5dff6a8b9cb560dbca22f6efbdef958375ee88cfbe9e6b9 |
| candidate | candidate-a0218eecd40a | a0218eecd40af2e3c718fc9aa5dd4ff292745fdd | clean | 0e058dfdfefca938ca65e35d59f7fbed28817a434235efa8fcdb22df303ab6d4 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49552.000 | 49536.000 | -16.000 |
| Mean letters | 9.227 | 9.223 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004297 | 0.004427 | 0.000130 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.142895 | 0.142836 | -0.000059 |
| trigrams / missingReferenceMass | 0.031519 | 0.033406 | 0.001887 |
| trigrams / unseenGeneratedMass | 0.009125 | 0.009033 | -0.000092 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47005 (0.000%) | 0/47008 (0.000%) | 0.000 | 3 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47005 (0.000%) | 0/47008 (0.000%) | 0.000 | 3 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35043 (0.000%) | 0/34954 (0.000%) | 0.000 | -89 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35043/50000 (70.086%) | 34954/50000 (69.908%) | -0.178 | 0 | -1.790 to +1.110 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5319/13333 (39.893%) | 5317/13277 (40.047%) | +0.153 | -56 | -1.629 to +2.298 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2995 (0.000%) | 0/2992 (0.000%) | 0.000 | -3 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 48/2995 (1.603%) | 44/2992 (1.471%) | -0.132 | -3 | -0.623 to +0.443 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1937 | 1987 | 50 |
| bare/syllables:2 | 6958 | 6899 | -59 |
| bare/syllables:3 | 4099 | 4102 | 3 |
| bare/syllables:4 | 1430 | 1514 | 84 |
| bare/syllables:5 | 439 | 432 | -7 |
| bare/syllables:6 | 76 | 101 | 25 |
| bare/syllables:7 | 16 | 10 | -6 |
| bare/syllables:8 | 2 | 1 | -1 |
| both/syllables:10 | 0 | 1 | 1 |
| both/syllables:11 | 1 | 0 | -1 |
| both/syllables:2 | 142 | 157 | 15 |
| both/syllables:3 | 828 | 834 | 6 |
| both/syllables:4 | 1345 | 1431 | 86 |
| both/syllables:5 | 991 | 986 | -5 |
| both/syllables:6 | 456 | 426 | -30 |
| both/syllables:7 | 123 | 134 | 11 |
| both/syllables:8 | 42 | 30 | -12 |
| both/syllables:9 | 5 | 9 | 4 |
| prefixed/syllables:2 | 852 | 830 | -22 |
| prefixed/syllables:3 | 3179 | 3163 | -16 |
| prefixed/syllables:4 | 1990 | 2009 | 19 |
| prefixed/syllables:5 | 811 | 800 | -11 |
| prefixed/syllables:6 | 208 | 226 | 18 |
| prefixed/syllables:7 | 50 | 48 | -2 |
| prefixed/syllables:8 | 12 | 11 | -1 |
| prefixed/syllables:9 | 1 | 3 | 2 |
| suffixed/syllables:1 | 1058 | 1005 | -53 |
| suffixed/syllables:10 | 1 | 1 | 0 |
| suffixed/syllables:2 | 5381 | 5391 | 10 |
| suffixed/syllables:3 | 8633 | 8513 | -120 |
| suffixed/syllables:4 | 5764 | 5730 | -34 |
| suffixed/syllables:5 | 2262 | 2313 | 51 |
| suffixed/syllables:6 | 674 | 712 | 38 |
| suffixed/syllables:7 | 198 | 154 | -44 |
| suffixed/syllables:8 | 31 | 31 | 0 |
| suffixed/syllables:9 | 5 | 6 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47684.000 | 47545.000 | -139.000 |
| Mean letters | 7.410 | 7.411 | +0.001 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000667 | 0.000668 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174402 | 0.174736 | 0.000334 |
| trigrams / missingReferenceMass | 0.051342 | 0.052214 | 0.000873 |
| trigrams / unseenGeneratedMass | 0.011615 | 0.010316 | -0.001300 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43519 (0.000%) | 0/43489 (0.000%) | 0.000 | -30 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43519 (0.000%) | 0/43489 (0.000%) | 0.000 | -30 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9286/23032 (40.318%) | 9325/23055 (40.447%) | +0.129 | 23 | -1.122 to +1.084 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6481 (0.000%) | 0/6511 (0.000%) | 0.000 | 30 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 97/6481 (1.497%) | 115/6511 (1.766%) | +0.270 | 30 | -1.154 to +0.915 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6481 | 6511 | 30 |
| bare/syllables:2 | 23032 | 23055 | 23 |
| bare/syllables:3 | 13827 | 13606 | -221 |
| bare/syllables:4 | 4934 | 5013 | 79 |
| bare/syllables:5 | 1382 | 1432 | 50 |
| bare/syllables:6 | 277 | 325 | 48 |
| bare/syllables:7 | 55 | 53 | -2 |
| bare/syllables:8 | 11 | 4 | -7 |
| bare/syllables:9 | 1 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 17330.000 | 17311.000 | -19.000 |
| Mean letters | 4.421 | 4.422 | +0.001 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.048638 | 0.048581 | -0.000057 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.369641 | 0.369928 | 0.000287 |
| trigrams / missingReferenceMass | 0.329232 | 0.327579 | -0.001652 |
| trigrams / unseenGeneratedMass | 0.001999 | 0.001767 | -0.000232 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 823/50000 (1.646%) | 831/50000 (1.662%) | +0.016 | 0 | -0.050 to +0.080 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39807.000 | 39750.000 | -57.000 |
| Mean letters | 6.672 | 6.650 | -0.022 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006518 | 0.006549 | 0.000031 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.154784 | 0.155230 | 0.000446 |
| trigrams / missingReferenceMass | 0.041590 | 0.042893 | 0.001303 |
| trigrams / unseenGeneratedMass | 0.006840 | 0.006142 | -0.000698 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29055 (0.000%) | 0/28893 (0.000%) | 0.000 | -162 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29055 (0.000%) | 0/28893 (0.000%) | 0.000 | -162 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22636 (0.000%) | 0/22341 (0.000%) | 0.000 | -295 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22636/50000 (45.272%) | 22341/50000 (44.682%) | -0.590 | 0 | -0.950 to -0.290 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6189/15293 (40.469%) | 6242/15296 (40.808%) | +0.339 | 3 | -1.687 to +2.855 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20945 (0.000%) | 0/21107 (0.000%) | 0.000 | 162 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 330/20945 (1.576%) | 368/21107 (1.743%) | +0.168 | 162 | -0.270 to +0.508 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17807 | 17954 | 147 |
| bare/syllables:2 | 5451 | 5617 | 166 |
| bare/syllables:3 | 2752 | 2747 | -5 |
| bare/syllables:4 | 1083 | 1083 | 0 |
| bare/syllables:5 | 238 | 232 | -6 |
| bare/syllables:6 | 33 | 26 | -7 |
| both/syllables:2 | 483 | 482 | -1 |
| both/syllables:3 | 972 | 972 | 0 |
| both/syllables:4 | 611 | 606 | -5 |
| both/syllables:5 | 276 | 306 | 30 |
| both/syllables:6 | 99 | 103 | 4 |
| both/syllables:7 | 31 | 26 | -5 |
| both/syllables:8 | 9 | 4 | -5 |
| both/syllables:9 | 0 | 1 | 1 |
| prefixed/syllables:2 | 3044 | 3077 | 33 |
| prefixed/syllables:3 | 1130 | 1098 | -32 |
| prefixed/syllables:4 | 535 | 556 | 21 |
| prefixed/syllables:5 | 211 | 210 | -1 |
| prefixed/syllables:6 | 62 | 56 | -6 |
| prefixed/syllables:7 | 10 | 11 | 1 |
| prefixed/syllables:8 | 1 | 0 | -1 |
| suffixed/syllables:1 | 3138 | 3153 | 15 |
| suffixed/syllables:2 | 6315 | 6120 | -195 |
| suffixed/syllables:3 | 3530 | 3422 | -108 |
| suffixed/syllables:4 | 1443 | 1419 | -24 |
| suffixed/syllables:5 | 536 | 540 | 4 |
| suffixed/syllables:6 | 170 | 150 | -20 |
| suffixed/syllables:7 | 30 | 27 | -3 |
| suffixed/syllables:8 | 0 | 2 | 2 |
