# Quality comparison: candidate-98d2744cc475

Original baseline: merge-base-b44940b97e21. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-b44940b97e21 | b44940b97e2185887c5fef382e655c3609822598 | clean | c144ef1156a51cbc5d987213bce7d3edd07a2632f30550153cfaa1f0f10ad351 |
| candidate | candidate-98d2744cc475 | 98d2744cc475e50a5cfab753bf583cb6ad7b8a9c | clean | ba7456ee4bf163564050081af4a45f8fc3c5c0aafdaefdd00bae6e09483a4154 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49537.000 | 49536.000 | -1.000 |
| Mean letters | 9.219 | 9.215 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004649 | 0.004636 | -0.000013 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.144851 | 0.144356 | -0.000495 |
| trigrams / missingReferenceMass | 0.031159 | 0.030882 | -0.000277 |
| trigrams / unseenGeneratedMass | 0.010073 | 0.010082 | 0.000009 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47090 (0.000%) | 0/47100 (0.000%) | 0.000 | 10 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47090 (0.000%) | 0/47100 (0.000%) | 0.000 | 10 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35117 (0.000%) | 0/35105 (0.000%) | 0.000 | -12 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35117/50000 (70.234%) | 35105/50000 (70.210%) | -0.024 | 0 | -0.160 to +0.150 |
| Words with adjacent identical coda segments / lower | 9/50000 (0.018%) | 8/50000 (0.016%) | -0.002 | 0 | -0.010 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5271/13303 (39.623%) | 5290/13365 (39.581%) | -0.042 | 62 | -0.362 to +0.339 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2910 (0.000%) | 0/2900 (0.000%) | 0.000 | -10 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 541/50000 (1.082%) | 544/50000 (1.088%) | +0.006 | 0 | -0.050 to +0.080 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 42/2910 (1.443%) | 40/2900 (1.379%) | -0.064 | -10 | -0.177 to +0.035 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1919 | 1901 | -18 |
| bare/syllables:2 | 6811 | 6846 | 35 |
| bare/syllables:3 | 4154 | 4144 | -10 |
| bare/syllables:4 | 1500 | 1493 | -7 |
| bare/syllables:5 | 410 | 418 | 8 |
| bare/syllables:6 | 71 | 76 | 5 |
| bare/syllables:7 | 16 | 15 | -1 |
| bare/syllables:8 | 2 | 2 | 0 |
| both/syllables:10 | 1 | 1 | 0 |
| both/syllables:2 | 166 | 160 | -6 |
| both/syllables:3 | 846 | 843 | -3 |
| both/syllables:4 | 1368 | 1356 | -12 |
| both/syllables:5 | 1000 | 989 | -11 |
| both/syllables:6 | 460 | 459 | -1 |
| both/syllables:7 | 150 | 142 | -8 |
| both/syllables:8 | 38 | 38 | 0 |
| both/syllables:9 | 11 | 11 | 0 |
| prefixed/syllables:2 | 885 | 891 | 6 |
| prefixed/syllables:3 | 3131 | 3124 | -7 |
| prefixed/syllables:4 | 2020 | 1986 | -34 |
| prefixed/syllables:5 | 776 | 777 | 1 |
| prefixed/syllables:6 | 231 | 233 | 2 |
| prefixed/syllables:7 | 51 | 54 | 3 |
| prefixed/syllables:8 | 13 | 13 | 0 |
| prefixed/syllables:9 | 1 | 1 | 0 |
| suffixed/syllables:1 | 991 | 999 | 8 |
| suffixed/syllables:2 | 5441 | 5468 | 27 |
| suffixed/syllables:3 | 8558 | 8556 | -2 |
| suffixed/syllables:4 | 5858 | 5867 | 9 |
| suffixed/syllables:5 | 2229 | 2236 | 7 |
| suffixed/syllables:6 | 696 | 698 | 2 |
| suffixed/syllables:7 | 155 | 160 | 5 |
| suffixed/syllables:8 | 32 | 34 | 2 |
| suffixed/syllables:9 | 9 | 9 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47539.000 | 47532.000 | -7.000 |
| Mean letters | 7.404 | 7.403 | -0.001 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000552 | 0.000557 | 0.000005 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174471 | 0.173876 | -0.000595 |
| trigrams / missingReferenceMass | 0.053654 | 0.052293 | -0.001361 |
| trigrams / unseenGeneratedMass | 0.011484 | 0.011546 | 0.000062 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43667 (0.000%) | 0/43613 (0.000%) | 0.000 | -54 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43667 (0.000%) | 0/43613 (0.000%) | 0.000 | -54 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9458/23240 (40.697%) | 9419/23199 (40.601%) | -0.096 | -41 | -0.271 to +0.123 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6333 (0.000%) | 0/6387 (0.000%) | 0.000 | 54 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1233/50000 (2.466%) | 1211/50000 (2.422%) | -0.044 | 0 | -0.120 to +0.020 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 83/6333 (1.311%) | 81/6387 (1.268%) | -0.042 | 54 | -0.181 to +0.071 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6333 | 6387 | 54 |
| bare/syllables:2 | 23240 | 23199 | -41 |
| bare/syllables:3 | 13709 | 13654 | -55 |
| bare/syllables:4 | 4922 | 4957 | 35 |
| bare/syllables:5 | 1456 | 1465 | 9 |
| bare/syllables:6 | 290 | 289 | -1 |
| bare/syllables:7 | 46 | 44 | -2 |
| bare/syllables:8 | 4 | 5 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16474.000 | 16535.000 | +61.000 |
| Mean letters | 5.532 | 5.482 | -0.050 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.089740 | 0.089482 | -0.000257 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.507908 | 0.506228 | -0.001680 |
| trigrams / missingReferenceMass | 0.360071 | 0.359501 | -0.000570 |
| trigrams / unseenGeneratedMass | 0.004678 | 0.006680 | 0.002002 |

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
| Words ending in an open checked vowel / lower | 239/50000 (0.478%) | 234/50000 (0.468%) | -0.010 | 0 | -0.030 to +0.010 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 857/50000 (1.714%) | 841/50000 (1.682%) | -0.032 | 0 | -0.090 to +0.030 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39419.000 | 39483.000 | +64.000 |
| Mean letters | 6.619 | 6.624 | +0.005 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006539 | 0.006537 | -0.000002 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155971 | 0.155353 | -0.000618 |
| trigrams / missingReferenceMass | 0.039604 | 0.038663 | -0.000940 |
| trigrams / unseenGeneratedMass | 0.007183 | 0.007305 | 0.000122 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29006 (0.000%) | 0/29034 (0.000%) | 0.000 | 28 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29006 (0.000%) | 0/29034 (0.000%) | 0.000 | 28 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22455 (0.000%) | 0/22457 (0.000%) | 0.000 | 2 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22455/50000 (44.910%) | 22457/50000 (44.914%) | +0.004 | 0 | -0.160 to +0.290 |
| Words with adjacent identical coda segments / lower | 4/50000 (0.008%) | 4/50000 (0.008%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6184/15309 (40.395%) | 6161/15277 (40.329%) | -0.066 | -32 | -0.360 to +0.412 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20994 (0.000%) | 0/20966 (0.000%) | 0.000 | -28 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 835/50000 (1.670%) | 811/50000 (1.622%) | -0.048 | 0 | -0.130 to +0.020 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 294/20994 (1.400%) | 291/20966 (1.388%) | -0.012 | -28 | -0.102 to +0.071 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17905 | 17903 | -2 |
| bare/syllables:2 | 5549 | 5552 | 3 |
| bare/syllables:3 | 2737 | 2750 | 13 |
| bare/syllables:4 | 1103 | 1094 | -9 |
| bare/syllables:5 | 216 | 211 | -5 |
| bare/syllables:6 | 35 | 33 | -2 |
| both/syllables:2 | 485 | 490 | 5 |
| both/syllables:3 | 1022 | 1028 | 6 |
| both/syllables:4 | 625 | 627 | 2 |
| both/syllables:5 | 257 | 253 | -4 |
| both/syllables:6 | 95 | 95 | 0 |
| both/syllables:7 | 32 | 35 | 3 |
| both/syllables:8 | 7 | 6 | -1 |
| prefixed/syllables:2 | 3045 | 3003 | -42 |
| prefixed/syllables:3 | 1184 | 1188 | 4 |
| prefixed/syllables:4 | 544 | 561 | 17 |
| prefixed/syllables:5 | 228 | 219 | -9 |
| prefixed/syllables:6 | 55 | 56 | 1 |
| prefixed/syllables:7 | 8 | 10 | 2 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3089 | 3063 | -26 |
| suffixed/syllables:2 | 6230 | 6232 | 2 |
| suffixed/syllables:3 | 3460 | 3454 | -6 |
| suffixed/syllables:4 | 1359 | 1382 | 23 |
| suffixed/syllables:5 | 544 | 555 | 11 |
| suffixed/syllables:6 | 160 | 170 | 10 |
| suffixed/syllables:7 | 24 | 28 | 4 |
| suffixed/syllables:8 | 1 | 1 | 0 |
