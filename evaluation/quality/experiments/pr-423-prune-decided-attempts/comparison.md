# Quality comparison: candidate-aeb4e9c97436

Original baseline: merge-base-aeb4e9c97436. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-aeb4e9c97436 | aeb4e9c97436d36a8bfc29889b308ee6c7dc142a | clean | 3c8706541026a2f653c72ab35ec700793d45595a53470b4d639da3d5deba0c39 |
| candidate | candidate-aeb4e9c97436 | aeb4e9c97436d36a8bfc29889b308ee6c7dc142a | dirty (uncommitted generator changes) | fa3d3cb715285ed8dbfcd4e12abbd5d4cf26c2ee68d3c7cd7806957d624f58e9 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49492.000 | 49484.000 | -8.000 |
| Mean letters | 9.225 | 9.208 | -0.017 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004490 | 0.004428 | -0.000062 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.146212 | 0.145033 | -0.001179 |
| trigrams / missingReferenceMass | 0.031805 | 0.030277 | -0.001528 |
| trigrams / unseenGeneratedMass | 0.010192 | 0.010019 | -0.000173 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47082 (0.000%) | 0/47034 (0.000%) | 0.000 | -48 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47082 (0.000%) | 0/47034 (0.000%) | 0.000 | -48 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35024 (0.000%) | 0/34913 (0.000%) | 0.000 | -111 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35024/50000 (70.048%) | 34913/50000 (69.826%) | -0.222 | 0 | -0.480 to +0.090 |
| Words with adjacent identical coda segments / lower | 9/50000 (0.018%) | 3/50000 (0.006%) | -0.012 | 0 | -0.040 to +0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 5159/13357 (38.624%) | 5382/13567 (39.670%) | +1.046 | 210 | -0.741 to +2.632 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2918 (0.000%) | 0/2966 (0.000%) | 0.000 | 48 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 573/50000 (1.146%) | 560/50000 (1.120%) | -0.026 | 0 | -0.280 to +0.130 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 38/2918 (1.302%) | 36/2966 (1.214%) | -0.089 | 48 | -1.015 to +0.738 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1934 | 1974 | 40 |
| bare/syllables:2 | 6976 | 7118 | 142 |
| bare/syllables:3 | 4057 | 4015 | -42 |
| bare/syllables:4 | 1508 | 1456 | -52 |
| bare/syllables:5 | 397 | 424 | 27 |
| bare/syllables:6 | 95 | 87 | -8 |
| bare/syllables:7 | 9 | 11 | 2 |
| bare/syllables:8 | 0 | 2 | 2 |
| both/syllables:2 | 135 | 146 | 11 |
| both/syllables:3 | 901 | 878 | -23 |
| both/syllables:4 | 1401 | 1434 | 33 |
| both/syllables:5 | 1014 | 1002 | -12 |
| both/syllables:6 | 438 | 447 | 9 |
| both/syllables:7 | 137 | 140 | 3 |
| both/syllables:8 | 43 | 35 | -8 |
| both/syllables:9 | 3 | 8 | 5 |
| prefixed/syllables:2 | 847 | 800 | -47 |
| prefixed/syllables:3 | 3016 | 3059 | 43 |
| prefixed/syllables:4 | 2060 | 1977 | -83 |
| prefixed/syllables:5 | 774 | 757 | -17 |
| prefixed/syllables:6 | 235 | 232 | -3 |
| prefixed/syllables:7 | 51 | 52 | 1 |
| prefixed/syllables:8 | 10 | 10 | 0 |
| prefixed/syllables:9 | 0 | 3 | 3 |
| suffixed/syllables:1 | 984 | 992 | 8 |
| suffixed/syllables:10 | 3 | 0 | -3 |
| suffixed/syllables:2 | 5399 | 5503 | 104 |
| suffixed/syllables:3 | 8486 | 8515 | 29 |
| suffixed/syllables:4 | 5819 | 5714 | -105 |
| suffixed/syllables:5 | 2320 | 2250 | -70 |
| suffixed/syllables:6 | 721 | 741 | 20 |
| suffixed/syllables:7 | 181 | 175 | -6 |
| suffixed/syllables:8 | 36 | 34 | -2 |
| suffixed/syllables:9 | 10 | 9 | -1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47633.000 | 47549.000 | -84.000 |
| Mean letters | 7.411 | 7.385 | -0.026 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000526 | 0.000574 | 0.000047 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174705 | 0.174429 | -0.000276 |
| trigrams / missingReferenceMass | 0.046227 | 0.047917 | 0.001690 |
| trigrams / unseenGeneratedMass | 0.011633 | 0.011187 | -0.000446 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43621 (0.000%) | 0/43383 (0.000%) | 0.000 | -238 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43621 (0.000%) | 0/43383 (0.000%) | 0.000 | -238 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9289/22985 (40.413%) | 9275/23031 (40.272%) | -0.142 | 46 | -1.626 to +2.375 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6379 (0.000%) | 0/6617 (0.000%) | 0.000 | 238 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1283/50000 (2.566%) | 1248/50000 (2.496%) | -0.070 | 0 | -0.470 to +0.210 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 113/6379 (1.771%) | 95/6617 (1.436%) | -0.336 | 238 | -0.888 to +0.732 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6379 | 6617 | 238 |
| bare/syllables:2 | 22985 | 23031 | 46 |
| bare/syllables:3 | 13908 | 13654 | -254 |
| bare/syllables:4 | 4977 | 4967 | -10 |
| bare/syllables:5 | 1431 | 1408 | -23 |
| bare/syllables:6 | 280 | 285 | 5 |
| bare/syllables:7 | 33 | 33 | 0 |
| bare/syllables:8 | 7 | 5 | -2 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16827.000 | 16861.000 | +34.000 |
| Mean letters | 4.363 | 4.358 | -0.005 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.046942 | 0.046347 | -0.000595 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.371780 | 0.371259 | -0.000520 |
| trigrams / missingReferenceMass | 0.337277 | 0.338144 | 0.000866 |
| trigrams / unseenGeneratedMass | 0.002785 | 0.002646 | -0.000138 |

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
| Words ending in an open checked vowel / lower | 1353/50000 (2.706%) | 1374/50000 (2.748%) | +0.042 | 0 | -0.260 to +0.220 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 689/50000 (1.378%) | 676/50000 (1.352%) | -0.026 | 0 | -0.160 to +0.230 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39515.000 | 39504.000 | -11.000 |
| Mean letters | 6.632 | 6.623 | -0.009 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006370 | 0.006506 | 0.000135 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155962 | 0.155256 | -0.000706 |
| trigrams / missingReferenceMass | 0.039038 | 0.040291 | 0.001252 |
| trigrams / unseenGeneratedMass | 0.007681 | 0.007064 | -0.000616 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29078 (0.000%) | 0/29070 (0.000%) | 0.000 | -8 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29078 (0.000%) | 0/29070 (0.000%) | 0.000 | -8 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22630 (0.000%) | 0/22648 (0.000%) | 0.000 | 18 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22630/50000 (45.260%) | 22648/50000 (45.296%) | +0.036 | 0 | -0.710 to +1.190 |
| Words with adjacent identical coda segments / lower | 6/50000 (0.012%) | 7/50000 (0.014%) | +0.002 | 0 | -0.010 to +0.020 |
| Disyllables with adjacent primary and secondary stress / lower | 6207/15202 (40.830%) | 6223/15361 (40.512%) | -0.318 | 159 | -2.138 to +2.455 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20922 (0.000%) | 0/20930 (0.000%) | 0.000 | 8 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 893/50000 (1.786%) | 826/50000 (1.652%) | -0.134 | 0 | -0.440 to +0.050 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 278/20922 (1.329%) | 262/20930 (1.252%) | -0.077 | 8 | -0.256 to +0.172 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17800 | 17808 | 8 |
| bare/syllables:2 | 5411 | 5421 | 10 |
| bare/syllables:3 | 2784 | 2759 | -25 |
| bare/syllables:4 | 1128 | 1118 | -10 |
| bare/syllables:5 | 221 | 222 | 1 |
| bare/syllables:6 | 26 | 24 | -2 |
| both/syllables:2 | 519 | 480 | -39 |
| both/syllables:3 | 990 | 990 | 0 |
| both/syllables:4 | 632 | 625 | -7 |
| both/syllables:5 | 245 | 287 | 42 |
| both/syllables:6 | 97 | 83 | -14 |
| both/syllables:7 | 29 | 34 | 5 |
| both/syllables:8 | 9 | 10 | 1 |
| both/syllables:9 | 0 | 1 | 1 |
| prefixed/syllables:2 | 3053 | 3063 | 10 |
| prefixed/syllables:3 | 1198 | 1125 | -73 |
| prefixed/syllables:4 | 553 | 499 | -54 |
| prefixed/syllables:5 | 251 | 218 | -33 |
| prefixed/syllables:6 | 56 | 56 | 0 |
| prefixed/syllables:7 | 13 | 9 | -4 |
| suffixed/syllables:1 | 3122 | 3122 | 0 |
| suffixed/syllables:2 | 6219 | 6397 | 178 |
| suffixed/syllables:3 | 3446 | 3460 | 14 |
| suffixed/syllables:4 | 1403 | 1442 | 39 |
| suffixed/syllables:5 | 591 | 558 | -33 |
| suffixed/syllables:6 | 167 | 159 | -8 |
| suffixed/syllables:7 | 34 | 28 | -6 |
| suffixed/syllables:8 | 3 | 2 | -1 |
