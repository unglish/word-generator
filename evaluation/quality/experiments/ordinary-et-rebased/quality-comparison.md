# Quality comparison: candidate-e41eddc6c83d

Original baseline: merge-base-ac2e5c48a48a. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-ac2e5c48a48a | ac2e5c48a48afcf169e2d821a8e2e8056669e211 | clean | 15934de7327c171784da170a2ecb035604b441dae12b5a43fe059577de576560 |
| candidate | candidate-e41eddc6c83d | e41eddc6c83d94bb511f66683074ae8892a75c04 | clean | d16566c4e86e6e3f07e6582b3e49bfe52cacd1d4f7c6e1c5b84d685534c6d916 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49492.000 | 49458.000 | -34.000 |
| Mean letters | 9.220 | 9.190 | -0.030 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004413 | 0.004311 | -0.000101 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.146331 | 0.144655 | -0.001675 |
| trigrams / missingReferenceMass | 0.029822 | 0.030088 | 0.000266 |
| trigrams / unseenGeneratedMass | 0.010177 | 0.009786 | -0.000391 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47089 (0.000%) | 0/47013 (0.000%) | 0.000 | -76 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47089 (0.000%) | 0/47013 (0.000%) | 0.000 | -76 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35098 (0.000%) | 0/34947 (0.000%) | 0.000 | -151 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35098/50000 (70.196%) | 34947/50000 (69.894%) | -0.302 | 0 | -1.100 to +0.070 |
| Words with adjacent identical coda segments / lower | 278/50000 (0.556%) | 267/50000 (0.534%) | -0.022 | 0 | -0.080 to +0.060 |
| Disyllables with adjacent primary and secondary stress / lower | 5374/13331 (40.312%) | 5384/13355 (40.314%) | +0.002 | 24 | -0.556 to +0.826 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2911 (0.000%) | 0/2987 (0.000%) | 0.000 | 76 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 560/50000 (1.120%) | 572/50000 (1.144%) | +0.024 | 0 | -0.290 to +0.290 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 31/2911 (1.065%) | 31/2987 (1.038%) | -0.027 | 76 | -0.624 to +0.339 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1903 | 1942 | 39 |
| bare/syllables:2 | 6962 | 6919 | -43 |
| bare/syllables:3 | 4033 | 4187 | 154 |
| bare/syllables:4 | 1484 | 1495 | 11 |
| bare/syllables:5 | 421 | 414 | -7 |
| bare/syllables:6 | 88 | 82 | -6 |
| bare/syllables:7 | 11 | 12 | 1 |
| bare/syllables:8 | 0 | 1 | 1 |
| bare/syllables:9 | 0 | 1 | 1 |
| both/syllables:10 | 1 | 0 | -1 |
| both/syllables:2 | 150 | 167 | 17 |
| both/syllables:3 | 881 | 859 | -22 |
| both/syllables:4 | 1385 | 1377 | -8 |
| both/syllables:5 | 977 | 964 | -13 |
| both/syllables:6 | 458 | 474 | 16 |
| both/syllables:7 | 164 | 130 | -34 |
| both/syllables:8 | 25 | 22 | -3 |
| both/syllables:9 | 7 | 7 | 0 |
| prefixed/syllables:2 | 882 | 869 | -13 |
| prefixed/syllables:3 | 3059 | 3102 | 43 |
| prefixed/syllables:4 | 2062 | 1976 | -86 |
| prefixed/syllables:5 | 772 | 779 | 7 |
| prefixed/syllables:6 | 218 | 234 | 16 |
| prefixed/syllables:7 | 58 | 58 | 0 |
| prefixed/syllables:8 | 10 | 9 | -1 |
| prefixed/syllables:9 | 1 | 1 | 0 |
| suffixed/syllables:1 | 1008 | 1045 | 37 |
| suffixed/syllables:10 | 1 | 2 | 1 |
| suffixed/syllables:2 | 5337 | 5400 | 63 |
| suffixed/syllables:3 | 8589 | 8480 | -109 |
| suffixed/syllables:4 | 5808 | 5717 | -91 |
| suffixed/syllables:5 | 2320 | 2381 | 61 |
| suffixed/syllables:6 | 738 | 688 | -50 |
| suffixed/syllables:7 | 158 | 166 | 8 |
| suffixed/syllables:8 | 22 | 29 | 7 |
| suffixed/syllables:9 | 7 | 11 | 4 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47525.000 | 47535.000 | +10.000 |
| Mean letters | 7.392 | 7.379 | -0.013 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000564 | 0.000631 | 0.000067 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.175950 | 0.174332 | -0.001618 |
| trigrams / missingReferenceMass | 0.048325 | 0.050773 | 0.002448 |
| trigrams / unseenGeneratedMass | 0.011495 | 0.011503 | 0.000008 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43565 (0.000%) | 0/43578 (0.000%) | 0.000 | 13 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43565 (0.000%) | 0/43578 (0.000%) | 0.000 | 13 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 280/50000 (0.560%) | 283/50000 (0.566%) | +0.006 | 0 | -0.110 to +0.100 |
| Disyllables with adjacent primary and secondary stress / lower | 9440/23165 (40.751%) | 9493/23146 (41.014%) | +0.262 | -19 | -0.788 to +1.105 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6435 (0.000%) | 0/6422 (0.000%) | 0.000 | -13 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1285/50000 (2.570%) | 1306/50000 (2.612%) | +0.042 | 0 | -0.320 to +0.320 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 86/6435 (1.336%) | 90/6422 (1.401%) | +0.065 | -13 | -0.095 to +0.317 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6435 | 6422 | -13 |
| bare/syllables:2 | 23165 | 23146 | -19 |
| bare/syllables:3 | 13652 | 13657 | 5 |
| bare/syllables:4 | 5052 | 5009 | -43 |
| bare/syllables:5 | 1322 | 1419 | 97 |
| bare/syllables:6 | 327 | 301 | -26 |
| bare/syllables:7 | 42 | 42 | 0 |
| bare/syllables:8 | 4 | 4 | 0 |
| bare/syllables:9 | 1 | 0 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16828.000 | 16785.000 | -43.000 |
| Mean letters | 5.450 | 5.446 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.095363 | 0.095460 | 0.000097 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.497135 | 0.496566 | -0.000569 |
| trigrams / missingReferenceMass | 0.345903 | 0.345846 | -0.000057 |
| trigrams / unseenGeneratedMass | 0.004470 | 0.004515 | 0.000045 |

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
| Words with adjacent identical coda segments / lower | 5343/50000 (10.686%) | 5358/50000 (10.716%) | +0.030 | 0 | -0.130 to +0.240 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 286/50000 (0.572%) | 288/50000 (0.576%) | +0.004 | 0 | -0.010 to +0.020 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 851/50000 (1.702%) | 848/50000 (1.696%) | -0.006 | 0 | -0.040 to +0.030 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39286.000 | 39375.000 | +89.000 |
| Mean letters | 6.599 | 6.594 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006207 | 0.006278 | 0.000071 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155798 | 0.155258 | -0.000540 |
| trigrams / missingReferenceMass | 0.038356 | 0.038369 | 0.000013 |
| trigrams / unseenGeneratedMass | 0.007281 | 0.007174 | -0.000107 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28919 (0.000%) | 0/29071 (0.000%) | 0.000 | 152 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28919 (0.000%) | 0/29071 (0.000%) | 0.000 | 152 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22266 (0.000%) | 0/22499 (0.000%) | 0.000 | 233 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22266/50000 (44.532%) | 22499/50000 (44.998%) | +0.466 | 0 | -0.220 to +1.120 |
| Words with adjacent identical coda segments / lower | 243/50000 (0.486%) | 239/50000 (0.478%) | -0.008 | 0 | -0.030 to +0.050 |
| Disyllables with adjacent primary and secondary stress / lower | 6197/15277 (40.564%) | 6180/15316 (40.350%) | -0.214 | 39 | -1.269 to +0.863 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21081 (0.000%) | 0/20929 (0.000%) | 0.000 | -152 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 895/50000 (1.790%) | 944/50000 (1.888%) | +0.098 | 0 | -0.050 to +0.270 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 280/21081 (1.328%) | 277/20929 (1.324%) | -0.005 | -152 | -0.218 to +0.125 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17998 | 17837 | -161 |
| bare/syllables:2 | 5505 | 5479 | -26 |
| bare/syllables:3 | 2855 | 2847 | -8 |
| bare/syllables:4 | 1108 | 1095 | -13 |
| bare/syllables:5 | 230 | 218 | -12 |
| bare/syllables:6 | 38 | 25 | -13 |
| both/syllables:2 | 473 | 489 | 16 |
| both/syllables:3 | 990 | 1002 | 12 |
| both/syllables:4 | 579 | 600 | 21 |
| both/syllables:5 | 256 | 273 | 17 |
| both/syllables:6 | 96 | 84 | -12 |
| both/syllables:7 | 26 | 31 | 5 |
| both/syllables:8 | 6 | 4 | -2 |
| both/syllables:9 | 1 | 1 | 0 |
| prefixed/syllables:2 | 3028 | 3022 | -6 |
| prefixed/syllables:3 | 1135 | 1170 | 35 |
| prefixed/syllables:4 | 564 | 540 | -24 |
| prefixed/syllables:5 | 202 | 196 | -6 |
| prefixed/syllables:6 | 63 | 52 | -11 |
| prefixed/syllables:7 | 7 | 5 | -2 |
| suffixed/syllables:1 | 3083 | 3092 | 9 |
| suffixed/syllables:2 | 6271 | 6326 | 55 |
| suffixed/syllables:3 | 3353 | 3448 | 95 |
| suffixed/syllables:4 | 1380 | 1406 | 26 |
| suffixed/syllables:5 | 589 | 573 | -16 |
| suffixed/syllables:6 | 142 | 161 | 19 |
| suffixed/syllables:7 | 22 | 23 | 1 |
| suffixed/syllables:8 | 0 | 1 | 1 |
