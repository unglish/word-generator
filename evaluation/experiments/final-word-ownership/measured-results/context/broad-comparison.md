The original baseline is contextual: its pipeline and spelling policies differ. Immediate control versus candidate isolates Q02 operational provenance; all common summary fields are equal.

# Quality comparison: q02-final-word-provenance

Original baseline: q14b-original-recovered-rescore-v1. Cohort: development. Previous step: q02-spelling-stress-control.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 4f03fd0c1294e70ef446e9fde3eeafe4e26916b3d0672e8ef5bda1c065f9bf66. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 44282.000 | +781.000 | 44282.000 | 0.000 |
| Mean letters | 7.462 | 7.577 | +0.115 | 7.577 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.006249 | -0.001158 | 0.006249 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.172695 | 0.014103 | 0.172695 | 0.000000 |
| trigrams / missingReferenceMass | 0.034830 | 0.038159 | 0.003330 | 0.038159 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.013438 | 0.002441 | 0.013438 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 0/45544 (0.000%) | -20.545 | 74 | -20.824 to -20.262 | 0/45544 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45544 (0.000%) | 0.000 | 74 | 0.000 to 0.000 | 0/45544 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 0/50000 (0.000%) | -2.016 | 0 | -2.190 to -1.840 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 0/50000 (0.000%) | -0.278 | 0 | -0.370 to -0.170 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3944/35084 (11.242%) | +0.192 | 132 | -0.369 to +0.597 | 3944/35084 (11.242%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 0/50000 (0.000%) | -3.912 | 0 | -4.250 to -3.710 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35084/50000 (70.168%) | +0.264 | 0 | -0.460 to +0.910 | 35084/50000 (70.168%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 147/50000 (0.294%) | -0.066 | 0 | -0.110 to -0.010 | 147/50000 (0.294%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 8698/20837 (41.743%) | +20.537 | -228 | +19.253 to +21.649 | 8698/20837 (41.743%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 0/4456 (0.000%) | -19.845 | -74 | -22.172 to -17.492 | 0/4456 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 882/50000 (1.764%) | +0.272 | 0 | +0.180 to +0.370 | 882/50000 (1.764%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 23/4456 (0.516%) | +0.516 | -74 | +0.344 to +0.731 | 23/4456 (0.516%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1912 | -101 | 1912 | 0 |
| bare/syllables:2 | 6997 | 6864 | -133 | 6864 | 0 |
| bare/syllables:3 | 4100 | 4158 | 58 | 4158 | 0 |
| bare/syllables:4 | 1444 | 1495 | 51 | 1495 | 0 |
| bare/syllables:5 | 387 | 388 | 1 | 388 | 0 |
| bare/syllables:6 | 92 | 84 | -8 | 84 | 0 |
| bare/syllables:7 | 14 | 15 | 1 | 15 | 0 |
| bare/syllables:8 | 1 | 0 | -1 | 0 | 0 |
| both/syllables:2 | 1044 | 1003 | -41 | 1003 | 0 |
| both/syllables:3 | 1800 | 1835 | 35 | 1835 | 0 |
| both/syllables:4 | 929 | 939 | 10 | 939 | 0 |
| both/syllables:5 | 182 | 203 | 21 | 203 | 0 |
| both/syllables:6 | 20 | 31 | 11 | 31 | 0 |
| both/syllables:7 | 6 | 5 | -1 | 5 | 0 |
| both/syllables:8 | 0 | 1 | 1 | 1 | 0 |
| prefixed/syllables:2 | 3302 | 3261 | -41 | 3261 | 0 |
| prefixed/syllables:3 | 2560 | 2658 | 98 | 2658 | 0 |
| prefixed/syllables:4 | 895 | 865 | -30 | 865 | 0 |
| prefixed/syllables:5 | 229 | 223 | -6 | 223 | 0 |
| prefixed/syllables:6 | 50 | 37 | -13 | 37 | 0 |
| prefixed/syllables:7 | 5 | 13 | 8 | 13 | 0 |
| prefixed/syllables:8 | 1 | 3 | 2 | 3 | 0 |
| suffixed/syllables:1 | 2517 | 2544 | 27 | 2544 | 0 |
| suffixed/syllables:2 | 9722 | 9709 | -13 | 9709 | 0 |
| suffixed/syllables:3 | 8058 | 8057 | -1 | 8057 | 0 |
| suffixed/syllables:4 | 2733 | 2772 | 39 | 2772 | 0 |
| suffixed/syllables:5 | 711 | 712 | 1 | 712 | 0 |
| suffixed/syllables:6 | 152 | 168 | 16 | 168 | 0 |
| suffixed/syllables:7 | 26 | 35 | 9 | 35 | 0 |
| suffixed/syllables:8 | 10 | 10 | 0 | 10 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47561.000 | +435.000 | 47561.000 | 0.000 |
| Mean letters | 7.418 | 7.498 | +0.080 | 7.498 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000334 | 0.000166 | 0.000334 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.200452 | 0.016597 | 0.200452 | 0.000000 |
| trigrams / missingReferenceMass | 0.049072 | 0.047749 | -0.001323 | 0.047749 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.015299 | 0.002867 | 0.015299 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43413 (0.000%) | 0.000 | -164 | 0.000 to 0.000 | 0/43413 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43413 (0.000%) | 0.000 | -164 | 0.000 to 0.000 | 0/43413 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 0/50000 (0.000%) | -6.032 | 0 | -6.270 to -5.680 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 228/50000 (0.456%) | -0.088 | 0 | -0.170 to -0.050 | 228/50000 (0.456%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9359/23092 (40.529%) | -0.136 | 173 | -2.494 to +1.448 | 9359/23092 (40.529%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 0/6587 (0.000%) | -20.582 | 164 | -21.626 to -19.505 | 0/6587 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1347/50000 (2.694%) | -0.088 | 0 | -0.360 to +0.090 | 1347/50000 (2.694%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 27/6587 (0.410%) | +0.410 | 164 | +0.301 to +0.674 | 27/6587 (0.410%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6587 | 164 | 6587 | 0 |
| bare/syllables:2 | 22919 | 23092 | 173 | 23092 | 0 |
| bare/syllables:3 | 13869 | 13640 | -229 | 13640 | 0 |
| bare/syllables:4 | 5007 | 4869 | -138 | 4869 | 0 |
| bare/syllables:5 | 1427 | 1483 | 56 | 1483 | 0 |
| bare/syllables:6 | 308 | 285 | -23 | 285 | 0 |
| bare/syllables:7 | 43 | 40 | -3 | 40 | 0 |
| bare/syllables:8 | 3 | 4 | 1 | 4 | 0 |
| bare/syllables:9 | 1 | 0 | -1 | 0 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 19396.000 | +4999.000 | 19396.000 | 0.000 |
| Mean letters | 5.417 | 5.613 | +0.196 | 5.613 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.096902 | 0.004745 | 0.096902 | 0.000000 |
| phonemes / missingReferenceMass | 0.003390 | 0.000640 | -0.002750 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.522393 | -0.003525 | 0.522393 | 0.000000 |
| trigrams / missingReferenceMass | 0.374662 | 0.380773 | 0.006112 | 0.380773 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.023446 | 0.021181 | 0.023446 | 0.000000 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5007/50000 (10.014%) | -0.844 | 0 | -1.730 to -0.360 | 5007/50000 (10.014%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 0/50000 (0.000%) | -21.524 | 0 | -22.090 to -20.730 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 240/50000 (0.480%) | +0.044 | 0 | -0.070 to +0.190 | 240/50000 (0.480%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 297/50000 (0.594%) | +0.594 | 0 | +0.480 to +0.720 | 297/50000 (0.594%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 30193.000 | +1750.000 | 30193.000 | 0.000 |
| Mean letters | 5.613 | 5.716 | +0.103 | 5.716 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.009809 | -0.001293 | 0.009809 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.199357 | 0.014877 | 0.199357 | 0.000000 |
| trigrams / missingReferenceMass | 0.051142 | 0.051020 | -0.000121 | 0.051020 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.013066 | 0.003629 | 0.013066 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 0/27326 (0.000%) | -36.508 | 80 | -36.917 to -36.068 | 0/27326 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27326 (0.000%) | 0.000 | 80 | 0.000 to 0.000 | 0/27326 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 0/50000 (0.000%) | -1.186 | 0 | -1.250 to -1.100 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 0/50000 (0.000%) | -0.050 | 0 | -0.070 to -0.020 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4456/22522 (19.785%) | -0.080 | -35 | -1.876 to +1.121 | 4456/22522 (19.785%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 0/50000 (0.000%) | -1.728 | 0 | -1.850 to -1.570 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22522/50000 (45.044%) | -0.070 | 0 | -0.740 to +0.840 | 22522/50000 (45.044%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 187/50000 (0.374%) | +0.040 | 0 | -0.040 to +0.140 | 187/50000 (0.374%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 7528/17068 (44.106%) | +29.763 | -35 | +29.498 to +30.127 | 7528/17068 (44.106%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 0/22674 (0.000%) | -19.671 | -80 | -20.545 to -18.573 | 0/22674 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1152/50000 (2.304%) | +0.372 | 0 | +0.130 to +0.600 | 1152/50000 (2.304%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 95/22674 (0.419%) | +0.419 | -80 | +0.331 to +0.559 | 95/22674 (0.419%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 17910 | -21 | 17910 | 0 |
| bare/syllables:2 | 5435 | 5455 | 20 | 5455 | 0 |
| bare/syllables:3 | 2713 | 2771 | 58 | 2771 | 0 |
| bare/syllables:4 | 1105 | 1073 | -32 | 1073 | 0 |
| bare/syllables:5 | 234 | 240 | 6 | 240 | 0 |
| bare/syllables:6 | 25 | 29 | 4 | 29 | 0 |
| both/syllables:2 | 912 | 921 | 9 | 921 | 0 |
| both/syllables:3 | 1110 | 1129 | 19 | 1129 | 0 |
| both/syllables:4 | 465 | 434 | -31 | 434 | 0 |
| both/syllables:5 | 47 | 68 | 21 | 68 | 0 |
| both/syllables:6 | 5 | 7 | 2 | 7 | 0 |
| both/syllables:7 | 2 | 0 | -2 | 0 | 0 |
| prefixed/syllables:2 | 4081 | 4129 | 48 | 4129 | 0 |
| prefixed/syllables:3 | 573 | 605 | 32 | 605 | 0 |
| prefixed/syllables:4 | 208 | 197 | -11 | 197 | 0 |
| prefixed/syllables:5 | 60 | 72 | 12 | 72 | 0 |
| prefixed/syllables:6 | 9 | 12 | 3 | 12 | 0 |
| prefixed/syllables:7 | 0 | 2 | 2 | 2 | 0 |
| suffixed/syllables:1 | 4823 | 4764 | -59 | 4764 | 0 |
| suffixed/syllables:2 | 6675 | 6563 | -112 | 6563 | 0 |
| suffixed/syllables:3 | 2861 | 2856 | -5 | 2856 | 0 |
| suffixed/syllables:4 | 507 | 558 | 51 | 558 | 0 |
| suffixed/syllables:5 | 186 | 164 | -22 | 164 | 0 |
| suffixed/syllables:6 | 29 | 36 | 7 | 36 | 0 |
| suffixed/syllables:7 | 4 | 5 | 1 | 5 | 0 |
