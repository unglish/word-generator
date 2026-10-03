# Quality comparison: q18-candidate-active

Original baseline: q11b-composed-control-active. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 4f03fd0c1294e70ef446e9fde3eeafe4e26916b3d0672e8ef5bda1c065f9bf66. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44411.000 | 43904.000 | -507.000 |
| Mean letters | 7.585 | 7.583 | -0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006451 | 0.007553 | 0.001102 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.173942 | 0.174705 | 0.000763 |
| trigrams / missingReferenceMass | 0.035638 | 0.036620 | 0.000983 |
| trigrams / unseenGeneratedMass | 0.013046 | 0.013338 | 0.000292 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/45525 (0.000%) | 0/45761 (0.000%) | 0.000 | 236 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45525 (0.000%) | 0/45761 (0.000%) | 0.000 | 236 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3869/35039 (11.042%) | 4531/35118 (12.902%) | +1.860 | 79 | +1.226 to +2.577 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35039/50000 (70.078%) | 35118/50000 (70.236%) | +0.158 | 0 | -1.030 to +0.930 |
| Words with adjacent identical coda segments / lower | 1/50000 (0.002%) | 2/50000 (0.004%) | +0.002 | 0 | 0.000 to +0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 8711/20899 (41.681%) | 8437/20327 (41.506%) | -0.175 | -572 | -0.991 to +1.337 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4475 (0.000%) | 0/4239 (0.000%) | 0.000 | -236 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 873/50000 (1.746%) | 1020/50000 (2.040%) | +0.294 | 0 | +0.140 to +0.450 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 23/4475 (0.514%) | 36/4239 (0.849%) | +0.335 | -236 | +0.024 to +0.619 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1903 | 1911 | 8 |
| bare/syllables:2 | 6906 | 6748 | -158 |
| bare/syllables:3 | 4191 | 4163 | -28 |
| bare/syllables:4 | 1449 | 1525 | 76 |
| bare/syllables:5 | 413 | 424 | 11 |
| bare/syllables:6 | 87 | 95 | 8 |
| bare/syllables:7 | 9 | 12 | 3 |
| bare/syllables:8 | 3 | 4 | 1 |
| both/syllables:2 | 957 | 965 | 8 |
| both/syllables:3 | 1828 | 1702 | -126 |
| both/syllables:4 | 967 | 1024 | 57 |
| both/syllables:5 | 203 | 206 | 3 |
| both/syllables:6 | 33 | 31 | -2 |
| both/syllables:7 | 1 | 7 | 6 |
| both/syllables:8 | 1 | 2 | 1 |
| prefixed/syllables:2 | 3305 | 3222 | -83 |
| prefixed/syllables:3 | 2622 | 2658 | 36 |
| prefixed/syllables:4 | 863 | 871 | 8 |
| prefixed/syllables:5 | 204 | 213 | 9 |
| prefixed/syllables:6 | 44 | 45 | 1 |
| prefixed/syllables:7 | 9 | 12 | 3 |
| prefixed/syllables:8 | 1 | 2 | 1 |
| suffixed/syllables:1 | 2572 | 2328 | -244 |
| suffixed/syllables:2 | 9731 | 9392 | -339 |
| suffixed/syllables:3 | 8089 | 8555 | 466 |
| suffixed/syllables:4 | 2746 | 2894 | 148 |
| suffixed/syllables:5 | 684 | 804 | 120 |
| suffixed/syllables:6 | 157 | 151 | -6 |
| suffixed/syllables:7 | 19 | 30 | 11 |
| suffixed/syllables:8 | 3 | 4 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47578.000 | 47578.000 | 0.000 |
| Mean letters | 7.520 | 7.520 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000290 | 0.000290 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.200173 | 0.200173 | 0.000000 |
| trigrams / missingReferenceMass | 0.047806 | 0.047806 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.015370 | 0.015370 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43564 (0.000%) | 0/43564 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43564 (0.000%) | 0/43564 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9248/22930 (40.331%) | 9248/22930 (40.331%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6436 (0.000%) | 0/6436 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1263/50000 (2.526%) | 1263/50000 (2.526%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 30/6436 (0.466%) | 30/6436 (0.466%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6436 | 6436 | 0 |
| bare/syllables:2 | 22930 | 22930 | 0 |
| bare/syllables:3 | 13894 | 13894 | 0 |
| bare/syllables:4 | 4993 | 4993 | 0 |
| bare/syllables:5 | 1417 | 1417 | 0 |
| bare/syllables:6 | 284 | 284 | 0 |
| bare/syllables:7 | 39 | 39 | 0 |
| bare/syllables:8 | 7 | 7 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 17458.000 | 17458.000 | 0.000 |
| Mean letters | 5.563 | 5.563 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.100264 | 0.100264 | 0.000000 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.521989 | 0.521989 | 0.000000 |
| trigrams / missingReferenceMass | 0.384256 | 0.384256 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.016752 | 0.016752 | 0.000000 |

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
| Words ending in an open checked vowel / lower | 235/50000 (0.470%) | 235/50000 (0.470%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 291/50000 (0.582%) | 291/50000 (0.582%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 30257.000 | 29959.000 | -298.000 |
| Mean letters | 5.719 | 5.744 | +0.025 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.009781 | 0.011900 | 0.002119 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.199389 | 0.200573 | 0.001184 |
| trigrams / missingReferenceMass | 0.052830 | 0.051731 | -0.001099 |
| trigrams / unseenGeneratedMass | 0.012756 | 0.012851 | 0.000095 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/27305 (0.000%) | 0/27778 (0.000%) | 0.000 | 473 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27305 (0.000%) | 0/27778 (0.000%) | 0.000 | 473 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4457/22392 (19.904%) | 5369/22482 (23.881%) | +3.977 | 90 | +2.798 to +4.395 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22392/50000 (44.784%) | 22482/50000 (44.964%) | +0.180 | 0 | -0.180 to +0.470 |
| Words with adjacent identical coda segments / lower | 1/50000 (0.002%) | 0/50000 (0.000%) | -0.002 | 0 | -0.010 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7481/17046 (43.887%) | 7257/16968 (42.769%) | -1.118 | -78 | -2.001 to -0.272 |
| Monosyllables with schwa as their sole nucleus / lower | 0/22695 (0.000%) | 0/22222 (0.000%) | 0.000 | -473 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1133/50000 (2.266%) | 1030/50000 (2.060%) | -0.206 | 0 | -0.350 to -0.040 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 104/22695 (0.458%) | 94/22222 (0.423%) | -0.035 | -473 | -0.106 to +0.008 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17977 | 17808 | -169 |
| bare/syllables:2 | 5458 | 5564 | 106 |
| bare/syllables:3 | 2803 | 2740 | -63 |
| bare/syllables:4 | 1092 | 1125 | 33 |
| bare/syllables:5 | 250 | 247 | -3 |
| bare/syllables:6 | 28 | 34 | 6 |
| both/syllables:2 | 910 | 844 | -66 |
| both/syllables:3 | 1136 | 1028 | -108 |
| both/syllables:4 | 466 | 518 | 52 |
| both/syllables:5 | 56 | 64 | 8 |
| both/syllables:6 | 12 | 9 | -3 |
| both/syllables:7 | 0 | 3 | 3 |
| prefixed/syllables:2 | 4159 | 3893 | -266 |
| prefixed/syllables:3 | 586 | 737 | 151 |
| prefixed/syllables:4 | 196 | 190 | -6 |
| prefixed/syllables:5 | 58 | 55 | -3 |
| prefixed/syllables:6 | 10 | 15 | 5 |
| prefixed/syllables:7 | 2 | 2 | 0 |
| suffixed/syllables:1 | 4718 | 4414 | -304 |
| suffixed/syllables:2 | 6519 | 6667 | 148 |
| suffixed/syllables:3 | 2862 | 3286 | 424 |
| suffixed/syllables:4 | 524 | 545 | 21 |
| suffixed/syllables:5 | 154 | 170 | 16 |
| suffixed/syllables:6 | 20 | 34 | 14 |
| suffixed/syllables:7 | 4 | 8 | 4 |
