# Quality comparison: candidate-0bc1c38faeaa

Original baseline: merge-base-439b77b0b03b. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-439b77b0b03b | 439b77b0b03ba9c322c2b92ffc43e5f31607186a | clean | 548ec6d057347dd09e7828b11c92eafad940554915cd3373c381cfc0b88481a3 |
| candidate | candidate-0bc1c38faeaa | 0bc1c38faeaaa81f77c3228d24c04c407bb68180 | clean | da6bc56d5b74a3b489797c6e9d3e00f2505d19f87aef325c29caa46d21bff3d7 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 48476.000 | 48354.000 | -122.000 |
| Mean letters | 7.914 | 7.878 | -0.036 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.005094 | 0.005007 | -0.000087 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.145540 | 0.143977 | -0.001564 |
| trigrams / missingReferenceMass | 0.041133 | 0.040738 | -0.000395 |
| trigrams / unseenGeneratedMass | 0.006957 | 0.006910 | -0.000046 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43862 (0.000%) | 0/43641 (0.000%) | 0.000 | -221 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43862 (0.000%) | 0/43641 (0.000%) | 0.000 | -221 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/26072 (0.000%) | 0/25985 (0.000%) | 0.000 | -87 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 26072/50000 (52.144%) | 25985/50000 (51.970%) | -0.174 | 0 | -0.880 to +0.390 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 8648/23110 (37.421%) | 8519/23032 (36.988%) | -0.433 | -78 | -1.906 to +0.376 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6138 (0.000%) | 0/6359 (0.000%) | 0.000 | 221 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 107/6138 (1.743%) | 132/6359 (2.076%) | +0.333 | 221 | -0.322 to +0.769 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 3186 | 3373 | 187 |
| bare/syllables:2 | 12829 | 12780 | -49 |
| bare/syllables:3 | 5107 | 5092 | -15 |
| bare/syllables:4 | 1974 | 1931 | -43 |
| bare/syllables:5 | 630 | 682 | 52 |
| bare/syllables:6 | 175 | 133 | -42 |
| bare/syllables:7 | 25 | 24 | -1 |
| bare/syllables:8 | 2 | 0 | -2 |
| both/syllables:2 | 389 | 366 | -23 |
| both/syllables:3 | 811 | 862 | 51 |
| both/syllables:4 | 515 | 508 | -7 |
| both/syllables:5 | 151 | 147 | -4 |
| both/syllables:6 | 22 | 25 | 3 |
| both/syllables:7 | 3 | 1 | -2 |
| prefixed/syllables:2 | 397 | 347 | -50 |
| prefixed/syllables:3 | 431 | 438 | 7 |
| prefixed/syllables:4 | 225 | 230 | 5 |
| prefixed/syllables:5 | 84 | 73 | -11 |
| prefixed/syllables:6 | 20 | 30 | 10 |
| prefixed/syllables:7 | 3 | 2 | -1 |
| prefixed/syllables:8 | 1 | 0 | -1 |
| suffixed/syllables:1 | 2952 | 2986 | 34 |
| suffixed/syllables:2 | 9495 | 9539 | 44 |
| suffixed/syllables:3 | 7533 | 7452 | -81 |
| suffixed/syllables:4 | 2305 | 2278 | -27 |
| suffixed/syllables:5 | 604 | 581 | -23 |
| suffixed/syllables:6 | 112 | 102 | -10 |
| suffixed/syllables:7 | 17 | 17 | 0 |
| suffixed/syllables:8 | 2 | 1 | -1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44951.000 | 44964.000 | +13.000 |
| Mean letters | 6.788 | 6.772 | -0.016 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.005265 | 0.005121 | -0.000144 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.176946 | 0.176203 | -0.000743 |
| trigrams / missingReferenceMass | 0.058039 | 0.057342 | -0.000698 |
| trigrams / unseenGeneratedMass | 0.008011 | 0.007813 | -0.000199 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/39106 (0.000%) | 0/39328 (0.000%) | 0.000 | 222 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/39106 (0.000%) | 0/39328 (0.000%) | 0.000 | 222 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 10690/26367 (40.543%) | 10888/26807 (40.616%) | +0.073 | 440 | -0.515 to +0.613 |
| Monosyllables with schwa as their sole nucleus / lower | 0/10894 (0.000%) | 0/10672 (0.000%) | 0.000 | -222 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 190/10894 (1.744%) | 195/10672 (1.827%) | +0.083 | -222 | -0.347 to +0.476 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 10894 | 10672 | -222 |
| bare/syllables:2 | 26367 | 26807 | 440 |
| bare/syllables:3 | 8620 | 8559 | -61 |
| bare/syllables:4 | 3052 | 2889 | -163 |
| bare/syllables:5 | 868 | 887 | 19 |
| bare/syllables:6 | 175 | 156 | -19 |
| bare/syllables:7 | 24 | 26 | 2 |
| bare/syllables:8 | 0 | 4 | 4 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 15040.000 | 14771.000 | -269.000 |
| Mean letters | 4.281 | 4.279 | -0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.043490 | 0.043541 | 0.000051 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.330885 | 0.331300 | 0.000415 |
| trigrams / missingReferenceMass | 0.318002 | 0.316761 | -0.001241 |
| trigrams / unseenGeneratedMass | 0.002507 | 0.002475 | -0.000032 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 961/50000 (1.922%) | 992/50000 (1.984%) | +0.062 | 0 | -0.060 to +0.240 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39561.000 | 39492.000 | -69.000 |
| Mean letters | 6.697 | 6.689 | -0.008 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006519 | 0.006550 | 0.000030 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158113 | 0.157649 | -0.000464 |
| trigrams / missingReferenceMass | 0.045509 | 0.044739 | -0.000770 |
| trigrams / unseenGeneratedMass | 0.004816 | 0.004798 | -0.000017 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28890 (0.000%) | 0/29092 (0.000%) | 0.000 | 202 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28890 (0.000%) | 0/29092 (0.000%) | 0.000 | 202 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22420 (0.000%) | 0/22564 (0.000%) | 0.000 | 144 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22420/50000 (44.840%) | 22564/50000 (45.128%) | +0.288 | 0 | -0.440 to +1.080 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6176/15159 (40.741%) | 6309/15397 (40.976%) | +0.234 | 238 | -0.806 to +0.992 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21110 (0.000%) | 0/20908 (0.000%) | 0.000 | -202 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 305/21110 (1.445%) | 338/20908 (1.617%) | +0.172 | -202 | -0.096 to +0.538 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17984 | 17782 | -202 |
| bare/syllables:2 | 5449 | 5492 | 43 |
| bare/syllables:3 | 2761 | 2768 | 7 |
| bare/syllables:4 | 1093 | 1105 | 12 |
| bare/syllables:5 | 267 | 255 | -12 |
| bare/syllables:6 | 26 | 34 | 8 |
| both/syllables:2 | 496 | 530 | 34 |
| both/syllables:3 | 1001 | 977 | -24 |
| both/syllables:4 | 635 | 600 | -35 |
| both/syllables:5 | 276 | 267 | -9 |
| both/syllables:6 | 111 | 108 | -3 |
| both/syllables:7 | 30 | 28 | -2 |
| both/syllables:8 | 7 | 5 | -2 |
| both/syllables:9 | 1 | 2 | 1 |
| prefixed/syllables:2 | 3051 | 3127 | 76 |
| prefixed/syllables:3 | 1153 | 1143 | -10 |
| prefixed/syllables:4 | 569 | 511 | -58 |
| prefixed/syllables:5 | 210 | 225 | 15 |
| prefixed/syllables:6 | 49 | 46 | -3 |
| prefixed/syllables:7 | 11 | 9 | -2 |
| prefixed/syllables:8 | 1 | 0 | -1 |
| suffixed/syllables:1 | 3126 | 3126 | 0 |
| suffixed/syllables:2 | 6163 | 6248 | 85 |
| suffixed/syllables:3 | 3363 | 3413 | 50 |
| suffixed/syllables:4 | 1412 | 1432 | 20 |
| suffixed/syllables:5 | 559 | 579 | 20 |
| suffixed/syllables:6 | 163 | 162 | -1 |
| suffixed/syllables:7 | 31 | 25 | -6 |
| suffixed/syllables:8 | 2 | 1 | -1 |
