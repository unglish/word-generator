# Quality comparison: q10b2-configured-final-vowel-contract-active

Original baseline: q10b2-fixed-control-active. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 4f03fd0c1294e70ef446e9fde3eeafe4e26916b3d0672e8ef5bda1c065f9bf66. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44282.000 | 44320.000 | +38.000 |
| Mean letters | 7.577 | 7.588 | +0.011 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006249 | 0.006330 | 0.000081 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.172695 | 0.172757 | 0.000062 |
| trigrams / missingReferenceMass | 0.038159 | 0.036027 | -0.002133 |
| trigrams / unseenGeneratedMass | 0.013438 | 0.012616 | -0.000822 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/45544 (0.000%) | 0/45538 (0.000%) | 0.000 | -6 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45544 (0.000%) | 0/45538 (0.000%) | 0.000 | -6 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3944/35084 (11.242%) | 3851/35134 (10.961%) | -0.281 | 50 | -0.753 to +0.006 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35084/50000 (70.168%) | 35134/50000 (70.268%) | +0.100 | 0 | -0.600 to +0.700 |
| Words with adjacent identical coda segments / lower | 147/50000 (0.294%) | 122/50000 (0.244%) | -0.050 | 0 | -0.180 to +0.040 |
| Disyllables with adjacent primary and secondary stress / lower | 8698/20837 (41.743%) | 8649/20838 (41.506%) | -0.237 | 1 | -2.050 to +0.618 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4456 (0.000%) | 0/4462 (0.000%) | 0.000 | 6 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 882/50000 (1.764%) | 0/50000 (0.000%) | -1.764 | 0 | -1.880 to -1.620 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 23/4456 (0.516%) | 25/4462 (0.560%) | +0.044 | 6 | -0.305 to +0.345 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1912 | 1929 | 17 |
| bare/syllables:2 | 6864 | 6727 | -137 |
| bare/syllables:3 | 4158 | 4185 | 27 |
| bare/syllables:4 | 1495 | 1504 | 9 |
| bare/syllables:5 | 388 | 438 | 50 |
| bare/syllables:6 | 84 | 71 | -13 |
| bare/syllables:7 | 15 | 9 | -6 |
| bare/syllables:8 | 0 | 3 | 3 |
| both/syllables:2 | 1003 | 1030 | 27 |
| both/syllables:3 | 1835 | 1863 | 28 |
| both/syllables:4 | 939 | 957 | 18 |
| both/syllables:5 | 203 | 184 | -19 |
| both/syllables:6 | 31 | 37 | 6 |
| both/syllables:7 | 5 | 6 | 1 |
| both/syllables:8 | 1 | 0 | -1 |
| prefixed/syllables:2 | 3261 | 3224 | -37 |
| prefixed/syllables:3 | 2658 | 2542 | -116 |
| prefixed/syllables:4 | 865 | 889 | 24 |
| prefixed/syllables:5 | 223 | 200 | -23 |
| prefixed/syllables:6 | 37 | 60 | 23 |
| prefixed/syllables:7 | 13 | 5 | -8 |
| prefixed/syllables:8 | 3 | 2 | -1 |
| suffixed/syllables:1 | 2544 | 2533 | -11 |
| suffixed/syllables:2 | 9709 | 9857 | 148 |
| suffixed/syllables:3 | 8057 | 8114 | 57 |
| suffixed/syllables:4 | 2772 | 2751 | -21 |
| suffixed/syllables:5 | 712 | 709 | -3 |
| suffixed/syllables:6 | 168 | 135 | -33 |
| suffixed/syllables:7 | 35 | 31 | -4 |
| suffixed/syllables:8 | 10 | 5 | -5 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47561.000 | 47471.000 | -90.000 |
| Mean letters | 7.498 | 7.540 | +0.042 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000334 | 0.000455 | 0.000122 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.200452 | 0.201307 | 0.000855 |
| trigrams / missingReferenceMass | 0.047749 | 0.051988 | 0.004239 |
| trigrams / unseenGeneratedMass | 0.015299 | 0.015881 | 0.000582 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43413 (0.000%) | 0/43469 (0.000%) | 0.000 | 56 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43413 (0.000%) | 0/43469 (0.000%) | 0.000 | 56 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 228/50000 (0.456%) | 246/50000 (0.492%) | +0.036 | 0 | -0.030 to +0.080 |
| Disyllables with adjacent primary and secondary stress / lower | 9359/23092 (40.529%) | 9198/22852 (40.250%) | -0.279 | -240 | -1.129 to +0.518 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6587 (0.000%) | 0/6531 (0.000%) | 0.000 | -56 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1347/50000 (2.694%) | 0/50000 (0.000%) | -2.694 | 0 | -2.740 to -2.640 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 27/6587 (0.410%) | 24/6531 (0.367%) | -0.042 | -56 | -0.372 to +0.254 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6587 | 6531 | -56 |
| bare/syllables:2 | 23092 | 22852 | -240 |
| bare/syllables:3 | 13640 | 13801 | 161 |
| bare/syllables:4 | 4869 | 5015 | 146 |
| bare/syllables:5 | 1483 | 1417 | -66 |
| bare/syllables:6 | 285 | 306 | 21 |
| bare/syllables:7 | 40 | 65 | 25 |
| bare/syllables:8 | 4 | 13 | 9 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 19396.000 | 19316.000 | -80.000 |
| Mean letters | 5.613 | 5.616 | +0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.096902 | 0.096013 | -0.000889 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.522393 | 0.523192 | 0.000798 |
| trigrams / missingReferenceMass | 0.380773 | 0.382306 | 0.001533 |
| trigrams / unseenGeneratedMass | 0.023446 | 0.023089 | -0.000358 |

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
| Words with adjacent identical coda segments / lower | 5007/50000 (10.014%) | 4973/50000 (9.946%) | -0.068 | 0 | -0.400 to +0.500 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 240/50000 (0.480%) | 0/50000 (0.000%) | -0.480 | 0 | -0.550 to -0.380 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 297/50000 (0.594%) | 288/50000 (0.576%) | -0.018 | 0 | -0.170 to +0.080 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 30193.000 | 29933.000 | -260.000 |
| Mean letters | 5.716 | 5.737 | +0.021 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.009809 | 0.010186 | 0.000377 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.199357 | 0.199394 | 0.000038 |
| trigrams / missingReferenceMass | 0.051020 | 0.048067 | -0.002953 |
| trigrams / unseenGeneratedMass | 0.013066 | 0.012297 | -0.000769 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/27326 (0.000%) | 0/27362 (0.000%) | 0.000 | 36 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27326 (0.000%) | 0/27362 (0.000%) | 0.000 | 36 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4456/22522 (19.785%) | 4544/22541 (20.159%) | +0.374 | 19 | -0.534 to +1.305 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22522/50000 (45.044%) | 22541/50000 (45.082%) | +0.038 | 0 | -0.870 to +1.080 |
| Words with adjacent identical coda segments / lower | 187/50000 (0.374%) | 194/50000 (0.388%) | +0.014 | 0 | -0.040 to +0.060 |
| Disyllables with adjacent primary and secondary stress / lower | 7528/17068 (44.106%) | 7584/17106 (44.335%) | +0.229 | 38 | -0.479 to +1.137 |
| Monosyllables with schwa as their sole nucleus / lower | 0/22674 (0.000%) | 0/22638 (0.000%) | 0.000 | -36 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1152/50000 (2.304%) | 0/50000 (0.000%) | -2.304 | 0 | -2.460 to -2.130 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 95/22674 (0.419%) | 116/22638 (0.512%) | +0.093 | -36 | -0.091 to +0.171 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17910 | 17839 | -71 |
| bare/syllables:2 | 5455 | 5492 | 37 |
| bare/syllables:3 | 2771 | 2707 | -64 |
| bare/syllables:4 | 1073 | 1150 | 77 |
| bare/syllables:5 | 240 | 244 | 4 |
| bare/syllables:6 | 29 | 27 | -2 |
| both/syllables:2 | 921 | 907 | -14 |
| both/syllables:3 | 1129 | 1125 | -4 |
| both/syllables:4 | 434 | 434 | 0 |
| both/syllables:5 | 68 | 55 | -13 |
| both/syllables:6 | 7 | 6 | -1 |
| both/syllables:7 | 0 | 1 | 1 |
| prefixed/syllables:2 | 4129 | 4135 | 6 |
| prefixed/syllables:3 | 605 | 608 | 3 |
| prefixed/syllables:4 | 197 | 193 | -4 |
| prefixed/syllables:5 | 72 | 57 | -15 |
| prefixed/syllables:6 | 12 | 11 | -1 |
| prefixed/syllables:7 | 2 | 1 | -1 |
| suffixed/syllables:1 | 4764 | 4799 | 35 |
| suffixed/syllables:2 | 6563 | 6572 | 9 |
| suffixed/syllables:3 | 2856 | 2879 | 23 |
| suffixed/syllables:4 | 558 | 544 | -14 |
| suffixed/syllables:5 | 164 | 176 | 12 |
| suffixed/syllables:6 | 36 | 36 | 0 |
| suffixed/syllables:7 | 5 | 2 | -3 |
