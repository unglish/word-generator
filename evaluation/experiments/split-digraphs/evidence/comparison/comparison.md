# Quality comparison: q14a-split-vowels-v1

Original baseline: q14a-original-baseline-rescore-v1. Cohort: development. Previous step: q14a-immediate-control-rescore-v1.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 4f03fd0c1294e70ef446e9fde3eeafe4e26916b3d0672e8ef5bda1c065f9bf66. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 43673.000 | +172.000 | 43779.000 | -106.000 |
| Mean letters | 7.462 | 7.530 | +0.069 | 7.486 | +0.045 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007731 | 0.000324 | 0.007490 | 0.000241 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.171582 | 0.012990 | 0.155906 | 0.015676 |
| trigrams / missingReferenceMass | 0.034830 | 0.036060 | 0.001230 | 0.032966 | 0.003094 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.012936 | 0.001939 | 0.010471 | 0.002465 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9307/45426 (20.488%) | -0.057 | -44 | -0.563 to +0.593 | 9219/45637 (20.201%) | +0.288 | -211 | -0.345 to +1.246 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45426 (0.000%) | 0.000 | -44 | 0.000 to 0.000 | 0/45637 (0.000%) | 0.000 | -211 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 996/50000 (1.992%) | -0.024 | 0 | -0.200 to +0.050 | 1058/50000 (2.116%) | -0.124 | 0 | -0.330 to +0.130 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 128/50000 (0.256%) | -0.022 | 0 | -0.160 to +0.100 | 135/50000 (0.270%) | -0.014 | 0 | -0.090 to +0.140 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3930/35001 (11.228%) | +0.179 | 49 | -0.324 to +0.515 | 3899/35056 (11.122%) | +0.106 | -55 | -0.365 to +0.381 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 0/50000 (0.000%) | -3.912 | 0 | -4.250 to -3.710 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35001/50000 (70.002%) | +0.098 | 0 | -1.140 to +0.770 | 35056/50000 (70.112%) | -0.110 | 0 | -1.200 to +0.520 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 158/50000 (0.316%) | -0.044 | 0 | -0.160 to +0.130 | 121/50000 (0.242%) | +0.074 | 0 | -0.030 to +0.200 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4463/20798 (21.459%) | +0.253 | -267 | -1.145 to +1.873 | 4427/20827 (21.256%) | +0.203 | -29 | -0.917 to +1.559 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 961/4574 (21.010%) | +1.165 | 44 | -2.083 to +5.432 | 872/4363 (19.986%) | +1.024 | 211 | -0.602 to +2.930 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 813/50000 (1.626%) | +0.134 | 0 | -0.080 to +0.410 | 797/50000 (1.594%) | +0.032 | 0 | -0.230 to +0.340 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4574 (0.000%) | 0.000 | 44 | 0.000 to 0.000 | 0/4363 (0.000%) | 0.000 | 211 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1999 | -14 | 1849 | 150 |
| bare/syllables:2 | 6997 | 6829 | -168 | 6886 | -57 |
| bare/syllables:3 | 4100 | 4133 | 33 | 4184 | -51 |
| bare/syllables:4 | 1444 | 1527 | 83 | 1517 | 10 |
| bare/syllables:5 | 387 | 408 | 21 | 407 | 1 |
| bare/syllables:6 | 92 | 92 | 0 | 83 | 9 |
| bare/syllables:7 | 14 | 9 | -5 | 15 | -6 |
| bare/syllables:8 | 1 | 2 | 1 | 3 | -1 |
| both/syllables:2 | 1044 | 1049 | 5 | 1025 | 24 |
| both/syllables:3 | 1800 | 1763 | -37 | 1748 | 15 |
| both/syllables:4 | 929 | 934 | 5 | 1009 | -75 |
| both/syllables:5 | 182 | 176 | -6 | 182 | -6 |
| both/syllables:6 | 20 | 32 | 12 | 26 | 6 |
| both/syllables:7 | 6 | 5 | -1 | 11 | -6 |
| both/syllables:8 | 0 | 0 | 0 | 1 | -1 |
| prefixed/syllables:2 | 3302 | 3259 | -43 | 3230 | 29 |
| prefixed/syllables:3 | 2560 | 2637 | 77 | 2638 | -1 |
| prefixed/syllables:4 | 895 | 880 | -15 | 847 | 33 |
| prefixed/syllables:5 | 229 | 223 | -6 | 224 | -1 |
| prefixed/syllables:6 | 50 | 55 | 5 | 67 | -12 |
| prefixed/syllables:7 | 5 | 11 | 6 | 10 | 1 |
| prefixed/syllables:8 | 1 | 0 | -1 | 1 | -1 |
| suffixed/syllables:1 | 2517 | 2575 | 58 | 2514 | 61 |
| suffixed/syllables:2 | 9722 | 9661 | -61 | 9686 | -25 |
| suffixed/syllables:3 | 8058 | 8187 | 129 | 8146 | 41 |
| suffixed/syllables:4 | 2733 | 2698 | -35 | 2767 | -69 |
| suffixed/syllables:5 | 711 | 690 | -21 | 729 | -39 |
| suffixed/syllables:6 | 152 | 129 | -23 | 162 | -33 |
| suffixed/syllables:7 | 26 | 34 | 8 | 28 | 6 |
| suffixed/syllables:8 | 10 | 1 | -9 | 3 | -2 |
| suffixed/syllables:9 | 0 | 2 | 2 | 2 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47338.000 | +212.000 | 47182.000 | +156.000 |
| Mean letters | 7.418 | 7.510 | +0.091 | 7.394 | +0.116 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000204 | 0.000036 | 0.000233 | -0.000029 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.198006 | 0.014150 | 0.177412 | 0.020594 |
| trigrams / missingReferenceMass | 0.049072 | 0.045810 | -0.003262 | 0.050691 | -0.004881 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.015493 | 0.003061 | 0.012169 | 0.003323 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43624 (0.000%) | 0.000 | 47 | 0.000 to 0.000 | 0/43525 (0.000%) | 0.000 | 99 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43624 (0.000%) | 0.000 | 47 | 0.000 to 0.000 | 0/43525 (0.000%) | 0.000 | 99 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 0/50000 (0.000%) | -6.032 | 0 | -6.270 to -5.680 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 207/50000 (0.414%) | -0.130 | 0 | -0.210 to -0.060 | 222/50000 (0.444%) | -0.030 | 0 | -0.090 to +0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9467/23200 (40.806%) | +0.141 | 281 | -1.637 to +1.118 | 9477/23191 (40.865%) | -0.059 | 9 | -0.909 to +1.096 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1261/6376 (19.777%) | -0.805 | -47 | -3.170 to +0.341 | 1245/6475 (19.228%) | +0.549 | -99 | -2.426 to +2.415 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1282/50000 (2.564%) | -0.218 | 0 | -0.670 to +0.260 | 1270/50000 (2.540%) | +0.024 | 0 | -0.220 to +0.220 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6376 (0.000%) | 0.000 | -47 | 0.000 to 0.000 | 0/6475 (0.000%) | 0.000 | -99 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6376 | -47 | 6475 | -99 |
| bare/syllables:2 | 22919 | 23200 | 281 | 23191 | 9 |
| bare/syllables:3 | 13869 | 13710 | -159 | 13722 | -12 |
| bare/syllables:4 | 5007 | 4960 | -47 | 4872 | 88 |
| bare/syllables:5 | 1427 | 1405 | -22 | 1383 | 22 |
| bare/syllables:6 | 308 | 299 | -9 | 305 | -6 |
| bare/syllables:7 | 43 | 43 | 0 | 47 | -4 |
| bare/syllables:8 | 3 | 6 | 3 | 4 | 2 |
| bare/syllables:9 | 1 | 1 | 0 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 17379.000 | +2982.000 | 16447.000 | +932.000 |
| Mean letters | 5.417 | 5.554 | +0.137 | 5.517 | +0.037 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.094859 | 0.002702 | 0.094323 | 0.000537 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.535644 | 0.009725 | 0.530438 | 0.005206 |
| trigrams / missingReferenceMass | 0.374662 | 0.382245 | 0.007583 | 0.358551 | 0.023693 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.021359 | 0.019094 | 0.019531 | 0.001828 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 4957/50000 (9.914%) | -0.944 | 0 | -2.110 to +0.050 | 5133/50000 (10.266%) | -0.352 | 0 | -0.630 to -0.040 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 11023/50000 (22.046%) | +0.522 | 0 | -0.060 to +1.740 | 10891/50000 (21.782%) | +0.264 | 0 | -0.040 to +0.570 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 270/50000 (0.540%) | +0.104 | 0 | -0.040 to +0.290 | 256/50000 (0.512%) | +0.028 | 0 | -0.070 to +0.130 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 29065.000 | +622.000 | 28668.000 | +397.000 |
| Mean letters | 5.613 | 5.663 | +0.050 | 5.629 | +0.034 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010967 | -0.000135 | 0.010818 | 0.000149 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.198168 | 0.013688 | 0.181656 | 0.016513 |
| trigrams / missingReferenceMass | 0.051142 | 0.049415 | -0.001726 | 0.046750 | 0.002665 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.012143 | 0.002705 | 0.009970 | 0.002172 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 9965/27206 (36.628%) | +0.120 | -40 | -1.020 to +1.080 | 9977/27331 (36.504%) | +0.124 | -125 | -1.697 to +1.871 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27206 (0.000%) | 0.000 | -40 | 0.000 to 0.000 | 0/27331 (0.000%) | 0.000 | -125 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 564/50000 (1.128%) | -0.058 | 0 | -0.190 to +0.090 | 556/50000 (1.112%) | +0.016 | 0 | -0.150 to +0.140 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 21/50000 (0.042%) | -0.008 | 0 | -0.040 to +0.030 | 26/50000 (0.052%) | -0.010 | 0 | -0.030 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4421/22470 (19.675%) | -0.190 | -87 | -0.740 to +0.494 | 4469/22363 (19.984%) | -0.309 | 107 | -1.282 to +0.199 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 0/50000 (0.000%) | -1.728 | 0 | -1.850 to -1.570 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22470/50000 (44.940%) | -0.174 | 0 | -0.680 to +0.150 | 22363/50000 (44.726%) | +0.214 | 0 | -1.200 to +0.940 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 189/50000 (0.378%) | +0.044 | 0 | -0.040 to +0.140 | 188/50000 (0.376%) | +0.002 | 0 | -0.040 to +0.060 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2431/17098 (14.218%) | -0.124 | -5 | -0.927 to +1.440 | 2440/17086 (14.281%) | -0.063 | 12 | -2.078 to +1.527 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4464/22794 (19.584%) | -0.087 | 40 | -2.155 to +2.030 | 4500/22669 (19.851%) | -0.267 | 125 | -1.231 to +1.045 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1028/50000 (2.056%) | +0.124 | 0 | -0.040 to +0.210 | 1081/50000 (2.162%) | -0.106 | 0 | -0.270 to +0.130 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22794 (0.000%) | 0.000 | 40 | 0.000 to 0.000 | 0/22669 (0.000%) | 0.000 | 125 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 18064 | 133 | 17931 | 133 |
| bare/syllables:2 | 5435 | 5420 | -15 | 5481 | -61 |
| bare/syllables:3 | 2713 | 2674 | -39 | 2798 | -124 |
| bare/syllables:4 | 1105 | 1095 | -10 | 1121 | -26 |
| bare/syllables:5 | 234 | 253 | 19 | 273 | -20 |
| bare/syllables:6 | 25 | 24 | -1 | 33 | -9 |
| both/syllables:2 | 912 | 940 | 28 | 937 | 3 |
| both/syllables:3 | 1110 | 1108 | -2 | 1087 | 21 |
| both/syllables:4 | 465 | 449 | -16 | 426 | 23 |
| both/syllables:5 | 47 | 42 | -5 | 48 | -6 |
| both/syllables:6 | 5 | 5 | 0 | 6 | -1 |
| both/syllables:7 | 2 | 0 | -2 | 0 | 0 |
| prefixed/syllables:2 | 4081 | 4074 | -7 | 4125 | -51 |
| prefixed/syllables:3 | 573 | 606 | 33 | 578 | 28 |
| prefixed/syllables:4 | 208 | 215 | 7 | 211 | 4 |
| prefixed/syllables:5 | 60 | 58 | -2 | 64 | -6 |
| prefixed/syllables:6 | 9 | 7 | -2 | 10 | -3 |
| prefixed/syllables:7 | 0 | 1 | 1 | 1 | 0 |
| suffixed/syllables:1 | 4823 | 4730 | -93 | 4738 | -8 |
| suffixed/syllables:2 | 6675 | 6664 | -11 | 6543 | 121 |
| suffixed/syllables:3 | 2861 | 2804 | -57 | 2841 | -37 |
| suffixed/syllables:4 | 507 | 554 | 47 | 520 | 34 |
| suffixed/syllables:5 | 186 | 174 | -12 | 194 | -20 |
| suffixed/syllables:6 | 29 | 34 | 5 | 32 | 2 |
| suffixed/syllables:7 | 4 | 5 | 1 | 2 | 3 |
