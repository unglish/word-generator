# Quality comparison: q13b-aligned-shared-graphemes-v1

Original baseline: baseline-development-v1. Cohort: development. Previous step: q12c-phoneme-aware-doubling-v1.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 43779.000 | +278.000 | 43702.000 | +77.000 |
| Mean letters | 7.462 | 7.486 | +0.024 | 7.480 | +0.006 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007490 | 0.000083 | 0.007508 | -0.000018 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.155906 | -0.002686 | 0.155266 | 0.000640 |
| trigrams / missingReferenceMass | 0.034830 | 0.032966 | -0.001863 | 0.035882 | -0.002916 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.010471 | -0.000526 | 0.009799 | 0.000672 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9219/45637 (20.201%) | -0.345 | 167 | -1.265 to +0.554 | 9407/45520 (20.666%) | -0.465 | 117 | -0.787 to -0.008 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45637 (0.000%) | 0.000 | 167 | 0.000 to 0.000 | 0/45520 (0.000%) | 0.000 | 117 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 1058/50000 (2.116%) | +0.100 | 0 | -0.090 to +0.320 | 987/50000 (1.974%) | +0.142 | 0 | +0.060 to +0.210 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 135/50000 (0.270%) | -0.008 | 0 | -0.100 to +0.110 | 142/50000 (0.284%) | -0.014 | 0 | -0.040 to +0.020 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3899/35056 (11.122%) | +0.073 | 104 | -0.241 to +0.643 | 3869/35087 (11.027%) | +0.095 | -31 | -0.144 to +0.453 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 0/50000 (0.000%) | -3.912 | 0 | -4.250 to -3.710 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35056/50000 (70.112%) | +0.208 | 0 | +0.060 to +0.480 | 35087/50000 (70.174%) | -0.062 | 0 | -0.200 to +0.300 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 121/50000 (0.242%) | -0.118 | 0 | -0.200 to -0.050 | 124/50000 (0.248%) | -0.006 | 0 | -0.080 to +0.040 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4427/20827 (21.256%) | +0.050 | -238 | -0.847 to +0.704 | 4460/20870 (21.370%) | -0.114 | -43 | -1.107 to +0.642 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 872/4363 (19.986%) | +0.141 | -167 | -3.023 to +4.175 | 916/4480 (20.446%) | -0.460 | -117 | -2.155 to +1.750 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 797/50000 (1.594%) | +0.102 | 0 | +0.070 to +0.150 | 809/50000 (1.618%) | -0.024 | 0 | -0.210 to +0.110 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4363 (0.000%) | 0.000 | -167 | 0.000 to 0.000 | 0/4480 (0.000%) | 0.000 | -117 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1849 | -164 | 1930 | -81 |
| bare/syllables:2 | 6997 | 6886 | -111 | 6849 | 37 |
| bare/syllables:3 | 4100 | 4184 | 84 | 4133 | 51 |
| bare/syllables:4 | 1444 | 1517 | 73 | 1493 | 24 |
| bare/syllables:5 | 387 | 407 | 20 | 414 | -7 |
| bare/syllables:6 | 92 | 83 | -9 | 73 | 10 |
| bare/syllables:7 | 14 | 15 | 1 | 19 | -4 |
| bare/syllables:8 | 1 | 3 | 2 | 1 | 2 |
| bare/syllables:9 | 0 | 0 | 0 | 1 | -1 |
| both/syllables:2 | 1044 | 1025 | -19 | 1033 | -8 |
| both/syllables:3 | 1800 | 1748 | -52 | 1803 | -55 |
| both/syllables:4 | 929 | 1009 | 80 | 977 | 32 |
| both/syllables:5 | 182 | 182 | 0 | 184 | -2 |
| both/syllables:6 | 20 | 26 | 6 | 26 | 0 |
| both/syllables:7 | 6 | 11 | 5 | 2 | 9 |
| both/syllables:8 | 0 | 1 | 1 | 1 | 0 |
| prefixed/syllables:2 | 3302 | 3230 | -72 | 3304 | -74 |
| prefixed/syllables:3 | 2560 | 2638 | 78 | 2542 | 96 |
| prefixed/syllables:4 | 895 | 847 | -48 | 876 | -29 |
| prefixed/syllables:5 | 229 | 224 | -5 | 232 | -8 |
| prefixed/syllables:6 | 50 | 67 | 17 | 54 | 13 |
| prefixed/syllables:7 | 5 | 10 | 5 | 5 | 5 |
| prefixed/syllables:8 | 1 | 1 | 0 | 2 | -1 |
| suffixed/syllables:1 | 2517 | 2514 | -3 | 2550 | -36 |
| suffixed/syllables:2 | 9722 | 9686 | -36 | 9684 | 2 |
| suffixed/syllables:3 | 8058 | 8146 | 88 | 8088 | 58 |
| suffixed/syllables:4 | 2733 | 2767 | 34 | 2748 | 19 |
| suffixed/syllables:5 | 711 | 729 | 18 | 770 | -41 |
| suffixed/syllables:6 | 152 | 162 | 10 | 167 | -5 |
| suffixed/syllables:7 | 26 | 28 | 2 | 36 | -8 |
| suffixed/syllables:8 | 10 | 3 | -7 | 2 | 1 |
| suffixed/syllables:9 | 0 | 2 | 2 | 1 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47182.000 | +56.000 | 47175.000 | +7.000 |
| Mean letters | 7.418 | 7.394 | -0.025 | 7.396 | -0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000233 | 0.000066 | 0.000226 | 0.000008 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.177412 | -0.006444 | 0.177222 | 0.000190 |
| trigrams / missingReferenceMass | 0.049072 | 0.050691 | 0.001619 | 0.046402 | 0.004289 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012169 | -0.000262 | 0.011782 | 0.000387 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43525 (0.000%) | 0.000 | -52 | 0.000 to 0.000 | 0/43366 (0.000%) | 0.000 | 159 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43525 (0.000%) | 0.000 | -52 | 0.000 to 0.000 | 0/43366 (0.000%) | 0.000 | 159 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 0/50000 (0.000%) | -6.032 | 0 | -6.270 to -5.680 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 222/50000 (0.444%) | -0.100 | 0 | -0.190 to +0.030 | 221/50000 (0.442%) | +0.002 | 0 | -0.100 to +0.120 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9477/23191 (40.865%) | +0.200 | 272 | -2.076 to +1.674 | 9501/22955 (41.390%) | -0.525 | 236 | -1.191 to +0.142 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1245/6475 (19.228%) | -1.354 | 52 | -3.166 to +0.384 | 1278/6634 (19.264%) | -0.037 | -159 | -0.666 to +0.936 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1270/50000 (2.540%) | -0.242 | 0 | -0.450 to +0.070 | 1267/50000 (2.534%) | +0.006 | 0 | -0.140 to +0.080 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6475 (0.000%) | 0.000 | 52 | 0.000 to 0.000 | 0/6634 (0.000%) | 0.000 | -159 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6475 | 52 | 6634 | -159 |
| bare/syllables:2 | 22919 | 23191 | 272 | 22955 | 236 |
| bare/syllables:3 | 13869 | 13722 | -147 | 13680 | 42 |
| bare/syllables:4 | 5007 | 4872 | -135 | 5008 | -136 |
| bare/syllables:5 | 1427 | 1383 | -44 | 1360 | 23 |
| bare/syllables:6 | 308 | 305 | -3 | 312 | -7 |
| bare/syllables:7 | 43 | 47 | 4 | 41 | 6 |
| bare/syllables:8 | 3 | 4 | 1 | 9 | -5 |
| bare/syllables:9 | 1 | 1 | 0 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 16447.000 | +2050.000 | 16283.000 | +164.000 |
| Mean letters | 5.417 | 5.517 | +0.100 | 5.523 | -0.006 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.094323 | 0.002166 | 0.093413 | 0.000910 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.530438 | 0.004519 | 0.528958 | 0.001480 |
| trigrams / missingReferenceMass | 0.374662 | 0.358551 | -0.016111 | 0.351715 | 0.006836 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.019531 | 0.017266 | 0.014907 | 0.004624 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5133/50000 (10.266%) | -0.592 | 0 | -1.480 to +0.240 | 4987/50000 (9.974%) | +0.292 | 0 | -0.340 to +0.700 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10891/50000 (21.782%) | +0.258 | 0 | -0.630 to +1.380 | 10915/50000 (21.830%) | -0.048 | 0 | -0.450 to +0.540 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 256/50000 (0.512%) | +0.076 | 0 | -0.030 to +0.270 | 243/50000 (0.486%) | +0.026 | 0 | -0.060 to +0.120 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 28668.000 | +225.000 | 28677.000 | -9.000 |
| Mean letters | 5.613 | 5.629 | +0.015 | 5.624 | +0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010818 | -0.000284 | 0.010813 | 0.000005 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.181656 | -0.002824 | 0.182618 | -0.000962 |
| trigrams / missingReferenceMass | 0.051142 | 0.046750 | -0.004391 | 0.048570 | -0.001819 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009970 | 0.000533 | 0.009723 | 0.000248 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 9977/27331 (36.504%) | -0.004 | 85 | -0.791 to +0.678 | 9949/27288 (36.459%) | +0.045 | 43 | -1.109 to +0.902 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27331 (0.000%) | 0.000 | 85 | 0.000 to 0.000 | 0/27288 (0.000%) | 0.000 | 43 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 556/50000 (1.112%) | -0.074 | 0 | -0.170 to +0.030 | 570/50000 (1.140%) | -0.028 | 0 | -0.150 to +0.150 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 26/50000 (0.052%) | +0.002 | 0 | -0.040 to +0.040 | 25/50000 (0.050%) | +0.002 | 0 | -0.010 to +0.010 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4469/22363 (19.984%) | +0.119 | -194 | -0.522 to +0.768 | 4437/22387 (19.820%) | +0.164 | -24 | -0.164 to +0.971 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 0/50000 (0.000%) | -1.728 | 0 | -1.850 to -1.570 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22363/50000 (44.726%) | -0.388 | 0 | -0.810 to +0.520 | 22387/50000 (44.774%) | -0.048 | 0 | -0.430 to +0.200 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 188/50000 (0.376%) | +0.042 | 0 | -0.020 to +0.110 | 186/50000 (0.372%) | +0.004 | 0 | -0.070 to +0.070 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2440/17086 (14.281%) | -0.062 | -17 | -0.878 to +1.572 | 2491/17041 (14.618%) | -0.337 | 45 | -0.547 to -0.121 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4500/22669 (19.851%) | +0.180 | -85 | -1.453 to +1.077 | 4521/22712 (19.906%) | -0.055 | -43 | -0.514 to +0.796 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1081/50000 (2.162%) | +0.230 | 0 | +0.080 to +0.370 | 1121/50000 (2.242%) | -0.080 | 0 | -0.340 to +0.260 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22669 (0.000%) | 0.000 | -85 | 0.000 to 0.000 | 0/22712 (0.000%) | 0.000 | -43 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 17931 | 0 | 17929 | 2 |
| bare/syllables:2 | 5435 | 5481 | 46 | 5441 | 40 |
| bare/syllables:3 | 2713 | 2798 | 85 | 2823 | -25 |
| bare/syllables:4 | 1105 | 1121 | 16 | 1121 | 0 |
| bare/syllables:5 | 234 | 273 | 39 | 257 | 16 |
| bare/syllables:6 | 25 | 33 | 8 | 42 | -9 |
| both/syllables:2 | 912 | 937 | 25 | 938 | -1 |
| both/syllables:3 | 1110 | 1087 | -23 | 1065 | 22 |
| both/syllables:4 | 465 | 426 | -39 | 429 | -3 |
| both/syllables:5 | 47 | 48 | 1 | 52 | -4 |
| both/syllables:6 | 5 | 6 | 1 | 5 | 1 |
| both/syllables:7 | 2 | 0 | -2 | 0 | 0 |
| prefixed/syllables:2 | 4081 | 4125 | 44 | 4148 | -23 |
| prefixed/syllables:3 | 573 | 578 | 5 | 640 | -62 |
| prefixed/syllables:4 | 208 | 211 | 3 | 190 | 21 |
| prefixed/syllables:5 | 60 | 64 | 4 | 67 | -3 |
| prefixed/syllables:6 | 9 | 10 | 1 | 8 | 2 |
| prefixed/syllables:7 | 0 | 1 | 1 | 0 | 1 |
| suffixed/syllables:1 | 4823 | 4738 | -85 | 4783 | -45 |
| suffixed/syllables:2 | 6675 | 6543 | -132 | 6514 | 29 |
| suffixed/syllables:3 | 2861 | 2841 | -20 | 2838 | 3 |
| suffixed/syllables:4 | 507 | 520 | 13 | 501 | 19 |
| suffixed/syllables:5 | 186 | 194 | 8 | 171 | 23 |
| suffixed/syllables:6 | 29 | 32 | 3 | 35 | -3 |
| suffixed/syllables:7 | 4 | 2 | -2 | 3 | -1 |
