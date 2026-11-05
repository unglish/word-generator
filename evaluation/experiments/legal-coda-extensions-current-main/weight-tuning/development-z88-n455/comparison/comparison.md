# Quality comparison: pr313-weight-z88

Original baseline: merge-base-43ef38ae029f. Cohort: development. Previous step: pr313-current-main.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-43ef38ae029f | 43ef38ae029f4359f323d1c19955b3d44a10a6f7 | clean | d16566c4e86e6e3f07e6582b3e49bfe52cacd1d4f7c6e1c5b84d685534c6d916 |
| previous | pr313-current-main | 43ef38ae029f4359f323d1c19955b3d44a10a6f7 | dirty (uncommitted generator changes) | 6421ca6a9b31e09a99ea866d1d00aff66143bf120d2aa5abcecd520c6506c86a |
| candidate | pr313-weight-z88 | f65dcf09291c4c8cabe6ee05ea1d2d086f6ae76b | dirty (uncommitted generator changes) | ff2905b84aacc4db4f29efa641456286ad06fd722351a9bfed6e954f22ffbc05 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 49458.000 | 49474.000 | +16.000 | 49526.000 | -52.000 |
| Mean letters | 9.190 | 9.218 | +0.028 | 9.211 | +0.007 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004311 | 0.004467 | 0.000156 | 0.004501 | -0.000034 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.144655 | 0.145963 | 0.001307 | 0.146161 | -0.000198 |
| trigrams / missingReferenceMass | 0.030088 | 0.029772 | -0.000317 | 0.029781 | -0.000009 |
| trigrams / unseenGeneratedMass | 0.009786 | 0.010263 | 0.000477 | 0.010021 | 0.000242 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47013 (0.000%) | 0/47040 (0.000%) | 0.000 | 27 | 0.000 to 0.000 | 0/47105 (0.000%) | 0.000 | -65 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47013 (0.000%) | 0/47040 (0.000%) | 0.000 | 27 | 0.000 to 0.000 | 0/47105 (0.000%) | 0.000 | -65 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/34947 (0.000%) | 0/34854 (0.000%) | 0.000 | -93 | 0.000 to 0.000 | 0/35064 (0.000%) | 0.000 | -210 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34947/50000 (69.894%) | 34854/50000 (69.708%) | -0.186 | 0 | -0.830 to +0.760 | 35064/50000 (70.128%) | -0.420 | 0 | -1.070 to +0.270 |
| Words with adjacent identical coda segments / lower | 267/50000 (0.534%) | 6/50000 (0.012%) | -0.522 | 0 | -0.620 to -0.450 | 5/50000 (0.010%) | +0.002 | 0 | -0.020 to +0.020 |
| Disyllables with adjacent primary and secondary stress / lower | 5384/13355 (40.314%) | 5403/13393 (40.342%) | +0.027 | 38 | -0.959 to +1.414 | 5279/13385 (39.440%) | +0.902 | 8 | +0.217 to +2.322 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2987 (0.000%) | 0/2960 (0.000%) | 0.000 | -27 | 0.000 to 0.000 | 0/2895 (0.000%) | 0.000 | 65 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 572/50000 (1.144%) | 575/50000 (1.150%) | +0.006 | 0 | -0.230 to +0.160 | 574/50000 (1.148%) | +0.002 | 0 | -0.270 to +0.280 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 31/2987 (1.038%) | 46/2960 (1.554%) | +0.516 | -27 | -0.476 to +0.973 | 36/2895 (1.244%) | +0.311 | 65 | -0.754 to +0.980 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 1942 | 1928 | -14 | 1899 | 29 |
| bare/syllables:2 | 6919 | 6932 | 13 | 6966 | -34 |
| bare/syllables:3 | 4187 | 4274 | 87 | 4091 | 183 |
| bare/syllables:4 | 1495 | 1505 | 10 | 1488 | 17 |
| bare/syllables:5 | 414 | 396 | -18 | 381 | 15 |
| bare/syllables:6 | 82 | 93 | 11 | 95 | -2 |
| bare/syllables:7 | 12 | 18 | 6 | 16 | 2 |
| bare/syllables:8 | 1 | 0 | -1 | 0 | 0 |
| bare/syllables:9 | 1 | 0 | -1 | 0 | 0 |
| both/syllables:10 | 0 | 2 | 2 | 1 | 1 |
| both/syllables:11 | 0 | 0 | 0 | 1 | -1 |
| both/syllables:2 | 167 | 153 | -14 | 167 | -14 |
| both/syllables:3 | 859 | 841 | -18 | 846 | -5 |
| both/syllables:4 | 1377 | 1376 | -1 | 1398 | -22 |
| both/syllables:5 | 964 | 969 | 5 | 1014 | -45 |
| both/syllables:6 | 474 | 472 | -2 | 467 | 5 |
| both/syllables:7 | 130 | 133 | 3 | 124 | 9 |
| both/syllables:8 | 22 | 26 | 4 | 26 | 0 |
| both/syllables:9 | 7 | 8 | 1 | 3 | 5 |
| prefixed/syllables:2 | 869 | 869 | 0 | 860 | 9 |
| prefixed/syllables:3 | 3102 | 2970 | -132 | 3117 | -147 |
| prefixed/syllables:4 | 1976 | 1936 | -40 | 1977 | -41 |
| prefixed/syllables:5 | 779 | 754 | -25 | 738 | 16 |
| prefixed/syllables:6 | 234 | 234 | 0 | 247 | -13 |
| prefixed/syllables:7 | 58 | 54 | -4 | 48 | 6 |
| prefixed/syllables:8 | 9 | 14 | 5 | 8 | 6 |
| prefixed/syllables:9 | 1 | 0 | -1 | 1 | -1 |
| suffixed/syllables:1 | 1045 | 1032 | -13 | 996 | 36 |
| suffixed/syllables:10 | 2 | 1 | -1 | 1 | 0 |
| suffixed/syllables:2 | 5400 | 5439 | 39 | 5392 | 47 |
| suffixed/syllables:3 | 8480 | 8585 | 105 | 8701 | -116 |
| suffixed/syllables:4 | 5717 | 5724 | 7 | 5723 | 1 |
| suffixed/syllables:5 | 2381 | 2327 | -54 | 2357 | -30 |
| suffixed/syllables:6 | 688 | 724 | 36 | 647 | 77 |
| suffixed/syllables:7 | 166 | 176 | 10 | 173 | 3 |
| suffixed/syllables:8 | 29 | 27 | -2 | 24 | 3 |
| suffixed/syllables:9 | 11 | 8 | -3 | 7 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47535.000 | 47491.000 | -44.000 | 47557.000 | -66.000 |
| Mean letters | 7.379 | 7.390 | +0.010 | 7.389 | +0.001 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000631 | 0.000622 | -0.000009 | 0.000571 | 0.000051 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174332 | 0.175046 | 0.000714 | 0.174492 | 0.000554 |
| trigrams / missingReferenceMass | 0.050773 | 0.047848 | -0.002925 | 0.049091 | -0.001243 |
| trigrams / unseenGeneratedMass | 0.011503 | 0.011388 | -0.000115 | 0.011765 | -0.000376 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43578 (0.000%) | 0/43599 (0.000%) | 0.000 | 21 | 0.000 to 0.000 | 0/43601 (0.000%) | 0.000 | -2 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43578 (0.000%) | 0/43599 (0.000%) | 0.000 | 21 | 0.000 to 0.000 | 0/43601 (0.000%) | 0.000 | -2 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 283/50000 (0.566%) | 0/50000 (0.000%) | -0.566 | 0 | -0.680 to -0.430 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9493/23146 (41.014%) | 9351/23163 (40.370%) | -0.643 | 17 | -1.879 to +0.124 | 9362/23238 (40.287%) | +0.083 | -75 | -1.167 to +1.632 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6422 (0.000%) | 0/6401 (0.000%) | 0.000 | -21 | 0.000 to 0.000 | 0/6399 (0.000%) | 0.000 | 2 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1306/50000 (2.612%) | 1245/50000 (2.490%) | -0.122 | 0 | -0.360 to +0.120 | 1272/50000 (2.544%) | -0.054 | 0 | -0.330 to +0.200 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 90/6422 (1.401%) | 94/6401 (1.469%) | +0.067 | -21 | -0.357 to +0.547 | 83/6399 (1.297%) | +0.171 | 2 | -0.225 to +0.581 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6422 | 6401 | -21 | 6399 | 2 |
| bare/syllables:2 | 23146 | 23163 | 17 | 23238 | -75 |
| bare/syllables:3 | 13657 | 13691 | 34 | 13642 | 49 |
| bare/syllables:4 | 5009 | 5016 | 7 | 4973 | 43 |
| bare/syllables:5 | 1419 | 1409 | -10 | 1398 | 11 |
| bare/syllables:6 | 301 | 277 | -24 | 301 | -24 |
| bare/syllables:7 | 42 | 38 | -4 | 44 | -6 |
| bare/syllables:8 | 4 | 4 | 0 | 5 | -1 |
| bare/syllables:9 | 0 | 1 | 1 | 0 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 16785.000 | 16278.000 | -507.000 | 16353.000 | -75.000 |
| Mean letters | 5.446 | 5.495 | +0.049 | 5.499 | -0.003 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.095460 | 0.091279 | -0.004181 | 0.090698 | 0.000581 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.496566 | 0.506810 | 0.010244 | 0.505848 | 0.000961 |
| trigrams / missingReferenceMass | 0.345846 | 0.352958 | 0.007112 | 0.352990 | -0.000032 |
| trigrams / unseenGeneratedMass | 0.004515 | 0.004783 | 0.000269 | 0.004802 | -0.000019 |

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
| Words ending in an open checked vowel / lower | 288/50000 (0.576%) | 254/50000 (0.508%) | -0.068 | 0 | -0.260 to +0.050 | 240/50000 (0.480%) | +0.028 | 0 | -0.070 to +0.130 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 848/50000 (1.696%) | 859/50000 (1.718%) | +0.022 | 0 | -0.300 to +0.170 | 849/50000 (1.698%) | +0.020 | 0 | -0.120 to +0.150 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 39375.000 | 39376.000 | +1.000 | 39324.000 | +52.000 |
| Mean letters | 6.594 | 6.611 | +0.016 | 6.614 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006278 | 0.006543 | 0.000266 | 0.006608 | -0.000065 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155258 | 0.156746 | 0.001488 | 0.157029 | -0.000283 |
| trigrams / missingReferenceMass | 0.038369 | 0.040187 | 0.001818 | 0.038845 | 0.001342 |
| trigrams / unseenGeneratedMass | 0.007174 | 0.007314 | 0.000140 | 0.007364 | -0.000050 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29071 (0.000%) | 0/29058 (0.000%) | 0.000 | -13 | 0.000 to 0.000 | 0/28964 (0.000%) | 0.000 | 94 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29071 (0.000%) | 0/29058 (0.000%) | 0.000 | -13 | 0.000 to 0.000 | 0/28964 (0.000%) | 0.000 | 94 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22499 (0.000%) | 0/22586 (0.000%) | 0.000 | 87 | 0.000 to 0.000 | 0/22396 (0.000%) | 0.000 | 190 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22499/50000 (44.998%) | 22586/50000 (45.172%) | +0.174 | 0 | -0.440 to +0.590 | 22396/50000 (44.792%) | +0.380 | 0 | +0.100 to +0.740 |
| Words with adjacent identical coda segments / lower | 239/50000 (0.478%) | 8/50000 (0.016%) | -0.462 | 0 | -0.660 to -0.340 | 10/50000 (0.020%) | -0.004 | 0 | -0.020 to +0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 6180/15316 (40.350%) | 6245/15367 (40.639%) | +0.289 | 51 | -0.321 to +1.370 | 6226/15313 (40.658%) | -0.019 | 54 | -0.458 to +0.474 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20929 (0.000%) | 0/20942 (0.000%) | 0.000 | 13 | 0.000 to 0.000 | 0/21036 (0.000%) | 0.000 | -94 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 944/50000 (1.888%) | 896/50000 (1.792%) | -0.096 | 0 | -0.390 to +0.120 | 865/50000 (1.730%) | +0.062 | 0 | -0.090 to +0.120 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 277/20929 (1.324%) | 254/20942 (1.213%) | -0.111 | 13 | -0.185 to -0.013 | 247/21036 (1.174%) | +0.039 | -94 | -0.123 to +0.165 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17837 | 17759 | -78 | 17945 | -186 |
| bare/syllables:2 | 5479 | 5555 | 76 | 5535 | 20 |
| bare/syllables:3 | 2847 | 2738 | -109 | 2719 | 19 |
| bare/syllables:4 | 1095 | 1105 | 10 | 1127 | -22 |
| bare/syllables:5 | 218 | 221 | 3 | 241 | -20 |
| bare/syllables:6 | 25 | 36 | 11 | 37 | -1 |
| both/syllables:2 | 489 | 525 | 36 | 485 | 40 |
| both/syllables:3 | 1002 | 1048 | 46 | 1000 | 48 |
| both/syllables:4 | 600 | 619 | 19 | 618 | 1 |
| both/syllables:5 | 273 | 266 | -7 | 279 | -13 |
| both/syllables:6 | 84 | 102 | 18 | 96 | 6 |
| both/syllables:7 | 31 | 30 | -1 | 45 | -15 |
| both/syllables:8 | 4 | 6 | 2 | 4 | 2 |
| both/syllables:9 | 1 | 0 | -1 | 0 | 0 |
| prefixed/syllables:2 | 3022 | 3058 | 36 | 3112 | -54 |
| prefixed/syllables:3 | 1170 | 1195 | 25 | 1174 | 21 |
| prefixed/syllables:4 | 540 | 523 | -17 | 503 | 20 |
| prefixed/syllables:5 | 196 | 189 | -7 | 233 | -44 |
| prefixed/syllables:6 | 52 | 55 | 3 | 55 | 0 |
| prefixed/syllables:7 | 5 | 9 | 4 | 10 | -1 |
| suffixed/syllables:1 | 3092 | 3183 | 91 | 3091 | 92 |
| suffixed/syllables:2 | 6326 | 6229 | -97 | 6181 | 48 |
| suffixed/syllables:3 | 3448 | 3378 | -70 | 3406 | -28 |
| suffixed/syllables:4 | 1406 | 1460 | 54 | 1396 | 64 |
| suffixed/syllables:5 | 573 | 544 | -29 | 538 | 6 |
| suffixed/syllables:6 | 161 | 145 | -16 | 155 | -10 |
| suffixed/syllables:7 | 23 | 20 | -3 | 13 | 7 |
| suffixed/syllables:8 | 1 | 2 | 1 | 2 | 0 |
