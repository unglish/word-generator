# Quality comparison: final-lexical-stress-v2

Original baseline: baseline-development-v1. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 43501.000 | 44425.000 | +924.000 |
| Mean letters | 7.462 | 7.499 | +0.037 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.006048 | -0.001359 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.158689 | 0.000097 |
| trigrams / missingReferenceMass | 0.034830 | 0.034663 | -0.000167 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.011104 | 0.000108 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 0/45607 (0.000%) | -20.545 | 137 | -20.824 to -20.262 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45607 (0.000%) | 0.000 | 137 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 0/50000 (0.000%) | -2.016 | 0 | -2.190 to -1.840 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 0/50000 (0.000%) | -0.278 | 0 | -0.370 to -0.170 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3812/34846 (10.940%) | -0.110 | -106 | -0.801 to +0.330 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 1908/50000 (3.816%) | -0.096 | 0 | -0.330 to +0.110 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 34846/50000 (69.692%) | -0.212 | 0 | -0.760 to +0.570 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 188/50000 (0.376%) | +0.016 | 0 | -0.110 to +0.180 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 8778/20947 (41.906%) | +20.700 | -118 | +19.841 to +21.515 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 0/4393 (0.000%) | -19.845 | -137 | -22.172 to -17.492 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 919/50000 (1.838%) | +0.346 | 0 | +0.240 to +0.510 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 19/4393 (0.433%) | +0.433 | -137 | +0.233 to +0.585 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 2013 | 1996 | -17 |
| bare/syllables:2 | 6997 | 6964 | -33 |
| bare/syllables:3 | 4100 | 4146 | 46 |
| bare/syllables:4 | 1444 | 1498 | 54 |
| bare/syllables:5 | 387 | 441 | 54 |
| bare/syllables:6 | 92 | 85 | -7 |
| bare/syllables:7 | 14 | 23 | 9 |
| bare/syllables:8 | 1 | 1 | 0 |
| both/syllables:2 | 1044 | 1018 | -26 |
| both/syllables:3 | 1800 | 1838 | 38 |
| both/syllables:4 | 929 | 930 | 1 |
| both/syllables:5 | 182 | 180 | -2 |
| both/syllables:6 | 20 | 32 | 12 |
| both/syllables:7 | 6 | 6 | 0 |
| prefixed/syllables:2 | 3302 | 3247 | -55 |
| prefixed/syllables:3 | 2560 | 2577 | 17 |
| prefixed/syllables:4 | 895 | 873 | -22 |
| prefixed/syllables:5 | 229 | 217 | -12 |
| prefixed/syllables:6 | 50 | 54 | 4 |
| prefixed/syllables:7 | 5 | 8 | 3 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 2517 | 2397 | -120 |
| suffixed/syllables:2 | 9722 | 9718 | -4 |
| suffixed/syllables:3 | 8058 | 8157 | 99 |
| suffixed/syllables:4 | 2733 | 2710 | -23 |
| suffixed/syllables:5 | 711 | 697 | -14 |
| suffixed/syllables:6 | 152 | 162 | 10 |
| suffixed/syllables:7 | 26 | 20 | -6 |
| suffixed/syllables:8 | 10 | 4 | -6 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47126.000 | 47441.000 | +315.000 |
| Mean letters | 7.418 | 7.401 | -0.018 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000310 | 0.000142 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.184304 | 0.000448 |
| trigrams / missingReferenceMass | 0.049072 | 0.053635 | 0.004563 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012276 | -0.000155 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43479 (0.000%) | 0.000 | -98 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43479 (0.000%) | 0.000 | -98 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 3116/50000 (6.232%) | +0.200 | 0 | +0.040 to +0.370 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 263/50000 (0.526%) | -0.018 | 0 | -0.100 to +0.090 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9428/23122 (40.775%) | +0.110 | 203 | -1.141 to +0.861 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 0/6521 (0.000%) | -20.582 | 98 | -21.626 to -19.505 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1330/50000 (2.660%) | -0.122 | 0 | -0.470 to +0.120 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 47/6521 (0.721%) | +0.721 | 98 | +0.501 to +1.095 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6423 | 6521 | 98 |
| bare/syllables:2 | 22919 | 23122 | 203 |
| bare/syllables:3 | 13869 | 13735 | -134 |
| bare/syllables:4 | 5007 | 4881 | -126 |
| bare/syllables:5 | 1427 | 1391 | -36 |
| bare/syllables:6 | 308 | 312 | 4 |
| bare/syllables:7 | 43 | 29 | -14 |
| bare/syllables:8 | 3 | 9 | 6 |
| bare/syllables:9 | 1 | 0 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14397.000 | 16004.000 | +1607.000 |
| Mean letters | 5.417 | 5.454 | +0.036 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.095402 | 0.003245 |
| phonemes / missingReferenceMass | 0.003390 | 0.000640 | -0.002750 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.506436 | -0.019483 |
| trigrams / missingReferenceMass | 0.374662 | 0.368631 | -0.006031 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.003237 | 0.000972 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5451/50000 (10.902%) | +0.044 | 0 | -0.710 to +0.630 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 0/50000 (0.000%) | -21.524 | 0 | -22.090 to -20.730 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 262/50000 (0.524%) | +0.088 | 0 | +0.020 to +0.180 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 295/50000 (0.590%) | +0.590 | 0 | +0.510 to +0.640 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 28443.000 | 29724.000 | +1281.000 |
| Mean letters | 5.613 | 5.664 | +0.050 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.009485 | -0.001618 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.179948 | -0.004532 |
| trigrams / missingReferenceMass | 0.051142 | 0.050143 | -0.000999 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009952 | 0.000515 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 0/27247 (0.000%) | -36.508 | 1 | -36.917 to -36.068 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27247 (0.000%) | 0.000 | 1 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 0/50000 (0.000%) | -1.186 | 0 | -1.250 to -1.100 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 0/50000 (0.000%) | -0.050 | 0 | -0.070 to -0.020 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4453/22532 (19.763%) | -0.102 | -25 | -0.852 to +0.346 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 840/50000 (1.680%) | -0.048 | 0 | -0.220 to +0.120 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22532/50000 (45.064%) | -0.050 | 0 | -0.910 to +0.660 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 136/50000 (0.272%) | -0.062 | 0 | -0.090 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 7584/17040 (44.507%) | +30.165 | -63 | +29.265 to +31.111 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 0/22753 (0.000%) | -19.671 | -1 | -20.545 to -18.573 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1150/50000 (2.300%) | +0.368 | 0 | +0.220 to +0.500 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 116/22753 (0.510%) | +0.510 | -1 | +0.329 to +0.652 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17931 | 17874 | -57 |
| bare/syllables:2 | 5435 | 5435 | 0 |
| bare/syllables:3 | 2713 | 2742 | 29 |
| bare/syllables:4 | 1105 | 1166 | 61 |
| bare/syllables:5 | 234 | 225 | -9 |
| bare/syllables:6 | 25 | 26 | 1 |
| both/syllables:2 | 912 | 928 | 16 |
| both/syllables:3 | 1110 | 1086 | -24 |
| both/syllables:4 | 465 | 455 | -10 |
| both/syllables:5 | 47 | 45 | -2 |
| both/syllables:6 | 5 | 6 | 1 |
| both/syllables:7 | 2 | 2 | 0 |
| prefixed/syllables:2 | 4081 | 4157 | 76 |
| prefixed/syllables:3 | 573 | 628 | 55 |
| prefixed/syllables:4 | 208 | 186 | -22 |
| prefixed/syllables:5 | 60 | 71 | 11 |
| prefixed/syllables:6 | 9 | 12 | 3 |
| prefixed/syllables:7 | 0 | 2 | 2 |
| suffixed/syllables:1 | 4823 | 4879 | 56 |
| suffixed/syllables:2 | 6675 | 6520 | -155 |
| suffixed/syllables:3 | 2861 | 2808 | -53 |
| suffixed/syllables:4 | 507 | 540 | 33 |
| suffixed/syllables:5 | 186 | 181 | -5 |
| suffixed/syllables:6 | 29 | 25 | -4 |
| suffixed/syllables:7 | 4 | 1 | -3 |
