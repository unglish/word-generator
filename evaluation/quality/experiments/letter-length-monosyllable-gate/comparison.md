# Quality comparison: letter-gate-candidate

Original baseline: letter-gate-baseline. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | letter-gate-baseline | 8da3c1d7790f7a3516f3c9a131375cf5cd9ed7c5 | clean | aa3bb596cd43dbff4adde16e1cb8dee4ad0f394335f1ec4fed4458e83bc3c6d6 |
| candidate | letter-gate-candidate | 8da3c1d7790f7a3516f3c9a131375cf5cd9ed7c5 | dirty (uncommitted generator changes) | aaa5ce89800b032f56c6600e87ea8ed3522c3b90d9529a792ffebeec4dc430a9 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49152.000 | 48978.000 | -174.000 |
| Mean letters | 9.203 | 9.166 | -0.037 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004327 | 0.004449 | 0.000122 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.144214 | 0.145122 | 0.000908 |
| trigrams / missingReferenceMass | 0.031980 | 0.030062 | -0.001919 |
| trigrams / unseenGeneratedMass | 0.009518 | 0.009860 | 0.000342 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/45534 (0.000%) | 0/45291 (0.000%) | 0.000 | -243 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45534 (0.000%) | 0/45291 (0.000%) | 0.000 | -243 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35138 (0.000%) | 0/35134 (0.000%) | 0.000 | -4 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35138/50000 (70.276%) | 35134/50000 (70.268%) | -0.008 | 0 | -0.690 to +0.690 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5036/12996 (38.750%) | 5086/13028 (39.039%) | +0.289 | 32 | -1.474 to +1.464 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4466 (0.000%) | 0/4709 (0.000%) | 0.000 | 243 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 67/4466 (1.500%) | 89/4709 (1.890%) | +0.390 | 243 | -0.465 to +1.022 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 2990 | 3123 | 133 |
| bare/syllables:2 | 5717 | 5702 | -15 |
| bare/syllables:3 | 3708 | 3634 | -74 |
| bare/syllables:4 | 1787 | 1774 | -13 |
| bare/syllables:5 | 550 | 521 | -29 |
| bare/syllables:6 | 97 | 96 | -1 |
| bare/syllables:7 | 11 | 14 | 3 |
| bare/syllables:8 | 2 | 1 | -1 |
| bare/syllables:9 | 0 | 1 | 1 |
| both/syllables:10 | 1 | 2 | 1 |
| both/syllables:2 | 255 | 270 | 15 |
| both/syllables:3 | 934 | 924 | -10 |
| both/syllables:4 | 1286 | 1278 | -8 |
| both/syllables:5 | 920 | 944 | 24 |
| both/syllables:6 | 456 | 444 | -12 |
| both/syllables:7 | 160 | 169 | 9 |
| both/syllables:8 | 52 | 47 | -5 |
| both/syllables:9 | 6 | 4 | -2 |
| prefixed/syllables:2 | 1258 | 1330 | 72 |
| prefixed/syllables:3 | 2606 | 2629 | 23 |
| prefixed/syllables:4 | 1798 | 1779 | -19 |
| prefixed/syllables:5 | 886 | 929 | 43 |
| prefixed/syllables:6 | 294 | 288 | -6 |
| prefixed/syllables:7 | 71 | 55 | -16 |
| prefixed/syllables:8 | 13 | 10 | -3 |
| prefixed/syllables:9 | 1 | 2 | 1 |
| suffixed/syllables:1 | 1476 | 1586 | 110 |
| suffixed/syllables:10 | 0 | 1 | 1 |
| suffixed/syllables:2 | 5766 | 5726 | -40 |
| suffixed/syllables:3 | 7658 | 7525 | -133 |
| suffixed/syllables:4 | 5460 | 5469 | 9 |
| suffixed/syllables:5 | 2620 | 2586 | -34 |
| suffixed/syllables:6 | 915 | 859 | -56 |
| suffixed/syllables:7 | 207 | 233 | 26 |
| suffixed/syllables:8 | 34 | 39 | 5 |
| suffixed/syllables:9 | 5 | 6 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 45983.000 | 45881.000 | -102.000 |
| Mean letters | 7.345 | 7.332 | -0.013 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000623 | 0.000698 | 0.000075 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.175372 | 0.174871 | -0.000500 |
| trigrams / missingReferenceMass | 0.048716 | 0.050142 | 0.001426 |
| trigrams / unseenGeneratedMass | 0.010897 | 0.010758 | -0.000139 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/39870 (0.000%) | 0/39698 (0.000%) | 0.000 | -172 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/39870 (0.000%) | 0/39698 (0.000%) | 0.000 | -172 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7642/19137 (39.933%) | 7700/18920 (40.698%) | +0.765 | -217 | -0.687 to +1.634 |
| Monosyllables with schwa as their sole nucleus / lower | 0/10130 (0.000%) | 0/10302 (0.000%) | 0.000 | 172 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 141/10130 (1.392%) | 153/10302 (1.485%) | +0.093 | 172 | -0.594 to +0.596 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 10130 | 10302 | 172 |
| bare/syllables:2 | 19137 | 18920 | -217 |
| bare/syllables:3 | 12371 | 12431 | 60 |
| bare/syllables:4 | 6114 | 6046 | -68 |
| bare/syllables:5 | 1881 | 1927 | 46 |
| bare/syllables:6 | 319 | 328 | 9 |
| bare/syllables:7 | 43 | 40 | -3 |
| bare/syllables:8 | 5 | 6 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 17146.000 | 16288.000 | -858.000 |
| Mean letters | 4.587 | 4.268 | -0.318 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.052552 | 0.050401 | -0.002151 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.390625 | 0.385060 | -0.005565 |
| trigrams / missingReferenceMass | 0.342830 | 0.341099 | -0.001731 |
| trigrams / unseenGeneratedMass | 0.002582 | 0.002566 | -0.000017 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 779/50000 (1.558%) | 714/50000 (1.428%) | -0.130 | 0 | -0.210 to -0.010 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 38169.000 | 37642.000 | -527.000 |
| Mean letters | 6.582 | 6.477 | -0.104 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007956 | 0.008005 | 0.000049 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.163071 | 0.163394 | 0.000322 |
| trigrams / missingReferenceMass | 0.040560 | 0.038805 | -0.001755 |
| trigrams / unseenGeneratedMass | 0.007277 | 0.006888 | -0.000389 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/26895 (0.000%) | 0/26916 (0.000%) | 0.000 | 21 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/26895 (0.000%) | 0/26916 (0.000%) | 0.000 | 21 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22597 (0.000%) | 0/22660 (0.000%) | 0.000 | 63 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22597/50000 (45.194%) | 22660/50000 (45.320%) | +0.126 | 0 | -0.170 to +0.490 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5730/14158 (40.472%) | 5742/14223 (40.371%) | -0.101 | 65 | -2.443 to +1.448 |
| Monosyllables with schwa as their sole nucleus / lower | 0/23105 (0.000%) | 0/23084 (0.000%) | 0.000 | -21 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 281/23105 (1.216%) | 334/23084 (1.447%) | +0.231 | -21 | -0.124 to +0.422 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 19632 | 19633 | 1 |
| bare/syllables:2 | 3680 | 3742 | 62 |
| bare/syllables:3 | 2511 | 2431 | -80 |
| bare/syllables:4 | 1203 | 1190 | -13 |
| bare/syllables:5 | 345 | 312 | -33 |
| bare/syllables:6 | 32 | 32 | 0 |
| both/syllables:2 | 552 | 537 | -15 |
| both/syllables:3 | 1054 | 1066 | 12 |
| both/syllables:4 | 571 | 580 | 9 |
| both/syllables:5 | 226 | 231 | 5 |
| both/syllables:6 | 100 | 122 | 22 |
| both/syllables:7 | 31 | 31 | 0 |
| both/syllables:8 | 9 | 10 | 1 |
| both/syllables:9 | 1 | 0 | -1 |
| prefixed/syllables:2 | 3412 | 3390 | -22 |
| prefixed/syllables:3 | 873 | 898 | 25 |
| prefixed/syllables:4 | 436 | 476 | 40 |
| prefixed/syllables:5 | 246 | 236 | -10 |
| prefixed/syllables:6 | 70 | 84 | 14 |
| prefixed/syllables:7 | 12 | 8 | -4 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3473 | 3451 | -22 |
| suffixed/syllables:2 | 6514 | 6554 | 40 |
| suffixed/syllables:3 | 2980 | 2996 | 16 |
| suffixed/syllables:4 | 1199 | 1151 | -48 |
| suffixed/syllables:5 | 613 | 606 | -7 |
| suffixed/syllables:6 | 191 | 199 | 8 |
| suffixed/syllables:7 | 33 | 31 | -2 |
| suffixed/syllables:8 | 0 | 2 | 2 |
