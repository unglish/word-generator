# Quality comparison: candidate-f65dcf09291c

Original baseline: merge-base-43ef38ae029f. Cohort: development. Previous step: pr313-current-main.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-43ef38ae029f | 43ef38ae029f4359f323d1c19955b3d44a10a6f7 | clean | d16566c4e86e6e3f07e6582b3e49bfe52cacd1d4f7c6e1c5b84d685534c6d916 |
| previous | pr313-current-main | 43ef38ae029f4359f323d1c19955b3d44a10a6f7 | dirty (uncommitted generator changes) | 6421ca6a9b31e09a99ea866d1d00aff66143bf120d2aa5abcecd520c6506c86a |
| candidate | candidate-f65dcf09291c | f65dcf09291c4c8cabe6ee05ea1d2d086f6ae76b | dirty (uncommitted generator changes) | cb5eb1041fc0fca01f98543516ed05e9ac367978e985b7db181423530830ae95 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 49458.000 | 49496.000 | +38.000 | 49526.000 | -30.000 |
| Mean letters | 9.190 | 9.210 | +0.020 | 9.211 | -0.001 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004311 | 0.004453 | 0.000142 | 0.004501 | -0.000048 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.144655 | 0.145612 | 0.000957 | 0.146161 | -0.000548 |
| trigrams / missingReferenceMass | 0.030088 | 0.030670 | 0.000581 | 0.029781 | 0.000888 |
| trigrams / unseenGeneratedMass | 0.009786 | 0.009973 | 0.000186 | 0.010021 | -0.000049 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47013 (0.000%) | 0/47066 (0.000%) | 0.000 | 53 | 0.000 to 0.000 | 0/47105 (0.000%) | 0.000 | -39 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47013 (0.000%) | 0/47066 (0.000%) | 0.000 | 53 | 0.000 to 0.000 | 0/47105 (0.000%) | 0.000 | -39 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/34947 (0.000%) | 0/34892 (0.000%) | 0.000 | -55 | 0.000 to 0.000 | 0/35064 (0.000%) | 0.000 | -172 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34947/50000 (69.894%) | 34892/50000 (69.784%) | -0.110 | 0 | -0.720 to +0.320 | 35064/50000 (70.128%) | -0.344 | 0 | -0.620 to -0.240 |
| Words with adjacent identical coda segments / lower | 267/50000 (0.534%) | 4/50000 (0.008%) | -0.526 | 0 | -0.620 to -0.450 | 5/50000 (0.010%) | -0.002 | 0 | -0.020 to +0.020 |
| Disyllables with adjacent primary and secondary stress / lower | 5384/13355 (40.314%) | 5373/13363 (40.208%) | -0.106 | 8 | -1.303 to +0.672 | 5279/13385 (39.440%) | +0.768 | -22 | -1.472 to +2.241 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2987 (0.000%) | 0/2934 (0.000%) | 0.000 | -53 | 0.000 to 0.000 | 0/2895 (0.000%) | 0.000 | 39 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 572/50000 (1.144%) | 612/50000 (1.224%) | +0.080 | 0 | -0.070 to +0.180 | 574/50000 (1.148%) | +0.076 | 0 | -0.120 to +0.300 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 31/2987 (1.038%) | 40/2934 (1.363%) | +0.325 | -53 | -0.267 to +0.814 | 36/2895 (1.244%) | +0.120 | 39 | -1.067 to +0.608 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 1942 | 1898 | -44 | 1899 | -1 |
| bare/syllables:2 | 6919 | 6889 | -30 | 6966 | -77 |
| bare/syllables:3 | 4187 | 4264 | 77 | 4091 | 173 |
| bare/syllables:4 | 1495 | 1527 | 32 | 1488 | 39 |
| bare/syllables:5 | 414 | 427 | 13 | 381 | 46 |
| bare/syllables:6 | 82 | 87 | 5 | 95 | -8 |
| bare/syllables:7 | 12 | 15 | 3 | 16 | -1 |
| bare/syllables:8 | 1 | 1 | 0 | 0 | 1 |
| bare/syllables:9 | 1 | 0 | -1 | 0 | 0 |
| both/syllables:10 | 0 | 1 | 1 | 1 | 0 |
| both/syllables:11 | 0 | 0 | 0 | 1 | -1 |
| both/syllables:2 | 167 | 140 | -27 | 167 | -27 |
| both/syllables:3 | 859 | 830 | -29 | 846 | -16 |
| both/syllables:4 | 1377 | 1339 | -38 | 1398 | -59 |
| both/syllables:5 | 964 | 1003 | 39 | 1014 | -11 |
| both/syllables:6 | 474 | 414 | -60 | 467 | -53 |
| both/syllables:7 | 130 | 159 | 29 | 124 | 35 |
| both/syllables:8 | 22 | 27 | 5 | 26 | 1 |
| both/syllables:9 | 7 | 6 | -1 | 3 | 3 |
| prefixed/syllables:2 | 869 | 888 | 19 | 860 | 28 |
| prefixed/syllables:3 | 3102 | 3064 | -38 | 3117 | -53 |
| prefixed/syllables:4 | 1976 | 1959 | -17 | 1977 | -18 |
| prefixed/syllables:5 | 779 | 753 | -26 | 738 | 15 |
| prefixed/syllables:6 | 234 | 220 | -14 | 247 | -27 |
| prefixed/syllables:7 | 58 | 46 | -12 | 48 | -2 |
| prefixed/syllables:8 | 9 | 9 | 0 | 8 | 1 |
| prefixed/syllables:9 | 1 | 0 | -1 | 1 | -1 |
| suffixed/syllables:1 | 1045 | 1036 | -9 | 996 | 40 |
| suffixed/syllables:10 | 2 | 1 | -1 | 1 | 0 |
| suffixed/syllables:2 | 5400 | 5446 | 46 | 5392 | 54 |
| suffixed/syllables:3 | 8480 | 8580 | 100 | 8701 | -121 |
| suffixed/syllables:4 | 5717 | 5690 | -27 | 5723 | -33 |
| suffixed/syllables:5 | 2381 | 2353 | -28 | 2357 | -4 |
| suffixed/syllables:6 | 688 | 716 | 28 | 647 | 69 |
| suffixed/syllables:7 | 166 | 170 | 4 | 173 | -3 |
| suffixed/syllables:8 | 29 | 31 | 2 | 24 | 7 |
| suffixed/syllables:9 | 11 | 11 | 0 | 7 | 4 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47535.000 | 47425.000 | -110.000 | 47557.000 | -132.000 |
| Mean letters | 7.379 | 7.395 | +0.016 | 7.389 | +0.006 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000631 | 0.000593 | -0.000038 | 0.000571 | 0.000022 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174332 | 0.174995 | 0.000662 | 0.174492 | 0.000502 |
| trigrams / missingReferenceMass | 0.050773 | 0.048787 | -0.001986 | 0.049091 | -0.000304 |
| trigrams / unseenGeneratedMass | 0.011503 | 0.011251 | -0.000252 | 0.011765 | -0.000513 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43578 (0.000%) | 0/43533 (0.000%) | 0.000 | -45 | 0.000 to 0.000 | 0/43601 (0.000%) | 0.000 | -68 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43578 (0.000%) | 0/43533 (0.000%) | 0.000 | -45 | 0.000 to 0.000 | 0/43601 (0.000%) | 0.000 | -68 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 283/50000 (0.566%) | 0/50000 (0.000%) | -0.566 | 0 | -0.680 to -0.430 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9493/23146 (41.014%) | 9459/23044 (41.048%) | +0.034 | -102 | -0.884 to +0.973 | 9362/23238 (40.287%) | +0.760 | -194 | -0.171 to +1.992 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6422 (0.000%) | 0/6467 (0.000%) | 0.000 | 45 | 0.000 to 0.000 | 0/6399 (0.000%) | 0.000 | 68 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1306/50000 (2.612%) | 1251/50000 (2.502%) | -0.110 | 0 | -0.220 to -0.030 | 1272/50000 (2.544%) | -0.042 | 0 | -0.210 to +0.110 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 90/6422 (1.401%) | 91/6467 (1.407%) | +0.006 | 45 | -0.291 to +0.395 | 83/6399 (1.297%) | +0.110 | 68 | -0.263 to +0.517 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6422 | 6467 | 45 | 6399 | 68 |
| bare/syllables:2 | 23146 | 23044 | -102 | 23238 | -194 |
| bare/syllables:3 | 13657 | 13709 | 52 | 13642 | 67 |
| bare/syllables:4 | 5009 | 5067 | 58 | 4973 | 94 |
| bare/syllables:5 | 1419 | 1401 | -18 | 1398 | 3 |
| bare/syllables:6 | 301 | 273 | -28 | 301 | -28 |
| bare/syllables:7 | 42 | 33 | -9 | 44 | -11 |
| bare/syllables:8 | 4 | 5 | 1 | 5 | 0 |
| bare/syllables:9 | 0 | 1 | 1 | 0 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 16785.000 | 16306.000 | -479.000 | 16353.000 | -47.000 |
| Mean letters | 5.446 | 5.495 | +0.048 | 5.499 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.095460 | 0.091099 | -0.004361 | 0.090698 | 0.000401 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.496566 | 0.505840 | 0.009274 | 0.505848 | -0.000009 |
| trigrams / missingReferenceMass | 0.345846 | 0.351115 | 0.005269 | 0.352990 | -0.001874 |
| trigrams / unseenGeneratedMass | 0.004515 | 0.004785 | 0.000270 | 0.004802 | -0.000017 |

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
| Words with adjacent identical coda segments / lower | 5358/50000 (10.716%) | 0/50000 (0.000%) | -10.716 | 0 | -11.200 to -10.380 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 288/50000 (0.576%) | 262/50000 (0.524%) | -0.052 | 0 | -0.290 to +0.040 | 240/50000 (0.480%) | +0.044 | 0 | -0.070 to +0.160 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 848/50000 (1.696%) | 856/50000 (1.712%) | +0.016 | 0 | -0.320 to +0.140 | 849/50000 (1.698%) | +0.014 | 0 | -0.140 to +0.160 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 39375.000 | 39499.000 | +124.000 | 39324.000 | +175.000 |
| Mean letters | 6.594 | 6.622 | +0.028 | 6.614 | +0.008 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006278 | 0.006527 | 0.000249 | 0.006608 | -0.000081 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155258 | 0.155793 | 0.000535 | 0.157029 | -0.001237 |
| trigrams / missingReferenceMass | 0.038369 | 0.040791 | 0.002423 | 0.038845 | 0.001947 |
| trigrams / unseenGeneratedMass | 0.007174 | 0.007512 | 0.000338 | 0.007364 | 0.000148 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29071 (0.000%) | 0/29198 (0.000%) | 0.000 | 127 | 0.000 to 0.000 | 0/28964 (0.000%) | 0.000 | 234 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29071 (0.000%) | 0/29198 (0.000%) | 0.000 | 127 | 0.000 to 0.000 | 0/28964 (0.000%) | 0.000 | 234 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22499 (0.000%) | 0/22609 (0.000%) | 0.000 | 110 | 0.000 to 0.000 | 0/22396 (0.000%) | 0.000 | 213 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22499/50000 (44.998%) | 22609/50000 (45.218%) | +0.220 | 0 | -0.560 to +0.640 | 22396/50000 (44.792%) | +0.426 | 0 | -0.020 to +0.840 |
| Words with adjacent identical coda segments / lower | 239/50000 (0.478%) | 8/50000 (0.016%) | -0.462 | 0 | -0.660 to -0.340 | 10/50000 (0.020%) | -0.004 | 0 | -0.020 to +0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 6180/15316 (40.350%) | 6305/15431 (40.859%) | +0.509 | 115 | -0.894 to +1.735 | 6226/15313 (40.658%) | +0.201 | 118 | -0.780 to +1.338 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20929 (0.000%) | 0/20802 (0.000%) | 0.000 | -127 | 0.000 to 0.000 | 0/21036 (0.000%) | 0.000 | -234 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 944/50000 (1.888%) | 899/50000 (1.798%) | -0.090 | 0 | -0.370 to +0.150 | 865/50000 (1.730%) | +0.068 | 0 | -0.070 to +0.290 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 277/20929 (1.324%) | 251/20802 (1.207%) | -0.117 | -127 | -0.246 to +0.033 | 247/21036 (1.174%) | +0.032 | -234 | -0.184 to +0.219 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17837 | 17657 | -180 | 17945 | -288 |
| bare/syllables:2 | 5479 | 5592 | 113 | 5535 | 57 |
| bare/syllables:3 | 2847 | 2786 | -61 | 2719 | 67 |
| bare/syllables:4 | 1095 | 1096 | 1 | 1127 | -31 |
| bare/syllables:5 | 218 | 228 | 10 | 241 | -13 |
| bare/syllables:6 | 25 | 32 | 7 | 37 | -5 |
| both/syllables:2 | 489 | 527 | 38 | 485 | 42 |
| both/syllables:3 | 1002 | 1047 | 45 | 1000 | 47 |
| both/syllables:4 | 600 | 619 | 19 | 618 | 1 |
| both/syllables:5 | 273 | 257 | -16 | 279 | -22 |
| both/syllables:6 | 84 | 92 | 8 | 96 | -4 |
| both/syllables:7 | 31 | 29 | -2 | 45 | -16 |
| both/syllables:8 | 4 | 5 | 1 | 4 | 1 |
| both/syllables:9 | 1 | 0 | -1 | 0 | 0 |
| prefixed/syllables:2 | 3022 | 3091 | 69 | 3112 | -21 |
| prefixed/syllables:3 | 1170 | 1206 | 36 | 1174 | 32 |
| prefixed/syllables:4 | 540 | 540 | 0 | 503 | 37 |
| prefixed/syllables:5 | 196 | 206 | 10 | 233 | -27 |
| prefixed/syllables:6 | 52 | 60 | 8 | 55 | 5 |
| prefixed/syllables:7 | 5 | 8 | 3 | 10 | -2 |
| suffixed/syllables:1 | 3092 | 3145 | 53 | 3091 | 54 |
| suffixed/syllables:2 | 6326 | 6221 | -105 | 6181 | 40 |
| suffixed/syllables:3 | 3448 | 3405 | -43 | 3406 | -1 |
| suffixed/syllables:4 | 1406 | 1449 | 43 | 1396 | 53 |
| suffixed/syllables:5 | 573 | 548 | -25 | 538 | 10 |
| suffixed/syllables:6 | 161 | 135 | -26 | 155 | -20 |
| suffixed/syllables:7 | 23 | 17 | -6 | 13 | 4 |
| suffixed/syllables:8 | 1 | 2 | 1 | 2 | 0 |
