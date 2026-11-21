# Quality comparison: candidate-9ae4d67fc2bc

Original baseline: merge-base-36762bf8f682. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-36762bf8f682 | 36762bf8f6822ca448536ce9ec3a9c95505a6fbe | clean | b12f47a0ced32e0aa9acb38870368e52f9a49c3b1215b5f490f4f45c0ff585ce |
| candidate | candidate-9ae4d67fc2bc | 9ae4d67fc2bc54f72c26bf2e1835945f7ddad7bb | clean | eadbe3993ec4b89768fc1e485f42b67f27d8d3c57a3cd94801d04c37d9602602 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49536.000 | 49473.000 | -63.000 |
| Mean letters | 9.223 | 9.280 | +0.057 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004427 | 0.004336 | -0.000091 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.142836 | 0.146571 | 0.003735 |
| trigrams / missingReferenceMass | 0.033406 | 0.032503 | -0.000903 |
| trigrams / unseenGeneratedMass | 0.009033 | 0.008291 | -0.000741 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47008 (0.000%) | 0/46973 (0.000%) | 0.000 | -35 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47008 (0.000%) | 0/46973 (0.000%) | 0.000 | -35 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/34954 (0.000%) | 0/34980 (0.000%) | 0.000 | 26 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34954/50000 (69.908%) | 34980/50000 (69.960%) | +0.052 | 0 | -0.700 to +0.780 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5317/13277 (40.047%) | 5257/13330 (39.437%) | -0.609 | 53 | -1.302 to +0.022 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2992 (0.000%) | 0/3027 (0.000%) | 0.000 | 35 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 44/2992 (1.471%) | 40/3027 (1.321%) | -0.149 | 35 | -0.510 to +0.484 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1987 | 1978 | -9 |
| bare/syllables:2 | 6899 | 6892 | -7 |
| bare/syllables:3 | 4102 | 4082 | -20 |
| bare/syllables:4 | 1514 | 1521 | 7 |
| bare/syllables:5 | 432 | 430 | -2 |
| bare/syllables:6 | 101 | 99 | -2 |
| bare/syllables:7 | 10 | 16 | 6 |
| bare/syllables:8 | 1 | 2 | 1 |
| both/syllables:10 | 1 | 0 | -1 |
| both/syllables:2 | 157 | 158 | 1 |
| both/syllables:3 | 834 | 873 | 39 |
| both/syllables:4 | 1431 | 1429 | -2 |
| both/syllables:5 | 986 | 995 | 9 |
| both/syllables:6 | 426 | 424 | -2 |
| both/syllables:7 | 134 | 149 | 15 |
| both/syllables:8 | 30 | 51 | 21 |
| both/syllables:9 | 9 | 10 | 1 |
| prefixed/syllables:10 | 0 | 1 | 1 |
| prefixed/syllables:2 | 830 | 861 | 31 |
| prefixed/syllables:3 | 3163 | 3107 | -56 |
| prefixed/syllables:4 | 2009 | 1960 | -49 |
| prefixed/syllables:5 | 800 | 751 | -49 |
| prefixed/syllables:6 | 226 | 238 | 12 |
| prefixed/syllables:7 | 48 | 40 | -8 |
| prefixed/syllables:8 | 11 | 6 | -5 |
| prefixed/syllables:9 | 3 | 0 | -3 |
| suffixed/syllables:1 | 1005 | 1049 | 44 |
| suffixed/syllables:10 | 1 | 1 | 0 |
| suffixed/syllables:2 | 5391 | 5419 | 28 |
| suffixed/syllables:3 | 8513 | 8420 | -93 |
| suffixed/syllables:4 | 5730 | 5777 | 47 |
| suffixed/syllables:5 | 2313 | 2301 | -12 |
| suffixed/syllables:6 | 712 | 769 | 57 |
| suffixed/syllables:7 | 154 | 157 | 3 |
| suffixed/syllables:8 | 31 | 28 | -3 |
| suffixed/syllables:9 | 6 | 6 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47545.000 | 47553.000 | +8.000 |
| Mean letters | 7.411 | 7.449 | +0.038 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000668 | 0.000624 | -0.000044 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.174736 | 0.181004 | 0.006267 |
| trigrams / missingReferenceMass | 0.052214 | 0.054204 | 0.001989 |
| trigrams / unseenGeneratedMass | 0.010316 | 0.009994 | -0.000321 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43489 (0.000%) | 0/43433 (0.000%) | 0.000 | -56 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43489 (0.000%) | 0/43433 (0.000%) | 0.000 | -56 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9325/23055 (40.447%) | 9276/22810 (40.666%) | +0.220 | -245 | -0.302 to +0.679 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6511 (0.000%) | 0/6567 (0.000%) | 0.000 | 56 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 115/6511 (1.766%) | 110/6567 (1.675%) | -0.091 | 56 | -0.603 to +0.801 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6511 | 6567 | 56 |
| bare/syllables:2 | 23055 | 22810 | -245 |
| bare/syllables:3 | 13606 | 13895 | 289 |
| bare/syllables:4 | 5013 | 5001 | -12 |
| bare/syllables:5 | 1432 | 1363 | -69 |
| bare/syllables:6 | 325 | 305 | -20 |
| bare/syllables:7 | 53 | 46 | -7 |
| bare/syllables:8 | 4 | 12 | 8 |
| bare/syllables:9 | 1 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 17311.000 | 16876.000 | -435.000 |
| Mean letters | 4.422 | 4.424 | +0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.048581 | 0.048350 | -0.000231 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.369928 | 0.380482 | 0.010553 |
| trigrams / missingReferenceMass | 0.327579 | 0.319951 | -0.007628 |
| trigrams / unseenGeneratedMass | 0.001767 | 0.001939 | 0.000172 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 831/50000 (1.662%) | 805/50000 (1.610%) | -0.052 | 0 | -0.150 to +0.060 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39750.000 | 39589.000 | -161.000 |
| Mean letters | 6.650 | 6.690 | +0.040 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006549 | 0.006315 | -0.000234 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155230 | 0.159406 | 0.004177 |
| trigrams / missingReferenceMass | 0.042893 | 0.042575 | -0.000318 |
| trigrams / unseenGeneratedMass | 0.006142 | 0.005778 | -0.000364 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28893 (0.000%) | 0/28872 (0.000%) | 0.000 | -21 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28893 (0.000%) | 0/28872 (0.000%) | 0.000 | -21 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22341 (0.000%) | 0/22513 (0.000%) | 0.000 | 172 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22341/50000 (44.682%) | 22513/50000 (45.026%) | +0.344 | 0 | -0.480 to +0.990 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6242/15296 (40.808%) | 6167/15201 (40.570%) | -0.238 | -95 | -1.954 to +1.461 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21107 (0.000%) | 0/21128 (0.000%) | 0.000 | 21 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 368/21107 (1.743%) | 316/21128 (1.496%) | -0.248 | 21 | -0.442 to +0.182 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17954 | 17933 | -21 |
| bare/syllables:2 | 5617 | 5441 | -176 |
| bare/syllables:3 | 2747 | 2725 | -22 |
| bare/syllables:4 | 1083 | 1101 | 18 |
| bare/syllables:5 | 232 | 259 | 27 |
| bare/syllables:6 | 26 | 28 | 2 |
| both/syllables:2 | 482 | 478 | -4 |
| both/syllables:3 | 972 | 983 | 11 |
| both/syllables:4 | 606 | 620 | 14 |
| both/syllables:5 | 306 | 264 | -42 |
| both/syllables:6 | 103 | 98 | -5 |
| both/syllables:7 | 26 | 33 | 7 |
| both/syllables:8 | 4 | 4 | 0 |
| both/syllables:9 | 1 | 1 | 0 |
| prefixed/syllables:2 | 3077 | 3074 | -3 |
| prefixed/syllables:3 | 1098 | 1130 | 32 |
| prefixed/syllables:4 | 556 | 557 | 1 |
| prefixed/syllables:5 | 210 | 193 | -17 |
| prefixed/syllables:6 | 56 | 53 | -3 |
| prefixed/syllables:7 | 11 | 11 | 0 |
| prefixed/syllables:8 | 0 | 1 | 1 |
| suffixed/syllables:1 | 3153 | 3195 | 42 |
| suffixed/syllables:2 | 6120 | 6208 | 88 |
| suffixed/syllables:3 | 3422 | 3416 | -6 |
| suffixed/syllables:4 | 1419 | 1431 | 12 |
| suffixed/syllables:5 | 540 | 581 | 41 |
| suffixed/syllables:6 | 150 | 151 | 1 |
| suffixed/syllables:7 | 27 | 29 | 2 |
| suffixed/syllables:8 | 2 | 2 | 0 |
