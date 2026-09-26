# Quality comparison: ae-ng-restoration

Original baseline: baseline-development-v1. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 43501.000 | 43516.000 | +15.000 |
| Mean letters | 7.462 | 7.467 | +0.006 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007587 | 0.000180 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.159236 | 0.000643 |
| trigrams / missingReferenceMass | 0.034830 | 0.035483 | 0.000654 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.010832 | -0.000165 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9302/45492 (20.448%) | -0.098 | 22 | -0.715 to +0.309 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45492 (0.000%) | 0.000 | 22 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 1026/50000 (2.052%) | +0.036 | 0 | -0.280 to +0.170 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 144/50000 (0.288%) | +0.010 | 0 | -0.130 to +0.130 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3930/35044 (11.214%) | +0.165 | 92 | -0.307 to +0.681 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 1901/50000 (3.802%) | -0.110 | 0 | -0.460 to +0.050 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35044/50000 (70.088%) | +0.184 | 0 | -0.500 to +0.620 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 153/50000 (0.306%) | -0.054 | 0 | -0.170 to +0.020 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4466/20864 (21.405%) | +0.199 | -201 | -0.466 to +1.160 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 878/4508 (19.476%) | -0.369 | -22 | -2.887 to +1.478 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 745/50000 (1.490%) | -0.002 | 0 | -0.110 to +0.150 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4508 (0.000%) | 0.000 | -22 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 2013 | 1985 | -28 |
| bare/syllables:2 | 6997 | 6857 | -140 |
| bare/syllables:3 | 4100 | 4106 | 6 |
| bare/syllables:4 | 1444 | 1506 | 62 |
| bare/syllables:5 | 387 | 390 | 3 |
| bare/syllables:6 | 92 | 90 | -2 |
| bare/syllables:7 | 14 | 18 | 4 |
| bare/syllables:8 | 1 | 2 | 1 |
| bare/syllables:9 | 0 | 2 | 2 |
| both/syllables:2 | 1044 | 1024 | -20 |
| both/syllables:3 | 1800 | 1803 | 3 |
| both/syllables:4 | 929 | 937 | 8 |
| both/syllables:5 | 182 | 190 | 8 |
| both/syllables:6 | 20 | 42 | 22 |
| both/syllables:7 | 6 | 4 | -2 |
| both/syllables:9 | 0 | 1 | 1 |
| prefixed/syllables:2 | 3302 | 3281 | -21 |
| prefixed/syllables:3 | 2560 | 2566 | 6 |
| prefixed/syllables:4 | 895 | 881 | -14 |
| prefixed/syllables:5 | 229 | 215 | -14 |
| prefixed/syllables:6 | 50 | 39 | -11 |
| prefixed/syllables:7 | 5 | 14 | 9 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 2517 | 2523 | 6 |
| suffixed/syllables:2 | 9722 | 9702 | -20 |
| suffixed/syllables:3 | 8058 | 8188 | 130 |
| suffixed/syllables:4 | 2733 | 2676 | -57 |
| suffixed/syllables:5 | 711 | 777 | 66 |
| suffixed/syllables:6 | 152 | 141 | -11 |
| suffixed/syllables:7 | 26 | 35 | 9 |
| suffixed/syllables:8 | 10 | 4 | -6 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47126.000 | 47105.000 | -21.000 |
| Mean letters | 7.418 | 7.408 | -0.011 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000202 | 0.000034 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.184817 | 0.000961 |
| trigrams / missingReferenceMass | 0.049072 | 0.048971 | -0.000101 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012607 | 0.000176 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43464 (0.000%) | 0.000 | -113 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43464 (0.000%) | 0.000 | -113 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 3018/50000 (6.036%) | +0.004 | 0 | -0.150 to +0.370 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 256/50000 (0.512%) | -0.032 | 0 | -0.190 to +0.140 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9334/22930 (40.706%) | +0.042 | 11 | -1.170 to +0.698 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1300/6536 (19.890%) | -0.692 | 113 | -1.763 to +1.093 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1343/50000 (2.686%) | -0.096 | 0 | -0.250 to +0.110 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6536 (0.000%) | 0.000 | 113 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6423 | 6536 | 113 |
| bare/syllables:2 | 22919 | 22930 | 11 |
| bare/syllables:3 | 13869 | 13791 | -78 |
| bare/syllables:4 | 5007 | 5028 | 21 |
| bare/syllables:5 | 1427 | 1397 | -30 |
| bare/syllables:6 | 308 | 267 | -41 |
| bare/syllables:7 | 43 | 45 | 2 |
| bare/syllables:8 | 3 | 6 | 3 |
| bare/syllables:9 | 1 | 0 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14397.000 | 14365.000 | -32.000 |
| Mean letters | 5.417 | 5.419 | +0.001 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.093759 | 0.001602 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.526200 | 0.000282 |
| trigrams / missingReferenceMass | 0.374662 | 0.368853 | -0.005809 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.002229 | -0.000036 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5539/50000 (11.078%) | +0.220 | 0 | -0.170 to +0.650 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10792/50000 (21.584%) | +0.060 | 0 | -0.870 to +0.830 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 242/50000 (0.484%) | +0.048 | 0 | 0.000 to +0.150 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 28443.000 | 28508.000 | +65.000 |
| Mean letters | 5.613 | 5.634 | +0.021 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010889 | -0.000213 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.184941 | 0.000461 |
| trigrams / missingReferenceMass | 0.051142 | 0.052008 | 0.000866 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009839 | 0.000402 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 9988/27434 (36.407%) | -0.101 | 188 | -0.384 to +0.173 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27434 (0.000%) | 0.000 | 188 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 601/50000 (1.202%) | +0.016 | 0 | -0.050 to +0.100 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 21/50000 (0.042%) | -0.008 | 0 | -0.040 to +0.010 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4449/22474 (19.796%) | -0.069 | -83 | -0.471 to +0.828 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 872/50000 (1.744%) | +0.016 | 0 | -0.070 to +0.130 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22474/50000 (44.948%) | -0.166 | 0 | -0.610 to +0.320 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 143/50000 (0.286%) | -0.048 | 0 | -0.100 to +0.080 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2465/17189 (14.341%) | -0.002 | 86 | -0.469 to +0.532 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4525/22566 (20.052%) | +0.381 | -188 | -0.317 to +1.261 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 992/50000 (1.984%) | +0.052 | 0 | -0.070 to +0.310 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22566 (0.000%) | 0.000 | -188 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17931 | 17865 | -66 |
| bare/syllables:2 | 5435 | 5439 | 4 |
| bare/syllables:3 | 2713 | 2806 | 93 |
| bare/syllables:4 | 1105 | 1130 | 25 |
| bare/syllables:5 | 234 | 248 | 14 |
| bare/syllables:6 | 25 | 38 | 13 |
| both/syllables:2 | 912 | 906 | -6 |
| both/syllables:3 | 1110 | 1129 | 19 |
| both/syllables:4 | 465 | 480 | 15 |
| both/syllables:5 | 47 | 42 | -5 |
| both/syllables:6 | 5 | 5 | 0 |
| both/syllables:7 | 2 | 0 | -2 |
| prefixed/syllables:2 | 4081 | 4162 | 81 |
| prefixed/syllables:3 | 573 | 591 | 18 |
| prefixed/syllables:4 | 208 | 190 | -18 |
| prefixed/syllables:5 | 60 | 52 | -8 |
| prefixed/syllables:6 | 9 | 9 | 0 |
| suffixed/syllables:1 | 4823 | 4701 | -122 |
| suffixed/syllables:2 | 6675 | 6682 | 7 |
| suffixed/syllables:3 | 2861 | 2805 | -56 |
| suffixed/syllables:4 | 507 | 487 | -20 |
| suffixed/syllables:5 | 186 | 202 | 16 |
| suffixed/syllables:6 | 29 | 27 | -2 |
| suffixed/syllables:7 | 4 | 4 | 0 |
