# Quality comparison: q10b2-configured-final-vowel-contract-default

Original baseline: q10b2-fixed-control-default. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 4f03fd0c1294e70ef446e9fde3eeafe4e26916b3d0672e8ef5bda1c065f9bf66. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44317.000 | 44144.000 | -173.000 |
| Mean letters | 7.506 | 7.504 | -0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006216 | 0.006384 | 0.000167 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155710 | 0.156305 | 0.000595 |
| trigrams / missingReferenceMass | 0.034548 | 0.034596 | 0.000049 |
| trigrams / unseenGeneratedMass | 0.010295 | 0.010578 | 0.000283 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/45559 (0.000%) | 0/45511 (0.000%) | 0.000 | -48 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45559 (0.000%) | 0/45511 (0.000%) | 0.000 | -48 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3875/35088 (11.044%) | 3771/34916 (10.800%) | -0.243 | -172 | -0.869 to +0.680 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35088/50000 (70.176%) | 34916/50000 (69.832%) | -0.344 | 0 | -1.110 to +0.270 |
| Words with adjacent identical coda segments / lower | 130/50000 (0.260%) | 133/50000 (0.266%) | +0.006 | 0 | -0.070 to +0.110 |
| Disyllables with adjacent primary and secondary stress / lower | 8686/20787 (41.786%) | 8947/20938 (42.731%) | +0.945 | 151 | -0.149 to +1.730 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4441 (0.000%) | 0/4489 (0.000%) | 0.000 | 48 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 890/50000 (1.780%) | 0/50000 (0.000%) | -1.780 | 0 | -1.810 to -1.730 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 18/4441 (0.405%) | 22/4489 (0.490%) | +0.085 | 48 | -0.118 to +0.441 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1876 | 1910 | 34 |
| bare/syllables:2 | 6836 | 6992 | 156 |
| bare/syllables:3 | 4156 | 4149 | -7 |
| bare/syllables:4 | 1510 | 1513 | 3 |
| bare/syllables:5 | 412 | 411 | -1 |
| bare/syllables:6 | 104 | 98 | -6 |
| bare/syllables:7 | 17 | 9 | -8 |
| bare/syllables:8 | 1 | 2 | 1 |
| both/syllables:2 | 1003 | 1101 | 98 |
| both/syllables:3 | 1801 | 1865 | 64 |
| both/syllables:4 | 963 | 922 | -41 |
| both/syllables:5 | 187 | 181 | -6 |
| both/syllables:6 | 27 | 35 | 8 |
| both/syllables:7 | 10 | 4 | -6 |
| both/syllables:8 | 0 | 1 | 1 |
| prefixed/syllables:2 | 3134 | 3248 | 114 |
| prefixed/syllables:3 | 2662 | 2652 | -10 |
| prefixed/syllables:4 | 901 | 819 | -82 |
| prefixed/syllables:5 | 222 | 206 | -16 |
| prefixed/syllables:6 | 46 | 57 | 11 |
| prefixed/syllables:7 | 13 | 12 | -1 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 2565 | 2579 | 14 |
| suffixed/syllables:2 | 9814 | 9597 | -217 |
| suffixed/syllables:3 | 8115 | 8048 | -67 |
| suffixed/syllables:4 | 2721 | 2710 | -11 |
| suffixed/syllables:5 | 735 | 691 | -44 |
| suffixed/syllables:6 | 135 | 143 | 8 |
| suffixed/syllables:7 | 27 | 41 | 14 |
| suffixed/syllables:8 | 6 | 2 | -4 |
| suffixed/syllables:9 | 0 | 1 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47602.000 | 47398.000 | -204.000 |
| Mean letters | 7.416 | 7.416 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000330 | 0.000510 | 0.000179 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.177479 | 0.178296 | 0.000816 |
| trigrams / missingReferenceMass | 0.051447 | 0.045019 | -0.006428 |
| trigrams / unseenGeneratedMass | 0.012371 | 0.012198 | -0.000174 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43646 (0.000%) | 0/43460 (0.000%) | 0.000 | -186 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43646 (0.000%) | 0/43460 (0.000%) | 0.000 | -186 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 235/50000 (0.470%) | 216/50000 (0.432%) | -0.038 | 0 | -0.120 to +0.060 |
| Disyllables with adjacent primary and secondary stress / lower | 9380/23041 (40.710%) | 9276/22916 (40.478%) | -0.232 | -125 | -1.237 to +0.547 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6354 (0.000%) | 0/6540 (0.000%) | 0.000 | 186 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1340/50000 (2.680%) | 0/50000 (0.000%) | -2.680 | 0 | -3.120 to -2.370 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 36/6354 (0.567%) | 29/6540 (0.443%) | -0.123 | 186 | -0.530 to +0.062 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6354 | 6540 | 186 |
| bare/syllables:2 | 23041 | 22916 | -125 |
| bare/syllables:3 | 13817 | 13753 | -64 |
| bare/syllables:4 | 5061 | 5065 | 4 |
| bare/syllables:5 | 1391 | 1431 | 40 |
| bare/syllables:6 | 283 | 248 | -35 |
| bare/syllables:7 | 46 | 41 | -5 |
| bare/syllables:8 | 7 | 6 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 18312.000 | 18121.000 | -191.000 |
| Mean letters | 5.555 | 5.559 | +0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.096603 | 0.095536 | -0.001067 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.511065 | 0.512220 | 0.001154 |
| trigrams / missingReferenceMass | 0.346947 | 0.348891 | 0.001944 |
| trigrams / unseenGeneratedMass | 0.019442 | 0.019723 | 0.000281 |

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
| Words with adjacent identical coda segments / lower | 4981/50000 (9.962%) | 5008/50000 (10.016%) | +0.054 | 0 | -0.210 to +0.310 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 300/50000 (0.600%) | 0/50000 (0.000%) | -0.600 | 0 | -0.640 to -0.540 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 320/50000 (0.640%) | 316/50000 (0.632%) | -0.008 | 0 | -0.080 to +0.050 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 29811.000 | 29608.000 | -203.000 |
| Mean letters | 5.658 | 5.673 | +0.015 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.009863 | 0.010000 | 0.000136 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.178824 | 0.182260 | 0.003435 |
| trigrams / missingReferenceMass | 0.045266 | 0.046758 | 0.001492 |
| trigrams / unseenGeneratedMass | 0.009989 | 0.010635 | 0.000646 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/27311 (0.000%) | 0/27185 (0.000%) | 0.000 | -126 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27311 (0.000%) | 0/27185 (0.000%) | 0.000 | -126 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4552/22323 (20.392%) | 4367/22391 (19.503%) | -0.888 | 68 | -1.379 to -0.337 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22323/50000 (44.646%) | 22391/50000 (44.782%) | +0.136 | 0 | -0.160 to +0.850 |
| Words with adjacent identical coda segments / lower | 168/50000 (0.336%) | 186/50000 (0.372%) | +0.036 | 0 | -0.050 to +0.140 |
| Disyllables with adjacent primary and secondary stress / lower | 7477/17084 (43.766%) | 7437/17094 (43.506%) | -0.260 | 10 | -1.496 to +0.769 |
| Monosyllables with schwa as their sole nucleus / lower | 0/22689 (0.000%) | 0/22815 (0.000%) | 0.000 | 126 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1121/50000 (2.242%) | 0/50000 (0.000%) | -2.242 | 0 | -2.500 to -2.070 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 111/22689 (0.489%) | 119/22815 (0.522%) | +0.032 | 126 | -0.197 to +0.323 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 18067 | 18050 | -17 |
| bare/syllables:2 | 5359 | 5385 | 26 |
| bare/syllables:3 | 2840 | 2756 | -84 |
| bare/syllables:4 | 1150 | 1129 | -21 |
| bare/syllables:5 | 232 | 256 | 24 |
| bare/syllables:6 | 29 | 33 | 4 |
| both/syllables:2 | 930 | 962 | 32 |
| both/syllables:3 | 1065 | 1061 | -4 |
| both/syllables:4 | 444 | 436 | -8 |
| both/syllables:5 | 58 | 38 | -20 |
| both/syllables:6 | 10 | 3 | -7 |
| both/syllables:7 | 2 | 1 | -1 |
| both/syllables:8 | 0 | 1 | 1 |
| prefixed/syllables:2 | 4180 | 4070 | -110 |
| prefixed/syllables:3 | 580 | 588 | 8 |
| prefixed/syllables:4 | 218 | 193 | -25 |
| prefixed/syllables:5 | 51 | 58 | 7 |
| prefixed/syllables:6 | 8 | 7 | -1 |
| suffixed/syllables:1 | 4622 | 4765 | 143 |
| suffixed/syllables:2 | 6615 | 6677 | 62 |
| suffixed/syllables:3 | 2818 | 2837 | 19 |
| suffixed/syllables:4 | 528 | 493 | -35 |
| suffixed/syllables:5 | 159 | 170 | 11 |
| suffixed/syllables:6 | 33 | 29 | -4 |
| suffixed/syllables:7 | 2 | 1 | -1 |
| suffixed/syllables:8 | 0 | 1 | 1 |
