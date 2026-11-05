# Quality comparison: pr324-current-main-candidate

Original baseline: pr324-current-main-baseline. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | pr324-current-main-baseline | 3853180d9724c8d59c432c22a32605f9363f6bd2 | clean | d51d3eaa5f9ef7283ba75494bd4dac2d37b59b5ff1daf349b14b5e20f2e82405 |
| candidate | pr324-current-main-candidate | a9a6be2e047ba92b21c5c442fb02b74cf0e31d20 | clean | 0b4bd0fa165d4cfd5605edc8225b6f5ac75f0b1a03f27ff95a2ef785b6081d0f |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49441.000 | 49426.000 | -15.000 |
| Mean letters | 9.199 | 9.211 | +0.011 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004468 | 0.004462 | -0.000006 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.144541 | 0.144711 | 0.000170 |
| trigrams / missingReferenceMass | 0.030507 | 0.030173 | -0.000334 |
| trigrams / unseenGeneratedMass | 0.010173 | 0.010138 | -0.000036 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47000 (0.000%) | 0/47033 (0.000%) | 0.000 | 33 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47000 (0.000%) | 0/47033 (0.000%) | 0.000 | 33 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/34914 (0.000%) | 0/34901 (0.000%) | 0.000 | -13 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34914/50000 (69.828%) | 34901/50000 (69.802%) | -0.026 | 0 | -0.360 to +0.190 |
| Words with adjacent identical coda segments / lower | 7/50000 (0.014%) | 8/50000 (0.016%) | +0.002 | 0 | -0.010 to +0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 5339/13286 (40.185%) | 5306/13216 (40.148%) | -0.037 | -70 | -1.105 to +0.753 |
| Monosyllables with schwa as their sole nucleus / lower | 0/3000 (0.000%) | 0/2967 (0.000%) | 0.000 | -33 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 549/50000 (1.098%) | 562/50000 (1.124%) | +0.026 | 0 | -0.040 to +0.110 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 37/3000 (1.233%) | 35/2967 (1.180%) | -0.054 | -33 | -0.172 to +0.037 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1968 | 1959 | -9 |
| bare/syllables:2 | 6874 | 6852 | -22 |
| bare/syllables:3 | 4180 | 4218 | 38 |
| bare/syllables:4 | 1556 | 1561 | 5 |
| bare/syllables:5 | 418 | 418 | 0 |
| bare/syllables:6 | 72 | 74 | 2 |
| bare/syllables:7 | 18 | 17 | -1 |
| both/syllables:10 | 2 | 2 | 0 |
| both/syllables:11 | 1 | 1 | 0 |
| both/syllables:2 | 160 | 166 | 6 |
| both/syllables:3 | 858 | 867 | 9 |
| both/syllables:4 | 1439 | 1439 | 0 |
| both/syllables:5 | 985 | 989 | 4 |
| both/syllables:6 | 401 | 412 | 11 |
| both/syllables:7 | 128 | 131 | 3 |
| both/syllables:8 | 30 | 32 | 2 |
| both/syllables:9 | 9 | 6 | -3 |
| prefixed/syllables:2 | 866 | 863 | -3 |
| prefixed/syllables:3 | 3016 | 3098 | 82 |
| prefixed/syllables:4 | 1947 | 1941 | -6 |
| prefixed/syllables:5 | 785 | 777 | -8 |
| prefixed/syllables:6 | 205 | 210 | 5 |
| prefixed/syllables:7 | 63 | 61 | -2 |
| prefixed/syllables:8 | 11 | 12 | 1 |
| prefixed/syllables:9 | 1 | 1 | 0 |
| suffixed/syllables:1 | 1032 | 1008 | -24 |
| suffixed/syllables:2 | 5386 | 5335 | -51 |
| suffixed/syllables:3 | 8667 | 8612 | -55 |
| suffixed/syllables:4 | 5724 | 5740 | 16 |
| suffixed/syllables:5 | 2294 | 2272 | -22 |
| suffixed/syllables:6 | 696 | 705 | 9 |
| suffixed/syllables:7 | 163 | 172 | 9 |
| suffixed/syllables:8 | 38 | 44 | 6 |
| suffixed/syllables:9 | 7 | 5 | -2 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47532.000 | 47566.000 | +34.000 |
| Mean letters | 7.397 | 7.398 | +0.001 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000616 | 0.000629 | 0.000013 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.175441 | 0.174837 | -0.000605 |
| trigrams / missingReferenceMass | 0.050641 | 0.048985 | -0.001655 |
| trigrams / unseenGeneratedMass | 0.011961 | 0.011892 | -0.000069 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43497 (0.000%) | 0/43507 (0.000%) | 0.000 | 10 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43497 (0.000%) | 0/43507 (0.000%) | 0.000 | 10 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9314/22950 (40.584%) | 9324/22980 (40.574%) | -0.009 | 30 | -0.366 to +0.264 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6503 (0.000%) | 0/6493 (0.000%) | 0.000 | -10 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1222/50000 (2.444%) | 1253/50000 (2.506%) | +0.062 | 0 | -0.010 to +0.220 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 92/6503 (1.415%) | 104/6493 (1.602%) | +0.187 | -10 | -0.071 to +0.549 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6503 | 6493 | -10 |
| bare/syllables:2 | 22950 | 22980 | 30 |
| bare/syllables:3 | 13700 | 13670 | -30 |
| bare/syllables:4 | 5036 | 5042 | 6 |
| bare/syllables:5 | 1470 | 1478 | 8 |
| bare/syllables:6 | 302 | 298 | -4 |
| bare/syllables:7 | 35 | 35 | 0 |
| bare/syllables:8 | 3 | 3 | 0 |
| bare/syllables:9 | 1 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16303.000 | 16247.000 | -56.000 |
| Mean letters | 5.495 | 5.495 | +0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.090410 | 0.090039 | -0.000372 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.505632 | 0.505850 | 0.000218 |
| trigrams / missingReferenceMass | 0.349014 | 0.351195 | 0.002182 |
| trigrams / unseenGeneratedMass | 0.004584 | 0.004663 | 0.000079 |

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
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 272/50000 (0.544%) | 270/50000 (0.540%) | -0.004 | 0 | -0.100 to +0.060 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 864/50000 (1.728%) | 833/50000 (1.666%) | -0.062 | 0 | -0.230 to +0.100 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39485.000 | 39439.000 | -46.000 |
| Mean letters | 6.624 | 6.620 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006544 | 0.006488 | -0.000055 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.156844 | 0.156534 | -0.000309 |
| trigrams / missingReferenceMass | 0.040502 | 0.039768 | -0.000734 |
| trigrams / unseenGeneratedMass | 0.007379 | 0.007117 | -0.000262 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29179 (0.000%) | 0/29105 (0.000%) | 0.000 | -74 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29179 (0.000%) | 0/29105 (0.000%) | 0.000 | -74 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22595 (0.000%) | 0/22583 (0.000%) | 0.000 | -12 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22595/50000 (45.190%) | 22583/50000 (45.166%) | -0.024 | 0 | -0.390 to +0.370 |
| Words with adjacent identical coda segments / lower | 6/50000 (0.012%) | 5/50000 (0.010%) | -0.002 | 0 | -0.010 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6240/15444 (40.404%) | 6192/15369 (40.289%) | -0.115 | -75 | -0.950 to +0.928 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20821 (0.000%) | 0/20895 (0.000%) | 0.000 | 74 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 899/50000 (1.798%) | 877/50000 (1.754%) | -0.044 | 0 | -0.090 to +0.020 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 285/20821 (1.369%) | 283/20895 (1.354%) | -0.014 | 74 | -0.070 to +0.115 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17699 | 17744 | 45 |
| bare/syllables:2 | 5592 | 5525 | -67 |
| bare/syllables:3 | 2752 | 2772 | 20 |
| bare/syllables:4 | 1104 | 1107 | 3 |
| bare/syllables:5 | 218 | 228 | 10 |
| bare/syllables:6 | 40 | 41 | 1 |
| both/syllables:2 | 488 | 502 | 14 |
| both/syllables:3 | 1026 | 1034 | 8 |
| both/syllables:4 | 625 | 599 | -26 |
| both/syllables:5 | 263 | 269 | 6 |
| both/syllables:6 | 93 | 104 | 11 |
| both/syllables:7 | 40 | 41 | 1 |
| both/syllables:8 | 8 | 8 | 0 |
| prefixed/syllables:2 | 3084 | 3062 | -22 |
| prefixed/syllables:3 | 1154 | 1132 | -22 |
| prefixed/syllables:4 | 548 | 554 | 6 |
| prefixed/syllables:5 | 205 | 203 | -2 |
| prefixed/syllables:6 | 52 | 51 | -1 |
| prefixed/syllables:7 | 12 | 11 | -1 |
| suffixed/syllables:1 | 3122 | 3151 | 29 |
| suffixed/syllables:2 | 6280 | 6280 | 0 |
| suffixed/syllables:3 | 3417 | 3431 | 14 |
| suffixed/syllables:4 | 1458 | 1450 | -8 |
| suffixed/syllables:5 | 557 | 544 | -13 |
| suffixed/syllables:6 | 140 | 129 | -11 |
| suffixed/syllables:7 | 19 | 24 | 5 |
| suffixed/syllables:8 | 4 | 4 | 0 |
