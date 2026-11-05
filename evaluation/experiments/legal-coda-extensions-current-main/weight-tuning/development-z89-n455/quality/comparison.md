# Quality comparison: candidate-f65dcf09291c

Original baseline: merge-base-43ef38ae029f. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-43ef38ae029f | 43ef38ae029f4359f323d1c19955b3d44a10a6f7 | clean | d16566c4e86e6e3f07e6582b3e49bfe52cacd1d4f7c6e1c5b84d685534c6d916 |
| candidate | candidate-f65dcf09291c | f65dcf09291c4c8cabe6ee05ea1d2d086f6ae76b | dirty (uncommitted generator changes) | cb5eb1041fc0fca01f98543516ed05e9ac367978e985b7db181423530830ae95 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49458.000 | 49496.000 | +38.000 |
| Mean letters | 9.190 | 9.210 | +0.020 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004311 | 0.004453 | 0.000142 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.144655 | 0.145612 | 0.000957 |
| trigrams / missingReferenceMass | 0.030088 | 0.030670 | 0.000581 |
| trigrams / unseenGeneratedMass | 0.009786 | 0.009973 | 0.000186 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47013 (0.000%) | 0/47066 (0.000%) | 0.000 | 53 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47013 (0.000%) | 0/47066 (0.000%) | 0.000 | 53 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/34947 (0.000%) | 0/34892 (0.000%) | 0.000 | -55 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34947/50000 (69.894%) | 34892/50000 (69.784%) | -0.110 | 0 | -0.720 to +0.320 |
| Words with adjacent identical coda segments / lower | 267/50000 (0.534%) | 4/50000 (0.008%) | -0.526 | 0 | -0.620 to -0.450 |
| Disyllables with adjacent primary and secondary stress / lower | 5384/13355 (40.314%) | 5373/13363 (40.208%) | -0.106 | 8 | -1.303 to +0.672 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2987 (0.000%) | 0/2934 (0.000%) | 0.000 | -53 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 572/50000 (1.144%) | 612/50000 (1.224%) | +0.080 | 0 | -0.070 to +0.180 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 31/2987 (1.038%) | 40/2934 (1.363%) | +0.325 | -53 | -0.267 to +0.814 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1942 | 1898 | -44 |
| bare/syllables:2 | 6919 | 6889 | -30 |
| bare/syllables:3 | 4187 | 4264 | 77 |
| bare/syllables:4 | 1495 | 1527 | 32 |
| bare/syllables:5 | 414 | 427 | 13 |
| bare/syllables:6 | 82 | 87 | 5 |
| bare/syllables:7 | 12 | 15 | 3 |
| bare/syllables:8 | 1 | 1 | 0 |
| bare/syllables:9 | 1 | 0 | -1 |
| both/syllables:10 | 0 | 1 | 1 |
| both/syllables:2 | 167 | 140 | -27 |
| both/syllables:3 | 859 | 830 | -29 |
| both/syllables:4 | 1377 | 1339 | -38 |
| both/syllables:5 | 964 | 1003 | 39 |
| both/syllables:6 | 474 | 414 | -60 |
| both/syllables:7 | 130 | 159 | 29 |
| both/syllables:8 | 22 | 27 | 5 |
| both/syllables:9 | 7 | 6 | -1 |
| prefixed/syllables:2 | 869 | 888 | 19 |
| prefixed/syllables:3 | 3102 | 3064 | -38 |
| prefixed/syllables:4 | 1976 | 1959 | -17 |
| prefixed/syllables:5 | 779 | 753 | -26 |
| prefixed/syllables:6 | 234 | 220 | -14 |
| prefixed/syllables:7 | 58 | 46 | -12 |
| prefixed/syllables:8 | 9 | 9 | 0 |
| prefixed/syllables:9 | 1 | 0 | -1 |
| suffixed/syllables:1 | 1045 | 1036 | -9 |
| suffixed/syllables:10 | 2 | 1 | -1 |
| suffixed/syllables:2 | 5400 | 5446 | 46 |
| suffixed/syllables:3 | 8480 | 8580 | 100 |
| suffixed/syllables:4 | 5717 | 5690 | -27 |
| suffixed/syllables:5 | 2381 | 2353 | -28 |
| suffixed/syllables:6 | 688 | 716 | 28 |
| suffixed/syllables:7 | 166 | 170 | 4 |
| suffixed/syllables:8 | 29 | 31 | 2 |
| suffixed/syllables:9 | 11 | 11 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47535.000 | 47425.000 | -110.000 |
| Mean letters | 7.379 | 7.395 | +0.016 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000631 | 0.000593 | -0.000038 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174332 | 0.174995 | 0.000662 |
| trigrams / missingReferenceMass | 0.050773 | 0.048787 | -0.001986 |
| trigrams / unseenGeneratedMass | 0.011503 | 0.011251 | -0.000252 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43578 (0.000%) | 0/43533 (0.000%) | 0.000 | -45 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43578 (0.000%) | 0/43533 (0.000%) | 0.000 | -45 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 283/50000 (0.566%) | 0/50000 (0.000%) | -0.566 | 0 | -0.680 to -0.430 |
| Disyllables with adjacent primary and secondary stress / lower | 9493/23146 (41.014%) | 9459/23044 (41.048%) | +0.034 | -102 | -0.884 to +0.973 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6422 (0.000%) | 0/6467 (0.000%) | 0.000 | 45 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1306/50000 (2.612%) | 1251/50000 (2.502%) | -0.110 | 0 | -0.220 to -0.030 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 90/6422 (1.401%) | 91/6467 (1.407%) | +0.006 | 45 | -0.291 to +0.395 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6422 | 6467 | 45 |
| bare/syllables:2 | 23146 | 23044 | -102 |
| bare/syllables:3 | 13657 | 13709 | 52 |
| bare/syllables:4 | 5009 | 5067 | 58 |
| bare/syllables:5 | 1419 | 1401 | -18 |
| bare/syllables:6 | 301 | 273 | -28 |
| bare/syllables:7 | 42 | 33 | -9 |
| bare/syllables:8 | 4 | 5 | 1 |
| bare/syllables:9 | 0 | 1 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16785.000 | 16306.000 | -479.000 |
| Mean letters | 5.446 | 5.495 | +0.048 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.095460 | 0.091099 | -0.004361 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.496566 | 0.505840 | 0.009274 |
| trigrams / missingReferenceMass | 0.345846 | 0.351115 | 0.005269 |
| trigrams / unseenGeneratedMass | 0.004515 | 0.004785 | 0.000270 |

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
| Words with adjacent identical coda segments / lower | 5358/50000 (10.716%) | 0/50000 (0.000%) | -10.716 | 0 | -11.200 to -10.380 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 288/50000 (0.576%) | 262/50000 (0.524%) | -0.052 | 0 | -0.290 to +0.040 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 848/50000 (1.696%) | 856/50000 (1.712%) | +0.016 | 0 | -0.320 to +0.140 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39375.000 | 39499.000 | +124.000 |
| Mean letters | 6.594 | 6.622 | +0.028 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006278 | 0.006527 | 0.000249 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155258 | 0.155793 | 0.000535 |
| trigrams / missingReferenceMass | 0.038369 | 0.040791 | 0.002423 |
| trigrams / unseenGeneratedMass | 0.007174 | 0.007512 | 0.000338 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29071 (0.000%) | 0/29198 (0.000%) | 0.000 | 127 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29071 (0.000%) | 0/29198 (0.000%) | 0.000 | 127 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22499 (0.000%) | 0/22609 (0.000%) | 0.000 | 110 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22499/50000 (44.998%) | 22609/50000 (45.218%) | +0.220 | 0 | -0.560 to +0.640 |
| Words with adjacent identical coda segments / lower | 239/50000 (0.478%) | 8/50000 (0.016%) | -0.462 | 0 | -0.660 to -0.340 |
| Disyllables with adjacent primary and secondary stress / lower | 6180/15316 (40.350%) | 6305/15431 (40.859%) | +0.509 | 115 | -0.894 to +1.735 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20929 (0.000%) | 0/20802 (0.000%) | 0.000 | -127 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 944/50000 (1.888%) | 899/50000 (1.798%) | -0.090 | 0 | -0.370 to +0.150 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 277/20929 (1.324%) | 251/20802 (1.207%) | -0.117 | -127 | -0.246 to +0.033 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17837 | 17657 | -180 |
| bare/syllables:2 | 5479 | 5592 | 113 |
| bare/syllables:3 | 2847 | 2786 | -61 |
| bare/syllables:4 | 1095 | 1096 | 1 |
| bare/syllables:5 | 218 | 228 | 10 |
| bare/syllables:6 | 25 | 32 | 7 |
| both/syllables:2 | 489 | 527 | 38 |
| both/syllables:3 | 1002 | 1047 | 45 |
| both/syllables:4 | 600 | 619 | 19 |
| both/syllables:5 | 273 | 257 | -16 |
| both/syllables:6 | 84 | 92 | 8 |
| both/syllables:7 | 31 | 29 | -2 |
| both/syllables:8 | 4 | 5 | 1 |
| both/syllables:9 | 1 | 0 | -1 |
| prefixed/syllables:2 | 3022 | 3091 | 69 |
| prefixed/syllables:3 | 1170 | 1206 | 36 |
| prefixed/syllables:4 | 540 | 540 | 0 |
| prefixed/syllables:5 | 196 | 206 | 10 |
| prefixed/syllables:6 | 52 | 60 | 8 |
| prefixed/syllables:7 | 5 | 8 | 3 |
| suffixed/syllables:1 | 3092 | 3145 | 53 |
| suffixed/syllables:2 | 6326 | 6221 | -105 |
| suffixed/syllables:3 | 3448 | 3405 | -43 |
| suffixed/syllables:4 | 1406 | 1449 | 43 |
| suffixed/syllables:5 | 573 | 548 | -25 |
| suffixed/syllables:6 | 161 | 135 | -26 |
| suffixed/syllables:7 | 23 | 17 | -6 |
| suffixed/syllables:8 | 1 | 2 | 1 |
