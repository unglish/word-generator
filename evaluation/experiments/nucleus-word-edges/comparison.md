# Quality comparison: nucleus-word-edges

Original baseline: baseline-development-v1. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 43501.000 | 43808.000 | +307.000 |
| Mean letters | 7.462 | 7.480 | +0.018 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007238 | -0.000169 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.158184 | -0.000408 |
| trigrams / missingReferenceMass | 0.034830 | 0.035505 | 0.000676 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.010755 | -0.000241 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9370/45673 (20.515%) | -0.030 | 203 | -0.600 to +0.385 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45673 (0.000%) | 0.000 | 203 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 977/50000 (1.954%) | -0.062 | 0 | -0.350 to +0.390 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 111/50000 (0.222%) | -0.056 | 0 | -0.190 to +0.040 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3846/35030 (10.979%) | -0.070 | 78 | -0.815 to +0.578 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 1930/50000 (3.860%) | -0.052 | 0 | -0.300 to +0.350 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35030/50000 (70.060%) | +0.156 | 0 | -0.100 to +0.450 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 174/50000 (0.348%) | -0.012 | 0 | -0.050 to +0.090 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4498/20998 (21.421%) | +0.215 | -67 | -0.451 to +1.206 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 866/4327 (20.014%) | +0.168 | -203 | -0.695 to +1.635 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 747/50000 (1.494%) | +0.002 | 0 | -0.170 to +0.150 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 41/4327 (0.948%) | +0.948 | -203 | +0.118 to +1.469 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 2013 | 1847 | -166 |
| bare/syllables:2 | 6997 | 6954 | -43 |
| bare/syllables:3 | 4100 | 4169 | 69 |
| bare/syllables:4 | 1444 | 1479 | 35 |
| bare/syllables:5 | 387 | 420 | 33 |
| bare/syllables:6 | 92 | 78 | -14 |
| bare/syllables:7 | 14 | 23 | 9 |
| bare/syllables:8 | 1 | 0 | -1 |
| both/syllables:2 | 1044 | 980 | -64 |
| both/syllables:3 | 1800 | 1823 | 23 |
| both/syllables:4 | 929 | 944 | 15 |
| both/syllables:5 | 182 | 171 | -11 |
| both/syllables:6 | 20 | 22 | 2 |
| both/syllables:7 | 6 | 7 | 1 |
| prefixed/syllables:2 | 3302 | 3301 | -1 |
| prefixed/syllables:3 | 2560 | 2622 | 62 |
| prefixed/syllables:4 | 895 | 858 | -37 |
| prefixed/syllables:5 | 229 | 213 | -16 |
| prefixed/syllables:6 | 50 | 49 | -1 |
| prefixed/syllables:7 | 5 | 7 | 2 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 2517 | 2480 | -37 |
| suffixed/syllables:2 | 9722 | 9763 | 41 |
| suffixed/syllables:3 | 8058 | 8128 | 70 |
| suffixed/syllables:4 | 2733 | 2733 | 0 |
| suffixed/syllables:5 | 711 | 735 | 24 |
| suffixed/syllables:6 | 152 | 164 | 12 |
| suffixed/syllables:7 | 26 | 24 | -2 |
| suffixed/syllables:8 | 10 | 5 | -5 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47126.000 | 47126.000 | 0.000 |
| Mean letters | 7.418 | 7.408 | -0.010 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000573 | 0.000405 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.184700 | 0.000844 |
| trigrams / missingReferenceMass | 0.049072 | 0.057138 | 0.008066 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012502 | 0.000071 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43506 (0.000%) | 0.000 | -71 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43506 (0.000%) | 0.000 | -71 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 3133/50000 (6.266%) | +0.234 | 0 | -0.170 to +0.830 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 260/50000 (0.520%) | -0.024 | 0 | -0.060 to +0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9369/23001 (40.733%) | +0.068 | 82 | -1.913 to +1.235 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1276/6494 (19.649%) | -0.933 | 71 | -1.674 to +0.384 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1226/50000 (2.452%) | -0.330 | 0 | -0.750 to -0.100 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 59/6494 (0.909%) | +0.909 | 71 | +0.689 to +1.049 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6423 | 6494 | 71 |
| bare/syllables:2 | 22919 | 23001 | 82 |
| bare/syllables:3 | 13869 | 13810 | -59 |
| bare/syllables:4 | 5007 | 4968 | -39 |
| bare/syllables:5 | 1427 | 1359 | -68 |
| bare/syllables:6 | 308 | 310 | 2 |
| bare/syllables:7 | 43 | 47 | 4 |
| bare/syllables:8 | 3 | 11 | 8 |
| bare/syllables:9 | 1 | 0 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14397.000 | 14607.000 | +210.000 |
| Mean letters | 5.417 | 5.414 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.091806 | -0.000351 |
| phonemes / missingReferenceMass | 0.003390 | 0.000640 | -0.002750 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.524727 | -0.001191 |
| trigrams / missingReferenceMass | 0.374662 | 0.370508 | -0.004154 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.002584 | 0.000319 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5446/50000 (10.892%) | +0.034 | 0 | -0.600 to +0.750 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10617/50000 (21.234%) | -0.290 | 0 | -1.130 to +0.050 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 224/50000 (0.448%) | +0.012 | 0 | -0.090 to +0.170 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 540/50000 (1.080%) | +1.080 | 0 | +0.980 to +1.240 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 28443.000 | 28606.000 | +163.000 |
| Mean letters | 5.613 | 5.623 | +0.010 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010739 | -0.000363 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.182714 | -0.001766 |
| trigrams / missingReferenceMass | 0.051142 | 0.050482 | -0.000660 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009334 | -0.000104 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 9997/27355 (36.545%) | +0.037 | 109 | -0.729 to +0.604 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27355 (0.000%) | 0.000 | 109 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 566/50000 (1.132%) | -0.054 | 0 | -0.320 to +0.180 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 24/50000 (0.048%) | -0.002 | 0 | -0.060 to +0.030 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4559/22326 (20.420%) | +0.555 | -231 | -0.190 to +2.070 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 839/50000 (1.678%) | -0.050 | 0 | -0.190 to +0.060 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22326/50000 (44.652%) | -0.462 | 0 | -0.820 to +0.220 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 167/50000 (0.334%) | 0.000 | 0 | -0.040 to +0.050 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2524/17215 (14.662%) | +0.319 | 112 | -0.289 to +0.805 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4370/22645 (19.298%) | -0.373 | -109 | -1.491 to +0.415 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1046/50000 (2.092%) | +0.160 | 0 | -0.140 to +0.380 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 181/22645 (0.799%) | +0.799 | -109 | +0.601 to +1.041 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17931 | 17977 | 46 |
| bare/syllables:2 | 5435 | 5494 | 59 |
| bare/syllables:3 | 2713 | 2817 | 104 |
| bare/syllables:4 | 1105 | 1111 | 6 |
| bare/syllables:5 | 234 | 250 | 16 |
| bare/syllables:6 | 25 | 25 | 0 |
| both/syllables:2 | 912 | 932 | 20 |
| both/syllables:3 | 1110 | 1070 | -40 |
| both/syllables:4 | 465 | 437 | -28 |
| both/syllables:5 | 47 | 43 | -4 |
| both/syllables:6 | 5 | 6 | 1 |
| both/syllables:7 | 2 | 1 | -1 |
| prefixed/syllables:2 | 4081 | 4115 | 34 |
| prefixed/syllables:3 | 573 | 604 | 31 |
| prefixed/syllables:4 | 208 | 192 | -16 |
| prefixed/syllables:5 | 60 | 74 | 14 |
| prefixed/syllables:6 | 9 | 12 | 3 |
| suffixed/syllables:1 | 4823 | 4668 | -155 |
| suffixed/syllables:2 | 6675 | 6674 | -1 |
| suffixed/syllables:3 | 2861 | 2745 | -116 |
| suffixed/syllables:4 | 507 | 537 | 30 |
| suffixed/syllables:5 | 186 | 174 | -12 |
| suffixed/syllables:6 | 29 | 39 | 10 |
| suffixed/syllables:7 | 4 | 3 | -1 |
