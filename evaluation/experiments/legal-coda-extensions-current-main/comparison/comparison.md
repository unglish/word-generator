# Quality comparison: pr313-current-main

Original baseline: merge-base-43ef38ae029f. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-43ef38ae029f | 43ef38ae029f4359f323d1c19955b3d44a10a6f7 | clean | d16566c4e86e6e3f07e6582b3e49bfe52cacd1d4f7c6e1c5b84d685534c6d916 |
| candidate | pr313-current-main | 43ef38ae029f4359f323d1c19955b3d44a10a6f7 | dirty (uncommitted generator changes) | 6421ca6a9b31e09a99ea866d1d00aff66143bf120d2aa5abcecd520c6506c86a |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49458.000 | 49526.000 | +68.000 |
| Mean letters | 9.190 | 9.211 | +0.021 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004311 | 0.004501 | 0.000189 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.144655 | 0.146161 | 0.001505 |
| trigrams / missingReferenceMass | 0.030088 | 0.029781 | -0.000307 |
| trigrams / unseenGeneratedMass | 0.009786 | 0.010021 | 0.000235 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47013 (0.000%) | 0/47105 (0.000%) | 0.000 | 92 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47013 (0.000%) | 0/47105 (0.000%) | 0.000 | 92 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/34947 (0.000%) | 0/35064 (0.000%) | 0.000 | 117 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34947/50000 (69.894%) | 35064/50000 (70.128%) | +0.234 | 0 | -0.240 to +0.560 |
| Words with adjacent identical coda segments / lower | 267/50000 (0.534%) | 5/50000 (0.010%) | -0.524 | 0 | -0.600 to -0.450 |
| Disyllables with adjacent primary and secondary stress / lower | 5384/13355 (40.314%) | 5279/13385 (39.440%) | -0.875 | 30 | -1.848 to +0.170 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2987 (0.000%) | 0/2895 (0.000%) | 0.000 | -92 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 572/50000 (1.144%) | 574/50000 (1.148%) | +0.004 | 0 | -0.120 to +0.170 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 31/2987 (1.038%) | 36/2895 (1.244%) | +0.206 | -92 | -0.460 to +1.253 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1942 | 1899 | -43 |
| bare/syllables:2 | 6919 | 6966 | 47 |
| bare/syllables:3 | 4187 | 4091 | -96 |
| bare/syllables:4 | 1495 | 1488 | -7 |
| bare/syllables:5 | 414 | 381 | -33 |
| bare/syllables:6 | 82 | 95 | 13 |
| bare/syllables:7 | 12 | 16 | 4 |
| bare/syllables:8 | 1 | 0 | -1 |
| bare/syllables:9 | 1 | 0 | -1 |
| both/syllables:10 | 0 | 1 | 1 |
| both/syllables:11 | 0 | 1 | 1 |
| both/syllables:2 | 167 | 167 | 0 |
| both/syllables:3 | 859 | 846 | -13 |
| both/syllables:4 | 1377 | 1398 | 21 |
| both/syllables:5 | 964 | 1014 | 50 |
| both/syllables:6 | 474 | 467 | -7 |
| both/syllables:7 | 130 | 124 | -6 |
| both/syllables:8 | 22 | 26 | 4 |
| both/syllables:9 | 7 | 3 | -4 |
| prefixed/syllables:2 | 869 | 860 | -9 |
| prefixed/syllables:3 | 3102 | 3117 | 15 |
| prefixed/syllables:4 | 1976 | 1977 | 1 |
| prefixed/syllables:5 | 779 | 738 | -41 |
| prefixed/syllables:6 | 234 | 247 | 13 |
| prefixed/syllables:7 | 58 | 48 | -10 |
| prefixed/syllables:8 | 9 | 8 | -1 |
| prefixed/syllables:9 | 1 | 1 | 0 |
| suffixed/syllables:1 | 1045 | 996 | -49 |
| suffixed/syllables:10 | 2 | 1 | -1 |
| suffixed/syllables:2 | 5400 | 5392 | -8 |
| suffixed/syllables:3 | 8480 | 8701 | 221 |
| suffixed/syllables:4 | 5717 | 5723 | 6 |
| suffixed/syllables:5 | 2381 | 2357 | -24 |
| suffixed/syllables:6 | 688 | 647 | -41 |
| suffixed/syllables:7 | 166 | 173 | 7 |
| suffixed/syllables:8 | 29 | 24 | -5 |
| suffixed/syllables:9 | 11 | 7 | -4 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47535.000 | 47557.000 | +22.000 |
| Mean letters | 7.379 | 7.389 | +0.010 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000631 | 0.000571 | -0.000059 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174332 | 0.174492 | 0.000160 |
| trigrams / missingReferenceMass | 0.050773 | 0.049091 | -0.001682 |
| trigrams / unseenGeneratedMass | 0.011503 | 0.011765 | 0.000261 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43578 (0.000%) | 0/43601 (0.000%) | 0.000 | 23 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43578 (0.000%) | 0/43601 (0.000%) | 0.000 | 23 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 283/50000 (0.566%) | 0/50000 (0.000%) | -0.566 | 0 | -0.680 to -0.430 |
| Disyllables with adjacent primary and secondary stress / lower | 9493/23146 (41.014%) | 9362/23238 (40.287%) | -0.726 | 92 | -2.084 to +0.267 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6422 (0.000%) | 0/6399 (0.000%) | 0.000 | -23 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1306/50000 (2.612%) | 1272/50000 (2.544%) | -0.068 | 0 | -0.220 to +0.060 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 90/6422 (1.401%) | 83/6399 (1.297%) | -0.104 | -23 | -0.452 to +0.136 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6422 | 6399 | -23 |
| bare/syllables:2 | 23146 | 23238 | 92 |
| bare/syllables:3 | 13657 | 13642 | -15 |
| bare/syllables:4 | 5009 | 4973 | -36 |
| bare/syllables:5 | 1419 | 1398 | -21 |
| bare/syllables:6 | 301 | 301 | 0 |
| bare/syllables:7 | 42 | 44 | 2 |
| bare/syllables:8 | 4 | 5 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16785.000 | 16353.000 | -432.000 |
| Mean letters | 5.446 | 5.499 | +0.052 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.095460 | 0.090698 | -0.004762 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.496566 | 0.505848 | 0.009282 |
| trigrams / missingReferenceMass | 0.345846 | 0.352990 | 0.007143 |
| trigrams / unseenGeneratedMass | 0.004515 | 0.004802 | 0.000287 |

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
| Words ending in an open checked vowel / lower | 288/50000 (0.576%) | 240/50000 (0.480%) | -0.096 | 0 | -0.220 to -0.020 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 848/50000 (1.696%) | 849/50000 (1.698%) | +0.002 | 0 | -0.180 to +0.230 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39375.000 | 39324.000 | -51.000 |
| Mean letters | 6.594 | 6.614 | +0.020 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006278 | 0.006608 | 0.000330 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155258 | 0.157029 | 0.001771 |
| trigrams / missingReferenceMass | 0.038369 | 0.038845 | 0.000476 |
| trigrams / unseenGeneratedMass | 0.007174 | 0.007364 | 0.000190 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29071 (0.000%) | 0/28964 (0.000%) | 0.000 | -107 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29071 (0.000%) | 0/28964 (0.000%) | 0.000 | -107 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22499 (0.000%) | 0/22396 (0.000%) | 0.000 | -103 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22499/50000 (44.998%) | 22396/50000 (44.792%) | -0.206 | 0 | -0.540 to +0.280 |
| Words with adjacent identical coda segments / lower | 239/50000 (0.478%) | 10/50000 (0.020%) | -0.458 | 0 | -0.660 to -0.350 |
| Disyllables with adjacent primary and secondary stress / lower | 6180/15316 (40.350%) | 6226/15313 (40.658%) | +0.308 | -3 | -0.795 to +1.219 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20929 (0.000%) | 0/21036 (0.000%) | 0.000 | 107 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 944/50000 (1.888%) | 865/50000 (1.730%) | -0.158 | 0 | -0.300 to +0.050 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 277/20929 (1.324%) | 247/21036 (1.174%) | -0.149 | 107 | -0.300 to -0.032 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17837 | 17945 | 108 |
| bare/syllables:2 | 5479 | 5535 | 56 |
| bare/syllables:3 | 2847 | 2719 | -128 |
| bare/syllables:4 | 1095 | 1127 | 32 |
| bare/syllables:5 | 218 | 241 | 23 |
| bare/syllables:6 | 25 | 37 | 12 |
| both/syllables:2 | 489 | 485 | -4 |
| both/syllables:3 | 1002 | 1000 | -2 |
| both/syllables:4 | 600 | 618 | 18 |
| both/syllables:5 | 273 | 279 | 6 |
| both/syllables:6 | 84 | 96 | 12 |
| both/syllables:7 | 31 | 45 | 14 |
| both/syllables:8 | 4 | 4 | 0 |
| both/syllables:9 | 1 | 0 | -1 |
| prefixed/syllables:2 | 3022 | 3112 | 90 |
| prefixed/syllables:3 | 1170 | 1174 | 4 |
| prefixed/syllables:4 | 540 | 503 | -37 |
| prefixed/syllables:5 | 196 | 233 | 37 |
| prefixed/syllables:6 | 52 | 55 | 3 |
| prefixed/syllables:7 | 5 | 10 | 5 |
| suffixed/syllables:1 | 3092 | 3091 | -1 |
| suffixed/syllables:2 | 6326 | 6181 | -145 |
| suffixed/syllables:3 | 3448 | 3406 | -42 |
| suffixed/syllables:4 | 1406 | 1396 | -10 |
| suffixed/syllables:5 | 573 | 538 | -35 |
| suffixed/syllables:6 | 161 | 155 | -6 |
| suffixed/syllables:7 | 23 | 13 | -10 |
| suffixed/syllables:8 | 1 | 2 | 1 |
