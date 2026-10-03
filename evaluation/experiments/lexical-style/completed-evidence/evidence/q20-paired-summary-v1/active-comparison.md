# Quality comparison: q20-candidate-active

Original baseline: q11b-composed-control-active. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 4f03fd0c1294e70ef446e9fde3eeafe4e26916b3d0672e8ef5bda1c065f9bf66. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44411.000 | 44361.000 | -50.000 |
| Mean letters | 7.585 | 7.594 | +0.010 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006451 | 0.006410 | -0.000041 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.173942 | 0.173652 | -0.000289 |
| trigrams / missingReferenceMass | 0.035638 | 0.035019 | -0.000619 |
| trigrams / unseenGeneratedMass | 0.013046 | 0.013292 | 0.000246 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/45525 (0.000%) | 0/45626 (0.000%) | 0.000 | 101 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45525 (0.000%) | 0/45626 (0.000%) | 0.000 | 101 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3869/35039 (11.042%) | 3852/35072 (10.983%) | -0.059 | 33 | -1.094 to +0.722 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35039/50000 (70.078%) | 35072/50000 (70.144%) | +0.066 | 0 | -0.270 to +0.740 |
| Words with adjacent identical coda segments / lower | 1/50000 (0.002%) | 5/50000 (0.010%) | +0.008 | 0 | 0.000 to +0.020 |
| Disyllables with adjacent primary and secondary stress / lower | 8711/20899 (41.681%) | 8696/20748 (41.912%) | +0.231 | -151 | -1.099 to +1.727 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4475 (0.000%) | 0/4374 (0.000%) | 0.000 | -101 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 873/50000 (1.746%) | 862/50000 (1.724%) | -0.022 | 0 | -0.230 to +0.290 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 23/4475 (0.514%) | 24/4374 (0.549%) | +0.035 | -101 | -0.026 to +0.142 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1903 | 1893 | -10 |
| bare/syllables:2 | 6906 | 6876 | -30 |
| bare/syllables:3 | 4191 | 4139 | -52 |
| bare/syllables:4 | 1449 | 1518 | 69 |
| bare/syllables:5 | 413 | 398 | -15 |
| bare/syllables:6 | 87 | 94 | 7 |
| bare/syllables:7 | 9 | 10 | 1 |
| bare/syllables:8 | 3 | 0 | -3 |
| both/syllables:2 | 957 | 997 | 40 |
| both/syllables:3 | 1828 | 1780 | -48 |
| both/syllables:4 | 967 | 928 | -39 |
| both/syllables:5 | 203 | 171 | -32 |
| both/syllables:6 | 33 | 31 | -2 |
| both/syllables:7 | 1 | 4 | 3 |
| both/syllables:8 | 1 | 1 | 0 |
| prefixed/syllables:2 | 3305 | 3203 | -102 |
| prefixed/syllables:3 | 2622 | 2677 | 55 |
| prefixed/syllables:4 | 863 | 836 | -27 |
| prefixed/syllables:5 | 204 | 261 | 57 |
| prefixed/syllables:6 | 44 | 46 | 2 |
| prefixed/syllables:7 | 9 | 7 | -2 |
| prefixed/syllables:8 | 1 | 0 | -1 |
| suffixed/syllables:1 | 2572 | 2481 | -91 |
| suffixed/syllables:2 | 9731 | 9672 | -59 |
| suffixed/syllables:3 | 8089 | 8216 | 127 |
| suffixed/syllables:4 | 2746 | 2844 | 98 |
| suffixed/syllables:5 | 684 | 744 | 60 |
| suffixed/syllables:6 | 157 | 146 | -11 |
| suffixed/syllables:7 | 19 | 22 | 3 |
| suffixed/syllables:8 | 3 | 5 | 2 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47578.000 | 47567.000 | -11.000 |
| Mean letters | 7.520 | 7.540 | +0.020 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000290 | 0.000322 | 0.000032 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.200173 | 0.200751 | 0.000578 |
| trigrams / missingReferenceMass | 0.047806 | 0.047065 | -0.000740 |
| trigrams / unseenGeneratedMass | 0.015370 | 0.015639 | 0.000270 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43564 (0.000%) | 0/43644 (0.000%) | 0.000 | 80 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43564 (0.000%) | 0/43644 (0.000%) | 0.000 | 80 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9248/22930 (40.331%) | 9370/23079 (40.600%) | +0.268 | 149 | -1.312 to +1.312 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6436 (0.000%) | 0/6356 (0.000%) | 0.000 | -80 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1263/50000 (2.526%) | 1280/50000 (2.560%) | +0.034 | 0 | -0.160 to +0.160 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 30/6436 (0.466%) | 27/6356 (0.425%) | -0.041 | -80 | -0.298 to +0.132 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6436 | 6356 | -80 |
| bare/syllables:2 | 22930 | 23079 | 149 |
| bare/syllables:3 | 13894 | 13786 | -108 |
| bare/syllables:4 | 4993 | 5007 | 14 |
| bare/syllables:5 | 1417 | 1438 | 21 |
| bare/syllables:6 | 284 | 293 | 9 |
| bare/syllables:7 | 39 | 36 | -3 |
| bare/syllables:8 | 7 | 4 | -3 |
| bare/syllables:9 | 0 | 1 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 17458.000 | 17496.000 | +38.000 |
| Mean letters | 5.563 | 5.559 | -0.003 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.100264 | 0.100331 | 0.000067 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.521989 | 0.521011 | -0.000978 |
| trigrams / missingReferenceMass | 0.384256 | 0.384541 | 0.000285 |
| trigrams / unseenGeneratedMass | 0.016752 | 0.016835 | 0.000083 |

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
| Words ending in an open checked vowel / lower | 235/50000 (0.470%) | 275/50000 (0.550%) | +0.080 | 0 | +0.050 to +0.150 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 291/50000 (0.582%) | 307/50000 (0.614%) | +0.032 | 0 | -0.020 to +0.090 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 30257.000 | 30101.000 | -156.000 |
| Mean letters | 5.719 | 5.712 | -0.007 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.009781 | 0.009826 | 0.000045 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.199389 | 0.199743 | 0.000354 |
| trigrams / missingReferenceMass | 0.052830 | 0.050279 | -0.002552 |
| trigrams / unseenGeneratedMass | 0.012756 | 0.012479 | -0.000276 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/27305 (0.000%) | 0/27229 (0.000%) | 0.000 | -76 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27305 (0.000%) | 0/27229 (0.000%) | 0.000 | -76 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4457/22392 (19.904%) | 4467/22532 (19.825%) | -0.079 | 140 | -1.271 to +1.097 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22392/50000 (44.784%) | 22532/50000 (45.064%) | +0.280 | 0 | -0.130 to +0.870 |
| Words with adjacent identical coda segments / lower | 1/50000 (0.002%) | 0/50000 (0.000%) | -0.002 | 0 | -0.010 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7481/17046 (43.887%) | 7492/17110 (43.787%) | -0.100 | 64 | -2.069 to +1.912 |
| Monosyllables with schwa as their sole nucleus / lower | 0/22695 (0.000%) | 0/22771 (0.000%) | 0.000 | 76 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1133/50000 (2.266%) | 1075/50000 (2.150%) | -0.116 | 0 | -0.300 to +0.410 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 104/22695 (0.458%) | 122/22771 (0.536%) | +0.078 | 76 | -0.039 to +0.153 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17977 | 17908 | -69 |
| bare/syllables:2 | 5458 | 5398 | -60 |
| bare/syllables:3 | 2803 | 2750 | -53 |
| bare/syllables:4 | 1092 | 1142 | 50 |
| bare/syllables:5 | 250 | 242 | -8 |
| bare/syllables:6 | 28 | 28 | 0 |
| both/syllables:2 | 910 | 860 | -50 |
| both/syllables:3 | 1136 | 1068 | -68 |
| both/syllables:4 | 466 | 432 | -34 |
| both/syllables:5 | 56 | 42 | -14 |
| both/syllables:6 | 12 | 5 | -7 |
| both/syllables:7 | 0 | 1 | 1 |
| prefixed/syllables:2 | 4159 | 4230 | 71 |
| prefixed/syllables:3 | 586 | 606 | 20 |
| prefixed/syllables:4 | 196 | 192 | -4 |
| prefixed/syllables:5 | 58 | 57 | -1 |
| prefixed/syllables:6 | 10 | 13 | 3 |
| prefixed/syllables:7 | 2 | 4 | 2 |
| suffixed/syllables:1 | 4718 | 4863 | 145 |
| suffixed/syllables:2 | 6519 | 6622 | 103 |
| suffixed/syllables:3 | 2862 | 2820 | -42 |
| suffixed/syllables:4 | 524 | 520 | -4 |
| suffixed/syllables:5 | 154 | 171 | 17 |
| suffixed/syllables:6 | 20 | 22 | 2 |
| suffixed/syllables:7 | 4 | 3 | -1 |
| suffixed/syllables:8 | 0 | 1 | 1 |
