# Quality comparison: q14b-following-letters-v1

Original baseline: q14b-original-recovered-rescore-v1. Cohort: development. Previous step: q14a-split-vowels-v1.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 4f03fd0c1294e70ef446e9fde3eeafe4e26916b3d0672e8ef5bda1c065f9bf66. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 43651.000 | +150.000 | 43673.000 | -22.000 |
| Mean letters | 7.462 | 7.544 | +0.082 | 7.530 | +0.014 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007786 | 0.000378 | 0.007731 | 0.000055 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.171986 | 0.013394 | 0.171582 | 0.000404 |
| trigrams / missingReferenceMass | 0.034830 | 0.035408 | 0.000578 | 0.036060 | -0.000652 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.012839 | 0.001843 | 0.012936 | -0.000097 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9550/45528 (20.976%) | +0.431 | 58 | -0.325 to +0.913 | 9307/45426 (20.488%) | +0.488 | 102 | -0.918 to +1.246 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45528 (0.000%) | 0.000 | 58 | 0.000 to 0.000 | 0/45426 (0.000%) | 0.000 | 102 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 972/50000 (1.944%) | -0.072 | 0 | -0.230 to +0.170 | 996/50000 (1.992%) | -0.048 | 0 | -0.270 to +0.180 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 149/50000 (0.298%) | +0.020 | 0 | -0.010 to +0.060 | 128/50000 (0.256%) | +0.042 | 0 | -0.060 to +0.220 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3921/35191 (11.142%) | +0.093 | 239 | -0.349 to +0.381 | 3930/35001 (11.228%) | -0.086 | 190 | -0.333 to +0.146 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 0/50000 (0.000%) | -3.912 | 0 | -4.250 to -3.710 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35191/50000 (70.382%) | +0.478 | 0 | -0.150 to +0.810 | 35001/50000 (70.002%) | +0.380 | 0 | -0.460 to +1.620 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 119/50000 (0.238%) | -0.122 | 0 | -0.270 to +0.040 | 158/50000 (0.316%) | -0.078 | 0 | -0.150 to +0.040 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4411/20930 (21.075%) | -0.131 | -135 | -1.212 to +0.768 | 4463/20798 (21.459%) | -0.384 | 132 | -2.572 to +1.019 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 895/4472 (20.013%) | +0.168 | -58 | -2.455 to +1.537 | 961/4574 (21.010%) | -0.997 | -102 | -5.148 to +2.063 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 767/50000 (1.534%) | +0.042 | 0 | -0.110 to +0.280 | 813/50000 (1.626%) | -0.092 | 0 | -0.430 to +0.080 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4472 (0.000%) | 0.000 | -58 | 0.000 to 0.000 | 0/4574 (0.000%) | 0.000 | -102 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1932 | -81 | 1999 | -67 |
| bare/syllables:2 | 6997 | 6846 | -151 | 6829 | 17 |
| bare/syllables:3 | 4100 | 3999 | -101 | 4133 | -134 |
| bare/syllables:4 | 1444 | 1481 | 37 | 1527 | -46 |
| bare/syllables:5 | 387 | 442 | 55 | 408 | 34 |
| bare/syllables:6 | 92 | 86 | -6 | 92 | -6 |
| bare/syllables:7 | 14 | 21 | 7 | 9 | 12 |
| bare/syllables:8 | 1 | 2 | 1 | 2 | 0 |
| both/syllables:2 | 1044 | 1053 | 9 | 1049 | 4 |
| both/syllables:3 | 1800 | 1871 | 71 | 1763 | 108 |
| both/syllables:4 | 929 | 971 | 42 | 934 | 37 |
| both/syllables:5 | 182 | 186 | 4 | 176 | 10 |
| both/syllables:6 | 20 | 38 | 18 | 32 | 6 |
| both/syllables:7 | 6 | 4 | -2 | 5 | -1 |
| both/syllables:8 | 0 | 2 | 2 | 0 | 2 |
| prefixed/syllables:2 | 3302 | 3283 | -19 | 3259 | 24 |
| prefixed/syllables:3 | 2560 | 2485 | -75 | 2637 | -152 |
| prefixed/syllables:4 | 895 | 881 | -14 | 880 | 1 |
| prefixed/syllables:5 | 229 | 223 | -6 | 223 | 0 |
| prefixed/syllables:6 | 50 | 38 | -12 | 55 | -17 |
| prefixed/syllables:7 | 5 | 6 | 1 | 11 | -5 |
| prefixed/syllables:8 | 1 | 1 | 0 | 0 | 1 |
| suffixed/syllables:1 | 2517 | 2540 | 23 | 2575 | -35 |
| suffixed/syllables:2 | 9722 | 9748 | 26 | 9661 | 87 |
| suffixed/syllables:3 | 8058 | 8180 | 122 | 8187 | -7 |
| suffixed/syllables:4 | 2733 | 2792 | 59 | 2698 | 94 |
| suffixed/syllables:5 | 711 | 700 | -11 | 690 | 10 |
| suffixed/syllables:6 | 152 | 155 | 3 | 129 | 26 |
| suffixed/syllables:7 | 26 | 29 | 3 | 34 | -5 |
| suffixed/syllables:8 | 10 | 5 | -5 | 1 | 4 |
| suffixed/syllables:9 | 0 | 0 | 0 | 2 | -2 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47253.000 | +127.000 | 47338.000 | -85.000 |
| Mean letters | 7.418 | 7.499 | +0.081 | 7.510 | -0.010 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000257 | 0.000089 | 0.000204 | 0.000053 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.199137 | 0.015282 | 0.198006 | 0.001131 |
| trigrams / missingReferenceMass | 0.049072 | 0.047358 | -0.001714 | 0.045810 | 0.001548 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.015558 | 0.003127 | 0.015493 | 0.000065 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43447 (0.000%) | 0.000 | -130 | 0.000 to 0.000 | 0/43624 (0.000%) | 0.000 | -177 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43447 (0.000%) | 0.000 | -130 | 0.000 to 0.000 | 0/43624 (0.000%) | 0.000 | -177 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 0/50000 (0.000%) | -6.032 | 0 | -6.270 to -5.680 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 235/50000 (0.470%) | -0.074 | 0 | -0.130 to +0.030 | 207/50000 (0.414%) | +0.056 | 0 | -0.030 to +0.140 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9231/23015 (40.109%) | -0.556 | 96 | -2.393 to +1.143 | 9467/23200 (40.806%) | -0.697 | -185 | -2.027 to +0.291 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1366/6553 (20.845%) | +0.263 | 130 | -2.171 to +0.981 | 1261/6376 (19.777%) | +1.068 | 177 | -1.776 to +4.057 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1349/50000 (2.698%) | -0.084 | 0 | -0.610 to +0.190 | 1282/50000 (2.564%) | +0.134 | 0 | -0.340 to +0.340 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6553 (0.000%) | 0.000 | 130 | 0.000 to 0.000 | 0/6376 (0.000%) | 0.000 | 177 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6553 | 130 | 6376 | 177 |
| bare/syllables:2 | 22919 | 23015 | 96 | 23200 | -185 |
| bare/syllables:3 | 13869 | 13708 | -161 | 13710 | -2 |
| bare/syllables:4 | 5007 | 4970 | -37 | 4960 | 10 |
| bare/syllables:5 | 1427 | 1402 | -25 | 1405 | -3 |
| bare/syllables:6 | 308 | 308 | 0 | 299 | 9 |
| bare/syllables:7 | 43 | 37 | -6 | 43 | -6 |
| bare/syllables:8 | 3 | 5 | 2 | 6 | -1 |
| bare/syllables:9 | 1 | 2 | 1 | 1 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 17246.000 | +2849.000 | 17379.000 | -133.000 |
| Mean letters | 5.417 | 5.552 | +0.135 | 5.554 | -0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.094875 | 0.002718 | 0.094859 | 0.000016 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.536035 | 0.010116 | 0.535644 | 0.000391 |
| trigrams / missingReferenceMass | 0.374662 | 0.384902 | 0.010240 | 0.382245 | 0.002657 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.021937 | 0.019672 | 0.021359 | 0.000578 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Polysyllables with multiple primary stresses / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5160/50000 (10.320%) | -0.538 | 0 | -1.330 to +0.530 | 4957/50000 (9.914%) | +0.406 | 0 | -0.110 to +0.780 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10959/50000 (21.918%) | +0.394 | 0 | -0.100 to +1.150 | 11023/50000 (22.046%) | -0.128 | 0 | -0.590 to +0.440 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 251/50000 (0.502%) | +0.066 | 0 | -0.080 to +0.190 | 270/50000 (0.540%) | -0.038 | 0 | -0.100 to +0.020 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 29100.000 | +657.000 | 29065.000 | +35.000 |
| Mean letters | 5.613 | 5.669 | +0.056 | 5.663 | +0.006 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010532 | -0.000571 | 0.010967 | -0.000436 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.198552 | 0.014072 | 0.198168 | 0.000384 |
| trigrams / missingReferenceMass | 0.051142 | 0.050551 | -0.000591 | 0.049415 | 0.001136 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.012155 | 0.002717 | 0.012143 | 0.000012 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 9997/27349 (36.553%) | +0.045 | 103 | -0.611 to +0.786 | 9965/27206 (36.628%) | -0.075 | 143 | -1.691 to +1.806 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27349 (0.000%) | 0.000 | 103 | 0.000 to 0.000 | 0/27206 (0.000%) | 0.000 | 143 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 508/50000 (1.016%) | -0.170 | 0 | -0.300 to -0.040 | 564/50000 (1.128%) | -0.112 | 0 | -0.290 to +0.070 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 29/50000 (0.058%) | +0.008 | 0 | -0.030 to +0.060 | 21/50000 (0.042%) | +0.016 | 0 | -0.020 to +0.060 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4431/22475 (19.715%) | -0.150 | -82 | -1.016 to +1.093 | 4421/22470 (19.675%) | +0.040 | 5 | -1.297 to +1.607 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 0/50000 (0.000%) | -1.728 | 0 | -1.850 to -1.570 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22475/50000 (44.950%) | -0.164 | 0 | -1.030 to +0.510 | 22470/50000 (44.940%) | +0.010 | 0 | -0.660 to +0.990 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 199/50000 (0.398%) | +0.064 | 0 | -0.020 to +0.170 | 189/50000 (0.378%) | +0.020 | 0 | -0.040 to +0.050 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2532/17221 (14.703%) | +0.360 | 118 | -0.882 to +1.224 | 2431/17098 (14.218%) | +0.485 | 123 | -1.815 to +1.853 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4412/22651 (19.478%) | -0.193 | -103 | -0.778 to +0.481 | 4464/22794 (19.584%) | -0.106 | -143 | -1.550 to +1.840 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1025/50000 (2.050%) | +0.118 | 0 | +0.040 to +0.240 | 1028/50000 (2.056%) | -0.006 | 0 | -0.110 to +0.180 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22651 (0.000%) | 0.000 | -103 | 0.000 to 0.000 | 0/22794 (0.000%) | 0.000 | -143 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 17903 | -28 | 18064 | -161 |
| bare/syllables:2 | 5435 | 5527 | 92 | 5420 | 107 |
| bare/syllables:3 | 2713 | 2728 | 15 | 2674 | 54 |
| bare/syllables:4 | 1105 | 1083 | -22 | 1095 | -12 |
| bare/syllables:5 | 234 | 252 | 18 | 253 | -1 |
| bare/syllables:6 | 25 | 32 | 7 | 24 | 8 |
| both/syllables:2 | 912 | 925 | 13 | 940 | -15 |
| both/syllables:3 | 1110 | 1076 | -34 | 1108 | -32 |
| both/syllables:4 | 465 | 441 | -24 | 449 | -8 |
| both/syllables:5 | 47 | 44 | -3 | 42 | 2 |
| both/syllables:6 | 5 | 3 | -2 | 5 | -2 |
| both/syllables:7 | 2 | 2 | 0 | 0 | 2 |
| prefixed/syllables:2 | 4081 | 4061 | -20 | 4074 | -13 |
| prefixed/syllables:3 | 573 | 586 | 13 | 606 | -20 |
| prefixed/syllables:4 | 208 | 214 | 6 | 215 | -1 |
| prefixed/syllables:5 | 60 | 49 | -11 | 58 | -9 |
| prefixed/syllables:6 | 9 | 15 | 6 | 7 | 8 |
| prefixed/syllables:7 | 0 | 0 | 0 | 1 | -1 |
| suffixed/syllables:1 | 4823 | 4748 | -75 | 4730 | 18 |
| suffixed/syllables:2 | 6675 | 6708 | 33 | 6664 | 44 |
| suffixed/syllables:3 | 2861 | 2807 | -54 | 2804 | 3 |
| suffixed/syllables:4 | 507 | 553 | 46 | 554 | -1 |
| suffixed/syllables:5 | 186 | 198 | 12 | 174 | 24 |
| suffixed/syllables:6 | 29 | 43 | 14 | 34 | 9 |
| suffixed/syllables:7 | 4 | 2 | -2 | 5 | -3 |
