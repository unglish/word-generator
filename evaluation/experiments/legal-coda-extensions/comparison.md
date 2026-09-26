# Quality comparison: legal-coda-extensions

Original baseline: baseline-development-v1. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 43501.000 | 43674.000 | +173.000 |
| Mean letters | 7.462 | 7.474 | +0.012 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007386 | -0.000021 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.158014 | -0.000578 |
| trigrams / missingReferenceMass | 0.034830 | 0.035296 | 0.000466 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.010625 | -0.000372 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9397/45533 (20.638%) | +0.092 | 63 | -0.688 to +0.763 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45533 (0.000%) | 0.000 | 63 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 974/50000 (1.948%) | -0.068 | 0 | -0.220 to +0.070 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 124/50000 (0.248%) | -0.030 | 0 | -0.090 to -0.010 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3808/34982 (10.886%) | -0.164 | 30 | -0.611 to +0.146 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 1888/50000 (3.776%) | -0.136 | 0 | -0.390 to +0.210 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 34982/50000 (69.964%) | +0.060 | 0 | -0.760 to +0.830 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 2/50000 (0.004%) | -0.356 | 0 | -0.430 to -0.260 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4552/21042 (21.633%) | +0.427 | -23 | +0.214 to +0.666 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 852/4467 (19.073%) | -0.772 | -63 | -2.856 to +3.232 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 766/50000 (1.532%) | +0.040 | 0 | -0.130 to +0.230 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4467 (0.000%) | 0.000 | -63 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 2013 | 1948 | -65 |
| bare/syllables:2 | 6997 | 6963 | -34 |
| bare/syllables:3 | 4100 | 4130 | 30 |
| bare/syllables:4 | 1444 | 1473 | 29 |
| bare/syllables:5 | 387 | 410 | 23 |
| bare/syllables:6 | 92 | 82 | -10 |
| bare/syllables:7 | 14 | 11 | -3 |
| bare/syllables:8 | 1 | 0 | -1 |
| bare/syllables:9 | 0 | 1 | 1 |
| both/syllables:2 | 1044 | 1031 | -13 |
| both/syllables:3 | 1800 | 1753 | -47 |
| both/syllables:4 | 929 | 915 | -14 |
| both/syllables:5 | 182 | 196 | 14 |
| both/syllables:6 | 20 | 26 | 6 |
| both/syllables:7 | 6 | 3 | -3 |
| both/syllables:9 | 0 | 2 | 2 |
| prefixed/syllables:2 | 3302 | 3305 | 3 |
| prefixed/syllables:3 | 2560 | 2653 | 93 |
| prefixed/syllables:4 | 895 | 933 | 38 |
| prefixed/syllables:5 | 229 | 204 | -25 |
| prefixed/syllables:6 | 50 | 48 | -2 |
| prefixed/syllables:7 | 5 | 7 | 2 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 2517 | 2519 | 2 |
| suffixed/syllables:2 | 9722 | 9743 | 21 |
| suffixed/syllables:3 | 8058 | 7998 | -60 |
| suffixed/syllables:4 | 2733 | 2737 | 4 |
| suffixed/syllables:5 | 711 | 729 | 18 |
| suffixed/syllables:6 | 152 | 147 | -5 |
| suffixed/syllables:7 | 26 | 25 | -1 |
| suffixed/syllables:8 | 10 | 6 | -4 |
| suffixed/syllables:9 | 0 | 1 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47126.000 | 47085.000 | -41.000 |
| Mean letters | 7.418 | 7.406 | -0.012 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000189 | 0.000021 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.184097 | 0.000241 |
| trigrams / missingReferenceMass | 0.049072 | 0.054513 | 0.005441 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012396 | -0.000035 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43469 (0.000%) | 0.000 | -108 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43469 (0.000%) | 0.000 | -108 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 3181/50000 (6.362%) | +0.330 | 0 | +0.060 to +0.800 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 0/50000 (0.000%) | -0.544 | 0 | -0.620 to -0.470 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9303/23085 (40.299%) | -0.366 | 166 | -2.523 to +1.544 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1339/6531 (20.502%) | -0.080 | 108 | -1.088 to +1.115 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1287/50000 (2.574%) | -0.208 | 0 | -0.410 to -0.100 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6531 (0.000%) | 0.000 | 108 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6423 | 6531 | 108 |
| bare/syllables:2 | 22919 | 23085 | 166 |
| bare/syllables:3 | 13869 | 13666 | -203 |
| bare/syllables:4 | 5007 | 5012 | 5 |
| bare/syllables:5 | 1427 | 1374 | -53 |
| bare/syllables:6 | 308 | 288 | -20 |
| bare/syllables:7 | 43 | 41 | -2 |
| bare/syllables:8 | 3 | 3 | 0 |
| bare/syllables:9 | 1 | 0 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14397.000 | 13915.000 | -482.000 |
| Mean letters | 5.417 | 5.501 | +0.084 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.095937 | 0.003779 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.535900 | 0.009982 |
| trigrams / missingReferenceMass | 0.374662 | 0.369083 | -0.005579 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.002302 | 0.000037 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 0/50000 (0.000%) | -10.858 | 0 | -11.330 to -10.360 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10776/50000 (21.552%) | +0.028 | 0 | -0.360 to +0.460 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 237/50000 (0.474%) | +0.038 | 0 | -0.070 to +0.140 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 28443.000 | 28479.000 | +36.000 |
| Mean letters | 5.613 | 5.624 | +0.011 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.011109 | 0.000007 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.183821 | -0.000659 |
| trigrams / missingReferenceMass | 0.051142 | 0.051209 | 0.000068 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009277 | -0.000160 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 9946/27232 (36.523%) | +0.015 | -14 | -0.820 to +0.517 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27232 (0.000%) | 0.000 | -14 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 595/50000 (1.190%) | +0.004 | 0 | -0.140 to +0.120 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 18/50000 (0.036%) | -0.014 | 0 | -0.040 to +0.010 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4451/22417 (19.855%) | -0.010 | -140 | -1.043 to +0.803 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 805/50000 (1.610%) | -0.118 | 0 | -0.390 to +0.070 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22417/50000 (44.834%) | -0.280 | 0 | -0.680 to +0.050 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 1/50000 (0.002%) | -0.332 | 0 | -0.390 to -0.260 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2457/17152 (14.325%) | -0.018 | 49 | -0.522 to +0.351 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4461/22768 (19.593%) | -0.078 | 14 | -0.727 to +0.690 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 968/50000 (1.936%) | +0.004 | 0 | -0.260 to +0.170 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22768 (0.000%) | 0.000 | 14 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17931 | 18014 | 83 |
| bare/syllables:2 | 5435 | 5392 | -43 |
| bare/syllables:3 | 2713 | 2715 | 2 |
| bare/syllables:4 | 1105 | 1180 | 75 |
| bare/syllables:5 | 234 | 250 | 16 |
| bare/syllables:6 | 25 | 32 | 7 |
| both/syllables:2 | 912 | 912 | 0 |
| both/syllables:3 | 1110 | 1071 | -39 |
| both/syllables:4 | 465 | 440 | -25 |
| both/syllables:5 | 47 | 43 | -4 |
| both/syllables:6 | 5 | 3 | -2 |
| both/syllables:7 | 2 | 1 | -1 |
| prefixed/syllables:2 | 4081 | 4102 | 21 |
| prefixed/syllables:3 | 573 | 582 | 9 |
| prefixed/syllables:4 | 208 | 197 | -11 |
| prefixed/syllables:5 | 60 | 70 | 10 |
| prefixed/syllables:6 | 9 | 11 | 2 |
| suffixed/syllables:1 | 4823 | 4754 | -69 |
| suffixed/syllables:2 | 6675 | 6746 | 71 |
| suffixed/syllables:3 | 2861 | 2835 | -26 |
| suffixed/syllables:4 | 507 | 483 | -24 |
| suffixed/syllables:5 | 186 | 147 | -39 |
| suffixed/syllables:6 | 29 | 17 | -12 |
| suffixed/syllables:7 | 4 | 3 | -1 |
