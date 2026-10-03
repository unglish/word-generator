# Quality comparison: q20-candidate-default

Original baseline: q11b-composed-control-default. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 4f03fd0c1294e70ef446e9fde3eeafe4e26916b3d0672e8ef5bda1c065f9bf66. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44348.000 | 44285.000 | -63.000 |
| Mean letters | 7.495 | 7.506 | +0.011 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006110 | 0.006177 | 0.000066 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155365 | 0.155658 | 0.000294 |
| trigrams / missingReferenceMass | 0.035204 | 0.034220 | -0.000984 |
| trigrams / unseenGeneratedMass | 0.010565 | 0.010592 | 0.000027 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/45524 (0.000%) | 0/45599 (0.000%) | 0.000 | 75 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45524 (0.000%) | 0/45599 (0.000%) | 0.000 | 75 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3773/34941 (10.798%) | 3864/35059 (11.021%) | +0.223 | 118 | -0.216 to +0.858 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34941/50000 (69.882%) | 35059/50000 (70.118%) | +0.236 | 0 | -0.730 to +1.260 |
| Words with adjacent identical coda segments / lower | 1/50000 (0.002%) | 2/50000 (0.004%) | +0.002 | 0 | 0.000 to +0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 8768/20731 (42.294%) | 8835/20972 (42.128%) | -0.167 | 241 | -1.051 to +1.291 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4476 (0.000%) | 0/4401 (0.000%) | 0.000 | -75 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 912/50000 (1.824%) | 866/50000 (1.732%) | -0.092 | 0 | -0.160 to +0.040 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 21/4476 (0.469%) | 31/4401 (0.704%) | +0.235 | -75 | -0.456 to +0.791 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1946 | 1906 | -40 |
| bare/syllables:2 | 6922 | 6938 | 16 |
| bare/syllables:3 | 4207 | 4094 | -113 |
| bare/syllables:4 | 1488 | 1472 | -16 |
| bare/syllables:5 | 380 | 422 | 42 |
| bare/syllables:6 | 102 | 91 | -11 |
| bare/syllables:7 | 12 | 17 | 5 |
| bare/syllables:8 | 2 | 1 | -1 |
| both/syllables:2 | 1040 | 1032 | -8 |
| both/syllables:3 | 1782 | 1879 | 97 |
| both/syllables:4 | 978 | 945 | -33 |
| both/syllables:5 | 170 | 191 | 21 |
| both/syllables:6 | 30 | 32 | 2 |
| both/syllables:7 | 4 | 4 | 0 |
| prefixed/syllables:2 | 3186 | 3304 | 118 |
| prefixed/syllables:3 | 2739 | 2573 | -166 |
| prefixed/syllables:4 | 838 | 906 | 68 |
| prefixed/syllables:5 | 227 | 213 | -14 |
| prefixed/syllables:6 | 50 | 50 | 0 |
| prefixed/syllables:7 | 8 | 5 | -3 |
| prefixed/syllables:8 | 3 | 4 | 1 |
| suffixed/syllables:1 | 2530 | 2495 | -35 |
| suffixed/syllables:2 | 9583 | 9698 | 115 |
| suffixed/syllables:3 | 8128 | 8048 | -80 |
| suffixed/syllables:4 | 2702 | 2730 | 28 |
| suffixed/syllables:5 | 780 | 733 | -47 |
| suffixed/syllables:6 | 133 | 172 | 39 |
| suffixed/syllables:7 | 28 | 41 | 13 |
| suffixed/syllables:8 | 2 | 4 | 2 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47563.000 | 47493.000 | -70.000 |
| Mean letters | 7.417 | 7.417 | +0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000327 | 0.000345 | 0.000019 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.176779 | 0.177957 | 0.001178 |
| trigrams / missingReferenceMass | 0.050926 | 0.049304 | -0.001622 |
| trigrams / unseenGeneratedMass | 0.011705 | 0.011992 | 0.000287 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43642 (0.000%) | 0/43445 (0.000%) | 0.000 | -197 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43642 (0.000%) | 0/43445 (0.000%) | 0.000 | -197 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9544/23153 (41.221%) | 9214/22819 (40.379%) | -0.843 | -334 | -1.556 to -0.064 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6358 (0.000%) | 0/6555 (0.000%) | 0.000 | 197 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1301/50000 (2.602%) | 1336/50000 (2.672%) | +0.070 | 0 | -0.280 to +0.250 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 36/6358 (0.566%) | 44/6555 (0.671%) | +0.105 | 197 | -0.100 to +0.283 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6358 | 6555 | 197 |
| bare/syllables:2 | 23153 | 22819 | -334 |
| bare/syllables:3 | 13852 | 13826 | -26 |
| bare/syllables:4 | 4947 | 5070 | 123 |
| bare/syllables:5 | 1366 | 1402 | 36 |
| bare/syllables:6 | 288 | 284 | -4 |
| bare/syllables:7 | 32 | 39 | 7 |
| bare/syllables:8 | 3 | 5 | 2 |
| bare/syllables:9 | 1 | 0 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16433.000 | 16364.000 | -69.000 |
| Mean letters | 5.510 | 5.508 | -0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.099007 | 0.099329 | 0.000322 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.510308 | 0.510544 | 0.000236 |
| trigrams / missingReferenceMass | 0.354634 | 0.356872 | 0.002238 |
| trigrams / unseenGeneratedMass | 0.012497 | 0.012607 | 0.000110 |

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
| Words ending in an open checked vowel / lower | 269/50000 (0.538%) | 251/50000 (0.502%) | -0.036 | 0 | -0.170 to +0.050 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 308/50000 (0.616%) | 308/50000 (0.616%) | 0.000 | 0 | -0.050 to +0.090 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 30075.000 | 29988.000 | -87.000 |
| Mean letters | 5.667 | 5.661 | -0.006 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.009757 | 0.010093 | 0.000336 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.179776 | 0.182246 | 0.002470 |
| trigrams / missingReferenceMass | 0.046093 | 0.047456 | 0.001362 |
| trigrams / unseenGeneratedMass | 0.010427 | 0.010221 | -0.000206 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/27365 (0.000%) | 0/27137 (0.000%) | 0.000 | -228 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27365 (0.000%) | 0/27137 (0.000%) | 0.000 | -228 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4503/22402 (20.101%) | 4452/22413 (19.863%) | -0.237 | 11 | -1.537 to +0.680 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22402/50000 (44.804%) | 22413/50000 (44.826%) | +0.022 | 0 | -0.840 to +0.960 |
| Words with adjacent identical coda segments / lower | 1/50000 (0.002%) | 0/50000 (0.000%) | -0.002 | 0 | -0.010 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7564/17204 (43.967%) | 7458/17048 (43.747%) | -0.219 | -156 | -0.923 to +0.624 |
| Monosyllables with schwa as their sole nucleus / lower | 0/22635 (0.000%) | 0/22863 (0.000%) | 0.000 | 228 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1152/50000 (2.304%) | 1101/50000 (2.202%) | -0.102 | 0 | -0.340 to -0.020 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 109/22635 (0.482%) | 115/22863 (0.503%) | +0.021 | 228 | -0.118 to +0.194 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17947 | 18084 | 137 |
| bare/syllables:2 | 5518 | 5430 | -88 |
| bare/syllables:3 | 2729 | 2690 | -39 |
| bare/syllables:4 | 1136 | 1091 | -45 |
| bare/syllables:5 | 233 | 259 | 26 |
| bare/syllables:6 | 35 | 33 | -2 |
| both/syllables:2 | 919 | 938 | 19 |
| both/syllables:3 | 1069 | 1088 | 19 |
| both/syllables:4 | 425 | 454 | 29 |
| both/syllables:5 | 46 | 55 | 9 |
| both/syllables:6 | 8 | 4 | -4 |
| both/syllables:7 | 2 | 0 | -2 |
| prefixed/syllables:2 | 4186 | 4088 | -98 |
| prefixed/syllables:3 | 622 | 594 | -28 |
| prefixed/syllables:4 | 200 | 213 | 13 |
| prefixed/syllables:5 | 56 | 67 | 11 |
| prefixed/syllables:6 | 9 | 12 | 3 |
| prefixed/syllables:7 | 1 | 1 | 0 |
| suffixed/syllables:1 | 4688 | 4779 | 91 |
| suffixed/syllables:2 | 6581 | 6592 | 11 |
| suffixed/syllables:3 | 2850 | 2804 | -46 |
| suffixed/syllables:4 | 534 | 532 | -2 |
| suffixed/syllables:5 | 165 | 156 | -9 |
| suffixed/syllables:6 | 34 | 28 | -6 |
| suffixed/syllables:7 | 7 | 6 | -1 |
| suffixed/syllables:8 | 0 | 2 | 2 |
