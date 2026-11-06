# Quality comparison: candidate-057b9a7b0b52

Original baseline: merge-base-b44940b97e21. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-b44940b97e21 | b44940b97e2185887c5fef382e655c3609822598 | clean | c144ef1156a51cbc5d987213bce7d3edd07a2632f30550153cfaa1f0f10ad351 |
| candidate | candidate-057b9a7b0b52 | 057b9a7b0b5221ed1f380175d4433c9dac65a5b6 | clean | a7a51cee49b76c954badf5168c404b0614e5b451a4fc3f381a070bea71123df6 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49537.000 | 49537.000 | 0.000 |
| Mean letters | 9.219 | 9.219 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004649 | 0.004649 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.144851 | 0.144851 | 0.000000 |
| trigrams / missingReferenceMass | 0.031159 | 0.031159 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.010073 | 0.010073 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47090 (0.000%) | 0/47090 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47090 (0.000%) | 0/47090 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35117 (0.000%) | 0/35117 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35117/50000 (70.234%) | 35117/50000 (70.234%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 9/50000 (0.018%) | 9/50000 (0.018%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5271/13303 (39.623%) | 5271/13303 (39.623%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2910 (0.000%) | 0/2910 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 541/50000 (1.082%) | 541/50000 (1.082%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 42/2910 (1.443%) | 42/2910 (1.443%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1919 | 1919 | 0 |
| bare/syllables:2 | 6811 | 6811 | 0 |
| bare/syllables:3 | 4154 | 4154 | 0 |
| bare/syllables:4 | 1500 | 1500 | 0 |
| bare/syllables:5 | 410 | 410 | 0 |
| bare/syllables:6 | 71 | 71 | 0 |
| bare/syllables:7 | 16 | 16 | 0 |
| bare/syllables:8 | 2 | 2 | 0 |
| both/syllables:10 | 1 | 1 | 0 |
| both/syllables:2 | 166 | 166 | 0 |
| both/syllables:3 | 846 | 846 | 0 |
| both/syllables:4 | 1368 | 1368 | 0 |
| both/syllables:5 | 1000 | 1000 | 0 |
| both/syllables:6 | 460 | 460 | 0 |
| both/syllables:7 | 150 | 150 | 0 |
| both/syllables:8 | 38 | 38 | 0 |
| both/syllables:9 | 11 | 11 | 0 |
| prefixed/syllables:2 | 885 | 885 | 0 |
| prefixed/syllables:3 | 3131 | 3131 | 0 |
| prefixed/syllables:4 | 2020 | 2020 | 0 |
| prefixed/syllables:5 | 776 | 776 | 0 |
| prefixed/syllables:6 | 231 | 231 | 0 |
| prefixed/syllables:7 | 51 | 51 | 0 |
| prefixed/syllables:8 | 13 | 13 | 0 |
| prefixed/syllables:9 | 1 | 1 | 0 |
| suffixed/syllables:1 | 991 | 991 | 0 |
| suffixed/syllables:2 | 5441 | 5441 | 0 |
| suffixed/syllables:3 | 8558 | 8558 | 0 |
| suffixed/syllables:4 | 5858 | 5858 | 0 |
| suffixed/syllables:5 | 2229 | 2229 | 0 |
| suffixed/syllables:6 | 696 | 696 | 0 |
| suffixed/syllables:7 | 155 | 155 | 0 |
| suffixed/syllables:8 | 32 | 32 | 0 |
| suffixed/syllables:9 | 9 | 9 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47539.000 | 47539.000 | 0.000 |
| Mean letters | 7.404 | 7.404 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000552 | 0.000552 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174471 | 0.174471 | 0.000000 |
| trigrams / missingReferenceMass | 0.053654 | 0.053654 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.011484 | 0.011484 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43667 (0.000%) | 0/43667 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43667 (0.000%) | 0/43667 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9458/23240 (40.697%) | 9458/23240 (40.697%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6333 (0.000%) | 0/6333 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1233/50000 (2.466%) | 1233/50000 (2.466%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 83/6333 (1.311%) | 83/6333 (1.311%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6333 | 6333 | 0 |
| bare/syllables:2 | 23240 | 23240 | 0 |
| bare/syllables:3 | 13709 | 13709 | 0 |
| bare/syllables:4 | 4922 | 4922 | 0 |
| bare/syllables:5 | 1456 | 1456 | 0 |
| bare/syllables:6 | 290 | 290 | 0 |
| bare/syllables:7 | 46 | 46 | 0 |
| bare/syllables:8 | 4 | 4 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16474.000 | 16584.000 | +110.000 |
| Mean letters | 5.532 | 4.357 | -1.175 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.089740 | 0.046346 | -0.043393 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.507908 | 0.372794 | -0.135114 |
| trigrams / missingReferenceMass | 0.360071 | 0.337150 | -0.022921 |
| trigrams / unseenGeneratedMass | 0.004678 | 0.002800 | -0.001877 |

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
| Words ending in an open checked vowel / lower | 239/50000 (0.478%) | 1371/50000 (2.742%) | +2.264 | 0 | +2.070 to +2.490 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 857/50000 (1.714%) | 659/50000 (1.318%) | -0.396 | 0 | -0.640 to -0.210 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39419.000 | 39419.000 | 0.000 |
| Mean letters | 6.619 | 6.619 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006539 | 0.006539 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155971 | 0.155971 | 0.000000 |
| trigrams / missingReferenceMass | 0.039604 | 0.039604 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.007183 | 0.007183 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29006 (0.000%) | 0/29006 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29006 (0.000%) | 0/29006 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22455 (0.000%) | 0/22455 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22455/50000 (44.910%) | 22455/50000 (44.910%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 4/50000 (0.008%) | 4/50000 (0.008%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6184/15309 (40.395%) | 6184/15309 (40.395%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20994 (0.000%) | 0/20994 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 835/50000 (1.670%) | 835/50000 (1.670%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 294/20994 (1.400%) | 294/20994 (1.400%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17905 | 17905 | 0 |
| bare/syllables:2 | 5549 | 5549 | 0 |
| bare/syllables:3 | 2737 | 2737 | 0 |
| bare/syllables:4 | 1103 | 1103 | 0 |
| bare/syllables:5 | 216 | 216 | 0 |
| bare/syllables:6 | 35 | 35 | 0 |
| both/syllables:2 | 485 | 485 | 0 |
| both/syllables:3 | 1022 | 1022 | 0 |
| both/syllables:4 | 625 | 625 | 0 |
| both/syllables:5 | 257 | 257 | 0 |
| both/syllables:6 | 95 | 95 | 0 |
| both/syllables:7 | 32 | 32 | 0 |
| both/syllables:8 | 7 | 7 | 0 |
| prefixed/syllables:2 | 3045 | 3045 | 0 |
| prefixed/syllables:3 | 1184 | 1184 | 0 |
| prefixed/syllables:4 | 544 | 544 | 0 |
| prefixed/syllables:5 | 228 | 228 | 0 |
| prefixed/syllables:6 | 55 | 55 | 0 |
| prefixed/syllables:7 | 8 | 8 | 0 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3089 | 3089 | 0 |
| suffixed/syllables:2 | 6230 | 6230 | 0 |
| suffixed/syllables:3 | 3460 | 3460 | 0 |
| suffixed/syllables:4 | 1359 | 1359 | 0 |
| suffixed/syllables:5 | 544 | 544 | 0 |
| suffixed/syllables:6 | 160 | 160 | 0 |
| suffixed/syllables:7 | 24 | 24 | 0 |
| suffixed/syllables:8 | 1 | 1 | 0 |
