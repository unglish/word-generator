# Quality comparison: pr313-weight-z88-n460

Original baseline: merge-base-43ef38ae029f. Cohort: development. Previous step: pr313-current-main.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-43ef38ae029f | 43ef38ae029f4359f323d1c19955b3d44a10a6f7 | clean | d16566c4e86e6e3f07e6582b3e49bfe52cacd1d4f7c6e1c5b84d685534c6d916 |
| previous | pr313-current-main | 43ef38ae029f4359f323d1c19955b3d44a10a6f7 | dirty (uncommitted generator changes) | 6421ca6a9b31e09a99ea866d1d00aff66143bf120d2aa5abcecd520c6506c86a |
| candidate | pr313-weight-z88-n460 | f65dcf09291c4c8cabe6ee05ea1d2d086f6ae76b | dirty (uncommitted generator changes) | d51d3eaa5f9ef7283ba75494bd4dac2d37b59b5ff1daf349b14b5e20f2e82405 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 49458.000 | 49441.000 | -17.000 | 49526.000 | -85.000 |
| Mean letters | 9.190 | 9.199 | +0.009 | 9.211 | -0.011 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004311 | 0.004468 | 0.000157 | 0.004501 | -0.000032 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.144655 | 0.144541 | -0.000114 | 0.146161 | -0.001619 |
| trigrams / missingReferenceMass | 0.030088 | 0.030507 | 0.000419 | 0.029781 | 0.000726 |
| trigrams / unseenGeneratedMass | 0.009786 | 0.010173 | 0.000387 | 0.010021 | 0.000152 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47013 (0.000%) | 0/47000 (0.000%) | 0.000 | -13 | 0.000 to 0.000 | 0/47105 (0.000%) | 0.000 | -105 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47013 (0.000%) | 0/47000 (0.000%) | 0.000 | -13 | 0.000 to 0.000 | 0/47105 (0.000%) | 0.000 | -105 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/34947 (0.000%) | 0/34914 (0.000%) | 0.000 | -33 | 0.000 to 0.000 | 0/35064 (0.000%) | 0.000 | -150 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34947/50000 (69.894%) | 34914/50000 (69.828%) | -0.066 | 0 | -0.890 to +0.930 | 35064/50000 (70.128%) | -0.300 | 0 | -0.840 to +0.440 |
| Words with adjacent identical coda segments / lower | 267/50000 (0.534%) | 7/50000 (0.014%) | -0.520 | 0 | -0.610 to -0.450 | 5/50000 (0.010%) | +0.004 | 0 | -0.010 to +0.020 |
| Disyllables with adjacent primary and secondary stress / lower | 5384/13355 (40.314%) | 5339/13286 (40.185%) | -0.129 | -69 | -1.161 to +1.449 | 5279/13385 (39.440%) | +0.745 | -99 | -0.639 to +2.357 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2987 (0.000%) | 0/3000 (0.000%) | 0.000 | 13 | 0.000 to 0.000 | 0/2895 (0.000%) | 0.000 | 105 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 572/50000 (1.144%) | 549/50000 (1.098%) | -0.046 | 0 | -0.180 to +0.070 | 574/50000 (1.148%) | -0.050 | 0 | -0.220 to +0.190 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 31/2987 (1.038%) | 37/3000 (1.233%) | +0.196 | 13 | -0.151 to +0.571 | 36/2895 (1.244%) | -0.010 | 105 | -1.404 to +0.647 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 1942 | 1968 | 26 | 1899 | 69 |
| bare/syllables:2 | 6919 | 6874 | -45 | 6966 | -92 |
| bare/syllables:3 | 4187 | 4180 | -7 | 4091 | 89 |
| bare/syllables:4 | 1495 | 1556 | 61 | 1488 | 68 |
| bare/syllables:5 | 414 | 418 | 4 | 381 | 37 |
| bare/syllables:6 | 82 | 72 | -10 | 95 | -23 |
| bare/syllables:7 | 12 | 18 | 6 | 16 | 2 |
| bare/syllables:8 | 1 | 0 | -1 | 0 | 0 |
| bare/syllables:9 | 1 | 0 | -1 | 0 | 0 |
| both/syllables:10 | 0 | 2 | 2 | 1 | 1 |
| both/syllables:11 | 0 | 1 | 1 | 1 | 0 |
| both/syllables:2 | 167 | 160 | -7 | 167 | -7 |
| both/syllables:3 | 859 | 858 | -1 | 846 | 12 |
| both/syllables:4 | 1377 | 1439 | 62 | 1398 | 41 |
| both/syllables:5 | 964 | 985 | 21 | 1014 | -29 |
| both/syllables:6 | 474 | 401 | -73 | 467 | -66 |
| both/syllables:7 | 130 | 128 | -2 | 124 | 4 |
| both/syllables:8 | 22 | 30 | 8 | 26 | 4 |
| both/syllables:9 | 7 | 9 | 2 | 3 | 6 |
| prefixed/syllables:2 | 869 | 866 | -3 | 860 | 6 |
| prefixed/syllables:3 | 3102 | 3016 | -86 | 3117 | -101 |
| prefixed/syllables:4 | 1976 | 1947 | -29 | 1977 | -30 |
| prefixed/syllables:5 | 779 | 785 | 6 | 738 | 47 |
| prefixed/syllables:6 | 234 | 205 | -29 | 247 | -42 |
| prefixed/syllables:7 | 58 | 63 | 5 | 48 | 15 |
| prefixed/syllables:8 | 9 | 11 | 2 | 8 | 3 |
| prefixed/syllables:9 | 1 | 1 | 0 | 1 | 0 |
| suffixed/syllables:1 | 1045 | 1032 | -13 | 996 | 36 |
| suffixed/syllables:10 | 2 | 0 | -2 | 1 | -1 |
| suffixed/syllables:2 | 5400 | 5386 | -14 | 5392 | -6 |
| suffixed/syllables:3 | 8480 | 8667 | 187 | 8701 | -34 |
| suffixed/syllables:4 | 5717 | 5724 | 7 | 5723 | 1 |
| suffixed/syllables:5 | 2381 | 2294 | -87 | 2357 | -63 |
| suffixed/syllables:6 | 688 | 696 | 8 | 647 | 49 |
| suffixed/syllables:7 | 166 | 163 | -3 | 173 | -10 |
| suffixed/syllables:8 | 29 | 38 | 9 | 24 | 14 |
| suffixed/syllables:9 | 11 | 7 | -4 | 7 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47535.000 | 47532.000 | -3.000 | 47557.000 | -25.000 |
| Mean letters | 7.379 | 7.397 | +0.018 | 7.389 | +0.008 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000631 | 0.000616 | -0.000014 | 0.000571 | 0.000045 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174332 | 0.175441 | 0.001109 | 0.174492 | 0.000949 |
| trigrams / missingReferenceMass | 0.050773 | 0.050641 | -0.000132 | 0.049091 | 0.001550 |
| trigrams / unseenGeneratedMass | 0.011503 | 0.011961 | 0.000458 | 0.011765 | 0.000197 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43578 (0.000%) | 0/43497 (0.000%) | 0.000 | -81 | 0.000 to 0.000 | 0/43601 (0.000%) | 0.000 | -104 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43578 (0.000%) | 0/43497 (0.000%) | 0.000 | -81 | 0.000 to 0.000 | 0/43601 (0.000%) | 0.000 | -104 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 283/50000 (0.566%) | 0/50000 (0.000%) | -0.566 | 0 | -0.680 to -0.430 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9493/23146 (41.014%) | 9314/22950 (40.584%) | -0.430 | -196 | -2.136 to +0.802 | 9362/23238 (40.287%) | +0.296 | -288 | -1.423 to +1.792 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6422 (0.000%) | 0/6503 (0.000%) | 0.000 | 81 | 0.000 to 0.000 | 0/6399 (0.000%) | 0.000 | 104 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1306/50000 (2.612%) | 1222/50000 (2.444%) | -0.168 | 0 | -0.360 to -0.010 | 1272/50000 (2.544%) | -0.100 | 0 | -0.350 to +0.060 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 90/6422 (1.401%) | 92/6503 (1.415%) | +0.013 | 81 | -0.431 to +0.394 | 83/6399 (1.297%) | +0.118 | 104 | -0.298 to +0.366 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6422 | 6503 | 81 | 6399 | 104 |
| bare/syllables:2 | 23146 | 22950 | -196 | 23238 | -288 |
| bare/syllables:3 | 13657 | 13700 | 43 | 13642 | 58 |
| bare/syllables:4 | 5009 | 5036 | 27 | 4973 | 63 |
| bare/syllables:5 | 1419 | 1470 | 51 | 1398 | 72 |
| bare/syllables:6 | 301 | 302 | 1 | 301 | 1 |
| bare/syllables:7 | 42 | 35 | -7 | 44 | -9 |
| bare/syllables:8 | 4 | 3 | -1 | 5 | -2 |
| bare/syllables:9 | 0 | 1 | 1 | 0 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 16785.000 | 16303.000 | -482.000 | 16353.000 | -50.000 |
| Mean letters | 5.446 | 5.495 | +0.048 | 5.499 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.095460 | 0.090410 | -0.005050 | 0.090698 | -0.000288 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.496566 | 0.505632 | 0.009066 | 0.505848 | -0.000216 |
| trigrams / missingReferenceMass | 0.345846 | 0.349014 | 0.003168 | 0.352990 | -0.003976 |
| trigrams / unseenGeneratedMass | 0.004515 | 0.004584 | 0.000069 | 0.004802 | -0.000218 |

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
| Words ending in an open checked vowel / lower | 288/50000 (0.576%) | 272/50000 (0.544%) | -0.032 | 0 | -0.290 to +0.150 | 240/50000 (0.480%) | +0.064 | 0 | -0.070 to +0.170 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 848/50000 (1.696%) | 864/50000 (1.728%) | +0.032 | 0 | -0.210 to +0.190 | 849/50000 (1.698%) | +0.030 | 0 | -0.160 to +0.170 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 39375.000 | 39485.000 | +110.000 | 39324.000 | +161.000 |
| Mean letters | 6.594 | 6.624 | +0.030 | 6.614 | +0.010 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006278 | 0.006544 | 0.000266 | 0.006608 | -0.000064 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155258 | 0.156844 | 0.001585 | 0.157029 | -0.000186 |
| trigrams / missingReferenceMass | 0.038369 | 0.040502 | 0.002133 | 0.038845 | 0.001657 |
| trigrams / unseenGeneratedMass | 0.007174 | 0.007379 | 0.000205 | 0.007364 | 0.000015 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29071 (0.000%) | 0/29179 (0.000%) | 0.000 | 108 | 0.000 to 0.000 | 0/28964 (0.000%) | 0.000 | 215 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29071 (0.000%) | 0/29179 (0.000%) | 0.000 | 108 | 0.000 to 0.000 | 0/28964 (0.000%) | 0.000 | 215 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22499 (0.000%) | 0/22595 (0.000%) | 0.000 | 96 | 0.000 to 0.000 | 0/22396 (0.000%) | 0.000 | 199 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22499/50000 (44.998%) | 22595/50000 (45.190%) | +0.192 | 0 | -0.320 to +0.510 | 22396/50000 (44.792%) | +0.398 | 0 | +0.060 to +0.820 |
| Words with adjacent identical coda segments / lower | 239/50000 (0.478%) | 6/50000 (0.012%) | -0.466 | 0 | -0.660 to -0.360 | 10/50000 (0.020%) | -0.008 | 0 | -0.020 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6180/15316 (40.350%) | 6240/15444 (40.404%) | +0.054 | 128 | -1.713 to +1.489 | 6226/15313 (40.658%) | -0.254 | 131 | -0.918 to +0.366 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20929 (0.000%) | 0/20821 (0.000%) | 0.000 | -108 | 0.000 to 0.000 | 0/21036 (0.000%) | 0.000 | -215 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 944/50000 (1.888%) | 899/50000 (1.798%) | -0.090 | 0 | -0.360 to +0.200 | 865/50000 (1.730%) | +0.068 | 0 | -0.060 to +0.150 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 277/20929 (1.324%) | 285/20821 (1.369%) | +0.045 | -108 | -0.088 to +0.174 | 247/21036 (1.174%) | +0.195 | -215 | +0.068 to +0.358 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17837 | 17699 | -138 | 17945 | -246 |
| bare/syllables:2 | 5479 | 5592 | 113 | 5535 | 57 |
| bare/syllables:3 | 2847 | 2752 | -95 | 2719 | 33 |
| bare/syllables:4 | 1095 | 1104 | 9 | 1127 | -23 |
| bare/syllables:5 | 218 | 218 | 0 | 241 | -23 |
| bare/syllables:6 | 25 | 40 | 15 | 37 | 3 |
| both/syllables:2 | 489 | 488 | -1 | 485 | 3 |
| both/syllables:3 | 1002 | 1026 | 24 | 1000 | 26 |
| both/syllables:4 | 600 | 625 | 25 | 618 | 7 |
| both/syllables:5 | 273 | 263 | -10 | 279 | -16 |
| both/syllables:6 | 84 | 93 | 9 | 96 | -3 |
| both/syllables:7 | 31 | 40 | 9 | 45 | -5 |
| both/syllables:8 | 4 | 8 | 4 | 4 | 4 |
| both/syllables:9 | 1 | 0 | -1 | 0 | 0 |
| prefixed/syllables:2 | 3022 | 3084 | 62 | 3112 | -28 |
| prefixed/syllables:3 | 1170 | 1154 | -16 | 1174 | -20 |
| prefixed/syllables:4 | 540 | 548 | 8 | 503 | 45 |
| prefixed/syllables:5 | 196 | 205 | 9 | 233 | -28 |
| prefixed/syllables:6 | 52 | 52 | 0 | 55 | -3 |
| prefixed/syllables:7 | 5 | 12 | 7 | 10 | 2 |
| suffixed/syllables:1 | 3092 | 3122 | 30 | 3091 | 31 |
| suffixed/syllables:2 | 6326 | 6280 | -46 | 6181 | 99 |
| suffixed/syllables:3 | 3448 | 3417 | -31 | 3406 | 11 |
| suffixed/syllables:4 | 1406 | 1458 | 52 | 1396 | 62 |
| suffixed/syllables:5 | 573 | 557 | -16 | 538 | 19 |
| suffixed/syllables:6 | 161 | 140 | -21 | 155 | -15 |
| suffixed/syllables:7 | 23 | 19 | -4 | 13 | 6 |
| suffixed/syllables:8 | 1 | 4 | 3 | 2 | 2 |
