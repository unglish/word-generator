# Quality comparison: root-rime-candidate

Original baseline: baseline-development-v1. Cohort: development. Previous step: root-rime-control.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 43744.000 | +243.000 | 43754.000 | -10.000 |
| Mean letters | 7.462 | 7.476 | +0.014 | 7.476 | -0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007623 | 0.000215 | 0.007609 | 0.000014 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.157919 | -0.000673 | 0.157718 | 0.000201 |
| trigrams / missingReferenceMass | 0.034830 | 0.034574 | -0.000255 | 0.034207 | 0.000367 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.011107 | 0.000111 | 0.011030 | 0.000078 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9269/45554 (20.347%) | -0.198 | 84 | -0.767 to +0.450 | 9268/45565 (20.340%) | +0.007 | -11 | -0.088 to +0.124 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45554 (0.000%) | 0.000 | 84 | 0.000 to 0.000 | 0/45565 (0.000%) | 0.000 | -11 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 1025/50000 (2.050%) | +0.034 | 0 | -0.310 to +0.330 | 1024/50000 (2.048%) | +0.002 | 0 | -0.030 to +0.030 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 131/50000 (0.262%) | -0.016 | 0 | -0.130 to +0.070 | 133/50000 (0.266%) | -0.004 | 0 | -0.030 to +0.010 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3847/35014 (10.987%) | -0.062 | 62 | -0.729 to +0.267 | 3846/35003 (10.988%) | -0.001 | 11 | -0.169 to +0.105 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 1970/50000 (3.940%) | +0.028 | 0 | -0.240 to +0.320 | 1976/50000 (3.952%) | -0.012 | 0 | -0.060 to +0.050 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35014/50000 (70.028%) | +0.124 | 0 | -0.600 to +1.060 | 35003/50000 (70.006%) | +0.022 | 0 | -0.030 to +0.080 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 1/50000 (0.002%) | -0.358 | 0 | -0.430 to -0.260 | 1/50000 (0.002%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4425/20882 (21.190%) | -0.015 | -183 | -1.117 to +0.822 | 4430/20886 (21.210%) | -0.020 | -4 | -0.176 to +0.142 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 858/4446 (19.298%) | -0.547 | -84 | -3.501 to +2.392 | 860/4435 (19.391%) | -0.093 | 11 | -0.399 to +0.115 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 789/50000 (1.578%) | +0.086 | 0 | +0.020 to +0.170 | 792/50000 (1.584%) | -0.006 | 0 | -0.040 to +0.030 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 56/4446 (1.260%) | +1.260 | -84 | +0.814 to +1.770 | 55/4435 (1.240%) | +0.019 | 11 | -0.012 to +0.111 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1928 | -85 | 1920 | 8 |
| bare/syllables:2 | 6997 | 6925 | -72 | 6912 | 13 |
| bare/syllables:3 | 4100 | 4122 | 22 | 4140 | -18 |
| bare/syllables:4 | 1444 | 1459 | 15 | 1468 | -9 |
| bare/syllables:5 | 387 | 433 | 46 | 437 | -4 |
| bare/syllables:6 | 92 | 98 | 6 | 99 | -1 |
| bare/syllables:7 | 14 | 19 | 5 | 19 | 0 |
| bare/syllables:8 | 1 | 2 | 1 | 2 | 0 |
| both/syllables:2 | 1044 | 990 | -54 | 993 | -3 |
| both/syllables:3 | 1800 | 1830 | 30 | 1819 | 11 |
| both/syllables:4 | 929 | 952 | 23 | 945 | 7 |
| both/syllables:5 | 182 | 192 | 10 | 187 | 5 |
| both/syllables:6 | 20 | 28 | 8 | 28 | 0 |
| both/syllables:7 | 6 | 9 | 3 | 8 | 1 |
| both/syllables:8 | 0 | 3 | 3 | 3 | 0 |
| prefixed/syllables:2 | 3302 | 3272 | -30 | 3246 | 26 |
| prefixed/syllables:3 | 2560 | 2582 | 22 | 2580 | 2 |
| prefixed/syllables:4 | 895 | 852 | -43 | 850 | 2 |
| prefixed/syllables:5 | 229 | 214 | -15 | 206 | 8 |
| prefixed/syllables:6 | 50 | 53 | 3 | 53 | 0 |
| prefixed/syllables:7 | 5 | 8 | 3 | 8 | 0 |
| prefixed/syllables:8 | 1 | 0 | -1 | 0 | 0 |
| suffixed/syllables:1 | 2517 | 2518 | 1 | 2515 | 3 |
| suffixed/syllables:2 | 9722 | 9695 | -27 | 9735 | -40 |
| suffixed/syllables:3 | 8058 | 8288 | 230 | 8302 | -14 |
| suffixed/syllables:4 | 2733 | 2648 | -85 | 2648 | 0 |
| suffixed/syllables:5 | 711 | 718 | 7 | 711 | 7 |
| suffixed/syllables:6 | 152 | 138 | -14 | 140 | -2 |
| suffixed/syllables:7 | 26 | 22 | -4 | 23 | -1 |
| suffixed/syllables:8 | 10 | 2 | -8 | 3 | -1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47123.000 | -3.000 | 47145.000 | -22.000 |
| Mean letters | 7.418 | 7.425 | +0.007 | 7.427 | -0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000517 | 0.000350 | 0.000524 | -0.000007 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.183646 | -0.000210 | 0.184175 | -0.000528 |
| trigrams / missingReferenceMass | 0.049072 | 0.048863 | -0.000209 | 0.049461 | -0.000599 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012869 | 0.000438 | 0.012795 | 0.000074 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43516 (0.000%) | 0.000 | -61 | 0.000 to 0.000 | 0/43536 (0.000%) | 0.000 | -20 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43516 (0.000%) | 0.000 | -61 | 0.000 to 0.000 | 0/43536 (0.000%) | 0.000 | -20 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 3199/50000 (6.398%) | +0.366 | 0 | +0.150 to +0.670 | 3206/50000 (6.412%) | -0.014 | 0 | -0.080 to +0.020 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 0/50000 (0.000%) | -0.544 | 0 | -0.620 to -0.470 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9161/22925 (39.961%) | -0.704 | 6 | -1.735 to -0.116 | 9168/22913 (40.012%) | -0.051 | 12 | -0.533 to +0.600 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1289/6484 (19.880%) | -0.703 | 61 | -2.945 to +2.103 | 1269/6464 (19.632%) | +0.248 | 20 | -0.667 to +1.109 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1277/50000 (2.554%) | -0.228 | 0 | -0.390 to +0.070 | 1260/50000 (2.520%) | +0.034 | 0 | 0.000 to +0.070 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 44/6484 (0.679%) | +0.679 | 61 | +0.295 to +1.093 | 44/6464 (0.681%) | -0.002 | 20 | -0.081 to +0.075 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6484 | 61 | 6464 | 20 |
| bare/syllables:2 | 22919 | 22925 | 6 | 22913 | 12 |
| bare/syllables:3 | 13869 | 13785 | -84 | 13824 | -39 |
| bare/syllables:4 | 5007 | 5074 | 67 | 5058 | 16 |
| bare/syllables:5 | 1427 | 1406 | -21 | 1415 | -9 |
| bare/syllables:6 | 308 | 286 | -22 | 284 | 2 |
| bare/syllables:7 | 43 | 34 | -9 | 36 | -2 |
| bare/syllables:8 | 3 | 6 | 3 | 6 | 0 |
| bare/syllables:9 | 1 | 0 | -1 | 0 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 14074.000 | -323.000 | 14074.000 | 0.000 |
| Mean letters | 5.417 | 5.498 | +0.080 | 5.498 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.093980 | 0.001823 | 0.093980 | 0.000000 |
| phonemes / missingReferenceMass | 0.003390 | 0.000640 | -0.002750 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.533630 | 0.007712 | 0.533630 | 0.000000 |
| trigrams / missingReferenceMass | 0.374662 | 0.368253 | -0.006409 | 0.368253 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.002556 | 0.000291 | 0.002556 | 0.000000 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 0/50000 (0.000%) | -10.858 | 0 | -11.330 to -10.360 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10571/50000 (21.142%) | -0.382 | 0 | -0.870 to +0.390 | 10571/50000 (21.142%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 247/50000 (0.494%) | +0.058 | 0 | -0.050 to +0.210 | 247/50000 (0.494%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 527/50000 (1.054%) | +1.054 | 0 | +1.010 to +1.160 | 527/50000 (1.054%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 28710.000 | +267.000 | 28719.000 | -9.000 |
| Mean letters | 5.613 | 5.642 | +0.029 | 5.644 | -0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010849 | -0.000253 | 0.010773 | 0.000076 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.183680 | -0.000800 | 0.183613 | 0.000067 |
| trigrams / missingReferenceMass | 0.051142 | 0.050909 | -0.000233 | 0.051000 | -0.000091 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.010186 | 0.000749 | 0.010197 | -0.000011 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 10007/27482 (36.413%) | -0.095 | 236 | -0.781 to +0.186 | 9992/27490 (36.348%) | +0.065 | -8 | +0.013 to +0.178 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27482 (0.000%) | 0.000 | 236 | 0.000 to 0.000 | 0/27490 (0.000%) | 0.000 | -8 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 606/50000 (1.212%) | +0.026 | 0 | -0.200 to +0.180 | 610/50000 (1.220%) | -0.008 | 0 | -0.040 to +0.020 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 23/50000 (0.046%) | -0.004 | 0 | -0.030 to +0.020 | 23/50000 (0.046%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4554/22505 (20.236%) | +0.370 | -52 | -0.395 to +1.199 | 4548/22485 (20.227%) | +0.009 | 20 | -0.050 to +0.057 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 848/50000 (1.696%) | -0.032 | 0 | -0.350 to +0.240 | 851/50000 (1.702%) | -0.006 | 0 | -0.020 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22505/50000 (45.010%) | -0.104 | 0 | -0.530 to +0.690 | 22485/50000 (44.970%) | +0.040 | 0 | -0.040 to +0.210 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 2/50000 (0.004%) | -0.330 | 0 | -0.390 to -0.250 | 2/50000 (0.004%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2523/17260 (14.618%) | +0.275 | 157 | -0.561 to +0.685 | 2525/17254 (14.634%) | -0.017 | 6 | -0.110 to +0.054 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4340/22518 (19.273%) | -0.398 | -236 | -1.721 to +0.843 | 4351/22510 (19.329%) | -0.056 | 8 | -0.207 to +0.055 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 975/50000 (1.950%) | +0.018 | 0 | -0.150 to +0.250 | 971/50000 (1.942%) | +0.008 | 0 | -0.010 to +0.030 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 178/22518 (0.790%) | +0.790 | -236 | +0.626 to +0.899 | 177/22510 (0.786%) | +0.004 | 8 | -0.001 to +0.024 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 17744 | -187 | 17741 | 3 |
| bare/syllables:2 | 5435 | 5496 | 61 | 5507 | -11 |
| bare/syllables:3 | 2713 | 2812 | 99 | 2815 | -3 |
| bare/syllables:4 | 1105 | 1198 | 93 | 1202 | -4 |
| bare/syllables:5 | 234 | 223 | -11 | 225 | -2 |
| bare/syllables:6 | 25 | 22 | -3 | 25 | -3 |
| both/syllables:2 | 912 | 933 | 21 | 933 | 0 |
| both/syllables:3 | 1110 | 1094 | -16 | 1097 | -3 |
| both/syllables:4 | 465 | 424 | -41 | 419 | 5 |
| both/syllables:5 | 47 | 47 | 0 | 45 | 2 |
| both/syllables:6 | 5 | 8 | 3 | 8 | 0 |
| both/syllables:7 | 2 | 0 | -2 | 0 | 0 |
| prefixed/syllables:2 | 4081 | 4089 | 8 | 4072 | 17 |
| prefixed/syllables:3 | 573 | 596 | 23 | 594 | 2 |
| prefixed/syllables:4 | 208 | 192 | -16 | 191 | 1 |
| prefixed/syllables:5 | 60 | 59 | -1 | 59 | 0 |
| prefixed/syllables:6 | 9 | 11 | 2 | 11 | 0 |
| suffixed/syllables:1 | 4823 | 4774 | -49 | 4769 | 5 |
| suffixed/syllables:2 | 6675 | 6742 | 67 | 6742 | 0 |
| suffixed/syllables:3 | 2861 | 2839 | -22 | 2843 | -4 |
| suffixed/syllables:4 | 507 | 521 | 14 | 524 | -3 |
| suffixed/syllables:5 | 186 | 145 | -41 | 146 | -1 |
| suffixed/syllables:6 | 29 | 30 | 1 | 31 | -1 |
| suffixed/syllables:7 | 4 | 1 | -3 | 1 | 0 |
