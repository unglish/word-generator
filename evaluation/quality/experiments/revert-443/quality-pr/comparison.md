# Quality comparison: candidate-0a0ce764adbb

Original baseline: merge-base-8da3c1d7790f. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-8da3c1d7790f | 8da3c1d7790f7a3516f3c9a131375cf5cd9ed7c5 | clean | aa3bb596cd43dbff4adde16e1cb8dee4ad0f394335f1ec4fed4458e83bc3c6d6 |
| candidate | candidate-0a0ce764adbb | 0a0ce764adbbf722394b3b1852c206b2f8336120 | dirty (uncommitted generator changes) | 80dbf19214df1a575c526a02a27fe3bf59fc24ad5a28d1e7797de52b8ebfc1a8 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49152.000 | 49538.000 | +386.000 |
| Mean letters | 9.203 | 9.238 | +0.035 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004327 | 0.004178 | -0.000148 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.144214 | 0.144933 | 0.000719 |
| trigrams / missingReferenceMass | 0.031980 | 0.030040 | -0.001941 |
| trigrams / unseenGeneratedMass | 0.009518 | 0.010174 | 0.000656 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/45534 (0.000%) | 0/47121 (0.000%) | 0.000 | 1587 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45534 (0.000%) | 0/47121 (0.000%) | 0.000 | 1587 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35138 (0.000%) | 0/34915 (0.000%) | 0.000 | -223 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35138/50000 (70.276%) | 34915/50000 (69.830%) | -0.446 | 0 | -1.380 to +0.650 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5036/12996 (38.750%) | 5315/13457 (39.496%) | +0.746 | 461 | -2.781 to +2.550 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4466 (0.000%) | 0/2879 (0.000%) | 0.000 | -1587 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 67/4466 (1.500%) | 38/2879 (1.320%) | -0.180 | -1587 | -0.369 to -0.041 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 2990 | 1882 | -1108 |
| bare/syllables:2 | 5717 | 6952 | 1235 |
| bare/syllables:3 | 3708 | 4142 | 434 |
| bare/syllables:4 | 1787 | 1560 | -227 |
| bare/syllables:5 | 550 | 451 | -99 |
| bare/syllables:6 | 97 | 86 | -11 |
| bare/syllables:7 | 11 | 12 | 1 |
| bare/syllables:8 | 2 | 0 | -2 |
| both/syllables:10 | 1 | 0 | -1 |
| both/syllables:2 | 255 | 169 | -86 |
| both/syllables:3 | 934 | 859 | -75 |
| both/syllables:4 | 1286 | 1402 | 116 |
| both/syllables:5 | 920 | 1005 | 85 |
| both/syllables:6 | 456 | 419 | -37 |
| both/syllables:7 | 160 | 127 | -33 |
| both/syllables:8 | 52 | 41 | -11 |
| both/syllables:9 | 6 | 9 | 3 |
| prefixed/syllables:2 | 1258 | 870 | -388 |
| prefixed/syllables:3 | 2606 | 3089 | 483 |
| prefixed/syllables:4 | 1798 | 1976 | 178 |
| prefixed/syllables:5 | 886 | 767 | -119 |
| prefixed/syllables:6 | 294 | 242 | -52 |
| prefixed/syllables:7 | 71 | 57 | -14 |
| prefixed/syllables:8 | 13 | 11 | -2 |
| prefixed/syllables:9 | 1 | 3 | 2 |
| suffixed/syllables:1 | 1476 | 997 | -479 |
| suffixed/syllables:2 | 5766 | 5466 | -300 |
| suffixed/syllables:3 | 7658 | 8424 | 766 |
| suffixed/syllables:4 | 5460 | 5665 | 205 |
| suffixed/syllables:5 | 2620 | 2391 | -229 |
| suffixed/syllables:6 | 915 | 702 | -213 |
| suffixed/syllables:7 | 207 | 182 | -25 |
| suffixed/syllables:8 | 34 | 37 | 3 |
| suffixed/syllables:9 | 5 | 5 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 45983.000 | 47489.000 | +1506.000 |
| Mean letters | 7.345 | 7.402 | +0.057 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000623 | 0.000611 | -0.000012 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.175372 | 0.174780 | -0.000592 |
| trigrams / missingReferenceMass | 0.048716 | 0.049507 | 0.000791 |
| trigrams / unseenGeneratedMass | 0.010897 | 0.011752 | 0.000855 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/39870 (0.000%) | 0/43379 (0.000%) | 0.000 | 3509 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/39870 (0.000%) | 0/43379 (0.000%) | 0.000 | 3509 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7642/19137 (39.933%) | 9321/23019 (40.493%) | +0.560 | 3882 | -0.235 to +1.177 |
| Monosyllables with schwa as their sole nucleus / lower | 0/10130 (0.000%) | 0/6621 (0.000%) | 0.000 | -3509 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 141/10130 (1.392%) | 80/6621 (1.208%) | -0.184 | -3509 | -0.728 to +0.122 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 10130 | 6621 | -3509 |
| bare/syllables:2 | 19137 | 23019 | 3882 |
| bare/syllables:3 | 12371 | 13650 | 1279 |
| bare/syllables:4 | 6114 | 4962 | -1152 |
| bare/syllables:5 | 1881 | 1407 | -474 |
| bare/syllables:6 | 319 | 290 | -29 |
| bare/syllables:7 | 43 | 46 | 3 |
| bare/syllables:8 | 5 | 5 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 17146.000 | 16726.000 | -420.000 |
| Mean letters | 4.587 | 4.372 | -0.215 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.052552 | 0.046870 | -0.005682 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.390625 | 0.373727 | -0.016898 |
| trigrams / missingReferenceMass | 0.342830 | 0.335539 | -0.007291 |
| trigrams / unseenGeneratedMass | 0.002582 | 0.002656 | 0.000074 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 779/50000 (1.558%) | 685/50000 (1.370%) | -0.188 | 0 | -0.320 to -0.090 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 38169.000 | 39312.000 | +1143.000 |
| Mean letters | 6.582 | 6.647 | +0.065 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007956 | 0.006381 | -0.001575 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.163071 | 0.155520 | -0.007551 |
| trigrams / missingReferenceMass | 0.040560 | 0.039966 | -0.000594 |
| trigrams / unseenGeneratedMass | 0.007277 | 0.007597 | 0.000320 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/26895 (0.000%) | 0/29005 (0.000%) | 0.000 | 2110 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/26895 (0.000%) | 0/29005 (0.000%) | 0.000 | 2110 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22597 (0.000%) | 0/22529 (0.000%) | 0.000 | -68 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22597/50000 (45.194%) | 22529/50000 (45.058%) | -0.136 | 0 | -1.080 to +0.460 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5730/14158 (40.472%) | 6325/15222 (41.552%) | +1.080 | 1064 | -0.662 to +3.976 |
| Monosyllables with schwa as their sole nucleus / lower | 0/23105 (0.000%) | 0/20995 (0.000%) | 0.000 | -2110 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 281/23105 (1.216%) | 251/20995 (1.196%) | -0.021 | -2110 | -0.218 to +0.465 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 19632 | 17885 | -1747 |
| bare/syllables:2 | 3680 | 5468 | 1788 |
| bare/syllables:3 | 2511 | 2725 | 214 |
| bare/syllables:4 | 1203 | 1100 | -103 |
| bare/syllables:5 | 345 | 263 | -82 |
| bare/syllables:6 | 32 | 30 | -2 |
| both/syllables:2 | 552 | 486 | -66 |
| both/syllables:3 | 1054 | 985 | -69 |
| both/syllables:4 | 571 | 619 | 48 |
| both/syllables:5 | 226 | 285 | 59 |
| both/syllables:6 | 100 | 103 | 3 |
| both/syllables:7 | 31 | 41 | 10 |
| both/syllables:8 | 9 | 12 | 3 |
| both/syllables:9 | 1 | 0 | -1 |
| prefixed/syllables:2 | 3412 | 3112 | -300 |
| prefixed/syllables:3 | 873 | 1159 | 286 |
| prefixed/syllables:4 | 436 | 540 | 104 |
| prefixed/syllables:5 | 246 | 243 | -3 |
| prefixed/syllables:6 | 70 | 47 | -23 |
| prefixed/syllables:7 | 12 | 13 | 1 |
| prefixed/syllables:8 | 1 | 0 | -1 |
| suffixed/syllables:1 | 3473 | 3110 | -363 |
| suffixed/syllables:2 | 6514 | 6156 | -358 |
| suffixed/syllables:3 | 2980 | 3458 | 478 |
| suffixed/syllables:4 | 1199 | 1399 | 200 |
| suffixed/syllables:5 | 613 | 563 | -50 |
| suffixed/syllables:6 | 191 | 163 | -28 |
| suffixed/syllables:7 | 33 | 31 | -2 |
| suffixed/syllables:8 | 0 | 4 | 4 |
