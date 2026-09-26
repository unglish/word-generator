# Quality comparison: ordinary-et-spelling

Original baseline: baseline-development-v1. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 43501.000 | 43658.000 | +157.000 |
| Mean letters | 7.462 | 7.455 | -0.006 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007257 | -0.000151 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.157053 | -0.001539 |
| trigrams / missingReferenceMass | 0.034830 | 0.034652 | -0.000178 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.010833 | -0.000163 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9243/45497 (20.316%) | -0.230 | 27 | -0.760 to +0.085 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45497 (0.000%) | 0.000 | 27 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 997/50000 (1.994%) | -0.022 | 0 | -0.090 to +0.100 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 124/50000 (0.248%) | -0.030 | 0 | -0.090 to +0.010 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3779/34970 (10.806%) | -0.243 | 18 | -0.385 to +0.026 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 1924/50000 (3.848%) | -0.064 | 0 | -0.460 to +0.270 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 34970/50000 (69.940%) | +0.036 | 0 | -0.480 to +0.470 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 156/50000 (0.312%) | -0.048 | 0 | -0.110 to +0.090 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4518/21006 (21.508%) | +0.302 | -59 | -0.672 to +1.220 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 864/4503 (19.187%) | -0.658 | -27 | -3.203 to +2.679 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 751/50000 (1.502%) | +0.010 | 0 | -0.170 to +0.190 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4503 (0.000%) | 0.000 | -27 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 2013 | 1960 | -53 |
| bare/syllables:2 | 6997 | 7004 | 7 |
| bare/syllables:3 | 4100 | 4049 | -51 |
| bare/syllables:4 | 1444 | 1499 | 55 |
| bare/syllables:5 | 387 | 408 | 21 |
| bare/syllables:6 | 92 | 91 | -1 |
| bare/syllables:7 | 14 | 16 | 2 |
| bare/syllables:8 | 1 | 2 | 1 |
| bare/syllables:9 | 0 | 1 | 1 |
| both/syllables:2 | 1044 | 1032 | -12 |
| both/syllables:3 | 1800 | 1767 | -33 |
| both/syllables:4 | 929 | 990 | 61 |
| both/syllables:5 | 182 | 188 | 6 |
| both/syllables:6 | 20 | 19 | -1 |
| both/syllables:7 | 6 | 5 | -1 |
| prefixed/syllables:2 | 3302 | 3248 | -54 |
| prefixed/syllables:3 | 2560 | 2569 | 9 |
| prefixed/syllables:4 | 895 | 887 | -8 |
| prefixed/syllables:5 | 229 | 214 | -15 |
| prefixed/syllables:6 | 50 | 44 | -6 |
| prefixed/syllables:7 | 5 | 7 | 2 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| prefixed/syllables:9 | 0 | 1 | 1 |
| suffixed/syllables:1 | 2517 | 2543 | 26 |
| suffixed/syllables:2 | 9722 | 9722 | 0 |
| suffixed/syllables:3 | 8058 | 8078 | 20 |
| suffixed/syllables:4 | 2733 | 2717 | -16 |
| suffixed/syllables:5 | 711 | 751 | 40 |
| suffixed/syllables:6 | 152 | 154 | 2 |
| suffixed/syllables:7 | 26 | 28 | 2 |
| suffixed/syllables:8 | 10 | 5 | -5 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47126.000 | 47180.000 | +54.000 |
| Mean letters | 7.418 | 7.395 | -0.024 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000178 | 0.000010 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.182841 | -0.001014 |
| trigrams / missingReferenceMass | 0.049072 | 0.052106 | 0.003034 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012516 | 0.000084 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43633 (0.000%) | 0.000 | 56 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43633 (0.000%) | 0.000 | 56 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 3097/50000 (6.194%) | +0.162 | 0 | -0.330 to +0.680 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 289/50000 (0.578%) | +0.034 | 0 | -0.050 to +0.140 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9358/23049 (40.600%) | -0.064 | 130 | -1.288 to +0.740 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1353/6367 (21.250%) | +0.668 | -56 | -0.163 to +2.158 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1318/50000 (2.636%) | -0.146 | 0 | -0.250 to -0.020 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6367 (0.000%) | 0.000 | -56 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6423 | 6367 | -56 |
| bare/syllables:2 | 22919 | 23049 | 130 |
| bare/syllables:3 | 13869 | 13746 | -123 |
| bare/syllables:4 | 5007 | 5050 | 43 |
| bare/syllables:5 | 1427 | 1450 | 23 |
| bare/syllables:6 | 308 | 285 | -23 |
| bare/syllables:7 | 43 | 49 | 6 |
| bare/syllables:8 | 3 | 3 | 0 |
| bare/syllables:9 | 1 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14397.000 | 14390.000 | -7.000 |
| Mean letters | 5.417 | 5.414 | -0.003 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.092156 | -0.000001 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.525326 | -0.000593 |
| trigrams / missingReferenceMass | 0.374662 | 0.374204 | -0.000458 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.002261 | -0.000004 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5424/50000 (10.848%) | -0.010 | 0 | -0.040 to +0.030 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10768/50000 (21.536%) | +0.012 | 0 | -0.030 to +0.060 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 221/50000 (0.442%) | +0.006 | 0 | -0.010 to +0.020 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 28443.000 | 28390.000 | -53.000 |
| Mean letters | 5.613 | 5.604 | -0.009 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.011114 | 0.000012 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.182873 | -0.001606 |
| trigrams / missingReferenceMass | 0.051142 | 0.052010 | 0.000868 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009549 | 0.000112 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 9991/27213 (36.714%) | +0.206 | -33 | -0.163 to +0.748 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27213 (0.000%) | 0.000 | -33 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 571/50000 (1.142%) | -0.044 | 0 | -0.130 to +0.070 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 28/50000 (0.056%) | +0.006 | 0 | -0.010 to +0.020 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4441/22489 (19.747%) | -0.118 | -68 | -0.594 to +0.219 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 849/50000 (1.698%) | -0.030 | 0 | -0.120 to +0.050 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22489/50000 (44.978%) | -0.136 | 0 | -0.590 to +0.370 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 154/50000 (0.308%) | -0.026 | 0 | -0.070 to +0.050 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2477/17120 (14.468%) | +0.126 | 17 | -0.453 to +0.591 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4540/22787 (19.924%) | +0.252 | 33 | -0.098 to +0.792 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 995/50000 (1.990%) | +0.058 | 0 | -0.060 to +0.140 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22787 (0.000%) | 0.000 | 33 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17931 | 18006 | 75 |
| bare/syllables:2 | 5435 | 5410 | -25 |
| bare/syllables:3 | 2713 | 2762 | 49 |
| bare/syllables:4 | 1105 | 1087 | -18 |
| bare/syllables:5 | 234 | 220 | -14 |
| bare/syllables:6 | 25 | 26 | 1 |
| both/syllables:2 | 912 | 899 | -13 |
| both/syllables:3 | 1110 | 1104 | -6 |
| both/syllables:4 | 465 | 449 | -16 |
| both/syllables:5 | 47 | 51 | 4 |
| both/syllables:6 | 5 | 5 | 0 |
| both/syllables:7 | 2 | 2 | 0 |
| prefixed/syllables:2 | 4081 | 4093 | 12 |
| prefixed/syllables:3 | 573 | 550 | -23 |
| prefixed/syllables:4 | 208 | 191 | -17 |
| prefixed/syllables:5 | 60 | 59 | -1 |
| prefixed/syllables:6 | 9 | 9 | 0 |
| suffixed/syllables:1 | 4823 | 4781 | -42 |
| suffixed/syllables:2 | 6675 | 6718 | 43 |
| suffixed/syllables:3 | 2861 | 2867 | 6 |
| suffixed/syllables:4 | 507 | 509 | 2 |
| suffixed/syllables:5 | 186 | 169 | -17 |
| suffixed/syllables:6 | 29 | 28 | -1 |
| suffixed/syllables:7 | 4 | 5 | 1 |
