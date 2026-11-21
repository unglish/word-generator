# Quality comparison: candidate-48d58d08c5dd

Original baseline: merge-base-81df038c87c9. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-81df038c87c9 | 81df038c87c908840d9bedaeaa457b0731e9467d | clean | 50d1e56674f65270e5dff6a8b9cb560dbca22f6efbdef958375ee88cfbe9e6b9 |
| candidate | candidate-48d58d08c5dd | 48d58d08c5ddfda9c78e13e8d799adfdec99ceee | clean | 114b0614ca86dfba65b5e731b6f713c0e2325358770b70abcb575716ff491d5f |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49552.000 | 49552.000 | 0.000 |
| Mean letters | 9.227 | 9.227 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004297 | 0.004324 | 0.000027 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.142895 | 0.142895 | 0.000000 |
| trigrams / missingReferenceMass | 0.031519 | 0.031519 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.009125 | 0.009125 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47005 (0.000%) | 0/47005 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47005 (0.000%) | 0/47005 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35043 (0.000%) | 0/35043 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35043/50000 (70.086%) | 35043/50000 (70.086%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5319/13333 (39.893%) | 5319/13333 (39.893%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2995 (0.000%) | 0/2995 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 48/2995 (1.603%) | 48/2995 (1.603%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1937 | 1937 | 0 |
| bare/syllables:2 | 6958 | 6958 | 0 |
| bare/syllables:3 | 4099 | 4099 | 0 |
| bare/syllables:4 | 1430 | 1430 | 0 |
| bare/syllables:5 | 439 | 439 | 0 |
| bare/syllables:6 | 76 | 76 | 0 |
| bare/syllables:7 | 16 | 16 | 0 |
| bare/syllables:8 | 2 | 2 | 0 |
| both/syllables:11 | 1 | 1 | 0 |
| both/syllables:2 | 142 | 142 | 0 |
| both/syllables:3 | 828 | 828 | 0 |
| both/syllables:4 | 1345 | 1345 | 0 |
| both/syllables:5 | 991 | 991 | 0 |
| both/syllables:6 | 456 | 456 | 0 |
| both/syllables:7 | 123 | 123 | 0 |
| both/syllables:8 | 42 | 42 | 0 |
| both/syllables:9 | 5 | 5 | 0 |
| prefixed/syllables:2 | 852 | 852 | 0 |
| prefixed/syllables:3 | 3179 | 3179 | 0 |
| prefixed/syllables:4 | 1990 | 1990 | 0 |
| prefixed/syllables:5 | 811 | 811 | 0 |
| prefixed/syllables:6 | 208 | 208 | 0 |
| prefixed/syllables:7 | 50 | 50 | 0 |
| prefixed/syllables:8 | 12 | 12 | 0 |
| prefixed/syllables:9 | 1 | 1 | 0 |
| suffixed/syllables:1 | 1058 | 1058 | 0 |
| suffixed/syllables:10 | 1 | 1 | 0 |
| suffixed/syllables:2 | 5381 | 5381 | 0 |
| suffixed/syllables:3 | 8633 | 8633 | 0 |
| suffixed/syllables:4 | 5764 | 5764 | 0 |
| suffixed/syllables:5 | 2262 | 2262 | 0 |
| suffixed/syllables:6 | 674 | 674 | 0 |
| suffixed/syllables:7 | 198 | 198 | 0 |
| suffixed/syllables:8 | 31 | 31 | 0 |
| suffixed/syllables:9 | 5 | 5 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47684.000 | 47684.000 | 0.000 |
| Mean letters | 7.410 | 7.410 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000667 | 0.000650 | -0.000018 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174402 | 0.174402 | 0.000000 |
| trigrams / missingReferenceMass | 0.051342 | 0.051342 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.011615 | 0.011615 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43519 (0.000%) | 0/43519 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43519 (0.000%) | 0/43519 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9286/23032 (40.318%) | 9286/23032 (40.318%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6481 (0.000%) | 0/6481 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 97/6481 (1.497%) | 97/6481 (1.497%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6481 | 6481 | 0 |
| bare/syllables:2 | 23032 | 23032 | 0 |
| bare/syllables:3 | 13827 | 13827 | 0 |
| bare/syllables:4 | 4934 | 4934 | 0 |
| bare/syllables:5 | 1382 | 1382 | 0 |
| bare/syllables:6 | 277 | 277 | 0 |
| bare/syllables:7 | 55 | 55 | 0 |
| bare/syllables:8 | 11 | 11 | 0 |
| bare/syllables:9 | 1 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 17330.000 | 17330.000 | 0.000 |
| Mean letters | 4.421 | 4.421 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.048638 | 0.048638 | 0.000000 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.369641 | 0.369641 | 0.000000 |
| trigrams / missingReferenceMass | 0.329232 | 0.329232 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.001999 | 0.001999 | 0.000000 |

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
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 823/50000 (1.646%) | 823/50000 (1.646%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39807.000 | 39807.000 | 0.000 |
| Mean letters | 6.672 | 6.672 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006518 | 0.006632 | 0.000114 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.154784 | 0.154784 | 0.000000 |
| trigrams / missingReferenceMass | 0.041590 | 0.041590 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.006840 | 0.006840 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29055 (0.000%) | 0/29055 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29055 (0.000%) | 0/29055 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22636 (0.000%) | 0/22636 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22636/50000 (45.272%) | 22636/50000 (45.272%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6189/15293 (40.469%) | 6189/15293 (40.469%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20945 (0.000%) | 0/20945 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 330/20945 (1.576%) | 330/20945 (1.576%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17807 | 17807 | 0 |
| bare/syllables:2 | 5451 | 5451 | 0 |
| bare/syllables:3 | 2752 | 2752 | 0 |
| bare/syllables:4 | 1083 | 1083 | 0 |
| bare/syllables:5 | 238 | 238 | 0 |
| bare/syllables:6 | 33 | 33 | 0 |
| both/syllables:2 | 483 | 483 | 0 |
| both/syllables:3 | 972 | 972 | 0 |
| both/syllables:4 | 611 | 611 | 0 |
| both/syllables:5 | 276 | 276 | 0 |
| both/syllables:6 | 99 | 99 | 0 |
| both/syllables:7 | 31 | 31 | 0 |
| both/syllables:8 | 9 | 9 | 0 |
| prefixed/syllables:2 | 3044 | 3044 | 0 |
| prefixed/syllables:3 | 1130 | 1130 | 0 |
| prefixed/syllables:4 | 535 | 535 | 0 |
| prefixed/syllables:5 | 211 | 211 | 0 |
| prefixed/syllables:6 | 62 | 62 | 0 |
| prefixed/syllables:7 | 10 | 10 | 0 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3138 | 3138 | 0 |
| suffixed/syllables:2 | 6315 | 6315 | 0 |
| suffixed/syllables:3 | 3530 | 3530 | 0 |
| suffixed/syllables:4 | 1443 | 1443 | 0 |
| suffixed/syllables:5 | 536 | 536 | 0 |
| suffixed/syllables:6 | 170 | 170 | 0 |
| suffixed/syllables:7 | 30 | 30 | 0 |
