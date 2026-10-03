# Quality comparison: q11b-candidate-default

Original baseline: q11b-composed-control-default. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 4f03fd0c1294e70ef446e9fde3eeafe4e26916b3d0672e8ef5bda1c065f9bf66. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44348.000 | 44348.000 | 0.000 |
| Mean letters | 7.495 | 7.495 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006110 | 0.006110 | -0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155365 | 0.155367 | 0.000003 |
| trigrams / missingReferenceMass | 0.035204 | 0.035204 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.010565 | 0.010565 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/45524 (0.000%) | 0/45524 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45524 (0.000%) | 0/45524 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3773/34941 (10.798%) | 3773/34941 (10.798%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34941/50000 (69.882%) | 34941/50000 (69.882%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 1/50000 (0.002%) | 0/50000 (0.000%) | -0.002 | 0 | -0.010 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 8768/20731 (42.294%) | 8768/20731 (42.294%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4476 (0.000%) | 0/4476 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 912/50000 (1.824%) | 912/50000 (1.824%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 21/4476 (0.469%) | 21/4476 (0.469%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1946 | 1946 | 0 |
| bare/syllables:2 | 6922 | 6922 | 0 |
| bare/syllables:3 | 4207 | 4207 | 0 |
| bare/syllables:4 | 1488 | 1488 | 0 |
| bare/syllables:5 | 380 | 380 | 0 |
| bare/syllables:6 | 102 | 102 | 0 |
| bare/syllables:7 | 12 | 12 | 0 |
| bare/syllables:8 | 2 | 2 | 0 |
| both/syllables:2 | 1040 | 1040 | 0 |
| both/syllables:3 | 1782 | 1782 | 0 |
| both/syllables:4 | 978 | 978 | 0 |
| both/syllables:5 | 170 | 170 | 0 |
| both/syllables:6 | 30 | 30 | 0 |
| both/syllables:7 | 4 | 4 | 0 |
| prefixed/syllables:2 | 3186 | 3186 | 0 |
| prefixed/syllables:3 | 2739 | 2739 | 0 |
| prefixed/syllables:4 | 838 | 838 | 0 |
| prefixed/syllables:5 | 227 | 227 | 0 |
| prefixed/syllables:6 | 50 | 50 | 0 |
| prefixed/syllables:7 | 8 | 8 | 0 |
| prefixed/syllables:8 | 3 | 3 | 0 |
| suffixed/syllables:1 | 2530 | 2530 | 0 |
| suffixed/syllables:2 | 9583 | 9583 | 0 |
| suffixed/syllables:3 | 8128 | 8128 | 0 |
| suffixed/syllables:4 | 2702 | 2702 | 0 |
| suffixed/syllables:5 | 780 | 780 | 0 |
| suffixed/syllables:6 | 133 | 133 | 0 |
| suffixed/syllables:7 | 28 | 28 | 0 |
| suffixed/syllables:8 | 2 | 2 | 0 |

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
| Unique spellings | 30075.000 | 30075.000 | 0.000 |
| Mean letters | 5.667 | 5.667 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.009757 | 0.009756 | -0.000001 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.179776 | 0.179776 | 0.000000 |
| trigrams / missingReferenceMass | 0.046093 | 0.046093 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.010427 | 0.010427 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/27365 (0.000%) | 0/27365 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27365 (0.000%) | 0/27365 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4503/22402 (20.101%) | 4503/22402 (20.101%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22402/50000 (44.804%) | 22402/50000 (44.804%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 1/50000 (0.002%) | 0/50000 (0.000%) | -0.002 | 0 | -0.010 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7564/17204 (43.967%) | 7564/17204 (43.967%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/22635 (0.000%) | 0/22635 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1152/50000 (2.304%) | 1152/50000 (2.304%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 109/22635 (0.482%) | 109/22635 (0.482%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17947 | 17947 | 0 |
| bare/syllables:2 | 5518 | 5518 | 0 |
| bare/syllables:3 | 2729 | 2729 | 0 |
| bare/syllables:4 | 1136 | 1136 | 0 |
| bare/syllables:5 | 233 | 233 | 0 |
| bare/syllables:6 | 35 | 35 | 0 |
| both/syllables:2 | 919 | 919 | 0 |
| both/syllables:3 | 1069 | 1069 | 0 |
| both/syllables:4 | 425 | 425 | 0 |
| both/syllables:5 | 46 | 46 | 0 |
| both/syllables:6 | 8 | 8 | 0 |
| both/syllables:7 | 2 | 2 | 0 |
| prefixed/syllables:2 | 4186 | 4186 | 0 |
| prefixed/syllables:3 | 622 | 622 | 0 |
| prefixed/syllables:4 | 200 | 200 | 0 |
| prefixed/syllables:5 | 56 | 56 | 0 |
| prefixed/syllables:6 | 9 | 9 | 0 |
| prefixed/syllables:7 | 1 | 1 | 0 |
| suffixed/syllables:1 | 4688 | 4688 | 0 |
| suffixed/syllables:2 | 6581 | 6581 | 0 |
| suffixed/syllables:3 | 2850 | 2850 | 0 |
| suffixed/syllables:4 | 534 | 534 | 0 |
| suffixed/syllables:5 | 165 | 165 | 0 |
| suffixed/syllables:6 | 34 | 34 | 0 |
| suffixed/syllables:7 | 7 | 7 | 0 |
