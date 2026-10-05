# Quality comparison: q12c-phoneme-aware-doubling-v1

Original baseline: baseline-development-v1. Cohort: development. Previous step: q13c-unit-normalization-candidate-v1.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 43702.000 | +201.000 | 43624.000 | +78.000 |
| Mean letters | 7.462 | 7.480 | +0.018 | 7.469 | +0.011 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007508 | 0.000101 | 0.007675 | -0.000167 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.155266 | -0.003326 | 0.155237 | 0.000029 |
| trigrams / missingReferenceMass | 0.034830 | 0.035882 | 0.001052 | 0.036403 | -0.000521 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.009799 | -0.001198 | 0.009606 | 0.000193 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9407/45520 (20.666%) | +0.120 | 50 | -0.602 to +0.562 | 9288/45541 (20.395%) | +0.271 | -21 | -0.866 to +0.919 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45520 (0.000%) | 0.000 | 50 | 0.000 to 0.000 | 0/45541 (0.000%) | 0.000 | -21 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 987/50000 (1.974%) | -0.042 | 0 | -0.290 to +0.130 | 961/50000 (1.922%) | +0.052 | 0 | -0.070 to +0.190 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 142/50000 (0.284%) | +0.006 | 0 | -0.070 to +0.140 | 126/50000 (0.252%) | +0.032 | 0 | -0.020 to +0.070 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3869/35087 (11.027%) | -0.023 | 135 | -0.599 to +0.586 | 3865/34939 (11.062%) | -0.035 | 148 | -0.238 to +0.336 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 0/50000 (0.000%) | -3.912 | 0 | -4.250 to -3.710 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35087/50000 (70.174%) | +0.270 | 0 | -0.190 to +0.660 | 34939/50000 (69.878%) | +0.296 | 0 | -0.010 to +0.590 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 124/50000 (0.248%) | -0.112 | 0 | -0.210 to +0.010 | 121/50000 (0.242%) | +0.006 | 0 | -0.090 to +0.050 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4460/20870 (21.370%) | +0.165 | -195 | -1.489 to +1.421 | 4621/21082 (21.919%) | -0.549 | -212 | -1.721 to +0.363 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 916/4480 (20.446%) | +0.601 | -50 | -2.446 to +4.075 | 916/4459 (20.543%) | -0.096 | 21 | -1.887 to +1.759 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 809/50000 (1.618%) | +0.126 | 0 | +0.040 to +0.310 | 796/50000 (1.592%) | +0.026 | 0 | -0.120 to +0.290 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4480 (0.000%) | 0.000 | -50 | 0.000 to 0.000 | 0/4459 (0.000%) | 0.000 | 21 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1930 | -83 | 1898 | 32 |
| bare/syllables:2 | 6997 | 6849 | -148 | 6996 | -147 |
| bare/syllables:3 | 4100 | 4133 | 33 | 4169 | -36 |
| bare/syllables:4 | 1444 | 1493 | 49 | 1541 | -48 |
| bare/syllables:5 | 387 | 414 | 27 | 369 | 45 |
| bare/syllables:6 | 92 | 73 | -19 | 77 | -4 |
| bare/syllables:7 | 14 | 19 | 5 | 9 | 10 |
| bare/syllables:8 | 1 | 1 | 0 | 2 | -1 |
| bare/syllables:9 | 0 | 1 | 1 | 0 | 1 |
| both/syllables:2 | 1044 | 1033 | -11 | 1061 | -28 |
| both/syllables:3 | 1800 | 1803 | 3 | 1835 | -32 |
| both/syllables:4 | 929 | 977 | 48 | 959 | 18 |
| both/syllables:5 | 182 | 184 | 2 | 153 | 31 |
| both/syllables:6 | 20 | 26 | 6 | 34 | -8 |
| both/syllables:7 | 6 | 2 | -4 | 5 | -3 |
| both/syllables:8 | 0 | 1 | 1 | 0 | 1 |
| prefixed/syllables:2 | 3302 | 3304 | 2 | 3223 | 81 |
| prefixed/syllables:3 | 2560 | 2542 | -18 | 2543 | -1 |
| prefixed/syllables:4 | 895 | 876 | -19 | 866 | 10 |
| prefixed/syllables:5 | 229 | 232 | 3 | 224 | 8 |
| prefixed/syllables:6 | 50 | 54 | 4 | 52 | 2 |
| prefixed/syllables:7 | 5 | 5 | 0 | 11 | -6 |
| prefixed/syllables:8 | 1 | 2 | 1 | 1 | 1 |
| suffixed/syllables:1 | 2517 | 2550 | 33 | 2561 | -11 |
| suffixed/syllables:2 | 9722 | 9684 | -38 | 9802 | -118 |
| suffixed/syllables:3 | 8058 | 8088 | 30 | 8051 | 37 |
| suffixed/syllables:4 | 2733 | 2748 | 15 | 2664 | 84 |
| suffixed/syllables:5 | 711 | 770 | 59 | 700 | 70 |
| suffixed/syllables:6 | 152 | 167 | 15 | 165 | 2 |
| suffixed/syllables:7 | 26 | 36 | 10 | 28 | 8 |
| suffixed/syllables:8 | 10 | 2 | -8 | 1 | 1 |
| suffixed/syllables:9 | 0 | 1 | 1 | 0 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47175.000 | +49.000 | 47135.000 | +40.000 |
| Mean letters | 7.418 | 7.396 | -0.022 | 7.410 | -0.014 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000226 | 0.000058 | 0.000245 | -0.000019 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.177222 | -0.006634 | 0.177966 | -0.000744 |
| trigrams / missingReferenceMass | 0.049072 | 0.046402 | -0.002670 | 0.046676 | -0.000274 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.011782 | -0.000649 | 0.012077 | -0.000294 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43366 (0.000%) | 0.000 | -211 | 0.000 to 0.000 | 0/43508 (0.000%) | 0.000 | -142 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43366 (0.000%) | 0.000 | -211 | 0.000 to 0.000 | 0/43508 (0.000%) | 0.000 | -142 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 0/50000 (0.000%) | -6.032 | 0 | -6.270 to -5.680 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 221/50000 (0.442%) | -0.102 | 0 | -0.150 to -0.070 | 217/50000 (0.434%) | +0.008 | 0 | -0.050 to +0.130 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9501/22955 (41.390%) | +0.725 | 36 | -0.965 to +1.596 | 9575/23176 (41.314%) | +0.075 | -221 | -0.520 to +0.541 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1278/6634 (19.264%) | -1.318 | 211 | -4.102 to +1.049 | 1254/6492 (19.316%) | -0.052 | 142 | -0.509 to +0.647 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1267/50000 (2.534%) | -0.248 | 0 | -0.450 to +0.060 | 1273/50000 (2.546%) | -0.012 | 0 | -0.290 to +0.210 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6634 (0.000%) | 0.000 | 211 | 0.000 to 0.000 | 0/6492 (0.000%) | 0.000 | 142 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6634 | 211 | 6492 | 142 |
| bare/syllables:2 | 22919 | 22955 | 36 | 23176 | -221 |
| bare/syllables:3 | 13869 | 13680 | -189 | 13584 | 96 |
| bare/syllables:4 | 5007 | 5008 | 1 | 5022 | -14 |
| bare/syllables:5 | 1427 | 1360 | -67 | 1363 | -3 |
| bare/syllables:6 | 308 | 312 | 4 | 306 | 6 |
| bare/syllables:7 | 43 | 41 | -2 | 48 | -7 |
| bare/syllables:8 | 3 | 9 | 6 | 9 | 0 |
| bare/syllables:9 | 1 | 1 | 0 | 0 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 16283.000 | +1886.000 | 16086.000 | +197.000 |
| Mean letters | 5.417 | 5.523 | +0.106 | 5.532 | -0.009 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.093413 | 0.001256 | 0.094132 | -0.000719 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.528958 | 0.003039 | 0.530575 | -0.001617 |
| trigrams / missingReferenceMass | 0.374662 | 0.351715 | -0.022947 | 0.360957 | -0.009241 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.014907 | 0.012642 | 0.014710 | 0.000197 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 4987/50000 (9.974%) | -0.884 | 0 | -1.440 to -0.370 | 5066/50000 (10.132%) | -0.158 | 0 | -0.570 to +0.390 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10915/50000 (21.830%) | +0.306 | 0 | -0.210 to +0.840 | 10702/50000 (21.404%) | +0.426 | 0 | +0.220 to +0.810 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 243/50000 (0.486%) | +0.050 | 0 | -0.060 to +0.240 | 250/50000 (0.500%) | -0.014 | 0 | -0.110 to +0.100 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 28677.000 | +234.000 | 28606.000 | +71.000 |
| Mean letters | 5.613 | 5.624 | +0.011 | 5.631 | -0.006 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010813 | -0.000290 | 0.010868 | -0.000055 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.182618 | -0.001862 | 0.182908 | -0.000290 |
| trigrams / missingReferenceMass | 0.051142 | 0.048570 | -0.002572 | 0.046809 | 0.001761 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009723 | 0.000285 | 0.009701 | 0.000022 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 9949/27288 (36.459%) | -0.049 | 42 | -0.791 to +0.622 | 10070/27468 (36.661%) | -0.202 | -180 | -0.710 to +0.165 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27288 (0.000%) | 0.000 | 42 | 0.000 to 0.000 | 0/27468 (0.000%) | 0.000 | -180 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 570/50000 (1.140%) | -0.046 | 0 | -0.190 to +0.010 | 554/50000 (1.108%) | +0.032 | 0 | -0.050 to +0.170 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 25/50000 (0.050%) | 0.000 | 0 | -0.030 to +0.050 | 22/50000 (0.044%) | +0.006 | 0 | -0.020 to +0.030 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4437/22387 (19.820%) | -0.046 | -170 | -0.780 to +0.930 | 4594/22309 (20.593%) | -0.773 | 78 | -1.066 to -0.300 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 0/50000 (0.000%) | -1.728 | 0 | -1.850 to -1.570 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22387/50000 (44.774%) | -0.340 | 0 | -1.010 to +0.330 | 22309/50000 (44.618%) | +0.156 | 0 | -0.340 to +0.480 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 186/50000 (0.372%) | +0.038 | 0 | -0.020 to +0.140 | 186/50000 (0.372%) | 0.000 | 0 | -0.080 to +0.050 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2491/17041 (14.618%) | +0.275 | -62 | -0.535 to +1.693 | 2540/17267 (14.710%) | -0.092 | -226 | -0.682 to +0.367 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4521/22712 (19.906%) | +0.235 | -42 | -1.184 to +1.183 | 4516/22532 (20.043%) | -0.137 | 180 | -0.810 to +0.691 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1121/50000 (2.242%) | +0.310 | 0 | -0.040 to +0.670 | 1092/50000 (2.184%) | +0.058 | 0 | -0.130 to +0.300 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22712 (0.000%) | 0.000 | -42 | 0.000 to 0.000 | 0/22532 (0.000%) | 0.000 | 180 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 17929 | -2 | 17973 | -44 |
| bare/syllables:2 | 5435 | 5441 | 6 | 5516 | -75 |
| bare/syllables:3 | 2713 | 2823 | 110 | 2758 | 65 |
| bare/syllables:4 | 1105 | 1121 | 16 | 1169 | -48 |
| bare/syllables:5 | 234 | 257 | 23 | 240 | 17 |
| bare/syllables:6 | 25 | 42 | 17 | 35 | 7 |
| both/syllables:2 | 912 | 938 | 26 | 949 | -11 |
| both/syllables:3 | 1110 | 1065 | -45 | 1092 | -27 |
| both/syllables:4 | 465 | 429 | -36 | 407 | 22 |
| both/syllables:5 | 47 | 52 | 5 | 42 | 10 |
| both/syllables:6 | 5 | 5 | 0 | 4 | 1 |
| both/syllables:7 | 2 | 0 | -2 | 1 | -1 |
| prefixed/syllables:2 | 4081 | 4148 | 67 | 4152 | -4 |
| prefixed/syllables:3 | 573 | 640 | 67 | 633 | 7 |
| prefixed/syllables:4 | 208 | 190 | -18 | 198 | -8 |
| prefixed/syllables:5 | 60 | 67 | 7 | 60 | 7 |
| prefixed/syllables:6 | 9 | 8 | -1 | 11 | -3 |
| prefixed/syllables:7 | 0 | 0 | 0 | 1 | -1 |
| suffixed/syllables:1 | 4823 | 4783 | -40 | 4559 | 224 |
| suffixed/syllables:2 | 6675 | 6514 | -161 | 6650 | -136 |
| suffixed/syllables:3 | 2861 | 2838 | -23 | 2855 | -17 |
| suffixed/syllables:4 | 507 | 501 | -6 | 474 | 27 |
| suffixed/syllables:5 | 186 | 171 | -15 | 182 | -11 |
| suffixed/syllables:6 | 29 | 35 | 6 | 33 | 2 |
| suffixed/syllables:7 | 4 | 3 | -1 | 5 | -2 |
| suffixed/syllables:8 | 0 | 0 | 0 | 1 | -1 |
