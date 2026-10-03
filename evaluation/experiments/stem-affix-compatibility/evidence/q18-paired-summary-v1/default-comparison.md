# Quality comparison: q18-candidate-default

Original baseline: q11b-composed-control-default. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 4f03fd0c1294e70ef446e9fde3eeafe4e26916b3d0672e8ef5bda1c065f9bf66. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44348.000 | 43875.000 | -473.000 |
| Mean letters | 7.495 | 7.498 | +0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006110 | 0.007518 | 0.001408 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155365 | 0.158429 | 0.003064 |
| trigrams / missingReferenceMass | 0.035204 | 0.035123 | -0.000082 |
| trigrams / unseenGeneratedMass | 0.010565 | 0.010819 | 0.000254 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/45524 (0.000%) | 0/45659 (0.000%) | 0.000 | 135 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45524 (0.000%) | 0/45659 (0.000%) | 0.000 | 135 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3773/34941 (10.798%) | 4493/35001 (12.837%) | +2.039 | 60 | +0.957 to +2.422 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34941/50000 (69.882%) | 35001/50000 (70.002%) | +0.120 | 0 | -0.440 to +0.870 |
| Words with adjacent identical coda segments / lower | 1/50000 (0.002%) | 3/50000 (0.006%) | +0.004 | 0 | -0.010 to +0.020 |
| Disyllables with adjacent primary and secondary stress / lower | 8768/20731 (42.294%) | 8571/20322 (42.176%) | -0.118 | -409 | -1.334 to +1.002 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4476 (0.000%) | 0/4341 (0.000%) | 0.000 | -135 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 912/50000 (1.824%) | 908/50000 (1.816%) | -0.008 | 0 | -0.150 to +0.050 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 21/4476 (0.469%) | 21/4341 (0.484%) | +0.015 | -135 | -0.474 to +0.702 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1946 | 1993 | 47 |
| bare/syllables:2 | 6922 | 6829 | -93 |
| bare/syllables:3 | 4207 | 4125 | -82 |
| bare/syllables:4 | 1488 | 1517 | 29 |
| bare/syllables:5 | 380 | 425 | 45 |
| bare/syllables:6 | 102 | 87 | -15 |
| bare/syllables:7 | 12 | 17 | 5 |
| bare/syllables:8 | 2 | 6 | 4 |
| both/syllables:2 | 1040 | 1027 | -13 |
| both/syllables:3 | 1782 | 1732 | -50 |
| both/syllables:4 | 978 | 1051 | 73 |
| both/syllables:5 | 170 | 212 | 42 |
| both/syllables:6 | 30 | 34 | 4 |
| both/syllables:7 | 4 | 3 | -1 |
| prefixed/syllables:2 | 3186 | 3164 | -22 |
| prefixed/syllables:3 | 2739 | 2637 | -102 |
| prefixed/syllables:4 | 838 | 859 | 21 |
| prefixed/syllables:5 | 227 | 212 | -15 |
| prefixed/syllables:6 | 50 | 45 | -5 |
| prefixed/syllables:7 | 8 | 9 | 1 |
| prefixed/syllables:8 | 3 | 1 | -2 |
| suffixed/syllables:1 | 2530 | 2348 | -182 |
| suffixed/syllables:2 | 9583 | 9302 | -281 |
| suffixed/syllables:3 | 8128 | 8380 | 252 |
| suffixed/syllables:4 | 2702 | 3050 | 348 |
| suffixed/syllables:5 | 780 | 751 | -29 |
| suffixed/syllables:6 | 133 | 156 | 23 |
| suffixed/syllables:7 | 28 | 25 | -3 |
| suffixed/syllables:8 | 2 | 3 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47563.000 | 47563.000 | 0.000 |
| Mean letters | 7.417 | 7.417 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000327 | 0.000327 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.176779 | 0.176779 | 0.000000 |
| trigrams / missingReferenceMass | 0.050926 | 0.050926 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.011705 | 0.011705 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43642 (0.000%) | 0/43642 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43642 (0.000%) | 0/43642 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9544/23153 (41.221%) | 9544/23153 (41.221%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6358 (0.000%) | 0/6358 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1301/50000 (2.602%) | 1301/50000 (2.602%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 36/6358 (0.566%) | 36/6358 (0.566%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6358 | 6358 | 0 |
| bare/syllables:2 | 23153 | 23153 | 0 |
| bare/syllables:3 | 13852 | 13852 | 0 |
| bare/syllables:4 | 4947 | 4947 | 0 |
| bare/syllables:5 | 1366 | 1366 | 0 |
| bare/syllables:6 | 288 | 288 | 0 |
| bare/syllables:7 | 32 | 32 | 0 |
| bare/syllables:8 | 3 | 3 | 0 |
| bare/syllables:9 | 1 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16433.000 | 16433.000 | 0.000 |
| Mean letters | 5.510 | 5.510 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.099007 | 0.099007 | 0.000000 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.510308 | 0.510308 | 0.000000 |
| trigrams / missingReferenceMass | 0.354634 | 0.354634 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.012497 | 0.012497 | 0.000000 |

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
| Words ending in an open checked vowel / lower | 269/50000 (0.538%) | 269/50000 (0.538%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 308/50000 (0.616%) | 308/50000 (0.616%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 30075.000 | 29692.000 | -383.000 |
| Mean letters | 5.667 | 5.672 | +0.005 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.009757 | 0.011844 | 0.002087 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.179776 | 0.182358 | 0.002583 |
| trigrams / missingReferenceMass | 0.046093 | 0.048073 | 0.001980 |
| trigrams / unseenGeneratedMass | 0.010427 | 0.010664 | 0.000237 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/27365 (0.000%) | 0/27495 (0.000%) | 0.000 | 130 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27365 (0.000%) | 0/27495 (0.000%) | 0.000 | 130 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4503/22402 (20.101%) | 5421/22356 (24.249%) | +4.148 | -46 | +3.667 to +4.811 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22402/50000 (44.804%) | 22356/50000 (44.712%) | -0.092 | 0 | -1.000 to +1.130 |
| Words with adjacent identical coda segments / lower | 1/50000 (0.002%) | 1/50000 (0.002%) | 0.000 | 0 | -0.010 to +0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 7564/17204 (43.967%) | 7188/16625 (43.236%) | -0.730 | -579 | -2.045 to +1.312 |
| Monosyllables with schwa as their sole nucleus / lower | 0/22635 (0.000%) | 0/22505 (0.000%) | 0.000 | -130 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1152/50000 (2.304%) | 1113/50000 (2.226%) | -0.078 | 0 | -0.270 to +0.010 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 109/22635 (0.482%) | 122/22505 (0.542%) | +0.061 | -130 | -0.134 to +0.298 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17947 | 18143 | 196 |
| bare/syllables:2 | 5518 | 5407 | -111 |
| bare/syllables:3 | 2729 | 2721 | -8 |
| bare/syllables:4 | 1136 | 1120 | -16 |
| bare/syllables:5 | 233 | 223 | -10 |
| bare/syllables:6 | 35 | 30 | -5 |
| both/syllables:2 | 919 | 850 | -69 |
| both/syllables:3 | 1069 | 1066 | -3 |
| both/syllables:4 | 425 | 526 | 101 |
| both/syllables:5 | 46 | 54 | 8 |
| both/syllables:6 | 8 | 10 | 2 |
| both/syllables:7 | 2 | 0 | -2 |
| prefixed/syllables:2 | 4186 | 3877 | -309 |
| prefixed/syllables:3 | 622 | 752 | 130 |
| prefixed/syllables:4 | 200 | 209 | 9 |
| prefixed/syllables:5 | 56 | 61 | 5 |
| prefixed/syllables:6 | 9 | 10 | 1 |
| prefixed/syllables:7 | 1 | 0 | -1 |
| suffixed/syllables:1 | 4688 | 4362 | -326 |
| suffixed/syllables:2 | 6581 | 6491 | -90 |
| suffixed/syllables:3 | 2850 | 3305 | 455 |
| suffixed/syllables:4 | 534 | 546 | 12 |
| suffixed/syllables:5 | 165 | 193 | 28 |
| suffixed/syllables:6 | 34 | 38 | 4 |
| suffixed/syllables:7 | 7 | 6 | -1 |
